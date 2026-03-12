"""Realistic rowing packet generator matching ESP32 spec."""

import math
import random
import time
from dataclasses import dataclass, field
from typing import Iterator, Optional, List

from .config import SimulatorConfig


@dataclass
class RealtimePacket:
    """Realtime sensor packet (30 Hz) - matches ESP32 spec."""

    ts: int  # Timestamp (ms)
    p: float  # Handle position (0=catch, 1=finish)
    v: float  # Handle velocity (m/s)
    fl: float  # Left handle force (N)
    fr: float  # Right handle force (N)
    slr: float  # Seat L/R balance (%, 50=centered)
    sfb: float  # Seat F/B balance (%, 50=centered)
    ta: float  # Trunk angle (deg, +forward)
    la: float  # Lateral angle (deg, +right)
    ph: str  # Phase ("drive" / "recovery")
    # Extensions (not in base spec)
    ffl: Optional[float] = None  # Foot force left (N)
    ffr: Optional[float] = None  # Foot force right (N)

    def to_dict(self) -> dict:
        d = {
            "type": "realtime",
            "ts": self.ts,
            "p": round(self.p, 2),
            "v": round(self.v, 2),
            "fl": round(self.fl, 1),
            "fr": round(self.fr, 1),
            "slr": round(self.slr, 1),
            "sfb": round(self.sfb, 1),
            "ta": round(self.ta, 1),
            "la": round(self.la, 1),
            "ph": self.ph,
        }
        # Add foot forces if available
        if self.ffl is not None:
            d["ffl"] = round(self.ffl, 1)
        if self.ffr is not None:
            d["ffr"] = round(self.ffr, 1)
        return d


@dataclass
class StrokePacket:
    """Per-stroke analytics packet - matches ESP32 spec."""

    ts: int  # Timestamp at stroke completion (ms)
    n: int  # Stroke number in session
    # Timing
    t_d: float  # Drive duration (s)
    t_r: float  # Recovery duration (s)
    # Force
    f_l: float  # Peak left force (N)
    f_r: float  # Peak right force (N)
    f_tp: float  # Time to peak force (s)
    f_c: List[int]  # Force curve samples (10 values)
    # Position
    p_c: float  # Handle position at catch
    p_f: float  # Handle position at finish
    # Seat
    s_lr: float  # Average L/R balance (%)
    s_fb: float  # Average F/B balance (%)
    # IMU
    i_mt: float  # Max trunk forward angle (deg)
    i_nt: float  # Min trunk angle at finish (deg, negative)
    i_ml: float  # Max lateral lean (deg)
    # Extensions
    ff_l: Optional[float] = None  # Peak foot force left (N)
    ff_r: Optional[float] = None  # Peak foot force right (N)

    def to_dict(self) -> dict:
        d = {
            "type": "stroke",
            "ts": self.ts,
            "n": self.n,
            "t": {"d": round(self.t_d, 2), "r": round(self.t_r, 2)},
            "f": {
                "l": round(self.f_l, 1),
                "r": round(self.f_r, 1),
                "tp": round(self.f_tp, 2),
                "c": self.f_c,
            },
            "p": {"c": round(self.p_c, 2), "f": round(self.p_f, 2)},
            "s": {"lr": round(self.s_lr, 1), "fb": round(self.s_fb, 1)},
            "i": {
                "mt": round(self.i_mt, 1),
                "nt": round(self.i_nt, 1),
                "ml": round(self.i_ml, 1),
            },
        }
        # Add foot forces if available
        if self.ff_l is not None and self.ff_r is not None:
            d["ff"] = {"l": round(self.ff_l, 1), "r": round(self.ff_r, 1)}
        return d


class PacketGenerator:
    """Generates realistic rowing sensor packets matching ESP32 spec."""

    # Force thresholds for drive detection with hysteresis (N)
    # Use different thresholds for entering vs exiting drive to prevent jitter
    FORCE_THRESHOLD_ENTER = 80.0  # Force must exceed this to START drive
    FORCE_THRESHOLD_EXIT = 40.0   # Force must drop below this to END drive

    # Minimum time between stroke starts (ms) to filter false detections
    MIN_STROKE_INTERVAL_MS = 1500  # At 40 SPM max, strokes are 1.5s apart minimum

    def __init__(self, config: SimulatorConfig, enable_foot_force: bool = True):
        self.config = config
        self.enable_foot_force = enable_foot_force
        self._start_time: int = 0
        self._stroke_count: int = 0
        self._last_position: float = 0.0

        # Force-based phase tracking (matches ESP32 spec)
        self._force_phase: str = "recovery"  # Current phase based on force threshold
        self._was_in_drive: bool = False  # Track if we were in drive phase

        # Stroke accumulation
        self._drive_start_time: int = 0
        self._drive_end_time: int = 0
        self._recovery_start_time: int = 0
        self._last_stroke_time: int = 0  # Timestamp of last generated stroke
        self._peak_force_left: float = 0.0
        self._peak_force_right: float = 0.0
        self._peak_foot_force_left: float = 0.0
        self._peak_foot_force_right: float = 0.0
        self._time_to_peak: float = 0.0
        self._force_samples: List[int] = []
        self._sample_interval_ms: int = 80
        self._last_sample_time: int = 0
        self._catch_position: float = 0.0
        self._finish_position: float = 0.0
        self._max_trunk_forward: float = 0.0
        self._min_trunk_angle: float = 0.0
        self._max_lateral: float = 0.0
        self._balance_lr_sum: float = 0.0
        self._balance_fb_sum: float = 0.0
        self._balance_samples: int = 0

        # Persistent asymmetry bias
        bias_range = config.symmetry_variability
        self._dominant_side_bias: float = random.choice([-1, 1]) * random.uniform(
            bias_range * 0.3, bias_range * 0.7
        )
        # Drift patterns
        self._symmetry_drift: float = 0.0
        self._balance_drift_lr: float = 0.0
        self._balance_drift_fb: float = 0.0
        self._lateral_drift: float = 0.0

        # Per-stroke cached values (to prevent random fluctuation within a stroke)
        self._current_stroke_power: float = 0.0
        self._current_stroke_lr_variation: float = 0.0
        self._last_stroke_cycle: int = -1  # Track which stroke cycle we're in

    def start(self) -> None:
        """Start the generator (reset timers)."""
        self._start_time = int(time.time() * 1000)
        self._stroke_count = 0
        self._force_phase = "recovery"
        self._was_in_drive = False
        self._last_position = 0.0

        # Reset stroke tracking
        self._reset_stroke_tracking()

        # Reset drifts
        drift_range = self.config.symmetry_variability * 30
        self._symmetry_drift = random.uniform(-drift_range, drift_range)
        bal_range = self.config.balance_variability * 0.5
        self._balance_drift_lr = random.uniform(-bal_range, bal_range)
        self._balance_drift_fb = random.uniform(-bal_range * 0.5, bal_range * 0.5)
        self._lateral_drift = random.uniform(-1, 1)

    def _reset_stroke_tracking(self) -> None:
        """Reset per-stroke tracking variables."""
        self._peak_force_left = 0.0
        self._peak_force_right = 0.0
        self._peak_foot_force_left = 0.0
        self._peak_foot_force_right = 0.0
        self._time_to_peak = 0.0
        self._force_samples = []
        self._last_sample_time = 0
        self._catch_position = 0.0
        self._finish_position = 0.0
        self._max_trunk_forward = 0.0
        self._min_trunk_angle = 0.0
        self._max_lateral = 0.0
        self._balance_lr_sum = 0.0
        self._balance_fb_sum = 0.0
        self._balance_samples = 0

    def _clamp(self, value: float, min_val: float, max_val: float) -> float:
        return max(min_val, min(max_val, value))

    def _random_variation(self, base: float, variation: float) -> float:
        return base + random.uniform(-variation, variation)

    def _calculate_fatigue(self, elapsed_seconds: float) -> float:
        progress = elapsed_seconds / self.config.fatigue_onset_seconds
        return min(self.config.fatigue_rate, progress * self.config.fatigue_rate)

    def _generate_force_curve(self, peak_force: float) -> List[int]:
        """Generate a realistic force curve (10 samples)."""
        # Bell curve shape for rowing force profile
        curve = []
        for i in range(10):
            # Peak around 35-40% through the drive
            t = i / 9.0
            # Asymmetric bell curve
            if t < 0.35:
                f = peak_force * (t / 0.35) ** 1.5
            else:
                f = peak_force * ((1 - t) / 0.65) ** 1.2
            curve.append(int(f + random.uniform(-10, 10)))
        return curve

    def generate_realtime_packet(self) -> RealtimePacket:
        """Generate a single realtime packet."""
        current_time = int(time.time() * 1000)
        elapsed_seconds = (current_time - self._start_time) / 1000.0

        # Calculate fatigue effect
        fatigue = self._calculate_fatigue(elapsed_seconds)

        # Calculate stroke rate (stable per session, small drift over time)
        stroke_rate = self._clamp(
            self.config.base_stroke_rate * (1 - fatigue * 0.3),
            self.config.stroke_rate_min,
            self.config.stroke_rate_max,
        )

        # Stroke timing
        stroke_period = 60.0 / stroke_rate
        drive_time = self.config.base_drive_time  # Consistent drive time
        drive_ratio = drive_time / stroke_period

        # Calculate stroke phase (0-1 cycle)
        stroke_phase = (elapsed_seconds * stroke_rate / 60) % 1.0

        # Determine which stroke cycle we're in (integer count of completed cycles)
        current_stroke_cycle = int(elapsed_seconds * stroke_rate / 60)

        # Cache random values per stroke cycle to prevent force oscillation
        if current_stroke_cycle != self._last_stroke_cycle:
            self._last_stroke_cycle = current_stroke_cycle
            # Generate new random values for this stroke
            self._current_stroke_power = self._clamp(
                self.config.base_power
                * (1 - fatigue)
                * (1 + self._random_variation(0, self.config.power_variability)),
                self.config.power_min,
                self.config.power_max,
            )
            self._current_stroke_lr_variation = self._random_variation(
                0, self.config.symmetry_variability * 0.3
            )

        # Handle position: 0 at catch, 1 at finish
        # Position-based phase (for animation, not for phase detection)
        # Drive phase: 0 to drive_ratio, position goes 0 -> 1
        # Recovery phase: drive_ratio to 1, position goes 1 -> 0
        if stroke_phase < drive_ratio:
            # Drive phase
            phase_progress = stroke_phase / drive_ratio
            position = phase_progress
            position_phase = "drive"
        else:
            # Recovery phase
            phase_progress = (stroke_phase - drive_ratio) / (1 - drive_ratio)
            position = 1 - phase_progress
            position_phase = "recovery"

        position = self._clamp(position, 0.0, 1.0)

        # Handle velocity (derivative of position, roughly)
        delta_time = self.config.update_interval_ms / 1000.0
        velocity = abs(position - self._last_position) / delta_time
        velocity = self._clamp(velocity * 2.0, 0.0, 4.0)  # Scale to m/s range
        self._last_position = position

        # Update drifts slowly
        sym_drift_rate = self.config.symmetry_variability * 5
        self._symmetry_drift += random.uniform(-sym_drift_rate, sym_drift_rate)
        max_sym_drift = self.config.symmetry_variability * 100
        self._symmetry_drift = self._clamp(
            self._symmetry_drift, -max_sym_drift, max_sym_drift
        )

        bal_drift_rate = self.config.balance_variability * 0.1
        self._balance_drift_lr += random.uniform(-bal_drift_rate, bal_drift_rate)
        self._balance_drift_lr = self._clamp(
            self._balance_drift_lr,
            -self.config.balance_variability,
            self.config.balance_variability,
        )

        self._balance_drift_fb += random.uniform(
            -bal_drift_rate * 0.5, bal_drift_rate * 0.5
        )
        self._balance_drift_fb = self._clamp(
            self._balance_drift_fb,
            -self.config.balance_variability * 0.7,
            self.config.balance_variability * 0.7,
        )

        self._lateral_drift += random.uniform(-0.1, 0.1)
        self._lateral_drift = self._clamp(self._lateral_drift, -5, 5)

        # Use cached per-stroke power for consistent force within a stroke
        power = self._current_stroke_power if self._current_stroke_power > 0 else self.config.base_power

        # Calculate force based on position phase and power
        if position_phase == "drive":
            # Force follows a smooth curve during drive
            drive_progress = stroke_phase / drive_ratio
            # Peak force around 50% through drive using smooth sine curve
            force_multiplier = math.sin(drive_progress * math.pi) ** 0.8
            base_force = power * 1.8 * force_multiplier
        else:
            # Minimal force during recovery (consistent low force)
            base_force = 10.0  # Fixed low value instead of random to prevent threshold crossings

        # Split force between left and right with asymmetry (using cached per-stroke variation)
        lr_ratio = 0.5 + self._dominant_side_bias + self._current_stroke_lr_variation
        lr_ratio = self._clamp(lr_ratio, 0.30, 0.70)

        force_left = self._clamp(base_force * lr_ratio, 0, 500)
        force_right = self._clamp(base_force * (1 - lr_ratio), 0, 500)

        # Determine force-based phase with hysteresis (ESP32 spec: ph = force > threshold ? "drive" : "recovery")
        total_force = force_left + force_right
        # Use hysteresis to prevent jitter at threshold boundary
        if self._force_phase == "drive":
            force_phase = "drive" if total_force > self.FORCE_THRESHOLD_EXIT else "recovery"
        else:
            force_phase = "drive" if total_force > self.FORCE_THRESHOLD_ENTER else "recovery"

        # Foot forces (during drive, feet push against stretcher)
        # Use force_phase to align foot force with handle force and peak tracking
        foot_force_left = None
        foot_force_right = None
        if self.enable_foot_force:
            if force_phase == "drive":
                # Foot force is roughly proportional to handle force
                foot_base = total_force * 0.8
                # Slight asymmetry in foot force too
                foot_lr_ratio = 0.5 + self._dominant_side_bias * 0.5 + random.uniform(-0.05, 0.05)
                foot_lr_ratio = self._clamp(foot_lr_ratio, 0.35, 0.65)
                foot_force_left = self._clamp(foot_base * foot_lr_ratio, 0, 400)
                foot_force_right = self._clamp(foot_base * (1 - foot_lr_ratio), 0, 400)
            else:
                # Consistent low foot force during recovery
                foot_force_left = 8.0
                foot_force_right = 8.0

        # Seat balance
        # L/R: long-term drift + dominant side bias + noise + fatigue lean
        bal_var = self.config.balance_variability
        dominant_lean = self._dominant_side_bias * bal_var * 2.0  # bias pushes weight to dominant side
        seat_lr = self._clamp(
            50
            + self._balance_drift_lr
            + dominant_lean
            + self._random_variation(0, bal_var * 0.3)
            + fatigue * bal_var * 0.5,
            50 - bal_var * 1.5,
            50 + bal_var * 1.5,
        )
        # F/B: trunk angle drives front/back weight shift each stroke
        # At catch (forward lean) -> weight forward; at finish (back lean) -> weight back
        trunk_fb_effect = 0.0
        if position_phase == "drive":
            drive_progress = stroke_phase / drive_ratio
            # 0 = catch (forward, seat front heavy), 1 = finish (back, seat rear heavy)
            trunk_fb_effect = (drive_progress - 0.5) * bal_var * 1.2
        else:
            recovery_progress = (stroke_phase - drive_ratio) / max(1 - drive_ratio, 0.01)
            trunk_fb_effect = (0.5 - recovery_progress) * bal_var * 0.8
        seat_fb = self._clamp(
            50
            + self._balance_drift_fb
            + trunk_fb_effect
            + self._random_variation(0, bal_var * 0.2),
            50 - bal_var * 1.2,
            50 + bal_var * 1.2,
        )

        # Trunk angles depend on position phase
        if position_phase == "drive":
            # Start forward (catch), move back during drive
            drive_progress = stroke_phase / drive_ratio
            trunk_angle = self._random_variation(25 - 35 * drive_progress, 3)
        else:
            # Recovery: move forward again
            recovery_progress = (stroke_phase - drive_ratio) / (1 - drive_ratio)
            trunk_angle = self._random_variation(-10 + 35 * recovery_progress, 3)

        trunk_angle = self._clamp(trunk_angle, -45, 45)
        lateral_angle = self._lateral_drift + self._random_variation(0, 2)
        lateral_angle = self._clamp(lateral_angle, -30, 30)

        # Track stroke metrics during force-based drive phase
        if force_phase == "drive":
            if force_left > self._peak_force_left:
                self._peak_force_left = force_left
            if force_right > self._peak_force_right:
                self._peak_force_right = force_right
            if foot_force_left and foot_force_left > self._peak_foot_force_left:
                self._peak_foot_force_left = foot_force_left
            if foot_force_right and foot_force_right > self._peak_foot_force_right:
                self._peak_foot_force_right = foot_force_right
            if trunk_angle > self._max_trunk_forward:
                self._max_trunk_forward = trunk_angle
            if trunk_angle < self._min_trunk_angle:
                self._min_trunk_angle = trunk_angle
            if abs(lateral_angle) > self._max_lateral:
                self._max_lateral = abs(lateral_angle)

        # Accumulate balance during drive
        if force_phase == "drive":
            self._balance_lr_sum += seat_lr
            self._balance_fb_sum += seat_fb
            self._balance_samples += 1

        # Update force-based phase state
        self._force_phase = force_phase

        return RealtimePacket(
            ts=current_time,
            p=position,
            v=velocity,
            fl=force_left,
            fr=force_right,
            slr=seat_lr,
            sfb=seat_fb,
            ta=trunk_angle,
            la=lateral_angle,
            ph=force_phase,  # Use force-based phase per ESP32 spec
            ffl=foot_force_left,
            ffr=foot_force_right,
        )

    def check_stroke_complete(self, current_packet: RealtimePacket) -> Optional[StrokePacket]:
        """Check if a stroke just completed and return stroke packet if so.

        Per ESP32 spec: stroke packet is sent when recovery phase begins (after drive ends).
        """
        total_force = current_packet.fl + current_packet.fr

        # Use hysteresis to prevent jitter at threshold boundary
        if self._was_in_drive:
            # Currently in drive - need force to drop below exit threshold to leave
            in_drive = total_force > self.FORCE_THRESHOLD_EXIT
        else:
            # Currently in recovery - need force to exceed enter threshold to start drive
            in_drive = total_force > self.FORCE_THRESHOLD_ENTER

        stroke_result = None

        # Detect transition from drive to recovery (stroke completion)
        if self._was_in_drive and not in_drive:
            drive_duration = (self._drive_end_time - self._drive_start_time) / 1000.0 if self._drive_start_time > 0 else 0
            time_since_last_stroke = current_packet.ts - self._last_stroke_time if self._last_stroke_time > 0 else float('inf')

            # Check if this is a valid stroke:
            # 1. Drive duration is reasonable (0.3-2.0 seconds)
            # 2. Enough time has passed since last stroke (minimum interval)
            is_valid_duration = 0.3 <= drive_duration < 2.0
            is_valid_interval = time_since_last_stroke >= self.MIN_STROKE_INTERVAL_MS


            if is_valid_duration and is_valid_interval and self._drive_start_time > 0:
                self._stroke_count += 1
                self._last_stroke_time = current_packet.ts

                avg_lr = (
                    self._balance_lr_sum / self._balance_samples
                    if self._balance_samples > 0
                    else 50.0
                )
                avg_fb = (
                    self._balance_fb_sum / self._balance_samples
                    if self._balance_samples > 0
                    else 50.0
                )

                # Generate force curve if not enough samples
                force_curve = self._force_samples[:10]
                while len(force_curve) < 10:
                    force_curve.append(0)

                # Calculate estimated recovery time based on stroke rate
                estimated_recovery = max(0.8, (60.0 / self.config.base_stroke_rate) - drive_duration)

                stroke_result = StrokePacket(
                    ts=current_packet.ts,
                    n=self._stroke_count,
                    t_d=drive_duration,
                    t_r=estimated_recovery,
                    f_l=self._peak_force_left,
                    f_r=self._peak_force_right,
                    f_tp=self._time_to_peak,
                    f_c=force_curve,
                    p_c=self._catch_position,
                    p_f=self._finish_position,
                    s_lr=avg_lr,
                    s_fb=avg_fb,
                    i_mt=self._max_trunk_forward,
                    i_nt=self._min_trunk_angle,
                    i_ml=self._max_lateral,
                    ff_l=self._peak_foot_force_left if self.enable_foot_force else None,
                    ff_r=self._peak_foot_force_right if self.enable_foot_force else None,
                )

            # Reset for next stroke
            self._reset_stroke_tracking()
            self._recovery_start_time = current_packet.ts

        # Detect new drive starting - just track the start time
        if in_drive and not self._was_in_drive:
            self._drive_start_time = current_packet.ts
            self._catch_position = current_packet.p

        # Track during drive
        if in_drive:
            if total_force > self._peak_force_left + self._peak_force_right:
                self._time_to_peak = (current_packet.ts - self._drive_start_time) / 1000.0
                self._peak_force_left = current_packet.fl
                self._peak_force_right = current_packet.fr

            # Sample force curve
            if (
                len(self._force_samples) < 10
                and current_packet.ts - self._last_sample_time > self._sample_interval_ms
            ):
                self._force_samples.append(int(total_force))
                self._last_sample_time = current_packet.ts

            self._finish_position = current_packet.p
            self._drive_end_time = current_packet.ts

        # Update phase state
        self._was_in_drive = in_drive

        return stroke_result

    def generate_packets(self, realtime_hz: int = 30) -> Iterator[dict]:
        """Generate a continuous stream of packets at specified rate."""
        self.start()
        interval = 1.0 / realtime_hz

        while True:
            packet = self.generate_realtime_packet()
            yield packet.to_dict()

            # Check for stroke completion
            stroke = self.check_stroke_complete(packet)
            if stroke:
                yield stroke.to_dict()

            time.sleep(interval)
