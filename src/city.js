// The city of Sultan's Rest: grander, cleaner and greener the closer you get to the water;
// smaller, plainer and more worn toward the desert. Plus the guild halls, the market,
// the statue of King Shou and the palace on the water.
import * as THREE from 'three';
import { Batch, SHAPES } from './batch.js';
import { surface } from './look.js';
import { makeRng, pick, range } from './noise.js';
import { groundHeight, wealth, addCollider, addFloor, PALACE, PALACE_GATE, CITY_WALL, QUAY_Y, QUAY_DEPTH } from './land.js';
import { signBoard, banner, placeReadable, glowTextureCanvas, canvasTexture } from './signs.js';
import { noticeBoard, wallPoster } from './posters.js';
import { hollow } from './interiors.js';

const rng = makeRng(1234);

const mat = new THREE.MeshStandardMaterial({ roughness: 0.88 });
const plaster = surface('plastered_wall', { tile: 3.5, detail: 0.75, normal: 0.9, weather: true });
const stone = surface('sandstone_blocks_05', { tile: 3, detail: 0.75, weather: true });
const stoneRound = surface('sandstone_blocks_05', { tile: 3, detail: 0.75, weather: true, round: true });
const woodRound = surface('weathered_brown_planks', { tile: 1.6, detail: 0.7, round: true });
const wood = surface('weathered_brown_planks', { tile: 1.6, detail: 0.7 });
const shinyMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.6 });
const clothMat = new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide });
const B = {
  box: new Batch(SHAPES.box, plaster),
  stone: new Batch(SHAPES.box, stone),
  stoneCyl: new Batch(SHAPES.cyl, stoneRound),
  wood: new Batch(SHAPES.box, wood),
  woodCyl: new Batch(SHAPES.cyl, woodRound),
  cyl: new Batch(SHAPES.cyl, mat),
  cone: new Batch(SHAPES.cone, mat),
  ball: new Batch(SHAPES.ball, mat),
  dome: new Batch(SHAPES.dome, shinyMat),
  onion: new Batch(SHAPES.onion, shinyMat),
  leaf: new Batch(SHAPES.leaf, clothMat),
  cloth: new Batch(SHAPES.box, clothMat),
  // Windows and doors; they light up warmly at night (see daylight.js).
  dark: new Batch(SHAPES.box, new THREE.MeshStandardMaterial({ roughness: 1, emissive: '#ffb45a', emissiveIntensity: 0 }), { shadows: false }),
};

const RICH_WALLS = ['#f4ede0', '#efe4cf', '#f1e6d6', '#e9dcc3', '#f6efe6'];
const MID_WALLS = ['#e2cfa9', '#dcc499', '#d8c095', '#e6d3ad'];
const POOR_WALLS = ['#b99a6c', '#ab8b5f', '#a6875c', '#bfa071', '#9d7f56'];
const DOMES = ['#d9b24a', '#2f9c9a', '#3a8fb0', '#f0ece2', '#d9b24a', '#2f9c9a'];
const AWNINGS = ['#b8382b', '#2e6c8e', '#d7a33a', '#5f8a3a', '#8e3b6c', '#e9e2cf', '#c96b2c'];
const GOLD = '#e0b347', WHITE = '#f3ede0', TEAL = '#2f9c9a';

const lowest = (x, z, w, d) => Math.min(
  groundHeight(x - w / 2, z - d / 2), groundHeight(x + w / 2, z - d / 2),
  groundHeight(x - w / 2, z + d / 2), groundHeight(x + w / 2, z + d / 2)) - 0.3;

// ---------- Plants ----------
export function palm(x, z, scale = 1) {
  const y = groundHeight(x, z);
  const lean = range(rng, -0.25, 0.25), dir = range(rng, 0, Math.PI * 2);
  const h = range(rng, 6, 9) * scale;
  let px = x, pz = z, py = y;
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const t = (i + 1) / segs;
    const nx = x + Math.cos(dir) * lean * h * t * t, nz = z + Math.sin(dir) * lean * h * t * t;
    const ny = y + h * t;
    const m = new THREE.Matrix4();
    const from = new THREE.Vector3(px, py, pz), to = new THREE.Vector3(nx, ny, nz);
    const len = from.distanceTo(to);
    const qn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    const r = 0.28 * scale * (1 - t * 0.35);
    m.compose(from, qn, new THREE.Vector3(r, len, r));
    B.cyl.addMatrix(m, i % 2 ? '#7d6243' : '#8d7150');
    px = nx; pz = nz; py = ny;
  }
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + range(rng, -0.2, 0.2);
    B.leaf.add(px, py, pz, range(rng, 3.2, 4.4) * scale, 1, 1.7 * scale, pick(rng, ['#4f7d2c', '#5c8a30', '#46722a']), a, 0, -range(rng, 0.25, 0.6));
  }
  B.ball.add(px, py - 0.3, pz, 0.28 * scale, 0.28 * scale, 0.28 * scale, '#6a4a22');
  addCollider(x - 0.35, x + 0.35, z - 0.35, z + 0.35);
}

function bush(x, z, s = 1, color) {
  const y = groundHeight(x, z);
  B.ball.add(x, y + 0.5 * s, z, 0.9 * s, 0.7 * s, 0.9 * s, color || pick(rng, ['#5f8a34', '#6b9440', '#527a2e', '#7aa04a']));
}

function dryShrub(x, z) {
  const y = groundHeight(x, z);
  B.ball.add(x, y + 0.2, z, 0.5, 0.3, 0.5, pick(rng, ['#8f8150', '#7d6f45', '#9a8a58']));
}

// ---------- Houses ----------
function building(x, z, w, d, rich) {
  const base = lowest(x, z, w, d);
  const top = Math.max(groundHeight(x - w / 2, z - d / 2), groundHeight(x + w / 2, z + d / 2));
  const tier = rich > 0.66 ? 2 : rich > 0.33 ? 1 : 0;
  const floors = tier === 2 ? 2 + Math.floor(rng() * 3) : tier === 1 ? 1 + Math.floor(rng() * 2.2) : 1 + (rng() < 0.3 ? 1 : 0);
  const h = top - base + floors * 3.3;
  const wall = pick(rng, [POOR_WALLS, MID_WALLS, RICH_WALLS][tier]);
  const ry = range(rng, -0.04, 0.04) * (tier === 0 ? 3 : 1);
  // A point on the house, measured from its centre (ox across, oz toward the back), turned with the house.
  const at = (ox, oz) => [x + ox * Math.cos(ry) + oz * Math.sin(ry), z - ox * Math.sin(ry) + oz * Math.cos(ry)];
  const front = -d / 2 - 0.03;

  // Some poor houses have crumbled: a lower broken corner and rubble in the street.
  const ruined = tier === 0 && rng() < 0.3;
  if (ruined) {
    // One half stands, the other has partly fallen in.
    const low = Math.max(top - base + 1.6, h * 0.55);
    const [lx, lz] = at(-w / 4, 0), [rx, rz] = at(w / 4, 0);
    B.box.add(lx, base, lz, w / 2, h, d, wall, ry);
    B.box.add(rx, base, rz, w / 2, low, d, wall, ry);
    for (let i = 0; i < 3; i++) B.box.add(x + range(rng, 0.05, 0.45) * w, base + low, z + range(rng, -d / 3, d / 3), range(rng, 0.6, 1.4), range(rng, 0.3, 1.2), range(rng, 0.6, 1.4), wall, range(rng, 0, 1));
    for (let i = 0; i < 4; i++) {
      const rx = x + range(rng, -w / 2 - 1.5, w / 2 + 1.5), rz = z - d / 2 - range(rng, 0.5, 2);
      B.box.add(rx, groundHeight(rx, rz) - 0.1, rz, range(rng, 0.3, 0.8), range(rng, 0.2, 0.5), range(rng, 0.3, 0.8), wall, range(rng, 0, 3));
    }
  } else {
    B.box.add(x, base, z, w, h, d, wall, ry);
    // A stone plinth at the foot of better houses, a cornice under the roof line.
    if (tier >= 1) {
      B.stone.add(x, base, z, w + 0.14, top - base + 0.55, d + 0.14, tier === 2 ? '#e2d3b4' : '#cdb894', ry);
      B.box.add(x, base + h - 0.32, z, w + 0.3, 0.32, d + 0.3, tier === 2 ? '#fbf6ec' : wall, ry);
    }
  }
  // Poor houses: patches where the plaster has fallen off and the mud brick shows.
  if (tier === 0) for (let i = 0; i < 1 + Math.floor(rng() * 3); i++) {
    const [px, pz] = at(range(rng, -w / 2 + 0.8, w / 2 - 0.8), -d / 2 - 0.01);
    B.stone.add(px, top + range(rng, 0.2, Math.max(0.3, h - (top - base) - 1.6)), pz, range(rng, 0.7, 1.6), range(rng, 0.45, 1.0), 0.05, pick(rng, ['#b49a74', '#a88d66', '#bfa47c']), ry);
  }
  addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2);

  const roofY = base + h;
  if (tier >= 1) {
    // Parapet with a band of coloured tiles on the better houses.
    const t = 0.35;
    B.box.add(x, roofY, z - d / 2 + t / 2, w, 0.9, t, wall, ry);
    B.box.add(x, roofY, z + d / 2 - t / 2, w, 0.9, t, wall, ry);
    B.box.add(x - w / 2 + t / 2, roofY, z, t, 0.9, d, wall, ry);
    B.box.add(x + w / 2 - t / 2, roofY, z, t, 0.9, d, wall, ry);
    if (tier === 2) B.box.add(x, roofY - 0.9, z - d / 2 - 0.02, w + 0.04, 0.45, 0.1, pick(rng, [TEAL, '#3a6fa8', GOLD]), ry);
  } else if (rng() < 0.5) {
    // Cloth shade and sticks on poor flat roofs.
    B.cloth.add(x + range(rng, -w / 4, w / 4), roofY + 1.4, z, w * 0.5, 0.06, d * 0.5, pick(rng, ['#a8956f', '#8f7c5a', '#b9a37a']), 0, range(rng, -0.1, 0.1));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.cyl.add(x + sx * w * 0.22, roofY, z + sz * d * 0.22, 0.06, 1.4, 0.06, '#6b5032');
  }

  if (tier >= 1 && rng() < (tier === 2 ? 0.7 : 0.3)) {
    const r = Math.min(w, d) * range(rng, 0.25, 0.36);
    B.cyl.add(x, roofY, z, r * 0.95, 1.2, r * 0.95, wall);
    const domeColor = pick(rng, DOMES);
    if (tier === 2 && rng() < 0.45) B.onion.add(x, roofY + 1.2, z, r, r, r, domeColor);
    else B.dome.add(x, roofY + 1.2, z, r, r * range(rng, 0.8, 1.1), r, domeColor);
    B.cone.add(x, roofY + 1.2 + r * 1.05, z, 0.12, 1.2, 0.12, GOLD);
  } else if (tier === 2 && rng() < 0.5) {
    // A small tower on top.
    const tw = w * 0.35, td = d * 0.35;
    B.box.add(x - w * 0.2, roofY, z + d * 0.2, tw, 3.2, td, wall);
  }

  // Windows and a door on the side facing the sea; side windows for taller houses.
  const winColor = tier === 2 ? '#2b3a44' : '#3a2a1e';
  const perRow = Math.max(1, Math.floor(w / (tier === 0 ? 4 : 3)));
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < perRow; i++) {
      if (tier === 0 && rng() < 0.3) continue;
      const ox = -w / 2 + (i + 0.5) * (w / perRow);
      const wy = top + 1.2 + f * 3.3 + (f === 0 ? 0.3 : 0);
      if (f === 0 && i === Math.floor(perRow / 2)) continue;
      if (ruined && ox > 0 && wy > base + Math.max(top - base + 1.6, h * 0.55) - 1) continue;
      const [wx, wz] = at(ox, front);
      const ww = tier === 2 ? 1 : 0.8, wh = tier === 2 ? 1.7 : 1.1;
      B.dark.add(wx, wy, wz, ww, wh, 0.12, winColor, ry);
      // A frame and a sill; shutters on plainer houses.
      const [fx, fz] = at(ox, -d / 2 - 0.01);
      const frame = tier === 2 ? '#fbf6ec' : '#6b4a2c';
      (tier === 2 ? B.box : B.wood).add(fx, wy - 0.1, fz, ww + 0.22, wh + 0.2, 0.08, frame, ry);
      const [sx2, sz2] = at(ox, -d / 2 - 0.1);
      (tier === 2 ? B.stone : B.wood).add(sx2, wy - 0.18, sz2, ww + 0.34, 0.1, 0.24, tier === 2 ? '#e8dcc2' : '#7a5838', ry);
      if (tier < 2 && rng() < 0.55) {
        const shut = pick(rng, ['#2e6c8e', '#5f8a3a', '#7a5232', '#3a6fa8', '#8e5a3a']);
        for (const side of [-1, 1]) {
          const [hx, hz] = at(ox + side * (ww / 2 + 0.11 + ww * 0.25), -d / 2 - 0.05);
          B.wood.add(hx, wy - 0.05, hz, ww * 0.5, wh + 0.1, 0.05, shut, ry + (rng() < 0.2 ? side * 0.4 : 0));
        }
      }
      if (tier === 2 && f > 0 && rng() < 0.35) {
        // Little balcony.
        const [bx, bz] = at(ox, -d / 2 - 0.5), [cx2, cz2] = at(ox, -d / 2 - 0.95);
        B.box.add(bx, wy - 0.25, bz, 1.6, 0.15, 1, wall, ry);
        B.box.add(cx2, wy - 0.1, cz2, 1.6, 0.6, 0.08, wall, ry);
      }
    }
  }
  const doorOx = -w / 2 + (Math.floor(perRow / 2) + 0.5) * (w / perRow);
  const [doorX, doorZ] = at(doorOx, front);
  const doorY = groundHeight(doorX, doorZ);
  B.dark.add(doorX, doorY - 0.1, doorZ, 1.3, 2.4, 0.12, tier === 0 ? '#5a3f26' : '#3d2a1a', ry);
  if (tier >= 1 && rng() < 0.6) {
    const [ax, az] = at(doorOx, -d / 2 - 0.8);
    B.cloth.add(ax, doorY + 2.7, az, 2.4, 0.06, 1.6, pick(rng, AWNINGS), ry, -0.3);
  }

  // A spot on the front wall for a wanted poster: on standing wall, clear of the door.
  let poster = null;
  if (w >= 2.6) {
    const lo = -w / 2 + 0.7, hi = ruined ? -0.7 : w / 2 - 0.7;
    for (let k = 0; k < 6 && hi > lo; k++) {
      const ox = range(rng, lo, hi);
      if (Math.abs(ox - doorOx) < 1.4) continue;
      const [px, pz] = at(ox, -d / 2 - 0.08);
      const gy = groundHeight(px, pz);
      if (gy + 2.6 < base + (ruined ? Math.max(top - base + 1.6, h * 0.55) : h)) poster = [px, gy + 1.9, pz, ry];
      break;
    }
  }

  // Plants: lots near the water, a few further up, dry scrub at the top.
  if (tier === 2) {
    if (rng() < 0.75) palm(x + range(rng, -w / 2, w / 2), z - d / 2 - range(rng, 1.5, 2.5));
    for (let i = 0; i < 3; i++) bush(x + range(rng, -w / 2, w / 2), z - d / 2 - 1, range(rng, 0.6, 1));
  } else if (tier === 1) {
    if (rng() < 0.3) palm(x + range(rng, -w / 2, w / 2), z - d / 2 - 2, 0.85);
    if (rng() < 0.5) bush(x + range(rng, -w / 2, w / 2), z - d / 2 - 1, 0.6);
  } else if (rng() < 0.4) {
    dryShrub(x + range(rng, -w / 2 - 2, w / 2 + 2), z - d / 2 - range(rng, 1, 3));
  }
  return { roofY, tier, poster };
}

// ---------- Guild halls ----------
// Names and emblems are my placeholders.
export const GUILDS = [
  { id: 'merchants', name: "Merchants' Guild", sub: 'Coin, contract and caravan', x: -110, color: '#7a2a1c', emblem: 'coin' },
  { id: 'mariners', name: "Mariners' Guild", sub: 'Pilots of the warded passage', x: -72, color: '#1f4f78', emblem: 'anchor' },
  { id: 'transmuters', name: "Transmuters' Guild", sub: 'Under the Sultan\'s blessing', x: -148, color: '#4b2a6b', emblem: 'flask' },
  { id: 'adventurers', name: "Adventurers' Guild", sub: 'Bounties, escorts, monsters', x: 64, color: '#2e5a2a', emblem: 'sword' },
];

function guildHall(scene, gd, seed) {
  const x = gd.x, z = 24, w = 26, d = 16;
  const base = lowest(x, z, w, d), h = 12;
  // Halls you can enter (once your level opens the door); the Mariners' Guild stays shut.
  const doorLevel = { merchants: 3, transmuters: 4, adventurers: 5 }[gd.id];
  if (doorLevel) {
    scene.userData.shells[gd.id] = hollow(scene, { x, z, w, d, h: h - 0.05, color: WHITE, doorW: 3.6, doorH: 5.5, lockLevel: doorLevel, name: gd.name, doorColor: '#3a2412' });
  } else {
    B.box.add(x, base, z, w, h + 0.3, d, WHITE);
    addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  }
  B.box.add(x, base + h, z, w + 0.6, 0.6, d + 0.6, '#e6d6b6');
  B.box.add(x, base + h - 1.2, z - d / 2 - 0.05, w, 0.7, 0.1, TEAL);
  // Portico: columns and a roof in front of the door.
  const pz = z - d / 2 - 3.2;
  for (let i = 0; i < 6; i++) B.cyl.add(x - 9 + i * 3.6, QUAY_Y, pz, 0.45, 8.5, 0.45, '#efe6d4');
  B.box.add(x, QUAY_Y + 8.5, pz + 1.3, 20, 0.9, 4.4, '#e9dcc0');
  B.box.add(x, QUAY_Y + 9.4, pz + 1.3, 20, 0.35, 4.4, gd.color);
  B.box.add(x, QUAY_Y, pz + 1.3, 20.5, 0.35, 5, '#d8c8a8');
  addFloor(x - 10.25, x + 10.25, pz + 1.3 - 2.5, pz + 1.3 + 2.5, QUAY_Y + 0.35);
  for (let i = 0; i < 6; i++) addCollider(x - 9 + i * 3.6 - 0.5, x - 9 + i * 3.6 + 0.5, pz - 0.5, pz + 0.5);
  // Big doors
  if (!doorLevel) B.dark.add(x, QUAY_Y, z - d / 2 - 0.05, 3.6, 5.5, 0.15, '#3a2412');
  // Dome on a drum
  B.cyl.add(x, base + h + 0.6, z, 5.2, 2.2, 5.2, WHITE);
  B.dome.add(x, base + h + 2.8, z, 5.4, 5.6, 5.4, pick(rng, [GOLD, TEAL]));
  B.cone.add(x, base + h + 8.2, z, 0.25, 2.5, 0.25, GOLD);
  // Name over the portico, readable.
  placeReadable(scene, signBoard(gd.name, gd.sub, { bg: '#2a1a0e' }), {
    x, y: QUAY_Y + 10.6, z: pz + 1.2 - 2.25, w: 9, h: 2.25, title: gd.name,
  });
  // Banners hanging from the building.
  const tex = banner(gd.color, gd.emblem, seed);
  for (const sx of [-11.5, 11.5]) {
    placeReadable(scene, tex, { x: x + sx, y: base + h - 4.5, z: z - d / 2 - 0.12, w: 2.4, h: 6, title: gd.name, readable: false });
  }
  // Every hall has a notice board out front; the Adventurers' Guild has two.
  const all = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const pickSome = () => [0, ...all.slice(1).sort(() => rng() - 0.5).slice(0, 2)];
  noticeBoard(scene, x + 14.5, z - d / 2 - 5, 0.35, pickSome(), addCollider);
  if (gd.emblem === 'sword') noticeBoard(scene, x - 14.5, z - d / 2 - 5, -0.35, [0, 4, 8], addCollider);
  bush(x - 13, z - d / 2 - 1.5); bush(x + 13, z - d / 2 - 1.5);
  // Someone from the guild out front to talk to.
  const who = { merchants: ['merchant', "Clerk of the Merchants' Guild"], mariners: ['sailor', "Dockmaster of the Mariners' Guild"],
    transmuters: ['scribe', "A Transmuter of the guild"], adventurers: ['adventurer', "Bounty master of the Adventurers' Guild"] }[gd.id];
  scene.userData.posts.push({ x: x - 4, z: pz - 1.6, ry: 0, role: who[0], label: who[1], npc: { kind: 'guild', guild: gd.id } });
  palm(x - 15, z - d / 2 + 1); palm(x + 15.5, z - d / 2 + 2);
}

// ---------- Market ----------
function market(scene) {
  for (const row of [11, 19, 27]) {
    for (let x = -32; x <= 32; x += 8) {
      if (Math.abs(x) < 6) continue;
      const y = groundHeight(x, row);
      const color = pick(rng, AWNINGS);
      for (const [sx, sz] of [[-2.2, -1.4], [2.2, -1.4], [-2.2, 1.4], [2.2, 1.4]]) B.cyl.add(x + sx, y, row + sz, 0.08, sz < 0 ? 2.6 : 3.0, 0.08, '#6b4a2c');
      B.cloth.add(x, y + 2.8, row, 5, 0.06, 3.4, color, 0, -0.12);
      B.wood.add(x, y, row - 0.9, 4, 0.95, 1.2, '#b08a62');
      // (The goods on the table are real models, placed once they've loaded: goods.js.)
      addCollider(x - 2.2, x + 2.2, row - 1.6, row - 0.2);
      const kinds = ['spice', 'cloth', 'craft', 'food', 'curio'];
      const n = scene.userData.stalls.length;
      scene.userData.stalls.push({ x, z: row + 0.4, id: `stall-${n}`, kind: kinds[(n * 7 + 3) % kinds.length] });
    }
  }
  // Crates, barrels and sacks along the quay: spots chosen here, real models placed by goods.js.
  scene.userData.cargo = [];
  for (let i = 0; i < 70; i++) {
    const x = range(rng, -170, 90), z = range(rng, 1.5, 6);
    if (Math.abs(x) < 7) continue;
    const k = rng(), ry = range(rng, 0, Math.PI * 2), stack = rng() < 0.35;
    scene.userData.cargo.push({ x, z, k, ry, stack });
    if (rng() < 0.25) addCollider(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
  }
}

// ---------- King Shou and the shrine ----------
// The people worship their sovereign; a statue with a Luminous Shrine felt right for the plaza.
function statue(scene) {
  const x = 0, z = 38, y = groundHeight(x, z);
  B.box.add(x, y, z, 7, 0.6, 7, '#d8c8a8');
  B.box.add(x, y + 0.6, z, 4, 3.4, 4, '#e8dcc2');
  B.box.add(x, y + 3.6, z, 4.4, 0.4, 4.4, GOLD);
  scene.userData.statueBase = { x, y: y + 4, z };          // the figure itself: characters.js makeStatue
  addCollider(x - 3.5, x + 3.5, z - 3.5, z + 3.5);
  // Shrine bowls with soft light.
  const glow = new THREE.CanvasTexture(glowTextureCanvas());
  for (const [sx, sz] of [[-3.2, -3.2], [3.2, -3.2], [-3.2, 3.2], [3.2, 3.2]]) {
    B.cyl.add(x + sx, y, z + sz, 0.35, 1.1, 0.35, '#d8c8a8');
    B.cyl.add(x + sx, y + 1.1, z + sz, 0.55, 0.3, 0.55, GOLD);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffe7a8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    fl.position.set(x + sx, y + 1.7, z + sz);
    fl.scale.set(1.8, 1.8, 1);
    scene.add(fl);
    scene.userData.flames.push(fl);
  }
  placeReadable(scene, signBoard('KING SHOU', 'Blood of transmutation · Light of the Sultanate', { bg: '#e8dcc2', fg: '#6a4a14' }), {
    x, y: y + 2.3, z: z - 2.03, w: 3.6, h: 0.9, title: 'Statue of King Shou',
  });
}

// ---------- The palace ----------
// Walled grounds: a garden courtyard with a fountain, and the throne hall out over the water.
// The King isn't here; his Steward holds court below the empty throne.
function wallRun(x0, z0, x1, z1, top, thick, color, crenel = true) {
  // A straight wall from (x0, z0) to (x1, z1), in pieces so it follows the ground.
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 8));
  const ry = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n;
    const mx = x0 + (x1 - x0) * (a + b) / 2, mz = z0 + (z1 - z0) * (a + b) / 2;
    const sx = x0 + (x1 - x0) * a, sz = z0 + (z1 - z0) * a, ex = x0 + (x1 - x0) * b, ez = z0 + (z1 - z0) * b;
    const gLow = Math.min(groundHeight(sx, sz), groundHeight(ex, ez), groundHeight(mx, mz)) - 1.5;
    const gTop = Math.max(groundHeight(sx, sz), groundHeight(ex, ez), groundHeight(mx, mz)) + top;
    B.stone.add(mx, gLow, mz, thick, gTop - gLow, len / n + 0.05, color, ry);
    if (crenel) {
      for (let k = 0; k < Math.floor(len / n / 2.6); k++) {
        const t = a + (b - a) * (k + 0.5) / Math.floor(len / n / 2.6);
        B.stone.add(x0 + (x1 - x0) * t, gTop, z0 + (z1 - z0) * t, thick, 1.1, 1.3, color, ry);
      }
    }
  }
  addCollider(Math.min(x0, x1) - thick / 2, Math.max(x0, x1) + thick / 2, Math.min(z0, z1) - thick / 2, Math.max(z0, z1) + thick / 2);
}

function tower(x, z, r, h, cap) {
  const g = groundHeight(x, z);
  const base = Math.min(g, 0) - 4;
  B.stoneCyl.add(x, base, z, r, g + h - base, r, '#e2d2b0');
  B.stoneCyl.add(x, g + h, z, r + 0.4, 0.6, r + 0.4, '#d8c49c');
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    B.stone.add(x + Math.cos(a) * r, g + h + 0.6, z + Math.sin(a) * r, 1.1, 1.2, 1.1, '#e2d2b0', -a);
  }
  if (cap) B.dome.add(x, g + h + 0.6, z, r * 0.7, r * 0.8, r * 0.7, cap);
  addCollider(x - r, x + r, z - r, z + r);
}

function marbleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e0d0b4'; g.fillRect(0, 0, 256, 256);
  const r = makeRng(9);
  for (let i = 0; i < 400; i++) {
    g.strokeStyle = `rgba(150,130,110,${range(r, 0.03, 0.08)})`;
    g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + range(r, -40, 40), y + range(r, -40, 40)); g.stroke();
  }
  // A teal and gold star in each tile.
  g.strokeStyle = '#b89a5a'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(47,156,154,0.55)';
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, rad = i % 2 ? 22 : 48;
    g.lineTo(128 + Math.cos(a) * rad, 128 + Math.sin(a) * rad);
  }
  g.fill();
  const t = canvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function domeInsideTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#f6e6b0'); grad.addColorStop(0.5, '#2a7d82'); grad.addColorStop(1, '#1d4f66');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = 'rgba(240,205,110,0.9)'; g.lineWidth = 4;
  for (let i = 0; i < 16; i++) {
    const x = (i / 16) * 1024;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke();
    g.beginPath(); g.arc(x + 32, 380, 22, 0, Math.PI * 2); g.stroke();
  }
  for (const y of [120, 300, 470]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  return canvasTexture(c);
}

function palace(scene) {
  const { x0, x1, z0, z1, y: py } = PALACE;
  const cx = (x0 + x1) / 2;
  const gz = PALACE_GATE.z;
  // Sea wall and platform under the hall.
  // (Its top stops just under the ground, so the two surfaces don't fight over the same height.)
  B.box.add(cx, -4, z0 / 2, x1 - x0, py + 4 - 0.08, -z0, '#d8c8a8');

  // Outer walls, with the gate in the west wall.
  const H = 8, t = 1.6;
  wallRun(x0 + 1, z0 + 1, x1 - 1, z0 + 1, H, t, WHITE);
  wallRun(x0 + 1, z1 - 1, x1 - 1, z1 - 1, H, t, WHITE);
  wallRun(x1 - 1, z0 + 1, x1 - 1, z1 - 1, H, t, WHITE);
  wallRun(x0 + 1, z0 + 1, x0 + 1, gz - 3.2, H, t, WHITE);
  wallRun(x0 + 1, gz + 3.2, x0 + 1, z1 - 1, H, t, WHITE);
  for (const [tx, tz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    B.cyl.add(tx, -4, tz, 3.2, py + 17.5, 3.2, WHITE);
    B.onion.add(tx, py + 13.5, tz, 3, 3, 3, TEAL);
    B.cone.add(tx, py + 18, tz, 0.15, 2, 0.15, GOLD);
    addCollider(tx - 3.2, tx + 3.2, tz - 3.2, tz + 3.2);
  }

  // The gate: two pillars, an arch, and its golden doors standing open.
  const gy = groundHeight(x0 - 1, gz);
  for (const s of [-1, 1]) {
    B.box.add(x0 + 1, gy - 1, gz + s * 4.7, 3, 14, 3, WHITE);
    B.dome.add(x0 + 1, gy + 13, gz + s * 4.7, 1.6, 2, 1.6, GOLD);
    addCollider(x0 - 0.5, x0 + 2.5, gz + s * 4.7 - 1.5, gz + s * 4.7 + 1.5);
    B.box.add(x0 + 4, py, gz + s * 3.05, 3, 9, 0.3, GOLD, s * 0.15);
  }
  B.box.add(x0 + 1, py + 9.5, gz, 3, 3, 12, WHITE);
  B.box.add(x0 + 1, py + 9.2, gz, 3.05, 0.5, 6.2, TEAL);
  for (let i = 0; i < 4; i++) B.box.add(x0 - 2 - i * 1.6, groundHeight(x0 - 2 - i * 1.6, gz) - 0.4, gz, 1.6, 0.55, 7, '#e2d5ba');
  placeReadable(scene, signBoard("SULTAN'S REST", 'Seat of King Shou', { bg: '#2f9c9a', fg: '#fff3cf' }), {
    x: x0 - 0.55, y: py + 11, z: gz, w: 8, h: 2, ry: Math.PI / 2, title: "Sultan's Rest",
  });
  scene.userData.palaceGate = { x: x0 - 3, z: gz };

  // Courtyard: a fountain where the paths meet, palms and beds along them.
  const fx = cx, fz = gz;
  B.cyl.add(fx, py, fz, 5, 0.8, 5, '#e8dcc2');
  B.cyl.add(fx, py + 0.8, fz, 4.6, 0.05, 4.6, '#3aa7b8');
  B.cyl.add(fx, py, fz, 0.7, 3.2, 0.7, '#e8dcc2');
  B.cyl.add(fx, py + 3.2, fz, 2, 0.4, 2, GOLD);
  B.cone.add(fx, py + 3.6, fz, 0.5, 1.6, 0.5, GOLD);
  addCollider(fx - 5, fx + 5, fz - 5, fz + 5);
  const spray = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowTextureCanvas()), color: '#cfefff', transparent: true, opacity: 0.6, depthWrite: false }));
  spray.position.set(fx, py + 4.6, fz); spray.scale.set(2.2, 2.8, 1);
  scene.add(spray);
  // Paths: gate to fountain, fountain to the hall door.
  B.box.add((x0 + fx) / 2, py, fz, fx - x0, 0.06, 4, '#f1e8d6');
  B.box.add(fx, py, (fz - 13) / 2, 4, 0.06, fz + 13, '#f1e8d6');
  for (let x = x0 + 8; x < x1 - 4; x += 8) {
    if (Math.abs(x - fx) < 9) continue;
    for (const s of [-1, 1]) { palm(x, fz + s * 5, 1.1); bush(x + 4, fz + s * 4.2, 0.8, '#5f8a34'); }
  }
  for (let z = -8; z < fz - 6; z += 7) for (const s of [-1, 1]) { palm(fx + s * 5, z, 1.05); bush(fx + s * 4.3, z + 3.5, 0.8); }
  for (let i = 0; i < 18; i++) {
    const x = range(rng, x0 + 6, x1 - 6), z = range(rng, fz + 9, z1 - 5);
    if (Math.abs(x - fx) < 6) continue;
    palm(x, z, range(rng, 0.9, 1.25));
    bush(x + 2, z + 1, 1.2);
  }

  // ----- The throne hall: hollow, so you can walk in. -----
  const hz = -28, HW = 46, HD = 30, HH = 16, wt = 1;
  const hx0 = cx - HW / 2, hx1 = cx + HW / 2, hzF = hz + HD / 2, hzB = hz - HD / 2;   // front (north) and back (sea) walls
  // Inside, warm sandstone-cream instead of pure white (pure white washed the hall out).
  const wallBox = (xa, xb, za, zb, ya, yb, color = '#e3cfab') => {
    B.box.add((xa + xb) / 2, ya, (za + zb) / 2, xb - xa, yb - ya, zb - za, color);
  };
  // Front wall with a tall door in the middle.
  const door = 2.8, doorH = 8;
  wallBox(hx0, cx - door, hzF - wt, hzF, py - 0.5, py + HH);
  wallBox(cx + door, hx1, hzF - wt, hzF, py - 0.5, py + HH);
  wallBox(cx - door, cx + door, hzF - wt, hzF, py + doorH, py + HH);
  addCollider(hx0, cx - door, hzF - wt, hzF);
  addCollider(cx + door, hx1, hzF - wt, hzF);
  B.box.add(cx, py + doorH, hzF + 0.05, door * 2 + 1.2, 0.8, 0.3, GOLD);
  // Back wall facing the sea, with seven tall open windows.
  const win = 2.4, winY0 = py + 2.2, winY1 = py + 9.2;
  wallBox(hx0, hx1, hzB, hzB + wt, py - 0.5, winY0);
  wallBox(hx0, hx1, hzB, hzB + wt, winY1, py + HH);
  let last = hx0;
  for (let i = 0; i < 7; i++) {
    const wxc = cx - 18 + i * 6;
    wallBox(last, wxc - win / 2, hzB, hzB + wt, winY0, winY1);
    B.box.add(wxc, winY1 - 0.4, hzB + wt / 2, win, 0.4, wt + 0.1, GOLD);
    last = wxc + win / 2;
  }
  wallBox(last, hx1, hzB, hzB + wt, winY0, winY1);
  addCollider(hx0, hx1, hzB, hzB + wt);
  // Side walls.
  wallBox(hx0, hx0 + wt, hzB, hzF, py - 0.5, py + HH);
  wallBox(hx1 - wt, hx1, hzB, hzF, py - 0.5, py + HH);
  addCollider(hx0, hx0 + wt, hzB, hzF);
  addCollider(hx1 - wt, hx1, hzB, hzF);
  // Bands of teal tile outside, and a roof with an opening under the great dome.
  B.box.add(cx, py + HH - 1, hzB - 0.05, HW, 1.2, 0.2, TEAL);
  B.box.add(cx, py + HH - 1, hzF + 0.05, HW, 1.2, 0.2, TEAL);
  const R = 10.4, hole = 11.2;
  B.box.add(cx, py + HH, (hzB + hz - hole) / 2, HW + 1, 0.8, hz - hole - hzB + 0.5, '#e9dcc0');
  B.box.add(cx, py + HH, (hzF + hz + hole) / 2, HW + 1, 0.8, hzF - hz - hole + 0.5, '#e9dcc0');
  B.box.add((hx0 + cx - hole) / 2, py + HH, hz, cx - hole - hx0 + 0.5, 0.8, hole * 2, '#e9dcc0');
  B.box.add((hx1 + cx + hole) / 2, py + HH, hz, hx1 - cx - hole + 0.5, 0.8, hole * 2, '#e9dcc0');
  // Ceiling seen from inside: flat, with a round opening up into the dome.
  const ceilShape = new THREE.Shape();
  ceilShape.moveTo(-HW / 2 + wt, -HD / 2 + wt); ceilShape.lineTo(HW / 2 - wt, -HD / 2 + wt);
  ceilShape.lineTo(HW / 2 - wt, HD / 2 - wt); ceilShape.lineTo(-HW / 2 + wt, HD / 2 - wt);
  const hp = new THREE.Path(); hp.absarc(0, 0, R, 0, Math.PI * 2, true); ceilShape.holes.push(hp);
  const ceil = new THREE.Mesh(new THREE.ShapeGeometry(ceilShape, 48), new THREE.MeshStandardMaterial({ color: '#c9b089', roughness: 0.9, side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, py + HH - 0.05, hz);
  scene.add(ceil);
  // Inside of the drum and dome (painted teal and gold).
  const inside = new THREE.MeshStandardMaterial({ map: domeInsideTexture(), roughness: 0.6, side: THREE.BackSide });
  const drumIn = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 5, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#e8dcc2', roughness: 0.8, side: THREE.BackSide }));
  drumIn.position.set(cx, py + HH + 2.45, hz);
  const domeIn = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), inside);
  domeIn.scale.y = 1.15;
  domeIn.position.set(cx, py + HH + 4.9, hz);
  scene.add(drumIn, domeIn);
  // Outside: drum, the great golden dome, a spire.
  // (Open-ended, so its bottom doesn't cover the opening in the ceiling.)
  const drumOut = new THREE.Mesh(new THREE.CylinderGeometry(11.2, 11.2, 4.1, 48, 1, true), new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0.88 }));
  drumOut.position.set(cx, py + HH + 0.8 + 2.05, hz);
  drumOut.castShadow = drumOut.receiveShadow = true;
  scene.add(drumOut);
  B.dome.add(cx, py + HH + 4.9, hz, 11.8, 14, 11.8, GOLD);
  B.cone.add(cx, py + HH + 18.6, hz, 0.45, 5, 0.45, GOLD);
  B.ball.add(cx, py + HH + 23.8, hz, 0.7, 0.7, 0.7, GOLD);
  // Wings and minarets.
  for (const s of [-1, 1]) {
    B.box.add(cx + s * 30, py, hz + 4, 14, 11, 22, '#efe6d6');
    B.dome.add(cx + s * 30, py + 11, hz + 4, 5, 5, 5, TEAL);
    addCollider(cx + s * 30 - 7, cx + s * 30 + 7, hz + 4 - 11, hz + 4 + 11);
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const mx = cx + sx * 26, mz = hz + sz * 18;
    B.cyl.add(mx, py, mz, 1.5, 34, 1.5, WHITE);
    B.cyl.add(mx, py + 24, mz, 2.3, 0.6, 2.3, GOLD);
    B.cyl.add(mx, py + 24.6, mz, 2.2, 1.0, 2.2, WHITE);
    B.cyl.add(mx, py + 34, mz, 1.2, 4, 1.2, WHITE);
    B.onion.add(mx, py + 38, mz, 1.5, 1.6, 1.5, GOLD);
    B.cone.add(mx, py + 40.4, mz, 0.12, 2.2, 0.12, GOLD);
    addCollider(mx - 1.6, mx + 1.6, mz - 1.6, mz + 1.6);
  }

  // Inside: marble floor, two rows of columns, a red carpet to the dais.
  const floorTex = marbleTexture();
  floorTex.repeat.set(HW / 4, HD / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HW - 2 * wt, HD - 2 * wt), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, py + 0.02, hz);
  floor.receiveShadow = true;
  scene.add(floor);
  for (let z = hzB + 4; z <= hzF - 3; z += 5.5) {
    for (const s of [-1, 1]) {
      const x = cx + s * 9;
      B.cyl.add(x, py, z, 0.75, HH, 0.75, '#eadcc2');
      B.cyl.add(x, py, z, 1.05, 0.7, 1.05, GOLD);
      B.cyl.add(x, py + HH - 0.9, z, 1.05, 0.9, 1.05, GOLD);
      addCollider(x - 0.8, x + 0.8, z - 0.8, z + 0.8);
    }
  }
  B.box.add(cx, py + 0.02, (hzF + hzB + 6) / 2, 3.2, 0.06, hzF - hzB - 7, '#8e1f24');
  // The dais: two steps, the empty throne of King Shou on top.
  const dz0 = hzB + wt, dz1 = hzB + 7.5;
  B.box.add(cx, py, (dz0 + dz1) / 2, 18, 0.6, dz1 - dz0, '#e8dcc2');
  B.box.add(cx, py + 0.6, (dz0 + dz1 - 3) / 2, 11, 0.6, dz1 - 3 - dz0, '#efe6d4');
  B.box.add(cx, py + 0.62, dz1 - 0.3, 18, 0.03, 0.6, GOLD);
  addFloor(cx - 9, cx + 9, dz0, dz1, py + 0.6);
  addFloor(cx - 5.5, cx + 5.5, dz0, dz1 - 3, py + 1.2);
  const ty = py + 1.2, tz = dz0 + 1.6;
  B.box.add(cx, ty, tz, 2.6, 1.0, 2.0, GOLD);                // seat
  B.box.add(cx, ty, tz - 0.9, 2.8, 4.6, 0.4, GOLD);          // tall back
  B.onion.add(cx, ty + 4.6, tz - 0.9, 0.9, 1, 0.9, GOLD);
  B.ball.add(cx, ty + 6.3, tz - 0.9, 0.25, 0.25, 0.25, '#7fe0ff');
  for (const s of [-1, 1]) B.box.add(cx + s * 1.4, ty, tz, 0.3, 1.7, 2.0, GOLD);
  B.box.add(cx, ty + 1.0, tz, 2.3, 0.25, 1.8, '#8e1f24');    // cushion
  addCollider(cx - 1.6, cx + 1.6, tz - 1.2, tz + 1.1);
  placeReadable(scene, signBoard('THE THRONE OF KING SHOU', 'Sultan\'s Rest is entrusted to his Steward, Xi', { bg: '#2a1a0e' }), {
    x: cx, y: py + 0.32, z: dz1 + 0.01, w: 3.2, h: 0.5, title: 'Throne of King Shou', ry: Math.PI,
  });
  // A scribe's desk to one side.
  B.box.add(cx + 6.5, py, dz1 + 2.5, 2.4, 0.95, 1.2, '#6b4a2c');
  B.box.add(cx + 6.5, py + 0.95, dz1 + 2.5, 0.8, 0.02, 0.6, '#efe2c4');
  addCollider(cx + 5.3, cx + 7.7, dz1 + 1.9, dz1 + 3.1);
  // Banners on the side walls and hanging lanterns.
  const flag = banner('#1f6f74', 'crown', 77);
  for (let z = hzB + 6; z < hzF - 3; z += 8) {
    placeReadable(scene, flag, { x: hx0 + wt + 0.06, y: py + 9, z, w: 2.2, h: 5.5, ry: -Math.PI / 2, title: '', readable: false });
    placeReadable(scene, flag, { x: hx1 - wt - 0.06, y: py + 9, z, w: 2.2, h: 5.5, ry: Math.PI / 2, title: '', readable: false });
  }
  const glow = new THREE.CanvasTexture(glowTextureCanvas());
  for (const [lx, lz] of [[cx - 9, hz - 6], [cx + 9, hz - 6], [cx - 9, hz + 6], [cx + 9, hz + 6], [cx, hz + 9], [cx, hzB + 9]]) {
    B.cyl.add(lx, py + 9.5, lz, 0.03, HH - 9.5, 0.03, '#3a2a1a');
    B.cyl.add(lx, py + 8.8, lz, 0.35, 0.7, 0.35, GOLD);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffd38a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.set(lx, py + 9.1, lz); s.scale.set(2.4, 2.4, 1);
    scene.add(s);
    scene.userData.flames.push(s);
  }
  for (const [lx, lz] of [[cx, hz + 6], [cx, hzB + 6]]) {
    const l = new THREE.PointLight('#ffc77a', 120, 34, 1.6);
    l.position.set(lx, py + 8.5, lz);
    scene.add(l);
  }

  // Who's inside: the Steward on the dais step, guards, the scribe, and people waiting to be heard.
  scene.userData.posts.push(
    { x: cx, z: dz1 - 1.6, ry: Math.PI, role: 'steward', race: 'human', npc: { kind: 'steward' } },
    { x: cx - 7, z: dz1 - 0.8, ry: Math.PI, role: 'guard', race: 'human' },
    { x: cx + 7, z: dz1 - 0.8, ry: Math.PI, role: 'guard', race: 'human' },
    { x: cx - 4, z: hzF - 2, ry: Math.PI, role: 'guard', race: 'human' },
    { x: cx + 4, z: hzF - 2, ry: Math.PI, role: 'guard', race: 'human' },
    { x: cx + 6.5, z: dz1 + 3.6, ry: 0, role: 'scribe' },
    { x: cx, z: dz1 + 4, ry: 0, role: 'merchant' },
    { x: cx + 0.6, z: dz1 + 6.5, ry: 0, role: 'traveler' },
    { x: cx - 0.5, z: dz1 + 8.5, ry: 0.2, role: 'local' },
    { x: x0 - 2, z: gz - 3.6, ry: Math.PI / 2, role: 'guard', race: 'human' },
    { x: x0 - 2, z: gz + 3.6, ry: Math.PI / 2, role: 'guard', race: 'human' },
  );
  scene.userData.hall = { x0: hx0, x1: hx1, z0: hzB, z1: hzF };
}

// ---------- City walls ----------
// The city is closed off, especially toward the open sand: walls from the water on the west,
// around the desert side, back down to the water on the east. Gates are shut.
function cityWalls(scene) {
  const { x: X, z: Z } = CITY_WALL;
  const H = 10, T = 3, C = '#d9c49a';
  const westGateZ = 140, eastGateZ = 140, gateW = 4.5;
  wallRun(-X, -10, -X, westGateZ - gateW, H, T, C);
  wallRun(-X, westGateZ + gateW, -X, Z, H, T, C);
  wallRun(X, -10, X, eastGateZ - gateW, H, T, C);
  wallRun(X, eastGateZ + gateW, X, Z, H, T, C);
  wallRun(-X, Z, -gateW - 1, Z, H, T, C);
  wallRun(gateW + 1, Z, X, Z, H, T, C);
  // Towers: at the water, the corners, along the way, and either side of each gate.
  for (const x of [-X, X]) {
    for (const z of [-10, 45, 95, 190, 245]) tower(x, z, 4.2, H + 4, z === -10 ? TEAL : null);
    tower(x, Z, 5.5, H + 6, TEAL);
  }
  for (const x of [-140, -90, -45, 45, 90, 140]) tower(x, Z, 4.2, H + 4, null);
  // Gates: towers either side, an arch and heavy shut doors.
  const gates = [[0, Z, 0], [-X, westGateZ, Math.PI / 2], [X, eastGateZ, Math.PI / 2]];
  for (const [gx, gz2, ry] of gates) {
    const along = ry ? [0, 1] : [1, 0];
    for (const s of [-1, 1]) tower(gx + along[0] * s * (gateW + 3), gz2 + along[1] * s * (gateW + 3), 4.6, H + 7, GOLD);
    const g = groundHeight(gx, gz2);
    B.box.add(gx, g + H - 1, gz2, ry ? T + 0.6 : gateW * 2 + 6, 4, ry ? gateW * 2 + 6 : T + 0.6, C);
    B.box.add(gx, g - 0.5, gz2, ry ? 0.6 : gateW * 2, H - 0.5, ry ? gateW * 2 : 0.6, '#5a3a20');
    for (let k = 0; k < 4; k++) B.box.add(gx, g + 1.5 + k * 2.2, gz2, ry ? 0.7 : gateW * 2, 0.25, ry ? gateW * 2 : 0.7, '#3a3a3e');
    addCollider(gx - (ry ? T : gateW), gx + (ry ? T : gateW), gz2 - (ry ? gateW : T), gz2 + (ry ? gateW : T));
    const inward = ry ? [-Math.sign(gx) * 3, 0] : [0, -3];
    for (const s of [-1, 1]) {
      scene.userData.posts.push({ x: gx + inward[0] + along[0] * s * 2.5, z: gz2 + inward[1] + along[1] * s * 2.5, ry: ry ? (gx < 0 ? Math.PI / 2 : -Math.PI / 2) : Math.PI, role: 'guard', race: 'human', label: 'Human city guard' });
    }
  }
}

// ---------- Layout ----------
export function buildCity(scene) {
  scene.userData.stalls = [];
  scene.userData.flames = [];
  scene.userData.posts = [];
  scene.userData.shells = {};

  palace(scene);
  cityWalls(scene);
  GUILDS.forEach((gd, i) => guildHall(scene, gd, 40 + i));
  market(scene);
  statue(scene);
  noticeBoard(scene, -14, 7.5, 0, [0, 1, 6], addCollider);
  noticeBoard(scene, 14, 7.5, 0, [0, 3, 5], addCollider);
  noticeBoard(scene, 9.5, 46, -Math.PI / 2 + 0.2, [0, 2, 7], addCollider);

  // Rich trading houses along the quay between the guild halls and the city's east end.
  for (const [x, w] of [[-129, 9], [-91, 9], [45.5, 8]]) building(x, 24, w, 13, 0.95);
  scene.userData.shells.tavern = hollow(scene, { x: -168, z: 24, w: 11, d: 13, h: 5.5, color: '#e9dcc3', doorW: 1.8, doorH: 2.7, lockLevel: 2, name: 'The Salted Kraken', doorColor: '#3d2a1a' });
  B.dome.add(-168, QUAY_Y + 5.9, 24, 3.2, 3, 3.2, '#2f9c9a');
  // (x = -50 is your plot: see property.js)
  // The Salted Kraken: an inn on the quay (sleep there to skip to morning).
  placeReadable(scene, signBoard('THE SALTED KRAKEN', 'Beds · Food · No questions', { bg: '#1f3a4a', fg: '#e7c35a' }), {
    x: -168, y: QUAY_Y + 4.6, z: 24 - 6.5 - 0.1, w: 6, h: 1.5, title: 'The Salted Kraken (inn)',
  });
  scene.userData.posts.push({ x: -165.5, z: 15.5, ry: 0, role: 'local', label: 'Innkeeper of the Salted Kraken', npc: { kind: 'inn' } });
  // Sailors playing Bones on an upturned crate.
  const bx = -118, bz = 6.5;
  B.wood.add(bx, QUAY_Y, bz, 1.4, 0.6, 1.4, '#b08a5a');
  for (let i = 0; i < 3; i++) B.cyl.add(bx - 0.3 + i * 0.3, QUAY_Y + 0.6, bz + (i - 1) * 0.15, 0.06, 0.12, 0.06, '#f3ede0');
  addCollider(bx - 0.7, bx + 0.7, bz - 0.7, bz + 0.7);
  for (const [sx, sz, ry] of [[-1.4, 0, -Math.PI / 2], [1.4, 0, Math.PI / 2], [0, 1.4, Math.PI]]) {
    scene.userData.posts.push({ x: bx + sx, z: bz + sz, ry, role: 'sailor', sit: true, label: 'Sailor playing Bones', npc: { kind: 'bones' } });
  }

  // Blocks inland: streets between them, the main avenue up the middle stays open.
  const posterSpots = [];
  for (let bz = 50; bz < 280; bz += 22) {
    for (let bx = -160; bx <= 160; bx += 24) {
      if (Math.abs(bx) < 14) continue;                                  // main avenue
      if (bx === -40 && bz === 72) continue;                            // Ale's house and garden (buildings.js)
      if (bx > PALACE.x0 - 14 && bx < PALACE.x1 + 14 && bz < 60) continue; // palace grounds
      const w8 = wealth(bz);
      const edge = Math.max(0, (Math.abs(bx) - 170) / 70) + Math.max(0, (bz - 250) / 80);
      if (rng() < edge * 0.8) continue;                                   // the city thins out into desert
      const rich = Math.min(1, Math.max(0, w8 + range(rng, -0.12, 0.12) - edge * 0.3));
      const lots = rich > 0.66 ? (rng() < 0.6 ? 1 : 2) : rich > 0.33 ? 2 : 2 + Math.floor(rng() * 2);
      const lw = 17 / lots;
      for (let i = 0; i < lots; i++) {
        const w = lw - range(rng, 0.6, 2.2);
        const x = bx - 8.5 + lw * (i + 0.5) + range(rng, -0.4, 0.4);
        const d = range(rng, 9, 15) * (rich > 0.66 ? 1.1 : 1);
        const z = bz + range(rng, -1, 1);
        const b = building(x, z, w, d, rich);
        if (b.poster && (rng() < 0.12 && bz < 160 || b.tier === 0 && rng() < 0.15)) posterSpots.push(b.poster);
      }
    }
  }
  // Posters on walls: Redman most of all.
  posterSpots.forEach(([x, y, z, ry], i) => wallPoster(scene, i % 3 === 2 ? 1 + (i % 8) : 0, x, y, z, ry));

  // Palms along the main avenue and the waterfront.
  for (let z = 52; z < 285; z += 11) { palm(-9, z, 0.95); palm(9, z + 5, 0.95); }
  for (let x = -170; x < 90; x += 14) if (Math.abs(x) > 40 && !GUILDS.some(g => Math.abs(g.x - x) < 16)) palm(x, 9.5);

  for (const b of Object.values(B)) b.build(scene);
  scene.userData.windowMat = B.dark.material;
}
