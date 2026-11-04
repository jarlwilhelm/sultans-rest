// Talking to Meridia's people (npc.kind 'meridia', npc.id from meridia/people.js). Chapter Two's story beats
// for Arthur, Ben, the Tallyman and the forger live in meridia/story.js; courting in game/marriage.js.
// Every line is a DRAFT by Claude.
import { state, level, note, save, addRenown, packRoom } from '../game/state.js';
import { GOODS, marketEvent, upcomingEvent } from '../game/economy.js';
import { updateStatus, toast, trade, closePanel } from '../game/ui.js';
import { contractOptions } from '../game/contracts.js';
import { travelTo, voyage, voyageText, CREW_PAY } from '../place.js';
import { innPaid, payWeek, leftText } from './inn.js';
import { MERIDIA_FOLK } from './people.js';
import { storyTalk } from './story.js';
import { courtOptions, spouseTalk } from '../game/marriage.js';
import { dealerTalk, buyerTalk } from './watch.js';

const leave = { label: 'Leave' };
const mer = () => (state.mer ||= { innUntil: 0, home: 0, store: 0, bay: false, bayGoods: {}, shelves: {}, till: 0, lastSale: null });
export const INN_WEEK = 30;
// Deeds at the Exchange: your house (outer ring plot) and your store (middle ring plot).
export const HOMES = [null, { name: 'Cottage', fee: 600, level: 12 }, { name: 'House', fee: 1800, level: 14 }, { name: 'Townhouse', fee: 4000, level: 17 }];
export const STORES = [null, { name: 'Small shop', fee: 1200, level: 13 }, { name: 'Store', fee: 3500, level: 16 }, { name: 'Trading house', fee: 7000, level: 18 }];
export const HOLDS = [{ add: 60, fee: 800, level: 13 }, { add: 120, fee: 2200, level: 16 }, { add: 200, fee: 5000, level: 19 }];

function innkeeper(name) {
  const m = mer(), paid = innPaid();
  return { name, text: [paid ? `"Your room's yours for another ${leftText()}. Breakfast is whatever's left."` : '"A room? Thirty a week, paid up front, and not a night before. The sea air\'s free."'], options: [
    { label: paid ? `Pay another week (${INN_WEEK} gold)` : `Take a room for a week (${INN_WEEK} gold)`, hint: paid ? `${leftText()} left` : 'seven days from now', disabled: state.gold < INN_WEEK, do: () => {
      payWeek(); state.gold -= INN_WEEK; state.spent += INN_WEEK; note(`Paid the Brine & Barrel for a week (${leftText()} left)`); save(); updateStatus();
      return { name, text: [`"Room three, top of the stairs. Don't mind the gulls." (Your room: ${leftText()}.)`], options: [leave] };
    } },
    { label: 'Sleep until morning', hint: paid ? '' : m.home ? 'you have a house now' : 'pay for a room first', disabled: !paid, do: () => { closePanel(true); import('../game/rest.js').then(r => import('../game/npcs.js').then(n => r.sleepUntilMorning('inn', n.newDay))); return 'keep'; } },
    { label: 'Heard any news?', do: () => ({ name, text: [newsLine()], options: [leave] }) },
    leave,
  ] };
}
// A line of harbor news: today's market event, or the one coming tomorrow.
export function newsLine() {
  const next = upcomingEvent();
  if (next && Math.random() < 0.6) return `"They're saying it on the quay already: ${next.text.charAt(0).toLowerCase() + next.text.slice(1)} Starting tomorrow, if it's true."`;
  return `"${marketEvent().text}"`;
}
function harbormaster(name) {
  return { name, text: ['"Your ship\'s at the end of the Grand Pier, captain. Ready when you are."'], options: [
    { label: "Sail home to Sultan's Rest", hint: `about two months along the coast · ${CREW_PAY} gold for the crew`, disabled: state.gold < CREW_PAY, do: () => {
      voyage('sultans_rest').then(kept => {
        const f = document.getElementById('fade'); f.style.whiteSpace = 'pre-line'; f.textContent = voyageText('sultans_rest', kept); f.classList.add('on');
        setTimeout(() => travelTo('sultans_rest'), 3800);
      });
      return 'keep';
    } },
    { label: 'What sells here?', do: () => ({ name, text: ['"Everything from the East. Saffron, silk, glass, wine from the Dominion. We\'ve wool and oil and marble to spare, and good tools from the West. Buy those, sell them over there, and you\'ll do fine."'], options: [leave] }) },
    leave,
  ] };
}
function clerk(name) {
  const m = mer(), options = [];
  const h = HOMES[m.home + 1], s = STORES[m.store + 1], hold = HOLDS[state.holds || 0];
  if (h) options.push({ label: `Buy the deed: ${h.name} (your house)`, hint: `level ${h.level}, ${h.fee} gold`, disabled: level() < h.level || state.gold < h.fee, do: () => buy('home', h, name) });
  if (s) options.push({ label: `Buy the deed: ${s.name} (your store)`, hint: `level ${s.level}, ${s.fee} gold`, disabled: level() < s.level || state.gold < s.fee, do: () => buy('store', s, name) });
  if (hold) options.push({ label: `Enlarge your ship's hold (+${hold.add})`, hint: `level ${hold.level}, ${hold.fee} gold`, disabled: level() < hold.level || state.gold < hold.fee, do: () => {
    state.gold -= hold.fee; state.spent += hold.fee; state.holds = (state.holds || 0) + 1; state.holdBonus = (state.holdBonus || 0) + hold.add;
    note(`The shipwrights enlarged your hold (+${hold.add})`); save(); updateStatus();
    return { name, text: [`"The shipwrights will have it done by morning. You can carry ${hold.add} more."`], options: [leave] };
  } });
  options.push(...contractOptions('meridia', name));
  options.push({ label: 'How do I stand with the merchant houses?', do: () => ({ name, text: [`"Your standing with the Exchange is ${state.reputation.exchange || 0}. Keep your contracts and it grows; every five points, the city pays you a little more."`], options: [leave] }) });
  options.push(leave);
  return { name, text: ['"Deeds, contracts, coin. The Exchange keeps the Republic\'s accounts, and yours, if you let it."'], options };
}
function buy(kind, d, name) {
  const m = mer();
  state.gold -= d.fee; state.spent += d.fee; m[kind] += 1;
  note(`Bought in Meridia: ${d.name}`); addRenown(20, `a ${d.name.toLowerCase()} in Meridia`);
  save(); updateStatus();
  dispatchEvent(new CustomEvent('lavine:mer-property'));
  const where = kind === 'home' ? ['', 'In the outer ring, west of the avenue.', 'In the middle ring, west side, up the hill from the market.', 'On the Hill itself, beside the Republic Hall.'][m.home]
    : ['', 'In the middle ring, by the market.', 'Across the avenue from the Gilded Gull, a bigger place.', 'On the Hill, facing the Republic Hall.'][m.store];
  const moved = (kind === 'home' ? m.home : m.store) > 1 ? ' We\'ll sell the old one for you; your things are already moved.' : '';
  return { name, text: [`"Signed and sealed. The ${d.name.toLowerCase()} is yours. ${where}${moved}" (It's marked on your map.)`], options: [leave] };
}
function warehouse(name) {
  const m = mer();
  if (!m.bay) return { name, text: ['"A bay of your own? Two hundred and fifty, and you can leave whatever you like in it. Safe as the Republic."'], options: [
    { label: 'Rent a bay for good (250 gold)', hint: level() < 12 ? 'level 12' : '', disabled: level() < 12 || state.gold < 250, do: () => { m.bay = true; state.gold -= 250; state.spent += 250; note('Rented a warehouse bay in Meridia'); save(); updateStatus(); return warehouse(name); } },
    leave,
  ] };
  const stored = Object.entries(m.bayGoods).filter(([, n]) => n > 0);
  const opts = [];
  for (const [g, n] of Object.entries(state.pack).slice(0, 4)) opts.push({ label: `Store all your ${GOODS[g].name} (${n})`, do: () => { m.bayGoods[g] = (m.bayGoods[g] || 0) + n; delete state.pack[g]; save(); updateStatus(); return warehouse(name); } });
  for (const [g, n] of stored.slice(0, 4)) opts.push({ label: `Take out ${GOODS[g].name} (${n})`, do: () => { const room = Math.max(0, packRoom()); const k = Math.min(n, room); if (!k) { toast('Your pack is full.'); return warehouse(name); } m.bayGoods[g] -= k; state.pack[g] = (state.pack[g] || 0) + k; save(); updateStatus(); return warehouse(name); } });
  return { name, text: [stored.length ? `In your bay: ${stored.map(([g, n]) => `${n} ${GOODS[g].name}`).join(', ')}.` : 'Your bay is empty.'], options: [...opts, leave] };
}
function gate(id, name) {
  if (id === 'innerGuard') {
    const ok = state.flags.innerPass || state.flags.noblePapers || state.gold >= 20000;
    return { name, text: [ok ? '"Your standing is clear. Pass, and welcome to the Hill."'
      : '"The Hill is for those who can show their standing. Twenty thousand in gold, shown, not spent. Noble papers. Or a pass with the Republic\'s seal. Until then, this is as far as you go."'], options: [
      ...(state.gold >= 20000 && !state.flags.innerPass ? [{ label: 'Show your gold', do: () => { state.flags.innerPass = true; note('Showed 20,000 gold at the Inner Gate'); save(); return { name, text: ['He counts with his eyes, not his hands. "Pass."'], options: [leave] }; } }] : []),
      leave] };
  }
  if (id === 'midGuard') return { name, text: [state.suspicion > 50 ? '"You again. Open your pack. Slowly."' : '"Cargo through the Middle Gate gets looked at. Nothing personal. Move along."'], options: [leave] };
  return { name, text: ['"Welcome to Meridia. Keep to the avenue, and keep your purse close in the outer streets."'], options: [leave] };
}

export function meridiaTalk(npc) {
  const f = MERIDIA_FOLK[npc.id];
  const name = f?.title || npc.label;
  if (npc.id === 'innkeeper') return innkeeper(name);
  if (npc.id === 'harbormaster') return harbormaster(name);
  if (npc.id === 'forger') state.flags.forgerAsked = true;
  if (npc.id === 'clerk') return clerk(name);
  if (npc.id === 'warehouse') return warehouse(name);
  if (/Guard$/.test(npc.id)) return gate(npc.id, name);
  if (npc.id === 'spouse') return spouseTalk();
  if (npc.id === 'dealer') return dealerTalk(name);
  if (npc.id === 'buyer') return buyerTalk(name);
  if (/^suitor/.test(npc.id)) return { name, text: ['"Hello there. You\'re new, aren\'t you? Everyone can tell."'], options: [...courtOptions(npc.id, name), leave] };
  if (npc.id === 'redman') return { name, text: ['A man in a plain cloak, at your door, as if he had always been there.'], options: [leave] };
  return storyTalk(npc.id, name) || { name, text: ['"Good day."'], options: [leave] };
}
// Your stand on the quay: sell to passers-by (your customers pay retail, like Ale's stand).
export function popupTrade() {
  trade({ id: 'popup-m', type: 'own', tier: 0 }, { title: 'Your pop-up stand: Meridians buy', where: 'your pop-up stand' });
}
