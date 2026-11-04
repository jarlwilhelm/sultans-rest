// Animated people, made from Quaternius's free (CC0) kits by tools/blender/people.py (assets/people):
// six outfits (peasant, ranger and robe, for him and her), each with the base character's head and every
// hairstyle on one skeleton; the animations are in assets/people/anims.glb. Each person gets their race's
// skin, their own hair colour and haircut, recoloured clothes, and race features (horns, ears, tusks,
// beards, snouts, tails) fixed to the head and hips. (These replaced the older Ultimate Modular Men and
// Women on 2026-11-03, whose hard hats, overalls and witch's hat looked out of place. Only King Shou's
// golden statue still uses an older model.)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { prop } from './interiors.js';

const BASES = ['men_King'];       // only King Shou's statue still uses an older model
export const KITS = ['Male_Peasant', 'Male_Ranger', 'Male_Robe', 'Female_Peasant', 'Female_Ranger', 'Female_Robe'];
// Saves and wardrobes from before the kits: the old outfits they become.
export const RETIRED = { men_Worker: 'Male_Peasant', women_Worker: 'Female_Peasant', men_Farmer: 'Male_Peasant',
  men_Adventurer: 'Male_Ranger', women_Adventurer: 'Female_Ranger', women_Medieval: 'Female_Robe', women_Witch: 'Female_Robe', men_King: 'Male_Robe' };
const isKit = (b) => KITS.includes(b);
// Hairstyles on the kits (any style on any kit). null = shaved.
export const STYLES = [['Hair_SimpleParted', 'Parted'], ['Hair_Buzzed', 'Cropped'], ['Hair_Long', 'Long'], ['Hair_Buns', 'Buns'],
  ['Hair_BuzzedFemale', 'Short'], [null, 'Shaved']];
const NPC_STYLES = { Male: ['Hair_SimpleParted', 'Hair_SimpleParted', 'Hair_Buzzed', 'Hair_Long', null], Female: ['Hair_Long', 'Hair_Long', 'Hair_Buns', 'Hair_BuzzedFemale'] };
const KIT_CLIPS = { idle: 'Idle_Loop', walk: 'Walk_Loop', talk: 'Idle_Talking_Loop', cheer: 'Interact', sit: 'Sitting_Idle_Loop', pick: 'PickUp_Table' };
let kitClips = [];
const BODY_HEIGHT = 1.82;     // metres, feet to the top of the head
const models = {};


export async function loadCharacters() {
  const loader = new GLTFLoader();
  await Promise.all(BASES.map(async (name) => {
    const g = await loader.loadAsync(`assets/quaternius/people/${name}.glb`);
    models[name] = { scene: g.scene, clips: g.animations };
  }));
  await Promise.all([...KITS, 'anims'].map(async (name) => {
    const g = await loader.loadAsync(`assets/people/${name}.glb`);
    if (name === 'anims') { kitClips = g.animations; return; }
    models[name] = { scene: g.scene, clips: [], kit: measureKit(g.scene) };
  }));
}

// A kit's height (feet to the top of the head) and where its head is, measured once in the standing pose.
function measureKit(scene) {
  scene.updateMatrixWorld(true);
  let head = null;
  scene.traverse(o => { if (o.isMesh && o.name === 'Head_Skin') head = o; });
  const hb = new THREE.Box3().setFromObject(head);
  return { height: hb.max.y, top: hb.max.y, front: hb.max.z, cx: (hb.min.x + hb.max.x) / 2 };
}

// A point fixed to a bone that has the same axes and metre scale as the whole figure (the kits' bones
// are turned and scaled their own way). Hats, horns and tails hang on these, as on the older models' bones.
function anchorOn(bone, root, at) {
  root.updateMatrixWorld(true);
  const a = new THREE.Object3D();
  const want = new THREE.Matrix4().compose(at, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
  // `at` is in the figure's own space; to the bone's: bone^-1 x figure x at.
  const local = bone.matrixWorld.clone().invert().multiply(root.matrixWorld.clone().multiply(want));
  local.decompose(a.position, a.quaternion, a.scale);
  bone.add(a);
  return a;
}
export const BODIES = [['Male_Peasant', 'Peasant (him)'], ['Female_Peasant', 'Peasant (her)'], ['Male_Ranger', 'Ranger (him)'], ['Female_Ranger', 'Ranger (her)'],
  ['Male_Robe', 'Robe (him)'], ['Female_Robe', 'Robe (her)']];
export { HAIRS };
export function charactersReady() { return Object.keys(models).length === BASES.length + KITS.length && kitClips.length > 0; }

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
  else if (hat === 'redfeather') {
    part(head, brim, FL('#16141a'), [0, 0.2, 0.0], [0.23, 0.012, 0.23]); part(head, brim, FL('#16141a'), [0, 0.2, 0.0], [0.105, 0.11, 0.105]);
    part(head, brim, FL('#7a1408'), [0, 0.215, 0.0], [0.108, 0.022, 0.108]);
    part(head, lowCone, FL('#b8180c'), [0.09, 0.27, -0.04], [0.02, 0.26, 0.008], [-1.0, 0, -0.35]);
  }
  else if (hat === 'silvercirclet') { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.01, 6, 20), new THREE.MeshStandardMaterial({ color: '#d8dde8', metalness: 0.8, roughness: 0.25 })); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.2, 0.0); head.add(ring); part(head, lowBall, FM('#9a4be0'), [0, 0.2, 0.11], [0.017, 0.017, 0.012]); }
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
  else if (held === 'compass') { part(grip, new THREE.CylinderGeometry(1, 1, 1, 18), gold, [0, -0.02, 0], [0.045, 0.012, 0.045], [Math.PI / 2, 0, 0]); part(grip, box, FL('#b8180c'), [0, -0.02, 0.008], [0.006, 0.06, 0.004], [0, 0, 0.7]); }
  else if (held === 'tooth') { part(grip, lowCone, FL('#efe6d2'), [0, 0.03, 0], [0.025, 0.14, 0.025], [Math.PI, 0, 0]); }
  else prop(grip, held, 0, -0.02, 0, { h: { Torch: 0.55, Book1_Closed: 0.06, Dagger: 0.32, Sword: 0.9, Lettuce_Harvested: 0.22, Coin: 0.035 }[held] || 0.3 });
  return { grip, hand };
}

// ---------- Building a person ----------
const ROLE_BASE = {
  local: ['Male_Peasant', 'Female_Peasant', 'Male_Robe', 'Female_Robe', 'Male_Peasant', 'Female_Robe'],
  shopper: ['Male_Peasant', 'Female_Peasant', 'Male_Robe', 'Female_Robe', 'Male_Ranger'],
  merchant: ['Male_Robe', 'Female_Robe', 'Male_Robe', 'Female_Robe', 'Male_Peasant'],
  sailor: ['Male_Peasant', 'Female_Peasant', 'Male_Ranger'],
  dockhand: ['Male_Peasant', 'Female_Peasant'],
  adventurer: ['Male_Ranger', 'Female_Ranger'],
  traveler: ['Male_Ranger', 'Female_Ranger', 'Male_Robe', 'Female_Robe'],
  pilot: ['Female_Robe', 'Male_Robe'], guard: ['Male_Ranger'], steward: ['Male_Robe'], scribe: ['Female_Robe', 'Male_Robe'],
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
  const base = RETIRED[look?.base] || look?.base || pickFrom(rng, ROLE_BASE[role] || ROLE_BASE.local);
  return makeKitCharacter({ race, role, height, girth, skin, look, base: isKit(base) ? base : 'Male_Peasant' }, rng);
}

// ---------- A kit person (outfit + head + one hairstyle on one skeleton) ----------
const tintCache = new Map();
function tinted(mat, key, set) {
  const k = `${mat.uuid}|${key}`;
  if (!tintCache.has(k)) { const m = mat.clone(); set(m); tintCache.set(k, m); }
  return tintCache.get(k);
}
function makeKitCharacter({ race, role, height, girth, skin, look, base }, rng) {
  const src = models[base];
  const obj = SkeletonUtils.clone(src.scene);
  const sex = base.startsWith('Female') ? 'Female' : 'Male';
  const hue = look ? look.hue : role === 'guard' ? 0.45 : role === 'pilot' ? 0.75 : role === 'steward' ? 0.78 : Math.floor(rng() * 12) / 12;
  const hair = look ? look.hair : role === 'steward' ? '#1a1410' : pickFrom(rng, HAIRS);
  const gold = look ? look.trim === 'gold' : role === 'steward';
  const style = look ? (look.style !== undefined ? look.style : NPC_STYLES[sex][0]) : pickFrom(rng, NPC_STYLES[sex]);
  const beard = sex === 'Male' && race !== 'dwarf' && race !== 'dragonborn' && (look ? !!look.beard : rng() < 0.4);
  const horned = race === 'tiefling' || race === 'dragonborn' || race === 'gnome';
  const hood = !look?.hat && !horned && role !== 'guard';   // the ranger's hood, unless something else is on the head (guards wear turbans)
  let head = null, hips = null, hand = null, mid = null, hooded = false;
  obj.traverse(o => {
    if (o.isBone && o.name === 'Head') head = o;
    if (o.isBone && o.name === 'pelvis') hips = o;
    if (o.isBone && o.name === 'hand_r') hand = o;
    if (o.isBone && o.name === 'middle_01_r') mid = o;
    if (!o.isMesh) return;
    if (/_Head_Hood$/.test(o.name)) { o.visible = hood; hooded = hood; }
  });
  obj.traverse(o => {
    if (!o.isMesh) return;
    const n = o.name, m = o.material.name;
    if (/^Hair_/.test(n)) o.visible = !hooded && (n === style || (beard && n === 'Hair_Beard'));
    if (race === 'dragonborn' && (n === 'Head_Skin' || n === 'Eyes' || /^Eyebrows|^Hair_/.test(n))) o.visible = false;
    if (/^Skin/.test(m)) o.material = tinted(o.material, `skin|${skin}`, (x) => x.color.set(skin));
    else if (/^Hair/.test(m)) o.material = tinted(o.material, `hair|${hair}`, (x) => x.color.set(hair));
    else if (m === 'Sash' && gold) o.material = tinted(o.material, 'gold', (x) => { x.color.set('#e0b347'); x.metalness = 0.6; x.roughness = 0.35; });
    // Textured cloth is tinted lightly (the colour multiplies the texture); the plain robes get the colour itself.
    else if (/^Cloth/.test(m) && hue) o.material = tinted(o.material, `cloth|${hue.toFixed(2)}`, (x) => /Robe/.test(m) ? x.color.setHSL(hue, 0.42, 0.42) : x.color.setHSL(hue, 0.45, 0.8));
    o.castShadow = true;
    o.receiveShadow = true;
  });
  // Anchors in the older models' terms (see addFeatures): the head's top is 0.27 above the head point
  // and its face 0.13 in front; the hip point is the pelvis.
  const k = src.kit;
  const headAt = anchorOn(head, obj, new THREE.Vector3(k.cx, k.top - 0.27, k.front - 0.13));
  obj.updateMatrixWorld(true);
  const hipsAt = hips ? anchorOn(hips, obj, obj.worldToLocal(hips.getWorldPosition(new THREE.Vector3()))) : null;
  addFeatures(race, role, headAt, hipsAt, skin, hair, rng);
  let heldGrip = null;
  if (look) {
    addHat(headAt, look.hat);
    if (hand && look.held) {
      const handAt = anchorOn(hand, obj, obj.worldToLocal(hand.getWorldPosition(new THREE.Vector3())));
      heldGrip = addHeld(handAt, look.held);
      // Toward the fingers, 8 cm from the wrist.
      if (heldGrip && mid) {
        const d = mid.getWorldPosition(new THREE.Vector3()).sub(hand.getWorldPosition(new THREE.Vector3())).normalize().multiplyScalar(0.08);
        heldGrip.grip.position.copy(d);
      }
    }
  }

  const s = height / k.height;
  obj.scale.set(s * girth, s, s * girth);
  obj.rotation.y = Math.PI;           // the models face +z; our people face -z
  const group = new THREE.Group();
  group.add(obj);
  const mixer = new THREE.AnimationMixer(obj);
  const clip = (n) => kitClips.find(c => c.name === n);
  const actions = {};
  for (const [key, n] of Object.entries(KIT_CLIPS)) actions[key] = mixer.clipAction(clip(n) || clip('Idle_Loop'));
  actions.idle.play();
  mixer.setTime(rng() * 3);
  if (heldGrip) {
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
