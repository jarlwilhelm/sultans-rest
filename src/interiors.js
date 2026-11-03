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
// Lavine's own models, built in Blender (tools/blender/*.py) at real size with materials named by what
// they are; prop() dresses them in the city's own textured materials (see dress()).
const LAVINE = ['tavern_room', 'tavern_tabletop', 'ale_room', 'guild_merchants', 'guild_transmuters', 'guild_adventurers', 'guild_mariners',
  'stall', 'hut_room', 'store_small_room', 'store_big_room', 'ship_hull', 'market_stall', 'palace_hall', 'palace_fountain',
  'palm', 'bush_green', 'bush_flower', 'shrub_dry'];
const propDir = (n) => LAVINE.includes(n) ? 'assets/lavine' : 'assets/quaternius/props';
const props = {};
export async function loadProps() {
  const loader = new GLTFLoader();
  await Promise.all([...PROPS, ...LAVINE].map(async (n) => {
    const g = await loader.loadAsync(`${propDir(n)}/${n}.glb`);
    g.scene.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g.scene);
    if (LAVINE.includes(n)) dress(g.scene);
    props[n] = { scene: g.scene, box: b, size: b.getSize(new THREE.Vector3()), lavine: LAVINE.includes(n) };
  }));
}

// Materials by name -> the city's materials (shared, so a room of a thousand pieces stays cheap).
// A cluster of leaves, drawn once: pointed leaves with a midrib, lighter toward the tips, transparent around them.
function leafTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 11; i++) {
    const x = 20 + r() * 88, y = 20 + r() * 88, a = r() * Math.PI * 2, len = 30 + r() * 22, w = len * 0.32;
    g.save(); g.translate(x, y); g.rotate(a);
    const grad = g.createLinearGradient(0, 0, len, 0);
    const v = 0.75 + r() * 0.25;
    grad.addColorStop(0, `rgb(${150 * v | 0},${190 * v | 0},${130 * v | 0})`); grad.addColorStop(1, `rgb(${215 * v | 0},${240 * v | 0},${185 * v | 0})`);
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.45, -w, len, 0); g.quadraticCurveTo(len * 0.45, w, 0, 0); g.fill();
    g.strokeStyle = 'rgba(70,90,50,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(1, 0); g.lineTo(len * 0.92, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const DRESS = (() => {
  const woodTex = (color, tile = 1.2) => { const m = surface('weathered_brown_planks', { tile, detail: 0.75 }); m.color.set(color); return m; };
  const metal = (color, metalness, roughness) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const glass = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, transparent: true, opacity: 0.78, clearcoat: 1 });
  const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });   // brighter than white: it glows
  const stone = surface('sandstone_blocks_05', { tile: 1.4, detail: 0.75 }); stone.color.set('#d8c8a6');
  return {
    Wood: woodTex('#b58a5c'), DarkWood: woodTex('#6e4a2c'), Stone: stone,
    Soot: new THREE.MeshStandardMaterial({ color: '#1a1512', roughness: 1 }),
    Brass: metal('#d9a441', 0.9, 0.32), Iron: metal('#2c2b2b', 0.7, 0.55), Pewter: metal('#8e9196', 0.85, 0.38), Gold: metal('#e0b347', 0.95, 0.25),
    GlassGreen: glass('#2f7a3a'), GlassBrown: glass('#7a3c12'), GlassClear: glass('#dfe8e0'), GlassBlue: glass('#2c5aa0'),
    Wax: new THREE.MeshStandardMaterial({ color: '#efe2c0', roughness: 0.7 }),
    Fire: glow(2.2, 1.3, 0.45), Ember: glow(1.8, 0.45, 0.12), Potion: glow(0.5, 1.6, 0.6), Ward: glow(1.3, 0.75, 2.0),
    Leaf: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, side: THREE.DoubleSide }),   // tinted per copy
    LeafCore: new THREE.MeshStandardMaterial({ color: '#6f7d62', roughness: 0.9 }),          // the shade inside a bush; tinted too
    LeafCard: new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.5, roughness: 0.7, side: THREE.DoubleSide }),   // tinted per copy
    Flower: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),                          // tinted per copy
    Bark: new THREE.MeshStandardMaterial({ color: '#6e5640', roughness: 1 }),
    Marble: new THREE.MeshStandardMaterial({ color: '#eee6d8', roughness: 0.3, metalness: 0.02 }),
    Water: new THREE.MeshPhysicalMaterial({ color: '#4aa6b4', roughness: 0.05, transparent: true, opacity: 0.7, clearcoat: 1 }),
    Awning: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, side: THREE.DoubleSide }),   // tinted per copy
    Window: glow(1.2, 1.18, 1.05),        // daylight through the glass; main.js dims it at night (windowLight)
  };
})();
function dress(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.material = DRESS[o.material.name] || Object.assign(o.material, { roughness: 0.85 });
    o.castShadow = o.receiveShadow = true;
  });
}
// Place a prop standing on y, sized so its height is `h` metres (or its longest side is `len`).
// Lavine's own models keep their size and origin (they're built to fit where they go).
export function prop(scene, name, x, y, z, { h, len, ry = 0, tint } = {}) {
  const p = props[name];
  if (!p) return null;
  const o = p.scene.clone(true);
  const s = h ? h / p.size.y : len ? len / Math.max(p.size.x, p.size.z) : 1;
  const wrap = new THREE.Group();
  o.scale.multiplyScalar(s);
  if (!p.lavine) o.position.set(-(p.box.min.x + p.size.x / 2) * s, -p.box.min.y * s, -(p.box.min.z + p.size.z / 2) * s);
  wrap.add(o);
  wrap.position.set(x, y, z);
  wrap.rotation.y = ry;
  wrap.traverse(m => {
    if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    if (tint) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(tint)); }
    if (p.lavine) m.castShadow = m.material !== DRESS.Fire && m.material !== DRESS.Ember;
  });
  scene.add(wrap);
  return wrap;
}

// Many copies of one model drawn together (one draw per material for all of them), e.g. the market's stalls.
// list: [{ x, y, z, ry, rx, rz, s, color, flower }]: color tints the copy's 'Awning' and 'Leaf' parts, flower its 'Flower'.
export function instanced(scene, name, list) {
  const p = props[name];
  if (!p || !list?.length) return false;
  p.scene.updateMatrixWorld(true);
  const place = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  p.scene.traverse(m => {
    if (!m.isMesh) return;
    const im = new THREE.InstancedMesh(m.geometry, m.material, list.length);
    list.forEach((s, i) => {
      q.setFromEuler(new THREE.Euler(s.rx || 0, s.ry || 0, s.rz || 0, 'YXZ'));
      place.compose(new THREE.Vector3(s.x, s.y, s.z), q, one.set(s.s || 1, s.s || 1, s.s || 1)).multiply(m.matrixWorld);
      im.setMatrixAt(i, place);
      if (m.material === DRESS.Awning || m.material === DRESS.Leaf || m.material === DRESS.LeafCard || m.material === DRESS.LeafCore) im.setColorAt(i, new THREE.Color(s.color || '#ffffff'));
      else if (m.material === DRESS.Flower) im.setColorAt(i, new THREE.Color(s.flower || '#ffffff'));
    });
    im.castShadow = m.material !== DRESS.Fire;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    scene.add(im);
  });
  return true;
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
  s.position.set(x, y, z); s.scale.set(size, size, 1); s.userData.size = size;
  scene.add(s);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color }));
  bulb.position.set(x, y, z); scene.add(bulb);
  scene.userData.flames?.push(s);
  return s;
}

export { wood, placeReadable, signBoard, readables };

// Indoor windows show the time of day: bright sky by day, deep blue at night (minute = minutes past midnight).
const DAY = new THREE.Color(1.2, 1.18, 1.05), NIGHT = new THREE.Color(0.05, 0.07, 0.16), DUSK = new THREE.Color(1.1, 0.6, 0.35);
export function windowLight(minute) {
  const h = minute / 60, s = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  const day = s(5.5, 7.5, h) * (1 - s(18.5, 20.5, h));
  const dusk = Math.max(0, 1 - Math.abs(h - 19.2) / 1.2) + Math.max(0, 1 - Math.abs(h - 6.3) / 1.0);
  DRESS.Window.color.copy(NIGHT).lerp(DAY, day).lerp(DUSK, Math.min(0.5, dusk * 0.5));
}

// Switch a shell's walls solid or not (for buildings that are only sometimes there, like your plot's).
export function setShellActive(shell, on) {
  shell.active = on;
  for (const { c, saved } of shell.cols) Object.assign(c, on ? saved : { x0: 0, x1: 0, z0: 0, z1: 0 });
}
