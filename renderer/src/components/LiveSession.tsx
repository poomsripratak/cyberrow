import { useState, useEffect, useCallback, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import { useSessionStore } from '../stores/sessionStore';
import { formatTime, formatSplit } from '../utils/format';
import FormIndicator from './FormIndicator';
import ModeSelector from './ModeSelector';
import ModeDisplay, {
  CompletionOverlay,
  GoalTrack,
  GoalInfo,
  IntervalInfo,
  RaceInfo,
  getTrackProps,
} from './ModeDisplay';
import RiverGame from './RiverGame';
import type { ModeConfig, GameState } from '../types/modes';


export default function LiveSession() {
  const {
    status,
    currentMetrics,
    strokeAnalysis,
    modeConfig,
    modeState,
    coachingCues,
    showModeSelector,
    openModeSelector,
    closeModeSelector,
    startWithMode,
    pauseSession,
    stopSession,
    selectSession,
    sessions,
  } = useMetrics();

  const { setActiveView } = useSessionStore();

  const sessionData = useSessionStore((state) => state.sessionData);
  const realtimeData = useSessionStore((state) => state.realtimeData);
  const storeStatus = useSessionStore((state) => state.status);
  const currentStatus = storeStatus || status;

  const [showCompletion, setShowCompletion] = useState(false);
  const [hasShownCompletion, setHasShownCompletion] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const isStartingRef = useRef(false);
  const [sessionJustEnded, setSessionJustEnded] = useState(false);
  const [endedStats, setEndedStats] = useState<{
    time: number; distance: number; calories: number;
    avgPower: number; avgSplit: number; strokes: number;
  } | null>(null);


  useEffect(() => {
    if (modeState?.is_complete && (status === 'running' || status === 'paused') && !hasShownCompletion) {
      setShowCompletion(true);
      setHasShownCompletion(true);
    }
  }, [modeState?.is_complete, status, hasShownCompletion]);

  useEffect(() => {
    if (status === 'running' && !modeState?.is_complete) {
      setHasShownCompletion(false);
    }
  }, [status, modeState?.is_complete]);

  const handleGameCollision = useCallback((type: 'coin' | 'rock' | 'log' | 'boost') => {
    window.cyberRow?.sendCommand({ type: 'command', action: 'game_collision', collision_type: type });
  }, []);

  const handleModeSelect = async (config: ModeConfig) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      await startWithMode(config);
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleContinueAfterCompletion = () => {
    setShowCompletion(false);
  };

  const handleStopAfterCompletion = async () => {
    setShowCompletion(false);
    await stopSession();
    selectSession(0);
    setActiveView('dashboard');
  };

  const wasRunningRef = useRef(false);

  const handleRequestStop = () => {
    wasRunningRef.current = currentStatus === 'running';
    if (wasRunningRef.current) {
      pauseSession();
    }
    setShowStopConfirm(true);
  };

  const handleConfirmStop = async () => {
    setShowStopConfirm(false);
    setEndedStats({
      time: elapsedTime, distance, calories,
      avgPower: currentMetrics?.power ?? power, avgSplit: split500m ?? 0,
      strokes: sessionData?.stroke_count ?? 0,
    });
    await stopSession();
    setSessionJustEnded(true);
  };

  const handleCancelStop = () => {
    setShowStopConfirm(false);
    if (wasRunningRef.current) {
      pauseSession();
    }
  };

  const handleViewReport = () => {
    setSessionJustEnded(false);
    setEndedStats(null);
    if (sessions.length > 0) {
      selectSession(0);
    }
    setActiveView('dashboard');
  };

  const handleDismissEndScreen = () => {
    setSessionJustEnded(false);
    setEndedStats(null);
    setActiveView('history');
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showCompletion) { handleContinueAfterCompletion(); return; }
      if (showStopConfirm) { handleCancelStop(); return; }
      if (sessionJustEnded && endedStats) { handleDismissEndScreen(); return; }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showCompletion, showStopConfirm, sessionJustEnded, endedStats]);

  const isActive = currentStatus === 'running';
  const isPaused = currentStatus === 'paused';
  const isGameMode = modeConfig?.mode === 'game' && isActive;

  const elapsedTime = sessionData?.elapsed_time ?? 0;
  const distance = sessionData?.distance ?? 0;
  const calories = sessionData?.calories ?? 0;

  const strokeRate = realtimeData?.session?.stroke_rate ?? currentMetrics?.stroke_rate ?? 0;
  const power = realtimeData?.instant_power ?? currentMetrics?.power ?? 0;
  const split500m = realtimeData?.session?.split_500m ?? currentMetrics?.split_500m ?? null;

  const statusText = (() => {
    if (!isActive) return isPaused ? 'Paused' : 'Ready to start';
    if (modeConfig?.mode && modeConfig.mode !== 'free_row') {
      return modeConfig.mode.replace('_', ' ').toUpperCase();
    }
    return 'Session in progress';
  })();

  const gameState: GameState = useMemo(
    () => modeState?.game ?? { score: 0, coins_collected: 0, obstacles_dodged: 0, lane_position: 0.5, river_speed: 1 },
    [modeState?.game]
  );

  return (
    <>
      {/* Mode Selector Modal */}
      {showModeSelector && (
        <ModeSelector
          onSelect={handleModeSelect}
          onCancel={closeModeSelector}
        />
      )}

      {/* Completion Overlay */}
      {showCompletion && modeState && (
        <CompletionOverlay
          modeState={modeState}
          sessionStats={{
            duration: elapsedTime,
            distance: distance,
            calories: calories,
            avgPower: power,
            avgSplit: split500m ?? 0,
          }}
          onContinue={handleContinueAfterCompletion}
          onStop={handleStopAfterCompletion}
        />
      )}

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <h3>End Session?</h3>
            <p>Your session data will be saved.</p>
            <div className="confirm-actions">
              <button className="btn btn-danger" onClick={handleConfirmStop}>
                End Session
              </button>
              <button className="btn btn-secondary" onClick={handleCancelStop}>
                Keep Going
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Ended Screen */}
      {sessionJustEnded && currentStatus === 'idle' && endedStats && (
        <div className="session-ended-overlay" role="dialog" aria-modal="true">
          <div className="session-ended-card">
            <div className="ended-check-icon">✓</div>
            <h2>Session Complete</h2>
            <div className="session-ended-stats">
              <div className="ended-stat">
                <span className="ended-stat-value">{formatTime(endedStats.time)}</span>
                <span className="ended-stat-label">Duration</span>
              </div>
              <div className="ended-stat">
                <span className="ended-stat-value">{Math.round(endedStats.distance)}m</span>
                <span className="ended-stat-label">Distance</span>
              </div>
              <div className="ended-stat">
                <span className="ended-stat-value">{endedStats.calories.toFixed(2)}</span>
                <span className="ended-stat-label">Calories</span>
              </div>
              <div className="ended-stat">
                <span className="ended-stat-value">{endedStats.avgPower}W</span>
                <span className="ended-stat-label">Avg Power</span>
              </div>
              {endedStats.avgSplit > 0 && (
                <div className="ended-stat">
                  <span className="ended-stat-value">{formatSplit(endedStats.avgSplit)}</span>
                  <span className="ended-stat-label">Avg Split</span>
                </div>
              )}
              <div className="ended-stat">
                <span className="ended-stat-value">{endedStats.strokes}</span>
                <span className="ended-stat-label">Strokes</span>
              </div>
            </div>
            <div className="session-ended-actions">
              <button className="btn btn-primary" onClick={handleViewReport}>
                View Report
              </button>
              <button className="btn btn-secondary" onClick={handleDismissEndScreen}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Mode View */}
      {isGameMode ? (
        <div className="game-mode-container">
          <RiverGame
            gameState={gameState}
            realtimeData={realtimeData ?? undefined}
            isActive={isActive}
            onCollision={handleGameCollision}
          />
          <div className="session-controls-center">
            <button className="btn btn-danger btn-compact" onClick={handleRequestStop}>
              End
            </button>
          </div>
        </div>
      ) : currentStatus === 'idle' ? (
        <div className="idle-state">
          <div className="idle-glow" />
          <div className="idle-content">
            <div className="idle-hero-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <path d="M8 40C8 40 16 28 32 28C48 28 56 40 56 40" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
                <path d="M12 36C12 36 20 26 32 26C44 26 52 36 52 36" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                <circle cx="32" cy="34" r="4" fill="var(--accent)" />
                <line x1="24" y1="34" x2="40" y2="34" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="idle-title">Ready to Row</h2>
            <p className="idle-subtitle">Select a training mode to begin your session</p>
            <div className="idle-actions">
              <button className="idle-start-btn" onClick={openModeSelector} disabled={isStartingRef.current}>
                <span className="idle-start-pulse" />
                Start Session
              </button>
              <button className="idle-quick-btn" onClick={() => handleModeSelect({ mode: 'free_row' })} disabled={isStartingRef.current}>
                Quick Start
              </button>
            </div>
            {sessions.length > 0 && (
              <>
                <div className="idle-stats-row">
                  <div className="idle-stat-card">
                    <span className="idle-stat-val">{sessions.length}</span>
                    <span className="idle-stat-lbl">Sessions</span>
                  </div>
                  <div className="idle-stat-card">
                    <span className="idle-stat-val">{(sessions.reduce((s, x) => s + x.distance, 0) / 1000).toFixed(1)}km</span>
                    <span className="idle-stat-lbl">Total Distance</span>
                  </div>
                  <div className="idle-stat-card">
                    <span className="idle-stat-val">{Math.round(sessions.reduce((s, x) => s + x.duration, 0) / 60)}min</span>
                    <span className="idle-stat-lbl">Total Time</span>
                  </div>
                </div>
                <div
                  className="idle-last-session"
                  role="button"
                  tabIndex={0}
                  aria-label="View last session analysis"
                  onClick={() => { selectSession(0); setActiveView('dashboard'); }}
                  onKeyDown={(e: ReactKeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSession(0); setActiveView('dashboard'); } }}
                >
                  <span className="idle-last-label">Last Session</span>
                  <span className="idle-last-detail">
                    {formatTime(sessions[0].duration)} · {Math.round(sessions[0].distance)}m · {sessions[0].metrics.avgPower}W
                  </span>
                  <span className="idle-last-arrow">→</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className={`live-active-layout ${isPaused ? 'is-paused' : ''}`}>
          {isPaused && (
            <div className="paused-badge">
              <div className="paused-badge-icon"><span /><span /></div>
              <span className="paused-badge-text">Paused</span>
            </div>
          )}
          <div
            className="session-ambient-glow"
            style={{
              opacity: isActive ? Math.min(0.25, (power / 300) * 0.25) : 0.05,
              background: `radial-gradient(ellipse at 50% 30%, ${
                power > 200 ? 'var(--accent-dim)' : 'color-mix(in srgb, var(--accent) 8%, transparent)'
              } 0%, transparent 70%)`,
            }}
          />
          {modeState?.mode === 'technique' && (
            <ModeDisplay modeState={modeState} coachingCues={coachingCues} />
          )}

          {/* Shared metrics content used by both track and free-row modes */}
          {(() => {
            const trackProps = modeState ? getTrackProps(modeState) : null;
            const isInterval = modeState?.mode === 'intervals';


            const metricsContent = (
              <>
                <div className="primary-metrics">
                  <div className="primary-metric">
                    <span className="primary-value">{formatTime(elapsedTime)}</span>
                    <span className="primary-label">Time</span>
                  </div>
                  <div className="primary-metric">
                    <span className="primary-value">{Math.round(distance)}<span className="primary-unit">m</span></span>
                    <span className="primary-label">Distance</span>
                  </div>
                </div>
                <div className="secondary-metrics">
                  <div className="secondary-metric">
                    <span className="secondary-value">{strokeRate}</span>
                    <span className="secondary-label">spm</span>
                  </div>
                  <div className="secondary-metric">
                    <span className="secondary-value">{power}</span>
                    <span className="secondary-label">watts</span>
                  </div>
                  <div className="secondary-metric">
                    <span className="secondary-value">{calories.toFixed(2)}</span>
                    <span className="secondary-label">kcal</span>
                  </div>
                  <div className="secondary-metric">
                    <span className="secondary-value">{sessionData?.stroke_count ?? 0}</span>
                    <span className="secondary-label">strokes</span>
                  </div>
                </div>
              </>
            );

            if (trackProps) {
              return (
                <GoalTrack {...trackProps}>
                  {isInterval && modeState!.interval && (
                    <IntervalInfo interval={modeState!.interval} />
                  )}
                  <div className="hero-label">500m Split</div>
                  <div className={`hero-value ${isInterval ? 'hero-value-sm' : ''}`}>
                    {formatSplit(split500m)}
                  </div>
                  {metricsContent}
                  {!isInterval && modeState?.mode !== 'race' && <GoalInfo modeState={modeState!} />}
                  {modeState?.mode === 'race' && <RaceInfo modeState={modeState!} />}
                </GoalTrack>
              );
            }

            return (
              <div className="free-row-metrics">
                <div className="hero-metric">
                  <div className="hero-label">500m Split</div>
                  <div className="hero-value">{formatSplit(split500m)}</div>
                </div>
                {metricsContent}
              </div>
            );
          })()}

          <FormIndicator
            handForceLeft={realtimeData?.force.left ?? strokeAnalysis?.peak_force_left ?? null}
            handForceRight={realtimeData?.force.right ?? strokeAnalysis?.peak_force_right ?? null}
            footForceLeft={realtimeData?.foot_force.left ?? strokeAnalysis?.peak_foot_force_left ?? null}
            footForceRight={realtimeData?.foot_force.right ?? strokeAnalysis?.peak_foot_force_right ?? null}
            trunkAngle={realtimeData?.trunk.angle ?? null}
            trunkBalance={realtimeData?.trunk != null
              ? 50 - (realtimeData.trunk.lateral / 45) * 50
              : null}
          />

          <div className="session-status-badge">
            <div className={`status-indicator ${isActive ? 'active' : ''}`} />
            <span>{statusText}</span>
          </div>

          <div className="session-controls-center">
            <button className="btn btn-secondary btn-compact" onClick={pauseSession}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button className="btn btn-danger btn-compact" onClick={handleRequestStop}>
              End
            </button>
          </div>
        </div>
      )}
    </>
  );
}
