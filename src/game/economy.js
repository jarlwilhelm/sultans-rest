// Goods, who sells them, and what they cost today.
// The trading idea: ships sell their own land's goods cheaply and pay well for goods from far
// away (East wants West, West wants East). Stalls sell at retail and buy at a discount.
// Prices drift a little every day.
import { state, packRoom, note } from './state.js';

export const LANDS = {
  'the Sultanate': 'center', 'the Coastal Republic of Meridia': 'west', Eldoria: 'west', Sylvenwood: 'west', 'Iron Peak': 'west',
  'the Dreadfort of Ebony Desolation': 'east', 'the Vampiric Dominion of Crimson Nightfall': 'east', 'the Dezfulian Empire': 'east',
  'Solitude Haven': 'east', 'the Tiefling Harbors (passage escort)': 'center', 'the harbor': 'center',
};

// Base prices in gold. (Made up by Claude; change freely.)
export const GOODS = {
  cabbage: { name: 'Cabbage', base: 3, from: 'the Sultanate', kind: 'food', color: '#7aa04a' },
  dates:   { name: 'Dates', base: 3, from: 'the Sultanate', kind: 'food', color: '#7a4a22' },
  cumin:   { name: 'Cumin', base: 5, from: 'the Sultanate', kind: 'spice', color: '#b5722e' },
  saffron: { name: 'Saffron', base: 19, from: 'the Sultanate', kind: 'spice', color: '#d9472a' },
  glass:   { name: 'Sand Glass', base: 13, from: 'the Sultanate', kind: 'craft', color: '#8fd3d6' },
  grain:   { name: 'Eldorian Grain', base: 2, from: 'Eldoria', kind: 'food', color: '#d8b45a' },
  rum:     { name: 'Meridian Rum', base: 9, from: 'the Coastal Republic of Meridia', kind: 'food', color: '#8a4b1f' },
  moonleaf:{ name: 'Moonleaf', base: 16, from: 'Sylvenwood', kind: 'herb', color: '#7fb08a' },
  gears:   { name: 'Dwarven Gears', base: 22, from: 'Iron Peak', kind: 'craft', color: '#b8862c' },
  tools:   { name: 'Iron Tools', base: 12, from: 'Iron Peak', kind: 'craft', color: '#6d6f75' },
  silk:    { name: 'Dezfulian Silk', base: 28, from: 'the Dezfulian Empire', kind: 'cloth', color: '#7a4ab0' },
  wine:    { name: 'Crimson Wine', base: 31, from: 'the Vampiric Dominion of Crimson Nightfall', kind: 'food', color: '#7a1020' },
  ebony:   { name: 'Ebony', base: 24, from: 'the Dreadfort of Ebony Desolation', kind: 'craft', color: '#2a2220' },
  pearls:  { name: 'Black Pearls', base: 44, from: 'Solitude Haven', kind: 'curio', color: '#2b2d3a' },
  ink:     { name: 'Kraken Ink', base: 21, from: 'the harbor', kind: 'curio', color: '#3a2a5a' },
  charm:   { name: 'Ward Charm', base: 11, from: 'the Tiefling Harbors (passage escort)', kind: 'curio', color: '#b77cff' },
};

// What each kind of stall sells.
export const STALL_KINDS = {
  spice:  { name: 'spice stall', goods: ['cumin', 'saffron', 'dates'] },
  cloth:  { name: 'cloth stall', goods: ['silk'] },
  craft:  { name: 'crafts stall', goods: ['glass', 'tools', 'gears'] },
  food:   { name: 'food stall', goods: ['dates', 'grain', 'rum'] },
  curio:  { name: 'curio stall', goods: ['charm', 'ink', 'moonleaf'] },
};

function hash(...xs) {
  let h = 2166136261;
  for (const x of xs) for (const ch of String(x)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
const drift = (good, market) => 0.85 + 0.3 * hash(state.day, good, market);

// A market: { id, type: 'stall' | 'ship', kind (stall) or land (ship), name }.
function haggleFactor(m, selling) {
  const h = state.haggled[m.id];
  if (!h || h.day !== state.day) return 1;
  return selling ? 1 / h.factor : h.factor;   // a good haggle lowers what you pay and raises what you get
}

// What the market charges you per unit, or null if it doesn't sell it.
export function buyPrice(m, good) {
  const g = GOODS[good];
  let p;
  if (m.type === 'own') return null;
  if (m.type === 'stall') {
    if (!STALL_KINDS[m.kind].goods.includes(good)) return null;
    p = g.base * 1.1;
  } else {
    if (g.from !== m.land) return null;
    p = g.base * 0.65;
  }
  return Math.max(1, Math.round(p * drift(good, m.id) * haggleFactor(m, false)));
}

// What the market pays you per unit, or null if it won't buy it.
export function sellPrice(m, good) {
  const g = GOODS[good];
  let p;
  if (m.type === 'own') p = g.base * (1.15 + 0.04 * (m.tier || 0)) * (good === 'cabbage' ? 1.4 : 1);   // your own customers pay retail
  else if (m.type === 'stall') {
    p = g.base * (STALL_KINDS[m.kind].goods.includes(good) ? 0.9 : 0.75);
  } else {
    if (g.from === m.land) return null;
    const far = LANDS[g.from] !== 'center' && LANDS[m.land] !== 'center' && LANDS[g.from] !== LANDS[m.land];
    p = g.base * (far ? 1.35 : 1.05);
  }
  return Math.max(1, Math.floor(p * drift(good, m.id + 'b') * haggleFactor(m, true)));
}

export function goodsFor(m) {
  if (m.type === 'own') return [];
  if (m.type === 'stall') return STALL_KINDS[m.kind].goods;
  return Object.keys(GOODS).filter(k => GOODS[k].from === m.land);
}

export function buy(m, good, n) {
  const price = buyPrice(m, good);
  if (price == null) return 'They don\'t sell that.';
  n = Math.min(n, packRoom(), Math.floor(state.gold / price));
  if (n <= 0) return state.gold < price ? 'Not enough gold.' : 'Your pack is full.';
  state.gold -= price * n;
  state.spent += price * n;
  state.pack[good] = (state.pack[good] || 0) + n;
  state.paid ??= {};
  // Remember what you paid on average, to show profit when you sell.
  const prev = state.paid[good] || { n: 0, cost: 0 };
  state.paid[good] = { n: prev.n + n, cost: prev.cost + price * n };
  return null;
}

// Returns { error } or { gold, profit }.
export function sell(m, good, n) {
  const price = sellPrice(m, good);
  if (price == null) return { error: 'They won\'t buy that.' };
  n = Math.min(n, state.pack[good] || 0);
  if (n <= 0) return { error: 'You have none.' };
  state.pack[good] -= n;
  if (!state.pack[good]) delete state.pack[good];
  state.gold += price * n;
  state.earned += price * n;
  const paid = state.paid?.[good];
  let profit = 0;
  if (paid && paid.n > 0) {
    const avg = paid.cost / paid.n;
    profit = Math.round((price - avg) * n);
    paid.n = Math.max(0, paid.n - n);
    paid.cost = avg * paid.n;
  }
  if (profit > 0) note(`Sold ${n} ${GOODS[good].name} for a profit of ${profit} gold`);
  return { gold: price * n, profit };
}
