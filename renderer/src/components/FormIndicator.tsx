import { useRef } from 'react';

interface FormIndicatorProps {
  handForceLeft: number | null;
  handForceRight: number | null;
  footForceLeft: number | null;
  footForceRight: number | null;
  trunkBalance: number | null;  // 0-100, 50 = centered (lateral)
  trunkAngle: number | null;    // deg, -45 to +45 (forward/back)
}

type Quality = 'good' | 'warning' | 'poor';

function qualityFromDeviation(deviation: number): Quality {
  if (deviation <= 7) return 'good';
  if (deviation <= 15) return 'warning';
  return 'poor';
}

function getBalanceText(pos: number, quality: Quality): string {
  if (quality === 'good') return 'Even';
  const side = pos < 50 ? 'left' : 'right';
  if (quality === 'warning') return `Pulling ${side}`;
  return `Heavy ${side}`;
}

function getTrunkText(tiltDeg: number, quality: Quality): string {
  if (quality === 'good') return 'Stable';
  const side = tiltDeg < 0 ? 'left' : 'right';
  if (quality === 'warning') return `Leaning ${side}`;
  return `Heavy ${side}`;
}

function getTrunkFBText(tiltDeg: number, quality: Quality): string {
  if (quality === 'good') return 'Stable';
  const side = tiltDeg < 0 ? 'fwd' : 'back';
  if (quality === 'warning') return `Leaning ${side}`;
  return `Heavy ${side}`;
}

function useSmoothed(raw: number, alpha = 0.2): number {
  const ref = useRef(raw);
  ref.current += alpha * (raw - ref.current);
  return ref.current;
}

function BalanceSection({
  label,
  left,
  right,
  getText,
}: {
  label: string;
  left: number | null;
  right: number | null;
  getText: (pos: number, quality: Quality) => string;
}) {
  let rawPos = 50;
  if (left != null && right != null) {
    const total = left + right;
    if (total > 10) {
      rawPos = (right / total) * 100;
    }
  }
  rawPos = Math.max(10, Math.min(90, rawPos));

  const pos = useSmoothed(rawPos);
  const deviation = Math.abs(pos - 50);
  const quality = qualityFromDeviation(deviation);
  const text = getText(pos, quality);

  return (
    <div className="form-section">
      <div className="form-header">
        <span className="form-label">{label}</span>
        <span className={`form-status ${quality}`}>{text}</span>
      </div>
      <div className="balance-track">
        <span className="balance-side">L</span>
        <div className="balance-rail">
          <div className="balance-zone" />
          <div className="balance-center-mark" />
          <div
            className={`balance-dot ${quality}`}
            style={{ left: `${pos}%` }}
          />
        </div>
        <span className="balance-side">R</span>
      </div>
    </div>
  );
}

function TrunkFBSection({ angle }: { angle: number | null }) {
  // ta: positive = forward lean → rotate left (negative), negative = back lean → rotate right
  const rawTilt = Math.max(-30, Math.min(30, -(angle ?? 0) * (30 / 45)));
  const tiltDeg = useSmoothed(rawTilt, 0.2);
  const deviation = Math.abs(tiltDeg);

  let quality: Quality;
  if (deviation <= 2) quality = 'good';
  else if (deviation <= 5) quality = 'warning';
  else quality = 'poor';

  const text = getTrunkFBText(tiltDeg, quality);

  return (
    <div className="trunk-section">
      <span className="form-label">Trunk F/B</span>
      <div className="trunk-visual">
        <div
          className={`trunk-line ${quality}`}
          style={{ transform: `rotate(${tiltDeg}deg)` }}
        >
          <div className="trunk-end top" />
          <div className="trunk-bubble" />
          <div className="trunk-end bottom" />
        </div>
      </div>
      <span className={`form-status ${quality}`}>{text}</span>
    </div>
  );
}

function TrunkSection({ balance }: { balance: number | null }) {
  // Map balance (0-100, 50=center) to tilt degrees — exaggerated for visibility
  const rawTilt = Math.max(-30, Math.min(30, ((balance ?? 50) - 50) * 2.0));
  const tiltDeg = useSmoothed(rawTilt, 0.2);
  const deviation = Math.abs(tiltDeg);

  let quality: Quality;
  if (deviation <= 2) quality = 'good';
  else if (deviation <= 5) quality = 'warning';
  else quality = 'poor';

  const text = getTrunkText(tiltDeg, quality);

  return (
    <div className="trunk-section">
      <span className="form-label">Trunk L/R</span>
      <div className="trunk-visual">
        <div
          className={`trunk-line ${quality}`}
          style={{ transform: `rotate(${tiltDeg}deg)` }}
        >
          <div className="trunk-end top" />
          <div className="trunk-bubble" />
          <div className="trunk-end bottom" />
        </div>
      </div>
      <span className={`form-status ${quality}`}>{text}</span>
    </div>
  );
}

export default function FormIndicator({
  handForceLeft,
  handForceRight,
  footForceLeft,
  footForceRight,
  trunkBalance,
  trunkAngle,
}: FormIndicatorProps) {
  return (
    <div className="form-indicator">
      <div className="form-balance-stack">
        <BalanceSection
          label="Hand Balance"
          left={handForceLeft}
          right={handForceRight}
          getText={getBalanceText}
        />
        <div className="form-divider-h" />
        <BalanceSection
          label="Foot Balance"
          left={footForceLeft}
          right={footForceRight}
          getText={getBalanceText}
        />
      </div>
      <div className="form-divider" />
      <TrunkFBSection angle={trunkAngle} />
      <div className="form-divider" />
      <TrunkSection balance={trunkBalance} />
    </div>
  );
}
