// The ground of Sultan's Rest: the sea to the south (z < 0), the quay and market by the water,
// and the city climbing inland (z grows) until it fades into the desert.
import * as THREE from 'three';
import { fbm, clamp, smooth } from './noise.js';
import { groundMaterial, surface } from './look.js';

export const CITY_HALF = 186;          // the city's quay runs from x = -186 to 186, wall to wall
export const CITY_WALL = { x: 189, z: 296 };   // walls on the west, east (x = ±189) and desert (z = 296) sides
// The palace grounds: a raised platform out over the water plus walled gardens inland.
export const PALACE = { x0: 95, x1: 175, z0: -75, z1: 42, y: 3 };
export const PALACE_GATE = { x: 95, z: 18 };
export const QUAY_Y = 1.5;
export const QUAY_DEPTH = 30;          // flat stone quay + market, z 0..30

// Piers that stick out into the harbor (z from 0 down to z0).
export const PIERS = [
  { x: -140, w: 6, z0: -46 },
  { x: -95, w: 6, z0: -52 },
  { x: -50, w: 6, z0: -46 },
  { x: 0, w: 11, z0: -62 },            // the Grand Pier at the end of the main avenue
  { x: 48, w: 6, z0: -50 },
];

// Everything solid the player and the people bump into: boxes on the ground (x0..x1, z0..z1).
export const colliders = [];
export function addCollider(x0, x1, z0, z1) {
  colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
}

// How rich a street is: 1 by the water, 0 at the edge of the desert.
export const wealth = (z) => clamp(1 - (z - 35) / 230, 0, 1);

const inPalace = (x, z) => x > PALACE.x0 && x < PALACE.x1 && z > PALACE.z0 && z < PALACE.z1;

export function groundHeight(x, z) {
  if (inPalace(x, z)) return PALACE.y;
  // A ramp up to the palace gate.
  if (x > PALACE_GATE.x - 9 && x <= PALACE.x0 && Math.abs(z - PALACE_GATE.z) < 5) {
    return QUAY_Y + (PALACE.y - QUAY_Y) * smooth(PALACE_GATE.x - 9, PALACE.x0, x);
  }
  const ax = Math.abs(x);
  let h;
  if (ax <= CITY_HALF) {
    if (z < 0) return -4;                      // harbor floor below the quay wall
    if (z < QUAY_DEPTH) h = QUAY_Y;
    else h = QUAY_Y + (z - QUAY_DEPTH) * 0.085 + (fbm(x * 0.02, z * 0.02) - 0.5) * 3 * smooth(QUAY_DEPTH, 80, z);
  } else {
    // Outside the city walls the coast is an open sand beach.
    const beach = clamp(-4 + (z + 16) * 0.35, -4, QUAY_Y);
    const inland = QUAY_Y + Math.max(0, z - QUAY_DEPTH) * 0.085;
    h = z < QUAY_DEPTH ? beach : inland;
    h += (fbm(x * 0.02, z * 0.02) - 0.5) * 3 * smooth(-5, 40, z);
    if (ax < CITY_HALF + 10) h = Math.max(h, z < 0 ? h : QUAY_Y);
  }
  // Dunes rise around the city: east, west and behind it.
  h += smooth(215, 290, ax) * (8 + fbm(x * 0.03, z * 0.03) * 14);
  h += smooth(280, 350, z) * (6 + fbm(x * 0.025, z * 0.025) * 14);
  return h;
}

export function onPier(x, z) {
  return PIERS.some(p => Math.abs(x - p.x) < p.w / 2 && z <= 0.5 && z >= p.z0);
}

// Raised floors you can stand on (like the dais in the throne hall): x0, x1, z0, z1, y.
export const floors = [];
export function addFloor(x0, x1, z0, z1, y) { floors.push({ x0, x1, z0, z1, y }); }

// Height under someone's feet (piers and raised floors count as ground).
export function footHeight(x, z) {
  let h = onPier(x, z) ? QUAY_Y : groundHeight(x, z);
  for (const f of floors) if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) h = Math.max(h, f.y);
  return h;
}

export function walkable(x, z, r = 0.35) {
  if (Math.abs(x) > 285 || z > 345 || z < -70) return false;
  if (onPier(x, z)) return true;
  if (groundHeight(x, z) < 0.6) return false;   // that's water
  for (const c of colliders) {
    if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return false;
  }
  return true;
}

const SAND = new THREE.Color('#dcbc8c');
const SAND_DARK = new THREE.Color('#c79f6c');
const STONE = new THREE.Color('#d6c6a6');
const GRASS = new THREE.Color('#86a04c');
const WET = new THREE.Color('#9c8462');

export function buildLand(scene) {
  const W = 600, D = 420, SX = 300, SZ = 210;
  const geo = new THREE.PlaneGeometry(W, D, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, D / 2 - 50);            // covers z = -50 .. 370
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const paved = new Float32Array(pos.count);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = groundHeight(x, z);
    pos.setY(i, h);
    const n = fbm(x * 0.08, z * 0.08);
    c.copy(SAND).lerp(SAND_DARK, n);
    const ax = Math.abs(x);
    const avenue = Math.abs(x) < 7 && z >= QUAY_DEPTH && z < 300;
    const palaceYard = x > PALACE.x0 && x < PALACE.x1 && z >= -15 && z < PALACE.z1;
    if ((ax < CITY_HALF && z >= 0 && z < QUAY_DEPTH) || avenue || palaceYard) {
      // Paved: the quay and market, the main avenue, the palace courtyard.
      c.copy(STONE).multiplyScalar(0.97 + (n - 0.5) * 0.08);
      if (palaceYard) c.lerp(new THREE.Color('#efe6d4'), 0.5);
      paved[i] = 1;
    } else if (h < 1.2) {
      c.lerp(WET, smooth(1.2, -1, h));
    } else {
      // Green gardens get rarer the further you are from the water.
      const green = smooth(0.52, 0.68, fbm(x * 0.045 + 7, z * 0.045)) * wealth(z) * smooth(QUAY_DEPTH, 45, z) * (ax < CITY_HALF + 20 ? 1 : 0);
      c.lerp(GRASS, green * 0.85);
    }
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('paved', new THREE.BufferAttribute(paved, 1));
  geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, groundMaterial());
  land.receiveShadow = true;
  scene.add(land);

  const stoneMat = surface('sandstone_blocks_05', { tile: 3, detail: 0.7 });
  stoneMat.color.set('#d8c8a6');
  const woodMat = surface('weathered_brown_planks', { tile: 2.5, detail: 0.75 });
  woodMat.color.set('#c9a578');
  const postMat = surface('weathered_brown_planks', { tile: 1.5, detail: 0.6 });
  postMat.color.set('#6e5038');

  // Quay wall along the water (stops at the palace, which has its own walls).
  const wall = new THREE.Mesh(new THREE.BoxGeometry(PALACE.x0 + CITY_HALF, 6, 1.2), stoneMat);
  wall.position.set((PALACE.x0 - CITY_HALF) / 2, QUAY_Y - 3, -0.6);
  wall.receiveShadow = true;
  scene.add(wall);
  const lipMat = surface('sandstone_blocks_05', { tile: 2, detail: 0.6 }); lipMat.color.set('#e8dcc2');
  const lip = new THREE.Mesh(new THREE.BoxGeometry(PALACE.x0 + CITY_HALF, 0.3, 1.6), lipMat);
  lip.position.set(wall.position.x, QUAY_Y + 0.05, -0.6);
  scene.add(lip);
  // The short stretch of quay wall between the palace and the west city wall.
  const east = new THREE.Mesh(new THREE.BoxGeometry(CITY_HALF - PALACE.x1, 6, 1.2), stoneMat);
  east.position.set((CITY_HALF + PALACE.x1) / 2, QUAY_Y - 3, -0.6);
  scene.add(east);

  // Wooden piers on posts, each with mooring bollards.
  const bollardGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.7, 8);
  for (const p of PIERS) {
    const len = -p.z0;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.4, len), woodMat);
    deck.position.set(p.x, QUAY_Y - 0.2, p.z0 / 2);
    deck.castShadow = deck.receiveShadow = true;
    scene.add(deck);
    for (let z = -4; z > p.z0; z -= 6) {
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 6), postMat);
        post.position.set(p.x + side * (p.w / 2 - 0.3), QUAY_Y - 3, z);
        scene.add(post);
        const b = new THREE.Mesh(bollardGeo, postMat);
        b.position.set(p.x + side * (p.w / 2 - 0.4), QUAY_Y + 0.35, z);
        scene.add(b);
      }
    }
  }
  return land;
}

// Rocks and grass tufts scattered over the open ground: green in the gardens near the water,
// dry straw in the sand, rocks outside the walls and in the poor streets. Never on paving or in buildings.
export function scatterGround(scene) {
  const rnd = (() => { let a = 99173; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
  const paved = (x, z) => (Math.abs(x) < CITY_HALF && z >= 0 && z < QUAY_DEPTH) || (Math.abs(x) < 7 && z >= QUAY_DEPTH && z < 300) || inPalace(x, z);
  const greenAt = (x, z) => smooth(0.52, 0.68, fbm(x * 0.045 + 7, z * 0.045)) * wealth(z) * smooth(QUAY_DEPTH, 45, z) * (Math.abs(x) < CITY_HALF + 20 ? 1 : 0);
  // A tuft: blades drawn on a canvas, on two crossed planes.
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x0 = 16 + rnd() * 32, lean = (rnd() - 0.5) * 30, h = 30 + rnd() * 32;
    g.strokeStyle = `rgba(${200 + rnd() * 55},${200 + rnd() * 55},${180 + rnd() * 40},1)`; g.lineWidth = 1.5 + rnd() * 1.5;
    g.beginPath(); g.moveTo(x0, 64); g.quadraticCurveTo(x0 + lean * 0.3, 64 - h * 0.6, x0 + lean, 64 - h); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const a = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), b = a.clone().rotateY(Math.PI / 2);
  const tuftGeo = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const arr = new Float32Array([...a.attributes[k].array, ...b.attributes[k].array]);
    tuftGeo.setAttribute(k, new THREE.BufferAttribute(arr, a.attributes[k].itemSize));
  }
  tuftGeo.setIndex([...a.index.array, ...b.index.array.map(i => i + a.attributes.position.count)]);
  // Pointing every blade's normal up lights tufts like the ground they stand on (no dark backsides).
  const nrm = tuftGeo.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  const tuftMat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
  const tufts = [], rocks = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < 9000 && tufts.length < 2600; i++) {
    const x = (rnd() - 0.5) * 560, z = -10 + rnd() * 360;
    const h = groundHeight(x, z);
    if (h < 0.9 || paved(x, z) || !walkable(x, z, 0.9)) continue;
    const green = greenAt(x, z);
    if (green < 0.3 && rnd() < 0.55) continue;        // dry tufts are sparser
    const s = green > 0.3 ? 0.5 + rnd() * 0.5 : 0.35 + rnd() * 0.45;
    m.compose(v.set(x, h - 0.03, z), q.setFromEuler(e.set(0, rnd() * 3, 0)), sc.set(s * (0.8 + rnd() * 0.6), s, s));
    tufts.push([m.clone(), green > 0.3 ? new THREE.Color().setHSL(0.24 + rnd() * 0.05, 0.45, 0.32 + rnd() * 0.1) : new THREE.Color().setHSL(0.11 + rnd() * 0.03, 0.4, 0.55 + rnd() * 0.12)]);
  }
  for (let i = 0; i < 6000 && rocks.length < 420; i++) {
    const x = (rnd() - 0.5) * 560, z = -10 + rnd() * 360;
    const outside = Math.abs(x) > CITY_HALF + 4 || z > CITY_WALL.z + 3;
    if (!outside && (z < 190 || rnd() < 0.7)) continue;  // inside the walls only a few, in the poor streets
    const h = groundHeight(x, z);
    if (h < -0.5 || paved(x, z) || (!outside && !walkable(x, z, 1.2))) continue;
    const s = outside ? 0.25 + rnd() ** 2 * 1.4 : 0.15 + rnd() * 0.35;
    m.compose(v.set(x, h - s * 0.25, z), q.setFromEuler(e.set(rnd() * 0.4, rnd() * 6, rnd() * 0.4)), sc.set(s * (1 + rnd()), s * (0.5 + rnd() * 0.4), s * (1 + rnd())));
    rocks.push([m.clone(), new THREE.Color().setHSL(0.09 + rnd() * 0.03, 0.25, 0.55 + rnd() * 0.15)]);
  }
  const place = (geo, mat, list, shadows) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([mm, col], i) => { im.setMatrixAt(i, mm); im.setColorAt(i, col); });
    im.castShadow = shadows; im.receiveShadow = true;
    im.computeBoundingSphere();
    scene.add(im);
  };
  place(tuftGeo, tuftMat, tufts, false);
  place(new THREE.DodecahedronGeometry(1, 0), surface('sandstone_blocks_05', { tile: 1.5, detail: 0.8 }), rocks, true);
}
