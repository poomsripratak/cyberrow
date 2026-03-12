/**
 * Shared chart theme — single source of truth for colors, axis config, and tooltip styles.
 */

export const CHART = {
  accent: '#00d4aa',
  blue: '#4488ff',
  orange: '#ffaa00',
  red: '#ff6b6b',
  purple: '#9966ff',
  axis: '#8888aa',
  grid: '#2a2a3a',
  bg: '#1a1a25',
} as const;

/** Standard chart margin — used by most bar/line charts */
export const CHART_MARGIN = { top: 20, right: 10, left: 0, bottom: 20 } as const;

/** Chart margin with extra right padding for reference line labels */
export const CHART_MARGIN_LABELS = { top: 20, right: 60, left: 0, bottom: 20 } as const;

export const AXIS_STYLE = {
  stroke: CHART.axis,
  fontSize: 11,
  tickLine: false,
} as const;

export const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: CHART.grid,
} as const;

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '0.8rem',
  },
  labelStyle: { color: 'var(--text-primary)' },
  itemStyle: { color: 'var(--text-primary)' },
} as const;

/** Color for a percentage-based quality rating */
export function ratingColor(value: number, thresholds = { good: 90, ok: 75 }): string {
  if (value >= thresholds.good) return CHART.accent;
  if (value >= thresholds.ok) return CHART.orange;
  return CHART.red;
}
