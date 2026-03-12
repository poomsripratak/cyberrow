import { useEffect, useRef, useCallback, useState } from 'react';
import type { GameState } from '../types/modes';
import type { RealtimeUpdate } from '../types/metrics';
import { selectAndSpawnPattern } from './RiverGame/spawnPatterns';
import type { ObjDef } from './RiverGame/spawnPatterns';
import {
  C,
  drawSpiritSky, drawMoon, drawMountains, drawTemples,
  drawRiver, drawLanterns, drawDangerRock,
  drawKoiFish, drawSakuraBlossom, drawRowingBoat,
  drawSakuraPetals, drawFireflies, drawMist, drawSpiritHUD,
  drawWarmVignette, drawSpiritParticles,
  createPetals, createFireflies, createSpiritOrbs,
  updatePetals, updateFireflies, updateSpiritOrbs,
} from './RiverGame/spiritRenderer';
import type { Petal, Firefly, SpiritOrb, HudData } from './RiverGame/spiritRenderer';

interface RiverGameProps {
  gameState: GameState;
  realtimeData?: RealtimeUpdate;
  isActive: boolean;
  onCollision?: (type: 'coin' | 'rock' | 'log' | 'boost') => void;
}

interface GameObj {
  id: number;
  type: 'orb' | 'barrier' | 'boost';
  x: number;      // 0 = left edge, 1+ = off-screen right — scrolls left
  height: number;  // 0 = ground, 1 = ceiling — the gameplay axis
  hit: boolean;
  golden?: boolean;     // rare high-value orb (3×)
  moving?: number;      // oscillation speed (0 = static, >0 = moving barrier)
  baseHeight?: number;  // original height for oscillating objects
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface RingBurst {
  x: number;
  y: number;
  color: string;
  radius: number;
  maxRadius: number;
  life: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}


const GROUND_Y = 0.82;     // ground line (fraction from top)
const CEIL_Y = 0.30;       // ceiling (fraction from top) — near mountain peaks
const PLAY_H = GROUND_Y - CEIL_Y; // playable height = 0.74
const SHIP_X = 0.17;       // ship horizontal position
const HEIGHT_LANES = [0.18, 0.5, 0.82] as const;

/** Convert height (0=ground, 1=ceiling) to screen Y */
function heightToY(height: number, h: number): number {
  return (GROUND_Y - height * PLAY_H) * h;
}


export default function RiverGame({
  gameState,
  realtimeData,
  isActive,
  onCollision,
}: RiverGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  // Game-over summary — triggers React overlay with stats
  const [gameOverStats, setGameOverStats] = useState<{
    score: number; highScore: number; isNewHigh: boolean;
    bestStreak: number; bestCombo: number; wave: number; distance: number;
  } | null>(null);

  // Mutable game state in refs — no React re-renders during gameplay
  const objsRef = useRef<GameObj[]>([]);
  const partsRef = useRef<Particle[]>([]);
  const popsRef = useRef<Popup[]>([]);
  const ringsRef = useRef<RingBurst[]>([]);
  const trailRef = useRef<TrailPoint[]>([]);
  const petalsRef = useRef<Petal[]>([]);
  const firefliesRef = useRef<Firefly[]>([]);
  const spiritOrbsRef = useRef<SpiritOrb[]>([]);

  const heightRef = useRef(0.5);       // current ship height (0-1)
  const targetHeightRef = useRef(0.5); // target from rowing intensity
  const cappedTargetRef = useRef(0.5); // velocity-capped target (smoothed)
  const scoreRef = useRef(gameState.score);
  const comboRef = useRef(1);
  const comboTimerRef = useRef(0);
  const gridOffRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const idRef = useRef(0);
  const shakeRef = useRef(0);
  const flashRef = useRef<{ color: string; alpha: number } | null>(null);
  const speedRef = useRef(gameState.river_speed);
  const totalTimeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const boostRushRef = useRef(0);
  const waveRef = useRef(1);
  const waveFlashRef = useRef(0);
  const gameDistRef = useRef(0);
  const milestoneRef = useRef<{ text: string; color: string; life: number } | null>(null);
  const prevComboRef = useRef(1);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const prevScoreRef = useRef(0);
  const scoreFlashRef = useRef(0);
  const displayScoreRef = useRef(0);
  const gridPulseRef = useRef(0);
  const strokePulseRef = useRef(0);
  const lastStrokeVelRef = useRef(0);
  const invincibleRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const energyRef = useRef(3);
  const energyFlashRef = useRef(0);
  const beatRef = useRef(0);
  const gameOverRef = useRef(false);
  const gameOverTimerRef = useRef(0);
  const prevStreakMilestoneRef = useRef(0);
  const lastScoreMilestoneRef = useRef(0);
  const highScoreRef = useRef(0);
  const damageFXRef = useRef(0);
  const bestComboRef = useRef(1);
  const gameOverShownRef = useRef(false);
  const energyShatterRef = useRef<{ pipIndex: number; timer: number } | null>(null);
  const rushSweepRef = useRef(0);
  const rushZoomRef = useRef(0);


  // one-time init (petals + fireflies + high score)
  useEffect(() => {
    petalsRef.current = createPetals(20, GROUND_Y);
    firefliesRef.current = createFireflies(8, GROUND_Y);
    spiritOrbsRef.current = createSpiritOrbs(4, GROUND_Y);
    highScoreRef.current = parseInt(localStorage.getItem('spiritRiverHighScore') ?? '0', 10);
  }, []);

  useEffect(() => {
    // Use realtime force data directly for responsive speed
    if (realtimeData?.force) {
      const totalForce = realtimeData.force.total ?? 0;
      const vel = realtimeData.handle?.velocity ?? 0;
      const rawPower = totalForce * vel;
      // Map power to speed: 0W→0.5, 200W→2.0, 500W→3.0
      const realtimeSpeed = Math.max(0.5, Math.min(3.5, rawPower / 120 + 0.5));
      // Fast EMA: ramp up quick, decay slower
      const alpha = realtimeSpeed > speedRef.current ? 0.12 : 0.04;
      speedRef.current += (realtimeSpeed - speedRef.current) * alpha;
    } else if (gameState.river_speed !== undefined) {
      speedRef.current += (gameState.river_speed - speedRef.current) * 0.15;
    }
  }, [realtimeData, gameState.river_speed]);

  // Detect strokes for visual pulse
  useEffect(() => {
    if (realtimeData?.handle) {
      const vel = realtimeData.handle.velocity;
      if (vel > 0.5 && lastStrokeVelRef.current < 0.2) {
        strokePulseRef.current = 0.4;
      }
      lastStrokeVelRef.current = vel;
    }
  }, [realtimeData]);

  // restart game (called from React overlay)
  const restartGame = useCallback(() => {
    gameOverRef.current = false;
    gameOverTimerRef.current = 0;
    scoreRef.current = 0;
    displayScoreRef.current = 0;
    comboRef.current = 1;
    comboTimerRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    bestComboRef.current = 1;
    energyRef.current = 3;
    energyFlashRef.current = 0;
    waveRef.current = 1;
    totalTimeRef.current = 0;
    gameDistRef.current = 0;
    boostRushRef.current = 0;
    invincibleRef.current = 2;
    objsRef.current = [];
    partsRef.current = [];
    popsRef.current = [];
    ringsRef.current = [];
    trailRef.current = [];
    spawnTimerRef.current = 1;
    prevScoreRef.current = 0;
    lastMilestoneRef.current = 0;
    prevStreakMilestoneRef.current = 0;
    lastScoreMilestoneRef.current = 0;
    heightRef.current = 0.5;
    targetHeightRef.current = 0.5;
    cappedTargetRef.current = 0.5;
    flashRef.current = { color: C.ship, alpha: 0.2 };
    milestoneRef.current = null;
    gameOverShownRef.current = false;
    energyShatterRef.current = null;
    rushSweepRef.current = 0;
    setGameOverStats(null);
  }, []);

  // helpers
  const pushObj = useCallback((...defs: ObjDef[]) => {
    for (const d of defs) {
      objsRef.current.push({ ...d, id: idRef.current++, hit: false });
    }
  }, []);

  const spawnParticles = useCallback(
    (px: number, py: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        partsRef.current.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 250,
          vy: (Math.random() - 0.5) * 250 - 40,
          life: 0.3 + Math.random() * 0.4,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    },
    [],
  );

  // canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const p = canvas.parentElement;
      if (p) {
        canvas.width = p.clientWidth;
        canvas.height = p.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // main loop
  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastFrameRef.current = performance.now();

    const HIT_W = 0.035;  // horizontal hit tolerance
    const HIT_H = 0.14;   // height hit tolerance
    const SCROLL_SPEED = 0.18; // base scroll speed (fraction of screen/sec)
    const FRAME_CAP_MS = 1000 / 30; // cap at 30fps for Pi performance

    const loop = (now: number) => {
      const elapsed = now - lastFrameRef.current;
      if (elapsed < FRAME_CAP_MS) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(elapsed / 1000, 0.05);
      lastFrameRef.current = now;
      totalTimeRef.current += dt;

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }
      const speed = speedRef.current;
      const groundY = GROUND_Y * h;

      // Velocity-capped target from rowing intensity (max ±0.4/s)
      const rawTarget = Math.max(0.06, Math.min(1, (speedRef.current - 0.3) / 2.2));
      const maxDelta = 0.4 * dt;
      cappedTargetRef.current += Math.max(-maxDelta, Math.min(maxDelta, rawTarget - cappedTargetRef.current));
      targetHeightRef.current = cappedTargetRef.current;

      // Ship height (smooth lerp — ~0.29s to 63% of target)
      heightRef.current += (targetHeightRef.current - heightRef.current) * Math.min(1, dt * 3.5);
      heightRef.current = Math.max(0, Math.min(1, heightRef.current));

      // Grid scroll
      gridOffRef.current = (gridOffRef.current + dt * speed * SCROLL_SPEED * 2) % 1;

      // Virtual distance + milestones (frozen during game over)
      if (!gameOverRef.current) {
        gameDistRef.current += dt * speed * 50;
        const distMilestone = Math.floor(gameDistRef.current / 1000);
        if (distMilestone > lastMilestoneRef.current && lastMilestoneRef.current > 0) {
          const bonus = distMilestone * 50;
          scoreRef.current += bonus;
          milestoneRef.current = { text: `${distMilestone}KM!`, color: C.ship, life: 1.5 };
          flashRef.current = { color: C.ship, alpha: 0.1 };
        }
        lastMilestoneRef.current = distMilestone;
      }

      // Wave transitions (frozen during game over)
      if (!gameOverRef.current) {
        const newWave = Math.floor(totalTimeRef.current / 25) + 1;
        if (newWave > waveRef.current) {
          waveRef.current = newWave;
          waveFlashRef.current = 2.5;
          scoreRef.current += newWave * 100;
          flashRef.current = { color: '#ffffff', alpha: 0.15 };
          gridPulseRef.current = 1;
        }
      }
      if (waveFlashRef.current > 0) waveFlashRef.current -= dt;

      // Boost rush decay
      if (boostRushRef.current > 0) boostRushRef.current -= dt;

      // Game over — run canvas animation then show React summary overlay
      if (gameOverRef.current) {
        gameOverTimerRef.current += dt;
        // After canvas animation settles, trigger React overlay (once)
        if (gameOverTimerRef.current > 2.5 && !gameOverShownRef.current) {
          gameOverShownRef.current = true;
          const prevHigh = highScoreRef.current;
          if (scoreRef.current > highScoreRef.current) {
            highScoreRef.current = scoreRef.current;
            localStorage.setItem('spiritRiverHighScore', String(highScoreRef.current));
          }
          setGameOverStats({
            score: scoreRef.current,
            highScore: highScoreRef.current,
            isNewHigh: scoreRef.current > prevHigh && scoreRef.current > 0,
            bestStreak: bestStreakRef.current,
            bestCombo: bestComboRef.current,
            wave: waveRef.current,
            distance: Math.floor(gameDistRef.current),
          });
        }
      }

      // Spawn (disabled during game over)
      spawnTimerRef.current -= dt;
      if (spawnTimerRef.current <= 0 && !gameOverRef.current) {
        // Difficulty: log₂ base + linear term so long runs (3m+) keep escalating
        const diff = 1 + Math.log2(1 + totalTimeRef.current / 60) * 0.8 + totalTimeRef.current / 600;
        spawnTimerRef.current = (0.9 / diff) / Math.max(0.5, speed);

        const patternRoll = Math.random();
        const patternBoost = Math.min(0.1, waveRef.current * 0.02);
        const canPattern = totalTimeRef.current > 8;

        let patternMatched = false;
        if (canPattern) {
          const extraDelay = selectAndSpawnPattern(patternRoll, totalTimeRef.current, pushObj, patternBoost);
          if (extraDelay >= 0) {
            spawnTimerRef.current += extraDelay;
            patternMatched = true;
          }
        }

        if (!patternMatched) {
          // SINGLE OBJECT fallback — raised barrier cap for late-game pressure
          const barrierChance = Math.min(0.62, 0.25 + totalTimeRef.current / 600);
          const roll = Math.random();
          const type: GameObj['type'] =
            roll < 1 - barrierChance - 0.1 ? 'orb'
              : roll < 1 - 0.1 ? 'barrier'
                : 'boost';
          const height = HEIGHT_LANES[Math.floor(Math.random() * 3)];
          const obj: GameObj = { id: idRef.current++, type, x: 1.1, hit: false, height };
          // Golden orbs: rare (8%), worth 3x
          if (type === 'orb' && Math.random() < 0.08) {
            obj.golden = true;
          }
          // Moving barriers: after 20s, 25% of barriers oscillate
          if (type === 'barrier' && totalTimeRef.current > 20 && Math.random() < 0.25) {
            obj.moving = 1.5 + Math.random() * 1.5;
            obj.baseHeight = height;
          }
          objsRef.current.push(obj);
        }
      }

      // Move objects (scroll left + oscillation + magnet)
      const objs = objsRef.current;
      const goSlowdown = gameOverRef.current ? Math.max(0.1, 1 - gameOverTimerRef.current * 0.5) : 1;
      const scrollDx = dt * speed * SCROLL_SPEED * goSlowdown;
      for (let i = objs.length - 1; i >= 0; i--) {
        objs[i].x -= scrollDx;
        // Oscillating barriers move up/down
        if (objs[i].moving && objs[i].baseHeight !== undefined) {
          objs[i].height = objs[i].baseHeight! + Math.sin(totalTimeRef.current * objs[i].moving! + objs[i].id) * 0.2;
          objs[i].height = Math.max(0.08, Math.min(0.92, objs[i].height));
        }
        // Magnet: orbs/boosts drift toward ship when very close
        if (!objs[i].hit && objs[i].type !== 'barrier') {
          const mdx = objs[i].x - SHIP_X;
          const mdh = objs[i].height - heightRef.current;
          if (mdx > -0.02 && mdx < 0.06 && Math.abs(mdh) < 0.18) {
            objs[i].height -= mdh * dt * 1.5; // gentle pull
          }
        }
        if (objs[i].x < -0.1) {
          // Near-miss bonus
          const obj = objs[i];
          if (!gameOverRef.current && !obj.hit && obj.type === 'barrier') {
            const dh = Math.abs(obj.height - heightRef.current);
            if (dh < 0.28 && dh > HIT_H) {
              const nmX = SHIP_X * w;
              const nmY = heightToY(obj.height, h);
              popsRef.current.push({ x: nmX + 30, y: nmY, text: 'CLOSE!', color: '#ffaa00', life: 0.7 });
              scoreRef.current += 10;
              popsRef.current.push({ x: nmX + 30, y: nmY + 25, text: '+10', color: '#ffaa00', life: 0.9 });
              spawnParticles(nmX, nmY, '#ffaa00', 8);
              spawnParticles(nmX, nmY, '#ffffff', 3);
              flashRef.current = { color: '#ffaa00', alpha: 0.07 };
              shakeRef.current = Math.max(shakeRef.current, 2);
              // Sparks on near-miss
              for (let si = 0; si < 8; si++) {
                const sparkDir = obj.height > heightRef.current ? -1 : 1;
                partsRef.current.push({
                  x: nmX, y: nmY,
                  vx: -60 - Math.random() * 140,
                  vy: sparkDir * (60 + Math.random() * 100),
                  life: 0.25 + Math.random() * 0.2,
                  color: si % 2 === 0 ? '#ffaa00' : '#ffffff',
                  size: 1.5 + Math.random() * 1.5,
                });
              }
            }
          }
          objs.splice(i, 1);
        }
      }

      // Collisions
      const shipScreenX = SHIP_X * w;
      const shipScreenY = heightToY(heightRef.current, h);
      for (const obj of objs) {
        if (obj.hit) continue;
        if (gameOverRef.current) continue;
        if (Math.abs(obj.x - SHIP_X) > HIT_W) continue;
        if (Math.abs(obj.height - heightRef.current) > HIT_H) continue;

        obj.hit = true;
        const px = obj.x * w;
        const py = heightToY(obj.height, h);

        if (obj.type === 'orb') {
          const speedMul = 1 + Math.max(0, speed - 1) * 0.3;
          const goldenMul = obj.golden ? (comboRef.current >= 8 ? 5 : 3) : 1;
          const pts = Math.round(50 * comboRef.current * goldenMul * speedMul);
          scoreRef.current += pts;
          comboRef.current = Math.min(8, comboRef.current + 1);
          comboTimerRef.current = comboRef.current >= 8 ? 4 : 3;
          streakRef.current++;
          if (streakRef.current > bestStreakRef.current) bestStreakRef.current = streakRef.current;
          if (streakRef.current % 5 === 0 && energyRef.current < 3) {
            energyRef.current++;
            energyFlashRef.current = 0.3;
          }
          const orbColor = obj.golden ? C.boost : C.orb;
          spawnParticles(px, py, orbColor, obj.golden ? 20 : 14);
          spawnParticles(px, py, '#ffffff', obj.golden ? 8 : 4);
          ringsRef.current.push({ x: px, y: py, color: orbColor, radius: 5, maxRadius: obj.golden ? 60 : 45, life: obj.golden ? 0.6 : 0.45 });
          ringsRef.current.push({ x: px, y: py, color: '#ffffff', radius: 3, maxRadius: obj.golden ? 40 : 30, life: 0.3 });
          popsRef.current.push({ x: px + (Math.random() - 0.5) * 20, y: py - 15 - Math.random() * 10, text: `+${pts}`, color: obj.golden ? C.boost : C.orb, life: 1 });
          if (obj.golden) {
            flashRef.current = { color: C.boost, alpha: 0.12 };
            gridPulseRef.current = 0.5;
            ringsRef.current.push({ x: px, y: py, color: C.boost, radius: 10, maxRadius: w * 0.5, life: 0.7 });
            ringsRef.current.push({ x: px, y: py, color: '#ffffff', radius: 5, maxRadius: w * 0.35, life: 0.5 });
            ringsRef.current.push({ x: w / 2, y: h / 2, color: C.boost, radius: 15, maxRadius: w * 0.7, life: 0.8 });
            spawnParticles(px, py, C.boost, 10);
            shakeRef.current = 2;
          }
          onCollision?.('coin');
        } else if (obj.type === 'boost') {
          const pts = 100 * comboRef.current;
          scoreRef.current += pts;
          comboRef.current = Math.min(8, comboRef.current + 1);
          comboTimerRef.current = 3;
          if (boostRushRef.current <= 0) rushSweepRef.current = 0.3;
          rushZoomRef.current = 0.08;
          boostRushRef.current = 3;
          energyRef.current = 3;
          energyFlashRef.current = 0.3;
          gridPulseRef.current = 1.0;
          spawnParticles(px, py, C.boost, 24);
          spawnParticles(px, py, '#ffffff', 8);
          ringsRef.current.push({ x: px, y: py, color: C.boost, radius: 5, maxRadius: w * 0.4, life: 0.6 });
          ringsRef.current.push({ x: px, y: py, color: '#ffffff', radius: 8, maxRadius: w * 0.25, life: 0.4 });
          ringsRef.current.push({ x: px, y: py, color: C.combo, radius: 3, maxRadius: w * 0.55, life: 0.7 });
          for (let ri = 0; ri < 16; ri++) {
            const rayAngle = (ri / 16) * Math.PI * 2;
            const raySpd = 300 + Math.random() * 200;
            partsRef.current.push({
              x: px, y: py,
              vx: Math.cos(rayAngle) * raySpd,
              vy: Math.sin(rayAngle) * raySpd,
              life: 0.35 + Math.random() * 0.15,
              color: ri % 2 === 0 ? C.boost : '#ffffff',
              size: 2.5,
            });
          }
          popsRef.current.push({ x: px, y: py - 15, text: `+${pts}`, color: C.boost, life: 1.2 });
          popsRef.current.push({ x: px, y: py - 35, text: 'RUSH!', color: '#ffffff', life: 0.8 });
          flashRef.current = { color: C.boost, alpha: 0.22 };
          gridPulseRef.current = 1.0;
          shakeRef.current = 4;
          onCollision?.('boost');
        } else {
          if (boostRushRef.current > 0) {
            const pts = 25 * comboRef.current;
            scoreRef.current += pts;
            spawnParticles(px, py, C.boost, 40);
            spawnParticles(px, py, C.barrier, 16);
            spawnParticles(px, py, '#ffffff', 10);
            for (let di = 0; di < 12; di++) {
              const angle = (di / 12) * Math.PI * 2 + Math.random() * 0.5;
              partsRef.current.push({
                x: px, y: py,
                vx: Math.cos(angle) * (250 + Math.random() * 250),
                vy: Math.sin(angle) * (250 + Math.random() * 250) - 80,
                life: 0.5 + Math.random() * 0.3,
                color: di % 2 === 0 ? C.barrier : C.barrierCore,
                size: 3 + Math.random() * 4,
              });
            }
            for (let chi = 0; chi < 8; chi++) {
              const chAngle = (chi / 8) * Math.PI * 2 + Math.random() * 0.5;
              partsRef.current.push({
                x: px + (Math.random() - 0.5) * 10, y: py + (Math.random() - 0.5) * 10,
                vx: Math.cos(chAngle) * (120 + Math.random() * 180),
                vy: Math.sin(chAngle) * (120 + Math.random() * 180) - 80,
                life: 0.6 + Math.random() * 0.4,
                color: C.barrier,
                size: 4 + Math.random() * 4,
              });
            }
            ringsRef.current.push({ x: px, y: py, color: C.boost, radius: 5, maxRadius: 70, life: 0.4 });
            ringsRef.current.push({ x: px, y: py, color: C.barrier, radius: 5, maxRadius: 45, life: 0.3 });
            ringsRef.current.push({ x: px, y: py, color: '#ffffff', radius: 10, maxRadius: 60, life: 0.35 });
            popsRef.current.push({ x: px, y: py, text: `+${pts}`, color: C.boost, life: 0.8 });
            shakeRef.current = 6;
          } else if (invincibleRef.current <= 0) {
            scoreRef.current = Math.max(0, scoreRef.current - 50);
            comboRef.current = 1;
            comboTimerRef.current = 0;
            streakRef.current = 0;
            shakeRef.current = 10;
            invincibleRef.current = 1.5;
            damageFXRef.current = 0.8;
            energyShatterRef.current = { pipIndex: energyRef.current - 1, timer: 0.4 };
            energyRef.current = Math.max(0, energyRef.current - 1);
            energyFlashRef.current = 0.5;
            spawnParticles(px, py, C.barrier, 12);
            ringsRef.current.push({ x: px, y: py, color: C.barrier, radius: 5, maxRadius: 50, life: 0.35 });
            popsRef.current.push({ x: px, y: py, text: '-50', color: C.barrier, life: 1 });
            flashRef.current = { color: C.barrier, alpha: 0.2 };
            // Game over at 0 energy
            if (energyRef.current <= 0) {
              gameOverRef.current = true;
              gameOverTimerRef.current = 0;
              flashRef.current = { color: '#ff0000', alpha: 0.4 };
              shakeRef.current = 20;
            }
          }
          onCollision?.('rock');
        }
      }

      // Combo milestones
      if (comboRef.current > prevComboRef.current) {
        if (comboRef.current === 4) {
          milestoneRef.current = { text: 'GREAT!', color: C.orb, life: 1.2 };
          flashRef.current = { color: C.orb, alpha: 0.1 };
        } else if (comboRef.current === 6) {
          milestoneRef.current = { text: 'AMAZING!', color: C.combo, life: 1.5 };
          flashRef.current = { color: C.combo, alpha: 0.12 };
        } else if (comboRef.current === 8) {
          milestoneRef.current = { text: 'PERFECT!', color: C.boost, life: 2 };
          flashRef.current = { color: C.boost, alpha: 0.15 };
          shakeRef.current = 3;
          gridPulseRef.current = 0.8;
        }
      }
      prevComboRef.current = comboRef.current;
      if (comboRef.current > bestComboRef.current) bestComboRef.current = comboRef.current;

      // Streak milestones
      if (streakRef.current > 0 && streakRef.current % 10 === 0 && streakRef.current !== prevStreakMilestoneRef.current) {
        prevStreakMilestoneRef.current = streakRef.current;
        const bonus = streakRef.current * 20;
        scoreRef.current += bonus;
        const streakColor = streakRef.current >= 30 ? C.boost : streakRef.current >= 20 ? C.combo : C.ship;
        milestoneRef.current = {
          text: streakRef.current >= 30 ? 'LEGENDARY!' : streakRef.current >= 20 ? 'UNSTOPPABLE!' : 'ON FIRE!',
          color: streakColor,
          life: 1.8,
        };
        flashRef.current = { color: streakColor, alpha: 0.12 };
        gridPulseRef.current = 0.6;
        popsRef.current.push({ x: w / 2, y: h * 0.5, text: `+${bonus}`, color: streakColor, life: 1.2 });
      }

      // Score milestones (every 10000 points)
      const scoreMilestone = Math.floor(scoreRef.current / 10000);
      if (scoreMilestone > lastScoreMilestoneRef.current) {
        lastScoreMilestoneRef.current = scoreMilestone;
        const totalK = scoreMilestone * 10;
        const smText = `${totalK}K!`;
        const isMajor = totalK % 25 === 0;
        const isEpic = totalK % 50 === 0;
        const milestoneColor = isEpic ? '#ffffff' : isMajor ? C.boost : C.ship;
        milestoneRef.current = { text: smText, color: milestoneColor, life: isEpic ? 3 : isMajor ? 2.5 : 2 };
        flashRef.current = { color: milestoneColor, alpha: isEpic ? 0.2 : isMajor ? 0.15 : 0.12 };
        gridPulseRef.current = isEpic ? 1.2 : isMajor ? 1.0 : 0.8;
        shakeRef.current = isEpic ? 8 : isMajor ? 5 : 0;
        // Celebration particles
        const burstCount = isEpic ? 5 : isMajor ? 4 : 3;
        for (let fi = 0; fi < burstCount; fi++) {
          const fx = w * (0.2 + fi * (0.6 / burstCount));
          const fy = h * (0.15 + Math.random() * 0.25);
          spawnParticles(fx, fy, C.boost, isEpic ? 15 : 10);
          spawnParticles(fx, fy, C.ship, isEpic ? 10 : 6);
          spawnParticles(fx, fy, C.combo, isEpic ? 10 : 6);
          const confettiColors = ['#ff6b9d', '#c084fc', '#67e8f9', '#fbbf24', '#34d399'];
          for (let cc = 0; cc < (isEpic ? 4 : 2); cc++) {
            const cColor = confettiColors[(fi + cc) % confettiColors.length];
            spawnParticles(fx + (Math.random() - 0.5) * 30, fy + (Math.random() - 0.5) * 20, cColor, isEpic ? 6 : 3);
          }
          ringsRef.current.push({ x: fx, y: fy, color: C.boost, radius: 5, maxRadius: isEpic ? 80 : 50, life: isEpic ? 0.7 : 0.5 });
          if (isEpic) {
            ringsRef.current.push({ x: fx, y: fy, color: C.combo, radius: 8, maxRadius: 60, life: 0.6 });
          }
        }
      }
      if (milestoneRef.current) {
        milestoneRef.current.life -= dt;
        if (milestoneRef.current.life <= 0) milestoneRef.current = null;
      }

      // Combo decay
      if (comboTimerRef.current > 0) {
        comboTimerRef.current -= dt;
        if (comboTimerRef.current <= 0) comboRef.current = 1;
      }

      // Ship trail
      trailRef.current.push({ x: shipScreenX, y: shipScreenY, age: 0 });
      for (let ti = trailRef.current.length - 1; ti >= 0; ti--) {
        trailRef.current[ti].age += dt;
        if (trailRef.current[ti].age > 0.6) trailRef.current.splice(ti, 1);
      }

      // Passive score (frozen during game over)
      if (!gameOverRef.current) scoreRef.current += Math.floor(dt * speed * 5);

      // Timer decays
      if (strokePulseRef.current > 0) strokePulseRef.current -= dt;
      if (invincibleRef.current > 0) invincibleRef.current -= dt;
      if (energyFlashRef.current > 0) energyFlashRef.current -= dt;
      if (gridPulseRef.current > 0) gridPulseRef.current -= dt * 2;
      if (damageFXRef.current > 0) damageFXRef.current -= dt;
      if (energyShatterRef.current) {
        energyShatterRef.current.timer -= dt;
        if (energyShatterRef.current.timer <= 0) energyShatterRef.current = null;
      }
      if (rushSweepRef.current > 0) rushSweepRef.current -= dt;
      if (rushZoomRef.current > 0) rushZoomRef.current -= dt * 0.35;
      const bpm = 110 + speed * 20;
      beatRef.current = (beatRef.current + dt * bpm / 60) % 1;

      if (scoreRef.current !== prevScoreRef.current) {
        if (scoreRef.current > prevScoreRef.current) scoreFlashRef.current = 0.3;
        prevScoreRef.current = scoreRef.current;
      }
      if (scoreFlashRef.current > 0) scoreFlashRef.current -= dt;
      // Smooth odometer interpolation for displayed score
      const scoreDiff = scoreRef.current - displayScoreRef.current;
      if (Math.abs(scoreDiff) < 2) {
        displayScoreRef.current = scoreRef.current;
      } else {
        displayScoreRef.current += scoreDiff * Math.min(1, dt * 8);
      }
      if (displayScoreRef.current < 0) displayScoreRef.current = 0;

      if (shakeRef.current > 0) {
        shakeRef.current *= Math.pow(0.02, dt);
        if (shakeRef.current < 0.3) shakeRef.current = 0;
      }
      if (flashRef.current) {
        flashRef.current.alpha -= dt * 2;
        if (flashRef.current.alpha <= 0) flashRef.current = null;
      }

      // Particles
      const parts = partsRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt;
        // Bounce off ground
        if (p.y > groundY && p.vy > 0) {
          p.vy *= -0.4;
          p.y = groundY;
        }
        p.life -= dt;
        if (p.life <= 0) parts.splice(i, 1);
      }

      // Popups
      const pops = popsRef.current;
      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].y -= dt * 60;
        pops[i].life -= dt;
        if (pops[i].life <= 0) pops.splice(i, 1);
      }

      // Ring bursts
      const rings = ringsRef.current;
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].life -= dt;
        rings[i].radius += (rings[i].maxRadius - rings[i].radius) * dt * 8;
        if (rings[i].life <= 0) rings.splice(i, 1);
      }

      // Update ambient particles
      updatePetals(petalsRef.current, dt, w, h, GROUND_Y);
      updateFireflies(firefliesRef.current, dt, now, GROUND_Y);
      updateSpiritOrbs(spiritOrbsRef.current, dt, now, GROUND_Y);

      ctx.save();

      // Screen shake
      if (shakeRef.current > 0) {
        ctx.translate(
          (Math.random() - 0.5) * shakeRef.current,
          (Math.random() - 0.5) * shakeRef.current,
        );
      }

      // Rush entry zoom punch — brief scale-in burst
      if (rushZoomRef.current > 0) {
        const zoomScale = 1 + Math.max(0, rushZoomRef.current);
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(-w / 2, -h / 2);
      }

      const SZ = 46; // ship half-size (1.44× bigger for readability)
      const inRush = boostRushRef.current > 0;
      const comboHigh = comboRef.current >= 4;

      // BACKGROUND LAYERS
      drawSpiritSky(ctx, w, h, now, GROUND_Y, waveRef.current, speed);
      drawMoon(ctx, w, h, now);
      drawMountains(ctx, w, h, now, GROUND_Y, speed, totalTimeRef.current);
      drawTemples(ctx, w, h, now, GROUND_Y, totalTimeRef.current, speed);
      drawMist(ctx, w, h, now, GROUND_Y);
      drawRiver(ctx, w, h, now, GROUND_Y, speed, totalTimeRef.current);
      drawLanterns(ctx, w, h, now, GROUND_Y, totalTimeRef.current, speed);

      // HEIGHT GAUGE (left edge)
      {
        const gaugeX = 8;
        const gaugeTop = CEIL_Y * h + 10;
        const gaugeBot = groundY - 10;
        const gaugeH = gaugeBot - gaugeTop;
        // Track
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.roundRect(gaugeX, gaugeTop, 4, gaugeH, 2);
        ctx.fill();
        // Ship position marker
        const markerY = gaugeBot - heightRef.current * gaugeH;
        const gaugeColor = heightRef.current > 0.7 ? C.boost : heightRef.current > 0.4 ? C.ship : C.orb;
        ctx.fillStyle = gaugeColor;
        ctx.shadowColor = gaugeColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(gaugeX - 1, markerY - 4, 6, 8, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // BOAT SHADOW ON WATER
      if (heightRef.current > 0.05) {
        const shadowAlpha = 0.08 * (1 - heightRef.current * 0.4);
        ctx.fillStyle = `rgba(100,80,50,${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(shipScreenX, groundY + 3, SZ * 0.85, SZ * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // BOAT WATER REFLECTION
      {
        const proximity = 1 - heightRef.current;
        const reflAlpha = Math.min(0.12, proximity * 0.15);
        if (reflAlpha > 0.01) {
          const reflY = groundY + 4;
          const distToWater = groundY - shipScreenY;
          const reflScale = Math.max(0.3, 1 - distToWater / (h * 0.3));
          const waveDistort = Math.sin(totalTimeRef.current * 3 + shipScreenX * 0.05) * 3;

          ctx.save();
          ctx.translate(shipScreenX + waveDistort, reflY);
          ctx.scale(1, -0.4 * reflScale); // flip + compress
          ctx.globalAlpha = reflAlpha;

          // Reflected hull shape (simplified)
          const boatRGB = inRush ? '255,215,0' : comboHigh ? '255,140,0' : '212,165,116';
          ctx.fillStyle = `rgba(${boatRGB},0.5)`;
          ctx.beginPath();
          ctx.moveTo(SZ * 0.9, -SZ * 0.02);
          ctx.quadraticCurveTo(SZ * 0.4, -SZ * 0.22, -SZ * 0.25, -SZ * 0.20);
          ctx.lineTo(-SZ * 0.65, -SZ * 0.12);
          ctx.lineTo(-SZ * 0.65, SZ * 0.10);
          ctx.lineTo(-SZ * 0.25, SZ * 0.32);
          ctx.quadraticCurveTo(SZ * 0.4, SZ * 0.36, SZ * 0.9, -SZ * 0.02);
          ctx.closePath();
          ctx.fill();

          ctx.globalAlpha = 1;
          ctx.restore();

          // Shimmer line at reflection top
          const shimmerA = reflAlpha * 0.4;
          ctx.strokeStyle = `rgba(${boatRGB},${shimmerA})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let rx = -SZ * 0.7; rx <= SZ * 0.9; rx += 3) {
            const ry = reflY + Math.sin(totalTimeRef.current * 4 + (shipScreenX + rx) * 0.1) * 1.5;
            if (rx === -SZ * 0.7) ctx.moveTo(shipScreenX + rx + waveDistort, ry);
            else ctx.lineTo(shipScreenX + rx + waveDistort, ry);
          }
          ctx.stroke();
        }
      }

      // BOAT WARM GLOW ON WATER
      {
        const proximity = 1 - heightRef.current;
        const glowAlpha = proximity * 0.07;
        if (glowAlpha > 0.005) {
          // Primary warm glow pool
          const glowR = 30 + proximity * 20;
          const gG = ctx.createRadialGradient(shipScreenX, groundY + 3, 0, shipScreenX, groundY + 3, glowR);
          gG.addColorStop(0, `rgba(212,165,116,${glowAlpha})`);
          gG.addColorStop(0.4, `rgba(200,150,100,${glowAlpha * 0.4})`);
          gG.addColorStop(1, 'transparent');
          ctx.fillStyle = gG;
          ctx.beginPath();
          ctx.ellipse(shipScreenX, groundY + 3, glowR, glowR * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();

          // Inner hot spot — brighter when very close
          if (proximity > 0.5) {
            const hotAlpha = (proximity - 0.5) * 0.1;
            const hotR = 12 + proximity * 8;
            const hG = ctx.createRadialGradient(shipScreenX, groundY + 2, 0, shipScreenX, groundY + 2, hotR);
            hG.addColorStop(0, `rgba(255,220,160,${hotAlpha})`);
            hG.addColorStop(0.6, `rgba(255,200,130,${hotAlpha * 0.3})`);
            hG.addColorStop(1, 'transparent');
            ctx.fillStyle = hG;
            ctx.beginPath();
            ctx.ellipse(shipScreenX, groundY + 2, hotR, hotR * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // BOAT-TO-WATER LIGHT PILLAR
      {
        const proximity = 1 - heightRef.current; // 1 = on water, 0 = at ceiling
        const pillarAlpha = 0.04 + proximity * 0.08;
        const pillarWidth = 3 + proximity * 5;
        const pilG = ctx.createLinearGradient(shipScreenX, shipScreenY + SZ * 0.4, shipScreenX, groundY);
        pilG.addColorStop(0, `rgba(212,165,116,${pillarAlpha})`);
        pilG.addColorStop(0.3, `rgba(212,165,116,${pillarAlpha * 0.4})`);
        pilG.addColorStop(0.8, `rgba(180,200,220,${pillarAlpha * 0.15})`);
        pilG.addColorStop(1, 'transparent');
        ctx.fillStyle = pilG;
        ctx.fillRect(shipScreenX - pillarWidth * 0.5, shipScreenY + SZ * 0.4, pillarWidth, groundY - shipScreenY - SZ * 0.4);
      }

      // WATER SPLASH BELOW BOAT
      {
        const proximity = 1 - heightRef.current; // 1 = on water, 0 = at ceiling
        const splashX = shipScreenX;
        const splashY = groundY + 2;

        // Concentric ripple rings (flattened ellipses for perspective)
        if (proximity > 0.2) {
          const rippleCount = 3;
          for (let ri = 0; ri < rippleCount; ri++) {
            const phase = (totalTimeRef.current * 2 + ri * 1.2) % 3;
            const rippleProgress = phase / 3;
            const rippleR = 8 + rippleProgress * (20 + proximity * 25);
            const rippleA = (1 - rippleProgress) * proximity * 0.12;
            if (rippleA > 0.005) {
              ctx.strokeStyle = `rgba(180,200,220,${rippleA})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.ellipse(splashX, splashY, rippleR, rippleR * 0.18, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }

        // Splash droplets when boat is near water
        if (proximity > 0.6) {
          const dropletIntensity = (proximity - 0.6) / 0.4; // 0-1
          const dropCount = Math.floor(dropletIntensity * 4);
          for (let di = 0; di < dropCount; di++) {
            const dPhase = totalTimeRef.current * 3 + di * 2.1;
            const dProgress = (dPhase % 1.5) / 1.5;
            const dX = splashX + Math.sin(dPhase * 1.7 + di) * (10 + di * 5);
            const dY = splashY - dProgress * (8 + dropletIntensity * 12);
            const dA = (1 - dProgress) * dropletIntensity * 0.25;
            if (dA > 0.01) {
              ctx.fillStyle = `rgba(180,210,230,${dA})`;
              ctx.beginPath();
              ctx.arc(dX, dY, 1 + (1 - dProgress) * 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Subtle disturbance glow at splash point
        if (proximity > 0.3) {
          const disturbA = proximity * 0.06;
          const disturbG = ctx.createRadialGradient(splashX, splashY, 0, splashX, splashY, 18 + proximity * 10);
          disturbG.addColorStop(0, `rgba(180,200,230,${disturbA})`);
          disturbG.addColorStop(0.5, `rgba(150,180,210,${disturbA * 0.3})`);
          disturbG.addColorStop(1, 'transparent');
          ctx.fillStyle = disturbG;
          ctx.beginPath();
          ctx.ellipse(splashX, splashY, 18 + proximity * 10, 5 + proximity * 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // BOAT WAKE TRAIL
      {
        const trail = trailRef.current;
        if (trail.length > 2) {
          const trailColor = inRush ? '255,215,0' : comboHigh ? '255,140,0' : '150,180,200';

          // Glow behind trail (wider, softer)
          for (let ti = 1; ti < trail.length; ti++) {
            const t0 = trail[ti - 1];
            const t1 = trail[ti];
            const lifeRatio = 1 - t1.age / 0.6;
            const glowA = lifeRatio * 0.06;
            if (glowA <= 0) continue;
            ctx.strokeStyle = `rgba(${trailColor},${glowA})`;
            ctx.lineWidth = Math.max(2, lifeRatio * 10);
            ctx.beginPath();
            ctx.moveTo(t0.x, t0.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.stroke();
          }

          // Core trail (sharper)
          for (let ti = 1; ti < trail.length; ti++) {
            const t0 = trail[ti - 1];
            const t1 = trail[ti];
            const lifeRatio = 1 - t1.age / 0.6;
            const ta = lifeRatio * 0.25;
            if (ta <= 0) continue;
            ctx.strokeStyle = `rgba(${trailColor},${ta})`;
            ctx.lineWidth = Math.max(0.5, lifeRatio * 4);
            ctx.beginPath();
            ctx.moveTo(t0.x, t0.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.stroke();
          }
        }

        // Water surface foam behind boat
        const proximity = 1 - heightRef.current;
        if (proximity > 0.3 && speed > 0.3) {
          const foamCount = Math.min(8, Math.floor(speed * 3));
          for (let fi = 0; fi < foamCount; fi++) {
            const foamAge = (totalTimeRef.current * 2 + fi * 0.7) % 2;
            const foamX = shipScreenX - foamAge * (30 + speed * 15) + Math.sin(totalTimeRef.current * 3 + fi * 2.3) * 4;
            const foamY = groundY + 2 + Math.sin(totalTimeRef.current * 4 + fi * 1.7) * 1.5;
            const foamA = Math.max(0, (1 - foamAge / 2) * proximity * 0.08);
            if (foamA > 0.005) {
              ctx.fillStyle = `rgba(200,220,240,${foamA})`;
              ctx.beginPath();
              ctx.ellipse(foamX, foamY, 3 + (1 - foamAge / 2) * 4, 1, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // OBJECTS
      for (const obj of objs) {
        if (obj.hit) continue;
        const ox = obj.x * w;
        const oy = heightToY(obj.height, h);
        if (ox < -30 || ox > w + 30) continue;

        // Depth fade — objects approaching from right fade in
        const depthFade = obj.x > 0.85 ? 1 - (obj.x - 0.85) / 0.25 : 1;
        if (depthFade <= 0) continue;
        ctx.globalAlpha = depthFade;

        if (obj.type === 'orb') {
          // Magnetic proximity
          const magDx = Math.abs(obj.x - SHIP_X);
          const magDh = Math.abs(obj.height - heightRef.current);
          const heightProx = (magDx < 0.08 && magDh < 0.2)
            ? (1 - magDx / 0.08) * (1 - magDh / 0.2)
            : 0;

          drawSakuraBlossom(ctx, ox, oy, now, obj.id, obj.golden === true, GROUND_Y, h, heightProx);

          // Edge warning for golden orbs
          if (obj.golden && obj.x > 0.85) {
            const edgeA = (obj.x - 0.85) / 0.25 * 0.1;
            const edgeG = ctx.createLinearGradient(w - 40, 0, w, 0);
            edgeG.addColorStop(0, 'transparent');
            edgeG.addColorStop(1, `rgba(255,215,0,${edgeA})`);
            ctx.fillStyle = edgeG;
            ctx.fillRect(w - 40, oy - 30, 40, 60);
          }

        } else if (obj.type === 'barrier') {
          const heightProx2 = 1 - Math.min(1, Math.abs(obj.height - heightRef.current) / 0.3);
          const approaching2 = obj.x < 0.3 ? (0.3 - obj.x) / 0.3 : 0;
          drawDangerRock(ctx, ox, oy, w, h, now, obj.id, depthFade, heightProx2, approaching2, !!obj.moving, GROUND_Y);
        } else {
          // Boost — koi fish
          drawKoiFish(ctx, ox, oy, now, obj.id, GROUND_Y, h);
        }
        ctx.globalAlpha = 1;
      }

      // ROWING BOAT
      const shipVisible = invincibleRef.current <= 0 || Math.sin(now * 0.02) > 0;
      const heightDelta = targetHeightRef.current - heightRef.current;
      const shipPitch = heightDelta * -0.25;

      // Streak glow (persistent warm glow behind boat when on a streak)
      if (streakRef.current >= 5) {
        const streakGlowColor = streakRef.current >= 15 ? '255,215,0' : streakRef.current >= 10 ? '255,140,0' : '255,105,180';
        const streakA = Math.min(0.06, streakRef.current * 0.004);
        const sGlowR = 45 + streakRef.current * 2;
        const sG = ctx.createRadialGradient(shipScreenX - 10, shipScreenY, 5, shipScreenX - 10, shipScreenY, sGlowR);
        sG.addColorStop(0, `rgba(${streakGlowColor},${streakA})`);
        sG.addColorStop(0.5, `rgba(${streakGlowColor},${streakA * 0.3})`);
        sG.addColorStop(1, 'transparent');
        ctx.fillStyle = sG;
        ctx.beginPath();
        ctx.arc(shipScreenX - 10, shipScreenY, sGlowR, 0, Math.PI * 2);
        ctx.fill();
      }

      drawRowingBoat(
        ctx, shipScreenX, shipScreenY, now, SZ,
        shipPitch, shipVisible, inRush, comboHigh,
        comboRef.current, speed, streakRef.current,
        strokePulseRef.current, heightDelta,
      );

      // Invincibility timer ring
      if (invincibleRef.current > 0) {
        const ivPct = invincibleRef.current / 1.5;
        const ivA2 = 0.05 * ivPct;
        const ivAngle = ivPct * Math.PI * 2;
        ctx.strokeStyle = `rgba(212,165,116,${ivA2})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(shipScreenX, shipScreenY, SZ * 1.8, -Math.PI / 2, -Math.PI / 2 + ivAngle);
        ctx.stroke();
      }

      // PARTICLES
      ctx.shadowBlur = 0;
      for (const p of parts) {
        const a = Math.min(1, p.life / 0.4);
        if (a <= 0) continue;
        // Motion trail
        if (p.size > 1.5 && (Math.abs(p.vx) > 50 || Math.abs(p.vy) > 50)) {
          const trailLen = Math.min(8, Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.02);
          const nx = p.vx / Math.sqrt(p.vx * p.vx + p.vy * p.vy + 1);
          const ny = p.vy / Math.sqrt(p.vx * p.vx + p.vy * p.vy + 1);
          ctx.globalAlpha = a * 0.3;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * a * 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - nx * trailLen, p.y - ny * trailLen);
          ctx.stroke();
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // RING BURSTS
      for (const ring of rings) {
        const ra = Math.max(0, ring.life / 0.5);
        if (ring.radius > 10) {
          const ringGlow = ctx.createRadialGradient(ring.x, ring.y, ring.radius * 0.8, ring.x, ring.y, ring.radius);
          ringGlow.addColorStop(0, 'transparent');
          ringGlow.addColorStop(0.7, `${ring.color}${Math.round(ra * 15).toString(16).padStart(2, '0')}`);
          ringGlow.addColorStop(1, 'transparent');
          ctx.globalAlpha = 1;
          ctx.fillStyle = ringGlow;
          ctx.fillRect(ring.x - ring.radius, ring.y - ring.radius, ring.radius * 2, ring.radius * 2);
        }
        ctx.globalAlpha = ra * 0.5;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 2.5 - ra * 1.5;
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        const innerR = ring.radius * 0.6;
        if (innerR > 3) {
          ctx.globalAlpha = ra * 0.25;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, innerR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // POPUPS
      for (const pop of pops) {
        const a = Math.min(1, pop.life);
        const scale = pop.life > 0.7 ? 1 + (pop.life - 0.7) * 2 : 1;
        const numMatch = pop.text.match(/\+(\d+)/);
        const val = numMatch ? parseInt(numMatch[1], 10) : 0;
        const valBoost = val > 500 ? 1.5 : val > 200 ? 1.25 : val > 100 ? 1.1 : 1;
        if (val > 200) {
          const glowR = 20 + val * 0.02;
          const glowA = a * 0.04;
          const gG = ctx.createRadialGradient(pop.x, pop.y, 0, pop.x, pop.y, glowR);
          gG.addColorStop(0, `${pop.color}${Math.round(glowA * 255).toString(16).padStart(2, '0')}`);
          gG.addColorStop(1, 'transparent');
          ctx.fillStyle = gG;
          ctx.fillRect(pop.x - glowR, pop.y - glowR, glowR * 2, glowR * 2);
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = pop.color;
        ctx.shadowColor = pop.color;
        ctx.shadowBlur = val > 200 ? 18 : 12;
        const fontSize = Math.round(20 * scale * valBoost);
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        const spawnRot = pop.life > 0.8 ? (pop.life - 0.8) * 0.5 * (pop.x % 2 === 0 ? 1 : -1) : 0;
        if (Math.abs(spawnRot) > 0.01) {
          ctx.save();
          ctx.translate(pop.x, pop.y);
          ctx.rotate(spawnRot);
          ctx.fillText(pop.text, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(pop.text, pop.x, pop.y);
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // AMBIENT PARTICLES
      drawSpiritParticles(ctx, w, h, now, spiritOrbsRef.current, GROUND_Y);
      drawSakuraPetals(ctx, w, h, petalsRef.current);
      drawFireflies(ctx, w, h, now, firefliesRef.current);

      // RUSH SWEEP
      if (rushSweepRef.current > 0) {
        const sweepX = w * (1 - rushSweepRef.current / 0.3);
        const sweepG = ctx.createLinearGradient(sweepX - 15, 0, sweepX + 15, 0);
        sweepG.addColorStop(0, 'transparent');
        sweepG.addColorStop(0.5, `rgba(255,215,0,${rushSweepRef.current})`);
        sweepG.addColorStop(1, 'transparent');
        ctx.fillStyle = sweepG;
        ctx.fillRect(sweepX - 15, 0, 30, h);
      }

      // FLASH OVERLAY
      if (flashRef.current && flashRef.current.alpha > 0) {
        ctx.globalAlpha = flashRef.current.alpha;
        ctx.fillStyle = flashRef.current.color;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // SPEED LINES (at high speed)
      if (speed > 1.8 || inRush) {
        const lineCount = inRush ? 25 : Math.min(12, Math.floor((speed - 1.5) * 6));
        for (let s = 0; s < lineCount; s++) {
          const lx = Math.random() * w;
          const ly = CEIL_Y * h + Math.random() * PLAY_H * h;
          const ll = (20 + speed * 15 + (inRush ? 40 : 0));
          const lineColor = inRush ? '255,220,150' : '200,210,220';
          const lineA = inRush ? 0.08 : 0.025;
          ctx.strokeStyle = `rgba(${lineColor},${lineA + Math.random() * 0.015})`;
          ctx.lineWidth = inRush ? 1 : 0.5;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx - ll, ly);
          ctx.stroke();
        }
      }

      // HUD
      const hudData: HudData = {
        energy: energyRef.current,
        energyFlash: energyFlashRef.current,
        energyShatter: energyShatterRef.current,
        speed,
        inRush,
        boostRush: boostRushRef.current,
        wave: waveRef.current,
        totalTime: totalTimeRef.current,
        displayScore: displayScoreRef.current,
        scoreRef: scoreRef.current,
        scoreFlash: scoreFlashRef.current,
        combo: comboRef.current,
        comboTimer: comboTimerRef.current,
        streak: streakRef.current,
        t: now,
      };
      drawSpiritHUD(ctx, w, h, hudData);

      // MILESTONE OVERLAY
      if (milestoneRef.current) {
        const m = milestoneRef.current;
        const mAlpha = Math.min(1, m.life * 1.5);
        const mScale = 1 + (1 - mAlpha) * 0.3;
        // Push milestone below wave transition text if both are active
        const mY = waveFlashRef.current > 0 ? h * 0.55 : h * 0.4;
        ctx.textAlign = 'center';
        ctx.globalAlpha = mAlpha;
        ctx.font = `bold ${Math.round(44 * mScale)}px monospace`;
        ctx.fillStyle = m.color;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 20;
        ctx.fillText(m.text, w / 2, mY);
        ctx.shadowBlur = 0;
        if (m.life > 0.5) {
          ctx.globalAlpha = mAlpha * 0.4;
          ctx.font = '11px monospace';
          ctx.fillStyle = 'rgba(245,230,208,0.5)';
          const sub = m.text.includes('KM') ? `${Math.floor(gameDistRef.current).toLocaleString()}m total`
            : m.text.includes('K!') ? `Score: ${scoreRef.current.toLocaleString()}`
            : m.text.includes('STREAK') || m.text.includes('FIRE') || m.text.includes('UNSTOPPABLE') || m.text.includes('LEGENDARY') ? `Streak: ${streakRef.current}`
            : m.text === 'PERFECT!' ? `Max combo reached!`
            : '';
          if (sub) ctx.fillText(sub, w / 2, mY + 22);
        }
        ctx.globalAlpha = 1;
      }

      // WAVE TRANSITION OVERLAY
      if (waveFlashRef.current > 0) {
        const wt = waveFlashRef.current;
        const wAlpha = wt > 2 ? (2.5 - wt) * 2 : Math.min(1, wt / 0.5);
        // Radial darken from center
        const wipeR = (1 - Math.min(1, wt / 2.5)) * w * 1.2;
        const wipeG = ctx.createRadialGradient(w / 2, h * 0.38, wipeR * 0.5, w / 2, h * 0.38, wipeR);
        wipeG.addColorStop(0, 'rgba(0,0,0,0)');
        wipeG.addColorStop(0.7, `rgba(0,0,0,${wAlpha * 0.1})`);
        wipeG.addColorStop(1, `rgba(0,0,0,${wAlpha * 0.15})`);
        ctx.fillStyle = wipeG;
        ctx.fillRect(0, 0, w, h);
        // Sweep ring
        ctx.globalAlpha = wAlpha * 0.3;
        ctx.strokeStyle = C.ship;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.38, wipeR, 0, Math.PI * 2);
        ctx.stroke();
        // Text
        ctx.textAlign = 'center';
        ctx.globalAlpha = wAlpha * 0.85;
        ctx.font = 'bold 42px monospace';
        ctx.shadowColor = C.ship;
        ctx.shadowBlur = 30;
        ctx.fillStyle = C.ship;
        ctx.fillText(`WAVE ${waveRef.current}`, w / 2, h * 0.38 - 8);
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#f5e6d0';
        ctx.fillText(`WAVE ${waveRef.current}`, w / 2, h * 0.38 - 8);
        ctx.shadowBlur = 0;
        // Subtitle
        ctx.font = 'bold 16px monospace';
        ctx.shadowColor = C.boost;
        ctx.shadowBlur = 10;
        ctx.fillStyle = C.boost;
        ctx.fillText(`+${waveRef.current * 100} BONUS`, w / 2, h * 0.38 + 20);
        ctx.shadowBlur = 0;
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(245,230,208,0.5)';
        ctx.fillText(`SPEED ${(1 + waveRef.current * 0.15).toFixed(1)}×`, w / 2, h * 0.38 + 36);
        // Warm amber rays from center
        if (wt > 1.8) {
          const rayA = wAlpha * 0.02;
          ctx.globalCompositeOperation = 'screen';
          for (let ri = 0; ri < 6; ri++) {
            const rayAngle = (ri / 6) * Math.PI * 2 + (2.5 - wt) * 3;
            const rayLen = w * 0.6;
            const rayColor = ri % 3 === 0 ? C.ship : ri % 3 === 1 ? C.boost : C.combo;
            ctx.strokeStyle = `${rayColor}${Math.round(rayA * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(w / 2, h * 0.38);
            ctx.lineTo(w / 2 + Math.cos(rayAngle) * rayLen, h * 0.38 + Math.sin(rayAngle) * rayLen);
            ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        // Water ripple pulse on wave transition
        if (wt > 1.0 && wt < 2.2) {
          const gpProgress = (wt - 1.0) / 1.2;
          const gpRadius = gpProgress * w * 0.6;
          const gpAlpha = (1 - gpProgress) * wAlpha * 0.06;
          ctx.strokeStyle = `rgba(150,180,200,${gpAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(w / 2, groundY + 5, gpRadius, gpRadius * 0.12, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // ALTITUDE WARNING FLASH (near ceiling/floor)
      {
        const altH = heightRef.current;
        if (altH < 0.08 || altH > 0.92) {
          const altA = altH < 0.08 ? (0.08 - altH) / 0.08 * 0.03 : (altH - 0.92) / 0.08 * 0.03;
          const altEdge = altH < 0.08 ? 0 : h;
          const altGrad = ctx.createLinearGradient(0, altEdge, 0, altEdge + (altH < 0.08 ? 30 : -30));
          altGrad.addColorStop(0, `rgba(255,100,50,${altA})`);
          altGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = altGrad;
          ctx.fillRect(0, altH < 0.08 ? 0 : h - 30, w, 30);
        }
      }

      // DANGER ZONE EFFECTS
      // Barrier proximity alarm
      {
        let closestDanger = 1;
        for (const obj of objs) {
          if (obj.hit || obj.type !== 'barrier') continue;
          const dx = obj.x - SHIP_X;
          const dh = Math.abs(obj.height - heightRef.current);
          if (dx > 0 && dx < 0.1 && dh < 0.2) {
            closestDanger = Math.min(closestDanger, dx);
          }
        }
        if (closestDanger < 0.08) {
          const dangerA = (1 - closestDanger / 0.08) * 0.06;
          ctx.fillStyle = `rgba(204,0,0,${dangerA})`;
          ctx.fillRect(0, 0, 4, h);
          ctx.fillRect(w - 4, 0, 4, h);
          ctx.fillRect(0, 0, w, 4);
          ctx.fillRect(0, h - 4, w, 4);
        }
      }

      // Danger mode (low energy) — warm red vignette
      if (energyRef.current === 1) {
        const heartbeat = Math.pow(Math.abs(Math.sin(now * 0.003)), 3);
        ctx.fillStyle = `rgba(204,0,0,${0.04 + heartbeat * 0.06})`;
        ctx.fillRect(0, 0, w, h);
        const dangerEdge = 0.03 + heartbeat * 0.04;
        const dGLeft = ctx.createLinearGradient(0, 0, 35, 0);
        dGLeft.addColorStop(0, `rgba(204,0,0,${dangerEdge})`);
        dGLeft.addColorStop(1, 'transparent');
        ctx.fillStyle = dGLeft;
        ctx.fillRect(0, 0, 35, h);
        const dGRight = ctx.createLinearGradient(w, 0, w - 35, 0);
        dGRight.addColorStop(0, `rgba(204,0,0,${dangerEdge})`);
        dGRight.addColorStop(1, 'transparent');
        ctx.fillStyle = dGRight;
        ctx.fillRect(w - 35, 0, 35, h);
      } else if (energyRef.current === 0) {
        ctx.fillStyle = `rgba(204,0,0,${0.04 + Math.sin(now * 0.005) * 0.015})`;
        ctx.fillRect(0, 0, w, h);
      }

      // Danger zone edge glow at low energy
      if (energyRef.current <= 1) {
        const dangerPulse = Math.sin(now * 0.005) * 0.5 + 0.5;
        const dangerA = energyRef.current === 0 ? 0.025 + dangerPulse * 0.025 : 0.01 + dangerPulse * 0.01;
        const dGLeft = ctx.createLinearGradient(0, 0, 25, 0);
        dGLeft.addColorStop(0, `rgba(204,0,0,${dangerA})`);
        dGLeft.addColorStop(1, 'transparent');
        ctx.fillStyle = dGLeft;
        ctx.fillRect(0, 0, 25, h);
        const dGRight = ctx.createLinearGradient(w, 0, w - 25, 0);
        dGRight.addColorStop(0, `rgba(204,0,0,${dangerA})`);
        dGRight.addColorStop(1, 'transparent');
        ctx.fillStyle = dGRight;
        ctx.fillRect(w - 25, 0, 25, h);
      }

      // Boost rush screen tint
      if (inRush) {
        const rushA = Math.min(0.06, boostRushRef.current * 0.02);
        ctx.fillStyle = `rgba(255,215,0,${rushA})`;
        ctx.fillRect(0, 0, w, h);
        const rushPulse = 0.5 + Math.sin(now * 0.006) * 0.5;
        const edgeA = 0.04 + rushPulse * 0.03;
        const edgeW = 18 + rushPulse * 8;
        const rushGL = ctx.createLinearGradient(0, 0, edgeW, 0);
        rushGL.addColorStop(0, `rgba(255,215,0,${edgeA})`);
        rushGL.addColorStop(1, 'transparent');
        ctx.fillStyle = rushGL;
        ctx.fillRect(0, 0, edgeW, h);
        const rushGR = ctx.createLinearGradient(w, 0, w - edgeW, 0);
        rushGR.addColorStop(0, `rgba(255,215,0,${edgeA})`);
        rushGR.addColorStop(1, 'transparent');
        ctx.fillStyle = rushGR;
        ctx.fillRect(w - edgeW, 0, edgeW, h);
      }

      // Max combo glow
      if (comboRef.current >= 8) {
        ctx.globalAlpha = 0.025 + Math.sin(now * 0.003) * 0.008;
        ctx.fillStyle = C.boost;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // GAME OVER OVERLAY
      if (gameOverRef.current) {
        const goT = gameOverTimerRef.current;
        const goFade = Math.min(1, goT * 2);

        // Dark overlay
        ctx.fillStyle = `rgba(0,0,0,${goFade * 0.6})`;
        ctx.fillRect(0, 0, w, h);

        // Ink splash effect (expanding dark circles)
        if (goT < 2) {
          const splashCount = 5;
          for (let si = 0; si < splashCount; si++) {
            const sAngle = si * Math.PI * 2 / splashCount + goT * 0.5;
            const sDist = goT * (30 + si * 15);
            const sx = shipScreenX + Math.cos(sAngle) * sDist;
            const sy = shipScreenY + Math.sin(sAngle) * sDist;
            const sAlpha = Math.max(0, 0.1 - goT * 0.04);
            ctx.fillStyle = `rgba(20,10,30,${sAlpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 8 + goT * 10, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // "GAME OVER" text (canvas only — stats shown in React overlay)
        if (goT > 0.3) {
          const textAlpha = Math.min(1, (goT - 0.3) * 3);
          const textScale = 1 + Math.max(0, 1 - (goT - 0.3) * 4) * 0.5;
          ctx.textAlign = 'center';
          ctx.globalAlpha = textAlpha;

          ctx.font = `bold ${Math.round(52 * textScale)}px monospace`;
          ctx.fillStyle = C.barrier;
          ctx.shadowColor = C.barrier;
          ctx.shadowBlur = 25;
          ctx.fillText('GAME OVER', w / 2, h * 0.35);
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }

      // WARM VIGNETTE
      drawWarmVignette(ctx, w, h, speed, inRush, comboHigh);

      ctx.restore(); // end shake

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isActive, onCollision, spawnParticles]);

  return (
    <div className="river-game-container">
      <canvas ref={canvasRef} className="river-game-canvas" />
      {gameOverStats && (
        <div className="game-over-overlay" role="dialog" aria-modal="true">
          <div className="game-over-card">
            <div className="game-over-score">{gameOverStats.score.toLocaleString()}</div>
            {gameOverStats.isNewHigh && (
              <div className="game-over-new-high">NEW HIGH SCORE</div>
            )}
            {!gameOverStats.isNewHigh && gameOverStats.highScore > 0 && (
              <div className="game-over-high-score">
                Best: {gameOverStats.highScore.toLocaleString()}
              </div>
            )}
            <div className="game-over-stats">
              <div className="game-over-stat">
                <span className="game-over-stat-value">{gameOverStats.wave}</span>
                <span className="game-over-stat-label">Wave</span>
              </div>
              <div className="game-over-stat">
                <span className="game-over-stat-value">{gameOverStats.distance.toLocaleString()}m</span>
                <span className="game-over-stat-label">Distance</span>
              </div>
              <div className="game-over-stat">
                <span className="game-over-stat-value">x{gameOverStats.bestCombo}</span>
                <span className="game-over-stat-label">Best Combo</span>
              </div>
              <div className="game-over-stat">
                <span className="game-over-stat-value">{gameOverStats.bestStreak}</span>
                <span className="game-over-stat-label">Best Streak</span>
              </div>
            </div>
            <button className="btn btn-secondary game-over-restart" onClick={restartGame}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
