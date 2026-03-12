"""Session management for rowing sessions."""

import time
import logging
from enum import Enum
from typing import Optional, Union
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

from .metrics import (
    MetricsComputer,
    StrokeData,
    RealtimeData,
    ComputedMetrics,
    RealtimeMetrics,
    ESP32Config,
)
from .modes import ModeManager, SessionMode
from .database import Database, Session, SessionMetrics


class SessionState(Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"


@dataclass
class SessionInfo:
    id: int
    start_time: int
    state: SessionState
    pause_time: Optional[int] = None
    total_pause_duration: int = 0


class SessionManager:
    """Manages rowing session lifecycle."""

    def __init__(self, db: Database):
        self.db = db
        self.metrics_computer = MetricsComputer()
        self.mode_manager = ModeManager()
        self.current_session: Optional[SessionInfo] = None
        self._state = SessionState.IDLE
        self._config = ESP32Config()
        self._pending_mode_config: Optional[dict] = None

    @property
    def state(self) -> SessionState:
        return self._state

    @property
    def is_running(self) -> bool:
        return self._state == SessionState.RUNNING

    @property
    def is_paused(self) -> bool:
        return self._state == SessionState.PAUSED

    @property
    def config(self) -> ESP32Config:
        return self._config

    def update_config(self, config_data: dict) -> dict:
        """Update ESP32 configuration."""
        self._config = ESP32Config.from_dict(config_data)
        self.metrics_computer.update_config(self._config)
        return {"status": "ok", "config": self._config.to_dict()}

    def get_config(self) -> dict:
        """Get current ESP32 configuration."""
        return {"status": "ok", "config": self._config.to_dict()}

    @staticmethod
    def _clamp_mode_config(mode_config: dict) -> dict:
        """Clamp numeric mode config values to safe ranges."""
        clamps = {
            "distance": (100, 100_000),
            "time": (60, 14_400),       # 1–240 min in seconds
            "calories": (10, 10_000),
            "target_split": (60, 300),
            "work_duration": (5, 600),
            "rest_duration": (5, 600),
            "rounds": (1, 100),
        }
        for key, (lo, hi) in clamps.items():
            if key in mode_config and isinstance(mode_config[key], (int, float)):
                original = mode_config[key]
                mode_config[key] = max(lo, min(hi, int(original)))
                if mode_config[key] != original:
                    logger.warning(f"Clamped mode config {key}: {original} → {mode_config[key]}")
        return mode_config

    def set_mode(self, mode_config: dict) -> dict:
        """Set the session mode before starting."""
        if self._state != SessionState.IDLE:
            return {"status": "error", "message": "Cannot change mode while session is running"}

        mode_config = self._clamp_mode_config(mode_config)

        # Load ghost data if ghost race mode
        if mode_config.get("mode") == "ghost_race":
            ghost_id = mode_config.get("ghost_session_id")
            if ghost_id:
                ghost_session = self.db.get_session(ghost_id)
                if ghost_session and ghost_session.data_points:
                    # Reconstruct ghost distance using split500m velocity
                    ghost_data = []
                    cumulative_distance = 0
                    prev_time = 0
                    for dp in ghost_session.data_points:
                        t = dp.get("time", 0)
                        split = dp.get("split500m", 0)
                        dt = t - prev_time
                        if split > 0 and dt > 0:
                            velocity = 500.0 / split  # m/s
                            cumulative_distance += velocity * dt
                        prev_time = t
                        ghost_data.append({
                            "time": t,
                            "distance": cumulative_distance,
                        })
                    # Scale to match actual stored session distance
                    if cumulative_distance > 0 and ghost_session.distance > 0:
                        scale = ghost_session.distance / cumulative_distance
                        for gd in ghost_data:
                            gd["distance"] *= scale
                    mode_config["ghost_data"] = ghost_data
                    mode_config["target_distance"] = ghost_session.distance

        self._pending_mode_config = mode_config
        result = self.mode_manager.set_mode(mode_config)

        # Enable realtime stream for game mode
        if mode_config.get("mode") == "game":
            self._config.stream_realtime = True
            self._config.realtime_hz = 30

        return result

    def get_mode(self) -> dict:
        """Get current mode state."""
        return {"status": "ok", "mode": self.mode_manager.get_state()}

    def get_ghost_sessions(self) -> dict:
        """Get sessions available for ghost racing."""
        sessions = self.db.get_sessions(20)
        ghost_sessions = []
        for s in sessions:
            if s.distance > 500 and len(s.data_points) > 10:
                ghost_sessions.append({
                    "id": s.id,
                    "date": s.date,
                    "distance": s.distance,
                    "duration": s.duration,
                    "avg_split": s.metrics.avg_split if s.metrics else 0,
                })
        return {"status": "ok", "sessions": ghost_sessions}

    def start_session(self) -> dict:
        """Start a new rowing session."""
        if self._state != SessionState.IDLE:
            return {"status": "error", "message": "Session already in progress"}

        self.metrics_computer.reset()

        # Initialize mode if not already set
        if self._pending_mode_config is None:
            self.mode_manager.set_mode({"mode": "free_row"})
        else:
            self.mode_manager.set_mode(self._pending_mode_config)

        self.mode_manager.start_session()
        self._pending_mode_config = None

        session_id = int(time.time() * 1000)

        self.current_session = SessionInfo(
            id=session_id,
            start_time=session_id,
            state=SessionState.RUNNING,
        )
        self._state = SessionState.RUNNING

        return {
            "status": "started",
            "session_id": session_id,
            "mode": self.mode_manager.get_state(),
        }

    def pause_session(self) -> dict:
        """Pause or resume the current session."""
        if self._state == SessionState.IDLE:
            return {"status": "error", "message": "No session in progress"}

        if self._state == SessionState.RUNNING:
            self._state = SessionState.PAUSED
            if self.current_session:
                self.current_session.pause_time = int(time.time() * 1000)
            return {"status": "paused"}
        else:
            self._state = SessionState.RUNNING
            if self.current_session and self.current_session.pause_time:
                pause_duration = int(time.time() * 1000) - self.current_session.pause_time
                self.current_session.total_pause_duration += pause_duration
                self.current_session.pause_time = None
            return {"status": "resumed"}

    def stop_session(self) -> dict:
        """Stop and save the current session."""
        if self._state == SessionState.IDLE:
            return {"status": "error", "message": "No session in progress"}

        if not self.current_session:
            self._state = SessionState.IDLE
            return {"status": "error", "message": "No session data"}

        # Calculate session duration
        end_time = int(time.time() * 1000)
        duration = (end_time - self.current_session.start_time -
                   self.current_session.total_pause_duration) / 1000

        # Get aggregated metrics
        session_metrics = self.metrics_computer.get_session_metrics()

        # Create session object
        session = Session(
            id=self.current_session.id,
            date=datetime.now().isoformat(),
            duration=duration,
            distance=self.metrics_computer.total_distance,
            calories=self.metrics_computer.total_calories,
            strokes=self.metrics_computer.stroke_count,
            data_points=self.metrics_computer.data_points,
            seat_points=self.metrics_computer.seat_points,
            metrics=SessionMetrics(
                avg_stroke_rate=session_metrics.get("avg_stroke_rate", 0),
                avg_power=session_metrics.get("avg_power", 0),
                avg_split=session_metrics.get("avg_split", 0),
                peak_power=session_metrics.get("peak_power", 0),
                avg_stroke_length=session_metrics.get("avg_stroke_length", 0),
                avg_drive_recovery=session_metrics.get("avg_drive_recovery", 0),
                avg_smoothness=session_metrics.get("avg_smoothness", 0),
                avg_symmetry=session_metrics.get("avg_symmetry", 0),
                avg_trunk_stability=session_metrics.get("avg_trunk_stability", 0),
                avg_seat_stability=session_metrics.get("avg_seat_stability", 0),
                avg_peak_force=session_metrics.get("avg_peak_force", 0),
                # Advanced metrics
                avg_consistency_index=session_metrics.get("avg_consistency_index", 85),
                avg_time_to_peak_force=session_metrics.get("avg_time_to_peak_force", 0.35),
                power_decline=session_metrics.get("power_decline", 0),
                avg_postural_deviation=session_metrics.get("avg_postural_deviation", 5),
                avg_range_of_motion=session_metrics.get("avg_range_of_motion", 120),
                avg_load_distribution=session_metrics.get("avg_load_distribution", 90),
                avg_stroke_efficiency=session_metrics.get("avg_stroke_efficiency", 75),
                force_curve_type=session_metrics.get("force_curve_type", "Balanced"),
                symmetry_drift=session_metrics.get("symmetry_drift", 0),
                peak_handle_force=session_metrics.get("peak_handle_force", 0),
                min_time_to_peak_force=session_metrics.get("min_time_to_peak_force", 0.35),
                # Seat sensor metrics
                avg_seat_total_load=session_metrics.get("avg_seat_total_load", 0),
                avg_seat_left_right_balance=session_metrics.get("avg_seat_left_right_balance", 50),
                avg_seat_front_back_balance=session_metrics.get("avg_seat_front_back_balance", 50),
                avg_seat_center_x=session_metrics.get("avg_seat_center_x", 0),
                avg_seat_center_y=session_metrics.get("avg_seat_center_y", 0),
                # Foot force metrics
                avg_foot_force_left=session_metrics.get("avg_foot_force_left", 0),
                avg_foot_force_right=session_metrics.get("avg_foot_force_right", 0),
                avg_foot_force_total=session_metrics.get("avg_foot_force_total", 0),
                avg_foot_force_symmetry=session_metrics.get("avg_foot_force_symmetry", 100),
                peak_foot_force=session_metrics.get("peak_foot_force", 0),
                avg_force_curve_samples=session_metrics.get("avg_force_curve_samples", []),
            ),
        )

        # Save to database if we have meaningful data
        save_error = False
        if duration > 5:
            try:
                result = self.db.save_session(session)
                if result == -1:
                    save_error = True
            except Exception as e:
                logger.error(f"Failed to save session: {e}")
                save_error = True

        # Reset state
        self._state = SessionState.IDLE
        self.current_session = None
        self.mode_manager.reset()
        self._pending_mode_config = None

        result = {
            "status": "stopped",
            "session": session.to_dict(),
        }
        if save_error:
            result["save_error"] = True

        return result

    def process_realtime_data(self, data: dict) -> Optional[dict]:
        """Process incoming realtime data for game mode."""
        if self._state != SessionState.RUNNING:
            return None

        try:
            realtime_data = RealtimeData.from_dict(data)
            pause_duration = self.current_session.total_pause_duration if self.current_session else 0
            metrics = self.metrics_computer.process_realtime(realtime_data, pause_duration)

            if metrics is None:
                return None

            result = metrics.to_dict()

            # Update mode state from realtime data (drives ring progress for all modes)
            stroke_metrics = {
                "seat_left_right_balance": realtime_data.seat_lr,
                "power": metrics.instant_power,
                "symmetry": 100 - abs(realtime_data.force_left - realtime_data.force_right) / max(realtime_data.force_left + realtime_data.force_right, 1) * 100,
                "smoothness": 80,  # Default for realtime
            }

            mode_update = self.mode_manager.update(
                elapsed_time=metrics.session_elapsed_time,
                distance=metrics.session_distance,
                calories=metrics.session_calories,
                current_split=metrics.split_500m,
                stroke_metrics=stroke_metrics,
            )

            result["mode"] = mode_update.get("mode", {})

            if "game_update" in mode_update:
                result["game_update"] = mode_update["game_update"]
            if "interval_update" in mode_update:
                result["interval_update"] = mode_update["interval_update"]
            if "technique_update" in mode_update:
                result["technique_update"] = mode_update["technique_update"]

            return result
        except Exception as e:
            logger.error(f"Error processing realtime data: {e}")
            return None

    def process_stroke_data(self, data: dict) -> Optional[dict]:
        """Process incoming stroke data and compute metrics."""
        if self._state != SessionState.RUNNING:
            return None

        try:
            stroke_data = StrokeData.from_dict(data)
            # Skip if realtime already computed this stroke (prevents double-count
            # when simulator sends both realtime + stroke packets for the same stroke)
            last_rt_ts = self.metrics_computer._last_rt_stroke_ts
            if last_rt_ts and abs(stroke_data.timestamp - last_rt_ts) < 2000:
                return None
            computed = self.metrics_computer.compute(stroke_data)

            # Update mode state
            stroke_metrics = {
                "power": computed.power,
                "symmetry": computed.symmetry,
                "smoothness": computed.smoothness,
                "peak_force_left": stroke_data.peak_force_left,
                "peak_force_right": stroke_data.peak_force_right,
                "seat_left_right_balance": computed.seat_left_right_balance,
                "max_lateral_angle": stroke_data.max_lateral_angle,
            }

            mode_update = self.mode_manager.update(
                elapsed_time=computed.session_elapsed_time,
                distance=computed.session_distance,
                calories=computed.session_calories,
                current_split=computed.split_500m,
                stroke_metrics=stroke_metrics,
            )

            # Combine computed metrics with mode state
            result = computed.to_dict()
            result["mode"] = mode_update.get("mode", {})

            # Add mode-specific updates
            if "interval_update" in mode_update:
                result["interval_update"] = mode_update["interval_update"]
            if "game_update" in mode_update:
                result["game_update"] = mode_update["game_update"]
            if "technique_update" in mode_update:
                result["technique_update"] = mode_update["technique_update"]

            return result
        except Exception as e:
            logger.error(f"Error processing stroke data: {e}")
            return None

    def process_sensor_data(self, data: dict) -> Optional[dict]:
        """Process incoming sensor data (auto-detect packet type)."""
        if self._state != SessionState.RUNNING:
            return None

        packet_type = data.get("type", "")

        if packet_type == "realtime":
            return self.process_realtime_data(data)
        elif packet_type == "stroke":
            return self.process_stroke_data(data)
        elif packet_type == "sensor_data":
            # Legacy simulator format - convert to minimal stroke format
            try:
                stroke_data = StrokeData(
                    timestamp=data.get("timestamp", int(time.time() * 1000)),
                    stroke_num=data.get("stroke_num", 0),
                    drive_time=data.get("drive_time", 0.8),
                    recovery_time=data.get("recovery_time", 1.7),
                    peak_force_left=data.get("peak_force_left", data.get("peak_force", 0) / 2),
                    peak_force_right=data.get("peak_force_right", data.get("peak_force", 0) / 2),
                    time_to_peak_force=data.get("time_to_peak_force", 0),
                    catch_position=data.get("catch_position", 0.05),
                    finish_position=data.get("finish_position", 0.95),
                    seat_lr=data.get("seat_left_right_balance", 50),
                    seat_fb=data.get("seat_front_back_balance", 50),
                    max_trunk_angle=data.get("trunk_angle", 0),
                    max_lateral_angle=data.get("lateral_angle", 0),
                )
                computed = self.metrics_computer.compute(stroke_data)

                # Update mode state for legacy data too
                stroke_metrics = {
                    "power": computed.power,
                    "symmetry": computed.symmetry,
                    "smoothness": computed.smoothness,
                    "peak_force_left": stroke_data.peak_force_left,
                    "peak_force_right": stroke_data.peak_force_right,
                    "seat_left_right_balance": computed.seat_left_right_balance,
                    "max_lateral_angle": stroke_data.max_lateral_angle,
                }

                mode_update = self.mode_manager.update(
                    elapsed_time=computed.session_elapsed_time,
                    distance=computed.session_distance,
                    calories=computed.session_calories,
                    current_split=computed.split_500m,
                    stroke_metrics=stroke_metrics,
                )

                result = computed.to_dict()
                result["mode"] = mode_update.get("mode", {})

                if "interval_update" in mode_update:
                    result["interval_update"] = mode_update["interval_update"]
                if "game_update" in mode_update:
                    result["game_update"] = mode_update["game_update"]
                if "technique_update" in mode_update:
                    result["technique_update"] = mode_update["technique_update"]

                return result
            except Exception as e:
                logger.error(f"Error processing legacy sensor data: {e}")
                return None
        else:
            return None

    def get_history(self, limit: int = 50) -> list:
        """Get session history."""
        sessions = self.db.get_sessions(limit)
        return [s.to_dict() for s in sessions]
