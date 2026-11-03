// Bones: a sailors' dice game on an upturned crate. Bet, both of you throw three bones (dice),
// you may re-throw any of yours once, then the best hand wins:
// three of a kind > a run (like 2-3-4) > a pair > the highest total. A tie gives the bets back.
// (Rules made up by Claude for Sultan's Rest.)
import { W, H, COLORS, hud } from './common.js';

const BETS = [5, 10, 25, 50];
const NAMES = ['Three of a kind', 'A run', 'A pair', 'High bones'];
function score(d) {
  const s = [...d].sort((a, b) => a - b);
  const sum = s[0] + s[1] + s[2];
  if (s[0] === s[2]) return [3, s[0] * 100 + sum];
  if (s[1] === s[0] + 1 && s[2] === s[1] + 1) return [2, s[2] * 100 + sum];
  if (s[0] === s[1] || s[1] === s[2]) return [1, s[1] * 100 + sum];
  return [0, sum];
}
const roll = () => 1 + Math.floor(Math.random() * 6);

export const bones = {
  title: 'Bones',
  ownEscape: true,
  how: [
    'Bet with the arrow keys (Left/Right), then Space to throw.',
    'Click your bones (or press 1, 2, 3) to pick which to throw again, then Space. Or Enter to keep what you have.',
    'Three of a kind beats a run (2-3-4), a run beats a pair, a pair beats high bones. Esc to leave the table.',
  ],
  create(api) {
    let purse = api.opts.gold ?? 50;
    const start = purse;
    const handsLeft = api.opts.handsLeft ?? 25, winRoom = api.opts.winRoom ?? 150;
    let stake = 0, bet = 1, phase = 'bet', mine = [1, 1, 1], theirs = [1, 1, 1], keep = [true, true, true];
    let rolling = 0, msg = 'Place your bet.', won = 0, rounds = 0, t = 0;
    const opp = ['a one-eyed sailor', 'a tiefling deckhand', 'an old dwarf bosun'][Math.floor(Math.random() * 3)];

    function finish() {
      api.finish({ score: won, hands: rounds, gold: purse - start, renown: won * 2, rep: { mariners: won > 2 ? 1 : 0 },
        summary: purse >= start ? `You leave the table ${purse - start} gold richer.` : `You leave the table ${start - purse} gold lighter.` });
    }
    function decide() {
      // The opponent throws again whatever doesn't help their hand.
      const [rank] = score(theirs);
      if (rank >= 2) return;
      if (rank === 1) { const pair = theirs.find((v, i) => theirs.indexOf(v) !== i); theirs = theirs.map(v => v === pair ? v : roll()); return; }
      const hi = Math.max(...theirs);
      theirs = theirs.map(v => v === hi && v >= 5 ? v : roll());
    }
    function settle() {
      const a = score(mine), b = score(theirs);
      // (The bet already left your purse when the bones were thrown.)
      if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) { purse += stake * 2; won++; msg = `${NAMES[3 - a[0]]}! You win ${stake} gold.`; }
      else if (a[0] === b[0] && a[1] === b[1]) { purse += stake; msg = 'A tie. Bets back.'; }
      else msg = `${NAMES[3 - b[0]]} for them. You lose ${stake} gold.`;
      phase = 'done';
    }

    function update(dt) {
      t += dt;
      if (rolling > 0) { rolling -= dt; if (rolling <= 0 && phase === 'throw2') { decide(); settle(); } return; }
      const k = api.pressed;
      // Leaving mid-round forfeits the bet on the crate (it's already out of your purse).
      if (k.has('Escape')) { finish(); return; }
      if (phase === 'bet') {
        if (k.has('ArrowLeft')) bet = Math.max(0, bet - 1);
        if (k.has('ArrowRight')) bet = Math.min(BETS.length - 1, bet + 1);
        while (bet > 0 && BETS[bet] > purse) bet--;
        if (purse < BETS[0]) { msg = 'Your purse is empty. Time to go (Esc).'; return; }
        if (rounds >= handsLeft) { msg = '"Enough bones for one day, friend." (Esc)'; return; }
        if (purse - start >= winRoom) { msg = 'The sailors push back their stools: "You\'ve cleaned us out for today." (Esc)'; return; }
        if (k.has('Space')) {
          stake = BETS[bet]; purse -= stake; rounds++;
          mine = mine.map(roll); theirs = theirs.map(roll); keep = [true, true, true];
          rolling = 0.6; phase = 'pick'; msg = 'Pick bones to throw again (click or 1-3), then Space. Enter keeps them all.';
        }
      } else if (phase === 'pick') {
        for (let i = 0; i < 3; i++) if (k.has('Digit' + (i + 1))) keep[i] = !keep[i];
        if (api.mouse.clicked) for (let i = 0; i < 3; i++) if (Math.hypot(api.mouse.x - (W / 2 - 120 + i * 120), api.mouse.y - 440) < 50) keep[i] = !keep[i];
        if (k.has('Enter')) keep = [true, true, true];
        if (k.has('Space') || k.has('Enter')) { mine = mine.map((v, i) => keep[i] ? v : roll()); rolling = keep.every(Boolean) ? 0.01 : 0.6; phase = 'throw2'; }
      } else if (phase === 'done') {
        if (k.has('Space')) { phase = 'bet'; msg = 'Another round? Place your bet. (Esc to leave)'; }
      }
    }

    function die(g, x, y, v, chosen) {
      g.save(); g.translate(x, y);
      if (rolling > 0 && (phase === 'pick' || chosen)) g.rotate(Math.sin(t * 40 + x) * 0.4);
      g.fillStyle = chosen ? '#d8cfbd' : '#f3ede0'; g.strokeStyle = chosen ? '#e7c35a' : '#5a4632'; g.lineWidth = chosen ? 5 : 3;
      g.beginPath(); g.roundRect(-38, -38, 76, 76, 12); g.fill(); g.stroke();
      const face = rolling > 0 && (phase === 'pick' || chosen) ? roll() : v;
      const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[face];
      g.fillStyle = '#2b1606';
      for (const [px, py] of pips) { g.beginPath(); g.arc(px * 18, py * 18, 7, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }

    function draw(g) {
      // The crate-top table under a lantern.
      g.fillStyle = '#1b1208'; g.fillRect(0, 0, W, H);
      const glow = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 480);
      glow.addColorStop(0, 'rgba(255,190,110,0.35)'); glow.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      g.fillStyle = '#8a6a44'; g.fillRect(W / 2 - 300, 120, 600, 420);
      g.strokeStyle = '#5a4632'; g.lineWidth = 3;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(W / 2 - 300, 120 + i * 70); g.lineTo(W / 2 + 300, 120 + i * 70); g.stroke(); }
      g.fillStyle = COLORS.cream; g.textAlign = 'center'; g.font = '20px "IM Fell English", Georgia, serif';
      g.fillText(`Across the crate: ${opp}`, W / 2, 105);
      const shown = phase !== 'bet' || rounds > 0;
      if (shown) {
        for (let i = 0; i < 3; i++) die(g, W / 2 - 120 + i * 120, 220, theirs[i], false);
        for (let i = 0; i < 3; i++) die(g, W / 2 - 120 + i * 120, 440, mine[i], phase !== 'bet' && phase !== 'done' && !keep[i]);
        g.fillStyle = COLORS.cream; g.font = 'bold 18px Cinzel, Georgia, serif';
        g.fillText(`Theirs: ${NAMES[3 - score(theirs)[0]]}`, W / 2, 300);
        g.fillText(`Yours: ${NAMES[3 - score(mine)[0]]}`, W / 2, 520);
      }
      if (phase === 'bet') {
        g.font = 'bold 26px Cinzel, Georgia, serif';
        BETS.forEach((b, i) => { g.fillStyle = i === bet ? COLORS.gold : 'rgba(241,226,194,0.45)'; g.fillText(`${b} gold`, W / 2 - 225 + i * 150, 340); });
      }
      g.fillStyle = COLORS.shade; g.fillRect(W / 2 - 360, H - 72, 720, 42);
      g.fillStyle = COLORS.cream; g.font = 'bold 16px Cinzel, Georgia, serif';
      g.fillText(msg + (phase === 'done' ? '   (Space: again · Esc: leave)' : ''), W / 2, H - 45);
      hud(g, [`Purse ${purse} gold`, `Round ${rounds}`, `Won ${won}`]);
    }
    return { update, draw };
  },
};
