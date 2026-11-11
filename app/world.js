// Environment, Roman Campagna relief, 24-Wind Compass Rose (I.6), Exterior Aqueduct (VIII.6) & Harbor (V.12),
// Live Roman Solar Analemma (IX.7, lat 41.9° N), procedural travertine/water shaders, and 0-KB WebAudio harmonics (V.4).
import * as THREE from 'three';
import { M, C, col } from './mesh.js';

export const SEA_Y = -7.8;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// 24 Roman winds in clockwise order starting at North (Septentrio, I.6.4–10)
export const WINDS_24 = [
  'Septentrio', 'Gallicus', 'Supernas',
  'Aquilo', 'Boreas', 'Carbas',
  'Solanus', 'Ornithiae', 'Eurocircias',
  'Eurus', 'Volturnus', 'Leuconotus',
  'Auster', 'Altanus', 'Libonotus',
  'Africus', 'Subvesperus', 'Argestes',
  'Favonius', 'Etesiae', 'Circias',
  'Caurus', 'Corus', 'Thracias',
];

export function campagnaGround(x, z, r, cityGround) {
  const d = Math.hypot(x, z), Rw = r + 14;
  const base = Math.max(SEA_Y + 1.8, cityGround(x, z, r));
  if (d <= Rw + 10) return base;
  // Levelled architectural collar around the wall (Rw+22 .. Rw+98) for the 24-wind compass rose
  const collarIn = smooth(Rw + 10, Rw + 28, d);
  const collarOut = smooth(Rw + 92, Rw + 148, d);
  const collarY = -5.6;

  // Farther out: sculpted Roman Campagna hills (N/NE/E) + Tyrrhenian coastal bay (SW) + meandering river
  const ang = Math.atan2(x, -z); // 0 = N, PI/2 = E, PI = S, -PI/2 = W
  // Hills rise gently in North, Northeast, and East (Sabine & Alban foothills)
  const hillMask = Math.max(0, Math.cos(ang - 0.62)) ** 1.55 + 0.45 * Math.max(0, Math.cos(ang + 0.35)) ** 2;
  const distOut = Math.max(0, d - (Rw + 108));
  const undul =
    Math.sin(x * 0.0042 + 0.4) * Math.cos(z * 0.0038 - 0.3) * 14 +
    Math.sin(x * 0.0095 - z * 0.0072) * 6.5 +
    Math.cos(x * 0.0021 + z * 0.0024) * 11;
  const hills = hillMask * smooth(0, 500, distOut) * (36 + Math.max(-8, undul)) + collarOut * Math.max(0, undul * 0.28);

  // Southwestern coastal bay (Mare Tuscum, V.12): centered right under the SW Harbor & Pharos
  const bx = -Rw * 1.18, bz = Rw * 0.90;
  const seaAxis = (-(x - bx) * 0.76 + (z - bz) * 0.65);
  const seaCross = ((x - bx) * 0.65 + (z - bz) * 0.76);
  const inBay = smooth(-110, 210, seaAxis) * (1 - smooth(360, 960, Math.abs(seaCross)) * 0.45);
  const bayDepth = inBay * 9.8;

  // River valley meandering from Eastern hills around South plain into SW bay
  let riverCut = 0;
  if (x > -Rw * 1.5 && x < Rw * 2.1) {
    const tR = (x + Rw * 1.25) / (Rw * 2.95);
    const rz = Rw * (1.22 - 1.32 * Math.max(0, Math.min(1, tR))) + Math.sin(x * 0.0065) * 40;
    const rd = Math.abs(z - rz);
    if (rd < 46 && d > Rw + 106) {
      riverCut = (1 - (rd / 46) ** 2) * 5.8 * collarOut;
    }
  }

  const outerY = collarY + hills - bayDepth - riverCut;
  return base * (1 - collarIn) + (collarY * (1 - collarOut) + outerY * collarOut) * collarIn;
}

// Marching-squares contour segments (isohypses) on the exterior Campagna hills
export function buildContours(r, terrainFn) {
  const S = 3400, N = 128, step = S / N, x0 = -S / 2, z0 = -S / 2, Rmin = r + 112;
  const H = new Float32Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      H[j * (N + 1) + i] = terrainFn(x0 + i * step, z0 + j * step);
    }
  }
  const levels = [4, 11, 18, 25, 32, 39, 46, 53];
  const pts = [];
  const interp = (ax, az, av, bx, bz, bv, lv) => {
    const t = (lv - av) / ((bv - av) || 1e-6);
    return [ax + (bx - ax) * t, lv + 0.22, az + (bz - az) * t];
  };
  for (let j = 0; j < N; j++) {
    const zA = z0 + j * step, zB = zA + step;
    for (let i = 0; i < N; i++) {
      const xA = x0 + i * step, xB = xA + step;
      if (Math.hypot(xA + step * 0.5, zA + step * 0.5) < Rmin) continue;
      const v00 = H[j * (N + 1) + i], v10 = H[j * (N + 1) + i + 1];
      const v01 = H[(j + 1) * (N + 1) + i], v11 = H[(j + 1) * (N + 1) + i + 1];
      const lo = Math.min(v00, v10, v01, v11), hi = Math.max(v00, v10, v01, v11);
      for (const lv of levels) {
        if (lv <= lo || lv >= hi) continue;
        const seg = [];
        if ((v00 < lv) !== (v10 < lv)) seg.push(interp(xA, zA, v00, xB, zA, v10, lv));
        if ((v10 < lv) !== (v11 < lv)) seg.push(interp(xB, zA, v10, xB, zB, v11, lv));
        if ((v11 < lv) !== (v01 < lv)) seg.push(interp(xB, zB, v11, xA, zB, v01, lv));
        if ((v01 < lv) !== (v00 < lv)) seg.push(interp(xA, zB, v01, xA, zA, v00, lv));
        if (seg.length >= 2) pts.push(...seg[0], ...seg[1]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x7b7161, transparent: true, opacity: 0.26 }));
}

// Engraved 24-Wind Vitruvian Compass Rose (Book I.6) + 22.5° Street Division Sightlines (I.6.7)
export function buildCompassRose(r, theta, terrainFn) {
  const grp = new THREE.Group();
  const Rw = r + 14, R0 = Rw + 26, R1 = Rw + 78, Rm = (R0 + R1) * 0.5;
  const ringPts = [], finePts = [], streetPts = [];
  const P = (rad, a, dy = 0.28) => {
    const x = rad * Math.sin(a), z = -rad * Math.cos(a);
    return [x, terrainFn(x, z) + dy, z];
  };
  const N = 192;
  for (const rad of [R0, R0 + 5, R1 - 6, R1]) {
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2;
      ringPts.push(...P(rad, a), ...P(rad, b));
    }
  }
  // 24 winds: 8 principal (every 3rd) + 16 subsidiary (I.6.10)
  for (let k = 0; k < 24; k++) {
    const a = (k * Math.PI) / 12;
    const major = k % 3 === 0;
    const target = major ? ringPts : finePts;
    const segs = 6, ra = major ? R0 : R0 + 5, rb = major ? R1 + 10 : R1 - 6;
    for (let s = 0; s < segs; s++) {
      const rA = ra + ((rb - ra) * s) / segs, rB = ra + ((rb - ra) * (s + 1)) / segs;
      target.push(...P(rA, a), ...P(rB, a));
    }
  }
  // 8 wind-division lines at 22.5° + k*45° showing street grid alignment (I.6.7)
  for (let k = 0; k < 8; k++) {
    const a = theta + (k * Math.PI) / 4;
    for (let d = Rw + 6; d < R1 + 4; d += 9) {
      streetPts.push(...P(d, a, 0.32), ...P(Math.min(R1 + 4, d + 5), a, 0.32));
    }
  }

  const mkLines = (arr, color, opacity) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  };
  grp.add(mkLines(ringPts, 0x5c4f3d, 0.48));
  grp.add(mkLines(finePts, 0x857966, 0.30));
  grp.add(mkLines(streetPts, 0xb83227, 0.42));

  // Carved stone & bronze cardinal markers on the 8 principal wind points
  const m = new M();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const [x, y, z] = P(Rm, a, 0);
    m.at(x, y - 1.2, z, -a, () => {
      m.box(0, 0, 0, k % 2 === 0 ? 5.6 : 3.8, 1.5, 9.5, k === 0 ? C.bronze : C.marble);
      if (k === 0) m.prism([[0, -7.2], [2.8, 2.5], [-2.8, 2.5]], 1.5, 0.45, C.gold); // North pointer
    });
  }
  // Exterior Roman landmarks:
  // 1. Suburban approach roads + cypress allées from the 4 gates
  for (let k = 0; k < 4; k++) {
    const a = theta + (k * Math.PI) / 2; // angle in standard polar (x=cos, z=sin) used by city.js gates
    for (let s = 0; s < 9; s++) {
      const rad = Rw + 18 + s * 13;
      const gx = rad * Math.cos(a), gz = rad * Math.sin(a), gy = terrainFn(gx, gz);
      if (gy < SEA_Y + 0.6) break;
      m.at(gx, gy - 0.8, gz, Math.atan2(-Math.cos(a), -Math.sin(a)), () => {
        m.box(0, 0, 0, 12.5, 1.05, 8.5, C.marble);
        if (s >= 2 && s % 2 === 0) {
          m.tree(-10.5, 0, 8.5 + (s % 3));
          m.tree(10.5, 0, 8.5 + ((s + 1) % 3));
        }
      });
    }
  }
  // 2. Exterior Aqueduct Arcade marching from the Eastern hills to the city wall (Book VIII.6)
  {
    const aAq = 0.08; // from East-Southeast foothills
    const rStart = Rw + 22, rEnd = Rw + 460, bay = 14;
    const nArches = Math.floor((rEnd - rStart) / bay);
    const specY = terrainFn(Rw + 22, (Rw + 22) * Math.sin(aAq)) + 15.5;
    for (let i = 0; i < nArches; i++) {
      const dA = rStart + (i + 0.5) * bay;
      const ax = dA * Math.cos(aAq), az = dA * Math.sin(aAq);
      const gy = terrainFn(ax, az);
      const topY = specY + i * 0.045; // 1/4 inch per 100 ft gentle rise toward source (VIII.6.1)
      const pierH = Math.max(2.2, topY - gy);
      if (gy > topY + 1.2) break; // enters hillside tunnel (VIII.6.3)
      m.at(ax, gy - 3, az, -aAq, () => {
        m.box(-bay * 0.5 + 1.3, 0, 0, 2.6, pierH + 3, 3.4, C.stone);
        if (pierH > 4.5) m.ring([0, pierH + 3 - bay * 0.36, 0], 'z', bay * 0.42, bay * 0.31, 3.2, C.stone, 10, 0, Math.PI);
        m.box(0, pierH + 2.6, 0, bay + 0.2, 1.9, 3.5, C.stone);
        m.box(0, pierH + 4.5, 0, bay + 0.2, 0.35, 2.2, C.water);
      });
    }
  }
  // 3. Coastal Harbor Breakwaters & Pharos Lighthouse at the SW Tyrrhenian Bay (Book V.12)
  {
    const hx = -Rw * 1.28, hz = Rw * 0.98;
    m.at(hx, SEA_Y - 3, hz, -Math.PI * 0.72, () => {
      m.ring([0, 3.1, 0], 'y', 58, 49, 4.2, C.stone, 28, Math.PI * 0.16, Math.PI * 1.84);
      for (const s of [-1, 1]) {
        const ma = s > 0 ? Math.PI * 0.16 : Math.PI * 1.84;
        const tx = 53.5 * Math.cos(ma), tz = 53.5 * Math.sin(ma);
        m.cyl(tx, 0, tz, 4.8, 4.3, 14, C.stone, 12);
        if (s > 0) {
          // Stepped Pharos lighthouse on the outer mole
          m.box(tx, 14, tz, 6.8, 8, 6.8, C.marble);
          m.cyl(tx, 22, tz, 2.6, 2.3, 6.5, C.marble, 10);
          eachCol(tx, 22, tz, 8);
          m.cyl(tx, 28.5, tz, 2.8, 0.4, 2.4, C.roof, 10);
          m.ball(tx, 30.8, tz, 0.9, C.gold, 8);
        }
      }
    });
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(m.N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(m.K, 3));
  grp.userData.landmarksGeom = g;
  return grp;
}

function eachCol(x, y, z, n) { /* decorative pharos lantern handled by cylinder */ void x; void y; void z; void n; }

// Procedural world-space travertine micro-grain injected into MeshStandardMaterial (0 KB texture cost)
export function applyTravertineShader(material) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWorldPos;
float vHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vNoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(vHash(i), vHash(i + vec2(1.0,0.0)), f.x), mix(vHash(i + vec2(0.0,1.0)), vHash(i + vec2(1.0,1.0)), f.x), f.y);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float bed = vNoise(vec2(vWorldPos.x * 0.35 + vWorldPos.z * 0.35, vWorldPos.y * 1.9));
float fine = vNoise(vWorldPos.xz * 2.4 + vWorldPos.y * 0.7);
diffuseColor.rgb *= (0.965 + 0.048 * bed + 0.022 * fine);`);
  };
}

// Sea & River Water Plane with gentle specular ripple
export function createWaterMesh() {
  const geo = new THREE.PlaneGeometry(4200, 4200, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const uTime = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({
    color: 0x6c96ac,
    roughness: 0.24,
    metalness: 0.12,
    transparent: true,
    opacity: 0.86,
  });
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWPos;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
float w1 = sin(vWPos.x * 0.14 + uTime * 1.1) * cos(vWPos.z * 0.11 - uTime * 0.8);
float w2 = sin((vWPos.x - vWPos.z) * 0.27 - uTime * 1.5);
normal = normalize(normal + vec3(w1 * 0.035 + w2 * 0.02, 0.0, w1 * 0.025 - w2 * 0.03));`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float shimmer = 0.5 + 0.5 * sin(vWPos.x * 0.09 + vWPos.z * 0.08 + uTime * 0.9);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.88, 0.92), shimmer * 0.14);`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = SEA_Y;
  mesh.receiveShadow = true;
  mesh.userData.uTime = uTime;
  return mesh;
}

// Live Roman Solar Analemma (Book IX.7, latitude of Rome 41.9° N)
export function computeRomanSun(hour = 15.25, season = 'equinox') {
  const lat = (41.9 * Math.PI) / 180;
  const declDeg = season === 'summer' ? 23.44 : season === 'winter' ? -23.44 : 0;
  const decl = (declDeg * Math.PI) / 180;
  const H = ((hour - 12) * 15 * Math.PI) / 180;
  const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H);
  const alt = Math.asin(Math.max(0.05, Math.min(0.999, sinAlt)));
  const cosAlt = Math.cos(alt);
  // Azimuth in world coords: North = -Z, South = +Z, East = +X, West = -X
  const sinAz = (-Math.cos(decl) * Math.sin(H)) / Math.max(1e-5, cosAlt);
  const cosAz = (Math.sin(lat) * sinAlt - Math.sin(decl)) / Math.max(1e-5, Math.cos(lat) * cosAlt);
  const dir = new THREE.Vector3(sinAz * cosAlt, Math.sin(alt), cosAz * cosAlt).normalize();
  const shadowNine = 9 / Math.tan(alt); // shadow length in ninths of gnomon (IX.7.1: 8 at Rome equinox noon)
  const warm = 1 - Math.min(1, (Math.sin(alt) - 0.08) / 0.55); // golden hour factor 0..1
  return {
    dir,
    altDeg: (alt * 180) / Math.PI,
    shadowNine,
    warm,
    sunColor: new THREE.Color().lerpColors(new THREE.Color(0xfffaf0), new THREE.Color(0xffcea0), warm * 0.78),
    skyColor: new THREE.Color().lerpColors(new THREE.Color(0xefeae0), new THREE.Color(0xe6d7c3), warm * 0.65),
    hemiTop: new THREE.Color().lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xffe9cf), warm * 0.5),
    hemiGround: new THREE.Color().lerpColors(new THREE.Color(0xcfc8ba), new THREE.Color(0xb8ab96), warm * 0.5),
  };
}

// Optional 0-KB WebAudio Soundscape: soft Mediterranean wind + Pythagorean harmonic chimes (Book V.4: 1:1, 4:3, 3:2, 2:1)
export class VitruvianSound {
  constructor() { this.ctx = null; this.on = false; this.timer = null; this.gain = null; }
  toggle() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(this.ctx.destination);
      // Gentle pink-filtered wind bed
      const len = this.ctx.sampleRate * 3, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.950 * b2 + w * 0.048;
        d[i] = (b0 + b1 + b2) * 0.16;
      }
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const flt = this.ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 340; flt.Q.value = 0.7;
      src.connect(flt); flt.connect(this.gain); src.start();
    }
    this.on = !this.on;
    if (this.on) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.gain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.6);
      this.chime();
      this.timer = setInterval(() => { if (this.on) this.chime(); }, 5400);
    } else {
      this.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.35);
      clearInterval(this.timer);
    }
    return this.on;
  }
  chime() {
    if (!this.ctx || !this.on) return;
    // Pythagorean ratios of Book V.4: fundamental 216 Hz, fourth 4:3 (288), fifth 3:2 (324), octave 2:1 (432), twelfth 3:1 (648)
    const ratios = [1, 9 / 8, 4 / 3, 3 / 2, 16 / 9, 2, 8 / 3, 3];
    const f = 216 * ratios[Math.floor(Math.random() * ratios.length)];
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), env = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = f;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.045, t + 0.06);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    osc.connect(env); env.connect(this.gain);
    osc.start(t); osc.stop(t + 3.5);
  }
}
