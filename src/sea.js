// Sky, sunlight and the sea, including the enchanted safe passage the tieflings keep
// and the kraken waiting outside it.
import * as THREE from 'three';
import { makeRng, range } from './noise.js';
import { glowTextureCanvas } from './signs.js';

// Sun direction (moved through the day by daylight.js; east is -x, west is +x).
export const SUN_DIR = new THREE.Vector3(-0.55, 0.32, -0.77).normalize();
export const HAZE = new THREE.Color('#f0cf9c');

export function buildSky(scene) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { sunDir: { value: SUN_DIR }, night: { value: 0 }, dusk: { value: 0 } },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 sunDir;
      uniform float night, dusk;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        float up = clamp(vDir.y, 0.0, 1.0);
        vec3 horizon = mix(vec3(0.98, 0.80, 0.58), vec3(1.0, 0.55, 0.32), dusk);
        vec3 zenith = mix(vec3(0.30, 0.52, 0.80), vec3(0.32, 0.30, 0.55), dusk);
        vec3 col = mix(horizon, zenith, pow(up, 0.55));
        // Night: deep blue with stars.
        vec3 nightCol = mix(vec3(0.07, 0.09, 0.16), vec3(0.02, 0.03, 0.08), pow(up, 0.5));
        vec3 cell = floor(vDir * 420.0);
        float star = step(0.9975, hash(cell)) * smoothstep(0.02, 0.2, up);
        nightCol += vec3(star) * (0.6 + 0.4 * hash(cell + 1.0));
        col = mix(col, nightCol, night);
        float s = max(dot(vDir, sunDir), 0.0);
        col += vec3(1.0, 0.72, 0.38) * pow(s, 8.0) * 0.45 * (1.0 - night);
        col += vec3(1.0, 0.95, 0.8) * smoothstep(0.9993, 0.9997, s) * (1.0 - night);
        // The moon, opposite the sun.
        float mo = max(dot(vDir, -sunDir), 0.0);
        col += vec3(0.85, 0.9, 1.0) * smoothstep(0.9990, 0.9994, mo) * night;
        if (vDir.y < 0.0) col = mix(horizon, nightCol, night);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), mat);
  sky.renderOrder = -1;
  scene.add(sky);
  return sky;
}

export function buildLights(scene) {
  const hemi = new THREE.HemisphereLight('#bcd4f0', '#c9a272', 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffd9a3', 2.6);
  scene.userData.lights = { hemi, sun };
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = sun.shadow.camera;
  s.left = -70; s.right = 70; s.top = 70; s.bottom = -70; s.near = 1; s.far = 400;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  // The shadow area follows the player so shadows stay sharp wherever you walk. It moves in steps of
  // exactly one shadow pixel, seen from the sun; any other step makes shadow edges crawl and shimmer.
  const texel = (s.right - s.left) / sun.shadow.mapSize.x;
  const right = new THREE.Vector3(), up = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  return (playerPos) => {
    // (The sun moves during the day, so its grid is worked out each time.)
    right.crossVectors(Y, SUN_DIR).normalize();
    up.crossVectors(SUN_DIR, right).normalize();
    p.set(playerPos.x, 0, playerPos.z);
    const u = Math.round(p.dot(right) / texel) * texel;
    const v = Math.round(p.dot(up) / texel) * texel;
    const w = p.dot(SUN_DIR);
    sun.target.position.copy(right).multiplyScalar(u).addScaledVector(up, v).addScaledVector(SUN_DIR, w);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 200);
  };
}

export function buildWater(scene, fog) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      time: { value: 0 },
      sunDir: { value: SUN_DIR },
      fogColor: { value: fog.color },
      fogNear: { value: fog.near },
      fogFar: { value: fog.far },
      light: { value: 1 },
    },
    vertexShader: `
      uniform float time;
      varying vec3 vWorld;
      float wave(vec2 p) {
        return sin(p.x * 0.11 + time * 0.9) * 0.25 + sin(p.y * 0.17 - time * 1.1) * 0.18
             + sin((p.x + p.y) * 0.31 + time * 1.7) * 0.07;
      }
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y += wave(w.xz);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float time;
      uniform vec3 sunDir, fogColor;
      uniform float fogNear, fogFar, light;
      varying vec3 vWorld;
      vec2 slope(vec2 p) {
        float t = time;
        return vec2(cos(p.x * 0.11 + t * 0.9) * 0.0275 + cos((p.x + p.y) * 0.31 + t * 1.7) * 0.0217
                  + cos(p.x * 1.3 + p.y * 0.4 + t * 2.3) * 0.02,
                    -cos(p.y * 0.17 - t * 1.1) * 0.0306 + cos((p.x + p.y) * 0.31 + t * 1.7) * 0.0217
                  + cos(p.y * 1.1 - p.x * 0.5 + t * 2.0) * 0.02);
      }
      void main() {
        vec2 s = slope(vWorld.xz);
        vec3 n = normalize(vec3(-s.x * 4.0, 1.0, -s.y * 4.0));
        vec3 view = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
        float shore = smoothstep(-40.0, 0.0, vWorld.z) * step(abs(vWorld.x), 180.0);
        vec3 deep = vec3(0.07, 0.30, 0.40);
        vec3 shallow = vec3(0.18, 0.62, 0.62);
        vec3 col = mix(deep, shallow, shore * 0.8);
        col = mix(col, vec3(0.98, 0.83, 0.62), fres * 0.65);
        vec3 h = normalize(sunDir + view);
        col += vec3(1.0, 0.85, 0.6) * pow(max(dot(n, h), 0.0), 220.0) * 2.5 * step(0.0, sunDir.y);
        col *= light;
        float d = length(cameraPosition - vWorld);
        float f = smoothstep(fogNear, fogFar, d);
        gl_FragColor = vec4(mix(col, fogColor, f), 0.93);
      }`,
  });
  const geo = new THREE.PlaneGeometry(3000, 3000, 240, 240);
  geo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geo, mat);
  water.position.y = 0;
  scene.add(water);
  scene.userData.waterMat = mat;
  return (t, camPos) => {
    mat.uniforms.time.value = t;
    // Keep the detailed water centred on the player (snapped so the waves don't slide).
    water.position.x = Math.round(camPos.x / 50) * 50;
    water.position.z = Math.round(camPos.z / 50) * 50;
  };
}

// The safe passage: two lines of glowing ward-buoys leading out to sea.
// (My guess at what the tieflings' enchantment looks like.)
export function buildPassage(scene) {
  const group = new THREE.Group();
  const buoyMat = new THREE.MeshStandardMaterial({ color: '#3a2a48', roughness: 0.6 });
  const orbMat = new THREE.MeshBasicMaterial({ color: '#c58bff' });
  const glowTex = glowTexture();
  const orbs = [];
  for (let z = -75; z > -1100; z -= 45) {
    for (const x of [-34, 34]) {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.0, 1.6, 8), buoyMat);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), orbMat);
      orb.position.y = 1.5;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#b77cff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(5, 5, 1);
      glow.position.y = 1.5;
      b.add(body, orb, glow);
      b.position.set(x, 0, z);
      group.add(b);
      orbs.push({ b, glow, phase: z * 0.05 + x });
    }
  }
  scene.add(group);
  return (t) => {
    for (const o of orbs) {
      o.b.position.y = Math.sin(t * 1.2 + o.phase) * 0.25 - 0.2;
      o.b.rotation.z = Math.sin(t * 0.9 + o.phase) * 0.06;
      const k = 9 + Math.sin(t * 2 + o.phase) * 1.5;
      o.glow.scale.set(k, k, 1);
    }
  };
}

export function glowTexture() {
  return new THREE.CanvasTexture(glowTextureCanvas());
}

// Kraken tentacles that now and then rise out of the open water, outside the safe passage.
export function buildKraken(scene) {
  const rng = makeRng(77);
  const mat = new THREE.MeshStandardMaterial({ color: '#4b2d4f', roughness: 0.5, metalness: 0.1 });
  const tentacles = [];
  for (let i = 0; i < 7; i++) {
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      pts.push(new THREE.Vector3(Math.sin(t * 3) * 3 * t, t * 28, Math.cos(t * 2.4) * 2 * t));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 40, 1, 8);
    // Taper the tube toward the tip.
    const p = geo.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const y = p.getY(j) / 28;
      const centre = curve.getPoint(Math.min(Math.max(y, 0), 1));
      const s = 1.6 * (1 - y) + 0.08;
      p.setX(j, centre.x + (p.getX(j) - centre.x) * s);
      p.setZ(j, centre.z + (p.getZ(j) - centre.z) * s);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    scene.add(m);
    tentacles.push({ m, start: range(rng, 0, 40), period: range(rng, 26, 48), side: i % 2 ? 1 : -1, rng });
  }
  const place = (tn) => {
    const r = tn.rng;
    tn.m.position.set(tn.side * range(r, 110, 420), -30, -range(r, 260, 800));
    tn.m.rotation.y = range(r, 0, Math.PI * 2);
  };
  tentacles.forEach(place);
  return (t) => {
    for (const tn of tentacles) {
      const local = (t + tn.start) % tn.period;
      const up = Math.sin(Math.min(local / 9, 1) * Math.PI);   // rises and sinks over 9 s
      if (local < 0.05) place(tn);
      tn.m.position.y = -30 + up * 29;
      tn.m.rotation.z = Math.sin(t * 0.8 + tn.start) * 0.25 * up;
      tn.m.rotation.x = Math.cos(t * 0.6 + tn.start) * 0.2 * up;
      tn.m.visible = up > 0.01;
    }
  };
}
