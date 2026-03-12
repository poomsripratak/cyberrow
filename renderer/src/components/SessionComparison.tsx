import { useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import type { Session } from '../types/metrics';
import { formatTime, formatSplit, formatDate } from '../utils/format';
import { CHART, CHART_MARGIN, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from './Charts/theme';

interface SessionComparisonProps {
  session1: Session;
  session2: Session;
  onClose: () => void;
}

interface MetricComparison {
  label: string;
  val1: string;
  val2: string;
  raw1: number;
  raw2: number;
  /** true = lower is better (like split, power decline) */
  inverse: boolean;
}

function getWinner(m: MetricComparison): 1 | 2 | 0 {
  if (m.raw1 === m.raw2) return 0;
  if (m.inverse) return m.raw1 < m.raw2 ? 1 : 2;
  return m.raw1 > m.raw2 ? 1 : 2;
}

function getChange(raw1: number, raw2: number, inverse: boolean) {
  const diff = raw1 - raw2;
  const percent = raw2 !== 0 ? (diff / raw2) * 100 : 0;
  const improved = inverse ? diff < 0 : diff > 0;
  const arrow = diff === 0 ? '' : improved ? '↑' : '↓';
  const color = diff === 0 ? CHART.axis : improved ? CHART.accent : CHART.red;
  return { text: `${arrow} ${Math.abs(percent).toFixed(1)}%`, color };
}

export default function SessionComparison({ session1, session2, onClose }: SessionComparisonProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const date1 = formatDate(session1.date);
  const date2 = formatDate(session2.date);

  const performanceData = useMemo(() => [
    { metric: 'Distance', [date1]: session1.distance, [date2]: session2.distance },
    { metric: 'Power', [date1]: session1.metrics.avgPower, [date2]: session2.metrics.avgPower },
    { metric: 'Calories', [date1]: session1.calories, [date2]: session2.calories },
    { metric: 'Strokes', [date1]: session1.strokes, [date2]: session2.strokes },
  ], [session1, session2, date1, date2]);

  const techniqueData = useMemo(() => [
    { metric: 'Smoothness', [date1]: session1.metrics.avgSmoothness, [date2]: session2.metrics.avgSmoothness },
    { metric: 'Symmetry', [date1]: session1.metrics.avgSymmetry, [date2]: session2.metrics.avgSymmetry },
    { metric: 'Trunk', [date1]: session1.metrics.avgTrunkStability, [date2]: session2.metrics.avgTrunkStability },
    { metric: 'Seat', [date1]: session1.metrics.avgSeatStability, [date2]: session2.metrics.avgSeatStability },
    { metric: 'Consistency', [date1]: session1.metrics.avgConsistencyIndex || 85, [date2]: session2.metrics.avgConsistencyIndex || 85 },
    { metric: 'Efficiency', [date1]: session1.metrics.avgStrokeEfficiency || 75, [date2]: session2.metrics.avgStrokeEfficiency || 75 },
  ], [session1, session2, date1, date2]);

  // Grouped comparison metrics
  const performanceMetrics: MetricComparison[] = [
    { label: 'Duration', val1: formatTime(session1.duration), val2: formatTime(session2.duration), raw1: session1.duration, raw2: session2.duration, inverse: false },
    { label: 'Distance', val1: `${Math.round(session1.distance)}m`, val2: `${Math.round(session2.distance)}m`, raw1: session1.distance, raw2: session2.distance, inverse: false },
    { label: 'Avg Split', val1: formatSplit(session1.metrics.avgSplit), val2: formatSplit(session2.metrics.avgSplit), raw1: session1.metrics.avgSplit, raw2: session2.metrics.avgSplit, inverse: true },
    { label: 'Avg Power', val1: `${session1.metrics.avgPower}W`, val2: `${session2.metrics.avgPower}W`, raw1: session1.metrics.avgPower, raw2: session2.metrics.avgPower, inverse: false },
    { label: 'Peak Power', val1: `${session1.metrics.peakPower}W`, val2: `${session2.metrics.peakPower}W`, raw1: session1.metrics.peakPower, raw2: session2.metrics.peakPower, inverse: false },
    { label: 'Stroke Rate', val1: `${session1.metrics.avgStrokeRate} spm`, val2: `${session2.metrics.avgStrokeRate} spm`, raw1: session1.metrics.avgStrokeRate, raw2: session2.metrics.avgStrokeRate, inverse: false },
    { label: 'Power Decline', val1: `${session1.metrics.powerDecline || 0}%`, val2: `${session2.metrics.powerDecline || 0}%`, raw1: session1.metrics.powerDecline || 0, raw2: session2.metrics.powerDecline || 0, inverse: true },
  ];

  const techniqueMetrics: MetricComparison[] = [
    { label: 'Stroke Length', val1: `${session1.metrics.avgStrokeLength}m`, val2: `${session2.metrics.avgStrokeLength}m`, raw1: parseFloat(String(session1.metrics.avgStrokeLength)), raw2: parseFloat(String(session2.metrics.avgStrokeLength)), inverse: false },
    { label: 'Drive:Recovery', val1: `1:${(1 / session1.metrics.avgDriveRecovery).toFixed(1)}`, val2: `1:${(1 / session2.metrics.avgDriveRecovery).toFixed(1)}`, raw1: session1.metrics.avgDriveRecovery, raw2: session2.metrics.avgDriveRecovery, inverse: false },
    { label: 'Smoothness', val1: `${session1.metrics.avgSmoothness}%`, val2: `${session2.metrics.avgSmoothness}%`, raw1: session1.metrics.avgSmoothness, raw2: session2.metrics.avgSmoothness, inverse: false },
    { label: 'Consistency', val1: `${session1.metrics.avgConsistencyIndex || 85}%`, val2: `${session2.metrics.avgConsistencyIndex || 85}%`, raw1: session1.metrics.avgConsistencyIndex || 85, raw2: session2.metrics.avgConsistencyIndex || 85, inverse: false },
    { label: 'Efficiency', val1: `${session1.metrics.avgStrokeEfficiency || 75}`, val2: `${session2.metrics.avgStrokeEfficiency || 75}`, raw1: session1.metrics.avgStrokeEfficiency || 75, raw2: session2.metrics.avgStrokeEfficiency || 75, inverse: false },
  ];

  const balanceMetrics: MetricComparison[] = [
    { label: 'L/R Symmetry', val1: `${session1.metrics.avgSymmetry}%`, val2: `${session2.metrics.avgSymmetry}%`, raw1: session1.metrics.avgSymmetry, raw2: session2.metrics.avgSymmetry, inverse: false },
    { label: 'Trunk Stability', val1: `${session1.metrics.avgTrunkStability}%`, val2: `${session2.metrics.avgTrunkStability}%`, raw1: session1.metrics.avgTrunkStability, raw2: session2.metrics.avgTrunkStability, inverse: false },
    { label: 'Seat Stability', val1: `${session1.metrics.avgSeatStability}%`, val2: `${session2.metrics.avgSeatStability}%`, raw1: session1.metrics.avgSeatStability, raw2: session2.metrics.avgSeatStability, inverse: false },
    { label: 'Foot Symmetry', val1: `${session1.metrics.avgFootForceSymmetry || 100}%`, val2: `${session2.metrics.avgFootForceSymmetry || 100}%`, raw1: session1.metrics.avgFootForceSymmetry || 100, raw2: session2.metrics.avgFootForceSymmetry || 100, inverse: false },
    { label: 'Load Distribution', val1: `${session1.metrics.avgLoadDistribution || 90}%`, val2: `${session2.metrics.avgLoadDistribution || 90}%`, raw1: session1.metrics.avgLoadDistribution || 90, raw2: session2.metrics.avgLoadDistribution || 90, inverse: false },
  ];

  // Overall verdict
  const allMetrics = [...performanceMetrics, ...techniqueMetrics, ...balanceMetrics];
  const wins1 = allMetrics.filter(m => getWinner(m) === 1).length;
  const wins2 = allMetrics.filter(m => getWinner(m) === 2).length;
  const ties = allMetrics.length - wins1 - wins2;

  const renderMetricGroup = (title: string, metrics: MetricComparison[]) => (
    <div className="comparison-table">
      <h3>{title}</h3>
      <div className="comparison-table-header">
        <div>Metric</div>
        <div style={{ color: CHART.accent }}>{date1}</div>
        <div style={{ color: CHART.blue }}>{date2}</div>
        <div>Change</div>
      </div>
      {metrics.map((m) => {
        const winner = getWinner(m);
        const change = getChange(m.raw1, m.raw2, m.inverse);
        return (
          <div key={m.label} className="comparison-table-row">
            <div className="comparison-metric-name">{m.label}</div>
            <div className={winner === 1 ? 'comparison-winner' : ''}>{m.val1}</div>
            <div className={winner === 2 ? 'comparison-winner' : ''}>{m.val2}</div>
            <div style={{ color: change.color }}>{change.text}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="comparison-overlay" role="dialog" aria-modal="true">
      <div className="comparison-modal">
        <div className="comparison-header">
          <h2>Session Comparison</h2>
          <button className="btn btn-secondary" aria-label="Close comparison" onClick={onClose}>Close</button>
        </div>

        <div className="comparison-dates">
          <div className="comparison-date session1">
            <div className="date-badge">{date1}</div>
            <span>{formatTime(session1.duration)} · {Math.round(session1.distance)}m</span>
          </div>
          <div className="comparison-vs">vs</div>
          <div className="comparison-date session2">
            <div className="date-badge">{date2}</div>
            <span>{formatTime(session2.duration)} · {Math.round(session2.distance)}m</span>
          </div>
        </div>

        {/* Verdict Summary */}
        <div className="comparison-verdict">
          <div className="verdict-score">
            <span className="verdict-count" style={{ color: CHART.accent }}>{wins1}</span>
            <span className="verdict-label">{date1}</span>
          </div>
          <div className="verdict-center">
            <span className="verdict-ties">{ties} tied</span>
            <span className="verdict-total">of {allMetrics.length} metrics</span>
          </div>
          <div className="verdict-score">
            <span className="verdict-count" style={{ color: CHART.blue }}>{wins2}</span>
            <span className="verdict-label">{date2}</span>
          </div>
        </div>

        {/* Charts */}
        <div className="comparison-grid">
          <div className="comparison-chart-card">
            <h3>Performance</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                <BarChart data={performanceData} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="metric" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend />
                  <Bar dataKey={date1} fill={CHART.accent} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={date2} fill={CHART.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="comparison-chart-card">
            <h3>Technique</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={techniqueData}>
                  <PolarGrid stroke={CHART.grid} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: CHART.axis, fontSize: 10 }} />
                  <Radar
                    name={date1}
                    dataKey={date1}
                    stroke={CHART.accent}
                    fill={CHART.accent}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name={date2}
                    dataKey={date2}
                    stroke={CHART.blue}
                    fill={CHART.blue}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Grouped metric tables */}
        {renderMetricGroup('Performance', performanceMetrics)}
        {renderMetricGroup('Technique & Efficiency', techniqueMetrics)}
        {renderMetricGroup('Balance & Stability', balanceMetrics)}
      </div>
    </div>
  );
}
