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
  lead:   { name: 'เนื้อตะกั่ว', base: [118, 120, 124], dark: [38, 38, 42], hi: [184, 186, 190], rough: .62, metal: .55, patina: [206, 202, 188] },
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
  grain:  { label: 'ผิวเนื้อ (ใช้กล้องส่อง)', opts: ['pores', 'crackle', 'smooth', 'oxide'], txt: { pores: 'มีรูพรุนเม็ดทรายเล็ก ๆ ทั่วองค์', crackle: 'มีรอยแตกลายงาทั่วผิว', smooth: 'ผิวเรียบตึง ไม่มีร่องรอยธรรมชาติ', oxide: 'มีคราบไขขาวเป็นดวง ๆ เกาะตามผิว' } },
  palm:   { label: 'ยันต์ที่ฝ่ามือ (ใช้กล้องส่อง)', opts: ['una', 'na', 'plain'], txt: { una: 'ยันต์อุณาโลมนูนบนฝ่ามือทั้งสองข้าง', na: 'ยันต์ตัวขอมขีดเดียวบนฝ่ามือ', plain: 'ฝ่ามือเรียบ ไม่มียันต์' } },
  // จุดสังเกตแฝง: ไม่อยู่ใน spec ขององค์ครู (ใช้ค่า def) ของเก๊ทั่วไปไม่เปลี่ยน มีแต่ "เก๊เทพ" ที่ผิดตรงนี้
  resin:  { label: 'เรืองแสงใต้ไฟ UV', hidden: true, def: 'no', opts: ['no', 'yes'], txt: { no: 'ไม่เรืองแสง (ของแท้ไม่เรืองแสงใต้ UV)', yes: 'เรืองแสงสีฟ้าอมเขียว: เนื้อเรซิ่นปลอม' } },
  weight: { label: 'น้ำหนัก (ใช้ตาชั่ง)', hidden: true, def: 'std', opts: ['std', 'light', 'heavy'], txt: { std: 'ตรงกับองค์ครู (คลาดเคลื่อนไม่เกิน ±3%)', light: 'เบากว่าองค์ครู 12–25%', heavy: 'หนักกว่าองค์ครู 12–25%' } },
  // มวลสาร: ค่าเป็นสตริง id เรียงตัวอักษรคั่นด้วย + ต่อท้าย * = ของเทียม เช่น 'gold+wan*'
  code:   { label: 'โค้ดกำกับองค์ (ด้านหลัง)', opts: ['stamp', 'none', 'wrong'], txt: { stamp: 'ตอกโค้ดกำกับองค์ในกรอบใต้ยันต์', none: 'ไม่มีโค้ดกำกับ', wrong: 'โค้ดตำแหน่งเพี้ยน ลายตัวเลขไม่ตรงแบบ' } },
  ingr:   { label: 'มวลสาร (ใช้กล้องส่อง)', txt: v => ingrTxt(v), mut: (r, v) => mutIngr(r, v) },
  loop:   { label: 'หูเหรียญ', opts: ['weld', 'cast'], txt: { weld: 'หูเชื่อม: ห่วงกลมแยกชิ้น', cast: 'หูตัน: แผ่นแบนหล่อติดเหรียญ' } },
};
const tellTxt = (k, v) => { const t = TELLS[k].txt; return typeof t === 'function' ? t(v) : t[v]; };
const MODELS = [
  { id: 'nangpaya', name: 'พระนางพญา วัดเขาแก้ว', shape: 'tri', mat: 'clay', lvl: 1, price: 9000, weight: 14.5,
    spec: { hand: 'mara', flame: 'short', back: 'plain', edge: 'cut', thick: 'thick', grain: 'pores' } },
  { id: 'somdej', name: 'พระสมเด็จ วัดศรีมงคล', shape: 'rect', mat: 'powder', lvl: 1, price: 28000, weight: 9.5,
    spec: { hand: 'samadhi', tiers: 3, flame: 'short', back: 'plain', edge: 'cut', thick: 'mid', grain: 'crackle' } },
  { id: 'coin1', name: 'เหรียญรุ่นแรก วัดหนองบัว', shape: 'oval', mat: 'copper', lvl: 2, price: 55000, weight: 12,
    spec: { hand: 'mara', petals: 5, flame: 'tall', back: 'yantra', loop: 'weld' } },
  { id: 'sum', name: 'พระซุ้มเรือนแก้ว วัดทุ่งทอง', shape: 'arch', mat: 'clay', lvl: 3, price: 160000, weight: 17,
    spec: { hand: 'mara', petals: 7, dots: 13, flame: 'tall', back: 'plain', edge: 'cut', thick: 'thick', grain: 'pores' } },
  { id: 'pidta', name: 'พระปิดตา วัดบ้านนา', shape: 'pidta', mat: 'lead', lvl: 4, price: 320000, weight: 38,
    spec: { palm: 'una', back: 'yantra', edge: 'round', thick: 'thick', grain: 'oxide' } },
  { id: 'somdejG', name: 'พระสมเด็จพิมพ์ใหญ่ กรุเก่า วัดศรีมงคล', shape: 'rect', mat: 'powder', gold: true, lvl: 4, price: 680000, weight: 10.5,
    spec: { hand: 'samadhi', tiers: 3, flame: 'tall', back: 'circle', edge: 'cut', thick: 'mid', grain: 'crackle' } },
  { id: 'coin2', name: 'เหรียญเงินรุ่นพิเศษ วัดหนองบัว', shape: 'oval', mat: 'silver', lvl: 5, price: 1800000, weight: 15.5,
    spec: { hand: 'samadhi', petals: 9, flame: 'short', back: 'square', loop: 'weld' } },
];
const LEVELS = [
  { xp: 0, name: 'มือใหม่หัดส่อง' }, { xp: 120, name: 'นักเลงพระ' }, { xp: 350, name: 'เซียนเปิดแผง' },
  { xp: 800, name: 'เซียนดังประจำสนาม' }, { xp: 1600, name: 'เซียนใหญ่' }, { xp: 3000, name: 'ปรมาจารย์วงการพระ' },
];
const UNLOCK = { 2: 'ลูกค้าเริ่มนำ "เหรียญรุ่นแรก วัดหนองบัว" มาเสนอ', 3: 'ปลดล็อก งานประกวดพระ และ "พระซุ้มเรือนแก้ว วัดทุ่งทอง"', 4: 'ปลดล็อก "พระสมเด็จพิมพ์ใหญ่ กรุเก่า" องค์หลักแสน และ "พระปิดตา วัดบ้านนา" เนื้อตะกั่ว', 5: 'ปลดล็อก จัดสร้างพระกับวัด และ "เหรียญเงินรุ่นพิเศษ"', 6: 'คุณคือปรมาจารย์วงการพระแล้ว!' };
const TEMPLES = [
  { id: 'pa', name: 'วัดป่าสันติธรรม', fame: 1, rep: 0 },
  { id: 'tt', name: 'วัดทุ่งทอง', fame: 1.6, rep: 35 },
  { id: 'kk', name: 'วัดเขาแก้ว', fame: 2.3, rep: 60 },
];
const PIMS = { rect: 'พิมพ์สมเด็จ', tri: 'พิมพ์นางพญา', arch: 'พิมพ์ซุ้มเรือนแก้ว', oval: 'เหรียญ' };
const DW = { clay: 14, powder: 10, copper: 12, silver: 15, lead: 38 };
const mWeight = m => m.weight || DW[m.mat];
const TOOLS = [
  { id: 'loupe', name: 'กล้องส่อง 20x', price: 15000, lvl: 1, desc: 'ซูมได้ลึกขึ้นอีกเท่าตัว และปุ่ม "ส่อง" ซูมใกล้ขึ้น เห็นรูพรุน ลายงา และยันต์ชัดกว่าเดิม' },
  { id: 'uv', name: 'ไฟฉาย UV', price: 40000, lvl: 2, desc: 'เพิ่มปุ่ม "UV" ส่องในที่มืดใต้แสงม่วง เนื้อเรซิ่นปลอมจะเรืองแสงสีฟ้าอมเขียว ของแท้ไม่เรืองแสง' },
  { id: 'scale', name: 'ตาชั่งดิจิทัล', price: 80000, lvl: 3, desc: 'แสดงน้ำหนักองค์พระเป็นกรัมในการ์ด เทียบกับน้ำหนักองค์ครูในสมุด ของแท้คลาดเคลื่อนไม่เกิน ±3%' },
];
// มวลสาร (สมมติทั้งหมด): cost = บาท/องค์, hype = กระแสเริ่มต้น, price = ราคาสะสม +%, kind = รูปร่างที่วาดบนเนื้อพระ, col = สี (เหรียญโลหะใช้เป็นสีที่ผสมเข้าเนื้อ)
const INGR = {
  powderOld: { name: 'ผงพุทธคุณเก่า', cost: 4, hype: 0, price: 0, kind: 'dot', col: [236, 226, 196], look: 'เม็ดขาวนวลเล็ก ๆ' },
  gold:      { name: 'ทองคำเปลว', cost: 25, hype: 5, price: 0, kind: 'flake', col: [248, 202, 70], look: 'จุดทองระยิบ' },
  wan:       { name: 'ว่านมงคล 108', cost: 12, hype: 0, price: .10, kind: 'dot', col: [34, 90, 46], look: 'เม็ดเขียวเข้ม' },
  tabai:     { name: 'ผงตะไบพระกริ่ง', cost: 30, hype: 0, price: .15, kind: 'metal', col: [222, 222, 228], look: 'เศษโลหะแวววาว', lvl: 5 },
  hair:      { name: 'เกศาครูบาอาจารย์', cost: 15, hype: 8, price: 0, kind: 'hair', col: [20, 16, 14], look: 'เส้นดำเล็ก ๆ', trust: 50 },
  itje:      { name: 'ผงอิทธิเจ', cost: 14, hype: 5, price: .05, kind: 'dot', col: [120, 142, 176], look: 'เม็ดเทาอมฟ้า' },
  rice:      { name: 'ข้าวสารเสก', cost: 1, hype: 0, price: 0, kind: 'grain', col: [250, 248, 238], look: 'เม็ดขาวรี' },
  kaka:      { name: 'ดินกากยายักษ์', cost: 20, hype: 12, price: .20, kind: 'shiny', col: [16, 14, 12], look: 'เม็ดดำมันวาว', award: true },
};
// ตำรับลับ: ต้องใช้มวลสารของจริงครบทุกอย่างใน need (ไม่เฉลยในเกม)
const RECIPES = [
  { id: 'wealth', name: 'ตำรับมหาโภคทรัพย์', need: ['gold', 'wan', 'powderOld'], hype: 15, price: 0, txt: 'กระแสเริ่มต้น +15' },
  { id: 'metta', name: 'ตำรับเมตตามหานิยม', need: ['hair', 'itje', 'rice'], hype: 0, price: .25, txt: 'ราคาสะสม +25%' },
  { id: 'power', name: 'ตำรับมหาอำนาจบารมี', need: ['kaka', 'tabai', 'gold'], hype: 10, price: .15, txt: 'กระแสเริ่มต้น +10 และราคาสะสม +15%' },
  { id: 'safe', name: 'ตำรับแคล้วคลาดคุ้มภัย', need: ['wan', 'rice', 'itje', 'powderOld'], hype: 8, price: .10, txt: 'กระแสเริ่มต้น +8 และราคาสะสม +10%' },
];
// เหตุการณ์/เพจ/คอมเมนต์ไลฟ์ (สมมติทั้งหมด) {n} = ชื่อรุ่น
const EVENTS = ['มีคนแคล้วคลาดจากอุบัติเหตุรถคว่ำ ห้อย {n} อยู่ คลิปแชร์กันทั้งโซเชียล', 'เลขท้ายพระ {n} ตรงกับหวยงวดนี้ คนแห่มาบูชา', 'แม่ค้าตลาดเช้าบอกว่าห้อย {n} แล้วขายดีเป็นเทน้ำเทท่า', 'ชาวประมงรอดจากพายุกลางทะเล ในกระเป๋ามี {n}', 'นักร้องลูกทุ่งห้อย {n} ขึ้นเวทีคอนเสิร์ต แฟนคลับตามหากันใหญ่'];
const PAGES = ['เพจส่องพระสายมู', 'พระดีบอกต่อ', 'เซียนน้อยรีวิว', 'มูเตลูรายวัน', 'ตลาดพระออนไลน์ 24 ชม.'];
const LIVE_T = { mat: 'เนื้อและมวลสาร', rite: 'พิธี', hist: 'ประวัติวัด' };
const LIVE_Q = [['เนื้ออะไรครับ', 'mat'], ['มีมวลสารอะไรบ้าง', 'mat'], ['ใส่ทองคำเปลวจริงไหม', 'mat'], ['ผงเก่ามาจากไหนครับ', 'mat'], ['พิธีที่ไหน', 'rite'], ['ใครปลุกเสกครับ', 'rite'], ['เสกกี่วาระ', 'rite'], ['พิธีจัดวันไหน', 'rite'], ['แท้ไหม', 'hist'], ['วัดอยู่จังหวัดไหน', 'hist'], ['วัดนี้เก่าแก่แค่ไหน', 'hist'], ['เจ้าอาวาสองค์ก่อนเป็นใคร', 'hist']];
const VIEWERS = ['คุณเอ', 'พี่ต่อ', 'น้องมิ้น', 'เฮียกุ้ย', 'ป้าแดง', 'หนุ่มโคราช', 'สายมูตัวจริง', 'เซียนบ้านนอก'];
const LUCKY = ['รวย', 'เฮง', 'มั่งมี', 'ลาภ', 'แคล้วคลาด', 'เมตตา'];
const NAME_A = ['รวย', 'เฮง', 'มั่งมี', 'มหาลาภ', 'แคล้วคลาด', 'เมตตา', 'บารมี'], NAME_B = ['ทันใจ', 'ล้นฟ้า', 'ร้อยล้าน', 'คุ้มภัย', 'พูนทรัพย์'];
const ingrList = v => v ? v.split('+').map(x => ({ id: x.replace('*', ''), fake: x.endsWith('*') })).filter(x => INGR[x.id]) : [];
const ingrKey = l => l.map(x => x.id + (x.fake ? '*' : '')).sort().join('+');
const ingrTxt = v => { const l = ingrList(v); return l.length ? l.map(x => INGR[x.id].name + (x.fake ? ' (เทียม)' : '')).join(', ') : 'ไม่มีมวลสาร'; };
// ของเก๊: ขาดมวลสาร 1–2 อย่าง หรือใส่ผิดชนิด และเป็นของเทียมทั้งหมด
function mutIngr(r, v) {
  const l = ingrList(v).map(x => x.id);
  if (l.length && r() < .55) { for (let i = 0, k = Math.min(l.length, 1 + Math.floor(r() * 2)); i < k; i++) l.splice(Math.floor(r() * l.length), 1); }
  else { const nw = pick(r, Object.keys(INGR).filter(p => !l.includes(p))); if (l.length) l[Math.floor(r() * l.length)] = nw; else l.push(nw); }
  return ingrKey(l.map(id => ({ id, fake: true })));
}
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
const FIG = { rect: { cx: 256, by: 440, s: 300 }, tri: { cx: 256, by: 520, s: 320 }, arch: { cx: 256, by: 480, s: 290 }, oval: { cx: 256, by: 452, s: 262 }, pidta: { cx: 256, by: 528, s: 330 } };
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
  if (sh === 'pidta') drawPidta(x, FIG[sh], spec); else drawFigure(x, FIG[sh], spec);
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
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { if (dx * dx + dy * dy > rad * rad) continue; const xx = px + dx, yy = py + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; h[j] = Math.max(0, h[j] - .035); det[j] = 1; }
    }
  } else if (grain === 'crackle') {
    const cc = mk(W, H), cx2 = cc.getContext('2d', { willReadFrequently: true }); cx2.strokeStyle = '#fff'; cx2.lineWidth = Math.max(1, 1.3 * res);
    for (let k = 0; k < 46; k++) { let px = r() * W, py = r() * H, a = r() * 6.28; cx2.beginPath(); cx2.moveTo(px, py); for (let s = 0, n = 12 + r() * 40; s < n; s++) { a += (r() - .5) * 1.1; px += Math.cos(a) * 6 * res; py += Math.sin(a) * 6 * res; cx2.lineTo(px, py); } cx2.stroke(); }
    const cr = chan(cc); for (let i = 0; i < N; i++) if (cr[i] > .3) { det[i] = 2; h[i] = Math.max(0, h[i] - .02 * cr[i]); }
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
    if (m.gold && h[i] > .25 && hi[i] > .58) col = col.map((c0, q) => lerp(c0, [214, 168, 62][q], .78));
    if (det[i] === 1) col = col.map(c0 => c0 * .55); else if (det[i] === 2) col = col.map(c0 => c0 * .52);
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
  const body = new THREE.Mesh(bg, bodyMat); body.userData.part = 'body'; grp.add(body);
  const topY = (.5 - .11) * 1.25, mid = outlinePts(m.shape).filter(([, y]) => Math.abs(y - .55) < .08);
  grp.userData = { shape: m.shape, thick, D: coin ? .03 : .045, topY, edgeX: Math.max(...mid.map(([x]) => x)) - .5 + bev.s * .6, resin: spec.resin === 'yes' };
  const D = coin ? .03 : .045, seg = Math.round(190 * res);
  const tex = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  for (const side of ['front', 'back']) {
    const f = makeFace(m, spec, cond, seed, res, side, D);
    const mm = new THREE.MeshStandardMaterial({ map: tex(f.color, 1), normalMap: tex(f.normal), displacementMap: tex(f.disp), displacementScale: D, alphaMap: tex(f.alpha), alphaTest: .5, roughness: mat.rough, metalness: mat.metal });
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.25, seg, Math.round(seg * 1.25)), mm);
    pm.position.z = (side === 'front' ? 1 : -1) * (thick / 2 + .0008);
    if (side === 'back') pm.rotation.y = Math.PI;
    pm.userData.part = side; grp.add(pm);
  }
  if (coin) {
    const lm = new THREE.MeshStandardMaterial({ map: sideTex(m.mat), metalness: mat.metal, roughness: mat.rough + .08 });
    if (spec.loop === 'weld') {
      const t = new THREE.Mesh(new THREE.TorusGeometry(.065, .016, 14, 40), lm); t.position.y = topY + .075; t.userData.part = 'loop'; grp.add(t);
      const w = new THREE.Mesh(new THREE.SphereGeometry(.03, 16, 12), lm); w.scale.set(1.4, .8, .9); w.position.y = topY + .006; w.userData.part = 'loop'; grp.add(w);
    } else {
      const s = new THREE.Shape(); s.absarc(0, 0, .085, 0, Math.PI * 2); const hp = new THREE.Path(); hp.absarc(0, 0, .042, 0, Math.PI * 2, true); s.holes.push(hp);
      const lg = new THREE.ExtrudeGeometry(s, { depth: thick * .8, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 1, curveSegments: 24 });
      lg.translate(0, 0, -thick * .4); const lmsh = new THREE.Mesh(lg, lm); lmsh.position.y = topY + .055; lmsh.userData.part = 'loop'; grp.add(lmsh);
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
  sc.userData.lights = [sc.children[0], key, fill, rim].map(l => ({ l, c: l.color.clone(), i: l.intensity }));
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
let tap0 = null;
canvas.addEventListener('pointerdown', e => {
  if (!ptrs.size) tap0 = { x: e.clientX, y: e.clientY, max: 0, multi: false }; else if (tap0) tap0.multi = true;
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); V.drag = true; V.vx = V.vy = 0; V.reset = null; V.pan = e.button === 2 || e.shiftKey; if (ptrs.size === 2) pinch0 = pinchState(); });
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (tap0) tap0.max = Math.max(tap0.max, Math.hypot(e.clientX - tap0.x, e.clientY - tap0.y));
  if (ptrs.size === 1) { if (V.pan) panBy(dx, dy); else { const k = .009 * Math.max(.45, V.zoom); rotBy(dx * k, dy * k); V.vx = dx * k; V.vy = dy * k; } }
  else if (ptrs.size === 2 && pinch0) { const s = pinchState(); V.zt = clamp(V.zt * pinch0.d / s.d, zMin(), 1.6); panBy(s.x - pinch0.x, s.y - pinch0.y); pinch0 = s; }
});
const ptrUp = e => {
  if (e.type === 'pointerup' && tap0 && !tap0.multi && ptrs.size === 1 && ptrs.has(e.pointerId) && tap0.max < 6) onTap(e.clientX, e.clientY);
  ptrs.delete(e.pointerId); if (!ptrs.size) tap0 = null; if (ptrs.size < 2) pinch0 = null; if (!ptrs.size) V.drag = false; };
canvas.addEventListener('pointerup', ptrUp); canvas.addEventListener('pointercancel', ptrUp);
canvas.addEventListener('wheel', e => { e.preventDefault(); V.zt = clamp(V.zt * Math.exp(e.deltaY * .0012), zMin(), 1.6); }, { passive: false });
canvas.addEventListener('dblclick', () => resetView());
canvas.addEventListener('contextmenu', e => e.preventDefault());
function resetView() { V.reset = new THREE.Quaternion(); V.zt = 1; V.vx = V.vy = 0; }
function flip() { sfx('flip'); V.spin = Math.PI; V.vx = V.vy = 0; V.reset = null; }
const zMin = () => S.tools.loupe ? .1 : .2;
function toggleLoupe() { V.zt = V.zt > .6 ? (S.tools.loupe ? .16 : .32) : 1; if (V.zt === 1) { V.px = V.py = 0; } }
let cur = null;
// ไฟ UV: ฉากมืด ไฟม่วง; เนื้อเรซิ่น (spec.resin === 'yes') เรืองแสงฟ้าอมเขียวผ่าน emissive
function applyUV() {
  const on = !!(V.uv && S.tools.uv);
  for (const { l, c, i } of scene.userData.lights) { if (on) l.color.set(0x7b3cff); else l.color.copy(c); l.intensity = on ? i * .35 : i; }
  scene.environmentIntensity = on ? .05 : .55; stage.classList.toggle('uv', on);
  if (cur) cur.traverse(o => {
    if (!o.isMesh || !o.userData.part) return;
    const glow = on && cur.userData.resin, mt = o.material, em = glow ? mt.map : null;
    mt.emissive.set(glow ? 0x3dffd2 : 0x000000); mt.emissiveIntensity = glow ? 1.1 : 1;
    if (mt.emissiveMap !== em) { mt.emissiveMap = em; mt.needsUpdate = true; }
  });
}
function toggleUV() { V.uv = !V.uv; applyUV(); renderActs(); }
function showAmulet(m, spec, cond, seed) {
  clearAmulet();
  cur = buildAmulet(m, spec, cond, seed, 1); holder.add(cur); applyUV();
  holder.quaternion.identity(); rotBy(-.9, .12); V.vx = .03; V.vy = -.002; V.zt = 1; V.zoom = 1.25; V.px = V.py = 0; V.reset = null; V.spin = 0;
}
function clearAmulet() { if (cur) { holder.remove(cur); disposeGroup(cur); cur = null; } }
const RC = new THREE.Raycaster(), NDC = new THREE.Vector2();
function inPoly(x, y, P) { let o = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) o = !o; } return o; }
// ยิง ray จากจุดที่แตะไปที่องค์พระ คืนส่วนที่โดน (front/back พร้อมพิกัด canvas, body, loop)
function pickPart(cx, cy) {
  if (!cur) return null;
  const rc = canvas.getBoundingClientRect(); NDC.set((cx - rc.left) / rc.width * 2 - 1, -(cy - rc.top) / rc.height * 2 + 1);
  holder.updateMatrixWorld(); RC.setFromCamera(NDC, cam);
  for (const h of RC.intersectObjects(cur.children, true)) {
    const part = h.object.userData.part; if (!part) continue;
    if (part === 'front' || part === 'back') { if (!h.uv || !inPoly(h.uv.x, 1 - h.uv.y, outlinePts(cur.userData.shape))) continue; return { part, px: h.uv.x * TW, py: (1 - h.uv.y) * TH }; }
    return { part };
  }
  return null;
}
// แปลงพิกัดบนหน้าพระ (canvas TW x TH) เป็นโซนของจุดสังเกต โดยเทียบกับ FIG ของพิมพ์
function frontZone(shape, px, py) {
  const { cx, by, s } = FIG[shape], dx = Math.abs(px - cx);
  if (shape === 'pidta') return dx < s * .3 && py > by - s * 1.06 && py < by - s * .62 ? 'palm' : null;
  if (shape === 'arch' && py < .88 * TH && inset(outlinePts('arch').slice(2), .85, .5, .56).some(([a, b]) => Math.hypot(a * TW - px, b * TH - py) < 26)) return 'dots';
  if (dx < s * .11 && py < by - s * .74 && py > by - s * 1.12) return 'flame';
  if (dx < s * .56 && py >= by - s * .04 && py < by + s * .32) return 'base';
  if (dx < s * .36 && py > by - s * .52 && py < by - s * .04 && !(dx < s * .1 && py < by - s * .24)) return 'hand';
  return null;
}
const ZONE_KEYS = { base: ['petals', 'tiers'], body: ['edge', 'thick'], back: ['back', 'code'] };
const shortLabel = k => TELLS[k].label.replace(/\s*\(.*\)/, '');
// ตำแหน่ง (local) ของจุดสังเกตบนองค์พระ สำหรับไฮไลต์
function keyPos(k) {
  const u = cur.userData, f = FIG[u.shape], z = u.thick / 2 + u.D + .006;
  const c2l = (px, py, sgn = 1) => [new THREE.Vector3(px / TW - .5, (.5 - py / TH) * 1.25, sgn * z), sgn < 0 ? Math.PI : 0];
  switch (k) {
    case 'flame': return c2l(f.cx, f.by - f.s * .9);
    case 'hand': return c2l(f.cx - f.s * .24, f.by - f.s * .3);
    case 'petals': case 'tiers': return c2l(f.cx, f.by + f.s * .1);
    case 'dots': return c2l(TW / 2, TH * .13);
    case 'palm': return c2l(f.cx, f.by - f.s * .85);
    case 'back': return c2l(TW / 2, TH * .53, -1);
    case 'code': return c2l(TW / 2, TH * .84, -1);
    case 'edge': case 'thick': return [new THREE.Vector3(u.edgeX + .01, 0, 0), Math.PI / 2];
    case 'loop': return [new THREE.Vector3(0, u.topY + .075, 0), 0];
    default: return c2l(TW / 2, TH * .55);
  }
}
const HL = [];
function highlight(k, ms = 1000) {
  if (!cur) return;
  const [pos, ry] = keyPos(k), big = ['back', 'grain', 'resin', 'weight'].includes(k), r0 = big ? .2 : .085;
  const mk2 = (geo, op) => { const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: op, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); o.renderOrder = 10; o.userData.op = op; return o; };
  const mesh = new THREE.Group(); mesh.add(mk2(new THREE.RingGeometry(r0, r0 + .03, 48), 1), mk2(new THREE.CircleGeometry(r0, 48), .22));
  mesh.position.copy(pos); mesh.rotation.y = ry; cur.add(mesh);
  HL.push({ mesh, grp: cur, t0: performance.now(), ms });
}
function tickHL() {
  const now = performance.now();
  for (let i = HL.length - 1; i >= 0; i--) {
    const h = HL[i], t = (now - h.t0) / h.ms;
    if (t >= 1 || h.grp !== cur) { h.grp.remove(h.mesh); h.mesh.children.forEach(o => { o.geometry.dispose(); o.material.dispose(); }); HL.splice(i, 1); continue; }
    h.mesh.scale.setScalar(1 + .15 * Math.sin(now / 90)); h.mesh.children.forEach(o => o.material.opacity = o.userData.op * (t < .75 ? 1 : (1 - t) * 4));
  }
}
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
  tickHL(); R.render(scene, cam);
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
const PVA = new Map();
function fillThumbs(root) {
  root.querySelectorAll('[data-thumb]').forEach(el => {
    const [kind, id] = el.dataset.thumb.split(':');
    if (kind === 'pv') { const a = PVA.get(id); if (a) thumbLater('pv:' + id, [a[0], a[1], 100, 4242, ['front', 'back']], urls => { el.querySelectorAll('img').forEach((im, i) => im.src = urls[i]); }); return; }
    if (kind === 'm') { const m = modelById(id); thumbLater('m:' + id, [m, m.spec, 100, 4242, ['front', 'back', 'side']], urls => { el.querySelectorAll('img').forEach((im, i) => im.src = urls[i]); }); }
    else { const it = S.inv.find(i => String(i.id) === id); if (it) thumbLater('i:' + id, [modelById(it.modelId), it.spec, it.cond, it.seed, ['front']], urls => { el.src = urls[0]; }); }
  });
}

/* ================= sound (Web Audio, synthesized, no files) ================= */
let AC = null, OUTG = null;
function audio() {
  if (S && S.mute) return null;
  try {
    if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); OUTG = AC.createGain(); OUTG.gain.value = .5; OUTG.connect(AC.destination); }
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { return null; }
  return AC;
}
function tone(a, t, f, dur, { type = 'sine', vol = .2, f2 = 0, att = .006 } = {}) {
  const o = a.createOscillator(), gn = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + att); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(gn).connect(OUTG); o.start(t); o.stop(t + dur + .05);
}
function bell(a, t, f, dur, vol) { [[1, 1], [2.76, .45], [5.4, .22], [8.9, .1]].forEach(([k, v]) => tone(a, t, f * k, dur / k ** .4, { vol: vol * v })); }
function whoosh(a, t, dur, f0, f1, vol) {
  const n = Math.ceil(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), bp = a.createBiquadFilter(), gn = a.createGain(); src.buffer = buf;
  bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * .6);
  gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + dur * .35); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(bp).connect(gn).connect(OUTG); src.start(t); src.stop(t + dur);
}
const SFX = {
  // รับเช่า: เหรียญกระทบกันสองที + เสียงวางพระลงถาด
  buy: (a, t) => { tone(a, t, 180, .12, { type: 'triangle', vol: .25, f2: 90 }); bell(a, t + .04, 1568, .5, .14); bell(a, t + .14, 2093, .7, .12); },
  // พลิกพระ: ลมพลิก + เสียงองค์พระแตะถาด
  flip: (a, t) => { whoosh(a, t, .32, 500, 2400, .35); tone(a, t + .3, 620, .09, { type: 'triangle', vol: .16, f2: 380 }); },
  // เลื่อนระดับ: ระนาดไล่บันไดเสียงเพนทาโทนิก แล้วตีฆ้อง
  level: (a, t) => {
    [523, 587, 659, 784, 880, 1047].forEach((f, i) => { tone(a, t + i * .09, f, .32, { type: 'triangle', vol: .17 }); tone(a, t + i * .09, f * 2, .12, { vol: .05 }); });
    const g0 = t + .62; tone(a, g0, 98, 2.6, { vol: .32, f2: 94, att: .01 }); tone(a, g0, 196 * 1.01, 1.8, { vol: .12 }); tone(a, g0, 293, 1.2, { vol: .06 }); bell(a, g0, 1047, 1.4, .08);
  },
};
function sfx(name) { const a = audio(); if (!a || !SFX[name]) return; try { SFX[name](a, a.currentTime + .01); } catch (e) { /* audio unavailable */ } }

/* ================= state ================= */
const KEY = 'sianphra_v1';
function newGame() { return { v: 1, seed: Math.floor(Math.random() * 1e9), money: 60000, xp: 0, rep: 10, day: 1, inv: [], queue: [], rejected: [], batches: [], custom: [], contestDay: 0, nextId: 1, seen: false, lvlSeen: 1, stats: { bought: 0, sold: 0, fooled: 0, spotted: 0 }, tools: {}, loan: { amt: 0, day: 0 }, shareBan: 0, trust: {}, templeBan: {}, recipes: {}, kaka: false }; }
let S = null; try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
if (!S || S.v !== 1) { S = newGame(); }
S.stats.spotted = S.stats.spotted || 0; S.tools = S.tools || {};
S.loan = S.loan || { amt: 0, day: 0 }; S.shareBan = S.shareBan || 0;
// จัดสร้าง: ความไว้ใจวัด, วัดที่แบน, ตำรับที่พบ, ดินกากยายักษ์ และค่าเริ่มต้นของ batch จากเซฟเก่า (hype 30 heat 0)
function normTemple() {
  S.trust = S.trust || {}; for (const t of TEMPLES) if (S.trust[t.id] == null) S.trust[t.id] = 50;
  S.templeBan = S.templeBan || {}; S.recipes = S.recipes || {}; S.kaka = !!S.kaka;
  for (const b of S.batches) {
    const cm = S.custom.find(c => c.id === b.modelId);
    b.hype ??= 30; b.heat ??= 0; b.keep ??= 0; b.stock ??= 0; b.preorder ??= 0;
    b.base ??= cm ? cm.price : b.unit * 12; b.mp ??= b.base; b.hist ??= b.open ? [Math.round(b.mp)] : [];
  }
}
normTemple();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
const lvl = () => { let l = 1; LEVELS.forEach((L, i) => { if (S.xp >= L.xp) l = i + 1; }); return l; };
const modelById = id => MODELS.find(m => m.id === id) || S.custom.find(m => m.id === id);
const allModels = () => MODELS.concat(S.custom.filter(c => c.ready));
const syncPrice = b => { const cm = modelById(b.modelId); if (cm) cm.price = Math.round(b.mp); };
const cf = c => .35 + .65 * Math.pow(clamp((c - 60) / 40, 0, 1), 1.4);
function gainXP(n) { S.xp += Math.max(0, Math.round(n)); }

const HIDDEN = Object.keys(TELLS).filter(k => TELLS[k].hidden);
const specKeys = m => Object.keys(m.spec).concat(HIDDEN);
const sv = (spec, k) => spec[k] ?? TELLS[k].def;
const wrongKeys = (spec, m) => specKeys(m).filter(k => sv(spec, k) !== sv(m.spec, k));
// น้ำหนักต่อองค์ (กรัม): คำนวณจาก seed ขององค์ จึงไม่ต้องเซฟเพิ่ม
function gramsOf(o) {
  const m = modelById(o.modelId), r = rng((o.seed >>> 0) + 4242), w = sv(o.spec, 'weight');
  const f = w === 'light' ? 1 - (.12 + r() * .13) : w === 'heavy' ? 1 + (.12 + r() * .13) : 1 + (r() * 2 - 1) * .03;
  return Math.round(mWeight(m) * f * 10) / 10;
}
function mutate(spec, n, r) {
  const s = { ...spec }, ks = Object.keys(s).map(k => [k, r()]).sort((a, b) => a[1] - b[1]).map(a => a[0]).slice(0, n);
  for (const k of ks) {
    const T = TELLS[k];
    if (T.mut) { s[k] = T.mut(r, s[k]); continue; }
    if (T.num) { let d = (1 + Math.floor(r() * 2)) * (r() < .5 ? -1 : 1) * (k === 'dots' ? 2 : 1); let v = clamp(s[k] + d, T.num[0], T.num[1]); if (v === spec[k]) v = spec[k] + (spec[k] < T.num[1] ? 1 : -1); s[k] = v; }
    else s[k] = pick(r, T.opts.filter(o => o !== s[k]));
  }
  return s;
}
// ของเก๊รุ่นผู้เล่น: ขาด/ผิดมวลสารเสมอ และไม่มีโค้ดหรือโค้ดเพี้ยนถ้ารุ่นนั้นตอกโค้ดแล้ว
function fakeOwn(spec, r) {
  const s = mutate(spec, Math.min(1 + Math.floor(r() * 2), Object.keys(spec).length), r);
  if (spec.ingr && s.ingr === spec.ingr) s.ingr = mutIngr(r, spec.ingr);
  if (spec.code === 'stamp' && s.code === 'stamp') s.code = r() < .7 ? 'none' : 'wrong';
  return s;
}
function makeCustomer(r, L) {
  const hot = S.batches.filter(b => b.open && b.hype >= 50 && modelById(b.modelId));
  if (hot.length) {
    const b = pick(r, hot);
    if (r() < (b.coded ? .125 : .25)) {
      const m = modelById(b.modelId), genuine = r() < .25, spec = genuine ? { ...m.spec } : fakeOwn(m.spec, r), cond = Math.round(80 + r() * 20);
      const ask = round100(m.price * cf(cond) * (genuine ? .55 + r() * .6 : .45 + r() * .5));
      return { id: S.nextId++, name: pick(r, NAMES), line: pick(r, genuine ? HONEST : SLICK), modelId: m.id, genuine, spec, cond, ask, patience: 1 + Math.floor(r() * 3), seed: Math.floor(r() * 1e9) };
    }
  }
  const pool = MODELS.filter(m => m.lvl <= L), byLvl = ps => wpick(r, ps.map(p => [p, p.lvl === L ? 3 : p.lvl === L - 1 ? 2 : 1]));
  // 75% เลือกจากรุ่นที่ราคาตลาดไม่เกิน 1.2 เท่าของเงินที่มี (ไม่มีเลย = รุ่นถูกสุด), 25% สุ่มตามเลเวล
  // ใช้เลือกรุ่นอย่างเดียว ราคาที่ขอ (ask) ยังคิดจากราคาตลาดและสภาพเท่านั้น
  let m;
  if (r() < .75) { const ok = pool.filter(p => p.price <= S.money * 1.2); m = ok.length ? byLvl(ok) : pool.reduce((a, b) => b.price < a.price ? b : a); }
  else m = byLvl(pool);
  const genuine = r() < .5;
  const n = wpick(r, L <= 2 ? [[3, .6], [2, .4]] : L <= 4 ? [[3, .25], [2, .45], [1, .3]] : [[2, .45], [1, .55]]);
  // เก๊เทพ (Lv.3+): หน้าตาเหมือนองค์ครูทุกจุด ผิดแค่เนื้อเรซิ่นหรือน้ำหนัก
  const god = !genuine && L >= 3 && r() < (L >= 5 ? .3 : .15);
  const spec = genuine ? { ...m.spec } : god ? { ...m.spec, ...(r() < .5 ? { resin: 'yes' } : { weight: r() < .5 ? 'light' : 'heavy' }) } : mutate(m.spec, Math.min(n, Object.keys(m.spec).length), r);
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
const HINT = coarse ? 'ลากนิ้วเพื่อหมุน • ถ่างสองนิ้วเพื่อซูม/เลื่อน' : 'ลากเพื่อหมุน • ล้อเมาส์ซูม • Shift+ลากเลื่อน • ดับเบิลคลิกรีเซ็ต';
function loadStage() {
  let key = null, args = null;
  if (mode === 'own' && ownItem) { key = 'i' + ownItem.id; args = [modelById(ownItem.modelId), ownItem.spec, ownItem.cond, ownItem.seed]; }
  else if (mode === 'daily') { const it = DS[D.run.idx]; key = 'd' + D.run.date + ':' + D.run.idx; args = [modelById(it.modelId), it.spec, it.cond, it.seed]; }
  else if (S.queue[0]) { const c = S.queue[0]; key = 'c' + c.id; args = [modelById(c.modelId), c.spec, c.cond, c.seed]; }
  if (key === lastShown) return; lastShown = key;
  if (args) showAmulet(...args); else clearAmulet();
}
function render() {
  const L = lvl(), Lc = LEVELS[L - 1], Ln = LEVELS[L];
  $('#money').innerHTML = fmt(S.money) + (S.loan.amt ? `<small class="debt">หนี้ ${fmt(S.loan.amt)}</small>` : '');
  $('#lvname').textContent = `Lv.${L} ${Lc.name}`;
  $('#xpfill').style.width = (Ln ? clamp((S.xp - Lc.xp) / (Ln.xp - Lc.xp), 0, 1) * 100 : 100) + '%';
  $('#rep').innerHTML = `${S.rep}<small>ชื่อเสียง</small>`;
  $('#day').innerHTML = `${S.day}<small>วันที่</small>`;
  renderCard(); renderActs(); renderTabs(); loadStage(); renderSpotBar();
  $('#hint').textContent = spotting() ? 'แตะ = ชี้จุดที่ผิด • ลาก = หมุน' : HINT;
  const q = $('#qinfo'); q.innerHTML = '';
  if (mode === 'daily') q.innerHTML = `<span class="badge gold" id="dtimer">⏱ ${fmtTime(dElapsed())}</span>`;
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
function specFacts(m, o) { return `<span>${esc(MATS[m.mat].name)}</span>` + (S.tools.scale && o ? `<span>ตาชั่ง <b>${gramsOf(o).toFixed(1)} ก.</b></span>` : ''); }
function renderCard() {
  const el = $('#card');
  if (mode === 'daily') {
    const R0 = D.run, it = DS[R0.idx], m = modelById(it.modelId), ok = R0.ans[R0.idx];
    const marks = R0.ans.map(a => a ? '🟩' : '🟥').join('') + '⬜'.repeat(5 - R0.ans.length);
    let line = 'ส่องให้ดีแล้วตัดสิน: แท้ หรือ เก๊?';
    if (R0.rev) {
      const w = it.genuine ? [] : wrongKeys(it.spec, m);
      line = `${ok ? '✔ ถูกต้อง!' : '✘ ผิด!'} องค์นี้เป็น${it.genuine ? 'ของแท้' : 'ของเก๊'}` + (w.length ? ` • จุดที่ผิด: ${w.map(k => `${shortLabel(k)} องค์นี้${tellTxt(k, sv(it.spec, k))} แต่องค์ครู${tellTxt(k, sv(m.spec, k))}`).join(' • ')}` : '');
    }
    el.innerHTML = `<div class="ava">ส่อง</div><div><div class="who">ส่องพระประจำวัน #${dayNo(R0.date)} <span class="badge">องค์ที่ ${R0.idx + 1}/5</span></div><div class="line ${R0.rev ? (ok ? 'rgood' : 'rbad') : ''}">${esc(line)}</div></div>
      <div class="pname">${esc(m.name)}</div><div class="facts">${specFacts(m, it)}<span>สภาพ <b>${it.cond}/100</b></span><span class="dmarks">${marks}</span></div>`;
    return;
  }
  if (mode === 'own' && ownItem) {
    const it = ownItem, m = modelById(it.modelId);
    const st = it.pend ? '<span class="badge">รอผลตรวจ</span>' : it.cert === true ? '<span class="badge good">ใบรับรองแท้</span>' : it.cert === false ? '<span class="badge bad">ของเก๊</span>' : '<span class="badge">ยังไม่ได้ตรวจ</span>';
    const line = it.consign ? `ฝากขายโดย${esc(it.consign.owner)} • ขายได้จ่ายเจ้าของ ${fmt(it.consign.price)} • เหลือ ${it.consign.until - S.day} วัน` : it.share ? `ลงหุ้น 50% กับเซียนเพื่อน • ขายได้แบ่งคนละครึ่ง` : `รับเช่ามาเมื่อวันที่ ${it.day}`;
    el.innerHTML = `<div class="ava">ตู้</div><div><div class="who">${it.consign ? 'ของฝากขาย' : 'องค์ในตู้ของคุณ'} ${st} ${tagsOf(it)}${it.award ? ` <span class="badge gold">ติดรางวัล</span>` : ''}</div><div class="line">${line}</div></div>
      <div class="pname">${esc(m.name)}</div>
      <div class="facts">${specFacts(m, it)}<span>สภาพ <b>${it.cond}/100</b></span>${it.consign ? '' : `<span>ทุน${it.share ? 'ส่วนของคุณ' : ''} <b>${fmt(it.paid)}</b></span>`}${it.cert !== false && !it.pend ? `<span>มีคนให้เช่า <b>${fmt(offerFor(it))}</b></span>` : ''}</div>`;
    return;
  }
  const c = S.queue[0];
  if (!c) { el.innerHTML = `<div class="ava">ว่าง</div><div><div class="who">หน้าร้านว่าง</div><div class="line">วันที่ ${S.day} • ลูกค้าวันนี้มาครบแล้ว</div></div>`; return; }
  const m = modelById(c.modelId);
  el.innerHTML = `<div class="ava">${esc(c.name.replace(/^(ลุง|ป้า|เฮีย|เจ๊|พี่|น้อง|ตา|คุณ|ยาย|เสี่ย|น้า|อาจารย์)/, '').slice(0, 1))}</div>
    <div><div class="who">${esc(c.name)} <span class="badge" title="ความอดทนในการต่อราคา">อดทน ${'●'.repeat(c.patience)}${'○'.repeat(Math.max(0, 3 - c.patience))}</span></div><div class="line">“${esc(c.line)}”</div></div>
    <div class="pname">${esc(m.name)}</div>
    <div class="facts">${specFacts(m, c)}<span>สภาพ <b>${c.cond}/100</b></span><span>ราคาตลาดถ้าแท้ <b>${fmt(m.price * cf(c.cond))}</b></span><span>ขอให้เช่า <b>${fmt(c.ask)}</b></span></div>`;
}
// แถวบน = เครื่องมือส่อง, แถวล่าง = การตัดสินใจ (ไม่เกิน 4 ปุ่มต่อแถว อ่านง่ายบนจอ 360px)
const tagsOf = it => (it.consign ? `<span class="badge cons">ฝากขาย • เหลือ ${it.consign.until - S.day} วัน</span>` : '') + (it.share ? '<span class="badge shr">หุ้น 50%</span>' : '');
function toolBtns() { return `<button class="btn" data-a="book">สมุด</button><button class="btn" data-a="flip">พลิก</button><button class="btn" data-a="loupe">ส่อง</button>` + (S.tools.uv ? `<button class="btn uvb ${V.uv ? 'on' : ''}" data-a="uv" aria-pressed="${!!V.uv}">UV</button>` : ''); }
function renderActs() {
  const el = $('#act'), rows = (a, b) => `<div class="ar">${a}</div>` + (b ? `<div class="ar">${b}</div>` : '');
  if (mode === 'own' && ownItem) {
    const it = ownItem, fee = certFee(it);
    let row2 = `<button class="btn dim" data-a="back">กลับหน้าร้าน</button>`;
    if (it.cert === false) row2 += it.consign ? `<button class="btn no span2" data-a="scrap">คืนพระให้เจ้าของ</button>` : `<button class="btn no span2" data-a="scrap">ทิ้ง / ขายเป็นของที่ระลึก<small>${fmt(it.share ? Math.round(scrapVal(it) / 2) : scrapVal(it))}</small></button>`;
    else if (it.pend) row2 += `<button class="btn span2" disabled>รอผลตรวจถึงพรุ่งนี้</button>`;
    else row2 += (it.cert ? '' : `<button class="btn" data-a="cert">ส่งตรวจ<small>${fmt(fee)}</small></button>`) + `<button class="btn ok ${it.cert ? 'span2' : ''}" data-a="sell">ปล่อยเช่า<small>${fmt(offerFor(it))}${it.consign || it.share ? ` • ได้ ${fmt(myCut(it, offerFor(it)))}` : ''}</small></button>`;
    el.innerHTML = rows(toolBtns(), row2);
  } else if (mode === 'daily') {
    el.innerHTML = rows(toolBtns(), D.run.rev ? `<button class="btn dim" data-a="dexit">ออก</button><button class="btn ok span2" data-a="dnext">${D.run.idx >= 4 ? 'ดูผลสรุป' : 'องค์ถัดไป'}</button>`
      : `<button class="btn dim" data-a="dexit">ออก</button><button class="btn ok" data-a="dyes">แท้</button><button class="btn no" data-a="dno">เก๊</button>`);
  } else if (spotting()) {
    el.innerHTML = rows(toolBtns());
  } else if (S.queue[0]) {
    const c = S.queue[0];
    el.innerHTML = rows(toolBtns(), `<button class="btn" data-a="nego">ต่อราคา</button><button class="btn ok" data-a="buy">รับเช่า<small>${fmt(c.ask)}</small></button><button class="btn no" data-a="pass">ไม่เอา</button>`);
  } else el.innerHTML = rows(`<button class="btn" data-a="book">สมุด</button><button class="btn" data-a="inv">ตู้พระ</button><button class="btn ok" data-a="end">ปิดร้าน</button>`);
}
function renderTabs() {
  const L = lvl();
  const T = [['shop', 'หน้าร้าน'], ['inv', 'ตู้พระ', '', S.inv.length], ['contest', 'ประกวด', L < 3 ? 'Lv.3' : ''], ['temple', 'จัดสร้าง', L < 5 ? 'Lv.5' : ''], ['book', 'สมุด']];
  $('#tabs').innerHTML = T.map(([k, n, lk, ct]) => `<button class="tab ${(k === 'shop' && mode === 'shop') || (k === 'inv' && mode === 'own') ? 'on' : ''}" data-tab="${k}">${n}${lk ? `<span class="lk">ปลดล็อก ${lk}</span>` : ''}${ct ? `<span class="ct">${ct}</span>` : ''}</button>`).join('');
}

/* ================= actions ================= */
function toast(msg, kind = '') { if ([...$('#toasts').children].some(t => t.textContent === msg)) return; const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3600); }
function nextCustomer() { S.queue.shift(); render(); }
function negotiate() {
  const c = S.queue[0];
  if (c.patience <= 0) { toast(`${c.name} ไม่พอใจที่โดนต่อราคามากไป เดินออกจากร้านแล้ว`, 'bad'); S.rejected.push({ modelId: c.modelId, genuine: c.genuine }); nextCustomer(); return; }
  c.patience--;
  if (Math.random() < (c.genuine ? .35 : .12)) c.line = 'ราคานี้ต่ำสุดแล้ว ลดไม่ได้จริง ๆ' + (c.patience ? '' : ' ถ้าต่ออีกผมกลับเลยนะ');
  else { c.ask = round100(c.ask * (1 - (.06 + Math.random() * .09))); c.line = `โอเค ๆ ลดให้เหลือ ${fmt(c.ask)} ก็แล้วกัน`; }
  render();
}
function takeItem(c, extra) { S.inv.unshift({ id: c.id, modelId: c.modelId, spec: c.spec, genuine: c.genuine, cond: c.cond, seed: c.seed, paid: c.ask, ask: c.ask, cert: null, pend: 0, award: 0, day: S.day, xp: false, ...extra }); }
function buy() {
  const c = S.queue[0];
  if (S.money < c.ask) { openModal(shortHTML()); return; }
  S.money -= c.ask; S.stats.bought++; takeItem(c);
  sfx('buy'); toast(`รับเช่าแล้ว เก็บเข้าตู้พระ`, 'good'); nextCustomer();
}
/* เงินไม่พอ: ฝากขาย / เทิร์นพระ / ชวนเซียนลงหุ้น / ยืมเฮียโรงรับจำนำ */
const shareHalf = c => Math.ceil(c.ask / 200) * 100;
const loanRoom = () => Math.max(0, S.rep * 5000 - S.loan.amt);
const loanNeed = c => Math.ceil((c.ask - S.money) / 100) * 100;
const turnVal = it => round100(offerFor(it) * .85);
const turnItems = () => S.inv.filter(it => it.cert !== false && !it.consign && !it.share && !it.pend);
const loanLeftDays = () => S.loan.day + 10 - S.day;
function optBtn(id, title, desc, why) { return `<button class="btn opt" data-short="${id}" ${why ? 'disabled' : ''}><b>${title}</b><small>${why ? 'ใช้ไม่ได้: ' + esc(why) : esc(desc)}</small></button>`; }
function shortHTML() {
  const c = S.queue[0], L = lvl(), half = shareHalf(c), need = loanNeed(c), tv = turnItems();
  return `<h2>เงินไม่พอ จะทำยังไงดี?</h2><p>${esc(c.name)}ขอให้เช่า <b>${fmt(c.ask)}</b> • คุณมี ${fmt(S.money)} • ขาดอีก <b>${fmt(c.ask - S.money)}</b></p><div class="opts">` +
    optBtn('consign', 'ก. รับฝากขาย', `ไม่ต้องจ่ายเงิน ขายได้แล้วจ่ายเจ้าของ ${fmt(c.ask)} ส่วนเกินเป็นกำไรคุณ (อย่างน้อย 10% ของราคาขาย) ถ้า 5 วันขายไม่ออกเจ้าของมารับคืน`, c.noConsign ? `${c.name}ไม่ยอมฝากขาย อยากได้เงินสด` : '') +
    optBtn('turn', 'ข. เทิร์นพระ', 'เอาพระในตู้ไปแลก คิดมูลค่า 85% ของราคาที่มีคนให้เช่าวันนี้ แล้วจ่ายส่วนต่างเป็นเงิน', !tv.length ? 'ไม่มีพระในตู้ที่เทิร์นได้ (ของเก๊ ของฝากขาย ของหุ้น และองค์ที่รอผลตรวจใช้ไม่ได้)' : !tv.some(it => c.ask - turnVal(it) <= S.money) ? 'มูลค่าเทิร์นรวมกับเงินที่มียังไม่พอ' : '') +
    optBtn('share', 'ค. ชวนเซียนลงหุ้น', `คุณจ่าย ${fmt(half)} เซียนเพื่อนจ่ายอีกครึ่ง ขายได้แบ่งเงินคนละครึ่ง`, L < 2 ? 'ปลดล็อกที่ Lv.2' : S.shareBan > S.day ? `เพื่อนยังไม่ไว้ใจ รอถึงวันที่ ${S.shareBan}` : S.money < half ? `ต้องมีเงินอย่างน้อย ${fmt(half)}` : '') +
    optBtn('loan', 'ง. ยืมเงินเฮียโรงรับจำนำ', `ยืม ${fmt(need)} ดอกเบี้ย 3% ต่อวัน ต้องคืนภายใน 10 วัน ไม่งั้นโดนยึดพระในตู้และเสียชื่อเสียง`, need > loanRoom() ? `วงเงินเหลือ ${fmt(loanRoom())} (ชื่อเสียง × ฿5,000)` : '') +
    `</div><div class="row"><button class="btn dim" data-close>ยกเลิก</button></div>`;
}
function turnHTML() {
  const c = S.queue[0];
  return `<h2>เลือกพระที่จะเทิร์น</h2><p>แลกกับ <b>${esc(modelById(c.modelId).name)}</b> ราคา ${fmt(c.ask)} • คุณมี ${fmt(S.money)}</p><div class="opts">` +
    turnItems().map(it => { const v = turnVal(it), need = Math.max(0, c.ask - v), why = need > S.money ? `ต้องจ่ายเพิ่ม ${fmt(need)} เงินไม่พอ` : '';
      return `<button class="btn opt tpick" data-turn="${it.id}" ${why ? 'disabled' : ''}><img data-thumb="i:${it.id}" alt=""><span><b>${esc(modelById(it.modelId).name)}</b><small>มูลค่าเทิร์น ${fmt(v)} • ${why ? 'ใช้ไม่ได้: ' + why : need ? `จ่ายเพิ่ม ${fmt(need)}` : 'ไม่ต้องจ่ายเพิ่ม (ลูกค้าไม่มีเงินทอน)'}</small></span></button>`; }).join('') +
    `</div><div class="row"><button class="btn dim" id="shortBack">ย้อนกลับ</button></div>`;
}
function shortPick(k) {
  const c = S.queue[0]; if (!c || S.money >= c.ask && k !== 'turn') { closeModal(); return; }
  if (k === 'turn') { openModal(turnHTML()); return; }
  if (k === 'consign') {
    if (c.noConsign) return;
    if (rng((c.seed >>> 0) + 77)() >= .3 + S.rep / 200) { c.noConsign = true; save(); toast(`${c.name}ไม่ยอมฝากขาย อยากได้เงินสดมากกว่า`, 'bad'); openModal(shortHTML()); return; }
    closeModal(); takeItem(c, { paid: 0, consign: { price: c.ask, until: S.day + 5, owner: c.name } });
    sfx('buy'); toast(`รับฝากขายแล้ว ขายได้จ่ายเจ้าของ ${fmt(c.ask)} ภายใน 5 วัน`, 'good'); nextCustomer(); return;
  }
  if (k === 'share') {
    const half = shareHalf(c); if (lvl() < 2 || S.shareBan > S.day || S.money < half) return;
    closeModal(); S.money -= half; S.stats.bought++; takeItem(c, { paid: half, share: true });
    sfx('buy'); toast(`ลงหุ้นกับเซียนเพื่อนแล้ว คุณจ่าย ${fmt(half)}`, 'good'); nextCustomer(); return;
  }
  if (k === 'loan') {
    const need = loanNeed(c); if (need > loanRoom()) return;
    if (!S.loan.amt) S.loan.day = S.day; S.loan.amt += need; S.money += need;
    closeModal(); toast(`ยืมเฮียมา ${fmt(need)} อย่าลืมคืนภายใน 10 วัน`); buy();
  }
}
function doTurn(id) {
  const c = S.queue[0], it = turnItems().find(x => String(x.id) === id); if (!c || !it) return;
  const v = turnVal(it), need = Math.max(0, c.ask - v), m = modelById(it.modelId); if (need > S.money) return;
  closeModal();
  if (!it.genuine && Math.random() < .7) {
    S.rep = Math.max(0, S.rep - 5); it.cert = false; it.xp = true; S.stats.fooled++;
    toast(`${c.name}ส่องแล้วจับได้ว่า ${m.name} ที่เอามาเทิร์นเป็นของเก๊! ชื่อเสียง −5 แล้วเดินออกจากร้าน`, 'bad');
    S.rejected.push({ modelId: c.modelId, genuine: c.genuine }); nextCustomer(); return;
  }
  S.money -= need; S.inv = S.inv.filter(x => x !== it); S.stats.bought++; takeItem(c);
  sfx('buy'); toast(`เทิร์น ${m.name} (${fmt(v)})${need ? ` + จ่ายเพิ่ม ${fmt(need)}` : ''} ได้พระองค์ใหม่เข้าตู้`, 'good'); nextCustomer();
}
function repay() {
  const p = Math.min(S.money, S.loan.amt); if (p <= 0) return;
  S.money -= p; S.loan.amt -= p; if (!S.loan.amt) S.loan.day = 0;
  toast(S.loan.amt ? `คืนเฮียไป ${fmt(p)} ยังเหลือหนี้ ${fmt(S.loan.amt)}` : 'ปลดหนี้เฮียหมดแล้ว!', 'good'); openModal(menuHTML()); render();
}
/* ชี้จุดเก๊: กด "ไม่เอา" แล้วให้ผู้เล่นแตะจุดที่คิดว่าผิดก่อนไปลูกค้าคนถัดไป (ชี้ได้ครั้งเดียวต่อองค์) */
let spot = null;
const spotting = () => !!(spot && mode === 'shop' && S.queue[0] && S.queue[0].id === spot.cid);
function pass() {
  const c = S.queue[0]; if (!c || spot?.busy) return;
  if (c.pointed) { finishPass(c); return; }
  spot = { cid: c.id, busy: false }; render();
}
function finishPass(c) {
  spot = null; if (S.queue[0] !== c) { render(); return; }
  S.rejected.push({ modelId: c.modelId, genuine: c.genuine, pointed: c.pointed || null, hit: !!c.hit, wrong: c.genuine ? [] : wrongKeys(c.spec, modelById(c.modelId)) });
  nextCustomer();
}
function onTap(x, y) {
  if (!spotting() || spot.busy) return;
  const hit = pickPart(x, y), m = modelById(S.queue[0].modelId);
  if (!hit) { toast('แตะให้โดนองค์พระ หรือกด "เลือกจากรายการ"'); return; }
  const zone = hit.part === 'front' ? frontZone(m.shape, hit.px, hit.py) : hit.part;
  const keys = (ZONE_KEYS[zone] || [zone]).filter(k => k && k in m.spec);
  if (!keys.length) { toast('ตรงนี้ไม่ใช่จุดสังเกต ลองแตะจุดอื่น'); return; }
  commitSpot(keys);
}
function commitSpot(keys) {
  const c = S.queue[0]; if (!spotting() || spot.busy || c.pointed) return;
  const hitK = c.genuine ? null : keys.find(k => wrongKeys(c.spec, modelById(c.modelId)).includes(k));
  c.pointed = keys;
  if (hitK) {
    c.hit = true; S.stats.spotted++; gainXP(20); save(); spot.busy = true; renderActs(); renderSpotBar();
    toast(`เซียนตาถึง! (${shortLabel(hitK)}) +20 XP`, 'good'); highlight(hitK, 1000);
    setTimeout(() => finishPass(c), 1050);
  } else { save(); toast(`จดไว้แล้วว่าคุณชี้ "${keys.map(shortLabel).join(' / ')}" รอเฉลยตอนสรุปวัน`); finishPass(c); }
}
function spotListHTML() {
  const m = modelById(S.queue[0].modelId);
  return `<h2>จุดไหนที่ผิด?</h2><p class="note">เลือกได้ครั้งเดียว เทียบกับองค์ครูใน "สมุด" ให้แน่ใจก่อน</p><div class="pickl">${specKeys(m).map(k => `<button class="btn" data-spotk="${k}">${esc(TELLS[k].label)}</button>`).join('')}</div>
    <div class="row"><button class="btn dim" data-close>กลับไปส่องต่อ</button></div>`;
}
function renderSpotBar() {
  const el = $('#spotbar'), on = spotting(); el.hidden = !on; $('#qinfo').hidden = on;
  if (on) el.innerHTML = spot.busy ? `<p>เซียนตาถึง!</p>` : `<p>แตะจุดที่คิดว่าผิดบนองค์พระ</p><div class="sb"><button class="btn dim" id="spotSkip">ข้าม</button><button class="btn" id="spotList">เลือกจากรายการ</button></div>`;
}
const certFee = it => round100(Math.max(500, modelById(it.modelId).price * .03));
const scrapVal = it => round100(modelById(it.modelId).price * .02);
function offerFor(it) { const m = modelById(it.modelId), r = rng(hash(it.id + ':' + S.day)); return round100(m.price * cf(it.cond) * (it.cert ? 1.15 : 1) * (1 + .1 * it.award) * (1 + S.rep / 300) * (.9 + r() * .18)); }
function revealXP(it) { const m = modelById(it.modelId); it.xp = true; return 15 + clamp(Math.round((m.price * cf(it.cond) - (it.ask ?? it.paid)) / (m.price * .05)), 0, 20) * 2; }
// ส่วนที่เป็นของผู้เล่นเมื่อขายได้ p: ฝากขาย = ส่วนเกินราคาเจ้าของ (ขั้นต่ำ 10%), หุ้น = ครึ่งหนึ่ง
function myCut(it, p) { return it.consign ? Math.max(p - it.consign.price, round100(p * .1)) : it.share ? Math.round(p / 2) : p; }
// ของหุ้นถูกเปิดโปงว่าเก๊: เพื่อนไม่พอใจ ชื่อเสียง −3 และงดชวนลงหุ้น 3 วัน
function shareFake(it) { if (!it.share || it.shareHit) return ''; it.shareHit = true; S.rep = Math.max(0, S.rep - 3); S.shareBan = S.day + 3; return ' • เซียนหุ้นส่วนไม่พอใจ ชื่อเสียง −3 และงดชวนลงหุ้น 3 วัน'; }
function certify(it) { const fee = certFee(it); if (S.money < fee) { toast('เงินไม่พอจ่ายค่าตรวจ', 'bad'); return; } S.money -= fee; it.pend = S.day; toast('ส่งเข้าสมาคมตรวจพระแล้ว ผลออกวันพรุ่งนี้'); render(); }
function sell(it) {
  if (!it.genuine) {
    it.xp = true; gainXP(3); S.stats.fooled++;
    if (it.consign) { S.rep = Math.max(0, S.rep - 8); S.inv = S.inv.filter(x => x !== it); toast(`เซียนผู้ซื้อตรวจพบว่าเป็นพระเก๊! ชื่อเสียง −8 และต้องคืนพระให้${it.consign.owner}`, 'bad'); toShop(); return; }
    S.rep = Math.max(0, S.rep - 6); it.cert = false; toast('เซียนผู้ซื้อตรวจพบว่าเป็นพระเก๊! ชื่อเสียง −6' + shareFake(it), 'bad'); render(); return;
  }
  const p = offerFor(it), mine = myCut(it, p), gain = mine - it.paid; S.money += mine; S.inv = S.inv.filter(x => x !== it); S.rep = Math.min(100, S.rep + 1); S.stats.sold++;
  gainXP((it.xp ? 0 : revealXP(it)) + 5 + clamp(gain / 1000, 0, 40));
  const split = it.consign ? ` • จ่ายเจ้าของ ${fmt(p - mine)}` : it.share ? ` • แบ่งเพื่อน ${fmt(p - mine)}` : '';
  toast(`ปล่อยเช่าได้ ${fmt(p)}${split} • ${gain >= 0 ? 'กำไร' : 'ขาดทุน'} ${fmt(Math.abs(gain))}`, gain >= 0 ? 'good' : 'bad');
  toShop();
}
function scrap(it) {
  S.inv = S.inv.filter(x => x !== it);
  if (it.consign) { toast(`คืนพระให้${it.consign.owner}แล้ว`); toShop(); return; }
  const v = it.share ? Math.round(scrapVal(it) / 2) : scrapVal(it); S.money += v; toast(`ขายเป็นของที่ระลึก ได้ ${fmt(v)}${it.share ? ' (แบ่งเพื่อนครึ่งหนึ่ง)' : ''}`); toShop();
}
function toShop() { pauseDaily(); mode = 'shop'; ownItem = null; render(); }
function openOwn(it) { pauseDaily(); mode = 'own'; ownItem = it; closeModal(); render(); }

function endDay() {
  const lines = [], L0 = lvl();
  for (const it of S.inv) if (it.pend) {
    it.pend = 0; it.cert = it.genuine; const m = modelById(it.modelId);
    if (it.genuine) { const x = it.xp ? 0 : revealXP(it); gainXP(x); lines.push(['good', `ผลตรวจ ${m.name}: แท้ ได้ใบรับรอง${x ? ` (+${x} XP)` : ''}`]); }
    else { it.xp = true; gainXP(3); S.stats.fooled++; lines.push(['bad', `ผลตรวจ ${m.name}: ไม่แท้${it.consign ? ' (ของฝากขาย คืนเจ้าของได้)' : ` เสียเงินไป ${fmt(it.paid)}`}${shareFake(it)}`]); }
  }
  if (S.rejected.length) {
    const fakes = S.rejected.filter(x => !x.genuine).length, real = S.rejected.length - fakes; gainXP(fakes * 12);
    lines.push([fakes >= real ? 'good' : '', `องค์ที่คุณไม่รับเช่า ${S.rejected.length} องค์: เป็นของเก๊ ${fakes} องค์ (+${fakes * 12} XP)${real ? ` • เป็นของแท้ที่พลาดไป ${real} องค์` : ''}`]);
    const hits = S.rejected.filter(x => x.hit).length; if (hits) lines.push(['good', `ชี้จุดเก๊ถูก ${hits} องค์`]);
    for (const x of S.rejected) {
      if (!x.pointed || x.hit) continue; const nm = modelById(x.modelId).name, pt = x.pointed.map(shortLabel).join(' / ');
      lines.push(['bad', x.genuine ? `${nm}: คุณชี้ว่า "${pt}" ผิด แต่องค์นี้เป็นของแท้` : `${nm}: คุณชี้ "${pt}" แต่จุดที่ผิดจริงคือ ${(x.wrong || []).map(k => `"${shortLabel(k)}"`).join(', ')}`]);
    }
  }
  S.rejected = [];
  for (const b of S.batches) dayBatch(b, lines);
  for (const t of TEMPLES) if (S.batches.some(b => b.temple === t.id)) {
    const tr = tTrust(t.id);
    if (tr < 10) lines.push(['bad', `${t.name}: เจ้าอาวาสหมดความไว้ใจ จะไม่รับจัดสร้างพระกับคุณ (ไว้ใจ ${tr})`]);
    else if (tr < 30) lines.push(['bad', `เจ้าอาวาส${t.name}เตือน: "ทำพระให้ซื่อตรง อย่าปั่นราคา ไม่อย่างนั้นวัดจะไม่ร่วมงานด้วย" (ไว้ใจ ${tr})`]);
  }
  for (const it of S.inv.filter(x => x.consign && S.day >= x.consign.until)) {
    S.inv = S.inv.filter(x => x !== it); lines.push(['', `${it.consign.owner}มารับ ${modelById(it.modelId).name} คืน (ฝากขายครบ 5 วันแล้วยังขายไม่ออก)`]);
  }
  const rent = 200 + 300 * L0; S.money -= rent; lines.push(['', `ค่าเช่าแผงพระ ${fmt(-rent)}`]);
  if (S.loan.amt > 0) {
    const fee = Math.round(S.loan.amt * .03); S.loan.amt += fee;
    if (S.day >= S.loan.day + 10) {
      // ครบ 10 วันยังไม่คืน: ยึดพระที่แพงที่สุดไล่ลงมาจนมูลค่าครอบหนี้ ที่ขาดหักจากเงินสด
      const val = it => it.cert === false ? scrapVal(it) : offerFor(it), took = [];
      let cover = 0; for (const it of S.inv.filter(x => !x.consign).sort((a, b) => val(b) - val(a))) { if (cover >= S.loan.amt) break; cover += val(it); took.push(it); }
      S.inv = S.inv.filter(x => !took.includes(x)); if (cover < S.loan.amt) S.money -= S.loan.amt - cover;
      S.rep = Math.max(0, S.rep - 10);
      lines.push(['bad', `เฮียโรงรับจำนำมาทวงหนี้ ${fmt(S.loan.amt)}! ยึดพระไป ${took.length} องค์${took.length ? ` (${took.map(x => modelById(x.modelId).name).join(', ')})` : ''}${cover < S.loan.amt ? ` และหักเงินสด ${fmt(S.loan.amt - cover)}` : ''} • ชื่อเสียง −10`]);
      S.loan = { amt: 0, day: 0 };
    } else lines.push(['bad', `ดอกเบี้ยเฮีย 3% ${fmt(-fee)} • หนี้คงเหลือ ${fmt(S.loan.amt)} • เหลือ ${S.loan.day + 10 - S.day} วันก่อนโดนยึด`]);
  }
  S.day++; genQueue(); mode = 'shop'; ownItem = null;
  const lv = levelHTML();
  openModal(`<h2>สรุปวันที่ ${S.day - 1}</h2><ul class="log">${lines.map(([k, t]) => `<li class="${k}">${esc(t)}</li>`).join('')}</ul>${lv}
    <p class="note">วันที่ ${S.day}: มีลูกค้ารอ ${S.queue.length} คน${lvl() >= 3 && S.day % 3 === 0 ? ' • วันนี้มีงานประกวดพระ' : ''}</p><div class="row"><button class="btn ok" data-close>เปิดร้าน</button></div>`);
  render();
}
// สรุปรายวันของแต่ละรุ่นที่จัดสร้าง: เปิดบูชา, เหตุการณ์, ยอดบูชา (คูณกระแส), หมด/รุ่นสอง, ฟองสบู่, โดนแฉ, กระแส/heat ลด, ราคาตลาด
function dayBatch(b, lines) {
  const cm = modelById(b.modelId), t = tObj(b.temple); if (!cm || !t) return;
  const nm = cm.name, avail = b.qty - b.keep;
  if (!b.open) {
    if (S.day + 1 < b.ready) { lines.push(['', `${nm}: กำลังจัดสร้าง อีก ${b.ready - S.day - 1} วัน`]); return; }
    b.open = true; cm.ready = true; cm.lvl = Math.min(lvl(), 6); b.hist = [Math.round(b.mp)]; syncPrice(b);
    S.inv.unshift({ id: S.nextId++, modelId: cm.id, spec: { ...cm.spec }, genuine: true, cond: 100, seed: Math.floor(Math.random() * 1e9), paid: 0, cert: true, pend: 0, award: 0, day: S.day + 1, xp: true });
    lines.push(['gold', `${nm} จัดสร้างเสร็จแล้ว! เปิดให้บูชาตั้งแต่วันพรุ่งนี้ วัดมอบองค์ต้นแบบให้คุณ 1 องค์${b.keep ? ` และส่งสต็อก ${b.keep} องค์ให้คุณเก็บไว้` : ''} (กระแสเริ่มต้น ${b.hype})`]);
    if (b.preorder) { const n = Math.min(b.preorder, avail); b.sold += n; const rev = n * b.unit; S.money += Math.round(rev * .7); lines.push(['good', `${nm}: ยอดจองล่วงหน้ารุ่นสอง ${n} องค์ รายได้ ${fmt(rev * .7)}`]); }
    return;
  }
  const r = rng(hash(b.id + ':' + S.day));
  if (!b.done) {
    if (r() < .1) { b.hype = Math.min(100, b.hype + 25); lines.push(['gold', `ข่าวดี! ${pick(r, EVENTS).replace('{n}', nm)} (กระแส +25)`]); }
    const hoard = b.hoard === S.day;
    let n = Math.min(avail - b.sold, Math.round(b.qty * (.06 + r() * .09) * (.7 + t.fame * .35) * (1 + S.rep / 120) * (.5 + b.hype / 100)));
    if (hoard) n = Math.floor(n / 2);
    b.sold += n; const rev = n * b.unit; S.money += Math.round(rev * .7); gainXP(n / 15);
    if (n > 0) S.trust[t.id] = clamp(tTrust(t.id) + 1, 0, 100);
    lines.push(['good', `${nm}: บูชาออกไป ${n} องค์${hoard ? ' (กั๊กของไว้ครึ่งหนึ่ง)' : ''} รายได้ ${fmt(rev * .7)} (ถวายวัด ${fmt(rev * .3)})`]);
    if (b.sold >= avail) {
      b.done = true; S.rep = Math.min(100, S.rep + 5); gainXP(100); b.base = Math.round(b.base * 1.6); b.mp = Math.round(b.mp * 1.3);
      lines.push(['gold', `${nm} หมดเกลี้ยง! ชื่อเสียง +5 และราคาสะสมของรุ่นนี้พุ่งขึ้น`]);
      if (b.hype >= 60 && !b.seqOK) { b.seqOK = true; lines.push(['gold', `${nm} หมดตอนกระแสกำลังแรง ปลดล็อก "รุ่นสอง" (เริ่มกระแส 40 พร้อมยอดจองล่วงหน้า) ที่หน้าจัดสร้าง`]); }
    }
  }
  b.hot = b.hype >= 80 ? (b.hot || 0) + 1 : 0;
  if (b.hot >= 3 && r() < .2) { b.mp = Math.round(b.mp * .6); b.hype = Math.max(0, b.hype - 30); b.hot = 0; lines.push(['bad', `ฟองสบู่แตก! เซียนแห่เทขาย ${nm} ราคาตลาดร่วง 40% กระแส −30`]); }
  if (b.heat > 0 && r() < b.heat / 250) {
    const fk = ingrList(cm.spec.ingr || '').filter(x => x.fake);
    lines.push(['bad', `ข่าวฉาว! เพจ "${pick(r, PAGES)}" แฉว่า ${nm} ปั่นราคา${fk.length ? ` และใช้มวลสารเทียม (${fk.map(x => INGR[x.id].name).join(', ')})` : ''} • กระแสเหลือ 0 ราคาตลาด −50% ชื่อเสียง −15 • ${t.name}ไม่รับจัดสร้างกับคุณ 30 วัน`]);
    b.hype = 0; b.heat = 0; b.mp = Math.round(b.mp * .5); b.base = Math.round(b.base * .7); b.scandal = (b.scandal || 0) + 1;
    S.rep = Math.max(0, S.rep - 15); S.trust[t.id] = clamp(tTrust(t.id) - 40, 0, 100); S.templeBan[t.id] = S.day + 30;
  }
  b.hype = Math.max(0, b.hype - (b.coded ? 4 : 6)); b.heat = Math.max(0, b.heat - 3);
  const target = b.base * (.5 + b.hype / 80);
  b.mp = Math.max(10, Math.round((b.mp + (target - b.mp) * .35) * (1 + (r() - .5) * .06)));
  b.hist.push(b.mp); if (b.hist.length > 30) b.hist.shift(); syncPrice(b);
  if (!b.done || b.stock) lines.push(['', `${nm}: กระแส ${b.hype} • heat ${b.heat} • ราคาตลาด ${fmt(b.mp)}`]);
}
function levelHTML() {
  const L = lvl(); if (L <= S.lvlSeen) return '';
  let h = ''; for (let l = S.lvlSeen + 1; l <= L; l++) h += `<li class="gold">${esc(UNLOCK[l] || '')}</li>`;
  S.lvlSeen = L; save(); sfx('level');
  return `<h3>เลื่อนระดับเป็น Lv.${L} ${esc(LEVELS[L - 1].name)}!</h3><ul class="log">${h}</ul>`;
}

/* ================= daily: ส่องพระประจำวัน ================= */
// ทุกคนได้ 5 องค์ชุดเดียวกันตามวันที่เวลาไทย เซฟแยกใน DKEY ไม่แตะคิวลูกค้า/เงินในเกมหลัก
const DKEY = 'sianphra_daily_v1', LAUNCH = '2026-11-21', SITE = 'https://sasikanphae.github.io/sian-phra/', BKK = 7 * 3600e3;
let D = {}; try { D = JSON.parse(localStorage.getItem(DKEY)) || {}; } catch (e) { D = {}; }
function saveD() { try { localStorage.setItem(DKEY, JSON.stringify(D)); } catch (e) { /* storage unavailable */ } }
const bkkDate = (t = Date.now()) => new Date(t + BKK).toISOString().slice(0, 10);
const prevDate = d => new Date(Date.parse(d) - 864e5).toISOString().slice(0, 10);
const dayNo = d => Math.round((Date.parse(d) - Date.parse(LAUNCH)) / 864e5) + 1;
const msToMidnight = () => 864e5 - ((Date.now() + BKK) % 864e5);
const pad2 = n => String(n).padStart(2, '0');
const fmtTime = ms => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${pad2(t % 60)}`; };
const fmtHMS = ms => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 3600)}:${pad2(Math.floor(t / 60) % 60)}:${pad2(t % 60)}`; };
function dailySet(date) {
  const r = rng(hash('daily:' + date)), nf = r() < .5 ? 2 : 3, fk = new Set();
  while (fk.size < nf) fk.add(Math.floor(r() * 5));
  return [0, 1, 2, 3, 4].map(i => {
    const m = pick(r, MODELS), genuine = !fk.has(i), n = Math.min(1 + Math.floor(r() * 2), Object.keys(m.spec).length);
    return { modelId: m.id, genuine, spec: genuine ? { ...m.spec } : mutate(m.spec, n, r), cond: Math.round(70 + r() * 30), seed: Math.floor(r() * 1e9) };
  });
}
let DS = null, dT0 = 0;
const dElapsed = () => !D.run ? 0 : D.run.ms + (D.run.rev || !dT0 ? 0 : performance.now() - dT0);
function pauseDaily() { if (mode === 'daily' && D.run && !D.run.rev && dT0) { D.run.ms += performance.now() - dT0; dT0 = 0; saveD(); } }
function enterDaily() {
  const today = bkkDate();
  if (D.last && D.last.date === today) { openModal(dailyDoneHTML(false)); return; }
  if (!D.run || D.run.date !== today || !Array.isArray(D.run.ans)) D.run = { date: today, idx: 0, ans: [], ms: 0, rev: false };
  saveD(); DS = dailySet(today); ownItem = null; mode = 'daily'; dT0 = D.run.rev ? 0 : performance.now();
  closeModal(); render();
}
function dailyAnswer(sayGenuine) {
  const R0 = D.run; if (mode !== 'daily' || R0.rev) return;
  pauseDaily(); const it = DS[R0.idx], ok = sayGenuine === it.genuine;
  R0.ans[R0.idx] = ok; R0.rev = true; saveD(); sfx(ok ? 'buy' : 'flip');
  if (!it.genuine) wrongKeys(it.spec, modelById(it.modelId)).forEach(k => highlight(k, 2600));
  render();
}
function dailyNext() {
  const R0 = D.run; if (mode !== 'daily' || !R0.rev) return;
  R0.rev = false; R0.idx++;
  if (R0.idx < 5) { dT0 = performance.now(); saveD(); render(); return; }
  const score = R0.ans.filter(Boolean).length;
  D.streak = D.lastDate === prevDate(R0.date) ? (D.streak || 0) + 1 : 1; D.lastDate = R0.date;
  D.last = { date: R0.date, n: dayNo(R0.date), score, marks: R0.ans.map(a => a ? '🟩' : '🟥').join(''), ms: Math.round(R0.ms) };
  D.run = null; saveD(); gainXP(score * 10);
  mode = 'shop'; dT0 = 0; openModal(dailyDoneHTML(true)); render();
}
const shareText = () => `ส่องพระประจำวัน #${D.last.n} ${D.last.score}/5 ${D.last.marks} ⏱ ${fmtTime(D.last.ms)}\n${SITE}`;
function dailyDoneHTML(fresh) {
  const r = D.last;
  return `<h2>ส่องพระประจำวัน #${r.n}</h2><p class="big">${r.score}/5 <span class="dtime">⏱ ${fmtTime(r.ms)}</span></p><p class="marks">${r.marks}</p>
    <p>เล่นต่อเนื่อง <b>${D.streak || 1} วัน</b>${fresh ? ` • ได้ +${r.score * 10} XP ในเกมหลัก` : ''}</p>${fresh ? levelHTML() : ''}
    <p class="note">ชุดใหม่ในอีก <b id="cd">${fmtHMS(msToMidnight())}</b> (เที่ยงคืนเวลาไทย)</p>
    <div class="row"><button class="btn ok" id="shareBtn">คัดลอกผลไปแชร์</button><button class="btn dim" data-close>กลับหน้าร้าน</button></div>
    <textarea id="sharebox" class="sharebox" rows="3" readonly hidden></textarea>`;
}
async function shareDaily() {
  const txt = shareText();
  try { await navigator.clipboard.writeText(txt); toast('คัดลอกแล้ว ไปวางแชร์ได้เลย', 'good'); }
  catch (e) { const box = $('#sharebox'); if (!box) return; box.hidden = false; box.value = txt; box.focus(); box.select(); toast('กดค้างที่ข้อความแล้วเลือก "คัดลอก" ได้เลย'); }
}
function dailyBtnHTML() {
  const today = bkkDate(), st = D.last && D.last.date === today ? `เล่นแล้ววันนี้ ${D.last.score}/5 • ดูผล` : D.run && D.run.date === today ? `เล่นต่อ องค์ที่ ${D.run.idx + 1}/5` : `#${dayNo(today)} • 5 องค์ ชุดเดียวกันทุกคน`;
  return `<button class="btn ok dailyb" id="dailyBtn">ส่องพระประจำวัน<small>${st}</small></button>`;
}
setInterval(() => {
  const t = $('#dtimer'); if (t && mode === 'daily') t.textContent = '⏱ ' + fmtTime(dElapsed());
  const cd = $('#cd'); if (cd) cd.textContent = D.last && D.last.date !== bkkDate() ? 'พร้อมแล้ว! เปิดเมนูเพื่อเล่นชุดใหม่' : fmtHMS(msToMidnight());
}, 500);
addEventListener('pagehide', () => { pauseDaily(); if (mode === 'daily') dT0 = performance.now(); });

/* ================= modals ================= */
function openModal(html) { $('#mbody').innerHTML = html; $('#modal').hidden = false; fillThumbs($('#mbody')); $('#modal .sheet').scrollTop = 0; }
function closeModal() { $('#modal').hidden = true; if (lvl() > S.lvlSeen) render(); }
$('#mx').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

function bookHTML() {
  const L = lvl(), curId = mode === 'own' && ownItem ? ownItem.modelId : mode === 'daily' ? DS[D.run.idx].modelId : S.queue[0]?.modelId;
  const list = MODELS.concat(S.custom).slice().sort((a, b) => (b.id === curId) - (a.id === curId));
  return `<h2>สมุดองค์ครู</h2><div class="row" style="margin:0 0 8px"><button class="btn" id="toolShopBtn">ร้านอุปกรณ์เซียน</button><button class="btn" id="recipeBtn">ตำรับที่ค้นพบ</button></div><p class="note">เทียบองค์ที่กำลังส่องกับองค์ครู (ของแท้) ของเก๊จะผิดจากองค์ครูอย่างน้อย 1 จุด หมุนดูทั้งหน้า หลัง และขอบข้าง แล้วใช้ "ส่อง" ดูผิวเนื้อใกล้ ๆ</p>` +
    list.map(m => {
      if (m.lvl > L && !m.custom && m.id !== curId) return `<div class="mdl"><b>${esc(m.name)}</b> <span class="badge">ปลดล็อก Lv.${m.lvl}</span></div>`;
      return `<div class="mdl ${m.id === curId ? 'cur' : ''}"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b style="font:600 18px Kanit,sans-serif">${esc(m.name)}</b>${m.id === curId ? '<span class="badge gold">กำลังส่ององค์นี้</span>' : ''}</div>
      <div class="note">${esc(MATS[m.mat].name)} • ราคาตลาดสภาพสมบูรณ์ ${fmt(m.price)}</div>
      <div class="views" data-thumb="m:${m.id}"><figure><img alt="ด้านหน้า"><figcaption>ด้านหน้า</figcaption></figure><figure><img alt="ด้านหลัง"><figcaption>ด้านหลัง</figcaption></figure><figure><img alt="ด้านข้าง"><figcaption>ด้านข้าง</figcaption></figure></div>
      <table class="tells">${Object.entries(m.spec).map(([k, v]) => `<tr><td>${TELLS[k].label}</td><td>${esc(tellTxt(k, v))}</td></tr>`).join('')}
      <tr><td>${TELLS.weight.label}</td><td>น้ำหนักองค์ครู <b>${mWeight(m)} กรัม</b> (ของแท้คลาดเคลื่อนไม่เกิน ±3%)</td></tr>
      <tr><td>${TELLS.resin.label}</td><td>ของแท้ไม่เรืองแสงใต้ UV</td></tr></table></div>`;
    }).join('');
}
function invHTML() {
  if (!S.inv.length) return `<h2>ตู้พระ</h2><p>ตู้ยังว่างอยู่ รับเช่าพระจากลูกค้าหน้าร้านก่อนนะ</p>`;
  return `<h2>ตู้พระ (${S.inv.length} องค์)</h2><p class="note">แตะองค์พระเพื่อส่องดู ส่งตรวจ หรือปล่อยเช่า</p><div class="grid">` +
    S.inv.map(it => { const m = modelById(it.modelId);
      const st = it.pend ? '<span class="badge">รอผลตรวจ</span>' : it.cert === true ? '<span class="badge good">แท้</span>' : it.cert === false ? '<span class="badge bad">เก๊</span>' : '<span class="badge">ยังไม่ตรวจ</span>';
      return `<button class="item" data-own="${it.id}"><img class="thumb" data-thumb="i:${it.id}" alt=""><span class="nm">${esc(m.name)}</span><span class="sub">สภาพ ${it.cond} • ${it.consign ? `ราคาเจ้าของ ${fmt(it.consign.price)}` : `ทุน ${fmt(it.paid)}`}</span><span class="tags">${st}${tagsOf(it)}${it.award ? '<span class="badge gold">รางวัล</span>' : ''}</span></button>`; }).join('') + '</div>';
}
function contestHTML() {
  const L = lvl();
  if (L < 3) return `<h2>งานประกวดพระ</h2><p>ปลดล็อกที่ Lv.3 เซียนเปิดแผง (XP ตอนนี้ ${S.xp}/${LEVELS[2].xp})</p>`;
  const nextDay = S.day % 3 === 0 && S.contestDay !== S.day ? S.day : S.day + (3 - S.day % 3);
  if (nextDay !== S.day) return `<h2>งานประกวดพระ</h2><p>งานจัดทุก 3 วัน ครั้งถัดไปคือ <b>วันที่ ${nextDay}</b></p><p class="note">เตรียมพระสภาพสวยที่มีใบรับรองไว้ เพิ่มโอกาสติดรางวัล ถ้าส่งของเก๊เข้าประกวดจะถูกคัดออกและเสียชื่อเสียง</p>`;
  const ok = S.inv.filter(it => !it.pend && it.cert !== false && !it.consign);
  return `<h2>งานประกวดพระ วันที่ ${S.day}</h2><p>เลือกได้สูงสุด 3 องค์ ค่าสมัครองค์ละ ${fmt(1000)} กรรมการให้คะแนนจากความแท้ สภาพ ความหายาก และใบรับรอง</p>` +
    (ok.length ? ok.map(it => { const m = modelById(it.modelId); return `<label class="pick"><input type="checkbox" value="${it.id}"><img data-thumb="i:${it.id}" alt=""><span><b>${esc(m.name)}</b><br><span class="note">สภาพ ${it.cond}${it.cert ? ' • มีใบรับรอง' : ''}</span></span></label>`; }).join('') + `<div class="row"><button class="btn ok" id="enterC">ส่งเข้าประกวด</button></div>`
      : '<p>ยังไม่มีพระที่ส่งประกวดได้ในตู้</p>');
}
function ownHype(it) { const b = S.batches.find(x => x.modelId === it.modelId); if (!b) return ''; b.hype = Math.min(100, b.hype + 20); return ' • กระแสรุ่นนี้ +20'; }
function runContest(ids) {
  const items = S.inv.filter(it => ids.includes(String(it.id))); if (!items.length) { toast('เลือกพระอย่างน้อย 1 องค์', 'bad'); return; }
  if (items.length > 3) { toast('ส่งได้สูงสุด 3 องค์', 'bad'); return; }
  const fee = items.length * 1000; if (S.money < fee) { toast('เงินไม่พอค่าสมัคร', 'bad'); return; }
  S.money -= fee; S.contestDay = S.day;
  const res = items.map(it => {
    const m = modelById(it.modelId);
    if (!it.genuine) { S.rep = Math.max(0, S.rep - 8); it.cert = false; it.xp = true; return ['bad', `${m.name}: ถูกคัดออก กรรมการตัดสินว่าไม่แท้ (ชื่อเสียง −8)${shareFake(it)}`]; }
    const pk = it.share ? .5 : 1, ps = it.share ? ' (แบ่งเพื่อนครึ่งหนึ่ง)' : '';
    const sc = it.cond + Math.min(m.lvl, 6) * 4 + (it.cert ? 4 : 0) + Math.random() * 14;
    if (sc >= 112) { S.money += Math.round(m.price * .15 * pk); gainXP(120); S.rep = Math.min(100, S.rep + 6); it.award = Math.max(it.award, 3); const kk = !S.kaka; S.kaka = true; return ['gold', `${m.name}: ชนะเลิศ! เงินรางวัล ${fmt(m.price * .15 * pk)}${ps} +120 XP ชื่อเสียง +6${ownHype(it)}${kk ? ' • ได้รับมวลสาร "ดินกากยายักษ์" ใช้จัดสร้างพระได้แล้ว' : ''}`]; }
    if (sc >= 102) { S.money += Math.round(m.price * .06 * pk); gainXP(70); S.rep = Math.min(100, S.rep + 3); it.award = Math.max(it.award, 2); return ['good', `${m.name}: รองชนะเลิศอันดับ 1 เงินรางวัล ${fmt(m.price * .06 * pk)}${ps} +70 XP${ownHype(it)}`]; }
    if (sc >= 94) { gainXP(40); S.rep = Math.min(100, S.rep + 1); it.award = Math.max(it.award, 1); return ['good', `${m.name}: รองชนะเลิศอันดับ 2 +40 XP${ownHype(it)}`]; }
    gainXP(10); return ['', `${m.name}: ไม่ติดรางวัล (+10 XP)`];
  });
  openModal(`<h2>ผลการประกวด</h2><ul class="log">${res.map(([k, t]) => `<li class="${k}">${esc(t)}</li>`).join('')}</ul>${levelHTML()}<p class="note">องค์ที่ติดรางวัลจะปล่อยเช่าได้ราคาสูงขึ้น</p><div class="row"><button class="btn ok" data-close>ตกลง</button></div>`);
  render();
}
/* ===== จัดสร้างพระ: ออกแบบรุ่น (วัดและพิมพ์ → มวลสาร → ชื่อรุ่น → จำนวน/สต็อก → สรุป) ===== */
const TF = { view: '', step: 1, temple: 'pa', shape: 'rect', mat: 'powder', hand: 'samadhi', flame: 'tall', back: 'circle', ing: {}, nick: '', qty: 1000, keep: 0, seq: '' };
const tTrust = id => S.trust[id] ?? 50;
const templeOK = t => S.rep < t.rep ? `ต้องมีชื่อเสียง ${t.rep}` : (S.templeBan[t.id] || 0) > S.day ? `ไม่รับจัดสร้างถึงวันที่ ${S.templeBan[t.id]}` : tTrust(t.id) < 10 ? 'เจ้าอาวาสไม่ไว้ใจ ไม่รับจัดสร้าง' : '';
const maxIngr = () => tTrust(TF.temple) >= 70 ? 5 : 3;
function ingLock(id) { const I = INGR[id]; return I.lvl && lvl() < I.lvl ? `ปลดล็อก Lv.${I.lvl}` : I.trust && tTrust(TF.temple) < I.trust ? `ต้องมีความไว้ใจวัด ${I.trust} ขึ้นไป` : I.award && !S.kaka ? 'ได้จากรางวัลชนะเลิศงานประกวดเท่านั้น' : ''; }
const pickedIng = () => Object.entries(TF.ing).filter(([id]) => INGR[id] && !ingLock(id)).slice(0, maxIngr()).map(([id, f]) => ({ id, fake: f === 'fake' }));
const fullName = (nick, t, shape) => `${PIMS[shape]} รุ่น${nick} ${t.name}`;
const tObj = id => TEMPLES.find(x => x.id === id);
function nickErr(raw) {
  const n = raw.trim();
  if (n.length < 2 || n.length > 30) return 'ชื่อรุ่นต้องยาว 2–30 ตัวอักษร';
  if (S.custom.some(c => c.nick === n || c.name === fullName(n, tObj(c.temple) || tObj(TF.temple), c.shape))) return 'ชื่อรุ่นนี้ใช้ไปแล้ว ตั้งชื่อใหม่นะ';
  return '';
}
function designSpec() {
  const spec = { hand: TF.hand, flame: TF.flame, back: TF.back };
  if (TF.shape === 'rect') spec.tiers = 3; if (TF.shape === 'arch' || TF.shape === 'oval') spec.petals = 7; if (TF.shape === 'arch') spec.dots = 13;
  if (TF.shape === 'oval') spec.loop = 'weld'; else { spec.edge = 'cut'; spec.thick = 'mid'; spec.grain = TF.mat === 'powder' ? 'crackle' : 'pores'; }
  const ig = ingrKey(pickedIng()); if (ig) spec.ingr = ig;
  return spec;
}
function templeCost() {
  const t = tObj(TF.temple), ings = pickedIng();
  const ingCost = ings.reduce((a, g) => a + INGR[g.id].cost * (g.fake ? .2 : 1), 0), claimed = ings.reduce((a, g) => a + INGR[g.id].cost, 0);
  const mat = Math.round(TF.qty * UNIT[TF.mat] * (.8 + .4 * t.fame)), ing = Math.round(TF.qty * ingCost * (.8 + .4 * t.fame));
  return { t, mat, ing, rite: 20000, cost: mat + ing + 20000, unit: Math.round((UNIT[TF.mat] + claimed) * 6 * t.fame * (1 + S.rep / 150)), keepN: Math.round(TF.qty * TF.keep / 100) };
}
// ค่าที่โชว์ผู้เล่น (vis) ไม่รวมโบนัสลับ: ชื่อมงคล +5 และตำรับลับ
function designStats() {
  const t = tObj(TF.temple), ings = pickedIng(), nick = TF.nick.trim();
  const recs = RECIPES.filter(R => R.need.every(id => ings.some(g => g.id === id && !g.fake)));
  const vis = Math.round(t.fame * 15 + ings.reduce((a, g) => a + INGR[g.id].hype, 0)), visPct = ings.reduce((a, g) => a + INGR[g.id].price, 0);
  let hype = vis + (LUCKY.some(w => nick.includes(w)) ? 5 : 0) + recs.reduce((a, R) => a + R.hype, 0);
  if (TF.seq) hype = Math.max(40, hype);
  return { recs, vis, visPct, hype: clamp(hype, 0, 100), pricePct: visPct + recs.reduce((a, R) => a + R.price, 0), heat: ings.filter(g => g.fake).length * 10 };
}
function wizHTML() {
  if (TF.shape === 'oval' && !['copper', 'silver'].includes(TF.mat)) TF.mat = 'copper';
  if (TF.shape !== 'oval' && !['clay', 'powder'].includes(TF.mat)) TF.mat = 'powder';
  if (templeOK(tObj(TF.temple))) { const ok = TEMPLES.find(t => !templeOK(t)); if (ok) TF.temple = ok.id; }
  const sel = (k, opts) => `<select data-tf="${k}">${opts.map(([v, n, dis]) => `<option value="${esc(v)}" ${String(TF[k]) === String(v) ? 'selected' : ''} ${dis ? 'disabled' : ''}>${esc(n)}</option>`).join('')}</select>`;
  const c = templeCost(), st = designStats(), spec = designSpec(), pid = 'c' + S.nextId, nick = TF.nick.trim();
  const pm = { id: pid, shape: TF.shape, mat: TF.mat, spec }, pk = String(hash(JSON.stringify(pm)));
  PVA.set(pk, [pm, spec]);
  const name = nick ? fullName(nick, c.t, TF.shape) : `${PIMS[TF.shape]} รุ่น… ${c.t.name}`;
  const seqs = S.batches.filter(b => b.seqOK && !b.seqUsed);
  const steps = ['วัดและพิมพ์', 'มวลสาร', 'ชื่อรุ่น', 'จำนวน', 'สรุปต้นทุน'];
  const ings = pickedIng(), nI = ings.length, why = templeOK(c.t) || nickErr(TF.nick) || (S.money < c.cost ? `เงินไม่พอ (ขาด ${fmt(c.cost - S.money)})` : '');
  const step = (n, body) => `<section class="step ${TF.step === n ? 'on' : ''}"><h3>${n}. ${steps[n - 1]}</h3>${body}</section>`;
  return `<div class="wiz"><div class="stps">${steps.map((n, i) => `<button class="stp ${TF.step === i + 1 ? 'on' : ''}" data-step="${i + 1}" aria-label="ขั้นที่ ${i + 1} ${n}">${i + 1}</button>`).join('')}<span class="stpn">${steps[TF.step - 1]}</span></div>
    <div class="pvw"><div class="views pv" data-thumb="pv:${pk}"><figure><img alt="ตัวอย่างด้านหน้า"><figcaption>ด้านหน้า</figcaption></figure><figure><img alt="ตัวอย่างด้านหลัง"><figcaption>ด้านหลัง</figcaption></figure></div><div class="pvn" id="pvName">${esc(name)}</div></div>` +
    step(1, `<div class="form">
      ${seqs.length ? `<label class="span2f">ต่อยอดเป็นรุ่นสอง${sel('seq', [['', 'ไม่ใช่ (รุ่นใหม่)']].concat(seqs.map(b => [b.id, modelById(b.modelId).name])))}</label>` : ''}
      <label>วัด${sel('temple', TEMPLES.map(t => [t.id, `${t.name} • ไว้ใจ ${tTrust(t.id)}${templeOK(t) ? ` (${templeOK(t)})` : ''}`, !!templeOK(t) || (TF.seq && t.id !== S.batches.find(b => b.id === TF.seq)?.temple)]))}</label>
      <label>พิมพ์${sel('shape', Object.entries(PIMS))}</label>
      <label>เนื้อพระ${sel('mat', (TF.shape === 'oval' ? ['copper', 'silver'] : ['powder', 'clay']).map(k => [k, MATS[k].name]))}</label>
      <label>ปางพระหัตถ์${sel('hand', TELLS.hand.opts.map(v => [v, tellTxt('hand', v).split(':')[0]]))}</label>
      <label>พระเกศ${sel('flame', TELLS.flame.opts.map(v => [v, tellTxt('flame', v)]))}</label>
      <label>ด้านหลัง${sel('back', TELLS.back.opts.map(v => [v, tellTxt('back', v)]))}</label></div>`) +
    step(2, `<p class="note">เลือกได้ ${nI}/${maxIngr()} อย่าง${maxIngr() < 5 ? ' (ถ้าวัดไว้ใจ 70 ขึ้นไป เลือกได้ 5 อย่าง)' : ''} • มวลสารจะเห็นเป็นเม็ดหรือเส้นเล็ก ๆ เมื่อ "ส่อง"${TF.mat === 'copper' || TF.mat === 'silver' ? ' (เหรียญโลหะ: มวลสารผสมเข้าไปในเนื้อ เปลี่ยนสีโลหะแทน)' : ''}</p><div class="ingl">` +
      Object.entries(INGR).map(([id, I]) => { const lk = ingLock(id), on = !!TF.ing[id] && !lk, fx = [I.hype ? `กระแส +${I.hype}` : '', I.price ? `ราคาสะสม +${Math.round(I.price * 100)}%` : ''].filter(Boolean).join(' • ');
        return `<div class="ing ${lk ? 'lock' : ''} ${on ? 'on' : ''}"><label class="ingc"><input type="checkbox" data-ing="${id}" ${on ? 'checked' : ''} ${lk ? 'disabled' : ''}><span><b>${esc(I.name)}</b><small>${esc(I.look)} • ${fmt(I.cost)}/องค์${fx ? ' • ' + fx : ''}${lk ? ' • ' + esc(lk) : ''}</small></span></label>
          ${on ? `<label class="fake"><input type="checkbox" data-ingf="${id}" ${TF.ing[id] === 'fake' ? 'checked' : ''}> ใช้ของเทียม (ต้นทุน 20%)</label>` : ''}</div>`; }).join('') +
      `</div>${ings.some(g => g.fake) ? '<p class="note warn">ของเทียมถูกกว่า แต่ส่องใกล้ ๆ จะดูแบนและสีเรียบผิดธรรมชาติ ถ้าโดนแฉจะเป็นข่าวใหญ่ และวัดจะไว้ใจน้อยลง</p>' : ''}`) +
    step(3, `<label class="nick">ชื่อรุ่น<span class="nrow"><input id="nick" type="text" maxlength="30" autocomplete="off" placeholder="เช่น รวยทันใจ" value="${esc(TF.nick)}"><button class="btn dice" id="diceBtn" aria-label="สุ่มชื่อรุ่น">🎲</button></span></label>
      <p class="err" id="nickErr">${TF.nick ? esc(nickErr(TF.nick)) : ''}</p><p class="note">ชื่อเต็ม: "${esc(PIMS[TF.shape])} รุ่น<ชื่อที่ตั้ง> ${esc(c.t.name)}" • ห้ามใช้ชื่อพระเกจิหรือวัดจริง</p>`) +
    step(4, `<div class="form"><label>จำนวนสร้าง${sel('qty', [[300, '300 องค์'], [1000, '1,000 องค์'], [3000, '3,000 องค์']])}</label>
      <label>เก็บไว้ขายเอง${sel('keep', [0, 2, 5, 10].map(v => [v, v ? `${v}% (${Math.round(TF.qty * v / 100)} องค์)` : 'ไม่เก็บ']))}</label></div>
      <p class="note">สต็อกที่เก็บไว้จะขายได้ตามราคาสะสมของรุ่นในวันนั้น ส่วนที่เหลือวัดเปิดให้บูชาที่ ${fmt(c.unit)} ต่อองค์ (ถวายวัด 30%)</p>`) +
    step(5, `<table class="tells"><tr><td>รุ่น</td><td id="sumName">${esc(name)}</td></tr>
      <tr><td>เนื้อพระ ${TF.qty.toLocaleString()} องค์</td><td>${fmt(c.mat)}</td></tr><tr><td>มวลสาร</td><td>${nI ? `${fmt(c.ing)} (${esc(ingrTxt(ingrKey(ings)))})` : 'ไม่ใส่'}</td></tr>
      <tr><td>พิธีพุทธาภิเษก</td><td>${fmt(c.rite)}</td></tr><tr><td><b>รวม</b></td><td><b class="big">${fmt(c.cost)}</b></td></tr>
      <tr><td>ค่าบูชาที่วัด</td><td>${fmt(c.unit)} ต่อองค์</td></tr><tr><td>ราคาสะสมตั้งต้น</td><td>ราว ${fmt(c.unit * 12 * (1 + st.visPct))}</td></tr>
      <tr><td>กระแสเริ่มต้น</td><td>ราว ${st.vis}${TF.seq ? ' (รุ่นสองเริ่มอย่างน้อย 40 และมียอดจองล่วงหน้า)' : ''}</td></tr>${st.heat ? `<tr><td>ความร้อน (heat)</td><td class="warn">${st.heat}</td></tr>` : ''}
      <tr><td>เก็บขายเอง</td><td>${c.keepN} องค์</td></tr><tr><td>ใช้เวลา</td><td>3 วัน</td></tr></table>
      <p class="err" id="makeErr">${esc(why)}</p><div class="row"><button class="btn ok" id="makeB" ${why ? 'disabled' : ''}>สั่งจัดสร้าง</button></div>`) +
    `<div class="row stepnav"><button class="btn dim" data-step="${Math.max(1, TF.step - 1)}" ${TF.step === 1 ? 'disabled' : ''}>ก่อนหน้า</button><button class="btn" data-step="${Math.min(5, TF.step + 1)}" ${TF.step === 5 ? 'disabled' : ''}>ถัดไป</button></div></div>`;
}
function onNick(v) {
  TF.nick = v; const e = nickErr(v), nick = v.trim(), t = tObj(TF.temple), name = nick ? fullName(nick, t, TF.shape) : `${PIMS[TF.shape]} รุ่น… ${t.name}`;
  const ne = $('#nickErr'); if (ne) ne.textContent = v ? e : '';
  for (const id of ['#pvName', '#sumName']) { const el = $(id); if (el) el.textContent = name; }
  const mb = $('#makeB'), me = $('#makeErr'), c = templeCost(), why = templeOK(t) || e || (S.money < c.cost ? `เงินไม่พอ (ขาด ${fmt(c.cost - S.money)})` : '');
  if (mb) mb.disabled = !!why; if (me) me.textContent = why;
}
function randomNick() { for (let i = 0; i < 40; i++) { const n = pick(Math.random, NAME_A) + pick(Math.random, NAME_B); if (!nickErr(n)) return n; } return pick(Math.random, NAME_A) + pick(Math.random, NAME_B) + (S.custom.length + 1); }
function setSeq(id) {
  TF.seq = id; const b = S.batches.find(x => x.id === id); if (!b) return;
  const cm = modelById(b.modelId); Object.assign(TF, { temple: b.temple, shape: cm.shape, mat: cm.mat, hand: cm.spec.hand, flame: cm.spec.flame, back: cm.spec.back, ing: {} });
  for (const g of ingrList(cm.spec.ingr)) TF.ing[g.id] = g.fake ? 'fake' : 'real';
  if (!TF.nick) TF.nick = randomNickFrom(cm);
}
const randomNickFrom = cm => { const base = (cm.nick || 'ใหม่') + ' 2'; return nickErr(base) ? randomNick() : base; };
function templeHTML() {
  const L = lvl();
  if (L < 5) return `<h2>จัดสร้างพระกับวัด</h2><p>ปลดล็อกที่ Lv.5 เซียนใหญ่ (XP ตอนนี้ ${S.xp}/${LEVELS[4].xp})</p><p class="note">เมื่อปลดล็อก คุณจะออกแบบพิมพ์ มวลสาร ตั้งชื่อรุ่น และจำนวนเอง ร่วมกับวัดที่ไว้ใจคุณ รายได้ 30% ถวายบำรุงวัด</p>`;
  const wiz = TF.view === 'wiz' || !S.batches.length;
  return `<h2>จัดสร้างพระกับวัด</h2><div class="row tnav">${wiz ? (S.batches.length ? '<button class="btn dim" id="tList">← รุ่นที่จัดสร้างแล้ว</button>' : '') : '<button class="btn ok" id="tWiz">+ ออกแบบรุ่นใหม่</button>'}</div>` +
    (wiz ? wizHTML() : batchListHTML());
}
function batchListHTML() {
  return `<p class="note">ความไว้ใจของวัด: ${TEMPLES.map(t => `${esc(t.name)} <b>${tTrust(t.id)}</b>`).join(' • ')}</p>` +
    S.batches.slice().reverse().map(batchCard).join('');
}
const bById = id => S.batches.find(x => x.id === id);
const reviewCost = t => 20000 * t.fame, SPECIAL_COST = 99 * 1800, buyN = b => Math.max(5, Math.round(b.qty * .02));
// กราฟราคา 30 วัน: viewBox ตามข้อมูลจริง ยืดเต็มความกว้าง เส้นไม่ยืดตาม (non-scaling-stroke)
function priceSVG(hist) {
  if (!hist || hist.length < 2) return '<p class="note">กราฟราคาจะเริ่มแสดงหลังเปิดบูชา 2 วัน</p>';
  const W = 300, H = 80, lo = Math.min(...hist), hi = Math.max(...hist), span = hi - lo || 1;
  const pts = hist.map((v, i) => [i / (hist.length - 1) * W, H - 4 - (v - lo) / span * (H - 8)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="กราฟราคาตลาด ${hist.length} วันล่าสุด"><path d="${d}L${W},${H}L0,${H}Z" class="area"/><path d="${d}" class="ln" vector-effect="non-scaling-stroke"/></svg>
    <div class="cl"><span>ต่ำสุด ${fmt(lo)}</span><span>${hist.length} วันล่าสุด → วันนี้</span><span>สูงสุด ${fmt(hi)}</span></div></div>`;
}
function batchCard(b) {
  const cm = modelById(b.modelId), t = tObj(b.temple), avail = b.qty - b.keep;
  const stat = b.done ? '<span class="badge gold">บูชาหมดแล้ว</span>' : b.open ? `<span class="badge good">เปิดให้บูชา ${b.sold}/${avail}</span>` : `<span class="badge">กำลังจัดสร้าง เสร็จวันที่ ${b.ready}</span>`;
  const head = `<div class="bh"><b>${esc(cm.name)}</b>${stat}${b.coded ? '<span class="badge">ตอกโค้ดแล้ว</span>' : ''}${b.scandal ? '<span class="badge bad">เคยโดนแฉ</span>' : ''}</div><div class="note">${esc(t?.name || '')} • ${esc(MATS[cm.mat].name)} • มวลสาร: ${esc(ingrTxt(cm.spec.ingr || ''))}</div>`;
  if (!b.open) return `<div class="mdl bcard">${head}${b.stock ? `<p class="note">สต็อกเก็บเอง ${b.stock} องค์ (ได้รับเมื่อสร้างเสร็จ)</p>` : ''}</div>`;
  const bar = (k, n, v) => `<div class="bar ${k}"><span>${n}</span><i><em style="width:${clamp(v, 0, 100)}%"></em></i><b>${v}</b></div>`;
  const usedW = b.actW === S.day, usedG = b.actG === S.day, btn = (a, label, sub, why, cls = '') => `<button class="btn ${cls}" data-bact="${b.id}:${a}" ${why ? 'disabled' : ''}>${label}<small>${esc(why || sub)}</small></button>`;
  const wW = usedW ? 'วันนี้ทำแล้ว' : '', wG = usedG ? 'วันนี้ทำแล้ว' : '';
  return `<div class="mdl bcard">${head}
    <div class="bars">${bar('hype', 'กระแส', b.hype)}${bar('heat', 'heat', b.heat)}</div>
    <div class="facts bf"><span>ราคาตลาด <b>${fmt(b.mp)}</b></span><span>ค่าบูชาที่วัด <b>${fmt(b.unit)}</b></span><span>ไว้ใจวัด <b>${tTrust(b.temple)}</b></span></div>
    ${priceSVG(b.hist)}
    <h4>สร้างกระแสสายขาว <small>(วันละ 1 อย่าง)</small></h4><div class="bacts">
      ${btn('live', 'ไลฟ์สดขายพระ', 'ตอบคอมเมนต์ 5 รอบ', wW)}
      ${btn('review', 'จ้างเพจรีวิว', `${fmt(reviewCost(t))} • กระแส +15`, wW || (S.money < reviewCost(t) ? 'เงินไม่พอ' : ''))}
      ${b.special ? '' : btn('special', 'รุ่นพิเศษทองคำ 99 องค์', `ทุน ${fmt(SPECIAL_COST)} • กระแส +10`, wW || (b.done ? 'บูชาหมดแล้ว' : S.money < SPECIAL_COST ? 'เงินไม่พอ' : ''))}
    </div><p class="note">ส่งองค์ของรุ่นนี้เข้างานประกวด ถ้าติดรางวัล กระแส +20</p>
    <h4>ปั่นราคาสายเทา <small>(เสี่ยงโดนแฉ วันละ 1 อย่าง)</small></h4><div class="bacts">
      ${btn('hoard', 'กั๊กของ', 'ปล่อยวันนี้ครึ่งเดียว • ราคา +8%', wG || (b.done ? 'บูชาหมดแล้ว' : ''), 'grey')}
      ${btn('buyback', 'ซื้อคืนดันราคา', `${buyN(b)} องค์ ${fmt(buyN(b) * Math.round(b.mp))} • ราคา +15%`, wG || (S.money < buyN(b) * Math.round(b.mp) ? 'เงินไม่พอ' : ''), 'grey')}
      ${btn('rumor', 'ปล่อยข่าวเกินจริง', 'กระแส +20 • heat +20', wG, 'grey')}
    </div>
    ${b.coded ? '' : `<div class="row">${btn('code', 'ตอกโค้ดกำกับองค์', `฿50,000 • ของเก๊ระบาดลดครึ่ง กระแสลดช้าลง`, S.money < 50000 ? 'เงินไม่พอ' : '')}</div>`}
    ${b.stock ? `<div class="row bst"><span>สต็อกเก็บเอง <b>${b.stock}</b> องค์ • ขายที่ราคาตลาด ${fmt(b.mp)}</span>${[1, 10].filter(n => n <= b.stock).map(n => `<button class="btn" data-stock="${b.id}:${n}">ขาย ${n}</button>`).join('')}<button class="btn ok" data-stock="${b.id}:${b.stock}">ขายหมด<small>${fmt(b.stock * Math.round(b.mp))}</small></button></div>` : ''}
  </div>`;
}
function bAct(id, act) {
  const b = bById(id); if (!b || !b.open) return; const cm = modelById(b.modelId), t = tObj(b.temple), nm = cm.name;
  const white = ['live', 'review', 'special'].includes(act), grey = ['hoard', 'buyback', 'rumor'].includes(act);
  if ((white && b.actW === S.day) || (grey && b.actG === S.day)) { toast('วันนี้ทำกิจกรรมแบบนี้กับรุ่นนี้ไปแล้ว', 'bad'); return; }
  const tr = d => { S.trust[t.id] = clamp(tTrust(t.id) + d, 0, 100); };
  if (act === 'live') { b.actW = S.day; save(); LIVE = { bid: id, i: 0, pts: 0, fb: '', seen: [] }; nextLiveQ(); openModal(liveHTML()); return; }
  if (act === 'review') { const c = reviewCost(t); if (S.money < c) return; S.money -= c; b.hype += 15; tr(1); b.actW = S.day; toast(`จ้างเพจ "${pick(Math.random, PAGES)}" รีวิว ${nm} • กระแส +15`, 'good'); }
  if (act === 'special') {
    if (b.special || b.done || S.money < SPECIAL_COST) return; const rev = Math.round(99 * b.unit * 8 * .7);
    S.money += rev - SPECIAL_COST; b.special = true; b.hype += 10; tr(3); b.actW = S.day;
    toast(`รุ่นพิเศษเนื้อทองคำ 99 องค์ถูกจองหมดในวันเดียว รายได้ ${fmt(rev)} (ทุน ${fmt(SPECIAL_COST)}) • กระแสทั้งรุ่น +10`, 'good');
  }
  if (act === 'hoard') { if (b.done) return; b.hoard = S.day; b.mp = Math.round(b.mp * 1.08); b.heat += 5; tr(-6); b.actG = S.day; toast(`กั๊กของ ${nm} ไว้ ราคาตลาด +8% • heat +5`); }
  if (act === 'buyback') { const n = buyN(b), c = n * Math.round(b.mp); if (S.money < c) return; S.money -= c; b.stock += n; b.mp = Math.round(b.mp * 1.15); b.heat += 15; tr(-6); b.actG = S.day; toast(`ซื้อคืน ${nm} ${n} องค์ (${fmt(c)}) เข้าสต็อก ราคาตลาด +15% • heat +15`); }
  if (act === 'rumor') { b.hype += 20; b.heat += 20; tr(-6); b.actG = S.day; toast(`ปล่อยข่าวเกินจริงเรื่อง ${nm} • กระแส +20 heat +20`); }
  if (act === 'code') {
    if (b.coded || S.money < 50000) return; S.money -= 50000; b.coded = true; cm.spec.code = 'stamp';
    for (const it of S.inv) if (it.modelId === cm.id && it.genuine) { it.spec = { ...it.spec, code: 'stamp' }; THUMB.delete('i:' + it.id); }
    THUMB.delete('m:' + cm.id); lastShown = null; toast(`ตอกโค้ดกำกับองค์ ${nm} แล้ว ของเก๊จะทำเลียนแบบยากขึ้น`, 'good');
  }
  b.hype = clamp(b.hype, 0, 100); b.heat = clamp(b.heat, 0, 100); syncPrice(b); reModal(templeHTML()); render();
}
/* ไลฟ์สดขายพระ: มินิเกม 5 รอบ ตอบตรงหัวข้อคอมเมนต์ กระแส +4 ไม่ตรง +1 */
let LIVE = null;
function nextLiveQ() { const left = LIVE_Q.filter(q => !LIVE.seen.includes(q[0])); LIVE.q = pick(Math.random, left); LIVE.seen.push(LIVE.q[0]); LIVE.who = pick(Math.random, VIEWERS); }
function liveHTML() {
  const b = bById(LIVE.bid), cm = modelById(b.modelId);
  if (LIVE.done) return `<div class="live"><div class="lvh"><span class="lvdot">● LIVE จบแล้ว</span></div><h2>${esc(cm.name)}</h2>
    <p class="big">คนดู ${LIVE.done.viewers.toLocaleString()} คน</p><ul class="log"><li class="good">ยอดจอง ${LIVE.done.book} องค์ รายได้ ${fmt(LIVE.done.rev)}</li><li class="gold">กระแส +${LIVE.pts}</li></ul>
    <div class="row"><button class="btn ok" id="tBack">กลับหน้าจัดสร้าง</button></div></div>`;
  return `<div class="live"><div class="lvh"><span class="lvdot">● LIVE</span><span>รอบ ${LIVE.i + 1}/5 • คนดู ${(150 + LIVE.pts * 45 + LIVE.i * 30).toLocaleString()}</span></div><h2>${esc(cm.name)}</h2>
    ${LIVE.fb ? `<p class="fb">${esc(LIVE.fb)}</p>` : ''}<div class="cmt"><b>${esc(LIVE.who)}</b><span>${esc(LIVE.q[0])}</span></div>
    <p class="note">ตอบเรื่องอะไรดี?</p><div class="opts">${Object.entries(LIVE_T).map(([k, n]) => `<button class="btn" data-live="${k}">${n}</button>`).join('')}</div></div>`;
}
function liveAns(k) {
  if (!LIVE || LIVE.done) return; const ok = k === LIVE.q[1]; LIVE.pts += ok ? 4 : 1; LIVE.i++;
  LIVE.fb = ok ? `ตอบตรงใจ ${LIVE.who}! คนกดหัวใจรัว ๆ (+4)` : `${LIVE.who} ถามอีกเรื่องนะ... (+1)`;
  if (LIVE.i < 5) { nextLiveQ(); openModal(liveHTML()); return; }
  const b = bById(LIVE.bid), t = tObj(b.temple), viewers = Math.round((300 + LIVE.pts * 120) * (.8 + t.fame * .4) * (.7 + Math.random() * .6));
  const book = b.done ? 0 : Math.min(b.qty - b.keep - b.sold, Math.round(viewers * (.01 + LIVE.pts / 600))), rev = Math.round(book * b.unit * .7);
  b.sold += book; S.money += rev; b.hype = clamp(b.hype + LIVE.pts, 0, 100); S.trust[t.id] = clamp(tTrust(t.id) + 2, 0, 100);
  LIVE.done = { viewers, book, rev }; syncPrice(b); openModal(liveHTML()); render();
}
function sellStock(id, n) {
  const b = S.batches.find(x => x.id === id); n = Math.min(+n, b ? b.stock : 0); if (!b || !b.open || n <= 0) return;
  const p = Math.round(b.mp), cm = modelById(b.modelId); S.money += n * p; b.stock -= n; b.mp = Math.round(b.mp * Math.max(.85, 1 - .004 * n)); syncPrice(b);
  toast(`ขาย ${cm.name} จากสต็อก ${n} องค์ ได้ ${fmt(n * p)}`, 'good'); reModal(templeHTML()); render();
}
function makeBatch() {
  const c = templeCost(), t = c.t, why = templeOK(t) || nickErr(TF.nick) || (S.money < c.cost ? 'เงินไม่พอ' : ''); if (why) { toast(why, 'bad'); return; }
  const st = designStats(), ings = pickedIng(), nick = TF.nick.trim(), id = 'c' + S.nextId++, spec = designSpec();
  const seqB = TF.seq ? S.batches.find(b => b.id === TF.seq) : null; if (seqB) seqB.seqUsed = true;
  const base = Math.round(c.unit * 12 * (1 + st.pricePct));
  S.money -= c.cost;
  S.custom.push({ id, custom: true, ready: false, temple: t.id, nick, name: fullName(nick, t, TF.shape), shape: TF.shape, mat: TF.mat, lvl: 99, price: base, spec });
  S.batches.push({ id, modelId: id, temple: t.id, qty: +TF.qty, sold: 0, keep: c.keepN, stock: c.keepN, unit: c.unit, ready: S.day + 3, open: false, done: false,
    hype: st.hype, heat: st.heat, base, mp: Math.round(base * (.5 + st.hype / 80)), hist: [], preorder: seqB ? Math.round((TF.qty - c.keepN) * .15) : 0, seq: !!seqB });
  const nf = ings.filter(g => g.fake).length; if (nf) S.trust[t.id] = clamp(tTrust(t.id) - 8 * nf, 0, 100);
  const found = st.recs.filter(R => !S.recipes[R.id]); for (const R of st.recs) S.recipes[R.id] = true;
  gainXP(50); Object.assign(TF, { nick: '', step: 1, seq: '', view: '' });
  if (found.length) { sfx('level'); openModal(`<div class="announce"><p class="big">✨ ค้นพบตำรับลับ! ✨</p>${found.map(R => `<h2>${esc(R.name)}</h2><p>${esc(R.need.map(i => INGR[i].name).join(' + '))}</p><p class="good">${esc(R.txt)}</p>`).join('')}<p class="note">บันทึกไว้ในสมุดหน้า "ตำรับที่ค้นพบ" แล้ว</p><div class="row"><button class="btn ok" id="tBack">ไปดูรุ่นที่จัดสร้าง</button></div></div>`); }
  else { toast('สั่งจัดสร้างแล้ว วัดจะทำพิธีและแจ้งเมื่อพร้อมให้บูชา', 'good'); openModal(templeHTML()); }
  render();
}
function recipeHTML() {
  return `<h2>ตำรับที่ค้นพบ</h2><p class="note">ตำรับลับเกิดจากการผสมมวลสารของจริงบางอย่างเข้าด้วยกันตอนจัดสร้าง ลองหาดูเอง</p>` +
    RECIPES.map(R => S.recipes[R.id] ? `<div class="mdl"><b style="font:600 18px Kanit,sans-serif">${esc(R.name)}</b><p>${esc(R.need.map(i => INGR[i].name).join(' + '))}</p><p class="note">${esc(R.txt)}</p></div>` : `<div class="mdl"><b style="font:600 18px Kanit,sans-serif">???</b><p class="note">ยังไม่ค้นพบ</p></div>`).join('') +
    `<div class="row"><button class="btn dim" id="bookBack">กลับไปสมุด</button></div>`;
}
function reModal(html) { const sh = $('#modal .sheet'), y = sh.scrollTop; openModal(html); sh.scrollTop = y; }
function toolShopHTML() {
  const L = lvl();
  return `<h2>ร้านอุปกรณ์เซียน</h2><p class="note">ตั้งแต่ Lv.3 จะเริ่มเจอ "เก๊เทพ" ที่หน้าตาเหมือนองค์ครูทุกจุด ต้องใช้ไฟ UV หรือตาชั่งถึงจะจับได้</p>` +
    TOOLS.map(t => { const own = S.tools[t.id], lock = L < t.lvl;
      return `<div class="mdl"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><b style="font:600 18px Kanit,sans-serif">${esc(t.name)}</b><span class="big" style="font-size:20px">${fmt(t.price)}</span></div>
      <p>${esc(t.desc)}</p>${own ? '<span class="badge good">มีแล้ว</span>' : lock ? `<span class="badge">ปลดล็อก Lv.${t.lvl}</span>` : `<div class="row" style="margin-top:6px"><button class="btn ok" data-buytool="${t.id}" ${S.money < t.price ? 'disabled' : ''}>ซื้อ${S.money < t.price ? ' (เงินไม่พอ)' : ''}</button></div>`}</div>`; }).join('');
}
function buyTool(id) {
  const t = TOOLS.find(x => x.id === id); if (!t || S.tools[id] || lvl() < t.lvl) return;
  if (S.money < t.price) { toast('เงินไม่พอ', 'bad'); return; }
  S.money -= t.price; S.tools[id] = true; sfx('buy'); toast(`ได้ ${t.name} มาแล้ว`, 'good'); openModal(toolShopHTML()); render();
}
function menuHTML() {
  return `<h2>เมนู</h2>${dailyBtnHTML()}<h3>สถิติ</h3><p>รับเช่า ${S.stats.bought} องค์ • ปล่อยเช่า ${S.stats.sold} องค์ • โดนของเก๊ ${S.stats.fooled} ครั้ง • ชี้จุดเก๊ถูก ${S.stats.spotted} ครั้ง • XP ${S.xp}</p>
  ${S.loan.amt ? `<h3>หนี้เฮียโรงรับจำนำ</h3><p>คงเหลือ <b class="debtc">${fmt(S.loan.amt)}</b> • ดอกเบี้ย 3% ต่อวัน • ${loanLeftDays() > 0 ? `อีก ${loanLeftDays()} วันจะโดนยึดพระ` : 'ครบกำหนดแล้ว ปิดร้านวันนี้จะโดนยึดพระ'}</p>
  <div class="row"><button class="btn ok" id="repayBtn" ${S.money <= 0 ? 'disabled' : ''}>คืนเงิน ${fmt(Math.max(0, Math.min(S.money, S.loan.amt)))}${S.money < S.loan.amt ? '<small>(คืนได้เท่าที่มี)</small>' : ''}</button></div>` : ''}
  <div class="row"><button class="btn" id="toolShopBtn">ร้านอุปกรณ์เซียน</button><button class="btn" id="soundBtn" aria-pressed="${!S.mute}">เสียงประกอบ: ${S.mute ? 'ปิด' : 'เปิด'}</button><button class="btn" id="howBtn">วิธีเล่น</button><button class="btn no" id="resetBtn">เริ่มเกมใหม่</button></div>`;
}
const HOW = `<h2>ยินดีต้อนรับสู่แผงพระของคุณ</h2>
<ul class="log"><li>ลูกค้าจะนำพระมาเสนอให้เช่า ลากเพื่อหมุนองค์พระได้รอบ 360° ดูทั้งด้านหน้า ด้านหลัง และขอบข้าง</li>
<li>เปิด <b>สมุด</b> เทียบกับองค์ครู: ปางพระหัตถ์ พระเกศ จำนวนกลีบบัว ฐานชั้น ด้านหลัง ความหนา และผิวเนื้อ ของเก๊จะผิดอย่างน้อย 1 จุด</li>
<li>กด <b>ส่อง</b> เพื่อซูมดูผิวใกล้ ๆ เหมือนใช้กล้องส่องพระ (ซูมแล้วลากสองนิ้ว หรือ Shift+ลาก เพื่อเลื่อนดู)</li>
<li>ถ้ากด <b>ไม่เอา</b> ให้แตะจุดที่คิดว่าผิดบนองค์พระ (หรือเลือกจากรายการ) ถ้าองค์นั้นเก๊และชี้ถูก ได้ +20 XP ทันที</li>
<li><b>ต่อราคา</b> ได้ แต่ถ้าต่อมากไปลูกค้าจะเดินหนี รับเช่าแล้วไปที่ <b>ตู้พระ</b> เพื่อส่งตรวจหรือปล่อยเช่าทำกำไร</li>
<li>เงินไม่พอ? กด <b>รับเช่า</b> แล้วเลือกได้: <b>รับฝากขาย</b> (ไม่ต้องจ่าย ขายได้ค่อยจ่ายเจ้าของ ภายใน 5 วัน), <b>เทิร์นพระ</b> ในตู้ (85% ของราคาวันนั้น), <b>ชวนเซียนลงหุ้น</b> ครึ่งหนึ่ง (Lv.2) หรือ <b>ยืมเฮียโรงรับจำนำ</b> (ดอก 3% ต่อวัน คืนใน 10 วัน คืนได้ในเมนู ≡) • ปล่อยเช่าของเก๊ที่รับฝากขายจะเสียชื่อเสียงหนัก</li>
<li>ซื้อ <b>กล้องส่อง 20x</b>, <b>ไฟฉาย UV</b> และ <b>ตาชั่ง</b> ได้ที่ร้านอุปกรณ์เซียน (ในเมนู ≡ หรือสมุด) ไว้จับ "เก๊เทพ" ที่โผล่มาตั้งแต่ Lv.3</li>
<li><b>ส่องพระประจำวัน</b> (ในเมนู ≡): 5 องค์ชุดเดียวกันทุกคน ตอบแค่แท้/เก๊ จับเวลา แล้วคัดลอกผลไปแชร์ เล่นได้วันละครั้ง</li>
<li>สะสม XP ไต่ระดับ: Lv.3 ปลดล็อกงานประกวดพระ, Lv.5 ปลดล็อกการจัดสร้างพระกับวัด</li></ul>
<p class="note">พระ วัด ราคา และจุดสังเกตทั้งหมดในเกมเป็นเรื่องสมมติ ไม่ได้อ้างอิงพระเครื่องจริง</p>
<div class="row"><button class="btn ok" data-close>เริ่มเปิดร้าน</button><button class="btn" id="dailyBtn">ลองส่องพระประจำวัน</button></div>`;

/* ================= event wiring ================= */
$('#act').addEventListener('click', e => {
  const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
  ({ book: () => openModal(bookHTML()), flip, loupe: toggleLoupe, uv: toggleUV, dyes: () => dailyAnswer(true), dno: () => dailyAnswer(false), dnext: dailyNext, dexit: toShop, nego: negotiate, buy, pass, inv: () => openModal(invHTML()), end: endDay,
     back: toShop, cert: () => certify(ownItem), sell: () => sell(ownItem), scrap: () => scrap(ownItem) })[a]?.();
});
$('#tabs').addEventListener('click', e => {
  const t = e.target.closest('[data-tab]')?.dataset.tab; if (!t) return;
  if (t === 'shop') { closeModal(); toShop(); } else if (t === 'inv') openModal(invHTML()); else if (t === 'contest') openModal(contestHTML()); else if (t === 'temple') openModal(templeHTML()); else openModal(bookHTML());
});
$('#mbody').addEventListener('click', e => {
  const own = e.target.closest('[data-own]'); if (own) { const it = S.inv.find(i => String(i.id) === own.dataset.own); if (it) openOwn(it); return; }
  const sk = e.target.closest('[data-spotk]'); if (sk) { closeModal(); commitSpot([sk.dataset.spotk]); return; }
  const bt = e.target.closest('[data-buytool]'); if (bt) { buyTool(bt.dataset.buytool); return; }
  if (e.target.id === 'toolShopBtn') { openModal(toolShopHTML()); return; }
  const sh = e.target.closest('[data-short]'); if (sh) { if (!sh.disabled) shortPick(sh.dataset.short); return; }
  const tn = e.target.closest('[data-turn]'); if (tn) { if (!tn.disabled) doTurn(tn.dataset.turn); return; }
  if (e.target.id === 'shortBack') { openModal(shortHTML()); return; }
  if (e.target.closest('#repayBtn')) { repay(); return; }
  if (e.target.closest('#dailyBtn')) { enterDaily(); return; }
  if (e.target.id === 'shareBtn') { shareDaily(); return; }
  if (e.target.id === 'enterC') runContest([...$('#mbody').querySelectorAll('.pick input:checked')].map(i => i.value));
  if (e.target.id === 'makeB') makeBatch();
  const stp = e.target.closest('[data-step]'); if (stp && !stp.disabled) { TF.step = +stp.dataset.step; reModal(templeHTML()); return; }
  if (e.target.id === 'diceBtn') { const n = randomNick(); const inp = $('#nick'); if (inp) inp.value = n; onNick(n); return; }
  if (e.target.id === 'tWiz') { TF.view = 'wiz'; openModal(templeHTML()); return; }
  if (e.target.id === 'tList' || e.target.id === 'tBack') { TF.view = ''; openModal(templeHTML()); return; }
  const ba = e.target.closest('[data-bact]'); if (ba) { if (!ba.disabled) { const [bid, act] = ba.dataset.bact.split(':'); bAct(bid, act); } return; }
  const lv = e.target.closest('[data-live]'); if (lv) { liveAns(lv.dataset.live); return; }
  const skb = e.target.closest('[data-stock]'); if (skb) { const [bid, n] = skb.dataset.stock.split(':'); sellStock(bid, n); return; }
  if (e.target.id === 'recipeBtn') { openModal(recipeHTML()); return; }
  if (e.target.id === 'bookBack') { openModal(bookHTML()); return; }
  if (e.target.id === 'howBtn') openModal(HOW);
  if (e.target.id === 'soundBtn') { S.mute = !S.mute; save(); openModal(menuHTML()); sfx('buy'); }
  if (e.target.id === 'resetBtn') openModal(`<h2>เริ่มเกมใหม่?</h2><p>เงิน เลเวล และพระในตู้ทั้งหมดจะหายไป</p><div class="row"><button class="btn dim" data-close>ยกเลิก</button><button class="btn no" id="resetYes">ยืนยัน เริ่มใหม่</button></div>`);
  if (e.target.id === 'resetYes') { const mute = S.mute; S = newGame(); S.mute = mute; normTemple(); genQueue(); mode = 'shop'; spot = null; ownItem = null; lastShown = null; closeModal(); render(); }
});
$('#mbody').addEventListener('change', e => {
  const k = e.target.dataset.tf; if (k) { if (k === 'seq') setSeq(e.target.value); else TF[k] = k === 'qty' || k === 'keep' ? +e.target.value : e.target.value; if (k === 'seq' && !e.target.value) TF.seq = ''; reModal(templeHTML()); }
  const ig = e.target.dataset.ing; if (ig) { if (e.target.checked) { if (pickedIng().length >= maxIngr()) { toast(`เลือกมวลสารได้สูงสุด ${maxIngr()} อย่าง`, 'bad'); } else TF.ing[ig] = 'real'; } else { const { [ig]: _, ...rest } = TF.ing; TF.ing = rest; } reModal(templeHTML()); }
  const igf = e.target.dataset.ingf; if (igf) { TF.ing[igf] = e.target.checked ? 'fake' : 'real'; reModal(templeHTML()); }
  if (e.target.matches('.pick input')) { const on = $('#mbody').querySelectorAll('.pick input:checked'); if (on.length > 3) { e.target.checked = false; toast('ส่งได้สูงสุด 3 องค์', 'bad'); } }
});
$('#menuBtn').onclick = () => openModal(menuHTML());
$('#mbody').addEventListener('input', e => { if (e.target.id === 'nick') onNick(e.target.value); });
$('#spotbar').addEventListener('click', e => {
  if (e.target.id === 'spotSkip' && spotting() && !spot.busy) finishPass(S.queue[0]);
  if (e.target.id === 'spotList' && spotting() && !spot.busy) openModal(spotListHTML());
});

resize(); render(); frame();
if (!S.seen) { S.seen = true; save(); openModal(HOW); }
