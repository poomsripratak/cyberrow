import { useEffect, useCallback } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import type { MetricsUpdate, Command, Session, RealtimeUpdate, ModeUpdateData, SessionStatusData, UpdateData } from '../types/metrics';
import type { ModeConfig, ModeState, CoachingCue } from '../types/modes';

export function useMetrics() {
  const {
    status,
    sessionData,
    currentMetrics,
    strokeAnalysis,
    modeConfig,
    modeState,
    coachingCues,
    showModeSelector,
    realtimeData,
    sessions,
    selectedSessionIndex,
    setStatus,
    updateMetrics,
    updateSessionTiming,
    setModeConfig,
    setModeState,
    addCoachingCue,
    dismissCoachingCue,
    setShowModeSelector,
    setRealtimeData,
    setSessions,
    selectSession,
    resetLiveMetrics,
  } = useSessionStore();

  const loadHistory = useCallback(async () => {
    if (!window.cyberRow) return;

    try {
      const response = await window.cyberRow.getHistory();
      if (response && typeof response === 'object' && 'sessions' in response) {
        setSessions((response as { sessions: Session[] }).sessions || []);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to load history:', error);
    }
  }, [setSessions]);

  useEffect(() => {
    if (!window.cyberRow) {
      if (import.meta.env.DEV) console.warn('cyberRow API not available - running outside Electron');
      return;
    }

    const unsubscribe = window.cyberRow.onMetricsUpdate((data: UpdateData) => {
      const msgType = data.type;

      if (msgType === 'metrics_update') {
        const metricsData = data as MetricsUpdate;
        updateMetrics(metricsData);

        const fullData = data as MetricsUpdate & { mode?: ModeState; technique_update?: { cues: CoachingCue[] } };
        if (fullData.mode) {
          setModeState(fullData.mode);
        }
        if (fullData.technique_update?.cues) {
          fullData.technique_update.cues.forEach(cue => addCoachingCue(cue));
        }
      }
      else if (msgType === 'realtime_update') {
        const rt = data as RealtimeUpdate;

        setRealtimeData(rt);

        if (rt.session && typeof rt.session.elapsed_time === 'number') {
          updateSessionTiming(rt.session.elapsed_time, rt.session.distance, rt.session.calories, rt.session.stroke_count);
        }

        const rtFull = data as RealtimeUpdate & { mode?: ModeState };
        if (rtFull.mode) {
          setModeState(rtFull.mode);
        }
      }
      else if (msgType === 'mode_update') {
        const modeData = data as ModeUpdateData;
        setModeState(modeData.mode_state);
        if (modeData.coaching_cue) {
          addCoachingCue(modeData.coaching_cue);
        }
      }
      else if (msgType === 'session_status') {
        const statusData = data as SessionStatusData & { mode?: ModeState };
        if (statusData.status === 'started') {
          setStatus('running');
          if (statusData.mode) {
            setModeState(statusData.mode);
          }
        } else if (statusData.status === 'paused') {
          setStatus('paused');
        } else if (statusData.status === 'resumed') {
          setStatus('running');
        } else if (statusData.status === 'stopped') {
          setStatus('idle');
          resetLiveMetrics();
          setModeConfig(null);
          loadHistory();
        }
      }
    });

    return unsubscribe;
  }, [updateMetrics, updateSessionTiming, setStatus, resetLiveMetrics, setModeState, setRealtimeData, addCoachingCue, setModeConfig, loadHistory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sendCommand = useCallback(async (action: Command['action'], extra?: Partial<Command>) => {
    if (!window.cyberRow) {
      if (import.meta.env.DEV) console.warn('cyberRow API not available');
      return null;
    }

    const command: Command = { type: 'command', action, ...extra };
    return await window.cyberRow.sendCommand(command);
  }, []);

  const setMode = useCallback(async (config: ModeConfig) => {
    const response = await sendCommand('set_mode', { mode_config: config });
    if (response && response.status === 'ok') {
      setModeConfig(config);
      return true;
    }
    if (import.meta.env.DEV) console.error('Failed to set mode:', response);
    return false;
  }, [sendCommand, setModeConfig]);

  const openModeSelector = useCallback(() => {
    setShowModeSelector(true);
  }, [setShowModeSelector]);

  const closeModeSelector = useCallback(() => {
    setShowModeSelector(false);
  }, [setShowModeSelector]);

  const startSession = useCallback(async () => {
    resetLiveMetrics();
    await sendCommand('start_session');
    setStatus('running');
    setShowModeSelector(false);
  }, [sendCommand, setStatus, setShowModeSelector, resetLiveMetrics]);

  const startWithMode = useCallback(async (config: ModeConfig) => {
    const success = await setMode(config);
    if (success) {
      await startSession();
    }
    return success;
  }, [setMode, startSession]);

  const pauseSession = useCallback(async () => {
    await sendCommand('pause_session');
    // Status update handled by session_status message from backend PUB socket
    // No direct setStatus here to avoid double-update race with the message handler
  }, [sendCommand]);

  const stopSession = useCallback(async () => {
    await sendCommand('stop_session');
    setStatus('idle');
    resetLiveMetrics();
    setModeConfig(null);
    loadHistory();
  }, [sendCommand, setStatus, resetLiveMetrics, setModeConfig, loadHistory]);

  const deleteSessions = useCallback(async (ids: number[]) => {
    if (!window.cyberRow) return false;
    try {
      await window.cyberRow.sendCommand({ type: 'command', action: 'delete_sessions', ids });
      await loadHistory();
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to delete sessions:', error);
      return false;
    }
  }, [loadHistory]);

  return {
    // State
    status,
    sessionData,
    currentMetrics,
    strokeAnalysis,
    modeConfig,
    modeState,
    coachingCues,
    showModeSelector,
    realtimeData,
    sessions,
    selectedSessionIndex,

    // Actions
    setMode,
    openModeSelector,
    closeModeSelector,
    startSession,
    startWithMode,
    pauseSession,
    stopSession,
    dismissCoachingCue,
    selectSession,
    loadHistory,
    deleteSessions,
  };
}
