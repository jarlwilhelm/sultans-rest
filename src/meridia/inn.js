// The room at the Brine & Barrel, by the week (2026-11-04, the user: 'you shouldn't be allowed to sleep until you
// pay the weekly gold, and there should be a timer that goes with the world's clock to equal a week').
// A week = 7 days of game time from the minute you pay; paying again adds a week to what's left.
import { state } from '../game/state.js';

export const WEEK = 7 * 24 * 60;
const now = () => state.day * 1440 + state.minute;
// When your room runs out, in game minutes since day 0 (old saves kept only a day number: innUntil).
export function innEnd() {
  const m = state.mer || {};
  if (m.innEnd == null && m.innUntil) m.innEnd = (m.innUntil + 1) * 1440 + 7 * 60;
  return m.innEnd || 0;
}
export const innLeft = () => Math.max(0, innEnd() - now());
export const innPaid = () => innLeft() > 0;
export function payWeek() { (state.mer ||= {}).innEnd = Math.max(innEnd(), now()) + WEEK; }
export function leftText(min = innLeft()) {
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), mm = min % 60;
  if (d > 0) return `${d} day${d === 1 ? '' : 's'} ${h} hour${h === 1 ? '' : 's'}`;
  return h > 0 ? `${h} hour${h === 1 ? '' : 's'} ${mm} min` : `${mm} min`;
}
