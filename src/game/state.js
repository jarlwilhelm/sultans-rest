// You: gold, your pack, your rank, your character sheet, the day and time.
// Saved in this browser (localStorage) so you can stop and come back.

// Your shop's growth (title = what people call you). You start owning Ale's stand (step 1).
// Each step needs a level and gold, paid at the Merchants' Guild; the ship comes from Xi.
export const RANKS = [
  { id: 'none', title: 'Newcomer', property: null, level: 1, fee: 0, pack: 8, income: 0, blurb: '' },
  { id: 'shack', title: 'Stand Keeper', property: "Ale's Stand", level: 1, fee: 0, pack: 20, income: 6, where: "the Merchants' Guild",
    blurb: "Your brother's little cabbage stand on the quay." },
  { id: 'store', title: 'Shopkeeper', property: 'Small Store', level: 3, fee: 300, pack: 40, income: 20, where: "the Merchants' Guild",
    blurb: 'Four walls, a door, shelves, and room to sell more than cabbages.' },
  { id: 'bigstore', title: 'Merchant', property: 'Bigger Store', level: 6, fee: 1200, pack: 70, income: 50, where: "the Merchants' Guild",
    blurb: 'Two floors and a dome. People in town know your name now.' },
  { id: 'addon', title: 'Merchant of Note', property: 'Store Add-on', level: 8, fee: 2500, pack: 100, income: 90, where: "the Merchants' Guild",
    blurb: 'A warehouse and a rooftop terrace. Time to ask Xi about a ship.' },
  { id: 'ship', title: 'Captain', property: 'Your Ship', level: 10, fee: 5000, pack: 160, income: 0, where: 'Xi, in the palace',
    blurb: 'A ship of your own, granted by the Steward. Chapter One is complete.' },
];
for (const r of RANKS) r.name = r.title;

// Levels 1-10 from experience (XP). Each level opens something.
export const LEVELS = [0, 20, 60, 120, 200, 300, 420, 560, 720, 900];
export const UNLOCKS = {
  1: 'Market Run, Cargo Hold, Gull Patrol; Ale\'s house and stand',
  2: 'Trading with ships; Bones and Twenty-One; the Salted Kraken (inside)',
  3: 'Small Store; the Merchants\' Guild (inside)',
  4: 'Glass Kiln; the Transmuters\' workshop (inside)',
  5: 'Alley Chase; the Adventurers\' Guild (inside)',
  6: 'Bigger Store; the Mariners\' Guild (inside)',
  7: 'Ward Keeper; someone will be waiting at Ale\'s house tonight',
  8: 'Store Add-on; the palace',
  9: '',
  10: 'Ask Xi for a ship',
};
export function level(xp = state.renown) { let l = 1; LEVELS.forEach((need, i) => { if (xp >= need) l = i + 1; }); return l; }
export const atLevel = (n) => level() >= n;

// A trader's character sheet (D&D 5e): ability scores and skills you're proficient in.
const SHEET = {
  scores: { STR: 8, DEX: 14, CON: 10, INT: 12, WIS: 13, CHA: 15 },
  proficient: ['Persuasion', 'Insight', 'Sleight of Hand'],
  proficiency: 2,
};
export const SKILLS = {
  Persuasion: 'CHA', Deception: 'CHA', Intimidation: 'CHA', Insight: 'WIS', Perception: 'WIS',
  'Sleight of Hand': 'DEX', Acrobatics: 'DEX', Athletics: 'STR', Investigation: 'INT',
};

// Saves live in this browser (localStorage), in three slots. The game autosaves into the slot you're playing.
// (Older single saves move into Slot 1 the first time.)
const OLD_KEY = 'lavine-sultans-rest-save-v2';
export const SLOTS = 3;
export const slotKey = (n) => `lavine-sultans-rest-slot-${n}`;
const LAST = 'lavine-sultans-rest-last-slot';
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private window: no saving */ } };
if (get(OLD_KEY) && !get(slotKey(1))) { put(slotKey(1), get(OLD_KEY)); put(OLD_KEY, null); put(LAST, '1'); }
export let slot = Math.min(SLOTS, Math.max(1, parseInt(get(LAST) || '1', 10) || 1));

const fresh = () => ({
  gold: 10, pack: {}, rank: 1, renown: 0, reputation: { merchants: 0, mariners: 0, transmuters: 0, adventurers: 0, palace: 0 },
  sheet: structuredClone(SHEET), day: 1, minute: 8 * 60, // 8:00 in the morning
  best: {}, played: {}, flags: {}, shopName: "Ale's Cabbages", log: [], spent: 0, earned: 0, haggled: {},
  name: null, race: null, clues: [],
});

export const state = load(slot) || fresh();

function load(n) {
  try {
    const raw = get(slotKey(n));
    if (!raw) return null;
    return Object.assign(fresh(), JSON.parse(raw));
  } catch { return null; }
}
export function save() {
  state.savedAt = Date.now();
  put(slotKey(slot), JSON.stringify(state));
  put(LAST, String(slot));
}
export function resetGame() {
  put(slotKey(slot), null);
  Object.assign(state, fresh());
}
// What's in a slot, for the title menu: null if empty.
export function slotSummary(n) {
  try {
    const raw = get(slotKey(n));
    if (!raw) return null;
    const s = JSON.parse(raw);
    let lv = 1; while (lv < LEVELS.length && (s.renown || 0) >= LEVELS[lv]) lv++;
    return { name: s.name || 'Unnamed', race: s.race, level: lv, day: s.day || 1, rank: RANKS[s.rank || 1]?.title, gold: s.gold, savedAt: s.savedAt, started: !!s.flags?.intro };
  } catch { return null; }
}
// Pick a slot to play (a new game wipes it first). The page reloads, since the city is built from the save.
export function useSlot(n, { wipe = false } = {}) {
  if (wipe) put(slotKey(n), null);
  put(LAST, String(n));
  try { sessionStorage.setItem('lavine-go', '1'); } catch { /* fine */ }
  location.reload();
}
export function deleteSlot(n) { put(slotKey(n), null); }

export const rank = () => RANKS[state.rank];
export const nextRank = () => RANKS[state.rank + 1] || null;
export const atLeast = (id) => state.rank >= RANKS.findIndex(r => r.id === id);
export const packCount = () => Object.values(state.pack).reduce((s, n) => s + n, 0);
export const packRoom = () => rank().pack - packCount();

export function mod(ability) { return Math.floor((state.sheet.scores[ability] - 10) / 2); }
export function skillBonus(skill) {
  const ab = SKILLS[skill];
  return mod(ab) + (state.sheet.proficient.includes(skill) ? state.sheet.proficiency : 0);
}

// Things that happen get a line in your journal (shown on the character sheet).
export function note(text) {
  state.log.unshift(`Day ${state.day}, ${clock()}: ${text}`);
  state.log.length = Math.min(state.log.length, 40);
}

// XP (still called renown in the code). Reaching a new level announces itself.
export function addRenown(n, why) {
  const before = level();
  state.renown += n;
  if (why) note(`+${n} XP (${why})`);
  const after = level();
  if (after > before) {
    note(`Reached level ${after}`);
    dispatchEvent(new CustomEvent('lavine:levelup', { detail: { level: after } }));
  }
}

export function clock(minute = state.minute) {
  const h = Math.floor(minute / 60) % 24, m = Math.floor(minute % 60);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
export const isNight = () => state.minute < 6 * 60 || state.minute >= 20 * 60;
export const marketOpen = () => state.minute >= 7 * 60 && state.minute < 19 * 60;
