// Your greenhouse: the Store Add-on's building beside your store in Sultan's Rest (2026-11-04, the user: 'make it
// where you can go inside, like a little green house, you can pick produce, more than just cabbage').
// Glass on a wooden frame, a door on the sea side, an aisle down the middle and five beds. Every bed ripens again
// each morning; pick it and the produce goes into your pack (what doesn't fit stays on the plants until you
// come back that day). Wording and amounts are a DRAFT by Claude.
import * as THREE from 'three';
import { groundHeight, addFloor } from './land.js';
import { prop } from './interiors.js';
import { state, save, packRoom, note } from './game/state.js';
import { GOODS } from './game/economy.js';
import { toast, updateStatus } from './game/ui.js';

// What grows, how much is ripe each morning, and what it looks like.
const BEDS = [
  { good: 'cabbage', n: 6, side: -1, slot: 0, plant: 'Lettuce_4', h: 0.35 },
  { good: 'carrot', n: 6, side: -1, slot: 1, plant: 'Carrot_4', h: 0.3 },
  { good: 'tomato', n: 5, side: -1, slot: 2, fruit: 'Tomato_Harvested', fh: 0.12, vine: true },
  { good: 'pumpkin', n: 3, side: 1, slot: 0.5, fruit: 'Pumpkin_Harvested', fh: 0.42, ground: true },
  { good: 'melon', n: 3, side: 1, slot: 1.75, fruit: 'Watermelon_Harvested', fh: 0.36, ground: true },
];

// The fruit, drawn here (the pack's 'Harvested' models are only the leafy vines).
const RED = new THREE.MeshStandardMaterial({ color: '#d8352a', roughness: 0.45 });
const ORANGE = new THREE.MeshStandardMaterial({ color: '#e0812a', roughness: 0.7, flatShading: true });
const STEM = new THREE.MeshStandardMaterial({ color: '#5a6a2a', roughness: 0.9 });
const STRIPES = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 16;
  const g = c.getContext('2d'); g.fillStyle = '#3f7a33'; g.fillRect(0, 0, 64, 16);
  g.fillStyle = '#1f4a22'; for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 16);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
})();
const TOMATO = new THREE.SphereGeometry(0.06, 10, 8);
const MELON = new THREE.SphereGeometry(1, 16, 10).scale(0.15, 0.12, 0.22);
// A pumpkin: a squashed ball with ribs (the radius dips between 8 lobes).
const PUMPKIN = (() => {
  const g = new THREE.SphereGeometry(1, 24, 12), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x), rib = 1 - 0.09 * Math.pow(Math.abs(Math.cos(a * 4)), 0.6);
    p.setXYZ(i, v.x * rib * 0.2, v.y * 0.14, v.z * rib * 0.2);
  }
  g.computeVertexNormals();
  return g;
})();

function today() {
  const g = state.greenhouse;
  if (g?.day !== state.day) state.greenhouse = { day: state.day, left: Object.fromEntries(BEDS.map(b => [b.good, b.n])) };
  return state.greenhouse;
}

// x0..x1, z0..z1: the footprint; the door is in the middle of the z0 (sea) side.
export function buildGreenhouse(group, { x0, x1, z0, z1 }) {
  const cx = (x0 + x1) / 2;
  let gMax = -Infinity, gMin = Infinity;
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [cx, (z0 + z1) / 2]]) { const g = groundHeight(px, pz); gMax = Math.max(gMax, g); gMin = Math.min(gMin, g); }
  const fy = gMax + 0.12, base = gMin - 0.4, H = 2.7, ridge = 1.3, doorW = 1.3;
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.85 });
  const white = new THREE.MeshStandardMaterial({ color: '#efe8da', roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: '#cfe8e0', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const soil = new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#4f8a3a', roughness: 0.9, flatShading: true });
  const add = (geo, mat, px, py, pz, { ry = 0, rx = 0, rz = 0, shadow = true } = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz);
    m.castShadow = shadow; m.receiveShadow = true; group.add(m); return m;
  };
  const boxAt = (mat, ax0, ax1, ay0, ay1, az0, az1, shadow = true) => add(new THREE.BoxGeometry(ax1 - ax0, ay1 - ay0, az1 - az0), mat, (ax0 + ax1) / 2, (ay0 + ay1) / 2, (az0 + az1) / 2, { shadow });
  const cols = [];
  const solid = (ax0, ax1, az0, az1) => cols.push({ x0: ax0, x1: ax1, z0: az0, z1: az1 });

  // Foundation (a low white base wall), floor, frame, glass.
  const t = 0.12;
  for (const [a0, a1, b0, b1] of [[x0, x1, z1 - t, z1], [x0, x0 + t, z0, z1], [x1 - t, x1, z0, z1], [x0, cx - doorW / 2, z0, z0 + t], [cx + doorW / 2, x1, z0, z0 + t]]) {
    boxAt(white, a0, a1, base, fy + 0.45, b0, b1);
    boxAt(glass, a0 + 0.02, a1 - 0.02, fy + 0.45, fy + H, b0 + 0.02, b1 - 0.02, false);
    solid(a0, a1, b0, b1);
  }
  boxAt(glass, cx - doorW / 2, cx + doorW / 2, fy + 2.25, fy + H, z0, z0 + t, false);           // over the door
  boxAt(new THREE.MeshStandardMaterial({ color: '#8a7a64', roughness: 1 }), x0 + t, x1 - t, base, fy, z0 + t, z1 - t);   // floor (gravel)
  addFloor(x0 + t, x1 - t, z0 - 0.5, z1 - t, fy);
  boxAt(white, cx - doorW / 2 - 0.2, cx + doorW / 2 + 0.2, base, fy, z0 - 0.5, z0 + t);           // the step at the door
  // Posts every ~1.6 m, a beam all round, rafters up to the ridge.
  const nz = Math.max(2, Math.round((z1 - z0) / 1.6));
  for (let i = 0; i <= nz; i++) {
    const pz = z0 + (z1 - z0) * i / nz;
    for (const px of [x0 + 0.05, x1 - 0.05]) boxAt(wood, px - 0.06, px + 0.06, fy, fy + H, pz - 0.06, pz + 0.06);
    // rafters
    const half = (x1 - x0) / 2, len = Math.hypot(half, ridge), ang = Math.atan2(ridge, half);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(len, 0.08, 0.08), wood, cx + s * half / 2, fy + H + ridge / 2, pz, { rz: -s * ang });
  }
  for (const px of [x0 + 0.05, x1 - 0.05]) boxAt(wood, px - 0.07, px + 0.07, fy + H - 0.08, fy + H + 0.04, z0, z1);
  for (const pz of [z0 + 0.05, z1 - 0.05]) boxAt(wood, x0, x1, fy + H - 0.08, fy + H + 0.04, pz - 0.07, pz + 0.07);
  boxAt(wood, cx - 0.06, cx + 0.06, fy + H + ridge - 0.06, fy + H + ridge + 0.06, z0, z1);        // ridge
  for (const px of [cx - doorW / 2 - 0.06, cx + doorW / 2 + 0.06]) boxAt(wood, px - 0.06, px + 0.06, fy, fy + 2.3, z0 - 0.02, z0 + 0.14);
  boxAt(wood, cx - doorW / 2 - 0.12, cx + doorW / 2 + 0.12, fy + 2.22, fy + 2.34, z0 - 0.02, z0 + 0.14);
  // Glass roof: two slopes, and the gable triangles front and back.
  { const half = (x1 - x0) / 2, len = Math.hypot(half, ridge), ang = Math.atan2(ridge, half);
    for (const s of [-1, 1]) add(new THREE.PlaneGeometry(len, z1 - z0), glass, cx + s * half / 2, fy + H + ridge / 2, (z0 + z1) / 2, { rx: -Math.PI / 2, ry: s * ang, shadow: false });
    const tri = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, ridge)]);
    for (const pz of [z0 + 0.06, z1 - 0.06]) add(new THREE.ShapeGeometry(tri), glass, cx, fy + H, pz, { shadow: false }); }

  // The beds: wooden boxes of soil along both walls, the aisle down the middle.
  const bedW = Math.min(1.3, (x1 - x0 - 2 * t - 1.3) / 2), bedZ0 = z0 + 1.3, bedLen = (z1 - t - 0.2 - bedZ0) / 3;
  const beds = [];
  const reads = [];
  for (const b of BEDS) {
    const bx = b.side < 0 ? x0 + t + 0.05 + bedW / 2 : x1 - t - 0.05 - bedW / 2;
    const len = b.ground ? bedLen * 1.5 : bedLen;
    const bz = bedZ0 + (b.ground ? b.slot * bedLen : b.slot * bedLen + bedLen / 2);
    const top = fy + 0.4;
    boxAt(wood, bx - bedW / 2, bx + bedW / 2, fy, top - 0.03, bz - len / 2 + 0.05, bz + len / 2 - 0.05);
    boxAt(soil, bx - bedW / 2 + 0.07, bx + bedW / 2 - 0.07, top - 0.06, top - 0.01, bz - len / 2 + 0.12, bz + len / 2 - 0.12, false);
    solid(bx - bedW / 2, bx + bedW / 2, bz - len / 2 + 0.05, bz + len / 2 - 0.05);
    const fruit = new THREE.Group(); group.add(fruit);
    beds.push({ ...b, bx, bz, len, top, grp: fruit, dressed: false });
    reads.push({ pos: new THREE.Vector3(bx - b.side * (bedW / 2 + 0.1), top + 0.5, bz), title: `${GOODS[b.good].name} bed`,
      get verb() { const n = today().left[b.good]; return n > 0 ? `Pick ${n} ${GOODS[b.good].name.toLowerCase()}` : 'Picked clean: more ripens by morning'; },
      action: () => pick(b) });
  }
  // A watering can and a lamp by the door.
  const lampM = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd38a' }));
  lampM.position.set(cx, fy + H + 0.5, (z0 + z1) / 2); group.add(lampM);

  // The plants (models load later: try until they're there).
  function dress() {
    // Wait until every model the beds need has loaded (they load one by one).
    if (!BEDS.every(b => prop(new THREE.Group(), b.plant || b.fruit, 0, 0, 0, { h: 0.3 }))) return false;
    let all = true;
    for (const b of beds) {
      if (b.dressed) continue;
      const g = b.grp, n = 6;
      let ok = true;
      for (let i = 0; i < n; i++) {
        const pz = b.bz - b.len / 2 + 0.3 + (b.len - 0.6) * i / (n - 1), px = b.bx + (i % 2 ? 0.25 : -0.25);
        if (b.plant) {
          const w = prop(g, b.plant, px, b.top - 0.02, pz, { h: b.h, ry: i * 1.3 });
          ok = !!w && ok;
          if (w && b.good === 'cabbage') w.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.set('#7fa850'); } });   // a fresher green
        } else if (b.vine) {
          // Tomatoes: a cane with the vine climbing it, red fruit hanging in the leaves.
          add(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 5), wood, px, b.top + 0.65, pz);
          ok = !!prop(group, b.fruit, px, b.top - 0.02, pz, { h: 1.1, ry: i }) && ok;
          for (let k = 0; k < 3; k++) {
            const tom = new THREE.Mesh(TOMATO, RED); tom.position.set(px + (k - 1) * 0.1, b.top + 0.4 + k * 0.28, pz + (k % 2 ? 0.1 : -0.08)); tom.castShadow = true; g.add(tom);
          }
        } else if (b.ground && i % 2 === 0) {
          // Pumpkins and melons: the vine on the soil, the fruit sitting in it.
          ok = !!prop(group, b.fruit, px, b.top - 0.02, pz, { h: 0.3, ry: i }) && ok;
          const f = new THREE.Mesh(b.good === 'pumpkin' ? PUMPKIN : MELON, b.good === 'pumpkin' ? ORANGE : STRIPES);
          f.position.set(px + 0.05, b.top + (b.good === 'pumpkin' ? 0.13 : 0.12), pz + 0.1); f.rotation.y = i; f.castShadow = true; g.add(f);
          if (b.good === 'pumpkin') { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.09, 5), STEM); st.position.set(px + 0.05, b.top + 0.29, pz + 0.1); g.add(st); }
        }
      }
      b.dressed = true; if (!ok) all = false;
    }
    return all;
  }
  // Ripe or picked: the fruit shows only while there's something to pick.
  function refresh() {
    const left = today().left;
    for (const b of beds) b.grp.visible = left[b.good] > 0 || !!b.plant;   // cabbages and carrots stay in the ground (leaves)
    for (const b of beds) if (b.plant) for (const c of b.grp.children) {                        // picked: just small new shoots
      c.userData.s0 ??= c.scale.clone();
      c.scale.copy(c.userData.s0).multiplyScalar(left[b.good] > 0 ? 1 : 0.45);
    }
  }
  function pick(b) {
    const d = today(), n = d.left[b.good], room = packRoom();
    if (n <= 0) return toast(`Nothing ripe in the ${GOODS[b.good].name.toLowerCase()} bed. More by morning.`, 4000);
    if (room <= 0) return toast('Your pack is full. The rest stays on the plants until you come back.', 4500);
    const take = Math.min(n, room);
    state.pack[b.good] = (state.pack[b.good] || 0) + take;
    d.left[b.good] -= take;
    note(`Picked ${take} ${GOODS[b.good].name} in your greenhouse`);
    save(); updateStatus(); refresh();
    toast(`You pick ${take} ${GOODS[b.good].name.toLowerCase()}.${d.left[b.good] ? ` ${d.left[b.good]} more when your pack has room.` : ''}`, 4000);
  }
  let tries = 0;
  const timer = setInterval(() => { if (dress() || ++tries > 60) { clearInterval(timer); refresh(); } }, 500);
  return { cols, reads, refresh, fy };
}
