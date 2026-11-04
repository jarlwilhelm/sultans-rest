// Side errands in Sultan's Rest: nine people, each with a small job (docs/sultans-rest-side-quests.md).
// The user approved the nine in outline (2026-11-04); every line, name and number here is a DRAFT by Claude.
// Where they stand and the things you find for them (the pigeon, the deed, the boarded house): ../sidework.js.
// Progress lives in state.side[id] = { step, done, ... }.
import { state, level, note, save, addRenown, isNight } from './state.js';
import { toast, updateStatus, rollCheck } from './ui.js';
import { scepterStatus } from './shrine.js';

const leave = { label: 'Leave' };
const all = () => (state.side ??= {});
const get = (id) => (all()[id] ??= { step: 0 });
const hour = () => state.minute / 60;
const have = (g) => state.pack[g] || 0;
const take = (g, n = 1) => { state.pack[g] -= n; if (!state.pack[g]) delete state.pack[g]; };
function pay(gold, xp, why) {
  if (gold) { state.gold += gold; state.earned += gold; }
  if (xp) addRenown(xp, why);
  save(); updateStatus();
}
function start(id) { get(id).step = 1; save(); toast(`New errand: ${PEOPLE[id].errand}. It's in your journal (Q).`, 4000); }
function finish(id) {
  const q = get(id); q.done = true;
  note(`Errand done: ${PEOPLE[id].errand}`);
  toast(`Errand done: ${PEOPLE[id].errand}`, 4000);
  save();
}
const node = (name, text, options = [leave]) => ({ name, text, options });

// ---------- The nine (pins from the user's planning map: docs/sultans-rest-pins.md) ----------
export const PEOPLE = {
  tamsin: { pin: [-111, 115], level: 2, title: "Tamsin, a sailmaker's widow", role: 'local', race: 'human', body: 'Female_Peasant', errand: 'Sailcloth for Tamsin',
    status: (q) => q.step === 1 && `Bring Tamsin 3 bolts of sailcloth. The ship from Meridia sells it. (You have ${have('sailcloth')}.)` },
  kadir: { pin: [52, 159], level: 2, title: 'Kadir, who keeps pigeons', role: 'local', race: 'human', body: 'Male_Peasant', errand: "Kadir's lost pigeon",
    status: (q) => q.step === 1 ? 'Find Saffron, Kadir\'s grey pigeon with a red ring. "Somewhere at dawn. Pigeons love a king: they don\'t have to bow to him." (No marker. Early morning, 5 to 8 am.)'
      : q.step === 2 && 'Bring Saffron back to Kadir.' },
  brothers: { pin: [124, 94], level: 3, title: 'Omar and Yusuf, brothers', role: 'merchant', race: 'human', body: 'Male_Robe', errand: 'The brothers\' wall',
    status: (q) => q.step === 1 ? 'Find the deed to Omar and Yusuf\'s house. Their father bought it through the Merchants\' Guild. (No marker.)'
      : q.step === 2 && 'Show Omar and Yusuf their father\'s deed.' },
  pia: { pin: [61, 226], level: 3, title: 'Pia, who sells mint tea', role: 'local', race: 'human', body: 'Female_Peasant', scale: 0.62, errand: "Pia's tea stall", status: () => null },
  hesper: { pin: [-140, 270], level: 5, title: 'Old Hesper, the night watchman', role: 'guard', race: 'human', body: 'Male_Peasant', errand: 'Supper for Old Hesper',
    status: (q) => q.step === 1 && `Bring Old Hesper his supper from the Salted Kraken, 9 pm to midnight. Night ${(q.nights || 0) + 1} of 3.${q.carry ? ' (You have it with you.)' : ''}` },
  dalia: { pin: [-117, 183], level: 4, title: 'Dalia, a worried mother', role: 'local', race: 'human', body: 'Female_Peasant', errand: 'A letter for Tarek',
    status: (q) => q.step === 1 ? 'Take Dalia\'s letter to her son Tarek, on the ship from Eldoria. The captain takes letters before 6 pm.'
      : q.step === 2 && 'Go back to Dalia with Tarek\'s reply.' },
  benedek: { pin: [-140, 139], level: 4, title: 'Benedek, a nervous neighbor', role: 'scribe', race: 'gnome', body: 'Male_Peasant', errand: 'The haunted house',
    status: (q) => q.step === 1 ? 'Look through the boards of the house next to Benedek\'s, at night (8 pm to 6 am).'
      : q.step === 2 && 'Tell Benedek what you saw.' },
  zahra: { pin: [-84, 139], level: 8, title: 'Zahra, a retired cook', role: 'local', race: 'human', body: 'Female_Peasant', errand: "Zahra's stew",
    status: (q) => q.step === 1 && `Bring Zahra one each of carrots, tomatoes, pumpkin and melon, from your greenhouse. (You have ${['carrot', 'tomato', 'pumpkin', 'melon'].filter(g => have(g)).length} of 4.)` },
  cyrus: { pin: [-12, 203], level: 6, title: 'Cyrus, an old potter', role: 'merchant', race: 'dwarf', body: 'Male_Peasant', errand: "Ale's debt",
    status: (q) => q.step === 1 && 'Cyrus took your 12 gold for Ale\'s "debt". He looked unhappy about it. See him again tomorrow.' },
};

// ---------- What each one says ----------
const TALK = {
  tamsin(q, who) {
    if (q.done) return node(who, ['"Is the pennant still flying? Good. Bring it in when it rains, or it rots."']);
    if (q.step === 0) return node(who, [
      'An old woman sits on her step with a needle and a heap of torn canvas. "My husband made sails for half the ships in this harbor. Now I patch them, when my eyes let me."',
      '"The Meridian ship carries good sailcloth. Bring me three bolts and I\'ll make you something worth having."'],
      [{ label: '"I\'ll bring it."', do: () => { start('tamsin'); return node(who, ['"Three bolts. Meridian. Not the Eldorian rubbish, it tears if you look at it."']); } }, leave]);
    const ready = have('sailcloth') >= 3;
    return node(who, [ready ? 'She feels the cloth between finger and thumb.' : '"Three bolts of sailcloth. The captain of the Meridian ship sells it."'], [
      { label: 'Give her three bolts of sailcloth', hint: `you have ${have('sailcloth')}`, disabled: !ready, do: () => {
        take('sailcloth', 3); state.flags.pennant = true; pay(15, 15, 'Sailcloth for Tamsin'); finish('tamsin');
        return node(who, ['"Good weave. Meridian." By the time the shadows have moved, she has sewn a long pennant in your colours, with your shop\'s name on it in her husband\'s old lettering.',
          '"Fly that over your stand. People look up before they look at prices." She presses 15 gold on you for the extra cloth.',
          '(Your shop earns a little more each day now.)']);
      } }, leave]);
  },

  kadir(q, who) {
    if (q.done) return node(who, ['"Saffron sends her regards. She\'s been to your window every morning, I hope. Never trust a bird that sleeps in."']);
    if (q.step === 0) return node(who, [
      'A thin man on a ladder, peering at the roofs. "Have you seen a grey pigeon with a red ring on her leg? No? Nobody looks up in this city."',
      '"Saffron. My fastest. She got out yesterday and she won\'t come home. She\'ll be somewhere at dawn, she always is. Pigeons love a king, you know. They don\'t have to bow to him."'],
      [{ label: '"I\'ll keep an eye out."', do: () => { start('kadir'); return node(who, ['"At dawn! She\'s only ever anywhere at dawn."']); } }, leave]);
    if (q.step === 1) return node(who, ['"Any sign? Think like a pigeon. Warm stone. First light. A king who can\'t shoo you away."'], [
      { label: '"Where would she go?" (a straight answer)', do: () => node(who, ['He sighs. "The statue of King Shou in the market square. She sits at his feet at first light. I\'d go myself, but the ladder."'] ) }, leave]);
    return node(who, ['You open your coat. Saffron sticks her head out and makes a rude noise.'], [
      { label: 'Hand Saffron back', do: () => {
        state.flags.pigeonTips = true; pay(0, 15, "Kadir's lost pigeon"); finish('kadir');
        return node(who, ['"Saffron! You fool bird." He holds her like an egg.',
          '"I can\'t pay you much. But here: she\'ll fly to your window every morning with whatever the captains are saying on the quay. Trade gossip travels faster with feathers."',
          '(Each morning, a trade tip.)']);
      } }, leave]);
  },

  brothers(q, who, npc) {
    const omar = npc?.sub === 'omar';
    const me = omar ? 'Omar' : 'Yusuf', other = omar ? 'Yusuf' : 'Omar';
    if (q.done) {
      if (q.outcome === 'deed') return node(who, [`"Both of ours. Both of us mend it. Father always did have the last word." ${other} snorts, but he's smiling.`]);
      return node(who, [q.outcome === me.toLowerCase() ? '"MY wall. Still mine. Good morning to you!"' : `"Don't talk to me. Go and talk to your friend ${other}."`]);
    }
    if (q.step === 0) return node(who, [
      'Two men in front of one house, each with a hand flat on the same wall, shouting. They look so alike it\'s hard to tell who\'s winning.',
      `"${other} wants to knock a window through MY wall," says ${me}. "Tell him. You're a stranger, you're fair. Whose wall is it?"`],
      [{ label: `Side with ${me}`, hint: '30 gold from him; his brother won\'t forgive you', do: () => side(me) },
        { label: `Side with ${other}`, hint: '30 gold from him; his brother won\'t forgive you', do: () => side(other) },
        { label: '"Is there a deed? Who bought the house?"', do: () => { start('brothers'); return node(who, ['"Father did. Forty years ago, through the Merchants\' Guild. Paper? Who keeps paper?"', `"The guild does," says ${other}, sourly. "The guild keeps everything."`]); } },
        leave]);
    function side(winner) {
      const q2 = get('brothers'); q2.outcome = winner.toLowerCase();
      pay(30, 10, 'The brothers\' wall'); finish('brothers');
      return node(who, [`${winner} claps you on the back and counts 30 gold into your hand. The other brother goes inside and slams the door so hard the wall, whoever's it is, shakes.`]);
    }
    if (q.step === 1) return node(who, ['"Found it? No? The Merchants\' Guild has rooms full of paper. Father\'s name was Hamid. Hamid the dyer."']);
    return node(who, ['You unfold the copy of the deed. Both brothers lean in.'], [
      { label: 'Read them the line about the wall', do: () => {
        q.outcome = 'deed'; pay(30, 20, 'The brothers\' wall'); finish('brothers');
        return node(who, ['"...the wall between the two halves shall belong to both sons, and both shall mend it."',
          'A long silence. Then Omar laughs, and Yusuf laughs, and each pays you 15 gold, mostly to stop the other from paying more.',
          '"No window, then," says Yusuf. "A door," says Omar. "We could have a door."']);
      } }, leave]);
  },

  pia(q, who) {
    if (q.done) return node(who, [{
      teach: '"Smile first, price second, never argue!" She recites it at you. "I send people to your stand for cabbages. They come back for tea. Everybody wins."',
      buy: '"Tea, ma\'am? Sir? It\'s your tea really. I just pour it." She grins and holds out your share.',
      ignore: '"Mint tea! Two coppers! Cheaper than the stand on the quay!" She doesn\'t even look at you.',
    }[q.outcome]]);
    return node(who, [
      'A girl of about ten behind an upturned crate, with a kettle and four chipped cups. Her sign says ALE\'S in shaky chalk. Someone has crossed it out and written PIA\'S.',
      '"Mint tea! Two coppers! Better than the stand on the quay!" She looks at you. "Oh. It\'s you. I watched how you do it. You put the cabbages in a pyramid. I put the cups in a pyramid."'],
      [{ label: '"Want to learn how to sell properly?"', hint: 'she sends customers your way', do: () => pia('teach', 15, ['You show her: smile first, say the price before they ask, never argue, always throw in a little extra.', '"That\'s it?" She tries it on the next man by. He buys two cups. Her face is worth more than the coppers.', '(She sends people to your stand: a little more each day.)']) },
        { label: '"I\'ll buy your stall. 40 gold."', hint: 'yours, she keeps working it', disabled: state.gold < 40, do: () => { state.gold -= 40; state.spent += 40; return pia('buy', 10, ['Her eyes go very round. She spits on her palm and holds it out. You shake.', '"I still pour, though. Nobody else knows where the mint comes from." (Her tea is yours now: a little each day.)']); } },
        { label: '"Copy all you like."', hint: 'she\'ll keep undercutting you', do: () => pia('ignore', 5, ['"I will!" She turns to the street. "MINT TEA! CHEAPER THAN THE CABBAGE STAND!"', '(She\'s good. A few of your customers will stop at her crate instead.)']) },
        leave]);
    function pia(outcome, xp, text) { get('pia').outcome = outcome; pay(0, xp, "Pia's tea stall"); finish('pia'); return node(who, text); }
  },

  hesper(q, who) {
    if (q.done) return node(who, ['"Evening. Or morning." He nods up the road toward the boarded house, and says nothing else.']);
    if (q.step === 0) return node(who, [
      'An old man on a stool, a lantern at his feet, a pike leaning on the wall that hasn\'t been sharpened in years. "Evening. Or morning. I lose track. Somebody has to watch the street at night."',
      '"My daughter used to bring my supper from the Salted Kraken. She married a man in Eldoria. Would you? Three nights. Nine till midnight. I pay in stories."'],
      [{ label: '"Three suppers. I\'ll do it."', do: () => { start('hesper'); return node(who, ['"The lamb, if they have it. The fish if they don\'t. Never the soup."']); } }, leave]);
    const night = hour() >= 21;
    if (q.last === state.day && !q.carry) return node(who, ['"One supper a night. I\'m old, not greedy. Same time tomorrow."']);
    if (!q.carry) return node(who, [night ? '"No supper? The Kraken\'s barkeep knows what I like."' : '"Supper\'s at nine. Not before. My stomach keeps better time than the palace bell."']);
    if (!night) return node(who, ['"Is that my supper? Hold onto it. Nine o\'clock. A man needs a routine."']);
    if (q.last === state.day) return node(who, ['"One supper a night. I\'m old, not greedy."']);
    return node(who, ['He lifts the cloth and breathes in.'], [{ label: `Give him his supper (night ${(q.nights || 0) + 1} of 3)`, do: () => {
      q.carry = false; q.last = state.day; q.nights = (q.nights || 0) + 1;
      if (q.nights < 3) { pay(0, 8, 'Supper for Old Hesper'); return node(who, [HESPER_STORIES[q.nights - 1], '"Same time tomorrow?"']); }
      state.flags.hesperHint = true; pay(0, 25, 'Supper for Old Hesper'); finish('hesper');
      return node(who, ['He eats slowly. When he\'s done he wipes his mouth and lowers his voice.',
        '"Something for you, since you\'ve been good to me. The boarded house down the road, the one the Steward condemned. A man goes in there some nights. Never by the door. Never shows his face to the lamp. Twice now."',
        '"I don\'t go near it. Neither should you." He looks at you a moment longer. "But you will."']);
    } }, leave]);
  },

  dalia(q, who) {
    if (q.done) return node(who, [q.outcome === 'told' ? '"I wrote to him. I told him I know, and that I\'m not angry. Well. Not very."' : '"He\'s well. He said so." She smiles, and believes it.']);
    if (q.step === 0) return node(who, [
      'A woman in her doorway, folding and unfolding a letter. "My boy, Tarek. He signed on to the grain ship from Eldoria. He didn\'t say goodbye. He didn\'t say anything."',
      '"Would you take him this? The ship\'s at the piers. The captain will know him. They only take letters before the evening tide: before six."'],
      [{ label: 'Take the letter', do: () => { start('dalia'); return node(who, ['"Thank you. Tell him... no. It\'s all in the letter."']); } }, leave]);
    if (q.step === 1) return node(who, ['"Did you find him? The ship from Eldoria. Before six."']);
    return node(who, ['She takes the reply in both hands. "Is he well? Tell me the truth. Is he well?"'], [
      { label: '"He\'s well. He misses you." (keep his secret)', do: () => { q.outcome = 'kept'; pay(25, 15, 'A letter for Tarek'); finish('dalia');
        return node(who, ['She reads it three times and laughs at the spelling. She presses 25 gold on you and won\'t take it back.']); } },
      { label: '"He\'s well. But he\'s in debt to the bosun." (tell her)', do: () => { q.outcome = 'told'; q.thanks = state.day + 1; pay(25, 15, 'A letter for Tarek'); finish('dalia');
        return node(who, ['Her face crumples, and she sits down on her own doorstep and cries, quietly. You wait.', 'Eventually she stands, wipes her eyes, and gives you 25 gold. "Thank you for not lying to me. Everyone lies to mothers."']); } },
    ]);
  },

  benedek(q, who) {
    if (q.done) return node(who, ['"Not a word about the shutter. Not one." He has nailed it shut himself, crooked.']);
    if (q.step === 0) return node(who, [
      'A gnome in a nightcap, though it isn\'t night. "Don\'t laugh. The boarded house next door. There are noises. At night. Bang. Bang. Nobody has lived there in years. Nobody."',
      '"Would you look? At night, when it happens. I\'ll pay. I am not going in there."'],
      [{ label: '"I\'ll look tonight."', do: () => { start('benedek'); return node(who, ['"Through the boards. Don\'t go in. Promise me you won\'t go in."']); } }, leave]);
    if (q.step === 1) return node(who, ['"Tonight? After dark. That\'s when it bangs."']);
    return node(who, ['"Well?" He\'s holding a candle in each hand.'], [{ label: 'Tell him about the shutter', do: () => {
      pay(10, 10, 'The haunted house'); finish('benedek');
      return node(who, ['"A shutter." He goes slowly red, from the collar up. "A shutter."', '"Here." Ten gold. "For your trouble. And for not telling anyone. Anyone."']);
    } }, leave]);
  },

  zahra(q, who) {
    const crops = ['carrot', 'tomato', 'pumpkin', 'melon'];
    if (q.done) return node(who, ['"Cooked it yet? Three cabbages, a carrot, a tomato, and patience. Mostly the patience."']);
    if (q.step === 0) return node(who, [
      'A broad woman shelling dried beans on her step. "Thirty years I cooked for the palace kitchen. Now nobody brings me anything fresh. Carrots? Tomatoes? A pumpkin? A melon? In this sand?"',
      '"They say you grow things under glass. Bring me one of each and I\'ll teach you the stew that fed the Steward."'],
      [{ label: '"I\'ll bring you some."', do: () => { start('zahra'); return node(who, ['"One of each. Ripe. Don\'t bring me anything you wouldn\'t eat yourself."']); } }, leave]);
    const ready = crops.every(g => have(g));
    return node(who, [ready ? 'She turns each one over in her hands, sniffing the melon like a perfume.' : '"Carrots, tomatoes, a pumpkin, a melon. One of each. You\'ll grow them in that glass house of yours."'], [
      { label: 'Give her carrots, tomatoes, a pumpkin and a melon', disabled: !ready, do: () => {
        crops.forEach(g => take(g)); state.flags.zahraStew = true; pay(0, 25, "Zahra's stew"); finish('zahra');
        return node(who, ['"Ripe. Good." She teaches you in her kitchen, slapping your hand away from the pot more than once.',
          '"Three cabbages, a carrot, a tomato. Slow fire. Cook it at the Transmuters\' workshop, they won\'t mind, they never eat. Sell it hot from your stand. People pay for hot."',
          '(New recipe at the Transmuters\' workshop: Cabbage Stew.)']);
      } }, leave]);
  },

  cyrus(q, who) {
    if (q.done) return node(who, ['"Drink from it every morning, like he did. It leaks a little. So did he." He smiles for the first time.']);
    if (q.wait === state.day) return node(who, ['The door stays shut. "Go away."']);
    if (q.step === 1) {
      if (state.day <= q.day) return node(who, ['"What? We\'re square." He doesn\'t meet your eye.']);
      return node(who, ['He\'s waiting on his step with your twelve gold in a little pile. "Take it back. I couldn\'t sleep."'], [{ label: 'Listen', do: confess }, leave]);
    }
    return node(who, [
      'An old dwarf, clay up to the elbows. He looks you up and down. "Ale\'s sibling. Then you\'ll pay his debts. He owed me twelve gold. For pots."'],
      [{ label: 'Pay him 12 gold', disabled: state.gold < 12, do: () => { state.gold -= 12; state.spent += 12; q.step = 1; q.day = state.day; save(); updateStatus();
          return node(who, ['He counts it slowly, twice, and doesn\'t look any happier. "Good. Good. That\'s settled, then."']); } },
        { label: '"Show me proof."', do: confess },
        { label: '"You\'re lying."', hint: 'Insight, DC 12', do: async () => {
          const r = await rollCheck('Insight', 12);
          if (r.success) return confess();
          q.wait = state.day; save();
          return node(who, ['"Get out!" The door slams. Maybe tomorrow.']);
        } },
        leave]);
    function confess() {
      if (q.step === 1) { state.gold += 12; state.spent -= 12; }
      import('./items.js').then(m => m.give('held:claycup', 'an old potter'));
      pay(0, 20, "Ale's debt"); finish('cyrus');
      return node(who, ['His hands start to shake. "There isn\'t any proof. It was the other way round. I owed HIM. Twelve gold, two years. He told me to forget it. Said a potter\'s worth more than his pots."',
        '"I thought, he\'s dead, his sibling won\'t know..." He takes a clay cup down from the shelf: lopsided, badly glazed. "He made this in my workshop. Drank from it every morning on the way to the quay. It should be yours."',
        '(Ale\'s clay cup: you can hold it, from your inventory.)']);
    }
  },
};

const HESPER_STORIES = [
  '"Lamb. Good." Between mouthfuls: "Forty years I\'ve watched this street. I saw a ship come in with no lights, once. Black sails. Next morning, no ship. Nobody else saw it. So I suppose it didn\'t happen."',
  '"Fish. Fine." He picks out a bone. "You know the pilot with silver in her horns? Nyra. Walks home this way at dawn, most mornings. Always alone. Always looks back once, at the corner. Every time."',
];

// ---------- Talking to them ----------
export function sideTalk(npc) {
  const p = PEOPLE[npc.id];
  const who = npc.label || p.title;
  const q = get(npc.id);
  if (level() < p.level && !q.step && !q.done) return node(who, [IDLE[npc.id]]);
  return TALK[npc.id](q, who, npc);
}
// What they say before you're ready for their errand (the level isn't reached yet).
const IDLE = {
  tamsin: '"Mind the canvas." She doesn\'t look up from her needle.',
  kadir: 'He\'s squinting at the rooftops and doesn\'t notice you.',
  brothers: 'Two brothers arguing over a wall. They don\'t notice you, and you\'re not sure you want them to.',
  pia: '"Mint tea! Two coppers!" She\'s very loud for someone so small.',
  hesper: '"Evening. Or morning." He goes back to watching the street.',
  dalia: 'She\'s reading a letter in her doorway. She folds it away when you come near.',
  benedek: 'He jumps when you get close. "Oh! It\'s only you. Whoever you are."',
  zahra: '"Nothing fresh in this whole city," she tells nobody in particular.',
  cyrus: 'An old potter. He looks at you a long moment, then goes back inside.',
};

// ---------- Hooks into other places ----------
// Extra options for other people: the Kraken's barkeep (Hesper's supper), the Eldorian captain (Dalia's letter).
export function sideOptions(where, npc) {
  const out = [];
  const h = all().hesper;
  if (where === 'inn' && h?.step === 1 && !h.done && !h.carry) out.push({ label: 'A supper to take out, for Old Hesper', hint: '3 gold', disabled: state.gold < 3, do: () => {
    state.gold -= 3; state.spent += 3; h.carry = true; save(); updateStatus();
    return node(npc.label, ['"For Hesper? The lamb, then. He hates the soup." A covered bowl, still hot.']);
  } });
  const d = all().dalia;
  if (where === 'ship' && d?.step === 1 && /Eldoria/.test(npc.ship?.land || '')) {
    const open = hour() >= 6 && hour() < 18;
    out.push({ label: 'Dalia\'s letter for Tarek', hint: open ? 'one of the crew' : 'the captain takes letters before 6 pm', disabled: !open, do: () => {
      d.step = 2; pay(0, 5, 'A letter for Tarek');
      return node(npc.label, ['"Tarek! Letter!" A lanky boy drops down from the rigging, reads it twice, and goes red around the ears.',
        'He writes a reply on the back of a cargo list. Then he grabs your sleeve. "Don\'t tell her I lost my wages at Bones. I owe the bosun. I\'ll pay it back. Just... don\'t tell her."']);
    } });
  }
  return out;
}

// Things you find for them in the world (sidework.js puts them there).
export const pigeonHere = () => all().kadir?.step === 1 && hour() >= 5 && hour() < 8;
export function catchPigeon() {
  get('kadir').step = 2; save();
  toast('You have Saffron. Take her back to Kadir.', 4000);
  return node('A grey pigeon', ['A grey pigeon with a red ring on her leg, fluffed up at the King\'s feet in the first light. She lets you pick her up, and complains about it.']);
}
export const deedHere = () => all().brothers?.step === 1;
export function readDeed() {
  get('brothers').step = 2; save();
  toast('You copied the deed. Take it to Omar and Yusuf.', 4000);
  return node('An old deed', ['Under H, on a high shelf, in a box nobody has opened in years: the deed of Hamid the dyer.',
    '"...the house in two halves to his two sons, and the wall between the two halves shall belong to both sons, and both shall mend it."',
    'The clerk lets you copy it out, for nothing, because nobody has asked to see anything on that shelf in his lifetime.']);
}
export function lookThroughBoards() {
  const b = all().benedek;
  if (b?.step === 1 && isNight()) {
    b.step = 2; save();
    return node('The boarded house', ['Bang. You jump. Bang.', 'You put your eye to a gap in the boards. An empty room. Dust, thick and grey, with no footprints in it. At the back a loose shutter swings in the wind and hits its frame. Bang.', 'That\'s all. There is nothing in there at all.']);
  }
  return node('The boarded house', ['Boards nailed across the door and windows. A notice, sun-bleached: CONDEMNED BY ORDER OF THE STEWARD.',
    'Through a gap: an empty room, and dust.', ...(b?.step === 1 ? ['(Benedek said the noises come at night.)'] : [])]);
}

// Every morning: the pennant, Pia's tea, Saffron's gossip, Dalia's thanks. Returns gold and lines for the day's note.
export function sideMorning(tip) {
  let gold = 0; const lines = [];
  if (state.flags.pennant) { gold += 2; }
  const p = all().pia;
  if (p?.done) gold += { teach: 2, buy: 3, ignore: -1 }[p.outcome] || 0;
  const d = all().dalia;
  if (d?.thanks && state.day >= d.thanks) { delete d.thanks; addRenown(10, 'Dalia\'s thanks'); lines.push('Dalia left a loaf of honey bread at your door, still warm. No note.'); }
  if (state.flags.pigeonTips && tip) lines.push(`Saffron the pigeon taps at your window. Word from the quay: ${tip}`);
  return { gold, lines };
}

// For the journal's Errands tab.
export function errandLog() {
  const started = [], done = [];
  let waiting = 0;
  for (const [id, p] of Object.entries(PEOPLE)) {
    const q = all()[id];
    if (q?.done) done.push(p.errand);
    else if (q?.step) started.push({ title: p.errand, text: p.status(q) || '' });
    else if (level() >= p.level) waiting++;
  }
  const sc = scepterStatus();                          // the shrine keeper's quest (shrine.js)
  if (sc?.done) done.push(sc.title); else if (sc) started.push(sc);
  return { started, done, waiting };
}
