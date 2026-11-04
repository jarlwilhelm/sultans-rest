// Who stands where in Meridia (Chapter Two). These go into scene.userData.posts, so people.js builds them
// like Sultan's Rest's guild masters; talking to them goes to meridia/talk.js (npc.kind 'meridia').
// Names, looks and words are Claude's DRAFT unless the plan says the user decided them (docs/chapter-two-plan.md).
import { C, R_OUT, R_MID, R_IN } from './layout.js';
import { SPOTS } from './spots.js';

const at = (s, dx = 0, dz = 0) => ({ x: s.x + dx, z: s.z + dz });
export const MERIDIA_FOLK = {
  innkeeper: { ...at(SPOTS.inn, 0, 5.2), ry: 0, role: 'local', race: 'human', title: 'Tobin, keeper of the Brine & Barrel' },   // behind the bar, inside (human: a halfling vanished behind the counter)
  harbormaster: { x: 4, z: -48, ry: Math.PI / 2, role: 'sailor', race: 'human', title: 'Odile, harbormaster' },
  clerk: { ...at(SPOTS.exchange, 8, 0), ry: -Math.PI / 2, role: 'scribe', race: 'gnome', title: 'Pell, clerk of the Exchange' },
  warehouse: { ...at(SPOTS.warehouses, 0, -8), ry: 0, role: 'dockhand', race: 'dwarf', title: 'Brannoc, warehouse keeper' },
  outerGuard: { x: 7.5, z: C.z - R_OUT - 5, ry: -Math.PI / 2, role: 'guard', race: 'human', title: 'Guard at the Outer Gate' },
  midGuard: { x: 7.5, z: C.z - R_MID - 9, ry: -Math.PI / 2, role: 'guard', race: 'orc', title: 'Sergeant Mara Vell, Middle Gate' },
  innerGuard: { x: 7.5, z: C.z - R_IN - 9, ry: -Math.PI / 2, role: 'guard', race: 'elf', title: 'Captain Aurel of the Inner Gate' },
  arthur: { x: 0, z: SPOTS.hall.z - 13, ry: 0, role: 'merchant', race: 'human', title: 'Arthur, head speaker of the Republic' },
  ben: { ...at(SPOTS.bakery, 0, -6), ry: 0, role: 'merchant', race: 'human', title: 'Ben, the baker' },
  tallyman: { x: 162, z: 72, ry: Math.PI, role: 'merchant', race: 'human', title: 'A man counting crates' },
  forger: { ...at(SPOTS.tavern, -9, 0), ry: Math.PI / 2, role: 'merchant', race: 'elf', title: 'Ellorin Vane, a gentleman of letters' },
  dealer: { x: 34, z: 104, ry: Math.PI, role: 'traveler', race: 'tiefling', title: 'A hooded figure in a doorway' },
  buyer: { x: 58, z: 166, ry: -Math.PI / 2, role: 'traveler', race: 'human', title: 'Someone waiting behind the Gilded Gull' },
  customsClerk: { ...at(SPOTS.customs, 0, -8), ry: 0, role: 'scribe', race: 'human', title: 'A customs clerk' },
  // People you might court (from level 15): all DRAFT.
  suitorLira: { x: -24, z: 178, ry: 0.3, role: 'local', race: 'elf', title: 'Lira, a florist' },
  suitorDov: { x: 22, z: 172, ry: -0.3, role: 'merchant', race: 'dwarf', title: 'Dov, a cooper' },
  suitorSefa: { x: -12, z: 132, ry: 0, role: 'local', race: 'tiefling', title: 'Sefa, a sailmaker' },
  suitorWren: { x: 50, z: 140, ry: -0.5, role: 'local', race: 'halfling', title: 'Wren, a schoolteacher' },
};
export function meridiaPosts(posts) {
  for (const [id, n] of Object.entries(MERIDIA_FOLK)) posts.push({ x: n.x, z: n.z, ry: n.ry, role: n.role, race: n.race, label: n.title, npc: { kind: 'meridia', id } });
}
export { C, R_OUT, R_MID, R_IN };
