// แยกจาก game.js (เฟส 2) — ดูโครงสร้างใน CLAUDE.md
import { $, clamp, lerp, rng, hash, fmt, pick, esc, round100, wpick, inPoly, mk } from './util.js';

/* ================= game data (fictional) ================= */
const MATS = {
  clay:   { name: 'เนื้อดินเผา', base: [158, 92, 60], dark: [58, 30, 20], hi: [212, 160, 118], rough: .95, metal: 0 },
  powder: { name: 'เนื้อผงพุทธคุณ', base: [214, 199, 168], dark: [104, 88, 64], hi: [244, 236, 216], rough: .88, metal: 0 },
  copper: { name: 'เนื้อทองแดง', base: [168, 100, 62], dark: [48, 34, 26], hi: [238, 178, 126], rough: .42, metal: .85, patina: [70, 112, 84] },
  silver: { name: 'เนื้อเงิน', base: [196, 196, 198], dark: [52, 52, 58], hi: [250, 250, 250], rough: .3, metal: .95, patina: [90, 80, 70] },
  // fx: งานพิเศษของเนื้อ (spots = นวโลหะหลายเฉด, pink = ผงว่านเขียวอมชมพู, wood = ลายเสี้ยนไม้, glaze = เคลือบมัน)
  gold:   { name: 'เนื้อทองคำ', base: [222, 172, 62], dark: [96, 62, 18], hi: [255, 234, 160], rough: .26, metal: 1 },
  navaloha: { name: 'เนื้อนวโลหะ', base: [196, 128, 104], dark: [70, 40, 34], hi: [246, 200, 172], rough: .34, metal: .9, patina: [110, 70, 56], fx: 'spots' },
  chin:   { name: 'เนื้อชินตะกั่วสนิมแดง', base: [116, 110, 104], dark: [40, 36, 34], hi: [176, 170, 162], rough: .7, metal: .5, patina: [172, 64, 40] },
  lan:    { name: 'เนื้อผงใบลาน', base: [58, 50, 44], dark: [18, 16, 14], hi: [120, 108, 98], rough: .9, metal: 0 },
  wanp:   { name: 'เนื้อผงว่าน', base: [150, 172, 128], dark: [58, 74, 48], hi: [226, 236, 210], rough: .9, metal: 0, fx: 'pink' },
  ceramic: { name: 'เนื้อกระเบื้องเคลือบ', base: [118, 172, 152], dark: [36, 82, 70], hi: [226, 246, 236], rough: .12, metal: 0, fx: 'glaze' },
  wood:   { name: 'เนื้อไม้แกะ', base: [156, 104, 62], dark: [70, 42, 24], hi: [206, 156, 104], rough: .82, metal: 0, fx: 'wood' },
  shell:  { name: 'เปลือกหอยเบี้ย', base: [236, 224, 196], dark: [150, 120, 84], hi: [255, 250, 236], rough: .3, metal: 0 },
  lead:   { name: 'เนื้อตะกั่ว', base: [118, 120, 124], dark: [38, 38, 42], hi: [184, 186, 190], rough: .62, metal: .55, patina: [206, 202, 188] },
};
const THW = { thin: .055, mid: .11, thick: .19 };
const TELLS = {
  hand:   { label: 'ปางพระหัตถ์', opts: ['mara', 'samadhi'], txt: { mara: 'ปางมารวิชัย: มือขวาวางคว่ำที่เข่า', samadhi: 'ปางสมาธิ: มือวางซ้อนกันบนตัก' } },
  flame:  { label: 'พระเกศ', opts: ['tall', 'short'], txt: { tall: 'เกศยาวเรียวแหลม', short: 'เกศสั้นป้อม' } },
  tiers:  { label: 'ฐานชั้น', num: [1, 5], txt: v => v + ' ชั้น' },
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
  finish: { label: 'งานผิว', opts: ['none', 'lacquer', 'gilt', 'kru', 'enamel'], txt: { none: 'ผิวเนื้อเดิม ไม่ตกแต่ง', lacquer: 'ลงรักปิดทอง ทองหลุดลอกตามจุดสูง', gilt: 'กะไหล่ทองบาง ๆ สึกที่จุดสูง', kru: 'คราบกรุ ไขขาวและคราบดินตามร่อง', enamel: 'ลงยาสีในร่อง' } },
  nagaHeads: { label: 'เศียรนาค', opts: [5, 7, 9], txt: v => v + ' เศียร' },
  monkItem: { label: 'เครื่องหมายบนรูปเหมือน', opts: ['yam', 'beads', 'none'], txt: { yam: 'สะพายย่ามที่ไหล่', beads: 'คล้องลูกประคำที่คอ', none: 'ไม่มีย่ามหรือลูกประคำ' } },
  seam:   { label: 'รอยตะเข็บหล่อ (ข้างองค์)', opts: ['fine', 'thick'], txt: { fine: 'ตะเข็บเรียบเนียน แทบมองไม่เห็น', thick: 'ตะเข็บนูนเป็นสันชัด' } },
  kcode:  { label: 'โค้ดใต้ฐาน', opts: ['stamp', 'none', 'wrong'], txt: { stamp: 'ตอกโค้ดใต้ฐานกลางองค์', none: 'ใต้ฐานเรียบ ไม่มีโค้ด', wrong: 'โค้ดเยื้อง ลายไม่ตรงแบบ' } },
  rattle: { label: 'เสียงเขย่า (กด "เขย่า")', opts: ['clear', 'dull'], txt: { clear: 'เม็ดกริ่งดังใสกังวาน', dull: 'เสียงทึบ ไม่กังวาน' } },
  turns:  { label: 'จำนวนรอบม้วน (ดูที่ปลาย)', num: [3, 9], txt: v => v + ' รอบ' },
  cord:   { label: 'สีเชือกถัก', opts: ['red', 'black', 'white', 'yellow'], txt: { red: 'เชือกแดง', black: 'เชือกดำ', white: 'เชือกขาว', yellow: 'เชือกเหลือง' } },
  braid:  { label: 'ลายถักเชือก', opts: ['fish', 'spiral'], txt: { fish: 'ลายก้างปลา', spiral: 'ลายเกลียว' } },
  chan:   { label: 'สีชันโรงที่อุด (ด้านล่าง)', opts: ['black', 'brown', 'red'], txt: { black: 'ชันโรงสีดำ', brown: 'ชันโรงสีน้ำตาล', red: 'ชันโรงสีแดงเข้ม' } },
  wrap:   { label: 'ลายถักหุ้ม', opts: ['net', 'spiral'], txt: { net: 'ถักหุ้มลายตาข่าย', spiral: 'ถักหุ้มลายเกลียว' } },
  mercury: { label: 'เสียงเขย่า (กด "เขย่า")', opts: ['flow', 'dry'], txt: { flow: 'ได้ยินเสียงปรอทไหลซ่า', dry: 'เสียงแห้ง ๆ ไม่มีปรอท' } },
  loop:   { label: 'หูเหรียญ', opts: ['weld', 'cast'], txt: { weld: 'หูเชื่อม: ห่วงกลมแยกชิ้น', cast: 'หูตัน: แผ่นแบนหล่อติดเหรียญ' } },
};
const tellTxt = (k, v) => { const t = TELLS[k].txt; return typeof t === 'function' ? t(v) : t[v]; };
// รุ่นพระ: shape (รูปทรง) + pose (ปาง) + kind (flat/kring/takrut/bia) + mat (เนื้อ) + spec (จุดสังเกตองค์ครู รวม finish งานผิว)
// rar = ความหายาก, region = ภาค, subs = ชุดพิมพ์ย่อย (SUBP) — ทั้งหมดเป็นเรื่องสมมติ
const P_ = { pose: 'seated', kind: 'flat', region: 'central', rar: 'common' };
const MODELS = [
  { id: 'nangpaya', name: 'พระนางพญา วัดเขาแก้ว', shape: 'tri', mat: 'clay', lvl: 1, price: 9000, weight: 14.5, subs: 'phra',
    spec: { hand: 'mara', flame: 'short', back: 'plain', edge: 'cut', thick: 'thick', grain: 'pores' } },
  { id: 'somdej', name: 'พระสมเด็จ วัดศรีมงคล', shape: 'rect', mat: 'powder', lvl: 1, price: 28000, weight: 9.5, subs: 'phra',
    spec: { hand: 'samadhi', tiers: 3, flame: 'short', back: 'plain', edge: 'cut', thick: 'mid', grain: 'crackle' } },
  { id: 'dinrak', name: 'พระเม็ดขนุนลงรัก วัดดอยหมอกคำ', shape: 'jackfruit', mat: 'clay', lvl: 1, price: 7000, weight: 11, region: 'north', subs: 'phra',
    spec: { hand: 'mara', flame: 'short', back: 'plain', edge: 'round', thick: 'mid', grain: 'pores', finish: 'lacquer' } },
  { id: 'phongwan', name: 'พระผงว่านองค์กลม วัดโนนศิลาทอง', shape: 'round', mat: 'wanp', lvl: 1, price: 5000, weight: 9, region: 'isan', subs: 'phra',
    spec: { hand: 'samadhi', flame: 'short', back: 'yantra', edge: 'round', thick: 'mid', grain: 'pores' } },
  { id: 'coin1', name: 'เหรียญรุ่นแรก วัดหนองบัว', shape: 'oval', mat: 'copper', lvl: 2, price: 55000, weight: 12, subs: 'coin',
    spec: { hand: 'mara', petals: 5, flame: 'tall', back: 'yantra', loop: 'weld' } },
  { id: 'lila', name: 'พระลีลาใบโพธิ์ลงรัก วัดเวียงฟ้าใส', shape: 'bodhi', pose: 'walk', mat: 'clay', lvl: 2, price: 35000, weight: 13, region: 'north', rar: 'rare',
    spec: { flame: 'tall', back: 'plain', edge: 'cut', thick: 'thick', grain: 'pores', finish: 'lacquer' } },
  { id: 'monkcoin', name: 'เหรียญหยดน้ำรูปเหมือนหลวงพ่อผู้เฒ่า วัดห้วยสายลม', shape: 'coindrop', pose: 'monk', mat: 'copper', lvl: 2, price: 18000, weight: 10, region: 'isan', subs: 'coin',
    spec: { monkItem: 'yam', back: 'yantra', loop: 'weld', finish: 'enamel' } },
  { id: 'bailan', name: 'พระผงใบลานชิ้นเล็ก วัดโนนศิลาทอง', shape: 'smallrect', mat: 'lan', lvl: 2, price: 12000, weight: 6, region: 'isan', subs: 'phra',
    spec: { hand: 'mara', tiers: 2, flame: 'short', back: 'plain', edge: 'cut', thick: 'thin', grain: 'crackle' } },
  { id: 'takrut1', name: 'ตะกรุดโทนเนื้อทองแดง วัดแหลมทรายขาว', kind: 'takrut', shape: 'rect', mat: 'copper', lvl: 2, price: 25000, weight: 9, region: 'south',
    spec: { turns: 5, cord: 'red', braid: 'fish' } },
  { id: 'sum', name: 'พระซุ้มเรือนแก้ว วัดทุ่งทอง', shape: 'arch', mat: 'clay', lvl: 3, price: 160000, weight: 17, rar: 'rare', subs: 'phra',
    spec: { hand: 'mara', petals: 7, dots: 13, flame: 'tall', back: 'plain', edge: 'cut', thick: 'thick', grain: 'pores' } },
  { id: 'yuen', name: 'พระยืนกลีบบัว กรุเก่า วัดดอยหมอกคำ', shape: 'lotus', pose: 'stand', mat: 'clay', lvl: 3, price: 120000, weight: 15, region: 'north', rar: 'rare',
    spec: { flame: 'short', back: 'plain', edge: 'round', thick: 'thick', grain: 'pores', finish: 'kru' } },
  { id: 'nagachin', name: 'พระนาคปรกเนื้อชิน วัดห้วยสายลม', shape: 'lotus', pose: 'naga', mat: 'chin', lvl: 3, price: 95000, weight: 28, region: 'isan', rar: 'rare',
    spec: { nagaHeads: 7, flame: 'short', back: 'circle', edge: 'cut', thick: 'mid', grain: 'oxide', finish: 'kru' } },
  { id: 'sema', name: 'เหรียญใบเสมาลงยา วัดศรีมงคล', shape: 'sema', mat: 'silver', lvl: 3, price: 70000, weight: 14, rar: 'rare', subs: 'coin',
    spec: { hand: 'mara', petals: 5, flame: 'tall', back: 'square', loop: 'cast', finish: 'enamel' } },
  { id: 'bia1', name: 'เบี้ยแก้ วัดควนหินลาด', kind: 'bia', shape: 'rect', mat: 'shell', lvl: 3, price: 140000, weight: 14, region: 'south', rar: 'rare',
    spec: { chan: 'black', wrap: 'net', mercury: 'flow' } },
  { id: 'pidta', name: 'พระปิดตา วัดบ้านนา', shape: 'pidta', pose: 'pidta', mat: 'lead', lvl: 4, price: 320000, weight: 38, rar: 'rare',
    spec: { palm: 'una', back: 'yantra', edge: 'round', thick: 'thick', grain: 'oxide' } },
  { id: 'somdejG', name: 'พระสมเด็จพิมพ์ใหญ่ กรุเก่า วัดศรีมงคล', shape: 'rect', mat: 'powder', gold: true, lvl: 4, price: 680000, weight: 10.5, rar: 'epic', subs: 'phra',
    spec: { hand: 'samadhi', tiers: 3, flame: 'tall', back: 'circle', edge: 'cut', thick: 'mid', grain: 'crackle' } },
  { id: 'kring1', name: 'พระกริ่งเนื้อนวโลหะ วัดเวียงฟ้าใส', kind: 'kring', shape: 'rect', mat: 'navaloha', lvl: 4, price: 450000, weight: 48, region: 'north', rar: 'epic',
    spec: { flame: 'short', seam: 'fine', kcode: 'stamp', rattle: 'clear' } },
  { id: 'woodmonk', name: 'รูปเหมือนไม้แกะหลวงพ่อผู้เฒ่า วัดบ้านนา', shape: 'round', pose: 'monk', mat: 'wood', lvl: 4, price: 150000, weight: 7, rar: 'rare',
    spec: { monkItem: 'beads', back: 'plain', edge: 'round', thick: 'thick', grain: 'smooth' } },
  { id: 'yuencoin', name: 'เหรียญพระยืนกะไหล่ทอง วัดแหลมทรายขาว', shape: 'coindrop', pose: 'stand', mat: 'copper', lvl: 4, price: 220000, weight: 13, region: 'south', rar: 'rare', subs: 'coin',
    spec: { flame: 'tall', back: 'circle', loop: 'weld', finish: 'gilt' } },
  { id: 'coin2', name: 'เหรียญเงินรุ่นพิเศษ วัดหนองบัว', shape: 'oval', mat: 'silver', lvl: 5, price: 1800000, weight: 15.5, rar: 'epic', subs: 'coin',
    spec: { hand: 'samadhi', petals: 9, flame: 'short', back: 'square', loop: 'weld' } },
  { id: 'nagaceramic', name: 'พระนาคปรกกระเบื้องเคลือบ วัดทุ่งทอง', shape: 'jackfruit', pose: 'naga', mat: 'ceramic', lvl: 5, price: 900000, weight: 16, rar: 'epic',
    spec: { nagaHeads: 9, flame: 'tall', back: 'plain', edge: 'round', thick: 'mid', grain: 'smooth' } },
  { id: 'takrut2', name: 'ตะกรุดเนื้อเงิน วัดควนหินลาด', kind: 'takrut', shape: 'rect', mat: 'silver', lvl: 5, price: 750000, weight: 12, region: 'south', rar: 'epic',
    spec: { turns: 7, cord: 'black', braid: 'spiral' } },
  { id: 'kringgold', name: 'พระกริ่งเนื้อทองคำ วัดเขาแก้ว', kind: 'kring', shape: 'rect', mat: 'gold', lvl: 6, price: 3500000, weight: 60, rar: 'legend',
    spec: { flame: 'tall', seam: 'fine', kcode: 'stamp', rattle: 'clear' } },
  { id: 'bia2', name: 'เบี้ยแก้ตัวใหญ่ วัดแหลมทรายขาว', kind: 'bia', shape: 'rect', mat: 'shell', lvl: 6, price: 2400000, weight: 22, region: 'south', rar: 'legend',
    spec: { chan: 'red', wrap: 'spiral', mercury: 'flow' } },
].map(m => ({ ...P_, ...m }));
const LEVELS = [
  { xp: 0, name: 'มือใหม่หัดส่อง' }, { xp: 120, name: 'นักเลงพระ' }, { xp: 350, name: 'เซียนเปิดแผง' },
  { xp: 800, name: 'เซียนดังประจำสนาม' }, { xp: 1600, name: 'เซียนใหญ่' }, { xp: 3000, name: 'ปรมาจารย์วงการพระ' },
];
const UNLOCK_X = { 3: 'ปลดล็อก งานประกวดพระ', 5: 'ปลดล็อก จัดสร้างพระกับวัด', 6: 'คุณคือปรมาจารย์วงการพระแล้ว!' };
const UNLOCK = {};
for (let l = 2; l <= 6; l++) { const ms = MODELS.filter(m => m.lvl === l).map(m => `"${m.name}"`); UNLOCK[l] = [UNLOCK_X[l], ms.length ? `ลูกค้าเริ่มนำ ${ms.join(', ')} มาเสนอ` : ''].filter(Boolean).join(' • '); }
const TEMPLES = [
  { id: 'pa', name: 'วัดป่าสันติธรรม', fame: 1, rep: 0 },
  { id: 'tt', name: 'วัดทุ่งทอง', fame: 1.6, rep: 35 },
  { id: 'kk', name: 'วัดเขาแก้ว', fame: 2.3, rep: 60 },
];
const PIMS = { rect: 'พิมพ์สมเด็จ', tri: 'พิมพ์นางพญา', arch: 'พิมพ์ซุ้มเรือนแก้ว', oval: 'เหรียญ' };
const DW = { clay: 14, powder: 10, copper: 12, silver: 15, lead: 38, gold: 18, navaloha: 16, chin: 30, lan: 9, wanp: 9, ceramic: 12, wood: 6, shell: 14 };
// พิมพ์ย่อย/บล็อก: ต่างกันด้วยตำหนิเล็กที่ตั้งใจ (mark) ราคาต่างกันมาก (ไม่ใช่ของเก๊)
const SUBP = {
  phra: [{ id: 'a', name: 'พิมพ์ใหญ่', mark: 'none', mult: 1, w: .55, txt: 'ไม่มีขีดใต้ฐาน ไม่มีจุดเหนือเศียร' }, { id: 'b', name: 'พิมพ์เล็ก', mark: 'line', mult: .55, w: .35, txt: 'มีขีดเล็กใต้ฐาน' }, { id: 'c', name: 'พิมพ์หน้าแก่ (พิมพ์นิยม)', mark: 'dot', mult: 1.9, w: .1, txt: 'มีจุดเล็กเหนือเศียรด้านขวา' }],
  coin: [{ id: 'a', name: 'บล็อกสอง', mark: 'none', mult: 1, w: .7, txt: 'ไม่มีจุดตำหนิ' }, { id: 'b', name: 'บล็อกแรก (บล็อกนิยม)', mark: 'dot', mult: 1.7, w: .3, txt: 'มีจุดตำหนิเหนือเศียรด้านขวา' }],
};
const subsOf = m => (m && SUBP[m.subs]) || null;
const subOf = (m, id) => (subsOf(m) || []).find(x => x.id === id) || null;
const RAR = { common: ['ทั่วไป', 'c'], rare: ['หายาก', 'r'], epic: ['หายากมาก', 'e'], legend: ['ตำนาน', 'l'] };
const REGIONS = { north: 'ภาคเหนือ', isan: 'ภาคอีสาน', central: 'ภาคกลาง', south: 'ภาคใต้' };
const CATS = { phra: 'พระเครื่อง', coin: 'เหรียญ', kring: 'พระกริ่ง', charm: 'เครื่องราง' };
const COIN_SHAPES = ['oval', 'coindrop', 'sema'];
const isCoin = sh => COIN_SHAPES.includes(sh);
const catOf = m => m.kind === 'kring' ? 'kring' : m.kind === 'takrut' || m.kind === 'bia' ? 'charm' : isCoin(m.shape) ? 'coin' : 'phra';
// กรอบพระ: val = มูลค่าที่เพิ่มตอนปล่อยเช่า, cost = ค่าเลี่ยมกรอบที่ร้าน
const FRAMES = { gold: { name: 'กรอบทอง', cost: 15000, val: 18000, col: [232, 188, 82], metal: 1, rough: .25, w: 1 }, silver: { name: 'กรอบเงิน', cost: 3000, val: 3500, col: [222, 222, 226], metal: 1, rough: .3, w: 2 }, steel: { name: 'กรอบสแตนเลส', cost: 800, val: 900, col: [168, 174, 182], metal: .9, rough: .35, w: 3 }, acrylic: { name: 'กรอบอะคริลิกกันน้ำ', cost: 300, val: 300, col: [230, 240, 255], glass: true, w: 4 } };
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

export { SUBP, subsOf, subOf, RAR, REGIONS, CATS, COIN_SHAPES, isCoin, catOf, FRAMES, UNLOCK_X, P_, MATS, THW, TELLS, tellTxt, MODELS, LEVELS, UNLOCK, TEMPLES, PIMS, DW, mWeight, TOOLS, INGR, RECIPES, EVENTS, PAGES, LIVE_T, LIVE_Q, VIEWERS, LUCKY, NAME_A, NAME_B, ingrList, ingrKey, ingrTxt, mutIngr, UNIT, NAMES, HONEST, SLICK };
