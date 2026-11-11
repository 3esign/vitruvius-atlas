// Tiny triangle builder (no dependencies; runs in node and in the browser).
// Local frame of every form: metres, y up, the front looks to +z, ground at y = 0.
export const FT = 0.296, CU = 0.444, PI = Math.PI;
export const C = {
  stone: [.925, .904, .862], marble: [.976, .968, .948], roof: [.79, .575, .455], wood: [.635, .505, .38], bronze: [.46, .545, .465],
  water: [.47, .665, .765], earth: [.775, .73, .635], green: [.51, .625, .445], dark: [.24, .23, .22], brick: [.785, .55, .44],
  sand: [.865, .805, .655], lead: [.58, .605, .645], gold: [.865, .72, .34], shade: [.855, .832, .788], thatch: [.795, .74, .60],
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const AX = { x: [[0, 0, 1], [0, 1, 0]], y: [[1, 0, 0], [0, 0, 1]], z: [[1, 0, 0], [0, 1, 0]] };

export class M {
  constructor() { this.P = []; this.N = []; this.K = []; this.t = [0, 0, 0, 0]; }
  X(p) { const [tx, ty, tz, a] = this.t, c = Math.cos(a), s = Math.sin(a); return [tx + p[0] * c + p[2] * s, ty + p[1], tz - p[0] * s + p[2] * c]; }
  at(x, y, z, rot, fn) { const o = this.t, q = this.X([x, y, z]); this.t = [q[0], q[1], q[2], o[3] + rot]; fn(); this.t = o; }
  tri(a, b, c, k, na, nb, nc) {
    a = this.X(a); b = this.X(b); c = this.X(c);
    if (!na) { const n = cross(sub(b, a), sub(c, a)), l = Math.hypot(...n); if (l < 1e-10) return; na = nb = nc = [n[0] / l, n[1] / l, n[2] / l]; }
    else { const o = this.t; this.t = [0, 0, 0, o[3]]; na = this.X(na); nb = this.X(nb); nc = this.X(nc); this.t = o; }
    this.P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); this.N.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]);
    this.K.push(k[0], k[1], k[2], k[0], k[1], k[2], k[0], k[1], k[2]);
  }
  quad(a, b, c, d, k) { this.tri(a, b, c, k); this.tri(a, c, d, k); }
  // box: centre x,z; bottom y
  box(x, y, z, w, h, d, k = C.stone) {
    const x0 = x - w / 2, x1 = x + w / 2, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], k);
    this.quad([x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1], k); this.quad([x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0], k);
    this.quad([x1, y, z1], [x1, y, z0], [x1, y1, z0], [x1, y1, z1], k); this.quad([x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0], k);
  }
  // vertical frustum, smooth sides
  cyl(x, y, z, r0, r1, h, k = C.stone, n = 12, cap = true) {
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * PI, b = (i + 1) / n * 2 * PI, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const A0 = [x + r0 * ca, y, z + r0 * sa], B0 = [x + r0 * cb, y, z + r0 * sb], A1 = [x + r1 * ca, y + h, z + r1 * sa], B1 = [x + r1 * cb, y + h, z + r1 * sb];
      const na = [ca, 0, sa], nb = [cb, 0, sb];
      this.tri(B0, A0, A1, k, nb, na, na); if (r1 > 1e-6) { this.tri(B0, A1, B1, k, nb, na, nb); if (cap) this.tri([x, y + h, z], B1, A1, k); }
    }
  }
  // n-gon bar between two points (flat)
  rod(a, b, r, k = C.wood, n = 6) {
    const d = norm(sub(b, a)), up = Math.abs(d[1]) > .95 ? [1, 0, 0] : [0, 1, 0], e1 = norm(cross(d, up)), e2 = cross(e1, d);
    const P = (c, i) => { const t = (i + .5) / n * 2 * PI; return add(c, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t)))); };
    for (let i = 0; i < n; i++) { this.quad(P(a, i), P(a, i + 1), P(b, i + 1), P(b, i), k); this.tri(b, P(b, i), P(b, i + 1), k); this.tri(a, P(a, i + 1), P(a, i), k); }
  }
  beam(a, b, t, k = C.wood) { this.rod(a, b, t * .7071, k, 4); }
  // annulus prism around an axis ('x','y','z' or [e1,e2]); r = 0 gives a disc/cylinder
  ring(c, axis, R, r, w, k = C.stone, n = 16, a0 = 0, a1 = 2 * PI) {
    const [e1, e2] = typeof axis === 'string' ? AX[axis] : axis, e3 = norm(cross(e1, e2));
    const P = (a, rad, s) => add(c, add(add(mul(e1, rad * Math.cos(a)), mul(e2, rad * Math.sin(a))), mul(e3, s)));
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * i / n, b = a0 + (a1 - a0) * (i + 1) / n, h = w / 2;
      this.quad(P(a, R, -h), P(b, R, -h), P(b, R, h), P(a, R, h), k);
      if (r > 0) this.quad(P(a, r, -h), P(b, r, -h), P(b, r, h), P(a, r, h), k);
      this.quad(P(a, r, h), P(b, r, h), P(b, R, h), P(a, R, h), k); this.quad(P(a, r, -h), P(b, r, -h), P(b, R, -h), P(a, R, -h), k);
    }
    if (a1 - a0 < 2 * PI - 1e-6) for (const a of [a0, a1]) this.quad(P(a, r, -w / 2), P(a, R, -w / 2), P(a, R, w / 2), P(a, r, w / 2), k);
  }
  // surface of revolution round the vertical; prof = [[r,y],...]; ends closed down to y=0 when `skirt`
  lathe(x, y, z, prof, k = C.stone, n = 16, a0 = 0, a1 = 2 * PI, skirt = false) {
    const P = (a, q) => [x + q[0] * Math.cos(a), y + q[1], z + q[0] * Math.sin(a)];
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * i / n, b = a0 + (a1 - a0) * (i + 1) / n;
      for (let j = 0; j < prof.length - 1; j++) this.quad(P(a, prof[j]), P(b, prof[j]), P(b, prof[j + 1]), P(a, prof[j + 1]), k);
    }
    if (skirt) for (const a of [a0, a1]) for (let j = 0; j < prof.length - 1; j++) this.quad(P(a, [prof[j][0], 0]), P(a, [prof[j + 1][0], 0]), P(a, prof[j + 1]), P(a, prof[j]), k);
  }
  dome(x, y, z, r, k = C.stone, n = 16, m = 6, flat = 1) { const p = []; for (let j = 0; j <= m; j++) { const t = j / m * PI / 2; p.push([r * Math.cos(t), r * flat * Math.sin(t)]); } this.lathe(x, y, z, p, k, n); }
  ball(x, y, z, r, k = C.stone, n = 10) { const p = []; for (let j = 0; j <= 8; j++) { const t = -PI / 2 + j / 8 * PI; p.push([r * Math.cos(t), r * Math.sin(t)]); } this.lathe(x, y + r, z, p, k, n); }
  // gable roof, ridge along z; kp = colour of the two pediment faces
  gable(x, y, z, w, d, h, k = C.roof, kp = C.stone) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yr = y + h;
    this.quad([x0, y, z1], [x, yr, z1], [x, yr, z0], [x0, y, z0], k); this.quad([x1, y, z0], [x, yr, z0], [x, yr, z1], [x1, y, z1], k);
    this.tri([x0, y, z1], [x1, y, z1], [x, yr, z1], kp); this.tri([x1, y, z0], [x0, y, z0], [x, yr, z0], kp);
    // terracotta ridge kalypter
    this.box(x, yr - .04, z, Math.min(.22, w * .025), .12, d + .06, k);
  }
  hip(x, y, z, w, d, h, k = C.roof) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yr = y + h, r = Math.max(0, (d - w) / 2), q = Math.max(0, (w - d) / 2);
    this.quad([x0, y, z1], [x1, y, z1], [x + q, yr, z + r], [x - q, yr, z + r], k); this.quad([x1, y, z0], [x0, y, z0], [x - q, yr, z - r], [x + q, yr, z - r], k);
    this.quad([x1, y, z1], [x1, y, z0], [x + q, yr, z - r], [x + q, yr, z + r], k); this.quad([x0, y, z0], [x0, y, z1], [x - q, yr, z + r], [x - q, yr, z - r], k);
  }
  // four sloping planes between an outer rectangle at y0 and an inner one at y1 (atrium and court roofs)
  roofRing(x, z, W, L, y0, w, l, y1, k = C.roof) {
    const o = [[x - W / 2, y0, z + L / 2], [x + W / 2, y0, z + L / 2], [x + W / 2, y0, z - L / 2], [x - W / 2, y0, z - L / 2]], i = [[x - w / 2, y1, z + l / 2], [x + w / 2, y1, z + l / 2], [x + w / 2, y1, z - l / 2], [x - w / 2, y1, z - l / 2]];
    for (let j = 0; j < 4; j++) this.quad(o[j], o[(j + 1) % 4], i[(j + 1) % 4], i[j], k);
  }
  prism(pts, y, h, k = C.stone) { // pts: [[x,z],...] convex, any winding
    const n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n, cz = pts.reduce((s, p) => s + p[1], 0) / n;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; this.quad([a[0], y, a[1]], [b[0], y, b[1]], [b[0], y + h, b[1]], [a[0], y + h, a[1]], k); this.tri([cx, y + h, cz], [a[0], y + h, a[1]], [b[0], y + h, b[1]], k); }
  }
  frame(x, y, z, W, L, t, h, k = C.stone) { this.box(x, y, z + L / 2 - t / 2, W, h, t, k); this.box(x, y, z - L / 2 + t / 2, W, h, t, k); this.box(x - W / 2 + t / 2, y, z, t, h, L - 2 * t, k); this.box(x + W / 2 - t / 2, y, z, t, h, L - 2 * t, k); }
  tree(x, z, h = 5, k = C.green) {
    this.cyl(x, 0, z, h * .042, h * .028, h * .38, C.wood, 6, false);
    this.cyl(x, h * .28, z, h * .21, h * .14, h * .32, k, 8, false);
    this.cyl(x, h * .52, z, h * .17, 0, h * .48, [k[0] * 1.05, k[1] * 1.04, k[2] * 1.02], 8);
  }
  figure(x, y, z, h = 1.8, k = C.stone) { this.cyl(x, y, z, h * .11, h * .09, h * .82, k, 6); this.ball(x, y + h * .8, z, h * .09, k, 6); }
}

// Baked architectural vertex ambient occlusion & tonal shading (runs deterministically in Node & Browser)
export function bakeAO(pos, nor, col, w, d, h) {
  const n = pos.length, hw = Math.max(1, w * .5), hd = Math.max(1, d * .5), hh = Math.max(1.5, h);
  const contactH = Math.min(3.2, hh * .32 + .55);
  for (let i = 0; i < n; i += 3) {
    const px = pos[i], py = pos[i + 1], pz = pos[i + 2], ny = nor[i + 1];
    // 1. Ground contact occlusion (preserve crispness on flat courtyard slabs where ny > 0.85)
    const gT = Math.min(1, Math.max(0, py / contactH));
    const aoGround = ny > .85 ? (.95 + .05 * gT) : (.82 + .18 * (gT * (2 - gT)));
    // 2. Soffit / cornice underside darkening
    const aoSoffit = ny < -.12 ? (1 + .17 * ny) : (ny > .65 ? 1.025 : 1);
    // 3. Interior recess / peristyle depth occlusion
    const edgeDist = Math.max(Math.abs(px) / hw, Math.abs(pz) / hd);
    const recess = (py < hh * .76 && ny < .65) ? (.90 + .10 * Math.min(1, edgeDist * 1.12)) : 1;
    // 4. Subtle vertical sunlight warmth gradient
    const vT = Math.min(1, py / hh);
    const ao = aoGround * aoSoffit * recess;
    col[i] = Math.min(1, col[i] * ao * (.985 + .028 * vT));
    col[i + 1] = Math.min(1, col[i + 1] * ao * (.992 + .016 * vT));
    col[i + 2] = Math.min(1, col[i + 2] * ao * (1.005 - .012 * vT));
  }
}

// Column by order. III.3.12 diminution by height; III.5.1 base; IV.1.1 capital heights; IV.3.4 Doric; IV.7.2-3 Tuscan.
export function col(m, x, y, z, D, H, order = 'ionic', k = C.stone, n = 12) {
  const ft = H / FT, dim = ft <= 15 ? 5 / 6 : ft <= 20 ? 5.5 / 6.5 : ft <= 30 ? 6 / 7 : ft <= 40 ? 6.5 / 7.5 : 7 / 8;
  const rb = D / 2; let rt = rb * dim, yb = y, yt = y + H;
  if (order === 'doric') { const hc = D / 2; m.cyl(x, yt - hc, z, rt, rt * 1.35, hc * .55, k, n, false); m.box(x, yt - hc * .45, z, D * 1.08, hc * .45, D * 1.08, k); yt -= hc; }
  else if (order === 'tuscan') { rt = rb * .75; m.cyl(x, y, z, rb * 1.4, rb * 1.4, D / 4, k, n); m.cyl(x, y + D / 4, z, rb * 1.2, rb * 1.2, D / 4, k, n); yb += D / 2; const hc = D / 2; m.cyl(x, yt - hc, z, rt, rt * 1.3, hc * .5, k, n, false); m.box(x, yt - hc * .5, z, D * 1.05, hc * .5, D * 1.05, k); yt -= hc; }
  else {
    m.box(x, y, z, 1.5 * D, D / 6, 1.5 * D, k); m.cyl(x, y + D / 6, z, rb * 1.36, rb * 1.18, D / 3, k, n); yb += D / 2;
    if (order === 'corinthian') { m.cyl(x, yt - D, z, rt, rt * 1.5, D * .85, k, n, false); m.box(x, yt - D * .15, z, D * 1.25, D * .15, D * 1.25, k); yt -= D; }
    else { const hc = D / 3; m.box(x, yt - hc, z, D * 1.42, hc * .7, D * .95, k); m.box(x, yt - hc * .35, z, D * 1.06, hc * .35, D * 1.06, k); yt -= hc; }
  }
  m.cyl(x, yb, z, rb, rt, yt - yb, k, n, false);
}
// colonnaded court: outer wall, ring of columns, lean-to roofs falling inward
export function court(m, W, L, o = {}) {
  const { dep = 3.5, H = 3.5, D = .45, order = 'doric', wall = H + 1.6, A = 2.8, sides = [1, 1, 1, 1], t = .5 } = o; // sides: front, right, back, left
  m.box(0, 0, 0, W, .15, L, C.shade); m.frame(0, .15, 0, W, L, t, wall, C.stone);
  const w = W - 2 * dep, l = L - 2 * dep, nx = Math.max(2, Math.round(w / A) + 1), nz = Math.max(2, Math.round(l / A) + 1);
  for (let i = 0; i < nx; i++) { const x = -w / 2 + w * i / (nx - 1); if (sides[0]) col(m, x, .15, l / 2, D, H, order); if (sides[2]) col(m, x, .15, -l / 2, D, H, order); }
  for (let i = 1; i < nz - 1; i++) { const z = -l / 2 + l * i / (nz - 1); if (sides[1]) col(m, w / 2, .15, z, D, H, order); if (sides[3]) col(m, -w / 2, .15, z, D, H, order); }
  m.frame(0, .15 + H, 0, w + D, l + D, D, .35, C.stone); m.roofRing(0, 0, W - t, L - t, .15 + wall - .1, w + D + .5, l + D + .5, .15 + H + .35);
}
