import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Session } from '../../types/metrics';
import { formatDate, formatSplit } from '../../utils/format';
import { CHART, CHART_MARGIN, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from './theme';

interface TrendsChartProps {
  sessions: Session[];
  metric: 'power' | 'split' | 'distance' | 'efficiency' | 'consistency';
}

const metricConfig: Record<string, {
  label: string;
  color: string;
  getValue: (s: Session) => number;
  format: (v: number) => string;
  reversed?: boolean;
}> = {
  power: {
    label: 'Average Power',
    color: CHART.accent,
    getValue: (s) => s.metrics.avgPower,
    format: (v) => `${Math.round(v)}W`,
  },
  split: {
    label: 'Average Split',
    color: CHART.blue,
    getValue: (s) => s.metrics.avgSplit,
    format: (v) => formatSplit(v),
    reversed: true,
  },
  distance: {
    label: 'Distance',
    color: CHART.orange,
    getValue: (s) => s.distance,
    format: (v) => `${Math.round(v)}m`,
  },
  efficiency: {
    label: 'Stroke Efficiency',
    color: CHART.red,
    getValue: (s) => s.metrics.avgStrokeEfficiency || 75,
    format: (v) => `${Math.round(v)}`,
  },
  consistency: {
    label: 'Consistency Index',
    color: CHART.purple,
    getValue: (s) => s.metrics.avgConsistencyIndex || 85,
    format: (v) => `${Math.round(v)}%`,
  },
};

export default function TrendsChart({ sessions, metric }: TrendsChartProps) {
  if (sessions.length < 2) {
    return (
      <div className="chart-container chart-empty">
        <span>Need at least 2 sessions for trends</span>
      </div>
    );
  }

  const config = metricConfig[metric];

  const { chartData, trendPercent, improving } = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const data = sorted.map((s) => ({
      date: formatDate(s.date),
      value: config.getValue(s),
    }));
    const mid = Math.ceil(data.length / 2);
    const firstAvg = data.slice(0, mid).reduce((s, d) => s + d.value, 0) / mid;
    const secondAvg = data.slice(mid).reduce((s, d) => s + d.value, 0) / (data.length - mid);
    const trend = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    return { chartData: data, trendPercent: trend, improving: config.reversed ? trend < 0 : trend > 0 };
  }, [sessions, config]);

  return (
    <div className="chart-container">
      <div className="chart-badge" style={{ color: improving ? CHART.accent : CHART.red }}>
        {improving ? '↑' : '↓'} {Math.abs(trendPercent).toFixed(1)}% trend
      </div>
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={150}>
        <LineChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="date" {...AXIS_STYLE} angle={-45} textAnchor="end" height={50} />
          <YAxis
            {...AXIS_STYLE}
            reversed={config.reversed}
            tickFormatter={(v) => config.format(v)}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            labelFormatter={(v) => `Date: ${v}`}
            formatter={(v: number) => [config.format(v), config.label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={config.color}
            strokeWidth={2}
            dot={{ fill: config.color, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: config.color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
