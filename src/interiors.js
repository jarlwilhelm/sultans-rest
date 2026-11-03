// Buildings you can walk into. Each is a hollow shell (walls with a door, floor, ceiling) with
// furniture inside. Some doors are locked until you reach a level; a locked door says which.
// Furniture is Quaternius' house interior, medieval village and crops packs (CC0).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { groundHeight, colliders, addFloor } from './land.js';
import { surface } from './look.js';
import { glowTextureCanvas, placeReadable, signBoard, readables } from './signs.js';
import { addRoom, doorways } from './rooms.js';

// ---------- Props ----------
const PROPS = ['Lettuce_4', 'Lettuce_Harvested', 'Barrel', 'Crate', 'Bags', 'Bench_1', 'Fence', 'Cart', 'Bed_Single', 'Table_RoundSmall',
  'Table_RoundLarge', 'Chair_1', 'Stool', 'Shelf_Large', 'Bookshelf', 'Kitchen_Cabinet1', 'Houseplant_2',
  'Apple_Harvested', 'Orange_Harvested', 'Carrot_4', 'Pumpkin_Harvested', 'Watermelon_Harvested', 'Tomato_Harvested', 'Mushroom_Harvested',
  'BushBerries_Harvested', 'Coconut_Half', 'Corn_Harvested', 'Potion1_Filled', 'Potion3_Filled', 'Potion6_Filled', 'Potion2_Empty', 'Chest_Closed',
  'Chest_Ingots', 'Chalice', 'Necklace1', 'Book1_Closed', 'Scroll', 'Pouch', 'Coin', 'Crystal1', 'Gold_Ingots', 'Pot', 'Pot_Small', 'Pan', 'WoodLog', 'Plate_1', 'Carpet_1', 'Carpet_2', 'Carpet_Round', 'Sword', 'Dagger', 'Crown2', 'Key1', 'Torch', 'Skull'];
const props = {};
export async function loadProps() {
  const loader = new GLTFLoader();
  await Promise.all(PROPS.map(async (n) => {
    const g = await loader.loadAsync(`assets/quaternius/props/${n}.glb`);
    g.scene.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g.scene);
    props[n] = { scene: g.scene, box: b, size: b.getSize(new THREE.Vector3()) };
  }));
}
// Place a prop standing on y, sized so its height is `h` metres (or its longest side is `len`).
export function prop(scene, name, x, y, z, { h, len, ry = 0, tint } = {}) {
  const p = props[name];
  if (!p) return null;
  const o = p.scene.clone(true);
  const s = h ? h / p.size.y : len ? len / Math.max(p.size.x, p.size.z) : 1;
  const wrap = new THREE.Group();
  o.scale.multiplyScalar(s);
  o.position.set(-(p.box.min.x + p.size.x / 2) * s, -p.box.min.y * s, -(p.box.min.z + p.size.z / 2) * s);
  wrap.add(o);
  wrap.position.set(x, y, z);
  wrap.rotation.y = ry;
  wrap.traverse(m => {
    if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    if (tint) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(tint)); }
  });
  scene.add(wrap);
  return wrap;
}

// ---------- Shells ----------
const plaster = surface('plastered_wall', { tile: 3.5, detail: 0.6, normal: 0.7 });
const wood = surface('weathered_brown_planks', { tile: 1.6, detail: 0.7 }); wood.color.set('#a8845a');
const floorWood = surface('weathered_brown_planks', { tile: 2, detail: 0.6 }); floorWood.color.set('#b08a62');
const matFor = (color) => { const m = plaster.clone(); m.onBeforeCompile = plaster.onBeforeCompile; m.customProgramCacheKey = plaster.customProgramCacheKey; m.color.set(color); return m; };

// A hollow box building. Front faces the sea (-z) unless facing = 'north'. Returns its inside info.
export function hollow(scene, { x, z, w, d, h, color = '#efe4cf', doorW = 1.6, doorH = 2.6, backDoor = false, lockLevel = 0, name = '', floor = floorWood, roof = true, doorColor = '#5a3a20' }) {
  const t = 0.35;
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  let gMax = -Infinity, gMin = Infinity;
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [x, z]]) { const g = groundHeight(px, pz); gMax = Math.max(gMax, g); gMin = Math.min(gMin, g); }
  const fy = gMax + 0.05;                 // the floor
  const base = gMin - 0.6;
  const wallMat = matFor(color);
  const cols = [];
  const add = (bx0, bx1, bz0, bz1, y0, y1, mat = wallMat, collide = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bx1 - bx0, y1 - y0, bz1 - bz0), mat);
    m.position.set((bx0 + bx1) / 2, (y0 + y1) / 2, (bz0 + bz1) / 2);
    m.castShadow = m.receiveShadow = true;
    m.userData.keep = true;                // the building's walls stay up, inside and out
    scene.add(m);
    if (collide) { const c = { x0: bx0, x1: bx1, z0: bz0, z1: bz1 }; colliders.push(c); cols.push(c); }
    return m;
  };
  const top = fy + h;
  // Front wall with a door in the middle.
  add(x0, x - doorW / 2, z0, z0 + t, base, top);
  add(x + doorW / 2, x1, z0, z0 + t, base, top);
  add(x - doorW / 2, x + doorW / 2, z0, z0 + t, fy + doorH, top, wallMat, false);
  add(x - doorW / 2, x + doorW / 2, z0 - 0.4, z0 + t, base, fy, wallMat, false);   // a threshold step
  // Back wall (with an optional door to a yard).
  if (backDoor) {
    add(x0, x - doorW / 2, z1 - t, z1, base, top);
    add(x + doorW / 2, x1, z1 - t, z1, base, top);
    add(x - doorW / 2, x + doorW / 2, z1 - t, z1, fy + doorH, top, wallMat, false);
    add(x - doorW / 2, x + doorW / 2, z1 - t, z1 + 0.4, base, fy, wallMat, false);
  } else add(x0, x1, z1 - t, z1, base, top);
  add(x0, x0 + t, z0, z1, base, top);
  add(x1 - t, x1, z0, z1, base, top);
  // Floor, ceiling, roof.
  const fl = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * t, 0.12, d - 2 * t), floor);
  fl.position.set(x, fy - 0.06, z); fl.receiveShadow = true; scene.add(fl);
  addFloor(x0 + t, x1 - t, z0 - 0.4, z1 - t, fy);
  if (roof) {
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * t, d - 2 * t), new THREE.MeshStandardMaterial({ color: '#d8c8a8', roughness: 1, side: THREE.DoubleSide }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(x, top - 0.02, z); scene.add(ceil);
    add(x0 - 0.2, x1 + 0.2, z0 - 0.2, z1 + 0.2, top, top + 0.35, wallMat, false);
  }
  // Windows: dark panes on the outside (they glow at night like the rest of the city's).
  const win = scene.userData.windowMat;
  if (win) for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.06), win);
    m.position.set(x + sx * w / 3.2, fy + 1.6, z0 - 0.03); m.userData.keep = true; scene.add(m);
  }
  // The doors: plank doors on hinges. They stay shut; E opens one and takes you through (rooms.js).
  const room = addRoom({ name, parent: scene, box: { x0: x0 + t, x1: x1 - t, z0: z0 + t, z1: z1 - t, y0: fy - 1, y1: top }, shell: null });
  const doorMat = new THREE.MeshStandardMaterial({ color: doorColor, roughness: 0.8 });
  const makeDoor = (dz, way, out, inn) => {
    const hinge = new THREE.Group();
    hinge.position.set(x - doorW / 2, fy, dz);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), doorMat);
    leaf.position.set(doorW / 2, doorH / 2, 0);
    leaf.castShadow = true;
    hinge.add(leaf);
    hinge.userData.keep = true;
    scene.add(hinge);
    const c = { x0: x - doorW / 2, x1: x + doorW / 2, z0: dz - t / 2, z1: dz + t / 2 };
    colliders.push(c); cols.push(c);        // (switched off with the walls for shop buildings you don't own)
    const d = { name, level: lockLevel, room, out, in: inn, swing: (k) => { hinge.rotation.y = way * 1.4 * Math.sin(k * Math.PI / 2); } };
    doorways.push(d);
    return d;
  };
  const front = makeDoor(z0 + t / 2, -1, { x, z: z0 - 1.2, yaw: 0 }, { x, z: z0 + t + 1.0, yaw: Math.PI });
  if (backDoor) makeDoor(z1 - t / 2, 1, { x, z: z1 + 1.2, yaw: Math.PI, back: true }, { x, z: z1 - t - 1.0, yaw: 0, back: true });
  const inside = { x, z, w, d, fy, top, x0: x0 + t, x1: x1 - t, z0: z0 + t, z1: z1 - t, door: front, room, cols: cols.map(c => ({ c, saved: { ...c } })) };
  room.shell = inside;
  return inside;
}

// ---------- Lights ----------
const glowTex = new THREE.CanvasTexture(glowTextureCanvas());
export function lamp(scene, x, y, z, color = '#ffd38a', size = 1.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.set(x, y, z); s.scale.set(size, size, 1);
  scene.add(s);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color }));
  bulb.position.set(x, y, z); scene.add(bulb);
  scene.userData.flames?.push(s);
  return s;
}

export { wood, placeReadable, signBoard, readables };

// Switch a shell's walls solid or not (for buildings that are only sometimes there, like your plot's).
export function setShellActive(shell, on) {
  shell.active = on;
  for (const { c, saved } of shell.cols) Object.assign(c, on ? saved : { x0: 0, x1: 0, z0: 0, z1: 0 });
}
