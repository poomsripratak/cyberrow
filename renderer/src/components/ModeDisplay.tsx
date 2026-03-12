import { useState, useEffect } from 'react';
import { ModeState, IntervalState, CoachingCue } from '../types/modes';
import { formatTime, formatSplit } from '../utils/format';
import { useSmoothCountdown } from '../hooks/useSmoothCountdown';

const TRACK_PATH =
  'M 240 10 L 350 10 A 120 120 0 0 1 470 130 A 120 120 0 0 1 350 250 L 130 250 A 120 120 0 0 1 10 130 A 120 120 0 0 1 130 10 Z';
const TRACK_LENGTH = 440 + 2 * Math.PI * 120; // ≈ 1193.98

/** Get (x,y) position at a fraction (0–1) along the track path */
function getTrackPoint(fraction: number): { x: number; y: number } {
  const f = Math.max(0, Math.min(1, fraction));
  let d = f * TRACK_LENGTH;

  // Segment 1: top straight right (240,10)→(350,10), length 110
  if (d <= 110) return { x: 240 + d, y: 10 };
  d -= 110;

  // Segment 2: right semicircle, center (350,130), r=120, from -π/2 → π/2
  const semiLen = Math.PI * 120; // ≈ 376.99
  if (d <= semiLen) {
    const a = -Math.PI / 2 + d / 120;
    return { x: 350 + 120 * Math.cos(a), y: 130 + 120 * Math.sin(a) };
  }
  d -= semiLen;

  // Segment 3: bottom straight left (350,250)→(130,250), length 220
  if (d <= 220) return { x: 350 - d, y: 250 };
  d -= 220;

  // Segment 4: left semicircle, center (130,130), r=120, from π/2 → 3π/2
  if (d <= semiLen) {
    const a = Math.PI / 2 + d / 120;
    return { x: 130 + 120 * Math.cos(a), y: 130 + 120 * Math.sin(a) };
  }
  d -= semiLen;

  // Segment 5: close — straight right (130,10)→(240,10), length 110
  return { x: 130 + Math.min(d, 110), y: 10 };
}

export interface TrackDot {
  position: number; // 0–1 fraction along the track
  color: string;
  label?: string;
}

interface GoalTrackProps {
  progress: number; // 0–100
  trackColor?: string;
  dots?: TrackDot[];
  children: React.ReactNode;
}

export function GoalTrack({
  progress,
  trackColor = 'var(--accent)',
  dots = [],
  children,
}: GoalTrackProps) {
  const offset = TRACK_LENGTH - (TRACK_LENGTH * Math.min(100, progress) / 100);

  return (
    <div className="goal-ring-wrap">
      <svg className="goal-ring-svg" viewBox="0 0 480 260">
        <path d={TRACK_PATH} className="ring-track" />
        <path
          d={TRACK_PATH}
          className="ring-progress"
          style={{
            strokeDasharray: TRACK_LENGTH,
            strokeDashoffset: offset,
            stroke: trackColor,
          }}
        />
        {dots.map((dot, i) => {
          const pt = getTrackPoint(dot.position);
          const isUser = dot.label === 'YOU';
          return (
            <g key={i}>
              {isUser && (
                <circle cx={pt.x} cy={pt.y} r="16" fill={dot.color} opacity="0.15" className="dot-pulse" />
              )}
              <circle cx={pt.x} cy={pt.y} r={isUser ? 9 : 7} fill={dot.color} opacity={isUser ? 1 : 0.7} />
            </g>
          );
        })}
      </svg>
      <div className="goal-ring-content">
        {children}
      </div>
    </div>
  );
}

/** Goal remaining text for distance/time/calories */
export function GoalInfo({ modeState }: { modeState: ModeState }) {
  switch (modeState.mode) {
    case 'distance':
      return (
        <div className="goal-ring-info">
          <span className="goal-remaining">
            {(modeState.distance_remaining / 1000).toFixed(2)}km left
          </span>
        </div>
      );
    case 'calories':
      return (
        <div className="goal-ring-info">
          <span className="goal-remaining">{modeState.calories_remaining} cal left</span>
        </div>
      );
    case 'time':
      return (
        <div className="goal-ring-info">
          <TimeCountdown remaining={modeState.time_remaining} />
        </div>
      );
    default:
      return null;
  }
}

/** Interval info block — phase label, smooth countdown, round counter + dots */
export function IntervalInfo({ interval }: { interval: IntervalState }) {
  const resetKey = `${interval.is_work_phase}-${interval.current_round}`;
  const displayTime = useSmoothCountdown(interval.phase_time_remaining, resetKey);

  const secs = Math.floor(displayTime);
  const tenths = Math.floor((displayTime % 1) * 10);

  return (
    <div className="interval-info">
      <span className={`interval-phase-big ${interval.is_work_phase ? 'work' : 'rest'}`}>
        {interval.is_work_phase ? 'WORK' : 'REST'}
      </span>
      <span className="interval-timer-big">{secs}.{tenths}s</span>
      <div className="interval-round-row">
        <span className="interval-round-label">
          R{interval.current_round}/{interval.rounds}
        </span>
        <div className="interval-dots">
          {Array.from({ length: interval.rounds }).map((_, i) => (
            <div
              key={i}
              className={`dot ${i < interval.current_round - 1 ? 'done' : ''} ${i === interval.current_round - 1 ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Race info — lead/behind + distance remaining */
export function RaceInfo({ modeState }: { modeState: ModeState }) {
  if (modeState.mode === 'race' && modeState.race) {
    return (
      <div className="race-info">
        <span className={`race-lead ${modeState.race.user_lead >= 0 ? 'ahead' : 'behind'}`}>
          {modeState.race.user_lead >= 0 ? '+' : ''}{modeState.race.user_lead.toFixed(0)}m
        </span>
        <div className="race-legend">
          <span className="race-legend-item"><span className="race-dot" style={{ background: 'var(--accent)' }} />{(modeState.distance_remaining / 1000).toFixed(2)}km left</span>
          <span className="race-legend-item"><span className="race-dot" style={{ background: 'var(--orange)' }} />{formatSplit(modeState.race.target_split)}/500m</span>
        </div>
      </div>
    );
  }

  return null;
}

/** Compute track props for any mode. Returns null for non-track modes. */
export function getTrackProps(modeState: ModeState): {
  progress: number;
  trackColor: string;
  dots: TrackDot[];
} | null {
  switch (modeState.mode) {
    case 'distance':
    case 'time':
      return { progress: modeState.progress_percent, trackColor: 'var(--accent)', dots: [] };

    case 'calories':
      return { progress: modeState.progress_percent, trackColor: 'var(--orange)', dots: [] };

    case 'intervals': {
      if (!modeState.interval) return null;
      const iv = modeState.interval;
      const dur = iv.is_work_phase ? iv.work_duration : iv.rest_duration;
      const phaseProgress = ((dur - iv.phase_time_remaining) / dur) * 100;
      return {
        progress: phaseProgress,
        trackColor: iv.is_work_phase ? 'var(--red)' : 'var(--accent)',
        dots: [],
      };
    }

    case 'race': {
      if (!modeState.race) return null;
      const r = modeState.race;
      const userDist = r.distance - modeState.distance_remaining;
      const userFrac = Math.min(1, userDist / r.distance);
      const paceFrac = Math.min(1, r.pace_boat_distance / r.distance);
      return {
        progress: userFrac * 100,
        trackColor: 'var(--accent)',
        dots: [
          { position: paceFrac, color: 'var(--orange)', label: 'PACE' },
          { position: userFrac, color: 'var(--accent)', label: 'YOU' },
        ],
      };
    }

    default:
      return null;
  }
}

interface ModeDisplayProps {
  modeState: ModeState;
  coachingCues?: CoachingCue[];
}

export default function ModeDisplay({ modeState, coachingCues = [] }: ModeDisplayProps) {
  if (modeState.mode === 'technique') {
    return (
      <>
        <div className="mode-strip technique-strip">
          <div className="strip-row">
            <div className="strip-badges">
              {modeState.technique?.focus_metrics.map(m => (
                <span key={m} className="strip-badge">{m}</span>
              ))}
            </div>
          </div>
        </div>
        {coachingCues.length > 0 && (
          <CoachingToast cue={coachingCues[coachingCues.length - 1]} />
        )}
      </>
    );
  }

  // All other modes handled by GoalTrack in LiveSession
  return null;
}

/** Smooth local countdown for time mode remaining */
export function TimeCountdown({ remaining }: { remaining: number }) {
  const display = useSmoothCountdown(remaining);

  const mins = Math.floor(display / 60);
  const secs = Math.floor(display % 60);
  const tenths = Math.floor((display % 1) * 10);

  return (
    <span className="goal-remaining">
      {mins}:{secs.toString().padStart(2, '0')}.{tenths} left
    </span>
  );
}

/** Visual coaching cue — large, glanceable while rowing */
function CoachingToast({ cue }: { cue: CoachingCue }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [cue]);

  if (!visible) return null;

  return (
    <div className={`coaching-toast cue-${cue.type}`}>
      <div className="cue-icon-area">
        <CueIcon type={cue.type} />
      </div>
      <div className="cue-body">
        <span className="cue-action">{CUE_LABELS[cue.type] ?? 'FOCUS'}</span>
        <span className="cue-detail">{cue.message}</span>
      </div>
    </div>
  );
}

const CUE_LABELS: Record<string, string> = {
  symmetry: 'EVEN PULL',
  smoothness: 'SMOOTH',
  posture: 'SIT TALL',
  balance: 'CENTER',
};

function CueIcon({ type }: { type: string }) {
  switch (type) {
    case 'symmetry':
      return (
        <svg viewBox="0 0 48 48" className="cue-svg">
          <rect x="6" y="14" width="8" height="20" rx="2" fill="currentColor" opacity="0.5" />
          <rect x="34" y="14" width="8" height="20" rx="2" fill="currentColor" />
          <path d="M18 24h12M26 20l4 4-4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case 'smoothness':
      return (
        <svg viewBox="0 0 48 48" className="cue-svg">
          <path d="M4 24c4-10 8-10 12 0s8 10 12 0 8-10 12 0s8 10 12 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'posture':
      return (
        <svg viewBox="0 0 48 48" className="cue-svg">
          <path d="M24 40V12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M14 20l10-10 10 10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case 'balance':
      return (
        <svg viewBox="0 0 48 48" className="cue-svg">
          <polygon points="24,38 20,42 28,42" fill="currentColor" />
          <line x1="8" y1="26" x2="40" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="14" cy="22" r="4" fill="currentColor" opacity="0.5" />
          <circle cx="34" cy="22" r="4" fill="currentColor" />
          <line x1="24" y1="26" x2="24" y2="38" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    default:
      return null;
  }
}

interface CompletionOverlayProps {
  modeState: ModeState;
  sessionStats: {
    duration: number;
    distance: number;
    calories: number;
    avgPower: number;
    avgSplit: number;
  };
  onContinue: () => void;
  onStop: () => void;
}

export function CompletionOverlay({
  modeState,
  sessionStats,
  onContinue,
  onStop,
}: CompletionOverlayProps) {
  const getCompletionMessage = (): string => {
    switch (modeState.mode) {
      case 'distance':
        return `${(modeState.target_distance / 1000).toFixed(1)}km Complete!`;
      case 'time':
        return `${formatTime(modeState.target_time)} Complete!`;
      case 'calories':
        return `${modeState.target_calories} Calories Burned!`;
      case 'intervals':
        return 'Intervals Complete!';
      case 'race':
        const raceResult = modeState.race?.user_lead ?? 0;
        return raceResult >= 0 ? 'You Won!' : 'Race Complete!';
      default:
        return 'Workout Complete!';
    }
  };

  return (
    <div className="completion-overlay" role="dialog" aria-modal="true">
      <div className="completion-modal">
        <h2>{getCompletionMessage()}</h2>
        <div className="completion-stats">
          <div className="stat">
            <span className="stat-value">{formatTime(sessionStats.duration)}</span>
            <span className="stat-label">Time</span>
          </div>
          <div className="stat">
            <span className="stat-value">{(sessionStats.distance / 1000).toFixed(2)}km</span>
            <span className="stat-label">Distance</span>
          </div>
          <div className="stat">
            <span className="stat-value">{sessionStats.calories}</span>
            <span className="stat-label">Calories</span>
          </div>
          <div className="stat">
            <span className="stat-value">{sessionStats.avgPower}W</span>
            <span className="stat-label">Avg Power</span>
          </div>
        </div>
        {modeState.mode === 'game' && modeState.game && (
          <div className="game-final-score">
            <span>Final Score: {modeState.game.score.toLocaleString()}</span>
          </div>
        )}
        <div className="completion-actions">
          <button className="continue-btn" onClick={onContinue}>
            Continue Rowing
          </button>
          <button className="stop-btn" onClick={onStop}>
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
