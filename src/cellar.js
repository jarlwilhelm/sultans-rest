// The secret cellar under Ale's house, with the Dragon Doors (docs/chapter-three-plan.md; the user, 2026-11-04:
// "you can't get in there until later, but it should be built in there already").
// Like every inside in this game it is its own place (rooms.js): the city isn't drawn while you're in it. It is
// built out in the empty dunes behind the city, where nobody walks, and nothing about it shows from outside.
// There is no way in from Ale's house: the stairs end at a trapdoor bolted from above. You will only ever arrive
// through the Dragon Doors (the portal from the farmhouse in Meridia: not built yet). DRAFT text by Claude.
import * as THREE from 'three';
import { groundHeight, addFloor, colliders } from './land.js';
import { addRoom } from './rooms.js';
import { readables } from './signs.js';
import { lamp } from './interiors.js';
import { talk } from './game/ui.js';
import { surface } from './look.js';

// Where the room really is, and where you stand when you come through the Doors (for the portal, later).
export const CELLAR = { x: 240, z: 335, w: 8, d: 10, h: 3.6 };

export function buildCellar(scene) {
  const { x, z, w, d, h } = CELLAR;
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  let top = -Infinity;
  for (let gx = x0 - 1; gx <= x1 + 1; gx += 0.5) for (let gz = z0 - 1; gz <= z1 + 1; gz += 0.5) top = Math.max(top, groundHeight(gx, gz));
  const fy = top + 0.3;                                   // the floor, above every bump of sand under it
  // The shell: what main.js needs to light a room (and rooms.js to know it's usable).
  const shell = { x, z, w, d, fy, top: fy + h, x0, x1, z0, z1 };
  const room = addRoom({ name: "The cellar under Ale's house", parent: scene, box: { x0, x1, z0, z1, y0: fy - 1, y1: fy + h }, shell });
  const stone = surface('sandstone_blocks_05', { tile: 2, detail: 0.6 }); stone.color.set('#8f8170');
  const dark = new THREE.MeshStandardMaterial({ color: '#4a4036', roughness: 1 });
  const t = 0.3;
  // Everything is placed just inside the room's box, so it belongs to the room and is never drawn outside.
  const slab = (cx, cy, cz, sw, sh, sd, mat = stone, solid = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), mat);
    m.position.set(cx, cy, cz); m.castShadow = m.receiveShadow = true; scene.add(m);
    if (solid) colliders.push({ x0: cx - sw / 2, x1: cx + sw / 2, z0: cz - sd / 2, z1: cz + sd / 2 });
    return m;
  };
  slab(x, fy - 0.1, z, w - 0.02, 0.2, d - 0.02, dark, false);                    // floor
  slab(x, fy + h - 0.05, z, w - 0.02, 0.1, d - 0.02, dark, false);              // ceiling
  slab(x0 + t / 2 + 0.01, fy + h / 2, z, t, h, d - 0.02);                       // walls
  slab(x1 - t / 2 - 0.01, fy + h / 2, z, t, h, d - 0.02);
  slab(x, fy + h / 2, z0 + t / 2 + 0.01, w - 0.02, h, t);
  slab(x, fy + h / 2, z1 - t / 2 - 0.01, w - 0.02, h, t);
  addFloor(x0, x1, z0, z1, fy);
  // Old shelves, a broken crate, cobweb-grey sacks: Ale kept this place, and kept it quiet.
  const wood = new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 1 });
  for (let i = 0; i < 3; i++) slab(x0 + 0.55, fy + 0.6 + i * 0.6, z - 1.5, 0.5, 0.06, 2.4, wood, false);
  slab(x0 + 0.55, fy + 0.8, z - 2.7, 0.5, 1.6, 0.06, wood, false);
  slab(x1 - 0.8, fy + 0.3, z0 + 2.2, 0.8, 0.6, 0.8, wood);
  for (const [sx, sz] of [[x1 - 0.7, z0 + 1.0], [x1 - 1.5, z0 + 0.9]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({ color: '#9a8c74', roughness: 1 })); s.scale.y = 0.75; s.position.set(sx, fy + 0.25, sz); scene.add(s); }

  // The stairs up to a trapdoor in the ceiling (Ale's floor above). Bolted from above.
  const sx = x0 + 1.2;
  for (let k = 0; k < 8; k++) slab(sx, fy + 0.2 + k * 0.42, z0 + 0.9 + k * 0.35, 1.2, 0.18, 0.4, stone, false);
  const trap = slab(sx, fy + h - 0.06, z0 + 0.9 + 8 * 0.35, 1.0, 0.06, 1.0, wood, false);
  readables.push({ pos: trap.position.clone().setY(fy + h - 0.6), title: 'A trapdoor', verb: 'Push the trapdoor', action: () => talk({ name: 'A trapdoor', text: [
    'You climb the steps and push. It doesn\'t give: bolted from above. Through the crack, the smell of cabbages and old paper. Ale\'s house.'], options: [{ label: 'Leave it' }] }) });

  // The Dragon Doors: two tall leaves of dark bronze in the back wall, a dragon coiled across both.
  const doorW = 2.6, doorH = 3.2, dz = z1 - t - 0.03;
  const frame = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.6, metalness: 0.3 });
  slab(x, fy + doorH + 0.15, dz, doorW + 0.6, 0.3, 0.12, frame, false);
  for (const s of [-1, 1]) slab(x + s * (doorW / 2 + 0.15), fy + doorH / 2, dz, 0.3, doorH, 0.12, frame, false);
  const leaf = new THREE.Mesh(new THREE.PlaneGeometry(doorW, doorH), new THREE.MeshStandardMaterial({ map: dragonDoorTexture(), roughness: 0.45, metalness: 0.55, emissive: '#3a1a5a', emissiveIntensity: 0.25 }));
  leaf.position.set(x, fy + doorH / 2, dz - 0.07); leaf.rotation.y = Math.PI; scene.add(leaf);
  lamp(scene, x, fy + doorH + 0.1, dz - 0.4, '#b77cff', 1.4);                   // a faint violet glow at the seam
  for (const s of [-1, 1]) lamp(scene, x + s * 3.2, fy + 2.2, dz - 0.5, '#ffb45a', 0.9);   // two old wall lamps
  readables.push({ pos: new THREE.Vector3(x, fy + 1.6, dz - 0.4), title: 'The Dragon Doors', verb: 'Look at the Dragon Doors', action: () => talk({ name: 'The Dragon Doors', text: [
    'Two doors of dark bronze, taller than the cellar should allow, set into the back wall as if the house had been built around them. A dragon is coiled across both leaves, its head at the seam, its eye a chip of violet glass.',
    'There is no handle and no lock. When you put your hand flat on the metal it is warm, like something alive asleep on the other side.'], options: [{ label: 'Step back' }] }) });

  return { room, fy, arrive: { x, z: dz - 1.6, yaw: 0 } };
}

// A dragon in relief on dark bronze, painted in code (DRAFT; a Blender model can replace it later).
function dragonDoorTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 640;
  const g = c.getContext('2d');
  const bronze = g.createLinearGradient(0, 0, 512, 640); bronze.addColorStop(0, '#3a2e22'); bronze.addColorStop(0.5, '#5a4630'); bronze.addColorStop(1, '#2e241a');
  g.fillStyle = bronze; g.fillRect(0, 0, 512, 640);
  // Rivets and a border on each leaf, the seam down the middle.
  g.strokeStyle = '#7a6040'; g.lineWidth = 10; g.strokeRect(14, 14, 236, 612); g.strokeRect(262, 14, 236, 612);
  g.fillStyle = '#1a140e'; g.fillRect(253, 0, 6, 640);
  g.fillStyle = '#8a7048'; for (let y = 40; y < 620; y += 48) for (const xx of [30, 234, 278, 482]) { g.beginPath(); g.arc(xx, y, 6, 0, Math.PI * 2); g.fill(); }
  // The dragon: a coiling body across both leaves, wings, a head at the seam with a violet eye.
  g.strokeStyle = '#a88a5a'; g.lineCap = 'round'; g.lineWidth = 30;
  g.beginPath(); g.moveTo(120, 560); g.bezierCurveTo(-20, 420, 420, 420, 380, 300); g.bezierCurveTo(340, 180, 120, 260, 150, 170); g.bezierCurveTo(170, 110, 230, 120, 256, 130); g.stroke();
  g.strokeStyle = '#6e5636'; g.lineWidth = 12;
  g.beginPath(); g.moveTo(120, 560); g.bezierCurveTo(-20, 420, 420, 420, 380, 300); g.bezierCurveTo(340, 180, 120, 260, 150, 170); g.stroke();
  g.fillStyle = '#9a7c4e';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(256, 300); g.lineTo(256 + s * 220, 200); g.lineTo(256 + s * 170, 260); g.lineTo(256 + s * 200, 330); g.lineTo(256 + s * 120, 330); g.closePath(); g.fill(); }
  g.fillStyle = '#b8985e'; g.beginPath(); g.ellipse(256, 130, 46, 30, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(230, 110); g.lineTo(215, 70); g.lineTo(245, 102); g.fill(); g.beginPath(); g.moveTo(282, 110); g.lineTo(297, 70); g.lineTo(267, 102); g.fill();
  g.fillStyle = '#b77cff'; g.beginPath(); g.arc(256, 128, 9, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
