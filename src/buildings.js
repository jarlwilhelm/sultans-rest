// Ale's house and garden, the palace gate's lock, and what's inside the tavern and guild halls.
// Words on notes and in the ledger are Claude's drafts (marked DRAFT): rewrite them freely.
import * as THREE from 'three';
import { groundHeight, colliders, PALACE, PALACE_GATE } from './land.js';
import { hollow, prop, lamp, wood } from './interiors.js';
import { doorways } from './rooms.js';
import { readables, placeReadable, signBoard } from './signs.js';
import { wallPoster } from './posters.js';
import { surface } from './look.js';
import { state, level } from './game/state.js';
import { found } from './game/story.js';
import { questEvent, questState, NAMED } from './game/quests.js';
import { trade, toast, updateStatus } from './game/ui.js';
import { packRoom } from './game/state.js';

export const ALE = { x: -40, z: 68, w: 8, d: 7 };
const GARDEN = { x0: -44, x1: -36, z0: 71.5, z1: 80 };

// A page of handwriting, drawn on a canvas.
function page(title, lines, { w = 560, h = 720, hand = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#ead8b0'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,80,30,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  g.fillStyle = '#2b1606'; g.textAlign = 'left';
  g.font = 'bold 30px Cinzel, Georgia, serif'; g.fillText(title, 40, 64);
  g.font = `${hand ? 'italic ' : ''}22px "IM Fell English", Georgia, serif`;
  let y = 110;
  for (const line of lines) {
    const words = line.split(' '); let cur = '';
    for (const wd of words) {
      const t = cur ? cur + ' ' + wd : wd;
      if (g.measureText(t).width > w - 80 && cur) { g.fillText(cur, 40, y); y += 30; cur = wd; } else cur = t;
    }
    if (cur) { g.fillText(cur, 40, y); y += 30; }
    y += 12;
  }
  return c;
}

// A readable whose text depends on your level (and that can reveal a clue).
function readableThing(scene, { x, y, z, w = 0.5, h = 0.35, ry = 0, title, flat = false, canvas: make, onRead, id }) {
  const mat = new THREE.MeshStandardMaterial({ color: '#ead8b0', roughness: 0.9 });
  const m = new THREE.Mesh(flat ? new THREE.BoxGeometry(w, 0.04, h) : new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  if (!flat) m.rotation.y = ry + Math.PI;
  scene.add(m);
  readables.push({ pos: m.position.clone(), title, get canvas() { return make(); }, onRead: () => { onRead?.(); if (id) questEvent('read', id); } });
  return m;
}

// ---------- Ale's house ----------
export function buildAlesHouse(scene) {
  const { x, z, w, d } = ALE;
  const shell = hollow(scene, { x, z, w, d, h: 3.4, color: '#e2cfa9', doorW: 1.4, doorH: 2.4, backDoor: true, lockLevel: 0, name: "Ale's house", doorColor: '#2e5fa8' });
  scene.userData.shells.ale = shell;
  placeReadable(scene, signBoard('ALE', 'Cabbages · knock loud', { bg: '#2e5fa8', fg: '#f3ede0' }), {
    x, y: shell.fy + 2.75, z: z - d / 2 - 0.04, w: 1.6, h: 0.4, title: "Ale's house",
  });
  // The garden behind: low stone walls, rows of cabbages, a loose stone.
  const stone = surface('sandstone_blocks_05', { tile: 2, detail: 0.6 }); stone.color.set('#d4c09a');
  const wall = (x0, x1, z0, z1) => {
    const gy = Math.min(groundHeight(x0, z0), groundHeight(x1, z1)) - 0.4;
    const top = Math.max(groundHeight(x0, z0), groundHeight(x1, z1)) + 1.2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.3, x1 - x0), top - gy, Math.max(0.3, z1 - z0)), stone);
    m.position.set((x0 + x1) / 2, (gy + top) / 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true;
    scene.add(m);
    colliders.push({ x0: Math.min(x0, x1) - 0.15, x1: Math.max(x0, x1) + 0.15, z0: Math.min(z0, z1) - 0.15, z1: Math.max(z0, z1) + 0.15 });
  };
  const { x0, x1, z0, z1 } = GARDEN;
  wall(x0, x0, z0, z1); wall(x1, x1, z0, z1); wall(x0, x1, z1, z1);
  const soil = new THREE.MeshStandardMaterial({ color: '#5a3f26', roughness: 1 });
  for (const rz of [74, 76.2, 78.4]) {
    const gy = groundHeight(-40, rz);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 1.2), soil);
    bed.position.set(-40, gy + 0.04, rz); bed.receiveShadow = true; scene.add(bed);
  }
  return shell;
}

// ---------- Furniture and people (after the props have loaded) ----------
export function furnish(scene) {
  const S = scene.userData.shells;
  const posts = scene.userData.posts;

  // Ale's house.
  const a = S.ale;
  prop(scene, 'Bed_Single', a.x0 + 1.1, a.fy, a.z1 - 1.3, { len: 2.0, ry: Math.PI / 2 });
  readables.push({ pos: new THREE.Vector3(a.x0 + 1.1, a.fy + 0.6, a.z1 - 1.3), title: "Ale's bed", verb: "Sleep in Ale's bed",
    action: () => import('./game/rest.js').then(r => import('./game/npcs.js').then(n => r.sleepUntilMorning('home', n.newDay))) });
  prop(scene, 'Table_RoundSmall', a.x + 0.4, a.fy, a.z + 0.2, { h: 0.78 });
  prop(scene, 'Chair_1', a.x + 0.4, a.fy, a.z - 0.7, { h: 0.95, ry: 0 });
  prop(scene, 'Chair_1', a.x + 1.3, a.fy, a.z + 0.3, { h: 0.95, ry: -Math.PI / 2 });
  prop(scene, 'Shelf_Large', a.x1 - 0.35, a.fy, a.z + 1.2, { h: 1.9, ry: -Math.PI / 2 });
  prop(scene, 'Kitchen_Cabinet1', a.x1 - 0.4, a.fy, a.z0 + 0.9, { h: 0.9, ry: -Math.PI / 2 });
  prop(scene, 'Shelf_Large', a.x0 + 0.35, a.fy, a.z0 + 1.0, { h: 1.9, ry: Math.PI / 2, tint: '#c8a27a' });
  readables.push({ pos: new THREE.Vector3(a.x0 + 0.5, a.fy + 1.1, a.z0 + 1.0), title: "Ale's wardrobe", verb: "Open Ale's wardrobe (change clothes)",
    action: () => import('./wardrobe.js').then(w => w.openWardrobe('wardrobe')) });
  for (const [cx, cz] of [[a.x0 + 0.6, a.z0 + 0.7], [a.x0 + 1.4, a.z0 + 0.7], [a.x0 + 0.6, a.z0 + 1.5]]) {
    prop(scene, 'Crate', cx, a.fy, cz, { h: 0.6 });
    prop(scene, 'Lettuce_Harvested', cx, a.fy + 0.6, cz, { h: 0.3 });
  }
  prop(scene, 'Houseplant_2', a.x1 - 0.5, a.fy, a.z1 - 0.5, { h: 0.9 });
  lamp(scene, a.x, a.top - 0.5, a.z, '#ffd38a', 1.4);
  // DRAFT: the ledger (grows as you level), a letter he never sent, a drawing.
  readableThing(scene, { x: a.x + 0.4, y: a.fy + 0.8, z: a.z + 0.2, w: 0.42, h: 0.3, flat: true, title: "Ale's ledger",
    canvas: () => page("Ale's Ledger", [
      'Day 3: 40 cabbages sold. 6 spoiled. 4 to the tiefling pilots, no charge (they look hungry).',
      'Day 9: 52 sold. Rain. Mrs. Haddad says the cabbages are the best in the harbor. She says that every week.',
      ...(level() >= 3 ? ['Day 14: 38 sold.', 'Paid: 40 g. R.   (in a different ink, pressed hard into the page)', 'Day 22: 44 sold. Paid: 40 g. R.'] : ['Day 14: 38 sold. A good week.']),
      ...(level() >= 6 ? ['The last page is torn out. You can see the marks of the pen on the page beneath: "...not the cabbages they want..."'] : []),
    ]),
    id: 'ledger' });
  readableThing(scene, { id: 'unsent', x: a.x1 - 0.42, y: a.fy + 1.35, z: a.z + 1.2, w: 0.42, h: 0.3, ry: -Math.PI / 2, title: 'A letter Ale never sent',
    canvas: () => page('A letter, unsent', [
      'Dear ' + (state.name || 'little one') + ',',
      'I\'m fine. Truly. The cabbages sell, the sea is loud, and I\'ve made friends here, odd ones, good ones.',
      'If anything ever happens to me, the stand is yours. The house too. Water the garden. Don\'t sell the third row, it\'s not ready yet.',
      'Your brother, Ale.',
    ]) });
  readableThing(scene, { x: a.x0 + 0.2, y: a.fy + 1.6, z: a.z - 0.4, w: 0.5, h: 0.4, ry: Math.PI / 2, title: 'A child\'s drawing',
    canvas: () => page('A drawing', ['Two children holding hands on a pier, drawn in charcoal. One is labelled "ALE". The other is labelled with your name, in a child\'s hand.'], { h: 360 }) });

  // DRAFT: a hiding place behind the shelf (found during "The Package").
  readableThing(scene, { id: 'hollow', x: a.x1 - 0.2, y: a.fy + 0.5, z: a.z + 1.9, w: 0.3, h: 0.3, ry: -Math.PI / 2, title: 'Behind the shelf',
    canvas: () => questState('package').step >= 1 || questState('package').done
      ? page('Behind the shelf', ['A board behind the shelf comes away in your hand. Behind it, a hollow in the wall, lined with oilcloth.', 'It is empty. In the dust, the clean outline of a small box, as if it was taken not long ago.'], { h: 360 })
      : page('Behind the shelf', ['Dust, a dead beetle, a lost button. Nothing else.'], { h: 260 }) });

  // Picking cabbages in the garden: nine a day, regrowing each morning.
  const pick = { pos: new THREE.Vector3(-40, groundHeight(-40, 76.2) + 0.4, 76.2), title: "Ale's cabbages", verb: 'Pick a cabbage',
    action: () => {
      state.garden ??= { day: state.day, left: 9 };
      if (state.garden.day !== state.day) state.garden = { day: state.day, left: 9 };
      if (state.garden.left <= 0) return toast('You\'ve picked what\'s ready today. More tomorrow.');
      if (packRoom() <= 0) return toast('Your pack is full.');
      state.garden.left--;
      state.pack.cabbage = (state.pack.cabbage || 0) + 1;
      if (!state.owned?.includes('held:cabbage')) import('./game/items.js').then(m => m.give('held:cabbage', 'your first cabbage'));
      updateStatus();
      toast(`Picked a cabbage (${state.pack.cabbage} in your pack, ${state.garden.left} left today)`);
      questEvent('pack');
    } };
  readables.push(pick);

  // The garden: cabbages in rows, a loose stone at the edge.
  for (const rz of [74, 76.2, 78.4]) for (let i = 0; i < 5; i++) {
    const cx = -42.4 + i * 1.2;
    prop(scene, 'Lettuce_4', cx, groundHeight(cx, rz) + 0.12, rz, { h: 0.38, ry: i * 1.3 });
  }
  readableThing(scene, { x: -36.8, y: groundHeight(-36.8, 78.4) + 0.12, z: 78.4, w: 0.4, h: 0.3, flat: true, title: 'A loose stone at the edge of the garden',
    canvas: () => level() >= 6
      ? page('Under the stone', ['Wrapped in oilcloth, in Ale\'s handwriting:', '"If you\'re reading this, you\'re in the house, and I\'m not. Sell cabbages. Only cabbages. Don\'t go looking for the people I knew. They\'ll find you, if they want to. — A."'], { h: 420 })
      : page('A loose stone', ['It wobbles when you touch it. Something about it bothers you, but it won\'t come up yet.'], { h: 260 }),
    id: 'stone' });

  // People with names in the story (quests.js).
  for (const [id, n] of Object.entries(NAMED)) posts.push({ x: n.x, z: n.z, ry: n.ry, role: n.role, race: n.race, label: n.title, npc: { kind: 'named', id } });

  // The Salted Kraken.
  const t = S.tavern;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.1, 0.8), wood); bar.position.set(t.x, t.fy + 0.55, t.z1 - 2.2); bar.castShadow = true; scene.add(bar);
  colliders.push({ x0: t.x - 3.25, x1: t.x + 3.25, z0: t.z1 - 2.6, z1: t.z1 - 1.8 });
  for (let i = 0; i < 4; i++) prop(scene, 'Barrel', t.x - 3 + i * 2, t.fy, t.z1 - 0.6, { h: 1.0 });
  prop(scene, 'Shelf_Large', t.x0 + 0.4, t.fy, t.z1 - 1.5, { h: 2.0, ry: Math.PI / 2 });
  for (const [tx, tz] of [[t.x - 2.6, t.z0 + 2.2], [t.x + 2.6, t.z0 + 2.2], [t.x - 2.4, t.z + 0.6]]) {
    prop(scene, 'Table_RoundSmall', tx, t.fy, tz, { h: 0.8 });
    colliders.push({ x0: tx - 0.5, x1: tx + 0.5, z0: tz - 0.5, z1: tz + 0.5 });
    for (const [sx, sz] of [[0.9, 0], [-0.9, 0]]) prop(scene, 'Stool', tx + sx, t.fy, tz + sz, { h: 0.5 });
  }
  lamp(scene, t.x - 2, t.top - 0.6, t.z, '#ffbf6a', 1.6); lamp(scene, t.x + 2, t.top - 0.6, t.z - 2, '#ffbf6a', 1.6);
  posts.push(
    { x: t.x, z: t.z1 - 1.3, ry: 0, role: 'local', label: 'Barkeep of the Salted Kraken', npc: { kind: 'inn' } },
    { x: t.x - 2.6 + 0.9, z: t.z0 + 2.2, ry: Math.PI / 2, role: 'sailor', sit: true, label: 'Sailor playing Bones', npc: { kind: 'bones' } },
    { x: t.x + 2.6 - 0.9, z: t.z0 + 2.2, ry: -Math.PI / 2, role: 'adventurer', sit: true, label: 'Adventurer, telling a tall tale' },
  );

  // The Merchants' Guild.
  const m = S.merchants;
  const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 1.05, 1.1), wood); desk.position.set(m.x, m.fy + 0.52, m.z1 - 3); desk.castShadow = true; scene.add(desk);
  colliders.push({ x0: m.x - 3, x1: m.x + 3, z0: m.z1 - 3.55, z1: m.z1 - 2.45 });
  for (let i = 0; i < 6; i++) prop(scene, 'Bookshelf', m.x0 + 0.4, m.fy, m.z0 + 1.5 + i * 2.1, { h: 2.6, ry: Math.PI / 2 });
  for (let i = 0; i < 6; i++) prop(scene, 'Bookshelf', m.x1 - 0.4, m.fy, m.z0 + 1.5 + i * 2.1, { h: 2.6, ry: -Math.PI / 2 });
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(3, 0.03, m.z1 - m.z0 - 4), new THREE.MeshStandardMaterial({ color: '#7a2a1c', roughness: 1 }));
  carpet.position.set(m.x, m.fy + 0.02, (m.z0 + m.z1) / 2 - 1.5); scene.add(carpet);
  for (const sx of [-4, 4]) prop(scene, 'Bench_1', m.x + sx, m.fy, m.z, { len: 2.2 });
  for (const sx of [-6, 0, 6]) lamp(scene, m.x + sx, m.top - 1.5, m.z, '#ffd38a', 2);
  posts.push({ x: m.x, z: m.z1 - 1.8, ry: 0, role: 'merchant', label: "Guildmaster of the Merchants' Guild", npc: { kind: 'guild', guild: 'merchants' } });

  // The Transmuters' workshop: a kiln that glows, glass on the tables.
  const w = S.transmuters;
  const kiln = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 2.4), new THREE.MeshStandardMaterial({ color: '#6a5a4a', roughness: 0.9 }));
  kiln.position.set(w.x, w.fy + 1.5, w.z1 - 1.6); kiln.castShadow = true; scene.add(kiln);
  colliders.push({ x0: w.x - 2, x1: w.x + 2, z0: w.z1 - 2.8, z1: w.z1 - 0.4 });
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ color: '#ff9a3a' }));
  mouth.position.set(w.x, w.fy + 1.1, w.z1 - 2.81); mouth.rotation.y = Math.PI; scene.add(mouth);
  lamp(scene, w.x, w.fy + 1.1, w.z1 - 3.1, '#ff9a3a', 4);
  for (const tx of [-6, 6]) {
    prop(scene, 'Table_RoundLarge', w.x + tx, w.fy, w.z, { h: 0.85 });
    colliders.push({ x0: w.x + tx - 1, x1: w.x + tx + 1, z0: w.z - 1, z1: w.z + 1 });
    for (let i = 0; i < 4; i++) prop(scene, ['Potion2_Empty', 'Crystal1', 'Potion6_Filled', 'Gold_Ingots'][i], w.x + tx - 0.45 + i * 0.3, w.fy + 0.85, w.z + (i % 2 ? 0.2 : -0.2), { h: [0.3, 0.28, 0.3, 0.12][i], ry: i });
  }
  for (let i = 0; i < 4; i++) prop(scene, 'Shelf_Large', w.x0 + 0.4, w.fy, w.z0 + 2 + i * 3, { h: 2.2, ry: Math.PI / 2 });
  posts.push({ x: w.x + 3, z: w.z1 - 1.6, ry: 0, role: 'scribe', label: 'Master Transmuter', npc: { kind: 'guild', guild: 'transmuters' } });

  // The Adventurers' Guild: every bounty on the back wall, benches, people.
  const ad = S.adventurers;
  for (let i = 0; i < 9; i++) wallPoster(scene, i, ad.x - 8 + i * 2, ad.fy + 2.2 + (i % 2) * 0.3, ad.z1 - 0.06, 0);
  for (const [bx, bz] of [[-6, -2], [6, -2], [-6, 2], [6, 2]]) {
    prop(scene, 'Table_RoundLarge', ad.x + bx, ad.fy, ad.z + bz, { h: 0.85 });
    colliders.push({ x0: ad.x + bx - 1, x1: ad.x + bx + 1, z0: ad.z + bz - 0.8, z1: ad.z + bz + 0.8 });
  }
  for (const sx of [-6, 0, 6]) lamp(scene, ad.x + sx, ad.top - 1.5, ad.z, '#ffd38a', 2);
  posts.push(
    { x: ad.x - 6 + 1.3, z: ad.z - 2, ry: Math.PI / 2, role: 'adventurer', sit: true, label: 'Adventurer, sharpening a blade' },
    { x: ad.x + 6 - 1.3, z: ad.z + 2, ry: -Math.PI / 2, role: 'adventurer', sit: true, label: 'Adventurer, counting coins' },
    { x: ad.x, z: ad.z1 - 2, ry: 0, role: 'adventurer', label: "Bounty master of the Adventurers' Guild", npc: { kind: 'guild', guild: 'adventurers' } },
  );
}

// ---------- The palace gate: shut until level 8, then E takes you through ----------
export function lockPalace(scene) {
  const { x0 } = PALACE, gz = PALACE_GATE.z;
  const gate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 6.2), new THREE.MeshStandardMaterial({ color: '#e0b347', metalness: 0.8, roughness: 0.35 }));
  gate.position.set(x0 + 1, PALACE.y + 4.5, gz); gate.castShadow = true; scene.add(gate);
  colliders.push({ x0: x0 - 0.5, x1: x0 + 2.5, z0: gz - 3.2, z1: gz + 3.2 });
  doorways.push({ name: 'The palace', level: 8, room: null, gate: true,
    out: { x: x0 - 3, z: gz, yaw: Math.PI / 2 }, in: { x: x0 + 4.5, z: gz, yaw: -Math.PI / 2 },
    swing: (k) => { gate.position.y = PALACE.y + 4.5 + k * 3; } });
}

export { found };
