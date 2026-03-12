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
import type { DataPoint } from '../../types/metrics';
import { formatTime } from '../../utils/format';
import { CHART, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, ratingColor } from './theme';

interface FootForceChartProps {
  dataPoints: DataPoint[];
  avgFootForceLeft: number;
  avgFootForceRight: number;
  avgFootForceSymmetry: number;
  peakFootForce: number;
}

export default function FootForceChart({
  dataPoints,
  avgFootForceLeft,
  avgFootForceRight,
  avgFootForceSymmetry,
  peakFootForce,
}: FootForceChartProps) {
  const noSensorData = peakFootForce === 0 && avgFootForceLeft === 0 && avgFootForceRight === 0;

  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(dataPoints.length / 50));
    return dataPoints
      .filter((_, i) => i % step === 0)
      .map((d) => ({
        time: Math.round(d.time),
        left: d.peakFootForceLeft || 0,
        right: d.peakFootForceRight || 0,
      }));
  }, [dataPoints]);

  const { legDriveRatio, balanceStatus, balanceColor, symmetryRating, symmetryColor } = useMemo(() => {
    const avgHandleForce = dataPoints.reduce((s, d) => s + d.peakForce, 0) / dataPoints.length || 1;
    const avgTotal = avgFootForceLeft + avgFootForceRight;
    const legDrive = avgTotal > 0 ? Math.min(100, (avgTotal / avgHandleForce) * 50) : 0;

    const diff = Math.abs(avgFootForceLeft - avgFootForceRight);
    const status = diff < 20 ? 'Balanced' :
      avgFootForceLeft > avgFootForceRight ? 'Left Dominant' : 'Right Dominant';
    const bColor = ratingColor(100 - diff, { good: 80, ok: 50 });

    const symRating = avgFootForceSymmetry >= 95 ? 'Excellent' :
      avgFootForceSymmetry >= 90 ? 'Good' :
      avgFootForceSymmetry >= 80 ? 'Fair' : 'Needs Work';
    const symColor = ratingColor(avgFootForceSymmetry, { good: 95, ok: 80 });

    return { legDriveRatio: legDrive, balanceStatus: status, balanceColor: bColor, symmetryRating: symRating, symmetryColor: symColor };
  }, [dataPoints, avgFootForceLeft, avgFootForceRight, avgFootForceSymmetry]);

  const avgFootForce = avgFootForceLeft + avgFootForceRight;

  if (noSensorData) {
    return (
      <div className="chart-container chart-empty">
        <span>No foot force data</span>
        <span className="chart-empty-sub">Foot force sensors not connected</span>
      </div>
    );
  }

  return (
    <div className="chart-container foot-force-chart">
      <div className="foot-force-stats">
        <div className="foot-stat">
          <span className="foot-stat-label">Left Foot</span>
          <span className="foot-stat-value">{avgFootForceLeft.toFixed(0)}N</span>
        </div>
        <div className="foot-stat">
          <span className="foot-stat-label">Right Foot</span>
          <span className="foot-stat-value">{avgFootForceRight.toFixed(0)}N</span>
        </div>
        <div className="foot-stat">
          <span className="foot-stat-label">Peak Force</span>
          <span className="foot-stat-value accent">{peakFootForce.toFixed(0)}N</span>
        </div>
        <div className="foot-stat">
          <span className="foot-stat-label">Symmetry</span>
          <span className="foot-stat-value" style={{ color: symmetryColor }}>
            {avgFootForceSymmetry.toFixed(0)}%
          </span>
          <span className="foot-stat-hint">{symmetryRating}</span>
        </div>
      </div>

      <div className="foot-balance-visual">
        <div className="balance-bar-container">
          <div className="balance-label left">L</div>
          <div className="balance-bar">
            <div
              className="balance-fill left"
              style={{
                width: `${Math.min(50, (avgFootForceLeft / (avgFootForce || 1)) * 100)}%`,
                backgroundColor: CHART.blue,
              }}
            />
            <div
              className="balance-fill right"
              style={{
                width: `${Math.min(50, (avgFootForceRight / (avgFootForce || 1)) * 100)}%`,
                backgroundColor: CHART.accent,
              }}
            />
            <div className="balance-center-line" />
          </div>
          <div className="balance-label right">R</div>
        </div>
        <div className="balance-status" style={{ color: balanceColor }}>
          {balanceStatus}
        </div>
      </div>

      <div className="leg-drive-indicator">
        <span className="leg-drive-label">Leg Drive Contribution</span>
        <div className="leg-drive-bar">
          <div className="leg-drive-fill" style={{ width: `${legDriveRatio}%` }} />
        </div>
        <span className="leg-drive-value">{legDriveRatio.toFixed(0)}%</span>
      </div>

      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={150}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="footLeft" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART.blue} stopOpacity={0.4} />
              <stop offset="95%" stopColor={CHART.blue} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="footRight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART.accent} stopOpacity={0.4} />
              <stop offset="95%" stopColor={CHART.accent} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="time" {...AXIS_STYLE} fontSize={10} tickFormatter={formatTime} />
          <YAxis {...AXIS_STYLE} fontSize={10} tickFormatter={(v) => `${v}N`} />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v: number, name: string) => [
              `${v.toFixed(0)}N`,
              name === 'left' ? 'Left Foot' : 'Right Foot',
            ]}
            labelFormatter={(v) => `Time: ${formatTime(v as number)}`}
          />
          <ReferenceLine y={avgFootForce / 2} stroke={CHART.axis} strokeDasharray="3 3" />
          <Area type="monotone" dataKey="left" stroke={CHART.blue} fill="url(#footLeft)" strokeWidth={2} />
          <Area type="monotone" dataKey="right" stroke={CHART.accent} fill="url(#footRight)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="foot-force-tips">
        {avgFootForceSymmetry < 85 && (
          <div className="tip warning">
            Asymmetric leg drive may indicate muscle imbalance or technique issue
          </div>
        )}
        {legDriveRatio < 40 && avgFootForce > 0 && (
          <div className="tip info">
            Focus on pushing through the footplate to engage leg muscles more
          </div>
        )}
        {legDriveRatio > 70 && (
          <div className="tip success">
            Strong leg drive - good power transfer from legs to handle
          </div>
        )}
      </div>
    </div>
  );
}
