// Levinite (Chapter Two; docs/chapter-two-plan.md). A drug Meridia makes and moves, run like a business with a
// respectable front. What it does in the game:
//  - The high: the sky holds at sunset while you're carried from place to place in the city (the same sunset,
//    different places), then the clock jumps to sunrise. You never live the night. (Quest steps for that night
//    simply wait for the next one.)
//  - Waking up rolls your purse: early uses stay small; the more you use, the wider and wilder (a hidden count).
//    Rare extremes are always possible. Only gold you carry is at risk (the user's answer); home and store are safe.
//  - At high use, strange mornings: waking up married (from level 15), owning something you don't remember
//    buying, a new look, journal lines about things you don't remember doing.
//  - Your first use starts the quest that lets you sell it (meridia/story.js). Selling it, and carrying it
//    through the Middle Gate, raise suspicion; a guard may come to your shop (meridia/watch.js).
// Every line is a DRAFT by Claude.
import { state, level, note, save } from './state.js';
import { GOODS } from './economy.js';
import { toast, updateStatus, talk } from './ui.js';

GOODS.levinite = { name: 'Levinite (a vial)', base: 45, from: 'the Coastal Republic of Meridia', kind: 'contraband', color: '#9a4be0' };
export const isContraband = (g) => GOODS[g]?.kind === 'contraband';
const lev = () => (state.lev ||= { uses: 0 });
export const suspicion = () => state.suspicion || 0;
export function addSuspicion(n, why) {
  state.suspicion = Math.max(0, Math.min(100, suspicion() + n));
  if (why && n > 0) note(`(Somebody noticed: ${why})`);
}

// The places you drift through (Meridia), at the same sunset.
const DRIFT = [
  { x: 0, z: 210, yaw: Math.PI, text: 'The inner gate. You don\'t remember walking here. The sun hasn\'t moved.' },
  { x: 60, z: -30, yaw: 0, text: 'The end of a pier, the sea gone copper. Somebody is laughing. It might be you.' },
  { x: -50, z: 150, yaw: Math.PI / 2, text: 'The market, empty, every stall shut, the light exactly as it was.' },
  { x: 140, z: 70, yaw: -Math.PI / 2, text: 'Between the warehouses. Violet light in a window. Then not.' },
  { x: 0, z: 130, yaw: Math.PI, text: 'The middle gate. A guard says your name. You never told him your name.' },
];
// The morning roll: the spread grows with use; small extremes are always possible.
function roll() {
  const u = lev().uses;
  const r = Math.random();
  if (r < 0.03) return { gold: 500 + Math.floor(Math.random() * 1500), text: 'There\'s a heavy purse in your coat that isn\'t yours. It is now.' };
  if (r < 0.06) return { lose: true, text: 'Your purse is gone. Not lighter: gone.' };
  const spread = 30 + u * 55;
  const g = Math.round((Math.random() * 2 - 0.9) * spread);       // leans a little toward winning
  return { gold: g, text: g >= 0 ? `You wake with ${g} more gold than you remember having.` : `You wake ${-g} gold lighter, and no idea where it went.` };
}
// Strange mornings at high use.
function strange() {
  const u = lev().uses;
  if (u < 6 || Math.random() > 0.12 + (u - 6) * 0.03) return null;
  const options = ['thing', 'look', 'journal'];
  if (level() >= 15 && !state.spouse) options.push('married', 'married');
  const pick = options[Math.floor(Math.random() * options.length)];
  if (pick === 'married') return import('./marriage.js').then(m => m.levMarriage());
  if (pick === 'thing') {
    const goods = ['silk', 'pearls', 'wine', 'gears', 'marble'], g = goods[Math.floor(Math.random() * goods.length)], n = 2 + Math.floor(Math.random() * 5);
    state.pack[g] = (state.pack[g] || 0) + n;
    return Promise.resolve(`You own ${n} ${GOODS[g].name} this morning. You have no memory of buying them, and a receipt in your own handwriting.`);
  }
  if (pick === 'look') {
    const hairs = ['#8a2a1a', '#e8e4dc', '#2f6b5a', '#4b1f6b', '#d9c08a'];
    state.look = { ...state.look, hair: hairs[Math.floor(Math.random() * hairs.length)], hue: Math.random() };
    dispatchEvent(new CustomEvent('lavine:look'));
    return Promise.resolve('The face in the basin is yours, but your hair is a colour you\'d never choose, and these aren\'t the clothes you went out in.');
  }
  const lines = ['Sang on the tavern table (all the verses).', 'Bought a round for the whole Gilded Gull.', 'Told a guard a secret. Can\'t remember which.', 'Swore to marry a florist by spring.'];
  note(`(In your own handwriting) ${lines[Math.floor(Math.random() * lines.length)]}`);
  return Promise.resolve('There\'s a line in your journal in your own handwriting. You don\'t remember writing it.');
}

// Take a vial. run(fn) lets main.js move you around and stop the clock (main listens for these events).
export function useLevinite() {
  if (!(state.pack.levinite > 0)) return;
  state.pack.levinite--; if (!state.pack.levinite) delete state.pack.levinite;
  lev().uses++;
  const first = !state.flags.levFirst;
  state.flags.levFirst = true;
  note(first ? 'Took Levinite for the first time' : 'Took Levinite');
  save();
  dispatchEvent(new CustomEvent('lavine:high', { detail: { stops: DRIFT.slice().sort(() => Math.random() - 0.5).slice(0, 4) } }));
}
// Called by main.js when the drifting is over: the clock jumps to sunrise, and the morning is rolled.
export async function wakeUp() {
  const r = roll();
  let lines = [r.text];
  if (r.lose) { const lost = state.gold; state.gold = 0; note(`Woke up with an empty purse (${lost} gold gone)`); }
  else { state.gold = Math.max(0, state.gold + r.gold); note(`Woke up ${r.gold >= 0 ? '+' : ''}${r.gold} gold`); }
  const odd = await strange();
  if (odd) lines.push(odd);
  save(); updateStatus();
  talk({ name: 'Morning', text: ['The sun is up. The night is simply... missing.', ...lines], options: [{ label: 'Get up' }] });
}
// Your use, for the inventory: a button on the vial.
export const canUse = (g) => g === 'levinite' && state.place === 'meridia';
export { toast };
