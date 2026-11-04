// Conversations. Every line here that isn't from your guide is a placeholder of mine, meant to be
// replaced with your own words (Xi's especially, and Redman's).
import { state, rank, nextRank, RANKS, atLeast, atLevel, level, addRenown, note, save, marketOpen, isNight, clock } from './state.js';
import { STALL_KINDS, GOODS, tipOfTheDay } from './economy.js';
import { talk, trade, rollCheck, toast, updateStatus, closePanel, askText, chapterEnd } from './ui.js';
import { play } from '../minigames/index.js';
import { REDMAN, shopTalk } from './story.js';
import { questOption, questEvent, NAMED, setPlayHelpers } from './quests.js';
import { dailyOption, shiftDone } from './daily.js';
import { craftNode, enchantNode, CRAFT_LEVEL, ENCHANT_LEVEL } from './craft.js';
import { firstMeeting } from './redman.js';
import { meridiaTalk } from '../meridia/talk.js';
import { checkContracts, contractOptions } from './contracts.js';
import { caseyLuck, spouseMorning, spouseGossip } from './marriage.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const leave = { label: 'Leave' };
const profitRenown = (profit) => { const r = Math.floor(profit / 10); if (r > 0) addRenown(r, 'a profitable sale'); };

// After a mini-game, pay out and say how it went.
// Gambling tables keep a tally per day: hands played and what you've won from them.
const TABLE_HANDS = 25, TABLE_WIN = 150;
function tally(name) {
  state.gamble ??= {};
  const t = state.gamble[name];
  return t && t.day === state.day ? t : (state.gamble[name] = { day: state.day, hands: 0, net: 0 });
}
export function tableOpen(name) { const t = tally(name); return t.hands < TABLE_HANDS && t.net < TABLE_WIN; }
function tableOpts(name) { const t = tally(name); return { gold: state.gold, handsLeft: TABLE_HANDS - t.hands, winRoom: TABLE_WIN - t.net }; }

// Most a single run of each job can pay (early jobs pay pocket change, later ones much more).
const PAY_CAP = { 'Market Run': 10, 'Cargo Hold': 10, 'Gull Patrol': 10, 'Glass Kiln': 35, 'Alley Chase': 70, 'Ward Keeper': 150 };
async function runGame(name, opts, who) {
  closePanel(true);
  const gambling = name === 'Bones' || name === 'Twenty-One';
  // Work pays by how advanced the job is (capped per run), takes an hour, and pays half from the third
  // run of the same job in one day ("the quartermaster has less work for you"). docs/chapter-one-v2.md
  // Worked out inside the mini-game, before its results card, so the card shows the real pay.
  const pay = (r) => {
    const today = state.shifts?.day === state.day ? state.shifts : (state.shifts = { day: state.day, n: {} });
    const n = (today.n[name] || 0) + 1;
    r = { ...r };
    if (r.gold > 0) {
      const cap = PAY_CAP[name];
      if (cap != null && r.gold > cap) { r.gold = cap; r.summary = (r.summary || '') + ` (The most this job pays is ${cap} gold.)`; }
      if (n >= 3) { r.gold = Math.floor(r.gold / 2); r.summary = (r.summary || '') + ' (Third shift today: half pay.)'; }
    }
    return caseyLuck(r, PAY_CAP[name]);                       // married to Casey: sometimes the best pay (marriage.js)
  };
  const res = await play(name, gambling ? tableOpts(name) : { ...opts, pay });
  if (!res) return;
  if (gambling) { const t = tally(name); t.hands += res.hands || 0; t.net += res.gold || 0; }
  else {
    const today = state.shifts?.day === state.day ? state.shifts : (state.shifts = { day: state.day, n: {} });
    today.n[name] = (today.n[name] || 0) + 1;
    state.minute += 60; state.awake = (state.awake || 0) + 60;
  }
  if (res.gold) { state.gold += res.gold; state.earned += res.gold; }
  if (res.renown) addRenown(res.renown, `${name}${res.score != null ? `, score ${res.score}` : ''}`);
  if (res.rep) for (const [k, v] of Object.entries(res.rep)) state.reputation[k] = (state.reputation[k] || 0) + v;
  state.played[name] = (state.played[name] || 0) + 1;
  if (res.score != null && (state.best[name] == null || res.score > state.best[name])) state.best[name] = res.score;
  save(); updateStatus();
  if (res.summary) toast(res.summary, 4000);
  questEvent('game', { name, result: res });
  if (!gambling) shiftDone(name, res);
  import('./items.js').then(m => m.checkSpecials(name, res));
  void who;
  return res;
}

// Start a job from something in the world (the Customs House door in Meridia).
export const playJob = (name, opts = {}) => runGame(name, opts);

// ---------- Stallkeepers ----------
function stall(npc) {
  const m = { id: npc.stall.id, type: 'stall', kind: npc.stall.kind };
  const kind = STALL_KINDS[m.kind];
  const name = `${npc.label} · ${kind.name}`;
  if (!marketOpen()) return { name, text: [pick(['We\'re closed, friend. Come back after sunrise.', 'Market\'s shut. The guards don\'t like trade after dark.'])], options: [leave] };
  const greet = pick([
    `Welcome, welcome! Finest ${kind.goods.map(g => GOODS[g].name.toLowerCase()).join(', ')} this side of the Fringe.`,
    'Looking, or buying? Looking is free. Buying is better.',
    'Ships came in this morning. Prices are... reasonable. For you.',
  ]);
  const h = state.haggled[m.id];
  const haggledToday = h && h.day === state.day;
  const options = [];
  if (atLeast('shack')) {
    options.push({ label: 'Trade', do: () => { trade(m, { title: name, where: `the ${kind.name}`, renownFor: profitRenown }); return 'keep'; } });
    options.push({
      label: haggledToday ? 'Haggle (already tried today)' : 'Haggle for better prices', hint: 'Persuasion, DC 13', disabled: haggledToday,
      do: async () => {
        const r = await rollCheck('Persuasion', 13);
        state.haggled[m.id] = { day: state.day, factor: r.success ? (r.roll === 20 ? 0.8 : 0.88) : 1.06 };
        return { name, text: [r.success ? pick(['Ah, you drive a hard bargain. Fine! For today only.', 'You remind me of my mother. Terrible. Fine, a better price.']) : pick(['Ha! No. And now it costs a little more.', 'You think I was born yesterday? Prices just went up.'])], options: [{ label: 'Trade', do: () => { trade(m, { title: name, where: `the ${kind.name}`, renownFor: profitRenown }); return 'keep'; } }, leave] };
      },
    });
    options.push({
      label: 'Size them up', hint: 'Insight, DC 12',
      do: async () => {
        const r = await rollCheck('Insight', 12);
        return { name, text: [r.success ? 'They glance at the harbor more than at you. Ships sell cheaper than stalls, and they know it.' : 'Their smile gives nothing away.'], options: [leave] };
      },
    });
  } else {
    options.push({ label: 'Trade', disabled: true, hint: 'Needs a Shack Stand' });
  }
  options.push({ label: 'Need a runner?', hint: 'Mini-game: Market Run', do: () => runGame('Market Run', { from: m.id }) });
  options.push(leave);
  return { name, text: [greet, atLeast('shack') ? '' : 'Trade with you? Get a stand of your own first: the Merchants\' Guild sells the deeds. But I always need a runner.'].filter(Boolean), options };
}

// ---------- Ship captains ----------
const SHIP_TALK = {
  'the Coastal Republic of Meridia': 'Meridia sends its regards. Well, Arthur does. The rest of us just want a drink.',
  Eldoria: 'Grain from the plains of Eldoria. The Elder\'s lands feed half the West.',
  Sylvenwood: 'We carry what the war left us. Moonleaf, mostly. Don\'t ask about the orcs.',
  'Iron Peak': 'Steam, gears and good iron. Durin\'s mountain makes nothing that breaks.',
  'the Sultanate': 'Home port. Nothing like Sultan\'s Rest at dusk.',
  'the Dreadfort of Ebony Desolation': 'You didn\'t see us. And we didn\'t see you. Agreed?',
  'the Vampiric Dominion of Crimson Nightfall': 'We sail by night and trade by day. The wine is... mostly wine.',
  'the Dezfulian Empire': 'From the Last Light in the East. Silk, and news of Dark Breaker if you have the coin.',
  'Solitude Haven': 'Pearls, honestly come by. Mostly. Belial and Fierna send no regards.',
  'the Tiefling Harbors (passage escort)': 'We keep the passage. The kraken keep everyone else honest.',
};
function wardOption() {
  const ok = atLevel(7);
  return { label: 'Help keep the wards lit', hint: ok ? 'Mini-game: Ward Keeper' : 'Level 7: the pilots only trust people of standing', disabled: !ok, do: () => runGame('Ward Keeper', {}) };
}
function ship(npc) {
  const m = { id: npc.ship.id, type: 'ship', land: npc.ship.land };
  const name = `${npc.label}`;
  const options = [];
  if (/Tiefling/.test(m.land)) options.push(wardOption());
  if (atLevel(2)) options.push({ label: 'Trade cargo', do: () => { trade(m, { title: `Ship from ${m.land.replace(/^the /, '')}`, where: shipName(m.land), renownFor: profitRenown }); return 'keep'; } });
  else options.push({ label: 'Trade cargo', disabled: true, hint: 'Level 2: captains only deal with traders they know' });
  options.push({ label: 'What do you want for cargo?', do: () => ({ name, text: [buyHint(m)], options: [leave] }) });
  options.push(leave);
  return { name, text: [SHIP_TALK[m.land] || 'Fair winds.'], options };
}
const shipName = (land) => `the ${land.replace(/^the /, '').replace(' (passage escort)', '').replace(/^(Coastal Republic of |Vampiric Dominion of |Dreadfort of )/, '')} ship`;
// A true trade tip (economy.js tipOfTheDay), the way the docks would tell it. DRAFT lines.
export function tradeTip() {
  const t = tipOfTheDay(), land = t.land.replace(/^the /, ''), g = GOODS[t.good].name.toLowerCase();
  return pick([
    `The captain from ${land} is short of ${g}. Paying a quarter over the odds, I heard. Today only, mind.`,
    `If you've got ${g}, take it to the ship from ${land}. They're begging for it today.`,
    `Word on the quay: ${land} wants ${g}, and wants it now. They'll pay for it.`,
  ]);
}
function buyHint(m) {
  const want = Object.entries(GOODS).filter(([, g]) => g.from !== m.land).map(([k, g]) => [k, g]);
  const far = want.filter(([, g]) => g.base > 15).slice(0, 4).map(([, g]) => g.name);
  return `Anything that isn't ours. Bring me ${far.join(', ')} and I'll pay well. Things from the far side of the sea pay best.`;
}

// ---------- Guilds ----------
// Buying the next deed: your stand, then stores, then the add-on. The ship comes from Xi.
async function buyDeed(npc, n) {
  state.gold -= n.fee; state.rank++;
  state.reputation.merchants += 2;
  if (n.id === 'store') {
    const name = await askText('Your store\'s sign', 'Keep Ale\'s name over the door, or give it a new one?', state.shopName);
    state.shopName = (name || state.shopName).slice(0, 28);
  }
  note(`Bought the ${n.property}`);
  save(); updateStatus();
  dispatchEvent(new CustomEvent('lavine:property'));
  toast(`${n.property}: yours! ${n.blurb}`, 6000);
  return { name: npc.label, text: [`The deed is yours. ${n.blurb}`, 'Go and see it: your plot on the quay, east of the market.'], options: [leave] };
}

function guild(npc) {
  const g = npc.guild;
  if (g === 'merchants') {
    const n = nextRank();
    const options = [];
    if (n && n.where === "the Merchants' Guild") {
      const ready = level() >= n.level, rich = state.gold >= n.fee;
      options.push({ label: `Buy the deed: ${n.property}`, hint: `Level ${n.level}, ${n.fee} gold`, disabled: !(ready && rich), do: () => buyDeed(npc, n) });
    }
    // Chapter Two: trade contracts between the two cities (contracts.js), once you've sailed to Meridia.
    if (state.flags.crossed && /Guildmaster/.test(npc.label)) options.push(...contractOptions('sultans_rest', npc.label));
    options.push({ label: 'How do I get ahead here?', do: () => ({ name: npc.label, text: [
      `Everyone starts with nothing. Then: ${RANKS.slice(1, 5).map(r => r.property).join(', then ')}. After that, only the Steward can give you a ship.`,
      'Gold and experience come from work around town (deliveries, loading ships, guild trials, bounties) and from trading.',
      n ? `For the ${n.property} you need level ${n.level} and ${n.fee} gold. You are level ${level()} with ${state.gold} gold.` : 'You have everything the guild can sell you.',
    ], options: [leave] }) });
    options.push(leave);
    return { name: npc.label, text: [`Ah, the owner of "${state.shopName}". What can the guild do for you?`], options };
  }
  if (g === 'mariners') {
    return { name: npc.label, text: ['Ships don\'t load themselves. Well, the dwarven ones nearly do. Pack a hold tight and I pay by the row.'], options: [
      { label: 'Load a ship', hint: 'Mini-game: Cargo Hold', do: () => runGame('Cargo Hold', {}) },
      leave,
    ] };
  }
  if (g === 'adventurers') {
    const ok = atLevel(5);
    return { name: npc.label, text: ['Bounties on the board. The small fry run when they\'re spotted; chase them down through the alleys before they lose you.', 'Redman Rillington? Hah. Nobody\'s collecting that one.'], options: [
      { label: 'Chase a bounty', hint: ok ? 'Mini-game: Alley Chase' : 'Level 5: the guild only trusts people it knows', disabled: !ok, do: () => runGame('Alley Chase', {}) },
      leave,
    ] };
  }
  if (g === 'transmuters') {
    const ok = atLevel(4);
    return { name: npc.label, text: ['By the blessing of the King\'s blood, sand becomes glass. Our trial is simple: keep the spark alive and turn the whole wall to glass.'], options: [
      { label: 'Take the trial', hint: ok ? 'Mini-game: Glass Kiln' : 'Level 4', disabled: !ok, do: () => runGame('Glass Kiln', {}) },
      { label: 'Use the workshop (craft goods)', hint: atLevel(CRAFT_LEVEL) ? 'combine goods into dearer ones' : `Level ${CRAFT_LEVEL}`, disabled: !atLevel(CRAFT_LEVEL), do: () => craftNode(npc.label) },
      { label: 'Enchant something you made', hint: atLevel(ENCHANT_LEVEL) ? 'worth more with every level' : `Level ${ENCHANT_LEVEL}`, disabled: !atLevel(ENCHANT_LEVEL), do: () => enchantNode(npc.label) },
      leave,
    ] };
  }
  return { name: npc.label, text: ['...'], options: [leave] };
}

// ---------- Xi ----------
function steward(npc) {
  const n = nextRank();
  const options = [];
  if (n && n.id === 'ship') {
    options.push({
      label: 'Petition the Steward for a ship', hint: `Level ${n.level}, ${n.fee} gold`, disabled: !(level() >= n.level && state.gold >= n.fee),
      do: () => {
        state.gold -= n.fee; state.rank++; state.flags.ship = true; state.reputation.palace += 5;
        import('./items.js').then(m => m.give('hat:captain', 'your own ship'));
        note('Granted a ship by Xi'); save(); updateStatus();
        dispatchEvent(new CustomEvent('lavine:property'));
        questEvent('flag');
        closePanel(true);
        chapterEnd();
        return 'keep';
      },
    });
  }
  options.push({ label: 'Ask about the King', do: () => ({ name: npc.label, text: ['"King Shou rules from the capital. Sultan\'s Rest is his harbor, and he has trusted it to me."', '[Placeholder line]'], options: [leave] }) });
  options.push(leave);
  const text = atLevel(8)
    ? ['"A merchant with a store on my quay. Speak, and be brief; the line behind you is long."', '[Placeholder: Xi\'s voice is yours to write.]']
    : ['A guard steps between you and the dais. "The Steward hears merchants of standing. Come back when your name is on a proper store."'];
  return { name: npc.label, text, options };
}

// ---------- The inn ----------
function inn(npc) {
  return { name: npc.label, text: [isNight() ? 'Late one, eh? Bed\'s five gold.' : 'A bed for the night? Five gold. Sleep well, wake rich.'], options: [
    { label: 'Sleep until morning (5 gold)', disabled: state.gold < 5, do: () => { closePanel(true); import('./rest.js').then(r => { if (r.sleepUntilMorning('inn', newDay)) state.gold -= 5; }); return 'keep'; } },
    { label: 'Deal me in (Twenty-One)', hint: !atLevel(2) ? 'Level 2' : tableOpen('Twenty-One') ? `Cards at the bar (you have ${state.gold} gold)` : 'Closed to you until tomorrow', disabled: !atLevel(2) || state.gold < 5 || !tableOpen('Twenty-One'), do: () => runGame('Twenty-One', {}) },
    { label: 'Need help with anything?', hint: 'Mini-game: Gull Patrol', do: () => ({ name: npc.label, text: ['"The gulls. Always the gulls. My fish is drying on the racks out back and they come in flocks. Here, take the sling."'], options: [
      { label: 'Guard the fish racks', do: () => runGame('Gull Patrol', {}) }, leave] }) },
    leave,
  ] };
}
export function sleep() {
  state.day++;
  state.minute = 7 * 60;
  newDay();
  save(); updateStatus();
}

// Things that happen at the start of each day.
export function newDay() {
  collectLoan();
  checkContracts();
  spouseMorning();
  import('../meridia/watch.js').then(w => w.morningWatch());
  const inc = rank().income;
  if (inc > 0) {
    const take = Math.round(inc * (0.8 + Math.random() * 0.4));
    state.gold += take; state.earned += take;
    note(`"${state.shopName}" earned ${take} gold`);
    toast(`Day ${state.day}: "${state.shopName}" earned ${take} gold yesterday.`, 4000);
  } else toast(`Day ${state.day}. Prices have changed.`, 3000);
}

// ---------- Bones ----------
function bones(npc) {
  return { name: npc.label, text: ['"Sit, sit. Bones is simple: bet, call the dice, don\'t cry."'], options: [
    { label: 'Play Bones', hint: !atLevel(2) ? 'Level 2' : tableOpen('Bones') ? `Mini-game (you have ${state.gold} gold)` : 'Closed to you until tomorrow', disabled: !atLevel(2) || state.gold < 5 || !tableOpen('Bones'), do: () => runGame('Bones', {}) },
    leave,
  ] };
}

// ---------- Guards and the crowd ----------
const RUMORS = [
  'They say Redman Rillington has walked through this market a hundred times. Nobody knows his face, so who\'d know?',
  'A hundred thousand gold for Redman. You could buy a ship. You could buy ten.',
  'The kraken were bad this season. Only the tieflings\' passage is safe.',
  'Iron Peak sent a steamship last week. Black smoke, no sails. Unnatural.',
  'Elves from Sylvenwood keep coming through on their way to Meridia. The war\'s bad up there.',
  'Xi hears petitions every day. Says no to most of them.',
  'The Transmuters can turn sand into glass with a touch. The King\'s blood, they say.',
  'Never take a deal from a devil. Never. Not even a good one.',
];
const ROLE_LINES = {
  sailor: ['Three weeks at sea and the first thing I see is your face. Lucky me.', 'Mind the ropes.'],
  dockhand: ['Out of the way, crate coming through!', 'Heavy day. Heavy every day.'],
  merchant: ['Best prices are on the ships, if you can get aboard.', 'Buy low, sell to someone from far away.'],
  adventurer: ['Looking at the bounty board? Leave Grukka to me.', 'Got a spare potion? No? Then move.'],
  traveler: ['Just passing through. Everyone is.', 'Which way to the Salted Kraken?'],
  pilot: ['Stay inside the violet lights. Always.', 'The passage costs what it costs. The kraken cost more.'],
  local: ['Glory to King Shou.', 'Mind the camels.', 'You\'re not from here.'],
  shopper: ['Saffron\'s gone up again.', 'Have you seen the silk on the Dezfulian ship?'],
  guard: ['Move along.', 'Report any sighting of the man on those posters.', 'Trouble? No? Good.', 'Customs found something in a crate of Meridian rum last month. The Steward hasn\'t smiled since.'],
  scribe: ['Petitions to the left. Complaints to the sea.'],
};
// What people say about the great and the strange, by where you are: the people of a place talk most about
// their own (in Sultan's Rest, the Steward Xi), and a little about the rest of the world. Chapter Two adds
// Meridia's own list. All DRAFT lines by Claude.
export const PLACE = 'sultans_rest';
const ABOUT = {
  sultans_rest: {
    who: 'the Steward',
    lines: [
      'Xi? Fair. Hard, but fair. You get one petition a season. Make it a good one.',
      'The lamp in the palace burns all night. The Steward doesn\'t sleep, they say. Or doesn\'t trust the night.',
      'King Shou rules from the capital, but this harbor is Xi\'s. Everyone knows it. The King knows it too.',
      'I saw Xi on the quay once, at dawn. No guards. Just looking at the ships. Then gone.',
      'Bribe the Steward? Someone tried. They swim very well now, I hear. Long way from here.',
      'Xi remembers every face that ever stood in that hall. Every one. Don\'t give him a reason to remember yours.',
    ],
  },
};
const WIDER = [
  'In Meridia the people offered Arthur a crown. He told them to keep it. Mad, or the only honest man in the West.',
  'Arthur speaks for the whole Republic, and still eats in the same tavern as the dockhands. So the Meridians say.',
  'The Meridians argue about everything, except Arthur.',
];
// Levinite, hinted at, never explained in Chapter One.
const HUSHED = [
  'My cousin\'s boy lost a month\'s wages in one night. Swears he only blinked, and then it was morning.',
  'There\'s a man on the Grand Pier who watched the sun go down and didn\'t move till it came up again. Didn\'t remember a thing, he said.',
  'Some of the Meridian sailors sleep all at once, a whole night gone in a breath. Others don\'t sleep at all. Don\'t ask them why.',
  'If someone offers you a little vial of violet glass, walk away. Then forget you saw it.',
];
function crowd(npc) {
  const role = npc.role || 'local';
  const here = ABOUT[PLACE];
  return { name: npc.label, text: [Math.random() < 0.35 ? shopTalk() : pick(ROLE_LINES[role] || ROLE_LINES.local)], options: [
    { label: 'Heard any news?', do: () => { const r = Math.random(), g = spouseGossip(); return { name: npc.label, text: [g && r < 0.3 ? g : r < 0.35 ? tradeTip() : r < 0.47 ? pick(HUSHED) : r < 0.57 ? pick(WIDER) : pick(RUMORS)], options: [leave] }; } },
    { label: `What do people make of ${here.who}?`, do: () => ({ name: npc.label, text: [pick(here.lines)], options: [leave] }) },
    ...(role === 'pilot' ? [wardOption()] : []),
    leave,
  ] };
}

// ---------- Named townsfolk ----------
function named(npc) {
  const n = NAMED[npc.id];
  const shop = npc.id === 'tailor' ? [{ label: 'Browse clothes, hats and things to carry', do: () => { closePanel(true); import('../wardrobe.js').then(w => w.openWardrobe('tailor')); return 'keep'; } }]
    : npc.id === 'barber' ? [{ label: 'A haircut (colour, beard)', do: () => { closePanel(true); import('../wardrobe.js').then(w => w.openWardrobe('barber')); return 'keep'; } }] : [];
  return { name: n.title, text: [n.idle[Math.floor(Math.random() * n.idle.length)]], options: [
    ...shop,
    ...(npc.id === 'rashid' ? loanOptions(npc) : []),
    { label: 'Heard any news?', do: () => ({ name: n.title, text: [pick(RUMORS)], options: [leave] }) },
    leave,
  ] };
}

// ---------- Rashid's loans ----------
// Money to start with, at a price: borrow by level, pay back a fifth more within a week. Late, and his man
// collects from your purse in the morning (and the Merchants' Guild hears of it). DRAFT lines.
const LOAN_SIZES = [0, 60, 120, 200, 300, 450, 650, 900, 1200, 1600, 2000];
const LOAN_DAYS = 7, LOAN_RATE = 0.2;
function loanOptions(npc) {
  const L = state.loan;
  const who = NAMED[npc.id].title;
  if (L) {
    const left = L.due - state.day;
    return [{ label: `Pay back the loan (${L.owe} gold)`, hint: left >= 0 ? `due in ${left} day${left === 1 ? '' : 's'}` : 'late!', disabled: state.gold < L.owe,
      do: () => { state.gold -= L.owe; state.spent += L.owe; note(`Paid Rashid back ${L.owe} gold`); delete state.loan; state.reputation.merchants += 1; save(); updateStatus();
        return { name: who, text: ['He counts it twice, and smiles for the first time. "On time. You\'re your brother\'s sibling after all. Come back whenever you need me."'], options: [leave] }; } }];
  }
  const size = LOAN_SIZES[Math.min(level(), LOAN_SIZES.length - 1)];
  const owe = Math.round(size * (1 + LOAN_RATE));
  return [{ label: `Borrow ${size} gold`, hint: `pay back ${owe} within ${LOAN_DAYS} days`,
    do: () => ({ name: who, text: [`"${size} gold. You bring me ${owe} within ${LOAN_DAYS} days. If you don't, I come to you, and I take it from whatever you have. Agreed?"`], options: [
      { label: 'Agreed', do: () => { state.loan = { owe, due: state.day + LOAN_DAYS }; state.gold += size; note(`Borrowed ${size} gold from Rashid (pay back ${owe} by day ${state.day + LOAN_DAYS})`); save(); updateStatus();
        return { name: who, text: ['He counts the coins into your hand. "Buy cheap. Sell dear. And remember the day."'], options: [leave] }; } },
      { label: 'Not today', do: () => ({ name: who, text: ['"Wise, perhaps. The offer stands."'], options: [leave] }) },
    ] }) }];
}
// In the morning: a late loan gets collected.
function collectLoan() {
  const L = state.loan;
  if (!L || state.day <= L.due) return;
  const take = Math.min(state.gold, L.owe);
  state.gold -= take; L.owe -= take;
  state.reputation.merchants = Math.max(0, state.reputation.merchants - 2);
  note(`Rashid's man collected ${take} gold for a late loan${L.owe > 0 ? ` (${L.owe} still owed)` : ''}`);
  toast(`Rashid's man was waiting at your door: he took ${take} gold for the late loan.${L.owe > 0 ? ` You still owe ${L.owe}.` : ''}`, 7000);
  if (L.owe <= 0) delete state.loan; else L.owe = Math.round(L.owe * 1.05);
}

// ---------- Redman (level 8) ----------
// He tells you Ale was part of something bigger (story.js REDMAN; DRAFT lines).
function stranger(npc) {
  const text = [...REDMAN, '"He left one last letter. The pilots have it: the one with silver in her horns. Get it before someone else does, and take it to the Steward. Xi owes him that much."'];
  return { name: 'A traveler in a plain cloak', text, options: [
    { label: '"Who are you?"', do: () => redmanEnd(npc, '"A friend of your brother\'s. That will have to do." He presses a coin into your palm. It has no face stamped on it.') },
    { label: '"Who killed him?"', do: () => redmanEnd(npc, '"I don\'t know. Not yet. But I will. I owe him that." He presses a coin into your palm. It has no face stamped on it.') },
    { label: 'Look closer at him', hint: 'Perception, DC 20', do: async () => {
      const r = await rollCheck('Perception', 20);
      return redmanEnd(npc, r.success ? 'You try to fix his face in your memory. Brown eyes? Grey? It slides away like water.' : 'You blink, and he is three steps ahead, already part of the crowd.');
    } },
  ] };
}
function redmanEnd(npc, line) {
  state.flags.metRedman = true;
  import('./items.js').then(m => m.give('held:coin', 'a gift from a stranger'));
  if (!state.clues.includes('redman')) state.clues.push('redman');
  note('A stranger told you Ale was part of something bigger');
  questEvent('flag');
  npc.onGone?.();
  // His purse of faceless coins and his question (redman.js). He leaves once you've answered.
  const node = firstMeeting('A traveler in a plain cloak', [line]);
  const after = 'Only later, passing a wanted poster with no picture on it, does it occur to you who he must have been.';
  node.options = node.options.map(o => o.do ? { ...o, do: async () => { const r = await o.do(); return r && r.text ? { ...r, text: [...r.text, after] } : r; } } : o);
  return node;
}

export function interact(npc) {
  const by = {
    stall, ship, guild, steward, inn, bones, crowd, guard: crowd, stranger, named, meridia: meridiaTalk,
  }[npc.kind] || crowd;
  const node = by(npc);
  // Whoever the story needs next gets an extra option, just before "Leave".
  const extra = npc.kind !== 'stranger' && questOption(questKey(npc), npc.label);
  if (extra && node.options) node.options.splice(Math.max(0, node.options.length - 1), 0, extra);
  // Today's trade notices: deliver to whoever posted the order.
  const order = dailyOption(npc);
  if (order && node.options) node.options.splice(Math.max(0, node.options.length - 1), 0, order);
  talk(node);
}

// Which story character this is.
function questKey(npc) {
  if (npc.kind === 'named' || npc.kind === 'meridia') return npc.id;
  if (npc.kind === 'guild') return { merchants: /Guildmaster/.test(npc.label) ? 'guildmaster' : 'clerk', transmuters: 'transmuter', adventurers: 'bounty', mariners: 'mariners' }[npc.guild];
  return npc.kind;
}

export { clock };

// The story can send you to play a game for something (the barkeep's hand of Twenty-One).
setPlayHelpers(() => closePanel(true), async (name, test, onWin, label, loseLine) => {
  const res = await runGame(name, {});
  if (res && test(res)) talk(onWin());
  else talk({ name: label, text: [loseLine], options: [leave] });
});
