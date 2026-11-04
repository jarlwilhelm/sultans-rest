// More things inside the walk-in shops and homes, chosen for what each person DOES (the user, 2026-11-04: "not much
// furnishings, should be tailored to what they do"). Called after the basic furniture (shops.js DRESS / homeDress,
// sidework.js HOME_THINGS). h = the inside of the building (x0..x1 across, z0 = the door wall, z1 = the back wall,
// fy = the floor). Code-drawn placeholders; Blender models can replace them for the Godot port.
import * as THREE from 'three';
import { prop, lamp } from './interiors.js';
import { colliders } from './land.js';

const mats = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o })); return mats.get(k); };
function box(s, x, y, z, w, h, d, c, o) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; s.add(m); return m; }
function cyl(s, x, y, z, r, h, c, o, r2 = r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r2, h, 12), mat(c, o)); m.position.set(x, y + h / 2, z); m.castShadow = true; s.add(m); return m; }
function ball(s, x, y, z, r, c, o) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(c, o)); m.position.set(x, y + r, z); s.add(m); return m; }
const solid = (x, z, w, d) => colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
// A wall shelf with things on it: along the left (x1) or right (x0) wall.
function wallShelf(s, h, side, z, len, rows, fill) {
  const x = side > 0 ? h.x1 - 0.22 : h.x0 + 0.22;
  for (let r = 0; r < rows; r++) {
    const y = h.fy + 0.9 + r * 0.55;
    box(s, x, y, z, 0.36, 0.05, len, '#6b4a2c');
    for (let i = 0; i < Math.floor(len / 0.3); i++) fill(x, y + 0.05, z - len / 2 + 0.15 + i * 0.3, r, i);
  }
}
const JARS = ['#2f6b5a', '#7a2a5c', '#b8862c', '#2e6c8e', '#8a2a1a', '#5f8a3a', '#e8e2d2'];
const LOAF = '#c8924a';

export const SHOP_EXTRAS = {
  barber(s, h) {
    // Two barber chairs facing mirrors on the right wall, a basin, towels, a bench for the waiting, hair on the floor.
    for (const k of [0, 1]) {
      const z = h.z0 + 1.6 + k * 2.0;
      cyl(s, h.x0 + 1.4, h.fy, z, 0.25, 0.45, '#3a3a3c', { metalness: 0.6 });
      box(s, h.x0 + 1.4, h.fy + 0.45, z, 0.6, 0.12, 0.6, '#7a2a1c');
      box(s, h.x0 + 1.65, h.fy + 0.57, z, 0.1, 0.7, 0.6, '#7a2a1c');
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), mat('#dfe8ec', { metalness: 0.95, roughness: 0.05 }));
      mirror.position.set(h.x0 + 0.08, h.fy + 1.55, z); mirror.rotation.y = Math.PI / 2; s.add(mirror);
      box(s, h.x0 + 0.04, h.fy + 1.0, z, 0.05, 1.15, 0.95, '#5a3f26');
      for (let i = 0; i < 6; i++) ball(s, h.x0 + 1.2 + Math.cos(i * 2.1 + k) * 0.5, h.fy, z + Math.sin(i * 1.7) * 0.5, 0.03, '#2a1a10');   // hair
    }
    cyl(s, h.x0 + 0.5, h.fy, h.z0 + 4.6, 0.12, 0.8, '#6b4a2c'); cyl(s, h.x0 + 0.5, h.fy + 0.8, h.z0 + 4.6, 0.25, 0.12, '#e8e2d2', {}, 0.15);   // basin
    box(s, h.x1 - 0.15, h.fy + 1.2, h.z0 + 1.8, 0.05, 0.05, 1.0, '#6b4a2c');
    for (let i = 0; i < 3; i++) box(s, h.x1 - 0.17, h.fy + 0.75, h.z0 + 1.45 + i * 0.35, 0.04, 0.45, 0.28, '#f3ede0');                 // towels
    prop(s, 'Bench_1', h.x1 - 0.55, h.fy, h.z0 + 3.4, { len: 1.6, ry: Math.PI / 2 });
  },
  tailor(s, h) {
    // A cutting table with cloth laid out, bolts on the shelves, hats on a stand, a folding screen.
    box(s, h.x - 0.4, h.fy, h.z0 + 2.6, 1.8, 0.85, 0.9, '#7a5838'); solid(h.x - 0.4, h.z0 + 2.6, 1.8, 0.9);
    box(s, h.x - 0.5, h.fy + 0.85, h.z0 + 2.6, 1.2, 0.01, 0.7, '#2e6c8e');
    wallShelf(s, h, 1, h.z, 2.4, 3, (x, y, z, r, i) => { const m = cyl(s, x, y, z, 0.09, 0.32, JARS[(r * 3 + i) % JARS.length], { roughness: 1 }); m.rotation.z = Math.PI / 2; });
    const hx = h.x1 - 0.9, hz = h.z0 + 0.9;
    cyl(s, hx, h.fy, hz, 0.04, 1.6, '#5a3f26');
    for (let i = 0; i < 3; i++) { cyl(s, hx + Math.cos(i * 2.1) * 0.18, h.fy + 1.2 + i * 0.15, hz + Math.sin(i * 2.1) * 0.18, 0.12, 0.1, JARS[i + 1], {}, 0.14); }
    for (let i = 0; i < 3; i++) { const p = box(s, h.x0 + 0.9 + i * 0.5, h.fy, h.z1 - 3.2 + (i % 2) * 0.12, 0.5, 1.7, 0.04, '#d9c7a3'); p.rotation.y = (i % 2 ? -0.4 : 0.4); }
  },
  smith(s, h) {
    // A water trough, a grindstone, a tool rack, iron bars, a chain from the ceiling.
    box(s, h.x - 1.2, h.fy, h.z0 + 0.8, 1.4, 0.55, 0.5, '#4a3a2a'); box(s, h.x - 1.2, h.fy + 0.5, h.z0 + 0.8, 1.3, 0.02, 0.4, '#2e6c8e', { roughness: 0.2 });
    solid(h.x - 1.2, h.z0 + 0.8, 1.4, 0.5);
    const gx = h.x1 - 1.0, gz = h.z0 + 1.4;
    box(s, gx, h.fy, gz, 0.6, 0.5, 0.25, '#5a3f26'); const wheel = cyl(s, gx, h.fy + 0.45, gz, 0.32, 0.12, '#8a8278'); wheel.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const t = box(s, h.x1 - 0.15, h.fy + 1.1, h.z + 0.6 + i * 0.25, 0.04, 0.8, 0.05, i % 2 ? '#6d6f75' : '#5a3f26'); t.rotation.x = 0.1; }   // tools on the wall
    for (let i = 0; i < 5; i++) box(s, h.x + 1.0, h.fy + i * 0.07, h.z - 0.6 + (i % 2) * 0.05, 0.6, 0.06, 0.15, '#3a3a3c', { metalness: 0.5 });
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 5, 10), mat('#3a3a3c', { metalness: 0.6 })); l.position.set(h.x - 0.4, h.top - 0.2 - i * 0.1, h.z0 + 3.0); l.rotation.y = i % 2 ? Math.PI / 2 : 0; s.add(l); }
  },
  apothecary(s, h) {
    // Shelves of coloured jars on both walls, herbs drying from the ceiling, a cauldron, a mortar on the counter.
    for (const side of [-1, 1]) wallShelf(s, h, side, h.z0 + 2.0, 2.2, 3, (x, y, z, r, i) => cyl(s, x, y, z, 0.06, 0.16 + (i % 3) * 0.04, JARS[(r + i) % JARS.length], { transparent: true, opacity: 0.85, roughness: 0.2 }));
    for (let i = 0; i < 7; i++) { const b = cyl(s, h.x - 1.5 + i * 0.5, h.top - 0.55, h.z - 0.3 + (i % 2) * 0.4, 0.07, 0.4, i % 3 ? '#5f8a3a' : '#9a8a58', { roughness: 1 }, 0.02); b.rotation.x = Math.PI; }
    cyl(s, h.x + 1.3, h.fy, h.z0 + 1.2, 0.4, 0.5, '#2a2420', { metalness: 0.4 }, 0.3); lamp(s, h.x + 1.3, h.fy + 0.6, h.z0 + 1.2, '#7fe0a0', 0.6);
    solid(h.x + 1.3, h.z0 + 1.2, 0.8, 0.8);
    cyl(s, h.x + 0.9, h.fy + 1.0, h.z1 - 1.9, 0.1, 0.12, '#8a8278', {}, 0.07);
    prop(s, 'Crystal1', h.x - 0.4, h.fy + 1.0, h.z1 - 1.9, { h: 0.15 });
  },
  bakery(s, h) {
    // Racks of loaves on the wall, flour sacks, a kneading table with dough, baskets of bread by the door.
    wallShelf(s, h, -1, h.z, 2.6, 3, (x, y, z) => { const l = ball(s, x, y, z, 0.1, LOAF); l.scale.set(1, 0.6, 1.4); });
    for (let i = 0; i < 3; i++) prop(s, 'Bags', h.x1 - 0.6, h.fy, h.z1 - 3.0 + i * 0.6, { h: 0.6 });
    const kx = h.x0 + 0.75, kz = h.z0 + 2.2;                        // against the wall, out of the way
    box(s, kx, h.fy, kz, 0.8, 0.85, 1.4, '#b08a62'); solid(kx, kz, 0.8, 1.4);
    box(s, kx, h.fy + 0.85, kz, 0.6, 0.01, 1.2, '#f3ede0');
    for (let i = 0; i < 3; i++) ball(s, kx, h.fy + 0.86, kz - 0.35 + i * 0.35, 0.09, '#efe0c0');
    for (const k of [-1, 1]) { cyl(s, h.x + k * 1.6, h.fy, h.z0 + 0.7, 0.3, 0.3, '#9a7a4a', {}, 0.25); for (let i = 0; i < 3; i++) { const l = ball(s, h.x + k * 1.6 + (i - 1) * 0.12, h.fy + 0.28, h.z0 + 0.7, 0.08, LOAF); l.scale.set(1, 0.7, 1.5); } }
  },
  curio(s, h) {
    // Oddities on every shelf, a globe on a stand, a stuffed bird, a hanging lantern.
    for (const side of [-1, 1]) {
      const x = side > 0 ? h.x1 - 0.45 : h.x0 + 0.45;
      ['Crystal1', 'Skull', 'Chalice', 'Book1_Closed', 'Coin', 'Necklace1', 'Potion6_Filled', 'Crown2'].forEach((p, i) => prop(s, p, x, h.fy + 0.55 + (i % 4) * 0.5, h.z - 0.6 + Math.floor(i / 4) * 0.7, { h: p === 'Coin' ? 0.05 : 0.14 }));
    }
    cyl(s, h.x - 1.4, h.fy, h.z0 + 2.4, 0.04, 1.0, '#5a3f26'); ball(s, h.x - 1.4, h.fy + 0.95, h.z0 + 2.4, 0.25, '#2e6c8e', { roughness: 0.5 });
    ball(s, h.x - 1.4, h.fy + 1.07, h.z0 + 2.4 + 0.13, 0.08, '#5f8a3a');
    box(s, h.x + 1.4, h.fy, h.z0 + 2.2, 0.4, 0.9, 0.4, '#5a3f26'); ball(s, h.x + 1.4, h.fy + 0.9, h.z0 + 2.2, 0.15, '#8a6a44'); cyl(s, h.x + 1.4, h.fy + 1.15, h.z0 + 2.28, 0.04, 0.08, '#d7a33a', {}, 0.01);
    box(s, h.x, h.top - 0.7, h.z0 + 1.8, 0.2, 0.3, 0.2, '#3a2a1c'); lamp(s, h.x, h.top - 0.55, h.z0 + 1.8, '#ffc46b', 0.6);
  },
};

export const HOME_EXTRAS = {
  tamsin(s, h) {   // a sewing table, spools, a half-mended sail hung across the room
    box(s, h.x - 1.6, h.fy, h.z - 0.4, 0.9, 0.75, 0.6, '#7a5838');
    for (let i = 0; i < 4; i++) cyl(s, h.x - 1.9 + i * 0.2, h.fy + 0.75, h.z - 0.4, 0.04, 0.08, JARS[i]);
    // The sail she's mending, thrown over a sawhorse (two sloping sides), with seams and patches, a fold on the floor.
    const sx = h.x + 1.0, sz = h.z1 - 2.8, top = h.fy + 0.9;
    for (const k of [-1, 1]) { const leg = box(s, sx + k * 0.6, h.fy, sz, 0.06, 0.9, 0.5, '#6b4a2c'); leg.rotation.x = 0; }
    box(s, sx, top - 0.05, sz, 1.4, 0.06, 0.06, '#6b4a2c');
    const canvas = mat('#e9e0c8', { side: THREE.DoubleSide, roughness: 1 });
    for (const k of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), canvas);
      side.position.set(sx, top - 0.32, sz + k * 0.22); side.rotation.x = k * 0.5; s.add(side);
      for (let i = 0; i < 3; i++) { const seam = box(s, sx - 0.5 + i * 0.5, top - 0.7, sz + k * 0.25, 0.01, 0.62, 0.005, '#b8a882'); seam.rotation.x = k * 0.5; }
    }
    box(s, sx - 0.35, top - 0.42, sz + 0.27, 0.25, 0.22, 0.005, '#c9b089').rotation.x = 0.5;    // patches
    box(s, sx + 0.3, top - 0.55, sz - 0.27, 0.2, 0.18, 0.005, '#b8a070').rotation.x = -0.5;
    box(s, sx - 0.2, h.fy, sz + 0.9, 1.1, 0.12, 0.6, '#e9e0c8');                              // a folded length on the floor
  },
  kadir(s, h) {    // a ladder up to a roof hatch, sacks of seed, feathers on the floor
    for (const k of [-0.25, 0.25]) box(s, h.x0 + 1.0 + k, h.fy, h.z0 + 1.2, 0.06, h.top - h.fy, 0.06, '#6b4a2c');
    for (let i = 0; i < 7; i++) box(s, h.x0 + 1.0, h.fy + 0.35 + i * 0.4, h.z0 + 1.2, 0.5, 0.05, 0.05, '#6b4a2c');
    box(s, h.x0 + 1.0, h.top - 0.06, h.z0 + 1.2, 0.8, 0.05, 0.8, '#5a3f26');
    prop(s, 'Bags', h.x1 - 0.6, h.fy, h.z - 0.2, { h: 0.5 });
    for (let i = 0; i < 8; i++) { const f = box(s, h.x + Math.cos(i * 2.3) * 1.2, h.fy + 0.01, h.z + Math.sin(i * 1.9) * 1.2, 0.12, 0.005, 0.03, '#d8dde8'); f.rotation.y = i; }
  },
  brothers(s, h) { // a chalk line down the middle, dye vats (their father was a dyer)
    box(s, h.x, h.fy + 0.005, h.z, 0.05, 0.01, h.z1 - h.z0 - 0.4, '#f3ede0');
    ['#7a2a5c', '#2e6c8e', '#d7a33a'].forEach((c, i) => { cyl(s, h.x0 + 0.8, h.fy, h.z0 + 1.0 + i * 0.9, 0.35, 0.7, '#6b4a2c', {}, 0.3); cyl(s, h.x0 + 0.8, h.fy + 0.65, h.z0 + 1.0 + i * 0.9, 0.31, 0.02, c); solid(h.x0 + 0.8, h.z0 + 1.0 + i * 0.9, 0.7, 0.7); });
  },
  dalia(s, h) {    // a knitting basket, a little shrine with a candle, a picture of her son
    cyl(s, h.x + 1.3, h.fy, h.z - 0.6, 0.25, 0.3, '#9a7a4a', {}, 0.2); ball(s, h.x + 1.25, h.fy + 0.22, h.z - 0.6, 0.1, '#b8382b'); ball(s, h.x + 1.38, h.fy + 0.22, h.z - 0.55, 0.09, '#2e6c8e');
    box(s, h.x1 - 0.3, h.fy, h.z0 + 1.2, 0.4, 0.9, 0.6, '#5a3f26'); cyl(s, h.x1 - 0.3, h.fy + 0.9, h.z0 + 1.2, 0.03, 0.12, '#efe6d4'); lamp(s, h.x1 - 0.3, h.fy + 1.08, h.z0 + 1.2, '#ffb45a', 0.4);
    box(s, h.x1 - 0.06, h.fy + 1.6, h.z0 + 1.2, 0.04, 0.45, 0.35, '#7a5838'); box(s, h.x1 - 0.09, h.fy + 1.65, h.z0 + 1.2, 0.02, 0.35, 0.25, '#c9b089');
  },
  benedek(s, h) {  // candles on every surface, garlic by the door, a pile of books on ghosts
    for (let i = 0; i < 8; i++) { const x = h.x - 1.6 + (i % 4) * 1.0, z = h.z0 + 1.0 + Math.floor(i / 4) * 3.0; cyl(s, x, h.fy, z, 0.03, 0.18, '#efe6d4'); lamp(s, x, h.fy + 0.24, z, '#ffb45a', 0.3); }
    for (let i = 0; i < 5; i++) ball(s, h.x - 0.75, h.fy + 1.9 - i * 0.12, h.z0 + 0.1, 0.05, '#f3ede0');
    for (let i = 0; i < 5; i++) prop(s, 'Book1_Closed', h.x1 - 0.7, h.fy + i * 0.06, h.z - 0.5, { h: 0.06, ry: i * 0.4 });
  },
  zahra(s, h) {    // a real kitchen: a cabinet, pans on the wall, baskets of vegetables, a big stew pot on a fire
    prop(s, 'Kitchen_Cabinet1', h.x1 - 0.4, h.fy, h.z0 + 1.6, { h: 0.95, ry: -Math.PI / 2 });
    for (let i = 0; i < 3; i++) { const p = cyl(s, h.x1 - 0.08, h.fy + 1.5, h.z0 + 2.6 + i * 0.4, 0.14, 0.03, '#3a3a3c', { metalness: 0.5 }); p.rotation.z = Math.PI / 2; }
    cyl(s, h.x - 1.6, h.fy, h.z0 + 1.0, 0.25, 0.25, '#9a7a4a', {}, 0.2); for (let i = 0; i < 3; i++) prop(s, i % 2 ? 'Carrot_4' : 'Tomato_Harvested', h.x - 1.7 + i * 0.1, h.fy + 0.2, h.z0 + 1.0, { h: 0.12 });
    box(s, h.x + 1.4, h.fy, h.z - 0.6, 0.8, 0.25, 0.8, '#6a5a4a'); cyl(s, h.x + 1.4, h.fy + 0.25, h.z - 0.6, 0.3, 0.35, '#2a2420', { metalness: 0.4 }, 0.25);
    lamp(s, h.x + 1.4, h.fy + 0.2, h.z - 0.6, '#ff9a4a', 0.6); solid(h.x + 1.4, h.z - 0.6, 0.8, 0.8);
  },
  cyrus(s, h) {    // a kiln, lumps of clay, a drying shelf of pots
    box(s, h.x1 - 0.8, h.fy, h.z1 - 3.2, 1.1, 1.3, 1.0, '#8a5a3a'); lamp(s, h.x1 - 0.8, h.fy + 0.5, h.z1 - 3.75, '#ff9a4a', 0.7); solid(h.x1 - 0.8, h.z1 - 3.2, 1.1, 1.0);
    for (let i = 0; i < 4; i++) ball(s, h.x + 0.9 + i * 0.25, h.fy, h.z + 1.3, 0.12, '#a86b4a');
    wallShelf(s, h, -1, h.z + 0.6, 2.2, 2, (x, y, z, r, i) => cyl(s, x, y, z, 0.1, 0.2 + (i % 2) * 0.08, '#b0603a', {}, 0.07));
  },
  selim(s, h) {    // a tea set on the table, tally marks of forty years on the wall
    for (let i = 0; i < 3; i++) cyl(s, h.x0 + 1.15 + i * 0.12, h.fy + 0.8, h.z1 - 1.6, 0.04, 0.06, '#e8e2d2');
    for (let i = 0; i < 24; i++) box(s, h.x1 - 0.05, h.fy + 1.3 + Math.floor(i / 8) * 0.3, h.z - 1.0 + (i % 8) * 0.12 + Math.floor((i % 8) / 5) * 0.08, 0.01, 0.2, 0.015, '#f3ede0');
  },
  tova(s, h) {     // coils of rope, lifting stones, an anchor on the wall, her trophies
    for (let i = 0; i < 2; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 6, 16), mat('#b0905a', { roughness: 1 })); r.rotation.x = Math.PI / 2; r.position.set(h.x1 - 0.7, h.fy + 0.07 + i * 0.12, h.z0 + 1.0); s.add(r); }
    for (let i = 0; i < 3; i++) ball(s, h.x - 1.4 + i * 0.4, h.fy, h.z0 + 1.4, 0.13 + i * 0.03, '#8a8278');
    box(s, h.x1 - 0.06, h.fy + 1.3, h.z, 0.05, 1.0, 0.1, '#3a3a3c', { metalness: 0.6 }); box(s, h.x1 - 0.06, h.fy + 1.3, h.z, 0.05, 0.1, 0.7, '#3a3a3c', { metalness: 0.6 });
    for (let i = 0; i < 3; i++) prop(s, 'Chalice', h.x0 + 0.45, h.fy + 1.45, h.z - 1.0 + i * 0.3, { h: 0.18 });
  },
  nadim(s, h) {    // a pouch of winnings, cards on the table, a practice mirror, his spare cups
    prop(s, 'Pouch', h.x0 + 1.3, h.fy + 0.8, h.z1 - 1.6, { h: 0.15 });
    for (let i = 0; i < 5; i++) { const c = box(s, h.x0 + 1.1 + i * 0.08, h.fy + 0.8, h.z1 - 1.5, 0.08, 0.005, 0.12, '#f3ede0'); c.rotation.y = i * 0.3; }
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), mat('#dfe8ec', { metalness: 0.95, roughness: 0.05 }));
    mirror.position.set(h.x1 - 0.06, h.fy + 1.5, h.z0 + 1.6); mirror.rotation.y = -Math.PI / 2; s.add(mirror);
    for (let i = 0; i < 6; i++) cyl(s, h.x1 - 0.5, h.fy + (i % 3) * 0.13, h.z - 0.8 + Math.floor(i / 3) * 0.2, 0.05, 0.13, '#b07a4a', {}, 0.08);
  },
  rhea(s, h) {     // a rack of knives, a circus poster, knives already in her target
    for (let i = 0; i < 5; i++) prop(s, 'Dagger', h.x0 + 0.12, h.fy + 1.1, h.z0 + 1.2 + i * 0.25, { h: 0.35 });
    box(s, h.x0 + 0.08, h.fy + 0.95, h.z0 + 1.7, 0.04, 0.06, 1.3, '#5a3f26');
    box(s, h.x, h.fy + 1.3, h.z1 - 0.08, 1.0, 1.3, 0.02, '#b8382b'); box(s, h.x, h.fy + 1.7, h.z1 - 0.1, 0.8, 0.3, 0.02, '#e7c35a');
    for (let i = 0; i < 3; i++) box(s, h.x1 - 0.13, h.fy + 1.4 + (i - 1) * 0.15, h.z + (i - 1) * 0.12, 0.18, 0.025, 0.025, '#6b4a2c');
  },
};
