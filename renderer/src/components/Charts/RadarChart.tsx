import { useMemo } from 'react';
import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import type { SessionMetrics } from '../../types/metrics';
import { CHART } from './theme';

interface RadarChartProps {
  metrics: SessionMetrics;
}

export default function RadarChart({ metrics }: RadarChartProps) {
  const data = useMemo(() => [
    { subject: 'Smoothness', value: metrics.avgSmoothness, fullMark: 100 },
    { subject: 'Symmetry', value: metrics.avgSymmetry, fullMark: 100 },
    { subject: 'Trunk', value: metrics.avgTrunkStability, fullMark: 100 },
    { subject: 'Seat', value: metrics.avgSeatStability, fullMark: 100 },
  ], [metrics.avgSmoothness, metrics.avgSymmetry, metrics.avgTrunkStability, metrics.avgSeatStability]);

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
        <RechartsRadar cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={CHART.grid} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: CHART.axis, fontSize: 11 }} />
          <Radar
            name="Metrics"
            dataKey="value"
            stroke={CHART.accent}
            fill={CHART.accent}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
