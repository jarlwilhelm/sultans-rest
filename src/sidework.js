// Sultan's Rest side errands in the world: the nine people at their front doors (pins from the user's map,
// docs/sultans-rest-pins.md), and the things you find for them: Kadir's pigeon at the King's feet, the deed in
// the Merchants' Guild, the boarded-up house next to Benedek's. What they say: game/sidequests.js.
import * as THREE from 'three';
import { HOUSES } from './city.js';
import { groundHeight } from './land.js';
import { prop } from './interiors.js';
import { readables } from './signs.js';
import { talk } from './game/ui.js';
import { PEOPLE, pigeonHere, catchPigeon, deedHere, readDeed, lookThroughBoards } from './game/sidequests.js';
import { PLAYERS } from './game/players.js';
import { HOMES, knock } from './game/homes.js';

// The house nearest a map pin.
export function houseAt(x, z) {
  let best = null, bd = Infinity;
  for (const h of HOUSES) { const d = Math.hypot(h.x - x, h.z - z); if (d < bd) { bd = d; best = h; } }
  return best;
}
// A spot in front of a house's door: `across` metres along the wall, `out` metres into the street.
function before(h, across = 0, out = 1.4) {
  const c = Math.cos(h.ry), s = Math.sin(h.ry);
  const ox = across, oz = -h.d / 2 - out;
  return { x: h.x + ox * c + oz * s, z: h.z - ox * s + oz * c };
}
// Something you press E on (shows a conversation panel).
function thing(x, y, z, title, verb, when, action) {
  readables.push({ pos: new THREE.Vector3(x, y, z), title, verb, when, action: () => talk(action()) });
}

export function buildSideErrands(scene) {
  const posts = scene.userData.posts;
  const homes = scene.userData.shops || {};
  // Inside their own house (shoplist.js HOUSE_PINS): standing in the middle, facing the door.
  const indoors = (h, dx = 0) => ({ x: h.x + dx, z: h.z + 0.6, ry: 0 });
  for (const [id, p] of Object.entries(PEOPLE)) {
    const inside = homes[id];
    if (inside) {
      const base = { role: p.role, race: p.race, body: p.body, scale: p.scale };
      if (id === 'brothers') {
        posts.push({ ...base, ...indoors(inside, -1.1), label: 'Omar', npc: { kind: 'side', id, sub: 'omar' } });
        posts.push({ ...base, ...indoors(inside, 1.1), label: 'Yusuf', npc: { kind: 'side', id, sub: 'yusuf' } });
      } else posts.push({ ...base, ...indoors(inside), label: p.title, npc: { kind: 'side', id } });
      HOME_THINGS[id]?.(scene, inside);
      continue;
    }
    const h = houseAt(...p.pin);
    if (!h) continue;
    const base = { ry: h.ry, role: p.role, race: p.race, body: p.body, scale: p.scale, label: p.title };
    if (id === 'brothers') {
      // Two brothers, one at each end of the wall they're fighting over.
      const a = before(h, -h.w / 4, 1.2), b = before(h, h.w / 4, 1.2);
      posts.push({ ...base, ...a, ry: h.ry - 0.5, label: 'Omar', npc: { kind: 'side', id, sub: 'omar' } });
      posts.push({ ...base, ...b, ry: h.ry + 0.5, label: 'Yusuf', npc: { kind: 'side', id, sub: 'yusuf' } });
      continue;
    }
    const at = { x: h.front[0], z: h.front[1] };
    posts.push({ ...base, ...at, npc: { kind: 'side', id } });
    if (id === 'pia') {
      // Her tea stall: an upturned crate with a kettle and cups, in front of her.
      const c = before(h, 0, 2.6);
      const y = groundHeight(c.x, c.z);
      prop(scene, 'Crate', c.x, y, c.z, { h: 0.6, ry: h.ry });
      prop(scene, 'Pot_Small', c.x - 0.1, y + 0.6, c.z, { h: 0.22 });
      for (const k of [-1, 1]) prop(scene, 'Chalice', c.x + 0.22 * k, y + 0.6, c.z + 0.12, { h: 0.12 });
    }
    if (id === 'hesper') {
      const c = before(h, 0.8, 1.5);
      prop(scene, 'Stool', c.x, groundHeight(c.x, c.z), c.z, { h: 0.45 });
      prop(scene, 'Torch', c.x + 0.5, groundHeight(c.x, c.z), c.z, { h: 0.6 });
    }
  }

  // The street players (game/players.js): each at their door, with what they play on.
  for (const [id, p] of Object.entries(PLAYERS)) {
    const inside = homes[id];
    if (inside) {
      posts.push({ ...indoors(inside), role: p.role, race: p.race, body: p.body, label: p.title, npc: { kind: 'player', id } });
      const y = inside.fy, cx = inside.x, cz = inside.z - 0.6;
      if (p.props === 'board' || p.props === 'cups') {
        prop(scene, 'Crate', cx, y, cz, { h: 0.7 });
        if (p.props === 'board') for (const k of [-1, 1]) prop(scene, 'Stool', cx + k * 0.9, y, cz, { h: 0.45 });
        else for (const k of [-1, 0, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.13, 10), new THREE.MeshStandardMaterial({ color: '#b07a4a', roughness: 0.8 })); cup.position.set(cx + k * 0.2, y + 0.77, cz); scene.add(cup); }
      }
      if (p.props === 'barrel') prop(scene, 'Barrel', cx, y, cz, { h: 0.95 });
      if (p.props === 'target') ['#5a3f26', '#f3ede0', '#2e6c8e', '#f3ede0', '#b8382b'].forEach((col, i) => {
        const r = 0.55 - i * 0.11;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 24), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
        disc.rotation.z = Math.PI / 2; disc.position.set(inside.x1 - 0.05 - i * 0.012, y + 1.5, inside.z); scene.add(disc);   // on the side wall
      });
      continue;
    }
    const h = houseAt(...p.pin);
    if (!h) continue;
    posts.push({ x: h.front[0], z: h.front[1], ry: h.ry, role: p.role, race: p.race, body: p.body, label: p.title, npc: { kind: 'player', id } });
    const c = before(h, 0, 2.8), y = groundHeight(c.x, c.z);
    if (p.props === 'board' || p.props === 'cups') {
      prop(scene, 'Crate', c.x, y, c.z, { h: 0.7, ry: h.ry });
      if (p.props === 'board') for (const k of [-1, 1]) prop(scene, 'Stool', c.x + k * 0.9, groundHeight(c.x + k * 0.9, c.z), c.z, { h: 0.45 });
      else for (const k of [-1, 0, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.13, 10), new THREE.MeshStandardMaterial({ color: '#b07a4a', roughness: 0.8 }));
        cup.position.set(c.x + k * 0.2, y + 0.77, c.z); scene.add(cup);
      }
    }
    if (p.props === 'barrel') prop(scene, 'Barrel', c.x, y, c.z, { h: 0.95 });
    if (p.props === 'target') {
      // A painted board on her wall, beside the door.
      const w = before(h, Math.min(2.2, h.w / 2 - 0.8), 0.06);
      ['#5a3f26', '#f3ede0', '#2e6c8e', '#f3ede0', '#b8382b'].forEach((col, i) => {
        const r = 0.55 - i * 0.11;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 24), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
        disc.rotation.x = Math.PI / 2; disc.rotation.z = 0; disc.rotation.y = h.ry;
        disc.position.set(w.x, h.doorY + 1.5, w.z - i * 0.012); scene.add(disc);
      });
    }
  }

  // The ten homes (game/homes.js): a door to knock on, someone out front at a few, small signs of life.
  for (const [id, home] of Object.entries(HOMES)) {
    const h = houseAt(...home.pin);
    if (!h) continue;
    thing(h.doorX, h.doorY + 1.3, h.doorZ - 0.25, `${home.family}'s door`, 'Knock', null, () => knock(id));
    // Measured from the door (it isn't always in the middle of the wall): things go beside it, never in front.
    const dox = (h.doorX - h.x) * Math.cos(h.ry) - (h.doorZ - h.z) * Math.sin(h.ry);
    const side = dox + (dox + 1.9 < h.w / 2 - 0.3 ? 1.9 : -1.9);
    const r = home.resident;
    if (home.detail === 'bench' || r?.sit) {
      const b = before(h, side, 0.9);
      prop(scene, 'Bench_1', b.x, groundHeight(b.x, b.z), b.z, { len: 1.6, ry: h.ry });
      if (r) posts.push({ ...b, ry: h.ry, role: r.role, race: r.race, body: r.body, sit: true, seat: 0.45, label: r.name, npc: { kind: 'home', id } });
    } else if (r) {
      const p = before(h, dox - (side - dox) * 0.6, 1.6);
      posts.push({ ...p, ry: h.ry, role: r.role, race: r.race, body: r.body, label: r.name, npc: { kind: 'home', id } });
    }
    if (home.detail === 'pots') for (const k of [-1, 1]) { const q = before(h, dox + k * 1.05, 0.35); prop(scene, 'Houseplant_2', q.x, groundHeight(q.x, q.z), q.z, { h: 0.7 }); }
    if (home.detail === 'barrels') { const q = before(h, side, 0.6); prop(scene, 'Barrel', q.x, groundHeight(q.x, q.z), q.z, { h: 0.85 }); prop(scene, 'Bags', q.x + Math.sign(side - dox) * 0.7, groundHeight(q.x - 0.7, q.z), q.z, { h: 0.5 }); }
    if (home.detail === 'cart') { const q = before(h, side + 0.4, 1.8); prop(scene, 'Cart', q.x, groundHeight(q.x, q.z), q.z, { len: 2.2, ry: h.ry + Math.PI / 2 }); }
    if (home.detail === 'laundry') {
      // A line between two poles along the front, with washing on it.
      const a = before(h, -h.w / 2 + 0.4, 1.0), b = before(h, h.w / 2 - 0.4, 1.0), y0 = groundHeight(a.x, a.z);
      const pole = new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 1 });
      for (const q of [a, b]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6), pole); m.position.set(q.x, groundHeight(q.x, q.z) + 1.05, q.z); scene.add(m); }
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, len, 4), pole);
      rope.position.set((a.x + b.x) / 2, y0 + 2.0, (a.z + b.z) / 2); rope.rotation.z = Math.PI / 2; rope.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); scene.add(rope);
      ['#b8382b', '#e9e2cf', '#2e6c8e', '#d7a33a', '#e9e2cf'].forEach((c, i) => {
        const k = (i + 0.7) / 5.4, cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
        cloth.position.set(a.x + (b.x - a.x) * k, y0 + 1.62, a.z + (b.z - a.z) * k); cloth.rotation.y = h.ry; scene.add(cloth);
      });
    }
  }

  // The empty condemned house (pin 31, next to Benedek's): boards over the door, and nothing inside. On purpose.
  const empty = houseAt(-164, 139);
  if (empty) {
    const wood = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 1 });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.06), wood);
      b.position.set(empty.doorX, empty.doorY + 0.6 + i * 0.65, empty.doorZ - 0.12);
      b.rotation.set(0, empty.ry, (i - 1) * 0.35);
      scene.add(b);
    }
    thing(empty.doorX, empty.doorY + 1.4, empty.doorZ - 0.2, 'A boarded-up house', 'Look through the boards', null, lookThroughBoards);
  }

  // Kadir's pigeon: at the feet of King Shou's statue in the market square, at dawn.
  const sb = scene.userData.statueBase;
  if (sb) {
    const bird = new THREE.Group();
    const grey = new THREE.MeshStandardMaterial({ color: '#8a8d94', roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), grey); body.scale.set(1, 0.85, 1.4); bird.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), grey); head.position.set(0, 0.11, 0.13); bird.add(head);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 4, 10), new THREE.MeshStandardMaterial({ color: '#c0281c' }));
    ring.position.set(0.04, -0.1, 0); ring.rotation.x = Math.PI / 2; bird.add(ring);
    const y = sb.y - 4 + 0.6 + 0.11;                          // on the plinth's step (sb.y is 4 m above its foot), facing the square
    bird.position.set(sb.x - 1.2, y, sb.z - 3.3);
    bird.rotation.y = Math.PI;
    bird.visible = false;
    scene.add(bird);
    setInterval(() => { bird.visible = pigeonHere(); }, 1000);
    thing(bird.position.x, y, bird.position.z, 'A grey pigeon', 'Pick up the pigeon', pigeonHere, catchPigeon);
  }

  // The deed: a box of old papers on the Merchants' Guild's shelves (only while you're looking for it).
  const m = scene.userData.shells?.merchants;
  if (m) {
    const x = m.x0 + 1.0, z = m.z0 + 1.5 + 2.1 * 2;
    prop(scene, 'Scroll', x, m.fy + 1.05, z, { h: 0.12 });
    thing(x, m.fy + 1.1, z, 'Old deeds, filed under H', 'Search the old deeds', deedHere, readDeed);
  }
}

// Each person's own things in their house (the furniture is shops.js homeDress).
const HOME_THINGS = {
  tamsin(scene, h) {      // a heap of torn canvas by her chair
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.9), new THREE.MeshStandardMaterial({ color: '#efe8d6', roughness: 1 }));
    m.position.set(h.x - 1.4, h.fy + 0.17, h.z + 0.4); m.rotation.y = 0.3; scene.add(m);
  },
  kadir(scene, h) {       // pigeon cages on the shelf wall
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1, wireframe: true })); c.position.set(h.x1 - 0.4, h.fy + 0.25 + i * 0.45, h.z0 + 1.2); scene.add(c); }
  },
  zahra(scene, h) { prop(scene, 'Pot', h.x0 + 1.3, h.fy + 0.8, h.z1 - 1.6, { h: 0.3 }); prop(scene, 'Pan', h.x + 1.2, h.fy, h.z0 + 1.0, { len: 0.5 }); },
  cyrus(scene, h) {       // his pots along the wall, and a wheel
    for (let i = 0; i < 5; i++) prop(scene, i % 2 ? 'Pot' : 'Pot_Small', h.x - 1.6 + i * 0.6, h.fy, h.z0 + 0.7, { h: i % 2 ? 0.45 : 0.3 });
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.6, 16), new THREE.MeshStandardMaterial({ color: '#7a5838', roughness: 1 }));
    wheel.position.set(h.x + 1.5, h.fy + 0.3, h.z + 0.5); scene.add(wheel);
  },
  dalia(scene, h) { prop(scene, 'Scroll', h.x0 + 1.3, h.fy + 0.8, h.z1 - 1.6, { len: 0.3 }); },
  benedek(scene, h) { for (const k of [-1, 1]) prop(scene, 'Torch', h.x + k * 1.6, h.fy, h.z0 + 0.8, { h: 1.2 }); },   // he keeps the lights on
};
