"""Demo generator with scripted phases for video recording."""

import math
import random
import time
from dataclasses import dataclass
from typing import List, Iterator

from .config import SimulatorConfig
from .generator import PacketGenerator


@dataclass
class Phase:
    """A scripted rowing phase."""
    name: str
    duration: float       # seconds
    power: float          # target watts
    stroke_rate: float    # target spm
    balance_drift: float  # seat wobble intensity (0-15)
    symmetry_var: float   # L/R asymmetry (0-0.3)


DEMO_PHASES: List[Phase] = [
    Phase("warm_up",      2,   100, 18, 6,  0.12),
    Phase("building",     2,   220, 26, 5,  0.08),
    Phase("push",         2,   350, 34, 9,  0.12),
    Phase("ease",         1.5, 150, 20, 7,  0.10),
    Phase("sprint",       2,   420, 36, 13, 0.20),
    Phase("drop",         1.5,  80, 16, 10, 0.15),
    Phase("surge",        2,   300, 30, 6,  0.08),
    Phase("max",          1.5, 450, 38, 14, 0.22),
    Phase("recover",      2,   120, 18, 8,  0.12),
    Phase("steady",       2,   250, 28, 5,  0.07),
    Phase("burst",        1.5, 400, 36, 11, 0.16),
    Phase("cool",         2,    60, 14, 7,  0.10),
]


class DemoGenerator:
    """Wraps PacketGenerator with time-varying parameters for demo videos."""

    def __init__(self, phases: List[Phase] | None = None, enable_foot_force: bool = True):
        self.phases = phases or DEMO_PHASES
        self.enable_foot_force = enable_foot_force
        self._total_duration = sum(p.duration for p in self.phases)
        self._config = SimulatorConfig(
            base_stroke_rate=self.phases[0].stroke_rate,
            base_power=self.phases[0].power,
            power_variability=0.12,
            symmetry_variability=self.phases[0].symmetry_var,
            balance_variability=self.phases[0].balance_drift,
        )
        self._gen = PacketGenerator(self._config, enable_foot_force=enable_foot_force)
        self._start_time: float = 0

    def start(self) -> None:
        self._start_time = time.time()
        self._gen.start()

    def _get_phase_and_progress(self, elapsed: float) -> tuple[Phase, Phase, float]:
        """Get current and next phase, plus interpolation factor."""
        looped = elapsed % self._total_duration
        accumulated = 0.0
        for i, phase in enumerate(self.phases):
            if accumulated + phase.duration > looped:
                progress = (looped - accumulated) / phase.duration
                next_phase = self.phases[(i + 1) % len(self.phases)]
                return phase, next_phase, progress
            accumulated += phase.duration
        return self.phases[-1], self.phases[0], 1.0

    def _lerp(self, a: float, b: float, t: float) -> float:
        """Smooth interpolation using ease-in-out."""
        t = t * t * (3 - 2 * t)  # smoothstep
        return a + (b - a) * t

    def _update_config(self, elapsed: float) -> str:
        """Update generator config based on current phase."""
        current, next_phase, progress = self._get_phase_and_progress(elapsed)

        # Smoothly interpolate between phases
        power = self._lerp(current.power, next_phase.power, progress)
        spm = self._lerp(current.stroke_rate, next_phase.stroke_rate, progress)
        bal = self._lerp(current.balance_drift, next_phase.balance_drift, progress)
        sym = self._lerp(current.symmetry_var, next_phase.symmetry_var, progress)

        # Constant visible wobble
        power += math.sin(elapsed * 1.5) * 60 + math.sin(elapsed * 3.2) * 35
        spm += math.sin(elapsed * 1.1) * 3.5 + math.sin(elapsed * 2.4) * 2
        bal += math.sin(elapsed * 0.9) * 5 + math.sin(elapsed * 2.0) * 3

        self._config.base_power = max(60, power)
        self._config.base_stroke_rate = max(16, min(36, spm))
        self._config.balance_variability = max(2, bal)
        self._config.symmetry_variability = max(0.03, sym)

        return current.name

    def generate_packets(self, realtime_hz: int = 30) -> Iterator[dict]:
        """Generate demo packet stream."""
        self.start()
        interval = 1.0 / realtime_hz
        last_phase_log = ""

        while True:
            elapsed = time.time() - self._start_time
            phase_name = self._update_config(elapsed)

            if phase_name != last_phase_log:
                print(f"[demo] phase: {phase_name} "
                      f"(power={self._config.base_power:.0f}W, "
                      f"spm={self._config.base_stroke_rate:.0f})")
                last_phase_log = phase_name

            packet = self._gen.generate_realtime_packet()
            yield packet.to_dict()

            stroke = self._gen.check_stroke_complete(packet)
            if stroke:
                yield stroke.to_dict()

            time.sleep(interval)
