// Doors and windows drawn in code (2026-11-04, the user: 'the doors look like a wall texture, get real door
// textures and window textures, all the way around'). Painted on canvases, so they need no image files and look
// the same at every graphics setting and on every copy of the game (local, GitHub Pages, the claude.ai link).
import * as THREE from 'three';

function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// A little wood grain in a rectangle.
function grain(g, x, y, w, h, base, seed) {
  g.fillStyle = base; g.fillRect(x, y, w, h);
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < w / 3; i++) {
    g.strokeStyle = `rgba(30,18,8,${0.08 + r() * 0.14})`; g.lineWidth = 1 + r() * 1.5;
    const gx = x + r() * w;
    g.beginPath(); g.moveTo(gx, y); g.bezierCurveTo(gx + r() * 6 - 3, y + h / 3, gx + r() * 6 - 3, y + h * 2 / 3, gx + r() * 4 - 2, y + h); g.stroke();
  }
}

// A plank door: a dark frame all the way round, vertical planks, two iron straps with studs, a ring handle.
export function doorMaterial(wood = '#6b4529') {
  const map = canvas(128, 256, (g, w, h) => {
    g.fillStyle = '#2a1a0e'; g.fillRect(0, 0, w, h);                                 // the frame
    const f = 10, pw = (w - 2 * f) / 4;
    for (let i = 0; i < 4; i++) {
      grain(g, f + i * pw, f, pw, h - f, wood, 11 + i * 7);
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(f + i * pw, f, 1.5, h - f);        // gaps between planks
    }
    for (const sy of [0.22, 0.74]) {                                                 // iron straps
      g.fillStyle = '#2b2b2e'; g.fillRect(f, h * sy, w - 2 * f, 9);
      g.fillStyle = '#6a6a70'; for (let x = f + 6; x < w - f; x += 18) { g.beginPath(); g.arc(x, h * sy + 4.5, 2.2, 0, 7); g.fill(); }
    }
    g.strokeStyle = '#b08a3a'; g.lineWidth = 3;                                      // the ring handle
    g.beginPath(); g.arc(w - f - 16, h * 0.52, 7, 0, 7); g.stroke();
    g.fillStyle = '#5a4a2a'; g.beginPath(); g.arc(w - f - 16, h * 0.52 - 7, 3, 0, 7); g.fill();
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.85 });
}

// A window: a wooden frame all the way round, a cross of glazing bars, four glass panes. The panes (only) glow at
// night: city.js turns emissiveIntensity up after dark, as before.
export function windowMaterial(frame = '#e8dfcc') {
  const draw = (glow) => (g, w, h) => {
    g.fillStyle = glow ? '#000' : frame; g.fillRect(0, 0, w, h);
    const f = 12, b = 7;
    const panes = [[f, f], [w / 2 + b / 2, f], [f, h / 2 + b / 2], [w / 2 + b / 2, h / 2 + b / 2]];
    for (const [px, py] of panes) {
      const pw = w / 2 - f - b / 2, ph = h / 2 - f - b / 2;
      if (glow) { g.fillStyle = '#fff'; g.fillRect(px, py, pw, ph); continue; }
      const gr = g.createLinearGradient(px, py, px + pw, py + ph);
      gr.addColorStop(0, '#3a4a5c'); gr.addColorStop(0.5, '#1c2430'); gr.addColorStop(1, '#2a3646');
      g.fillStyle = gr; g.fillRect(px, py, pw, ph);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(px + 4, py + ph * 0.6); g.lineTo(px + pw * 0.5, py + 4); g.lineTo(px + pw * 0.7, py + 4); g.lineTo(px + 4, py + ph * 0.85); g.fill();
    }
    if (!glow) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }
  };
  return new THREE.MeshStandardMaterial({ map: canvas(128, 160, draw(false)), emissiveMap: canvas(128, 160, draw(true)), emissive: '#ffc070', emissiveIntensity: 0, roughness: 0.35 });
}

// A paper with handwriting on it: not real words, just scribbles (2026-11-04, the user: the trade notices looked
// empty). A bold heading line, a few lines of wavy script, sometimes a tally, a little sketch or a wax seal.
// Each seed gives a different sheet.
export function scribbleMaterial(seed = 1, { paper = '#efe6cf', ink = '#3a2a1c', side = THREE.FrontSide } = {}) {
  let s = (Math.abs(Math.round(seed)) * 9301 + 49297) % 233280 || 1;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const map = canvas(160, 200, (g, w, h) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,90,50,0.10)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 30, 0, 7); g.fill(); }   // age stains
    g.strokeStyle = ink; g.lineCap = 'round';
    const line = (x0, x1, y, wob, width) => {
      g.lineWidth = width; g.beginPath(); g.moveTo(x0, y);
      for (let x = x0; x < x1; x += 3) g.lineTo(x, y + Math.sin(x * (0.5 + r() * 0.3)) * wob + (r() - 0.5) * 1.2);
      g.stroke();
    };
    line(w * 0.2, w * (0.6 + r() * 0.2), 24, 2.5, 3.2);                                     // the heading
    let y = 46;
    const rows = 5 + Math.floor(r() * 4);
    for (let i = 0; i < rows && y < h - 30; i++, y += 13 + r() * 4) {
      const x0 = 14 + (i === 0 ? 10 : 0), x1 = w - 14 - r() * 40;
      // a line of words: short wavy strokes with gaps
      let x = x0;
      while (x < x1) { const len = 10 + r() * 26; line(x, Math.min(x + len, x1), y, 1.6, 1.4); x += len + 5 + r() * 5; }
    }
    const extra = r();
    if (extra < 0.3) { g.lineWidth = 1.6; for (let i = 0; i < 7; i++) { const tx = 20 + i * 7 + (i === 4 ? 10 : 0); g.beginPath(); g.moveTo(tx, h - 30); g.lineTo(i === 4 ? tx - 34 : tx, h - 14); g.stroke(); } }   // a tally
    else if (extra < 0.6) { g.fillStyle = '#8a1e1a'; g.beginPath(); g.arc(w - 30, h - 26, 11, 0, 7); g.fill(); g.strokeStyle = '#5a1210'; g.lineWidth = 1.5; g.beginPath(); g.arc(w - 30, h - 26, 6, 0, 7); g.stroke(); }   // a wax seal
    else { g.lineWidth = 1.5; g.strokeRect(18, h - 42, 30, 22); g.beginPath(); g.moveTo(18, h - 42); g.lineTo(33, h - 52); g.lineTo(48, h - 42); g.stroke(); line(56, w - 20, h - 26, 1.2, 1.3); }   // a little sketch of a crate
    g.fillStyle = '#6a6a70'; g.beginPath(); g.arc(w / 2, 8, 3, 0, 7); g.fill();               // the pin
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.95, side });
}
