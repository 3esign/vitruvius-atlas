// Vitruvius — The City of the Ten Books (v2 Spatial Scholarly Edition)
// Conceived and authored by PhD Poturak Semir.
// Distribution (where a building stands): four data matrices over 261 architectural elements (729 passages).
// Design (what stands there): 55 parametric forms built from 132 verbatim rules of Vitruvius.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { build, GEN } from './forms.js';
import { M, C, FT, setDetail } from './mesh.js';
import { RULES, FORMS } from './rules.js';
import {
  SEA_Y, WINDS_24, campagnaGround, buildContours, buildCompassRose,
  applyTravertineShader, applyGroundShader, createSky, GradeShader, buildGroves, createWaterMesh, computeRomanSun, VitruvianSound,
} from './world.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BASE = document.querySelector('meta[name="atlas-base"]')?.content || '..';

const passagesReq = fetch(`${BASE}/data/passages.json`).then(r => r.json()); // starts with the rest, read after the city is built
const [city, map, toc, scholar] = await Promise.all(
  ['city', 'map', 'toc', 'scholar'].map(f => fetch(`${BASE}/data/${f}.json`).then(r => r.json()))
);

let PASSAGES = null, TEXT = null, P_META = {}, LATIN = null, latPromise = null;
const ensureLatin = () => {
  if (LATIN) return Promise.resolve(LATIN);
  if (!latPromise) latPromise = fetch(`${BASE}/data/latin.json`).then(r => r.json()).then(d => (LATIN = d));
  return latPromise;
};

// ---------------------------------------------------------------- indexes
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const KIND = { rule: 'rule', procedure: 'procedure', description: 'description', definition: 'definition', explanation: 'explanation', argument: 'argument', anecdote: 'story', catalogue: 'catalogue', preface: 'preface' };
const CARD_ROT = { N: Math.PI, E: Math.PI / 2, S: 0, W: -Math.PI / 2, SW: -Math.PI / 4 };
const FACE_NAME = { N: 'Faces North · V.12.7', E: 'Faces East · VI.4.1', W: 'Faces West · IV.5.1', SW: 'Faces Southwest · V.10.1' };
const addr = id => { const [b, c, n] = id.split('.'); return `${ROMAN[b]}.${+c ? c : 'pr'}.${n}`; };
const ctsAddr = id => { const [b, c, n] = id.split('.'); return `${b}.${+c ? c : 'pr'}.${n}`; };
const pgStr = pm => !pm ? '' : pm.p0 === pm.p1 ? `p. ${pm.p0}` : `pp. ${pm.p0}–${pm.p1}`;

const E = city.elements, byId = Object.fromEntries(E.map(e => [e.id, e])), elOf = {}, ruleUse = {}, rulesAt = {};
for (const e of E) { for (const p of e.passages) elOf[p] = e; for (const r of e.rules) (ruleUse[r] ??= []).push(e); }
for (const [id, r] of Object.entries(RULES)) (rulesAt[r.at] ??= []).push(id);
const DOM = Object.fromEntries(city.domains.map(d => [d.id, d])), CAT = {}, TOPIC = {};
for (const d of city.domains) for (const c of d.cats) { CAT[c.id] = { ...c, dom: d }; for (const t of c.topics) TOPIC[t.id] = { ...t, cat: c, dom: d }; }
const FIG_BY_ID = Object.fromEntries(scholar.figures.map(f => [f.id, f]));
const ENT_BY_PASSAGE = {};
for (const [kind, list] of Object.entries(scholar.entities)) {
  for (const ent of list) {
    ent.kind = kind;
    for (const pid of ent.passages) (ENT_BY_PASSAGE[pid] ??= []).push(ent);
  }
}

const MATS = Object.keys(city.matrices);
let by = 'theme', lang = 'en', camMode = '3d', activeTour = null;
let sel = null, hi = null, hover = null, dirty = true, fly = null, move = null;
const walkState = { joyF: 0, joyS: 0, yaw: 0, pitch: 0.06, keys: new Set(), velY: 0, hopY: 0, dragging: false, lastX: 0, lastY: 0 };

// ---------------------------------------------------------------- renderer, cameras & lighting
// Quality by device: a desk gets everything live; a phone or tablet draws at a lower pixel ratio with plainer rounds,
// a smaller shadow map and ambient occlusion only once the view has come to rest; ?q=high|mid|low overrides.
const QS = new URLSearchParams(location.search);
const TOUCH = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 1 && matchMedia('(hover: none)').matches);
const TIER = ['high', 'mid', 'low'].includes(QS.get('q')) ? QS.get('q') : QS.has('lite') ? 'low'
  : TOUCH || innerWidth < 700 || (navigator.deviceMemory || 8) < 4 ? 'mid' : 'high';
const Q = {
  high: { pr: 1.75, prMin: 1, shadow: 4096, msaa: 4, ao: 'live', detail: 1 },
  mid: { pr: 1.5, prMin: 0.9, shadow: 2048, msaa: 4, ao: 'settle', detail: 0.7 },
  low: { pr: 1.1, prMin: 0.75, shadow: 1024, msaa: 0, ao: 'off', detail: 0.7 },
}[TIER];
setDetail(Q.detail);
document.body.classList.toggle('touch', TOUCH);
const narrow = () => innerWidth <= 960;
const tick = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = r; c.port2.postMessage(0); });
let PR = Math.min(devicePixelRatio, Q.pr), shadowKey = '', settled = false, lastDrawn = 0, slowAcc = 0, slowN = 0, slowRuns = 0, readyAt = 1e15;

const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.autoUpdate = false; // drawn again only when the sun, the buildings or the covered ground change
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.84;

const PAPER = 0xe4e6e4, scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
const sky = createSky();
scene.add(sky);

const perspCam = new THREE.PerspectiveCamera(32, 1, 1.2, 9500);
const orthoCam = new THREE.OrthographicCamera(-500, 500, 500, -500, 5, 9000);
let activeCam = perspCam;

const controls = new MapControls(perspCam, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.11;
controls.maxPolarAngle = 1.47; controls.minDistance = 16; controls.zoomToCursor = true;

const hemi = new THREE.HemisphereLight(0xbcd3f0, 0xd8c6a4, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3df, 4.2);
sun.castShadow = true; sun.shadow.mapSize.set(Q.shadow, Q.shadow);
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.3; sun.shadow.radius = 2.2;

// Post chain: beauty (4x MSAA, half-float) -> ground-truth ambient occlusion -> tone map -> grade
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: Q.msaa }));
const renderPass = new RenderPass(scene, perspCam);
const gtao = Q.ao === 'off' ? null : new GTAOPass(scene, perspCam, 4, 4);
if (gtao) {
  gtao.updateGtaoMaterial({ radius: 3.2, distanceExponent: 1.4, thickness: 1.6, distanceFallOff: 1, scale: 1.15, samples: Q.ao === 'live' ? 12 : 8, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: Q.ao === 'live' ? 12 : 8 });
  gtao.blendIntensity = 0.95;
  gtao.enabled = Q.ao === 'live';
}
const gradePass = new ShaderPass(GradeShader);
composer.addPass(renderPass); if (gtao) composer.addPass(gtao); composer.addPass(new OutputPass()); composer.addPass(gradePass);
scene.add(sun, sun.target);

const TH = city.theta, cT = Math.cos(TH), sT = Math.sin(TH);
let RAD = city.matrices[by].r;
const cityGround = (x, z, r = RAD) => {
  const u = x * cT + z * sT, v = -x * sT + z * cT, s = city.hill.s * r, hv = city.hill.v * r;
  return city.hill.h * Math.exp(-(u * u + (v - hv) ** 2) / (2 * s * s)) - (city.hill.slope * v) / r;
};
const ground = (x, z, r = RAD) => campagnaGround(x, z, r, cityGround);

const geomOf = b => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(b.pos || new Float32Array(b.P), 3));
  const nor = b.nor || b.N, col = b.col || b.K, n8 = new Int8Array(nor.length), c8 = new Uint8Array(col.length);
  for (let i = 0; i < nor.length; i++) { n8[i] = Math.round(nor[i] * 127); c8[i] = Math.round(Math.min(1, Math.max(0, col[i])) * 255); }
  g.setAttribute('normal', new THREE.BufferAttribute(n8, 3, true));
  g.setAttribute('color', new THREE.BufferAttribute(c8, 3, true));
  g.computeBoundingSphere();
  return g;
};

const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.91, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
applyTravertineShader(mat);
const matSel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: THREE.DoubleSide, color: 0xffffff, emissive: 0x9e281d, emissiveIntensity: 0.05, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
applyTravertineShader(matSel);
const matHi = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: THREE.DoubleSide, color: 0xffffff, emissive: 0x9e281d, emissiveIntensity: 0.035, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
applyTravertineShader(matHi);
const matDim = new THREE.MeshStandardMaterial({ color: 0xa2957d, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const ink = new THREE.LineBasicMaterial({ color: 0x26221e, transparent: true, opacity: 0.68 });
const inkSel = new THREE.LineBasicMaterial({ color: 0x9e2418, transparent: true, opacity: 0.92 });
const inkDim = new THREE.LineBasicMaterial({ color: 0x26221e, transparent: true, opacity: 0.13 });

// ---------------------------------------------------------------- terrain, water, streets, frame & compass
const SIZE = 3800, gGeo = new THREE.PlaneGeometry(SIZE, SIZE, 210, 210);
gGeo.rotateX(-Math.PI / 2);
gGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(gGeo.attributes.position.count * 3), 3));
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98 });
applyGroundShader(groundMat, 'earth');
const groundMesh = new THREE.Mesh(gGeo, groundMat);
groundMesh.receiveShadow = true;
scene.add(groundMesh);

const waterMesh = createWaterMesh();
scene.add(waterMesh);

function reground() {
  const p = gGeo.attributes.position, colAttr = gGeo.attributes.color;
  const Rw = RAD + 14;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = ground(x, z) - 0.06;
    p.setY(i, y);
    const d = Math.hypot(x, z);
    let r = 0.56, g = 0.485, b = 0.37; // trodden earth inside the walls
    if (d > Rw + 18 && d < Rw + 96) {
      r = 0.64; g = 0.60; b = 0.52; // dressed stone compass terrace
    } else if (y < SEA_Y + 1.6) {
      const sub = Math.min(1, Math.max(0, (SEA_Y + 0.35 - y) / 6));
      r = 0.83 - 0.36 * sub; g = 0.78 - 0.20 * sub; b = 0.63 + 0.0 * sub; // sand, then seabed
    } else if (d >= Rw + 96) {
      const hT = Math.min(1, Math.max(0, (y + 1) / 48)), k = Math.min(1, (d - Rw - 96) / 60);
      // olive and wheat country; green channel leads red so the shader lays field parcels here
      r = 0.56 * (1 - k) + (0.50 + 0.07 * hT) * k; g = 0.485 * (1 - k) + (0.525 + 0.04 * hT) * k; b = 0.37 * (1 - k) + (0.34 + 0.05 * hT) * k;
    }
    colAttr.setXYZ(i, r, g, b);
  }
  p.needsUpdate = true; colAttr.needsUpdate = true;
  gGeo.computeVertexNormals();
}

const pads = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xd6cdb9, roughness: 0.98 }), E.length);
pads.receiveShadow = true; scene.add(pads);

let frame = null, streetsObj = null, contoursObj = null, compassObj = null, extLandmarksMesh = null;
const paving = new THREE.MeshStandardMaterial({ color: 0xc4bba9, roughness: 0.9 });
applyGroundShader(paving, 'paving');
let grovesObj = null;
const kerb = new THREE.LineBasicMaterial({ color: 0x2a2622, transparent: true, opacity: 0.28 });

function restreet() {
  if (streetsObj) { scene.remove(streetsObj); streetsObj.traverse(o => o.geometry?.dispose()); }
  const P = [], L = [], F = city.forum, w = city.street;
  const W = (u, v) => { const x = u * cT - v * sT, z = u * sT + v * cT; return [x, ground(x, z) + 0.3, z]; };
  const strip = (u0, u1, v0, v1) => {
    const n = Math.max(1, Math.ceil((u1 - u0) / 9));
    for (let i = 0; i < n; i++) {
      const a = u0 + ((u1 - u0) * i) / n, b = u0 + ((u1 - u0) * (i + 1)) / n;
      const p = [W(a, v0), W(b, v0), W(b, v1), W(a, v1)];
      P.push(...p[0], ...p[2], ...p[1], ...p[0], ...p[3], ...p[2]);
      L.push(...p[0], ...p[1], ...p[3], ...p[2]);
    }
  };
  for (const v of city.matrices[by].streets) {
    const m = Math.max(Math.abs(v), Math.abs(v + w));
    if (m > RAD - 4) continue;
    const c = Math.sqrt((RAD - 4) ** 2 - m * m);
    if (v + w > -F.d / 2 && v < F.d / 2) { strip(-c, -F.w / 2, v, v + w); strip(F.w / 2, c, v, v + w); }
    else strip(-c, c, v, v + w);
  }
  for (const s of [-1, 1]) strip(-F.w / 2 - w, F.w / 2 + w, s * (F.d / 2 + w / 2) - w / 2, s * (F.d / 2 + w / 2) + w / 2);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
  streetsObj = new THREE.Mesh(g, paving); streetsObj.receiveShadow = true;
  streetsObj.add(new THREE.LineSegments(lg, kerb));
  scene.add(streetsObj);
}

let sunHour = 15.25, sunSeason = 'equinox', sunPlaying = false;
const sunDir = new THREE.Vector3(0.4, 0.7, 0.5);
// Shadow frustum follows the view: tight and crisp at eye height, wide from the air
function fitShadow() {
  const walk = camMode === 'walk';
  const c = walk ? perspCam.position : controls.target;
  const dist = walk ? 0 : camMode === 'plan' ? 900 / orthoCam.zoom : perspCam.position.distanceTo(controls.target);
  // the covered ground grows in steps and its centre moves in steps, so the map is redrawn only now and then
  const ext = Math.min(RAD + 190, walk ? 170 : 170 * 1.12 ** Math.ceil(Math.log(Math.max(1, dist * 0.62 / 170)) / Math.log(1.12)));
  const sc = sun.shadow.camera, far = RAD * 3.2 + 600;
  // snap the centre to shadow texels so the map does not swim while panning
  const tex = (2 * ext) / 4096 * (walk ? 96 : 32), cx = Math.round(c.x / tex) * tex, cz = Math.round(c.z / tex) * tex;
  const key = cx + ',' + cz + ',' + ext;
  if (key !== shadowKey) { shadowKey = key; renderer.shadowMap.needsUpdate = true; }
  sun.target.position.set(cx, 0, cz);
  sun.position.set(cx, 0, cz).addScaledVector(sunDir, far * 0.5);
  if (sc.right !== ext) { sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.near = 10; sc.far = far; sc.updateProjectionMatrix(); }
  sun.shadow.normalBias = 0.05 + ext / 1400;
}
function updateSun() {
  const s = computeRomanSun(sunHour, sunSeason);
  sun.color.copy(s.sunColor);
  sunDir.copy(s.dir); shadowKey = '';
  hemi.color.copy(s.hemiTop);
  hemi.groundColor.copy(s.hemiGround);
  scene.background.copy(s.horizon);
  if (scene.fog) scene.fog.color.copy(s.horizon);
  const su = sky.userData.u;
  su.uSun.value.copy(s.dir); su.uZenith.value.copy(s.zenith); su.uHorizon.value.copy(s.horizon); su.uSunCol.value.copy(s.sunColor);
  sun.intensity = 4.2 * Math.min(1, 0.35 + s.altDeg / 28);
  const hh = Math.floor(sunHour), mm = Math.round((sunHour - hh) * 60);
  $('#sunReadout').textContent = `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 59 : mm).padStart(2, '0')} · ${s.shadowNine.toFixed(1)}:9`;
  dirty = true;
}

function reframe() {
  for (const obj of [frame, contoursObj, compassObj, extLandmarksMesh, grovesObj]) {
    if (obj) { scene.remove(obj); obj.traverse(o => o.geometry?.dispose()); }
  }
  const r = RAD, m = new M(), Rw = r + 14, n = Math.ceil((2 * Math.PI * Rw) / city.bowshot), S = C.stone;
  const gate = new Set([0, 1, 2, 3].map(k => Math.floor((((TH + (k * Math.PI) / 2) % (2 * Math.PI)) / (2 * Math.PI)) * n)));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI, x = (Rw + 2.4) * Math.cos(a), z = (Rw + 2.4) * Math.sin(a), y = ground(x, z, r);
    const g = gate.has(i) || gate.has((i - 1 + n) % n);
    m.cyl(x, y - 8, z, 4.6, 4.3, g ? 26 : 22, S, 14);
    m.cyl(x, y + (g ? 18 : 14), z, 5, 5, 1.2, S, 14);
    if (gate.has(i)) continue;
    const am = ((i + 0.5) / n) * 2 * Math.PI, q = Rw * Math.cos(Math.PI / n), cx = q * Math.cos(am), cz = q * Math.sin(am), len = 2 * Rw * Math.sin(Math.PI / n);
    m.at(cx, ground(cx, cz, r) - 8, cz, Math.atan2(-Math.cos(am), -Math.sin(am)), () => {
      m.box(0, 0, 0, len, 17, 3, S);
      m.box(0, 17, -1.2, len, 1, 0.6, S);
    });
  }
  const F = city.forum, T = 5.25, A = 2.625, nL = Math.floor((F.w - 2) / A), nS = Math.floor((F.d - 2 * T - 6) / A);
  m.at(0, ground(0, 0, r) + 0.3, 0, -TH, () => {
    m.box(0, -20, 0, F.w, 20.1, F.d, C.marble);
    m.at(0, 0.1, -F.d / 2 + T / 2 + 0.4, 0, () => GEN.stoa(m, { n: nL, storeys: 2 }));
    m.at(0, 0.1, F.d / 2 - T / 2 - 0.4, Math.PI, () => GEN.stoa(m, { n: nL, storeys: 2 }));
    m.at(F.w / 2 - T / 2 - 0.4, 0.1, 0, -Math.PI / 2, () => GEN.stoa(m, { n: nS, storeys: 2 }));
    m.at(-F.w / 2 + T / 2 + 0.4, 0.1, 0, Math.PI / 2, () => GEN.stoa(m, { n: nS, storeys: 2 }));
    m.at(0, 0.1, 0, 0, () => GEN.amussium(m, {}));
  });
  const g = geomOf(m);
  frame = new THREE.Mesh(g, mat); frame.castShadow = frame.receiveShadow = true;
  frame.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 38), ink));
  scene.add(frame);

  contoursObj = buildContours(r, (x, z) => ground(x, z, r));
  scene.add(contoursObj);

  compassObj = buildCompassRose(r, TH, (x, z) => ground(x, z, r));
  scene.add(compassObj);
  if (compassObj.userData.landmarksGeom) {
    const lg = compassObj.userData.landmarksGeom;
    lg.computeBoundingSphere();
    extLandmarksMesh = new THREE.Mesh(lg, mat);
    extLandmarksMesh.castShadow = extLandmarksMesh.receiveShadow = true;
    extLandmarksMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(lg, 38), ink));
    scene.add(extLandmarksMesh);
  }

  grovesObj = buildGroves(r, (x, z) => ground(x, z, r), mat);
  scene.add(grovesObj);
  scene.fog = new THREE.FogExp2(PAPER, 0.00027);
  controls.maxDistance = RAD * 5.2;
  updateSun();
}

// ---------------------------------------------------------------- elements & fast spatial bounds
const meshes = [];
const place = (e, m = by) => {
  const [x, z, north] = e.pos[m];
  const rot = e.face ? CARD_ROT[e.face] : (north ? Math.PI - TH : -TH);
  const lw = e.lotW || e.w, ld = e.lotD || e.d;
  const c = Math.abs(Math.cos(-TH)), s = Math.abs(Math.sin(-TH));
  const hx = (lw * c + ld * s) / 2, hz = (lw * s + ld * c) / 2;
  return {
    x, z, rot,
    y: Math.max(ground(x - hx, z - hz), ground(x + hx, z - hz), ground(x - hx, z + hz), ground(x + hx, z + hz)) + 0.55,
  };
};

let builtAt = performance.now();
for (let i = 0; i < E.length; i++) {
  const e = E[i];
  if (performance.now() - builtAt > 40) { // let the page breathe and show how far the building has come
    $('#enterBtn').textContent = `Building the city… ${Math.round(100 * i / E.length)}%`;
    await tick(); builtAt = performance.now();
  }
  const g = geomOf(build(e.form, e.params, e.scale)), mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = mesh.receiveShadow = true; mesh.userData = e; e.mesh = mesh;
  e.boundR = Math.hypot(e.w * 0.5, e.d * 0.5, e.h) + 2;
  const p = place(e); mesh.position.set(p.x, p.y, p.z); mesh.rotation.y = p.rot;
  scene.add(mesh); meshes.push(mesh);
}

const edgeQueue = E.slice();
function edgeStep() {
  for (const t0 = performance.now(); edgeQueue.length && performance.now() - t0 < 7;) {
    const e = edgeQueue.shift();
    e.edges = new THREE.LineSegments(new THREE.EdgesGeometry(e.mesh.geometry, 38), e === sel ? inkSel : e.mesh.material === matDim ? inkDim : ink);
    e.mesh.add(e.edges);
  }
  if (edgeQueue.length) requestAnimationFrame(edgeStep);
  dirty = true;
}

const dummy = new THREE.Object3D();
function repad() {
  E.forEach((e, i) => {
    const m = e.mesh;
    dummy.position.set(m.position.x, m.position.y - 20.02, m.position.z);
    dummy.rotation.y = -TH;
    dummy.scale.set((e.lotW || e.w) + 3.4, 40, (e.lotD || e.d) + 3.4);
    dummy.updateMatrix();
    pads.setMatrixAt(i, dummy.matrix);
  });
  pads.instanceMatrix.needsUpdate = true;
}
reground(); reframe(); restreet(); repad();

// ---------------------------------------------------------------- collision-free spatial labels
const labBox = $('#labels'), labs = [];
let fixedLabs = [];
function mkLab(text, cls, pos, prio = 3, on = null) {
  const el = document.createElement('div');
  el.className = 'lab ' + cls;
  el.textContent = text;
  if (on) el.onclick = on;
  labBox.append(el);
  const wEst = text.length * (cls === 'l0' ? 8.8 : cls === 'wind' ? 8.2 : 6.8) + (cls === 'l0' || cls === 'sel' || cls === 'plaque' ? 20 : 8);
  const hEst = cls === 'l0' || cls === 'sel' || cls === 'plaque' ? 22 : 16;
  const L = { el, pos, cls, prio, w: wEst, h: hEst };
  labs.push(L);
  return L;
}

function relabel() {
  for (const L of fixedLabs) { L.el.remove(); labs.splice(labs.indexOf(L), 1); }
  fixedLabs = [];
  city.matrices[by].labels.forEach(l => {
    const g = l.lv === 0 ? city.matrices[by].labels.filter(x => x.lv === 0).indexOf(l) : -1;
    fixedLabs.push(
      mkLab(
        l.t, 'l' + l.lv,
        new THREE.Vector3(l.x, ground(l.x, l.z) + (l.lv ? 24 : 44), l.z),
        l.lv === 0 ? 2 : 5,
        l.lv ? null : () => go(by === 'theme' ? `/d/${city.domains.find(d => d.title === l.t).id}` : `/g/${g}`)
      )
    );
  });
  WINDS_24.forEach((w, k) => {
    const major = k % 3 === 0;
    const a = (k * Math.PI) / 12, q = RAD + (major ? 104 : 68);
    const wx = q * Math.sin(a), wz = -q * Math.cos(a);
    fixedLabs.push(mkLab(w, 'wind' + (major ? '' : ' subwind'), new THREE.Vector3(wx, ground(wx, wz) + 2, wz), major ? 4 : 6));
  });
}

const selLab = mkLab('', 'sel', new THREE.Vector3(), 0);
selLab.el.style.display = 'none';
const walkPlaques = Array.from({ length: 4 }, () => {
  const L = mkLab('', 'plaque', new THREE.Vector3(), 1);
  L.el.style.display = 'none';
  return L;
});

const v3 = new THREE.Vector3();
function drawLabs() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const dist = camMode === 'walk' ? 0 : activeCam.position.distanceTo(controls.target);

  // Update nearby FPS plaques in Walk mode
  if (camMode === 'walk') {
    const near = E
      .map(e => ({ e, d: Math.hypot(e.mesh.position.x - activeCam.position.x, e.mesh.position.z - activeCam.position.z) }))
      .filter(x => x.d < 105 && x.e !== sel)
      .sort((a, b) => a.d - b.d)
      .slice(0, 4);
    walkPlaques.forEach((P, idx) => {
      const hit = near[idx];
      if (!hit) { P.active = false; P.el.style.display = 'none'; return; }
      P.active = true;
      const pedes = Math.round(hit.d / FT);
      P.el.innerHTML = `${esc(hit.e.title)} <small>${addr(hit.e.passages[0])} · ${pedes} pedes</small>`;
      P.w = hit.e.title.length * 7 + 102;
      P.pos.set(hit.e.mesh.position.x, hit.e.mesh.position.y + Math.min(hit.e.h + 4, 15), hit.e.mesh.position.z);
      P.el.onclick = () => go(`/e/${hit.e.id}`);
    });
  } else {
    walkPlaques.forEach(P => { P.active = false; P.el.style.display = 'none'; });
  }

  const cands = [];
  for (const L of labs) {
    if (L === selLab && !sel) { L.el.style.display = 'none'; continue; }
    if (L.cls === 'plaque' && !L.active) { L.el.style.display = 'none'; continue; }
    if (camMode === 'walk' && (L.cls === 'l0' || L.cls === 'l1' || L.cls.startsWith('wind'))) { L.el.style.display = 'none'; continue; }
    if (L.cls === 'l1' && dist > 620) { L.el.style.display = 'none'; continue; }
    if (L.cls.includes('subwind') && dist > 720) { L.el.style.display = 'none'; continue; }
    if (L.cls === 'l0' && dist < 135 && camMode !== 'plan') { L.el.style.display = 'none'; continue; }
    v3.copy(L.pos).project(activeCam);
    if (v3.z >= 1 || Math.abs(v3.x) > 0.98 || Math.abs(v3.y) > 0.96) { L.el.style.display = 'none'; continue; }
    const sx = (v3.x * 0.5 + 0.5) * w, sy = (-v3.y * 0.5 + 0.5) * h;
    // Avoid overlapping HUD cards (#head, #viewbar, #dock) on desktop & mobile
    if (w > 960) {
      if (sx < 450 && sy < 200 && L.prio >= 1) { L.el.style.display = 'none'; continue; }
      if (sy > h - 64) { L.el.style.display = 'none'; continue; }
    } else {
      if (sy < 155 || sy > h - 84) { L.el.style.display = 'none'; continue; }
    }
    cands.push({ L, sx, sy, z: v3.z });
  }

  cands.sort((a, b) => a.L.prio - b.L.prio || a.z - b.z);
  const boxes = [];
  const collides = (x0, y0, x1, y1) => boxes.some(b => x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]);

  for (const c of cands) {
    const hw = c.L.w * 0.5, hh = c.L.h * 0.5;
    const offsets = c.L.prio <= 2 ? [0, -20, 20, -38, 38] : [0];
    let placed = false;
    for (const dy of offsets) {
      const yTry = c.sy + dy;
      if (!collides(c.sx - hw - 4, yTry - hh - 3, c.sx + hw + 4, yTry + hh + 3)) {
        boxes.push([c.sx - hw - 4, yTry - hh - 3, c.sx + hw + 4, yTry + hh + 3]);
        c.L.el.style.display = '';
        c.L.el.style.left = c.sx.toFixed(1) + 'px';
        c.L.el.style.top = yTry.toFixed(1) + 'px';
        placed = true;
        break;
      }
    }
    if (!placed) c.L.el.style.display = 'none';
  }
}

// ---------------------------------------------------------------- camera modes: 3D, Walk (FPS), Plan Blueprint
function updateKeysHint() {
  const k = $('#keys'), sb = $('#scaleBar');
  if (camMode === 'walk') {
    sb.hidden = true;
    k.innerHTML = TOUCH ? '<span><b>stick</b> walk</span><span><b>drag</b> look</span><span><b>tap</b> read a building</span>'
      : '<span><b>W A S D</b> walk</span><span><b>drag</b> look</span><span><b>Shift</b> run</span><span><b>click</b> read a building</span><span><b>Esc</b> back to the air</span>';
  } else if (camMode === 'plan') {
    sb.hidden = false;
    k.innerHTML = TOUCH ? '<span><b>drag</b> pan</span><span><b>pinch</b> zoom</span><span><b>tap</b> read a building</span>' : '<span><b>drag</b> pan</span><span><b>wheel</b> zoom</span><span><b>click</b> read a building</span>';
    updateScaleBar();
  } else {
    sb.hidden = true;
    k.innerHTML = TOUCH ? '<span><b>drag</b> move</span><span><b>two fingers</b> turn and zoom</span><span><b>tap</b> read a building</span>'
      : '<span><b>drag</b> move</span><span><b>right-drag</b> turn</span><span><b>wheel</b> zoom</span><span><b>click</b> read a building</span><span><b>F</b> walk</span>';
  }
}

function updateScaleBar() {
  if (camMode !== 'plan') return;
  const w = canvas.clientWidth || 1;
  const metresPerPx = (orthoCam.right - orthoCam.left) / orthoCam.zoom / w;
  const choices = [25, 50, 100, 200, 500, 1000]; // in Roman pedes
  let bestPedes = 100;
  for (const pd of choices) {
    const px = (pd * FT) / metresPerPx;
    if (px >= 64 && px <= 190) { bestPedes = pd; break; }
  }
  const mVal = bestPedes * FT;
  const pxW = Math.max(44, Math.min(200, mVal / metresPerPx));
  $('#scalePx').style.width = pxW.toFixed(0) + 'px';
  $('#scaleTxt').textContent = `${bestPedes} pedes · ${mVal.toFixed(1)} m`;
}

function setCamMode(mode, targetEl = sel) {
  if (mode === camMode && mode !== 'walk') return;
  const prev = camMode;
  camMode = mode;
  document.body.classList.toggle('mode-walk', mode === 'walk');
  if (mode === 'walk' && narrow()) setSheet('peek'); // the street needs the whole screen
  shadowKey = '';
  canvas.classList.toggle('walk', mode === 'walk');
  $$('#camModes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cam === mode)));

  if (mode === 'plan') {
    controls.enabled = true;
    controls.object = orthoCam;
    controls.enableRotate = false;
    activeCam = orthoCam;
    const dist = prev === '3d' ? perspCam.position.distanceTo(controls.target) : RAD * 2.2;
    const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600, asp = w / h;
    const viewH = Math.max(120, dist * 0.62);
    orthoCam.left = (-viewH * asp) / 2; orthoCam.right = (viewH * asp) / 2;
    orthoCam.top = viewH / 2; orthoCam.bottom = -viewH / 2;
    orthoCam.zoom = 1;
    orthoCam.position.set(controls.target.x, 1800, controls.target.z);
    orthoCam.up.set(0, 0, -1);
    orthoCam.lookAt(controls.target.x, 0, controls.target.z);
    orthoCam.updateProjectionMatrix();
    fly = null;
  } else if (mode === 'walk') {
    activeCam = perspCam;
    perspCam.up.set(0, 1, 0);
    perspCam.fov = canvas.clientWidth < canvas.clientHeight ? 70 : 52; perspCam.near = 0.28; // an upright phone needs a wider lens
    perspCam.updateProjectionMatrix();
    controls.enabled = false;
    // Choose street arrival point in front of targetEl, or Forum marble amussium
    let tx = 0, tz = 28, lookX = 0, lookY = 6, lookZ = -18;
    if (targetEl) {
      const m = targetEl.mesh, rot = m.rotation.y;
      const dFront = (Math.max(targetEl.w, targetEl.d) * 0.62 + Math.max(13, targetEl.h * 1.0)) * (canvas.clientWidth < canvas.clientHeight ? 1.45 : 1);
      // Pick the clearest street/plaza vantage angle in front of or diagonally framing the facade
      let bestScore = -1e9;
      for (const da of [0.32, -0.32, 0, 0.68, -0.68, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2, Math.PI + 0.3, Math.PI - 0.3]) {
        const a = rot + da;
        const cx = m.position.x + Math.sin(a) * dFront;
        const cz = m.position.z + Math.cos(a) * dFront;
        let minClear = 999;
        for (const o of E) {
          if (o === targetEl) continue;
          const rO = Math.hypot(o.w, o.d) * 0.52 + 3.5;
          const clr = Math.hypot(cx - o.mesh.position.x, cz - o.mesh.position.z) - rO;
          if (clr < minClear) minClear = clr;
        }
        // nothing may stand between the eye and the building
        let blocked = 0;
        const sx = m.position.x - cx, sz = m.position.z - cz, sl = sx * sx + sz * sz;
        for (const o of E) {
          if (o === targetEl) continue;
          const t = Math.max(0, Math.min(0.8, ((o.mesh.position.x - cx) * sx + (o.mesh.position.z - cz) * sz) / sl));
          if (Math.hypot(cx + sx * t - o.mesh.position.x, cz + sz * t - o.mesh.position.z) < Math.max(o.w, o.d) * 0.45) blocked++;
        }
        if (Math.hypot(cx, cz) > RAD - 6) blocked += 2;
        const score = Math.min(22, minClear) - Math.abs(da) * 3.5 - blocked * 40 - Math.max(0, m.position.y - 0.6 - ground(cx, cz)) * 9;
        if (score > bestScore) { bestScore = score; tx = cx; tz = cz; }
      }
      lookX = m.position.x; lookY = m.position.y + Math.min(targetEl.h * 0.45, 11); lookZ = m.position.z;
    } else {
      const gy = ground(0, 0);
      tx = 10; tz = 6; lookX = -4; lookY = gy + 7.5; lookZ = -60;
    }
    const ty = walkGround(tx, tz) + 1.7;
    walkState.yaw = Math.atan2(lookX - tx, lookZ - tz);
    walkState.pitch = Math.max(-0.35, Math.min(0.45, Math.atan2(lookY - ty, Math.hypot(lookX - tx, lookZ - tz))));
    fly = {
      t0: performance.now(), ms: 950, walkArrive: true,
      fp: perspCam.position.clone(), tp: new THREE.Vector3(tx, ty, tz),
      ft: controls.target.clone(), tt: new THREE.Vector3(lookX, lookY, lookZ),
    };
  } else {
    // 3d Scaenographia
    activeCam = perspCam;
    perspCam.up.set(0, 1, 0);
    perspCam.fov = 32; perspCam.near = 1.2;
    perspCam.updateProjectionMatrix();
    controls.object = perspCam;
    controls.enabled = true;
    controls.enableRotate = true;
    if (prev === 'walk') {
      const fwdX = Math.sin(walkState.yaw), fwdZ = Math.cos(walkState.yaw);
      controls.target.set(perspCam.position.x + fwdX * 28, ground(perspCam.position.x, perspCam.position.z), perspCam.position.z + fwdZ * 28);
      if (sel) flyEl(sel); else home();
    } else if (prev === 'plan') {
      perspCam.position.set(controls.target.x - 180, 340, controls.target.z + 360);
      if (sel) flyEl(sel); else home();
    }
  }
  updateKeysHint();
  paint();
}

// Where feet stand: the terrain, or the terrace of the building whose plot one is on
function walkGround(x, z) {
  let y = Math.max(SEA_Y + 0.5, ground(x, z));
  const u = x * cT + z * sT, v = -x * sT + z * cT;
  for (const e of E) {
    const p = e.mesh.position, eu = p.x * cT + p.z * sT, ev = -p.x * sT + p.z * cT;
    if (Math.abs(u - eu) < ((e.lotW || e.w) + 3.4) / 2 && Math.abs(v - ev) < ((e.lotD || e.d) + 3.4) / 2 && p.y > y) y = p.y;
  }
  return y;
}
// Walls stop the walker and steps carry him: two chest-high rays ahead, one ray down for the floor underfoot
const wRay = new THREE.Raycaster(), wO = new THREE.Vector3(), wD = new THREE.Vector3(), wN = new THREE.Vector3();
const STEP_UP = 0.62, BODY = 0.42;
function walkSolids(x, z, reach) {
  const out = [];
  for (let i = 0; i < meshes.length; i++) {
    const m = meshes[i];
    if (m.visible && Math.hypot(m.position.x - x, m.position.z - z) < m.userData.boundR + reach) out.push(m);
  }
  if (frame) out.push(frame);
  if (extLandmarksMesh) out.push(extLandmarksMesh);
  return out;
}
function walkBlocked(solids, x, feet, z, dx, dz, len) {
  let best = null;
  for (const h of [0.85, 1.55]) {
    wO.set(x, feet + h, z); wD.set(dx, 0, dz);
    wRay.set(wO, wD); wRay.near = 0; wRay.far = len + BODY;
    const hit = wRay.intersectObjects(solids, false)[0];
    if (hit && hit.face && (!best || hit.distance < best.distance)) best = hit;
  }
  return best;
}
function walkFloor(solids, x, feet, z) {
  let y = walkGround(x, z);
  wO.set(x, feet + STEP_UP, z); wD.set(0, -1, 0);
  wRay.set(wO, wD); wRay.near = 0; wRay.far = STEP_UP + 40;
  const hit = wRay.intersectObjects(solids, false)[0];
  if (hit && hit.point.y > y) y = hit.point.y;
  return y;
}
function syncWalkLook() {
  const cp = Math.cos(walkState.pitch), sp = Math.sin(walkState.pitch);
  const dx = Math.sin(walkState.yaw) * cp, dz = Math.cos(walkState.yaw) * cp;
  perspCam.lookAt(perspCam.position.x + dx * 20, perspCam.position.y + sp * 20, perspCam.position.z + dz * 20);
}

// ---------------------------------------------------------------- selection, highlight & flight
function paint() {
  for (const e of E) {
    const m = e === sel ? (camMode === 'walk' ? mat : matSel) : hi ? (hi.has(e) ? (e === hover ? matSel : matHi) : matDim) : e === hover ? matHi : mat;
    const edgeM = e === sel && camMode !== 'walk' ? inkSel : m === matDim ? inkDim : ink;
    if (e.mesh.material !== m) {
      e.mesh.material = m;
      e.mesh.castShadow = m !== matDim; shadowKey = '';
    }
    if (e.edges && e.edges.material !== edgeM) e.edges.material = edgeM;
  }
  if (sel) {
    selLab.el.textContent = `${sel.title} · ${addr(sel.passages[0])}`;
    selLab.w = selLab.el.textContent.length * 7.2 + 24;
    selLab.pos.set(sel.mesh.position.x, sel.mesh.position.y + sel.h + 6, sel.mesh.position.z);
  }
  dirty = true;
}

function flyTo(target, dist, az, polar = 1.0, ms = 1050) {
  if (camMode === 'walk') return;
  if (camMode === 'plan') {
    controls.target.set(target.x, 0, target.z);
    orthoCam.position.set(target.x, 1800, target.z);
    const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
    const viewH = Math.max(90, dist * 0.65);
    orthoCam.zoom = (orthoCam.top - orthoCam.bottom) / viewH;
    orthoCam.updateProjectionMatrix();
    updateScaleBar();
    dirty = true;
    return;
  }
  const off = new THREE.Vector3().setFromSphericalCoords(dist, polar, az);
  fly = { t0: performance.now(), ms, ft: controls.target.clone(), fp: perspCam.position.clone(), tt: target.clone(), tp: target.clone().add(off) };
}

const flyEl = e => {
  if (camMode === 'walk') { setCamMode('walk', e); return; }
  const m = e.mesh, flat = e.h < 0.4 * Math.max(e.w, e.d);
  flyTo(
    new THREE.Vector3(m.position.x, m.position.y + e.h * 0.35, m.position.z),
    Math.max(62, 2.85 * Math.max(e.w, e.d, e.h * 1.3)),
    m.rotation.y + (e.form === 'theatre' ? Math.PI - 0.5 : 0.55),
    flat ? 0.84 : 1.08
  );
};

function flySet(set) {
  if (!set.size || camMode === 'walk') return;
  const b = new THREE.Box3();
  for (const e of set) b.expandByPoint(e.mesh.position);
  const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  flyTo(c, Math.max(240, Math.max(s.x, s.z) * 1.85 + 150), -0.35, 0.82);
}

const home = () => flyTo(new THREE.Vector3(0, 0, RAD * 0.05), RAD * 2.9, -0.42, 0.93, 1500);

function setBy(m, instant) {
  if (m === by && !instant) return;
  by = m; RAD = city.matrices[by].r;
  reground(); reframe(); restreet();
  const t0 = performance.now();
  move = {
    t0,
    items: E.map((e, i) => ({
      e,
      a: { x: e.mesh.position.x, y: e.mesh.position.y, z: e.mesh.position.z, rot: e.mesh.rotation.y },
      b: place(e),
      d: (i % 40) * 14,
    })),
  };
  for (const it of move.items) {
    let dr = it.b.rot - it.a.rot;
    while (dr > Math.PI) dr -= 2 * Math.PI;
    while (dr < -Math.PI) dr += 2 * Math.PI;
    it.dr = dr;
  }
  if (instant) move.t0 = -1e9;
  relabel();
  for (const b of $('#by').children) b.setAttribute('aria-selected', String(b.dataset.m === by));
  $('#bynote').textContent = city.matrices[by].note;
  dirty = true;
}

// ---------------------------------------------------------------- scholarly text formatting & citations
const link = e => `<a href="#/e/${e.id}">${esc(e.title)}</a>`;
const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const crumbs = (...xs) => `<div class="crumbs">${['<a href="#/">City</a>', ...xs].join('<span>›</span>')}</div>`;

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

function formatCitation(e, pid) {
  const p = pid || e.passages[0];
  const pm = P_META[p];
  const pgs = pm ? `, ${pgStr(pm)}` : '';
  return `Vitruvius, De Architectura ${addr(p)} (trans. M. H. Morgan, Harvard University Press, 1914${pgs}; Latin ed. F. Krohn, Leipzig: Teubner, 1912). In Poturak, Semir, PhD, "Vitruvius — The City of the Ten Books" [${e.title}, element ${e.id}].`;
}

// Format Morgan 1914 text with rule underlines, Greek italics, and inline [p. N] physical page-turn markers
function renderEnglish(pid, e) {
  const raw = TEXT[pid], pm = P_META[pid];
  // Map raw character positions -> clean display text + track Greek & page breaks
  let clean = '', last = 0, m;
  const greek = [], rawToClean = new Int32Array(raw.length + 1);
  const re = /\[Greek:\s*([^\]]+)\]|\[\d+\]/g;
  let ri = 0;
  while ((m = re.exec(raw))) {
    while (ri <= m.index) rawToClean[ri++] = clean.length + (ri - 1 - last);
    clean += raw.slice(last, m.index);
    if (m[1]) {
      greek.push([clean.length, clean.length + m[1].length]);
      clean += m[1];
    }
    last = re.lastIndex;
    while (ri <= last) rawToClean[ri++] = clean.length;
  }
  while (ri <= raw.length) { rawToClean[ri] = clean.length + (ri - last); ri++; }
  clean += raw.slice(last);

  // Rule quote spans in clean text (matching whitespace-normalized)
  const rs = (rulesAt[pid] || []).map(id => {
    const q = RULES[id].quote.replace(/\[Greek:\s*([^\]]+)\]/g, '$1').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
    const normClean = clean.replace(/\s+/g, ' ');
    const idx = normClean.indexOf(q);
    if (idx < 0) return null;
    return { i: idx, j: idx + q.length, id };
  }).filter(Boolean).sort((a, b) => a.i - b.i);

  const breaks = new Map();
  if (pm?.pb) {
    for (const [rawOff, pageNum] of pm.pb) {
      const cOff = rawToClean[Math.min(raw.length, Math.max(0, rawOff))];
      // Snap to nearest space so we never split a word
      let snap = cOff;
      while (snap < clean.length && clean[snap] !== ' ') snap++;
      breaks.set(snap, pageNum);
    }
  }

  const cuts = new Set([0, clean.length]);
  rs.forEach(r => { cuts.add(r.i); cuts.add(r.j); });
  greek.forEach(g => { cuts.add(g[0]); cuts.add(g[1]); });
  breaks.forEach((_, pos) => cuts.add(pos));
  const pts = [...cuts].sort((a, b) => a - b);

  let out = '', openRule = null;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    if (breaks.has(a)) {
      out += ` <span class="folio" title="Turn to page ${breaks.get(a)} in Morgan (1914) Harvard University Press">[p. ${breaks.get(a)}]</span> `;
    }
    const r = rs.find(x => x.i <= a && x.j >= b);
    const g = greek.some(x => x[0] <= a && x[1] >= b);
    if (openRule && openRule !== r) { out += '</mark>'; openRule = null; }
    if (r && !openRule) {
      out += `<mark class="${e && e.rules.includes(r.id) ? 'here' : 'else'}" title="${esc(RULES[r.id].does)}">`;
      openRule = r;
    }
    const seg = esc(clean.slice(a, b));
    out += g ? `<i class="gr">${seg}</i>` : seg;
  }
  if (openRule) out += '</mark>';
  return out;
}

function passageBody(pid, e) {
  if (lang === 'en') {
    return TEXT ? `<p class="txt">${renderEnglish(pid, e)}</p>` : '<p class="load">Loading English text…</p>';
  }
  if (lang === 'la') {
    return LATIN ? `<p class="lat-txt">${esc(LATIN[pid] || '')}</p>` : '<p class="load">Loading Krohn (1912) Original Latin…</p>';
  }
  // Parallel bilingual
  return `<div class="bi-grid">
    <div><div class="bi-col-lbl">Morgan 1914 · English</div>${TEXT ? `<p class="txt">${renderEnglish(pid, e)}</p>` : '<p class="load">Loading…</p>'}</div>
    <div><div class="bi-col-lbl">Krohn 1912 · Original Latin</div>${LATIN ? `<p class="lat-txt">${esc(LATIN[pid] || '')}</p>` : '<p class="load">Loading Latin…</p>'}</div>
  </div>`;
}

function passage(pid, e, open) {
  const p = map.passages[pid], pm = P_META[pid];
  const shapes = (rulesAt[pid] || []).map(id => `<a href="#/r/${id}">${esc(RULES[id].does)} <i>(${pl(ruleUse[id]?.length || 0, 'building')}${city.frameRules.includes(id) ? ' &amp; city frame' : ''})</i></a>`);
  const scanHref = pm ? `${scholar.editions.en.scanBase}${pm.p0}/mode/1up` : '';
  const ctsHref = `${scholar.editions.la.urnBase}${ctsAddr(pid)}`;
  const sumLabel = lang === 'en' ? 'Morgan (1914) text' : lang === 'la' ? 'Krohn (1912) Original Latin' : 'Parallel English & Original Latin';
  return `<div class="psg${open ? ' on' : ''}" id="p-${pid}">
    <header>
      <div class="psg-left">
        <a class="addr" href="#/p/${pid}">${addr(pid)}</a>
        ${pm ? `<a class="pg-badge" href="${scanHref}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" title="Open physical page ${pm.p0} in Morgan (1914) Harvard University Press scan">Morgan 1914, ${pgStr(pm)} ↗</a>` : ''}
        <span>${KIND[p.k]}${p.m ? ` · ${pl(p.m, 'measure')}` : ''}</span>
      </div>
      <span class="ext-links">
        <a href="${ctsHref}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" title="Open Krohn (1912) Teubner Latin in Perseus Scaife CTS">Latin CTS ↗</a>
      </span>
    </header>
    <div class="gist">${esc(p.g)}</div>
    <details${open ? ' open' : ''}><summary>${sumLabel}</summary>${passageBody(pid, e)}</details>
    ${shapes.length ? `<div class="shapes">Architectural rule: ${shapes.join(' · ')}</div>` : ''}
  </div>`;
}

const ruleItem = id => {
  const r = RULES[id], pm = P_META[r.at];
  return `<li><a class="addr" href="#/p/${r.at}">${addr(r.at)}${pm ? `<br><small style="color:var(--soft);font-weight:400">p. ${pm.p0}</small>` : ''}</a><span class="does"><a href="#/r/${id}" style="border:0">${esc(r.does)}</a></span><span class="quote">${esc(r.quote)}</span></li>`;
};

// ---------------------------------------------------------------- guided tour bar
function syncTourBar() {
  const bar = $('#tourbar');
  if (!activeTour) { bar.hidden = true; return; }
  const { tour, idx } = activeTour, stop = tour.stops[idx];
  bar.hidden = false;
  bar.innerHTML = `
    <button type="button" id="tPrev" ${idx === 0 ? 'disabled' : ''}>←</button>
    <div><b>${idx + 1}/${tour.stops.length} · ${esc(tour.title)}</b><br><span style="opacity:.85">${addr(stop.p)} — ${esc(stop.note)}</span></div>
    <button type="button" id="tWalk" title="Drop to eye-level street walk here">Walk</button>
    <button type="button" id="tNext">${idx + 1 < tour.stops.length ? 'Next →' : 'Finish'}</button>
    <button type="button" id="tClose" aria-label="Exit tour">×</button>
  `;
  $('#tPrev').onclick = () => { if (idx > 0) go(`/tour/${tour.id}/${idx - 1}`); };
  $('#tNext').onclick = () => { if (idx + 1 < tour.stops.length) go(`/tour/${tour.id}/${idx + 1}`); else { activeTour = null; syncTourBar(); go('/tours'); } };
  $('#tWalk').onclick = () => setCamMode('walk', byId[stop.el]);
  $('#tClose').onclick = () => { activeTour = null; syncTourBar(); };
}

// ---------------------------------------------------------------- III.5 Interactive Ionic Plate Modal
function openIonicPlate(secOrd) {
  const modal = $('#plateModal'), iframe = $('#plateFrame');
  const hash = secOrd ? `#s=${secOrd}` : '';
  const targetSrc = `${BASE}/pilot/index.html${hash}`;
  if (!iframe.src || !iframe.src.includes('/pilot/index.html')) iframe.src = targetSrc;
  else if (hash) iframe.src = targetSrc;
  modal.hidden = false;
}
function closeIonicPlate() { $('#plateModal').hidden = true; }
$('#openPlateBtn').onclick = () => openIonicPlate();
$('#closePlateBtn').onclick = closeIonicPlate;
$('#plateJumpCity').onclick = () => closeIonicPlate();
$('#plateModal').addEventListener('click', ev => { if (ev.target === $('#plateModal')) closeIonicPlate(); });

// ---------------------------------------------------------------- panel pages
const PAGES = {
  ''() {
    hi = null; sel = null; activeTour = null; syncTourBar(); home();
    const b = E.filter(e => e.status === 'built');
    return `${crumbs()}<h2>One city, built twice from the ten books</h2>
<p class="lead">Every building here stands for passages of Vitruvius’ <i>De Architectura</i>. <b>Where</b> it stands is the text as data: 729 passages, arranged four ways. <b>How</b> it is built is the text applied: each form follows the rule that describes it, quoted word for word and tied to its page in Morgan’s English (1914) and Krohn’s Latin (1912).</p>
<div class="nums">
  <div><b>${E.length}</b>buildings and machines</div>
  <div><b>729</b>passages, pp. 3–319</div>
  <div><b>${Object.keys(RULES).length}</b>rules, quoted verbatim</div>
  <div><b>61</b>plates of 1914</div>
</div>
<div class="action-row">
  <a class="btn-sm primary" href="#/tours">Take a guided tour</a>
  <button type="button" class="btn-sm" data-act="walk-forum">Walk the forum</button>
  <button type="button" class="btn-sm cin" data-act="open-plate">One column, sentence by sentence</button>
</div>
<p class="note">${b.length} monuments are built directly as the architecture or machine their passages describe (${pl(b.reduce((s, e) => s + e.passages.length, 0), 'passage')}); ${E.length - b.length} civic stoas, exedrae, and libraries house theoretical arguments, stories, and prefaces (${E.filter(e => e.status !== 'built').reduce((s, e) => s + e.passages.length, 0)} passages).</p>
<h3>Four arrangements <small>the text as data</small></h3>
<ul class="list">${MATS.map(m => `<li><a href="#/?by=${m}">${city.matrices[m].label}</a><span>${esc(city.matrices[m].note)}</span></li>`).join('')}</ul>
<h3>Guided tours <small>walk the treatise</small></h3>
${city.tours.slice(0, 3).map(t => `<div class="tour-card"><h4><a href="#/tour/${t.id}/0" style="border:0">${esc(t.title)}</a></h4><p>${esc(t.sub)}</p><a class="btn-sm" href="#/tour/${t.id}/0">Begin (${t.stops.length} stops) →</a></div>`).join('')}
<p style="margin:6px 0 0"><a href="#/tours">View all ${city.tours.length} guided tours →</a></p>
<h3>City Frame <small>built from Books I &amp; V</small></h3>
<ol class="rules">${city.frameRules.map(ruleItem).join('')}</ol>
<h3>Eleven Domains</h3>
<ul class="list">${city.domains.map(d => `<li><a href="#/d/${d.id}">${d.id} · ${esc(d.title)}</a><span>${pl(E.filter(e => e.dom === d.id).length, 'monument')}</span></li>`).join('')}</ul>
<h3>Thirteen Cross-Book Threads</h3>
<ul class="list">${city.threads.map((t, i) => `<li><a href="#/t/${i}">${esc(t.title)}</a><span>${pl(t.passages.length, 'passage')}</span></li>`).join('')}</ul>
<h3>Fifty-Five Architectural Forms</h3>
<ul class="list">${Object.entries(FORMS).map(([k, F]) => [k, F, E.filter(e => e.form === k).length]).filter(x => x[2]).sort((a, b) => b[2] - a[2]).map(([k, F, n]) => `<li><a href="#/f/${k}">${esc(F.label)}</a><span>${n}</span></li>`).join('')}</ul>`;
  },

  e(id, pid) {
    const e = byId[id]; if (!e) return PAGES['']();
    sel = e; hi = null; flyEl(e);
    const T = TOPIC[e.topic], F = FORMS[e.form], kc = {};
    for (const p of e.passages) kc[KIND[map.passages[p].k]] = (kc[KIND[map.passages[p].k]] || 0) + 1;
    const books = [...new Set(e.passages.map(p => `Book ${ROMAN[p.split('.')[0]]}`))].join(', ');
    const sib = E.filter(x => x.topic === e.topic), i = E.indexOf(e);
    const par = Object.entries(e.params).map(([k, v]) => `${k}: ${v}`).join(' · ');
    const pgRange = e.pages[0] === e.pages[1] ? `p. ${e.pages[0]}` : `pp. ${e.pages[0]}–${e.pages[1]}`;
    const hasIonicPlate = e.passages.some(p => p.startsWith('3.5.'));

    // Collect Morgan/Warren 1914 plates & deduplicated entities for this monument
    const figIds = [...new Set(e.passages.flatMap(p => P_META[p]?.figs || []))];
    const entMap = new Map();
    for (const p of e.passages) for (const ent of ENT_BY_PASSAGE[p] || []) entMap.set(ent.kind + ':' + ent.id, ent);
    const ents = [...entMap.values()].slice(0, 18);

    const rows = {
      theme: `<a href="#/d/${T.dom.id}">${esc(T.dom.title)}</a> › ${esc(T.cat.title)}${e.title !== T.title ? ` › ${esc(T.title)}` : ''}`,
      book: `${books} · ${e.passages.length > 1 ? `${addr(e.passages[0])}–${addr(e.passages.at(-1))}` : addr(e.passages[0])} · Morgan ${pgRange}`,
      kind: Object.entries(kc).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(', '),
      thread: e.threads.length ? e.threads.map(t => `<a href="#/t/${t}">${esc(city.threads[t].title)}</a>`).join(', ') : 'outside the threads',
    };

    return `${crumbs(`<a href="#/d/${T.dom.id}">${esc(T.dom.title)}</a>`, esc(T.cat.title))}
<h2>${esc(e.title)}</h2>
<div class="meta">
  <span class="chip ${e.status}">${e.status}</span>
  ${e.face ? `<span class="chip face" title="Oriented to cardinal exposure by Vitruvian rule">${FACE_NAME[e.face]}</span>` : ''}
  <span class="chip pg">Morgan 1914, ${pgRange}</span>
  <a href="#/f/${e.form}">${esc(F.label)}</a> · ${pl(e.passages.length, 'passage')} · ${e.words} words${e.measures ? ` · ${pl(e.measures, 'measure')}` : ''}
</div>
<div class="action-row">
  <button type="button" class="btn-sm primary" data-act="walk-here" data-el="${e.id}">Walk here</button>
  <button type="button" class="btn-sm" data-act="cite" data-el="${e.id}" data-pid="${pid || e.passages[0]}">Copy citation</button>
  ${e.passages.length > 1 ? `<button type="button" class="btn-sm" data-act="expand-all">Open all passages</button>` : ''}
  ${hasIonicPlate ? `<button type="button" class="btn-sm cin" data-act="open-plate" data-ord="${(pid || e.passages[0]).split('.')[2]}">This column, sentence by sentence</button>` : ''}
</div>

<h3>Built by these rules <small>the text applied</small></h3>
${F.housed ? `<p class="note">${esc(F.housed)}</p>` : ''}
${e.rules.length ? `<ol class="rules">${e.rules.map(ruleItem).join('')}</ol>` : '<p class="note">Built directly from the qualitative description in the passages above; no single numeric formula governs its whole envelope.</p>'}
<p class="free">${par ? `<b>Parameters from text:</b> ${esc(par)}.<br>` : ''}<b>Module &amp; lot:</b> ${e.words} words allocate a precinct of ${(e.lotW || e.w).toFixed(0)} × ${(e.lotD || e.d).toFixed(0)} m (${Math.round((e.lotW || e.w) / FT)} × ${Math.round((e.lotD || e.d) / FT)} Roman <i>pedes</i>)${e.scale > 1.35 ? `; small apparatus scaled ${e.scale.toFixed(1)}× life size` : ''}. Proportions are invariant.</p>

<h3>The text <small>${lang === 'en' ? 'Morgan 1914 · the rules are underlined' : lang === 'la' ? 'Krohn 1912 · Original Latin' : 'Parallel Morgan 1914 &amp; Krohn 1912'}</small></h3>
${e.passages.map((p, idx) => passage(p, e, p === pid || (!pid && idx === 0))).join('')}

${figIds.length ? `<h3>Plates of the 1914 edition</h3>
${figIds.map(fid => {
  const f = FIG_BY_ID[fid];
  return `<div class="plate-card"><div><b>Plate ${f.id}.</b> ${esc(f.title)}</div><span><a href="${scholar.editions.en.scanBase}${f.page}/mode/1up" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">p. ${f.page} scan ↗</a></span></div>`;
}).join('')}` : ''}

<h3>Where it stands <small>in each arrangement</small></h3>
<table class="where">${MATS.map(m => `<tr class="${m === by ? 'on' : ''}"><td><a href="#/e/${e.id}?by=${m}" style="border:0">${city.matrices[m].label.replace('By ', 'by ')}</a></td><td>${rows[m]}</td></tr>`).join('')}</table>

${ents.length ? `<h3>People, places and terms</h3>
<div class="pill-row">${ents.map(ent => `<a class="pill" href="#/ent/${ent.kind}/${ent.id}">${esc(ent.name)} <small>${ent.passages.length}</small></a>`).join('')}</div>` : ''}

${sib.length > 1 ? `<h3>Beside it, on the same topic</h3><ul class="list">${sib.filter(x => x !== e).map(x => `<li>${link(x)}<span>${esc(FORMS[x.form].label)}</span></li>`).join('')}</ul>` : ''}
<div class="pn">${i ? `<span>← ${link(E[i - 1])}</span>` : '<span></span>'}${i < E.length - 1 ? `<span>${link(E[i + 1])} →</span>` : ''}</div>`;
  },

  p(pid) { const e = elOf[pid]; return e ? PAGES.e(e.id, pid) : PAGES[''](); },

  d(id) {
    const d = DOM[id]; if (!d) return PAGES['']();
    sel = null; hi = new Set(E.filter(e => e.dom === id)); flySet(hi);
    return `${crumbs(esc(d.part.toLowerCase()))}<h2>${d.id} · ${esc(d.title)}</h2>
<div class="meta">${pl(hi.size, 'monument')} · ${pl([...hi].reduce((s, e) => s + e.passages.length, 0), 'passage')}</div>
<ul class="list">${d.cats.map(c => `<li class="cat">${esc(c.title)}</li>` + E.filter(e => e.cat === c.id).map(e => `<li>${link(e)}<span>${esc(FORMS[e.form].label)} · p.${e.pages[0]}</span></li>`).join('')).join('')}</ul>`;
  },

  g(n) {
    const l = city.matrices[by].labels.filter(x => x.lv === 0)[+n]; if (!l) return PAGES['']();
    sel = null; hi = new Set(l.ids.map(i => byId[i])); flySet(hi);
    return `${crumbs(esc(city.matrices[by].label))}<h2>${esc(l.t)}</h2><div class="meta">${pl(hi.size, 'monument')}</div><ul class="list">${[...hi].map(e => `<li>${link(e)}<span>${esc(FORMS[e.form].label)} · p.${e.pages[0]}</span></li>`).join('')}</ul>`;
  },

  t(n) {
    const t = city.threads[+n]; if (!t) return PAGES['']();
    sel = null; hi = new Set(t.passages.map(p => elOf[p])); flySet(hi);
    return `${crumbs('thread')}<h2>${esc(t.title)}</h2>
<div class="meta">${pl(t.passages.length, 'passage')} in ${pl(hi.size, 'monument')} · ${pl(new Set([...hi].map(e => e.dom)).size, 'domain')}</div>
<p class="note"><a href="#/t/${n}?by=thread">Arrange the city by thread</a> to walk this idea along one continuous street.</p>
${t.passages.map(p => {
  const pm = P_META[p];
  return `<div class="psg"><header><div class="psg-left"><a class="addr" href="#/p/${p}">${addr(p)}</a>${pm ? `<span class="pg-badge">p. ${pm.p0}</span>` : ''}</div><span>${link(elOf[p])}</span></header><div class="gist">${esc(map.passages[p].g)}</div></div>`;
}).join('')}`;
  },

  r(id) {
    const r = RULES[id]; if (!r) return PAGES['']();
    sel = null; hi = new Set(ruleUse[id] || []); flySet(hi); const src = elOf[r.at];
    return `${crumbs('rule')}<h2>${esc(r.does)}</h2><ol class="rules">${ruleItem(id)}</ol>
<p class="note">Stated in ${link(src)}.${city.frameRules.includes(id) ? ' Also governs the urban frame of the city.' : ''}</p>
<h3>Monuments Built by This Rule <small>${pl(hi.size, 'monument')}</small></h3>
<ul class="list">${[...hi].map(e => `<li>${link(e)}<span>${esc(TOPIC[e.topic].dom.title)}</span></li>`).join('')}</ul>
${TEXT ? `<h3>Source Passage</h3>${passage(r.at, null, true)}` : ''}`;
  },

  f(k) {
    const F = FORMS[k]; if (!F) return PAGES['']();
    sel = null; hi = new Set(E.filter(e => e.form === k)); flySet(hi);
    const rs = [...new Set([...hi].flatMap(e => e.rules))];
    return `${crumbs('form')}<h2>${esc(F.label)}</h2><div class="meta">${pl(hi.size, 'monument')}</div>
${F.housed ? `<p class="note">${esc(F.housed)}</p>` : ''}
${rs.length ? `<h3>Governing Rules</h3><ol class="rules">${rs.map(ruleItem).join('')}</ol>` : ''}
<h3>Monuments in the City</h3>
<ul class="list">${[...hi].map(e => `<li>${link(e)}<span>${esc(TOPIC[e.topic].dom.title)} · p.${e.pages[0]}</span></li>`).join('')}</ul>`;
  },

  tours() {
    sel = null; hi = null; activeTour = null; syncTourBar(); home();
    return `${crumbs('guided tours')}<h2>Guided Architectural Tours</h2>
<p class="lead">Five curated paths across the Ten Books. Step from monument to monument in aerial 3D or drop directly to Roman street level.</p>
${city.tours.map(t => `<div class="tour-card">
  <h4>${esc(t.title)}</h4>
  <p>${esc(t.sub)}</p>
  <ul class="list" style="margin-bottom:8px">${t.stops.map((st, idx) => `<li><a href="#/tour/${t.id}/${idx}">${idx + 1}. ${addr(st.p)} · ${esc(byId[st.el].title)}</a><span>p. ${P_META[st.p]?.p0 || ''}</span></li>`).join('')}</ul>
  <a class="btn-sm primary" href="#/tour/${t.id}/0">Start Tour →</a>
</div>`).join('')}`;
  },

  tour(id, stepStr = '0') {
    const tour = city.tours.find(t => t.id === id);
    if (!tour) return PAGES.tours();
    const idx = Math.max(0, Math.min(tour.stops.length - 1, +stepStr || 0));
    const stop = tour.stops[idx];
    activeTour = { tour, idx };
    syncTourBar();
    return PAGES.e(stop.el, stop.p);
  },

  books() {
    sel = null; hi = null;
    return `${crumbs('books i–x')}<h2>The Ten Books · Table of Contents</h2>
<p class="note">Aligned with Morris Hicky Morgan’s 1914 Harvard University Press pagination (pp. 3–319) and Friedrich Krohn’s 1912 Teubner Latin edition.</p>
<p><a class="btn-sm" href="#/?by=book">Arrange 3D City by Book →</a></p>
<ul class="list">${toc.map(b => {
  const bPass = PASSAGES ? PASSAGES.filter(p => p.book === b.n) : [];
  const pRange = bPass.length ? `pp. ${bPass[0].p0}–${bPass.at(-1).p1}` : '';
  return `<li class="cat">Book ${ROMAN[b.n]} ${pRange ? `· ${pRange}` : ''}</li>` + b.chapters.map(c => {
    const firstId = `${b.n}.${c.n}.${b.n === 7 && c.n === 7 ? 0 : 1}`;
    const pm = P_META[firstId];
    return `<li><a href="#/p/${firstId}">${ROMAN[b.n]}.${c.n || 'pr'} · ${esc(c.title)}</a><span>${c.count} §${pm ? ` · p. ${pm.p0}` : ''}</span></li>`;
  }).join('');
}).join('')}</ul>`;
  },

  plates() {
    sel = null; hi = new Set(scholar.figures.flatMap(f => f.passages.map(p => elOf[p]).filter(Boolean))); flySet(hi);
    return `${crumbs('plates')}<h2>Morgan &amp; Warren (1914) Illustrations</h2>
<p class="note">All ${scholar.figures.length} historical plates, plans, and diagrams from the 1914 Harvard University Press edition (selected and drawn by Prof. H. L. Warren), linked to their 3D monuments and exact physical pages.</p>
<div class="action-row"><button type="button" class="btn-sm cin" data-act="open-plate">Open Interactive III.5 Ionic Plate (78 bindings)</button></div>
${scholar.figures.map(f => {
  const pid = f.passages[0], el = elOf[pid];
  return `<div class="plate-card">
    <div><b>${f.id}. <a href="#/p/${pid}">${esc(f.title)}</a></b><br><small style="color:var(--soft)">${addr(pid)} · ${el ? esc(el.title) : ''}</small></div>
    <span><a href="${scholar.editions.en.scanBase}${f.page}/mode/1up" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">p. ${f.page} ↗</a></span>
  </div>`;
}).join('')}`;
  },

  entities(kindFilter = 'all') {
    sel = null; hi = null;
    const tabs = [['all', 'Overview'], ['people', `People (${scholar.entities.people.length})`], ['places', `Places (${scholar.entities.places.length})`], ['terms', `Terms (${scholar.entities.terms.length})`]];
    const renderList = (k, lim) => `<ul class="list">${scholar.entities[k].slice(0, lim).map(x => `<li><a href="#/ent/${k}/${x.id}">${esc(x.name)}${x.aliases.length ? ` <small style="color:var(--muted)">(${esc(x.aliases.join(', '))})</small>` : ''}</a><span>${pl(x.passages.length, 'passage')}</span></li>`).join('')}</ul>`;
    return `${crumbs('scholarly index')}<h2>Prosopography, Gazetteer &amp; Lexicon</h2>
<div class="action-row">${tabs.map(([k, lbl]) => `<a class="btn-sm ${kindFilter === k ? 'primary' : ''}" href="#/entities/${k}">${lbl}</a>`).join('')}</div>
${kindFilter === 'all' ? `
  <h3>Architects, Authors &amp; Historical Figures <small>top 25 of ${scholar.entities.people.length}</small></h3>${renderList('people', 25)}
  <h3>Cities, Sanctuaries &amp; Quarries <small>top 25 of ${scholar.entities.places.length}</small></h3>${renderList('places', 25)}
  <h3>Greek &amp; Latin Architectural Terms <small>top 35 of ${scholar.entities.terms.length}</small></h3>${renderList('terms', 35)}
` : renderList(kindFilter, 500)}`;
  },

  ent(kind, id) {
    const list = scholar.entities[kind] || [];
    const ent = list.find(x => x.id === id);
    if (!ent) return PAGES.entities();
    sel = null;
    hi = new Set(ent.passages.map(p => elOf[p]).filter(Boolean));
    flySet(hi);
    return `${crumbs(`<a href="#/entities/${kind}">${esc(kind)}</a>`)}<h2>${esc(ent.name)}</h2>
<div class="meta">${pl(ent.passages.length, 'passage')} across ${pl(hi.size, 'monument')}${ent.aliases.length ? ` · Also in text as: <i>${esc(ent.aliases.join(', '))}</i>` : ''}</div>
<h3>Monuments in the City</h3>
<ul class="list">${[...hi].map(e => `<li>${link(e)}<span>${esc(FORMS[e.form].label)} · p.${e.pages[0]}</span></li>`).join('')}</ul>
<h3>Passages Mentioning ${esc(ent.name)}</h3>
${ent.passages.map(p => `<div class="psg"><header><div class="psg-left"><a class="addr" href="#/p/${p}">${addr(p)}</a>${P_META[p] ? `<span class="pg-badge">p. ${P_META[p].p0}</span>` : ''}</div><span>${link(elOf[p])}</span></header><div class="gist">${esc(map.passages[p].g)}</div></div>`).join('')}`;
  },

  about() {
    sel = null; hi = null;
    return `${crumbs('colophon & citation')}<h2>About This Edition</h2>
<p class="lead"><b>Vitruvius — The City of the Ten Books</b> is an interactive 3D spatial edition of Marcus Vitruvius Pollio’s <i>De Architectura Libri Decem</i>, conceived and authored by <b>PhD Poturak Semir</b>.</p>
<h3>Spatial Epistemology</h3>
<p class="txt">Vitruvius’ surviving manuscripts come down to us without his original drawings (<i>schemata</i>). This atlas reconstructs the treatise on two strictly verifiable axes:</p>
<ul class="list">
  <li><span>1. Distribution</span><span>Every one of the <b>729 passages</b> stands once inside a fortified circular city turned 22.5° between the 24 Roman winds (Book I.6), reorganizable live across four matrices: <i>Theme</i>, <i>Book</i>, <i>Kind of Statement</i>, and <i>Thread</i>.</span></li>
  <li><span>2. Parametric Form</span><span><b>132 verbatim rules</b> quoted word-for-word from Vitruvius generate <b>55 parametric 3D forms</b> across <b>261 monuments</b>, including cardinal solar exposures (IV.5.1, V.10.1, V.12.7, VI.4.1), Rome’s 9:8 equinoctial shadow (IX.7.1), and 78 sentence-to-stone bindings for the Ionic column of III.5.</span></li>
</ul>
<h3>Primary Textual Sources</h3>
<ul class="list">
  <li><b>English Translation &amp; Pagination (pp. 3–319)</b><span>M. H. Morgan, <i>Vitruvius: The Ten Books on Architecture</i>, illus. H. L. Warren, Harvard University Press, 1914 (Public Domain).</span></li>
  <li><b>Original Latin Text</b><span>F. Krohn (ed.), <i>Vitruvii De Architectura Libri Decem</i>, B. G. Teubner, Leipzig, 1912 (Perseus Digital Library CTS <code>phi1056.phi001.perseus-lat2</code>).</span></li>
</ul>
<h3>Scholarly Citation</h3>
<div class="cite-box">Poturak, Semir, PhD (2026). Vitruvius — The City of the Ten Books: Interactive 3D Spatial Edition of De Architectura (Morgan 1914 &amp; Krohn 1912).</div>
<div class="action-row"><button type="button" class="btn-sm primary" data-act="cite-work">Copy Work Citation</button></div>
<h3>Privacy &amp; Architecture</h3>
<p class="note">Zero tracking, zero cookies, zero external CDNs or third-party runtime requests. External archival page scans open only when explicitly clicked with <code>no-referrer</code> protection.</p>`;
  },

  s(qRaw) {
    const q = decodeURIComponent(qRaw || '').toLowerCase().trim();
    if (q.length < 1) return PAGES['']();
    const pgMatch = q.match(/^(?:p\.?\s*|page\s*)?(\d{1,3})$/);
    const pageNum = pgMatch ? +pgMatch[1] : null;

    const hit = E.map(e => {
      const ps = e.passages.filter(p => {
        if (pageNum !== null && P_META[p] && P_META[p].p0 <= pageNum && P_META[p].p1 >= pageNum) return true;
        if (addr(p).toLowerCase() === q || p === q) return true;
        if (map.passages[p].g.toLowerCase().includes(q)) return true;
        if (TEXT && TEXT[p].toLowerCase().includes(q)) return true;
        if (LATIN && LATIN[p] && LATIN[p].toLowerCase().includes(q)) return true;
        return false;
      });
      return { e, ps };
    }).filter(x => x.ps.length || (pageNum === null && x.e.title.toLowerCase().includes(q)));

    sel = null; hi = new Set(hit.map(x => x.e)); flySet(hi);
    return `${crumbs('search')}<h2>${pageNum !== null ? `Morgan (1914), page ${pageNum}` : `“${esc(q)}”`}</h2>
<div class="meta">${pl(hit.reduce((s, x) => s + x.ps.length, 0), 'passage')} in ${pl(hit.length, 'monument')}${!LATIN ? ' · <i>loading Latin index…</i>' : ' · English + Latin + Pages'}</div>
${hit.slice(0, 70).map(x => `<div class="psg"><header><span>${link(x.e)}</span><span class="pg-badge">p. ${x.e.pages[0]}</span></header>${x.ps.slice(0, 5).map(p => `<div class="gist"><a class="addr" href="#/p/${p}">${addr(p)}</a> <small style="color:var(--soft)">(p. ${P_META[p]?.p0 || ''})</small> ${esc(map.passages[p].g)}</div>`).join('')}</div>`).join('')}`;
  },
};

// ---------------------------------------------------------------- router & UI bindings
let lastPath = null;
function route(moveCam = true) {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const m = new URLSearchParams(qs || '').get('by');
  const [k, ...args] = path.split('/');
  if (m && city.matrices[m] && m !== by) setBy(m);
  if (k !== 'tour' && activeTour) { activeTour = null; syncTourBar(); }
  if (k === 's' && !LATIN) ensureLatin().then(() => { if (location.hash.startsWith('#/s/')) route(false); });

  const keep = !moveCam || path === lastPath, of = fly;
  const html = (PAGES[k] || PAGES[''])(...args);
  if (keep) fly = of;
  lastPath = path;
  $('#page').innerHTML = html;
  paint();
  const on = $('#page .psg.on');
  if (on && (k === 'p' || args[1])) on.scrollIntoView({ block: 'start' });
  else if (!keep) $('#page').scrollTop = 0;
}

const go = p => { location.hash = p + (by !== 'theme' ? `?by=${by}` : ''); };
addEventListener('hashchange', () => route());

// Delegated panel action buttons
$('#page').addEventListener('click', ev => {
  const btn = ev.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'walk-forum') setCamMode('walk', null);
  else if (act === 'walk-here') setCamMode('walk', byId[btn.dataset.el] || sel);
  else if (act === 'open-plate') openIonicPlate(btn.dataset.ord);
  else if (act === 'expand-all') $$('#page .psg details').forEach(d => { d.open = true; });
  else if (act === 'cite') {
    const txt = formatCitation(byId[btn.dataset.el], btn.dataset.pid);
    navigator.clipboard?.writeText(txt);
    toast('Scholarly citation copied to clipboard');
  } else if (act === 'cite-work') {
    const txt = 'Poturak, Semir, PhD (2026). Vitruvius — The City of the Ten Books: Interactive 3D Spatial Edition of De Architectura (Morgan 1914 & Krohn 1912).';
    navigator.clipboard?.writeText(txt);
    toast('Edition citation copied to clipboard');
  }
});

// Matrix tabs
$('#by').innerHTML = MATS.map(m => `<button role="tab" data-m="${m}">${city.matrices[m].label.replace('By ', '').replace('kind of statement', 'statement')}</button>`).join('');
$('#by').onclick = ev => {
  const m = ev.target.dataset.m;
  if (m) {
    const p = location.hash.replace(/^#/, '').split('?')[0] || '/';
    location.hash = p + (m !== 'theme' ? `?by=${m}` : '');
    if (m === 'theme') setBy(m);
  }
};

// Edition language switcher (EN | LAT | EN+LAT)
$('#langBar').onclick = async ev => {
  const b = ev.target.closest('[data-lang]');
  if (!b || b.dataset.lang === lang) return;
  lang = b.dataset.lang;
  $$('#langBar button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.lang === lang)));
  if (lang !== 'en' && !LATIN) {
    toast('Loading Krohn (1912) Original Latin…');
    await ensureLatin();
  }
  route(false);
};

// Camera mode toolbar & panel toggle
$('#camModes').onclick = ev => {
  const b = ev.target.closest('[data-cam]');
  if (b) setCamMode(b.dataset.cam, sel);
};
$('#togglePanel').onclick = () => {
  const shut = document.body.classList.toggle('panel-shut');
  $('#togglePanel').textContent = shut ? '‹' : '›';
};
// On a phone the panel is a sheet from below with three rests: a strip, half the screen, nearly all of it
function setSheet(to) {
  const b = document.body.classList;
  b.toggle('panel-shut', to === 'peek'); b.toggle('sheet-full', to === 'full');
  $('#togglePanel').textContent = to === 'peek' ? '‹' : '›';
  dirty = true;
}
{
  const grab = $('#grab'), panel = $('#panel'); let y0 = null, top0 = 0, moved = 0;
  const state = () => (document.body.classList.contains('panel-shut') ? 'peek' : document.body.classList.contains('sheet-full') ? 'full' : 'half');
  grab.addEventListener('pointerdown', ev => { y0 = ev.clientY; moved = 0; top0 = panel.getBoundingClientRect().top; grab.setPointerCapture(ev.pointerId); panel.style.transition = 'none'; });
  grab.addEventListener('pointermove', ev => {
    if (y0 === null) return;
    moved = ev.clientY - y0;
    panel.style.transform = `translateY(${Math.max(0, top0 + moved - (innerHeight - panel.offsetHeight))}px)`;
  });
  const end = () => {
    if (y0 === null) return;
    y0 = null; panel.style.transition = ''; panel.style.transform = '';
    const s = state();
    if (Math.abs(moved) < 8) setSheet(s === 'peek' ? 'half' : s === 'half' ? 'full' : 'half');
    else { const top = (top0 + moved) / innerHeight; setSheet(top > 0.74 ? 'peek' : top < 0.36 ? 'full' : 'half'); }
  };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
}

// Solar Analemma controls & Soundscape
$('#sunSeason').onchange = ev => { sunSeason = ev.target.value; updateSun(); };
$('#sunHour').oninput = ev => { sunHour = +ev.target.value; updateSun(); };
$('#sunPlay').onclick = () => {
  sunPlaying = !sunPlaying;
  $('#sunPlay').textContent = sunPlaying ? '❚❚' : '▶';
  dirty = true;
};
const sound = new VitruvianSound();
$('#soundBtn').onclick = () => {
  const on = sound.toggle();
  $('#soundBtn').setAttribute('aria-pressed', String(on));
  $('#soundBtn').textContent = on ? 'Sound on' : 'Sound off';
};

// Search input
let qT;
$('#q').oninput = ev => {
  const v = ev.target.value;
  $('#qClear').hidden = !v.length;
  clearTimeout(qT);
  qT = setTimeout(() => go(v.trim().length > 0 ? `/s/${encodeURIComponent(v.trim())}` : '/'), 240);
};
$('#qClear').onclick = () => { $('#q').value = ''; $('#qClear').hidden = true; go('/'); };

// Keyboard shortcuts & WASD walk tracking
addEventListener('keydown', ev => {
  if (!$('#plateModal').hidden && ev.key === 'Escape') { closeIonicPlate(); return; }
  if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') {
    if (ev.key === 'Escape') ev.target.blur();
    return;
  }
  if (ev.key === '/') { ev.preventDefault(); if (document.body.classList.contains('panel-shut')) $('#togglePanel').click(); $('#q').focus(); return; }
  if (ev.key === ']') { $('#togglePanel').click(); return; }
  if (ev.key === 'm' || ev.key === 'M') { $('#soundBtn').click(); return; }
  if (ev.key === 'v' || ev.key === 'V') {
    const next = camMode === '3d' ? 'walk' : camMode === 'walk' ? 'plan' : '3d';
    setCamMode(next, sel); return;
  }
  if ((ev.key === 'f' || ev.key === 'F') && camMode !== 'walk') { setCamMode('walk', sel); return; }
  if (camMode === 'walk') {
    const k = ev.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' '].includes(k)) {
      if (k === ' ' && walkState.hopY <= 0.01) walkState.velY = 5.6;
      walkState.keys.add(k);
      dirty = true;
      if (k.startsWith('arrow') || k === ' ') ev.preventDefault();
      return;
    }
    if (ev.key === 'Escape') { setCamMode('3d', sel); return; }
  }
  if (ev.key >= '1' && ev.key <= '4') $('#by').children[ev.key - 1].click();
  if (ev.key === 'Escape') go('/');
});
addEventListener('keyup', ev => { walkState.keys.delete(ev.key.toLowerCase()); });
addEventListener('blur', () => walkState.keys.clear());

// ---------------------------------------------------------------- fast spatial ray-picking & pointer controls
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), tmpSphere = new THREE.Sphere();
let down = null, lookId = null;
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, activeCam);
  // Fast bounding-sphere pre-filter (~98% triangle culling)
  const shortList = [];
  for (let i = 0; i < meshes.length; i++) {
    const m = meshes[i], e = m.userData;
    tmpSphere.center.set(m.position.x, m.position.y + e.h * 0.45, m.position.z);
    tmpSphere.radius = e.boundR;
    if (ray.ray.intersectsSphere(tmpSphere)) shortList.push(m);
  }
  if (!shortList.length) return null;
  const h = ray.intersectObjects(shortList, false)[0];
  return h ? h.object.userData : null;
}

canvas.addEventListener('pointerdown', ev => {
  down = [ev.clientX, ev.clientY];
  if (!fly?.walkArrive) fly = null;
  if (camMode === 'walk' && !walkState.dragging) {
    walkState.dragging = true; lookId = ev.pointerId;
    walkState.lastX = ev.clientX; walkState.lastY = ev.clientY;
  }
});
canvas.addEventListener('pointermove', ev => {
  if (camMode === 'walk' && walkState.dragging && ev.buttons && (lookId === null || ev.pointerId === lookId)) {
    const dx = ev.clientX - walkState.lastX, dy = ev.clientY - walkState.lastY;
    walkState.lastX = ev.clientX; walkState.lastY = ev.clientY;
    walkState.yaw -= dx * 0.0036;
    walkState.pitch = Math.max(-1.15, Math.min(1.15, walkState.pitch - dy * 0.0032));
    syncWalkLook();
    $('#tip').style.display = 'none';
    dirty = true;
    return;
  }
  if (ev.buttons) { $('#tip').style.display = 'none'; return; }
  const e = pick(ev), tip = $('#tip');
  if (e !== hover) { hover = e; canvas.classList.toggle('hot', !!e); paint(); }
  if (e) {
    tip.style.display = 'block';
    tip.style.left = Math.min(innerWidth - 340, ev.clientX) + 'px';
    tip.style.top = Math.min(innerHeight - 70, ev.clientY) + 'px';
    tip.innerHTML = `<b>${esc(e.title)}</b><i>${esc(FORMS[e.form].label)} · ${addr(e.passages[0])} · Morgan p. ${e.pages[0]}</i>`;
  } else tip.style.display = 'none';
});
canvas.addEventListener('pointerleave', () => {
  walkState.dragging = false;
  $('#tip').style.display = 'none';
  if (hover) { hover = null; paint(); }
});
addEventListener('pointerup', ev => { if (lookId === null || ev.pointerId === lookId) { walkState.dragging = false; lookId = null; } });
addEventListener('pointercancel', () => { walkState.dragging = false; lookId = null; });

// The walking stick for fingers: push it the way you want to go, drag anywhere else to look around
{
  const st = $('#stick'), nub = st.firstElementChild; let id = null;
  const set = ev => {
    const r = st.getBoundingClientRect(), R = r.width / 2;
    let x = (ev.clientX - r.left - R) / R, y = (ev.clientY - r.top - R) / R; const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    nub.style.transform = `translate(${x * R * 0.62}px, ${y * R * 0.62}px)`;
    walkState.joyS = Math.abs(x) < 0.12 ? 0 : x * 1.5; walkState.joyF = Math.abs(y) < 0.12 ? 0 : -y * 1.5; dirty = true;
  };
  const end = ev => { if (ev.pointerId !== id) return; id = null; walkState.joyF = walkState.joyS = 0; nub.style.transform = ''; };
  st.addEventListener('pointerdown', ev => { id = ev.pointerId; st.setPointerCapture(id); set(ev); ev.preventDefault(); });
  st.addEventListener('pointermove', ev => { if (ev.pointerId === id) set(ev); });
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
}
canvas.addEventListener('pointerup', ev => {
  if (!down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > (ev.pointerType === 'touch' ? 12 : 5)) return;
  const e = pick(ev);
  if (e) { if (narrow()) setSheet('half'); go(`/e/${e.id}`); }
});
controls.addEventListener('change', () => { if (camMode === 'plan') updateScaleBar(); dirty = true; });

// ---------------------------------------------------------------- main animation loop (render-on-demand when idle)
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const pr = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr); composer.setSize(w, h);
    perspCam.aspect = w / h;
    perspCam.updateProjectionMatrix();
    const oH = orthoCam.top - orthoCam.bottom;
    orthoCam.left = (-oH * (w / h)) / 2; orthoCam.right = (oH * (w / h)) / 2;
    orthoCam.updateProjectionMatrix();
    updateScaleBar();
    dirty = true;
  }
}

let lastNow = performance.now();
new ResizeObserver(() => { dirty = true; }).observe(canvas);

// ---------------------------------------------------------------- title page
const introEl = $('#intro');
let introOn = false;
function startIntro() {
  introOn = true;
  $('#enterBtn').disabled = false; $('#enterBtn').textContent = 'Enter the city';
  controls.target.set(0, 6, 0);
  perspCam.position.setFromSphericalCoords(RAD * 1.75, 1.33, 0.9).add(controls.target);
  controls.autoRotate = true; controls.autoRotateSpeed = 0.32;
}
function endIntro(then) {
  if (!introOn) return;
  introOn = false; controls.autoRotate = false;
  introEl.classList.add('out'); document.body.classList.remove('intro');
  setTimeout(() => { introEl.hidden = true; }, 1000);
  fly = null; flyTo(new THREE.Vector3(0, 0, RAD * 0.05), RAD * 2.9, -0.42, 0.93, 3200);
  if (then) setTimeout(then, 600);
}
$('#enterBtn').onclick = () => endIntro();
$('#enterTour').onclick = () => endIntro(() => go('/tours'));
addEventListener('keydown', ev => { if (introOn && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); endIntro(); } });
function frameLoop(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  resize();

  if (sunPlaying) {
    sunHour += dt * 0.95;
    if (sunHour > 18.25) sunHour = 6.25;
    $('#sunHour').value = sunHour.toFixed(2);
    updateSun();
  }

  if (move) {
    let done = true;
    for (const it of move.items) {
      const t = Math.min(1, Math.max(0, (now - move.t0 - it.d) / 1450)), k = ease(t);
      if (t < 1) done = false;
      it.e.mesh.position.set(
        it.a.x + (it.b.x - it.a.x) * k,
        it.a.y + (it.b.y - it.a.y) * k + Math.sin(Math.PI * t) * 14,
        it.a.z + (it.b.z - it.a.z) * k
      );
      it.e.mesh.rotation.y = it.a.rot + it.dr * k;
    }
    repad(); shadowKey = '';
    if (done) move = null;
    if (sel) paint();
    dirty = true;
  }

  if (fly) {
    const t = Math.min(1, (now - fly.t0) / fly.ms), k = ease(t);
    if (fly.walkArrive) {
      perspCam.position.lerpVectors(fly.fp, fly.tp, k);
      const lookCur = new THREE.Vector3().lerpVectors(fly.ft, fly.tt, k);
      perspCam.lookAt(lookCur);
      if (t >= 1) { fly = null; syncWalkLook(); }
    } else {
      controls.target.lerpVectors(fly.ft, fly.tt, k);
      perspCam.position.lerpVectors(fly.fp, fly.tp, k);
      if (t >= 1) fly = null;
    }
    dirty = true;
  }

  // First-person street walk physics (Ambulatio)
  if (camMode === 'walk' && !fly) {
    const ks = walkState.keys;
    let f = (ks.has('w') || ks.has('arrowup') ? 1 : 0) - (ks.has('s') || ks.has('arrowdown') ? 1 : 0) + walkState.joyF;
    let s = (ks.has('d') ? 1 : 0) - (ks.has('a') ? 1 : 0) + walkState.joyS;
    const turn = (ks.has('arrowleft') ? 1 : 0) - (ks.has('arrowright') ? 1 : 0);
    if (turn) { walkState.yaw += turn * 1.65 * dt; dirty = true; }
    const feet0 = perspCam.position.y - 1.7 - walkState.hopY;
    let solids = walkSolids(perspCam.position.x, perspCam.position.z, 3);
    const settle = Math.abs(feet0 - walkFloor(solids, perspCam.position.x, feet0, perspCam.position.z)) > 0.02;
    if (f || s || settle || walkState.hopY > 0 || Math.abs(walkState.velY) > 0.01) {
      const len = Math.max(1, Math.hypot(f, s) / (walkState.joyF || walkState.joyS ? 1.5 : 1)); f /= len; s /= len;
      const spd = (ks.has('shift') ? 34 : 15) * dt;
      const sy = Math.sin(walkState.yaw), cy = Math.cos(walkState.yaw);
      let mx = (sy * f - cy * s) * spd, mz = (cy * f + sy * s) * spd, ml = Math.hypot(mx, mz);
      if (ml > 1e-6) {
        const px = perspCam.position.x, pz = perspCam.position.z;
        let hit = walkBlocked(solids, px, feet0, pz, mx / ml, mz / ml, ml);
        if (hit) { // slide along the wall that was met; stop if the slide is blocked too
          wN.copy(hit.face.normal).transformDirection(hit.object.matrixWorld); wN.y = 0;
          const nl = wN.length();
          if (nl > 0.2) {
            wN.multiplyScalar(1 / nl);
            const into = mx * wN.x + mz * wN.z;
            mx -= into * wN.x; mz -= into * wN.z; ml = Math.hypot(mx, mz);
            if (ml < 1e-5 || walkBlocked(solids, px, feet0, pz, mx / ml, mz / ml, ml)) mx = mz = 0;
          } else mx = mz = 0;
        }
      }
      const nx = perspCam.position.x + mx, nz = perspCam.position.z + mz;
      const lim = RAD + 160;
      const d = Math.hypot(nx, nz);
      perspCam.position.x = d > lim ? (nx / d) * lim : nx;
      perspCam.position.z = d > lim ? (nz / d) * lim : nz;
      walkState.hopY = Math.max(0, walkState.hopY + walkState.velY * dt);
      walkState.velY = walkState.hopY > 0 ? walkState.velY - 15 * dt : 0;
      const baseG = walkFloor(solids, perspCam.position.x, feet0, perspCam.position.z) + 1.7 + walkState.hopY;
      perspCam.position.y += (baseG - perspCam.position.y) * Math.min(1, dt * 12);
      syncWalkLook();
      dirty = true;
    }
  }

  if (camMode !== 'walk' && controls.update()) dirty = true;
  if (introOn) dirty = true;

  if (!dirty && gtao && Q.ao === 'settle' && !settled && camMode !== 'plan' && now - lastDrawn > 240) { settled = dirty = true; }
  else if (dirty) settled = false;
  if (dirty) {
    dirty = false;
    if (!settled) {
      // a phone that cannot keep 30 frames a second draws fewer pixels rather than fewer frames
      if (now - lastDrawn < 120 && now > readyAt + 2500 && !move && !edgeQueue.length) { slowAcc += now - lastDrawn; slowN++; } else slowAcc = slowN = slowRuns = 0;
      if (slowN >= 24) { slowRuns = slowAcc / slowN > 34 ? slowRuns + 1 : 0; if (slowRuns >= 2 && PR > Q.prMin) { PR = Math.max(Q.prMin, PR - 0.2); renderer.setPixelRatio(PR); resize(); slowRuns = 0; } slowAcc = slowN = 0; }
      lastDrawn = now;
    }
    waterMesh.userData.uTime.value = now * 0.001;
    const d = camMode === 'walk' ? 60 : camMode === 'plan' ? 420 / orthoCam.zoom : activeCam.position.distanceTo(controls.target);
    ink.opacity = Math.min(0.76, Math.max(0.16, 1.02 - d / 650));
    inkDim.opacity = ink.opacity * 0.18;
    kerb.opacity = Math.min(0.42, Math.max(0.12, 0.72 - d / 920));
    fitShadow();
    scene.fog.density = camMode === 'walk' ? 0.0007 : camMode === 'plan' ? 0 : 0.00009 + 0.00016 * Math.min(1, Math.max(0, (perspCam.position.y - controls.target.y) / d < 0.5 ? 1 - (perspCam.position.y - controls.target.y) / d / 0.5 : 0));
    sky.position.copy(activeCam.position);
    renderPass.camera = activeCam;
    if (gtao) {
      gtao.camera = activeCam;
      gtao.enabled = camMode !== 'plan' && (Q.ao === 'live' || settled);
      if (gtao.enabled) gtao.updateGtaoMaterial({ radius: Math.min(9, Math.max(1.4, d * 0.011)) });
    }
    gradePass.uniforms.uTime.value = now * 0.001;
    composer.render();
    drawLabs();
  }
  requestAnimationFrame(frameLoop);
}

$('#stat').textContent = `${E.length} monuments · 729 passages · ${Object.keys(RULES).length} rules`;
updateKeysHint();
{
  const m0 = new URLSearchParams(location.hash.split('?')[1] || '').get('by');
  setBy(city.matrices[m0] ? m0 : 'theme', true);
}
perspCam.position.setFromSphericalCoords(RAD * 2.9, 0.93, -0.42);
controls.target.set(0, 0, RAD * 0.05);
route();
if (fly) { controls.target.copy(fly.tt); perspCam.position.copy(fly.tp); fly = null; }
if (document.body.classList.contains('intro')) startIntro();
{
  const c0 = new URLSearchParams(location.hash.split('?')[1] || '').get('cam');
  if (c0 === 'walk' || c0 === 'plan') setCamMode(c0, sel);
}
passagesReq.then(arr => {
  PASSAGES = arr;
  TEXT = {}; P_META = {};
  for (const p of arr) { TEXT[p.id] = p.text; P_META[p.id] = p; }
  route(false);
  // the Latin is fetched ahead only on a desk; a phone takes it when the reader asks for it
  if (TIER === 'high' && !navigator.connection?.saveData) { if ('requestIdleCallback' in window) requestIdleCallback(() => ensureLatin()); else setTimeout(ensureLatin, 600); }
});
readyAt = performance.now();
canvas.addEventListener('webglcontextlost', ev => ev.preventDefault());
canvas.addEventListener('webglcontextrestored', () => { shadowKey = ''; dirty = true; });
requestAnimationFrame(frameLoop);
requestAnimationFrame(edgeStep);

const bench = (n = 40) => {
  const gl = renderer.getContext(), ts = [];
  for (let i = 0; i < n; i++) { const t = performance.now(); composer.render(); gl.finish(); ts.push(performance.now() - t); }
  ts.sort((x, y) => x - y);
  renderer.info.autoReset = false; renderer.info.reset(); composer.render();
  const out = { median: ts[n >> 1], max: ts[n - 1], tris: renderer.info.render.triangles, lines: renderer.info.render.lines, calls: renderer.info.render.calls, tier: TIER, pr: PR };
  renderer.info.autoReset = true; return out;
};
window.__city = { face: (x, z) => { walkState.yaw = Math.atan2(x - perspCam.position.x, z - perspCam.position.z); walkState.pitch = 0.05; syncWalkLook(); dirty = true; }, cam: () => [perspCam.position.x, perspCam.position.y, perspCam.position.z, walkState.yaw], key: (k, on) => { on ? walkState.keys.add(k) : walkState.keys.delete(k); dirty = true; }, city, E, go, setBy, setCamMode, openIonicPlate, bench, updateSun: (h, s) => { sunHour = h; if (s) sunSeason = s; updateSun(); } };
