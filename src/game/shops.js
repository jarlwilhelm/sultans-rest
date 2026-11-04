// Who works in the walk-in shops of Sultan's Rest (where they are: ../shoplist.js, ../shops.js), and the curio
// dealer's gamble. Samira and Doss are the named tailor and barber (quests.js NAMED, npcs.js named()).
// Every name, line and price here is a DRAFT by Claude.
import { state, level, note, save, atLeast, packRoom } from './state.js';
import { GOODS, LANDS, STALL_KINDS } from './economy.js';
import { trade, toast, updateStatus, rollCheck } from './ui.js';
import { makeRng } from '../noise.js';

const leave = { label: 'Leave' };
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const node = (name, text, options = [leave]) => ({ name, text, options });

// What the three trade shops sell (they buy anything, like a stall, and pay best for their own goods).
STALL_KINDS.smith = { name: 'smithy', goods: ['lock', 'tools', 'gears'] };
STALL_KINDS.apothecary = { name: 'apothecary', goods: ['balm', 'moonleaf', 'tincture'] };
STALL_KINDS.bakery = { name: 'bakery', goods: ['bread', 'dates', 'grain'] };

export const KEEPERS = {
  smith: { title: 'Gorrim the smith', role: 'adventurer', race: 'dwarf',
    hello: ['"Mind the anvil. It minds nobody."', '"A lock, a hinge, a nail? I make all three, and none of them break."', '"Your brother bought a lock from me once. Best one I ever made. Didn\'t help him, did it." He looks away.'] },
  apothecary: { title: 'Mirela the apothecary', role: 'scribe', race: 'gnome', body: 'Female_Peasant',
    hello: ['"Desert balm for burns, moonleaf for the fever. Nothing for broken hearts. People ask."', '"Don\'t touch the blue jar."', '"Sylvenwood moonleaf is getting scarce. The war. Buy it while you can."'] },
  bakery: { title: 'Hassan the baker', role: 'local', race: 'human',
    hello: ['"Bread at dawn, gone by noon. You\'re lucky."', '"Eldorian grain, Sultanate dates, and my grandmother\'s oven. That\'s the whole secret."', '"Flour on your coat is good luck. I\'m very lucky."'] },
  curio: { title: 'Fennick the curio dealer', role: 'merchant', race: 'halfling',
    hello: ['"Everything here has a story. Some of the stories are even true."'] },
};

export function keeperTalk(npc) {
  const k = KEEPERS[npc.id];
  const who = npc.label || k.title;
  if (npc.id === 'curio') return curioTalk(who);
  const m = { id: `shop-${npc.id}`, type: 'stall', kind: npc.id };
  const options = atLeast('shack')
    ? [{ label: 'Trade', do: () => { trade(m, { title: who, where: `the ${STALL_KINDS[npc.id].name}` }); return 'keep'; } }]
    : [{ label: 'Trade', disabled: true, hint: 'Needs a Shack Stand (deeds at the Merchants\' Guild)' }];
  return node(who, [pick(k.hello)], [...options, leave]);
}

// ---------- The curio dealer ----------
// Three curios a day from all over Lavine, each with an asking price. What each is REALLY worth is hidden: often
// less, sometimes much more (a gamble, the user's idea). Look one over (Investigation) for a hint. Bought curios
// are goods you can sell anywhere; your own stand pays best.
const CURIOS = [
  ['A brass astrolabe from the Dezfulian Empire', 'Its rings still turn. One of them points at a star you don\'t recognise.', 40, 160],
  ['A dragon scale, or a painted shield-boss', 'Red, and warm to the touch. Or warm from the window.', 60, 400],
  ['An elven music box from Sylvenwood', 'It plays three notes and stops. The fourth is missing.', 30, 120],
  ['A dwarven gear-watch from Iron Peak', 'It ticks backwards. Fennick swears that\'s on purpose.', 50, 220],
  ['A kraken\'s beak', 'Black, hooked, as long as your forearm. It smells of the deep.', 40, 180],
  ['A vampire noble\'s silver cup', 'From the Crimson Nightfall. Something has been scrubbed off the inside.', 50, 260],
  ['A pirate\'s map of Solitude Haven', 'An X, a skull, and a note in the margin: "not here, idiot".', 15, 90],
  ['A glass apple made by the Transmuters', 'Perfect, down to the bruise.', 25, 110],
  ['A tiefling ward-lantern, cracked', 'It still glows violet if you hold it close.', 30, 150],
  ['An Eldorian harvest crown of woven wheat', 'Dry as paper. Smells of summer.', 10, 60],
  ['A carved ebony idol from the Dreadfort', 'Its eyes have been gouged out. Neatly.', 40, 200],
  ['A sealed letter, two hundred years old', 'Addressed to a King of Meridia. Meridia has no kings.', 20, 300],
  ['A compass that points at the sea', 'Wherever you stand, it finds the nearest water.', 30, 140],
  ['A fan of Dezfulian silk, painted with cranes', 'One crane is facing the wrong way.', 20, 100],
  ['A broken sword hilt with a red gem', 'The gem might be glass. The hilt is definitely old.', 35, 250],
  ['A jar of sand from the bottom of the passage', 'It glitters faintly violet. Fennick won\'t say who dived for it.', 15, 120],
  ['A gnome\'s clockwork bird', 'It sings when wound, badly, and pecks at your fingers.', 25, 130],
  ['A Meridian Exchange ledger page', 'Prices from fifty years ago. Bread cost a copper.', 10, 70],
  ['A dried mermaid\'s comb', 'Almost certainly a fishbone. Almost.', 15, 140],
  ['A stone tablet in a dead language', 'Heavy. Fennick reads one word of it and won\'t say which.', 50, 300],
];
const COLORS = ['#b8862c', '#7a4ab0', '#3a6fa8', '#8a2a1a', '#2f9c9a', '#6b4a2c', '#b77cff', '#d9b24a'];

LANDS['the curio dealer'] = 'center';
const curios = () => (state.curios ??= {});
function register(key, c) { GOODS[key] = { name: c.name, base: c.base, from: 'the curio dealer', kind: 'curio', color: c.color }; }
for (const [k, c] of Object.entries(curios())) register(k, c);

// Today's three, the same all day (from the day number).
function today() {
  const r = makeRng(9000 + state.day * 7);
  const idx = [];
  while (idx.length < 3) { const i = Math.floor(r() * CURIOS.length); if (!idx.includes(i)) idx.push(i); }
  return idx.map((i, slot) => {
    const [name, desc, lo, hi] = CURIOS[i];
    const ask = Math.round((lo + (hi - lo) * r()) * (1 + Math.min(level(), 12) * 0.08));
    // The real worth: often less, sometimes much more.
    const roll = r();
    const f = roll < 0.35 ? 0.3 + r() * 0.4 : roll < 0.8 ? 0.8 + r() * 0.6 : roll < 0.97 ? 1.6 + r() * 1.0 : 4 + r();
    return { slot, name, desc, ask, worth: Math.max(2, Math.round(ask * f)), color: COLORS[i % COLORS.length] };
  });
}
const shopDay = () => { const s = state.curioShop; return s && s.day === state.day ? s : (state.curioShop = { day: state.day, bought: [], looked: {} }); };

function curioTalk(who) {
  const day = shopDay();
  const items = today().filter(c => !day.bought.includes(c.slot));
  const text = [pick(KEEPERS.curio.hello), items.length ? '"Today\'s treasures. Prices are firm. Values are... a matter of opinion."' : '"Sold out! Come back tomorrow, there\'s always more. I don\'t know where it comes from either."'];
  const options = items.map(c => ({ label: `${c.name}: ${c.ask} gold`, hint: c.desc, do: () => curioItem(who, c) }));
  return node(who, text, [...options, leave]);
}
function curioItem(who, c) {
  const day = shopDay();
  const looked = day.looked[c.slot];
  return node(who, [c.desc, `"${c.ask} gold. Not a copper less."`, ...(looked ? [looked] : [])], [
    { label: `Buy it (${c.ask} gold)`, disabled: state.gold < c.ask || packRoom() < 1, hint: packRoom() < 1 ? 'your pack is full' : '', do: () => buyCurio(who, c) },
    { label: 'Look it over carefully', hint: looked ? 'already done' : 'Investigation, DC 13', disabled: !!looked, do: async () => {
      const r = await rollCheck('Investigation', 13);
      day.looked[c.slot] = !r.success ? '(You turn it over and over. You honestly can\'t tell what it\'s worth.)'
        : c.worth > c.ask * 1.3 ? '(You\'re fairly sure it\'s worth more than he\'s asking. He may not know what he has.)'
          : c.worth < c.ask * 0.8 ? '(Something about it is off. You suspect it\'s worth less than he\'s asking.)'
            : '(About what he\'s asking, as far as you can tell.)';
      save();
      return curioItem(who, c);
    } },
    { label: 'Something else', do: () => curioTalk(who) },
    leave,
  ]);
}
function buyCurio(who, c) {
  const day = shopDay();
  state.gold -= c.ask; state.spent += c.ask;
  const key = `curio${state.day}_${c.slot}`;
  curios()[key] = { name: c.name, base: c.worth, color: c.color };
  register(key, curios()[key]);
  state.pack[key] = (state.pack[key] || 0) + 1;
  day.bought.push(c.slot);
  note(`Bought ${c.name} for ${c.ask} gold (worth about ${c.worth})`);
  save(); updateStatus();
  const verdict = c.worth >= c.ask * 2 ? 'A real find. Fennick is going to kick himself.' : c.worth > c.ask ? 'Not bad at all.' : c.worth >= c.ask * 0.8 ? 'About what you paid.' : 'You\'ve been had. A little.';
  toast(`${c.name}: worth about ${c.worth} gold.`, 5000);
  return node(who, ['He wraps it in old silk and takes your gold with both hands.',
    `Out in the light, you look at it properly: worth about ${c.worth} gold, you'd guess. You paid ${c.ask}. ${verdict}`,
    '(It\'s in your pack. Sell it anywhere; your own stand pays best.)']);
}
