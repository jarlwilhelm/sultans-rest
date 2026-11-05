// The people of Sultan's Rest. The Sultanate trades with East and West alike, so the harbor
// is the most mixed crowd in Lavine. Busiest by the water, thinner up in the poor streets.
// Left out on purpose: goliaths (only three ever recorded) and vampires (not out in this sun).
import * as THREE from 'three';
import { makeRng, pick, range } from './noise.js';
import { footHeight, walkable, PIERS } from './land.js';
import { inMeridia } from './place.js';
import { makeCharacter, charactersReady } from './characters.js';
import { roomAt } from './rooms.js';
// Walkers keep to the streets: never a spot inside a building you can walk into (shops, homes, the shrine), or
// they'd wander in and get stuck at the closed door (seen at the Luminous Shrine, 2026-11-04).
const street = (x, z) => !roomAt(x, footHeight(x, z) + 1, z);

const rng = makeRng(2024);

export const RACES = {
  human:      { w: 30, h: 1.75, girth: 1.0, skin: ['#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#a86b3c', '#6b4226'] },
  tiefling:   { w: 14, h: 1.75, girth: 0.95, skin: ['#a8343a', '#7a2e5c', '#5a3a7a', '#b8564a', '#8a3d3d'] },
  orc:        { w: 12, h: 1.92, girth: 1.3, skin: ['#6b8a4a', '#5a7a44', '#7d8f5c', '#6a7060'] },
  elf:        { w: 10, h: 1.82, girth: 0.82, skin: ['#f0d5be', '#e8c39e', '#c9a27a', '#d8b896'] },
  dwarf:      { w: 10, h: 1.32, girth: 1.45, skin: ['#d9a77f', '#c48a63', '#a8734f'] },
  halfling:   { w: 9, h: 0.98, girth: 1.0, skin: ['#e8b98f', '#d6a074', '#b98458'] },
  gnome:      { w: 6, h: 1.0, girth: 0.95, skin: ['#e9c4a0', '#d8a982'] },
  dragonborn: { w: 4, h: 1.98, girth: 1.25, skin: ['#a3342a', '#2f5d8a', '#b08a2e', '#3f7a4a', '#b8b8c0', '#8a5a2e'] },
};
const RACE_NAMES = { human: 'Human', tiefling: 'Tiefling', orc: 'Orc', elf: 'Elf', dwarf: 'Dwarf', halfling: 'Halfling', gnome: 'Gnome', dragonborn: 'Dragonborn' };

const LOCAL_ROBES = ['#efe6d4', '#e2d3b4', '#c9b48c', '#d9c7a3', '#f3ede0'];
const RICH = ['#7a2a5c', '#1f4f78', '#b8382b', '#2f6b5a', '#c98a2a', '#4b2a6b'];
const SAILOR = ['#3a5a7a', '#e9e2cf', '#7a6a5a', '#5a4a3a', '#2e4a6a'];
const LEATHER = ['#5a3e24', '#3e4a3a', '#6a5a4a', '#4a3a2a'];
const HAIR = ['#1a1410', '#3a2618', '#6a4a2a', '#a87a3a', '#d9c08a', '#8a2a1a', '#e8e4dc', '#555555'];

function pickRace() {
  const total = Object.values(RACES).reduce((s, r) => s + r.w, 0);
  let n = rng() * total;
  for (const [k, r] of Object.entries(RACES)) { if ((n -= r.w) < 0) return k; }
  return 'human';
}

const mats = new Map();
const M = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts }));
  return mats.get(key);
};
const G = {
  limb: new THREE.CylinderGeometry(0.5, 0.42, 1, 8).translate(0, -0.5, 0),
  torso: new THREE.CylinderGeometry(0.42, 0.5, 1, 10).translate(0, 0.5, 0),
  robe: new THREE.CylinderGeometry(0.38, 0.62, 1, 12).translate(0, 0.5, 0),
  head: new THREE.SphereGeometry(1, 14, 10),
  cone: new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
};
const mesh = (geo, mat, shadow = false) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; return m; };

// role: what they're doing; outfit decides clothes.
// An animated KayKit person when the models have loaded, else the simple shapes below.
export function makePerson(race, role, body) {     // body: a kit outfit such as 'Female_Peasant' (named people)
  if (!charactersReady()) return makeSimplePerson(race, role);
  const R = RACES[race];
  const skin = role === 'steward' ? '#5a3a22' : pick(rng, R.skin);
  const g = makeCharacter({ race, role, skin, height: R.h * range(rng, 0.95, 1.05), girth: R.girth * range(rng, 0.95, 1.05), body }, rng);
  g.userData.label = role === 'steward' ? 'Xi, Steward of Sultan\'s Rest' : `${RACE_NAMES[race]} ${roleName(role, race)}`;
  return g;
}

function makeSimplePerson(race, role) {
  const R = RACES[race];
  const H = R.h * range(rng, 0.94, 1.06);
  const girth = R.girth * range(rng, 0.92, 1.1);
  const skin = M(role === 'steward' ? '#5a3a22' : pick(rng, R.skin));
  const outfit = {
    local: LOCAL_ROBES, merchant: RICH, sailor: SAILOR, dockhand: SAILOR, adventurer: LEATHER,
    shopper: [...LOCAL_ROBES, ...RICH], traveler: [...LEATHER, ...LOCAL_ROBES], pilot: ['#2d2238', '#3a2a48'], guard: ['#f3ede0'],
    steward: ['#4b1f6b'], scribe: ['#e2d3b4', '#c9b48c'],
  }[role] || LOCAL_ROBES;
  const cloth = M(pick(rng, outfit));
  const cloth2 = M(pick(rng, [...LEATHER, ...SAILOR]));
  const robed = role === 'steward' || role === 'scribe' || (['local', 'merchant', 'shopper', 'guard', 'pilot'].includes(role) && rng() < 0.75 && race !== 'dwarf');

  const g = new THREE.Group();
  const legLen = H * 0.46, torsoLen = H * 0.32, headR = H * 0.075 * (race === 'dwarf' || race === 'gnome' || race === 'halfling' ? 1.25 : 1);
  const w = 0.17 * girth * (H / 1.75);

  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * w * 0.55, legLen, 0);
    const leg = mesh(G.limb, robed ? M('#3a2a1e') : cloth2);
    leg.scale.set(w * 0.75, legLen, w * 0.75);
    hip.add(leg);
    g.add(hip);
    legs.push(hip);
  }
  const body = mesh(robed ? G.robe : G.torso, cloth, true);
  if (robed) { body.scale.set(w * 1.7, legLen + torsoLen, w * 1.5); body.position.y = 0.05; }
  else { body.scale.set(w * 1.6, torsoLen, w * 1.2); body.position.y = legLen; }
  g.add(body);
  // A sash or belt in a contrasting colour.
  const belt = mesh(G.torso, M(pick(rng, ['#e0b347', '#7a2a1c', '#2f9c9a', '#3a2a1e'])));
  belt.scale.set(w * 1.68, H * 0.035, w * 1.28);
  belt.position.y = legLen + H * 0.02;
  g.add(belt);

  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(sx * w * 1.55, legLen + torsoLen * 0.95, 0);
    const arm = mesh(G.limb, cloth);
    arm.scale.set(w * 0.55, torsoLen * 1.05, w * 0.55);
    sh.add(arm);
    const hand = mesh(G.head, skin);
    hand.scale.setScalar(w * 0.32);
    hand.position.y = -torsoLen * 1.08;
    sh.add(hand);
    sh.rotation.z = sx * 0.08;
    g.add(sh);
    arms.push(sh);
  }

  const headY = legLen + torsoLen + headR * 1.05;
  const head = mesh(G.head, skin, true);
  head.scale.set(headR, headR * 1.1, headR);
  head.position.y = headY;
  g.add(head);
  const hairC = M(pick(rng, HAIR));
  const add = (geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    const m = mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
    g.add(m);
    return m;
  };

  if (race === 'dragonborn') {
    head.scale.set(headR * 1.05, headR * 1.05, headR * 1.15);
    add(G.box, skin, 0, headY - headR * 0.2, -headR * 1.1, headR * 0.9, headR * 0.7, headR * 1.3);
    for (const sx of [-1, 1]) add(G.cone, M('#e8dcc4'), sx * headR * 0.45, headY + headR * 0.4, headR * 0.6, headR * 0.18, headR * 1.4, headR * 0.18, 1.1, 0, 0);
    add(G.cone, skin, 0, legLen * 0.9, w * 1.0, w * 0.4, legLen * 0.8, w * 0.4, 2.3, 0, 0);   // tail
  } else if (race === 'tiefling') {
    const hornC = M(pick(rng, ['#2a1d1a', '#4a3a30', '#1a1414', '#d8ccb8']));
    for (const sx of [-1, 1]) {
      add(G.cone, hornC, sx * headR * 0.5, headY + headR * 0.6, 0, headR * 0.22, headR * 0.6, headR * 0.22, 0.4, 0, -sx * 0.5);
      add(G.cone, hornC, sx * headR * 0.85, headY + headR * 1.0, headR * 0.35, headR * 0.15, headR * 0.6, headR * 0.15, 1.3, 0, -sx * 0.3);
    }
    add(G.cone, skin, 0, legLen * 0.95, w * 0.9, w * 0.18, legLen * 0.95, w * 0.18, 2.5, 0, 0);
    add(G.head, hairC, 0, headY + headR * 0.35, headR * 0.15, headR * 1.02, headR * 0.75, headR * 1.02);
  } else if (race === 'elf') {
    for (const sx of [-1, 1]) add(G.cone, skin, sx * headR * 0.95, headY + headR * 0.1, 0, headR * 0.18, headR * 0.9, headR * 0.12, 0, 0, -sx * 1.2);
    add(G.head, hairC, 0, headY + headR * 0.25, headR * 0.25, headR * 1.05, headR * 0.95, headR * 1.08);
    add(G.box, hairC, 0, headY - headR * 0.8, headR * 0.7, headR * 1.4, headR * 2.2, headR * 0.3);
  } else if (race === 'orc') {
    for (const sx of [-1, 1]) add(G.cone, M('#efe6d2'), sx * headR * 0.35, headY - headR * 0.55, -headR * 0.85, headR * 0.1, headR * 0.35, headR * 0.1);
    add(G.head, hairC, 0, headY + headR * 0.5, headR * 0.2, headR * 0.35, headR * 0.6, headR * 1.0);
  } else if (race === 'dwarf') {
    add(G.cone, hairC, 0, headY - headR * 0.2, -headR * 0.75, headR * 0.85, -headR * 2.4, headR * 0.6);
    add(G.head, hairC, 0, headY + headR * 0.35, headR * 0.1, headR * 1.03, headR * 0.75, headR * 1.03);
  } else if (race === 'gnome') {
    add(G.cone, M(pick(rng, ['#b8382b', '#2e6c8e', '#5f8a3a', '#8e3b6c'])), 0, headY + headR * 0.6, 0, headR * 1.05, headR * 2.6, headR * 1.05, 0.25, 0, 0);
    add(G.head, M('#e8e4dc'), 0, headY - headR * 0.55, -headR * 0.6, headR * 0.6, headR * 0.45, headR * 0.4);
  } else if (race === 'halfling') {
    add(G.head, hairC, 0, headY + headR * 0.35, headR * 0.1, headR * 1.1, headR * 0.85, headR * 1.1);
  } else if (role === 'steward') {
    // A tall hat of office.
    add(G.torso, M('#4b1f6b'), 0, headY + headR * 0.5, 0, headR * 1.1, headR * 2.2, headR * 1.1);
    add(G.torso, M('#e0b347', { metalness: 0.6, roughness: 0.3 }), 0, headY + headR * 0.5, 0, headR * 1.15, headR * 0.35, headR * 1.15);
    add(G.cone, hairC, 0, headY - headR * 0.3, -headR * 0.8, headR * 0.5, -headR * 1.4, headR * 0.35);
  } else if (rng() < 0.6 && ['local', 'merchant', 'shopper', 'guard', 'scribe'].includes(role)) {
    // A head wrap, the way many Sultanate locals dress against the sun.
    add(G.head, M(role === 'guard' ? '#f3ede0' : pick(rng, LOCAL_ROBES.concat(RICH))), 0, headY + headR * 0.35, 0, headR * 1.18, headR * 0.9, headR * 1.18);
    if (role === 'guard') add(G.head, M('#e0b347', { metalness: 0.6, roughness: 0.3 }), 0, headY + headR * 0.6, -headR * 1.0, headR * 0.22, headR * 0.22, headR * 0.12);
  } else {
    add(G.head, hairC, 0, headY + headR * 0.3, headR * 0.12, headR * 1.04, headR * 0.8, headR * 1.04);
  }

  // Things they carry.
  if (role === 'dockhand' && rng() < 0.6) {
    const crate = add(G.box, M('#8a6a44'), 0, headY + headR * 1.6, 0, 0.6, 0.45, 0.5);
    crate.castShadow = true;
    arms.forEach(a => { a.rotation.x = Math.PI; a.userData.fixed = true; });
  }
  if (role === 'guard') {
    add(G.box, M('#5a3e24'), w * 1.9, H * 0.55, -0.1, 0.05, H * 1.15, 0.05);
    add(G.cone, M('#c8c8cc', { metalness: 0.8, roughness: 0.3 }), w * 1.9, H * 1.12, -0.1, 0.06, 0.3, 0.06);
    body.material = M('#2f9c9a');
  }
  if (role === 'adventurer' && rng() < 0.7) {
    add(G.box, M('#5a5a60', { metalness: 0.7, roughness: 0.4 }), -w * 1.6, legLen * 0.8, 0.05, 0.05, legLen * 0.75, 0.12, 0, 0, 0.3);
  }
  if (role === 'steward') {
    // Gold sash and a staff of office topped with a blue stone.
    belt.material = M('#e0b347', { metalness: 0.5, roughness: 0.35 });
    arms.forEach(a => { a.children[0].material = M('#4b1f6b'); });
    // A gold collar and a gold hem on the robe.
    add(G.torso, M('#e0b347', { metalness: 0.5, roughness: 0.35 }), 0, legLen + torsoLen * 0.88, 0, w * 1.75, H * 0.05, w * 1.35);
    add(G.torso, M('#e0b347', { metalness: 0.5, roughness: 0.35 }), 0, 0.05, 0, w * 1.72, H * 0.04, w * 1.52);
    add(G.box, M('#e0b347', { metalness: 0.6, roughness: 0.3 }), w * 1.9, H * 0.6, -0.1, 0.06, H * 1.2, 0.06);
    add(G.head, M('#7fe0ff'), w * 1.9, H * 1.22, -0.1, 0.1, 0.1, 0.1);
  }
  if (role === 'scribe') {
    arms.forEach(a => { a.rotation.x = -0.9; a.userData.fixed = true; });
  }
  if (role === 'pilot') {
    const lantern = add(G.head, new THREE.MeshBasicMaterial({ color: '#c58bff' }), w * 1.6, legLen * 0.9, -0.15, 0.08, 0.1, 0.08);
    lantern.userData.glow = true;
  }

  const label = role === 'steward' ? 'Xi, Steward of Sultan\'s Rest' : `${RACE_NAMES[race]} ${roleName(role, race)}`;
  g.userData = { legs, arms, H, label };
  return g;
}

function roleName(role, race) {
  return {
    local: inMeridia ? 'of Meridia' : 'of Sultan\'s Rest', merchant: 'merchant', sailor: 'sailor', dockhand: 'dockhand',
    adventurer: 'adventurer', shopper: 'out shopping', traveler: 'traveler', guard: 'palace guard',
    pilot: 'harbor pilot of the warded passage', scribe: 'scribe of the palace',
  }[role] || role;
}

// Where people wander (x0, x1, z0, z1), how many, and what they're doing there.
// Where the crowd walks in Meridia (Chapter Two): the harbor's working district, the avenue up through the gates,
// the market, and the streets of the outer and middle rings (the inner ring is quieter).
const MERIDIA_ZONES = [
  { name: 'quay', box: [-190, 190, 1.2, 12], n: 26, roles: ['sailor', 'dockhand', 'dockhand', 'merchant', 'traveler', 'local'] },
  { name: 'works', box: [-180, 180, 36, 100], n: 14, roles: ['dockhand', 'dockhand', 'local', 'sailor'] },
  { name: 'avenue', box: [-6, 6, 30, 190], n: 12, roles: ['local', 'shopper', 'traveler', 'guard'] },
  { name: 'market', box: [-40, 40, 140, 175], n: 22, roles: ['shopper', 'shopper', 'local', 'merchant', 'traveler'] },
  { name: 'outer streets', box: [-150, 150, 95, 230], n: 16, roles: ['local', 'local', 'dockhand', 'traveler'] },
  { name: 'hilltop', box: [-50, 50, 200, 300], n: 8, roles: ['merchant', 'local', 'guard'] },
];
const SULTANS_ZONES = [
  { name: 'quay', box: [-170, 88, 1.2, 9], n: 26, roles: ['sailor', 'dockhand', 'merchant', 'traveler', 'adventurer', 'local', 'pilot'] },
  { name: 'market', box: [-36, 36, 8, 44], n: 26, roles: ['shopper', 'shopper', 'local', 'traveler', 'adventurer', 'merchant', 'sailor'] },
  { name: 'guilds', box: [-165, 80, 8, 14], n: 10, roles: ['adventurer', 'merchant', 'traveler', 'sailor'] },
  { name: 'avenue', box: [-6, 6, 44, 240], n: 10, roles: ['local', 'shopper', 'traveler'] },
  // The back streets (the user, 2026-11-04: the front was busy, the streets behind it empty). Twelve neighbourhoods,
  // four walkers each, who stay around their own streets; every other one has a guard on his rounds.
  ...[[-170, -90], [-90, -12], [12, 90], [90, 170]].flatMap(([x0, x1], i) => [[40, 130], [130, 210], [210, 285]].map(([z0, z1], j) => ({
    name: 'streets', box: [x0, x1, z0, z1], n: 4, roles: (i + j) % 2 ? ['local', 'local', 'shopper', 'traveler', 'guard'] : ['local', 'local', 'shopper', 'traveler', 'dockhand'] }))),
  { name: 'palace garden', box: [100, 170, -12, 38], n: 6, roles: ['local', 'merchant', 'guard'] },
];
const ZONES = inMeridia ? MERIDIA_ZONES : SULTANS_ZONES;

function randomPoint(z) {
  for (let i = 0; i < 20; i++) {
    let x, zz;
    if (z.pier) {
      x = z.pier.x + range(rng, -z.pier.w / 2 + 0.6, z.pier.w / 2 - 0.6);
      zz = range(rng, z.pier.z0 + 1, -0.5);
    } else {
      const [x0, x1, z0, z1] = z.box;
      x = range(rng, x0, x1); zz = range(rng, z0, z1);
    }
    if (walkable(x, zz, 0.3) && street(x, zz)) return new THREE.Vector2(x, zz);
  }
  return null;
}

export function buildPeople(scene, lookables) {
  const { stalls, posts } = scene.userData;
  const npcs = [];
  const zones = [...ZONES, ...PIERS.map(p => ({ name: 'pier', pier: p, n: 3, roles: ['sailor', 'dockhand', 'dockhand', 'pilot'] }))];
  for (const z of zones) {
    for (let i = 0; i < z.n; i++) {
      const p = randomPoint(z);
      if (!p) continue;
      const role = pick(rng, z.roles);
      const race = role === 'pilot' ? 'tiefling' : pickRace();
      const g = makePerson(race, role);
      g.position.set(p.x, footHeight(p.x, p.y), p.y);
      scene.add(g);
      npcs.push({ g, zone: z, target: randomPoint(z), speed: range(rng, 1.0, 1.6) * (RACES[race].h < 1.2 ? 0.8 : 1), wait: range(rng, 0, 3), phase: rng() * 10 });
      lookables.push({ object: g, label: g.userData.label, radius: 0.6, person: true, npc: { kind: role === 'guard' ? 'guard' : 'crowd', role, label: g.userData.label } });
    }
  }
  // Merchants standing behind their stalls, and guards who don't move.
  const still = [];
  for (const s of stalls) {
    const g = makePerson(pickRace(), 'merchant');
    g.position.set(s.x + range(rng, -1, 1), footHeight(s.x, s.z), s.z - 0.2);
    g.rotation.y = 0;         // behind the table, facing the aisle toward the sea
    scene.add(g);
    still.push({ g, phase: rng() * 10, talker: true, next: range(rng, 0, 8) });
    const label = g.userData.label.replace('merchant', 'stallkeeper');
    lookables.push({ object: g, label, radius: 0.6, person: true, npc: { kind: 'stall', stall: s, label } });
  }
  // Everyone with a fixed post: guards at the statue and the gates, the palace's people.
  const spots = [{ x: -4.5, z: 33, ry: 0, role: 'guard', race: 'human' }, { x: 4.5, z: 33, ry: 0, role: 'guard', race: 'human' }, ...posts];
  for (const p of spots) {
    const g = makePerson(p.race || pickRace(), p.role, p.body);
    g.position.set(p.x, footHeight(p.x, p.z), p.z);
    g.rotation.y = p.ry;
    if (p.scale) g.scale.setScalar(p.scale);           // a child (Pia, sidework.js)
    if (p.label) g.userData.label = p.label;
    g.userData.post = p;
    scene.add(g);
    still.push({ g, phase: rng() * 10, sitting: !!p.sit, talker: !p.sit && (p.role === 'merchant' || p.role === 'traveler' || p.role === 'steward'), next: range(rng, 0, 8) });
    if (p.sit && g.userData.play) { g.userData.play('sit', 0); seat(g, p); }
    lookables.push({ object: g, label: g.userData.label, radius: 0.6, person: true, npc: { ...(p.npc || { kind: p.role === 'guard' ? 'guard' : 'crowd' }), role: p.role, label: g.userData.label } });
  }

  // Someone sitting: the sitting pose puts the hips 0.2-0.5 m in front of where they stand and at a height that
  // depends on their size, so they hovered beside their stools (the user's play test). Measure the pose once,
  // then move them so the hips are over the seat (the post's x, z) and just above its top (p.seat, default 0.5 m).
  function seat(g, p) {
    g.userData.mixer?.update(0.5);
    g.updateMatrixWorld(true);
    let pelvis = null;
    g.traverse(b => { if (!pelvis && b.isBone && /pelvis|hips/i.test(b.name)) pelvis = b; });
    if (!pelvis) return;
    const w = new THREE.Vector3(); pelvis.getWorldPosition(w);
    g.position.x -= w.x - p.x; g.position.z -= w.z - p.z;
    const floor = footHeight(g.position.x, g.position.z);
    g.userData.sitLift = (p.seat ?? 0.5) + 0.08 - (w.y - g.position.y);
    g.position.y = floor + g.userData.sitLift;
  }

  // Play walking or standing; only people near you are animated (and drawn), which keeps it fast.
  function animate(g, moving, n, t, dt, player) {
    const ud = g.userData;
    const dist = Math.hypot(player.x - g.position.x, player.z - g.position.z);
    g.visible = dist < 170;
    if (ud.mixer) {
      if (!n.talking && !n.sitting) ud.play(moving ? 'walk' : 'idle');
      if (dist < 90) ud.mixer.update(dt * (moving ? n.speed / 1.3 : 1));
    } else {
      const swing = moving ? Math.sin((t + n.phase) * n.speed * 6) * 0.55 : 0;
      ud.legs[0].rotation.x += (swing - ud.legs[0].rotation.x) * 0.3;
      ud.legs[1].rotation.x += (-swing - ud.legs[1].rotation.x) * 0.3;
      for (const [i, a] of ud.arms.entries()) if (!a.userData.fixed) a.rotation.x += ((i ? swing : -swing) * 0.7 - a.rotation.x) * 0.3;
    }
  }

  const pos = new THREE.Vector2();
  return (t, dt, player) => {
    for (const n of npcs) {
      const g = n.g;
      let moving = false;
      if (n.wait > 0) n.wait -= dt;
      else if (!n.target) { n.target = randomPoint(n.zone); n.wait = 1; }
      else {
        pos.set(g.position.x, g.position.z);
        const to = n.target.clone().sub(pos);
        const dist = to.length();
        const near = Math.hypot(player.x - g.position.x, player.z - g.position.z) < 0.9;
        if (dist < 0.4) { n.target = randomPoint(n.zone); n.wait = range(rng, 0.5, 5); }
        else if (!near) {
          to.normalize();
          const step = Math.min(dist, n.speed * dt);
          const nx = g.position.x + to.x * step, nz = g.position.z + to.y * step;
          if (walkable(nx, nz, 0.25) && street(nx, nz)) {
            g.position.x = nx; g.position.z = nz;
            moving = true;
          } else { n.target = randomPoint(n.zone); n.wait = range(rng, 0.2, 1.5); }
          // Turn smoothly toward where they're going (a person faces -z before turning).
          const want = Math.atan2(to.x, to.y) + Math.PI;
          let d = want - g.rotation.y;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          g.rotation.y += d * Math.min(1, dt * 6);
        }
      }
      g.position.y = footHeight(g.position.x, g.position.z);
      animate(g, moving, n, t, dt, player);
    }
    for (const s of still) {
      if (s.g.userData.mixer) {
        // Stallkeepers and petitioners gesture now and then; everyone else stands.
        if (s.talker && (s.next -= dt) <= 0) {
          s.talking = !s.talking;
          s.g.userData.play(s.talking ? 'talk' : 'idle', 0.4);
          s.next = s.talking ? range(rng, 1.5, 3) : range(rng, 4, 12);
        }
        animate(s.g, false, s, t, dt, player);
      } else {
        // A little breathing and shifting so they don't look frozen.
        s.g.userData.arms[0].rotation.x = Math.sin(t * 0.8 + s.phase) * 0.12;
        s.g.position.y = footHeight(s.g.position.x, s.g.position.z) + (s.g.userData.sitLift || 0) + Math.sin(t * 1.6 + s.phase) * 0.008;
      }
    }
  };
}
