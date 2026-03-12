// Palette
export const C = {
  bgTop: '#010008',
  bgMid: '#050216',
  bgBot: '#0a0525',
  ground: '#030d1a',
  gridLine: '#081525',
  ship: '#e8eaf6',
  shipDark: '#8890c8',
  engine: '#ff6b35',
  orb: '#ff69b4',
  orbCore: '#ffe4f0',
  barrier: '#200806',
  barrierCore: '#ff4020',
  boost: '#ffd700',
  boostCore: '#fff4b0',
  combo: '#ff8c00',
} as const;

export interface Petal {
  x: number; y: number; vx: number; vy: number;
  rot: number; rotSpeed: number; size: number; alpha: number; color: string;
}

export interface Firefly {
  x: number; y: number; vx: number; vy: number; phase: number; size: number;
}

export interface SpiritOrb {
  x: number; y: number; vx: number; vy: number;
  radius: number; alpha: number; color: string; phase: number;
}

// Cached offscreen canvas for moon rendering
let _moonCanvas: HTMLCanvasElement | null = null;
let _moonSize = 0;

export function createPetals(count: number, groundY: number): Petal[] {
  const petals: Petal[] = [];
  const colors = ['rgba(255,182,193,','rgba(255,105,180,','rgba(255,228,225,','rgba(255,192,203,'];
  for (let i = 0; i < count; i++) {
    petals.push({
      x: Math.random(), y: Math.random() * groundY,
      vx: -0.01 - Math.random() * 0.02, vy: 0.005 + Math.random() * 0.015,
      rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 2,
      size: 1 + Math.random() * 4, alpha: 0.3 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  return petals;
}

export function createFireflies(count: number, groundY: number): Firefly[] {
  const ff: Firefly[] = [];
  for (let i = 0; i < count; i++) {
    ff.push({
      x: Math.random(), y: 0.3 + Math.random() * (groundY - 0.35),
      vx: (Math.random() - 0.5) * 0.005, vy: (Math.random() - 0.5) * 0.003,
      phase: Math.random() * Math.PI * 2, size: 1 + Math.random() * 1.5,
    });
  }
  return ff;
}

export function createSpiritOrbs(count: number, groundY: number): SpiritOrb[] {
  const orbs: SpiritOrb[] = [];
  const colors = ['rgba(130,170,255,','rgba(180,140,255,','rgba(200,220,255,','rgba(150,200,220,'];
  for (let i = 0; i < count; i++) {
    orbs.push({
      x: Math.random(), y: groundY + Math.random() * 0.05,
      vx: (Math.random() - 0.5) * 0.002, vy: -0.003 - Math.random() * 0.005,
      radius: 18 + Math.random() * 20, alpha: 0.07 + Math.random() * 0.08,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2,
    });
  }
  return orbs;
}

export function updatePetals(petals: Petal[], dt: number, _w: number, h: number, groundY: number): void {
  for (const p of petals) {
    p.x += p.vx * dt; p.y += p.vy * dt * h; p.rot += p.rotSpeed * dt;
    if (p.x < -0.05) p.x = 1.05;
    if (p.y > groundY * h) { p.y = -10; p.x = Math.random(); }
  }
}

export function updateFireflies(fireflies: Firefly[], dt: number, _t: number, groundY: number): void {
  for (const f of fireflies) {
    f.x += f.vx * dt; f.y += f.vy * dt; f.phase += dt * 2;
    f.vx += (Math.random() - 0.5) * dt * 0.01; f.vy += (Math.random() - 0.5) * dt * 0.008;
    f.vx *= 0.98; f.vy *= 0.98;
    if (f.x < 0.02) f.vx += 0.001; if (f.x > 0.98) f.vx -= 0.001;
    if (f.y < 0.25) f.vy += 0.001; if (f.y > groundY - 0.05) f.vy -= 0.001;
  }
}

export function updateSpiritOrbs(orbs: SpiritOrb[], dt: number, _t: number, groundY: number): void {
  for (const o of orbs) {
    o.x += o.vx * dt; o.y += o.vy * dt; o.phase += dt;
    o.vx += (Math.random() - 0.5) * dt * 0.002; o.vx *= 0.99;
    if (o.y < groundY - 0.3) o.alpha -= dt * 0.01;
    if (o.alpha <= 0 || o.y < 0.1) {
      o.x = Math.random(); o.y = groundY + Math.random() * 0.05;
      o.vy = -0.003 - Math.random() * 0.005; o.alpha = 0.02 + Math.random() * 0.03;
      o.phase = Math.random() * Math.PI * 2;
    }
    if (o.x < -0.05) o.x = 1.05; if (o.x > 1.05) o.x = -0.05;
  }
}

export function drawSpiritSky(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number,
  groundY: number, wave: number, _speed: number,
): void {
  const waveHue = ((wave - 1) * 12) % 60;
  const rShift = Math.sin(waveHue * Math.PI / 180) * 6;
  const bShift = Math.cos(waveHue * Math.PI / 180) * 4;
  const gY = groundY * h;

  // Near-black deep space gradient
  const skyG = ctx.createLinearGradient(0, 0, 0, gY);
  skyG.addColorStop(0, `rgb(${1 + (rShift * 0.3) | 0},${0},${8 + (bShift * 0.5) | 0})`);
  skyG.addColorStop(0.5, `rgb(${6 + (rShift * 0.4) | 0},${3},${22 + (bShift * 0.6) | 0})`);
  skyG.addColorStop(1, `rgb(${14 + (rShift * 0.6) | 0},${8},${42 + (bShift * 0.8) | 0})`);
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, w, gY);

  // Subtle horizon warmth
  const horizGlow = ctx.createLinearGradient(0, gY - 60, 0, gY);
  horizGlow.addColorStop(0, 'transparent');
  horizGlow.addColorStop(1, 'rgba(120,55,15,0.12)');
  ctx.fillStyle = horizGlow;
  ctx.fillRect(0, gY - 60, w, 60);

  // Star field — single pass, simple dots (no arcs, use fillRect)
  const starSeed = 42;
  for (let i = 0; i < 25; i++) {
    const sx = ((i * 137.508 + starSeed) % w);
    const sy = ((i * 97.3 + starSeed * 2) % (gY * 0.65));
    const twinkle = 0.2 + Math.sin(t * 0.0015 + i * 3.7) * 0.15;
    const sz = 0.5 + (i % 4) * 0.3;
    ctx.fillStyle = `rgba(220,225,240,${twinkle})`;
    ctx.fillRect(sx - sz * 0.5, sy - sz * 0.5, sz, sz);
  }
}

export function drawMoon(
  ctx: CanvasRenderingContext2D, w: number, h: number, _t: number,
): void {
  const moonR = h * 0.038;
  const moonX = w * 0.82;
  const moonY = h * 0.18;

  // Soft atmospheric glow — large halo
  const glowR = moonR * 12;
  const gG = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, glowR);
  gG.addColorStop(0, 'rgba(230,240,255,0.22)');
  gG.addColorStop(0.2, 'rgba(210,225,255,0.10)');
  gG.addColorStop(0.5, 'rgba(180,200,255,0.04)');
  gG.addColorStop(1, 'transparent');
  ctx.fillStyle = gG;
  ctx.fillRect(moonX - glowR, moonY - glowR, glowR * 2, glowR * 2);

  // Render crescent on offscreen canvas to avoid destination-out bleeding
  const pad = 30; // extra space for shadow glow
  const tSize = Math.ceil(moonR * 2 + pad * 2);
  if (!_moonCanvas || _moonSize !== tSize) {
    if (!_moonCanvas) _moonCanvas = document.createElement('canvas');
    _moonCanvas.width = tSize;
    _moonCanvas.height = tSize;
    _moonSize = tSize;
    const tc = _moonCanvas.getContext('2d');
    if (!tc) return;
    const cx = tSize / 2;
    const cy = tSize / 2;

    // Draw full moon disc with glow
    tc.fillStyle = 'rgba(255,255,255,0.9)';
    tc.shadowColor = 'rgba(255,255,255,0.5)';
    tc.shadowBlur = 14;
    tc.beginPath();
    tc.arc(cx, cy, moonR, 0, Math.PI * 2);
    tc.fill();
    tc.shadowBlur = 0;

    // Cut crescent — erase right portion
    tc.globalCompositeOperation = 'destination-out';
    tc.fillStyle = 'rgba(0,0,0,1)';
    tc.beginPath();
    tc.arc(cx + moonR * 0.5, cy, moonR * 0.88, 0, Math.PI * 2);
    tc.fill();
  }

  // Stamp cached canvas
  ctx.drawImage(_moonCanvas, moonX - tSize / 2, moonY - tSize / 2);
}

export function drawMountains(
  ctx: CanvasRenderingContext2D, w: number, h: number, _t: number,
  groundY: number, speed: number, totalTime: number,
): void {
  const gY = groundY * h;
  const layers = [
    { scroll: 0.001, maxH: 130, count: 10, c1: '#3a2278', c2: '#220e50', edge: '160,130,220', eA: 0.35, sW: 1.3, oW: 0.15 },
    { scroll: 0.006, maxH: 60,  count: 14, c1: '#120838', c2: '#0a0520', edge: '80,60,130',   eA: 0.15, sW: 1.35, oW: 0.18 },
  ];

  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    const mtScroll = (totalTime * speed * L.scroll) % 1;
    const mtG = ctx.createLinearGradient(0, gY - L.maxH, 0, gY);
    mtG.addColorStop(0, L.c1);
    mtG.addColorStop(1, L.c2);
    ctx.fillStyle = mtG;

    const peaks: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= L.count; i++) {
      const mx = (i / L.count - mtScroll) * w * L.sW - w * L.oW;
      const mh = L.maxH * 0.4 + Math.sin(i * 2.3 + li * 1.7) * L.maxH * 0.4 + Math.cos(i * 1.1 + li) * L.maxH * 0.2;
      peaks.push({ x: mx, y: gY - Math.max(0, mh) });
    }

    // Smooth bezier curve fill
    ctx.beginPath(); ctx.moveTo(-10, gY); ctx.lineTo(peaks[0].x, peaks[0].y);
    for (let i = 0; i < peaks.length - 1; i++) {
      const cpx = (peaks[i].x + peaks[i + 1].x) / 2;
      const cpy = (peaks[i].y + peaks[i + 1].y) / 2;
      ctx.quadraticCurveTo(peaks[i].x, peaks[i].y, cpx, cpy);
    }
    ctx.lineTo(peaks[peaks.length - 1].x, peaks[peaks.length - 1].y);
    ctx.lineTo(w + 10, gY); ctx.closePath(); ctx.fill();

    // Ridgeline glow
    ctx.strokeStyle = `rgba(${L.edge},${L.eA})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(peaks[0].x, peaks[0].y);
    for (let i = 0; i < peaks.length - 1; i++) {
      const cpx = (peaks[i].x + peaks[i + 1].x) / 2;
      const cpy = (peaks[i].y + peaks[i + 1].y) / 2;
      ctx.quadraticCurveTo(peaks[i].x, peaks[i].y, cpx, cpy);
    }
    ctx.lineTo(peaks[peaks.length - 1].x, peaks[peaks.length - 1].y); ctx.stroke();
  }
}

export function drawTemples(
  ctx: CanvasRenderingContext2D, w: number, h: number, _t: number,
  groundY: number, totalTime: number, speed: number,
): void {
  const gY = groundY * h;
  const mtScroll = (totalTime * speed * 0.001) % 1;
  const pagodas = [
    { mtIdx: 3, tier: 3, scale: 1.0 },
    { mtIdx: 8, tier: 2, scale: 0.8 },
  ];

  for (const pp of pagodas) {
    const mx = (pp.mtIdx / 10 - mtScroll) * w * 1.3 - w * 0.15;
    const mh = 120 * 0.4 + Math.sin(pp.mtIdx * 2.3) * 120 * 0.4 + Math.cos(pp.mtIdx * 1.1) * 120 * 0.2;
    if (mx < -80 || mx > w + 80) continue;
    const baseY = gY - Math.max(0, mh) + 5;
    const baseW = 30 * pp.scale;
    const tierH = 13 * pp.scale;

    for (let ti = 0; ti < pp.tier; ti++) {
      const tw = baseW - ti * 4 * pp.scale;
      const ty = baseY - ti * tierH;
      const roofW = tw * 0.95;

      // Roof silhouette
      ctx.fillStyle = 'rgba(15,10,30,0.8)';
      ctx.beginPath();
      ctx.moveTo(mx - roofW, ty);
      ctx.quadraticCurveTo(mx, ty - tierH * 0.6, mx + roofW, ty);
      ctx.closePath(); ctx.fill();

      // Body
      ctx.fillRect(mx - tw * 0.35, ty, tw * 0.7, tierH * 0.45);

      // Window dot
      ctx.fillStyle = 'rgba(255,210,120,0.35)';
      ctx.fillRect(mx - 2, ty + tierH * 0.1, 4, 3);
    }

    // Spire
    const spireBase = baseY - pp.tier * tierH;
    ctx.strokeStyle = 'rgba(50,35,70,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, spireBase); ctx.lineTo(mx, spireBase - 12 * pp.scale); ctx.stroke();
  }
}

export function drawTreeline(
  ctx: CanvasRenderingContext2D, w: number, h: number, _t: number,
  groundY: number, totalTime: number, speed: number,
): void {
  const gY = groundY * h;
  const treeScroll = (totalTime * speed * 0.006) % 2;
  const inkColor = 'rgba(8,5,18,0.95)';

  const trees = [
    { idx: 0,  shape: 0, scale: 1.0 },
    { idx: 1,  shape: 1, scale: 0.85 },
    { idx: 2,  shape: 2, scale: 0.95 },
    { idx: 4,  shape: 1, scale: 1.05 },
    { idx: 6,  shape: 0, scale: 0.90 },
    { idx: 8,  shape: 2, scale: 1.00 },
    { idx: 10, shape: 1, scale: 0.95 },
  ];

  ctx.fillStyle = inkColor;
  for (const tree of trees) {
    const tx = ((tree.idx * 0.22 - treeScroll + 2) % 2 - 0.2) * w;
    if (tx < -80 || tx > w + 80) continue;
    const sc = tree.scale;

    if (tree.shape === 0) {
      // Spire — simplified pine
      const tH = (52 + tree.idx * 8.3 % 22) * sc;
      const tW = (14 + tree.idx * 3.1 % 8) * sc;
      ctx.beginPath();
      ctx.moveTo(tx, gY);
      ctx.lineTo(tx - tW * 0.5, gY - tH * 0.35);
      ctx.lineTo(tx - tW * 0.3, gY - tH * 0.65);
      ctx.lineTo(tx, gY - tH);
      ctx.lineTo(tx + tW * 0.3, gY - tH * 0.65);
      ctx.lineTo(tx + tW * 0.5, gY - tH * 0.35);
      ctx.closePath();
      ctx.fill();

    } else if (tree.shape === 1) {
      // Round — trunk + single canopy circle
      const tH = (38 + tree.idx * 6.7 % 18) * sc;
      const cR = (18 + tree.idx * 4.1 % 10) * sc;
      ctx.fillRect(tx - 1.5 * sc, gY - tH, 3 * sc, tH);
      ctx.beginPath();
      ctx.arc(tx, gY - tH, cR, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Wide spread — simplified
      const tH = (30 + tree.idx * 5.3 % 14) * sc;
      const spread = (32 + tree.idx * 4.7 % 12) * sc;
      ctx.beginPath();
      ctx.moveTo(tx, gY);
      ctx.quadraticCurveTo(tx - spread * 0.4, gY - tH * 0.5, tx - spread, gY - tH * 0.7);
      ctx.quadraticCurveTo(tx - spread * 0.5, gY - tH * 1.1, tx, gY - tH * 0.6);
      ctx.quadraticCurveTo(tx + spread * 0.5, gY - tH * 1.05, tx + spread, gY - tH * 0.65);
      ctx.quadraticCurveTo(tx + spread * 0.4, gY - tH * 0.5, tx, gY);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function drawRiver(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number,
  groundY: number, speed: number, totalTime: number,
): void {
  const gY = groundY * h;

  // Animated wave surface edge
  ctx.beginPath(); ctx.moveTo(0, gY);
  for (let wx = 0; wx <= w; wx += 16) {
    const waveY = gY + Math.sin(wx * 0.03 + t * 0.003) * 2 + Math.sin(wx * 0.015 + t * 0.002) * 1.5;
    ctx.lineTo(wx, waveY);
  }
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();

  // Deep dark water
  const waterG = ctx.createLinearGradient(0, gY, 0, h);
  waterG.addColorStop(0, '#061520');
  waterG.addColorStop(0.4, '#030a12');
  waterG.addColorStop(1, '#020608');
  ctx.fillStyle = waterG; ctx.fill();

  // Horizon color bleed
  const bleedG = ctx.createLinearGradient(0, gY, 0, gY + 20);
  bleedG.addColorStop(0, 'rgba(80,50,100,0.08)');
  bleedG.addColorStop(1, 'transparent');
  ctx.fillStyle = bleedG;
  ctx.fillRect(0, gY, w, 20);

  // Moon reflection — simple column
  const moonX = w * 0.82;
  const moonPathH = Math.min(h - gY - 5, 80);
  const mpG = ctx.createLinearGradient(moonX, gY + 3, moonX, gY + 3 + moonPathH);
  mpG.addColorStop(0, 'rgba(220,230,255,0.06)');
  mpG.addColorStop(1, 'transparent');
  ctx.fillStyle = mpG;
  ctx.fillRect(moonX - 15, gY + 3, 30, moonPathH);

  // Speed-reactive ripple lines
  const rippleCount = Math.max(3, Math.min(6, Math.floor(speed * 2)));
  const rippleScroll = totalTime * speed * 0.08;
  for (let rl = 0; rl < rippleCount; rl++) {
    const ry = gY + 8 + rl * ((h - gY - 10) / rippleCount);
    const rAlpha = Math.min(0.1, 0.04 + speed * 0.01);
    ctx.strokeStyle = `rgba(100,160,180,${rAlpha})`; ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let rx = 0; rx < w; rx += 20) {
      const wobble = Math.sin((rx * 0.02 + rippleScroll + rl * 2.1) + t * 0.002) * (1.5 + speed * 0.3);
      if (rx === 0) ctx.moveTo(rx, ry + wobble); else ctx.lineTo(rx, ry + wobble);
    }
    ctx.stroke();
  }

  // Horizon line
  ctx.fillStyle = 'rgba(100,150,170,0.08)';
  ctx.fillRect(0, gY - 1, w, 2);
}

export function drawLanterns(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number,
  groundY: number, totalTime: number, speed: number,
): void {
  const gY = groundY * h;
  const lanternScroll = (totalTime * speed * 0.02) % 3;
  const hues = [
    [255,180,80],[255,160,60],[255,140,90],[255,200,100],[255,150,70],
  ];

  for (let i = 0; i < 5; i++) {
    const lx = ((i * 0.65 - lanternScroll + 3) % 3 - 0.5) * w;
    if (lx < -30 || lx > w + 30) continue;
    const bob = Math.sin(t * 0.003 + i * 2.3) * 2;
    const ly = gY + 6 + bob;
    const [hr, hg, hb] = hues[i];
    const ds = 0.7 + (i % 3) * 0.15;
    const lw = 7 * ds; const lh = 10 * ds;

    // Lantern body — simple ellipse
    ctx.fillStyle = `rgba(${hr},${hg},${hb},0.5)`;
    ctx.beginPath();
    ctx.ellipse(lx, ly - lh / 2, lw / 2, lh / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Candle flame
    ctx.fillStyle = 'rgba(255,240,200,0.8)';
    ctx.beginPath(); ctx.arc(lx, ly - lh / 2, 2.5 * ds, 0, Math.PI * 2); ctx.fill();

    // Warm glow
    const glowR = 28 * ds;
    const glG = ctx.createRadialGradient(lx, ly - lh / 2, 0, lx, ly - lh / 2, glowR);
    glG.addColorStop(0, `rgba(${hr},${hg},${hb},0.18)`);
    glG.addColorStop(1, 'transparent');
    ctx.fillStyle = glG; ctx.fillRect(lx - glowR, ly - lh / 2 - glowR, glowR * 2, glowR * 2);
  }
}

export function drawMist(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number, groundY: number,
): void {
  const gY = groundY * h;
  const breathe = 1 + Math.sin(t * 0.0003) * 0.15;

  // Water surface mist — thin band only
  const sM = ctx.createLinearGradient(0, gY - 4, 0, gY + 12);
  sM.addColorStop(0, 'transparent');
  sM.addColorStop(0.5, `rgba(150,165,190,${0.065 * breathe})`);
  sM.addColorStop(1, 'transparent');
  ctx.fillStyle = sM; ctx.fillRect(0, gY - 4, w, 16);
}

export function drawDangerRock(
  ctx: CanvasRenderingContext2D, ox: number, oy: number, _w: number, h: number,
  t: number, objId: number, _depthFade: number, _heightProx: number,
  approaching: number, _isMoving: boolean, groundY: number,
): void {
  const aB = approaching;
  const gYpx = groundY * h;

  // Laser length — same footprint as the old rock
  const halfLen = 52;
  const x0 = ox - halfLen;   // left emitter
  const x1 = ox + halfLen;   // right emitter

  // Breathing pulse
  const breath = 0.6 + Math.sin(t * 0.004 + objId * 1.4) * 0.4;
  const intensity = breath * (1 + aB * 0.5);

  // Soft vertical bloom
  const bloomH = 28 + aB * 14;
  const bloomG = ctx.createLinearGradient(0, oy - bloomH, 0, oy + bloomH);
  bloomG.addColorStop(0, 'transparent');
  bloomG.addColorStop(0.4,  'rgba(255,20,20,0.10)');
  bloomG.addColorStop(0.5,  'rgba(255,30,30,0.20)');
  bloomG.addColorStop(0.6,  'rgba(255,20,20,0.10)');
  bloomG.addColorStop(1, 'transparent');
  ctx.fillStyle = bloomG;
  ctx.fillRect(x0 - 10, oy - bloomH, halfLen * 2 + 20, bloomH * 2);

  // Electric arc — subtle static zigzag between nodes
  ctx.shadowColor = 'rgba(255,30,30,1)';
  ctx.shadowBlur = 18 + aB * 10;

  // Outer glow arc
  ctx.strokeStyle = 'rgba(255,60,60,1)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x0, oy);
  const segs = 10;
  for (let si = 1; si <= segs; si++) {
    const px = x0 + (halfLen * 2) * (si / segs);
    // Static offset seeded by objId — no time component, no vertical movement
    const amp = 2.5;
    const py = oy + Math.sin(objId * 5.1 + si * 2.3) * amp;
    ctx.lineTo(px, py);
  }
  ctx.stroke();

  // White-hot core arc
  ctx.shadowBlur = 8;
  ctx.strokeStyle = 'rgba(255,200,200,1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, oy);
  for (let si = 1; si <= segs; si++) {
    const px = x0 + (halfLen * 2) * (si / segs);
    const amp = 2.5;
    const py = oy + Math.sin(objId * 5.1 + si * 2.3) * amp;
    ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Emitter nodes on each end
  const emitR = 5 + aB * 2;
  ctx.shadowColor = 'rgba(255,30,30,0.9)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(255,80,80,1)';
  ctx.lineWidth = 1.5;
  // left ring + dot
  ctx.beginPath(); ctx.arc(x0, oy, emitR + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,220,220,1)';
  ctx.beginPath(); ctx.arc(x0, oy, emitR, 0, Math.PI * 2); ctx.fill();
  // right ring + dot
  ctx.beginPath(); ctx.arc(x1, oy, emitR + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,220,220,1)';
  ctx.beginPath(); ctx.arc(x1, oy, emitR, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Water reflection
  const reflG = ctx.createLinearGradient(0, gYpx + 2, 0, gYpx + 12);
  reflG.addColorStop(0, `rgba(255,40,40,${0.07 * intensity})`);
  reflG.addColorStop(1, 'transparent');
  ctx.fillStyle = reflG;
  ctx.fillRect(x0, gYpx + 2, halfLen * 2, 10);
}

export function drawKoiFish(
  ctx: CanvasRenderingContext2D, ox: number, oy: number,
  t: number, objId: number, groundY: number, canvasH: number,
): void {
  const sz = 18;
  const bob = Math.sin(t * 0.005 + objId) * 3;
  const fy = oy + bob;

  // Light pillar to ground
  const gYpx = groundY * canvasH;
  const pilG = ctx.createLinearGradient(ox, fy + sz, ox, gYpx);
  pilG.addColorStop(0, 'rgba(255,215,0,0.16)');
  pilG.addColorStop(0.3, 'rgba(255,215,0,0.06)');
  pilG.addColorStop(1, 'transparent');
  ctx.fillStyle = pilG; ctx.fillRect(ox - 6, fy + sz, 12, gYpx - fy - sz);

  // Halo glow (brighter for power-up readability)
  const bG = ctx.createRadialGradient(ox, fy, 0, ox, fy, sz * 3);
  bG.addColorStop(0, 'rgba(255,215,0,0.25)');
  bG.addColorStop(0.4, 'rgba(255,215,0,0.08)');
  bG.addColorStop(1, 'transparent');
  ctx.fillStyle = bG; ctx.fillRect(ox - sz * 3, fy - sz * 3, sz * 6, sz * 6);

  // Water ripple ring around fish
  const rippleR = sz * 1.2 + Math.sin(t * 0.006 + objId) * 3;
  ctx.strokeStyle = `rgba(255,215,0,${0.06 + Math.sin(t * 0.004 + objId) * 0.02})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.ellipse(ox, fy, rippleR, rippleR * 0.3, 0, 0, Math.PI * 2); ctx.stroke();

  // Koi body
  ctx.save(); ctx.translate(ox, fy);
  const tailWag = Math.sin(t * 0.008 + objId * 2) * 0.3;
  ctx.rotate(tailWag * 0.2);

  ctx.shadowColor = C.boost; ctx.shadowBlur = 18;
  ctx.fillStyle = C.boost;
  ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.9, sz * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Scale shimmer — bright dots along body
  for (let si = 0; si < 4; si++) {
    const sx = -sz * 0.4 + si * sz * 0.3;
    const sy = Math.sin(si * 1.5) * sz * 0.12;
    const sa = 0.25 + Math.sin(t * 0.008 + si * 2 + objId) * 0.15;
    ctx.fillStyle = `rgba(255,255,200,${sa})`;
    ctx.beginPath(); ctx.arc(sx, sy, 1.0, 0, Math.PI * 2); ctx.fill();
  }

  // Head
  ctx.fillStyle = '#fff4b0';
  ctx.beginPath(); ctx.ellipse(sz * 0.5, 0, sz * 0.3, sz * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  // Eye
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(sz * 0.55, -sz * 0.05, 1.5, 0, Math.PI * 2); ctx.fill();

  // Tail fin (larger, more expressive wag)
  const tailWag2 = Math.sin(t * 0.01 + objId) * 5;
  ctx.fillStyle = 'rgba(255,200,50,0.6)';
  ctx.beginPath(); ctx.moveTo(-sz * 0.7, 0);
  ctx.quadraticCurveTo(-sz * 0.9, -sz * 0.1 + tailWag2 * 0.3, -sz * 1.2, -sz * 0.4 + tailWag2);
  ctx.lineTo(-sz * 1.0, tailWag2 * 0.5);
  ctx.quadraticCurveTo(-sz * 0.9, sz * 0.1 + tailWag2 * 0.3, -sz * 1.2, sz * 0.4 + tailWag2);
  ctx.lineTo(-sz * 0.7, 0);
  ctx.closePath(); ctx.fill();
  // Tail highlight
  ctx.fillStyle = 'rgba(255,240,150,0.25)';
  ctx.beginPath();
  ctx.moveTo(-sz * 0.75, -sz * 0.02);
  ctx.quadraticCurveTo(-sz * 0.95, -sz * 0.05 + tailWag2 * 0.3, -sz * 1.1, -sz * 0.2 + tailWag2 * 0.7);
  ctx.lineTo(-sz * 0.95, tailWag2 * 0.3);
  ctx.closePath(); ctx.fill();

  // Dorsal fin
  ctx.fillStyle = 'rgba(255,180,40,0.4)';
  ctx.beginPath();
  ctx.moveTo(sz * 0.1, -sz * 0.48);
  ctx.quadraticCurveTo(sz * 0.0, -sz * 0.65, -sz * 0.15, -sz * 0.48);
  ctx.closePath(); ctx.fill();

  // Koi markings
  ctx.fillStyle = 'rgba(255,100,50,0.3)';
  ctx.beginPath(); ctx.arc(sz * 0.1, -sz * 0.1, sz * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-sz * 0.2, sz * 0.05, sz * 0.12, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  // Golden sparkle trail behind tail
  for (let gi = 0; gi < 6; gi++) {
    const gx = ox - sz * 1.2 - gi * 5 + Math.sin(t * 0.007 + gi) * 2;
    const gy = fy + Math.sin(t * 0.005 + gi * 1.5 + objId) * 4;
    const ga = 0.15 - gi * 0.025;
    if (ga > 0.01) {
      ctx.fillStyle = `rgba(255,215,0,${ga})`;
      ctx.beginPath(); ctx.arc(gx, gy, 1.8 - gi * 0.25, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Bubble trail behind koi
  for (let bi = 0; bi < 4; bi++) {
    const bPhase = (t * 0.003 + bi * 1.2 + objId) % 2;
    const bx = ox - sz * 0.8 - bPhase * 10 + Math.sin(t * 0.008 + bi) * 2;
    const by = fy - bPhase * 5 - bi * 2;
    const bA = Math.max(0, (1 - bPhase / 2) * 0.12);
    const bSize = 1 + (1 - bPhase / 2) * 1.2;
    if (bA > 0.01) {
      ctx.strokeStyle = `rgba(200,230,255,${bA})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(bx, by, bSize, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Ground shadow
  ctx.fillStyle = 'rgba(255,215,0,0.05)';
  ctx.beginPath(); ctx.ellipse(ox, gYpx + 3, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Water reflection — golden shimmer below waterline
  const koiWobble = Math.sin(t * 0.005 + objId * 1.7) * 3;
  const koiReflG = ctx.createLinearGradient(ox + koiWobble, gYpx + 4, ox + koiWobble, gYpx + 22);
  koiReflG.addColorStop(0, 'rgba(255,215,0,0.06)');
  koiReflG.addColorStop(0.5, 'rgba(255,215,0,0.02)');
  koiReflG.addColorStop(1, 'transparent');
  ctx.fillStyle = koiReflG;
  ctx.fillRect(ox + koiWobble - 6, gYpx + 4, 12, 18);
}

export function drawSakuraBlossom(
  ctx: CanvasRenderingContext2D, ox: number, oy: number, t: number,
  objId: number, isGolden: boolean, groundY: number, canvasH: number, heightProx: number,
): void {
  const r = isGolden ? 20 : 17;
  const pulse = 1 + Math.sin(t * 0.006 + objId) * 0.12;
  const bob = Math.sin(t * 0.004 + objId * 1.5) * 3;
  const orbY = oy + bob;
  const orbRGB = isGolden ? '255,215,0' : '255,105,180';
  const orbHex = isGolden ? C.boost : C.orb;
  const gYpx = groundY * canvasH;

  // Magnetic attraction glow + connection line
  if (heightProx > 0) {
    const magGlowR = r * 2 + heightProx * 10;
    const magA = heightProx * 0.06;
    const magG = ctx.createRadialGradient(ox, orbY, r * pulse, ox, orbY, magGlowR);
    magG.addColorStop(0, `rgba(${orbRGB},${magA})`);
    magG.addColorStop(0.5, `rgba(255,255,255,${magA * 0.3})`);
    magG.addColorStop(1, 'transparent');
    ctx.fillStyle = magG; ctx.fillRect(ox - magGlowR, orbY - magGlowR, magGlowR * 2, magGlowR * 2);
  }

  // Light pillar to ground
  const pilG = ctx.createLinearGradient(ox, orbY + r, ox, gYpx);
  pilG.addColorStop(0, `rgba(${orbRGB},${isGolden ? 0.18 : 0.14})`);
  pilG.addColorStop(0.3, `rgba(${orbRGB},0.05)`);
  pilG.addColorStop(1, 'transparent');
  ctx.fillStyle = pilG; ctx.fillRect(ox - (isGolden ? 5 : 4), orbY + r, (isGolden ? 10 : 8), gYpx - orbY - r);

  // Halo
  const haloR = r * (isGolden ? 3.5 : 3) * pulse;
  const hG = ctx.createRadialGradient(ox, orbY, 0, ox, orbY, haloR);
  hG.addColorStop(0, `rgba(${orbRGB},${isGolden ? 0.25 : 0.2})`);
  hG.addColorStop(0.5, `rgba(${orbRGB},0.05)`);
  hG.addColorStop(1, 'transparent');
  ctx.fillStyle = hG; ctx.fillRect(ox - haloR, orbY - haloR, haloR * 2, haloR * 2);

  // Trailing spirit particles — spiral around blossom (2 for cleaner silhouette)
  for (let ti = 0; ti < 2; ti++) {
    const tAngle = t * 0.004 + objId + ti * Math.PI;
    const tDist = r * (1.2 + ti * 0.4) * pulse;
    const tx = ox + Math.cos(tAngle) * tDist;
    const ty = orbY + Math.sin(tAngle) * tDist * 0.6;
    const tAlpha = 0.18 - ti * 0.04;
    ctx.fillStyle = `rgba(${orbRGB},${tAlpha})`;
    ctx.beginPath(); ctx.arc(tx, ty, 1.8 - ti * 0.3, 0, Math.PI * 2); ctx.fill();
  }

  // Rotating petals (sakura flower shape) with gradient fill
  ctx.save(); ctx.translate(ox, orbY);
  const spin = t * 0.003 + objId;
  ctx.shadowColor = orbHex; ctx.shadowBlur = isGolden ? 20 : 14;

  const petalCount = 5;
  for (let pi = 0; pi < petalCount; pi++) {
    const angle = spin + pi * (Math.PI * 2 / petalCount);
    const pr = r * pulse * 0.7;
    const px = Math.cos(angle) * pr * 0.4;
    const py = Math.sin(angle) * pr * 0.4;
    // Gradient petal
    const pG = ctx.createRadialGradient(px, py, 0, px, py, pr * 0.5);
    pG.addColorStop(0, `rgba(255,255,255,0.4)`);
    pG.addColorStop(0.5, orbHex);
    pG.addColorStop(1, `rgba(${orbRGB},0.6)`);
    ctx.fillStyle = pG;
    ctx.beginPath(); ctx.ellipse(px, py, pr * 0.5, pr * 0.25, angle, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Core (larger + brighter for "collect me" pop)
  ctx.fillStyle = isGolden ? '#fff4b0' : '#ffe4f0';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.32 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.18 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Golden sparkle rays + dust trail
  if (isGolden) {
    ctx.strokeStyle = `rgba(255,215,0,${0.12 + Math.sin(t * 0.008) * 0.04})`; ctx.lineWidth = 1;
    for (let ri = 0; ri < 4; ri++) {
      const rayAngle = t * 0.002 + ri * Math.PI / 2;
      const rayLen = r * 1.6 * pulse;
      ctx.beginPath();
      ctx.moveTo(ox + Math.cos(rayAngle) * r * pulse * 0.7, orbY + Math.sin(rayAngle) * r * pulse * 0.7);
      ctx.lineTo(ox + Math.cos(rayAngle) * rayLen, orbY + Math.sin(rayAngle) * rayLen);
      ctx.stroke();
    }

    // Sparkle dust trail (golden dots trailing behind)
    for (let di = 0; di < 8; di++) {
      const dAge = (t * 0.004 + di * 0.8 + objId) % 3;
      const dX = ox - dAge * 12 + Math.sin(t * 0.006 + di * 2.1) * 3;
      const dY = orbY + Math.sin(t * 0.005 + di * 1.7) * 5;
      const dA = Math.max(0, (1 - dAge / 3) * 0.25);
      const dSize = (1 - dAge / 3) * 1.5;
      if (dA > 0.02 && dSize > 0.2) {
        ctx.fillStyle = `rgba(255,215,0,${dA})`;
        ctx.beginPath();
        ctx.arc(dX, dY, dSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Ground shadow
  ctx.fillStyle = `rgba(${orbRGB},0.05)`;
  ctx.beginPath(); ctx.ellipse(ox, gYpx + 3, r * 1.1, 3, 0, 0, Math.PI * 2); ctx.fill();

  // Water reflection — colored shimmer below waterline
  const reflDepth = 18;
  const reflA = isGolden ? 0.06 : 0.04;
  const wobble = Math.sin(t * 0.005 + objId * 1.7) * 3;
  const rG = ctx.createLinearGradient(ox + wobble, gYpx + 4, ox + wobble, gYpx + 4 + reflDepth);
  rG.addColorStop(0, `rgba(${orbRGB},${reflA})`);
  rG.addColorStop(0.5, `rgba(${orbRGB},${reflA * 0.3})`);
  rG.addColorStop(1, 'transparent');
  ctx.fillStyle = rG;
  ctx.fillRect(ox + wobble - 5, gYpx + 4, 10, reflDepth);
}

export function drawRowingBoat(
  ctx: CanvasRenderingContext2D, x: number, y: number, t: number, SZ: number,
  shipPitch: number, shipVisible: boolean, inRush: boolean, comboHigh: boolean,
  combo: number, speed: number, _streak: number, strokePulse: number, _heightDelta: number,
): void {
  ctx.save();
  if (!shipVisible) ctx.globalAlpha = 0.3;
  ctx.translate(x, y);
  ctx.rotate(shipPitch);

  const boatColor = '#dde0f8';
  const boatRGB = '220,225,248';
  const darkWood = 'rgba(20,18,50,0.95)';

  // V-shaped wake behind boat
  if (speed > 0.3) {
    const wakeA = Math.min(0.1, speed * 0.03);
    const wakeLen = 25 + speed * 10;
    ctx.strokeStyle = `rgba(180,210,230,${wakeA})`;
    ctx.lineWidth = 1;
    for (let wi = 0; wi < 4; wi++) {
      const spread = (wi + 1) * 4;
      const len = wakeLen + wi * 4;
      const wobble = Math.sin(t * 0.008 + wi * 1.5) * 2;
      ctx.beginPath();
      ctx.moveTo(-SZ * 0.55, SZ * 0.05);
      ctx.lineTo(-SZ * 0.55 - len, -spread + wobble);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-SZ * 0.55, SZ * 0.05);
      ctx.lineTo(-SZ * 0.55 - len, spread + wobble);
      ctx.stroke();
    }
    // Splash droplets at higher speed
    if (speed > 1.2) {
      const dropCount = Math.min(5, Math.floor(speed * 1.5));
      ctx.fillStyle = 'rgba(200,230,255,0.1)';
      for (let di = 0; di < dropCount; di++) {
        const dx = -SZ * 0.5 - (di * 7 + Math.sin(t * 0.02 + di * 3) * 4);
        const dy = Math.sin(t * 0.015 + di * 2.1) * 6;
        ctx.beginPath();
        ctx.arc(dx, dy, 0.5 + Math.sin(t * 0.01 + di) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Speed spirit trails
  if (speed > 2.0 || inRush) {
    const trailCount = inRush ? 5 : Math.min(3, Math.floor((speed - 1.8) * 3));
    for (let si = 0; si < trailCount; si++) {
      const trailLen = 15 + speed * 8 + (inRush ? 20 : 0);
      const trailY = (si - trailCount / 2) * 5;
      const trailA = inRush ? 0.06 : 0.03;
      ctx.strokeStyle = `rgba(${boatRGB},${trailA})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-SZ * 0.6, trailY);
      ctx.lineTo(-SZ * 0.6 - trailLen, trailY + Math.sin(t * 0.008 + si) * 2);
      ctx.stroke();
    }
  }

  // Aura glow — pearl luminance to locate self at a glance
  const aR = 36 + combo * 4;
  const aAlpha = inRush ? 0.14 : comboHigh ? 0.12 : 0.10 + combo * 0.01;
  const aG = ctx.createRadialGradient(0, 0, aR * 0.15, 0, 0, aR);
  aG.addColorStop(0, `rgba(${boatRGB},${aAlpha})`);
  aG.addColorStop(0.6, `rgba(${boatRGB},${aAlpha * 0.3})`);
  aG.addColorStop(1, 'transparent');
  ctx.fillStyle = aG;
  ctx.beginPath(); ctx.arc(0, 0, aR, 0, Math.PI * 2); ctx.fill();

  // Shield ring during boost rush
  if (inRush) {
    const shPulse = 1 + Math.sin(t * 0.008) * 0.08;
    const shR = 40 * shPulse;
    ctx.strokeStyle = C.boost;
    ctx.globalAlpha = (shipVisible ? 1 : 0.3) * 0.25;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, shR, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = shipVisible ? 1 : 0.3;
  }

  // Water displacement shadow around hull
  ctx.fillStyle = 'rgba(0,20,40,0.08)';
  ctx.beginPath();
  ctx.ellipse(SZ * 0.1, SZ * 0.15, SZ * 0.7, SZ * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Asymmetric hull
  // Top = deck/gunwale (shallower), Bottom = keel (deeper curve)
  ctx.shadowColor = boatColor;
  ctx.shadowBlur = 14;
  ctx.fillStyle = boatColor;
  ctx.beginPath();
  // Bow point (slightly above waterline)
  ctx.moveTo(SZ * 0.9, -SZ * 0.02);
  // Top deck line (bow to stern) — shallow, relatively flat
  ctx.quadraticCurveTo(SZ * 0.4, -SZ * 0.22, -SZ * 0.25, -SZ * 0.20);
  ctx.lineTo(-SZ * 0.65, -SZ * 0.12);
  // Stern bottom
  ctx.lineTo(-SZ * 0.65, SZ * 0.10);
  // Bottom keel line (stern to bow) — deeper curve
  ctx.lineTo(-SZ * 0.25, SZ * 0.32);
  ctx.quadraticCurveTo(SZ * 0.4, SZ * 0.36, SZ * 0.9, -SZ * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Waterline mark (where hull meets water surface)
  ctx.strokeStyle = 'rgba(200,230,255,0.12)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(SZ * 0.88, 0);
  ctx.quadraticCurveTo(SZ * 0.3, SZ * 0.02, -SZ * 0.6, SZ * 0.02);
  ctx.stroke();

  // Deck line — gold lacquer trim
  ctx.strokeStyle = 'rgba(210,175,70,0.80)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(SZ * 0.75, -SZ * 0.10);
  ctx.quadraticCurveTo(SZ * 0.2, -SZ * 0.19, -SZ * 0.55, -SZ * 0.13);
  ctx.stroke();

  // Hull plank lines
  ctx.strokeStyle = `rgba(${boatRGB},0.2)`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(SZ * 0.6, SZ * 0.08);
  ctx.quadraticCurveTo(SZ * 0.1, SZ * 0.12, -SZ * 0.5, SZ * 0.06);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(SZ * 0.5, SZ * 0.20);
  ctx.quadraticCurveTo(0, SZ * 0.26, -SZ * 0.45, SZ * 0.15);
  ctx.stroke();

  // Hull highlight — luminous top rim
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SZ * 0.85, -SZ * 0.04);
  ctx.quadraticCurveTo(SZ * 0.3, -SZ * 0.21, -SZ * 0.25, -SZ * 0.19);
  ctx.stroke();

  // Dark keel stripe
  ctx.fillStyle = inRush ? 'rgba(60,30,10,0.2)' : 'rgba(8,6,28,0.55)';
  ctx.beginPath();
  ctx.moveTo(SZ * 0.7, SZ * 0.05);
  ctx.quadraticCurveTo(SZ * 0.2, SZ * 0.10, -SZ * 0.55, SZ * 0.06);
  ctx.lineTo(-SZ * 0.55, SZ * 0.02);
  ctx.quadraticCurveTo(SZ * 0.2, SZ * 0.04, SZ * 0.7, 0);
  ctx.closePath();
  ctx.fill();

  // Rower silhouette
  const oarAngle = 0.6 + Math.sin(t * 0.005) * 0.35 + strokePulse * 0.6;
  const leanAngle = oarAngle * 0.1;
  const rowerX = SZ * 0.05;
  const rowerSeatY = -SZ * 0.19;

  ctx.save();
  ctx.translate(rowerX, rowerSeatY);
  ctx.rotate(leanAngle);

  // Torso (extends upward from seat)
  ctx.fillStyle = darkWood;
  ctx.beginPath();
  ctx.moveTo(-SZ * 0.05, 0);
  ctx.lineTo(SZ * 0.05, 0);
  ctx.lineTo(SZ * 0.06, -SZ * 0.10);
  ctx.lineTo(-SZ * 0.06, -SZ * 0.10);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(0, -SZ * 0.14, SZ * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Arms (animated with oar stroke)
  ctx.strokeStyle = darkWood;
  ctx.lineWidth = 1.5;
  // Near arm — reaching toward oarlock (angled with oar)
  const armEndX = SZ * 0.09 + Math.sin(oarAngle) * SZ * 0.03;
  const armEndY = SZ * 0.05 + Math.cos(oarAngle) * SZ * 0.02;
  ctx.beginPath();
  ctx.moveTo(SZ * 0.05, -SZ * 0.08);
  ctx.quadraticCurveTo(SZ * 0.08, -SZ * 0.02, armEndX, armEndY);
  ctx.stroke();
  // Far arm — stub behind torso
  ctx.beginPath();
  ctx.moveTo(-SZ * 0.04, -SZ * 0.08);
  ctx.lineTo(-SZ * 0.06, -SZ * 0.02);
  ctx.stroke();

  ctx.restore();

  // Single oar (near side) with oarlock
  const oarlockX = SZ * 0.1;
  const oarlockY = SZ * 0.12;

  ctx.save();
  ctx.translate(oarlockX, oarlockY);
  ctx.rotate(oarAngle);

  // Shaft — angled: handle up-left, blade down-right
  ctx.strokeStyle = 'rgba(180,140,80,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-SZ * 0.04, -SZ * 0.20);
  ctx.lineTo(SZ * 0.04, SZ * 0.65);
  ctx.stroke();

  // Blade (submerged end) — larger, rotated to match shaft angle
  ctx.save();
  ctx.translate(SZ * 0.05, SZ * 0.72);
  ctx.rotate(0.12);
  ctx.fillStyle = 'rgba(150,110,50,0.6)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  // Oarlock pin on hull
  ctx.fillStyle = 'rgba(80,80,80,0.5)';
  ctx.beginPath();
  ctx.arc(oarlockX, oarlockY, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Oar splash / water ripples
  {
    const splashIntensity = Math.abs(Math.sin(t * 0.005)) * 0.5 + strokePulse * 0.5;
    if (splashIntensity > 0.15) {
      const bladeWorldX = oarlockX + Math.sin(oarAngle) * SZ * 0.72 + SZ * 0.05;
      const bladeWorldY = oarlockY + Math.cos(oarAngle) * SZ * 0.72;
      // Ripple rings at blade entry
      ctx.strokeStyle = `rgba(200,230,255,${splashIntensity * 0.15})`;
      ctx.lineWidth = 0.8;
      for (let ri = 0; ri < 2; ri++) {
        const rippleR = 3 + ri * 4 + splashIntensity * 3;
        ctx.beginPath();
        ctx.ellipse(bladeWorldX, bladeWorldY, rippleR, rippleR * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Small splash drops
      if (splashIntensity > 0.35) {
        ctx.fillStyle = `rgba(220,240,255,${splashIntensity * 0.1})`;
        for (let di = 0; di < 3; di++) {
          const dAngle = -0.5 + di * 0.5;
          const dDist = 4 + splashIntensity * 4;
          ctx.beginPath();
          ctx.arc(
            bladeWorldX + Math.cos(dAngle) * dDist,
            bladeWorldY + Math.sin(dAngle) * dDist - 2,
            0.8, 0, Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }
  }

  // Bow wave (white crest at front)
  if (speed > 0.5) {
    const bowWaveA = Math.min(0.12, speed * 0.03);
    const bwX = SZ * 0.88;
    ctx.strokeStyle = `rgba(220,240,255,${bowWaveA})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bwX, -SZ * 0.06);
    ctx.quadraticCurveTo(bwX + 3, -SZ * 0.01, bwX, SZ * 0.08);
    ctx.stroke();
    // Foam dots
    ctx.fillStyle = `rgba(240,250,255,${bowWaveA * 0.6})`;
    for (let fi = 0; fi < 3; fi++) {
      const fy = -SZ * 0.04 + fi * SZ * 0.04 + Math.sin(t * 0.01 + fi) * 1;
      ctx.beginPath();
      ctx.arc(bwX + 2, fy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bow ornament
  ctx.strokeStyle = 'rgba(180,140,80,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(SZ * 0.85, -SZ * 0.05);
  ctx.quadraticCurveTo(SZ * 0.95, -SZ * 0.15, SZ * 0.9, -SZ * 0.22);
  ctx.stroke();

  // Bow lantern flame
  {
    const flX = SZ * 0.88;
    const flY = -SZ * 0.24;
    const flicker = 0.7 + Math.sin(t * 0.015 + 7) * 0.15 + Math.sin(t * 0.023) * 0.1;
    const flSize = SZ * 0.08 * flicker;

    // Flame glow (wide, soft)
    const fGlowR = flSize * 6;
    const fG = ctx.createRadialGradient(flX, flY, 0, flX, flY, fGlowR);
    fG.addColorStop(0, `rgba(255,180,60,${0.12 * flicker})`);
    fG.addColorStop(0.4, `rgba(255,140,40,${0.04 * flicker})`);
    fG.addColorStop(1, 'transparent');
    ctx.fillStyle = fG;
    ctx.beginPath();
    ctx.arc(flX, flY, fGlowR, 0, Math.PI * 2);
    ctx.fill();

    // Flame body (teardrop)
    ctx.fillStyle = `rgba(255,200,80,${0.7 * flicker})`;
    ctx.beginPath();
    ctx.moveTo(flX, flY - flSize * 2.5);
    ctx.quadraticCurveTo(flX + flSize, flY - flSize, flX + flSize * 0.6, flY + flSize * 0.5);
    ctx.quadraticCurveTo(flX, flY + flSize, flX - flSize * 0.6, flY + flSize * 0.5);
    ctx.quadraticCurveTo(flX - flSize, flY - flSize, flX, flY - flSize * 2.5);
    ctx.fill();

    // Hot core
    ctx.fillStyle = `rgba(255,240,200,${0.6 * flicker})`;
    ctx.beginPath();
    ctx.ellipse(flX, flY, flSize * 0.3, flSize * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Stroke pulse ring (outside save/restore)
  if (strokePulse > 0) {
    const sp2 = strokePulse / 0.4;
    ctx.strokeStyle = `rgba(212,165,116,${sp2 * 0.12})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 18 + (1 - sp2) * 25, 0, Math.PI * 2); ctx.stroke();
  }
}

export function drawSakuraPetals(
  ctx: CanvasRenderingContext2D, w: number, _h: number, petals: Petal[],
): void {
  for (const p of petals) {
    ctx.save();
    const px = p.x * w; const py = p.y;
    ctx.translate(px, py); ctx.rotate(p.rot);

    // Heart-shaped petal (two arcs)
    ctx.fillStyle = `${p.color}${p.alpha})`;
    ctx.beginPath();
    const s = p.size;
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.1, 0, s);
    ctx.bezierCurveTo(s, s * 0.1, s * 0.5, -s * 0.3, 0, s * 0.3);
    ctx.fill();

    // Moonlight catch — occasional bright flash
    const catchPhase = Math.sin(p.rot * 3 + py * 0.01) * 0.5 + 0.5;
    if (catchPhase > 0.85 && p.size > 2.5) {
      ctx.fillStyle = `rgba(255,255,255,${(catchPhase - 0.85) * 2 * p.alpha})`;
      ctx.beginPath(); ctx.arc(0, s * 0.5, s * 0.3, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }
}

export function drawFireflies(
  ctx: CanvasRenderingContext2D, w: number, h: number, _t: number, fireflies: Firefly[],
): void {
  for (const f of fireflies) {
    const fx = f.x * w; const fy = f.y * h;
    const glow = 0.3 + Math.sin(f.phase) * 0.3;
    if (glow <= 0) continue;

    // Color variation: mix of green-yellow and warm gold
    const isGold = f.size > 1.8;
    const coreR = isGold ? '255,230,130' : '220,255,150';
    const glowC = isGold ? '240,200,80' : '200,255,100';
    const haloC = isGold ? '200,180,60' : '180,230,80';

    // Brief trail (2-3 afterimages)
    for (let ti = 1; ti <= 2; ti++) {
      const trailX = fx - f.vx * ti * 80;
      const trailY = fy - f.vy * ti * 80;
      const trailA = glow * 0.04 * (3 - ti);
      ctx.fillStyle = `rgba(${glowC},${trailA})`;
      ctx.beginPath(); ctx.arc(trailX, trailY, f.size * 0.4, 0, Math.PI * 2); ctx.fill();
    }

    // Glow halo
    const glowR = f.size * 4 + glow * 3;
    const glowG = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowR);
    glowG.addColorStop(0, `rgba(${glowC},${glow * 0.12})`);
    glowG.addColorStop(0.5, `rgba(${haloC},${glow * 0.04})`);
    glowG.addColorStop(1, 'transparent');
    ctx.fillStyle = glowG; ctx.fillRect(fx - glowR, fy - glowR, glowR * 2, glowR * 2);

    // Core dot
    ctx.fillStyle = `rgba(${coreR},${glow * 0.6})`;
    ctx.beginPath(); ctx.arc(fx, fy, f.size * 0.6, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawSpiritParticles(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number,
  orbs: SpiritOrb[], groundY: number,
): void {
  const gY = groundY * h;

  // Floating spirit orbs rising from river
  for (const o of orbs) {
    const ox = o.x * w; const oy = o.y * h;
    if (oy > h || oy < 0) continue;
    const breathe = 1 + Math.sin(t * 0.001 + o.phase) * 0.2;
    const oR = o.radius * breathe;
    const oG = ctx.createRadialGradient(ox, oy, 0, ox, oy, oR);
    oG.addColorStop(0, `${o.color}${o.alpha * breathe})`);
    oG.addColorStop(0.6, `${o.color}${o.alpha * 0.3})`);
    oG.addColorStop(1, 'transparent');
    ctx.fillStyle = oG; ctx.fillRect(ox - oR, oy - oR, oR * 2, oR * 2);
  }

  // Spirit wisps — short curved lines near mountains/treeline that drift up
  for (let wi = 0; wi < 5; wi++) {
    const wPhase = t * 0.0005 + wi * 1.7;
    const wLife = (wPhase % 2) / 2;
    if (wLife > 0.8) continue;
    const wx = (0.1 + wi * 0.2 + Math.sin(wi * 3.3) * 0.05) * w;
    const wyBase = gY - 30 - wi * 15;
    const wy = wyBase - wLife * 40;
    const wAlpha = wLife < 0.2 ? wLife * 5 : (0.8 - wLife) / 0.6;

    ctx.strokeStyle = `rgba(200,215,255,${wAlpha * 0.18})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(
      wx + Math.sin(wPhase * 3) * 8, wy - 10,
      wx + Math.sin(wPhase * 2) * 12, wy - 20,
    );
    ctx.stroke();
  }

  // Sparkle dust — tiny bright points flashing across the scene
  for (let si = 0; si < 8; si++) {
    const sp = t * 0.003 + si * 47.3;
    const sparkleLife = (sp % 3) / 3;
    if (sparkleLife > 0.15) continue;
    const sx = (Math.abs(Math.sin(sp * 0.37 + si * 17)) * 0.9 + 0.05) * w;
    const sy = (Math.abs(Math.cos(sp * 0.53 + si * 23)) * 0.7 + 0.05) * h;
    const sa = (0.15 - sparkleLife) / 0.15 * 0.4;
    ctx.fillStyle = `rgba(255,255,255,${sa})`;
    ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
  }
}

export interface HudData {
  energy: number; energyFlash: number;
  energyShatter: { pipIndex: number; timer: number } | null;
  speed: number; inRush: boolean;
  boostRush: number; wave: number; totalTime: number; displayScore: number;
  scoreRef: number; scoreFlash: number; combo: number; comboTimer: number;
  streak: number; t: number;
}

export function drawSpiritHUD(
  ctx: CanvasRenderingContext2D, w: number, _h: number, hud: HudData,
): void {
  const BAR_Y = 4; const BAR_H = 42; const BAR_X = 6; const BAR_W = w - 12;
  const { energy, energyFlash, energyShatter,
    displayScore, scoreRef, scoreFlash, combo, comboTimer, streak, t } = hud;

  // Bar background
  ctx.fillStyle = 'rgba(40,20,10,0.5)';
  ctx.beginPath(); ctx.roundRect(BAR_X, BAR_Y, BAR_W, BAR_H, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(212,165,116,0.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(BAR_X, BAR_Y, BAR_W, BAR_H, 8); ctx.stroke();

  // ENERGY (left)
  const ePipX = BAR_X + 14; const ePipY = BAR_Y + 10;
  const PIP_W = 10; const PIP_H = 14; const PIP_GAP = 18;
  const creamColor = '#f5e6d0';

  for (let ei = 0; ei < 3; ei++) {
    const pipX = ePipX + ei * PIP_GAP;
    if (ei < energy) {
      const isFlashing = energyFlash > 0;
      const pipColor = isFlashing ? '#ffffff' : energy === 1 ? C.barrier : energy === 2 ? C.boost : '#ff8c00';
      const lowPulse = energy === 1 ? (0.65 + Math.sin(t * 0.015) * 0.15) : 1;
      const pipPulse = isFlashing ? (1 + Math.sin(t * 0.02) * 0.3) : lowPulse;
      ctx.shadowColor = isFlashing ? '#ffffff' : pipColor;
      ctx.shadowBlur = isFlashing ? 10 : energy === 1 ? 5 : 3;
      ctx.globalAlpha = energy === 1 ? lowPulse : 1;
      ctx.fillStyle = pipColor;
      ctx.beginPath(); ctx.roundRect(
        pipX + (PIP_W - PIP_W * pipPulse) / 2, ePipY + (PIP_H - PIP_H * pipPulse) / 2,
        PIP_W * pipPulse, PIP_H * pipPulse, 2,
      ); ctx.fill();
      ctx.fillStyle = `rgba(180,140,80,${lowPulse * 0.4})`;
      ctx.fillRect(pipX + PIP_W * 0.35, ePipY - 2, PIP_W * 0.3, 3);
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.roundRect(pipX, ePipY, PIP_W, PIP_H, 2); ctx.fill();
    }
  }
  // Energy shatter particles
  if (energyShatter && energyShatter.timer > 0) {
    const progress = 1 - energyShatter.timer / 0.4;
    const shatterPipX = ePipX + energyShatter.pipIndex * PIP_GAP;
    const cx2 = shatterPipX + PIP_W / 2;
    const cy2 = ePipY + PIP_H / 2;
    ctx.shadowColor = 'rgba(255,80,30,0.9)';
    ctx.shadowBlur = 6;
    for (let si = 0; si < 8; si++) {
      const angle = (si / 8) * Math.PI * 2 + 0.3;
      const dist = progress * 32;
      const fx = cx2 + Math.cos(angle) * dist;
      const fy = cy2 + Math.sin(angle) * dist;
      const fa = (1 - progress) * 0.95;
      const sz = 4 * (1 - progress * 0.5);
      ctx.fillStyle = si % 2 === 0 ? `rgba(255,100,50,${fa})` : `rgba(255,220,80,${fa})`;
      ctx.fillRect(fx - sz / 2, fy - sz / 2, sz, sz);
    }
    ctx.shadowBlur = 0;
  }
  ctx.font = '7px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = energy === 1 ? 'rgba(204,0,0,0.5)' : 'rgba(245,230,208,0.25)';
  ctx.fillText('ENERGY', ePipX, BAR_Y + BAR_H - 8);

  // SCORE (right)
  const sf = scoreFlash > 0 ? scoreFlash / 0.3 : 0;
  const scoreSz = 22 + sf * 4;
  ctx.textAlign = 'right';
  ctx.fillStyle = sf > 0 ? `rgb(${255},${Math.round(255 - sf * 40)},${Math.round(200 - sf * 100)})` : creamColor;
  ctx.font = `bold ${Math.round(scoreSz)}px monospace`;
  ctx.shadowColor = sf > 0 ? C.boost : C.ship; ctx.shadowBlur = 6 + sf * 8;
  ctx.fillText(Math.round(displayScore).toLocaleString(), w - 18, BAR_Y + 28); ctx.shadowBlur = 0;
  {
    const scoreDelta = Math.abs(scoreRef - displayScore);
    if (scoreDelta > 10) {
      const bloomI = Math.min(1, scoreDelta / 500);
      ctx.shadowColor = C.boost; ctx.shadowBlur = 15 * bloomI;
      ctx.fillStyle = `rgba(255,215,0,${bloomI * 0.15})`;
      ctx.fillText(Math.round(displayScore).toLocaleString(), w - 18, BAR_Y + 28); ctx.shadowBlur = 0;
    }
  }
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(245,230,208,0.25)';
  ctx.fillText('SCORE', w - 18, BAR_Y + BAR_H - 8);

  // COMBO (center) — pushed down so bounce doesn't clip top edge
  if (combo > 1) {
    const freshness = Math.max(0, comboTimer - 2.5) / 0.5;
    const bounceMul = 1 + freshness * 0.25 * Math.abs(Math.sin(freshness * Math.PI));
    const comboSz = Math.round((24 + (combo - 2) * 3) * bounceMul);
    const comboCY = 18 + comboSz * 0.5;
    const comboColor = combo >= 6 ? C.boost : combo >= 4 ? C.combo : C.ship;
    const comboRGB = combo >= 6 ? '255,215,0' : combo >= 4 ? '255,140,0' : '212,165,116';
    const pillG = ctx.createRadialGradient(w / 2, comboCY, 0, w / 2, comboCY, 40 + combo * 4);
    pillG.addColorStop(0, `rgba(${comboRGB},${0.06 + combo * 0.01})`);
    pillG.addColorStop(1, 'transparent');
    ctx.fillStyle = pillG; ctx.fillRect(w / 2 - 60, comboCY - 22, 120, 44);
    ctx.textAlign = 'center'; ctx.font = `bold ${comboSz}px monospace`;
    ctx.fillStyle = comboColor; ctx.shadowColor = comboColor; ctx.shadowBlur = 8 + combo * 2;
    ctx.fillText(`x${combo}`, w / 2, comboCY + comboSz * 0.35); ctx.shadowBlur = 0;
    const barW2 = 40 + combo * 4;
    const barY = comboCY + comboSz * 0.35 + 7;
    const pct = Math.max(0, comboTimer / (combo >= 8 ? 4 : 3));
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(w / 2 - barW2 / 2, barY, barW2, 3);
    const timerG = ctx.createLinearGradient(w / 2 - barW2 / 2, 0, w / 2 - barW2 / 2 + barW2 * pct, 0);
    timerG.addColorStop(0, comboColor); timerG.addColorStop(0.7, comboColor); timerG.addColorStop(1, '#ffffff');
    ctx.fillStyle = timerG; ctx.shadowColor = comboColor;
    ctx.shadowBlur = pct < 0.3 ? 6 + Math.sin(t * 0.02) * 4 : 3;
    ctx.fillRect(w / 2 - barW2 / 2, barY, barW2 * pct, 3); ctx.shadowBlur = 0;
  }

  // Streak
  if (streak >= 5) {
    ctx.textAlign = 'center'; ctx.font = 'bold 13px monospace';
    const streakColor = streak >= 15 ? C.boost : streak >= 10 ? C.combo : C.orb;
    ctx.shadowColor = streakColor; ctx.shadowBlur = 4;
    ctx.fillStyle = streakColor; ctx.fillText(`${streak} STREAK`, w / 2, 75);
    ctx.shadowBlur = 0;
  }
}

export function drawWarmVignette(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  speed: number, inRush: boolean, comboHigh: boolean,
): void {
  const vG = ctx.createRadialGradient(w / 2, h * 0.45, w * 0.3, w / 2, h * 0.45, w * 0.8);
  vG.addColorStop(0, 'transparent'); vG.addColorStop(0.7, 'rgba(0,0,0,0.08)');
  vG.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vG; ctx.fillRect(0, 0, w, h);

  if (speed > 1.5) {
    const sVA = Math.min(0.1, (speed - 1.5) * 0.05);
    const tSV = ctx.createLinearGradient(0, 0, 0, h * 0.08);
    tSV.addColorStop(0, `rgba(0,0,0,${sVA})`); tSV.addColorStop(1, 'transparent');
    ctx.fillStyle = tSV; ctx.fillRect(0, 0, w, h * 0.08);
    const bSV = ctx.createLinearGradient(0, h * 0.92, 0, h);
    bSV.addColorStop(0, 'transparent'); bSV.addColorStop(1, `rgba(0,0,0,${sVA})`);
    ctx.fillStyle = bSV; ctx.fillRect(0, h * 0.92, w, h * 0.08);
  }

  const vigColor = inRush ? '50,35,0' : comboHigh ? '40,20,0' : '15,8,25';
  const vigAlpha = 0.06;
  const vig1 = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.35);
  vig1.addColorStop(0, `rgba(${vigColor},${vigAlpha})`); vig1.addColorStop(1, 'transparent');
  ctx.fillStyle = vig1; ctx.fillRect(0, 0, w * 0.35, h * 0.35);
  const vig2 = ctx.createRadialGradient(w, 0, 0, w, 0, w * 0.35);
  vig2.addColorStop(0, `rgba(${vigColor},${vigAlpha})`); vig2.addColorStop(1, 'transparent');
  ctx.fillStyle = vig2; ctx.fillRect(w * 0.65, 0, w * 0.35, h * 0.35);
}
