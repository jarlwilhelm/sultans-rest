// Chapter Two's story in Meridia (docs/chapter-two-plan.md). What the user decided: the Tallyman looks like the
// Levinite boss but points to someone else after a one-on-one face-off; the real boss is Ben (calm, polite,
// proper, not a fighter; a respectable front); Arthur is the head speaker who refused a crown; the forger is an
// elf, short and noble-looking; you do jobs for Arthur and for Ben, and every job secretly serves Redman's plan:
// win the Levinite leader over and use those resources in the war against Azmodeus. A hidden tally of which side
// each job strengthened is revealed at the end.
// Everything else (names like Ellorin Vane, the Lantern Bakery, the jobs themselves, every line) is a DRAFT by Claude.
import { state, note, save } from '../game/state.js';
import { updateStatus, rollCheck } from '../game/ui.js';

const leave = { label: 'Leave' };
const sides = () => (state.sides ||= { arthur: 0, ben: 0, redman: 0 });
export const side = (who, n) => { sides()[who] = (sides()[who] || 0) + n; save(); };

// The quests (place: 'meridia': their steps only count there). Steps work like Chapter One's (game/quests.js);
// `give` hands you goods, `sides` moves the hidden tally, `flagsAny` (any of these flags) finishes a step.
export const QUESTS_2 = [
  { id: 'm_arrive', title: 'A Room by the Week', level: 11, place: 'meridia', steps: [
    { text: 'Talk to Tobin at the Brine & Barrel, the inn on the quay', npc: 'innkeeper', talk: true, xp: 10, say: [
      '"Xi\'s charter, is it? Then you\'re somebody, back where you come from." Tobin sizes you up. "Here you\'re nobody yet. That\'s not an insult. It\'s an opportunity."',
      '"Set up your stand on the quay, sell a little, and go up to the Exchange. The merchant houses post contracts there, and they pay for anything from the East."'] },
    { text: 'Sell five goods from your pop-up stand on the quay', sell: 5, x: -18, z: 18, xp: 10 },
    { text: 'Take a trade contract at the Exchange (middle ring, by the market)', npc: 'clerk', flag: 'tookContract', xp: 15 },
  ] },
  { id: 'm_tally', title: 'The Man Counting Crates', level: 11, place: 'meridia', steps: [
    { text: 'Ask Brannoc at the warehouses whether anyone here goes by "the Tallyman"', npc: 'warehouse', talk: true, xp: 10, say: [
      'Brannoc stops stacking. "The Tallyman? Where\'d you hear that name?" He lowers his voice. "Counts crates at the end of warehouse row, after dark. Never the same crates twice. Never asks what\'s in them."',
      '"If you\'re going to talk to him, talk to him somewhere I can\'t see."'] },
    { text: 'Find the Tallyman at the end of warehouse row, after dark (8 pm to midnight)', npc: 'tallyman', choices: 'tallyman', hours: [20, 24], xp: 40 },
  ] },
  { id: 'm_bread', title: 'Honest Bread', level: 12, place: 'meridia', steps: [
    { text: 'Visit the Lantern Bakery in the middle ring and meet the baker', npc: 'ben', choices: 'ben1', xp: 15 },
    { text: 'Bring Ben ten sacks of Eldorian Grain', npc: 'ben', talk: true, take: ['grain', 10], gold: 220, xp: 25, sides: { ben: 1 }, say: [
      '"Exactly ten. Dry. Good." He pays you to the coin, wrapped in brown paper, with a loaf on top. "I don\'t like surprises. You haven\'t given me one. Come back sometime."'] },
  ] },
  { id: 'm_violet', title: 'Violet Glass', level: 13, place: 'meridia', steps: [
    { text: 'Someone in the outer ring has been asking about you. A hooded figure in a doorway, after dark (8 pm to midnight)', npc: 'dealer', talk: true, hours: [20, 24], give: ['levinite', 1], xp: 10, say: [
      '"You\'re the one who brings Ben his grain." A small vial of violet glass is pressed into your hand. "A gift. From the city. Nights are long here. They don\'t have to be."',
      '(Levinite. You can take it from your inventory: I, then the vial. Or throw it in the sea off the end of the Grand Pier.)'] },
    { text: 'The vial: keep it in your pack, or throw it off the end of the Grand Pier', flagsAny: ['levFirst', 'levRefused'], x: 0, z: -55, xp: 10 },
    { text: 'Ben wants a word', npc: 'ben', choices: 'ben2', xp: 30 },
  ] },
  { id: 'm_pass', title: 'The Forged Pass', level: 14, place: 'meridia', steps: [
    { text: 'The Hill is closed to you. Ask at the Gilded Gull for a gentleman of letters', npc: 'forger', choices: 'forger', xp: 15 },
    { text: 'At night, get into the Customs House on the quay and press its seal into your wax (9 pm to 4 am)', game: ['The Customs House', (r) => !!r.sealed], x: 88, z: 42, xp: 60 },
    // His fee is a money goal (2026-11-04, the user: reasons to make money): 2,000 gold for a pass to the Hill.
    { text: 'Bring the seal impression back to Ellorin Vane at the Gilded Gull, and his fee: 2,000 gold', npc: 'forger', choices: 'forger2', setFlag: 'innerPass', xp: 30, sides: { redman: 1 } },
  ] },
  { id: 'm_speaker', title: 'The Speaker', level: 15, place: 'meridia', steps: [
    { text: 'Show your pass at the Inner Gate and go up the Hill', reach: true, x: 0, z: 202, xp: 20 },
    { text: 'Speak with Arthur on the steps of the Republic Hall', npc: 'arthur', choices: 'arthur1', xp: 30 },
    { text: 'Bring Arthur twenty sacks of grain for the fever streets', npc: 'arthur', talk: true, take: ['grain', 20], gold: 400, xp: 40, sides: { arthur: 2 }, say: [
      '"Twenty. You counted twice, didn\'t you? So do I." Arthur sends the sacks down to the outer ring with his own clerks. "The Republic thanks you. So do I, which is rarer."'] },
  ] },
  { id: 'm_two', title: 'Two Masters', level: 16, place: 'meridia', steps: [
    { text: 'Ben has a quiet favor to ask', npc: 'ben', choices: 'ben3', xp: 40 },
    { text: 'Arthur has a question for you', npc: 'arthur', choices: 'arthur2', xp: 40 },
  ] },
  { id: 'm_coin', title: 'The Faceless Coin', level: 18, place: 'meridia', steps: [
    { text: 'Someone is waiting for you at home, after dark (your house, or your room at the inn)', npc: 'redman', choices: 'redman2', hours: [20, 24], xp: 50 },
  ] },
  { id: 'm_hands', title: 'The Right Hands', level: 20, place: 'meridia', steps: [
    { text: 'Ben asks for you, after dark. At the bakery, closed', npc: 'ben', choices: 'ben4', hours: [20, 24], xp: 100 },
  ] },
];

// The conversations with choices (CHOICES in game/quests.js). done() finishes the step; play(game, test,
// onWin, label, failText) runs a mini-game for it (Chapter One's playFor).
export const CHOICES_2 = {
  tallyman: (label, done, play) => {
    const talkAfter = () => { done(); return { name: label, text: [
      'He sits on a crate, wiping blood from his lip, and laughs. "All right. All right. You hit harder than your brother ever could."',
      '"The ledger? I was paid to fetch it. Paid well. Not by a man in a cloak, nothing so grand. By a baker." He waits for you to laugh. You don\'t. "Ben. The Lantern Bakery. Honest bread since the Republic." He spits. "I count his crates. I never open them."',
      '"Go and buy a loaf. Be polite. He likes polite."'], options: [leave] }; };
    return { name: label, text: ['The man looks up from his tally board: big, slow, a face like a closed door. "Ale\'s sibling. I wondered when." He sets the board down. "I don\'t talk to people I haven\'t measured."'], options: [
      { label: 'Square up to him (the standoff)', hint: 'a fight: best of three', do: () => { play('Standoff', (r) => !!r.won, talkAfter, label, 'You end up on the floor among the crates. "Come back when you can stand," he says.'); return 'keep'; } },
      { label: '"I\'m not here to fight."', hint: 'Persuasion, DC 18', do: async () => {
        const r = await rollCheck('Persuasion', 18);
        return r.success ? talkAfter() : { name: label, text: ['"Everybody\'s here to fight. Some of them just don\'t know it yet." He picks up his board again.'], options: [leave] };
      } },
      leave,
    ] };
  },
  ben1: (label, done) => ({ name: label, text: [
    'The Lantern Bakery smells of warm bread and nothing else. The man behind the counter is slight, neat, apron spotless, sleeves rolled to exactly the same height. He looks like he has never raised his voice in his life.',
    '"Welcome. You\'re new to Meridia, I think. I\'m Ben. What can I get you?"'], options: [
    { label: '"The Tallyman sent me."', do: () => { done(); return { name: label, text: ['Nothing changes in his face. Nothing at all. "I\'m afraid I don\'t know anyone by that name. But you\'re in the grain trade, aren\'t you? I could use a reliable supplier. Ten sacks of Eldorian grain. I pay on time."', '(He knows exactly who sent you.)'], options: [leave] }; } },
    { label: '"Just a loaf, thanks."', do: () => { done(); return { name: label, text: ['He wraps it with care. "You trade grain, don\'t you? I could use a reliable supplier. Ten sacks of Eldorian grain, whenever you have them. I pay on time."'], options: [leave] }; } },
  ] }),
  ben2: (label, done) => {
    const used = !!state.flags.levFirst;
    return { name: label, text: used
      ? ['Ben is closing up, wiping down the counter in long, even strokes. "You\'ve tried what my city makes. Don\'t look surprised; I make it my business to know my suppliers."', '"I could use someone careful, with a ship, a stand on the quay and a reason to be out at night. The work is simple. The pay is not."']
      : ['Ben is closing up. "I hear you threw a gift into the harbor." He says it the way he\'d mention the weather. "Careful people are rare. I could still use one, for honest work. Grain, flour, oil. I pay on time."'],
    options: used ? [
      { label: '"I\'ll sell it for you."', hint: 'at night: the dealer sells to you cheap, a buyer waits behind the Gilded Gull', do: () => { state.flags.levSell = true; side('ben', 2); note('Agreed to sell Levinite for Ben'); done(); return { name: label, text: ['"Good. The dealer will treat you as a friend now. There\'s someone behind the Gilded Gull, most nights, who buys. Never in daylight. Never more than you can carry. And never, ever, through the Middle Gate if you can help it."'], options: [leave] }; } },
      { label: '"No. Not that."', do: () => { side('arthur', 1); done(); return { name: label, text: ['"A pity. But I respect a person who knows what they won\'t do." He hands you a loaf. "Honest bread, then. My offer for grain still stands."'], options: [leave] }; } },
    ] : [{ label: 'Leave it there', do: () => { side('arthur', 1); done(); return { name: label, text: ['"Good night, then. Mind the gulls."'], options: [leave] }; } }] };
  },
  forger: (label, done) => ({ name: label, text: [
    'In the best corner of the Gilded Gull sits a short elf in a coat that cost more than your ship\'s sails, reading poetry with the air of a man who has written better. "Ellorin Vane. Letters, mostly. Papers, occasionally."',
    '"A pass to the Hill? I can make you one so good the Captain of the Inner Gate will apologise for doubting it. But a pass needs a seal, and the seals live in the Customs House on the quay, where the night clerks keep them."'], options: [
    { label: '"I\'ll get you the seal."', do: () => { done(); return { name: label, text: ['"Not the seal. Just its mark. Press it into this." He gives you a disc of soft red wax. "The head clerk\'s desk, at the back. Go at night. Don\'t be seen; if you are, you\'re a drunk who wandered in. You\'ll pay a fine and feel foolish. Nothing worse."', '(The Customs House door is on the quay. Its night shift runs 9 pm to 4 am.)'], options: [leave] }; } },
  ] }),
  forger2: (label, done) => ({ name: label, text: [
    'Ellorin holds the wax to the lamp, and smiles for the first time. "Clean. Lovely." Then he names his price, as if it were the weather. "Two thousand. Gold, not promises. Art is expensive; prison is more so."'], options: [
    { label: 'Pay him (2,000 gold)', hint: state.gold >= 2000 ? '' : `you have ${state.gold}`, disabled: state.gold < 2000, do: () => {
      state.gold -= 2000; state.spent = (state.spent || 0) + 2000; updateStatus(); note('Paid Ellorin Vane 2,000 gold for a pass to the Hill'); done();
      return { name: label, text: ['Two days later you have a pass with the Republic\'s seal on it. "Don\'t thank me," he says. "Thank our mutual friend. He told me you\'d manage."'], options: [leave] }; } },
    { label: '"I\'ll come back with it."', do: () => ({ name: label, text: ['"The wax keeps. So do I." He goes back to his poetry. (Trade, take contracts, invest in a voyage at the Exchange: bring 2,000 gold.)'], options: [leave] }) },
  ] }),
  arthur1: (label, done) => ({ name: label, text: [
    'Arthur is not what you expected. A big man in a plain coat, sleeves stained with ink, sitting on the top step eating an apple while a crowd of petitioners waits for him to finish it. When he sees you he waves you up as if you had an appointment.',
    '"The trader from Sultan\'s Rest. Xi writes that you\'re worth listening to. Xi never writes that." He looks down at the city. "There\'s fever in the outer streets, and bread\'s too dear for the people who need it most. Can you get me grain, cheap, and a lot of it?"'], options: [
    { label: '"How much?"', do: () => { done(); return { name: label, text: ['"Twenty sacks. The Republic pays fair: not well, fair. I\'ll make up the difference myself."'], options: [leave] }; } },
    { label: '"Why didn\'t you take the crown?"', do: () => { done(); return { name: label, text: ['He laughs. "Because then it would be my city. It\'s theirs." He nods down at the rings. "Twenty sacks of grain. Can you?"'], options: [leave] }; } },
  ] }),
  ben3: (label, done) => ({ name: label, text: ['"A shipment of mine is sitting in the Customs House," Ben says, slicing bread into perfectly even pieces. "Flour, they say. They\'ll open it tomorrow. I would prefer they didn\'t."'], options: [
    { label: 'Pay off the night clerk', hint: '500 gold', disabled: state.gold < 500, do: () => { state.gold -= 500; updateStatus(); side('ben', 2); done(); note('Paid off a customs clerk for Ben'); return { name: label, text: ['The clerk takes the purse without looking at it. In the morning the crates are gone. Ben sends you a cake. Nothing else.'], options: [leave] }; } },
    { label: 'Tell Arthur about the shipment instead', do: () => { side('arthur', 2); state.flags.betrayedBen = true; done(); return { name: label, text: ['"Of course," you tell Ben. Then you go up the Hill. The next day, the Customs House opens every crate. Ben\'s face, when he hands you your bread, tells you nothing at all.'], options: [leave] }; } },
    { label: '"Not my business."', do: () => { side('ben', -1); done(); return { name: label, text: ['"No," Ben agrees, very pleasantly. "It isn\'t."'], options: [leave] }; } },
  ] }),
  arthur2: (label, done) => ({ name: label, text: ['Arthur is not eating an apple today. "Violet glass in the outer streets. More every week. Somebody runs it like a business, and runs it well." He looks at you. "You trade at night. You hear things. Who?"'], options: [
    { label: '"Ben. The baker."', do: () => { side('arthur', 3); side('ben', -2); state.flags.namedBen = true; done(); return { name: label, text: ['He is quiet for a long time. "The baker. Of course it is." He doesn\'t thank you. He looks tired. "I need proof. I need more than you. But thank you."'], options: [leave] }; } },
    { label: '"The Tallyman, at warehouse row."', do: () => { side('arthur', 1); side('ben', 1); done(); return { name: label, text: ['"A name. It\'s a start." Arthur writes it down. Somewhere in the middle ring, a baker will hear by evening that the Tallyman has been named, and that you didn\'t name him.'], options: [leave] }; } },
    { label: '"I don\'t know."', do: () => { side('ben', 1); done(); return { name: label, text: ['"Nobody does," Arthur says. "That\'s what worries me."'], options: [leave] }; } },
  ] }),
  redman2: (label, done) => {
    const favors = async () => {
      const R = await import('../game/redman.js');
      state.coins = (state.coins ?? 0) + 1;
      note('Redman added a faceless coin to your purse');
      save();
      return { name: 'Redman', text: ['"One more for the purse." He sets a coin on the table. "Is there anything I can do for you?"'], options: R.favorOptions('Redman') };
    };
    return { name: 'A man in a plain cloak', text: [
      'The lamp is lit. He is sitting at your table as if he had always been there, the plain cloak, the face you\'ll forget by morning. "Close the door. Meridia suits you."',
      '"I owe you an explanation. Ben, the baker. He runs the violet glass: the makers, the boats, the buyers, the guards who look away. The best-run business in the West."',
      '"I don\'t want him in a cell. I want him on our side. There\'s a war coming that nobody here believes in, against Azmodeus, and wars are won with money in the right hands. Ben\'s hands are very good hands. Everything you\'ve done here has been bringing him closer to me, whether you meant it or not."'],
    options: [{ label: '"Everything?"', do: () => { done(); side('redman', 2); return { name: 'Redman', text: ['"Everything. Arthur\'s grain, Ben\'s crates, Ellorin\'s pass. Even the things you refused." He almost smiles. "Especially those."'], options: [{ label: 'Go on', do: favors }] }; } }] };
  },
  ben4: (label, done) => {
    const s = sides();
    const lead = s.arthur > s.ben ? 'arthur' : 'ben';
    done();
    state.flags.chapterTwoDone = true;
    note('Chapter Two: complete');
    save();
    return { name: label, text: [
      'The bakery is dark except for one lamp. Ben is sitting at the flour-dusted table with a cup of tea, and across from him, the chair is empty. A coin with no face lies beside the cup.',
      '"A man came to see me last night," Ben says. "A man nobody can describe. He knew everything: my boats, my makers, my buyers. He didn\'t threaten me. He made me an offer." He turns the coin over. "He says you know him."',
      `Your tally, as the man with no face kept it: for Arthur ${s.arthur}, for Ben ${s.ben}, for Redman ${s.redman}. ${lead === 'arthur' ? 'You leaned toward the Republic. Ben knows it.' : 'You leaned toward Ben. Arthur suspects it.'} It doesn't matter as much as you thought. Every job, every refusal, put money where Redman wanted it.`,
      '"I said yes," Ben says, and finishes his tea. "Of course I said yes. He\'s right about the war." He stands. "Go home, trader. Get some sleep. We have work to do."',
      'CHAPTER TWO: COMPLETE. (Chapter Three is next to build. Meridia and Sultan\'s Rest are still yours.)'], options: [leave] };
  },
};

// What Meridia's story people say when the story doesn't need them (DRAFT).
export function storyTalk(id, name) {
  const lines = {
    arthur: ['"Mind the steps. They\'re older than the Republic."', '"If you\'re selling, the Exchange is down the hill. If you\'re complaining, you\'re in the right place."'],
    ben: ['"Fresh this morning. Everything is fresh this morning."', '"Manners cost nothing. That\'s why so few people can afford them."'],
    tallyman: ['He doesn\'t look up from his tally board.', '"Forty-one. Forty-two. Go away. Forty-three."'],
    forger: ['"Poetry is just forgery with better excuses."', '"Papers? Who said anything about papers?"'],
    customsClerk: ['"Declare everything. Then declare it again, slower."'],
  }[id];
  if (!lines) return null;
  return { name, text: [lines[Math.floor(Math.random() * lines.length)]], options: [leave] };
}
