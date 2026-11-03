// Twenty-One: the Salted Kraken's card game, the barkeep dealing. Get closer to 21 than the
// dealer without going over. Picture cards count 10, Sails (aces) count 1 or 11.
// The dealer draws to 16 and stands on 17. Twenty-one in two cards pays 3 to 2.
// Suits of Sultan's Rest: Coins, Cups, Blades and Sails.
import { W, H, COLORS, hud } from './common.js';

const BETS = [5, 10, 25, 50];
const SUITS = [['Coins', '¤', '#b8862c'], ['Cups', '♆', '#2e6c8e'], ['Blades', '†', '#7a2a1c'], ['Sails', '⛵', '#2f6b5a']];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'K', 'Q', 'J'];

function deck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function total(hand) {
  let t = 0, aces = 0;
  for (const c of hand) { if (c.r === 'A') { aces++; t += 11; } else t += ['K', 'Q', 'J'].includes(c.r) ? 10 : +c.r; }
  while (t > 21 && aces) { t -= 10; aces--; }
  return t;
}

export const twentyOne = {
  title: 'Twenty-One',
  ownEscape: true,
  how: [
    'Bet with Left/Right, Space to deal. Then H to take a card, S to stand, D to double your bet for one last card.',
    'Closest to 21 without going over wins. Picture cards count 10; Sails count 1 or 11.',
    'The barkeep draws to 16 and stands on 17. Twenty-one in your first two cards pays 3 to 2. Esc leaves the bar.',
  ],
  create(api) {
    let purse = api.opts.gold ?? 50;
    const start = purse;
    // Limits from the house: hands left today, and how much more it will lose to you today.
    const handsLeft = api.opts.handsLeft ?? 25, winRoom = api.opts.winRoom ?? 150;
    let bet = 1, stake = 0, phase = 'bet', cards = deck(), me = [], dealer = [], msg = 'Place your bet.', won = 0, hands = 0, wait = 0;
    const draw1 = () => { if (cards.length < 12) cards = deck(); return cards.pop(); };

    function finish() {
      api.finish({ score: won, hands, gold: purse - start, renown: won * 2,
        summary: purse >= start ? `You leave the bar ${purse - start} gold richer.` : `You leave the bar ${start - purse} gold lighter.` });
    }
    function settle(text) { msg = text; phase = 'done'; }
    function dealerPlays() {
      phase = 'dealer'; wait = 0.6;
    }
    function resolve() {
      const m = total(me), d = total(dealer);
      // (The bet already left your purse when the cards were dealt.)
      if (d > 21) { purse += stake * 2; won++; settle(`The barkeep busts with ${d}. You win ${stake} gold.`); }
      else if (m > d) { purse += stake * 2; won++; settle(`${m} beats ${d}. You win ${stake} gold.`); }
      else if (m === d) { purse += stake; settle(`${m} each. A push: your bet comes back.`); }
      else settle(`${d} beats ${m}. You lose ${stake} gold.`);
    }

    function update(dt) {
      const k = api.pressed;
      if (wait > 0) { wait -= dt; if (wait <= 0 && phase === 'dealer') { if (total(dealer) < 17) { dealer.push(draw1()); wait = 0.6; } else resolve(); } return; }
      // Leaving mid-hand forfeits the bet on the table (it's already out of your purse).
      if (k.has('Escape') && phase !== 'dealer') { finish(); return; }
      if (phase === 'bet') {
        if (k.has('ArrowLeft')) bet = Math.max(0, bet - 1);
        if (k.has('ArrowRight')) bet = Math.min(BETS.length - 1, bet + 1);
        while (bet > 0 && BETS[bet] > purse) bet--;
        if (purse < BETS[0]) { msg = 'Your purse is empty. Time to go (Esc).'; return; }
        if (hands >= handsLeft) { msg = 'The barkeep yawns: "That\'s enough cards for one day." (Esc)'; return; }
        if (purse - start >= winRoom) { msg = 'The barkeep slides the deck away: "You\'ve cleaned me out for today." (Esc)'; return; }
        if (k.has('Space')) {
          stake = BETS[bet]; purse -= stake; hands++; me = [draw1(), draw1()]; dealer = [draw1(), draw1()];
          if (total(me) === 21) {
            const pay = Math.floor(stake * 1.5);
            if (total(dealer) === 21) { purse += stake; settle('Twenty-one each! A push.'); }
            else { purse += stake + pay; won++; settle(`Twenty-one! You win ${pay} gold.`); }
          } else { phase = 'play'; msg = 'H: take a card · S: stand · D: double'; }
        }
      } else if (phase === 'play') {
        if (k.has('KeyH')) { me.push(draw1()); if (total(me) > 21) settle(`Bust with ${total(me)}. You lose ${stake} gold.`); else if (total(me) === 21) dealerPlays(); }
        else if (k.has('KeyS')) dealerPlays();
        else if (k.has('KeyD') && me.length === 2 && purse >= stake) {
          purse -= stake; stake *= 2; me.push(draw1());
          if (total(me) > 21) settle(`Bust with ${total(me)}. You lose ${stake} gold.`); else dealerPlays();
        }
      } else if (phase === 'done') {
        if (k.has('Space')) { phase = 'bet'; msg = 'Another hand? Place your bet. (Esc to leave)'; }
      }
    }

    function card(g, x, y, c, hidden) {
      g.save(); g.translate(x, y);
      g.fillStyle = hidden ? '#5a2a1c' : '#f6efe2'; g.strokeStyle = '#3a2412'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(-45, -65, 90, 130, 8); g.fill(); g.stroke();
      if (hidden) { g.strokeStyle = '#e7c35a'; g.lineWidth = 2; g.strokeRect(-35, -55, 70, 110); g.restore(); return; }
      const [, sym, col] = c.s;
      g.fillStyle = col; g.textAlign = 'center';
      g.font = 'bold 26px Cinzel, Georgia, serif'; g.fillText(c.r, -24, -38);
      g.font = '44px Georgia, serif'; g.fillText(sym, 0, 16);
      g.font = 'bold 26px Cinzel, Georgia, serif'; g.save(); g.rotate(Math.PI); g.fillText(c.r, -24, -38); g.restore();
      g.restore();
    }

    function draw(g) {
      // The bar of the Salted Kraken: dark wood, warm lamp.
      g.fillStyle = '#24160b'; g.fillRect(0, 0, W, H);
      const glow = g.createRadialGradient(W / 2, 120, 30, W / 2, 220, 520);
      glow.addColorStop(0, 'rgba(255,190,110,0.35)'); glow.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      g.fillStyle = '#5a3a20'; g.fillRect(60, 110, W - 120, 470);
      g.fillStyle = '#2f5a3a'; g.fillRect(90, 130, W - 180, 430);
      g.fillStyle = COLORS.cream; g.textAlign = 'center'; g.font = 'bold 18px Cinzel, Georgia, serif';
      g.fillText(phase === 'bet' && !hands ? 'The barkeep shuffles' : `Barkeep${phase === 'play' ? '' : ': ' + total(dealer)}`, W / 2, 160);
      dealer.forEach((c, i) => card(g, W / 2 - (dealer.length - 1) * 50 + i * 100, 250, c, phase === 'play' && i === 1));
      me.forEach((c, i) => card(g, W / 2 - (me.length - 1) * 50 + i * 100, 440, c, false));
      if (me.length) { g.fillStyle = COLORS.cream; g.fillText(`You: ${total(me)}${stake ? '  ·  bet ' + stake : ''}`, W / 2, 535); }
      if (phase === 'bet') {
        g.font = 'bold 26px Cinzel, Georgia, serif';
        BETS.forEach((b, i) => { g.fillStyle = i === bet ? COLORS.gold : 'rgba(241,226,194,0.45)'; g.fillText(`${b} gold`, W / 2 - 225 + i * 150, me.length ? 590 : 350); });
      }
      g.fillStyle = COLORS.shade; g.fillRect(W / 2 - 360, H - 50, 720, 40);
      g.fillStyle = COLORS.cream; g.font = 'bold 16px Cinzel, Georgia, serif';
      g.fillText(msg + (phase === 'done' ? '   (Space: again · Esc: leave)' : ''), W / 2, H - 24);
      hud(g, [`Purse ${purse} gold`, `Hands ${hands}`, `Won ${won}`]);
    }
    return { update, draw };
  },
};
