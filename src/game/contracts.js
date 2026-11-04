// Trade contracts (Chapter Two, 2026-11-03: trading at the heart of the game). The merchant houses (the
// Merchants' Guild in Sultan's Rest, the Exchange in Meridia) post two contracts every three days. Each asks
// for a quantity of a good that is cheap in the OTHER city, delivered here within about three months (the voyage
// alone is two: place.js VOYAGE_DAYS), for well above
// its worth plus standing with the house. Up to three at once; a missed deadline costs standing.
// Wording is a DRAFT by Claude.
import { state, level, note, save, addRenown } from './state.js';
import { GOODS, LANDS } from './economy.js';
import { toast, updateStatus } from './ui.js';

const HOUSE = { meridia: 'the Exchange', sultans_rest: "the Merchants' Guild" };
const REP = { meridia: 'exchange', sultans_rest: 'merchants' };
// What each city's houses want from the other: Meridia wants Eastern and Sultanate goods, Sultan's Rest wants Western.
const WANTS = {
  meridia: ['saffron', 'cumin', 'dates', 'glass', 'silk', 'ebony', 'wine', 'pearls'],
  sultans_rest: ['wool', 'oil', 'marble', 'grain', 'rum', 'moonleaf', 'tools', 'gears'],
};
function hash(...xs) { let h = 2166136261; for (const ch of xs.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

export function offers(city) {
  const win = Math.floor((state.day - 1) / 3), lv = level();
  const list = WANTS[city].filter(g => GOODS[g].base <= 10 + lv * 2.5);
  const first = Math.floor(hash(city, win, 0) * list.length);
  const base = [0, 1].map(i => {
    // Two different goods: the second is a step along the list from the first.
    const good = list[(first + i * (1 + Math.floor(hash(city, win, 'step') * (list.length - 1)))) % list.length] || WANTS[city][0];
    const n = Math.max(10, Math.round((12 + lv * 2) * (GOODS[good].base > 20 ? 0.5 : 1)));
    return { id: `${city}-${win}-${i}`, city, good, n, days: 75 + Math.floor(hash(city, win, i, 'd') * 30), gold: Math.round(n * GOODS[good].base * 3), rep: 3 };
  });
  // Contract chains (2026-11-04): every three contracts kept for the same house, it trusts you with a big order:
  // three times the goods (of its dearest wants), four times their worth, more standing. It stays up until you take it.
  const done = state.chains?.[city] || 0;
  if (done >= 3) {
    const dear = [...list].sort((a, b) => GOODS[b.good ?? b].base - GOODS[a.good ?? a].base);   // the house's dearest wants
    const good = dear[Math.floor(hash(city, 'big', done) * Math.min(2, dear.length))] || WANTS[city][0];
    const n = Math.max(30, Math.round((12 + lv * 2) * 3 * (GOODS[good].base > 20 ? 0.5 : 1)));
    base.push({ id: `${city}-big-${done}`, city, good, n, days: 120, gold: Math.round(n * GOODS[good].base * 4), rep: 8, big: true });
  }
  return base;
}
export const mine = () => (state.contracts ||= []);
export function describe(c) {
  return `${c.n} ${GOODS[c.good].name} to ${HOUSE[c.city]}${c.due ? `, by day ${c.due}` : ` within ${c.days} days`} · pays ${c.gold} gold`;
}
// The house's talk options: take a contract, hand one in.
export function contractOptions(city, name) {
  const out = [];
  for (const c of mine().filter(x => x.city === city)) {
    const have = state.pack[c.good] || 0;
    out.push({ label: `Hand in: ${c.n} ${GOODS[c.good].name}`, hint: have >= c.n ? `${c.gold} gold` : `you have ${have}`, disabled: have < c.n, do: () => {
      state.pack[c.good] -= c.n; if (!state.pack[c.good]) delete state.pack[c.good];
      state.gold += c.gold; state.earned += c.gold;
      state.reputation[REP[city]] = (state.reputation[REP[city]] || 0) + c.rep;
      addRenown(15 + Math.round(c.gold / 40), 'a trade contract');
      state.contracts = mine().filter(x => x !== c);
      state.chains ||= {};
      state.chains[city] = c.big ? 0 : (state.chains[city] || 0) + 1;
      note(`Contract done: ${describe(c)}`);
      save(); updateStatus();
      return { name, text: [`"Delivered, counted, and paid. The house remembers people who keep their word." (+${c.gold} gold, standing with ${HOUSE[city]} +${c.rep})`], options: [{ label: 'Leave' }] };
    } });
  }
  const taken = new Set(mine().map(c => c.id));
  const open = offers(city).filter(o => !taken.has(o.id));
  out.push({ label: 'See the contracts board', hint: `${open.length} open · you hold ${mine().length} of 3`, do: () => ({ name, text: [
    'Contracts change every three days. Take one, bring the goods here before the day it\'s due. The voyage alone is two months each way, so the house gives you about three.',
    ...open.map(o => `${o.big ? 'BIG ORDER (for keeping your word three times): ' : ''}${GOODS[o.good].name}: ${describe(o)} (cheap in ${city === 'meridia' ? "Sultan's Rest" : 'Meridia'}).`),
    ...((state.chains?.[city] || 0) < 3 ? [`Keep ${3 - (state.chains?.[city] || 0)} more contract${3 - (state.chains?.[city] || 0) === 1 ? '' : 's'} with this house and it trusts you with a big order.`] : []),
  ], options: [
    ...open.map(o => ({ label: `${o.big ? 'Take the BIG order' : 'Take'}: ${o.n} ${GOODS[o.good].name}`, hint: `${o.gold} gold, ${o.days} days`, disabled: mine().length >= 3, do: () => {
      mine().push({ ...o, due: state.day + o.days });
      state.flags.tookContract = true;
      note(`Took a contract: ${describe(mine().at(-1))}`); save();
      return { name, text: ['"Signed. Don\'t be late: the house doesn\'t forget that either."'], options: [{ label: 'Leave' }] };
    } })),
    { label: 'Leave' },
  ] }) });
  return out;
}
// Each morning: missed deadlines cost standing.
export function checkContracts() {
  for (const c of [...mine()]) if (state.day > c.due) {
    state.reputation[REP[c.city]] = Math.max(0, (state.reputation[REP[c.city]] || 0) - 4);
    state.contracts = mine().filter(x => x !== c);
    note(`Missed a contract: ${describe(c)}`);
    toast(`You missed a contract for ${HOUSE[c.city]}. They will remember (standing -4).`, 6000);
  }
}
void LANDS;
