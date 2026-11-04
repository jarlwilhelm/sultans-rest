// Inside the Great Luminous Shrine (the hall: city.js luminousShrine; the keeper's words: game/shrine.js):
// King Shou's golden likeness at the far end, fire bowls, rows of benches, an aisle carpet, the offering altar and
// the rack of candles (Ale's joins it when you light one). Code-drawn placeholders; real models after the Godot port.
import * as THREE from 'three';
import { prop, lamp } from './interiors.js';
import { colliders } from './land.js';
import { addFire } from './fire.js';
import { makeStatue } from './characters.js';
import { state } from './game/state.js';

const GOLD = new THREE.MeshStandardMaterial({ color: '#e0b347', metalness: 0.85, roughness: 0.3 });
const STONE = new THREE.MeshStandardMaterial({ color: '#e8dcc2', roughness: 0.8 });
function box(s, x, y, z, w, h, d, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.castShadow = b.receiveShadow = true; s.add(b); return b; }
function cyl(s, x, y, z, r, h, m, r2 = r) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r2, h, 16), m); c.position.set(x, y + h / 2, z); c.castShadow = true; s.add(c); return c; }

export function furnishShrine(scene) {
  const h = scene.userData.shrine;
  if (!h) return;
  const { x, fy } = h;
  // The dais and the King's golden likeness at the far end, facing the door.
  box(scene, x, fy, h.z1 - 2.2, 6, 0.5, 3.6, STONE);
  colliders.push({ x0: x - 3, x1: x + 3, z0: h.z1 - 4, z1: h.z1 });
  box(scene, x, fy + 0.5, h.z1 - 2.0, 2.2, 1.6, 2.2, STONE);
  box(scene, x, fy + 2.1, h.z1 - 2.0, 2.4, 0.15, 2.4, GOLD);
  makeStatue(scene, { x, y: fy + 2.25, z: h.z1 - 2.0 }, 3.6);
  for (const k of [-1, 1]) { cyl(scene, x + k * 2.6, fy + 0.5, h.z1 - 3.4, 0.35, 1.0, STONE); cyl(scene, x + k * 2.6, fy + 1.5, h.z1 - 3.4, 0.55, 0.25, GOLD, 0.4); addFire(scene, x + k * 2.6, fy + 1.75, h.z1 - 3.4, { size: 1.0, strength: 1.1 }); }
  // The offering altar before the dais, with its brass bowl.
  box(scene, x, fy, h.z1 - 5.2, 1.6, 0.95, 0.8, STONE);
  colliders.push({ x0: x - 0.8, x1: x + 0.8, z0: h.z1 - 5.6, z1: h.z1 - 4.8 });
  cyl(scene, x, fy + 0.95, h.z1 - 5.2, 0.35, 0.12, GOLD, 0.25);
  // The aisle and the benches, eight rows.
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.02, h.z1 - h.z0 - 6), new THREE.MeshStandardMaterial({ color: '#8a2a1c', roughness: 1 }));
  carpet.position.set(x, fy + 0.01, (h.z0 + h.z1 - 6) / 2 + 0.3); scene.add(carpet);
  for (let r = 0; r < 8; r++) for (const k of [-1, 1]) {
    const bz = h.z0 + 2.4 + r * 1.9;
    if (bz > h.z1 - 6.5) continue;
    prop(scene, 'Bench_1', x + k * 3.6, fy, bz, { len: 3.6 });
    colliders.push({ x0: x + k * 3.6 - 1.8, x1: x + k * 3.6 + 1.8, z0: bz - 0.3, z1: bz + 0.3 });
  }
  // The candle rack along the left wall: hundreds of small flames, each one somebody.
  const rx = h.x1 - 0.5, rz = h.z1 - 7.5;
  box(scene, rx, fy, rz, 0.6, 0.9, 3.2, new THREE.MeshStandardMaterial({ color: '#5a3f26', roughness: 1 }));
  colliders.push({ x0: rx - 0.3, x1: rx + 0.3, z0: rz - 1.6, z1: rz + 1.6 });
  const wax = new THREE.MeshStandardMaterial({ color: '#efe6d4' });
  for (let i = 0; i < 18; i++) { const cz = rz - 1.4 + (i % 9) * 0.35, cx = rx - 0.15 + Math.floor(i / 9) * 0.3; cyl(scene, cx, fy + 0.9, cz, 0.025, 0.12 + (i % 3) * 0.04, wax); }
  lamp(scene, rx, fy + 1.15, rz, '#ffb45a', 1.4);
  // Ale's candle: lit when you light it, and burning from then on.
  cyl(scene, rx - 0.15, fy + 0.9, rz + 1.75, 0.03, 0.2, wax);
  let lit = false;
  const light = () => { if (lit || !state.flags.aleCandle) return; lit = true; lamp(scene, rx - 0.15, fy + 1.15, rz + 1.75, '#ffd38a', 0.35); };
  light(); addEventListener('lavine:candle', light);
  // Light from the dome and along the walls.
  lamp(scene, x, h.top - 0.8, h.z + 2, '#fff1c8', 4.0);
  for (const k of [-1, 1]) for (let i = 0; i < 3; i++) lamp(scene, x + k * (h.x1 - h.x0) / 2.2, fy + 2.6, h.z0 + 4 + i * 6, '#ffc46b', 1.0);
  // The keeper, by the altar.
  scene.userData.posts.push({ x: x + 1.6, z: h.z1 - 5.4, ry: 0, role: 'scribe', race: 'human', body: 'Female_Robe', label: 'Keeper of the Luminous Shrine', npc: { kind: 'shrine' } });
}
