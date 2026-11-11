// Tiny triangle builder (no dependencies; runs in node and in the browser).
// Local frame of every form: metres, y up, the front looks to +z, ground at y = 0.
// Ink lines are drawn where two faces meet at more than 38 degrees or where an edge has one face only:
// curved things keep their facets under that angle, and surfaces that should read as one share their vertices.
export const FT = 0.296, CU = 0.444, PI = Math.PI;
export const C = {
  stone: [.925, .904, .862], marble: [.976, .968, .948], roof: [.79, .575, .455], wood: [.635, .505, .38], bronze: [.46, .545, .465],
  water: [.47, .665, .765], earth: [.775, .73, .635], green: [.51, .625, .445], dark: [.24, .23, .22], brick: [.785, .55, .44],
  sand: [.865, .805, .655], lead: [.58, .605, .645], gold: [.865, .72, .34], shade: [.855, .832, .788], thatch: [.795, .74, .60],
  tile: [.735, .52, .405], door: [.47, .355, .265], bark: [.52, .42, .33],
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], tint = (k, a, b = a, c = a) => [Math.min(1, k[0] * a), Math.min(1, k[1] * b), Math.min(1, k[2] * c)];
const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const AX = { x: [[0, 0, 1], [0, 1, 0]], y: [[1, 0, 0], [0, 0, 1]], z: [[1, 0, 0], [0, 1, 0]] };
const UP = [0, 1, 0];

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
  // quad wound so that its normal looks along dir
  oq(a, b, c, d, k, dir) { if (dot(cross(sub(c, a), sub(d, b)), dir) < 0) { this.tri(a, c, b, k); this.tri(a, d, c, k); } else { this.tri(a, b, c, k); this.tri(a, c, d, k); } }
  // box: centre x,z; bottom y
  box(x, y, z, w, h, d, k = C.stone) {
    const x0 = x - w / 2, x1 = x + w / 2, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], k);
    this.quad([x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1], k); this.quad([x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0], k);
    this.quad([x1, y, z1], [x1, y, z0], [x1, y1, z0], [x1, y1, z1], k); this.quad([x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0], k);
  }
  // box with its underside too (cornices, lintels, anything seen from below)
  slab(x, y, z, w, h, d, k = C.stone) { this.box(x, y, z, w, h, d, k); const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2; this.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], k); }
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
  // round tube through points with level rings, no caps (trunks, bent pipes); rs = radius per point
  tube(pts, rs, k = C.wood, n = 6) {
    const P = (j, i) => { const a = i / n * 2 * PI; return [pts[j][0] + rs[j] * Math.cos(a), pts[j][1], pts[j][2] + rs[j] * Math.sin(a)]; };
    for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < n; i++) { this.tri(P(j, i + 1), P(j, i), P(j + 1, i), k); if (rs[j + 1] > 1e-6) this.tri(P(j, i + 1), P(j + 1, i), P(j + 1, i + 1), k); }
  }
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
  // surface of revolution round the vertical; prof = [[r,y(,colour)],...]; smooth round the axis, flat along the profile.
  // A profile listed top-down faces outwards. Ends closed down to y=0 when `skirt`.
  lathe(x, y, z, prof, k = C.stone, n = 16, a0 = 0, a1 = 2 * PI, skirt = false) {
    const P = (c, s, q) => [x + q[0] * c, y + q[1], z + q[0] * s], flat = Math.abs(a1 - a0) / n > .7;
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * i / n, b = a0 + (a1 - a0) * (i + 1) / n, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      for (let j = 0; j < prof.length - 1; j++) {
        const p = prof[j], q = prof[j + 1], kk = q[2] || k, dr = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dr, dy); if (l < 1e-9) continue;
        const A = P(ca, sa, p), B = P(cb, sb, p), Cq = P(cb, sb, q), D = P(ca, sa, q);
        if (flat) { this.quad(A, B, Cq, D, kk); continue; }
        const nr = -dy / l, ny = dr / l, na = [nr * ca, ny, nr * sa], nb = [nr * cb, ny, nr * sb];
        if (p[0] > 1e-9) this.tri(A, B, Cq, kk, na, nb, nb); if (q[0] > 1e-9) this.tri(A, Cq, D, kk, na, nb, na);
      }
    }
    if (skirt) for (const a of [a0, a1]) for (let j = 0; j < prof.length - 1; j++) { const c = Math.cos(a), s = Math.sin(a); this.quad(P(c, s, [prof[j][0], 0]), P(c, s, [prof[j + 1][0], 0]), P(c, s, prof[j + 1]), P(c, s, prof[j]), k); }
  }
  dome(x, y, z, r, k = C.stone, n = 16, m = 6, flat = 1) { const p = []; for (let j = m; j >= 0; j--) { const t = j / m * PI / 2; p.push([r * Math.cos(t), r * flat * Math.sin(t)]); } this.lathe(x, y, z, p, k, n); }
  ball(x, y, z, r, k = C.stone, n = 10) { const p = []; for (let j = 8; j >= 0; j--) { const t = -PI / 2 + j / 8 * PI; p.push([r * Math.cos(t), r * Math.sin(t)]); } this.lathe(x, y + r, z, p, k, n); }
  // profile swept round a rectangle W x L with mitred corners: prof = [[out, y(,colour)],...] listed bottom-up, `out` = offset outside the rectangle.
  // One call makes a flight of steps, a podium with its mouldings, an architrave with fasciae or a cornice. inner: the profile lines the inside of a W x L opening.
  mould(x, y, z, W, L, prof, k = C.stone, cap = true, inner = false) {
    const s = inner ? -1 : 1, P = (q, i) => { const hw = W / 2 + s * q[0], hl = L / 2 + s * q[0]; return [[x - hw, y + q[1], z + hl], [x + hw, y + q[1], z + hl], [x + hw, y + q[1], z - hl], [x - hw, y + q[1], z - hl]][i]; };
    for (let j = 0; j < prof.length - 1; j++) { const p = prof[j], q = prof[j + 1], kk = q[2] || k; if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-9) continue;
      for (let i = 0; i < 4; i++) { const a = P(p, i), b = P(p, (i + 1) % 4), c = P(q, (i + 1) % 4), d = P(q, i); inner ? this.quad(b, a, d, c, kk) : this.quad(a, b, c, d, kk); } }
    if (cap && !inner) { const q = prof[prof.length - 1]; this.quad(P(q, 0), P(q, 1), P(q, 2), P(q, 3), q[2] || k); }
  }
  // wall face from a to b ([x,z]), looking to the right of a->b, with real openings.
  // ops: [{u, w, v, h, d, kind, k, fr, arch}] u = centre measured from a, v = sill above y0, d = reveal depth, kind 'win' | 'door' | 'void', fr = casing projection,
  // arch: the head is a half circle (h is taken to the crown)
  face(a, b, y0, y1, ops = [], k = C.stone) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = -dz, nz = dx, H = y1 - y0;
    const P = (u, v, dp = 0) => [a[0] + dx * u - nx * dp, y0 + v, a[1] + dz * u - nz * dp], O = [], us = [0, L], vs = [0, H];
    for (const o of ops) { const u0 = Math.max(0, o.u - o.w / 2), u1 = Math.min(L, o.u + o.w / 2), v0 = Math.max(0, o.v || 0), v1 = Math.min(H, v0 + o.h); if (u1 - u0 < .03 || v1 - v0 < .03) continue;
      if (o.arch && v1 - v0 > (u1 - u0) / 2 + .05 && v1 + .12 < H) { const vs2 = v1 - (u1 - u0) / 2, vt = v1 + Math.min(.3, (H - v1) / 2); O.push({ ...o, u0, u1, v0, v1: vt, vs: vs2, vc: v1 }); us.push(u0, u1); vs.push(v0, vs2, vt); }
      else { O.push({ ...o, u0, u1, v0, v1, arch: false }); us.push(u0, u1); vs.push(v0, v1); } }
    const uniq = t => t.sort((p, q) => p - q).filter((v, i, s) => !i || v - s[i - 1] > 1e-4), U = uniq(us), V = uniq(vs);
    for (let i = 0; i < U.length - 1; i++) for (let j = 0; j < V.length - 1; j++) { const cu = (U[i] + U[i + 1]) / 2, cv = (V[j] + V[j + 1]) / 2; if (O.some(o => cu > o.u0 && cu < o.u1 && cv > o.v0 && cv < o.v1)) continue; this.quad(P(U[i], V[j]), P(U[i + 1], V[j]), P(U[i + 1], V[j + 1]), P(U[i], V[j + 1]), k); }
    const lb = (ua, ub, va, vb, pr, kk) => { this.quad(P(ua, va, -pr), P(ub, va, -pr), P(ub, vb, -pr), P(ua, vb, -pr), kk); this.quad(P(ua, vb, -pr), P(ub, vb, -pr), P(ub, vb), P(ua, vb), kk); this.quad(P(ua, va), P(ub, va), P(ub, va, -pr), P(ua, va, -pr), kk); this.quad(P(ua, va), P(ua, va, -pr), P(ua, vb, -pr), P(ua, vb), kk); this.quad(P(ub, va, -pr), P(ub, va), P(ub, vb), P(ub, vb, -pr), kk); };
    for (const o of O) { const { u0, u1, v0 } = o, d = o.d ?? .25, w = u1 - u0, door = o.kind === 'door', rk = o.rk || k, kb = o.k || (door ? C.door : C.dark), v1 = o.arch ? o.vs : o.v1, h = v1 - v0;
      if (v0 > 1e-4 || door) this.quad(P(u0, v0), P(u1, v0), P(u1, v0, d), P(u0, v0, d), rk); if (!o.arch) this.quad(P(u0, v1, d), P(u1, v1, d), P(u1, v1), P(u0, v1), rk);
      this.quad(P(u0, v0), P(u0, v0, d), P(u0, v1, d), P(u0, v1), rk); this.quad(P(u1, v0, d), P(u1, v0), P(u1, v1), P(u1, v1, d), rk);
      if (o.kind !== 'void') this.quad(P(u0, v0, d), P(u1, v0, d), P(u1, v1, d), P(u0, v1, d), kb);
      if (o.arch) { const r = w / 2, uc = u0 + r, na = 8, A = (j, dp) => { const t = PI - j / na * PI; return P(uc + r * Math.cos(t), v1 + r * Math.sin(t), dp); }, TL = P(u0, o.v1), TR = P(u1, o.v1), ctr = P(uc, v1), cd = P(uc, v1, d);
        // the wall round the arch follows the grid lines that cross it, so that no edge is left half-shared
        const Vm = V.filter(t => t > v1 + 1e-4 && t < o.v1 - 1e-4), Um = U.filter(t => t > u0 + 1e-4 && t < u1 - 1e-4), Lp = [v1, ...Vm, o.v1].map(t => P(u0, t)), Rp = [v1, ...Vm, o.v1].map(t => P(u1, t)), Tp = [u0, ...Um, u1].map(t => P(t, o.v1));
        for (let i = 0; i < Lp.length - 1; i++) { this.tri(Lp[i], A(1), Lp[i + 1], k); this.tri(Rp[i], Rp[i + 1], A(na - 1), k); } for (let i = 0; i < Tp.length - 1; i++) this.tri(Tp[i], A(na / 2), Tp[i + 1], k);
        for (let j = 0; j < na; j++) { if (j > 0 && j < na - 1) j < na / 2 ? this.tri(TL, A(j), A(j + 1), k) : this.tri(TR, A(j), A(j + 1), k); this.oq(A(j), A(j, d), A(j + 1, d), A(j + 1), rk, sub(ctr, A(j + .5))); if (o.kind !== 'void') this.tri(cd, A(j + 1, d), A(j, d), kb); } }
      if (door) { // IV.6.4-5: two leaves, stiles a twelfth of the width, panels divided three to two by the rails
        const st = w / 12, e = d - .035, hm = v0 + h * .58; this.quad(P(u0 + w / 2 - st * .12, v0, d - .012), P(u0 + w / 2 + st * .12, v0, d - .012), P(u0 + w / 2 + st * .12, v1, d - .012), P(u0 + w / 2 - st * .12, v1, d - .012), C.dark);
        for (const [ua, ub] of [[u0 + st, u0 + w / 2 - st], [u0 + w / 2 + st, u1 - st]]) for (const [va, vb] of [[v0 + st, hm - st / 2], [hm + st / 2, v1 - st]]) this.quad(P(ua, va, e), P(ub, va, e), P(ub, vb, e), P(ua, vb, e), o.kp || C.wood); }
      else if (o.kind === 'win' && o.bars !== 0 && w > .5) { const t = Math.min(.05, w * .05), e = d - .03, kb = o.kb || C.door; this.quad(P(u0 + w / 2 - t, v0, e), P(u0 + w / 2 + t, v0, e), P(u0 + w / 2 + t, v1, e), P(u0 + w / 2 - t, v1, e), kb); if (h > .8) this.quad(P(u0, v0 + h / 2 - t, e - .002), P(u1, v0 + h / 2 - t, e - .002), P(u1, v0 + h / 2 + t, e - .002), P(u0, v0 + h / 2 + t, e - .002), kb); }
      if (o.fr) { const c = o.cw || Math.max(.08, w / (door ? 7 : 6)), kf = o.kf || C.marble; lb(u0 - c, u0, v0, v1, o.fr, kf); lb(u1, u1 + c, v0, v1, o.fr, kf); lb(u0 - c, u1 + c, v1, v1 + c, o.fr, kf);
        if (door) lb(u0 - c * 1.5, u1 + c * 1.5, v1 + c, v1 + c * 1.5, o.fr * 2.2, kf); else lb(u0 - c * 1.3, u1 + c * 1.3, v0 - c * .6, v0, o.fr * 1.6, kf); }
    }
  }
  // box whose four walls may carry openings: o = { f, b, l, r } lists as for face(), each opening placed by x (front, back) or z (left, right)
  wbox(x, y, z, w, h, d, k = C.stone, o = {}, top = true) {
    const x0 = x - w / 2, x1 = x + w / 2, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2, U = (l, f) => (l || []).map(q => ({ ...q, u: f(q) }));
    if (top) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], k);
    this.face([x0, z1], [x1, z1], y, y1, U(o.f, q => q.x - x0), k); this.face([x1, z1], [x1, z0], y, y1, U(o.r, q => z1 - q.z), k);
    this.face([x1, z0], [x0, z0], y, y1, U(o.b, q => x1 - q.x), k); this.face([x0, z0], [x0, z1], y, y1, U(o.l, q => q.z - z0), k);
  }
  // sloping roof plane laid with tiles: e0 -> e1 the longer (eave) edge, r0 and r1 the far edge above e0 and e1 (r0 = r1 for a hip triangle).
  // The pans lie a hand below the given plane and the cover tiles rise back to it, so nothing leaves the envelope; ribs are low enough to stay un-inked.
  slope(e0, e1, r1, r0, k = C.roof, o = {}) {
    const ev = sub(e1, e0), Le = Math.hypot(...ev), eh = mul(ev, 1 / (Le || 1)), rv = sub(r0, e0), a0 = dot(rv, eh), sv = sub(rv, mul(eh, a0)), Ls = Math.hypot(...sv), point = Math.hypot(...sub(r0, r1)) < 1e-6;
    if (!(o.tiles ?? k === C.roof) || Le < 1 || Ls < .6 || Math.abs(sv[1]) < Ls * .05) { if (point) { cross(ev, rv)[1] < 0 ? this.tri(e0, r0, e1, k) : this.tri(e0, e1, r0, k); } else this.oq(e0, e1, r1, r0, k, UP); return; }
    const sh = mul(sv, 1 / Ls), a1 = dot(sub(r1, e0), eh), sp = Math.max(Math.min(.62, Math.max(.3, Ls / 8)), Le / (o.max || 40)), nr = Math.max(1, Math.round(Le / sp)), pitch = Le / nr, bw = Math.min(.11, pitch * .18), bh = bw * .3, kt = o.kt || (k === C.roof ? C.tile : tint(k, .93));
    const vtop = u => u < a0 - 1e-9 ? Ls * Math.max(0, u) / a0 : u > a1 + 1e-9 ? Ls * Math.max(0, Le - u) / (Le - a1) : Ls;
    const B = (u, v, h) => [e0[0] + eh[0] * u + sh[0] * v, e0[1] + eh[1] * u + sh[1] * v - h, e0[2] + eh[2] * u + sh[2] * v];
    const sec = []; for (let i = 0; i <= nr; i++) { const u = i * pitch; if (i) sec.push([u - bw, bh]); sec.push([u, 0]); if (i < nr) sec.push([u + bw, bh]); }
    for (let i = 0; i < sec.length - 1; i++) { const [ua, ha] = sec[i], [ub, hb] = sec[i + 1], va = vtop(ua), vb = vtop(ub); if (va < 1e-6 && vb < 1e-6) continue;
      const A = B(ua, 0, ha), Bq = B(ub, 0, hb), Cq = B(ub, vb, hb), D = B(ua, va, ha), kk = ha === hb ? k : kt;
      if (va < 1e-6) this.oq(A, Bq, Cq, Cq, kk, UP); else if (vb < 1e-6) this.oq(A, Bq, D, D, kk, UP); else this.oq(A, Bq, Cq, D, kk, UP); }
  }
  // gable roof, ridge along z; kp = colour of the pediments (tympanum set back under a raking cornice)
  gable(x, y, z, w, d, h, k = C.roof, kp = C.stone) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yr = y + h;
    this.slope([x0, y, z1], [x0, y, z0], [x, yr, z0], [x, yr, z1], k); this.slope([x1, y, z0], [x1, y, z1], [x, yr, z1], [x, yr, z0], k);
    const rec = Math.min(.3, d * .04, w * .05), tv = Math.min(.24, h * .2), dx = tv * w / (2 * h);
    if (rec < .04 || h < .35) { this.tri([x0, y, z1], [x1, y, z1], [x, yr, z1], kp); this.tri([x1, y, z0], [x0, y, z0], [x, yr, z0], kp); }
    else for (const s of [1, -1]) { const ze = z + s * d / 2, zi = ze - s * rec, n = [0, 0, s];
      s > 0 ? this.tri([x0 + dx, y, zi], [x1 - dx, y, zi], [x, yr - tv, zi], kp) : this.tri([x1 - dx, y, zi], [x0 + dx, y, zi], [x, yr - tv, zi], kp);
      this.oq([x0, y, ze], [x0 + dx, y, ze], [x, yr - tv, ze], [x, yr, ze], kp, n); this.oq([x1, y, ze], [x1 - dx, y, ze], [x, yr - tv, ze], [x, yr, ze], kp, n);
      this.oq([x0 + dx, y, ze], [x0 + dx, y, zi], [x, yr - tv, zi], [x, yr - tv, ze], kp, [h, -w / 2, 0]); this.oq([x1 - dx, y, ze], [x1 - dx, y, zi], [x, yr - tv, zi], [x, yr - tv, ze], kp, [-h, -w / 2, 0]);
      this.oq([x0 + dx, y + .012, ze], [x1 - dx, y + .012, ze], [x1 - dx, y + .012, zi], [x0 + dx, y + .012, zi], kp, UP); }
    // terracotta ridge kalypter
    this.box(x, yr - .04, z, Math.min(.22, w * .025), .12, d + .06, k);
  }
  hip(x, y, z, w, d, h, k = C.roof) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yr = y + h, r = Math.max(0, (d - w) / 2), q = Math.max(0, (w - d) / 2);
    this.slope([x0, y, z1], [x1, y, z1], [x + q, yr, z + r], [x - q, yr, z + r], k); this.slope([x1, y, z0], [x0, y, z0], [x - q, yr, z - r], [x + q, yr, z - r], k);
    this.slope([x1, y, z1], [x1, y, z0], [x + q, yr, z - r], [x + q, yr, z + r], k); this.slope([x0, y, z0], [x0, y, z1], [x - q, yr, z + r], [x - q, yr, z - r], k);
    if (k === C.roof && h > .5) { if (q + r > .15) this.box(x, yr - .08, z, 2 * q + .2, .08, 2 * r + .2, k); else this.cyl(x, yr - .3, z, .17, 0, .3, k, 8); }
  }
  // four sloping planes between an outer rectangle at y0 and an inner one at y1 (atrium and court roofs)
  roofRing(x, z, W, L, y0, w, l, y1, k = C.roof) {
    const o = [[x - W / 2, y0, z + L / 2], [x + W / 2, y0, z + L / 2], [x + W / 2, y0, z - L / 2], [x - W / 2, y0, z - L / 2]], i = [[x - w / 2, y1, z + l / 2], [x + w / 2, y1, z + l / 2], [x + w / 2, y1, z - l / 2], [x - w / 2, y1, z - l / 2]];
    for (let j = 0; j < 4; j++) this.slope(o[j], o[(j + 1) % 4], i[(j + 1) % 4], i[j], k);
  }
  prism(pts, y, h, k = C.stone) { // pts: [[x,z],...] convex, any winding
    const n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n, cz = pts.reduce((s, p) => s + p[1], 0) / n;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; this.quad([a[0], y, a[1]], [b[0], y, b[1]], [b[0], y + h, b[1]], [a[0], y + h, a[1]], k); this.tri([cx, y + h, cz], [a[0], y + h, a[1]], [b[0], y + h, b[1]], k); }
  }
  frame(x, y, z, W, L, t, h, k = C.stone) { this.box(x, y, z + L / 2 - t / 2, W, h, t, k); this.box(x, y, z - L / 2 + t / 2, W, h, t, k); this.box(x - W / 2 + t / 2, y, z, t, h, L - 2 * t, k); this.box(x + W / 2 - t / 2, y, z, t, h, L - 2 * t, k); }
  // stylised Mediterranean trees: 'cypress' (a dark flame) or 'pine' (umbrella stone pine); each under 250 triangles
  tree(x, z, h = 5, k = C.green, kind = 'cypress') {
    const fol = (cx, cy, cz, prof, kk, n, tw = 0) => { // faceted foliage: rings of a profile [[r,y,shade]...], top-down, each ring turned a little
      const P = (j, i) => { const a = (i + j * tw) / n * 2 * PI; return [cx + prof[j][0] * Math.cos(a), cy + prof[j][1], cz + prof[j][0] * Math.sin(a)]; };
      for (let j = 0; j < prof.length - 1; j++) { const c = tint(kk, prof[j + 1][2] || 1); for (let i = 0; i < n; i++) { if (prof[j][0] > 1e-6) this.tri(P(j, i), P(j, i + 1), P(j + 1, i + 1), c); if (prof[j + 1][0] > 1e-6) this.tri(P(j, i), P(j + 1, i + 1), P(j + 1, i), c); } } };
    if (kind === 'pine') {
      const kk = tint(k, .84, .88, .8), lean = h * .05;
      this.tube([[x, 0, z], [x + lean * .3, h * .3, z], [x + lean, h * .62, z + lean * .4], [x + lean * .8, h * .8, z + lean * .2]], [h * .034, h * .027, h * .021, h * .014], C.bark, 6);
      for (const [dx, dz, t] of [[.24, .05, .56], [-.2, .12, .6], [.02, -.22, .58]]) this.rod([x + lean * .8, h * t, z + lean * .3], [x + dx * h, h * .76, z + dz * h], h * .011, C.bark, 3);
      fol(x + lean, h * .7, z + lean * .3, [[0, h * .3, 1], [h * .17, h * .285, 1.06], [h * .31, h * .22, 1.02], [h * .38, h * .13, .97], [h * .33, h * .06, .88], [h * .12, h * .04, .78]], kk, 9, .5);
      fol(x + h * .25, h * .7, z + h * .07, [[0, h * .19, 1.04], [h * .13, h * .16, 1], [h * .19, h * .09, .94], [h * .14, h * .04, .84]], kk, 7, .5);
      fol(x - h * .22, h * .72, z + h * .13, [[0, h * .17, 1.05], [h * .12, h * .14, 1], [h * .17, h * .08, .93], [h * .12, h * .03, .84]], kk, 7, .5);
      return;
    }
    const kk = tint(k, .56, .66, .64);
    this.tube([[x, 0, z], [x, h * .14, z]], [h * .028, h * .022], C.bark, 5);
    fol(x, 0, z, [[0, h, 1], [h * .034, h * .9, 1.1], [h * .075, h * .72, 1.05], [h * .112, h * .5, 1], [h * .125, h * .3, .95], [h * .1, h * .16, .88], [h * .045, h * .1, .78]], kk, 7, .5);
  }
  figure(x, y, z, h = 1.8, k = C.stone) {
    this.lathe(x, y, z, [[h * .034, h * .84], [h * .04, h * .8], [h * .108, h * .76], [h * .1, h * .6], [h * .075, h * .5], [h * .1, h * .34], [h * .11, 0]], k, 10);
    this.ball(x, y + h * .82, z, h * .08, k, 8);
  }
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

// ------------------------------------------------------------------ the orders
// half-round moulding as a profile, bottom-up: four (or three) chords, each turning less than the ink angle
const torus = (rin, y, h, fine) => { if (fine) { const s = h / 3.078; return [[rin, y], [rin + .809 * s, y + .588 * s], [rin + 1.118 * s, y + 1.539 * s], [rin + .809 * s, y + 2.49 * s], [rin, y + h]]; } const s = h / 2.618; return [[rin, y], [rin + .588 * s, y + .809 * s], [rin + .588 * s, y + 1.809 * s], [rin, y + h]]; };
// quarter-round (echinus, ovolo) swelling from r0 at y0 out to r1 at y1
const ovolo = (r0, y0, r1, y1) => [[r0, y0], [r0 + (r1 - r0) * .5, y0 + (y1 - y0) * .134], [r0 + (r1 - r0) * .866, y0 + (y1 - y0) * .5], [r1, y1]];
const turn = (m, x, y, z, prof, k, n) => m.lathe(x, y, z, prof.slice().reverse(), k, n); // a profile listed bottom-up, facing out
// shaft with entasis (III.3.13); nf flutes cut as shallow facets (IV.3.9 twenty for the Doric, III.5.14 twenty-four for the Ionic)
function shaft(m, x, y0, z, h, rb, rt, k, nf, lod, off = 0) {
  const r = t => rb - (rb - rt) * Math.pow(t, 1.9);
  if (!nf) { const ts = lod > 1 ? [0, .36, .7, 1] : lod ? [0, .45, 1] : [0, 1]; turn(m, x, y0, z, ts.map(t => [r(t), t * h]), k, lod > 1 ? 16 : 10); return; }
  const ts = lod > 2 ? [0, .3, .62, 1] : [0, 1], n = 2 * nf, df = nf === 20 ? .034 : .03;
  for (let s = 0; s < ts.length - 1; s++) { const ra = r(ts[s]), rc = r(ts[s + 1]), ya = y0 + ts[s] * h, yc = y0 + ts[s + 1] * h;
    for (let i = 0; i < n; i++) { const a = off + i * PI / nf, b = off + (i + 1) * PI / nf, fa = i % 2 ? 1 - df : 1, fb = i % 2 ? 1 : 1 - df, ca = Math.cos(a) * fa, sa = Math.sin(a) * fa, cb = Math.cos(b) * fb, sb = Math.sin(b) * fb;
      const A0 = [x + ra * ca, ya, z + ra * sa], B0 = [x + ra * cb, ya, z + ra * sb], A1 = [x + rc * ca, yc, z + rc * sa], B1 = [x + rc * cb, yc, z + rc * sb]; m.tri(B0, A0, A1, k); m.tri(B0, A1, B1, k); } }
}
// Column by order. III.3.12 diminution by height; III.5.1-2 Attic base; III.5.5-7 Ionic capital; IV.1.1, IV.1.11-12 Corinthian; IV.3.4 Doric; IV.7.2-3 Tuscan.
// Detail follows the size: D >= 0.5 m is cut in full (flutes, tori, volutes, leaves), D >= 0.28 m is turned plain, smaller is a few solids.
// n < 12 asks for one level less (inner rows, upper tiers, crowds); n >= 24 for the show pieces, with the entasis cut in three drums.
// drum lying along z, smooth round
const drum = (m, x, y, z, r, len, k, n) => { for (let i = 0; i < n; i++) { const a = i / n * 2 * PI, b = (i + 1) / n * 2 * PI, na = [Math.cos(a), Math.sin(a), 0], nb = [Math.cos(b), Math.sin(b), 0], P = (q, zz) => [x + r * q[0], y + r * q[1], zz], z0 = z - len / 2, z1 = z + len / 2;
  m.tri(P(na, z0), P(nb, z0), P(nb, z1), k, na, nb, nb); m.tri(P(na, z0), P(nb, z1), P(na, z1), k, na, nb, na); m.tri([x, y, z1], P(na, z1), P(nb, z1), k); m.tri([x, y, z0], P(nb, z0), P(na, z0), k); } };
export function col(m, x, y, z, D, H, order = 'ionic', k = C.stone, n = 12, o = {}) { // o.base === false: no base (a capital shown on a stump)
  const ft = H / FT, dim = ft <= 15 ? 5 / 6 : ft <= 20 ? 5.5 / 6.5 : ft <= 30 ? 6 / 7 : ft <= 40 ? 6.5 / 7.5 : 7 / 8;
  const rb = D / 2; let rt = rb * dim, yb = y, yt = y + H, lod = D >= .5 ? 2 : D >= .28 ? 1 : 0; if (n < 12 && lod) lod--; else if (n >= 24 && lod > 1) lod = 3;
  const ns = lod > 2 ? 16 : 10, big = D >= .5 && lod > 0, based = o.base !== false; let nf = 0, off = 0;
  if (order === 'doric') { const hc = D / 2, aw = D * 1.08; nf = big ? 20 : 0;
    if (lod) { const r1 = rt + D * .012; turn(m, x, yt - hc, z, [[rt, 0], [rt, hc * .3], [r1, hc * .3], [r1, hc * .36], ...ovolo(r1, hc * .36, aw * .49, hc * .64).slice(1), [aw * .49, hc * 2 / 3]], k, ns); m.slab(x, yt - hc / 3, z, aw, hc / 3, aw, k); }
    else { m.cyl(x, yt - hc, z, rt, rt * 1.35, hc * .55, k, 10, false); m.box(x, yt - hc * .45, z, aw, hc * .45, aw, k); }
    yt -= hc; }
  else if (order === 'tuscan') { rt = rb * .75; const hc = D / 2;
    if (lod) { if (based) { m.cyl(x, y, z, rb * 1.4, rb * 1.4, D / 4, k, 16); turn(m, x, y + D / 4, z, [...torus(rb * 1.12, 0, D * .19, lod > 2), [rb * 1.07, D * .19], [rb * 1.07, D * .225], [rb, D / 4]], k, ns); }
      const r1 = rt * 1.07; turn(m, x, yt - hc, z, [[rt, 0], [rt, hc * .28], [r1, hc * .28], [r1, hc * .35], ...ovolo(r1, hc * .35, D * .5, hc * .64).slice(1), [D * .5, hc * 2 / 3]], k, ns); m.slab(x, yt - hc / 3, z, D * 1.05, hc / 3, D * 1.05, k); }
    else { if (based) { m.cyl(x, y, z, rb * 1.4, rb * 1.4, D / 4, k, 10); m.cyl(x, y + D / 4, z, rb * 1.2, rb * 1.2, D / 4, k, 10); } m.cyl(x, yt - hc, z, rt, rt * 1.3, hc * .5, k, 10, false); m.box(x, yt - hc * .5, z, D * 1.05, hc * .5, D * 1.05, k); }
    if (based) yb += D / 2; yt -= hc; }
  else { nf = big ? 24 : 0; off = PI / 24;
    if (!based) ; else if (lod) { m.box(x, y, z, 1.5 * D, D / 6, 1.5 * D, k); const u = D / 3, tL = u * 3 / 8, tU = u / 4; // III.5.2: upper torus a quarter; the rest shared by the lower torus and the scotia with its fillets
      turn(m, x, y + D / 6, z, [...torus(rb * 1.27, 0, tL, lod > 2), [rb * 1.2, tL], ...(lod > 1 ? [[rb * 1.11, tL + (u - tL - tU) * .45]] : []), [rb * 1.13, u - tU], ...(lod > 1 ? torus(rb * 1.13, u - tU, tU, false).slice(1) : [[rb * 1.19, u - tU * .7], [rb * 1.19, u - tU * .3], [rb * 1.13, u]]), [rb, u]], k, ns); }
    else { m.box(x, y, z, 1.5 * D, D / 6, 1.5 * D, k); m.cyl(x, y + D / 6, z, rb * 1.36, rb * 1.18, D / 3, k, 10); }
    if (based) yb += D / 2;
    if (order === 'corinthian') { const y0 = yt - D, ra = D * .625, ah = D * .15;
      if (lod) { turn(m, x, y0, z, [[rt * 1.08, -D * .045], [rt * 1.08, 0], [rt * 1.02, D * .5], [rt * 1.2, D * .73], [ra * .92, D * .85]], k, ns); // astragal and bell
        // IV.1.12: two rows of leaves, the stalks and volutes above them running out to the corners of the abacus
        const leaf = (a, ya, yb2, out, wd) => { const ca = Math.cos(a), sa = Math.sin(a), r0 = rt * 1.03, P = (r, yy, s) => [x + r * ca - s * sa, y0 + yy, z + r * sa + s * ca], hh = yb2 - ya;
          const q = lod > 1 ? [[r0, ya, wd * .86], [r0 + out * .1, ya + hh * .5, wd], [r0 + out * .5, ya + hh * .88, wd * .8], [r0 + out, yb2, wd * .42]] : [[r0, ya, wd * .9], [r0 + out * .3, ya + hh * .75, wd * .9], [r0 + out, yb2, wd * .42]];
          for (let j = 0; j < q.length - 1; j++) m.quad(P(q[j][0], q[j][1], -q[j][2]), P(q[j][0], q[j][1], q[j][2]), P(q[j + 1][0], q[j + 1][1], q[j + 1][2]), P(q[j + 1][0], q[j + 1][1], -q[j + 1][2]), k);
          const e = q[q.length - 1]; m.tri(P(e[0], e[1], -e[2]), P(e[0], e[1], e[2]), P(e[0] + out * .06, e[1] - hh * .17, 0), k); };
        for (let i = 0; i < 8; i++) { leaf(i * PI / 4, D * .02, D * .32, D * .1, D * .15); leaf(i * PI / 4 + PI / 8, D * .2, D * .58, D * .13, D * .13); }
        for (let i = 0; i < 4; i++) { const a = PI / 4 + i * PI / 2, ca = Math.cos(a), sa = Math.sin(a), rc = ra * 1.414 - D * .115;
          if (lod > 1) { m.ring([x + rc * ca, y0 + D * .755, z + rc * sa], [[ca, 0, sa], UP], D * .085, 0, D * .07, k, lod > 2 ? 12 : 8); m.beam([x + rt * 1.1 * ca, y0 + D * .56, z + rt * 1.1 * sa], [x + (rc - D * .05) * ca, y0 + D * .7, z + (rc - D * .05) * sa], D * .042, k); }
          else m.quad([x + (rc - D * .1) * ca, y0 + D * .65, z + (rc - D * .1) * sa], [x + (rc + D * .1) * ca, y0 + D * .65, z + (rc + D * .1) * sa], [x + (rc + D * .1) * ca, y0 + D * .85, z + (rc + D * .1) * sa], [x + (rc - D * .1) * ca, y0 + D * .85, z + (rc - D * .1) * sa], k); }
        // IV.1.11: abacus a seventh of the height, its sides drawn in
        const cv = ra * .86, pts = [[-ra, ra], [0, cv], [ra, ra], [cv, 0], [ra, -ra], [0, -cv], [-ra, -ra], [-cv, 0]]; m.prism(pts.map(p => [x + p[0], z + p[1]]), yt - ah, ah, k);
        for (let i = 0; i < 8; i++) { const p = pts[i], q = pts[(i + 1) % 8]; m.tri([x, yt - ah, z], [x + q[0], yt - ah, z + q[1]], [x + p[0], yt - ah, z + p[1]], k); } }
      else { m.cyl(x, y0, z, rt, rt * 1.5, D * .85, k, 10, false); m.box(x, yt - ah, z, 2 * ra, ah, 2 * ra, k); }
      yt -= D; }
    else { const hc = D / 3, aw = D * 1.06, ah = hc * .35;
      if (lod) { // III.5.5-7: abacus, cushion, volutes hanging beside the shaft, echinus between them
        const rv = D * .19, vx = D * .71 - rv, vy = yt - ah - rv + D * .015, vd = D * .95, yc = vy + rv * .3, r1 = rt * 1.07;
        m.slab(x, yt - ah, z, aw, ah, aw, k); m.box(x, yc, z, 2 * vx, yt - ah - yc, vd * .94, k);
        turn(m, x, yt - hc, z, [[r1, -D * .045], [r1, 0], ...ovolo(r1, 0, D * .56, yc - (yt - hc)).slice(1)], k, ns);
        for (const s of [-1, 1]) { drum(m, x + s * vx, vy, z, rv, vd, k, lod > 2 ? 16 : 10);
          if (lod > 1) for (const q of [-1, 1]) { const zz = z + q * (vd / 2 + D * .012), ns2 = lod > 2 ? 16 : 10, R = j => rv * (.97 - .6 * j / ns2), Pt = (j, rr) => { const f = j / ns2 * 2.6 * PI; return [x + s * (vx + rr * Math.sin(f)), vy + rr * Math.cos(f), zz]; };
            for (let j = 0; j < ns2; j++) m.oq(Pt(j, R(j)), Pt(j + 1, R(j + 1)), Pt(j + 1, R(j + 1) * .74), Pt(j, R(j) * .74), k, [0, 0, q]); } } }
      else { m.box(x, yt - hc, z, D * 1.42, hc * .7, D * .95, k); m.box(x, yt - ah, z, aw, ah, aw, k); }
      yt -= hc; }
  }
  shaft(m, x, yb, z, yt - yb, rb, rt, k, nf, lod, off);
}
// colonnaded court: outer wall, ring of columns, lean-to roofs falling inward
export function court(m, W, L, o = {}) {
  const { dep = 3.5, H = 3.5, D = .45, order = 'doric', wall = H + 1.6, A = 2.8, sides = [1, 1, 1, 1], t = .5, door, win = 1 } = o; // sides: front, right, back, left; door: { w, h } street door in the front wall
  m.box(0, 0, 0, W, .15, L, C.shade);
  // the wall to the street: small lights high up, never a window to look in by
  const wl = (key, len, n = Math.max(1, Math.round(len / 4.5))) => win ? Array.from({ length: n }, (_, i) => ({ [key]: -len / 2 + (i + .5) * len / n, w: .55, v: wall - 1.5, h: .8, d: .2, kind: 'win', bars: 0 })) : [];
  const fr = wl('x', W - 2).filter(q => !door || Math.abs(q.x) > door.w / 2 + .8); if (door) fr.push({ x: 0, w: door.w, v: 0, h: door.h, d: .3, kind: 'door' });
  m.wbox(0, .15, L / 2 - t / 2, W, wall, t, C.stone, { f: fr }); m.wbox(0, .15, -L / 2 + t / 2, W, wall, t, C.stone, { b: wl('x', W - 2) });
  m.wbox(-W / 2 + t / 2, .15, 0, t, wall, L - 2 * t, C.stone, { l: wl('z', L - 2 * t - 1) }); m.wbox(W / 2 - t / 2, .15, 0, t, wall, L - 2 * t, C.stone, { r: wl('z', L - 2 * t - 1) });
  const w = W - 2 * dep, l = L - 2 * dep, nx = Math.max(2, Math.round(w / A) + 1), nz = Math.max(2, Math.round(l / A) + 1);
  for (let i = 0; i < nx; i++) { const x = -w / 2 + w * i / (nx - 1); if (sides[0]) col(m, x, .15, l / 2, D, H, order); if (sides[2]) col(m, x, .15, -l / 2, D, H, order); }
  for (let i = 1; i < nz - 1; i++) { const z = -l / 2 + l * i / (nz - 1); for (const s of [1, -1]) if (sides[s > 0 ? 1 : 3]) m.at(s * w / 2, .15, z, PI / 2, () => col(m, 0, 0, 0, D, H, order)); } // the side ranges turn their capitals to the court
  m.frame(0, .15 + H, 0, w + D, l + D, D, .35, C.stone); m.roofRing(0, 0, W - t, L - t, .15 + wall - .1, w + D + .5, l + D + .5, .15 + H + .35);
}
