// The main quest of Chapter One, step by step, and the people in it.
// Every line here is a DRAFT by Claude, written to fit the guide: rewrite freely.
import { state, level, note, save, addRenown, nextRank, RANKS } from './state.js';
import { toast, updateStatus, rollCheck, talk } from './ui.js';
import { QUESTS_2, CHOICES_2, side } from '../meridia/story.js';
// Which city you're in (Chapter Two's quests only count in Meridia).
const here = () => state.place || 'sultans_rest';

// People with names (where they stand is in buildings.js).
export const NAMED = {
  haddad: { name: 'Mrs. Haddad', role: 'local', race: 'human', x: -44, z: 11.5, ry: Math.PI * 0.2, title: "Mrs. Haddad, Ale's best customer",
    idle: ['"Every week, three cabbages. Your brother never once let me pay full price."', '"You have his eyes. Has anyone told you that? Everyone, I suppose."'] },
  nyra: { name: 'Nyra', role: 'pilot', race: 'tiefling', x: 3.4, z: -24, ry: -Math.PI / 2, title: 'Nyra, harbor pilot',
    idle: ['"Stay inside the violet lights. Always."', '"The passage costs what it costs."'] },
  tailor: { name: 'Samira', role: 'merchant', race: 'elf', x: 16, z: 42.5, ry: 0, title: 'Samira the tailor',
    idle: ['"A merchant is judged by their coat before their coin."', '"Ale wore the same straw hat for nine years. I offered to burn it for him."'] },
  barber: { name: 'Doss', role: 'local', race: 'dwarf', x: -16, z: 42.5, ry: 0, title: 'Doss the barber',
    idle: ['"Sit. Don\'t move. I have sharp things."', '"A good beard is a dwarf\'s second fortune."'] },
  rashid: { name: 'Rashid', role: 'merchant', race: 'human', x: 9.5, z: 58, ry: Math.PI / 2, title: 'Rashid the moneylender',
    idle: ['"Everyone in this city owes me something. Except your brother. Odd man."', '"Interest is just patience with a price on it."'] },
};

// Quest steps: what to do (shown in the log and on the compass), where, and how it's done. (docs/chapter-one-v2.md)
// done by: { talk: npcKey } (a conversation option), { choices } (a conversation with several ways through),
// { reach }, { read }, { reads: [ids] } (all of them), { have: [good, n] }, { sell: n } (at your own stand),
// { game: [name, test] }, { flag }, { gate: rank } (own that property), { follow } / { overhear } (sneak.js).
// hidden: no compass marker until you "Ask around" in your journal (hint says what asking turns up).
// hours: [from, to]: it only happens then (24-hour clock).
const RASHID_INFO = ['"Your brother? Borrow? Never. You have it backwards. He paid ME, to change coin for him. Forty gold a month, always in new palace coin."',
  'He sets a coin on the table between you. It has no face stamped on it, only the Sultanate\'s seal. "Coin like this doesn\'t come from cabbages."'];
export const QUESTS = [
  { id: 'cabbages', title: "Ale's Cabbages", level: 1, steps: [
    { text: "Visit Ale's house (east of the main avenue, blue door)", x: -40, z: 63, reach: true },
    { text: 'Read the letter on his shelf', x: -36.7, z: 69, read: 'unsent' },
    { text: "Pick three cabbages in Ale's garden (out the back door)", x: -40, z: 76, have: ['cabbage', 3] },
    { text: 'Open the stand on the quay: sell three goods to your customers', x: -50, z: 15, sell: 3 },
    { text: 'Mrs. Haddad has been watching you sell. Talk to her', npc: 'haddad', talk: true, say: [
      'An old woman with a market basket has been watching you all morning. "You\'re the sibling. Of course you are. You sell like him: too cheap."',
      '"Ale sold me three cabbages every week for nine years. Best in the harbor. Bring me three from his garden, would you? Like he used to. It would mean something."'] },
    { text: 'Bring Mrs. Haddad three cabbages from the garden', npc: 'haddad', talk: true, take: ['cabbage', 3], gold: 6, xp: 12, say: [
      'She turns a cabbage over in her hands for a long time. "He grew them just like this. Tight, heavy. A good heart grows a good cabbage, he said."',
      '"Keep the stand open. People will come. And they\'ll talk to you, the way they talked to him." She presses a few coins on you, and won\'t take them back.',
      'As you turn to go, she holds out a battered straw hat. "His. He left it at my house the week before. It should be yours."'], reward: 'hat:straw' },
  ] },
  { id: 'night', title: 'The Night Before', level: 2, steps: [
    { text: 'Ask the barkeep of the Salted Kraken about Ale (he doesn\'t gossip for free)', npc: 'inn', choices: 'barkeep' },
    { text: 'Find the pilot with silver rings in her horns. The pilots gather on the Grand Pier at dusk (6 to 9 pm)', npc: 'nyra', talk: true, hidden: true, hours: [18, 21],
      hint: 'A sailor at the Kraken: "Silver rings? That\'s Nyra. End of the Grand Pier, when the sun goes down."', xp: 10, say: [
      'The pilot\'s eyes flick to your face and away. "Ale. Yes. I knew him." She goes back to checking her lantern.',
      '"I don\'t talk about my passengers, or my friends, to strangers. Come back when the harbor knows your name."'] },
    { text: 'Two dockhands are whispering behind the crates at the foot of the Grand Pier. Get close without being seen, and listen', x: 9, z: 3.5, overhear: true, xp: 10 },
  ] },
  { id: 'forty', title: 'Forty Gold', level: 3, steps: [
    { gate: 2, text: 'Buy the Small Store (deeds at the Merchants\' Guild)' },
    { text: "Read Ale's ledger, on the table in his house", x: -39.6, z: 68.2, read: 'ledger', clue: 'ledger' },
    { text: 'Who is "R."? Someone who lends money. Find him', npc: 'rashid', choices: 'rashid', hidden: true,
      hint: 'The Guildmaster: "R.? Forty gold, regular as tides? Only one man lends like clockwork. Rashid, up the main avenue."' },
    { text: '"Red sail, third bell." Be at the end of the Grand Pier in the morning (8 to 11 am), and follow whoever comes off that ship, unseen', x: 0, z: -46, follow: true, hours: [8, 11], xp: 20 },
  ] },
  { id: 'package', title: 'The Package', level: 4, steps: [
    { text: 'The courier went into the Transmuters\' Guild. Talk to the Master Transmuter', npc: 'transmuter', choices: 'transmuter', clue: 'transmuter' },
    { text: "Search Ale's house for a hiding place: behind things, under things", x: -36.6, z: 69.5, read: 'hollow', hidden: true,
      hint: 'You remember Ale as a boy, hiding sweets behind the shelf where your mother never looked.' },
    { text: 'Tell the Master Transmuter the hiding place was empty', npc: 'transmuter', talk: true, xp: 15, setFlag: 'breakin', say: [
      '"Empty." The Transmuter sets down their tongs. "Then someone got there before you. Someone who knew where to look."',
      '"And if they knew where to look, they know where you sleep. Be careful."'] },
    { text: "Go home to Ale's house", x: -40, z: 66, reach: true, arrive: ['The blue door stands open. You left it shut.', 'Inside, the house has been turned over: drawers out, the chair on its back, papers everywhere. The ledger is gone from the table.'] },
    { text: 'Look over the mess: whoever did this left three traces', x: -40, z: 66, reads: ['clay', 'thread', 'lockmarks'], xp: 15 },
    { text: 'Buy a new lock (the crafts stalls in the market sell them)', x: 8, z: 19, have: ['lock', 1] },
    { text: "Fit the new lock on Ale's front door", x: -40, z: 63.5, reach: true, take: ['lock', 1], setFlag: 'lockFitted', xp: 10,
      arrive: ['You fit the new lock and turn the key twice. It is a small thing. It helps.'] },
  ] },
  { id: 'noface', title: 'No Face', level: 5, steps: [
    { text: 'Ask the bounty master about a man in a gray coat with blue clay on his boots (Adventurers\' Guild)', npc: 'bounty', talk: true, clue: 'bounty', say: [
      '"Gray coat, blue clay? Dock clay. That\'s one of the alley rats who work the market. Picks locks for hire."',
      '"Your brother came in here once too. Didn\'t want work. Asked how a bounty gets paid when nobody knows the man\'s face." He shrugs. "Catch your rat and we\'ll talk."'] },
    { text: 'Catch the man in the gray coat in the alleys (Alley Chase, at the bounty master)', x: 64, z: 12, game: ['Alley Chase', r => r.caught > 0] },
    { text: 'You caught him. He has Ale\'s ledger. Decide what to do with him (the bounty master is waiting)', npc: 'bounty', choices: 'burglar' },
  ] },
  { id: 'third', title: 'Under the Third Row', level: 6, steps: [
    { text: "Ale's letter said: \"Don't sell the third row, it's not ready yet.\" Look in the garden", x: -36.8, z: 78.4, read: 'stone', clue: 'garden', xp: 15, hidden: true,
      hint: 'Re-reading the letter on his shelf, you notice the garden has exactly three rows. The third is the one by the wall.' },
  ] },
  { id: 'noface2', title: 'The Man With No Face', level: 7, steps: [
    { gate: 3, text: 'Buy the Bigger Store (the town should know your name)' },
    { text: 'Go home to Ale\'s house after dark. Someone is waiting.', x: -40, z: 63, flag: 'metRedman', xp: 25 },
  ] },
  { id: 'letters', title: 'Sealed Letters', level: 8, steps: [
    { gate: 4, text: 'Buy the Store Add-on (become a merchant of note)' },
    { text: 'Find Nyra, the pilot with silver in her horns, on the Grand Pier', npc: 'nyra', talk: true, say: [
      '"So he found you. Of course he did." Nyra looks out at the violet lights. "Ale paid me to carry letters through the wards. Sealed. No names."',
      '"I kept the last one. The kraken have been bad. Help me keep the wards lit for a night, and it\'s yours."'] },
    { text: 'Help the pilots keep the wards lit (Ward Keeper: survive two waves)', x: 3.4, z: -24, game: ['Ward Keeper', r => r.waves >= 2] },
    { text: 'Go back to Nyra', npc: 'nyra', talk: true, xp: 20, letter: true, say: [
      '"You\'re steadier than you look." She takes an envelope from inside her coat. The wax seal is the Sultanate\'s. It is addressed, in Ale\'s hand: To the Steward.',
      '"The last one he gave me. He died before I sailed. I never knew who to give it to. Now I do."'] },
    { text: 'Bring Ale\'s letter to Xi, in the palace', npc: 'steward', talk: true, xp: 30, xiLetter: true },
  ] },
  { id: 'ship', title: 'A Ship of Your Own', level: 10, steps: [
    { text: 'Petition Xi for a ship (level 10 and 5,000 gold)', npc: 'steward', flag: 'ship', x: 135, z: -36 },
  ] },
  // Chapter Two: Meridia (meridia/story.js).
  ...QUESTS_2,
];

// The conversations with choices (a step's `choices`). Each returns the panel to show; `done()` finishes the step.
const CHOICES = {
  ...CHOICES_2,
  barkeep: (label, done) => {
    const info = () => { done(); return { name: label, text: [
      '"Ale? Quiet man. Kind. Always paid his tab." He wipes the same spot on the bar for a while.',
      '"He was in here the night before the fever took him. Right as rain. Laughing, even. Fevers don\'t come on like that."',
      '"He left around dusk, with somebody off the pier. One of the pilots. Silver rings in her horns."'], options: [{ label: 'Leave' }] }; };
    return { name: label, text: ['"Information\'s thirsty work," the barkeep says, not looking at you.'], options: [
      { label: 'Buy a round for the bar', hint: '5 gold', disabled: state.gold < 5, do: () => { state.gold -= 5; updateStatus(); return info(); } },
      { label: '"Play me for it." (a hand of Twenty-One)', hint: 'win one hand', do: () => { closePanelSoon(); playFor('Twenty-One', r => r.score > 0, info, label, 'He sweeps the cards up. "Come back when your luck does."'); return 'keep'; } },
      { label: '"Ale was my brother."', hint: 'Persuasion, DC 12', do: async () => {
        const r = await rollCheck('Persuasion', 12);
        return r.success ? info() : { name: label, text: ['"Lot of people say they\'re somebody\'s brother." He turns away to serve someone else.'], options: [{ label: 'Leave' }] };
      } },
      { label: 'Leave' },
    ] };
  },
  rashid: (label, done) => {
    const info = (extra = []) => { done(); return { name: label, text: [...RASHID_INFO, ...extra], options: [{ label: 'Leave' }] }; };
    return { name: label, text: ['The moneylender looks you over the way he looks at a coin. "Well?"'], options: [
      { label: '"I\'m Ale\'s sibling. I want to know about his debts."', do: () => info() },
      { label: '"Ale owed me money. I\'ve come to collect."', hint: 'Deception, DC 13', do: async () => {
        const r = await rollCheck('Deception', 13);
        if (r.success) return info(['He lowers his voice. "If he owed you, you\'d better ask the palace mint. That\'s the only place coin this new comes from."']);
        state.flags.rashidWary = true; save();
        return info(['"Don\'t lie to a moneylender. We can smell it." He tells you anyway, coldly, and you can tell he won\'t forget it.']);
      } },
      { label: 'Put 20 gold on his table: "for his memory"', hint: '20 gold', disabled: state.gold < 20, do: () => { state.gold -= 20; updateStatus(); return info(['He pockets the gold without counting it. "A pleasure."']); } },
      { label: 'Leave' },
    ] };
  },
  transmuter: (label, done) => ({ name: label, text: ['The Master Transmuter studies your face. "You have his eyes."'], options: [
    { label: '"I followed a courier here off a red-sailed ship. What did he bring you?"', do: () => { state.flags.confrontedTransmuter = true; done(); return { name: label, text: [
      'A long pause. "Glass. Only glass, this time." The Transmuter does not blink. "Your brother brought me things too. Small. Heavy for their size. I never opened one."',
      '"He left something with you, I\'d wager. A package. Look. Behind things. Under things. He liked hiding places."'], options: [{ label: 'Leave' }] }; } },
    { label: '"Did my brother leave anything with you?"', do: () => { done(); return { name: label, text: [
      '"With me? No. But I think he meant to leave something with you. A package. Small. Heavy for its size."',
      'You say no. "Then look. Behind things. Under things. He liked hiding places."'], options: [{ label: 'Leave' }] }; } },
    { label: 'Leave' },
  ] }),
  burglar: (label, done) => {
    const after = ['He pulls a yellowed poster from a drawer. REDMAN RILLINGTON. No likeness. The reward is a tenth of what it is now.',
      '"Twenty years old, that one. Look at the margin." In faded ink, in a hand you know from the ledger: "A. asked." Your brother wrote on it.'];
    return { name: label, text: ['The man in the gray coat sits on a crate, sullen, your brother\'s ledger in his lap. "Took it for a job. Nothing personal."'], options: [
      { label: 'Turn him in to the guard', hint: 'the bounty: 60 gold', do: () => {
        state.flags.burglarJailed = true; state.flags.ledgerStolen = false; state.gold += 60; state.earned += 60;
        state.reputation.palace = (state.reputation.palace || 0) + 2; done();
        return { name: label, text: ['The guard drags him off toward the palace cells. You get your brother\'s ledger back, and the bounty.', ...after], options: [{ label: 'Leave' }] };
      } },
      { label: '"Tell me who hired you, and you can go."', do: () => {
        state.flags.burglarFree = true; state.flags.ledgerStolen = false; done();
        return { name: label, text: ['He hands you the ledger. "A man paid me. Paid well. I never saw his face. Nobody does. The docks call him the Tallyman." Then he\'s gone, fast, the way you\'d expect.', ...after], options: [{ label: 'Leave' }] };
      } },
    ] };
  },
};

// Play a game for something; on a win, the reward panel opens.
let closePanelSoon = () => {};
let playFor = () => {};
export function setPlayHelpers(close, play) { closePanelSoon = close; playFor = play; }

// ---------- State helpers ----------
const qs = () => (state.quests ??= {});
export const questState = (id) => qs()[id] || { step: 0, done: false };
const Q = Object.fromEntries(QUESTS.map(q => [q.id, q]));
// Saves from before the Chapter One rewrite: keep finished chapters, restart the one you were in.
if (state.storyVersion !== 2) {
  for (const s of Object.values(qs())) if (!s.done) { s.step = 0; s.seen = []; }
  state.storyVersion = 2;
  save();
}

// Quests you can work on right now (unlocked by level and by finishing the one before).
export function activeQuests() {
  const out = [];
  for (let i = 0; i < QUESTS.length; i++) {
    const q = QUESTS[i], s = questState(q.id);
    if (s.done) continue;
    if (level() < q.level) break;
    if (i > 0 && !questState(QUESTS[i - 1].id).done) break;
    out.push(q);
    break;                        // one main-quest step at a time keeps the story in order
  }
  return out;
}
export function currentStep() {
  const q = activeQuests()[0];
  if (!q) return null;
  const s = questState(q.id);
  return { quest: q, step: q.steps[s.step], index: s.step, revealed: s.reveal === s.step };
}
const hour = () => state.minute / 60;
export const inHours = (st) => !st.hours || (hour() >= st.hours[0] && hour() < st.hours[1]);
// The goal line for a gate step: how close you are to affording it.
export function gateText(st) {
  const r = RANKS[st.gate];
  return `${st.text}: ${Math.min(state.gold, r.fee)} / ${r.fee} gold${level() < r.level ? `, level ${r.level}` : ''}`;
}
// "Ask around" (journal): shows the way to a hidden step, and what you heard.
export function askAround() {
  const c = currentStep();
  if (!c || !c.step.hidden) return null;
  const s = questState(c.quest.id); s.reveal = s.step; qs()[c.quest.id] = s; save();
  return c.step.hint;
}

function advance(q) {
  const s = questState(q.id);
  const st = q.steps[s.step];
  if (st.xp) addRenown(st.xp, q.title);
  if (st.gold) { state.gold += st.gold; state.earned += st.gold; }
  if (st.clue && !state.clues.includes(st.clue)) state.clues.push(st.clue);
  if (st.letter) state.flags.letter = true;
  if (st.setFlag) state.flags[st.setFlag] = true;
  if (st.setFlag === 'breakin') state.flags.ledgerStolen = true;
  if (st.give) state.pack[st.give[0]] = (state.pack[st.give[0]] || 0) + st.give[1];
  if (st.sides) for (const [who, n] of Object.entries(st.sides)) side(who, n);
  if (st.reward) import('./items.js').then(m => m.give(st.reward, q.title));
  if (st.arrive) talk({ name: q.title, text: st.arrive, options: [{ label: 'Go on' }] });
  s.step++; s.seen = [];
  if (s.step >= q.steps.length) { s.done = true; note(`Finished: ${q.title}`); toast(`Chapter complete: ${q.title}`, 5000); }
  else toast(`${q.title}: ${q.steps[s.step].gate ? gateText(q.steps[s.step]) : q.steps[s.step].text}`, 6000);
  qs()[q.id] = s;
  save(); updateStatus();
}
export function finishStep() { const c = currentStep(); if (c) advance(c.quest); }

// ---------- Events from the world ----------
export function questEvent(type, data) {
  const c = currentStep();
  if (!c) return;
  const { quest, step } = c;
  if (quest.place && quest.place !== here()) return;
  if (step.hours && !inHours(step)) return;
  const take = () => {
    if (!step.take) return true;
    if ((state.pack[step.take[0]] || 0) < step.take[1]) return false;
    state.pack[step.take[0]] -= step.take[1]; if (!state.pack[step.take[0]]) delete state.pack[step.take[0]];
    return true;
  };
  if (type === 'reach' && step.reach && Math.hypot(data.x - step.x, data.z - step.z) < 4) { if (take()) advance(quest); }
  else if (type === 'read' && step.read === data) advance(quest);
  else if (type === 'read' && step.reads?.includes(data)) {
    const s = questState(quest.id); s.seen = [...new Set([...(s.seen || []), data])]; qs()[quest.id] = s; save();
    if (step.reads.every(r => s.seen.includes(r))) advance(quest);
    else toast(`${s.seen.length} of ${step.reads.length} traces found`, 3000);
  }
  else if (type === 'game' && step.game && step.game[0] === data.name && step.game[1](data.result || {})) advance(quest);
  else if (type === 'pack' && step.have && (state.pack[step.have[0]] || 0) >= step.have[1]) advance(quest);
  else if (type === 'pack' && step.sell) {
    const s = questState(quest.id);
    if (s.soldFrom == null) { s.soldFrom = state.soldOwn || 0; qs()[quest.id] = s; save(); }    // count from when the step began
    if ((state.soldOwn || 0) - s.soldFrom >= step.sell) advance(quest);
  }
  else if (type === 'pack' && step.gate && state.rank >= step.gate) advance(quest);
  else if (type === 'flag' && step.flag && state.flags[step.flag]) advance(quest);
  else if (type === 'flag' && step.flagsAny && step.flagsAny.some(f => state.flags[f])) advance(quest);
  else if (type === 'sneak' && (step.follow || step.overhear)) advance(quest);
}

// A conversation option for whoever the current step needs.
export function questOption(npcKey, label) {
  const c = currentStep();
  if (!c || c.step.npc !== npcKey || !(c.step.talk || c.step.choices)) return null;
  const { quest, step } = c;
  if (quest.place && quest.place !== here()) return null;
  if (!inHours(step)) return { label: `${quest.title}: (not now. ${step.hours[0] > 12 ? 'Come back at dusk' : 'Come back in the morning'})`, disabled: true };
  if (step.take && (state.pack[step.take[0]] || 0) < step.take[1]) return { label: `${quest.title}: (you need ${step.take[1]} ${step.take[0]}s)`, disabled: true };
  if (step.xiLetter) return { label: 'Give Xi your brother\'s letter', hint: quest.title, do: () => xiLetterScene(quest, label) };
  if (step.choices) return { label: quest.title, hint: 'Your story', do: () => CHOICES[step.choices](label, () => advance(quest), (game, test, onWin, l, fail) => { closePanelSoon(); playFor(game, test, onWin, l, fail); }) };
  return {
    label: quest.title, hint: 'Your story',
    do: () => {
      if (step.take) { state.pack[step.take[0]] -= step.take[1]; if (!state.pack[step.take[0]]) delete state.pack[step.take[0]]; }
      advance(quest);
      if (step.letter) return letterChoice(label, step.say);
      return { name: label, text: step.say, options: [{ label: 'Leave' }] };
    },
  };
}

// Nyra hands you the letter: open it, or keep it sealed?
function letterChoice(label, say) {
  return { name: label, text: say, options: [
    { label: 'Keep it sealed. It\'s for the Steward.', do: () => { state.flags.letterSealed = true; save(); return { name: label, text: ['You slip it into your coat, seal unbroken. Nyra nods, as if you passed a test.'], options: [{ label: 'Leave' }] }; } },
    { label: 'Break the seal and read it', hint: 'Investigation, DC 14', do: async () => {
      state.flags.letterOpened = true; save();
      const r = await rollCheck('Investigation', 14);
      return { name: 'Ale\'s letter', text: r.success
        ? ['It\'s in a cipher, but Ale always used the same one, the one you made up as children. One line comes clear:', '"They mean to take the passage. Not the ships: the wards. Tell the Steward before the new moon."']
        : ['Rows of letters that make no sense. A cipher. It almost looks familiar.'], options: [{ label: 'Fold it away' }] };
    } },
  ] };
}

// Xi reads Ale's letter.
function xiLetterScene(quest, label) {
  const opened = state.flags.letterOpened;
  advance(quest);
  state.flags.xiKnows = true; save();
  return { name: label, text: [
    opened ? 'Xi turns the envelope over and sees the broken seal. A long silence. "You read it." It is not a question. "Then you know as much as I do. Perhaps more."'
      : 'Xi turns the envelope over and sees the seal unbroken. Something in the Steward\'s face softens. "You didn\'t read it. Your brother chose his messengers well."',
    'Xi reads. Then reads again. "Your brother stood where you stand, once. He warned me of this, and I did not listen. I have regretted it every day since."',
    '"The wards. Someone means to take the passage itself." Xi folds the letter away. "Grow your house, merchant. When you are ready, come to me. I will give you a ship, and something to do with it."',
  ], options: [{ label: 'Leave' }] };
}

// The palace gate, the first time: the guards want to know why you should be let in.
export function palaceGate() {
  const pass = (text) => { state.flags.palacePass = true; save(); return { name: 'The palace guards', text, options: [{ label: 'Go in (E at the gate)' }] }; };
  const warn = state.flags.burglarFree ? ['Across the square, a man in a gray coat catches your eye and shakes his head, very slightly, before he melts into the crowd.'] : [];
  return { name: 'The palace guards', text: ['Two guards cross their spears in front of the gate. "The Steward is not receiving. State your business."', ...warn], options: [
    { label: 'Show your Merchants\' Guild papers', hint: state.rank >= 4 ? 'a merchant of note' : 'needs the Store Add-on', disabled: state.rank < 4,
      do: () => pass(['They read your papers twice. "Merchant of note. Very well." The spears part.']) },
    { label: 'Slip the guard 50 gold', hint: '50 gold', disabled: state.gold < 50, do: () => { state.gold -= 50; updateStatus(); return pass(['The coin disappears. So does the guard\'s interest in you. The spears part.']); } },
    { label: '"Nyra of the pilots sent me."', hint: state.flags.letter ? 'you carry her letter' : 'you have nothing to show', disabled: !state.flags.letter,
      do: () => pass(['At the pilot\'s name the older guard straightens. "The pilots keep the wards. Go in."']) },
    { label: 'Leave' },
  ] };
}

// For the journal (J).
export function questLog() {
  return QUESTS.map(q => {
    const s = questState(q.id);
    const locked = level() < q.level;
    return { title: q.title, level: q.level, done: s.done, locked, steps: q.steps.map((st, i) => ({
      text: st.gate ? gateText(st) : st.text, done: s.done || i < s.step, current: !s.done && i === s.step,
      hidden: !!st.hidden && s.reveal !== i, revealedHint: st.hidden && s.reveal === i ? st.hint : null,
      hours: st.hours || null, open: inHours(st), gate: st.gate ? { have: Math.min(state.gold, RANKS[st.gate].fee), need: RANKS[st.gate].fee, level: RANKS[st.gate].level } : null,
      marked: !st.hidden || s.reveal === i })) };
  });
}

export { Q, nextRank };
