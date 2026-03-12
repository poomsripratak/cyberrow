import { useMetrics } from '../hooks/useMetrics';
import { useSessionStore } from '../stores/sessionStore';
import { useSessionMetrics } from '../hooks/useSessionMetrics';
import { formatTime, formatSplit } from '../utils/format';
import ErrorBoundary from './ErrorBoundary';
import RadarChart from './Charts/RadarChart';
import ForceCurveChart from './Charts/ForceCurveChart';
import SymmetryTimelineChart from './Charts/SymmetryTimelineChart';
import SplitComparisonChart from './Charts/SplitComparisonChart';
import PhaseBreakdownChart from './Charts/PhaseBreakdownChart';
import PowerTrendChart from './Charts/PowerTrendChart';
import SeatPressureChart from './Charts/SeatPressureChart';
import FootForceChart from './Charts/FootForceChart';
import MetricsTable from './Dashboard/MetricsTable';

function EmptyState() {
  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Session Analysis</h1>
          <p className="dashboard-subtitle">Select a session to view detailed metrics</p>
        </div>
      </div>
      <div className="no-sessions">
        <div className="no-sessions-icon">&#128202;</div>
        <h3>No Session Data</h3>
        <p>Complete a rowing session to see your analysis here</p>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { sessions, selectedSessionIndex } = useMetrics();
  const { setActiveView } = useSessionStore();
  const session = sessions.length > 0 ? sessions[selectedSessionIndex] : null;

  // Always call hooks unconditionally (Rules of Hooks)
  const { performanceMetrics, forceMetrics, techniqueMetrics, balanceMetrics } = useSessionMetrics(session);

  if (!session) {
    return <EmptyState />;
  }

  const date = new Date(session.date);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <button className="btn-back" aria-label="Back to history" onClick={() => setActiveView('history')}>
            &larr; Back
          </button>
          <h1 className="dashboard-title">Session Analysis</h1>
          <p className="dashboard-subtitle">
            {date.toLocaleDateString()} at{' '}
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
            {formatTime(session.duration)}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="metric-label">Total Distance</div>
          <div className="metric-value">{Math.round(session.distance)}</div>
          <span className="metric-unit">meters</span>
        </div>
        <div className="summary-card">
          <div className="metric-label">Avg Split</div>
          <div className="metric-value accent">{formatSplit(session.metrics.avgSplit)}</div>
          <span className="metric-unit">/500m</span>
        </div>
        <div className="summary-card">
          <div className="metric-label">Avg Power</div>
          <div className="metric-value">{session.metrics.avgPower}</div>
          <span className="metric-unit">watts</span>
        </div>
        <div className="summary-card">
          <div className="metric-label">Calories</div>
          <div className="metric-value">{session.calories}</div>
          <span className="metric-unit">kcal</span>
        </div>
      </div>

      {/* Performance Over Time */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="section-title">Power Over Time</div>
          <ErrorBoundary>
            <PowerTrendChart dataPoints={session.dataPoints} />
          </ErrorBoundary>
        </div>
        <div className="chart-card">
          <div className="section-title">Split by Minute</div>
          <ErrorBoundary>
            <SplitComparisonChart dataPoints={session.dataPoints} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Stroke Mechanics */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="section-title">
            Force Curve
            {session.metrics.forceCurveSamples && session.metrics.forceCurveSamples.some(v => v > 0) && (
              <span className="section-badge">{session.metrics.forceCurveType || 'Balanced'}</span>
            )}
          </div>
          <ErrorBoundary>
            <ForceCurveChart
              forceCurveType={session.metrics.forceCurveType || 'Balanced'}
              timeToPeakForce={session.metrics.avgTimeToPeakForce || 0.35}
              driveTime={0.8}
              samples={session.metrics.forceCurveSamples}
            />
          </ErrorBoundary>
        </div>
        <div className="chart-card">
          <div className="section-title">Stroke Phase Breakdown</div>
          <ErrorBoundary>
            <PhaseBreakdownChart driveRecoveryRatio={session.metrics.avgDriveRecovery} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Technique Summary */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="section-title">Stroke Analysis</div>
          <ErrorBoundary>
            <RadarChart metrics={session.metrics} />
          </ErrorBoundary>
        </div>
        <div className="chart-card">
          <div className="section-title">Balance Over Time</div>
          <ErrorBoundary>
            <SymmetryTimelineChart dataPoints={session.dataPoints} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Balance & Stability */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="section-title">Seat Pressure Distribution</div>
          <ErrorBoundary>
            <SeatPressureChart
              seatPoints={session.seatPoints ?? []}
              avgLeftRightBalance={session.metrics.avgSeatLeftRightBalance || 50}
              avgFrontBackBalance={session.metrics.avgSeatFrontBackBalance || 50}
            />
          </ErrorBoundary>
        </div>
        <div className="chart-card">
          <div className="section-title">Foot Force Analysis</div>
          <ErrorBoundary>
            <FootForceChart
              dataPoints={session.dataPoints}
              avgFootForceLeft={session.metrics.avgFootForceLeft || 0}
              avgFootForceRight={session.metrics.avgFootForceRight || 0}
              avgFootForceSymmetry={session.metrics.avgFootForceSymmetry || 100}
              peakFootForce={session.metrics.peakFootForce || 0}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Metrics Tables */}
      <MetricsTable title="Performance Metrics" metrics={performanceMetrics} />
      <MetricsTable title="Force & Power Analysis" metrics={forceMetrics} />
      <MetricsTable title="Technique & Efficiency" metrics={techniqueMetrics} />
      <MetricsTable title="Balance & Stability" metrics={balanceMetrics} />
    </>
  );
}
