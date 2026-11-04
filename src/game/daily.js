// Daily quests: the trade notices board in the market. Three notices each morning (the same for everyone on
// the same day), gone at midnight:
//  - two trade orders: bring so many of a good to a guild or the Salted Kraken, for more than it's worth;
//  - one job: sell so many goods at your own stand today, or put in a good shift at a job around town.
// What's asked and paid grows with your level. They show in the quest menu (Daily tab) too.
// The notices' wording is a DRAFT by Claude.
import * as THREE from 'three';
import { state, level, addRenown, note, save } from './state.js';
import { GOODS } from './economy.js';
import { toast, updateStatus } from './ui.js';

// Who posts orders, and what they're short of (cheapest first).
export const BUYERS = {
  inn: { who: 'the Salted Kraken', where: 'the innkeeper or the barkeep', wants: ['cabbage', 'dates', 'grain', 'rum', 'wine'] },
  mariners: { who: "the Mariners' Guild", where: 'the master pilot', wants: ['grain', 'tools', 'lock', 'rum', 'charm'] },
  merchants: { who: "the Merchants' Guild", where: 'the guildmaster', wants: ['cumin', 'glass', 'saffron', 'silk', 'gears'] },
  transmuters: { who: "the Transmuters' Guild", where: 'the Master Transmuter', wants: ['glass', 'moonleaf', 'ink', 'ebony', 'pearls'] },
  adventurers: { who: "the Adventurers' Guild", where: 'the bounty master', wants: ['dates', 'tools', 'charm', 'moonleaf', 'wine'] },
};
// Jobs for the third notice: [mini-game, what counts as a good shift, where].
const JOBS = [
  ['Market Run', 'score 400 or more', 400, 'any stallkeeper'], ['Cargo Hold', 'score 300 or more', 300, 'the dockhands on the piers'],
  ['Gull Patrol', 'score 300 or more', 300, 'the fishermen on the quay'],
];

function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

function make() {
  const r = rng(`daily-${state.day}`), lv = level();
  const pick = (list) => list[Math.floor(r() * list.length)];
  const list = [];
  const buyers = Object.keys(BUYERS);
  const used = new Set();
  for (let i = 0; i < 2; i++) {
    let b = pick(buyers); while (used.has(b)) b = pick(buyers);
    used.add(b);
    // Dearer goods only once you can afford them.
    const affordable = BUYERS[b].wants.filter(g => GOODS[g].base <= 6 + lv * 4);
    const good = pick(affordable.length ? affordable : BUYERS[b].wants.slice(0, 1));
    const n = Math.max(2, Math.round((3 + lv) * (GOODS[good].base > 15 ? 0.5 : 1)));
    list.push({ id: `order-${i}`, type: 'order', buyer: b, good, n, gold: Math.round(n * GOODS[good].base * 1.6) + 4 + lv * 2, xp: 6 + lv * 2, done: false });
  }
  if (r() < 0.5) {
    const n = 4 + lv * 2;
    list.push({ id: 'stand', type: 'stand', n, gold: 8 + lv * 6, xp: 8 + lv * 2, done: false });
  } else {
    const [game, what, score, where] = pick(JOBS);
    list.push({ id: 'job', type: 'job', game, what, score, where, gold: 10 + lv * 5, xp: 8 + lv * 2, done: false });
  }
  return list;
}

// Today's notices (made fresh the first time they're asked for each day).
export function notices() {
  if (state.daily?.day !== state.day) state.daily = { day: state.day, list: make(), sold: 0 };
  return state.daily.list;
}
export function describe(q) {
  if (q.type === 'order') { const B = BUYERS[q.buyer]; return { title: `${B.who[0].toUpperCase() + B.who.slice(1)} wants ${q.n} ${GOODS[q.good].name}`, where: `Bring them to ${B.where}.` }; }
  if (q.type === 'stand') return { title: `Sell ${q.n} goods at your own stand today`, where: `So far today: ${Math.min(q.n, state.daily.sold || 0)} / ${q.n}.` };
  return { title: `A good shift at ${q.game} (${q.what})`, where: `Ask ${q.where}.` };
}
const reward = (q) => `${q.gold} gold, ${q.xp} XP`;

function complete(q, how) {
  q.done = true;
  state.gold += q.gold; state.earned += q.gold;
  addRenown(q.xp, 'a trade notice');
  note(`Notice done: ${describe(q).title} (+${q.gold} gold)`);
  save(); updateStatus();
  toast(`Notice done: ${how} +${q.gold} gold, +${q.xp} XP.`, 5000);
}

// Talking to someone who posted an order: hand the goods over.
export function dailyOption(npc) {
  const key = npc.kind === 'inn' ? 'inn' : npc.kind === 'guild' ? npc.guild : null;
  if (!key) return null;
  const q = notices().find(x => x.type === 'order' && x.buyer === key && !x.done);
  if (!q) return null;
  const have = state.pack[q.good] || 0, G = GOODS[q.good];
  return { label: `Notice: deliver ${q.n} ${G.name}`, hint: have >= q.n ? reward(q) : `you have ${have}`, disabled: have < q.n,
    do: () => {
      state.pack[q.good] -= q.n;
      if (!state.pack[q.good]) delete state.pack[q.good];
      complete(q, `${q.n} ${G.name} delivered.`);
      return { name: npc.label, text: ['"Just what we needed. Here, as the notice said."'], options: [{ label: 'Leave' }] };
    } };
}
// Selling at your stand (economy.js calls this) and finishing a job (npcs.js runGame).
export function soldAtStand(n) {
  notices();
  state.daily.sold = (state.daily.sold || 0) + n;
  const q = state.daily.list.find(x => x.type === 'stand' && !x.done);
  if (q && state.daily.sold >= q.n) complete(q, `${q.n} goods sold at your stand.`);
}
export function shiftDone(game, res) {
  const q = notices().find(x => x.type === 'job' && !x.done && x.game === game);
  if (q && (res?.score || 0) >= q.score) complete(q, `a good shift at ${game}.`);
}

addEventListener('lavine:sold-own', (e) => soldAtStand(e.detail.n));

// The board itself, in the market, with this morning's notices pinned up.
export function buildBoard(scene, readables, colliders, groundHeight, { x, z, ry }) {
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.85 });
  const paper = new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.95 });
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 1.9, 0.14), wood); frame.position.y = 1.75;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.7), wood); roof.position.set(0, 2.8, 0.05); roof.rotation.x = 0.25;
  g.add(frame, roof);
  for (const sx of [-1.4, 1.4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.8, 0.16), wood); leg.position.set(sx, 1.4, 0); g.add(leg); }
  [[-0.9, 1.85, 0.06], [0, 1.7, -0.04], [0.9, 1.9, 0.05], [-0.4, 1.25, 0.08], [0.6, 1.3, -0.06]].forEach(([px, py, rz]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), paper);
    p.position.set(px, py, -0.08); p.rotation.set(0, Math.PI, rz); g.add(p);
  });
  const head = document.createElement('canvas'); head.width = 512; head.height = 96;
  const c = head.getContext('2d'); c.fillStyle = '#2d1d10'; c.fillRect(0, 0, 512, 96); c.fillStyle = '#f1d48a';
  c.font = 'bold 46px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TRADE NOTICES', 256, 50);
  const tex = new THREE.CanvasTexture(head); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  sign.position.set(0, 2.52, -0.08); sign.rotation.y = Math.PI; g.add(sign);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, groundHeight(x, z), z);
  g.rotation.y = ry;
  scene.add(g);
  const front = new THREE.Vector3(0, 1.75, -0.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
  colliders.push({ x0: x - 1.6, x1: x + 1.6, z0: z - 0.3, z1: z + 0.3 });
  readables.push({ pos: new THREE.Vector3(x + front.x, g.position.y + front.y, z + front.z), title: 'Trade notices', verb: 'Read the trade notices',
    action: () => import('./ui.js').then(u => u.talk(boardNode())) });
}

function boardNode() {
  const list = notices();
  const text = ['Notices pinned up this morning. New ones every day.'];
  for (const q of list) {
    const d = describe(q);
    text.push(`${q.done ? '✓ DONE · ' : ''}${d.title}. ${d.where} Pays ${reward(q)}.`);
  }
  return { name: 'Trade notices', text, options: [{ label: 'Leave' }] };
}
