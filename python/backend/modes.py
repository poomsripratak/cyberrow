"""Rowing session modes and goal tracking."""

from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, List
import time
import logging

logger = logging.getLogger(__name__)


class SessionMode(Enum):
    FREE_ROW = "free_row"
    DISTANCE = "distance"
    TIME = "time"
    CALORIES = "calories"
    INTERVALS = "intervals"
    RACE = "race"
    GHOST_RACE = "ghost_race"
    GAME = "game"
    TECHNIQUE = "technique"


@dataclass
class IntervalConfig:
    """Configuration for interval training."""
    work_duration: int = 30  # seconds
    rest_duration: int = 30  # seconds
    rounds: int = 10
    current_round: int = 0
    is_work_phase: bool = True
    phase_start_elapsed: float = 0.0  # session elapsed time in seconds when phase started
    phase_remaining: float = 0.0  # cached for serialization


@dataclass
class RaceConfig:
    """Configuration for race mode."""
    target_split: float = 120.0  # seconds per 500m
    distance: float = 2000.0  # meters
    pace_boat_distance: float = 0.0  # current pace boat position
    user_lead: float = 0.0  # positive = ahead, negative = behind


@dataclass
class GhostConfig:
    """Configuration for ghost race."""
    ghost_session_id: int = 0
    ghost_data_points: List[dict] = field(default_factory=list)
    ghost_distance: float = 0.0
    current_ghost_index: int = 0


@dataclass
class GameConfig:
    """Configuration for game mode."""
    score: int = 0
    coins_collected: int = 0
    obstacles_dodged: int = 0
    lane_position: float = 0.5  # 0-1, center of river
    river_speed: float = 1.0  # multiplier based on rowing speed


@dataclass
class TechniqueConfig:
    """Configuration for technique mode."""
    focus_metrics: List[str] = field(default_factory=lambda: ["symmetry", "smoothness", "posture"])
    coaching_enabled: bool = True
    last_cue_time: int = 0
    cue_interval: int = 10000  # ms between coaching cues


@dataclass
class ModeState:
    """Current state of the session mode."""
    mode: SessionMode = SessionMode.FREE_ROW

    # Goal tracking
    target_distance: float = 0.0  # meters
    target_time: int = 0  # seconds
    target_calories: int = 0

    # Progress
    progress_percent: float = 0.0
    time_remaining: int = 0  # seconds
    distance_remaining: float = 0.0  # meters
    calories_remaining: int = 0

    # Mode-specific configs
    interval_config: Optional[IntervalConfig] = None
    race_config: Optional[RaceConfig] = None
    ghost_config: Optional[GhostConfig] = None
    game_config: Optional[GameConfig] = None
    technique_config: Optional[TechniqueConfig] = None

    # Completion
    is_complete: bool = False
    completion_time: Optional[int] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {
            "mode": self.mode.value,
            "target_distance": self.target_distance,
            "target_time": self.target_time,
            "target_calories": self.target_calories,
            "progress_percent": round(self.progress_percent, 1),
            "time_remaining": self.time_remaining,
            "distance_remaining": round(self.distance_remaining, 1),
            "calories_remaining": self.calories_remaining,
            "is_complete": self.is_complete,
        }

        if self.interval_config:
            result["interval"] = {
                "work_duration": self.interval_config.work_duration,
                "rest_duration": self.interval_config.rest_duration,
                "rounds": self.interval_config.rounds,
                "current_round": self.interval_config.current_round,
                "is_work_phase": self.interval_config.is_work_phase,
                "phase_time_remaining": round(self._get_interval_phase_remaining(), 1),
            }

        if self.race_config:
            result["race"] = {
                "target_split": self.race_config.target_split,
                "distance": self.race_config.distance,
                "pace_boat_distance": round(self.race_config.pace_boat_distance, 1),
                "user_lead": round(self.race_config.user_lead, 1),
            }

        if self.ghost_config:
            result["ghost"] = {
                "ghost_session_id": self.ghost_config.ghost_session_id,
                "ghost_distance": round(self.ghost_config.ghost_distance, 1),
            }

        if self.game_config:
            result["game"] = {
                "score": self.game_config.score,
                "coins_collected": self.game_config.coins_collected,
                "obstacles_dodged": self.game_config.obstacles_dodged,
                "lane_position": round(self.game_config.lane_position, 2),
                "river_speed": round(self.game_config.river_speed, 2),
            }

        if self.technique_config:
            result["technique"] = {
                "focus_metrics": self.technique_config.focus_metrics,
                "coaching_enabled": self.technique_config.coaching_enabled,
            }

        return result

    def _get_interval_phase_remaining(self) -> float:
        """Get remaining time in current interval phase (cached value)."""
        if not self.interval_config:
            return 0
        return self.interval_config.phase_remaining


class ModeManager:
    """Manages session modes and goal tracking."""

    def __init__(self):
        self.state = ModeState()
        self._session_start_time: Optional[int] = None

    def reset(self):
        """Reset mode state."""
        self.state = ModeState()
        self._session_start_time = None

    def set_mode(self, mode_config: dict) -> dict:
        """Configure the session mode."""
        mode_name = mode_config.get("mode", "free_row")

        try:
            mode = SessionMode(mode_name)
        except ValueError:
            return {"status": "error", "message": f"Unknown mode: {mode_name}"}

        self.state = ModeState(mode=mode)

        # Configure based on mode
        if mode == SessionMode.DISTANCE:
            self.state.target_distance = mode_config.get("distance", 2000)
            self.state.distance_remaining = self.state.target_distance

        elif mode == SessionMode.TIME:
            self.state.target_time = mode_config.get("time", 1200)  # 20 min default
            self.state.time_remaining = self.state.target_time

        elif mode == SessionMode.CALORIES:
            self.state.target_calories = mode_config.get("calories", 200)
            self.state.calories_remaining = self.state.target_calories

        elif mode == SessionMode.INTERVALS:
            self.state.interval_config = IntervalConfig(
                work_duration=mode_config.get("work_duration", 30),
                rest_duration=mode_config.get("rest_duration", 30),
                rounds=mode_config.get("rounds", 10),
            )

        elif mode == SessionMode.RACE:
            self.state.race_config = RaceConfig(
                target_split=mode_config.get("target_split", 120),
                distance=mode_config.get("distance", 2000),
            )
            self.state.target_distance = self.state.race_config.distance
            self.state.distance_remaining = self.state.target_distance

        elif mode == SessionMode.GHOST_RACE:
            ghost_data = mode_config.get("ghost_data", [])
            self.state.ghost_config = GhostConfig(
                ghost_session_id=mode_config.get("ghost_session_id", 0),
                ghost_data_points=ghost_data,
            )
            # Set distance from config or ghost session
            if mode_config.get("target_distance"):
                self.state.target_distance = mode_config.get("target_distance")
            elif ghost_data:
                last_point = ghost_data[-1]
                self.state.target_distance = last_point.get("distance", 2000)
            else:
                self.state.target_distance = 2000
            self.state.distance_remaining = self.state.target_distance

        elif mode == SessionMode.GAME:
            self.state.game_config = GameConfig()

        elif mode == SessionMode.TECHNIQUE:
            self.state.technique_config = TechniqueConfig(
                focus_metrics=mode_config.get("focus_metrics", ["symmetry", "smoothness", "posture"]),
                coaching_enabled=mode_config.get("coaching_enabled", True),
            )

        return {"status": "ok", "mode": self.state.to_dict()}

    def start_session(self):
        """Called when session starts."""
        self._session_start_time = int(time.time() * 1000)

        if self.state.interval_config:
            self.state.interval_config.phase_start_elapsed = 0.0
            self.state.interval_config.current_round = 1
            self.state.interval_config.is_work_phase = True
            self.state.interval_config.phase_remaining = float(self.state.interval_config.work_duration)

    def update(self, elapsed_time: float, distance: float, calories: int,
               current_split: float = 0, stroke_metrics: dict = None) -> dict:
        """Update mode state with current session metrics."""

        if self.state.is_complete:
            return {"status": "complete", "mode": self.state.to_dict()}

        mode = self.state.mode
        result = {"status": "ok"}

        # Update based on mode
        if mode == SessionMode.DISTANCE:
            self._update_distance_mode(distance)

        elif mode == SessionMode.TIME:
            self._update_time_mode(elapsed_time)

        elif mode == SessionMode.CALORIES:
            self._update_calories_mode(calories)

        elif mode == SessionMode.INTERVALS:
            result["interval_update"] = self._update_interval_mode(elapsed_time)

        elif mode == SessionMode.RACE:
            self._update_race_mode(elapsed_time, distance, current_split)

        elif mode == SessionMode.GHOST_RACE:
            self._update_ghost_mode(elapsed_time, distance)

        elif mode == SessionMode.GAME:
            result["game_update"] = self._update_game_mode(stroke_metrics)

        elif mode == SessionMode.TECHNIQUE:
            result["technique_update"] = self._update_technique_mode(stroke_metrics)

        result["mode"] = self.state.to_dict()
        return result

    def _update_distance_mode(self, distance: float):
        """Update distance goal progress."""
        self.state.distance_remaining = max(0, self.state.target_distance - distance)
        self.state.progress_percent = (distance / self.state.target_distance) * 100 if self.state.target_distance > 0 else 0

        if distance >= self.state.target_distance:
            self._complete_session()

    def _update_time_mode(self, elapsed_time: float):
        """Update time goal progress."""
        elapsed_seconds = int(elapsed_time)
        self.state.time_remaining = max(0, self.state.target_time - elapsed_seconds)
        self.state.progress_percent = (elapsed_seconds / self.state.target_time) * 100 if self.state.target_time > 0 else 0

        if elapsed_seconds >= self.state.target_time:
            self._complete_session()

    def _update_calories_mode(self, calories: int):
        """Update calorie goal progress."""
        self.state.calories_remaining = max(0, self.state.target_calories - calories)
        self.state.progress_percent = (calories / self.state.target_calories) * 100 if self.state.target_calories > 0 else 0

        if calories >= self.state.target_calories:
            self._complete_session()

    def _update_interval_mode(self, elapsed_time: float) -> dict:
        """Update interval training state."""
        if not self.state.interval_config:
            return {}

        config = self.state.interval_config
        phase_elapsed = elapsed_time - config.phase_start_elapsed

        current_phase_duration = config.work_duration if config.is_work_phase else config.rest_duration

        result = {}

        # Check if phase should switch
        if phase_elapsed >= current_phase_duration:
            if config.is_work_phase:
                # Switch to rest
                config.is_work_phase = False
                config.phase_start_elapsed = config.phase_start_elapsed + current_phase_duration
                config.phase_remaining = float(config.rest_duration)
                result["phase_change"] = "rest"
            else:
                # Switch to work, increment round
                config.current_round += 1
                if config.current_round > config.rounds:
                    self._complete_session()
                    result["phase_change"] = "complete"
                else:
                    config.is_work_phase = True
                    config.phase_start_elapsed = config.phase_start_elapsed + current_phase_duration
                    config.phase_remaining = float(config.work_duration)
                    result["phase_change"] = "work"
        else:
            # Update cached remaining time
            config.phase_remaining = max(0, current_phase_duration - phase_elapsed)

        # Calculate overall progress
        total_phases = config.rounds * 2
        completed_phases = (config.current_round - 1) * 2 + (0 if config.is_work_phase else 1)
        self.state.progress_percent = (completed_phases / total_phases) * 100

        return result

    def _update_race_mode(self, elapsed_time: float, distance: float, current_split: float):
        """Update race mode with pace boat."""
        if not self.state.race_config:
            return

        config = self.state.race_config

        # Calculate pace boat position
        # Pace boat travels at constant target_split pace
        # velocity = 500 / target_split (m/s)
        pace_velocity = 500 / config.target_split if config.target_split > 0 else 0
        config.pace_boat_distance = pace_velocity * elapsed_time

        # Calculate lead/deficit
        config.user_lead = distance - config.pace_boat_distance

        # Update progress
        self.state.distance_remaining = max(0, config.distance - distance)
        self.state.progress_percent = (distance / config.distance) * 100 if config.distance > 0 else 0

        if distance >= config.distance:
            self._complete_session()

    def _update_ghost_mode(self, elapsed_time: float, distance: float):
        """Update ghost race mode."""
        if not self.state.ghost_config:
            return

        config = self.state.ghost_config

        # Find ghost position at current time
        ghost_distance = 0
        for i, point in enumerate(config.ghost_data_points):
            if point.get("time", 0) <= elapsed_time:
                ghost_distance = point.get("distance", 0)
                config.current_ghost_index = i
            else:
                break

        config.ghost_distance = ghost_distance

        # Update progress
        self.state.distance_remaining = max(0, self.state.target_distance - distance)
        self.state.progress_percent = (distance / self.state.target_distance) * 100 if self.state.target_distance > 0 else 0

        if distance >= self.state.target_distance:
            self._complete_session()

    def _update_game_mode(self, stroke_metrics: dict) -> dict:
        """Update game mode state."""
        if not self.state.game_config or not stroke_metrics:
            return {}

        config = self.state.game_config

        # Update lane position based on seat balance (steering)
        # seat_lr > 50 means more weight on left, should steer left (lower Y)
        # seat_lr < 50 means more weight on right, should steer right (higher Y)
        seat_lr = stroke_metrics.get("seat_left_right_balance", 50)
        # Convert 0-100 balance to -0.5 to 0.5 offset (inverted: left=lower, right=higher)
        steering = (50 - seat_lr) / 100
        # Smooth the steering
        target_position = max(0, min(1, 0.5 + steering))
        config.lane_position = config.lane_position + (target_position - config.lane_position) * 0.15

        # Update river speed based on power
        power = stroke_metrics.get("power", 0)
        config.river_speed = max(0.5, min(3.0, power / 100))

        # Score increases with distance and good technique
        symmetry = stroke_metrics.get("symmetry", 50)
        smoothness = stroke_metrics.get("smoothness", 50)
        technique_bonus = (symmetry + smoothness) / 200  # 0-1

        # Points per stroke
        config.score += int(10 * config.river_speed * (1 + technique_bonus))

        return {
            "lane_position": config.lane_position,
            "river_speed": config.river_speed,
            "score": config.score,
        }

    def handle_game_collision(self, collision_type: str) -> dict:
        """Handle a collision event from the frontend game."""
        if not self.state.game_config:
            return {}

        config = self.state.game_config

        if collision_type == "coin":
            config.score += 50
            config.coins_collected += 1
        elif collision_type == "boost":
            config.score += 100
            config.coins_collected += 1
        elif collision_type in ("rock", "log"):
            config.score = max(0, config.score - 25)
            config.obstacles_dodged += 1

        return {
            "score": config.score,
            "coins_collected": config.coins_collected,
            "obstacles_dodged": config.obstacles_dodged,
        }

    def _update_technique_mode(self, stroke_metrics: dict) -> dict:
        """Update technique mode with coaching cues."""
        if not self.state.technique_config or not stroke_metrics:
            return {}

        config = self.state.technique_config
        result = {"cues": []}

        if not config.coaching_enabled:
            return result

        now = int(time.time() * 1000)

        # Only give cues at intervals
        if now - config.last_cue_time < config.cue_interval:
            return result

        config.last_cue_time = now

        # Generate coaching cues based on metrics
        cues = []

        # Symmetry check
        if "symmetry" in config.focus_metrics:
            symmetry = stroke_metrics.get("symmetry", 100)
            left_force = stroke_metrics.get("peak_force_left", 0)
            right_force = stroke_metrics.get("peak_force_right", 0)

            if symmetry < 85:
                if left_force > right_force:
                    cues.append({"type": "symmetry", "message": "Pull more with your right arm"})
                else:
                    cues.append({"type": "symmetry", "message": "Pull more with your left arm"})

        # Smoothness check
        if "smoothness" in config.focus_metrics:
            smoothness = stroke_metrics.get("smoothness", 100)
            if smoothness < 80:
                cues.append({"type": "smoothness", "message": "Smooth out your stroke - maintain consistent power"})

        # Posture check
        if "posture" in config.focus_metrics:
            lateral = stroke_metrics.get("max_lateral_angle", 0)
            if abs(lateral) > 5:
                direction = "left" if lateral > 0 else "right"
                cues.append({"type": "posture", "message": f"You're leaning {direction} - sit up straight"})

        # Seat balance check
        seat_lr = stroke_metrics.get("seat_left_right_balance", 50)
        if abs(seat_lr - 50) > 10:
            side = "left" if seat_lr > 50 else "right"
            cues.append({"type": "balance", "message": f"Shift weight slightly {side} for better balance"})

        result["cues"] = cues[:2]  # Max 2 cues at a time
        return result

    def _complete_session(self):
        """Mark session as complete."""
        self.state.is_complete = True
        self.state.completion_time = int(time.time() * 1000)
        self.state.progress_percent = 100.0

    def get_state(self) -> dict:
        """Get current mode state."""
        return self.state.to_dict()
