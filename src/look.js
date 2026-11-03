// How things look: surface textures (stylized: they add grain and bumps but keep each
// thing's own colour), sky lighting, ambient shadows in corners, glow, and dust in the air.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const loader = new THREE.TextureLoader();
function tex(name, kind, srgb) {
  const t = loader.load(`assets/textures/${name}_${kind}.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// The texture is laid out by world position (like wallpaper on every face), so a 20 m wall
// and a 2 m wall get the same size bricks. tile = metres per texture repeat.
// detail = how strongly the texture's light and dark shows through the object's colour.
const WORLD_UV = `
  {
    vec4 wp4 = vec4(transformed, 1.0);
    vec3 wn = objectNormal;
    #ifdef USE_INSTANCING
      wp4 = instanceMatrix * wp4;
      wn = mat3(instanceMatrix) * wn;
    #endif
    wp4 = modelMatrix * wp4;
    wn = normalize(mat3(modelMatrix) * wn);
    vec2 wuv = abs(wn.y) > 0.6 ? wp4.xz : (abs(wn.x) > abs(wn.z) ? vec2(wp4.z, wp4.y) : vec2(wp4.x, wp4.y));
    #ifdef ROUND_UV
      // Round things (towers, columns) wrap the texture around instead (no stretched stripe where
      // the flat projections meet); radius from the copy's own scale.
      #ifdef USE_INSTANCING
        float rad = length((modelMatrix * instanceMatrix)[0].xyz);
      #else
        float rad = length(modelMatrix[0].xyz);
      #endif
      if (abs(objectNormal.y) < 0.6) wuv = vec2(atan(transformed.x, transformed.z) * rad, wp4.y);
    #endif
    vWorldPos = wp4.xyz;
    #ifdef USE_INSTANCING
      vHeight = length(instanceMatrix[1].xyz);
      vLocalY = transformed.y;
    #else
      vHeight = 0.0; vLocalY = 0.0;
    #endif
    wuv *= uTile;
    vMapUv = wuv;
    #ifdef USE_NORMALMAP
      vNormalMapUv = wuv;
    #endif
    #ifdef USE_ROUGHNESSMAP
      vRoughnessMapUv = wuv;
    #endif
  }`;

// Brightness of the texture compared with its average (its smallest mipmap): >1 lighter, <1 darker.
const DETAIL = `
  #ifdef USE_MAP
    vec4 texel = texture2D(map, vMapUv);
    vec3 avg = textureLod(map, vec2(0.5), 12.0).rgb;
    float lum = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
    float mean = max(dot(avg, vec3(0.299, 0.587, 0.114)), 0.02);
    diffuseColor.rgb *= mix(1.0, lum / mean, uDetail);
  #endif`;

// Weathering, so walls don't look freshly rendered: dust and grime rising from the ground, rain
// streaks under the roofline, and big soft patches where the plaster has aged unevenly.
// Darker (poorer) walls get dirtier. Base and top are known only for instanced boxes (the city's houses).
const NOISE = `
  float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float wNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(wHash(i), wHash(i + vec2(1, 0)), f.x), mix(wHash(i + vec2(0, 1)), wHash(i + vec2(1, 1)), f.x), f.y);
  }`;
const WEATHER = `
  {
    vec3 col = diffuseColor.rgb;
    float poor = 1.0 - clamp(dot(col, vec3(0.299, 0.587, 0.114)) * 1.3, 0.0, 1.0);
    vec2 side = vec2(vWorldPos.x + vWorldPos.z, vWorldPos.y);
    float patches = wNoise(vWorldPos.xz * 0.11 + vWorldPos.y * 0.07) * 0.6 + wNoise(side * 0.35) * 0.4;
    col *= mix(0.84, 1.08, patches);
    col = mix(col, col * vec3(1.04, 0.98, 0.9), smoothstep(0.55, 0.85, wNoise(vWorldPos.xz * 0.05 + 7.0)) * 0.6);   // some walls sun-yellowed
    if (vHeight > 0.0) {
      float up = vLocalY * vHeight, down = (1.0 - vLocalY) * vHeight;
      float grime = (1.0 - smoothstep(0.0, 1.4 + wNoise(side * 0.8) * 0.8, up)) * mix(0.18, 0.4, poor);
      col = mix(col, col * vec3(0.62, 0.55, 0.46), grime);
      float streak = wNoise(vec2(side.x * 4.0, 0.0)) * (1.0 - smoothstep(0.0, 1.0 + wNoise(vec2(side.x * 2.0, 3.0)) * 2.5, down));
      col *= 1.0 - streak * mix(0.12, 0.28, poor);
    }
    diffuseColor.rgb = col;
  }`;

export function worldMapped(mat, { tile = 4, detail = 0.6, weather = false, round = false } = {}) {
  mat.onBeforeCompile = (sh) => {
    if (round) sh.defines = { ...(sh.defines || {}), ROUND_UV: '' };
    sh.uniforms.uTile = { value: 1 / tile };
    sh.uniforms.uDetail = { value: detail };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTile;\nvarying vec3 vWorldPos;\nvarying float vHeight;\nvarying float vLocalY;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WORLD_UV);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uDetail;\nvarying vec3 vWorldPos;\nvarying float vHeight;\nvarying float vLocalY;' + (weather ? NOISE : ''))
      .replace('#include <map_fragment>', DETAIL)
      .replace('#include <color_fragment>', '#include <color_fragment>' + (weather ? WEATHER : ''));
  };
  mat.customProgramCacheKey = () => `world-${tile}-${detail}-${weather}-${round}`;
  return mat;
}

export function surface(name, { tile = 4, detail = 0.6, normal = 0.8, roughness = 1, side, metalness = 0, weather = false, round = false } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    map: tex(name, 'Diffuse', true), normalMap: tex(name, 'nor_gl'), roughnessMap: tex(name, 'Rough'),
    roughness, metalness, normalScale: new THREE.Vector2(normal, normal), side: side ?? THREE.FrontSide,
  });
  return worldMapped(mat, { tile, detail, weather, round });
}

// Time for things that move on the ground (the foam line); main.js sets it each frame.
export const groundTime = { value: 0 };

// The ground: sand everywhere, cobblestones where the vertex attribute 'paved' is 1.
// Open sand gets wind ripples (stronger out in the desert and on the beach), the beach gets wet,
// shiny sand and a foam line that comes and goes with the waves.
export function groundMaterial() {
  const sand = { map: tex('coast_sand_01', 'Diffuse', true), nor: tex('coast_sand_01', 'nor_gl'), rough: tex('coast_sand_01', 'Rough') };
  const cob = { map: tex('patterned_cobblestone', 'Diffuse', true), nor: tex('patterned_cobblestone', 'nor_gl') };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: sand.map, normalMap: sand.nor, roughnessMap: sand.rough, roughness: 1, normalScale: new THREE.Vector2(0.9, 0.9) });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTile = { value: 1 / 5 };
    sh.uniforms.uDetail = { value: 0.55 };
    sh.uniforms.cobMap = { value: cob.map };
    sh.uniforms.cobNor = { value: cob.nor };
    sh.uniforms.uTime = groundTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTile;\nvarying vec3 vWorldPos;\nvarying float vHeight;\nvarying float vLocalY;\nattribute float paved;\nvarying float vPaved;\nvarying vec2 vCobUv;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WORLD_UV + '\nvPaved = paved;\nvCobUv = vMapUv * 5.0 / 2.6;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uDetail;\nuniform float uTime;\nuniform sampler2D cobMap;\nuniform sampler2D cobNor;\nvarying float vPaved;\nvarying vec2 vCobUv;\nvarying vec3 vWorldPos;' + NOISE)
      .replace('#include <map_fragment>', `
        vec4 sT = texture2D(map, vMapUv);
        vec4 cT = texture2D(cobMap, vCobUv);
        float sMean = max(dot(textureLod(map, vec2(0.5), 12.0).rgb, vec3(0.299, 0.587, 0.114)), 0.02);
        float cMean = max(dot(textureLod(cobMap, vec2(0.5), 12.0).rgb, vec3(0.299, 0.587, 0.114)), 0.02);
        float sL = dot(sT.rgb, vec3(0.299, 0.587, 0.114)) / sMean;
        float cL = dot(cT.rgb, vec3(0.299, 0.587, 0.114)) / cMean;
        diffuseColor.rgb *= mix(1.0, mix(sL, cL, vPaved), mix(uDetail, 0.8, vPaved));
        vec2 gp = vWorldPos.xz;
        diffuseColor.rgb *= mix(0.92, 1.06, wNoise(gp * 0.03));                       // big soft patches
`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // The beach: darker where wet, and foam riding up and down the waterline (after the ground's
        // own colour, which would otherwise tint the foam brown).
        float sandK = 1.0 - vPaved;
        vec2 bp = vWorldPos.xz;
        float wl = 0.25 + 0.18 * sin(uTime * 0.9 + bp.x * 0.06 + wNoise(bp * 0.15) * 4.0);
        float wet = (1.0 - smoothstep(wl, wl + 0.9, vWorldPos.y)) * sandK;
        diffuseColor.rgb *= 1.0 - wet * 0.25;
        float foam = (1.0 - smoothstep(0.0, 0.2, abs(vWorldPos.y - wl))) * (0.4 + 0.6 * wNoise(bp * 1.6 + uTime * 0.25)) * sandK;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.96, 0.94), foam * 0.85);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.3, wet * 0.8);`)
      .replace('#include <normal_fragment_maps>', `
        #ifdef USE_NORMALMAP_TANGENTSPACE
          vec3 mapN = mix(texture2D(normalMap, vNormalMapUv).xyz, texture2D(cobNor, vCobUv).xyz, vPaved) * 2.0 - 1.0;
          mapN.xy *= normalScale;
          normal = normalize(tbn * mapN);
        #endif
        {
          // Wind ripples, faded with distance so they don't shimmer far away.
          float out_ = max(smoothstep(186.0, 200.0, abs(vWorldPos.x)), smoothstep(240.0, 290.0, vWorldPos.z));
          float beach = 1.0 - smoothstep(0.8, 1.6, vWorldPos.y);
          float amt = (1.0 - vPaved) * mix(0.25, 1.0, max(out_, beach)) * (1.0 - smoothstep(20.0, 60.0, length(vViewPosition)));
          vec2 dir = normalize(vec2(0.8, 0.6));
          float ph = dot(vWorldPos.xz, dir) * 2.4 + wNoise(vWorldPos.xz * 0.12) * 7.0;
          float sl = cos(ph) * 0.35 * amt;
          normal = normalize(normal + mat3(viewMatrix) * vec3(-sl * dir.x, 0.0, -sl * dir.y));
        }`);
  };
  mat.customProgramCacheKey = () => 'ground';
  return mat;
}

// Sky light: a real photographed sunset sky lights and reflects off everything (gold, marble, water).
export function skyLighting(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load('assets/sky/belfast_sunset_puresky_1k.hdr', (hdr) => {
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.3;
    hdr.dispose();
    pmrem.dispose();
  });
}

// Dust drifting in the warm air around you.
export function dust(scene) {
  const N = 500, R = 30;
  const pos = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) {
    pos.set([(Math.random() - 0.5) * R * 2, Math.random() * 8, (Math.random() - 0.5) * R * 2], i * 3);
    vel.push([(Math.random() - 0.3) * 0.25, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.2]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffe2b0', size: 0.05, transparent: true, opacity: 0.55, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  return (dt, cam) => {
    pts.position.set(Math.floor(cam.x / R) * R, 0, Math.floor(cam.z / R) * R);
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < 3; k++) pos[i * 3 + k] += vel[i][k] * dt;
      // Keep each speck within the box around the player.
      const ax = pos[i * 3] + pts.position.x - cam.x, az = pos[i * 3 + 2] + pts.position.z - cam.z;
      if (ax > R) pos[i * 3] -= 2 * R; if (ax < -R) pos[i * 3] += 2 * R;
      if (az > R) pos[i * 3 + 2] -= 2 * R; if (az < -R) pos[i * 3 + 2] += 2 * R;
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] += 8; if (pos[i * 3 + 1] > 8) pos[i * 3 + 1] -= 8;
      pos[i * 3 + 1] = Math.max(pos[i * 3 + 1], 0);
    }
    pts.position.y = cam.y - 2;
    geo.attributes.position.needsUpdate = true;
  };
}

// Post effects: soft shadows in corners (ambient occlusion) and glow on bright things (bloom).
// Quality: 2 = both, 1 = glow only, 0 = neither (G cycles; it also drops by itself if things get slow).
export function effects(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 12 });
  ao.blendIntensity = 0.85;
  // The shadow-in-corners pass would treat see-through things (smoke, lamp glows, dust) as solid
  // boxes and darken around them: hide them while it measures the scene. They're still drawn normally.
  const aoRender = ao.render.bind(ao);
  let seeThrough = [], listed = 0;          // (looked up every 2 s: walking the whole scene each frame costs ~1 ms)
  ao.render = (...args) => {
    if (performance.now() - listed > 2000) {
      listed = performance.now(); seeThrough = [];
      scene.traverse(o => { if (o.isSprite || o.isPoints || (o.material && o.material.transparent && !o.material.depthWrite)) seeThrough.push(o); });
    }
    const was = seeThrough.map(o => o.visible);
    for (const o of seeThrough) o.visible = false;
    aoRender(...args);
    seeThrough.forEach((o, i) => { o.visible = was[i]; });
  };
  composer.addPass(ao);
  // Only things brighter than sunlit white glow (lanterns, gold catching the sun, ward-lights); a lower
  // threshold made white rooms foggy.
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.45, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let quality = 2;
  const api = {
    get quality() { return quality; },
    set quality(q) { quality = q; ao.enabled = q >= 2; bloom.enabled = q >= 1; },
    render() { if (quality === 0) renderer.render(scene, camera); else composer.render(); },
    resize(w, h) { composer.setSize(w, h); },
  };
  return api;
}
