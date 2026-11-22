// เฟส 6: ภารกิจและเรื่องราว — กระดานออเดอร์, เนื้อเรื่องลูกค้าประจำ 5 คน, ความสำเร็จ 40 รายการ
// ไม่ import จาก game.js: game.js เรียก initStory(api) — ตัวละครและเรื่องราวทั้งหมดเป็นเรื่องสมมติ
import { clamp, rng, hash, fmt, pick, esc, round100 } from './util.js';
import { MODELS, MATS, REGIONS, CATS, RAR, catOf } from './data.js';

let A = null;
const S = () => A.S();
function initStory(api) { A = api; }
function normStory(s) {
  s.orders = s.orders || []; s.orderDay = s.orderDay || 0; s.story = s.story || {}; s.storyQ = s.storyQ || [];
  s.ach = s.ach || {}; s.cnt = s.cnt || {}; for (const k of ['gems', 'trips', 'digs', 'orders', 'contestWins']) s.cnt[k] = s.cnt[k] || 0;
  for (const c of CAST) s.story[c.id] = s.story[c.id] || { ep: 0, wait: 0, done: false };
}
const bump = k => { S().cnt[k] = (S().cnt[k] || 0) + 1; };

/* ===== กระดานออเดอร์: วันละ 3 งาน ส่งจากตู้ได้ค่าตอบแทนสูงกว่าตลาด ===== */
const WHO = ['คุณแม่ลูกสอง', 'หนุ่มออฟฟิศ', 'เถ้าแก่ร้านทอง', 'ครูโรงเรียนวัด', 'นักศึกษาปีหนึ่ง', 'ไรเดอร์ส่งของ', 'คุณยายใจดี', 'นักมวยรุ่นเล็ก'];
const WHY = ['ให้ลูกสาวพกไปสอบ', 'ห้อยไปสัมภาษณ์งานใหม่', 'เป็นของขวัญวันเกิดคุณพ่อ', 'พกขับรถทางไกล', 'ให้หลานบวชเรียน', 'ไว้ขึ้นชกรอบชิงแชมป์', 'บูชาเปิดร้านใหม่', 'ให้แฟนพกไปทำงานต่างประเทศ'];
function newOrder(r) {
  const L = A.lvl(), pool = MODELS.filter(m => m.lvl <= Math.max(2, L)), m = pick(r, pool), kind = pick(r, ['mat', 'region', 'cat', 'rar']);
  const need = { cond: 70 + Math.floor(r() * 4) * 5 };
  if (kind === 'mat') need.mat = m.mat; else if (kind === 'region') need.region = m.region; else if (kind === 'cat') need.cat = catOf(m); else need.rar = m.rar;
  const budget = round100(m.price * A.cf(need.cond + 10) * (1.25 + r() * .25));
  return { id: S().nextId++, who: pick(r, WHO), why: pick(r, WHY), need, budget, until: S().day + 3 };
}
const needTxt = n => [n.mat ? MATS[n.mat].name : '', n.region ? `พระ${REGIONS[n.region]}` : '', n.cat ? `หมวด${CATS[n.cat]}` : '', n.rar ? `ความหายาก "${RAR[n.rar][0]}"` : '', `สภาพ ≥ ${n.cond}`].filter(Boolean).join(' • ');
const fits = (it, n) => { const m = A.modelById(it.modelId); return m && !it.consign && !it.pend && it.cert !== false && it.cond >= n.cond && (!n.mat || m.mat === n.mat) && (!n.region || m.region === n.region) && (!n.cat || catOf(m) === n.cat) && (!n.rar || (m.rar || 'common') === n.rar); };
function ordersDay(lines) {
  const s = S(); const exp = s.orders.filter(o => o.until <= s.day + 1); if (exp.length) lines.push(['', `ออเดอร์หมดเวลา ${exp.length} งาน`]);
  s.orders = s.orders.filter(o => o.until > s.day + 1);
}
function refillOrders() { const s = S(); if (s.orderDay === s.day) return; s.orderDay = s.day; const r = rng(hash('ord:' + s.day + s.seed)); while (s.orders.length < 3) s.orders.push(newOrder(r)); }
function ordersHTML() {
  refillOrders(); const s = S();
  return `<h2>กระดานออเดอร์</h2><p class="note">ส่งพระจากตู้ให้ตรงเงื่อนไข ได้เงินตามงบและชื่อเสียง • ส่งของเก๊ระวังโดนจับได้ ชื่อเสียงลดหนัก</p>` +
    (s.orders.length ? s.orders.map(o => { const ok = s.inv.filter(it => fits(it, o.need)); return `<div class="mdl order"><b>${esc(o.who)}: "${esc(o.why)}"</b><p>${esc(needTxt(o.need))}</p><p class="note">งบ <b>${fmt(o.budget)}</b> • ส่งภายในวันที่ ${o.until - 1}</p>
      ${ok.length ? `<div class="opts">${ok.map(it => `<button class="btn opt" data-s="give:${o.id}:${it.id}"><b>ส่ง ${esc(A.modelById(it.modelId).name)}</b><small>สภาพ ${it.cond}${it.cert ? ' • มีใบรับรอง' : ''}</small></button>`).join('')}</div>` : '<p class="note">ยังไม่มีพระในตู้ที่ตรงเงื่อนไข</p>'}</div>`; }).join('') : '<p>วันนี้ยังไม่มีออเดอร์</p>') +
    `<div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
function giveOrder(oid, iid) {
  const s = S(), o = s.orders.find(x => String(x.id) === oid), it = s.inv.find(x => String(x.id) === iid); if (!o || !it || !fits(it, o.need)) return;
  s.orders = s.orders.filter(x => x !== o);
  if (!it.genuine && Math.random() < .85) { it.cert = false; it.xp = true; s.rep = Math.max(0, s.rep - 12); A.toast(`${o.who}เอาไปให้เซียนส่องแล้วรู้ว่าเป็นของเก๊! ชื่อเสียง −12 และไม่ได้เงิน`, 'bad'); A.addKarma(5); }
  else { s.inv = s.inv.filter(x => x !== it); s.money += o.budget; s.rep = Math.min(100, s.rep + 2); A.gainXP(25); bump('orders'); if (!it.genuine) A.addKarma(10); A.tlog(`ส่งออเดอร์ให้${o.who} ได้ ${fmt(o.budget)} ชื่อเสียง +2`, 'good'); }
  A.reModal(ordersHTML()); A.render();
}

/* ===== เนื้อเรื่องลูกค้าประจำ 5 คน (ตอนละบทสนทนาสั้น ๆ + ตัวเลือก) ===== */
const lost = () => ({ modelId: 'nangpaya', seed: (S().seed % 100000) + 4321, cond: 82 }); // พระของสามีป้าบุญมี (เอกลักษณ์จาก seed)
const CAST = [
  { id: 'boonmee', name: 'ป้าบุญมี', eps: [
    { when: s => s.day >= 3, text: 'ป้าบุญมีถือรูปถ่ายเก่ามา "พระนางพญาของสามีป้าโดนขโมยไปตั้งแต่ปีที่แล้ว ข้างหลังมีรอยนิ้วมือ ขอบบิ่นนิดหน่อย ถ้าเจอช่วยบอกป้าด้วยนะ"', photo: true,
      ch: [['รับปากว่าจะช่วยตามหา', s => { A.addMerit(2); }], ['บอกว่าคงหายากมาก', () => {}]] },
    { when: s => s.story.boonmee.found, text: 'คุณเจอพระที่ตรงกับรูปถ่ายของป้าบุญมีแล้ว! รอยนิ้วมือด้านหลังและรอยบิ่นตรงกันทุกจุด',
      ch: [['คืนให้ป้าฟรี ๆ', s => { takeLost(); A.addMerit(12); s.rep = Math.min(100, s.rep + 5); A.toast('ป้าบุญมีร้องไห้ด้วยความดีใจ บุญ +12 ชื่อเสียง +5', 'good'); }],
        ['ขอค่าตามหาเท่าที่จ่ายไป', s => { const it = takeLost(); if (it) s.money += it.paid; A.addMerit(4); A.toast(`ป้าจ่ายคืนให้ ${fmt(it ? it.paid : 0)} บุญ +4`); }],
        ['บอกว่าองค์นี้ขายไปแล้ว (เก็บไว้เอง)', () => { A.addKarma(15); A.toast('คุณเก็บพระไว้เอง กรรม +15', 'bad'); }]] },
    { when: s => s.day >= (s.story.boonmee.wait || 0), text: 'ป้าบุญมีแวะมาเยี่ยม เอาขนมหม้อแกงมาฝากทั้งถาด แล้วบอกต่อให้คนในซอยมาอุดหนุนร้านคุณ', ch: [['ขอบคุณป้า', s => { s.rep = Math.min(100, s.rep + 3); A.toast('ลูกค้าในซอยแวะมามากขึ้น ชื่อเสียง +3', 'good'); }]] },
  ] },
  { id: 'phum', name: 'น้องภูมิ', eps: [
    { when: s => s.day >= 6 && A.lvl() >= 3, text: 'เด็กหนุ่มชื่อภูมิยืนเกาะแผงมาหลายวัน "ผมอยากเป็นเซียนเหมือนพี่ ขอเป็นลูกศิษย์ได้ไหมครับ"',
      ch: [['รับเป็นลูกศิษย์', s => { s.story.phum.accepted = true; A.toast('น้องภูมิจะมาช่วยเป็นลูกศิษย์ (ถ้ามีสาขาจะไปประจำสาขาด้วยฝีมือดีกว่าเด็กทั่วไป)', 'good'); }], ['บอกให้ไปเรียนหนังสือก่อน', () => {}]] },
    { when: s => s.story.phum.accepted && s.day >= (s.story.phum.wait || 0), text: 'น้องภูมิหน้าเศร้า "ผมแอบไปเช่าพระมาองค์หนึ่ง ปรากฏว่าเก๊ เสียเงินเก็บไปหมดเลยครับ"',
      ch: [['สอนวิธีส่องทีละจุดอย่างใจเย็น', s => { A.addMerit(4); s.story.phum.bonus = 15; A.toast('น้องภูมิตั้งใจฟังมาก (ฝีมือลูกศิษย์ +15) บุญ +4', 'good'); }], ['ดุให้เข็ด', s => { s.story.phum.bonus = 5; A.toast('น้องภูมิเงียบไปทั้งวัน'); }]] },
    { when: s => s.story.phum.accepted && s.day >= (s.story.phum.wait || 0), text: 'น้องภูมิส่องเจอของหลุดในสนามพระเองเป็นครั้งแรก วิ่งมาโชว์ด้วยความภูมิใจ "ทั้งหมดเพราะพี่สอนครับ"',
      ch: [['ให้รางวัลเป็นกำลังใจ ฿5,000', s => { s.money -= 5000; A.addMerit(3); }], ['ชมว่าเก่งมาก', () => {}]] },
  ] },
  { id: 'lung', name: 'ลุงเซียนเกษียณ', eps: [
    { when: s => A.lvl() >= 5, text: 'ชายชราแว่นหนาเดินมาที่แผง "สมัยลุงยังเปิดแผง เคยเห็นพระในตำนานกับตาตัวเอง อยากฟังไหมล่ะ"', ch: [['นั่งฟังลุงเล่า', s => { clueFrom(); }], ['ขอตัวไปทำงานก่อน', () => {}]] },
    { when: s => A.lvl() >= 6 && s.day >= (s.story.lung.wait || 0), text: 'ลุงเซียนเกษียณกลับมาอีก "วันก่อนลุงนึกขึ้นได้อีกเรื่อง จดไว้ด้วยนะ"', ch: [['จดทุกคำ', () => { clueFrom(); }]] },
    { when: s => A.lvl() >= 6 && s.day >= (s.story.lung.wait || 0), text: 'ลุงยื่นสมุดจดเก่า ๆ ให้ "ลุงไม่มีลูกหลานในวงการ เก็บไว้ใช้เถอะ"', ch: [['รับไว้ด้วยความเคารพ', s => { clueFrom(); A.addMerit(3); }]] },
  ] },
  { id: 'jae', name: 'เจ๊ค้าทอง', eps: [
    { when: s => s.day >= 12 && A.lvl() >= 3, text: 'เจ๊ค้าทองกระซิบ "เจ๊มีพระเรซิ่นงานดีเป็นร้อยองค์ เอาไปขายเป็นของแท้ แบ่งกำไรกันคนละครึ่ง สนใจไหม"',
      ch: [['ปฏิเสธทันที', s => { A.addMerit(5); A.toast('คุณปฏิเสธเจ๊ บุญ +5', 'good'); }], ['รับข้อเสนอ (สายเทา)', s => { s.money += 150000 * A.lvl(); A.addKarma(25); s.story.jae.deal = true; A.toast(`ได้ส่วนแบ่ง ${fmt(150000 * A.lvl())} กรรม +25`, 'bad'); }]] },
    { when: s => s.day >= (s.story.jae.wait || 0), text: s => s.story.jae.deal ? 'ข่าวออกว่าร้านทองของเจ๊โดนบุกค้น! เจ๊โทรมาขอให้ช่วยเป็นพยานว่าไม่รู้เรื่อง' : 'เจ๊ค้าทองโดนตำรวจสมมติบุกค้นร้าน ดีนะที่คุณไม่ได้ไปยุ่งด้วย',
      ch: [['บอกความจริงทั้งหมด', s => { A.addMerit(5); if (s.story.jae.deal) { s.money -= 100000 * A.lvl(); A.toast('คืนเงินส่วนแบ่งเป็นค่าปรับ แต่ใจสบาย บุญ +5'); } }], ['เงียบไว้', s => { if (s.story.jae.deal) A.addKarma(10); }]] },
    { when: s => s.day >= (s.story.jae.wait || 0), text: 'เจ๊ค้าทองเปิดร้านใหม่ ขายแต่ทองแท้มีใบรับรอง "ครั้งนี้เจ๊ทำตามกฎแล้วจ้า"', ch: [['ยินดีด้วย', s => { s.rep = Math.min(100, s.rep + 2); }]] },
  ] },
  { id: 'luangta', name: 'หลวงตาวัดป่า', eps: [
    { when: s => s.day >= 9, text: 'หลวงตาจากวัดป่าเล็ก ๆ (สมมติ) เดินบิณฑบาตผ่านหน้าร้าน "ศาลาวัดหลังคารั่ว โยมพอจะช่วยบอกบุญได้ไหม"',
      ch: [['ถวายปัจจัยซ่อมหลังคา ฿30,000', s => { s.money -= 30000; A.addMerit(8); A.addKarma(-4); }], ['ช่วยบอกบุญให้ลูกค้า', s => { A.addMerit(3); }], ['เงียบ', () => {}]] },
    { when: s => s.day >= (s.story.luangta.wait || 0), text: 'หลวงตามาบอกว่าศาลาซ่อมเสร็จแล้ว ชวนไปร่วมงานทำบุญฉลองศาลา', ch: [['ไปร่วมงาน', s => { A.addMerit(4); for (const k of Object.keys(s.trust || {})) s.trust[k] = Math.min(100, s.trust[k] + 3); A.toast('วัดต่าง ๆ ได้ยินกิตติศัพท์ ความไว้ใจวัด +3 ทุกวัด', 'good'); }], ['ฝากซองไปแทน ฿5,000', s => { s.money -= 5000; A.addMerit(2); }]] },
    { when: s => s.day >= (s.story.luangta.wait || 0), text: 'หลวงตาฝากพระผงที่ชาวบ้านทำถวายวัดมาให้ 1 องค์ "เก็บไว้เป็นที่ระลึก"', ch: [['รับไว้ด้วยความเคารพ', s => { const m = MODELS.find(x => x.id === 'phongwan'); A.addItem({ modelId: m.id, genuine: true, spec: { ...m.spec }, cond: 95, seed: s.seed + 77 }, 0); A.toast('ได้พระผงว่านจากหลวงตา เก็บเข้าตู้แล้ว', 'good'); }]] },
  ] },
];
function clueFrom() { const t = A.addClue('ลุงเซียนเกษียณ'); A.toast(t || 'ลุงเล่าเรื่องเก่า ๆ ให้ฟัง (ได้เบาะแสครบแล้วหรือยังไม่ถึง Lv.6)', t ? 'good' : ''); }
function takeLost() { const s = S(), L0 = lost(), it = s.inv.find(i => i.modelId === L0.modelId && i.seed === L0.seed); if (it) s.inv = s.inv.filter(i => i !== it); return it; }
// ทุกวัน: ตอนไหนพร้อมก็เข้าคิว (ทีละคน)
function storyDay() {
  const s = S();
  for (const c of CAST) { const st = s.story[c.id]; if (st.done || s.storyQ.includes(c.id)) continue; const ep = c.eps[st.ep]; if (ep && ep.when(s)) s.storyQ.push(c.id); }
}
// ลูกค้าที่ถือพระของสามีป้าบุญมี (ปนกับองค์หน้าตาคล้ายกัน)
function lostCustomers(r) {
  const s = S(), st = s.story.boonmee; if (st.ep !== 1 || st.found || r() > .25) return [];
  const L0 = lost(), m = MODELS.find(x => x.id === L0.modelId), mk = (seed, gen) => ({ id: s.nextId++, name: pick(r, ['ชายท่าทางลุกลี้ลุกลน', 'วัยรุ่นใส่หมวกแก๊ป', 'ลุงขายของเก่า']), line: 'ได้มาจากเพื่อน รีบใช้เงิน ราคาคุยกันได้', modelId: m.id, genuine: gen, spec: { ...m.spec }, cond: L0.cond, ask: round100(m.price * .6), patience: 2, seed });
  return [mk(L0.seed, true), mk(L0.seed + 1 + Math.floor(r() * 900), true)];
}
function onAcquire(it) { const s = S(), L0 = lost(); if (s.story.boonmee.ep === 1 && it.modelId === L0.modelId && it.seed === L0.seed && !s.story.boonmee.found) { s.story.boonmee.found = true; A.toast('องค์นี้หน้าตาเหมือนในรูปถ่ายของป้าบุญมีเลย!', 'good'); storyDay(); } }
function storyHTML(id) {
  const c = CAST.find(x => x.id === id), st = S().story[id], ep = c.eps[st.ep]; if (!ep) return '';
  const t = typeof ep.text === 'function' ? ep.text(S()) : ep.text, L0 = lost(), m = MODELS.find(x => x.id === L0.modelId);
  const photo = ep.photo ? `<div class="views photo"><figure><img data-thumb="xb:${A.thumbKey(m, { ...m.spec }, L0.cond, L0.seed)}" alt="รูปถ่ายด้านหลัง"><figcaption>รูปถ่ายเก่า: ด้านหลัง</figcaption></figure><figure><img data-thumb="x:${A.thumbKey(m, { ...m.spec }, L0.cond, L0.seed)}" alt="รูปถ่ายด้านหน้า"><figcaption>ด้านหน้า (ดูรอยบิ่นที่ขอบ)</figcaption></figure></div><p class="note">จำรอยนิ้วมือและรอยบิ่นไว้ให้ดี ถ้าเจอที่หน้าร้านจะได้รู้</p>` : '';
  return `<div class="story"><p class="sk">${esc(c.name)} • ตอนที่ ${st.ep + 1}/${c.eps.length}</p><p class="st">${esc(t)}</p>${photo}<div class="opts">${ep.ch.map(([n], i) => `<button class="btn opt" data-s="ch:${id}:${i}"><b>${esc(n)}</b></button>`).join('')}</div></div>`;
}
function choose(id, i) {
  const s = S(), c = CAST.find(x => x.id === id), st = s.story[id], ep = c.eps[st.ep]; if (!ep || !ep.ch[+i]) return;
  ep.ch[+i][1](s); st.ep++; st.wait = s.day + 4; if (st.ep >= c.eps.length) { st.done = true; A.toast(`จบเรื่องราวของ${c.name}แล้ว`, 'good'); }
  s.storyQ = s.storyQ.filter(x => x !== id); A.save(); A.closeModal(); A.render();
}
const storyBadge = () => S().storyQ.length ? `${CAST.find(c => c.id === S().storyQ[0]).name}มาหาคุณ` : '';
function openStory() { const id = S().storyQ[0]; if (id) A.openModal(storyHTML(id)); }
const phumBonus = () => S().story.phum.accepted ? 10 + (S().story.phum.bonus || 0) : 0;

/* ===== ความสำเร็จ 40 รายการ ===== */
const ACH = [
  ['buy1', 'เปิดแผงวันแรก', 'รับเช่าพระองค์แรก', s => s.stats.bought >= 1], ['buy10', 'นักสะสมมือใหม่', 'รับเช่าพระ 10 องค์', s => s.stats.bought >= 10], ['buy50', 'ตู้แน่นเอี้ยด', 'รับเช่าพระ 50 องค์', s => s.stats.bought >= 50],
  ['sell1', 'ขายได้แล้ว', 'ปล่อยเช่าองค์แรก', s => s.stats.sold >= 1], ['sell25', 'พ่อค้าตัวจริง', 'ปล่อยเช่า 25 องค์', s => s.stats.sold >= 25],
  ['spot1', 'ตาเริ่มถึง', 'ชี้จุดเก๊ถูกครั้งแรก', s => s.stats.spotted >= 1], ['spot10', 'ตาเหยี่ยว', 'ชี้จุดเก๊ถูก 10 ครั้ง', s => s.stats.spotted >= 10], ['spot50', 'ตาทิพย์', 'ชี้จุดเก๊ถูก 50 ครั้ง', s => s.stats.spotted >= 50],
  ['lv3', 'เซียนเปิดแผง', 'ถึง Lv.3', () => A.lvl() >= 3], ['lv5', 'เซียนใหญ่', 'ถึง Lv.5', () => A.lvl() >= 5], ['lv6', 'ปรมาจารย์', 'ถึง Lv.6', () => A.lvl() >= 6],
  ['star1', 'ดาวดวงแรก', 'ได้บารมี ★1', () => A.stars() >= 1], ['star5', 'ห้าดาว', 'ได้บารมี ★5', () => A.stars() >= 5], ['star10', 'เต็มฟ้า', 'ได้บารมี ★10', () => A.stars() >= 10],
  ['m1', 'เศรษฐีย่อม ๆ', 'มีเงิน ฿1,000,000', s => s.money >= 1e6], ['m10', 'เศรษฐีแผงพระ', 'มีเงิน ฿10,000,000', s => s.money >= 1e7],
  ['rep50', 'คนรู้จักทั้งซอย', 'ชื่อเสียง 50', s => s.rep >= 50], ['rep100', 'ชื่อเสียงขจรไกล', 'ชื่อเสียง 100', s => s.rep >= 100],
  ['cert5', 'ตู้มีใบรับรอง', 'มีพระที่มีใบรับรองในตู้ 5 องค์', s => s.inv.filter(i => i.cert === true).length >= 5], ['contest', 'แชมป์งานประกวด', 'ชนะเลิศงานประกวด', s => s.cnt.contestWins >= 1],
  ['batch', 'ผู้จัดสร้าง', 'จัดสร้างพระรุ่นแรก', s => s.batches.length >= 1], ['recipe', 'นักปรุงมวลสาร', 'ค้นพบตำรับลับ', s => Object.keys(s.recipes || {}).length >= 1], ['soldout', 'หมดเกลี้ยง', 'พระที่จัดสร้างบูชาหมด', s => s.batches.some(b => b.done)],
  ['duel1', 'ชนะดวล', 'ชนะดวลส่องพระครั้งแรก', s => s.duel.total >= 1], ['duel10', 'ขาประจำสนามดวล', 'ชนะดวล 10 ครั้ง', s => s.duel.total >= 10], ['auc1', 'ค้อนเคาะชนะ', 'ชนะงานประมูล', s => s.auction.won >= 1],
  ['leg1', 'ผู้ตามล่า', 'ได้พระในตำนาน 1 องค์', () => A.legendsOwned() >= 1], ['leg5', 'ผู้พิทักษ์', 'ได้พระในตำนานครบ 5 องค์', () => A.legendsOwned() >= 5],
  ['museum', 'ภัณฑารักษ์', 'สร้างพิพิธภัณฑ์พระ', s => s.museum.open], ['branch3', 'เครือข่ายเซียน', 'เปิดสาขาครบ 3 แห่ง', s => s.branches.length >= 3],
  ['regions', 'สี่ภาคสี่ทิศ', 'เคยครอบครองของแท้ครบทุกภาค', s => new Set(MODELS.filter(m => s.owned[m.id]).map(m => m.region)).size >= 4], ['col12', 'สมุดครึ่งเล่ม', 'สมุดสะสมครบ 12 รุ่น', s => MODELS.filter(m => s.owned[m.id]).length >= 12], ['col24', 'สมุดครบเล่ม', 'สมุดสะสมครบทุกรุ่น', s => MODELS.every(m => s.owned[m.id])],
  ['gem', 'ตาไวเจอของหลุด', 'ซื้อของหลุดในสนามพระ', s => s.cnt.gems >= 1], ['trip', 'นักเดินทาง', 'ไปทริปต่างจังหวัด', s => s.cnt.trips >= 1], ['dig', 'นักโบราณคดีสมัครเล่น', 'ช่วยวัดขุดกรุ', s => s.cnt.digs >= 1],
  ['merit90', 'ใจบุญสุนทาน', 'บุญถึง 90', s => s.merit >= 90], ['clean', 'มือสะอาด', 'วันที่ 30 แล้วกรรมยังเป็น 0', s => s.day >= 30 && s.karma === 0],
  ['order5', 'รับงานไม่เคยพลาด', 'ส่งออเดอร์สำเร็จ 5 งาน', s => s.cnt.orders >= 5], ['stories', 'คนในซอยรักคุณ', 'จบเรื่องราวลูกค้าประจำครบ 5 คน', s => CAST.every(c => s.story[c.id].done)],
];
const ACH_POP = [];
function checkAch() {
  const s = S(); if (!s) return;
  for (const [id, t, , f] of ACH) { if (s.ach[id]) continue; let ok = false; try { ok = f(s); } catch (e) { ok = false; } if (ok) { s.ach[id] = s.day; ACH_POP.push(t); } }
  if (ACH_POP.length) { const t = ACH_POP.shift(); A.achPop(t); if (ACH_POP.length) setTimeout(() => { const n = ACH_POP.splice(0); n.forEach((x, i) => setTimeout(() => A.achPop(x), i * 900)); }, 900); }
}
function achHTML() {
  const s = S(), n = ACH.filter(a => s.ach[a[0]]).length;
  return `<h2>ความสำเร็จ ${n}/${ACH.length}</h2><div class="achg">${ACH.map(([id, t, d]) => `<div class="ach ${s.ach[id] ? 'on' : ''}"><b>${s.ach[id] ? '🏆 ' : ''}${esc(t)}</b><small>${esc(d)}${s.ach[id] ? ` • วันที่ ${s.ach[id]}` : ''}</small></div>`).join('')}</div><div class="row"><button class="btn dim" data-close>ปิด</button></div>`;
}
function sClick(el) {
  const [a, b, c] = el.dataset.s.split(':');
  if (a === 'give') giveOrder(b, c); else if (a === 'ch') choose(b, c); else if (a === 'orders') A.openModal(ordersHTML()); else if (a === 'ach') A.openModal(achHTML()); else if (a === 'story') openStory();
}
const ordersCount = () => { refillOrders(); return S().orders.length; };

export { initStory, normStory, bump, ordersDay, ordersHTML, ordersCount, storyDay, lostCustomers, onAcquire, storyBadge, openStory, phumBonus, checkAch, achHTML, sClick, ACH, CAST };
