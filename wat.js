// เฟส 9: วัดในอุปถัมภ์ — ผู้เล่นเป็น "เซียนผู้อุปถัมภ์" วัดโตจากพระที่จัดสร้าง เงินทำบุญ และความประพฤติ
// ไม่ import จาก game.js: game.js เรียก initWat(api) • ฉาก 3D อยู่ใน watscene.js • ชื่อวัด/คณะกรรมการ/บุคคลทั้งหมดเป็นเรื่องสมมติ
import { clamp, fmt, pick, esc } from './util.js';
import { TEMPLES, RAR } from './data.js';
import { cal, festOn } from './world.js';
import { watEnter, watExit, watSync, watFrame, watPan, watZoom, watRotate, watTime, watPick, watRing, watPhase, PHASE_TH } from './watscene.js';

let A = null;
const S = () => A.S();
function initWat(api) { A = api; }
function normWat(s) {
  s.wat = s.wat || null;
  if (s.wat) { const w = s.wat; w.built = w.built || { kuti: 1, salaS: 1 }; w.vh = w.vh || []; w.hall = w.hall || []; w.fund = w.fund || 0; w.grey = w.grey || 0; w.tier = w.tier || 0; }
  s.watPix = s.watPix ?? true;
}
const W = () => S().wat;
const tName = id => (TEMPLES.find(t => t.id === id) || { name: 'วัด' }).name;
const trust = () => (S().trust || {})[W().tid] ?? 50;
const addTrust = d => { const s = S(); s.trust[W().tid] = clamp(trust() + d, 0, 100); };

/* ===== อาคาร (ตำแหน่งบนผังกำหนดไว้ใน watscene.js) ===== */
const BUILD = {
  ubosot: ['อุโบสถ', 500000, 3, 'ความไว้ใจวัด +1 ต่อวัน • ต้องมีก่อนเป็นวัดราษฎร์', 10],
  kuti: ['กุฏิ', [0, 0, 150000, 400000], [0, 0, 2, 3], 'ขั้นละ 1 วัน: จัดสร้างพระกับวัดนี้เสร็จเร็วขึ้น • พระจำพรรษาเพิ่ม', 0],
  sala: ['ศาลาการเปรียญ', 300000, 2, 'พิธีพุทธาภิเษกใหญ่ขึ้น กระแสเริ่มต้นรุ่นที่จัดสร้างกับวัดนี้ +10', 6],
  chedi: ['เจดีย์', 250000, 2, 'บุญ +1 ต่อวัน • บูรณะเจดีย์เก่าแล้วอาจพบกรุและเบาะแสพระในตำนาน', 8],
  hall: ['หอพระเครื่อง', 350000, 2, 'มอบพระแท้ให้วัดจัดแสดง ได้บุญและชื่อเสียง ผู้มาเยือนเพิ่ม', 6],
  bell: ['หอระฆัง', 120000, 1, 'ตีระฆังเช้าเย็น ผู้มาเยือนเพิ่มเล็กน้อย', 3],
  pier: ['ศาลาท่าน้ำ', 180000, 1, 'เรือพาคนมาวัด ผู้มาเยือนเพิ่ม', 12],
  fair: ['ลานงานวัด', 300000, 2, 'งานวัดประจำปีทุก 30 วัน: สนามพระเปิด ตั้งแผงขายได้ ผู้มาเยือนเพิ่ม', 8],
  school: ['โรงเรียนพระปริยัติ', 400000, 3, 'ลูกศิษย์ทุกสาขาฝีมือ +1 ต่อ 3 วัน', 4],
};
const ORDER = ['ubosot', 'kuti', 'sala', 'chedi', 'bell', 'pier', 'hall', 'kuti', 'fair', 'school'];
const lvOf = id => id === 'kuti' ? W().built.kuti || 0 : W().built[id] ? 1 : 0;
const maxed = id => id === 'kuti' ? lvOf('kuti') >= 3 : lvOf(id) >= 1;
const costOf = id => id === 'kuti' ? BUILD.kuti[1][lvOf('kuti') + 1] : BUILD[id][1];
const daysOf = id => id === 'kuti' ? BUILD.kuti[2][lvOf('kuti') + 1] : BUILD[id][2];
const bName = id => id === 'kuti' ? `กุฏิ (ขั้น ${Math.min(3, lvOf('kuti') + 1)})` : BUILD[id][0];

/* ===== ลำดับขั้นของวัด ===== */
const TIERS = [
  { name: 'สำนักสงฆ์' },
  { name: 'วัดราษฎร์', need: ['ubosot'], kuti: 1, vis: 25, tr: 50, note: 'ได้รับพระราชทานวิสุงคามสีมา' },
  { name: 'พระอารามหลวงชั้นตรี', need: ['ubosot', 'sala', 'chedi'], kuti: 2, vis: 60, tr: 65 },
  { name: 'พระอารามหลวงชั้นโท', need: ['ubosot', 'sala', 'chedi', 'hall', 'bell', 'pier'], kuti: 2, vis: 110, tr: 75 },
  { name: 'พระอารามหลวงชั้นเอก', need: ['ubosot', 'sala', 'chedi', 'hall', 'bell', 'pier', 'fair', 'school'], kuti: 3, vis: 170, tr: 85 },
];
const avgVis = () => { const h = W().vh; return h.length ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : 0; };
const scandalFree = () => !W().scandal || S().day - W().scandal > 30;
function nextReq() {
  const w = W(), T = TIERS[w.tier + 1]; if (!T) return null;
  return [
    [`อาคาร: ${T.need.map(id => BUILD[id][0]).join(' ')}`, T.need.every(id => lvOf(id) >= 1)],
    [`กุฏิ ${T.kuti} ขั้นขึ้นไป`, lvOf('kuti') >= T.kuti],
    [`ผู้มาเยือนเฉลี่ย 7 วัน ≥ ${T.vis} คน (ตอนนี้ ${avgVis()})`, avgVis() >= T.vis],
    [`ความไว้ใจวัด ≥ ${T.tr} (ตอนนี้ ${trust()})`, trust() >= T.tr],
    ['ไม่มีข่าวฉาวกับวัดนี้ใน 30 วันล่าสุด', scandalFree()],
  ];
}

/* ===== ผู้มาเยือน วันพระ งานวัด ===== */
const wanPhra = () => [8, 15, 23, 30].includes(cal().d);
const fairToday = () => !!(W() && W().built.fair && S().day % 30 === 15);
function visitors() {
  const w = W(); let v = 8 + w.tier * 15 + Math.min(30, w.hall.length * 3);
  for (const id in BUILD) if (lvOf(id) && id !== 'kuti') v += BUILD[id][4];
  v += lvOf('kuti') * 3;
  if (wanPhra()) v *= 1.4; if (festOn()) v *= 1.3; if (fairToday()) v *= 2; if ((w.comm || 0) > S().day) v *= .6;
  return Math.round(v);
}
const watCustomers = () => W() && wanPhra() ? 1 : 0;
const monks = () => 2 + lvOf('kuti') * 2 + W().tier * 2;

/* ===== ผลกับโลกพระเครื่อง ===== */
// ส่วนแบ่ง 30% จากการจัดสร้างเข้ากองทุนวัด (เฉพาะวัดในอุปถัมภ์)
function watShare(tid, amt) { if (W() && W().tid === tid && amt > 0) { W().fund += Math.round(amt); W().todayIn = (W().todayIn || 0) + Math.round(amt); } }
function watBatchMods(tid) { const w = W(); if (!w || w.tid !== tid) return { days: 3, hype: 0, mult: 1 }; return { days: Math.max(1, 3 - (lvOf('kuti') - 1)), hype: (w.built.sala ? 10 : 0) + w.tier * 3, mult: 1 + w.tier * .08 }; }
function watGrey(tid) { if (W() && W().tid === tid) W().grey += 1; }
function watScandal(tid, lines) {
  const w = W(); if (!w || w.tid !== tid) return; w.scandal = S().day;
  if (w.insp) { w.insp = 0; addTrust(-25); lines.push(['bad', `ข่าวฉาวออกมาตอนรอผลตรวจเยี่ยม! คณะกรรมการตรวจเยี่ยมยกเลิกการพิจารณาเลื่อนขั้น${tName(w.tid)} • ไว้ใจวัด −25`]); }
}

/* ===== รายวัน: กองทุน → วัดตัดสินใจสร้างเอง, ตรวจเยี่ยม, ด้านมืด ===== */
function watDay(lines) {
  const s = S(), w = W(); if (!w) return; const nm = tName(w.tid), v = visitors();
  w.vh = [...w.vh, v].slice(-7);
  const don = (w.comm || 0) > s.day ? 0 : v * 25; w.fund += don;
  lines.push(['', `${nm} (${TIERS[w.tier].name}): ผู้มาเยือน ${v} คน${wanPhra() ? ' (วันพระ)' : ''}${fairToday() ? ' (งานวัดประจำปี)' : ''} • ทำบุญเข้ากองทุน ${fmt(don + (w.todayIn || 0))} • กองทุน ${fmt(w.fund)}`]);
  w.todayIn = 0;
  // ก่อสร้าง
  if (w.building) {
    w.building.left--;
    if (w.building.left <= 0) {
      const id = w.building.id; if (id === 'kuti') w.built.kuti = (w.built.kuti || 0) + 1; else w.built[id] = 1; w.building = null;
      lines.push(['gold', `${nm}สร้าง${id === 'kuti' ? `กุฏิขั้น ${w.built.kuti}` : BUILD[id][0]}เสร็จแล้ว!`]); A.bump('watb');
      if (id === 'chedi') chediFound(lines);
    } else lines.push(['', `${nm}: กำลังสร้าง${bName(w.building.id)} อีก ${w.building.left} วัน`]);
  }
  if (!w.building) {
    const prop = w.prop && !maxed(w.prop) && w.fund >= costOf(w.prop) ? w.prop : null;
    const id = prop || ORDER.find(x => !maxed(x) && w.fund >= costOf(x) && (x !== 'kuti' || lvOf('kuti') < 2 || w.built.hall));
    if (id && trust() >= 20) { w.fund -= costOf(id); w.building = { id, left: daysOf(id) }; if (prop) w.prop = null; lines.push(['good', `เจ้าอาวาสเริ่มสร้าง${bName(id)}${prop ? ' ตามที่คุณเสนอ' : ''} (${daysOf(id)} วัน ใช้กองทุน ${fmt(costOf(id))})`]); }
  }
  // ผลรายวันของอาคาร
  if (w.built.ubosot) addTrust(1);
  if (w.built.chedi) { A.addMerit(1); if (Math.random() < .02) chediFound(lines); }
  if (w.built.school && s.day % 3 === 0) for (const b of s.branches || []) b.skill = Math.min(90, b.skill + 1);
  // ด้านมืด: รุ่นที่จัดสร้างกับวัดนี้ใช้สายเทาบ่อย
  if (w.grey >= 3 && !((w.comm || 0) > s.day)) { w.comm = s.day + 7; w.grey = 0; addTrust(-10); lines.push(['bad', `ข่าว "${nm}กลายเป็นวัดพาณิชย์" แพร่ในโซเชียล ผู้มาเยือนลด ผู้ใจบุญหยุดทำบุญ 7 วัน • เจ้าอาวาสเรียกคุณไปคุย (ไว้ใจ −10)`]); }
  w.grey = Math.max(0, w.grey - .25);
  // ตรวจเยี่ยม → เลื่อนขั้น
  if (w.insp && s.day + 1 >= w.insp) {
    w.insp = 0; const req = nextReq();
    if (req && req.every(r => r[1])) { w.tier++; w.party = w.tier; addTrust(5); s.rep = Math.min(100, s.rep + 5 * w.tier); A.addMerit(3 * w.tier); lines.push(['gold', `🎉 คณะกรรมการตรวจเยี่ยมผ่าน! ${nm}เลื่อนขั้นเป็น${TIERS[w.tier].name} • ชื่อเสียง +${5 * w.tier}`]); A.bump('wattier'); }
    else lines.push(['bad', `คณะกรรมการตรวจเยี่ยม${nm}แล้ว ยังไม่ผ่านเกณฑ์ ลองใหม่เมื่อพร้อม`]);
  } else if (!w.insp && nextReq() && nextReq().every(r => r[1])) { w.insp = s.day + 3; lines.push(['gold', `${nm}ผ่านเกณฑ์ขั้น${TIERS[w.tier + 1].name}แล้ว คณะกรรมการตรวจเยี่ยม (สมมติ) จะมาวันที่ ${w.insp} อย่าให้มีข่าวฉาวระหว่างนี้!`]); }
  if (w.tier >= 4 && s.merit >= 50 && !s.endings.patron) A.queueEnding('patron');
}
function chediFound(lines) {
  const s = S(), w = W();
  if (Math.random() < .5 && !s.dig.invite) { s.dig = { invite: w.tid, until: s.day + 4 }; lines.push(['gold', `บูรณะเจดีย์เก่าที่${tName(w.tid)}แล้วพบกรุ! เชิญคุณไปช่วยขุด (เมนู ≡ → นอกร้าน)`]); }
  const c = A.addClue('เจดีย์เก่า'); if (c) lines.push(['gold', c]);
}

/* ===== หน้าต่างวัด ===== */
function abbotLine() {
  const t = trust(), w = W();
  if ((w.comm || 0) > S().day) return 'โยม… คนเขาว่าวัดเราค้าขายเกินงาม อาตมาไม่สบายใจเลย ช่วยกันทำให้ถูกต้องเถิด';
  if (t >= 70) return 'อนุโมทนากับโยมด้วย วัดเจริญขึ้นมากเพราะความตั้งใจดีของโยม';
  if (t >= 40) return 'ทำพระให้ซื่อตรง แล้ววัดก็จะเจริญเองนะโยม';
  if (t >= 20) return 'อาตมาเตือนแล้วนะโยม อย่าเอาชื่อวัดไปปั่นราคา';
  return 'อาตมาขอไม่ร่วมงานกับโยมแล้ว ข้อเสนอใด ๆ วัดไม่รับ';
}
function infoHTML() {
  const s = S(), w = W(), req = nextReq(), T = TIERS[w.tier + 1];
  const blds = Object.keys(BUILD).map(id => { const done = maxed(id), lv = lvOf(id), cur = w.building && w.building.id === id;
    return `<div class="wbrow ${done ? 'done' : ''}"><span><b>${esc(id === 'kuti' ? `กุฏิ ${lv}/3` : BUILD[id][0])}</b>${done ? ' ✓' : cur ? ' 🏗️ กำลังสร้าง' : ''}<small>${esc(BUILD[id][3])}</small></span>${done || cur ? '' : `<button class="btn" data-t="prop:${id}" ${w.prop === id ? 'disabled' : ''}>${w.prop === id ? 'เสนอแล้ว' : `เสนอ ${fmt(costOf(id))}`}</button>`}</div>`; }).join('');
  return `<h2>${esc(tName(w.tid))}</h2><p><span class="badge gold">${TIERS[w.tier].name}</span> ไว้ใจวัด <b>${trust()}</b> • กองทุนวัด <b>${fmt(w.fund)}</b> • ผู้มาเยือนเฉลี่ย ${avgVis()} คน • พระจำพรรษา ${monks()} รูป</p>
    <div class="abbot"><b>เจ้าอาวาส:</b> “${esc(abbotLine())}”</div>
    ${w.building ? `<p>🏗️ กำลังสร้าง${esc(bName(w.building.id))} อีก ${w.building.left} วัน</p>` : ''}${w.insp ? `<p class="gold">คณะกรรมการตรวจเยี่ยมจะมาวันที่ ${w.insp}</p>` : ''}
    <h3>${T ? `เกณฑ์เลื่อนขั้นเป็น${T.name}` : 'ถึงขั้นสูงสุดแล้ว'}</h3>${req ? `<ul class="req">${req.map(([t, ok]) => `<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${esc(t)}</li>`).join('')}</ul>` : ''}
    <h3>อาคาร</h3><p class="note">วัดสร้างเองตามลำดับความจำเป็นเมื่อกองทุนพอ คุณเสนออาคารที่อยากให้สร้างก่อนได้</p><div class="wbs">${blds}</div>
    ${w.built.hall ? `<h3>หอพระเครื่อง (${w.hall.length} องค์)</h3><p class="note">มอบพระแท้ให้วัดจัดแสดง ได้บุญและชื่อเสียงตามความหายาก</p><div class="row"><button class="btn" data-t="hallpick">มอบพระให้วัด</button></div>${w.hall.length ? `<p class="note">${esc(w.hall.join(' • '))}</p>` : ''}` : ''}
    ${fairToday() ? '<div class="row"><button class="btn ok" data-t="fairstall">ตั้งแผงในงานวัดประจำปี</button></div>' : ''}
    <h3>ตั้งค่า</h3><div class="row"><button class="btn" data-t="pix" aria-pressed="${!!s.watPix}">ภาพพิกเซล: ${s.watPix ? 'เปิด' : 'ปิด'}</button><button class="btn dim" data-t="choose">เปลี่ยนวัดในอุปถัมภ์</button></div>
    <div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
let SW = null;
function chooseHTML() {
  const s = S(), cur = W() && W().tid;
  return `<h2>เลือกวัดในอุปถัมภ์</h2><p>คุณเป็น "เซียนผู้อุปถัมภ์" ที่ทำงานร่วมกับวัด ไม่ได้สั่งงานพระโดยตรง วัดจะโตจากพระที่คุณจัดสร้างกับวัด (ส่วนแบ่ง 30% เข้ากองทุนวัด) เงินทำบุญ และความประพฤติของคุณ</p>
    <p class="note">เลือกได้ 1 วัดที่ไว้ใจคุณ 40 ขึ้นไป • ถ้าเปลี่ยนวัด ความคืบหน้าของวัดเดิมจะหายและความไว้ใจลด 20</p><div class="opts">${TEMPLES.map(t => { const tr = s.trust[t.id] ?? 50;
      return `<button class="btn opt" data-t="pick:${t.id}" ${tr < 40 || t.id === cur ? 'disabled' : ''}><b>${esc(t.name)}${t.id === cur ? ' (ปัจจุบัน)' : ''}</b><small>ไว้ใจ ${tr}${tr < 40 ? ' • ต้องไว้ใจ 40 ขึ้นไป' : ''}</small></button>`; }).join('')}</div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
function pickTemple(id) {
  const s = S();
  if (s.wat && s.wat.tid !== id) { if (SW !== id) { SW = id; A.toast(`แตะอีกครั้งเพื่อยืนยัน: ความคืบหน้าของ${tName(s.wat.tid)}จะหายและไว้ใจลด 20`, 'bad'); return; } s.trust[s.wat.tid] = clamp((s.trust[s.wat.tid] ?? 50) - 20, 0, 100); }
  SW = null; s.wat = { tid: id, tier: 0, built: { kuti: 1, salaS: 1 }, fund: 0, vh: [], hall: [], grey: 0, since: s.day };
  A.toast(`คุณเป็นผู้อุปถัมภ์${tName(id)}แล้ว`, 'good'); A.closeModal(); openWat();
}
function propose(id) {
  const w = W(), t = trust(); if (maxed(id)) return;
  if (t < 20) return A.toast('เจ้าอาวาสไม่รับข้อเสนอของคุณแล้ว', 'bad');
  if (t < 60 && Math.random() < .5) { A.toast('เจ้าอาวาส: "ขอคิดดูก่อนนะโยม" (ไว้ใจ 60 ขึ้นไปจะรับข้อเสนอเสมอ)', 'bad'); A.reModal(infoHTML()); return; }
  w.prop = id; A.toast(`เจ้าอาวาสรับข้อเสนอ: จะสร้าง${bName(id)}เมื่อกองทุนพอ`, 'good'); A.reModal(infoHTML());
}
const DON = [1000, 10000, 100000];
function donateHTML() { return `<h2>ทำบุญเข้ากองทุนวัด</h2><p>กองทุน${esc(tName(W().tid))} ${fmt(W().fund)}</p><div class="opts">${DON.map(a => `<button class="btn opt" data-t="don:${a}" ${S().money < a ? 'disabled' : ''}><b>${fmt(a)}</b><small>บุญ +${Math.max(1, Math.round(Math.log10(a) - 2))}</small></button>`).join('')}</div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`; }
function donate(a) { const s = S(); a = +a; if (s.money < a) return; s.money -= a; W().fund += a; A.addMerit(Math.max(1, Math.round(Math.log10(a) - 2))); addTrust(a >= 100000 ? 3 : 1); A.toast(`ทำบุญ ${fmt(a)} เข้ากองทุนวัดแล้ว`, 'good'); A.reModal(donateHTML()); A.render(); }
const hallOK = it => it.genuine && !it.consign && !it.share && it.cert !== false;
function hallPickHTML() { const list = S().inv.filter(hallOK); return `<h2>มอบพระให้หอพระเครื่อง</h2><p class="note">ต้องเป็นพระแท้ (วัดตรวจแล้วจึงรับ) ของเก๊จะถูกปฏิเสธและเสียความไว้ใจ</p>${list.length ? `<div class="opts">${S().inv.filter(it => !it.consign && !it.share).map(it => `<button class="btn opt" data-t="hall:${it.id}"><b>${esc(A.modelById(it.modelId).name)}</b><small>สภาพ ${it.cond} • ${RAR[A.modelById(it.modelId).rar || 'common'][0]}</small></button>`).join('')}</div>` : '<p>ไม่มีพระที่มอบได้</p>'}<div class="row"><button class="btn dim" data-t="info">กลับ</button></div>`; }
const HALLV = { common: [2, 1], rare: [4, 2], epic: [8, 4], legend: [15, 8] };
function giveHall(id) {
  const s = S(), it = s.inv.find(x => String(x.id) === String(id)); if (!it) return; const m = A.modelById(it.modelId);
  s.inv = s.inv.filter(x => x !== it);
  if (!it.genuine) { addTrust(-15); A.addKarma(2); A.toast(`วัดตรวจแล้วพบว่า ${m.name} เป็นของเก๊! เจ้าอาวาสผิดหวังมาก ไว้ใจ −15`, 'bad'); A.reModal(infoHTML()); A.render(); return; }
  const [mer, rep] = HALLV[m.rar || 'common'] || HALLV.common; W().hall.push(m.name); A.addMerit(mer); s.rep = Math.min(100, s.rep + rep); addTrust(2);
  A.toast(`มอบ ${m.name} ให้หอพระเครื่องแล้ว บุญ +${mer} ชื่อเสียง +${rep}`, 'good'); A.reModal(infoHTML()); A.render();
}
// งานวัดประจำปี: ตั้งแผงขายได้ 3 องค์ ราคา +10%
function fairStallHTML() { const s = S(), left = 3 - (W().fairSold === s.day ? W().fairN || 0 : 0), list = s.inv.filter(it => !it.consign && !it.pend && it.cert !== false); return `<h2>แผงพระในงานวัดประจำปี</h2><p>คนเดินงานเยอะ ขายได้ราคาดีกว่าหน้าร้าน 10% (เหลือ ${left} องค์วันนี้)</p>${list.length && left > 0 ? `<div class="opts">${list.map(it => `<button class="btn opt" data-t="fsell:${it.id}"><b>${esc(A.modelById(it.modelId).name)}</b><small>ได้ราว ${fmt(Math.round(A.offerFor(it) * 1.1))}</small></button>`).join('')}</div>` : '<p>วันนี้ขายครบแล้วหรือไม่มีของขาย</p>'}<div class="row"><button class="btn dim" data-close>ปิด</button></div>`; }
function fairSell(id) { const s = S(), w = W(), it = s.inv.find(x => String(x.id) === String(id)); if (!it || !fairToday()) return; if (w.fairSold !== s.day) { w.fairSold = s.day; w.fairN = 0; } if (w.fairN >= 3) return; w.fairN++; A.sellAt(it, Math.round(A.offerFor(it) * 1.1), 'ขายในงานวัด'); A.openModal(fairStallHTML()); }

/* ===== โหมด stage "wat" ===== */
let ON = false, LT = 0, FPS = [], BUB = null;
function sceneState() {
  const s = S(), w = W(), f = festOn(), bt = s.batches.filter(b => b.temple === w.tid).slice(-1)[0];
  const fest = fairToday() ? 'fair' : f && ['songkran', 'loy', 'ok'].includes(f.id) ? f.id : w.built.ubosot && (s.day % 9 === 4) ? 'ordain' : null;
  return { built: w.built, building: w.building, fest, monks: monks(), crowd: clamp(Math.round(visitors() / 6), 3, s.watSlow ? 16 : 26), sian: !!bt };
}
function openWat() {
  const s = S(); if (!s.wat) { A.openModal(chooseHTML()); return; }
  A.setMode('wat');
}
function watStart(R) {
  const s = S(); ON = true; LT = performance.now(); FPS = [];
  A.pixel(!!s.watPix);
  const st = document.getElementById('stage'), asp = st.clientWidth / (st.clientHeight || 1);
  watEnter(R, { state: sceneState(), maxPeople: s.watSlow ? 24 : 40, slow: !!s.watSlow, t0: .12, zoom: clamp(asp * .9, .55, 1) });
  if (W().party) { const t = W().party; W().party = 0; A.sfx('level'); A.openModal(`<div class="announce"><p class="big">🎉 ฉลอง! 🎉</p><h2>${esc(tName(W().tid))}</h2><p>ได้เลื่อนขั้นเป็น <b>${TIERS[t].name}</b></p><p>ชาวบ้านมาร่วมงานกันเต็มวัด ขอบคุณผู้อุปถัมภ์!</p><div class="row"><button class="btn ok" data-close>สาธุ</button></div></div>`); }
}
function watStop() { if (!ON) return; ON = false; watExit(); A.pixel(false); hideBubble(); }
function watFrameHook(R, w, h) {
  if (!ON) watStart(R);
  const now = performance.now(), dt = (now - LT) / 1000; LT = now;
  if (FPS.length < 120) { FPS.push(dt); if (FPS.length === 120 && !S().watSlow) { const avg = FPS.slice(20).reduce((a, b) => a + b, 0) / 100; if (avg > 1 / 28) { S().watSlow = true; A.toast('เครื่องช้า ลดจำนวนคนและต้นไม้ในฉากวัดอัตโนมัติ'); watExit(); ON = false; } } }
  watFrame(dt, w, h, ph => { if ((ph === 'morning' || ph === 'evening') && W().built.bell) { bell(); watRing(); } const el = document.getElementById('watph'); if (el) el.textContent = PHASE_TH[ph]; });
  if (BUB && performance.now() > BUB.until) hideBubble();
}
// ระฆังวัด: เสียงสังเคราะห์ (ฐานต่ำ + ฮาร์มอนิกไม่ลงตัวแบบระฆังโลหะ)
function bell() {
  const a = A.audio(); if (!a) return; const g = a.createGain(), t = a.currentTime + .02; g.gain.value = .35 * (S().vol ? S().vol.sfx : 1); g.connect(a.destination);
  for (let k = 0; k < 3; k++) for (const [r, v, d] of [[1, .5, 4], [2.4, .2, 2.5], [3.9, .1, 1.6], [5.3, .05, 1]]) {
    const o = a.createOscillator(), e = a.createGain(), tt = t + k * 1.4; o.frequency.value = 196 * r; e.gain.setValueAtTime(.0001, tt); e.gain.exponentialRampToValueAtTime(v, tt + .01); e.gain.exponentialRampToValueAtTime(.0001, tt + d); o.connect(e).connect(g); o.start(tt); o.stop(tt + d + .1);
  }
}
function watCard() {
  const w = W(), ph = watPhase();
  return `<div class="ava">วัด</div><div><div class="who">${esc(tName(w.tid))} <span class="badge gold">${TIERS[w.tier].name}</span></div><div class="line">ช่วง<span id="watph">${PHASE_TH[ph]}</span> • ผู้มาเยือนวันนี้ราว ${visitors()} คน${wanPhra() ? ' • วันพระ' : ''}${fairToday() ? ' • งานวัดประจำปี!' : ''}</div>
    <div class="facts"><span>กองทุน <b>${fmt(w.fund)}</b></span><span>ไว้ใจ <b>${trust()}</b></span>${w.building ? `<span>🏗️ ${esc(bName(w.building.id))} อีก ${w.building.left} วัน</span>` : ''}</div></div>`;
}
const watActs = () => `<div class="ar"><button class="btn" data-a="t:rl" aria-label="หมุนซ้าย 90 องศา">⟲ หมุน</button><button class="btn" data-a="t:rr" aria-label="หมุนขวา 90 องศา">หมุน ⟳</button><button class="btn" data-a="t:time">ข้ามเวลา</button></div><div class="ar"><button class="btn dim" data-a="t:back">กลับร้าน</button><button class="btn" data-a="t:info">ข้อมูลวัด</button><button class="btn ok" data-a="t:don">ทำบุญ</button></div>`;
function watAct(a) {
  if (a === 'rl') watRotate(-1); else if (a === 'rr') watRotate(1); else if (a === 'time') { const order = [.1, .35, .55, .75, .9], cur = order.findIndex(x => x > (watPhaseT())); watTime(order[cur < 0 ? 0 : cur]); const el = document.getElementById('watph'); if (el) el.textContent = PHASE_TH[watPhase()]; }
  else if (a === 'back') A.toShop(); else if (a === 'info') A.openModal(infoHTML()); else if (a === 'don') A.openModal(donateHTML());
}
const watPhaseT = () => ({ morning: .1, day: .35, afternoon: .55, evening: .75, night: .9 })[watPhase()];
// แตะคน: กล่องคำพูดสั้น ๆ (พูดถึงรุ่นที่จัดสร้างกับวัดนี้ ตามกระแสและ heat บางคนให้เบาะแส)
function talk(type) {
  const s = S(), w = W(), bt = s.batches.filter(b => b.temple === w.tid && b.open).slice(-1)[0], nm = bt && A.modelById(bt.modelId) ? A.modelById(bt.modelId).name : '';
  if (type === 'monk') return pick(Math.random, ['เจริญพร โยม', 'วันนี้ญาติโยมมาทำบุญกันเยอะ', wanPhra() ? 'วันพระวันนี้ เย็นนี้มีเทศน์นะโยม' : 'ขอให้โยมค้าขายสุจริตนะ', w.tier ? `วัดเราเป็น${TIERS[w.tier].name}แล้ว อนุโมทนา` : 'อยากได้โบสถ์สักหลังจังโยม']);
  if (type === 'worker') return 'กำลังเร่งสร้างอยู่ครับ อีกไม่กี่วันเสร็จ!';
  if (type === 'kid') return pick(Math.random, ['เล่นซ่อนแอบกันไหม!', 'หลวงพี่ให้ขนมด้วย', fairToday() ? 'อยากขึ้นชิงช้าสวรรค์!' : 'เมื่อไหร่จะมีงานวัดอีก']);
  if (nm && bt.heat >= 40) return `${nm} แพงเกินไปแล้ว ได้ข่าวว่าปั่นราคากันหรือเปล่า?`;
  if (nm && bt.hype >= 50) return `มาเช่า ${nm} ค่ะ ได้ยินว่ากำลังดัง!`;
  if (type === 'sian' || (type === 'elder' && Math.random() < .25)) { const c = Math.random() < .3 ? A.addClue('คนที่วัด') : ''; if (c) return `ได้ยินมาว่า… ${c.replace(/^.*?:\s*/, '')}`; }
  if (type === 'tourist') return pick(Math.random, ['วัดสวยมาก ถ่ายรูปได้ไหมคะ', 'Very beautiful temple!', 'ศาลาท่าน้ำวิวดีจัง']);
  if (type === 'elder') return pick(Math.random, ['มาทำบุญทุกวันพระจ้ะ', 'สมัยก่อนวัดนี้มีแค่กุฏิหลังเดียว', 'ขอให้ร่ำรวยนะลูก']);
  return pick(Math.random, ['มาไหว้พระครับ', 'ซุ้มเช่าพระหน้าวัดมีอะไรใหม่บ้าง', nm ? `${nm} รุ่นนี้สวยนะ` : 'วัดนี้ร่มรื่นดี']);
}
function watTap(x, y, w, h) {
  const p = watPick(x, y, w, h); if (!p) { hideBubble(); return; }
  let el = document.getElementById('watBub'); if (!el) { el = document.createElement('div'); el.id = 'watBub'; el.className = 'watbub'; document.getElementById('stage').appendChild(el); }
  el.textContent = talk(p.type); el.style.left = clamp(p.sx, 80, w - 80) + 'px'; el.style.top = Math.max(8, p.sy - 50) + 'px'; el.hidden = false; BUB = { until: performance.now() + 3500 };
}
function hideBubble() { const el = document.getElementById('watBub'); if (el) el.hidden = true; BUB = null; }
const watLeave = mode => { if (mode === 'wat') watStop(); };
const watRefresh = () => { if (ON) watSync(sceneState()); };

function tClick(el) {
  const [a, b] = el.dataset.t.split(':');
  if (a === 'pick') pickTemple(b); else if (a === 'choose') A.openModal(chooseHTML()); else if (a === 'info') A.openModal(infoHTML()); else if (a === 'prop') propose(b);
  else if (a === 'don') donate(b); else if (a === 'hallpick') A.openModal(hallPickHTML()); else if (a === 'hall') giveHall(b);
  else if (a === 'fairstall') A.openModal(fairStallHTML()); else if (a === 'fsell') fairSell(b);
  else if (a === 'pix') { S().watPix = !S().watPix; A.pixel(S().watPix && ON); A.reModal(infoHTML()); A.save(); }
}
const watUnlocked = () => A.lvl() >= 5 || TEMPLES.some(t => (S().trust[t.id] ?? 50) >= 40);

export {
  initWat, normWat, openWat, watUnlocked, watFrameHook, watLeave, watRefresh, watCard, watActs, watAct, watTap, watPan, watZoom, tClick,
  watDay, watShare, watBatchMods, watGrey, watScandal, watCustomers, fairToday, TIERS,
};
