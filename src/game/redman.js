// Redman's favors (docs/chapter-two-plan.md). The first time you meet him (Chapter One, level 8) he gives you a
// purse with 3 faceless coins; each meeting after that adds one (Chapter Two). Each time, he asks if there's
// anything he can do, and you may pick ONE favor, for one coin:
//  - a new face: a look from a set only he can give (not in the creator, not at the barber), for good;
//  - something rare, from things only he can find;
//  - 500 gold;
//  - the marriage switch (Chapter Two, from level 15): a spouse found by him, or your spouse gone.
// Every line here is a DRAFT by Claude.
import { state, level, note, save } from './state.js';
import { updateStatus, toast } from './ui.js';

export const FIRST_PURSE = 3, MARRIAGE_LEVEL = 15;
// The faces only Redman can give: skin and hair not found anywhere else.
const FACES = [
  { skin: '#a9b4c8', hair: '#d8dde8', name: 'moon-pale, with silver hair' },
  { skin: '#4c5866', hair: '#101418', name: 'storm-grey, with hair like wet slate' },
  { skin: '#c8a24a', hair: '#7a1408', name: 'gold-dusted, with hair the red of his name' },
  { skin: '#d8c8e8', hair: '#4b1f6b', name: 'lilac-pale, with violet hair' },
  { skin: '#2a2f3a', hair: '#e8e4dc', name: 'night-dark, with white hair' },
];
// Things only he can find.
export const RARE = ['hat:redfeather', 'held:compass', 'hat:silvercirclet'];

const purse = () => state.coins ?? 0;

// Called at the end of his first visit: the purse, then his question.
export function firstMeeting(name, before) {
  if (!state.flags.purse) {
    state.flags.purse = true;
    state.coins = FIRST_PURSE;
    import('./items.js').then(m => m.give('keep:purse', 'from Redman'));
    note(`Redman gave you a purse with ${FIRST_PURSE} faceless coins`);
    save();
  }
  return { name, text: [...before,
    'Before he goes he sets a small purse of worn red leather on the table. Three coins inside, and none of them has a face. "Keep these. I owe your brother more than I can pay, so I\'ll pay you, a little at a time. Is there anything I can do for you?"'],
  options: favorOptions(name) };
}

export function favorOptions(name) {
  const done = (text) => ({ name, text, options: [{ label: 'Leave' }] });
  const spend = () => { state.coins = purse() - 1; save(); updateStatus(); };
  const none = purse() < 1;
  return [
    { label: 'A new face', hint: none ? 'no coins left' : '1 coin, for good', disabled: none, do: () => {
      spend();
      const f = FACES[Math.floor(Math.random() * FACES.length)];
      state.look = { ...state.look, skin: f.skin, hair: f.hair, redmanFace: true };
      note(`Redman gave you a new face: ${f.name}`);
      save();
      dispatchEvent(new CustomEvent('lavine:look'));
      return done([`He takes a coin from your purse, looks at you for a long moment, and touches two fingers to your brow. Nothing happens. Then you catch your reflection in the window glass: ${f.name}. It is your face. It is not the face you came in with.`, '"No one will ever ask a barber for that one," he says. "Wear it well."']);
    } },
    { label: 'Something rare', hint: none ? 'no coins left' : '1 coin', disabled: none, do: async () => {
      const { ITEMS, give } = await import('./items.js');
      const left = RARE.filter(id => !(state.owned || []).includes(id));
      if (!left.length) return done(['"I\'ve nothing you don\'t already have. Ask me for something else."']);
      spend();
      const id = left[Math.floor(Math.random() * left.length)];
      give(id, 'from Redman');
      return done([`He takes a coin and leaves something in its place: ${ITEMS[id].name.toLowerCase()}. "Don\'t ask where it\'s been. It was never anywhere you\'d like."`]);
    } },
    { label: '500 gold', hint: none ? 'no coins left' : '1 coin', disabled: none, do: () => {
      spend();
      state.gold += 500; state.earned += 500;
      note('Redman gave you 500 gold');
      save(); updateStatus();
      toast('+500 gold', 3000);
      return done(['He sets down a heavy bag. "Five hundred. Spend it on something your brother would have laughed at."']);
    } },
    { label: state.spouse ? 'Make my spouse disappear' : 'Find me someone to marry', hint: level() < MARRIAGE_LEVEL ? `level ${MARRIAGE_LEVEL}` : none ? 'no coins left' : '1 coin', disabled: level() < MARRIAGE_LEVEL || none, do: async () => {
      spend();
      const M = await import('./marriage.js');
      return done([state.spouse ? M.divorce() : M.redmanMarriage()]);
    } },
    { label: 'Nothing, for now', do: () => done([`"Then keep your coins." ${purse()} in the purse. "I'll see you again. Not soon."`]) },
  ];
}
