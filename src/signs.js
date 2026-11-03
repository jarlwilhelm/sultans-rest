// Everything with writing on it: guild signs, banners, plaques and wanted posters.
// Each is drawn on a canvas, used as a texture in the world and shown big when you read it.
import * as THREE from 'three';
import { makeRng, range } from './noise.js';

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

// A face sketched in ink, different for every seed, so each poster has its own outlaw.
function sketchFace(g, cx, cy, seed, f) {
  const rng = makeRng(seed);
  g.save();
  g.strokeStyle = 'rgba(40,25,10,0.85)';
  g.fillStyle = 'rgba(60,35,15,0.10)';
  g.lineWidth = 3;
  const w = range(rng, 78, 100), h = range(rng, 100, 122);
  // Head
  g.beginPath(); g.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // Shoulders
  g.beginPath(); g.moveTo(cx - 175, cy + 250); g.quadraticCurveTo(cx - 150, cy + h + 25, cx, cy + h + 20);
  g.quadraticCurveTo(cx + 150, cy + h + 25, cx + 175, cy + 250); g.stroke();
  // Eyes, brows, nose, mouth
  const ey = cy - h * 0.12, ex = w * 0.42;
  for (const sx of [-1, 1]) {
    g.beginPath(); g.ellipse(cx + sx * ex, ey, 13, 7, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx + sx * ex, ey, 4, 0, Math.PI * 2); g.fillStyle = 'rgba(30,20,10,0.9)'; g.fill();
    g.beginPath(); g.moveTo(cx + sx * (ex - 20), ey - 22 - rng() * 6); g.lineTo(cx + sx * (ex + 18), ey - 18 + (f.mean ? -10 : 0) * sx * -1); g.stroke();
  }
  g.beginPath(); g.moveTo(cx, ey + 5); g.lineTo(cx - 10, cy + h * 0.3); g.lineTo(cx + 6, cy + h * 0.32); g.stroke();
  g.beginPath(); g.moveTo(cx - 28, cy + h * 0.55); g.quadraticCurveTo(cx, cy + h * (0.55 + (f.grin ? 0.12 : -0.04)), cx + 28, cy + h * 0.55); g.stroke();
  // Race features
  if (f.horns) {
    for (const sx of [-1, 1]) {
      g.beginPath(); g.moveTo(cx + sx * w * 0.5, cy - h * 0.75);
      g.quadraticCurveTo(cx + sx * (w + 40), cy - h - 30, cx + sx * (w + 10), cy - h - 75); g.stroke();
    }
  }
  if (f.ears) {
    for (const sx of [-1, 1]) {
      g.beginPath(); g.moveTo(cx + sx * w * 0.95, cy - 10); g.lineTo(cx + sx * (w + 45), cy - 55); g.lineTo(cx + sx * w * 0.97, cy + 20); g.stroke();
    }
  }
  if (f.tusks) {
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * 20, cy + h * 0.55); g.lineTo(cx + sx * 26, cy + h * 0.35); g.stroke(); }
  }
  if (f.beard) {
    g.beginPath(); g.moveTo(cx - w * 0.8, cy + h * 0.2);
    g.quadraticCurveTo(cx, cy + h * 1.9, cx + w * 0.8, cy + h * 0.2);
    g.fillStyle = 'rgba(40,25,10,0.25)'; g.fill(); g.stroke();
  }
  if (f.scar) { g.beginPath(); g.moveTo(cx + 15, ey - 35); g.lineTo(cx + 55, ey + 40); g.stroke(); }
  if (f.hood) {
    g.beginPath(); g.moveTo(cx - w - 20, cy + h); g.quadraticCurveTo(cx - w - 30, cy - h - 50, cx, cy - h - 40);
    g.quadraticCurveTo(cx + w + 30, cy - h - 50, cx + w + 20, cy + h); g.stroke();
  }
  // Hatching for shadow
  g.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) {
    const y = cy - h * 0.6 + i * 12;
    g.beginPath(); g.moveTo(cx + w * 0.55, y); g.lineTo(cx + w * 0.85, y + 18); g.stroke();
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
