// Investing in voyages (2026-11-04, the user: more ways and reasons to make money). At the Exchange in Meridia or
// the Merchants' Guild in Sultan's Rest you put gold into another merchant's voyage. When the ship comes home
// (one to three months) you get your share back with a profit, or part of it, or nothing if the kraken had her.
// Safer ships pay less. Up to two shares at once. Ship names, odds and words are a DRAFT by Claude.
import { state, level, note, save } from './state.js';
import { toast, updateStatus } from './ui.js';

const SHIPS = ['the Salt Heron', 'the Copper Wife', 'the Patient Gull', 'the Ninth Lantern', 'the Widow\'s Luck', 'the Brass Moth', 'the Slow Tide', 'the Kraken\'s Regret', 'the Amber Mule'];
const RISK = [
  { id: 'safe', label: 'a careful captain, hugging the coast', win: 0.9, mult: 1.3, days: [30, 45] },
  { id: 'bold', label: 'a fast route past the islands', win: 0.72, mult: 1.8, days: [40, 60] },
  { id: 'wild', label: 'outside the pilots\' lights, through kraken water', win: 0.5, mult: 3, days: [50, 90] },
];
function hash(...xs) { let h = 2166136261; for (const ch of xs.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
const mine = () => (state.investments ||= []);
const stakes = () => [250, 500, 1000, 2500, 5000].filter(s => s <= 500 + level() * 250);

// This window's three voyages (they change every three days, like the contracts).
function voyages(city) {
  const win = Math.floor((state.day - 1) / 3);
  return RISK.map((r, i) => ({ ...r, risk: r.id, id: `${city}-${win}-${i}`, ship: SHIPS[(Math.floor(hash(city, win) * SHIPS.length) + i * 3) % SHIPS.length],   // three different ships
    back: r.days[0] + Math.floor(hash(city, win, i, 'd') * (r.days[1] - r.days[0])) }));
}

export function investOptions(city, name) {
  const held = mine();
  const lines = held.map(v => `${v.stake} gold in ${v.ship} (${v.label}), due home about day ${v.due}.`);
  return [{ label: 'Invest in a voyage', hint: held.length ? `${held.length} of 2 shares out` : 'risk gold for a share of a cargo', do: () => ({ name, text: [
    'Ships leave every few days, and their owners sell shares to pay for the cargo. Bring the ship home and the share pays; lose her and it doesn\'t.',
    ...(lines.length ? ['Your shares: ' + lines.join(' ')] : []),
  ], options: [
    ...voyages(city).filter(v => !held.some(h => h.id === v.id)).map(v => ({ label: `${v.ship}: ${v.label}`, hint: `×${v.mult} if she comes home (${Math.round(v.win * 100)}% chance), about ${v.back} days`, disabled: held.length >= 2, do: () => ({ name, text: [`How much do you put into ${v.ship}?`], options: [
      ...stakes().map(s => ({ label: `${s} gold`, hint: `back: ${Math.round(s * v.mult)} if she comes home`, disabled: state.gold < s, do: () => {
        state.gold -= s; state.spent = (state.spent || 0) + s;
        // The voyage's luck is decided now (so reloading doesn't change it), found out when she's due.
        const roll = Math.random();
        mine().push({ id: v.id, ship: v.ship, label: v.label, stake: s, mult: v.mult, due: state.day + v.back, outcome: roll < v.win ? 'home' : roll < v.win + (1 - v.win) / 2 ? 'half' : 'lost' });
        note(`Put ${s} gold into ${v.ship} (due about day ${state.day + v.back})`); save(); updateStatus();
        return { name, text: [`The clerk writes your name in the ship's book. "${v.ship}. Pray for fair winds, or don't: she sails either way."`], options: [{ label: 'Leave' }] };
      } })),
      { label: 'Not this one' },
    ] }) })),
    { label: 'Leave' },
  ] }) }];
}

// Each morning (npcs.js newDay): ships that are due come home, or don't.
export function settleInvestments() {
  for (const v of [...mine()]) if (state.day >= v.due) {
    state.investments = mine().filter(x => x !== v);
    const pay = v.outcome === 'home' ? Math.round(v.stake * v.mult) : v.outcome === 'half' ? Math.round(v.stake / 2) : 0;
    state.gold += pay; if (pay) state.earned = (state.earned || 0) + pay;
    const msg = v.outcome === 'home' ? `${v.ship} came home full! Your share: ${pay} gold (you put in ${v.stake}).`
      : v.outcome === 'half' ? `${v.ship} limped home after a storm, half her cargo gone. You get back ${pay} of your ${v.stake} gold.`
      : `${v.ship} never came home. The kraken, they say. Your ${v.stake} gold went down with her.`;
    note(msg); toast(msg, 7000);
  }
  updateStatus();
}
