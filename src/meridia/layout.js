// Meridia's ground plan (Chapter Two): the Coastal Republic's capital, green and stone.
// The harbor and the working district are OUTSIDE the walls (the user's call): quay, piers, warehouses,
// the customs house, the inn where you first stay. Inland, the city climbs a hill inside three ring walls,
// each ring higher than the last (like a walled city of terraces):
//   outer ring (between the outer and middle walls): the poorer streets, small houses;
//   middle ring: the market, the Exchange, taverns, homes;
//   inner ring: the Republic Hall (Arthur works there) and the wealthy houses.
// Every wall has one gate, on the avenue that runs straight up from the Grand Pier. The inner gate opens only
// for proof of standing: 20,000 gold shown, noble papers, or a pass.
// Same axes as Sultan's Rest: the sea is south (z < 0), +z is inland.
import { fbm, clamp, smooth } from '../noise.js';

export const C = { x: 0, z: 250 };                    // the hilltop: the middle of the rings
export const R_OUT = 170, R_MID = 115, R_IN = 60;     // wall radii
export const GATE_HALF = 5.5;                         // half the width of each gate (on the avenue, x = 0)
export const RAMP_HALF = 6.5, RAMP_LEN = 24;            // the ramp up to each inner gate: half its width, its length
export const QUAY_Y = 1.5, QUAY_DEPTH = 34, HALF = 210;
export const PIERS = [
  { x: -120, w: 6, z0: -44 },
  { x: -60, w: 6, z0: -50 },
  { x: 0, w: 11, z0: -62 },
  { x: 60, w: 6, z0: -50 },
  { x: 120, w: 6, z0: -44 },
];
const lerp = (a, b, t) => a + (b - a) * t;
export const ringOf = (x, z) => { const r = Math.hypot(x - C.x, z - C.z); return r <= R_IN ? 'inner' : r <= R_MID ? 'middle' : r <= R_OUT ? 'outer' : 'harbor'; };

// The terrace height at distance r from the hilltop (inside the walls).
function terrace(r) {
  if (r <= R_IN) return 24 + (R_IN - r) * 0.02;
  if (r <= R_MID) return 14 + (R_MID - r) / (R_MID - R_IN) * 4;
  return 6 + (R_OUT - r) / (R_OUT - R_MID) * 4;
}
// Outside the walls: the harbor, the working district, green hills around.
function outside(x, z) {
  const ax = Math.abs(x);
  let h;
  if (ax <= HALF) {
    if (z < 0) return -4;
    if (z < QUAY_DEPTH) h = QUAY_Y;
    else h = QUAY_Y + (z - QUAY_DEPTH) * 0.1 + (fbm(x * 0.02, z * 0.02) - 0.5) * 1.5 * smooth(QUAY_DEPTH, 70, z);
  } else {
    const beach = clamp(-4 + (z + 16) * 0.35, -4, QUAY_Y);
    h = z < QUAY_DEPTH ? beach : QUAY_Y + (z - QUAY_DEPTH) * 0.1;
    h += (fbm(x * 0.02, z * 0.02) - 0.5) * 3 * smooth(-5, 40, z);
  }
  // Green hills rise around the city.
  h += smooth(230, 320, ax) * (10 + fbm(x * 0.02, z * 0.02) * 18);
  h += smooth(380, 460, z) * (8 + fbm(x * 0.025, z * 0.025) * 16);
  return h;
}
export function groundHeight(x, z) {
  const r = Math.hypot(x - C.x, z - C.z);
  let h = r <= R_OUT ? terrace(r) : outside(x, z);
  // Just outside the outer wall the land meets the terrace (no cliff).
  if (r > R_OUT && r < R_OUT + 40) h = lerp(terrace(R_OUT), h, smooth(R_OUT, R_OUT + 40, r));
  // Ramps up to the gates (on the avenue, south of the hilltop): they climb before each gate, between stone side
  // walls (city.js), and the road runs level through the gate itself (2026-11-04, the user: 'a door, not the floor
  // rising up').
  if (Math.abs(x) < RAMP_HALF && z < C.z) {
    for (const R of [R_MID, R_IN]) {
      if (r > R - 4 && r < R + RAMP_LEN) h = lerp(terrace(R + RAMP_LEN), terrace(R - 4), smooth(R + RAMP_LEN, R + 3, r));
    }
  }
  return h;
}
// Cobbles: the quay, the avenue up from the harbor, and every street inside the walls (the user's call, 2026-11-04).
export const paved = (x, z) => (Math.abs(x) <= HALF && z >= 0 && z < QUAY_DEPTH) || (Math.abs(x) < 6 && z >= QUAY_DEPTH && z < C.z)
  || Math.hypot(x - C.x, z - C.z) < R_OUT + 1.5;

// May you stand here? (The walls, except at their gates; the inner gate only with proof of standing.)
export function wallBlocks(x, z, innerOpen) {
  const r = Math.hypot(x - C.x, z - C.z);
  for (const R of [R_OUT, R_MID, R_IN]) {
    if (Math.abs(r - R) < 2.2) {
      const gate = Math.abs(x) < GATE_HALF - 0.6 && z < C.z;
      if (!gate) return true;
      if (R === R_IN && !innerOpen) return true;
    }
  }
  return false;
}
export const inBounds = (x, z) => Math.abs(x) < 330 && z < 440 && z > -72;
export const onPierM = (x, z) => PIERS.some(p => Math.abs(x - p.x) < p.w / 2 && z <= 0.5 && z >= p.z0);
