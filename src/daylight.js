// Day and night. The sun rises at 6, crosses the southern sky over the sea and sets at 8 pm.
// Dusk turns everything orange; at night the sky fills with stars, the moon comes up,
// windows glow and the lanterns and ward-buoys carry the light.
import * as THREE from 'three';
import { SUN_DIR, HAZE } from './sea.js';

const RISE = 6 * 60, SET = 20 * 60;
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function daylight(scene, sky) {
  const { hemi, sun } = scene.userData.lights;
  const water = scene.userData.waterMat;
  const windows = scene.userData.windowMat;
  const dayFog = HAZE.clone(), duskFog = new THREE.Color('#e89a62'), nightFog = new THREE.Color('#141a2c');
  const daySun = new THREE.Color('#ffd9a3'), lowSun = new THREE.Color('#ff9a52'), moon = new THREE.Color('#9fb4e0');
  const dayHemiSky = new THREE.Color('#bcd4f0'), nightHemiSky = new THREE.Color('#3a4a78');
  let last = -1;
  return (minute) => {
    if (Math.abs(minute - last) < 0.5) return;    // only redo it when time has moved a little
    last = minute;
    const p = (minute - RISE) / (SET - RISE);      // 0 at sunrise, 1 at sunset
    const elev = Math.sin(Math.PI * Math.max(-0.15, Math.min(1.15, p)));
    // East (-x) in the morning, west (+x) in the evening, always over the sea (-z).
    const dir = new THREE.Vector3(-Math.cos(Math.PI * Math.max(0, Math.min(1, p))) * 0.85, Math.max(0.05, elev * 0.75), -0.65).normalize();
    const day = smooth(-0.08, 0.2, elev);            // 0 night .. 1 day
    const dusk = (1 - smooth(0.12, 0.4, elev)) * smooth(-0.1, 0.05, elev);
    const night = 1 - day;

    // At night the "sun" light becomes moonlight from the other side of the sky.
    if (day > 0.02) SUN_DIR.copy(dir);
    else SUN_DIR.set(0.4, 0.55, -0.7).normalize();
    sky.material.uniforms.night.value = night;
    sky.material.uniforms.dusk.value = dusk;
    sun.color.copy(daySun).lerp(lowSun, dusk);
    if (night > 0.98) sun.color.copy(moon);
    sun.intensity = day > 0.02 ? 2.6 * smooth(0, 0.18, elev) + 0.2 : 0.5;     // moonlight
    hemi.intensity = 0.26 + 0.49 * day;                                     // (a little brighter at night, so streets read)
    hemi.color.copy(nightHemiSky).lerp(dayHemiSky, day);
    scene.environmentIntensity = 0.04 + 0.26 * day;
    scene.fog.color.copy(dayFog).lerp(duskFog, dusk).lerp(nightFog, night);
    water.uniforms.light.value = 0.25 + 0.75 * day;
    windows.emissiveIntensity = night * 1.4;
    if (scene.userData.plotWindows) scene.userData.plotWindows.emissiveIntensity = night * 1.4;
    if (scene.userData.darkMat) scene.userData.darkMat.emissiveIntensity = night * 1.4;
  };
}
