// Arm wrestling with Big Tova on a barrel outside the Salted Kraken (Sultan's Rest, pin 8). Best of three.
// Pump A and D in turn to push; Tova surges (you see it coming: brace with Space just as she does) and tires.
// Numbers are DRAFT (Claude's), tuned to be winnable but not free.
import { W, H, COLORS, hud } from './common.js';

export const armWrestle = {
  title: 'Arm Wrestling',
  how: [
    'Big Tova has never lost on this barrel. Best of three.',
    'Press A and D in turn, fast, to push. Pressing the same key twice does nothing.',
    'When she grits her teeth, she\'s about to surge: press Space right then to brace. When she sags, push hard.',
  ],
  create(api) {
    let round = 1, wins = 0, losses = 0, over = false, pause = 1.4, banner = 'Round 1';
    let pos, power, lastKey, foe, surge, tired, braced, shake;
    const reset = () => { pos = 0; power = 0; lastKey = null; foe = { t: 1.2 + Math.random() }; surge = 0; tired = 0; braced = 0; shake = 0; };
    reset();
    const base = () => 0.42 + round * 0.06;
    function update(dt) {
      if (over) return;
      if (pause > 0) { pause -= dt; if (pause <= 0) banner = ''; return; }
      // You: alternate A / D.
      for (const k of ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight']) if (api.pressed.has(k)) {
        const side = k === 'KeyA' || k === 'ArrowLeft' ? 'L' : 'R';
        if (side !== lastKey) { power = Math.min(1.2, power + 0.11); lastKey = side; }
      }
      power -= power * dt * 1.5;          // settles at about 0.07 x presses a second (8 a second ~ 0.6)
      // Tova: a steady push, a warning, then a surge; after a surge she tires for a moment.
      foe.t -= dt;
      if (surge === 0 && tired <= 0 && foe.t <= 0) { surge = -0.7; }              // the warning (teeth gritted)
      if (surge < 0) { surge += dt; if (surge >= 0) { surge = 0.9; } }
      else if (surge > 0) { surge -= dt; if (surge <= 0) { surge = 0; tired = 1.1; foe.t = 1.6 + Math.random() * 2; braced = 0; } }
      if (tired > 0) tired -= dt;
      if (api.pressed.has('Space')) {
        if (surge < 0 && surge > -0.35 || surge > 0.7) braced = 1;     // right as she surges
        else power = Math.max(0, power - 0.25);                         // braced at nothing: you lose your rhythm
      }
      let her = base();
      if (surge > 0) her *= braced ? 1.15 : 1.9;
      if (tired > 0) her *= 0.45;
      pos += (power - her) * dt * 1.4;
      shake = surge > 0 ? 3 : surge < 0 ? 1.5 : 0;
      if (pos >= 1 || pos <= -1) {
        const won = pos >= 1;
        if (won) wins++; else losses++;
        banner = won ? 'Down she goes!' : 'Your knuckles hit the barrel.';
        if (wins === 2 || losses === 2) {
          over = true;
          const champ = wins === 2;
          api.finish({ score: wins, won: champ, gold: champ ? 18 : wins * 5, renown: champ ? 14 : 4,
            summary: champ ? 'The whole quay heard the barrel thump. Tova laughs, rubs her arm and buys you a drink. "Again tomorrow. I wasn\'t warm."'
              : 'Tova pins you and grins. "Strong arms, slow head. Watch my teeth."' });
        } else { round++; reset(); pause = 1.6; setTimeout(() => { if (!over) banner = `Round ${round}`; }, 900); }
      }
    }
    function draw(g) {
      g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, W, H);
      const glow = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 520); glow.addColorStop(0, 'rgba(255,190,110,0.35)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
      // The barrel top.
      g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse(W / 2, 400, 260, 90, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#4a3020'; g.lineWidth = 8; g.stroke();
      // The two arms meeting over the barrel: the hands lean toward whoever is losing.
      const ang = -pos * 1.1 + (Math.random() - 0.5) * shake * 0.02;
      const hx = W / 2 + Math.sin(ang) * 160, hy = 400 - Math.cos(ang) * 160;
      g.lineCap = 'round';
      // Each arm: shoulder off the edge, elbow on the barrel, forearm up to the clasped hands.
      g.strokeStyle = '#7d8f5c'; g.lineWidth = 50; g.beginPath(); g.moveTo(W / 2 + 330, 470); g.lineTo(W / 2 + 60, 405); g.lineTo(hx + 8, hy); g.stroke();   // Tova (right)
      g.strokeStyle = '#c68642'; g.lineWidth = 40; g.beginPath(); g.moveTo(W / 2 - 330, 470); g.lineTo(W / 2 - 60, 405); g.lineTo(hx - 8, hy); g.stroke();   // you (left)
      g.fillStyle = '#5f7046'; g.beginPath(); g.arc(hx + 10, hy - 4, 28, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#b77a44'; g.beginPath(); g.arc(hx - 8, hy + 2, 24, 0, Math.PI * 2); g.fill();
      g.lineWidth = 1;
      // Tova's face: teeth when she's about to surge, sweat when she's tired.
      const fx = W - 170, fy = 190;
      g.fillStyle = '#7d8f5c'; g.beginPath(); g.arc(fx, fy, 60, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1410'; g.fillRect(fx - 26, fy - 14, 12, 8); g.fillRect(fx + 14, fy - 14, 12, 8);
      if (surge < 0) { g.fillStyle = '#f3ede0'; g.fillRect(fx - 24, fy + 18, 48, 14); g.strokeStyle = '#1a1410'; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(fx - 24 + i * 8, fy + 18); g.lineTo(fx - 24 + i * 8, fy + 32); g.stroke(); } }
      else if (tired > 0) { g.strokeStyle = '#1a1410'; g.lineWidth = 3; g.beginPath(); g.arc(fx, fy + 34, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.fillStyle = '#9ad0ff'; g.beginPath(); g.arc(fx + 40, fy - 30, 7, 0, Math.PI * 2); g.fill(); }
      else { g.fillStyle = '#1a1410'; g.fillRect(fx - 18, fy + 24, 36, 5); }
      g.lineWidth = 1;
      g.fillStyle = COLORS.cream; g.font = 'bold 18px Cinzel, Georgia, serif'; g.textAlign = 'center';
      g.fillText(surge < 0 ? 'She grits her teeth!' : surge > 0 ? (braced ? 'Braced!' : 'SURGE!') : tired > 0 ? 'She sags. Push!' : 'Big Tova', fx, fy + 96);
      // The balance bar and your strength.
      g.fillStyle = '#000a'; g.fillRect(W / 2 - 300, 560, 600, 22);
      g.fillStyle = COLORS.gold; g.fillRect(W / 2, 562, pos * 298, 18);
      g.fillStyle = COLORS.cream; g.fillRect(W / 2 - 2, 556, 4, 30);
      g.font = '16px Cinzel, Georgia, serif'; g.textAlign = 'left'; g.fillText('You win this way →', W / 2 + 40, 610);
      g.fillStyle = '#000a'; g.fillRect(40, 300, 24, 200); g.fillStyle = '#9ad0ff'; g.fillRect(42, 498 - Math.min(1.2, power) / 1.2 * 196, 20, Math.min(1.2, power) / 1.2 * 196);
      g.fillStyle = COLORS.cream; g.fillText('Push', 30, 525);
      hud(g, [`Round ${round}`, `You ${wins} · Tova ${losses}`, 'A / D in turn · Space to brace']);
      if (banner) { g.fillStyle = COLORS.gold; g.font = 'bold 48px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.fillText(banner, W / 2, 120); }
    }
    return { update, draw };
  },
};
