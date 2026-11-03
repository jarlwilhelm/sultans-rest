// Gull Patrol (shoot-the-swarm): the Salted Kraken's fish dries on racks along the bottom.
// Gulls circle in a flock that sways overhead; now and then one breaks off and dives for a fish.
// Move along the racks and sling stones. Gull droppings knock you dizzy for a moment.
// Lose all the fish and the innkeeper sends you home.
import { W, H, COLORS, hud, person } from './common.js';

export const gullPatrol = {
  title: 'Gull Patrol',
  how: [
    'Keep the gulls off the innkeeper\'s fish racks.',
    'Left and right to move, Space to sling a stone (two in the air at most).',
    'Divers are worth more. Droppings make you dizzy. Clear the flock and a bigger one comes.',
  ],
  create(api) {
    const groundY = H - 70;
    let me = { x: W / 2, dizzy: 0 }, stones = [], drops = [], gulls = [], feathers = [];
    let fish = 12, wave = 0, score = 0, t = 0, cool = 0, over = false, banner = 0;
    const racks = Array.from({ length: 12 }, (_, i) => ({ x: 80 + i * 72, has: true }));

    function newWave() {
      wave++;
      banner = 2;
      gulls = [];
      const rows = Math.min(5, 2 + wave), cols = 8;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        gulls.push({ hx: 180 + c * 80, hy: 90 + r * 48, x: 180 + c * 80, y: -40 - r * 30, state: 'join', flap: Math.random() * 6, hp: r === 0 && wave > 2 ? 2 : 1 });
      }
    }
    newWave();

    function finish() {
      over = true;
      api.finish({ score, flocks: wave - (fish > 0 ? 0 : 1), gold: Math.floor(score / 25), renown: wave * 2 + Math.floor(score / 400), rep: { },
        summary: fish > 0 ? `Survived ${wave} flock${wave === 1 ? '' : 's'}.` : `The gulls got every fish, during flock ${wave}.` });
    }

    function update(dt) {
      if (over) return;
      t += dt; cool -= dt; banner -= dt;
      if (me.dizzy > 0) me.dizzy -= dt;
      const speed = me.dizzy > 0 ? 120 : 360;
      if (api.keys.has('ArrowLeft') || api.keys.has('KeyA')) me.x -= speed * dt;
      if (api.keys.has('ArrowRight') || api.keys.has('KeyD')) me.x += speed * dt;
      me.x = Math.max(30, Math.min(W - 30, me.x));
      if (api.pressed.has('Space') && cool <= 0 && stones.length < 2 && me.dizzy <= 0) { stones.push({ x: me.x, y: groundY - 30 }); cool = 0.18; }

      for (const s of stones) s.y -= 620 * dt;
      stones = stones.filter(s => s.y > 30);
      const sway = Math.sin(t * 0.8) * 60;
      const divers = gulls.filter(g => g.state === 'dive').length;
      for (const g of gulls) {
        g.flap += dt * 9;
        if (g.state === 'join' || g.state === 'flock') {
          const tx = g.hx + sway, ty = g.hy + Math.sin(t * 1.3 + g.hx) * 6;
          g.x += (tx - g.x) * Math.min(1, dt * 3); g.y += (ty - g.y) * Math.min(1, dt * 3);
          if (g.state === 'join' && Math.abs(ty - g.y) < 4) g.state = 'flock';
          // Some break off and dive for a fish (more as the flocks grow).
          if (g.state === 'flock' && divers < 1 + Math.floor(wave / 2) && Math.random() < dt * (0.12 + wave * 0.04)) {
            const targets = racks.filter(r => r.has);
            if (targets.length) { const r = targets[Math.floor(Math.random() * targets.length)]; Object.assign(g, { state: 'dive', tx: r.x, rack: r, vx: 0 }); }
          }
          if (Math.random() < dt * 0.05 * wave) drops.push({ x: g.x, y: g.y + 10 });
        } else if (g.state === 'dive') {
          // Swoop down in a curve toward the rack.
          const dx = g.tx - g.x;
          g.vx += Math.sign(dx) * 400 * dt; g.vx *= 0.97;
          g.x += g.vx * dt; g.y += (180 + wave * 25) * dt;
          if (g.y > groundY - 8) {
            if (g.rack.has && Math.abs(g.x - g.rack.x) < 40) { g.rack.has = false; fish--; feathers.push({ x: g.x, y: g.y, t: 0.8, text: 'Fish stolen!' }); }
            g.state = 'leave';
          }
        } else if (g.state === 'leave') {
          g.y -= 260 * dt; g.x += Math.sin(g.flap) * 40 * dt;
          if (g.y < 80) { g.state = 'join'; }
        }
      }
      // Hits.
      for (const s of stones) for (const g of gulls) {
        if (g.dead || Math.abs(s.x - g.x) > 24 || Math.abs(s.y - g.y) > 18) continue;
        s.y = -100;
        if (--g.hp > 0) continue;
        g.dead = true;
        const pts = g.state === 'dive' ? 50 : g.state === 'leave' ? 30 : 20;
        score += pts * (1 + Math.floor(wave / 3));
        feathers.push({ x: g.x, y: g.y, t: 0.6, text: `+${pts}` });
        if (g.rack && !g.rack.has && g.state === 'leave') { g.rack.has = true; fish++; feathers.push({ x: g.x, y: g.y - 20, t: 0.8, text: 'Fish saved!' }); }
      }
      gulls = gulls.filter(g => !g.dead);
      for (const d of drops) d.y += 260 * dt;
      for (const d of drops) if (d.y > groundY - 30 && d.y < groundY && Math.abs(d.x - me.x) < 22) { me.dizzy = 1.2; d.y = H + 10; }
      drops = drops.filter(d => d.y < H);
      for (const f of feathers) { f.t -= dt; f.y -= 30 * dt; }
      feathers = feathers.filter(f => f.t > 0);
      if (fish <= 0) return finish();
      if (!gulls.length) { score += 100 * wave; newWave(); }
    }

    function gull(g, x, y, flap, tough) {
      const w = Math.sin(flap) * 10;
      g.strokeStyle = tough ? '#6a6a72' : '#f2f2f2'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 22, y - w); g.quadraticCurveTo(x - 10, y - 12, x, y); g.quadraticCurveTo(x + 10, y - 12, x + 22, y - w); g.stroke();
      g.fillStyle = tough ? '#8a8a92' : '#ffffff'; g.beginPath(); g.ellipse(x, y + 2, 8, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8a33a'; g.fillRect(x - 2, y + 6, 4, 5);
    }

    function draw(g) {
      // Dusk sky over the harbor, the inn's back yard below.
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#5a7aa8'); sky.addColorStop(0.7, '#f0b880'); sky.addColorStop(1, '#e8cf9e');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = COLORS.sea; g.fillRect(0, groundY - 110, W, 60);
      g.fillStyle = '#d9cbb0'; g.fillRect(0, groundY - 50, W, H);
      for (const r of racks) {
        g.strokeStyle = '#6b4a2c'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(r.x - 28, groundY + 10); g.lineTo(r.x - 28, groundY - 30); g.lineTo(r.x + 28, groundY - 30); g.lineTo(r.x + 28, groundY + 10); g.stroke();
        if (r.has) { g.fillStyle = '#9fb8c8'; g.beginPath(); g.ellipse(r.x, groundY - 18, 18, 7, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(r.x + 16, groundY - 18); g.lineTo(r.x + 26, groundY - 26); g.lineTo(r.x + 26, groundY - 10); g.fill(); }
      }
      for (const gl of gulls) gull(g, gl.x, gl.y, gl.flap, gl.hp > 1);
      g.fillStyle = '#5a4a2a';
      for (const s of stones) { g.beginPath(); g.arc(s.x, s.y, 5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#f6f6f0';
      for (const d of drops) { g.beginPath(); g.ellipse(d.x, d.y, 4, 6, 0, 0, Math.PI * 2); g.fill(); }
      // You, with the sling.
      person(g, me.x, groundY - 40, 18, me.dizzy > 0 ? '#8a7aa8' : '#4b1f6b', '#e0ac69');
      g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(me.x, groundY - 50); g.lineTo(me.x, groundY - 70); g.stroke();
      if (me.dizzy > 0) { g.fillStyle = COLORS.gold; g.font = 'bold 16px Cinzel, serif'; g.textAlign = 'center'; g.fillText('dizzy!', me.x, groundY - 80); }
      g.font = 'bold 16px Cinzel, serif'; g.textAlign = 'center';
      for (const f of feathers) { g.fillStyle = `rgba(43,22,6,${Math.min(1, f.t * 2)})`; g.fillText(f.text, f.x, f.y); }
      hud(g, [`Flock ${wave}`, `Score ${score}`, `Fish left ${fish}`]);
      if (banner > 0) { g.fillStyle = COLORS.shade; g.fillRect(W / 2 - 160, H / 2 - 30, 320, 50); g.fillStyle = COLORS.cream; g.font = 'bold 24px Cinzel, serif'; g.fillText(`Flock ${wave}`, W / 2, H / 2 + 3); }
    }
    return { update, draw };
  },
};
