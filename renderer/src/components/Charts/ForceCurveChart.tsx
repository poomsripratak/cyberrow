import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CHART, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from './theme';

interface ForceCurveChartProps {
  forceCurveType: string;
  timeToPeakForce: number;
  driveTime?: number;
  samples?: number[];
}

const PEAK_POSITIONS: Record<string, number> = {
  'Front-loaded': 0.2,
  'Early Peak': 0.35,
  'Balanced': 0.45,
  'Late Peak': 0.6,
  'Back-loaded': 0.75,
};

export default function ForceCurveChart({
  forceCurveType,
  timeToPeakForce = 0.35,
  driveTime = 0.8,
  samples,
}: ForceCurveChartProps) {
  const hasRealData = samples && samples.length > 0 && samples.some(v => v > 0);

  const { data, peakPhase } = useMemo(() => {
    if (hasRealData && samples) {
      const maxVal = Math.max(...samples);
      const normalized = maxVal > 0
        ? samples.map(v => Math.round((v / maxVal) * 100))
        : samples.map(() => 0);
      const step = 100 / (normalized.length - 1);
      const curve = normalized.map((force, i) => ({
        phase: Math.round(i * step),
        force,
      }));
      const peakIdx = normalized.indexOf(Math.max(...normalized));
      return { data: curve, peakPhase: curve[peakIdx]?.phase ?? 45 };
    }

    // No real data — return empty (caller handles rendering)
    if (!hasRealData) return { data: [], peakPhase: 0 };

    // Fallback: mathematical curve from classification
    const peakPos = PEAK_POSITIONS[forceCurveType] ?? timeToPeakForce / driveTime;
    const N = 50;
    const curve = Array.from({ length: N + 1 }, (_, i) => {
      const x = i / N;
      const force = x <= peakPos
        ? 100 * Math.pow(x / peakPos, 1.5)
        : 100 * Math.pow(1 - (x - peakPos) / (1 - peakPos), 1.2);
      return { phase: Math.round(x * 100), force: Math.max(0, Math.round(force)) };
    });
    return { data: curve, peakPhase: curve.find((d) => d.force === 100)?.phase ?? 45 };
  }, [hasRealData, samples, forceCurveType, timeToPeakForce, driveTime]);

  if (!hasRealData) {
    return (
      <div className="chart-container chart-empty">
        <span>No force sensor data</span>
        <span className="chart-empty-sub">Force sensors not connected</span>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={150}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="forceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART.red} stopOpacity={0.4} />
              <stop offset="95%" stopColor={CHART.red} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis
            dataKey="phase"
            {...AXIS_STYLE}
            tickFormatter={(v) => `${v}%`}
            label={{ value: 'Drive Phase', position: 'insideBottom', offset: -5, fill: CHART.axis, fontSize: 10 }}
          />
          <YAxis
            {...AXIS_STYLE}
            domain={[0, 110]}
            tickFormatter={(v) => `${v}%`}
            label={{ value: 'Force', angle: -90, position: 'insideLeft', fill: CHART.axis, fontSize: 10 }}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v: number) => [`${v}%`, 'Force']}
            labelFormatter={(v) => `Phase: ${v}%`}
          />
          <ReferenceLine
            x={peakPhase}
            stroke={CHART.red}
            strokeDasharray="5 5"
            label={{ value: 'Peak', position: 'top', fill: CHART.red, fontSize: 10 }}
          />
          <Area
            type="monotone"
            dataKey="force"
            stroke={CHART.red}
            strokeWidth={2}
            fill="url(#forceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
