import * as THREE from './three.module.min.js';

/* ================= utils ================= */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const fmt = n => (n < 0 ? '−฿' : '฿') + Math.abs(Math.round(n)).toLocaleString('en-US');
const pick = (r, a) => a[Math.floor(r() * a.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const round100 = n => Math.max(100, Math.round(n / 100) * 100);
function wpick(r, pairs) { let t = pairs.reduce((s, p) => s + p[1], 0) * r(); for (const p of pairs) { if ((t -= p[1]) <= 0) return p[0]; } return pairs[pairs.length - 1][0]; }

/* ================= game data (fictional) ================= */
const MATS = {
  clay:   { name: 'เนื้อดินเผา', base: [158, 92, 60], dark: [58, 30, 20], hi: [212, 160, 118], rough: .95, metal: 0 },
  powder: { name: 'เนื้อผงพุทธคุณ', base: [214, 199, 168], dark: [104, 88, 64], hi: [244, 236, 216], rough: .88, metal: 0 },
  copper: { name: 'เนื้อทองแดง', base: [168, 100, 62], dark: [48, 34, 26], hi: [238, 178, 126], rough: .42, metal: .85, patina: [70, 112, 84] },
  silver: { name: 'เนื้อเงิน', base: [196, 196, 198], dark: [52, 52, 58], hi: [250, 250, 250], rough: .3, metal: .95, patina: [90, 80, 70] },
};
const THW = { thin: .07, mid: .11, thick: .17 };
const TELLS = {
  hand:   { label: 'ปางพระหัตถ์', opts: ['mara', 'samadhi'], txt: { mara: 'ปางมารวิชัย: มือขวาวางคว่ำที่เข่า', samadhi: 'ปางสมาธิ: มือวางซ้อนกันบนตัก' } },
  flame:  { label: 'พระเกศ', opts: ['tall', 'short'], txt: { tall: 'เกศยาวเรียวแหลม', short: 'เกศสั้นป้อม' } },
  tiers:  { label: 'ฐานชั้น', num: [2, 4], txt: v => v + ' ชั้น' },
  petals: { label: 'กลีบบัวที่ฐาน', num: [4, 11], txt: v => v + ' กลีบ' },
  dots:   { label: 'เม็ดไข่ปลารอบซุ้ม', num: [9, 19], txt: v => v + ' เม็ด' },
  back:   { label: 'ด้านหลัง', opts: ['plain', 'circle', 'square', 'yantra'], txt: { plain: 'หลังเรียบ มีรอยลายนิ้วมือ', circle: 'ตราประทับวงกลม', square: 'ตราประทับสี่เหลี่ยม', yantra: 'ยันต์ 3 แถว' } },
  edge:   { label: 'ขอบข้าง', opts: ['cut', 'round'], txt: { cut: 'ตัดเป็นเหลี่ยมคม', round: 'มนกลมเรียบ' } },
  thick:  { label: 'ความหนา (ดูด้านข้าง)', opts: ['thin', 'mid', 'thick'], txt: { thin: 'บาง', mid: 'หนาปานกลาง', thick: 'หนามาก' } },
  grain:  { label: 'ผิวเนื้อ (ใช้กล้องส่อง)', opts: ['pores', 'crackle', 'smooth'], txt: { pores: 'มีรูพรุนเม็ดทรายเล็ก ๆ ทั่วองค์', crackle: 'มีรอยแตกลายงาทั่วผิว', smooth: 'ผิวเรียบตึง ไม่มีร่องรอยธรรมชาติ' } },
  loop:   { label: 'หูเหรียญ', opts: ['weld', 'cast'], txt: { weld: 'หูเชื่อม: ห่วงกลมแยกชิ้น', cast: 'หูตัน: แผ่นแบนหล่อติดเหรียญ' } },
};
const tellTxt = (k, v) => { const t = TELLS[k].txt; return typeof t === 'function' ? t(v) : t[v]; };
const MODELS = [
  { id: 'nangpaya', name: 'พระนางพญา วัดเขาแก้ว', shape: 'tri', mat: 'clay', lvl: 1, price: 9000,
    spec: { hand: 'mara', flame: 'short', back: 'plain', edge: 'cut', thick: 'thick', grain: 'pores' } },
  { id: 'somdej', name: 'พระสมเด็จ วัดศรีมงคล', shape: 'rect', mat: 'powder', lvl: 1, price: 28000,
    spec: { hand: 'samadhi', tiers: 3, flame: 'short', back: 'plain', edge: 'cut', thick: 'mid', grain: 'crackle' } },
  { id: 'coin1', name: 'เหรียญรุ่นแรก วัดหนองบัว', shape: 'oval', mat: 'copper', lvl: 2, price: 55000,
    spec: { hand: 'mara', petals: 5, flame: 'tall', back: 'yantra', loop: 'weld' } },
  { id: 'sum', name: 'พระซุ้มเรือนแก้ว วัดทุ่งทอง', shape: 'arch', mat: 'clay', lvl: 3, price: 160000,
    spec: { hand: 'mara', petals: 7, dots: 13, flame: 'tall', back: 'plain', edge: 'cut', thick: 'thick', grain: 'pores' } },
  { id: 'somdejG', name: 'พระสมเด็จพิมพ์ใหญ่ กรุเก่า วัดศรีมงคล', shape: 'rect', mat: 'powder', gold: true, lvl: 4, price: 680000,
    spec: { hand: 'samadhi', tiers: 3, flame: 'tall', back: 'circle', edge: 'cut', thick: 'mid', grain: 'crackle' } },
  { id: 'coin2', name: 'เหรียญเงินรุ่นพิเศษ วัดหนองบัว', shape: 'oval', mat: 'silver', lvl: 5, price: 1800000,
    spec: { hand: 'samadhi', petals: 9, flame: 'short', back: 'square', loop: 'weld' } },
];
const LEVELS = [
  { xp: 0, name: 'มือใหม่หัดส่อง' }, { xp: 120, name: 'นักเลงพระ' }, { xp: 350, name: 'เซียนเปิดแผง' },
  { xp: 800, name: 'เซียนดังประจำสนาม' }, { xp: 1600, name: 'เซียนใหญ่' }, { xp: 3000, name: 'ปรมาจารย์วงการพระ' },
];
const UNLOCK = { 2: 'ลูกค้าเริ่มนำ "เหรียญรุ่นแรก วัดหนองบัว" มาเสนอ', 3: 'ปลดล็อก งานประกวดพระ และ "พระซุ้มเรือนแก้ว วัดทุ่งทอง"', 4: 'ปลดล็อก "พระสมเด็จพิมพ์ใหญ่ กรุเก่า" องค์หลักแสน', 5: 'ปลดล็อก จัดสร้างพระกับวัด และ "เหรียญเงินรุ่นพิเศษ"', 6: 'คุณคือปรมาจารย์วงการพระแล้ว!' };
const TEMPLES = [
  { id: 'pa', name: 'วัดป่าสันติธรรม', fame: 1, rep: 0 },
  { id: 'tt', name: 'วัดทุ่งทอง', fame: 1.6, rep: 35 },
  { id: 'kk', name: 'วัดเขาแก้ว', fame: 2.3, rep: 60 },
];
const PIMS = { rect: 'พิมพ์สมเด็จ', tri: 'พิมพ์นางพญา', arch: 'พิมพ์ซุ้มเรือนแก้ว', oval: 'เหรียญ' };
const UNIT = { clay: 40, powder: 60, copper: 120, silver: 600 };
const NAMES = ['ลุงสมชาย', 'ป้าบุญมี', 'เฮียเส็ง', 'เจ๊หมวย', 'พี่โอ๊ค', 'น้องต้น', 'ตาเปลี่ยน', 'คุณนิด', 'พี่บอย', 'ยายจันทร์', 'เสี่ยเปา', 'ลุงแดง', 'พี่หนิง', 'น้าเขียว', 'คุณวิชัย', 'อาจารย์ประยูร'];
const HONEST = ['ของตกทอดจากคุณพ่อ เก็บในตู้มาหลายสิบปีแล้วครับ', 'ได้รับแจกตอนบวชเมื่อนานมาแล้ว ไม่เคยเอาไปส่องที่ไหนเลย', 'คุณยายห้อยคอมาทั้งชีวิต ลูกหลานอยากให้คนที่รู้คุณค่าดูแลต่อ', 'ไม่แน่ใจว่าแท้ไหม อยากให้เซียนช่วยดู ถ้าราคาพอดีก็ให้เช่าเลย', 'เพื่อนบ้านเก่ามอบให้ก่อนย้ายไปต่างจังหวัด'];
const SLICK = ['รับประกันแท้ร้อยเปอร์เซ็นต์ ผ่านมือเซียนดังมาแล้ว', 'ต้องรีบใช้เงินด่วน ราคานี้ถูกกว่าตลาดเยอะ ตัดสินใจเลย', 'เพิ่งได้มาจากกรุแตกใหม่ ยังไม่มีใครเห็นเลยนะ', 'องค์นี้สวยแชมป์ ไม่ต้องส่องหรอก ดูด้วยตาก็รู้', 'มีคนจองไว้แล้ว แต่ถ้าเอาตอนนี้ให้ก่อนเลย'];

/* ================= procedural amulet: 2D relief maps ================= */
const TW = 512, TH = 640;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const g = v => `rgb(${v},${v},${v})`;
const qb = (a, c, b, t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
const OUT = {};
function outlinePts(shape) {
  if (OUT[shape]) return OUT[shape];
  const P = [];
  if (shape === 'rect') {
    const x0 = .05, x1 = .95, y0 = .04, y1 = .96, r = .06, ry = r * TW / TH;
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
const FIG = { rect: { cx: 256, by: 440, s: 300 }, tri: { cx: 256, by: 520, s: 320 }, arch: { cx: 256, by: 480, s: 290 }, oval: { cx: 256, by: 452, s: 262 } };
function drawFigure(x, f, spec) {
  const { cx, by, s } = f;
  if (spec.tiers) { for (let i = 0; i < spec.tiers; i++) { const w = s * (.7 + .13 * i); slab(x, cx - w / 2, by + 6 + i * (s * .065 + 5), w, s * .065, 150); } }
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
  const tall = spec.flame === 'tall', top = tall ? s * 1.02 : s * .87, w = tall ? s * .024 : s * .04, b0 = by - s * .78;
  const gr = x.createLinearGradient(0, by - top, 0, b0); gr.addColorStop(0, g(150)); gr.addColorStop(1, g(205));
  x.fillStyle = gr; x.beginPath(); x.moveTo(cx - w, b0); x.quadraticCurveTo(cx - w * .5, (b0 + by - top) / 2, cx, by - top); x.quadraticCurveTo(cx + w * .5, (b0 + by - top) / 2, cx + w, b0); x.closePath(); x.fill();
}
function drawFront(x, m, spec) {
  const sh = m.shape, P = outlinePts(sh);
  x.fillStyle = g(36); pathPts(x, P); x.fill();
  x.strokeStyle = g(sh === 'oval' ? 150 : 105); x.lineWidth = sh === 'oval' ? 18 : 20; pathPts(x, inset(P, .93)); x.stroke();
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
  drawFigure(x, FIG[sh], spec);
}
function drawBack(x, m, spec, r) {
  const P = outlinePts(m.shape), metal = MATS[m.mat].metal > 0, cx = TW / 2, cy = TH * .53;
  x.fillStyle = g(30); pathPts(x, P); x.fill();
  if (m.shape === 'oval') { x.strokeStyle = g(150); x.lineWidth = 18; pathPts(x, inset(P, .93)); x.stroke(); }
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
  side === 'front' ? drawFront(x, m, spec) : drawBack(x, m, spec, r);
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
  const det = new Uint8Array(N);
  if (grain === 'pores') {
    for (let k = 0, n = Math.round(2600 * res * res); k < n; k++) {
      const px = Math.floor(r() * W), py = Math.floor(r() * H), rad = r() < .8 ? 1 : 2;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { if (dx * dx + dy * dy > rad * rad) continue; const xx = px + dx, yy = py + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; h[j] = Math.max(0, h[j] - .035); det[j] = 1; }
    }
  } else if (grain === 'crackle') {
    const cc = mk(W, H), cx2 = cc.getContext('2d', { willReadFrequently: true }); cx2.strokeStyle = '#fff'; cx2.lineWidth = Math.max(1, 1.3 * res);
    for (let k = 0; k < 46; k++) { let px = r() * W, py = r() * H, a = r() * 6.28; cx2.beginPath(); cx2.moveTo(px, py); for (let s = 0, n = 12 + r() * 40; s < n; s++) { a += (r() - .5) * 1.1; px += Math.cos(a) * 6 * res; py += Math.sin(a) * 6 * res; cx2.lineTo(px, py); } cx2.stroke(); }
    const cr = chan(cc); for (let i = 0; i < N; i++) if (cr[i] > .3) { det[i] = 2; h[i] = Math.max(0, h[i] - .02 * cr[i]); }
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
    if (m.gold && h[i] > .25 && hi[i] > .58) col = col.map((c0, q) => lerp(c0, [214, 168, 62][q], .78));
    if (det[i] === 1) col = col.map(c0 => c0 * .55); else if (det[i] === 2) col = col.map(c0 => c0 * .52);
    d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = 255;
    const hl = h[y * W + Math.max(xx - 1, 0)], hr = h[y * W + Math.min(xx + 1, W - 1)], hu = h[Math.max(y - 1, 0) * W + xx], hd = h[Math.min(y + 1, H - 1) * W + xx];
    let ax = (hl - hr) * K, ay = (hd - hu) * K; const L = Math.hypot(ax, ay, 1);
    nd[j] = (ax / L * .5 + .5) * 255; nd[j + 1] = (ay / L * .5 + .5) * 255; nd[j + 2] = (1 / L * .5 + .5) * 255; nd[j + 3] = 255;
    dd[j] = dd[j + 1] = dd[j + 2] = clamp(h[i], 0, 1) * 255; dd[j + 3] = 255;
  }
  x.putImageData(img, 0, 0); nx.putImageData(ni, 0, 0); dx2.putImageData(di, 0, 0);
  return { color: c, normal: nc, disp: dc, alpha: mc };
}
const SIDE = {};
function sideTex(matId) {
  if (SIDE[matId]) return SIDE[matId];
  const mat = MATS[matId], c = mk(128, 128), x = c.getContext('2d'), r = rng(hash(matId));
  x.fillStyle = `rgb(${mat.base.map(v => v * .82 | 0)})`; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { const k = .55 + r() * .7; x.fillStyle = `rgba(${mat.base.map(v => clamp(v * k, 0, 255) | 0)},.5)`; x.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1 + r() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
  return SIDE[matId] = t;
}

/* ================= procedural amulet: 3D ================= */
function buildAmulet(m, spec, cond, seed, res = 1) {
  const grp = new THREE.Group(), mat = MATS[m.mat], coin = m.shape === 'oval';
  const thick = coin ? .055 : THW[spec.thick || 'mid'], edge = coin ? 'coin' : (spec.edge || 'cut');
  const shape = new THREE.Shape(outlinePts(m.shape).map(([x, y]) => new THREE.Vector2(x - .5, (.5 - y) * 1.25)));
  const bev = edge === 'cut' ? { s: .02, t: thick * .22, n: 1 } : edge === 'round' ? { s: .034, t: thick * .42, n: 7 } : { s: .012, t: thick * .3, n: 3 };
  const depth = Math.max(.002, thick - 2 * bev.t);
  const bg = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bev.s, bevelThickness: bev.t, bevelSegments: bev.n, curveSegments: 24 });
  bg.translate(0, 0, -depth / 2);
  const bodyMat = new THREE.MeshStandardMaterial({ map: sideTex(m.mat), roughness: mat.rough, metalness: mat.metal });
  grp.add(new THREE.Mesh(bg, bodyMat));
  const D = coin ? .03 : .045, seg = Math.round(190 * res);
  const tex = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  for (const side of ['front', 'back']) {
    const f = makeFace(m, spec, cond, seed, res, side, D);
    const mm = new THREE.MeshStandardMaterial({ map: tex(f.color, 1), normalMap: tex(f.normal), displacementMap: tex(f.disp), displacementScale: D, alphaMap: tex(f.alpha), alphaTest: .5, roughness: mat.rough, metalness: mat.metal });
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.25, seg, Math.round(seg * 1.25)), mm);
    pm.position.z = (side === 'front' ? 1 : -1) * (thick / 2 + .0008);
    if (side === 'back') pm.rotation.y = Math.PI;
    grp.add(pm);
  }
  if (coin) {
    const topY = (.5 - .11) * 1.25, lm = new THREE.MeshStandardMaterial({ map: sideTex(m.mat), metalness: mat.metal, roughness: mat.rough + .08 });
    if (spec.loop === 'weld') {
      const t = new THREE.Mesh(new THREE.TorusGeometry(.065, .016, 14, 40), lm); t.position.y = topY + .075; grp.add(t);
      const w = new THREE.Mesh(new THREE.SphereGeometry(.03, 16, 12), lm); w.scale.set(1.4, .8, .9); w.position.y = topY + .006; grp.add(w);
    } else {
      const s = new THREE.Shape(); s.absarc(0, 0, .085, 0, Math.PI * 2); const hp = new THREE.Path(); hp.absarc(0, 0, .042, 0, Math.PI * 2, true); s.holes.push(hp);
      const lg = new THREE.ExtrudeGeometry(s, { depth: thick * .8, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 1, curveSegments: 24 });
      lg.translate(0, 0, -thick * .4); const lmsh = new THREE.Mesh(lg, lm); lmsh.position.y = topY + .055; grp.add(lmsh);
    }
  }
  return grp;
}
function disposeGroup(grp) {
  grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { for (const k of ['map', 'normalMap', 'displacementMap', 'alphaMap']) { const t = o.material[k]; if (t && !Object.values(SIDE).includes(t)) t.dispose(); } o.material.dispose(); } });
}
function makeEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), sc = new THREE.Scene(), cv = mk(64, 256), x = cv.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#fff1d2'); gr.addColorStop(.45, '#a0603c'); gr.addColorStop(.56, '#3a1a12'); gr.addColorStop(1, '#120806');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })));
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 6, 5), side: THREE.DoubleSide })); lp.position.set(-3, 5, 5); lp.lookAt(0, 0, 0); sc.add(lp);
  const env = pm.fromScene(sc, .03).texture; pm.dispose(); return env;
}
function setupScene(renderer) {
  const sc = new THREE.Scene(); sc.environment = makeEnv(renderer); sc.environmentIntensity = .55;
  sc.add(new THREE.HemisphereLight(0xffe7c4, 0x2a1208, .7));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.6); key.position.set(-2, 2.4, 3); sc.add(key);
  const fill = new THREE.DirectionalLight(0xffc49a, .55); fill.position.set(2.5, -.5, 2); sc.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1); rim.position.set(0, 1, -3); sc.add(rim);
  return sc;
}
function makeRenderer(opts) {
  const r = new THREE.WebGLRenderer(opts); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; return r;
}

/* ================= main view ================= */
const canvas = $('#c'), stage = $('#stage');
const R = makeRenderer({ canvas, antialias: true, alpha: true });
R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
const scene = setupScene(R), cam = new THREE.PerspectiveCamera(30, 1, .05, 50), holder = new THREE.Group(); scene.add(holder);
const V = { zoom: 1, zt: 1, px: 0, py: 0, vx: 0, vy: 0, drag: false, pan: false, spin: 0, reset: null };
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion();
const fitDist = () => { const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); return Math.max(.8 / t, .68 / (t * cam.aspect)); };
function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
const stageRO = new ResizeObserver(resize); stageRO.observe(stage);
function rotBy(ax, ay) { qa.setFromAxisAngle(AY, ax); holder.quaternion.premultiply(qa); qa.setFromAxisAngle(AX, ay); holder.quaternion.premultiply(qa); }
function panBy(dx, dy) { const k = fitDist() * V.zoom * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 2 / (stage.clientHeight || 1); V.px = clamp(V.px - dx * k, -.7, .7); V.py = clamp(V.py + dy * k, -.8, .8); }
const ptrs = new Map(); let pinch0 = null;
const pinchState = () => { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); V.drag = true; V.vx = V.vy = 0; V.reset = null; V.pan = e.button === 2 || e.shiftKey; if (ptrs.size === 2) pinch0 = pinchState(); });
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) { if (V.pan) panBy(dx, dy); else { const k = .009 * Math.max(.45, V.zoom); rotBy(dx * k, dy * k); V.vx = dx * k; V.vy = dy * k; } }
  else if (ptrs.size === 2 && pinch0) { const s = pinchState(); V.zt = clamp(V.zt * pinch0.d / s.d, .2, 1.6); panBy(s.x - pinch0.x, s.y - pinch0.y); pinch0 = s; }
});
const ptrUp = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (!ptrs.size) V.drag = false; };
canvas.addEventListener('pointerup', ptrUp); canvas.addEventListener('pointercancel', ptrUp);
canvas.addEventListener('wheel', e => { e.preventDefault(); V.zt = clamp(V.zt * Math.exp(e.deltaY * .0012), .2, 1.6); }, { passive: false });
canvas.addEventListener('dblclick', () => resetView());
canvas.addEventListener('contextmenu', e => e.preventDefault());
function resetView() { V.reset = new THREE.Quaternion(); V.zt = 1; V.vx = V.vy = 0; }
function flip() { V.spin = Math.PI; V.vx = V.vy = 0; V.reset = null; }
function toggleLoupe() { V.zt = V.zt > .6 ? .32 : 1; if (V.zt === 1) { V.px = V.py = 0; } }
let cur = null;
function showAmulet(m, spec, cond, seed) {
  clearAmulet();
  cur = buildAmulet(m, spec, cond, seed, 1); holder.add(cur);
  holder.quaternion.identity(); rotBy(-.9, .12); V.vx = .03; V.vy = -.002; V.zt = 1; V.zoom = 1.25; V.px = V.py = 0; V.reset = null; V.spin = 0;
}
function clearAmulet() { if (cur) { holder.remove(cur); disposeGroup(cur); cur = null; } }
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame() {
  requestAnimationFrame(frame);
  if (V.spin > 0) { const st = Math.min(V.spin, reduce ? Math.PI : .16); rotBy(st, 0); V.spin -= st; }
  else if (V.reset) { holder.quaternion.slerp(V.reset, .15); if (holder.quaternion.angleTo(V.reset) < .002) { holder.quaternion.copy(V.reset); V.reset = null; } }
  else if (!V.drag && Math.abs(V.vx) + Math.abs(V.vy) > 1e-5) { rotBy(V.vx, V.vy); V.vx *= .93; V.vy *= .93; }
  V.zoom += (V.zt - V.zoom) * .18;
  if (V.zt >= .99 && !V.drag) { V.px *= .88; V.py *= .88; }
  cam.position.set(V.px, V.py, fitDist() * V.zoom);
  $('#loupe').style.opacity = V.zoom < .5 ? 1 : 0;
  R.render(scene, cam);
}

/* ================= thumbnails (second renderer) ================= */
let TR = null, TS = null, TC = null; const THUMB = new Map(), jobs = [];
function snap(key, m, spec, cond, seed, views) {
  if (THUMB.has(key)) return THUMB.get(key);
  if (!TR) { TR = makeRenderer({ canvas: mk(240, 300), antialias: true, preserveDrawingBuffer: true }); TR.setSize(240, 300, false); TR.setClearColor(0x2a130e, 1); TS = setupScene(TR); TC = new THREE.PerspectiveCamera(30, .8, .05, 50); }
  const grp = buildAmulet(m, spec, cond, seed, .5); TS.add(grp);
  const t = Math.tan(THREE.MathUtils.degToRad(15)); TC.position.set(0, 0, Math.max(.8 / t, .68 / (t * .8)) * 1.02);
  const out = views.map(v => { grp.rotation.set(v === 'side' ? .18 : 0, v === 'back' ? Math.PI : v === 'side' ? 1.25 : 0, 0); TR.render(TS, TC); return TR.domElement.toDataURL('image/jpeg', .86); });
  TS.remove(grp); disposeGroup(grp); THUMB.set(key, out); return out;
}
function thumbLater(key, args, cb) { if (THUMB.has(key)) { cb(THUMB.get(key)); return; } jobs.push({ key, args, cb }); if (jobs.length === 1) setTimeout(runJobs, 30); }
function runJobs() { const j = jobs.shift(); if (!j) return; try { j.cb(snap(j.key, ...j.args)); } catch (e) { console.error(e); } if (jobs.length) setTimeout(runJobs, 16); }
function fillThumbs(root) {
  root.querySelectorAll('[data-thumb]').forEach(el => {
    const [kind, id] = el.dataset.thumb.split(':');
    if (kind === 'm') { const m = modelById(id); thumbLater('m:' + id, [m, m.spec, 100, 4242, ['front', 'back', 'side']], urls => { el.querySelectorAll('img').forEach((im, i) => im.src = urls[i]); }); }
    else { const it = S.inv.find(i => String(i.id) === id); if (it) thumbLater('i:' + id, [modelById(it.modelId), it.spec, it.cond, it.seed, ['front']], urls => { el.src = urls[0]; }); }
  });
}

/* ================= state ================= */
const KEY = 'sianphra_v1';
function newGame() { return { v: 1, seed: Math.floor(Math.random() * 1e9), money: 60000, xp: 0, rep: 10, day: 1, inv: [], queue: [], rejected: [], batches: [], custom: [], contestDay: 0, nextId: 1, seen: false, lvlSeen: 1, stats: { bought: 0, sold: 0, fooled: 0 } }; }
let S = null; try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
if (!S || S.v !== 1) { S = newGame(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
const lvl = () => { let l = 1; LEVELS.forEach((L, i) => { if (S.xp >= L.xp) l = i + 1; }); return l; };
const modelById = id => MODELS.find(m => m.id === id) || S.custom.find(m => m.id === id);
const allModels = () => MODELS.concat(S.custom.filter(c => c.ready));
const cf = c => .35 + .65 * Math.pow(clamp((c - 60) / 40, 0, 1), 1.4);
function gainXP(n) { S.xp += Math.max(0, Math.round(n)); }

function mutate(spec, n, r) {
  const s = { ...spec }, ks = Object.keys(s).map(k => [k, r()]).sort((a, b) => a[1] - b[1]).map(a => a[0]).slice(0, n);
  for (const k of ks) {
    const T = TELLS[k];
    if (T.num) { let d = (1 + Math.floor(r() * 2)) * (r() < .5 ? -1 : 1) * (k === 'dots' ? 2 : 1); let v = clamp(s[k] + d, T.num[0], T.num[1]); if (v === spec[k]) v = spec[k] + (spec[k] < T.num[1] ? 1 : -1); s[k] = v; }
    else s[k] = pick(r, T.opts.filter(o => o !== s[k]));
  }
  return s;
}
function makeCustomer(r, L) {
  const pool = allModels().filter(m => m.lvl <= L);
  const m = wpick(r, pool.map(p => [p, p.lvl === L ? 3 : p.lvl === L - 1 ? 2 : 1]));
  const genuine = r() < .5;
  const n = wpick(r, L <= 2 ? [[3, .6], [2, .4]] : L <= 4 ? [[3, .25], [2, .45], [1, .3]] : [[2, .45], [1, .55]]);
  const spec = genuine ? { ...m.spec } : mutate(m.spec, Math.min(n, Object.keys(m.spec).length), r);
  const cond = Math.round(genuine ? 62 + r() * 38 : 72 + r() * 28);
  const market = m.price * cf(cond), ask = round100(market * (genuine ? .55 + r() * .6 : .45 + r() * .5));
  const honest = genuine ? r() < .65 : r() < .35;
  return { id: S.nextId++, name: pick(r, NAMES), line: pick(r, honest ? HONEST : SLICK), modelId: m.id, genuine, spec, cond, ask, patience: 1 + Math.floor(r() * 3), seed: Math.floor(r() * 1e9) };
}
function genQueue() { const r = rng(hash('d' + S.day + ':' + S.seed)), L = lvl(); S.queue = []; for (let i = 0, n = 4 + Math.floor(L / 2); i < n; i++) S.queue.push(makeCustomer(r, L)); }
if (!S.queue.length && S.day === 1 && !S.inv.length) genQueue();

/* ================= modes & rendering ================= */
let mode = 'shop', ownItem = null, lastShown = null;
const coarse = matchMedia('(pointer: coarse)').matches;
$('#hint').textContent = coarse ? 'ลากนิ้วเพื่อหมุน • ถ่างสองนิ้วเพื่อซูม/เลื่อน' : 'ลากเพื่อหมุน • ล้อเมาส์ซูม • Shift+ลากเลื่อน • ดับเบิลคลิกรีเซ็ต';
function loadStage() {
  let key = null, args = null;
  if (mode === 'own' && ownItem) { key = 'i' + ownItem.id; args = [modelById(ownItem.modelId), ownItem.spec, ownItem.cond, ownItem.seed]; }
  else if (S.queue[0]) { const c = S.queue[0]; key = 'c' + c.id; args = [modelById(c.modelId), c.spec, c.cond, c.seed]; }
  if (key === lastShown) return; lastShown = key;
  if (args) showAmulet(...args); else clearAmulet();
}
function render() {
  const L = lvl(), Lc = LEVELS[L - 1], Ln = LEVELS[L];
  $('#money').textContent = fmt(S.money);
  $('#lvname').textContent = `Lv.${L} ${Lc.name}`;
  $('#xpfill').style.width = (Ln ? clamp((S.xp - Lc.xp) / (Ln.xp - Lc.xp), 0, 1) * 100 : 100) + '%';
  $('#rep').innerHTML = `${S.rep}<small>ชื่อเสียง</small>`;
  $('#day').innerHTML = `${S.day}<small>วันที่</small>`;
  renderCard(); renderActs(); renderTabs(); loadStage();
  const q = $('#qinfo'); q.innerHTML = '';
  if (mode === 'shop' && S.queue.length) q.innerHTML = `<span class="badge">ลูกค้ารอ ${S.queue.length} คน</span>` + (L >= 3 && S.day % 3 === 0 && S.contestDay !== S.day ? `<span class="badge gold">วันนี้มีงานประกวดพระ</span>` : '');
  let em = stage.querySelector('.empty'); if (em) em.remove();
  if (mode === 'shop' && !S.queue.length) {
    em = document.createElement('div'); em.className = 'empty';
    em.innerHTML = `<h2>ลูกค้าหมดแล้ววันนี้</h2><p>ไปดูตู้พระ ส่งตรวจ หรือปล่อยเช่าต่อได้ แล้วค่อยปิดร้าน</p><button class="btn ok" id="endDay">ปิดร้าน • ขึ้นวันใหม่</button>`;
    stage.appendChild(em); $('#endDay').onclick = endDay;
  }
  if (lvl() > S.lvlSeen && $('#modal').hidden) { const html = levelHTML(); if (html) openModal(html); }
  save();
}
function specFacts(m) { return `<span>${esc(MATS[m.mat].name)}</span>`; }
function renderCard() {
  const el = $('#card');
  if (mode === 'own' && ownItem) {
    const it = ownItem, m = modelById(it.modelId);
    const st = it.pend ? '<span class="badge">รอผลตรวจ</span>' : it.cert === true ? '<span class="badge good">ใบรับรองแท้</span>' : it.cert === false ? '<span class="badge bad">ของเก๊</span>' : '<span class="badge">ยังไม่ได้ตรวจ</span>';
    el.innerHTML = `<div class="ava">ตู้</div><div><div class="who">องค์ในตู้ของคุณ ${st} ${it.award ? `<span class="badge gold">ติดรางวัล</span>` : ''}</div><div class="line">รับเช่ามาเมื่อวันที่ ${it.day}</div></div>
      <div class="pname">${esc(m.name)}</div>
      <div class="facts">${specFacts(m)}<span>สภาพ <b>${it.cond}/100</b></span><span>ทุน <b>${fmt(it.paid)}</b></span>${it.cert !== false && !it.pend ? `<span>มีคนให้เช่า <b>${fmt(offerFor(it))}</b></span>` : ''}</div>`;
    return;
  }
  const c = S.queue[0];
  if (!c) { el.innerHTML = `<div class="ava">ว่าง</div><div><div class="who">หน้าร้านว่าง</div><div class="line">วันที่ ${S.day} • ลูกค้าวันนี้มาครบแล้ว</div></div>`; return; }
  const m = modelById(c.modelId);
  el.innerHTML = `<div class="ava">${esc(c.name.replace(/^(ลุง|ป้า|เฮีย|เจ๊|พี่|น้อง|ตา|คุณ|ยาย|เสี่ย|น้า|อาจารย์)/, '').slice(0, 1))}</div>
    <div><div class="who">${esc(c.name)} <span class="badge" title="ความอดทนในการต่อราคา">อดทน ${'●'.repeat(c.patience)}${'○'.repeat(Math.max(0, 3 - c.patience))}</span></div><div class="line">“${esc(c.line)}”</div></div>
    <div class="pname">${esc(m.name)}</div>
    <div class="facts">${specFacts(m)}<span>สภาพ <b>${c.cond}/100</b></span><span>ราคาตลาดถ้าแท้ <b>${fmt(m.price * cf(c.cond))}</b></span><span>ขอให้เช่า <b>${fmt(c.ask)}</b></span></div>`;
}
function renderActs() {
  const el = $('#act');
  const common = `<button class="btn" data-a="book">สมุด</button><button class="btn" data-a="flip">พลิก</button><button class="btn" data-a="loupe">ส่อง</button>`;
  if (mode === 'own' && ownItem) {
    const it = ownItem, fee = certFee(it);
    let row2 = `<button class="btn dim" data-a="back">กลับหน้าร้าน</button>`;
    if (it.cert === false) row2 += `<button class="btn no span2" data-a="scrap">ทิ้ง / ขายเป็นของที่ระลึก<small>${fmt(scrapVal(it))}</small></button>`;
    else if (it.pend) row2 += `<button class="btn span2" disabled>รอผลตรวจถึงพรุ่งนี้</button>`;
    else row2 += (it.cert ? '' : `<button class="btn" data-a="cert">ส่งตรวจ<small>${fmt(fee)}</small></button>`) + `<button class="btn ok ${it.cert ? 'span2' : ''}" data-a="sell">ปล่อยเช่า<small>${fmt(offerFor(it))}</small></button>`;
    el.innerHTML = common + row2;
  } else if (S.queue[0]) {
    const c = S.queue[0];
    el.innerHTML = common + `<button class="btn" data-a="nego">ต่อราคา</button><button class="btn ok" data-a="buy">รับเช่า<small>${fmt(c.ask)}</small></button><button class="btn no" data-a="pass">ไม่เอา</button>`;
  } else el.innerHTML = `<button class="btn" data-a="book">สมุด</button><button class="btn" data-a="inv">ตู้พระ</button><button class="btn ok" data-a="end">ปิดร้าน</button>`;
}
function renderTabs() {
  const L = lvl();
  const T = [['shop', 'หน้าร้าน'], ['inv', 'ตู้พระ', '', S.inv.length], ['contest', 'ประกวด', L < 3 ? 'Lv.3' : ''], ['temple', 'จัดสร้าง', L < 5 ? 'Lv.5' : ''], ['book', 'สมุด']];
  $('#tabs').innerHTML = T.map(([k, n, lk, ct]) => `<button class="tab ${(k === 'shop' && mode === 'shop') || (k === 'inv' && mode === 'own') ? 'on' : ''}" data-tab="${k}">${n}${lk ? `<span class="lk">ปลดล็อก ${lk}</span>` : ''}${ct ? `<span class="ct">${ct}</span>` : ''}</button>`).join('');
}

/* ================= actions ================= */
function toast(msg, kind = '') { const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3600); }
function nextCustomer() { S.queue.shift(); render(); }
function negotiate() {
  const c = S.queue[0];
  if (c.patience <= 0) { toast(`${c.name} ไม่พอใจที่โดนต่อราคามากไป เดินออกจากร้านแล้ว`, 'bad'); S.rejected.push({ modelId: c.modelId, genuine: c.genuine }); nextCustomer(); return; }
  c.patience--;
  if (Math.random() < (c.genuine ? .35 : .12)) c.line = 'ราคานี้ต่ำสุดแล้ว ลดไม่ได้จริง ๆ' + (c.patience ? '' : ' ถ้าต่ออีกผมกลับเลยนะ');
  else { c.ask = round100(c.ask * (1 - (.06 + Math.random() * .09))); c.line = `โอเค ๆ ลดให้เหลือ ${fmt(c.ask)} ก็แล้วกัน`; }
  render();
}
function buy() {
  const c = S.queue[0];
  if (S.money < c.ask) { toast('เงินไม่พอรับเช่าองค์นี้', 'bad'); return; }
  S.money -= c.ask; S.stats.bought++;
  S.inv.unshift({ id: c.id, modelId: c.modelId, spec: c.spec, genuine: c.genuine, cond: c.cond, seed: c.seed, paid: c.ask, cert: null, pend: 0, award: 0, day: S.day, xp: false });
  toast(`รับเช่าแล้ว เก็บเข้าตู้พระ`, 'good'); nextCustomer();
}
function pass() { const c = S.queue[0]; S.rejected.push({ modelId: c.modelId, genuine: c.genuine }); nextCustomer(); }
const certFee = it => round100(Math.max(500, modelById(it.modelId).price * .03));
const scrapVal = it => round100(modelById(it.modelId).price * .02);
function offerFor(it) { const m = modelById(it.modelId), r = rng(hash(it.id + ':' + S.day)); return round100(m.price * cf(it.cond) * (it.cert ? 1.15 : 1) * (1 + .1 * it.award) * (1 + S.rep / 300) * (.9 + r() * .18)); }
function revealXP(it) { const m = modelById(it.modelId); it.xp = true; return 15 + clamp(Math.round((m.price * cf(it.cond) - it.paid) / (m.price * .05)), 0, 20) * 2; }
function certify(it) { const fee = certFee(it); if (S.money < fee) { toast('เงินไม่พอจ่ายค่าตรวจ', 'bad'); return; } S.money -= fee; it.pend = S.day; toast('ส่งเข้าสมาคมตรวจพระแล้ว ผลออกวันพรุ่งนี้'); render(); }
function sell(it) {
  if (!it.genuine) { S.rep = Math.max(0, S.rep - 6); it.cert = false; it.xp = true; gainXP(3); S.stats.fooled++; toast('เซียนผู้ซื้อตรวจพบว่าเป็นพระเก๊! ชื่อเสียง −6', 'bad'); render(); return; }
  const p = offerFor(it); S.money += p; S.inv = S.inv.filter(x => x !== it); S.rep = Math.min(100, S.rep + 1); S.stats.sold++;
  gainXP((it.xp ? 0 : revealXP(it)) + 5 + clamp((p - it.paid) / 1000, 0, 40));
  toast(`ปล่อยเช่าได้ ${fmt(p)} • ${p >= it.paid ? 'กำไร' : 'ขาดทุน'} ${fmt(Math.abs(p - it.paid))}`, p >= it.paid ? 'good' : 'bad');
  toShop();
}
function scrap(it) { S.money += scrapVal(it); S.inv = S.inv.filter(x => x !== it); toast(`ขายเป็นของที่ระลึก ได้ ${fmt(scrapVal(it))}`); toShop(); }
function toShop() { mode = 'shop'; ownItem = null; render(); }
function openOwn(it) { mode = 'own'; ownItem = it; closeModal(); render(); }

function endDay() {
  const lines = [], L0 = lvl();
  for (const it of S.inv) if (it.pend) {
    it.pend = 0; it.cert = it.genuine; const m = modelById(it.modelId);
    if (it.genuine) { const x = it.xp ? 0 : revealXP(it); gainXP(x); lines.push(['good', `ผลตรวจ ${m.name}: แท้ ได้ใบรับรอง${x ? ` (+${x} XP)` : ''}`]); }
    else { it.xp = true; gainXP(3); S.stats.fooled++; lines.push(['bad', `ผลตรวจ ${m.name}: ไม่แท้ เสียเงินไป ${fmt(it.paid)}`]); }
  }
  if (S.rejected.length) {
    const fakes = S.rejected.filter(x => !x.genuine).length, real = S.rejected.length - fakes; gainXP(fakes * 12);
    lines.push([fakes >= real ? 'good' : '', `องค์ที่คุณไม่รับเช่า ${S.rejected.length} องค์: เป็นของเก๊ ${fakes} องค์ (+${fakes * 12} XP)${real ? ` • เป็นของแท้ที่พลาดไป ${real} องค์` : ''}`]);
  }
  S.rejected = [];
  for (const b of S.batches) {
    if (b.done) continue; const cm = modelById(b.modelId), t = TEMPLES.find(x => x.id === b.temple);
    if (!b.open) {
      if (S.day + 1 >= b.ready) {
        b.open = true; cm.ready = true; cm.lvl = Math.min(lvl(), 6);
        S.inv.unshift({ id: S.nextId++, modelId: cm.id, spec: { ...cm.spec }, genuine: true, cond: 100, seed: Math.floor(Math.random() * 1e9), paid: 0, cert: true, pend: 0, award: 0, day: S.day + 1, xp: true });
        lines.push(['gold', `${cm.name} จัดสร้างเสร็จแล้ว! เปิดให้บูชาตั้งแต่วันพรุ่งนี้ และวัดมอบองค์ต้นแบบให้คุณ 1 องค์`]);
      } else lines.push(['', `${cm.name}: กำลังจัดสร้าง อีก ${b.ready - S.day - 1} วัน`]);
      continue;
    }
    const r = rng(hash(b.id + ':' + S.day)), n = Math.min(b.qty - b.sold, Math.round(b.qty * (.06 + r() * .09) * (.7 + t.fame * .35) * (1 + S.rep / 120)));
    b.sold += n; const rev = n * b.unit; S.money += Math.round(rev * .7); gainXP(n / 15);
    lines.push(['good', `${cm.name}: บูชาออกไป ${n} องค์ รายได้ ${fmt(rev * .7)} (ถวายวัด ${fmt(rev * .3)})`]);
    if (b.sold >= b.qty) { b.done = true; S.rep = Math.min(100, S.rep + 5); gainXP(100); cm.price = Math.round(cm.price * 1.6); lines.push(['gold', `${cm.name} หมดเกลี้ยง! ชื่อเสียง +5 และราคาสะสมของรุ่นนี้พุ่งขึ้น`]); }
  }
  const rent = 200 + 300 * L0; S.money -= rent; lines.push(['', `ค่าเช่าแผงพระ ${fmt(-rent)}`]);
  S.day++; genQueue(); mode = 'shop'; ownItem = null;
  const lv = levelHTML();
  openModal(`<h2>สรุปวันที่ ${S.day - 1}</h2><ul class="log">${lines.map(([k, t]) => `<li class="${k}">${esc(t)}</li>`).join('')}</ul>${lv}
    <p class="note">วันที่ ${S.day}: มีลูกค้ารอ ${S.queue.length} คน${lvl() >= 3 && S.day % 3 === 0 ? ' • วันนี้มีงานประกวดพระ' : ''}</p><div class="row"><button class="btn ok" data-close>เปิดร้าน</button></div>`);
  render();
}
function levelHTML() {
  const L = lvl(); if (L <= S.lvlSeen) return '';
  let h = ''; for (let l = S.lvlSeen + 1; l <= L; l++) h += `<li class="gold">${esc(UNLOCK[l] || '')}</li>`;
  S.lvlSeen = L; save();
  return `<h3>เลื่อนระดับเป็น Lv.${L} ${esc(LEVELS[L - 1].name)}!</h3><ul class="log">${h}</ul>`;
}

/* ================= modals ================= */
function openModal(html) { $('#mbody').innerHTML = html; $('#modal').hidden = false; fillThumbs($('#mbody')); $('#modal .sheet').scrollTop = 0; }
function closeModal() { $('#modal').hidden = true; if (lvl() > S.lvlSeen) render(); }
$('#mx').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

function bookHTML() {
  const L = lvl(), curId = mode === 'own' && ownItem ? ownItem.modelId : S.queue[0]?.modelId;
  const list = MODELS.concat(S.custom).slice().sort((a, b) => (b.id === curId) - (a.id === curId));
  return `<h2>สมุดองค์ครู</h2><p class="note">เทียบองค์ที่กำลังส่องกับองค์ครู (ของแท้) ของเก๊จะผิดจากองค์ครูอย่างน้อย 1 จุด หมุนดูทั้งหน้า หลัง และขอบข้าง แล้วใช้ "ส่อง" ดูผิวเนื้อใกล้ ๆ</p>` +
    list.map(m => {
      if (m.lvl > L && !m.custom) return `<div class="mdl"><b>${esc(m.name)}</b> <span class="badge">ปลดล็อก Lv.${m.lvl}</span></div>`;
      return `<div class="mdl ${m.id === curId ? 'cur' : ''}"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b style="font:600 18px Kanit,sans-serif">${esc(m.name)}</b>${m.id === curId ? '<span class="badge gold">กำลังส่ององค์นี้</span>' : ''}</div>
      <div class="note">${esc(MATS[m.mat].name)} • ราคาตลาดสภาพสมบูรณ์ ${fmt(m.price)}</div>
      <div class="views" data-thumb="m:${m.id}"><figure><img alt="ด้านหน้า"><figcaption>ด้านหน้า</figcaption></figure><figure><img alt="ด้านหลัง"><figcaption>ด้านหลัง</figcaption></figure><figure><img alt="ด้านข้าง"><figcaption>ด้านข้าง</figcaption></figure></div>
      <table class="tells">${Object.entries(m.spec).map(([k, v]) => `<tr><td>${TELLS[k].label}</td><td>${esc(tellTxt(k, v))}</td></tr>`).join('')}</table></div>`;
    }).join('');
}
function invHTML() {
  if (!S.inv.length) return `<h2>ตู้พระ</h2><p>ตู้ยังว่างอยู่ รับเช่าพระจากลูกค้าหน้าร้านก่อนนะ</p>`;
  return `<h2>ตู้พระ (${S.inv.length} องค์)</h2><p class="note">แตะองค์พระเพื่อส่องดู ส่งตรวจ หรือปล่อยเช่า</p><div class="grid">` +
    S.inv.map(it => { const m = modelById(it.modelId);
      const st = it.pend ? '<span class="badge">รอผลตรวจ</span>' : it.cert === true ? '<span class="badge good">แท้</span>' : it.cert === false ? '<span class="badge bad">เก๊</span>' : '<span class="badge">ยังไม่ตรวจ</span>';
      return `<button class="item" data-own="${it.id}"><img class="thumb" data-thumb="i:${it.id}" alt=""><span class="nm">${esc(m.name)}</span><span class="sub">สภาพ ${it.cond} • ทุน ${fmt(it.paid)}</span><span>${st}${it.award ? ' <span class="badge gold">รางวัล</span>' : ''}</span></button>`; }).join('') + '</div>';
}
function contestHTML() {
  const L = lvl();
  if (L < 3) return `<h2>งานประกวดพระ</h2><p>ปลดล็อกที่ Lv.3 เซียนเปิดแผง (XP ตอนนี้ ${S.xp}/${LEVELS[2].xp})</p>`;
  const nextDay = S.day % 3 === 0 && S.contestDay !== S.day ? S.day : S.day + (3 - S.day % 3);
  if (nextDay !== S.day) return `<h2>งานประกวดพระ</h2><p>งานจัดทุก 3 วัน ครั้งถัดไปคือ <b>วันที่ ${nextDay}</b></p><p class="note">เตรียมพระสภาพสวยที่มีใบรับรองไว้ เพิ่มโอกาสติดรางวัล ถ้าส่งของเก๊เข้าประกวดจะถูกคัดออกและเสียชื่อเสียง</p>`;
  const ok = S.inv.filter(it => !it.pend && it.cert !== false);
  return `<h2>งานประกวดพระ วันที่ ${S.day}</h2><p>เลือกได้สูงสุด 3 องค์ ค่าสมัครองค์ละ ${fmt(1000)} กรรมการให้คะแนนจากความแท้ สภาพ ความหายาก และใบรับรอง</p>` +
    (ok.length ? ok.map(it => { const m = modelById(it.modelId); return `<label class="pick"><input type="checkbox" value="${it.id}"><img data-thumb="i:${it.id}" alt=""><span><b>${esc(m.name)}</b><br><span class="note">สภาพ ${it.cond}${it.cert ? ' • มีใบรับรอง' : ''}</span></span></label>`; }).join('') + `<div class="row"><button class="btn ok" id="enterC">ส่งเข้าประกวด</button></div>`
      : '<p>ยังไม่มีพระที่ส่งประกวดได้ในตู้</p>');
}
function runContest(ids) {
  const items = S.inv.filter(it => ids.includes(String(it.id))); if (!items.length) { toast('เลือกพระอย่างน้อย 1 องค์', 'bad'); return; }
  if (items.length > 3) { toast('ส่งได้สูงสุด 3 องค์', 'bad'); return; }
  const fee = items.length * 1000; if (S.money < fee) { toast('เงินไม่พอค่าสมัคร', 'bad'); return; }
  S.money -= fee; S.contestDay = S.day;
  const res = items.map(it => {
    const m = modelById(it.modelId);
    if (!it.genuine) { S.rep = Math.max(0, S.rep - 8); it.cert = false; it.xp = true; return ['bad', `${m.name}: ถูกคัดออก กรรมการตัดสินว่าไม่แท้ (ชื่อเสียง −8)`]; }
    const sc = it.cond + Math.min(m.lvl, 6) * 4 + (it.cert ? 4 : 0) + Math.random() * 14;
    if (sc >= 112) { S.money += Math.round(m.price * .15); gainXP(120); S.rep = Math.min(100, S.rep + 6); it.award = Math.max(it.award, 3); return ['gold', `${m.name}: ชนะเลิศ! เงินรางวัล ${fmt(m.price * .15)} +120 XP ชื่อเสียง +6`]; }
    if (sc >= 102) { S.money += Math.round(m.price * .06); gainXP(70); S.rep = Math.min(100, S.rep + 3); it.award = Math.max(it.award, 2); return ['good', `${m.name}: รองชนะเลิศอันดับ 1 เงินรางวัล ${fmt(m.price * .06)} +70 XP`]; }
    if (sc >= 94) { gainXP(40); S.rep = Math.min(100, S.rep + 1); it.award = Math.max(it.award, 1); return ['good', `${m.name}: รองชนะเลิศอันดับ 2 +40 XP`]; }
    gainXP(10); return ['', `${m.name}: ไม่ติดรางวัล (+10 XP)`];
  });
  openModal(`<h2>ผลการประกวด</h2><ul class="log">${res.map(([k, t]) => `<li class="${k}">${esc(t)}</li>`).join('')}</ul>${levelHTML()}<p class="note">องค์ที่ติดรางวัลจะปล่อยเช่าได้ราคาสูงขึ้น</p><div class="row"><button class="btn ok" data-close>ตกลง</button></div>`);
  render();
}
const TF = { temple: 'pa', shape: 'rect', mat: 'powder', hand: 'samadhi', flame: 'tall', back: 'circle', qty: 1000 };
function templeCost() { const t = TEMPLES.find(x => x.id === TF.temple); return { cost: Math.round(TF.qty * UNIT[TF.mat] * (.8 + .4 * t.fame) + 20000), unit: Math.round(UNIT[TF.mat] * 6 * t.fame * (1 + S.rep / 150)) }; }
function templeHTML() {
  const L = lvl();
  if (L < 5) return `<h2>จัดสร้างพระกับวัด</h2><p>ปลดล็อกที่ Lv.5 เซียนใหญ่ (XP ตอนนี้ ${S.xp}/${LEVELS[4].xp})</p><p class="note">เมื่อปลดล็อก คุณจะออกแบบพิมพ์ เนื้อพระ และจำนวนเอง ร่วมกับวัดที่ชื่อเสียงของคุณเข้าถึงได้ รายได้ 30% ถวายบำรุงวัด</p>`;
  if (TF.shape === 'oval' && !['copper', 'silver'].includes(TF.mat)) TF.mat = 'copper';
  if (TF.shape !== 'oval' && !['clay', 'powder'].includes(TF.mat)) TF.mat = 'powder';
  const sel = (k, opts) => `<select data-tf="${k}">${opts.map(([v, n, dis]) => `<option value="${v}" ${String(TF[k]) === String(v) ? 'selected' : ''} ${dis ? 'disabled' : ''}>${esc(n)}</option>`).join('')}</select>`;
  const { cost, unit } = templeCost();
  const batches = S.batches.map(b => { const cm = modelById(b.modelId); return `<li class="${b.done ? 'gold' : b.open ? 'good' : ''}">${esc(cm.name)}: ${b.done ? 'หมดแล้ว' : b.open ? `เปิดให้บูชา ${b.sold}/${b.qty} องค์` : `กำลังจัดสร้าง เสร็จวันที่ ${b.ready}`}</li>`; }).join('');
  return `<h2>จัดสร้างพระกับวัด</h2><div class="form">
    <label>วัด${sel('temple', TEMPLES.map(t => [t.id, `${t.name}${S.rep < t.rep ? ` (ต้องมีชื่อเสียง ${t.rep})` : ''}`, S.rep < t.rep]))}</label>
    <label>พิมพ์${sel('shape', Object.entries(PIMS))}</label>
    <label>เนื้อพระ${sel('mat', (TF.shape === 'oval' ? ['copper', 'silver'] : ['powder', 'clay']).map(k => [k, MATS[k].name]))}</label>
    <label>ปางพระหัตถ์${sel('hand', TELLS.hand.opts.map(v => [v, tellTxt('hand', v).split(':')[0]]))}</label>
    <label>พระเกศ${sel('flame', TELLS.flame.opts.map(v => [v, tellTxt('flame', v)]))}</label>
    <label>ด้านหลัง${sel('back', TELLS.back.opts.map(v => [v, tellTxt('back', v)]))}</label>
    <label>จำนวนสร้าง${sel('qty', [[300, '300 องค์'], [1000, '1,000 องค์'], [3000, '3,000 องค์']])}</label>
    <label>ค่าบูชาต่อองค์<span class="big">${fmt(unit)}</span></label></div>
    <p>ค่าจัดสร้างรวมพิธีพุทธาภิเษก <b class="big">${fmt(cost)}</b> • ใช้เวลา 3 วัน</p>
    <div class="row"><button class="btn ok" id="makeB" ${S.money < cost ? 'disabled' : ''}>สั่งจัดสร้าง</button></div>
    ${batches ? `<h3>รุ่นที่จัดสร้าง</h3><ul class="log">${batches}</ul>` : ''}`;
}
function makeBatch() {
  const t = TEMPLES.find(x => x.id === TF.temple); if (S.rep < t.rep) return;
  const { cost, unit } = templeCost(); if (S.money < cost) { toast('เงินไม่พอ', 'bad'); return; }
  S.money -= cost;
  const id = 'c' + S.nextId++, n = S.custom.filter(c => c.temple === t.id).length + 1;
  const spec = { hand: TF.hand, flame: TF.flame, back: TF.back };
  if (TF.shape === 'rect') spec.tiers = 3; if (TF.shape === 'arch' || TF.shape === 'oval') spec.petals = 7; if (TF.shape === 'arch') spec.dots = 13;
  if (TF.shape === 'oval') spec.loop = 'weld'; else { spec.edge = 'cut'; spec.thick = 'mid'; spec.grain = TF.mat === 'powder' ? 'crackle' : 'pores'; }
  S.custom.push({ id, custom: true, ready: false, temple: t.id, name: `${PIMS[TF.shape]} รุ่น${n === 1 ? 'แรก' : ' ' + n} ${t.name}`, shape: TF.shape, mat: TF.mat, lvl: 99, price: unit * 12, spec });
  S.batches.push({ id, modelId: id, temple: t.id, qty: +TF.qty, sold: 0, unit, ready: S.day + 3, open: false, done: false });
  gainXP(50); toast('สั่งจัดสร้างแล้ว วัดจะทำพิธีและแจ้งเมื่อพร้อมให้บูชา', 'good');
  openModal(templeHTML()); render();
}
function menuHTML() {
  return `<h2>เมนู</h2><h3>สถิติ</h3><p>รับเช่า ${S.stats.bought} องค์ • ปล่อยเช่า ${S.stats.sold} องค์ • โดนของเก๊ ${S.stats.fooled} ครั้ง • XP ${S.xp}</p>
  <div class="row"><button class="btn" id="howBtn">วิธีเล่น</button><button class="btn no" id="resetBtn">เริ่มเกมใหม่</button></div>`;
}
const HOW = `<h2>ยินดีต้อนรับสู่แผงพระของคุณ</h2>
<ul class="log"><li>ลูกค้าจะนำพระมาเสนอให้เช่า ลากเพื่อหมุนองค์พระได้รอบ 360° ดูทั้งด้านหน้า ด้านหลัง และขอบข้าง</li>
<li>เปิด <b>สมุด</b> เทียบกับองค์ครู: ปางพระหัตถ์ พระเกศ จำนวนกลีบบัว ฐานชั้น ด้านหลัง ความหนา และผิวเนื้อ ของเก๊จะผิดอย่างน้อย 1 จุด</li>
<li>กด <b>ส่อง</b> เพื่อซูมดูผิวใกล้ ๆ เหมือนใช้กล้องส่องพระ (ซูมแล้วลากสองนิ้ว หรือ Shift+ลาก เพื่อเลื่อนดู)</li>
<li><b>ต่อราคา</b> ได้ แต่ถ้าต่อมากไปลูกค้าจะเดินหนี รับเช่าแล้วไปที่ <b>ตู้พระ</b> เพื่อส่งตรวจหรือปล่อยเช่าทำกำไร</li>
<li>สะสม XP ไต่ระดับ: Lv.3 ปลดล็อกงานประกวดพระ, Lv.5 ปลดล็อกการจัดสร้างพระกับวัด</li></ul>
<p class="note">พระ วัด ราคา และจุดสังเกตทั้งหมดในเกมเป็นเรื่องสมมติ ไม่ได้อ้างอิงพระเครื่องจริง</p>
<div class="row"><button class="btn ok" data-close>เริ่มเปิดร้าน</button></div>`;

/* ================= event wiring ================= */
$('#act').addEventListener('click', e => {
  const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
  ({ book: () => openModal(bookHTML()), flip, loupe: toggleLoupe, nego: negotiate, buy, pass, inv: () => openModal(invHTML()), end: endDay,
     back: toShop, cert: () => certify(ownItem), sell: () => sell(ownItem), scrap: () => scrap(ownItem) })[a]?.();
});
$('#tabs').addEventListener('click', e => {
  const t = e.target.closest('[data-tab]')?.dataset.tab; if (!t) return;
  if (t === 'shop') { closeModal(); toShop(); } else if (t === 'inv') openModal(invHTML()); else if (t === 'contest') openModal(contestHTML()); else if (t === 'temple') openModal(templeHTML()); else openModal(bookHTML());
});
$('#mbody').addEventListener('click', e => {
  const own = e.target.closest('[data-own]'); if (own) { const it = S.inv.find(i => String(i.id) === own.dataset.own); if (it) openOwn(it); return; }
  if (e.target.id === 'enterC') runContest([...$('#mbody').querySelectorAll('.pick input:checked')].map(i => i.value));
  if (e.target.id === 'makeB') makeBatch();
  if (e.target.id === 'howBtn') openModal(HOW);
  if (e.target.id === 'resetBtn') openModal(`<h2>เริ่มเกมใหม่?</h2><p>เงิน เลเวล และพระในตู้ทั้งหมดจะหายไป</p><div class="row"><button class="btn dim" data-close>ยกเลิก</button><button class="btn no" id="resetYes">ยืนยัน เริ่มใหม่</button></div>`);
  if (e.target.id === 'resetYes') { S = newGame(); genQueue(); mode = 'shop'; ownItem = null; lastShown = null; closeModal(); render(); }
});
$('#mbody').addEventListener('change', e => {
  const k = e.target.dataset.tf; if (k) { TF[k] = k === 'qty' ? +e.target.value : e.target.value; openModal(templeHTML()); }
  if (e.target.matches('.pick input')) { const on = $('#mbody').querySelectorAll('.pick input:checked'); if (on.length > 3) { e.target.checked = false; toast('ส่งได้สูงสุด 3 องค์', 'bad'); } }
});
$('#menuBtn').onclick = () => openModal(menuHTML());

resize(); render(); frame();
if (!S.seen) { S.seen = true; save(); openModal(HOW); }
