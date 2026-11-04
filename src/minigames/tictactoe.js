// Tic-tac-toe against Old Selim, on a board chalked on a crate (Sultan's Rest, pin 14). The first of the
// board-game players (Meridia gets checkers, Iron Peak chess). Three games; you start the first, then take turns.
// Selim plays well but not perfectly: he slips more often when he's ahead. Numbers are DRAFT (Claude's).
import { W, H, COLORS, hud } from './common.js';

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winner = (b) => { for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: [a, c, d] }; return b.every(Boolean) ? { who: 'draw' } : null; };
// The best move for `me` (full search: the board is tiny).
function best(b, me) {
  const you = me === 'O' ? 'X' : 'O';
  let top = -2, pick = -1;
  for (let i = 0; i < 9; i++) if (!b[i]) {
    b[i] = me; const s = -score(b, you); b[i] = null;
    if (s > top) { top = s; pick = i; }
  }
  return pick;
}
function score(b, turn) {
  const w = winner(b);
  if (w) return w.who === 'draw' ? 0 : w.who === turn ? 1 : -1;
  let top = -2;
  for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = turn; top = Math.max(top, -score(b, turn === 'X' ? 'O' : 'X')); b[i] = null; }
  return top;
}
// Numpad layout: 7 8 9 on top, 1 2 3 at the bottom.
const KEY_CELL = { Digit7: 0, Digit8: 1, Digit9: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit1: 6, Digit2: 7, Digit3: 8,
  Numpad7: 0, Numpad8: 1, Numpad9: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad1: 6, Numpad2: 7, Numpad3: 8 };

export const ticTacToe = {
  title: 'Tic-Tac-Toe',
  how: [
    'Old Selim plays three games on the lid of a crate. You start the first; then you take turns going first.',
    'Click a square (or press 1-9, laid out like a number pad). Three in a row wins.',
    'He is good. He is not perfect. Win more games than he does.',
  ],
  create(api) {
    const BX = W / 2 - 180, BY = 150, C = 120;
    let board = Array(9).fill(null), game = 1, wins = 0, losses = 0, draws = 0;
    let turn = 'X', starter = 'X', wait = 0, msg = 'Your move.', done = null, over = false;
    const slip = () => 0.22 + (losses - wins) * 0.08;   // he gets careless when he's winning
    function place(i, who) {
      board[i] = who;
      done = winner(board);
      if (done) {
        if (done.who === 'X') { wins++; msg = pick(['"Hm." He rubs out the chalk with his sleeve.', '"Beginner\'s luck. Again."']); }
        else if (done.who === 'O') { losses++; msg = pick(['"Ha! Again, again."', 'He taps the line he made. "You didn\'t see it coming."']); }
        else { draws++; msg = '"A draw. The board is a fair judge."'; }
        wait = 1.8;
      } else { turn = who === 'X' ? 'O' : 'X'; if (turn === 'O') { wait = 0.6 + Math.random() * 0.6; msg = 'Selim strokes his beard...'; } else msg = 'Your move.'; }
    }
    function nextGame() {
      if (game === 3) {
        over = true;
        const won = wins > losses;
        return api.finish({ score: wins, won, gold: won ? 12 + wins : wins * 3, renown: 4 + wins * 3,
          summary: won ? `You beat Old Selim ${wins} to ${losses}${draws ? ` (${draws} drawn)` : ''}. He pays up, grumbling, and asks for a rematch tomorrow.`
            : wins === losses ? `${wins} to ${losses}: even. "A good game," he says, and means it.` : `Selim wins ${losses} to ${wins}. "Come back when you've practised. On someone else."` });
      }
      game++; board = Array(9).fill(null); done = null;
      starter = starter === 'X' ? 'O' : 'X'; turn = starter;
      if (turn === 'O') { wait = 0.8; msg = 'Selim goes first this time.'; } else msg = 'Your move.';
    }
    function update(dt) {
      if (over) return;
      if (wait > 0) { wait -= dt; if (wait > 0) return; if (done) return nextGame(); }
      if (turn === 'O') {
        const free = board.map((v, i) => v ? -1 : i).filter(i => i >= 0);
        place(Math.random() < slip() ? free[Math.floor(Math.random() * free.length)] : best(board, 'O'), 'O');
        return;
      }
      let cell = -1;
      for (const [k, i] of Object.entries(KEY_CELL)) if (api.pressed.has(k)) cell = i;
      if (api.mouse.clicked) {
        const cx = Math.floor((api.mouse.x - BX) / C), cy = Math.floor((api.mouse.y - BY) / C);
        if (cx >= 0 && cx < 3 && cy >= 0 && cy < 3) cell = cy * 3 + cx;
      }
      if (cell >= 0 && !board[cell]) place(cell, 'X');
    }
    function draw(g) {
      g.fillStyle = COLORS.sandDark; g.fillRect(0, 0, W, H);
      // The crate lid.
      g.fillStyle = '#7a5838'; g.fillRect(BX - 30, BY - 30, C * 3 + 60, C * 3 + 60);
      g.strokeStyle = '#5a3f26'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(BX - 30, BY - 30 + i * 70); g.lineTo(BX + C * 3 + 30, BY - 30 + i * 70); g.stroke(); }
      // Chalk grid.
      g.strokeStyle = 'rgba(245,240,230,0.85)'; g.lineWidth = 6; g.lineCap = 'round';
      for (let i = 1; i < 3; i++) {
        g.beginPath(); g.moveTo(BX + i * C, BY + 8); g.lineTo(BX + i * C + 3, BY + C * 3 - 8); g.stroke();
        g.beginPath(); g.moveTo(BX + 8, BY + i * C); g.lineTo(BX + C * 3 - 8, BY + i * C - 3); g.stroke();
      }
      board.forEach((v, i) => {
        const x = BX + (i % 3) * C + C / 2, y = BY + Math.floor(i / 3) * C + C / 2;
        if (v === 'X') { g.strokeStyle = COLORS.cream; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 32, y - 32); g.lineTo(x + 32, y + 32); g.moveTo(x + 32, y - 32); g.lineTo(x - 32, y + 32); g.stroke(); }
        if (v === 'O') { g.strokeStyle = COLORS.gold; g.lineWidth = 9; g.beginPath(); g.arc(x, y, 36, 0, Math.PI * 2); g.stroke(); }
      });
      if (done?.line) {
        const p = (i) => [BX + (i % 3) * C + C / 2, BY + Math.floor(i / 3) * C + C / 2];
        const [a, b] = [p(done.line[0]), p(done.line[2])];
        g.strokeStyle = done.who === 'X' ? '#9ad0ff' : COLORS.red; g.lineWidth = 8; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
      }
      g.lineWidth = 1;
      hud(g, [`Game ${game} of 3`, `You ${wins} · Selim ${losses} · drawn ${draws}`, 'You are X']);
      g.fillStyle = COLORS.ink; g.font = '24px "IM Fell English", Georgia, serif'; g.textAlign = 'center';
      g.fillText(msg, W / 2, H - 40);
    }
    return { update, draw };
  },
};
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
