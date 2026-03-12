"""Configuration for the rowing simulator."""

from dataclasses import dataclass


@dataclass
class SimulatorConfig:
    """Configuration parameters for the simulator."""

    # Base values
    base_stroke_rate: float = 24.0  # strokes per minute
    base_power: float = 180.0  # watts

    # Variation ranges
    stroke_rate_min: float = 18.0
    stroke_rate_max: float = 34.0
    power_min: float = 80.0
    power_max: float = 400.0

    # Fatigue modeling
    fatigue_rate: float = 0.15  # Max fatigue factor over 1 hour
    fatigue_onset_seconds: float = 3600.0  # Time to reach max fatigue

    # Variability
    stroke_rate_variability: float = 2.0  # +/- spm
    power_variability: float = 0.05  # 5% variation

    # Stroke mechanics
    base_stroke_length: float = 1.2  # meters
    stroke_length_variability: float = 0.1
    base_drive_time: float = 0.8  # seconds
    drive_time_variability: float = 0.05

    # Technique metrics (base values)
    base_smoothness: float = 85.0
    base_symmetry: float = 92.0
    base_trunk_stability: float = 88.0
    base_seat_stability: float = 90.0

    # Asymmetry settings (higher = more asymmetric)
    symmetry_variability: float = 0.08  # Max L/R bias (0.08 = up to 8% difference)
    balance_variability: float = 5.0  # Seat balance drift range

    # Update rate
    update_interval_ms: int = 100  # 10 Hz

    # ZeroMQ address
    pub_address: str = "tcp://*:5557"


# Default configuration
DEFAULT_CONFIG = SimulatorConfig()

# Preset configurations
PRESETS = {
    "beginner": SimulatorConfig(
        base_stroke_rate=20.0,
        base_power=120.0,
        power_variability=0.10,
        base_smoothness=70.0,
        base_symmetry=75.0,
        symmetry_variability=0.20,  # Up to 20% L/R difference
        balance_variability=12.0,  # More seat wobble
    ),
    "intermediate": SimulatorConfig(
        base_stroke_rate=24.0,
        base_power=180.0,
        power_variability=0.05,
        base_smoothness=85.0,
        base_symmetry=88.0,
        symmetry_variability=0.10,  # Up to 10% L/R difference
        balance_variability=6.0,
    ),
    "advanced": SimulatorConfig(
        base_stroke_rate=28.0,
        base_power=250.0,
        power_variability=0.03,
        base_smoothness=92.0,
        base_symmetry=95.0,
        symmetry_variability=0.05,  # Up to 5% L/R difference
        balance_variability=3.0,  # Very stable
    ),
    "sprint": SimulatorConfig(
        base_stroke_rate=32.0,
        base_power=350.0,
        fatigue_rate=0.25,
        power_variability=0.08,
        symmetry_variability=0.12,  # Form breaks down at high intensity
        balance_variability=8.0,
    ),
    "endurance": SimulatorConfig(
        base_stroke_rate=22.0,
        base_power=160.0,
        fatigue_rate=0.08,
        power_variability=0.03,
        base_symmetry=90.0,
        symmetry_variability=0.06,
        balance_variability=4.0,
    ),
    "expert": SimulatorConfig(
        base_stroke_rate=30.0,
        base_power=320.0,
        power_variability=0.03,
        base_smoothness=95.0,
        base_symmetry=97.0,
        symmetry_variability=0.03,
        balance_variability=2.0,
        fatigue_rate=0.10,
    ),
}
