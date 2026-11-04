// The shell game with Quick Nadim on an upturned crate (Sultan's Rest, pin 12). Three cups, one pea, the cups
// swap faster every round; click the cup with the pea. One wrong guess ends it. He plays it straight: no palming.
// Numbers are DRAFT (Claude's).
import { W, H, COLORS, hud } from './common.js';

const ROUNDS = 6;
export const shellGame = {
  title: 'The Shell Game',
  how: [
    'Quick Nadim shows you the pea, covers it, and moves the cups. Faster every round.',
    'Click the cup with the pea under it (or press 1, 2 or 3). One wrong guess ends the game.',
    'Six rounds. The longer your streak, the more he pays, very unhappily.',
  ],
  create(api) {
    const X = [W / 2 - 220, W / 2, W / 2 + 220], Y = 360;
    // cups[i] = which slot cup i is in; the pea is under cup `pea`.
    let cups = [0, 1, 2], pea = 1, round = 1, streak = 0, over = false;
    let phase = 'show', t = 1.4, swaps = [], swap = null, lift = -1, msg = 'Watch the pea.';
    function plan() {
      swaps = [];
      const n = 3 + round * 2;
      for (let i = 0; i < n; i++) { const a = Math.floor(Math.random() * 3); let b = Math.floor(Math.random() * 2); if (b >= a) b++; swaps.push([a, b]); }
    }
    plan();
    const speed = () => 0.55 - round * 0.06;           // seconds per swap
    const cupAt = (slot) => cups.indexOf(slot);
    function update(dt) {
      if (over) return;
      t -= dt;
      if (phase === 'show' && t <= 0) { phase = 'mix'; msg = 'Round ' + round + '...'; }
      else if (phase === 'mix') {
        if (!swap && swaps.length) { const [a, b] = swaps.shift(); swap = { a, b, k: 0 }; }
        if (swap) {
          swap.k += dt / speed();
          if (swap.k >= 1) { const ca = cupAt(swap.a), cb = cupAt(swap.b); cups[ca] = swap.b; cups[cb] = swap.a; swap = null; }
        } else { phase = 'guess'; msg = 'Which cup?'; }
      } else if (phase === 'guess') {
        let slot = -1;
        for (const [k, s] of [['Digit1', 0], ['Digit2', 1], ['Digit3', 2]]) if (api.pressed.has(k)) slot = s;
        if (api.mouse.clicked) X.forEach((x, s) => { if (Math.abs(api.mouse.x - x) < 80 && Math.abs(api.mouse.y - Y) < 110) slot = s; });
        if (slot >= 0) {
          lift = cupAt(slot);
          const right = lift === pea;
          if (right) { streak++; msg = streak === ROUNDS ? 'Every one! Nadim looks ill.' : pickLine(['"Lucky."', '"Again. Faster."', 'He narrows his eyes.']); }
          else msg = '"Ah, so close. It was this one." He lifts the right cup.';
          phase = right ? 'won' : 'lost'; t = 1.6;
        }
      } else if ((phase === 'won' || phase === 'lost') && t <= 0) {
        if (phase === 'lost' || streak === ROUNDS) {
          over = true;
          return api.finish({ score: streak, gold: streak * 4 + (streak === ROUNDS ? 4 : 0), renown: 2 + streak * 2,
            summary: streak === ROUNDS ? 'Six in a row. Nadim packs up his cups and says he\'s done for the day.'
              : streak ? `A streak of ${streak}. Nadim counts out your winnings as slowly as he can.` : '"The eye is slower than the hand, friend." Nothing for you this time.' });
        }
        round++; lift = -1; phase = 'show'; t = 1.0; msg = 'Watch the pea.'; plan();
      }
    }
    function draw(g) {
      g.fillStyle = COLORS.sand; g.fillRect(0, 0, W, H);
      g.fillStyle = '#7a5838'; g.fillRect(W / 2 - 360, Y - 20, 720, 120);           // the crate
      g.fillStyle = '#5a3f26'; g.fillRect(W / 2 - 360, Y + 96, 720, 10);
      const peaVisible = phase === 'show' || phase === 'won' || phase === 'lost';
      for (let i = 0; i < 3; i++) {
        let x = X[cups[i]], y = Y;
        if (swap && (cups[i] === swap.a || cups[i] === swap.b)) {
          const from = X[cups[i]], to = X[cups[i] === swap.a ? swap.b : swap.a], k = ease(swap.k);
          x = from + (to - from) * k; y = Y + Math.sin(k * Math.PI) * (cups[i] === swap.a ? -40 : 40);
        }
        const up = (phase === 'show' && i === pea) || (i === lift) || ((phase === 'lost') && i === pea) ? 70 : 0;
        if (i === pea && peaVisible && (up || phase === 'show')) { g.fillStyle = '#e8e0d0'; g.beginPath(); g.arc(x, Y + 50, 12, 0, Math.PI * 2); g.fill(); }
        cup(g, x, y - up);
      }
      g.font = 'bold 22px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.fillStyle = COLORS.ink;
      X.forEach((x, s) => g.fillText(String(s + 1), x, Y + 150));
      hud(g, [`Round ${Math.min(round, ROUNDS)} of ${ROUNDS}`, `Streak ${streak}`, 'Click a cup, or 1 · 2 · 3']);
      g.font = '26px "IM Fell English", Georgia, serif'; g.textAlign = 'center'; g.fillStyle = COLORS.ink; g.fillText(msg, W / 2, 140);
    }
    return { update, draw };
  },
};
function cup(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(x + 4, Y_SHADOW(y), 60, 14, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#b07a4a'; g.beginPath(); g.moveTo(x - 58, y + 60); g.lineTo(x - 38, y - 40); g.lineTo(x + 38, y - 40); g.lineTo(x + 58, y + 60); g.closePath(); g.fill();
  g.fillStyle = '#8a5a34'; g.fillRect(x - 60, y + 52, 120, 12);
  g.fillStyle = '#c8924a'; g.beginPath(); g.ellipse(x, y - 40, 38, 9, 0, 0, Math.PI * 2); g.fill();
}
const Y_SHADOW = (y) => y + 66;
const ease = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
function pickLine(list) { return list[Math.floor(Math.random() * list.length)]; }
