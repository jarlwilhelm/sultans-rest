// Your life in Meridia (Chapter Two): your ship at the end of the Grand Pier, your pop-up stand on the quay,
// your house and store as you buy them (a cottage, then bigger; a small shop, then bigger), and the store's
// shelves, which sell to customers while you're away. Arrival: a word from the harbor the first time.
import * as THREE from 'three';
import { state, save, note, level } from '../game/state.js';
import { GOODS, sellPrice } from '../game/economy.js';
import { groundHeight, colliders } from '../land.js';
import { readables, signBoard, placeReadable } from '../signs.js';
import { makeShip } from '../ships.js';
import { SPOTS, homeSpot, storeSpot } from './spots.js';
import { prop, lamp } from '../interiors.js';
import { popupTrade, HOMES, STORES } from './talk.js';
import { talk, toast, updateStatus, closePanel } from '../game/ui.js';
import { gateWatch } from './watch.js';
import { makeCharacter } from '../characters.js';
import { makePerson, RACES } from '../people.js';

const mer = () => (state.mer ||= { innUntil: 0, home: 0, store: 0, bay: false, bayGoods: {}, shelves: {}, till: 0, lastSale: null });
const leave = { label: 'Leave' };

// The store's shelves: customers buy while you're away, a few an hour in opening hours (7 am to 7 pm), more in
// a bigger store; what they pay comes from the same prices as selling by hand. Worked out when you visit.
const PER_HOUR = [0, 3, 6, 10];
export function settleShelves() {
  const m = mer();
  if (!m.store) return 0;
  const now = state.day * 1440 + state.minute;
  const last = m.lastSale ?? now;
  m.lastSale = now;
  let hours = 0;
  for (let t = last; t < now; t += 60) { const h = Math.floor((t % 1440) / 60); if (h >= 7 && h < 19) hours++; }
  let sold = 0, got = 0;
  const market = { id: 'store-m', type: 'own', tier: 1 + m.store };
  for (let i = 0; i < hours * PER_HOUR[m.store] * (state.spouse?.id === 'rose' ? 1.5 : state.spouse?.perk === 'mind' ? 1.25 : 1); i++) {
    const goods = Object.keys(m.shelves).filter(g => m.shelves[g] > 0);
    if (!goods.length) break;
    const g = goods[Math.floor(Math.random() * goods.length)];
    m.shelves[g]--; if (!m.shelves[g]) delete m.shelves[g];
    // Rose sells at the best price (marriage.js); otherwise the going price, which drops as you flood it.
    got += state.spouse?.id === 'rose' ? Math.round(GOODS[g].base * 1.9) : sellPrice(market, g) || 0;
    state.flow ??= {}; const k = `store-m|${g}`; (state.flow[k] ||= { sold: 0, bought: 0, day: state.day }).sold++;
    sold++;
  }
  m.till += got;
  if (sold) note(`Your store sold ${sold} goods for ${got} gold while you were away`);
  return got;
}
function storeNode() {
  settleShelves();
  const m = mer();
  const shelf = Object.entries(m.shelves).filter(([, n]) => n > 0);
  const opts = [];
  if (m.till > 0) opts.push({ label: `Empty the till (${m.till} gold)`, do: () => { state.gold += m.till; state.earned += m.till; note(`Took ${m.till} gold from your store's till`); m.till = 0; save(); updateStatus(); return storeNode(); } });
  for (const [g, n] of Object.entries(state.pack).slice(0, 5)) opts.push({ label: `Stock the shelves: all your ${GOODS[g].name} (${n})`, do: () => { m.shelves[g] = (m.shelves[g] || 0) + n; delete state.pack[g]; save(); updateStatus(); return storeNode(); } });
  for (const [g, n] of shelf.slice(0, 3)) opts.push({ label: `Take back ${GOODS[g].name} (${n})`, do: () => { state.pack[g] = (state.pack[g] || 0) + n; delete m.shelves[g]; save(); updateStatus(); return storeNode(); } });
  opts.push({ label: 'Sell to the customers in the shop yourself', do: () => { closePanel(true); import('../game/ui.js').then(u => u.trade({ id: 'store-m', type: 'own', tier: 1 + m.store }, { title: `${STORES[m.store].name}: your customers buy`, where: 'your Meridia store' })); return 'keep'; } });
  return { name: `Your ${STORES[m.store].name.toLowerCase()}`, text: [
    shelf.length ? `On the shelves: ${shelf.map(([g, n]) => `${n} ${GOODS[g].name}`).join(', ')}.` : 'The shelves are empty. Stock them and your customers buy while you\'re away (about ' + PER_HOUR[m.store] + ' an hour, 7 am to 7 pm).',
    m.till ? `${m.till} gold in the till.` : 'The till is empty.',
  ], options: [...opts, leave] };
}

export function buildMeridiaLife(scene, lookables) {
  // Your ship, waiting at the end of the Grand Pier.
  const ship = makeShip({ land: `your own fleet ("${state.shopName}")`, hull: '#5a3a24', sail: '#f3ede0', flag: '#4b1f6b' }, 26);
  ship.position.set(0, 0, -75); ship.rotation.y = Math.PI; scene.add(ship);
  // Inside the Brine & Barrel: the Salted Kraken's tavern room fits it exactly (same size), plus tables, stools,
  // lamps and a fire. (buildings.js furnishes the Kraken the same way.)
  const inn = scene.userData.shells?.inn;
  if (inn && prop(scene, 'tavern_room', inn.x, inn.fy, inn.z)) {
    const block = (x0, x1, z0, z1) => colliders.push({ x0: inn.x + x0, x1: inn.x + x1, z0: inn.z + z0, z1: inn.z + z1 });
    block(-3.3, 3.3, 3.5, 4.4); block(-3.8, 3.8, 5.65, 6.2); block(-5.2, -4.05, 4.2, 6.2); block(-5.2, -3.85, -1.6, 1.6); block(4.0, 5.2, -3.0, 4.9); block(-5.2, -4.35, -6.2, -5.15);
    lamp(scene, inn.x - 4.6, inn.fy + 0.6, inn.z, '#ff8a2a', 3.2);
    lamp(scene, inn.x, inn.fy + 3.85, inn.z - 1.0, '#ffc46b', 2.6);
    const fire = new THREE.PointLight('#ff9a4a', 14, 11, 2); fire.position.set(inn.x - 4.3, inn.fy + 0.9, inn.z); scene.add(fire);
    const hall = new THREE.PointLight('#ffcf8a', 10, 13, 2); hall.position.set(inn.x, inn.fy + 3.6, inn.z - 1.0); scene.add(hall);
    (scene.userData.flickers ??= []).push(fire);
    for (const [tx, tz] of [[inn.x - 2.6, inn.z - 4.3], [inn.x + 2.6, inn.z - 4.3], [inn.x - 2.4, inn.z + 0.6]]) {
      prop(scene, 'Table_RoundSmall', tx, inn.fy, tz, { h: 0.8 });
      prop(scene, 'tavern_tabletop', tx, inn.fy + 0.8, tz, { ry: tx * 1.7 });
      colliders.push({ x0: tx - 0.5, x1: tx + 0.5, z0: tz - 0.5, z1: tz + 0.5 });
      for (const sx of [0.9, -0.9]) prop(scene, 'Stool', tx + sx, inn.fy, tz, { h: 0.5 });
    }
  }
  // The pop-up stand (its stall model is placed with the market's, see meridia/city.js).
  readables.push({ pos: new THREE.Vector3(SPOTS.popup.x, groundHeight(SPOTS.popup.x, SPOTS.popup.z) + 1.2, SPOTS.popup.z - 1.6), title: 'Your pop-up stand', verb: 'Sell from your pop-up stand', action: popupTrade });
  // Your house and store: drawn by what you own; a door to sleep at / a counter to use.
  const plots = new THREE.Group(); scene.add(plots);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#e6e0d0', roughness: 0.9 }), roofMat = new THREE.MeshStandardMaterial({ color: '#8a3e26', roughness: 0.85 }), dark = new THREE.MeshStandardMaterial({ color: '#3a2a1e' });
  const sizes = { home: [null, [6, 6, 1], [8, 7, 2], [11, 9, 3]], store: [null, [7, 7, 1], [10, 8, 2], [14, 10, 3]] };
  const solids = [];
  function building(kind, tier) {
    const s = kind === 'home' ? homeSpot(tier) : storeSpot(tier), [w, d, floors] = sizes[kind][tier];
    const y = groundHeight(s.x, s.z) - 0.2, h = floors * 3.1;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); body.position.set(s.x, y + h / 2, s.z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.4, 3, 4), roofMat); roof.position.set(s.x, y + h + 1.5, s.z); roof.rotation.y = Math.PI / 4;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), dark); door.position.set(s.x, y + 1.1, s.z - d / 2 - 0.05);
    for (const m of [body, roof]) { m.castShadow = true; m.receiveShadow = true; }
    plots.add(body, roof, door);
    const c = { x0: s.x - w / 2, x1: s.x + w / 2, z0: s.z - d / 2, z1: s.z + d / 2 };
    colliders.push(c); solids.push(c);
    placeReadable(plots, signBoard(kind === 'home' ? (state.name || 'Your').toUpperCase() + "'S HOUSE" : state.shopName.toUpperCase(), kind === 'home' ? HOMES[tier].name : STORES[tier].name, { bg: '#2a1a0e' }), { x: s.x, y: y + 2.9, z: s.z - d / 2 - 0.08, w: Math.min(w - 1, 4.5), h: 1.1, title: kind === 'home' ? 'Your house' : 'Your store', readable: false });
    return { x: s.x, y: y + 1.2, z: s.z - d / 2 - 1.2 };
  }
  const doors = [];
  function draw() {
    for (const c of solids.splice(0)) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
    plots.clear();
    for (const r of doors.splice(0)) { const i = readables.indexOf(r); if (i >= 0) readables.splice(i, 1); }
    const m = mer();
    if (m.home) {
      const p = building('home', m.home);
      const r = { pos: new THREE.Vector3(p.x, p.y, p.z), title: 'Your house', verb: 'Sleep in your own bed', action: () => import('../game/rest.js').then(rr => import('../game/npcs.js').then(n => rr.sleepUntilMorning('home', n.newDay))) };
      readables.push(r); doors.push(r);
    }
    if (m.store) {
      const p = building('store', m.store);
      const r = { pos: new THREE.Vector3(p.x, p.y, p.z), title: 'Your store', verb: 'Your store: shelves, till, customers', action: () => talk(storeNode()) };
      readables.push(r); doors.push(r);
    }
  }
  draw();
  addEventListener('lavine:mer-property', draw);

  // Your spouse (marriage.js), at your house's door, or by the inn if you have no house yet.
  let spouseFig = null;
  function placeSpouse() {
    if (spouseFig) { spouseFig.removeFromParent(); const i = lookables.findIndex(l => l.object === spouseFig); if (i >= 0) lookables.splice(i, 1); spouseFig = null; }
    const sp = state.spouse;
    if (!sp) return;
    const R = RACES[sp.race] || RACES.human;
    // Casey and Rose are better-looking than anyone has a right to be (the user's call): the finest clothes.
    const look = sp.id === 'casey' ? { base: 'Male_Ranger', hue: 0.6, hair: '#1a1410', style: 'Hair_SimpleParted', skin: '#c68642', hat: 'feathercap' }
      : sp.id === 'rose' ? { base: 'Female_Robe', hue: 0.97, hair: '#1a1410', style: 'Hair_Long', skin: '#e0ac69', trim: 'gold' } : null;
    spouseFig = look ? makeCharacter({ race: sp.race, role: 'local', height: R.h, girth: R.girth, skin: look.skin, look }, Math.random) : makePerson(sp.race, 'local');
    const hs = homeSpot(mer().home);
    const at = mer().home ? { x: hs.x + 2.5, z: hs.z - 7 } : { x: SPOTS.inn.x + 4, z: SPOTS.inn.z - 7 };
    spouseFig.position.set(at.x, groundHeight(at.x, at.z), at.z);
    spouseFig.userData.keep = true;
    scene.add(spouseFig);
    lookables.push({ object: spouseFig, label: sp.name, radius: 0.6, person: true, npc: { kind: 'meridia', id: 'spouse', label: sp.name } });
  }
  placeSpouse();
  addEventListener('lavine:spouse', placeSpouse);
  addEventListener('lavine:mer-property', placeSpouse);

  // The Customs House door: at night, the sneaking job for the Forged Pass (minigames/customs.js). Caught: a fine.
  const night = () => state.minute >= 21 * 60 || state.minute < 4 * 60;
  readables.push({ pos: new THREE.Vector3(SPOTS.customs.x, groundHeight(SPOTS.customs.x, SPOTS.customs.z - 6) + 1.2, SPOTS.customs.z - 6.2), title: 'The Customs House',
    get verb() { return night() ? 'Slip into the Customs House' : 'The Customs House (closed to the public)'; },
    action: async () => {
      if (!night()) return toast('The Customs House is busy with clerks all day. The night shift is quieter: 9 pm to 4 am.', 4500);
      if (!state.flags.forgerAsked && !state.quests?.m_pass) return toast('Nothing in there you need. Yet.', 3000);
      const { playJob } = await import('../game/npcs.js');
      const res = await playJob('The Customs House');
      if (res?.caught) {
        const fine = Math.min(state.gold, 60);
        state.gold -= fine; state.suspicion = Math.min(100, (state.suspicion || 0) + 15);
        note(`Caught in the Customs House at night: fined ${fine} gold`); save(); updateStatus();
        talk({ name: 'The quay', text: [`The night guards march you out onto the quay. The clerk writes you a fine for ${fine} gold and "wandering while drunk". Try another night.`], options: [leave] });
      }
    } });
  // The end of the Grand Pier: throw a vial into the sea (the Violet Glass quest).
  readables.push({ pos: new THREE.Vector3(0, 2.2, -58), title: 'The sea', when: () => state.pack.levinite > 0 && !state.flags.levFirst && !state.flags.levRefused,
    verb: 'Throw the vial of Levinite into the sea', action: () => {
      state.pack.levinite--; if (!state.pack.levinite) delete state.pack.levinite;
      state.flags.levRefused = true; note('Threw a vial of Levinite into the harbor'); save(); updateStatus();
      toast('The vial turns over once in the air and is gone. A gull looks at you as if you\'ve wasted something.', 5000);
    } });
  // Redman, at your door after dark when the story brings him (meridia/story.js, The Faceless Coin).
  let redman = null;
  function redmanCheck() {
    const due = state.quests?.m_two?.done && !state.quests?.m_coin?.done && level() >= 18 && (state.minute >= 20 * 60);
    if (due && !redman) {
      redman = makePerson('human', 'traveler');
      const hs = homeSpot(mer().home);
      const at = mer().home ? { x: hs.x - 2, z: hs.z - 7 } : { x: SPOTS.inn.x - 3, z: SPOTS.inn.z - 7 };
      redman.position.set(at.x, groundHeight(at.x, at.z), at.z); redman.userData.keep = true; scene.add(redman);
      lookables.push({ object: redman, label: 'A man in a plain cloak', radius: 0.6, person: true, npc: { kind: 'meridia', id: 'redman', label: 'A man in a plain cloak' } });
    } else if (!due && redman) {
      redman.removeFromParent(); const i = lookables.findIndex(l => l.object === redman); if (i >= 0) lookables.splice(i, 1); redman = null;
    }
  }

  // The first arrival.
  if (!state.flags.meridiaArrived) {
    state.flags.meridiaArrived = true;
    save();
    addEventListener('lavine:play', () => setTimeout(() => talk({ name: 'Meridia', text: [
      'Green hills, and a city of grey stone climbing one of them in rings, wall above wall, to a copper dome at the top. The harbor and its warehouses sit outside the walls, loud with cranes and gulls.',
      'You\'ll want a bed: the Brine & Barrel, the inn on the quay, lets rooms at thirty gold a week, paid before you sleep. You have a ship, a pop-up stand on the quay, and a city that doesn\'t know your name yet.',
      '(Q for your quests. Meridia wants what the East makes; Sultan\'s Rest wants what the West makes. The harbormaster at the end of the pier sails you home whenever you like.)',
    ], options: [{ label: 'Step onto the quay' }] }), 1200), { once: true });
  }
  // Each frame: nothing to animate yet beyond the ship's gentle rocking.
  let t = 0;
  let slow = 0;
  const beacon = scene.userData.lighthouse;
  return (dt, player) => { t += dt; ship.position.y = Math.sin(t * 0.8) * 0.15; ship.rotation.set(0, Math.PI, Math.sin(t * 0.6) * 0.02); if (player) gateWatch(player); spouseFig?.userData.mixer?.update(dt); redman?.userData.mixer?.update(dt); if ((slow -= dt) <= 0) { slow = 1; redmanCheck(); if (beacon) beacon.intensity = (state.minute >= 19.5 * 60 || state.minute < 6 * 60) ? 60 : 0; } };
}
export { level, toast };
