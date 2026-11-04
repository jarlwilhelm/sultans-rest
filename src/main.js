// Trader Quest: puts the scene together, lets you walk around, and runs the game on top.
import * as THREE from 'three';
import { buildSky, buildLights, buildWater, buildPassage, buildKraken, HAZE } from './sea.js';
import { buildLand, footHeight, walkable, colliders, groundHeight } from './land.js';
import { buildBoard } from './game/daily.js';
import { buildCity } from './city.js';
import { buildShips } from './ships.js';
import { buildPeople } from './people.js';
import { readables } from './signs.js';
import { HarborSound } from './sound.js';
import { skyLighting, effects, dust } from './look.js';
import { loadCharacters, makeStatue, makeCharacter } from './characters.js';
import { RACES } from './people.js';
import { state, save } from './game/state.js';
import { busy, ui, closePanel, panelKey, sheet, journal, inventory, toast, updateStatus, talk } from './game/ui.js';
import { resetGame, slot } from './game/state.js';
import { titleMenu } from './menu.js';
import { interact, newDay } from './game/npcs.js';
import { arcade } from './minigames/index.js';
import { daylight } from './daylight.js';
import { strangerWatch } from './game/stranger.js';
import { seizureWatch } from './game/seizure.js';
import { crossing, startCrossing } from './crossing.js';
import { inMeridia, PLACE_NAMES, PLACE, PREVIEW } from './place.js';
import { buildMeridia } from './meridia/city.js';
import { buildMeridiaLife } from './meridia/life.js';
import { buildProperty } from './property.js';
import { buildAlesHouse, furnish, lockPalace } from './buildings.js';
import { buildSideErrands } from './sidework.js';
import { placeShopKeepers, furnishShops } from './shops.js';
import { buildCellar } from './cellar.js';
import { furnishShrine } from './shrine.js';
import { placeGoods } from './goods.js';
import { compass, openMap } from './nav.js';
import { loadProps, windowLight } from './interiors.js';
import { scatterGround } from './land.js';
import { fireLights } from './fire.js';
import { fitWaitingHulls } from './ships.js';
import { sneakWatch } from './game/sneak.js';
import { palaceGate } from './game/quests.js';
import { groundTime } from './look.js';
import { sortScene, showPlace, roomAt, currentRoom, doorNear, useDoor, doorMoving, visibleDeep } from './rooms.js';
import { intro } from './game/story.js';
import { tiredness, sleepUntilMorning } from './game/rest.js';
import { UNLOCKS, level } from './game/state.js';

const $ = (id) => document.getElementById(id);
const GAME_MINUTES_PER_SECOND = 2;    // a full day is 12 real minutes

async function main() {
  // Signs and posters are drawn with these fonts, so wait until they've loaded.
  await Promise.race([
    Promise.all(['bold 40px Cinzel', '20px "IM Fell English"', 'italic 20px "IM Fell English"'].map(f => document.fonts.load(f))),
    new Promise(r => setTimeout(r, 3000)),
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  $('view').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(HAZE, 80, 700);
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 2500);

  const sky = buildSky(scene);
  skyLighting(renderer, scene);
  const updateDust = dust(scene);
  const followSun = buildLights(scene);
  buildLand(scene);
  const updateWater = buildWater(scene, scene.fog);
  // Which city: Sultan's Rest (Chapter One) or Meridia (Chapter Two, meridia/). Only that one is built.
  const updatePassage = inMeridia ? () => {} : buildPassage(scene);
  const updateKraken = inMeridia ? () => {} : buildKraken(scene);
  const lookables = [];
  if (inMeridia) buildMeridia(scene);
  else {
    buildCity(scene);
    buildBoard(scene, readables, colliders, groundHeight, { x: -40, z: 8, ry: 0 });   // the trade notices (daily quests): on the quay between the market and your stand
    buildAlesHouse(scene);
    lockPalace(scene);
    placeShopKeepers(scene);       // Samira and Doss into their shops (shops.js)
  }
  const updateShips = buildShips(scene, lookables);
  const updateProperty = inMeridia ? () => {} : buildProperty(scene);
  scatterGround(scene);            // rocks and grass tufts, after the buildings so they stay out of them
  try { await loadCharacters(); } catch (e) { console.warn('Characters did not load; using simple figures.', e); }
  try { await loadProps(); if (!inMeridia) furnish(scene); placeGoods(scene); fitWaitingHulls(); } catch (e) { console.warn('Furniture did not load.', e); }
  dispatchEvent(new CustomEvent('lavine:property'));
  if (!inMeridia) { furnishShops(scene); furnishShrine(scene); buildSideErrands(scene); scene.userData.cellar = buildCellar(scene); }   // + the cellar with the Dragon Doors (cellar.js; no way in yet)   // the nine side-quest people and what you find for them (sidework.js)
  const updatePeople = buildPeople(scene, lookables);
  if (!inMeridia) makeStatue(scene, scene.userData.statueBase);
  const updateLife = inMeridia ? buildMeridiaLife(scene, lookables) : () => {};   // Meridia's own people, your ship, your stand and home (meridia/life.js)
  const flames = scene.userData.flames;
  const fx = effects(renderer, scene, camera);
  try { const g = localStorage.getItem('lavine-graphics'); if (g != null) fx.quality = +g; } catch { /* fine */ }
  const updateCompass = compass($('hud'));

  // You, as others see you (third person, V). Rebuilt when you change your look.
  const view = { third: false, dist: 0 };
  let avatar = null;
  function buildAvatar() {
    if (avatar) scene.remove(avatar);
    avatar = null;
    // Games saved before the creator existed have no look yet: make one from the people you chose.
    if (!state.look && state.flags.intro) {
      const race = (state.race || 'Human').toLowerCase();
      const r = RACES[race] ? race : 'human';
      state.look = { race: r, base: 'Male_Peasant', skin: RACES[r].skin[Math.min(1, RACES[r].skin.length - 1)], hair: '#3a2618', hue: 0 };
      save();
      setTimeout(() => toast('You can change how you look at Ale\'s wardrobe, the tailor or the barber.', 7000), 3000);
    }
    if (!state.look) return;
    const r = RACES[state.look.race] || RACES.human;
    avatar = makeCharacter({ race: state.look.race, role: 'traveler', height: r.h, girth: r.girth, skin: state.look.skin, look: state.look }, Math.random);
    avatar.visible = view.third;
    avatar.userData.keep = true;      // you're drawn inside and out
    scene.add(avatar);
  }
  buildAvatar();
  addEventListener('lavine:look', buildAvatar);
  const updateDaylight = daylight(scene, sky, renderer);
  const stranger = inMeridia ? () => {} : strangerWatch(scene, lookables);
  const seizure = inMeridia ? () => {} : seizureWatch(scene);              // the Meridian cargo seized on the quay (game/seizure.js)
  const sneak = inMeridia ? () => {} : sneakWatch(scene);                 // following, overhearing, the watcher (game/sneak.js)
  sortScene(scene);                  // the city in one group, each room's things in its own (rooms.js)
  const fireUpdate = fireLights(scene, 5);   // flames, sparks, and real light on the nearest fires and lanterns (fire.js)
  const roomLight = new THREE.PointLight('#ffcf8a', 0, 20, 2);
  scene.add(roomLight);

  // ---------- The player ----------
  // Start at the end of the Grand Pier, looking back at the city.
  const player = { x: 0, z: -56, yaw: Math.PI, pitch: 0.04, y: 0, bob: 0, jump: 0, vy: 0 };
  // For testing on this computer only (the browser console): lavineDebug.player.x = ... to stand somewhere.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window.lavineDebug = { player, scene, camera, step: (n = 1) => { for (let i = 0; i < n; i++) frame(true); } };
  addEventListener('lavine:crossing', () => startCrossing(scene, () => { player.x = 0; player.z = -60; player.yaw = Math.PI; }));
  // Levinite (game/levinite.js): the sunset holds while you're carried from place to place, then it's morning.
  let high = false;
  addEventListener('lavine:high', async (e) => {
    high = true;
    const fadeEl = $('fade'), wait = (ms) => new Promise(r => setTimeout(r, ms));
    for (const s of e.detail.stops) {
      fadeEl.textContent = ''; fadeEl.classList.add('on'); await wait(900);
      player.x = s.x; player.z = s.z; player.yaw = s.yaw; player.pitch = 0.05; state.minute = 19 * 60 + 35;
      fadeEl.classList.remove('on'); await wait(700);
      toast(s.text, 3600); await wait(3600);
    }
    fadeEl.textContent = '...'; fadeEl.classList.add('on'); await wait(1800);
    state.day++; state.minute = 7 * 60; state.awake = 0;
    const m = state.mer || {};
    if (m.home) { const { homeSpot } = await import('./meridia/spots.js'); const h = homeSpot(m.home); player.x = h.x; player.z = h.z - 6; } else { player.x = -52; player.z = 44; }
    player.yaw = Math.PI;
    newDay();
    high = false;
    fadeEl.classList.remove('on'); setTimeout(() => { fadeEl.textContent = ''; }, 1000);
    import('./game/levinite.js').then(L => L.wakeUp());
  });
  // The Republic's gaol (meridia/watch.js): you're let out into the street outside it.
  addEventListener('lavine:jailed', () => { player.x = 12; player.z = 100; player.yaw = Math.PI; updateStatus(); });
  player.y = footHeight(player.x, player.z) + 1.65;
  const keys = new Set();
  const sound = new HarborSound();
  let reading = null;

  const canvas = renderer.domElement;
  // Normally the mouse is captured (pointer lock). Where a page can't capture it (some embedded
  // pages), we fall back to "drag to look": hold the mouse button and move.
  let soft = false, dragging = false, softTold = false;
  const locked = () => document.pointerLockElement === canvas || soft;
  const lock = () => {
    $('resume').classList.add('hidden');
    let req = null;
    try { req = canvas.requestPointerLock(); } catch { req = null; }
    const fallback = () => {
      if (document.pointerLockElement === canvas || soft) return;
      soft = true;
      $('hud').classList.remove('dim');
      if (!softTold) { softTold = true; toast('Hold the mouse button and drag to look around. Esc to stop.', 7000); }
    };
    // Only fall back when the browser really says no. Without an answer, wait longer (embedded pages answer late).
    if (req?.catch) req.catch(fallback);
    else setTimeout(fallback, 1500);
  };
  canvas.addEventListener('mousedown', () => { dragging = true; });
  addEventListener('mouseup', () => { dragging = false; });
  let mapOpen = false;
  const free = () => !doorMoving() && !reading && !busy() && !arcade.active && !mapOpen && $('creator').classList.contains('hidden');
  // The title menu (menu.js): Continue / New Game / Load Game / Options. Playing starts here.
  const play = () => {
    $('start').classList.add('hidden');
    $('hud').classList.remove('hidden');
    sound.start();
    if (!state.flags.intro) intro();       // your name, your people, the letter about Ale
    else lock();
    dispatchEvent(new CustomEvent('lavine:play'));
  };
  // ?scene=crossing: play the crossing on its own, straight away (place.js; nothing is saved).
  if (PREVIEW === 'crossing') setTimeout(() => {
    $('start').classList.add('hidden'); $('loading').classList.add('hidden');
    sound.start();
    startCrossing(scene, null, { preview: true });
  }, 600);
  // The title screen and the place name say which city you're in.
  if (inMeridia) {
    const subs = document.querySelectorAll('#start .sub');
    subs[0].textContent = 'Chapter Two · Meridia, capital of the Coastal Republic';
    subs[1].textContent = 'Green hills, stone walls, and a city that doesn\'t know your name yet.';
    $('place').textContent = 'MERIDIA · THE COASTAL REPUBLIC';
  }
  $('resume').addEventListener('click', lock);
  canvas.addEventListener('click', () => { if (free() && $('start').classList.contains('hidden')) lock(); });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) soft = false;   // the real capture worked: no more drag-to-look
    $('hud').classList.toggle('dim', !locked());
    if (!locked() && free() && $('start').classList.contains('hidden')) $('resume').classList.remove('hidden');
  });
  document.addEventListener('mousemove', (e) => {
    if (!locked() || !free()) return;
    if (soft && !dragging) return;
    player.yaw -= e.movementX * 0.0022;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - e.movementY * 0.0022));
  });
  addEventListener('keydown', (e) => {
    if (crossing.active) { if (e.code === 'Escape') crossing.skip(); return; }
    if (arcade.active || mapOpen || !$('creator').classList.contains('hidden')) return;   // a mini-game, the map or a wardrobe has the keyboard
    if (panelKey(e)) { e.preventDefault(); return; }  // a conversation or trade is open
    if (e.code === 'Escape' && soft && free()) { soft = false; $('hud').classList.add('dim'); $('resume').classList.remove('hidden'); return; }
    // While a conversation or trade is open, nothing else. While a menu (character, quests, inventory) is open,
    // C / Q / J / I close it (C still closes anything, as before).
    const menuOpen = busy() && ui.open?.classList?.contains('sheet');
    if (busy() && e.code !== 'KeyC' && !(menuOpen && ['KeyJ', 'KeyQ', 'KeyI'].includes(e.code))) return;
    keys.add(e.code);
    if (e.code === 'KeyE') {
      if (reading) closeReading();
      else if (current.npc) { keys.clear(); interact(current.npc); }
      else if (current.readable) openReading(current.readable);
      else if (current.door) {
        const { door, side } = current.door;
        if (side === 'out' && level() < door.level) toast(`${door.name} opens at level ${door.level}.`);
        else if (door.gate && side === 'out' && !state.flags.palacePass) { keys.clear(); talk(palaceGate()); }
        else { keys.clear(); useDoor(current.door, player); }
      }
    }
    if (e.code === 'Escape' && reading) closeReading();
    // C, Q (or J) and I open the character sheet, quests and inventory; the same key again closes it,
    // another of them switches straight over.
    const which = (k) => ui.open?.classList?.contains(k);
    if (e.code === 'KeyC') { if (busy() && (!menuOpen || (!which('quests') && !which('inventory')))) closePanel(); else if (!reading) { keys.clear(); sheet(); } }
    if (e.code === 'KeyP' && !reading) { keys.clear(); pauseMenu(); return; }
    if (e.code === 'KeyJ' || e.code === 'KeyQ') { if (which('quests')) closePanel(); else if (!reading) { keys.clear(); journal(); } }
    if (e.code === 'KeyI') { if (which('inventory')) closePanel(); else if (!reading) { keys.clear(); inventory(); } }
    if (e.code === 'KeyV' && free()) {
      if (!avatar) buildAvatar();
      if (!avatar) { toast('Your character isn\'t ready yet.'); return; }
      view.third = !view.third;
      if (avatar) avatar.visible = view.third;
      toast(view.third ? 'Third person (V to go back)' : 'First person');
    }
    if (e.code === 'KeyN') $('mute').textContent = sound.toggle() ? 'Sound off (N)' : '';
    if (e.code === 'KeyM' && !reading && !mapOpen) {
      keys.clear(); mapOpen = true;
      if (document.pointerLockElement) document.exitPointerLock();
      openMap(player, () => { mapOpen = false; $('resume').classList.remove('hidden'); });
      return;
    }
    if (e.code === 'Space' && locked() && free() && player.jump === 0 && player.vy === 0) { player.vy = 5.2; e.preventDefault(); }
    if (e.code === 'KeyG') {
      fx.quality = (fx.quality + 2) % 3;
      try { localStorage.setItem('lavine-graphics', String(fx.quality)); } catch { /* fine */ }
      toast(['Graphics: low (fastest)', 'Graphics: medium (glow)', 'Graphics: high (glow + soft shadows)'][fx.quality]);
    }
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    fx.resize(innerWidth, innerHeight);
  });

  // The pause menu (P). Time is stopped while it's open, like every menu.
  function pauseMenu() {
    pauseOpen = true;
    const q = ['Low (fastest)', 'Medium (glow)', 'High (glow + soft shadows)'];
    const vols = [['Off', 0], ['Quiet', 0.1], ['Normal', 0.18], ['Louder', 0.32]];
    const node = () => ({ name: 'Paused', text: [`Day ${state.day}, ${state.name || 'traveler'} of Sultan's Rest. Your game saves by itself.`], options: [
      { label: 'Resume' },
      { label: 'Controls', do: () => ({ name: 'Controls', text: [
        'W A S D walk · mouse look · Shift run · Space jump · V see yourself',
        'E talk, read, use · 1-9 pick an answer · C character · J your story · M map',
        'N sound on/off · G graphics · P pause · Esc frees the mouse'], options: [{ label: 'Back', do: node }] }) },
      { label: `Graphics: ${q[fx.quality]}`, do: () => { fx.quality = (fx.quality + 2) % 3; try { localStorage.setItem('lavine-graphics', String(fx.quality)); } catch { /* fine */ } return node(); } },
      { label: `Sound: ${sound.muted ? 'off' : 'on'}`, do: () => { sound.toggle(); $('mute').textContent = sound.muted ? 'Sound off (N)' : ''; return node(); } },
      { label: `Music: ${(vols.find(v => Math.abs(v[1] - (sound.audio ? (sound.audio.muted ? 0 : sound.audio.volume) : 0.18)) < 0.01) || vols[2])[0]}`, do: () => {
        if (sound.audio) { const cur = vols.findIndex(v => Math.abs(v[1] - sound.audio.volume) < 0.01); const nx = vols[(cur + 1) % vols.length]; sound.audio.volume = nx[1]; }
        return node();
      } },
      { label: 'Save now', hint: `Slot ${slot} (the game also saves by itself)`, do: () => { save(); toast(`Saved to Slot ${slot}.`); return node(); } },
      { label: 'Quit to the title menu', hint: 'saves first', do: () => { save(); location.reload(); return 'keep'; } },
      { label: 'Start over', hint: 'erases your game', do: () => ({ name: 'Start over?', text: ['This erases your save: your shop, your story, your gold. Are you sure?'], options: [
        { label: 'Yes, start over', do: () => { resetGame(); location.reload(); return 'keep'; } }, { label: 'No', do: node }] }) },
    ] });
    talk(node());
  }

  function openReading(r) {
    if (r.action) { r.action(); return; }          // things you use rather than read (pick, sell)
    r.onRead?.();
    reading = r;
    keys.clear();
    const img = $('reading-img');
    img.src = r.canvas.toDataURL();
    img.className = r.canvas.width > r.canvas.height ? 'wide' : '';
    $('reading').classList.remove('hidden');
  }
  function closeReading() {
    reading = null;
    $('reading').classList.add('hidden');
  }

  // ---------- What you're looking at ----------
  const ray = new THREE.Raycaster();
  const current = { readable: null, npc: null, door: null };
  const forward = new THREE.Vector3();
  const objectOf = (hitObj, list) => { let o = hitObj; while (o && !list.includes(o)) o = o.parent; return o; };
  // Line of sight (2026-11-04, the user's report: the cursor picked things far away when looking at something
  // close, and in Ale's house things in other places). How far you can see straight ahead before something
  // solid (a wall, a building, a stall, a sign) is in the way; checked 8 times a second. Nothing behind that
  // counts, and nothing outside the room you're in.
  let sight = Infinity, sightTimer = 0, solids = [], solidsCount = -1;
  function solidList() {
    let n = 0; scene.traverse(() => { n++; });
    if (n === solidsCount) return solids;
    solidsCount = n;
    const people = new Set(lookables.filter(l => l.person).map(l => l.object));
    solids = [];
    scene.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || o.isSprite || o.material?.transparent || o.userData.noBlock) return;
      for (let p = o; p; p = p.parent) if (people.has(p)) return;
      solids.push(o);
    });
    return solids;
  }
  function lineOfSight(dt) {
    if ((sightTimer -= dt) > 0) return sight;
    sightTimer = 0.12;
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    ray.near = view.dist ? view.dist * 0.8 : 0;
    ray.far = 125;
    const hit = ray.intersectObjects(solidList().filter(visibleDeep), false)[0];
    ray.near = 0;
    sight = hit ? hit.distance : Infinity;
    return sight;
  }
  function lookAround(dt = 0.016) {
    camera.getWorldDirection(forward);
    const clearTo = lineOfSight(dt) + 0.35;
    const here = currentRoom();
    const sameRoom = (o) => { const w = o.getWorldPosition(new THREE.Vector3()); return roomAt(w.x, w.y + 0.5, w.z) === here; };
    const lookObjects = lookables.filter(l => visibleDeep(l.object)).map(l => l.object);   // only people in the place you're in
    // A person in the middle of the view, not behind anything.
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    ray.far = 14;
    let hit = ray.intersectObjects(lookObjects, true)[0];
    if (hit && (hit.distance > clearTo || !sameRoom(objectOf(hit.object, lookObjects)))) hit = null;
    let l = hit && lookables.find(x => x.object === objectOf(hit.object, lookObjects));
    if (!l && !here) {
      // Far off: a ship, only if nothing nearer is in the way.
      ray.far = 120;
      const ships = lookables.filter(x => !x.person && visibleDeep(x.object)).map(x => x.object);
      hit = ray.intersectObjects(ships, true)[0];
      if (hit && hit.distance > clearTo) hit = null;
      l = hit && lookables.find(x => x.object === objectOf(hit.object, ships));
    }
    const talkable = l && l.npc && hit.distance < 4.2 + view.dist ? l : null;
    current.npc = talkable ? { ...talkable.npc, label: talkable.npc.label || talkable.label, onGone: talkable.onGone } : null;
    // A sign, poster, door or clue within reach: one your line of sight actually reaches (signs hit dead on win;
    // things without a board of their own need you to face them, with nothing in between), in the room you're in.
    let best = null, bestScore = 0;
    if (!talkable) {
      ray.far = 4.5 + view.dist;
      const boards = readables.filter(r => r.mesh && visibleDeep(r.mesh) && !(r.when && !r.when())).map(r => r.mesh);
      const bh = ray.intersectObjects(boards, false)[0];
      if (bh && bh.distance <= clearTo + 0.2) best = readables.find(r => r.mesh === bh.object);
    }
    if (!talkable && !best) for (const r of readables) {
      const d = r.pos.distanceTo(camera.position) - view.dist;
      if (d > 4.5 || (r.when && !r.when()) || roomAt(r.pos.x, r.pos.y, r.pos.z) !== here) continue;
      if (r.pos.distanceTo(camera.position) > clearTo + 1.2) continue;     // something solid is in the way
      const dir = r.pos.clone().sub(camera.position).normalize();
      const score = dir.dot(forward) - d * 0.02;
      if (dir.dot(forward) > 0.86 && score > bestScore) { best = r; bestScore = score; }
    }
    current.readable = best;
    $('look').textContent = l ? l.label : '';
    const dn = !talkable && !best ? doorNear(player.x, player.z) : null;
    current.door = dn;
    let doorText = '';
    if (dn) {
      const { door, side } = dn;
      if (side === 'out' && level() < door.level) doorText = `Locked  ·  ${door.name} opens at level ${door.level}`;
      else if (side === 'out') doorText = `E  ·  ${door.out.back ? 'Go in the back door' : 'Enter ' + door.name}`;
      else doorText = `E  ·  ${door.in.back ? 'Go out to the garden' : door.gate ? 'Leave the palace' : 'Go outside'}`;
    }
    const prompt = talkable ? `E  ·  Talk to ${talkable.label}` : best ? `E  ·  ${best.verb || 'Read: ' + best.title}` : doorText;
    $('prompt').textContent = prompt;
    $('prompt').classList.toggle('hidden', !prompt);
  }

  // ---------- Each frame ----------
  const clock = new THREE.Clock();
  let pauseOpen = false, worldTime = 0;
  let lookTimer = 0, saveTimer = 0, statusTimer = 0;
  // If the first seconds of walking run slowly, step the graphics down once by itself.
  let speedFrames = 0, speedTime = 0, speedChecked = false;
  function watchSpeed(dt) {
    if (speedChecked || !locked()) return;
    speedFrames++; speedTime += dt;
    if (speedTime > 4) {
      speedChecked = true;
      if (speedFrames / speedTime < 40 && fx.quality === 2) { fx.quality = 1; toast('Graphics: medium (G to change)'); }
    }
  }

  function frame(manual) {
    if (manual !== true) requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (arcade.active) return;             // the city waits while you play a mini-game
    // The world stands still in the map, the pause menu and the "click to resume" screen
    // (people, ships, water, flames). Conversations don't stop it: the city goes on around you.
    if (pauseOpen && !busy()) pauseOpen = false;
    const stopped = !crossing.active && (mapOpen || pauseOpen || (!locked() && free() && $('start').classList.contains('hidden')));
    const wdt = stopped ? 0 : dt;
    worldTime += wdt;
    const wt = worldTime;

    // Time passes only while you're playing: it stops in the map, menus, talks and the pause menu.
    let tiredSpeed = 1;
    if (locked() && free() && !high) {
      const mins = dt * GAME_MINUTES_PER_SECOND;
      state.minute += mins;
      if (state.minute >= 24 * 60) { state.minute -= 24 * 60; state.day++; newDay(); save(); }
      tiredSpeed = tiredness(dt, mins, () => { if (inMeridia) { player.x = -52; player.z = 40; } else { player.x = -40; player.z = 67; } player.yaw = Math.PI; });
    }

    if (locked() && free()) {
      const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const speed = (run ? 9 : 4.2) * tiredSpeed;
      let fx2 = 0, fz = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) fz -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) fz += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) fx2 -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) fx2 += 1;
      const len = Math.hypot(fx2, fz);
      if (len) {
        fx2 /= len; fz /= len;
        const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
        const dx = (fx2 * c + fz * s) * speed * dt, dz = (-fx2 * s + fz * c) * speed * dt;
        // Move along each axis separately so you slide along walls instead of sticking.
        if (walkable(player.x + dx, player.z, 0.35)) player.x += dx;
        if (walkable(player.x, player.z + dz, 0.35)) player.z += dz;
        player.bob += dt * (run ? 13 : 9);
      }
    }
    // Jumping: up with Space, down with gravity, land on whatever is under you.
    if (player.vy !== 0 || player.jump > 0) {
      player.vy -= 14 * dt;
      player.jump += player.vy * dt;
      if (player.jump <= 0) { player.jump = 0; player.vy = 0; }
    }
    const groundY = footHeight(player.x, player.z) + 1.65 + (player.jump ? 0 : Math.sin(player.bob) * 0.035);
    player.y += (groundY - player.y) * Math.min(1, dt * 12);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
    let moving = false;
    if (locked() && free()) moving = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(k => keys.has(k));
    if (view.third && avatar) {
      // The camera sits behind and above your head; it pulls in when a wall is in the way.
      const head = new THREE.Vector3(player.x, player.y + player.jump - 0.1, player.z);
      const back = new THREE.Vector3(Math.sin(player.yaw) * Math.cos(player.pitch), -Math.sin(player.pitch), Math.cos(player.yaw) * Math.cos(player.pitch));
      let d = 0.4;
      while (d < 3.2) {
        const p = head.clone().addScaledVector(back, d + 0.2);
        if (!walkable(p.x, p.z, 0.15) || p.y < footHeight(p.x, p.z) + 0.3) break;
        d += 0.2;
      }
      view.dist = d;
      camera.position.copy(head).addScaledVector(back, d).add(new THREE.Vector3(0, 0.25, 0));
      avatar.position.set(player.x, player.y + player.jump - 1.65, player.z);
      avatar.rotation.y = player.yaw;
      avatar.userData.play(moving ? 'walk' : 'idle');
      avatar.userData.mixer.update(dt * (moving && (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? 1.8 : 1));
    } else {
      view.dist = 0;
      camera.position.set(player.x, player.y + player.jump, player.z);
    }
    if (crossing.active) crossing.update(dt, camera);          // the crossing to Meridia (crossing.js) takes the camera

    // Which place you're in: inside a room only that room is drawn; outside, the city.
    const here = roomAt(player.x, player.y - 1.6, player.z);
    if (here !== currentRoom()) showPlace(here);
    // One warm light that follows you indoors (candles and lamps), stronger at night when no daylight comes in.
    if (here) {
      const s = here.shell, h = state.minute / 60;
      const day = Math.min(1, Math.max(0, (h - 5.5) / 2)) * (1 - Math.min(1, Math.max(0, (h - 18.5) / 2)));
      roomLight.position.set(s.x, s.fy + Math.min((s.top - s.fy) * 0.7, 6), s.z);
      roomLight.distance = Math.max(s.w, s.d) * 1.3;
      roomLight.intensity = 0.22 * s.w * s.d * (1 - 0.6 * day);
    } else roomLight.intensity = 0;

    updateDaylight(state.minute);
    windowLight(state.minute);
    followSun(camera.position);
    updateWater(wt, camera.position);
    groundTime.value = wt;
    {
      const h = state.minute / 60, dayK = Math.min(1, Math.max(0, (h - 5.5) / 2)) * (1 - Math.min(1, Math.max(0, (h - 18.5) / 2)));
      fireUpdate(dt, wdt, wt, camera.position, 1 - dayK);
    }
    updatePassage(wt);
    updateKraken(wt);
    updateShips(wt, wdt);
    updateProperty(wt);
    updatePeople(wt, wdt, player);
    stranger(wdt, player);
    updateLife(wdt, player);
    seizure(wdt, player);
    sneak(wdt, player);
    for (const [i, f] of flames.entries()) { const k = (f.userData.size || 1.6) * (1 + Math.sin(wt * 9 + i * 2) * 0.09 + Math.sin(wt * 23 + i) * 0.05); f.scale.set(k, k * 1.2, 1); }
    for (const [i, l] of (scene.userData.flickers || []).entries()) { l.userData.base ??= l.intensity; l.intensity = l.userData.base * (0.85 + Math.sin(wt * 11 + i) * 0.08 + Math.sin(wt * 27 + i * 3) * 0.07); }

    const nearWater = Math.max(0, 1 - Math.max(0, player.z) / 90);
    const busyArea = Math.max(0, 1 - Math.abs(player.z - 15) / 70) * (Math.abs(player.x) < 180 ? 1 : 0.3);
    const muffle = currentRoom() ? 0.3 : 1;   // the harbor through a closed door
    sound.update(nearWater * muffle, busyArea * muffle);

    updateDust(wdt, camera.position);
    if ((lookTimer -= dt) <= 0) { lookAround(0.12); lookTimer = 0.12; }
    if ((statusTimer -= dt) <= 0) { updateStatus(); sortScene(scene); statusTimer = 0.5; }
    updateCompass(player);
    if ((saveTimer -= dt) <= 0) { save(); saveTimer = 20; }
    fx.render();
    watchSpeed(dt);
  }
  // A new level opens doors, games and places.
  addEventListener('lavine:levelup', (e) => {
    const n = e.detail.level;
    dispatchEvent(new CustomEvent('lavine:property'));
    toast(`Level ${n}!${UNLOCKS[n] ? ' Now open: ' + UNLOCKS[n] + '.' : ''}`, 7000);
  });
  updateStatus();
  $('loading').classList.add('hidden');
  titleMenu({ onPlay: play, fx, sound });
  $('start').classList.remove('hidden');
  frame();

  // For checking from the browser console.
  window.lavine = { player, scene, camera, state, fx, lookables, sneak };
}

main().catch((err) => {
  console.error(err);
  $('loading').textContent = 'Something went wrong: ' + err.message;
});
