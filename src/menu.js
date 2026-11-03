// The title menu on the opening screen: Continue, New Game, Load Game, Options.
// Saves are the three slots in game/state.js; picking another slot reloads the page into it.
import { state, slot, SLOTS, slotSummary, useSlot, deleteSlot } from './game/state.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const ago = (t) => {
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 60 * 24 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const describe = (s) => `${s.name}${s.race ? ', ' + s.race : ''} · Level ${s.level} · ${s.rank} · Day ${s.day}`;

export function titleMenu({ onPlay, fx, sound }) {
  const box = document.getElementById('menu');
  const go = (() => { try { const g = sessionStorage.getItem('lavine-go'); sessionStorage.removeItem('lavine-go'); return !!g; } catch { return false; } })();
  const button = (label, sub, onClick, cls = '') => {
    const b = el('button', 'mbtn ' + cls);
    b.append(el('span', 'mlabel', label));
    if (sub) b.append(el('span', 'msub', sub));
    b.onclick = (e) => { e.stopPropagation(); onClick(); };
    return b;
  };
  const here = slotSummary(slot);

  // Just picked a slot (New Game / Load): one click to begin, which also lets the game take the mouse.
  if (go) {
    box.replaceChildren(button(state.flags.intro ? 'Enter Sultan\'s Rest' : 'Begin your story', `Slot ${slot}${here ? ' · ' + describe(here) : ' · a new game'}`, onPlay, 'primary'));
    return;
  }

  function main() {
    const items = [];
    if (here?.started) items.push(button('Continue', `Slot ${slot} · ${describe(here)} · saved ${ago(here.savedAt)}`, onPlay, 'primary'));
    items.push(button('New Game', 'Start fresh in one of three slots', () => slots('new')));
    if ([1, 2, 3].some(n => slotSummary(n))) items.push(button('Load Game', 'Pick up another saved game', () => slots('load')));
    items.push(button('Options', 'Graphics, sound and music', options));
    box.replaceChildren(...items);
  }

  function slots(mode) {
    const list = [el('div', 'mtitle', mode === 'new' ? 'New game: choose a slot' : 'Load a game')];
    for (let n = 1; n <= SLOTS; n++) {
      const s = slotSummary(n);
      if (mode === 'load' && !s) continue;
      const sub = s ? `${describe(s)} · saved ${ago(s.savedAt)}` : 'Empty';
      list.push(button(`Slot ${n}${n === slot ? ' (last played)' : ''}`, sub, () => {
        if (mode === 'load') return useSlot(n);
        if (!s) return useSlot(n, { wipe: true });
        // Starting over a saved game: ask first.
        box.replaceChildren(el('div', 'mtitle', `Slot ${n} has ${s.name}'s game (level ${s.level}). Start a new game over it?`),
          button('Yes, erase it and start fresh', 'This cannot be undone', () => useSlot(n, { wipe: true }), 'danger'),
          button('No, go back', '', () => slots(mode)));
      }));
      if (mode === 'load' && s) {
        const del = button('Delete', '', () => {
          box.replaceChildren(el('div', 'mtitle', `Delete ${s.name}'s game in Slot ${n}?`),
            button('Yes, delete it', 'This cannot be undone', () => { deleteSlot(n); if (n === slot) location.reload(); else slots('load'); }, 'danger'),
            button('No, keep it', '', () => slots('load')));
        }, 'small');
        list.push(del);
      }
    }
    list.push(button('Back', '', main));
    box.replaceChildren(...list);
  }

  function options() {
    const q = ['Low (fastest)', 'Medium (glow)', 'High (glow + soft shadows)'];
    const vols = [['Off', 0], ['Quiet', 0.08], ['Normal', 0.18], ['Loud', 0.35]];
    const stored = () => { try { const v = localStorage.getItem('lavine-music'); return v != null ? +v : 0.18; } catch { return 0.18; } };
    const vol = () => (vols.find(v => Math.abs(v[1] - (sound.audio ? sound.audio.volume : stored())) < 0.01) || vols[2])[0];
    box.replaceChildren(el('div', 'mtitle', 'Options'),
      button(`Graphics: ${q[fx.quality]}`, 'Lower is smoother on slower computers', () => { fx.quality = (fx.quality + 2) % 3; try { localStorage.setItem('lavine-graphics', String(fx.quality)); } catch { /* fine */ } options(); }),
      button(`Sound: ${sound.muted ? 'off' : 'on'}`, 'Waves, wind, the crowd (N in game)', () => { sound.toggle(); options(); }),
      button(`Music: ${vol()}`, 'Quiet desert music', () => {
        const cur = vols.findIndex(v => v[0] === vol()); const nx = vols[(cur + 1) % vols.length];
        sound.musicVolume = nx[1];
        if (sound.audio) sound.audio.volume = nx[1];
        try { localStorage.setItem('lavine-music', String(nx[1])); } catch { /* fine */ }
        options();
      }),
      button('Back', '', main));
  }

  main();
}
