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

interface PowerTrendChartProps {
  dataPoints: DataPoint[];
}

function linearRegression(data: { time: number; power: number }[]) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const d of data) {
    sumX += d.time;
    sumY += d.power;
    sumXY += d.time * d.power;
    sumXX += d.time * d.time;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function avgWindow(data: { power: number }[], start: number, end: number) {
  const slice = data.slice(start, end);
  return slice.length ? slice.reduce((s, d) => s + d.power, 0) / slice.length : 0;
}

export default function PowerTrendChart({ dataPoints }: PowerTrendChartProps) {
  if (dataPoints.length < 2) {
    return (
      <div className="chart-container chart-empty">
        <span>Not enough data</span>
      </div>
    );
  }

  if (dataPoints.every(d => d.power === 0)) {
    return (
      <div className="chart-container chart-empty">
        <span>No power data</span>
        <span className="chart-empty-sub">Force sensors not connected</span>
      </div>
    );
  }

  const { trendData, initialPower, declinePercent, declineColor } = useMemo(() => {
    const step = Math.max(1, Math.floor(dataPoints.length / 100));
    const chartData = dataPoints
      .filter((_, i) => i % step === 0)
      .map((d) => ({ time: d.time, power: d.power }));

    const { slope, intercept } = linearRegression(chartData);
    const trend = chartData.map((d) => ({
      ...d,
      trend: Math.round(slope * d.time + intercept),
    }));

    const warmupEnd = Math.floor(chartData.length * 0.1);
    const initialEnd = Math.floor(chartData.length * 0.2);
    const initial = avgWindow(chartData, warmupEnd, Math.max(initialEnd, warmupEnd + 3));
    const final_ = avgWindow(chartData, Math.max(0, chartData.length - Math.ceil(chartData.length * 0.1)), chartData.length);
    const decline = initial > 0 ? ((initial - final_) / initial * 100) : 0;
    const color = decline > 15 ? CHART.red : decline > 8 ? CHART.orange : CHART.accent;

    return { trendData: trend, initialPower: initial, declinePercent: decline, declineColor: color };
  }, [dataPoints]);

  return (
    <div className="chart-container">
      <div className="chart-badge" style={{ color: declineColor }}>
        {declinePercent > 0 ? `↓ ${declinePercent.toFixed(1)}% decline` : `↑ ${Math.abs(declinePercent).toFixed(1)}% gain`}
      </div>
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={150}>
        <ComposedChart data={trendData} margin={CHART_MARGIN_LABELS}>
          <defs>
            <linearGradient id="powerTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART.accent} stopOpacity={0.2} />
              <stop offset="95%" stopColor={CHART.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="time" {...AXIS_STYLE} tickFormatter={(v) => formatTime(v)} />
          <YAxis
            {...AXIS_STYLE}
            domain={['auto', 'auto']}
            label={{ value: 'Power (W)', angle: -90, position: 'insideLeft', fill: CHART.axis, fontSize: 10 }}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            labelFormatter={(v) => `Time: ${formatTime(v as number)}`}
            formatter={(v: number, name: string) => [
              `${Math.round(v)}W`,
              name === 'power' ? 'Power' : 'Trend',
            ]}
          />
          <ReferenceLine
            y={initialPower}
            stroke={CHART.blue}
            strokeDasharray="5 5"
            label={{ value: `Baseline: ${Math.round(initialPower)}W`, position: 'right', fill: CHART.blue, fontSize: 9 }}
          />
          <Area
            type="monotone"
            dataKey="power"
            stroke={CHART.accent}
            strokeWidth={1.5}
            fill="url(#powerTrendGradient)"
            dot={false}
          />
          <Line
            type="linear"
            dataKey="trend"
            stroke={declineColor}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
