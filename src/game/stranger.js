// Redman Rillington's visit (never a fight). The first night after you reach level 7, he waits in the
// condemned house on the east edge of the city (the user's map pin 26, 2026-11-04; it used to be Ale's house):
// one candle, the ledger on his knee. Talk to him; afterwards he leaves and doesn't come back.
// His words are in npcs.js / story.js (DRAFT). The house itself: ../shops.js condemned().
import { makePerson } from '../people.js';
import { footHeight } from '../land.js';
import { state, atLevel } from './state.js';
import { toast } from './ui.js';
import { currentStep } from './quests.js';


export function strangerWatch(scene, lookables) {
  const SPOT = scene.userData.redmanSpot || { x: -39.2, z: 69.3 };    // by a crate in the condemned house
  let him = null, leaving = 0, announced = false;
  const entry = { object: null, label: 'A man in a plain cloak', radius: 0.6, person: true, npc: { kind: 'stranger', label: 'A man in a plain cloak' } };
  const night = () => state.minute >= 20 * 60 || state.minute < 5 * 60;

  function spawn() {
    him = makePerson('human', 'traveler');
    him.userData.label = entry.label;
    him.position.set(SPOT.x, footHeight(SPOT.x, SPOT.z), SPOT.z);
    him.rotation.y = 0;                      // facing the door (-z)
    scene.add(him);
    entry.object = him;
    entry.onGone = () => { leaving = 3; };
    entry.npc.onGone = entry.onGone;
    lookables.push(entry);
  }

  return (dt, player) => {
    if (state.flags.metRedman && !him) return;
    if (!him) {
      // The first night after you reach level 7 and own the Bigger Store (his step in the story).
      const c = currentStep();
      if (atLevel(7) && night() && c?.quest.id === 'noface2' && c.step.flag === 'metRedman') spawn();
      return;
    }
    const near = Math.hypot(player.x - SPOT.x, player.z - SPOT.z) < 7;
    if (near && !announced) { announced = true; toast('A candle is burning behind the boards of the condemned house. Someone is inside.', 5000); }
    if (leaving > 0) {
      leaving -= dt;
      if (leaving <= 0) {
        him.removeFromParent();
        lookables.splice(lookables.indexOf(entry), 1);
        him = null;
        toast('When you look up, he\'s gone. The candle is out, and the door is still shut.', 5000);
        return;
      }
    }
    him.position.y = footHeight(him.position.x, him.position.z);
    him.userData.play?.('idle');
    him.userData.mixer?.update(dt);
  };
}
