// Meridia, the Coastal Republic's capital (Chapter Two): green and stone. Built here from simple shapes
// (merged into a few meshes so it stays fast): the three ring walls with towers and gatehouses, houses that
// get bigger and better the higher you climb, the harbor's working district outside the walls (warehouses,
// cranes, the Customs House, the inn), the market and the Exchange in the middle ring, and the Republic
// Hall on the hilltop. Names and looks are Claude's DRAFT, made from the user's description.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundHeight, addCollider, colliders } from '../land.js';
import { C, R_OUT, R_MID, R_IN, GATE_HALF, RAMP_HALF, RAMP_LEN, QUAY_DEPTH, PIERS, HALF } from './layout.js';
import { hollow } from '../interiors.js';
import { surface } from '../look.js';
import { doorMaterial, windowMaterial } from '../doorlook.js';
import { signBoard, placeReadable, readables } from '../signs.js';
import { plants } from '../city.js';
import { makeRng, range, pick } from '../noise.js';
import { makeShip } from '../ships.js';

const rng = makeRng(1717);
import { SPOTS } from './spots.js';
import { meridiaPosts, MERIDIA_FOLK } from './people.js';
export { SPOTS };
// Rectangles kept clear of houses (landmarks, plots, the avenue).
const KEEP_CLEAR = [
  [-14, 14, 0, 400],                                 // the avenue
  [-40, 40, 140, 172],                               // the market
  [-62, -30, 150, 172], [32, 62, 148, 170],          // the Exchange, the Gilded Gull
  [18, 42, 176, 194], [-44, -16, 168, 188],          // the bakery, your store's plot
  [-72, -44, 108, 128],                              // your house's plot
  [-40, 40, 226, 300],                               // the Republic Hall and its square
  [-76, -48, 184, 208], [48, 76, 188, 212],          // your house (middle ring), your bigger store
];
const clear = (x, z, pad = 0) => !KEEP_CLEAR.some(([x0, x1, z0, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad)
  && !Object.values(MERIDIA_FOLK).some(f => Math.hypot(f.x - x, f.z - z) < pad + 4);

// Geometry collected per material, merged at the end.
const parts = {};
function add(mat, geo, x, y, z, ry = 0) {
  geo.rotateY(ry); geo.translate(x, y, z);
  (parts[mat] ??= []).push(geo);
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
// A pitched roof along the house's width (ridge along local x).
function roof(w, d, h) {
  const shape = new THREE.Shape([new THREE.Vector2(-d / 2 - 0.4, 0), new THREE.Vector2(d / 2 + 0.4, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: w + 0.6, bevelEnabled: false });
  g.translate(0, 0, -(w + 0.6) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}
function solid(x, z, w, d, ry) {
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
  const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
  addCollider(x - hw, x + hw, z - hd, z + hd);
}

// A house: walls, a pitched roof, a door and windows on the front (facing ry: 0 = facing the sea).
// (2026-11-04, the user: the houses 'look like they're missing texture'.) Now: a dark stone base, corner stones on
// plastered houses, timber corner posts on plank ones, stone frames and sills round the windows, a door frame,
// and a chimney on most roofs.
function house(x, z, w, d, floors, { wall = 'plaster', roofMat = 'tile', ry = 0 } = {}) {
  const y = groundHeight(x, z) - 0.3;
  const h = floors * 3.1 + 0.3;
  add(wall, box(w, h, d), x, y, z, ry);
  add('plinth', box(w + 0.16, 0.9, d + 0.16), x, y, z, ry);
  add(roofMat, roof(w, d, Math.min(3.2, d * 0.45)), x, y + h, z, ry);
  const local = (lx, ly, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, y + ly, z - Math.sin(ry) * lx + Math.cos(ry) * lz];
  // Corners: dressed stone up a plastered house, a dark beam on a plank one.
  if (wall !== 'stone') for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const [cx, cy, cz] = local(sx * (w / 2 - 0.12), 0.9, sz * (d / 2 - 0.12));
    add(wall === 'planks' ? 'beam' : 'trim', new THREE.BoxGeometry(0.34, h - 0.9, 0.34).translate(0, (h - 0.9) / 2, 0), cx, cy, cz, ry);
  }
  // The front (-z at ry = 0): a framed door, framed windows with sills.
  const fz = -(d / 2 + 0.03);
  // The door sits IN FRONT of its stone surround now (the surround used to cover it: 'looks like a wall', the
  // user, 2026-11-04): stone strips all the way round (two jambs, a lintel, a step), the plank door between them.
  add('door', new THREE.BoxGeometry(1.1, 2.1, 0.08).translate(0, 1.05, 0), ...local(0, 0.45, fz - 0.06), ry);
  for (const sx of [-1, 1]) add('trim', new THREE.BoxGeometry(0.22, 2.4, 0.16).translate(0, 1.2, 0), ...local(sx * 0.66, 0.3, fz - 0.06), ry);
  add('trim', new THREE.BoxGeometry(1.54, 0.26, 0.18).translate(0, 0.13, 0), ...local(0, 2.55, fz - 0.07), ry);
  add('plinth', new THREE.BoxGeometry(1.5, 0.15, 0.5).translate(0, 0.075, 0), ...local(0, 0.3, fz - 0.25), ry);
  for (let f = 0; f < floors; f++) for (const lx of [-w / 2 + 1.3, w / 2 - 1.3]) {
    if (w < 4 && f === 0) continue;
    const wy = 1.2 + f * 3.1;
    // Window (its own wooden frame and glazing bars are painted on), a stone surround all the way round, a sill.
    add('window', new THREE.BoxGeometry(0.8, 1.0, 0.06).translate(0, 0.5, 0), ...local(lx, wy, fz - 0.04), ry);
    for (const sx of [-1, 1]) add('trim', new THREE.BoxGeometry(0.14, 1.28, 0.12).translate(0, 0.64, 0), ...local(lx + sx * 0.47, wy - 0.14, fz - 0.05), ry);
    add('trim', new THREE.BoxGeometry(1.08, 0.16, 0.12).translate(0, 0.08, 0), ...local(lx, wy + 1.0, fz - 0.05), ry);
    add('trim', new THREE.BoxGeometry(1.25, 0.12, 0.3).translate(0, 0.06, 0), ...local(lx, wy - 0.22, fz - 0.12), ry);
  }
  // Windows on the sides too, one per floor.
  for (let f = 0; f < floors; f++) for (const sx of [-1, 1]) {
    const [wx, wy, wz] = local(sx * (w / 2 + 0.04), 1.2 + f * 3.1, 0);
    add('window', new THREE.BoxGeometry(0.06, 1.0, 0.8).translate(0, 0.5, 0), wx, wy, wz, ry);
    for (const sz of [-1, 1]) add('trim', new THREE.BoxGeometry(0.12, 1.28, 0.14).translate(0, 0.64, 0), ...local(sx * (w / 2 + 0.05), 1.06 + f * 3.1, sz * 0.47), ry);
    add('trim', new THREE.BoxGeometry(0.12, 0.16, 1.08).translate(0, 0.08, 0), ...local(sx * (w / 2 + 0.05), 2.2 + f * 3.1, 0), ry);
    add('trim', new THREE.BoxGeometry(0.3, 0.12, 1.25).translate(0, 0.06, 0), ...local(sx * (w / 2 + 0.12), 0.98 + f * 3.1, 0), ry);
  }
  if (rng() < 0.7) { const [cx, cy, cz] = local(w * 0.25, h + 0.4, d * 0.15); add('stone', box(0.7, 2.6, 0.7), cx, cy, cz, ry); }
  solid(x, z, w, d, ry);
}

// The ring walls: stone, towers every so often, a gatehouse on the avenue.
function ringWall(R, lowH, highH) {
  const step = 4.5 / R;                                  // about 4.5 m per segment
  const gateA = Math.asin((GATE_HALF + 0.2) / R);
  for (let a = 0; a < Math.PI * 2; a += step) {
    const mid = a + step / 2;
    // Angle from straight south (the gate) of this segment's middle.
    const fromGate = Math.abs(((mid - Math.PI * 1.5) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (fromGate < gateA) continue;
    const x = C.x + Math.cos(mid) * R, z = C.z + Math.sin(mid) * R;
    const base = groundHeight(x + Math.cos(mid) * 3, z + Math.sin(mid) * 3) - 1;
    const top = Math.max(highH, lowH) + 8;
    add('wallstone', new THREE.BoxGeometry(R * step + 0.3, top - base, 2.6).translate(0, (top - base) / 2, 0), x, base, z, -mid + Math.PI / 2);
  }
  for (let a = 0; a < Math.PI * 2; a += 0.42) {
    const fromGate = Math.abs(((a - Math.PI * 1.5) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (fromGate < gateA + 0.08) continue;
    const x = C.x + Math.cos(a) * R, z = C.z + Math.sin(a) * R;
    const base = groundHeight(x, z) - 4, top = Math.max(highH, lowH) + 11;
    add('wallstone', new THREE.CylinderGeometry(3, 3.4, top - base, 10).translate(0, (top - base) / 2, 0), x, base, z);
    add('slate', new THREE.ConeGeometry(3.8, 4, 10).translate(0, 2, 0), x, top, z);
  }
  // The gatehouse (2026-11-04, the user: 'a door, not the floor rising up'): two tall towers, a high arch with
  // battlements above the road, and two plank doors standing open against the inside walls. The road runs level
  // through it (layout.js); the ramp up to it is walled with stone on both sides.
  const gz = C.z - R, gy = groundHeight(0, gz), road = Math.max(gy, highH);
  for (const sx of [-1, 1]) {
    const x = sx * (GATE_HALF + 2.6);
    const th = road + 15 - (gy - 6);
    add('wallstone', new THREE.CylinderGeometry(3, 3.4, th, 10).translate(0, th / 2, 0), x, gy - 6, gz);
    add('slate', new THREE.ConeGeometry(3.9, 4.5, 10).translate(0, 2.25, 0), x, road + 9, gz);
    addCollider(x - 3.2, x + 3.2, gz - 3.2, gz + 3.2);
    // An open door, swung back against the inside of the wall.
    add('door', new THREE.BoxGeometry(0.25, 7, GATE_HALF).translate(0, 3.5, GATE_HALF / 2), sx * (GATE_HALF - 0.2), road, gz + 1.4);
  }
  add('wallstone', new THREE.BoxGeometry(GATE_HALF * 2 + 2, 4, 3.4).translate(0, 2, 0), 0, road + 7.2, gz);
  for (let i = -2; i <= 2; i++) add('wallstone', box(1, 1.1, 3.4), i * 2.4, road + 11.2, gz);
  if (R !== R_OUT) for (const sx of [-1, 1]) {
    // Stone sides along the ramp (in steps, following the slope).
    for (let k = 0; k < 6; k++) {
      const z0 = gz - 3 - (k + 1) * (RAMP_LEN / 6), z1 = gz - 3 - k * (RAMP_LEN / 6);
      const zm = (z0 + z1) / 2, top = groundHeight(0, zm) + 0.9, bot = groundHeight(sx * (RAMP_HALF + 3), zm) - 0.5;
      add('wallstone', new THREE.BoxGeometry(1, top - bot, z1 - z0 + 0.05).translate(0, (top - bot) / 2, 0), sx * (RAMP_HALF + 0.5), bot, zm);
      addCollider(sx * (RAMP_HALF + 0.5) - 0.5, sx * (RAMP_HALF + 0.5) + 0.5, z0, z1);
    }
  }
}

// A long shed of the working district.
function warehouse(x, z, w, d, ry = 0) {
  const y = groundHeight(x, z) - 0.3;
  add('planks', box(w, 6, d), x, y, z, ry);
  add('slate', roof(w, d, 3), x, y + 6, z, ry);
  const fx = -Math.sin(ry), fz = -Math.cos(ry);
  add('door', new THREE.BoxGeometry(4, 4.2, 0.15).translate(0, 2.1, 0), x + fx * (d / 2 + 0.05), y, z + fz * (d / 2 + 0.05), ry);
  solid(x, z, w, d, ry);
}
function crane(x, z) {
  const y = groundHeight(x, z);
  add('beam', new THREE.BoxGeometry(0.6, 11, 0.6).translate(0, 5.5, 0), x, y, z);
  add('beam', new THREE.BoxGeometry(0.4, 0.4, 9).translate(0, 0, -3.5), x, y + 10.6, z);
  add('beam', new THREE.BoxGeometry(2.4, 0.5, 2.4).translate(0, 0.25, 0), x, y, z);
  addCollider(x - 1.2, x + 1.2, z - 1.2, z + 1.2);
}

// The Republic Hall: a broad stone hall with a colonnade and a green copper dome.
function republicHall() {
  const x = C.x, z = SPOTS.hall.z + 8, y = groundHeight(x, z) - 0.2;
  add('marble', box(40, 14, 24), x, y, z);
  add('marble', box(44, 1.2, 30), x, y - 0.6, z);
  for (let i = 0; i < 10; i++) add('marble', new THREE.CylinderGeometry(0.8, 0.9, 12, 12).translate(0, 6, 0), x - 18 + i * 4, y + 0.6, z - 14);
  add('marble', box(42, 2, 6), x, y + 12.6, z - 13);
  add('copper', new THREE.SphereGeometry(9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), x, y + 14, z + 2);
  addCollider(x - 22, x + 22, z - 15, z + 15);
}
// A landmark building with a sign over the door.
function landmark(scene, s, w, d, floors, { wall = 'stone', roofMat = 'slate', ry = 0, title, sub, bg = '#2d1d10', fg = '#f1d48a' }) {
  house(s.x, s.z, w, d, floors, { wall, roofMat, ry });
  const y = groundHeight(s.x, s.z) + 3.2;
  const fx = -Math.sin(ry), fz = -Math.cos(ry);
  placeReadable(scene, signBoard(title, sub, { bg, fg }), { x: s.x + fx * (d / 2 + 0.12), y, z: s.z + fz * (d / 2 + 0.12), w: Math.min(w - 1, 6), h: 1.5, ry, title });
}

export function buildMeridia(scene) {
  scene.userData.stalls = [];
  scene.userData.marketStalls = [];
  scene.userData.posts = [];
  scene.userData.cargo = [];
  scene.userData.flames = scene.userData.flames || [];
  meridiaPosts(scene.userData.posts);
  const mats = {
    plaster: surface('plastered_wall', { tile: 1.6, detail: 1.0, normal: 1.2, weather: true }), stone: surface('sandstone_blocks_05', { tile: 2.5, detail: 0.8, weather: true }),
    trim: surface('sandstone_blocks_05', { tile: 1.2, detail: 0.6 }), plinth: surface('sandstone_blocks_05', { tile: 1.4, detail: 0.8 }),
    wallstone: surface('sandstone_blocks_05', { tile: 3, detail: 0.7 }), marble: surface('plastered_wall', { tile: 4, detail: 0.4 }),
    planks: surface('weathered_brown_planks', { tile: 2, detail: 0.7 }), beam: surface('weathered_brown_planks', { tile: 1, detail: 0.6 }),
    tile: new THREE.MeshStandardMaterial({ color: '#9a4a2e', roughness: 0.85 }), slate: new THREE.MeshStandardMaterial({ color: '#4c5662', roughness: 0.8 }),
    copper: new THREE.MeshStandardMaterial({ color: '#5aa08a', roughness: 0.55, metalness: 0.3 }),
    door: doorMaterial('#6b4529'),
    redpaint: new THREE.MeshStandardMaterial({ color: '#a8322a', roughness: 0.7 }), net: new THREE.MeshStandardMaterial({ color: '#2a3a3a', roughness: 1, transparent: true, opacity: 0.55 }),
    window: windowMaterial('#e8dfcc'),
  };
  mats.plaster.color.set('#d8ccb4'); mats.stone.color.set('#b3aea2'); mats.trim.color.set('#cfc6b2'); mats.plinth.color.set('#7d776c'); mats.wallstone.color.set('#a39e92'); mats.marble.color.set('#f2efe6');
  scene.userData.windowMat = mats.window;

  // The walls, each a terrace higher than the last.
  ringWall(R_OUT, groundHeight(0, C.z - R_OUT - 6), groundHeight(0, C.z - R_OUT + 6));
  ringWall(R_MID, groundHeight(-30, C.z - R_MID - 8), groundHeight(-30, C.z - R_MID + 8) + 0.5);
  ringWall(R_IN, groundHeight(-30, C.z - R_IN - 8), groundHeight(-30, C.z - R_IN + 8) + 0.5);

  // Houses in rings: small and close in the outer ring, larger in the middle, mansions on the hilltop.
  const rings = [
    { r0: R_MID + 9, r1: R_OUT - 9, w: [5, 7], d: [5, 6], floors: [1, 2], wall: ['plaster', 'stone', 'planks'], roofs: ['tile', 'tile', 'slate'], gap: 2.2, rows: [R_MID + 12, R_MID + 26, R_MID + 40] },
    { r0: R_IN + 9, r1: R_MID - 9, w: [7, 10], d: [6, 8], floors: [2, 3], wall: ['plaster', 'stone'], roofs: ['tile', 'slate'], gap: 3, rows: [R_IN + 13, R_IN + 31] },
    { r0: 30, r1: R_IN - 9, w: [12, 16], d: [10, 12], floors: [2, 3], wall: ['marble', 'stone'], roofs: ['slate', 'copper'], gap: 6, rows: [R_IN - 16] },
  ];
  for (const ring of rings) {
    for (const r of ring.rows) {
      let a = 0;
      while (a < Math.PI * 2) {
        const w = range(rng, ...ring.w), d = range(rng, ...ring.d);
        const step = (w + ring.gap) / r;
        const mid = a + step / 2;
        const x = C.x + Math.cos(mid) * r, z = C.z + Math.sin(mid) * r;
        a += step;
        if (!clear(x, z, Math.max(w, d) / 2 + 1)) continue;
        if (colliders.some(c => x > c.x0 - 3 && x < c.x1 + 3 && z > c.z0 - 3 && z < c.z1 + 3)) continue;
        const ry = -mid - Math.PI / 2;                    // front facing the hilltop... turned to face outward-down
        house(x, z, w, d, Math.round(range(rng, ...ring.floors)), { wall: pick(rng, ring.wall), roofMat: pick(rng, ring.roofs), ry: ry + Math.PI });
        if (rng() < 0.35) plants.bushes.push({ x: x + Math.cos(mid) * (d / 2 + 2), y: groundHeight(x, z), z: z + Math.sin(mid) * (d / 2 + 2), s: range(rng, 0.8, 1.3), bloom: rng() < 0.5, ry: rng() * 6, color: pick(rng, ['#5d8a3e', '#6a9a44', '#4f7a36']), flower: pick(rng, ['#e85a9c', '#f07a3a', '#e8e0d0', '#8a6ad0']) });
      }
    }
  }

  // The working district outside the walls: warehouses, cranes on the quay, crates and barrels.
  for (const [x, z, w, d] of [[-150, 58, 24, 12], [-118, 70, 20, 12], [-150, 84, 20, 12], [118, 70, 22, 12], [150, 60, 24, 12], [150, 86, 20, 12], [-88, 96, 18, 10], [96, 100, 18, 10]]) warehouse(x, z, w, d);
  for (const x of [-140, -100, -30, 30, 100, 140]) crane(x, 4);
  for (let i = 0; i < 50; i++) {
    const x = range(rng, -HALF + 10, HALF - 10), z = range(rng, 3, 9);
    if (Math.abs(x) < 8 || PIERS.some(p => Math.abs(x - p.x) < p.w / 2 + 2)) continue;
    scene.userData.cargo.push({ x, z, k: rng(), ry: range(rng, 0, 6), stack: rng() < 0.35 });
    addCollider(x - 0.6, x + 0.6, z - 0.6, z + 0.6);
  }
  // The harbor's own identity (the user, 2026-11-04: 'empty, and looks the same'): a lighthouse on a rocky
  // point, little fishing boats along the quay wall, nets drying on racks, fish stalls, and bunting on the quay.
  {
    const lx = 200, lz = -46;
    add('wallstone', new THREE.CylinderGeometry(9, 12, 6, 12).translate(0, -1, 0), lx, -2, lz);                    // the rocks
    for (let i = 0; i < 4; i++) add(i % 2 ? 'marble' : 'redpaint', new THREE.CylinderGeometry(2.6 - i * 0.25, 2.85 - i * 0.25, 5, 14).translate(0, 2.5, 0), lx, 2 + i * 5, lz);
    add('window', new THREE.CylinderGeometry(2.1, 2.1, 2.6, 12).translate(0, 1.3, 0), lx, 22, lz);
    add('slate', new THREE.ConeGeometry(2.6, 2.6, 12).translate(0, 1.3, 0), lx, 24.6, lz);
    const beacon = new THREE.PointLight('#ffd38a', 0, 120, 1.5); beacon.position.set(lx, 23.3, lz); scene.add(beacon);
    scene.userData.lighthouse = beacon;
  }
  for (let i = 0; i < 9; i++) {
    const x = -170 + i * 40 + range(rng, -6, 6);
    if (PIERS.some(p => Math.abs(x - p.x) < p.w / 2 + 6)) continue;
    const boat = makeShip({ land: 'the harbor', hull: pick(rng, ['#3a6a8a', '#8a3a2a', '#5a7a3a', '#c9a24a', '#e8e2d2']), sail: pick(rng, ['#e8e2d2', '#c96a3a', '#d8cba8']), flag: '#2b5fa8' }, range(rng, 6, 9));
    boat.position.set(x, 0, -6 - range(rng, 0, 4)); boat.rotation.y = Math.PI / 2 + range(rng, -0.25, 0.25);
    scene.add(boat);
  }
  for (const [x, z] of [[-88, 24], [-82, 24], [74, 26], [80, 26], [140, 22], [-140, 22]]) {
    // A net drying on a frame: two posts, a beam, and the net (a dark mesh).
    for (const s of [-1.6, 1.6]) add('beam', box(0.15, 2.4, 0.15), x + s, groundHeight(x, z), z);
    add('beam', box(3.4, 0.12, 0.12), x, groundHeight(x, z) + 2.35, z);
    add('net', new THREE.BoxGeometry(3.1, 1.9, 0.02).translate(0, 0.95, 0), x, groundHeight(x, z) + 0.35, z);
    addCollider(x - 1.8, x + 1.8, z - 0.3, z + 0.3);
  }
  for (const x of [-40, -32, 32, 40]) {
    // Fish stalls on the quay (harbor stalls: rum, grain, wool, oil, locks... and the smell of the catch).
    const z = 26;
    scene.userData.marketStalls.push({ x, y: groundHeight(x, z), z, ry: 0, color: '#2f6c8e' });
    addCollider(x - 2.2, x + 2.2, z - 1.6, z - 0.2);
    const n = scene.userData.stalls.length;
    scene.userData.stalls.push({ x, z: z + 0.4, id: `m-stall-${n}`, kind: 'harbor' });
  }
  { // Bunting along the quay: little flags on a line from lamp post to lamp post (the same spots as the quay lamps
    // below). Only between two posts 20 m apart, so no line runs off into nothing (the user, 2026-11-04).
    const cols = ['#b8382b', '#e8e2d2', '#2b5fa8', '#e7c35a', '#5a8a3a'];
    const posts = [];
    for (let x = -190; x <= 190; x += 20) if (!PIERS.some(p => Math.abs(x - p.x) < p.w / 2 + 2.5) && Math.abs(x) > 4) posts.push(x);
    let k = 0;
    for (const a of posts) {
      if (!posts.includes(a + 20)) continue;
      const top = groundHeight(a, 2.4) + 2.55, sagAt = (u) => top - 0.45 * Math.sin(u * Math.PI);
      const N = 8;
      for (let i = 0; i < N; i++) {                       // the line, in short pieces along the sag
        const u0 = i / N, u1 = (i + 1) / N, x0 = a + u0 * 20, x1 = a + u1 * 20, y0 = sagAt(u0), y1 = sagAt(u1);
        const len = Math.hypot(x1 - x0, y1 - y0);
        add('beam', new THREE.CylinderGeometry(0.012, 0.012, len, 4).rotateZ(Math.PI / 2 + Math.atan2(y1 - y0, x1 - x0)), (x0 + x1) / 2, (y0 + y1) / 2, 2.4);
      }
      for (let f = 1; f < 9; f++) {                       // eight pennants hanging from it
        const u = f / 9;
        add('flag' + (k++ % cols.length), new THREE.ConeGeometry(0.16, 0.34, 3).rotateZ(Math.PI).translate(0, -0.17, 0), a + u * 20, sagAt(u), 2.4);
      }
    }
    cols.forEach((c, i) => { mats['flag' + i] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide }); });
  }

  // Landmarks.
  // The Brine & Barrel: a real inside (the user, 2026-11-04: 'you can't actually go in'). Same size as the Salted
  // Kraken, so the same tavern room fits (meridia/life.js furnishes it); Tobin stands behind the bar.
  scene.userData.shells = scene.userData.shells || {};
  scene.userData.shells.inn = hollow(scene, { x: SPOTS.inn.x, z: SPOTS.inn.z, w: 11, d: 13, h: 5.5, color: '#d8ccb4', doorW: 1.8, doorH: 2.7, name: 'The Brine & Barrel', doorColor: '#3d2a1a' });
  { const s = scene.userData.shells.inn;
    add('tile', roof(11.4, 13.4, 3.4), SPOTS.inn.x, s.fy + 5.85, SPOTS.inn.z, 0);
    placeReadable(scene, signBoard('THE BRINE & BARREL', 'Rooms by the week', { bg: '#1f3a5a', fg: '#f2efe6' }), { x: SPOTS.inn.x, y: s.fy + 3.6, z: SPOTS.inn.z - 6.72, w: 4.6, h: 1.1, title: 'The Brine & Barrel' }); }
  landmark(scene, SPOTS.customs, 18, 12, 2, { wall: 'stone', roofMat: 'slate', title: 'CUSTOMS HOUSE', sub: 'Of the Coastal Republic', bg: '#1f3a5a', fg: '#f2efe6' });
  landmark(scene, SPOTS.exchange, 18, 12, 3, { wall: 'marble', roofMat: 'copper', ry: Math.PI / 2, title: 'THE EXCHANGE', sub: 'Deeds · Contracts · Coin', bg: '#1f3a5a', fg: '#f2efe6' });
  landmark(scene, SPOTS.tavern, 14, 10, 2, { wall: 'plaster', roofMat: 'tile', ry: -Math.PI / 2, title: 'THE GILDED GULL', sub: 'Ale · Song · Company' });
  landmark(scene, SPOTS.bakery, 10, 8, 2, { wall: 'plaster', roofMat: 'tile', title: 'THE LANTERN BAKERY', sub: 'Honest bread since the Republic', bg: '#f2e6c8', fg: '#5a3a14' });
  republicHall();
  placeReadable(scene, signBoard('REPUBLIC HALL', 'The people keep the power', { bg: '#1f3a5a', fg: '#f2efe6' }), { x: 0, y: groundHeight(0, SPOTS.hall.z - 7) + 13.5, z: SPOTS.hall.z - 7.2, w: 10, h: 2.4, title: 'Republic Hall' });
  { // The Inner Gate's sign, on two posts beside the ramp (it floated before).
    const sx = -RAMP_HALF - 9, sz = SPOTS.innerGate.z - 12, gy = groundHeight(sx, sz);
    for (const px of [-2.3, 2.3]) add('beam', box(0.22, 2.6, 0.22), sx + px, gy, sz + 0.05);
    placeReadable(scene, signBoard('THE INNER GATE', 'Proof of standing only: 20,000 gold shown, noble papers, or a pass', { bg: '#2a1a0e' }), { x: sx, y: gy + 2.05, z: sz - 0.08, w: 5, h: 1.25, title: 'The Inner Gate' });
    addCollider(sx - 2.5, sx + 2.5, sz - 0.2, sz + 0.3);
  }

  // The market in the middle ring: stalls either side of the avenue.
  const kinds = ['harbor', 'western', 'luxury', 'harbor', 'western'];
  for (const row of [150, 162]) for (const x of [-34, -26, -18, 18, 26, 34]) {
    const y = groundHeight(x, row);
    scene.userData.marketStalls.push({ x, y, z: row, ry: 0, color: pick(rng, ['#2f6c8e', '#b8382b', '#5a8a3a', '#d7a33a', '#7a4ab0']) });
    addCollider(x - 2.2, x + 2.2, row - 1.6, row - 0.2);
    const n = scene.userData.stalls.length;
    scene.userData.stalls.push({ x, z: row + 0.4, id: `m-stall-${n}`, kind: kinds[n % kinds.length] });
  }
  // Your pop-up stand on the quay (a stall of your own: meridia/life.js sells from it).
  scene.userData.marketStalls.push({ x: SPOTS.popup.x, y: groundHeight(SPOTS.popup.x, SPOTS.popup.z), z: SPOTS.popup.z, ry: 0, color: '#4b1f6b' });
  addCollider(SPOTS.popup.x - 2.2, SPOTS.popup.x + 2.2, SPOTS.popup.z - 1.6, SPOTS.popup.z - 0.2);
  // Street lamps up the avenue and along the quay; trees on the terraces.
  const lamps = scene.userData.streetLamps = [];
  for (let z = 40; z < C.z - 30; z += 16) for (const s of [-1, 1]) {
    const x = s * 7, zz = z + (s > 0 ? 8 : 0);
    if (colliders.some(c => x > c.x0 - 1 && x < c.x1 + 1 && zz > c.z0 - 1 && zz < c.z1 + 1)) continue;
    lamps.push({ x, y: groundHeight(x, zz), z: zz, ry: s > 0 ? Math.PI / 2 : -Math.PI / 2 });
    addCollider(x - 0.25, x + 0.25, zz - 0.25, zz + 0.25);
  }
  for (let x = -190; x <= 190; x += 20) if (!PIERS.some(p => Math.abs(x - p.x) < p.w / 2 + 2.5) && Math.abs(x) > 4) { lamps.push({ x, y: groundHeight(x, 2.4), z: 2.4, ry: Math.PI }); addCollider(x - 0.25, x + 0.25, 2.15, 2.65); }
  for (let i = 0; i < 160; i++) {
    const x = range(rng, -300, 300), z = range(rng, 30, 420);
    const r = Math.hypot(x - C.x, z - C.z);
    if (r < R_OUT + 6 && rng() < 0.75) continue;
    if (z < QUAY_DEPTH + 8 || !clear(x, z, 3) || colliders.some(c => x > c.x0 - 2 && x < c.x1 + 2 && z > c.z0 - 2 && z < c.z1 + 2)) continue;
    plants.bushes.push({ x, y: groundHeight(x, z), z, s: range(rng, 1.4, 2.6), bloom: false, ry: rng() * 6, color: pick(rng, ['#4a7a34', '#58873a', '#3f6a2e']) });
  }

  // Merge and add everything.
  for (const [k, list] of Object.entries(parts)) {
    const geo = mergeGeometries(list.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; }));
    const m = new THREE.Mesh(geo, mats[k]);
    m.castShadow = k !== 'window' && k !== 'door';
    m.receiveShadow = true;
    scene.add(m);
  }
  return SPOTS;
}
export { readables };
