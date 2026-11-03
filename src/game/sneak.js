// Chapter One's quiet work (docs/chapter-one-v2.md): following the courier off the red-sailed ship without being
// seen, overhearing two dockhands from cover, and the figure who watches Ale's house at night before Redman comes.
// Each frame, update() looks at the current story step and runs whichever of these it needs.
import { state, save } from './state.js';
import { currentStep, questEvent, questState, inHours } from './quests.js';
import { makePerson } from '../people.js';
import { footHeight } from '../land.js';
import { toast } from './ui.js';

let scene = null, hud = null;
const show = (text) => { hud.textContent = text; hud.classList.toggle('hidden', !text); };

// Is the player in front of someone (facing ry) and close enough for them to notice?
function seenBy(g, player, range, cone = 0.55) {
  const dx = player.x - g.position.x, dz = player.z - g.position.z, d = Math.hypot(dx, dz);
  if (d > range) return false;
  const fx = -Math.sin(g.rotation.y), fz = -Math.cos(g.rotation.y);     // people face -z at ry = 0 (characters.js turns the models)
  return (dx * fx + dz * fz) / (d || 1) > cone;
}
function spawn(race, role, x, z, ry) {
  const g = makePerson(race, role);
  g.position.set(x, footHeight(x, z), z);
  g.rotation.y = ry;
  g.userData.keep = true;                 // drawn in the city whatever room sorting says
  scene.add(g);
  return g;
}
function remove(g) { if (g) g.removeFromParent(); }

// ---------- Following the courier ----------
// Off the ship at the end of the Grand Pier, up the pier, west along the quay to the Transmuters' Guild.
const ROUTE = [[0, -48], [0, -20], [0, 2], [-30, 4], [-70, 4.5], [-110, 5], [-138, 6], [-148, 11], [-148, 14.5]];
const follow = { g: null, leg: 0, look: 0, lookT: 0, far: 0, done: false };
function updateFollow(dt, player) {
  const f = follow;
  if (!f.g) {
    if (!inHours(currentStep().step) || state.flags.courierShookYou === state.day) return show('');
    if (Math.hypot(player.x - ROUTE[0][0], player.z - ROUTE[0][1]) > 18) return show('');
    f.g = spawn('human', 'sailor', ROUTE[0][0], ROUTE[0][1], 0);
    f.g.userData.play?.('walk');
    f.leg = 1; f.look = 6 + Math.random() * 4; f.lookT = 0; f.far = 0;
    toast('A man in a dark coat steps off the red-sailed ship and walks up the pier. Follow him. Don\'t let him see you.', 6000);
  }
  const g = f.g;
  g.userData.mixer?.update(dt);
  // He stops now and then and looks back over his shoulder.
  if (f.lookT > 0) {
    f.lookT -= dt;
    if (f.lookT <= 0) { g.userData.play?.('walk'); }
  } else if ((f.look -= dt) <= 0) {
    f.lookT = 2.2; f.look = 7 + Math.random() * 5;
    g.rotation.y += Math.PI;                      // turns round...
    g.userData.play?.('idle');
  }
  const looking = f.lookT > 0;
  if (!looking) {
    const [tx, tz] = ROUTE[f.leg];
    const dx = tx - g.position.x, dz = tz - g.position.z, d = Math.hypot(dx, dz);
    g.rotation.y = Math.atan2(-dx, -dz);
    const step = Math.min(d, 1.5 * dt);
    g.position.x += dx / (d || 1) * step; g.position.z += dz / (d || 1) * step;
    g.position.y = footHeight(g.position.x, g.position.z);
    if (d < 0.3 && ++f.leg >= ROUTE.length) {
      remove(g); f.g = null; show('');
      toast('He knocks twice at the Transmuters\' Guild and is let in. Now you know where it goes.', 6000);
      questEvent('sneak');
      return;
    }
  }
  const dist = Math.hypot(player.x - g.position.x, player.z - g.position.z);
  const spotted = dist < 2.5 || (looking && seenBy(g, player, 14, 0.5));
  if (spotted) return lose('He sees you. He changes direction, and in two streets he\'s gone. He\'ll come again tomorrow at the third bell.');
  f.far = dist > 35 ? f.far + dt : 0;
  if (f.far > 6) return lose('You\'ve lost him in the crowd. He\'ll come again tomorrow at the third bell.');
  show(looking ? 'He\'s looking back! Stay out of sight (far off, or behind him)' : f.look < 1.3 ? 'He slows down... (he\'s about to look back: drop back or step aside)' : dist > 25 ? 'Following: he\'s getting away, keep up' : 'Following: keep your distance (he looks back now and then)');
}
function lose(text) {
  remove(follow.g); follow.g = null; show('');
  state.flags.courierShookYou = state.day; save();
  toast(text, 6000);
}

// ---------- Overhearing the dockhands ----------
const LINES = [
  '"...the cabbage man paid in new palace coin. Every month."',
  '"Who pays a pilot in palace coin? Nobody honest."',
  '"Shut up about it. You know what happened to him."',
  '"Fever, they said." "Fever. Right."',
];
const over = { a: null, b: null, heard: 0, cool: 0 };
function updateOverhear(dt, player, st) {
  const o = over;
  if (!o.a) {
    o.a = spawn('human', 'dockhand', st.x - 1, st.z, -Math.PI / 2);        // facing each other, across x
    o.b = spawn('orc', 'dockhand', st.x + 1, st.z, Math.PI / 2);
    o.heard = 0;
  }
  for (const g of [o.a, o.b]) g.userData.mixer?.update(dt);
  const d = Math.hypot(player.x - st.x, player.z - st.z);
  if (o.cool > 0) { o.cool -= dt; return show(d < 12 ? 'They\'ve gone quiet. Back off and try again from somewhere they can\'t see you' : ''); }
  if (d > 12) return show('');
  if (seenBy(o.a, player, 9) || seenBy(o.b, player, 9)) {
    o.cool = 15; o.heard = 0;
    toast('One of them looks straight at you. "Nice weather," he says, too loudly.', 4000);
    return;
  }
  if (d < 6.5) {
    o.heard += dt;
    const line = LINES[Math.min(LINES.length - 1, Math.floor(o.heard / 2.2))];
    show(`Listening... ${line}`);
    if (o.heard > LINES.length * 2.2) {
      remove(o.a); remove(o.b); o.a = o.b = null; show('');
      toast('They split up and wander off. Palace coin, a pilot, and a "fever" nobody believes.', 6000);
      questEvent('sneak');
    }
  } else show('Two dockhands whispering. Get closer from the side, where they can\'t see you');
}

// ---------- The watcher ----------
// The nights between finding the stone and Redman's visit: a figure at the end of Ale's street.
const watch = { g: null, night: -1 };
function updateWatcher(dt, player) {
  const night = state.minute > 20 * 60 || state.minute < 5 * 60;
  const due = questState('third').done && !state.flags.metRedman;
  if (!due || !night) { remove(watch.g); watch.g = null; return; }
  if (!watch.g && watch.night !== state.day) {
    watch.g = spawn('human', 'traveler', -26, 66, -Math.PI / 2);
    watch.night = state.day;
  }
  if (watch.g) {
    const d = Math.hypot(player.x - watch.g.position.x, player.z - watch.g.position.z);
    watch.g.rotation.y = Math.atan2(-(player.x - watch.g.position.x), -(player.z - watch.g.position.z));
    if (d < 14) { remove(watch.g); watch.g = null; toast('By the time you get there, there\'s nobody. Only the sound of someone walking away fast, two streets over.', 5000); }
  }
}

export function sneakWatch(s) {
  scene = s;
  hud = document.createElement('div');
  hud.id = 'sneak'; hud.className = 'hidden';
  document.getElementById('hud').append(hud);
  return (dt, player) => {
    const c = currentStep();
    const st = c?.step;
    if (st?.follow) updateFollow(dt, player);
    else if (follow.g) { remove(follow.g); follow.g = null; }
    if (st?.overhear) updateOverhear(dt, player, st);
    else if (over.a) { remove(over.a); remove(over.b); over.a = over.b = null; }
    if (!st?.follow && !st?.overhear) show('');
    updateWatcher(dt, player);
    // Ale's house turned over, from the break-in until the new lock is fitted.
    if (scene.userData.mess) scene.userData.mess.visible = !!state.flags.breakin && !state.flags.lockFitted;
  };
}

// For checking from the browser console.
export const sneakDebug = { follow, over, watch };
