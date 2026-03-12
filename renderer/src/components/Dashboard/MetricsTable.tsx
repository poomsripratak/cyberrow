import type { QualityRating } from '../../types/metrics';

export interface MetricRow {
  name: string;
  avg: string;
  peak: string;
  rating: QualityRating;
  description?: string;
}

interface MetricsTableProps {
  title: string;
  metrics: MetricRow[];
}

export default function MetricsTable({ title, metrics }: MetricsTableProps) {
  return (
    <div className="metrics-table">
      <div className="section-title">{title}</div>
      <div className="table-row table-header">
        <div>Metric</div>
        <div>Average</div>
        <div>Peak/Best</div>
        <div>Rating</div>
      </div>
      {metrics.map((m) => (
        <div key={m.name} className="table-row">
          <div className="table-metric">
            {m.name}
            {m.description && (
              <span className="metric-hint-wrapper">
                <span className="metric-hint">?</span>
                <span className="metric-tooltip">{m.description}</span>
              </span>
            )}
          </div>
          <div className="table-value">{m.avg}</div>
          <div className="table-value">{m.peak}</div>
          <div>
            <span className={`quality-badge ${m.rating.className}`}>{m.rating.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
