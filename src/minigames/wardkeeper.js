// Ward Keeper (defend from above): at night the kraken spit globs of ink across the warded
// passage, aiming for the ward-buoys. Click anywhere to send a flare from the nearest pilot
// boat; it bursts where you clicked and burns away any ink in the burst. If every buoy goes
// dark, the passage is lost for the night.
import { W, H, COLORS, hud } from './common.js';

export const wardKeeper = {
  title: 'Ward Keeper',
  how: [
    'The kraken spit ink at the ward-buoys. Keep the violet lights burning.',
    'Click (or aim with the mouse and press Space) to send a flare. It bursts where you aimed and burns away ink in the blast.',
    'Each of the three pilot boats carries a few flares per wave. Some ink globs split in two.',
  ],
  create(api) {
    const seaY = H - 90;
    const buoys = [130, 230, 330, 630, 730, 830].map(x => ({ x, lit: true }));
    const boats = [60, 480, 900].map(x => ({ x, flares: 10 }));
    let flares = [], bursts = [], globs = [], wave = 0, toSpawn = 0, spawnT = 0, score = 0, over = false, t = 0, banner = 0, tentacles = [];

    function newWave() {
      wave++; banner = 2;
      toSpawn = 8 + wave * 4;
      boats.forEach(b => { b.flares = 10 + Math.min(6, wave); });
      tentacles = Array.from({ length: 3 + Math.min(4, wave) }, () => ({ x: 60 + Math.random() * (W - 120), phase: Math.random() * 6 }));
    }
    newWave();

    function spawnGlob(x0, y0, split = false) {
      const targets = [...buoys.filter(b => b.lit), ...boats];
      const tg = targets[Math.floor(Math.random() * targets.length)];
      const speed = 38 + wave * 9 + Math.random() * 15;
      const dx = tg.x - x0, dy = seaY - y0, d = Math.hypot(dx, dy);
      globs.push({ x0, y0, x: x0, y: y0, vx: dx / d * speed, vy: dy / d * speed, split: !split && Math.random() < 0.15 + wave * 0.03 });
    }

    function finish() {
      over = true;
      const lit = buoys.filter(b => b.lit).length;
      api.finish({ score, waves: wave - 1, gold: Math.floor(score / 25), renown: (wave - 1) * 6 + lit, rep: { mariners: wave - 1 },
        summary: lit ? `You held the passage for ${wave} wave${wave === 1 ? '' : 's'}.` : `The last ward went dark in wave ${wave}.` });
    }

    function fire(x, y) {
      if (y > seaY - 30) return;
      const ready = boats.filter(b => b.flares > 0).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
      if (!ready) return;
      ready.flares--;
      flares.push({ sx: ready.x, sy: seaY - 6, x: ready.x, y: seaY - 6, tx: x, ty: y });
    }

    function update(dt) {
      if (over) return;
      t += dt; banner -= dt;
      if (api.mouse.clicked) fire(api.mouse.x, api.mouse.y);
      if (api.pressed.has('Space')) fire(api.mouse.x, api.mouse.y);
      // New ink from the tentacles' tips.
      spawnT -= dt;
      if (toSpawn > 0 && spawnT <= 0) {
        const tn = tentacles[Math.floor(Math.random() * tentacles.length)];
        spawnGlob(tn.x + Math.sin(t + tn.phase) * 30, 60);
        toSpawn--; spawnT = Math.max(0.35, 1.6 - wave * 0.15) * (0.5 + Math.random());
      }
      for (const f of flares) {
        const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy), sp = 620 * dt;
        if (d <= sp) { f.done = true; bursts.push({ x: f.tx, y: f.ty, r: 0, t: 0 }); }
        else { f.x += dx / d * sp; f.y += dy / d * sp; }
      }
      flares = flares.filter(f => !f.done);
      for (const b of bursts) { b.t += dt; b.r = b.t < 0.45 ? b.t / 0.45 * 48 : 48 * (1 - (b.t - 0.45) / 0.5); }
      bursts = bursts.filter(b => b.t < 0.95);
      for (const gl of globs) {
        gl.x += gl.vx * dt; gl.y += gl.vy * dt;
        if (gl.split && gl.y > 200 + Math.random() * 120) { gl.split = false; spawnGlob(gl.x, gl.y, true); }
        for (const b of bursts) if (Math.hypot(gl.x - b.x, gl.y - b.y) < b.r + 4) { gl.dead = true; score += 25; }
        if (gl.y >= seaY) {
          gl.dead = true;
          const hit = buoys.find(b => b.lit && Math.abs(b.x - gl.x) < 30);
          if (hit) hit.lit = false;
          const boat = boats.find(b => Math.abs(b.x - gl.x) < 30);
          if (boat) boat.flares = Math.max(0, boat.flares - 4);
        }
      }
      globs = globs.filter(g => !g.dead);
      if (!buoys.some(b => b.lit)) return finish();
      if (toSpawn <= 0 && !globs.length) {
        score += buoys.filter(b => b.lit).length * 50 + boats.reduce((s, b) => s + b.flares, 0) * 5;
        newWave();
      }
    }

    function draw(g) {
      // Night sea, the passage's violet lights, tentacles on the horizon.
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0b1020'); sky.addColorStop(1, '#1c2a44');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect((i * 157) % W, (i * 89) % 260 + 40, 1.5, 1.5); }
      for (const tn of tentacles) {
        const sx = tn.x + Math.sin(t + tn.phase) * 30;
        g.strokeStyle = '#3a2440'; g.lineWidth = 16; g.lineCap = 'round';
        g.beginPath(); g.moveTo(tn.x, 150); g.quadraticCurveTo(tn.x + Math.sin(t * 0.7 + tn.phase) * 40, 100, sx, 60); g.stroke();
      }
      g.fillStyle = '#0f2a3a'; g.fillRect(0, 150, W, H - 150);
      g.fillStyle = '#123548'; g.fillRect(0, seaY, W, H - seaY);
      for (const b of buoys) {
        g.fillStyle = '#3a2a48'; g.fillRect(b.x - 8, seaY - 12, 16, 16);
        if (b.lit) {
          const gl = g.createRadialGradient(b.x, seaY - 20, 0, b.x, seaY - 20, 34);
          gl.addColorStop(0, 'rgba(210,160,255,0.95)'); gl.addColorStop(1, 'rgba(183,124,255,0)');
          g.fillStyle = gl; g.beginPath(); g.arc(b.x, seaY - 20, 34, 0, Math.PI * 2); g.fill();
        } else { g.fillStyle = '#222'; g.beginPath(); g.arc(b.x, seaY - 20, 6, 0, Math.PI * 2); g.fill(); }
      }
      for (const bt of boats) {
        g.fillStyle = '#5a3a24'; g.beginPath(); g.moveTo(bt.x - 34, seaY - 4); g.lineTo(bt.x + 34, seaY - 4); g.lineTo(bt.x + 24, seaY + 12); g.lineTo(bt.x - 24, seaY + 12); g.fill();
        g.fillStyle = COLORS.cream; g.font = 'bold 14px Cinzel, serif'; g.textAlign = 'center'; g.fillText(`${bt.flares}`, bt.x, seaY + 32);
      }
      // Ink and its trail.
      for (const gl of globs) {
        g.strokeStyle = 'rgba(90,40,110,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(gl.x0, gl.y0); g.lineTo(gl.x, gl.y); g.stroke();
        g.fillStyle = '#1a0f22'; g.beginPath(); g.arc(gl.x, gl.y, 6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#7a4a9a'; g.lineWidth = 2; g.stroke();
      }
      for (const f of flares) { g.strokeStyle = 'rgba(255,220,150,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(f.sx, f.sy); g.lineTo(f.x, f.y); g.stroke(); g.fillStyle = '#fff2c0'; g.fillRect(f.x - 2, f.y - 2, 4, 4); }
      for (const b of bursts) {
        const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(1, b.r));
        gr.addColorStop(0, 'rgba(255,250,220,0.95)'); gr.addColorStop(0.6, 'rgba(255,190,90,0.7)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, Math.max(1, b.r), 0, Math.PI * 2); g.fill();
      }
      // Crosshair.
      g.strokeStyle = 'rgba(255,240,200,0.8)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(api.mouse.x, api.mouse.y, 10, 0, Math.PI * 2); g.moveTo(api.mouse.x - 16, api.mouse.y); g.lineTo(api.mouse.x + 16, api.mouse.y); g.moveTo(api.mouse.x, api.mouse.y - 16); g.lineTo(api.mouse.x, api.mouse.y + 16); g.stroke();
      hud(g, [`Wave ${wave}`, `Score ${score}`, `Wards lit ${buoys.filter(b => b.lit).length}/6`]);
      if (banner > 0) { g.fillStyle = COLORS.shade; g.fillRect(W / 2 - 150, H / 2 - 30, 300, 50); g.fillStyle = COLORS.cream; g.font = 'bold 24px Cinzel, serif'; g.textAlign = 'center'; g.fillText(`Wave ${wave}`, W / 2, H / 2 + 3); }
    }
    return { update, draw };
  },
};
