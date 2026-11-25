// เฟส 4: กล สายเทา บุญกรรม และฉากจบ
// ไม่ import จาก game.js: game.js เรียก initKarma(api) ส่งสถานะและฟังก์ชันเข้ามา — ข้อความทั้งหมดเป็นโทนเกม ชื่อหน่วยงาน/สมาคมเป็นเรื่องสมมติ
import { clamp, rng, hash, fmt, pick, esc, round100 } from './util.js';
import { MODELS } from './data.js';

let A = null;
const S = () => A.S();
function initKarma(api) { A = api; }
const META = 'sianphra_meta_v1';
function meta() { try { return JSON.parse(localStorage.getItem(META)) || { endings: {} }; } catch (e) { return { endings: {} }; } }
function saveMeta(m) { try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) { /* storage unavailable */ } }

/* ===== ค่าเริ่มต้น/รองรับเซฟเก่า ===== */
function normKarma(s) {
  if (s.merit == null) s.merit = 50; if (s.karma == null) s.karma = 0;
  s.rumor = s.rumor || { on: false, day: 0 }; s.lies = s.lies || 0; s.caught = !!s.caught; s.brokeDays = s.brokeDays || 0;
  s.donate = s.donate || { day: 0 }; s.endings = s.endings || {};
}
const addMerit = n => { S().merit = clamp(S().merit + n, 0, 100); };
const addKarma = n => { S().karma = clamp(S().karma + n, 0, 100); };
// บุญสูง เหตุการณ์ดีบ่อยขึ้น / กรรมสูง เหตุการณ์ร้ายบ่อยขึ้น (ตัวคูณให้โมดูลอื่นใช้)
const goodMult = () => .5 + S().merit / 100;
const badMult = () => .4 + S().karma / 60;
const mkHTML = () => `<span class="mk-m" title="บุญ">บุญ ${S().merit}</span><span class="mk-k" title="กรรม">กรรม ${S().karma}</span>`;

/* ===== ใบรับรองที่ลูกค้าแนบมา (บางใบปลอม) ===== */
const CERT_ORG = 'สมาคมตรวจสอบพระเครื่องแห่งประเทศสมมติ';
function attachCert(c, r) {
  if (A.lvl() < 2 || c.tut || r() > .2) return;
  const real = c.genuine ? r() < .75 : r() < .08, digits = String(10000 + Math.floor(r() * 89999));
  c.certCard = { real, no: `สต.${2561 + Math.floor(r() * 8)}/${digits}`, bar: digits, flaw: real ? null : pick(r, ['blur', 'mismatch', 'name']) };
  if (c.certCard.flaw === 'mismatch') c.certCard.bar = String(10000 + Math.floor(r() * 89999));
  if (c.certCard.flaw === 'name') c.certCard.alt = pick(r, MODELS.filter(m => m.id !== c.modelId)).name;
}
function certCardHTML(c) {
  const cc = c.certCard, m = A.modelById(c.modelId);
  return `<div class="certc ${cc.flaw === 'blur' ? 'blur' : ''}"><div class="ch">${esc(CERT_ORG)}</div><div class="ct">ใบรับรองพระแท้</div>
    <div class="cr"><span>ชื่อพระ</span><b>${esc(cc.flaw === 'name' ? cc.alt : m.name)}</b></div><div class="cr"><span>เลขที่</span><b>${esc(cc.no)}</b></div>
    <div class="cbt"><div class="seal">ตรวจแล้ว<br>สต.</div><div class="cbar"><i></i><small>${esc(cc.bar)}</small></div></div></div>`;
}
function certCheckHTML(c) {
  return `<h2>ตรวจใบเซอร์</h2><p class="note">ดูให้ดีว่าใบนี้ของจริงไหม ใบปลอมมักมีจุดผิดให้สังเกต เช่น เลขที่ไม่ตรงกับบาร์โค้ด ตราประทับเบลอ หรือชื่อพระไม่ตรงกับองค์</p>${certCardHTML(c)}<p class="note">องค์ที่ลูกค้านำมา: ${esc(A.modelById(c.modelId).name)}</p><div class="row"><button class="btn ok" data-close>ส่องพระต่อ</button></div>`;
}
function checkCert() {
  const c = A.curPiece(); if (!c || !c.certCard) return;
  if (!c.certPaid) { if (S().money < 500) return A.toast('เงินไม่พอค่าตรวจใบเซอร์', 'bad'); S().money -= 500; c.certPaid = true; A.save(); }
  A.openModal(certCheckHTML(c)); A.render();
}

/* ===== ลูกค้าที่โดนแผงอื่นหลอก (โอกาสช่วยทำบุญ) ===== */
function victimCustomer(r) {
  if (A.lvl() < 2 || r() > .06 * goodMult()) return null;
  const m = pick(r, MODELS.filter(x => x.lvl <= Math.max(2, A.lvl()) && x.kind === 'flat')), lost = round100(m.price * (.3 + r() * .4));
  return { id: S().nextId++, victim: true, name: pick(r, ['ป้าสายใจ', 'ลุงใจดี', 'น้องนักศึกษา']), line: `โดนแผงอื่นหลอกขายองค์นี้ไป ${fmt(lost)} เพิ่งรู้ว่าเก๊ ทำยังไงดีคะ`, modelId: m.id, genuine: false, spec: A.mutate(m.spec, 2, r, 'easy'), cond: 80, ask: lost, patience: 3, seed: Math.floor(r() * 1e9) };
}
function victimActs(c) {
  return `<button class="btn dim" data-a="k:vno">ไม่ช่วย</button><button class="btn" data-a="k:vadvise">แนะนำให้แจ้งความ</button><button class="btn ok" data-a="k:vhelp">ช่วยรับคืน<small>${fmt(Math.round(c.ask / 2))}</small></button>`;
}

/* ===== ตรวจรับของ (Lv.3+): 8% ที่ลูกค้าสลับองค์ตอนส่งมอบ ===== */
let RECV = null;
function startReceive(c) {
  const r = rng(c.seed + 99), swap = A.lvl() >= 3 && r() < .08, m = A.modelById(c.modelId);
  const p = swap ? { modelId: c.modelId, genuine: false, spec: { ...A.mutate(m.spec, 2, r), ...(c.spec.sub ? { sub: c.spec.sub } : {}) }, cond: Math.max(60, c.cond - 6), seed: c.seed + 7 } : { modelId: c.modelId, genuine: c.genuine, spec: c.spec, cond: c.cond, seed: c.seed };
  RECV = { c, p, swap }; A.setMode('recv');
}
function recvAct(a) {
  if (!RECV) return; const { c, p, swap } = RECV;
  if (a === 'accept') { RECV = null; A.setMode('shop'); A.finishBuy(c, p, swap); return; }
  if (swap) { RECV = null; A.gainXP(25); A.toast('จับได้! องค์ที่ส่งมอบไม่ใช่องค์ที่ส่องไว้ ลูกค้ายอมคืนเงินแล้วรีบเดินออกไป (+25 XP)', 'good'); A.setMode('shop'); A.rejectCustomer(c); return; }
  RECV = null; c.patience = Math.max(0, c.patience - 1); S().rep = Math.max(0, S().rep - 1); A.toast('องค์เดิมจริง ลูกค้าไม่พอใจที่โดนกล่าวหา (ชื่อเสียง −1)', 'bad'); A.setMode('shop');
}

/* ===== ข่าวลือว่าร้านขายของเก๊ (คู่แข่งปล่อย) ===== */
function rumorHTML() {
  const certs = S().inv.filter(i => i.cert === true && i.genuine).length;
  return `<h2>แก้ข่าวลือ</h2><p>คู่แข่งปล่อยข่าวว่าร้านคุณขายของเก๊ ชื่อเสียงจะลดลงทุกวันจนกว่าจะแก้ข่าว</p><div class="opts">
    <button class="btn opt" data-k="rshow" ${certs < 3 ? 'disabled' : ''}><b>โชว์พระมีใบรับรอง 3 องค์</b><small>${certs < 3 ? `มีใบรับรองแค่ ${certs} องค์ (ต้องส่งตรวจเพิ่ม)` : 'ฟรี • บุญ +2'}</small></button>
    <button class="btn opt" data-k="rlaw" ${S().money < 100000 ? 'disabled' : ''}><b>จ้างทนายแก้ข่าว</b><small>${fmt(100000)}</small></button></div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
function fixRumor(how) {
  if (!S().rumor.on) return;
  if (how === 'rshow') { if (S().inv.filter(i => i.cert === true && i.genuine).length < 3) return; addMerit(2); }
  else { if (S().money < 100000) return; S().money -= 100000; }
  S().rumor = { on: false, day: 0 }; A.closeModal(); A.toast('แก้ข่าวลือเรียบร้อย ลูกค้ากลับมาเชื่อใจร้านคุณ', 'good'); A.render();
}

/* ===== ทำบุญ / ถวายวัด (เพิ่มบุญ ลดกรรมช้า ๆ วันละครั้ง) ===== */
function donateHTML() {
  const used = S().donate.day === S().day;
  return `<h2>ทำบุญ ถวายวัด</h2><p class="note">ทำบุญได้วันละครั้ง ช่วยเพิ่มบุญและลดกรรมทีละน้อย ตอนนี้ บุญ ${S().merit} • กรรม ${S().karma}</p><div class="opts">
    <button class="btn opt" data-k="d1" ${used || S().money < 50000 ? 'disabled' : ''}><b>ถวายสังฆทาน ${fmt(50000)}</b><small>${used ? 'วันนี้ทำบุญแล้ว' : 'บุญ +5 • กรรม −3'}</small></button>
    <button class="btn opt" data-k="d2" ${used || S().money < 500000 ? 'disabled' : ''}><b>ทำบุญใหญ่สร้างศาลา ${fmt(500000)}</b><small>${used ? 'วันนี้ทำบุญแล้ว' : 'บุญ +15 • กรรม −10'}</small></button></div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
function donate(k) {
  const [cost, m, kr] = k === 'd2' ? [500000, 15, 10] : [50000, 5, 3];
  if (S().donate.day === S().day || S().money < cost) return;
  S().money -= cost; addMerit(m); addKarma(-kr); S().donate.day = S().day; A.tlog(`ทำบุญ ${fmt(cost)} บุญ +${m} กรรม −${kr}`, 'good'); A.reModal(donateHTML()); A.render();
}

/* ===== สายเทาที่ผู้เล่นเลือกได้ (ยืนยันทุกครั้ง) ===== */
let PENDING = null;
function confirmGrey(title, desc, fn) { PENDING = fn; A.openModal(`<h2>ยืนยัน: ${esc(title)}</h2><p class="warn">ทางเลือกสายเทา</p><p>${esc(desc)}</p><div class="row"><button class="btn dim" data-close>ยกเลิก</button><button class="btn no" data-k="yes">ยืนยัน</button></div>`); }
// แต่งผิวพระ: สภาพ +10–20 (฿2,000)
function dressPiece() {
  const it = A.curPiece(); if (!it || it.dressed || it.consign) return;
  confirmGrey('แต่งผิวพระ', `จ่าย ${fmt(2000)} แต่งผิวให้ดูสภาพดีขึ้น 10–20 แต้ม ตอนปล่อยเช่าต้องเลือกว่าจะบอกผู้ซื้อหรือไม่`, () => {
    if (S().money < 2000) return A.toast('เงินไม่พอ', 'bad'); S().money -= 2000; const up = 10 + Math.floor(Math.random() * 11);
    it.cond = Math.min(100, it.cond + up); it.dressed = true; A.closeModal(); A.relook(); A.toast(`แต่งผิวแล้ว สภาพ +${up}`); A.render();
  });
}
// ตัวเลือกตอนปล่อยเช่า: บอก/ไม่บอกว่าแต่งผิว, ส่งเข้างานประมูล (+ จ้างหน้าม้า)
function sellChoice(it) { return it.dressed || A.aucToday(); }
function sellHTML(it) {
  const p = A.offerFor(it), opt = (k, t, sub, cls = '') => `<button class="btn opt ${cls}" data-k="${k}"><b>${t}</b><small>${sub}</small></button>`;
  let h = `<h2>ปล่อยเช่า</h2><p>มีคนให้เช่า <b>${fmt(p)}</b></p><div class="opts">`;
  if (it.dressed) h += opt('stell', `บอกผู้ซื้อว่าแต่งผิว ${fmt(Math.round(p * .85))}`, 'ราคา −15% • บุญ +2') + opt('slie', `ไม่บอก ${fmt(p)}`, 'สายเทา: ราคาเต็ม แต่กรรม +10 และอาจโดนจับได้', 'grey');
  else h += opt('snorm', `ปล่อยเช่าตามปกติ ${fmt(p)}`, 'ขายให้เซียนที่มาขอเช่า');
  if (A.aucToday() && !it.dressed) h += opt('sauc', 'ส่งเข้างานประมูลวันนี้', 'ราคาผันผวน 85–125% ของราคาตลาด') + opt('sshill', 'ส่งเข้าประมูล + จ้างหน้าม้า', 'สายเทา: ราคา +20% แต่กรรม +10', 'grey');
  return h + `</div><div class="row"><button class="btn dim" data-close>ยกเลิก</button></div>`;
}
function doSell(k) {
  const it = A.ownItem(); if (!it) return; const base = A.offerFor(it);
  const go = (price, msg, kind) => { A.closeModal(); A.sellAt(it, price, msg, kind); };
  if (k === 'snorm') return go(base);
  if (k === 'stell') { addMerit(2); return go(Math.round(base * .85), 'บอกผู้ซื้อตามจริงว่าแต่งผิว บุญ +2'); }
  if (k === 'sauc') return go(round100(base * (.85 + Math.random() * .4)), 'ขายผ่านงานประมูล');
  if (k === 'slie') return confirmGrey('ไม่บอกผู้ซื้อว่าแต่งผิว', 'ได้ราคาเต็ม กรรม +10 และมีโอกาสโดนจับได้', () => {
    addKarma(10); addMerit(-3); S().lies++;
    if (Math.random() < .25) { caught('ผู้ซื้อจับได้ว่าพระถูกแต่งผิวแต่ไม่บอก', 10, 30000); A.closeModal(); A.render(); return; }
    go(base, 'ไม่บอกผู้ซื้อว่าแต่งผิว (กรรม +10)');
  });
  if (k === 'sshill') return confirmGrey('จ้างหน้าม้าในงานประมูล', 'ราคาขาย +20% กรรม +10', () => { addKarma(10); addMerit(-3); go(round100(base * 1.2), 'ขายผ่านงานประมูลโดยมีหน้าม้าช่วยดันราคา (กรรม +10)'); });
}
// ติดสินบนกรรมการประกวด (ใช้ใน runContest)
const BRIBE_COST = 20000;
function bribeOutcome() { addKarma(20); addMerit(-5); if (Math.random() < .2) { caught('นักข่าวแฉว่าคุณติดสินบนกรรมการประกวด', 15, 50000); return 'exposed'; } return 'ok'; }
// ปล่อยข่าวโจมตีคู่แข่ง: คู่แข่งอ่อนลงในการดวล 3 วัน
function attackRival(rid, name) {
  confirmGrey(`ปล่อยข่าวโจมตี${name}`, `${name}จะเสียสมาธิในการดวล 3 วัน (ส่องพลาดง่ายและช้าลง) กรรม +15`, () => {
    addKarma(15); addMerit(-5); S().duel.weak = S().duel.weak || {}; S().duel.weak[rid] = S().day + 3;
    if (Math.random() < .15) caught(`${name}รู้ทันว่าคุณเป็นคนปล่อยข่าว`, 8, 20000); else A.toast(`ข่าวลือเรื่อง${name}แพร่ไปทั่วสนามพระแล้ว`);
    A.closeModal(); A.render();
  });
}
// โดนจับได้: ชื่อเสียงลดหนัก ค่าปรับ ข่าวฉาวในสรุปวัน
function caught(what, rep, fine) {
  S().rep = Math.max(0, S().rep - rep); S().money -= fine; S().caught = true;
  A.tlog(`ข่าวฉาว! ${what} • ชื่อเสียง −${rep} ค่าปรับ ${fmt(fine)}`, 'bad'); A.toast(`ข่าวฉาว! ${what}`, 'bad');
}

/* ===== ทุก endDay: เหตุการณ์ดี/ร้าย ข่าวลือ หน่วยปราบพระปลอม ตกอับ ครบ 120 วัน ===== */
const RAID = 'หน่วยปราบพระปลอมเฉพาะกิจ (สมมติ)';
function karmaDay(lines) {
  const s = S(), r = rng(hash('k:' + s.day + ':' + s.seed));
  if (s.rumor.on) { s.rep = Math.max(0, s.rep - 2); lines.push(['bad', `ข่าวลือว่าร้านขายของเก๊ยังไม่จาง ชื่อเสียง −2 (แก้ข่าวได้ในเมนู ≡)`]); }
  else if (A.lvl() >= 3 && r() < .03 * badMult()) { s.rumor = { on: true, day: s.day }; lines.push(['bad', 'คู่แข่งปล่อยข่าวว่าร้านคุณขายของเก๊! ชื่อเสียงจะลดลงทุกวันจนกว่าจะแก้ข่าว']); }
  if (r() < .05 * badMult()) {
    const ev = pick(r, ['theft', 'yell']);
    if (ev === 'theft' && s.inv.length) { const it = pick(r, s.inv.filter(i => !i.consign) || []); if (it) { s.inv = s.inv.filter(i => i !== it); lines.push(['bad', `เหตุร้าย: ขโมยขึ้นร้าน ${A.modelById(it.modelId).name} หายไป 1 องค์`]); } }
    else { s.rep = Math.max(0, s.rep - 3); lines.push(['bad', 'เหตุร้าย: ลูกค้าโวยวายหน้าร้านจนคนมุงดู ชื่อเสียง −3']); }
  }
  if (r() < .05 * goodMult()) {
    if (r() < .5) { s.rep = Math.min(100, s.rep + 3); lines.push(['good', 'เรื่องดี: ลูกค้าเก่าบอกต่อว่าร้านคุณซื่อตรง ชื่อเสียง +3']); }
    else { const g = round100(5000 * A.lvl() * (1 + r())); s.money += g; lines.push(['good', `เรื่องดี: ผู้ใหญ่ใจดีฝากค่าขนมให้ร้าน ${fmt(g)}`]); }
  }
  // หน่วยปราบพระปลอม: โอกาสเข้าตรวจ = กรรม/300
  if (s.karma > 0 && r() < s.karma / 300) {
    const known = s.inv.filter(i => i.cert === false && !i.consign), fine = s.lies * 20000;
    s.inv = s.inv.filter(i => !known.includes(i)); s.money -= fine;
    lines.push(['bad', `${RAID}เข้าตรวจร้าน! ยึดของเก๊ที่รู้แล้วแต่ยังไม่ทิ้ง ${known.length} องค์${fine ? ` • ปรับย้อนหลังจากการขายแบบไม่บอก ${fmt(fine)}` : ''}`]);
    s.lies = 0;
    if (s.karma >= 90) { s.caught = true; A.queueEnding('jail'); }
  }
  // ตกอับ: เงินติดลบหนักต่อเนื่อง 10 วัน
  s.brokeDays = s.money < -200000 ? s.brokeDays + 1 : 0;
  if (s.brokeDays >= 10 && !s.endings.broke) A.queueEnding('broke');
  else if (s.brokeDays >= 5) lines.push(['bad', `เงินติดลบหนักมา ${s.brokeDays} วันแล้ว ระวังตกอับ!`]);
  // ครบวันที่ 120: ฉากจบตามเส้นทาง
  if (s.day + 1 === 120 && !s.endings.path) A.queueEnding(pathEnding());
}
function pathEnding() { const s = S(); return s.merit >= 80 ? 'dharma' : s.money >= 20000000 && s.karma >= 50 && s.karma <= 89 && !s.caught ? 'godfather' : 'middle'; }

/* ===== ฉากจบทั้งหมด (รวมของเฟส 3) + สมุดฉากจบ (จำข้ามเกมใน META) ===== */
const ENDINGS = {
  dharma: ['เซียนผู้ทรงธรรม', 'คุณยึดความซื่อตรงมาตลอดทาง ลูกค้าทั้งสนามพระเชื่อใจ วัดหลายแห่งยกย่องให้เป็นแบบอย่าง', 'path'],
  godfather: ['เจ้าพ่อวงการพระ', 'เงินทองไหลมาเทมา ทุกแผงต้องเกรงใจ แม้จะมีเรื่องเทา ๆ บ้าง แต่ไม่มีใครจับได้สักครั้ง', 'path'],
  middle: ['เซียนสายกลาง', 'มีขึ้นมีลง มีดีมีพลาด แต่ก็ยืนหยัดในสนามพระได้อย่างมั่นคง', 'path'],
  broke: ['ตกอับ', 'หนี้สินพอกพูนจนต้องพับแผงกลับบ้านไปตั้งหลักใหม่', ''],
  jail: ['โดนจับ', `${RAID}พบหลักฐานมัดตัว เรื่องเทา ๆ ทั้งหมดถูกเปิดโปง`, ''],
  legend: ['ผู้พิทักษ์ตำนาน', 'คุณตามล่าพระในตำนานได้ครบทั้ง 5 องค์ ทั้งวงการยกให้เป็นผู้พิทักษ์ตำนาน', ''],
  patron: ['ผู้อุปถัมภ์พระอารามหลวง', 'วัดที่คุณอุปถัมภ์มาตั้งแต่ยังเป็นสำนักสงฆ์เล็ก ๆ เติบโตจนเป็นพระอารามหลวงชั้นเอก ชาวบ้านเล่าขานถึงเซียนผู้ทำบุญด้วยใจจริง', ''],
  pres: ['นายกสมาคม', 'คุณได้รับเลือกเป็นนายกสมาคมเซียนพระมหาสนุกแห่งประเทศสมมติ เสียงปรบมือดังทั่วศาลาวัด', ''],
};
const PEND = [];
function queueEnding(id) { if (!PEND.includes(id)) PEND.push(id); setTimeout(() => { if (document.getElementById('modal').hidden) popEnding(); }, 0); }
function popEnding() { const id = PEND.shift(); if (id) { showEnding(id); return true; } return false; }
function endingStats() { const s = S(); return [`วันที่ ${s.day}`, `เงิน ${fmt(s.money)}`, `ชื่อเสียง ${s.rep}`, `บุญ ${s.merit} • กรรม ${s.karma}`, `บารมี ${A.starTxt()}`, `พระในตำนาน ${A.legendsOwned()}/5`, `รับเช่า ${s.stats.bought} • ปล่อยเช่า ${s.stats.sold} • ชี้จุดเก๊ถูก ${s.stats.spotted}`]; }
function showEnding(id) {
  const s = S(), [t, d, kind] = ENDINGS[id]; s.endings[id] = s.endings[id] || s.day; if (kind === 'path') s.endings.path = id;
  const mt = meta(); mt.endings[id] = mt.endings[id] || new Date().toISOString().slice(0, 10); saveMeta(mt); A.save();
  const share = `เซียนพระ จำลอง: ได้ฉากจบ "${t}" วันที่ ${s.day} ชื่อเสียง ${s.rep} บุญ ${s.merit} กรรม ${s.karma}`;
  A.openModal(`<div class="ending e-${id}"><p class="ek">ฉากจบ</p><h2>${esc(t)}</h2><p class="ed">${esc(d)}</p><ul class="log">${endingStats().map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="row"><button class="btn" data-k="copy" data-share="${esc(share)}">คัดลอกไปแชร์</button></div>
    <div class="row"><button class="btn dim" data-k="restart">เริ่มใหม่ (เก็บฉายาที่ปลดล็อกไว้)</button><button class="btn ok" data-k="cont:${id}">เล่นต่อ</button></div></div>`);
}
function continueAfter(id) {
  if (id === 'jail') { const s = S(); s.money = Math.round(s.money / 2); s.karma = 60; s.rep = Math.max(0, s.rep - 20); A.toast('พ้นโทษแล้ว เริ่มตั้งตัวใหม่ (เงินหายครึ่งหนึ่ง กรรมเหลือ 60)'); }
  if (id === 'broke') { S().loan = { amt: 0, day: 0 }; S().money = 20000; S().brokeDays = 0; A.toast('ญาติช่วยปลดหนี้ให้ เริ่มใหม่ด้วยทุน ฿20,000'); }
  A.closeModal(); A.render();
}
function endingBookHTML() {
  const mt = meta();
  return `<h2>สมุดฉากจบ</h2><p class="note">ฉากจบและฉายาที่ปลดล็อกแล้วจะถูกจำไว้แม้เริ่มเกมใหม่</p>` +
    Object.entries(ENDINGS).map(([k, [t, d]]) => mt.endings[k] || S().endings[k] ? `<div class="mdl"><b>✓ ${esc(t)}</b><p class="note">${esc(d)}</p></div>` : `<div class="mdl"><b>???</b><p class="note">ยังไม่ได้ปลดล็อก</p></div>`).join('') + `<div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
const titles = () => Object.keys(meta().endings).map(k => ENDINGS[k] && ENDINGS[k][0]).filter(Boolean);
const endingsLine = () => Object.keys(ENDINGS).map(k => S().endings[k] || meta().endings[k] ? `✓ ${ENDINGS[k][0]}` : '???').join(' • ');

/* ===== โหมด stage 'recv' (ตรวจรับของ) และปุ่มลูกค้าที่โดนหลอก ===== */
const kPiece = mode => mode === 'recv' && RECV ? RECV.p : null;
const kKey = mode => mode === 'recv' && RECV ? 'rv' + RECV.c.id : null;
function kCard(mode) {
  if (mode !== 'recv' || !RECV) return ''; const m = A.modelById(RECV.p.modelId);
  return `<div class="ava">รับ</div><div><div class="who">ตรวจรับของจาก ${esc(RECV.c.name)}</div><div class="line">หมุนดูให้แน่ใจว่าเป็นองค์เดียวกับที่ส่องไว้ก่อนจ่ายเงิน</div></div><div class="pname">${esc(m.name)}</div><div class="facts"><span>สภาพ <b>${RECV.p.cond}/100</b></span><span>ราคาที่ตกลง <b>${fmt(RECV.c.ask)}</b></span></div>`;
}
const kActs = mode => mode === 'recv' ? `<button class="btn no" data-a="k:reject">นี่ไม่ใช่องค์เดิม!</button><button class="btn ok span2" data-a="k:accept">รับของ จ่ายเงิน<small>${fmt(RECV.c.ask)}</small></button>` : '';
function kAct(a) {
  if (a === 'accept' || a === 'reject') return recvAct(a);
  const c = S().queue[0]; if (!c || !c.victim) return;
  if (a === 'vhelp') { const pay = Math.round(c.ask / 2); if (S().money < pay) return A.toast('เงินไม่พอ', 'bad'); S().money -= pay; addMerit(8); addKarma(-2); A.tlog(`ช่วยรับคืนพระเก๊จาก${c.name} ${fmt(pay)} บุญ +8`, 'good'); }
  else if (a === 'vadvise') { addMerit(2); A.toast(`แนะนำ${c.name}ให้ไปแจ้งความ บุญ +2`); }
  else A.toast(`${c.name}เดินจากไปอย่างเศร้า ๆ`);
  A.nextCustomer();
}
// ปุ่มใน modal ของโมดูลนี้ (data-k)
function kClick(el) {
  const k = el.dataset.k;
  if (k === 'yes') { const f = PENDING; PENDING = null; if (f) f(); return; }
  if (k === 'rshow' || k === 'rlaw') return fixRumor(k);
  if (k === 'd1' || k === 'd2') return donate(k);
  if (k.startsWith('s')) return doSell(k);
  if (k === 'copy') { const t = el.dataset.share; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => A.toast('คัดลอกแล้ว', 'good'), () => A.toast(t)); return; }
  if (k === 'restart') return A.restartKeep();
  if (k.startsWith('cont:')) return continueAfter(k.slice(5));
}

export {
  initKarma, normKarma, addMerit, addKarma, goodMult, badMult, mkHTML, attachCert, checkCert, victimCustomer, victimActs, startReceive, rumorHTML, donateHTML, dressPiece, sellChoice, sellHTML,
  confirmGrey, BRIBE_COST, bribeOutcome, attackRival, karmaDay, queueEnding, popEnding, showEnding, endingBookHTML, titles, endingsLine, kPiece, kKey, kCard, kActs, kAct, kClick, ENDINGS,
};
