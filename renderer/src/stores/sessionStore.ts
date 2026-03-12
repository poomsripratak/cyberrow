import { create } from 'zustand';
import type {
  Session,
  SessionStatus,
  SessionData,
  CurrentMetrics,
  StrokeAnalysis,
  MetricsUpdate,
  RealtimeUpdate,
} from '../types/metrics';
import type { ModeState, ModeConfig, CoachingCue } from '../types/modes';

interface SessionState {
  status: SessionStatus;
  sessionData: SessionData | null;
  currentMetrics: CurrentMetrics | null;
  strokeAnalysis: StrokeAnalysis | null;

  modeConfig: ModeConfig | null;
  modeState: ModeState | null;
  coachingCues: CoachingCue[];
  showModeSelector: boolean;

  realtimeData: RealtimeUpdate | null;
  sessions: Session[];
  selectedSessionIndex: number;

  activeView: 'live' | 'dashboard' | 'history';
  setStatus: (status: SessionStatus) => void;
  updateMetrics: (update: MetricsUpdate) => void;
  updateSessionTiming: (elapsed_time: number, distance: number, calories?: number, stroke_count?: number) => void;
  setModeConfig: (config: ModeConfig | null) => void;
  setModeState: (state: ModeState | null) => void;
  addCoachingCue: (cue: CoachingCue) => void;
  dismissCoachingCue: (index: number) => void;
  setShowModeSelector: (show: boolean) => void;
  setRealtimeData: (data: RealtimeUpdate | null) => void;
  setSessions: (sessions: Session[]) => void;
  selectSession: (index: number) => void;
  setActiveView: (view: 'live' | 'dashboard' | 'history') => void;
  resetLiveMetrics: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'idle',
  sessionData: null,
  currentMetrics: null,
  strokeAnalysis: null,
  modeConfig: null,
  modeState: null,
  coachingCues: [],
  showModeSelector: false,
  realtimeData: null,
  sessions: [],
  selectedSessionIndex: 0,
  activeView: 'live',

  setStatus: (status) => set({ status }),

  updateMetrics: (update) => {
    set((state) => {
      if (state.status === 'idle') return {};
      return {
        sessionData: update.session
          ? {
              elapsed_time: state.sessionData?.elapsed_time ?? update.session.elapsed_time,
              distance: state.sessionData?.distance ?? update.session.distance,
              calories: state.sessionData?.calories ?? update.session.calories,
              stroke_count: update.session.stroke_count,
            }
          : state.sessionData,
        currentMetrics: update.current ?? null,
        strokeAnalysis: update.stroke_analysis ?? null,
      };
    });
  },

  updateSessionTiming: (elapsed_time, distance, calories, stroke_count) =>
    set((state) => {
      if (state.status === 'idle') return {};
      return {
        sessionData: {
          elapsed_time,
          distance,
          calories: calories ?? state.sessionData?.calories ?? 0,
          stroke_count: stroke_count ?? state.sessionData?.stroke_count,
        },
      };
    }),

  setModeConfig: (config) => set({ modeConfig: config }),

  setModeState: (state) => set({ modeState: state }),

  addCoachingCue: (cue) =>
    set((state) => ({
      coachingCues: [...state.coachingCues.slice(-4), cue], // Keep last 5 cues
    })),

  dismissCoachingCue: (index) =>
    set((state) => ({
      coachingCues: state.coachingCues.filter((_, i) => i !== index),
    })),

  setShowModeSelector: (show) => set({ showModeSelector: show }),

  setRealtimeData: (data) => set({ realtimeData: data }),

  setSessions: (sessions) => set({ sessions }),

  selectSession: (index) => set({ selectedSessionIndex: index }),

  setActiveView: (view) => set({ activeView: view }),

  resetLiveMetrics: () =>
    set({
      sessionData: null,
      currentMetrics: null,
      strokeAnalysis: null,
      modeState: null,
      coachingCues: [],
      realtimeData: null,
    }),
}));

if (import.meta.env.DEV) {
  window.__sessionStore = useSessionStore;
}
