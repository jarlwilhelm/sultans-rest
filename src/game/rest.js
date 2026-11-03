// Sleep. You have to: after a long day you get tired, then your eyes start to close and your
// feet drag, and if you push on past the small hours you collapse where you stand and wake up
// at Ale's house with a lighter purse. Sleep in Ale's bed (free) or at the Salted Kraken (5 gold).
import { state, save, note } from './state.js';
import { toast, updateStatus } from './ui.js';

const TIRED = 16 * 60, VERY = 19 * 60, COLLAPSE = 21 * 60;   // minutes awake

export function fade(text, then) {
  const f = document.getElementById('fade');
  f.textContent = text || '';
  f.classList.add('on');
  setTimeout(() => { then?.(); setTimeout(() => f.classList.remove('on'), 900); }, 1300);
}

// Sleep until 7 in the morning (the next day if it's before midnight).
export function sleepUntilMorning(where, onNewDay) {
  const late = state.minute >= 18 * 60 || state.minute < 6 * 60 || (state.awake || 0) > 12 * 60;
  if (!late) { toast('You\'re not tired yet. Come back in the evening.'); return false; }
  fade(where === 'inn' ? 'You sleep at the Salted Kraken...' : 'You sleep in Ale\'s bed...', () => {
    if (state.minute >= 6 * 60) { state.day++; onNewDay?.(); }
    state.minute = 7 * 60;
    state.awake = 0;
    state.flags.warnedTired = false;
    save(); updateStatus();
    toast(`Day ${state.day}. Morning, and the gulls are already loud.`, 4000);
  });
  return true;
}

// Called every frame while time is passing. Returns how fast you can walk (1 = normal).
export function tiredness(dt, minutesPassed, onCollapse) {
  state.awake = (state.awake || 0) + minutesPassed;
  const v = document.getElementById('tired');
  const a = state.awake;
  if (a > TIRED && !state.flags.warnedTired) {
    state.flags.warnedTired = true;
    toast('You\'re getting tired. Find a bed: Ale\'s house, or the Salted Kraken.', 6000);
  }
  const k = Math.max(0, Math.min(1, (a - VERY) / (COLLAPSE - VERY)));
  v.style.opacity = String(k * 0.85 * (0.85 + 0.15 * Math.sin(performance.now() / 700)));
  if (a > COLLAPSE) {
    state.awake = 0;
    state.flags.warnedTired = false;
    const lost = Math.floor(state.gold * 0.15);
    fade('Your legs give out...', () => {
      state.gold -= lost;
      if (state.minute >= 10 * 60) state.day++;
      state.minute = 10 * 60;
      note(`Collapsed in the street; lost ${lost} gold`);
      save(); updateStatus();
      onCollapse?.();
      toast(lost ? `You wake at Ale's house, aching. Your purse is ${lost} gold lighter.` : 'You wake at Ale\'s house, aching. Someone carried you home.', 7000);
    });
    return 0;
  }
  return a > VERY ? 1 - 0.45 * k : 1;
}
