import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { SeatPoint } from '../../types/metrics';
import { CHART, GRID_STYLE, TOOLTIP_STYLE, ratingColor } from './theme';

interface SeatPressureChartProps {
  seatPoints: SeatPoint[];
  avgLeftRightBalance: number;
  avgFrontBackBalance: number;
}

export default function SeatPressureChart({
  seatPoints,
  avgLeftRightBalance,
  avgFrontBackBalance,
}: SeatPressureChartProps) {
  const noSensorData = seatPoints.length === 0;

  const trailData = useMemo(() => {
    const step = Math.max(1, Math.floor(seatPoints.length / 200));
    return seatPoints
      .filter((_, i) => i % step === 0)
      .map((d, index) => ({
        x: d.x * 100,
        y: d.y * 100,
        time: d.t,
        index,
      }));
  }, [seatPoints]);

  if (noSensorData) {
    return (
      <div className="chart-container chart-empty">
        <span>No seat sensor data</span>
        <span className="chart-empty-sub">Seat slave not connected or session recorded before seat was added</span>
      </div>
    );
  }

  const avgPos = useMemo(() => {
    if (trailData.length === 0) return { x: 0, y: 0 };
    const sx = trailData.reduce((s, d) => s + d.x, 0);
    const sy = trailData.reduce((s, d) => s + d.y, 0);
    return { x: sx / trailData.length, y: sy / trailData.length };
  }, [trailData]);

  const avgDeviation = Math.sqrt(
    Math.pow((avgLeftRightBalance - 50) / 50, 2) +
    Math.pow((avgFrontBackBalance - 50) / 50, 2)
  ) * 100;

  const stabilityRating =
    avgDeviation < 5 ? 'Excellent' :
    avgDeviation < 10 ? 'Good' :
    avgDeviation < 20 ? 'Fair' : 'Needs Work';

  const stabilityColor = ratingColor(100 - avgDeviation, { good: 90, ok: 80 });

  return (
    <div className="chart-container seat-pressure-chart">
      <div className="seat-pressure-stats">
        <div className="seat-stat">
          <span className="seat-stat-label">L/R Balance</span>
          <span className="seat-stat-value">{avgLeftRightBalance.toFixed(1)}%</span>
          <span className="seat-stat-hint">
            {avgLeftRightBalance > 52 ? '← Left' : avgLeftRightBalance < 48 ? 'Right →' : 'Centered'}
          </span>
        </div>
        <div className="seat-stat">
          <span className="seat-stat-label">F/B Balance</span>
          <span className="seat-stat-value">{avgFrontBackBalance.toFixed(1)}%</span>
          <span className="seat-stat-hint">
            {avgFrontBackBalance > 52 ? '↑ Forward' : avgFrontBackBalance < 48 ? '↓ Back' : 'Centered'}
          </span>
        </div>
        <div className="seat-stat">
          <span className="seat-stat-label">Stability</span>
          <span className="seat-stat-value" style={{ color: stabilityColor }}>{stabilityRating}</span>
        </div>
      </div>

      <div className="seat-chart-square">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              type="number" dataKey="x" domain={[-50, 50]}
              stroke={CHART.axis} fontSize={9}
              tickFormatter={(v) => v === 0 ? '0' : ''}
              label={{ value: '← Left    Right →', position: 'bottom', fill: CHART.axis, fontSize: 9 }}
            />
            <YAxis
              type="number" dataKey="y" domain={[-50, 50]}
              stroke={CHART.axis} fontSize={9}
              tickFormatter={(v) => v === 0 ? '0' : ''}
              label={{ value: '↑Front  Back↓', angle: -90, position: 'left', fill: CHART.axis, fontSize: 9 }}
            />
            <ReferenceLine x={0} stroke={CHART.grid} />
            <ReferenceLine y={0} stroke={CHART.grid} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v: number, name: string) => [
                `${v.toFixed(1)}%`,
                name === 'x' ? 'L/R' : 'F/B',
              ]}
            />
            <Scatter data={trailData} fill={CHART.accent}>
              {trailData.map((_, i) => (
                <Cell key={i} fill={CHART.accent} opacity={0.3 + (i / trailData.length) * 0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div className="seat-outline">
          <div className="seat-quadrant tl">FL</div>
          <div className="seat-quadrant tr">FR</div>
          <div className="seat-quadrant bl">BL</div>
          <div className="seat-quadrant br">BR</div>
          <div
            className="seat-cop-marker"
            style={{
              left: `${50 + avgPos.x / 2}%`,
              top: `${50 - avgPos.y / 2}%`,
            }}
          />
          <div className="seat-center-marker" />
        </div>
      </div>
    </div>
  );
}
