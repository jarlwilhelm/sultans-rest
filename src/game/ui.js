// On-screen panels: the status bar, conversations, trading, dice rolls and the character sheet.
// While a panel is open the mouse is free and you don't walk.
import { inMeridia } from '../place.js';
import { innPaid, leftText } from '../meridia/inn.js';
import { state, rank, nextRank, RANKS, SKILLS, skillBonus, mod, packCount, capacity, clock, save, level, LEVELS, UNLOCKS } from './state.js';
import { GOODS, goodsFor, buyPrice, sellPrice, buy, sell, remember, bestSeen } from './economy.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export const ui = { open: null, onClose: null };
export const busy = () => !!ui.open;

export function toast(text, ms = 2600) {
  const t = $('toast');
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add('hidden'), ms);
}

export function updateStatus() {
  $('st-gold').textContent = `${state.gold} gold`;
  $('st-rank').textContent = `Level ${level()} · ${rank().name}`;
  $('st-time').textContent = `Day ${state.day} · ${clock()}`;
  $('st-pack').textContent = `Pack ${packCount()}/${capacity()}`;
  // Meridia: the room at the inn counts down with the world's clock (meridia/inn.js).
  const room = $('st-room');
  if (room) {
    const show = inMeridia && !state.mer?.home && (state.mer?.innEnd || state.mer?.innUntil);
    const paid = show && innPaid();
    room.classList.toggle('hidden', !show);
    if (show) room.textContent = paid ? `Room ${leftText().replace(/ (\d+ min)$/, '').replace(/ days? /, 'd ').replace(/ hours?/, 'h')}` : 'Room: unpaid';
    if (roomWasPaid && show && !paid) toast('Your week at the Brine & Barrel is up. Pay Tobin before you sleep.', 6000);
    roomWasPaid = !!paid;
  }
}
let roomWasPaid = false;

function openPanel(node, { onClose } = {}) {
  closePanel(true);
  const p = $('panel');
  p.replaceChildren(node);
  p.classList.remove('hidden');
  ui.open = node;
  ui.onClose = onClose || null;
  if (document.pointerLockElement) document.exitPointerLock();
}
export function closePanel(silent = false) {
  const p = $('panel');
  if (!ui.open) return;
  p.classList.add('hidden');
  p.replaceChildren();
  const cb = ui.onClose;
  ui.open = null; ui.onClose = null;
  save();
  updateStatus();
  if (!silent && cb) cb();
  if (!silent) $('resume').classList.remove('hidden');
}

// ---------- Conversations ----------
// node: { name, text, options: [{ label, do: () => node | null | undefined, hint }] }
export function talk(node) {
  if (!node) { closePanel(); return; }
  const box = el('div', 'dialog');
  box.append(el('div', 'who', node.name));
  for (const para of [].concat(node.text)) box.append(el('p', 'says', para));
  const opts = el('div', 'options');
  (node.options || [{ label: 'Leave' }]).forEach((o, i) => {
    const b = el('button', 'opt');
    b.append(el('span', 'num', String(i + 1)), el('span', '', o.label));
    if (o.hint) b.append(el('span', 'hint', o.hint));
    if (o.disabled) b.disabled = true;
    b.onclick = () => choose(o);
    opts.append(b);
  });
  box.append(opts);
  box.dataset.keys = 'options';
  openPanel(box);
  box._options = node.options || [{ label: 'Leave' }];
}
async function choose(o) {
  if (o.disabled) return;
  const next = o.do ? await o.do() : null;
  if (next === 'keep') return;
  talk(next);
}

// ---------- Dice ----------
// Rolls a d20 + skill bonus against a DC, with a little animation. Resolves to { roll, total, success }.
export function rollCheck(skill, dc, { advantage = false } = {}) {
  return new Promise((resolve) => {
    const bonus = skillBonus(skill);
    const r1 = 1 + Math.floor(Math.random() * 20), r2 = 1 + Math.floor(Math.random() * 20);
    const roll = advantage ? Math.max(r1, r2) : r1;
    const total = roll + bonus;
    const success = roll === 20 || (roll !== 1 && total >= dc);
    const box = el('div', 'dice');
    box.append(el('div', 'who', `${skill} check`), el('div', 'dc', `DC ${dc}`));
    const die = el('div', 'die', '20');
    box.append(die);
    const line = el('div', 'roll-line', ' ');
    box.append(line);
    const verdict = el('div', 'verdict', ' ');
    box.append(verdict);
    const prev = ui.open;
    const p = $('dicebox');
    p.replaceChildren(box);
    p.classList.remove('hidden');
    let n = 0;
    const spin = setInterval(() => {
      die.textContent = String(1 + Math.floor(Math.random() * 20));
      if (++n > 14) {
        clearInterval(spin);
        die.textContent = String(roll);
        die.classList.toggle('crit', roll === 20);
        die.classList.toggle('fumble', roll === 1);
        const sign = bonus >= 0 ? '+' : '−';
        line.textContent = `${roll} ${sign} ${Math.abs(bonus)} (${skill}) = ${total}${advantage ? '  (advantage: ' + r1 + ', ' + r2 + ')' : ''}`;
        verdict.textContent = roll === 20 ? 'Natural 20!' : roll === 1 ? 'Natural 1...' : success ? 'Success' : 'Failure';
        verdict.className = 'verdict ' + (success ? 'good' : 'bad');
        setTimeout(() => { p.classList.add('hidden'); void prev; resolve({ roll, total, success }); }, 1300);
      }
    }, 60);
  });
}

// ---------- Trading ----------
export function trade(market, { title, onDone, renownFor, where: place }) {
  const box = el('div', 'trade');
  const head = el('div', 'who', title);
  const info = el('div', 'trade-info');
  const cols = el('div', 'cols');
  const left = el('div', 'col'), right = el('div', 'col');
  cols.append(left, right);
  const msg = el('div', 'trade-msg', ' ');
  const leave = el('button', 'opt leave');
  leave.append(el('span', 'num', 'Esc'), el('span', '', 'Done'));
  leave.onclick = () => { closePanel(true); onDone?.(); };
  box.append(head, info, cols, msg, leave);

  function row(good, price, btns) {
    const r = el('div', 'row');
    const sw = el('span', 'swatch'); sw.style.background = GOODS[good].color;
    const name = el('span', 'gname', GOODS[good].name);
    const from = el('span', 'from', GOODS[good].from.replace(/^the /, '').replace(' (passage escort)', ''));
    const pr = el('span', 'price', `${price} g`);
    r.append(sw, name, from, pr, ...btns);
    return r;
  }
  function btn(label, fn, off) { const b = el('button', 'small', label); b.disabled = !!off; b.onclick = fn; return b; }

  const where = place || title;
  const ago = (d) => d === state.day ? 'today' : d === state.day - 1 ? 'yesterday' : `${state.day - d} days ago`;
  function render() {
    info.textContent = `You have ${state.gold} gold · pack ${packCount()}/${capacity()} · prices move as you buy and sell`;
    for (const g of new Set([...goodsFor(market), ...Object.keys(state.pack)])) remember(market, where, g, buyPrice(market, g), sellPrice(market, g));
    left.replaceChildren(el('h3', '', 'They sell'));
    for (const g of goodsFor(market)) {
      const p = buyPrice(market, g);
      if (p == null) continue;
      const room = capacity() - packCount();
      left.append(row(g, p, [
        btn('Buy 1', () => act(buy(market, g, 1)), state.gold < p || room < 1),
        btn('Buy 5', () => act(buy(market, g, 5)), state.gold < p || room < 1),
      ]));
    }
    right.replaceChildren(el('h3', '', 'They buy from your pack'));
    const mine = Object.keys(state.pack);
    if (!mine.length) right.append(el('p', 'empty', 'Your pack is empty.'));
    for (const g of mine) {
      const p = sellPrice(market, g);
      const r = row(g, p ?? '—', p == null ? [el('span', 'nope', 'won\'t buy')] : [
        btn('Sell 1', () => sold(sell(market, g, 1))),
        btn(`Sell all (${state.pack[g]})`, () => sold(sell(market, g, state.pack[g]))),
      ]);
      const best = bestSeen(g).sell;
      if (best && best.where !== where && p != null && best.price > p) r.insertBefore(el('span', 'paid up', `${best.price} at ${best.where}, ${ago(best.day)}`), r.querySelector('.small'));
      const paid = state.paid?.[g];
      if (paid && paid.n > 0 && p != null) {
        const avg = Math.round(paid.cost / paid.n);
        const tip = el('span', 'paid ' + (p > avg ? 'up' : p < avg ? 'down' : ''), `paid ${avg}`);
        r.insertBefore(tip, r.querySelector('.small'));
      }
      right.append(r);
    }
    updateStatus();
  }
  function act(err) { msg.textContent = err || ' '; render(); }
  function sold(res) {
    if (res.error) { msg.textContent = res.error; render(); return; }
    msg.textContent = res.profit > 0 ? `+${res.gold} gold (profit ${res.profit})` : `+${res.gold} gold`;
    if (res.profit > 0 && renownFor) renownFor(res.profit);
    render();
  }
  render();
  openPanel(box, { onClose: onDone });
}

// ---------- Quests (Q, or J) ----------
// Tabs: what you're doing now (every step of the chapter you're in, with when and where), the chapters
// you've finished, and what's still to come. (Daily quests get their own tab when they're built.)
const hourText = (h) => `${((h + 11) % 12) + 1} ${h < 12 || h === 24 ? 'am' : 'pm'}`;
let questTab = 'now';
export async function journal(tab = questTab) {
  questTab = tab;
  const { questLog } = await import('./quests.js');
  const log = questLog();
  const box = el('div', 'sheet quests');
  box.append(el('div', 'who', 'Quests'));
  const tabs = el('div', 'tabs');
  const { notices, describe } = await import('./daily.js');
  const daily = notices();
  const { errandLog } = await import('./sidequests.js');
  const errands = errandLog();
  for (const [id, label] of [['now', 'Now'], ['daily', `Daily (${daily.filter(q => !q.done).length})`], ['errands', `Errands (${errands.started.length})`], ['done', `Finished (${log.filter(q => q.done).length})`], ['later', 'Still to come']]) {
    const b = el('button', 'tab' + (id === tab ? ' on' : ''), label);
    b.onclick = () => journal(id);
    tabs.append(b);
  }
  box.append(tabs);
  if (tab === 'now') {
    const q = log.find(x => !x.done && !x.locked && x.steps.some(s => s.current));
    if (!q) {
      const next = log.find(x => !x.done);
      box.append(el('p', 'small-note', next ? `Nothing to do in the story right now. "${next.title}" opens at level ${next.level}: work and trade to get there (you're level ${level()}).`
        : 'You have finished every quest there is, for now.'));
    } else {
      box.append(el('h3', '', `${q.title} · level ${q.level}`));
      const left = q.steps.filter(s => !s.done && !s.current).length;
      for (const st of q.steps) {
        if (st.done) { box.append(el('div', 'qstep done', '✓ ' + st.text)); continue; }
        if (!st.current) continue;
        const cur = el('div', 'qstep now');
        cur.append(el('div', 'stat prof', '▸ ' + st.text));
        if (st.gate) {
          const bar = el('div', 'bar'); const fill = el('div', 'fill'); fill.style.width = `${(st.gate.have / st.gate.need) * 100}%`; bar.append(fill);
          cur.append(bar, el('p', 'small-note', `${st.gate.have} / ${st.gate.need} gold${level() < st.gate.level ? ` · needs level ${st.gate.level} (you're ${level()})` : ''}`));
        }
        if (st.hours) cur.append(el('p', 'small-note', `When: ${hourText(st.hours[0])} to ${hourText(st.hours[1])}. ${st.open ? 'That\'s now.' : `It's ${clock()} now.`}`));
        if (st.marked) cur.append(el('p', 'small-note', 'Where: your compass points the way (M for the map).'));
        if (st.revealedHint) cur.append(el('p', 'small-note', st.revealedHint));
        if (st.hidden) {
          // A clue you work out yourself; asking around shows the way (and what people told you).
          cur.append(el('p', 'small-note', 'No marker for this one: work it out, or ask around.'));
          const ask = el('button', 'opt'); ask.append(el('span', 'num', '?'), el('span', '', 'Ask around (shows the way on your compass)'));
          ask.onclick = async () => { const { askAround } = await import('./quests.js'); askAround(); journal('now'); };
          cur.append(ask);
        }
        box.append(cur);
      }
      if (left) box.append(el('p', 'small-note', `${left} more step${left > 1 ? 's' : ''} after this.`));
    }
    if (state.loan) { const d = state.loan.due - state.day; box.append(el('p', 'small-note', `You owe Rashid ${state.loan.owe} gold, ${d > 0 ? `due in ${d} day${d > 1 ? 's' : ''}` : d === 0 ? 'due today' : 'and it\'s late: his man will collect in the morning'}.`)); }
    const n = nextRank();
    if (n) box.append(el('p', 'small-note', `Your shop's next step: the ${n.property} (level ${n.level}, ${n.fee} gold), from ${n.where}.`));
  } else if (tab === 'daily') {
    box.append(el('p', 'small-note', 'From the trade notices board on the quay, between the market and your stand. New ones every morning; they\'re gone at midnight.'));
    for (const q of daily) {
      const d = describe(q);
      const row = el('div', 'qstep' + (q.done ? ' done' : ' now'));
      row.append(el('div', 'stat' + (q.done ? '' : ' prof'), (q.done ? '✓ ' : '▸ ') + d.title));
      if (!q.done) row.append(el('p', 'small-note', `${d.where} Pays ${q.gold} gold and ${q.xp} XP.`));
      box.append(row);
    }
  } else if (tab === 'errands') {
    // Side errands for people around Sultan's Rest (sidequests.js).
    box.append(el('p', 'small-note', 'Small jobs for people in the side streets. They wait for you; take your time.'));
    for (const e of errands.started) {
      const row = el('div', 'qstep now');
      row.append(el('div', 'stat prof', '▸ ' + e.title));
      if (e.text) row.append(el('p', 'small-note', e.text));
      box.append(row);
    }
    for (const t of errands.done) box.append(el('div', 'qstep done', '✓ ' + t));
    if (errands.waiting) box.append(el('p', 'small-note', `${errands.waiting} ${errands.waiting === 1 ? 'person' : 'people'} around town could use a hand. They stand at their own front doors, up the side streets.`));
    if (!errands.started.length && !errands.done.length && !errands.waiting) box.append(el('p', 'small-note', 'Nobody needs you yet. More people will ask as you go up in level.'));
  } else if (tab === 'done') {
    const done = log.filter(q => q.done);
    if (!done.length) box.append(el('p', 'small-note', 'Nothing finished yet.'));
    for (const q of done) {
      const d = el('details', 'qdone');
      d.append(el('summary', '', `✓ ${q.title}`));
      for (const st of q.steps) d.append(el('div', 'qstep done', st.text));
      box.append(d);
    }
  } else {
    const later = log.filter(q => !q.done && (q.locked || !q.steps.some(s => s.current)));
    if (!later.length) box.append(el('p', 'small-note', 'Nothing more in this chapter.'));
    // Titles stay hidden until a quest opens (they'd give the story away).
    for (const q of later) box.append(el('div', 'qstep', level() >= q.level ? `${q.title} · after the one you're on` : `A new part of the story · opens at level ${q.level}`));
  }
  const close = el('button', 'opt leave'); close.append(el('span', 'num', 'Q'), el('span', '', 'Close'));
  close.onclick = () => closePanel();
  box.append(close);
  openPanel(box);
}

// ---------- Inventory (I) ----------
// Everything in your pack as a grid: how many, what it's worth, where it's from and what you paid.
// Keepsakes (things you earned in the story or the hard way) are listed under it.
let invPick = null;
export async function inventory(pickGood = invPick) {
  const { ITEMS } = await import('./items.js');
  const box = el('div', 'sheet inventory');
  box.append(el('div', 'who', 'Inventory'));
  const used = packCount(), room = capacity();
  box.append(el('p', 'rankline', `${state.gold} gold · pack ${used} / ${room}`));
  const bar = el('div', 'bar'); const fill = el('div', 'fill'); fill.style.width = `${Math.min(1, used / room) * 100}%`; bar.append(fill);
  box.append(bar);
  const goods = Object.entries(state.pack).filter(([, n]) => n > 0).sort((a, b) => GOODS[b[0]].base * b[1] - GOODS[a[0]].base * a[1]);
  if (!goods.length) box.append(el('p', 'small-note', 'Your pack is empty. Buy goods at the stalls and from ships, or pick cabbages in Ale\'s garden.'));
  if (pickGood && !state.pack[pickGood]) pickGood = null;
  invPick = pickGood || goods[0]?.[0] || null;
  const grid = el('div', 'invgrid');
  let worth = 0;
  for (const [g, n] of goods) {
    const G = GOODS[g];
    worth += G.base * n;
    const tile = el('button', 'invtile' + (g === invPick ? ' on' : ''));
    const sw = el('div', 'invsw'); sw.style.background = G.color;
    tile.append(sw, el('div', 'invname', G.name), el('div', 'invcount', `× ${n}`));
    tile.title = `${G.name}: ${n}`;
    tile.onclick = () => inventory(g);
    grid.append(tile);
  }
  box.append(grid);
  if (invPick) {
    const G = GOODS[invPick], n = state.pack[invPick], paid = state.paid?.[invPick];
    const info = el('div', 'invinfo');
    info.append(el('h3', '', G.name));
    info.append(el('div', 'stat', `${n} in your pack · from ${G.from.replace(' (passage escort)', '')} · ${G.kind}`));
    info.append(el('div', 'stat', `Usual price about ${G.base} gold each · about ${G.base * n} gold for all ${n}`));
    if (paid && paid.n > 0) info.append(el('div', 'stat', `You paid ${Math.round(paid.cost / paid.n)} gold each, on average`));
    if (invPick === 'levinite' && state.place === 'meridia') {
      const take = el('button', 'opt'); take.append(el('span', 'num', '✦'), el('span', '', 'Take it (the night will be gone)'));
      take.onclick = () => { closePanel(true); import('./levinite.js').then(L => L.useLevinite()); };
      info.append(take);
    }
    const best = bestSeen(invPick), ago = (d) => d === state.day ? 'today' : d === state.day - 1 ? 'yesterday' : `${state.day - d} days ago`;
    if (best.sell) info.append(el('div', 'stat', `Best price you've seen to sell: ${best.sell.price} at ${best.sell.where} (${ago(best.sell.day)})`));
    if (best.buy) info.append(el('div', 'stat', `Cheapest you've seen to buy: ${best.buy.price} at ${best.buy.where} (${ago(best.buy.day)})`));
    info.append(el('p', 'small-note', 'Ships pay best for goods from far away; your own stand pays retail. Selling a lot in one place brings its price down there; it recovers in a day or two.'));
    box.append(info);
  }
  if (goods.length) box.append(el('p', 'small-note', `Everything in your pack is worth about ${worth} gold at usual prices.`));
  const keep = (state.owned || []).filter(id => ITEMS[id] && ['story', 'special', 'redman'].includes(ITEMS[id].how));
  box.append(el('h3', '', 'Keepsakes'));
  if (!keep.length) box.append(el('p', 'small-note', 'None yet. Some things can only be earned.'));
  for (const id of keep) box.append(el('div', 'stat', ITEMS[id].how === 'special' ? `${ITEMS[id].name} · earned: ${ITEMS[id].hint.toLowerCase()}` : id === 'keep:purse' ? `${ITEMS[id].name} · ${state.coins ?? 0} left` : ITEMS[id].name));
  if (keep.length) box.append(el('p', 'small-note', 'Wear or hold them from Ale\'s wardrobe.'));
  const close = el('button', 'opt leave'); close.append(el('span', 'num', 'I'), el('span', '', 'Close'));
  close.onclick = () => closePanel();
  box.append(close);
  openPanel(box);
}

// ---------- Character sheet ----------
export function sheet() {
  const box = el('div', 'sheet');
  box.append(el('div', 'who', 'Your character'));
  const r = rank(), n = nextRank();
  const lv = level(), lo = LEVELS[lv - 1], hi = LEVELS[lv];
  box.append(el('p', 'rankline', `${state.name || 'You'}${state.race ? ', ' + state.race : ''} · Level ${lv} · ${r.name} · ${state.gold} gold`));
  const bar = el('div', 'bar'); const fill = el('div', 'fill'); fill.style.width = `${hi ? Math.min(1, (state.renown - lo) / (hi - lo)) * 100 : 100}%`; bar.append(fill);
  box.append(bar, el('p', 'small-note', hi ? `${state.renown} / ${hi} XP to level ${lv + 1}. Level ${lv + 1} opens: ${UNLOCKS[lv + 1] || 'nothing new, but people notice you.'}` : `${state.renown} XP. Highest level.`));
  if (n) {
    box.append(el('p', 'small-note', `Next for your shop: ${n.property} (level ${n.level}, ${n.fee} gold), from ${n.where}.`));
  } else box.append(el('p', 'small-note', 'You have your own ship. Chapter One is complete.'));
  if (state.shopName) box.append(el('p', 'small-note', `Your shop: "${state.shopName}"`));
  const grid = el('div', 'grid');
  const abil = el('div', 'col');
  abil.append(el('h3', '', 'Abilities'));
  for (const [k, v] of Object.entries(state.sheet.scores)) {
    const m = mod(k);
    abil.append(el('div', 'stat', `${k}  ${v}  (${m >= 0 ? '+' : ''}${m})`));
  }
  const sk = el('div', 'col');
  sk.append(el('h3', '', 'Skills'));
  for (const s of Object.keys(SKILLS)) {
    const b = skillBonus(s);
    sk.append(el('div', 'stat' + (state.sheet.proficient.includes(s) ? ' prof' : ''), `${s}  ${b >= 0 ? '+' : ''}${b}`));
  }
  const pack = el('div', 'col');
  pack.append(el('h3', '', 'Pack'));
  pack.append(el('div', 'stat', `${packCount()} / ${capacity()} · I for your inventory`));
  pack.append(el('h3', '', 'Standing'));
  for (const [k, v] of Object.entries(state.reputation)) pack.append(el('div', 'stat', `${k[0].toUpperCase() + k.slice(1)}: ${v}`));
  grid.append(abil, sk, pack);
  box.append(grid);
  box.append(el('h3', '', 'What you know about Ale'));
  const known = el('div', 'journal');
  const titles = { inn: 'The innkeeper: he was well the night before.', ledger: 'His ledger: "Paid: 40 g. R." every few weeks.', transmuter: 'The Transmuters asked about a package.',
    bounty: 'He asked how a bounty is paid when nobody knows the face.', garden: 'His note under the garden stone: "Sell cabbages. Only cabbages."', pilot: 'He paid the pilots to carry sealed letters.',
    redman: 'Redman: Ale was part of something bigger.', xi: 'Xi: Ale once came to warn him.' };
  if (!state.clues.length) known.append(el('div', '', 'He sold cabbages. He died of a fever. That is all you know, so far.'));
  for (const c of state.clues) known.append(el('div', '', titles[c] || c));
  box.append(known);
  box.append(el('h3', '', 'Journal'));
  const j = el('div', 'journal');
  for (const line of state.log.slice(0, 12)) j.append(el('div', '', line));
  if (!state.log.length) j.append(el('div', '', 'Nothing yet. Talk to people: press E when you look at them.'));
  box.append(j);
  const ranks = el('p', 'small-note', 'The climb: ' + RANKS.slice(1).map(x => x.property).join(' → '));
  box.append(ranks);
  const close = el('button', 'opt leave'); close.append(el('span', 'num', 'C'), el('span', '', 'Close'));
  close.onclick = () => closePanel();
  box.append(close);
  openPanel(box);
}

// A question with a typed answer (like your shop's name). Resolves to the text, or null.
export function askText(title, question, value = '') {
  return new Promise((resolve) => {
    const box = el('div', 'dialog');
    box.append(el('div', 'who', title), el('p', 'says', question));
    const input = el('input', 'answer');
    input.value = value; input.maxLength = 28;
    const ok = el('button', 'opt leave');
    ok.append(el('span', 'num', '↵'), el('span', '', 'That\'s the one'));
    const done = () => { const v = input.value.trim(); closePanel(true); resolve(v || null); };
    ok.onclick = done;
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') done(); });
    box.append(input, ok);
    openPanel(box);
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}

// The end of Chapter One: Xi grants you a ship.
export function chapterEnd() {
  const box = el('div', 'dialog chapter');
  box.append(
    el('div', 'who', 'Chapter One: complete'),
    el('p', 'says', 'Xi presses the seal into warm wax. "A ship, and the right to sail her through the warded passage. Do not make me regret it."'),
    el('p', 'says', `Your ship waits at the end of the Grand Pier. You came here with a letter and a key. Now there is a ship, a shop called "${state.shopName}", and a city that knows your name.`),
    el('p', 'says', 'At dusk you walk out to her. Someone is already standing at the end of the pier, an ordinary man in a plain cloak, looking out at the violet lights. When you reach the end of the pier, there is no one there. Only a coin on the boards, with no face stamped on it.'),
    el('p', 'says', 'You pocket the coin. The pilot is waiting. The tide is turning.'),
  );
  const sail = el('button', 'opt leave'); sail.append(el('span', 'num', '1'), el('span', '', 'Set sail for Meridia'));
  sail.onclick = () => { closePanel(true); dispatchEvent(new CustomEvent('lavine:crossing')); };
  const ok = el('button', 'opt leave'); ok.append(el('span', 'num', 'Esc'), el('span', '', 'Not yet: stay in Sultan\'s Rest a while'));
  ok.onclick = () => closePanel();
  box.append(sail, ok);
  openPanel(box);
}

// Number keys pick options; Esc closes.
export function panelKey(e) {
  if (!ui.open) return false;
  if (e.target && e.target.tagName === 'INPUT') return true;
  if (e.code === 'Escape') { closePanel(); return true; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9 && ui.open._options) {
    const o = ui.open._options[n - 1];
    if (o) choose(o);
    return true;
  }
  return false;
}
