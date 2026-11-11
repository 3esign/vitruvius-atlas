// Forms of the city, each built from the numbers Vitruvius gives (addresses in rules.js).
// A form draws itself at its nominal size in metres; city_build scales the lot, never the proportions.
import { M, C, col, court, bakeAO, FT, CU, PI } from './mesh.js';
const S = C.stone, W = C.wood, R = C.roof, cos = Math.cos, sin = Math.sin;
const each = (n, f) => { for (let i = 0; i < n; i++) f(i, n > 1 ? i / (n - 1) : 0); };
const slab = (m, w, d, k = C.shade, h = .2) => m.box(0, 0, 0, w, h, d, k);
const wheelX = (m, x, y, z, Rr, w = .25, k = W, sp = 6) => { m.ring([x, y, z], 'x', Rr, Rr * .82, w, k, 14); m.ring([x, y, z], 'x', Rr * .16, 0, w * 1.3, k, 8); each(sp, i => { const a = i / sp * 2 * PI; m.beam([x, y, z], [x, y + Rr * .85 * sin(a), z + Rr * .85 * cos(a)], Rr * .09, k); }); };
// base course round a block, broken at its doors; ops as for M.wbox
const plinth = (m, x, y, z, w, d, ops = {}, h = .34, pr = .06, k = C.shade) => {
  const cut = (lo, hi, list, f) => { let seg = [[lo, hi]]; for (const o of list || []) if (o.kind === 'door' && !(o.v > .05)) { const c = f(o), hw = o.w / 2 + (o.fr ? Math.max(.08, o.w / 7) * 1.5 : 0) + .01; seg = seg.flatMap(([a, b]) => c + hw <= a || c - hw >= b ? [[a, b]] : [[a, c - hw], [c + hw, b]].filter(q => q[1] - q[0] > .05)); } return seg; };
  for (const [a, b] of cut(x - w / 2 - pr, x + w / 2 + pr, ops.f, o => o.x)) m.box((a + b) / 2, y, z + d / 2, b - a, h, 2 * pr, k);
  for (const [a, b] of cut(x - w / 2 - pr, x + w / 2 + pr, ops.b, o => o.x)) m.box((a + b) / 2, y, z - d / 2, b - a, h, 2 * pr, k);
  for (const [a, b] of cut(z - d / 2 + pr, z + d / 2 - pr, ops.r, o => o.z)) m.box(x + w / 2, y, (a + b) / 2, 2 * pr, h, b - a, k);
  for (const [a, b] of cut(z - d / 2 + pr, z + d / 2 - pr, ops.l, o => o.z)) m.box(x - w / 2, y, (a + b) / 2, 2 * pr, h, b - a, k);
};
// cornice under the eaves of a W x L block whose walls end at y: cavetto and fascia
const eaves = (m, x, y, z, w, d, pr = .13, h = .2, k = S) => m.mould(x, y - h, z, w, d, [[0, 0], [pr, h * .45], [pr, h]], k, false);
// row of openings along a wall: n of them over a length centred on c, each a copy of `o` placed by key 'x' or 'z'
const row = (key, c, len, n, o) => Array.from({ length: n }, (_, i) => ({ ...o, [key]: c - len / 2 + (i + .5) * len / n }));
const hall = (m, x, z, w, d, h, o = {}) => { const k = o.k || S, ops = { ...(o.ops || {}) };
  if (o.win !== 0) { const wh = Math.min(1.1, h * .26), wl = row('z', z, d, Math.max(1, Math.round(d / 3.2)), { w: .7, v: h - wh - .7, h: wh, d: .22, kind: 'win' }); ops.l = (ops.l || []).concat(wl); ops.r = (ops.r || []).concat(wl); }
  m.wbox(x, 0, z, w, h, d, k, ops, false); plinth(m, x, 0, z, w, d, ops, .34, .06, k === S ? C.shade : k);
  if (o.flat) m.slab(x, h, z, w + .4, .25, d + .4, S); else { eaves(m, x, h, z, w, d, .13, .2, k); if (o.hip) m.hip(x, h, z, w + .8, d + .8, o.pitch || w * .2, R); else m.gable(x, h, z, w + .7, d + .7, o.pitch || w / 6, R, k); } };
// framed double door set on a wall that looks to +z (z = 4 cm in front of the wall); where the wall is built with M.wbox the door is a real opening instead
const door = (m, x, z, w, h, y = 0, kf = C.marble) => {
  const c = Math.min(.24, w / 7), iw = w - 2 * c, ih = h - c, zl = z - .025, st = iw / 12, hm = y + ih * .58, q = (a, b, c2, d, zz, k) => m.quad([a, c2, zz], [b, c2, zz], [b, d, zz], [a, d, zz], k);
  for (const s of [-1, 1]) m.box(x + s * (w - c) / 2, y, z, c, ih, .12, kf); m.slab(x, y + ih, z, w, c, .12, kf);
  q(x - iw / 2, x + iw / 2, y, y + ih, zl, C.door); q(x - st * .12, x + st * .12, y, y + ih, zl + .008, C.dark);
  for (const [a, b] of [[x - iw / 2 + st, x - st], [x + st, x + iw / 2 - st]]) { q(a, b, y + st, hm - st / 2, zl + .02, W); q(a, b, hm + st / 2, y + ih - st, zl + .02, W); }
};
// straight flight of n steps rising towards -z from zs + n * tread to zs: risers and treads only
const flight = (m, x, zs, w, n, rise, tread, k = S) => each(n, i => { const za = zs + (n - i) * tread, zc = za - tread, ya = i * rise, yb = ya + rise; m.quad([x - w / 2, ya, za], [x + w / 2, ya, za], [x + w / 2, yb, za], [x - w / 2, yb, za], k); m.quad([x - w / 2, yb, za], [x + w / 2, yb, za], [x + w / 2, yb, zc], [x - w / 2, yb, zc], k); });
// III.5.12 acroterion: a plinth and a turned finial
const acro = (m, x, y, z, w, h, k) => { m.box(x, y, z, w, h * .2, w, k); m.lathe(x, y, z, [[0, h], [w * .13, h * .92], [w * .36, h * .78], [w * .5, h * .56], [w * .4, h * .36], [w * .26, h * .2]], k, 8); };
// ------------------------------------------------------------------ temples (III, IV)
function temple(m, p) {
  const plan = p.plan || 'prostyle', order = p.order || 'ionic', sp = p.spacing || (order === 'doric' ? 'diastyle' : 'eustyle');
  const D = .9, gap = { pycno: 1.5, systyle: 2, diastyle: 3, araeo: 4, eustyle: 2.25 }[sp], A = (gap + 1) * D;
  const H = (order === 'doric' ? 7 : { pycno: 10, systyle: 9.5, diastyle: 8.5, araeo: 8, eustyle: 9.5 }[sp] + (order === 'corinthian' ? 2 / 3 : 0)) * D;
  const nF = +p.n || { antis: 4, prostyle: 4, amphi: 4, peripteral: 6, pseudodipteral: 8, dipteral: 8, hypaethral: 10, pseudoperipteral: 4 }[plan];
  const xs = []; { let x = 0; each(nF, i => { xs.push(x); x += sp === 'eustyle' && i === nF / 2 - 1 ? 4 * D : A; }); const c = (xs[0] + xs[nF - 1]) / 2; each(nF, i => xs[i] -= c); }
  const Wd = xs[nF - 1] - xs[0], ringed = ['peripteral', 'pseudodipteral', 'dipteral', 'hypaethral'].includes(plan), nS = 2 * nF - 1;
  const L = ringed ? (nS - 1) * A : 2 * (Wd + D) - D, zs = Array.from({ length: nS }, (_, i) => L / 2 - i * A), e = .8 * D, rise = .24, tread = .5;
  let y0;
  if (p.podium) { y0 = 7 * rise; const sw = Wd * .8 - 1, zq = L / 2 + e; // III.4.5 podium: plinth, die and cornice; the steps between cheek walls
    m.mould(0, 0, 0, Wd + 2 * e - .2, L + 2 * e - .2, [[.1, 0], [.1, .26], [.03, .36], [0, .4], [0, y0 - .34], [.04, y0 - .28], [.1, y0 - .2], [.1, y0]], S);
    flight(m, 0, zq, sw, 7, rise, tread); for (const s of [-1, 1]) m.box(s * (sw / 2 + .25), 0, zq + 3.5 * tread, .5, y0, 7 * tread, S); }
  else { const ns = nF >= 8 ? 5 : 3, pr = []; each(ns, i => { const o = e + (ns - 1 - i) * tread; pr.push([o, i * rise], [o, (i + 1) * rise]); }); m.mould(0, 0, 0, Wd, L, pr, S); y0 = ns * rise; }
  const put = (x, z, n, rot) => rot ? m.at(x, y0, z, rot, () => col(m, 0, 0, 0, D, H, order, S, n)) : col(m, x, y0, z, D, H, order, S, n), open = plan === 'hypaethral', Q = PI / 2; // flank columns turn their capitals outwards
  let cw, zf, zb;
  if (ringed) {
    for (const x of xs) { put(x, L / 2); put(x, -L / 2); } for (const z of zs.slice(1, -1)) { put(xs[0], z, 12, Q); put(xs[nF - 1], z, 12, Q); }
    if (plan === 'dipteral' || open) { for (const x of xs.slice(1, -1)) { put(x, zs[1], 8); put(x, zs[nS - 2], 8); } for (const z of zs.slice(2, -2)) { put(xs[1], z, 8, Q); put(xs[nF - 2], z, 8, Q); } }
    const ci = plan === 'peripteral' ? 1 : 2; cw = xs[nF - 1 - ci] - xs[ci] + D; zf = zs[ci + 1]; zb = zs[nS - 1 - ci]; put(xs[nF / 2 - 1], zs[ci], 8); put(xs[nF / 2], zs[ci], 8);
  } else {
    cw = Wd + D; zf = L / 2 - 3 / 8 * (L + D); zb = -L / 2 + (plan === 'amphi' ? A : 0) - D / 2;
    const inner = plan === 'antis' ? xs.slice(1, -1) : xs; for (const x of inner) put(x, L / 2); if (plan === 'amphi') for (const x of xs) put(x, -L / 2);
    const za = plan === 'antis' ? L / 2 + D / 2 : L / 2 - A; // antae with their bases and capitals
    for (const sx of [-1, 1]) { const ax = sx * (cw / 2 - .3 * D); m.box(ax + sx * .02, y0, (zf + za) / 2 - .01, .6 * D + .04, H, za - zf + .02, S); m.box(ax, y0, za - .34 * D, .72 * D, .25 * D, .72 * D, S); m.slab(ax, y0 + H - .3 * D, za - .34 * D, .74 * D, .3 * D, .74 * D, S); }
    if (plan === 'pseudoperipteral') { for (let z = L / 2 - A; z > zb; z -= A) { put(-Wd / 2, z, 8, Q); put(Wd / 2, z, 8, Q); } for (const x of xs) put(x, zb + D / 2, 8); }
  }
  // cella: IV.6.1-3 doorway two and a half parts of three and a half of the height, Doric 5.5/12 wide, Ionic 1/2.5; leaves and casing
  const cz = (zf + zb) / 2, cl = zf - zb, dh = H * 2.5 / 3.5, dw = order === 'doric' ? dh * 5.5 / 12 : dh / 2.5, dop = { x: 0, w: dw, v: 0, h: dh, d: .34, kind: 'door', fr: .07 };
  if (open) { const t = .6 * D; m.wbox(0, y0, zf - t / 2, cw, H, t, S, { f: [dop] }); m.wbox(0, y0, zb + t / 2, cw, H, t, S, { b: [dop] }); for (const s of [-1, 1]) m.box(s * (cw / 2 - t / 2), y0, cz, t, H, cl - 2 * t, S); }
  else m.wbox(0, y0, cz, cw, H, cl, S, { f: [dop] }, false);
  plinth(m, 0, y0, cz, cw, cl, { f: [dop], b: open ? [dop] : [] }, .3, .05, S);
  const ft = H / FT, ha = order === 'doric' ? D / 2 : ft <= 15 ? D / 2 : ft <= 20 ? H / 13 : ft <= 25 ? H / 12.5 : H / 12, hf = order === 'doric' ? .75 * D : .75 * ha, hc = order === 'doric' ? .3 * D : .7 * ha;
  const ew = Wd + D, el = L + D, ez = 0, ya = y0 + H, pr = .35 * D;
  // entablature as one moulded profile: III.5.10 three fasciae and cymatium, frieze, dentil band, corona and sima; IV.3.4-6 Doric taenia, triglyphs, corona
  const B = open ? 2 * A + D : Math.min(ew, el) / 2, ka = sp === 'araeo' ? W : S, y1 = ha, y2 = ha + hf, y3 = y2 + hc, fo = -.04 * D; let prof;
  if (order === 'doric') prof = [[-B, 0], [0, 0, ka], [0, ha * .86, ka], [.025 * D, ha * .86, ka], [.025 * D, y1, ka], [fo, y1, ka], [fo, y2], [.03 * D, y2], [.03 * D, y2 + hc * .25], [pr * .88, y2 + hc * .25], [pr * .88, y2 + hc * .72], [pr, y3]];
  else { const q = ha * 6 / 7 / 12, s = .014 * D; prof = [[-B, 0], [0, 0, ka], [0, 3 * q, ka], [s, 3 * q, ka], [s, 7 * q, ka], [2 * s, 7 * q, ka], [2 * s, 12 * q, ka], [2 * s + .03 * D, y1, ka], [fo, y1, ka], [fo, y2], [.02 * D, y2], [.02 * D, y2 + hc * .34], [pr * .82, y2 + hc * .34], [pr * .82, y2 + hc * .72], [pr, y3]]; }
  if (open) prof.push([-B, y3]);
  m.mould(0, ya, ez, ew, el, prof, S, false); if (open) m.mould(0, ya, ez, ew - 2 * B, el - 2 * B, [[0, 0], [0, y3]], S, false, true);
  if (order === 'doric') { const tw = D / 2, trig = (x, z, rot) => m.at(x, ya, z, rot, () => { // triglyph a module wide with its two glyphs, capital and regula
      m.box(0, ha, -.03, tw, hf * .9, .12, C.shade); m.box(0, ha + hf * .9, -.02, tw, hf * .1, .14, C.shade); m.box(0, ha * .86 - .05 * D, .015 * D, tw, .05 * D, .03 * D, S);
      for (const s of [-1, 1]) m.quad([s * tw * .2 - tw * .07, ha + .03, .034], [s * tw * .2 + tw * .07, ha + .03, .034], [s * tw * .2 + tw * .07, ha + hf * .84, .034], [s * tw * .2 - tw * .07, ha + hf * .84, .034], C.dark); });
    for (let i = 0; i < nF; i++) for (const q of i < nF - 1 ? [0, .5] : [0]) { const x = xs[i] + q * (xs[i + 1] - xs[i] || 0); trig(x, el / 2, 0); trig(x, -el / 2, PI); }
    for (let z = el / 2 - D / 2; z > -el / 2; z -= A / 2) { trig(ew / 2, z, PI / 2); trig(-ew / 2, z, -PI / 2); } }
  else { const hd = hc * .28, pitch = Math.max(.2, (ew + el) / 110), dwd = pitch * .55, yd = ya + y2 + hc * .05, dp = .05 * D, row2 = (len, f) => { const n = Math.floor(len / pitch); each(n, i => f(-len / 2 + (i + .5) * len / n)); }; // III.5.11 dentils
    row2(ew, x => { for (const s of [-1, 1]) m.box(x, yd, ez + s * (el / 2 + .02 * D + dp / 2), dwd, hd, dp, S); }); row2(el, z => { for (const s of [-1, 1]) m.box(s * (ew / 2 + .02 * D + dp / 2), yd, ez + z, dp, hd, dwd, S); }); }
  const yr = ya + y3, rw = ew + 2 * pr, rl = el + 2 * pr, th = rw / 9;
  const ped = zc => {
    const d0 = open ? 2 * A + D : rl, zf0 = zc + d0 / 2, zb0 = zc - d0 / 2;
    m.gable(0, yr, zc, rw, d0, th, R, S);
    for (const sz of [zf0, zb0]) {
      m.beam([-rw / 2, yr, sz], [0, yr + th, sz], .18 * D, C.marble);
      m.beam([rw / 2, yr, sz], [0, yr + th, sz], .18 * D, C.marble);
      // III.5.12 acroteria: corners = tympanum height (scaled to architectural finial block), apex = 9/8 corner
      const acH = Math.min(.95, th * .42);
      for (const sx of [-1, 1]) acro(m, sx * (rw / 2 - .18), yr + .04, sz, .28 * D, acH, C.bronze);
      acro(m, 0, yr + th, sz, .32 * D, acH * 1.125, C.gold);
    }
  };
  if (open) for (const s of [-1, 1]) ped(s * (rl / 2 - A - D / 2)); else ped(0);
  if (p.altar) m.at(0, 0, L / 2 + e + 5, 0, () => altar(m, {}));
}
function tuscan(m) { // IV.7: width 5/6 of length; front half columns, rear half three cellae 3:4:3; column = W/3, D = H/7
  const Wd = 15, L = 18, H = Wd / 3, D = H / 7, y0 = 1.2, sw = Wd * .6 - 1, zq = L / 2 + .5;
  m.mould(0, 0, 0, Wd + .8, L + .8, [[.1, 0], [.1, .22], [.03, .3], [0, .34], [0, y0 - .26], [.05, y0 - .18], [.1, y0 - .12], [.1, y0]], S);
  flight(m, 0, zq, sw, 5, .24, .5); for (const s of [-1, 1]) m.box(s * (sw / 2 + .25), 0, zq + 1.25, .5, y0, 2.5, S);
  const xs = [-Wd / 2 + D, -Wd * .2, Wd * .2, Wd / 2 - D]; for (const x of xs) { col(m, x, y0, L / 2 - D, D, H, 'tuscan'); col(m, x, y0, L / 4 - D / 2, D, H, 'tuscan'); }
  const dops = [-Wd * .35, 0, Wd * .35].map(x => ({ x, w: x ? 1.4 : 1.8, v: 0, h: H * .7, d: .3, kind: 'door', fr: .06 }));
  m.wbox(0, y0, -L / 4, Wd, H, L / 2, S, { f: dops }, false); plinth(m, 0, y0, -L / 4, Wd, L / 2, { f: dops }, .3, .05, S);
  // IV.7.4-5: timber architraves; the mutules project a quarter of the column height under the eaves
  const pj = H / 4, yb = y0 + H + D; m.mould(0, y0 + H, 0, Wd + .4, L + .4, [[-(Wd + .4) / 2, 0], [0, 0], [0, D]], W, false);
  each(13, (i, t) => { const z = -L / 2 + .3 + t * (L - .6); for (const s of [-1, 1]) m.slab(s * (Wd / 2 + pj / 2), yb - .26, z, pj - .2, .26, .3, W); });
  m.gable(0, yb, 0, Wd + 2 * pj, L + 2 * pj, Wd / 5, R, S);
}
function tholos(m, p) { // IV.8
  const peri = +p.peripteral, d = 9, r = d / 2, n = peri ? 18 : 12;
  // round entablature: two fasciae, frieze, corona; ri = inner radius of the ring (0: a full ceiling)
  const ent = (y, ri) => m.lathe(0, y, 0, [[ri, .6], [r, .6], [r - .04, .5], [r - .04, .42], [r - .2, .36], [r - .2, .3], [r - .26, .3], [r - .26, .12], [r - .29, .12], [r - .29, 0], [ri, 0], ...(ri ? [[ri, .6]] : [])], S, 24);
  const ringOf = (y, D, H) => each(n, i => { const a = i / n * 2 * PI; m.at((r - D) * cos(a), y, (r - D) * sin(a), PI / 2 - a, () => col(m, 0, 0, 0, D, H, 'corinthian')); });
  if (!peri) { const ph = d / 3, H = d, D = H / 10; // monopteros: tribunal a third of the diameter, columns as high as the diameter
    m.lathe(0, 0, 0, [[0, ph], [r, ph], [r, ph - .14], [r - .07, ph - .22], [r - .12, ph - .28], [r - .12, .42], [r - .06, .34], [r, .28], [r, 0]], S, 24);
    each(7, i => m.box(0, 0, r + (7 - i) * .22, 2.4, (i + 1) * ph / 7, (7 - i) * .44, S)); ringOf(ph, D, H); ent(ph + H, r - 1.4 * D); m.dome(0, ph + H + .6, 0, r, R, 24, 6, 1); }
  else { m.lathe(0, 0, 0, [[0, .75], [r, .75], [r, .5], [r + .45, .5], [r + .45, .25], [r + .9, .25], [r + .9, 0]], S, 24);
    const y = .75, rc = r * (1 - 2 / 5), H = 2 * rc, D = H / 10; ringOf(y, D, H); // peripteros: cella three fifths of the whole, the tholus half the diameter, the flower on top
    m.cyl(0, y, 0, rc, rc, H, S, 24, false); m.lathe(0, y, 0, [[rc, .36], [rc + .06, .28], [rc + .06, 0]], S, 24); door(m, 0, rc, 1.3, H * .7, y);
    ent(y + H, 0); m.dome(0, y + H + .6, 0, r, R, 24, 6, (d / 2 - .6) / r);
    m.lathe(0, y + H + d / 2, 0, [[0, .8], [.1, .7], [.06, .55], [.18, .42], [.3, .26], [.12, .12], [.2, 0]], C.bronze, 8); }
}
function altar(m) { each(3, i => m.box(0, i * .22, 0, 4.2 - i * .7, .22, 3 - i * .7, S)); m.box(0, .66, 0, 2.4, 1.1, 1.2, C.marble); m.box(0, 1.76, 0, 2.7, .18, 1.5, C.marble); for (const s of [-1, 1]) m.ring([s * 1.15, 2.02, 0], 'z', .16, 0, 1.4, C.marble, 8); }

// ------------------------------------------------------------------ public buildings (V)
function stoa(m, p) { // V.9.2-3: aisle depth = column height; Doric outside, 15 modules high; V.1.3 upper tier 3/4
  const n = +p.n || 7, dbl = +p.double, two = +p.storeys === 2, D = .7, H = 7.5 * D, A = 3.75 * D, len = (n - 1) * A, T = (dbl ? 2 : 1) * H, f = .3;
  m.box(0, 0, 0, len + 2 * D, f, T + D, C.shade); let yt = f + H;
  each(n, i => { const x = -len / 2 + i * A; if (+p.fig) { m.box(x, f, T / 2, .7, .5, .7, S); m.figure(x, f + .5, T / 2, H - .5); } else col(m, x, f, T / 2, D, H, 'doric'); if (dbl && i % 2 === 0) col(m, x, f, T / 2 - H, D * .9, H, 'ionic', S, 8); });
  // entablature over the front: architrave with taenia, frieze (triglyphs over and twice between the columns), cornice
  const eb = (y, h, d, tri) => { const c = .07, dd = d - 2 * c; m.mould(0, y, T / 2, len + D - 2 * c, dd, [[-dd / 2, 0], [0, 0], [0, h * .36], [.02, h * .36], [.02, h * .4], [-.02, h * .4], [-.02, h * .76], [.02, h * .8], [c, h * .84], [c, h]], S);
    if (tri) each(3 * (n - 1) + 1, (i, t) => { for (const s of [-1, 1]) m.box(-len / 2 + t * len, y + h * .4, T / 2 + s * (dd / 2 - .02), D * .3, h * .36, .08, C.shade); }); };
  eb(yt, .55, D, !+p.fig); yt += .55;
  if (two) { m.slab(0, yt, 0, len + D, .25, T + D, S); yt += .25; each(n, i => col(m, -len / 2 + i * A, yt, T / 2, D * .75, H * .75, 'ionic')); yt += H * .75; eb(yt, .4, D * .75, false); yt += .4; }
  const hb = yt + T * .22, wl = row('x', 0, len - 1, Math.max(2, Math.round(len / 5)), { w: .8, v: Math.min(H * .6, hb - f - 1.7), h: 1, d: .2, kind: 'win' });
  m.wbox(0, f, -T / 2, len + D, hb - f, .5, S, { b: wl }); for (const s of [-1, 1]) m.box(s * (len + D - .5) / 2, f, -T / 4, .5, yt - f, T / 2, S);
  m.slope([-len / 2 - D, yt, T / 2 + D], [len / 2 + D, yt, T / 2 + D], [len / 2 + D, hb + .05, -T / 2 - .3], [-len / 2 - D, hb + .05, -T / 2 - .3], R);
}
function exedra(m) { // V.11.2
  const r = 4.2, h = 4.2, D = .5; m.ring([0, .1, 0], 'y', r + .4, 0, .2, C.shade, 20, PI, 2 * PI); m.box(0, 0, 1.2, 2 * r + .8, .2, 2.4, C.shade);
  m.lathe(0, .2, 0, [[r, 0], [r, h], [r + .45, h], [r + .45, h - .22], [r + .4, h - .3], [r + .4, .5], [r + .45, .4], [r + .45, 0]], S, 20, PI, 2 * PI);
  m.lathe(0, .2, 0, [[r - .93, 0], [r - .93, .36], [r - 1, .39], [r - 1, .45], [r, .45], [r, .9]], C.marble, 20, PI, 2 * PI, true);
  m.lathe(0, .2 + h, 0, Array.from({ length: 6 }, (_, j) => [(r + .45) * cos((5 - j) / 5 * PI / 2), (r + .45) * .8 * sin((5 - j) / 5 * PI / 2)]), R, 20, PI, 2 * PI);
  for (const s of [-1, 1]) { m.box(s * (r + .22), .2, 1.2, .45, h, 2.4, S); col(m, s * r / 3, .2, 2.1, D, h, 'ionic'); }
  m.mould(0, .2 + h, 2.1, 2 * r + .78, .48, [[-.24, 0], [0, 0], [0, .16], [.02, .16], [.02, .32], [.06, .38], [.06, .5]], S); m.slab(0, .7 + h, 1.2, 2 * r + 1.1, .2, 2.6, R);
}
function library(m) { const w = 13, d = 18, h = 8, D = .7, H = 6.6; each(3, i => m.box(0, i * .22, d / 2 + 1.6, w + 1 - i * .4, .22, 5 - i * .5, S));
  const wl = Array.from({ length: 5 }, (_, i) => ({ z: -d / 2 + 2 + i * 3.5, w: 1.1, v: 5.2, h: 1.6, d: .25, kind: 'win', arch: true })); // VI.4.1: the light from the east
  hall(m, 0, 0, w, d, h, { win: 0, ops: { f: [{ x: 0, w: 2, v: .66, h: 4.5, d: .35, kind: 'door', fr: .07 }], l: wl, r: wl } });
  each(4, i => col(m, -w / 2 + .6 + i * (w - 1.2) / 3, .66, d / 2 + 2.6, D, H, 'ionic'));
  m.mould(0, .66 + H, d / 2 + 1.5, w - .2, 2.8, [[-1.4, 0], [0, 0], [0, .12], [.015, .12], [.015, .28], [.05, .32], [0, .32], [0, .5], [.04, .54], [.1, .58], [.1, .7]], S); m.gable(0, 1.36 + H, d / 2 + 1.5, w + .5, 3.4, w / 9, R, S); }
function curia(m, p) { const tr = p.kind === 'treasury', b = tr ? 8 : 11, h = 1.5 * b; // V.2.1: square, half as high again as broad; V.2.2 cornices round the walls at half height
  { const pr = []; each(3, i => { const o = 1.2 - i * .4; pr.push([o, i * .22], [o, (i + 1) * .22]); }); m.mould(0, 0, 0, b, b, pr, S); }
  const dop = { x: 0, w: b * .22, v: 0, h: b * .5, d: .4, kind: 'door', fr: .08 }, wn = k => tr ? [] : row(k, 0, b * .84, 3, { w: b * .1, v: h * .62, h: b * .2, d: .3, kind: 'win', arch: true });
  const sl = tr ? [0, 1].map(i => ({ z: 0, w: 1.6, v: 2.34 + i * 4, h: .5, d: .3, kind: 'win', bars: 0 })) : wn('z');
  m.wbox(0, .66, 0, b, h, b, S, { f: [dop, ...wn('x').filter((_, i) => i !== 1)], l: sl, r: sl, b: wn('x') }, false); plinth(m, 0, .66, 0, b, b, { f: [dop] }, .4, .07, S);
  m.mould(0, .66 + h / 2, 0, b, b, [[0, 0], [.1, .08], [.175, .12], [.175, .27], [.1, .31], [0, .35]], C.marble, false);
  m.mould(0, .66 + h, 0, b, b, [[0, 0], [.1, .1], [.2, .14], [.2, .3], [.3, .4]], S); m.hip(0, 1.06 + h, 0, b + 1.2, b + 1.2, b * .18, R); }
function basilica(m, p) {
  const wr = (key, c, len, v, hh = 2.2, sp = 3.6) => row(key, c, len, Math.max(1, Math.round(len / sp)), { w: hh * .55, v, h: hh, d: .3, kind: 'win', arch: true });
  if (+p.fano) { // V.1.6-10: nave 120 x 60 ft, aisles 20 ft, columns 50 ft by 5, 4 across the ends and 8 along the sides, tribunal 46 x 15 ft
    const nw = 60 * FT, nl = 120 * FT, a = 20 * FT, H = 50 * FT, D = 5 * FT, f = .5, w = nw + 2 * a, l = nl + 2 * a; m.box(0, 0, 0, w + 1.4, f, l + 1.4, C.shade);
    each(8, i => { const z = -nl / 2 + i * nl / 7; col(m, nw / 2, f, z, D, H, 'corinthian'); if (i < 3 || i > 4) col(m, -nw / 2, f, z, D, H, 'corinthian'); }); for (const z of [-nl / 2, nl / 2]) for (const x of [-nw / 6, nw / 6]) col(m, x, f, z, D, H, 'corinthian');
    // aisle walls: doors to the forum side, a floor of windows above (V.1.6-7: the upper floor of the aisles), string course and cornice
    const ah = 38 * FT, t = .6, doors = [-l / 4, 0, l / 4].map(z => ({ z, w: z ? 2.2 : 3.2, v: 0, h: z ? 4.4 : 5.4, d: .4, kind: 'door', fr: .08 }));
    m.wbox(w / 2 - t / 2, f, 0, t, ah, l - 2 * t, S, { r: [...doors, ...wr('z', 0, l - 2 * t, ah * .62)] }, false);
    m.wbox(-w / 2 + t / 2, f, 0, t, ah, l - 2 * t, S, { l: wr('z', 0, l - 2 * t, ah * .62).filter(o => Math.abs(o.z) > 6.6) }, false);
    for (const s of [-1, 1]) m.wbox(0, f, s * (l / 2 - t / 2), w, ah, t, S, { [s > 0 ? 'f' : 'b']: wr('x', 0, w, ah * .62) }, false);
    plinth(m, 0, f, 0, w, l, { r: doors }, .45, .07); m.mould(0, f + ah * .5, 0, w, l, [[0, 0], [.08, .06], [.08, .2], [0, .26]], S, false); eaves(m, 0, f + ah, 0, w, l, .2, .28);
    m.roofRing(0, 0, w + .6, l + .6, f + ah, nw + D, nl + D, f + ah + 1.8);
    // V.1.9-10: piers (pilae) 3 ft high x 4 ft wide over capitals carrying built-up beams, clerestory lights between, and T-shaped cross gable over pronaos
    each(8, i => { const z = -nl / 2 + i * nl / 7; m.box(nw / 2, f + H, z, 4 * FT, 3 * FT, 4 * FT, S); if (i < 3 || i > 4) m.box(-nw / 2, f + H, z, 4 * FT, 3 * FT, 4 * FT, S); });
    const yc = f + H + 3 * FT; m.frame(0, yc, 0, nw + D, nl + D, D, 1.3, W); m.gable(0, yc + 1.3, 0, nw + D + 1.4, nl + D + 1.4, nw / 6.5, R, S);
    m.at(-w / 2, 0, 0, 0, () => { m.lathe(0, f, 0, [[23 * FT, 0], [23 * FT, ah * .86]], S, 16, PI / 2, 3 * PI / 2); m.wbox(-3.2, f, 0, 9.4, yc, 10.6, S, { l: row('z', 0, 8.4, 3, { w: 1.3, v: yc * .42, h: 3.4, d: .35, kind: 'win', arch: true }) }); m.at(-1.2, yc, 0, PI / 2, () => m.gable(0, 0, 0, 11.2, 13, 2.2, R, S)); });
    m.box(w / 2 + 1.17, 0, 0, .94, f * .5, l / 2 + 5, C.shade); return; // step before the doors
  }
  const nw = 18, a = nw / 3, w = nw + 2 * a, l = w * 2.4, H = a, D = H / 8, Hu = H * .75, f = .5, nl = l - 2 * a; m.box(0, 0, 0, w + 1, f, l + 1, C.shade); // V.1.4-5
  m.wbox(-w / 2 + .3, f, 0, .6, H + Hu + 1, l, S, { l: wr('z', 0, l, H + .9, 1.9, 4) });
  for (const s of [-1, 1]) m.wbox(a / 2, f, s * (l / 2 - .3), w - a, H + Hu + 1, .6, S, { [s > 0 ? 'f' : 'b']: [{ x: 0, w: 2.6, v: 0, h: 4.4, d: .4, kind: 'door', fr: .08 }, ...wr('x', a / 2, w - a, H + .9, 1.9, 4)] });
  const n = Math.round(nl / (3.2 * D * 2.2)) + 1; for (const x of [-nw / 2, nw / 2, w / 2 - D]) each(n, i => { const z = -nl / 2 + i * nl / (n - 1), q = x > nw / 2 ? 12 : 8; m.at(x, f, z, PI / 2, () => col(m, 0, 0, 0, D, H, 'ionic', S, q)); col(m, x, f + H + .5, z, D * .75, Hu, 'corinthian', S, q); });
  for (const x of [-nw / 2, nw / 2, w / 2 - D]) { m.slab(x, f + H, 0, D, .5, nl + D, S); m.slab(x, f + H + .5 + Hu, 0, D, .5, nl + D, S); }
  const ya = f + H + Hu + 1; for (const s of [-1, 1]) { m.slab(s * (nw + a) / 2, f + H + .35, 0, a, .15, nl, S); m.slope([s * w / 2, ya, l / 2], [s * w / 2, ya, -l / 2], [s * nw / 2, ya + 1, -l / 2], [s * nw / 2, ya + 1, l / 2], R); }
  for (const s of [-1, 1]) m.wbox(s * nw / 2, ya, 0, .5, 3.2, l, S, { [s > 0 ? 'r' : 'l']: wr('z', 0, l - 3, 1, 1.5, 4) }, false); for (const s of [-1, 1]) m.box(0, ya, s * (l / 2 - .25), nw, 3.2, .5, S);
  eaves(m, 0, ya + 3.2, 0, nw + .5, l, .12, .2); m.gable(0, ya + 3.2, 0, nw + 1.2, l + 1, nw / 7, R, S);
}
function cavea(m, r, Rr, a0, a1, rows = 14) { const ht = (Rr - r) * .52, pr = [[r, .9]]; each(rows, i => { const x0 = r + (Rr - r) * i / rows, x1 = r + (Rr - r) * (i + 1) / rows, y = .9 + ht * (i + 1) / rows; pr.push([x0, y], [x1, y]); }); m.lathe(0, 0, 0, pr, C.marble, 28, a0, a1, true); return ht + .9; }
function theatre(m, p) { // V.6 (Roman, four triangles) and V.7 (Greek, three squares)
  const greek = +p.greek, kind = p.kind, r = kind === 'site' ? 9 : kind === 'echea' ? 10 : 12, Rr = r * 2.5, ex = greek ? .3 : 0, a0 = PI - ex, a1 = 2 * PI + ex;
  m.ring([0, .1, 0], 'y', Rr + 1.2, 0, .2, C.shade, 28); const ht = cavea(m, r, Rr, a0, a1), Hc = 3.2, top = ht + Hc + .5;
  // outer wall of the cavea: two storeys of arches and an attic on the chords of the round, string courses between (V.3.3-4 substructures and passages)
  const Ro = Rr + 1.2, Rw = Ro - .1, h1 = top * .37, h2 = top * .33, ns = 28, P = (R, a) => [R * cos(a), R * sin(a)];
  each(ns, i => { const a = a0 + (a1 - a0) * i / ns, b = a0 + (a1 - a0) * (i + 1) / ns, Lc = 2 * Rw * sin((b - a) / 2);
    m.face(P(Rw, b), P(Rw, a), 0, top, kind === 'site' ? [] : [{ u: Lc / 2, w: Lc * .5, v: 0, h: h1 * .8, d: .7, kind: 'win', arch: true, bars: 0 }, { u: Lc / 2, w: Lc * .42, v: h1 + .55, h: h2 * .72, d: .55, kind: 'win', arch: true, bars: 0 }, { u: Lc / 2, w: .6, v: h1 + h2 + .7, h: .9, d: .3, kind: 'win', bars: 0 }], S); });
  for (const y of [h1, h1 + h2]) m.lathe(0, 0, 0, [[Rw, y + .3], [Ro, y + .22], [Ro, y], [Rw, y - .08]], S, ns, a0, a1);
  m.lathe(0, 0, 0, [[Rw, .7], [Ro, .6], [Ro, 0]], S, ns, a0, a1); m.lathe(0, 0, 0, [[Rr, ht], [Rr, top], [Ro, top], [Ro, top - .3], [Rw, top - .42]], S, ns, a0, a1);
  for (const a of [a0, a1]) m.quad([Rr * cos(a), 0, Rr * sin(a)], [Ro * cos(a), 0, Ro * sin(a)], [Ro * cos(a), top, Ro * sin(a)], [Rr * cos(a), top, Rr * sin(a)], S);
  const nc = 21; each(nc, (i, t) => { const a = a0 + (a1 - a0) * t; col(m, (Rr - 2.6) * cos(a), ht, (Rr - 2.6) * sin(a), .4, Hc, 'ionic', S, 6); }); m.lathe(0, ht + Hc, 0, [[Rr - 2.9, 0], [Rr - 2.9, .5], [Rr, .5]], R, 28, a0, a1);
  const zs = greek ? r * .7071 : r / 2, zb = greek ? r : zs, sh = greek ? 11 * FT : 5 * FT, sl = greek ? 2.6 * r : 4 * r, sd = greek ? r - zs : zs; // stage: from the diameter (Roman) or the square's side (Greek)
  m.box(0, 0, greek ? zs + sd / 2 : sd / 2, sl, sh, sd, C.marble);
  // scaena: V.6.8 the royal door in the middle and the guest doors right and left; the rear front in three storeys
  const pod = 2 * r / 12, ch = 2 * r / 4, cd = ch / 9, bh = top, nb = Math.max(5, Math.round(sl / 5.5));
  m.wbox(0, 0, zb + 2.5, sl, bh, 5, S, { b: [-sl * .25, 0, sl * .25].map(x => ({ x, w: x ? 1.6 : 2.4, v: sh, h: x ? 3 : 4, d: .35, kind: 'door', fr: .06 })),
    f: [...row('x', 0, sl - 2, nb, { w: 1.8, v: 0, h: bh * .3, d: .5, kind: 'door', arch: true }), ...row('x', 0, sl - 2, nb, { w: 1.3, v: bh * .42, h: bh * .2, d: .35, kind: 'win', arch: true }), ...row('x', 0, sl - 2, nb, { w: .7, v: bh * .76, h: 1, d: .3, kind: 'win', bars: 0 })] }, false);
  m.slab(0, bh, zb + 2.5, sl + .6, .4, 5.6, S); m.slope([-sl / 2, bh + .4, zb - 2], [sl / 2, bh + .4, zb - 2], [sl / 2, bh + 1.4, zb + 5], [-sl / 2, bh + 1.4, zb + 5], R);
  if (!greek) { m.box(0, sh, zb - .5, sl * .9, pod, 1, C.marble); const n = 10; each(n, (i, t) => { const x = -sl * .42 + t * sl * .84; col(m, x, sh + pod, zb - .5, cd, ch, 'corinthian', S, 6); col(m, x, sh + pod + ch * 1.2, zb - .5, cd * .75, ch * .75, 'corinthian', S, 6); }); m.slab(0, sh + pod + ch, zb - .4, sl * .9, ch * .2, 1.1, S); }
  for (const s of [-1, 1]) m.box(s * (sl / 2 + (Rr - sl / 2) / 2 + .6), 0, (zb + 5) / 2 - .5, Math.max(1, Rr + 1.2 - sl / 2), ht * .55, zb + 4, S);
  if (kind === 'echea') each(13, (i, t) => { const a = PI + .12 + t * (PI - .24), q = (r + Rr) / 2; m.at(q * cos(a), .9 + (ht - .9) * .5, q * sin(a), -a - PI / 2, () => { m.box(0, 0, 0, 1, .7, .5, C.dark); m.cyl(0, .05, .35, .3, .12, .5, C.bronze, 8); }); });
  if (kind === 'site') m.lathe(0, 0, 0, [[Rr + 1.2, top * .9], [Rr + 12, 0]], C.earth, 20, PI + .25, 2 * PI - .25);
}
function scaena(m) { const l = 30, pod = 1.5, ch = 5, cd = ch / 9; m.box(0, 0, 3, l + 8, 1.48, 8, C.marble);
  m.wbox(0, 0, -2, l, 15, 3, S, { f: [...[-7.5, 0, 7.5].map(x => ({ x, w: x ? 1.7 : 2.6, v: 1.48, h: x ? 3.2 : 4.2, d: .35, kind: 'door', fr: .06 })), ...row('x', 0, l - 3, 9, { w: 1, v: 12.6, h: 1.3, d: .3, kind: 'win', arch: true })],
    b: [...row('x', 0, l - 3, 6, { w: 1.9, v: 0, h: 4.4, d: .5, kind: 'door', arch: true }), ...row('x', 0, l - 3, 6, { w: 1.3, v: 6.2, h: 2.6, d: .35, kind: 'win', arch: true }), ...row('x', 0, l - 3, 6, { w: .7, v: 11.4, h: 1, d: .3, kind: 'win', bars: 0 })] }, false);
  m.box(0, 1.48, -.3, l * .92, pod, .9, C.marble); each(10, (i, t) => { const x = -l * .43 + t * l * .86; col(m, x, 1.48 + pod, -.3, cd, ch, 'corinthian', S, 6); col(m, x, 1.48 + pod + ch * 1.22, -.3, cd * .75, ch * .75, 'corinthian', S, 6); });
  m.slab(0, 1.48 + pod + ch, -.25, l * .92, ch * .2, 1, S); m.slab(0, 1.48 + pod + ch * 1.97, -.25, l * .92, .6, 1, S);
  for (const s of [-1, 1]) m.at(s * (l / 2 + 2), 1.48, 1, s * .4, () => m.cyl(0, 0, 0, 1.3, 1.3, 5, C.wood, 3));
  m.slope([-l / 2, 15, -.5], [l / 2, 15, -.5], [l / 2, 16, -3.6], [-l / 2, 16, -3.6], R); }
function vaultHall(m, x, z, w, l, h, k = S) { m.box(x - w / 2 + .25, 0, z, .5, h, l, k); m.box(x + w / 2 - .25, 0, z, .5, h, l, k);
  for (const s of [-1, 1]) { const ze = z + s * (l / 2 - .25); m.box(x, 0, ze, w, h, .5, k); m.ring([x, h, ze], 'z', w / 2, 0, .5, k, 10, 0, PI);
    // lunette window with its two mullions
    m.ring([x, h + .12, ze + s * .26], 'z', w * .32, 0, .03, C.dark, 8, 0, PI); for (const q of [-1, 1]) m.box(x + q * w * .11, h + .12, ze + s * .27, .1, w * .29, .05, k); m.box(x, h - .08, ze + s * .27, w * .74, .2, .08, k); }
  m.ring([x, h, z], 'z', w / 2 + .05, w / 2 - .25, l - .06, R, 10, 0, PI); for (const s of [-1, 1]) m.box(x + s * (w / 2 - .02), h - .22, z, .1, .22, l - .2, k); }
function baths(m) { // V.10: halls one third as broad as long; laconicum as high to the dome as it is wide
  const l = 18, w = l / 3; slab(m, 3 * w + 16, l + 4); each(3, i => { const x = -w - 3 + i * (w + .2); vaultHall(m, x, 0, w, l, 5); door(m, x, l / 2 + .04, i ? 1.3 : 1.6, i ? 2.6 : 3); });
  const d = 7, lx = w + 6; m.cyl(lx, 0, 2, d / 2, d / 2, d, S, 16, false); m.lathe(lx, 0, 2, [[d / 2, .5], [d / 2 + .08, .4], [d / 2 + .08, 0]], C.shade, 16); m.lathe(lx, d, 2, [[d / 2, 0], [d / 2 + .12, -.1], [d / 2 + .12, -.3], [d / 2, -.42]], S, 16);
  m.dome(lx, d, 2, d / 2, R, 16, 6); m.cyl(lx, d + d / 2 - .25, 2, .7, .7, .3, C.bronze, 10); m.at(lx, 0, 2, 0, () => door(m, 0, d / 2 * .985, 1.2, 2.4)); // V.10.5 the bronze disc hung in the opening of the dome
  m.box(lx, 0, -5, 3, 2.2, 3, C.brick); m.box(lx, 2.2, -5, 3.2, .12, 3.2, C.brick); m.ring([lx, .95, -3.45], 'z', .55, 0, .14, C.dark, 8, 0, PI); m.box(lx, 0, -3.45, 1.1, .95, .14, C.dark); m.cyl(lx, 2.2, -5.6, .4, .3, 2.4, C.brick, 6);
}
function palaestra(m) { const s = 44; court(m, s, s, { dep: 5.5, H: 4.4, D: .55, wall: 6.2, A: 3.3, door: { w: 2.6, h: 4 } }); m.box(0, 0, s / 2 + .05, 3.6, .1, .1, C.shade);
  const w = s - 11, n = Math.round(w / 3.3) + 1; each(n, i => col(m, -w / 2 + w * i / (n - 1), .15, -w / 2 + 2.6, .55, 4.4, 'ionic', S, 8));
  for (const [x, z, a] of [[-s / 2, 0, PI / 2], [s / 2, 0, -PI / 2], [0, -s / 2, 0], [-s / 4, -s / 2, 0], [s / 4, -s / 2, 0]]) m.at(x, 0, z, a, () => { m.lathe(0, 0, 0, [[3.4, 0], [3.4, 5], [3.9, 5], [3.9, 4.8], [3.82, 4.7], [3.82, .5], [3.9, .4], [3.9, 0]], S, 10, PI, 2 * PI); m.lathe(0, 5, 0, [[0, 2.2], [2.6, 1.6], [3.9, 0]], R, 10, PI, 2 * PI); });
  each(6, i => m.tree(-8 + (i % 3) * 8, i < 3 ? -4 : 6, i % 2 ? 6.5 : 5.2, C.green, i % 2 ? 'pine' : 'cypress')); }
function garden(m, p) { const w = 30, d = 20; slab(m, w, d, C.earth, .15); m.frame(0, .15, 0, w, d, .4, 1.1, S);
  if (p.kind === 'signs') { m.box(0, .12, 0, 9, .08, 6, C.water); each(22, i => { const a = i / 22 * 2 * PI; m.cyl(6 * cos(a) * (1 + .1 * sin(i * 3)), .15, 4 * sin(a), .25, 0, 1.6 + (i % 3) * .5, C.green, 5); }); each(5, i => m.tree(-12 + i * 6, i % 2 ? -7.3 : -8, 6, C.green, i % 2 ? 'pine' : 'cypress')); }
  else { m.box(0, .15, 0, w - 4, .06, 2.4, C.sand); for (const s of [-1, 1]) { m.box(0, .15, s * 8.6, w - 2, .1, .5, C.dark); each(7, i => m.tree(-12 + i * 4, s * 4.6, 5.5 + (i % 2), C.green, s > 0 && i % 3 === 1 ? 'pine' : 'cypress')); }
    each(4, i => { const x = -12 + i * 8; m.box(x, .15, 0, .9, .1, .9, C.marble); m.lathe(x, .25, 0, [[.2, .8], [.34, .72], [.3, .56], [.12, .4], [.1, .2], [.26, .08], [.3, 0]], C.marble, 8); }); } }
function harbour(m, p) { if (p.kind === 'cofferdam') { m.box(0, 0, 0, 22, .25, 16, C.water); each(40, i => { const s = i / 40 * 4, q = Math.floor(s), t = s - q, x = [-4 + 8 * t, 4, 4 - 8 * t, -4][q], z = [3, 3 - 6 * t, -3, -3 + 6 * t][q]; m.cyl(x, 0, z, .14, .14, 1.8, C.dark, 5); }); m.frame(0, 1.2, 0, 8.4, 6.4, .15, .2, W); m.box(0, .25, 0, 6.5, .9, 4.6, C.stone); m.box(-8, .25, 0, 4, 1.4, 16, S); m.box(-8, 1.65, 3, 1.6, .5, 2.6, W); return; }
  m.ring([0, .12, 0], 'y', 25, 0, .24, C.water, 28); m.ring([0, .12, 0], 'y', 26, 22.5, 2.6, S, 28, PI * .15, PI * 1.85); for (const a of [PI * .15, PI * 1.85]) { m.cyl(24.2 * cos(a), 0, 24.2 * sin(a), 2.6, 2.4, 9, S, 12); m.cyl(24.2 * cos(a), 9, 24.2 * sin(a), 2.9, 2.9, .8, S, 12); } m.beam([24.2 * cos(PI * .15), 2.6, 24.2 * sin(PI * .15)], [24.2 * cos(PI * 1.85), 2.6, 24.2 * sin(PI * 1.85)], .25, C.bronze); m.at(-14, 0, 0, 0, () => stoa(m, { n: 6 })); }
function shipshed(m) { each(5, i => { const x = -12 + i * 6; m.box(x - 3, 0, 0, .6, 4, 22, S); m.ring([x, 4, 0], 'z', 3, 2.7, 22, R, 8, 0, PI); m.quad([x - 2.7, .1, 11], [x + 2.7, .1, 11], [x + 2.7, 1.6, -11], [x - 2.7, 1.6, -11], C.shade); });
  m.box(15, 0, 0, .6, 4, 22, S); m.wbox(0, 0, -11.2, 30.6, 6.6, .5, S, { b: row('x', 0, 30, 5, { w: 1.2, v: 3.6, h: 1.8, d: .25, kind: 'win', arch: true }) }); m.at(-6, .9, 2, 0, () => hull(m, 9, 2)); }
// ------------------------------------------------------------------ houses (VI)
function atrium(m, o) { // VI.3: plan class, height = 3/4 width, compluvium 1/4..1/3 of width, tablinum 2/3, fauces 2/3 of that
  const { Wd = 9, cav = 'tuscan', ratio = '32', rd = 4.4 } = o, L = Wd * (ratio === '53' ? 5 / 3 : ratio === 'r2' ? Math.SQRT2 : 1.5), h = .75 * Wd, ow = Wd + 2 * rd, ol = L + 2 * rd, tab = Wd * 2 / 3, fau = tab * 2 / 3, ala = L / 4;
  m.box(0, 0, 0, ow, .2, ol, C.shade);
  // the street walls: blind but for small windows under the eaves, the shops beside the door, and the door itself set back in the fauces
  const hi = { w: .55, v: h * .68, h: .75, d: .22, kind: 'win', bars: 0 }, fw = (Wd - fau) / 2;
  for (const s of [-1, 1]) { const side = s > 0 ? 'r' : 'l';
    m.wbox(s * (Wd + rd) / 2, .2, ala / 2, rd, h, ol - ala, S, { [side]: row('z', ala / 2, ol - ala - 2, Math.round((ol - ala) / 3.6), hi) }, false);
    m.wbox(s * (ow / 2 - rd / 4), .2, -ol / 2 + ala / 2, rd / 2, h, ala, S, { [side]: [{ ...hi, z: -ol / 2 + ala / 2 }] }, false);
    m.wbox(s * (fau / 2 + fw / 2), .2, ol / 2 - rd / 2, fw, h, rd, S, { f: [{ x: s * (fau / 2 + fw / 2), w: Math.min(1.5, fw * .6), v: 0, h: h * .42, d: .3, kind: 'door' }, { ...hi, x: s * (fau / 2 + fw / 2) }] }, false);
    m.wbox(s * (tab / 2 + (Wd - tab) / 4), .2, -ol / 2 + rd / 2, (Wd - tab) / 2, h, rd, S, { b: [{ ...hi, x: s * (tab / 2 + (Wd - tab) / 4) }] }, false); }
  m.slab(0, .2 + h * .7, ol / 2 - rd / 2, fau, h * .3, rd, S); m.slab(0, .2 + h * .8, -ol / 2 + rd / 2, tab, h * .2, rd, S); door(m, 0, ol / 2 - .5, fau, h * .7, .2);
  const cw = Wd / 3.5, cl = L / 3.5, y = .2 + h;
  if (cav === 'testudinate') { m.box(0, .2, 0, Wd, h, L, S); eaves(m, 0, y, 0, ow, ol, .16, .24); m.hip(0, y, 0, ow + .8, ol + .8, ow * .2, R); return ol; }
  if (cav === 'displuviate') { eaves(m, 0, y, 0, ow, ol, .16, .24); m.roofRing(0, 0, ow + .8, ol + .8, y, cw, cl, y + 1.8); }
  else { m.mould(0, y, 0, ow, ol, [[0, 0], [0, 1.2], [.14, 1.3], [.14, 1.42]], S, false); m.roofRing(0, 0, ow + .8, ol + .8, y + 1.5, cw, cl, y - .2); } // the wall carried up to the eaves of the roof that falls inward
  m.box(0, .2, 0, cw + .6, .12, cl + .6, C.marble); m.box(0, .26, 0, cw, .1, cl, C.water);
  const cp = cav === 'tetrastyle' ? [[-1, -1], [1, -1], [1, 1], [-1, 1]] : cav === 'corinthian' ? [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -.5], [1, -.5], [-1, .5], [1, .5]] : [];
  for (const [a, b] of cp) col(m, a * (cw / 2 + .3), .2, b * (cl / 2 + .3), .5, h - (cav === 'displuviate' ? 0 : .3), 'corinthian', S, 8);
  return ol;
}
function peri(m, w, z0) { const d = w * 3 / 4; m.at(0, 0, z0 - d / 2, 0, () => { court(m, w, d, { dep: 3.2, H: 3.2, D: .42, order: 'ionic', wall: 4.6, A: 2.6 }); each(4, i => m.tree(-3 + (i % 2) * 6, -2 + (i > 1 ? 4 : 0), 3.4)); m.box(0, .15, 0, 1.6, .5, 1.6, C.marble); m.box(0, .5, 0, 1.3, .16, 1.3, C.water); }); return d; } // VI.3.7
function domus(m, p) { const ol = atrium(m, { cav: p.cav, ratio: p.ratio }); if (+p.peristyle) peri(m, 17.8, -ol / 2); }
function cavaedia(m, p) { const ks = (p.kinds || 'tuscan').split(','); each(ks.length, i => m.at((i - (ks.length - 1) / 2) * 15.5, 0, 0, 0, () => atrium(m, { Wd: 7.2, rd: 3.2, cav: ks[i], ratio: '32' }))); }
function peristyle(m) { peri(m, 22, 8); }
function oecus(m, p) { const k = p.kind, w = 6.5, l = 2 * w, h = (l + w) / 2; // VI.3.8: twice as long as wide, height half the sum
  if (k === 'egyptian') { // VI.3.9: columns above the lower entablature, windows between them, like a basilica
    m.wbox(0, 0, 0, 13, 5, 19, S, { f: [{ x: 0, w: 2, v: 0, h: 3.4, d: .35, kind: 'door', fr: .07 }], l: row('z', 0, 17, 5, { w: .7, v: 3.2, h: .9, d: .22, kind: 'win' }), r: row('z', 0, 17, 5, { w: .7, v: 3.2, h: .9, d: .22, kind: 'win' }) }, false);
    plinth(m, 0, 0, 0, 13, 19, { f: [{ x: 0, w: 2, kind: 'door', fr: .07 }] }, .34, .06); m.mould(0, 4.7, 0, 13, 19, [[0, 0], [.08, .1], [.2, .3], [.2, .6]], S);
    const wl = side => ({ [side]: row('z', 1, 12, 6, { w: .9, v: 1, h: 1.6, d: .2, kind: 'win' }) }); m.wbox(0, 5.3, 0, 7, 3.75, 13, S, { ...wl('l'), ...wl('r') }, false);
    each(7, i => { for (const s of [-1, 1]) col(m, s * 4.2, 5.3, -6 + i * 2, .34, 3.75, 'corinthian', S, 6); });
    m.gable(0, 9.05, 0, 9.4, 14, 1.2, R, S); return; }
  const dw = k === 'cyzicene' ? 3 : 1.8, ops = { f: [{ x: 0, w: dw, v: 0, h: 3.6, d: .3, kind: 'door', fr: .06 }] };
  if (k === 'cyzicene') { const fl = row('z', 0, 12, 3, { w: 2.2, v: .8, h: 3, d: .25, kind: 'win' }); ops.l = fl; ops.r = fl; } // VI.3.10: folding windows left and right, to look out on the green from the couches
  hall(m, 0, 0, w, l, h, { k: k === 'winter' ? C.dark : S, ops, win: k === 'cyzicene' ? 0 : 1 });
  if (k === 'cyzicene') { m.box(0, 0, l / 2 + 5, 14, .15, 8, C.earth); each(6, i => m.tree(-5 + (i % 3) * 5, l / 2 + 3 + (i > 2 ? 4 : 0), 3.6)); }
  if (k === 'winter') { m.box(0, h * .45, 0, w + .1, .25, l + .1, C.marble); m.box(0, 0, l / 2 + 3, w + 3, .5, 6, C.dark); m.box(0, .5, l / 2 + 3, w + 2.4, .12, 5.4, C.shade); }
}
function villa(m) { slab(m, 34, 30, C.earth, .15); // VI.6: kitchen in the warm corner, stalls by it, granary raised on piers, press room, the yard between
  hall(m, 0, -10, 24, 7, 4.2, { ops: { f: [{ x: 0, w: 1.8, v: 0, h: 2.8, d: .3, kind: 'door', fr: .06 }, ...row('x', 0, 20, 6, { w: .8, v: 1.5, h: 1.1, d: .22, kind: 'win' }).filter(o => Math.abs(o.x) > 2 && Math.abs(o.x) < 6.8)] } });
  for (const s of [-1, 1]) hall(m, s * 9.5, 1, 5, 15, 3.4, { pitch: 1.1, win: 0, ops: { [s > 0 ? 'l' : 'r']: row('z', 1, 13, 5, { w: 1.2, v: 0, h: 2.2, d: .3, kind: 'door' }), [s > 0 ? 'r' : 'l']: row('z', 1, 13, 4, { w: .6, v: 2, h: .7, d: .2, kind: 'win', bars: 0 }) } });
  m.box(0, .15, 2, 13, .05, 13, C.sand); m.cyl(-5, 4.2, -10.5, .5, .4, 1.6, C.brick, 6);
  each(9, i => m.cyl(-13 + (i % 3) * 1.6, 0, 10 + Math.floor(i / 3) * 1.6, .25, .25, 1.4, S, 5)); m.slab(-11.4, 1.4, 11.6, 5, .2, 5, W); m.wbox(-11.4, 1.6, 11.6, 5, 2.8, 5, S, { f: [{ x: -11.4, w: 1, v: .3, h: 1.6, d: .2, kind: 'door' }], l: [{ z: 11.6, w: .5, v: 1.6, h: .6, d: .2, kind: 'win', bars: 0 }], r: [{ z: 11.6, w: .5, v: 1.6, h: .6, d: .2, kind: 'win', bars: 0 }] }, false); m.gable(-11.4, 4.4, 11.6, 5.6, 5.6, 1.2, R, S);
  hall(m, 12, 11, 6, 6, 3.2, { k: C.thatch, pitch: 1.6, win: 0, ops: { l: [{ z: 11, w: 1.4, v: 0, h: 2.2, d: .25, kind: 'door' }] } }); }
function greekhouse(m) { // VI.7: passage from the street door, the peristyle of the gynaeconitis with the prostas and its antae, the larger andronitis behind
  m.wbox(0, 0, 21, 2.4, 3.4, 6, S, { f: [{ x: 0, w: 1.2, v: 0, h: 2.4, d: .3, kind: 'door', fr: .04 }] }); m.box(0, 0, 24.05, 2.2, .1, .1, C.shade); m.slab(0, 3.4, 21, 2.7, .15, 6.2, R);
  m.at(0, 0, 11, 0, () => { court(m, 15, 14, { dep: 3, H: 3.2, D: .4, order: 'doric', wall: 4.6, A: 2.5, sides: [1, 1, 0, 1] }); for (const s of [-1, 1]) m.box(s * 2.6, .15, -5.4, .6, 4.2, 3.2, S); });
  m.at(0, 0, -7, 0, () => { court(m, 20, 20, { dep: 3.6, H: 3.6, D: .46, order: 'ionic', wall: 5, A: 2.7 }); each(6, i => col(m, -6.4 + i * 2.56, .15, -6.6, .56, 4.8, 'ionic')); m.slab(0, 4.95, -6.6, 13.4, .5, .6, S); });
  for (const s of [-1, 1]) hall(m, s * 13, -7, 5.4, 12, 3.6, { pitch: 1.1, ops: { f: [{ x: s * 13, w: 1.1, v: 0, h: 2.3, d: .3, kind: 'door' }] } }); }
function insula(m) { const w = 13, d = 17, n = 5; m.box(0, 0, 0, w, .3, d, C.shade); // II.8.17: the city built upward on stone piers and burnt brick, storey over storey
  each(4, i => { for (const s of [-1, 1]) m.box(-w / 2 + .8 + i * (w - 1.6) / 3, .3, s * (d / 2 - .5), 1.1, 3.4, 1, C.stone); });
  // shops between the piers: counter, shutters, a mezzanine light above
  m.box(0, .3, 0, w - 1.4, 3.4, d - 1.2, C.shade); each(3, i => { const x = -w / 2 + .8 + (i + .5) * (w - 1.6) / 3; for (const s of [-1, 1]) m.at(x, .3, s * (d / 2 - .6), s > 0 ? 0 : PI, () => { m.quad([-1.15, 0, .02], [1.15, 0, .02], [1.15, 2.3, .02], [-1.15, 2.3, .02], C.door); m.quad([-.5, .05, .04], [1.05, .05, .04], [1.05, 2.2, .04], [-.5, 2.2, .04], C.dark); m.box(.3, 0, .2, 1.5, .9, .35, C.stone); m.quad([-.6, 2.55, .02], [.6, 2.55, .02], [.6, 3.1, .02], [-.6, 3.1, .02], C.dark); }); });
  for (const s of [-1, 1]) m.slab(0, 3.3, s * (d / 2 - .5), w, .4, 1.04, C.stone);
  each(n, i => { const y = 3.7 + i * 3, ww = w - i * .12, dd = d - i * .12, o = { w: .9, v: .9, h: 1.3, d: .2, kind: 'win' }, fx = [0, 1, 2, 3].map(j => ({ ...o, x: -w / 2 + 2 + j * 3 })), fz = [0, 1, 2, 3].map(j => ({ ...o, z: -d / 2 + 2.6 + j * 4 }));
    if (i === 1) fx[1] = { ...fx[1], x: 0, w: 1, v: 0, h: 2.2, kind: 'door' }, fx.splice(2, 1);
    m.wbox(0, y, 0, ww, 2.8, dd, C.brick, { f: fx, b: [0, 1, 2, 3].map(j => ({ ...o, x: -w / 2 + 2 + j * 3 })), l: fz, r: fz }, false); m.slab(0, y + 2.8, 0, w + .25 - i * .12, .2, d + .25 - i * .12, S); });
  // the balcony (maenianum) on its brackets
  m.slab(0, 3.7 + 3, d / 2 + .5, w * .7, .15, 1, W); each(5, (i, t) => { const x = -w * .33 + t * w * .66; m.beam([x, 6.72, d / 2 - .05], [x, 6.1, d / 2 - .05], .14); m.beam([x, 6.68, d / 2 + .9], [x, 6.15, d / 2], .12); m.box(x, 6.85, d / 2 + .93, .08, .9, .08, W); }); m.box(0, 7.7, d / 2 + .93, w * .68, .08, .1, W);
  m.hip(0, 3.7 + n * 3, 0, w + .6, d + .6, 2, R); }
function hut(m, p) { const k = p.kind || 'wattle';
  if (k === 'fire') { slab(m, 12, 12, C.earth, .12); each(9, i => m.box(1.3 * cos(i * .7), .12, 1.3 * sin(i * .7), .5, .3, .4, S)); each(4, i => m.beam([cos(i * 1.6) * .9, .15, sin(i * 1.6) * .9], [0, 1.1, 0], .16)); each(7, i => m.figure(3.4 * cos(i * .9), .12, 3.4 * sin(i * .9), 1.7, C.shade)); m.at(-3.5, .12, -3.6, .5, () => each(6, i => m.beam([-1.5 + i * .6, 0, 1], [-1.5 + i * .6, 2, -1], .12, C.green))); return; }
  if (k === 'wattle') { slab(m, 9, 8, C.earth, .12); each(8, i => m.cyl((i % 4 - 1.5) * 1.6, .12, i < 4 ? 1.6 : -1.6, .09, .08, 2.3, W, 5)); m.frame(0, .12, 0, 5, 3.4, .22, 2, C.earth); m.gable(0, 2.12, 0, 5.8, 4.4, 1.7, C.thatch, C.earth); door(m, 0, 1.72, .8, 1.5, .12); return; }
  if (k === 'phrygian') { slab(m, 16, 16, C.earth, .12); m.lathe(0, .12, 0, [[0, 3.5], [2.2, 3], [4.6, 1.6], [6, 0]], C.earth, 16); m.box(0, .12, 5, 1.6, 1.3, 4, C.dark); m.cyl(0, 3.2, 0, .9, 0, 1.3, C.thatch, 8); return; }
  const tall = k === 'logtower', n = tall ? 34 : 22, s0 = tall ? 5 : 6; slab(m, 9, 9, C.earth, .12); let y = .12; each(n, i => { const s = tall ? s0 : s0 * (1 - i / n * .75), t = .32, a = i % 2; for (const q of [-1, 1]) a ? m.ring([q * s / 2, y + t / 2, 0], 'z', t / 2, 0, s + .8, W, 6) : m.ring([0, y + t / 2, q * s / 2], 'x', t / 2, 0, s + .8, W, 6); y += t * .92; }); if (!tall) m.cyl(0, y, 0, 1.2, 0, 1, C.thatch, 4); else door(m, 0, 2.6, 1.6, 2.6, .12);
}

// ------------------------------------------------------------------ construction and materials (II, VII)
function wallpiece(m, p) { const k = p.kind || 'isodomum', l = 9, h = 3.2, t = .6; slab(m, l + 3, 5, C.shade, .15); const y = .15;
  const courses = (x, w, hs, z = 0, th = t, ks = [S, C.shade]) => { let yy = y, i = 0; while (yy < y + h - .01) { const ch = hs[i % hs.length]; m.box(x + (i % 2 ? .03 : -.03), yy, z, w, Math.min(ch, y + h - yy) - .015, th + (i % 2 ? .02 : 0), ks[i % ks.length]); yy += ch; i++; } };
  if (k === 'isodomum') { courses(-l / 4 - .2, l / 2 - .3, [.4]); courses(l / 4 + .2, l / 2 - .3, [.55, .25]); }
  else if (k === 'pseudisodomum') courses(0, l, [.55, .25]);
  else if (k === 'brick') { courses(0, l, [.13], 0, t, [C.brick, [.74, .55, .46]]); m.box(0, y + h, 0, l + .5, .16, t + .5, C.brick); m.box(0, y + h + .16, 0, l + .7, .08, t + .8, R); }
  else if (k === 'reticulatum' || k === 'incertum') { m.box(0, y, 0, l, h, t, S); for (const s of [-1, 1]) m.box(s * (l / 2 - .25), y, 0, .5, h, t + .06, C.brick);
    if (k === 'reticulatum') for (let q = -h; q < l; q += .5) { const a = Math.max(0, q), b = Math.min(l - 1, q + h); if (b > a + .2) { m.beam([-l / 2 + .5 + a, y + (a - q), t / 2 + .01], [-l / 2 + .5 + b, y + (b - q), t / 2 + .01], .05, C.shade); m.beam([l / 2 - .5 - a, y + (a - q), t / 2 + .01], [l / 2 - .5 - b, y + (b - q), t / 2 + .01], .05, C.shade); } }
    else each(70, i => { const u = (i * .618) % 1, v = (i * .383) % 1; m.box(-l / 2 + .7 + u * (l - 1.4), y + .1 + v * (h - .4), t / 2, .22 + (i % 3) * .1, .16 + (i % 2) * .08, .06, i % 2 ? C.shade : C.earth); }); }
  else if (k === 'emplekton') { courses(0, l, [.4], t, .3); courses(0, l, [.4], -t, .3); m.box(0, y, 0, l - .1, h - .25, 2 * t - .3, C.earth); each(5, i => m.box(-l / 2 + 1 + i * 1.75, y + h - .25, 0, .5, .26, 2 * t + .34, C.marble)); each(3, i => m.box(-l / 2 + 1.9 + i * 2.6, y + h * .45, 0, .5, .26, 2 * t + .36, C.marble)); }
  else if (k === 'wattle') { each(7, i => m.box(-l / 2 + .15 + i * (l - .3) / 6, y, 0, .2, h, .22, W)); for (const yy of [.1, h / 2, h - .2]) m.box(0, y + yy, 0, l, .16, .2, W); m.box(0, y + .26, 0, l - .2, h - .5, .12, C.earth); m.box(0, y, 0, l + .3, .5, t + .2, S); }
  else if (k === 'cavity') { m.box(0, y, .45, l, h, .3, S); m.box(0, y, -.25, l, h, .6, C.brick); m.box(0, y, .45, l + .02, 3 * FT, .34, C.brick); each(5, i => { m.box(-l / 2 + 1 + i * 1.75, y + .1, .61, .4, .2, .05, C.dark); m.box(-l / 2 + 1 + i * 1.75, y + h - .4, .61, .4, .2, .05, C.dark); }); }
  else if (k === 'piles') { each(33, i => m.cyl(-l / 2 + .5 + (i % 11) * .8, y, -.5 + Math.floor(i / 11) * .5, .13, .1, 1.2, C.dark, 5)); m.box(0, y + 1.2, 0, l, 1.1, 1.35, S); each(4, i => col(m, -l / 2 + 1.2 + i * 2.2, y + 2.3, 0, .9, 2.2, 'ionic')); }
  else if (k === 'arch') { for (const s of [-1, 1]) { m.box(s * (l / 2 - .6), y, 0, 1.2, h + 1.4, t, S); m.box(s * 1.5, y, 0, .8, h + 1.4, t, S); m.box(s * 2.95, y + 2.2, 0, 2.1, h - .8, t, S); m.box(s * 2.95, y + 2, 0, 2.3, .2, t + .1, W); m.ring([s * 2.95, y + 2.2, 0], 'z', 1.25, 1.0, t + .08, C.brick, 9, 0, PI); } m.box(0, y + 2, 0, 2.2, .2, t + .1, W); m.ring([0, y + 2.2, 0], 'z', 1.3, 1.05, t + .08, C.brick, 9, 0, PI); m.box(0, y + 3.5, 0, 2.2, h - 2.1, t, S); }
  else if (k === 'retaining') { m.box(0, y, -1.8, l, h - .3, 3, C.earth); m.box(0, y, 0, l, h, t, S); each(4, i => { const x = -l / 2 + .4 + i * (l - .8) / 3; m.box(x, y, .7, .6, h * .8, .9, S); m.quad([x - .3, y + h * .8, .25], [x + .3, y + h * .8, .25], [x + .3, y + h * .55, 1.15], [x - .3, y + h * .55, 1.15], S); }); each(6, i => m.beam([-l / 2 + i * 1.5, y + h - .28, -.4], [-l / 2 + (i + 1) * 1.5, y + h - .28, i % 2 ? -.4 : -3.2], .3, S)); }
  else if (k === 'stucco') { m.box(0, y, 0, l, h, t, C.brick); const ks = [C.earth, C.sand, C.sand, C.sand, C.marble, C.marble, C.marble]; each(7, i => m.box(-l / 2 + (l * (7 - i) / 7.5) / 2, y, t / 2 + .03 + i * .045, l * (7 - i) / 7.5, h, .045, i ? ks[i] : C.earth)); }
  else if (k === 'vault') { for (const s of [-1, 1]) m.box(s * 2.5, y, 0, .5, 2, 8, S); each(13, i => m.ring([0, y + 2, -3.8 + i * .633], 'z', 2.3, 2.2, .1, W, 10, 0, PI)); m.ring([0, y + 2, -1.9], 'z', 2.42, 2.32, 4, C.sand, 10, 0, PI); m.ring([0, y + 2, -2.9], 'z', 2.2, 2.14, 2, C.marble, 10, 0, PI); }
}
function floor(m, p) { const k = p.kind || 'layers', w = 9, d = 6; slab(m, w + 2, d + 2, C.earth, .12); let y = .12, i = 0; const L = (h, c) => { m.box(-i * .55, y, 0, w - i * 1.1, h, d, c); y += h; i++; };
  if (k === 'timber' || k === 'open') { each(6, j => m.box(0, y, -d / 2 + .4 + j * 1.04, w, .28, .22, W)); y += .28; L(.08, W); if (k === 'open') L(.08, [.6, .5, .4]); L(.05, C.thatch); }
  L(.22, C.shade); L(k === 'open' ? 1 * FT : .75 * FT, C.earth); L(6 / 16 * FT, C.brick); if (k === 'open') L(.07, R); L(.05, C.marble); const n = 6; each(n * 4, j => { if ((j + Math.floor(j / n)) % 2) m.box(-(i - 1) * .55 - (w - (i - 1) * 1.1) / 2 + .5 + (j % n) * .8, y, -d / 2 + .8 + Math.floor(j / n) * 1.4, .6, .012, .6, C.dark); }); }
const PIG = { ochre: [.80, .62, .25], cinnabar: [.72, .22, .16], vermilion: [.80, .24, .15], blue: [.25, .42, .66], white: [.96, .96, .94], purple: [.45, .2, .42], mixed: [.35, .55, .4], red: [.62, .26, .2] };
function yard(m, p) { const k = p.stock || 'stone', w = 15, d = 12; slab(m, w, d, C.earth, .12); m.frame(0, .12, 0, w, d, .35, 1, S); const y = .12; each(4, i => m.cyl(-w / 2 + 1.2 + i * 2.2, y, -d / 2 + 1.2, .12, .12, 2.6, W, 5)); m.slope([-w / 2 + .6, y + 2.6, -d / 2 + 2.4], [-w / 2 + 8.4, y + 2.6, -d / 2 + 2.4], [-w / 2 + 8.4, y + 3.3, -d / 2 + .3], [-w / 2 + .6, y + 3.3, -d / 2 + .3], R); m.box(-w / 2 + 4.5, y + 2.5, -d / 2 + 1.2, 6.9, .12, .12, W);
  if (k === 'brick') { each(3, i => each(5, j => m.box(-4.5 + i * 2.2, y + j * .22, -3.6, 1.5 * FT * 4, .2, FT * 4, j % 2 ? C.brick : [.74, .56, .46]))); each(40, i => m.box(-5.5 + (i % 10) * 1.2, y, 0 + Math.floor(i / 10) * 1, 1.5 * FT * 1.6, .1, FT * 1.6, [.82, .68, .56])); }
  else if (k === 'sand') [[C.dark, -4], [[.6, .6, .6], -1], [[.7, .4, .3], 2], [C.sand, 5]].forEach(([c, x]) => m.cyl(x, y, 1.5, 1.5, 0, 1.3, c, 10));
  else if (k === 'lime') { m.cyl(4, y, -1.5, 2.2, 1.6, 4.2, C.brick, 12); m.box(4, y, .6, 1.1, 1.3, .3, C.dark); m.box(-3, y, 2.5, 4.4, .25, 2.6, S); m.box(-3, y + .25, 2.5, 4, .06, 2.2, C.marble); each(3, i => m.cyl(-5.5 + i * 1.5, y, -.8, .7, 0, .7, C.sand, 8)); m.cyl(-.6, y, -.8, .7, 0, .7, C.marble, 8); }
  else if (k === 'pozzolana') { each(3, i => m.cyl(-4.5 + i * 2.6, y, -1, 1.3, 0, 1.1, [.45, .42, .4], 9)); m.box(3.5, y, 2.3, 5.4, .5, 4, S); m.box(3.5, y + .5, 2.3, 5, .06, 3.6, C.water); m.box(3.5, y + .3, 2.3, 2.2, .8, 1.6, C.stone); }
  else if (k === 'stone') [[S, -4.5, 2.4], [C.shade, -1.5, 1.6], [C.earth, 1.5, 2], [C.marble, 4.6, 1.2]].forEach(([c, x, s], i) => { m.box(x, y, 1, s, s * .6, 1.6, c); m.box(x + .2, y + s * .6, 1.1, s * .7, s * .4, 1.2, c); m.box(x, y, 3.6, 1.2, .7, 1, c); });
  else if (k === 'timber') { each(3, r => each(4 - r, i => m.ring([-3, y + .35 + r * .62, -1 + (i + r * .5) * .72], 'x', .34, 0, 7, W, 8))); each(4, i => m.box(3.5, y + i * .32, 2.8, 6, .28, .28, C.thatch)); each(3, i => m.box(4, y, -1.5 + i * .8, 5, .5, .5, W)); }
  else if (k === 'felling') { each(5, i => m.tree(-5 + i * 2.6, -1 + (i % 2) * 3, 7 + (i % 3))); m.box(-5, y + .8, -.75, .5, .25, .3, C.dark); m.ring([3, y + .4, 4], 'x', .4, 0, 6, W, 8); }
  else if (k === 'black') { m.box(-3.5, y, 1, 2, 1.6, 2, C.brick); m.box(-3.5, y, 2.05, .8, .7, .1, C.dark); m.beam([-2.5, y + 1.2, 1], [0, y + 1.6, 1], .4, C.brick); m.cyl(2.5, y, 1, 2.4, 2.4, 2.6, C.marble, 14, false); m.dome(2.5, y + 2.6, 1, 2.4, C.marble, 14, 4); m.box(2.5, y, 3.42, .9, 1.7, .1, C.dark); }
  else { const c = PIG[p.col] || PIG.ochre, cs = p.col === 'ochre' ? [PIG.ochre, PIG.red, PIG.white, [.45, .6, .45]] : p.col === 'mixed' ? [PIG.purple, PIG.ochre, PIG.mixed, PIG.blue] : [c, c, c, c]; hall(m, 3.5, -2.5, 6, 5, 3, { pitch: 1 }); door(m, 3.5, .04, 1.4, 2.2); each(8, i => { m.cyl(-5.5 + (i % 4) * 1.5, y, 1.2 + Math.floor(i / 4) * 1.6, .5, .42, .8, C.brick, 9, false); m.cyl(-5.5 + (i % 4) * 1.5, y + .7, 1.2 + Math.floor(i / 4) * 1.6, .44, .44, .04, cs[i % 4], 9); }); m.box(4.5, y, 3, 2.6, .8, 1.2, W); each(3, i => m.cyl(3.7 + i * .8, y + .8, 3, .22, .28, .3, cs[i], 7)); }
}

// ------------------------------------------------------------------ winds, city
function windtower(m) { const r = 4, h = 11; each(3, i => m.cyl(0, i * .25, 0, r + 1.2 - i * .4, r + 1.2 - i * .4, .25, S, 8)); m.cyl(0, .75, 0, r, r, h, C.marble, 8, false); m.cyl(0, .75 + h - 2.2, 0, r + .08, r + .08, 1.5, C.shade, 8, false); m.cyl(0, .75 + h, 0, r + .35, r + .35, .35, C.marble, 8); m.cyl(0, 1.1 + h, 0, r + .35, .3, 2.2, R, 8); m.cyl(0, 3.3 + h, 0, .2, .12, 1, C.bronze, 6); m.beam([0, 4 + h, 0], [1.4, 4 + h, .5], .1, C.bronze); for (const a of [PI / 8 + PI / 4, PI / 8 + 5 * PI / 4]) m.at((r + 1) * cos(a), .75, (r + 1) * sin(a), PI / 2 - a, () => { for (const s of [-1, 1]) col(m, s * .9, 0, .6, .36, 3.4, 'corinthian', S, 6); m.box(0, 3.4, 0, 2.4, .35, 1.8, S); m.gable(0, 3.75, 0, 2.6, 2, .5, R, S); }); }
function amussium(m, p) { const r = 7; m.cyl(0, 0, 0, r + 1, r + 1, .2, S, 32); m.cyl(0, .2, 0, r, r, .15, C.marble, 32); m.cyl(0, .35, 0, .09, .03, 2.6, C.bronze, 6); each(8, i => { const a = PI / 8 + i * PI / 4; m.beam([0, .37, 0], [r * cos(a), .37, r * sin(a)], .06, C.dark); const b = i * PI / 4; m.at((r + .5) * cos(b), .2, (r + .5) * sin(b), -b, () => m.box(0, 0, 0, .35, 1.3, .9, C.marble)); }); m.ring([0, .36, 0], 'y', r * .6, r * .6 - .05, .03, C.bronze, 32); m.beam([0, .38, -r], [0, .38, r], .05, C.bronze);
  if (p.kind === 'streets') m.at(0, 0, 0, PI / 8, () => each(16, i => { const x = (i % 4 - 1.5) * 2.5, z = (Math.floor(i / 4) - 1.5) * 2.5; if (Math.hypot(x, z) > 1.6) m.box(x, .35, z, 1.9, .5 + (i * 7 % 3) * .25, 1.9, C.stone); })); }
function fort(m, p) { if (p.kind === 'rampart') { const l = 26; for (const z of [2.6, -2.6]) { m.box(0, 0, z, l, z > 0 ? 8 : 6.5, 1.2, S); } each(13, i => m.box(-l / 2 + 1 + i * 2, 8, 3, 1, .8, .5, S)); m.box(0, 0, 0, l, 6, 4, C.earth); each(7, i => m.box(-l / 2 + 1 + i * 4, 0, 0, .7, 6.25, 4, S)); m.box(0, 0, 7, l, .25, 5, C.dark); return; }
  const l = 60 / 2.2; for (const s of [-1, 1]) { m.box(s * (l / 4 + 2.4), 0, 0, l / 2 - 4.8, 8, 3, S); m.box(s * (l / 4 + 2.4), 7.05, 0, l / 2 - 4.8, .28, 3.14, S); each(5, i => m.box(s * (5.4 + i * (l / 2 - 6.2) / 4), 8, 1.2, 1.1, .9, .6, S)); } m.box(0, 7.4, 0, 9.6, .25, 1.6, W);
  // I.5.4: towers round or polygonal; a string course at the wall-walk, loops in two tiers, the crown embattled
  const tw = (x, n, r0, r1, rc) => { const f = n === 8 ? cos(PI / 8) : 1, cnt = n === 8 ? 8 : 12, rad = yy => (r0 + (r1 - r0) * yy / 12.5) * f;
    m.cyl(x, 0, 3, r0, r1, 12.5, S, n); m.cyl(x, 7.9, 3, rad(8) / f + .1, rad(8) / f + .1, .28, S, n); m.cyl(x, 12.5, 3, rc, rc, .5, S, n);
    each(cnt, i => { const a = (i + .5) / cnt * 2 * PI; m.at(x + (rc - .36) * cos(a), 13, 3 + (rc - .36) * sin(a), PI / 2 - a, () => m.box(0, 0, 0, rc * .32, .5, .6, S));
      for (const yy of [4.2, 9.6]) if ((i + (yy > 5 ? 1 : 0)) % 2) m.at(x + rad(yy) * cos(a), yy, 3 + rad(yy) * sin(a), PI / 2 - a, () => m.quad([-.08, 0, .03], [.08, 0, .03], [.08, 1.1, .03], [-.08, 1.1, .03], C.dark)); }); };
  tw(0, 16, 4.6, 4.3, 4.8); tw(-l / 2, 8, 4.2, 4, 4.5); tw(l / 2, 16, 4.6, 4.3, 4.8); }
// ------------------------------------------------------------------ heavens and time (IX)
function gnomon(m, p) { if (p.kind === 'analemma') { const u = .55, g = 9 * u; m.box(0, 0, 0, 14, .3, 4, S); m.box(0, .3, -.5, 13, 9, .5, C.marble); const z = -.22, P = (x, y) => [x, y + 1.3, z], A = [-1, g]; m.beam(P(-6, 0), P(6, 0), .07, C.dark); m.beam(P(-1, 0), P(-1, g), .12, C.bronze); m.ring([A[0], A[1] + 1.3, z], 'z', g, g - .06, .05, C.bronze, 36); const ray = (ang, k) => m.beam(P(A[0] - g * sin(ang), A[1] + g * cos(ang)), P(A[0] + g * 1.2 * sin(ang), A[1] - g * 1.2 * cos(ang)), .05, k); const eq = Math.atan2(8, 9); ray(eq, C.dark); ray(eq + 2 * PI / 15, C.bronze); ray(eq - 2 * PI / 15, C.bronze); m.beam(P(A[0] - g * cos(eq), A[1] - g * sin(eq)), P(A[0] + g * cos(eq), A[1] + g * sin(eq)), .04, C.dark); return; }
  const u = .62; m.box(0, 0, 0, 7, .25, 15, S); m.box(0, .25, 0, 6, .08, 14, C.marble); m.cyl(0, .33, 6, .5, .5, .4, S, 8); m.cyl(0, .73, 6, .16, .04, 9 * u - .4, C.bronze, 6); m.box(0, .33, 0, .1, .03, 13, C.bronze); for (const [f, w] of [[8 / 9, 1.6], [3 / 4, 1], [5 / 7, .8], [9 / 11, 1], [3 / 5, .8]]) m.box(0, .33, 6 - f * 9 * u, w, .05, .1, w > 1.2 ? C.dark : C.bronze); }
function dial(m) { slab(m, 10, 7, C.shade); const bowl = (x, r) => { m.box(x, .2, 0, 2 * r + .5, 1.1, 2 * r, S); m.box(x, 1.3, -r / 2, 2 * r + .5, r + .2, r, C.marble); const pr = Array.from({ length: 6 }, (_, j) => [r * cos(j / 5 * PI / 2), -r * sin(j / 5 * PI / 2)]); m.lathe(x, 1.3 + r + .2, 0, pr, C.shade, 12, 0, PI); m.beam([x, 1.5 + r, 0], [x, 1.5 + r, r * .9], .05, C.bronze); }; bowl(-2.6, 1.2); m.cyl(2.6, .2, 0, .5, .5, 1, S, 10); m.cyl(2.6, 1.2, 0, 1.3, 1.3, .15, C.marble, 20); m.cyl(2.6, 1.35, 0, .05, .02, 1, C.bronze, 5); each(12, i => m.beam([2.6, 1.37, 0], [2.6 + 1.2 * cos(i * PI / 12 + PI), 1.37, 1.2 * sin(i * PI / 12 + PI)], .025, C.dark)); }
function clock(m, p) { slab(m, 9, 7, C.shade); const k = p.kind; m.box(-2.6, .2, -1.5, 2.2, 3.6, 2, S); m.box(-2.6, 3.8, -1.5, 2, .08, 1.8, C.water); m.rod([-1.5, 3, -1.5], [0, 2.2, -1.5], .06, C.bronze); m.box(.8, .2, -1.5, 2.2, 2.2, 2, C.bronze);
  if (k === 'anaphoric') { m.box(1.2, .2, 1, 3.4, 3.6, .8, S); m.ring([1.2, 2.2, 1.45], 'z', 1.5, 0, .08, C.bronze, 24); m.ring([1.2, 2.2, 1.5], 'z', 1.5, 1.3, .06, C.dark, 24); each(12, i => m.beam([1.2, 2.2, 1.53], [1.2 + 1.5 * cos(i * PI / 6), 2.2 + 1.5 * sin(i * PI / 6), 1.53], .03, C.dark)); m.ring([1.55, 2.5, 1.55], 'z', .75, .7, .04, C.gold, 16); }
  else if (k === 'regulator') { m.ring([1.2, 2.4, 1], 'z', 1.6, 1.3, .5, C.bronze, 24); m.ring([1.2, 2.4, 1], 'z', 1.25, 0, .4, C.shade, 24); each(12, i => m.box(1.2 + 1.72 * cos(i * PI / 6), 2.32 + 1.72 * sin(i * PI / 6), 1, .12, .16, .55, C.dark)); m.beam([1.2, 2.4, 1.3], [1.2, .9, 1.3], .08, C.gold); m.box(1.2, .2, 1, 1.2, .7, 1, S); }
  else { m.cyl(2.2, .2, 1.4, .45, .4, 4.4, C.marble, 12); each(12, i => m.ring([2.2, .9 + i * .3, 1.4], 'y', .46, .4, .03, C.dark, 12)); m.box(.9, .2, 1.4, .8, .5, .8, S); m.figure(.9, .7 + 1.2, 1.4, 1.2, C.bronze); m.beam([1, 2.6, 1.4], [1.8, 2.75, 1.4], .04, C.bronze); m.ring([.8, 1.2, -1.5], 'z', .8, .7, .1, C.bronze, 16); }
}
function sphaera(m, p) { const k = p.kind || 'zodiac', r = 3; slab(m, 9, 9, C.shade); m.cyl(0, .2, 0, 1.3, 1, .8, S, 12); m.cyl(0, 1, 0, .25, .2, 1, S, 8); const c = [0, 2 + r, 0], lat = 42 * PI / 180, ax = [0, sin(lat), -cos(lat)], e1 = [1, 0, 0], e2 = [0, cos(lat), sin(lat)];
  if (k === 'north' || k === 'south') { m.cyl(0, .2, 0, 3.6, 3.6, k === 'north' ? 1.6 : .8, S, 20, false); m.dome(0, k === 'north' ? 1.8 : 1, 0, 3.6, [.36, .42, .52], 20, 5, k === 'north' ? 1 : .55); each(26, i => { const a = i * 2.4, t = .25 + (i * .137 % 1) * 1.2, rr = 3.62; m.box(rr * cos(t) * cos(a), (k === 'north' ? 1.8 : 1) + rr * sin(t) * (k === 'north' ? 1 : .55), rr * cos(t) * sin(a), .14, .14, .14, C.gold); }); return; }
  if (k === 'wheel') { m.cyl(0, 2, 0, 3, 3, .2, C.wood, 28); each(7, i => m.ring([0, 2.22, 0], 'y', .4 * (i + 1) + .05, .4 * (i + 1) - .05, .05, C.dark, 24)); each(7, i => m.box(.4 * (i + 1) * cos(i * 1.3), 2.24, .4 * (i + 1) * sin(i * 1.3), .14, .08, .08, C.bronze)); return; }
  if (k === 'moon') { m.cyl(0, 2, 0, .2, .2, 1.4, S, 6); const pr = (s) => Array.from({ length: 9 }, (_, j) => { const t = -PI / 2 + j / 8 * PI; return [1.5 * cos(t), 1.5 * sin(t)]; }); m.lathe(0, 4.9, 0, pr(), C.marble, 12, 0, PI); m.lathe(0, 4.9, 0, pr(), [.4, .5, .66], 12, PI, 2 * PI); m.ball(3.2, 2.4, 2.2, .7, C.gold, 10); m.cyl(3.2, .2, 2.2, .15, .15, 2.2, S, 6); return; }
  m.rod(add3(c, ax, -r - .5), add3(c, ax, r + .5), .06, C.bronze); m.ball(0, 2 + r - .4, 0, .4, C.shade, 10);
  if (k === 'planets') { each(7, i => m.ring(c, [e1, e2], .55 + i * .4, .5 + i * .4, .05, i === 3 ? C.gold : C.bronze, 28)); each(7, i => { const a = i * 2.1, q = .525 + i * .4; m.ball(q * cos(a), 2 + r - .16 + q * sin(a) * cos(lat), q * sin(a) * sin(lat), i === 3 ? .26 : .14, i === 3 ? C.gold : C.dark, 8); }); return; }
  m.ring(c, 'y', r + .15, r, .08, C.dark, 32); m.ring(c, [e1, e2], r, r - .08, .1, C.bronze, 32); const ob = 24 * PI / 180, z2 = [0, cos(lat + ob), sin(lat + ob)]; m.ring(c, [e1, z2], r - .12, r - .2, .7, C.gold, 32);
  each(12, i => { const a = i * PI / 6, q = r - .1; m.box(c[0] + q * cos(a), c[1] + q * sin(a) * z2[1] - .1, c[2] + q * sin(a) * z2[2], .16, .2, .16, C.dark); }); if (k === 'sun') m.ball((r - .16) * cos(PI / 32), c[1] - .3 + (r - .16) * sin(PI / 32) * z2[1], (r - .16) * sin(PI / 32) * z2[2], .3, C.gold, 10);
}
const add3 = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

// ------------------------------------------------------------------ water (VIII)
function spring(m, p) { const k = p.kind || 'clear', wc = { hot: [.72, .78, .72], deadly: [.25, .3, .32], acid: [.62, .74, .5], stone: [.9, .93, .92], salt: [.8, .86, .86] }[k] || C.water; slab(m, 13, 11, C.earth, .12);
  if (k === 'river') { m.box(0, .12, 0, 13, .1, 3, wc); for (const s of [-1, 1]) each(6, i => m.box(-5.5 + i * 2.2, .12, s * (2 + (i % 2) * .3), 2.4, .5 + (i % 3) * .2, 1.2, C.earth)); each(5, i => m.tree(-5 + i * 2.5, -4.2, 4)); return; }
  each(7, i => m.box(-4.5 + i * 1.5, .12, -3.4 + (i % 2) * .5, 1.9, 2.2 + (i * 5 % 4) * .7, 2.2, i % 2 ? C.earth : C.shade)); m.cyl(0, .12, .5, 3, 3.1, .7, S, 16, false); m.ring([0, .82, .5], 'y', 3, 2.6, .1, S, 16); m.cyl(0, .12, .5, 2.6, 2.6, .55, wc, 16); m.box(0, 1.4, -2.2, .5, .3, .9, C.bronze);
  if (k === 'stone') each(4, i => m.ring([0, .22 + i * .25, .5], 'y', 5.6 - i * .7, 3.1, .25, C.marble, 16, .2, PI - .2));
  if (k === 'heal') { for (const s of [-1, 1]) col(m, s * 1.1, .12, -2, .32, 3, 'ionic', S, 6); m.box(0, 3.12, -2, 3, .3, .8, S); m.gable(0, 3.42, -2, 3.2, 1, .5, R, S); }
  if (k === 'deadly') m.frame(0, .12, .5, 8, 8, .4, 1.8, S);
  if (k === 'marvel') { m.box(4.6, .12, 2.6, 1.3, .3, .5, S); m.box(4.6, .42, 2.6, 1, 2, .25, C.marble); }
  if (k === 'test') { each(3, i => m.beam([4.5 + .7 * cos(i * 2.1), .12, 2.5 + .7 * sin(i * 2.1)], [4.5, 1.2, 2.5], .07, C.bronze)); m.cyl(4.5, 1, 2.5, .35, .6, .6, C.bronze, 10, false); }
  if (k === 'hot') each(5, i => m.ball(-1 + i * .5, 1.2 + i * .5, .5 + (i % 2) * .6, .35 + i * .08, C.marble, 6));
  if (k === 'taste') each(4, i => m.tree(-4.5 + i * 3, 4.2, 2.6));
}
function wellOne(m, x, z) { m.cyl(x, 0, z, 1.1, 1.1, .9, S, 12, false); m.ring([x, .9, z], 'y', 1.1, .8, .12, S, 12); m.cyl(x, 0, z, .8, .8, .3, C.dark, 12); for (const s of [-1, 1]) m.box(x + s * 1.25, 0, z, .2, 2.6, .2, W); m.ring([x, 2.5, z], 'x', .13, 0, 2.9, W, 6); m.rod([x, 2.4, z], [x, 1.2, z], .02, C.dark, 4); m.cyl(x, .95, z, .2, .26, .3, W, 6); }
function well(m, p) { slab(m, p.kind === 'linked' ? 18 : 8, 7, C.earth, .12); if (p.kind === 'linked') { each(3, i => wellOne(m, -6 + i * 6, 0)); m.box(0, .12, 0, 12, .4, .9, S); } else wellOne(m, 0, 0); }
function pit(m) { const s = 3 * FT * 3, dp = 5 * FT; m.box(0, 0, 0, s + 4, dp, s + 4, C.earth); m.box(0, dp - .02, 0, s, .04, s, C.dark); m.frame(0, 0, 0, s + .5, s + .5, .25, dp + .05, C.earth); m.dome(0, dp, 0, .8, C.bronze, 10, 4, .7); m.box(s / 2 + 1, dp, 0, 1.4, .1, s, C.thatch); }
function chorobates(m) { const l = 20 * FT; slab(m, l + 3, 4, C.earth, .12); for (const s of [-1, 1]) { m.box(s * (l / 2 - .3), .12, 0, .22, 1.3, .5, W); m.beam([s * (l / 2 - .3), .3, 0], [s * (l / 2 - 1.5), 1.35, 0], .1); m.rod([s * (l / 2 - .9), 1.4, .28], [s * (l / 2 - .9), .5, .28], .015, C.dark, 4); m.cyl(s * (l / 2 - .9), .4, .28, .05, 0, .12, C.lead, 5); } m.box(0, 1.42, 0, l, .22, .3, W); m.box(0, 1.645, 0, 5 * FT, .01, .06, C.water); }
function aqueduct(m, p) { const k = p.kind || 'arcade';
  if (k === 'arcade') { const n = 6, sp = 4.6, pw = 1.5, h = 8; each(n + 1, i => m.box((i - n / 2) * (sp + pw), 0, 0, pw, h, 2, S)); each(n, i => { const x = (i - n / 2 + .5) * (sp + pw); m.ring([x, h, 0], 'z', sp / 2 + .5, sp / 2, 2, S, 9, 0, PI); m.box(x, h + sp / 2 + .5, 0, sp + pw, .01, 2, S); }); const L = n * (sp + pw) + pw; m.box(0, h + .4, 0, L, sp / 2 + .2, 2, S); const y = h + sp / 2 + .6; m.box(0, y, 0, L, 1.3, 1.5, S); m.ring([0, y + 1.3, 0], 'x', .75, .6, L, S, 6, 0, PI); m.box(L / 2 + .02, y + .3, 0, .05, .7, .7, C.water); return; }
  if (k === 'castellum') { slab(m, 12, 11, C.shade); { const ops = { f: [{ x: -2, w: .9, v: 0, h: 2.1, d: .25, kind: 'door' }, { x: 1.2, w: .7, v: 2.9, h: 1, d: .22, kind: 'win', arch: true }], l: [{ z: -3, w: .7, v: 2.9, h: 1, d: .22, kind: 'win', arch: true }], r: [{ z: -3, w: .7, v: 2.9, h: 1, d: .22, kind: 'win', arch: true }] }; m.wbox(0, .2, -3, 6, 5, 4, S, ops, false); plinth(m, 0, .2, -3, 6, 4, ops, .4, .06); eaves(m, 0, 5.2, -3, 6, 4, .14, .22); } m.hip(0, 5.2, -3, 6.6, 4.6, 1.2, R); each(3, i => { const x = -3.4 + i * 3.4; m.box(x, .2, 1.4, 2.8, 1.4, 2.8, S); m.box(x, 1.6, 1.4, 2.3, .05, 2.3, C.water); m.rod([x, 1, 2.8], [x, .4, 5], .14, C.lead, 6); m.rod([x * .4, 2.2, -1], [x, 1.7, .4], .12, C.lead, 6); }); return; }
  if (k === 'tunnel') { m.lathe(0, 0, 0, [[0, 3.6], [5, 2.6], [7, 0]], C.earth, 4, PI / 4, PI / 4 + 2 * PI); m.box(0, 0, 0, 26, .12, 9, C.earth); each(4, i => { m.cyl(-9 + i * 6, 0, 0, .8, .8, 4.2 - Math.abs(i - 1.5) * .5, S, 10, false); m.cyl(-9 + i * 6, 0, 0, .6, .6, 3, C.dark, 8); }); m.box(11, 0, 0, 3, 1.6, 1.8, S); m.box(12.52, .2, 0, .05, 1.1, 1, C.dark); return; }
  if (k === 'venter') { slab(m, 32, 6, C.earth, .12); for (const s of [-1, 1]) m.prism([[s * 16, -3], [s * 9, -3], [s * 9, 3], [s * 16, 3]], 0, 5, C.earth); m.box(0, 0, 0, 16, 1.2, 1.6, S); const P = [[-13, 5.2, 0], [-9, 5.2, 0], [-7, 1.5, 0], [7, 1.5, 0], [9, 5.2, 0], [13, 5.2, 0]]; each(5, i => m.rod(P[i], P[i + 1], .22, C.lead, 8)); for (const s of [-1, 1]) m.box(s * 7.5, 0, 0, 1.4, 2, 1.8, C.stone); for (const s of [-1, 1]) m.box(s * 14, 5, 0, 2.4, 1.6, 2.4, S); return; }
  slab(m, 18, 5, C.earth, .12); each(11, i => { m.ring([-7 + i * 1.4, .6, 0], 'x', .26, .18, 1.3, C.brick, 8); m.ring([-7.62 + i * 1.4, .6, 0], 'x', .32, .2, .14, C.shade, 8); }); m.box(8, .12, 0, 1.2, 1.1, 1.2, C.stone); m.rod([8, .6, 0], [8, .6, 2], .26, C.brick, 8); each(2, i => m.cyl(-3 + i * 6, .8, 0, .09, .09, 1.6, C.brick, 6));
}
function cistern(m) { slab(m, 16, 9, C.shade); each(3, i => { const x = -5 + i * 5; m.frame(x, .2, 0, 4.6, 6, .5, 2.2, S); m.box(x, .2, 0, 3.6, 1.7 - i * .4, 5, i ? C.water : [.62, .66, .6]); }); for (const x of [-2.5, 2.5]) m.rod([x - .6, 1.7, 2], [x + .6, 1.5, 2], .1, C.lead, 6); m.slope([-7.5, 4.6, -3.2], [-2.6, 4.6, -3.2], [-2.6, 3.4, .4], [-7.5, 3.4, .4], R); for (const x of [-7.4, -2.7]) for (const z of [-3.1, .3]) m.cyl(x, .2, z, .1, .1, z < 0 ? 4.4 : 3.2, W, 5); }

// ------------------------------------------------------------------ demonstrations: body, number, geometry, the orders
function plate(m, p) { const k = p.kind || 'six'; const base = (w, d) => { m.box(0, 0, 0, w + 1.2, .2, d + 1.2, C.shade); m.box(0, .2, 0, w, .25, d, S); return .45; };
  if (k === 'six' || k === 'numbers' || k === 'triad' || k === 'scale') { const n = { six: 6, numbers: 10, triad: 3, scale: 18 }[k], y = base(n * 1.3 + 1, k === 'numbers' ? 6 : 3.5); each(n, i => { const x = (i - (n - 1) / 2) * 1.3; if (k === 'triad') [() => m.box(x * 2.4, y, 0, 1.6, 4, 1.6, S), () => { for (const s of [-1, 1]) m.box(x * 2.4 + s * 1, y, 0, .5, 3, 1.2, S); m.ring([x * 2.4, y + 3, 0], 'z', 1.25, .75, 1.2, S, 10, 0, PI); }, () => col(m, x * 2.4, y, 0, .7, 5, 'corinthian', S, 24)][i](); else if (k === 'scale') m.box(x, y, 0, .5, 1.2 + (17 - i) * .22, .5, [0, 3, 4, 7, 10, 11, 14, 17].includes(i) ? C.bronze : C.marble); else m.box(x, y, k === 'numbers' ? 1.4 : 0, .7, 2.6, .5, C.marble); }); if (k === 'numbers') { each(6, i => m.box((i - 2.5) * 1.3, y, -1, .7, 1.7, .5, C.shade)); each(16, i => m.box((i - 7.5) * .82, y, -2.4, .5, .5, .5, i < 10 ? C.marble : C.shade)); } return; }
  if (k === 'drawings') { const y = base(15, 7); m.box(-5, y, 0, 4, .15, 6, C.marble); each(12, i => { if (i % 4 === 0 || i % 4 === 3 || i < 4 || i > 7) m.cyl(-6.2 + (i % 4) * .8, y + .15, -2 + Math.floor(i / 4) * 2, .16, .16, .1, C.dark, 8); }); m.box(-5, y + .15, 0, 1.4, .08, 3.2, C.dark); m.box(0, y, -1, 4.4, 5, .4, C.marble); each(4, i => m.box(-1.5 + i, y + .6, -.78, .28, 2.9, .06, C.shade)); m.box(0, y + 3.5, -.78, 3.6, .5, .06, C.shade); m.tri([-1.9, y + 4, -.78], [1.9, y + 4, -.78], [0, y + 4.6, -.78], C.shade); m.at(5, y, 0, -.5, () => { m.box(0, 0, 0, 4.4, 5, .4, C.marble); each(4, i => m.box(-1.6 + i * .9, .6, .22, .3 - i * .04, 2.9 - i * .35, .06, C.shade)); m.quad([-1.9, 3.5, .22], [1.5, 3.1, .22], [1.5, 3.5, .22], [-1.9, 4.1, .22], C.shade); }); return; }
  if (k === 'canon') { const y = base(7, 4), D = .8; col(m, -1.2, y, 0, D, 9.5 * D, 'ionic', S, 24); each(10, i => m.box(1.4, y + i * D, 0, .35, Math.min(D, 9.5 * D - i * D) - .02, .35, i % 2 ? C.dark : C.marble)); m.box(-1.2, y, 1.3, D, .12, D, C.dark); return; }
  if (k === 'man') { const y = base(9, 4), h = 6, cy = y + .5 + h * .6; m.box(0, y, -.4, 7.4, h + 1, .4, C.marble); const z = -.15; for (const [a, b] of [[[-h / 2, y + .5], [h / 2, y + .5]], [[h / 2, y + .5], [h / 2, y + .5 + h]], [[h / 2, y + .5 + h], [-h / 2, y + .5 + h]], [[-h / 2, y + .5 + h], [-h / 2, y + .5]]]) m.beam([a[0], a[1], z], [b[0], b[1], z], .08, C.dark); m.ring([0, cy, z], 'z', h * .6, h * .6 - .08, .08, C.bronze, 36);
    m.box(0, y + .5 + h * .47, z, h * .16, h * .37, .3, S); m.ball(0, y + .5 + h * .86, z, h * .065, S, 8); for (const s of [-1, 1]) { m.beam([s * h * .08, y + .5 + h * .8, z], [s * h * .5, y + .5 + h * .8, z], .28, S); m.beam([s * h * .08, y + .5 + h * .8, z], [s * h * .45, cy + h * .38, z], .2, C.shade); m.beam([s * h * .05, y + .5 + h * .48, z], [s * h * .05, y + .5, z], .34, S); m.beam([s * h * .05, y + .5 + h * .48, z], [s * h * .28, cy - h * .53, z], .26, C.shade); } return; }
  if (k === 'eye') { const y = base(12, 12), D = .8, H = 7.6; each(4, i => { col(m, -4.5 + i * 3, y, 4.5, i ? D : D * 1.02, H); if (i) col(m, -4.5, y, 4.5 - i * 3, D, H); }); m.box(0, y + H, 4.5, 9.8, .7, .8, S); m.box(-4.5, y + H, 0, .8, .7, 9.8, S); m.box(-4.5, y, 6.1, D * 1.02, .1, .25, C.dark); return; }
  if (k === 'square2') { const y = base(9, 9), s = 10 * FT; m.at(0, y, 0, PI / 4, () => m.box(0, 0, 0, s * Math.SQRT2, .3, s * Math.SQRT2, C.shade)); m.box(0, y + .3, 0, s, .3, s, C.marble); m.beam([-s / 2, y + .62, -s / 2], [s / 2, y + .62, s / 2], .07, C.dark); return; }
  if (k === 'tri345') { const y = base(13, 12), u = 1; m.prism([[0, 0], [4 * u, 0], [0, -3 * u]], y, .5, C.dark); m.box(2 * u, y, 2 * u, 4 * u, .3, 4 * u, C.marble); m.box(-1.5 * u, y, -1.5 * u, 3 * u, .3, 3 * u, C.shade); m.at(2 * u + 1.5 * u, y, -1.5 * u - 2 * u, Math.atan2(3, 4), () => m.box(0, 0, 0, 5 * u, .3, 5 * u, S)); return; }
  if (k === 'stair') { const y = base(7, 4), n = 12; each(n, i => m.box(-2 + (i + .5) * 4 / n, y, 0, 4 / n, (i + 1) * 3 / n, 1.6, C.marble)); for (const s of [-1, 1]) m.beam([-2, y, s * .9], [2, y + 3, s * .9], .22, W); m.box(2.6, y, 0, 1.2, 3, 2.4, S); m.box(2.6, y + 3, 0, 1.6, .2, 2.8, S); return; }
  if (k === 'crown') { const y = base(9, 5); m.cyl(0, y, 0, 1.4, 1.6, 1.5, C.bronze, 16, false); m.cyl(0, y + 1.35, 0, 1.5, 1.5, .1, C.water, 16); m.cyl(0, y, 0, 2.2, 2.2, .25, S, 16); for (const [x, c, s] of [[-3.2, C.gold, .5], [3.2, [.8, .8, .82], .68]]) { m.box(x, y, 0, 1, 1.1, 1, S); m.box(x, y + 1.1, 0, s, s, s, c); } m.box(0, y, 1.9, .9, 1.1, .9, S); m.ring([0, y + 1.3, 1.9], 'y', .36, .27, .25, C.gold, 12); return; }
  if (k === 'mesolabe') { const y = base(9, 5); m.box(-2.4, y, 0, 1.6, 1.6, 1.6, C.marble); const s = 1.6 * Math.cbrt(2); m.box(1.2, y, 0, s, s, s, C.marble); m.ring([3.6, y, 1.4], 'y', .9, 0, 0, S, 10); m.lathe(3.6, y, -1, [[.9, 0], [.9, 2]], C.bronze, 10, 0, PI); return; }
  if (k === 'cube') { const y = base(7, 7), s = 3.6; m.box(0, y, 0, s, s, s, C.marble); each(36, i => m.box(-s / 2 + .3 + (i % 6) * .6, y + s, -s / 2 + .3 + Math.floor(i / 6) * .6, .34, .06, .34, C.dark)); return; }
  if (k === 'waves') { const y = base(13, 13); m.box(0, y, 0, .8, .9, .8, S); m.figure(0, y + .9, 0, 1.7, C.bronze); each(7, i => m.ring([0, y + .15 + i * .42, 0], 'y', 1.3 + i * .78, 1.3 + i * .78 - .16, .14, i % 2 ? C.marble : C.shade, 32)); return; }
  if (k === 'shafts') { const y = base(16, 4), D = .9; [8, 8.5, 9.5, 10, 9.5].forEach((h, i) => col(m, -6 + i * 3, y, 0, D, h * D, 'ionic', S, 24)); return; }
  if (k === 'orders' || k === 'origin') { const y = base(11, 4), D = .9, L = k === 'orders' ? [['doric', 7], ['ionic', 9], ['corinthian', 9 + 2 / 3]] : [['doric', 6], ['ionic', 8]]; L.forEach(([o, h], i) => { const x = (i - (L.length - 1) / 2) * 3.6; col(m, x, y, 0, D, h * D, o, S, 24); m.slab(x, y + h * D, 0, 1.5, .5, 1.5, S); if (k === 'origin') m.figure(x + 1.5, y, .9, 1.8, C.shade); }); return; }
  if (k === 'basket') { const y = base(9, 5); m.box(-2.4, y, 0, 2.6, .5, 1.6, S); m.cyl(-2.4, y + .5, 0, .5, .75, 1.1, C.thatch, 10); m.box(-2.4, y + 1.6, 0, 1.9, .1, 1.9, R); each(8, i => m.cyl(-2.4 + .85 * cos(i * .8), y + .5, .85 * sin(i * .8), .22, 0, .9, C.green, 5)); col(m, 2.2, y, 0, .8, 7.6, 'corinthian', S, 24); return; }
  if (k === 'carpentry') { const y = base(11, 9), H = 5; for (const x of [-4, 4]) for (const z of [-3, 3]) col(m, x, y, z, .7, H, 'tuscan'); for (const z of [-3, 3]) m.box(0, y + H, z, 9.4, .5, .6, W); each(5, i => { const x = -4 + i * 2; m.box(x, y + H + .5, 0, .4, .4, 7.6, W); m.beam([x, y + H + .9, -3.8], [x, y + H + 3, 0], .3); m.beam([x, y + H + .9, 3.8], [x, y + H + 3, 0], .3); m.box(x, y + H + .9, 0, .25, 2, .25, W); }); m.box(0, y + H + 2.9, 0, 9, .3, .3, W); return; }
  if (k === 'base') { const y = base(11, 6), D = 3, r = D / 2, u = D / 3, tU = u / 4, tL = u * 3 / 8; const tor = (y0, h, rr) => Array.from({ length: 7 }, (_, j) => { const t = -PI / 2 + j / 6 * PI; return [rr + h / 2 * cos(t), y0 + h / 2 + h / 2 * sin(t)]; }); m.at(-2.6, y, 0, 0, () => { m.box(0, 0, 0, 1.5 * D, D / 6, 1.5 * D, C.marble); m.lathe(0, D / 6, 0, [...tor(0, tL, r * 1.3), [r * 1.2, tL], [r * 1.12, tL + tL * .5], [r * 1.2, 2 * tL], ...tor(2 * tL, tU, r * 1.14), [r, u]], C.marble, 24); m.cyl(0, D / 6 + u, 0, r, r * .98, 1.6, C.marble, 24); }); m.at(3, y, 0, 0, () => { const d2 = 2.2, r2 = d2 / 2, u2 = d2 / 3; m.box(0, 0, 0, d2 * 1.375, d2 / 6, d2 * 1.375, C.marble); m.lathe(0, d2 / 6, 0, [[r2 * 1.3, 0], [r2 * 1.16, u2 * .14], [r2 * 1.3, u2 * .28], [r2 * 1.16, u2 * .42], [r2 * 1.28, u2 * 4 / 7], ...tor(u2 * 4 / 7, u2 * 3 / 7, r2 * 1.12), [r2, u2]], C.marble, 24); m.cyl(0, d2 / 6 + u2, 0, r2, r2 * .98, 1.4, C.marble, 24); }); return; }
  if (k === 'capital' || k === 'corcap') { const y = base(7, 6), D = 2.6; // the capital at large on a stump of its shaft: the same cutter as every column in the city
    if (k === 'capital') col(m, 0, y, 0, D, 2.2 + D * 19 / 36, 'ionic', C.marble, 24, { base: false }); else col(m, 0, y, 0, D, 2.2 + D * .85 + D / 7, 'corinthian', C.marble, 24, { base: false });
    return; }
  if (k === 'entablature') { const y = base(9, 4), D = .9, H = 25 * FT, ha = H / 12.5, q = ha * (6 / 7) / 12, cy = ha / 7; for (const s of [-1, 1]) col(m, s * 2.9, y, 0, D, H, 'ionic', S, 24); let yy = y + H; [[3, 0], [4, .05], [5, .1]].forEach(([f, o]) => { m.box(0, yy, 0, 7.4, f * q, D * .85 + 2 * o, C.marble); yy += f * q; }); m.box(0, yy, 0, 7.4, cy, D * .85 + .34, C.shade); yy += cy; const hf = ha * .75; m.box(0, yy, 0, 7.4, hf, D * .85, C.marble); yy += hf; const dh = 4 * q, dw = dh / 2; for (let x = -3.6; x < 3.6; x += dw * 5 / 3) m.box(x + dw / 2, yy, D * .43 + dh / 2, dw, dh, dh, C.marble); m.box(0, yy, 0, 7.4, dh, D * .85, C.shade); yy += dh; m.box(0, yy, 0, 7.8, dh, D * .85 + 2 * dh + .3, C.marble); yy += dh; m.box(0, yy, 0, 8, dh * .6, D * .85 + 2 * dh + .7, C.shade); return; }
  if (k === 'door') { const y = base(15, 4), H = 6.5, dh = H * 2.5 / 3.5, T = [[-4.6, 5.5 / 12, 12], [0, 1 / 2.5, 14], [4.6, 5.5 / 12, 12]]; // IV.6: Doric, Ionic and Attic doorways, the Ionic with its consoles
    m.wbox(0, y, 0, 14, H, .7, S, { f: T.map(([x, f, q]) => ({ x, w: dh * f, v: 0, h: dh, d: .32, kind: 'door', fr: .07, cw: dh / q })) });
    const j = dh / 14, dw = dh / 2.5; for (const s of [-1, 1]) m.box(s * (dw / 2 + j * 1.35), y + dh - j * 1.4, .42, j * .66, j * 2.4, .2, C.shade); return; }
}
function stela(m) { m.box(0, 0, 0, 4, .25, 3, C.shade); m.box(0, .25, 0, 2, .4, 1, S); m.box(0, .65, 0, 1.5, 3.2, .4, C.marble); m.gable(0, 3.85, 0, 1.7, .5, .4, C.marble, C.marble); each(7, i => m.box(0, 1.1 + i * .36, .21, 1.1, .1, .02, C.shade)); }

// ------------------------------------------------------------------ machines (X)
function load(m, x, y, z, s = 1.2) { m.box(x, y, z, s * 1.5, s, s, C.marble); }
function crane(m, p) { const k = p.kind || 'trispast'; slab(m, 12, 14, C.earth, .12); const top = [0, 9.5, 2.2];
  if (k === 'polyspast') { const t = [0, 10.5, 2.6]; m.beam([0, .12, 0], t, .42); for (const [x, z] of [[-5, -4], [5, -4], [-4.5, 5], [4.5, 5]]) { m.rod(t, [x, .12, z], .03, C.dark, 4); m.cyl(x, .12, z, .12, .1, .5, W, 5); } each(3, i => m.box(t[0], t[1] - .9 - i * .45, t[2] + .25, .9, .32, .32, W)); each(3, i => m.rod([-.3 + i * .3, t[1] - 1.8, t[2] + .25], [-.3 + i * .3, 3.2, t[2] + .25], .02, C.dark, 4)); m.box(0, 2.9, t[2] + .25, .9, .32, .32, W); load(m, 0, 1.6, t[2] + .25); m.box(0, .12, -.9, .5, .9, .5, W); return; }
  for (const s of [-1, 1]) { m.beam([s * 2.4, .12, 0], top, .38); m.rod(top, [s * 3.5, .12, -6], .03, C.dark, 4); m.box(s * 1.9, 1.3, .32, .3, .5, .5, W); } m.box(0, top[1] - .2, top[2], .9, .3, .3, C.bronze); m.box(0, top[1] - 1, top[2] + .3, .7, .5, .25, W); each(3, i => { m.ring([-.2 + i * .2, top[1] - .75, top[2] + .3], 'x', .19, 0, .06, C.bronze, 10); m.ring([-.2 + i * .2, 3.5, top[2] + .3], 'x', .16, 0, .06, C.bronze, 10); });
  each(3, i => m.rod([-.2 + i * .2, top[1] - 1, top[2] + .3], [-.2 + i * .2, 3.7, top[2] + .3], .02, C.dark, 4)); m.box(0, 3.3, top[2] + .3, .6, .4, .25, W); m.rod([0, 3.3, top[2] + .3], [0, 2.4, top[2] + .3], .04, C.dark, 4); load(m, 0, 1.2, top[2] + .3); m.rod([0, top[1] - 1, top[2]], [0, 1.5, .4], .02, C.dark, 4);
  if (k === 'drum') { m.ring([0, 2.6, .5], 'x', .22, 0, 5.4, W, 8); m.ring([0, 2.6, .5], 'x', 2.2, 2, 1.5, W, 16); each(8, i => { const a = i * PI / 4; m.beam([0, 2.6, .5], [0, 2.6 + 2.05 * sin(a), .5 + 2.05 * cos(a)], .14); m.box(0, 2.6 + 2.1 * sin(a + .2), .5 + 2.1 * cos(a + .2), 1.4, .08, .5, W); }); for (const s of [-1, 1]) m.box(s * 2.6, .12, .5, .3, 2.7, .5, W); }
  else { m.ring([0, 1.5, .4], 'x', .2, 0, 4, W, 8); for (const s of [-1, 1]) each(2, i => m.beam([s * 1.2, 1.5, .4], [s * 1.2, 1.5 + (i ? .9 : 0), .4 + (i ? 0 : .9)], .09)); }
}
function roller(m, p) { const k = p.kind; slab(m, 14, 8, C.earth, .12);
  if (k === 'chersiphron') { m.ring([0, 1.02, 0], 'x', .9, 0, 7, C.marble, 16); m.frame(0, .9, 0, 8, 2.6, .25, .25, W); for (const s of [-1, 1]) m.ring([s * 3.75, 1.02, 0], 'x', .12, 0, .6, C.dark, 6); m.beam([0, 1, 1.3], [0, 1, 4], .14); return; }
  const Rr = k === 'paconius' ? 7.5 * FT : 6 * FT, w = k === 'paconius' ? 12 * FT : 6; for (const s of [-1, 1]) wheelX(m, s * (w / 2 + .2), Rr + .12, 0, Rr, .3, W, 8);
  if (k === 'paconius') { m.box(0, Rr + .12 - 3 * FT, 0, 12 * FT, 6 * FT, 8 * FT, C.marble); each(16, i => { const a = i * PI / 8; m.ring([0, Rr + .12 + Rr * .96 * sin(a), Rr * .96 * cos(a)], 'x', .05, 0, w + .4, W, 4); }); m.ring([0, Rr + .12, 0], 'x', Rr + .08, Rr, 1.2, C.thatch, 16); }
  else { m.box(0, Rr + .12 - .5, 0, w, 1, 1.1, C.marble); m.frame(0, Rr, 0, w + 1.6, 2 * Rr + 1, .22, .22, W); }
}
function lever(m, p) { slab(m, 12, 8, C.earth, .12);
  if (p.kind === 'press') { for (const s of [-1, 1]) m.box(-4.5, .12, s * .5, .4, 3.4, .4, W); m.beam([-4.8, 2.6, 0], [4.6, 1.9, 0], .5); m.cyl(-2.2, .12, 0, 1, 1, .3, S, 12); each(5, i => m.cyl(-2.2, .42 + i * .3, 0, .8, .8, .26, C.thatch, 12)); for (const s of [-1, 1]) m.box(4.4, .12, s * .7, .3, 1.4, .3, W); m.ring([4.4, 1.1, 0], 'z', .22, 0, 1.6, W, 8); m.rod([4.4, 1.9, 0], [4.4, 1.2, 0], .03, C.dark, 4); return; }
  load(m, -3, .12, 0, 1.5); m.prism([[-1.6, -.4], [-1, -.4], [-1, .4], [-1.6, .4]], .12, .4, C.dark); m.beam([-2.1, .2, 0], [2.6, 1.9, 0], .14, C.dark); m.figure(2.4, .12, .5, 1.75, C.shade);
  m.box(3.6, .12, -2, .3, 3.6, .3, W); m.beam([3.6, 3.6, -2], [3.6, 3.6, -.6], .2); m.rod([3.6, 3.6, -.8], [3.6, 3, -.8], .02, C.dark, 4); m.beam([2.2, 2.9, -.8], [5.8, 2.9, -.8], .09, C.bronze); m.rod([2.5, 2.9, -.8], [2.5, 1.9, -.8], .02, C.dark, 4); load(m, 2.5, 1.1, -.8, .8); m.cyl(5.4, 2.4, -.8, .16, .2, .4, C.bronze, 8);
}
function hull(m, l, w) { // planked hull over seven stations from stern to stem; keel on y = 0, sheer at 1.4, deck inside the wales
  const st = [[-.5, .3, .62], [-.42, .72, .2], [-.25, .96, .03], [0, 1, 0], [.22, .9, .05], [.4, .55, .28], [.5, .05, .7]], up = [0, 1, 0]; // x / l, half-beam, rise of the keel
  const Q = st.map(([x, b, k]) => { const hb = b * w / 2, yk = k * .9; return [[x * l, yk, 0], [x * l, yk + (1.4 - yk) * .3, hb * .62], [x * l, yk + (1.4 - yk) * .72, hb], [x * l, 1.4, hb * .97]]; });
  for (let i = 0; i < Q.length - 1; i++) { const a = Q[i], b = Q[i + 1]; for (const s of [-1, 1]) { const Z = q => [q[0], q[1], q[2] * s]; for (let j = 0; j < 3; j++) m.oq(Z(a[j]), Z(b[j]), Z(b[j + 1]), Z(a[j + 1]), j === 2 ? C.door : W, [0, -.3, s]); }
    m.oq([a[3][0], 1.28, a[3][2]], [b[3][0], 1.28, b[3][2]], [b[3][0], 1.28, -b[3][2]], [a[3][0], 1.28, -a[3][2]], C.thatch, up); }
  for (const q of [Q[0], Q[Q.length - 1]]) for (let j = 0; j < 3; j++) m.quad([q[j][0], q[j][1], q[j][2]], [q[j + 1][0], q[j + 1][1], q[j + 1][2]], [q[j + 1][0], q[j + 1][1], -q[j + 1][2]], [q[j][0], q[j][1], -q[j][2]], W);
}
function ship(m, p) { m.box(0, 0, 0, 22, .2, 11, C.water); m.at(0, .2, 0, 0, () => { hull(m, 15, 4.4);
  if (p.kind === 'hodometer') { for (const s of [-1, 1]) { m.ring([0, .9, s * 2.5], 'z', 2 * FT, 2 * FT * .8, .3, W, 12); each(8, i => m.beam([0, .9, s * 2.5], [2 * FT * 1.25 * cos(i * PI / 4), .9 + 2 * FT * 1.25 * sin(i * PI / 4), s * 2.5], .1)); } m.ring([0, .9, 0], 'z', .09, 0, 5.4, C.dark, 6); m.box(0, 1.28, 0, 1.6, 1.32, 1.2, W); m.ring([0, 2.7, 0], 'y', .5, 0, .2, C.bronze, 12); m.cyl(.9, 1.28, .8, .22, .3, .52, C.bronze, 8); }
  else { m.cyl(.5, 1.28, 0, .16, .1, 8.62, W, 8); m.ring([.5, 8.6, 0], 'z', .09, 0, 6.4, W, 5); m.quad([.56, 8.5, -3], [.56, 8.5, 3], [1.1, 3.2, 2.8], [1.1, 3.2, -2.8], C.marble);
    for (const [x, z] of [[7.2, 0], [-7.2, 0], [-.6, 2.1], [-.6, -2.1]]) m.rod([.5, 9.7, 0], [x, 1.42, z], .018, C.dark, 3); for (const s of [-1, 1]) m.rod([.56, 8.5, s * 3], [-3.5, 1.4, s * 2], .015, C.dark, 3);
    for (const s of [-1, 1]) m.beam([-6, 2.2, s * 1.7], [-7.4, -.1, s * 2.5], .16); m.box(-5.4, 1.28, 0, 2, .92, 2.4, W); m.slab(-5.4, 2.2, 0, 2.3, .08, 2.7, W); } }); }
function wheel(m, p) { const k = p.kind || 'tympanum', Rr = k === 'tympanum' ? 2.5 : k === 'mill' ? 2.2 : 3.6, ay = Rr + .9; slab(m, 13, 10, C.earth, .12);
  if (k === 'chain') { wellOne(m, 0, 0); for (const s of [-1, 1]) m.box(s * 1.6, 0, 0, .3, 6.4, .3, W); m.ring([0, 6.1, 0], 'x', .16, 0, 3.8, W, 8); wheelX(m, 0, 6.1, 0, .9, .3); for (const z of [-.9, .9]) { m.rod([0, 6.1, z], [0, .4, z], .04, C.dark, 4); each(6, i => m.cyl(0, 1 + i * .85, z, .16, .2, .3, C.bronze, 6)); } m.box(2.6, 3.4, 0, 2.4, .25, .8, W); return; }
  m.box(0, 0, 0, 4, .5, 2 * Rr + 1.4, C.water); for (const s of [-1, 1]) { m.beam([s * 1.5, .12, -1.2], [s * 1.5, ay, 0], .28); m.beam([s * 1.5, .12, 1.2], [s * 1.5, ay, 0], .28); } m.ring([0, ay, 0], 'x', .16, 0, k === 'mill' ? 8 : 3.6, W, 8);
  if (k === 'tympanum') { m.ring([0, ay, 0], 'x', Rr, .3, 1, W, 18); each(8, i => m.box(.52, ay + Rr * .8 * sin(i * PI / 4), Rr * .8 * cos(i * PI / 4), .06, .36, .36, C.dark)); m.box(1.9, ay - .5, 0, 2.4, .3, .8, W); }
  else { for (const s of [-1, 1]) wheelX(m, s * .45, ay, 0, Rr, .12, W, 8); each(16, i => { const a = i * PI / 8; m.at(0, ay + Rr * .96 * sin(a), Rr * .96 * cos(a), 0, () => { m.box(0, -.22, 0, .8, .44, .44, W); if (k !== 'bucket') m.box(0, .22 * Math.sign(sin(a) || 1), 0, 1.1, .5, .06, C.thatch); }); }); m.box(2, ay + Rr - .9, 0, 2.6, .25, .7, W); }
  if (k === 'mill') { m.ring([2.8, ay, 0], 'x', 1.3, 1.1, .3, W, 16); m.ring([3.6, ay + 1.35, 0], 'y', 1, .8, .28, W, 14); m.cyl(3.6, ay + 1.5, 0, .1, .1, 1.5, C.dark, 6); m.cyl(3.6, ay + 2.6, 0, 1, 1, .35, S, 14); m.cyl(3.6, ay + 3, 0, 1, 1, .3, C.shade, 14); m.cyl(3.6, ay + 3.5, 0, .2, .8, 1, W, 4); m.box(3.6, 0, 0, 2.8, ay + 2.5, 2.8, S); }
}
function screw(m) { const l = 6.4, r = l / 16, a = [-(4 / 5 * l) / 2, .7, 0], b = [(4 / 5 * l) / 2, .7 + 3 / 5 * l, 0]; slab(m, 9, 6, C.earth, .12); m.box(-3.4, .12, 0, 3, .6, 3.4, C.water); m.rod(a, b, .14, W, 8); const d = [4 / 5, 3 / 5, 0], e1 = [-3 / 5, 4 / 5, 0], e2 = [0, 0, 1], P = t => { const c = add3(a, d, t * l), an = t * 5 * 2 * PI; return [c[0] + r * (e1[0] * cos(an)), c[1] + r * e1[1] * cos(an), c[2] + r * sin(an)]; };
  each(80, i => m.beam(P(i / 80), P((i + 1) / 80), .09, C.thatch)); each(80, i => { const Q = t => { const q = P(t + .1 / 5 * 2.5); return q; }; if (i % 2) m.beam(Q(i / 80), add3(a, d, (i / 80 + .05) * l), .05, W); }); m.ring(add3(a, d, l * .82), [e1, e2], r + .06, r, l * .3, W, 12);
  for (const s of [-1, 1]) m.box(b[0] + .2, .12, s * .6, .3, b[1] + .3, .3, W); m.box(b[0] + .2, b[1] + .1, 0, .3, .3, 1.5, W); m.box(b[0] + 1.2, b[1] - .9, 0, 1.6, .25, .8, W); }
function pump(m) { slab(m, 8, 6, C.shade); m.box(0, .2, 0, 5, .5, 2.4, W); for (const s of [-1, 1]) { m.cyl(s * 1.5, .7, 0, .42, .42, 1.5, C.bronze, 12); m.rod([s * 1.5, .9, 0], [s * .4, 1.5, 0], .12, C.bronze, 6); m.rod([s * 1.5, 2.2, 0], [s * 1.5, 3.3, 0], .05, C.dark, 5); } m.cyl(0, .7, 0, .6, .6, 1.2, C.bronze, 12); m.cyl(0, 1.9, 0, .66, .12, .8, C.bronze, 12, false); m.cyl(0, 2.7, 0, .12, .1, 2.6, C.bronze, 8); m.box(0, .7, -.9, .3, 2.8, .3, W); m.beam([-1.9, 3.4, -.5], [1.9, 3.4, -.5], .16); m.rod([-1.5, 3.3, 0], [-1.5, 3.4, -.5], .05, C.dark, 4); m.rod([1.5, 3.3, 0], [1.5, 3.4, -.5], .05, C.dark, 4); }
function organ(m) { slab(m, 8, 5, C.shade); m.box(0, .2, 0, 4.4, .5, 2, W); m.box(0, .7, 0, 1.4, 1.5, 1.2, C.bronze); m.box(0, 2.2, 0, 1.7, .12, 1.5, C.bronze); for (const s of [-1, 1]) { for (const z of [-.4, .4]) m.box(s * 1.7, .7, z, .12, 2.1, .12, W); each(4, i => m.box(s * 1.7, 1 + i * .45, 0, .1, .1, .8, W)); m.cyl(s * 1.7, .7, 0, .28, .28, 1.2, C.bronze, 10); m.beam([s * 1.7, 2.9, 0], [s * 2.8, 2.5, 0], .1); m.rod([s * 1.7, 1.9, 0], [s * 1.7, 2.9, 0], .04, C.dark, 4); m.rod([s * 1.4, 1, 0], [s * .7, 1.2, 0], .07, C.bronze, 5); } m.cyl(0, 2.3, 0, .2, .2, .5, C.bronze, 8); m.box(0, 2.8, 0, 3, .4, .7, W); each(13, i => m.cyl(-1.32 + i * .22, 3.2, -.1, .07, .07, 2.4 - i * .13, C.bronze, 6)); each(13, i => m.box(-1.32 + i * .22, 2.8, .45, .14, .08, .3, C.marble)); }
function hodometer(m) { slab(m, 9, 6, C.sand, .12); const r = 2 * FT; for (const s of [-1, 1]) for (const z of [-1.2, 1.2]) wheelX(m, s * .95, r + .12, z, r, .14, W, 8); m.box(0, r + .12, 0, 1.5, .2, 3.6, W); m.box(0, r + .32, 0, 1.6, 1.1, 2.4, W); m.box(0, r + 1.42, .4, 1, .9, 1, W); m.ring([.3, r + 1.9, .4], 'x', .4, .1, .12, C.bronze, 16); m.ring([0, r + 2.4, .4], 'y', .45, 0, .14, C.bronze, 16); m.cyl(0, r + 1.42, -.7, .2, .28, .4, C.bronze, 8); m.beam([0, r + .2, 1.8], [0, r + .5, 4.2], .12); m.box(0, r + .45, 4.1, 1.6, .12, .12, W); }
function catapult(m, p) { const F = .22; slab(m, 9, 9, C.earth, .12);
  if (p.kind === 'frame') { for (const s of [-1, 1]) { m.box(0, .9, s * .7, 8, .3, .3, W); for (const x of [-3.6, 3.6]) m.box(x, .12, s * .7, .3, .8, .3, W); } for (const x of [-3.4, 3.4]) { m.ring([x, 1.4, 0], 'z', .2, 0, 2, W, 8); each(2, i => m.beam([x, 1.4, .9], [x + (i ? .8 : 0), 1.4 + (i ? 0 : .8), .9], .07)); } m.box(0, 1.2, 0, 1.8, 1, 1.2, W); for (const s of [-1, 1]) { m.cyl(s * .5, 1.1, 0, .16, .16, 1.3, C.thatch, 8); m.rod([s * .5, 1.8, 0], [s * 3.4, 1.5, 0], .025, C.dark, 4); } return; }
  const y = .12 + 12 * F; m.box(0, .12, 0, 8 * F, .25, 8 * F, W); m.box(0, .12, 0, F * 1.2, 12 * F, F * 1.2, W); for (const [x, z] of [[1, 0], [-1, 0], [0, -1]]) m.beam([x * 3.5 * F, .3, z * 3.5 * F], [0, 8 * F, 0], F * .7);
  m.at(0, y, 0, 0, () => { for (const yy of [0, 5 * F]) m.box(0, yy, 2 * F, 6.5 * F, F, 1.75 * F, W); for (const s of [-1, 1]) { m.box(s * 3 * F, F, 2 * F, 5 / 12 * F * 2, 4 * F, 1.5 * F, W); m.box(s * .9 * F, F, 2 * F, .5 * F, 4 * F, 1.5 * F, W); m.cyl(s * 2 * F, -.3 * F, 2 * F, F / 2, F / 2, 6.6 * F, C.thatch, 8); m.beam([s * 2 * F, 3 * F, 2 * F], [s * 7 * F, 3 * F, -1.5 * F], F * .5); m.rod([s * 7 * F, 3 * F, -1.5 * F], [0, 3 * F, -9 * F], .02, C.dark, 4); } m.box(0, 2.4 * F, -7.5 * F, F * 1.4, F * .8, 19 * F, W); m.box(0, 3.2 * F, -6 * F, F * .9, F * .4, 16 * F, C.thatch); m.rod([0, 3.7 * F, -8 * F], [0, 3.7 * F, 2.5 * F], .03, C.dark, 5); m.ring([0, 2.6 * F, -17.6 * F], 'x', F * .7, 0, 3 * F, W, 8); });
}
function ballista(m) { const F = .32; slab(m, 11, 12, C.earth, .12); m.box(0, .12, 0, 9 * F, .3, 14 * F, W); for (const s of [-1, 1]) { m.beam([s * 3 * F, .3, 4 * F], [s * 2.2 * F, 9 * F, 5 * F], F); m.beam([s * 3 * F, .3, -5 * F], [s * 2.2 * F, 9 * F, 3 * F], F * .7); }
  const a = [0, 10 * F, 6 * F], d = [0, -.42, -.907]; for (const s of [-1, 1]) { m.at(s * 3.4 * F, 8.4 * F, 5.4 * F, 0, () => { m.box(0, 0, 0, 1.75 * F, 2 * F * 2.6, 2 * F, W); m.cyl(0, -.4 * F, 0, F / 2, F / 2, 6 * F, C.thatch, 8); m.beam([0, 2.6 * F, 0], [s * 6 * F, 2.6 * F, -2.4 * F], F * .6); }); m.rod([s * 9.4 * F, 11 * F, 3 * F], add3(a, d, 11 * F), .025, C.dark, 4); m.beam(add3([s * .62 * F, 0, 0], a, 1), add3(add3([s * .62 * F, 0, 0], a, 1), d, 13 * F), F * .5); }
  each(9, i => m.box(...add3(a, d, (i + .5) * 1.4 * F), 1.3 * F, F * .25, F * .25, W)); const e = add3(a, d, 11 * F); m.ball(e[0], e[1] + .1, e[2], F * .8, S, 8); const b = add3(a, d, 14 * F); m.ring([0, b[1] - F, b[2] - F], 'x', F * .8, 0, 5 * F, W, 8); for (const s of [-1, 1]) m.box(s * 2 * F, .12, b[2] - F, F * .6, b[1], F * .6, W); }
function tower(m, w, h, st, x = 0, z = 0) { const r = w / Math.SQRT2; m.at(x, 0, z, PI / 4, () => { m.cyl(0, .9, 0, r, r * .8, h, C.thatch, 4); each(st, i => { const t = (i + 1) / st, q = r * (1 - .2 * t); m.cyl(0, .9 + h * t - .12, 0, q + .25, q + .25, .16, W, 4); }); }); each(st, i => { const t = (i + .5) / st, q = w * (1 - .2 * t) / 2; m.box(x, .9 + h * t - .4, z + q + .03, w * .16, Math.min(.9, h / st * .4), .06, C.dark); }); for (const s of [-1, 1]) for (const zz of [-1, 1]) wheelX(m, x + s * (w / 2 - .4), .9, z + zz * w * .3, .9, .4, W, 6); m.box(x, .7, z, w + .3, .4, w + .3, W); m.box(x, .9 + h, z, w * .82, .8, w * .82, W); }
function siege(m, p) { const k = p.kind || 'tower'; if (k === 'large') { slab(m, 18, 18, C.earth, .12); tower(m, 23.5 * CU, 120 * CU, 20); } else if (k === 'helepolis') { slab(m, 26, 26, C.earth, .12); tower(m, 60 * FT, 135 * FT, 9); each(3, i => m.ball(-9 + i * 1.6, .12, 11, .5, S, 8)); } else { slab(m, 14, 14, C.earth, .12); tower(m, 17 * CU, 60 * CU, 10); } }
function tortoise(m, p) { const k = p.kind || 'plain';
  const body = (w, l, h, ph, nw = 4) => { m.box(0, .9, 0, w, .35, l, W); for (const s of [-1, 1]) each(nw / 2, (i, t) => wheelX(m, s * (w / 2 - .5), .9, nw > 2 ? -l * .32 + t * l * .64 : 0, .9, .4, W, 6)); for (const s of [-1, 1]) each(5, (i, t) => m.box(s * (w / 2 - .25), 1.25, -l / 2 + .3 + t * (l - .6), .28, h, .28, W)); m.gable(0, 1.25 + h, 0, w + 1, l + .8, ph, C.thatch, C.thatch); for (const s of [-1, 1]) m.quad([s * (w / 2 + .5), 1.25 + h, l / 2 + .4], [s * (w / 2 + .5), 1.25 + h, -l / 2 - .4], [s * (w / 2 + 1.1), 1.4, -l / 2 - .4], [s * (w / 2 + 1.1), 1.4, l / 2 + .4], C.thatch); };
  const ram = (len, y, z0) => { m.rod([0, y, z0], [0, y, z0 + len], .28, W, 8); m.ring([0, y, z0 + len], 'z', .34, 0, 1.2, C.dark, 8); };
  if (k === 'ramcart') { slab(m, 9, 16, C.earth, .12); m.box(0, .9, 0, 3.4, .3, 8, W); for (const s of [-1, 1]) for (const z of [-3, 3]) wheelX(m, s * 1.9, .9, z, .9, .3, W, 6); for (const s of [-1, 1]) for (const z of [-3, 3]) m.beam([s * 1.5, 1.2, z], [0, 5, z], .25); m.box(0, 4.9, 0, .3, .3, 6.4, W); for (const z of [-2, 2]) m.rod([0, 4.9, z], [0, 2.6, z], .03, C.dark, 4); ram(11, 2.5, -4.5); return; }
  if (k === 'hegetor') { const w = 42 * FT, l = 63 * FT; slab(m, w + 5, l + 22, C.earth, .12); body(w, l, 18 * FT, 3.2, 8); for (const s of [-1, 1]) for (const z of [-l / 2 + .5, l / 2 - .5]) m.box(s * (w / 2 - .6), 1.25, z, .5, 36 * FT, .5, W); m.box(0, 1.25 + 36 * FT, 0, w - .6, .4, l - .4, W); for (const z of [-2.5, 2.5]) for (const s of [-1, 1]) m.beam([s * 1.6, 1.25, z], [s * .5, 1.25 + 45 * FT, z], .4); m.box(0, 1.25 + 45 * FT, 0, 3, 2.4, 6.4, W); m.frame(0, 1.25 + 36 * FT + .4, 0, w - .6, l - .4, .2, 1.1, W); ram(l + 14, 6.5, -l / 2 - 2); for (const z of [-2.5, 2.5]) m.rod([0, 1.25 + 45 * FT, z], [0, 6.6, z], .04, C.dark, 4); return; }
  if (k === 'ram' || k === 'borer') { const s = 30 * CU; slab(m, s + 4, s + (k === 'borer' ? 26 : 14), C.earth, .12); body(s, s, 13 * CU - 1.25, 7 * CU, 6); if (k === 'ram') { m.box(0, 13 * CU + 2, 0, 2.6, 8, 2.6, C.thatch); each(4, i => m.box(0, 13 * CU + 2.2 + i * 2, 0, 2.9, .15, 2.9, W)); ram(s + 6, 3.4, -s / 2); } else { m.box(0, 2.6, 4, 1.1, CU, 50 * CU, W); for (const q of [-1, 1]) m.box(q * .6, 2.6, 4, .15, CU * 1.6, 50 * CU, W); ram(50 * CU, 3, -s / 2 + 4); m.ring([0, 3, -s / 2 + 1], 'x', .5, 0, 3, W, 8); } return; }
  const s = 21 * FT; slab(m, s + 4, s + 5, C.earth, .12); body(s, s, 9 * FT, 2.6); m.quad([-s / 2, 1.25 + 9 * FT, s / 2 + .4], [s / 2, 1.25 + 9 * FT, s / 2 + .4], [s / 2, 1.5, s / 2 + 2.2], [-s / 2, 1.5, s / 2 + 2.2], C.thatch);
  if (k === 'parapet') { m.box(0, 1.25 + 9 * FT + 2.6, 0, s * .5, .3, s * .8, W); each(10, i => m.box((i % 2 ? 1 : -1) * s * .25, 1.55 + 9 * FT + 2.6, -s * .36 + Math.floor(i / 2) * s * .18, .3, .8, .7, W)); }
}

export const GEN = { temple, tuscan, tholos, altar, stoa, exedra, library, curia, basilica, theatre, scaena, baths, palaestra, garden, harbour, shipshed, domus, cavaedia, peristyle, oecus, villa, greekhouse, insula, hut, wallpiece, floor, yard, windtower, amussium, fort, gnomon, dial, clock, sphaera, spring, well, pit, chorobates, aqueduct, cistern, plate, stela, crane, roller, lever, ship, wheel, screw, pump, organ, hodometer, catapult, ballista, siege, tortoise };
export { stoa as genStoa, col, court };

// Build one form: returns typed arrays, centred on its footprint, resting on y = 0.
export function build(form, params = {}, scale = 1) {
  const m = new M(); (GEN[form] || stela)(m, params);
  const P = m.P, n = P.length; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < n; i += 3) { if (P[i] < x0) x0 = P[i]; if (P[i] > x1) x1 = P[i]; if (P[i + 1] < y0) y0 = P[i + 1]; if (P[i + 1] > y1) y1 = P[i + 1]; if (P[i + 2] < z0) z0 = P[i + 2]; if (P[i + 2] > z1) z1 = P[i + 2]; }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, pos = new Float32Array(n), nor = new Float32Array(m.N), colArr = new Float32Array(m.K);
  const w = (x1 - x0) * scale, d = (z1 - z0) * scale, h = (y1 - y0) * scale;
  for (let i = 0; i < n; i += 3) { pos[i] = (P[i] - cx) * scale; pos[i + 1] = (P[i + 1] - y0) * scale; pos[i + 2] = (P[i + 2] - cz) * scale; }
  bakeAO(pos, nor, colArr, w, d, h);
  return { pos, nor, col: colArr, w, d, h, tris: n / 9 };
}
