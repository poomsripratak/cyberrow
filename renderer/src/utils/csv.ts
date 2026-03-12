import type { Session } from '../types/metrics';

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function row(values: (string | number | undefined | null)[]): string {
  return values
    .map((v) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(',');
}

/**
 * Export selected sessions as per-stroke dataPoints.
 * All sessions combined into one file with session_date and session_id columns.
 */
export function exportSessionsDataPointsCSV(sessions: Session[]) {
  const headers = [
    'session_date',
    'session_id',
    'time_s',
    'stroke_rate_spm',
    'power_w',
    'split_500m_s',
    'drive_recovery_ratio',
    'peak_force_n',
    'smoothness',
    'symmetry',
    'trunk_stability',
    'seat_stability',
    'consistency_index',
    'postural_deviation_deg',
    'range_of_motion_deg',
    'load_distribution',
    'stroke_efficiency',
    'seat_total_load',
    'seat_lr_balance',
    'seat_fb_balance',
  ];

  const lines = [headers.join(',')];

  for (const s of sessions) {
    const dateStr = new Date(s.date).toISOString().slice(0, 10);
    for (const d of s.dataPoints) {
      lines.push(
        row([
          dateStr,
          s.id,
          d.time.toFixed(1),
          d.strokeRate,
          d.power,
          d.split500m.toFixed(1),
          d.driveRecoveryRatio.toFixed(2),
          d.peakForce,
          d.smoothness.toFixed(1),
          d.symmetry.toFixed(1),
          d.trunkStability.toFixed(1),
          d.seatStability.toFixed(1),
          d.consistencyIndex.toFixed(1),
          d.posturalDeviation.toFixed(1),
          d.rangeOfMotion.toFixed(1),
          d.loadDistribution.toFixed(1),
          d.strokeEfficiency.toFixed(1),
          d.seatTotalLoad.toFixed(1),
          d.seatLeftRightBalance.toFixed(1),
          d.seatFrontBackBalance.toFixed(1),
        ])
      );
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const suffix = sessions.length === 1
    ? new Date(sessions[0].date).toISOString().slice(0, 10)
    : `${sessions.length}sessions_${dateStr}`;
  downloadCSV(`cyberrow_${suffix}_strokes.csv`, lines.join('\n'));
}
