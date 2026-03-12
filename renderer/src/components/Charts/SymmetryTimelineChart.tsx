import { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import type { DataPoint } from '../../types/metrics';
import { formatTime } from '../../utils/format';
import { CHART, CHART_MARGIN_LABELS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from './theme';

interface SymmetryTimelineChartProps {
  dataPoints: DataPoint[];
}

export default function SymmetryTimelineChart({ dataPoints }: SymmetryTimelineChartProps) {
  if (dataPoints.length < 2) {
    return (
      <div className="chart-container chart-empty">
        <span>Not enough data</span>
      </div>
    );
  }

  const { chartData, trend, yMin } = useMemo(() => {
    const step = Math.max(1, Math.floor(dataPoints.length / 100));
    const data = dataPoints
      .filter((_, i) => i % step === 0)
      .map((d) => ({
        time: d.time,
        symmetry: d.symmetry,
        loadDistribution: d.loadDistribution || 90,
      }));

    const mid = Math.floor(data.length / 2);
    const firstAvg = data.slice(0, mid).reduce((s, d) => s + d.symmetry, 0) / mid;
    const secondAvg = data.slice(mid).reduce((s, d) => s + d.symmetry, 0) / (data.length - mid);
    const minSym = Math.min(...data.map((d) => d.symmetry));

    return {
      chartData: data,
      trend: secondAvg - firstAvg,
      yMin: Math.max(0, Math.floor(minSym / 10) * 10 - 10),
    };
  }, [dataPoints]);

  return (
    <div className="chart-container">
      <div className="chart-badge" style={{ color: trend >= 0 ? CHART.accent : CHART.red }}>
        Drift: {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
      </div>
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={150}>
        <ComposedChart data={chartData} margin={CHART_MARGIN_LABELS}>
          <defs>
            <linearGradient id="symmetryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART.blue} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="time" {...AXIS_STYLE} tickFormatter={(v) => formatTime(v)}
            label={{ value: 'Time', position: 'insideBottom', offset: -10, fill: CHART.axis, fontSize: 10 }}
          />
          <YAxis {...AXIS_STYLE} domain={[yMin, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            {...TOOLTIP_STYLE}
            labelFormatter={(v) => `Time: ${formatTime(v as number)}`}
            formatter={(v: number, name: string) => [
              `${v.toFixed(1)}%`,
              name === 'symmetry' ? 'L/R Symmetry' : 'Load Distribution',
            ]}
          />
          <ReferenceLine y={95} stroke={CHART.accent} strokeDasharray="5 5"
            label={{ value: 'Excellent', position: 'right', fill: CHART.accent, fontSize: 9 }}
          />
          <ReferenceLine y={88} stroke={CHART.orange} strokeDasharray="5 5"
            label={{ value: 'Good', position: 'right', fill: CHART.orange, fontSize: 9 }}
          />
          <Area type="monotone" dataKey="symmetry" stroke={CHART.blue} strokeWidth={2} fill="url(#symmetryGradient)" />
          <Line type="monotone" dataKey="loadDistribution" stroke={CHART.accent} strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
