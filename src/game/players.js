// The street players of Sultan's Rest: four people at their doors who'll play you at something (the user's map
// pins 8, 12, 13 and 14; docs/sultans-rest-pins.md). Each game is a mini-game (../minigames/), paid like a job
// (an hour of your time, a most-per-game, half pay from the third game of the day: npcs.js runGame).
// Where they stand: ../sidework.js. Names, lines and levels are DRAFT (Claude's).
import { level } from './state.js';

const leave = { label: 'Leave' };
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const PLAYERS = {
  selim: { pin: [-82, 247], game: 'Tic-Tac-Toe', level: 1, title: 'Old Selim, who plays tic-tac-toe', role: 'local', race: 'human', body: 'Male_Robe', props: 'board',
    lines: ['"Sit. One game. Well, three. Nobody plays only one."', '"My cousin in Meridia plays checkers. Pfah. Too many squares."', '"Forty years at this crate. I have lost twice. Both times I let them win."'] },
  tova: { pin: [-160, 51], game: 'Arm Wrestling', level: 2, title: 'Big Tova, who has never lost', role: 'sailor', race: 'orc', body: 'Female_Peasant', props: 'barrel',
    lines: ['She slaps the barrel. "Elbow here. Hand here. Cry later."', '"Every sailor in the Kraken has tried. Every sailor in the Kraken has lost."', '"You\'ve got your brother\'s arms. Skinny."'] },
  nadim: { pin: [-68, 161], game: 'The Shell Game', level: 3, title: 'Quick Nadim and his three cups', role: 'traveler', race: 'tiefling', body: 'Male_Robe', props: 'cups',
    lines: ['"Watch the pea, friend. Only the pea. Nothing else matters in the world."', '"Fair game, fair game! The guard plays every Tuesday. Loses every Tuesday."', 'His hands never stop moving, even when he talks.'] },
  rhea: { pin: [80, 117], game: 'Knife Throwing', level: 4, title: 'Rhea the knife thrower', role: 'adventurer', race: 'elf', body: 'Female_Ranger', props: 'target',
    lines: ['"I used to throw at the circus in Eldoria. Then I threw at the ringmaster."', '"Eight knives, one board. Don\'t hit the window. Again."', 'She flips a knife up and catches it without looking.'] },
};

export function playerTalk(npc, runGame) {
  const p = PLAYERS[npc.id];
  const ok = level() >= p.level;
  return { name: npc.label || p.title, text: [pick(p.lines)], options: [
    { label: `Play: ${p.game}`, hint: ok ? 'mini-game · takes an hour' : `Level ${p.level}`, disabled: !ok, do: () => runGame(p.game, {}) },
    leave,
  ] };
}
