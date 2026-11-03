// Draws many copies of one shape in a single go (Three.js "instancing"), so a whole city stays fast.
import * as THREE from 'three';

const tmp = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s = new THREE.Vector3();

export class Batch {
  constructor(geometry, material, { shadows = true } = {}) {
    this.geometry = geometry;
    this.material = material;
    this.shadows = shadows;
    this.matrices = [];
    this.colors = [];
  }

  // Position, size, turn (radians around x, y, z) and colour of one copy.
  add(x, y, z, sx, sy, sz, color, ry = 0, rx = 0, rz = 0) {
    e.set(rx, ry, rz, 'YXZ');
    q.setFromEuler(e);
    tmp.compose(v.set(x, y, z), q, s.set(sx, sy, sz));
    this.matrices.push(tmp.clone());
    this.colors.push(new THREE.Color(color));
  }

  addMatrix(m, color) {
    this.matrices.push(m.clone());
    this.colors.push(new THREE.Color(color));
  }

  build(scene) {
    if (!this.matrices.length) return null;
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.matrices.length);
    this.matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, this.colors[i]);
    });
    mesh.castShadow = this.shadows;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
    return mesh;
  }
}

// Shapes whose base sits at y = 0, so "y" means "standing on the ground at height y".
export const SHAPES = {
  box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0),
  cone: new THREE.ConeGeometry(1, 1, 14).translate(0, 0.5, 0),
  dome: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  onion: (() => {
    // An onion dome: wide belly, pointed top.
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const r = Math.sin(Math.min(t * 1.5, 1) * Math.PI * 0.5 + 0.35) * (1 - t) * 1.25 + 0.02;
      pts.push(new THREE.Vector2(Math.max(r, 0.02), t * 1.6));
    }
    return new THREE.LatheGeometry(pts, 20);
  })(),
  ball: new THREE.SphereGeometry(1, 12, 8),
  leaf: new THREE.BoxGeometry(1, 0.04, 0.32).translate(0.5, 0, 0),
};
