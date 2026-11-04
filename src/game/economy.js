// Goods, who sells them, and what they cost today.
// The trading idea: ships sell their own land's goods cheaply and pay well for goods from far
// away (East wants West, West wants East). Stalls sell at retail and buy at a discount; your own
// customers pay more than the stalls, so buying at a stall and selling at your stand already pays a little.
// Prices drift a little every day, and they answer to you (2026-11-03): sell a lot of one thing in one
// place and its price there drops; buy a lot and it rises. Markets recover by half every day, so it pays
// to spread your goods around. A trade tip each day (heard in the crowd) is true: one captain pays extra
// for one good. Every price you see goes into your ledger (the inventory shows the best you've seen).
import { state, packRoom, note } from './state.js';

// Which city's markets these are (set from place.js by main.js; the same for the whole page).
export const CITY = { id: (state.place || 'sultans_rest') };

export const LANDS = {
  'the Sultanate': 'center', 'the Coastal Republic of Meridia': 'west', Eldoria: 'west', Sylvenwood: 'west', 'Iron Peak': 'west',
  'the Dreadfort of Ebony Desolation': 'east', 'the Vampiric Dominion of Crimson Nightfall': 'east', 'the Dezfulian Empire': 'east',
  'Solitude Haven': 'east', 'the Tiefling Harbors (passage escort)': 'center', 'the harbor': 'center',
};

// Base prices in gold. (Made up by Claude; change freely.)
export const GOODS = {
  cabbage: { name: 'Cabbage', base: 3, from: 'the Sultanate', kind: 'food', color: '#7aa04a' },
  lock:    { name: 'Iron lock', base: 12, from: 'Iron Peak', kind: 'craft', color: '#3a3a3c' },
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
  // From your greenhouse (the Store Add-on, greenhouse.js; 2026-11-04). Nobody else sells them: you grow them.
  carrot:  { name: 'Carrots', base: 3, from: 'your greenhouse', kind: 'food', color: '#e07a2a' },
  tomato:  { name: 'Tomatoes', base: 4, from: 'your greenhouse', kind: 'food', color: '#d8382b' },
  pumpkin: { name: 'Pumpkin', base: 7, from: 'your greenhouse', kind: 'food', color: '#e08a2a' },
  melon:   { name: 'Melon', base: 8, from: 'your greenhouse', kind: 'food', color: '#4a8a3a' },
  // Meridia's own (Chapter Two).
  wool:    { name: 'Meridian Wool', base: 8, from: 'the Coastal Republic of Meridia', kind: 'cloth', color: '#e8e2d2' },
  oil:     { name: 'Olive Oil', base: 7, from: 'the Coastal Republic of Meridia', kind: 'food', color: '#9a9a3a' },
  marble:  { name: 'Meridian Marble', base: 18, from: 'the Coastal Republic of Meridia', kind: 'craft', color: '#ecebe4' },
};

// What each kind of stall sells.
export const STALL_KINDS = {
  spice:  { name: 'spice stall', goods: ['cumin', 'saffron', 'dates'] },
  cloth:  { name: 'cloth stall', goods: ['silk'] },
  craft:  { name: 'crafts stall', goods: ['glass', 'tools', 'gears', 'lock'] },
  food:   { name: 'food stall', goods: ['dates', 'grain', 'rum'] },
  curio:  { name: 'curio stall', goods: ['charm', 'ink', 'moonleaf'] },
  // Meridia's market.
  harbor:  { name: 'harbor stall', goods: ['rum', 'grain', 'wool', 'oil', 'lock'] },
  western: { name: 'western goods stall', goods: ['moonleaf', 'tools', 'gears', 'marble'] },
  luxury:  { name: 'luxury stall', goods: ['wine', 'silk', 'saffron', 'pearls'] },
};

// City prices (2026-11-03, trading in two cities): in Meridia (the West) Eastern and Sultanate goods are dear
// and Western goods cheap; in Sultan's Rest the other way round. Stalls and your own shop follow this
// (ships keep their own rule: far goods pay best). This is what makes sailing with a full hold pay.
const EAST = new Set(['the Sultanate', 'the Dreadfort of Ebony Desolation', 'the Vampiric Dominion of Crimson Nightfall', 'the Dezfulian Empire', 'Solitude Haven']);
export function cityFactor(good) {
  const g = GOODS[good]; if (!g) return 1;
  const west = LANDS[g.from] === 'west', east = EAST.has(g.from);
  if (CITY.id === 'meridia') return (east ? 1.35 : west ? 0.85 : 1) * eventFactor(good);
  return (west ? 1.2 : 1) * eventFactor(good);
}

// Market events: every three days each city has one (a storm, a glut, a festival...), moving one good's price
// for those days. People talk about the next one a day before it starts. DRAFT wording by Claude.
const EVENTS = [
  { good: 'grain', f: 1.6, text: 'A storm sank the grain barges. Bread costs a fortune.' },
  { good: 'rum', f: 0.6, text: 'Three rum ships came in at once. Nobody can give the stuff away.' },
  { good: 'silk', f: 1.5, text: 'A wedding season among the rich: everyone wants silk.' },
  { good: 'tools', f: 1.5, text: 'The shipyards are hiring. Tools are scarce.' },
  { good: 'saffron', f: 1.7, text: 'A festival is coming, and every cook in the city wants saffron.' },
  { good: 'glass', f: 0.65, text: 'A glassworks emptied its warehouse. Glass is cheap as sand.' },
  { good: 'wine', f: 1.5, text: 'The harvest failed in the hills. Wine is dear.' },
  { good: 'moonleaf', f: 1.6, text: 'Fever in the outer streets. Healers buy every leaf of moonleaf they can find.' },
  { good: 'cabbage', f: 1.8, text: 'Blight in the fields. A cabbage is worth its weight in copper.' },
  { good: 'wool', f: 0.6, text: 'The shearing was the best in years. Wool is everywhere.' },
  { good: 'gears', f: 1.6, text: 'A new mill is going up. Gears sell as fast as they come in.' },
  { good: 'pearls', f: 0.7, text: 'A pearl diver found a whole bed. Prices have fallen.' },
];
export function marketEvent(place = CITY.id, day = state.day) {
  const window = Math.floor((day - 1) / 3);
  return EVENTS[Math.floor(hash(place, window, 'event') * EVENTS.length)];
}
export function upcomingEvent(place = CITY.id) {
  const today = marketEvent(place), tomorrow = marketEvent(place, state.day + 1);
  return tomorrow !== today ? tomorrow : null;
}
function eventFactor(good) { const e = marketEvent(); return e.good === good ? e.f : 1; }

// Standing with the merchant houses (the Merchants' Guild at home, the Exchange in Meridia): every 5 points
// sells a percent dearer to stalls and in your own shop, up to 10%.
export const standing = () => CITY.id === 'meridia' ? (state.reputation.exchange || 0) : state.reputation.merchants;
const standingFactor = () => 1 + Math.min(0.1, standing() / 500);

function hash(...xs) {
  let h = 2166136261;
  for (const x of xs) for (const ch of String(x)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
const drift = (good, market) => 0.85 + 0.3 * hash(state.day, good, market);

// A market: { id, type: 'stall' | 'ship', kind (stall) or land (ship), name }.
// How much you've sold into / bought out of this market lately (halves every day).
const SOFT = { own: 12, stall: 10, ship: 16 };     // selling this many in one place takes about a quarter off; buying them adds about a quarter
function flow(m, good) {
  state.flow ??= {};
  const key = `${m.id}|${good}`;
  const f = state.flow[key] || (state.flow[key] = { sold: 0, bought: 0, day: state.day });
  if (f.day !== state.day) { const k = Math.pow(0.5, state.day - f.day); f.sold *= k; f.bought *= k; f.day = state.day; }
  return f;
}
const sellDemand = (m, good) => 1 / (1 + flow(m, good).sold / (3 * SOFT[m.type]));
const buyDemand = (m, good) => Math.min(1.5, 1 + 0.25 * flow(m, good).bought / SOFT[m.type]);

// Today's tip: one far-off captain is short of one good and pays a quarter more for it.
export function tipOfTheDay() {
  const lands = Object.keys(LANDS).filter(l => LANDS[l] !== 'center');
  const land = lands[Math.floor(hash(state.day, 'tipland') * lands.length)];
  const far = Object.keys(GOODS).filter(g => GOODS[g].from !== land && LANDS[GOODS[g].from] !== LANDS[land]);
  const good = far[Math.floor(hash(state.day, 'tipgood') * far.length)];
  return { land, good };
}
const tipFactor = (m, good) => { const t = tipOfTheDay(); return m.type === 'ship' && m.land === t.land && good === t.good ? 1.25 : 1; };

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
  // Contraband (Levinite) only changes hands with the people who deal in it (levinite.js, meridia/watch.js).
  if (g.kind === 'contraband' || m.type === 'lev') return m.type === 'lev' && g.kind === 'contraband' ? Math.round(g.base * (m.wholesale ? 0.55 : 0.9)) : null;
  if (m.type === 'stall') {
    if (!STALL_KINDS[m.kind].goods.includes(good)) return null;
    p = g.base * 1.1 * cityFactor(good);
  } else {
    if (g.from !== m.land) return null;
    p = g.base * 0.65;
  }
  return Math.max(1, Math.round(p * drift(good, m.id) * haggleFactor(m, false) * buyDemand(m, good)));
}

// What the market pays you per unit, or null if it won't buy it.
export function sellPrice(m, good) {
  const g = GOODS[good];
  let p;
  if (g.kind === 'contraband' || m.type === 'lev') return m.type === 'lev' && g.kind === 'contraband' && m.buyer ? Math.floor(g.base * 1.9 * sellDemand(m, good)) : null;
  if (m.type === 'own') p = g.base * (1.45 + 0.04 * (m.tier || 0)) * (good === 'cabbage' ? 1.3 : 1) * cityFactor(good) * standingFactor();   // your own customers pay retail
  else if (m.type === 'stall') {
    p = g.base * (STALL_KINDS[m.kind].goods.includes(good) ? 0.9 : 0.75) * cityFactor(good) * standingFactor();
  } else {
    if (g.from === m.land) return null;
    const far = LANDS[g.from] !== 'center' && LANDS[m.land] !== 'center' && LANDS[g.from] !== LANDS[m.land];
    p = g.base * (far ? 1.35 : 1.05);
  }
  return Math.max(1, Math.floor(p * drift(good, m.id + 'b') * haggleFactor(m, true) * sellDemand(m, good) * tipFactor(m, good)));
}

export function goodsFor(m) {
  if (m.type === 'own') return [];
  if (m.type === 'lev') return m.buyer ? [] : ['levinite'];
  if (m.type === 'stall') return STALL_KINDS[m.kind].goods;
  return Object.keys(GOODS).filter(k => GOODS[k].from === m.land);
}

export function buy(m, good, n) {
  const price = buyPrice(m, good);
  if (price == null) return 'They don\'t sell that.';
  n = Math.min(n, packRoom(), Math.floor(state.gold / price));
  if (n <= 0) return state.gold < price ? 'Not enough gold.' : 'Your pack is full.';
  // One at a time: each one you buy here nudges the price up a little.
  let bought = 0, cost = 0;
  for (; bought < n; bought++) {
    const p = buyPrice(m, good);
    if (state.gold < p || packRoom() <= 0) break;
    state.gold -= p; cost += p;
    state.pack[good] = (state.pack[good] || 0) + 1;
    flow(m, good).bought++;
  }
  if (!bought) return 'Not enough gold.';
  state.spent += cost;
  state.paid ??= {};
  // Remember what you paid on average, to show profit when you sell.
  const prev = state.paid[good] || { n: 0, cost: 0 };
  state.paid[good] = { n: prev.n + bought, cost: prev.cost + cost };
  return null;
}

// Returns { error } or { gold, profit }.
export function sell(m, good, n) {
  const price = sellPrice(m, good);
  if (price == null) return { error: 'They won\'t buy that.' };
  n = Math.min(n, state.pack[good] || 0);
  if (n <= 0) return { error: 'You have none.' };
  // One at a time: each one you sell here brings the price down a little.
  let got = 0;
  for (let i = 0; i < n; i++) { got += sellPrice(m, good); flow(m, good).sold++; }
  state.pack[good] -= n;
  if (!state.pack[good]) delete state.pack[good];
  state.gold += got;
  state.earned += got;
  if (m.type === 'own') state.soldOwn = (state.soldOwn || 0) + n;     // (Chapter One: "sell three goods")
  if (m.type === 'own') dispatchEvent(new CustomEvent('lavine:sold-own', { detail: { n } }));   // (daily.js: today's stand notice)
  const paid = state.paid?.[good];
  let profit = 0;
  if (paid && paid.n > 0) {
    const avg = paid.cost / paid.n;
    profit = Math.round(got - avg * n);
    paid.n = Math.max(0, paid.n - n);
    paid.cost = avg * paid.n;
  }
  if (profit > 0) note(`Sold ${n} ${GOODS[good].name} for a profit of ${profit} gold`);
  return { gold: got, profit };
}

// Your ledger: the last price you saw for each good at each market (kept a week).
export function remember(m, where, good, buy, sell) {
  state.seen ??= {};
  const g = state.seen[good] ??= {};
  g[where] = { buy, sell, day: state.day };
  for (const [k, v] of Object.entries(g)) if (state.day - v.day > 7) delete g[k];
}
// The best place you've seen to sell (and to buy) a good lately.
export function bestSeen(good) {
  const g = state.seen?.[good] || {};
  let sell = null, buy = null;
  for (const [where, v] of Object.entries(g)) {
    if (v.sell != null && (!sell || v.sell > sell.price)) sell = { price: v.sell, where, day: v.day };
    if (v.buy != null && (!buy || v.buy < buy.price)) buy = { price: v.buy, where, day: v.day };
  }
  return { sell, buy };
}
