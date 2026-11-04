// Inside the six walk-in shops (their shells: city.js, from shoplist.js): a sign over the door, a counter with the
// keeper behind it, and each shop's own things. Who says what: game/shops.js (Samira and Doss: game/quests.js NAMED).
import * as THREE from 'three';
import { colliders } from './land.js';
import { prop, lamp, wood } from './interiors.js';
import { placeReadable, signBoard } from './signs.js';
import { addFire } from './fire.js';
import { SHOP_PINS } from './shoplist.js';
import { NAMED } from './game/quests.js';
import { KEEPERS } from './game/shops.js';
import { Q } from './game/quests.js';
import { SHOP_EXTRAS, HOME_EXTRAS } from './furnish.js';

const block = (x0, x1, z0, z1) => colliders.push({ x0, x1, z0, z1 });
function box(scene, x, y, z, w, h, d, color, m) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  mesh.position.set(x, y + h / 2, z); mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// Samira and Doss move into their shops (call before buildings.js furnish() puts the named people out).
export function placeShopKeepers(scene) {
  const s = scene.userData.shops || {};
  for (const id of ['tailor', 'barber']) if (s[id]) { NAMED[id].x = s[id].x; NAMED[id].z = s[id].z1 - 1.0; NAMED[id].ry = 0; }
}

export function furnishShops(scene) {
  const shops = scene.userData.shops || {};
  const posts = scene.userData.posts;
  for (const [id, h] of Object.entries(shops)) {
    const S = SHOP_PINS[id], { x, fy } = h;
    const front = h.z0 - 0.37;                       // the outside face of the front wall
    if (S.kind === 'condemned') { condemned(scene, h, front); continue; }
    if (S.kind === 'home') { homeDress(scene, h); HOME_EXTRAS[id]?.(scene, h); porch(scene, h, front, id); continue; }   // someone's house (no sign: houses don't have signs); who lives there: sidework.js
    placeReadable(scene, signBoard(S.name, S.sub, { bg: S.sign, fg: '#f3ede0' }), { x, y: fy + 3.05, z: front - 0.03, w: 2.4, h: 0.6, title: S.title });
    // The counter across the back, with the keeper behind it.
    const cw = Math.min(3.2, h.x1 - h.x0 - 1.6), cz = h.z1 - 1.9;
    box(scene, x, fy, cz, cw, 1.0, 0.7, null, wood);
    block(x - cw / 2, x + cw / 2, cz - 0.35, cz + 0.35);
    lamp(scene, x, h.top - 0.5, (h.z0 + h.z1) / 2, '#ffd38a', 1.8);
    lamp(scene, x, h.top - 0.5, cz + 0.6, '#ffd38a', 1.2);
    if (KEEPERS[id]) {
      const k = KEEPERS[id];
      // Halflings and gnomes would vanish behind a counter: they stand beside it.
      const small = k.race === 'halfling' || k.race === 'gnome';
      const at = small ? { x: x + cw / 2 + 0.7, z: cz - 0.2 } : { x, z: h.z1 - 1.0 };
      posts.push({ ...at, ry: 0, role: k.role, race: k.race, body: k.body, label: k.title, npc: { kind: 'shop', id } });
    }
    DRESS[id]?.(scene, h, cz);
    SHOP_EXTRAS[id]?.(scene, h);                   // the trade's own things (furnish.js)
  }
}

const side = (h, s) => s < 0 ? h.x0 + 0.45 : h.x1 - 0.45;
const DRESS = {
  tailor(scene, h, cz) {
    prop(scene, 'Carpet_1', h.x, h.fy + 0.01, (h.z0 + cz) / 2, { len: 2.6 });
    for (const s of [-1, 1]) prop(scene, 'Shelf_Large', side(h, s), h.fy, h.z + 0.5, { h: 2.2, ry: -s * Math.PI / 2 });
    // Bolts of cloth on the counter and leaning by the wall.
    ['#7a2a5c', '#2e6c8e', '#d7a33a', '#5f8a3a', '#b8382b'].forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 12), new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
      m.rotation.z = Math.PI / 2; m.position.set(h.x - 1.1 + i * 0.5, h.fy + 1.12, cz); scene.add(m);
    });
    // A dressmaker's dummy.
    const dx = h.x0 + 0.9, dz = h.z0 + 1.6;
    box(scene, dx, h.fy, dz, 0.08, 1.1, 0.08, '#3a2a20');
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.6, 12), new THREE.MeshStandardMaterial({ color: '#7a2a5c', roughness: 1 }));
    torso.position.set(dx, h.fy + 1.35, dz); scene.add(torso);
  },
  barber(scene, h, cz) {          // chairs, mirrors, basin, towels: furnish.js
    prop(scene, 'Shelf_Large', h.x1 - 0.45, h.fy, h.z, { h: 2.0, ry: -Math.PI / 2 });
    for (let i = 0; i < 4; i++) prop(scene, ['Potion1_Filled', 'Potion3_Filled', 'Potion6_Filled', 'Potion2_Empty'][i], h.x - 0.9 + i * 0.35, h.fy + 1.0, cz, { h: 0.22 });
  },
  smith(scene, h, cz) {
    // The forge in the back corner and an anvil in front of it.
    const fx = h.x0 + 1.0, fz = h.z0 + 1.6;
    box(scene, fx, h.fy, fz, 1.2, 1.0, 1.2, '#5a4a40');
    box(scene, fx, h.fy + 1.0, fz, 0.9, 0.12, 0.9, '#2a1a12');
    addFire(scene, fx, h.fy + 1.12, fz, { size: 0.7, strength: 0.8 });
    block(fx - 0.6, fx + 0.6, fz - 0.6, fz + 0.6);
    const ax = h.x1 - 1.3, az = h.z - 0.3;
    box(scene, ax, h.fy, az, 0.4, 0.55, 0.4, '#4a3a2a', wood);
    box(scene, ax, h.fy + 0.55, az, 0.75, 0.22, 0.3, '#3a3a3c').material.metalness = 0.6;
    block(ax - 0.35, ax + 0.35, az - 0.2, az + 0.2);
    prop(scene, 'Barrel', h.x1 - 0.6, h.fy, h.z0 + 1.0, { h: 0.9 });
    // Blades hang on the back wall behind the smith (the models stand upright).
    prop(scene, 'Sword', h.x - 1.4, h.fy + 1.1, h.z1 - 0.2, { h: 1.0 });
    prop(scene, 'Dagger', h.x + 1.4, h.fy + 1.4, h.z1 - 0.2, { h: 0.4 });
    prop(scene, 'Key1', h.x + 0.9, h.fy + 1.0, cz, { len: 0.15 });
    prop(scene, 'WoodLog', h.x0 + 0.6, h.fy, h.z1 - 0.8, { len: 0.9 });
  },
  apothecary(scene, h, cz) {
    for (const s of [-1, 1]) {
      prop(scene, 'Shelf_Large', side(h, s), h.fy, h.z, { h: 2.2, ry: -s * Math.PI / 2 });
      ['Potion1_Filled', 'Potion3_Filled', 'Potion6_Filled'].forEach((p, i) => prop(scene, p, side(h, s) - s * 0.05, h.fy + 1.05 + (i % 2) * 0.55, h.z - 0.5 + i * 0.5, { h: 0.24 }));
    }
    prop(scene, 'Pot', h.x - 0.8, h.fy + 1.0, cz, { h: 0.3 });
    prop(scene, 'Mushroom_Harvested', h.x + 0.3, h.fy + 1.0, cz, { h: 0.15 });
    prop(scene, 'BushBerries_Harvested', h.x + 0.8, h.fy + 1.0, cz, { h: 0.15 });
    prop(scene, 'Houseplant_2', h.x0 + 0.7, h.fy, h.z0 + 0.9, { h: 1.0 });
  },
  bakery(scene, h, cz) {
    // A domed bread oven, glowing, in the back corner.
    const ox = h.x0 + 1.0, oz = h.z1 - 1.0;
    const oven = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b07a4a', roughness: 0.95 }));
    oven.position.set(ox, h.fy, oz); scene.add(oven);
    addFire(scene, ox + 0.5, h.fy + 0.15, oz - 0.3, { size: 0.4, strength: 0.6 });
    block(ox - 0.8, ox + 0.8, oz - 0.8, oz + 0.8);
    // Loaves on the counter and a table of them by the door.
    const crust = new THREE.MeshStandardMaterial({ color: '#c8924a', roughness: 0.9 });
    const loaf = (x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), crust); m.scale.set(1.5, 0.7, 1); m.position.set(x, y + 0.08, z); scene.add(m); };
    for (let i = 0; i < 6; i++) loaf(h.x - 1.0 + i * 0.4, h.fy + 1.0, cz);
    const tx = h.x1 - 1.2, tz = h.z0 + 1.6;
    prop(scene, 'Table_RoundLarge', tx, h.fy, tz, { h: 0.8 });
    for (let i = 0; i < 4; i++) loaf(tx - 0.3 + (i % 2) * 0.6, h.fy + 0.8, tz - 0.2 + Math.floor(i / 2) * 0.4);
    block(tx - 0.6, tx + 0.6, tz - 0.6, tz + 0.6);
    prop(scene, 'Bags', h.x0 + 0.7, h.fy, h.z0 + 1.0, { h: 0.7 });
  },
  curio(scene, h, cz) {
    prop(scene, 'Carpet_2', h.x, h.fy + 0.01, (h.z0 + cz) / 2, { len: 2.6 });
    for (const s of [-1, 1]) prop(scene, 'Bookshelf', side(h, s), h.fy, h.z, { h: 2.4, ry: -s * Math.PI / 2 });
    prop(scene, 'Chest_Closed', h.x0 + 0.8, h.fy, h.z0 + 1.2, { h: 0.6 });
    prop(scene, 'Chest_Ingots', h.x1 - 0.8, h.fy, h.z0 + 1.2, { h: 0.6 });
    const things = ['Crown2', 'Skull', 'Crystal1', 'Chalice', 'Necklace1', 'Scroll'];
    things.forEach((t, i) => prop(scene, t, h.x - 1.2 + i * 0.48, h.fy + 1.0, cz, t === 'Scroll' ? { len: 0.35 } : { h: t === 'Necklace1' ? 0.08 : 0.2 }));
  },
};

// The condemned house where Redman waits (Chapter One, level 7; game/stranger.js). Boards over the door and
// windows, a notice, and inside: dust, a broken chair, a crate, a candle stub.
function condemned(scene, h, front) {
  const plank = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 1 });
  const board = (x, y, z, w, tilt) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.05), plank); b.position.set(x, y, z); b.rotation.z = tilt; b.userData.keep = true; scene.add(b); };
  board(h.x, h.fy + 2.1, front - 0.06, 1.7, 0.25);                      // across the top of the door: you can still squeeze in under it
  for (const sx of [-1, 1]) { const wx = h.x + sx * (h.x1 - h.x0 + 0.7) / 3.2; board(wx, h.fy + 1.6, front - 0.07, 1.1, 0.3); board(wx, h.fy + 1.3, front - 0.07, 1.1, -0.2); }
  placeReadable(scene, signBoard('CONDEMNED', 'By order of the Steward', { bg: '#e8dcc2', fg: '#7a1408' }), { x: h.x + 1.3, y: h.fy + 1.5, z: front - 0.05, w: 0.7, h: 0.5, title: 'A notice on the condemned house' });
  // Inside.
  const dust = new THREE.Mesh(new THREE.PlaneGeometry(h.x1 - h.x0, h.z1 - h.z0), new THREE.MeshStandardMaterial({ color: '#8a7a62', roughness: 1, transparent: true, opacity: 0.45 }));
  dust.rotation.x = -Math.PI / 2; dust.position.set(h.x, h.fy + 0.01, h.z); scene.add(dust);
  const chair = prop(scene, 'Chair_1', h.x0 + 1.0, h.fy, h.z0 + 1.4, { h: 0.95, ry: 0.6 });
  if (chair) { chair.rotation.z = 1.4; chair.position.y += 0.25; }               // knocked over
  prop(scene, 'Crate', h.x + 0.6, h.fy, h.z1 - 1.4, { h: 0.5 });                // he stands by it
  prop(scene, 'Crate', h.x1 - 0.8, h.fy, h.z1 - 0.8, { h: 0.7, ry: 0.4 });
  prop(scene, 'Barrel', h.x0 + 0.7, h.fy, h.z1 - 0.7, { h: 0.8 });
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), new THREE.MeshStandardMaterial({ color: '#efe6d4' }));
  candle.position.set(h.x1 - 0.8, h.fy + 0.75, h.z1 - 0.8); scene.add(candle);
  lamp(scene, h.x1 - 0.8, h.fy + 0.86, h.z1 - 0.8, '#ffb45a', 0.7);
  // The story step points here (it used to be Ale's house).
  const step = Q.noface2?.steps.find(s => s.flag === 'metRedman');
  if (step) { step.x = h.x; step.z = h.z0 - 1.2; }
  scene.userData.redmanSpot = { x: h.x + 0.6, z: h.z1 - 2.1, door: { x: h.x, z: h.z0 - 1.2 } };
}

// A lived-in home: a bed in the back corner, a table and chairs, a shelf, a rug, two lamps. The person and their own
// things are added by sidework.js.
function homeDress(scene, h) {
  prop(scene, 'Bed_Single', h.x1 - 0.8, h.fy, h.z1 - 1.3, { len: 2.0, ry: Math.PI / 2 });
  colliders.push({ x0: h.x1 - 1.4, x1: h.x1, z0: h.z1 - 2.4, z1: h.z1 });
  const tx = h.x0 + 1.3, tz = h.z1 - 1.6;
  prop(scene, 'Table_RoundSmall', tx, h.fy, tz, { h: 0.8 });
  colliders.push({ x0: tx - 0.45, x1: tx + 0.45, z0: tz - 0.45, z1: tz + 0.45 });
  for (const [cx, cz, ry] of [[tx + 0.75, tz, -Math.PI / 2], [tx, tz - 0.75, 0]]) prop(scene, 'Chair_1', cx, h.fy, cz, { h: 0.95, ry });
  prop(scene, 'Shelf_Large', h.x0 + 0.4, h.fy, h.z - 0.6, { h: 1.9, ry: Math.PI / 2 });
  prop(scene, 'Carpet_Round', h.x, h.fy + 0.01, h.z, { len: 2.2 });
  lamp(scene, h.x, h.top - 0.5, h.z, '#ffd38a', 1.5);
  lamp(scene, tx, h.fy + 1.4, tz, '#ffc46b', 0.6);
}

// Outside a home with someone to visit: no sign (houses don't have signs, the user, 2026-11-04), but something
// homely by the door so it stands out a little: flower pots, wind chimes, a lantern, a planter. One look per house.
const PORCH = ['flowers', 'chimes', 'lantern', 'planter'];
function porch(scene, h, front, id) {
  const kind = PORCH[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PORCH.length];
  const z = front - 0.35, y = h.fy;
  const pots = () => { for (const k of [-1, 1]) prop(scene, 'Houseplant_2', h.x + k * 1.1, y, z, { h: 0.75 }); };
  if (kind === 'flowers') pots();
  if (kind === 'chimes') {
    // Wind chimes under a little bracket beside the door: a wooden disc and five hanging brass tubes.
    const cx = h.x + 1.0, cy = y + 2.45, cz = front - 0.35;
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.8, roughness: 0.3 });
    box(scene, cx - 0.2, cy + 0.05, front - 0.2, 0.05, 0.05, 0.4, '#5a3f26');
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), new THREE.MeshStandardMaterial({ color: '#6b4a2c' }));
    disc.position.set(cx, cy, cz); scene.add(disc);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, len = 0.25 + i * 0.05;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 6), brass);
      tube.position.set(cx + Math.cos(a) * 0.08, cy - 0.05 - len / 2, cz + Math.sin(a) * 0.08); scene.add(tube);
    }
    prop(scene, 'Houseplant_2', h.x - 1.1, y, z, { h: 0.7 });
  }
  if (kind === 'lantern') {
    const lx = h.x - 0.95;
    box(scene, lx, y + 2.15, front - 0.12, 0.05, 0.05, 0.25, '#2a2420');
    box(scene, lx, y + 1.85, front - 0.25, 0.16, 0.24, 0.16, '#3a2a1c');
    lamp(scene, lx, y + 1.97, front - 0.25, '#ffc46b', 0.7);
    prop(scene, 'Houseplant_2', h.x + 1.1, y, z, { h: 0.7 });
  }
  if (kind === 'planter') {
    // A long wooden box of flowers under the window.
    box(scene, h.x + 1.6, y, front - 0.3, 1.2, 0.35, 0.35, null, wood);
    const cols = ['#d0408a', '#f07a3a', '#e8e0d0', '#e85a9c', '#d7a33a'];
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.9 }));
      f.position.set(h.x + 1.1 + i * 0.17, y + 0.42 + (i % 2) * 0.05, front - 0.3); scene.add(f);
    }
    const leaves = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.25), new THREE.MeshStandardMaterial({ color: '#5f8a34', roughness: 1 }));
    leaves.position.set(h.x + 1.6, y + 0.38, front - 0.3); scene.add(leaves);
  }
}
