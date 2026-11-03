// Things you can wear and carry: outfits, clothing dyes, hats, one held item, and hair at the barber.
// Some you buy (some only from a level), some you earn in the story, and a few "specials" you
// have to do something hard for. Names, prices and levels are first guesses (Claude's).
import { state, level, save, note } from './state.js';
import { toast } from './ui.js';

// how: 'buy' (at the tailor, outfitter or barber), 'story' (earned), 'special' (a challenge).
export const ITEMS = {
  // Outfits (the body you wear). The one you chose at the start is always yours.
  'outfit:men_Farmer': { slot: 'base', value: 'men_Farmer', name: 'Farmer\'s clothes', how: 'buy', price: 20, level: 1 },
  'outfit:women_Medieval': { slot: 'base', value: 'women_Medieval', name: 'Townswoman\'s dress', how: 'buy', price: 20, level: 1 },
  'outfit:men_Worker': { slot: 'base', value: 'men_Worker', name: 'Dock worker\'s gear (him)', how: 'buy', price: 20, level: 1 },
  'outfit:women_Worker': { slot: 'base', value: 'women_Worker', name: 'Dock worker\'s gear (her)', how: 'buy', price: 20, level: 1 },
  'outfit:men_Adventurer': { slot: 'base', value: 'men_Adventurer', name: 'Adventurer\'s leathers (him)', how: 'buy', price: 60, level: 3 },
  'outfit:women_Adventurer': { slot: 'base', value: 'women_Adventurer', name: 'Adventurer\'s leathers (her)', how: 'buy', price: 60, level: 3 },
  'outfit:women_Witch': { slot: 'base', value: 'women_Witch', name: 'Robes of the passage', how: 'buy', price: 120, level: 5 },
  'outfit:men_King': { slot: 'base', value: 'men_King', name: 'Noble\'s robes', how: 'buy', price: 600, level: 9 },
  // Dyes (the colour of your clothes).
  'dye:0': { slot: 'hue', value: 0, name: 'Undyed', how: 'buy', price: 0, level: 1 },
  'dye:0.08': { slot: 'hue', value: 0.08, name: 'Saffron dye', how: 'buy', price: 15, level: 1 },
  'dye:0.3': { slot: 'hue', value: 0.3, name: 'Moss dye', how: 'buy', price: 15, level: 1 },
  'dye:0.45': { slot: 'hue', value: 0.45, name: 'Harbor teal dye', how: 'buy', price: 15, level: 1 },
  'dye:0.58': { slot: 'hue', value: 0.58, name: 'Sea blue dye', how: 'buy', price: 15, level: 2 },
  'dye:0.9': { slot: 'hue', value: 0.9, name: 'Crimson dye', how: 'buy', price: 25, level: 4 },
  'dye:0.78': { slot: 'hue', value: 0.78, name: 'Royal purple dye', how: 'buy', price: 80, level: 8 },
  // Hats.
  'hat:none': { slot: 'hat', value: null, name: 'No hat', how: 'buy', price: 0, level: 1 },
  'hat:turban': { slot: 'hat', value: 'turban', name: 'Turban', how: 'buy', price: 10, level: 1 },
  'hat:fez': { slot: 'hat', value: 'fez', name: 'Fez', how: 'buy', price: 30, level: 2 },
  'hat:widebrim': { slot: 'hat', value: 'widebrim', name: 'Wide-brimmed hat', how: 'buy', price: 50, level: 4 },
  'hat:feathercap': { slot: 'hat', value: 'feathercap', name: 'Feathered cap', how: 'buy', price: 80, level: 6 },
  'hat:circlet': { slot: 'hat', value: 'circlet', name: 'Gold circlet', how: 'buy', price: 300, level: 9 },
  'hat:straw': { slot: 'hat', value: 'straw', name: 'Ale\'s straw hat', how: 'story', hint: 'Mrs. Haddad has something of Ale\'s for you' },
  'hat:captain': { slot: 'hat', value: 'captain', name: 'Captain\'s hat', how: 'story', hint: 'Comes with a ship' },
  'hat:gullfeather': { slot: 'hat', value: 'gullfeather', name: 'Golden gull feather', how: 'special', hint: 'Survive five flocks in Gull Patrol' },
  // One thing in your hand.
  'held:none': { slot: 'held', value: null, name: 'Empty hands', how: 'buy', price: 0, level: 1 },
  'held:stick': { slot: 'held', value: 'stick', name: 'Walking stick', how: 'buy', price: 8, level: 1 },
  'held:torch': { slot: 'held', value: 'Torch', name: 'Torch', how: 'buy', price: 25, level: 2 },
  'held:book': { slot: 'held', value: 'Book1_Closed', name: 'A ledger of your own', how: 'buy', price: 40, level: 3 },
  'held:dagger': { slot: 'held', value: 'Dagger', name: 'Dagger', how: 'buy', price: 90, level: 5 },
  'held:sword': { slot: 'held', value: 'Sword', name: 'Sword', how: 'buy', price: 200, level: 7 },
  'held:cabbage': { slot: 'held', value: 'Lettuce_Harvested', name: 'A cabbage, proudly', how: 'story', hint: 'Pick your first cabbage' },
  'held:coin': { slot: 'held', value: 'Coin', name: 'The faceless coin', how: 'story', hint: 'A gift from a stranger' },
  'held:tongs': { slot: 'held', value: 'tongs', name: 'Golden tongs', how: 'special', hint: 'Clear three walls in the Glass Kiln' },
  'held:krakentooth': { slot: 'held', value: 'tooth', name: 'Kraken-tooth charm', how: 'special', hint: 'Hold the wards for six waves' },
  // The barber: hair colour, beard.
  ...Object.fromEntries(['#1a1410', '#3a2618', '#6a4a2a', '#a87a3a', '#d9c08a', '#8a2a1a', '#e8e4dc', '#555555', '#2f6b5a', '#4b1f6b']
    .map((c, i) => [`hair:${c}`, { slot: 'hair', value: c, name: ['Black', 'Dark brown', 'Brown', 'Chestnut', 'Sandy blond', 'Red', 'White', 'Grey', 'Sea green', 'Royal violet'][i], how: 'barber', price: i >= 8 ? 40 : 10, level: i >= 8 ? 4 : 1 }])),
  'beard:on': { slot: 'beard', value: true, name: 'Grow a beard', how: 'barber', price: 10, level: 1 },
  'beard:off': { slot: 'beard', value: false, name: 'Clean shave', how: 'barber', price: 5, level: 1 },
};

export const owned = (id) => {
  const it = ITEMS[id];
  if (!it) return false;
  if (it.how === 'barber') return false;            // a service: you pay every time
  if ((it.price === 0 && it.how === 'buy') || (state.owned || []).includes(id)) return true;
  if (it.slot === 'base' && state.look?.base === it.value) return true;
  return false;
};
export const equipped = (id) => { const it = ITEMS[id]; const v = state.look?.[it.slot]; return (v ?? null) === (it.value ?? null); };

export function give(id, why) {
  state.owned ??= [];
  if (state.owned.includes(id)) return;
  state.owned.push(id);
  note(`Earned: ${ITEMS[id].name}${why ? ' (' + why + ')' : ''}`);
  save();
  toast(`New for your wardrobe: ${ITEMS[id].name}. Change at Ale's wardrobe.`, 6000);
}

export function buy(id) {
  const it = ITEMS[id];
  if (level() < (it.level || 1)) return `Opens at level ${it.level}.`;
  if (state.gold < it.price) return 'Not enough gold.';
  state.gold -= it.price; state.spent += it.price;
  if (it.how !== 'barber') { state.owned ??= []; state.owned.push(id); }
  save();
  return null;
}

export function wear(id) {
  const it = ITEMS[id];
  state.look = { ...state.look, [it.slot]: it.value };
  save();
  dispatchEvent(new CustomEvent('lavine:look'));
}

// Specials, checked after every mini-game.
export function checkSpecials(name, res) {
  if (name === 'Gull Patrol' && (res.flocks || 0) >= 5) give('hat:gullfeather', 'five flocks of gulls');
  if (name === 'Ward Keeper' && (res.waves || 0) >= 6) give('held:krakentooth', 'six waves at the wards');
  if (name === 'Glass Kiln' && (res.walls || 0) >= 3) give('held:tongs', 'three walls of glass');
}
