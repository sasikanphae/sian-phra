// เฟส 5: กิจกรรมนอกร้าน — เดินสนามพระ, ทริปต่างจังหวัด, ขุดกรุ
// ไม่ import จาก game.js: game.js เรียก initOuting(api) — แผง แม่ค้า วัด และหมู่บ้านทั้งหมดเป็นเรื่องสมมติ
import { clamp, rng, hash, fmt, pick, esc, round100 } from './util.js';
import { MODELS, REGIONS, subsOf } from './data.js';

let A = null;
const S = () => A.S();
function initOuting(api) { A = api; }
function normOuting(s) { s.market = s.market || { day: 0, pts: 10, bought: [] }; s.dig = s.dig || { invite: null, until: 0 }; s.away = s.away || 0; }

/* ===== แผงและแม่ค้า (สมมติ) =====
   type: sian = แพงแต่แท้, junk = ของเก๊ล้วน, auntie = ดูพระไม่เป็น (มีของหลุด), mixed = ปนกัน */
const VENDORS = [
  { name: 'แผงป้าแจ๋วใจดี', type: 'auntie', note: 'ขายของเก่าในบ้าน ตั้งราคาตามความรู้สึก', col: '#c0392b' },
  { name: 'แผงเฮียหน้านิ่ง', type: 'sian', note: 'ไม่ต่อราคา ไม่ยิ้ม แต่ไม่เคยมีใครบ่นเรื่องของเก๊', col: '#1f6f8b' },
  { name: 'แผงลุงลดทุกองค์', type: 'junk', note: 'ป้ายเขียนว่า "แท้ทุกองค์ ลด 50%" ตัวใหญ่มาก', col: '#d68910' },
  { name: 'แผงเจ๊ปากหวาน', type: 'mixed', note: 'พูดเก่งมาก ทุกองค์ "สวยแชมป์"', col: '#8e44ad' },
  { name: 'แผงน้องเพิ่งหัดขาย', type: 'auntie', note: 'รับมรดกพระจากคุณตา ยังแยกพิมพ์ไม่เป็น', col: '#27ae60' },
  { name: 'แผงเซียนแว่นดำ', type: 'sian', note: 'มีใบรับรองแปะทุกองค์ ราคาตามตลาดบวกนิดหน่อย', col: '#34495e' },
  { name: 'แผงพี่ของถูกมีทุกรุ่น', type: 'junk', note: 'มีครบทุกรุ่นในสมุด ราคาถูกเหลือเชื่อ', col: '#a04000' },
  { name: 'แผงยายขายของเก่า', type: 'auntie', note: 'ขายถ้วยชาม ของเก่า มีพระปนมาในตะกร้า', col: '#7d6608' },
];
const weekend = () => S().day % 7 === 6 || S().day % 7 === 0;
const nextWeekend = () => { let d = S().day + 1; while (!(d % 7 === 6 || d % 7 === 0)) d++; return d; };
// ราคาตลาดถ้าแท้ (รวมพิมพ์ย่อยจริง)
const worth = p => { const m = A.modelById(p.modelId), sb = (subsOf(m) || []).find(x => x.id === p.spec.sub); return m.price * A.cf(p.cond) * (sb ? sb.mult : 1); };
function makeTrayPiece(r, m, genuine, type) {
  const spec = genuine ? { ...m.spec } : A.mutate(m.spec, Math.min(1 + Math.floor(r() * 2), Object.keys(m.spec).length), r, A.lvl() >= 5 ? 'fine' : undefined);
  const subs = subsOf(m); if (subs) spec.sub = subs[r() < .75 ? 0 : Math.floor(r() * subs.length)].id;
  const p = { modelId: m.id, genuine, spec, cond: Math.round(62 + r() * 36), seed: Math.floor(r() * 1e9), patience: type === 'sian' ? 0 : 1 + Math.floor(r() * 2) };
  const base = A.modelById(m.id).price * A.cf(p.cond); // แม่ค้าตั้งราคาจากราคาพิมพ์มาตรฐาน (ไม่ดูพิมพ์ย่อย)
  p.price = round100(base * (type === 'sian' ? 1.1 + r() * .3 : type === 'junk' ? .4 + r() * .3 : type === 'auntie' ? .6 + r() * .3 : type === 'region' ? .7 * (.85 + r() * .25) : .8 + r() * .3));
  return p;
}
// สร้างแผงทั้งหมดของรอบ (seed จากวันที่ จึงรีโหลดแล้วได้ชุดเดิม) พร้อมซ่อนของหลุด 1–3 องค์ในแผงที่แม่ค้าดูไม่เป็น
function buildStalls(seedKey, list, pool) {
  const r = rng(hash(seedKey)), stalls = list.map(v => {
    const n = 12 + Math.floor(r() * 9), items = [];
    for (let i = 0; i < n; i++) { const m = pick(r, pool), gen = v.type === 'sian' || v.type === 'fair' ? true : v.type === 'junk' ? false : v.type === 'region' ? r() < .7 : r() < (v.type === 'auntie' ? .45 : .6); items.push(makeTrayPiece(r, m, gen, v.type)); }
    return { ...v, items };
  });
  const naive = stalls.filter(s => s.type === 'auntie' || s.type === 'mixed' || s.type === 'region');
  for (let g = 0, ng = 1 + Math.floor(r() * 3); g < ng && naive.length; g++) {
    const st = pick(r, naive), p = st.items[Math.floor(r() * st.items.length)], m = A.modelById(p.modelId), subs = subsOf(m);
    p.genuine = true; p.spec = { ...m.spec, ...(p.spec.sub ? { sub: p.spec.sub } : {}) }; p.gem = true;
    if (subs && subs.length > 1 && r() < .5) p.spec.sub = subs.reduce((a, b) => b.mult > a.mult ? b : a).id; // พิมพ์นิยมที่แม่ค้าคิดว่าพิมพ์ธรรมดา
    else p.price = round100(A.modelById(p.modelId).price * A.cf(p.cond) * (.3 + r() * .2)); // ของแท้ที่ตั้งราคาถูกเพราะดูไม่เป็น
  }
  return stalls;
}

/* ===== ที่เที่ยว (venue): สนามพระ หรือ ตลาดของภาคในทริป ===== */
let VEN = null, OC = null;
function marketVenue() {
  const d = S().day, mk = S().market; if (mk.day !== d) S().market = { day: d, pts: 10, bought: [] };
  const r = rng(hash('mk:' + d + ':' + S().seed)), vs = VENDORS.slice().sort(() => r() - .5).slice(0, 6 + Math.floor(r() * 3));
  return { kind: 'market', title: 'สนามพระวันหยุด', stalls: buildStalls('mkt:' + d + ':' + S().seed, vs, MODELS.filter(m => m.lvl <= Math.max(3, A.lvl()))), get pts() { return S().market.pts; }, set pts(v) { S().market.pts = v; }, bought: S().market.bought };
}
function openMarket() {
  if (!weekend()) return A.toast(`สนามพระเปิดเฉพาะวันหยุด ครั้งถัดไปวันที่ ${nextWeekend()}`, 'bad');
  VEN = marketVenue(); A.openModal(venueHTML());
}
function venueHTML() {
  const v = VEN; if (!v) return '';
  return `<h2>${esc(v.title)}</h2><p>พลังเดิน <b class="big">${v.pts}</b>/10 <span class="note">• เปิดดูองค์ 3D ใช้ 1 แต้ม หมดแล้วต้องกลับ</span></p><p class="note">ลองหา "ของหลุด" ที่แม่ค้าดูไม่เป็น เช่น ของแท้ราคาถูก หรือพิมพ์นิยมที่ถูกตั้งราคาเป็นพิมพ์ธรรมดา</p>
    <div class="stalls">${v.stalls.map((s, i) => `<button class="stall" data-o="stall:${i}" style="--aw:${s.col}"><span class="awn"></span><b>${esc(s.name)}</b><small>${esc(s.note)}</small><span class="note">ถาดพระ ${s.items.length} องค์</span></button>`).join('')}</div>
    <div class="row">${v.kind === 'trip' ? '<button class="btn ok" data-o="tripback">เดินทางกลับร้าน (ใช้เวลา 2 วัน)</button>' : '<button class="btn dim" data-close>กลับร้าน</button>'}</div>`;
}
function stallHTML(i) {
  const v = VEN, s = v.stalls[i];
  return `<h2>${esc(s.name)}</h2><p class="note">${esc(s.note)} • พลังเดินเหลือ ${v.pts}</p><div class="tray">` +
    s.items.map((p, j) => { const m = A.modelById(p.modelId), sold = v.bought.includes(i + ':' + j); return `<button class="tp" data-o="look:${i}:${j}" ${sold || !v.pts ? 'disabled' : ''}><img data-thumb="x:${A.thumbKey(m, p.spec, p.cond, p.seed, .3)}" alt=""><small>${sold ? 'ขายแล้ว' : fmt(p.price)}</small></button>`; }).join('') +
    `</div><div class="row"><button class="btn dim" data-o="venue">← แผงอื่น</button></div>`;
}
function look(i, j) {
  const v = VEN; if (!v || v.pts <= 0) return A.toast('พลังเดินหมดแล้ว ต้องกลับร้าน', 'bad');
  v.pts--; OC = { s: i, j, p: v.stalls[i].items[j] }; A.save(); A.setMode('outing');
}
function backToStall() { const i = OC ? OC.s : 0; OC = null; A.setMode('shop'); if (VEN) A.openModal(VEN.pts > 0 ? stallHTML(i) : venueDone()); }
function venueDone() { return `<h2>พลังเดินหมดแล้ว</h2><p>เดินจนขาลาก ได้เวลากลับร้าน</p><div class="row">${VEN && VEN.kind === 'trip' ? '<button class="btn ok" data-o="tripback">เดินทางกลับร้าน</button>' : '<button class="btn ok" data-close>กลับร้าน</button>'}</div>`; }
function oBuy() {
  if (!OC) return; const p = OC.p; if (S().money < p.price) return A.toast('เงินไม่พอ', 'bad');
  S().money -= p.price; A.addItem({ modelId: p.modelId, genuine: p.genuine, spec: p.spec, cond: p.cond, seed: p.seed }, p.price);
  VEN.bought.push(OC.s + ':' + OC.j); A.toast(`ซื้อ ${A.modelById(p.modelId).name} ที่ ${fmt(p.price)} เก็บเข้าตู้แล้ว`, 'good'); A.save(); backToStall();
}
function oNego() {
  if (!OC) return; const p = OC.p, st = VEN.stalls[OC.s];
  if (p.patience <= 0) return A.toast(st.type === 'sian' ? 'เฮียไม่ลดให้หรอก ราคานี้ราคาเดียว' : 'แม่ค้าไม่ยอมลดแล้ว', 'bad');
  p.patience--; if (Math.random() < .25) A.toast('ลดไม่ได้แล้วจ้ะ ทุนมาเท่านี้'); else { p.price = round100(p.price * (1 - (.05 + Math.random() * .07))); A.toast(`ลดให้เหลือ ${fmt(p.price)} ก็แล้วกัน`); }
  A.render();
}

/* ===== ทริปต่างจังหวัด: แผนที่ 4 ภาค (สมมติ) ใช้ 2 วัน ===== */
const TRIP = { north: { cost: 12000, fair: 'งานบุญปอยหลวงประจำภาค', fill: '#5b8c5a' }, isan: { cost: 9000, fair: 'งานบุญบั้งไฟประจำภาค', fill: '#c49a3c' }, central: { cost: 4000, fair: 'งานวัดประจำปีริมแม่น้ำ', fill: '#c0563f' }, south: { cost: 14000, fair: 'งานชักพระประจำภาค', fill: '#3f7fa8' } };
// แผนที่แบบภาพวาดสมมติ (ไม่ใช่แผนที่จริง) path ในพิกัด viewBox 0 0 300 520
const REG_PATH = {
  north: 'M70 20 L150 8 L200 40 L190 110 L150 150 L95 150 L60 110 Z',
  isan: 'M200 40 L280 90 L290 170 L250 230 L180 220 L150 150 L190 110 Z',
  central: 'M95 150 L150 150 L180 220 L170 285 L120 300 L80 250 Z',
  south: 'M120 300 L170 285 L175 330 L150 380 L170 450 L150 510 L120 500 L130 430 L110 370 Z',
};
const REG_LABEL = { north: [130, 85], isan: [225, 140], central: [130, 230], south: [142, 400] };
const tripCost = k => TRIP[k].cost * (1 + A.lvl() * .25);
function tripHTML() {
  if (A.lvl() < 2) return `<h2>ทริปต่างจังหวัด</h2><p>ปลดล็อกที่ Lv.2</p>${hubBack()}`;
  return `<h2>ทริปต่างจังหวัด</h2><p class="note">เดินทางใช้เวลา 2 วัน (ร้านปิด${S().branches && S().branches.length ? ' แต่ลูกศิษย์ช่วยเฝ้าร้าน' : ''}) ที่ต้นทางพระของภาคนั้นถูกกว่าปกติ 30% และมีงานวัดประจำภาค แผนที่เป็นภาพวาดสมมติ</p>
    <svg class="tmap" viewBox="0 0 300 520" role="img" aria-label="แผนที่ 4 ภาค (ภาพวาดสมมติ)">${Object.entries(REG_PATH).map(([k, d]) => `<path d="${d}" fill="${TRIP[k].fill}" data-o="trip:${k}" class="reg"><title>${REGIONS[k]}</title></path>`).join('')}
    ${Object.entries(REG_LABEL).map(([k, [x, y]]) => `<text x="${x}" y="${y}" text-anchor="middle">${REGIONS[k]}</text>`).join('')}</svg>
    <div class="opts">${Object.keys(TRIP).map(k => `<button class="btn opt" data-o="trip:${k}" ${S().money < tripCost(k) ? 'disabled' : ''}><b>${REGIONS[k]} • ${fmt(tripCost(k))}</b><small>${esc(TRIP[k].fair)}</small></button>`).join('')}</div>${hubBack()}`;
}
const EVENTS_TRIP = [
  { t: 'ระหว่างทางแวะหมู่บ้าน ชาวบ้านบอกว่ามีพระเก่าของปู่เก็บไว้ในบ้าน', o: [['ขอเช่าเลยโดยไม่ส่อง', 'blind'], ['ขอส่องก่อน', 'peek'], ['ขอบคุณแล้วไปต่อ', 'skip']] },
  { t: 'รถเสียกลางทาง!', o: [['จ่ายค่าซ่อมด่วน', 'repair'], ['ขอให้ชาวบ้านช่วยลาก', 'help']] },
  { t: 'ผ่านวัดเก่าที่กำลังบูรณะ หลวงตาเดินมาทักทาย', o: [['ร่วมทำบุญบูรณะวัด', 'donate'], ['ไหว้พระแล้วไปต่อ', 'skip']] },
  { t: 'มีคนริมทางเรียกขายพระ "กรุแตกใหม่" ราคาถูกมาก', o: [['ซื้อเลย ราคาดีขนาดนี้', 'scam'], ['ไม่สนใจ', 'skip']] },
];
let TRS = null;
function startTrip(k) {
  const c = tripCost(k); if (A.lvl() < 2 || S().money < c) return;
  S().money -= c; const r = rng(hash('trip:' + S().day + k + S().seed));
  TRS = { region: k, events: EVENTS_TRIP.slice().sort(() => r() - .5).slice(0, 1 + Math.floor(r() * 2)), ei: 0, log: [] };
  A.save(); A.openModal(tripEventHTML());
}
function tripEventHTML() {
  const e = TRS.events[TRS.ei];
  return `<h2>ทริป${REGIONS[TRS.region]}</h2>${TRS.log.length ? `<ul class="log">${TRS.log.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<p>${esc(e.t)}</p><div class="opts">${e.o.map(([n, k]) => `<button class="btn opt" data-o="tev:${k}"><b>${esc(n)}</b></button>`).join('')}</div>`;
}
function tripEvent(k) {
  const r = Math.random, L = A.lvl(), reg = MODELS.filter(m => m.region === TRS.region && m.lvl <= Math.max(2, L)), m = pick(r, reg.length ? reg : MODELS.filter(x => x.lvl <= 2));
  let t = '';
  if (k === 'blind' || k === 'peek') {
    const gen = r() < .5, price = round100(m.price * .35), p = { modelId: m.id, genuine: gen, spec: gen ? { ...m.spec, crust: true } : A.mutate(m.spec, 2, Math.random), cond: Math.round(65 + r() * 25), seed: Math.floor(r() * 1e9) };
    if (k === 'peek' && !gen && r() < .7) t = `ส่องแล้วเห็นว่าไม่น่าใช่ของแท้ เลยขอบคุณแล้วไปต่อ`;
    else if (S().money >= price) { S().money -= price; A.addItem(p, price); t = `เช่า ${m.name} จากชาวบ้านมา ${fmt(price)}${k === 'peek' ? ' (ส่องแล้วดูดีอยู่)' : ''}`; }
    else t = 'เงินไม่พอ เลยได้แต่ดู';
  } else if (k === 'repair') { const c = 3000 * L; S().money -= c; t = `จ่ายค่าซ่อมรถ ${fmt(c)}`; }
  else if (k === 'help') { A.addMerit(1); S().rep = Math.min(100, S().rep + 1); t = 'ชาวบ้านช่วยลากรถ เลยได้เพื่อนใหม่ บุญ +1 ชื่อเสียง +1'; }
  else if (k === 'donate') { const c = 2000 * L; S().money -= c; A.addMerit(4); t = `ร่วมทำบุญ ${fmt(c)} บุญ +4`; }
  else if (k === 'scam') { const p = { modelId: m.id, genuine: false, spec: A.mutate(m.spec, 2, Math.random), cond: 90, seed: Math.floor(r() * 1e9) }, price = round100(m.price * .25); if (S().money >= price) { S().money -= price; A.addItem(p, price); t = `ซื้อ ${m.name} มา ${fmt(price)} (ดูเงาวับใหม่เอี่ยมแปลก ๆ)`; } else t = 'เงินไม่พอ รอดตัวไป'; }
  else t = 'เดินทางต่อ';
  TRS.log.push(t); TRS.ei++; A.save(); A.render();
  if (TRS.ei < TRS.events.length) return A.openModal(tripEventHTML());
  // ถึงที่หมาย: ตลาดพระของภาค (ถูกกว่า 30%) + งานวัดประจำภาค
  const pool = MODELS.filter(x => x.region === TRS.region && x.lvl <= Math.max(3, L) + 1), all = pool.length ? pool : MODELS.filter(x => x.lvl <= L);
  VEN = { kind: 'trip', title: `ตลาดพระ${REGIONS[TRS.region]}`, stalls: buildStalls('tripmk:' + S().day + TRS.region + S().seed, [{ name: `แผงพระพื้นบ้าน${REGIONS[TRS.region]}`, type: 'region', note: 'พระของภาคนี้ ราคาต้นทางถูกกว่าในเมือง 30%', col: TRIP[TRS.region].fill }, { name: `แผงเฒ่าเก็บของ${REGIONS[TRS.region]}`, type: 'region', note: 'ของเก่าจากบ้านคนในพื้นที่', col: '#6e4b2a' }, { name: TRIP[TRS.region].fair, type: 'fair', note: 'ซุ้มวัดนำพระเก่ามาให้บูชา รายได้เข้าวัด', col: '#b8860b' }], all), pts: 10, bought: [] };
  A.openModal(`<h2>ถึง${REGIONS[TRS.region]}แล้ว</h2><ul class="log">${TRS.log.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` + venueHTML().replace(/^<h2>[^<]*<\/h2>/, ''));
}
function tripBack() {
  if (!TRS) return; const reg = TRS.region; TRS = null; VEN = null; OC = null;
  S().away = 2; const lines = [...A.endDay({ silent: true }), ...A.endDay({ silent: true })]; S().away = 0;
  A.openModal(`<h2>กลับจากทริป${REGIONS[reg]}</h2><p class="note">ร้านปิด 2 วันระหว่างเดินทาง</p><ul class="log">${lines.map(([k, t]) => `<li class="${k}">${esc(t)}</li>`).join('')}</ul><div class="row"><button class="btn ok" data-close>เปิดร้าน</button></div>`);
  A.render();
}
// ระหว่างร้านปิด: ถ้ามีสาขา ลูกศิษย์ฝีมือดีสุดช่วยเฝ้าร้าน
function awayLine() {
  const bs = S().branches || []; if (!bs.length) return ['', 'ร้านปิดระหว่างเดินทาง ไม่มีลูกค้า'];
  const b = bs.reduce((a, x) => x.skill > a.skill ? x : a), inc = Math.round(2000 * A.lvl() * (b.skill / 50) * (.6 + Math.random() * .8)); S().money += inc;
  return ['good', `${b.app} ช่วยเฝ้าร้านระหว่างคุณไม่อยู่ ได้กำไร ${fmt(inc)}`];
}

/* ===== ขุดกรุ: วัดที่ไว้ใจ ≥ 60 เชิญไปช่วย มินิเกมขูดดิน ===== */
function digDay(lines) {
  const s = S(); if (s.dig.invite && s.day >= s.dig.until) { lines.push(['', 'คำเชิญไปช่วยขุดกรุหมดเวลาแล้ว']); s.dig = { invite: null, until: 0 }; }
  if (s.dig.invite || A.lvl() < 3) return;
  const ok = Object.entries(s.trust || {}).filter(([, v]) => v >= 60); if (!ok.length || Math.random() > .04 * A.goodMult()) return;
  const [tid] = pick(Math.random, ok); s.dig = { invite: tid, until: s.day + 4 };
  lines.push(['gold', `${A.templeName(tid)}บูรณะเจดีย์แล้วพบกรุ! เชิญคุณไปช่วย (ภายใน 3 วัน) • เมนู ≡ → นอกร้าน`]);
}
let DG = null;
function digHTML() {
  const s = S(); if (!s.dig.invite) return `<h2>ขุดกรุ</h2><p>ยังไม่มีวัดเชิญ วัดที่ไว้ใจคุณ 60 ขึ้นไปจะเชิญเมื่อบูรณะเจดีย์แล้วพบกรุ (เกิดไม่บ่อย)</p>${hubBack()}`;
  return `<h2>ขุดกรุ ${esc(A.templeName(s.dig.invite))}</h2><p>ค่อย ๆ ขูดดินออกจากองค์พระด้วยนิ้วหรือเมาส์ ขูดเร็วหรือแรงเกินไปองค์จะบิ่นและสภาพลดลง</p><div class="row"><button class="btn ok" data-o="digstart">ลงมือขุด</button></div>${hubBack()}`;
}
function digStart() {
  const s = S(); if (!s.dig.invite) return; const r = rng(hash('dig:' + s.day + s.seed)), pool = MODELS.filter(m => m.kind === 'flat' && m.lvl <= Math.max(3, A.lvl()));
  const pieces = Array.from({ length: 3 + Math.floor(r() * 3) }, () => { const m = pick(r, pool); return { modelId: m.id, genuine: true, spec: { ...m.spec, crust: true }, cond: Math.round(72 + r() * 22), seed: Math.floor(r() * 1e9) }; });
  DG = { pieces, cond: pieces[0].cond, chips: 0, done: false };
  const p = pieces[0], m = A.modelById(p.modelId);
  A.openModal(`<h2>ขูดดินออกจากองค์พระ</h2><p class="note">ขูดให้หมด 85% • ขูดช้า ๆ ปลอดภัยกว่า</p><div class="dig"><canvas id="digBase" width="260" height="325"></canvas><canvas id="digDirt" width="260" height="325"></canvas></div>
    <div class="bars"><div class="bar"><span>ขุดแล้ว</span><i><em id="digPct" style="width:0%"></em></i><b id="digPctT">0%</b></div><div class="bar heat"><span>สภาพ</span><i><em id="digCond" style="width:${DG.cond}%"></em></i><b id="digCondT">${DG.cond}</b></div></div><p class="err" id="digMsg"></p>`);
  const base = document.getElementById('digBase'), dirt = document.getElementById('digDirt'), bx = base.getContext('2d'), dx = dirt.getContext('2d'), rr = rng(hash('dirt' + p.seed));
  bx.fillStyle = '#2a1a10'; bx.fillRect(0, 0, 260, 325); bx.fillStyle = '#ffe9c2'; bx.font = '16px Kanit'; bx.textAlign = 'center'; bx.fillText('กำลังเตรียมกรุ…', 130, 160);
  A.thumbImg(m, p.spec, p.cond, p.seed, url => { const im = new Image(); im.onload = () => bx.drawImage(im, 0, 0, 260, 325); im.src = url; });
  for (let i = 0; i < 2600; i++) { const v = 70 + rr() * 60; dx.fillStyle = `rgb(${v + 30},${v},${v * .6})`; dx.fillRect(rr() * 260, rr() * 325, 6 + rr() * 10, 6 + rr() * 10); }
  dx.globalCompositeOperation = 'destination-out';
  let last = null, moves = 0;
  const pt = e => { const b = dirt.getBoundingClientRect(); return [(e.clientX - b.left) * 260 / b.width, (e.clientY - b.top) * 325 / b.height, performance.now()]; };
  dirt.addEventListener('pointerdown', e => { dirt.setPointerCapture(e.pointerId); last = pt(e); });
  dirt.addEventListener('pointerup', () => { last = null; });
  dirt.addEventListener('pointermove', e => {
    if (!last || DG.done) return; const [x, y, t] = pt(e), sp = Math.hypot(x - last[0], y - last[1]) / Math.max(1, t - last[2]);
    dx.beginPath(); dx.arc(x, y, 13, 0, 7); dx.fill(); dx.lineWidth = 26; dx.lineCap = 'round'; dx.beginPath(); dx.moveTo(last[0], last[1]); dx.lineTo(x, y); dx.stroke();
    if ((sp > 1.6 || (e.pressure > .85 && e.pointerType === 'pen')) && DG.chips < 8) { DG.chips++; DG.cond = Math.max(40, DG.cond - 4); bx.strokeStyle = '#1a0d08'; bx.lineWidth = 2; bx.beginPath(); bx.moveTo(x, y); bx.lineTo(x + 8, y + 5); bx.lineTo(x + 3, y + 12); bx.stroke(); document.getElementById('digMsg').textContent = 'ระวัง! ขูดแรงไปจนองค์บิ่น สภาพ −4'; }
    last = [x, y, t];
    if (++moves % 8 === 0) { const d = dx.getImageData(0, 0, 260, 325).data; let clear = 0, n = 0; for (let i = 3; i < d.length; i += 64) { n++; if (d[i] < 40) clear++; } const pc = Math.round(clear / n * 100);
      document.getElementById('digPct').style.width = pc + '%'; document.getElementById('digPctT').textContent = pc + '%'; document.getElementById('digCond').style.width = DG.cond + '%'; document.getElementById('digCondT').textContent = DG.cond;
      if (pc >= 85 && !DG.done) { DG.done = true; setTimeout(() => A.openModal(digShareHTML()), 400); } }
  });
}
function digShareHTML() {
  const n = DG.pieces.length; DG.pieces[0].cond = DG.cond;
  return `<h2>ได้พระกรุ ${n} องค์!</h2><p>องค์เด่นสภาพ ${DG.cond}${DG.chips ? ` (บิ่น ${DG.chips} จุด)` : ''} ทุกองค์มีคราบกรุตามร่อง ตามธรรมเนียมต้องแบ่งให้วัด</p><div class="opts">
    <button class="btn opt" data-o="share:pious"><b>ถวายวัดเกือบทั้งหมด เก็บไว้ 1 องค์</b><small>ความไว้ใจวัด +8 • บุญ +5</small></button>
    <button class="btn opt" data-o="share:half"><b>แบ่งครึ่ง เก็บไว้ ${Math.ceil(n / 2)} องค์</b><small>ความไว้ใจวัด +2</small></button>
    <button class="btn opt grey" data-o="share:greedy"><b>เก็บไว้ ${n - 1} องค์ ให้วัดแค่ 1</b><small>ความไว้ใจวัด −15 • กรรม +5</small></button></div>`;
}
function digShare(k) {
  if (!DG) return; const s = S(), tid = s.dig.invite, n = DG.pieces.length, opt = k;
  k = opt === 'pious' ? 1 : opt === 'greedy' ? n - 1 : Math.ceil(n / 2);
  const dt = opt === 'pious' ? 8 : opt === 'greedy' ? -15 : 2; s.trust[tid] = clamp((s.trust[tid] ?? 50) + dt, 0, 100);
  if (opt === 'pious') A.addMerit(5); if (opt === 'greedy') A.addKarma(5);
  for (const p of DG.pieces.slice(0, k)) A.addItem(p, 0);
  A.gainXP(40); A.tlog(`ขุดกรุ${A.templeName(tid)}: ได้พระกรุ ${n} องค์ เก็บไว้ ${k} องค์ ความไว้ใจวัด ${dt > 0 ? '+' : ''}${dt}`, dt >= 0 ? 'good' : 'bad');
  s.dig = { invite: null, until: 0 }; DG = null; A.closeModal(); A.render();
}

/* ===== หน้ารวมกิจกรรมนอกร้าน ===== */
const hubBack = () => `<div class="row"><button class="btn dim" data-o="hub">← นอกร้าน</button></div>`;
function hubHTML() {
  const s = S();
  return `<h2>กิจกรรมนอกร้าน</h2><div class="opts">
    <button class="btn opt" data-o="market" ${weekend() ? '' : 'disabled'}><b>เดินสนามพระ</b><small>${weekend() ? `เปิดวันนี้! พลังเดินเหลือ ${s.market.day === s.day ? s.market.pts : 10}/10` : `เปิดวันหยุด ครั้งถัดไปวันที่ ${nextWeekend()}`}</small></button>
    <button class="btn opt" data-o="trippage"><b>ทริปต่างจังหวัด</b><small>${A.lvl() >= 2 ? 'เลือกภาค ใช้เวลา 2 วัน' : 'ปลดล็อกที่ Lv.2'}</small></button>
    <button class="btn opt" data-o="digpage"><b>ขุดกรุ</b><small>${s.dig.invite ? `${A.templeName(s.dig.invite)}เชิญไปช่วย! (ถึงวันที่ ${s.dig.until - 1})` : 'ต้องมีวัดที่ไว้ใจ 60 ขึ้นไป รอคำเชิญ'}</small></button></div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}

/* ===== โหมด stage 'outing' (ส่ององค์ในถาด) ===== */
const oPiece = mode => mode === 'outing' && OC ? OC.p : null;
const oKey = mode => mode === 'outing' && OC ? `out:${VEN && VEN.kind}:${OC.s}:${OC.j}` : null;
function oCard(mode) {
  if (mode !== 'outing' || !OC) return ''; const p = OC.p, m = A.modelById(p.modelId), st = VEN.stalls[OC.s];
  return `<div class="ava">แผง</div><div><div class="who">${esc(st.name)} <span class="badge">พลังเดิน ${VEN.pts}</span></div><div class="line">${esc(st.note)}</div></div>
    <div class="pname">${esc(m.name)} ${A.rarBadge(m)}</div><div class="facts"><span>สภาพ <b>${p.cond}/100</b></span><span>ราคาตลาดถ้าแท้ (พิมพ์มาตรฐาน) <b>${fmt(m.price * A.cf(p.cond))}</b></span><span>แม่ค้าตั้งราคา <b>${fmt(p.price)}</b></span></div>`;
}
const oActs = mode => mode === 'outing' && OC ? `<button class="btn dim" data-a="o:back">กลับแผง</button><button class="btn" data-a="o:nego">ต่อราคา</button><button class="btn ok" data-a="o:buy">ซื้อ<small>${fmt(OC.p.price)}</small></button>` : '';
function oAct(a) { if (a === 'back') backToStall(); else if (a === 'buy') oBuy(); else if (a === 'nego') oNego(); }
function oLeave(mode) { if (mode === 'outing') OC = null; }
function oClick(el) {
  const [a, b, c] = el.dataset.o.split(':');
  if (a === 'hub') A.openModal(hubHTML()); else if (a === 'market') openMarket(); else if (a === 'venue') A.openModal(venueHTML());
  else if (a === 'stall') A.openModal(stallHTML(+b)); else if (a === 'look') look(+b, +c);
  else if (a === 'trippage') A.openModal(tripHTML()); else if (a === 'trip') startTrip(b); else if (a === 'tev') tripEvent(b); else if (a === 'tripback') tripBack();
  else if (a === 'digpage') A.openModal(digHTML()); else if (a === 'digstart') digStart(); else if (a === 'share') digShare(b);
}
const outingBadge = () => weekend() ? 'วันนี้สนามพระเปิด' : S().dig.invite ? 'มีวัดเชิญไปขุดกรุ' : '';

export { initOuting, normOuting, weekend, worth, hubHTML, oPiece, oKey, oCard, oActs, oAct, oLeave, oClick, awayLine, digDay, outingBadge, openMarket };
