
const HEIGHT_LANES = [0.18, 0.5, 0.82] as const;

export interface ObjDef {
  type: 'orb' | 'barrier' | 'boost';
  x: number;
  height: number;
  golden?: boolean;
  moving?: number;
  baseHeight?: number;
}

export type PushFn = (...objs: ObjDef[]) => void;

interface PatternDef {
  name: string;
  threshold: number;
  minTime: number;
  delay: number;
  spawn: (push: PushFn) => void;
}

export const PATTERNS: PatternDef[] = [
  {
    name: 'HEIGHT GATE',
    threshold: 0.18,
    minTime: 8,
    delay: 0.6,
    spawn: (push) => {
      // HEIGHT GATE: barriers at 2 heights, gap at 1
      const gap = Math.floor(Math.random() * 3);
      for (let j = 0; j < 3; j++) {
        if (j === gap) {
          push({ type: 'orb', x: 1.1, height: HEIGHT_LANES[j] });
        } else {
          push({ type: 'barrier', x: 1.1, height: HEIGHT_LANES[j] });
        }
      }
    },
  },
  {
    name: 'HEIGHT RAMP',
    threshold: 0.3,
    minTime: 8,
    delay: 0,
    spawn: (push) => {
      // HEIGHT RAMP: orbs climbing or descending
      const asc = Math.random() < 0.5;
      for (let j = 0; j < 4; j++) {
        const rh = asc ? 0.15 + j * 0.23 : 0.85 - j * 0.23;
        push({ type: 'orb', x: 1.1 + j * 0.06, height: rh });
      }
    },
  },
  {
    name: 'HEIGHT ARC',
    threshold: 0.35,
    minTime: 15,
    delay: 0,
    spawn: (push) => {
      // HEIGHT ARC: orbs in a rising-then-falling arc
      const base = 0.3 + Math.random() * 0.2;
      for (let j = 0; j < 5; j++) {
        const ah = base + Math.sin((j / 4) * Math.PI) * 0.35;
        push({ type: 'orb', x: 1.1 + j * 0.05, height: Math.max(0.05, Math.min(0.95, ah)) });
      }
    },
  },
  {
    name: 'SQUEEZE',
    threshold: 0.42,
    minTime: 30,
    delay: 0.6,
    spawn: (push) => {
      // SQUEEZE: alternating height barriers
      for (let j = 0; j < 3; j++) {
        const bh = j % 2 === 0 ? 0.15 : 0.85;
        push({ type: 'barrier', x: 1.1 + j * 0.08, height: bh });
        push({ type: 'orb', x: 1.1 + j * 0.08, height: 1 - bh });
      }
    },
  },
  {
    name: 'INTENSITY CHALLENGE',
    threshold: 0.48,
    minTime: 40,
    delay: 0,
    spawn: (push) => {
      // INTENSITY CHALLENGE: orbs in height circle + center boost
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2;
        const ch = 0.5 + Math.sin(angle) * 0.35;
        push({ type: 'orb', x: 1.1 + Math.cos(angle) * 0.04, height: Math.max(0.05, Math.min(0.95, ch)) });
      }
      push({ type: 'boost', x: 1.1, height: 0.5 });
    },
  },
  {
    name: 'GOLDEN RAIN',
    threshold: 0.52,
    minTime: 50,
    delay: 1,
    spawn: (push) => {
      // GOLDEN RAIN: shower of golden orbs descending
      for (let j = 0; j < 5; j++) {
        const gh = 0.8 - j * 0.15;
        push({ type: 'orb', x: 1.1 + j * 0.04, height: Math.max(0.1, gh), golden: true });
      }
    },
  },
  {
    name: 'ZIGZAG CHASE',
    threshold: 0.54,
    minTime: 25,
    delay: 0.5,
    spawn: (push) => {
      // ZIGZAG CHASE: orbs alternating high/low
      const startHigh = Math.random() < 0.5;
      for (let j = 0; j < 6; j++) {
        const zh = startHigh ? (j % 2 === 0 ? 0.78 : 0.22) : (j % 2 === 0 ? 0.22 : 0.78);
        push({ type: 'orb', x: 1.1 + j * 0.045, height: zh });
      }
    },
  },
  {
    name: 'DIAMOND FORMATION',
    threshold: 0.58,
    minTime: 20,
    delay: 0.4,
    spawn: (push) => {
      // DIAMOND FORMATION: orbs in a diamond shape
      const dCenter = 0.5;
      const dSpread = 0.25;
      const dPoints = [
      { dx: 0, dh: dSpread },       // top
      { dx: 0.04, dh: 0 },          // right
      { dx: 0, dh: -dSpread },       // bottom
      { dx: -0.04, dh: 0 },         // left
      { dx: 0, dh: 0 },             // center (golden)
      ];
      for (let j = 0; j < dPoints.length; j++) {
        const dp = dPoints[j];
        const dh = Math.max(0.05, Math.min(0.95, dCenter + dp.dh));
        const isCenter = j === 4;
        const dObj: ObjDef = { type: 'orb', x: 1.1 + dp.dx, height: dh };
        if (isCenter) dObj.golden = true;
        push(dObj);
      }
    },
  },
  {
    name: 'SPIRAL',
    threshold: 0.62,
    minTime: 45,
    delay: 0.8,
    spawn: (push) => {
      // SPIRAL: orbs in a helix pattern
      const spiralCenter = 0.5;
      const spiralR = 0.3;
      for (let j = 0; j < 8; j++) {
        const angle = (j / 8) * Math.PI * 2;
        const sh = spiralCenter + Math.sin(angle) * spiralR;
        push({
        type: 'orb',
        x: 1.1 + Math.cos(angle) * 0.06 + j * 0.015,
        height: Math.max(0.05, Math.min(0.95, sh)),
        golden: j === 4,
        });
      }
    },
  },
  {
    name: 'CORRIDOR',
    threshold: 0.66,
    minTime: 30,
    delay: 0.8,
    spawn: (push) => {
      // CORRIDOR: barriers above and below with orbs in the middle
      const corridorCenter = 0.3 + Math.random() * 0.4;
      const gap = 0.22;
      for (let j = 0; j < 3; j++) { // Top barrier
        push({ type: 'barrier', x: 1.1 + j * 0.08, height: Math.min(0.95, corridorCenter + gap) });
        // Bottom barrier
        push({ type: 'barrier', x: 1.1 + j * 0.08, height: Math.max(0.05, corridorCenter - gap) });
        // Orb in center
        push({ type: 'orb', x: 1.1 + j * 0.08, height: corridorCenter, golden: j === 1 });
      }
    },
  },
  {
    name: 'FUNNEL',
    threshold: 0.7,
    minTime: 35,
    delay: 1.2,
    spawn: (push) => {
      // FUNNEL: barriers narrowing to a point, orb at the end
      const funnelCenter = 0.3 + Math.random() * 0.4;
      for (let j = 0; j < 4; j++) {
        const spread = 0.35 - j * 0.07;
        push({ type: 'barrier', x: 1.1 + j * 0.06, height: Math.min(0.95, funnelCenter + spread) });
        push({ type: 'barrier', x: 1.1 + j * 0.06, height: Math.max(0.05, funnelCenter - spread) });
      }
      // Reward at the narrow end
      push({ type: 'boost', x: 1.1 + 0.26, height: funnelCenter });
    },
  },
  {
    name: 'WAVE GATE',
    threshold: 0.74,
    minTime: 50,
    delay: 1.2,
    spawn: (push) => {
      // WAVE GATE: barriers that form a moving gate requiring timing
      const gateCenter = 0.5;
      for (let j = 0; j < 3; j++) { // Upper barrier (moving)
        const topB: ObjDef = {
        type: 'barrier',
        x: 1.1 + j * 0.09, height: gateCenter + 0.25,
        moving: 1.0 + j * 0.3,
        baseHeight: gateCenter + 0.25,
        };
        push(topB);
        // Lower barrier (moving opposite phase)
        const botB: ObjDef = {
        type: 'barrier',
        x: 1.1 + j * 0.09, height: gateCenter - 0.25,
        moving: 1.0 + j * 0.3,
        baseHeight: gateCenter - 0.25,
        };
        push(botB);
      }
      // Golden reward after the gates
      push({ type: 'orb', x: 1.1 + 0.3, height: gateCenter, golden: true });
    },
  },
  {
    name: 'BONUS RUSH',
    threshold: 0.78,
    minTime: 15,
    delay: 0.8,
    spawn: (push) => {
      // BONUS RUSH: straight line of orbs + boost at end
      const rushH = HEIGHT_LANES[Math.floor(Math.random() * 3)];
      for (let j = 0; j < 6; j++) {
        push({ type: 'orb', x: 1.1 + j * 0.035, height: rushH });
      }
      push({ type: 'boost', x: 1.1 + 6 * 0.035, height: rushH });
    },
  },
  {
    name: 'DOUBLE HELIX',
    threshold: 0.82,
    minTime: 55,
    delay: 1,
    spawn: (push) => {
      // DOUBLE HELIX: two intertwined spiral paths
      for (let j = 0; j < 8; j++) {
        const angle = (j / 8) * Math.PI * 2;
        const h1 = 0.5 + Math.sin(angle) * 0.3;
        const h2 = 0.5 + Math.cos(angle) * 0.3;
        push({ type: 'orb', x: 1.1 + j * 0.03, height: Math.max(0.05, Math.min(0.95, h1)) });
        push({ type: 'orb', x: 1.1 + j * 0.03, height: Math.max(0.05, Math.min(0.95, h2)), golden: j === 3 || j === 7 });
      }
    },
  },
  {
    name: 'STAIRCASE',
    threshold: 0.86,
    minTime: 25,
    delay: 0.8,
    spawn: (push) => {
      // STAIRCASE: ascending steps of barriers + orbs
      const ascending = Math.random() < 0.5;
      for (let j = 0; j < 5; j++) {
        const stepH = ascending ? 0.15 + j * 0.16 : 0.79 - j * 0.16;
        // Barrier below/above the step
        const barrierH = ascending ? stepH - 0.15 : stepH + 0.15;
        if (barrierH > 0.05 && barrierH < 0.95) {
          push({ type: 'barrier', x: 1.1 + j * 0.06, height: barrierH });
        }
        // Orb on the step
        push({ type: 'orb', x: 1.1 + j * 0.06, height: Math.max(0.05, Math.min(0.95, stepH)), golden: j === 4 });
      }
    },
  },
  {
    name: 'GAUNTLET',
    threshold: 0.9,
    minTime: 40,
    delay: 1,
    spawn: (push) => {
      // GAUNTLET: alternating high/low barriers forcing weaving + orbs between
      for (let j = 0; j < 5; j++) {
        const bH = j % 2 === 0 ? 0.8 : 0.2;
        push({ type: 'barrier', x: 1.1 + j * 0.06, height: bH });
        // Orb in the safe zone
        push({ type: 'orb', x: 1.1 + j * 0.06 + 0.03, height: 1 - bH, golden: j === 4 });
      }
    },
  },
  {
    name: 'CHALLENGE GATE',
    threshold: 0.94,
    minTime: 60,
    delay: 1.5,
    spawn: (push) => {
      // CHALLENGE GATE: narrow passage through 4 barriers, big reward
      const gateH = 0.3 + Math.random() * 0.4;
      const gateWidth = 0.15; // narrow gap
      // 4 barriers creating a wall with one tiny gap
      for (let j = 0; j < 4; j++) {
        const bh = j < 2
        ? gateH - gateWidth - j * 0.2   // below gap
        : gateH + gateWidth + (j - 2) * 0.2; // above gap
        if (bh > 0.02 && bh < 0.98) {
          push({ type: 'barrier', x: 1.1, height: bh });
        }
      }
      // Big reward after the gate
      push({ type: 'boost', x: 1.18, height: gateH });
      push({ type: 'orb', x: 1.22, height: gateH, golden: true });
    },
  },
  {
    name: 'PINBALL',
    threshold: 0.928,
    minTime: 30,
    delay: 1,
    spawn: (push) => {
      // PINBALL: barriers at top and bottom with bouncing orbs between them
      for (let j = 0; j < 4; j++) { // Top/bottom barriers
        push({ type: 'barrier', x: 1.1 + j * 0.07, height: 0.9 });
        push({ type: 'barrier', x: 1.1 + j * 0.07, height: 0.1 });
        // Orb bouncing between barriers (at alternating heights)
        const orbH = j % 2 === 0 ? 0.35 + Math.random() * 0.1 : 0.55 + Math.random() * 0.1;
        push({ type: 'orb', x: 1.1 + j * 0.07 + 0.035, height: orbH, golden: j === 3 });
      }
    },
  },
  {
    name: 'AMBUSH',
    threshold: 0.932,
    minTime: 40,
    delay: 1,
    spawn: (push) => {
      // AMBUSH: tight cluster of barriers that appears close with golden escape reward
      const ambushH = 0.2 + Math.random() * 0.6;
      const ambushX = 1.02; // spawn closer than normal
      push({ type: 'barrier', x: ambushX, height: Math.min(0.95, ambushH + 0.2) });
      push({ type: 'barrier', x: ambushX, height: Math.max(0.05, ambushH - 0.2) });
      push({ type: 'barrier', x: ambushX + 0.04, height: Math.min(0.95, ambushH + 0.35) });
      push({ type: 'barrier', x: ambushX + 0.04, height: Math.max(0.05, ambushH - 0.35) });
      // Escape reward
      push({ type: 'orb', x: ambushX + 0.08, height: ambushH, golden: true });
    },
  },
  {
    name: 'SPIRIT DEBRIS',
    threshold: 0.935,
    minTime: 35,
    delay: 1.2,
    spawn: (push) => {
      // SPIRIT DEBRIS: scattered barriers with sparse orbs between
      const fieldCount = 5 + Math.floor(Math.random() * 3);
      for (let j = 0; j < fieldCount; j++) {
        const fh = 0.1 + Math.random() * 0.8;
        const fx = 1.1 + Math.random() * 0.15;
        if (Math.random() < 0.45) {
          push({ type: 'barrier', x: fx, height: fh });
        } else {
          push({ type: 'orb', x: fx, height: fh, golden: Math.random() < 0.15 });
        }
      }
    },
  },
  {
    name: 'PENDULUM',
    threshold: 0.94,
    minTime: 50,
    delay: 1.2,
    spawn: (push) => {
      // PENDULUM: wide-swinging moving barriers with orbs between
      const pendCenter = 0.5;
      for (let j = 0; j < 3; j++) {
        const pendB: ObjDef = {
        type: 'barrier',
        x: 1.1 + j * 0.09, height: pendCenter + (j % 2 === 0 ? 0.2 : -0.2),
        moving: 2.0 + j * 0.5, // fast oscillation
        baseHeight: pendCenter + (j % 2 === 0 ? 0.2 : -0.2),
        };
        push(pendB);
        // Safe orb at center when barrier swings away
        push({ type: 'orb', x: 1.1 + j * 0.09 + 0.04, height: pendCenter, golden: j === 2 });
      }
    },
  },
  {
    name: 'CROSSFIRE',
    threshold: 0.945,
    minTime: 45,
    delay: 1,
    spawn: (push) => {
      // CROSSFIRE: barriers from top and bottom converging on center
      const crossCenter = 0.4 + Math.random() * 0.2;
      for (let j = 0; j < 3; j++) { // Top barriers closing in
        push({ type: 'barrier', x: 1.1 + j * 0.06, height: Math.min(0.95, crossCenter + 0.3 - j * 0.08) });
        // Bottom barriers closing in
        push({ type: 'barrier', x: 1.1 + j * 0.06, height: Math.max(0.05, crossCenter - 0.3 + j * 0.08) });
      }
      // Reward orbs in the safe center channel
      for (let j = 0; j < 3; j++) {
        push({ type: 'orb', x: 1.1 + j * 0.06, height: crossCenter, golden: j === 2 });
      }
    },
  },
  {
    name: 'WINDING RIVER',
    threshold: 0.95,
    minTime: 20,
    delay: 1,
    spawn: (push) => {
      // WINDING RIVER: continuous S-curve of orbs to follow
      const riverBase = 0.5;
      const riverAmp = 0.3;
      for (let j = 0; j < 10; j++) {
        const rh = riverBase + Math.sin(j * 0.7) * riverAmp;
        push({
        type: 'orb',
        x: 1.1 + j * 0.03,
        height: Math.max(0.05, Math.min(0.95, rh)),
        golden: j === 9,
        });
      }
    },
  },
  {
    name: 'SLALOM',
    threshold: 0.955,
    minTime: 30,
    delay: 1,
    spawn: (push) => {
      // SLALOM: alternating barriers forcing S-curve path with rewards
      const slalomHigh = Math.random() < 0.5;
      for (let j = 0; j < 5; j++) {
        const isTop = (j % 2 === 0) === slalomHigh;
        const bh = isTop ? 0.75 + Math.random() * 0.15 : 0.1 + Math.random() * 0.15;
        push({ type: 'barrier', x: 1.1 + j * 0.055, height: bh });
        // Orb at safe height between barriers
        const orbH = isTop ? 0.25 + Math.random() * 0.1 : 0.65 + Math.random() * 0.1;
        push({ type: 'orb', x: 1.1 + j * 0.055 + 0.025, height: orbH, golden: j === 4 });
      }
    },
  },
  {
    name: 'TREASURE VAULT',
    threshold: 0.97,
    minTime: 55,
    delay: 1.5,
    spawn: (push) => {
      // TREASURE VAULT: ring of barriers surrounding golden cluster
      const vaultCenter = 0.3 + Math.random() * 0.4;
      const vaultR = 0.2;
      // 6 barriers forming a ring
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2;
        const bh = vaultCenter + Math.sin(angle) * vaultR;
        const bx = 1.1 + Math.cos(angle) * 0.06;
        if (bh > 0.05 && bh < 0.95) {
          push({ type: 'barrier', x: bx, height: bh });
        }
      }
      // Golden orb cluster inside the vault
      push({ type: 'orb', x: 1.1, height: vaultCenter, golden: true });
      push({ type: 'orb', x: 1.07, height: vaultCenter + 0.08, golden: true });
      push({ type: 'orb', x: 1.07, height: vaultCenter - 0.08, golden: true });
      push({ type: 'boost', x: 1.13, height: vaultCenter });
    },
  },
  {
    name: 'TRENCH RUN',
    threshold: 0.956,
    minTime: 55,
    delay: 2,
    spawn: (push) => {
      // TRENCH RUN: long narrow corridor requiring sustained height hold
      const trenchH = 0.3 + Math.random() * 0.4;
      const trenchWidth = 0.12;
      const trenchLen = 10;
      for (let j = 0; j < trenchLen; j++) {
        const tx = 1.1 + j * 0.025;
        // Upper wall
        push({ type: 'barrier', x: tx, height: Math.min(0.95, trenchH + trenchWidth) });
        // Lower wall
        push({ type: 'barrier', x: tx, height: Math.max(0.05, trenchH - trenchWidth) });
        // Occasional orb in the trench
        if (j % 3 === 1) {
          push({ type: 'orb', x: tx + 0.01, height: trenchH, golden: j === trenchLen - 2 });
        }
      }
      // Big reward at end of trench
      push({ type: 'boost', x: 1.1 + trenchLen * 0.025 + 0.03, height: trenchH });
    },
  },
  {
    name: 'SPIRAL STAIRCASE',
    threshold: 0.957,
    minTime: 45,
    delay: 1.2,
    spawn: (push) => {
      // SPIRAL STAIRCASE: barriers arranged in ascending spiral with orbs in gaps
      const spiralSteps = 8;
      const spiralBase = 0.15;
      const spiralTop = 0.85;
      for (let j = 0; j < spiralSteps; j++) {
        const progress = j / (spiralSteps - 1);
        const sh = spiralBase + (spiralTop - spiralBase) * progress;
        const sx = 1.1 + j * 0.03;
        // Alternating sides: barrier on one side, orb on the other
        const side = j % 2 === 0 ? 1 : -1;
        push({ type: 'barrier', x: sx, height: Math.max(0.05, Math.min(0.95, sh + side * 0.08)) });
        push({ type: 'orb', x: sx + 0.015, height: Math.max(0.05, Math.min(0.95, sh - side * 0.05)), golden: j === spiralSteps - 1 });
      }
    },
  },
  {
    name: 'DOUBLE DIAMOND',
    threshold: 0.958,
    minTime: 40,
    delay: 1,
    spawn: (push) => {
      // DOUBLE DIAMOND: two diamond formations side by side — choose your path
      const diamondH1 = 0.25 + Math.random() * 0.1;
      const diamondH2 = 0.65 + Math.random() * 0.1;
      for (const dh of [diamondH1, diamondH2]) {
        const diamR = 0.1;
        const points = [
        { dx: 0, dy: 0
        }
        ,     // left
        { dx: 0.03, dy: diamR
        }
        ,  // top
        { dx: 0.06, dy: 0
        }
        ,  // right
        { dx: 0.03, dy: -diamR
        }
        , // bottom
        ];
        for (const p of points) {
          const bh = dh + p.dy;
          if (bh > 0.05 && bh < 0.95) {
            push({ type: 'barrier', x: 1.1 + p.dx, height: bh });
          }
        }
        // Orb reward inside each diamond
        push({ type: 'orb', x: 1.13, height: dh, golden: dh === diamondH2 });
      }
    },
  },
  {
    name: 'LADDER',
    threshold: 0.96,
    minTime: 35,
    delay: 1,
    spawn: (push) => {
      // LADDER: ascending platforms of barriers with orbs in between like rungs
      const ladderStart = 0.15 + Math.random() * 0.15;
      const ladderStep = 0.13;
      const rungs = 5;
      const ascending = Math.random() < 0.5;
      for (let j = 0; j < rungs; j++) {
        const rungH = ascending ? ladderStart + j * ladderStep : (1 - ladderStart) - j * ladderStep;
        const rx = 1.1 + j * 0.05;
        // Barrier "rung" — horizontal platform
        push({ type: 'barrier', x: rx, height: Math.max(0.05, Math.min(0.95, rungH)) });
        // Orb between rungs (in the gap above/below)
        const orbH = ascending ? rungH + ladderStep * 0.5 : rungH - ladderStep * 0.5;
        if (orbH > 0.05 && orbH < 0.95) {
          push({ type: 'orb', x: rx + 0.025, height: orbH, golden: j === rungs - 1 });
        }
      }
    },
  },
  {
    name: 'SCATTER BOMB',
    threshold: 0.962,
    minTime: 50,
    delay: 1.2,
    spawn: (push) => {
      // SCATTER BOMB: barriers diverge outward from center, orbs in the calm center
      const bombCenter = 0.4 + Math.random() * 0.2;
      const bombX = 1.1;
      // Central rewards (the calm eye)
      push({ type: 'orb', x: bombX, height: bombCenter, golden: true });
      push({ type: 'orb', x: bombX + 0.02, height: bombCenter });
      // Barriers radiating outward
      for (let j = 0; j < 5; j++) {
        const angle = (j / 5) * Math.PI * 2;
        const dist = 0.2 + j * 0.02;
        const bh = bombCenter + Math.sin(angle) * dist;
        const bx = bombX + 0.03 + Math.cos(angle) * 0.06;
        if (bh > 0.05 && bh < 0.95) {
          push({ type: 'barrier', x: bx, height: bh });
        }
      }
    },
  },
  {
    name: 'CONVERGENCE',
    threshold: 0.964,
    minTime: 60,
    delay: 1.3,
    spawn: (push) => {
      // CONVERGENCE: scattered objects that funnel to a single point
      const targetH = 0.3 + Math.random() * 0.4;
      const startSpread = 0.4;
      const convLen = 7;
      for (let j = 0; j < convLen; j++) {
        const progress = j / (convLen - 1); // 0 → 1
        const spread = startSpread * (1 - progress);
        const oh = targetH + (j % 2 === 0 ? spread : -spread);
        const clampedH = Math.max(0.05, Math.min(0.95, oh));
        const ox = 1.1 + j * 0.035;
        if (Math.random() < 0.35) {
          push({ type: 'barrier', x: ox, height: clampedH });
        } else {
          push({ type: 'orb', x: ox, height: clampedH, golden: j === convLen - 1 });
        }
      }
      // Reward at convergence point
      push({ type: 'boost', x: 1.1 + convLen * 0.035 + 0.02, height: targetH });
    },
  },
  {
    name: 'PORTAL',
    threshold: 0.966,
    minTime: 65,
    delay: 2,
    spawn: (push) => {
      // PORTAL: ring of boosts creating a portal effect — massive reward if all collected
      const portalCenter = 0.3 + Math.random() * 0.4;
      const portalR = 0.22;
      const portalCount = 6;
      for (let j = 0; j < portalCount; j++) {
        const angle = (j / portalCount) * Math.PI * 2;
        const oh = portalCenter + Math.sin(angle) * portalR;
        const ox = 1.1 + Math.cos(angle) * 0.04;
        if (oh > 0.05 && oh < 0.95) { // Alternate between boosts and golden orbs
          if (j % 2 === 0) {
            push({ type: 'boost', x: ox, height: oh });
          } else {
            push({ type: 'orb', x: ox, height: oh, golden: true });
          }
        }
      }
      // Center super-golden orb
      push({ type: 'orb', x: 1.1, height: portalCenter, golden: true });
    },
  },
  {
    name: 'GAUNTLET MAZE',
    threshold: 0.968,
    minTime: 55,
    delay: 1.5,
    spawn: (push) => {
      // GAUNTLET MAZE: dense corridor with tight turns
      const mazeH = 0.3 + Math.random() * 0.4;
      const corridorW = 0.15;
      const turnCount = 6;
      let currentH = mazeH;
      for (let j = 0; j < turnCount; j++) {
        const mx = 1.1 + j * 0.04;
        // Walls above and below corridor
        push({ type: 'barrier', x: mx, height: Math.min(0.95, currentH + corridorW) });
        push({ type: 'barrier', x: mx, height: Math.max(0.05, currentH - corridorW) });
        // Orb in the safe corridor
        if (j % 2 === 0) {
          push({ type: 'orb', x: mx + 0.02, height: currentH, golden: j === turnCount - 2 });
        }
        // Corridor shifts direction each step
        const shift = (j % 2 === 0 ? 1 : -1) * 0.15;
        currentH = Math.max(0.2, Math.min(0.8, currentH + shift));
      }
      // Boost reward at end
      push({ type: 'boost', x: 1.1 + turnCount * 0.04 + 0.03, height: currentH });
    },
  },
  {
    name: 'ZIGZAG WALL',
    threshold: 0.97,
    minTime: 45,
    delay: 1.2,
    spawn: (push) => {
      // ZIGZAG WALL: alternating solid walls forcing rapid height changes
      const wallCount = 5;
      for (let j = 0; j < wallCount; j++) {
        const isHigh = j % 2 === 0;
        // Wall covers either top 60% or bottom 60%, leaving a gap
        if (isHigh) { // Barriers at top, gap at bottom
          push({ type: 'barrier', x: 1.1 + j * 0.05, height: 0.85 });
          push({ type: 'barrier', x: 1.1 + j * 0.05, height: 0.55 });
          // Reward in the gap
          push({ type: 'orb', x: 1.1 + j * 0.05, height: 0.2, golden: j === wallCount - 1 });
        } else { // Barriers at bottom, gap at top
          push({ type: 'barrier', x: 1.1 + j * 0.05, height: 0.15 });
          push({ type: 'barrier', x: 1.1 + j * 0.05, height: 0.45 });
          // Reward in the gap
          push({ type: 'orb', x: 1.1 + j * 0.05, height: 0.8, golden: j === wallCount - 1 });
        }
      }
    },
  },
  {
    name: 'CHECKPOINT RUSH',
    threshold: 0.972,
    minTime: 40,
    delay: 1.3,
    spawn: (push) => {
      // CHECKPOINT RUSH: series of narrow gates with incrementing rewards
      const gateCount = 4;
      const gateCenter = 0.3 + Math.random() * 0.4;
      const gateSpread = 0.12;
      for (let j = 0; j < gateCount; j++) {
        const gx = 1.1 + j * 0.07;
        // Two barriers forming a narrow gate — slight vertical drift each gate
        const drift = Math.sin(j * 1.5) * 0.08;
        const gc = gateCenter + drift;
        push({ type: 'barrier', x: gx, height: Math.min(0.95, gc + gateSpread) });
        push({ type: 'barrier', x: gx, height: Math.max(0.05, gc - gateSpread) });
        // Reward escalates: normal → normal → golden → boost
        const rewardType: ObjDef['type'] = j === gateCount - 1 ? 'boost' : 'orb';
        push({ type: rewardType, x: gx + 0.035, height: gc, golden: j === gateCount - 2 });
      }
    },
  },
  {
    name: 'HELIX CHASE',
    threshold: 0.973,
    minTime: 50,
    delay: 1.5,
    spawn: (push) => {
      // HELIX CHASE: double helix of barriers with orbs threading through the center gap
      const helixCenter = 0.5;
      const helixAmp = 0.3;
      const helixLen = 8;
      for (let j = 0; j < helixLen; j++) {
        const phase1 = (j / helixLen) * Math.PI * 2;
        const bh1 = helixCenter + Math.sin(phase1) * helixAmp;
        const bh2 = helixCenter - Math.sin(phase1) * helixAmp;
        const bx = 1.1 + j * 0.035;
        // Top and bottom barrier helixes
        if (bh1 > 0.05 && bh1 < 0.95) {
          push({ type: 'barrier', x: bx, height: bh1 });
        }
        if (bh2 > 0.05 && bh2 < 0.95) {
          push({ type: 'barrier', x: bx, height: bh2 });
        }
        // Orbs at the crossing points (center gap)
        if (j % 2 === 0) {
          push({ type: 'orb', x: bx + 0.015, height: helixCenter, golden: j === helixLen - 2 });
        }
      }
    },
  },
  {
    name: 'ORBIT',
    threshold: 0.975,
    minTime: 60,
    delay: 1.5,
    spawn: (push) => {
      // ORBIT: rotating ring of orbs and barriers that spins as it approaches
      const orbitCenter = 0.3 + Math.random() * 0.4;
      const orbitR = 0.18;
      const orbitCount = 8;
      const orbitPhase = Math.random() * Math.PI * 2;
      for (let j = 0; j < orbitCount; j++) {
        const angle = (j / orbitCount) * Math.PI * 2 + orbitPhase;
        const oh = orbitCenter + Math.sin(angle) * orbitR;
        const ox = 1.1 + Math.cos(angle) * 0.05;
        if (oh < 0.05 || oh > 0.95) continue;
        const isBarrier = j % 3 === 0;
        if (isBarrier) {
          push({
          type: 'barrier',
          x: ox, height: oh,
          moving: 1.8, baseHeight: oh,
          });
        } else {
          push({
          type: 'orb',
          x: ox, height: oh,
          golden: j === orbitCount - 1,
          });
        }
      }
      // Center boost reward
      push({ type: 'boost', x: 1.1, height: orbitCenter });
    },
  },
  {
    name: 'FUNNEL',
    threshold: 0.9726,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // FUNNEL: wide opening narrows to tight squeeze with reward at end
      const funnelCenter = 0.4 + Math.random() * 0.2;
      const funnelLen = 7;
      const funnelStart = 0.35; // wide opening
      const funnelEnd = 0.08;   // tight squeeze
      for (let j = 0; j < funnelLen; j++) {
        const progress = j / (funnelLen - 1);
        const halfWidth = funnelStart + (funnelEnd - funnelStart) * progress;
        const fx = 1.1 + j * 0.035;
        // Top wall
        push({ type: 'barrier', x: fx, height: Math.min(0.95, funnelCenter + halfWidth) });
        // Bottom wall
        push({ type: 'barrier', x: fx, height: Math.max(0.05, funnelCenter - halfWidth) });
        // Orbs along the funnel center
        if (j % 2 === 1) {
          push({ type: 'orb', x: fx + 0.015, height: funnelCenter, golden: j >= funnelLen - 2 });
        }
      }
      // Reward at the narrow exit
      push({ type: 'boost', x: 1.1 + funnelLen * 0.035 + 0.02, height: funnelCenter });
    },
  },
  {
    name: 'MIRROR',
    threshold: 0.9728,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // MIRROR: symmetric objects mirrored around center height (0.5)
      const mirrorLen = 5;
      for (let j = 0; j < mirrorLen; j++) {
        const mx = 1.1 + j * 0.04;
        const offset = 0.1 + j * 0.04;
        const isBarrier = j % 2 === 0;
        // Top half
        const topH = 0.5 - offset;
        // Bottom half (mirrored)
        const botH = 0.5 + offset;
        if (isBarrier) {
          push({ type: 'barrier', x: mx, height: Math.max(0.05, topH) });
          push({ type: 'barrier', x: mx, height: Math.min(0.95, botH) });
        } else {
          push({ type: 'orb', x: mx, height: Math.max(0.05, topH), golden: j === mirrorLen - 1 });
          push({ type: 'orb', x: mx, height: Math.min(0.95, botH), golden: j === mirrorLen - 1 });
        }
      }
      // Center line golden + boost
      push({ type: 'orb', x: 1.1 + mirrorLen * 0.04, height: 0.5, golden: true });
      push({ type: 'boost', x: 1.1 + mirrorLen * 0.04 + 0.03, height: 0.5 });
    },
  },
  {
    name: 'WEAVE',
    threshold: 0.9724,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // WEAVE: sinusoidal path of orbs flanked by barriers requiring continuous vertical adjustment
      const weaveLen = 10;
      const weaveAmp = 0.3;
      const weaveFreq = 2.5;
      for (let j = 0; j < weaveLen; j++) {
        const progress = j / (weaveLen - 1);
        const wx = 1.1 + j * 0.03;
        const waveH = 0.5 + Math.sin(progress * Math.PI * weaveFreq) * weaveAmp;
        const safeH = Math.max(0.08, Math.min(0.92, waveH));
        // Orb on the sine wave path
        push({ type: 'orb', x: wx, height: safeH, golden: j === weaveLen - 1 });
        // Flanking barriers above and below the path
        if (j % 2 === 0) {
          const upperBarrier = Math.max(0.05, safeH - 0.18);
          const lowerBarrier = Math.min(0.95, safeH + 0.18);
          push({ type: 'barrier', x: wx + 0.01, height: upperBarrier });
          push({ type: 'barrier', x: wx + 0.01, height: lowerBarrier });
        }
      }
      // Boost reward at end
      push({ type: 'boost', x: 1.1 + weaveLen * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'CATAPULT',
    threshold: 0.9675,
    minTime: 40,
    delay: 1.5,
    spawn: (push) => {
      // CATAPULT: spring-loaded barrier gate followed by orb cascade launch
      const catCenter = 0.35 + Math.random() * 0.3;
      // Tight barrier gate (spring)
      push({ type: 'barrier', x: 1.1, height: Math.max(0.05, catCenter - 0.18) });
      push({ type: 'barrier', x: 1.1, height: Math.min(0.95, catCenter + 0.18) });
      push({ type: 'barrier', x: 1.13, height: Math.max(0.05, catCenter - 0.15) });
      push({ type: 'barrier', x: 1.13, height: Math.min(0.95, catCenter + 0.15) });
      // Orb cascade launching outward from gate (parabolic arc)
      const cascadeLen = 6;
      for (let ci = 0; ci < cascadeLen; ci++) {
        const cx = 1.15 + ci * 0.03;
        const launchArc = -0.3 * Math.pow(ci / (cascadeLen - 1), 2) + 0.3 * (ci / (cascadeLen - 1));
        const ch = catCenter - launchArc;
        if (ch > 0.05 && ch < 0.95) {
          push({ type: 'orb', x: cx, height: ch, golden: ci >= cascadeLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.15 + cascadeLen * 0.03 + 0.02, height: catCenter });
    },
  },
  {
    name: 'BARRICADE',
    threshold: 0.9674,
    minTime: 45,
    delay: 1.8,
    spawn: (push) => {
      // BARRICADE: thick multi-layer barrier wall with one narrow escape tunnel
      const tunnelCenter = 0.2 + Math.random() * 0.6;
      const tunnelGap = 0.1;
      const wallDepth = 5;
      for (let wi = 0; wi < wallDepth; wi++) {
        const wx = 1.1 + wi * 0.02;
        // Stack barriers above tunnel
        const aboveCount = 3;
        for (let ai = 0; ai < aboveCount; ai++) {
          const ah = (tunnelCenter - tunnelGap / 2) * (ai / aboveCount);
          if (ah > 0.05 && ah < 0.95) {
            push({ type: 'barrier', x: wx + ai * 0.003, height: ah });
          }
        }
        // Stack barriers below tunnel
        for (let bi = 0; bi < aboveCount; bi++) {
          const bh = tunnelCenter + tunnelGap / 2 + (1 - tunnelCenter - tunnelGap / 2) * ((bi + 1) / aboveCount);
          if (bh > 0.05 && bh < 0.95) {
            push({ type: 'barrier', x: wx + bi * 0.003, height: bh });
          }
        }
      }
      // Reward orbs inside the tunnel
      for (let ti = 0; ti < 4; ti++) {
        push({ type: 'orb', x: 1.11 + ti * 0.02, height: tunnelCenter, golden: ti === 3 });
      }
      push({ type: 'boost', x: 1.1 + wallDepth * 0.02 + 0.03, height: tunnelCenter });
    },
  },
  {
    name: 'VORTEX',
    threshold: 0.9673,
    minTime: 50,
    delay: 1.6,
    spawn: (push) => {
      // VORTEX: spiral of barriers pulling inward toward a central orb cluster
      const vortCenter = 0.4 + Math.random() * 0.2;
      const vortArms = 3;
      const vortPoints = 5;
      for (let va = 0; va < vortArms; va++) {
        const armAngle = (va / vortArms) * Math.PI * 2;
        for (let vp = 0; vp < vortPoints; vp++) {
          const spiralR = 0.25 - vp * 0.04;
          const spiralAngle = armAngle + vp * 0.5;
          const vx = 1.1 + Math.cos(spiralAngle) * spiralR * 0.3 + vp * 0.02;
          const vh = vortCenter + Math.sin(spiralAngle) * spiralR;
          if (vh > 0.05 && vh < 0.95) {
            push({ type: 'barrier', x: vx, height: vh });
          }
        }
      }
      // Central orb cluster
      for (let vc = 0; vc < 5; vc++) {
        const vcAngle = (vc / 5) * Math.PI * 2;
        const vcH = vortCenter + Math.sin(vcAngle) * 0.04;
        const vcX = 1.15 + Math.cos(vcAngle) * 0.015 + vortPoints * 0.02;
        push({ type: 'orb', x: vcX, height: vcH, golden: vc === 0 });
      }
      push({ type: 'boost', x: 1.15 + vortPoints * 0.02 + 0.03, height: vortCenter });
    },
  },
  {
    name: 'MAZE RUNNER',
    threshold: 0.9672,
    minTime: 40,
    delay: 1.8,
    spawn: (push) => {
      // MAZE RUNNER: corridor walls with turns requiring height changes
      const corridorLen = 12;
      let mazeH = 0.3 + Math.random() * 0.4;
      const mazeGap = 0.12;
      for (let mi = 0; mi < corridorLen; mi++) {
        const mx = 1.1 + mi * 0.025;
        // Turn every 3 segments
        if (mi > 0 && mi % 3 === 0) {
          const turnDir = Math.random() > 0.5 ? 1 : -1;
          mazeH = Math.max(0.15, Math.min(0.85, mazeH + turnDir * 0.15));
        }
        // Top wall
        const topWall = mazeH - mazeGap;
        if (topWall > 0.05) {
          push({ type: 'barrier', x: mx, height: topWall });
        }
        // Bottom wall
        const botWall = mazeH + mazeGap;
        if (botWall < 0.95) {
          push({ type: 'barrier', x: mx, height: botWall });
        }
        // Orbs in the corridor
        if (mi % 2 === 1) {
          push({ type: 'orb', x: mx, height: mazeH, golden: mi === corridorLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + corridorLen * 0.025 + 0.02, height: mazeH });
    },
  },
  {
    name: 'PINWHEEL',
    threshold: 0.9671,
    minTime: 45,
    delay: 1.5,
    spawn: (push) => {
      // PINWHEEL: barriers radiating like pinwheel blades with orbs between
      const pwCenter = 0.35 + Math.random() * 0.3;
      const pwBlades = 5;
      const pwRadius = 0.2;
      for (let pb = 0; pb < pwBlades; pb++) {
        const bladeAngle = (pb / pwBlades) * Math.PI * 2;
        const bladeLen = 4;
        for (let bl = 0; bl < bladeLen; bl++) {
          const bRad = pwRadius * ((bl + 1) / bladeLen);
          const bx = 1.12 + Math.cos(bladeAngle) * bRad * 0.3;
          const bh = pwCenter + Math.sin(bladeAngle) * bRad;
          if (bh > 0.05 && bh < 0.95) {
            push({ type: 'barrier', x: bx, height: bh });
          }
        }
        // Orb between blades
        const orbAngle = bladeAngle + Math.PI / pwBlades;
        const orbRad = pwRadius * 0.6;
        const orbH = pwCenter + Math.sin(orbAngle) * orbRad;
        const orbX = 1.12 + Math.cos(orbAngle) * orbRad * 0.3;
        if (orbH > 0.05 && orbH < 0.95) {
          push({ type: 'orb', x: orbX, height: orbH, golden: pb === 0 });
        }
      }
      push({ type: 'boost', x: 1.12 + pwRadius * 0.3 + 0.04, height: pwCenter });
    },
  },
  {
    name: 'SLALOM',
    threshold: 0.967,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // SLALOM: alternating gate barriers requiring weaving up and down
      const slLen = 8;
      const slCenter = 0.5;
      const slAmp = 0.25;
      for (let si = 0; si < slLen; si++) {
        const sx = 1.1 + si * 0.035;
        const gateH = slCenter + (si % 2 === 0 ? slAmp : -slAmp);
        // Gate barrier pair with gap at the target height
        const gateGap = 0.1;
        if (gateH - gateGap > 0.05) {
          push({ type: 'barrier', x: sx, height: gateH - gateGap });
        }
        if (gateH + gateGap < 0.95) {
          push({ type: 'barrier', x: sx, height: gateH + gateGap });
        }
        // Orb in the gate opening
        push({ type: 'orb', x: sx, height: gateH, golden: si === slLen - 1 });
      }
      push({ type: 'boost', x: 1.1 + slLen * 0.035 + 0.02, height: slCenter });
    },
  },
  {
    name: 'TRIDENT',
    threshold: 0.9669,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // TRIDENT: three-pronged barrier formation with orbs in the gaps
      const trCenter = 0.35 + Math.random() * 0.3;
      const trSpread = 0.18;
      const prongs = [trCenter - trSpread, trCenter, trCenter + trSpread];
      // Shaft (lead-in barriers)
      for (let si = 0; si < 3; si++) {
        const sx = 1.1 + si * 0.02;
        push({ type: 'barrier', x: sx, height: trCenter });
      }
      // Three prongs fanning out
      for (let pi = 0; pi < prongs.length; pi++) {
        const prongH = prongs[pi];
        for (let pl = 0; pl < 4; pl++) {
          const px = 1.16 + pl * 0.02;
          const ph = trCenter + (prongH - trCenter) * ((pl + 1) / 4);
          if (ph > 0.05 && ph < 0.95) {
            push({ type: 'barrier', x: px, height: ph });
          }
        }
      }
      // Orbs in gaps between prongs
      for (let gi = 0; gi < 2; gi++) {
        const gapH = (prongs[gi] + prongs[gi + 1]) / 2;
        for (let go = 0; go < 3; go++) {
          const gx = 1.17 + go * 0.02;
          const gapCenter = trCenter + (gapH - trCenter) * ((go + 1) / 3);
          push({ type: 'orb', x: gx, height: gapCenter, golden: go === 2 && gi === 0 });
        }
      }
      push({ type: 'boost', x: 1.26, height: trCenter });
    },
  },
  {
    name: 'GAUNTLET RUSH',
    threshold: 0.9668,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // GAUNTLET RUSH: tight corridor with rapid-fire orbs and narrow barrier gaps
      const grCenter = 0.3 + Math.random() * 0.4;
      const grLen = 14;
      const grGap = 0.09;
      let grH = grCenter;
      for (let gi = 0; gi < grLen; gi++) {
        const gx = 1.1 + gi * 0.02;
        // Slight drift in corridor
        grH += (Math.random() - 0.5) * 0.04;
        grH = Math.max(0.15, Math.min(0.85, grH));
        // Barrier walls (top and bottom)
        if (gi % 2 === 0) {
          if (grH - grGap > 0.05) {
            push({ type: 'barrier', x: gx, height: grH - grGap });
          }
          if (grH + grGap < 0.95) {
            push({ type: 'barrier', x: gx, height: grH + grGap });
          }
        }
        // Rapid-fire orbs every segment
        push({ type: 'orb', x: gx + 0.01, height: grH, golden: gi === grLen - 1 });
      }
      push({ type: 'boost', x: 1.1 + grLen * 0.02 + 0.02, height: grH });
    },
  },
  {
    name: 'LATTICE',
    threshold: 0.9667,
    minTime: 40,
    delay: 1.6,
    spawn: (push) => {
      // LATTICE: grid of barriers with regular holes to weave through
      const latRows = 4;
      const latCols = 6;
      const latTop = 0.15;
      const latBot = 0.85;
      const latStep = (latBot - latTop) / (latRows - 1);
      // Which row has a hole in each column alternates
      for (let lc = 0; lc < latCols; lc++) {
        const holeRow = (lc + Math.floor(Math.random() * 2)) % latRows;
        const lx = 1.1 + lc * 0.03;
        for (let lr = 0; lr < latRows; lr++) {
          const lh = latTop + lr * latStep;
          if (lr === holeRow) { // Orb in the hole
            push({ type: 'orb', x: lx, height: lh, golden: lc === latCols - 1 });
          } else {
            push({ type: 'barrier', x: lx, height: lh });
          }
        }
      }
      push({ type: 'boost', x: 1.1 + latCols * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'CONVEYOR',
    threshold: 0.9666,
    minTime: 35,
    delay: 1.4,
    spawn: (push) => {
      // CONVEYOR: moving barrier platforms with orbs that require timing
      const cvLen = 8;
      const cvBase = 0.3 + Math.random() * 0.3;
      for (let ci = 0; ci < cvLen; ci++) {
        const cx = 1.1 + ci * 0.03;
        // Alternating barriers and orbs on a sine wave path
        const cvH = cvBase + Math.sin(ci * 0.8) * 0.15;
        if (ci % 3 === 0) { // Barrier "platform" pair
          if (cvH - 0.12 > 0.05) {
            push({ type: 'barrier', x: cx, height: cvH - 0.12 });
          }
          if (cvH + 0.12 < 0.95) {
            push({ type: 'barrier', x: cx, height: cvH + 0.12 });
          }
        } else { // Orbs riding the conveyor path
          push({ type: 'orb', x: cx, height: cvH, golden: ci === cvLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + cvLen * 0.03 + 0.02, height: cvBase });
    },
  },
  {
    name: 'PENDULUM',
    threshold: 0.9665,
    minTime: 45,
    delay: 1.5,
    spawn: (push) => {
      // PENDULUM: barriers on arcs with orbs at pivot points
      const penCount = 4;
      const penCenter = 0.45 + Math.random() * 0.1;
      for (let pi = 0; pi < penCount; pi++) {
        const px = 1.1 + pi * 0.05;
        const penAngle = (pi * 0.8); // different phase per pendulum
        const penSwing = 0.2;
        const armLen = 3;
        // Pivot orb at top
        push({ type: 'orb', x: px, height: penCenter - 0.15, golden: pi === penCount - 1 });
        // Barrier chain along pendulum arm
        for (let ai = 0; ai < armLen; ai++) {
          const armFrac = (ai + 1) / armLen;
          const swingOffset = Math.sin(penAngle) * penSwing * armFrac;
          const bh = penCenter + armFrac * 0.2 + swingOffset;
          if (bh > 0.05 && bh < 0.95) {
            push({ type: 'barrier', x: px + ai * 0.005, height: bh });
          }
        }
      }
      push({ type: 'boost', x: 1.1 + penCount * 0.05 + 0.02, height: penCenter });
    },
  },
  {
    name: 'FORTRESS',
    threshold: 0.9664,
    minTime: 50,
    delay: 2,
    spawn: (push) => {
      // FORTRESS: heavily fortified barrier box with single entrance and rich rewards
      const fCenter = 0.35 + Math.random() * 0.3;
      const fW = 6; // columns
      const fH = 0.25; // vertical extent
      const fEntrance = Math.floor(Math.random() * fW); // entrance column
      // Outer walls
      for (let fc = 0; fc < fW; fc++) {
        const fx = 1.1 + fc * 0.025;
        // Top wall
        const topH = fCenter - fH / 2;
        if (fc !== fEntrance && topH > 0.05) {
          push({ type: 'barrier', x: fx, height: topH });
        }
        // Bottom wall
        const botH = fCenter + fH / 2;
        if (fc !== fEntrance && botH < 0.95) {
          push({ type: 'barrier', x: fx, height: botH });
        }
        // Side walls (first and last column)
        if (fc === 0 || fc === fW - 1) {
          const wallSteps = 3;
          for (let ws = 0; ws < wallSteps; ws++) {
            const wh = fCenter - fH / 2 + (fH / (wallSteps + 1)) * (ws + 1);
            push({ type: 'barrier', x: fx, height: wh });
          }
        }
      }
      // Rich reward orbs inside
      for (let ro = 0; ro < 4; ro++) {
        const rh = fCenter + (ro - 1.5) * 0.05;
        const rx = 1.1 + (1 + ro) * 0.025;
        push({ type: 'orb', x: rx, height: rh, golden: ro >= 2 });
      }
      push({ type: 'boost', x: 1.1 + 3 * 0.025, height: fCenter });
    },
  },
  {
    name: 'CORKSCREW',
    threshold: 0.9663,
    minTime: 40,
    delay: 1.5,
    spawn: (push) => {
      // CORKSCREW: helical barrier spiral with orbs along the axis
      const csCenter = 0.4 + Math.random() * 0.2;
      const csLen = 10;
      const csRadius = 0.18;
      for (let ci = 0; ci < csLen; ci++) {
        const cx = 1.1 + ci * 0.025;
        const angle = ci * 0.8;
        const spiralH = csCenter + Math.sin(angle) * csRadius;
        // Barrier on the spiral
        if (spiralH > 0.05 && spiralH < 0.95) {
          push({ type: 'barrier', x: cx, height: spiralH });
        }
        // Orb on the axis (center)
        if (ci % 2 === 1) {
          push({ type: 'orb', x: cx, height: csCenter, golden: ci === csLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + csLen * 0.025 + 0.02, height: csCenter });
    },
  },
  {
    name: 'PRISM',
    threshold: 0.9662,
    minTime: 45,
    delay: 1.6,
    spawn: (push) => {
      // PRISM: triangular barrier enclosure with rainbow orb spray
      const prCenter = 0.4 + Math.random() * 0.2;
      const prH = 0.25;
      // Left vertex (narrow entry)
      push({ type: 'barrier', x: 1.1, height: prCenter - 0.02 });
      push({ type: 'barrier', x: 1.1, height: prCenter + 0.02 });
      // Expanding top and bottom edges
      const prLen = 6;
      for (let pi = 1; pi < prLen; pi++) {
        const px = 1.1 + pi * 0.025;
        const spread = prH * (pi / prLen);
        const topH = prCenter - spread;
        const botH = prCenter + spread;
        if (topH > 0.05) {
          push({ type: 'barrier', x: px, height: topH });
        }
        if (botH < 0.95) {
          push({ type: 'barrier', x: px, height: botH });
        }
      }
      // Rainbow orb spray emerging from wide end
      const sprayCount = 5;
      for (let si = 0; si < sprayCount; si++) {
        const sH = prCenter - prH + (prH * 2 * (si / (sprayCount - 1)));
        push({ type: 'orb', x: 1.1 + prLen * 0.025 + 0.01, height: sH, golden: si === Math.floor(sprayCount / 2) });
      }
      push({ type: 'boost', x: 1.1 + prLen * 0.025 + 0.04, height: prCenter });
    },
  },
  {
    name: 'CORRIDOR SHIFT',
    threshold: 0.9661,
    minTime: 35,
    delay: 1.7,
    spawn: (push) => {
      // CORRIDOR SHIFT: two parallel walls that shift direction mid-passage
      const csLen = 12;
      const csGap = 0.11;
      let csH = 0.3 + Math.random() * 0.4;
      const shiftAt = Math.floor(csLen * 0.4) + Math.floor(Math.random() * 3);
      const shiftDir = Math.random() > 0.5 ? 0.2 : -0.2;
      for (let ci = 0; ci < csLen; ci++) {
        const cx = 1.1 + ci * 0.022;
        if (ci === shiftAt) {
          csH = Math.max(0.15, Math.min(0.85, csH + shiftDir));
        }
        // Top wall
        if (csH - csGap > 0.05) {
          push({ type: 'barrier', x: cx, height: csH - csGap });
        }
        // Bottom wall
        if (csH + csGap < 0.95) {
          push({ type: 'barrier', x: cx, height: csH + csGap });
        }
        // Orbs in corridor
        if (ci % 2 === 1) {
          push({ type: 'orb', x: cx, height: csH, golden: ci >= csLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + csLen * 0.022 + 0.02, height: csH });
    },
  },
  {
    name: 'MIRROR',
    threshold: 0.966,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // MIRROR: symmetric barriers mirrored about center line (0.5)
      const mirLen = 8;
      const mirCenter = 0.5;
      for (let mi = 0; mi < mirLen; mi++) {
        const mx = 1.1 + mi * 0.025;
        const mirOff = 0.1 + Math.sin(mi * 1.2) * 0.08;
        // Top barrier (mirrored above center)
        const topH = mirCenter - mirOff;
        if (topH > 0.05) {
          push({ type: 'barrier', x: mx, height: topH });
        }
        // Bottom barrier (mirrored below center)
        const botH = mirCenter + mirOff;
        if (botH < 0.95) {
          push({ type: 'barrier', x: mx, height: botH });
        }
        // Orbs at center between mirrors
        if (mi % 2 === 1) {
          push({ type: 'orb', x: mx, height: mirCenter, golden: mi >= mirLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + mirLen * 0.025 + 0.02, height: mirCenter });
    },
  },
  {
    name: 'SPIRIT DEBRIS',
    threshold: 0.9659,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // SPIRIT DEBRIS: scattered small barrier clusters with orbs in gaps
      const afCount = 8;
      let orbPlaced = 0;
      for (let ai = 0; ai < afCount; ai++) {
        const ax = 1.1 + ai * 0.03 + (Math.random() - 0.5) * 0.01;
        const ah = 0.15 + Math.random() * 0.7;
        // Small barrier cluster (1-2 barriers close together)
        push({ type: 'barrier', x: ax, height: ah });
        if (Math.random() > 0.5 && ah + 0.08 < 0.95) {
          push({ type: 'barrier', x: ax + 0.005, height: ah + 0.08 });
        }
        // Orbs scattered between clusters
        if (ai % 2 === 1) {
          const orbH = 0.2 + Math.random() * 0.6;
          push({ type: 'orb', x: ax + 0.015, height: orbH, golden: orbPlaced === 3 });
          orbPlaced++;
        }
      }
      push({ type: 'boost', x: 1.1 + afCount * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'BOTTLENECK',
    threshold: 0.9658,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // BOTTLENECK: wide field narrowing to single-width passage then widening
      const bnLen = 10;
      const bnCenter = 0.4 + Math.random() * 0.2;
      for (let bi = 0; bi < bnLen; bi++) {
        const bx = 1.1 + bi * 0.025;
        const progress = bi / (bnLen - 1);
        // Width narrows to minimum at midpoint then widens
        const squeeze = 1 - Math.abs(progress - 0.5) * 2; // 0 at edges, 1 at center
        const gapHalf = 0.25 - squeeze * 0.18; // max 0.25, min 0.07
        // Top barrier
        const topH = bnCenter - gapHalf;
        if (topH > 0.05) {
          push({ type: 'barrier', x: bx, height: topH });
        }
        // Bottom barrier
        const botH = bnCenter + gapHalf;
        if (botH < 0.95) {
          push({ type: 'barrier', x: bx, height: botH });
        }
        // Orbs in the passage
        if (bi % 2 === 1) {
          push({ type: 'orb', x: bx, height: bnCenter, golden: bi === Math.floor(bnLen / 2) });
        }
      }
      push({ type: 'boost', x: 1.1 + bnLen * 0.025 + 0.02, height: bnCenter });
    },
  },
  {
    name: 'TUNNEL BORE',
    threshold: 0.9657,
    minTime: 40,
    delay: 1.6,
    spawn: (push) => {
      // TUNNEL BORE: tight circular tunnel of barriers with orbs along the center path
      const tbCenter = 0.35 + Math.random() * 0.3;
      const tbLen = 10;
      const tbRadius = 0.12;
      for (let ti = 0; ti < tbLen; ti++) {
        const tx = 1.1 + ti * 0.022;
        const tbAngleOff = ti * 0.5; // rotating ring position
        // Ring of barriers around center (4 positions per ring)
        const ringPositions = 4;
        for (let ri = 0; ri < ringPositions; ri++) {
          const rAngle = (ri / ringPositions) * Math.PI * 2 + tbAngleOff;
          const rh = tbCenter + Math.sin(rAngle) * tbRadius;
          if (rh > 0.05 && rh < 0.95 && Math.abs(Math.sin(rAngle)) > 0.3) {
            push({ type: 'barrier', x: tx, height: rh });
          }
        }
        // Center path orbs
        if (ti % 2 === 0) {
          push({ type: 'orb', x: tx + 0.005, height: tbCenter, golden: ti === tbLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + tbLen * 0.022 + 0.02, height: tbCenter });
    },
  },
  {
    name: 'GAUNTLET ZIGZAG',
    threshold: 0.9656,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // GAUNTLET ZIGZAG: narrow zigzag corridor with orbs along center path
      const gzLen = 10;
      const gzGap = 0.1;
      let gzH = 0.3 + Math.random() * 0.4;
      const gzStep = 0.12;
      let gzDir = 1;
      for (let gi = 0; gi < gzLen; gi++) {
        const gx = 1.1 + gi * 0.022;
        // Change direction every 2 segments
        if (gi > 0 && gi % 2 === 0) {
          gzDir *= -1;
        }
        gzH += gzDir * gzStep * 0.5;
        gzH = Math.max(0.15, Math.min(0.85, gzH));
        // Wall barriers
        if (gzH - gzGap > 0.05) {
          push({ type: 'barrier', x: gx, height: gzH - gzGap });
        }
        if (gzH + gzGap < 0.95) {
          push({ type: 'barrier', x: gx, height: gzH + gzGap });
        }
        // Center path orbs
        push({ type: 'orb', x: gx + 0.005, height: gzH, golden: gi === gzLen - 1 });
      }
      push({ type: 'boost', x: 1.1 + gzLen * 0.022 + 0.02, height: gzH });
    },
  },
  {
    name: 'RIBBON',
    threshold: 0.9655,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // RIBBON: interweaving sine wave barriers with orbs between
      const rbLen = 10;
      const rbCenter = 0.5;
      const rbAmp = 0.2;
      for (let ri = 0; ri < rbLen; ri++) {
        const rx = 1.1 + ri * 0.025;
        const progress = ri / (rbLen - 1);
        // Two interweaving sine waves offset by half phase
        const wave1 = rbCenter + Math.sin(progress * Math.PI * 3) * rbAmp;
        const wave2 = rbCenter + Math.sin(progress * Math.PI * 3 + Math.PI) * rbAmp;
        // Barriers on the waves
        if (wave1 > 0.05 && wave1 < 0.95) {
          push({ type: 'barrier', x: rx, height: wave1 });
        }
        if (wave2 > 0.05 && wave2 < 0.95) {
          push({ type: 'barrier', x: rx, height: wave2 });
        }
        // Orbs at the crossing points (where waves are close)
        if (Math.abs(wave1 - wave2) < 0.1 && ri % 2 === 0) {
          push({ type: 'orb', x: rx, height: rbCenter, golden: ri >= rbLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + rbLen * 0.025 + 0.02, height: rbCenter });
    },
  },
  {
    name: 'CROSSOVER',
    threshold: 0.9654,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // CROSSOVER: two paths crossing in X with orbs at intersection
      const coCenter = 0.45 + Math.random() * 0.1;
      const coLen = 8;
      const coSpread = 0.25;
      for (let ci = 0; ci < coLen; ci++) {
        const cx = 1.1 + ci * 0.025;
        const progress = ci / (coLen - 1);
        // Path 1: top-left to bottom-right
        const p1h = coCenter - coSpread + progress * coSpread * 2;
        // Path 2: bottom-left to top-right
        const p2h = coCenter + coSpread - progress * coSpread * 2;
        // Barriers along both paths
        if (p1h > 0.05 && p1h < 0.95) {
          push({ type: 'barrier', x: cx, height: p1h });
        }
        if (p2h > 0.05 && p2h < 0.95 && Math.abs(p1h - p2h) > 0.08) {
          push({ type: 'barrier', x: cx, height: p2h });
        }
        // Orbs at the crossing point (middle)
        if (Math.abs(progress - 0.5) < 0.15) {
          push({ type: 'orb', x: cx + 0.005, height: coCenter, golden: ci === Math.floor(coLen / 2) });
        }
      }
      push({ type: 'boost', x: 1.1 + coLen * 0.025 + 0.02, height: coCenter });
    },
  },
  {
    name: 'ORBIT',
    threshold: 0.9653,
    minTime: 40,
    delay: 1.6,
    spawn: (push) => {
      // ORBIT: barriers orbiting around a central golden orb cluster
      const orbitCenter = 0.35 + Math.random() * 0.3;
      const orbitR = 0.18;
      const orbitBarriers = 8;
      // Orbiting barriers in a ring
      for (let oi = 0; oi < orbitBarriers; oi++) {
        const oAngle = (oi / orbitBarriers) * Math.PI * 2;
        const oh = orbitCenter + Math.sin(oAngle) * orbitR;
        const ox = 1.12 + Math.cos(oAngle) * orbitR * 0.3;
        if (oh > 0.05 && oh < 0.95) {
          push({ type: 'barrier', x: ox, height: oh });
        }
      }
      // Central golden orb cluster
      for (let ci = 0; ci < 3; ci++) {
        const cOff = (ci - 1) * 0.03;
        push({ type: 'orb', x: 1.12 + ci * 0.01, height: orbitCenter + cOff, golden: true });
      }
      // Extra orbs at orbit poles
      push({ type: 'orb', x: 1.12, height: orbitCenter - orbitR - 0.05 });
      push({ type: 'orb', x: 1.12, height: orbitCenter + orbitR + 0.05 });
      push({ type: 'boost', x: 1.12 + orbitR * 0.3 + 0.04, height: orbitCenter });
    },
  },
  {
    name: 'KEYHOLE',
    threshold: 0.9652,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // KEYHOLE: narrow vertical slot in a wide barrier wall
      const khCenter = 0.3 + Math.random() * 0.4;
      const khSlotSize = 0.08;
      const khDepth = 4;
      // Thick barrier wall with slot
      for (let kd = 0; kd < khDepth; kd++) {
        const kx = 1.1 + kd * 0.015;
        // Fill barriers above and below the slot
        const steps = 4;
        for (let ks = 0; ks < steps; ks++) {
          const aboveH = (khCenter - khSlotSize) * (ks / steps);
          if (aboveH > 0.05) {
            push({ type: 'barrier', x: kx, height: aboveH });
          }
          const belowH = khCenter + khSlotSize + (1 - khCenter - khSlotSize) * ((ks + 1) / steps);
          if (belowH < 0.95) {
            push({ type: 'barrier', x: kx, height: belowH });
          }
        }
      }
      // Orbs through the keyhole
      for (let ko = 0; ko < 3; ko++) {
        push({ type: 'orb', x: 1.1 + ko * 0.015 + 0.005, height: khCenter, golden: ko === 2 });
      }
      push({ type: 'boost', x: 1.1 + khDepth * 0.015 + 0.03, height: khCenter });
    },
  },
  {
    name: 'STAIRCASE',
    threshold: 0.9651,
    minTime: 25,
    delay: 1.8,
    spawn: (push) => {
      // STAIRCASE: ascending/descending step barriers with orbs on each step
      const stSteps = 6;
      const stAscending = Math.random() > 0.5;
      const stBaseH = stAscending ? 0.2 : 0.7;
      const stStepSize = (stAscending ? 0.5 : -0.5) / stSteps;
      for (let ss = 0; ss < stSteps; ss++) {
        const stx = 1.1 + ss * 0.04;
        const stH = stBaseH + ss * stStepSize;
        // Step platform (barrier)
        push({ type: 'barrier', x: stx, height: stH });
        push({ type: 'barrier', x: stx + 0.015, height: stH });
        // Orb on top of each step
        const orbH = stH + (stAscending ? stStepSize * 0.6 : stStepSize * 0.4);
        push({ type: 'orb', x: stx + 0.01, height: Math.max(0.05, Math.min(0.95, orbH)), golden: ss === stSteps - 1 });
      }
      // Boost at summit
      const boostH = stBaseH + stSteps * stStepSize + (stAscending ? 0.05 : -0.05);
      push({ type: 'boost', x: 1.1 + stSteps * 0.04 + 0.02, height: Math.max(0.05, Math.min(0.95, boostH)) });
    },
  },
  {
    name: 'FUNNEL',
    threshold: 0.965,
    minTime: 30,
    delay: 1.6,
    spawn: (push) => {
      // FUNNEL: wide entrance narrowing to tight exit with orbs along edges
      const fnSteps = 8;
      const fnWideTop = 0.15;
      const fnWideBot = 0.85;
      const fnNarrowTop = 0.4;
      const fnNarrowBot = 0.6;
      for (let fi = 0; fi < fnSteps; fi++) {
        const fx = 1.1 + fi * 0.03;
        const fProgress = fi / (fnSteps - 1);
        const fTop = fnWideTop + (fnNarrowTop - fnWideTop) * fProgress;
        const fBot = fnWideBot + (fnNarrowBot - fnWideBot) * fProgress;
        // Top wall barrier
        push({ type: 'barrier', x: fx, height: fTop });
        // Bottom wall barrier
        push({ type: 'barrier', x: fx, height: fBot });
        // Orbs along center path
        if (fi % 2 === 1) {
          const orbCenter = (fTop + fBot) / 2;
          push({ type: 'orb', x: fx, height: orbCenter, golden: fi === fnSteps - 2 });
        }
      }
      // Boost at narrow exit
      push({ type: 'boost', x: 1.1 + fnSteps * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'HELIX',
    threshold: 0.9649,
    minTime: 35,
    delay: 1.7,
    spawn: (push) => {
      // HELIX: double helix of barriers spiraling with orbs in gaps
      const hlxSteps = 10;
      const hlxCenter = 0.5;
      const hlxAmp = 0.25;
      for (let hi = 0; hi < hlxSteps; hi++) {
        const hx = 1.1 + hi * 0.025;
        const hAngle = (hi / hlxSteps) * Math.PI * 2;
        // Strand A
        const strandA = hlxCenter + Math.sin(hAngle) * hlxAmp;
        push({ type: 'barrier', x: hx, height: strandA });
        // Strand B (180 degrees offset)
        const strandB = hlxCenter + Math.sin(hAngle + Math.PI) * hlxAmp;
        push({ type: 'barrier', x: hx, height: strandB });
        // Orbs in center gap between strands
        if (hi % 2 === 1) {
          push({ type: 'orb', x: hx, height: hlxCenter, golden: hi === hlxSteps - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + hlxSteps * 0.025 + 0.02, height: hlxCenter });
    },
  },
  {
    name: 'CATERPILLAR',
    threshold: 0.9648,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // CATERPILLAR: long chain of alternating barriers/orbs that undulates
      const catLen = 12;
      const catCenter = 0.3 + Math.random() * 0.4;
      const catAmp = 0.15;
      const catFreq = 1.5;
      for (let ci = 0; ci < catLen; ci++) {
        const cx = 1.1 + ci * 0.02;
        const cWave = catCenter + Math.sin((ci / catLen) * Math.PI * catFreq) * catAmp;
        if (ci % 2 === 0) { // Barrier segments
          push({ type: 'barrier', x: cx, height: cWave });
        } else { // Orb segments
          push({ type: 'orb', x: cx, height: cWave, golden: ci === catLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + catLen * 0.02 + 0.02, height: catCenter });
    },
  },
  {
    name: 'DIAMOND CAGE',
    threshold: 0.9647,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // DIAMOND CAGE: diamond-shaped barrier enclosure with orbs at vertices
      const dcCenter = 0.5;
      const dcSize = 0.2;
      const dcX0 = 1.1;
      const dcWidth = 0.08;
      // Four sides of the diamond (top, right, bottom, left vertices)
      const dcVerts = [
      { x: dcX0, h: dcCenter - dcSize
      }
      ,           // top
      { x: dcX0 + dcWidth / 2, h: dcCenter
      }
      ,      // right
      { x: dcX0 + dcWidth, h: dcCenter + dcSize
      }
      ,  // bottom
      { x: dcX0 + dcWidth * 1.5, h: dcCenter
      }
      ,     // left (closing side)
      ];
      // Barriers along edges
      for (let dv = 0; dv < dcVerts.length; dv++) {
        const nextV = dcVerts[(dv + 1) % dcVerts.length];
        const edgeSteps = 3;
        for (let es = 0; es < edgeSteps; es++) {
          const t = es / edgeSteps;
          const bx = dcVerts[dv].x + (nextV.x - dcVerts[dv].x) * t;
          const bh = dcVerts[dv].h + (nextV.h - dcVerts[dv].h) * t;
          push({ type: 'barrier', x: bx, height: Math.max(0.05, Math.min(0.95, bh)) });
        }
      }
      // Orbs at vertices
      for (let dv = 0; dv < dcVerts.length; dv++) {
        push({ type: 'orb', x: dcVerts[dv].x, height: dcVerts[dv].h, golden: dv === 0 });
      }
      // Boost in center
      push({ type: 'boost', x: dcX0 + dcWidth * 0.75, height: dcCenter });
    },
  },
  {
    name: 'CHECKERBOARD',
    threshold: 0.9646,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // CHECKERBOARD: grid of alternating barriers and orbs in checkerboard
      const cbRows = 4;
      const cbCols = 5;
      const cbStartH = 0.2;
      const cbEndH = 0.8;
      for (let cr = 0; cr < cbRows; cr++) {
        for (let cc = 0; cc < cbCols; cc++) {
          const cbx = 1.1 + cc * 0.025;
          const cbh = cbStartH + (cbEndH - cbStartH) * (cr / (cbRows - 1));
          const isBarrier = (cr + cc) % 2 === 0;
          if (isBarrier) {
            push({ type: 'barrier', x: cbx, height: cbh });
          } else {
            push({ type: 'orb', x: cbx, height: cbh, golden: cr === 0 && cc === cbCols - 1 });
          }
        }
      }
      push({ type: 'boost', x: 1.1 + cbCols * 0.025 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'BRACKETS',
    threshold: 0.9645,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // BRACKETS: nested square bracket barriers with orbs in inner space
      const brCenter = 0.5;
      const outerSize = 0.3;
      const innerSize = 0.15;
      // Outer bracket left side
      const olx = 1.1;
      push({ type: 'barrier', x: olx, height: brCenter - outerSize });
      push({ type: 'barrier', x: olx, height: brCenter + outerSize });
      push({ type: 'barrier', x: olx + 0.01, height: brCenter - outerSize });
      push({ type: 'barrier', x: olx + 0.01, height: brCenter + outerSize });
      // Inner bracket
      const ilx = 1.1 + 0.03;
      push({ type: 'barrier', x: ilx, height: brCenter - innerSize });
      push({ type: 'barrier', x: ilx, height: brCenter + innerSize });
      push({ type: 'barrier', x: ilx + 0.01, height: brCenter - innerSize });
      push({ type: 'barrier', x: ilx + 0.01, height: brCenter + innerSize });
      // Orbs in inner space
      for (let bi = 0; bi < 4; bi++) {
        const bh = brCenter - innerSize + 0.03 + (innerSize * 2 - 0.06) * (bi / 3);
        push({ type: 'orb', x: ilx + 0.005, height: bh, golden: bi === 2 });
      }
      // Outer bracket right side
      const orx = 1.1 + 0.06;
      push({ type: 'barrier', x: orx, height: brCenter - outerSize });
      push({ type: 'barrier', x: orx, height: brCenter + outerSize });
      // Boost after brackets
      push({ type: 'boost', x: orx + 0.03, height: brCenter });
    },
  },
  {
    name: 'RAPIDS',
    threshold: 0.9644,
    minTime: 20,
    delay: 1.3,
    spawn: (push) => {
      // RAPIDS: fast sequence of closely-spaced barrier/orb pairs
      const rapLen = 10;
      for (let ri = 0; ri < rapLen; ri++) {
        const rx = 1.1 + ri * 0.015;
        const rLane = ri % 2 === 0 ? 0.3 + Math.random() * 0.15 : 0.55 + Math.random() * 0.15;
        const rOppLane = ri % 2 === 0 ? 0.65 : 0.3;
        push({ type: 'barrier', x: rx, height: rLane });
        push({ type: 'orb', x: rx, height: rOppLane, golden: ri === rapLen - 1 });
      }
      push({ type: 'boost', x: 1.1 + rapLen * 0.015 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'ARCADE',
    threshold: 0.9643,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // ARCADE: classic space-invader grid of barriers in formation
      const arcRows = 3;
      const arcCols = 4;
      const arcStartH = 0.25;
      const arcHStep = 0.2;
      for (let ar = 0; ar < arcRows; ar++) {
        for (let ac = 0; ac < arcCols; ac++) {
          const ax = 1.1 + ac * 0.03;
          const ah = arcStartH + ar * arcHStep;
          // Every other spot is a barrier, rest are orbs
          if ((ar + ac) % 3 === 0) {
            push({ type: 'orb', x: ax, height: ah, golden: ar === 0 && ac === arcCols - 1 });
          } else {
            push({ type: 'barrier', x: ax, height: ah });
          }
        }
      }
      // Boost behind formation
      push({ type: 'boost', x: 1.1 + arcCols * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'ZIGZAG WALL',
    threshold: 0.9642,
    minTime: 30,
    delay: 1.7,
    spawn: (push) => {
      // ZIGZAG WALL: thick wall with zigzag passage through it
      const zzSteps = 8;
      const zzWallLayers = 3;
      const zzPath = 0.3 + Math.random() * 0.1;
      let zzH = zzPath;
      for (let zs = 0; zs < zzSteps; zs++) {
        const zx = 1.1 + zs * 0.02;
        // Zigzag path alternates up and down
        zzH = zs % 2 === 0 ? zzPath : zzPath + 0.3;
        // Fill barriers above and below the passage
        for (let zl = 0; zl < zzWallLayers; zl++) {
          const aboveH = zzH - 0.06 - zl * 0.12;
          if (aboveH > 0.05) {
            push({ type: 'barrier', x: zx, height: aboveH });
          }
          const belowH = zzH + 0.06 + zl * 0.12;
          if (belowH < 0.95) {
            push({ type: 'barrier', x: zx, height: belowH });
          }
        }
        // Orb in the passage
        push({ type: 'orb', x: zx, height: zzH, golden: zs === zzSteps - 1 });
      }
      push({ type: 'boost', x: 1.1 + zzSteps * 0.02 + 0.02, height: zzH });
    },
  },
  {
    name: 'HOURGLASS',
    threshold: 0.9641,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // HOURGLASS: two triangular barrier formations meeting at narrow center
      const hgCenter = 0.5;
      const hgWidth = 0.35;
      const hgSteps = 6;
      for (let hs = 0; hs < hgSteps; hs++) {
        const hx = 1.1 + hs * 0.025;
        const hProgress = hs / (hgSteps - 1);
        // Top triangle narrows toward center
        const topSpread = hgWidth * (1 - hProgress * 2);
        if (hProgress <= 0.5) {
          push({ type: 'barrier', x: hx, height: hgCenter - topSpread });
          push({ type: 'barrier', x: hx, height: hgCenter + topSpread });
        }
        // Bottom triangle widens from center
        if (hProgress >= 0.5) {
          const botSpread = hgWidth * ((hProgress - 0.5) * 2);
          push({ type: 'barrier', x: hx, height: hgCenter - botSpread });
          push({ type: 'barrier', x: hx, height: hgCenter + botSpread });
        }
        // Orbs along the center corridor
        push({ type: 'orb', x: hx, height: hgCenter, golden: hs === Math.floor(hgSteps / 2) });
      }
      push({ type: 'boost', x: 1.1 + hgSteps * 0.025 + 0.02, height: hgCenter });
    },
  },
  {
    name: 'GALAXY',
    threshold: 0.964,
    minTime: 40,
    delay: 1.8,
    spawn: (push) => {
      // GALAXY: spiral arm of barriers/orbs radiating from center
      const galCenter = 0.5;
      const galCenterX = 1.15;
      const galArms = 2;
      const galPointsPerArm = 6;
      for (let ga = 0; ga < galArms; ga++) {
        const armOffset = (ga / galArms) * Math.PI * 2;
        for (let gp = 0; gp < galPointsPerArm; gp++) {
          const gAngle = armOffset + (gp / galPointsPerArm) * Math.PI * 1.5;
          const gR = 0.02 + gp * 0.015;
          const gx = galCenterX + Math.cos(gAngle) * gR;
          const gh = galCenter + Math.sin(gAngle) * gR * 3;
          if (gh > 0.05 && gh < 0.95) {
            if (gp % 2 === 0) {
              push({ type: 'barrier', x: gx, height: gh });
            } else {
              push({ type: 'orb', x: gx, height: gh, golden: gp === galPointsPerArm - 1 });
            }
          }
        }
      }
      // Central golden orb
      push({ type: 'orb', x: galCenterX, height: galCenter, golden: true });
      push({ type: 'boost', x: galCenterX, height: galCenter + 0.05 });
    },
  },
  {
    name: 'CASCADE',
    threshold: 0.9639,
    minTime: 25,
    delay: 1.6,
    spawn: (push) => {
      // CASCADE: waterfall of barriers flowing down with orbs in safe spots
      const casSteps = 7;
      const casStartH = 0.15;
      const casEndH = 0.85;
      for (let cs2 = 0; cs2 < casSteps; cs2++) {
        const cx2 = 1.1 + cs2 * 0.025;
        const cH2 = casStartH + (casEndH - casStartH) * (cs2 / (casSteps - 1));
        // Barrier at current "water level"
        push({ type: 'barrier', x: cx2, height: cH2 });
        // Additional barrier slightly above
        if (cH2 - 0.08 > 0.05) {
          push({ type: 'barrier', x: cx2, height: cH2 - 0.08 });
        }
        // Orb below the cascade (safe zone)
        const safeH = cH2 + 0.1;
        if (safeH < 0.95) {
          push({ type: 'orb', x: cx2, height: safeH, golden: cs2 === casSteps - 1 });
        }
      }
      push({ type: 'boost', x: 1.1 + casSteps * 0.025 + 0.02, height: casEndH - 0.1 });
    },
  },
  {
    name: 'PORTCULLIS',
    threshold: 0.9638,
    minTime: 30,
    delay: 1.7,
    spawn: (push) => {
      // PORTCULLIS: rising/falling gate barriers with timing-based orbs
      const pcGates = 5;
      for (let pg = 0; pg < pcGates; pg++) {
        const px = 1.1 + pg * 0.04;
        const gateUp = pg % 2 === 0;
        // Gate barrier (from top or bottom)
        const gateLen = 3;
        for (let gl = 0; gl < gateLen; gl++) {
          const gh = gateUp ? 0.05 + gl * 0.15 : 0.95 - gl * 0.15;
          push({ type: 'barrier', x: px, height: gh });
        }
        // Orb in the opening
        const orbH = gateUp ? 0.7 : 0.3;
        push({ type: 'orb', x: px, height: orbH, golden: pg === pcGates - 1 });
      }
      push({ type: 'boost', x: 1.1 + pcGates * 0.04 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'SQUEEZE',
    threshold: 0.9637,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // SQUEEZE: barriers from top and bottom closing in with escape window
      const sqSteps = 8;
      const sqEscapeAt = Math.floor(sqSteps * 0.6);
      for (let sq = 0; sq < sqSteps; sq++) {
        const sqx = 1.1 + sq * 0.02;
        const sqProgress = sq / (sqSteps - 1);
        // Closing walls
        const sqTopH = 0.1 + sqProgress * 0.3;
        const sqBotH = 0.9 - sqProgress * 0.3;
        if (sq !== sqEscapeAt) {
          push({ type: 'barrier', x: sqx, height: sqTopH });
          push({ type: 'barrier', x: sqx, height: sqBotH });
        }
        // Orbs in the narrowing gap
        const midH = (sqTopH + sqBotH) / 2;
        push({ type: 'orb', x: sqx, height: midH, golden: sq === sqEscapeAt });
      }
      push({ type: 'boost', x: 1.1 + sqSteps * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'TEETH',
    threshold: 0.9636,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // TEETH: interlocking barrier teeth from top/bottom like a zipper
      const teethCount = 8;
      for (let tt = 0; tt < teethCount; tt++) {
        const tx = 1.1 + tt * 0.02;
        const fromTop = tt % 2 === 0;
        // Tooth barrier
        const toothBase = fromTop ? 0.05 : 0.95;
        const toothTip = fromTop ? 0.4 : 0.6;
        push({ type: 'barrier', x: tx, height: toothBase });
        push({ type: 'barrier', x: tx, height: (toothBase + toothTip) / 2 });
        push({ type: 'barrier', x: tx, height: toothTip });
        // Orb in the gap between teeth
        const gapH = fromTop ? 0.7 : 0.3;
        push({ type: 'orb', x: tx + 0.01, height: gapH, golden: tt === teethCount - 1 });
      }
      push({ type: 'boost', x: 1.1 + teethCount * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'CROWN',
    threshold: 0.9635,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // CROWN: circular arrangement of barriers with orbs forming a crown shape
      const crPoints = 5;
      const crCenter = 0.5;
      const crCenterX = 1.14;
      const crR2 = 0.18;
      for (let cp = 0; cp < crPoints; cp++) {
        const cpAngle = (cp / crPoints) * Math.PI - Math.PI / 2;
        // Outer crown points (barriers)
        const bx = crCenterX + Math.cos(cpAngle) * 0.04;
        const bh = crCenter + Math.sin(cpAngle) * crR2;
        push({ type: 'barrier', x: bx, height: Math.max(0.05, Math.min(0.95, bh)) });
        // Inner crown dips (orbs between points)
        const innerAngle = cpAngle + Math.PI / crPoints;
        const ix = crCenterX + Math.cos(innerAngle) * 0.025;
        const ih = crCenter + Math.sin(innerAngle) * crR2 * 0.5;
        push({ type: 'orb', x: ix, height: Math.max(0.05, Math.min(0.95, ih)), golden: cp === Math.floor(crPoints / 2) });
      }
      // Crown jewel — golden orb at top
      push({ type: 'orb', x: crCenterX, height: crCenter - crR2, golden: true });
      push({ type: 'boost', x: crCenterX + 0.06, height: crCenter });
    },
  },
  {
    name: 'RICOCHET',
    threshold: 0.9634,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // RICOCHET: barriers as walls with orbs zigzagging between them
      const ricSteps = 8;
      const ricTopWall = 0.2;
      const ricBotWall = 0.8;
      for (let ri2 = 0; ri2 < ricSteps; ri2++) {
        const rx2 = 1.1 + ri2 * 0.025;
        // Alternating wall barriers
        if (ri2 % 3 === 0) {
          push({ type: 'barrier', x: rx2, height: ricTopWall });
          push({ type: 'barrier', x: rx2, height: ricTopWall + 0.08 });
        }
        if (ri2 % 3 === 1) {
          push({ type: 'barrier', x: rx2, height: ricBotWall });
          push({ type: 'barrier', x: rx2, height: ricBotWall - 0.08 });
        }
        // Orbs bouncing between walls
        const bounceH = ri2 % 2 === 0 ? ricTopWall + 0.2 : ricBotWall - 0.2;
        push({ type: 'orb', x: rx2, height: bounceH, golden: ri2 === ricSteps - 1 });
      }
      push({ type: 'boost', x: 1.1 + ricSteps * 0.025 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'AVALANCHE',
    threshold: 0.9633,
    minTime: 30,
    delay: 1.6,
    spawn: (push) => {
      // AVALANCHE: descending wave of barriers from top with safe pockets
      const avSteps = 8;
      const avWidth = 3;
      for (let av = 0; av < avSteps; av++) {
        const ax2 = 1.1 + av * 0.025;
        const avBaseH = 0.1 + av * 0.08;
        // Fill from top down to wave line
        for (let aw = 0; aw < avWidth; aw++) {
          const awH = avBaseH - aw * 0.08;
          if (awH > 0.05) {
            push({ type: 'barrier', x: ax2, height: awH });
          }
        }
        // Safe pocket orb below the wave
        if (av % 2 === 1) {
          push({ type: 'orb', x: ax2, height: avBaseH + 0.12, golden: av === avSteps - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + avSteps * 0.025 + 0.02, height: 0.8 });
    },
  },
  {
    name: 'GALAXY CLUSTER',
    threshold: 0.9632,
    minTime: 40,
    delay: 1.5,
    spawn: (push) => {
      // GALAXY CLUSTER: multiple small spiral clusters side by side
      const gcClusters = 3;
      const gcHeights = [0.25, 0.5, 0.75];
      for (let gc = 0; gc < gcClusters; gc++) {
        const gcX0 = 1.1 + gc * 0.04;
        const gcH0 = gcHeights[gc];
        const gcPts = 4;
        for (let gp2 = 0; gp2 < gcPts; gp2++) {
          const gpAngle2 = (gp2 / gcPts) * Math.PI * 1.2 + gc * 0.5;
          const gpR2 = 0.01 + gp2 * 0.008;
          const gpx = gcX0 + Math.cos(gpAngle2) * gpR2;
          const gph = gcH0 + Math.sin(gpAngle2) * gpR2 * 2;
          if (gph > 0.05 && gph < 0.95) {
            push({ type: gp2 % 2 === 0 ? 'barrier' : 'orb', x: gpx, height: gph, golden: gc === 1 && gp2 === gcPts - 1 });
          }
        }
      }
      // Central boost
      push({ type: 'boost', x: 1.1 + 0.06, height: 0.5 });
    },
  },
  {
    name: 'BRIDGE',
    threshold: 0.9631,
    minTime: 30,
    delay: 1.6,
    spawn: (push) => {
      // BRIDGE: two barrier walls with a connecting bridge and orbs above/below
      const brWallLen = 5;
      const brTopH2 = 0.3;
      const brBotH2 = 0.7;
      // Left wall pillars
      for (let bw = 0; bw < brWallLen; bw++) {
        const bwx = 1.1 + bw * 0.015;
        push({ type: 'barrier', x: bwx, height: brTopH2 });
        push({ type: 'barrier', x: bwx, height: brBotH2 });
      }
      // Bridge connecting the walls (horizontal barrier line)
      const bridgeX = 1.1 + brWallLen * 0.015;
      const bridgeLen = 4;
      for (let bl = 0; bl < bridgeLen; bl++) {
        const bridgeH = brTopH2 + (brBotH2 - brTopH2) * (bl / (bridgeLen - 1));
        push({ type: 'barrier', x: bridgeX, height: bridgeH });
      }
      // Orbs above bridge
      for (let bo = 0; bo < 3; bo++) {
        push({ type: 'orb', x: 1.1 + bo * 0.015 + 0.005, height: brTopH2 - 0.1, golden: bo === 2 });
      }
      // Orbs below bridge
      for (let bo2 = 0; bo2 < 3; bo2++) {
        push({ type: 'orb', x: 1.1 + bo2 * 0.015 + 0.005, height: brBotH2 + 0.1 });
      }
      push({ type: 'boost', x: bridgeX + 0.03, height: 0.5 });
    },
  },
  {
    name: 'LABYRINTH',
    threshold: 0.963,
    minTime: 40,
    delay: 1.8,
    spawn: (push) => {
      // LABYRINTH: complex multi-turn corridor with dead ends
      const lbSteps = 10;
      let lbH = 0.3 + Math.random() * 0.3;
      const lbGap = 0.12;
      for (let lb = 0; lb < lbSteps; lb++) {
        const lbx = 1.1 + lb * 0.02;
        // Wall above path
        if (lbH - lbGap > 0.05) {
          push({ type: 'barrier', x: lbx, height: lbH - lbGap });
        }
        // Wall below path
        if (lbH + lbGap < 0.95) {
          push({ type: 'barrier', x: lbx, height: lbH + lbGap });
        }
        // Turn at certain steps
        if (lb === 3 || lb === 6) {
          lbH = lbH > 0.5 ? lbH - 0.2 : lbH + 0.2;
          // Dead-end barrier at turn
          push({ type: 'barrier', x: lbx + 0.005, height: lbH > 0.5 ? lbH - 0.15 : lbH + 0.15 });
        }
        // Orbs along the path
        if (lb % 2 === 1) {
          push({ type: 'orb', x: lbx, height: lbH, golden: lb === lbSteps - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + lbSteps * 0.02 + 0.02, height: lbH });
    },
  },
  {
    name: 'TORNADO',
    threshold: 0.9629,
    minTime: 35,
    delay: 1.7,
    spawn: (push) => {
      // TORNADO: spiraling inward barrier funnel with orbs ejecting outward
      const toCenter = 0.5;
      const toCenterX = 1.14;
      const toSteps = 8;
      for (let to = 0; to < toSteps; to++) {
        const toAngle = (to / toSteps) * Math.PI * 3;
        const toR2 = 0.25 - (to / toSteps) * 0.18;
        const tox = toCenterX + Math.cos(toAngle) * 0.03;
        const toh = toCenter + Math.sin(toAngle) * toR2;
        // Barrier at spiral point
        if (toh > 0.05 && toh < 0.95) {
          push({ type: 'barrier', x: tox, height: toh });
        }
        // Orbs ejected outward
        if (to % 2 === 1) {
          const ejH = toCenter + Math.sin(toAngle) * (toR2 + 0.12);
          if (ejH > 0.05 && ejH < 0.95) {
            push({ type: 'orb', x: tox, height: ejH, golden: to === toSteps - 2 });
          }
        }
      }
      // Eye of the tornado — boost
      push({ type: 'boost', x: toCenterX, height: toCenter });
    },
  },
  {
    name: 'SLINGSHOT',
    threshold: 0.9628,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // SLINGSHOT: curved barrier channel that accelerates orbs through
      const slSteps = 8;
      const slCenter = 0.5;
      const slCurveAmp = 0.2;
      for (let sl2 = 0; sl2 < slSteps; sl2++) {
        const slx = 1.1 + sl2 * 0.025;
        const slProgress = sl2 / (slSteps - 1);
        const slCurve = Math.sin(slProgress * Math.PI) * slCurveAmp;
        // Upper channel wall
        push({ type: 'barrier', x: slx, height: slCenter - 0.06 + slCurve });
        // Lower channel wall
        push({ type: 'barrier', x: slx, height: slCenter + 0.06 + slCurve });
        // Orbs along the channel center, accelerating (denser at exit)
        if (sl2 > slSteps / 2 && sl2 % 1 === 0) {
          push({ type: 'orb', x: slx, height: slCenter + slCurve, golden: sl2 === slSteps - 1 });
        }
      }
      // Boost at slingshot exit
      push({ type: 'boost', x: 1.1 + slSteps * 0.025 + 0.02, height: slCenter });
    },
  },
  {
    name: 'WINDMILL',
    threshold: 0.9627,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // WINDMILL: rotating barriers like windmill blades with orbs at tips
      const wmCenter = 0.5;
      const wmCenterX = 1.14;
      const wmBlades = 4;
      const wmR3 = 0.2;
      for (let wb = 0; wb < wmBlades; wb++) {
        const wbAngle = (wb / wmBlades) * Math.PI * 2;
        const bladeSteps = 3;
        for (let bs = 1; bs <= bladeSteps; bs++) {
          const bR = (bs / bladeSteps) * wmR3;
          const bx = wmCenterX + Math.cos(wbAngle) * 0.02 * bs;
          const bh = wmCenter + Math.sin(wbAngle) * bR;
          if (bh > 0.05 && bh < 0.95) {
            push({ type: 'barrier', x: bx, height: bh });
          }
        }
        // Orb at blade tip
        const tipH = wmCenter + Math.sin(wbAngle) * (wmR3 + 0.05);
        if (tipH > 0.05 && tipH < 0.95) {
          push({ type: 'orb', x: wmCenterX + Math.cos(wbAngle) * 0.03, height: tipH, golden: wb === 0 });
        }
      }
      // Boost at center hub
      push({ type: 'boost', x: wmCenterX, height: wmCenter });
    },
  },
  {
    name: 'TSUNAMI',
    threshold: 0.9626,
    minTime: 45,
    delay: 1.8,
    spawn: (push) => {
      // TSUNAMI: massive wall of barriers sweeping with narrow survival gap
      const tsWidth = 6;
      const tsGapH = 0.3 + Math.random() * 0.4;
      const tsGapSize = 0.1;
      for (let ts = 0; ts < tsWidth; ts++) {
        const tsx = 1.1 + ts * 0.012;
        // Fill entire height with barriers except gap
        const tsSlots = 8;
        for (let tss = 0; tss < tsSlots; tss++) {
          const tsh = 0.05 + (tss / (tsSlots - 1)) * 0.9;
          if (Math.abs(tsh - tsGapH) > tsGapSize) {
            push({ type: 'barrier', x: tsx, height: tsh });
          }
        }
      }
      // Orbs through the gap
      for (let tgo = 0; tgo < 4; tgo++) {
        push({ type: 'orb', x: 1.1 + tgo * 0.012 + 0.006, height: tsGapH, golden: tgo === 3 });
      }
      push({ type: 'boost', x: 1.1 + tsWidth * 0.012 + 0.02, height: tsGapH });
    },
  },
  {
    name: 'ARCH',
    threshold: 0.9625,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // ARCH: curved barrier arch with orbs along the underside
      const arSteps = 8;
      const arBaseH = 0.7;
      const arPeakH = 0.2;
      for (let ar2 = 0; ar2 < arSteps; ar2++) {
        const arx = 1.1 + ar2 * 0.025;
        const arProgress = ar2 / (arSteps - 1);
        const arH = arBaseH - Math.sin(arProgress * Math.PI) * (arBaseH - arPeakH);
        // Arch barrier
        push({ type: 'barrier', x: arx, height: arH });
        // Orb underneath the arch
        if (ar2 > 0 && ar2 < arSteps - 1) {
          const orbUnder = arH + 0.08;
          if (orbUnder < 0.95) {
            push({ type: 'orb', x: arx, height: orbUnder, golden: ar2 === Math.floor(arSteps / 2) });
          }
        }
      }
      push({ type: 'boost', x: 1.1 + Math.floor(arSteps / 2) * 0.025, height: arPeakH - 0.05 });
    },
  },
  {
    name: 'CONSTELLATION',
    threshold: 0.9624,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // CONSTELLATION: barriers as connecting lines with orb star dots at vertices
      const csStars = 6;
      const csPoints2: Array<{ sx: number; sh: number
      }
      > = [];
      for (let css = 0; css < csStars; css++) {
        const csx = 1.1 + (css / (csStars - 1)) * 0.12;
        const csh = 0.2 + Math.sin(css * 2.3) * 0.25 + 0.25;
        csPoints2.push({ sx: csx, sh: csh });
        // Star orb at vertex
        push({ type: 'orb', x: csx, height: csh, golden: css === Math.floor(csStars / 2) });
      }
      // Barriers along connecting lines between stars
      for (let cl2 = 0; cl2 < csStars - 1; cl2++) {
        const p1 = csPoints2[cl2];
        const p2 = csPoints2[cl2 + 1];
        const midX = (p1.sx + p2.sx) / 2;
        const midH = (p1.sh + p2.sh) / 2;
        push({ type: 'barrier', x: midX, height: midH });
      }
      push({ type: 'boost', x: 1.1 + 0.14, height: 0.5 });
    },
  },
  {
    name: 'VOLCANO',
    threshold: 0.9623,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // VOLCANO: erupting cone of barriers with orbs raining down like lava
      const vcBaseX = 1.1 + 0.06;
      const vcBaseH = 0.85; // near ground
      const vcEruptCount = 8;
      // Cone walls — two diagonal lines of barriers forming a V
      for (let vi = 0; vi < 4; vi++) {
        const rise = vi * 0.12;
        push({ type: 'barrier', x: vcBaseX - 0.02 - vi * 0.015, height: vcBaseH - rise });
        push({ type: 'barrier', x: vcBaseX + 0.02 + vi * 0.015, height: vcBaseH - rise });
      }
      // Eruption — orbs flying up and outward from the crater
      for (let ve = 0; ve < vcEruptCount; ve++) {
        const angle = (ve / vcEruptCount) * Math.PI * 0.8 + Math.PI * 0.1;
        const dist = 0.08 + (ve % 3) * 0.04;
        const ex = vcBaseX + Math.cos(angle) * dist * 0.6;
        const eh = vcBaseH - 0.48 - Math.sin(angle) * dist;
        push({ type: 'orb', x: ex, height: Math.max(0.05, Math.min(0.95, eh)), golden: ve === 4 });
      }
      // Lava barriers scattered around the eruption area
      push({ type: 'barrier', x: vcBaseX - 0.06, height: 0.3 });
      push({ type: 'barrier', x: vcBaseX + 0.07, height: 0.25 });
      push({ type: 'boost', x: vcBaseX, height: 0.15 });
    },
  },
  {
    name: 'CALDERA',
    threshold: 0.9622,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // CALDERA: wide circular barrier rim with orbs pooled in the basin
      const calCX = 1.1 + 0.1;
      const calCH = 0.5;
      const calRimPts = 10;
      const calRimR = 0.08;
      const calRimRH = 0.2;
      // Rim barriers in a circle
      for (let cr = 0; cr < calRimPts; cr++) {
        const crAngle = (cr / calRimPts) * Math.PI * 2;
        const crx = calCX + Math.cos(crAngle) * calRimR;
        const crh = calCH + Math.sin(crAngle) * calRimRH;
        if (crh > 0.05 && crh < 0.95) {
          push({ type: 'barrier', x: crx, height: crh });
        }
      }
      // Basin orbs inside the caldera
      const calInner = 5;
      for (let ci = 0; ci < calInner; ci++) {
        const ciAngle = (ci / calInner) * Math.PI * 2 + 0.3;
        const cix = calCX + Math.cos(ciAngle) * calRimR * 0.4;
        const cih = calCH + Math.sin(ciAngle) * calRimRH * 0.35;
        push({ type: 'orb', x: cix, height: Math.max(0.05, Math.min(0.95, cih)), golden: ci === 2 });
      }
      push({ type: 'boost', x: calCX, height: calCH });
    },
  },
  {
    name: 'MOAT',
    threshold: 0.9621,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // MOAT: barrier ring around central golden orb with bridge gaps
      const moatCX = 1.1 + 0.1;
      const moatCH = 0.5;
      const moatR2 = 0.07;
      const moatRH2 = 0.18;
      const moatPts = 12;
      const moatGaps = [2, 7]; // indices where gaps exist (bridge entrances)
      for (let mi = 0; mi < moatPts; mi++) {
        if (moatGaps.includes(mi)) { // Gap — place an orb as reward for finding the bridge
          const gAngle = (mi / moatPts) * Math.PI * 2;
          const gx = moatCX + Math.cos(gAngle) * moatR2;
          const gh = moatCH + Math.sin(gAngle) * moatRH2;
          push({ type: 'orb', x: gx, height: Math.max(0.05, Math.min(0.95, gh)) });
        } else {
          const mAngle = (mi / moatPts) * Math.PI * 2;
          const mx = moatCX + Math.cos(mAngle) * moatR2;
          const mh = moatCH + Math.sin(mAngle) * moatRH2;
          if (mh > 0.05 && mh < 0.95) {
            push({ type: 'barrier', x: mx, height: mh });
          }
        }
      }
      // Central golden orb treasure
      push({ type: 'orb', x: moatCX, height: moatCH, golden: true });
      push({ type: 'boost', x: moatCX + 0.12, height: 0.5 });
    },
  },
  {
    name: 'GAUNTLET',
    threshold: 0.962,
    minTime: 25,
    delay: 1.8,
    spawn: (push) => {
      // GAUNTLET: long narrow corridor of barriers with orbs scattered inside
      const gaLen = 14;
      const gaTop = 0.6;
      const gaBot = 0.4;
      for (let gi = 0; gi < gaLen; gi++) {
        const gx = 1.1 + gi * 0.02;
        // Top wall
        push({ type: 'barrier', x: gx, height: gaTop + 0.08 });
        // Bottom wall
        push({ type: 'barrier', x: gx, height: gaBot - 0.08 });
        // Occasional orb inside corridor
        if (gi % 3 === 1) {
          const orbH = gaBot + Math.random() * (gaTop - gaBot);
          push({ type: 'orb', x: gx + 0.01, height: orbH, golden: gi === 7 });
        }
      }
      push({ type: 'boost', x: 1.1 + gaLen * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'FORTRESS WALL',
    threshold: 0.9619,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // FORTRESS WALL: thick multi-layer barrier wall with hidden passage
      const fwX = 1.1 + 0.03;
      const fwLayers = 3;
      const fwGapH = 0.3 + Math.random() * 0.4; // gap center height
      const fwGapSize = 0.12;
      for (let fl = 0; fl < fwLayers; fl++) {
        const flx = fwX + fl * 0.025;
        // Barrier segments above gap
        for (let fs = 0; fs < 3; fs++) {
          const fsh = fwGapH - fwGapSize - 0.05 - fs * 0.15;
          if (fsh > 0.05) {
            push({ type: 'barrier', x: flx, height: fsh });
          }
        }
        // Barrier segments below gap
        for (let fs = 0; fs < 3; fs++) {
          const fsh = fwGapH + fwGapSize + 0.05 + fs * 0.15;
          if (fsh < 0.95) {
            push({ type: 'barrier', x: flx, height: fsh });
          }
        }
      }
      // Reward in the passage
      push({ type: 'orb', x: fwX + 0.025, height: fwGapH, golden: true });
      push({ type: 'boost', x: fwX + fwLayers * 0.025 + 0.03, height: fwGapH });
    },
  },
  {
    name: 'DRAWBRIDGE',
    threshold: 0.9618,
    minTime: 30,
    delay: 1.8,
    spawn: (push) => {
      // DRAWBRIDGE: barrier gate that has a timed opening with orbs behind
      const dbX = 1.1 + 0.04;
      const dbGateH = 0.5;
      const dbOpen = 0.1; // gap size
      // Gate columns — barriers from top and bottom leaving a gap
      for (let dbi = 0; dbi < 4; dbi++) {
        const dbh1 = dbGateH - dbOpen - 0.03 - dbi * 0.15;
        if (dbh1 > 0.05) push({ type: 'barrier', x: dbX, height: dbh1 });
        const dbh2 = dbGateH + dbOpen + 0.03 + dbi * 0.15;
        if (dbh2 < 0.95) push({ type: 'barrier', x: dbX, height: dbh2 });
      }
      // Treasure room behind gate
      const trX = dbX + 0.06;
      for (let tr = 0; tr < 5; tr++) {
        const trh = 0.3 + tr * 0.1;
        push({ type: 'orb', x: trX + tr * 0.015, height: trh, golden: tr === 2 });
      }
      // Second gate behind treasure
      for (let dbi2 = 0; dbi2 < 3; dbi2++) {
        const dbh3 = dbGateH - dbOpen - 0.05 - dbi2 * 0.18;
        if (dbh3 > 0.05) push({ type: 'barrier', x: trX + 0.1, height: dbh3 });
        const dbh4 = dbGateH + dbOpen + 0.05 + dbi2 * 0.18;
        if (dbh4 < 0.95) push({ type: 'barrier', x: trX + 0.1, height: dbh4 });
      }
      push({ type: 'boost', x: trX + 0.13, height: dbGateH });
    },
  },
  {
    name: 'PINWHEEL',
    threshold: 0.9617,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // PINWHEEL: barriers radiating like pinwheel blades with orbs between
      const pwCX = 1.1 + 0.1;
      const pwCH = 0.5;
      const pwBlades = 5;
      const pwR3 = 0.08;
      const pwRH = 0.2;
      for (let pb = 0; pb < pwBlades; pb++) {
        const pbAngle = (pb / pwBlades) * Math.PI * 2;
        // Blade — 2 barriers along the radius
        for (let br = 1; br <= 2; br++) {
          const bDist = br * 0.4;
          const bx = pwCX + Math.cos(pbAngle) * pwR3 * bDist;
          const bh = pwCH + Math.sin(pbAngle) * pwRH * bDist;
          if (bh > 0.05 && bh < 0.95) {
            push({ type: 'barrier', x: bx, height: bh });
          }
        }
        // Orb between blades
        const betweenAngle = pbAngle + Math.PI / pwBlades;
        const ox = pwCX + Math.cos(betweenAngle) * pwR3 * 0.6;
        const oh = pwCH + Math.sin(betweenAngle) * pwRH * 0.6;
        if (oh > 0.05 && oh < 0.95) {
          push({ type: 'orb', x: ox, height: oh, golden: pb === 0 });
        }
      }
      push({ type: 'boost', x: pwCX, height: pwCH });
    },
  },
  {
    name: 'CREVASSE',
    threshold: 0.9616,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // CREVASSE: deep vertical gap in barrier floor with orbs suspended inside
      const cvX = 1.1 + 0.04;
      const cvWidth = 8; // columns across
      const cvGapStart = 3; // column index where gap starts
      const cvGapEnd = 5;
      for (let ci = 0; ci < cvWidth; ci++) {
        const cx = cvX + ci * 0.02;
        if (ci >= cvGapStart && ci < cvGapEnd) { // Gap — orbs suspended vertically
          for (let co = 0; co < 3; co++) {
            const coh = 0.3 + co * 0.2;
            push({ type: 'orb', x: cx, height: coh, golden: co === 1 && ci === 4 });
          }
        } else { // Floor barriers
          push({ type: 'barrier', x: cx, height: 0.75 });
          push({ type: 'barrier', x: cx, height: 0.55 });
        }
      }
      push({ type: 'boost', x: cvX + cvWidth * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'PULSAR BEAM',
    threshold: 0.9615,
    minTime: 40,
    delay: 1.5,
    spawn: (push) => {
      // PULSAR BEAM: central barrier core sending barrier beams outward with orbs in gaps
      const pbCX = 1.1 + 0.1;
      const pbCH = 0.5;
      // Central core barriers
      push({ type: 'barrier', x: pbCX, height: pbCH });
      push({ type: 'barrier', x: pbCX + 0.01, height: pbCH + 0.05 });
      push({ type: 'barrier', x: pbCX - 0.01, height: pbCH - 0.05 });
      // Beams radiating outward (4 directions)
      const pbBeams = 4;
      for (let pbi = 0; pbi < pbBeams; pbi++) {
        const pbAngle = (pbi / pbBeams) * Math.PI * 2 + 0.3;
        for (let pbr = 1; pbr <= 3; pbr++) {
          const pbx = pbCX + Math.cos(pbAngle) * 0.03 * pbr;
          const pbh = pbCH + Math.sin(pbAngle) * 0.08 * pbr;
          if (pbh > 0.05 && pbh < 0.95) {
            push({ type: 'barrier', x: pbx, height: pbh });
          }
        }
        // Orb in the gap between beams
        const gapAngle = pbAngle + Math.PI / pbBeams;
        const gx = pbCX + Math.cos(gapAngle) * 0.06;
        const gh = pbCH + Math.sin(gapAngle) * 0.16;
        if (gh > 0.05 && gh < 0.95) {
          push({ type: 'orb', x: gx, height: gh, golden: pbi === 0 });
        }
      }
      push({ type: 'boost', x: pbCX + 0.14, height: 0.5 });
    },
  },
  {
    name: 'ECLIPSE',
    threshold: 0.9614,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // ECLIPSE: barrier ring blocking the sun with orbs in corona gaps
      const ecCX = 1.1 + 0.1;
      const ecCH = 0.35; // slightly above center for sky feel
      const ecPts = 10;
      const ecR = 0.07;
      const ecRH = 0.18;
      const ecGaps2 = [1, 4, 7]; // corona gap positions
      for (let ei = 0; ei < ecPts; ei++) {
        const eAngle = (ei / ecPts) * Math.PI * 2;
        const ex = ecCX + Math.cos(eAngle) * ecR;
        const eh = ecCH + Math.sin(eAngle) * ecRH;
        if (ecGaps2.includes(ei)) { // Corona gap — orb
          if (eh > 0.05 && eh < 0.95) {
            push({ type: 'orb', x: ex, height: eh, golden: ei === 4 });
          }
        } else {
          if (eh > 0.05 && eh < 0.95) {
            push({ type: 'barrier', x: ex, height: eh });
          }
        }
      }
      // Center golden orb (the "sun" being eclipsed)
      push({ type: 'orb', x: ecCX, height: ecCH, golden: true });
      push({ type: 'boost', x: ecCX + 0.13, height: 0.5 });
    },
  },
  {
    name: 'TIDE POOL',
    threshold: 0.9613,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // TIDE POOL: shallow barrier basin with orbs settled at bottom
      const tpX = 1.1 + 0.03;
      const tpWidth = 8;
      const tpFloor = 0.75;
      // Side walls
      for (let tw = 0; tw < 3; tw++) {
        push({ type: 'barrier', x: tpX, height: tpFloor - tw * 0.12 });
        push({ type: 'barrier', x: tpX + (tpWidth - 1) * 0.02, height: tpFloor - tw * 0.12 });
      }
      // Floor barriers
      for (let tf = 1; tf < tpWidth - 1; tf++) {
        push({ type: 'barrier', x: tpX + tf * 0.02, height: tpFloor });
      }
      // Orbs settled above the floor
      for (let to = 1; to < tpWidth - 1; to += 2) {
        push({ type: 'orb', x: tpX + to * 0.02, height: tpFloor - 0.08, golden: to === 3 });
      }
      push({ type: 'boost', x: tpX + 0.08, height: tpFloor - 0.2 });
    },
  },
  {
    name: 'SUPERNOVA',
    threshold: 0.9612,
    minTime: 45,
    delay: 1.5,
    spawn: (push) => {
      // SUPERNOVA: expanding ring of barriers from center with orbs ejected outward
      const snCX = 1.1 + 0.1;
      const snCH = 0.5;
      // Inner ring — tight barriers
      const snInner = 6;
      for (let si2 = 0; si2 < snInner; si2++) {
        const siAngle = (si2 / snInner) * Math.PI * 2;
        const six = snCX + Math.cos(siAngle) * 0.03;
        const sih = snCH + Math.sin(siAngle) * 0.08;
        if (sih > 0.05 && sih < 0.95) {
          push({ type: 'barrier', x: six, height: sih });
        }
      }
      // Outer ring — ejected orbs
      const snOuter = 8;
      for (let so = 0; so < snOuter; so++) {
        const soAngle = (so / snOuter) * Math.PI * 2 + 0.2;
        const sox = snCX + Math.cos(soAngle) * 0.09;
        const soh = snCH + Math.sin(soAngle) * 0.22;
        if (soh > 0.05 && soh < 0.95) {
          push({ type: 'orb', x: sox, height: soh, golden: so === 0 || so === 4 });
        }
      }
      // Debris barriers between rings
      push({ type: 'barrier', x: snCX - 0.06, height: snCH + 0.15 });
      push({ type: 'barrier', x: snCX + 0.06, height: snCH - 0.15 });
      push({ type: 'boost', x: snCX, height: snCH });
    },
  },
  {
    name: 'TRIDENT',
    threshold: 0.9611,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // TRIDENT: three-pronged barrier formation with orbs in gaps
      const trCX = 1.1 + 0.06;
      const trCH = 0.5;
      // Handle (center line of barriers)
      for (let th = 0; th < 3; th++) {
        push({ type: 'barrier', x: trCX - 0.02 - th * 0.015, height: trCH });
      }
      // Three prongs diverging forward
      const prongs = [
      { dh: -0.2
      }
      ,  // top prong
      { dh: 0
      }
      ,     // center prong
      { dh: 0.2
      }
      ,   // bottom prong
      ];
      for (let pp = 0; pp < prongs.length; pp++) {
        const pH = trCH + prongs[pp].dh;
        for (let pl = 0; pl < 3; pl++) {
          const px2 = trCX + pl * 0.02;
          const ph = pH + (prongs[pp].dh * pl * 0.3);
          if (ph > 0.05 && ph < 0.95) {
            push({ type: 'barrier', x: px2, height: ph });
          }
        }
      }
      // Orbs in gaps between prongs
      push({ type: 'orb', x: trCX + 0.03, height: trCH - 0.1, golden: true });
      push({ type: 'orb', x: trCX + 0.03, height: trCH + 0.1 });
      push({ type: 'boost', x: trCX + 0.08, height: trCH });
    },
  },
  {
    name: 'CRUCIBLE',
    threshold: 0.961,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // CRUCIBLE: U-shaped barrier cup with orbs inside
      const crCX = 1.1 + 0.06;
      const crFloor = 0.7;
      const crWidth = 6;
      // U-shape: left wall + floor + right wall
      for (let cw = 0; cw < 4; cw++) {
        push({ type: 'barrier', x: crCX, height: crFloor - cw * 0.1 });
        push({ type: 'barrier', x: crCX + (crWidth - 1) * 0.02, height: crFloor - cw * 0.1 });
      }
      // Floor
      for (let cf = 1; cf < crWidth - 1; cf++) {
        push({ type: 'barrier', x: crCX + cf * 0.02, height: crFloor });
      }
      // Orbs inside the crucible
      for (let co = 1; co < crWidth - 1; co += 2) {
        push({ type: 'orb', x: crCX + co * 0.02, height: crFloor - 0.1, golden: co === 3 });
      }
      push({ type: 'boost', x: crCX + 0.04, height: crFloor - 0.25 });
    },
  },
  {
    name: 'SPIRIT RAPIDS',
    threshold: 0.9609,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // SPIRIT RAPIDS: scattered irregular barrier clusters with orb pockets
      const abLen = 12;
      const abX0 = 1.1;
      for (let ai = 0; ai < abLen; ai++) {
        const ax = abX0 + ai * 0.022 + (Math.sin(ai * 2.7) * 0.008);
        const ah = 0.3 + (Math.sin(ai * 1.9 + 0.5) * 0.5 + 0.5) * 0.4;
        if (ai % 3 === 0) { // Orb pocket
          push({ type: 'orb', x: ax, height: ah, golden: ai === 6 });
        } else {
          push({ type: 'barrier', x: ax, height: ah });
        }
      }
      push({ type: 'boost', x: abX0 + abLen * 0.022 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'CORRIDOR SHIFT',
    threshold: 0.9608,
    minTime: 30,
    delay: 2,
    spawn: (push) => {
      // CORRIDOR SHIFT: corridor that changes direction mid-way
      const csX2 = 1.1;
      const csH1 = 0.4; // initial corridor center
      const csH2a = 0.6; // shifted corridor center
      const csHalf = 6;
      const csGap = 0.1;
      // First half — corridor at csH1
      for (let ch = 0; ch < csHalf; ch++) {
        const cx = csX2 + ch * 0.02;
        push({ type: 'barrier', x: cx, height: csH1 + csGap + 0.06 });
        push({ type: 'barrier', x: cx, height: csH1 - csGap - 0.06 });
        if (ch % 2 === 1) {
          push({ type: 'orb', x: cx, height: csH1 });
        }
      }
      // Transition — diagonal orbs connecting old and new height
      push({ type: 'orb', x: csX2 + csHalf * 0.02, height: (csH1 + csH2a) / 2, golden: true });
      // Second half — corridor at csH2a
      for (let ch2 = 0; ch2 < csHalf; ch2++) {
        const cx2 = csX2 + (csHalf + 1 + ch2) * 0.02;
        push({ type: 'barrier', x: cx2, height: csH2a + csGap + 0.06 });
        push({ type: 'barrier', x: cx2, height: csH2a - csGap - 0.06 });
        if (ch2 % 2 === 1) {
          push({ type: 'orb', x: cx2, height: csH2a });
        }
      }
      push({ type: 'boost', x: csX2 + (csHalf * 2 + 1) * 0.02 + 0.02, height: csH2a });
    },
  },
  {
    name: 'RAMP',
    threshold: 0.9607,
    minTime: 20,
    delay: 1.5,
    spawn: (push) => {
      // RAMP: ascending barrier ramp with orbs along the top edge
      const rpLen = 8;
      const rpStartH = 0.75;
      const rpEndH = 0.25;
      for (let ri = 0; ri < rpLen; ri++) {
        const rx = 1.1 + ri * 0.022;
        const rh = rpStartH + (rpEndH - rpStartH) * (ri / (rpLen - 1));
        // Ramp barrier
        push({ type: 'barrier', x: rx, height: rh });
        // Below the ramp — additional barrier for thickness
        if (rh + 0.1 < 0.95) {
          push({ type: 'barrier', x: rx, height: rh + 0.1 });
        }
        // Orb on top edge
        if (ri % 2 === 0) {
          push({ type: 'orb', x: rx, height: rh - 0.08, golden: ri === 4 });
        }
      }
      push({ type: 'boost', x: 1.1 + rpLen * 0.022 + 0.02, height: rpEndH - 0.1 });
    },
  },
  {
    name: 'SPIRAL STAIRCASE',
    threshold: 0.9606,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // SPIRAL STAIRCASE: ascending spiral with orbs on each landing
      const ssSteps = 8;
      const ssX0 = 1.1;
      for (let ss = 0; ss < ssSteps; ss++) {
        const ssx = ssX0 + ss * 0.025;
        const ssAngle = (ss / ssSteps) * Math.PI * 2;
        const ssh = 0.7 - (ss / ssSteps) * 0.5 + Math.sin(ssAngle) * 0.08;
        // Step barrier
        push({ type: 'barrier', x: ssx, height: Math.max(0.05, Math.min(0.95, ssh)) });
        // Landing orb above step
        const orbH2 = ssh - 0.1;
        if (orbH2 > 0.05 && orbH2 < 0.95) {
          push({ type: 'orb', x: ssx + 0.01, height: orbH2, golden: ss === ssSteps - 1 });
        }
      }
      push({ type: 'boost', x: ssX0 + ssSteps * 0.025 + 0.02, height: 0.2 });
    },
  },
  {
    name: 'CANYON',
    threshold: 0.9605,
    minTime: 25,
    delay: 1.8,
    spawn: (push) => {
      // CANYON: deep channel with high barrier walls on both sides
      const cnLen = 10;
      const cnCenter = 0.5;
      const cnHalfGap = 0.08;
      for (let ci2 = 0; ci2 < cnLen; ci2++) {
        const cx2 = 1.1 + ci2 * 0.02;
        const cnWave = Math.sin(ci2 * 0.7) * 0.05;
        // Top wall
        for (let cw2 = 0; cw2 < 2; cw2++) {
          const cwh = cnCenter - cnHalfGap - 0.06 - cw2 * 0.12 + cnWave;
          if (cwh > 0.05) push({ type: 'barrier', x: cx2, height: cwh });
        }
        // Bottom wall
        for (let cw3 = 0; cw3 < 2; cw3++) {
          const cwh2 = cnCenter + cnHalfGap + 0.06 + cw3 * 0.12 + cnWave;
          if (cwh2 < 0.95) push({ type: 'barrier', x: cx2, height: cwh2 });
        }
        // Orbs inside canyon
        if (ci2 % 3 === 1) {
          push({ type: 'orb', x: cx2, height: cnCenter + cnWave, golden: ci2 === 7 });
        }
      }
      push({ type: 'boost', x: 1.1 + cnLen * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'BOTTLENECK',
    threshold: 0.9604,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // BOTTLENECK: wide open → narrow pinch → wide open with orbs through
      const bnLen = 10;
      const bnCenter = 0.5;
      for (let bi = 0; bi < bnLen; bi++) {
        const bx2 = 1.1 + bi * 0.02;
        const progress2 = bi / (bnLen - 1);
        // Narrow in the middle, wide at edges
        const bnGap = 0.3 - 0.22 * Math.sin(progress2 * Math.PI);
        push({ type: 'barrier', x: bx2, height: bnCenter - bnGap });
        push({ type: 'barrier', x: bx2, height: bnCenter + bnGap });
        // Orbs through the center
        if (bi % 2 === 0) {
          push({ type: 'orb', x: bx2, height: bnCenter, golden: bi === 4 });
        }
      }
      push({ type: 'boost', x: 1.1 + bnLen * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'KEYSTONE',
    threshold: 0.9603,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // KEYSTONE: arch-shaped barrier with keystone golden orb at apex
      const ksX = 1.1 + 0.04;
      const ksApex = 0.2;
      const ksBase = 0.7;
      const ksPts = 7;
      for (let ki = 0; ki < ksPts; ki++) {
        const progress3 = ki / (ksPts - 1);
        const kx = ksX + ki * 0.02;
        // Arch shape — parabola from base through apex and back
        const kh = ksBase + (ksApex - ksBase) * (1 - Math.pow(progress3 * 2 - 1, 2));
        push({ type: 'barrier', x: kx, height: kh });
        // Orb above arch
        if (ki === Math.floor(ksPts / 2)) { // Keystone orb at apex
          push({ type: 'orb', x: kx, height: kh - 0.08, golden: true });
        }
      }
      // Supporting pillar barriers at base
      push({ type: 'barrier', x: ksX, height: ksBase + 0.1 });
      push({ type: 'barrier', x: ksX + (ksPts - 1) * 0.02, height: ksBase + 0.1 });
      push({ type: 'boost', x: ksX + 0.06, height: ksBase + 0.05 });
    },
  },
  {
    name: 'PIRANHA',
    threshold: 0.9602,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // PIRANHA: small clusters of barriers attacking from multiple heights
      const pirClusters = 4;
      for (let pc2 = 0; pc2 < pirClusters; pc2++) {
        const pcx = 1.1 + pc2 * 0.05;
        const pch = 0.2 + pc2 * 0.18;
        // 3-barrier cluster
        push({ type: 'barrier', x: pcx, height: pch });
        push({ type: 'barrier', x: pcx + 0.015, height: pch - 0.05 });
        push({ type: 'barrier', x: pcx + 0.015, height: pch + 0.05 });
        // Orb between clusters
        if (pc2 < pirClusters - 1) {
          const orbH3 = (pch + (0.2 + (pc2 + 1) * 0.18)) / 2;
          push({ type: 'orb', x: pcx + 0.03, height: orbH3, golden: pc2 === 1 });
        }
      }
      push({ type: 'boost', x: 1.1 + pirClusters * 0.05 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'PENDULUM GATE',
    threshold: 0.9601,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // PENDULUM GATE: gates with barrier pairs at alternating heights
      const pgGates = 5;
      for (let pg = 0; pg < pgGates; pg++) {
        const pgx = 1.1 + pg * 0.04;
        // Alternating gate position (high then low)
        const pgCenter = pg % 2 === 0 ? 0.35 : 0.65;
        const pgGap2 = 0.1;
        // Top barrier
        for (let pt = 0; pt < 2; pt++) {
          const pth = pgCenter - pgGap2 - 0.05 - pt * 0.12;
          if (pth > 0.05) push({ type: 'barrier', x: pgx, height: pth });
        }
        // Bottom barrier
        for (let pb2 = 0; pb2 < 2; pb2++) {
          const pbh = pgCenter + pgGap2 + 0.05 + pb2 * 0.12;
          if (pbh < 0.95) push({ type: 'barrier', x: pgx, height: pbh });
        }
        // Orb in the gate
        push({ type: 'orb', x: pgx + 0.01, height: pgCenter, golden: pg === 2 });
      }
      push({ type: 'boost', x: 1.1 + pgGates * 0.04 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'ANVIL',
    threshold: 0.96,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // ANVIL: flat top barrier formation with tapered bottom
      const avX = 1.1 + 0.03;
      const avTopW = 6;
      const avTopH = 0.3;
      // Flat top — wide barrier line
      for (let at = 0; at < avTopW; at++) {
        push({ type: 'barrier', x: avX + at * 0.02, height: avTopH });
      }
      // Tapered stem — narrower barriers going down
      const avStemW = 2;
      const avStemX = avX + (avTopW - avStemW) * 0.01;
      for (let as = 0; as < 3; as++) {
        for (let sw2 = 0; sw2 < avStemW; sw2++) {
          push({ type: 'barrier', x: avStemX + sw2 * 0.02, height: avTopH + 0.1 + as * 0.1 });
        }
      }
      // Orbs around the anvil
      push({ type: 'orb', x: avX - 0.02, height: avTopH + 0.1 });
      push({ type: 'orb', x: avX + avTopW * 0.02, height: avTopH + 0.1, golden: true });
      push({ type: 'orb', x: avX + 0.04, height: avTopH - 0.08 });
      push({ type: 'boost', x: avX + 0.04, height: avTopH + 0.35 });
    },
  },
  {
    name: 'SWITCHBACK',
    threshold: 0.9599,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // SWITCHBACK: rapid back-and-forth path with tight reversals
      const sbLen = 10;
      for (let sb2 = 0; sb2 < sbLen; sb2++) {
        const sbx = 1.1 + sb2 * 0.02;
        const sbHigh = sb2 % 2 === 0 ? 0.3 : 0.7;
        const sbLow = sb2 % 2 === 0 ? 0.7 : 0.3;
        // Barrier on one side
        push({ type: 'barrier', x: sbx, height: sbHigh });
        // Orb on the other side (safe path)
        push({ type: 'orb', x: sbx, height: sbLow, golden: sb2 === 5 });
      }
      push({ type: 'boost', x: 1.1 + sbLen * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'WEAVE',
    threshold: 0.9598,
    minTime: 25,
    delay: 1.8,
    spawn: (push) => {
      // WEAVE: sinusoidal path requiring continuous vertical adjustment
      const wvLen = 12;
      const wvAmp2 = 0.2;
      const wvFreq2 = 1.5;
      for (let wv = 0; wv < wvLen; wv++) {
        const wvx = 1.1 + wv * 0.02;
        const wvProgress = wv / (wvLen - 1);
        const wvCenter = 0.5 + Math.sin(wvProgress * Math.PI * wvFreq2) * wvAmp2;
        // Barriers flanking the path
        if (wvCenter - 0.12 > 0.05) push({ type: 'barrier', x: wvx, height: wvCenter - 0.12 });
        if (wvCenter + 0.12 < 0.95) push({ type: 'barrier', x: wvx, height: wvCenter + 0.12 });
        // Path orbs
        if (wv % 2 === 0) {
          push({ type: 'orb', x: wvx, height: wvCenter, golden: wv === 6 });
        }
      }
      push({ type: 'boost', x: 1.1 + wvLen * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'REED',
    threshold: 0.9597,
    minTime: 20,
    delay: 1.5,
    spawn: (push) => {
      // REED: vertical barrier pillars with orbs threading between them
      const rdPillars = 6;
      for (let rd = 0; rd < rdPillars; rd++) {
        const rdx = 1.1 + rd * 0.035;
        const rdh = 0.3 + rd * 0.07;
        // Vertical pillar of 2 stacked barriers
        push({ type: 'barrier', x: rdx, height: rdh });
        push({ type: 'barrier', x: rdx, height: rdh + 0.12 });
        // Orb threading between pillars
        if (rd < rdPillars - 1) {
          const orbX = rdx + 0.017;
          const orbH4 = rdh + 0.06;
          push({ type: 'orb', x: orbX, height: orbH4, golden: rd === 3 });
        }
      }
      push({ type: 'boost', x: 1.1 + rdPillars * 0.035 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'CLIFF',
    threshold: 0.9596,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // CLIFF: sudden barrier wall drop-off with orbs at bottom
      const clX = 1.1 + 0.03;
      // Flat ledge at top
      for (let cl = 0; cl < 4; cl++) {
        push({ type: 'barrier', x: clX + cl * 0.02, height: 0.35 });
      }
      // Cliff face — vertical wall of barriers
      for (let cf2 = 0; cf2 < 4; cf2++) {
        push({ type: 'barrier', x: clX + 0.08, height: 0.35 + cf2 * 0.1 });
      }
      // Orbs at bottom of cliff
      for (let co2 = 0; co2 < 3; co2++) {
        push({ type: 'orb', x: clX + 0.1 + co2 * 0.02, height: 0.75, golden: co2 === 1 });
      }
      push({ type: 'boost', x: clX + 0.16, height: 0.5 });
    },
  },
  {
    name: 'OLYMPUS',
    threshold: 0.9338,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // OLYMPUS: towering barrier mountain with summit treasure
      const olX = 1.08;
      // Mountain slope (ascending barriers)
      for (let ol1 = 0; ol1 < 6; ol1++) {
        push({ type: 'barrier', x: olX + ol1 * 0.01, height: 0.2 + ol1 * 0.07 });
      }
      // Summit barriers
      push({ type: 'barrier', x: olX + 0.06, height: 0.65 });
      push({ type: 'barrier', x: olX + 0.07, height: 0.63 });
      // Summit treasure
      push({ type: 'orb', x: olX + 0.065, height: 0.72, golden: true });
      push({ type: 'boost', x: olX + 0.065, height: 0.7 });
      // Descent orbs
      for (let ol2 = 0; ol2 < 3; ol2++) {
        push({ type: 'orb', x: olX + 0.08 + ol2 * 0.01, height: 0.6 - ol2 * 0.08 });
      }
    },
  },
  {
    name: 'AGORA',
    threshold: 0.9339,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // AGORA: marketplace grid with vendor stalls
      const agX = 1.08;
      // Grid layout
      for (let ag1 = 0; ag1 < 3; ag1++) {
        for (let ag2 = 0; ag2 < 2; ag2++) {
          push({ type: 'barrier', x: agX + ag1 * 0.025, height: 0.3 + ag2 * 0.25 });
        }
      }
      // Vendor wares (orbs between stalls)
      push({ type: 'orb', x: agX + 0.012, height: 0.42 });
      push({ type: 'orb', x: agX + 0.037, height: 0.42 });
      push({ type: 'orb', x: agX + 0.025, height: 0.42, golden: true });
      // Exit reward
      push({ type: 'boost', x: agX + 0.065, height: 0.45 });
    },
  },
  {
    name: 'ORACLE TEMPLE',
    threshold: 0.934,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // ORACLE TEMPLE: ascending barrier steps to revelation
      const otX = 1.08;
      // Steps (ascending barriers)
      for (let ot1 = 0; ot1 < 5; ot1++) {
        push({ type: 'barrier', x: otX + ot1 * 0.015, height: 0.2 + ot1 * 0.06 });
      }
      // Descending steps
      for (let ot2 = 0; ot2 < 3; ot2++) {
        push({ type: 'barrier', x: otX + 0.075 + ot2 * 0.015, height: 0.44 - ot2 * 0.06 });
      }
      // Revelation (top reward)
      push({ type: 'orb', x: otX + 0.06, height: 0.55, golden: true });
      push({ type: 'orb', x: otX + 0.06, height: 0.6 });
      push({ type: 'boost', x: otX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'GOLDEN FLEECE',
    threshold: 0.9341,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // GOLDEN FLEECE: heavily guarded single golden orb prize
      const gfX = 1.08;
      // Dense guard barriers
      for (let gf1 = 0; gf1 < 3; gf1++) {
        for (let gf2 = 0; gf2 < 4; gf2++) {
          const gfH = 0.25 + gf2 * 0.1;
          if (!(gf1 === 1 && gf2 === 2)) { // One gap
            push({ type: 'barrier', x: gfX + gf1 * 0.012, height: gfH });
          }
        }
      }
      // The fleece
      push({ type: 'orb', x: gfX + 0.012, height: 0.45, golden: true });
      // Escape path
      push({ type: 'orb', x: gfX + 0.04, height: 0.45 });
      push({ type: 'boost', x: gfX + 0.05, height: 0.45 });
    },
  },
  {
    name: 'CYCLOPS CAVE',
    threshold: 0.9342,
    minTime: 30,
    delay: 1.1,
    spawn: (push) => {
      // CYCLOPS CAVE: single large gap in thick barrier wall
      const ccX2 = 1.08;
      // Thick cave walls
      for (let cc2 = 0; cc2 < 3; cc2++) {
        for (let cc3 = 0; cc3 < 8; cc3++) {
          const ccH = 0.15 + cc3 * 0.08;
          if (ccH < 0.4 || ccH > 0.52) { // Single gap
            push({ type: 'barrier', x: ccX2 + cc2 * 0.008, height: ccH });
          }
        }
      }
      // Cave treasure in gap
      push({ type: 'orb', x: ccX2 + 0.008, height: 0.45, golden: true });
      push({ type: 'boost', x: ccX2 + 0.03, height: 0.45 });
    },
  },
  {
    name: 'ODYSSEY PATH',
    threshold: 0.9343,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // ODYSSEY PATH: long winding journey with varied encounters
      const odX = 1.08;
      // Mixed obstacle course
      push({ type: 'barrier', x: odX, height: 0.35 });
      push({ type: 'orb', x: odX + 0.012, height: 0.5 });
      push({ type: 'barrier', x: odX + 0.024, height: 0.55 });
      push({ type: 'orb', x: odX + 0.036, height: 0.35 });
      push({ type: 'barrier', x: odX + 0.048, height: 0.4 });
      push({ type: 'orb', x: odX + 0.06, height: 0.55 });
      push({ type: 'barrier', x: odX + 0.072, height: 0.5 });
      push({ type: 'orb', x: odX + 0.084, height: 0.4, golden: true });
      push({ type: 'boost', x: odX + 0.096, height: 0.45 });
    },
  },
  {
    name: 'CHARYBDIS',
    threshold: 0.9344,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // CHARYBDIS: whirlpool barrier spiral with central treasure
      const cyX = 1.08;
      // Spiral barriers
      for (let cy1 = 0; cy1 < 6; cy1++) {
        const cyAngle = cy1 * 1.0;
        const cyR = 0.005 + cy1 * 0.005;
        const cyBx = cyX + 0.03 + Math.cos(cyAngle) * cyR;
        const cyBh = 0.45 + Math.sin(cyAngle) * cyR * 8;
        push({ type: 'barrier', x: cyBx, height: cyBh });
      }
      // Eye of storm rewards
      push({ type: 'orb', x: cyX + 0.03, height: 0.45, golden: true });
      push({ type: 'boost', x: cyX + 0.03, height: 0.42 });
      // Escape orbs
      push({ type: 'orb', x: cyX + 0.06, height: 0.4 });
      push({ type: 'orb', x: cyX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'SIREN SONG',
    threshold: 0.9345,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // SIREN SONG: wavy barrier path luring toward orbs
      const ssX2 = 1.08;
      // Wavy barrier lines
      for (let ss3 = 0; ss3 < 6; ss3++) {
        const ssH2 = 0.45 + Math.sin(ss3 * 1.0) * 0.15;
        push({ type: 'barrier', x: ssX2 + ss3 * 0.013, height: ssH2 + 0.1 });
        push({ type: 'barrier', x: ssX2 + ss3 * 0.013, height: ssH2 - 0.1 });
      }
      // Luring orbs along the wave
      for (let ss4 = 0; ss4 < 5; ss4++) {
        const ssOrbH = 0.45 + Math.sin(ss4 * 1.0) * 0.15;
        push({ type: 'orb', x: ssX2 + ss4 * 0.013 + 0.006, height: ssOrbH });
      }
      push({ type: 'orb', x: ssX2 + 0.08, height: 0.45, golden: true });
    },
  },
  {
    name: 'POSEIDON\'S TRIDENT',
    threshold: 0.9346,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // POSEIDON'S TRIDENT: three-pronged barrier attack with gap rewards
      const ptX2 = 1.08;
      // Three prongs
      for (let pt3 = 0; pt3 < 4; pt3++) {
        push({ type: 'barrier', x: ptX2 + pt3 * 0.01, height: 0.25 });
        push({ type: 'barrier', x: ptX2 + pt3 * 0.01, height: 0.45 });
        push({ type: 'barrier', x: ptX2 + pt3 * 0.01, height: 0.65 });
      }
      // Gap rewards between prongs
      push({ type: 'orb', x: ptX2 + 0.015, height: 0.35 });
      push({ type: 'orb', x: ptX2 + 0.015, height: 0.55 });
      push({ type: 'orb', x: ptX2 + 0.03, height: 0.35, golden: true });
      push({ type: 'boost', x: ptX2 + 0.05, height: 0.45 });
    },
  },
  {
    name: 'TRIREME',
    threshold: 0.9347,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // TRIREME: ship-shaped barrier hull with treasure cargo
      const trX3 = 1.08;
      // Hull shape (barriers forming boat)
      push({ type: 'barrier', x: trX3, height: 0.4 });
      push({ type: 'barrier', x: trX3 + 0.01, height: 0.35 });
      push({ type: 'barrier', x: trX3 + 0.02, height: 0.33 });
      push({ type: 'barrier', x: trX3 + 0.03, height: 0.33 });
      push({ type: 'barrier', x: trX3 + 0.04, height: 0.35 });
      push({ type: 'barrier', x: trX3 + 0.05, height: 0.4 });
      // Deck barriers
      push({ type: 'barrier', x: trX3 + 0.01, height: 0.55 });
      push({ type: 'barrier', x: trX3 + 0.04, height: 0.55 });
      // Cargo orbs
      push({ type: 'orb', x: trX3 + 0.02, height: 0.45 });
      push({ type: 'orb', x: trX3 + 0.03, height: 0.45, golden: true });
      push({ type: 'boost', x: trX3 + 0.06, height: 0.45 });
    },
  },
  {
    name: 'AMPHORA ROW',
    threshold: 0.9348,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // AMPHORA ROW: line of jar barriers with single safe gap
      const arX = 1.08;
      // Row of jars
      for (let ar1 = 0; ar1 < 7; ar1++) {
        if (ar1 !== 3) { // Gap at position 3
          push({ type: 'barrier', x: arX + 0.01, height: 0.2 + ar1 * 0.08 });
        }
      }
      // Second row behind
      for (let ar2 = 0; ar2 < 7; ar2++) {
        if (ar2 !== 4) { // Different gap position
          push({ type: 'barrier', x: arX + 0.025, height: 0.2 + ar2 * 0.08 });
        }
      }
      // Rewards in gaps
      push({ type: 'orb', x: arX + 0.01, height: 0.44 });
      push({ type: 'orb', x: arX + 0.025, height: 0.52, golden: true });
      push({ type: 'boost', x: arX + 0.04, height: 0.48 });
    },
  },
  {
    name: 'THERMAE',
    threshold: 0.9349,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // THERMAE: bath house with pool chambers and steam rewards
      const thX = 1.08;
      // Pool dividers
      for (let th1 = 0; th1 < 3; th1++) {
        push({ type: 'barrier', x: thX + th1 * 0.025, height: 0.35 });
        push({ type: 'barrier', x: thX + th1 * 0.025, height: 0.55 });
      }
      // Pool orbs (each chamber)
      push({ type: 'orb', x: thX + 0.012, height: 0.45 });
      push({ type: 'orb', x: thX + 0.037, height: 0.45 });
      push({ type: 'orb', x: thX + 0.037, height: 0.42, golden: true });
      // Steam reward at exit
      push({ type: 'boost', x: thX + 0.065, height: 0.45 });
      push({ type: 'orb', x: thX + 0.08, height: 0.4 });
      push({ type: 'orb', x: thX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'PANTHEON',
    threshold: 0.935,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // PANTHEON: domed barrier ceiling with skylight orb column
      const pnX = 1.08;
      // Dome curve (barriers forming arch)
      for (let pn1 = 0; pn1 < 5; pn1++) {
        const pnAngle = (pn1 / 4) * Math.PI;
        const pnH = 0.55 + Math.sin(pnAngle) * 0.15;
        push({ type: 'barrier', x: pnX + pn1 * 0.012, height: pnH });
      }
      // Wall barriers
      push({ type: 'barrier', x: pnX, height: 0.3 });
      push({ type: 'barrier', x: pnX + 0.048, height: 0.3 });
      // Skylight column (orbs)
      for (let pn2 = 0; pn2 < 3; pn2++) {
        push({ type: 'orb', x: pnX + 0.024, height: 0.35 + pn2 * 0.08 });
      }
      push({ type: 'orb', x: pnX + 0.024, height: 0.3, golden: true });
      push({ type: 'boost', x: pnX + 0.06, height: 0.45 });
    },
  },
  {
    name: 'SENATE CHAMBER',
    threshold: 0.9351,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // SENATE CHAMBER: enclosed debate hall with contested rewards
      const scX2 = 1.08;
      // Chamber walls
      push({ type: 'barrier', x: scX2, height: 0.25 });
      push({ type: 'barrier', x: scX2, height: 0.35 });
      push({ type: 'barrier', x: scX2, height: 0.55 });
      push({ type: 'barrier', x: scX2, height: 0.65 });
      // Interior seating barriers
      push({ type: 'barrier', x: scX2 + 0.025, height: 0.3 });
      push({ type: 'barrier', x: scX2 + 0.025, height: 0.6 });
      // Central podium rewards
      push({ type: 'orb', x: scX2 + 0.012, height: 0.45 });
      push({ type: 'orb', x: scX2 + 0.012, height: 0.5, golden: true });
      // Exit
      push({ type: 'boost', x: scX2 + 0.04, height: 0.45 });
      push({ type: 'orb', x: scX2 + 0.055, height: 0.42 });
      push({ type: 'orb', x: scX2 + 0.055, height: 0.48 });
    },
  },
  {
    name: 'CHARIOT RACE',
    threshold: 0.9352,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CHARIOT RACE: two parallel lanes of barriers with crossing orbs
      const chX = 1.08;
      // High lane barriers
      for (let ch1 = 0; ch1 < 5; ch1++) {
        push({ type: 'barrier', x: chX + ch1 * 0.015, height: 0.6 });
      }
      // Low lane barriers
      for (let ch2 = 0; ch2 < 5; ch2++) {
        push({ type: 'barrier', x: chX + ch2 * 0.015, height: 0.3 });
      }
      // Crossing orbs (zigzag between lanes)
      for (let ch3 = 0; ch3 < 4; ch3++) {
        const chH = ch3 % 2 === 0 ? 0.45 : 0.42;
        push({ type: 'orb', x: chX + ch3 * 0.018, height: chH });
      }
      push({ type: 'orb', x: chX + 0.08, height: 0.45, golden: true });
    },
  },
  {
    name: 'GLADIATOR PIT',
    threshold: 0.9353,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // GLADIATOR PIT: enclosed arena with risk/reward choice
      const gpX = 1.08;
      // Arena walls
      for (let gp1 = 0; gp1 < 3; gp1++) {
        push({ type: 'barrier', x: gpX + gp1 * 0.02, height: 0.2 });
        push({ type: 'barrier', x: gpX + gp1 * 0.02, height: 0.7 });
      }
      // Dangerous center barriers
      push({ type: 'barrier', x: gpX + 0.02, height: 0.4 });
      push({ type: 'barrier', x: gpX + 0.02, height: 0.5 });
      // High-value rewards amid danger
      push({ type: 'orb', x: gpX + 0.01, height: 0.45, golden: true });
      push({ type: 'orb', x: gpX + 0.03, height: 0.45, golden: true });
      push({ type: 'boost', x: gpX + 0.05, height: 0.45 });
    },
  },
  {
    name: 'CENTURION MARCH',
    threshold: 0.9354,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // CENTURION MARCH: advancing barrier formation with escort orbs
      const cmX2 = 1.08;
      // Marching formation (V-shape barriers)
      for (let cm1 = 0; cm1 < 3; cm1++) {
        push({ type: 'barrier', x: cmX2 + cm1 * 0.01, height: 0.35 + cm1 * 0.05 });
        push({ type: 'barrier', x: cmX2 + cm1 * 0.01, height: 0.55 - cm1 * 0.05 });
      }
      // Following formation
      for (let cm2 = 0; cm2 < 3; cm2++) {
        push({ type: 'barrier', x: cmX2 + 0.04 + cm2 * 0.01, height: 0.35 + cm2 * 0.05 });
        push({ type: 'barrier', x: cmX2 + 0.04 + cm2 * 0.01, height: 0.55 - cm2 * 0.05 });
      }
      // Escort orbs between formations
      push({ type: 'orb', x: cmX2 + 0.035, height: 0.45 });
      push({ type: 'orb', x: cmX2 + 0.075, height: 0.45, golden: true });
      push({ type: 'boost', x: cmX2 + 0.09, height: 0.45 });
    },
  },
  {
    name: 'FORUM',
    threshold: 0.9355,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // FORUM: open plaza with scattered vendor rewards
      const fmX = 1.08;
      // Plaza corner barriers
      push({ type: 'barrier', x: fmX, height: 0.25 });
      push({ type: 'barrier', x: fmX, height: 0.65 });
      push({ type: 'barrier', x: fmX + 0.06, height: 0.25 });
      push({ type: 'barrier', x: fmX + 0.06, height: 0.65 });
      // Scattered vendor orbs
      push({ type: 'orb', x: fmX + 0.015, height: 0.35 });
      push({ type: 'orb', x: fmX + 0.03, height: 0.5 });
      push({ type: 'orb', x: fmX + 0.045, height: 0.38 });
      push({ type: 'orb', x: fmX + 0.03, height: 0.45, golden: true });
      push({ type: 'boost', x: fmX + 0.08, height: 0.45 });
    },
  },
  {
    name: 'TRIUMPHAL ARCH',
    threshold: 0.9356,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // TRIUMPHAL ARCH: grand archway with guarded treasures
      const taX = 1.08;
      // Left pillar
      push({ type: 'barrier', x: taX, height: 0.25 });
      push({ type: 'barrier', x: taX, height: 0.35 });
      push({ type: 'barrier', x: taX + 0.005, height: 0.25 });
      // Right pillar
      push({ type: 'barrier', x: taX, height: 0.6 });
      push({ type: 'barrier', x: taX, height: 0.7 });
      push({ type: 'barrier', x: taX + 0.005, height: 0.7 });
      // Archway keystone
      push({ type: 'barrier', x: taX + 0.003, height: 0.75 });
      // Through-arch rewards
      push({ type: 'orb', x: taX + 0.003, height: 0.45 });
      push({ type: 'orb', x: taX + 0.003, height: 0.52, golden: true });
      // Beyond arch
      push({ type: 'boost', x: taX + 0.025, height: 0.45 });
      push({ type: 'orb', x: taX + 0.04, height: 0.4 });
      push({ type: 'orb', x: taX + 0.04, height: 0.5 });
    },
  },
  {
    name: 'ROMAN ROAD',
    threshold: 0.9357,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // ROMAN ROAD: straight path lined with barriers, orbs along the way
      const rrX = 1.08;
      // Road barriers (consistent height)
      for (let rr1 = 0; rr1 < 8; rr1++) {
        push({ type: 'barrier', x: rrX + rr1 * 0.01, height: 0.3 });
        push({ type: 'barrier', x: rrX + rr1 * 0.01, height: 0.6 });
      }
      // Road milestones (orbs)
      for (let rr2 = 0; rr2 < 4; rr2++) {
        push({ type: 'orb', x: rrX + rr2 * 0.02, height: 0.45 });
      }
      push({ type: 'orb', x: rrX + 0.085, height: 0.45, golden: true });
    },
  },
  {
    name: 'AQUEDUCT BRIDGE',
    threshold: 0.9358,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // AQUEDUCT BRIDGE: elevated barrier channel with waterfall orbs
      const abX = 1.08;
      // Bridge deck (high barriers)
      for (let ab1 = 0; ab1 < 5; ab1++) {
        push({ type: 'barrier', x: abX + ab1 * 0.015, height: 0.65 });
      }
      // Support pillars
      push({ type: 'barrier', x: abX + 0.015, height: 0.4 });
      push({ type: 'barrier', x: abX + 0.045, height: 0.4 });
      // Waterfall orbs (below bridge)
      for (let ab2 = 0; ab2 < 4; ab2++) {
        push({ type: 'orb', x: abX + 0.03, height: 0.25 + ab2 * 0.05 });
      }
      push({ type: 'orb', x: abX + 0.03, height: 0.2, golden: true });
      push({ type: 'boost', x: abX + 0.08, height: 0.35 });
    },
  },
  {
    name: 'COLOSSEUM',
    threshold: 0.9359,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // COLOSSEUM: arena ring with gladiator rewards at center
      const coX = 1.08;
      // Arena walls — curved barrier placement
      for (let co1 = 0; co1 < 6; co1++) {
        const coAngle = (co1 / 6) * Math.PI;
        const coBx = coX + 0.035 + Math.cos(coAngle) * 0.03;
        const coBh = 0.45 + Math.sin(coAngle) * 0.15;
        push({ type: 'barrier', x: coBx, height: coBh });
      }
      // Center rewards
      push({ type: 'orb', x: coX + 0.035, height: 0.4 });
      push({ type: 'orb', x: coX + 0.035, height: 0.5, golden: true });
      push({ type: 'boost', x: coX + 0.035, height: 0.45 });
    },
  },
  {
    name: 'LABYRINTH',
    threshold: 0.936,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // LABYRINTH: maze-like barrier grid with single safe path
      const lbX = 1.08;
      // Maze walls
      for (let lb1 = 0; lb1 < 4; lb1++) {
        for (let lb2 = 0; lb2 < 3; lb2++) {
          if (!(lb1 === 1 && lb2 === 1) && !(lb1 === 2 && lb2 === 1) && !(lb1 === 3 && lb2 === 2)) {
            push({ type: 'barrier', x: lbX + lb1 * 0.015, height: 0.3 + lb2 * 0.1 });
          }
        }
      }
      // Safe path orbs
      push({ type: 'orb', x: lbX + 0.015, height: 0.4 });
      push({ type: 'orb', x: lbX + 0.03, height: 0.4 });
      push({ type: 'orb', x: lbX + 0.045, height: 0.5, golden: true });
      push({ type: 'boost', x: lbX + 0.07, height: 0.4 });
    },
  },
  {
    name: 'MERCHANT GUILD',
    threshold: 0.9361,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // MERCHANT GUILD: paired barrier gates with alternating rewards
      const mgX = 1.08;
      for (let mg1 = 0; mg1 < 4; mg1++) {
        const mgOff = mg1 * 0.022;
        // Gate pillars
        push({ type: 'barrier', x: mgX + mgOff, height: 0.25 });
        push({ type: 'barrier', x: mgX + mgOff, height: 0.65 });
        // Alternating orb and boost between gates
        if (mg1 < 3) {
          push({ type: mg1 % 2 === 0 ? 'orb' : 'boost', x: mgX + mgOff + 0.011, height: 0.45 });
        }
      }
      push({ type: 'orb', x: mgX + 0.09, height: 0.45, golden: true });
    },
  },
  {
    name: 'SPICE MARKET',
    threshold: 0.9362,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // SPICE MARKET: dense cluster of reward orbs with light barriers
      const smX3 = 1.08;
      // Market stall barriers
      push({ type: 'barrier', x: smX3, height: 0.3 });
      push({ type: 'barrier', x: smX3 + 0.04, height: 0.55 });
      push({ type: 'barrier', x: smX3 + 0.07, height: 0.35 });
      // Dense spice orbs
      for (let sm1 = 0; sm1 < 3; sm1++) {
        for (let sm2 = 0; sm2 < 2; sm2++) {
          push({ type: 'orb', x: smX3 + 0.01 + sm1 * 0.02, height: 0.38 + sm2 * 0.12 });
        }
      }
      push({ type: 'orb', x: smX3 + 0.055, height: 0.42, golden: true });
      push({ type: 'boost', x: smX3 + 0.09, height: 0.45 });
    },
  },
  {
    name: 'SILK ROAD',
    threshold: 0.9363,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // SILK ROAD: long winding trade path with scattered riches
      const srX = 1.08;
      // Winding barrier path
      for (let sr1 = 0; sr1 < 6; sr1++) {
        const srH = 0.4 + Math.sin(sr1 * 0.7) * 0.1;
        push({ type: 'barrier', x: srX + sr1 * 0.015, height: srH + 0.12 });
        push({ type: 'barrier', x: srX + sr1 * 0.015, height: srH - 0.12 });
      }
      // Trade goods (orbs along path)
      for (let sr2 = 0; sr2 < 5; sr2++) {
        const srOrbH = 0.4 + Math.sin(sr2 * 0.7) * 0.1;
        push({ type: 'orb', x: srX + sr2 * 0.015 + 0.007, height: srOrbH });
      }
      push({ type: 'orb', x: srX + 0.1, height: 0.45, golden: true });
    },
  },
  {
    name: 'PERSIAN GARDEN',
    threshold: 0.9364,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // PERSIAN GARDEN: symmetrical layout with four quadrant rewards
      const pgX2 = 1.08;
      // Central cross barriers
      for (let pg1 = 0; pg1 < 4; pg1++) {
        push({ type: 'barrier', x: pgX2 + 0.03, height: 0.3 + pg1 * 0.08 });
      }
      for (let pg2 = 0; pg2 < 3; pg2++) {
        push({ type: 'barrier', x: pgX2 + pg2 * 0.02, height: 0.45 });
      }
      // Four quadrant orbs
      push({ type: 'orb', x: pgX2 + 0.015, height: 0.35 });
      push({ type: 'orb', x: pgX2 + 0.015, height: 0.55 });
      push({ type: 'orb', x: pgX2 + 0.045, height: 0.35 });
      push({ type: 'orb', x: pgX2 + 0.045, height: 0.55, golden: true });
      push({ type: 'boost', x: pgX2 + 0.07, height: 0.45 });
    },
  },
  {
    name: 'IVORY TOWER',
    threshold: 0.9365,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // IVORY TOWER: tall single barrier column with orb spiral
      const itX = 1.08;
      // Tower column
      for (let it1 = 0; it1 < 6; it1++) {
        push({ type: 'barrier', x: itX + 0.02, height: 0.2 + it1 * 0.1 });
      }
      // Orb spiral around tower
      for (let it2 = 0; it2 < 5; it2++) {
        const itAngle = it2 * 1.2;
        const itOx = Math.cos(itAngle) * 0.015;
        push({ type: 'orb', x: itX + 0.02 + itOx, height: 0.25 + it2 * 0.1 });
      }
      push({ type: 'orb', x: itX + 0.05, height: 0.7, golden: true });
      push({ type: 'boost', x: itX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'HANGING GARDENS',
    threshold: 0.9366,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // HANGING GARDENS: tiered platforms with cascading orbs
      const hgX = 1.08;
      // Tier platforms (barriers)
      for (let hg1 = 0; hg1 < 4; hg1++) {
        const hgH = 0.25 + hg1 * 0.1;
        push({ type: 'barrier', x: hgX + hg1 * 0.02, height: hgH });
      }
      // Cascading orbs above each tier
      for (let hg2 = 0; hg2 < 4; hg2++) {
        const hgOrbH = 0.35 + hg2 * 0.1;
        push({ type: 'orb', x: hgX + hg2 * 0.02 + 0.01, height: hgOrbH });
      }
      push({ type: 'orb', x: hgX + 0.085, height: 0.55, golden: true });
      push({ type: 'boost', x: hgX + 0.095, height: 0.45 });
    },
  },
  {
    name: 'CEDAR FOREST',
    threshold: 0.9367,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // CEDAR FOREST: tall barrier trunks with canopy orbs
      const cfX = 1.08;
      // Tree trunks (barriers)
      for (let cf1 = 0; cf1 < 4; cf1++) {
        const cfOff = cf1 * 0.02;
        push({ type: 'barrier', x: cfX + cfOff, height: 0.35 });
        push({ type: 'barrier', x: cfX + cfOff, height: 0.45 });
      }
      // Canopy orbs (above trunks)
      for (let cf2 = 0; cf2 < 4; cf2++) {
        push({ type: 'orb', x: cfX + cf2 * 0.02, height: 0.6 + Math.sin(cf2) * 0.05 });
      }
      // Ground level orb path
      push({ type: 'orb', x: cfX + 0.01, height: 0.25 });
      push({ type: 'orb', x: cfX + 0.05, height: 0.25, golden: true });
      push({ type: 'boost', x: cfX + 0.09, height: 0.4 });
    },
  },
  {
    name: 'PAPYRUS SCROLL',
    threshold: 0.9368,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // PAPYRUS SCROLL: horizontal barrier band with orbs spelling a line
      const psX = 1.08;
      // Top and bottom bands
      for (let ps1 = 0; ps1 < 6; ps1++) {
        push({ type: 'barrier', x: psX + ps1 * 0.012, height: 0.25 });
        push({ type: 'barrier', x: psX + ps1 * 0.012, height: 0.65 });
      }
      // Orb text line through middle
      for (let ps2 = 0; ps2 < 4; ps2++) {
        push({ type: 'orb', x: psX + 0.01 + ps2 * 0.015, height: 0.45 });
      }
      push({ type: 'orb', x: psX + 0.075, height: 0.45, golden: true });
    },
  },
  {
    name: 'REED MARSH',
    threshold: 0.9369,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // REED MARSH: alternating barrier reeds with winding orb path
      const rmX = 1.08;
      for (let rm1 = 0; rm1 < 7; rm1++) {
        const rmOff = rm1 * 0.012;
        const rmH = 0.3 + Math.sin(rm1 * 1.2) * 0.1;
        push({ type: 'barrier', x: rmX + rmOff, height: rmH });
        if (rm1 % 2 === 0) {
          push({ type: 'orb', x: rmX + rmOff + 0.006, height: rmH + 0.15 });
        }
      }
      push({ type: 'orb', x: rmX + 0.09, height: 0.5, golden: true });
      push({ type: 'boost', x: rmX + 0.1, height: 0.45 });
    },
  },
  {
    name: 'AMPHORA CACHE',
    threshold: 0.937,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // AMPHORA CACHE: jar-shaped barrier containers with orbs inside
      const amX = 1.08;
      for (let am1 = 0; am1 < 3; am1++) {
        const amOff = am1 * 0.025;
        const amH = 0.3 + am1 * 0.1;
        // Jar walls
        push({ type: 'barrier', x: amX + amOff, height: amH - 0.05 });
        push({ type: 'barrier', x: amX + amOff, height: amH + 0.05 });
        push({ type: 'barrier', x: amX + amOff + 0.01, height: amH - 0.06 });
        push({ type: 'barrier', x: amX + amOff + 0.01, height: amH + 0.06 });
        // Content orb
        push({ type: 'orb', x: amX + amOff + 0.005, height: amH });
      }
      push({ type: 'orb', x: amX + 0.08, height: 0.45, golden: true });
    },
  },
  {
    name: 'LOTUS POND',
    threshold: 0.9371,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // LOTUS POND: gentle pool with scattered treasures and light defenses
      const lpX = 1.08;
      // Light perimeter barriers
      push({ type: 'barrier', x: lpX, height: 0.5 });
      push({ type: 'barrier', x: lpX + 0.06, height: 0.5 });
      // Lotus (orb) scatter
      push({ type: 'orb', x: lpX + 0.015, height: 0.35 });
      push({ type: 'orb', x: lpX + 0.025, height: 0.55 });
      push({ type: 'orb', x: lpX + 0.035, height: 0.4 });
      push({ type: 'orb', x: lpX + 0.045, height: 0.5 });
      push({ type: 'orb', x: lpX + 0.03, height: 0.45, golden: true });
      push({ type: 'boost', x: lpX + 0.08, height: 0.45 });
    },
  },
  {
    name: 'SANDSTONE ARCH',
    threshold: 0.9372,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // SANDSTONE ARCH: arch-shaped barrier with treasure beneath
      const saX = 1.08;
      // Arch pillars
      for (let sa1 = 0; sa1 < 3; sa1++) {
        push({ type: 'barrier', x: saX, height: 0.25 + sa1 * 0.1 });
        push({ type: 'barrier', x: saX + 0.04, height: 0.25 + sa1 * 0.1 });
      }
      // Arch top
      push({ type: 'barrier', x: saX + 0.01, height: 0.55 });
      push({ type: 'barrier', x: saX + 0.02, height: 0.58 });
      push({ type: 'barrier', x: saX + 0.03, height: 0.55 });
      // Treasure beneath
      push({ type: 'orb', x: saX + 0.02, height: 0.35, golden: true });
      push({ type: 'orb', x: saX + 0.02, height: 0.28 });
      push({ type: 'boost', x: saX + 0.06, height: 0.4 });
    },
  },
  {
    name: 'NILE DELTA',
    threshold: 0.9373,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // NILE DELTA: branching paths — choose high or low route
      const ndX = 1.08;
      // Central divider
      for (let nd1 = 0; nd1 < 5; nd1++) {
        push({ type: 'barrier', x: ndX + 0.01 + nd1 * 0.015, height: 0.45 });
      }
      // High route orbs
      for (let nd2 = 0; nd2 < 3; nd2++) {
        push({ type: 'orb', x: ndX + 0.02 + nd2 * 0.02, height: 0.6 });
      }
      // Low route orbs
      for (let nd3 = 0; nd3 < 3; nd3++) {
        push({ type: 'orb', x: ndX + 0.02 + nd3 * 0.02, height: 0.3 });
      }
      // Golden at convergence
      push({ type: 'orb', x: ndX + 0.09, height: 0.45, golden: true });
      push({ type: 'boost', x: ndX + 0.1, height: 0.45 });
    },
  },
  {
    name: 'SCARAB SWARM',
    threshold: 0.9374,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // SCARAB SWARM: dense orb cluster with barrier shell
      const ssX = 1.08;
      // Outer shell barriers
      push({ type: 'barrier', x: ssX, height: 0.35 });
      push({ type: 'barrier', x: ssX, height: 0.55 });
      push({ type: 'barrier', x: ssX + 0.04, height: 0.3 });
      push({ type: 'barrier', x: ssX + 0.04, height: 0.6 });
      // Dense orb swarm inside
      for (let ss1 = 0; ss1 < 3; ss1++) {
        for (let ss2 = 0; ss2 < 2; ss2++) {
          push({ type: 'orb', x: ssX + 0.01 + ss1 * 0.01, height: 0.4 + ss2 * 0.1 });
        }
      }
      push({ type: 'orb', x: ssX + 0.02, height: 0.45, golden: true });
    },
  },
  {
    name: 'FELUCCA FLEET',
    threshold: 0.9375,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // FELUCCA FLEET: staggered boat-shaped formations with treasures
      const ffX = 1.08;
      for (let ff1 = 0; ff1 < 3; ff1++) {
        const ffOff = ff1 * 0.03;
        const ffH = 0.3 + ff1 * 0.1;
        // Boat hull barriers
        push({ type: 'barrier', x: ffX + ffOff, height: ffH });
        push({ type: 'barrier', x: ffX + ffOff + 0.015, height: ffH - 0.05 });
        push({ type: 'barrier', x: ffX + ffOff + 0.015, height: ffH + 0.05 });
        // Cargo orb
        push({ type: 'orb', x: ffX + ffOff + 0.008, height: ffH });
      }
      push({ type: 'orb', x: ffX + 0.1, height: 0.45, golden: true });
      push({ type: 'boost', x: ffX + 0.11, height: 0.45 });
    },
  },
  {
    name: 'ANCIENT CANAL',
    threshold: 0.9376,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // ANCIENT CANAL: long straight channel with orb current
      const acX = 1.08;
      // Channel walls — long parallel barriers
      for (let ac1 = 0; ac1 < 8; ac1++) {
        push({ type: 'barrier', x: acX + ac1 * 0.012, height: 0.3 });
        push({ type: 'barrier', x: acX + ac1 * 0.012, height: 0.6 });
      }
      // Orb current flowing through
      for (let ac2 = 0; ac2 < 5; ac2++) {
        push({ type: 'orb', x: acX + ac2 * 0.02, height: 0.45 });
      }
      push({ type: 'orb', x: acX + 0.1, height: 0.45, golden: true });
    },
  },
  {
    name: 'SCORPION NEST',
    threshold: 0.9377,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // SCORPION NEST: scattered barriers with quick-grab orbs
      const snX = 1.08;
      // Scattered barriers (chaotic placement)
      push({ type: 'barrier', x: snX, height: 0.35 });
      push({ type: 'barrier', x: snX + 0.012, height: 0.55 });
      push({ type: 'barrier', x: snX + 0.028, height: 0.3 });
      push({ type: 'barrier', x: snX + 0.038, height: 0.6 });
      push({ type: 'barrier', x: snX + 0.05, height: 0.4 });
      // Quick-grab orbs between barriers
      push({ type: 'orb', x: snX + 0.006, height: 0.48 });
      push({ type: 'orb', x: snX + 0.02, height: 0.42 });
      push({ type: 'orb', x: snX + 0.033, height: 0.45 });
      push({ type: 'orb', x: snX + 0.044, height: 0.5, golden: true });
    },
  },
  {
    name: 'DESERT TEMPLE',
    threshold: 0.9378,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // DESERT TEMPLE: symmetrical pillared structure with altar reward
      const dtX = 1.08;
      // Pillars
      for (let dt1 = 0; dt1 < 3; dt1++) {
        const dtOff = dt1 * 0.025;
        push({ type: 'barrier', x: dtX + dtOff, height: 0.25 });
        push({ type: 'barrier', x: dtX + dtOff, height: 0.65 });
      }
      // Altar at center
      push({ type: 'orb', x: dtX + 0.025, height: 0.45, golden: true });
      push({ type: 'orb', x: dtX + 0.025, height: 0.38 });
      push({ type: 'orb', x: dtX + 0.025, height: 0.52 });
      // Exit boost
      push({ type: 'boost', x: dtX + 0.06, height: 0.45 });
    },
  },
  {
    name: 'PHARAOH\'S TOMB',
    threshold: 0.9379,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // PHARAOH'S TOMB: pyramid-shaped barrier structure with buried treasure
      const ptX = 1.08;
      // Pyramid layers (widest at bottom)
      for (let pt1 = 0; pt1 < 4; pt1++) {
        const ptW = 4 - pt1;
        const ptH = 0.3 + pt1 * 0.08;
        for (let pt2 = 0; pt2 < ptW; pt2++) {
          const ptBx = ptX + 0.01 + pt2 * 0.012 + pt1 * 0.006;
          push({ type: 'barrier', x: ptBx, height: ptH });
        }
      }
      // Hidden treasure chamber
      push({ type: 'orb', x: ptX + 0.025, height: 0.35, golden: true });
      push({ type: 'orb', x: ptX + 0.035, height: 0.35 });
      push({ type: 'boost', x: ptX + 0.065, height: 0.5 });
    },
  },
  {
    name: 'WADI GORGE',
    threshold: 0.938,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // WADI GORGE: narrow canyon run — barriers on top and bottom
      const wgX = 1.08;
      for (let wg1 = 0; wg1 < 6; wg1++) {
        const wgOff = wg1 * 0.015;
        push({ type: 'barrier', x: wgX + wgOff, height: 0.2 + Math.sin(wg1 * 0.4) * 0.05 });
        push({ type: 'barrier', x: wgX + wgOff, height: 0.65 + Math.cos(wg1 * 0.4) * 0.05 });
        if (wg1 % 2 === 0) {
          push({ type: 'orb', x: wgX + wgOff, height: 0.42 });
        }
      }
      push({ type: 'orb', x: wgX + 0.095, height: 0.42, golden: true });
    },
  },
  {
    name: 'SANDSTORM WALL',
    threshold: 0.9381,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // SANDSTORM WALL: thick barrier wave with safe pocket
      const swX = 1.08;
      // Dense barrier wall
      for (let sw1 = 0; sw1 < 7; sw1++) {
        const swH = 0.2 + sw1 * 0.08;
        if (sw1 !== 3) { // Gap at position 3
          push({ type: 'barrier', x: swX, height: swH });
          push({ type: 'barrier', x: swX + 0.01, height: swH });
        }
      }
      // Safe pocket reward
      push({ type: 'orb', x: swX + 0.005, height: 0.44, golden: true });
      push({ type: 'boost', x: swX + 0.02, height: 0.44 });
      // Follow-up orbs
      for (let sw2 = 0; sw2 < 3; sw2++) {
        push({ type: 'orb', x: swX + 0.04 + sw2 * 0.015, height: 0.4 + sw2 * 0.05 });
      }
    },
  },
  {
    name: 'MIRAGE CITY',
    threshold: 0.9382,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // MIRAGE CITY: staggered barrier columns with hidden orbs between
      const mcX = 1.08;
      for (let mc1 = 0; mc1 < 4; mc1++) {
        const mcOff = mc1 * 0.02;
        const mcH1 = 0.25 + (mc1 % 2) * 0.1;
        const mcH2 = 0.55 + (mc1 % 2) * 0.1;
        push({ type: 'barrier', x: mcX + mcOff, height: mcH1 });
        push({ type: 'barrier', x: mcX + mcOff, height: mcH2 });
        if (mc1 > 0) {
          push({ type: 'orb', x: mcX + mcOff - 0.01, height: (mcH1 + mcH2) / 2 });
        }
      }
      push({ type: 'orb', x: mcX + 0.085, height: 0.4, golden: true });
    },
  },
  {
    name: 'OASIS POOL',
    threshold: 0.9383,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // OASIS POOL: circular barrier ring with rich rewards inside
      const opX = 1.08;
      // Circular barrier perimeter
      for (let op1 = 0; op1 < 5; op1++) {
        const opAngle = (op1 / 5) * Math.PI;
        const opBx = opX + 0.04 + Math.cos(opAngle) * 0.03;
        const opBh = 0.45 + Math.sin(opAngle) * 0.15;
        push({ type: 'barrier', x: opBx, height: opBh });
      }
      // Rich center
      push({ type: 'orb', x: opX + 0.04, height: 0.42 });
      push({ type: 'orb', x: opX + 0.04, height: 0.48, golden: true });
      push({ type: 'boost', x: opX + 0.04, height: 0.45 });
    },
  },
  {
    name: 'SAND DUNE RIDGE',
    threshold: 0.9384,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // SAND DUNE RIDGE: rising and falling barrier line with orb peaks
      const sdX = 1.08;
      for (let sd1 = 0; sd1 < 6; sd1++) {
        const sdH = 0.35 + Math.sin(sd1 * 0.9) * 0.15;
        push({ type: 'barrier', x: sdX + sd1 * 0.014, height: sdH });
        if (sd1 % 2 === 1) {
          push({ type: 'orb', x: sdX + sd1 * 0.014, height: sdH + 0.12 });
        }
      }
      push({ type: 'orb', x: sdX + 0.09, height: 0.5, golden: true });
    },
  },
  {
    name: 'NOMAD CAMP',
    threshold: 0.9385,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // NOMAD CAMP: scattered orbs around a central bonfire boost
      const ncX = 1.08;
      // Tent barriers
      push({ type: 'barrier', x: ncX, height: 0.3 });
      push({ type: 'barrier', x: ncX, height: 0.6 });
      // Scattered supply orbs
      push({ type: 'orb', x: ncX + 0.015, height: 0.35 });
      push({ type: 'orb', x: ncX + 0.025, height: 0.55 });
      push({ type: 'orb', x: ncX + 0.035, height: 0.45 });
      // Central bonfire boost
      push({ type: 'boost', x: ncX + 0.05, height: 0.45 });
      // More supplies beyond
      push({ type: 'orb', x: ncX + 0.065, height: 0.35 });
      push({ type: 'orb', x: ncX + 0.075, height: 0.55, golden: true });
      push({ type: 'barrier', x: ncX + 0.09, height: 0.3 });
      push({ type: 'barrier', x: ncX + 0.09, height: 0.6 });
    },
  },
  {
    name: 'DESERT FORTRESS',
    threshold: 0.9386,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // DESERT FORTRESS: central stronghold with perimeter defenses
      const dfX = 1.08;
      // Outer walls
      for (let df1 = 0; df1 < 4; df1++) {
        push({ type: 'barrier', x: dfX + df1 * 0.015, height: 0.2 });
        push({ type: 'barrier', x: dfX + df1 * 0.015, height: 0.7 });
      }
      // Inner treasure
      push({ type: 'orb', x: dfX + 0.02, height: 0.45, golden: true });
      push({ type: 'orb', x: dfX + 0.035, height: 0.4 });
      push({ type: 'orb', x: dfX + 0.035, height: 0.5 });
      // Exit boost
      push({ type: 'boost', x: dfX + 0.07, height: 0.45 });
    },
  },
  {
    name: 'CARAVAN ROUTE',
    threshold: 0.9387,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // CARAVAN ROUTE: winding path of orbs through barrier walls
      const crX = 1.08;
      for (let cr1 = 0; cr1 < 5; cr1++) {
        const crOff = cr1 * 0.02;
        const crH = 0.3 + Math.sin(cr1 * 0.8) * 0.15;
        push({ type: 'orb', x: crX + crOff, height: crH });
        push({ type: 'barrier', x: crX + crOff, height: crH + 0.12 });
        push({ type: 'barrier', x: crX + crOff, height: crH - 0.12 });
      }
      push({ type: 'orb', x: crX + 0.11, height: 0.45, golden: true });
      push({ type: 'boost', x: crX + 0.13, height: 0.35 });
    },
  },
  {
    name: 'KASBAH',
    threshold: 0.9388,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // KASBAH: fortified village — dense barrier cluster with narrow passages
      const kbX = 1.08;
      // Dense block 1
      for (let kb1 = 0; kb1 < 3; kb1++) {
        for (let kb2 = 0; kb2 < 3; kb2++) {
          push({ type: 'barrier', x: kbX + kb1 * 0.008, height: 0.25 + kb2 * 0.08 });
        }
      }
      // Dense block 2 (offset)
      for (let kb3 = 0; kb3 < 3; kb3++) {
        for (let kb4 = 0; kb4 < 3; kb4++) {
          push({ type: 'barrier', x: kbX + 0.035 + kb3 * 0.008, height: 0.45 + kb4 * 0.08 });
        }
      }
      // Passage orbs between blocks
      push({ type: 'orb', x: kbX + 0.025, height: 0.4 });
      push({ type: 'orb', x: kbX + 0.025, height: 0.55, golden: true });
      push({ type: 'boost', x: kbX + 0.07, height: 0.45 });
    },
  },
  {
    name: 'RIAD',
    threshold: 0.9389,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // RIAD: courtyard house — barrier frame with open center and orb garden
      const riX = 1.08;
      // Outer frame
      for (let ri1 = 0; ri1 < 5; ri1++) {
        push({ type: 'barrier', x: riX + ri1 * 0.015, height: 0.2 });
        push({ type: 'barrier', x: riX + ri1 * 0.015, height: 0.8 });
      }
      // Side walls (only corners)
      push({ type: 'barrier', x: riX, height: 0.35 });
      push({ type: 'barrier', x: riX, height: 0.65 });
      push({ type: 'barrier', x: riX + 0.06, height: 0.35 });
      push({ type: 'barrier', x: riX + 0.06, height: 0.65 });
      // Garden orbs in center
      push({ type: 'orb', x: riX + 0.02, height: 0.4 });
      push({ type: 'orb', x: riX + 0.03, height: 0.5, golden: true });
      push({ type: 'orb', x: riX + 0.04, height: 0.6 });
      push({ type: 'boost', x: riX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'SOUK',
    threshold: 0.939,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // SOUK: covered market — barrier roof with dangling orb wares
      const skX = 1.08;
      // Roof
      for (let sk1 = 0; sk1 < 7; sk1++) {
        push({ type: 'barrier', x: skX + sk1 * 0.012, height: 0.72 });
      }
      // Dangling orbs at different heights
      push({ type: 'orb', x: skX + 0.01, height: 0.55 });
      push({ type: 'orb', x: skX + 0.025, height: 0.45 });
      push({ type: 'orb', x: skX + 0.04, height: 0.6, golden: true });
      push({ type: 'orb', x: skX + 0.055, height: 0.35 });
      push({ type: 'orb', x: skX + 0.07, height: 0.5 });
      push({ type: 'boost', x: skX + 0.09, height: 0.4 });
    },
  },
  {
    name: 'MEDINA',
    threshold: 0.9391,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // MEDINA: old city maze — winding barrier walls with hidden orbs
      const mdX = 1.08;
      // Zigzag walls
      push({ type: 'barrier', x: mdX, height: 0.3 });
      push({ type: 'barrier', x: mdX, height: 0.4 });
      push({ type: 'barrier', x: mdX + 0.015, height: 0.5 });
      push({ type: 'barrier', x: mdX + 0.015, height: 0.6 });
      push({ type: 'barrier', x: mdX + 0.03, height: 0.3 });
      push({ type: 'barrier', x: mdX + 0.03, height: 0.4 });
      push({ type: 'barrier', x: mdX + 0.045, height: 0.5 });
      push({ type: 'barrier', x: mdX + 0.045, height: 0.6 });
      // Hidden orbs in turns
      push({ type: 'orb', x: mdX + 0.007, height: 0.55 });
      push({ type: 'orb', x: mdX + 0.022, height: 0.35 });
      push({ type: 'orb', x: mdX + 0.037, height: 0.55, golden: true });
      push({ type: 'boost', x: mdX + 0.06, height: 0.45 });
    },
  },
  {
    name: 'QANAT',
    threshold: 0.9392,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // QANAT: underground water tunnel — long low barrier tube with orb flow
      const qnX = 1.08;
      // Tunnel ceiling
      for (let qn1 = 0; qn1 < 9; qn1++) {
        push({ type: 'barrier', x: qnX + qn1 * 0.01, height: 0.4 + Math.sin(qn1 * 0.4) * 0.02 });
      }
      // Tunnel floor
      for (let qn2 = 0; qn2 < 9; qn2++) {
        push({ type: 'barrier', x: qnX + qn2 * 0.01, height: 0.18 + Math.sin(qn2 * 0.4) * 0.02 });
      }
      // Water flow orbs
      for (let qnO = 0; qnO < 7; qnO++) {
        push({ type: 'orb', x: qnX + 0.005 + qnO * 0.012, height: 0.29, golden: qnO === 4 });
      }
      push({ type: 'boost', x: qnX + 0.1, height: 0.29 });
    },
  },
  {
    name: 'WINDCATCHER',
    threshold: 0.9393,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // WINDCATCHER: desert cooling tower — tall narrow barrier with side vents
      const wcX = 1.08;
      // Main tower
      for (let wc1 = 0; wc1 < 7; wc1++) {
        push({ type: 'barrier', x: wcX + 0.015, height: 0.1 + wc1 * 0.11 });
      }
      // Side vent openings (orbs)
      push({ type: 'orb', x: wcX, height: 0.3 });
      push({ type: 'orb', x: wcX + 0.03, height: 0.3 });
      push({ type: 'orb', x: wcX, height: 0.55 });
      push({ type: 'orb', x: wcX + 0.03, height: 0.55, golden: true });
      // Top orb
      push({ type: 'orb', x: wcX + 0.015, height: 0.85 });
      push({ type: 'boost', x: wcX + 0.05, height: 0.4 });
    },
  },
  {
    name: 'HAMMAM',
    threshold: 0.9394,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // HAMMAM: bathhouse — steamy barrier room with warm orb pool
      const hmX = 1.08;
      // Dome ceiling
      for (let hm1 = 0; hm1 < 6; hm1++) {
        const hmT2 = hm1 / 5;
        const hmH2 = 0.7 + 0.1 * Math.sin(hmT2 * Math.PI);
        push({ type: 'barrier', x: hmX + hm1 * 0.01, height: hmH2 });
      }
      // Floor
      for (let hm2 = 0; hm2 < 6; hm2++) {
        push({ type: 'barrier', x: hmX + hm2 * 0.01, height: 0.2 });
      }
      // Steam orbs (pool)
      push({ type: 'orb', x: hmX + 0.015, height: 0.35 });
      push({ type: 'orb', x: hmX + 0.025, height: 0.45, golden: true });
      push({ type: 'orb', x: hmX + 0.035, height: 0.35 });
      push({ type: 'boost', x: hmX + 0.07, height: 0.4 });
    },
  },
  {
    name: 'CARAVANSARY',
    threshold: 0.9395,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CARAVANSARY: desert inn — enclosed barrier compound with central orb well
      const cvX = 1.08;
      // Outer walls
      for (let cv1 = 0; cv1 < 6; cv1++) {
        push({ type: 'barrier', x: cvX + cv1 * 0.012, height: 0.2 });
        push({ type: 'barrier', x: cvX + cv1 * 0.012, height: 0.75 });
      }
      // Side walls
      push({ type: 'barrier', x: cvX, height: 0.35 });
      push({ type: 'barrier', x: cvX, height: 0.6 });
      push({ type: 'barrier', x: cvX + 0.06, height: 0.35 });
      push({ type: 'barrier', x: cvX + 0.06, height: 0.6 });
      // Central well orbs
      push({ type: 'orb', x: cvX + 0.03, height: 0.45, golden: true });
      push({ type: 'orb', x: cvX + 0.03, height: 0.55 });
      push({ type: 'boost', x: cvX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'BAZAAR',
    threshold: 0.9396,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // BAZAAR: marketplace stalls — scattered barrier booths with orb wares
      const bzX = 1.08;
      // Stall 1
      push({ type: 'barrier', x: bzX, height: 0.3 });
      push({ type: 'barrier', x: bzX + 0.008, height: 0.3 });
      push({ type: 'barrier', x: bzX + 0.004, height: 0.38 });
      push({ type: 'orb', x: bzX + 0.004, height: 0.25 });
      // Stall 2
      push({ type: 'barrier', x: bzX + 0.025, height: 0.6 });
      push({ type: 'barrier', x: bzX + 0.033, height: 0.6 });
      push({ type: 'barrier', x: bzX + 0.029, height: 0.68 });
      push({ type: 'orb', x: bzX + 0.029, height: 0.55, golden: true });
      // Stall 3
      push({ type: 'barrier', x: bzX + 0.05, height: 0.45 });
      push({ type: 'barrier', x: bzX + 0.058, height: 0.45 });
      push({ type: 'barrier', x: bzX + 0.054, height: 0.53 });
      push({ type: 'orb', x: bzX + 0.054, height: 0.4 });
      push({ type: 'boost', x: bzX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'MINARET',
    threshold: 0.9397,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // MINARET: tall slender tower — thin barrier column with spiral orb path
      const mnX = 1.08;
      // Tower shaft
      for (let mn1 = 0; mn1 < 8; mn1++) {
        push({ type: 'barrier', x: mnX + 0.015, height: 0.1 + mn1 * 0.1 });
      }
      // Spiral orb path
      for (let mnO = 0; mnO < 6; mnO++) {
        const mnAng = mnO * 1.2;
        const mnR2 = 0.012;
        const mnH2 = 0.15 + mnO * 0.12;
        const mnOX = mnX + 0.015 + Math.cos(mnAng) * mnR2;
        push({ type: 'orb', x: mnOX, height: mnH2, golden: mnO === 5 });
      }
      push({ type: 'boost', x: mnX + 0.04, height: 0.5 });
    },
  },
  {
    name: 'ZIGGURAT',
    threshold: 0.9398,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // ZIGGURAT: stepped temple — wide barrier steps with orb offerings
      const zgX = 1.08;
      // Step 1 (widest, lowest)
      for (let zg1 = 0; zg1 < 6; zg1++) {
        push({ type: 'barrier', x: zgX + zg1 * 0.01, height: 0.2 });
      }
      // Step 2
      for (let zg2 = 0; zg2 < 4; zg2++) {
        push({ type: 'barrier', x: zgX + 0.01 + zg2 * 0.01, height: 0.4 });
      }
      // Step 3 (top)
      push({ type: 'barrier', x: zgX + 0.02, height: 0.6 });
      push({ type: 'barrier', x: zgX + 0.03, height: 0.6 });
      // Offering orbs on each level
      push({ type: 'orb', x: zgX + 0.07, height: 0.25 });
      push({ type: 'orb', x: zgX + 0.06, height: 0.45 });
      push({ type: 'orb', x: zgX + 0.05, height: 0.65, golden: true });
      push({ type: 'boost', x: zgX + 0.09, height: 0.4 });
    },
  },
  {
    name: 'TOMB',
    threshold: 0.9399,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // TOMB: burial chamber entrance — narrow doorway in barrier wall
      const tbX = 1.08;
      // Wall with door opening
      for (let tb1 = 0; tb1 < 9; tb1++) {
        const tbH = tb1 * 0.1 + 0.05;
        if (tbH < 0.35 || tbH > 0.55) {
          push({ type: 'barrier', x: tbX, height: tbH });
          push({ type: 'barrier', x: tbX + 0.005, height: tbH });
        }
      }
      // Lintel above door
      push({ type: 'barrier', x: tbX + 0.002, height: 0.56 });
      // Inner treasures
      push({ type: 'orb', x: tbX + 0.015, height: 0.45, golden: true });
      push({ type: 'orb', x: tbX + 0.025, height: 0.45 });
      push({ type: 'orb', x: tbX + 0.035, height: 0.45 });
      push({ type: 'boost', x: tbX + 0.05, height: 0.45 });
    },
  },
  {
    name: 'SPHINX',
    threshold: 0.94,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // SPHINX: guardian figure — barrier body with orb eye
      const sxX = 1.08;
      // Body
      for (let sx1 = 0; sx1 < 4; sx1++) {
        push({ type: 'barrier', x: sxX + sx1 * 0.01, height: 0.35 });
        push({ type: 'barrier', x: sxX + sx1 * 0.01, height: 0.4 });
      }
      // Head (higher)
      push({ type: 'barrier', x: sxX, height: 0.5 });
      push({ type: 'barrier', x: sxX, height: 0.55 });
      push({ type: 'barrier', x: sxX + 0.005, height: 0.5 });
      push({ type: 'barrier', x: sxX + 0.005, height: 0.55 });
      // Eye orb
      push({ type: 'orb', x: sxX + 0.003, height: 0.52, golden: true });
      // Treasure between paws
      push({ type: 'orb', x: sxX + 0.015, height: 0.3 });
      push({ type: 'orb', x: sxX + 0.025, height: 0.3 });
      push({ type: 'boost', x: sxX + 0.05, height: 0.4 });
    },
  },
  {
    name: 'PYRAMID',
    threshold: 0.9401,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // PYRAMID: stepped pyramid — barrier steps ascending then descending
      const pyX = 1.08;
      // Ascending steps
      for (let py1 = 0; py1 < 5; py1++) {
        for (let py2 = 0; py2 <= py1; py2++) {
          push({ type: 'barrier', x: pyX + py1 * 0.012, height: 0.2 + py2 * 0.1 });
        }
      }
      // Descending steps
      for (let py3 = 0; py3 < 4; py3++) {
        for (let py4 = 0; py4 < 4 - py3; py4++) {
          push({ type: 'barrier', x: pyX + 0.06 + py3 * 0.012, height: 0.2 + py4 * 0.1 });
        }
      }
      // Peak treasure
      push({ type: 'orb', x: pyX + 0.048, height: 0.75, golden: true });
      push({ type: 'orb', x: pyX + 0.036, height: 0.6 });
      push({ type: 'orb', x: pyX + 0.06, height: 0.6 });
      push({ type: 'boost', x: pyX + 0.11, height: 0.3 });
    },
  },
  {
    name: 'OBELISK',
    threshold: 0.9402,
    minTime: 30,
    delay: 1.1,
    spawn: (push) => {
      // OBELISK: tall monumental pillar — single narrow barrier tower with crown orb
      const obkX = 1.08;
      // Obelisk shaft
      for (let ob1 = 0; ob1 < 9; ob1++) {
        push({ type: 'barrier', x: obkX, height: 0.05 + ob1 * 0.1 });
      }
      // Pyramidion (top)
      push({ type: 'orb', x: obkX, height: 0.92, golden: true });
      // Flanking orbs
      push({ type: 'orb', x: obkX - 0.015, height: 0.5 });
      push({ type: 'orb', x: obkX + 0.015, height: 0.5 });
      push({ type: 'orb', x: obkX - 0.015, height: 0.3 });
      push({ type: 'orb', x: obkX + 0.015, height: 0.3 });
      push({ type: 'boost', x: obkX + 0.03, height: 0.5 });
    },
  },
  {
    name: 'GALLERY',
    threshold: 0.9403,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // GALLERY: long display room — narrow barrier corridor with orb exhibits
      const gaX = 1.08;
      // Wall barriers with periodic display alcoves
      for (let ga1 = 0; ga1 < 8; ga1++) {
        const gaXOff = ga1 * 0.011;
        push({ type: 'barrier', x: gaX + gaXOff, height: 0.7 });
        push({ type: 'barrier', x: gaX + gaXOff, height: 0.3 });
        // Exhibit orbs in alcoves
        if (ga1 % 2 === 1) {
          push({ type: 'orb', x: gaX + gaXOff, height: 0.5, golden: ga1 === 5 });
        }
      }
      push({ type: 'boost', x: gaX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'CLOISTER',
    threshold: 0.9404,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CLOISTER: covered walkway — twin barrier rows with orb path between
      const clX2 = 1.08;
      // Left barrier row
      for (let cl1 = 0; cl1 < 6; cl1++) {
        push({ type: 'barrier', x: clX2 + cl1 * 0.013, height: 0.3 });
        push({ type: 'barrier', x: clX2 + cl1 * 0.013, height: 0.25 });
      }
      // Right barrier row
      for (let cl2 = 0; cl2 < 6; cl2++) {
        push({ type: 'barrier', x: clX2 + cl2 * 0.013, height: 0.65 });
        push({ type: 'barrier', x: clX2 + cl2 * 0.013, height: 0.7 });
      }
      // Path orbs between
      for (let clO = 0; clO < 5; clO++) {
        push({ type: 'orb', x: clX2 + 0.005 + clO * 0.014, height: 0.47, golden: clO === 3 });
      }
      push({ type: 'boost', x: clX2 + 0.08, height: 0.47 });
    },
  },
  {
    name: 'FOUNTAIN',
    threshold: 0.9405,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // FOUNTAIN: ornamental water feature — central barrier pillar with orb spray
      const ftX = 1.08;
      // Central pillar
      for (let ft1 = 0; ft1 < 4; ft1++) {
        push({ type: 'barrier', x: ftX + 0.02, height: 0.3 + ft1 * 0.1 });
      }
      // Orb spray pattern (fountain shape)
      push({ type: 'orb', x: ftX + 0.02, height: 0.75 }); // top
      push({ type: 'orb', x: ftX, height: 0.6 }); // left spray
      push({ type: 'orb', x: ftX + 0.04, height: 0.6 }); // right spray
      push({ type: 'orb', x: ftX - 0.005, height: 0.45 }); // left fall
      push({ type: 'orb', x: ftX + 0.045, height: 0.45 }); // right fall
      push({ type: 'orb', x: ftX + 0.02, height: 0.8, golden: true }); // crown
      push({ type: 'boost', x: ftX + 0.07, height: 0.5 });
    },
  },
  {
    name: 'COURTYARD',
    threshold: 0.9406,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // COURTYARD: open enclosed space — barrier walls with orb-filled interior
      const cyX = 1.08;
      // Top wall
      for (let cy1 = 0; cy1 < 5; cy1++) {
        push({ type: 'barrier', x: cyX + cy1 * 0.014, height: 0.75 });
      }
      // Bottom wall
      for (let cy2 = 0; cy2 < 5; cy2++) {
        push({ type: 'barrier', x: cyX + cy2 * 0.014, height: 0.25 });
      }
      // Entry gap (no side walls)
      // Interior orbs — scattered
      push({ type: 'orb', x: cyX + 0.015, height: 0.4 });
      push({ type: 'orb', x: cyX + 0.03, height: 0.6 });
      push({ type: 'orb', x: cyX + 0.045, height: 0.5, golden: true });
      push({ type: 'orb', x: cyX + 0.035, height: 0.35 });
      push({ type: 'boost', x: cyX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'GARDEN',
    threshold: 0.9407,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // GARDEN: ornamental grounds — scattered barrier hedges with orb flowers
      const gdX = 1.08;
      // Hedge barriers (scattered)
      const gdPositions: Array<[number, number]> = [
      [0, 0.3], [0.02, 0.6], [0.04, 0.25], [0.06, 0.7], [0.08, 0.4],
      ];
      for (const [gdDx, gdDy] of gdPositions) {
        push({ type: 'barrier', x: gdX + gdDx, height: gdDy });
        push({ type: 'barrier', x: gdX + gdDx + 0.004, height: gdDy + 0.05 });
      }
      // Flower orbs
      push({ type: 'orb', x: gdX + 0.01, height: 0.5 });
      push({ type: 'orb', x: gdX + 0.03, height: 0.45 });
      push({ type: 'orb', x: gdX + 0.05, height: 0.5, golden: true });
      push({ type: 'orb', x: gdX + 0.07, height: 0.55 });
      push({ type: 'boost', x: gdX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'AMPHITHEATRE',
    threshold: 0.9408,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // AMPHITHEATRE: curved barrier seating — semicircular barrier arc with stage orbs
      const amX = 1.08;
      // Curved seating rows
      for (let am1 = 0; am1 < 8; am1++) {
        const amAng = (am1 / 7) * Math.PI;
        const amR2 = 0.04;
        const amPX = amX + 0.035 + Math.cos(amAng) * amR2;
        const amPH = 0.5 + Math.sin(amAng) * 0.3;
        push({ type: 'barrier', x: amPX, height: amPH });
      }
      // Stage orbs in center
      push({ type: 'orb', x: amX + 0.02, height: 0.5 });
      push({ type: 'orb', x: amX + 0.035, height: 0.5, golden: true });
      push({ type: 'orb', x: amX + 0.05, height: 0.5 });
      push({ type: 'boost', x: amX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'COLONNADE',
    threshold: 0.9409,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // COLONNADE: row of columns — evenly spaced barrier pillars with orbs between
      const coX = 1.08;
      for (let co1 = 0; co1 < 6; co1++) {
        const coXOff = co1 * 0.016;
        // Pillar
        push({ type: 'barrier', x: coX + coXOff, height: 0.3 });
        push({ type: 'barrier', x: coX + coXOff, height: 0.5 });
        push({ type: 'barrier', x: coX + coXOff, height: 0.7 });
        // Orb between pillars
        if (co1 < 5) {
          push({ type: 'orb', x: coX + coXOff + 0.008, height: 0.5, golden: co1 === 3 });
        }
      }
      push({ type: 'boost', x: coX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'VAULT',
    threshold: 0.941,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // VAULT: arched ceiling corridor — semicircular barrier roof with orbs underneath
      const vtX = 1.08;
      // Arch barrier ceiling
      for (let vt1 = 0; vt1 < 7; vt1++) {
        const vtT2 = vt1 / 6;
        const vtArcH = 0.7 + 0.15 * Math.sin(vtT2 * Math.PI);
        push({ type: 'barrier', x: vtX + vt1 * 0.012, height: vtArcH });
        push({ type: 'barrier', x: vtX + vt1 * 0.012, height: vtArcH + 0.05 });
      }
      // Orbs under the vault
      for (let vtO = 0; vtO < 5; vtO++) {
        push({ type: 'orb', x: vtX + 0.01 + vtO * 0.014, height: 0.45, golden: vtO === 3 });
      }
      push({ type: 'boost', x: vtX + 0.09, height: 0.45 });
    },
  },
  {
    name: 'BRIDGE',
    threshold: 0.9411,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // BRIDGE: simple crossing — two barrier piers with orb arch above
      const bdX = 1.08;
      // Left pier
      for (let bd1 = 0; bd1 < 5; bd1++) {
        push({ type: 'barrier', x: bdX, height: 0.1 + bd1 * 0.1 });
      }
      // Right pier
      for (let bd2 = 0; bd2 < 5; bd2++) {
        push({ type: 'barrier', x: bdX + 0.04, height: 0.1 + bd2 * 0.1 });
      }
      // Bridge deck
      push({ type: 'barrier', x: bdX + 0.01, height: 0.55 });
      push({ type: 'barrier', x: bdX + 0.02, height: 0.55 });
      push({ type: 'barrier', x: bdX + 0.03, height: 0.55 });
      // Orbs arch above bridge
      push({ type: 'orb', x: bdX + 0.01, height: 0.7 });
      push({ type: 'orb', x: bdX + 0.02, height: 0.8, golden: true });
      push({ type: 'orb', x: bdX + 0.03, height: 0.7 });
      push({ type: 'boost', x: bdX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'AQUEDUCT',
    threshold: 0.9412,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // AQUEDUCT: elevated water channel — high barrier bridge with orbs below
      const aqX = 1.08;
      // Bridge deck (high barriers)
      for (let aq1 = 0; aq1 < 8; aq1++) {
        push({ type: 'barrier', x: aqX + aq1 * 0.012, height: 0.8 });
        push({ type: 'barrier', x: aqX + aq1 * 0.012, height: 0.85 });
      }
      // Support pillars
      push({ type: 'barrier', x: aqX + 0.01, height: 0.6 });
      push({ type: 'barrier', x: aqX + 0.01, height: 0.7 });
      push({ type: 'barrier', x: aqX + 0.07, height: 0.6 });
      push({ type: 'barrier', x: aqX + 0.07, height: 0.7 });
      // Orbs flowing below
      for (let aqO = 0; aqO < 5; aqO++) {
        push({ type: 'orb', x: aqX + 0.02 + aqO * 0.012, height: 0.4, golden: aqO === 3 });
      }
      push({ type: 'boost', x: aqX + 0.1, height: 0.4 });
    },
  },
  {
    name: 'WELL',
    threshold: 0.9413,
    minTime: 30,
    delay: 1.1,
    spawn: (push) => {
      // WELL: deep vertical shaft — narrow barrier column with orb descent
      const weX = 1.08;
      // Well walls (narrow vertical)
      for (let we1 = 0; we1 < 8; we1++) {
        push({ type: 'barrier', x: weX, height: 0.1 + we1 * 0.1 });
        push({ type: 'barrier', x: weX + 0.015, height: 0.1 + we1 * 0.1 });
      }
      // Orbs inside the well
      for (let weO = 0; weO < 5; weO++) {
        push({ type: 'orb', x: weX + 0.007, height: 0.2 + weO * 0.12, golden: weO === 3 });
      }
      push({ type: 'boost', x: weX + 0.03, height: 0.5 });
    },
  },
  {
    name: 'PASSAGE',
    threshold: 0.9414,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // PASSAGE: narrow underground tunnel — tight barrier corridor with orb line
      const paX = 1.08;
      for (let pa1 = 0; pa1 < 8; pa1++) {
        const paOff = Math.sin(pa1 * 0.5) * 0.05;
        push({ type: 'barrier', x: paX + pa1 * 0.011, height: 0.55 + paOff });
        push({ type: 'barrier', x: paX + pa1 * 0.011, height: 0.35 + paOff });
      }
      // Orb trail through passage
      for (let paO = 0; paO < 6; paO++) {
        const paOOff = Math.sin(paO * 0.5) * 0.05;
        push({ type: 'orb', x: paX + 0.005 + paO * 0.013, height: 0.45 + paOOff, golden: paO === 4 });
      }
      push({ type: 'boost', x: paX + 0.1, height: 0.45 });
    },
  },
  {
    name: 'CRYPT',
    threshold: 0.9415,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CRYPT: underground burial chamber — low dense barrier room with hidden treasure
      const crpX = 1.08;
      // Ceiling
      for (let cr1 = 0; cr1 < 5; cr1++) {
        push({ type: 'barrier', x: crpX + cr1 * 0.014, height: 0.4 });
      }
      // Floor
      for (let cr2 = 0; cr2 < 5; cr2++) {
        push({ type: 'barrier', x: crpX + cr2 * 0.014, height: 0.08 });
      }
      // Side walls
      push({ type: 'barrier', x: crpX, height: 0.15 });
      push({ type: 'barrier', x: crpX, height: 0.25 });
      push({ type: 'barrier', x: crpX, height: 0.35 });
      push({ type: 'barrier', x: crpX + 0.056, height: 0.15 });
      push({ type: 'barrier', x: crpX + 0.056, height: 0.25 });
      push({ type: 'barrier', x: crpX + 0.056, height: 0.35 });
      // Hidden treasure
      push({ type: 'orb', x: crpX + 0.028, height: 0.24, golden: true });
      push({ type: 'orb', x: crpX + 0.028, height: 0.16 });
      push({ type: 'boost', x: crpX + 0.08, height: 0.24 });
    },
  },
  {
    name: 'DRAWBRIDGE DOUBLE',
    threshold: 0.9416,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // DRAWBRIDGE DOUBLE: twin rising bridges — paired arch formations
      const db2X = 1.08;
      // First bridge
      for (let db1 = 0; db1 < 4; db1++) {
        push({ type: 'barrier', x: db2X + db1 * 0.01, height: 0.2 + db1 * 0.1 });
      }
      for (let db2 = 0; db2 < 4; db2++) {
        push({ type: 'barrier', x: db2X + 0.04 + db2 * 0.01, height: 0.5 - db2 * 0.1 });
      }
      push({ type: 'orb', x: db2X + 0.03, height: 0.6 });
      // Second bridge
      for (let db3 = 0; db3 < 4; db3++) {
        push({ type: 'barrier', x: db2X + 0.09 + db3 * 0.01, height: 0.4 + db3 * 0.1 });
      }
      for (let db4 = 0; db4 < 4; db4++) {
        push({ type: 'barrier', x: db2X + 0.13 + db4 * 0.01, height: 0.7 - db4 * 0.1 });
      }
      push({ type: 'orb', x: db2X + 0.12, height: 0.8, golden: true });
      push({ type: 'boost', x: db2X + 0.18, height: 0.5 });
    },
  },
  {
    name: 'TREASURY',
    threshold: 0.9417,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // TREASURY: vault room — heavily walled barrier room with multiple golden orbs
      const trX2 = 1.08;
      // Thick walls
      for (let tr1 = 0; tr1 < 3; tr1++) {
        for (let tr2 = 0; tr2 < 7; tr2++) {
          const trH2 = 0.15 + tr2 * 0.1;
          push({ type: 'barrier', x: trX2 + tr1 * 0.025, height: trH2 });
        }
      }
      // Golden treasure inside
      push({ type: 'orb', x: trX2 + 0.012, height: 0.45, golden: true });
      push({ type: 'orb', x: trX2 + 0.012, height: 0.55, golden: true });
      push({ type: 'orb', x: trX2 + 0.037, height: 0.5, golden: true });
      push({ type: 'boost', x: trX2 + 0.07, height: 0.5 });
    },
  },
  {
    name: 'ARMORY',
    threshold: 0.9418,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // ARMORY: weapon storage — barrier racks with orbs between slots
      const arX = 1.08;
      // Rack columns
      for (let ar1 = 0; ar1 < 5; ar1++) {
        const arXOff = ar1 * 0.018;
        push({ type: 'barrier', x: arX + arXOff, height: 0.3 });
        push({ type: 'barrier', x: arX + arXOff, height: 0.7 });
        // Orb between racks
        if (ar1 < 4) {
          push({ type: 'orb', x: arX + arXOff + 0.009, height: 0.5, golden: ar1 === 2 });
        }
      }
      push({ type: 'boost', x: arX + 0.09, height: 0.5 });
    },
  },
  {
    name: 'THRONE ROOM',
    threshold: 0.9419,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // THRONE ROOM: royal chamber — ornate barrier room with treasure hoard
      const thX = 1.08;
      // Side walls
      for (let th1 = 0; th1 < 6; th1++) {
        push({ type: 'barrier', x: thX, height: 0.25 + th1 * 0.1 });
        push({ type: 'barrier', x: thX + 0.04, height: 0.25 + th1 * 0.1 });
      }
      // Throne (barrier cluster at back)
      push({ type: 'barrier', x: thX + 0.02, height: 0.75 });
      push({ type: 'barrier', x: thX + 0.02, height: 0.8 });
      // Royal treasure
      push({ type: 'orb', x: thX + 0.015, height: 0.4, golden: true });
      push({ type: 'orb', x: thX + 0.025, height: 0.5, golden: true });
      push({ type: 'orb', x: thX + 0.02, height: 0.6 });
      push({ type: 'boost', x: thX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'CISTERN',
    threshold: 0.942,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CISTERN: underground water storage — low wide barrier cavity with orb pool
      const ciX = 1.08;
      // Ceiling arch
      for (let ci1 = 0; ci1 < 7; ci1++) {
        const ciT2 = ci1 / 6;
        const ciH2 = 0.35 + 0.15 * Math.sin(ciT2 * Math.PI);
        push({ type: 'barrier', x: ciX + ci1 * 0.012, height: ciH2 });
      }
      // Floor
      for (let ci2 = 0; ci2 < 7; ci2++) {
        push({ type: 'barrier', x: ciX + ci2 * 0.012, height: 0.1 });
      }
      // Water level orbs
      for (let ciO = 0; ciO < 4; ciO++) {
        push({ type: 'orb', x: ciX + 0.01 + ciO * 0.018, height: 0.2, golden: ciO === 2 });
      }
      push({ type: 'boost', x: ciX + 0.09, height: 0.2 });
    },
  },
  {
    name: 'GREAT HALL',
    threshold: 0.9421,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // GREAT HALL: wide barrier room — broad enclosed space with orb treasure
      const grX = 1.08;
      // Ceiling
      for (let gr1 = 0; gr1 < 6; gr1++) {
        push({ type: 'barrier', x: grX + gr1 * 0.015, height: 0.8 });
      }
      // Floor
      for (let gr2 = 0; gr2 < 6; gr2++) {
        push({ type: 'barrier', x: grX + gr2 * 0.015, height: 0.2 });
      }
      // Treasure scatter inside
      push({ type: 'orb', x: grX + 0.02, height: 0.4 });
      push({ type: 'orb', x: grX + 0.04, height: 0.6, golden: true });
      push({ type: 'orb', x: grX + 0.06, height: 0.5 });
      push({ type: 'orb', x: grX + 0.05, height: 0.35 });
      push({ type: 'boost', x: grX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'CHAPEL',
    threshold: 0.9422,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // CHAPEL: small sacred space — barrier walls with central golden orb shrine
      const chX = 1.08;
      // Left wall
      for (let ch1 = 0; ch1 < 5; ch1++) {
        push({ type: 'barrier', x: chX, height: 0.2 + ch1 * 0.12 });
      }
      // Right wall
      for (let ch2 = 0; ch2 < 5; ch2++) {
        push({ type: 'barrier', x: chX + 0.03, height: 0.2 + ch2 * 0.12 });
      }
      // Roof
      push({ type: 'barrier', x: chX + 0.01, height: 0.72 });
      push({ type: 'barrier', x: chX + 0.02, height: 0.72 });
      // Central shrine
      push({ type: 'orb', x: chX + 0.015, height: 0.5, golden: true });
      push({ type: 'orb', x: chX + 0.015, height: 0.35 });
      push({ type: 'boost', x: chX + 0.05, height: 0.5 });
    },
  },
  {
    name: 'SPIRAL STAIRCASE',
    threshold: 0.9423,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // SPIRAL STAIRCASE: ascending spiral — diagonal barrier steps with orb trail
      const ssX2 = 1.08;
      for (let ss1 = 0; ss1 < 6; ss1++) {
        const ssH2 = 0.15 + ss1 * 0.12;
        const ssXOff = ss1 * 0.014;
        push({ type: 'barrier', x: ssX2 + ssXOff, height: ssH2 });
        push({ type: 'barrier', x: ssX2 + ssXOff + 0.004, height: ssH2 });
        push({ type: 'orb', x: ssX2 + ssXOff + 0.008, height: ssH2 + 0.06, golden: ss1 === 5 });
      }
      push({ type: 'boost', x: ssX2 + 0.1, height: 0.5 });
    },
  },
  {
    name: 'POSTERN GATE',
    threshold: 0.9424,
    minTime: 30,
    delay: 1.1,
    spawn: (push) => {
      // POSTERN GATE: small secondary entrance — compact barrier frame with orb passage
      const pgX = 1.08;
      // Frame top
      push({ type: 'barrier', x: pgX, height: 0.65 });
      push({ type: 'barrier', x: pgX + 0.01, height: 0.65 });
      push({ type: 'barrier', x: pgX + 0.02, height: 0.65 });
      // Frame bottom
      push({ type: 'barrier', x: pgX, height: 0.35 });
      push({ type: 'barrier', x: pgX + 0.01, height: 0.35 });
      push({ type: 'barrier', x: pgX + 0.02, height: 0.35 });
      // Frame sides
      push({ type: 'barrier', x: pgX, height: 0.45 });
      push({ type: 'barrier', x: pgX, height: 0.55 });
      push({ type: 'barrier', x: pgX + 0.02, height: 0.45 });
      push({ type: 'barrier', x: pgX + 0.02, height: 0.55 });
      // Interior orb
      push({ type: 'orb', x: pgX + 0.01, height: 0.5, golden: true });
      push({ type: 'boost', x: pgX + 0.04, height: 0.5 });
    },
  },
  {
    name: 'CURTAIN WALL',
    threshold: 0.9425,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CURTAIN WALL: long continuous barrier — extended horizontal wall with gaps
      const cwX = 1.08;
      for (let cw1 = 0; cw1 < 10; cw1++) {
        const cwSkip = cw1 === 3 || cw1 === 7; // two gaps
        if (!cwSkip) {
          push({ type: 'barrier', x: cwX + cw1 * 0.01, height: 0.5 });
          push({ type: 'barrier', x: cwX + cw1 * 0.01, height: 0.55 });
        } else {
          push({ type: 'orb', x: cwX + cw1 * 0.01, height: 0.52, golden: cw1 === 7 });
        }
      }
      push({ type: 'boost', x: cwX + 0.12, height: 0.52 });
    },
  },
  {
    name: 'BARBETTE TRIPLE',
    threshold: 0.9426,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // BARBETTE TRIPLE: three-tier gun platform — stacked barrier platforms with orbs
      const bt3X = 1.08;
      // Low tier
      for (let bt1 = 0; bt1 < 3; bt1++) {
        push({ type: 'barrier', x: bt3X + bt1 * 0.008, height: 0.2 });
      }
      push({ type: 'orb', x: bt3X + 0.012, height: 0.3 });
      // Mid tier
      for (let bt2 = 0; bt2 < 3; bt2++) {
        push({ type: 'barrier', x: bt3X + 0.025 + bt2 * 0.008, height: 0.45 });
      }
      push({ type: 'orb', x: bt3X + 0.037, height: 0.55, golden: true });
      // High tier
      for (let bt3 = 0; bt3 < 3; bt3++) {
        push({ type: 'barrier', x: bt3X + 0.05 + bt3 * 0.008, height: 0.7 });
      }
      push({ type: 'orb', x: bt3X + 0.062, height: 0.8 });
      push({ type: 'boost', x: bt3X + 0.08, height: 0.5 });
    },
  },
  {
    name: 'RAMPART',
    threshold: 0.9427,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // RAMPART: elevated defensive wall — long barrier line with orbs above and below
      const rpX = 1.08;
      // Main rampart wall
      for (let rp1 = 0; rp1 < 8; rp1++) {
        push({ type: 'barrier', x: rpX + rp1 * 0.011, height: 0.5 });
        push({ type: 'barrier', x: rpX + rp1 * 0.011, height: 0.52 });
      }
      // Orbs above
      for (let rpO1 = 0; rpO1 < 4; rpO1++) {
        push({ type: 'orb', x: rpX + 0.01 + rpO1 * 0.02, height: 0.7, golden: rpO1 === 2 });
      }
      // Orbs below
      for (let rpO2 = 0; rpO2 < 3; rpO2++) {
        push({ type: 'orb', x: rpX + 0.015 + rpO2 * 0.025, height: 0.3 });
      }
      push({ type: 'boost', x: rpX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'EMBRASURE',
    threshold: 0.9428,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // EMBRASURE: wide firing opening — horizontal slot in barrier wall
      const emX = 1.08;
      // Top wall
      for (let em1 = 0; em1 < 5; em1++) {
        push({ type: 'barrier', x: emX + em1 * 0.012, height: 0.65 });
        push({ type: 'barrier', x: emX + em1 * 0.012, height: 0.75 });
        push({ type: 'barrier', x: emX + em1 * 0.012, height: 0.85 });
      }
      // Bottom wall
      for (let em2 = 0; em2 < 5; em2++) {
        push({ type: 'barrier', x: emX + em2 * 0.012, height: 0.15 });
        push({ type: 'barrier', x: emX + em2 * 0.012, height: 0.25 });
        push({ type: 'barrier', x: emX + em2 * 0.012, height: 0.35 });
      }
      // Orbs through the embrasure slot
      for (let emO = 0; emO < 4; emO++) {
        push({ type: 'orb', x: emX + 0.006 + emO * 0.014, height: 0.5, golden: emO === 2 });
      }
      push({ type: 'boost', x: emX + 0.07, height: 0.5 });
    },
  },
  {
    name: 'TURRET',
    threshold: 0.9429,
    minTime: 30,
    delay: 1.1,
    spawn: (push) => {
      // TURRET: small projecting tower — compact barrier cluster with orb cap
      const tuX = 1.08;
      // Tower base
      push({ type: 'barrier', x: tuX, height: 0.3 });
      push({ type: 'barrier', x: tuX + 0.004, height: 0.3 });
      push({ type: 'barrier', x: tuX, height: 0.4 });
      push({ type: 'barrier', x: tuX + 0.004, height: 0.4 });
      push({ type: 'barrier', x: tuX, height: 0.5 });
      push({ type: 'barrier', x: tuX + 0.004, height: 0.5 });
      // Cap orb
      push({ type: 'orb', x: tuX + 0.002, height: 0.6, golden: true });
      // Side orbs
      push({ type: 'orb', x: tuX + 0.02, height: 0.35 });
      push({ type: 'orb', x: tuX + 0.03, height: 0.35 });
      push({ type: 'boost', x: tuX + 0.05, height: 0.4 });
    },
  },
  {
    name: 'WATCHTOWER',
    threshold: 0.943,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // WATCHTOWER: tall observation tower — vertical barrier column with top orb
      const wtX = 1.08;
      // Tower column
      for (let wt1 = 0; wt1 < 8; wt1++) {
        push({ type: 'barrier', x: wtX, height: 0.1 + wt1 * 0.1 });
        push({ type: 'barrier', x: wtX + 0.004, height: 0.1 + wt1 * 0.1 });
      }
      // Crown orbs
      push({ type: 'orb', x: wtX + 0.002, height: 0.92, golden: true });
      // Side orb line
      for (let wtO = 0; wtO < 4; wtO++) {
        push({ type: 'orb', x: wtX + 0.015 + wtO * 0.012, height: 0.5 });
      }
      push({ type: 'boost', x: wtX + 0.07, height: 0.5 });
    },
  },
  {
    name: 'PARAPET WALK',
    threshold: 0.9431,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // PARAPET WALK: elevated walkway — high barrier platform with orbs along top
      const pwX = 1.08;
      // Platform pillars
      for (let pw1 = 0; pw1 < 4; pw1++) {
        const pwPX = pwX + pw1 * 0.02;
        push({ type: 'barrier', x: pwPX, height: 0.55 });
        push({ type: 'barrier', x: pwPX, height: 0.65 });
        push({ type: 'barrier', x: pwPX, height: 0.75 });
      }
      // Walkway orbs on top
      for (let pwO = 0; pwO < 4; pwO++) {
        push({ type: 'orb', x: pwX + 0.005 + pwO * 0.02, height: 0.85, golden: pwO === 2 });
      }
      // Ground level orbs below
      push({ type: 'orb', x: pwX + 0.01, height: 0.3 });
      push({ type: 'orb', x: pwX + 0.03, height: 0.3 });
      push({ type: 'boost', x: pwX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'DUNGEON',
    threshold: 0.9432,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // DUNGEON: underground prison — deep low corridor with ceiling and orb prisoners
      const dnX = 1.08;
      // Ceiling
      for (let dn1 = 0; dn1 < 7; dn1++) {
        push({ type: 'barrier', x: dnX + dn1 * 0.013, height: 0.38 });
      }
      // Floor
      for (let dn2 = 0; dn2 < 7; dn2++) {
        push({ type: 'barrier', x: dnX + dn2 * 0.013, height: 0.12 });
      }
      // Prisoner orbs inside
      for (let dnO = 0; dnO < 5; dnO++) {
        push({ type: 'orb', x: dnX + 0.01 + dnO * 0.015, height: 0.25, golden: dnO === 2 });
      }
      push({ type: 'boost', x: dnX + 0.1, height: 0.25 });
    },
  },
  {
    name: 'KEEP',
    threshold: 0.9433,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // KEEP: central fortification — diamond barrier arrangement with orb core
      const kpX = 1.08;
      // Diamond shape barriers
      const kpPts: Array<[number, number]> = [
      [0, 0.5], [0.02, 0.3], [0.04, 0.5], [0.02, 0.7],
      ];
      for (const [kpDx, kpDy] of kpPts) {
        push({ type: 'barrier', x: kpX + kpDx, height: kpDy });
        push({ type: 'barrier', x: kpX + kpDx + 0.003, height: kpDy });
      }
      // Connecting barriers
      push({ type: 'barrier', x: kpX + 0.01, height: 0.4 });
      push({ type: 'barrier', x: kpX + 0.01, height: 0.6 });
      push({ type: 'barrier', x: kpX + 0.03, height: 0.4 });
      push({ type: 'barrier', x: kpX + 0.03, height: 0.6 });
      // Core orbs
      push({ type: 'orb', x: kpX + 0.02, height: 0.5, golden: true });
      push({ type: 'boost', x: kpX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'SALLY PORT',
    threshold: 0.9434,
    minTime: 30,
    delay: 1.1,
    spawn: (push) => {
      // SALLY PORT: hidden exit — concealed gap in barrier wall with surprise orbs
      const spX2 = 1.08;
      // Dense barrier wall
      for (let sp2 = 0; sp2 < 9; sp2++) {
        const spH2 = sp2 * 0.1 + 0.05;
        push({ type: 'barrier', x: spX2, height: spH2 });
        push({ type: 'barrier', x: spX2 + 0.005, height: spH2 });
      }
      // Hidden sally port (remove middle barriers and add orbs)
      const spGap = 0.45;
      push({ type: 'orb', x: spX2 + 0.002, height: spGap });
      push({ type: 'orb', x: spX2 + 0.015, height: spGap, golden: true });
      push({ type: 'orb', x: spX2 + 0.025, height: spGap });
      push({ type: 'orb', x: spX2 + 0.035, height: spGap });
      push({ type: 'boost', x: spX2 + 0.05, height: spGap });
    },
  },
  {
    name: 'GATEHOUSE',
    threshold: 0.9435,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // GATEHOUSE: fortified entry — double barrier walls with narrow passage
      const ghX = 1.08;
      // First gate wall
      for (let gh1 = 0; gh1 < 8; gh1++) {
        const ghH = gh1 * 0.11;
        if (ghH < 0.38 || ghH > 0.52) {
          push({ type: 'barrier', x: ghX, height: ghH });
        }
      }
      // Second gate wall
      for (let gh2 = 0; gh2 < 8; gh2++) {
        const ghH2 = gh2 * 0.11;
        if (ghH2 < 0.35 || ghH2 > 0.55) {
          push({ type: 'barrier', x: ghX + 0.03, height: ghH2 });
        }
      }
      // Orbs through the passage
      push({ type: 'orb', x: ghX + 0.01, height: 0.45 });
      push({ type: 'orb', x: ghX + 0.04, height: 0.45, golden: true });
      push({ type: 'orb', x: ghX + 0.06, height: 0.45 });
      push({ type: 'boost', x: ghX + 0.08, height: 0.45 });
    },
  },
  {
    name: 'OUBLIETTE',
    threshold: 0.9436,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // OUBLIETTE: hidden pit trap — surrounded barrier box with golden orb inside
      const obX = 1.08;
      // Top wall
      for (let obT2 = 0; obT2 < 4; obT2++) {
        push({ type: 'barrier', x: obX + obT2 * 0.012, height: 0.7 });
      }
      // Bottom wall
      for (let obB = 0; obB < 4; obB++) {
        push({ type: 'barrier', x: obX + obB * 0.012, height: 0.3 });
      }
      // Side walls
      push({ type: 'barrier', x: obX, height: 0.4 });
      push({ type: 'barrier', x: obX, height: 0.5 });
      push({ type: 'barrier', x: obX, height: 0.6 });
      push({ type: 'barrier', x: obX + 0.036, height: 0.4 });
      push({ type: 'barrier', x: obX + 0.036, height: 0.5 });
      push({ type: 'barrier', x: obX + 0.036, height: 0.6 });
      // Treasure inside
      push({ type: 'orb', x: obX + 0.018, height: 0.5, golden: true });
      // Escape reward
      push({ type: 'boost', x: obX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'CRENEL',
    threshold: 0.9437,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // CRENEL: alternating merlons — barrier teeth pattern with orbs in gaps
      const crX = 1.08;
      for (let crI = 0; crI < 6; crI++) {
        if (crI % 2 === 0) { // Merlon (barrier tooth)
          push({ type: 'barrier', x: crX + crI * 0.014, height: 0.5 });
          push({ type: 'barrier', x: crX + crI * 0.014, height: 0.6 });
          push({ type: 'barrier', x: crX + crI * 0.014 + 0.005, height: 0.55 });
        } else { // Crenel (gap with orb)
          push({ type: 'orb', x: crX + crI * 0.014, height: 0.55, golden: crI === 3 });
        }
      }
      push({ type: 'boost', x: crX + 0.1, height: 0.55 });
    },
  },
  {
    name: 'ARROW SLIT',
    threshold: 0.9438,
    minTime: 30,
    delay: 1.1,
    spawn: (push) => {
      // ARROW SLIT: narrow vertical opening in barrier wall — precise threading required
      const asX = 1.08;
      const asGap = 0.45 + Math.random() * 0.1;
      // Left wall
      for (let asL = 0; asL < 5; asL++) {
        const asH3 = asL * 0.08;
        if (asH3 < asGap - 0.06) {
          push({ type: 'barrier', x: asX, height: asH3 });
        }
      }
      // Right wall (above gap)
      for (let asR = 0; asR < 5; asR++) {
        const asH4 = asGap + 0.06 + asR * 0.08;
        if (asH4 < 0.95) {
          push({ type: 'barrier', x: asX, height: asH4 });
        }
      }
      push({ type: 'barrier', x: asX + 0.005, height: asGap - 0.07 });
      push({ type: 'barrier', x: asX + 0.005, height: asGap + 0.07 });
      // Reward through slit
      push({ type: 'orb', x: asX + 0.015, height: asGap, golden: true });
      push({ type: 'orb', x: asX + 0.03, height: asGap });
      push({ type: 'boost', x: asX + 0.045, height: asGap });
    },
  },
  {
    name: 'MURDER HOLE DOUBLE',
    threshold: 0.9439,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // MURDER HOLE DOUBLE: twin overhead kill zones — paired barrier ceilings with drops
      const mh2X = 1.08;
      // First murder hole
      for (let mh1 = 0; mh1 < 4; mh1++) {
        push({ type: 'barrier', x: mh2X + mh1 * 0.01, height: 0.82 });
        push({ type: 'barrier', x: mh2X + mh1 * 0.01, height: 0.3 });
      }
      push({ type: 'orb', x: mh2X + 0.02, height: 0.55 });
      // Second murder hole
      for (let mh3 = 0; mh3 < 4; mh3++) {
        push({ type: 'barrier', x: mh2X + 0.06 + mh3 * 0.01, height: 0.78 });
        push({ type: 'barrier', x: mh2X + 0.06 + mh3 * 0.01, height: 0.25 });
      }
      push({ type: 'orb', x: mh2X + 0.08, height: 0.5, golden: true });
      push({ type: 'boost', x: mh2X + 0.12, height: 0.5 });
    },
  },
  {
    name: 'MACHICOLATION',
    threshold: 0.944,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // MACHICOLATION: overhead barrier overhang — ceiling barriers with orbs below
      const macX = 1.08;
      for (let mcI = 0; mcI < 7; mcI++) {
        push({ type: 'barrier', x: macX + mcI * 0.013, height: 0.78 + Math.sin(mcI * 1.2) * 0.03 });
        push({ type: 'barrier', x: macX + mcI * 0.013, height: 0.85 + Math.sin(mcI * 1.2) * 0.03 });
      }
      // Orbs beneath the overhang
      for (let mcO = 0; mcO < 5; mcO++) {
        push({ type: 'orb', x: macX + 0.01 + mcO * 0.016, height: 0.55, golden: mcO === 2 });
      }
      push({ type: 'boost', x: macX + 0.1, height: 0.4 });
    },
  },
  {
    name: 'BARBICAN DOUBLE',
    threshold: 0.9441,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // BARBICAN DOUBLE: twin reinforced gatehouse — two barrier clusters with passage
      const bb2X = 1.08;
      // First gatehouse
      for (let bb1 = 0; bb1 < 4; bb1++) {
        push({ type: 'barrier', x: bb2X + bb1 * 0.006, height: 0.2 + bb1 * 0.05 });
        push({ type: 'barrier', x: bb2X + bb1 * 0.006, height: 0.65 + bb1 * 0.05 });
      }
      push({ type: 'orb', x: bb2X + 0.012, height: 0.45 });
      // Second gatehouse
      for (let bb3 = 0; bb3 < 4; bb3++) {
        push({ type: 'barrier', x: bb2X + 0.05 + bb3 * 0.006, height: 0.15 + bb3 * 0.05 });
        push({ type: 'barrier', x: bb2X + 0.05 + bb3 * 0.006, height: 0.6 + bb3 * 0.05 });
      }
      push({ type: 'orb', x: bb2X + 0.062, height: 0.4, golden: true });
      push({ type: 'boost', x: bb2X + 0.1, height: 0.45 });
    },
  },
  {
    name: 'MOAT',
    threshold: 0.9442,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // MOAT: water hazard — wide low barrier band with orb island in center
      const moX = 1.08;
      // Low barrier floor (moat)
      for (let moI = 0; moI < 8; moI++) {
        push({ type: 'barrier', x: moX + moI * 0.012, height: 0.15 + Math.sin(moI * 0.7) * 0.02 });
      }
      // Island in the middle
      push({ type: 'orb', x: moX + 0.04, height: 0.4 });
      push({ type: 'orb', x: moX + 0.05, height: 0.5, golden: true });
      push({ type: 'orb', x: moX + 0.06, height: 0.4 });
      // Top ceiling barriers
      for (let moT = 0; moT < 8; moT++) {
        push({ type: 'barrier', x: moX + moT * 0.012, height: 0.75 + Math.sin(moT * 0.7) * 0.02 });
      }
      push({ type: 'boost', x: moX + 0.1, height: 0.45 });
    },
  },
  {
    name: 'DRAWBRIDGE',
    threshold: 0.9443,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // DRAWBRIDGE: rising barrier with orb bait — barriers form bridge shape
      const dbX = 1.08;
      for (let dbI = 0; dbI < 5; dbI++) {
        const dbH = 0.2 + dbI * 0.12; // rising
        push({ type: 'barrier', x: dbX + dbI * 0.016, height: dbH });
      }
      for (let dbI2 = 0; dbI2 < 5; dbI2++) {
        const dbH2 = 0.68 - dbI2 * 0.12; // falling
        push({ type: 'barrier', x: dbX + 0.08 + dbI2 * 0.016, height: dbH2 });
      }
      // Orbs along the arch
      push({ type: 'orb', x: dbX + 0.04, height: 0.75 });
      push({ type: 'orb', x: dbX + 0.06, height: 0.8, golden: true });
      push({ type: 'orb', x: dbX + 0.08, height: 0.75 });
      push({ type: 'boost', x: dbX + 0.18, height: 0.3 });
    },
  },
  {
    name: 'PORTCULLIS',
    threshold: 0.9444,
    minTime: 30,
    delay: 1.1,
    spawn: (push) => {
      // PORTCULLIS: heavy gate — tall barrier wall with narrow gap
      const ptX = 1.08;
      const ptGap = 0.35 + Math.random() * 0.3; // gap center
      for (let ptV = 0; ptV < 10; ptV++) {
        const ptH = ptV * 0.1;
        if (Math.abs(ptH - ptGap) > 0.08) {
          push({ type: 'barrier', x: ptX, height: ptH });
          push({ type: 'barrier', x: ptX + 0.004, height: ptH });
        }
      }
      // Reward orbs through the gap
      push({ type: 'orb', x: ptX + 0.015, height: ptGap, golden: true });
      push({ type: 'orb', x: ptX + 0.03, height: ptGap });
      push({ type: 'boost', x: ptX + 0.045, height: ptGap });
    },
  },
  {
    name: 'BATTERING RAM',
    threshold: 0.9445,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // BATTERING RAM: heavy frontal assault — thick barrier column with trailing orbs
      const brX = 1.08;
      // Ram head — dense barrier cluster
      for (let brH = 0; brH < 3; brH++) {
        for (let brV = 0; brV < 3; brV++) {
          push({ type: 'barrier', x: brX + brH * 0.006, height: 0.4 + brV * 0.08 });
        }
      }
      // Trailing orb reward line
      for (let brO = 0; brO < 6; brO++) {
        push({ type: 'orb', x: brX + 0.025 + brO * 0.012, height: 0.5, golden: brO === 5 });
      }
      push({ type: 'boost', x: brX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'TREBUCHET',
    threshold: 0.9446,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // TREBUCHET: catapult arc — parabolic barrier arc with orbs along trajectory
      const trX = 1.08;
      for (let trI = 0; trI < 8; trI++) {
        const trT2 = trI / 7;
        const trH = 0.15 + 0.7 * (4 * trT2 * (1 - trT2)); // parabola
        push({ type: 'barrier', x: trX + trI * 0.014, height: trH });
      }
      for (let trO = 1; trO < 7; trO++) {
        const trOT = trO / 7;
        const trOH = 0.15 + 0.7 * (4 * trOT * (1 - trOT));
        push({ type: 'orb', x: trX + trO * 0.014, height: trOH - 0.08, golden: trO === 4 });
      }
      push({ type: 'boost', x: trX + 0.12, height: 0.2 });
    },
  },
  {
    name: 'SIEGE TOWER',
    threshold: 0.9447,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // SIEGE TOWER: tall vertical barrier with orb ladder — climb to golden reward
      const stX = 1.08;
      for (let stL = 0; stL < 7; stL++) {
        push({ type: 'barrier', x: stX, height: 0.1 + stL * 0.12 });
        push({ type: 'barrier', x: stX + 0.005, height: 0.1 + stL * 0.12 });
      }
      for (let stO = 0; stO < 6; stO++) {
        push({ type: 'orb', x: stX + 0.015, height: 0.15 + stO * 0.12 });
      }
      push({ type: 'orb', x: stX + 0.015, height: 0.87, golden: true });
      push({ type: 'boost', x: stX + 0.03, height: 0.5 });
    },
  },
  {
    name: 'SAPPER',
    threshold: 0.9448,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // SAPPER: demolition tunnel approach — zigzag barrier path with scattered orbs
      const sapX = 1.08;
      for (let sp = 0; sp < 5; sp++) {
        const spZig = sp % 2 === 0 ? 0.2 : 0.7;
        push({ type: 'barrier', x: sapX + sp * 0.02, height: spZig });
        push({ type: 'barrier', x: sapX + sp * 0.02 + 0.005, height: spZig + 0.08 });
        push({ type: 'orb', x: sapX + sp * 0.02 + 0.01, height: sp % 2 === 0 ? 0.55 : 0.35 });
      }
      push({ type: 'orb', x: sapX + 0.12, height: 0.5, golden: true });
      push({ type: 'boost', x: sapX + 0.14, height: 0.5 });
    },
  },
  {
    name: 'COUNTERMINE',
    threshold: 0.9449,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // COUNTERMINE: underground defensive tunnel — low barrier corridor with orb reward
      const cmX = 1.08;
      for (let cm = 0; cm < 6; cm++) {
        const cmOff = cm * 0.015;
        push({ type: 'barrier', x: cmX + cmOff, height: 0.25 + Math.sin(cm * 0.8) * 0.03 });
        push({ type: 'barrier', x: cmX + cmOff, height: 0.42 + Math.sin(cm * 0.8) * 0.03 });
      }
      for (let cmO = 0; cmO < 5; cmO++) {
        push({ type: 'orb', x: cmX + 0.008 + cmO * 0.015, height: 0.33 });
      }
      push({ type: 'orb', x: cmX + 0.1, height: 0.33, golden: true });
      push({ type: 'boost', x: cmX + 0.12, height: 0.33 });
    },
  },
  {
    name: 'ABATIS DOUBLE',
    threshold: 0.945,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // ABATIS DOUBLE: twin felled tree obstacles — two barrier scatter clusters
      const ab2X = 1.08;
      // First cluster (upper)
      for (let t1 = 0; t1 < 4; t1++) {
        const t1x = ab2X + t1 * 0.012 + Math.sin(t1 * 2.1) * 0.003;
        push({ type: 'barrier', x: t1x, height: 0.3 + Math.sin(t1 * 1.7) * 0.05 });
        push({ type: 'barrier', x: t1x + 0.004, height: 0.32 + Math.sin(t1 * 1.7) * 0.05 });
      }
      // Second cluster (lower)
      for (let t2 = 0; t2 < 4; t2++) {
        const t2x = ab2X + 0.04 + t2 * 0.012;
        push({ type: 'barrier', x: t2x, height: 0.6 + Math.sin(t2 * 1.3) * 0.05 });
        push({ type: 'barrier', x: t2x + 0.004, height: 0.62 + Math.sin(t2 * 1.3) * 0.05 });
      }
      // Orbs between clusters
      push({ type: 'orb', x: ab2X + 0.03, height: 0.5, golden: true });
      push({ type: 'orb', x: ab2X + 0.06, height: 0.5 });
      // Below path
      push({ type: 'orb', x: ab2X + 0.04, height: 0.8 });
      // Exit
      push({ type: 'boost', x: ab2X + 0.1, height: 0.5 });
    },
  },
  {
    name: 'PALISADE GATE',
    threshold: 0.9451,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // PALISADE GATE: fence with gated opening — vertical stakes with gap
      const pgX = 1.08;
      // Left palisade section
      for (let lps = 0; lps < 4; lps++) {
        const lpx = pgX + lps * 0.01;
        push({ type: 'barrier', x: lpx, height: 0.4 });
        push({ type: 'barrier', x: lpx, height: 0.52 });
      }
      // Gate gap (orbs)
      push({ type: 'orb', x: pgX + 0.045, height: 0.46, golden: true });
      // Right palisade section
      for (let rps = 0; rps < 4; rps++) {
        const rpx = pgX + 0.06 + rps * 0.01;
        push({ type: 'barrier', x: rpx, height: 0.4 });
        push({ type: 'barrier', x: rpx, height: 0.52 });
      }
      // Alternate path (above/below)
      push({ type: 'orb', x: pgX + 0.04, height: 0.25 });
      push({ type: 'orb', x: pgX + 0.04, height: 0.7 });
      // Exit
      push({ type: 'boost', x: pgX + 0.11, height: 0.46 });
    },
  },
  {
    name: 'CAVALIER DOUBLE',
    threshold: 0.9452,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CAVALIER DOUBLE: twin raised platforms — two elevated shelves at different heights
      const cd3X = 1.08;
      // Upper platform
      for (let up2 = 0; up2 < 5; up2++) {
        push({ type: 'barrier', x: cd3X + up2 * 0.008, height: 0.28 });
      }
      // Lower platform
      for (let lp2 = 0; lp2 < 5; lp2++) {
        push({ type: 'barrier', x: cd3X + 0.05 + lp2 * 0.008, height: 0.55 });
      }
      // Support pillars
      push({ type: 'barrier', x: cd3X + 0.02, height: 0.38 });
      push({ type: 'barrier', x: cd3X + 0.07, height: 0.65 });
      // Orbs between platforms
      push({ type: 'orb', x: cd3X + 0.035, height: 0.42, golden: true });
      push({ type: 'orb', x: cd3X + 0.04, height: 0.5 });
      // Above top platform
      push({ type: 'orb', x: cd3X + 0.02, height: 0.15 });
      // Below bottom platform
      push({ type: 'orb', x: cd3X + 0.065, height: 0.75 });
      // Exit
      push({ type: 'boost', x: cd3X + 0.1, height: 0.45 });
    },
  },
  {
    name: 'BASTION ROYAL',
    threshold: 0.9453,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // BASTION ROYAL: large five-sided bastion — pentagonal fortification
      const brX2 = 1.08;
      const brCX = brX2 + 0.04;
      const brCY = 0.5;
      // Pentagon walls
      for (let pn = 0; pn < 5; pn++) {
        const pnAng = (pn / 5) * Math.PI * 2 - Math.PI / 2;
        const pnAng2 = ((pn + 1) / 5) * Math.PI * 2 - Math.PI / 2;
        const pnR2 = 0.14;
        // Wall segment (3 barriers per side)
        for (let ws = 0; ws < 3; ws++) {
          const wst = ws / 2;
          const wsx = brCX + (Math.cos(pnAng) * (1 - wst) + Math.cos(pnAng2) * wst) * pnR2 * 0.3;
          const wsy = brCY + (Math.sin(pnAng) * (1 - wst) + Math.sin(pnAng2) * wst) * pnR2;
          push({ type: 'barrier', x: wsx, height: wsy });
        }
      }
      // Interior orbs
      push({ type: 'orb', x: brCX, height: 0.5, golden: true });
      push({ type: 'orb', x: brCX - 0.01, height: 0.45 });
      push({ type: 'orb', x: brCX + 0.01, height: 0.55 });
      // Exit
      push({ type: 'boost', x: brX2 + 0.1, height: 0.5 });
    },
  },
  {
    name: 'FLECHE DOUBLE',
    threshold: 0.9454,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // FLECHE DOUBLE: twin arrow outworks — two pointed formations
      const fd2X = 1.08;
      // First arrow (upper)
      push({ type: 'barrier', x: fd2X, height: 0.35 });
      for (let fa = 1; fa <= 3; fa++) {
        push({ type: 'barrier', x: fd2X + fa * 0.008, height: 0.35 - fa * 0.04 });
        push({ type: 'barrier', x: fd2X + fa * 0.008, height: 0.35 + fa * 0.04 });
      }
      // Second arrow (lower)
      push({ type: 'barrier', x: fd2X + 0.04, height: 0.65 });
      for (let fb = 1; fb <= 3; fb++) {
        push({ type: 'barrier', x: fd2X + 0.04 + fb * 0.008, height: 0.65 - fb * 0.04 });
        push({ type: 'barrier', x: fd2X + 0.04 + fb * 0.008, height: 0.65 + fb * 0.04 });
      }
      // Orbs between arrows
      push({ type: 'orb', x: fd2X + 0.025, height: 0.5, golden: true });
      push({ type: 'orb', x: fd2X + 0.01, height: 0.35 });
      push({ type: 'orb', x: fd2X + 0.05, height: 0.65 });
      // Exit
      push({ type: 'boost', x: fd2X + 0.08, height: 0.5 });
    },
  },
  {
    name: 'TENAILLE DOUBLE',
    threshold: 0.9455,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // TENAILLE DOUBLE: twin V-shaped walls — two offset V-formations
      const td2X = 1.08;
      // First V (upper)
      for (let v1 = 0; v1 < 4; v1++) {
        push({ type: 'barrier', x: td2X + v1 * 0.008, height: 0.25 + v1 * 0.03 });
      }
      for (let v1b = 0; v1b < 4; v1b++) {
        push({ type: 'barrier', x: td2X + 0.032 + v1b * 0.008, height: 0.37 - v1b * 0.03 });
      }
      // Second V (lower)
      for (let v2 = 0; v2 < 4; v2++) {
        push({ type: 'barrier', x: td2X + v2 * 0.008, height: 0.6 + v2 * 0.03 });
      }
      for (let v2b = 0; v2b < 4; v2b++) {
        push({ type: 'barrier', x: td2X + 0.032 + v2b * 0.008, height: 0.72 - v2b * 0.03 });
      }
      // Orbs in valleys
      push({ type: 'orb', x: td2X + 0.03, height: 0.38 });
      push({ type: 'orb', x: td2X + 0.03, height: 0.5, golden: true });
      push({ type: 'orb', x: td2X + 0.03, height: 0.73 });
      // Exit
      push({ type: 'boost', x: td2X + 0.08, height: 0.5 });
    },
  },
  {
    name: 'DEMILUNE DOUBLE',
    threshold: 0.9456,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // DEMILUNE DOUBLE: twin half-moon outworks — two curved arcs
      const dd2X = 1.08;
      // First arc (upper)
      for (let a1 = 0; a1 < 6; a1++) {
        const a1Ang = Math.PI * 0.3 + (a1 / 5) * Math.PI * 0.4;
        push({ type: 'barrier', x: dd2X + 0.02 + Math.cos(a1Ang) * 0.02, height: 0.35 + Math.sin(a1Ang) * 0.1 });
      }
      // Second arc (lower)
      for (let a2 = 0; a2 < 6; a2++) {
        const a2Ang = Math.PI * 0.3 + (a2 / 5) * Math.PI * 0.4;
        push({ type: 'barrier', x: dd2X + 0.05 + Math.cos(a2Ang) * 0.02, height: 0.6 + Math.sin(a2Ang) * 0.1 });
      }
      // Orbs between arcs
      push({ type: 'orb', x: dd2X + 0.035, height: 0.5, golden: true });
      push({ type: 'orb', x: dd2X + 0.025, height: 0.5 });
      push({ type: 'orb', x: dd2X + 0.055, height: 0.5 });
      // Exit
      push({ type: 'boost', x: dd2X + 0.08, height: 0.5 });
    },
  },
  {
    name: 'GORGE DOUBLE',
    threshold: 0.9457,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // GORGE DOUBLE: two open-backed enclosures — dual three-sided boxes
      const gd2X = 1.08;
      // First enclosure (upper)
      for (let g1 = 0; g1 < 4; g1++) {
        push({ type: 'barrier', x: gd2X + g1 * 0.008, height: 0.25 });
        push({ type: 'barrier', x: gd2X + g1 * 0.008, height: 0.45 });
      }
      push({ type: 'barrier', x: gd2X, height: 0.35 });
      // Second enclosure (lower, offset)
      for (let g2 = 0; g2 < 4; g2++) {
        push({ type: 'barrier', x: gd2X + 0.04 + g2 * 0.008, height: 0.55 });
        push({ type: 'barrier', x: gd2X + 0.04 + g2 * 0.008, height: 0.75 });
      }
      push({ type: 'barrier', x: gd2X + 0.04, height: 0.65 });
      // Interior orbs
      push({ type: 'orb', x: gd2X + 0.015, height: 0.35, golden: true });
      push({ type: 'orb', x: gd2X + 0.055, height: 0.65 });
      // Path between
      push({ type: 'orb', x: gd2X + 0.035, height: 0.5 });
      // Exit
      push({ type: 'boost', x: gd2X + 0.09, height: 0.5 });
    },
  },
  {
    name: 'RE-ENTRANT',
    threshold: 0.9458,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // RE-ENTRANT: inward-pointing angle of fortification — inverted V-wall
      const reX = 1.08;
      // Inverted V (opens toward player)
      for (let rv2 = 0; rv2 < 5; rv2++) {
        push({ type: 'barrier', x: reX + 0.04 - rv2 * 0.01, height: 0.5 - rv2 * 0.05 });
        push({ type: 'barrier', x: reX + 0.04 - rv2 * 0.01, height: 0.5 + rv2 * 0.05 });
      }
      // Extended walls
      for (let ew = 0; ew < 3; ew++) {
        push({ type: 'barrier', x: reX + 0.04 + ew * 0.01, height: 0.5 });
      }
      // Orbs in the inverted V
      push({ type: 'orb', x: reX + 0.035, height: 0.5, golden: true });
      push({ type: 'orb', x: reX + 0.02, height: 0.38 });
      push({ type: 'orb', x: reX + 0.02, height: 0.62 });
      // Exit
      push({ type: 'boost', x: reX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'SALIENT',
    threshold: 0.9459,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // SALIENT: outward-pointing angle of fortification — V-wall pointing forward
      const slntX = 1.08;
      // V-shaped salient walls
      for (let sv = 0; sv < 5; sv++) {
        push({ type: 'barrier', x: slntX + sv * 0.01, height: 0.5 - sv * 0.05 });
        push({ type: 'barrier', x: slntX + sv * 0.01, height: 0.5 + sv * 0.05 });
      }
      // Connecting curtain wall behind
      for (let cw7 = 0; cw7 < 3; cw7++) {
        push({ type: 'barrier', x: slntX + 0.04 + cw7 * 0.008, height: 0.3 });
        push({ type: 'barrier', x: slntX + 0.04 + cw7 * 0.008, height: 0.7 });
      }
      // Orbs in the salient
      push({ type: 'orb', x: slntX + 0.005, height: 0.5, golden: true });
      push({ type: 'orb', x: slntX + 0.02, height: 0.42 });
      push({ type: 'orb', x: slntX + 0.02, height: 0.58 });
      // Exit
      push({ type: 'boost', x: slntX + 0.07, height: 0.5 });
    },
  },
  {
    name: 'POSTERN TOWER',
    threshold: 0.946,
    minTime: 25,
    delay: 1.1,
    spawn: (push) => {
      // POSTERN TOWER: tower with hidden side exit — tall tower with passage
      const ptX = 1.08;
      // Tower body (tall vertical)
      for (let tb = 0; tb < 7; tb++) {
        push({ type: 'barrier', x: ptX + 0.02, height: 0.2 + tb * 0.08 });
      }
      // Tower sides
      push({ type: 'barrier', x: ptX + 0.015, height: 0.2 });
      push({ type: 'barrier', x: ptX + 0.025, height: 0.2 });
      push({ type: 'barrier', x: ptX + 0.015, height: 0.76 });
      push({ type: 'barrier', x: ptX + 0.025, height: 0.76 });
      // Hidden side exit (gap in right wall)
      // Orbs near the exit
      push({ type: 'orb', x: ptX + 0.03, height: 0.5, golden: true });
      push({ type: 'orb', x: ptX + 0.005, height: 0.5 });
      // Top path
      push({ type: 'orb', x: ptX + 0.02, height: 0.1 });
      // Exit
      push({ type: 'boost', x: ptX + 0.05, height: 0.5 });
    },
  },
  {
    name: 'ENCEINTE',
    threshold: 0.9461,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // ENCEINTE: enclosing main wall — continuous perimeter barrier
      const enX = 1.08;
      // Continuous perimeter (top, front, bottom, back)
      for (let et = 0; et < 10; et++) {
        push({ type: 'barrier', x: enX + et * 0.007, height: 0.28 });
      }
      for (let eb = 0; eb < 10; eb++) {
        push({ type: 'barrier', x: enX + eb * 0.007, height: 0.72 });
      }
      // Front and back walls with gates
      push({ type: 'barrier', x: enX, height: 0.38 });
      push({ type: 'barrier', x: enX, height: 0.62 });
      push({ type: 'barrier', x: enX + 0.063, height: 0.38 });
      push({ type: 'barrier', x: enX + 0.063, height: 0.62 });
      // Interior orbs
      for (let eo = 0; eo < 5; eo++) {
        push({ type: 'orb', x: enX + 0.01 + eo * 0.01, height: 0.5, golden: eo === 2 });
      }
      // Exit
      push({ type: 'boost', x: enX + 0.085, height: 0.5 });
    },
  },
  {
    name: 'CITADEL INNER',
    threshold: 0.9462,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // CITADEL INNER: inner citadel fortification — massive enclosed complex
      const ciX = 1.08;
      // Outer walls
      for (let ow = 0; ow < 10; ow++) {
        push({ type: 'barrier', x: ciX + ow * 0.008, height: 0.2 });
        push({ type: 'barrier', x: ciX + ow * 0.008, height: 0.8 });
      }
      // Inner walls
      for (let iw = 0; iw < 6; iw++) {
        push({ type: 'barrier', x: ciX + 0.02 + iw * 0.008, height: 0.35 });
        push({ type: 'barrier', x: ciX + 0.02 + iw * 0.008, height: 0.65 });
      }
      // Gate gaps
      push({ type: 'barrier', x: ciX, height: 0.4 });
      push({ type: 'barrier', x: ciX, height: 0.6 });
      // Inner sanctum orbs
      push({ type: 'orb', x: ciX + 0.04, height: 0.5, golden: true });
      push({ type: 'orb', x: ciX + 0.035, height: 0.45 });
      push({ type: 'orb', x: ciX + 0.045, height: 0.55 });
      // Outer orbs
      push({ type: 'orb', x: ciX + 0.01, height: 0.5 });
      push({ type: 'orb', x: ciX + 0.07, height: 0.5 });
      // Exit
      push({ type: 'boost', x: ciX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'REDAN DOUBLE',
    threshold: 0.9463,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // REDAN DOUBLE: two offset V-shaped projections
      const rd2X = 1.08;
      // First redan (upper)
      push({ type: 'barrier', x: rd2X, height: 0.35 });
      push({ type: 'barrier', x: rd2X + 0.01, height: 0.28 });
      push({ type: 'barrier', x: rd2X + 0.01, height: 0.42 });
      push({ type: 'barrier', x: rd2X + 0.02, height: 0.35 });
      // Second redan (lower, offset)
      push({ type: 'barrier', x: rd2X + 0.04, height: 0.6 });
      push({ type: 'barrier', x: rd2X + 0.05, height: 0.53 });
      push({ type: 'barrier', x: rd2X + 0.05, height: 0.67 });
      push({ type: 'barrier', x: rd2X + 0.06, height: 0.6 });
      // Orbs between redans
      push({ type: 'orb', x: rd2X + 0.03, height: 0.5, golden: true });
      push({ type: 'orb', x: rd2X + 0.015, height: 0.5 });
      push({ type: 'orb', x: rd2X + 0.045, height: 0.5 });
      // Exit
      push({ type: 'boost', x: rd2X + 0.08, height: 0.5 });
    },
  },
  {
    name: 'BARBETTE DOUBLE',
    threshold: 0.9464,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // BARBETTE DOUBLE: twin raised platforms — two elevated barrier shelves
      const bd2X = 1.08;
      // Platform 1 (upper)
      for (let p1 = 0; p1 < 5; p1++) {
        push({ type: 'barrier', x: bd2X + p1 * 0.008, height: 0.3 });
      }
      // Platform 2 (lower, offset)
      for (let p2 = 0; p2 < 5; p2++) {
        push({ type: 'barrier', x: bd2X + 0.05 + p2 * 0.008, height: 0.6 });
      }
      // Orbs between platforms
      push({ type: 'orb', x: bd2X + 0.035, height: 0.45, golden: true });
      push({ type: 'orb', x: bd2X + 0.02, height: 0.45 });
      push({ type: 'orb', x: bd2X + 0.065, height: 0.75 });
      // Above path
      push({ type: 'orb', x: bd2X + 0.04, height: 0.15 });
      // Exit
      push({ type: 'boost', x: bd2X + 0.1, height: 0.5 });
    },
  },
  {
    name: 'MURDER HOLE',
    threshold: 0.9465,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // MURDER HOLE: opening above gateway — barrier corridor with overhead gaps
      const mhX = 1.08;
      // Corridor walls
      for (let cw6 = 0; cw6 < 8; cw6++) {
        push({ type: 'barrier', x: mhX + cw6 * 0.008, height: 0.3 });
        push({ type: 'barrier', x: mhX + cw6 * 0.008, height: 0.7 });
      }
      // Murder holes (gaps in ceiling) — orbs drop through
      push({ type: 'orb', x: mhX + 0.02, height: 0.5 });
      push({ type: 'orb', x: mhX + 0.04, height: 0.5, golden: true });
      push({ type: 'orb', x: mhX + 0.055, height: 0.5 });
      // Exit
      push({ type: 'boost', x: mhX + 0.075, height: 0.5 });
    },
  },
  {
    name: 'REDOUBT STAR',
    threshold: 0.9466,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // REDOUBT STAR: star-shaped fortification — pointed barriers in star formation
      const rsX = 1.08;
      const rsCX = rsX + 0.04;
      const rsCY = 0.5;
      // Star points (5 points)
      for (let sp2 = 0; sp2 < 5; sp2++) {
        const spAng2 = (sp2 / 5) * Math.PI * 2 - Math.PI / 2;
        const spR2 = 0.12;
        const spx2 = rsCX + Math.cos(spAng2) * spR2 * 0.3;
        const spy2 = rsCY + Math.sin(spAng2) * spR2;
        push({ type: 'barrier', x: spx2, height: spy2 });
        // Inner point
        const inAng = spAng2 + Math.PI / 5;
        const inR = spR2 * 0.5;
        push({ type: 'barrier', x: rsCX + Math.cos(inAng) * inR * 0.3, height: rsCY + Math.sin(inAng) * inR });
      }
      // Orbs around the star
      push({ type: 'orb', x: rsCX, height: 0.5, golden: true });
      push({ type: 'orb', x: rsCX - 0.02, height: 0.5 });
      push({ type: 'orb', x: rsCX + 0.02, height: 0.5 });
      // Exit
      push({ type: 'boost', x: rsX + 0.09, height: 0.5 });
    },
  },
  {
    name: 'BRATTICE',
    threshold: 0.9467,
    minTime: 30,
    delay: 1,
    spawn: (push) => {
      // BRATTICE: wooden partition wall — thin vertical barrier with gaps
      const brX = 1.08;
      // Thin vertical partition
      for (let bv = 0; bv < 8; bv++) {
        push({ type: 'barrier', x: brX + 0.02, height: 0.2 + bv * 0.08 });
      }
      // Gaps at specific heights for passage
      // (skip barriers at heights 0.36 and 0.52 — they're naturally missing)
      // Orbs at gap positions
      push({ type: 'orb', x: brX + 0.025, height: 0.36, golden: true });
      push({ type: 'orb', x: brX + 0.025, height: 0.52 });
      // Before and after orbs
      push({ type: 'orb', x: brX + 0.005, height: 0.5 });
      push({ type: 'orb', x: brX + 0.04, height: 0.5 });
      // Exit
      push({ type: 'boost', x: brX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'HOARDINGS',
    threshold: 0.9468,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // HOARDINGS: wooden gallery atop wall — overhanging barrier shelf
      const hdX = 1.08;
      // Main wall
      for (let mw3 = 0; mw3 < 6; mw3++) {
        push({ type: 'barrier', x: hdX + mw3 * 0.01, height: 0.5 });
      }
      // Overhanging gallery (extends outward from wall top)
      for (let og = 0; og < 6; og++) {
        push({ type: 'barrier', x: hdX + og * 0.01, height: 0.38 });
      }
      // Gallery floor creates shelter below
      push({ type: 'orb', x: hdX + 0.025, height: 0.44, golden: true });
      // Above gallery
      push({ type: 'orb', x: hdX + 0.025, height: 0.25 });
      // Below wall
      push({ type: 'orb', x: hdX + 0.025, height: 0.65 });
      push({ type: 'orb', x: hdX + 0.04, height: 0.65 });
      // Exit
      push({ type: 'boost', x: hdX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'STOCKADE',
    threshold: 0.9469,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // STOCKADE: enclosing barrier fence — rectangular enclosure
      const stX = 1.08;
      // Full rectangular enclosure
      // Top wall
      for (let tw2 = 0; tw2 < 8; tw2++) {
        push({ type: 'barrier', x: stX + tw2 * 0.008, height: 0.3 });
      }
      // Bottom wall
      for (let bw2 = 0; bw2 < 8; bw2++) {
        push({ type: 'barrier', x: stX + bw2 * 0.008, height: 0.7 });
      }
      // Front wall (with gate)
      push({ type: 'barrier', x: stX, height: 0.4 });
      push({ type: 'barrier', x: stX, height: 0.6 });
      // Back wall (with gate)
      push({ type: 'barrier', x: stX + 0.056, height: 0.4 });
      push({ type: 'barrier', x: stX + 0.056, height: 0.6 });
      // Interior orbs
      push({ type: 'orb', x: stX + 0.02, height: 0.5 });
      push({ type: 'orb', x: stX + 0.03, height: 0.5, golden: true });
      push({ type: 'orb', x: stX + 0.04, height: 0.5 });
      // Exit
      push({ type: 'boost', x: stX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'BARBICAN GATE',
    threshold: 0.947,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // BARBICAN GATE: fortified gatehouse entrance — double gate with passage
      const bgX = 1.08;
      // Outer gate
      push({ type: 'barrier', x: bgX, height: 0.3 });
      push({ type: 'barrier', x: bgX, height: 0.7 });
      // Passage walls
      for (let pw2 = 0; pw2 < 5; pw2++) {
        push({ type: 'barrier', x: bgX + 0.01 + pw2 * 0.01, height: 0.25 });
        push({ type: 'barrier', x: bgX + 0.01 + pw2 * 0.01, height: 0.75 });
      }
      // Inner gate
      push({ type: 'barrier', x: bgX + 0.06, height: 0.35 });
      push({ type: 'barrier', x: bgX + 0.06, height: 0.65 });
      // Passage orbs
      for (let po2 = 0; po2 < 4; po2++) {
        push({ type: 'orb', x: bgX + 0.015 + po2 * 0.012, height: 0.5, golden: po2 === 2 });
      }
      // Exit
      push({ type: 'boost', x: bgX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'MANTLET',
    threshold: 0.9471,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // MANTLET: portable protective shield — moving barrier cover
      const mnX = 1.08;
      // Three shields in a row with gaps
      for (let ms = 0; ms < 3; ms++) {
        const msX = mnX + ms * 0.03;
        // Shield (3-barrier wide, 2-tall)
        for (let sw3 = 0; sw3 < 3; sw3++) {
          push({ type: 'barrier', x: msX + sw3 * 0.005, height: 0.42 });
          push({ type: 'barrier', x: msX + sw3 * 0.005, height: 0.52 });
        }
      }
      // Orbs in gaps between shields
      push({ type: 'orb', x: mnX + 0.02, height: 0.47, golden: true });
      push({ type: 'orb', x: mnX + 0.05, height: 0.47 });
      // Top and bottom paths
      push({ type: 'orb', x: mnX + 0.035, height: 0.25 });
      push({ type: 'orb', x: mnX + 0.035, height: 0.72 });
      // Exit
      push({ type: 'boost', x: mnX + 0.1, height: 0.47 });
    },
  },
  {
    name: 'CALTROP',
    threshold: 0.9472,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // CALTROP: scattered spike traps — random small barrier clusters
      const ctpX = 1.08;
      // Scattered caltrops (5 small spike clusters)
      for (let ct2 = 0; ct2 < 5; ct2++) {
        const ctx2 = ctpX + ct2 * 0.018 + Math.sin(ct2 * 2.3) * 0.003;
        const cty = 0.35 + Math.sin(ct2 * 1.7) * 0.15;
        // Each caltrop: 2 barriers in X pattern
        push({ type: 'barrier', x: ctx2, height: cty });
        push({ type: 'barrier', x: ctx2 + 0.004, height: cty + 0.06 });
      }
      // Orbs weaving between caltrops
      push({ type: 'orb', x: ctpX + 0.01, height: 0.55 });
      push({ type: 'orb', x: ctpX + 0.04, height: 0.65, golden: true });
      push({ type: 'orb', x: ctpX + 0.07, height: 0.45 });
      // Safe path at bottom
      push({ type: 'orb', x: ctpX + 0.04, height: 0.8 });
      // Exit
      push({ type: 'boost', x: ctpX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'TROU-DE-LOUP',
    threshold: 0.9473,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // TROU-DE-LOUP: wolf pit trap — circular barrier ring with central danger
      const tdlX = 1.08;
      // Circular pit (ring of barriers)
      for (let pr = 0; pr < 8; pr++) {
        const prAng = (pr / 8) * Math.PI * 2;
        const prx = tdlX + 0.03 + Math.cos(prAng) * 0.02;
        const pry = 0.5 + Math.sin(prAng) * 0.12;
        push({ type: 'barrier', x: prx, height: pry });
      }
      // Central spike
      push({ type: 'barrier', x: tdlX + 0.03, height: 0.5 });
      // Orbs surrounding the pit
      push({ type: 'orb', x: tdlX + 0.005, height: 0.5, golden: true });
      push({ type: 'orb', x: tdlX + 0.055, height: 0.5 });
      push({ type: 'orb', x: tdlX + 0.03, height: 0.3 });
      push({ type: 'orb', x: tdlX + 0.03, height: 0.7 });
      // Exit
      push({ type: 'boost', x: tdlX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'FRAISE',
    threshold: 0.9474,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // FRAISE: angled stake defense — diagonal barrier lines
      const frX = 1.08;
      // Angled stakes pointing outward
      for (let fs2 = 0; fs2 < 6; fs2++) {
        const fsX2 = frX + fs2 * 0.015;
        const fsH2 = 0.4 + (fs2 % 2) * 0.2; // Alternating heights
        push({ type: 'barrier', x: fsX2, height: fsH2 });
        // Angled extension
        push({ type: 'barrier', x: fsX2 + 0.005, height: fsH2 - 0.06 });
      }
      // Orbs between stakes
      push({ type: 'orb', x: frX + 0.008, height: 0.5 });
      push({ type: 'orb', x: frX + 0.038, height: 0.5, golden: true });
      push({ type: 'orb', x: frX + 0.068, height: 0.5 });
      // Top path
      push({ type: 'orb', x: frX + 0.04, height: 0.2 });
      // Exit
      push({ type: 'boost', x: frX + 0.1, height: 0.45 });
    },
  },
  {
    name: 'FASCINE',
    threshold: 0.9475,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // FASCINE: bundled branch obstacles — horizontal barrier stacks
      const fcX = 1.08;
      // Three bundles at different heights
      for (let bn = 0; bn < 3; bn++) {
        const bnY = 0.3 + bn * 0.15;
        const bnX = fcX + bn * 0.025;
        // Bundle (horizontal cluster of 3)
        for (let bh = 0; bh < 3; bh++) {
          push({ type: 'barrier', x: bnX + bh * 0.005, height: bnY });
        }
      }
      // Orbs between bundles
      push({ type: 'orb', x: fcX + 0.015, height: 0.38 });
      push({ type: 'orb', x: fcX + 0.04, height: 0.53, golden: true });
      // Safe passage above
      push({ type: 'orb', x: fcX + 0.035, height: 0.18 });
      // Safe passage below
      push({ type: 'orb', x: fcX + 0.035, height: 0.8 });
      // Exit
      push({ type: 'boost', x: fcX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'GABION',
    threshold: 0.9476,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // GABION: basket-filled earth barrier — clustered square barrier groups
      const gbX2 = 1.08;
      // Three gabion baskets
      for (let gb2 = 0; gb2 < 3; gb2++) {
        const gx = gbX2 + gb2 * 0.028;
        const gy = 0.45 + Math.sin(gb2 * 1.5) * 0.08;
        // Square basket outline
        push({ type: 'barrier', x: gx, height: gy });
        push({ type: 'barrier', x: gx + 0.01, height: gy });
        push({ type: 'barrier', x: gx, height: gy + 0.1 });
        push({ type: 'barrier', x: gx + 0.01, height: gy + 0.1 });
      }
      // Orbs between baskets
      push({ type: 'orb', x: gbX2 + 0.02, height: 0.5, golden: true });
      push({ type: 'orb', x: gbX2 + 0.048, height: 0.5 });
      // Below path
      push({ type: 'orb', x: gbX2 + 0.035, height: 0.75 });
      // Exit
      push({ type: 'boost', x: gbX2 + 0.1, height: 0.5 });
    },
  },
  {
    name: 'PALISADE',
    threshold: 0.9477,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // PALISADE: vertical stake fence — evenly spaced vertical barriers
      const plsX = 1.08;
      // Stakes at regular intervals
      for (let sk = 0; sk < 8; sk++) {
        const skX2 = plsX + sk * 0.012;
        // Each stake is a vertical column of 2-3 barriers
        const skH2 = 0.4 + Math.sin(sk * 1.5) * 0.08;
        push({ type: 'barrier', x: skX2, height: skH2 });
        push({ type: 'barrier', x: skX2, height: skH2 + 0.12 });
      }
      // Gaps between stakes for orbs
      for (let go2 = 0; go2 < 4; go2++) {
        push({ type: 'orb', x: plsX + 0.006 + go2 * 0.024, height: 0.7, golden: go2 === 2 });
      }
      // Exit
      push({ type: 'boost', x: plsX + 0.11, height: 0.5 });
    },
  },
  {
    name: 'CHEVAUX-DE-FRISE',
    threshold: 0.9478,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // CHEVAUX-DE-FRISE: spiked barrier obstacles — pointed barrier clusters
      const cdfX = 1.08;
      // Three spike clusters spaced apart
      for (let sc2 = 0; sc2 < 3; sc2++) {
        const scX2 = cdfX + sc2 * 0.03;
        // Central spike
        push({ type: 'barrier', x: scX2, height: 0.5 });
        // Radiating spikes
        push({ type: 'barrier', x: scX2 - 0.005, height: 0.4 });
        push({ type: 'barrier', x: scX2 + 0.005, height: 0.4 });
        push({ type: 'barrier', x: scX2 - 0.005, height: 0.6 });
        push({ type: 'barrier', x: scX2 + 0.005, height: 0.6 });
      }
      // Orbs between clusters
      push({ type: 'orb', x: cdfX + 0.015, height: 0.5, golden: true });
      push({ type: 'orb', x: cdfX + 0.045, height: 0.5 });
      // Safe bottom path
      push({ type: 'orb', x: cdfX + 0.03, height: 0.8 });
      // Exit
      push({ type: 'boost', x: cdfX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'ABATIS',
    threshold: 0.9479,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // ABATIS: felled tree obstruction — scattered diagonal barriers
      const abX = 1.08;
      // Scattered "tree trunk" barriers at various angles
      for (let tr2 = 0; tr2 < 6; tr2++) {
        const trX2 = abX + tr2 * 0.015 + Math.sin(tr2 * 2.1) * 0.005;
        const trH2 = 0.3 + Math.sin(tr2 * 1.7) * 0.15;
        push({ type: 'barrier', x: trX2, height: trH2 });
        push({ type: 'barrier', x: trX2 + 0.005, height: trH2 + 0.08 });
      }
      // Gaps with orbs
      push({ type: 'orb', x: abX + 0.01, height: 0.6 });
      push({ type: 'orb', x: abX + 0.04, height: 0.7, golden: true });
      push({ type: 'orb', x: abX + 0.07, height: 0.55 });
      // Exit boost
      push({ type: 'boost', x: abX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'EPAULEMENT',
    threshold: 0.948,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // EPAULEMENT: earthwork covering from flanking fire — angled shield barriers
      const epX = 1.08;
      // Angled earth mound (left side protection)
      for (let em = 0; em < 5; em++) {
        push({ type: 'barrier', x: epX + em * 0.008, height: 0.35 + em * 0.02 });
      }
      // Second mound (right side protection)
      for (let em2 = 0; em2 < 5; em2++) {
        push({ type: 'barrier', x: epX + 0.05 + em2 * 0.008, height: 0.45 - em2 * 0.02 });
      }
      // Protected area between mounds
      push({ type: 'orb', x: epX + 0.04, height: 0.5, golden: true });
      push({ type: 'orb', x: epX + 0.03, height: 0.55 });
      push({ type: 'orb', x: epX + 0.05, height: 0.55 });
      // Above/below paths
      push({ type: 'orb', x: epX + 0.04, height: 0.2 });
      push({ type: 'orb', x: epX + 0.04, height: 0.75 });
      // Exit
      push({ type: 'boost', x: epX + 0.1, height: 0.45 });
    },
  },
  {
    name: 'TRAVERSE',
    threshold: 0.9481,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // TRAVERSE: cross wall dividing rampart — vertical barrier cutting across path
      const tvX = 1.08;
      // Main horizontal rampart
      for (let rm = 0; rm < 10; rm++) {
        push({ type: 'barrier', x: tvX + rm * 0.008, height: 0.5 });
      }
      // Traverse (vertical cross wall)
      for (let tw = 0; tw < 4; tw++) {
        push({ type: 'barrier', x: tvX + 0.04, height: 0.3 + tw * 0.1 });
      }
      // Orbs in divided sections
      push({ type: 'orb', x: tvX + 0.02, height: 0.35 });
      push({ type: 'orb', x: tvX + 0.02, height: 0.65 });
      push({ type: 'orb', x: tvX + 0.06, height: 0.35, golden: true });
      push({ type: 'orb', x: tvX + 0.06, height: 0.65 });
      // Exit
      push({ type: 'boost', x: tvX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'GLACIS RAMP',
    threshold: 0.9482,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // GLACIS RAMP: sloping earth approach to wall — ascending barrier sequence
      const grX = 1.08;
      // Ascending slope (barriers getting higher)
      for (let as2 = 0; as2 < 8; as2++) {
        push({ type: 'barrier', x: grX + as2 * 0.01, height: 0.7 - as2 * 0.04 });
      }
      // Wall at top
      for (let wt4 = 0; wt4 < 3; wt4++) {
        push({ type: 'barrier', x: grX + 0.08, height: 0.35 + wt4 * 0.05 });
      }
      // Orbs along the ramp
      push({ type: 'orb', x: grX + 0.02, height: 0.55 });
      push({ type: 'orb', x: grX + 0.04, height: 0.48 });
      push({ type: 'orb', x: grX + 0.06, height: 0.4, golden: true });
      // Exit over the wall
      push({ type: 'boost', x: grX + 0.1, height: 0.3 });
      push({ type: 'orb', x: grX + 0.11, height: 0.5 });
    },
  },
  {
    name: 'COVERED WAY',
    threshold: 0.9483,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // COVERED WAY: sheltered path along ditch — narrow passage with roof barriers
      const cwpX = 1.08;
      // Roof line
      for (let rl = 0; rl < 10; rl++) {
        push({ type: 'barrier', x: cwpX + rl * 0.008, height: 0.35 });
      }
      // Floor line
      for (let frl = 0; frl < 10; frl++) {
        push({ type: 'barrier', x: cwpX + frl * 0.008, height: 0.65 });
      }
      // Orbs along the covered passage
      for (let po = 0; po < 6; po++) {
        push({ type: 'orb', x: cwpX + 0.008 + po * 0.012, height: 0.5, golden: po === 3 });
      }
      // Exit
      push({ type: 'boost', x: cwpX + 0.09, height: 0.5 });
    },
  },
  {
    name: 'BANQUETTE',
    threshold: 0.9484,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // BANQUETTE: firing step behind parapet — stepped barrier with rewards
      const bqX = 1.08;
      // Parapet (low front wall)
      for (let pw = 0; pw < 5; pw++) {
        push({ type: 'barrier', x: bqX + pw * 0.01, height: 0.45 });
      }
      // Step (slightly lower)
      for (let sw2 = 0; sw2 < 5; sw2++) {
        push({ type: 'barrier', x: bqX + sw2 * 0.01, height: 0.55 });
      }
      // Walking platform behind
      for (let wp = 0; wp < 5; wp++) {
        push({ type: 'barrier', x: bqX + wp * 0.01, height: 0.65 });
      }
      // Orbs in the gaps
      push({ type: 'orb', x: bqX + 0.025, height: 0.35, golden: true });
      push({ type: 'orb', x: bqX + 0.015, height: 0.5 });
      push({ type: 'orb', x: bqX + 0.035, height: 0.5 });
      // Below path
      push({ type: 'orb', x: bqX + 0.025, height: 0.8 });
      // Exit
      push({ type: 'boost', x: bqX + 0.07, height: 0.5 });
    },
  },
  {
    name: 'PLACE D\'ARMES',
    threshold: 0.9485,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // PLACE D'ARMES: assembly area inside fortification — open area surrounded by walls
      const paX = 1.08;
      // Surrounding walls (U-shape)
      for (let uw = 0; uw < 8; uw++) {
        push({ type: 'barrier', x: paX + uw * 0.01, height: 0.25 });
      }
      for (let bw = 0; bw < 8; bw++) {
        push({ type: 'barrier', x: paX + bw * 0.01, height: 0.75 });
      }
      // Front wall with gate
      push({ type: 'barrier', x: paX, height: 0.35 });
      push({ type: 'barrier', x: paX, height: 0.65 });
      // Open assembly area with rewards
      push({ type: 'orb', x: paX + 0.03, height: 0.4 });
      push({ type: 'orb', x: paX + 0.04, height: 0.5, golden: true });
      push({ type: 'orb', x: paX + 0.05, height: 0.6 });
      push({ type: 'orb', x: paX + 0.04, height: 0.35 });
      push({ type: 'orb', x: paX + 0.04, height: 0.65 });
      // Exit
      push({ type: 'boost', x: paX + 0.09, height: 0.5 });
    },
  },
  {
    name: 'FAUSSE-BRAIE',
    threshold: 0.9486,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // FAUSSE-BRAIE: low wall between ditch and main wall — double barrier rows
      const fbX = 1.08;
      // Low outer wall
      for (let lo = 0; lo < 7; lo++) {
        push({ type: 'barrier', x: fbX + lo * 0.009, height: 0.6 });
      }
      // Main wall (taller, behind)
      for (let mw2 = 0; mw2 < 7; mw2++) {
        push({ type: 'barrier', x: fbX + mw2 * 0.009, height: 0.4 });
      }
      // Passage between walls
      push({ type: 'orb', x: fbX + 0.02, height: 0.5 });
      push({ type: 'orb', x: fbX + 0.035, height: 0.5, golden: true });
      push({ type: 'orb', x: fbX + 0.05, height: 0.5 });
      // Top path
      push({ type: 'orb', x: fbX + 0.035, height: 0.25 });
      // Bottom path
      push({ type: 'orb', x: fbX + 0.035, height: 0.75 });
      // Exit
      push({ type: 'boost', x: fbX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'CAVALIER',
    threshold: 0.9487,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // CAVALIER: raised platform for gun emplacements — elevated barrier with rewards below
      const cvX = 1.08;
      // Elevated platform
      for (let ep = 0; ep < 8; ep++) {
        push({ type: 'barrier', x: cvX + ep * 0.008, height: 0.35 });
      }
      // Support pillars
      push({ type: 'barrier', x: cvX + 0.01, height: 0.45 });
      push({ type: 'barrier', x: cvX + 0.05, height: 0.45 });
      // Orbs under the platform
      for (let uo = 0; uo < 4; uo++) {
        push({ type: 'orb', x: cvX + 0.015 + uo * 0.012, height: 0.55 });
      }
      // Golden orb on top
      push({ type: 'orb', x: cvX + 0.032, height: 0.22, golden: true });
      // Exit
      push({ type: 'boost', x: cvX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'GORGE',
    threshold: 0.9488,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // GORGE: open rear of fortification — three-sided enclosure with open back
      const goX = 1.08;
      // Top wall
      for (let gt = 0; gt < 6; gt++) {
        push({ type: 'barrier', x: goX + gt * 0.01, height: 0.3 });
      }
      // Bottom wall
      for (let gb = 0; gb < 6; gb++) {
        push({ type: 'barrier', x: goX + gb * 0.01, height: 0.7 });
      }
      // Front closing wall
      push({ type: 'barrier', x: goX, height: 0.4 });
      push({ type: 'barrier', x: goX, height: 0.5 });
      push({ type: 'barrier', x: goX, height: 0.6 });
      // Interior treasure (accessible from the open gorge/rear)
      push({ type: 'orb', x: goX + 0.03, height: 0.5, golden: true });
      push({ type: 'orb', x: goX + 0.04, height: 0.42 });
      push({ type: 'orb', x: goX + 0.04, height: 0.58 });
      // Exit boost
      push({ type: 'boost', x: goX + 0.07, height: 0.5 });
    },
  },
  {
    name: 'COUVRE-FACE',
    threshold: 0.9489,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // COUVRE-FACE: covering face of fortification — low wall in front of bastion
      const cfX = 1.08;
      // Low covering wall
      for (let cv = 0; cv < 10; cv++) {
        push({ type: 'barrier', x: cfX + cv * 0.008, height: 0.55 });
      }
      // Taller bastion behind
      for (let bt = 0; bt < 4; bt++) {
        push({ type: 'barrier', x: cfX + 0.03 + bt * 0.01, height: 0.35 });
      }
      // Gap between walls for orbs
      push({ type: 'orb', x: cfX + 0.04, height: 0.45, golden: true });
      push({ type: 'orb', x: cfX + 0.02, height: 0.45 });
      // Path above
      push({ type: 'orb', x: cfX + 0.04, height: 0.2 });
      // Path below
      push({ type: 'orb', x: cfX + 0.04, height: 0.75 });
      // Exit
      push({ type: 'boost', x: cfX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'LUNETTE',
    threshold: 0.949,
    minTime: 30,
    delay: 1.2,
    spawn: (push) => {
      // LUNETTE: small two-faced fortification — twin wall segments with gap
      const lnX = 1.08;
      // Left face
      for (let lf = 0; lf < 4; lf++) {
        push({ type: 'barrier', x: lnX + lf * 0.008, height: 0.4 - lf * 0.03 });
      }
      // Right face
      for (let rf = 0; rf < 4; rf++) {
        push({ type: 'barrier', x: lnX + 0.04 + rf * 0.008, height: 0.28 + rf * 0.03 });
      }
      // Open gorge (rear) — safe passage
      // Interior orbs
      push({ type: 'orb', x: lnX + 0.03, height: 0.35, golden: true });
      push({ type: 'orb', x: lnX + 0.02, height: 0.5 });
      push({ type: 'orb', x: lnX + 0.05, height: 0.5 });
      // Below passage
      push({ type: 'orb', x: lnX + 0.035, height: 0.7 });
      // Exit
      push({ type: 'boost', x: lnX + 0.08, height: 0.4 });
    },
  },
  {
    name: 'REDAN',
    threshold: 0.9491,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // REDAN: V-shaped projection from main wall
      const rdnX = 1.08;
      // Main wall
      for (let mw = 0; mw < 6; mw++) {
        push({ type: 'barrier', x: rdnX + mw * 0.01, height: 0.5 });
      }
      // V projection outward
      for (let vp = 1; vp <= 3; vp++) {
        push({ type: 'barrier', x: rdnX + 0.03, height: 0.5 - vp * 0.06 });
        push({ type: 'barrier', x: rdnX + 0.03, height: 0.5 + vp * 0.06 });
      }
      // Orbs around the redan
      push({ type: 'orb', x: rdnX + 0.015, height: 0.3 });
      push({ type: 'orb', x: rdnX + 0.015, height: 0.7 });
      push({ type: 'orb', x: rdnX + 0.04, height: 0.5, golden: true });
      // Exit
      push({ type: 'boost', x: rdnX + 0.07, height: 0.5 });
    },
  },
  {
    name: 'RAVELIN DOUBLE',
    threshold: 0.9492,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // RAVELIN DOUBLE: two offset triangular outworks
      const rdblX = 1.08;
      // First ravelin (upper)
      push({ type: 'barrier', x: rdblX, height: 0.35 });
      push({ type: 'barrier', x: rdblX + 0.015, height: 0.25 });
      push({ type: 'barrier', x: rdblX + 0.015, height: 0.45 });
      push({ type: 'barrier', x: rdblX + 0.03, height: 0.35 });
      // Second ravelin (lower, offset)
      push({ type: 'barrier', x: rdblX + 0.04, height: 0.65 });
      push({ type: 'barrier', x: rdblX + 0.055, height: 0.55 });
      push({ type: 'barrier', x: rdblX + 0.055, height: 0.75 });
      push({ type: 'barrier', x: rdblX + 0.07, height: 0.65 });
      // Orbs between ravelins
      push({ type: 'orb', x: rdblX + 0.035, height: 0.5, golden: true });
      push({ type: 'orb', x: rdblX + 0.02, height: 0.35 });
      push({ type: 'orb', x: rdblX + 0.06, height: 0.65 });
      // Exit
      push({ type: 'boost', x: rdblX + 0.09, height: 0.5 });
    },
  },
  {
    name: 'DEMI-LUNE',
    threshold: 0.9493,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // DEMI-LUNE: half-moon shaped outwork — curved barrier arc with rewards
      const dlX = 1.08;
      // Curved arc of barriers (semicircle)
      for (let da = 0; da < 8; da++) {
        const daAng = Math.PI * 0.3 + (da / 7) * Math.PI * 0.4;
        const daR = 0.12;
        const dax = dlX + 0.03 + Math.cos(daAng) * daR * 0.5;
        const day = 0.5 + Math.sin(daAng) * daR * 2;
        push({ type: 'barrier', x: dax, height: day });
      }
      // Orbs inside the crescent
      push({ type: 'orb', x: dlX + 0.04, height: 0.5, golden: true });
      push({ type: 'orb', x: dlX + 0.035, height: 0.42 });
      push({ type: 'orb', x: dlX + 0.035, height: 0.58 });
      // Exit
      push({ type: 'boost', x: dlX + 0.08, height: 0.5 });
      push({ type: 'orb', x: dlX + 0.09, height: 0.45 });
      push({ type: 'orb', x: dlX + 0.09, height: 0.55 });
    },
  },
  {
    name: 'CROWNWORK',
    threshold: 0.9494,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CROWNWORK: crown-shaped fortification — alternating peaks and valleys
      const cwkX = 1.08;
      // Crown peaks (3 peaks)
      for (let pk = 0; pk < 3; pk++) {
        const pkX = cwkX + pk * 0.03;
        // Peak column
        for (let pc = 0; pc < 3; pc++) {
          push({ type: 'barrier', x: pkX + 0.01, height: 0.3 + pc * 0.08 });
        }
      }
      // Connecting walls between peaks
      for (let cw5 = 0; cw5 < 2; cw5++) {
        const cwX2 = cwkX + 0.02 + cw5 * 0.03;
        push({ type: 'barrier', x: cwX2, height: 0.5 });
      }
      // Orbs in the valleys between peaks
      push({ type: 'orb', x: cwkX + 0.025, height: 0.55, golden: true });
      push({ type: 'orb', x: cwkX + 0.055, height: 0.55 });
      // Top path
      push({ type: 'orb', x: cwkX + 0.04, height: 0.2 });
      // Exit
      push({ type: 'boost', x: cwkX + 0.1, height: 0.45 });
      push({ type: 'orb', x: cwkX + 0.11, height: 0.4 });
    },
  },
  {
    name: 'HORNWORK',
    threshold: 0.9495,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // HORNWORK: horn-shaped outwork — two demi-bastions connected by curtain
      const hwX = 1.08;
      // Left demi-bastion (angled wall)
      for (let lb = 0; lb < 4; lb++) {
        push({ type: 'barrier', x: hwX + lb * 0.008, height: 0.35 + lb * 0.03 });
      }
      // Curtain wall connecting
      for (let cw4 = 0; cw4 < 6; cw4++) {
        push({ type: 'barrier', x: hwX + 0.035 + cw4 * 0.008, height: 0.48 });
      }
      // Right demi-bastion (angled wall)
      for (let rb = 0; rb < 4; rb++) {
        push({ type: 'barrier', x: hwX + 0.08 + rb * 0.008, height: 0.48 - rb * 0.03 });
      }
      // Orbs in the enclosed area
      push({ type: 'orb', x: hwX + 0.04, height: 0.55 });
      push({ type: 'orb', x: hwX + 0.055, height: 0.55, golden: true });
      push({ type: 'orb', x: hwX + 0.07, height: 0.55 });
      // Above passage orbs
      push({ type: 'orb', x: hwX + 0.05, height: 0.25 });
      push({ type: 'boost', x: hwX + 0.12, height: 0.4 });
    },
  },
  {
    name: 'TENAILLE',
    threshold: 0.9496,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // TENAILLE: low outwork between bastions — V-shaped wall with orb rewards
      const tnX = 1.08;
      // V-shape left arm (descending)
      for (let tl = 0; tl < 5; tl++) {
        push({ type: 'barrier', x: tnX + tl * 0.01, height: 0.3 + tl * 0.04 });
      }
      // V-shape right arm (ascending)
      for (let tr = 0; tr < 5; tr++) {
        push({ type: 'barrier', x: tnX + 0.05 + tr * 0.01, height: 0.5 - tr * 0.04 });
      }
      // Orbs in the V valley
      push({ type: 'orb', x: tnX + 0.04, height: 0.52 });
      push({ type: 'orb', x: tnX + 0.05, height: 0.52, golden: true });
      push({ type: 'orb', x: tnX + 0.06, height: 0.52 });
      // Top path orbs
      push({ type: 'orb', x: tnX + 0.025, height: 0.2 });
      push({ type: 'orb', x: tnX + 0.075, height: 0.2 });
      // Exit
      push({ type: 'boost', x: tnX + 0.11, height: 0.4 });
    },
  },
  {
    name: 'COUNTERSCARP',
    threshold: 0.9497,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // COUNTERSCARP: outer wall of defensive ditch — sloped barrier with gaps
      const csX = 1.08;
      // Sloped wall (lower on left, higher on right)
      for (let cw2 = 0; cw2 < 7; cw2++) {
        push({ type: 'barrier', x: csX + cw2 * 0.01, height: 0.7 - cw2 * 0.04 });
      }
      // Ditch bottom orbs
      for (let db = 0; db < 3; db++) {
        push({ type: 'orb', x: csX + 0.02 + db * 0.015, height: 0.8 });
      }
      // Top passage
      push({ type: 'orb', x: csX + 0.035, height: 0.3, golden: true });
      // Exit boost
      push({ type: 'boost', x: csX + 0.08, height: 0.5 });
      push({ type: 'orb', x: csX + 0.09, height: 0.45 });
      push({ type: 'orb', x: csX + 0.09, height: 0.55 });
    },
  },
  {
    name: 'CAPONIER',
    threshold: 0.9498,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // CAPONIER: covered passageway across ditch — tunnel with barriers above/below
      const cpnX = 1.08;
      // Ceiling barriers
      for (let cc = 0; cc < 8; cc++) {
        push({ type: 'barrier', x: cpnX + cc * 0.01, height: 0.3 });
      }
      // Floor barriers
      for (let cf2 = 0; cf2 < 8; cf2++) {
        push({ type: 'barrier', x: cpnX + cf2 * 0.01, height: 0.7 });
      }
      // Safe passage through the middle with orbs
      for (let cp2 = 0; cp2 < 5; cp2++) {
        push({ type: 'orb', x: cpnX + 0.01 + cp2 * 0.015, height: 0.5, golden: cp2 === 2 });
      }
      // Exit
      push({ type: 'boost', x: cpnX + 0.09, height: 0.5 });
    },
  },
  {
    name: 'FLECHE',
    threshold: 0.9499,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // FLECHE: arrow-shaped outwork — pointed triangular formation
      const flX = 1.08;
      // Arrow point
      push({ type: 'barrier', x: flX, height: 0.5 });
      // Expanding sides
      for (let fs = 1; fs <= 4; fs++) {
        push({ type: 'barrier', x: flX + fs * 0.012, height: 0.5 - fs * 0.06 });
        push({ type: 'barrier', x: flX + fs * 0.012, height: 0.5 + fs * 0.06 });
      }
      // Orbs along the center channel
      for (let fo = 0; fo < 3; fo++) {
        push({ type: 'orb', x: flX + 0.005 + fo * 0.015, height: 0.5, golden: fo === 2 });
      }
      // Exit rewards
      push({ type: 'boost', x: flX + 0.065, height: 0.5 });
      push({ type: 'orb', x: flX + 0.08, height: 0.35 });
      push({ type: 'orb', x: flX + 0.08, height: 0.65 });
    },
  },
  {
    name: 'REDOUBT',
    threshold: 0.95,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // REDOUBT: temporary defensive fortification — small enclosed work
      const rdX = 1.08;
      // Square enclosure walls
      for (let rw = 0; rw < 5; rw++) {
        push({ type: 'barrier', x: rdX + rw * 0.012, height: 0.35 });
        push({ type: 'barrier', x: rdX + rw * 0.012, height: 0.65 });
      }
      // Side walls
      push({ type: 'barrier', x: rdX, height: 0.45 });
      push({ type: 'barrier', x: rdX, height: 0.55 });
      push({ type: 'barrier', x: rdX + 0.048, height: 0.45 });
      push({ type: 'barrier', x: rdX + 0.048, height: 0.55 });
      // Treasure inside
      push({ type: 'orb', x: rdX + 0.024, height: 0.5, golden: true });
      push({ type: 'orb', x: rdX + 0.015, height: 0.5 });
      push({ type: 'orb', x: rdX + 0.033, height: 0.5 });
      // Exit
      push({ type: 'boost', x: rdX + 0.07, height: 0.5 });
    },
  },
  {
    name: 'SCARP',
    threshold: 0.9501,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // SCARP: steep cliff face with ledges — vertical barrier wall with safe ledges
      const scX = 1.08;
      // Main cliff face (vertical)
      for (let cf = 0; cf < 10; cf++) {
        push({ type: 'barrier', x: scX, height: 0.15 + cf * 0.07 });
      }
      // Ledge gaps with orbs
      push({ type: 'orb', x: scX + 0.015, height: 0.3 });
      push({ type: 'orb', x: scX + 0.015, height: 0.55, golden: true });
      push({ type: 'orb', x: scX + 0.015, height: 0.8 });
      // Second shorter cliff
      for (let cf2 = 0; cf2 < 5; cf2++) {
        push({ type: 'barrier', x: scX + 0.04, height: 0.35 + cf2 * 0.07 });
      }
      // Exit boost between cliffs
      push({ type: 'boost', x: scX + 0.06, height: 0.5 });
      for (let se = 0; se < 3; se++) {
        push({ type: 'orb', x: scX + 0.07 + se * 0.015, height: 0.45 + se * 0.1 });
      }
    },
  },
  {
    name: 'BARBETTE',
    threshold: 0.9502,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // BARBETTE: raised gun platform — elevated barrier platform with orb rewards
      const bbX = 1.08;
      // Raised platform base
      for (let bp = 0; bp < 8; bp++) {
        push({ type: 'barrier', x: bbX + bp * 0.01, height: 0.6 });
      }
      // Elevated gun mount
      for (let gm = 0; gm < 3; gm++) {
        push({ type: 'barrier', x: bbX + 0.03 + gm * 0.01, height: 0.45 });
      }
      // Parapet walls
      push({ type: 'barrier', x: bbX, height: 0.45 });
      push({ type: 'barrier', x: bbX + 0.07, height: 0.45 });
      // Orbs above and below platform
      push({ type: 'orb', x: bbX + 0.035, height: 0.3, golden: true });
      push({ type: 'orb', x: bbX + 0.02, height: 0.75 });
      push({ type: 'orb', x: bbX + 0.05, height: 0.75 });
      // Exit boost
      push({ type: 'boost', x: bbX + 0.09, height: 0.55 });
    },
  },
  {
    name: 'CURTAIN TOWER',
    threshold: 0.9503,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // CURTAIN TOWER: tall curtain wall section with integrated watch tower
      const ctX3 = 1.08;
      // Curtain wall section
      for (let cw3 = 0; cw3 < 6; cw3++) {
        push({ type: 'barrier', x: ctX3 + cw3 * 0.01, height: 0.5 });
      }
      // Watch tower (wider, taller)
      for (let wt3 = 0; wt3 < 5; wt3++) {
        push({ type: 'barrier', x: ctX3 + 0.03, height: 0.25 + wt3 * 0.08 });
      }
      push({ type: 'barrier', x: ctX3 + 0.04, height: 0.25 });
      push({ type: 'barrier', x: ctX3 + 0.04, height: 0.57 });
      // Orbs near tower gaps
      push({ type: 'orb', x: ctX3 + 0.035, height: 0.62, golden: true });
      push({ type: 'orb', x: ctX3 + 0.015, height: 0.42 });
      // Exit
      push({ type: 'boost', x: ctX3 + 0.06, height: 0.5 });
      for (let ce = 0; ce < 2; ce++) {
        push({ type: 'orb', x: ctX3 + 0.07 + ce * 0.012, height: 0.5 });
      }
    },
  },
  {
    name: 'CRENEL',
    threshold: 0.9504,
    minTime: 25,
    delay: 1.1,
    spawn: (push) => {
      // CRENEL: gap between merlons with orbs and flanking walls
      const cnX = 1.12;
      // Left merlon
      for (let cm = 0; cm < 3; cm++) {
        push({ type: 'barrier', x: cnX, height: 0.3 + cm * 0.08 });
      }
      // Right merlon
      for (let cm2 = 0; cm2 < 3; cm2++) {
        push({ type: 'barrier', x: cnX + 0.03, height: 0.3 + cm2 * 0.08 });
      }
      // Base wall connecting them
      push({ type: 'barrier', x: cnX + 0.015, height: 0.48 });
      // Orbs in the crenel gap (above base)
      push({ type: 'orb', x: cnX + 0.015, height: 0.35, golden: true });
      push({ type: 'orb', x: cnX + 0.015, height: 0.4 });
      // Below base orbs
      push({ type: 'orb', x: cnX + 0.015, height: 0.55 });
      push({ type: 'boost', x: cnX + 0.05, height: 0.5 });
    },
  },
  {
    name: 'LOOPHOLE',
    threshold: 0.9505,
    minTime: 20,
    delay: 1.2,
    spawn: (push) => {
      // LOOPHOLE: small circular openings in wall for threading through
      const lpX = 1.1;
      // Thick wall
      for (let lw = 0; lw < 3; lw++) {
        for (let lh = 0; lh < 6; lh++) {
          const lpH = 0.2 + lh * 0.12;
          // Skip positions to create circular holes
          if ((lw === 1 && lh === 1) || (lw === 1 && lh === 3)) continue;
          push({ type: 'barrier', x: lpX + lw * 0.01, height: lpH });
        }
      }
      // Orbs in the loopholes
      push({ type: 'orb', x: lpX + 0.01, height: 0.32, golden: true });
      push({ type: 'orb', x: lpX + 0.01, height: 0.56 });
      // Exit
      push({ type: 'boost', x: lpX + 0.04, height: 0.5 });
    },
  },
  {
    name: 'EMBRASURE',
    threshold: 0.9506,
    minTime: 25,
    delay: 1.2,
    spawn: (push) => {
      // EMBRASURE: splayed wall opening with orbs inside
      const emX = 1.12;
      // Wall sections
      for (let ew = 0; ew < 3; ew++) {
        push({ type: 'barrier', x: emX, height: 0.25 + ew * 0.08 });
      }
      for (let ew2 = 0; ew2 < 3; ew2++) {
        push({ type: 'barrier', x: emX, height: 0.6 + ew2 * 0.08 });
      }
      // Splayed opening (wider inside than outside)
      push({ type: 'barrier', x: emX + 0.01, height: 0.42 });
      push({ type: 'barrier', x: emX + 0.01, height: 0.58 });
      push({ type: 'barrier', x: emX + 0.025, height: 0.38 });
      push({ type: 'barrier', x: emX + 0.025, height: 0.62 });
      // Orbs in the opening
      push({ type: 'orb', x: emX + 0.015, height: 0.5, golden: true });
      push({ type: 'orb', x: emX + 0.03, height: 0.5 });
      push({ type: 'boost', x: emX + 0.05, height: 0.5 });
    },
  },
  {
    name: 'MACHICOLATION',
    threshold: 0.9507,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // MACHICOLATION: overhanging parapet with drop holes and treasure
      const mcX = 1.1;
      // Wall base
      for (let mw2 = 0; mw2 < 6; mw2++) {
        push({ type: 'barrier', x: mcX + mw2 * 0.01, height: 0.45 });
      }
      // Overhanging parapet (extends forward)
      push({ type: 'barrier', x: mcX - 0.005, height: 0.38 });
      push({ type: 'barrier', x: mcX + 0.06, height: 0.38 });
      // Drop holes (gaps in overhang — orbs fall through)
      push({ type: 'orb', x: mcX + 0.02, height: 0.52 });
      push({ type: 'orb', x: mcX + 0.04, height: 0.52, golden: true });
      // Below wall orbs
      push({ type: 'orb', x: mcX + 0.03, height: 0.65 });
      // Exit
      push({ type: 'boost', x: mcX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'MERLON',
    threshold: 0.9508,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // MERLON: tooth-shaped wall protrusions with reward gaps
      const mrX = 1.1;
      // Base wall
      for (let mb = 0; mb < 8; mb++) {
        push({ type: 'barrier', x: mrX + mb * 0.01, height: 0.5 });
      }
      // Merlons (teeth on top and bottom)
      for (let mm = 0; mm < 4; mm++) {
        push({ type: 'barrier', x: mrX + mm * 0.02, height: 0.4 });
        push({ type: 'barrier', x: mrX + mm * 0.02, height: 0.6 });
      }
      // Orbs in the crenel gaps (between teeth)
      for (let mc = 0; mc < 3; mc++) {
        push({ type: 'orb', x: mrX + 0.01 + mc * 0.02, height: 0.42, golden: mc === 1 });
      }
      push({ type: 'boost', x: mrX + 0.09, height: 0.5 });
    },
  },
  {
    name: 'BATTLEMENT TOWER',
    threshold: 0.9509,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // BATTLEMENT TOWER: tall tower with crenelated top and orb prizes
      const btX2 = 1.12;
      // Tower body
      for (let bt2 = 0; bt2 < 6; bt2++) {
        push({ type: 'barrier', x: btX2, height: 0.3 + bt2 * 0.07 });
      }
      push({ type: 'barrier', x: btX2 + 0.015, height: 0.3 });
      push({ type: 'barrier', x: btX2 + 0.015, height: 0.65 });
      // Crenelated top (alternating)
      push({ type: 'barrier', x: btX2 - 0.005, height: 0.25 });
      push({ type: 'barrier', x: btX2 + 0.02, height: 0.25 });
      // Orbs between crenelations
      push({ type: 'orb', x: btX2 + 0.007, height: 0.25, golden: true });
      // Side orbs at tower base
      push({ type: 'orb', x: btX2 + 0.025, height: 0.5 });
      push({ type: 'orb', x: btX2 + 0.035, height: 0.5 });
      push({ type: 'boost', x: btX2 + 0.05, height: 0.5 });
    },
  },
  {
    name: 'POSTERN GATE',
    threshold: 0.951,
    minTime: 20,
    delay: 1.1,
    spawn: (push) => {
      // POSTERN GATE: small side entrance in fortification wall
      const pgX = 1.12;
      // Wall with small side gate
      for (let pw2 = 0; pw2 < 5; pw2++) {
        if (pw2 === 3) continue; // gate gap
        push({ type: 'barrier', x: pgX, height: 0.25 + pw2 * 0.12 });
      }
      // Gate frame
      push({ type: 'barrier', x: pgX + 0.01, height: 0.56 });
      // Orbs through gate
      push({ type: 'orb', x: pgX + 0.005, height: 0.62, golden: true });
      push({ type: 'orb', x: pgX + 0.02, height: 0.6 });
      push({ type: 'boost', x: pgX + 0.04, height: 0.5 });
    },
  },
  {
    name: 'CURTAIN WALL',
    threshold: 0.9511,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // CURTAIN WALL: continuous defensive wall with periodic tower bumps
      const cwX2 = 1.08;
      // Long continuous wall
      for (let cw2 = 0; cw2 < 10; cw2++) {
        push({ type: 'barrier', x: cwX2 + cw2 * 0.01, height: 0.5 });
      }
      // Tower bumps (wider at intervals)
      for (let ct2 = 0; ct2 < 3; ct2++) {
        const ctX2 = cwX2 + ct2 * 0.035;
        push({ type: 'barrier', x: ctX2, height: 0.42 });
        push({ type: 'barrier', x: ctX2, height: 0.58 });
      }
      // Orbs in gaps between towers
      push({ type: 'orb', x: cwX2 + 0.018, height: 0.35 });
      push({ type: 'orb', x: cwX2 + 0.053, height: 0.65, golden: true });
      // Exit
      push({ type: 'boost', x: cwX2 + 0.11, height: 0.5 });
      for (let cr2 = 0; cr2 < 2; cr2++) {
        push({ type: 'orb', x: cwX2 + 0.12 + cr2 * 0.012, height: 0.5 });
      }
    },
  },
  {
    name: 'BAILEY',
    threshold: 0.9512,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // BAILEY: castle courtyard enclosed by walls with treasure center
      const byX = 1.08;
      // Outer walls (rectangle)
      for (let bw2 = 0; bw2 < 8; bw2++) {
        push({ type: 'barrier', x: byX + bw2 * 0.01, height: 0.3 });
        push({ type: 'barrier', x: byX + bw2 * 0.01, height: 0.7 });
      }
      // Side walls
      push({ type: 'barrier', x: byX, height: 0.5 });
      push({ type: 'barrier', x: byX + 0.07, height: 0.5 });
      // Entry gate (gap)
      // Courtyard treasure
      push({ type: 'orb', x: byX + 0.03, height: 0.45 });
      push({ type: 'orb', x: byX + 0.04, height: 0.5, golden: true });
      push({ type: 'orb', x: byX + 0.03, height: 0.55 });
      // Exit and reward
      push({ type: 'boost', x: byX + 0.09, height: 0.5 });
      for (let br3 = 0; br3 < 3; br3++) {
        push({ type: 'orb', x: byX + 0.1 + br3 * 0.012, height: 0.5 });
      }
    },
  },
  {
    name: 'OUBLIETTE',
    threshold: 0.9513,
    minTime: 35,
    delay: 1.4,
    spawn: (push) => {
      // OUBLIETTE: deep pit trap with treasure at bottom
      const ouX = 1.1;
      // Pit opening (barrier walls on sides, open top)
      push({ type: 'barrier', x: ouX, height: 0.35 });
      push({ type: 'barrier', x: ouX + 0.03, height: 0.35 });
      // Deep shaft walls
      for (let op = 0; op < 5; op++) {
        push({ type: 'barrier', x: ouX, height: 0.4 + op * 0.08 });
        push({ type: 'barrier', x: ouX + 0.03, height: 0.4 + op * 0.08 });
      }
      // Pit bottom
      push({ type: 'barrier', x: ouX + 0.01, height: 0.82 });
      push({ type: 'barrier', x: ouX + 0.02, height: 0.82 });
      // Treasure falling down pit
      push({ type: 'orb', x: ouX + 0.015, height: 0.5, golden: true });
      push({ type: 'orb', x: ouX + 0.015, height: 0.65 });
      // Escape boost above
      push({ type: 'boost', x: ouX + 0.015, height: 0.3 });
      push({ type: 'orb', x: ouX + 0.05, height: 0.5 });
    },
  },
  {
    name: 'GLACIS',
    threshold: 0.9514,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // GLACIS: sloping approach ramp leading up to fortress wall
      const glX2 = 1.08;
      // Slope (ascending barrier steps)
      for (let gs = 0; gs < 5; gs++) {
        push({ type: 'barrier', x: glX2 + gs * 0.012, height: 0.7 - gs * 0.08 });
      }
      // Wall at top of slope
      for (let gw2 = 0; gw2 < 3; gw2++) {
        push({ type: 'barrier', x: glX2 + 0.06, height: 0.25 + gw2 * 0.1 });
      }
      // Orbs along the slope
      for (let go2 = 0; go2 < 4; go2++) {
        push({ type: 'orb', x: glX2 + 0.006 + go2 * 0.012, height: 0.65 - go2 * 0.08, golden: go2 === 2 });
      }
      // Reward over the wall
      push({ type: 'boost', x: glX2 + 0.08, height: 0.5 });
      push({ type: 'orb', x: glX2 + 0.09, height: 0.5 });
    },
  },
  {
    name: 'RAVELIN',
    threshold: 0.9515,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // RAVELIN: triangular outwork protecting curtain wall
      const rvX = 1.08;
      // Triangle point (barriers forming V)
      push({ type: 'barrier', x: rvX, height: 0.5 });
      push({ type: 'barrier', x: rvX + 0.015, height: 0.4 });
      push({ type: 'barrier', x: rvX + 0.015, height: 0.6 });
      push({ type: 'barrier', x: rvX + 0.03, height: 0.3 });
      push({ type: 'barrier', x: rvX + 0.03, height: 0.7 });
      // Curtain wall behind
      for (let rv2 = 0; rv2 < 4; rv2++) {
        push({ type: 'barrier', x: rvX + 0.05, height: 0.3 + rv2 * 0.12 });
      }
      // Orbs in the V-shaped space
      push({ type: 'orb', x: rvX + 0.015, height: 0.5 });
      push({ type: 'orb', x: rvX + 0.03, height: 0.5, golden: true });
      // Escape
      push({ type: 'boost', x: rvX + 0.07, height: 0.5 });
      for (let rr = 0; rr < 2; rr++) {
        push({ type: 'orb', x: rvX + 0.08 + rr * 0.012, height: 0.5 });
      }
    },
  },
  {
    name: 'DRAWBRIDGE TOWER',
    threshold: 0.9516,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // DRAWBRIDGE TOWER: tower with integrated drawbridge mechanism
      const dtX = 1.1;
      // Tower body
      for (let dt2 = 0; dt2 < 5; dt2++) {
        push({ type: 'barrier', x: dtX, height: 0.25 + dt2 * 0.1 });
      }
      // Bridge arm (extends right, raised position)
      push({ type: 'barrier', x: dtX + 0.012, height: 0.28 });
      push({ type: 'barrier', x: dtX + 0.024, height: 0.32 });
      // Chain mechanism
      push({ type: 'barrier', x: dtX + 0.012, height: 0.22 });
      // Orbs on the bridge path
      for (let db2 = 0; db2 < 3; db2++) {
        push({ type: 'orb', x: dtX + 0.015 + db2 * 0.012, height: 0.5 + db2 * 0.04, golden: db2 === 1 });
      }
      // Exit boost
      push({ type: 'boost', x: dtX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'PILLBOX',
    threshold: 0.9517,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // PILLBOX: low reinforced bunker with narrow firing slits
      const pbX2 = 1.1;
      // Bunker roof
      for (let br2 = 0; br2 < 6; br2++) {
        push({ type: 'barrier', x: pbX2 + br2 * 0.01, height: 0.4 });
      }
      // Bunker floor
      for (let bf = 0; bf < 6; bf++) {
        push({ type: 'barrier', x: pbX2 + bf * 0.01, height: 0.6 });
      }
      // Firing slits (gaps with orbs)
      push({ type: 'orb', x: pbX2 + 0.015, height: 0.5 });
      push({ type: 'orb', x: pbX2 + 0.035, height: 0.5, golden: true });
      // Side walls
      push({ type: 'barrier', x: pbX2, height: 0.5 });
      push({ type: 'barrier', x: pbX2 + 0.05, height: 0.5 });
      // Exit
      push({ type: 'boost', x: pbX2 + 0.07, height: 0.5 });
      for (let pe = 0; pe < 2; pe++) {
        push({ type: 'orb', x: pbX2 + 0.08 + pe * 0.012, height: 0.5 });
      }
    },
  },
  {
    name: 'PORTHOLE',
    threshold: 0.9518,
    minTime: 20,
    delay: 1.2,
    spawn: (push) => {
      // PORTHOLE: circular barrier ring with central golden orb
      const phX2 = 1.12;
      const phCH = 0.5;
      const phSegs2 = 8;
      // Ring of barriers
      for (let ph = 0; ph < phSegs2; ph++) {
        const phAng = (ph / phSegs2) * Math.PI * 2;
        const phBx = phX2 + Math.cos(phAng) * 0.02;
        const phBy = phCH + Math.sin(phAng) * 0.12;
        push({ type: 'barrier', x: phBx, height: phBy });
      }
      // Central golden orb
      push({ type: 'orb', x: phX2, height: phCH, golden: true });
      // Exit orbs
      push({ type: 'orb', x: phX2 + 0.04, height: phCH });
      push({ type: 'boost', x: phX2 + 0.06, height: phCH });
    },
  },
  {
    name: 'WATCHTOWER PAIR',
    threshold: 0.9519,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // WATCHTOWER PAIR: two watchtowers flanking central path
      const wpX = 1.1;
      // Left tower
      for (let wt = 0; wt < 4; wt++) {
        push({ type: 'barrier', x: wpX, height: 0.2 + wt * 0.07 });
      }
      push({ type: 'barrier', x: wpX + 0.01, height: 0.2 });
      // Right tower
      for (let wt2 = 0; wt2 < 4; wt2++) {
        push({ type: 'barrier', x: wpX + 0.04, height: 0.55 + wt2 * 0.07 });
      }
      push({ type: 'barrier', x: wpX + 0.05, height: 0.8 });
      // Path between towers with orbs
      for (let wo2 = 0; wo2 < 3; wo2++) {
        push({ type: 'orb', x: wpX + 0.02 + wo2 * 0.008, height: 0.5 + wo2 * 0.03, golden: wo2 === 1 });
      }
      push({ type: 'boost', x: wpX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'BASTION',
    threshold: 0.952,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // BASTION: angular fortification with pointed walls and defensive orbs
      const bsX = 1.1;
      const bsCH = 0.5;
      // Diamond/pointed wall (angular barriers)
      push({ type: 'barrier', x: bsX, height: bsCH });
      push({ type: 'barrier', x: bsX + 0.015, height: bsCH - 0.15 });
      push({ type: 'barrier', x: bsX + 0.015, height: bsCH + 0.15 });
      push({ type: 'barrier', x: bsX + 0.03, height: bsCH - 0.2 });
      push({ type: 'barrier', x: bsX + 0.03, height: bsCH + 0.2 });
      push({ type: 'barrier', x: bsX + 0.045, height: bsCH - 0.15 });
      push({ type: 'barrier', x: bsX + 0.045, height: bsCH + 0.15 });
      push({ type: 'barrier', x: bsX + 0.06, height: bsCH });
      // Defensive orbs in safe zones
      push({ type: 'orb', x: bsX + 0.015, height: bsCH });
      push({ type: 'orb', x: bsX + 0.045, height: bsCH, golden: true });
      // Exit
      push({ type: 'boost', x: bsX + 0.08, height: bsCH });
    },
  },
  {
    name: 'RAMPART WALK',
    threshold: 0.9521,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // RAMPART WALK: walkway along top of wall with parapet barriers
      const rwX = 1.08;
      // Wall base (continuous)
      for (let rw2 = 0; rw2 < 10; rw2++) {
        push({ type: 'barrier', x: rwX + rw2 * 0.01, height: 0.55 });
      }
      // Parapet (alternating merlons on walkway level)
      for (let rp = 0; rp < 5; rp++) {
        push({ type: 'barrier', x: rwX + rp * 0.02, height: 0.45 });
      }
      // Orbs on the walkway (in crenel gaps)
      for (let ro = 0; ro < 4; ro++) {
        push({ type: 'orb', x: rwX + 0.01 + ro * 0.02, height: 0.48, golden: ro === 2 });
      }
      // Reward at end
      push({ type: 'boost', x: rwX + 0.11, height: 0.5 });
    },
  },
  {
    name: 'CATAPULT SIEGE',
    threshold: 0.9522,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // CATAPULT SIEGE: siege catapult launching arc of projectiles and orbs
      const csX2 = 1.1;
      // Catapult frame
      push({ type: 'barrier', x: csX2, height: 0.6 });
      push({ type: 'barrier', x: csX2 + 0.01, height: 0.6 });
      push({ type: 'barrier', x: csX2 + 0.005, height: 0.55 });
      // Arm
      push({ type: 'barrier', x: csX2 + 0.01, height: 0.45 });
      // Projectile arc (barriers and orbs mixed)
      for (let ca = 0; ca < 7; ca++) {
        const caT = ca / 6;
        const caXp = csX2 + 0.02 + caT * 0.08;
        const caYp = 0.45 - Math.sin(caT * Math.PI) * 0.25;
        if (ca % 2 === 0) {
          push({ type: 'barrier', x: caXp, height: caYp });
        } else {
          push({ type: 'orb', x: caXp, height: caYp, golden: ca === 3 });
        }
      }
      push({ type: 'boost', x: csX2 + 0.12, height: 0.5 });
    },
  },
  {
    name: 'CRYPT',
    threshold: 0.9523,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // CRYPT: underground burial chamber with sarcophagus treasure
      const crX2 = 1.08;
      // Chamber ceiling
      for (let cc = 0; cc < 7; cc++) {
        push({ type: 'barrier', x: crX2 + cc * 0.01, height: 0.3 });
      }
      // Chamber floor
      for (let cf = 0; cf < 7; cf++) {
        push({ type: 'barrier', x: crX2 + cf * 0.01, height: 0.72 });
      }
      // Sarcophagus (central barrier box)
      push({ type: 'barrier', x: crX2 + 0.025, height: 0.55 });
      push({ type: 'barrier', x: crX2 + 0.025, height: 0.6 });
      push({ type: 'barrier', x: crX2 + 0.045, height: 0.55 });
      push({ type: 'barrier', x: crX2 + 0.045, height: 0.6 });
      // Treasure atop sarcophagus
      push({ type: 'orb', x: crX2 + 0.035, height: 0.45, golden: true });
      // Side alcove orbs
      push({ type: 'orb', x: crX2 + 0.01, height: 0.5 });
      push({ type: 'orb', x: crX2 + 0.06, height: 0.5 });
      push({ type: 'boost', x: crX2 + 0.08, height: 0.5 });
    },
  },
  {
    name: 'ARROW SLIT',
    threshold: 0.9524,
    minTime: 20,
    delay: 1.3,
    spawn: (push) => {
      // ARROW SLIT: narrow vertical gaps in thick wall for threading through
      const asX2 = 1.1;
      // Thick wall sections with narrow gaps
      for (let aw2 = 0; aw2 < 3; aw2++) {
        const awBx = asX2 + aw2 * 0.025;
        // Wall above
        for (let awu = 0; awu < 3; awu++) {
          push({ type: 'barrier', x: awBx, height: 0.2 + awu * 0.08 });
        }
        // Wall below (offset gap for each column)
        const awGap = 0.45 + aw2 * 0.08;
        for (let awl = 0; awl < 3; awl++) {
          push({ type: 'barrier', x: awBx, height: awGap + 0.1 + awl * 0.08 });
        }
        // Orb in the slit
        push({ type: 'orb', x: awBx + 0.01, height: awGap + 0.03, golden: aw2 === 1 });
      }
      push({ type: 'boost', x: asX2 + 0.08, height: 0.5 });
    },
  },
  {
    name: 'KEEP',
    threshold: 0.9525,
    minTime: 30,
    delay: 1.6,
    spawn: (push) => {
      // KEEP: inner stronghold with thick walls and narrow entrance
      const kpX = 1.08;
      // Thick outer wall (double layer)
      for (let kw = 0; kw < 4; kw++) {
        push({ type: 'barrier', x: kpX, height: 0.25 + kw * 0.12 });
        push({ type: 'barrier', x: kpX + 0.01, height: 0.25 + kw * 0.12 });
      }
      // Narrow entrance (single gap)
      // Inner sanctum walls
      push({ type: 'barrier', x: kpX + 0.03, height: 0.35 });
      push({ type: 'barrier', x: kpX + 0.03, height: 0.65 });
      push({ type: 'barrier', x: kpX + 0.05, height: 0.35 });
      push({ type: 'barrier', x: kpX + 0.05, height: 0.65 });
      // Royal treasure
      push({ type: 'orb', x: kpX + 0.04, height: 0.45, golden: true });
      push({ type: 'orb', x: kpX + 0.04, height: 0.55, golden: true });
      push({ type: 'orb', x: kpX + 0.04, height: 0.5 });
      // Escape with boost
      push({ type: 'boost', x: kpX + 0.07, height: 0.5 });
      for (let kr = 0; kr < 3; kr++) {
        push({ type: 'orb', x: kpX + 0.08 + kr * 0.012, height: 0.5 });
      }
    },
  },
  {
    name: 'BARBICAN',
    threshold: 0.9526,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // BARBICAN: fortified outwork with double gates and murder holes
      const bbX = 1.1;
      // First gate
      for (let bg2 = 0; bg2 < 4; bg2++) {
        if (bg2 === 2) continue; // gap
        push({ type: 'barrier', x: bbX, height: 0.25 + bg2 * 0.15 });
      }
      // Kill zone between gates
      push({ type: 'barrier', x: bbX + 0.02, height: 0.25 });
      push({ type: 'barrier', x: bbX + 0.02, height: 0.75 });
      // Murder hole orbs (high risk/reward)
      push({ type: 'orb', x: bbX + 0.02, height: 0.4, golden: true });
      push({ type: 'orb', x: bbX + 0.02, height: 0.6 });
      // Second gate
      for (let bg3 = 0; bg3 < 4; bg3++) {
        if (bg3 === 1) continue; // gap at different height
        push({ type: 'barrier', x: bbX + 0.04, height: 0.25 + bg3 * 0.15 });
      }
      // Victory trail
      for (let bv = 0; bv < 3; bv++) {
        push({ type: 'orb', x: bbX + 0.06 + bv * 0.012, height: 0.5 });
      }
      push({ type: 'boost', x: bbX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'DUNGEON',
    threshold: 0.9527,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // DUNGEON: underground chamber with traps and hidden treasure
      const dnX = 1.08;
      // Ceiling
      for (let dc = 0; dc < 8; dc++) {
        push({ type: 'barrier', x: dnX + dc * 0.01, height: 0.3 });
      }
      // Floor
      for (let df = 0; df < 8; df++) {
        push({ type: 'barrier', x: dnX + df * 0.01, height: 0.75 });
      }
      // Trap pillars inside
      push({ type: 'barrier', x: dnX + 0.02, height: 0.5 });
      push({ type: 'barrier', x: dnX + 0.05, height: 0.55 });
      // Treasure between traps
      push({ type: 'orb', x: dnX + 0.035, height: 0.45 });
      push({ type: 'orb', x: dnX + 0.035, height: 0.6, golden: true });
      push({ type: 'orb', x: dnX + 0.065, height: 0.5 });
      // Exit treasure
      push({ type: 'boost', x: dnX + 0.09, height: 0.5 });
    },
  },
  {
    name: 'SALLY PORT',
    threshold: 0.9528,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // SALLY PORT: hidden exit from fortress wall with secret treasure
      const spX2 = 1.1;
      // Main wall (thick)
      for (let sw2 = 0; sw2 < 6; sw2++) {
        push({ type: 'barrier', x: spX2, height: 0.2 + sw2 * 0.12 });
      }
      // Secret passage (recessed alcove)
      push({ type: 'barrier', x: spX2 + 0.015, height: 0.3 });
      push({ type: 'barrier', x: spX2 + 0.015, height: 0.7 });
      // Hidden chamber behind
      push({ type: 'barrier', x: spX2 + 0.035, height: 0.35 });
      push({ type: 'barrier', x: spX2 + 0.035, height: 0.65 });
      // Secret treasure
      push({ type: 'orb', x: spX2 + 0.025, height: 0.45, golden: true });
      push({ type: 'orb', x: spX2 + 0.025, height: 0.55 });
      // Escape route orbs
      for (let se = 0; se < 4; se++) {
        push({ type: 'orb', x: spX2 + 0.05 + se * 0.012, height: 0.5 });
      }
      push({ type: 'boost', x: spX2 + 0.1, height: 0.5 });
    },
  },
  {
    name: 'TREBUCHET',
    threshold: 0.9529,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // TREBUCHET: siege engine launching arc of orbs
      const trX2 = 1.1;
      // Engine base (barrier structure)
      push({ type: 'barrier', x: trX2, height: 0.65 });
      push({ type: 'barrier', x: trX2 + 0.01, height: 0.65 });
      push({ type: 'barrier', x: trX2 + 0.005, height: 0.7 });
      // Arm (diagonal barrier)
      push({ type: 'barrier', x: trX2 + 0.005, height: 0.55 });
      push({ type: 'barrier', x: trX2 + 0.01, height: 0.45 });
      // Projectile arc (orbs in parabolic trajectory)
      for (let ta = 0; ta < 6; ta++) {
        const taT = ta / 5;
        const taX = trX2 + 0.02 + taT * 0.08;
        const taY = 0.4 - Math.sin(taT * Math.PI) * 0.2;
        push({ type: 'orb', x: taX, height: taY, golden: ta === 3 });
      }
      push({ type: 'boost', x: trX2 + 0.12, height: 0.5 });
    },
  },
  {
    name: 'SIEGE TOWER',
    threshold: 0.953,
    minTime: 30,
    delay: 1.6,
    spawn: (push) => {
      // SIEGE TOWER: mobile tower approaching defensive wall
      const stX2 = 1.08;
      // Defensive wall
      for (let sw = 0; sw < 5; sw++) {
        push({ type: 'barrier', x: stX2, height: 0.25 + sw * 0.1 });
      }
      // Gap in wall (breach point)
      // Siege tower (tall structure on approach)
      for (let st2 = 0; st2 < 4; st2++) {
        push({ type: 'barrier', x: stX2 + 0.04, height: 0.3 + st2 * 0.08 });
        push({ type: 'barrier', x: stX2 + 0.055, height: 0.3 + st2 * 0.08 });
      }
      // Ramp from tower to wall
      push({ type: 'barrier', x: stX2 + 0.025, height: 0.28 });
      // Orbs on tower platforms
      push({ type: 'orb', x: stX2 + 0.047, height: 0.35 });
      push({ type: 'orb', x: stX2 + 0.047, height: 0.5, golden: true });
      push({ type: 'orb', x: stX2 + 0.047, height: 0.55 });
      // Victory reward beyond
      push({ type: 'boost', x: stX2 + 0.08, height: 0.5 });
      for (let sr2 = 0; sr2 < 3; sr2++) {
        push({ type: 'orb', x: stX2 + 0.09 + sr2 * 0.012, height: 0.45 + sr2 * 0.05 });
      }
    },
  },
  {
    name: 'AQUEDUCT BRIDGE',
    threshold: 0.9531,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // AQUEDUCT BRIDGE: elevated water channel supported by pillars
      const abX2 = 1.08;
      // Pillars (tall vertical stacks)
      for (let ap2 = 0; ap2 < 3; ap2++) {
        const apX3 = abX2 + ap2 * 0.03;
        // Pillar column
        push({ type: 'barrier', x: apX3, height: 0.55 });
        push({ type: 'barrier', x: apX3, height: 0.65 });
        push({ type: 'barrier', x: apX3, height: 0.75 });
      }
      // Channel bed (connecting top of pillars)
      for (let ac = 0; ac < 5; ac++) {
        push({ type: 'barrier', x: abX2 + ac * 0.015, height: 0.5 });
      }
      // Water orbs flowing through channel
      for (let aw = 0; aw < 4; aw++) {
        push({ type: 'orb', x: abX2 + 0.005 + aw * 0.015, height: 0.45, golden: aw === 2 });
      }
      // Underpass orbs (beneath pillars)
      push({ type: 'orb', x: abX2 + 0.015, height: 0.8 });
      push({ type: 'boost', x: abX2 + 0.08, height: 0.5 });
    },
  },
  {
    name: 'DRAWWELL',
    threshold: 0.9532,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // DRAWWELL: deep well structure with bucket orbs on pulleys
      const dwX = 1.12;
      // Well walls (deep vertical shaft)
      for (let dw2 = 0; dw2 < 7; dw2++) {
        push({ type: 'barrier', x: dwX, height: 0.25 + dw2 * 0.08 });
      }
      // Cross beam at top
      push({ type: 'barrier', x: dwX + 0.01, height: 0.25 });
      push({ type: 'barrier', x: dwX + 0.02, height: 0.25 });
      // Pulley rope (orbs descending)
      for (let dp = 0; dp < 4; dp++) {
        push({ type: 'orb', x: dwX + 0.015, height: 0.3 + dp * 0.1, golden: dp === 3 });
      }
      // Bucket at bottom
      push({ type: 'boost', x: dwX + 0.015, height: 0.75 });
      // Exit
      push({ type: 'orb', x: dwX + 0.04, height: 0.5 });
    },
  },
  {
    name: 'TOWER DEFENSE',
    threshold: 0.9533,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // TOWER DEFENSE: path weaving between sentry towers
      const tdX = 1.08;
      // Tower 1 (upper)
      for (let t1 = 0; t1 < 3; t1++) {
        push({ type: 'barrier', x: tdX, height: 0.25 + t1 * 0.05 });
      }
      // Path between tower 1 and 2
      push({ type: 'orb', x: tdX + 0.02, height: 0.5 });
      // Tower 2 (lower)
      for (let t2 = 0; t2 < 3; t2++) {
        push({ type: 'barrier', x: tdX + 0.04, height: 0.65 + t2 * 0.05 });
      }
      // Path between tower 2 and 3
      push({ type: 'orb', x: tdX + 0.06, height: 0.45, golden: true });
      // Tower 3 (mid-upper)
      for (let t3 = 0; t3 < 3; t3++) {
        push({ type: 'barrier', x: tdX + 0.08, height: 0.3 + t3 * 0.05 });
      }
      // Final path and reward
      push({ type: 'orb', x: tdX + 0.1, height: 0.55 });
      push({ type: 'boost', x: tdX + 0.12, height: 0.5 });
    },
  },
  {
    name: 'MINESHAFT',
    threshold: 0.9534,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // MINESHAFT: vertical shaft with ladder-like rungs and gems
      const msX2 = 1.1;
      // Shaft walls (two parallel barrier columns)
      for (let mv = 0; mv < 6; mv++) {
        push({ type: 'barrier', x: msX2 + mv * 0.01, height: 0.3 });
        push({ type: 'barrier', x: msX2 + mv * 0.01, height: 0.7 });
      }
      // Ladder rungs (barriers crossing the shaft) — alternating
      push({ type: 'barrier', x: msX2 + 0.015, height: 0.45 });
      push({ type: 'barrier', x: msX2 + 0.035, height: 0.55 });
      // Gems between rungs
      push({ type: 'orb', x: msX2 + 0.015, height: 0.55 });
      push({ type: 'orb', x: msX2 + 0.035, height: 0.45, golden: true });
      push({ type: 'orb', x: msX2 + 0.055, height: 0.5 });
      // Exit with boost
      push({ type: 'boost', x: msX2 + 0.08, height: 0.5 });
    },
  },
  {
    name: 'GATEHOUSE',
    threshold: 0.9535,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // GATEHOUSE: fortified entrance with flanking towers and treasure arch
      const ghX = 1.1;
      // Left tower (tall stack)
      for (let gt = 0; gt < 5; gt++) {
        push({ type: 'barrier', x: ghX, height: 0.2 + gt * 0.08 });
      }
      // Right tower
      for (let gt2 = 0; gt2 < 5; gt2++) {
        push({ type: 'barrier', x: ghX + 0.04, height: 0.52 + gt2 * 0.08 });
      }
      // Arch barrier (connecting top)
      push({ type: 'barrier', x: ghX + 0.02, height: 0.2 });
      // Gate opening with orbs
      push({ type: 'orb', x: ghX + 0.02, height: 0.45 });
      push({ type: 'orb', x: ghX + 0.02, height: 0.55, golden: true });
      // Reward beyond gate
      push({ type: 'boost', x: ghX + 0.06, height: 0.5 });
      for (let gr2 = 0; gr2 < 3; gr2++) {
        push({ type: 'orb', x: ghX + 0.07 + gr2 * 0.012, height: 0.5 });
      }
    },
  },
  {
    name: 'LABYRINTH DEPTH',
    threshold: 0.9536,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // LABYRINTH DEPTH: deep multi-room maze with branching paths
      const ldX = 1.08;
      // Room 1 - entry
      push({ type: 'barrier', x: ldX, height: 0.3 });
      push({ type: 'barrier', x: ldX, height: 0.7 });
      push({ type: 'barrier', x: ldX + 0.02, height: 0.4 });
      push({ type: 'orb', x: ldX + 0.01, height: 0.5 });
      // Room 2 - upper branch
      push({ type: 'barrier', x: ldX + 0.04, height: 0.5 });
      push({ type: 'barrier', x: ldX + 0.04, height: 0.25 });
      push({ type: 'orb', x: ldX + 0.05, height: 0.35 });
      // Room 3 - lower branch
      push({ type: 'barrier', x: ldX + 0.04, height: 0.75 });
      push({ type: 'orb', x: ldX + 0.05, height: 0.65, golden: true });
      // Final room - convergence
      push({ type: 'barrier', x: ldX + 0.07, height: 0.3 });
      push({ type: 'barrier', x: ldX + 0.07, height: 0.7 });
      push({ type: 'orb', x: ldX + 0.08, height: 0.5 });
      push({ type: 'boost', x: ldX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'PORTCULLIS DOUBLE',
    threshold: 0.9537,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // PORTCULLIS DOUBLE: two offset portcullis gates with gaps at different heights
      const pdX = 1.1;
      // First gate (gap high)
      for (let pg = 0; pg < 5; pg++) {
        if (pg === 1) continue; // gap at position 1 (high)
        push({ type: 'barrier', x: pdX, height: 0.2 + pg * 0.15 });
      }
      push({ type: 'orb', x: pdX + 0.012, height: 0.35 });
      // Second gate (gap low)
      for (let pg2 = 0; pg2 < 5; pg2++) {
        if (pg2 === 3) continue; // gap at position 3 (low)
        push({ type: 'barrier', x: pdX + 0.04, height: 0.2 + pg2 * 0.15 });
      }
      push({ type: 'orb', x: pdX + 0.052, height: 0.65, golden: true });
      // Reward after gates
      push({ type: 'boost', x: pdX + 0.07, height: 0.5 });
      for (let pr3 = 0; pr3 < 3; pr3++) {
        push({ type: 'orb', x: pdX + 0.08 + pr3 * 0.012, height: 0.4 + pr3 * 0.1 });
      }
    },
  },
  {
    name: 'MOAT',
    threshold: 0.9538,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // MOAT: circular barrier ring with bridge gap and treasure island
      const moX = 1.1;
      const moCH = 0.5;
      // Circular ring of barriers
      const moSegs = 8;
      for (let mr = 0; mr < moSegs; mr++) {
        const moAng = (mr / moSegs) * Math.PI * 2;
        // Skip a gap for the "bridge"
        if (mr === 2 || mr === 6) continue;
        const moBx = moX + 0.03 + Math.cos(moAng) * 0.025;
        const moBy = moCH + Math.sin(moAng) * 0.15;
        push({ type: 'barrier', x: moBx, height: moBy });
      }
      // Treasure island in center
      push({ type: 'orb', x: moX + 0.03, height: moCH, golden: true });
      push({ type: 'orb', x: moX + 0.025, height: moCH + 0.04 });
      push({ type: 'orb', x: moX + 0.035, height: moCH - 0.04 });
      // Exit reward
      push({ type: 'boost', x: moX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'DRAWBRIDGE',
    threshold: 0.9539,
    minTime: 20,
    delay: 1.2,
    spawn: (push) => {
      // DRAWBRIDGE: single gate with raised section and reward below
      const dbX3 = 1.12;
      // Gate posts (tall)
      push({ type: 'barrier', x: dbX3, height: 0.2 });
      push({ type: 'barrier', x: dbX3, height: 0.8 });
      push({ type: 'barrier', x: dbX3 + 0.025, height: 0.2 });
      push({ type: 'barrier', x: dbX3 + 0.025, height: 0.8 });
      // Raised gate (barriers at top only)
      push({ type: 'barrier', x: dbX3 + 0.01, height: 0.25 });
      push({ type: 'barrier', x: dbX3 + 0.015, height: 0.28 });
      // Clear path below with orbs
      for (let dg = 0; dg < 3; dg++) {
        push({ type: 'orb', x: dbX3 + 0.008 + dg * 0.008, height: 0.5 + dg * 0.05, golden: dg === 1 });
      }
      push({ type: 'boost', x: dbX3 + 0.04, height: 0.55 });
    },
  },
  {
    name: 'VAULT',
    threshold: 0.954,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // VAULT: locked chamber with barrier door and treasure inside
      const vaX = 1.1;
      // Door frame (thick barriers)
      for (let vd = 0; vd < 3; vd++) {
        push({ type: 'barrier', x: vaX, height: 0.3 + vd * 0.1 });
        push({ type: 'barrier', x: vaX, height: 0.6 + vd * 0.03 });
      }
      // Door mechanism (crossing barriers)
      push({ type: 'barrier', x: vaX + 0.01, height: 0.45 });
      push({ type: 'barrier', x: vaX + 0.01, height: 0.55 });
      // Inner vault walls
      push({ type: 'barrier', x: vaX + 0.03, height: 0.3 });
      push({ type: 'barrier', x: vaX + 0.03, height: 0.7 });
      push({ type: 'barrier', x: vaX + 0.06, height: 0.3 });
      push({ type: 'barrier', x: vaX + 0.06, height: 0.7 });
      // Treasure inside vault
      push({ type: 'orb', x: vaX + 0.04, height: 0.45, golden: true });
      push({ type: 'orb', x: vaX + 0.04, height: 0.55, golden: true });
      push({ type: 'orb', x: vaX + 0.05, height: 0.5 });
      push({ type: 'boost', x: vaX + 0.08, height: 0.5 });
    },
  },
  {
    name: 'TURRET',
    threshold: 0.9541,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // TURRET: rotating gun turret with barrier projectile lines
      const tuX = 1.12;
      const tuCH = 0.5;
      // Turret base (square)
      push({ type: 'barrier', x: tuX, height: tuCH - 0.06 });
      push({ type: 'barrier', x: tuX, height: tuCH + 0.06 });
      push({ type: 'barrier', x: tuX + 0.015, height: tuCH - 0.06 });
      push({ type: 'barrier', x: tuX + 0.015, height: tuCH + 0.06 });
      // Barrel (extending forward)
      push({ type: 'barrier', x: tuX + 0.025, height: tuCH });
      push({ type: 'barrier', x: tuX + 0.035, height: tuCH });
      // "Projectile" line (barriers spreading outward)
      for (let tp = 0; tp < 3; tp++) {
        push({ type: 'barrier', x: tuX + 0.05 + tp * 0.02, height: tuCH - 0.05 - tp * 0.06 });
        push({ type: 'barrier', x: tuX + 0.05 + tp * 0.02, height: tuCH + 0.05 + tp * 0.06 });
      }
      // Orbs in safe zones
      push({ type: 'orb', x: tuX + 0.06, height: tuCH, golden: true });
      push({ type: 'orb', x: tuX + 0.08, height: tuCH });
      push({ type: 'boost', x: tuX + 0.12, height: 0.5 });
    },
  },
  {
    name: 'BATTLEMENT',
    threshold: 0.9542,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // BATTLEMENT: castle wall with crenelations and arrow slits
      const btX = 1.1;
      // Wall base (continuous barrier line)
      for (let bw = 0; bw < 8; bw++) {
        push({ type: 'barrier', x: btX + bw * 0.01, height: 0.5 });
      }
      // Crenelations (alternating merlons on top)
      for (let bc = 0; bc < 4; bc++) {
        push({ type: 'barrier', x: btX + bc * 0.02, height: 0.4 });
      }
      // Arrow slits (gaps with orbs)
      push({ type: 'orb', x: btX + 0.01, height: 0.55 });
      push({ type: 'orb', x: btX + 0.04, height: 0.55, golden: true });
      push({ type: 'orb', x: btX + 0.07, height: 0.55 });
      // Exit reward
      push({ type: 'boost', x: btX + 0.1, height: 0.5 });
    },
  },
  {
    name: 'GUILLOTINE',
    threshold: 0.9543,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // GUILLOTINE: vertical dropping blades with timing gaps between
      const glX = 1.1;
      for (let gb = 0; gb < 3; gb++) {
        const gbX2 = glX + gb * 0.035;
        // Blade (vertical barrier column)
        for (let gv = 0; gv < 4; gv++) {
          const gbH2 = gb % 2 === 0 ? 0.2 + gv * 0.1 : 0.5 + gv * 0.1;
          push({ type: 'barrier', x: gbX2, height: gbH2 });
        }
        // Gap orbs (in the safe zone)
        const gbSafe = gb % 2 === 0 ? 0.7 : 0.35;
        push({ type: 'orb', x: gbX2 + 0.015, height: gbSafe, golden: gb === 1 });
      }
      push({ type: 'boost', x: glX + 0.12, height: 0.5 });
    },
  },
  {
    name: 'LIGHTHOUSE',
    threshold: 0.9544,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // LIGHTHOUSE: tall tower with sweeping beam of orbs
      const lhX = 1.12;
      // Tower (vertical stack of barriers)
      for (let lt = 0; lt < 6; lt++) {
        push({ type: 'barrier', x: lhX, height: 0.3 + lt * 0.08 });
      }
      // Lamp at top
      push({ type: 'orb', x: lhX, height: 0.25, golden: true });
      // Sweeping beam of orbs extending from top
      for (let lb = 0; lb < 5; lb++) {
        const lbX2 = lhX + 0.015 + lb * 0.012;
        const lbY = 0.25 + lb * 0.04;
        push({ type: 'orb', x: lbX2, height: lbY });
      }
      // Base reward
      push({ type: 'boost', x: lhX + 0.04, height: 0.75 });
      push({ type: 'orb', x: lhX + 0.06, height: 0.7 });
    },
  },
  {
    name: 'AMPHITHEATER',
    threshold: 0.9545,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // AMPHITHEATER: semicircular arena with tiered seating barriers
      const amX = 1.1;
      const amCH = 0.5;
      // Semicircular tiers (3 rows)
      for (let at = 0; at < 3; at++) {
        const amR2 = 0.02 + at * 0.015;
        const amSeats = 4 + at;
        for (let as2 = 0; as2 < amSeats; as2++) {
          const amAng2 = ((as2 / (amSeats - 1)) - 0.5) * Math.PI;
          const amBx = amX + at * 0.015 + Math.cos(amAng2) * amR2 * 0.5;
          const amBy = amCH + Math.sin(amAng2) * (0.15 + at * 0.05);
          push({ type: 'barrier', x: amBx, height: amBy });
        }
      }
      // Stage area with orbs (center front)
      for (let ao = 0; ao < 3; ao++) {
        push({ type: 'orb', x: amX + 0.06 + ao * 0.012, height: amCH - 0.05 + ao * 0.05, golden: ao === 1 });
      }
      push({ type: 'boost', x: amX + 0.1, height: amCH });
    },
  },
  {
    name: 'CITADEL',
    threshold: 0.9546,
    minTime: 35,
    delay: 1.8,
    spawn: (push) => {
      // CITADEL: massive fortified complex with multiple chambers and treasure
      const ctX = 1.08;
      // Outer curtain wall
      for (let cw = 0; cw < 5; cw++) {
        push({ type: 'barrier', x: ctX, height: 0.25 + cw * 0.12 });
      }
      // Gate opening (gap in wall)
      // Chamber 1 (upper)
      push({ type: 'barrier', x: ctX + 0.03, height: 0.25 });
      push({ type: 'barrier', x: ctX + 0.06, height: 0.25 });
      push({ type: 'orb', x: ctX + 0.045, height: 0.3 });
      // Chamber 2 (lower)
      push({ type: 'barrier', x: ctX + 0.03, height: 0.7 });
      push({ type: 'barrier', x: ctX + 0.06, height: 0.7 });
      push({ type: 'orb', x: ctX + 0.045, height: 0.65, golden: true });
      // Inner keep wall
      for (let ck = 0; ck < 3; ck++) {
        push({ type: 'barrier', x: ctX + 0.08, height: 0.4 + ck * 0.1 });
      }
      // Throne room treasure
      push({ type: 'orb', x: ctX + 0.1, height: 0.48, golden: true });
      push({ type: 'orb', x: ctX + 0.1, height: 0.52 });
      push({ type: 'boost', x: ctX + 0.12, height: 0.5 });
      // Reward trail after citadel
      for (let cr = 0; cr < 4; cr++) {
        push({ type: 'orb', x: ctX + 0.14 + cr * 0.012, height: 0.5 });
      }
    },
  },
  {
    name: 'WINDMILL',
    threshold: 0.9547,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // WINDMILL: rotating blade barriers with orbs between blades
      const wmX = 1.12;
      const wmCH = 0.5;
      // Central hub
      push({ type: 'barrier', x: wmX, height: wmCH });
      // Four blades extending outward
      const wmBlades = 4;
      for (let wb = 0; wb < wmBlades; wb++) {
        const wmAng = (wb / wmBlades) * Math.PI * 2;
        const wmLen = 3;
        for (let wl = 1; wl <= wmLen; wl++) {
          const wmBx = wmX + Math.cos(wmAng) * wl * 0.012;
          const wmBy = wmCH + Math.sin(wmAng) * wl * 0.08;
          push({ type: 'barrier', x: wmBx, height: wmBy });
        }
      }
      // Orbs tucked between blades
      for (let wo = 0; wo < 4; wo++) {
        const woAng = ((wo + 0.5) / 4) * Math.PI * 2;
        const woBx = wmX + Math.cos(woAng) * 0.02;
        const woBy = wmCH + Math.sin(woAng) * 0.12;
        push({ type: 'orb', x: woBx, height: woBy, golden: wo === 2 });
      }
      push({ type: 'boost', x: wmX + 0.06, height: 0.5 });
    },
  },
  {
    name: 'FORTRESS',
    threshold: 0.9548,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // FORTRESS: thick barrier walls surrounding inner treasure sanctum
      const ftX = 1.1;
      // Outer walls (thick)
      for (let fw = 0; fw < 3; fw++) {
        push({ type: 'barrier', x: ftX, height: 0.3 + fw * 0.15 });
        push({ type: 'barrier', x: ftX + 0.07, height: 0.3 + fw * 0.15 });
      }
      // Inner walls (narrower gap)
      push({ type: 'barrier', x: ftX + 0.025, height: 0.35 });
      push({ type: 'barrier', x: ftX + 0.025, height: 0.65 });
      push({ type: 'barrier', x: ftX + 0.045, height: 0.35 });
      push({ type: 'barrier', x: ftX + 0.045, height: 0.65 });
      // Treasure in sanctum center
      push({ type: 'orb', x: ftX + 0.035, height: 0.48, golden: true });
      push({ type: 'orb', x: ftX + 0.035, height: 0.52 });
      // Escape reward
      push({ type: 'boost', x: ftX + 0.1, height: 0.5 });
      for (let fr = 0; fr < 3; fr++) {
        push({ type: 'orb', x: ftX + 0.1 + fr * 0.015, height: 0.4 + fr * 0.1 });
      }
    },
  },
  {
    name: 'AIRDOCK',
    threshold: 0.9549,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // AIRDOCK: floating platform with docking bays
      const adX = 1.1;
      // Main platform (horizontal barrier line)
      for (let ad = 0; ad < 6; ad++) {
        push({ type: 'barrier', x: adX + ad * 0.012, height: 0.5 });
      }
      // Upper docking bay
      push({ type: 'barrier', x: adX + 0.01, height: 0.35 });
      push({ type: 'barrier', x: adX + 0.05, height: 0.35 });
      push({ type: 'orb', x: adX + 0.03, height: 0.38, golden: true });
      // Lower docking bay
      push({ type: 'barrier', x: adX + 0.01, height: 0.65 });
      push({ type: 'barrier', x: adX + 0.05, height: 0.65 });
      push({ type: 'orb', x: adX + 0.03, height: 0.62 });
      // Exit orbs
      for (let ae = 0; ae < 3; ae++) {
        push({ type: 'orb', x: adX + 0.08 + ae * 0.015, height: 0.5 });
      }
      push({ type: 'boost', x: adX + 0.13, height: 0.5 });
    },
  },
  {
    name: 'OBSERVATORY',
    threshold: 0.955,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // OBSERVATORY: domed building with barrier walls and orb telescope
      const obX = 1.1;
      // Dome top (barriers in arc)
      for (let ob = 0; ob < 5; ob++) {
        const obAng = (ob / 4) * Math.PI;
        const obBx = obX + 0.02 + Math.cos(obAng) * 0.025;
        const obBy = 0.35 - Math.sin(obAng) * 0.12;
        push({ type: 'barrier', x: obBx, height: obBy });
      }
      // Walls
      push({ type: 'barrier', x: obX, height: 0.45 });
      push({ type: 'barrier', x: obX, height: 0.55 });
      push({ type: 'barrier', x: obX + 0.045, height: 0.45 });
      push({ type: 'barrier', x: obX + 0.045, height: 0.55 });
      // Telescope orb trail pointing up-right
      for (let ot = 0; ot < 4; ot++) {
        push({ type: 'orb', x: obX + 0.055 + ot * 0.015, height: 0.3 - ot * 0.05, golden: ot === 3 });
      }
      push({ type: 'boost', x: obX + 0.12, height: 0.5 });
    },
  },
  {
    name: 'PRISM',
    threshold: 0.9551,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // PRISM: triangular barrier with rainbow orb trail behind
      const prX3 = 1.12;
      // Triangle of barriers
      push({ type: 'barrier', x: prX3, height: 0.5 });
      push({ type: 'barrier', x: prX3 + 0.015, height: 0.6 });
      push({ type: 'barrier', x: prX3 + 0.015, height: 0.4 });
      push({ type: 'barrier', x: prX3 + 0.03, height: 0.7 });
      push({ type: 'barrier', x: prX3 + 0.03, height: 0.3 });
      // "Rainbow" orb trail spreading out behind prism
      const prColors = 5;
      for (let pr2 = 0; pr2 < prColors; pr2++) {
        const prOX = prX3 + 0.045 + pr2 * 0.015;
        const prOH = 0.35 + pr2 * 0.06;
        push({ type: 'orb', x: prOX, height: prOH, golden: pr2 === 2 });
      }
      push({ type: 'boost', x: prX3 + 0.045 + prColors * 0.015 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'DRAWBRIDGE PAIR',
    threshold: 0.9552,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // DRAWBRIDGE PAIR: two barrier gates with timed openings
      for (let db = 0; db < 2; db++) {
        const dbX2 = 1.1 + db * 0.06;
        // Gate posts
        push({ type: 'barrier', x: dbX2, height: 0.85 });
        push({ type: 'barrier', x: dbX2, height: 0.15 });
        // Gate barrier (opened = gap at different heights)
        const dbGapH = db === 0 ? 0.6 : 0.4;
        push({ type: 'barrier', x: dbX2 + 0.01, height: dbGapH + 0.15 });
        push({ type: 'barrier', x: dbX2 + 0.01, height: dbGapH - 0.15 });
        // Orb in gate opening
        push({ type: 'orb', x: dbX2 + 0.01, height: dbGapH, golden: db === 1 });
        // Orbs between gates
        if (db === 0) {
          push({ type: 'orb', x: dbX2 + 0.03, height: 0.5 });
          push({ type: 'orb', x: dbX2 + 0.04, height: 0.5 });
        }
      }
      push({ type: 'boost', x: 1.24, height: 0.5 });
    },
  },
  {
    name: 'SEESAW',
    threshold: 0.9553,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // SEESAW: alternating balanced barrier pairs like a playground seesaw
      const ssPairs = 4;
      for (let ss3 = 0; ss3 < ssPairs; ss3++) {
        const ssX4 = 1.1 + ss3 * 0.04;
        const ssTilt = ss3 % 2 === 0;
        // Fulcrum
        push({ type: 'barrier', x: ssX4 + 0.01, height: 0.5 });
        // Left arm
        push({ type: 'barrier', x: ssX4, height: ssTilt ? 0.4 : 0.6 });
        // Right arm
        push({ type: 'barrier', x: ssX4 + 0.02, height: ssTilt ? 0.6 : 0.4 });
        // Orb on the high side
        const ssOrbH = ssTilt ? 0.65 : 0.65;
        push({ type: 'orb', x: ssX4 + (ssTilt ? 0.02 : 0), height: ssOrbH, golden: ss3 === 2 });
      }
      push({ type: 'boost', x: 1.1 + ssPairs * 0.04 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'CATACOMB',
    threshold: 0.9554,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // CATACOMB: maze of interconnected chambers with treasures
      const ccChambers = 3;
      for (let cc2 = 0; cc2 < ccChambers; cc2++) {
        const ccBaseX = 1.1 + cc2 * 0.05;
        const ccBaseH = 0.3 + cc2 * 0.15;
        // Chamber walls (box outline)
        for (let cw = 0; cw < 3; cw++) {
          push({ type: 'barrier', x: ccBaseX + cw * 0.015, height: ccBaseH + 0.15 });
          push({ type: 'barrier', x: ccBaseX + cw * 0.015, height: ccBaseH - 0.05 });
        }
        // Side walls
        push({ type: 'barrier', x: ccBaseX, height: ccBaseH + 0.05 });
        // Treasure inside
        push({ type: 'orb', x: ccBaseX + 0.015, height: ccBaseH + 0.05, golden: cc2 === 1 });
      }
      // Connecting passages (orbs between chambers)
      push({ type: 'orb', x: 1.145, height: 0.45 });
      push({ type: 'orb', x: 1.195, height: 0.55 });
      push({ type: 'boost', x: 1.1 + ccChambers * 0.05 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'STEPPING STONES',
    threshold: 0.9555,
    minTime: 20,
    delay: 1.2,
    spawn: (push) => {
      // STEPPING STONES: isolated barrier pads with orbs hopping between
      const ssCount2 = 6;
      for (let ss2 = 0; ss2 < ssCount2; ss2++) {
        const ssX3 = 1.1 + ss2 * 0.03;
        const ssH3 = 0.25 + (ss2 % 3) * 0.2;
        // Stone (small barrier block)
        push({ type: 'barrier', x: ssX3, height: ssH3 });
        // Orb above each stone
        push({ type: 'orb', x: ssX3, height: ssH3 + 0.1, golden: ss2 === 3 });
      }
      push({ type: 'boost', x: 1.1 + ssCount2 * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'TURBINE',
    threshold: 0.9556,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // TURBINE: rotating blade-like barrier arrangement
      const tuBlades = 6;
      const tuCX = 1.14;
      const tuCH = 0.5;
      for (let tu = 0; tu < tuBlades; tu++) {
        const tuAngle = (tu / tuBlades) * Math.PI * 2;
        const tuLen2 = 0.08;
        // Blade segments along each arm
        for (let ts = 1; ts <= 3; ts++) {
          const tuX2 = tuCX + Math.cos(tuAngle) * tuLen2 * (ts / 3);
          const tuH2 = tuCH + Math.sin(tuAngle) * tuLen2 * (ts / 3);
          push({ type: 'barrier', x: tuX2, height: tuH2 });
        }
      }
      // Orbs between blades
      for (let to2 = 0; to2 < 3; to2++) {
        const toAngle2 = ((to2 + 0.5) / 3) * Math.PI * 2;
        const toX2 = tuCX + Math.cos(toAngle2) * 0.04;
        const toH3 = tuCH + Math.sin(toAngle2) * 0.04;
        push({ type: 'orb', x: toX2, height: toH3, golden: to2 === 1 });
      }
      push({ type: 'boost', x: tuCX + 0.12, height: 0.5 });
    },
  },
  {
    name: 'BARRICADE',
    threshold: 0.9557,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // BARRICADE: dense barrier wall with one deliberately placed gap
      const baWidth = 5;
      const baHeight2 = 6;
      const baGapR = Math.floor(baHeight2 * 0.6); // gap row
      const baGapC = Math.floor(baWidth * 0.5); // gap column
      for (let br2 = 0; br2 < baHeight2; br2++) {
        for (let bc = 0; bc < baWidth; bc++) {
          const baX2 = 1.1 + bc * 0.015;
          const baH2 = 0.15 + br2 * 0.12;
          if (br2 === baGapR && bc === baGapC) { // Gap - place golden orb
            push({ type: 'orb', x: baX2, height: baH2, golden: true });
          } else {
            push({ type: 'barrier', x: baX2, height: baH2 });
          }
        }
      }
      push({ type: 'boost', x: 1.1 + baWidth * 0.015 + 0.03, height: 0.15 + baGapR * 0.12 });
    },
  },
  {
    name: 'CROWN',
    threshold: 0.9558,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // CROWN: barrier crown shape with jewel orbs at tips
      const crTips = 5;
      for (let cr2 = 0; cr2 < crTips; cr2++) {
        const crX3 = 1.1 + cr2 * 0.03;
        const crTip2 = cr2 % 2 === 0;
        // Crown peaks and valleys
        const crH3 = crTip2 ? 0.7 : 0.5;
        push({ type: 'barrier', x: crX3, height: crH3 });
        // Base of crown
        push({ type: 'barrier', x: crX3, height: 0.35 });
        // Jewel orb at tips
        if (crTip2) {
          push({ type: 'orb', x: crX3, height: crH3 + 0.08, golden: cr2 === 2 });
        }
      }
      // Orbs below crown
      push({ type: 'orb', x: 1.13, height: 0.25 });
      push({ type: 'orb', x: 1.19, height: 0.25 });
      push({ type: 'boost', x: 1.1 + crTips * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'AQUEDUCT',
    threshold: 0.9559,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // AQUEDUCT: elevated barrier channel with orbs flowing along it
      const aqLen = 7;
      for (let aq = 0; aq < aqLen; aq++) {
        const aqX2 = 1.1 + aq * 0.02;
        // Support pillars
        if (aq % 3 === 0) {
          push({ type: 'barrier', x: aqX2, height: 0.5 });
          push({ type: 'barrier', x: aqX2, height: 0.4 });
        }
        // Channel walls
        push({ type: 'barrier', x: aqX2, height: 0.7 });
        push({ type: 'barrier', x: aqX2, height: 0.58 });
        // Orbs "flowing" in channel
        if (aq % 2 === 1) {
          push({ type: 'orb', x: aqX2, height: 0.64, golden: aq === 3 });
        }
      }
      // Orbs below the aqueduct (alternative path)
      push({ type: 'orb', x: 1.13, height: 0.3 });
      push({ type: 'orb', x: 1.17, height: 0.3 });
      push({ type: 'boost', x: 1.1 + aqLen * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'TOLLBOOTH',
    threshold: 0.956,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // TOLLBOOTH: barrier checkpoints with single narrow pass-through
      const tbGates2 = 4;
      for (let tb = 0; tb < tbGates2; tb++) {
        const tbX2 = 1.1 + tb * 0.04;
        const tbGapH = 0.35 + tb * 0.1; // gap position varies
        // Wall above gap
        for (let tw = 0; tw < 3; tw++) {
          push({ type: 'barrier', x: tbX2 + tw * 0.008, height: tbGapH + 0.12 + tw * 0.08 });
        }
        // Wall below gap
        for (let tw2 = 0; tw2 < 3; tw2++) {
          push({ type: 'barrier', x: tbX2 + tw2 * 0.008, height: tbGapH - 0.12 - tw2 * 0.08 });
        }
        // Toll orb in gap
        push({ type: 'orb', x: tbX2 + 0.01, height: tbGapH, golden: tb === 2 });
      }
      push({ type: 'boost', x: 1.1 + tbGates2 * 0.04 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'RAMPART',
    threshold: 0.9561,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // RAMPART: thick barrier wall with arrow-slit gaps for orbs
      const rpLen2 = 8;
      for (let rp = 0; rp < rpLen2; rp++) {
        const rpX2 = 1.1 + rp * 0.015;
        // Full wall
        push({ type: 'barrier', x: rpX2, height: 0.3 });
        push({ type: 'barrier', x: rpX2, height: 0.45 });
        push({ type: 'barrier', x: rpX2, height: 0.55 });
        push({ type: 'barrier', x: rpX2, height: 0.7 });
        // Arrow slit (gap) every 3rd column
        if (rp % 3 === 1) { // Remove middle barriers, add orb in gap
          push({ type: 'orb', x: rpX2 + 0.005, height: 0.5, golden: rp === 4 });
        }
      }
      push({ type: 'boost', x: 1.1 + rpLen2 * 0.015 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'COLOSSEUM',
    threshold: 0.9562,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // COLOSSEUM: circular arena of barriers with treasures in center
      const coRingPts = 10;
      const coR3 = 0.12;
      const coCX2 = 1.15;
      const coCH2 = 0.5;
      for (let co5 = 0; co5 < coRingPts; co5++) {
        const coAng2 = (co5 / coRingPts) * Math.PI * 2;
        const coX5 = coCX2 + Math.cos(coAng2) * coR3;
        const coH5 = coCH2 + Math.sin(coAng2) * coR3;
        // Leave gaps at 3 and 7 o'clock positions
        if (co5 !== 2 && co5 !== 7) {
          push({ type: 'barrier', x: coX5, height: coH5 });
        }
      }
      // Center treasures
      push({ type: 'orb', x: coCX2, height: coCH2, golden: true });
      push({ type: 'orb', x: coCX2 - 0.02, height: coCH2 });
      push({ type: 'orb', x: coCX2 + 0.02, height: coCH2 });
      push({ type: 'boost', x: coCX2 + coR3 + 0.05, height: 0.5 });
    },
  },
  {
    name: 'SAWBLADE',
    threshold: 0.9563,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // SAWBLADE: circular arrangement of barriers like spinning saw teeth
      const sawTeeth = 8;
      const sawCX = 1.15;
      const sawCH = 0.5;
      const sawR2 = 0.1;
      for (let sw2 = 0; sw2 < sawTeeth; sw2++) {
        const swAngle2 = (sw2 / sawTeeth) * Math.PI * 2;
        const swX3 = sawCX + Math.cos(swAngle2) * sawR2;
        const swH3 = sawCH + Math.sin(swAngle2) * sawR2;
        push({ type: 'barrier', x: swX3, height: swH3 });
      }
      // Orbs in gaps between teeth
      for (let so2 = 0; so2 < 4; so2++) {
        const soAngle = ((so2 + 0.5) / 4) * Math.PI * 2;
        const soX2 = sawCX + Math.cos(soAngle) * (sawR2 * 0.5);
        const soH2 = sawCH + Math.sin(soAngle) * (sawR2 * 0.5);
        push({ type: 'orb', x: soX2, height: soH2, golden: so2 === 2 });
      }
      push({ type: 'boost', x: sawCX + sawR2 + 0.05, height: 0.5 });
    },
  },
  {
    name: 'CORRIDOR SQUEEZE',
    threshold: 0.9564,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // CORRIDOR SQUEEZE: progressively narrowing then widening corridor
      const csLen2 = 8;
      for (let cs3 = 0; cs3 < csLen2; cs3++) {
        const csX4 = 1.1 + cs3 * 0.02;
        const csNarrow = 1 - Math.abs(cs3 - (csLen2 - 1) / 2) / ((csLen2 - 1) / 2);
        const csGap = 0.35 - csNarrow * 0.2; // gap from 0.35 down to 0.15
        // Top wall
        push({ type: 'barrier', x: csX4, height: 0.5 + csGap });
        // Bottom wall
        push({ type: 'barrier', x: csX4, height: 0.5 - csGap });
        // Orbs in center at wider points
        if (cs3 < 2 || cs3 > csLen2 - 3) {
          push({ type: 'orb', x: csX4, height: 0.5, golden: cs3 === 0 });
        }
      }
      push({ type: 'boost', x: 1.1 + csLen2 * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'HELIX DOUBLE',
    threshold: 0.9565,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // HELIX DOUBLE: two interleaving helix barrier strands
      const hdTurns = 8;
      for (let hd = 0; hd < hdTurns; hd++) {
        const hdX2 = 1.1 + hd * 0.02;
        const hdAngle2 = (hd / 4) * Math.PI * 2;
        // Strand A
        const hdHA = 0.5 + Math.sin(hdAngle2) * 0.2;
        push({ type: 'barrier', x: hdX2, height: hdHA });
        // Strand B (offset by PI)
        const hdHB = 0.5 + Math.sin(hdAngle2 + Math.PI) * 0.2;
        push({ type: 'barrier', x: hdX2, height: hdHB });
        // Orbs in the center between strands
        if (hd % 2 === 0) {
          push({ type: 'orb', x: hdX2 + 0.008, height: 0.5, golden: hd === 4 });
        }
      }
      push({ type: 'boost', x: 1.1 + hdTurns * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'ROCK CANYON',
    threshold: 0.9566,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // ROCK CANYON: paired rock pillars with orbs in the gap
      const rcCount = 4;
      for (let rc = 0; rc < rcCount; rc++) {
        const rcX = 1.1 + rc * 0.04;
        // Upper rock wall
        push({ type: 'barrier', x: rcX, height: 0.75 });
        push({ type: 'barrier', x: rcX, height: 0.8 });
        // Lower rock wall
        push({ type: 'barrier', x: rcX, height: 0.2 });
        push({ type: 'barrier', x: rcX, height: 0.25 });
        // Ledge
        push({ type: 'barrier', x: rcX + 0.005, height: 0.72 });
        // Orb in gap
        push({ type: 'orb', x: rcX + 0.005, height: 0.5, golden: rc === 2 });
      }
      push({ type: 'boost', x: 1.1 + rcCount * 0.04 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'PENDULUM SWING',
    threshold: 0.9567,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // PENDULUM SWING: barriers swinging between high and low with timing gaps
      const psCount2 = 5;
      for (let ps = 0; ps < psCount2; ps++) {
        const psX2 = 1.1 + ps * 0.03;
        // Pendulum position alternates
        const psHigh2 = ps % 2 === 0;
        const psH2 = psHigh2 ? 0.72 : 0.28;
        push({ type: 'barrier', x: psX2, height: psH2 });
        // Arm connecting to pivot
        push({ type: 'barrier', x: psX2, height: psHigh2 ? psH2 - 0.08 : psH2 + 0.08 });
        // Orb at opposite position (safe zone)
        push({ type: 'orb', x: psX2 + 0.01, height: psHigh2 ? 0.35 : 0.65, golden: ps === 2 });
      }
      push({ type: 'boost', x: 1.1 + psCount2 * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'STOCKADE',
    threshold: 0.9568,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // STOCKADE: double-layer barrier fence with gaps at different points
      const skLen = 6;
      // Outer fence
      for (let sk = 0; sk < skLen; sk++) {
        const skX2 = 1.1 + sk * 0.02;
        if (sk !== 2) { // gap in outer fence
          push({ type: 'barrier', x: skX2, height: 0.65 });
        }
        if (sk !== 4) { // different gap in outer fence
          push({ type: 'barrier', x: skX2, height: 0.35 });
        }
      }
      // Inner fence (offset gaps)
      for (let sk2 = 0; sk2 < skLen; sk2++) {
        const sk2X = 1.1 + sk2 * 0.02 + 0.04;
        if (sk2 !== 3) {
          push({ type: 'barrier', x: sk2X, height: 0.55 });
        }
        if (sk2 !== 1) {
          push({ type: 'barrier', x: sk2X, height: 0.45 });
        }
      }
      // Orbs between fences
      push({ type: 'orb', x: 1.14, height: 0.5, golden: true });
      push({ type: 'orb', x: 1.16, height: 0.5 });
      push({ type: 'boost', x: 1.1 + skLen * 0.02 + 0.08, height: 0.5 });
    },
  },
  {
    name: 'SERPENTINE',
    threshold: 0.9569,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // SERPENTINE: winding barrier path that snakes up and down
      const seLen2 = 10;
      for (let se2 = 0; se2 < seLen2; se2++) {
        const seX3 = 1.1 + se2 * 0.018;
        const seH3 = 0.5 + Math.sin(se2 * 0.8) * 0.25;
        // Barrier walls on both sides of path
        push({ type: 'barrier', x: seX3, height: seH3 + 0.1 });
        push({ type: 'barrier', x: seX3, height: seH3 - 0.1 });
        // Orbs along the path center
        if (se2 % 2 === 0) {
          push({ type: 'orb', x: seX3, height: seH3, golden: se2 === 6 });
        }
      }
      push({ type: 'boost', x: 1.1 + seLen2 * 0.018 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'SPLIT PATH',
    threshold: 0.957,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // SPLIT PATH: barrier fork forcing upper or lower route choice
      const spForkX = 1.1;
      // Fork divider (center barrier wall)
      for (let sp = 0; sp < 6; sp++) {
        push({ type: 'barrier', x: spForkX + 0.02 + sp * 0.02, height: 0.5 });
      }
      // Upper path barriers (ceiling)
      for (let su = 0; su < 4; su++) {
        push({ type: 'barrier', x: spForkX + 0.03 + su * 0.025, height: 0.78 });
      }
      // Lower path barriers (floor)
      for (let sl = 0; sl < 4; sl++) {
        push({ type: 'barrier', x: spForkX + 0.03 + sl * 0.025, height: 0.22 });
      }
      // Upper path orbs
      push({ type: 'orb', x: spForkX + 0.06, height: 0.65, golden: true });
      push({ type: 'orb', x: spForkX + 0.08, height: 0.65 });
      // Lower path orbs
      push({ type: 'orb', x: spForkX + 0.06, height: 0.35 });
      push({ type: 'orb', x: spForkX + 0.08, height: 0.35 });
      push({ type: 'boost', x: spForkX + 0.14, height: 0.5 });
    },
  },
  {
    name: 'MINEFIELD',
    threshold: 0.9571,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // MINEFIELD: scattered small barrier clusters with safe orb paths
      const mfCount = 8;
      for (let mf = 0; mf < mfCount; mf++) {
        const mfX2 = 1.1 + mf * 0.025;
        const mfH2 = 0.25 + ((mf * 7 + 3) % 5) * 0.1;
        // Mine cluster (2 barriers close together)
        push({ type: 'barrier', x: mfX2, height: mfH2 });
        push({ type: 'barrier', x: mfX2 + 0.008, height: mfH2 + 0.05 });
        // Safe path orbs between clusters
        if (mf % 3 === 1) {
          const mfSafe = mfH2 > 0.5 ? mfH2 - 0.2 : mfH2 + 0.2;
          push({ type: 'orb', x: mfX2 + 0.012, height: mfSafe, golden: mf === 4 });
        }
      }
      push({ type: 'boost', x: 1.1 + mfCount * 0.025 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'WATCHTOWER',
    threshold: 0.9572,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // WATCHTOWER: tall barrier pillar with orbs orbiting around it
      const wtX2 = 1.13;
      // Central tower
      for (let wt = 0; wt < 5; wt++) {
        push({ type: 'barrier', x: wtX2, height: 0.3 + wt * 0.1 });
      }
      // Orbiting orbs around tower
      for (let wo = 0; wo < 6; wo++) {
        const woAngle = (wo / 6) * Math.PI * 2;
        const woR2 = 0.05;
        const woX2 = wtX2 + Math.cos(woAngle) * woR2;
        const woH2 = 0.5 + Math.sin(woAngle) * 0.2;
        push({ type: 'orb', x: woX2, height: woH2, golden: wo === 0 });
      }
      push({ type: 'boost', x: wtX2 + 0.1, height: 0.5 });
    },
  },
  {
    name: 'ZIGZAG WALL',
    threshold: 0.9573,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // ZIGZAG WALL: barrier wall with zigzag gap running through it
      const zzLen = 8;
      let zzH2 = 0.3;
      let zzDir2 = 1;
      for (let zz = 0; zz < zzLen; zz++) {
        const zzX2 = 1.1 + zz * 0.02;
        zzH2 += zzDir2 * 0.08;
        if (zzH2 > 0.75 || zzH2 < 0.25) zzDir2 *= -1;
        // Fill barriers above and below the gap
        push({ type: 'barrier', x: zzX2, height: zzH2 + 0.12 });
        push({ type: 'barrier', x: zzX2, height: zzH2 - 0.12 });
        // Orb in the gap
        if (zz % 2 === 0) {
          push({ type: 'orb', x: zzX2, height: zzH2, golden: zz === 4 });
        }
      }
      push({ type: 'boost', x: 1.1 + zzLen * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'TRAMPOLINE',
    threshold: 0.9574,
    minTime: 20,
    delay: 1.3,
    spawn: (push) => {
      // TRAMPOLINE: low barrier launch pads with orbs bouncing above
      const tmPads = 4;
      for (let tm = 0; tm < tmPads; tm++) {
        const tmX2 = 1.1 + tm * 0.04;
        // Launch pad (low barrier pair)
        push({ type: 'barrier', x: tmX2, height: 0.18 });
        push({ type: 'barrier', x: tmX2 + 0.01, height: 0.18 });
        // "Bouncing" orbs at different heights above
        const tmH2 = 0.4 + tm * 0.1;
        push({ type: 'orb', x: tmX2 + 0.005, height: tmH2, golden: tm === 2 });
        // Extra high orb on some pads
        if (tm % 2 === 0) {
          push({ type: 'orb', x: tmX2 + 0.005, height: tmH2 + 0.15 });
        }
      }
      push({ type: 'boost', x: 1.1 + tmPads * 0.04 + 0.02, height: 0.3 });
    },
  },
  {
    name: 'GAUNTLET RUN',
    threshold: 0.9575,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // GAUNTLET RUN: long narrow corridor with obstacles and rewards
      const grLen = 10;
      for (let gr = 0; gr < grLen; gr++) {
        const grX2 = 1.1 + gr * 0.018;
        // Corridor walls (top and bottom)
        push({ type: 'barrier', x: grX2, height: 0.68 });
        push({ type: 'barrier', x: grX2, height: 0.32 });
        // Internal obstacles every 3rd
        if (gr % 3 === 1) {
          push({ type: 'barrier', x: grX2, height: gr % 6 === 1 ? 0.55 : 0.45 });
        }
        // Orbs every 2nd
        if (gr % 2 === 0) {
          push({ type: 'orb', x: grX2, height: 0.5, golden: gr === 6 });
        }
      }
      push({ type: 'boost', x: 1.1 + grLen * 0.018 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'BRIDGE',
    threshold: 0.9576,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // BRIDGE: gap with barrier supports and orb roadway across middle
      const brSpan = 8;
      for (let br = 0; br < brSpan; br++) {
        const brX2 = 1.1 + br * 0.02;
        // Support pillars at edges
        if (br === 0 || br === brSpan - 1) {
          push({ type: 'barrier', x: brX2, height: 0.3 });
          push({ type: 'barrier', x: brX2, height: 0.7 });
        }
        // Roadway barriers (floor and ceiling of bridge)
        push({ type: 'barrier', x: brX2, height: 0.4 });
        push({ type: 'barrier', x: brX2, height: 0.6 });
        // Orbs along bridge deck
        if (br > 0 && br < brSpan - 1 && br % 2 === 0) {
          push({ type: 'orb', x: brX2, height: 0.5, golden: br === 4 });
        }
      }
      push({ type: 'boost', x: 1.1 + brSpan * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'PISTON',
    threshold: 0.9577,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // PISTON: alternating barrier blocks that create a pumping rhythm
      const piCount = 6;
      for (let pi = 0; pi < piCount; pi++) {
        const piX2 = 1.1 + pi * 0.025;
        const piUp = pi % 2 === 0;
        // Piston block
        push({ type: 'barrier', x: piX2, height: piUp ? 0.75 : 0.25 });
        push({ type: 'barrier', x: piX2 + 0.008, height: piUp ? 0.75 : 0.25 });
        // Orb in the gap
        push({ type: 'orb', x: piX2 + 0.004, height: piUp ? 0.45 : 0.55, golden: pi === 4 });
      }
      push({ type: 'boost', x: 1.1 + piCount * 0.025 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'ARROW VOLLEY',
    threshold: 0.9578,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // ARROW VOLLEY: cluster of arrow-shaped barrier formations
      const avArrows = 3;
      for (let av = 0; av < avArrows; av++) {
        const avBaseX = 1.1 + av * 0.06;
        const avBaseH = 0.3 + av * 0.15;
        // Arrow tip (3 barriers in V shape)
        push({ type: 'barrier', x: avBaseX, height: avBaseH });
        push({ type: 'barrier', x: avBaseX + 0.015, height: avBaseH + 0.08 });
        push({ type: 'barrier', x: avBaseX + 0.015, height: avBaseH - 0.08 });
        // Shaft (orbs trailing behind arrow)
        push({ type: 'orb', x: avBaseX + 0.03, height: avBaseH, golden: av === 1 });
        push({ type: 'orb', x: avBaseX + 0.045, height: avBaseH });
      }
      push({ type: 'boost', x: 1.1 + avArrows * 0.06 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'VORTEX DRAIN',
    threshold: 0.9579,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // VORTEX DRAIN: spiral inward pattern of barriers with golden orb at center
      const vdRings = 4;
      const vdPerRing = 5;
      for (let vr = 0; vr < vdRings; vr++) {
        for (let vp = 0; vp < vdPerRing; vp++) {
          const vdAngle = (vp / vdPerRing) * Math.PI * 2 + vr * 0.4;
          const vdR2 = 0.12 - vr * 0.025;
          const vdX2 = 1.15 + Math.cos(vdAngle) * vdR2;
          const vdH2 = 0.5 + Math.sin(vdAngle) * vdR2;
          if (vr < 3) {
            push({ type: 'barrier', x: vdX2, height: vdH2 });
          } else {
            push({ type: 'orb', x: vdX2, height: vdH2 });
          }
        }
      }
      // Golden orb at center
      push({ type: 'orb', x: 1.15, height: 0.5, golden: true });
      push({ type: 'boost', x: 1.25, height: 0.5 });
    },
  },
  {
    name: 'LABYRINTH',
    threshold: 0.958,
    minTime: 35,
    delay: 1.6,
    spawn: (push) => {
      // LABYRINTH: maze-like barrier structure with hidden path
      const lbW2 = 5;
      const lbH3 = 4;
      for (let lbR = 0; lbR < lbH3; lbR++) {
        for (let lbC = 0; lbC < lbW2; lbC++) {
          const lbX2 = 1.1 + lbC * 0.025;
          const lbHt = 0.2 + lbR * 0.18;
          // Create maze walls with gaps
          const lbOpen = (lbR + lbC) % 3 === 0;
          if (!lbOpen) {
            push({ type: 'barrier', x: lbX2, height: lbHt });
          } else { // Orbs in open spaces
            push({ type: 'orb', x: lbX2, height: lbHt, golden: lbR === 2 && lbC === 3 });
          }
        }
      }
      push({ type: 'boost', x: 1.1 + lbW2 * 0.025 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'CONVEYOR',
    threshold: 0.9581,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // CONVEYOR: parallel barrier rails with orbs moving between them
      const cvLen = 7;
      for (let cv2 = 0; cv2 < cvLen; cv2++) {
        const cvX3 = 1.1 + cv2 * 0.02;
        // Upper rail
        push({ type: 'barrier', x: cvX3, height: 0.65 });
        // Lower rail
        push({ type: 'barrier', x: cvX3, height: 0.35 });
        // Orbs between rails (alternating heights)
        if (cv2 % 2 === 1) {
          const cvOH = cv2 % 4 === 1 ? 0.55 : 0.45;
          push({ type: 'orb', x: cvX3, height: cvOH, golden: cv2 === 3 });
        }
      }
      push({ type: 'boost', x: 1.1 + cvLen * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'TERRACES',
    threshold: 0.9582,
    minTime: 30,
    delay: 1.4,
    spawn: (push) => {
      // TERRACES: descending step-like barrier platforms with orbs at each step
      const trSteps = 5;
      for (let tr = 0; tr < trSteps; tr++) {
        const trX2 = 1.1 + tr * 0.03;
        const trH2 = 0.8 - tr * 0.12; // descending from high to low
        // Step platform
        push({ type: 'barrier', x: trX2, height: trH2 });
        push({ type: 'barrier', x: trX2 + 0.01, height: trH2 });
        // Orb just above step
        push({ type: 'orb', x: trX2 + 0.005, height: trH2 + 0.1, golden: tr === 0 });
      }
      // Reward at bottom
      push({ type: 'boost', x: 1.1 + trSteps * 0.03 + 0.02, height: 0.25 });
    },
  },
  {
    name: 'CATAPULT',
    threshold: 0.9583,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // CATAPULT: barrier ramp launching into high orb cluster
      // Low barrier ramp
      for (let ct = 0; ct < 4; ct++) {
        const ctX2 = 1.1 + ct * 0.02;
        const ctH2 = 0.2 + ct * 0.05;
        push({ type: 'barrier', x: ctX2, height: ctH2 });
      }
      // Launch point
      push({ type: 'boost', x: 1.18, height: 0.4 });
      // High orb cluster (the "landing zone")
      for (let co4 = 0; co4 < 5; co4++) {
        const coX4 = 1.22 + co4 * 0.015;
        const coH4 = 0.75 + Math.sin(co4 * 1.2) * 0.08;
        push({ type: 'orb', x: coX4, height: coH4, golden: co4 === 2 });
      }
      // Barrier ceiling above
      push({ type: 'barrier', x: 1.25, height: 0.92 });
      push({ type: 'barrier', x: 1.27, height: 0.92 });
    },
  },
  {
    name: 'SCAFFOLD',
    threshold: 0.9584,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // SCAFFOLD: layered horizontal platforms with climbing orb path
      const sfLayers = 5;
      for (let sf = 0; sf < sfLayers; sf++) {
        const sfX2 = 1.1 + sf * 0.035;
        const sfH2 = 0.2 + sf * 0.12;
        // Platform barrier (horizontal pair)
        push({ type: 'barrier', x: sfX2, height: sfH2 - 0.04 });
        push({ type: 'barrier', x: sfX2 + 0.015, height: sfH2 - 0.04 });
        // Orb on top of platform
        push({ type: 'orb', x: sfX2 + 0.007, height: sfH2 + 0.06, golden: sf === sfLayers - 1 });
      }
      push({ type: 'boost', x: 1.1 + sfLayers * 0.035 + 0.02, height: 0.8 });
    },
  },
  {
    name: 'DIAMOND MINE',
    threshold: 0.9585,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // DIAMOND MINE: diamond-shaped barrier with golden orbs inside
      const dmSize = 3;
      for (let dm = 0; dm < dmSize * 2 + 1; dm++) {
        const dmDist2 = Math.abs(dm - dmSize);
        const dmX2 = 1.1 + dm * 0.02;
        const dmSpread = (dmSize - dmDist2) * 0.08;
        // Top and bottom barriers forming diamond
        push({ type: 'barrier', x: dmX2, height: 0.5 + dmSpread + 0.08 });
        push({ type: 'barrier', x: dmX2, height: 0.5 - dmSpread - 0.08 });
        // Golden orbs inside the diamond
        if (dmDist2 < dmSize) {
          push({ type: 'orb', x: dmX2, height: 0.5, golden: dm === dmSize });
        }
      }
      push({ type: 'boost', x: 1.1 + (dmSize * 2 + 1) * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'PORTCULLIS',
    threshold: 0.9586,
    minTime: 35,
    delay: 1.4,
    spawn: (push) => {
      // PORTCULLIS: vertical barrier columns with sliding gaps
      const pcCols = 6;
      for (let pc = 0; pc < pcCols; pc++) {
        const pcX2 = 1.1 + pc * 0.02;
        // Alternating gap positions (high/low)
        const pcGapH = pc % 2 === 0 ? 0.65 : 0.35;
        // Barrier above and below gap
        push({ type: 'barrier', x: pcX2, height: pcGapH + 0.15 });
        push({ type: 'barrier', x: pcX2, height: pcGapH - 0.15 });
        // Orb in gap
        push({ type: 'orb', x: pcX2, height: pcGapH, golden: pc === 3 });
      }
      push({ type: 'boost', x: 1.1 + pcCols * 0.02 + 0.03, height: 0.5 });
    },
  },
  {
    name: 'PARAPET',
    threshold: 0.9587,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // PARAPET: alternating tall/short barrier walls like castle battlements
      const ppCount = 8;
      for (let pp = 0; pp < ppCount; pp++) {
        const ppX2 = 1.1 + pp * 0.02;
        const ppTall = pp % 2 === 0;
        const ppH2 = ppTall ? 0.25 : 0.35;
        push({ type: 'barrier', x: ppX2, height: ppH2 });
        // Orbs above the short walls
        if (!ppTall) {
          push({ type: 'orb', x: ppX2, height: 0.5, golden: pp === 5 });
        }
      }
      // Top layer barriers
      for (let pp2 = 0; pp2 < ppCount; pp2++) {
        const pp2X = 1.1 + pp2 * 0.02;
        const pp2Tall = pp2 % 2 === 0;
        const pp2H = pp2Tall ? 0.75 : 0.65;
        push({ type: 'barrier', x: pp2X, height: pp2H });
        if (!pp2Tall) {
          push({ type: 'orb', x: pp2X, height: 0.55 });
        }
      }
      push({ type: 'boost', x: 1.1 + ppCount * 0.02 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'CROSSHATCH',
    threshold: 0.9588,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CROSSHATCH: diagonal barrier lines crossing with orbs at intersections
      const chLines = 4;
      for (let ch = 0; ch < chLines; ch++) {
        const chX2 = 1.1 + ch * 0.03;
        // Rising diagonal
        push({ type: 'barrier', x: chX2, height: 0.3 + ch * 0.1 });
        // Falling diagonal
        push({ type: 'barrier', x: chX2, height: 0.7 - ch * 0.1 });
        // Orb at crossing
        if (ch === 1 || ch === 2) {
          const chMid = 0.5;
          push({ type: 'orb', x: chX2 + 0.01, height: chMid, golden: ch === 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + chLines * 0.03 + 0.03, height: 0.5 });
    },
  },
  {
    name: 'FUNNEL',
    threshold: 0.9589,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // FUNNEL: barriers narrowing into a tight gap then opening with reward
      const fnSteps = 6;
      for (let fn = 0; fn < fnSteps; fn++) {
        const fnX2 = 1.1 + fn * 0.025;
        const fnHalf = 0.35 - fn * 0.05; // narrows from 0.35 to 0.1
        if (fnHalf > 0.05) {
          push({ type: 'barrier', x: fnX2, height: 0.5 + fnHalf });
          push({ type: 'barrier', x: fnX2, height: 0.5 - fnHalf });
        }
      }
      // Orb reward at narrow end
      for (let fo = 0; fo < 3; fo++) {
        const foX2 = 1.1 + fnSteps * 0.025 + fo * 0.015;
        push({ type: 'orb', x: foX2, height: 0.5, golden: fo === 1 });
      }
      push({ type: 'boost', x: 1.1 + fnSteps * 0.025 + 0.06, height: 0.5 });
    },
  },
  {
    name: 'CHEVRON',
    threshold: 0.959,
    minTime: 20,
    delay: 1.3,
    spawn: (push) => {
      // CHEVRON: V-shaped barrier formation pointing at player with orbs in wake
      const cvRows = 4;
      for (let cv = 0; cv < cvRows; cv++) {
        const cvX2 = 1.1 + cv * 0.025;
        const cvSpread = cv * 0.1;
        // Upper arm
        push({ type: 'barrier', x: cvX2, height: 0.5 + cvSpread });
        // Lower arm
        push({ type: 'barrier', x: cvX2, height: 0.5 - cvSpread });
      }
      // Orbs in the wake (behind the V)
      for (let co3 = 0; co3 < 4; co3++) {
        const coX3 = 1.1 + cvRows * 0.025 + 0.01 + co3 * 0.02;
        push({ type: 'orb', x: coX3, height: 0.5 + (co3 % 2 === 0 ? 0.05 : -0.05), golden: co3 === 2 });
      }
      push({ type: 'boost', x: 1.1 + cvRows * 0.025 + 0.1, height: 0.5 });
    },
  },
  {
    name: 'HOURGLASS',
    threshold: 0.9591,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // HOURGLASS: narrow pinch point with barriers flaring out above and below
      const hgLayers = 4;
      for (let hg = 0; hg < hgLayers; hg++) {
        const hgX2 = 1.1 + hg * 0.025;
        const hgSpread = Math.abs(hg - 1.5) / 1.5; // wide at edges, narrow at center
        const hgH1 = 0.5 + hgSpread * 0.3;
        const hgH2 = 0.5 - hgSpread * 0.3;
        push({ type: 'barrier', x: hgX2, height: hgH1 });
        push({ type: 'barrier', x: hgX2, height: hgH2 });
        // Orbs in center gap
        if (hg === 1 || hg === 2) {
          push({ type: 'orb', x: hgX2, height: 0.5, golden: hg === 2 });
        }
      }
      // Reward after
      push({ type: 'orb', x: 1.1 + hgLayers * 0.025 + 0.02, height: 0.5, golden: true });
      push({ type: 'boost', x: 1.1 + hgLayers * 0.025 + 0.04, height: 0.5 });
    },
  },
  {
    name: 'RICOCHET',
    threshold: 0.9592,
    minTime: 25,
    delay: 1.3,
    spawn: (push) => {
      // RICOCHET: zigzag barrier bouncing path with orbs at each bounce point
      const rcBounces = 6;
      let rcH2 = 0.3;
      let rcDir = 1;
      for (let rc = 0; rc < rcBounces; rc++) {
        const rcX2 = 1.1 + rc * 0.03;
        rcH2 += rcDir * 0.15;
        if (rcH2 > 0.8 || rcH2 < 0.2) rcDir *= -1;
        // Barrier at edge
        push({ type: 'barrier', x: rcX2, height: rcH2 + rcDir * 0.12 });
        // Orb at bounce apex
        push({ type: 'orb', x: rcX2 + 0.01, height: rcH2, golden: rc === 3 });
      }
      push({ type: 'boost', x: 1.1 + rcBounces * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'SLUICE GATE',
    threshold: 0.9593,
    minTime: 25,
    delay: 1.4,
    spawn: (push) => {
      // SLUICE GATE: alternating high/low barrier gates with orbs flowing through
      const sgGates = 5;
      for (let sg = 0; sg < sgGates; sg++) {
        const sgX2 = 1.1 + sg * 0.04;
        const sgHigh = sg % 2 === 0;
        // Gate barrier (top or bottom)
        if (sgHigh) {
          push({ type: 'barrier', x: sgX2, height: 0.8 });
          push({ type: 'barrier', x: sgX2, height: 0.7 });
          // Orb in low gap
          push({ type: 'orb', x: sgX2, height: 0.3 });
        } else {
          push({ type: 'barrier', x: sgX2, height: 0.2 });
          push({ type: 'barrier', x: sgX2, height: 0.3 });
          // Orb in high gap
          push({ type: 'orb', x: sgX2, height: 0.7, golden: sg === 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + sgGates * 0.04 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'HELICAL PATH',
    threshold: 0.9594,
    minTime: 30,
    delay: 1.8,
    spawn: (push) => {
      // HELICAL PATH: spiraling tunnel of barriers with orbs along the helix
      const hpTurns = 3;
      const hpPointsPerTurn = 6;
      const hpTotal = hpTurns * hpPointsPerTurn;
      for (let hp = 0; hp < hpTotal; hp++) {
        const hpAngle = (hp / hpPointsPerTurn) * Math.PI * 2;
        const hpX2 = 1.1 + hp * 0.015;
        const hpH2 = 0.5 + Math.sin(hpAngle) * 0.25;
        push({ type: 'barrier', x: hpX2, height: hpH2 });
        // Orbs in the open center of helix
        if (hp % 3 === 1) {
          const hpOrbH = 0.5 + Math.sin(hpAngle + Math.PI) * 0.12;
          push({ type: 'orb', x: hpX2 + 0.005, height: hpOrbH, golden: hp === 7 });
        }
      }
      push({ type: 'boost', x: 1.1 + hpTotal * 0.015 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'LATTICE',
    threshold: 0.9595,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // LATTICE: grid of barriers with regular holes to weave through
      const ltRows = 4;
      const ltCols = 5;
      for (let lr = 0; lr < ltRows; lr++) {
        for (let lc = 0; lc < ltCols; lc++) {
          const lx = 1.1 + lc * 0.03;
          const lh = 0.25 + lr * 0.15;
          // Checkerboard — skip every other position for holes
          if ((lr + lc) % 2 === 0) {
            push({ type: 'barrier', x: lx, height: lh });
          } else { // Orb in the hole
            if (lr === 1 && lc === 2) {
              push({ type: 'orb', x: lx, height: lh, golden: true });
            } else if ((lr + lc) % 4 === 1) {
              push({ type: 'orb', x: lx, height: lh });
            }
          }
        }
      }
      push({ type: 'boost', x: 1.1 + ltCols * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'WAVE RIDER',
    threshold: 0.9676,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // WAVE RIDER: sinusoidal wave of barriers below with orb trail riding the crest
      const wrLen = 10;
      const wrAmp = 0.2;
      const wrFreq = 2;
      const wrBase = 0.5;
      for (let wi = 0; wi < wrLen; wi++) {
        const wx = 1.1 + wi * 0.025;
        const progress = wi / (wrLen - 1);
        const waveH = wrBase + Math.sin(progress * Math.PI * wrFreq) * wrAmp;
        // Barrier below the wave crest
        push({ type: 'barrier', x: wx, height: Math.min(0.95, waveH + 0.1) });
        // Orb riding the crest
        const crestH = Math.max(0.05, waveH - 0.05);
        push({ type: 'orb', x: wx + 0.01, height: crestH, golden: wi === Math.floor(wrLen / 2) });
      }
      push({ type: 'boost', x: 1.1 + wrLen * 0.025 + 0.02, height: wrBase });
    },
  },
  {
    name: 'ZIGZAG FENCE',
    threshold: 0.9677,
    minTime: 35,
    delay: 1.3,
    spawn: (push) => {
      // ZIGZAG FENCE: two parallel zigzag barriers with orbs in channel between
      const fenceLen = 8;
      const fenceCenter = 0.45 + Math.random() * 0.1;
      const fenceWidth = 0.15;
      for (let fi = 0; fi < fenceLen; fi++) {
        const fx = 1.1 + fi * 0.025;
        const zigzag = Math.sin(fi * 1.2) * 0.08;
        const topFence = fenceCenter - fenceWidth + zigzag;
        const botFence = fenceCenter + fenceWidth + zigzag;
        push({ type: 'barrier', x: fx, height: Math.max(0.05, topFence) });
        push({ type: 'barrier', x: fx, height: Math.min(0.95, botFence) });
        // Orbs in the channel
        if (fi % 2 === 1) {
          push({ type: 'orb', x: fx + 0.01, height: fenceCenter + zigzag, golden: fi >= fenceLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + fenceLen * 0.025 + 0.02, height: fenceCenter });
    },
  },
  {
    name: 'CROSSHAIR',
    threshold: 0.9678,
    minTime: 40,
    delay: 1.3,
    spawn: (push) => {
      // CROSSHAIR: barriers forming + shape with orbs in quadrants
      const chCenter = 0.4 + Math.random() * 0.2;
      const chX = 1.12;
      const chSize = 0.15;
      // Vertical bar of barriers
      for (let vi = 0; vi < 3; vi++) {
        const vH = chCenter - chSize + vi * chSize;
        if (vH > 0.05 && vH < 0.95) {
          push({ type: 'barrier', x: chX, height: vH });
        }
      }
      // Horizontal bar of barriers
      for (let hi = 0; hi < 3; hi++) {
        const hOffset = -0.04 + hi * 0.04;
        if (hOffset !== 0) { // skip center (already placed)
          push({ type: 'barrier', x: chX + hOffset, height: chCenter });
        }
      }
      // Orbs in each quadrant
      const quadrants = [
      { dx: -0.025, dh: -chSize * 0.6
      }
      ,
      { dx: 0.025, dh: -chSize * 0.6
      }
      ,
      { dx: -0.025, dh: chSize * 0.6
      }
      ,
      { dx: 0.025, dh: chSize * 0.6
      }
      ,
      ];
      for (let qi = 0; qi < quadrants.length; qi++) {
        const qh = chCenter + quadrants[qi].dh;
        if (qh > 0.05 && qh < 0.95) {
          push({ type: 'orb', x: chX + quadrants[qi].dx, height: qh, golden: qi === 0 });
        }
      }
      push({ type: 'boost', x: chX + 0.06, height: chCenter });
    },
  },
  {
    name: 'PULSAR',
    threshold: 0.9679,
    minTime: 55,
    delay: 1.5,
    spawn: (push) => {
      // PULSAR: central barrier that sends wave barriers outward with safe timing gaps
      const pulsarCenter = 0.4 + Math.random() * 0.2;
      const pulsarX = 1.12;
      // Central barrier
      push({ type: 'barrier', x: pulsarX, height: pulsarCenter });
      // 3 outward waves
      for (let wave = 0; wave < 3; wave++) {
        const waveR = 0.1 + wave * 0.08;
        const waveSpacing = wave * 0.035;
        // Barriers above and below center (expanding ring)
        const topH = pulsarCenter - waveR;
        const botH = pulsarCenter + waveR;
        if (topH > 0.05) {
          push({ type: 'barrier', x: pulsarX + waveSpacing, height: topH });
        }
        if (botH < 0.95) {
          push({ type: 'barrier', x: pulsarX + waveSpacing, height: botH });
        }
        // Orbs in the gaps between waves
        const gapH = pulsarCenter - waveR + 0.04;
        if (gapH > 0.05 && gapH < 0.95) {
          push({ type: 'orb', x: pulsarX + waveSpacing + 0.015, height: pulsarCenter, golden: wave === 2 });
        }
      }
      push({ type: 'boost', x: pulsarX + 0.12, height: pulsarCenter });
    },
  },
  {
    name: 'IRIS',
    threshold: 0.968,
    minTime: 50,
    delay: 1.3,
    spawn: (push) => {
      // IRIS: circular iris of barrier segments that opens and closes
      const irisCenter = 0.4 + Math.random() * 0.2;
      const irisCx = 1.12;
      const irisR = 0.18;
      const segments = 8;
      // Two iris states: open (gap at top/bottom) and semi-closed
      for (let si = 0; si < segments; si++) {
        const angle = (si / segments) * Math.PI * 2;
        const isGap = si === 0 || si === segments / 2; // gaps at top and bottom
        if (isGap) { // Orb in the gap
          const orbH = irisCenter + Math.sin(angle) * irisR;
          if (orbH > 0.05 && orbH < 0.95) {
            push({ type: 'orb', x: irisCx + Math.cos(angle) * irisR * 0.3, height: orbH, golden: si === 0 });
          }
        } else {
          const bH = irisCenter + Math.sin(angle) * irisR;
          const bX = irisCx + Math.cos(angle) * irisR * 0.3;
          if (bH > 0.05 && bH < 0.95) {
            push({ type: 'barrier', x: bX, height: bH });
          }
        }
      }
      push({ type: 'boost', x: irisCx, height: irisCenter });
    },
  },
  {
    name: 'RIPPLE',
    threshold: 0.9681,
    minTime: 45,
    delay: 1.5,
    spawn: (push) => {
      // RIPPLE: concentric rings of barriers expanding outward with gaps
      const rippleCenter = 0.4 + Math.random() * 0.2;
      const rippleCx = 1.14;
      const ringCount = 4;
      for (let ri = 0; ri < ringCount; ri++) {
        const ringR = 0.06 + ri * 0.07;
        const gapAngle = (ri * 1.3 + 0.5) % (Math.PI * 2); // gap position varies per ring
        const points = 6;
        for (let pi = 0; pi < points; pi++) {
          const angle = (pi / points) * Math.PI * 2;
          // Skip the gap region
          if (Math.abs(angle - gapAngle) < 0.8) { // Place orb in the gap
            if (Math.abs(angle - gapAngle) < 0.3) {
              const orbH = rippleCenter + Math.sin(angle) * ringR;
              const orbX = rippleCx + Math.cos(angle) * ringR * 0.4;
              if (orbH > 0.05 && orbH < 0.95) {
                push({ type: 'orb', x: orbX, height: orbH, golden: ri === ringCount - 1 });
              }
            }
            continue;
          }
          const bH = rippleCenter + Math.sin(angle) * ringR;
          const bX = rippleCx + Math.cos(angle) * ringR * 0.4;
          if (bH > 0.05 && bH < 0.95) {
            push({ type: 'barrier', x: bX, height: bH });
          }
        }
      }
      push({ type: 'boost', x: rippleCx, height: rippleCenter });
    },
  },
  {
    name: 'HOURGLASS',
    threshold: 0.9682,
    minTime: 40,
    delay: 1.4,
    spawn: (push) => {
      // HOURGLASS: two triangular formations meeting at a narrow center point
      const hgLen = 8;
      const hgCenter = 0.5;
      for (let hi = 0; hi < hgLen; hi++) {
        const hx = 1.1 + hi * 0.03;
        const progress = hi / (hgLen - 1);
        // Hourglass shape: wide at ends, narrow at center
        const spread = 0.3 * Math.abs(2 * progress - 1);
        const topBarrier = hgCenter - spread - 0.06;
        const botBarrier = hgCenter + spread + 0.06;
        if (topBarrier > 0.05) {
          push({ type: 'barrier', x: hx, height: topBarrier });
        }
        if (botBarrier < 0.95) {
          push({ type: 'barrier', x: hx, height: botBarrier });
        }
        // Orbs in the passage
        if (hi % 2 === 1) {
          push({ type: 'orb', x: hx + 0.01, height: hgCenter, golden: hi === Math.floor(hgLen / 2) });
        }
      }
      push({ type: 'boost', x: 1.1 + hgLen * 0.03 + 0.02, height: hgCenter });
    },
  },
  {
    name: 'ACCORDION',
    threshold: 0.9683,
    minTime: 35,
    delay: 1.3,
    spawn: (push) => {
      // ACCORDION: barriers compress and expand like bellows
      const accLen = 8;
      for (let ai = 0; ai < accLen; ai++) {
        const ax = 1.1 + ai * 0.025;
        const progress = ai / (accLen - 1);
        // Bellows pattern: gap oscillates between narrow and wide
        const gapWidth = 0.08 + Math.sin(progress * Math.PI * 3) * 0.06;
        const gapCenter = 0.5 + Math.sin(progress * Math.PI * 1.5) * 0.15;
        push({ type: 'barrier', x: ax, height: Math.max(0.05, gapCenter - gapWidth - 0.02) });
        push({ type: 'barrier', x: ax, height: Math.min(0.95, gapCenter + gapWidth + 0.02) });
        // Orbs in the wider gaps
        if (gapWidth > 0.1 && ai % 2 === 0) {
          push({ type: 'orb', x: ax + 0.01, height: gapCenter, golden: ai >= accLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + accLen * 0.025 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'STAIRCASE SPIRAL',
    threshold: 0.9684,
    minTime: 45,
    delay: 1.4,
    spawn: (push) => {
      // STAIRCASE SPIRAL: ascending stair steps curving into a spiral at the landing
      const stairSteps = 6;
      let stairH = 0.15 + Math.random() * 0.15;
      const stairDir = Math.random() > 0.5 ? 1 : -1;
      const stepSize = 0.08 * stairDir;
      for (let si = 0; si < stairSteps; si++) {
        const sx = 1.1 + si * 0.03;
        stairH += stepSize;
        stairH = Math.max(0.1, Math.min(0.9, stairH));
        // Step platform (barrier)
        push({ type: 'barrier', x: sx, height: stairH });
        // Orb above/below the step
        const orbAbove = stairH + stepSize * 0.6;
        if (orbAbove > 0.05 && orbAbove < 0.95) {
          push({ type: 'orb', x: sx + 0.012, height: orbAbove, golden: false });
        }
      }
      // Spiral at the landing
      const spiralCenter = stairH;
      const spiralSteps = 4;
      for (let si = 0; si < spiralSteps; si++) {
        const angle = (si / spiralSteps) * Math.PI * 1.5;
        const spiralR = 0.08 + si * 0.02;
        const spH = spiralCenter + Math.sin(angle) * spiralR;
        const spX = 1.1 + stairSteps * 0.03 + 0.01 + si * 0.015;
        if (spH > 0.05 && spH < 0.95) {
          push({ type: 'orb', x: spX, height: spH, golden: si === spiralSteps - 1 });
        }
      }
      push({ type: 'boost', x: 1.1 + stairSteps * 0.03 + spiralSteps * 0.015 + 0.03, height: spiralCenter });
    },
  },
  {
    name: 'FUNNEL',
    threshold: 0.9685,
    minTime: 40,
    delay: 1.4,
    spawn: (push) => {
      // FUNNEL: wide opening narrows to tight passage then widens again
      const funnelLen = 10;
      const funnelCenter = 0.4 + Math.random() * 0.2;
      for (let fi = 0; fi < funnelLen; fi++) {
        const fx = 1.1 + fi * 0.025;
        const progress = fi / (funnelLen - 1);
        // Width narrows to center then widens: 1->0.1->1 parabola
        const width = 0.1 + 0.3 * Math.pow(2 * progress - 1, 2);
        push({ type: 'barrier', x: fx, height: Math.max(0.05, funnelCenter - width) });
        push({ type: 'barrier', x: fx, height: Math.min(0.95, funnelCenter + width) });
        // Orbs along the center path
        if (fi % 2 === 1) {
          push({ type: 'orb', x: fx + 0.01, height: funnelCenter, golden: fi === Math.floor(funnelLen / 2) });
        }
      }
      push({ type: 'boost', x: 1.1 + funnelLen * 0.025 + 0.02, height: funnelCenter });
    },
  },
  {
    name: 'DIAMOND RUSH',
    threshold: 0.9686,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // DIAMOND RUSH: diamond formations of barriers with orb cores
      const diamondCount = 3;
      for (let di = 0; di < diamondCount; di++) {
        const dcx = 1.1 + di * 0.07;
        const dcy = 0.25 + di * 0.2;
        const dSize = 0.12;
        // 4 barrier points forming a diamond (top, right, bottom, left)
        push({ type: 'barrier', x: dcx, height: Math.max(0.05, dcy - dSize) }); // top
        push({ type: 'barrier', x: dcx + 0.025, height: dcy }); // right
        push({ type: 'barrier', x: dcx, height: Math.min(0.95, dcy + dSize) }); // bottom
        push({ type: 'barrier', x: dcx - 0.025, height: dcy }); // left
        // Orb core at center
        push({ type: 'orb', x: dcx, height: dcy, golden: di === diamondCount - 1 });
      }
      // Boost after all diamonds
      push({ type: 'boost', x: 1.1 + diamondCount * 0.07 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'CASCADE',
    threshold: 0.9687,
    minTime: 30,
    delay: 1.3,
    spawn: (push) => {
      // CASCADE: waterfall of orbs flowing down through barrier shelves
      const shelfCount = 4;
      const shelfSpacing = 0.04;
      for (let si = 0; si < shelfCount; si++) {
        const sx = 1.1 + si * shelfSpacing;
        const shelfH = 0.15 + si * 0.18; // shelves going downward (higher = lower in game)
        // Barrier shelf (horizontal bar)
        push({ type: 'barrier', x: sx, height: Math.min(0.95, shelfH) });
        // Orbs "falling" between shelves — cascade pattern
        const orbCount = 3;
        for (let oi = 0; oi < orbCount; oi++) {
          const orbX = sx + 0.008 + oi * 0.01;
          const orbH = shelfH + 0.06 + oi * 0.03;
          if (orbH > 0.05 && orbH < 0.95) {
            push({ type: 'orb', x: orbX, height: orbH, golden: si === shelfCount - 1 && oi === orbCount - 1 });
          }
        }
      }
      // Boost at the bottom of the cascade
      push({ type: 'boost', x: 1.1 + shelfCount * shelfSpacing + 0.02, height: 0.85 });
    },
  },
  {
    name: 'SWITCHBACK',
    threshold: 0.9688,
    minTime: 40,
    delay: 1.3,
    spawn: (push) => {
      // SWITCHBACK: rapid back-and-forth path with tight reversals
      const switchLen = 8;
      let switchH = 0.2 + Math.random() * 0.2;
      const switchDir = [1, 1, -1, -1, 1, 1, -1, -1]; // zigzag direction pattern
      for (let j = 0; j < switchLen; j++) {
        const sx = 1.1 + j * 0.03;
        switchH += switchDir[j % switchDir.length] * 0.12;
        switchH = Math.max(0.1, Math.min(0.9, switchH));
        // Barriers flanking the path on both sides
        push({ type: 'barrier', x: sx, height: Math.max(0.05, switchH - 0.15) });
        push({ type: 'barrier', x: sx, height: Math.min(0.95, switchH + 0.15) });
        // Orbs on the path
        if (j % 2 === 0) {
          push({ type: 'orb', x: sx + 0.012, height: switchH, golden: j >= switchLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + switchLen * 0.03 + 0.02, height: switchH });
    },
  },
  {
    name: 'PINBALL',
    threshold: 0.9689,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // PINBALL: bumper barriers in a grid with orbs scattered between them
      const bumperRows = 3;
      const bumperCols = 4;
      for (let row = 0; row < bumperRows; row++) {
        for (let col = 0; col < bumperCols; col++) {
          const bx = 1.1 + col * 0.04 + (row % 2) * 0.02; // staggered grid
          const bh = 0.2 + row * 0.25 + (col % 2) * 0.05;
          if (bh > 0.05 && bh < 0.95) {
            push({ type: 'barrier', x: bx, height: bh });
          }
          // Orbs in gaps between bumpers
          if (col < bumperCols - 1) {
            const orbH = bh + 0.12;
            if (orbH > 0.05 && orbH < 0.95) {
              push({ type: 'orb', x: bx + 0.02, height: orbH, golden: row === bumperRows - 1 && col === bumperCols - 2 });
            }
          }
        }
      }
      // Boost at the exit
      push({ type: 'boost', x: 1.1 + bumperCols * 0.04 + 0.03, height: 0.5 });
    },
  },
  {
    name: 'DOUBLE HELIX GATE',
    threshold: 0.969,
    minTime: 45,
    delay: 1.5,
    spawn: (push) => {
      // DOUBLE HELIX GATE: two intertwined sine waves of barriers with gates where they cross
      const helixLen = 12;
      const helixAmp = 0.25;
      const helixFreq = 1.5;
      for (let j = 0; j < helixLen; j++) {
        const hx = 1.1 + j * 0.025;
        const progress = j / (helixLen - 1);
        const strand1 = 0.5 + Math.sin(progress * Math.PI * helixFreq) * helixAmp;
        const strand2 = 0.5 - Math.sin(progress * Math.PI * helixFreq) * helixAmp;
        // Barriers on both strands
        push({ type: 'barrier', x: hx, height: Math.max(0.05, Math.min(0.95, strand1)) });
        push({ type: 'barrier', x: hx, height: Math.max(0.05, Math.min(0.95, strand2)) });
        // At crossing points (where strands are close), place orb in safe zone
        const strandDist = Math.abs(strand1 - strand2);
        if (strandDist < 0.15) {
          const safeH = strand1 > 0.5 ? Math.min(0.95, Math.max(strand1, strand2) + 0.15) : Math.max(0.05, Math.min(strand1, strand2) - 0.15);
          push({ type: 'orb', x: hx + 0.01, height: safeH, golden: true });
        } else if (j % 3 === 1) { // Orb between the strands
          push({ type: 'orb', x: hx + 0.01, height: 0.5, golden: false });
        }
      }
      push({ type: 'boost', x: 1.1 + helixLen * 0.025 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'GAUNTLET MAZE',
    threshold: 0.9691,
    minTime: 50,
    delay: 1.5,
    spawn: (push) => {
      // GAUNTLET MAZE: alternating thick walls from top/bottom with narrow threading gaps and orb rewards
      const gauntletWalls = 6;
      const gauntletSpacing = 0.04;
      for (let gi = 0; gi < gauntletWalls; gi++) {
        const gx = 1.1 + gi * gauntletSpacing;
        const fromTop = gi % 2 === 0;
        // Wall covers most of the height, gap is narrow
        const gapCenter = 0.3 + Math.sin(gi * 1.8 + 0.5) * 0.2;
        const gapSize = 0.14;
        if (fromTop) { // Barriers from top down to gap
          for (let bi = 0; bi < 3; bi++) {
            const bh = 0.05 + bi * (gapCenter - gapSize - 0.05) / 2.5;
            push({ type: 'barrier', x: gx, height: Math.max(0.05, Math.min(0.95, bh)) });
          }
        } else { // Barriers from bottom up to gap
          for (let bi = 0; bi < 3; bi++) {
            const bh = 0.95 - bi * (0.95 - gapCenter - gapSize) / 2.5;
            push({ type: 'barrier', x: gx, height: Math.max(0.05, Math.min(0.95, bh)) });
          }
        }
        // Orb in the gap
        push({ type: 'orb', x: gx + 0.015, height: gapCenter, golden: gi >= gauntletWalls - 2 });
      }
      // Boost at the end
      push({ type: 'boost', x: 1.1 + gauntletWalls * gauntletSpacing + 0.02, height: 0.5 });
    },
  },
  {
    name: 'TIGHTROPE',
    threshold: 0.9692,
    minTime: 55,
    delay: 1.5,
    spawn: (push) => {
      // TIGHTROPE: very narrow corridor with closely-spaced barriers and high rewards
      const tightLen = 10;
      const tightCenter = 0.4 + Math.random() * 0.2;
      const tightGap = 0.1; // very narrow
      for (let j = 0; j < tightLen; j++) {
        const tx = 1.1 + j * 0.02;
        const drift = Math.sin(j * 0.7) * 0.04; // gentle curve
        const center = tightCenter + drift;
        // Upper barrier (very close)
        push({ type: 'barrier', x: tx, height: Math.max(0.05, center - tightGap) });
        // Lower barrier (very close)
        push({ type: 'barrier', x: tx, height: Math.min(0.95, center + tightGap) });
        // Every orb is golden (high reward for high risk)
        if (j % 2 === 0) {
          push({ type: 'orb', x: tx + 0.008, height: center, golden: true });
        }
      }
      // Double boost reward at end
      push({ type: 'boost', x: 1.1 + tightLen * 0.02 + 0.02, height: tightCenter });
    },
  },
  {
    name: 'BRACKETS',
    threshold: 0.9694,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // BRACKETS: matched opening/closing bracket formations of barriers
      const bracketPairs = 3;
      for (let bi = 0; bi < bracketPairs; bi++) {
        const bx1 = 1.1 + bi * 0.08;
        const bx2 = bx1 + 0.04; // closing bracket
        const bCenter = 0.25 + bi * 0.2;
        const bSpread = 0.12;
        // Opening bracket [ (top and bottom barriers)
        push({ type: 'barrier', x: bx1, height: Math.max(0.05, bCenter - bSpread) });
        push({ type: 'barrier', x: bx1, height: Math.min(0.95, bCenter + bSpread) });
        // Closing bracket ] (top and bottom barriers)
        push({ type: 'barrier', x: bx2, height: Math.max(0.05, bCenter - bSpread) });
        push({ type: 'barrier', x: bx2, height: Math.min(0.95, bCenter + bSpread) });
        // Orb treasure inside the brackets
        push({ type: 'orb', x: bx1 + 0.02, height: bCenter, golden: bi === bracketPairs - 1 });
      }
      // Boost after all brackets
      push({ type: 'boost', x: 1.1 + bracketPairs * 0.08 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'PRISON BREAK',
    threshold: 0.9696,
    minTime: 50,
    delay: 1.5,
    spawn: (push) => {
      // PRISON BREAK: thick barrier walls forming a prison cell with one breakout gap
      const cellX = 1.1;
      const cellCenter = 0.4 + Math.random() * 0.2;
      const cellH = 0.3;
      const gapSide = Math.random() < 0.5 ? 0 : 1; // 0 = left wall gap, 1 = right wall gap
      // Left wall
      for (let j = 0; j < 3; j++) {
        const wallH = cellCenter - cellH / 2 + (j / 2) * cellH;
        if (gapSide === 0 && j === 1) continue; // gap in left wall
        push({ type: 'barrier', x: cellX, height: Math.max(0.05, Math.min(0.95, wallH)) });
      }
      // Top/bottom walls
      for (let j = 0; j < 3; j++) {
        const wx = cellX + 0.015 + j * 0.015;
        push({ type: 'barrier', x: wx, height: Math.max(0.05, cellCenter - cellH / 2 - 0.05) });
        push({ type: 'barrier', x: wx, height: Math.min(0.95, cellCenter + cellH / 2 + 0.05) });
      }
      // Right wall
      for (let j = 0; j < 3; j++) {
        const wallH = cellCenter - cellH / 2 + (j / 2) * cellH;
        if (gapSide === 1 && j === 1) continue; // gap in right wall
        push({ type: 'barrier', x: cellX + 0.06, height: Math.max(0.05, Math.min(0.95, wallH)) });
      }
      // Treasure inside the cell
      push({ type: 'boost', x: cellX + 0.03, height: cellCenter });
      push({ type: 'orb', x: cellX + 0.03, height: cellCenter + 0.05, golden: true });
      push({ type: 'orb', x: cellX + 0.03, height: cellCenter - 0.05, golden: true });
    },
  },
  {
    name: 'TWIN SPIRAL',
    threshold: 0.9698,
    minTime: 45,
    delay: 1.5,
    spawn: (push) => {
      // TWIN SPIRAL: two spirals rotating in opposite directions
      const spiralLen = 10;
      const spiralCenter = 0.5;
      const spiralAmp = 0.3;
      for (let j = 0; j < spiralLen; j++) {
        const progress = j / (spiralLen - 1);
        const sx2 = 1.1 + j * 0.028;
        // Spiral A (clockwise)
        const hA = spiralCenter + Math.sin(progress * Math.PI * 2) * spiralAmp * (1 - progress * 0.3);
        // Spiral B (counter-clockwise)
        const hB = spiralCenter - Math.sin(progress * Math.PI * 2) * spiralAmp * (1 - progress * 0.3);
        push({ type: 'orb', x: sx2, height: Math.max(0.05, Math.min(0.95, hA)), golden: j >= spiralLen - 2 });
        if (j % 2 === 0) {
          push({ type: 'orb', x: sx2 + 0.01, height: Math.max(0.05, Math.min(0.95, hB)) });
        }
        // Barrier at crossing points
        if (Math.abs(hA - hB) < 0.1 && j > 1 && j < spiralLen - 2) {
          push({ type: 'barrier', x: sx2, height: Math.max(0.05, spiralCenter + 0.2) });
          push({ type: 'barrier', x: sx2, height: Math.min(0.95, spiralCenter - 0.2) });
        }
      }
      push({ type: 'boost', x: 1.1 + spiralLen * 0.028 + 0.02, height: spiralCenter });
    },
  },
  {
    name: 'CONVEYOR',
    threshold: 0.97,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // CONVEYOR: objects on a moving belt — barriers oscillate vertically
      const conveyorLen = 8;
      const beltCenter = 0.45 + Math.random() * 0.1;
      for (let j = 0; j < conveyorLen; j++) {
        const cx2 = 1.1 + j * 0.03;
        if (j % 3 === 0) { // Moving barrier on the belt (oscillates up and down)
          push({
          type: 'barrier', x: cx2,
          height: beltCenter + (j % 2 === 0 ? 0.15 : -0.15),
          moving: 1.8, baseHeight: beltCenter + (j % 2 === 0 ? 0.15 : -0.15),
          });
        } else { // Orbs between the moving barriers
          push({ type: 'orb', x: cx2, height: beltCenter, golden: j >= conveyorLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + conveyorLen * 0.03 + 0.02, height: beltCenter });
    },
  },
  {
    name: 'LABYRINTH',
    threshold: 0.9702,
    minTime: 55,
    delay: 1.2,
    spawn: (push) => {
      // LABYRINTH: maze-like configuration — walls with gaps that shift per row
      const mazeRows = 3;
      const mazeCols = 5;
      const mazeGaps: number[] = [];
      let lastGap = Math.floor(Math.random() * mazeRows);
      for (let col = 0; col < mazeCols; col++) { // Gap shifts by 0 or ±1 from previous (connected path)
        const shift = col === 0 ? 0 : (Math.random() < 0.5 ? 1 : -1);
        lastGap = Math.max(0, Math.min(mazeRows - 1, lastGap + shift));
        mazeGaps.push(lastGap);
      }
      for (let col = 0; col < mazeCols; col++) {
        const mx = 1.1 + col * 0.04;
        for (let row = 0; row < mazeRows; row++) {
          const mh = 0.2 + (row / (mazeRows - 1)) * 0.6;
          if (row === mazeGaps[col]) {
            push({ type: 'orb', x: mx + 0.015, height: mh, golden: col >= mazeCols - 2 });
          } else {
            push({ type: 'barrier', x: mx, height: mh });
          }
        }
      }
      push({ type: 'boost', x: 1.1 + mazeCols * 0.04 + 0.02, height: 0.2 + mazeGaps[mazeCols - 1] / (mazeRows - 1) * 0.6 });
    },
  },
  {
    name: 'ORBIT',
    threshold: 0.9704,
    minTime: 40,
    delay: 1.2,
    spawn: (push) => {
      // ORBIT: orbs arranged in concentric circles around a central boost
      const orbitCenter = 0.4 + Math.random() * 0.2;
      const rings = 3;
      for (let ring = 1; ring <= rings; ring++) {
        const orbCount = 3 + ring;
        const orbR = ring * 0.08;
        for (let oi = 0; oi < orbCount; oi++) {
          const angle = (oi / orbCount) * Math.PI * 2;
          const oh = orbitCenter + Math.sin(angle) * orbR;
          const ox = 1.1 + 0.1 + Math.cos(angle) * orbR * 0.4; // compressed X for scrolling
          if (oh > 0.05 && oh < 0.95) {
            push({ type: 'orb', x: ox, height: oh, golden: ring === rings && oi === 0 });
          }
        }
        // Barriers between rings
        if (ring < rings) {
          const barrierAngle = Math.PI * (ring * 0.6);
          const bh = orbitCenter + Math.sin(barrierAngle) * orbR * 1.3;
          const bx = 1.1 + 0.1 + Math.cos(barrierAngle) * orbR * 0.5;
          if (bh > 0.05 && bh < 0.95) {
            push({ type: 'barrier', x: bx, height: bh });
          }
        }
      }
      // Central boost
      push({ type: 'boost', x: 1.2, height: orbitCenter });
    },
  },
  {
    name: 'ZIGZAG WALL',
    threshold: 0.9706,
    minTime: 40,
    delay: 1.5,
    spawn: (push) => {
      // ZIGZAG WALL: wall of barriers with a gap that zigzags up and down
      const zzLen = 8;
      const zzLanes = 4;
      for (let j = 0; j < zzLen; j++) {
        const zx = 1.1 + j * 0.03;
        const gapLane = j % zzLanes; // gap shifts position each column
        for (let l = 0; l < zzLanes; l++) {
          const lh = 0.15 + (l / (zzLanes - 1)) * 0.7;
          if (l === gapLane) { // Orb in the gap
            push({ type: 'orb', x: zx, height: lh, golden: j >= zzLen - 2 });
          } else {
            push({ type: 'barrier', x: zx, height: lh });
          }
        }
      }
      push({ type: 'boost', x: 1.1 + zzLen * 0.03 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'LATTICE',
    threshold: 0.9708,
    minTime: 45,
    delay: 1.2,
    spawn: (push) => {
      // LATTICE: grid of barriers with orb-filled gaps forming a lattice pattern
      const latticeRows = 3;
      const latticeCols = 4;
      const latticeGapRow = Math.floor(Math.random() * latticeRows);
      for (let col = 0; col < latticeCols; col++) {
        const lx = 1.1 + col * 0.04;
        for (let row = 0; row < latticeRows; row++) {
          const lh = 0.2 + (row / (latticeRows - 1)) * 0.6;
          if (row === latticeGapRow || (col + row) % 3 === 0) { // Gap — place an orb
            push({ type: 'orb', x: lx, height: lh, golden: col === latticeCols - 1 && row === latticeGapRow });
          } else { // Barrier node
            push({ type: 'barrier', x: lx, height: lh });
          }
        }
      }
      push({ type: 'boost', x: 1.1 + latticeCols * 0.04 + 0.02, height: 0.2 + latticeGapRow / (latticeRows - 1) * 0.6 });
    },
  },
  {
    name: 'HELIX',
    threshold: 0.971,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // HELIX: two interleaving spiral lanes of orbs with barriers at overlap points
      const helixLen = 12;
      const helixCenter = 0.5;
      const helixAmp = 0.28;
      for (let j = 0; j < helixLen; j++) {
        const progress = j / (helixLen - 1);
        const hx = 1.1 + j * 0.025;
        const h1 = helixCenter + Math.sin(progress * Math.PI * 2.5) * helixAmp;
        const h2 = helixCenter - Math.sin(progress * Math.PI * 2.5) * helixAmp;
        // First helix orbs
        push({ type: 'orb', x: hx, height: Math.max(0.05, Math.min(0.95, h1)) });
        // Second helix orbs (interleaved)
        if (j % 2 === 0) {
          push({ type: 'orb', x: hx + 0.012, height: Math.max(0.05, Math.min(0.95, h2)), golden: j >= helixLen - 2 });
        }
        // Barriers at crossover points (where helixes intersect)
        if (j > 0 && j < helixLen - 1 && Math.abs(h1 - h2) < 0.08) {
          push({ type: 'barrier', x: hx - 0.01, height: Math.max(0.05, helixCenter + 0.18) });
          push({ type: 'barrier', x: hx - 0.01, height: Math.min(0.95, helixCenter - 0.18) });
        }
      }
      push({ type: 'boost', x: 1.1 + helixLen * 0.025 + 0.02, height: helixCenter });
    },
  },
  {
    name: 'CROSSFIRE',
    threshold: 0.9712,
    minTime: 50,
    delay: 1.5,
    spawn: (push) => {
      // CROSSFIRE: barriers from multiple heights with safe pockets between them
      const cfLen = 8;
      const pocketH = 0.5 + (Math.random() - 0.5) * 0.2;
      for (let j = 0; j < cfLen; j++) {
        const cx2 = 1.1 + j * 0.03;
        // High barrier
        push({ type: 'barrier', x: cx2, height: 0.15 + (j % 2) * 0.05 });
        // Low barrier
        push({ type: 'barrier', x: cx2, height: 0.85 - (j % 2) * 0.05 });
        // Mid barriers (alternating sides of the safe pocket)
        if (j % 2 === 0) {
          push({ type: 'barrier', x: cx2, height: Math.max(0.05, pocketH - 0.2) });
        } else {
          push({ type: 'barrier', x: cx2, height: Math.min(0.95, pocketH + 0.2) });
        }
        // Reward orbs in the safe pocket
        if (j % 2 === 1) {
          push({ type: 'orb', x: cx2 + 0.01, height: pocketH, golden: j >= cfLen - 2 });
        }
      }
      push({ type: 'boost', x: 1.1 + cfLen * 0.03 + 0.02, height: pocketH });
    },
  },
  {
    name: 'SNAKE',
    threshold: 0.9714,
    minTime: 30,
    delay: 1.5,
    spawn: (push) => {
      // SNAKE: long S-curve chain of orbs with barriers along the outer edges
      const snakeLen = 14;
      const snakeAmp = 0.3;
      for (let j = 0; j < snakeLen; j++) {
        const progress = j / (snakeLen - 1);
        const sx2 = 1.1 + j * 0.022;
        const snakeH = 0.5 + Math.sin(progress * Math.PI * 2) * snakeAmp;
        const safeH = Math.max(0.08, Math.min(0.92, snakeH));
        // Orb along the snake body
        push({ type: 'orb', x: sx2, height: safeH, golden: j >= snakeLen - 2 });
        // Barrier on the outside of the curve (opposite side)
        if (j % 3 === 0) {
          const outsideH = snakeH > 0.5
          ? Math.max(0.05, safeH - 0.2)
          : Math.min(0.95, safeH + 0.2);
          push({ type: 'barrier', x: sx2, height: outsideH });
        }
      }
      // Boost at the tail
      push({ type: 'boost', x: 1.1 + snakeLen * 0.022 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'PENDULUM GATE',
    threshold: 0.9716,
    minTime: 40,
    delay: 1.5,
    spawn: (push) => {
      // PENDULUM GATE: gates with swinging barriers that open and close
      const gateCount = 5;
      for (let j = 0; j < gateCount; j++) {
        const gx = 1.1 + j * 0.05;
        const gateCenter = 0.5 + (j % 2 === 0 ? -0.12 : 0.12);
        // Fixed barrier above
        push({ type: 'barrier', x: gx, height: Math.max(0.05, gateCenter - 0.25) });
        // Swinging barrier below (moving)
        push({
        type: 'barrier', x: gx,
        height: Math.min(0.95, gateCenter + 0.15),
        moving: 1.5 + j * 0.3, baseHeight: gateCenter + 0.15,
        });
        // Orb in the gap
        push({ type: 'orb', x: gx + 0.02, height: gateCenter, golden: j >= gateCount - 1 });
      }
      push({ type: 'boost', x: 1.1 + gateCount * 0.05 + 0.03, height: 0.5 });
    },
  },
  {
    name: 'TUNNEL',
    threshold: 0.9718,
    minTime: 45,
    delay: 1.5,
    spawn: (push) => {
      // TUNNEL: long enclosed corridor — barriers form ceiling and floor with narrow gap
      const tunnelLen = 10;
      const tunnelCenter = 0.4 + Math.random() * 0.2;
      const tunnelGap = 0.14; // narrow passage
      for (let j = 0; j < tunnelLen; j++) {
        const tx = 1.1 + j * 0.025;
        // Slight wave in tunnel path
        const waveOffset = Math.sin(j * 0.8) * 0.06;
        const center = tunnelCenter + waveOffset;
        // Ceiling barrier
        push({ type: 'barrier', x: tx, height: Math.max(0.05, center - tunnelGap - 0.06) });
        // Floor barrier
        push({ type: 'barrier', x: tx, height: Math.min(0.95, center + tunnelGap + 0.06) });
        // Orbs along center of tunnel
        if (j % 2 === 1) {
          push({ type: 'orb', x: tx + 0.01, height: Math.max(0.08, Math.min(0.92, center)), golden: j >= tunnelLen - 2 });
        }
      }
      // Light at end of tunnel — boost
      push({ type: 'boost', x: 1.1 + tunnelLen * 0.025 + 0.02, height: tunnelCenter });
    },
  },
  {
    name: 'CORKSCREW',
    threshold: 0.972,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // CORKSCREW: double helix of orbs spiraling around a central axis with barriers at crossings
      const corkscrewLen = 12;
      const corkscrewCenter = 0.45 + Math.random() * 0.1;
      const corkscrewAmp = 0.25;
      for (let j = 0; j < corkscrewLen; j++) {
        const progress = j / (corkscrewLen - 1);
        const cx2 = 1.1 + j * 0.025;
        const helixA = corkscrewCenter + Math.sin(progress * Math.PI * 3) * corkscrewAmp;
        const helixB = corkscrewCenter - Math.sin(progress * Math.PI * 3) * corkscrewAmp;
        // Helix A orbs
        push({ type: 'orb', x: cx2, height: Math.max(0.05, Math.min(0.95, helixA)), golden: j === corkscrewLen - 1 });
        // Helix B orbs (offset phase)
        if (j % 2 === 0) {
          push({ type: 'orb', x: cx2 + 0.012, height: Math.max(0.05, Math.min(0.95, helixB)) });
        }
        // Barriers at crossing points (where helixes cross center)
        if (Math.abs(helixA - corkscrewCenter) < 0.05 && j > 0 && j < corkscrewLen - 1) {
          push({ type: 'barrier', x: cx2, height: Math.max(0.05, corkscrewCenter + 0.15) });
          push({ type: 'barrier', x: cx2, height: Math.min(0.95, corkscrewCenter - 0.15) });
        }
      }
      // Grand reward
      push({ type: 'boost', x: 1.1 + corkscrewLen * 0.025 + 0.02, height: corkscrewCenter });
    },
  },
  {
    name: 'SLALOM',
    threshold: 0.9722,
    minTime: 25,
    delay: 1.5,
    spawn: (push) => {
      // SLALOM: serpentine gates — barriers form gates that alternate high and low
      const slalomLen = 8;
      const gateGap = 0.16; // vertical gap between barrier pairs
      for (let j = 0; j < slalomLen; j++) {
        const sx = 1.1 + j * 0.035;
        const gateCenter = j % 2 === 0 ? 0.3 : 0.7; // alternating high/low
        // Upper barrier of gate
        push({ type: 'barrier', x: sx, height: Math.max(0.05, gateCenter - gateGap - 0.12) });
        // Lower barrier of gate
        push({ type: 'barrier', x: sx, height: Math.min(0.95, gateCenter + gateGap + 0.12) });
        // Orb in the gate gap
        push({ type: 'orb', x: sx + 0.015, height: gateCenter, golden: j >= slalomLen - 2 });
      }
      // Reward after slalom
      push({ type: 'boost', x: 1.1 + slalomLen * 0.035 + 0.02, height: 0.5 });
    },
  },
  {
    name: 'STAIRWAY TO HEAVEN',
    threshold: 0.973,
    minTime: 40,
    delay: 1.5,
    spawn: (push) => {
      // STAIRWAY TO HEAVEN: ascending platform staircase with golden reward at top
      const stairSteps = 6;
      const stairStart = 0.85;
      const stairEnd = 0.1;
      for (let j = 0; j < stairSteps; j++) {
        const progress = j / (stairSteps - 1);
        const stepH = stairStart + (stairEnd - stairStart) * progress;
        const sx2 = 1.1 + j * 0.045;
        // Platform barrier (each step)
        push({ type: 'barrier', x: sx2, height: Math.max(0.05, stepH + 0.08) });
        // Orb on the step
        push({ type: 'orb', x: sx2 + 0.02, height: Math.max(0.05, stepH - 0.03), golden: j === stairSteps - 1 });
      }
      // Heaven reward at the top
      push({ type: 'boost', x: 1.1 + stairSteps * 0.045 + 0.03, height: stairEnd });
      push({ type: 'orb', x: 1.1 + stairSteps * 0.045 + 0.05, height: stairEnd + 0.05, golden: true });
    },
  },
  {
    name: 'BOSS RUSH',
    threshold: 0.9732,
    minTime: 90,
    delay: 2.5,
    spawn: (push) => {
      // BOSS RUSH: long mixed challenge sequence — walls, gaps, orbs, moving barriers
      const bossLen = 12;
      const bossBase = 0.5;
      for (let j = 0; j < bossLen; j++) {
        const bx2 = 1.1 + j * 0.025;
        const phase = j / bossLen;
        if (j % 4 === 0) { // Wall with gap (zigzag wall style)
          const isHigh = j % 8 === 0;
          push({ type: 'barrier', x: bx2, height: isHigh ? 0.8 : 0.2 });
          push({ type: 'barrier', x: bx2, height: isHigh ? 0.5 : 0.5 });
        } else if (j % 4 === 2) { // Moving barrier (pendulum)
          const movH = bossBase + Math.sin(phase * Math.PI * 4) * 0.2;
          push({
          type: 'barrier', x: bx2,
          height: Math.max(0.05, Math.min(0.95, movH)),
          moving: 2.0, baseHeight: movH,
          });
        } else { // Orb reward (escalating — golden at end)
          const orbH = bossBase + Math.sin(phase * Math.PI * 3) * 0.25;
          push({
          type: 'orb', x: bx2,
          height: Math.max(0.05, Math.min(0.95, orbH)),
          golden: j > bossLen - 3,
          });
        }
      }
      // Grand reward: boost + 2 golden orbs
      push({ type: 'boost', x: 1.1 + bossLen * 0.025 + 0.02, height: bossBase });
      push({ type: 'orb', x: 1.1 + bossLen * 0.025 + 0.04, height: bossBase - 0.1, golden: true });
      push({ type: 'orb', x: 1.1 + bossLen * 0.025 + 0.04, height: bossBase + 0.1, golden: true });
    },
  },
  {
    name: 'CASCADE',
    threshold: 0.9734,
    minTime: 35,
    delay: 1.2,
    spawn: (push) => {
      // CASCADE: waterfall of barriers descending in columns with orb gaps
      const cascCols = 4;
      const cascRows = 3;
      const gapRow = Math.floor(Math.random() * cascRows); // which row has the gap
      for (let col = 0; col < cascCols; col++) {
        const cx = 1.1 + col * 0.05;
        for (let row = 0; row < cascRows; row++) {
          const ch = 0.15 + row * 0.3;
          if (row === gapRow) { // Gap row — put orb here
            push({ type: 'orb', x: cx, height: ch, golden: col === cascCols - 1 });
          } else {
            push({ type: 'barrier', x: cx, height: ch });
          }
        }
        // Shift the gap row for next column (cascade effect)
        // Gap "falls" to next row
      }
      // Boost at end
      const gapH = 0.15 + gapRow * 0.3;
      push({ type: 'boost', x: 1.1 + cascCols * 0.05 + 0.03, height: gapH });
    },
  },
  {
    name: 'PENDULUM SWARM',
    threshold: 0.9736,
    minTime: 40,
    delay: 1.5,
    spawn: (push) => {
      // PENDULUM SWARM: multiple pendulum barriers swinging in sync with orbs between
      const pendCount = 4;
      const pendBaseCenter = 0.5;
      for (let j = 0; j < pendCount; j++) {
        const px2 = 1.1 + j * 0.06;
        const pendPhase = j * 0.8; // staggered swing phases
        const pendCenter = pendBaseCenter + Math.sin(pendPhase) * 0.15;
        // Swinging barrier
        push({
        type: 'barrier', x: px2, height: pendCenter,
        moving: 1.5 + j * 0.3, baseHeight: pendCenter,
        });
        // Orb in the predicted safe gap
        const safeH = pendCenter + (j % 2 === 0 ? 0.2 : -0.2);
        push({
        type: 'orb', x: px2 + 0.03,
        height: Math.max(0.05, Math.min(0.95, safeH)),
        golden: j === pendCount - 1,
        });
      }
      // Boost reward after the swarm
      push({ type: 'boost', x: 1.1 + pendCount * 0.06 + 0.04, height: 0.5 });
    },
  },
  {
    name: 'GAUNTLET RUN',
    threshold: 0.9738,
    minTime: 50,
    delay: 1.5,
    spawn: (push) => {
      // GAUNTLET RUN: long tunnel with alternating obstacles + reward streaks between them
      const gRunCenter = 0.35 + Math.random() * 0.3;
      const gRunLen = 8;
      const gRunWidth = 0.14;
      for (let j = 0; j < gRunLen; j++) {
        const gx = 1.1 + j * 0.03;
        // Alternating walls (top/bottom) create weaving tunnel
        if (j % 2 === 0) {
          push({ type: 'barrier', x: gx, height: Math.min(0.95, gRunCenter + gRunWidth + 0.05) });
          push({ type: 'orb', x: gx + 0.015, height: Math.max(0.05, gRunCenter - gRunWidth * 0.5) });
        } else {
          push({ type: 'barrier', x: gx, height: Math.max(0.05, gRunCenter - gRunWidth - 0.05) });
          push({ type: 'orb', x: gx + 0.015, height: Math.min(0.95, gRunCenter + gRunWidth * 0.5), golden: j === gRunLen - 1 });
        }
      }
      push({ type: 'boost', x: 1.1 + gRunLen * 0.03 + 0.02, height: gRunCenter });
    },
  },
  {
    name: 'AVALANCHE',
    threshold: 0.974,
    minTime: 45,
    delay: 1.4,
    spawn: (push) => {
      // AVALANCHE: barriers cascade from top, safe tunnel at bottom
      const avalLen = 8;
      const safeH = 0.8 + Math.random() * 0.1; // safe zone near bottom
      for (let j = 0; j < avalLen; j++) {
        const ax = 1.1 + j * 0.03;
        // 2-3 barriers falling from different heights
        const rocksPerCol = 2 + (j % 2);
        for (let ri = 0; ri < rocksPerCol; ri++) {
          const rockH = 0.1 + ri * 0.25 + Math.random() * 0.1;
          if (rockH < safeH - 0.12) {
            push({ type: 'barrier', x: ax, height: rockH });
          }
        }
        // Orbs in the safe bottom tunnel
        if (j % 2 === 0) {
          push({ type: 'orb', x: ax + 0.015, height: safeH, golden: j === avalLen - 2 });
        }
      }
      // Boost reward at end of avalanche
      push({ type: 'boost', x: 1.1 + avalLen * 0.03 + 0.02, height: safeH });
    },
  },
  {
    name: 'DIAMOND MINE',
    threshold: 0.9742,
    minTime: 60,
    delay: 1.8,
    spawn: (push) => {
      // DIAMOND MINE: nested diamond shapes with treasure in deepest layer
      const dmCenter = 0.4 + Math.random() * 0.2;
      const dmX = 1.1;
      // Outer diamond (barriers)
      const outerR = 0.22;
      const outerPts = [
      { dx: 0, dh: outerR
      }
      ,
      { dx: 0.06, dh: 0
      }
      ,
      { dx: 0, dh: -outerR
      }
      ,
      { dx: -0.04, dh: 0
      }
      ,
      ];
      for (const p of outerPts) {
        const ph = dmCenter + p.dh;
        if (ph > 0.05 && ph < 0.95) {
          push({ type: 'barrier', x: dmX + p.dx, height: ph });
        }
      }
      // Inner diamond (barriers, smaller)
      const innerR = 0.1;
      const innerPts = [
      { dx: 0, dh: innerR
      }
      ,
      { dx: 0.03, dh: 0
      }
      ,
      { dx: 0, dh: -innerR
      }
      ,
      { dx: -0.02, dh: 0
      }
      ,
      ];
      for (const p of innerPts) {
        const ph = dmCenter + p.dh;
        if (ph > 0.05 && ph < 0.95) {
          push({ type: 'barrier', x: dmX + p.dx, height: ph });
        }
      }
      // Treasure at center
      push({ type: 'orb', x: dmX, height: dmCenter, golden: true });
      push({ type: 'boost', x: dmX + 0.01, height: dmCenter });
    },
  },
  {
    name: 'VORTEX',
    threshold: 0.9744,
    minTime: 50,
    delay: 1.5,
    spawn: (push) => {
      // VORTEX: objects arranged in a tightening spiral toward center
      const vortexCenter = 0.4 + Math.random() * 0.2;
      const vortexSteps = 10;
      for (let j = 0; j < vortexSteps; j++) {
        const progress = j / vortexSteps;
        const angle = progress * Math.PI * 3;
        const radius = (1 - progress) * 0.25;
        const vh = vortexCenter + Math.sin(angle) * radius;
        const vx = 1.1 + progress * 0.25;
        const clampH = Math.max(0.05, Math.min(0.95, vh));
        if (j % 3 === 0) {
          push({ type: 'barrier', x: vx, height: clampH });
        } else {
          push({ type: 'orb', x: vx, height: clampH, golden: j === vortexSteps - 1 });
        }
      }
      // Center reward
      push({ type: 'boost', x: 1.1 + 0.28, height: vortexCenter });
    },
  },
  {
    name: 'ALTERNATING LANES',
    threshold: 0.9746,
    minTime: 25,
    delay: 1,
    spawn: (push) => {
      // ALTERNATING LANES: barriers rapidly alternate between lanes with orbs in safe spots
      const laneOrder = [0, 2, 1, 0, 2, 1]; // top, bottom, mid pattern
      for (let j = 0; j < laneOrder.length; j++) {
        const laneIdx = laneOrder[j];
        const bx = 1.1 + j * 0.035;
        push({ type: 'barrier', x: bx, height: HEIGHT_LANES[laneIdx] });
        // Orb in the lane that's NOT blocked (pick a safe adjacent lane)
        const safeLane = (laneIdx + 1) % 3;
        push({ type: 'orb', x: bx + 0.015, height: HEIGHT_LANES[safeLane], golden: j === laneOrder.length - 1 });
      }
    },
  },
  {
    name: 'RANDOM WALK',
    threshold: 0.9748,
    minTime: 40,
    delay: 1.2,
    spawn: (push) => {
      // RANDOM WALK: barriers doing a random walk, orbs on the opposite side
      let walkH = 0.5;
      const walkLen = 7;
      for (let j = 0; j < walkLen; j++) { // Random step up or down
        const step = (Math.random() < 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.08);
        walkH = Math.max(0.15, Math.min(0.85, walkH + step));
        const wx = 1.1 + j * 0.035;
        push({ type: 'barrier', x: wx, height: walkH });
        // Orb on the opposite side of the barrier
        const orbSide = walkH > 0.5 ? walkH - 0.2 : walkH + 0.2;
        push({ type: 'orb', x: wx + 0.015, height: Math.max(0.05, Math.min(0.95, orbSide)), golden: j === walkLen - 1 });
      }
    },
  },
  {
    name: 'SLINGSHOT',
    threshold: 0.975,
    minTime: 30,
    delay: 1,
    spawn: (push) => {
      // SLINGSHOT: curve of orbs leading into a boost catapult at the end
      const slingshotStart = 0.2 + Math.random() * 0.3;
      const slingshotEnd = 0.5 + Math.random() * 0.3;
      const slingshotLen = 6;
      for (let j = 0; j < slingshotLen; j++) {
        const progress = j / (slingshotLen - 1);
        // Parabolic curve from start to end height
        const curve = slingshotStart + (slingshotEnd - slingshotStart) * progress + Math.sin(progress * Math.PI) * 0.15;
        const sh = Math.max(0.05, Math.min(0.95, curve));
        push({ type: 'orb', x: 1.1 + j * 0.03, height: sh, golden: j === slingshotLen - 2 });
      }
      // Boost catapult at the end
      push({ type: 'boost', x: 1.1 + slingshotLen * 0.03 + 0.02, height: Math.max(0.05, Math.min(0.95, slingshotEnd)) });
    },
  },
  {
    name: 'FORTRESS',
    threshold: 0.9751,
    minTime: 55,
    delay: 1.8,
    spawn: (push) => {
      // FORTRESS: thick barrier walls surrounding treasure cache with one breach point
      const fortCenter = 0.35 + Math.random() * 0.3;
      const fortR = 0.2;
      const breach = Math.floor(Math.random() * 4); // which side has the opening
      // 4 wall segments (top, bottom, front, back) — one is missing
      const walls = [
      { x: 1.1, h: fortCenter - fortR
      }
      ,      // top wall
      { x: 1.1, h: fortCenter + fortR
      }
      ,      // bottom wall
      { x: 1.06, h: fortCenter
      }
      ,              // front wall (left)
      { x: 1.14, h: fortCenter
      }
      ,              // back wall (right)
      ];
      for (let wi = 0; wi < walls.length; wi++) {
        if (wi === breach) continue;
        const fw = walls[wi];
        if (fw.h > 0.05 && fw.h < 0.95) {
          push({ type: 'barrier', x: fw.x, height: fw.h });
        }
      }
      // Double-up some walls for thickness
      push({ type: 'barrier', x: 1.08, height: Math.min(0.95, fortCenter - fortR + 0.02) });
      push({ type: 'barrier', x: 1.12, height: Math.max(0.05, fortCenter + fortR - 0.02) });
      // Treasure cache inside
      push({ type: 'orb', x: 1.1, height: fortCenter, golden: true });
      push({ type: 'orb', x: 1.1, height: fortCenter + 0.06, golden: true });
      push({ type: 'boost', x: 1.1, height: fortCenter - 0.06 });
    },
  },
  {
    name: 'ECHO',
    threshold: 0.9753,
    minTime: 35,
    delay: 1.5,
    spawn: (push) => {
      // ECHO: identical wave of objects repeated twice with slight offset
      const echoH = 0.3 + Math.random() * 0.4;
      const echoPattern: Array<{ type: ObjDef['type']; dh: number; golden?: boolean
      }
      > = [
      { type: 'barrier', dh: 0.15
      }
      ,
      { type: 'orb', dh: 0
      }
      ,
      { type: 'barrier', dh: -0.15
      }
      ,
      { type: 'orb', dh: 0, golden: true
      }
      ,
      ];
      // First wave
      for (let j = 0; j < echoPattern.length; j++) {
        const ep = echoPattern[j];
        const eh = Math.max(0.05, Math.min(0.95, echoH + ep.dh));
        push({ type: ep.type, x: 1.1 + j * 0.04, height: eh, golden: ep.golden });
      }
      // Echo (second wave, slightly offset vertically)
      const echoShift = 0.05 * (Math.random() < 0.5 ? 1 : -1);
      for (let j = 0; j < echoPattern.length; j++) {
        const ep = echoPattern[j];
        const eh = Math.max(0.05, Math.min(0.95, echoH + ep.dh + echoShift));
        push({ type: ep.type, x: 1.1 + (j + echoPattern.length + 1) * 0.04, height: eh, golden: ep.golden });
      }
    },
  },
  {
    name: 'PINCER',
    threshold: 0.9755,
    minTime: 45,
    delay: 1.3,
    spawn: (push) => {
      // PINCER: barriers close in from both top and bottom simultaneously
      const pincerLen = 5;
      const pincerCenter = 0.4 + Math.random() * 0.2;
      for (let j = 0; j < pincerLen; j++) {
        const progress = j / (pincerLen - 1);
        const squeeze = progress * 0.3; // progressively tighter
        const px2 = 1.1 + j * 0.045;
        // Top jaw
        push({ type: 'barrier', x: px2, height: Math.min(0.95, pincerCenter + 0.35 - squeeze) });
        // Bottom jaw
        push({ type: 'barrier', x: px2, height: Math.max(0.05, pincerCenter - 0.35 + squeeze) });
        // Orb in the shrinking center gap
        if (j % 2 === 0) {
          push({ type: 'orb', x: px2 + 0.02, height: pincerCenter, golden: j === pincerLen - 1 });
        }
      }
      // Escape boost after the pinch point
      push({ type: 'boost', x: 1.1 + pincerLen * 0.045 + 0.03, height: pincerCenter });
    },
  },
  {
    name: 'RISING TIDE',
    threshold: 0.976,
    minTime: 50,
    delay: 1.4,
    spawn: (push) => {
      // RISING TIDE: barriers ascending from bottom forcing player upward, reward at apex
      const tideLen = 7;
      for (let j = 0; j < tideLen; j++) {
        const progress = j / (tideLen - 1);
        // Barriers rise from bottom (0.9) up to near top (0.2)
        const barrierH = 0.9 - progress * 0.7;
        const tx = 1.1 + j * 0.035;
        // Bottom barrier wall rising
        push({ type: 'barrier', x: tx, height: Math.max(0.05, barrierH + 0.1) });
        if (j > 0) {
          push({ type: 'barrier', x: tx, height: Math.min(0.95, barrierH + 0.3) });
        }
        // Orbs in the safe zone above the rising barrier
        const safeH = Math.max(0.05, barrierH - 0.05);
        if (j % 2 === 0 && safeH > 0.08) {
          push({ type: 'orb', x: tx + 0.015, height: safeH, golden: j === tideLen - 1 });
        }
      }
      // Apex reward — golden orb + boost at top
      push({ type: 'orb', x: 1.1 + tideLen * 0.035, height: 0.1, golden: true });
      push({ type: 'boost', x: 1.1 + tideLen * 0.035 + 0.03, height: 0.15 });
    },
  },
  {
    name: 'SPLIT PATH',
    threshold: 0.977,
    minTime: 40,
    delay: 1.5,
    spawn: (push) => {
      // SPLIT PATH: two parallel paths diverge then reconverge — choose upper or lower route
      const splitCenter = 0.5;
      const splitGap = 0.25;
      const splitLen = 6;
      const upperH = splitCenter - splitGap;
      const lowerH = splitCenter + splitGap;
      for (let j = 0; j < splitLen; j++) {
        const sx = 1.1 + j * 0.04;
        const diverge = Math.sin((j / (splitLen - 1)) * Math.PI) * 0.08;
        // Center dividing barrier
        push({ type: 'barrier', x: sx, height: splitCenter });
        // Upper path orbs
        const uOrbH = Math.max(0.05, upperH - diverge);
        push({ type: 'orb', x: sx + 0.02, height: uOrbH, golden: j === splitLen - 1 });
        // Lower path orbs
        const lOrbH = Math.min(0.95, lowerH + diverge);
        push({ type: 'orb', x: sx + 0.02, height: lOrbH, golden: j === splitLen - 1 });
        // Outer walls on first and last segments
        if (j === 0 || j === splitLen - 1) {
          push({ type: 'barrier', x: sx, height: Math.max(0.05, upperH - 0.2) });
          push({ type: 'barrier', x: sx, height: Math.min(0.95, lowerH + 0.2) });
        }
      }
      // Convergence boost reward
      push({ type: 'boost', x: 1.1 + splitLen * 0.04 + 0.03, height: splitCenter });
    },
  },
  {
    name: 'BARRIER WALL',
    threshold: 1,
    minTime: 35,
    delay: 0.8,
    spawn: (push) => {
      // BARRIER WALL: barriers at all 3 lanes except one gap (with moving barrier)
      const gapLane = Math.floor(Math.random() * 3);
      for (let j = 0; j < 3; j++) {
        if (j === gapLane) { // Orb in the gap as reward
          push({ type: 'orb', x: 1.1, height: HEIGHT_LANES[j], golden: Math.random() < 0.3 });
        } else { // Moving barriers make the wall harder
          const barrier: ObjDef = { type: 'barrier', x: 1.1, height: HEIGHT_LANES[j] };
          if (Math.random() < 0.4) {
            barrier.moving = 1.2 + Math.random();
            barrier.baseHeight = HEIGHT_LANES[j];
          }
          push(barrier);
        }
      }
    },
  },
];

export function selectAndSpawnPattern(
  roll: number,
  totalTime: number,
  push: PushFn,
  firstPatternBoost: number = 0,
): number {
  // Phase 1: early patterns with well-separated thresholds (sequential first-match)
  for (let i = 0; i < PATTERNS.length; i++) {
    const p = PATTERNS[i];
    if (p.threshold >= 0.93) break;
    if (totalTime < p.minTime) continue;
    const threshold = i === 0 ? p.threshold + firstPatternBoost : p.threshold;
    if (roll < threshold) {
      p.spawn(push);
      return p.delay;
    }
  }
  // Phase 2: late-game patterns — uniform random from eligible pool
  if (roll >= 0.93) {
    const pool: PatternDef[] = [];
    for (const p of PATTERNS) {
      if (p.threshold < 0.93) continue;
      if (totalTime < p.minTime) continue;
      pool.push(p);
    }
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      pick.spawn(push);
      return pick.delay;
    }
  }
  return -1; // no pattern matched — caller handles single-object fallback
}
