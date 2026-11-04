// Levinite's other side in Meridia (Chapter Two): the dealer and the buyers, suspicion, the Middle Gate's
// searches, and the guard who comes to your shop when people talk (the user's design):
//  - When suspicion is high, a guard visits your shop in the morning and looks through your wares (and may buy
//    something if you're not on their bad side). Levinite in your pack or your shop's stock (shelves, warehouse
//    bay) is confiscated and you're fined. Can't pay: a while in the gaol; you wake outside it, told what it cost.
//  - Suspicion: selling Levinite, carrying it through the Middle Gate, getting caught at the Customs House and a
//    bad spouse raise it; it falls a little every day (more with a respectable spouse).
// Every line is a DRAFT by Claude.
import { state, note, save } from '../game/state.js';
import { GOODS, sellPrice } from '../game/economy.js';
import { talk, trade, toast, updateStatus } from '../game/ui.js';
import { addSuspicion, suspicion } from '../game/levinite.js';
import { C, R_MID } from './layout.js';

const leave = { label: 'Leave' };
const night = () => state.minute >= 20 * 60 || state.minute < 5 * 60;

export function dealerTalk(name) {
  if (!night()) return { name, text: ['The doorway is empty in daylight. Only a smell, faintly sweet, like violets left too long in a jar.'], options: [leave] };
  const supplier = !!state.flags.levSell;
  return { name, text: [supplier ? '"Ben\'s friend. Same price as always, and the same rule: you never got it from me."' : 'A voice from under the hood. "First one\'s cheap. Nights are long in this city. They don\'t have to be."'], options: [
    { label: supplier ? 'Buy vials at the wholesale price' : 'Buy a vial', do: () => { trade({ id: 'lev-dealer', type: 'lev', wholesale: supplier }, { title: name, where: 'the hooded dealer' }); return 'keep'; } },
    leave,
  ] };
}
export function buyerTalk(name) {
  if (!state.flags.levSell) return { name, text: ['"Waiting for a friend." They don\'t look at you again.'], options: [leave] };
  if (!night()) return { name, text: ['"Not in daylight. Come back when the lamps are lit."'], options: [leave] };
  return { name, text: ['"Ben says you\'re reliable. Show me."'], options: [
    { label: 'Sell Levinite', hint: 'raises suspicion', do: () => {
      const before = state.pack.levinite || 0;
      trade({ id: 'lev-buyer', type: 'lev', buyer: true }, { title: name, where: 'the buyer behind the Gilded Gull', onDone: () => { const sold = before - (state.pack.levinite || 0); if (sold > 0) addSuspicion(sold * 2, 'Levinite changing hands behind the Gilded Gull'); save(); } });
      return 'keep';
    } },
    leave,
  ] };
}

// Contraband anywhere you keep things in Meridia.
function contraband() {
  const m = state.mer || {};
  return (state.pack.levinite || 0) + (m.shelves?.levinite || 0) + (m.bayGoods?.levinite || 0);
}
function confiscate() {
  const n = contraband(), m = state.mer || {};
  delete state.pack.levinite; if (m.shelves) delete m.shelves.levinite; if (m.bayGoods) delete m.bayGoods.levinite;
  return n;
}
// Fined, or the gaol: you wake outside it, told what it cost.
function punish(n, where) {
  const fine = 150 + n * 25;
  addSuspicion(10);
  if (state.gold >= fine) {
    state.gold -= fine; state.spent += fine;
    note(`${where}: ${n} vials of Levinite confiscated, fined ${fine} gold`);
    return [`They take all ${n} vials, and ${fine} gold for the Republic's trouble.`];
  }
  const lost = state.gold;
  state.gold = 0; state.day += 3; state.minute = 9 * 60;
  note(`${where}: ${n} vials confiscated; couldn't pay the ${fine} gold fine; three days in the gaol (lost ${lost} gold)`);
  dispatchEvent(new CustomEvent('lavine:jailed'));
  return [`You can't pay the ${fine} gold. Three days in the Republic's gaol.`, `When they let you out into the street you've lost all ${n} vials, the ${lost} gold you had on you, and three days of trade.`];
}

// Each morning in Meridia: maybe a guard comes to your shop.
export function morningWatch() {
  if (state.place !== 'meridia') return;
  state.suspicion = Math.max(0, suspicion() - (state.spouse?.perk === 'respect' ? 6 : state.spouse && state.spouse.kind !== 'bad' ? 4 : 2));
  if (state.spouse?.kind === 'bad') addSuspicion(2);
  if (suspicion() < 50 || Math.random() > suspicion() / 140) return;
  const where = state.mer?.store ? 'your store' : 'your pop-up stand';
  const n = contraband();
  let text = [`A guard is waiting at ${where} when you arrive, turning your goods over one by one. "People talk. I listen. Don't mind me."`];
  if (n) text = text.concat(punish(confiscate(), 'A guard searched your shop'));
  else if (suspicion() < 80 && Object.keys(state.pack).length) {
    const g = Object.keys(state.pack)[0], p = sellPrice({ id: 'own', type: 'own', tier: 1 }, g) || GOODS[g].base;
    state.pack[g]--; if (!state.pack[g]) delete state.pack[g]; state.gold += p;
    text.push(`Nothing. He looks almost disappointed, then buys a ${GOODS[g].name.toLowerCase()} for ${p} gold and leaves.`);
  } else text.push('Nothing. He leaves without a word, which is worse.');
  save(); updateStatus();
  setTimeout(() => talk({ name: 'A visit', text, options: [leave] }), 1500);
}

// Walking up through the Middle Gate with Levinite: a search, more likely the more people suspect you.
let wasInside = null;
export function gateWatch(player) {
  const r = Math.hypot(player.x - C.x, player.z - C.z), inside = r < R_MID;
  if (wasInside === false && inside && Math.abs(player.x) < 8 && state.pack.levinite > 0 && Math.random() < 0.15 + suspicion() / 120) {
    const text = ['"Stop there. Open the pack." Sergeant Vell goes through it with practised hands.', ...punish(confiscate(), 'Searched at the Middle Gate')];
    save(); updateStatus();
    talk({ name: 'The Middle Gate', text, options: [leave] });
  }
  wasInside = inside;
}
export { toast };
