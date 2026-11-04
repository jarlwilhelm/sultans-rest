// The Customs House at night (Chapter Two, the Forged Pass): one small top-down sneaking game. Guards walk
// their rounds with lantern light in front of them; step in the light and you're caught (thrown out and fined;
// try again another night, never a fight). Hide behind desks and crates. Loose papers and bottles make noise
// that turns a guard's head; a thrown coin (C) draws the nearest guard to where it lands; lanterns flicker.
// Reach the head clerk's desk, hold Space to press the seal into your wax, and get out the door you came in.
// Layout and rules: Claude's first version (DRAFT).
import { W, H, COLORS, hud } from './common.js';

const T = 32;                                   // tile size
// # wall, D desk (hide behind: blocks light), B crate, p papers, b bottle, S the seal desk, E the door.
const MAP = [
  '##############################',
  '#....p.......#..........b....#',
  '#.DD....DD...#...DD..........#',
  '#............#.........p.....#',
  '#..p.........D....BB.....DD..#',
  '#....DD......#....BB.........#',
  '#.......b....#...........p...#',
  '###.#######..######..#########',
  '#............................#',
  '#..BB.....p.......DD....BB...#',
  '#..BB............p......BB...#',
  '#.........DDD...........b....#',
  '#......p..............S......#',
  '#.............DD.............#',
  '#####E########################',
];
const ROWS = MAP.length, COLS = MAP[0].length;
const OX = (W - COLS * T) / 2, OY = 48 + (H - 48 - ROWS * T) / 2;
const at = (x, y) => (MAP[Math.floor((y - OY) / T)] || '')[Math.floor((x - OX) / T)] || '#';
const solid = (c) => c === '#' || c === 'D' || c === 'B' || c === 'S';
const center = (c, r) => ({ x: OX + (c + 0.5) * T, y: OY + (r + 0.5) * T });
function find(ch) { for (let r = 0; r < ROWS; r++) { const c = MAP[r].indexOf(ch); if (c >= 0) return center(c, r); } return null; }

export const customs = {
  title: 'The Customs House',
  ownEscape: false,
  how: [
    'Night. Reach the head clerk\'s desk, press the seal into your wax (hold Space), and get back out the door.',
    'WASD or arrows to move (Shift to creep: quieter, slower). Stay out of the lantern light.',
    'Papers and bottles make noise when you walk on them. C throws a coin: the nearest guard goes to look. Desks and crates block the light.',
  ],
  create(api) {
    const door = find('E'), seal = find('S');
    const me = { x: door.x, y: door.y - T, r: 9 };
    // Patrol routes (tile corners); each guard walks his loop and turns at the ends.
    const routes = [
      [[2, 3], [11, 3], [11, 5], [2, 5]],
      [[15, 2], [27, 2], [27, 5], [15, 5]],
      [[2, 8], [27, 8]],
      [[26, 10], [13, 10], [13, 12], [26, 12]],
      [[25, 9], [28, 9], [28, 12], [25, 12]],
    ].map(r => r.map(([c, rr]) => center(c, rr)));
    const guards = routes.map((route, i) => ({ route, i: 1, x: route[0].x, y: route[0].y, dir: 0, alert: 0, look: null, wait: 0, speed: 44 + i * 3 }));
    let t = 0, pressing = 0, hasSeal = false, coins = 3, coinFly = null, caught = false, over = false, noiseRing = null, msg = '';
    const heard = (x, y, radius) => { noiseRing = { x, y, r: 0, max: radius }; for (const g of guards) if (Math.hypot(g.x - x, g.y - y) < radius) { g.look = { x, y }; g.wait = 2.2; } };
    function end(won) {
      over = true;
      api.finish(won ? { score: 1, gold: 0, renown: 25, sealed: true, summary: 'You slip out into the night with the Republic\'s seal pressed into your wax.' }
        : { score: 0, gold: 0, renown: 0, sealed: false, caught: true, summary: 'Caught. The guards throw you out on the quay, and the night clerk writes you a fine.' });
    }
    // Is this point in a guard's lantern light? (A cone in front of him, blocked by walls, desks and crates.)
    function lit(px, py) {
      for (const g of guards) {
        const flick = 0.92 + Math.sin(t * 13 + g.x) * 0.05 + Math.sin(t * 31 + g.y) * 0.03;
        const reach = 105 * flick, dx = px - g.x, dy = py - g.y, d = Math.hypot(dx, dy);
        if (d > reach) continue;
        let a = Math.atan2(dy, dx) - g.dir; a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) > 0.5 && d > 22) continue;
        let blocked = false;
        for (let s = 8; s < d; s += 6) { if (solid(at(g.x + dx * s / d, g.y + dy * s / d))) { blocked = true; break; } }
        if (!blocked) return g;
      }
      return null;
    }
    function update(dt) {
      if (over) return;
      t += dt; if (noiseRing) { noiseRing.r += 220 * dt; if (noiseRing.r > noiseRing.max) noiseRing = null; }
      const creep = api.keys.has('ShiftLeft') || api.keys.has('ShiftRight');
      const sp = creep ? 60 : 110;
      let vx = 0, vy = 0;
      if (api.keys.has('KeyA') || api.keys.has('ArrowLeft')) vx -= 1;
      if (api.keys.has('KeyD') || api.keys.has('ArrowRight')) vx += 1;
      if (api.keys.has('KeyW') || api.keys.has('ArrowUp')) vy -= 1;
      if (api.keys.has('KeyS') || api.keys.has('ArrowDown')) vy += 1;
      const len = Math.hypot(vx, vy) || 1;
      const before = at(me.x, me.y);
      for (const [ax, ay] of [[vx, 0], [0, vy]]) {
        const nx = me.x + ax / len * sp * dt, ny = me.y + ay / len * sp * dt;
        if (![[-1, -1], [1, -1], [-1, 1], [1, 1]].some(([sx, sy]) => solid(at(nx + sx * me.r * 0.8, ny + sy * me.r * 0.8)))) { me.x = nx; me.y = ny; }
      }
      const now = at(me.x, me.y);
      if ((now === 'p' || now === 'b') && now !== before && (vx || vy)) heard(me.x, me.y, now === 'b' ? 200 : (creep ? 60 : 130));
      // A thrown coin: lands ahead of you, rings, and the nearest guard goes to look.
      if (api.pressed.has('KeyC') && coins > 0 && !coinFly) {
        coins--;
        const tx = me.x + (vx || 0) * 140 || me.x, ty = me.y + (vy || -1) * 140;
        coinFly = { x: me.x, y: me.y, tx, ty, t: 0 };
      }
      if (coinFly) {
        coinFly.t += dt * 2.2;
        coinFly.x = me.x + (coinFly.tx - me.x) * Math.min(1, coinFly.t); coinFly.y = me.y + (coinFly.ty - me.y) * Math.min(1, coinFly.t);
        if (coinFly.t >= 1 || solid(at(coinFly.x, coinFly.y))) {
          const near = guards.slice().sort((a, b) => Math.hypot(a.x - coinFly.x, a.y - coinFly.y) - Math.hypot(b.x - coinFly.x, b.y - coinFly.y))[0];
          near.look = { x: coinFly.x, y: coinFly.y }; near.wait = 4; noiseRing = { x: coinFly.x, y: coinFly.y, r: 0, max: 70 };
          coinFly = null;
        }
      }
      // Guards: walk the round, or go and look at a noise, then go back.
      for (const g of guards) {
        let target = g.look || g.route[g.i];
        const dx = target.x - g.x, dy = target.y - g.y, d = Math.hypot(dx, dy);
        const want = Math.atan2(dy, dx);
        if (d > 3) {
          let a = want - g.dir; a = Math.atan2(Math.sin(a), Math.cos(a)); g.dir += a * Math.min(1, dt * 5);
          const step = Math.min(d, g.speed * dt * (g.look ? 1.3 : 1));
          const nx = g.x + dx / d * step, ny = g.y + dy / d * step;
          if (!solid(at(nx, ny))) { g.x = nx; g.y = ny; } else if (g.look) g.look = null;
        } else if (g.look) {
          g.wait -= dt; g.dir += Math.sin(t * 2 + g.x) * dt * 2;    // looks around
          if (g.wait <= 0) g.look = null;
        } else g.i = (g.i + 1) % g.route.length;
      }
      const seenBy = t > 1.5 && lit(me.x, me.y);      // a moment to get your bearings at the door
      if (seenBy) { caught = true; msg = 'Seen!'; end(false); return; }
      // The seal.
      const atSeal = Math.hypot(me.x - seal.x, me.y - seal.y) < T * 1.3;
      if (!hasSeal && atSeal && api.keys.has('Space')) { pressing += dt; if (pressing > 1.6) { hasSeal = true; msg = 'Sealed. Now get out.'; } }
      else if (!hasSeal) pressing = Math.max(0, pressing - dt);
      if (hasSeal && Math.hypot(me.x - door.x, me.y - door.y) < T) end(true);
      msg = hasSeal ? 'Sealed. Get back to the door.' : atSeal ? 'Hold Space to press the seal' : msg === 'Seen!' ? msg : '';
    }
    function draw(g) {
      g.fillStyle = '#0c0b10'; g.fillRect(0, 0, W, H);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const ch = MAP[r][c], x = OX + c * T, y = OY + r * T;
        g.fillStyle = ch === '#' ? '#2a2630' : '#3a332c'; g.fillRect(x, y, T, T);
        if (ch !== '#') { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1); }
        if (ch === 'D') { g.fillStyle = '#5a3e26'; g.fillRect(x + 2, y + 4, T - 4, T - 8); }
        if (ch === 'B') { g.fillStyle = '#7a5a34'; g.fillRect(x + 3, y + 3, T - 6, T - 6); g.strokeStyle = '#4a321c'; g.strokeRect(x + 3, y + 3, T - 6, T - 6); }
        if (ch === 'p') { g.fillStyle = '#d8d0b8'; g.fillRect(x + 8, y + 10, 12, 8); g.fillRect(x + 14, y + 16, 10, 7); }
        if (ch === 'b') { g.fillStyle = '#4a8a5a'; g.beginPath(); g.arc(x + 16, y + 16, 4, 0, Math.PI * 2); g.fill(); }
        if (ch === 'S') { g.fillStyle = '#6a2a1a'; g.fillRect(x + 1, y + 3, T - 2, T - 6); g.fillStyle = COLORS.gold; g.beginPath(); g.arc(x + 16, y + 16, 5, 0, Math.PI * 2); g.fill(); }
        if (ch === 'E') { g.fillStyle = '#7a5a2a'; g.fillRect(x + 4, y + 4, T - 8, T - 8); }
      }
      // Lantern light.
      for (const gd of guards) {
        const flick = 0.92 + Math.sin(t * 13 + gd.x) * 0.05 + Math.sin(t * 31 + gd.y) * 0.03;
        const grad = g.createRadialGradient(gd.x, gd.y, 4, gd.x, gd.y, 105 * flick);
        grad.addColorStop(0, 'rgba(255,214,140,0.45)'); grad.addColorStop(1, 'rgba(255,214,140,0)');
        g.fillStyle = grad;
        g.beginPath(); g.moveTo(gd.x, gd.y);
        for (let a = -0.5; a <= 0.5; a += 0.05) {
          let d = 4; while (d < 105 * flick && !solid(at(gd.x + Math.cos(gd.dir + a) * d, gd.y + Math.sin(gd.dir + a) * d))) d += 4;
          g.lineTo(gd.x + Math.cos(gd.dir + a) * d, gd.y + Math.sin(gd.dir + a) * d);
        }
        g.closePath(); g.fill();
        g.fillStyle = gd.look ? '#e05a4a' : '#2f4f78'; g.beginPath(); g.arc(gd.x, gd.y, 10, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffd38a'; g.beginPath(); g.arc(gd.x + Math.cos(gd.dir) * 12, gd.y + Math.sin(gd.dir) * 12, 3, 0, Math.PI * 2); g.fill();
      }
      if (noiseRing) { g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - noiseRing.r / noiseRing.max)})`; g.beginPath(); g.arc(noiseRing.x, noiseRing.y, noiseRing.r, 0, Math.PI * 2); g.stroke(); }
      if (coinFly) { g.fillStyle = COLORS.gold; g.beginPath(); g.arc(coinFly.x, coinFly.y, 3, 0, Math.PI * 2); g.fill(); }
      // You.
      g.fillStyle = '#1a1420'; g.beginPath(); g.arc(me.x, me.y, me.r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#b77cff'; g.lineWidth = 2; g.stroke(); g.lineWidth = 1;
      if (pressing > 0 && !hasSeal) { g.strokeStyle = COLORS.gold; g.lineWidth = 4; g.beginPath(); g.arc(seal.x, seal.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pressing / 1.6); g.stroke(); g.lineWidth = 1; }
      hud(g, [`Coins to throw: ${coins} (C)`, hasSeal ? 'Seal: pressed' : 'Seal: not yet', msg]);
    }
    return { update, draw };
  },
};
