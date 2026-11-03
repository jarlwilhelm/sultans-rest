// Shared by the mini-games and their frame: screen size, colours, drawing helpers.
export const W = 960, H = 640;
export const COLORS = {
  sand: '#e8cf9e', sandDark: '#d4b47e', stone: '#d9cbb0', ink: '#2b1606', gold: '#e7c35a', teal: '#2f9c9a',
  sea: '#2a7d8c', seaDeep: '#1c5a6b', red: '#b8382b', cream: '#f6efe2', shade: 'rgba(20,12,4,0.65)',
};

// A parchment card for titles and results.
export function drawCard(g, title, lines, footer) {
  g.fillStyle = '#1b1208'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e8d6ac'; g.fillRect(140, 70, W - 280, H - 140);
  g.strokeStyle = '#7a5a2a'; g.lineWidth = 6; g.strokeRect(152, 82, W - 304, H - 164);
  g.fillStyle = COLORS.ink; g.textAlign = 'center';
  g.font = 'bold 48px Cinzel, Georgia, serif';
  g.fillText(title, W / 2, 170);
  g.font = '22px "IM Fell English", Georgia, serif';
  let y = 230;
  for (const line of lines) {
    for (const part of wrapText(g, line, W - 360)) { g.fillText(part, W / 2, y); y += 32; }
    y += 6;
  }
  g.font = 'bold 20px Cinzel, Georgia, serif';
  g.fillStyle = '#7a1408';
  g.fillText(footer, W / 2, H - 110);
}

export function wrapText(g, text, maxW) {
  const out = []; let line = '';
  for (const w of String(text).split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

// Tiny drawing helpers shared by the games (top-down figures in the city's colours).
export function person(g, x, y, r, body, head = '#c68642', facing = 0) {
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x + 2, y + 3, r * 1.1, r * 0.8, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = body; g.beginPath(); g.ellipse(x, y, r, r * 0.8, facing, 0, Math.PI * 2); g.fill();
  g.fillStyle = head; g.beginPath(); g.arc(x, y, r * 0.5, 0, Math.PI * 2); g.fill();
}
export function hud(g, items) {
  g.fillStyle = COLORS.shade; g.fillRect(0, 0, W, 40);
  g.fillStyle = COLORS.cream; g.font = 'bold 18px Cinzel, Georgia, serif'; g.textAlign = 'left';
  let x = 16;
  for (const it of items) { g.fillText(it, x, 27); x += g.measureText(it).width + 36; }
}
