// On-screen panels: the status bar, conversations, trading, dice rolls and the character sheet.
// While a panel is open the mouse is free and you don't walk.
import { state, rank, nextRank, RANKS, SKILLS, skillBonus, mod, packCount, clock, save, level, LEVELS, UNLOCKS } from './state.js';
import { GOODS, goodsFor, buyPrice, sellPrice, buy, sell } from './economy.js';

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
  $('st-pack').textContent = `Pack ${packCount()}/${rank().pack}`;
}

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
export function trade(market, { title, onDone, renownFor }) {
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

  function render() {
    info.textContent = `You have ${state.gold} gold · pack ${packCount()}/${rank().pack}`;
    left.replaceChildren(el('h3', '', 'They sell'));
    for (const g of goodsFor(market)) {
      const p = buyPrice(market, g);
      if (p == null) continue;
      const room = rank().pack - packCount();
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

// ---------- Quest log (J) ----------
export async function journal() {
  const { questLog } = await import('./quests.js');
  const box = el('div', 'sheet');
  box.append(el('div', 'who', 'Your story'));
  for (const q of questLog()) {
    if (q.locked && !q.done) { box.append(el('p', 'small-note', `${q.title}: opens at level ${q.level}`)); continue; }
    box.append(el('h3', '', q.title + (q.done ? '  ✓' : '')));
    for (const st of q.steps) {
      if (!st.done && !st.current) continue;
      box.append(el('div', 'stat' + (st.current ? ' prof' : ''), (st.done ? '✓ ' : '▸ ') + st.text));
    }
  }
  const close = el('button', 'opt leave'); close.append(el('span', 'num', 'J'), el('span', '', 'Close'));
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
  const items = Object.entries(state.pack);
  if (!items.length) pack.append(el('div', 'stat', 'Empty'));
  for (const [g, c] of items) pack.append(el('div', 'stat', `${c} × ${GOODS[g].name}`));
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
    el('p', 'says', 'Chapter Two: the passage. (Next to build. You can keep playing Sultan\'s Rest as long as you like.)'),
  );
  const ok = el('button', 'opt leave'); ok.append(el('span', 'num', 'Esc'), el('span', '', 'Back to the harbor'));
  ok.onclick = () => closePanel();
  box.append(ok);
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
