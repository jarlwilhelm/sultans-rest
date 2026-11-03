// Everything with writing on it: guild signs, banners, plaques and wanted posters.
// Each is drawn on a canvas, used as a texture in the world and shown big when you read it.
import * as THREE from 'three';
import { makeRng, range, pick } from './noise.js';

// Things you can read with E: { pos, title, canvas }.
export const readables = [];

const SERIF = '"Cinzel", "Trajan Pro", Georgia, serif';
const HAND = '"IM Fell English", Georgia, serif';

function parchment(g, w, h, seed, tint = [232, 214, 172]) {
  const rng = makeRng(seed);
  g.fillStyle = `rgb(${tint.join(',')})`;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    const a = range(rng, 0.02, 0.07);
    g.fillStyle = rng() < 0.5 ? `rgba(120,80,30,${a})` : `rgba(255,250,230,${a})`;
    g.fillRect(rng() * w, rng() * h, range(rng, 1, 5), range(rng, 1, 5));
  }
  // Darker, sun-worn edges.
  const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(90,50,10,0.45)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}

function fitText(g, text, maxW, size, font) {
  let s = size;
  do { g.font = `${font.weight || 'bold'} ${s}px ${font.family}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}

function wrap(g, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = word;
      y += lineH;
    } else line = test;
  }
  if (line) g.fillText(line, x, y);
  return y + lineH;
}

// A graphite portrait, in a completely different style from the game itself: how the harbor guard's artist
// (and everyone in Sultan's Rest) sees people. Built up like a pencil drawing: soft tone, light from the upper
// left, cross-hatched shadows, real eyes, nose, lips, hundreds of hair strands. Different for every seed.
function sketchFace(g, cx, cy, seed, f) {
  const rng = makeRng(seed);
  const R = (a, b) => range(rng, a, b);
  const P = {
    w: R(56, 68), h: R(76, 88), jaw: R(0.72, 0.9), eyeGap: R(0.34, 0.42), eyeY: R(-0.08, -0.02), nose: R(0.36, 0.46),
    mouthW: R(0.28, 0.4), mouthY: R(0.52, 0.6), brow: R(0.8, 1.6), age: R(0, 1), hair: f.hood ? 'hood' : f.bald ? 'bald' : pick(rng, ['short', 'short', 'long', 'curly', 'swept']),
    tilt: R(-0.05, 0.05),
  };
  const graphite = (a) => `rgba(34,27,22,${Math.min(0.95, a * 1.7)})`;
  g.save();
  // The artist's shaded background: dark scribbles around the head, lighter toward the middle.
  g.globalCompositeOperation = 'multiply';
  const bg = g.createRadialGradient(cx - 30, cy - 20, 40, cx, cy, 230);
  bg.addColorStop(0, graphite(0)); bg.addColorStop(0.55, graphite(0.12)); bg.addColorStop(1, graphite(0.4));
  g.fillStyle = bg; g.fillRect(cx - 200, cy - 160, 400, 340);
  g.lineWidth = 1;
  for (let k = 0; k < 340; k++) {
    const x = cx + R(-190, 190), y = cy + R(-150, 160), d = Math.hypot(x - cx, (y - cy) * 1.2);
    if (d < 120) continue;
    g.strokeStyle = graphite(R(0.08, 0.22) * Math.min(1, (d - 110) / 80)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y - 22); g.stroke();
  }
  // Big enough to fill the frame, like a mugshot.
  g.translate(cx, cy + 12); g.scale(1.55, 1.55); g.rotate(P.tilt); g.translate(-cx, -cy);
  g.globalCompositeOperation = 'multiply';
  const head = () => {                                   // temples, cheekbones, jaw corners, a squarish chin
    const half = (sx) => {
      g.bezierCurveTo(cx + sx * P.w * 0.75, cy - P.h, cx + sx * P.w * 0.95, cy - P.h * 0.75, cx + sx * P.w * 0.9, cy - P.h * 0.35);   // brow to temple
      g.quadraticCurveTo(cx + sx * P.w * 1.02, cy + P.h * 0.05, cx + sx * P.w * 0.97, cy + P.h * 0.2);                                  // cheekbone
      g.quadraticCurveTo(cx + sx * P.w * 0.95, cy + P.h * 0.5, cx + sx * P.w * P.jaw, cy + P.h * 0.68);                                 // to the jaw corner
      g.quadraticCurveTo(cx + sx * P.w * 0.55, cy + P.h * 0.98, cx + sx * P.w * 0.22, cy + P.h * 1.03);                                 // jaw to chin
    };
    g.beginPath(); g.moveTo(cx, cy - P.h);
    half(1); g.lineTo(cx - P.w * 0.22, cy + P.h * 1.03);
    // (back up the other side, in reverse)
    g.quadraticCurveTo(cx - P.w * 0.55, cy + P.h * 0.98, cx - P.w * P.jaw, cy + P.h * 0.68);
    g.quadraticCurveTo(cx - P.w * 0.95, cy + P.h * 0.5, cx - P.w * 0.97, cy + P.h * 0.2);
    g.quadraticCurveTo(cx - P.w * 1.02, cy + P.h * 0.05, cx - P.w * 0.9, cy - P.h * 0.35);
    g.bezierCurveTo(cx - P.w * 0.95, cy - P.h * 0.75, cx - P.w * 0.75, cy - P.h, cx, cy - P.h);
  };
  // Hatching inside the current clip: parallel strokes whose darkness follows shade(x, y) (0 = paper, 1 = darkest).
  const hatch = (x0, y0, x1, y1, angle, gap, shade, width = 0.9) => {
    const dx = Math.cos(angle), dy = Math.sin(angle), nx = -dy, ny = dx;
    const span = Math.hypot(x1 - x0, y1 - y0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    g.lineWidth = width;
    for (let t = -span; t < span; t += gap * R(0.85, 1.15)) {
      let px = mx + nx * t - dx * span, py = my + ny * t - dy * span;
      for (let s2 = 0; s2 < span * 2; s2 += 6) {
        const qx = px + dx * 6, qy = py + dy * 6, a = shade(px, py);
        if (a > 0.04) { g.strokeStyle = graphite(Math.min(0.55, a * 0.6)); g.beginPath(); g.moveTo(px, py); g.lineTo(qx + R(-0.6, 0.6), qy + R(-0.6, 0.6)); g.stroke(); }
        px = qx; py = qy;
      }
    }
  };
  // Light comes from the upper left: darker to the right and toward the edges of the face.
  const faceShade = (x, y) => {
    const u = (x - cx) / P.w, v = (y - cy) / P.h;
    return Math.max(0, 0.15 + u * 0.55 + Math.max(0, Math.hypot(u, v * 0.9) - 0.55) * 0.9 + (v > 0.7 ? (v - 0.7) * 0.8 : 0));
  };

  // Neck, shoulders and collar first (behind the head).
  g.save();
  g.beginPath(); g.moveTo(cx - P.w * 0.45, cy + P.h * 0.75); g.lineTo(cx - P.w * 0.5, cy + P.h * 1.35); g.lineTo(cx + P.w * 0.55, cy + P.h * 1.35); g.lineTo(cx + P.w * 0.5, cy + P.h * 0.75); g.closePath();
  g.clip(); hatch(cx - 70, cy + 40, cx + 70, cy + 140, 0.9, 3.5, (x, y) => 0.25 + (x - cx) / 120 + (cy + P.h * 0.95 - y < 0 ? 0.3 : 0)); g.restore();
  g.strokeStyle = graphite(0.6); g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(cx - 175, cy + 200); g.quadraticCurveTo(cx - 120, cy + P.h * 1.18, cx - P.w * 0.5, cy + P.h * 1.2); g.stroke();
  g.beginPath(); g.moveTo(cx + 175, cy + 200); g.quadraticCurveTo(cx + 120, cy + P.h * 1.18, cx + P.w * 0.55, cy + P.h * 1.2); g.stroke();
  g.save(); g.beginPath(); g.rect(cx - 180, cy + P.h * 1.15, 360, 120); g.clip();
  hatch(cx - 180, cy + P.h * 1.15, cx + 180, cy + 230, -0.6, 4, (x, y) => 0.18 + (x - cx) / 400 + (y - cy - P.h) / 300);
  hatch(cx - 180, cy + P.h * 1.15, cx + 180, cy + 230, 0.6, 5, (x, y) => (x - cx) / 300 - 0.05); g.restore();

  // The head: soft tone, then hatching on the shadow side.
  g.save(); head(); g.clip();
  const tone = g.createRadialGradient(cx - P.w * 0.35, cy - P.h * 0.35, 5, cx, cy, P.w * 1.4);
  tone.addColorStop(0, 'rgba(255,255,255,0)'); tone.addColorStop(0.55, graphite(0.08)); tone.addColorStop(1, graphite(0.3));
  g.fillStyle = tone; g.fillRect(cx - 120, cy - 120, 240, 260);
  hatch(cx - P.w, cy - P.h, cx + P.w, cy + P.h, 1.05, 3.2, faceShade);
  hatch(cx - P.w, cy - P.h, cx + P.w, cy + P.h, 2.4, 4.5, (x, y) => faceShade(x, y) - 0.35);
  // Cheekbone shadows, the shadow under the jaw.
  for (const sx of [-1, 1]) {
    const cg = g.createRadialGradient(cx + sx * P.w * 0.62, cy + P.h * 0.22, 2, cx + sx * P.w * 0.62, cy + P.h * 0.22, P.w * 0.42);
    cg.addColorStop(0, graphite(sx > 0 ? 0.22 : 0.1)); cg.addColorStop(1, graphite(0)); g.fillStyle = cg; g.fillRect(cx - 120, cy - 120, 240, 260);
  }
  g.restore();
  g.lineWidth = 0.9;
  for (let k = 0; k < 3; k++) { g.strokeStyle = graphite(0.22); g.save(); g.translate(R(-1.2, 1.2), R(-1.2, 1.2)); head(); g.stroke(); g.restore(); }
  g.strokeStyle = graphite(0.45); g.lineWidth = 1.3; g.save(); g.beginPath(); g.rect(cx - P.w * 0.1, cy - P.h * 0.4, 200, 300); g.clip(); head(); g.stroke(); g.restore();   // firmer on the shadow side and the jaw
  g.save(); g.beginPath(); g.rect(cx - 200, cy + P.h * 0.55, 400, 200); g.clip(); head(); g.stroke(); g.restore();
  if (!f.ears && P.hair !== 'hood') for (const sx of [-1, 1]) {
    const ex0 = cx + sx * P.w * 0.95, top = cy + P.h * (P.eyeY - 0.05), bot = cy + P.h * (P.nose + 0.05);
    g.fillStyle = graphite(sx > 0 ? 0.3 : 0.14);
    g.beginPath(); g.moveTo(ex0, top); g.bezierCurveTo(ex0 + sx * 20, top - 8, ex0 + sx * 22, bot - 6, ex0 + sx * 4, bot); g.closePath(); g.fill();
    g.strokeStyle = graphite(0.5); g.lineWidth = 1.1; g.stroke();
    g.strokeStyle = graphite(0.35); g.beginPath(); g.moveTo(ex0 + sx * 4, top + 6); g.bezierCurveTo(ex0 + sx * 14, top + 2, ex0 + sx * 14, bot - 12, ex0 + sx * 5, bot - 8); g.stroke();
  }

  // Eyes: sockets, almond shapes, irises with streaks, pupils, a catch-light, lids and lashes.
  const ey = cy + P.h * P.eyeY, ex = P.w * P.eyeGap;
  for (const sx of [-1, 1]) {
    const x = cx + sx * ex;
    const sock = g.createRadialGradient(x, ey - 3, 2, x, ey - 3, 22);
    sock.addColorStop(0, graphite(sx > 0 ? 0.32 : 0.22)); sock.addColorStop(1, graphite(0));
    g.fillStyle = sock; g.fillRect(x - 26, ey - 28, 52, 50);
    const ew = R(13, 16), eh = R(5.5, 7.5);
    g.save(); g.beginPath(); g.moveTo(x - ew, ey); g.quadraticCurveTo(x, ey - eh * 1.6, x + ew, ey); g.quadraticCurveTo(x, ey + eh * 1.1, x - ew, ey); g.closePath();
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(236,224,200,0.85)'; g.fill(); g.clip();
    g.globalCompositeOperation = 'multiply';
    const ix = x + R(-2, 2);
    g.fillStyle = graphite(0.45); g.beginPath(); g.arc(ix, ey, 6.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = graphite(0.5); g.lineWidth = 0.6;
    for (let k = 0; k < 18; k++) { const a = k * Math.PI / 9; g.beginPath(); g.moveTo(ix + Math.cos(a) * 2.5, ey + Math.sin(a) * 2.5); g.lineTo(ix + Math.cos(a) * 6.2, ey + Math.sin(a) * 6.2); g.stroke(); }
    g.fillStyle = graphite(0.95); g.beginPath(); g.arc(ix, ey, 2.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = graphite(0.25); g.fillRect(x - ew, ey - eh * 1.6, ew * 2, eh * 0.7);              // the lid's shadow on the eyeball
    g.restore();
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(250,244,230,0.95)'; g.beginPath(); g.arc(ix - 2, ey - 2, 1.4, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'multiply';
    g.strokeStyle = graphite(0.85); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - ew, ey); g.quadraticCurveTo(x, ey - eh * 1.6, x + ew, ey); g.stroke();       // upper lid
    g.strokeStyle = graphite(0.35); g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(x - ew * 0.9, ey + 1); g.quadraticCurveTo(x, ey + eh * 1.15, x + ew * 0.9, ey + 1); g.stroke();   // lower lid
    g.beginPath(); g.moveTo(x - ew * 0.95, ey - eh * 1.1); g.quadraticCurveTo(x, ey - eh * 2.5, x + ew * 0.9, ey - eh * 1.2); g.stroke(); // crease
    for (let k = 0; k < 7; k++) { const t = (k + 1) / 8, lx = x - ew + t * ew * 2, ly = ey - Math.sin(t * Math.PI) * eh * 1.55; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + sx * 1.5 + (t - 0.5) * 3, ly - 3); g.stroke(); }
    if (P.age > 0.55) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + sx * (ew + 2), ey + k * 3 - 2); g.lineTo(x + sx * (ew + 9), ey + k * 4 - 4); g.stroke(); }   // crow's feet
    // Brows: many short strokes.
    g.lineWidth = 1.1;
    const by = ey - eh * 3.1, angry = f.mean ? 4 : 0;
    for (let k = 0; k < 26 * P.brow; k++) {
      const t = rng(), bx = x - sx * ew * 1.15 + sx * t * ew * 2.4, byy = by - Math.sin(t * Math.PI) * 4 + (sx > 0 ? t : 1 - t) * angry + R(-2, 2);
      g.strokeStyle = graphite(R(0.35, 0.75)); g.beginPath(); g.moveTo(bx, byy + 2.5); g.lineTo(bx + sx * R(3, 6), byy - R(1, 3)); g.stroke();
    }
  }

  // The nose: a soft shadow down one side, nostrils, the tip catching the light.
  const ny = cy + P.h * P.nose, nw = P.w * 0.22;
  const ns = g.createLinearGradient(cx, ey, cx + nw * 1.6, ny);
  ns.addColorStop(0, graphite(0)); ns.addColorStop(0.6, graphite(0.22)); ns.addColorStop(1, graphite(0.05));
  g.fillStyle = ns; g.beginPath(); g.moveTo(cx + 3, ey + 4); g.quadraticCurveTo(cx + nw * 0.9, ny - 10, cx + nw * 1.2, ny + 4); g.lineTo(cx + 4, ny + 6); g.closePath(); g.fill();
  g.strokeStyle = graphite(0.55); g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(cx - nw * 1.05, ny - 2); g.quadraticCurveTo(cx - nw * 0.9, ny + 8, cx - nw * 0.35, ny + 6); g.stroke();
  g.beginPath(); g.moveTo(cx + nw * 1.05, ny - 2); g.quadraticCurveTo(cx + nw * 0.9, ny + 8, cx + nw * 0.35, ny + 6); g.stroke();
  for (const sx of [-1, 1]) { g.fillStyle = graphite(0.75); g.beginPath(); g.ellipse(cx + sx * nw * 0.45, ny + 4, 4.2, 2.2, sx * 0.4, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = graphite(0.3); g.beginPath(); g.moveTo(cx - 2, ey + 6); g.quadraticCurveTo(cx - 5, ny - 20, cx - 3, ny - 6); g.stroke();
  // Creases from the nose to the mouth (deeper with age).
  g.strokeStyle = graphite(0.2 + P.age * 0.35); g.lineWidth = 1.1;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * nw * 1.3, ny + 2); g.quadraticCurveTo(cx + sx * P.w * 0.42, cy + P.h * 0.48, cx + sx * P.w * 0.36, cy + P.h * 0.66); g.stroke(); }

  // The mouth: the philtrum, a darker upper lip, a lighter lower lip with its shadow underneath.
  const my = cy + P.h * P.mouthY, mw = P.w * P.mouthW, smile = f.grin ? 4 : f.mean ? -2 : 0;
  g.strokeStyle = graphite(0.3); g.lineWidth = 1;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * 3, ny + 9); g.lineTo(cx + sx * 4, my - 5); g.stroke(); }
  g.fillStyle = graphite(0.42); g.beginPath(); g.moveTo(cx - mw, my - smile); g.quadraticCurveTo(cx - mw * 0.4, my - 7, cx, my - 4); g.quadraticCurveTo(cx + mw * 0.4, my - 7, cx + mw, my - smile); g.quadraticCurveTo(cx, my + 1, cx - mw, my - smile); g.fill();
  g.strokeStyle = graphite(0.85); g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - mw, my - smile); g.quadraticCurveTo(cx, my + 2 + smile * 0.5, cx + mw, my - smile); g.stroke();
  const lip = g.createLinearGradient(cx, my, cx, my + 14); lip.addColorStop(0, graphite(0.12)); lip.addColorStop(1, graphite(0.3));
  g.fillStyle = lip; g.beginPath(); g.moveTo(cx - mw * 0.85, my); g.quadraticCurveTo(cx, my + 13, cx + mw * 0.85, my); g.fill();
  g.fillStyle = graphite(0.25); g.beginPath(); g.ellipse(cx, my + 17, mw * 0.5, 3.5, 0, 0, Math.PI * 2); g.fill();

  // Features of their people.
  g.strokeStyle = graphite(0.8); g.lineWidth = 1.5;
  if (f.ears && P.hair !== 'hood') for (const sx of [-1, 1]) {            // (a hood covers the ears)
    g.beginPath(); g.moveTo(cx + sx * P.w * 0.98, cy - 8); g.quadraticCurveTo(cx + sx * (P.w + 34), cy - 40, cx + sx * (P.w + 40), cy - 62); g.quadraticCurveTo(cx + sx * (P.w + 16), cy - 10, cx + sx * P.w * 0.96, cy + 22); g.stroke();
    g.save(); g.beginPath(); g.moveTo(cx + sx * P.w * 0.98, cy - 4); g.lineTo(cx + sx * (P.w + 34), cy - 52); g.lineTo(cx + sx * P.w * 0.98, cy + 18); g.clip();
    hatch(cx + sx * P.w - 30, cy - 70, cx + sx * P.w + 50, cy + 30, 1.2, 3, () => sx > 0 ? 0.6 : 0.3); g.restore();
  }
  if (f.horns) for (const sx of [-1, 1]) {
    for (let k = 0; k < 9; k++) {
      const t = k / 8, hx = cx + sx * (P.w * 0.45 + t * 50), hy = cy - P.h * 0.78 - t * 70 + t * t * 30, r = 11 * (1 - t) + 2;
      g.strokeStyle = graphite(0.55); g.beginPath(); g.arc(hx, hy, r, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
      if (k < 8) { const sh = g.createRadialGradient(hx + 4, hy, 1, hx + 4, hy, r + 3); sh.addColorStop(0, graphite(0.35)); sh.addColorStop(1, graphite(0)); g.fillStyle = sh; g.beginPath(); g.arc(hx, hy, r + 2, 0, Math.PI * 2); g.fill(); }
    }
  }
  if (f.tusks) for (const sx of [-1, 1]) {
    g.fillStyle = 'rgba(240,230,205,0.9)'; g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.moveTo(cx + sx * mw * 0.7, my + 2); g.quadraticCurveTo(cx + sx * mw * 0.95, my - 14, cx + sx * mw * 0.75, my - 26); g.lineTo(cx + sx * mw * 0.55, my + 2); g.fill();
    g.globalCompositeOperation = 'multiply'; g.strokeStyle = graphite(0.7); g.stroke();
  }
  if (f.scar) {
    g.strokeStyle = graphite(0.6); g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx + ex - 10, ey - 30); g.lineTo(cx + ex + 18, ey + 34); g.stroke();
    g.lineWidth = 1; for (let k = 0; k < 6; k++) { const t = k / 5, x = cx + ex - 10 + 28 * t, y = ey - 30 + 64 * t; g.beginPath(); g.moveTo(x - 5, y + 2); g.lineTo(x + 5, y - 2); g.stroke(); }
  }
  if (f.beard) {
    for (let k = 0; k < 520; k++) {
      const a = R(0.1, Math.PI - 0.1), r = R(0.55, 1.05), bx = cx - Math.cos(a) * P.w * 0.9 * r, by = cy + P.h * 0.35 + Math.sin(a) * P.h * 0.85 * r;
      if (Math.abs(bx - cx) < mw * 1.1 && by < my + 6 && by > my - 9) continue;      // keep the mouth clear
      g.strokeStyle = graphite(R(0.2, 0.6)); g.lineWidth = R(0.6, 1.2);
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + R(-3, 3), by + 6, bx + R(-4, 4), by + R(8, 16)); g.stroke();
    }
  }
  // Hair: hundreds of strands from the hairline, falling the way the style goes.
  if (P.hair === 'hood') {
    g.save(); g.beginPath(); g.moveTo(cx - P.w - 34, cy + P.h * 1.3); g.quadraticCurveTo(cx - P.w - 40, cy - P.h - 60, cx, cy - P.h - 48); g.quadraticCurveTo(cx + P.w + 40, cy - P.h - 60, cx + P.w + 34, cy + P.h * 1.3);
    g.lineTo(cx + P.w * 0.9, cy + P.h * 1.3); g.quadraticCurveTo(cx + P.w * 1.15, cy - P.h * 0.9, cx, cy - P.h * 1.05); g.quadraticCurveTo(cx - P.w * 1.15, cy - P.h * 0.9, cx - P.w * 0.9, cy + P.h * 1.3); g.closePath();
    g.fillStyle = graphite(0.35); g.fill(); g.clip(); hatch(cx - 120, cy - 150, cx + 120, cy + 140, 1.3, 2.6, (x) => 0.45 + (x - cx) / 160); g.restore();
    g.strokeStyle = graphite(0.6);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const x0 = cx + sx * (P.w * 1.05 + k * 9); g.beginPath(); g.moveTo(x0, cy - P.h * 0.9); g.quadraticCurveTo(x0 + sx * 10, cy, x0 + sx * 6, cy + P.h * 1.25); g.stroke(); }
    // The hood's shadow across the brow.
    const hs = g.createLinearGradient(cx, cy - P.h, cx, cy - P.h * 0.2); hs.addColorStop(0, graphite(0.5)); hs.addColorStop(1, graphite(0));
    g.fillStyle = hs; g.fillRect(cx - P.w, cy - P.h, P.w * 2, P.h * 0.8);
  } else if (P.hair !== 'bald') {
    // The mass: everything above a hairline that dips at the temples, a little outside the skull.
    const jag = Array.from({ length: 23 }, () => R(-0.05, 0.05));
    const hl = (t) => cy - P.h * (0.66 - 0.26 * t * t + jag[Math.round((t + 1) * 11)]);      // uneven, higher in the middle
    g.save();
    g.beginPath(); g.moveTo(cx - P.w * 1.06, cy - P.h * 0.2);
    for (let t = -1; t <= 1.001; t += 0.1) g.lineTo(cx + t * P.w * 0.98, hl(t));
    g.lineTo(cx + P.w * 1.06, cy - P.h * 0.2);
    g.bezierCurveTo(cx + P.w * 1.1, cy - P.h * 1.12, cx - P.w * 1.1, cy - P.h * 1.12, cx - P.w * 1.06, cy - P.h * 0.2);
    if (P.hair === 'long') { g.lineTo(cx - P.w * 1.15, cy + P.h * 1.1); g.lineTo(cx - P.w * 0.92, cy + P.h * 1.1); g.lineTo(cx - P.w * 0.95, cy - P.h * 0.2); }
    const hairTone = g.createLinearGradient(cx - P.w, cy - P.h, cx + P.w, cy);
    hairTone.addColorStop(0, graphite(0.1)); hairTone.addColorStop(1, graphite(0.28));
    g.fillStyle = hairTone; g.fill();
    g.restore();
    if (P.hair === 'long') for (const sx of [-1, 1]) {            // curtains of hair down both sides
      for (let k = 0; k < 160; k++) {
        const x0 = cx + sx * P.w * R(0.88, 1.12), y0 = cy - P.h * R(0.1, 0.5);
        g.strokeStyle = graphite(R(0.15, 0.5)); g.lineWidth = R(0.5, 1.1);
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + sx * R(2, 10), y0 + 60, x0 + sx * R(-4, 14), cy + P.h * R(0.8, 1.15)); g.stroke();
      }
    }
    const n = P.hair === 'long' ? 520 : 460;
    for (let k = 0; k < n; k++) {
      // From the crown down toward the hairline: strands lie on the head.
      const t = R(-1, 1), hx = cx + t * P.w * 0.25 + R(-6, 6), hy = cy - P.h * R(0.95, 1.05);
      let ex2 = cx + t * P.w * 1.0 + R(-4, 4), ey2 = hl(t) + R(-2, 6);
      if (P.hair === 'curly') { ex2 = cx + t * P.w * R(0.2, 1.0); ey2 = cy - P.h * R(0.6, 1.05); }
      else if (P.hair === 'swept') { ex2 += P.w * 0.25; ey2 -= R(0, 10); }
      g.strokeStyle = graphite(R(0.18, 0.62) + (t > 0.3 ? 0.12 : 0)); g.lineWidth = R(0.5, 1.2);
      g.beginPath(); g.moveTo(hx, hy);
      if (P.hair === 'curly') g.bezierCurveTo(hx + R(-10, 10), hy - R(2, 10), ex2 + R(-10, 10), ey2 + R(-6, 6), ex2, ey2);
      else g.quadraticCurveTo((hx + ex2) / 2 + R(-8, 8), (hy + ey2) / 2 - R(0, 10), ex2, ey2);
      g.stroke();
    }
  } else {
    g.strokeStyle = graphite(0.18); for (let k = 0; k < 40; k++) { const t = R(-0.9, 0.9); g.beginPath(); g.arc(cx + t * P.w * 0.6, cy - P.h * 0.75, R(10, 30), Math.PI * 1.1, Math.PI * 1.4); g.stroke(); }
  }
  g.restore();
}

export function wantedPoster(p, seed) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 720;
  const g = c.getContext('2d');
  parchment(g, 512, 720, seed);
  g.fillStyle = '#3a200c';
  g.textAlign = 'center';
  fitText(g, 'WANTED', 440, 108, { family: SERIF });
  g.fillText('WANTED', 256, 112);
  g.font = `italic 26px ${HAND}`;
  g.fillText(p.alive || 'Dead or Alive', 256, 150);

  // Picture frame
  g.strokeStyle = '#3a200c'; g.lineWidth = 4;
  g.strokeRect(76, 170, 360, 290);
  g.save(); g.beginPath(); g.rect(78, 172, 356, 286); g.clip();
  if (p.face) {
    sketchFace(g, 256, 300, seed * 7 + 3, p.face);
  } else {
    g.fillStyle = 'rgba(60,35,15,0.08)'; g.fillRect(78, 172, 356, 286);
    g.font = `italic 30px ${HAND}`; g.fillStyle = 'rgba(58,32,12,0.75)';
    g.fillText('No likeness', 256, 300);
    g.fillText('has ever been taken', 256, 338);
  }
  g.restore();
  if (p.face) { g.font = `italic 13px ${HAND}`; g.fillStyle = 'rgba(58,32,12,0.75)'; g.fillText('Likeness by the harbor guard\'s artist, from witness accounts', 256, 478); }

  g.fillStyle = '#2b1606';
  fitText(g, p.name.toUpperCase(), 440, 46, { family: SERIF });
  g.fillText(p.name.toUpperCase(), 256, 510);
  g.font = `22px ${HAND}`;
  let y = wrap(g, p.crime, 256, 545, 420, 27);
  g.font = `bold 20px ${HAND}`;
  const ry = Math.max(y + 2, 600);
  g.fillText('REWARD', 256, ry);
  fitText(g, p.reward, 430, p.big ? 54 : 42, { family: SERIF });
  g.fillStyle = p.big ? '#7a1408' : '#2b1606';
  g.fillText(p.reward, 256, ry + (p.big ? 50 : 42));
  g.font = `italic 16px ${HAND}`; g.fillStyle = '#4a2a10';
  g.fillText(p.by || 'By order of the Throne of the Sultanate', 256, 705);
  return c;
}

export function signBoard(title, subtitle, { bg = '#2d1d10', fg = '#f1d48a', w = 768, h = 192 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24);
  g.fillStyle = fg; g.textAlign = 'center';
  fitText(g, title, w - 80, subtitle ? 64 : 80, { family: SERIF });
  g.fillText(title, w / 2, subtitle ? h * 0.48 : h * 0.62);
  if (subtitle) {
    g.font = `italic 30px ${HAND}`;
    g.fillText(subtitle, w / 2, h * 0.8);
  }
  return c;
}

// A tall cloth banner with a simple emblem.
export function banner(color, emblem, seed) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 640);
  const rng = makeRng(seed);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(0,0,0,${range(rng, 0.02, 0.06)})`;
    g.fillRect(rng() * 256, rng() * 640, 2, range(rng, 4, 30));
  }
  g.fillStyle = '#e7c35a'; g.strokeStyle = '#e7c35a'; g.lineWidth = 10;
  g.fillRect(0, 0, 256, 18); g.fillRect(0, 560, 256, 12);
  // Pointed bottom
  g.clearRect(0, 600, 256, 40);
  g.fillStyle = color;
  g.beginPath(); g.moveTo(0, 600); g.lineTo(128, 640); g.lineTo(256, 600); g.fill();
  g.fillStyle = '#e7c35a';
  const cx = 128, cy = 280;
  g.beginPath();
  if (emblem === 'coin') {
    g.arc(cx, cy, 70, 0, Math.PI * 2); g.stroke();
    g.font = `bold 80px ${SERIF}`; g.textAlign = 'center'; g.fillText('¤', cx, cy + 28);
  } else if (emblem === 'anchor') {
    g.moveTo(cx, cy - 90); g.lineTo(cx, cy + 70); g.stroke();
    g.beginPath(); g.arc(cx, cy - 100, 18, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(cx - 50, cy - 50); g.lineTo(cx + 50, cy - 50); g.stroke();
    g.beginPath(); g.arc(cx, cy + 10, 65, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  } else if (emblem === 'sword') {
    g.moveTo(cx, cy - 120); g.lineTo(cx, cy + 90); g.stroke();
    g.beginPath(); g.moveTo(cx - 55, cy + 40); g.lineTo(cx + 55, cy + 40); g.stroke();
    g.beginPath(); g.moveTo(cx - 70, cy - 40); g.lineTo(cx + 70, cy + 120); g.moveTo(cx + 70, cy - 40); g.lineTo(cx - 70, cy + 120); g.stroke();
  } else if (emblem === 'crown') {
    g.moveTo(cx - 80, cy + 50); g.lineTo(cx - 80, cy - 40); g.lineTo(cx - 40, cy); g.lineTo(cx, cy - 70);
    g.lineTo(cx + 40, cy); g.lineTo(cx + 80, cy - 40); g.lineTo(cx + 80, cy + 50); g.closePath(); g.fill();
  } else if (emblem === 'flask') {
    g.moveTo(cx - 22, cy - 100); g.lineTo(cx - 22, cy - 30); g.lineTo(cx - 75, cy + 80); g.lineTo(cx + 75, cy + 80);
    g.lineTo(cx + 22, cy - 30); g.lineTo(cx + 22, cy - 100); g.stroke();
    g.beginPath(); g.moveTo(cx - 55, cy + 40); g.lineTo(cx + 55, cy + 40); g.stroke();
  }
  return c;
}

// A soft round glow, for lights, flames and ward-orbs.
export function glowTextureCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

export function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A flat readable board in the world, facing direction ry (0 = facing the sea, -z).
export function placeReadable(scene, canvas, { x, y, z, w, h, ry = 0, title, double = false, readable = true }) {
  const mat = new THREE.MeshStandardMaterial({ map: canvasTexture(canvas), roughness: 0.9, side: double ? THREE.DoubleSide : THREE.FrontSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry + Math.PI;     // planes face +z; turn to face -z (the sea) at ry = 0
  m.receiveShadow = true;
  scene.add(m);
  if (readable) readables.push({ pos: m.position.clone(), title, canvas, mesh: m });
  return m;
}
