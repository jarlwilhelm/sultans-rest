// The character creator: a turning 3D preview of you, and your choices beside it:
// name, people (race), body and outfit, skin, hair and clothing colour.
// Saved as state.look; you see yourself in third person (V).
import * as THREE from 'three';
import { makeCharacter, BODIES, HAIRS } from './characters.js';
import { RACES } from './people.js';
import { state, save } from './game/state.js';

const RACE_LIST = [['human', 'Human'], ['elf', 'Elf'], ['dwarf', 'Dwarf'], ['halfling', 'Halfling'], ['gnome', 'Gnome'], ['tiefling', 'Tiefling'], ['orc', 'Orc'], ['dragonborn', 'Dragonborn']];
const HUES = [0, 0.08, 0.16, 0.3, 0.45, 0.58, 0.7, 0.8, 0.9];
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function defaultLook() {
  return { race: 'human', base: 'men_Adventurer', skin: RACES.human.skin[2], hair: HAIRS[1], hue: 0 };
}

export function openCreator() {
  return new Promise((resolve) => {
    const look = { ...defaultLook(), ...(state.look || {}) };
    let name = state.name || '';
    const box = el('div', 'creator');
    const view = el('div', 'cview');
    const form = el('div', 'cform');
    box.append(view, form);
    const host = document.getElementById('creator');
    host.replaceChildren(box);
    host.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();

    // The preview: its own little scene and renderer.
    const W = 380, H = 520;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff2dc', '#7a5a3a', 1.6));
    const key = new THREE.DirectionalLight('#ffe2b0', 2.2); key.position.set(2, 3, 3); scene.add(key);
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
    cam.position.set(0, 1.15, 4.2); cam.lookAt(0, 0.95, 0);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.08, 40), new THREE.MeshStandardMaterial({ color: '#d8c49a', roughness: 0.8 }));
    plinth.position.y = -0.04; scene.add(plinth);
    let model = null, spin = 0, running = true, last = performance.now();
    function rebuild() {
      if (model) scene.remove(model);
      const r = RACES[look.race];
      model = makeCharacter({ race: look.race, role: 'traveler', height: r.h, girth: r.girth, skin: look.skin, look }, Math.random);
      model.userData.play('cheer', 0);
      scene.add(model);
    }
    function frame(now) {
      if (!running) return;
      const dt = (now - last) / 1000; last = now;
      spin += dt * 0.5;
      if (model) { model.rotation.y = spin; model.userData.mixer.update(dt); }
      renderer.render(scene, cam);
      requestAnimationFrame(frame);
    }

    // The choices.
    form.append(el('div', 'who', 'Who are you?'));
    const nameIn = el('input', 'answer'); nameIn.placeholder = 'Your name'; nameIn.value = name; nameIn.maxLength = 24;
    nameIn.addEventListener('keydown', (e) => e.stopPropagation());
    nameIn.addEventListener('input', () => { name = nameIn.value; });
    form.append(nameIn);
    function row(title, items, isOn, onPick, swatch) {
      form.append(el('h3', '', title));
      const r = el('div', 'crow');
      const btns = items.map(([val, label]) => {
        const b = el('button', 'cbtn' + (swatch ? ' sw' : ''), swatch ? '' : label);
        if (swatch) { b.style.background = swatch(val); b.title = label || ''; }
        b.onclick = () => { onPick(val); refresh(); rebuild(); };
        r.append(b);
        return [b, val];
      });
      form.append(r);
      return () => btns.forEach(([b, v]) => b.classList.toggle('on', isOn(v)));
    }
    const refreshers = [];
    refreshers.push(row('Your people', RACE_LIST, v => look.race === v, v => { look.race = v; look.skin = RACES[v].skin[Math.min(1, RACES[v].skin.length - 1)]; skinRow(); }));
    refreshers.push(row('Body and outfit', BODIES, v => look.base === v, v => { look.base = v; }));
    const skinHost = el('div');
    form.append(skinHost);
    function skinRow() {
      skinHost.replaceChildren(el('h3', '', 'Skin'));
      const r = el('div', 'crow');
      for (const c of RACES[look.race].skin) {
        const b = el('button', 'cbtn sw' + (look.skin === c ? ' on' : '')); b.style.background = c;
        b.onclick = () => { look.skin = c; skinRow(); rebuild(); };
        r.append(b);
      }
      skinHost.append(r);
    }
    skinRow();
    refreshers.push(row('Hair', HAIRS.map(h => [h, '']), v => look.hair === v, v => { look.hair = v; }, v => v));
    refreshers.push(row('Clothing colour', HUES.map(h => [h, '']), v => look.hue === v, v => { look.hue = v; }, v => `hsl(${Math.round(v * 360 + 100) % 360}, 45%, 45%)`));
    function refresh() { refreshers.forEach(f => f()); }
    refresh();
    const done = el('button', 'opt leave');
    done.append(el('span', 'num', '↵'), el('span', '', 'This is me'));
    done.onclick = () => {
      running = false;
      state.name = (name || 'Traveler').trim().slice(0, 24);
      state.race = RACE_LIST.find(([k]) => k === look.race)[1];
      state.look = look;
      save();
      renderer.dispose();
      host.classList.add('hidden');
      host.replaceChildren();
      dispatchEvent(new CustomEvent('lavine:look'));
      resolve(look);
    };
    form.append(done);
    rebuild();
    requestAnimationFrame(frame);
    setTimeout(() => nameIn.focus(), 50);
  });
}
