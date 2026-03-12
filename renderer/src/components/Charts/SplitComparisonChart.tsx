import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { DataPoint } from '../../types/metrics';
import { formatSplit } from '../../utils/format';
import { CHART, CHART_MARGIN, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from './theme';

interface SplitComparisonChartProps {
  dataPoints: DataPoint[];
  intervalSeconds?: number;
}

export default function SplitComparisonChart({
  dataPoints,
  intervalSeconds = 60,
}: SplitComparisonChartProps) {
  const computed = useMemo(() => {
    if (dataPoints.length < 2) return null;

    const validPoints = dataPoints.filter((d) => d.split500m > 0);
    if (validPoints.length < 2) return null;

    const totalTime = validPoints[validPoints.length - 1].time;
    // Skip warm-up only for sessions longer than 4 minutes
    const warmupCutoff = totalTime > 240 ? 120 : 0;
    // Use shorter intervals for short sessions so we get multiple bars
    const bucketSize = totalTime < 60 ? 10 : totalTime < 120 ? 20 : intervalSeconds;

    const steadyPoints = validPoints.filter((d) => d.time >= warmupCutoff);
    if (steadyPoints.length < 2) return null;

    const intervals: { name: string; avgSplit: number }[] = [];
    let currentInterval = Math.floor(steadyPoints[0].time / bucketSize);
    let bucket: DataPoint[] = [];

    for (const point of steadyPoints) {
      const idx = Math.floor(point.time / bucketSize);
      if (idx !== currentInterval && bucket.length > 0) {
        intervals.push({
          name: `${currentInterval + 1}`,
          avgSplit: bucket.reduce((s, d) => s + d.split500m, 0) / bucket.length,
        });
        bucket = [];
        currentInterval = idx;
      }
      bucket.push(point);
    }
    if (bucket.length > 0) {
      intervals.push({
        name: `${currentInterval + 1}`,
        avgSplit: bucket.reduce((s, d) => s + d.split500m, 0) / bucket.length,
      });
    }

    if (intervals.length < 2) return null;

    const overallAvg = intervals.reduce((s, d) => s + d.avgSplit, 0) / intervals.length;

    return {
      deviationData: intervals.map((d) => ({
        name: d.name,
        avgSplit: d.avgSplit,
        deviation: d.avgSplit - overallAvg,
      })),
      overallAvg,
      bucketSize,
    };
  }, [dataPoints, intervalSeconds]);

  const noForceData = dataPoints.length > 0 && dataPoints.every(d => d.power === 0);

  if (noForceData) {
    return (
      <div className="chart-container chart-empty">
        <span>No split data</span>
        <span className="chart-empty-sub">Force sensors not connected</span>
      </div>
    );
  }

  if (!computed) {
    return (
      <div className="chart-container chart-empty">
        <span>Not enough data</span>
      </div>
    );
  }

  const { deviationData, overallAvg, bucketSize } = computed;

  const barColor = (deviation: number) => {
    if (deviation < -1) return CHART.accent;
    if (deviation > 1) return CHART.red;
    return CHART.blue;
  };

  return (
    <div className="chart-container">
      <div className="chart-badge" style={{ color: CHART.axis }}>
        Avg: {formatSplit(overallAvg)}
      </div>
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={150}>
        <BarChart data={deviationData} margin={CHART_MARGIN}>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="name"
            {...AXIS_STYLE}
            label={{ value: bucketSize < 60 ? `${bucketSize}s interval` : 'Minute', position: 'insideBottom', offset: -5, fill: CHART.axis, fontSize: 10 }}
          />
          <YAxis
            {...AXIS_STYLE}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}s`}
            label={{ value: 'vs avg', angle: -90, position: 'insideLeft', fill: CHART.axis, fontSize: 10 }}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v: number, name: string) => {
              if (name === 'deviation') {
                const entry = deviationData.find((d) => d.deviation === v);
                return [formatSplit(entry?.avgSplit ?? overallAvg + v), 'Split'];
              }
              return [v, name];
            }}
            labelFormatter={(v) => `Interval ${v}`}
          />
          <ReferenceLine y={0} stroke={CHART.axis} strokeDasharray="5 5" />
          <Bar dataKey="deviation" radius={[4, 4, 0, 0]}>
            {deviationData.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.deviation)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
