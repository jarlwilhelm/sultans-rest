// The Tallyman's standoff (Chapter Two): the one fight in the game, as an arcade face-off of our own (the
// user's idea), never in the 3D world. Side view, a warehouse floor, best of three rounds. Move, jab, kick,
// block, jump. The Tallyman is slow but heavy and blocks a lot; win and he talks.
// Controls and numbers: Claude's first version (DRAFT).
import { W, H, COLORS, hud } from './common.js';

const FLOOR = H - 120, GRAV = 1500;
export const standoff = {
  title: 'Standoff',
  how: [
    'The Tallyman won\'t talk until you put him on the floor. Best of three rounds.',
    'A / D to move, W to jump. J jabs (fast, light), K kicks (slow, heavy, reaches further), L blocks.',
    'Blocking takes most of a hit. He hits hard, and he gets angrier as he loses.',
  ],
  create(api) {
    const mk = (x, face, hp, col) => ({ x, y: FLOOR, vy: 0, face, hp, max: hp, col, act: null, t: 0, cool: 0, block: false, stun: 0, hitDone: false });
    let me, foe, round = 1, wins = 0, losses = 0, pause = 1.2, banner = 'Round 1', over = false, sparks = [];
    const reset = () => { me = mk(260, 1, 100, '#4b1f6b'); foe = mk(700, -1, 110, '#6a5040'); pause = 1.2; banner = `Round ${round}`; };
    reset();
    const MOVES = { jab: { wind: 0.08, hit: 0.08, rec: 0.16, reach: 70, dmg: 7 }, kick: { wind: 0.22, hit: 0.1, rec: 0.3, reach: 100, dmg: 15 }, slam: { wind: 0.45, hit: 0.12, rec: 0.45, reach: 85, dmg: 16 } };
    function start(f, name) { if (f.act || f.stun > 0 || f.cool > 0) return; f.act = name; f.t = 0; f.hitDone = false; f.block = false; }
    function step(f, other, dt) {
      f.cool -= dt; f.stun -= dt;
      f.vy += GRAV * dt; f.y += f.vy * dt; if (f.y > FLOOR) { f.y = FLOOR; f.vy = 0; }
      f.face = other.x > f.x ? 1 : -1;
      if (f.act) {
        const m = MOVES[f.act]; f.t += dt;
        if (!f.hitDone && f.t > m.wind && f.t < m.wind + m.hit && Math.abs(other.x - f.x) < m.reach && Math.abs(other.y - f.y) < 60) {
          f.hitDone = true;
          const dmg = other.block && Math.sign(f.x - other.x) === other.face ? Math.ceil(m.dmg * 0.2) : m.dmg;
          other.hp -= dmg; other.stun = other.block ? 0.1 : 0.25; other.x += f.face * (other.block ? 10 : 26);
          sparks.push({ x: (f.x + other.x) / 2, y: f.y - 70, t: 0.3, c: other.block ? '#9ad0ff' : '#ffd38a' });
        }
        if (f.t > m.wind + m.hit + m.rec) { f.act = null; f.cool = 0.05; }
      }
      f.x = Math.max(60, Math.min(W - 60, f.x));
    }
    function endRound(won) {
      if (won) wins++; else losses++;
      if (wins === 2 || losses === 2) {
        over = true;
        api.finish(wins === 2 ? { score: wins, won: true, gold: 0, renown: 30, summary: 'The Tallyman is on the floor, out of breath, and finally ready to talk.' }
          : { score: wins, won: false, gold: 0, renown: 5, summary: 'You end up on the floor among the crates. He doesn\'t finish it. "Come back when you can stand."' });
      } else { round++; reset(); }
    }
    let ai = 0;
    function update(dt) {
      if (over) return;
      for (const s of sparks) s.t -= dt; sparks = sparks.filter(s => s.t > 0);
      if (pause > 0) { pause -= dt; return; }
      banner = '';
      // You.
      if (me.stun <= 0 && !me.act) {
        me.block = api.keys.has('KeyL');
        const sp = me.block ? 90 : 230;
        if (api.keys.has('KeyA')) me.x -= sp * dt;
        if (api.keys.has('KeyD')) me.x += sp * dt;
        if (api.pressed.has('KeyW') && me.y >= FLOOR) me.vy = -620;
        if (api.pressed.has('KeyJ')) start(me, 'jab');
        if (api.pressed.has('KeyK')) start(me, 'kick');
      }
      // The Tallyman: closes in, blocks when you swing, slams when you're close; faster as he loses.
      const anger = 1 + (1 - foe.hp / foe.max) * 0.8;
      ai -= dt * anger;
      if (foe.stun <= 0 && !foe.act) {
        const d = Math.abs(me.x - foe.x);
        // He reads your swings sometimes, not always (and less as he tires).
        foe.block = !!me.act && d < 110 && Math.random() < 0.3 * (foe.hp / foe.max + 0.3);
        if (!foe.block && d > 80) foe.x += foe.face * 120 * anger * dt;
        if (ai <= 0 && d < 95 && !foe.block) { start(foe, Math.random() < 0.5 ? 'slam' : 'jab'); ai = 0.95 + Math.random() * 0.6; }
      }
      step(me, foe, dt); step(foe, me, dt);
      if (Math.abs(me.x - foe.x) < 50) { const push = (50 - Math.abs(me.x - foe.x)) / 2; me.x -= me.face * push; foe.x -= foe.face * push; }
      if (foe.hp <= 0) { banner = 'Down!'; pause = 1; endRound(true); }
      else if (me.hp <= 0) { banner = 'You\'re down.'; pause = 1; endRound(false); }
    }
    function fighter(g, f) {
      const x = f.x, y = f.y, s = f.face;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, FLOOR + 4, 34, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = f.col; g.fillRect(x - 16, y - 110, 32, 62);                   // body
      g.fillStyle = '#2a2420'; g.fillRect(x - 16, y - 48, 13, 48); g.fillRect(x + 3, y - 48, 13, 48);   // legs
      g.fillStyle = '#c68642'; g.beginPath(); g.arc(x, y - 124, 15, 0, Math.PI * 2); g.fill();     // head
      // Arms and legs by action.
      const m = f.act && MOVES[f.act], phase = m ? Math.min(1, f.t / (m.wind + m.hit)) : 0;
      g.strokeStyle = f.col; g.lineWidth = 10; g.lineCap = 'round';
      if (f.act === 'kick') { g.strokeStyle = '#2a2420'; g.beginPath(); g.moveTo(x, y - 48); g.lineTo(x + s * 90 * phase, y - 60 - 20 * phase); g.stroke(); }
      else if (f.act) { g.beginPath(); g.moveTo(x + s * 10, y - 100); g.lineTo(x + s * (20 + (f.act === 'slam' ? 60 : 50) * phase), y - 100 + (f.act === 'slam' ? -30 + 40 * phase : 0)); g.stroke(); }
      else if (f.block) { g.beginPath(); g.moveTo(x + s * 8, y - 100); g.lineTo(x + s * 24, y - 128); g.stroke(); }
      else { g.beginPath(); g.moveTo(x + s * 10, y - 100); g.lineTo(x + s * 26, y - 84); g.stroke(); }
      g.lineWidth = 1;
    }
    function draw(g) {
      g.fillStyle = '#1a1612'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2c241c'; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 160, 120, 120, FLOOR - 160);     // crates in the dark
      g.fillStyle = '#4a3a2a'; g.fillRect(0, FLOOR, W, H - FLOOR);
      const lamp = g.createRadialGradient(W / 2, 60, 10, W / 2, 200, 520); lamp.addColorStop(0, 'rgba(255,210,140,0.35)'); lamp.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lamp; g.fillRect(0, 0, W, H);
      fighter(g, foe); fighter(g, me);
      for (const s of sparks) { g.fillStyle = s.c; g.globalAlpha = s.t / 0.3; g.beginPath(); g.arc(s.x, s.y, 16 * (1 - s.t / 0.3) + 6, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
      // Health bars.
      const bar = (x, f, label, right) => { g.fillStyle = '#000a'; g.fillRect(x, 54, 360, 22); g.fillStyle = f.hp > f.max * 0.3 ? COLORS.gold : COLORS.red; const w = 356 * Math.max(0, f.hp) / f.max; g.fillRect(right ? x + 2 + 356 - w : x + 2, 56, w, 18); g.fillStyle = COLORS.cream; g.font = 'bold 16px Cinzel, Georgia, serif'; g.textAlign = right ? 'right' : 'left'; g.fillText(label, right ? x + 360 : x, 96); };
      bar(40, me, 'You', false); bar(W - 400, foe, 'The Tallyman', true);
      hud(g, [`Round ${round}`, `Rounds won ${wins} – ${losses}`, 'J jab · K kick · L block · W jump']);
      if (banner) { g.fillStyle = COLORS.gold; g.font = 'bold 56px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.fillText(banner, W / 2, H / 2 - 40); }
    }
    return { update, draw };
  },
};
