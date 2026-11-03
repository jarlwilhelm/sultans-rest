// Cargo Hold (falling blocks): cargo swings down from the crane into the ship's hold.
// Turn it and slide it so it packs tight; every full row is loaded and paid for, and the
// rest settles. The crane speeds up as you go. If the hold overflows, the shift is over.
import { W, H, COLORS, hud } from './common.js';

const COLS = 10, ROWS = 18, C = 32;
const X0 = (W - COLS * C) / 2, Y0 = H - ROWS * C - 12;
// Cargo shapes and how they're drawn (crate, sack, barrel, bale...).
const SHAPES = [
  { name: 'timber', cells: [[0, 1], [1, 1], [2, 1], [3, 1]], color: '#b08a5a', kind: 'plank' },
  { name: 'crate', cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: '#c49a6c', kind: 'crate' },
  { name: 'sacks', cells: [[1, 0], [0, 1], [1, 1], [2, 1]], color: '#d8c49a', kind: 'sack' },
  { name: 'barrels', cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: '#8a5a2e', kind: 'barrel' },
  { name: 'chests', cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: '#6b4a8e', kind: 'crate' },
  { name: 'silk', cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: '#7a4ab0', kind: 'sack' },
  { name: 'spice', cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: '#d9752a', kind: 'sack' },
];

export const cargoHold = {
  title: 'Cargo Hold',
  how: [
    'Cargo comes down from the crane. Pack it into the hold as tightly as you can.',
    'Left and right to slide it, Up to turn it, Down to lower it faster, Space to drop it.',
    'Every full row is loaded and paid for. The crane speeds up. If the hold overflows, the shift is over.',
  ],
  create(api) {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let piece, next = rand(), fall = 0, speed = 0.8, rows = 0, score = 0, over = false, clearing = null, t = 0, combo = 0;
    function rand() { const s = SHAPES[Math.floor(Math.random() * SHAPES.length)]; return { ...s, cells: s.cells.map(c => [...c]) }; }
    function spawn() {
      piece = { ...next, x: 3, y: -1 };
      next = rand();
      if (collides(piece.cells, piece.x, piece.y)) { over = true; api.finish(result()); }
    }
    function collides(cells, px, py) {
      return cells.some(([cx, cy]) => {
        const x = px + cx, y = py + cy;
        return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && grid[y][x]);
      });
    }
    function rotate() {
      const n = Math.max(...piece.cells.map(c => Math.max(c[0], c[1]))) + 1;
      const r = piece.cells.map(([x, y]) => [n - 1 - y, x]);
      for (const kick of [0, -1, 1, -2, 2]) if (!collides(r, piece.x + kick, piece.y)) { piece.cells = r; piece.x += kick; return; }
    }
    function lock() {
      for (const [cx, cy] of piece.cells) {
        const y = piece.y + cy;
        if (y < 0) { over = true; api.finish(result()); return; }
        grid[y][piece.x + cx] = { color: piece.color, kind: piece.kind };
      }
      const full = [];
      for (let y = 0; y < ROWS; y++) if (grid[y].every(Boolean)) full.push(y);
      if (full.length) {
        clearing = { rows: full, t: 0.35 };
        rows += full.length;
        combo++;
        score += [0, 100, 300, 500, 800][full.length] * (1 + Math.floor(rows / 10) * 0.5) + combo * 10;
        speed = Math.max(0.12, 0.8 - rows * 0.025);
      } else combo = 0;
      spawn();
    }
    function result() {
      return { score: Math.round(score), gold: rows * 3 + Math.floor(score / 150), renown: Math.floor(rows / 2) + 1, rep: { mariners: Math.min(4, Math.floor(rows / 4)) },
        summary: `${rows} row${rows === 1 ? '' : 's'} loaded.` };
    }
    spawn();

    function update(dt) {
      if (over) return;
      t += dt;
      if (clearing) {
        clearing.t -= dt;
        if (clearing.t <= 0) {
          // Remove the full rows (from the bottom up so indexes stay right), add empty ones on top.
          for (const y of [...clearing.rows].sort((a, b) => b - a)) grid.splice(y, 1);
          for (let i = 0; i < clearing.rows.length; i++) grid.unshift(Array(COLS).fill(null));
          clearing = null;
        }
        return;
      }
      const k = api.pressed;
      if ((k.has('ArrowLeft') || k.has('KeyA')) && !collides(piece.cells, piece.x - 1, piece.y)) piece.x--;
      if ((k.has('ArrowRight') || k.has('KeyD')) && !collides(piece.cells, piece.x + 1, piece.y)) piece.x++;
      if (k.has('ArrowUp') || k.has('KeyW')) rotate();
      if (k.has('Space')) {
        while (!collides(piece.cells, piece.x, piece.y + 1)) { piece.y++; score += 2; }
        lock(); return;
      }
      fall += dt * (api.keys.has('ArrowDown') || api.keys.has('KeyS') ? 12 : 1);
      if (fall >= speed) {
        fall = 0;
        if (collides(piece.cells, piece.x, piece.y + 1)) lock(); else piece.y++;
      }
    }

    function cell(g, x, y, c, ghost = false) {
      const px = X0 + x * C, py = Y0 + y * C;
      if (ghost) { g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = 2; g.strokeRect(px + 3, py + 3, C - 6, C - 6); return; }
      g.fillStyle = c.color; g.fillRect(px + 1, py + 1, C - 2, C - 2);
      g.strokeStyle = 'rgba(40,24,10,0.6)'; g.lineWidth = 2;
      if (c.kind === 'crate') { g.strokeRect(px + 3, py + 3, C - 6, C - 6); g.beginPath(); g.moveTo(px + 3, py + 3); g.lineTo(px + C - 3, py + C - 3); g.stroke(); }
      else if (c.kind === 'plank') { for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(px + 2, py + i * C / 3); g.lineTo(px + C - 2, py + i * C / 3); g.stroke(); } }
      else if (c.kind === 'barrel') { g.beginPath(); g.arc(px + C / 2, py + C / 2, C * 0.38, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(px + C / 2, py + C / 2, C * 0.18, 0, Math.PI * 2); g.stroke(); }
      else { g.beginPath(); g.moveTo(px + C / 2, py + 4); g.lineTo(px + C / 2, py + 10); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(px + 4, py + 12, C - 8, C - 16); }
    }

    function draw(g) {
      // The ship's hold: dark planks, the crane rope above.
      g.fillStyle = '#1d1209'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#3a2a1a'; g.fillRect(X0 - 14, Y0 - 6, COLS * C + 28, ROWS * C + 18);
      g.fillStyle = '#24170c'; g.fillRect(X0, Y0, COLS * C, ROWS * C);
      for (let y = 0; y < ROWS; y++) { g.fillStyle = y % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)'; g.fillRect(X0, Y0 + y * C, COLS * C, C); }
      if (piece && !over) {
        g.strokeStyle = '#a08a6a'; g.lineWidth = 2;
        const top = Math.min(...piece.cells.map(c => c[1]));
        g.beginPath(); g.moveTo(X0 + (piece.x + 1.5) * C, 40); g.lineTo(X0 + (piece.x + 1.5) * C, Y0 + (piece.y + top) * C); g.stroke();
      }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x]) cell(g, x, y, grid[y][x]);
      if (clearing) {
        g.fillStyle = `rgba(231,195,90,${0.3 + 0.5 * Math.sin(t * 40) ** 2})`;
        for (const y of clearing.rows) g.fillRect(X0, Y0 + y * C, COLS * C, C);
      }
      if (piece && !over && !clearing) {
        let gy = piece.y; while (!collides(piece.cells, piece.x, gy + 1)) gy++;
        for (const [cx, cy] of piece.cells) if (gy + cy >= 0) cell(g, piece.x + cx, gy + cy, piece, true);
        for (const [cx, cy] of piece.cells) if (piece.y + cy >= 0) cell(g, piece.x + cx, piece.y + cy, piece);
      }
      // Next cargo.
      g.fillStyle = COLORS.cream; g.font = 'bold 18px Cinzel, Georgia, serif'; g.textAlign = 'left';
      g.fillText('Next on the crane', X0 + COLS * C + 40, Y0 + 30);
      g.font = '16px "IM Fell English", Georgia, serif'; g.fillText(next.name, X0 + COLS * C + 40, Y0 + 52);
      for (const [cx, cy] of next.cells) {
        const px = X0 + COLS * C + 40 + cx * 26, py = Y0 + 70 + cy * 26;
        g.fillStyle = next.color; g.fillRect(px, py, 24, 24);
      }
      hud(g, [`Rows loaded ${rows}`, `Score ${Math.round(score)}`, `Crane speed ${Math.round(0.8 / speed * 10) / 10}x`]);
    }
    return { update, draw };
  },
};
