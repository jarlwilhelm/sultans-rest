// Ships from all over Lavine, tied up at the piers, plus a few coming and going
// through the warded passage. Their colours are my guesses for each land.
import * as THREE from 'three';
import { makeRng, pick, range } from './noise.js';
import { PIERS, QUAY_Y } from './land.js';
import { glowTextureCanvas } from './signs.js';
import { prop } from './interiors.js';

export const ORIGINS = [
  { land: 'the Coastal Republic of Meridia', hull: '#6b4a2e', sail: '#f2ede0', flag: '#2b5fa8' },
  { land: 'Eldoria', hull: '#7a5232', sail: '#efe0bf', flag: '#d9772a' },
  { land: 'Sylvenwood', hull: '#5c4a30', sail: '#9fbf86', flag: '#3d7a3a' },
  { land: 'Iron Peak', steam: true, hull: '#3b3d42', sail: null, flag: '#b8862c' },
  { land: 'the Sultanate', hull: '#7e5a36', sail: '#f6f0e2', flag: '#2f9c9a' },
  { land: 'the Dreadfort of Ebony Desolation', hull: '#2a2420', sail: '#26201f', flag: '#9e1b1b' },
  { land: 'the Vampiric Dominion of Crimson Nightfall', hull: '#2e1c1c', sail: '#6e1414', flag: '#1a0b0b' },
  { land: 'the Dezfulian Empire', hull: '#5a3e2a', sail: '#6a4a8e', flag: '#e0b347' },
  { land: 'Solitude Haven', hull: '#4a3a2c', sail: '#9b9384', flag: '#111111', patched: true },
];
const TIEFLING = { land: 'the Tiefling Harbors (passage escort)', hull: '#2d2238', sail: '#2a1d33', flag: '#b77cff', runes: true };

const rng = makeRng(555);
const glowTex = new THREE.CanvasTexture(glowTextureCanvas());

// Canvas sail cloth: vertical seams between panels, a hem, a row of reef points, and grime toward the foot.
function sailTexture(color, patched, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = makeRng(seed);
  g.fillStyle = color; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1); }
  for (let x = 0; x < 256; x += 32) {
    g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.05})`; g.fillRect(x, 0, 32, 256);          // panels a shade apart
    g.strokeStyle = 'rgba(40,25,10,0.28)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 256); g.stroke();
  }
  const grime = g.createLinearGradient(0, 120, 0, 256);
  grime.addColorStop(0, 'rgba(60,40,20,0)'); grime.addColorStop(1, 'rgba(60,40,20,0.22)');
  g.fillStyle = grime; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(40,25,10,0.45)'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 250);         // the hem
  g.fillStyle = 'rgba(40,25,10,0.5)';
  for (let x = 12; x < 256; x += 16) g.fillRect(x, 62, 2, 7);                                   // reef points
  if (patched) {
    for (let i = 0; i < 6; i++) {
      g.fillStyle = pick(r, ['#7d7466', '#a89d88', '#6b6358', '#8a7c62']);
      const x = r() * 200, y = r() * 200, w = 24 + r() * 44, h = 24 + r() * 44;
      g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(30,20,10,0.4)'; g.lineWidth = 1; g.setLineDash([3, 3]); g.strokeRect(x, y, w, h); g.setLineDash([]);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Planks laid along the ship (they move with it): sides use (length, height), decks (length, width).
// Below the waterline the hull is tarred dark; a painted stripe in the ship's colours runs along it.
const planks = (() => {
  const L = new THREE.TextureLoader();
  const t = (k, srgb) => { const x = L.load(`assets/textures/weathered_brown_planks_${k}.jpg`); x.wrapS = x.wrapT = THREE.RepeatWrapping; if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; return x; };
  return { map: t('Diffuse', true), nor: t('nor_gl'), rough: t('Rough') };
})();
function shipWood(color, { roughness = 0.55, tile = 2.2, band = null } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, map: planks.map, normalMap: planks.nor, roughnessMap: planks.rough, roughness, normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 1.4 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTile = { value: 1 / tile };
    sh.uniforms.uWater = { value: band ? band.water : -99 };
    sh.uniforms.uStripe = { value: band ? new THREE.Vector2(band.y0, band.y1) : new THREE.Vector2(-99, -99) };
    sh.uniforms.uStripeColor = { value: new THREE.Color(band?.color || '#ffffff') };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTile;\nvarying float vObjY;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec3 on = abs(objectNormal);
        vec2 ouv = on.y > 0.6 ? transformed.zx : (on.x > on.z ? transformed.zy : transformed.xy);
        vMapUv = ouv * uTile;
        #ifdef USE_NORMALMAP
          vNormalMapUv = vMapUv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = vMapUv;
        #endif
        vObjY = transformed.y;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWater;\nuniform vec2 uStripe;\nuniform vec3 uStripeColor;\nvarying float vObjY;')
      .replace('#include <map_fragment>', `
        vec4 texel = texture2D(map, vMapUv);
        float lum = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
        float mean = max(dot(textureLod(map, vec2(0.5), 12.0).rgb, vec3(0.299, 0.587, 0.114)), 0.02);
        diffuseColor.rgb *= mix(1.0, lum / mean, 0.85);
        float st = step(uStripe.x, vObjY) * step(vObjY, uStripe.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, uStripeColor * mix(1.0, lum / mean, 0.5), st);
        float tar = 1.0 - smoothstep(uWater - 0.05, uWater + 0.05, vObjY);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09, 0.07, 0.06) * (lum / mean), tar);`);
  };
  mat.customProgramCacheKey = () => `shipwood-${band ? 1 : 0}`;
  return mat;
}

function hullShape(len, beam, k = 1) {
  const s = new THREE.Shape();
  const L = len / 2 * k, B = beam / 2 * k;
  s.moveTo(-B * 0.75, -L);
  s.lineTo(B * 0.75, -L);
  s.quadraticCurveTo(B * 1.05, -L * 0.3, B, L * 0.25);
  s.quadraticCurveTo(B * 0.8, L * 0.8, 0, L);
  s.quadraticCurveTo(-B * 0.8, L * 0.8, -B, L * 0.25);
  s.quadraticCurveTo(-B * 1.05, -L * 0.3, -B * 0.75, -L);
  return s;
}

function hullGeometry(len, beam, height) {
  const geo = new THREE.ExtrudeGeometry(hullShape(len, beam), { depth: height, steps: 8, bevelEnabled: false, curveSegments: 14 });
  geo.rotateX(-Math.PI / 2);          // length runs along z (bow toward +z after rotation), height up
  geo.translate(0, -height * 0.45, 0);
  // Round the bottom in toward the keel so it looks like a hull, not a box.
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), f = (y + height * 0.45) / height;         // 0 at the keel, 1 at the deck
    p.setX(i, p.getX(i) * (0.45 + 0.55 * Math.sqrt(Math.max(0, f))));
  }
  geo.computeVertexNormals();
  return geo;
}

// The bulwark: a low wall around the deck that rises toward bow and stern (the ship's sheer line).
function bulwarkGeometry(len, beam, h, sheer) {
  const outer = hullShape(len, beam);
  outer.holes.push(new THREE.Path(hullShape(len, beam, 0.9).getPoints(14).reverse()));
  const geo = new THREE.ExtrudeGeometry(outer, { depth: h, steps: 1, bevelEnabled: false, curveSegments: 14 });
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > h * 0.5) p.setY(i, p.getY(i) + sheer * (p.getZ(i) / (len / 2)) ** 2);
  geo.computeVertexNormals();
  return geo;
}

let sceneRef = null;
export function makeShip(o, len) {
  const g = new THREE.Group();
  const beam = len * 0.3, height = len * 0.22;
  const top = height * 0.55;
  const hullMat = shipWood(o.hull, { band: { water: -height * 0.12, y0: height * 0.22, y1: height * 0.3, color: o.flag } });
  const trimMat = shipWood(o.hull, { roughness: 0.5 });
  const deckMat = shipWood('#c9a77a', { roughness: 0.85, tile: 1.6 });
  const hull = new THREE.Mesh(hullGeometry(len, beam, height), hullMat);
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(hullShape(len, beam, 0.92), 14), deckMat);
  deck.geometry.rotateX(-Math.PI / 2);
  deck.position.y = top + 0.02;
  const bulwark = new THREE.Mesh(bulwarkGeometry(len, beam, 0.7, height * 0.35), trimMat);
  bulwark.position.y = top;
  // A raised stern castle with windows that light up at night, and a lantern.
  const castle = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.74, height * 0.55, len * 0.2), trimMat);
  castle.position.set(0, top + height * 0.27, len * 0.34);
  const winMat = sceneRef?.userData.windowMat;
  if (winMat) for (const wx of [-0.25, 0, 0.25]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.12, height * 0.16, 0.06), winMat);
    w.position.set(wx * beam, top + height * 0.3, len * 0.44 + 0.03);
    g.add(w);
    (g.userData.simple ??= []).push(w);
  }
  const lantern = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffc46b', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  lantern.scale.set(1.6, 1.6, 1); lantern.position.set(0, top + height * 0.7, len * 0.46);
  g.add(lantern);
  sceneRef?.userData.flames?.push(lantern);
  const sprit = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, len * 0.3, 8), trimMat);
  sprit.rotation.x = -Math.PI / 2 + 0.35;
  sprit.position.set(0, top + height * 0.25, -len * 0.55);
  g.add(hull, deck, bulwark, castle, sprit);
  // These simple parts stand in until the Blender hull has loaded (fitHull swaps them out).
  (g.userData.simple ??= []).push(hull, deck, bulwark, castle);
  g.userData.mats = { hullMat, trimMat, deckMat };
  g.userData.len = len;
  const spritTip = new THREE.Vector3(0, top + height * 0.25 + Math.sin(0.35) * len * 0.15, -len * 0.55 - Math.cos(0.35) * len * 0.15);
  g.userData.parts = [];

  if (o.runes) {
    const runeMat = new THREE.MeshBasicMaterial({ color: '#c58bff' });
    for (const sx of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, len * 0.7), runeMat);
      strip.position.set(sx * beam * 0.5, height * 0.25, 0);
      g.add(strip);
    }
    const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#b77cff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    lamp.scale.set(6, 6, 1);
    lamp.position.set(0, height + 3, -len * 0.45);
    g.add(lamp);
  }

  const mastMat = shipWood('#6a4a2c', { roughness: 0.6, tile: 3 });
  const rig = [];      // rope lines: pairs of points
  if (o.steam) {
    // A dwarven steamship: iron, brass and a smoking funnel.
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 7, 14), new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.5, metalness: 0.6 }));
    funnel.position.y = height * 0.5 + 3.5;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.6, 14), new THREE.MeshStandardMaterial({ color: '#b8862c', roughness: 0.3, metalness: 0.8 }));
    band.position.y = height * 0.5 + 6;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.6, 2.4, len * 0.25), new THREE.MeshStandardMaterial({ color: '#4a4c52', roughness: 0.6, metalness: 0.4 }));
    cabin.position.set(0, height * 0.5 + 1.2, len * 0.15);
    for (const sx of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.8, height * 0.8, 1.2, 16), new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.8 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * beam * 0.55, height * 0.1, 0);
      g.add(wheel);
    }
    g.add(funnel, band, cabin);
    g.userData.smoke = new THREE.Vector3(0, height * 0.5 + 7.2, 0);
  } else {
    const masts = len > 22 ? 3 : len > 15 ? 2 : 1;
    const sailTex = sailTexture(o.sail, o.patched, Math.floor(rng() * 1000));
    const sailMat = new THREE.MeshStandardMaterial({ map: sailTex, roughness: 0.95, side: THREE.DoubleSide });
    for (let m = 0; m < masts; m++) {
      const mz = masts === 1 ? 0 : (-0.3 + (0.6 * m) / (masts - 1)) * len;
      const mh = len * (m === Math.floor(masts / 2) ? 1.05 : 0.85);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, mh, 8), mastMat);
      mast.position.set(0, height * 0.5 + mh / 2, mz);
      g.add(mast);
      const mtop = new THREE.Vector3(0, height * 0.5 + mh * 0.92, mz);
      // Shrouds down to the rail on each side, and stays fore and aft.
      for (const sx of [-1, 1]) for (const dz of [-1.2, 0, 1.2]) rig.push(mtop, new THREE.Vector3(sx * beam * 0.47, top + 0.7, mz + dz));
      if (m === 0) rig.push(mtop, spritTip);
      if (m === masts - 1) rig.push(mtop, new THREE.Vector3(0, top + height * 0.55, len * 0.43));
      if (m === Math.floor(masts / 2)) {
        const nest = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.6, 12, 1, true), mastMat);
        nest.position.set(0, height * 0.5 + mh * 0.8, mz);
        g.add(nest);
      }
      // Two square sails per mast, bellied out a little.
      for (let k = 0; k < 2; k++) {
        const sw = beam * (1.5 - k * 0.3), sh = mh * 0.3;
        const geo = new THREE.PlaneGeometry(sw, sh, 8, 4);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const u = p.getX(i) / sw, v = p.getY(i) / sh;
          p.setZ(i, -(1 - 4 * u * u) * (1 - 2 * v * v) * sw * 0.12);
        }
        geo.computeVertexNormals();
        const sail = new THREE.Mesh(geo, sailMat);
        sail.position.set(0, height * 0.5 + mh * (0.38 + k * 0.33), mz - 0.3);
        sail.castShadow = true;
        g.add(sail);
        const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, sw * 1.1, 6), mastMat);
        yard.rotation.z = Math.PI / 2;
        yard.position.set(0, sail.position.y + sh / 2, mz - 0.2);
        g.add(yard);
      }
      if (m === Math.floor(masts / 2)) {
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshStandardMaterial({ color: o.flag, side: THREE.DoubleSide }));
        flag.position.set(0, height * 0.5 + mh + 0.6, mz + 1.1);
        flag.rotation.y = Math.PI / 2;
        g.add(flag);
        g.userData.flag = flag;
      }
    }
  }
  if (rig.length) g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rig), new THREE.LineBasicMaterial({ color: '#2a1f16' })));
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData.label = `A ship from ${o.land}`;
  g.userData.o = o;
  if (!fitHull(g)) waiting.push(g);
  return g;
}

// The hull from Blender (tools/blender/ship.py), built for a 20 m ship: scaled to this one and painted in
// its land's colours. Its planks are mapped on the hull itself (shipWood), so they move with the ship.
const waiting = [];
function fitHull(g) {
  const ud = g.userData;
  const model = prop(g, 'ship_hull', 0, 0, 0);
  if (!model) return false;
  model.scale.setScalar(ud.len / 20);
  const m20 = { hullMat: shipWood(ud.o.hull, { band: { water: -0.53, y0: 0.97, y1: 1.32, color: ud.o.flag } }),
    trimMat: shipWood(ud.o.hull, { roughness: 0.5 }), deckMat: shipWood('#c9a77a', { roughness: 0.85, tile: 1.6 }) };
  m20.hullMat.side = THREE.DoubleSide;
  model.traverse(m => {
    if (!m.isMesh) return;
    const n = m.material.name;
    if (n === 'Hull') m.material = m20.hullMat;
    else if (n === 'Wood') m.material = m20.deckMat;
    else if (n === 'DarkWood') m.material = m20.trimMat;
    else if (n === 'NightWindow' && sceneRef?.userData.windowMat) m.material = sceneRef.userData.windowMat;
  });
  for (const part of ud.simple) part.visible = false;
  return true;
}
// Ships made before the models loaded get their hulls now (main.js calls this after loadProps).
export function fitWaitingHulls() {
  while (waiting.length && fitHull(waiting[0])) waiting.shift();
}

export function buildShips(scene, lookables) {
  sceneRef = scene;
  const ships = [];
  const order = [...ORIGINS, ORIGINS[4], ORIGINS[0], ORIGINS[7], TIEFLING].sort(() => rng() - 0.5);
  let k = 0;
  for (const p of PIERS) {
    for (const side of [-1, 1]) {
      if (k >= order.length) break;
      const o = order[k++];
      const len = o.steam ? 20 : range(rng, 14, 26);
      const s = makeShip(o, len);
      const beam = len * 0.3;
      s.position.set(p.x + side * (p.w / 2 + beam / 2 + 0.6), 0, p.z0 + len / 2 + range(rng, 2, 8));
      s.rotation.y = rng() < 0.5 ? 0 : Math.PI;
      scene.add(s);
      ships.push({ s, phase: rng() * 10, base: s.position.clone(), rot: s.rotation.y, o });
      // The captain waits on the pier beside the ship.
      const cz = s.position.z + range(rng, -3, 3);
      scene.userData.posts.push({ x: p.x + side * (p.w / 2 - 0.9), z: cz, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, role: o.steam ? 'adventurer' : 'sailor',
        race: o.steam ? 'dwarf' : o.runes ? 'tiefling' : undefined,
        label: `Captain of a ship from ${o.land.replace(' (passage escort)', '')}`, npc: { kind: 'ship', ship: { id: `ship-${k}`, land: o.land } } });
      lookables.push({ object: s, label: s.userData.label, radius: len * 0.5 });
    }
  }
  // Ships out in the passage: one coming in, one going out, each with a tiefling escort.
  const movers = [];
  for (const [o, x, dir] of [[ORIGINS[7], -14, 1], [ORIGINS[1], 14, -1], [TIEFLING, -22, 1], [TIEFLING, 22, -1]]) {
    const s = makeShip(o, o === TIEFLING ? 13 : 24);
    s.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(s);
    movers.push({ s, x, dir, offset: rng() * 900 + (o === TIEFLING ? 30 : 0) });
    lookables.push({ object: s, label: s.userData.label, radius: 10 });
  }
  // Smoke puffs for the steamship.
  // A soft round puff (the lamp glow picture is for glowing things and draws as a square here).
  const pc = document.createElement('canvas'); pc.width = pc.height = 64;
  const pg = pc.getContext('2d'), grad = pg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  pg.fillStyle = grad; pg.fillRect(0, 0, 64, 64);
  const smokeMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(pc), color: '#b9b3ab', transparent: true, opacity: 0.3, depthWrite: false });
  const puffs = [];
  const steamer = ships.find(x => x.o.steam);
  if (steamer) {
    for (let i = 0; i < 18; i++) {
      const sp = new THREE.Sprite(smokeMat.clone());
      scene.add(sp);
      puffs.push({ sp, t: i / 18, dx: rng() * 2 - 1, dz: rng() * 2 - 1, spin: rng() * 6 });
    }
  }

  return (t, dt) => {
    for (const sh of ships) {
      sh.s.position.y = Math.sin(t * 0.8 + sh.phase) * 0.15;
      sh.s.rotation.z = Math.sin(t * 0.6 + sh.phase) * 0.025;
      sh.s.rotation.x = Math.sin(t * 0.5 + sh.phase * 2) * 0.012;
      if (sh.s.userData.flag) sh.s.userData.flag.rotation.y = Math.PI / 2 + Math.sin(t * 3 + sh.phase) * 0.25;
    }
    for (const m of movers) {
      // Inbound ships glide toward the harbor mouth, outbound ones away; both loop out of sight in the haze.
      const span = 950;
      const d = ((t * 4 + m.offset) % span);
      m.s.position.set(m.x, Math.sin(t * 0.7 + m.offset) * 0.25, m.dir > 0 ? -1050 + d : -100 - d);
      m.s.rotation.z = Math.sin(t * 0.6 + m.offset) * 0.04;
    }
    if (steamer) {
      const src = steamer.s.localToWorld(steamer.s.userData.smoke.clone());
      for (const p of puffs) {
        p.t = (p.t + dt * 0.12) % 1;
        // Each puff wanders a little on its own and grows as it thins out.
        const w = Math.sin(t * 0.7 + p.spin) * 1.5;
        p.sp.position.set(src.x + p.t * 9 + p.dx * p.t * 4 + w * p.t, src.y + p.t * 12, src.z + p.t * 4 + p.dz * p.t * 4);
        const k = 1.2 + p.t * 9;
        p.sp.scale.set(k, k, 1);
        p.sp.material.opacity = 0.28 * Math.sin(Math.PI * Math.min(1, p.t * 1.4)) * (1 - p.t);
      }
    }
  };
}
