// The wardrobe screen: a turning preview of you, and the items beside it. Click an item to try it on
// in the preview; Wear or Buy to keep it. Used three ways:
//   'wardrobe' (Ale's house): what you own, plus what's still out there to earn;
//   'tailor': outfits, dyes, hats and things to carry, for gold;  'barber': hair colour and beard.
import * as THREE from 'three';
import { makeCharacter } from './characters.js';
import { RACES } from './people.js';
import { state, level } from './game/state.js';
import { ITEMS, owned, equipped, buy, wear } from './game/items.js';
import { updateStatus } from './game/ui.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const SECTIONS = { base: 'Outfit', hue: 'Clothing colour', hat: 'Hat', held: 'In your hand', hair: 'Hair colour', beard: 'Beard' };

export function openWardrobe(mode = 'wardrobe') {
  return new Promise((resolve) => {
    const host = document.getElementById('creator');
    if (document.pointerLockElement) document.exitPointerLock();
    const box = el('div', 'creator');
    const view = el('div', 'cview'), form = el('div', 'cform');
    box.append(view, form);
    host.replaceChildren(box);
    host.classList.remove('hidden');

    const W = 380, H = 520;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace;
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff2dc', '#7a5a3a', 1.6));
    const key = new THREE.DirectionalLight('#ffe2b0', 2.2); key.position.set(2, 3, 3); scene.add(key);
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50); cam.position.set(0, 1.15, 4.2); cam.lookAt(0, 0.95, 0);
    let model = null, spin = 0, running = true, last = performance.now();
    let trying = { ...state.look };
    function rebuild() {
      if (model) scene.remove(model);
      const r = RACES[trying.race] || RACES.human;
      model = makeCharacter({ race: trying.race, role: 'traveler', height: r.h, girth: r.girth, skin: trying.skin, look: trying }, Math.random);
      scene.add(model);
    }
    (function frame(now) {
      if (!running) return;
      const dt = (now - last) / 1000; last = now; spin += dt * 0.5;
      if (model) { model.rotation.y = spin; model.userData.mixer.update(dt); }
      renderer.render(scene, cam);
      requestAnimationFrame(frame);
    })(last);

    function render() {
      form.replaceChildren();
      form.append(el('div', 'who', { wardrobe: "Ale's wardrobe", tailor: 'The tailor', barber: 'The barber' }[mode]));
      form.append(el('p', 'small-note', mode === 'wardrobe' ? 'Click to try on; Wear to keep. Grey things are still out there to earn.' : `Click to try on before you pay. You have ${state.gold} gold.`));
      const slots = mode === 'barber' ? ['hair', 'beard'] : ['base', 'hue', 'hat', 'held'];
      for (const slot of slots) {
        form.append(el('h3', '', SECTIONS[slot]));
        const list = el('div', 'wlist');
        for (const [id, it] of Object.entries(ITEMS)) {
          if (it.slot !== slot) continue;
          const mine = owned(id), on = equipped(id);
          if (mode === 'wardrobe' && !mine && it.how === 'buy') continue;              // the shops sell those
          if (mode === 'wardrobe' && it.how === 'barber') continue;
          if (mode === 'tailor' && it.how !== 'buy') continue;
          const row = el('div', 'wrow' + (on ? ' on' : ''));
          const locked = (it.how === 'story' || it.how === 'special') && !mine;
          const name = el('span', 'wname', locked ? `${it.name} — ${it.hint}` : it.name);
          if (locked) row.classList.add('locked');
          if (it.how === 'special') name.prepend(el('span', 'special', '★ '));
          row.append(name);
          if (slot === 'hue' && it.value != null) { const sw = el('span', 'swatch'); sw.style.background = `hsl(${Math.round(it.value * 360 + 100) % 360}, 45%, 45%)`; row.prepend(sw); }
          if (slot === 'hair') { const sw = el('span', 'swatch'); sw.style.background = it.value; row.prepend(sw); }
          if (!locked) row.onclick = () => { trying = { ...trying, [slot]: it.value }; rebuild(); };
          let btn = null;
          if (on) row.append(el('span', 'wtag', 'Wearing'));
          else if (mine) { btn = el('button', 'small', 'Wear'); btn.onclick = (e) => { e.stopPropagation(); wear(id); trying = { ...state.look }; render(); rebuild(); }; }
          else if (it.how === 'buy' || it.how === 'barber') {
            const lvOk = level() >= (it.level || 1);
            btn = el('button', 'small', lvOk ? `Buy ${it.price} g` : `Level ${it.level}`);
            btn.disabled = !lvOk || state.gold < it.price;
            btn.onclick = (e) => { e.stopPropagation(); const err = buy(id); if (!err) { wear(id); trying = { ...state.look }; updateStatus(); } render(); rebuild(); };
          }
          if (btn) row.append(btn);
          list.append(row);
        }
        form.append(list);
      }
      const done = el('button', 'opt leave');
      done.append(el('span', 'num', 'Esc'), el('span', '', 'Done'));
      done.onclick = close;
      form.append(done);
    }
    function close() {
      running = false;
      removeEventListener('keydown', onKey, true);
      renderer.dispose();
      host.classList.add('hidden'); host.replaceChildren();
      document.getElementById('resume').classList.remove('hidden');
      resolve();
    }
    const onKey = (e) => { if (e.code === 'Escape') { e.stopPropagation(); close(); } };
    addEventListener('keydown', onKey, true);
    render();
    rebuild();
  });
}
