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
export const LEVELS = [0, 20, 60, 120, 200, 300, 420, 560, 720, 900, 1100, 1330, 1590, 1880, 2200, 2550, 2930, 3340, 3780, 4250];   // levels 11-20: Chapter Two
export const UNLOCKS = {
  1: 'Market Run, Cargo Hold, Gull Patrol; Ale\'s house and stand',
  2: 'Trading with ships; Bones and Twenty-One; the Salted Kraken (inside)',
  3: 'Small Store; the Merchants\' Guild (inside); crafting at the Transmuters\' workshop',
  4: 'Glass Kiln; the Transmuters\' workshop (inside)',
  5: 'Alley Chase; the Adventurers\' Guild (inside); enchanting at the Transmuters\'',
  6: 'Bigger Store; the Mariners\' Guild (inside)',
  7: 'Ward Keeper; someone will be waiting at Ale\'s house tonight',
  8: 'Store Add-on; the palace',
  9: '',
  10: 'Ask Xi for a ship',
  11: 'Meridia: a room at the inn, a pop-up stand, trade contracts at the Exchange',
  12: 'A house of your own in Meridia; a warehouse bay',
  13: 'A store in Meridia; a bigger hold for your ship',
  14: 'The forger will hear you out',
  15: 'Marriage: courting, and Redman can find you someone',
  16: 'A bigger store; the back room',
  17: 'A townhouse',
  18: 'The merchant houses\' biggest contracts',
  19: '',
  20: 'Whatever Redman has been waiting for',
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
  gold: 10, pack: {}, rank: 1, renown: 0, reputation: { merchants: 0, mariners: 0, transmuters: 0, adventurers: 0, palace: 0, exchange: 0 },
  sheet: structuredClone(SHEET), day: 1, minute: 8 * 60, // 8:00 in the morning
  best: {}, played: {}, flags: {}, shopName: "Ale's Cabbages", log: [], spent: 0, earned: 0, haggled: {},
  name: null, race: null, clues: [],
});

// For trying Chapter Two without playing Chapter One first: open the game at http://localhost:8770/?start=meridia
// (2026-11-04, the user's ask). It makes a save at the start of Chapter Two in the first EMPTY slot (never
// overwrites one): your latest character's name and looks, Chapter One finished, level 11, a ship, standing in
// Meridia's harbor. With no empty slot it says so and does nothing.
// Walk around one city with the save you continue (this computer only; 2026-11-04, the user wanted a link for each):
// http://localhost:8770/?go=sultans_rest or ?go=meridia moves your current save to that city's harbor, then
// the address goes back to normal.
(function goTo() {
  let to = null;
  try { if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return; to = new URLSearchParams(location.search).get('go'); } catch { return; }
  if (to !== 'meridia' && to !== 'sultans_rest') return;
  try { history.replaceState(null, '', location.pathname); } catch { /* fine */ }
  const s = load(slot);
  if (!s) return;
  s.place = to; s.arrived = to;
  put(slotKey(slot), JSON.stringify(s));
})();
(function chapterTwoStart() {
  let want = null;
  try { want = new URLSearchParams(location.search).get('start'); } catch { return; }
  if (want !== 'meridia') return;
  try { history.replaceState(null, '', location.pathname); } catch { /* fine */ }
  const empty = [1, 2, 3].find(n => !get(slotKey(n)));
  if (!empty) { alert('All three save slots are in use. Delete one (Load Game) to make room for the Chapter Two start.'); return; }
  const you = load(slot);
  const s = fresh();
  Object.assign(s, {
    name: you?.name || 'Traveler', race: you?.race || 'Human', look: you?.look || null, shopName: you?.shopName || "Ale's Cabbages",
    rank: 5, renown: 1100, gold: 1500, day: 30, minute: 10 * 60, place: 'meridia', storyVersion: 2,
    pack: { saffron: 15, silk: 6, glass: 10, cumin: 10, grain: 12 },
    flags: { intro: true, ship: true, crossed: true, metRedman: true, purse: true, palacePass: true, xiKnows: true, letter: true },
    quests: Object.fromEntries(['cabbages', 'night', 'forty', 'package', 'noface', 'third', 'noface2', 'letters', 'ship'].map(id => [id, { step: 0, done: true }])),
    clues: ['inn', 'ledger', 'transmuter', 'bounty', 'garden', 'pilot', 'redman', 'xi'],
    coins: 3, owned: ['hat:straw', 'hat:captain', 'held:coin', 'keep:purse'],
    log: ['Day 30: Chapter One finished (a Chapter Two start save, made for testing).'],
  });
  if (!s.look) s.look = { race: 'human', base: 'Male_Peasant', skin: '#c68642', hair: '#3a2618', hue: 0 };
  put(slotKey(empty), JSON.stringify(s));
  put(LAST, String(empty));
  slot = empty;
})();

export const state = load(slot) || fresh();

function load(n) {
  try {
    const raw = get(slotKey(n));
    if (!raw) return null;
    return Object.assign(fresh(), JSON.parse(raw));
  } catch { return null; }
}
// Outfits retired on 2026-11-03 (hard hats, overalls): what saves and wardrobes become.
// The rest of the older outfits followed the same day (robes and rangers).
const RETIRED = { men_Worker: 'Male_Peasant', women_Worker: 'Female_Peasant', men_Farmer: 'Male_Peasant',
  men_Adventurer: 'Male_Ranger', women_Adventurer: 'Female_Ranger', women_Medieval: 'Female_Robe', women_Witch: 'Female_Robe', men_King: 'Male_Robe' };
const RETIRED_ITEMS = { 'outfit:men_King': 'outfit:noble_him' };
function upgrade(s) {
  if (s.look?.base === 'men_King') s.look.trim = 'gold';
  if (s.look && RETIRED[s.look.base]) s.look.base = RETIRED[s.look.base];
  if (s.owned) s.owned = [...new Set(s.owned.map(id => RETIRED_ITEMS[id] || (id.startsWith('outfit:') && RETIRED[id.slice(7)] ? 'outfit:' + RETIRED[id.slice(7)] : id)))];
  return s;
}
upgrade(state);

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
// What you can carry: your property's size (RANKS.pack), plus your ship's hold upgrades (Chapter Two, the Exchange).
export const capacity = () => rank().pack + (state.holdBonus || 0);
export const packRoom = () => capacity() - packCount();

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
