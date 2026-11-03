// Market Run: carry a parcel from the quay, across the market street at rush hour, over the
// harbor slips (hop on boats and floating crates; the water is deep), to one of five stalls
// waiting on the far dock. Fill all five and the next round runs faster.
import { W, H, COLORS, hud, person } from './common.js';

const T = 48;                       // one hop
const COLS = W / T;                 // 20 columns
// Rows from the bottom: 0 quay (start), 1-5 street, 6 plaza (safe), 7-10 harbor slips, 11 the far dock.
const ROWS = 12;
const top = H - ROWS * T;           // leaves room for the HUD
const rowY = (r) => H - (r + 1) * T;

const STREET = [
  { row: 1, kind: 'porter', dir: -1, speed: 55, len: 1, gap: [3, 6] },
  { row: 2, kind: 'cart', dir: 1, speed: 80, len: 2, gap: [4, 7] },
  { row: 3, kind: 'camel', dir: -1, speed: 65, len: 3, gap: [5, 8] },
  { row: 4, kind: 'cart', dir: 1, speed: 110, len: 2, gap: [5, 9] },
  { row: 5, kind: 'guards', dir: -1, speed: 45, len: 2, gap: [4, 6] },
];
const SLIPS = [
  { row: 7, kind: 'crates', dir: 1, speed: 50, len: 3, gap: [3, 5] },
  { row: 8, kind: 'barrels', dir: -1, speed: 60, len: 2, gap: [2, 4], sinks: true },
  { row: 9, kind: 'boat', dir: 1, speed: 75, len: 4, gap: [3, 5] },
  { row: 10, kind: 'crates', dir: -1, speed: 55, len: 2, gap: [3, 5] },
];

export const marketRun = {
  title: 'Market Run',
  how: [
    'Carry the parcel up to one of the five stalls on the far dock.',
    'Dodge the carts, camels, porters and guard patrols. In the harbor slips, hop on boats and crates: the water is deep.',
    'Arrow keys or WASD to hop. Fill all five stalls and the next round runs faster.',
    'Three tries. Pays in gold and renown.',
  ],
  create(api) {
    let level = 1, lives = 3, score = 0, delivered = 0, homes = [false, false, false, false, false];
    let lanes = [], player, best, timer, dead = 0, flash = '', flashT = 0, t = 0;
    const homeCols = [2, 6, 10, 14, 18];

    function makeLanes() {
      lanes = [...STREET, ...SLIPS].map((l) => {
        const speed = l.speed * (1 + (level - 1) * 0.22);
        const items = [];
        let x = Math.random() * 4;
        while (x < COLS + 6) {
          items.push({ x: x * T, phase: Math.random() * 6 });
          x += l.len + l.gap[0] + Math.random() * (l.gap[1] - l.gap[0]);
        }
        return { ...l, speed, items, span: (x) * T };
      });
    }
    function reset() {
      player = { c: 9.5, r: 0, hop: 0, fromC: 9.5, fromR: 0, ride: 0 };
      best = 0;
      timer = 30;
    }
    makeLanes(); reset();

    function die(why) {
      if (dead > 0) return;
      lives--; dead = 1.0;
      flash = why; flashT = 1.6;
    }
    function px() { return player.c * T; }

    function update(dt) {
      t += dt;
      if (flashT > 0) flashT -= dt;
      // Move everything along its lane, wrapping around.
      for (const l of lanes) for (const it of l.items) {
        it.x += l.dir * l.speed * dt;
        if (l.dir > 0 && it.x > W + T) it.x -= l.span;
        if (l.dir < 0 && it.x < -l.len * T - T) it.x += l.span;
      }
      if (dead > 0) {
        dead -= dt;
        if (dead <= 0) {
          if (lives <= 0) return finish();
          reset();
        }
        return;
      }
      timer -= dt;
      if (timer <= 0) die('Too slow! The parcel was due.');

      // Hop.
      const k = api.pressed;
      let dc = 0, dr = 0;
      if (k.has('ArrowUp') || k.has('KeyW')) dr = 1;
      else if (k.has('ArrowDown') || k.has('KeyS')) dr = -1;
      else if (k.has('ArrowLeft') || k.has('KeyA')) dc = -1;
      else if (k.has('ArrowRight') || k.has('KeyD')) dc = 1;
      if (dc || dr) {
        const nr = Math.max(0, Math.min(ROWS - 1, player.r + dr));
        const nc = Math.max(0.5, Math.min(COLS - 1.5, player.c + dc));
        if (nr === ROWS - 1) {
          // The far dock: only the five stall openings take a parcel.
          const slot = homeCols.findIndex(hc => Math.abs(hc - nc) < 0.9);
          if (slot < 0) { /* bump: you can't climb the dock there */ }
          else if (homes[slot]) { flash = 'That stall already has its parcel.'; flashT = 1.2; }
          else { player.r = nr; player.c = homeCols[slot]; deliver(slot); return; }
        } else {
          player.r = nr; player.c = nc;
          if (nr > best) { best = nr; score += 10; }
        }
      }

      // Riding or drowning in the slips; getting hit in the street.
      const lane = lanes.find(l => l.row === player.r);
      if (lane) {
        const x0 = px() - T * 0.3, x1 = px() + T * 0.3;
        const under = lane.items.find(it => {
          const a = it.x, b = it.x + lane.len * T;
          const sunk = lane.sinks && Math.sin(t * 1.2 + it.phase) < -0.55;
          return !sunk && x1 > a + 4 && x0 < b - 4;
        });
        if (lane.row >= 7) {
          if (!under) die('Splash! The parcel is soaked.');
          else {
            player.c += (lane.dir * lane.speed * dt) / T;
            if (player.c < 0 || player.c > COLS - 1) die('Swept away!');
          }
        } else if (under) {
          die({ cart: 'Run down by a cart!', camel: 'A camel sat on you.', porter: 'Crates everywhere!', guards: 'Stopped by the guard: "Papers?"' }[lane.kind]);
        }
      }
    }

    function deliver(slot) {
      homes[slot] = true;
      delivered++;
      score += 50 + Math.floor(timer) * 2;
      flash = `Delivered! +${50 + Math.floor(timer) * 2}`; flashT = 1.2;
      if (homes.every(Boolean)) {
        level++; score += 200;
        homes = [false, false, false, false, false];
        flash = `All five stalls served! Round ${level}: faster.`; flashT = 2;
        makeLanes();
      }
      reset();
    }

    function finish() {
      const gold = Math.floor(score / 20);
      const renown = delivered * 2 + (level - 1) * 4;
      api.finish({ score, gold, renown, rep: { merchants: Math.min(3, delivered) }, summary: `${delivered} parcel${delivered === 1 ? '' : 's'} delivered, reached round ${level}.` });
    }

    function draw(g) {
      // Ground: quay at the bottom, street, plaza, harbor slips, far dock.
      g.fillStyle = COLORS.stone; g.fillRect(0, rowY(0), W, T);
      for (let r = 1; r <= 5; r++) { g.fillStyle = r % 2 ? '#d8bf8e' : '#d2b884'; g.fillRect(0, rowY(r), W, T); }
      g.fillStyle = '#e6dcc6'; g.fillRect(0, rowY(6), W, T);
      for (let i = 0; i < COLS; i++) { g.fillStyle = i % 2 ? '#ddd1b8' : '#e6dcc6'; g.fillRect(i * T, rowY(6), T, T); }
      const wave = (y) => { g.fillStyle = COLORS.sea; g.fillRect(0, y, W, T); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); const xx = ((t * 30 + i * 170) % (W + 100)) - 50; g.moveTo(xx, y + 18 + (i % 3) * 8); g.quadraticCurveTo(xx + 15, y + 12 + (i % 3) * 8, xx + 30, y + 18 + (i % 3) * 8); g.stroke(); } };
      for (let r = 7; r <= 10; r++) wave(rowY(r));
      // Far dock with five stalls.
      g.fillStyle = '#a8845a'; g.fillRect(0, rowY(11), W, T);
      const awn = ['#b8382b', '#2e6c8e', '#d7a33a', '#5f8a3a', '#8e3b6c'];
      homeCols.forEach((hc, i) => {
        const x = hc * T - T * 0.6;
        g.fillStyle = '#e6dcc6'; g.fillRect(x, rowY(11) + 6, T * 1.2, T - 6);
        g.fillStyle = awn[i]; g.fillRect(x - 6, rowY(11), T * 1.2 + 12, 12);
        if (homes[i]) { g.fillStyle = '#8a6a44'; g.fillRect(hc * T - 12, rowY(11) + 18, 24, 20); g.fillStyle = COLORS.gold; g.fillRect(hc * T - 12, rowY(11) + 26, 24, 4); }
      });

      // Lane things.
      for (const l of lanes) {
        const y = rowY(l.row);
        for (const it of l.items) {
          const x = it.x, w = l.len * T;
          if (l.kind === 'cart') {
            g.fillStyle = '#7a5636'; g.fillRect(x + 4, y + 10, w - 8, T - 20);
            g.fillStyle = '#c96b2c'; g.fillRect(x + 10, y + 14, w - 28, T - 28);
            g.fillStyle = '#2b1d12'; for (const wx of [x + 12, x + w - 16]) { g.fillRect(wx, y + 6, 8, 6); g.fillRect(wx, y + T - 12, 8, 6); }
          } else if (l.kind === 'camel') {
            g.fillStyle = '#c99a5c'; g.beginPath(); g.ellipse(x + w * 0.45, y + T / 2, w * 0.38, T * 0.3, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#b5864a'; g.beginPath(); g.arc(x + w * 0.4, y + T / 2, 10, 0, Math.PI * 2); g.fill();
            const hx = l.dir > 0 ? x + w - 10 : x + 10;
            g.fillStyle = '#c99a5c'; g.beginPath(); g.ellipse(hx, y + T / 2, 10, 7, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#5a3a20'; g.fillRect(x + w * 0.3, y + T / 2 - 14, 20, 6);
          } else if (l.kind === 'porter') {
            person(g, x + T / 2, y + T / 2, 12, '#e2d3b4', '#a86b3c');
            g.fillStyle = '#8a6a44'; g.fillRect(x + T / 2 - 9, y + T / 2 - 9, 18, 18);
          } else if (l.kind === 'guards') {
            person(g, x + T * 0.5, y + T / 2, 13, COLORS.teal, '#8d5524');
            person(g, x + T * 1.5, y + T / 2, 13, COLORS.teal, '#c68642');
            g.strokeStyle = '#c8c8cc'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + T * 0.5 + 12, y + 8); g.lineTo(x + T * 0.5 + 12, y + T - 8); g.stroke();
          } else if (l.kind === 'boat') {
            g.fillStyle = '#6b4a2e'; g.beginPath();
            g.moveTo(x + 6, y + 8); g.lineTo(x + w - 18, y + 8); g.lineTo(x + w - 2, y + T / 2); g.lineTo(x + w - 18, y + T - 8); g.lineTo(x + 6, y + T - 8); g.closePath(); g.fill();
            g.fillStyle = '#a07a4e'; g.fillRect(x + 12, y + 14, w - 36, T - 28);
          } else if (l.kind === 'crates') {
            for (let i = 0; i < l.len; i++) { g.fillStyle = '#b08a5a'; g.fillRect(x + i * T + 4, y + 6, T - 8, T - 12); g.strokeStyle = '#6b4a2c'; g.lineWidth = 2; g.strokeRect(x + i * T + 4, y + 6, T - 8, T - 12); g.beginPath(); g.moveTo(x + i * T + 4, y + 6); g.lineTo(x + i * T + T - 4, y + T - 6); g.stroke(); }
          } else if (l.kind === 'barrels') {
            const s = Math.sin(t * 1.2 + it.phase);
            const sinking = s < -0.2, sunk = s < -0.55;
            for (let i = 0; i < l.len; i++) {
              g.globalAlpha = sunk ? 0.15 : sinking ? 0.55 : 1;
              g.fillStyle = '#8a5a2e'; g.beginPath(); g.arc(x + i * T + T / 2, y + T / 2, T * 0.38, 0, Math.PI * 2); g.fill();
              g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.beginPath(); g.arc(x + i * T + T / 2, y + T / 2, T * 0.25, 0, Math.PI * 2); g.stroke();
              g.globalAlpha = 1;
            }
          }
        }
      }

      // You, with the parcel.
      if (dead <= 0 || Math.floor(dead * 10) % 2) {
        const x = px(), y = rowY(player.r) + T / 2;
        person(g, x, y, 14, '#4b1f6b', '#e0ac69');
        g.fillStyle = '#d7a33a'; g.fillRect(x - 7, y - 20, 14, 10);
        g.strokeStyle = '#7a1408'; g.lineWidth = 2; g.strokeRect(x - 7, y - 20, 14, 10);
      }

      hud(g, [`Round ${level}`, `Score ${score}`, `Tries ${'♦'.repeat(Math.max(0, lives))}`, `Time ${Math.max(0, Math.ceil(timer))}`, `Delivered ${delivered}`]);
      if (flashT > 0 && flash) {
        g.fillStyle = COLORS.shade; g.fillRect(W / 2 - 260, H / 2 - 30, 520, 56);
        g.fillStyle = COLORS.cream; g.font = 'bold 22px Cinzel, Georgia, serif'; g.textAlign = 'center';
        g.fillText(flash, W / 2, H / 2 + 6);
      }
    }
    void top;
    return { update, draw };
  },
};
