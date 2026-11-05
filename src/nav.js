// Finding your way: a compass strip at the top of the screen, a map you pull up with M, the
// places of Sultan's Rest labeled, your next goal, and one marker of your own (click the map to
// place it, click elsewhere to move it, click it again to remove it).
// Directions: north is inland (+z, toward the desert), south is the sea. Facing north, east is on
// your right, which in this world is -x (so west is +x).
import { innPaid } from './meridia/inn.js';
import { colliders, PIERS, PALACE, CITY_WALL } from './land.js';
import { state, level, nextRank, save } from './game/state.js';
import { currentStep, NAMED, questEvent, gateText, inHours } from './game/quests.js';
import { inMeridia } from './place.js';
import { SPOTS, homeSpot, storeSpot } from './meridia/spots.js';
import { MERIDIA_FOLK } from './meridia/people.js';
import { C, R_OUT, R_MID, R_IN } from './meridia/layout.js';
import { SHOP_PINS } from './shoplist.js';
import { PLAYERS } from './game/players.js';
import { PEOPLE } from './game/sidequests.js';

const SULTANS_PLACES = [
  { id: 'house', name: "Ale's house", x: -40, z: 63, icon: 'house' },
  { id: 'stand', name: 'Your stand', x: -50, z: 15, icon: 'stand' },
  { id: 'market', name: 'Market', x: 0, z: 19, icon: 'market' },
  { id: 'statue', name: 'King Shou', x: 0, z: 34, icon: 'dot' },
  { id: 'merchants', name: "Merchants' Guild", x: -110, z: 12, icon: 'guild' },
  { id: 'mariners', name: "Mariners' Guild", x: -72, z: 12, icon: 'guild' },
  { id: 'transmuters', name: "Transmuters' Guild", x: -148, z: 12, icon: 'guild' },
  { id: 'adventurers', name: "Adventurers' Guild", x: 64, z: 12, icon: 'guild' },
  { id: 'tavern', name: 'The Salted Kraken', x: -168, z: 16, icon: 'tavern' },
  { id: 'bones', name: 'Bones table', x: -118, z: 6.5, icon: 'dot' },
  { id: 'palace', name: 'The palace', x: 92, z: 18, icon: 'palace' },
  { id: 'pier', name: 'Grand Pier', x: 0, z: -30, icon: 'dot' },
  { id: 'shrine', name: 'Luminous Shrine', x: 17.25, z: 176, icon: 'palace' },
  { id: 'gateN', name: 'Desert Gate', x: 0, z: 290, icon: 'gate' },
  { id: 'gateE', name: 'East Gate', x: -183, z: 140, icon: 'gate' },
  { id: 'gateW', name: 'West Gate', x: 183, z: 140, icon: 'gate' },
];
// Meridia (Chapter Two): its landmarks; 'house' and 'stand' are your house (once bought) and pop-up stand.
const MERIDIA_PLACES = [
  ...Object.entries(SPOTS).filter(([id]) => !['home', 'store', 'popup'].includes(id)).map(([id, s]) => ({ id, name: s.name, x: s.x, z: s.z, icon: /Gate/.test(s.name) ? 'gate' : 'guild' })),
  { id: 'house', name: 'Your house', get x() { return homeSpot(state.mer?.home).x; }, get z() { return homeSpot(state.mer?.home).z; }, icon: 'house' },
  { id: 'stand', name: 'Your pop-up stand', x: SPOTS.popup.x, z: SPOTS.popup.z, icon: 'stand' },
  { id: 'store', name: 'Your store', get x() { return storeSpot(state.mer?.store).x; }, get z() { return storeSpot(state.mer?.store).z; }, icon: 'stand' },
];
export const PLACES = inMeridia ? MERIDIA_PLACES : SULTANS_PLACES;
const P = Object.fromEntries(PLACES.map(p => [p.id, p]));
// Where story characters stand (for the compass).
const NPC_AT = { mariners: { x: -72, z: 12 }, inn: { x: -168, z: 22 }, guildmaster: { x: -110, z: 27 }, transmuter: { x: -145, z: 27 }, bounty: { x: 64, z: 27 }, steward: { x: 135, z: -36 } };

// Your next goal, from where you are in the story.
export function objective() {
  if (inMeridia) return meridiaObjective();
  const n = nextRank();
  // The story first: your current quest step.
  const c = currentStep();
  if (c && c.quest.place !== 'meridia') {
    const s = c.step;
    if (s.gate) return { text: gateText(s), ...P.merchants };
    const when = s.hours && !inHours(s) ? ` (${s.hours[0]}:00 to ${s.hours[1]}:00 only)` : '';
    // A clue you work out yourself: no marker until you "Ask around" in your journal.
    if (s.hidden && !c.revealed) return { text: s.text + when + '  ·  Stuck? Press Q and choose "Ask around"', x: null, z: null };
    const at = s.x != null ? s : s.npc && (NAMED[s.npc] || NPC_AT[s.npc]);
    if (at) return { text: s.text + when, x: at.x, z: at.z };
  }
  // Meridia is open on this computer only while it's being built (property.js): elsewhere, say so instead.
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && state.flags.ship && !state.flags.crossed && (!c || c.quest.place === 'meridia'))
    return { text: 'Chapter One is done! Meridia is still being built: keep trading, and come back soon', x: null, z: null };
  if (c?.quest.place === 'meridia' || (state.flags.ship && !state.flags.crossed && !c)) return { text: state.flags.crossed ? 'Your story goes on in Meridia: sail from your ship at the end of the Grand Pier' : 'Set sail for Meridia: your ship waits at the end of the Grand Pier', x: 0, z: -58 };
  if (n && n.where === "the Merchants' Guild" && level() >= n.level && state.gold >= n.fee) return { text: `Buy the ${n.property}`, ...P.merchants };
  if (n && n.id === 'ship' && level() >= n.level && state.gold >= n.fee) return { text: 'Ask Xi for a ship', x: 135, z: -20 };
  if (level() < 2) return { text: 'Earn your first level: ask a stallkeeper if they need a runner', ...P.market };
  return { text: n ? `Work toward the ${n.property}: jobs around town and trading` : 'Explore Sultan\'s Rest', ...(n && n.where === "the Merchants' Guild" ? P.merchants : P.market) };
}

// In Meridia: the Chapter Two story step if there is one (its NPC or place), otherwise the trading life.
function meridiaObjective() {
  const c = currentStep();
  if (c && c.quest.place === 'meridia') {
    const s = c.step;
    const when = s.hours && !inHours(s) ? ` (${s.hours[0]}:00 to ${s.hours[1]}:00 only)` : '';
    if (s.hidden && !c.revealed) return { text: s.text + when + '  ·  Stuck? Press Q and choose "Ask around"', x: null, z: null };
    const at = s.x != null ? s : s.npc && (MERIDIA_FOLK[s.npc] || SPOTS[s.npc]);
    if (at) return { text: s.text + when, x: at.x, z: at.z };
    return { text: s.text + when, x: null, z: null };
  }
  const m = state.mer || {};
  if (!m.home && !innPaid()) return { text: (m.innEnd || m.innUntil) ? 'Your week at the inn is up: pay Tobin before you sleep' : 'Take a room at the Brine & Barrel (30 gold a week)', ...SPOTS.inn };
  return { text: 'Trade: sell at your pop-up stand, take contracts at the Exchange, sail goods between the cities', x: SPOTS.exchange.x, z: SPOTS.exchange.z };
}

const TAU = Math.PI * 2;
const wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const bearing = (dx, dz) => Math.atan2(-dx, dz);        // 0 = north (+z), +pi/2 = east (-x)

// ---------- Compass ----------
export function compass(root) {
  const strip = document.createElement('div');
  strip.id = 'compass';
  root.append(strip);
  const goal = document.getElementById('goal');
  const cardinals = [['N', 0], ['NE', Math.PI / 4], ['E', Math.PI / 2], ['SE', 3 * Math.PI / 4], ['S', Math.PI], ['SW', -3 * Math.PI / 4], ['W', -Math.PI / 2], ['NW', -Math.PI / 4]];
  const marks = cardinals.map(([t]) => { const s = document.createElement('span'); s.className = 'cmark' + (t.length === 1 ? ' big' : ''); s.textContent = t; strip.append(s); return s; });
  const pin = (cls, text) => { const s = document.createElement('span'); s.className = 'cpin ' + cls; s.textContent = text; strip.append(s); return s; };
  const goalPin = pin('goal', '◆'), markPin = pin('mark', '▼'), housePin = pin('home', '⌂'), standPin = pin('home', '▣');
  const W = 520, FOV = Math.PI * 0.6;
  const place = (el, rel, extra = '') => {
    if (Math.abs(rel) > FOV) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.style.left = `${W / 2 + (rel / FOV) * (W / 2)}px`;
    if (extra != null) el.dataset.d = extra;
  };
  return (player) => {
    const facing = bearing(-Math.sin(player.yaw), -Math.cos(player.yaw));
    cardinals.forEach(([, a], i) => place(marks[i], wrap(a - facing), null));
    const rel = (x, z) => wrap(bearing(x - player.x, z - player.z) - facing);
    const dist = (x, z) => Math.round(Math.hypot(x - player.x, z - player.z));
    const o = objective();
    if (o.x == null) goalPin.style.display = 'none'; else place(goalPin, rel(o.x, o.z), `${dist(o.x, o.z)} m`);
    goal.textContent = `Next: ${o.text}`;
    if (state.marker) place(markPin, rel(state.marker.x, state.marker.z), `${dist(state.marker.x, state.marker.z)} m`); else markPin.style.display = 'none';
    for (const [el, p] of [[housePin, P.house], [standPin, P.stand]]) {
      if (inMeridia && el === housePin && !state.mer?.home) { el.style.display = 'none'; continue; }
      if (dist(p.x, p.z) < 90) place(el, rel(p.x, p.z), p.name); else el.style.display = 'none';
    }
    questEvent('reach', { x: player.x, z: player.z }); questEvent('pack'); questEvent('flag');
    // Remember when you've been to Ale's house and stand (for the next goal).
    if (!state.flags.visitedHouse && dist(-40, 68) < 5) { state.flags.visitedHouse = true; save(); }
    if (!state.flags.visitedStand && dist(-50, 18) < 5) { state.flags.visitedStand = true; save(); }
  };
}

// ---------- The map ----------
const BOUNDS = inMeridia ? { x0: -230, x1: 230, z0: -80, z1: 440 } : { x0: -200, x1: 200, z0: -90, z1: 305 };
export function openMap(player, onClose) {
  const wrapEl = document.getElementById('map');
  wrapEl.replaceChildren();
  wrapEl.classList.remove('hidden');
  const c = document.createElement('canvas');
  c.width = 1000; c.height = Math.round(1000 * (BOUNDS.z1 - BOUNDS.z0) / (BOUNDS.x1 - BOUNDS.x0));
  wrapEl.append(c);
  const help = document.createElement('div');
  help.className = 'maphelp';
  help.textContent = 'Click to place your marker · click elsewhere to move it · click it to remove it · M or Esc to close';
  wrapEl.append(help);
  const g = c.getContext('2d');
  const k = c.width / (BOUNDS.x1 - BOUNDS.x0);
  // North (+z) is up and east (-x) is to the right, like any map.
  const sx = (x) => (BOUNDS.x1 - x) * k, sy = (z) => (BOUNDS.z1 - z) * k;
  const wx = (px) => BOUNDS.x1 - px / k, wz = (py) => BOUNDS.z1 - py / k;

  function drawMeridia() {
    g.fillStyle = '#cfd8a8'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#7fb3b8'; g.fillRect(0, sy(0), c.width, c.height - sy(0));
    g.fillStyle = '#c9c4b2'; g.fillRect(sx(210), sy(34), 420 * k, 34 * k);
    g.fillStyle = '#a07a4e'; for (const p of PIERS) g.fillRect(sx(p.x + p.w / 2), sy(0), p.w * k, -p.z0 * k);
    // The rings: each terrace a little paler, the walls in stone.
    for (const [R, col] of [[R_OUT, '#bfc79a'], [R_MID, '#c9cfa8'], [R_IN, '#d6d9bd']]) { g.fillStyle = col; g.beginPath(); g.arc(sx(C.x), sy(C.z), R * k, 0, TAU); g.fill(); }
    g.fillStyle = '#c9c4b2'; g.fillRect(sx(6), sy(C.z), 12 * k, (C.z - 34) * k);
    g.fillStyle = '#b8b0a0'; g.strokeStyle = 'rgba(60,50,40,0.35)'; g.lineWidth = 1;
    for (const b of colliders) { const w = b.x1 - b.x0, d = b.z1 - b.z0; if (w * d < 18 || w * d > 6000) continue; g.fillRect(sx(b.x1), sy(b.z1), w * k, d * k); g.strokeRect(sx(b.x1), sy(b.z1), w * k, d * k); }
    g.strokeStyle = '#6a6458'; g.lineWidth = 5;
    for (const R of [R_OUT, R_MID, R_IN]) { const a = Math.asin(6 / R); g.beginPath(); g.arc(sx(C.x), sy(C.z), R * k, Math.PI / 2 + a, Math.PI / 2 - a + TAU); g.stroke(); }
    g.textAlign = 'center';
    for (const p of PLACES) {
      if (p.id === 'house' && !state.mer?.home) continue;
      if (p.id === 'store' && !state.mer?.store) continue;
      const x = sx(p.x), y = sy(p.z);
      g.fillStyle = ['house', 'stand', 'store'].includes(p.id) ? '#2e5fa8' : '#3a3a2a';
      g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
      g.font = `${['house', 'stand', 'store'].includes(p.id) ? 'bold ' : ''}14px Cinzel, Georgia, serif`; g.fillStyle = '#1e1e14'; g.fillText(p.name, x, y - 8);
    }
    g.font = 'bold 26px Cinzel, Georgia, serif'; g.fillStyle = 'rgba(30,30,20,0.7)'; g.fillText('MERIDIA', c.width / 2, sy(C.z + R_OUT + 30));
    g.font = 'italic 18px "IM Fell English", Georgia, serif'; g.fillText('The Sea', c.width / 2, sy(-55));
  }
  function draw() {
    if (inMeridia) { drawMeridia(); drawYou(); return; }
    // Parchment, the sea, the beaches beyond the walls.
    g.fillStyle = '#e9d6a9'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#7fb3b8'; g.fillRect(0, sy(0), c.width, c.height - sy(0));
    g.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % c.width, sy(0) + 8 + (i * 37) % (c.height - sy(0) - 10), 18, 2);
    g.fillStyle = '#e2c99a'; g.fillRect(0, sy(300), c.width, sy(0) - sy(300));
    // The warded passage.
    g.fillStyle = '#b77cff';
    for (let z = -75; z > BOUNDS.z0; z -= 45) for (const x of [-34, 34]) { g.beginPath(); g.arc(sx(x), sy(z), 3, 0, TAU); g.fill(); }
    // Piers and the quay.
    g.fillStyle = '#a07a4e';
    for (const p of PIERS) g.fillRect(sx(p.x + p.w / 2), sy(0), p.w * k, -p.z0 * k);
    g.fillStyle = '#d6c6a6'; g.fillRect(sx(186), sy(30), 372 * k, 30 * k);
    // Main avenue.
    g.fillStyle = '#d6c6a6'; g.fillRect(sx(7), sy(296), 14 * k, 266 * k);
    // Buildings (anything big that you bump into).
    g.fillStyle = '#c8ad80'; g.strokeStyle = 'rgba(80,50,20,0.35)'; g.lineWidth = 1;
    for (const b of colliders) {
      const w = b.x1 - b.x0, d = b.z1 - b.z0;
      if (w * d < 18 || w * d > 6000) continue;
      g.fillRect(sx(b.x1), sy(b.z1), w * k, d * k); g.strokeRect(sx(b.x1), sy(b.z1), w * k, d * k);
    }
    // The palace and the city walls.
    g.fillStyle = '#efe6d6'; g.fillRect(sx(PALACE.x1), sy(PALACE.z1), (PALACE.x1 - PALACE.x0) * k, (PALACE.z1 - PALACE.z0) * k);
    g.fillStyle = '#d9b24a'; g.beginPath(); g.arc(sx(135), sy(-28), 9, 0, TAU); g.fill();
    g.strokeStyle = '#7a5a2a'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(sx(-CITY_WALL.x), sy(-10)); g.lineTo(sx(-CITY_WALL.x), sy(CITY_WALL.z)); g.lineTo(sx(CITY_WALL.x), sy(CITY_WALL.z)); g.lineTo(sx(CITY_WALL.x), sy(-10)); g.stroke();
    // Labels.
    g.textAlign = 'center';
    for (const p of PLACES) {
      const x = sx(p.x), y = sy(p.z);
      g.fillStyle = p.id === 'house' || p.id === 'stand' ? '#2e5fa8' : '#6a3a10';
      g.beginPath(); g.arc(x, y, p.icon === 'dot' ? 3 : 5, 0, TAU); g.fill();
      g.font = `${p.id === 'house' || p.id === 'stand' ? 'bold ' : ''}15px Cinzel, Georgia, serif`;
      g.fillStyle = '#2b1606';
      g.fillText(p.name, x, y - 9);
    }
    // The side streets (2026-11-04): shops, the street players, and anyone with an errand for you right now.
    const small = (pin, text, col, r = 3.5) => {
      const x = sx(pin[0]), y = sy(pin[1]);
      g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.font = '12px Cinzel, Georgia, serif'; g.fillStyle = col; g.fillText(text, x, y - 7);
    };
    for (const s of Object.values(SHOP_PINS)) if (!s.kind) small(s.pin, s.title, '#7a2a5c', 4);
    for (const p of Object.values(PLAYERS)) small(p.pin, level() >= p.level ? p.game : `${p.game} (level ${p.level})`, '#2f6b5a');
    for (const [id, p] of Object.entries(PEOPLE)) {
      const q = state.side?.[id];
      if (q?.done || (!q?.step && level() < p.level)) continue;
      small(p.pin, `${p.title.split(',')[0]} ${q?.step ? '(errand)' : '(needs a hand)'}`, '#b8382b');
    }
    g.font = 'bold 26px Cinzel, Georgia, serif'; g.fillStyle = 'rgba(43,22,6,0.75)';
    g.fillText("SULTAN'S REST", c.width / 2, sy(250));
    g.font = 'italic 18px "IM Fell English", Georgia, serif';
    g.fillText('The Sea', c.width / 2, sy(-60)); g.fillText('The Desert', c.width / 2, sy(300) - 4);
    drawYou();
  }
  function drawYou() {
    // Your next goal, your marker, you.
    const o = objective();
    g.fillStyle = '#e7c35a'; g.strokeStyle = '#6a3a10'; g.lineWidth = 2;
    if (o.x != null) { g.beginPath(); g.moveTo(sx(o.x), sy(o.z) - 10); g.lineTo(sx(o.x) + 8, sy(o.z)); g.lineTo(sx(o.x), sy(o.z) + 10); g.lineTo(sx(o.x) - 8, sy(o.z)); g.closePath(); g.fill(); g.stroke(); }
    if (state.marker) {
      const mx = sx(state.marker.x), my = sy(state.marker.z);
      g.fillStyle = '#b8382b'; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx - 8, my - 16); g.lineTo(mx + 8, my - 16); g.closePath(); g.fill();
      g.beginPath(); g.arc(mx, my - 17, 7, 0, TAU); g.fill();
    }
    const px = sx(player.x), py = sy(player.z), a = bearing(-Math.sin(player.yaw), -Math.cos(player.yaw));
    g.save(); g.translate(px, py); g.rotate(a);   // a = bearing; on screen north is up, so rotate by it
    g.fillStyle = '#4b1f6b'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -13); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // Legend.
    g.fillStyle = 'rgba(239,226,194,0.92)'; g.fillRect(14, 14, 330, 92);
    g.strokeStyle = '#7a5a2a'; g.lineWidth = 2; g.strokeRect(14, 14, 330, 92);
    g.textAlign = 'left'; g.font = '15px "IM Fell English", Georgia, serif'; g.fillStyle = '#2b1606';
    g.fillText('◆ ' + o.text, 26, 40);
    g.fillStyle = '#b8382b'; g.fillText('▼ Your marker', 26, 64);
    g.fillStyle = '#4b1f6b'; g.fillText('▲ You', 26, 88);
  }
  draw();
  c.addEventListener('click', (e) => {
    const r = c.getBoundingClientRect();
    const px = (e.clientX - r.left) * c.width / r.width, py = (e.clientY - r.top) * c.height / r.height;
    if (state.marker && Math.hypot(px - sx(state.marker.x), py - (sy(state.marker.z) - 10)) < 16) state.marker = null;
    else state.marker = { x: wx(px), z: wz(py) };
    save();
    draw();
  });
  const close = (e) => {
    if (e.code !== 'KeyM' && e.code !== 'Escape') return;
    e.stopPropagation(); e.preventDefault();
    removeEventListener('keydown', close, true);
    wrapEl.classList.add('hidden');
    wrapEl.replaceChildren();
    onClose?.();
  };
  addEventListener('keydown', close, true);
}
