// เฟส 8: โลกที่มีชีวิต โหมดเสริม และการแชร์ — ปฏิทินเทศกาล, ฟีดวงการพระ, กระดานราคา, ส่องเร็ว 60 วิ, การ์ดอวดพระ, รหัสแลกพระ, เพลงพื้นหลัง
// ไม่ import จาก game.js: game.js เรียก initWorld(api) — ทุกชื่อเพจ คน และร้านในฟีดเป็นเรื่องสมมติ
import { clamp, rng, hash, fmt, pick, esc, round100 } from './util.js';
import { MODELS, MATS, RAR, CATS, catOf, isCoin } from './data.js';

let A = null;
const S = () => A.S();
function initWorld(api) { A = api; }
function normWorld(s) {
  s.mkt = s.mkt || {}; s.feed = s.feed || []; s.rum = s.rum || []; s.feedSeen = s.feedSeen || 0; s.fest = s.fest || {};
  s.codes = s.codes || []; s.vol = s.vol || { music: .35, sfx: 1 }; s.taDay = s.taDay || 0;
}

/* ===== ปฏิทินและเทศกาล: 30 วันในเกม = 1 เดือน วันที่ 1 = 1 เมษายน ===== */
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const cal = (day = S().day) => { const k = Math.floor((day - 1) / 30); return { m: (k + 3) % 12, d: (day - 1) % 30 + 1, y: Math.floor((k + 3) / 12) }; };
const METAL = ['gold', 'silver', 'navaloha', 'copper'], POWDER = ['powder', 'clay', 'lan', 'wanp'];
// want = รุ่นที่ขายดีในเทศกาล (ราคาตลาดคูณ mult), cust = ลูกค้าเพิ่ม, act = กิจกรรมพิเศษทำได้ครั้งเดียวต่อเทศกาล
const FEST = [
  { id: 'songkran', name: 'สงกรานต์', m: 3, d: [13, 15], ico: '💦', want: () => true, mult: 1.05, cust: 2, desc: 'คนกลับบ้านเยอะ ลูกค้าแน่นร้าน ทุกรุ่นราคาขยับขึ้นนิดหน่อย',
    act: ['รดน้ำดำหัวอาจารย์', 0, s => { s.rep = Math.min(100, s.rep + 3); A.addMerit(1); return 'อาจารย์ให้พร ชื่อเสียง +3 บุญ +1'; }] },
  { id: 'khao', name: 'เข้าพรรษา', m: 6, d: [20, 22], ico: '🕯️', want: m => POWDER.includes(m.mat), mult: 1.15, cust: 0, desc: 'สายบุญตามหาพระเนื้อผงและเนื้อดิน',
    act: ['ถวายเทียนพรรษา', 2000, () => { A.addMerit(4); return 'ร่วมถวายเทียนพรรษา บุญ +4'; }] },
  { id: 'ok', name: 'ออกพรรษา', m: 9, d: [17, 19], ico: '🪷', want: m => catOf(m) === 'phra', mult: 1.1, cust: 1, desc: 'งานตักบาตรเทโว พระเครื่องเนื้อต่าง ๆ ขายดี',
    act: ['ร่วมตักบาตรเทโว', 1000, s => { A.addMerit(3); for (const k in s.trust) s.trust[k] = Math.min(100, s.trust[k] + 3); return 'บุญ +3 วัดทุกแห่งไว้ใจเพิ่ม +3'; }] },
  { id: 'loy', name: 'ลอยกระทง', m: 10, d: [12, 14], ico: '🏮', want: m => catOf(m) === 'charm', mult: 1.2, cust: 0, desc: 'สายมูหาเครื่องรางไปลอยเคราะห์ ตะกรุดและเบี้ยแก้ราคาดี',
    act: ['ลอยกระทงลอยเคราะห์', 300, () => { A.addMerit(1); A.addKarma(-1); return 'ลอยเคราะห์ไปกับสายน้ำ บุญ +1 กรรม −1'; }] },
  { id: 'ny', name: 'ปีใหม่', m: 11, d: [28, 30], ico: '🎆', want: m => isCoin(m.shape), mult: 1.15, cust: 1, desc: 'คนซื้อเหรียญเป็นของขวัญปีใหม่',
    act: ['แจกเหรียญที่ระลึกให้ลูกค้า', 5000, s => { s.rep = Math.min(100, s.rep + 5); return 'ลูกค้าประทับใจ ชื่อเสียง +5'; }] },
  { id: 'cny', name: 'ตรุษจีน', m: 1, d: [5, 7], ico: '🧧', want: m => METAL.includes(m.mat), mult: 1.2, cust: 1, desc: 'เสี่ย ๆ ตามหาพระเนื้อโลหะ เนื้อทองเนื้อเงินราคาพุ่ง',
    act: ['ไหว้เจ้ารับอั่งเปา', 888, s => { const g = round100(1000 + Math.random() * 7000); s.money += g; return `ได้อั่งเปาจากเฮียข้างร้าน ${fmt(g)}`; }] },
];
const festOn = (day = S().day) => { const c = cal(day); return FEST.find(f => f.m === c.m && c.d >= f.d[0] && c.d <= f.d[1]) || null; };
const festMult = m => { const f = festOn(); return f && f.want(m) ? f.mult : 1; };
const festCustomers = () => { const f = festOn(); return f ? f.cust : 0; };
function festSoon(n = 150) { const out = []; for (let i = 0; i < n; i++) { const f = festOn(S().day + i); if (f && !out.some(o => o.f === f)) out.push({ f, in: i }); } return out; }
function calHTML() {
  const s = S(), c = cal(), start = s.day - c.d + 1, f = festOn();
  const cells = Array.from({ length: 30 }, (_, i) => { const d = start + i, ff = festOn(d); return `<span class="cday ${d === s.day ? 'today' : ''} ${ff ? 'fest' : ''} ${d < s.day ? 'past' : ''}" title="${ff ? esc(ff.name) : ''}">${i + 1}${ff ? `<i>${ff.ico}</i>` : ''}</span>`; }).join('');
  const key = f ? `${f.id}:${c.y}` : '', done = f && s.fest[key];
  return `<h2>ปฏิทินวงการพระ</h2><p><b>${MONTHS[c.m]}</b> • วันที่ ${c.d} (วันที่ ${s.day} ของเกม) <small class="note">30 วันในเกม = 1 เดือน</small></p><div class="calg">${cells}</div>` +
    (f ? `<div class="festnow"><b>${f.ico} วันนี้: ${esc(f.name)}</b><p>${esc(f.desc)}</p><button class="btn ok" data-w="festact" ${done || s.money < f.act[1] ? 'disabled' : ''}>${esc(f.act[0])}${f.act[1] ? ` <small>${fmt(f.act[1])}</small>` : ''}${done ? ' <small>ร่วมแล้ว</small>' : ''}</button></div>` : '') +
    `<h3>เทศกาลที่กำลังจะมา</h3><ul class="log">${festSoon().filter(x => x.in > 0).map(x => `<li>${x.f.ico} <b>${esc(x.f.name)}</b> อีก ${x.in} วัน — ${esc(x.f.desc)}</li>`).join('') || '<li>ยังไม่มีในเร็ว ๆ นี้</li>'}</ul>` + back();
}
function festAct() {
  const s = S(), f = festOn(), c = cal(); if (!f) return; const key = `${f.id}:${c.y}`; if (s.fest[key] || s.money < f.act[1]) return;
  s.money -= f.act[1]; s.fest[key] = true; A.toast(f.act[2](s), 'good'); A.bump('fests'); A.reModal(calHTML()); A.render();
}

/* ===== กระดานราคา: ราคาตลาดของทุกรุ่นขยับรายวันตามข่าว เทศกาล และกระแส ===== */
const mk = id => S().mkt[id] || { m: 1, h: [1] };
const mktMult = m => (MODELS.includes(m) ? mk(m.id).m : 1) * festMult(m);
function marketDay(lines) {
  const s = S(), rumorHit = {};
  for (const ru of s.rum.filter(x => x.day <= s.day + 1)) {
    const m = MODELS.find(x => x.id === ru.id); if (!m) continue;
    if (ru.tr) rumorHit[ru.id] = (rumorHit[ru.id] || 1) * (1 + ru.dir * .15);
    post(ru.tr ? 'news' : 'rival', ru.tr ? 'ข่าววงการพระ (เพจสมมติ)' : ru.who, ru.tr ? `ยืนยันแล้ว! ข่าวเมื่อวานเรื่อง ${m.name} เป็นเรื่องจริง ราคา${ru.dir > 0 ? 'ขึ้น' : 'ลง'}จริง` : `ข่าวเมื่อวานเรื่อง ${m.name} ไม่เป็นความจริง ใครปล่อยข่าวมั่วไม่รู้ 555`);
  }
  s.rum = s.rum.filter(x => x.day > s.day + 1);
  let top = null;
  for (const m of MODELS) {
    const o = s.mkt[m.id] || (s.mkt[m.id] = { m: 1, h: [1] }), prev = o.m;
    o.m = clamp((o.m + (1 - o.m) * .08) * (1 + (Math.random() - .5) * .07) * (rumorHit[m.id] || 1), .6, 1.7);
    o.m = Math.round(o.m * 1000) / 1000; o.h = [...o.h, o.m].slice(-12);
    if (m.lvl <= A.lvl() && (!top || Math.abs(o.m / prev - 1) > Math.abs(top.ch))) top = { m, ch: o.m / prev - 1 };
  }
  if (top && Math.abs(top.ch) > .03) post('trend', 'กราฟพระรายวัน', `${top.m.name} ${top.ch > 0 ? 'พุ่ง' : 'ร่วง'} ${Math.abs(top.ch * 100).toFixed(1)}% ภายในวันเดียว`);
  feedDay(lines);
}
const arrow = ch => ch > .005 ? `<b class="up">▲ ${(ch * 100).toFixed(1)}%</b>` : ch < -.005 ? `<b class="dn">▼ ${(-ch * 100).toFixed(1)}%</b>` : '<b class="flat">• 0%</b>';
function spark(h) {
  if (h.length < 2) return '';
  const lo = Math.min(...h), hi = Math.max(...h), sp = hi - lo || 1, pts = h.map((v, i) => `${(i / (h.length - 1) * 60).toFixed(1)},${(18 - (v - lo) / sp * 16).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 60 20" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${h[h.length - 1] >= h[0] ? '#5fd98a' : '#ff7a6b'}" stroke-width="1.6"/></svg>`;
}
let BF = 'all';
function boardHTML() {
  const L = A.lvl(), f = festOn();
  const list = MODELS.filter(m => m.lvl <= L && (BF === 'all' || catOf(m) === BF)).map(m => { const o = mk(m.id), pv = o.h.length > 1 ? o.h[o.h.length - 2] : o.m; return { m, o, ch: o.m / pv - 1 }; }).sort((a, b) => b.ch - a.ch);
  return `<h2>กระดานราคา</h2><p class="note">ราคาตลาดของสภาพสวย (100) • ขยับทุกวันตามข่าว เทศกาล และกระแส${f ? ` • ช่วง${esc(f.name)}: บางรุ่นราคาดีขึ้น ${Math.round((f.mult - 1) * 100)}%` : ''}</p>
    <div class="bfil">${[['all', 'ทั้งหมด'], ...Object.entries(CATS)].map(([k, n]) => `<button class="btn ${BF === k ? 'on' : ''}" data-w="bf:${k}">${n}</button>`).join('')}</div>
    <div class="board">${list.map(({ m, o, ch }) => `<div class="brow"><span class="bn">${esc(m.name)}<small>${esc(MATS[m.mat].name)} • ${RAR[m.rar || 'common'][0]}</small></span>${spark(o.h)}<span class="bp">${fmt(round100(m.price * mktMult(m)))}${arrow(ch)}</span></div>`).join('')}</div>` + back();
}

/* ===== ฟีดวงการพระ: โพสต์จากตัวละครสมมติ ข่าวลือ (จริงราว 60%) แนวโน้มราคา คู่แข่งอวด ===== */
const POSTERS = ['เพจส่องพระยามดึก', 'เซียนหน่องหลังวัด', 'ป้าแจ๋วพระสวย', 'กลุ่มคนรักพระเนื้อผง', 'หนุ่มเมืองเก่าพระสะสม'];
const RIVALP = ['เสี่ยหมูแผงตรงข้าม', 'เซียนโก้ไฮโซ', 'เจ๊ติ๋มพระดังทันใจ'];
const BRAG = ['เพิ่งได้ {m} สภาพแชมป์มาครับ ใครอยากได้ทักมา ราคาไม่ถูกนะ', 'วันนี้ปิดดีล {m} ไปหลายองค์ ขอบคุณลูกค้าครับ', 'ร้านเราของแท้ทุกองค์ ไม่เหมือนบางร้าน… ไม่ได้หมายถึงใครนะ', 'ไปงานประกวดมา {m} ของเราติดรางวัลอีกแล้ว'];
const TIPS = ['พระเนื้อดินแท้ผิวจะมีรูพรุนเล็ก ๆ ทั่วองค์ อย่าดูแค่ด้านหน้า', 'ใครซื้อพระผ่านแชท ระวังบัญชีที่เพิ่งสมัครแล้วเร่งให้โอนนะคะ', 'เทียบองค์ครูทุกครั้ง อย่าเชื่อคำโฆษณา', 'เหรียญแท้ขอบข้างจะมีเสี้ยนเรียบตามธรรมชาติ ของปั๊มใหม่ขอบคม'];
function post(kind, who, t) { const s = S(); s.feed.unshift({ id: s.nextId++, d: s.day + 1, kind, who, t }); s.feed = s.feed.slice(0, 30); }
function feedDay() {
  const s = S(), r = rng(hash('feed:' + s.day + ':' + s.seed)), pool = MODELS.filter(m => m.lvl <= Math.max(2, A.lvl()));
  for (let i = 0, n = 1 + (r() < .5 ? 1 : 0); i < n; i++) {
    const m = pick(r, pool), dir = r() < .55 ? 1 : -1, tr = r() < .6, who = tr ? pick(r, POSTERS) : pick(r, r() < .6 ? RIVALP : POSTERS);
    s.rum.push({ id: m.id, dir, tr, who, day: s.day + 2 });
    post('rumor', who, `ได้ข่าวมาว่า ${m.name} พรุ่งนี้ราคาจะ${dir > 0 ? 'ขึ้น' : 'ลง'}แรง${dir > 0 ? ' เก็บไว้ก่อนเลย!' : ' ใครมีรีบปล่อย'} (ข่าวลือ ยังไม่ยืนยัน)`);
  }
  if (r() < .6) post('rival', pick(r, RIVALP), pick(r, BRAG).replace('{m}', pick(r, pool).name));
  if (r() < .4) post('tip', pick(r, POSTERS), pick(r, TIPS));
  const nx = festSoon(6).find(x => x.in > 0); if (nx && nx.in <= 5) post('fest', 'ปฏิทินวงการพระ', `อีก ${nx.in} วันจะถึง${nx.f.name} ${nx.f.ico} — ${nx.f.desc}`);
}
const feedNew = () => S().feed.filter(p => p.d > S().feedSeen).length;
const KIND = { rumor: ['ข่าวลือ', 'gold'], news: ['ยืนยัน', 'good'], rival: ['คู่แข่ง', 'bad'], trend: ['ราคา', ''], tip: ['ทริค', 'good'], fest: ['เทศกาล', 'gold'] };
function feedHTML() {
  const s = S(), seen = s.feedSeen; s.feedSeen = s.day;
  return `<h2>ฟีดวงการพระ</h2><p class="note">ข่าวลือจริงบ้างไม่จริงบ้าง บางอันคู่แข่งปล่อย อ่านแล้วลองดูกระดานราคาประกอบ</p><div class="feed">${s.feed.map(p => `<div class="fpost ${p.d > seen ? 'new' : ''}"><span class="fav">${esc(p.who.slice(0, 1))}</span><div><b>${esc(p.who)}</b> <span class="badge ${KIND[p.kind][1]}">${KIND[p.kind][0]}</span> <small>วันที่ ${p.d}</small><p>${esc(p.t)}</p></div></div>`).join('') || '<p>ยังไม่มีโพสต์ ปิดร้านสักวันแล้วกลับมาดูใหม่</p>'}</div>` + back();
}

/* ===== โหมดส่องเร็ว 60 วินาที (Time Attack) ===== */
const TKEY = 'sianphra_ta_v1', TA_SEC = 60;
let TA = null, TM = {}; try { TM = JSON.parse(localStorage.getItem(TKEY)) || {}; } catch (e) { TM = {}; }
const saveTM = () => { try { localStorage.setItem(TKEY, JSON.stringify(TM)); } catch (e) { /* storage unavailable */ } };
function taPieceGen() {
  const r = Math.random, m = pick(r, MODELS), genuine = r() < .5, n = Math.min(1 + Math.floor(r() * 2), Object.keys(m.spec).length);
  return { modelId: m.id, genuine, spec: genuine ? { ...m.spec } : A.mutate(m.spec, n, r), cond: Math.round(72 + r() * 28), seed: Math.floor(r() * 1e9), k: ++TA.n };
}
function taStart() { TA = { t0: performance.now(), pen: 0, score: 0, combo: 0, maxc: 0, ok: 0, bad: 0, n: 0, p: null, over: false }; TA.p = taPieceGen(); A.setMode('ta'); }
const taLeft = () => TA ? Math.max(0, TA_SEC - (performance.now() - TA.t0) / 1000 - TA.pen) : 0;
const tPiece = mode => mode === 'ta' && TA && !TA.over ? TA.p : null;
const tKey = mode => 'ta' + (TA ? TA.p.k : 0);
function tCard() {
  const m = A.modelById(TA.p.modelId);
  return `<div class="ava">60</div><div><div class="who">ส่องเร็ว 60 วินาที <span class="badge gold">คอมโบ ×${TA.combo}</span></div><div class="line">แท้ หรือ เก๊? ตอบไวได้คะแนนเยอะ ผิดโดนหัก 5 วินาที</div>
    <div class="pname">${esc(m.name)}</div><div class="facts"><span>คะแนน <b>${TA.score}</b></span><span>ถูก ${TA.ok} • ผิด ${TA.bad}</span><span>สภาพ ${TA.p.cond}</span></div></div>`;
}
const tActs = () => '<button class="btn dim" data-a="w:taexit">ออก</button><button class="btn ok" data-a="w:tayes">แท้</button><button class="btn no" data-a="w:tano">เก๊</button>';
function taAnswer(g) {
  if (!TA || TA.over) return; const ok = g === TA.p.genuine, m = A.modelById(TA.p.modelId);
  if (ok) { TA.combo++; TA.maxc = Math.max(TA.maxc, TA.combo); TA.ok++; TA.score += 10 * (1 + Math.floor(TA.combo / 3)); A.sfx('buy'); }
  else { TA.combo = 0; TA.bad++; TA.pen += 5; A.sfx('flip'); A.toast(`ผิด! ${m.name} องค์นั้น${TA.p.genuine ? 'แท้' : 'เก๊'} −5 วินาที`, 'bad'); }
  if (taLeft() <= 0) return taEnd(); TA.p = taPieceGen(); A.render();
}
function taEnd() {
  if (!TA || TA.over) return; TA.over = true; const s = S(), r = TA, best = r.score > (TM.best || 0);
  TM.best = Math.max(TM.best || 0, r.score); TM.plays = (TM.plays || 0) + 1; saveTM();
  let xp = 0; if (s.taDay !== s.day) { s.taDay = s.day; xp = Math.min(30, r.ok * 2); if (xp) A.gainXP(xp); }
  A.bump('ta'); if (r.score >= 200) A.bump('ta200');
  A.setMode('shop');
  A.openModal(`<h2>หมดเวลา!</h2><p class="big">${r.score} คะแนน</p><p>ถูก ${r.ok} • ผิด ${r.bad} • คอมโบสูงสุด ×${r.maxc}${best ? ' • <b class="up">สถิติใหม่!</b>' : ` • สถิติสูงสุด ${TM.best}`}</p>${xp ? `<p class="note">ได้ +${xp} XP ในเกมหลัก (วันละครั้ง)</p>` : ''}
    <div class="row"><button class="btn" data-w="tashare">คัดลอกผลไปแชร์</button><button class="btn ok" data-w="ta">เล่นอีกรอบ</button><button class="btn dim" data-close>ปิด</button></div><textarea id="sharebox" class="sharebox" rows="3" readonly hidden></textarea>`);
  TA.share = `ส่องเร็ว 60 วิ: ${r.score} คะแนน ✅${r.ok} ❌${r.bad} คอมโบ ×${r.maxc}\n${A.site}`;
}
function tAct(a) { if (a === 'tayes') taAnswer(true); else if (a === 'tano') taAnswer(false); else if (a === 'taexit') { TA = null; A.setMode('shop'); } }
const tLeave = mode => { if (mode === 'ta' && TA && !TA.over) TA = null; };
const tQinfo = () => TA ? `<span class="badge gold" id="tatimer">⏱ ${Math.ceil(taLeft())} วิ</span>` : '';
function tTick(mode) { if (mode !== 'ta' || !TA || TA.over) return; const el = document.getElementById('tatimer'); if (el) el.textContent = `⏱ ${Math.ceil(taLeft())} วิ`; if (taLeft() <= 0) taEnd(); }
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); A.toast('คัดลอกแล้ว ไปวางแชร์ได้เลย', 'good'); }
  catch (e) { const box = document.getElementById('sharebox'); if (box) { box.hidden = false; box.value = t; box.focus(); box.select(); } A.toast('กดค้างที่ข้อความแล้วเลือก "คัดลอก" ได้เลย'); }
}

/* ===== การ์ดอวดพระ: โปสเตอร์ 1080x1350 ===== */
const showable = it => !it.consign && it.cert !== false && A.modelById(it.modelId);
function cardPickHTML() {
  const list = S().inv.filter(showable);
  return `<h2>การ์ดอวดพระ</h2><p class="note">เลือกองค์เด่นมาทำโปสเตอร์ ดาวน์โหลดหรือแชร์ได้</p>` + (list.length ? `<div class="opts">${list.map(it => `<button class="btn opt" data-w="card:${it.id}"><b>${esc(A.modelById(it.modelId).name)}</b><small>สภาพ ${it.cond}${it.cert ? ' • มีใบรับรอง' : ''}${it.award ? ' • ติดรางวัล' : ''}</small></button>`).join('')}</div>` : '<p>ยังไม่มีพระในตู้ที่อวดได้</p>') + back();
}
let CARD = null;
function wrapTxt(g, t, x, y, w, lh) { let line = ''; for (const ch of [...t]) { if (g.measureText(line + ch).width > w && line) { g.fillText(line, x, y); line = ch; y += lh; } else line += ch; } g.fillText(line, x, y); return y; }
function makeCard(id) {
  const s = S(), it = s.inv.find(x => String(x.id) === String(id)); if (!it) return; const m = A.modelById(it.modelId);
  A.openModal('<h2>การ์ดอวดพระ</h2><p>กำลังถ่ายภาพพระ…</p>');
  setTimeout(() => {
    const img = new Image(); img.onload = () => {
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d');
      const bg = g.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#5a1a10'); bg.addColorStop(.6, '#2a0d08'); bg.addColorStop(1, '#120503'); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
      g.strokeStyle = '#e6c46a'; g.lineWidth = 10; g.strokeRect(30, 30, 1020, 1290); g.lineWidth = 2; g.strokeRect(48, 48, 984, 1254);
      g.textAlign = 'center'; g.fillStyle = '#ffe2b0'; g.font = '600 54px Kanit, sans-serif'; g.fillText(s.decor ? s.decor.name : 'ร้านพระของฉัน', 540, 130);
      g.fillStyle = '#e6c46a'; g.font = '400 34px Sarabun, sans-serif'; g.fillText(A.title(), 540, 182);
      g.save(); g.beginPath(); g.ellipse(540, 600, 360, 360, 0, 0, Math.PI * 2); g.fillStyle = '#1f3c8a55'; g.fill(); g.restore();
      g.drawImage(img, 540 - 330, 230, 660, 825);
      g.fillStyle = '#fff3dc'; g.font = '600 52px Kanit, sans-serif'; const y = wrapTxt(g, m.name, 540, 1110, 900, 62);
      g.font = '400 34px Sarabun, sans-serif'; g.fillStyle = '#e6c46a';
      g.fillText(`${RAR[m.rar || 'common'][0]} • ${MATS[m.mat].name} • สภาพ ${it.cond}/100${it.cert ? ' • ใบรับรองแท้' : ''}${it.award ? ' • ติดรางวัล' : ''}`, 540, y + 56);
      g.fillStyle = '#d8c8b0'; g.font = '400 30px Sarabun, sans-serif'; g.fillText(`ปล่อยเช่าแล้ว ${s.stats.sold} องค์ • สะสมในสมุด ${Object.keys(s.owned || {}).length} รุ่น • วันที่ ${s.day}`, 540, y + 110);
      g.fillStyle = '#e6c46a99'; g.font = '400 26px Sarabun, sans-serif'; g.fillText('เซียนพระ จำลอง • เกมสมมติ', 540, 1290);
      CARD = { url: c.toDataURL('image/png'), canvas: c, name: m.name };
      A.reModal(`<h2>การ์ดอวดพระ</h2><img class="cardprev" src="${CARD.url}" alt="การ์ดอวด ${esc(m.name)}"><div class="row"><a class="btn ok" href="${CARD.url}" download="sianphra-card.png">ดาวน์โหลด PNG</a>${navigator.share ? '<button class="btn" data-w="cardshare">แชร์</button>' : ''}<button class="btn dim" data-w="cards">เลือกองค์อื่น</button><button class="btn dim" data-close>ปิด</button></div>`);
      A.bump('cards');
    };
    img.src = A.snapBig(m, it.spec, it.cond, it.seed, it.frame);
  }, 30);
}
function shareCard() {
  if (!CARD) return; CARD.canvas.toBlob(async b => {
    const file = new File([b], 'sianphra-card.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'การ์ดอวดพระ', text: CARD.name }); else await navigator.share({ title: 'การ์ดอวดพระ', text: `อวด ${CARD.name} จากเกมเซียนพระ จำลอง ${A.site}` }); }
    catch (e) { /* ผู้เล่นยกเลิกการแชร์ */ }
  }, 'image/png');
}

/* ===== รหัสแลกพระกับเพื่อน ===== */
const XK = 'sianphra-trade';
const b64e = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => atob(s.replace(/-/g, '+').replace(/_/g, '/'));
const scram = s => [...s].map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ XK.charCodeAt(i % XK.length))).join('');
const ckOf = p => (hash(p + '#' + XK) >>> 0).toString(36).padStart(5, '0').slice(-5);
const tradable = it => !it.consign && !it.share && !it.pend && MODELS.some(m => m.id === it.modelId);
function tradeHTML(code) {
  const list = S().inv.filter(tradable);
  return `<h2>รหัสแลกพระกับเพื่อน</h2>${code ? `<p>ส่งรหัสนี้ให้เพื่อน (องค์นี้ออกจากตู้แล้ว):</p><textarea id="tcode" class="sharebox" rows="3" readonly>${esc(code)}</textarea><div class="row"><button class="btn ok" data-w="tcopy">คัดลอกรหัส</button></div>` : ''}
    <h3>นำเข้าพระจากเพื่อน</h3><div class="nrow"><input id="tin" placeholder="วางรหัส SP-…" autocomplete="off"><button class="btn ok" data-w="timp">นำเข้า</button></div>
    <h3>ส่งออกพระในตู้</h3><p class="note">องค์ที่ส่งออกจะหายจากตู้ รหัสแต่ละอันใช้ได้ครั้งเดียว (ของฝากขาย ลงหุ้น และรอผลตรวจส่งออกไม่ได้)</p>` +
    (list.length ? `<div class="opts">${list.map(it => `<button class="btn opt" data-w="texp:${it.id}"><b>${esc(A.modelById(it.modelId).name)}</b><small>สภาพ ${it.cond}${it.cert ? ' • มีใบรับรอง' : it.cert === false ? ' • ของเก๊' : ''}</small></button>`).join('')}</div>` : '<p>ไม่มีพระที่ส่งออกได้</p>') + back();
}
let TX = null;
function tExport(id) {
  const s = S(), it = s.inv.find(x => String(x.id) === String(id)); if (!it || !tradable(it)) return;
  if (TX !== id) { TX = id; A.toast(`แตะอีกครั้งเพื่อยืนยันส่งออก ${A.modelById(it.modelId).name} (องค์นี้จะหายจากตู้)`); return; } TX = null;
  const p = b64e(scram(JSON.stringify([it.modelId, it.spec, it.cond, it.seed, it.genuine ? 1 : 0, it.cert === true ? 1 : it.cert === false ? 2 : 0, Math.floor(Math.random() * 1e6)]))), ck = ckOf(p);
  s.inv = s.inv.filter(x => x !== it); s.codes.push(ck); A.bump('trades');
  A.reModal(tradeHTML(`SP-${p}-${ck}`)); A.render();
}
function tImport() {
  const s = S(), raw = (document.getElementById('tin')?.value || '').trim(), mm = raw.match(/^SP-([A-Za-z0-9_-]+)-([0-9a-z]{5})$/);
  if (!mm || ckOf(mm[1]) !== mm[2]) return A.toast('รหัสไม่ถูกต้อง ลองคัดลอกใหม่ทั้งหมด', 'bad');
  if (s.codes.includes(mm[2])) return A.toast('รหัสนี้ถูกใช้ในเซฟนี้ไปแล้ว', 'bad');
  let d; try { d = JSON.parse(scram(b64d(mm[1]))); } catch (e) { return A.toast('รหัสไม่ถูกต้อง', 'bad'); }
  const m = MODELS.find(x => x.id === d[0]); if (!m || typeof d[1] !== 'object') return A.toast('ไม่รู้จักพระรุ่นนี้', 'bad');
  s.codes.push(mm[2]); A.addItem({ modelId: m.id, spec: d[1], cond: clamp(+d[2] || 70, 1, 100), seed: +d[3] || 1, genuine: d[4] === 1, cert: d[5] === 1 ? true : d[5] === 2 ? false : null }, round100(m.price * A.cf(+d[2] || 70) * .7));
  s.inv[0].cert = d[5] === 1 ? true : d[5] === 2 ? false : null; // takeItem ล้างผลตรวจ จึงใส่คืนตามรหัส
  A.toast(`ได้รับ ${m.name} จากเพื่อนแล้ว เก็บเข้าตู้`, 'good'); A.reModal(tradeHTML()); A.render();
}

/* ===== เพลงพื้นหลัง: ระนาด + ฆ้อง + ฉิ่ง สังเคราะห์ด้วย Web Audio ===== */
const SCALE = [392, 440, 523.25, 587.33, 659.25, 784, 880, 1046.5]; // เพนทาโทนิก (ซอล ลา โด เร มี)
let MU = null;
function musicOn() {
  const v = S().vol.music; if (S().mute || v <= 0) { musicOff(); return; }
  const a = A.audio(); if (!a) return;
  if (!MU) { const g = a.createGain(); g.connect(a.destination); MU = { a, g, next: a.currentTime + .1, step: 0, note: 3, timer: setInterval(schedule, 120) }; }
  MU.g.gain.setTargetAtTime(v * .22, a.currentTime, .3);
}
function musicOff() { if (!MU) return; clearInterval(MU.timer); const { a, g } = MU; g.gain.setTargetAtTime(0, a.currentTime, .2); setTimeout(() => g.disconnect(), 800); MU = null; }
function note(t, f, dur, type, vol) {
  const { a, g } = MU, o = a.createOscillator(), e = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(vol, t + .005); e.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(e).connect(g); o.start(t); o.stop(t + dur + .05);
}
function schedule() {
  if (!MU) return; const { a } = MU, beat = 60 / 76 / 2; // จังหวะช้า ๆ เขบ็ตหนึ่งชั้น
  while (MU.next < a.currentTime + .4) {
    const t = MU.next, st = MU.step % 32;
    if (Math.random() < (st % 2 ? .45 : .8)) { MU.note = clamp(MU.note + pick(Math.random, [-2, -1, -1, 1, 1, 2, 0]), 0, SCALE.length - 1); const f = SCALE[MU.note]; note(t, f, .35, 'triangle', .5); note(t, f * 2.01, .12, 'sine', .12); }
    if (st % 16 === 0) { note(t, 98, 2.4, 'sine', .7); note(t, 196.5, 1.6, 'sine', .2); }
    if (st % 16 === 8) note(t, 130.8, 1.8, 'sine', .45);
    if (st % 4 === 2) { note(t, 3150, .25, 'sine', .08); note(t, 4400, .18, 'sine', .05); }
    MU.next += beat; MU.step++;
  }
}
function volHTML() {
  const v = S().vol;
  return `<div class="vols"><label>เพลง <input type="range" min="0" max="1" step=".05" value="${v.music}" data-wv="music" aria-label="ระดับเสียงเพลง"></label><label>เอฟเฟกต์ <input type="range" min="0" max="1" step=".05" value="${v.sfx}" data-wv="sfx" aria-label="ระดับเสียงเอฟเฟกต์"></label></div>`;
}
function setVol(k, val) { S().vol[k] = clamp(+val, 0, 1); if (k === 'music') musicOn(); A.save(); }
addEventListener('pointerdown', () => { if (A && S() && !MU) musicOn(); }, { once: false, passive: true });
document.addEventListener('visibilitychange', () => { if (MU) { if (document.hidden) MU.a.suspend(); else MU.a.resume(); } });

/* ===== ศูนย์รวม "วงการพระ" + ปุ่ม (data-w) ===== */
const back = () => '<div class="row"><button class="btn dim" data-w="hub">← วงการพระ</button><button class="btn dim" data-close>ปิด</button></div>';
function worldHTML() {
  const f = festOn(), c = cal(), nf = feedNew();
  return `<h2>วงการพระ</h2><p>${MONTHS[c.m]} วันที่ ${c.d}${f ? ` • ${f.ico} ${esc(f.name)}` : ''}</p><div class="opts">
    <button class="btn opt" data-w="cal"><b>ปฏิทินและเทศกาล</b><small>${f ? `วันนี้${esc(f.name)}! ร่วมกิจกรรมได้` : festSoon().filter(x => x.in > 0).slice(0, 1).map(x => `อีก ${x.in} วันถึง${x.f.name}`).join('') || 'ดูเทศกาลที่กำลังจะมา'}</small></button>
    <button class="btn opt" data-w="feed"><b>ฟีดวงการพระ${nf ? ` (${nf} ใหม่)` : ''}</b><small>ข่าวลือ แนวโน้มราคา คู่แข่งโพสต์อวด</small></button>
    <button class="btn opt" data-w="board"><b>กระดานราคา</b><small>ราคาตลาดทุกรุ่น ขึ้นลงรายวัน</small></button>
    <button class="btn opt" data-w="ta"><b>ส่องเร็ว 60 วินาที</b><small>ตัดสินแท้/เก๊ให้มากที่สุด • สถิติ ${TM.best || 0} คะแนน</small></button>
    <button class="btn opt" data-w="cards"><b>การ์ดอวดพระ</b><small>ทำโปสเตอร์องค์เด่น ดาวน์โหลดหรือแชร์</small></button>
    <button class="btn opt" data-w="trade"><b>รหัสแลกพระกับเพื่อน</b><small>ส่งออก/นำเข้าพระด้วยรหัส</small></button></div>
    <h3>เสียง</h3>${volHTML()}<div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
function wClick(el) {
  const [a, b] = el.dataset.w.split(':');
  if (a === 'hub') A.openModal(worldHTML()); else if (a === 'cal') A.openModal(calHTML()); else if (a === 'festact') festAct();
  else if (a === 'feed') { A.openModal(feedHTML()); A.render(); } else if (a === 'board') A.openModal(boardHTML()); else if (a === 'bf') { BF = b; A.reModal(boardHTML()); }
  else if (a === 'ta') { A.closeModal(); taStart(); } else if (a === 'tashare') copyText(TA ? TA.share : '');
  else if (a === 'cards') A.openModal(cardPickHTML()); else if (a === 'card') makeCard(b); else if (a === 'cardshare') shareCard();
  else if (a === 'trade') { TX = null; A.openModal(tradeHTML()); } else if (a === 'texp') tExport(b); else if (a === 'timp') tImport(); else if (a === 'tcopy') copyText(document.getElementById('tcode')?.value || '');
}
const worldBadge = () => { const f = festOn(); return f ? `${f.ico} วันนี้${f.name}` : feedNew() ? `ฟีดวงการพระ: ${feedNew()} โพสต์ใหม่` : ''; };

export {
  initWorld, normWorld, cal, festOn, festCustomers, mktMult, marketDay, worldHTML, wClick, worldBadge, volHTML, setVol, musicOn, musicOff,
  tPiece, tKey, tCard, tActs, tAct, tLeave, tQinfo, tTick, FEST,
};
