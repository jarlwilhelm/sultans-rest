// Redman Rillington's visit (never a fight). The first night after you reach level 7, he
// waits in Ale's house: the lamp is lit, the ledger open on the table. Talk to him;
// afterwards he leaves and doesn't come back. His words are in npcs.js / story.js (DRAFT).
import { makePerson } from '../people.js';
import { footHeight } from '../land.js';
import { state, atLevel } from './state.js';
import { toast } from './ui.js';

const SPOT = { x: -39.2, z: 69.3 };     // by Ale's table, inside the house

export function strangerWatch(scene, lookables) {
  let him = null, leaving = 0, announced = false;
  const entry = { object: null, label: 'A man in a plain cloak', radius: 0.6, person: true, npc: { kind: 'stranger', label: 'A man in a plain cloak' } };
  const night = () => state.minute >= 20 * 60 || state.minute < 5 * 60;

  function spawn() {
    him = makePerson('human', 'traveler');
    him.userData.label = entry.label;
    him.position.set(SPOT.x, footHeight(SPOT.x, SPOT.z), SPOT.z);
    him.rotation.y = Math.PI;                // facing the door
    scene.add(him);
    entry.object = him;
    entry.onGone = () => { leaving = 3; };
    entry.npc.onGone = entry.onGone;
    lookables.push(entry);
  }

  return (dt, player) => {
    if (state.flags.metRedman && !him) return;
    if (!him) {
      if (atLevel(7) && night()) spawn();           // the first night after you reach level 7
      return;
    }
    const near = Math.hypot(player.x - SPOT.x, player.z - SPOT.z) < 7;
    if (near && !announced) { announced = true; toast('The lamp in Ale\'s house is lit. Someone is inside.', 5000); }
    if (leaving > 0) {
      leaving -= dt;
      if (leaving <= 0) {
        him.removeFromParent();
        lookables.splice(lookables.indexOf(entry), 1);
        him = null;
        toast('When you look up, he\'s gone. The door is still shut.', 5000);
        return;
      }
    }
    him.position.y = footHeight(him.position.x, him.position.z);
    him.userData.play?.('idle');
    him.userData.mixer?.update(dt);
  };
}
