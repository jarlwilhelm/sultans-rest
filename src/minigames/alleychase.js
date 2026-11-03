// Alley Chase (maze chase): a pickpocket with a bounty on him bolts through the alleys of the
// poor quarter. Catch him. Pick up the coins he drops on the way. Three street toughs are
// after YOU; a guard's whistle sends them running for a few seconds, and then you can catch
// them too. Catch the pickpocket to finish the round; the next one is faster.
import { W, H, COLORS, hud, person } from './common.js';

const MAZE = [
  '#####################',
  '#o.......#.#.......o#',
  '#.##.###.#.#.###.##.#',
  '#...................#',
  '#.##.#.###.###.#.##.#',
  '#....#...#.#...#....#',
  '####.###-----###.####',
  '####.#.........#.####',
  '#.........#.........#',
  '#.##.####.#.####.##.#',
  '#o.#.............#.o#',
  '#.....#.#####.#.....#',
  '#####################',
];
const CW = 40, X0 = (W - MAZE[0].length * CW) / 2, Y0 = 80;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const open = (x, y) => y >= 0 && y < MAZE.length && x >= 0 && x < MAZE[0].length && MAZE[y][x] !== '#';

export const alleyChase = {
  title: 'Alley Chase',
  how: [
    'A pickpocket with a bounty on his head runs through the alleys. Catch him.',
    'Arrow keys or WASD to run. Grab his dropped coins on the way.',
    'Three toughs are after you. A guard\'s whistle (the bright ones in the corners) sends them running: catch them for a bonus.',
  ],
  create(api) {
    let round = 0, lives = 3, score = 0, coins, toughs, thief, me, scare = 0, over = false, t = 0, msg = '', msgT = 0, caught = 0;
    const mk = (x, y, speed, extra = {}) => ({ x, y, dir: [0, 0], t: 0, speed, ...extra });

    function newRound() {
      round++;
      coins = new Set();
      MAZE.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.' || ch === 'o') coins.add(`${x},${y}`); }));
      reset();
      msg = round === 1 ? 'There he goes!' : `Round ${round}: another bounty, faster legs.`; msgT = 2;
    }
    function reset() {
      me = mk(10, 10, 5.4);
      thief = mk(10, 3, 4.1 + round * 0.2, { pause: 0 });
      toughs = [mk(9, 6, 4.3 + round * 0.25, { color: '#7a2a1c', home: [9, 6], mode: 'chase' }),
                mk(10, 6, 4.1 + round * 0.25, { color: '#3a5a2a', home: [10, 6], mode: 'ahead', wait: 2 }),
                mk(11, 6, 3.9 + round * 0.25, { color: '#4a3a6a', home: [11, 6], mode: 'wander', wait: 4 })];
      scare = 0;
    }
    newRound();

    const pos = (e) => [e.x + e.dir[0] * e.t, e.y + e.dir[1] * e.t];
    const dist = (a, b) => { const [ax, ay] = pos(a), [bx, by] = pos(b); return Math.hypot(ax - bx, ay - by); };

    // Choose a direction at a crossing: the open way (not back) that gets closest to (or furthest from) a target.
    function choose(e, tx, ty, away = false) {
      const back = [-e.dir[0], -e.dir[1]];
      let best = null, bestD = away ? -1 : 1e9;
      const opts = DIRS.filter(d => open(e.x + d[0], e.y + d[1]) && !(d[0] === back[0] && d[1] === back[1]));
      for (const d of (opts.length ? opts : [back])) {
        const dd = Math.hypot(e.x + d[0] - tx, e.y + d[1] - ty) + Math.random() * 0.3;
        if (away ? dd > bestD : dd < bestD) { bestD = dd; best = d; }
      }
      return best;
    }
    function step(e, dt, decide) {
      if (!e.dir[0] && !e.dir[1]) { e.dir = decide() || [0, 0]; if (!open(e.x + e.dir[0], e.y + e.dir[1])) e.dir = [0, 0]; return; }
      e.t += e.speed * dt;
      while (e.t >= 1) {
        e.t -= 1; e.x += e.dir[0]; e.y += e.dir[1];
        const d = decide();
        if (d && open(e.x + d[0], e.y + d[1])) e.dir = d;
        else if (!open(e.x + e.dir[0], e.y + e.dir[1])) { e.dir = [0, 0]; e.t = 0; break; }
      }
    }

    function finish() {
      over = true;
      api.finish({ score, caught, gold: Math.floor(score / 25), renown: caught * 6 + Math.floor(score / 400), rep: { adventurers: caught * 2 },
        summary: caught ? `You caught ${caught} pickpocket${caught === 1 ? '' : 's'}. The guild pays the bounty.` : 'He got away this time.' });
    }

    function update(dt) {
      if (over) return;
      t += dt; msgT -= dt; scare -= dt;
      // You: turn when the way is open; turning around is instant.
      const k = api.keys;
      const want = k.has('ArrowUp') || k.has('KeyW') ? [0, -1] : k.has('ArrowDown') || k.has('KeyS') ? [0, 1] : k.has('ArrowLeft') || k.has('KeyA') ? [-1, 0] : k.has('ArrowRight') || k.has('KeyD') ? [1, 0] : null;
      if (want) me.want = want;
      if (me.want && me.want[0] === -me.dir[0] && me.want[1] === -me.dir[1] && (me.dir[0] || me.dir[1])) {
        me.x += me.dir[0]; me.y += me.dir[1]; me.t = 1 - me.t; me.dir = me.want;
      }
      step(me, dt, () => (me.want && open(me.x + me.want[0], me.y + me.want[1])) ? me.want : me.dir);
      const here = `${me.x},${me.y}`;
      if (coins.has(here)) {
        if (MAZE[me.y][me.x] === 'o') { scare = 7; msg = 'Whistle! The toughs scatter.'; msgT = 1.5; score += 50; } else score += 10;
        coins.delete(here);
      }
      // The pickpocket keeps away from you, stopping now and then to lift a purse.
      if (thief.pause > 0) thief.pause -= dt;
      else {
        step(thief, dt, () => choose(thief, me.x, me.y, true));
        if (Math.random() < dt * 0.15) thief.pause = 0.7;
      }
      // The toughs: one heads straight for you, one cuts you off, one wanders until close.
      for (const tg of toughs) {
        if (tg.wait > 0) { tg.wait -= dt; continue; }
        const scared = scare > 0 && !tg.eaten;
        tg.speed = tg.eaten ? 7 : scared ? 2.8 : 4.3 + round * 0.25;
        let tx = me.x, ty = me.y;
        if (tg.eaten) [tx, ty] = tg.home;
        else if (tg.mode === 'ahead') { tx = me.x + me.dir[0] * 4; ty = me.y + me.dir[1] * 4; }
        else if (tg.mode === 'wander' && dist(tg, me) > 6) { tx = (Math.sin(t * 0.3) > 0 ? 2 : 18); ty = (Math.cos(t * 0.23) > 0 ? 2 : 10); }
        step(tg, dt, () => choose(tg, tx, ty, scared));
        if (tg.eaten && tg.x === tg.home[0] && tg.y === tg.home[1]) tg.eaten = false;
        if (dist(tg, me) < 0.6 && !tg.eaten) {
          if (scared) { tg.eaten = true; score += 200; msg = 'Tough sent packing! +200'; msgT = 1.2; }
          else {
            lives--; msg = lives > 0 ? 'Jumped by a tough! You lost a try.' : 'Jumped by a tough!'; msgT = 1.6;
            if (lives <= 0) return finish();
            reset(); return;
          }
        }
      }
      if (dist(thief, me) < 0.7) {
        caught++; score += 500 + round * 100;
        msg = `Caught him! +${500 + round * 100}`; msgT = 2;
        newRound();
      }
    }

    function draw(g) {
      g.fillStyle = '#2a1d12'; g.fillRect(0, 0, W, H);
      MAZE.forEach((row, y) => [...row].forEach((ch, x) => {
        const px = X0 + x * CW, py = Y0 + y * CW;
        if (ch === '#') {
          g.fillStyle = (x + y) % 2 ? '#a88a5e' : '#b99a6c'; g.fillRect(px, py, CW, CW);
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(px, py + CW - 6, CW, 6);
        } else {
          g.fillStyle = ch === '-' ? '#5a4632' : '#d8c49a'; g.fillRect(px, py, CW, CW);
        }
      }));
      for (const c of coins) {
        const [x, y] = c.split(',').map(Number);
        const px = X0 + x * CW + CW / 2, py = Y0 + y * CW + CW / 2;
        if (MAZE[y][x] === 'o') { g.fillStyle = `rgba(255,240,180,${0.6 + 0.4 * Math.sin(t * 6)})`; g.beginPath(); g.arc(px, py, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c0c0c8'; g.fillRect(px - 6, py - 2, 12, 4); }
        else { g.fillStyle = COLORS.gold; g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill(); }
      }
      const draw1 = (e, body, head, r = 14) => { const [x, y] = pos(e); person(g, X0 + x * CW + CW / 2, Y0 + y * CW + CW / 2, r, body, head); };
      draw1(thief, '#3a3a3a', '#c68642', 13);
      const [tx, ty] = pos(thief); g.fillStyle = COLORS.gold; g.font = 'bold 12px Cinzel, serif'; g.textAlign = 'center'; g.fillText('THIEF', X0 + tx * CW + CW / 2, Y0 + ty * CW - 2);
      for (const tg of toughs) draw1(tg, tg.eaten ? 'rgba(200,200,200,0.3)' : scare > 0 ? (scare < 2 && Math.floor(t * 8) % 2 ? '#f0f0f0' : '#5a7aa8') : tg.color, '#6b8a4a', 15);
      draw1(me, '#4b1f6b', '#e0ac69', 15);
      hud(g, [`Round ${round}`, `Score ${score}`, `Tries ${'♦'.repeat(Math.max(0, lives))}`, `Caught ${caught}`, scare > 0 ? `Whistle ${Math.ceil(scare)}` : '']);
      if (msgT > 0) { g.fillStyle = COLORS.shade; g.fillRect(W / 2 - 250, H - 44, 500, 36); g.fillStyle = COLORS.cream; g.font = 'bold 18px Cinzel, serif'; g.textAlign = 'center'; g.fillText(msg, W / 2, H - 20); }
    }
    return { update, draw };
  },
};
