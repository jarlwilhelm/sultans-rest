// The keeper of the Great Luminous Shrine of King Shou (the building: city.js luminousShrine, inside: ../shrine.js).
// In Lavine there are no gods: people honour their rulers, who will one day become gods (the user, 2026-11-04).
// Every line and number here is a DRAFT by Claude.
import { state, note, save, addRenown, level } from './state.js';
import { toast, updateStatus, rollCheck } from './ui.js';

const leave = { label: 'Leave' };
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const node = (name, text, options = [leave]) => ({ name, text, options });

export const OFFERING = 10;
// The King's light: your next job today pays a quarter more (npcs.js runGame reads this).
export const blessedToday = () => state.blessing?.day === state.day && !state.blessing.used;
export function useBlessing() { if (blessedToday()) { state.blessing.used = true; save(); return true; } return false; }

export function shrineTalk(npc) {
  const who = npc.label || 'Keeper of the Luminous Shrine';
  const options = [
    { label: `Make an offering for the King's light (${OFFERING} gold)`, hint: blessedToday() ? 'you are already in his light today' : 'your next job today pays a quarter more',
      disabled: blessedToday() || state.gold < OFFERING || state.blessing?.day === state.day, do: () => {
        state.gold -= OFFERING; state.spent += OFFERING; state.blessing = { day: state.day, used: false };
        note('Made an offering at the Luminous Shrine'); save(); updateStatus();
        toast('The King\'s light is on you today: your next job pays a quarter more.', 5000);
        return node(who, ['You drop the coins into the brass bowl at the King\'s feet. The keeper touches a taper to the flame and holds it a moment over your head.',
          '"May his light find your hands today." It\'s only fire. Still, you feel warmer walking out than you did walking in.']);
      } },
    { label: 'Light a candle for Ale', hint: state.flags.aleCandle ? 'it\'s still burning' : '1 gold', disabled: !!state.flags.aleCandle || state.gold < 1, do: () => {
        state.gold -= 1; state.flags.aleCandle = true; addRenown(5, 'a candle for Ale'); note('Lit a candle for Ale at the Luminous Shrine'); save(); updateStatus();
        dispatchEvent(new CustomEvent('lavine:candle'));
        return node(who, ['You light a thin candle from the King\'s fire and set it in the rack with the others. Hundreds of them, each one somebody.',
          'The keeper doesn\'t ask whose it is. "We keep them burning," is all she says. "As long as the King\'s fire burns, so do they."']);
      } },
    { label: 'Ask about the Luminous Shrines', do: () => node(who, [pick(LORE), pick(LORE2)]) },
    ...[keeperQuestOption(who)].filter(Boolean),
    leave,
  ];
  return node(who, [pick(HELLO)], options);
}

const HELLO = [
  '"Welcome to the King\'s light. Mind the step, and the candles."',
  'A woman in white and gold trims the wicks along the rail. "Come in. He sees everyone who comes in."',
  '"Quietly, please. The fire is listening." She smiles, so you\'re not sure if she\'s joking.',
];
const LORE = [
  '"We have no gods in the Sultanate. We have the King. His blood turns sand to glass; what else would you call that?"',
  '"Every city keeps a Luminous Shrine to its sovereign. Ours is the oldest. The fire in that bowl has not gone out in three hundred years."',
  '"The old texts say that when a sovereign has ruled long enough, and been loved well enough, the light stays with them when they die. Then they are more than kings."',
];
const LORE2 = [
  '"Mira Kesh. You\'ve seen the posters. Last spring she walked out of this very hall with something that was not hers." Her mouth goes thin. "We don\'t speak of it."',
  '"Some say the King is closer to that light than any ruler before him. I say we keep the fire burning and let him worry about it."',
  '"The rulers of the West build shrines too. Arthur of Meridia refused his. He said a man who wants a shrine shouldn\'t have one." She sounds like she admires that, and like she shouldn\'t.',
];

// ---------- "The Light That Went Out": the keeper's quest (the user's ask, 2026-11-04: pretty difficult; the
// reward a gold scepter you hold that gives 10% better prices all round). Opens at level 8. DRAFT lines.
// Steps: 1 find who bought the stolen Scepter of Light (no marker: Fennick the curio dealer); 2 catch Mira Kesh in
// the alleys at night (ask the Kraken's barkeep after 10 pm; Alley Chase, catch her twice); 3 buy the gem back from
// the Dezfulian captain (1,500 gold, or 3 Black Pearls); 4 bring it home to the keeper. Progress: state.side.scepter.
export const SCEPTER_LEVEL = 8, FENNICK_PRICE = 500, FENNICK_SORE = 800, GEM_PRICE = 1500;
const sq = () => (state.side ??= {}, state.side.scepter ??= { step: 0 });
const hr = () => state.minute / 60;
const nightOut = () => hr() >= 22 || hr() < 4;

export function scepterStatus() {
  const q = state.side?.scepter;
  if (!q?.step) return null;
  if (q.done) return { done: true, title: 'The Light That Went Out' };
  return { title: 'The Light That Went Out', text: [, 'Who would buy a stolen gold scepter in this city? Someone who buys strange things from strange people. (No marker.)',
    'Mira Kesh drinks at the Salted Kraken after dark. Ask the barkeep about her after 10 pm, and be ready to run. (She slips away once: catch her twice.)',
    `The gem is on the ship from the Dezfulian Empire. The captain wants ${GEM_PRICE} gold for it, or 3 Black Pearls.`,
    'Bring the Scepter of Light back to the keeper of the Luminous Shrine.'][q.step] };
}

// The keeper's side of it.
export function keeperQuestOption(who) {
  const q = state.side?.scepter;
  if (q?.done) return null;
  if (!q?.step) {
    if (level() < SCEPTER_LEVEL) return null;
    return { label: '"You look troubled."', hint: 'a quest: The Light That Went Out', do: () => node(who, [
      'She glances at the empty stand beside the King\'s likeness. A velvet cushion, dented where something heavy used to lie.',
      '"The Scepter of Light. Three hundred years it lay at his feet. Last spring a woman called Mira Kesh walked in at prayer time and walked out with it. You\'ve seen her face on the posters."',
      '"The guard has given up. I have not. Bring it home, and I swear by his light you will not be sorry."'],
      [{ label: '"I\'ll find it."', do: () => { sq().step = 1; save(); toast('New errand: The Light That Went Out. It\'s in your journal (Q).', 5000); return node(who, ['"A thief sells what she steals. Find out who bought it. Gold like that doesn\'t stay hidden for long in this city."']); } }, leave]) };
  }
  if (q.step === 4) return { label: 'Give her the Scepter of Light', hint: 'The Light That Went Out', do: () => {
    q.done = true; q.step = 5; addRenown(60, 'The Light That Went Out'); note('Returned the Scepter of Light to the Luminous Shrine');
    import('./items.js').then(m => m.give('held:scepter', 'the keeper of the Luminous Shrine'));
    save(); updateStatus();
    return node(who, ['She takes it in both hands. The gem catches the fire and throws gold across the whole hall, and for a moment every candle seems to burn a little higher.',
      'She sets it on the cushion. Then, after a long look at the King\'s face, she picks it up again and holds it out to you.',
      '"The shrine has kept it for three hundred years. I think he would rather it walked about in the hands of someone his light has already found. Carry it. Trade with it. Every merchant in the Sultanate knows what it means."',
      '(The King\'s Scepter: hold it, from Ale\'s wardrobe, and every price is 10% better, buying and selling.)']);
  } };
  return null;
}

// Everyone else's side: Fennick, the Kraken's barkeep, the Dezfulian captain.
export function scepterOptions(npc, runGame) {
  const q = state.side?.scepter;
  if (!q?.step || q.done || (state.place || 'sultans_rest') !== 'sultans_rest') return [];
  const who = npc.label;
  if (q.step === 1 && npc.kind === 'shop' && npc.id === 'curio') {
    const price = q.sore ? FENNICK_SORE : FENNICK_PRICE;
    return [{ label: '"A gold scepter. From the Luminous Shrine. You bought it."', hint: 'The Light That Went Out', do: () => node(who, [
      'Fennick goes very still, which for Fennick is unusual. "I buy many things. I don\'t ask where they\'ve been. That one I sold on in a week; it made my teeth itch."',
      `"Who to? Information is a curio too. ${price} gold."`], [
      { label: `Pay him ${price} gold`, disabled: state.gold < price, do: () => { state.gold -= price; state.spent += price; return fennickTells(who); } },
      ...(q.sore ? [] : [{ label: '"You fenced a stolen relic of the King. Tell me, or I tell the guard."', hint: 'Intimidation, DC 17 (fail: his price goes up)', do: async () => {
        const r = await rollCheck('Intimidation', 17);
        if (r.success) return fennickTells(who, ['He swallows. "No need for the guard. None at all."']);
        q.sore = true; save();
        return node(who, ['He laughs at you. "The guard? The guard buys from me." He folds his hands. "' + FENNICK_SORE + ' now. For the insult."']);
      } }]),
      leave]) }];
  }
  if (q.step === 2 && npc.kind === 'inn') {
    if (!nightOut()) return [{ label: 'Ask about Mira Kesh', hint: 'not now: she comes in after 10 pm', disabled: true }];
    return [{ label: 'Ask about Mira Kesh', hint: 'The Light That Went Out · a chase', do: () => node(who, [
      'The barkeep doesn\'t look up. "Corner table. Don\'t." By the time you turn, the corner table is empty and the back door is swinging.'], [
      { label: 'After her! (Alley Chase: catch her twice)', do: async () => {
        toast('Mira Kesh is running! She slips away once: catch her twice.', 5000);
        const res = await runGame('Alley Chase', {});
        if ((res?.caught || 0) >= 2) { q.step = 3; save(); return null; }
        toast('She got away into the dark. She\'ll be back at the Kraken another night.', 6000); return null;
      } }, leave]) }];
  }
  if (q.step === 3 && npc.kind === 'ship' && /Dezfulian/.test(npc.ship?.land || '')) {
    const pearls = state.pack.pearls || 0;
    return [{ label: 'Ask about a big gem bought off a thief', hint: 'The Light That Went Out', do: () => node(who, [
      'The captain takes a cloth from his coat and unfolds it: a gem the size of a hen\'s egg, gold light moving inside it like something swimming.',
      `"Bought it fair. You want it, you pay what I paid, and a bit for my trouble. ${GEM_PRICE} gold. Or Black Pearls: three of them, and we\'re friends."`], [
      { label: `Pay ${GEM_PRICE} gold`, disabled: state.gold < GEM_PRICE, do: () => { state.gold -= GEM_PRICE; state.spent += GEM_PRICE; return gemBack(who); } },
      { label: 'Trade 3 Black Pearls', hint: `you have ${pearls}`, disabled: pearls < 3, do: () => { state.pack.pearls -= 3; if (!state.pack.pearls) delete state.pack.pearls; return gemBack(who); } },
      leave]) }];
  }
  return [];
  function fennickTells(name, extra = []) {
    q.step = 2; save(); updateStatus();
    return node(name, [...extra, '"Not to whom: who from. Mira Kesh brought it in. She came back a week later and bought it BACK, without the gem. Pried it out and sold it to some ship, I\'d guess."',
      '"She drinks at the Salted Kraken, late. After ten. Corner table. If you go, don\'t tell her my name, and run fast. She does."']);
  }
  function gemBack(name) {
    q.step = 4; note('Got the Scepter of Light back, gem and all'); save(); updateStatus();
    toast('You have the Scepter of Light, gem and all. Take it home to the shrine.', 6000);
    return node(name, ['He wraps the gem in the cloth and hands it over. Back on the quay you set it into the scepter Mira dropped in the alley. It clicks home, and the gold seems to wake up.']);
  }
}
