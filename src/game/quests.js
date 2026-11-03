// The main quest of Chapter One, step by step, and the people in it.
// Every line here is a DRAFT by Claude, written to fit the guide: rewrite freely.
import { state, level, note, save, addRenown, nextRank } from './state.js';
import { toast, updateStatus, rollCheck } from './ui.js';

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

// Quest steps: what to do (shown in the log and on the compass), where, and how it's done.
// done by: { talk: npcKey } (a conversation option appears), { reach: true } (walk there),
// { read: readableId }, { have: [good, n] }, { game: [name, test] }, { flag }.
export const QUESTS = [
  { id: 'cabbages', title: "Ale's Cabbages", level: 1, steps: [
    { text: "Visit Ale's house (east of the main avenue, blue door)", x: -40, z: 63, reach: true },
    { text: 'Read the letter on his shelf', x: -36.7, z: 69, read: 'unsent' },
    { text: "Look over Ale's stand on the quay", x: -50, z: 15, reach: true },
    { text: 'Talk to Mrs. Haddad by the stand', npc: 'haddad', talk: true, say: [
      'An old woman with a market basket watches you look at the stand. "You\'re the sibling. Of course you are."',
      '"Ale sold me three cabbages every week for nine years. Best in the harbor. I don\'t suppose... his garden will be going to seed by now."',
      '"Bring me three from his garden, would you? Like he used to. It would mean something."'] },
    { text: "Pick three cabbages in Ale's garden (behind his house)", x: -40, z: 76, have: ['cabbage', 3] },
    { text: 'Bring the cabbages to Mrs. Haddad', npc: 'haddad', talk: true, take: ['cabbage', 3], gold: 12, xp: 12, say: [
      'She turns a cabbage over in her hands for a long time. "He grew them just like this. Tight, heavy. A good heart grows a good cabbage, he said."',
      '"Keep the stand open. People will come. And they\'ll talk to you, the way they talked to him." She presses a few coins on you, and won\'t take them back.',
      '(You can now sell at your stand: walk behind the counter and press E.)',
      'As you turn to go, she holds out a battered straw hat. "His. He left it at my house the week before. It should be yours."'], reward: 'hat:straw' },
  ] },
  { id: 'night', title: 'The Night Before', level: 2, steps: [
    { text: 'Ask the barkeep of the Salted Kraken about Ale', npc: 'inn', talk: true, clue: 'inn', say: [
      '"Ale? Quiet man. Kind. Always paid his tab." The barkeep wipes the same spot on the bar for a while.',
      '"Funny thing. He was in here the night before the fever took him. Right as rain. Laughing, even. Fevers don\'t usually come on like that."'] },
    { text: 'Ask Mrs. Haddad who Ale was with that night', npc: 'haddad', talk: true, say: [
      '"That night? I saw him on the Grand Pier at dusk, talking with one of the tiefling pilots. The one with the silver rings in her horns."',
      '"He looked worried. Ale never looked worried. Not about cabbages, anyway."'] },
    { text: 'Find the pilot with silver rings on the Grand Pier', npc: 'nyra', talk: true, xp: 10, say: [
      'The pilot\'s eyes flick to your face and away. "Ale. Yes. I knew him." She goes back to checking her lantern.',
      '"I don\'t talk about my passengers, or my friends, to strangers. Come back when the harbor knows your name."'] },
  ] },
  { id: 'forty', title: 'Forty Gold', level: 3, steps: [
    { text: "Read Ale's ledger, on the table in his house", x: -39.6, z: 68.2, read: 'ledger', clue: 'ledger' },
    { text: 'Ask the Guildmaster who "R." might be (inside the Merchants\' Guild)', npc: 'guildmaster', talk: true, say: [
      'The Guildmaster peers at the page. "R. Forty gold, regular as tides. In this city? Only one man lends like clockwork. Rashid. Up the main avenue."'] },
    { text: 'Find Rashid the moneylender on the main avenue', npc: 'rashid', talk: true, xp: 15, say: [
      '"Your brother? Borrow? Never. You have it backwards. He paid ME, to change coin for him. Forty gold a month, always in new palace coin."',
      'He sets a coin on the table between you. It has no face stamped on it, only the Sultanate\'s seal. "Coin like this doesn\'t come from cabbages."'] },
  ] },
  { id: 'package', title: 'The Package', level: 4, steps: [
    { text: 'Talk to the Master Transmuter (inside the Transmuters\' Guild)', npc: 'transmuter', talk: true, clue: 'transmuter', say: [
      'The Master Transmuter studies your face. "You have his eyes. Did your brother leave anything with you? A package. Small. Heavy for its size."',
      'You say no. "Then look. Behind things. Under things. He liked hiding places."'] },
    { text: "Search Ale's house for a hiding place", x: -36.6, z: 69.5, read: 'hollow' },
    { text: 'Tell the Master Transmuter what you found', npc: 'transmuter', talk: true, xp: 15, say: [
      '"Empty." The Transmuter sets down their tongs. "Then someone got there before you. Someone who knew where to look."',
      '"Be careful whose questions you answer. Including mine."'] },
  ] },
  { id: 'noface', title: 'No Face', level: 5, steps: [
    { text: 'Talk to the bounty master (inside the Adventurers\' Guild)', npc: 'bounty', talk: true, clue: 'bounty', say: [
      '"Ale came in here once. Didn\'t want work. Asked how a bounty gets paid when nobody knows the man\'s face."',
      '"You want to know more? Earn it. Run down a pickpocket for me. Then we\'ll talk."'] },
    { text: 'Catch a pickpocket in Alley Chase (ask the bounty master)', x: 64, z: 12, game: ['Alley Chase', r => r.caught > 0] },
    { text: 'Collect from the bounty master', npc: 'bounty', talk: true, xp: 20, gold: 40, say: [
      'He pulls a yellowed poster from a drawer. REDMAN RILLINGTON. No likeness. The reward is a tenth of what it is now.',
      '"Twenty years old, that one. Look at the margin." In faded ink, in a hand you know from the ledger: "A. asked." Your brother wrote on it.'] },
  ] },
  { id: 'third', title: 'Under the Third Row', level: 6, steps: [
    { text: "Something about the garden wall bothers you. Look at the loose stone in Ale's garden", x: -36.8, z: 78.4, read: 'stone', clue: 'garden', xp: 15 },
  ] },
  { id: 'noface2', title: 'The Man With No Face', level: 7, steps: [
    { text: 'Go home to Ale\'s house after dark. Someone is waiting.', x: -40, z: 63, flag: 'metRedman', xp: 25 },
  ] },
  { id: 'letters', title: 'Sealed Letters', level: 8, steps: [
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
];

// ---------- State helpers ----------
const qs = () => (state.quests ??= {});
export const questState = (id) => qs()[id] || { step: 0, done: false };
const Q = Object.fromEntries(QUESTS.map(q => [q.id, q]));

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
  return { quest: q, step: q.steps[s.step], index: s.step };
}

function advance(q, rewards = {}) {
  const s = questState(q.id);
  const st = q.steps[s.step];
  if (st.xp) addRenown(st.xp, q.title);
  if (st.gold) { state.gold += st.gold; state.earned += st.gold; }
  if (st.clue && !state.clues.includes(st.clue)) state.clues.push(st.clue);
  if (st.letter) state.flags.letter = true;
  if (st.reward) import('./items.js').then(m => m.give(st.reward, q.title));
  s.step++;
  if (s.step >= q.steps.length) { s.done = true; note(`Finished: ${q.title}`); toast(`Quest complete: ${q.title}`, 5000); }
  else toast(`${q.title}: ${q.steps[s.step].text}`, 5000);
  qs()[q.id] = s;
  save(); updateStatus();
  void rewards;
}

// ---------- Events from the world ----------
export function questEvent(type, data) {
  const c = currentStep();
  if (!c) return;
  const { quest, step } = c;
  if (type === 'reach' && step.reach && Math.hypot(data.x - step.x, data.z - step.z) < 4) advance(quest);
  else if (type === 'read' && step.read === data) advance(quest);
  else if (type === 'game' && step.game && step.game[0] === data.name && step.game[1](data.result || {})) advance(quest);
  else if (type === 'pack' && step.have && (state.pack[step.have[0]] || 0) >= step.have[1]) advance(quest);
  else if (type === 'flag' && step.flag && state.flags[step.flag]) advance(quest);
}

// A conversation option for whoever the current step needs.
export function questOption(npcKey, label) {
  const c = currentStep();
  if (!c || !c.step.talk || c.step.npc !== npcKey) return null;
  const { quest, step } = c;
  if (step.take && (state.pack[step.take[0]] || 0) < step.take[1]) return { label: `${quest.title}: (you need ${step.take[1]} ${step.take[0]}s)`, disabled: true };
  if (step.xiLetter) return { label: 'Give Xi your brother\'s letter', hint: quest.title, do: () => xiLetterScene(quest, label) };
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

// For the journal (J).
export function questLog() {
  return QUESTS.map(q => {
    const s = questState(q.id);
    const locked = level() < q.level;
    return { title: q.title, level: q.level, done: s.done, locked, steps: q.steps.map((st, i) => ({ text: st.text, done: s.done || i < s.step, current: !s.done && i === s.step })) };
  });
}

export { Q, nextRank };
