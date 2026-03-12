// Session mode types

export type SessionMode =
  | 'free_row'
  | 'distance'
  | 'time'
  | 'calories'
  | 'intervals'
  | 'race'
  | 'game'
  | 'technique';

export interface ModeConfig {
  mode: SessionMode;
  // Distance mode
  distance?: number;
  // Time mode
  time?: number;
  // Calories mode
  calories?: number;
  // Interval mode
  work_duration?: number;
  rest_duration?: number;
  rounds?: number;
  // Race mode
  target_split?: number;
  // Technique mode
  focus_metrics?: string[];
  coaching_enabled?: boolean;
}

export interface IntervalState {
  work_duration: number;
  rest_duration: number;
  rounds: number;
  current_round: number;
  is_work_phase: boolean;
  phase_time_remaining: number;
}

export interface RaceState {
  target_split: number;
  distance: number;
  pace_boat_distance: number;
  user_lead: number;
}

export interface GameState {
  score: number;
  coins_collected: number;
  obstacles_dodged: number;
  lane_position: number;
  river_speed: number;
}

export interface TechniqueState {
  focus_metrics: string[];
  coaching_enabled: boolean;
}

export interface ModeState {
  mode: SessionMode;
  target_distance: number;
  target_time: number;
  target_calories: number;
  progress_percent: number;
  time_remaining: number;
  distance_remaining: number;
  calories_remaining: number;
  is_complete: boolean;
  interval?: IntervalState;
  race?: RaceState;
  game?: GameState;
  technique?: TechniqueState;
}

export interface CoachingCue {
  type: 'symmetry' | 'smoothness' | 'posture' | 'balance';
  message: string;
}

export interface ModeInfo {
  id: SessionMode;
  name: string;
  description: string;
  icon: string;
  category: 'training' | 'competition' | 'fun';
  hasConfig: boolean;
  hidden?: boolean;
}

export const MODE_LIST: ModeInfo[] = [
  // Training
  {
    id: 'free_row',
    name: 'Free Row',
    description: 'No goal, just row',
    icon: '◈',
    category: 'training',
    hasConfig: false,
  },
  {
    id: 'distance',
    name: 'Distance',
    description: 'Row to a target distance',
    icon: '↔',
    category: 'training',
    hasConfig: true,
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Row for a set duration',
    icon: '◷',
    category: 'training',
    hasConfig: true,
  },
  {
    id: 'calories',
    name: 'Calories',
    description: 'Burn target calories',
    icon: '△',
    category: 'training',
    hasConfig: true,
  },
  {
    id: 'intervals',
    name: 'Intervals',
    description: 'Work/rest interval training',
    icon: '⋮',
    category: 'training',
    hasConfig: true,
  },
  // Competition
  {
    id: 'race',
    name: 'Race',
    description: 'Race against a pace boat',
    icon: '⚑',
    category: 'competition',
    hasConfig: true,
  },
  // Fun
  {
    id: 'game',
    name: 'Spirit River',
    description: 'Play a game while you row',
    icon: '▶',
    category: 'fun',
    hasConfig: false,
  },
  {
    id: 'technique',
    name: 'Technique',
    description: 'Focus on form with coaching',
    icon: '●',
    category: 'fun',
    hasConfig: true,
    hidden: true,
  },
];

// Preset values for mode configuration
export const DISTANCE_PRESETS = [500, 1000, 2000, 5000, 10000];
export const TIME_PRESETS = [5, 10, 15, 20, 30, 45, 60]; // minutes
export const CALORIE_PRESETS = [100, 200, 300, 500, 750, 1000];
export const SPLIT_PRESETS = [
  { label: '1:45', value: 105 },
  { label: '1:50', value: 110 },
  { label: '1:55', value: 115 },
  { label: '2:00', value: 120 },
  { label: '2:05', value: 125 },
  { label: '2:10', value: 130 },
  { label: '2:15', value: 135 },
  { label: '2:20', value: 140 },
  { label: '2:30', value: 150 },
];
