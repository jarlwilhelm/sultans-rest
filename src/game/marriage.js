// Marriage (Chapter Two, from level 15; docs/chapter-two-plan.md). One spouse at a time, any gender. They live with
// you (your house in Meridia, or your room at the inn). Three ways to marry:
//  1. Courting: talk to them (once a day), bring the gift they love (once a day), help with their problem, then
//     propose. Average spouses with normal perks.
//  2. Levinite (a strange morning): mostly BAD spouses (cost gold, cause trouble, raise suspicion), sometimes
//     decent, rarely good. CASEY only this way: after any job, about 1 in 5 times you get the job's best pay.
//  3. Redman (a favor): always good, with better perks. ROSE only this way: she runs your store and always gets
//     the best price. Casey and Rose are mirror opposites, both perfect spouses, and better-looking than anyone
//     has a right to be (people say so). The only way out of a marriage is Redman.
// Names, people, perks and every line here are a DRAFT by Claude.
import { state, level, note, save } from './state.js';
import { GOODS } from './economy.js';
import { toast, updateStatus } from './ui.js';

export const MARRY_LEVEL = 15;
const leave = { label: 'Leave' };
// The people you can court (posted in meridia/people.js).
export const SUITORS = {
  suitorLira: { name: 'Lira', race: 'elf', likes: 'moonleaf', need: ['moonleaf', 5], needText: 'The florists\' guild wants moonleaf for the spring garlands, and nobody\'s selling.', perk: 'mind' },
  suitorDov: { name: 'Dov', race: 'dwarf', likes: 'gears', need: ['tools', 6], needText: 'My best tools went into the harbor. All of them. Don\'t laugh.', perk: 'tips' },
  suitorSefa: { name: 'Sefa', race: 'tiefling', likes: 'silk', need: ['wool', 8], needText: 'A big order of sails and not enough wool to line them.', perk: 'respect' },
  suitorWren: { name: 'Wren', race: 'halfling', likes: 'dates', need: ['glass', 4], needText: 'The schoolhouse windows broke in the storm. The children are cold.', perk: 'cook' },
};
const PERKS = {
  mind: 'minds your stand: your store\'s shelves sell a quarter faster',
  tips: 'hears things: tells you each morning what the markets will do',
  respect: 'makes you look respectable: suspicion falls faster',
  cook: 'cooks: you wake rested and walk a long way before you tire',
};
const court = () => (state.court ||= {});
export const spouse = () => state.spouse || null;

function marry(sp, how) {
  state.spouse = { ...sp, how, since: state.day };
  state.spouseSeen = state.day;
  note(`Married ${sp.name} (${how})`);
  save(); updateStatus();
  dispatchEvent(new CustomEvent('lavine:spouse'));
}

// Talking to someone you might court.
export function courtOptions(id, name) {
  const s = SUITORS[id];
  if (!s) return [];
  if (state.spouse?.id === id) return [{ label: `Talk with ${s.name}`, do: () => spouseTalk() }];
  if (level() < MARRY_LEVEL || state.spouse) return [];
  const c = court()[id] ||= { aff: 0, talked: 0, gifted: 0, helped: false };
  const opts = [];
  opts.push({ label: `Spend some time with ${s.name}`, hint: c.talked === state.day ? 'tomorrow' : `affection ${c.aff}/100`, disabled: c.talked === state.day, do: () => {
    c.talked = state.day; c.aff = Math.min(100, c.aff + 6); save();
    return { name, text: [['They tell you about their day, and ask about yours, and actually listen.', 'You walk the length of the market together. It takes twice as long as it should.', 'They laugh at something you said. You weren\'t trying to be funny. They laugh anyway.'][Math.floor(Math.random() * 3)]], options: [leave] };
  } });
  opts.push({ label: `Give ${s.name} some ${GOODS[s.likes].name}`, hint: c.gifted === state.day ? 'tomorrow' : `you have ${state.pack[s.likes] || 0}`, disabled: c.gifted === state.day || !(state.pack[s.likes] > 0), do: () => {
    state.pack[s.likes]--; if (!state.pack[s.likes]) delete state.pack[s.likes];
    c.gifted = state.day; c.aff = Math.min(100, c.aff + 12); save(); updateStatus();
    return { name, text: ['"For me? How did you know?" (You asked around. You don\'t say so.)'], options: [leave] };
  } });
  if (!c.helped) opts.push({ label: `Help with ${s.name}'s problem`, hint: `${s.need[1]} ${GOODS[s.need[0]].name} (you have ${state.pack[s.need[0]] || 0})`, do: () => {
    if ((state.pack[s.need[0]] || 0) < s.need[1]) return { name, text: [`"${s.needText}"`], options: [leave] };
    state.pack[s.need[0]] -= s.need[1]; if (!state.pack[s.need[0]]) delete state.pack[s.need[0]];
    c.helped = true; c.aff = Math.min(100, c.aff + 30); save(); updateStatus();
    return { name, text: ['They look at what you\'ve brought, and then at you, for a long moment. "Nobody does things like this. Not here."'], options: [leave] };
  } });
  if (c.aff >= 100) opts.push({ label: `Ask ${s.name} to marry you`, do: () => {
    marry({ id, name: s.name, race: s.race, kind: 'courted', perk: s.perk }, 'courted');
    return { name, text: ['"Yes. Obviously yes. Did you think I\'d say anything else?"', `${s.name} moves into ${state.mer?.home ? 'your house' : 'your room at the inn (you\'ll want a house)'} by the end of the week.`], options: [leave] };
  } });
  return opts;
}

// A Levinite morning (levinite.js): you wake up married.
const NAMES = ['Gorrin', 'Marisol', 'Tavish', 'Brynn', 'Oskar', 'Juna', 'Dace', 'Ilsa', 'Rook', 'Fennick'];
const RACES = ['human', 'orc', 'tiefling', 'halfling', 'elf', 'dwarf', 'gnome'];
const anyPerk = () => ['mind', 'tips', 'respect', 'cook'][Math.floor(Math.random() * 4)];
export function levMarriage() {
  const r = Math.random();
  let sp;
  if (r < 0.06) sp = { id: 'casey', name: 'Casey', race: 'human', kind: 'special', perk: 'casey' };
  else {
    const kind = r < 0.7 ? 'bad' : r < 0.95 ? 'decent' : 'good';
    sp = { id: 'lev-' + state.day, name: NAMES[Math.floor(Math.random() * NAMES.length)], race: RACES[Math.floor(Math.random() * RACES.length)], kind, perk: kind === 'bad' ? null : anyPerk() };
  }
  marry(sp, 'a night you don\'t remember');
  return sp.id === 'casey'
    ? 'There\'s a man asleep beside you, absurdly handsome, with a ring that matches the one on your finger. "Morning," says Casey, as if this is the most natural thing in the world. "I made coffee. I think we\'re married."'
    : `There's a ring on your finger and a stranger in your kitchen. "${sp.name}," they say, offering a hand, then remembering, and offering a kiss instead. ${sp.kind === 'bad' ? 'They have already spent some of your money.' : 'They seem... nice?'}`;
}
// A favor from Redman (redman.js): someone good, or Rose.
export function redmanMarriage() {
  const sp = Math.random() < 0.35 ? { id: 'rose', name: 'Rose', race: 'human', kind: 'special', perk: 'rose' }
    : { id: 'red-' + state.day, name: NAMES[Math.floor(Math.random() * NAMES.length)], race: RACES[Math.floor(Math.random() * RACES.length)], kind: 'good', perk: anyPerk() };
  marry(sp, 'found by Redman');
  return sp.id === 'rose'
    ? 'Three days later a woman knocks on your door: dark eyes, a smile that stops conversations in the street, a ledger under her arm. "Rose," she says. "A mutual friend thought we\'d suit. He was right, wasn\'t he? I\'ve already looked at your store\'s books. We can do better."'
    : `Three days later there is a knock on your door: ${sp.name}, with a letter of introduction in a hand you don't recognise and a coin with no face. "He said you'd be expecting me." You weren't. It works out anyway.`;
}
export function divorce() {
  const sp = state.spouse;
  if (!sp) return null;
  note(`${sp.name} is gone (Redman)`);
  delete state.spouse; save();
  dispatchEvent(new CustomEvent('lavine:spouse'));
  return `In the morning ${sp.name}'s things are gone, and so are they. Nobody in Meridia remembers a wedding. Even the ring is gone.`;
}

// Your spouse, at home.
export function spouseTalk() {
  const sp = spouse();
  if (!sp) return null;
  const perk = sp.perk === 'casey' ? 'has a way of turning up after your jobs with the best pay going (about one time in five)'
    : sp.perk === 'rose' ? 'runs your store: more sold, always at the best price'
    : sp.perk ? PERKS[sp.perk] : 'costs you money and raises eyebrows';
  const away = state.day - (state.spouseSeen ?? state.day);
  state.spouseSeen = state.day; save();
  const lines = sp.kind === 'bad' ? ['"You\'re back. I bought a horse. Don\'t ask where it is."', '"Some guards came by. I told them you weren\'t home. Were you not supposed to be home?"']
    : sp.id === 'casey' ? ['"There you are. I kept your dinner warm and your rivals guessing."', '"The neighbours stare at me. I think they\'re jealous of you."']
    : sp.id === 'rose' ? ['"The store did well today. It always does, now." She doesn\'t look up from the ledger.', '"Half the market came in just to look at me. I sold them everything."']
    : ['"Good day? Tell me everything."', '"I saved you the last of the bread."'];
  return { name: sp.name, text: [away > 5 ? `"${away} days. I was starting to think you'd found someone better." A pause. "You couldn't have."` : lines[Math.floor(Math.random() * lines.length)], `(${sp.name} ${perk}.)`], options: [leave] };
}
// Each morning: a bad spouse costs you; a good one helps (tips, rest).
export function spouseMorning() {
  const sp = spouse();
  if (!sp) return;
  if (sp.kind === 'bad') { const take = Math.min(state.gold, 15 + Math.floor(Math.random() * 25)); state.gold -= take; if (take) note(`${sp.name} spent ${take} gold of yours`); }
  if (sp.perk === 'cook') state.awake = 0;
  if (sp.perk === 'tips') import('./economy.js').then(e => { const n = e.upcomingEvent(); setTimeout(() => toast(`${sp.name}: "${n ? 'Tomorrow, mark me: ' + n.text.toLowerCase() : 'Today: ' + e.marketEvent().text.toLowerCase()}"`, 7000), 2500); });
}
// What the town says (crowd talk): jokey about Casey and Rose; snooty if you've been away from home too long.
export function spouseGossip() {
  const sp = spouse();
  if (!sp) return null;
  if (state.day - (state.spouseSeen ?? state.day) > 5) return `Your ${sp.name} was asking after you. Again. Some people would remember they had a family.`;
  if (sp.id === 'casey') return ['Is that YOUR husband? Casey? How. Just... how.', 'Casey bought bread this morning and the baker gave it to him for free. Nobody gets free bread at the Lantern.'][Math.floor(Math.random() * 2)];
  if (sp.id === 'rose') return ['Rose ran your store today. There was a queue down the avenue. Half of them didn\'t even buy anything.', 'Every merchant in the middle ring has tried to hire Rose away from you. Every one.'][Math.floor(Math.random() * 2)];
  return null;
}
// Casey's luck (npcs.js runGame calls this after a job).
export function caseyLuck(res, best) {
  if (spouse()?.id !== 'casey' || !(best > 0) || Math.random() > 0.2) return res;
  return { ...res, gold: best, summary: `${res.summary || ''} (Casey happened by, and somehow the job paid its best: ${best} gold.)` };
}
