import { useState, useEffect } from 'react';
import { formatDuration } from '../utils/format';
import {
  SessionMode,
  ModeConfig,
  ModeInfo,
  MODE_LIST,
  DISTANCE_PRESETS,
  TIME_PRESETS,
  CALORIE_PRESETS,
  SPLIT_PRESETS,
} from '../types/modes';

interface ModeSelectorProps {
  onSelect: (config: ModeConfig) => Promise<void> | void;
  onCancel: () => void;
}

export default function ModeSelector({ onSelect, onCancel }: ModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<SessionMode | null>(null);
  const [config, setConfig] = useState<ModeConfig>({ mode: 'free_row' });
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  const handleModeClick = (mode: ModeInfo) => {
    setSelectedMode(mode.id);
    setConfig({ mode: mode.id });
  };

  const handleStart = async () => {
    if (selectedMode && !isStarting) {
      setIsStarting(true);
      try {
        await onSelect(config);
      } finally {
        setIsStarting(false);
      }
    }
  };

  const renderConfig = () => {
    if (!selectedMode) return null;

    const modeInfo = MODE_LIST.find(m => m.id === selectedMode);
    if (!modeInfo?.hasConfig) return null;

    switch (selectedMode) {
      case 'distance':
        return (
          <div className="ms-config">
            <div className="ms-presets">
              {DISTANCE_PRESETS.map(d => (
                <button
                  key={d}
                  className={`ms-chip ${config.distance === d ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, distance: d })}
                >
                  {d >= 1000 ? `${d / 1000}K` : `${d}m`}
                </button>
              ))}
            </div>
            <div className="ms-custom">
              <input
                type="number"
                min="100"
                max="50000"
                step="100"
                placeholder="Custom meters"
                value={config.distance || ''}
                onChange={e => setConfig({ ...config, distance: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        );

      case 'time':
        return (
          <div className="ms-config">
            <div className="ms-presets">
              {TIME_PRESETS.map(t => (
                <button
                  key={t}
                  className={`ms-chip ${config.time === t * 60 ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, time: t * 60 })}
                >
                  {formatDuration(t)}
                </button>
              ))}
            </div>
            <div className="ms-custom">
              <input
                type="number"
                min="1"
                max="180"
                placeholder="Custom min"
                value={config.time ? config.time / 60 : ''}
                onChange={e => setConfig({ ...config, time: (parseInt(e.target.value) || 0) * 60 })}
              />
            </div>
          </div>
        );

      case 'calories':
        return (
          <div className="ms-config">
            <div className="ms-presets">
              {CALORIE_PRESETS.map(c => (
                <button
                  key={c}
                  className={`ms-chip ${config.calories === c ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, calories: c })}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="ms-custom">
              <input
                type="number"
                min="50"
                max="5000"
                step="50"
                placeholder="Custom cal"
                value={config.calories || ''}
                onChange={e => setConfig({ ...config, calories: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        );

      case 'intervals':
        return (
          <div className="ms-config">
            <div className="ms-interval-row">
              <span className="ms-interval-label">Work</span>
              <div className="ms-presets">
                {[20, 30, 45, 60, 90].map(s => (
                  <button
                    key={s}
                    className={`ms-chip sm ${config.work_duration === s ? 'selected' : ''}`}
                    onClick={() => setConfig({ ...config, work_duration: s })}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
            <div className="ms-interval-row">
              <span className="ms-interval-label">Rest</span>
              <div className="ms-presets">
                {[10, 20, 30, 45, 60].map(s => (
                  <button
                    key={s}
                    className={`ms-chip sm ${config.rest_duration === s ? 'selected' : ''}`}
                    onClick={() => setConfig({ ...config, rest_duration: s })}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
            <div className="ms-interval-row">
              <span className="ms-interval-label">Rounds</span>
              <div className="ms-presets">
                {[5, 8, 10, 12, 15, 20].map(r => (
                  <button
                    key={r}
                    className={`ms-chip sm ${config.rounds === r ? 'selected' : ''}`}
                    onClick={() => setConfig({ ...config, rounds: r })}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {config.work_duration && config.rest_duration && config.rounds && (
              <div className="ms-summary">
                Total: {formatDuration(((config.work_duration + config.rest_duration) * config.rounds) / 60)}
              </div>
            )}
          </div>
        );

      case 'race':
        return (
          <div className="ms-config">
            <div className="ms-interval-row">
              <span className="ms-interval-label">Distance</span>
              <div className="ms-presets">
                {[500, 1000, 2000, 5000].map(d => (
                  <button
                    key={d}
                    className={`ms-chip sm ${config.distance === d ? 'selected' : ''}`}
                    onClick={() => setConfig({ ...config, distance: d })}
                  >
                    {d >= 1000 ? `${d / 1000}K` : `${d}m`}
                  </button>
                ))}
                <button
                  className={`ms-chip sm accent ${config.distance === 2000 ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, distance: 2000, target_split: config.target_split || 120 })}
                >
                  2K Test
                </button>
              </div>
            </div>
            <div className="ms-interval-row">
              <span className="ms-interval-label">Pace</span>
              <div className="ms-presets">
                {SPLIT_PRESETS.map(s => (
                  <button
                    key={s.value}
                    className={`ms-chip sm ${config.target_split === s.value ? 'selected' : ''}`}
                    onClick={() => setConfig({ ...config, target_split: s.value })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'technique':
        return (
          <div className="ms-config">
            <div className="ms-presets">
              {[
                { key: 'symmetry', label: 'Symmetry' },
                { key: 'smoothness', label: 'Smoothness' },
                { key: 'posture', label: 'Posture' },
              ].map(({ key, label }) => {
                const active = config.focus_metrics?.includes(key) ?? true;
                return (
                  <button
                    key={key}
                    className={`ms-chip ${active ? 'selected' : ''}`}
                    onClick={() => {
                      const metrics = config.focus_metrics || ['symmetry', 'smoothness', 'posture'];
                      setConfig({
                        ...config,
                        focus_metrics: active
                          ? metrics.filter(m => m !== key)
                          : [...metrics, key],
                      });
                    }}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                className={`ms-chip ${config.coaching_enabled !== false ? 'selected' : ''}`}
                onClick={() => setConfig({ ...config, coaching_enabled: !(config.coaching_enabled !== false) })}
              >
                Coaching
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isConfigValid = (): boolean => {
    if (!selectedMode) return false;

    const modeInfo = MODE_LIST.find(m => m.id === selectedMode);
    if (!modeInfo?.hasConfig) return true;

    switch (selectedMode) {
      case 'distance':
        return (config.distance ?? 0) > 0;
      case 'time':
        return (config.time ?? 0) > 0;
      case 'calories':
        return (config.calories ?? 0) > 0;
      case 'intervals':
        return (config.work_duration ?? 0) > 0 &&
               (config.rest_duration ?? 0) > 0 &&
               (config.rounds ?? 0) > 0;
      case 'race':
        return (config.distance ?? 0) > 0 && (config.target_split ?? 0) > 0;
      case 'technique':
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="ms-overlay" role="dialog" aria-modal="true">
      <div className="ms-panel">
        <div className="ms-header">
          <h2>Select Mode</h2>
          <button className="ms-close" onClick={onCancel} aria-label="Close mode selector">&times;</button>
        </div>

        <div className="ms-modes">
          {MODE_LIST.filter(m => !m.hidden).map(mode => (
            <button
              key={mode.id}
              className={`ms-mode ${selectedMode === mode.id ? 'selected' : ''}`}
              onClick={() => handleModeClick(mode)}
            >
              <span className="ms-mode-icon">{mode.icon}</span>
              <span className="ms-mode-name">{mode.name}</span>
              <span className="ms-mode-desc">{mode.description}</span>
            </button>
          ))}
        </div>

        <div className="ms-config-area">
          {selectedMode ? (
            <>
              {renderConfig()}
              <button
                className="ms-start"
                onClick={handleStart}
                disabled={!isConfigValid() || isStarting}
              >
                {isStarting ? 'Starting...' : `Start ${MODE_LIST.find(m => m.id === selectedMode)?.name}`}
              </button>
            </>
          ) : (
            <div className="ms-prompt">Select a mode above</div>
          )}
        </div>
      </div>
    </div>
  );
}
