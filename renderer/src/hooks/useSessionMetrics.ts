import { useMemo } from 'react';
import type { Session, QualityRating } from '../types/metrics';
import type { MetricRow } from '../components/Dashboard/MetricsTable';

type Thresholds = { excellent: number; good: number; fair: number };

const THRESHOLDS = {
  strokeRate:      { excellent: 26,  good: 22,  fair: 18  } as Thresholds,
  power:           { excellent: 200, good: 150, fair: 100 } as Thresholds,
  strokeLength:    { excellent: 1.3, good: 1.1, fair: 0.9 } as Thresholds,
  driveRecovery:   { excellent: 0.5, good: 0.45, fair: 0.35 } as Thresholds,
  peakForce:       { excellent: 500, good: 400, fair: 300 } as Thresholds,
  consistency:     { excellent: 90,  good: 80,  fair: 70  } as Thresholds,
  smoothness:      { excellent: 90,  good: 80,  fair: 70  } as Thresholds,
  efficiency:      { excellent: 85,  good: 75,  fair: 65  } as Thresholds,
  rangeOfMotion:   { excellent: 140, good: 120, fair: 100 } as Thresholds,
  symmetry:        { excellent: 95,  good: 88,  fair: 80  } as Thresholds,
  footTotal:       { excellent: 400, good: 300, fair: 200 } as Thresholds,
  loadDistribution:{ excellent: 95,  good: 85,  fair: 75  } as Thresholds,
  trunkStability:  { excellent: 90,  good: 80,  fair: 70  } as Thresholds,
  seatStability:   { excellent: 92,  good: 85,  fair: 75  } as Thresholds,
} as const;

function getQualityRating(value: number, thresholds: Thresholds): QualityRating {
  if (value >= thresholds.excellent) return { label: 'Excellent', className: 'quality-excellent' };
  if (value >= thresholds.good) return { label: 'Good', className: 'quality-good' };
  if (value >= thresholds.fair) return { label: 'Fair', className: 'quality-fair' };
  return { label: 'Needs Work', className: 'quality-poor' };
}

interface ComputedPeaks {
  strokeRate: number;
  strokeLength: number;
  peakForce: number;
  timeToPeakForce: number;
  consistencyIndex: number;
  smoothness: number;
  strokeEfficiency: number;
  rangeOfMotion: number;
  symmetry: number;
  footForceSymmetry: number;
  loadDistribution: number;
  posturalDeviation: number;
  trunkStability: number;
  seatStability: number;
}

const defaultPeaks: ComputedPeaks = {
  strokeRate: 0,
  strokeLength: 0,
  peakForce: 0,
  timeToPeakForce: 0.35,
  consistencyIndex: 85,
  smoothness: 0,
  strokeEfficiency: 75,
  rangeOfMotion: 120,
  symmetry: 0,
  footForceSymmetry: 100,
  loadDistribution: 90,
  posturalDeviation: 5,
  trunkStability: 0,
  seatStability: 0,
};

function computePeaks(dataPoints: Session['dataPoints']): ComputedPeaks {
  if (dataPoints.length === 0) {
    return defaultPeaks;
  }

  let strokeRate = 0;
  let strokeLength = 0;
  let peakForce = 0;
  let timeToPeakForce = Infinity;
  let consistencyIndex = 0;
  let smoothness = 0;
  let strokeEfficiency = 0;
  let rangeOfMotion = 0;
  let symmetry = 0;
  let footForceSymmetry = 0;
  let loadDistribution = 0;
  let posturalDeviation = 0;
  let trunkStability = 0;
  let seatStability = 0;

  for (const d of dataPoints) {
    if (d.strokeRate > strokeRate) strokeRate = d.strokeRate;
    if (d.strokeLength > strokeLength) strokeLength = d.strokeLength;
    if (d.peakForce > peakForce) peakForce = d.peakForce;
    if (d.timeToPeakForce > 0 && d.timeToPeakForce < timeToPeakForce) timeToPeakForce = d.timeToPeakForce;
    if (d.consistencyIndex > consistencyIndex) consistencyIndex = d.consistencyIndex;
    if (d.smoothness > smoothness) smoothness = d.smoothness;
    if (d.strokeEfficiency > strokeEfficiency) strokeEfficiency = d.strokeEfficiency;
    if (d.rangeOfMotion > rangeOfMotion) rangeOfMotion = d.rangeOfMotion;
    if (d.symmetry > symmetry) symmetry = d.symmetry;
    if ((d.footForceSymmetry ?? 0) > footForceSymmetry) footForceSymmetry = d.footForceSymmetry ?? 0;
    if (d.loadDistribution > loadDistribution) loadDistribution = d.loadDistribution;
    if (d.posturalDeviation > posturalDeviation) posturalDeviation = d.posturalDeviation;
    if (d.trunkStability > trunkStability) trunkStability = d.trunkStability;
    if (d.seatStability > seatStability) seatStability = d.seatStability;
  }

  return {
    strokeRate,
    strokeLength,
    peakForce,
    timeToPeakForce: timeToPeakForce === Infinity ? 0 : timeToPeakForce,
    consistencyIndex,
    smoothness,
    strokeEfficiency,
    rangeOfMotion,
    symmetry,
    footForceSymmetry,
    loadDistribution,
    posturalDeviation,
    trunkStability,
    seatStability,
  };
}

const emptyMetrics: MetricRow[] = [];

const NO_DATA: QualityRating = { label: 'No Data', className: 'quality-na' };

export function useSessionMetrics(session: Session | null) {
  const peaks = useMemo(
    () => (session ? computePeaks(session.dataPoints) : defaultPeaks),
    [session]
  );

  const performanceMetrics: MetricRow[] = useMemo(() => {
    if (!session) return emptyMetrics;
    const noStrokes = session.strokes === 0;
    const noForce = session.metrics.avgPeakForce === 0;
    return [
      {
        name: 'Stroke Rate',
        avg: noStrokes ? '—' : `${session.metrics.avgStrokeRate} spm`,
        peak: noStrokes ? '—' : `${peaks.strokeRate} spm`,
        rating: noStrokes ? NO_DATA : getQualityRating(session.metrics.avgStrokeRate, THRESHOLDS.strokeRate),
        description: 'Strokes per minute. Higher rates increase intensity but may reduce power per stroke.',
      },
      {
        name: 'Power Output',
        avg: noForce ? '—' : `${session.metrics.avgPower} W`,
        peak: noForce ? '—' : `${session.metrics.peakPower} W`,
        rating: noForce ? NO_DATA : getQualityRating(session.metrics.avgPower, THRESHOLDS.power),
        description: 'Watts generated per stroke. Combines force and speed of your pull.',
      },
      {
        name: 'Stroke Length',
        avg: noStrokes ? '—' : `${session.metrics.avgStrokeLength} m`,
        peak: noStrokes ? '—' : `${peaks.strokeLength.toFixed(2)} m`,
        rating: noStrokes ? NO_DATA : getQualityRating(parseFloat(String(session.metrics.avgStrokeLength)), THRESHOLDS.strokeLength),
        description: 'Handle travel distance per stroke. Longer strokes engage more muscle groups.',
      },
      {
        name: 'Drive:Recovery',
        avg: noStrokes ? '—' : `1:${(1 / session.metrics.avgDriveRecovery).toFixed(1)}`,
        peak: '—',
        rating: noStrokes ? NO_DATA : getQualityRating(session.metrics.avgDriveRecovery, THRESHOLDS.driveRecovery),
        description: 'Ratio of pull time to return time. Ideal is 1:2 (quick drive, slow recovery).',
      },
    ];
  }, [session, peaks]);

  const forceMetrics: MetricRow[] = useMemo(() => {
    if (!session) return emptyMetrics;
    const noForce = session.metrics.avgPeakForce === 0;
    return [
      {
        name: 'Peak Handle Force',
        avg: noForce ? '—' : `${session.metrics.avgPeakForce} N`,
        peak: noForce ? '—' : `${session.metrics.peakHandleForce || peaks.peakForce} N`,
        rating: noForce ? NO_DATA : getQualityRating(session.metrics.avgPeakForce, THRESHOLDS.peakForce),
        description: 'Maximum force applied to the handle during the drive phase.',
      },
      {
        name: 'Time to Peak Force',
        avg: noForce ? '—' : `${session.metrics.avgTimeToPeakForce.toFixed(2)} s`,
        peak: noForce ? '—' : `${(session.metrics.minTimeToPeakForce || peaks.timeToPeakForce).toFixed(2)} s`,
        rating: noForce ? NO_DATA : getQualityRating(1 - session.metrics.avgTimeToPeakForce, { excellent: 0.7, good: 0.6, fair: 0.5 } as Thresholds),
        description: 'How quickly you reach peak force. Faster = more explosive power.',
      },
      {
        name: 'Power Decline',
        avg: noForce ? '—' : `${session.metrics.powerDecline || 0}%`,
        peak: '—',
        rating: noForce ? NO_DATA : getQualityRating(100 - (session.metrics.powerDecline || 0), { excellent: 95, good: 85, fair: 75 } as Thresholds),
        description: 'Power drop from start to end of session. Lower = better endurance.',
      },
      {
        name: 'Force Curve Type',
        avg: noForce ? '—' : (session.metrics.forceCurveType || 'Balanced'),
        peak: '—',
        rating: noForce ? NO_DATA : {
          label: session.metrics.forceCurveType === 'Balanced' ? 'Optimal' : 'Info',
          className: session.metrics.forceCurveType === 'Balanced' ? 'quality-excellent' : 'quality-good',
        },
        description: 'Shape of your force application. Balanced curves are most efficient.',
      },
      {
        name: 'Load Distribution',
        avg: noForce ? '—' : `${session.metrics.avgLoadDistribution}%`,
        peak: noForce ? '—' : `${peaks.loadDistribution.toFixed(0)}%`,
        rating: noForce ? NO_DATA : getQualityRating(session.metrics.avgLoadDistribution, THRESHOLDS.loadDistribution),
        description: 'How evenly effort is spread across body. Higher = better coordination.',
      },
      {
        name: 'Stroke Efficiency',
        avg: noForce ? '—' : `${session.metrics.avgStrokeEfficiency}`,
        peak: noForce ? '—' : `${peaks.strokeEfficiency.toFixed(0)}`,
        rating: noForce ? NO_DATA : getQualityRating(session.metrics.avgStrokeEfficiency, THRESHOLDS.efficiency),
        description: 'Power output relative to effort. Higher = more efficient technique.',
      },
    ];
  }, [session, peaks]);

  const techniqueMetrics: MetricRow[] = useMemo(() => {
    if (!session) return emptyMetrics;
    const noStrokes = session.strokes === 0;
    return [
      {
        name: 'Consistency Index',
        avg: noStrokes ? '—' : `${session.metrics.avgConsistencyIndex}%`,
        peak: noStrokes ? '—' : `${peaks.consistencyIndex.toFixed(0)}%`,
        rating: noStrokes ? NO_DATA : getQualityRating(session.metrics.avgConsistencyIndex, THRESHOLDS.consistency),
        description: 'How similar each stroke is to the others. Higher = more repeatable technique.',
      },
      {
        name: 'Smoothness Index',
        avg: noStrokes ? '—' : `${session.metrics.avgSmoothness}%`,
        peak: noStrokes ? '—' : `${peaks.smoothness.toFixed(0)}%`,
        rating: noStrokes ? NO_DATA : getQualityRating(session.metrics.avgSmoothness, THRESHOLDS.smoothness),
        description: 'Fluidity of force application. Higher = no jerky movements.',
      },
      {
        name: 'Range of Motion',
        avg: noStrokes ? '—' : `${session.metrics.avgRangeOfMotion}°`,
        peak: noStrokes ? '—' : `${peaks.rangeOfMotion.toFixed(0)}°`,
        rating: noStrokes ? NO_DATA : getQualityRating(session.metrics.avgRangeOfMotion, THRESHOLDS.rangeOfMotion),
        description: 'Total body movement during stroke. Larger range engages more muscles.',
      },
      {
        name: 'Postural Deviation',
        avg: noStrokes ? '—' : `${session.metrics.avgPosturalDeviation}°`,
        peak: noStrokes ? '—' : `${peaks.posturalDeviation.toFixed(1)}°`,
        rating: noStrokes ? NO_DATA : getQualityRating(20 - session.metrics.avgPosturalDeviation, { excellent: 15, good: 12, fair: 8 } as Thresholds),
        description: 'Trunk lean angle from vertical. Lower = more upright posture.',
      },
      {
        name: 'Trunk Stability',
        avg: noStrokes ? '—' : `${session.metrics.avgTrunkStability}%`,
        peak: noStrokes ? '—' : `${peaks.trunkStability.toFixed(0)}%`,
        rating: noStrokes ? NO_DATA : getQualityRating(session.metrics.avgTrunkStability, THRESHOLDS.trunkStability),
        description: 'Core steadiness during stroke. Higher = less upper body wobble.',
      },
    ];
  }, [session, peaks]);

  const balanceMetrics: MetricRow[] = useMemo(() => {
    if (!session) return emptyMetrics;
    const noStrokes = session.strokes === 0;
    const noFoot = session.metrics.peakFootForce === 0 && session.metrics.avgFootForceLeft === 0;
    const noSeat = session.metrics.avgSeatCenterX === 0 && session.metrics.avgSeatCenterY === 0 && session.metrics.avgSeatLeftRightBalance === 50 && session.metrics.avgSeatFrontBackBalance === 50;
    return [
      {
        name: 'L/R Symmetry (Handle)',
        avg: noStrokes ? '—' : `${session.metrics.avgSymmetry}%`,
        peak: noStrokes ? '—' : `${peaks.symmetry.toFixed(0)}%`,
        rating: noStrokes ? NO_DATA : getQualityRating(session.metrics.avgSymmetry, THRESHOLDS.symmetry),
        description: 'Left vs right hand force balance on the handle. 100% = perfectly equal.',
      },
      {
        name: 'Symmetry Drift',
        avg: noStrokes ? '—' : `${session.metrics.symmetryDrift > 0 ? '+' : ''}${session.metrics.symmetryDrift}%`,
        peak: '—',
        rating: noStrokes ? NO_DATA : getQualityRating(100 - Math.abs(session.metrics.symmetryDrift) * 5, THRESHOLDS.loadDistribution),
        description: 'Change in L/R balance over session. 0% = consistent balance throughout.',
      },
      {
        name: 'Foot Force Symmetry',
        avg: noFoot ? '—' : `${session.metrics.avgFootForceSymmetry}%`,
        peak: noFoot ? '—' : `${peaks.footForceSymmetry.toFixed(0)}%`,
        rating: noFoot ? NO_DATA : getQualityRating(session.metrics.avgFootForceSymmetry, THRESHOLDS.symmetry),
        description: 'Left vs right leg push balance. 100% = equal leg drive.',
      },
      {
        name: 'Avg Foot Force (L/R)',
        avg: noFoot ? '—' : `${session.metrics.avgFootForceLeft.toFixed(0)}N / ${session.metrics.avgFootForceRight.toFixed(0)}N`,
        peak: noFoot ? '—' : `${session.metrics.peakFootForce.toFixed(0)}N`,
        rating: noFoot ? NO_DATA : getQualityRating(session.metrics.avgFootForceTotal || 0, THRESHOLDS.footTotal),
        description: 'Average push force from each foot. Higher = stronger leg drive.',
      },
      {
        name: 'Seat L/R Balance',
        avg: noSeat ? '—' : `${session.metrics.avgSeatLeftRightBalance}%`,
        peak: '—',
        rating: noSeat ? NO_DATA : getQualityRating(100 - Math.abs(session.metrics.avgSeatLeftRightBalance - 50) * 2, { excellent: 95, good: 90, fair: 80 } as Thresholds),
        description: 'Weight distribution left-right on seat. 50% = perfectly centered.',
      },
      {
        name: 'Seat F/B Balance',
        avg: noSeat ? '—' : `${session.metrics.avgSeatFrontBackBalance}%`,
        peak: '—',
        rating: noSeat ? NO_DATA : getQualityRating(100 - Math.abs(session.metrics.avgSeatFrontBackBalance - 50) * 2, { excellent: 95, good: 90, fair: 80 } as Thresholds),
        description: 'Weight distribution front-back on seat. 50% = balanced position.',
      },
      {
        name: 'Seat Stability',
        avg: noSeat ? '—' : `${session.metrics.avgSeatStability}%`,
        peak: noSeat ? '—' : `${peaks.seatStability.toFixed(0)}%`,
        rating: noSeat ? NO_DATA : getQualityRating(session.metrics.avgSeatStability, THRESHOLDS.seatStability),
        description: 'Hip steadiness on seat. Higher = less shifting during stroke.',
      },
    ];
  }, [session, peaks]);

  return {
    peaks,
    performanceMetrics,
    forceMetrics,
    techniqueMetrics,
    balanceMetrics,
  };
}
