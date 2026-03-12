export interface SessionData {
  elapsed_time: number;
  distance: number;
  calories: number;
  stroke_count?: number;
}


export interface RealtimeUpdate {
  type: 'realtime_update';
  timestamp: number;
  handle: {
    velocity: number; // m/s
  };
  force: {
    total: number; // N (calculated: left + right)
    left: number; // N
    right: number; // N
  };
  foot_force: {
    left: number; // N
    right: number; // N
  };
  seat: {
    lr: number; // %, left/right balance
    fb: number; // %, front/back balance
  };
  trunk: {
    angle: number;   // deg, forward/back
    lateral: number; // deg, side lean
  };
  phase: 'drive' | 'recovery';
  instant_power?: number; // W, calculated instantaneous power
  session: {
    elapsed_time: number;
    distance: number;
    calories?: number;
    stroke_count?: number;
    stroke_rate?: number;
    split_500m?: number;
  };
}


export interface ESP32Config {
  // Stream control
  realtime_hz: number; // 20-50 Hz
  stream_realtime: boolean; // Enable for game mode
  stream_strokes: boolean; // Enable for analytics

  // Stroke detection
  force_threshold: number; // N, force above this = drive phase
  min_stroke_time: number; // s, minimum stroke duration
  max_stroke_time: number; // s, maximum stroke duration

  // User settings (for Pi calculations)
  user_weight: number; // kg
  drag_factor: number; // 80-220

  // Sensor calibration
  calibrate_on_start: boolean;
  seat_tare_offset: number[]; // [FL, FR, BL, BR] zero offsets
  handle_tare_offset: number[]; // [Left, Right] zero offsets

  // Force curve sampling
  force_curve_samples: number; // Number of samples during drive phase
}

export interface CurrentMetrics {
  stroke_rate: number;
  power: number;
  split_500m: number;
  drive_recovery_ratio: number;
}

export interface StrokeAnalysis {
  stroke_length: number;
  peak_force: number;
  smoothness: number;
  symmetry: number;
  trunk_stability: number;
  seat_stability: number;
  // Advanced metrics
  consistency_index: number;
  time_to_peak_force: number;
  power_decline: number;
  postural_deviation: number;
  range_of_motion: number;
  load_distribution: number;
  stroke_efficiency: number;
  force_curve_type: string;
  symmetry_drift: number;
  // Seat sensor metrics
  seat_total_load: number;
  seat_left_right_balance: number;
  seat_front_back_balance: number;
  seat_center_x: number;
  seat_center_y: number;
  // Force curve for visualization
  force_curve_samples?: number[];
  // Per-side force (for directional balance)
  peak_force_left: number;
  peak_force_right: number;
  // Foot force metrics
  peak_foot_force_left: number;
  peak_foot_force_right: number;
  foot_force_symmetry: number;
}

export interface MetricsUpdate {
  type: 'metrics_update';
  timestamp: number;
  session?: SessionData;
  current?: CurrentMetrics;
  stroke_analysis?: StrokeAnalysis;
}

export interface SessionMetrics {
  avgStrokeRate: number;
  avgPower: number;
  avgSplit: number;
  peakPower: number;
  avgStrokeLength: number;
  avgDriveRecovery: number;
  avgSmoothness: number;
  avgSymmetry: number;
  avgTrunkStability: number;
  avgSeatStability: number;
  avgPeakForce: number;
  // Advanced metrics
  avgConsistencyIndex: number;
  avgTimeToPeakForce: number;
  powerDecline: number;
  avgPosturalDeviation: number;
  avgRangeOfMotion: number;
  avgLoadDistribution: number;
  avgStrokeEfficiency: number;
  forceCurveType: string;
  symmetryDrift: number;
  peakHandleForce: number;
  minTimeToPeakForce: number;
  // Seat sensor metrics
  avgSeatTotalLoad: number;
  avgSeatLeftRightBalance: number;
  avgSeatFrontBackBalance: number;
  avgSeatCenterX: number;
  avgSeatCenterY: number;
  // Foot force metrics
  avgFootForceLeft: number;
  avgFootForceRight: number;
  avgFootForceTotal: number;
  avgFootForceSymmetry: number;
  peakFootForce: number;
  // Force curve visualization
  forceCurveSamples?: number[];
}

export interface DataPoint {
  time: number;
  strokeRate: number;
  power: number;
  strokeLength: number;
  driveRecoveryRatio: number;
  peakForce: number;
  smoothness: number;
  symmetry: number;
  trunkStability: number;
  seatStability: number;
  split500m: number;
  // Advanced metrics
  consistencyIndex: number;
  timeToPeakForce: number;
  powerDecline: number;
  posturalDeviation: number;
  rangeOfMotion: number;
  loadDistribution: number;
  strokeEfficiency: number;
  forceCurveType: string;
  symmetryDrift: number;
  // Seat sensor metrics
  seatTotalLoad: number;
  seatLeftRightBalance: number;
  seatFrontBackBalance: number;
  seatCenterX: number;
  seatCenterY: number;
  // Force curve for visualization
  forceCurveSamples?: number[];
  // Foot force metrics
  peakFootForceLeft?: number;
  peakFootForceRight?: number;
  footForceTotal?: number;
  footForceSymmetry?: number;
}

export interface SeatPoint {
  t: number;   // elapsed seconds
  x: number;   // -1 to +1, positive = right
  y: number;   // -1 to +1, positive = front
}

export interface Session {
  id: number;
  date: string;
  duration: number;
  distance: number;
  calories: number;
  strokes: number;
  dataPoints: DataPoint[];
  seatPoints: SeatPoint[];
  metrics: SessionMetrics;
}

export interface Command {
  type: 'command';
  action:
    | 'start_session'
    | 'pause_session'
    | 'stop_session'
    | 'get_history'
    | 'get_config'
    | 'update_config'
    | 'enable_realtime'
    | 'set_mode'
    | 'get_mode'
    | 'game_collision'
    | 'delete_sessions';
  config?: Partial<ESP32Config>;
  enabled?: boolean;
  hz?: number;
  collision_type?: string;
  mode_config?: object;
  ids?: number[];
}

export type SessionStatus = 'idle' | 'running' | 'paused';

export interface QualityRating {
  label: string;
  className: string;
}


import type { ModeState, CoachingCue } from './modes';

export interface ModeUpdateData {
  type: 'mode_update';
  mode_state: ModeState;
  coaching_cue?: CoachingCue;
}

export interface SessionStatusData {
  type: 'session_status';
  status: 'started' | 'paused' | 'resumed' | 'stopped';
  mode_state?: ModeState;
}

export type UpdateData = MetricsUpdate | RealtimeUpdate | ModeUpdateData | SessionStatusData;
