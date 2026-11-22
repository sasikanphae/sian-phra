// เฟส 3: เป้าหมายหลัง Lv.6 — บารมี ★, ตามล่าพระในตำนาน, ดวลส่องพระ, งานประมูล, สาขาและลูกศิษย์, พิพิธภัณฑ์, สมาคม, หน้าเป้าหมาย
// โมดูลนี้ไม่ import จาก game.js: game.js เรียก initEndgame(api) ส่งสถานะและฟังก์ชันที่ต้องใช้เข้ามา
// ชื่อคน วัด สมาคม และพระทั้งหมดเป็นเรื่องสมมติ
import { clamp, rng, hash, fmt, pick, esc, round100 } from './util.js';
import { MODELS, P_, RAR, REGIONS, CATS, catOf } from './data.js';

let A = null;
const S = () => A.S();
function initEndgame(api) { A = api; }

/* ===== ค่าเริ่มต้น/รองรับเซฟเก่า ===== */
function normEndgame(s) {
  s.legend = s.legend || {}; for (const m of LEGENDS) s.legend[m.id] = s.legend[m.id] || { clues: 0, open: false, own: false };
  s.duel = s.duel || { day: 0, wins: {}, regs: {}, total: 0, lost: 0 };
  s.auction = s.auction || { day: 0, won: 0, force: 0 };
  s.branches = s.branches || [];
  s.museum = s.museum || { open: false, cases: 4, items: [] };
  s.assoc = s.assoc || { cand: false, pres: false };
  s.endings = s.endings || {};
  s.oldSian = s.oldSian || { day: 0, n: 0 };
}

/* ===== บารมี ★1–★10 (XP ที่เกิน Lv.6) ===== */
const STAR0 = 3000, STAR_STEP = 900;
const STAR_TITLES = ['เซียนดาวรุ่งพุ่งแรง', 'เซียนตาทิพย์', 'เซียนมือทอง', 'เซียนเหนือเมฆ', 'เซียนประจำสนามใหญ่', 'จอมเซียนหลายแผง', 'ปรมาจารย์ตาวิเศษ', 'ตำนานมีชีวิต', 'เซียนผู้ไร้เทียมทาน', 'เทพแห่งการส่องพระ'];
const stars = () => clamp(Math.floor((S().xp - STAR0) / STAR_STEP), 0, 10);
const starTitle = n => n ? STAR_TITLES[n - 1] : '';
const starMult = () => 1 + .02 * stars();
const starPatience = () => Math.floor(stars() / 3);
const starProgress = () => { const n = stars(); return n >= 10 ? 1 : clamp((S().xp - STAR0 - n * STAR_STEP) / STAR_STEP, 0, 1); };
const starTxt = n => n ? `★${n}` : '';

/* ===== พระในตำนาน 5 องค์ (ไม่อยู่ในสมุดจนกว่าจะได้เบาะแสครบ 3 ชิ้น) ===== */
const LEGENDS = [
  { id: 'lg_somdej', name: 'พระสมเด็จองค์ปฐม วัดฟ้าหลั่งทอง', shape: 'rect', mat: 'powder', gold: true, price: 12000000, weight: 11,
    spec: { hand: 'samadhi', tiers: 4, flame: 'tall', back: 'yantra', edge: 'cut', thick: 'mid', grain: 'crackle' },
    clues: ['ฐานมีสี่ชั้น ไม่ใช่สามชั้นแบบทั่วไป', 'ด้านหลังเป็นยันต์สามแถว ใต้อุณาโลม', 'เกศยาวเรียวแหลม ผิวมีลายงาทั่วองค์'] },
  { id: 'lg_naga', name: 'พระนาคปรกเก้าเศียร วัดถ้ำมังกรเงิน', shape: 'lotus', pose: 'naga', mat: 'navaloha', price: 9500000, weight: 26,
    spec: { nagaHeads: 9, flame: 'tall', back: 'yantra', edge: 'cut', thick: 'mid', grain: 'oxide', finish: 'gilt' },
    clues: ['พังพานนาคครบเก้าเศียร ไม่ขาดไม่เกิน', 'กะไหล่ทองบาง ๆ สึกเห็นเนื้อนวะตรงจุดสูง', 'หลังเป็นยันต์สามแถว ผิวมีคราบไขขาว'] },
  { id: 'lg_kring', name: 'พระกริ่งเจ็ดแสงแดด วัดหมอกเพชร', kind: 'kring', shape: 'rect', mat: 'navaloha', price: 15000000, weight: 52,
    spec: { flame: 'tall', seam: 'fine', kcode: 'stamp', rattle: 'clear' },
    clues: ['เขย่าแล้วเม็ดกริ่งดังใสกังวานเหมือนระฆังเล็ก', 'ใต้ฐานตอกโค้ดตรงกลางพอดี', 'ตะเข็บข้างองค์เนียนจนแทบมองไม่เห็น เกศยาว'] },
  { id: 'lg_takrut', name: 'ตะกรุดสะท้อนจักรวาล วัดคลื่นเงียบ', kind: 'takrut', shape: 'rect', mat: 'gold', price: 8000000, weight: 15,
    spec: { turns: 9, cord: 'yellow', braid: 'fish' },
    clues: ['ม้วนแผ่นทองครบเก้ารอบ นับได้ที่ปลาย', 'ถักเชือกสีเหลืองเหมือนสีจีวร', 'ลายถักเป็นก้างปลา ไม่ใช่ลายเกลียว'] },
  { id: 'lg_coin', name: 'เหรียญจันทร์เพ็ญหลวงพ่อผู้เฒ่า วัดหนองไม่มีน้ำ', shape: 'oval', pose: 'monk', mat: 'silver', price: 10000000, weight: 16,
    spec: { monkItem: 'beads', back: 'square', loop: 'weld', finish: 'enamel' },
    clues: ['รูปเหมือนคล้องลูกประคำที่คอ ไม่สะพายย่าม', 'ลงยาสีในร่องทั้งเหรียญ หูเชื่อมห่วงกลม', 'ด้านหลังเป็นตราประทับสี่เหลี่ยม'] },
].map(m => ({ ...P_, rar: 'legend', region: 'central', lvl: 7, legend: true, ...m }));
const legendById = id => LEGENDS.find(m => m.id === id);
const huntOn = () => A.lvl() >= 6;
const legendsOpen = () => LEGENDS.filter(m => S().legend[m.id].open);
const legendsOwned = () => LEGENDS.filter(m => S().legend[m.id].own).length;
function addClue(src) {
  if (!huntOn()) return '';
  const left = LEGENDS.filter(m => S().legend[m.id].clues < 3); if (!left.length) return '';
  const m = pick(Math.random, left), st = S().legend[m.id]; st.clues++;
  let msg = `ได้เบาะแส ${m.name} (${st.clues}/3) จาก${src}: "${m.clues[st.clues - 1]}"`;
  if (st.clues >= 3) { st.open = true; msg += ' • ครบแล้ว! องค์ครูเปิดในสมุด และองค์นี้จะเริ่มโผล่ในงานประมูลหรือหน้าร้าน (ระวังของเก๊เกรดเทพ)'; }
  A.save(); return msg;
}
function onCustomerDone() { if (huntOn() && Math.random() < .08) { const t = addClue('ลูกค้าที่แวะมาเล่าเรื่องเก่า'); if (t) A.toast(t, 'good'); } }
function markOwned(modelId) {
  const st = S().legend[modelId]; if (!st || st.own) return;
  st.own = true; A.toast(`ได้ครอบครอง ${legendById(modelId).name} ของแท้แล้ว!`, 'good');
  if (legendsOwned() >= LEGENDS.length && !S().endings.legend) queueEnding('legend');
}
// ลูกค้านำพระในตำนานมาเสนอ (เฉพาะองค์ที่เปิดแล้วและยังไม่ได้ครอบครอง) ครึ่งหนึ่งเป็นของเก๊เกรดเทพ (ผิด 1 จุดละเอียด หรือเนื้อเรซิ่น)
function legendPiece(r, m) {
  const genuine = r() < .5, spec = genuine ? { ...m.spec } : r() < .4 ? { ...m.spec, resin: 'yes' } : A.mutate(m.spec, 1, r, 'fine');
  return { modelId: m.id, genuine, spec, cond: Math.round(84 + r() * 16), seed: Math.floor(r() * 1e9) };
}
function legendCustomer(r) {
  const open = legendsOpen().filter(m => !S().legend[m.id].own); if (!open.length || r() > .25) return null;
  const m = pick(r, open), p = legendPiece(r, m);
  return { id: S().nextId++, name: pick(r, ['ทายาทคหบดีเก่า', 'นักสะสมจากแดนไกล', 'ลุงเก็บของเก่าใต้ถุนบ้าน']), line: 'องค์นี้เป็นตำนานที่เขาตามหากันทั้งวงการ ดูให้ดี ๆ นะ', ...p, ask: round100(m.price * A.cf(p.cond) * (p.genuine ? .7 + r() * .3 : .5 + r() * .35)), patience: 2 + starPatience(), claim: null, frame: null };
}
function buyClueCost() { return 300000 * (S().oldSian.n + 1); }
function buyClue() {
  const c = buyClueCost(); if (S().oldSian.day === S().day) return A.toast('เซียนรุ่นเก่าขายเบาะแสให้วันละครั้ง', 'bad');
  if (S().money < c) return A.toast('เงินไม่พอ', 'bad');
  const t = addClue('เซียนรุ่นเก่า'); if (!t) return A.toast('ได้เบาะแสครบทุกองค์แล้ว');
  S().money -= c; S().oldSian = { day: S().day, n: S().oldSian.n + 1 }; A.toast(t, 'good'); A.reModal(legendHTML()); A.render();
}
function legendHTML() {
  if (!huntOn()) return `<h2>ตามล่าพระในตำนาน</h2><p>ปลดล็อกที่ Lv.6</p>${backBtn()}`;
  return `<h2>ตามล่าพระในตำนาน</h2><p class="note">ตำนาน 5 องค์ไม่มีในสมุด ต้องเก็บเบาะแสองค์ละ 3 ชิ้น จากลูกค้าที่เล่าเรื่อง ชนะดวล ชนะประมูล หรือซื้อจากเซียนรุ่นเก่า ครบแล้วองค์นั้นจะโผล่ในงานประมูลหรือหน้าร้าน</p>` +
    LEGENDS.map(m => { const st = S().legend[m.id]; return `<div class="mdl"><b>${st.clues ? esc(m.name) : '??? พระในตำนาน'}</b> ${st.own ? '<span class="badge good">ครอบครองแล้ว</span>' : st.open ? '<span class="badge gold">เปิดแล้ว</span>' : ''}<div class="dots3">${[0, 1, 2].map(i => i < st.clues ? '●' : '○').join('')}</div>${m.clues.slice(0, st.clues).map(c => `<p class="note">• ${esc(c)}</p>`).join('')}</div>`; }).join('') +
    `<div class="row"><button class="btn" data-eg="buyclue" ${S().oldSian.day === S().day ? 'disabled' : ''}>ซื้อเบาะแสจากเซียนรุ่นเก่า<small>${fmt(buyClueCost())} • วันละครั้ง</small></button></div>${backBtn()}`;
}

/* ===== ชิ้นงานสุ่ม (ใช้ในดวลและประมูล) ===== */
function randomPiece(r, maxLvl, tier) {
  const m = pick(r, MODELS.filter(x => x.lvl <= maxLvl)), genuine = r() < .55, n = Math.min(1 + Math.floor(r() * 2), Object.keys(m.spec).length);
  return { modelId: m.id, genuine, spec: genuine ? { ...m.spec } : A.mutate(m.spec, n, r, tier), cond: Math.round(70 + r() * 30), seed: Math.floor(r() * 1e9) };
}

/* ===== ดวลส่องพระ: คู่แข่ง 4 คน วันละครั้ง พระ 5 องค์ 60 วินาที ===== */
const RIVALS = [
  { id: 'hawk', name: 'เฮียตาเหยี่ยว', acc: .74, time: 24, note: 'ส่องเร็วปานจรวด แต่พลาดบ่อย' },
  { id: 'calm', name: 'อาจารย์ใจเย็น', acc: .92, time: 55, note: 'ช้าแต่แม่นเหมือนจับวาง' },
  { id: 'lucky', name: 'เจ๊ดวงเฮง', acc: .62, time: 16, note: 'ตัดสินด้วยสัญชาตญาณล้วน ๆ' },
  { id: 'nerd', name: 'น้องแว่นสายสถิติ', acc: .83, time: 40, note: 'จดทุกองค์ลงสเปรดชีต' },
];
const duelOn = () => A.lvl() >= 4;
const duelStake = () => 10000 * A.lvl();
let DU = null;
function duelHTML() {
  if (!duelOn()) return `<h2>ดวลส่องพระ</h2><p>ปลดล็อกที่ Lv.4</p>${backBtn()}`;
  const st = S().duel, done = st.day === S().day;
  return `<h2>ดวลส่องพระ</h2><p class="note">พระ 5 องค์ เวลา 60 วินาที ตอบแท้/เก๊ให้ถูกมากกว่าคู่แข่ง (เสมอกันดูเวลา) เดิมพัน ${fmt(duelStake())} • ชนะคนเดิมครบ 3 ครั้ง ลูกค้าประจำของเขาจะย้ายมาร้านคุณ${huntOn() ? ' • ชนะมีโอกาสได้เบาะแสพระในตำนาน' : ''}</p>
    ${done ? '<p class="badge">วันนี้ดวลไปแล้ว พรุ่งนี้มาใหม่</p>' : ''}<div class="opts">` +
    RIVALS.map(r => { const wk = ((st.weak || {})[r.id] || 0) >= S().day; return `<div class="rvrow"><button class="btn opt" data-eg="duel:${r.id}" ${done || S().money < duelStake() ? 'disabled' : ''}><b>${esc(r.name)}${wk ? ' (เสียสมาธิอยู่)' : ''}</b><small>${esc(r.note)} • ชนะไปแล้ว ${st.wins[r.id] || 0} ครั้ง${st.regs[r.id] ? ' • ลูกค้าประจำย้ายมาแล้ว' : ''}</small></button><button class="btn grey rvatk" data-eg="attack:${r.id}" ${wk ? 'disabled' : ''}>ปล่อยข่าวโจมตี<small>สายเทา</small></button></div>`; }).join('') + `</div>${backBtn()}`;
}
function startDuel(rid) {
  const st = S().duel, rv = RIVALS.find(x => x.id === rid); if (!rv || st.day === S().day || S().money < duelStake()) return;
  const r = rng(hash('duel:' + S().seed + ':' + S().day)), L = A.lvl(), tier = L >= 5 ? 'fine' : undefined;
  DU = { rv, items: [0, 1, 2, 3, 4].map(() => randomPiece(r, Math.max(2, L), tier)), idx: 0, ans: [], t0: performance.now(), stake: duelStake() };
  st.day = S().day; A.save(); A.setMode('duel');
}
const duelLeft = () => DU ? Math.max(0, 60 - (performance.now() - DU.t0) / 1000) : 0;
function duelAnswer(g) { if (!DU || DU.over) return; DU.ans.push(g === DU.items[DU.idx].genuine); DU.idx++; if (DU.idx >= 5) finishDuel(); else A.render(); }
function finishDuel(forfeit) {
  if (!DU || DU.over) return; DU.over = true;
  const me = DU.ans.filter(Boolean).length, t = Math.round(60 - duelLeft()), r = rng(hash('rv:' + S().day + DU.rv.id));
  let rc = 0;
  const weak = ((S().duel.weak || {})[DU.rv.id] || 0) >= S().day; rc = 0; for (let i = 0; i < 5; i++) if (r() < DU.rv.acc - (weak ? .18 : 0)) rc++;
  const rt = Math.round((DU.rv.time + (weak ? 12 : 0)) * (.8 + r() * .4)), win = !forfeit && (me > rc || (me === rc && t < rt)), st = S().duel;
  let extra = '';
  if (win) {
    S().money += DU.stake; S().rep = Math.min(100, S().rep + 3); st.total++; st.wins[DU.rv.id] = (st.wins[DU.rv.id] || 0) + 1; A.gainXP(40);
    if (st.wins[DU.rv.id] >= 3 && !st.regs[DU.rv.id]) { st.regs[DU.rv.id] = true; extra += `<li class="gold">ชนะ${DU.rv.name}ครบ 3 ครั้ง! ลูกค้าประจำของเขาย้ายมาร้านคุณ (ลูกค้าเพิ่มวันละ 1 คน)</li>`; }
    if (Math.random() < .5) { const c = addClue(`การดวลชนะ${DU.rv.name}`); if (c) extra += `<li class="gold">${esc(c)}</li>`; }
  } else { S().money -= DU.stake; st.lost++; }
  const marks = [0, 1, 2, 3, 4].map(i => i < DU.ans.length ? (DU.ans[i] ? '🟩' : '🟥') : '⬜').join('');
  A.setMode('shop');
  A.openModal(`<h2>${win ? 'ชนะดวล!' : forfeit ? 'ยอมแพ้' : 'แพ้ดวล'}</h2><p class="marks">${marks}</p>
    <ul class="log"><li>คุณ: ถูก ${me}/5 ใช้เวลา ${t} วินาที</li><li>${esc(DU.rv.name)}: ถูก ${rc}/5 ใช้เวลา ${rt} วินาที</li>
    <li class="${win ? 'good' : 'bad'}">${win ? `ได้เงินเดิมพัน ${fmt(DU.stake)} ชื่อเสียง +3 +40 XP` : `เสียเงินเดิมพัน ${fmt(DU.stake)}`}</li>${extra}</ul>${A.levelHTML()}<div class="row"><button class="btn ok" data-close>กลับหน้าร้าน</button></div>`);
  DU = null; A.render();
}

/* ===== งานประมูล: ทุก 5 วัน (Lv.4+) 3–5 ล็อต ส่องก่อนประมูล เคาะจับเวลา 10 วินาทีต่อจังหวะ ===== */
const BIDDERS = [{ name: 'เสี่ยกระเป๋าหนัก', style: 'greedy' }, { name: 'คุณนายสะสมเงียบ', style: 'careful' }, { name: 'ลุงยกป้ายไว', style: 'shill' }, { name: 'หลานเซียนใหญ่', style: 'greedy' }, { name: 'เซียนต่างจังหวัด', style: 'careful' }, { name: 'พี่ผมเรียบแปล้', style: 'shill' }];
const aucOn = () => A.lvl() >= 4;
const aucToday = () => aucOn() && (S().day % 5 === 0 || S().auction.force === S().day) && S().auction.day !== S().day;
let AU = null;
function startAuction() {
  if (!aucToday()) return;
  const r = rng(hash('auc:' + S().seed + ':' + S().day)), L = A.lvl(), n = 3 + Math.floor(r() * 3), lots = [];
  const leg = legendsOpen().filter(m => !S().legend[m.id].own);
  for (let i = 0; i < n; i++) {
    const p = i === n - 1 && leg.length && r() < .6 ? legendPiece(r, pick(r, leg)) : randomPiece(r, Math.max(4, L), L >= 5 ? 'fine' : undefined);
    const m = A.modelById(p.modelId), est = round100(m.price * A.cf(p.cond));
    const bidders = []; const pool = BIDDERS.slice(); for (let k = 0, nb = 2 + Math.floor(r() * 2); k < nb; k++) { const b = pool.splice(Math.floor(r() * pool.length), 1)[0]; bidders.push({ ...b, max: round100(est * (b.style === 'greedy' ? 1 + r() * .35 : b.style === 'careful' ? .75 + r() * .25 : .97 + r() * .06)) }); }
    lots.push({ p, est, bidders });
  }
  AU = { lots, i: 0, phase: 'preview', price: 0, high: null, t0: 0, log: [] };
  S().auction.day = S().day; A.save(); A.setMode('auction');
}
const curLot = () => AU && AU.lots[AU.i];
const aucLeft = () => AU && AU.phase === 'bid' ? Math.max(0, 10 - (performance.now() - AU.t0) / 1000) : 10;
function aucLog(t) { AU.log.unshift(t); AU.log = AU.log.slice(0, 4); }
function beginBid() { const lot = curLot(); AU.phase = 'bid'; AU.price = round100(lot.est * .55); AU.high = null; AU.t0 = performance.now(); aucLog(`เปิดประมูลที่ ${fmt(AU.price)}`); A.render(); }
function aiRespond() {
  const lot = curLot(), shill = lot.bidders.find(b => b.style === 'shill' && b.max > AU.price && AU.high !== b);
  let who = shill;
  if (!who) { const c = lot.bidders.filter(b => b.style !== 'shill' && b.max > AU.price * 1.05 && AU.high !== b); if (c.length && Math.random() < .8) who = pick(Math.random, c); }
  if (!who) return false;
  const inc = who.style === 'shill' ? .05 : .05 + Math.random() * .05; AU.price = round100(Math.min(who.max, AU.price * (1 + inc))); AU.high = who;
  aucLog(who.style === 'shill' ? `${who.name} ยกป้ายทันที ${fmt(AU.price)}` : `${who.name} เคาะ ${fmt(AU.price)}`); return true;
}
function myBid(pct) {
  if (!AU || AU.phase !== 'bid') return; const np = AU.high ? round100(AU.price * (1 + pct)) : AU.price;
  if (S().money < np) return A.toast('เงินไม่พอเคาะราคานี้', 'bad');
  AU.price = np; AU.high = 'me'; aucLog(`คุณเคาะ ${fmt(np)}`);
  if (!aiRespond()) return settleLot();
  AU.t0 = performance.now(); A.render();
}
function aucPass() { if (AU && AU.phase === 'bid') { aucLog('คุณผ่าน'); settleLot(); } }
function settleLot() {
  const lot = curLot(), m = A.modelById(lot.p.modelId); AU.phase = 'sold';
  if (AU.high === 'me') {
    S().money -= AU.price; A.addItem(lot.p, AU.price); S().auction.won++;
    let t = `คุณชนะประมูล ${m.name} ที่ ${fmt(AU.price)}`; if (huntOn() && Math.random() < .3) { const c = addClue('การชนะประมูล'); if (c) t += ' • ' + c; }
    A.toast(t, 'good'); aucLog('ขายให้คุณ');
  } else if (AU.high && AU.high.style === 'shill') { A.toast(`ล็อตนี้ไม่ถูกขาย ${AU.high.name} เป็นหน้าม้าของคนขาย ราคาไม่ถึงที่ตั้งไว้`); aucLog('ไม่มีผู้ชนะ (หน้าม้า)'); }
  else if (AU.high) { A.toast(`${AU.high.name} ได้ ${m.name} ไปที่ ${fmt(AU.price)}`); aucLog(`ขายให้ ${AU.high.name}`); }
  else aucLog('ไม่มีใครเคาะ');
  A.save(); setTimeout(nextLot, 900); A.render();
}
function nextLot() {
  if (!AU) return; AU.i++; if (AU.i >= AU.lots.length) { endAuction(); return; }
  AU.phase = 'preview'; AU.high = null; AU.log = []; A.setMode('auction');
}
function endAuction() { const n = AU ? AU.lots.length : 0; AU = null; A.setMode('shop'); A.toast(`งานประมูลจบแล้ว (${n} ล็อต) ของที่ชนะเข้าตู้พระแล้ว`); }
function skipLot() { if (AU && AU.phase === 'preview') { aucLog('ข้ามล็อต'); nextLot(); } }

/* ===== ส่วนที่ game.js เรียกใช้บน stage: โหมด duel / auction ===== */
function modePiece(mode) {
  if (mode === 'duel' && DU) return DU.items[Math.min(DU.idx, 4)];
  if (mode === 'auction' && AU) return curLot().p;
  return null;
}
function modeKey(mode) { return mode === 'duel' && DU ? 'du' + S().day + ':' + DU.idx : mode === 'auction' && AU ? 'au' + S().day + ':' + AU.i : null; }
function modeCard(mode) {
  const p = modePiece(mode); if (!p) return '';
  const m = A.modelById(p.modelId);
  if (mode === 'duel') return `<div class="ava">ดวล</div><div><div class="who">ดวลกับ ${esc(DU.rv.name)} <span class="badge">องค์ที่ ${DU.idx + 1}/5</span></div><div class="line">ตอบให้ไวและแม่น! เดิมพัน ${fmt(DU.stake)}</div></div>
    <div class="pname">${esc(m.name)} ${A.rarBadge(m)}</div><div class="facts"><span>สภาพ <b>${p.cond}/100</b></span><span class="dmarks">${DU.ans.map(a => a ? '🟩' : '🟥').join('')}${'⬜'.repeat(5 - DU.ans.length)}</span></div>`;
  const lot = curLot();
  return `<div class="ava">ป</div><div><div class="who">งานประมูล ล็อต ${AU.i + 1}/${AU.lots.length} ${m.legend ? '<span class="badge gold">พระในตำนาน</span>' : ''}</div><div class="line">${AU.phase === 'preview' ? 'ส่องให้ดีก่อนเริ่มประมูล ผู้จัดไม่รับประกันความแท้' : esc(AU.log.join(' • '))}</div></div>
    <div class="pname">${esc(m.name)} ${A.rarBadge(m)}</div><div class="facts"><span>ราคาประเมิน <b>${fmt(lot.est)}</b></span><span>สภาพ <b>${p.cond}/100</b></span>${AU.phase !== 'preview' ? `<span>ราคาตอนนี้ <b>${fmt(AU.price)}</b></span><span>ผู้นำ <b>${AU.high === 'me' ? 'คุณ' : AU.high ? esc(AU.high.name) : '-'}</b></span>` : `<span>ผู้ร่วมประมูล <b>${lot.bidders.map(b => esc(b.name)).join(', ')}</b></span>`}</div>`;
}
function modeActs(mode) {
  if (mode === 'duel') return `<button class="btn dim" data-a="eg:forfeit">ยอมแพ้</button><button class="btn ok" data-a="eg:dyes">แท้</button><button class="btn no" data-a="eg:dno">เก๊</button>`;
  if (!AU) return '';
  if (AU.phase === 'preview') return `<button class="btn dim" data-a="eg:aucend">ออกจากงาน</button><button class="btn" data-a="eg:skip">ข้ามล็อต</button><button class="btn ok" data-a="eg:begin">เริ่มประมูล</button>`;
  if (AU.phase === 'sold') return `<button class="btn span3" disabled>กำลังไปล็อตถัดไป…</button>`;
  const lab = p => AU.high ? `+${p * 100}%` : 'เคาะราคาเปิด';
  return `<button class="btn dim" data-a="eg:pass">ผ่าน</button>` + (AU.high ? [.05, .1, .2] : [0]).map(p => `<button class="btn ok" data-a="eg:bid${p}">${lab(p)}<small>${fmt(AU.high ? round100(AU.price * (1 + p)) : AU.price)}</small></button>`).join('');
}
function modeQinfo(mode) {
  if (mode === 'duel' && DU) return `<span class="badge gold" id="egTimer">⏱ ${Math.ceil(duelLeft())} วินาที</span>`;
  if (mode === 'auction' && AU && AU.phase === 'bid') return `<span class="badge gold" id="egTimer">เคาะภายใน ${Math.ceil(aucLeft())} วินาที</span>`;
  return '';
}
function modeAct(a) {
  if (a === 'dyes' || a === 'dno') duelAnswer(a === 'dyes');
  else if (a === 'forfeit') finishDuel(true);
  else if (a === 'begin') beginBid(); else if (a === 'skip') skipLot(); else if (a === 'pass') aucPass();
  else if (a === 'aucend') endAuction();
  else if (a.startsWith('bid')) myBid(+a.slice(3));
}
function leaveMode(mode) { if (mode === 'duel' && DU) finishDuel(true); if (mode === 'auction' && AU) endAuction(); }
function egTick(mode) {
  const t = document.getElementById('egTimer');
  if (mode === 'duel' && DU) { if (t) t.textContent = `⏱ ${Math.ceil(duelLeft())} วินาที`; if (duelLeft() <= 0) finishDuel(); }
  if (mode === 'auction' && AU && AU.phase === 'bid') { if (t) t.textContent = `เคาะภายใน ${Math.ceil(aucLeft())} วินาที`; if (aucLeft() <= 0) aucPass(); }
}

/* ===== สาขาและลูกศิษย์ (Lv.6) ===== */
const BRANCH_T = { market: { name: 'แผงตลาดนัด', open: 200000, rent: 3000, vol: 3, edge: .16 }, mall: { name: 'บูธในห้าง', open: 800000, rent: 12000, vol: 5, edge: .2 }, online: { name: 'ร้านออนไลน์', open: 400000, rent: 5000, vol: 6, edge: .12 } };
const APPS = ['น้องต้นกล้า', 'ไอ้หนุ่มตาไว', 'พี่หมูตั้งใจ', 'เด็กวัดขยันเกิน', 'หลานป้าข้างร้าน'];
const trainCost = b => 30000 * (1 + Math.floor((b.skill - 30) / 10));
function branchHTML() {
  if (A.lvl() < 6) return `<h2>สาขาและลูกศิษย์</h2><p>ปลดล็อกที่ Lv.6</p>${backBtn()}`;
  const has = S().branches.map(b => b.t);
  return `<h2>สาขาและลูกศิษย์</h2><p class="note">ลูกศิษย์ซื้อขายเองทุกวัน ฝีมือ 30–90 คือโอกาสตัดสินแท้/เก๊ถูก จ่ายเงินสอน (+5) หรือให้ดูคุณส่อง (ชี้จุดเก๊ถูก = ทุกคน +1) ผลกำไรขาดทุนดูในสรุปวัน</p>` +
    S().branches.map((b, i) => `<div class="mdl"><b>${esc(BRANCH_T[b.t].name)}</b> • ลูกศิษย์ ${esc(b.app)}<div class="bars"><div class="bar"><span>ฝีมือ</span><i><em style="width:${b.skill}%"></em></i><b>${b.skill}</b></div></div><p class="note">ค่าเช่าวันละ ${fmt(BRANCH_T[b.t].rent)} • ซื้อขายวันละ ${BRANCH_T[b.t].vol} ครั้ง${b.last != null ? ` • เมื่อวาน ${b.last >= 0 ? 'กำไร' : 'ขาดทุน'} ${fmt(Math.abs(b.last))}` : ''}</p><div class="row"><button class="btn" data-eg="train:${i}" ${b.skill >= 90 || S().money < trainCost(b) ? 'disabled' : ''}>สอนลูกศิษย์ +5<small>${b.skill >= 90 ? 'ฝีมือเต็มแล้ว' : fmt(trainCost(b))}</small></button></div></div>`).join('') +
    (S().branches.length < 3 ? `<h3>เปิดสาขาใหม่</h3><div class="opts">${Object.entries(BRANCH_T).filter(([k]) => !has.includes(k)).map(([k, T]) => `<button class="btn opt" data-eg="branch:${k}" ${S().money < T.open ? 'disabled' : ''}><b>${T.name} ${fmt(T.open)}</b><small>ค่าเช่าวันละ ${fmt(T.rent)} • ซื้อขายวันละ ${T.vol} ครั้ง</small></button>`).join('')}</div>` : '') + backBtn();
}
function openBranch(k) {
  const T = BRANCH_T[k]; if (!T || A.lvl() < 6 || S().branches.length >= 3 || S().branches.some(b => b.t === k) || S().money < T.open) return;
  S().money -= T.open; S().branches.push({ t: k, app: pick(Math.random, APPS), skill: 30 + Math.floor(Math.random() * 31), last: null });
  A.toast(`เปิด${T.name}แล้ว`, 'good'); A.reModal(branchHTML()); A.render();
}
function train(i) { const b = S().branches[+i]; if (!b || b.skill >= 90 || S().money < trainCost(b)) return; S().money -= trainCost(b); b.skill = Math.min(90, b.skill + 5); A.reModal(branchHTML()); A.render(); }
function onSpotHit() { for (const b of S().branches) b.skill = Math.min(90, b.skill + 1); }

/* ===== พิพิธภัณฑ์พระ (Lv.6, ฿5,000,000) ===== */
const MUSEUM_COST = 5000000, CASE_COST = 1000000;
const RAR_PTS = { common: 5, rare: 12, epic: 25, legend: 50 };
const templeOf = m => (m.name.match(/วัด\S+/) || [''])[0];
function museumScore() {
  const it = S().museum.items, ms = it.map(x => A.modelById(x.modelId)).filter(Boolean);
  let base = 0; it.forEach((x, k) => { const m = ms[k]; if (!m) return; base += RAR_PTS[m.rar || 'common'] + Math.round(x.cond / 10) + 6 * (x.award || 0) + (m.legend ? 80 : 0); });
  const sets = [];
  if (new Set(ms.map(m => m.region).filter(Boolean)).size >= 4) sets.push(['ครบทุกภาค', 40]);
  if (new Set(ms.map(catOf)).size >= 4) sets.push(['ครบทุกหมวด', 40]);
  const byT = {}; for (const m of ms) { const t = templeOf(m); if (t) byT[t] = (byT[t] || 0) + 1; }
  for (const [t, n] of Object.entries(byT)) if (n >= 3) sets.push([`ชุด${t} 3 องค์`, 30]);
  return { base, sets, total: base + sets.reduce((a, s) => a + s[1], 0) };
}
const museumOK = it => it.genuine && it.cert === true && !it.consign && !it.share && !it.pend;
function museumHTML() {
  const mu = S().museum;
  if (A.lvl() < 6) return `<h2>พิพิธภัณฑ์พระ</h2><p>ปลดล็อกที่ Lv.6</p>${backBtn()}`;
  if (!mu.open) return `<h2>พิพิธภัณฑ์พระ</h2><p>สร้างพิพิธภัณฑ์จัดแสดงพระของแท้ที่มีใบรับรอง มีรายได้ค่าเข้าชมทุกวันตามคะแนน</p><div class="row"><button class="btn ok" data-eg="museum" ${S().money < MUSEUM_COST ? 'disabled' : ''}>สร้างพิพิธภัณฑ์<small>${fmt(MUSEUM_COST)}</small></button></div>${backBtn()}`;
  const sc = museumScore(), cands = S().inv.filter(museumOK);
  return `<h2>พิพิธภัณฑ์พระ</h2><p>คะแนน <b class="big">${sc.total}</b> • รายได้ค่าเข้าชมวันละ ${fmt(sc.total * 150)} • ตู้ ${mu.items.length}/${mu.cases}</p>
    <p class="note">คะแนนจากความหายาก สภาพ รางวัล และชุดที่ครบ: ${sc.sets.length ? sc.sets.map(s => `${esc(s[0])} +${s[1]}`).join(', ') : 'ยังไม่มีชุดที่ครบ (ลองสะสมให้ครบทุกภาค ทุกหมวด หรือ 3 องค์จากวัดเดียวกัน)'}</p>
    <div class="grid">${mu.items.map(x => { const m = A.modelById(x.modelId); return `<div class="item"><img class="thumb" data-thumb="x:${A.thumbKey(m, x.spec, x.cond, x.seed)}" alt=""><span class="nm">${esc(m.name)}</span><span>${A.rarBadge(m)}</span><button class="btn dim" data-eg="mout:${x.id}">นำออก</button></div>`; }).join('')}${'<div class="item empty-case">ตู้ว่าง</div>'.repeat(Math.max(0, mu.cases - mu.items.length))}</div>
    ${mu.cases < 12 ? `<div class="row"><button class="btn" data-eg="mcase" ${S().money < CASE_COST ? 'disabled' : ''}>เพิ่มตู้อีก 2 ตู้<small>${fmt(CASE_COST)}</small></button></div>` : ''}
    <h3>นำพระจากตู้พระมาจัดแสดง</h3>${cands.length ? `<div class="opts">${cands.map(x => { const m = A.modelById(x.modelId); return `<button class="btn opt" data-eg="min:${x.id}" ${mu.items.length >= mu.cases ? 'disabled' : ''}><b>${esc(m.name)}</b><small>${RAR[m.rar || 'common'][0]} • สภาพ ${x.cond}${x.award ? ' • ติดรางวัล' : ''}</small></button>`; }).join('')}</div>` : '<p class="note">ยังไม่มีพระของแท้ที่มีใบรับรองในตู้ (ต้องส่งตรวจก่อน)</p>'}${backBtn()}`;
}
function museumAct(a, id) {
  const mu = S().museum;
  if (a === 'museum') { if (A.lvl() < 6 || mu.open || S().money < MUSEUM_COST) return; S().money -= MUSEUM_COST; mu.open = true; A.toast('สร้างพิพิธภัณฑ์พระแล้ว!', 'good'); }
  if (a === 'mcase') { if (mu.cases >= 12 || S().money < CASE_COST) return; S().money -= CASE_COST; mu.cases += 2; }
  if (a === 'min') { const it = S().inv.find(x => String(x.id) === id); if (!it || !museumOK(it) || mu.items.length >= mu.cases) return; S().inv = S().inv.filter(x => x !== it); mu.items.push(it); }
  if (a === 'mout') { const it = mu.items.find(x => String(x.id) === id); if (!it) return; mu.items = mu.items.filter(x => x !== it); S().inv.unshift(it); }
  A.reModal(museumHTML()); A.render();
}

/* ===== สมาคมเซียนพระ (สมมติ): ลงสมัครเมื่อ ★5+ เลือกตั้งทุก 30 วัน ===== */
const ASSOC = 'สมาคมเซียนพระมหาสนุกแห่งประเทศสมมติ';
const voteScore = () => { const ms = S().museum.open ? museumScore().total : 0; return Math.round(S().rep + S().duel.total * 2 + ms / 10 + legendsOwned() * 10); };
const nextVote = () => Math.ceil((S().day + 1) / 30) * 30;
function assocHTML() {
  const a = S().assoc, n = stars();
  let body;
  if (a.pres) body = `<p class="big">คุณคือนายก${ASSOC}</p><p class="note">ยังเล่นต่อได้ตามปกติ</p>`;
  else if (n < 5) body = `<p>ลงสมัครนายกสมาคมได้เมื่อมีบารมี ★5 ขึ้นไป (ตอนนี้ ${starTxt(n) || '★0'})</p>`;
  else if (!a.cand) body = `<p>ลงสมัครชิงตำแหน่งนายกสมาคม เลือกตั้งทุก 30 วัน คะแนนจากชื่อเสียง ชนะดวล คะแนนพิพิธภัณฑ์ และพระในตำนาน</p><div class="row"><button class="btn ok" data-eg="cand" ${S().money < 100000 ? 'disabled' : ''}>ลงสมัคร (ค่าหาเสียง ${fmt(100000)})</button></div>`;
  else body = `<p>คุณลงสมัครแล้ว เลือกตั้งครั้งถัดไป <b>วันที่ ${nextVote()}</b></p>`;
  return `<h2>${ASSOC}</h2>${body}<table class="tells"><tr><td>ชื่อเสียง</td><td>${S().rep}</td></tr><tr><td>ชนะดวล × 2</td><td>${S().duel.total * 2}</td></tr><tr><td>พิพิธภัณฑ์ ÷ 10</td><td>${S().museum.open ? Math.round(museumScore().total / 10) : 0}</td></tr><tr><td>พระในตำนาน × 10</td><td>${legendsOwned() * 10}</td></tr><tr><td><b>คะแนนรวม</b></td><td><b>${voteScore()}</b></td></tr></table>${backBtn()}`;
}
function assocAct() { const a = S().assoc; if (a.cand || stars() < 5 || S().money < 100000) return; S().money -= 100000; a.cand = true; A.toast('ลงสมัครนายกสมาคมแล้ว', 'good'); A.reModal(assocHTML()); A.render(); }

/* ===== ทุก endDay: สาขา พิพิธภัณฑ์ เลือกตั้ง ===== */
function endgameDay(lines) {
  const s = S();
  for (const b of s.branches) {
    const T = BRANCH_T[b.t], r = rng(hash(b.t + ':' + s.day + ':' + s.seed)); let sum = -T.rent;
    for (let i = 0; i < T.vol; i++) { const m = pick(r, MODELS.filter(x => x.lvl <= 5)), v = m.price * (.3 + r() * .5); sum += r() < b.skill / 100 ? v * T.edge : -v * .3; }
    sum = Math.round(sum); b.last = sum; s.money += sum;
    lines.push([sum >= 0 ? 'good' : 'bad', `${T.name} (${b.app} ฝีมือ ${b.skill}): ${sum >= 0 ? 'กำไร' : 'ขาดทุน'} ${fmt(Math.abs(sum))} หลังหักค่าเช่า`]);
  }
  if (s.museum.open) { const inc = museumScore().total * 150; s.money += inc; lines.push(['good', `พิพิธภัณฑ์พระ: ค่าเข้าชม ${fmt(inc)}`]); }
  if (s.assoc.cand && !s.assoc.pres && s.day % 30 === 0) {
    const r = rng(hash('vote:' + s.day + s.seed)), my = voteScore(), rivals = [0, 1, 2].map(() => Math.round(80 + r() * 70 + s.day / 8)), best = Math.max(...rivals);
    if (my > best) { s.assoc.pres = true; lines.push(['gold', `ผลเลือกตั้ง${ASSOC}: คุณชนะด้วยคะแนน ${my} ต่อ ${best}!`]); queueEnding('pres'); }
    else lines.push(['bad', `ผลเลือกตั้ง${ASSOC}: คุณได้ ${my} คะแนน แพ้ผู้สมัครคนอื่น (${best}) ลองใหม่อีก 30 วัน`]);
  }
  if (aucOn() && (s.day + 1) % 5 === 0) lines.push(['gold', 'พรุ่งนี้มีงานประมูลพระ (เปิดจากเมนู ≡ → เป้าหมาย)']);
}

/* ===== ฉากจบ: ใช้ระบบกลางใน karma.js ผ่าน A.queueEnding ===== */
const queueEnding = id => A.queueEnding(id);

/* ===== หน้าเป้าหมาย ===== */
const backBtn = () => `<div class="row"><button class="btn dim" data-eg="goals">← เป้าหมาย</button></div>`;
function goalsHTML() {
  const s = S(), L = A.lvl(), n = stars(), bar = (v, t) => `<div class="bar"><span></span><i><em style="width:${clamp(v * 100, 0, 100)}%"></em></i><b>${t}</b></div>`;
  const row = (title, sub, prog, eg, btn, lock) => `<div class="mdl goal"><div class="bh"><b>${title}</b>${eg ? `<button class="btn" data-eg="${eg}" ${lock ? 'disabled' : ''}>${btn}</button>` : ''}</div><p class="note">${sub}</p>${prog || ''}</div>`;
  const clues = LEGENDS.reduce((a, m) => a + s.legend[m.id].clues, 0);
  return `<h2>เป้าหมาย</h2>` +
    row(L < 6 ? `เลเวล ${L}/6` : `บารมี ${starTxt(n) || '★0'} ${esc(starTitle(n))}`, L < 6 ? 'ถึง Lv.6 แล้ว XP ที่เกินจะกลายเป็นดาวบารมี' : n < 10 ? `ดาวถัดไป: ${esc(starTitle(n + 1))} • ทุกดาวขายพระได้ราคา +2% และทุก 3 ดาวลูกค้ารอนานขึ้น` : 'ครบ 10 ดาวแล้ว!', bar(L < 6 ? s.xp / 3000 : n >= 10 ? 1 : starProgress(), L < 6 ? `${s.xp}/3000` : `${n}/10`)) +
    row('ตามล่าพระในตำนาน', huntOn() ? `เบาะแส ${clues}/15 • ครอบครองแล้ว ${legendsOwned()}/5` : 'ปลดล็อกที่ Lv.6', bar(clues / 15, `${legendsOwned()}/5`), 'legend', 'ดูเบาะแส', !huntOn()) +
    row('ดวลส่องพระ', duelOn() ? `ชนะ ${s.duel.total} • แพ้ ${s.duel.lost} • ลูกค้าประจำที่ได้มา ${Object.keys(s.duel.regs).length}/4${s.duel.day === s.day ? ' • วันนี้ดวลแล้ว' : ''}` : 'ปลดล็อกที่ Lv.4', null, 'duelpage', 'ท้าดวล', !duelOn()) +
    row('งานประมูล', aucOn() ? (aucToday() ? 'วันนี้มีงานประมูล!' : `จัดทุก 5 วัน ครั้งถัดไปวันที่ ${Math.ceil((s.day + 1) / 5) * 5}`) + ` • ชนะประมูล ${s.auction.won} ครั้ง` : 'ปลดล็อกที่ Lv.4', null, 'auction', 'เข้างานประมูล', !aucToday()) +
    row('สาขาและลูกศิษย์', L >= 6 ? `สาขา ${s.branches.length}/3` : 'ปลดล็อกที่ Lv.6', bar(s.branches.length / 3, `${s.branches.length}/3`), 'branches', 'จัดการสาขา', L < 6) +
    row('พิพิธภัณฑ์พระ', L >= 6 ? (s.museum.open ? `คะแนน ${museumScore().total} • ตู้ ${s.museum.items.length}/${s.museum.cases}` : `สร้างได้ด้วยเงิน ${fmt(MUSEUM_COST)}`) : 'ปลดล็อกที่ Lv.6', null, 'museumpage', 'ไปพิพิธภัณฑ์', L < 6) +
    row(`นายก${ASSOC}`, s.assoc.pres ? 'คุณเป็นนายกสมาคมแล้ว' : n >= 5 ? (s.assoc.cand ? `ลงสมัครแล้ว เลือกตั้งวันที่ ${nextVote()}` : 'ลงสมัครได้แล้ว') : 'ต้องมีบารมี ★5', null, 'assoc', 'ดูสมาคม', false) +
    row('ฉากจบที่ปลดล็อก', A.endingsLine(), null);
}
// ปุ่มในหน้าต่าง ๆ ของโมดูลนี้ (data-eg) — คืน true ถ้าจัดการแล้ว
function egClick(el) {
  const [a, v] = el.dataset.eg.split(':');
  const pages = { goals: goalsHTML, legend: legendHTML, duelpage: duelHTML, branches: branchHTML, museumpage: museumHTML, assoc: assocHTML };
  if (pages[a]) { A.openModal(pages[a]()); return true; }
  if (a === 'attack') { const rv = RIVALS.find(x => x.id === v); if (rv) A.attackRival(rv.id, rv.name); return true; }
  if (a === 'buyclue') buyClue(); else if (a === 'duel') startDuel(v); else if (a === 'auction') startAuction();
  else if (a === 'branch') openBranch(v); else if (a === 'train') train(v);
  else if (['museum', 'mcase', 'min', 'mout'].includes(a)) museumAct(a, v); else if (a === 'cand') assocAct();
  else if (a === 'copyend') { const t = el.dataset.share; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => A.toast('คัดลอกแล้ว', 'good'), () => A.toast(t)); }
  else return false;
  return true;
}

export {
  initEndgame, normEndgame, stars, starTitle, starTxt, starMult, starPatience, starProgress, LEGENDS, legendById, legendsOpen, legendsOwned, addClue, onCustomerDone, markOwned, legendCustomer,
  RIVALS, duelOn, aucOn, aucToday, modePiece, modeKey, modeCard, modeActs, modeQinfo, modeAct, leaveMode, egTick, onSpotHit, endgameDay, goalsHTML, egClick, museumScore, CATS, REGIONS,
};
