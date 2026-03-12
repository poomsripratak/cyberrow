import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { CHART, TOOLTIP_STYLE } from './theme';

interface PhaseBreakdownChartProps {
  driveRecoveryRatio: number;
}

const PHASE_COLORS = [CHART.red, CHART.accent, CHART.blue, CHART.orange];

export default function PhaseBreakdownChart({ driveRecoveryRatio }: PhaseBreakdownChartProps) {
  const data = useMemo(() => {
    if (driveRecoveryRatio === 0) return [];

    const drivePercent = (driveRecoveryRatio / (1 + driveRecoveryRatio)) * 100;
    const recoveryPercent = 100 - drivePercent;
    return [
      { name: 'Catch', value: Math.round(drivePercent * 2) / 10 },
      { name: 'Drive', value: Math.round(drivePercent * 8) / 10 },
      { name: 'Finish', value: Math.round(recoveryPercent * 1.5) / 10 },
      { name: 'Recovery', value: Math.round(recoveryPercent * 8.5) / 10 },
    ];
  }, [driveRecoveryRatio]);

  if (data.length === 0) {
    return (
      <div className="chart-container chart-empty">
        <span>No stroke data</span>
        <span className="chart-empty-sub">No complete strokes detected</span>
      </div>
    );
  }

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
  }) => {
    if (percent < 0.08) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="var(--text-primary)" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={150}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            innerRadius={40}
            dataKey="value"
            stroke={CHART.bg}
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PHASE_COLORS[i]} />
            ))}
          </Pie>
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v: number, name: string) => [`${v}%`, name]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span style={{ color: CHART.axis, fontSize: '0.75rem' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
