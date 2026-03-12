"""Metric computation for rowing data."""

import math
from dataclasses import dataclass, field
from typing import Optional, List

@dataclass
class ESP32Config:
    """Configuration sent from RPi to ESP32."""

    # Stream control
    realtime_hz: int = 30  # Realtime stream frequency (20-50 Hz)
    stream_realtime: bool = False  # Enable realtime stream (for game mode)
    stream_strokes: bool = True  # Enable stroke stream (for analytics)

    # Stroke detection
    force_threshold: float = 50.0  # Force threshold for phase detection (N)
    min_stroke_time: float = 1.0  # Minimum time between strokes (s)
    max_stroke_time: float = 5.0  # Maximum stroke duration (s)

    # User settings
    user_weight: float = 75.0  # User weight for calorie calculation (kg)
    drag_factor: float = 110.0  # Erg drag factor (80-220)

    # Sensor calibration
    calibrate_on_start: bool = True  # Auto-calibrate sensors on session start
    seat_tare_offset: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])  # FL, FR, BL, BR offsets
    handle_tare_offset: List[float] = field(default_factory=lambda: [0.0, 0.0])  # Left, Right offsets

    # Force curve sampling
    force_curve_samples: int = 10  # Number of samples in force curve array

    def to_dict(self) -> dict:
        return {
            "cmd": "config",
            "realtime_hz": self.realtime_hz,
            "stream_realtime": self.stream_realtime,
            "stream_strokes": self.stream_strokes,
            "force_threshold": self.force_threshold,
            "min_stroke_time": self.min_stroke_time,
            "max_stroke_time": self.max_stroke_time,
            "user_weight": self.user_weight,
            "drag_factor": self.drag_factor,
            "calibrate_on_start": self.calibrate_on_start,
            "seat_tare_offset": self.seat_tare_offset,
            "handle_tare_offset": self.handle_tare_offset,
            "force_curve_samples": self.force_curve_samples,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ESP32Config":
        return cls(
            realtime_hz=data.get("realtime_hz", 30),
            stream_realtime=data.get("stream_realtime", False),
            stream_strokes=data.get("stream_strokes", True),
            force_threshold=data.get("force_threshold", 50.0),
            min_stroke_time=data.get("min_stroke_time", 1.0),
            max_stroke_time=data.get("max_stroke_time", 5.0),
            user_weight=data.get("user_weight", 75.0),
            drag_factor=data.get("drag_factor", 110.0),
            calibrate_on_start=data.get("calibrate_on_start", True),
            seat_tare_offset=data.get("seat_tare_offset", [0.0, 0.0, 0.0, 0.0]),
            handle_tare_offset=data.get("handle_tare_offset", [0.0, 0.0]),
            force_curve_samples=data.get("force_curve_samples", 10),
        )

@dataclass
class RealtimeData:
    """
    Minimal high-frequency data from ESP32 for game mode.
    ESP32 sends only raw sensor values, Pi calculates derived metrics.
    """

    timestamp: int  # Unix timestamp in milliseconds

    # Handle (from IMU)
    handle_velocity: float = 0.0  # m/s, instantaneous velocity

    # Force (from load cells on handles)
    force_left: float = 0.0  # N, left handle force
    force_right: float = 0.0  # N, right handle force

    # Seat (from 4 load cells) - ESP32 calculates balance from raw sensors
    seat_lr: float = 50.0  # %, left/right balance (50 = centered)
    seat_fb: float = 50.0  # %, front/back balance (50 = centered)

    # IMU (from chest strap)
    trunk_angle: float = 0.0  # deg, forward/back trunk angle
    lateral_angle: float = 0.0  # deg, side-to-side lean

    # Stroke phase (ESP32 detects based on force threshold)
    phase: str = "recovery"  # "drive" or "recovery"

    # Foot forces (optional extension)
    foot_force_left: float = 0.0  # N, left foot force
    foot_force_right: float = 0.0  # N, right foot force

    @property
    def force_total(self) -> float:
        """Calculate total force from left + right."""
        return self.force_left + self.force_right

    @classmethod
    def from_dict(cls, data: dict) -> "RealtimeData":
        """Parse minimal realtime packet from ESP32."""
        return cls(
            timestamp=data.get("ts", 0),
            handle_velocity=data.get("v", 0.0),
            force_left=data.get("fl", 0.0),
            force_right=data.get("fr", 0.0),
            seat_lr=data.get("slr", 50.0),
            seat_fb=data.get("sfb", 50.0),
            trunk_angle=data.get("ta", 0.0),
            lateral_angle=data.get("la", 0.0),
            phase=data.get("ph", "recovery"),
            foot_force_left=data.get("ffl", 0.0),
            foot_force_right=data.get("ffr", 0.0),
        )

@dataclass
class StrokeData:
    """
    Minimal per-stroke data from ESP32.
    ESP32 sends only what it directly measures, Pi calculates everything else.
    """

    timestamp: int  # Timestamp at stroke completion
    stroke_num: int = 0  # Stroke counter for this session

    # Timing (ESP32 measures directly)
    drive_time: float = 0.0  # s, time while force > threshold
    recovery_time: float = 0.0  # s, time while force < threshold

    # Force (ESP32 captures during stroke)
    peak_force_left: float = 0.0  # N, max left handle force
    peak_force_right: float = 0.0  # N, max right handle force
    time_to_peak_force: float = 0.0  # s, time from drive start to peak
    force_curve: List[float] = field(default_factory=list)  # 10 samples during drive

    # Position (from rotary encoder)
    catch_position: float = 0.0  # ratio 0-1, handle position at drive start
    finish_position: float = 0.0  # ratio 0-1, handle position at drive end

    # Seat (averaged over stroke)
    seat_lr: float = 50.0  # %, avg left/right balance
    seat_fb: float = 50.0  # %, avg front/back balance

    # IMU (extremes during stroke)
    max_trunk_angle: float = 0.0  # deg, max forward lean (at catch)
    min_trunk_angle: float = 0.0  # deg, max back lean (at finish)
    max_lateral_angle: float = 0.0  # deg, max side lean

    # Foot forces (optional extension)
    peak_foot_force_left: float = 0.0  # N, peak left foot force
    peak_foot_force_right: float = 0.0  # N, peak right foot force

    @property
    def peak_force(self) -> float:
        """Total peak force = left + right."""
        return self.peak_force_left + self.peak_force_right

    @property
    def stroke_time(self) -> float:
        """Total stroke duration."""
        return self.drive_time + self.recovery_time

    @property
    def stroke_rate(self) -> float:
        """Strokes per minute."""
        if self.stroke_time > 0:
            return 60.0 / self.stroke_time
        return 0.0

    @property
    def stroke_length(self) -> float:
        """Stroke length in meters (assuming 1.5m max travel)."""
        return abs(self.finish_position - self.catch_position) * 1.5

    @property
    def symmetry(self) -> float:
        """Left/right force symmetry as percentage (100% = perfect)."""
        left = self.peak_force_left
        right = self.peak_force_right
        if left > 0 and right > 0:
            return min(left, right) / max(left, right) * 100
        return 100.0

    @classmethod
    def from_dict(cls, data: dict) -> "StrokeData":
        """Parse minimal stroke packet from ESP32."""
        t = data.get("t", {})  # timing
        f = data.get("f", {})  # force
        p = data.get("p", {})  # position
        s = data.get("s", {})  # seat
        i = data.get("i", {})  # imu
        ff = data.get("ff", {})  # foot force (optional extension)

        return cls(
            timestamp=data.get("ts", 0),
            stroke_num=data.get("n", 0),
            # Timing
            drive_time=t.get("d", 0.0),
            recovery_time=t.get("r", 0.0),
            # Force
            peak_force_left=f.get("l", 0.0),
            peak_force_right=f.get("r", 0.0),
            time_to_peak_force=f.get("tp", 0.0),
            force_curve=f.get("c", []),
            # Position
            catch_position=p.get("c", 0.0),
            finish_position=p.get("f", 0.0),
            # Seat
            seat_lr=s.get("lr", 50.0),
            seat_fb=s.get("fb", 50.0),
            # IMU
            max_trunk_angle=i.get("mt", 0.0),
            min_trunk_angle=i.get("nt", 0.0),
            max_lateral_angle=i.get("ml", 0.0),
            # Foot force (optional)
            peak_foot_force_left=ff.get("l", 0.0),
            peak_foot_force_right=ff.get("r", 0.0),
        )

# Legacy alias for backward compatibility
SensorData = StrokeData

@dataclass
class RealtimeMetrics:
    """Realtime metrics sent to frontend for game mode."""

    timestamp: int
    handle_velocity: float
    force_total: float
    force_left: float
    force_right: float
    seat_lr: float
    seat_fb: float
    phase: str
    # Session totals (updated in realtime)
    session_elapsed_time: float
    session_distance: float
    session_calories: float
    stroke_count: int = 0
    stroke_rate: float = 0.0
    split_500m: float = 0.0
    # Instant power estimate
    instant_power: float = 0.0
    # Foot force (realtime)
    foot_force_left: float = 0.0
    foot_force_right: float = 0.0
    # Trunk IMU (realtime)
    trunk_angle: float = 0.0
    lateral_angle: float = 0.0

    def to_dict(self) -> dict:
        return {
            "type": "realtime_update",
            "timestamp": self.timestamp,
            "handle": {
                "velocity": round(self.handle_velocity, 2),
            },
            "force": {
                "total": round(self.force_total, 1),
                "left": round(self.force_left, 1),
                "right": round(self.force_right, 1),
            },
            "foot_force": {
                "left": round(self.foot_force_left, 1),
                "right": round(self.foot_force_right, 1),
            },
            "seat": {
                "lr": round(self.seat_lr, 1),
                "fb": round(self.seat_fb, 1),
            },
            "trunk": {
                "angle": round(self.trunk_angle, 1),
                "lateral": round(self.lateral_angle, 1),
            },
            "phase": self.phase,
            "instant_power": round(self.instant_power, 0),
            "session": {
                "elapsed_time": round(self.session_elapsed_time, 1),
                "distance": round(self.session_distance, 1),
                "calories": self.session_calories,
                "stroke_count": self.stroke_count,
                "stroke_rate": self.stroke_rate,
                "split_500m": self.split_500m,
            },
        }

@dataclass
class ComputedMetrics:
    """Computed metrics to send to frontend (per stroke)."""

    timestamp: int
    session_elapsed_time: float
    session_distance: float
    session_calories: float
    stroke_count: int
    stroke_rate: int
    power: int
    split_500m: float
    drive_recovery_ratio: float
    stroke_length: float
    peak_force: int
    smoothness: float
    symmetry: float
    trunk_stability: float
    seat_stability: float
    # Advanced metrics
    consistency_index: float  # Stroke-to-stroke stability (%)
    time_to_peak_force: float  # Seconds to reach max force
    power_decline: float  # Power reduction over time (% drop)
    postural_deviation: float  # Degree of leaning (°)
    range_of_motion: float  # Movement span (cm)
    load_distribution: float  # Force spread across phases (%)
    stroke_efficiency: float  # Effort to output ratio (score 0-100)
    force_curve_type: str  # Classification label
    symmetry_drift: float  # L/R balance change over session (%)
    # Seat sensor metrics
    seat_total_load: float  # Total weight on seat (kg)
    seat_left_right_balance: float  # L/R balance on seat (%, 50 = perfect)
    seat_front_back_balance: float  # Front/back balance (%, 50 = centered)
    seat_center_x: float  # Center of pressure X (-1 to 1, 0 = centered)
    seat_center_y: float  # Center of pressure Y (-1 to 1, 0 = centered)
    # Per-side force (for directional balance indicators)
    peak_force_left: float = 0.0
    peak_force_right: float = 0.0
    # Foot force metrics
    peak_foot_force_left: float = 0.0
    peak_foot_force_right: float = 0.0
    foot_force_symmetry: float = 100.0
    # Force curve for visualization
    force_curve_samples: List[float] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "type": "metrics_update",
            "timestamp": self.timestamp,
            "session": {
                "elapsed_time": self.session_elapsed_time,
                "distance": self.session_distance,
                "calories": self.session_calories,
                "stroke_count": self.stroke_count,
            },
            "current": {
                "stroke_rate": self.stroke_rate,
                "power": self.power,
                "split_500m": self.split_500m,
                "drive_recovery_ratio": self.drive_recovery_ratio,
            },
            "stroke_analysis": {
                "stroke_length": self.stroke_length,
                "peak_force": self.peak_force,
                "smoothness": self.smoothness,
                "symmetry": self.symmetry,
                "trunk_stability": self.trunk_stability,
                "seat_stability": self.seat_stability,
                "consistency_index": self.consistency_index,
                "time_to_peak_force": self.time_to_peak_force,
                "power_decline": self.power_decline,
                "postural_deviation": self.postural_deviation,
                "range_of_motion": self.range_of_motion,
                "load_distribution": self.load_distribution,
                "stroke_efficiency": self.stroke_efficiency,
                "force_curve_type": self.force_curve_type,
                "symmetry_drift": self.symmetry_drift,
                "seat_total_load": self.seat_total_load,
                "seat_left_right_balance": self.seat_left_right_balance,
                "seat_front_back_balance": self.seat_front_back_balance,
                "seat_center_x": self.seat_center_x,
                "seat_center_y": self.seat_center_y,
                "force_curve_samples": self.force_curve_samples,
                "peak_force_left": self.peak_force_left,
                "peak_force_right": self.peak_force_right,
                "peak_foot_force_left": self.peak_foot_force_left,
                "peak_foot_force_right": self.peak_foot_force_right,
                "foot_force_symmetry": self.foot_force_symmetry,
            },
        }

class MetricsComputer:
    """Computes rowing metrics from sensor data."""

    # ── Display constants ─────────────────────────────────────────────────────
    # Split is modelled from peak force per stroke, mapped to realistic indoor range.
    # Distance is derived from the displayed split, not raw sensors.
    SPLIT_AT_LOW_EFFORT: float = 145.0   # seconds/500m at ~30N peak force
    SPLIT_AT_HIGH_EFFORT: float = 100.0  # seconds/500m at ~350N peak force
    SPLIT_FORCE_REF: float = 350.0       # N — force that produces max effort split
    PHASE_DEBOUNCE: int = 3              # packets required before phase switches (~100ms at 30Hz)

    def __init__(self):
        self.config = ESP32Config()
        self.reset()

    def reset(self):
        """Reset all accumulated metrics."""
        self.start_time: Optional[int] = None
        self.total_distance: float = 0.0
        self.total_calories: float = 0.0
        self.stroke_count: int = 0
        self.last_timestamp: int = 0
        self.data_points: List[dict] = []

        # Realtime tracking
        self._last_realtime: Optional[RealtimeData] = None
        self._realtime_distance_accumulator: float = 0.0
        self._calorie_accumulator: float = 0.0  # kcal accumulated from power (Concept2 formula)

        # For smoothing/averaging
        self._power_history: List[float] = []
        self._stroke_rate_history: List[float] = []

        # For advanced metrics
        self._stroke_metrics_history: List[dict] = []  # For consistency calculation
        self._symmetry_history: List[float] = []  # For symmetry drift
        self._initial_power_avg: Optional[float] = None  # For power decline
        self._force_profile_history: List[dict] = []  # For force curve classification

        # For seat sensor metrics
        self._seat_center_history: List[dict] = []  # For seat stability calculation
        self.seat_points: List[dict] = []            # Time-series seat readings (1 Hz)
        self._last_seat_record_time: int = 0

        # Stroke detection from realtime packets (used when ESP32 only sends realtime, not stroke packets)
        self._rt_phase: str = "recovery"
        self._rt_drive_start_time: Optional[int] = None
        self._rt_recovery_start_time: Optional[int] = None
        self._rt_recovery_time: float = 0.0
        self._rt_drive_peak_force_left: float = 0.0
        self._rt_drive_peak_force_right: float = 0.0
        self._rt_drive_peak_foot_force_left: float = 0.0
        self._rt_drive_peak_foot_force_right: float = 0.0
        self._rt_drive_max_trunk_angle: float = 0.0
        self._rt_drive_max_lateral_angle: float = 0.0
        self._rt_drive_force_samples: List[float] = []
        self._rt_drive_time_to_peak: float = 0.0
        self._rt_drive_peak_force_time: Optional[int] = None
        self._rt_last_seat_lr: float = 50.0
        self._rt_last_seat_fb: float = 50.0
        self._last_rt_stroke_ts: int = 0  # timestamp of last compute() triggered by realtime phase transition
        self._last_stroke_packet_ts: int = 0  # timestamp of last compute() triggered by explicit stroke packet
        self._rt_last_stroke_period: float = 0.0  # last full stroke duration (drive + recovery) in seconds
        self._displayed_split: float = 0.0   # smooth displayed split — updated once per stroke
        self._displayed_power: float = 0.0   # smooth displayed power — updated once per stroke
        self._realtime_power: float = 0.0  # fast-smoothed power for game mode responsiveness
        self._rt_drive_power_sum: float = 0.0   # accumulate raw power during drive
        self._rt_drive_power_n: int = 0          # sample count
        self._phase_debounce_pending: str = "recovery"  # phase seen in most recent packet
        self._phase_debounce_count: int = 0  # consecutive packets of pending phase

    def update_config(self, config: ESP32Config):
        """Update ESP32 configuration."""
        self.config = config

    def process_realtime(self, data: RealtimeData, pause_duration_ms: int = 0) -> RealtimeMetrics:
        """Process realtime packet for game mode."""
        if self.start_time is None:
            self.start_time = data.timestamp

        # Subtract pause duration from elapsed time
        elapsed_time = (data.timestamp - self.start_time - pause_duration_ms) / 1000.0

        dt = 1.0 / 30.0
        raw_power = max(0.0, min(1000.0, data.force_total * data.handle_velocity))
        if self._rt_phase == "drive":
            self._rt_drive_power_sum += raw_power
            self._rt_drive_power_n += 1
        if data.phase == "drive" and raw_power > 0:
            alpha = 0.2 if raw_power > self._realtime_power else 0.08
            self._realtime_power += (raw_power - self._realtime_power) * alpha
        instant_power = round(max(self._displayed_power, self._realtime_power), 0)

        if self._displayed_split > 0 and self.stroke_count > 0:
            self._realtime_distance_accumulator += (500.0 / self._displayed_split) * dt

        if self._displayed_power > 5.0:
            cal_per_sec = (4.0 * self._displayed_power + 300.0) / 3600.0
            self._calorie_accumulator += cal_per_sec * dt

        self._last_realtime = data
        if data.phase == self._phase_debounce_pending:
            self._phase_debounce_count += 1
        else:
            self._phase_debounce_pending = data.phase
            self._phase_debounce_count = 1
        debounced_phase = (
            self._phase_debounce_pending
            if self._phase_debounce_count >= self.PHASE_DEBOUNCE
            else self._rt_phase
        )

        if debounced_phase != self._rt_phase:
            if debounced_phase == "drive":
                # Recovery → Drive: start tracking new drive phase
                if self._rt_recovery_start_time is not None:
                    self._rt_recovery_time = (data.timestamp - self._rt_recovery_start_time) / 1000.0
                self._rt_drive_start_time = data.timestamp
                self._rt_drive_peak_force_left = 0.0
                self._rt_drive_peak_force_right = 0.0
                self._rt_drive_peak_foot_force_left = 0.0
                self._rt_drive_peak_foot_force_right = 0.0
                self._rt_drive_max_trunk_angle = 0.0
                self._rt_drive_max_lateral_angle = 0.0
                self._rt_drive_force_samples = []
                self._rt_drive_time_to_peak = 0.0
                self._rt_drive_peak_force_time = None
                self._rt_drive_power_sum = 0.0
                self._rt_drive_power_n = 0
            elif debounced_phase == "recovery":
                # Drive → Recovery: stroke complete — synthesize and compute
                if self._rt_drive_start_time is not None:
                    drive_time = (data.timestamp - self._rt_drive_start_time) / 1000.0
                    recovery_time = self._rt_recovery_time if self._rt_recovery_time > 0.3 else 1.5
                    # Sanity check: ignore spurious blips and at-rest velocity noise
                    min_peak_force = 5.0  # N — below this is noise, not a real stroke
                    peak_force_total = self._rt_drive_peak_force_left + self._rt_drive_peak_force_right
                    real_stroke = peak_force_total > min_peak_force
                    if 0.2 <= drive_time <= 3.0 and real_stroke:
                        self._rt_last_stroke_period = drive_time + recovery_time

                                            # Map peak force → realistic split range (higher force = faster pace)
                        force_ratio = min(1.0, peak_force_total / self.SPLIT_FORCE_REF)
                        raw_split = self.SPLIT_AT_LOW_EFFORT - force_ratio * (self.SPLIT_AT_LOW_EFFORT - self.SPLIT_AT_HIGH_EFFORT)
                        # SPM adjustment: higher rate → slightly faster split (±8s over 15-35 SPM)
                        spm = 60.0 / self._rt_last_stroke_period
                        raw_split = max(95.0, min(155.0, raw_split - (spm - 20.0) * 0.4))
                        if self._displayed_split == 0.0:
                            self._displayed_split = raw_split
                        else:
                            self._displayed_split = self._displayed_split * 0.75 + raw_split * 0.25

                        if self._rt_drive_power_n > 0:
                            avg_drive_power = self._rt_drive_power_sum / self._rt_drive_power_n
                            if self._displayed_power == 0.0:
                                self._displayed_power = avg_drive_power
                            else:
                                self._displayed_power = self._displayed_power * 0.7 + avg_drive_power * 0.3
                        self._rt_drive_power_sum = 0.0
                        self._rt_drive_power_n = 0

                        # Downsample force curve to ~10 samples
                        raw_samples = self._rt_drive_force_samples
                        if len(raw_samples) > 10:
                            step = len(raw_samples) / 10
                            force_curve = [raw_samples[int(i * step)] for i in range(10)]
                        else:
                            force_curve = list(raw_samples)
                        stroke = StrokeData(
                            timestamp=data.timestamp,
                            stroke_num=self.stroke_count + 1,
                            drive_time=drive_time,
                            recovery_time=recovery_time,
                            peak_force_left=self._rt_drive_peak_force_left,
                            peak_force_right=self._rt_drive_peak_force_right,
                            time_to_peak_force=self._rt_drive_time_to_peak,
                            force_curve=force_curve,
                            catch_position=0.0,
                            finish_position=0.0,
                            seat_lr=self._rt_last_seat_lr,
                            seat_fb=self._rt_last_seat_fb,
                            max_trunk_angle=self._rt_drive_max_trunk_angle,
                            max_lateral_angle=self._rt_drive_max_lateral_angle,
                            peak_foot_force_left=self._rt_drive_peak_foot_force_left,
                            peak_foot_force_right=self._rt_drive_peak_foot_force_right,
                        )
                        # Skip if an explicit stroke packet already handled this stroke
                        if not (self._last_stroke_packet_ts and abs(data.timestamp - self._last_stroke_packet_ts) < 2000):
                            self.stroke_count += 1
                            self.compute(stroke, _count_stroke=False)
                        self._last_rt_stroke_ts = data.timestamp
                self._rt_recovery_start_time = data.timestamp
            self._rt_phase = debounced_phase

        # Accumulate per-drive stats
        if self._rt_phase == "drive" and self._rt_drive_start_time is not None:
            if data.force_left > self._rt_drive_peak_force_left:
                self._rt_drive_peak_force_left = data.force_left
                self._rt_drive_peak_force_time = data.timestamp
            if data.force_right > self._rt_drive_peak_force_right:
                self._rt_drive_peak_force_right = data.force_right
            if data.foot_force_left > self._rt_drive_peak_foot_force_left:
                self._rt_drive_peak_foot_force_left = data.foot_force_left
            if data.foot_force_right > self._rt_drive_peak_foot_force_right:
                self._rt_drive_peak_foot_force_right = data.foot_force_right
            self._rt_drive_max_trunk_angle = max(self._rt_drive_max_trunk_angle, abs(data.trunk_angle))
            self._rt_drive_max_lateral_angle = max(self._rt_drive_max_lateral_angle, abs(data.lateral_angle))
            self._rt_drive_force_samples.append(data.force_left + data.force_right)
            if self._rt_drive_peak_force_time and self._rt_drive_start_time:
                self._rt_drive_time_to_peak = (self._rt_drive_peak_force_time - self._rt_drive_start_time) / 1000.0
        self._rt_last_seat_lr = data.seat_lr
        self._rt_last_seat_fb = data.seat_fb

        # Record seat position at 1 Hz for time-series chart
        if data.timestamp - self._last_seat_record_time >= 1000:
            elapsed = (data.timestamp - self.start_time) / 1000.0 if self.start_time else 0.0
            self.seat_points.append({
                "t": round(elapsed, 1),
                "x": round((50 - data.seat_lr) / 50, 3),   # + = right
                "y": round((data.seat_fb - 50) / 50, 3),   # + = front
            })
            self._last_seat_record_time = data.timestamp

        # Calculate realtime distance and calories
        realtime_distance = self.total_distance + self._realtime_distance_accumulator
        realtime_calories = round(self.total_calories + self._calorie_accumulator, 2)

        # SPM from last measured stroke period; during first stroke estimate from drive time
        if self._rt_last_stroke_period > 0:
            realtime_spm = round(60.0 / self._rt_last_stroke_period, 1)
        elif self._rt_drive_start_time is not None and self._rt_phase == "drive":
            drive_so_far = (data.timestamp - self._rt_drive_start_time) / 1000.0
            if drive_so_far > 0.3:
                estimated_period = drive_so_far / 0.4
                realtime_spm = round(60.0 / estimated_period, 1)
            else:
                realtime_spm = 0.0
        else:
            realtime_spm = 0.0

        # Split is updated once per stroke in the phase transition block above — just read it
        realtime_split = round(self._displayed_split, 1)

        return RealtimeMetrics(
            timestamp=data.timestamp,
            handle_velocity=data.handle_velocity,
            force_total=data.force_total,
            force_left=data.force_left,
            force_right=data.force_right,
            seat_lr=data.seat_lr,
            seat_fb=data.seat_fb,
            phase=data.phase,
            foot_force_left=data.foot_force_left,
            foot_force_right=data.foot_force_right,
            trunk_angle=data.trunk_angle,
            lateral_angle=data.lateral_angle,
            session_elapsed_time=elapsed_time,
            session_distance=realtime_distance,
            session_calories=realtime_calories,
            stroke_count=self.stroke_count,
            stroke_rate=realtime_spm,
            split_500m=realtime_split,
            instant_power=instant_power,
        )

    def compute(self, stroke_data: StrokeData, _count_stroke: bool = True) -> ComputedMetrics:
        """Compute all metrics from minimal stroke data. Pi does all calculations."""
        if self.start_time is None:
            self.start_time = stroke_data.timestamp
        elapsed_time = (stroke_data.timestamp - self.start_time) / 1000.0
        if _count_stroke:
            self.stroke_count += 1
            self._last_stroke_packet_ts = stroke_data.timestamp

        # Transfer realtime accumulators to totals (for smooth continuity)
        self.total_distance += self._realtime_distance_accumulator
        self._realtime_distance_accumulator = 0.0
        self.total_calories += self._calorie_accumulator
        self._calorie_accumulator = 0.0
        self.last_timestamp = stroke_data.timestamp

        peak_force = stroke_data.peak_force

        stroke_length = round(max(0.7, min(1.6, 0.5 + stroke_data.drive_time * 0.75)), 2)
        range_of_motion = round(80.0 + (stroke_length - 0.7) * 61.0, 1)

        if peak_force > 0 and stroke_data.drive_time > 0:
            avg_force = peak_force * 0.65
            avg_velocity = stroke_length / stroke_data.drive_time
            power = max(0.0, min(1000.0, avg_force * avg_velocity))
        else:
            power = 0.0

        self._power_history.append(power)
        if len(self._power_history) > 50:
            self._power_history.pop(0)

        split_500m = self._displayed_split if self._displayed_split > 0 else 0.0

        self.total_calories = round(self.total_calories, 2)
        stroke_rate = stroke_data.stroke_rate
        symmetry = stroke_data.symmetry

        drive_recovery_ratio = (
            stroke_data.drive_time / stroke_data.recovery_time
            if stroke_data.recovery_time > 0
            else 0.5
        )

        # Quality metrics
        smoothness = self._calculate_smoothness(stroke_data)
        trunk_stability = self._calculate_trunk_stability(stroke_data)
        consistency_index = self._calculate_consistency_index(stroke_data, power)
        time_to_peak_force = stroke_data.time_to_peak_force if stroke_data.time_to_peak_force > 0 else stroke_data.drive_time * 0.4
        power_decline = self._calculate_power_decline(power)
        postural_deviation = self._calculate_postural_deviation(stroke_data)
        # range_of_motion already computed above from peak_force
        load_distribution = self._calculate_load_distribution(stroke_data)
        stroke_efficiency = self._calculate_stroke_efficiency(power, peak_force, stroke_length)
        force_curve_type = self._classify_force_curve(stroke_data)
        symmetry_drift = self._calculate_symmetry_drift(symmetry)

        # Seat metrics
        seat_metrics = self._calculate_seat_metrics(stroke_data)
        seat_stability = self._calculate_seat_stability_from_sensors(stroke_data, seat_metrics)

        # Store data point
        self.data_points.append({
            "time": elapsed_time,
            "strokeRate": int(stroke_rate),
            "power": int(power),
            "strokeLength": stroke_length,
            "driveRecoveryRatio": drive_recovery_ratio,
            "peakForce": int(peak_force),
            "smoothness": smoothness,
            "symmetry": symmetry,
            "trunkStability": trunk_stability,
            "seatStability": seat_stability,
            "split500m": split_500m,
            "consistencyIndex": consistency_index,
            "timeToPeakForce": time_to_peak_force,
            "powerDecline": power_decline,
            "posturalDeviation": postural_deviation,
            "rangeOfMotion": range_of_motion,
            "loadDistribution": load_distribution,
            "strokeEfficiency": stroke_efficiency,
            "forceCurveType": force_curve_type,
            "symmetryDrift": symmetry_drift,
            "seatTotalLoad": seat_metrics["total_load"],
            "seatLeftRightBalance": seat_metrics["left_right_balance"],
            "seatFrontBackBalance": seat_metrics["front_back_balance"],
            "seatCenterX": seat_metrics["center_x"],
            "seatCenterY": seat_metrics["center_y"],
            "forceCurveSamples": stroke_data.force_curve,
            # Foot force data for form analysis
            "peakFootForceLeft": stroke_data.peak_foot_force_left,
            "peakFootForceRight": stroke_data.peak_foot_force_right,
            "footForceTotal": stroke_data.peak_foot_force_left + stroke_data.peak_foot_force_right,
            "footForceSymmetry": self._calculate_foot_symmetry(stroke_data),
        })

        return ComputedMetrics(
            timestamp=stroke_data.timestamp,
            session_elapsed_time=elapsed_time,
            session_distance=self.total_distance,
            session_calories=self.total_calories,
            stroke_count=self.stroke_count,
            stroke_rate=int(stroke_rate),
            power=int(power),
            split_500m=split_500m,
            drive_recovery_ratio=drive_recovery_ratio,
            stroke_length=stroke_length,
            peak_force=int(peak_force),
            smoothness=smoothness,
            symmetry=symmetry,
            trunk_stability=trunk_stability,
            seat_stability=seat_stability,
            consistency_index=consistency_index,
            time_to_peak_force=time_to_peak_force,
            power_decline=power_decline,
            postural_deviation=postural_deviation,
            range_of_motion=range_of_motion,
            load_distribution=load_distribution,
            stroke_efficiency=stroke_efficiency,
            force_curve_type=force_curve_type,
            symmetry_drift=symmetry_drift,
            seat_total_load=seat_metrics["total_load"],
            seat_left_right_balance=seat_metrics["left_right_balance"],
            seat_front_back_balance=seat_metrics["front_back_balance"],
            seat_center_x=seat_metrics["center_x"],
            seat_center_y=seat_metrics["center_y"],
            force_curve_samples=stroke_data.force_curve,
            peak_force_left=stroke_data.peak_force_left,
            peak_force_right=stroke_data.peak_force_right,
            peak_foot_force_left=stroke_data.peak_foot_force_left,
            peak_foot_force_right=stroke_data.peak_foot_force_right,
            foot_force_symmetry=self._calculate_foot_symmetry(stroke_data),
        )

    def _calculate_smoothness(self, stroke_data: StrokeData) -> float:
        """Calculate stroke smoothness based on power consistency."""
        if len(self._power_history) < 3:
            return 85.0

        # Calculate coefficient of variation from recent power values
        recent = self._power_history[-10:]
        mean = sum(recent) / len(recent)
        if mean == 0:
            return 85.0

        variance = sum((x - mean) ** 2 for x in recent) / len(recent)
        cv = math.sqrt(variance) / mean

        # Convert to percentage (lower CV = higher smoothness)
        smoothness = max(60, min(98, 95 - cv * 100))
        return round(smoothness, 1)

    def _calculate_trunk_stability(self, stroke_data: StrokeData) -> float:
        """Calculate trunk stability from IMU data."""
        # Use actual IMU data if available
        if stroke_data.max_lateral_angle > 0:
            # Less lateral movement = more stable
            stability = max(60, 100 - stroke_data.max_lateral_angle * 3)
            return round(stability, 1)

        # Fallback simulation
        base = 88 + math.cos(stroke_data.timestamp / 1500) * 6
        return round(max(60, min(100, base)), 1)

    def _calculate_consistency_index(self, stroke_data: StrokeData, power: float) -> float:
        """Calculate stroke-to-stroke consistency based on key metric stability."""
        # Store current stroke metrics for comparison
        current_stroke = {
            "stroke_length": stroke_data.stroke_length,
            "peak_force": stroke_data.peak_force,
            "power": power,
            "drive_time": stroke_data.drive_time,
        }
        self._stroke_metrics_history.append(current_stroke)

        # Keep last 20 strokes for analysis
        if len(self._stroke_metrics_history) > 20:
            self._stroke_metrics_history.pop(0)

        if len(self._stroke_metrics_history) < 3:
            return 85.0

        # Calculate coefficient of variation for each metric
        cvs = []
        for key in ["stroke_length", "peak_force", "power"]:
            values = [s[key] for s in self._stroke_metrics_history if s[key] > 0]
            if len(values) < 3:
                continue
            mean = sum(values) / len(values)
            if mean > 0:
                variance = sum((x - mean) ** 2 for x in values) / len(values)
                cv = math.sqrt(variance) / mean
                cvs.append(cv)

        if not cvs:
            return 85.0

        # Average CV, then convert to consistency percentage
        avg_cv = sum(cvs) / len(cvs)
        consistency = max(50, min(100, 100 - avg_cv * 150))
        return round(consistency, 1)

    def _calculate_power_decline(self, current_power: float) -> float:
        """Calculate power decline over time (fatigue indicator)."""
        # Store initial power average from first 10 strokes
        if self._initial_power_avg is None and len(self._power_history) >= 10:
            self._initial_power_avg = sum(self._power_history[:10]) / 10

        if self._initial_power_avg is None or self._initial_power_avg <= 0:
            return 0.0

        # Calculate current average from recent samples
        recent = self._power_history[-10:] if self._power_history else [current_power]
        recent_avg = sum(recent) / len(recent)

        # Calculate percentage decline
        decline = ((self._initial_power_avg - recent_avg) / self._initial_power_avg) * 100
        return round(max(0, min(50, decline)), 1)

    def _calculate_postural_deviation(self, stroke_data: StrokeData) -> float:
        """Calculate degree of postural deviation from IMU angles."""
        # Use IMU data if available
        if stroke_data.max_lateral_angle > 0 or stroke_data.max_trunk_angle != 0:
            # Lateral deviation is weighted more (side lean is worse than forward lean)
            total_deviation = abs(stroke_data.max_lateral_angle) * 1.5 + abs(stroke_data.max_trunk_angle) * 0.2
            return round(min(20, total_deviation), 1)

        # Simulate if no IMU data
        base = 5 + math.sin(stroke_data.timestamp / 1000) * 3
        return round(max(0, min(20, base)), 1)

    def _calculate_range_of_motion(self, stroke_data: StrokeData) -> float:
        """Calculate range of motion from stroke data."""
        # Use catch/finish positions from rotary encoder
        if stroke_data.catch_position > 0 or stroke_data.finish_position > 0:
            # Position is 0-1, multiply by 150 to get cm (assuming 1.5m max travel)
            rom = abs(stroke_data.finish_position - stroke_data.catch_position) * 150
            return round(max(80, min(160, rom)), 1)

        # Use stroke_length (computed property)
        if stroke_data.stroke_length > 0:
            rom = stroke_data.stroke_length * 100  # m to cm
            return round(max(80, min(160, rom)), 1)

        return 120.0  # Fallback

    def _calculate_load_distribution(self, stroke_data: StrokeData) -> float:
        """Calculate how force is distributed (L/R balance)."""
        left = stroke_data.peak_force_left
        right = stroke_data.peak_force_right

        if left > 0 and right > 0:
            # How balanced is the force distribution (100% = perfect 50/50)
            distribution = min(left, right) / max(left, right) * 100
            return round(distribution, 1)

        # Use seat balance as fallback
        deviation = abs(stroke_data.seat_lr - 50)
        distribution = max(70, 100 - deviation * 2)
        return round(distribution, 1)

    def _calculate_stroke_efficiency(self, power: float, peak_force: float, stroke_length: float) -> float:
        """Calculate stroke efficiency score (power output relative to force applied)."""
        if peak_force <= 0:
            return 75.0

        # Higher power with lower force = more efficient
        efficiency_ratio = power / peak_force if peak_force > 0 else 0
        efficiency = min(100, max(50, efficiency_ratio * 250))

        # Factor in stroke length (longer strokes generally more efficient)
        length_bonus = (stroke_length - 1.0) * 10
        efficiency = efficiency + length_bonus

        return round(max(50, min(100, efficiency)), 1)

    def _classify_force_curve(self, stroke_data: StrokeData) -> str:
        """Classify force curve shape based on time to peak force."""
        time_to_peak = stroke_data.time_to_peak_force if stroke_data.time_to_peak_force > 0 else stroke_data.drive_time * 0.4
        drive_time = stroke_data.drive_time if stroke_data.drive_time > 0 else 0.5

        # Ratio of time to peak vs total drive time
        peak_ratio = time_to_peak / drive_time if drive_time > 0 else 0.5

        # Store for pattern analysis
        self._force_profile_history.append({
            "peak_ratio": peak_ratio,
            "peak_force": stroke_data.peak_force,
        })
        if len(self._force_profile_history) > 10:
            self._force_profile_history.pop(0)

        # Classify based on when peak occurs
        if peak_ratio < 0.3:
            return "Front-loaded"
        elif peak_ratio < 0.45:
            return "Early Peak"
        elif peak_ratio < 0.55:
            return "Balanced"
        elif peak_ratio < 0.7:
            return "Late Peak"
        else:
            return "Back-loaded"

    def _calculate_symmetry_drift(self, current_symmetry: float) -> float:
        """Calculate how left/right symmetry changes over the session."""
        self._symmetry_history.append(current_symmetry)

        if len(self._symmetry_history) < 10:
            return 0.0

        # Compare early session symmetry to recent symmetry
        early_avg = sum(self._symmetry_history[:10]) / 10
        recent_avg = sum(self._symmetry_history[-10:]) / 10

        # Calculate drift (positive = improving, negative = declining)
        drift = recent_avg - early_avg
        return round(drift, 1)

    def _calculate_seat_metrics(self, stroke_data: StrokeData) -> dict:
        """Calculate seat metrics from balance data."""
        left_right_balance = stroke_data.seat_lr
        front_back_balance = stroke_data.seat_fb

        # Calculate center of pressure from balance percentages
        # Convert from percentage (0-100) to normalized (-1 to +1)
        # slr is left%, so invert: higher left% = dot moves left (negative x)
        center_x = (50 - left_right_balance) / 50  # + = more on right
        center_y = (front_back_balance - 50) / 50  # + = more on front

        # Estimate total load (not sent by ESP32, approximate from user weight)
        total_load = self.config.user_weight

        return {
            "total_load": round(total_load, 1),
            "left_right_balance": round(left_right_balance, 1),
            "front_back_balance": round(front_back_balance, 1),
            "center_x": round(center_x, 3),
            "center_y": round(center_y, 3),
        }

    def _calculate_seat_stability_from_sensors(self, stroke_data: StrokeData, seat_metrics: dict) -> float:
        """Calculate seat stability from center of pressure movement over time."""
        # Store current center of pressure
        self._seat_center_history.append({
            "x": seat_metrics["center_x"],
            "y": seat_metrics["center_y"],
        })

        # Keep last 20 samples
        if len(self._seat_center_history) > 20:
            self._seat_center_history.pop(0)

        if len(self._seat_center_history) < 5:
            return 90.0  # Default good stability

        # Calculate variance of center of pressure
        x_values = [p["x"] for p in self._seat_center_history]
        y_values = [p["y"] for p in self._seat_center_history]

        x_mean = sum(x_values) / len(x_values)
        y_mean = sum(y_values) / len(y_values)

        x_variance = sum((x - x_mean) ** 2 for x in x_values) / len(x_values)
        y_variance = sum((y - y_mean) ** 2 for y in y_values) / len(y_values)

        # Combined variance (movement radius)
        total_variance = math.sqrt(x_variance + y_variance)

        # Convert to stability percentage (lower variance = higher stability)
        stability = max(50, min(100, 100 - total_variance * 200))

        return round(stability, 1)

    def _calculate_foot_symmetry(self, stroke_data: StrokeData) -> float:
        """Calculate foot force symmetry (left/right balance)."""
        left = stroke_data.peak_foot_force_left
        right = stroke_data.peak_foot_force_right

        if left > 0 and right > 0:
            return round(min(left, right) / max(left, right) * 100, 1)
        return 100.0  # Default perfect symmetry if no data

    def get_session_metrics(self) -> dict:
        """Get aggregated session metrics."""
        if not self.data_points:
            return {}

        n = len(self.data_points)

        def avg(key):
            return sum(dp[key] for dp in self.data_points) / n

        def max_val(key):
            return max(dp[key] for dp in self.data_points)

        def min_val(key):
            return min(dp[key] for dp in self.data_points)

        def mode_str(key):
            """Get most common string value."""
            from collections import Counter
            values = [dp[key] for dp in self.data_points]
            return Counter(values).most_common(1)[0][0] if values else ""

        # Calculate final symmetry drift (comparing first and last 20% of session)
        n_compare = max(5, n // 5)
        early_symmetry = sum(dp["symmetry"] for dp in self.data_points[:n_compare]) / n_compare
        late_symmetry = sum(dp["symmetry"] for dp in self.data_points[-n_compare:]) / n_compare
        final_symmetry_drift = round(late_symmetry - early_symmetry, 1)

        return {
            "avg_stroke_rate": round(avg("strokeRate")),
            "avg_power": round(avg("power")),
            "avg_split": avg("split500m"),
            "peak_power": max_val("power"),
            "avg_stroke_length": round(avg("strokeLength"), 2),
            "avg_drive_recovery": round(avg("driveRecoveryRatio"), 2),
            "avg_smoothness": round(avg("smoothness")),
            "avg_symmetry": round(avg("symmetry")),
            "avg_trunk_stability": round(avg("trunkStability")),
            "avg_seat_stability": round(avg("seatStability")),
            "avg_peak_force": round(avg("peakForce")),
            # New advanced metrics
            "avg_consistency_index": round(avg("consistencyIndex"), 1),
            "avg_time_to_peak_force": round(avg("timeToPeakForce"), 2),
            "power_decline": round(self.data_points[-1]["powerDecline"], 1) if self.data_points else 0,
            "avg_postural_deviation": round(avg("posturalDeviation"), 1),
            "avg_range_of_motion": round(avg("rangeOfMotion"), 1),
            "avg_load_distribution": round(avg("loadDistribution"), 1),
            "avg_stroke_efficiency": round(avg("strokeEfficiency"), 1),
            "force_curve_type": mode_str("forceCurveType"),
            "symmetry_drift": final_symmetry_drift,
            "peak_handle_force": max_val("peakForce"),
            "min_time_to_peak_force": round(min_val("timeToPeakForce"), 2),
            # Seat sensor metrics
            "avg_seat_total_load": round(avg("seatTotalLoad"), 1),
            "avg_seat_left_right_balance": round(avg("seatLeftRightBalance"), 1),
            "avg_seat_front_back_balance": round(avg("seatFrontBackBalance"), 1),
            "avg_seat_center_x": round(avg("seatCenterX"), 3),
            "avg_seat_center_y": round(avg("seatCenterY"), 3),
            # Foot force metrics
            "avg_foot_force_left": round(avg("peakFootForceLeft"), 1),
            "avg_foot_force_right": round(avg("peakFootForceRight"), 1),
            "avg_foot_force_total": round(avg("footForceTotal"), 1),
            "avg_foot_force_symmetry": round(avg("footForceSymmetry"), 1),
            "peak_foot_force": max_val("footForceTotal"),
            "avg_force_curve_samples": self._avg_force_curve(),
        }

    def _avg_force_curve(self) -> list:
        """Element-wise average of force curves across all strokes that have data."""
        curves = [dp["forceCurveSamples"] for dp in self.data_points
                  if dp.get("forceCurveSamples")]
        if not curves:
            return []
        max_len = max(len(c) for c in curves)
        result = []
        for i in range(max_len):
            vals = [c[i] for c in curves if i < len(c)]
            result.append(round(sum(vals) / len(vals), 2) if vals else 0.0)
        return result
