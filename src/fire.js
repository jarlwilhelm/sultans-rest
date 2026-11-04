// Fire: flames that flicker and lick upward (three layers: a red-orange body, a yellow heart, a white-hot core),
// sparks rising from the bigger ones, and real light. Real lights are expensive, so a few of them follow you:
// each moment they sit on the fires and lanterns nearest to you (lights.update), brighter at night.
import * as THREE from 'three';

const fires = [];            // { x, y, z, size, sprites, sparks, strength, phase, night }

// A teardrop of flame, white at the base fading through yellow and orange to nothing at the tip.
function flameTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 100, 2, 32, 82, 60);
  grad.addColorStop(0, 'rgba(255,255,240,1)'); grad.addColorStop(0.25, 'rgba(255,220,120,0.95)');
  grad.addColorStop(0.55, 'rgba(255,140,40,0.7)'); grad.addColorStop(0.85, 'rgba(200,60,10,0.25)'); grad.addColorStop(1, 'rgba(120,20,0,0)');
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(52, 50, 62, 82, 52, 108); g.quadraticCurveTo(32, 128, 12, 108); g.bezierCurveTo(2, 82, 12, 50, 32, 4); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const tex = flameTexture();
const LAYERS = [['#ff7a2a', 1.0, 0.9], ['#ffc14a', 0.7, 1.0], ['#fff2c8', 0.38, 1.0]];   // colour, size, opacity
const sparkMat = new THREE.PointsMaterial({ color: '#ffb257', size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

// A fire at (x, y, z) (the base of the flame). size ~ metres tall. night: only lit after dark (lanterns).
// light: where its real light sits, if not on the flame (e.g. pushed outward so a fire beside a wall
// lights the street instead of glaring on the wall right next to it).
export function addFire(scene, x, y, z, { size = 1, sparks = true, strength = 1, night = false, light = null } = {}) {
  const sprites = LAYERS.map(([color, s, o]) => {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.center.set(0.5, 0.08);                       // grow up from the base
    m.position.set(x, y, z); m.scale.set(size * s * 0.55, size * s, 1);
    m.userData.keep = false;
    scene.add(m);
    return m;
  });
  let pts = null;
  if (sparks) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
    pts = new THREE.Points(geo, sparkMat);
    pts.userData.life = Array.from({ length: 14 }, () => Math.random());
    pts.frustumCulled = false;
    scene.add(pts);
  }
  const f = { x, y, z, size, sprites, sparks: pts, strength, phase: Math.random() * 10, night, light };
  fires.push(f);
  return f;
}
// Many lantern flames (night only, no sparks), e.g. for the street lanterns.
export function addLanterns(scene, list) {
  for (const p of list) {
    const f = addFire(scene, p.x, p.y, p.z, { size: 0.32, sparks: false, strength: 0.8, night: true });
    // A soft halo of light around the glass.
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: '#ffc477', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(p.x, p.y + 0.15, p.z); halo.scale.set(2.2, 2.2, 1);
    scene.add(halo);
    f.sprites.push(halo); f.halo = halo;
  }
}
// Small candle flames in stall lanterns: night only, dim (a quarter of a street lantern), a small halo.
export function addCandles(scene, list) {
  for (const p of list) {
    const f = addFire(scene, p.x, p.y, p.z, { size: 0.12, sparks: false, strength: 0.25, night: true });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: '#ffc477', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(p.x, p.y + 0.05, p.z); halo.scale.set(0.9, 0.9, 1);
    scene.add(halo);
    f.sprites.push(halo); f.halo = halo;
  }
}
const haloTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.3, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// Each frame: flicker the fires near you, raise their sparks, and move the real lights onto the nearest ones.
export function fireLights(scene, count = 4) {
  const lights = Array.from({ length: count }, () => { const l = new THREE.PointLight('#ffb460', 0, 18, 2); scene.add(l); return l; });
  let pickT = 0, chosen = [];
  // dt: real seconds (picking lights goes on even when paused); wdt: world seconds (sparks stop when paused).
  return (dt, wdt, t, cam, night) => {
    for (const f of fires) {
      const d = Math.hypot(cam.x - f.x, cam.z - f.z);
      const lit = !f.night || night > 0.05;
      for (const s of f.sprites) s.visible = lit && d < 140;
      if (f.sparks) f.sparks.visible = lit && d < 60;
      if (!lit || d > 90) continue;
      // Flicker: each layer breathes and sways on its own.
      f.sprites.forEach((s, i) => {
        if (s === f.halo) { s.material.opacity = 0.45 + Math.sin(t * 7 + f.phase) * 0.06; return; }
        const k = 1 + Math.sin(t * (9 + i * 3) + f.phase) * 0.08 + Math.sin(t * (23 + i * 5) + f.phase * 2) * 0.06;
        const [, sz] = LAYERS[i];
        s.scale.set(f.size * sz * 0.55 * (1 + Math.sin(t * 13 + f.phase + i) * 0.05), f.size * sz * k, 1);
        s.position.x = f.x + Math.sin(t * 4 + f.phase + i) * 0.03 * f.size;
        s.material.rotation = Math.sin(t * 3 + f.phase + i * 2) * 0.12;
      });
      if (f.sparks && d < 60) {
        const pos = f.sparks.geometry.attributes.position, life = f.sparks.userData.life;
        for (let i = 0; i < life.length; i++) {
          life[i] += wdt * (0.5 + (i % 3) * 0.2);
          if (life[i] > 1) life[i] -= 1;
          const L = life[i], a = i * 2.4 + f.phase;
          pos.setXYZ(i, f.x + Math.sin(a + L * 4) * 0.25 * f.size * L, f.y + L * 2.2 * f.size, f.z + Math.cos(a + L * 3) * 0.25 * f.size * L);
        }
        pos.needsUpdate = true;
      }
    }
    // The real lights go to the nearest lit fires (re-picked a few times a second).
    if ((pickT -= dt) <= 0) {
      pickT = 0.3;
      chosen = fires.filter(f => !f.night || night > 0.05)
        .map(f => [f, Math.hypot(cam.x - f.x, cam.z - f.z)]).filter(([, d]) => d < 45)
        .sort((a, b) => a[1] - b[1]).slice(0, count).map(([f]) => f);
    }
    lights.forEach((l, i) => {
      const f = chosen[i];
      if (!f) { l.intensity = 0; return; }
      if (f.light) l.position.set(f.light.x, f.light.y, f.light.z); else l.position.set(f.x, f.y + f.size * 0.5, f.z);
      const flick = 0.85 + Math.sin(t * 11 + f.phase) * 0.08 + Math.sin(t * 29 + f.phase * 3) * 0.07;
      l.intensity = f.strength * (10 + 140 * night) * flick;      // (real-world units: an outdoor lamp needs a lot)
      l.distance = 14 + 10 * f.strength;
    });
  };
}
