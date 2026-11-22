// แยกจาก game.js (เฟส 2) — ดูโครงสร้างใน CLAUDE.md
import { $, clamp, lerp, rng, hash, fmt, pick, esc, round100, wpick, inPoly, mk } from './util.js';
import { isCoin, subOf, MATS, THW, TELLS, tellTxt, MODELS, LEVELS, UNLOCK, TEMPLES, PIMS, DW, mWeight, TOOLS, INGR, RECIPES, EVENTS, PAGES, LIVE_T, LIVE_Q, VIEWERS, LUCKY, NAME_A, NAME_B, ingrList, ingrKey, ingrTxt, mutIngr, UNIT, NAMES, HONEST, SLICK } from './data.js';

/* ================= procedural amulet: 2D relief maps ================= */
const TW = 512, TH = 640;
const g = v => `rgb(${v},${v},${v})`;
const qb = (a, c, b, t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
const OUT = {};
const ENAMEL = [[190, 34, 40], [30, 130, 80], [40, 80, 180]];
function outlinePts(shape) {
  if (OUT[shape]) return OUT[shape];
  const P = [];
  // หยดน้ำ (ใบโพธิ์/กลีบบัว/เหรียญหยดน้ำ): ปลายแหลมด้านบน; m ยิ่งมากปลายยิ่งเรียว
  const drop = (wx, m, y0, y1) => { for (let i = 0; i < 80; i++) { const t = i / 80 * Math.PI * 2; P.push([.5 + wx * Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), m), y0 + (y1 - y0) * (1 - Math.cos(t)) / 2]); } };
  if (shape === 'rect' || shape === 'smallrect') {
    const sm = shape === 'smallrect', x0 = sm ? .2 : .05, x1 = sm ? .8 : .95, y0 = sm ? .14 : .04, y1 = sm ? .9 : .96, r = .06, ry = r * TW / TH;
    const corner = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * ry]); } };
    corner(x1 - r, y1 - ry, 0); corner(x0 + r, y1 - ry, Math.PI / 2); corner(x0 + r, y0 + ry, Math.PI); corner(x1 - r, y0 + ry, 1.5 * Math.PI);
  } else if (shape === 'arch') {
    const x0 = .06, x1 = .94, yb = .96, ys = .42, ap = [.5, .03];
    P.push([x1, yb], [x0, yb], [x0, ys]);
    for (let i = 1; i <= 16; i++) P.push(qb([x0, ys], [x0 + .02, .1], ap, i / 16));
    for (let i = 1; i <= 16; i++) P.push(qb(ap, [x1 - .02, .1], [x1, ys], i / 16));
  } else if (shape === 'tri') {
    const pts = [[.5, .05], [.93, .95], [.07, .95]], k = .09;
    for (let i = 0; i < 3; i++) {
      const p = pts[i], pv = pts[(i + 2) % 3], nx = pts[(i + 1) % 3];
      const a = [lerp(p[0], pv[0], k), lerp(p[1], pv[1], k)], b = [lerp(p[0], nx[0], k), lerp(p[1], nx[1], k)];
      for (let j = 0; j <= 6; j++) P.push(qb(a, p, b, j / 6));
    }
  } else if (shape === 'round') {
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; P.push([.5 + Math.cos(a) * .45, .53 + Math.sin(a) * .36]); }
  } else if (shape === 'bodhi') drop(.47, 1, .05, .95);
  else if (shape === 'lotus') drop(.44, 1.8, .04, .95);
  else if (shape === 'coindrop') drop(.44, 1.3, .1, .95);
  else if (shape === 'jackfruit') { for (let i = 0; i < 80; i++) { const t = i / 80 * Math.PI * 2, sn = Math.sin(t); P.push([.5 + .38 * sn * Math.pow(Math.abs(sn), .45), .5 - .46 * Math.cos(t)]); } }
  else if (shape === 'sema') {
    const segs = [[[.8, .95], [.93, .64], [.85, .42]], [[.85, .42], [.8, .13], [.5, .05]], [[.5, .05], [.2, .13], [.15, .42]], [[.15, .42], [.07, .64], [.2, .95]]];
    for (const [a, c, b] of segs) for (let i = 0; i < 16; i++) P.push(qb(a, c, b, i / 16));
  } else if (shape === 'pidta') {
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2; let y = .52 + Math.sin(a) * .47; const k = .82 + .18 * clamp((y - .05) / .8, 0, 1);
      y = Math.min(y, .94); P.push([.5 + Math.cos(a) * .45 * k, y]);
    }
  } else {
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; P.push([.5 + Math.cos(a) * .45, .54 + Math.sin(a) * .43]); }
  }
  return OUT[shape] = P;
}
const inset = (P, f, cx = .5, cy = .53) => P.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
function pathPts(x, P) { x.beginPath(); P.forEach(([a, b], i) => i ? x.lineTo(a * TW, b * TH) : x.moveTo(a * TW, b * TH)); x.closePath(); }
function dome(x, cx, cy, rx, ry, h, edge = .4) {
  x.save(); x.translate(cx, cy); x.scale(1, ry / rx);
  const gr = x.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, g(h)); gr.addColorStop(1, g(Math.round(h * edge)));
  x.fillStyle = gr; x.beginPath(); x.arc(0, 0, rx, 0, Math.PI * 2); x.fill(); x.restore();
}
function limb(x, pts, w, h) {
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  for (const [ww, hh] of [[w, h * .62], [w * .55, h]]) { x.strokeStyle = g(Math.round(hh)); x.lineWidth = ww; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); }
  x.restore();
}
function slab(x, x0, y0, w, h, v) {
  const r = Math.min(h / 2, 8);
  const gr = x.createLinearGradient(0, y0, 0, y0 + h); gr.addColorStop(0, g(v)); gr.addColorStop(1, g(Math.round(v * .7)));
  x.fillStyle = gr; x.beginPath(); x.moveTo(x0 + r, y0); x.arcTo(x0 + w, y0, x0 + w, y0 + h, r); x.arcTo(x0 + w, y0 + h, x0, y0 + h, r); x.arcTo(x0, y0 + h, x0, y0, r); x.arcTo(x0, y0, x0 + w, y0, r); x.fill();
}
function glyph(x, gx, gy, sz, r, v) {
  x.save(); x.strokeStyle = g(v); x.lineWidth = sz * .13; x.lineCap = 'round'; x.lineJoin = 'round';
  const hx = gx - sz * .25 + r() * sz * .2, hy = gy - sz * .15 + r() * sz * .3;
  x.beginPath(); x.arc(hx, hy, sz * .11, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(hx + sz * .1, hy);
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) x.quadraticCurveTo(gx + (r() - .5) * sz, gy + (r() - .5) * sz, gx + (r() - .5) * sz * .8, gy + (r() - .5) * sz * .9);
  x.stroke(); x.restore();
}
function unalom(x, cx, cy, R, v) {
  x.save(); x.strokeStyle = g(v); x.lineWidth = R * .09; x.lineCap = 'round'; x.beginPath();
  for (let t = 0; t <= Math.PI * 3.2; t += .1) { const rr = R * .05 + t / (Math.PI * 3.2) * R * .32; const px = cx + Math.cos(t) * rr, py = cy + R * .35 + Math.sin(t) * rr; t ? x.lineTo(px, py) : x.moveTo(px, py); }
  for (let i = 0; i <= 20; i++) x.lineTo(cx + Math.sin(i * .9) * R * .12, cy + R * .1 - i / 20 * R * .9);
  x.stroke(); x.restore();
}
const FIG = { rect: { cx: 256, by: 440, s: 300 }, tri: { cx: 256, by: 520, s: 320 }, arch: { cx: 256, by: 480, s: 290 }, oval: { cx: 256, by: 452, s: 262 }, pidta: { cx: 256, by: 528, s: 330 },
  round: { cx: 256, by: 462, s: 236 }, bodhi: { cx: 256, by: 500, s: 300 }, lotus: { cx: 256, by: 500, s: 290 }, jackfruit: { cx: 256, by: 470, s: 250 }, smallrect: { cx: 256, by: 440, s: 205 }, coindrop: { cx: 256, by: 488, s: 238 }, sema: { cx: 256, by: 486, s: 245 } };
// ตำแหน่งองค์พระตามปาง (ยืน/ลีลา/รูปเหมือนสูงกว่านั่ง)
function poseFig(shape, pose) {
  const f = FIG[shape] || FIG.rect;
  if (pose === 'stand' || pose === 'walk') return { cx: f.cx, by: f.by + f.s * .24, s: f.s * .98 };
  if (pose === 'naga') return { cx: f.cx, by: f.by - f.s * .02, s: f.s * .86 };
  if (pose === 'monk') return { cx: f.cx, by: f.by + f.s * .12, s: f.s * 1.05 };
  return f;
}
function flameAt(x, cx, b0, top, w) {
  const gr = x.createLinearGradient(0, top, 0, b0); gr.addColorStop(0, g(150)); gr.addColorStop(1, g(205));
  x.fillStyle = gr; x.beginPath(); x.moveTo(cx - w, b0); x.quadraticCurveTo(cx - w * .5, (b0 + top) / 2, cx, top); x.quadraticCurveTo(cx + w * .5, (b0 + top) / 2, cx + w, b0); x.closePath(); x.fill();
}
// ปางยืน / ปางลีลา (walk = ก้าวเดิน ขาหน้าเยื้อง มือขวายกระดับอก)
function drawStanding(x, f, spec, walk) {
  const { cx, by, s } = f;
  slab(x, cx - s * .3, by + 4, s * .6, s * .05, 135);
  if (walk) { limb(x, [[cx - s * .03, by - s * .34], [cx - s * .13, by - s * .02]], s * .085, 172); limb(x, [[cx + s * .05, by - s * .34], [cx + s * .12, by - s * .14], [cx + s * .08, by]], s * .085, 180); }
  else { dome(x, cx - s * .06, by - s * .025, s * .065, s * .03, 192, .6); dome(x, cx + s * .06, by - s * .025, s * .065, s * .03, 192, .6); }
  dome(x, cx + (walk ? s * .02 : 0), by - s * .36, s * .16, s * .35, 178, .5);
  dome(x, cx, by - s * .66, s * .15, s * .065, 172, .55);
  if (walk) {
    limb(x, [[cx - s * .13, by - s * .66], [cx - s * .17, by - s * .46], [cx - s * .15, by - s * .3]], s * .055, 186);
    limb(x, [[cx + s * .13, by - s * .66], [cx + s * .19, by - s * .56], [cx + s * .05, by - s * .54]], s * .055, 196); dome(x, cx + s * .05, by - s * .54, s * .04, s * .034, 212, .6);
  } else for (const k of [-1, 1]) { limb(x, [[cx + k * s * .14, by - s * .66], [cx + k * s * .18, by - s * .46], [cx + k * s * .17, by - s * .29]], s * .055, 186); dome(x, cx + k * s * .17, by - s * .28, s * .032, s * .028, 205, .6); }
  dome(x, cx, by - s * .72, s * .04, s * .03, 170, .6);
  dome(x, cx - s * .07, by - s * .79, s * .018, s * .05, 150, .5); dome(x, cx + s * .07, by - s * .79, s * .018, s * .05, 150, .5);
  dome(x, cx, by - s * .79, s * .07, s * .085, 215, .55); dome(x, cx, by - s * .88, s * .05, s * .038, 205, .5);
  const tall = spec.flame === 'tall'; flameAt(x, cx, by - s * .9, by - s * (tall ? 1.12 : .99), s * (tall ? .016 : .04));
}
// ปางนาคปรก: พังพานนาคเหนือเศียร (nagaHeads) + ขดนาคเป็นฐาน แล้วจึงวาดองค์พระนั่งสมาธิ
function drawNaga(x, f, spec) {
  const { cx, by, s } = f, n = spec.nagaHeads || 7;
  dome(x, cx, by - s * .78, s * .4, s * .34, 128, .55);
  for (let i = 0; i < n; i++) { const a = Math.PI * (.08 + .84 * i / (n - 1)), hx = cx - Math.cos(a) * s * .34, hy = by - s * .74 - Math.sin(a) * s * .32; dome(x, hx, hy, s * .048, s * .058, 202, .55); dome(x, hx, hy - s * .035, s * .018, s * .018, 228, .6); }
  for (let i = 0; i < 3; i++) dome(x, cx, by + s * .03 + i * s * .075, s * (.46 - i * .05), s * .045, 168 - i * 8, .45);
  drawFigure(x, f, { ...spec, hand: 'samadhi', tiers: 0, petals: 0, _noBase: true });
}
// รูปเหมือนพระสงฆ์ชรา (สมมติ): ครึ่งองค์ ริ้วรอยแกะลึก + ย่ามหรือลูกประคำ (monkItem)
function drawMonk(x, f, spec) {
  const { cx, by, s } = f;
  dome(x, cx, by - s * .08, s * .46, s * .27, 165, .45);
  limb(x, [[cx - s * .3, by - s * .3], [cx + s * .05, by - s * .06], [cx + s * .26, by + s * .04]], s * .055, 186);
  dome(x, cx, by - s * .4, s * .09, s * .08, 175, .55);
  dome(x, cx - s * .19, by - s * .6, s * .035, s * .06, 180, .55); dome(x, cx + s * .19, by - s * .6, s * .035, s * .06, 180, .55);
  dome(x, cx, by - s * .62, s * .19, s * .23, 208, .55);
  x.save(); x.globalCompositeOperation = 'source-over'; x.strokeStyle = g(150); x.lineCap = 'round'; x.lineWidth = Math.max(2, s * .012);
  for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(cx - s * .1, by - s * (.75 - i * .028)); x.quadraticCurveTo(cx, by - s * (.765 - i * .028), cx + s * .1, by - s * (.75 - i * .028)); x.stroke(); }
  for (const k of [-1, 1]) { x.beginPath(); x.moveTo(cx + k * s * .035, by - s * .64); x.lineTo(cx + k * s * .1, by - s * .645); x.stroke(); x.beginPath(); x.moveTo(cx + k * s * .05, by - s * .56); x.quadraticCurveTo(cx + k * s * .08, by - s * .52, cx + k * s * .06, by - s * .47); x.stroke(); }
  x.beginPath(); x.moveTo(cx - s * .05, by - s * .49); x.lineTo(cx + s * .05, by - s * .49); x.stroke(); x.restore();
  if (spec.monkItem === 'yam') { limb(x, [[cx + s * .17, by - s * .36], [cx - s * .14, by - s * .04]], s * .035, 210); slab(x, cx - s * .36, by - s * .1, s * .2, s * .17, 204); }
  else if (spec.monkItem === 'beads') for (let i = 0; i < 15; i++) { const a = Math.PI * (.12 + .76 * i / 14); dome(x, cx - Math.cos(a) * s * .2, by - s * .4 + Math.sin(a) * s * .17, s * .024, s * .024, 228, .55); }
}
// ตำหนิพิมพ์ย่อย: line = ขีดใต้ฐาน, dot = จุดเหนือเศียรด้านขวา
function drawSubMark(x, f, pose, mark) {
  const { cx, by, s } = f;
  if (mark === 'line') { x.fillStyle = g(208); x.fillRect(cx - s * .1, by + (pose === 'monk' ? s * .12 : pose === 'stand' || pose === 'walk' ? s * .1 : s * .29), s * .2, Math.max(4, s * .018)); }
  if (mark === 'dot') dome(x, cx + s * .13, by - s * (pose === 'monk' ? .92 : pose === 'stand' || pose === 'walk' ? 1.1 : 1.06), s * .026, s * .026, 222, .5);
}
function drawPidta(x, f, spec) {
  const { cx, by, s } = f;
  slab(x, cx - s * .52, by + 4, s * 1.04, s * .06, 130);
  dome(x, cx, by - s * .08, s * .52, s * .15, 165, .45);
  dome(x, cx - s * .32, by - s * .07, s * .13, s * .075, 188, .55); dome(x, cx + s * .32, by - s * .07, s * .13, s * .075, 188, .55);
  dome(x, cx, by - s * .38, s * .32, s * .3, 178, .5);
  for (const k of [-1, 1]) limb(x, [[cx + k * s * .27, by - s * .5], [cx + k * s * .36, by - s * .64], [cx + k * s * .16, by - s * .8]], s * .085, 192);
  dome(x, cx, by - s * .86, s * .25, s * .22, 186, .5);
  dome(x, cx, by - s * 1.08, s * .07, s * .055, 180, .5);
  for (const k of [-1, 1]) {
    const px = cx + k * s * .115, py = by - s * .85;
    dome(x, px, py, s * .13, s * .16, 214, .62);
    for (let j = 0; j < 4; j++) dome(x, px + (j - 1.5) * s * .05, py - s * .14, s * .022, s * .03, 205, .6);
    if (spec.palm === 'una') unalom(x, px, py - s * .02, s * .11, 250);
    else if (spec.palm === 'na') glyph(x, px + s * .03, py, s * .17, rng(hash('pidta:na' + k)), 250);
  }
}
function drawFigure(x, f, spec) {
  const { cx, by, s } = f;
  if (spec._noBase) { /* ปางนาคปรกมีขดนาคเป็นฐานแล้ว */ }
  else if (spec.tiers) { for (let i = 0; i < spec.tiers; i++) { const w = s * (.7 + .13 * i); slab(x, cx - w / 2, by + 6 + i * (s * .065 + 5), w, s * .065, 150); } }
  else if (spec.petals) {
    const n = spec.petals, W = s * .95, y = by + s * .075;
    for (let i = 0; i < n; i++) dome(x, cx - W / 2 + (i + .5) * W / n, y, W / n * .44, s * .075, 170, .4);
    slab(x, cx - W * .55, y + s * .085, W * 1.1, s * .045, 125);
  } else slab(x, cx - s * .42, by + 6, s * .84, s * .055, 135);
  dome(x, cx, by - s * .09, s * .38, s * .1, 170, .5);
  dome(x, cx - s * .2, by - s * .1, s * .06, s * .035, 195, .6); dome(x, cx + s * .2, by - s * .1, s * .06, s * .035, 195, .6);
  dome(x, cx, by - s * .32, s * .17, s * .22, 185, .55);
  dome(x, cx - s * .15, by - s * .47, s * .075, s * .06, 170, .5); dome(x, cx + s * .15, by - s * .47, s * .075, s * .06, 170, .5);
  const L = pts => limb(x, pts.map(([a, b]) => [cx + a * s, by + b * s]), s * .075, 185);
  if (spec.hand === 'mara') {
    L([[-.17, -.47], [-.25, -.3], [-.27, -.12]]); dome(x, cx - s * .27, by - s * .1, s * .05, s * .045, 205, .6);
    L([[.17, -.47], [.24, -.29], [.05, -.17]]); dome(x, cx + s * .04, by - s * .16, s * .06, s * .03, 200, .6);
  } else {
    L([[-.17, -.47], [-.24, -.29], [-.04, -.17]]); L([[.17, -.47], [.24, -.29], [.04, -.17]]);
    dome(x, cx, by - s * .16, s * .1, s * .045, 205, .6);
  }
  dome(x, cx, by - s * .56, s * .05, s * .04, 170, .6);
  dome(x, cx - s * .098, by - s * .63, s * .022, s * .065, 150, .5); dome(x, cx + s * .098, by - s * .63, s * .022, s * .065, 150, .5);
  dome(x, cx, by - s * .645, s * .09, s * .11, 215, .55);
  dome(x, cx, by - s * .75, s * .065, s * .05, 205, .5);
  const tall = spec.flame === 'tall', top = tall ? s * 1.1 : s * .82, w = tall ? s * .02 : s * .05, b0 = by - s * .78;
  const gr = x.createLinearGradient(0, by - top, 0, b0); gr.addColorStop(0, g(150)); gr.addColorStop(1, g(205));
  x.fillStyle = gr; x.beginPath(); x.moveTo(cx - w, b0); x.quadraticCurveTo(cx - w * .5, (b0 + by - top) / 2, cx, by - top); x.quadraticCurveTo(cx + w * .5, (b0 + by - top) / 2, cx + w, b0); x.closePath(); x.fill();
}
function drawFront(x, m, spec) {
  const sh = m.shape, P = outlinePts(sh);
  x.fillStyle = g(36); pathPts(x, P); x.fill();
  x.strokeStyle = g(isCoin(sh) ? 150 : 105); x.lineWidth = isCoin(sh) ? 18 : 20; pathPts(x, inset(P, .93)); x.stroke();
  if (sh === 'rect') {
    x.strokeStyle = g(125); x.lineWidth = 7; x.beginPath(); x.moveTo(.17 * TW, .87 * TH); x.lineTo(.17 * TW, .36 * TH);
    x.quadraticCurveTo(.17 * TW, .12 * TH, .5 * TW, .12 * TH); x.quadraticCurveTo(.83 * TW, .12 * TH, .83 * TW, .36 * TH); x.lineTo(.83 * TW, .87 * TH); x.stroke();
  }
  if (sh === 'arch') {
    const arc = P.slice(2), path = inset(arc, .85, .5, .56);
    const len = [0]; for (let i = 1; i < path.length; i++) len.push(len[i - 1] + Math.hypot((path[i][0] - path[i - 1][0]) * TW, (path[i][1] - path[i - 1][1]) * TH));
    const tot = len[len.length - 1], n = spec.dots || 13;
    for (let k = 0; k < n; k++) {
      const t = (k + .5) / n * tot; let i = 1; while (i < len.length - 1 && len[i] < t) i++;
      const f = (t - len[i - 1]) / (len[i] - len[i - 1]);
      dome(x, lerp(path[i - 1][0], path[i][0], f) * TW, lerp(path[i - 1][1], path[i][1], f) * TH, 10, 10, 170, .45);
    }
    const inner = inset(arc, .76, .5, .58); x.strokeStyle = g(120); x.lineWidth = 6; x.beginPath();
    inner.forEach(([a, b], i) => i ? x.lineTo(a * TW, b * TH) : x.moveTo(a * TW, b * TH)); x.lineTo(inner[inner.length - 1][0] * TW, .86 * TH); x.moveTo(inner[0][0] * TW, inner[0][1] * TH); x.lineTo(inner[0][0] * TW, .86 * TH); x.stroke();
  }
  if (sh === 'oval') {
    slab(x, .27 * TW, .84 * TH, .46 * TW, .055 * TH, 105);
    const r = rng(hash(m.id + ':txt')); for (let i = 0; i < 6; i++) glyph(x, .31 * TW + i * .075 * TW, .867 * TH, 26, r, 165);
  }
  const pose = m.pose || (sh === 'pidta' ? 'pidta' : 'seated'), f = poseFig(sh, pose);
  if (pose === 'pidta') drawPidta(x, f, spec); else if (pose === 'stand' || pose === 'walk') drawStanding(x, f, spec, pose === 'walk');
  else if (pose === 'naga') drawNaga(x, f, spec); else if (pose === 'monk') drawMonk(x, f, spec); else drawFigure(x, f, spec);
  const sub = subOf(m, spec.sub); if (sub) drawSubMark(x, f, pose, sub.mark);
}
function drawBack(x, m, spec, r) {
  const P = outlinePts(m.shape), metal = MATS[m.mat].metal > 0, cx = TW / 2, cy = TH * .53;
  x.fillStyle = g(30); pathPts(x, P); x.fill();
  if (isCoin(m.shape)) { x.strokeStyle = g(150); x.lineWidth = 18; pathPts(x, inset(P, .93)); x.stroke(); }
  if (!metal) for (let i = 0; i < 14; i++) dome(x, TW * (.2 + r() * .6), TH * (.2 + r() * .6), 20 + r() * 40, 20 + r() * 40, 40 + Math.round(r() * 25), .6);
  const gr = rng(hash(m.id + ':back'));
  if (spec.back === 'plain') {
    if (!metal) {
      const fx = cx + (r() - .5) * 140, fy = cy + (r() - .5) * 180, a0 = r() * 6;
      x.save(); x.strokeStyle = g(58); x.lineWidth = 2.6;
      for (let i = 1; i < 15; i++) { x.beginPath(); x.ellipse(fx, fy, 8 + i * 7, 10 + i * 8.5, a0, r() * .8, Math.PI * (1.2 + r() * .7)); x.stroke(); }
      x.restore();
    }
  } else if (spec.back === 'circle') {
    x.strokeStyle = g(140); x.lineWidth = 14; x.beginPath(); x.arc(cx, cy, TW * .2, 0, Math.PI * 2); x.stroke();
    unalom(x, cx, cy - TW * .06, TW * .2, 160);
  } else if (spec.back === 'square') {
    const s = TW * .4; x.strokeStyle = g(140); x.lineWidth = 14; x.strokeRect(cx - s / 2, cy - s / 2, s, s);
    for (let i = 0; i < 4; i++) glyph(x, cx + (i % 2 ? 1 : -1) * s * .22, cy + (i < 2 ? -1 : 1) * s * .22, s * .32, gr, 160);
  } else {
    unalom(x, cx, TH * .19, TW * .16, 150);
    for (let row = 0; row < 3; row++) { const n = row === 1 ? 3 : 4; for (let i = 0; i < n; i++) glyph(x, cx + (i - (n - 1) / 2) * TW * .17, TH * (.4 + .14 * row), 52, gr, 155); }
  }
}
function drawCode(x, m, spec, r) {
  if (spec.code !== 'stamp' && spec.code !== 'wrong') return;
  const wr = spec.code === 'wrong', rc = wr ? r : rng(hash(m.id + ':code')), bx = TW / 2 + (wr ? 24 : 0), by = TH * (wr ? .8 : .84);
  x.strokeStyle = g(175); x.lineWidth = 5; x.strokeRect(bx - 64, by - 21, 128, 42);
  for (let i = 0; i < 4; i++) glyph(x, bx - 44 + i * 29, by, 26, rc, 205);
}
function boxBlur(src, w, h, r, passes = 2) {
  const a = new Float32Array(src), b = new Float32Array(w * h), d = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) { const o = y * w; let s = 0; for (let i = -r; i <= r; i++) s += a[o + clamp(i, 0, w - 1)]; for (let x = 0; x < w; x++) { b[o + x] = s / d; s += a[o + Math.min(x + r + 1, w - 1)] - a[o + Math.max(x - r, 0)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += b[clamp(i, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { a[y * w + x] = s / d; s += b[Math.min(y + r + 1, h - 1) * w + x] - b[Math.max(y - r, 0) * w + x]; } }
  }
  return a;
}
function noise(w, h, cells, r) {
  const gw = cells + 2, gh = Math.ceil(cells * h / w) + 2, G = new Float32Array(gw * gh).map(() => r()), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { const fy = y / h * (gh - 2), y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < w; x++) { const fx = x / w * (gw - 2), x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
      const a = G[y0 * gw + x0], b = G[y0 * gw + x0 + 1], c = G[(y0 + 1) * gw + x0], d = G[(y0 + 1) * gw + x0 + 1];
      out[y * w + x] = lerp(lerp(a, b, sx), lerp(c, d, sx), sy); } }
  return out;
}
function chan(cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, a = new Float32Array(cv.width * cv.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4] / 255; return a; }
function makeFace(m, spec, cond, seed, res, side, D) {
  const W = Math.round(TW * res), H = Math.round(TH * res), N = W * H, r = rng(seed + (side === 'back' ? 7777 : 0));
  const c = mk(W, H), x = c.getContext('2d', { willReadFrequently: true });
  x.setTransform(res, 0, 0, res, 0, 0); x.fillStyle = '#000'; x.fillRect(0, 0, TW, TH); x.globalCompositeOperation = 'lighten';
  if (side === 'front') drawFront(x, m, spec); else { drawBack(x, m, spec, r); drawCode(x, m, spec, r); }
  let h = chan(c);
  const mc = mk(W, H), mx = mc.getContext('2d', { willReadFrequently: true }); mx.setTransform(res, 0, 0, res, 0, 0);
  mx.fillStyle = '#000'; mx.fillRect(0, 0, TW, TH); mx.fillStyle = '#fff'; pathPts(mx, outlinePts(m.shape)); mx.fill();
  if (cond < 88) { const P = outlinePts(m.shape); mx.fillStyle = '#000'; for (let i = 0, n = Math.floor((92 - cond) / 7); i < n; i++) { const p = P[Math.floor(r() * P.length)]; mx.beginPath(); mx.arc(p[0] * TW, p[1] * TH, 5 + r() * 10, 0, 7); mx.fill(); } }
  const soft = boxBlur(chan(mc), W, H, Math.max(1, Math.round(5 * res)));
  h = boxBlur(h, W, H, Math.max(1, Math.round((1.2 + (100 - cond) / 16) * res)));
  const low = noise(W, H, 10, r), hi = noise(W, H, 44, r), mat = MATS[m.mat], metal = mat.metal > 0;
  const grain = spec.grain || (metal ? 'metal' : 'pores'), smooth = grain === 'smooth', capH = 1 - (100 - cond) / 170;
  for (let i = 0; i < N; i++) {
    let v = h[i] + (low[i] - .5) * (smooth ? .008 : metal ? .015 : .04) + (hi[i] - .5) * (smooth ? .003 : metal ? .006 : .02);
    if (v > capH) v = capH + (v - capH) * .3;
    h[i] = Math.max(0, v) * soft[i] * soft[i];
  }
  const det = new Uint8Array(N), oxA = grain === 'oxide' ? new Float32Array(N) : null;
  if (grain === 'pores') {
    for (let k = 0, n = Math.round(2600 * res * res); k < n; k++) {
      const px = Math.floor(r() * W), py = Math.floor(r() * H), rad = r() < .8 ? 1 : 2;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { if (dx * dx + dy * dy > rad * rad) continue; const xx = px + dx, yy = py + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; h[j] = Math.max(0, h[j] - .055); det[j] = 1; }
    }
  } else if (grain === 'crackle') {
    const cc = mk(W, H), cx2 = cc.getContext('2d', { willReadFrequently: true }); cx2.strokeStyle = '#fff'; cx2.lineWidth = Math.max(1, 1.7 * res);
    for (let k = 0; k < 46; k++) { let px = r() * W, py = r() * H, a = r() * 6.28; cx2.beginPath(); cx2.moveTo(px, py); for (let s = 0, n = 12 + r() * 40; s < n; s++) { a += (r() - .5) * 1.1; px += Math.cos(a) * 6 * res; py += Math.sin(a) * 6 * res; cx2.lineTo(px, py); } cx2.stroke(); }
    const cr = chan(cc); for (let i = 0; i < N; i++) if (cr[i] > .3) { det[i] = 2; h[i] = Math.max(0, h[i] - .035 * cr[i]); }
  } else if (grain === 'oxide') {
    const ox = noise(W, H, 16, r), sp = noise(W, H, 70, r);
    for (let i = 0; i < N; i++) { const k = clamp((ox[i] - .6) * 7, 0, 1) * clamp((sp[i] - .45) * 4, 0, 1); if (k > .05) { det[i] = 3; oxA[i] = k; h[i] += .008 * k; } }
  }
  // มวลสาร: เนื้อผง/ดินวาดเป็นเม็ด/เส้นเล็ก ๆ (เห็นชัดเมื่อส่อง) ตำแหน่งหลักจาก seed ของรุ่น + เล็กน้อยจาก seed ขององค์
  // ของจริงนูนมีมิติ สีไม่สม่ำเสมอ; ของเทียมแบนและสีเรียบเท่ากันหมด; เหรียญโลหะใช้ผสมสีเข้าเนื้อแทน
  const ING = ingrList(spec.ingr || ''), ingI = ING.length && !metal ? new Int8Array(N).fill(-1) : null, ingJ = ingI ? new Float32Array(N) : null;
  if (ingI) {
    const P0 = inset(outlinePts(m.shape), .86), S1 = Math.max(1, res);
    ING.forEach((gI, gi) => {
      const kind = INGR[gI.id].kind, rm = rng(hash(m.id + ':ingr:' + gI.id + side)), rp = rng(seed + hash(gI.id + side));
      for (let k = 0; k < 300; k++) {
        const rr = k < 260 ? rm : rp, fx = rr(), fy = rr(), ang = rr() * Math.PI, jr = rr(), sz = rr(), jit = gI.fake ? 1 : .8 + jr * .4;
        if (!inPoly(fx, fy, P0)) continue;
        const put = (px, py, a) => { px = Math.round(px); py = Math.round(py); if (px < 0 || py < 0 || px >= W || py >= H) return; const j = py * W + px; if (soft[j] < .6) return; ingI[j] = gi; ingJ[j] = jit; if (!gI.fake) h[j] += .03 * a; };
        const disc = (cx, cy, rx, ry, an) => { const Rr = Math.ceil(Math.max(rx, ry)), c = Math.cos(an), sn = Math.sin(an); for (let dy = -Rr; dy <= Rr; dy++) for (let dx = -Rr; dx <= Rr; dx++) { const u = (dx * c + dy * sn) / rx, v = (-dx * sn + dy * c) / ry, d = u * u + v * v; if (d <= 1) put(cx + dx, cy + dy, 1 - d * .6); } };
        const cx = fx * W, cy = fy * H;
        if (kind === 'hair') { let x0 = cx, y0 = cy, a = ang * 2; for (let t = 0, L = (10 + sz * 8) * S1; t < L; t++) { put(x0, y0, .7); a += (rm() - .5) * .35; x0 += Math.cos(a); y0 += Math.sin(a); } }
        else if (kind === 'grain') disc(cx, cy, 2.8 * S1, 1.2 * S1, ang);
        else if (kind === 'metal') disc(cx, cy, (1.8 + sz) * S1, .8 * S1, ang);
        else if (kind === 'flake') { disc(cx, cy, (1.2 + sz * .8) * S1, 1.1 * S1, ang); disc(cx + 1.4 * S1, cy + .8 * S1, .9 * S1, .9 * S1, 0); }
        else if (kind === 'shiny') disc(cx, cy, 2 * S1, 2 * S1, 0);
        else disc(cx, cy, (1.2 + sz * 1.1) * S1, (1.2 + sz * 1.1) * S1, 0);
      }
    });
  }
  const B = boxBlur(h, W, H, Math.max(2, Math.round(10 * res)));
  x.globalCompositeOperation = 'source-over'; x.setTransform(1, 0, 0, 1, 0, 0);
  const img = x.createImageData(W, H), d = img.data;
  const nc = mk(W, H), nx = nc.getContext('2d'), ni = nx.createImageData(W, H), nd = ni.data;
  const dc = mk(W, H), dx2 = dc.getContext('2d'), di = dx2.createImageData(W, H), dd = di.data;
  const K = D * W * 1.15;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const i = y * W + xx, j = i * 4;
    const cav = clamp((B[i] - h[i]) * 9, 0, 1), rid = clamp((h[i] - B[i]) * 6, 0, 1), v = low[i] * .6 + hi[i] * .4;
    const k1 = clamp(cav * .85 + (1 - v) * .18, 0, 1), k2 = clamp(rid * .5 + v * .12, 0, 1);
    let col = [0, 1, 2].map(q => lerp(lerp(mat.base[q], mat.dark[q], k1), mat.hi[q], k2));
    if (mat.patina) col = col.map((c0, q) => lerp(c0, mat.patina[q], cav * .65 * v));
    if (mat.fx === 'spots' && hi[i] > .6) col = col.map((c0, q) => lerp(c0, [[214, 170, 96], [170, 96, 90], [120, 120, 126]][Math.floor(low[i] * 2.99)][q], .55));
    else if (mat.fx === 'pink' && low[i] > .55) col = col.map((c0, q) => lerp(c0, [236, 186, 196][q], (low[i] - .55) * 1.6));
    else if (mat.fx === 'wood') { const st = .5 + .5 * Math.sin(xx / W * 70 + low[i] * 9 + hi[i] * 1.5); col = col.map(c0 => c0 * (.74 + .3 * st)); }
    else if (mat.fx === 'glaze') col = col.map((c0, q) => lerp(c0, mat.hi[q], rid * .35));
    // งานผิว (finish) เป็นจุดสังเกต
    const fin = spec.finish || (spec.crust ? 'kru' : null); // crust = คราบกรุจากการขุดกรุ (ไม่ใช่จุดสังเกต)
    if (fin === 'lacquer') { const top = clamp((h[i] - .3) / .35, 0, 1); col = col.map((c0, q) => lerp(c0, [36, 22, 18][q], .82)); if (top > .15 && hi[i] > .4) col = col.map((c0, q) => lerp(c0, [218, 172, 70][q], .85 * top)); }
    else if (fin === 'gilt') { const wear = clamp(rid * 1.6 - .2 + (100 - cond) / 90, 0, 1); col = col.map((c0, q) => lerp(lerp(c0, [226, 184, 82][q], .8), c0, wear * .85)); }
    else if (fin === 'kru') { if (cav > .15 && low[i] > .42) col = col.map((c0, q) => lerp(c0, [228, 222, 206][q], .75 * cav)); if (hi[i] < .36 && cav > .08) col = col.map((c0, q) => lerp(c0, [118, 86, 56][q], .55)); }
    else if (fin === 'enamel' && cav > .22) col = col.map((c0, q) => lerp(c0, ENAMEL[hash(m.id) % 3][q], .88));
    if (m.gold && h[i] > .25 && hi[i] > .58) col = col.map((c0, q) => lerp(c0, [214, 168, 62][q], .78));
    if (det[i] === 1) col = col.map(c0 => c0 * .4); else if (det[i] === 2) col = col.map(c0 => c0 * .38);
    else if (det[i] === 3) col = col.map((c0, q) => lerp(c0, [226, 222, 206][q], .62 * oxA[i]));
    if (ingI && ingI[i] >= 0) {
      const gI = ING[ingI[i]], I = INGR[gI.id], sh = I.kind === 'flake' || I.kind === 'metal' || I.kind === 'shiny' ? .75 + hi[i] * .7 : 1;
      col = gI.fake ? I.col.slice() : I.col.map((c0, q) => lerp(clamp(c0 * ingJ[i] * sh, 0, 255), col[q], .2));
    } else if (metal && ING.length) for (const gI of ING) col = col.map((c0, q) => lerp(c0, INGR[gI.id].col[q], gI.fake ? .09 : .2 * low[i] * low[i]));
    d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = 255;
    const hl = h[y * W + Math.max(xx - 1, 0)], hr = h[y * W + Math.min(xx + 1, W - 1)], hu = h[Math.max(y - 1, 0) * W + xx], hd = h[Math.min(y + 1, H - 1) * W + xx];
    let ax = (hl - hr) * K, ay = (hd - hu) * K; const L = Math.hypot(ax, ay, 1);
    nd[j] = (ax / L * .5 + .5) * 255; nd[j + 1] = (ay / L * .5 + .5) * 255; nd[j + 2] = (1 / L * .5 + .5) * 255; nd[j + 3] = 255;
    dd[j] = dd[j + 1] = dd[j + 2] = clamp(h[i], 0, 1) * 255; dd[j + 3] = 255;
  }
  x.putImageData(img, 0, 0); nx.putImageData(ni, 0, 0); dx2.putImageData(di, 0, 0);
  return { color: c, normal: nc, disp: dc, alpha: mc };
}
export { poseFig, flameAt, drawStanding, drawNaga, drawMonk, drawSubMark, ENAMEL, TW, TH, g, qb, OUT, outlinePts, inset, pathPts, dome, limb, slab, glyph, unalom, FIG, drawPidta, drawFigure, drawFront, drawBack, drawCode, boxBlur, noise, chan, makeFace };
