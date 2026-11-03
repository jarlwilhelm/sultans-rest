// Animated people, built from Quaternius' Ultimate Modular Men and Women (CC0): adult proportions,
// eight outfits, with idle, walk, talk and wave animations. Each person gets their race's skin,
// their own hair colour, recoloured clothes, and race features (horns, ears, tusks, beards,
// snouts, tails) fixed to the head and hips.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { prop } from './interiors.js';

const BASES = ['men_Adventurer', 'men_Farmer', 'men_King', 'men_Worker', 'women_Adventurer', 'women_Medieval', 'women_Witch', 'women_Worker'];
const BODY_HEIGHT = 1.82;     // metres, feet to the top of the head
const models = {};

// Material names in the models: skin, hair, and the rest is clothing.
const SKIN = /^Skin$/;
const HAIR = /^(Hair.*|Eyebrows|Moustache)$/;
const KEEP = /^(Eye|Metal.*|Gold|Black|White)$/;

export async function loadCharacters() {
  const loader = new GLTFLoader();
  await Promise.all(BASES.map(async (name) => {
    const g = await loader.loadAsync(`assets/quaternius/people/${name}.glb`);
    models[name] = { scene: g.scene, clips: g.animations };
  }));
}
export const BODIES = [['men_Adventurer', 'Adventurer'], ['women_Adventurer', 'Adventurer'], ['men_Farmer', 'Farmer'], ['women_Medieval', 'Townswoman'],
  ['men_Worker', 'Dock worker'], ['women_Worker', 'Dock worker'], ['women_Witch', 'Robed']];
export { HAIRS };
export function charactersReady() { return Object.keys(models).length === BASES.length; }

// ---------- Colours ----------
const matCache = new Map();
function recolor(mat, { skin, hair, hue, sat, worker }) {
  const name = mat.name;
  let key, make;
  if (SKIN.test(name)) { key = `skin|${skin}`; make = (m) => m.color.set(skin); }
  else if (HAIR.test(name)) { key = `hair|${hair}`; make = (m) => m.color.set(hair); }
  else if (KEEP.test(name)) return mat;
  else if (worker && name === 'Worker_Yellow') { key = `wy|${hue.toFixed(2)}`; make = (m) => m.color.setHSL(hue, 0.25, 0.55); }  // a cloth cap, not a hard hat
  else if (worker && name === 'Worker_Vest') { key = 'wv'; make = (m) => m.color.set('#5a3e24'); }                                 // a leather vest
  else {
    key = `${hue.toFixed(2)}|${sat}`;
    make = (m) => { const hsl = {}; m.color.getHSL(hsl); m.color.setHSL((hsl.h + hue) % 1, Math.min(1, hsl.s * sat), hsl.l); };
  }
  key = `${mat.uuid}|${key}`;
  if (!matCache.has(key)) { const m = mat.clone(); make(m); matCache.set(key, m); }
  return matCache.get(key);
}

// ---------- Race features ----------
const featMats = new Map();
const FM = (color) => { if (!featMats.has(color)) featMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.7 })); return featMats.get(color); };
const cone = new THREE.ConeGeometry(1, 1, 10).translate(0, 0.5, 0);
const ball = new THREE.SphereGeometry(1, 12, 8);
const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0);
function part(parent, geo, mat, [x, y, z], [sx, sy, sz], [rx, ry, rz] = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const pickFrom = (rng, list) => list[Math.floor(rng() * list.length)];

// Hats that are part of an outfit's head (by material). Hidden when you wear a hat of your own,
// so there's never a hat on a hat.
const BUILT_IN_HATS = { men_Farmer: ['Beige', 'Red'], men_King: ['Gold'], men_Worker: ['Worker_Yellow'], women_Worker: ['Worker_Yellow'], women_Witch: ['Purple', 'Gold'] };
const onHead = (o) => /_Head$/.test(o.name) || /_Head$/.test(o.parent?.name || '');

// Positions in metres from the head bone, measured on the models: the head's middle is 0.10 up and
// 0.01 forward of the bone, the face is 0.13 forward, the top 0.27 up, and it's 0.22 wide.
function addFeatures(race, role, head, hips, skin, hair, rng) {
  if (!head) return;
  const skinM = FM(skin);
  if (race === 'tiefling') {
    const horn = FM(pickFrom(rng, ['#2a1d1a', '#4a3a30', '#1a1414', '#d8ccb8']));
    for (const s of [-1, 1]) {
      part(head, cone, horn, [s * 0.06, 0.22, 0.04], [0.022, 0.08, 0.022], [-0.35, 0, -s * 0.45]);
      part(head, cone, horn, [s * 0.09, 0.28, 0.01], [0.015, 0.07, 0.015], [-1.1, 0, -s * 0.2]);
    }
    if (hips) part(hips, cone, skinM, [0, 0, -0.1], [0.02, 0.7, 0.02], [-2.4, 0, 0]);
  } else if (race === 'elf') {
    for (const s of [-1, 1]) part(head, cone, skinM, [s * 0.1, 0.11, 0.0], [0.016, 0.09, 0.011], [0, 0, -s * 1.2]);
  } else if (race === 'orc') {
    for (const s of [-1, 1]) part(head, cone, FM('#efe6d2'), [s * 0.028, 0.035, 0.118], [0.008, 0.03, 0.008], [0.15, 0, 0]);
  } else if (race === 'dwarf') {
    part(head, cone, FM(hair), [0, 0.05, 0.095], [0.08, -0.19, 0.045], [0.2, 0, 0]);
  } else if (race === 'gnome') {
    part(head, cone, FM(pickFrom(rng, ['#b8382b', '#2e6c8e', '#5f8a3a', '#8e3b6c'])), [0, 0.22, 0.0], [0.12, 0.22, 0.12], [-0.15, 0, 0]);
  } else if (race === 'dragonborn') {
    lizardHead(head, skin, rng);
    if (hips) part(hips, cone, skinM, [0, 0, -0.1], [0.06, 0.8, 0.06], [-2.3, 0, 0]);
  }
  if (role === 'steward') {
    part(head, cyl, FM('#4b1f6b'), [0, 0.19, 0.0], [0.12, 0.2, 0.12]);
    part(head, cyl, new THREE.MeshStandardMaterial({ color: '#e0b347', metalness: 0.6, roughness: 0.3 }), [0, 0.19, 0.0], [0.125, 0.035, 0.125]);
  }
  if (role === 'guard') part(head, ball, FM('#f3ede0'), [0, 0.22, 0.0], [0.125, 0.075, 0.125]);   // a turban
}

// A dragonborn's head, in the same low-poly style as everyone else: a long skull, a tapered
// snout with nostrils and a jaw, brow ridges over slit eyes, swept-back horns and a spiny crest.
// (It replaces the human head, which is hidden for dragonborn.)
const flat = new Map();
const FL = (color) => { if (!flat.has(color)) flat.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true })); return flat.get(color); };
const lowBall = new THREE.SphereGeometry(1, 9, 7);
const snoutGeo = new THREE.CylinderGeometry(0.42, 1, 1, 8).rotateX(Math.PI / 2);
const lowCone = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0);
function lizardHead(head, skin, rng) {
  const c = new THREE.Color(skin);
  const scale = FL(skin), dark = FL('#' + c.clone().multiplyScalar(0.7).getHexString()), pale = FL('#' + c.clone().lerp(new THREE.Color('#e8dcc4'), 0.45).getHexString());
  const horn = FL(pickFrom(rng, ['#e8dcc4', '#3a2a20', '#cfc3a6']));
  part(head, lowBall, scale, [0, 0.12, 0.0], [0.11, 0.105, 0.135]);              // skull
  part(head, snoutGeo, scale, [0, 0.085, 0.15], [0.085, 0.07, 0.16]);           // snout
  part(head, box, pale, [0, 0.035, 0.13], [0.1, 0.035, 0.17], [0.12, 0, 0]);      // lower jaw
  part(head, box, dark, [0, 0.135, 0.12], [0.11, 0.025, 0.09], [-0.25, 0, 0]);   // snout ridge
  for (const s of [-1, 1]) {
    part(head, box, dark, [s * 0.06, 0.165, 0.075], [0.06, 0.025, 0.05], [0, 0, s * 0.25]);   // brow ridge
    part(head, lowBall, FM('#e8c13a'), [s * 0.068, 0.135, 0.085], [0.018, 0.016, 0.014]);    // eye
    part(head, box, FM('#111111'), [s * 0.075, 0.135, 0.09], [0.004, 0.022, 0.006]);         // slit pupil
    part(head, lowBall, FM('#1a1410'), [s * 0.022, 0.1, 0.235], [0.008, 0.006, 0.006]);      // nostril
    part(head, lowCone, horn, [s * 0.05, 0.19, -0.03], [0.022, 0.2, 0.022], [-1.9, 0, -s * 0.12]);   // horns
    part(head, lowCone, horn, [s * 0.085, 0.13, -0.05], [0.014, 0.1, 0.014], [-1.7, 0, -s * 0.5]);   // cheek spikes
  }
  for (let i = 0; i < 4; i++) part(head, lowCone, dark, [0, 0.2 - i * 0.04, -0.05 - i * 0.035], [0.012, 0.06, 0.02], [-1.2 - i * 0.15, 0, 0]);  // crest
}

// ---------- What you wear and carry (the wardrobe) ----------
// Hats sit on the head bone (top of the head is 0.27 up); held things go in the right hand.
function addHat(head, hat, color) {
  if (!head || !hat) return;
  const straw = FL('#d9b86a'), red = FL('#a8241c'), cream = FL('#efe6d4'), gold = new THREE.MeshStandardMaterial({ color: '#e0b347', metalness: 0.7, roughness: 0.3 });
  const brim = new THREE.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0);
  if (hat === 'turban') { const c = color ? FL(color) : cream; part(head, lowBall, c, [0, 0.215, 0.0], [0.13, 0.08, 0.13]); part(head, lowBall, c, [0, 0.26, -0.01], [0.1, 0.06, 0.1]); }
  else if (hat === 'kufiya') {
    // A headscarf falling to the shoulders, held by a dark cord.
    const c = FL(color && color !== '#b8382b' ? '#efe6d4' : '#efe6d4'), check = FL(color === '#b8382b' ? '#b8382b' : '#e8dcc2');
    part(head, lowBall, c, [0, 0.2, -0.005], [0.125, 0.11, 0.13]);
    part(head, box, check, [0, 0.1, -0.09], [0.24, 0.24, 0.05], [0.15, 0, 0]);
    for (const s of [-1, 1]) part(head, box, check, [s * 0.11, 0.08, -0.01], [0.04, 0.22, 0.17], [0, 0, s * 0.1]);
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.014, 6, 18), FL('#1a1410')); cord.rotation.x = Math.PI / 2; cord.position.set(0, 0.235, -0.005); head.add(cord);
  }
  else if (hat === 'fez') { part(head, new THREE.CylinderGeometry(0.75, 1, 1, 12).translate(0, 0.5, 0), red, [0, 0.2, 0.0], [0.09, 0.12, 0.09]); part(head, lowBall, FL('#1a1410'), [0.05, 0.3, -0.05], [0.015, 0.04, 0.015]); }
  else if (hat === 'widebrim') { part(head, brim, FL('#5a3e24'), [0, 0.21, 0.0], [0.24, 0.012, 0.24]); part(head, brim, FL('#5a3e24'), [0, 0.21, 0.0], [0.1, 0.1, 0.1]); part(head, brim, FL('#2b1606'), [0, 0.225, 0.0], [0.103, 0.02, 0.103]); }
  else if (hat === 'feathercap' || hat === 'gullfeather') {
    part(head, new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), FL(hat === 'gullfeather' ? '#2f6b5a' : '#7a2a1c'), [0, 0.2, 0.0], [0.115, 0.09, 0.12]);
    part(head, lowCone, hat === 'gullfeather' ? gold : FL('#f3ede0'), [0.08, 0.25, -0.05], [0.018, 0.22, 0.008], [-0.9, 0, -0.3]);
  }
  else if (hat === 'circlet') { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 20), gold); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.2, 0.0); head.add(ring); part(head, lowBall, FM('#7fe0ff'), [0, 0.2, 0.11], [0.015, 0.015, 0.012]); }
  else if (hat === 'straw') { part(head, new THREE.ConeGeometry(1, 1, 12).translate(0, 0.5, 0), straw, [0, 0.2, 0.0], [0.28, 0.12, 0.28]); }
  else if (hat === 'captain') {
    part(head, brim, FL('#1a1a24'), [0, 0.2, 0.0], [0.11, 0.08, 0.11]);
    for (const a of [0, 2.1, 4.2]) part(head, box, FL('#1a1a24'), [Math.sin(a) * 0.1, 0.24, Math.cos(a) * 0.1], [0.14, 0.06, 0.015], [0, a, 0]);
    part(head, box, gold, [0, 0.27, 0.11], [0.12, 0.012, 0.01]);
  }
}
function addHeld(hand, held) {
  if (!hand || !held) return;
  // The hand's own axes: the fingers point along +y; this turns a held thing to stand upright in the fist.
  // Turned upright later (in the standing pose), from the hand's measured orientation.
  const grip = new THREE.Group();
  grip.position.set(0, 0.08, 0.0);
  hand.add(grip);
  const wood = FL('#6b4a2c'), gold = new THREE.MeshStandardMaterial({ color: '#e0b347', metalness: 0.7, roughness: 0.3 });
  if (held === 'stick') part(grip, new THREE.CylinderGeometry(1, 1, 1, 6), wood, [0, -0.35, 0], [0.018, 1.25, 0.018]);
  else if (held === 'tongs') { for (const s of [-1, 1]) part(grip, box, gold, [s * 0.012, -0.12, 0], [0.012, 0.42, 0.012], [0, 0, s * 0.06]); }
  else if (held === 'tooth') { part(grip, lowCone, FL('#efe6d2'), [0, 0.03, 0], [0.025, 0.14, 0.025], [Math.PI, 0, 0]); }
  else prop(grip, held, 0, -0.02, 0, { h: { Torch: 0.55, Book1_Closed: 0.06, Dagger: 0.32, Sword: 0.9, Lettuce_Harvested: 0.22, Coin: 0.035 }[held] || 0.3 });
  return { grip, hand };
}

// ---------- Building a person ----------
const ROLE_BASE = {
  local: ['men_Farmer', 'women_Medieval', 'men_Worker', 'women_Worker'],
  shopper: ['men_Farmer', 'women_Medieval', 'women_Adventurer', 'men_Adventurer'],
  merchant: ['women_Medieval', 'men_Farmer', 'men_Adventurer'],
  sailor: ['men_Worker', 'women_Worker', 'men_Farmer'],
  dockhand: ['men_Worker', 'women_Worker'],
  adventurer: ['men_Adventurer', 'women_Adventurer', 'women_Medieval'],
  traveler: ['men_Adventurer', 'women_Adventurer', 'women_Witch'],
  pilot: ['women_Witch'], guard: ['men_Adventurer'], steward: ['men_King'], scribe: ['women_Medieval', 'men_Farmer'],
};
const HAIRS = ['#1a1410', '#3a2618', '#6a4a2a', '#a87a3a', '#d9c08a', '#8a2a1a', '#e8e4dc', '#555555'];

// Three.js skips drawing a body part when its bounding sphere is off screen. For skinned parts it
// measures that sphere the first time it's needed, and by then the person stands somewhere in the city,
// so the sphere came out in city coordinates and parts vanished depending on where you looked.
// Measure while the person still stands at the origin, with room for arms and legs to swing.
function fitBounds(group) {
  group.updateMatrixWorld(true);
  group.traverse(o => {
    if (!o.isSkinnedMesh) return;
    o.computeBoundingSphere();
    o.boundingSphere.radius = Math.max(o.boundingSphere.radius * 1.6, o.boundingSphere.radius + 0.5);
  });
}

// look (optional, from the character creator): { base, hair, hue } chosen instead of at random.
export function makeCharacter({ race, role, height, girth, skin, look }, rng) {
  const base = look?.base || pickFrom(rng, ROLE_BASE[role] || ROLE_BASE.local);
  const src = models[base];
  const obj = SkeletonUtils.clone(src.scene);
  const hue = look ? look.hue : role === 'steward' ? 0.78 : role === 'guard' ? 0.45 : role === 'pilot' ? 0.0 : Math.floor(rng() * 12) / 12;
  const sat = role === 'local' || role === 'scribe' ? 0.6 : 1;
  const hair = look ? look.hair : role === 'steward' ? '#1a1410' : pickFrom(rng, HAIRS);
  const worker = /Worker/.test(base);
  let head = null, hips = null;
  obj.traverse(o => {
    if (o.isBone && o.name === 'Head') head = o;
    if (o.isBone && o.name === 'Hips') hips = o;
    if (/Sword/.test(o.name) && role !== 'adventurer' && role !== 'guard') o.visible = false;   // (a group, so check before the mesh test)
    if (race === 'dragonborn' && /_Head$/.test(o.name)) o.visible = false;                     // the lizard head replaces it
    if (!o.isMesh) return;
    // The Farmer body's cowboy hat doesn't belong in the Sultanate: always off (headwear from addHat instead).
    if ((look?.hat || base === 'men_Farmer') && onHead(o) && (BUILT_IN_HATS[base] || []).includes(o.material.name)) o.visible = false;
    o.material = recolor(o.material, { skin, hair, hue, sat, worker });
    o.castShadow = true;
    o.receiveShadow = true;
  });
  addFeatures(race, role, head, hips, skin, hair, rng);
  if (base === 'men_Farmer' && !look?.hat) {
    const h = look ? 'turban' : pickFrom(rng, ['turban', 'turban', 'kufiya', 'fez', 'kufiya']);
    addHat(head, h, pickFrom(rng, ['#efe6d4', '#e8dcc2', '#2f6c8e', '#8e3b6c', '#b8382b', '#d7a33a', '#f3ede0']));
  }
  let heldGrip = null;
  if (look) {
    let hand = null;
    // (The right hand bone is named WristR, HandR or Hand.R depending on the model.)
    obj.traverse(o => { if (o.isBone && /^(WristR|HandR|Hand\.R|Hand_R)$/.test(o.name)) hand = hand || o; });
    addHat(head, look.hat);
    heldGrip = addHeld(hand, look.held);
    if (look.beard && race !== 'dwarf' && race !== 'dragonborn') part(head, cone, FM(hair), [0, 0.05, 0.095], [0.07, -0.13, 0.04], [0.2, 0, 0]);
  }

  const s = height / BODY_HEIGHT;
  obj.scale.set(s * girth, s, s * girth);
  obj.rotation.y = Math.PI;           // the models face +z; our people face -z
  const group = new THREE.Group();
  group.add(obj);

  const mixer = new THREE.AnimationMixer(obj);
  const clip = (n) => src.clips.find(c => c.name === n);
  const actions = {};
  for (const [k, n] of [['idle', role === 'guard' ? 'Idle_Sword' : 'Idle'], ['walk', 'Walk'], ['talk', 'Interact'], ['cheer', 'Wave'], ['sit', 'Idle_Neutral'], ['pick', 'Interact']]) {
    actions[k] = mixer.clipAction(clip(n) || clip('Idle'));
  }
  actions.idle.play();
  mixer.setTime(rng() * 3);    // so the crowd doesn't move in step
  if (heldGrip) {
    // Stand the held thing upright: undo the hand's turn as it is in the standing pose.
    group.updateMatrixWorld(true);
    const hq = heldGrip.hand.getWorldQuaternion(new THREE.Quaternion());
    const gq = group.getWorldQuaternion(new THREE.Quaternion());
    heldGrip.grip.quaternion.copy(hq.invert().multiply(gq));
  }
  fitBounds(group);
  let current = 'idle';
  const play = (name, fade = 0.25) => {
    if (name === current || !actions[name]) return;
    actions[name].reset().fadeIn(fade).play();
    actions[current].fadeOut(fade);
    current = name;
  };
  group.userData = { mixer, play, base };
  return group;
}

// ---------- King Shou's statue ----------
// The King's figure, frozen mid-wave with a hand raised, cast in polished gold.
export function makeStatue(scene, { x, y, z }, height = 4.6) {
  const src = models.men_King;
  if (!src) return;
  const obj = SkeletonUtils.clone(src.scene);
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b347', metalness: 0.9, roughness: 0.32 });
  obj.traverse(o => { if (o.isMesh) { o.material = gold; o.castShadow = true; o.receiveShadow = true; } });
  const mixer = new THREE.AnimationMixer(obj);
  const clip = src.clips.find(c => c.name === 'Wave') || src.clips.find(c => c.name === 'Idle');
  mixer.clipAction(clip).play();
  mixer.setTime(clip.duration * 0.3);
  obj.scale.setScalar(height / BODY_HEIGHT);
  obj.rotation.y = Math.PI;      // facing the sea, like the plaque
  fitBounds(obj);
  obj.position.set(x, y, z);
  scene.add(obj);
  return obj;
}
