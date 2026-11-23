// เฟส 7: ช่องทางขายใหม่และชีวิตในร้าน — แชทเสนอพระ, ไลฟ์ขายของในตู้, แต่งร้าน, แมวประจำร้าน, โจรขึ้นร้าน
// ไม่ import จาก game.js: game.js เรียก initLife(api) — แอปแชท ชื่อคน และร้านทั้งหมดเป็นเรื่องสมมติ
import { clamp, rng, hash, fmt, pick, esc, round100 } from './util.js';
import { MODELS } from './data.js';

let A = null;
const S = () => A.S();
function initLife(api) { A = api; }
function normLife(s) {
  s.chats = s.chats || []; s.chatDay = s.chatDay || 0; s.chatPend = s.chatPend || [];
  s.decor = s.decor || { name: 'แผงพระของฉัน', sign: 'wood', bg: 'stall', cases: false, velvet: 'blue', light: 'warm', own: ['wood', 'stall', 'blue', 'warm'] };
  s.cat = s.cat || null; s.sec = s.sec || { safe: false, cctv: false, insUntil: 0 }; s.liveDay = s.liveDay || 0;
}

/* ===== แชทเสนอพระ (แอปสมมติ "แชทพระ") ===== */
const APP = 'แชทพระ';
const SELLERS = ['พี่ต้นพระเก่า', 'คุณเอ๋ของสะสม', 'ลุงหมานบ้านสวน', 'บัญชีชื่อ "ขายด่วนทุกองค์"', 'น้องมายด์มรดกคุณยาย', 'เฮียโตพระสะสม'];
// รูปถ่าย: front/back/side แต่บางรูปเบลอ แสงจ้า หรือถ่ายเฉียง — รูปเป็นองค์จริงที่จะส่ง (ถ้าผู้ขายซื่อ)
function newChat(r) {
  const L = A.lvl(), m = pick(r, MODELS.filter(x => x.kind === 'flat' && x.lvl <= Math.max(2, L))), genuine = r() < .5;
  const scam = r() < .18, swap = !scam && r() < .12, cond = Math.round(70 + r() * 28);
  const spec = genuine ? { ...m.spec } : A.mutate(m.spec, Math.min(2, Object.keys(m.spec).length), r, L >= 5 ? 'fine' : undefined);
  const shots = ['front', 'back', 'side'].slice(0, 2 + Math.floor(r() * 2)).map(v => ({ v, fx: r() < .35 ? pick(r, ['blur', 'glare', 'tilt']) : '' }));
  const price = round100(m.price * A.cf(cond) * (.55 + r() * .25));
  const fresh = scam ? r() < .8 : r() < .15; // บัญชีใหม่ = สัญญาณเตือน
  const lines = [pick(r, ['สวัสดีครับ มีพระมาเสนอครับ', 'สนใจองค์นี้ไหมคะ', 'ของเก่าในบ้าน ขายถูก ๆ ครับ']), `${m.name} สภาพ ${cond} ราคา ${fmt(price)} ${scam ? 'โอนก่อนนะครับ ส่งให้ทันที' : 'ส่งพัสดุให้พรุ่งนี้ครับ'}`];
  if (scam) lines.push(pick(r, ['รีบหน่อยนะครับ มีคนจองต่อคิวอยู่', 'ไม่รับคืน ไม่วิดีโอคอล', 'ถ้าโอนภายใน 10 นาทีลดให้อีก']));
  return { id: S().nextId++, seller: pick(r, SELLERS), age: fresh ? 1 + Math.floor(r() * 4) : 200 + Math.floor(r() * 2000), reviews: fresh ? 0 : 5 + Math.floor(r() * 200), modelId: m.id, genuine, spec, cond, seed: Math.floor(r() * 1e9), price, shots, lines, scam, swap, read: false };
}
function refillChats() {
  const s = S(); if (s.chatDay === s.day || A.lvl() < 2) return; s.chatDay = s.day;
  const r = rng(hash('chat:' + s.day + s.seed)); s.chats = s.chats.filter(c => !c.done).slice(-3);
  for (let i = 0, n = 1 + Math.floor(r() * 2); i < n; i++) s.chats.push(newChat(r));
}
const unread = () => { refillChats(); return S().chats.filter(c => !c.read && !c.done).length; };
function chatListHTML() {
  refillChats(); const s = S(), list = s.chats.filter(c => !c.done);
  return `<div class="chatapp"><div class="cah">${APP} <small>แอปสมมติ</small></div>` + (A.lvl() < 2 ? '<p class="note">ปลดล็อกที่ Lv.2</p>' : list.length ? list.map(c => `<button class="cth" data-l="chat:${c.id}"><span class="cav">${esc(c.seller.slice(0, 1))}</span><span><b>${esc(c.seller)}</b><small>${esc(c.lines[0])}</small></span>${c.read ? '' : '<i class="cdot"></i>'}</button>`).join('') : '<p class="note">ยังไม่มีแชทใหม่</p>') +
    `${s.chatPend.length ? `<p class="note">รอของมาส่ง ${s.chatPend.length} รายการ (มาถึงวันรุ่งขึ้น)</p>` : ''}</div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
function chatHTML(id) {
  const c = S().chats.find(x => String(x.id) === String(id)); if (!c) return chatListHTML(); c.read = true;
  const m = A.modelById(c.modelId), photo = sh => `<figure class="cph ${sh.fx}"><img data-thumb="${sh.v === 'back' ? 'xb' : sh.v === 'side' ? 'xs' : 'x'}:${A.thumbKey(m, c.spec, c.cond, c.seed)}" alt="รูปที่ผู้ขายส่งมา"></figure>`;
  return `<div class="chatapp"><div class="cah"><button class="btn dim cbk" data-l="chats">←</button>${esc(c.seller)} <small>บัญชีอายุ ${c.age} วัน • รีวิว ${c.reviews}</small></div>
    <div class="cmsgs">${c.lines.map((t, i) => `<p class="cm">${esc(t)}</p>${i === 0 ? `<div class="cphs">${c.shots.map(photo).join('')}</div>` : ''}`).join('')}</div>
    <p class="note">ดูรูปให้ดี ของที่ส่งมาจะเป็นองค์ในรูป (ถ้าผู้ขายซื่อ) • โอนแล้วของมาถึงวันรุ่งขึ้น</p>
    <div class="row"><button class="btn no" data-l="cno:${c.id}">ไม่เอา</button><button class="btn ok" data-l="cpay:${c.id}" ${S().money < c.price ? 'disabled' : ''}>โอนเงิน ${fmt(c.price)}</button></div></div>`;
}
function chatPay(id) {
  const s = S(), c = s.chats.find(x => String(x.id) === String(id)); if (!c || c.done || s.money < c.price) return;
  s.money -= c.price; c.done = true; s.chatPend.push({ ...c, arrive: s.day + 1 }); A.toast(`โอน ${fmt(c.price)} ให้${c.seller}แล้ว ของจะมาถึงพรุ่งนี้`); A.reModal(chatListHTML()); A.render();
}
function chatNo(id) { const c = S().chats.find(x => String(x.id) === String(id)); if (c) c.done = true; A.reModal(chatListHTML()); A.render(); }
function chatDeliver(lines) {
  const s = S(), due = s.chatPend.filter(c => c.arrive <= s.day + 1); s.chatPend = s.chatPend.filter(c => !due.includes(c));
  for (const c of due) {
    const m = A.modelById(c.modelId);
    if (c.scam) { lines.push(['bad', `${c.seller} เงียบหาย ไม่ส่ง ${m.name} มาให้ (โดนโกง ${fmt(c.price)}) • สังเกตบัญชีใหม่และการเร่งให้โอน`]); continue; }
    const p = c.swap ? { modelId: c.modelId, genuine: false, spec: A.mutate(m.spec, 2, Math.random), cond: Math.max(55, c.cond - 15), seed: c.seed + 3 } : { modelId: c.modelId, genuine: c.genuine, spec: c.spec, cond: c.cond, seed: c.seed };
    A.addItem(p, c.price); lines.push([c.swap ? 'bad' : 'good', `พัสดุจาก${c.seller}มาถึงแล้ว: ${m.name}${c.swap ? ' (หน้าตาไม่เหมือนในรูป!)' : ''} เก็บเข้าตู้แล้ว ส่อง 3D ได้เต็มที่`]);
  }
}

/* ===== ไลฟ์ขายของในตู้: คนดูสุ่มเสนอราคา ผู้เล่นเลือกจังหวะปิด ===== */
let LV = null;
const liveOK = it => !it.consign && !it.pend && it.cert !== false;
function livePickHTML() {
  const s = S(), list = s.inv.filter(liveOK);
  if (s.liveDay === s.day) return `<h2>ไลฟ์ขายของในตู้</h2><p>วันนี้ไลฟ์ไปแล้ว พรุ่งนี้ค่อยไลฟ์ใหม่</p><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
  return `<h2>ไลฟ์ขายของในตู้</h2><p class="note">เลือกพระ 1 องค์ขึ้นไลฟ์ คนดูจะเสนอราคาแข่งกัน ปิดประมูลเมื่อพอใจ ถ้ารอนานเกินคนดูจะเริ่มออก (วันละครั้ง)</p>` +
    (list.length ? `<div class="opts">${list.map(it => `<button class="btn opt" data-l="live:${it.id}"><b>${esc(A.modelById(it.modelId).name)}</b><small>สภาพ ${it.cond}${it.cert ? ' • มีใบรับรอง' : ''}</small></button>`).join('')}</div>` : '<p>ไม่มีพระที่ขึ้นไลฟ์ได้</p>') + `<div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
const LV_NAMES = ['สายมูตัวจริง', 'เฮียกุ้ยสะสม', 'พี่หนุ่มโคราช', 'คุณนายใจดี', 'เซียนบ้านนอก', 'น้องมิ้นท์', 'ลุงหวัง'];
function startLive(id) {
  const s = S(), it = s.inv.find(x => String(x.id) === String(id)); if (!it || !liveOK(it) || s.liveDay === s.day) return;
  s.liveDay = s.day; const base = A.offerFor(it), cap = round100(base * (.8 + Math.random() * .55));
  LV = { it, bid: round100(base * .4), who: '-', cap, t0: performance.now(), viewers: 80 + Math.floor(Math.random() * 120), log: [], done: false };
  A.openModal(liveHTML()); LV.timer = setInterval(liveTick, 900);
}
function liveTick() {
  if (!LV || LV.done) return; const t = (performance.now() - LV.t0) / 1000;
  if (t > 30) return liveClose(true);
  if (LV.bid < LV.cap && Math.random() < .75) { LV.bid = round100(Math.min(LV.cap, LV.bid * (1.04 + Math.random() * .1))); LV.who = pick(Math.random, LV_NAMES); LV.log.unshift(`${LV.who} เสนอ ${fmt(LV.bid)}`); LV.viewers += Math.floor(Math.random() * 25); }
  else if (LV.bid >= LV.cap) { LV.viewers = Math.max(10, LV.viewers - 15 - Math.floor(Math.random() * 20)); LV.log.unshift('คนดูเริ่มทยอยออก…'); }
  LV.log = LV.log.slice(0, 5); const el = document.getElementById('liveBox'); if (el) el.innerHTML = liveBody(); else liveClose(false, true);
}
const liveBody = () => `<p class="big">${fmt(LV.bid)}</p><p class="note">ผู้นำ: ${esc(LV.who)} • คนดู ${LV.viewers} คน • เหลือเวลา ${Math.max(0, Math.ceil(30 - (performance.now() - LV.t0) / 1000))} วินาที</p><ul class="log">${LV.log.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
function liveHTML() { return `<div class="live"><div class="lvh"><span class="lvdot">● LIVE</span><span>${esc(A.modelById(LV.it.modelId).name)}</span></div><div id="liveBox">${liveBody()}</div><div class="row"><button class="btn ok" data-l="lclose">ปิดประมูลที่ราคานี้</button></div></div>`; }
function liveClose(auto, silent) {
  if (!LV || LV.done) return; LV.done = true; clearInterval(LV.timer); const { it, bid, who } = LV; LV = null; if (silent) return;
  if (who === '-') { A.openModal('<h2>ไลฟ์จบแล้ว</h2><p>ยังไม่มีใครเสนอราคา</p><div class="row"><button class="btn ok" data-close>ปิด</button></div>'); return; }
  A.sellAt(it, bid, `ไลฟ์${auto ? 'หมดเวลา' : 'ปิด'}ประมูล ขายให้${who}`);
  if (S().inv.includes(it)) { A.openModal(`<h2>ดีลล่ม!</h2><p>${esc(who)} ได้ของไปตรวจแล้วพบว่าเป็นพระเก๊ ขอยกเลิกและคืนของ คอมเมนต์ในไลฟ์ด่ากันทั้งคืน</p><div class="row"><button class="btn ok" data-close>ปิด</button></div>`); return; }
  A.openModal(`<h2>ปิดประมูลแล้ว</h2><p>${esc(who)} ได้ ${esc(A.modelById(it.modelId).name)} ไปที่ <b>${fmt(bid)}</b></p><div class="row"><button class="btn ok" data-close>ปิด</button></div>`);
}

/* ===== แต่งร้าน ===== */
const DECOR = {
  sign: { label: 'ป้ายร้าน', opts: { wood: ['ป้ายไม้', 0], gold: ['ป้ายทองฉลุ', 20000], neon: ['ป้ายไฟนีออน', 40000] } },
  bg: { label: 'ฉากหลัง', opts: { stall: ['แผงพื้น', 0], row: ['ห้องแถว (ลูกค้า +1)', 300000], mall: ['ร้านในห้าง (ลูกค้า +2)', 1500000] } },
  velvet: { label: 'ผ้ากำมะหยี่', opts: { blue: ['น้ำเงิน', 0], red: ['แดง', 3000], green: ['เขียว', 3000], purple: ['ม่วง', 3000], black: ['ดำ', 3000] } },
  light: { label: 'ไฟส่องพระ', opts: { warm: ['ไฟเหลืองอุ่น', 0], white: ['ไฟขาวสว่าง', 8000], neon: ['ไฟนีออนชมพู', 15000] } },
};
const extraCustomers = () => { const d = S().decor; return (d.bg === 'row' ? 1 : d.bg === 'mall' ? 2 : 0) + (d.cases ? 1 : 0); };
function decorHTML() {
  const d = S().decor;
  return `<h2>แต่งร้าน</h2><label class="nick">ชื่อร้าน<span class="nrow"><input id="shopName" maxlength="24" value="${esc(d.name)}"><button class="btn" data-l="rename">ตั้งชื่อ</button></span></label>` +
    Object.entries(DECOR).map(([k, D]) => `<h3>${D.label}</h3><div class="decs">${Object.entries(D.opts).map(([v, [n, c]]) => { const own = d.own.includes(v) || !c; return `<button class="btn dec ${d[k] === v ? 'on' : ''}" data-l="dec:${k}:${v}" ${!own && S().money < c ? 'disabled' : ''}>${esc(n)}<small>${d[k] === v ? 'ใช้อยู่' : own ? 'ใช้' : fmt(c)}</small></button>`; }).join('')}</div>`).join('') +
    `<h3>ตู้โชว์</h3><div class="decs"><button class="btn dec ${d.cases ? 'on' : ''}" data-l="case" ${d.cases || S().money < 50000 ? 'disabled' : ''}>ตู้โชว์กระจก (ลูกค้า +1)<small>${d.cases ? 'มีแล้ว' : fmt(50000)}</small></button></div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
function setDecor(k, v) {
  const d = S().decor, c = DECOR[k].opts[v][1];
  if (k === 'bg' && v === 'mall' && A.lvl() < 5) return A.toast('ร้านในห้างปลดล็อกที่ Lv.5', 'bad');
  if (!d.own.includes(v) && c) { if (S().money < c) return; S().money -= c; d.own.push(v); }
  d[k] = v; A.reModal(decorHTML()); A.render();
}
function applyDecor(stage) {
  const d = S().decor; stage.dataset.bg = d.bg; stage.dataset.velvet = d.velvet; stage.dataset.light = d.light; stage.classList.toggle('cases', !!d.cases);
  let sg = document.getElementById('shopSign'); if (!sg) { sg = document.createElement('div'); sg.id = 'shopSign'; sg.className = 'shopsign'; stage.appendChild(sg); }
  sg.textContent = d.name; sg.dataset.style = d.sign;
  A.lightTint(d.light === 'white' ? 0xf4f6ff : d.light === 'neon' ? 0xff9ad8 : null);
}

/* ===== แมวประจำร้าน (SVG วาดเอง) ===== */
const CAT_COLORS = { orange: ['ส้ม', '#e08a3c'], black: ['ดำ', '#2b2522'], white: ['ขาว', '#f2ede4'], tabby: ['ลายสลิด', '#9a8668'] };
const catSVG = col => `<svg viewBox="0 0 80 56" aria-hidden="true"><path d="M70 30 q10 -18 4 -26" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="round" class="tail"/><ellipse cx="44" cy="36" rx="24" ry="13" fill="${col}"/><circle cx="20" cy="26" r="12" fill="${col}"/><path d="M11 18 L13 6 L20 15 Z M23 15 L29 5 L30 18 Z" fill="${col}"/><circle cx="16" cy="25" r="1.8" fill="#222"/><circle cx="23" cy="25" r="1.8" fill="#222"/><path d="M18 30 q1.5 2 3 0" stroke="#222" fill="none" stroke-width="1.2"/><rect x="28" y="44" width="5" height="10" rx="2" fill="${col}"/><rect x="54" y="44" width="5" height="10" rx="2" fill="${col}"/></svg>`;
function catHTML() {
  const c = S().cat;
  if (!c) return `<h2>แมวประจำร้าน</h2><p>มีแมวจรมานั่งหน้าแผงทุกวัน รับเลี้ยงไหม? ต้องให้อาหารทุกวัน บางวันน้องจะคาบของมาให้ หรือทำให้ลูกค้าอารมณ์ดี</p>
    <label class="nick">ตั้งชื่อ<span class="nrow"><input id="catName" maxlength="16" value="เจ้าโชค"></span></label><div class="decs">${Object.entries(CAT_COLORS).map(([k, [n]]) => `<button class="btn dec" data-l="adopt:${k}">รับเลี้ยงแมว${n}</button>`).join('')}</div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
  const fed = c.fed === S().day;
  return `<h2>${esc(c.name)}</h2><div class="catbig">${catSVG(CAT_COLORS[c.col][1])}</div><p>ความรัก ${'♥'.repeat(clamp(Math.ceil(c.love / 20), 0, 5))}${'♡'.repeat(5 - clamp(Math.ceil(c.love / 20), 0, 5))} • ${fed ? 'กินอิ่มแล้ววันนี้' : 'หิวแล้ว!'}${c.hungry ? ` • ไม่ได้กินมา ${c.hungry} วัน` : ''}</p>
    <div class="row"><button class="btn ok" data-l="feed" ${fed || S().money < 200 ? 'disabled' : ''}>ให้อาหาร ${fmt(200)}</button><button class="btn dim" data-close>ปิด</button></div>`;
}
function adopt(col) { if (S().cat) return; const n = (document.getElementById('catName')?.value || 'เจ้าโชค').trim().slice(0, 16) || 'เจ้าโชค'; S().cat = { name: n, col, love: 40, fed: 0, hungry: 0, mood: '' }; A.addMerit(2); A.toast(`รับเลี้ยง${n}แล้ว บุญ +2`, 'good'); A.closeModal(); A.render(); }
function feed() { const c = S().cat; if (!c || c.fed === S().day || S().money < 200) return; S().money -= 200; c.fed = S().day; c.hungry = 0; c.love = Math.min(100, c.love + 8); A.toast(`${c.name}กินอย่างมีความสุข`); A.reModal(catHTML()); A.render(); }
function catDay(lines) {
  const s = S(), c = s.cat; if (!c) return;
  if (c.fed !== s.day) { c.hungry++; c.love = Math.max(0, c.love - 10); lines.push(['bad', `${c.name}หิว ไม่ได้กินมา ${c.hungry} วัน`]); if (c.hungry >= 4) { lines.push(['bad', `${c.name}หนีไปหาบ้านใหม่… (ให้อาหารทุกวันนะ)`]); s.cat = null; A.addMerit(-5); } c.mood = ''; return; }
  const r = Math.random(); c.mood = '';
  if (r < .2) { const g = round100(100 + Math.random() * 1900); s.money += g; lines.push(['good', `${c.name}คาบเหรียญเก่ามาวางไว้ ขายได้ ${fmt(g)}`]); }
  else if (r < .35) { c.mood = 'sleep'; lines.push(['', `${c.name}ชอบนอนทับพระบนถาด (แตะเพื่อไล่)`]); }
  else if (r < .65 * (.5 + c.love / 100)) { c.mood = 'happy'; lines.push(['good', `${c.name}อารมณ์ดี ลูกค้าวันนี้อารมณ์ดีตาม (อดทน +1)`]); }
}
// แมวบน stage: เดินไปมา หรือนอนทับพระ
function renderCat(stage) {
  const c = S().cat; let el = document.getElementById('cat');
  if (!c) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('button'); el.id = 'cat'; el.className = 'cat'; el.setAttribute('aria-label', 'แมวประจำร้าน'); el.dataset.l = 'catpoke'; stage.appendChild(el); }
  el.innerHTML = catSVG(CAT_COLORS[c.col][1]) + (c.mood === 'sleep' ? '<span class="zz">Zzz</span>' : ''); el.classList.toggle('sleep', c.mood === 'sleep');
}
function catPoke() { const c = S().cat; if (!c) return; if (c.mood === 'sleep') { c.mood = ''; A.toast(`${c.name}ลุกไปนอนที่อื่นแล้ว`); } else { c.love = Math.min(100, c.love + 1); A.toast(`${c.name}คลอเคลียมือคุณ`); } A.render(); }
const catPatience = () => S().cat && S().cat.mood === 'happy' ? 1 : 0;

/* ===== โจรขึ้นร้าน + ระบบรักษาความปลอดภัย ===== */
const SEC = { safe: ['ตู้เซฟ', 200000, 'ลดโอกาสโดนขโมยเหลือ 40%'], cctv: ['กล้องวงจรปิด', 100000, 'ลดโอกาส 40% และจับโจรได้ครึ่งหนึ่ง'] };
const INS_COST = 20000;
function secHTML() {
  const s = S(), v = invValue();
  return `<h2>ความปลอดภัยร้าน</h2><p>มูลค่าพระในตู้ราว <b>${fmt(v)}</b> • ยิ่งของแพงยิ่งล่อโจร</p><div class="opts">${Object.entries(SEC).map(([k, [n, c, d]]) => `<button class="btn opt" data-l="sec:${k}" ${s.sec[k] || s.money < c ? 'disabled' : ''}><b>${n} ${s.sec[k] ? '(มีแล้ว)' : fmt(c)}</b><small>${d}</small></button>`).join('')}
    <button class="btn opt" data-l="ins" ${s.money < INS_COST ? 'disabled' : ''}><b>ประกันพระ 7 วัน ${fmt(INS_COST)}</b><small>${s.sec.insUntil > s.day ? `คุ้มครองถึงวันที่ ${s.sec.insUntil} • ` : ''}ถ้าโดนขโมย จ่ายคืน 70% ของมูลค่า</small></button></div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
const invValue = () => S().inv.filter(i => !i.consign && i.cert !== false).reduce((a, i) => a + A.offerFor(i), 0);
function buySec(k) { const s = S(); if (k === 'ins') { if (s.money < INS_COST) return; s.money -= INS_COST; s.sec.insUntil = Math.max(s.sec.insUntil, s.day) + 7; } else { const [, c] = SEC[k]; if (s.sec[k] || s.money < c) return; s.money -= c; s.sec[k] = true; } A.reModal(secHTML()); A.render(); }
function thiefDay(lines) {
  const s = S(), v = invValue(); if (v < 500000) return;
  let p = clamp((v - 500000) / 10000000, 0, .15) * A.badMult(); if (s.sec.safe) p *= .4; if (s.sec.cctv) p *= .6; if (Math.random() > p) return;
  const loot = s.inv.filter(i => !i.consign && i.cert !== false).sort((a, b) => A.offerFor(b) - A.offerFor(a)).slice(0, 1 + Math.floor(Math.random() * 3)), lv = loot.reduce((a, i) => a + A.offerFor(i), 0);
  if (s.sec.cctv && Math.random() < .5) { lines.push(['good', `โจรขึ้นร้านกลางดึก! แต่กล้องวงจรปิดจับภาพได้ ตำรวจตามคืนได้ครบ`]); return; }
  s.inv = s.inv.filter(i => !loot.includes(i));
  lines.push(['bad', `โจรขึ้นร้าน! ขโมยพระไป ${loot.length} องค์ (${loot.map(i => A.modelById(i.modelId).name).join(', ')})`]);
  if (s.sec.insUntil > s.day) { const pay = Math.round(lv * .7); s.money += pay; lines.push(['good', `ประกันพระจ่ายคืน ${fmt(pay)}`]); }
}
function lifeDay(lines) { chatDeliver(lines); catDay(lines); thiefDay(lines); }

/* ===== ปุ่มใน modal/stage (data-l) ===== */
function lClick(el) {
  const [a, b, c] = el.dataset.l.split(':');
  if (a === 'chats') A.openModal(chatListHTML()); else if (a === 'chat') A.openModal(chatHTML(b)); else if (a === 'cpay') chatPay(b); else if (a === 'cno') chatNo(b);
  else if (a === 'livepick') A.openModal(livePickHTML()); else if (a === 'live') startLive(b); else if (a === 'lclose') liveClose(false);
  else if (a === 'decor') A.openModal(decorHTML()); else if (a === 'dec') setDecor(b, c); else if (a === 'case') { if (!S().decor.cases && S().money >= 50000) { S().money -= 50000; S().decor.cases = true; A.reModal(decorHTML()); A.render(); } }
  else if (a === 'rename') { const v = (document.getElementById('shopName')?.value || '').trim().slice(0, 24); if (v.length >= 2) { S().decor.name = v; A.toast(`ตั้งชื่อร้านว่า "${v}" แล้ว`, 'good'); A.reModal(decorHTML()); A.render(); } else A.toast('ชื่อร้านต้องยาว 2 ตัวอักษรขึ้นไป', 'bad'); }
  else if (a === 'catpage') A.openModal(catHTML()); else if (a === 'adopt') adopt(b); else if (a === 'feed') feed(); else if (a === 'catpoke') catPoke();
  else if (a === 'secpage') A.openModal(secHTML()); else if (a === 'sec') buySec(b); else if (a === 'ins') buySec('ins');
  else if (a === 'lifehub') A.openModal(hubHTML());
}
function hubHTML() {
  const s = S(), c = s.cat;
  return `<h2>ร้านของฉัน</h2><div class="opts">
    <button class="btn opt" data-l="chats"><b>${APP}${unread() ? ` (${unread()} ใหม่)` : ''}</b><small>ลูกค้าทักมาเสนอพระผ่านรูปถ่าย ราคาถูกแต่เสี่ยง</small></button>
    <button class="btn opt" data-l="livepick"><b>ไลฟ์ขายของในตู้</b><small>${s.liveDay === s.day ? 'วันนี้ไลฟ์แล้ว' : 'ให้คนดูประมูลสด วันละครั้ง'}</small></button>
    <button class="btn opt" data-l="decor"><b>แต่งร้าน</b><small>${esc(s.decor.name)} • ฉากหลัง ป้าย ผ้ากำมะหยี่ ไฟ ตู้โชว์</small></button>
    <button class="btn opt" data-l="catpage"><b>แมวประจำร้าน</b><small>${c ? `${esc(c.name)} • ${c.fed === s.day ? 'กินแล้ว' : 'หิวแล้ว!'}` : 'รับเลี้ยงแมวจร'}</small></button>
    <button class="btn opt" data-l="secpage"><b>ความปลอดภัยร้าน</b><small>ตู้เซฟ กล้องวงจรปิด ประกันพระ</small></button></div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
const lifeBadge = () => { const n = unread(); return n ? `${APP}: ${n} ข้อความใหม่` : S().cat && S().cat.fed !== S().day ? `${S().cat.name}หิวแล้ว` : ''; };

export { initLife, normLife, unread, lifeDay, extraCustomers, catPatience, applyDecor, renderCat, lClick, hubHTML, lifeBadge, liveClose };
