// Inside and outside are separate places, like Skyrim: you open a door with E, the screen fades,
// and you're in the room with the city put away (not drawn), so rooms can hold more detail.
// Everything in the city lives in one group; each room's things live in the room's own group.
import * as THREE from 'three';

export const rooms = [];      // { name, parent, box, group, shell }
export const doorways = [];   // { name, level, swing(open), out, in, room } (out/in: where you stand, which way you face)
let scene = null, city = null, current = null, moving = false;

const inBox = (b, x, y, z) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y > b.y0 && y < b.y1;
export function visibleDeep(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
const usable = (r) => !r || (r.shell?.active !== false && visibleDeep(r.parent));

// A room inside a building. Rooms in the city get their own group; rooms inside your shop's buildings
// stay where they are (the shop is small and only one of its buildings is shown at a time).
export function addRoom({ name, parent, box, shell }) {
  const r = { name, parent, box, shell, group: null };
  if (parent.isScene) {
    r.group = new THREE.Group();
    r.group.name = 'room: ' + name;
    r.group.visible = false;
    r.group.userData.keep = true;
    parent.add(r.group);
  }
  rooms.push(r);
  return r;
}

// The room a point is in (null = outside).
export function roomAt(x, y, z) {
  for (const r of rooms) if (usable(r) && inBox(r.box, x, y, z)) return r;
  return null;
}
export const currentRoom = () => current;
export const doorMoving = () => moving;

// Put everything new in the scene into the city or the room it stands in. Cheap: each thing is sorted once.
export function sortScene(s) {
  scene = s;
  if (!city) { city = new THREE.Group(); city.name = 'city'; city.userData.keep = true; scene.add(city); }
  for (const o of [...scene.children]) {
    if (o === city || o.isLight || o.userData.keep || o.userData.sorted) continue;
    o.userData.sorted = true;
    const r = rooms.find(r => r.group && inBox(r.box, o.position.x, o.position.y, o.position.z));
    (r ? r.group : city).attach(o);
  }
}

// Show only the place you're in.
export function showPlace(r) {
  current = r;
  if (city) city.visible = !r;
  for (const x of rooms) if (x.group) x.group.visible = x === r;
}

// The door you're standing at (on either side), if any.
export function doorNear(px, pz) {
  let best = null, bd = 1.7;
  for (const d of doorways) {
    if (!usable(d.room)) continue;
    for (const side of ['out', 'in']) {
      const p = d[side], dist = Math.hypot(px - p.x, pz - p.z);
      if (dist < bd) { bd = dist; best = { door: d, side }; }
    }
  }
  return best;
}

// Walk through a door: it swings open, the screen fades, you're on the other side, it shuts behind you.
export function useDoor({ door, side }, player, done) {
  if (moving) return;
  moving = true;
  const to = side === 'out' ? door.in : door.out;
  const fade = document.getElementById('fade');
  const was = fade.style.transition;
  fade.textContent = '';
  fade.style.transition = 'opacity 0.3s';
  const t0 = performance.now();
  const swing = () => {
    const k = Math.min(1, (performance.now() - t0) / 280);
    door.swing(k);
    if (k < 1) requestAnimationFrame(swing);
  };
  swing();
  setTimeout(() => fade.classList.add('on'), 150);
  setTimeout(() => {
    player.x = to.x; player.z = to.z; player.yaw = to.yaw; player.pitch = 0;
    door.swing(0);
    done?.();
    fade.classList.remove('on');
    setTimeout(() => { fade.style.transition = was; moving = false; }, 300);
  }, 500);
}
