// Crafting and enchanting at the Transmuters' Guild: a way to turn goods into dearer goods.
//  - Crafting (level 3): combine goods by a recipe; the crafted goods are worth more than what went in.
//    A small fee for the workshop and half an hour of your time.
//  - Enchanting (level 5): raise a crafted good one level at a time (up to 3), each level worth about half
//    as much again. Each level needs a fee and a reagent (a Ward Charm, Kraken Ink, a Black Pearl), an hour.
// Crafted and enchanted goods sell best at your own stand and to the ships; the stalls pay little for them.
// Recipes and prices are first guesses (Claude's); change freely.
import { state, level, note, save } from './state.js';
import { GOODS, LANDS } from './economy.js';
import { updateStatus, toast } from './ui.js';

LANDS['your workshop'] = 'center';
// The crafted goods (added to the game's list of goods).
const MADE = {
  pickles:  { name: 'Pickled Cabbage', base: 12, kind: 'crafted', color: '#9fbf5a' },
  spicerum: { name: 'Spiced Rum', base: 24, kind: 'crafted', color: '#a85a1f' },
  tincture: { name: 'Moonleaf Tincture', base: 32, kind: 'crafted', color: '#5fbfa0' },
  scarf:    { name: 'Saffron Silk Scarf', base: 64, kind: 'crafted', color: '#e0702a' },
  lantern:  { name: 'Glass Lantern', base: 52, kind: 'crafted', color: '#e7c35a' },
  cliplock: { name: 'Clockwork Lock', base: 66, kind: 'crafted', color: '#8a6a2a' },
  chest:    { name: 'Ebony Strongbox', base: 84, kind: 'crafted', color: '#3a2a20' },
  necklace: { name: 'Black Pearl Necklace', base: 150, kind: 'crafted', color: '#1e2030' },
  stew:     { name: "Zahra's Cabbage Stew", base: 13, kind: 'crafted', color: '#a8743a' },
};
for (const [k, g] of Object.entries(MADE)) GOODS[k] = { ...g, from: 'your workshop' };

export const RECIPES = [
  { out: 'pickles', n: 2, needs: { cabbage: 4, cumin: 1 }, level: 3, fee: 2 },
  { out: 'spicerum', n: 2, needs: { rum: 2, saffron: 1 }, level: 3, fee: 4 },
  { out: 'tincture', n: 2, needs: { moonleaf: 2, glass: 1 }, level: 4, fee: 5 },
  { out: 'lantern', n: 1, needs: { glass: 2, tools: 1 }, level: 4, fee: 6 },
  { out: 'scarf', n: 1, needs: { silk: 1, saffron: 1 }, level: 5, fee: 6 },
  { out: 'cliplock', n: 1, needs: { gears: 1, lock: 2 }, level: 5, fee: 8 },
  { out: 'chest', n: 1, needs: { ebony: 2, lock: 1 }, level: 6, fee: 10 },
  { out: 'necklace', n: 1, needs: { pearls: 2, silk: 1 }, level: 7, fee: 15 },
  { out: 'stew', n: 3, needs: { cabbage: 3, carrot: 1, tomato: 1 }, level: 8, fee: 2, flag: 'zahraStew' },   // taught by Zahra (sidequests.js)
];
const ENCHANT = [null, { reagent: 'charm', fee: 10, mark: 'I' }, { reagent: 'ink', fee: 25, mark: 'II' }, { reagent: 'pearls', fee: 50, mark: 'III' }];
export const CRAFT_LEVEL = 3, ENCHANT_LEVEL = 5;

// An enchanted good is its own entry: 'lantern+2' = Glass Lantern, enchanted twice.
const baseOf = (key) => key.split('+')[0];
const levelOf = (key) => +(key.split('+')[1] || 0);
function enchantedGood(key) {
  if (GOODS[key]) return GOODS[key];
  const b = GOODS[baseOf(key)], lv = levelOf(key);
  if (!b) return null;
  return (GOODS[key] = { ...b, name: `${b.name} (${ENCHANT[lv].mark})`, base: Math.round(b.base * Math.pow(1.55, lv)), kind: 'enchanted', from: 'your workshop' });
}
// Enchanted goods in a save need their entries before anything shows them.
for (const key of Object.keys(state.pack || {})) if (key.includes('+')) enchantedGood(key);

const have = (g) => state.pack[g] || 0;
const leave = { label: 'Leave' };
const passTime = (minutes) => { state.minute += minutes; state.awake = (state.awake || 0) + minutes; };

function make(r) {
  for (const [g, n] of Object.entries(r.needs)) { state.pack[g] -= n; if (!state.pack[g]) delete state.pack[g]; }
  state.gold -= r.fee; state.spent += r.fee;
  state.pack[r.out] = have(r.out) + r.n;
  passTime(30);
  note(`Crafted ${r.n} ${GOODS[r.out].name}`);
  save(); updateStatus();
  toast(`You made ${r.n} ${GOODS[r.out].name} (worth about ${GOODS[r.out].base} gold each).`, 3500);
}
const canMake = (r) => level() >= r.level && state.gold >= r.fee && Object.entries(r.needs).every(([g, n]) => have(g) >= n);

export function craftNode(label) {
  const needs = (r) => Object.entries(r.needs).map(([g, n]) => `${n} ${GOODS[g].name} (${have(g)})`).join(', ');
  const options = RECIPES.filter(r => !r.flag || state.flags[r.flag]).map(r => ({
    label: `Make ${r.n} ${GOODS[r.out].name}`,
    hint: level() < r.level ? `level ${r.level}` : `${needs(r)} · ${r.fee} gold`,
    disabled: !canMake(r),
    do: () => { make(r); return craftNode(label); },
  }));
  return { name: `${label} · the workshop`, text: ['"Mix what you bring, pay for the fire, and take away something better. Half an hour a batch." (In brackets: how many you have.)'], options: [...options, leave] };
}

export function enchantNode(label) {
  const options = [];
  for (const key of Object.keys(state.pack)) {
    const lv = levelOf(key), base = GOODS[baseOf(key)];
    if (!base || base.from !== 'your workshop' || lv >= 3) continue;
    const step = ENCHANT[lv + 1], next = `${baseOf(key)}+${lv + 1}`;
    const after = enchantedGood(next);
    const ok = have(step.reagent) >= 1 && state.gold >= step.fee;
    options.push({
      label: `Enchant ${GOODS[key].name} to ${step.mark}`,
      hint: `1 ${GOODS[step.reagent].name} (${have(step.reagent)}) · ${step.fee} gold · then worth about ${after.base}`,
      disabled: !ok,
      do: () => {
        state.pack[key]--; if (!state.pack[key]) delete state.pack[key];
        state.pack[step.reagent]--; if (!state.pack[step.reagent]) delete state.pack[step.reagent];
        state.gold -= step.fee; state.spent += step.fee;
        state.pack[next] = have(next) + 1;
        passTime(60);
        note(`Enchanted a ${base.name} to ${step.mark}`);
        save(); updateStatus();
        toast(`${after.name}: worth about ${after.base} gold now.`, 3500);
        return enchantNode(label);
      },
    });
  }
  const text = ['"Only things made in our workshop take an enchantment. One at a time, one level at a time, three at most. Bring the reagent: a Ward Charm for the first, Kraken Ink for the second, a Black Pearl for the third."'];
  if (!options.length) text.push('(You carry nothing that can be enchanted yet. Craft something first.)');
  return { name: `${label} · enchanting`, text, options: [...options.slice(0, 8), leave] };
}
