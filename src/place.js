// Which city you're in. The page builds only that city (a different place means a reload), so
// everything that is city-specific asks here. 'sultans_rest' (Chapter One) or 'meridia' (Chapter Two).
import { state, save } from './game/state.js';

// Watching a scene on its own (http://localhost:8770/?scene=crossing: the user wanted to see the crossing
// without playing to the end of Chapter One). It needs Sultan's Rest's harbor; nothing is saved.
let scene = null;
try { scene = new URLSearchParams(location.search).get('scene'); } catch { /* fine */ }
export const PREVIEW = scene === 'crossing' ? scene : null;
export const PLACE = PREVIEW ? 'sultans_rest' : (state.place || 'sultans_rest');
export const inMeridia = PLACE === 'meridia';
export const PLACE_NAMES = { sultans_rest: "Sultan's Rest", meridia: 'Meridia' };

// Sail to another city: saved, then the page is rebuilt there (you arrive at its harbor).
export function travelTo(place) {
  state.place = place;
  state.arrived = place;
  save();
  try { sessionStorage.setItem('lavine-go', '1'); } catch { /* fine */ }
  location.reload();
}

// The voyage between the cities (2026-11-04, the user: 'Meridia is pretty far away, you're hugging the coast going
// around; more like some months'). About two months each way; the crew and provisions cost gold; your Sultan's Rest
// store stays open under its staff (half its usual takings, after their wages); contracts can lapse at sea.
export const VOYAGE_DAYS = 60, CREW_PAY = 300;
export async function voyage(to, { pay = CREW_PAY } = {}) {
  const { RANKS, note } = await import('./game/state.js');
  state.gold -= pay; state.spent = (state.spent || 0) + pay;
  // Your best store so far (a Captain still owns the store and its add-on; the rank's own income is 0).
  const daily = Math.max(0, ...RANKS.slice(0, (state.rank || 0) + 1).map(r => r.income || 0));
  const kept = Math.round(daily * VOYAGE_DAYS * 0.5);
  state.day += VOYAGE_DAYS; state.minute = 9 * 60;
  if (kept > 0) { state.gold += kept; state.earned = (state.earned || 0) + kept; note(`"${state.shopName}" took ${kept} gold while you were at sea`); }
  const { checkContracts } = await import('./game/contracts.js');
  checkContracts();
  note(`Sailed to ${PLACE_NAMES[to]} (${VOYAGE_DAYS} days along the coast${pay ? `, ${pay} gold for the crew` : ''})`);
  save();
  return kept;
}
// The words on the black screen while you sail (DRAFT by Claude).
export function voyageText(to, kept) {
  const where = to === 'meridia' ? 'west along the coast, to Meridia' : "east along the coast, to the violet lights of Sultan's Rest";
  return `Two months hugging the shore, ${where}...` + (kept > 0 ? `\n\nYour staff kept "${state.shopName}" open while you were away: +${kept} gold.` : '');
}
