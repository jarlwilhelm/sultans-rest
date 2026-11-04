// The crossing to Meridia: the end of Chapter One, as a scene (not a game). Your ship casts off from the
// end of the Grand Pier at dusk and sails down the pilots' violet-lit passage while a few lines appear;
// then a title card for Chapter Two, and you arrive in Meridia (the page is rebuilt there: place.js).
// main.js runs it each frame while crossing.active (the camera follows the ship; Esc skips).
// The words are a DRAFT by Claude.
import * as THREE from 'three';
import { makeShip } from './ships.js';
import { state, save } from './game/state.js';

const LINES = [
  [1.5, 'At dusk you cast off. The Grand Pier slides away behind you, and with it the cabbage stand, the guild halls, and the lamp in the palace that never goes out.'],
  [9, 'The pilots\' violet lights mark the only safe water. Between them the sea is glass. Outside them, something very large turns over in the deep, and is gone.'],
  [17, '"Out past the lights, then we hug the coast all the way round," says the pilot at the bow, and doesn\'t look back. "Two months, if the kraken are kind."'],
  [25, 'A month along the coast you open your hand and look at the coin with no face. Somewhere ahead is Meridia: green hills, walls of stone, and a man who said no to a crown.'],
];
const LENGTH = 33;       // seconds of sailing before the title card

export const crossing = { active: false };

export function startCrossing(scene, onDone, { preview = false } = {}) {
  if (crossing.active) return;
  const ship = makeShip({ land: `your own fleet ("${state.shopName}")`, hull: '#5a3a24', sail: '#f3ede0', flag: '#4b1f6b' }, 26);
  scene.add(ship);                        // (bow toward -z, out to sea)
  const own = scene.userData.ownShip;
  if (own) own.visible = false;
  const savedMinute = state.minute;
  state.minute = 19 * 60 + 25;            // the sun on the water, all the way out
  const box = document.createElement('div');
  box.id = 'crossing';
  box.innerHTML = '<p class="cline"></p><div class="cskip">Esc to skip</div>';
  document.body.append(box);
  document.getElementById('hud').classList.add('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
  const text = box.querySelector('.cline');
  let t = 0, shown = -1, ending = false;
  const at = new THREE.Vector3(), look = new THREE.Vector3();
  function finish() {
    if (ending) return;
    ending = true;
    const fade = document.getElementById('fade');
    fade.innerHTML = '<div style="text-align:center"><div style="font-size:42px;color:#e7c35a">CHAPTER TWO</div><div style="font-size:30px;margin-top:6px">MERIDIA</div></div>';
    fade.classList.add('on');
    // Just watching (place.js PREVIEW): back to the title screen, nothing saved.
    if (preview) { setTimeout(() => { location.href = location.pathname; }, 3600); return; }
    // Chapter Two: the crossing lands you in Meridia (the page is rebuilt there), after the title card.
    setTimeout(() => {
      state.flags.crossed = true;
      // About two months along the coast (place.js voyage); Xi's charter pays the crew this first time.
      import('./place.js').then(async p => { await p.voyage('meridia', { pay: 0 }); state.minute = 10 * 60; p.travelTo('meridia'); });
    }, 3600);
  }
  crossing.skip = finish;
  crossing.update = (dt, camera) => {
    t += dt;
    // The ship: out from the end of the pier, gathering speed, down the middle of the passage.
    const z = -75 - (t * t * 0.6 + t * 4);
    ship.position.set(Math.sin(t * 0.15) * 2, Math.sin(t * 1.1) * 0.25, z);
    ship.rotation.set(0, 0, Math.sin(t * 0.8) * 0.03);
    // The camera: high and straight behind her while she clears the moored ships, then down and round to
    // her side once she's out in the passage.
    const out = Math.min(1, Math.max(0, (t - 10) / 14)), s = out * out * (3 - 2 * out);
    const a = s * 1.25;
    at.set(ship.position.x + Math.sin(a) * 34, 26 - s * 17, z + Math.cos(a) * 34);
    camera.position.copy(at);
    look.set(ship.position.x, 4, z - 6);
    camera.lookAt(look);
    const i = LINES.findLastIndex(([s]) => t >= s);
    if (i !== shown) {
      shown = i;
      text.classList.remove('on');
      setTimeout(() => { text.textContent = LINES[i][1]; text.classList.add('on'); }, 450);
    }
    if (t > LENGTH) finish();
  };
  crossing.active = true;
}
