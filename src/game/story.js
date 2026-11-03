// The story of Chapter One: your brother Ale, a simple cabbage seller in Sultan's Rest, has died of a
// fever. You inherit his stand and his house. As you rise, small things don't add up. At level 8
// Redman Rillington tells you Ale was part of something bigger.
// All the words here are Claude's drafts (marked DRAFT); rewrite them in your own voice.
import { state, level, note, save } from './state.js';
import { talk, askText, toast, updateStatus, closePanel } from './ui.js';

export const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Tiefling', 'Orc', 'Dragonborn'];

// DRAFT: the letter waiting for you when you arrive.
export const LETTER = [
  'To the sibling of Ale, of Sultan\'s Rest,',
  'It is the sad duty of the Merchants\' Guild to tell you that your brother Ale died three weeks ago, of a fever. It came on quickly. He did not suffer long.',
  'Ale left no will, and no debts, which is rare in this city. His cabbage stand on the quay, just east of the market, is yours, and so is his house: up the main avenue, on the east side, the one with the blue door and the garden behind.',
  'The key is enclosed. The guild is sorry for your loss. Ale was well liked.',
  '— The Clerk of the Merchants\' Guild',
];

// The clues: who tells you, and from which level. DRAFTS.
export const BEATS = [
  { id: 'inn', level: 2, who: 'inn', title: 'The innkeeper remembers', text: [
    '"Ale? Quiet man. Kind. Always paid his tab." The innkeeper wipes the same spot on the bar for a while.',
    '"Funny thing. He was in here the night before the fever took him. Right as rain. Laughing, even. Fevers don\'t usually come on like that."' ] },
  { id: 'ledger', level: 3, who: 'house', title: 'An odd line in the ledger', text: [
    'Most of Ale\'s ledger is cabbages: so many sold, so many spoiled, so many given away.',
    'But every few weeks there is a line in a different hand of ink: "Paid: 40 g. R." Forty gold is more than the stand made in a month.' ] },
  { id: 'transmuter', level: 4, who: 'transmuters', title: 'A question from the Transmuters', text: [
    'The Transmuter studies your face. "You have his eyes. Did your brother... leave anything with you? A package. Small. Heavy for its size."',
    'You say no. "No. Of course not. Forget I asked." They turn back to the kiln a little too quickly.' ] },
  { id: 'bounty', level: 5, who: 'adventurers', title: 'The bounty master remembers', text: [
    '"Ale came in here once. Didn\'t want work. Asked how a bounty gets paid when nobody knows the man\'s face."',
    '"I told him it doesn\'t. Strange question for a cabbage seller, I thought. Then I forgot about it. Until now."' ] },
  { id: 'garden', level: 6, who: 'garden', title: 'Under the third row of cabbages', text: [
    'One stone at the edge of the garden sits loose. Under it, wrapped in oilcloth, a note in Ale\'s hand:',
    '"If you\'re reading this, you\'re in the house, and I\'m not. Sell cabbages. Only cabbages. Don\'t go looking for the people I knew. They\'ll find you, if they want to. — A."' ] },
  { id: 'pilot', level: 7, who: 'pilot', title: 'The tiefling pilots knew him', text: [
    '"Ale? He paid for passage through the wards twice this year. Never sailed. Just handed over letters, sealed, no name on them."',
    '"We don\'t ask what\'s in letters. That\'s why people pay us."' ] },
  { id: 'redman', level: 8, who: 'stranger', title: 'Redman Rillington', text: [] },     // told in the encounter
  { id: 'xi', level: 9, who: 'steward', title: 'Xi remembers', text: [
    '"Your brother stood where you stand. Once. He asked me for nothing, which is rare. He warned me of something, which is rarer."',
    '"I did not listen. I have regretted it." Xi says nothing more about it, and the scribe stops writing.' ] },
];

export const found = (id) => state.clues.includes(id);

// What people say about your shop, by what you're selling now (DRAFT lines).
const SHOP_TALK = [
  ['Ale\'s cabbages, still on the quay. Good. The harbor wouldn\'t be the same.', 'You sell cabbages like your brother did. Earnestly.'],
  ['I hear you\'re selling more than cabbages now. Onions? Dates? Ale would laugh.', 'Fresh produce from Ale\'s old stand. People talk.'],
  ['Spice at the cabbage stand! The market doesn\'t know what to make of you.', 'Your saffron is better than the spice sellers\'. Don\'t tell them I said so.'],
  ['Fine goods, from a cabbage stand. Ale would hardly recognise it.', 'Glass and silk under your sign now. Moving up.'],
  ['Imports from every land, and still a crate of cabbages by the door. I like that.', 'The whole harbor knows your name now. Not just Ale\'s.'],
];
export function shopTalk() {
  const t = Math.min(4, Math.floor((level() - 1) / 2));
  return SHOP_TALK[t][Math.floor(Math.random() * SHOP_TALK[t].length)];
}
function remember(b) {
  if (found(b.id)) return;
  state.clues.push(b.id);
  note(`Learned something about Ale: ${b.title}`);
  save();
  toast(`New in your journal: ${b.title}`, 3500);
}

// An "Ask about Ale" option for whoever has the next piece of the story.
export function storyOption(npc) {
  const who = npc.kind === 'guild' ? npc.guild : npc.kind === 'crowd' && npc.role === 'pilot' ? 'pilot' : npc.kind === 'ship' && /Tiefling/.test(npc.ship?.land || '') ? 'pilot' : npc.kind;
  const b = BEATS.find(x => x.who === who && !found(x.id) && level() >= x.level && x.text.length);
  if (!b) return null;
  return { label: 'Ask about Ale', hint: 'Your brother', do: () => { remember(b); return { name: npc.label, text: b.text, options: [{ label: 'Leave' }] }; } };
}

// Clues found by looking (the ledger, the garden stone).
export function readClue(id) {
  const b = BEATS.find(x => x.id === id);
  if (!b || level() < b.level) return null;
  remember(b);
  return b;
}

// Redman's words (DRAFT; what he says is yours to rewrite).
export const REDMAN = [
  'A man in a plain cloak is standing by Ale\'s table, the ledger open in front of him, as if he had always been there. An ordinary face. You will forget it by morning. "Close the door," he says. "Sit, if you like. It was his house before it was yours."',
  '"Your brother and I were friends. Good friends, for longer than you\'d guess. He carried things for people who cannot be seen. Letters. Names. Sometimes warnings."',
  '"There was no fever. Ale was murdered." He lets that sit. "I don\'t know who did it. Not yet. But I will. I owe him that."',
  '"The one who went through this house, the gray coat: a hired hand. He works for someone the docks call the Tallyman. Who the Tallyman is, or why he wanted your brother\'s ledger, I don\'t know either."',
  '"Grow, merchant. Get yourself a ship. Then we\'ll talk about what your brother started."',
]

// The opening: your name and people, then the guild's letter.
export async function intro() {
  if (state.flags.intro) return;
  const { openCreator } = await import('../creator.js');
  await openCreator();
  await new Promise((resolve) => {
    talk({ name: 'A letter, waiting for you at the harbor', text: LETTER, options: [{ label: 'Fold the letter away', do: () => { resolve(); return 'keep'; } }] });
  });
  state.flags.intro = true;
  note('Arrived in Sultan\'s Rest. Ale\'s stand and house are yours now.');
  save(); updateStatus(); closePanel(true);
  toast('Ale\'s stand is on the quay, just east of the market. His house is up the main avenue, east side, blue door.', 9000);
}
