import { useState } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import { useSessionStore } from '../stores/sessionStore';
import { formatTime, formatSplit } from '../utils/format';
import { exportSessionsDataPointsCSV } from '../utils/csv';
import TrendsChart from './Charts/TrendsChart';
import PersonalBests from './PersonalBests';
import SessionComparison from './SessionComparison';

type TrendMetric = 'power' | 'split' | 'distance' | 'efficiency' | 'consistency';
const MAX_COMPARE = 2;

export default function History() {
  const { sessions, selectSession, deleteSessions } = useMetrics();
  const { setActiveView } = useSessionStore();

  const [selectedTrendMetric, setSelectedTrendMetric] = useState<TrendMetric>('power');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<number[]>([]);

  const handleSessionClick = (index: number) => {
    if (compareMode) {
      if (selectedForCompare.includes(index)) {
        setSelectedForCompare(selectedForCompare.filter((i) => i !== index));
      } else if (selectedForCompare.length < MAX_COMPARE) {
        const newSelected = [...selectedForCompare, index];
        setSelectedForCompare(newSelected);
        if (newSelected.length === MAX_COMPARE) {
          setShowComparison(true);
        }
      }
    } else if (deleteMode) {
      setSelectedForDelete((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else if (exportMode) {
      setSelectedForExport((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      selectSession(index);
      setActiveView('dashboard');
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedForCompare([]);
    setDeleteMode(false);
    setSelectedForDelete([]);
    setExportMode(false);
    setSelectedForExport([]);
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setSelectedForDelete([]);
    setCompareMode(false);
    setSelectedForCompare([]);
    setConfirmDelete(false);
    setExportMode(false);
    setSelectedForExport([]);
  };

  const toggleExportMode = () => {
    setExportMode(!exportMode);
    setSelectedForExport([]);
    setCompareMode(false);
    setSelectedForCompare([]);
    setDeleteMode(false);
    setSelectedForDelete([]);
    setConfirmDelete(false);
  };

  const handleExport = () => {
    if (selectedForExport.length === 0) return;
    exportSessionsDataPointsCSV(selectedForExport.map((i) => sessions[i]));
    setExportMode(false);
    setSelectedForExport([]);
  };

  const handleDeleteConfirmed = async () => {
    if (selectedForDelete.length === 0) return;
    setIsDeleting(true);
    const ids = selectedForDelete.map((i) => sessions[i].id);
    await deleteSessions(ids);
    setDeleteMode(false);
    setSelectedForDelete([]);
    setConfirmDelete(false);
    setIsDeleting(false);
  };

  const closeComparison = () => {
    setShowComparison(false);
    setSelectedForCompare([]);
    setCompareMode(false);
  };

  if (sessions.length === 0) {
    return (
      <>
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Session History</h1>
            <p className="dashboard-subtitle">View and compare your past sessions</p>
          </div>
        </div>
        <div className="no-sessions">
          <div className="no-sessions-icon">&#128675;</div>
          <h3>No Sessions Yet</h3>
          <p>Start your first rowing session to begin tracking your progress</p>
        </div>
      </>
    );
  }

  // Calculate summary stats
  const totalSessions = sessions.length;
  const totalDistance = sessions.reduce((sum, s) => sum + s.distance, 0);
  const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalCalories = sessions.reduce((sum, s) => sum + s.calories, 0);

  return (
    <>
      {showComparison && selectedForCompare.length === MAX_COMPARE && (
        <SessionComparison
          session1={sessions[selectedForCompare[0]]}
          session2={sessions[selectedForCompare[1]]}
          onClose={closeComparison}
        />
      )}

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Session History</h1>
          <p className="dashboard-subtitle">
            {totalSessions} sessions · {Math.round(totalDistance / 1000)}km total · {Math.round(totalTime / 60)}min
          </p>
        </div>
        <div className="history-header-actions">
          {exportMode && selectedForExport.length > 0 ? (
            <>
              <button className="btn btn-primary" onClick={handleExport}>
                Export {selectedForExport.length}
              </button>
              <button className="btn btn-secondary" onClick={toggleExportMode}>Cancel</button>
            </>
          ) : (
            <button
              className={`btn ${exportMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleExportMode}
            >
              {exportMode ? 'Cancel' : 'Export CSV'}
            </button>
          )}
          <button
            className={`btn ${compareMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleCompareMode}
          >
            {compareMode
              ? `Select ${MAX_COMPARE - selectedForCompare.length} more`
              : 'Compare'}
          </button>
          {deleteMode && selectedForDelete.length > 0 ? (
            confirmDelete ? (
              <>
                <button className="btn btn-danger" onClick={handleDeleteConfirmed} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : `Confirm delete ${selectedForDelete.length}`}
                </button>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </>
            ) : (
              <>
                <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                  Delete {selectedForDelete.length}
                </button>
                <button className="btn btn-secondary" onClick={toggleDeleteMode}>Cancel</button>
              </>
            )
          ) : (
            <button
              className={`btn ${deleteMode ? 'btn-danger-outline' : 'btn-secondary'}`}
              onClick={toggleDeleteMode}
            >
              {deleteMode ? 'Cancel' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="metric-label">Total Sessions</div>
          <div className="metric-value">{totalSessions}</div>
        </div>
        <div className="summary-card">
          <div className="metric-label">Total Distance</div>
          <div className="metric-value">{(totalDistance / 1000).toFixed(1)}</div>
          <span className="metric-unit">km</span>
        </div>
        <div className="summary-card">
          <div className="metric-label">Total Time</div>
          <div className="metric-value">{Math.round(totalTime / 60)}</div>
          <span className="metric-unit">min</span>
        </div>
        <div className="summary-card">
          <div className="metric-label">Total Calories</div>
          <div className="metric-value">{totalCalories.toLocaleString()}</div>
          <span className="metric-unit">kcal</span>
        </div>
      </div>

      {/* Personal Bests Section */}
      <div className="history-section">
        <div className="section-title">Personal Bests</div>
        <PersonalBests sessions={sessions} />
      </div>

      {/* Trends Section */}
      <div className="history-section">
        <div className="section-header">
          <div className="section-title">Progress Trends</div>
          <div className="trend-metric-selector">
            {(['power', 'split', 'distance', 'efficiency', 'consistency'] as TrendMetric[]).map((metric) => (
              <button
                key={metric}
                className={`trend-metric-btn ${selectedTrendMetric === metric ? 'active' : ''}`}
                onClick={() => setSelectedTrendMetric(metric)}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-card">
          <TrendsChart sessions={sessions} metric={selectedTrendMetric} />
        </div>
      </div>

      {/* Session List */}
      <div className="history-section">
        <div className="section-title">All Sessions</div>
        <div className="history-list">
          {sessions.map((session, index) => {
            const date = new Date(session.date);
            const day = date.getDate();
            const month = date.toLocaleString('default', { month: 'short' });
            const isSelectedCompare = selectedForCompare.includes(index);
            const isSelectedDelete = selectedForDelete.includes(index);
            const isSelectedExport = selectedForExport.includes(index);
            const isSelected = isSelectedCompare || isSelectedDelete || isSelectedExport;
            const anyMode = compareMode || deleteMode || exportMode;

            return (
              <div
                key={session.id}
                className={`history-item ${compareMode ? 'compare-mode' : ''} ${deleteMode ? 'delete-mode' : ''} ${exportMode ? 'compare-mode' : ''} ${isSelected ? 'selected' : ''} ${isSelectedDelete ? 'delete-selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${formatTime(session.duration)} session on ${date.toLocaleDateString()}, ${Math.round(session.distance)}m`}
                onClick={() => handleSessionClick(index)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSessionClick(index); } }}
              >
                {anyMode && (
                  <div
                    className={`compare-checkbox ${isSelected ? 'checked' : ''} ${isSelectedDelete ? 'delete-check' : ''}`}
                    role="checkbox"
                    aria-checked={isSelected}
                  >
                    {isSelected && '✓'}
                  </div>
                )}
                <div className="history-date">
                  <div className="history-day">{day}</div>
                  <div className="history-month">{month}</div>
                </div>
                <div className="history-info">
                  <h4>{formatTime(session.duration)} Session</h4>
                  <p>
                    {session.strokes} strokes ·{' '}
                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="history-stat">
                  <div className="history-stat-value">{Math.round(session.distance)}m</div>
                  <div className="history-stat-label">Distance</div>
                </div>
                <div className="history-stat">
                  <div className="history-stat-value">{formatSplit(session.metrics.avgSplit)}</div>
                  <div className="history-stat-label">Avg Split</div>
                </div>
                <div className="history-stat">
                  <div className="history-stat-value">{session.metrics.avgPower}W</div>
                  <div className="history-stat-label">Avg Power</div>
                </div>
                <div className="history-stat">
                  <div className="history-stat-value">{session.calories}</div>
                  <div className="history-stat-label">Calories</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
