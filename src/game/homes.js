// The ten homes on the user's map (pins 18-25, 29, 30: "just lived in", docs/sultans-rest-pins.md): a family behind
// each door you can knock on (an answer that depends on the time of day), a few people out front, and small signs of
// life (laundry, a bench, pots, a cart). Where: ../sidework.js. Every name and line is a DRAFT by Claude.
import { state } from './state.js';

const pick = (list, seed) => list[Math.abs(seed) % list.length];
const leave = { label: 'Leave' };

export const HOMES = {
  ansari:  { pin: [-108, 138], family: 'The Ansaris', detail: 'laundry',
    day: ['A child opens the door a crack, stares at you, and shuts it. "MAMA! It\'s the CABBAGE one!"', '"If you\'re selling, we already buy from the stand on the quay. Oh! It\'s you. Hello!"', 'Running feet, a crash, a woman shouting. Nobody comes to the door.'] },
  mahmoud: { pin: [108, 182], family: 'Old Mahmoud', detail: 'bench',
    resident: { name: 'Old Mahmoud, on his bench', role: 'local', race: 'human', body: 'Male_Peasant', sit: true, lines: ['"Sit, if your legs are young enough to get up again."', '"I watched them build the palace. Well, the second one. The first fell into the sea."', '"Your brother brought me a cabbage every week and never charged me. Don\'t you dare start."'] },
    day: ['"I\'m out here!" calls a voice from the bench beside you.'] },
  haddads: { pin: [28, 227], family: 'Mrs. Haddad\'s cousins', detail: 'pots',
    day: ['"Is that the sibling? Our cousin talks about you every Friday. Come in for tea one day. Not today."', '"Tell our cousin we\'re fine and we don\'t need any more cabbages."'] },
  lina:    { pin: [108, 227], family: 'Lina the midwife', detail: 'pots',
    day: ['A tired voice: "Unless someone is having a baby, I am asleep. I was up all night."', '"Is someone having a baby?" "No." The door shuts.'],
    night: ['The door flies open. "Where? Who?" She sees you. "Oh. Nobody\'s having a baby." The door shuts.'] },
  ishak:   { pin: [98, 269], family: 'Ishak the goatherd', detail: 'cart',
    resident: { name: 'Ishak the goatherd', role: 'local', race: 'human', body: 'Male_Peasant', lines: ['"Lost two goats to the desert this week. They come back. They always come back. Smelling worse."', '"Milk? Cheese? Advice about goats? All free except the milk and the cheese."'] },
    day: ['Nobody answers. From the yard behind, a goat does.'] },
  karim:   { pin: [152, 116], family: 'Karim the gate guard\'s family', detail: 'laundry',
    day: ['"Karim is on the West Gate. I\'m his wife, and I\'m busy." The door stays open long enough for a smell of bread to escape.', '"If you\'ve come about the goat, it wasn\'t ours."'] },
  tobias:  { pin: [-88, 73], family: 'Tobias the letter-writer', detail: 'pots',
    day: ['A sign on the door: LETTERS WRITTEN, LETTERS READ, TWO COPPERS. GONE TO THE PALACE. BACK SOON.', 'A gnome peers up at you over his spectacles. "Letters? Not today, my hand is cramped. Tomorrow."'] },
  salim:   { pin: [-160, 72], family: 'Salim the dockhand\'s family', detail: 'barrels',
    resident: { name: 'Salim, a dockhand with a bad back', role: 'dockhand', race: 'human', body: 'Male_Peasant', lines: ['"Twenty years of crates. Now I can\'t lift my own children."', '"The Kraken\'s barkeep waters the rum. Don\'t tell him I said so. Tell him I said so."'] },
    day: ['His wife answers. "He\'s out front. Where else would he be? He hasn\'t moved since Tuesday."'] },
  yasmin:  { pin: [52, 95], family: 'The widow Yasmin', detail: 'pots',
    day: ['A servant in a clean apron: "The lady of the house receives visitors on the first of the month." The door closes, politely.', '"The lady is resting." From upstairs, very clearly: "The lady is NOT resting, Farid, who is it?"'] },
  students:{ pin: [152, 93], family: 'Two Transmuter students', detail: 'barrels',
    resident: { name: 'A Transmuter student, singed', role: 'scribe', race: 'gnome', lines: ['"We are NOT blowing anything up. Anymore."', '"Sand into glass is easy. Glass back into sand? That\'s where the eyebrows go."'] },
    day: ['"Is it the landlord? Tell him we\'re not in." A pause. "We\'re not in!"', 'A small bang inside. Then laughing. Then nobody comes.'] },
};

const NIGHT = ['"It\'s the middle of the night! Go away!"', 'A light comes on upstairs, then goes off again. Nobody comes down.', 'Silence. Then a dog, somewhere inside, deciding you\'re a thief.'];
const late = () => state.minute < 7 * 60 || state.minute >= 21 * 60;

// Knocking on a home's door.
export function knock(id) {
  const h = HOMES[id];
  const seed = state.day * 7 + Math.floor(state.minute / 90);
  const text = late() ? pick(h.night || NIGHT, seed) : pick(h.day, seed);
  return { name: `${h.family}'s door`, text: ['You knock.', text], options: [leave] };
}
// The first thing a resident out front says.
export const residentLine = (id) => pick(HOMES[id].resident.lines, Math.floor(Math.random() * 99));
