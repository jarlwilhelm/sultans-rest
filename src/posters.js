// Wanted posters around the harbor. Redman Rillington's is everywhere, with no picture
// and a reward far above everyone else's. The other outlaws are placeholders I made up.
import * as THREE from 'three';
import { wantedPoster, placeReadable } from './signs.js';
import { groundHeight } from './land.js';

export const WANTED = [
  { name: 'Redman Rillington', crime: 'His crimes are known to the Throne. Do not approach him. Report any sighting to the harbor guard.', reward: '100,000 GOLD', big: true, alive: 'Alive', face: null },
  { name: 'Vesh Ashcoil', crime: 'Smuggling unwarded cargo through the tiefling passage.', reward: '1,200 gold', face: { horns: true, grin: true } },
  { name: 'Brannoc Hollowhand', crime: 'Theft of dwarven steam-engine plans.', reward: '800 gold', face: { beard: true, mean: true } },
  { name: 'Saelith Vyr', crime: 'Setting fire to the spice market.', reward: '650 gold', face: { ears: true, hood: true } },
  { name: 'Grukka Two-Tusk', crime: 'Piracy against ships of the Sultanate.', reward: '1,500 gold', face: { tusks: true, scar: true, mean: true } },
  { name: 'Pell Underbough', crime: 'Loaded dice, and selling fake kraken charms to sailors.', reward: '150 gold', face: { grin: true } },
  { name: 'Mira Kesh', crime: 'Robbing a Luminous Shrine.', reward: '2,000 gold', face: { hood: true } },
  { name: 'Fizzwick Tallowmere', crime: 'Clockwork pickpocket devices, found in nine purses.', reward: '300 gold', face: { ears: false, grin: true } },
  { name: 'Captain Dace Morrow', crime: 'Mutiny and murder on the open sea.', reward: '3,000 gold', face: { scar: true, beard: true } },
];

let canvases = null;
function posterCanvas(i) {
  canvases ??= WANTED.map((p, k) => wantedPoster(p, 101 + k * 17));
  return canvases[i];
}

const woodMat = new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.9 });
const roofMat = new THREE.MeshStandardMaterial({ color: '#8a3b22', roughness: 0.8 });

// A free-standing notice board. ry = which way it faces (0 = toward the sea).
export function noticeBoard(scene, x, z, ry, which, addCollider) {
  const y0 = groundHeight(x, z);
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 0.2), woodMat);
  frame.position.y = 2.1;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.15, 0.9), roofMat);
  roof.position.set(0, 3.55, 0); roof.rotation.x = 0.25;
  g.add(frame, roof);
  for (const sx of [-2.1, 2.1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.6, 0.22), woodMat);
    leg.position.set(sx, 1.8, 0);
    g.add(leg);
  }
  g.children.forEach(m => { m.castShadow = true; m.receiveShadow = true; });
  g.position.set(x, y0, z);
  g.rotation.y = ry;
  scene.add(g);
  addCollider(x - 2.3, x + 2.3, z - 0.4, z + 0.4);

  // Posters on both faces; Redman (index 0) in the middle when present.
  const slots = [-1.45, 0, 1.45];
  for (const face of [0, Math.PI]) {
    const order = [...which];
    which.includes(0) && order.splice(order.indexOf(0), 1) && order.splice(1, 0, 0);
    order.slice(0, 3).forEach((idx, k) => {
      const local = new THREE.Vector3(slots[k], 2.1 + (k === 1 ? 0.05 : -0.05), face ? 0.12 : -0.12);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      const w = idx === 0 ? 1.3 : 1.15;
      placeReadable(scene, posterCanvas(idx), {
        x: x + local.x, y: y0 + local.y, z: z + local.z, w, h: w * 720 / 512,
        ry: ry + face, title: `Wanted: ${WANTED[idx].name}`,
      });
    });
  }
}

// A single poster pasted on a wall.
export function wallPoster(scene, idx, x, y, z, ry) {
  placeReadable(scene, posterCanvas(idx), {
    x, y, z, w: 0.9, h: 0.9 * 720 / 512, ry, title: `Wanted: ${WANTED[idx].name}`,
  });
}
