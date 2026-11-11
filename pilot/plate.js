// Vitruvius III.5 — the plate. Text on the left drives a drawing built from the same numbers.
// Units: D = lower diameter of the shaft. One "part" = D/18 (III.5.5).
import { display, sentences } from './text.js';

const U = 100, p = 1 / 18;
const f = n => (+n).toFixed(2), X = x => f(x * U), Y = y => f(-y * U);
const poly = (pts, close) => pts.map((q, i) => (i ? 'L' : 'M') + X(q[0]) + ',' + Y(q[1])).join('') + (close ? 'Z' : '');
const rect = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 1);
const arc = (cx, cy, rx, ry, a0, a1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const og = (x0, y0, x1, y1, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [x0 + (x1 - x0) * (.5 - .5 * Math.cos(Math.PI * t)), y0 + (y1 - y0) * t]; });
const pa = (d, cls) => `<path class="${cls}" d="${d}"/>`;
const mir = pts => pts.map(q => [-q[0], q[1]]);

// ── the model: every number below has an address in bindings-3-5.json ──────────
const M = (() => {
  const H = 9.5, top = H, rt = 3 / 7;                         // III.3.10, III.3.12
  const yTL = 1 / 6, ySC = yTL + 1 / 8, yTU = ySC + 1 / 8;      // III.5.1–2
  const y1 = top - 6.5 * p, abBot = top - 1.5 * p, eyeY = top - 6 * p, eyeX = 8 * p, capBot = top - 9.5 * p; // III.5.5–7
  const A = H / 12.5, part = A * 6 / 7 / 12, f1 = 3 * part, f2 = 4 * part, f3 = 5 * part, ac = A / 7;       // III.5.8, 10
  const F = .75 * A, fc = F / 7;                              // III.5.10
  const dh = f2, dc = dh / 5, band = dh + dc, dw = dh / 2, dg = dw * 2 / 3, hc = f2, hs = hc * 9 / 8;        // III.5.11–12
  const yA = top + A, yF = yA + F, yD = yF + band, yC = yD + hc, yS = yC + hs;
  return { H, top, rt, yTL, ySC, yTU, y1, abBot, eyeY, eyeX, capBot, A, f1, f2, f3, ac, F, fc, dh, dc, band, dw, dg, hc, hs, yA, yF, yD, yC, yS,
    xc: rt + band + .8 * hc, Dm: 25 * .296 / 9.5 };
})();
const rAt = y => { const t = (y - .5) / (M.y1 - .5); if (t <= 1 / 3) return .5; const s = (t - 1 / 3) / (2 / 3); return .5 - (.5 - M.rt) * s * s; };

// Volute: quadrants whose radii fall by half the eye's diameter (III.5.6), struck from
// four centres on a square of ½ part inside the eye (reconstruction; the figure of III.5.8 is lost).
function spiral(sgn, inner) {
  const cs = [[-.25, .25], [.25, .25], [.25, -.25], [-.25, -.25]], N = 18, pts = [];
  for (let k = 0; k < 9; k++) for (let i = k ? 1 : 0; i <= N; i++) {
    const a = Math.PI / 2 - (k + i / N) * Math.PI / 2, t = (k * N + i) / (8.3 * N);
    const rr = 4.25 - .5 * k - (inner ? .5 * (1 - t) + .13 : 0), c = cs[k % 4];
    const u = c[0] + rr * Math.cos(a), v = c[1] + rr * Math.sin(a);
    if (k >= 6 && Math.hypot(u, v) <= .5) return pts;
    pts.push([sgn * (M.eyeX + u * p), M.eyeY + v * p]);
  }
  return pts;
}

// ── parts ────────────────────────────────────────────────────────────────────
const parts = []; // {id, ord, html, aux}
const add = (id, ord, html, aux) => parts.push({ id, ord, html, aux });
const torus = (xo, y0, y1) => { const r = (y1 - y0) / 2; return poly([[-xo + r, y0], [xo - r, y0], ...arc(xo - r, y0 + r, r, r, -90, 90), [-xo + r, y1], ...arc(-xo + r, y0 + r, r, r, 90, 270)], 1); };
const XO = 2.35, PC = [3.05, 4.55], PR = 1;   // profile centreline; plan centre and radius (×2)

function build() {
  const { top, rt, yTL, ySC, yTU, y1, abBot, eyeY, capBot, f1, f2, f3, ac, F, fc, dh, dc, dw, dg, hc, hs, yA, yF, yD, yC, yS, xc } = M;
  // ground
  add('stylobate', 0, pa(poly([[-2.15, 0], [2.15, 0]]), 'silent') + pa(poly([[-2.15, -.3], [2.15, -.3]]), 'silent') + pa(poly([[-2.4, -.3], [-2.15, -.3], [-2.15, -.6]]), 'silent') + pa(poly([[2.4, -.3], [2.15, -.3], [2.15, -.6]]), 'silent'));
  // base
  add('plinth', 1, pa(rect(-.75, 0, .75, yTL), 'ln sh'));
  add('torusL', 2, pa(torus(.75, yTL, ySC), 'ln sh'));
  const ff = .014, xL = .7, xUf = .59, xin = .566;
  const sR = [[xL, ySC], [xL, ySC + ff], ...arc(xL, yTU - ff, xL - xin, yTU - ySC - 2 * ff, -90, -180), [xUf, yTU - ff], [xUf, yTU]];
  add('scotia', 2, pa(poly([...sR, ...mir(sR).reverse()], 1), 'ln sh') + pa(poly([[-xL, ySC + ff], [xL, ySC + ff]]), 'fine') + pa(poly([[-xUf, yTU - ff], [xUf, yTU - ff]]), 'fine'));
  add('torusU', 2, pa(torus(.628, yTU, .5), 'ln sh'));
  // shaft
  const ya = .6, yb = y1 - .14, N = 44;
  const side = Array.from({ length: N + 1 }, (_, i) => { const y = ya + (yb - ya) * i / N; return [rAt(y), y]; });
  const apoB = arc(.53, ya, .03, ya - .522, -90, -180, 8), apoT = arc(rt + .024, yb, rt + .024 - rAt(yb), .07, 180, 90, 8);
  add('shaft', 0, pa(poly(side), 'ln') + pa(poly(mir(side)), 'ln') + pa(rect(-rAt(ya), ya, rAt(ya), yb), 'sh ns'));
  add('apophyge', 0, pa(rect(-.53, .5, .53, .522), 'silent') + pa(poly(apoB), 'silent') + pa(poly(mir(apoB)), 'silent')
    + pa(poly(apoT), 'silent') + pa(poly(mir(apoT)), 'silent') + pa(rect(-(rt + .024), y1 - .07, rt + .024, y1 - .05), 'silent'));
  add('entasisRef', 0, pa(poly([[.5, .5], [rt, y1]]), 'fine dash') + pa(poly([[-.5, .5], [-rt, y1]]), 'fine dash'), true);
  // flutes: 24, fillet = ¼ flute (reading)
  let fl = ''; const yf0 = .64, yf1 = y1 - .17, hw = 6 * Math.PI / 180;
  for (let k = -6; k <= 6; k++) {
    const th = k * 15 * Math.PI / 180, e = [th - hw, th + hw].filter(a => Math.abs(a) < Math.PI / 2 - .02);
    const rb = rAt(yf0) * Math.sin(hw), rtp = rAt(yf1) * Math.sin(hw);
    for (const a of e) fl += pa(poly(Array.from({ length: 31 }, (_, i) => { const y = yf0 + rb + (yf1 - rtp - yf0 - rb) * i / 30; return [rAt(y) * Math.sin(a), y]; })), 'flute');
    if (e.length === 2) {
      const xb = e.map(a => rAt(yf0 + rb) * Math.sin(a)), xt = e.map(a => rAt(yf1 - rtp) * Math.sin(a));
      fl += pa(poly(arc((xb[0] + xb[1]) / 2, yf0 + rb, (xb[1] - xb[0]) / 2, rb, 180, 360, 10)), 'flute') + pa(poly(arc((xt[0] + xt[1]) / 2, yf1 - rtp, (xt[1] - xt[0]) / 2, rtp, 0, 180, 10)), 'flute');
    }
  }
  add('flutes', 14, fl);
  add('axis', 4, pa(poly([[0, -.5], [0, yS + .4]]), 'axisl'));
  add('soffit', 8, pa(poly([[-1.625, top], [1.625, top]]), 'ln'));
  // capital
  add('astragal', 7, pa(torus(rt + .046, y1 - .05, y1), 'ln sh'));
  const eT = top - 3.5 * p;
  add('echinus', 7, pa(rect(-7.75 * p, y1, 7.75 * p, eT), 'ln sh'));
  let eg = '';
  for (const cx of [0, -2.75 * p, 2.75 * p]) {
    const w = (cx ? .9 : 1.08) * p, yt = eT - .2 * p, ybm = y1 + .22 * p, cy = (yt + ybm) / 2, ry = (yt - ybm) / 2;
    const egg = (ww, r2, a0, a1) => Array.from({ length: 25 }, (_, i) => { const a = (a0 + (a1 - a0) * i / 24) * Math.PI / 180, c = Math.cos(a); return [cx + ww * Math.sin(a) * (c < 0 ? 1 + .3 * c : 1), cy + r2 * c]; });
    eg += pa(poly(egg(w, ry, 0, 360), 1), 'silent') + pa(poly(egg(w + .27 * p, ry + .16 * p, 62, 298)), 'silent');
  }
  for (const cx of [-1.375 * p, 1.375 * p]) eg += pa(poly([[cx, eT - .25 * p], [cx, y1 + .2 * p]]), 'silent');
  add('eggs', 7, eg);
  add('canalis', 7, pa(rect(-7.75 * p, eT, 7.75 * p, abBot), 'sh ns') + pa(poly([[-7.75 * p, abBot - .63 * p], [7.75 * p, abBot - .63 * p]]), 'fine'));
  let vo = '';
  for (const s of [-1, 1]) { const o = spiral(s), inn = spiral(s, true); vo += pa(poly(o.slice(0, 73), 1), 'occ sh') + pa(poly(o), 'ln') + pa(poly(inn), 'fine'); }
  add('volutes', 5, vo);
  add('eye', 6, [-1, 1].map(s => pa(poly(arc(s * M.eyeX, eyeY, .5 * p, .5 * p, 0, 360, 28), 1), 'ln sh')).join(''));
  add('centres', 6, [-1, 1].map(s => pa(poly([[-.25, .25], [.25, .25], [.25, -.25], [-.25, -.25]].map(c => [s * (M.eyeX + c[0] * p), eyeY + c[1] * p]), 1), 'fine')
    + [[-.25, .25], [.25, .25], [.25, -.25], [-.25, -.25]].map(c => pa(poly(arc(s * (M.eyeX + c[0] * p), eyeY + c[1] * p, .05 * p, .05 * p, 0, 360, 8), 1), 'dot')).join('')
    + pa(poly([[s * (M.eyeX - .5 * p), eyeY], [s * (M.eyeX + .5 * p), eyeY]]), 'fine') + pa(poly([[s * M.eyeX, eyeY - .5 * p], [s * M.eyeX, eyeY + .5 * p]]), 'fine')).join(''), true);
  const abR = [[9.5 * p, top], [9.5 * p, top - .55 * p], ...og(9.5 * p, top - .55 * p, 9.0 * p, abBot)];
  add('abacus', 5, pa(poly([...abR, ...mir(abR).reverse()], 1), 'ln sh') + pa(poly([[-9.5 * p, top - .55 * p], [9.5 * p, top - .55 * p]]), 'fine'));
  add('cathetus1', 5, [-1, 1].map(s => pa(poly([[s * 9.5 * p, top + .12], [s * 9.5 * p, capBot - .1]]), 'fine dash')).join(''), true);
  add('cathetus2', 6, [-1, 1].map(s => pa(poly([[s * 8 * p, top + .12], [s * 8 * p, capBot - .1]]), 'fine dash')).join(''), true);
  let mg = pa(poly([[-.78, capBot], [-.78, top]]), 'fine');
  for (let i = 0; i <= 9; i++) mg += pa(poly([[-.78, top - i * p], [-.78 + (i % 2 ? .022 : .04), top - i * p]]), 'fine');
  add('modgrid', 5, mg + pa(poly([[-.78, capBot], [-.758, capBot]]), 'fine'), true);
  // entablature, elevation
  const xE = 1.625, band2 = (id, ord, y0, y2, extra = '') => add(id, ord, pa(rect(-xE, y0, xE, y2), 'sh ns') + pa(poly([[-xE, y2], [xE, y2]]), 'ln') + extra);
  band2('fascia1', 8, top, top + f1); band2('fascia2', 8, top + f1, top + f1 + f2); band2('fascia3', 8, top + f1 + f2, yA - ac);
  band2('archCym', 10, yA - ac, yA, pa(poly([[-xE, yA - .28 * ac], [xE, yA - .28 * ac]]), 'fine'));
  band2('frieze', 10, yA, yF - fc);
  band2('friezeCym', 10, yF - fc, yF, pa(poly([[-xE, yF - .28 * fc], [xE, yF - .28 * fc]]), 'fine'));
  let de = pa(rect(-xE, yF, xE, yF + dh), 'sh ns') + pa(poly([[-xE, yF + dh], [xE, yF + dh]]), 'ln');
  for (let k = -12; k <= 12; k++) { const c = k * (dw + dg); if (Math.abs(c) + dw / 2 < xE) de += pa(rect(c - dw / 2, yF, c + dw / 2, yF + dh), 'fine'); }
  add('dentils', 11, de);
  band2('dentilCym', 11, yF + dh, yD);
  band2('corona', 11, yD, yC, pa(poly([[-xE, yD + .8 * hc], [xE, yD + .8 * hc]]), 'fine'));
  band2('sima', 12, yC, yS, pa(poly([[-xE, yC + .86 * hs], [xE, yC + .86 * hs]]), 'fine'));
  const brk = s => pa(poly(Array.from({ length: 41 }, (_, i) => { const t = i / 40; return [s * (xE + .012 * Math.sin(t * Math.PI * 7)), top + (yS - top) * t]; })), 'silent');
  add('breaks', 8, brk(1) + brk(-1));
  const head = (cx, pierced) => { const cy = yC + hs * .46; return pa(poly(arc(cx, cy, .088, .088, 0, 360, 28), 1), 'ln occ2 sh') + pa(poly(arc(cx, cy, .056, .056, 0, 360, 22), 1), 'fine') + (pierced ? pa(poly(arc(cx, cy, .018, .018, 0, 360, 10), 1), 'dot') : ''); };
  add('lion', 15, head(0, true));
  add('lions2', 15, head(-3.25 / 3, false) + head(3.25 / 3, false));
  // entablature, profile (half section, front to the right)
  const st = (.5 - rt) / 2, cym = (x0, y0, h) => [...og(x0, y0, x0 + h, y0 + .72 * h), [x0 + h, y0 + h]];
  const xfr = rt + (F - fc) / 12, xct = xc + .8 * hc / 12;
  const mem = [
    ['fascia1', 8, top, top + f1, [[rt, top], [rt + f1 / 12, top + f1]]],
    ['fascia2', 8, top + f1, top + f1 + f2, [[rt + st, top + f1], [rt + st + f2 / 12, top + f1 + f2]]],
    ['fascia3', 8, top + f1 + f2, yA - ac, [[.5, top + f1 + f2], [.5 + f3 / 12, yA - ac]]],
    ['archCym', 10, yA - ac, yA, cym(.5 + f3 / 12, yA - ac, ac)],
    ['frieze', 10, yA, yF - fc, [[rt, yA], [xfr, yF - fc]]],
    ['friezeCym', 10, yF - fc, yF, cym(xfr, yF - fc, fc)],
    ['dentils', 11, yF, yF + dh, [[rt + dh, yF], [rt + dh, yF + dh]]],
    ['dentilCym', 11, yF + dh, yD, cym(rt + dh, yF + dh, dc)],
    ['corona', 11, yD, yC, [[xc, yD], [xct, yD + .8 * hc], ...cym(xct, yD + .8 * hc, .2 * hc)]],
    ['sima', 12, yC, yS, [...og(xct + .2 * hc, yC, xct + .2 * hc + .5 * hs, yC + .86 * hs), [xct + .2 * hc + .5 * hs, yS]]],
  ];
  let prev = [0, top];
  for (const [id, ord, y0, y2, face] of mem) {
    const sh = q => [XO + q[0], q[1]];
    add(id, ord, pa(poly([[0, y0], ...face, [0, y2]].map(sh), 1), 'ht') + pa(poly([prev, ...face].map(sh)), 'ln') + pa(poly([[0, y2], face[face.length - 1]].map(sh)), 'fine'));
    prev = face[face.length - 1];
  }
  add('profAxis', 8, pa(poly([[XO, y1 - 1.05], [XO, yS + .3]]), 'axisl') + pa(poly([[XO + rt, y1 - 1], [XO + rt, y1]]), 'silent')
    + pa(poly([[XO + rt, y1], [XO + 9 * p, abBot], [XO, abBot]]), 'silent') + pa(poly([[XO, top], [XO + 9.5 * p, top], [XO + 9.5 * p, abBot + .9 * p]]), 'silent'));
  add('plumb', 13, pa(poly([[XO + rt, top - .15], [XO + rt, yF + .1]]), 'fine dash'), true);
  // section of the shaft, ×2
  const [cx, cy] = PC, hwf = 6 * Math.PI / 180; let pl = [], sq = '';
  for (let k = 0; k < 24; k++) {
    const th = (k * 15 + 7.5) * Math.PI / 180, Aq = [cx + PR * Math.cos(th - hwf), cy + PR * Math.sin(th - hwf)], Bq = [cx + PR * Math.cos(th + hwf), cy + PR * Math.sin(th + hwf)];
    const mid = [(Aq[0] + Bq[0]) / 2, (Aq[1] + Bq[1]) / 2], c = Math.hypot(Aq[0] - Bq[0], Aq[1] - Bq[1]) / 2, eTn = [(Aq[0] - mid[0]) / c, (Aq[1] - mid[1]) / c], eR = [Math.cos(th), Math.sin(th)];
    const at = ph => [mid[0] + c * (Math.cos(ph) * eTn[0] - Math.sin(ph) * eR[0]), mid[1] + c * (Math.cos(ph) * eTn[1] - Math.sin(ph) * eR[1])];
    for (let i = 0; i <= 12; i++) pl.push(at(Math.PI * i / 12));
    if (k === 3) { const Q = at(Math.PI * .62), ext = (P2, m) => [Q[0] + (P2[0] - Q[0]) * m, Q[1] + (P2[1] - Q[1]) * m];
      sq = pa(poly([ext(Aq, 2.1), Q, ext(Bq, 2.6)]), 'ln') + pa(poly(arc(Aq[0], Aq[1], .012, .012, 0, 360, 8), 1), 'dot') + pa(poly(arc(Bq[0], Bq[1], .012, .012, 0, 360, 8), 1), 'dot'); }
  }
  add('fluteplan', 14, pa(poly(pl, 1), 'ln sh') + pa(poly(arc(cx, cy, PR, PR, 0, 360, 72), 1), 'silent dash') + pa(poly([[cx - .08, cy], [cx + .08, cy]]), 'fine') + pa(poly([[cx, cy - .08], [cx, cy + .08]]), 'fine'));
  add('square', 14, sq, true);
}

// ── dimensions shown for a binding (model coordinates) ───────────────────────
const V = (x, y0, y1, lab, side = 'l', ex) => ({ t: 'v', x, y0, y1, lab, side, ex });
const Hd = (y, x0, x1, lab, side = 't', ex) => ({ t: 'h', y, x0, x1, lab, side, ex });
function dims() {
  const { top, rt, yTL, ySC, yTU, y1, abBot, eyeY, eyeX, capBot, f1, f2, f3, ac, F, fc, dh, hc, yA, yF, yD, yC, yS, xc } = M, xl = -1.95, xe = -1.625, xfr = rt + (F - fc) / 12;
  return {
    'i.h': [V(-2.05, 0, top, '9½ D  =  25 ft', 'l', -.75)],
    'i.dim': [Hd(1.3, -.5, .5, '7 parts', 't'), Hd(y1 - .5, -rt, rt, '6 parts', 't')],
    'b7.inst': [V(-2.05, 0, top, '25 ft', 'l', -.75)],
    'b1.h': [V(-1.02, 0, .5, '½ D', 'l', -.75)],
    'b1.proj': [Hd(-.13, .5, .75, '¼ D', 'b', 0)],
    'b1.w': [Hd(-.13, -.75, .75, '1½ D', 'b', 0)],
    'b2.upper': [V(1.02, yTL, .5, '⅓ D', 'r', .75)],
    'b2.plinth': [V(1.02, 0, yTL, '⅙ D', 'r', .75)],
    'b2.tu': [V(-1.02, yTU, .5, '1/12 D', 'l', -.63)],
    'b2.tl': [V(-1.02, yTL, ySC, '⅛ D', 'l', -.75)],
    'b2.sc': [V(-1.02, ySC, yTU, '⅛ D', 'l', -.7)],
    'b5.abw': [Hd(top + .1, -9.5 * p, 9.5 * p, 'D + 1/18 D', 't', top)],
    'b5.caph': [V(-.9, capBot, top, '9½ parts', 'l', -.6)],
    'b5.rec': [Hd(top + .1, 8 * p, 9.5 * p, '1½', 't', top)],
    'b6.c2': [Hd(top + .1, 8 * p, 9.5 * p, '1½', 't', top)],
    'b5.abh': [V(.9, abBot, top, '1½', 'r', .53)],
    'b5.volh': [V(.9, capBot, abBot, '8 parts', 'r', .6)],
    'b6.45': [V(.9, eyeY, abBot, '4½', 'r', eyeX)],
    'b6.35': [V(.9, capBot, eyeY, '3½', 'r', eyeX)],
    'b6.eye': [Hd(eyeY - .5 * p - .03, eyeX - .5 * p, eyeX + .5 * p, '1 part', 'b', eyeY)],
    'b7.astr': [V(-.9, capBot, y1, '3 parts', 'l', -.6)],
    'b7.ech': [V(-.9, y1, y1 + 3 * p, 'echinus 3', 'l', -.43), V(-.9, y1 + 3 * p, abBot, 'channel 2', 'l', -.43)],
    'b8.arch': [V(xl, top, yA, 'H / 12½', 'l', xe)],
    'b9.under': [Hd(top - .1, XO, XO + rt, '½ of 6/7 D', 'b', top)],
    'b9.upper': [Hd(yA - ac - .005, XO, XO + .5, '½ D', 't')],
    'b10.cym': [V(xl, yA - ac, yA, '1/7 A', 'l', xe)],
    'b10.cymp': [Hd(yA + .06, XO + .5 + f3 / 12, XO + .5 + f3 / 12 + ac, '= height', 't', yA), V(XO + .95, yA - ac, yA, '1/7 A', 'r', XO + .65)],
    'b10.fas': [V(xl, top, top + f1, '3', 'l', xe), V(xl, top + f1, top + f1 + f2, '4', 'l', xe), V(xl, top + f1 + f2, yA - ac, '5', 'l', xe)],
    'b10.fr': [V(xl, yA, yF, '¾ A', 'l', xe)],
    'b10.frc': [V(xl, yF - fc, yF, '1/7', 'l', xe)],
    'b10.frcp': [Hd(yF - fc - .05, XO + xfr, XO + xfr + fc, '= height', 'b', yF - fc), V(XO + .95, yF - fc, yF, '1/7', 'r', XO + xfr + fc)],
    'b11.dh': [V(xl, yF, yF + dh, '= middle fascia', 'l', xe), V(xl, top + f1, top + f1 + f2, '4', 'l', xe)],
    'b11.dp': [Hd(yF + dh / 2, XO + rt, XO + rt + dh, '= height', 't'), V(XO + 1.25, yF, yF + dh, 'height', 'r', XO + rt + dh)],
    'b11.dw': [Hd(yF - .05, -M.dw / 2, M.dw / 2, '½ h', 'b', yF)],
    'b11.dg': [Hd(yF - .05, M.dw / 2, M.dw / 2 + M.dg, '⅔', 'b', yF)],
    'b11.dc': [V(xl, yF + dh, yD, '1/6', 'l', xe)],
    'b11.cor': [V(xl, yD, yC, '= middle fascia', 'l', xe), V(xl, top + f1, top + f1 + f2, '4', 'l', xe)],
    'b11.corp': [Hd(yF - .07, XO + rt, XO + xc, 'projection', 'b', yF), V(XO + 1.25, yF, yD + .8 * hc, '= height', 'r', XO + xc)],
    'b12.sima': [V(xl, yC, yS, '9/8 corona', 'l', xe)],
    'b13.lean': [Hd(yF - fc + .02, XO + rt, XO + xfr, '1/12', 't')],
  };
}
const LABELS = [[0, -.52, 'ELEVATION'], [XO + .45, 9.5 - 6.5 * p - 1.2, 'PROFILE'], [PC[0], PC[1] - PR - .2, 'SECTION OF THE SHAFT ×2']];
const FRAMES = {
  whole: ['The whole column', [-2.75, -.85, 4.55, 12.15]], base: ['The base', [-1.7, -.45, 1.7, 1.25]],
  cap: ['The capital', [-1.3, 8.62, 1.3, 9.74]], upper: ['Capital and entablature', [-2.95, 8.45, 4.3, 11.95]],
  ent: ['The entablature', [-2.95, 9.2, 4.3, 11.95]], prof: ['The entablature in profile', [1.1, 9.2, 4.2, 11.95]],
  shaft: ['The shaft', [-2.3, 3.1, 4.5, 6.0]],
};
const FRAME_OF = o => o === 99 || o === 0 || o === 4 ? 'whole' : o <= 3 ? 'base' : o <= 7 ? 'cap' : o === 8 ? 'upper' : o === 13 ? 'prof' : o === 14 ? 'shaft' : 'ent';

// ── page ─────────────────────────────────────────────────────────────────────
const $ = s => document.querySelector(s), esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const adr = sec => { const [b, c, n] = sec.split('.'); return `${ROM[b]}.${c}.${n}`; };
const draw = $('#draw'), ov = $('#ov');
const S = { ord: 99, hot: null, pin: null, vb: null };
let B, BY = new Map(), DIM, PARTBIND = new Map();

function markup(text, greek, rs) {
  const cuts = new Set([0, text.length]); rs.forEach(r => { cuts.add(r.a); cuts.add(r.e); }); greek.forEach(g => { cuts.add(g[0]); cuts.add(g[1]); });
  const c = [...cuts].sort((a, b) => a - b); let out = '', open = null;
  for (let i = 0; i < c.length - 1; i++) {
    const a = c[i], e = c[i + 1], r = rs.find(r => r.a <= a && r.e >= e), g = greek.some(g => g[0] <= a && g[1] >= e);
    if (open && open !== r) { out += '</span>'; open = null; }
    if (r && !open) { out += `<span class="tok k-${r.b.kind}${r.b.view ? ' v3d' : ''}" data-b="${r.b.id}">`; open = r; }
    out += g ? `<i class="gr">${esc(text.slice(a, e))}</i>` : esc(text.slice(a, e));
  }
  return out + (open ? '</span>' : '');
}

async function init() {
  const [P, Bj] = await Promise.all([fetch('../data/passages.json').then(r => r.json()), fetch('../data/bindings-3-5.json').then(r => r.json())]);
  B = Bj; B.bindings.forEach(b => { BY.set(b.id, b); b.parts.forEach(pt => (PARTBIND.get(pt) || PARTBIND.set(pt, []).get(pt)).push(b)); });
  build(); DIM = dims();
  draw.innerHTML = `<defs><pattern id="hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="3.2" stroke="#1c1a17" stroke-width=".22" stroke-opacity=".55"/></pattern></defs>`
    + parts.map(q => `<g data-part="${q.id}" data-ord="${q.ord}"${q.aux ? ' class="aux"' : ''}>${q.html}</g>`).join('');
  // text
  const pass = new Map(P.map(q => [q.id, q])), secHtml = [];
  const rangesFor = (sec, text) => B.bindings.filter(b => b.sec === sec && b.q).map(b => { const a = text.indexOf(b.q); return { a, e: a + b.q.length, b }; }).filter(r => r.a >= 0);
  const imp = B.bindings.filter(b => b.q && !b.sec.startsWith(B.chapter + '.')).map(b => {
    const d = display(pass.get(b.sec).text), a = d.text.indexOf(b.q), s = sentences(d.text).find(s => s[0] <= a && s[1] > a) || [0, d.text.length];
    const rs = [{ a: a - s[0], e: a - s[0] + b.q.length, b }];
    return `<p><span class="src">${adr(b.sec)}</span>${markup(d.text.slice(s[0], s[1]), [], rs)}</p>`;
  }).join('');
  secHtml.push(`<section class="imp" data-ord="0"><div class="adr">CARRIED OVER FROM CHAPTER 3 <span>the shaft this chapter completes</span></div>${imp}</section>`);
  for (const q of P.filter(q => q.id.startsWith(B.chapter + '.'))) {
    const d = display(q.text), rs = rangesFor(q.id, d.text), n = rs.length;
    const pg = q.p0 ? ` · Morgan 1914, ${q.p1 > q.p0 ? `pp. ${q.p0}–${q.p1}` : `p. ${q.p0}`}` : '';
    secHtml.push(`<section data-ord="${q.n}" data-sec="${q.id}"><div class="adr">${adr(q.id)}${pg} <span>${n} bound</span></div><p>${markup(d.text, d.greek, rs)}</p></section>`);
  }
  $('#sections').innerHTML = secHtml.join('');
  const cnt = k => B.bindings.filter(b => b.kind === k).length, sw = st => `<span class="sw" style="border-bottom:${st}"></span>`;
  $('#legend').innerHTML = [['S', '1.5px solid var(--cin)', 'the number is in the sentence'], ['D', '1.5px dashed var(--cin)', 'arithmetic on stated numbers'],
    ['R', '1.5px dotted var(--ochre)', 'figure lost or text silent: our reading'], ['W', '1px solid var(--ink)', 'the reason he gives for a rule'], ['V', '1px solid #b4ab99', 'an alternative, or the whole temple: not drawn']]
    .map(([k, st, t]) => `<li><span>${sw(st)}<b>${{ S: 'stated', D: 'derived', R: 'reconstructed', W: 'reason', V: 'not here' }[k]}</b><span class="n">${k === 'V' ? cnt('V') + cnt('X') : cnt(k)}</span></span><span>${t}</span></li>`).join('');
  const q = B.bindings.filter(b => b.q).length;
  $('#counts').innerHTML = `<b>${B.bindings.length}</b> bindings · <b>${q}</b> quoted word for word · <b>${new Set(B.bindings.flatMap(b => b.parts)).size}</b> drawn parts · <b>${B.bindings.filter(b => b.view).length}</b> need the third dimension (double underline)`;

  // events
  document.addEventListener('mouseover', e => {
    const t = e.target.closest('.tok'); if (t) return setHot(t.dataset.b);
    const g = e.target.closest('g[data-part]'); if (g) { const bs = PARTBIND.get(g.dataset.part); if (bs) { const sec = B.chapter + '.' + S.ord; setHot((bs.find(b => b.sec === sec) || bs.find(b => b.kind === 'S') || bs[0]).id, g.dataset.part); } }
  });
  document.addEventListener('mouseout', e => { if (e.target.closest('.tok, g[data-part]')) setHot(S.pin); });
  document.addEventListener('click', e => {
    const t = e.target.closest('.tok'); if (t) { S.pin = S.pin === t.dataset.b ? null : t.dataset.b; return setHot(S.pin); }
    const g = e.target.closest('g[data-part]'); if (g && S.hot) { S.pin = S.hot; const el = document.querySelector(`.tok[data-b="${CSS.escape(S.hot)}"]`); if (el) window.scrollTo({ top: el.closest('section').offsetTop - innerHeight * .18, behavior: 'smooth' }); return; }
    S.pin = null; setHot(null);
  });
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', () => { paintOverlay(); });
  // deep link: #s=<ord>&b=<binding>
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.has('s')) { const el = document.querySelector(`[data-ord="${h.get('s')}"]`); if (el && el.id !== 'head') {
    if (h.has('shot')) { S.force = +h.get('s'); $('#text').style.marginTop = -(el.offsetTop - innerHeight * .16) + 'px'; }   // headless capture cannot scroll
    else scrollTo(0, el.offsetTop - innerHeight * .18); } }
  S.vb = frameVB('whole'); applyVB(); onScroll(true);
  if (h.has('b')) { S.pin = h.get('b'); setHot(S.pin); }
}

function onScroll(snap) {
  const line = scrollY + innerHeight * .34; let ord = 99;
  for (const s of document.querySelectorAll('#sections section')) if (s.offsetTop <= line) ord = +s.dataset.ord;
  if (S.force != null) ord = S.force;
  if (ord === S.ord && snap !== true) return;
  S.ord = ord;
  document.querySelectorAll('#sections section').forEach(s => s.classList.toggle('on', +s.dataset.ord === ord || ord === 99));
  draw.querySelectorAll('g[data-part]').forEach(g => { const o = +g.dataset.ord; g.classList.toggle('ghost', ord !== 99 && o > ord); g.classList.toggle('on', o === ord); });
  const k = FRAME_OF(ord); $('#frameName').innerHTML = `<b>${FRAMES[k][0]}</b>${ord === 99 ? ' · complete' : ord === 0 ? ' · III.3' : ' · III.5.' + ord}`;
  flyTo(frameVB(k), snap === true);
  if (!S.hot) caption(null);
}

const frameVB = k => { const [x0, y0, x1, y1] = FRAMES[k][1]; return [x0 * U, -y1 * U, (x1 - x0) * U, (y1 - y0) * U]; };
function applyVB() { draw.setAttribute('viewBox', S.vb.map(f).join(' ')); paintOverlay(); }
let raf = 0;
function flyTo(to, snap) {
  cancelAnimationFrame(raf); const from = S.vb.slice(), t0 = performance.now(), T = snap ? 0 : 720;
  const step = now => { const t = T ? Math.min(1, (now - t0) / T) : 1, e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    S.vb = from.map((v, i) => v + (to[i] - v) * e); applyVB(); if (t < 1) raf = requestAnimationFrame(step); };
  step(t0);
}
function proj(x, y) { const r = draw.getBoundingClientRect(), [vx, vy, vw, vh] = S.vb, s = Math.min(r.width / vw, r.height / vh); return [(r.width - vw * s) / 2 + (x * U - vx) * s, (r.height - vh * s) / 2 + (-y * U - vy) * s]; }

function setHot(id, viaPart) {
  S.hot = id || null;
  document.querySelectorAll('.tok.hot,.tok.rel').forEach(e => e.classList.remove('hot', 'rel'));
  draw.querySelectorAll('g.hot').forEach(g => g.classList.remove('hot'));
  const b = id && BY.get(id);
  if (b) {
    document.querySelectorAll(`.tok[data-b="${CSS.escape(id)}"]`).forEach(e => e.classList.add('hot'));
    b.parts.forEach(pt => draw.querySelectorAll(`g[data-part="${pt}"]`).forEach(g => g.classList.add('hot')));
    if (viaPart) (PARTBIND.get(viaPart) || []).forEach(o => o !== b && document.querySelectorAll(`.tok[data-b="${CSS.escape(o.id)}"]`).forEach(e => e.classList.add('rel')));
  }
  caption(b); paintOverlay();
}
function caption(b) {
  const m = $('#capMain'), n = $('#capNote');
  if (!b) { m.className = 'idle'; m.textContent = 'Point at an underlined phrase, or at a part of the column.'; n.textContent = ''; return; }
  const kind = B.kinds[b.kind].split(' — ')[0] + (b.view ? ' · third dimension' : '');
  m.className = '';
  m.innerHTML = `<span class="a">${b.sec ? adr(b.sec) : '—'}</span><span class="ar">→</span><span>${esc(b.name)}</span><span class="ar">→</span><span class="f">${esc(b.f)}</span>`
    + (b.v ? `<span class="ar">→</span><span class="mm">${Math.round(b.v * M.Dm * 1000).toLocaleString('en')} mm</span>` : '') + `<span class="k k-${b.kind}">${kind}</span>`;
  n.textContent = b.note || (b.view ? 'A depth: it cannot be shown in elevation. It is bound, and waits for the model in the round.' : '');
}
function paintOverlay() {
  const r = draw.getBoundingClientRect(); ov.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
  let h = LABELS.map(([x, y, t]) => { const [sx, sy] = proj(x, y); return `<text class="lab" x="${f(sx)}" y="${f(sy)}" text-anchor="middle">${t}</text>`; }).join('');
  const L = (a, b, c = '') => `<line class="${c}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"/>`, tick = q => L([q[0] - 4, q[1] + 4], [q[0] + 4, q[1] - 4]);
  for (const d of (S.hot && DIM[S.hot]) || []) {
    if (d.t === 'v') { const a = proj(d.x, d.y0), b = proj(d.x, d.y1), sg = d.side === 'l' ? -1 : 1;
      if (d.ex != null) h += L(proj(d.ex, d.y0), [a[0] + sg * 6, a[1]], 'ex') + L(proj(d.ex, d.y1), [b[0] + sg * 6, b[1]], 'ex');
      h += L(a, b) + tick(a) + tick(b) + `<text class="d" x="${f(a[0] + sg * 11)}" y="${f((a[1] + b[1]) / 2 + 5)}" text-anchor="${sg < 0 ? 'end' : 'start'}">${d.lab}</text>`;
    } else { const a = proj(d.x0, d.y), b = proj(d.x1, d.y), sg = d.side === 't' ? -1 : 1;
      if (d.ex != null) h += L(proj(d.x0, d.ex), [a[0], a[1] + sg * 6], 'ex') + L(proj(d.x1, d.ex), [b[0], b[1] + sg * 6], 'ex');
      h += L(a, b) + tick(a) + tick(b) + `<text class="d" x="${f((a[0] + b[0]) / 2)}" y="${f(a[1] + (sg < 0 ? -9 : 20))}" text-anchor="middle">${d.lab}</text>`;
    }
  }
  ov.innerHTML = h;
}
init();
