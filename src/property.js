// Your plot on the quay, just east of the market. It grows as you buy each deed:
// an empty lot with a sign → a Shack Stand → a Small Store → a Bigger Store → the Add-on
// (warehouse and rooftop terrace). When Xi grants your ship, it waits at the end of the Grand Pier.
import * as THREE from 'three';
import { groundHeight, colliders, QUAY_Y } from './land.js';
import { surface } from './look.js';
import { signBoard, canvasTexture, readables } from './signs.js';
import { makeShip } from './ships.js';
import { state, level, packRoom, save } from './game/state.js';
import { GOODS } from './game/economy.js';
import { prop, hollow, setShellActive, lamp } from './interiors.js';
import { trade, toast } from './game/ui.js';
import { questState } from './game/quests.js';

// What your shop sells grows with your level (looks and words only).
export const TIERS = ['Cabbages', 'Fresh Produce', 'Produce & Spice', 'Fine Goods', 'Imports of Every Land'];
export const tier = () => Math.min(4, Math.floor((level() - 1) / 2));

export const PLOT = { x: -50, z: 24, w: 12, d: 13 };

// The supply chest in your store: your suppliers restock it every morning, with more and finer goods as you
// level up (the bigger store gets half as much again). What doesn't fit in your pack stays in the chest.
const SUPPLY = [
  { cabbage: 4, dates: 2 },
  { cabbage: 3, dates: 3, grain: 3 },
  { dates: 3, cumin: 3, glass: 1, rum: 1 },
  { cumin: 3, saffron: 1, glass: 2, tools: 2, moonleaf: 1 },
  { saffron: 2, silk: 1, wine: 1, gears: 1, pearls: 1 },
];
function supplyToday() {
  if (state.supply?.day !== state.day) {
    const bigger = state.rank >= 3 ? 1.5 : 1;
    state.supply = { day: state.day, items: Object.fromEntries(Object.entries(SUPPLY[tier()]).map(([g, n]) => [g, Math.ceil(n * bigger)])) };
  }
  return state.supply;
}
function openSupply() {
  const sup = supplyToday(), got = [];
  for (const [g, n] of Object.entries(sup.items)) {
    const take = Math.min(n, packRoom());
    if (take > 0) { state.pack[g] = (state.pack[g] || 0) + take; sup.items[g] -= take; got.push(`${take} ${GOODS[g].name}`); }
    if (!sup.items[g]) delete sup.items[g];
  }
  save();
  const left = Object.values(sup.items).reduce((a, b) => a + b, 0);
  if (got.length) toast(`From the supply chest: ${got.join(', ')}.${left ? ` Your pack is full; ${left} more wait in the chest.` : ''}`, 6000);
  else toast(left ? 'Your pack is full. The goods wait in the chest.' : 'The chest is empty. Your suppliers bring more in the morning.', 5000);
}

export function buildProperty(scene) {
  const { x, z, w, d } = PLOT;
  const y = groundHeight(x, z);
  const plaster = surface('plastered_wall', { tile: 3.5, detail: 0.6, normal: 0.7 }); plaster.color.set('#f1e6d2');
  const wood = surface('weathered_brown_planks', { tile: 1.6, detail: 0.7 }); wood.color.set('#c49a6c');
  const darkWood = surface('weathered_brown_planks', { tile: 1.2, detail: 0.6 }); darkWood.color.set('#7a5638');
  const cloth = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b347', metalness: 0.8, roughness: 0.35 });
  const teal = new THREE.MeshStandardMaterial({ color: '#2f9c9a', metalness: 0.5, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2016', roughness: 1, emissive: '#ffb45a', emissiveIntensity: 0 });
  scene.userData.plotWindows = dark;

  const box = (g, mat, bx, by, bz, sx, sy, sz, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(bx, by + sy / 2, bz); m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const front = z - d / 2;     // the side facing the sea
  const levels = [];

  // 0: an empty lot with a sign.
  const lot = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const px = x - w / 2 + (i % 2) * w, pz = front + Math.floor(i / 2) * d;
    box(lot, darkWood, px, y, pz, 0.15, 0.9, 0.15);
  }
  box(lot, darkWood, x - 3, y, front + 0.3, 0.12, 1.6, 0.12);
  levels.push(lot);

  // 1: the Shack Stand: a wooden booth with a counter and an awning.
  const shack = new THREE.Group();
  const sz = front + 2.5;
  // (plain boxes until the Blender stall has loaded; show() swaps them out)
  const plainStall = [
    box(shack, wood, x - 1.75, y, sz, 0.15, 2.6, 2.5),
    box(shack, wood, x + 1.75, y, sz, 0.15, 2.6, 2.5),
    box(shack, wood, x - 0.6, y, sz - 1.1, 2.4, 1.0, 0.5),        // counter (a gap on the right to get behind it)
  ];
  // Ale's little hut behind the counter, with a door: step round the counter and go in.
  const hut = hollow(shack, { x, z: sz + 1.25 + 1.6, w: 3.6, d: 3.2, h: 2.5, color: '#c9a77a', doorW: 1.0, doorH: 2.05, name: "Ale's shack", doorColor: '#2e5fa8' });
  const awn = box(shack, cloth('#b8382b'), x, y + 2.6, sz - 0.6, 4.2, 0.05, 2.8); awn.rotation.x = 0.18;
  plainStall.push(awn, box(shack, wood, x + 2.5, y, sz + 0.5, 0.8, 0.8, 0.8, 0.3));
  levels.push(shack);

  // 2: a Small Store: one room, a door, a window, an awning.
  const store = new THREE.Group();
  // A room you can walk into: counter at the back, shelves along the walls.
  const storeShell = hollow(store, { x, z, w: 8, d: 7, h: 4.0, color: '#f1e6d2', doorW: 1.5, doorH: 2.5, name: 'Your store', doorColor: '#2e5fa8' });
  box(store, dark, x + 2.4, y + 1.2, z - 3.55, 1.6, 1.3, 0.08); // window
  const a2 = box(store, cloth('#2e6c8e'), x, y + 3.0, z - 4.2, 8.4, 0.05, 1.6); a2.rotation.x = -0.3;
  levels.push(store);

  // 3: a Bigger Store: two floors, balcony, a teal dome.
  const big = new THREE.Group();
  const bigShell = hollow(big, { x, z, w: 11, d: 11, h: 7.6, color: '#f1e6d2', doorW: 1.8, doorH: 2.8, name: 'Your store', doorColor: '#2e5fa8' });
  box(big, teal, x, y + 6.6, z - 5.52, 11, 0.4, 0.06);
  for (let i = 0; i < 3; i++) {
    if (i !== 1) box(big, dark, x - 3.5 + i * 3.5, y + 4.3, z - 5.52, 1.2, 1.8, 0.08);
    if (i !== 1) box(big, dark, x - 3.5 + i * 3.5, y + 0.9, z - 5.52, 1.6, 1.6, 0.08);
  }
  box(big, plaster, x, y + 3.6, z - 6.2, 9, 0.18, 1.4);         // balcony
  box(big, plaster, x, y + 3.78, z - 6.85, 9, 0.7, 0.1);
  const a3 = box(big, cloth('#d7a33a'), x, y + 3.0, z - 6.6, 4, 0.05, 1.6); a3.rotation.x = -0.25;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), teal);
  dome.position.set(x, y + 7.7, z); dome.castShadow = true; big.add(dome);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.4, 8), gold); spire.position.set(x, y + 11.6, z); big.add(spire);
  levels.push(big);

  // 4: the Add-on: a wooden warehouse at the side and a rooftop terrace with a canopy and banners.
  const add = new THREE.Group();
  box(add, wood, x + w / 2 + 2.6, y, z + 1, 4.6, 4.2, 8);
  box(add, darkWood, x + w / 2 + 2.6, y, z - 3.02, 2.4, 3, 0.08);
  for (const [cx, cz] of [[-4.6, -4.6], [4.6, -4.6], [-4.6, 4.6], [4.6, 4.6]]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 10), plaster);
    col.position.set(x + cx, y + 7.7 + 1.2, z + cz); col.castShadow = true; add.add(col);
  }
  box(add, cloth('#8e3b6c'), x, y + 10.1, z, 10, 0.06, 10);
  for (const s of [-1, 1]) box(add, cloth('#4b1f6b'), x + s * 5.6, y + 3.8, z - 5.6, 1.1, 3.4, 0.05);
  levels.push(add);

  // The shop's sign, renamed when you name your stand.
  const signMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), signMat);
  sign.rotation.y = Math.PI;      // faces the sea
  scene.add(sign);
  const forSale = signBoard('PLOT FOR SALE', "Deeds at the Merchants' Guild", { bg: '#efe2c2', fg: '#3a200c' });
  const saleSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshStandardMaterial({ map: canvasTexture(forSale), side: THREE.DoubleSide }));
  saleSign.position.set(x - 3, y + 1.35, front + 0.25);
  saleSign.rotation.y = Math.PI;
  lot.add(saleSign);
  const saleRead = { pos: saleSign.position.clone(), title: 'Plot for sale', canvas: forSale };

  levels.forEach(l => { l.userData.keep = true; scene.add(l); });   // your shop stays in its own groups (rooms.js)
  const goods = new THREE.Group();
  goods.userData.keep = true;
  scene.add(goods);
  const collider = { x0: 0, x1: 0, z0: 0, z1: 0 };
  colliders.push(collider);
  const shackCols = [0, 1, 2].map(() => { const c = { x0: 0, x1: 0, z0: 0, z1: 0 }; colliders.push(c); return c; });
  let hutFurnished = false, stallBuilt = false;
  const stallCol = { x0: 0, x1: 0, z0: 0, z1: 0 };
  // Each store's counter and furniture are solid only while that store stands (the next one replaces it).
  const storeCols = { 2: [], 3: [] };
  const storeBlock = (k, x0, x1, z0, z1) => { const c = { x0, x1, z0, z1, on: { x0, x1, z0, z1 } }; colliders.push(c); storeCols[k].push(c); };
  colliders.push(stallCol);
  // Inside your store: a counter where you sell, shelves showing what you sell.
  const inside = { 2: new THREE.Group(), 3: new THREE.Group() };
  store.add(inside[2]); big.add(inside[3]);
  const furnished = {};
  const supplyRead = { pos: new THREE.Vector3(), title: 'Supply chest', verb: 'Open the supply chest (restocked every morning)', action: openSupply };
  function furnishInside(lvl) {
    const k = lvl >= 3 ? 3 : lvl;
    if (k < 2 || furnished[k + ':' + tier()] || !prop(new THREE.Group(), 'Crate', 0, 0, 0, { h: 1 })) return;
    furnished[k + ':' + tier()] = true;
    const g = inside[k]; g.clear();
    const sh = k === 2 ? storeShell : bigShell;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(k === 2 ? 3.4 : 5, 1.0, 0.8), wood);
    counter.position.set(sh.x, sh.fy + 0.5, sh.z1 - 1.6); counter.castShadow = true; g.add(counter);
    if (!furnished['col' + k]) { furnished['col' + k] = true; storeBlock(k, sh.x - (k === 2 ? 1.7 : 2.5), sh.x + (k === 2 ? 1.7 : 2.5), sh.z1 - 2.0, sh.z1 - 1.2); }
    const wares = [['Lettuce_Harvested', 0.3], ['BushBerries_Harvested', 0.22], ['Pot_Small', 0.24], ['Potion2_Empty', 0.3], ['Chest_Ingots', 0.3]].slice(0, tier() + 1);
    const shelves = k === 2 ? 3 : 6;
    for (let i = 0; i < shelves; i++) {
      const left = i % 2 === 0, sz2 = sh.z0 + 1.2 + Math.floor(i / 2) * 2.2;
      const sx = left ? sh.x0 + 0.35 : sh.x1 - 0.35;
      prop(g, 'Shelf_Large', sx, sh.fy, sz2, { h: 2.0, ry: left ? Math.PI / 2 : -Math.PI / 2 });
      for (let j = 0; j < 3; j++) {
        const [name, h] = wares[(i + j) % wares.length];
        prop(g, name, sx + (left ? 0.15 : -0.15), sh.fy + 0.45 + j * 0.62, sz2 + (j - 1) * 0.35, { h: h * 0.9, ry: j });
      }
    }
    for (let i = 0; i < 3; i++) prop(g, 'Crate', sh.x - 1 + i, sh.fy, sh.z1 - 0.5, { h: 0.6, ry: i });
    // The supply chest, in the back corner on the east side.
    prop(g, 'Chest_Closed', sh.x0 + 0.75, sh.fy, sh.z1 - 0.6, { h: 0.7, ry: Math.PI });
    supplyRead.pos.set(sh.x0 + 0.75, sh.fy + 0.6, sh.z1 - 0.6);
    if (!readables.includes(supplyRead)) readables.push(supplyRead);
    if (!furnished['chest' + k]) { furnished['chest' + k] = true; storeBlock(k, sh.x0 + 0.3, sh.x0 + 1.2, sh.z1 - 1.0, sh.z1 - 0.2); }
    // Everything around the counter and shelves, from Blender (tools/blender/property.py).
    if (prop(g, k === 2 ? 'store_small_room' : 'store_big_room', sh.x, sh.fy, sh.z)) {
      lamp(g, sh.x, k === 2 ? sh.fy + 2.75 : sh.fy + 5.15, k === 2 ? sh.z - 0.3 : sh.z - 0.5, '#ffc46b', k === 2 ? 0.55 : 1.6);
      if (!furnished['decor' + k]) {
        furnished['decor' + k] = true;
        const block = (x0, x1, z0, z1) => storeBlock(k, sh.x + x0, sh.x + x1, sh.z + z0, sh.z + z1);
        if (k === 2) { block(-1.95, -1.25, -3.05, -2.35); block(1.05, 1.75, -3.05, -2.35); }
        else { block(-2.75, -1.05, -1.15, -0.05); block(1.05, 2.75, -1.15, -0.05); block(-4.95, -4.2, -4.95, -4.2); block(4.2, 4.95, -4.95, -4.2); }
      }
    }
    prop(g, 'Lettuce_Harvested', sh.x - 1, sh.fy + 0.6, sh.z1 - 0.5, { h: 0.3 });
    const lampM = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd38a' }));
    lampM.position.set(sh.x, sh.top - 0.5, sh.z); g.add(lampM);
  }
  // Where you sell: the stand's counter, or your store's counter inside.
  const sellSpot = { pos: new THREE.Vector3(), title: 'Your stand', verb: 'Sell to your customers',
    action: () => {
      if (!questState('cabbages').done) return toast('Not yet. Talk to people first; the stand has been shut since Ale died.');
      trade({ id: 'own', type: 'own', tier: tier() }, { title: `${state.shopName}: your customers buy`, renownFor: (p) => { const r = Math.floor(p / 8); if (r > 0) import('./game/state.js').then(m => m.addRenown(r, 'selling in your shop')); } });
    } };
  readables.push(sellSpot);
  const extraCollider = { x0: 0, x1: 0, z0: 0, z1: 0 };
  colliders.push(extraCollider);
  let shipObj = null;
  const signRead = { pos: new THREE.Vector3(), title: '', canvas: null };

  function show() {
    const lvl = Math.min(state.rank, 4);
    levels.forEach((g, i) => { g.visible = i === lvl || (i === 3 && lvl === 4); });
    // What you bump into.
    const set = (c, x0, x1, z0, z1) => Object.assign(c, { x0, x1, z0, z1 });
    shackCols.forEach(c => set(c, 0, 0, 0, 0));
    if (lvl === 1) sellSpot.pos.set(x - 0.6, y + 1.0, sz - 1.1);
    else if (lvl === 2) sellSpot.pos.set(storeShell.x, storeShell.fy + 1.0, storeShell.z1 - 1.6);
    else sellSpot.pos.set(bigShell.x, bigShell.fy + 1.0, bigShell.z1 - 1.6);
    if (lvl === 1) {
      set(collider, 0, 0, 0, 0);
      set(shackCols[0], x - 1.85, x + 0.65, sz - 1.4, sz - 0.8);      // counter
      set(shackCols[1], x - 1.9, x - 1.6, sz - 1.3, sz + 1.3);        // side walls
      set(shackCols[2], x + 1.6, x + 1.9, sz - 1.3, sz + 1.3);
      if (!stallBuilt && prop(shack, 'stall', x, y, sz)) {
        // The market stall from Blender (tools/blender/property.py) replaces the plain boxes.
        stallBuilt = true;
        for (const m of plainStall) m.visible = false;
        lamp(shack, x - 1.2, y + 2.25, sz, '#ffd38a', 0.9);
      }
      if (!hutFurnished && prop(shack, 'Crate', hut.x0 + 0.45, hut.fy, hut.z1 - 0.45, { h: 0.6 })) {
        hutFurnished = true;
        prop(shack, 'hut_room', hut.x, hut.fy, hut.z);
        lamp(shack, hut.x, hut.fy + 1.95, hut.z, '#ffd38a', 0.8);
        prop(shack, 'Lettuce_Harvested', hut.x0 + 0.45, hut.fy + 0.6, hut.z1 - 0.45, { h: 0.3 });
        prop(shack, 'Crate', hut.x0 + 1.15, hut.fy, hut.z1 - 0.45, { h: 0.6, ry: 0.4 });
        prop(shack, 'Lettuce_Harvested', hut.x0 + 1.15, hut.fy + 0.6, hut.z1 - 0.45, { h: 0.3, ry: 1 });
        prop(shack, 'Stool', hut.x1 - 0.5, hut.fy, hut.z - 0.2, { h: 0.5 });
        prop(shack, 'Shelf_Large', hut.x1 - 0.3, hut.fy, hut.z1 - 0.7, { h: 1.6, ry: -Math.PI / 2 });
        prop(shack, 'Bags', hut.x0 + 0.5, hut.fy, hut.z0 + 0.6, { h: 0.45 });
        const lampM = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd38a' }));
        lampM.position.set(hut.x, hut.top - 0.4, hut.z); shack.add(lampM);
      }
    }
    else set(collider, 0, 0, 0, 0);
    // Ale's hut and the stall's crate stack stand where the stores go: solid only while you have the stand.
    setShellActive(hut, lvl === 1);
    if (lvl === 1 && stallBuilt) set(stallCol, x + 2.1, x + 2.9, sz - 0.95, sz + 0.5); else set(stallCol, 0, 0, 0, 0);
    for (const k of [2, 3]) for (const c of storeCols[k]) Object.assign(c, (k === 2 ? lvl === 2 : lvl >= 3) ? c.on : { x0: 0, x1: 0, z0: 0, z1: 0 });
    setShellActive(storeShell, lvl === 2);
    setShellActive(bigShell, lvl >= 3);
    furnishInside(lvl);
    if (lvl === 4) set(extraCollider, x + w / 2 + 0.3, x + w / 2 + 4.9, z - 3, z + 5); else set(extraCollider, 0, 0, 0, 0);
    // Readables: the sale sign or your shop sign.
    const ri = readables.indexOf(saleRead); if (ri >= 0) readables.splice(ri, 1);
    const si = readables.indexOf(signRead); if (si >= 0) readables.splice(si, 1);
    if (lvl === 0) { readables.push(saleRead); sign.visible = false; }
    else {
      const c = signBoard((state.shopName || 'Your Stand').toUpperCase(), TIERS[tier()], { bg: '#2a1a0e', fg: '#e7c35a' });
      signMat.map?.dispose();
      signMat.map = canvasTexture(c); signMat.needsUpdate = true;
      const at = [null, [x, y + 3.2, sz - 1.98, 3.6, 0.9], [x, y + 3.63, z - 3.56, 2.9, 0.72], [x, y + 5.55, z - 5.56, 4.0, 1.0], [x, y + 5.55, z - 5.56, 4.0, 1.0]][lvl];
      sign.position.set(at[0], at[1], at[2]); sign.scale.set(at[3] / 4, at[4], 1);
      sign.visible = true;
      Object.assign(signRead, { pos: sign.position.clone(), title: state.shopName || 'Your stand', canvas: c });
      readables.push(signRead);
    }
    // The goods on show: on the counter of the stand, or on a display table in front of the store.
    goods.clear();
    if (lvl >= 1) {
      const [gx, gy, gz] = lvl === 1 ? [x, y + 1.0, sz - 1.1] : lvl === 2 ? [x + 2.4, y, z - 4.9] : [x + 3.2, y, z - 7.2];
      if (lvl >= 2) { const t = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 0.9), wood); t.position.set(gx, gy + 0.42, gz); t.castShadow = true; goods.add(t); }
      const top = lvl === 1 ? gy : gy + 0.85;
      const tr = tier();
      const kinds = [['cab', 'cab', 'cab', 'cab'], ['cab', 'bag', 'cab', 'dates'], ['spice', 'bag', 'cab', 'spice'], ['glass', 'silk', 'spice', 'glass'], ['pearls', 'silk', 'wine', 'glass']][tr];
      const MODEL = { cab: ['Lettuce_Harvested', 0.3], bag: ['Bags', 0.4], dates: ['BushBerries_Harvested', 0.22], spice: ['Pot_Small', 0.24],
        glass: ['Potion2_Empty', 0.3], silk: ['Chest_Closed', 0.3], wine: ['Potion1_Filled', 0.3], pearls: ['Chest_Ingots', 0.3] };
      // At the Blender stall the counter already shows cabbages: only other goods go out, on its free right end.
      const show = lvl === 1 && stallBuilt ? [...new Set(kinds.filter(k => k !== 'cab'))].slice(0, 2) : kinds;
      show.forEach((k, i) => {
        const ix = lvl === 1 && stallBuilt ? x + 0.3 + i * 0.32 : gx - 0.9 + i * 0.6;
        const [name, h] = MODEL[k];
        if (!prop(goods, name, ix, top, gz, { h, ry: i * 1.3 })) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), cloth('#7aa04a')); b.position.set(ix, top + 0.15, gz); goods.add(b);
        }
      });
    }
    // Your ship, once Xi grants it.
    if (state.flags.ship && !shipObj) {
      shipObj = makeShip({ land: `your own fleet ("${state.shopName}")`, hull: '#5a3a24', sail: '#f3ede0', flag: '#4b1f6b' }, 26);
      shipObj.position.set(0, 0, -75);
      shipObj.rotation.y = Math.PI;
      scene.add(shipObj);
      scene.userData.ownShip = shipObj;
    }
  }
  show();
  addEventListener('lavine:property', show);
  return (t) => {
    if (shipObj) { shipObj.position.y = Math.sin(t * 0.8) * 0.15; shipObj.rotation.z = Math.sin(t * 0.6) * 0.025; }
  };
}
