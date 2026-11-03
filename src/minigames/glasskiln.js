// Glass Kiln (bounce-and-break): the Transmuters' trial. A spark of transmutation bounces off
// your tongs; each sand block it touches turns to glass, and glass it touches again shatters.
// Clear the wall. Dark iron needs three hits. Shattered blocks sometimes drop power-ups (gold ones always do).
import { W, H, COLORS, hud } from './common.js';

const COLS = 12, BW = 68, BH = 26, GX = (W - COLS * BW) / 2, GY = 90;

// Power-ups that fall from shattered blocks; catch them with the tongs. (Gold blocks always drop G.)
const POWERS = {
  wide: { letter: 'G', color: '#e7c35a', name: 'Wide tongs' },
  multi: { letter: '✦', color: '#6ab8ff', name: 'Split spark' },
  slow: { letter: 'S', color: '#7dd88a', name: 'Slow spark' },
  fire: { letter: 'F', color: '#ff6a3a', name: 'Fire spark' },
  life: { letter: '+', color: '#f6efe2', name: 'Extra spark' },
};
const DROP = [['multi', 0.3], ['wide', 0.25], ['slow', 0.2], ['fire', 0.17], ['life', 0.08]];
const pickPower = () => { let r = Math.random(); for (const [k, p] of DROP) { if ((r -= p) <= 0) return k; } return 'multi'; };

export const glassKiln = {
  title: 'Glass Kiln',
  how: [
    'Keep the spark alive with your tongs and turn the whole wall to glass, then shatter it.',
    'Left and right (or the mouse) to move. Space to launch the spark.',
    'Sand turns to glass on the first touch and shatters on the second. Dark iron is stubborn.',
    'Shattered blocks sometimes drop a power-up: catch it! G wide tongs · ✦ split spark · S slow spark · F fire spark (burns through) · + extra spark.',
  ],
  create(api) {
    let level = 0, lives = 3, score = 0, blocks = [], paddle, balls = [], held = true, over = false, t = 0, sparks = [];
    let drops = [], wide = 0, slow = 0, fire = 0;
    function build() {
      level++;
      blocks = [];
      const rows = Math.min(8, 4 + level);
      for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
        if (level > 1 && (r + c + level) % 7 === 0) continue;      // gaps in later walls
        const kind = Math.random() < 0.06 ? 'gold' : (r === 0 && level > 1 && c % 3 === 1) ? 'iron' : 'sand';
        blocks.push({ x: GX + c * BW, y: GY + r * BH, hp: kind === 'iron' ? 3 : 2, kind });
      }
      reset();
    }
    function reset() {
      paddle = { x: W / 2, w: 120 };
      balls = [{ x: W / 2, y: H - 70, vx: 0, vy: 0, r: 8 }];
      held = true; drops = []; slow = 0; fire = 0;
    }
    build();

    function finish() {
      over = true;
      api.finish({ score, walls: level - 1, gold: Math.floor(score / 30), renown: (level - 1) * 5 + Math.floor(score / 300), rep: { transmuters: level - 1 },
        summary: level > 1 ? `You cleared ${level - 1} wall${level === 2 ? '' : 's'}. The Transmuters nod, impressed.` : 'The spark went out. The Transmuters say: practice.' });
    }
    function catchPower(kind) {
      score += 15;
      if (kind === 'wide') wide = 12;
      else if (kind === 'slow') slow = 10;
      else if (kind === 'fire') fire = 8;
      else if (kind === 'life') lives = Math.min(6, lives + 1);
      else if (kind === 'multi') {
        const extra = [];
        for (const b of balls) for (const turn of [-0.35, 0.35]) {
          if (balls.length + extra.length >= 6) break;
          const c = Math.cos(turn), sn = Math.sin(turn);
          extra.push({ ...b, vx: b.vx * c - b.vy * sn, vy: b.vx * sn + b.vy * c });
        }
        balls.push(...extra);
      }
      for (let i = 0; i < 12; i++) sparks.push({ x: paddle.x, y: H - 58, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260, t: 0.5, c: POWERS[kind].color });
    }

    function update(dt) {
      if (over) return;
      t += dt;
      if (wide > 0) wide -= dt;
      if (slow > 0) slow -= dt;
      if (fire > 0) fire -= dt;
      paddle.w += ((wide > 0 ? 190 : 120) - paddle.w) * Math.min(1, dt * 6);
      const k = api.keys;
      if (k.has('ArrowLeft') || k.has('KeyA')) paddle.x -= 640 * dt;
      if (k.has('ArrowRight') || k.has('KeyD')) paddle.x += 640 * dt;
      if (api.mouse.x && api.mouse.moved !== api.mouse.x) { paddle.x = api.mouse.x; api.mouse.moved = api.mouse.x; }
      paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));
      // Falling power-ups: caught by the tongs, or lost off the bottom.
      for (const d of drops) {
        d.y += 150 * dt;
        if (d.y > H - 66 && d.y < H - 40 && Math.abs(d.x - paddle.x) < paddle.w / 2 + 14) { d.caught = true; catchPower(d.kind); }
      }
      drops = drops.filter(d => !d.caught && d.y < H + 20);
      if (held) {
        const ball = balls[0];
        ball.x = paddle.x; ball.y = H - 70;
        if (api.pressed.has('Space') || api.mouse.clicked) { held = false; const sp = 380 + level * 30; ball.vx = (Math.random() - 0.5) * sp * 0.8; ball.vy = -sp; }
        return;
      }
      const speedK = slow > 0 ? 0.6 : 1;
      // Move in small steps so a fast spark can't skip through a block.
      const steps = 4;
      for (const ball of balls) for (let s = 0; s < steps; s++) {
        ball.x += ball.vx * speedK * dt / steps; ball.y += ball.vy * speedK * dt / steps;
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < 50 + ball.r) { ball.y = 50 + ball.r; ball.vy = Math.abs(ball.vy); }
        // Tongs: where it lands on them decides the angle.
        if (ball.vy > 0 && ball.y > H - 62 - ball.r && ball.y < H - 44 && Math.abs(ball.x - paddle.x) < paddle.w / 2 + ball.r) {
          const off = (ball.x - paddle.x) / (paddle.w / 2);
          const sp = Math.min(760, Math.hypot(ball.vx, ball.vy) * 1.015);
          const a = off * 1.05;
          ball.vx = Math.sin(a) * sp; ball.vy = -Math.cos(a) * sp;
        }
        for (const b of blocks) {
          if (b.hp <= 0) continue;
          if (ball.x + ball.r < b.x || ball.x - ball.r > b.x + BW || ball.y + ball.r < b.y || ball.y - ball.r > b.y + BH) continue;
          if (fire > 0) b.hp = 0;              // a fire spark burns straight through
          else {
            // Bounce off the side it came through.
            const ox = Math.min(ball.x + ball.r - b.x, b.x + BW - (ball.x - ball.r));
            const oy = Math.min(ball.y + ball.r - b.y, b.y + BH - (ball.y - ball.r));
            if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
            b.hp--;
          }
          score += b.hp <= 0 ? 25 : 10;
          if (b.hp <= 0 && (b.kind === 'gold' || Math.random() < 0.16)) drops.push({ x: b.x + BW / 2, y: b.y + BH / 2, kind: b.kind === 'gold' ? 'wide' : pickPower() });
          for (let i = 0; i < (b.hp <= 0 ? 10 : 4); i++) sparks.push({ x: b.x + BW / 2, y: b.y + BH / 2, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, t: 0.6, c: fire > 0 ? '#ff9a4a' : b.hp <= 0 ? '#bfefff' : '#ffe9a8' });
          break;
        }
      }
      for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt; s.t -= dt; }
      sparks = sparks.filter(s => s.t > 0);
      balls = balls.filter(b => b.y < H + 20);
      if (!balls.length) {
        lives--;
        if (lives <= 0) return finish();
        reset();
      }
      if (blocks.every(b => b.hp <= 0)) { score += 200 * level; build(); }
    }

    function draw(g) {
      // Inside the kiln: warm dark brick, a glowing mouth at the bottom.
      g.fillStyle = '#20130b'; g.fillRect(0, 0, W, H);
      const glow = g.createRadialGradient(W / 2, H + 60, 40, W / 2, H + 60, 520);
      glow.addColorStop(0, 'rgba(255,140,50,0.55)'); glow.addColorStop(1, 'rgba(255,140,50,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      for (const b of blocks) {
        if (b.hp <= 0) continue;
        let fill;
        if (b.kind === 'gold') fill = '#e7c35a';
        else if (b.kind === 'iron') fill = ['#000', '#5a5a62', '#45454c', '#34343a'][b.hp];
        else fill = b.hp === 2 ? '#d9bb84' : 'rgba(170,230,240,0.75)';
        g.fillStyle = fill; g.fillRect(b.x + 2, b.y + 2, BW - 4, BH - 4);
        if (b.kind === 'sand' && b.hp === 2) { g.fillStyle = 'rgba(120,80,30,0.25)'; for (let i = 0; i < 6; i++) g.fillRect(b.x + 6 + ((i * 17) % (BW - 12)), b.y + 6 + ((i * 7) % (BH - 12)), 2, 2); }
        if (b.kind === 'sand' && b.hp === 1) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x + 8, b.y + BH - 6); g.lineTo(b.x + 22, b.y + 6); g.stroke(); }
      }
      // Falling power-ups: glowing capsules with their letter.
      for (const d of drops) {
        const p = POWERS[d.kind];
        const halo = g.createRadialGradient(d.x, d.y, 2, d.x, d.y, 26);
        halo.addColorStop(0, p.color + 'aa'); halo.addColorStop(1, p.color + '00');
        g.fillStyle = halo; g.beginPath(); g.arc(d.x, d.y, 26, 0, Math.PI * 2); g.fill();
        g.fillStyle = p.color; g.beginPath(); g.roundRect(d.x - 18, d.y - 10, 36, 20, 10); g.fill();
        g.strokeStyle = 'rgba(30,15,5,0.6)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#20130b'; g.font = 'bold 15px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(p.letter, d.x, d.y + 1); g.textBaseline = 'alphabetic';
      }
      for (const s of sparks) { g.fillStyle = s.c; g.globalAlpha = Math.min(1, s.t * 2); g.fillRect(s.x, s.y, 3, 3); g.globalAlpha = 1; }
      // Your tongs.
      g.fillStyle = '#5a5a62'; g.fillRect(paddle.x - paddle.w / 2, H - 58, paddle.w, 12);
      g.fillStyle = wide > 0 ? COLORS.gold : '#8a8a92'; g.fillRect(paddle.x - paddle.w / 2, H - 58, paddle.w, 4);
      // The sparks: red-hot while they burn through, otherwise golden.
      for (const ball of balls) {
        const sg = g.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.r * 3);
        sg.addColorStop(0, '#fffbe6'); sg.addColorStop(0.3, fire > 0 ? '#ff6a3a' : slow > 0 ? '#9ff0a8' : '#ffd36a'); sg.addColorStop(1, 'rgba(255,160,40,0)');
        g.fillStyle = sg; g.beginPath(); g.arc(ball.x, ball.y, ball.r * 3, 0, Math.PI * 2); g.fill();
      }
      if (held) { g.fillStyle = COLORS.cream; g.font = '18px "IM Fell English", serif'; g.textAlign = 'center'; g.fillText('Space to launch the spark', W / 2, H - 100); }
      const active = [[wide, 'Wide'], [slow, 'Slow'], [fire, 'Fire']].filter(([v]) => v > 0).map(([v, n]) => `${n} ${Math.ceil(v)}s`);
      hud(g, [`Wall ${level}`, `Score ${score}`, `Sparks ${'✦'.repeat(Math.max(0, lives))}`, ...active]);
    }
    // (peek: for tests only)
    return { update, draw, peek: () => ({ balls, drops, paddle, lives, wide, slow, fire, blocks, score }), give: catchPower };
  },
};
