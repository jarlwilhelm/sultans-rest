// A hint of Levinite in Chapter One (never named here): once you're level 3, on a working day (9 am to 5 pm),
// harbor guards are stacking a Meridian ship's crates on the quay at the foot of the Grand Pier and a
// captain is arguing with them. Walk up and you see why. It happens once; the journal remembers it.
// The words are a DRAFT by Claude.
import { makePerson } from '../people.js';
import { footHeight } from '../land.js';
import { prop } from '../interiors.js';
import { state, level, note, save } from './state.js';
import { talk, busy } from './ui.js';
import * as THREE from 'three';

const AT = { x: -9, z: 1.5 };
const SCENE = [
  'Harbor guards are carrying crates off a Meridian ship and stacking them on the quay. A captain in a salt-stained coat is shouting at them.',
  '"It\'s rum! Rum! Open any one of them, you\'ll see!"',
  '"We did," says the guard sergeant. She lifts the lid of the top crate. Under the straw, between the bottles, sits a neat row of tiny vials. Violet glass. They catch the light like something alive.',
  '"Seized, by order of the Steward. All of it. Your ship stays in harbor until Xi says otherwise."',
  'The captain goes very quiet. As they lead him away he looks back, not at the guards, not at you, but at the crates: the way a man looks at money he has lost. Or at a debt he can\'t pay.',
];

export function seizureWatch(scene) {
  let group = null, told = false;
  const due = () => level() >= 3 && !state.flags.sawSeizure && state.minute >= 9 * 60 && state.minute < 17 * 60;
  function spawn() {
    group = new THREE.Group();
    group.userData.keep = true;
    const put = (race, role, x, z, ry) => {
      const p = makePerson(race, role);
      p.position.set(x, footHeight(x, z), z); p.rotation.y = ry; p.userData.keep = true;
      p.userData.play?.('talk');
      group.add(p);
      return p;
    };
    put('human', 'guard', AT.x, AT.z, -Math.PI / 2);
    put('orc', 'guard', AT.x - 1.6, AT.z + 1.2, -Math.PI / 3);
    put('human', 'sailor', AT.x + 1.4, AT.z, Math.PI / 2);
    for (const [dx, dz, h] of [[-1.2, -1.2, 0.7], [-0.4, -1.4, 0.7], [-0.8, -1.3, 1.4]]) prop(group, 'Crate', AT.x + dx, footHeight(AT.x + dx, AT.z + dz) + (h > 1 ? 0.7 : 0), AT.z + dz, { h: 0.7 });
    scene.add(group);
  }
  function remove() { group?.removeFromParent(); group = null; }
  return (dt, player) => {
    if (!group) {
      if (due()) spawn();
      return;
    }
    for (const p of group.children) p.userData.mixer?.update(dt);
    const d = Math.hypot(player.x - AT.x, player.z - AT.z);
    if (!told && d < 9 && !busy()) {
      told = true;
      state.flags.sawSeizure = true;
      note('Saw guards seize a Meridian ship\'s cargo: little violet vials hidden in crates of rum');
      save();
      talk({ name: 'On the quay', text: SCENE, options: [{ label: 'Leave' }] });
    }
    // Gone once you've seen it and walked off (or if the day's work is over before you came).
    if ((told && d > 40) || (!told && !due())) remove();
  };
}
