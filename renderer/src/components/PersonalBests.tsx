import type { Session } from '../types/metrics';
import { formatTime, formatSplit, formatDateWithYear } from '../utils/format';

interface PersonalBestsProps {
  sessions: Session[];
}

interface PersonalBest {
  label: string;
  value: string;
  date: string;
  icon: string;
  subtext?: string;
}

/** Find the session that maximizes `getValue`, only among sessions where `isValid` is true. */
function findBest(
  sessions: Session[],
  getValue: (s: Session) => number,
  isValid: (s: Session) => boolean = () => true,
): Session | null {
  const valid = sessions.filter(isValid);
  if (valid.length === 0) return null;
  return valid.reduce((best, s) => getValue(s) > getValue(best) ? s : best);
}

function bestValue(session: Session | null, format: (s: Session) => string): string {
  return session ? format(session) : '—';
}

function bestDate(session: Session | null): string {
  return session ? formatDateWithYear(session.date) : '—';
}

export default function PersonalBests({ sessions }: PersonalBestsProps) {
  if (sessions.length === 0) {
    return (
      <div className="personal-bests-empty">
        <span>Complete sessions to see your personal bests</span>
      </div>
    );
  }

  const hasStrokes = (s: Session) => s.strokes > 0;
  const hasForce = (s: Session) => s.metrics.avgPower > 0;

  const bestSplit = findBest(sessions, (s) => -s.metrics.avgSplit, (s) => hasForce(s) && s.metrics.avgSplit > 0);
  const bestPower = findBest(sessions, (s) => s.metrics.avgPower, hasForce);
  const peakPower = findBest(sessions, (s) => s.metrics.peakPower, hasForce);
  const longestDist = findBest(sessions, (s) => s.distance, (s) => s.distance > 0);
  const longestDur = findBest(sessions, (s) => s.duration);
  const mostCals = findBest(sessions, (s) => s.calories, (s) => s.calories > 0);
  const bestSmooth = findBest(sessions, (s) => s.metrics.avgSmoothness, hasStrokes);
  const bestSym = findBest(sessions, (s) => s.metrics.avgSymmetry, hasStrokes);

  const bests: PersonalBest[] = [
    { label: 'Best Split', value: bestValue(bestSplit, (s) => formatSplit(s.metrics.avgSplit)), date: bestDate(bestSplit), icon: '◷', subtext: '/500m' },
    { label: 'Best Avg Power', value: bestValue(bestPower, (s) => `${s.metrics.avgPower}`), date: bestDate(bestPower), icon: '↑', subtext: 'watts' },
    { label: 'Peak Power', value: bestValue(peakPower, (s) => `${s.metrics.peakPower}`), date: bestDate(peakPower), icon: '△', subtext: 'watts' },
    { label: 'Longest Distance', value: bestValue(longestDist, (s) => `${Math.round(s.distance)}`), date: bestDate(longestDist), icon: '◉', subtext: 'meters' },
    { label: 'Longest Session', value: bestValue(longestDur, (s) => formatTime(s.duration)), date: bestDate(longestDur), icon: '◶', subtext: 'duration' },
    { label: 'Most Calories', value: bestValue(mostCals, (s) => `${s.calories}`), date: bestDate(mostCals), icon: '△', subtext: 'kcal' },
    { label: 'Best Smoothness', value: bestValue(bestSmooth, (s) => `${s.metrics.avgSmoothness}%`), date: bestDate(bestSmooth), icon: '●' },
    { label: 'Best Symmetry', value: bestValue(bestSym, (s) => `${s.metrics.avgSymmetry}%`), date: bestDate(bestSym), icon: '◈' },
  ];

  return (
    <div className="personal-bests">
      {bests.map((best) => (
        <div key={best.label} className="personal-best-card">
          <div className="personal-best-icon">{best.icon}</div>
          <div className="personal-best-content">
            <div className="personal-best-label">{best.label}</div>
            <div className="personal-best-value">
              {best.value}
              {best.subtext && <span className="personal-best-subtext">{best.subtext}</span>}
            </div>
            <div className="personal-best-date">{best.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
