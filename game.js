import * as THREE from './three.module.min.js';
import { $, clamp, lerp, rng, hash, fmt, pick, esc, round100, wpick, inPoly, mk } from './util.js';
import { SUBP, subsOf, subOf, RAR, REGIONS, CATS, isCoin, catOf, FRAMES, MATS, THW, TELLS, tellTxt, MODELS, LEVELS, UNLOCK, TEMPLES, PIMS, DW, mWeight, TOOLS, INGR, RECIPES, EVENTS, PAGES, LIVE_T, LIVE_Q, VIEWERS, LUCKY, NAME_A, NAME_B, ingrList, ingrKey, ingrTxt, mutIngr, UNIT, NAMES, HONEST, SLICK } from './data.js';
import { initKarma, normKarma, addMerit, addKarma, goodMult, mkHTML, attachCert, checkCert, victimCustomer, victimActs, startReceive, rumorHTML, donateHTML, dressPiece, sellChoice, sellHTML, confirmGrey, BRIBE_COST, bribeOutcome, attackRival, karmaDay, queueEnding, popEnding, endingBookHTML, titles, endingsLine, kPiece, kKey, kCard, kActs, kAct, kClick } from './karma.js';
import { initEndgame, normEndgame, stars, starTitle, starTxt, starMult, starPatience, starProgress, LEGENDS, legendById, legendsOpen, legendsOwned, addClue, onCustomerDone, markOwned, legendCustomer, RIVALS, duelOn, aucOn, aucToday, modePiece, modeKey, modeCard, modeActs, modeQinfo, modeAct, leaveMode, egTick, onSpotHit, endgameDay, goalsHTML, egClick, museumScore } from './endgame.js';
import { poseFig, TW, TH, g, qb, OUT, outlinePts, inset, pathPts, dome, limb, slab, glyph, unalom, FIG, drawPidta, drawFigure, drawFront, drawBack, drawCode, boxBlur, noise, chan, makeFace } from './amulet2d.js';
import { SIDE, sideTex, buildAmulet, disposeGroup, makeEnv, setupScene, makeRenderer } from './amulet3d.js';

/* ================= main view ================= */
const canvas = $('#c'), stage = $('#stage');
const R = makeRenderer({ canvas, antialias: true, alpha: true });
R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
const scene = setupScene(R), cam = new THREE.PerspectiveCamera(30, 1, .05, 50), holder = new THREE.Group(); scene.add(holder);
const V = { zoom: 1, zt: 1, px: 0, py: 0, vx: 0, vy: 0, drag: false, pan: false, spin: 0, reset: null };
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion();
const fitDist = () => { const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); return Math.max(.8 / t, .68 / (t * cam.aspect)); };
function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); if (typeof layoutCmp === 'function' && V.cmp) layoutCmp(); }
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
    if (!o.isMesh || !o.userData.part || o.userData.part === 'frame') return;
    const glow = on && cur.userData.resin, mt = o.material, em = glow ? mt.map : null;
    mt.emissive.set(glow ? 0x3dffd2 : 0x000000); mt.emissiveIntensity = glow ? 1.1 : 1;
    if (mt.emissiveMap !== em) { mt.emissiveMap = em; mt.needsUpdate = true; }
  });
}
function toggleUV() { V.uv = !V.uv; applyUV(); renderActs(); }
// โหมดเทียบองค์ครู: องค์ครู (ref) อยู่ใน holder เดียวกับองค์ที่ส่อง จึงหมุน/ซูม/พลิกพร้อมกัน วาด 2 viewport ด้วย scissor บน renderer เดียว
let ref = null, refKey = null, curArgs = null;
function buildRef() { if (!curArgs) return; const m = curArgs[0]; if (ref && refKey === m.id) return; clearRef(); ref = buildAmulet(m, m.spec, 100, 4242, 1); ref.visible = false; holder.add(ref); refKey = m.id; }
function clearRef() { if (ref) { holder.remove(ref); disposeGroup(ref); ref = null; refKey = null; } }
const cmpRects = () => { const w = stage.clientWidth, h = stage.clientHeight; return innerHeight > innerWidth ? [{ x: 0, y: 0, w, h: h / 2 }, { x: 0, y: h / 2, w, h: h / 2 }] : [{ x: 0, y: 0, w: w / 2, h }, { x: w / 2, y: 0, w: w / 2, h }]; };
function layoutCmp() {
  const on = !!(V.cmp && cur); stage.classList.toggle('cmp', on); if (!on) return;
  const [a, b] = cmpRects(), pos = (el, rc) => { el.style.left = rc.x + 8 + 'px'; el.style.top = rc.y + rc.h - 34 + 'px'; };
  pos($('#cmpA'), a); pos($('#cmpB'), b);
  const d = $('#cmpDiv'); Object.assign(d.style, b.x ? { left: b.x - 1 + 'px', top: '0', width: '2px', height: '100%' } : { left: '0', top: b.y - 1 + 'px', width: '100%', height: '2px' });
}
function toggleCmp() { if (!cur) return; V.cmp = !V.cmp; if (V.cmp) buildRef(); layoutCmp(); renderActs(); }
function setCam(aspect) { cam.aspect = aspect; cam.updateProjectionMatrix(); cam.position.set(V.px, V.py, fitDist() * V.zoom); }
function showAmulet(m, spec, cond, seed, opts = {}) {
  clearAmulet(); curArgs = [m, spec, cond, seed];
  cur = buildAmulet(m, spec, cond, seed, 1, opts); holder.add(cur); applyUV(); if (V.cmp) buildRef(); layoutCmp();
  holder.quaternion.identity(); rotBy(-.9, .12); V.vx = .03; V.vy = -.002; V.zt = 1; V.zoom = 1.25; V.px = V.py = 0; V.reset = null; V.spin = 0;
}
function clearAmulet() { if (cur) { holder.remove(cur); disposeGroup(cur); cur = null; } curArgs = null; clearRef(); layoutCmp(); }
const RC = new THREE.Raycaster(), NDC = new THREE.Vector2();
// ยิง ray จากจุดที่แตะไปที่องค์พระ คืนส่วนที่โดน (front/back พร้อมพิกัด canvas, body, loop)
function pickPart(cx, cy) {
  if (!cur) return null;
  const rc = canvas.getBoundingClientRect();
  if (V.cmp && ref) { // แตะได้เฉพาะฝั่งองค์ที่ส่อง
    const a = cmpRects()[0], lx = cx - rc.left - a.x, ly = cy - rc.top - a.y; if (lx < 0 || ly < 0 || lx > a.w || ly > a.h) return null;
    NDC.set(lx / a.w * 2 - 1, -ly / a.h * 2 + 1); setCam(a.w / a.h);
  } else NDC.set((cx - rc.left) / rc.width * 2 - 1, -(cy - rc.top) / rc.height * 2 + 1);
  holder.updateMatrixWorld(); RC.setFromCamera(NDC, cam);
  for (const h of RC.intersectObjects(cur.children, true)) {
    const ud = h.object.userData, part = ud.part; if (!part || ud.see) continue;
    if (part === 'front' || part === 'back') { if (!h.uv || !inPoly(h.uv.x, 1 - h.uv.y, outlinePts(cur.userData.shape))) continue; return { part, px: h.uv.x * TW, py: (1 - h.uv.y) * TH }; }
    if (part === 'body' && cur.userData.framed) return { part: 'frame' };
    return { part, tells: ud.tells };
  }
  return null;
}
// แปลงพิกัดบนหน้าพระ (canvas TW x TH) เป็นโซนของจุดสังเกต โดยเทียบกับ FIG ของพิมพ์
function frontZone(m, px, py) {
  const shape = m.shape, pose = m.pose || 'seated', { cx, by, s } = poseFig(shape, pose), dx = Math.abs(px - cx), dy = (py - by) / s;
  if (pose === 'monk') return dx < s * .5 && dy > -.45 && dy < .18 ? 'monkItem' : null;
  if (pose === 'naga') return dx < s * .06 && dy < -.74 && dy > -1.12 ? 'flame' : dx < s * .46 && dy < -.5 && dy > -1.15 ? 'nagaHeads' : dx < s * .5 && dy > -.05 && dy < .3 ? 'base' : null;
  if (pose === 'stand' || pose === 'walk') return dx < s * .08 && dy < -.88 && dy > -1.16 ? 'flame' : dx < s * .3 && dy > -.06 && dy < .12 ? 'base' : null;
  if (pose === 'pidta') return dx < s * .3 && py > by - s * 1.06 && py < by - s * .62 ? 'palm' : null;
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
  const u = cur.userData; if (u.kp) return u.kp[k] || [new THREE.Vector3(0, 0, .3), 0, 0];
  const pose = u.pose || 'seated', f = poseFig(u.shape, pose), z = u.thick / 2 + u.D + .006;
  const c2l = (px, py, sgn = 1) => [new THREE.Vector3(px / TW - .5, (.5 - py / TH) * 1.25, sgn * z), sgn < 0 ? Math.PI : 0];
  switch (k) {
    case 'flame': return c2l(f.cx, f.by - f.s * (pose === 'stand' || pose === 'walk' ? 1.02 : .9));
    case 'nagaHeads': return c2l(f.cx, f.by - f.s * .95);
    case 'monkItem': return c2l(f.cx - f.s * .15, f.by - f.s * .2);
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
  const [pos, ry, rx = 0] = keyPos(k), big = ['back', 'grain', 'resin', 'weight', 'finish', 'ingr'].includes(k), r0 = big ? .2 : .085;
  const mk2 = (geo, op) => { const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: op, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); o.renderOrder = 10; o.userData.op = op; return o; };
  const mesh = new THREE.Group(); mesh.add(mk2(new THREE.RingGeometry(r0, r0 + .03, 48), 1), mk2(new THREE.CircleGeometry(r0, 48), .22));
  mesh.position.copy(pos); mesh.rotation.set(rx, ry, 0); cur.add(mesh);
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
  $('#loupe').style.opacity = V.zoom < .5 && !V.cmp ? 1 : 0;
  const st = (performance.now() - (V.shake || 0)) / 600; holder.position.x = st < 1 && !reduce ? Math.sin(st * 60) * .025 * (1 - st) : 0;
  tickHL(); if (++tutTick % 8 === 0) checkTut();
  const W = stage.clientWidth, H = stage.clientHeight;
  if (V.cmp && ref && cur) {
    R.setScissorTest(true);
    for (const [g, rc] of [[cur, cmpRects()[0]], [ref, cmpRects()[1]]]) {
      cur.visible = g === cur; ref.visible = g === ref;
      R.setViewport(rc.x, H - rc.y - rc.h, rc.w, rc.h); R.setScissor(rc.x, H - rc.y - rc.h, rc.w, rc.h); setCam(rc.w / rc.h); R.render(scene, cam);
    }
    R.setScissorTest(false); R.setViewport(0, 0, W, H); cur.visible = true; ref.visible = false;
  } else { setCam(W / (H || 1)); R.render(scene, cam); }
}
let tutTick = 0;

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
    if (kind === 'x') { const a = XA.get(id); if (a) thumbLater('x:' + id, [...a, ['front']], urls => { el.src = urls[0]; }); return; }
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
  // เขย่าพระกริ่ง: แท้ = เม็ดกริ่งใสกังวาน, เก๊ = ทึบ; เบี้ยแก้: แท้ = ปรอทไหลซ่า, เก๊ = แห้ง
  ring: (a, t) => { for (let i = 0; i < 8; i++) bell(a, t + i * .075 + Math.random() * .03, 2400 + Math.random() * 1200, .35, .07); },
  dull: (a, t) => { for (let i = 0; i < 6; i++) tone(a, t + i * .08 + Math.random() * .02, 130 + Math.random() * 70, .07, { type: 'triangle', vol: .16 }); },
  merc: (a, t) => { whoosh(a, t, .9, 3200, 1400, .22); whoosh(a, t + .45, .8, 2600, 1100, .16); for (let i = 0; i < 5; i++) tone(a, t + .1 + i * .15, 5200 + Math.random() * 800, .05, { vol: .025 }); },
  dry: (a, t) => { for (let i = 0; i < 5; i++) tone(a, t + i * .09 + Math.random() * .03, 900 + Math.random() * 300, .03, { type: 'square', vol: .04 }); },
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
function newGame() { return { v: 1, seed: Math.floor(Math.random() * 1e9), money: 60000, xp: 0, rep: 10, day: 1, inv: [], queue: [], rejected: [], batches: [], custom: [], contestDay: 0, nextId: 1, seen: false, lvlSeen: 1, stats: { bought: 0, sold: 0, fooled: 0, spotted: 0 }, tools: {}, loan: { amt: 0, day: 0 }, shareBan: 0, trust: {}, templeBan: {}, recipes: {}, kaka: false, ask: { day: 0, used: 0 }, tut: { on: true, step: 0 }, owned: {} }; }
let S = null; try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
if (!S || S.v !== 1) { S = newGame(); }
S.stats.spotted = S.stats.spotted || 0; S.tools = S.tools || {};
S.loan = S.loan || { amt: 0, day: 0 }; S.shareBan = S.shareBan || 0;
S.ask = S.ask || { day: 0, used: 0 }; S.tut = S.tut || { on: false };
S.owned = S.owned || Object.fromEntries(S.inv.filter(i => i.genuine && !i.consign).map(i => [i.modelId, true]));
// จัดสร้าง: ความไว้ใจวัด, วัดที่แบน, ตำรับที่พบ, ดินกากยายักษ์ และค่าเริ่มต้นของ batch จากเซฟเก่า (hype 30 heat 0)
function normTemple() {
  S.trust = S.trust || {}; for (const t of TEMPLES) if (S.trust[t.id] == null) S.trust[t.id] = 50;
  S.templeBan = S.templeBan || {}; S.recipes = S.recipes || {}; S.kaka = !!S.kaka; S.tlog = S.tlog || [];
  for (const b of S.batches) {
    const cm = S.custom.find(c => c.id === b.modelId);
    b.hype ??= 30; b.heat ??= 0; b.keep ??= 0; b.stock ??= 0; b.preorder ??= 0;
    b.base ??= cm ? cm.price : b.unit * 12; b.mp ??= b.base; b.hist ??= b.open ? [Math.round(b.mp)] : [];
  }
}
normTemple(); normEndgame(S); normKarma(S);
// เชื่อมโมดูลเป้าหมายหลัง Lv.6 (endgame.js ไม่ import จาก game.js จึงส่งฟังก์ชันผ่าน api แบบเรียกทีหลัง)
initEndgame({
  S: () => S, save: () => save(), render: () => render(), toast: (m, k) => toast(m, k), openModal: h => openModal(h), closeModal: () => closeModal(), reModal: h => reModal(h),
  lvl: () => lvl(), gainXP: n => gainXP(n), mutate: (...a) => mutate(...a), cf: c => cf(c), modelById: id => modelById(id), levelHTML: () => levelHTML(), rarBadge: m => rarBadge(m),
  setMode: m => { pauseDaily(); mode = m; ownItem = null; spot = null; lastShown = null; closeModal(); render(); },
  addItem: (p, paid) => { takeItem({ ...p, id: S.nextId++, ask: paid }); },
  thumbKey: (m, spec, cond, seed) => { const k = String(hash(JSON.stringify([m.id, spec, cond, seed]))); XA.set(k, [m, spec, cond, seed]); return k; },
  queueEnding: id => queueEnding(id), endingsLine: () => endingsLine(), attackRival: (id, n) => attackRival(id, n),
});
// เชื่อมโมดูลบุญกรรม/สายเทา/ฉากจบ (karma.js)
initKarma({
  S: () => S, save: () => save(), render: () => render(), toast: (m, k) => toast(m, k), openModal: h => openModal(h), closeModal: () => closeModal(), reModal: h => reModal(h),
  lvl: () => lvl(), gainXP: n => gainXP(n), modelById: id => modelById(id), mutate: (...a) => mutate(...a), curPiece: () => curPiece(), ownItem: () => ownItem,
  setMode: m => { mode = m; ownItem = null; spot = null; lastShown = null; closeModal(); render(); }, nextCustomer: () => nextCustomer(), tlog: (m, k) => tlog(m, k),
  finishBuy: (c, p, sw) => finishBuy(c, p, sw), rejectCustomer: c => { S.rejected.push({ modelId: c.modelId, genuine: c.genuine, spec: c.spec, cond: c.cond, seed: c.seed }); nextCustomer(); },
  relook: () => { lastShown = null; }, offerFor: it => offerFor(it), sellAt: (it, p, msg) => sell(it, { price: p, msg }), aucToday: () => aucToday(),
  starTxt: () => starTxt(stars()) || '★0', legendsOwned: () => legendsOwned(), queueEnding: id => queueEnding(id), restartKeep: () => restartGame(),
});
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
const lvl = () => { let l = 1; LEVELS.forEach((L, i) => { if (S.xp >= L.xp) l = i + 1; }); return l; };
const modelById = id => MODELS.find(m => m.id === id) || LEGENDS.find(m => m.id === id) || S.custom.find(m => m.id === id);
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
// tier: 'easy' = ตัวเลขต่าง ≥ 2 (dots ≥ 4) ถ้าช่วงค่าเอื้อ, 'fine' = ต่างได้แค่ 1 (รวม dots), ไม่ระบุ = ปกติ
function mutate(spec, n, r, tier) {
  const s = { ...spec }, ks = Object.keys(s).map(k => [k, r()]).sort((a, b) => a[1] - b[1]).map(a => a[0]).slice(0, n);
  for (const k of ks) {
    const T = TELLS[k];
    if (T.mut) { s[k] = T.mut(r, s[k]); continue; }
    if (T.num) {
      const mag = tier === 'easy' ? (2 + Math.floor(r() * 2)) * (k === 'dots' ? 2 : 1) : tier === 'fine' ? 1 + Math.floor(r() * 2) : (1 + Math.floor(r() * 2)) * (k === 'dots' ? 2 : 1);
      const sg = r() < .5 ? -1 : 1, a1 = clamp(spec[k] + sg * mag, T.num[0], T.num[1]), a2 = clamp(spec[k] - sg * mag, T.num[0], T.num[1]);
      let v = Math.abs(a1 - spec[k]) >= Math.abs(a2 - spec[k]) ? a1 : a2; if (v === spec[k]) v = spec[k] + (spec[k] < T.num[1] ? 1 : -1); s[k] = v;
    }
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
// Lv.1–2: ของเก๊ผิดแบบเห็นชัด ต้องมีจุดผิดที่เห็นจากด้านหน้าอย่างน้อย 1 จุด (จึงไม่มีทางผิดแค่ผิวเนื้ออย่างเดียว)
const FRONT_KEYS = ['hand', 'flame', 'tiers', 'petals', 'dots', 'palm', 'nagaHeads', 'monkItem', 'finish', 'seam', 'turns', 'cord', 'braid', 'chan', 'wrap'];
function easyFake(spec, n, r) {
  let s = mutate(spec, n, r, 'easy');
  if (!Object.keys(spec).some(k => FRONT_KEYS.includes(k) && s[k] !== spec[k])) {
    const fk = Object.keys(spec).filter(k => FRONT_KEYS.includes(k));
    if (fk.length) { const k = pick(r, fk); s = { ...s, ...mutate({ [k]: spec[k] }, 1, r, 'easy') }; }
  }
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
  const nk = Math.min(n, Object.keys(m.spec).length);
  const spec = genuine ? { ...m.spec } : god ? { ...m.spec, ...(r() < .5 ? { resin: 'yes' } : { weight: r() < .5 ? 'light' : 'heavy' }) } : L <= 2 ? easyFake(m.spec, nk, r) : mutate(m.spec, nk, r, L >= 5 ? 'fine' : undefined);
  const cond = Math.round(genuine ? 62 + r() * 38 : 72 + r() * 28);
  // พิมพ์ย่อย: พิมพ์จริง (spec.sub) กับพิมพ์ที่ลูกค้าอ้าง (claim) บางคนอ้างพิมพ์นิยมเกินจริง — ไม่ใช่ของเก๊ แต่จ่ายแพงเกินถ้าเชื่อ
  const subs = subsOf(m); let claim = null;
  if (subs) { const act = wpick(r, subs.map(x => [x, x.w])), up = subs.filter(x => x.mult > act.mult); spec.sub = act.id; claim = (up.length && r() < .25 ? pick(r, up) : act).id; }
  const market = m.price * (claim ? subOf(m, claim).mult : 1) * cf(cond), ask = round100(market * (genuine ? .55 + r() * .6 : .45 + r() * .5));
  const honest = genuine ? r() < .65 : r() < .35;
  const frame = m.kind === 'flat' && r() < .2 ? wpick(r, Object.entries(FRAMES).map(([k, F]) => [k, 1 / F.w])) : null;
  return { id: S.nextId++, name: pick(r, NAMES), line: pick(r, honest ? HONEST : SLICK), modelId: m.id, genuine, spec, cond, ask, patience: 1 + Math.floor(r() * 3), seed: Math.floor(r() * 1e9), claim, frame };
}
function genQueue() {
  const r = rng(hash('d' + S.day + ':' + S.seed)), L = lvl(); S.queue = [];
  for (let i = 0, n = 4 + Math.floor(L / 2) + Object.keys(S.duel.regs).length; i < n; i++) S.queue.push(makeCustomer(r, L));
  const lc = legendCustomer(r); if (lc) S.queue.splice(Math.min(2, S.queue.length), 0, lc);
  for (const c of S.queue) attachCert(c, r);
  const vc = victimCustomer(r); if (vc) S.queue.splice(Math.min(3, S.queue.length), 0, vc);
  for (const c of S.queue) c.patience += starPatience();
}
if (!S.queue.length && S.day === 1 && !S.inv.length) { genQueue(); if (S.tut.on) S.queue.unshift(...tutCustomers()); }

/* ================= modes & rendering ================= */
let mode = 'shop', ownItem = null, lastShown = null;
const coarse = matchMedia('(pointer: coarse)').matches;
const HINT = coarse ? 'ลากนิ้วเพื่อหมุน • ถ่างสองนิ้วเพื่อซูม/เลื่อน' : 'ลากเพื่อหมุน • ล้อเมาส์ซูม • Shift+ลากเลื่อน • ดับเบิลคลิกรีเซ็ต';
function loadStage() {
  let key = null, args = null;
  if (mode === 'own' && ownItem) { key = 'i' + ownItem.id; args = [modelById(ownItem.modelId), ownItem.spec, ownItem.cond, ownItem.seed]; }
  else if (mode === 'daily') { const it = DS[D.run.idx]; key = 'd' + D.run.date + ':' + D.run.idx; args = [modelById(it.modelId), it.spec, it.cond, it.seed]; }
  else if (kPiece(mode)) { const it = kPiece(mode); key = kKey(mode); args = [modelById(it.modelId), it.spec, it.cond, it.seed]; }
  else if (modePiece(mode)) { const it = modePiece(mode); key = modeKey(mode); args = [modelById(it.modelId), it.spec, it.cond, it.seed]; }
  else if (mode === 'shop' && S.queue[0]) { const c = S.queue[0]; key = 'c' + c.id; args = [modelById(c.modelId), c.spec, c.cond, c.seed]; }
  const pc = curPiece(), fr = pc && pc.frame && !pc.open ? pc.frame : null; if (args) { args.push({ frame: fr }); key += fr ? ':f' : ''; }
  if (key && lastShown && key.replace(':f', '') === lastShown.replace(':f', '') && key !== lastShown) { lastShown = key; const q = holder.quaternion.clone(); showAmulet(...args); holder.quaternion.copy(q); V.vx = V.vy = 0; return; }
  if (key === lastShown) return; lastShown = key; CL = { key, marks: {}, open: CL.open };
  if (args) showAmulet(...args); else clearAmulet();
}
function render() {
  const L = lvl(), Lc = LEVELS[L - 1], Ln = LEVELS[L];
  $('#money').innerHTML = fmt(S.money) + (S.loan.amt ? `<small class="debt">หนี้ ${fmt(S.loan.amt)}</small>` : '');
  const st = stars();
  $('#lvname').textContent = L >= 6 && st ? `${starTxt(st)} ${starTitle(st)}` : `Lv.${L} ${Lc.name}`;
  $('#xpfill').style.width = (Ln ? clamp((S.xp - Lc.xp) / (Ln.xp - Lc.xp), 0, 1) : starProgress()) * 100 + '%';
  $('#xpfill').classList.toggle('star', L >= 6);
  $('#rep').innerHTML = `${S.rep}<small>ชื่อเสียง</small>`;
  $('#mk').innerHTML = mkHTML();
  $('#day').innerHTML = `${S.day}<small>วันที่</small>`;
  renderCard(); renderActs(); renderTabs(); loadStage(); renderSpotBar(); renderChips(); checkTut();
  $('#hint').textContent = spotting() ? 'แตะ = ชี้จุดที่ผิด • ลาก = หมุน' : HINT;
  const q = $('#qinfo'); q.innerHTML = '';
  if (mode === 'daily') q.innerHTML = `<span class="badge gold" id="dtimer">⏱ ${fmtTime(dElapsed())}</span>`;
  if (mode === 'duel' || mode === 'auction') q.innerHTML = modeQinfo(mode);
  if (mode === 'shop' && S.queue.length) q.innerHTML = `<span class="badge">ลูกค้ารอ ${S.queue.length} คน</span>` + (L >= 3 && S.day % 3 === 0 && S.contestDay !== S.day ? `<span class="badge gold">วันนี้มีงานประกวดพระ</span>` : '');
  if (mode === 'shop' && S.rumor.on) q.innerHTML += '<button class="badge bad qbtn" id="rumorBtn">มีข่าวลือว่าร้านขายของเก๊! แตะเพื่อแก้ข่าว</button>';
  if (mode === 'shop' && aucToday()) q.innerHTML += '<button class="badge gold qbtn" data-eg="auction">วันนี้มีงานประมูล แตะเพื่อเข้างาน</button>';
  let em = stage.querySelector('.empty'); if (em) em.remove();
  if (mode === 'shop' && !S.queue.length) {
    em = document.createElement('div'); em.className = 'empty';
    em.innerHTML = `<h2>ลูกค้าหมดแล้ววันนี้</h2><p>ไปดูตู้พระ ส่งตรวจ หรือปล่อยเช่าต่อได้ แล้วค่อยปิดร้าน</p><button class="btn ok" id="endDay">ปิดร้าน • ขึ้นวันใหม่</button>`;
    stage.appendChild(em); $('#endDay').onclick = endDay;
  }
  if (lvl() > S.lvlSeen && $('#modal').hidden) { const html = levelHTML(); if (html) openModal(html); }
  save();
}
const rarBadge = m => { const r0 = RAR[m.rar || 'common']; return `<span class="badge rar-${r0[1]}">${r0[0]}</span>`; };
function specFacts(m, o) { return `<span>${esc(MATS[m.mat].name)}</span>` + (S.tools.scale && o ? `<span>ตาชั่ง <b>${gramsOf(o).toFixed(1)} ก.</b></span>` : ''); }
function renderCard() {
  const el = $('#card');
  if (mode === 'duel' || mode === 'auction') { el.innerHTML = modeCard(mode); return; }
  if (mode === 'recv') { el.innerHTML = kCard(mode); return; }
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
      <div class="pname">${esc(m.name)} ${rarBadge(m)}</div>
      <div class="facts">${specFacts(m, it)}${subOf(m, it.claim) ? `<span>${it.cert === true ? `ผลตรวจ: <b>${esc(subOf(m, it.spec.sub).name)}</b>` : `ผู้ขายบอกว่า <b>${esc(subOf(m, it.claim).name)}</b>`}</span>` : ''}${it.frame ? `<span>${esc(FRAMES[it.frame].name)}</span>` : ''}<span>สภาพ <b>${it.cond}/100</b></span>${it.consign ? '' : `<span>ทุน${it.share ? 'ส่วนของคุณ' : ''} <b>${fmt(it.paid)}</b></span>`}${it.cert !== false && !it.pend ? `<span>มีคนให้เช่า <b>${fmt(offerFor(it))}</b></span>` : ''}</div>`;
    return;
  }
  const c = S.queue[0];
  if (!c) { el.innerHTML = `<div class="ava">ว่าง</div><div><div class="who">หน้าร้านว่าง</div><div class="line">วันที่ ${S.day} • ลูกค้าวันนี้มาครบแล้ว</div></div>`; return; }
  const m = modelById(c.modelId), cs = subOf(m, c.claim);
  el.innerHTML = `<div class="ava">${esc(c.name.replace(/^(ลุง|ป้า|เฮีย|เจ๊|พี่|น้อง|ตา|คุณ|ยาย|เสี่ย|น้า|อาจารย์)/, '').slice(0, 1))}</div>
    <div><div class="who">${esc(c.name)} <span class="badge" title="ความอดทนในการต่อราคา">อดทน ${'●'.repeat(c.patience)}${'○'.repeat(Math.max(0, 3 - c.patience))}</span></div><div class="line">“${esc(c.line)}”</div></div>
    <div class="pname">${esc(m.name)} ${rarBadge(m)}</div>
    <div class="facts">${specFacts(m, c)}${cs ? `<span>ลูกค้าบอกว่า <b>${esc(cs.name)}</b></span>` : ''}${c.certCard ? '<span class="badge gold">แนบใบรับรองมาด้วย</span>' : ''}${c.frame ? `<span>${esc(FRAMES[c.frame].name)}${c.open ? ' (ถอดแล้ว)' : ''}</span>` : ''}<span>สภาพ <b>${c.cond}/100</b></span>${c.victim ? `<span>เสียเงินไป <b>${fmt(c.ask)}</b></span>` : `<span>ราคาตลาดถ้าแท้${cs ? 'ตามพิมพ์ที่บอก' : ''} <b>${fmt(m.price * (cs ? cs.mult : 1) * cf(c.cond))}</b></span><span>ขอให้เช่า <b>${fmt(c.ask)}</b></span>`}</div>`;
}
// แถวบน = เครื่องมือส่อง, แถวล่าง = การตัดสินใจ (ไม่เกิน 4 ปุ่มต่อแถว อ่านง่ายบนจอ 360px)
const tagsOf = it => (it.consign ? `<span class="badge cons">ฝากขาย • เหลือ ${it.consign.until - S.day} วัน</span>` : '') + (it.share ? '<span class="badge shr">หุ้น 50%</span>' : '');
function toolBtns() { return `<button class="btn" data-a="flip">พลิก</button><button class="btn" data-a="loupe">ส่อง</button><button class="btn ${V.cmp ? 'on' : ''}" data-a="cmp" aria-pressed="${!!V.cmp}">เทียบ</button>` + (S.tools.uv ? `<button class="btn uvb ${V.uv ? 'on' : ''}" data-a="uv" aria-pressed="${!!V.uv}">UV</button>` : ''); }
function renderActs() {
  const el = $('#act'), rows = (a, b) => `<div class="ar">${a}</div>` + (b ? `<div class="ar">${b}</div>` : '');
  if (mode === 'own' && ownItem) {
    const it = ownItem, fee = certFee(it);
    let row2 = `<button class="btn dim" data-a="back">กลับหน้าร้าน</button>`;
    if (it.cert === false) row2 += it.consign ? `<button class="btn no span2" data-a="scrap">คืนพระให้เจ้าของ</button>` : `<button class="btn no span2" data-a="scrap">ทิ้ง / ขายเป็นของที่ระลึก<small>${fmt(it.share ? Math.round(scrapVal(it) / 2) : scrapVal(it))}</small></button>`;
    else if (it.pend) row2 += `<button class="btn span2" disabled>รอผลตรวจถึงพรุ่งนี้</button>`;
    else row2 += (modelById(it.modelId).kind === 'flat' && !it.frame && !it.consign ? `<button class="btn" data-a="framesvc">เลี่ยมกรอบ</button>` : '') + (it.cert ? '' : `<button class="btn" data-a="cert">ส่งตรวจ<small>${fmt(fee)}</small></button>`) + `<button class="btn ok ${it.cert ? 'span2' : ''}" data-a="sell">ปล่อยเช่า<small>${fmt(offerFor(it))}${it.consign || it.share ? ` • ได้ ${fmt(myCut(it, offerFor(it)))}` : ''}</small></button>`;
    el.innerHTML = rows(toolBtns(), row2);
  } else if (mode === 'duel' || mode === 'auction') {
    el.innerHTML = rows(toolBtns(), modeActs(mode));
  } else if (mode === 'recv') {
    el.innerHTML = rows(toolBtns(), kActs(mode));
  } else if (mode === 'shop' && S.queue[0] && S.queue[0].victim && !spotting()) {
    el.innerHTML = rows(toolBtns(), victimActs(S.queue[0]));
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
function nextCustomer() { S.queue.shift(); onCustomerDone(); render(); }
function negotiate() {
  const c = S.queue[0];
  if (c.patience <= 0) { toast(`${c.name} ไม่พอใจที่โดนต่อราคามากไป เดินออกจากร้านแล้ว`, 'bad'); S.rejected.push({ modelId: c.modelId, genuine: c.genuine, spec: c.spec, cond: c.cond, seed: c.seed }); nextCustomer(); return; }
  c.patience--;
  if (Math.random() < (c.genuine ? .35 : .12)) c.line = 'ราคานี้ต่ำสุดแล้ว ลดไม่ได้จริง ๆ' + (c.patience ? '' : ' ถ้าต่ออีกผมกลับเลยนะ');
  else { c.ask = round100(c.ask * (1 - (.06 + Math.random() * .09))); c.line = `โอเค ๆ ลดให้เหลือ ${fmt(c.ask)} ก็แล้วกัน`; }
  render();
}
function takeItem(c, extra) {
  S.inv.unshift({ id: c.id, modelId: c.modelId, spec: c.spec, genuine: c.genuine, cond: c.cond, seed: c.seed, paid: c.ask, ask: c.ask, cert: null, pend: 0, award: 0, day: S.day, xp: false, claim: c.claim || null, frame: c.frame || null, open: !!c.open, ...extra });
  if (c.genuine && !(extra && extra.consign)) { S.owned[c.modelId] = true; if (modelById(c.modelId)?.legend) markOwned(c.modelId); }
}
const subMult = it => { const m = modelById(it.modelId), x = subOf(m, it.spec && it.spec.sub); return x ? x.mult : 1; };
function buy() {
  const c = S.queue[0];
  if (S.money < c.ask) { openModal(shortHTML()); return; }
  if (lvl() >= 3 && !c.tut) { startReceive(c); return; } // ตรวจรับของก่อนจ่าย (บางครั้งลูกค้าสลับองค์)
  finishBuy(c, c);
}
function finishBuy(c, p, swapped = false) {
  S.money -= c.ask; S.stats.bought++; takeItem({ ...c, spec: p.spec, genuine: p.genuine, cond: p.cond, seed: p.seed });
  const withCert = c.certCard && c.certCard.real && !swapped; if (withCert) S.inv[0].cert = true; // ใบรับรองของจริงที่แนบมา
  sfx('buy'); toast(`รับเช่าแล้ว เก็บเข้าตู้พระ${withCert ? ' (พร้อมใบรับรอง)' : ''}`, 'good'); nextCustomer();
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
    S.rejected.push({ modelId: c.modelId, genuine: c.genuine, spec: c.spec, cond: c.cond, seed: c.seed }); nextCustomer(); return;
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
  const bad = Object.keys(CL.marks).filter(k => CL.marks[k] === 'bad');
  if (CL.key === 'c' + c.id && bad.length) {
    if (bad.length <= 2) { spot = { cid: c.id, busy: false }; commitSpot(bad); return; }
    toast('ติ๊ก ✗ เกิน 2 ข้อ ระบบไม่นับเป็นการชี้จุด ลองชี้บนองค์พระแทน');
  }
  spot = { cid: c.id, busy: false }; render();
}
function finishPass(c) {
  spot = null; if (S.queue[0] !== c) { render(); return; }
  S.rejected.push({ modelId: c.modelId, genuine: c.genuine, spec: c.spec, cond: c.cond, seed: c.seed, pointed: c.pointed || null, hit: !!c.hit, wrong: c.genuine ? [] : wrongKeys(c.spec, modelById(c.modelId)) });
  nextCustomer();
}
function onTap(x, y) {
  if (!spotting() || spot.busy) return;
  const hit = pickPart(x, y), m = modelById(S.queue[0].modelId);
  if (!hit) { toast('แตะให้โดนองค์พระ หรือกด "เลือกจากรายการ"'); return; }
  const zone = hit.part === 'front' ? frontZone(m, hit.px, hit.py) : hit.part;
  if (zone === 'frame') { toast('กรอบบังขอบอยู่ กด "ถอดกรอบ" ก่อนจึงดูขอบและความหนาได้'); return; }
  const keys = (hit.tells || ZONE_KEYS[zone] || [zone]).filter(k => k && k in m.spec);
  if (!keys.length) { toast('ตรงนี้ไม่ใช่จุดสังเกต ลองแตะจุดอื่น'); return; }
  commitSpot(keys);
}
function commitSpot(keys) {
  const c = S.queue[0]; if (!spotting() || spot.busy || c.pointed) return;
  const hitK = c.genuine ? null : keys.find(k => wrongKeys(c.spec, modelById(c.modelId)).includes(k));
  c.pointed = keys;
  if (hitK) {
    c.hit = true; S.stats.spotted++; onSpotHit(); gainXP(20); save(); spot.busy = true; renderActs(); renderSpotBar();
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
function offerFor(it) { const m = modelById(it.modelId), r = rng(hash(it.id + ':' + S.day)); return (it.frame ? FRAMES[it.frame].val : 0) + round100(starMult() * m.price * subMult(it) * cf(it.cond) * (it.cert ? 1.15 : 1) * (1 + .1 * it.award) * (1 + S.rep / 300) * (.9 + r() * .18)); }
function revealXP(it) { const m = modelById(it.modelId); it.xp = true; return 15 + clamp(Math.round((m.price * cf(it.cond) - (it.ask ?? it.paid)) / (m.price * .05)), 0, 20) * 2; }
// ส่วนที่เป็นของผู้เล่นเมื่อขายได้ p: ฝากขาย = ส่วนเกินราคาเจ้าของ (ขั้นต่ำ 10%), หุ้น = ครึ่งหนึ่ง
function myCut(it, p) { return it.consign ? Math.max(p - it.consign.price, round100(p * .1)) : it.share ? Math.round(p / 2) : p; }
// ของหุ้นถูกเปิดโปงว่าเก๊: เพื่อนไม่พอใจ ชื่อเสียง −3 และงดชวนลงหุ้น 3 วัน
function shareFake(it) { if (!it.share || it.shareHit) return ''; it.shareHit = true; S.rep = Math.max(0, S.rep - 3); S.shareBan = S.day + 3; return ' • เซียนหุ้นส่วนไม่พอใจ ชื่อเสียง −3 และงดชวนลงหุ้น 3 วัน'; }
function certify(it) { const fee = certFee(it); if (S.money < fee) { toast('เงินไม่พอจ่ายค่าตรวจ', 'bad'); return; } S.money -= fee; it.pend = S.day; toast('ส่งเข้าสมาคมตรวจพระแล้ว ผลออกวันพรุ่งนี้'); render(); }
function sell(it, opt = {}) {
  if (opt.price == null && sellChoice(it)) { openModal(sellHTML(it)); return; }
  if (!it.genuine) {
    it.xp = true; gainXP(3); S.stats.fooled++;
    if (it.consign) { S.rep = Math.max(0, S.rep - 8); S.inv = S.inv.filter(x => x !== it); toast(`เซียนผู้ซื้อตรวจพบว่าเป็นพระเก๊! ชื่อเสียง −8 และต้องคืนพระให้${it.consign.owner}`, 'bad'); toShop(); return; }
    S.rep = Math.max(0, S.rep - 6); it.cert = false; toast('เซียนผู้ซื้อตรวจพบว่าเป็นพระเก๊! ชื่อเสียง −6' + shareFake(it), 'bad'); render(); return;
  }
  const p = opt.price ?? offerFor(it), mine = myCut(it, p), gain = mine - it.paid; S.money += mine; S.inv = S.inv.filter(x => x !== it); S.rep = Math.min(100, S.rep + 1); S.stats.sold++;
  gainXP((it.xp ? 0 : revealXP(it)) + 5 + clamp(gain / 1000, 0, 40));
  const split = it.consign ? ` • จ่ายเจ้าของ ${fmt(p - mine)}` : it.share ? ` • แบ่งเพื่อน ${fmt(p - mine)}` : '';
  toast(`${opt.msg ? opt.msg + ' • ' : ''}ปล่อยเช่าได้ ${fmt(p)}${split} • ${gain >= 0 ? 'กำไร' : 'ขาดทุน'} ${fmt(Math.abs(gain))}`, gain >= 0 ? 'good' : 'bad');
  toShop();
}
function scrap(it) {
  S.inv = S.inv.filter(x => x !== it);
  if (it.consign) { toast(`คืนพระให้${it.consign.owner}แล้ว`); toShop(); return; }
  const v = it.share ? Math.round(scrapVal(it) / 2) : scrapVal(it); S.money += v; toast(`ขายเป็นของที่ระลึก ได้ ${fmt(v)}${it.share ? ' (แบ่งเพื่อนครึ่งหนึ่ง)' : ''}`); toShop();
}
function toShop() { pauseDaily(); leaveMode(mode); mode = 'shop'; ownItem = null; render(); }
function openOwn(it) { pauseDaily(); leaveMode(mode); mode = 'own'; ownItem = it; closeModal(); render(); }

function endDay() {
  const lines = [], L0 = lvl(), shows = [];
  for (const it of S.inv) if (it.pend) {
    it.pend = 0; it.cert = it.genuine; const m = modelById(it.modelId);
    if (it.genuine) { const x = it.xp ? 0 : revealXP(it), sb = subOf(m, it.spec.sub), cl = subOf(m, it.claim); gainXP(x); lines.push(['good', `ผลตรวจ ${m.name}: แท้ ได้ใบรับรอง${sb ? ` เป็น${sb.name}${cl && cl.id !== sb.id ? ` (ไม่ใช่${cl.name}ตามที่ผู้ขายบอก)` : ''}` : ''}${x ? ` (+${x} XP)` : ''}`]); }
    else { it.xp = true; gainXP(3); S.stats.fooled++; shows.push({ modelId: it.modelId, spec: it.spec, cond: it.cond, seed: it.seed, title: `โดนหลอก: ${m.name}` }); lines.push(['bad', `ผลตรวจ ${m.name}: ไม่แท้${it.consign ? ' (ของฝากขาย คืนเจ้าของได้)' : ` เสียเงินไป ${fmt(it.paid)}`}${shareFake(it)}`]); }
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
  for (const x of S.rejected) if (x.genuine && x.spec) shows.push({ ...x, title: `ปฏิเสธองค์แท้: ${modelById(x.modelId).name}` });
  S.rejected = [];
  if (S.tlog.length) { lines.push(...S.tlog.map(([k, t]) => [k, 'กิจกรรมวันนี้: ' + t])); S.tlog = []; }
  for (const b of S.batches) dayBatch(b, lines);
  for (const t of TEMPLES) if (S.batches.some(b => b.temple === t.id)) {
    const tr = tTrust(t.id);
    if (tr < 10) lines.push(['bad', `${t.name}: เจ้าอาวาสหมดความไว้ใจ จะไม่รับจัดสร้างพระกับคุณ (ไว้ใจ ${tr})`]);
    else if (tr < 30) lines.push(['bad', `เจ้าอาวาส${t.name}เตือน: "ทำพระให้ซื่อตรง อย่าปั่นราคา ไม่อย่างนั้นวัดจะไม่ร่วมงานด้วย" (ไว้ใจ ${tr})`]);
  }
  for (const it of S.inv.filter(x => x.consign && S.day >= x.consign.until)) {
    S.inv = S.inv.filter(x => x !== it); lines.push(['', `${it.consign.owner}มารับ ${modelById(it.modelId).name} คืน (ฝากขายครบ 5 วันแล้วยังขายไม่ออก)`]);
  }
  endgameDay(lines); karmaDay(lines);
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
    ${shows.length ? `<h3>เฉลยพร้อมภาพ</h3>${shows.slice(0, 4).map(revealCard).join('')}${shows.length > 4 ? `<p class="note">และอีก ${shows.length - 4} องค์</p>` : ''}` : ''}
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
    if (r() < .1 * goodMult()) { b.hype = Math.min(100, b.hype + 25); lines.push(['gold', `ข่าวดี! ${pick(r, EVENTS).replace('{n}', nm)} (กระแส +25)`]); }
    const hoard = b.hoard === S.day;
    let n = Math.min(avail - b.sold, Math.round(b.qty * (.06 + r() * .09) * (.7 + t.fame * .35) * (1 + S.rep / 120) * (.5 + b.hype / 100)));
    if (hoard) n = Math.floor(n / 2);
    b.sold += n; const rev = n * b.unit; S.money += Math.round(rev * .7); gainXP(n / 15);
    if (n > 0) { S.trust[t.id] = clamp(tTrust(t.id) + 1, 0, 100); addMerit(1); }
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

/* ================= guide: เช็กลิสต์ ถามอาจารย์ เฉลยพร้อมภาพ บทเรียน ================= */
// องค์ที่กำลังส่อง (หน้าร้าน / ตู้ / ประจำวัน)
function curPiece() {
  if (mode === 'own' && ownItem) return ownItem;
  if (mode === 'daily' && DS && D.run) return DS[D.run.idx];
  if (modePiece(mode)) return modePiece(mode);
  if (kPiece(mode)) return kPiece(mode);
  return mode === 'shop' ? S.queue[0] || null : null;
}
// เช็กลิสต์: ผู้เล่นติ๊กเอง เกมไม่ช่วยตอบ ล้างเมื่อเปลี่ยนองค์ (ใน loadStage)
let CL = { key: null, marks: {}, open: false };
const CLM = { ok: '✓', bad: '✗', unk: '?' };
function clHTML() {
  const it = curPiece(); if (!it) return ''; const m = modelById(it.modelId);
  return `<div class="clh"><b>เช็กลิสต์จุดสังเกต</b><button class="x clx" id="clClose" aria-label="ปิดเช็กลิสต์">×</button></div><p class="note">เทียบกับองค์ครูแล้วติ๊กเอง ✓ ตรง / ✗ ไม่ตรง / ? ไม่แน่ใจ${mode === 'shop' ? ' • ติ๊ก ✗ ไม่เกิน 2 ข้อแล้วกด "ไม่เอา" = ชี้จุดเก๊' : ''}</p>` +
    specKeys(m).map(k => `<div class="clr"><div><b>${esc(shortLabel(k))}</b><small>องค์ครู: ${esc(k === 'weight' ? mWeight(m) + ' กรัม' : tellTxt(k, sv(m.spec, k)))}</small></div><div class="clb">${Object.entries(CLM).map(([v, ic]) => `<button class="${v} ${CL.marks[k] === v ? 'on' : ''}" data-cl="${k}:${v}" aria-label="${esc(shortLabel(k))} ${ic}" aria-pressed="${CL.marks[k] === v}">${ic}</button>`).join('')}</div></div>`).join('');
}
const askLeft = () => S.ask.day === S.day ? Math.max(0, 3 - S.ask.used) : 3;
const askCost = () => 2000 * lvl();
function renderChips() {
  const el = $('#chips'), it = curPiece(), on = !!it; stage.classList.toggle('spotting', spotting());
  el.hidden = !on; $('#clp').hidden = !(on && CL.open);
  if (!on) return;
  const nm = Object.keys(CL.marks).length, canAsk = mode !== 'daily' && mode !== 'duel';
  const m = modelById(it.modelId), canShake = m && ('rattle' in m.spec || 'mercury' in m.spec);
  const certChip = mode === 'shop' && it.certCard ? `<button class="chip" id="certBtn">ตรวจใบเซอร์<small>${it.certPaid ? 'ดูอีกครั้ง' : fmt(500)}</small></button>` : '';
  const dressChip = mode === 'own' && !it.dressed && !it.consign && it.cert !== false ? `<button class="chip grey" id="dressBtn">แต่งผิว<small>สายเทา</small></button>` : '';
  el.innerHTML = certChip + dressChip + (it.frame ? `<button class="chip" id="frameBtn">${it.open ? 'ใส่กรอบกลับ' : 'ถอดกรอบ'}<small>${esc(FRAMES[it.frame].name)}</small></button>` : '') + (canShake ? `<button class="chip" id="shakeBtn">เขย่า</button>` : '') + `<button class="chip" id="clBtn" aria-expanded="${CL.open}">เช็กลิสต์${nm ? ` ${nm}` : ''}</button>` + (canAsk ? `<button class="chip" id="askBtn">ถามอาจารย์<small>${it.teach ? 'ดูคำตอบเดิม' : askLeft() ? `เหลือ ${askLeft()} ครั้ง` : fmt(askCost())}</small></button>` : '');
  if (CL.open) $('#clp').innerHTML = clHTML();
}
function shakePiece() {
  const it = curPiece(); if (!it) return; const sp = it.spec; V.shake = performance.now();
  sfx('rattle' in sp ? (sp.rattle === 'clear' ? 'ring' : 'dull') : sp.mercury === 'flow' ? 'merc' : 'dry');
  if (S.mute) toast('เปิดเสียงประกอบในเมนูก่อน ถึงจะได้ยินเสียงเขย่า');
}
// กรอบ: หน้าร้านถอดได้แต่ลูกค้าเสียความอดทน 1 (ถ้าหมดความอดทนจะไม่ยอม) • ในตู้ถอด/ใส่ได้ฟรี
function toggleFrame() {
  const it = curPiece(); if (!it || !it.frame) return;
  if (mode === 'shop' && !it.open) { if (it.patience <= 0) { toast(`${it.name}ไม่ยอมให้ถอดกรอบ`, 'bad'); return; } it.patience--; toast('ถอดกรอบแล้ว ดูขอบและความหนาได้ (ลูกค้าเสียความอดทน 1)'); }
  it.open = !it.open; save(); render();
}
function frameSvcHTML() {
  return `<h2>เลี่ยมกรอบ</h2><p class="note">กรอบช่วยกันกระแทก และกรอบทองเพิ่มราคาตอนปล่อยเช่า</p><div class="opts">` + Object.entries(FRAMES).map(([k, F]) => `<button class="btn opt" data-frame="${k}" ${S.money < F.cost ? 'disabled' : ''}><b>${esc(F.name)} ${fmt(F.cost)}</b><small>${S.money < F.cost ? 'เงินไม่พอ' : `มูลค่าเพิ่มตอนปล่อยเช่า ${fmt(F.val)}`}</small></button>`).join('') + `</div><div class="row"><button class="btn dim" data-close>ยกเลิก</button></div>`;
}
function doFrame(k) { const it = ownItem, F = FRAMES[k]; if (!it || !F || it.frame || S.money < F.cost) return; S.money -= F.cost; it.frame = k; it.open = false; closeModal(); toast(`เลี่ยม${F.name}แล้ว`, 'good'); render(); }
// ถามอาจารย์: บอกบริเวณกว้าง ๆ ไม่ฟันธงตรง ๆ
const AREA = { nagaHeads: 'พังพานนาคเหนือเศียร', monkItem: 'ไหล่กับหน้าอก', finish: 'ผิวที่ตกแต่ง', seam: 'ข้างองค์ ดูตะเข็บ', kcode: 'ใต้ฐาน', rattle: 'เสียงเขย่า', turns: 'ปลายม้วน นับรอบ', cord: 'เชือกที่ถัก', braid: 'ลายถักเชือก', chan: 'ชันโรงด้านล่าง', wrap: 'ลายถักหุ้ม', mercury: 'เสียงเขย่า', flame: 'พระเกศเหนือเศียร', hand: 'แขนกับมือ', petals: 'ฐานใต้ตัก', tiers: 'ฐานใต้ตัก', dots: 'แนวเม็ดรอบซุ้ม', palm: 'มือที่ปิดหน้า', back: 'ด้านหลัง', code: 'ด้านหลังตรงโค้ด', edge: 'ขอบข้าง', thick: 'ด้านข้าง ดูความหนา', loop: 'หูเหรียญ', grain: 'ผิวเนื้อ ส่องใกล้ ๆ', ingr: 'เนื้อพระ ส่องหามวลสาร', resin: 'เนื้อพระ ลองใช้ไฟ UV', weight: 'น้ำหนัก ลองชั่งดู' };
function askTeacher() {
  const it = curPiece(); if (!it || mode === 'daily' || mode === 'duel') return;
  if (!it.teach) {
    if (askLeft() > 0) { if (S.ask.day !== S.day) S.ask = { day: S.day, used: 0 }; S.ask.used++; }
    else { const c = askCost(); if (S.money < c) { toast('เงินไม่พอค่าครู', 'bad'); return; } S.money -= c; }
    const w = it.genuine ? [] : wrongKeys(it.spec, modelById(it.modelId));
    it.teach = w.length ? { k: pick(Math.random, w) } : { k: null, unsure: Math.random() < .15 };
    save();
  }
  const t = it.teach;
  if (t.k) { toast(`🧓 อาจารย์: "ลองดูที่${AREA[t.k] || 'องค์พระ'}นะ"`); highlight(t.k, 2000); }
  else toast(t.unsure ? '🧓 อาจารย์: "อันนี้อาจารย์ก็ไม่แน่ใจ ลองเทียบกับองค์ครูดูอีกทีนะ"' : '🧓 อาจารย์: "อาจารย์ดูแล้ว ไม่เห็นอะไรผิดสังเกต"');
  render();
}
// เฉลยพร้อมภาพตอนสรุปวัน: องค์ที่โดนหลอกหรือปฏิเสธผิด
const XA = new Map();
function diffLines(spec, m) { return wrongKeys(spec, m).map(k => `${shortLabel(k)}: ${k === 'weight' ? tellTxt(k, sv(spec, k)) : tellTxt(k, sv(spec, k))} (ของแท้ ${k === 'weight' ? mWeight(m) + ' กรัม' : tellTxt(k, sv(m.spec, k))})`); }
function revealCard(x) {
  const m = modelById(x.modelId); if (!m || !x.spec) return '';
  const ka = String(hash(JSON.stringify([x.modelId, x.spec, x.cond, x.seed]))), kb = 'ref' + hash(m.id);
  XA.set(ka, [m, x.spec, x.cond, x.seed]); XA.set(kb, [m, m.spec, 100, 4242]);
  const d = diffLines(x.spec, m);
  return `<div class="rv"><b>${esc(x.title)}</b><div class="views rvv"><figure><img data-thumb="x:${ka}" alt="องค์นั้น"><figcaption>องค์นั้น</figcaption></figure><figure><img data-thumb="x:${kb}" alt="องค์ครู"><figcaption>องค์ครู (ของแท้)</figcaption></figure></div>
    <ul class="rvd">${d.length ? d.map(t => `<li>${esc(t)}</li>`).join('') : '<li>องค์นี้แท้ ไม่มีจุดผิด ครั้งหน้าลองกด "เทียบ" ก่อนตัดสินใจ</li>'}</ul></div>`;
}
// บทเรียน: ลูกค้า 3 คนแรกของเกมใหม่เป็น "อาจารย์พาส่อง"
function tutCustomers() {
  const r = rng(hash('tut:' + S.seed + ':' + S.nextId)), np = modelById('nangpaya'), sd = modelById('somdej');
  const mk = (i, m, genuine, line, spec) => ({ id: S.nextId++, tut: i, name: 'อาจารย์พาส่อง', line, modelId: m.id, genuine, spec: spec || { ...m.spec }, cond: 92, ask: round100(m.price * .45), patience: 3, seed: Math.floor(r() * 1e9) });
  return [mk(1, np, false, 'มา ลองส่ององค์นี้กับอาจารย์ ทำตามลูกศรไปทีละขั้นนะ', { ...np.spec, back: 'circle', flame: 'tall' }),
    mk(2, sd, true, 'องค์นี้ลองใช้ "เช็กลิสต์" ติ๊กเทียบกับองค์ครูทีละข้อดู', null),
    mk(3, np, false, 'องค์สุดท้าย ถ้าดูไม่ออก กด "ถามอาจารย์" ได้นะ', { ...np.spec, thick: 'thin', edge: 'round' })];
}
const TUT = {
  1: ['back', 'side', 'loupe', 'cmp', 'decide'], 2: ['checklist', 'decide'], 3: ['ask', 'decide'],
};
const TUTX = {
  back: ['① ลากหมุนองค์พระไปดูด้านหลัง (หรือกด "พลิก")', '[data-a=flip]'],
  side: ['② หมุนให้เห็นขอบข้าง ดูว่าหนาหรือบาง ขอบตัดหรือมน', null],
  loupe: ['③ กด "ส่อง" เพื่อซูมดูผิวเนื้อใกล้ ๆ', '[data-a=loupe]'],
  cmp: ['④ กด "เทียบ" ดูคู่กับองค์ครู (ของแท้) หมุนพร้อมกันทั้งสององค์', '[data-a=cmp]'],
  checklist: ['กด "เช็กลิสต์" แล้วติ๊ก ✓ ✗ ? ทีละข้อเทียบกับองค์ครู', '#clBtn'],
  ask: ['กด "ถามอาจารย์" ให้ช่วยชี้บริเวณที่น่าสงสัย (วันละ 3 ครั้งฟรี)', '#askBtn'],
  decide: ['⑤ ตัดสินใจ: "รับเช่า" ถ้าคิดว่าแท้ หรือ "ไม่เอา" แล้วชี้จุดที่ผิด', '#act .ar:last-child'],
};
const FWD = new THREE.Vector3();
function tutDone(st, c) {
  FWD.set(0, 0, 1).applyQuaternion(holder.quaternion);
  return st === 'back' ? FWD.z < -.05 : st === 'side' ? Math.abs(FWD.z) < .3 : st === 'loupe' ? V.zt < .6 : st === 'cmp' ? !!V.cmp
    : st === 'checklist' ? Object.keys(CL.marks).length > 0 : st === 'ask' ? !!c.teach : false;
}
function checkTut() {
  const co = $('#coach'), ar = $('#coachArrow'), c = S.queue[0];
  document.querySelectorAll('.coach-tgt').forEach(e => e.classList.remove('coach-tgt'));
  if (S.tut.on && !S.queue.some(q => q.tut)) { S.tut.on = false; save(); toast('จบบทเรียนแล้ว เปิดดูใหม่ได้จากเมนู ≡', 'good'); }
  const show = S.tut.on && mode === 'shop' && c && c.tut && $('#modal').hidden && !spotting();
  co.hidden = ar.hidden = !show; if (!show) return;
  if (S.tut.cid !== c.id) { S.tut.cid = c.id; S.tut.step = 0; }
  const steps = TUT[c.tut]; while (S.tut.step < steps.length - 1 && tutDone(steps[S.tut.step], c)) S.tut.step++;
  const st = steps[S.tut.step], [txt, sel] = TUTX[st], sr = stage.getBoundingClientRect();
  if (co.dataset.st !== c.id + st) { co.dataset.st = c.id + st; co.innerHTML = `<p>${esc(txt)}</p><button class="btn dim" id="tutSkip">ข้ามบทเรียน</button>`; }
  co.style.top = sr.top + 8 + 'px'; co.style.left = sr.left + 8 + 'px'; co.style.width = Math.min(420, Math.max(200, sr.width - 150)) + 'px'; $('#qinfo').hidden = true;
  const tg = sel && document.querySelector(sel);
  if (tg) { tg.classList.add('coach-tgt'); const r = tg.getBoundingClientRect(); ar.textContent = '▼'; ar.style.left = r.left + r.width / 2 + 'px'; ar.style.top = r.top - 30 + 'px'; ar.className = 'coach-arrow'; }
  else { ar.textContent = '⟲ ลากหมุน'; ar.style.left = sr.left + sr.width / 2 + 'px'; ar.style.top = sr.top + sr.height * .62 + 'px'; ar.className = 'coach-arrow drag'; }
}
function restartTut() { S.tut = { on: true, step: 0 }; S.queue.unshift(...tutCustomers()); mode = 'shop'; ownItem = null; spot = null; lastShown = null; closeModal(); render(); }

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
setInterval(() => egTick(mode), 250);
setInterval(() => {
  const t = $('#dtimer'); if (t && mode === 'daily') t.textContent = '⏱ ' + fmtTime(dElapsed());
  const cd = $('#cd'); if (cd) cd.textContent = D.last && D.last.date !== bkkDate() ? 'พร้อมแล้ว! เปิดเมนูเพื่อเล่นชุดใหม่' : fmtHMS(msToMidnight());
}, 500);
addEventListener('pagehide', () => { pauseDaily(); if (mode === 'daily') dT0 = performance.now(); });

/* ================= modals ================= */
function openModal(html) { $('#mbody').innerHTML = html; $('#modal').hidden = false; fillThumbs($('#mbody')); $('#modal .sheet').scrollTop = 0; }
function closeModal() { $('#modal').hidden = true; if (popEnding()) return; if (lvl() > S.lvlSeen) render(); }
$('#mx').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

// สมุด: หมวด + ค้นหา + ตัวกรอง (ภาค ความหายาก เลเวล) + สมุดสะสม (✓ รุ่นที่เคยครอบครองของแท้) แถวย่อ แตะเพื่อดูละเอียด
const BK = { cat: 'phra', q: '', region: '', rar: '', lv: '', open: null, seen: null };
const bookCur = () => mode === 'own' && ownItem ? ownItem.modelId : mode === 'daily' && DS ? DS[D.run.idx].modelId : S.queue[0]?.modelId;
function bookHTML() {
  const curId = bookCur(), cm = curId && modelById(curId);
  if (cm && BK.seen !== curId) { BK.seen = curId; BK.cat = catOf(cm); BK.open = curId; }
  const sel = (k, opts, lab) => `<select data-bkf="${k}" aria-label="${lab}">${opts.map(([v, n]) => `<option value="${v}" ${BK[k] === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
  return `<h2>สมุดองค์ครู</h2><div class="row" style="margin:0 0 8px"><button class="btn" id="toolShopBtn">ร้านอุปกรณ์เซียน</button><button class="btn" id="recipeBtn">ตำรับที่ค้นพบ</button></div>
    <p class="note">สมุดสะสม: ครอบครองของแท้แล้ว <b>${MODELS.filter(m => S.owned[m.id]).length}/${MODELS.length}</b> รุ่น • แตะรุ่นเพื่อดูองค์ครู 3 ด้าน จุดสังเกต และพิมพ์ย่อย</p>
    <div class="bkcats" role="tablist">${Object.entries(CATS).map(([k, n]) => `<button class="bkc ${BK.cat === k ? 'on' : ''}" data-bkcat="${k}" role="tab" aria-selected="${BK.cat === k}">${n}</button>`).join('')}</div>
    <div class="bkf"><input id="bkq" type="search" placeholder="ค้นหาชื่อรุ่นหรือวัด" value="${esc(BK.q)}" autocomplete="off">
    ${sel('region', [['', 'ทุกภาค'], ...Object.entries(REGIONS)], 'ภาค')}${sel('rar', [['', 'ทุกความหายาก'], ...Object.entries(RAR).map(([k, v]) => [k, v[0]])], 'ความหายาก')}${sel('lv', [['', 'ทุกเลเวล'], ...[1, 2, 3, 4, 5, 6].map(l => [String(l), 'Lv.' + l]), ['c', 'รุ่นที่จัดสร้างเอง']], 'เลเวล')}</div>
    <div id="bkList">${bookList()}</div>`;
}
function bookList() {
  const L = lvl(), curId = bookCur(), q = BK.q.trim();
  const list = MODELS.concat(legendsOpen(), S.custom).filter(m => catOf(m) === BK.cat && (!q || m.name.includes(q)) && (!BK.region || m.region === BK.region) && (!BK.rar || (m.rar || 'common') === BK.rar) && (!BK.lv || (m.custom ? 'c' : String(m.lvl)) === BK.lv))
    .sort((a, b) => (b.id === curId) - (a.id === curId) || (a.custom ? 99 : a.lvl) - (b.custom ? 99 : b.lvl));
  return list.length ? list.map(m => bookRow(m, L, curId)).join('') : '<p class="note">ไม่พบรุ่นที่ตรงกับตัวกรอง</p>';
}
function bookRow(m, L, curId) {
  const locked = m.lvl > L && !m.custom && m.id !== curId, k = 'bk' + hash(m.id), open = !locked && BK.open === m.id;
  if (!locked) XA.set(k, [m, m.spec, 100, 4242]);
  const head = `<button class="bkr" data-bkopen="${esc(m.id)}" aria-expanded="${open}"><span class="bkt">${locked ? '🔒' : `<img data-thumb="x:${k}" alt="">`}</span><span class="bkn"><b>${esc(m.name)}</b>
    <small>${m.custom ? 'รุ่นที่คุณจัดสร้าง' : esc(REGIONS[m.region] || '')} • ${locked ? `ปลดล็อก Lv.${m.lvl}` : `${esc(MATS[m.mat].name)} • Lv.${m.custom ? '-' : m.lvl}`}</small><span>${rarBadge(m)}${S.owned[m.id] ? ' <span class="badge good">✓ เคยครอบครอง</span>' : ''}${m.id === curId ? ' <span class="badge gold">กำลังส่อง</span>' : ''}</span></span></button>`;
  if (!open) return `<div class="mdl bk ${m.id === curId ? 'cur' : ''}">${head}</div>`;
  const subs = subsOf(m);
  return `<div class="mdl bk ${m.id === curId ? 'cur' : ''}">${head}
    <div class="note">ราคาตลาดสภาพสมบูรณ์ ${fmt(m.price)}${subs ? ' (พิมพ์มาตรฐาน)' : ''}</div>
    <div class="views" data-thumb="m:${esc(m.id)}"><figure><img alt="ด้านหน้า"><figcaption>ด้านหน้า</figcaption></figure><figure><img alt="ด้านหลัง"><figcaption>ด้านหลัง</figcaption></figure><figure><img alt="ด้านข้าง"><figcaption>ด้านข้าง</figcaption></figure></div>
    <table class="tells">${Object.entries(m.spec).map(([k2, v]) => `<tr><td>${TELLS[k2].label}</td><td>${esc(tellTxt(k2, v))}</td></tr>`).join('')}
      <tr><td>${TELLS.weight.label}</td><td>น้ำหนักองค์ครู <b>${mWeight(m)} กรัม</b> (ของแท้คลาดเคลื่อนไม่เกิน ±3%)</td></tr>
      <tr><td>${TELLS.resin.label}</td><td>ของแท้ไม่เรืองแสงใต้ UV</td></tr>
      ${subs ? `<tr><td>พิมพ์ย่อย (ไม่ใช่ของเก๊)</td><td>${subs.map(x => `<b>${esc(x.name)}</b>: ${esc(x.txt)} • ราคา ×${x.mult}`).join('<br>')}</td></tr>` : ''}</table></div>`;
}
function invHTML() {
  if (!S.inv.length) return `<h2>ตู้พระ</h2><p>ตู้ยังว่างอยู่ รับเช่าพระจากลูกค้าหน้าร้านก่อนนะ</p>`;
  return `<h2>ตู้พระ (${S.inv.length} องค์)</h2><p class="note">แตะองค์พระเพื่อส่องดู ส่งตรวจ หรือปล่อยเช่า</p><div class="grid">` +
    S.inv.map(it => { const m = modelById(it.modelId);
      const st = it.pend ? '<span class="badge">รอผลตรวจ</span>' : it.cert === true ? '<span class="badge good">แท้</span>' : it.cert === false ? '<span class="badge bad">เก๊</span>' : '<span class="badge">ยังไม่ตรวจ</span>';
      return `<button class="item" data-own="${it.id}"><img class="thumb" data-thumb="i:${it.id}" alt=""><span class="nm">${esc(m.name)}</span><span class="sub">สภาพ ${it.cond} • ${it.consign ? `ราคาเจ้าของ ${fmt(it.consign.price)}` : `ทุน ${fmt(it.paid)}`}</span><span class="tags">${st}${rarBadge(modelById(it.modelId))}${tagsOf(it)}${it.award ? '<span class="badge gold">รางวัล</span>' : ''}</span></button>`; }).join('') + '</div>';
}
function contestHTML() {
  const L = lvl();
  if (L < 3) return `<h2>งานประกวดพระ</h2><p>ปลดล็อกที่ Lv.3 เซียนเปิดแผง (XP ตอนนี้ ${S.xp}/${LEVELS[2].xp})</p>`;
  const nextDay = S.day % 3 === 0 && S.contestDay !== S.day ? S.day : S.day + (3 - S.day % 3);
  if (nextDay !== S.day) return `<h2>งานประกวดพระ</h2><p>งานจัดทุก 3 วัน ครั้งถัดไปคือ <b>วันที่ ${nextDay}</b></p><p class="note">เตรียมพระสภาพสวยที่มีใบรับรองไว้ เพิ่มโอกาสติดรางวัล ถ้าส่งของเก๊เข้าประกวดจะถูกคัดออกและเสียชื่อเสียง</p>`;
  const ok = S.inv.filter(it => !it.pend && it.cert !== false && !it.consign);
  return `<h2>งานประกวดพระ วันที่ ${S.day}</h2><p>เลือกได้สูงสุด 3 องค์ ค่าสมัครองค์ละ ${fmt(1000)} กรรมการให้คะแนนจากความแท้ สภาพ ความหายาก และใบรับรอง</p>` +
    (ok.length ? ok.map(it => { const m = modelById(it.modelId); return `<label class="pick"><input type="checkbox" value="${it.id}"><img data-thumb="i:${it.id}" alt=""><span><b>${esc(m.name)}</b><br><span class="note">สภาพ ${it.cond}${it.cert ? ' • มีใบรับรอง' : ''}</span></span></label>`; }).join('') + `<div class="row"><button class="btn ok" id="enterC">ส่งเข้าประกวด</button><button class="btn grey" id="enterCB">ส่ง + ติดสินบนกรรมการ<small>สายเทา</small></button></div>`
      : '<p>ยังไม่มีพระที่ส่งประกวดได้ในตู้</p>');
}
function ownHype(it) { const b = S.batches.find(x => x.modelId === it.modelId); if (!b) return ''; b.hype = Math.min(100, b.hype + 20); return ' • กระแสรุ่นนี้ +20'; }
function runContest(ids, bribe) {
  const items = S.inv.filter(it => ids.includes(String(it.id))); if (!items.length) { toast('เลือกพระอย่างน้อย 1 องค์', 'bad'); return; }
  if (items.length > 3) { toast('ส่งได้สูงสุด 3 องค์', 'bad'); return; }
  const fee = items.length * 1000 + (bribe ? BRIBE_COST : 0); if (S.money < fee) { toast('เงินไม่พอค่าสมัคร', 'bad'); return; }
  S.money -= fee; S.contestDay = S.day;
  const bonus = bribe && bribeOutcome() === 'ok' ? 15 : 0; // ติดสินบนกรรมการ: +15 ถ้าไม่โดนแฉ
  const res = items.map(it => {
    const m = modelById(it.modelId);
    if (!it.genuine) { S.rep = Math.max(0, S.rep - 8); it.cert = false; it.xp = true; return ['bad', `${m.name}: ถูกคัดออก กรรมการตัดสินว่าไม่แท้ (ชื่อเสียง −8)${shareFake(it)}`]; }
    const pk = it.share ? .5 : 1, ps = it.share ? ' (แบ่งเพื่อนครึ่งหนึ่ง)' : '';
    const sc = it.cond + Math.min(m.lvl, 6) * 4 + (it.cert ? 4 : 0) + Math.random() * 14 + bonus;
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
const tlog = (msg, kind = '') => { S.tlog.push([kind, msg]); toast(msg, kind); };
function bAct(id, act) {
  const b = bById(id); if (!b || !b.open) return; const cm = modelById(b.modelId), t = tObj(b.temple), nm = cm.name;
  const white = ['live', 'review', 'special'].includes(act), grey = ['hoard', 'buyback', 'rumor'].includes(act);
  if ((white && b.actW === S.day) || (grey && b.actG === S.day)) { toast('วันนี้ทำกิจกรรมแบบนี้กับรุ่นนี้ไปแล้ว', 'bad'); return; }
  const tr = d => { S.trust[t.id] = clamp(tTrust(t.id) + d, 0, 100); };
  if (act === 'live') { b.actW = S.day; save(); LIVE = { bid: id, i: 0, pts: 0, fb: '', seen: [] }; nextLiveQ(); openModal(liveHTML()); return; }
  if (act === 'review') { const c = reviewCost(t); if (S.money < c) return; S.money -= c; b.hype += 15; tr(1); b.actW = S.day; tlog(`จ้างเพจ "${pick(Math.random, PAGES)}" รีวิว ${nm} • กระแส +15`, 'good'); }
  if (act === 'special') {
    if (b.special || b.done || S.money < SPECIAL_COST) return; const rev = Math.round(99 * b.unit * 8 * .7);
    S.money += rev - SPECIAL_COST; b.special = true; b.hype += 10; tr(3); b.actW = S.day;
    tlog(`รุ่นพิเศษเนื้อทองคำ 99 องค์ถูกจองหมดในวันเดียว รายได้ ${fmt(rev)} (ทุน ${fmt(SPECIAL_COST)}) • กระแสทั้งรุ่น +10`, 'good');
  }
  if (act === 'hoard') { if (b.done) return; b.hoard = S.day; b.mp = Math.round(b.mp * 1.08); b.heat += 5; tr(-6); b.actG = S.day; tlog(`กั๊กของ ${nm} ไว้ ราคาตลาด +8% • heat +5`); }
  if (act === 'buyback') { const n = buyN(b), c = n * Math.round(b.mp); if (S.money < c) return; S.money -= c; b.stock += n; b.mp = Math.round(b.mp * 1.15); b.heat += 15; tr(-6); b.actG = S.day; tlog(`ซื้อคืน ${nm} ${n} องค์ (${fmt(c)}) เข้าสต็อก ราคาตลาด +15% • heat +15`); }
  if (act === 'rumor') { b.hype += 20; b.heat += 20; tr(-6); b.actG = S.day; tlog(`ปล่อยข่าวเกินจริงเรื่อง ${nm} • กระแส +20 heat +20`); }
  if (act === 'code') {
    if (b.coded || S.money < 50000) return; S.money -= 50000; b.coded = true; cm.spec.code = 'stamp';
    for (const it of S.inv) if (it.modelId === cm.id && it.genuine) { it.spec = { ...it.spec, code: 'stamp' }; THUMB.delete('i:' + it.id); }
    THUMB.delete('m:' + cm.id); lastShown = null; tlog(`ตอกโค้ดกำกับองค์ ${nm} แล้ว ของเก๊จะทำเลียนแบบยากขึ้น`, 'good');
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
  LIVE.done = { viewers, book, rev }; syncPrice(b);
  S.tlog.push(['good', `ไลฟ์สดขาย ${modelById(b.modelId).name}: คนดู ${viewers.toLocaleString()} คน ยอดจอง ${book} องค์ รายได้ ${fmt(rev)} กระแส +${LIVE.pts}`]); openModal(liveHTML()); render();
}
function sellStock(id, n) {
  const b = S.batches.find(x => x.id === id); n = Math.min(+n, b ? b.stock : 0); if (!b || !b.open || n <= 0) return;
  const p = Math.round(b.mp), cm = modelById(b.modelId); S.money += n * p; b.stock -= n; b.mp = Math.round(b.mp * Math.max(.85, 1 - .004 * n)); syncPrice(b);
  tlog(`ขาย ${cm.name} จากสต็อก ${n} องค์ ได้ ${fmt(n * p)}`, 'good'); reModal(templeHTML()); render();
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
  S.tlog.push(['gold', `สั่งจัดสร้าง ${fullName(nick, t, TF.shape)} ${TF.qty.toLocaleString()} องค์ ที่${t.name} (เสร็จวันที่ ${S.day + 3})${found.length ? ` • ค้นพบ${found.map(R => R.name).join(', ')}` : ''}`]);
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
// เริ่มเกมใหม่ (ฉากจบ/ฉายาเก็บไว้ใน META ของ karma.js จึงไม่หาย)
function restartGame() { const mute = S.mute; S = newGame(); S.mute = mute; normTemple(); normEndgame(S); normKarma(S); genQueue(); S.queue.unshift(...tutCustomers()); V.cmp = false; mode = 'shop'; spot = null; ownItem = null; lastShown = null; closeModal(); render(); }
function menuHTML() {
  return `<h2>เมนู</h2>${dailyBtnHTML()}<button class="btn dailyb goalb" data-eg="goals">เป้าหมาย<small>${lvl() >= 6 ? `${starTxt(stars()) || '★0'} • ตำนาน ${legendsOwned()}/5` : 'ดวล ประมูล ตำนาน สาขา พิพิธภัณฑ์ สมาคม'}${aucToday() ? ' • วันนี้มีงานประมูล!' : ''}</small></button><div class="row"><button class="btn" id="donateBtn">ทำบุญ ถวายวัด<small>บุญ ${S.merit} • กรรม ${S.karma}</small></button><button class="btn" id="endBookBtn">สมุดฉากจบ</button>${S.rumor.on ? '<button class="btn no" id="rumorBtn">แก้ข่าวลือ</button>' : ''}</div>${titles().length ? `<p class="note">ฉายาที่ปลดล็อก: ${esc(titles().join(', '))}</p>` : ''}<h3>สถิติ</h3><p>รับเช่า ${S.stats.bought} องค์ • ปล่อยเช่า ${S.stats.sold} องค์ • โดนของเก๊ ${S.stats.fooled} ครั้ง • ชี้จุดเก๊ถูก ${S.stats.spotted} ครั้ง • XP ${S.xp}</p>
  ${S.loan.amt ? `<h3>หนี้เฮียโรงรับจำนำ</h3><p>คงเหลือ <b class="debtc">${fmt(S.loan.amt)}</b> • ดอกเบี้ย 3% ต่อวัน • ${loanLeftDays() > 0 ? `อีก ${loanLeftDays()} วันจะโดนยึดพระ` : 'ครบกำหนดแล้ว ปิดร้านวันนี้จะโดนยึดพระ'}</p>
  <div class="row"><button class="btn ok" id="repayBtn" ${S.money <= 0 ? 'disabled' : ''}>คืนเงิน ${fmt(Math.max(0, Math.min(S.money, S.loan.amt)))}${S.money < S.loan.amt ? '<small>(คืนได้เท่าที่มี)</small>' : ''}</button></div>` : ''}
  <div class="row"><button class="btn" id="toolShopBtn">ร้านอุปกรณ์เซียน</button><button class="btn" id="soundBtn" aria-pressed="${!S.mute}">เสียงประกอบ: ${S.mute ? 'ปิด' : 'เปิด'}</button><button class="btn" id="howBtn">วิธีเล่น</button><button class="btn" id="tutBtn">ดูบทเรียนอีกครั้ง</button><button class="btn no" id="resetBtn">เริ่มเกมใหม่</button></div>`;
}
const HOW = `<h2>ยินดีต้อนรับสู่แผงพระของคุณ</h2>
<ul class="log"><li>ลูกค้าจะนำพระมาเสนอให้เช่า ลากเพื่อหมุนองค์พระได้รอบ 360° ดูทั้งด้านหน้า ด้านหลัง และขอบข้าง</li>
<li>กด <b>เทียบ</b> เพื่อดูคู่กับองค์ครู (ของแท้) หมุนพร้อมกัน ใช้ <b>เช็กลิสต์</b> ติ๊กทีละจุด และ <b>ถามอาจารย์</b> ได้วันละ 3 ครั้ง (ครั้งต่อไปมีค่าครู)</li>
<li>พระมีหลายหมวด: พระเครื่อง เหรียญ พระกริ่ง และเครื่องรางอย่างตะกรุด เบี้ยแก้ บางชิ้นต้องกด <b>เขย่า</b> ฟังเสียง บางชิ้นใส่กรอบมา ต้อง <b>ถอดกรอบ</b> ก่อนดูขอบ</li>
<li>ระวังลูกค้าอ้าง <b>พิมพ์นิยม</b> เกินจริง (ไม่ใช่ของเก๊ แต่ถ้าเชื่อจะจ่ายแพงเกิน) ดูตำหนิพิมพ์ย่อยในสมุด</li>
<li>เปิด <b>สมุด</b> (แท็บล่าง) เทียบกับองค์ครู: ปางพระหัตถ์ พระเกศ จำนวนกลีบบัว ฐานชั้น ด้านหลัง ความหนา และผิวเนื้อ ของเก๊จะผิดอย่างน้อย 1 จุด</li>
<li>กด <b>ส่อง</b> เพื่อซูมดูผิวใกล้ ๆ เหมือนใช้กล้องส่องพระ (ซูมแล้วลากสองนิ้ว หรือ Shift+ลาก เพื่อเลื่อนดู)</li>
<li>ถ้ากด <b>ไม่เอา</b> ให้แตะจุดที่คิดว่าผิดบนองค์พระ (หรือเลือกจากรายการ) ถ้าองค์นั้นเก๊และชี้ถูก ได้ +20 XP ทันที</li>
<li><b>ต่อราคา</b> ได้ แต่ถ้าต่อมากไปลูกค้าจะเดินหนี รับเช่าแล้วไปที่ <b>ตู้พระ</b> เพื่อส่งตรวจหรือปล่อยเช่าทำกำไร</li>
<li>เงินไม่พอ? กด <b>รับเช่า</b> แล้วเลือกได้: <b>รับฝากขาย</b> (ไม่ต้องจ่าย ขายได้ค่อยจ่ายเจ้าของ ภายใน 5 วัน), <b>เทิร์นพระ</b> ในตู้ (85% ของราคาวันนั้น), <b>ชวนเซียนลงหุ้น</b> ครึ่งหนึ่ง (Lv.2) หรือ <b>ยืมเฮียโรงรับจำนำ</b> (ดอก 3% ต่อวัน คืนใน 10 วัน คืนได้ในเมนู ≡) • ปล่อยเช่าของเก๊ที่รับฝากขายจะเสียชื่อเสียงหนัก</li>
<li>ซื้อ <b>กล้องส่อง 20x</b>, <b>ไฟฉาย UV</b> และ <b>ตาชั่ง</b> ได้ที่ร้านอุปกรณ์เซียน (ในเมนู ≡ หรือสมุด) ไว้จับ "เก๊เทพ" ที่โผล่มาตั้งแต่ Lv.3</li>
<li><b>ส่องพระประจำวัน</b> (ในเมนู ≡): 5 องค์ชุดเดียวกันทุกคน ตอบแค่แท้/เก๊ จับเวลา แล้วคัดลอกผลไปแชร์ เล่นได้วันละครั้ง</li>
<li>ตั้งแต่ Lv.4 มี <b>ดวลส่องพระ</b> กับเซียนคู่แข่งวันละครั้ง และ <b>งานประมูล</b> ทุก 5 วัน • ถึง Lv.6 XP ที่เกินจะกลายเป็น <b>ดาวบารมี</b> และเปิดการตามล่าพระในตำนาน สาขา พิพิธภัณฑ์ และสมาคม ดูความคืบหน้าทั้งหมดใน <b>เมนู ≡ → เป้าหมาย</b></li>
<li><b>บุญ</b> และ <b>กรรม</b> (มุมบนจอ): ทำบุญ ช่วยลูกค้าที่โดนหลอก และบอกผู้ซื้อตามจริงเพิ่มบุญ ส่วนทางเลือก <b>สายเทา</b> (แต่งผิวแล้วไม่บอก ติดสินบนกรรมการ จ้างหน้าม้า ปล่อยข่าวโจมตี) ได้เร็วแต่เพิ่มกรรม เสี่ยงโดนแฉและโดนหน่วยปราบพระปลอมเข้าตรวจ • ระวังใบรับรองปลอม และตรวจรับของทุกครั้งก่อนจ่ายเงิน</li>
<li>เกมมีหลายฉากจบ ดูที่ปลดล็อกแล้วใน <b>สมุดฉากจบ</b> (เมนู ≡)</li>
<li>สะสม XP ไต่ระดับ: Lv.3 ปลดล็อกงานประกวดพระ, Lv.5 ปลดล็อกการจัดสร้างพระกับวัด</li>
<li><b>จัดสร้างพระ</b> (Lv.5): เลือกวัดและพิมพ์ ใส่มวลสาร ตั้งชื่อรุ่นเอง และเก็บสต็อกไว้ขายเองได้ ลองผสมมวลสารหลาย ๆ แบบ อาจเจอตำรับลับ • มวลสารเทียมถูกแต่เสี่ยง</li>
<li>หลังสร้างเสร็จ ดูแล <b>กระแส</b> ด้วยไลฟ์สด จ้างเพจรีวิว ทำรุ่นพิเศษ หรือส่งเข้าประกวด ส่วน <b>สายเทา</b> (กั๊กของ ซื้อคืน ปล่อยข่าว) ดันราคาได้เร็ว แต่เพิ่ม heat ถ้าโดนแฉจะเสียหายหนักและวัดเลิกไว้ใจ • กระแสแรงเกินไปนาน ๆ ระวังฟองสบู่ และของเก๊รุ่นคุณจะเริ่มระบาด (ตอกโค้ดกำกับองค์ช่วยได้)</li></ul>
<p class="note">พระ วัด ราคา และจุดสังเกตทั้งหมดในเกมเป็นเรื่องสมมติ ไม่ได้อ้างอิงพระเครื่องจริง</p>
<div class="row"><button class="btn ok" data-close>เริ่มเปิดร้าน</button><button class="btn" id="dailyBtn">ลองส่องพระประจำวัน</button></div>`;

/* ================= event wiring ================= */
$('#act').addEventListener('click', e => {
  const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
  if (a.startsWith('eg:')) { modeAct(a.slice(3)); return; }
  if (a.startsWith('k:')) { kAct(a.slice(2)); return; }
  ({ book: () => openModal(bookHTML()), flip, loupe: toggleLoupe, uv: toggleUV, cmp: toggleCmp, framesvc: () => openModal(frameSvcHTML()), dyes: () => dailyAnswer(true), dno: () => dailyAnswer(false), dnext: dailyNext, dexit: toShop, nego: negotiate, buy, pass, inv: () => openModal(invHTML()), end: endDay,
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
  if (e.target.closest('#enterCB')) { const ids = [...$('#mbody').querySelectorAll('.pick input:checked')].map(i => i.value); if (!ids.length) return toast('เลือกพระอย่างน้อย 1 องค์', 'bad'); confirmGrey('ติดสินบนกรรมการประกวด', `จ่ายเพิ่ม ${fmt(BRIBE_COST)} ให้กรรมการ คะแนนพระของคุณ +15 แต่กรรม +20 และอาจโดนแฉ`, () => { closeModal(); runContest(ids, true); }); }
  if (e.target.id === 'makeB') makeBatch();
  const stp = e.target.closest('[data-step]'); if (stp && !stp.disabled) { TF.step = +stp.dataset.step; reModal(templeHTML()); return; }
  if (e.target.id === 'diceBtn') { const n = randomNick(); const inp = $('#nick'); if (inp) inp.value = n; onNick(n); return; }
  if (e.target.id === 'tWiz') { TF.view = 'wiz'; openModal(templeHTML()); return; }
  if (e.target.id === 'tList' || e.target.id === 'tBack') { TF.view = ''; openModal(templeHTML()); return; }
  const ba = e.target.closest('[data-bact]'); if (ba) { if (!ba.disabled) { const [bid, act] = ba.dataset.bact.split(':'); bAct(bid, act); } return; }
  const lv = e.target.closest('[data-live]'); if (lv) { liveAns(lv.dataset.live); return; }
  const skb = e.target.closest('[data-stock]'); if (skb) { const [bid, n] = skb.dataset.stock.split(':'); sellStock(bid, n); return; }
  if (e.target.id === 'recipeBtn') { openModal(recipeHTML()); return; }
  const bc = e.target.closest('[data-bkcat]'); if (bc) { BK.cat = bc.dataset.bkcat; reModal(bookHTML()); return; }
  const bo = e.target.closest('[data-bkopen]'); if (bo) { BK.open = BK.open === bo.dataset.bkopen ? null : bo.dataset.bkopen; reModal(bookHTML()); return; }
  const fb = e.target.closest('[data-frame]'); if (fb) { if (!fb.disabled) doFrame(fb.dataset.frame); return; }
  if (e.target.id === 'bookBack') { openModal(bookHTML()); return; }
  if (e.target.id === 'howBtn') openModal(HOW);
  if (e.target.id === 'tutBtn') { restartTut(); return; }
  if (e.target.id === 'soundBtn') { S.mute = !S.mute; save(); openModal(menuHTML()); sfx('buy'); }
  if (e.target.id === 'resetBtn') openModal(`<h2>เริ่มเกมใหม่?</h2><p>เงิน เลเวล และพระในตู้ทั้งหมดจะหายไป</p><div class="row"><button class="btn dim" data-close>ยกเลิก</button><button class="btn no" id="resetYes">ยืนยัน เริ่มใหม่</button></div>`);
  if (e.target.id === 'resetYes') restartGame();
});
$('#mbody').addEventListener('change', e => {
  const bf = e.target.dataset.bkf; if (bf) { BK[bf] = e.target.value; const l = $('#bkList'); if (l) { l.innerHTML = bookList(); fillThumbs(l); } return; }
  const k = e.target.dataset.tf; if (k) { if (k === 'seq') setSeq(e.target.value); else TF[k] = k === 'qty' || k === 'keep' ? +e.target.value : e.target.value; if (k === 'seq' && !e.target.value) TF.seq = ''; reModal(templeHTML()); }
  const ig = e.target.dataset.ing; if (ig) { if (e.target.checked) { if (pickedIng().length >= maxIngr()) { toast(`เลือกมวลสารได้สูงสุด ${maxIngr()} อย่าง`, 'bad'); } else TF.ing[ig] = 'real'; } else { const { [ig]: _, ...rest } = TF.ing; TF.ing = rest; } reModal(templeHTML()); }
  const igf = e.target.dataset.ingf; if (igf) { TF.ing[igf] = e.target.checked ? 'fake' : 'real'; reModal(templeHTML()); }
  if (e.target.matches('.pick input')) { const on = $('#mbody').querySelectorAll('.pick input:checked'); if (on.length > 3) { e.target.checked = false; toast('ส่งได้สูงสุด 3 องค์', 'bad'); } }
});
$('#menuBtn').onclick = () => openModal(menuHTML());
$('#mbody').addEventListener('input', e => {
  if (e.target.id === 'nick') onNick(e.target.value);
  if (e.target.id === 'bkq') { BK.q = e.target.value; const l = $('#bkList'); if (l) { l.innerHTML = bookList(); fillThumbs(l); } }
});
$('#chips').addEventListener('click', e => {
  if (e.target.closest('#clBtn')) { CL.open = !CL.open; renderChips(); }
  if (e.target.closest('#askBtn')) askTeacher();
  if (e.target.closest('#shakeBtn')) shakePiece();
  if (e.target.closest('#certBtn')) checkCert();
  if (e.target.closest('#dressBtn')) dressPiece();
  if (e.target.closest('#frameBtn')) toggleFrame();
  checkTut();
});
$('#clp').addEventListener('click', e => {
  if (e.target.id === 'clClose') { CL.open = false; renderChips(); return; }
  const b = e.target.closest('[data-cl]'); if (!b) return; const [k, v] = b.dataset.cl.split(':');
  if (CL.marks[k] === v) { const { [k]: _, ...rest } = CL.marks; CL.marks = rest; } else CL.marks[k] = v; renderChips(); checkTut();
});
document.addEventListener('click', e => { const eg = e.target.closest('[data-eg]'); if (eg && !eg.disabled) { egClick(eg); return; } });
document.addEventListener('click', e => {
  const kb = e.target.closest('[data-k]'); if (kb && !kb.disabled) { kClick(kb); return; }
  if (e.target.closest('#rumorBtn')) openModal(rumorHTML());
  if (e.target.closest('#donateBtn')) openModal(donateHTML());
  if (e.target.closest('#endBookBtn')) openModal(endingBookHTML());
});
document.addEventListener('click', e => { if (e.target.id === 'tutSkip') { S.tut.on = false; save(); checkTut(); toast('ข้ามบทเรียนแล้ว เปิดดูใหม่ได้จากเมนู ≡'); } });
$('#spotbar').addEventListener('click', e => {
  if (e.target.id === 'spotSkip' && spotting() && !spot.busy) finishPass(S.queue[0]);
  if (e.target.id === 'spotList' && spotting() && !spot.busy) openModal(spotListHTML());
});

/* ================= debug (#debug เท่านั้น) ================= */
// แผงทดสอบ: แสดงเฉพาะเมื่อ URL มี #debug ไม่สร้าง element เลยถ้าไม่มี
const DEBUG_ACTS = {
  money: ['+฿1,000,000', () => { S.money += 1e6; }],
  xp: ['+1,000 XP', () => { gainXP(1000); }],
  rep: ['+20 ชื่อเสียง', () => { S.rep = Math.min(100, S.rep + 20); }],
  day: ['ข้ามวัน', () => { closeModal(); endDay(); }],
  merit: ['+50 บุญ', () => { addMerit(50); }],
  karma: ['+50 กรรม', () => { addKarma(50); }],
  star: ['+5,000 XP', () => { gainXP(5000); }],
  clue: ['+1 เบาะแส', () => { const t = addClue('โหมดทดสอบ'); toast(t || 'ยังไม่ถึง Lv.6 หรือเบาะแสครบแล้ว'); }],
  auc: ['เปิดงานประมูลวันนี้', () => { S.auction.force = S.day; S.auction.day = 0; }],
  duel: ['รีเซ็ตดวลวันนี้', () => { S.duel.day = 0; }],
  daily: ['รีเซ็ตส่องพระประจำวัน', () => { D = {}; saveD(); DS = null; if (mode === 'daily') { mode = 'shop'; lastShown = null; } toast('รีเซ็ตส่องพระประจำวันแล้ว'); }],
};
function syncDebug() {
  const on = /(^|[#&])debug\b/.test(location.hash.slice(1)) || location.hash === '#debug';
  let el = $('#dbg');
  if (!on) { if (el) el.remove(); return; }
  if (el) return;
  el = document.createElement('div'); el.id = 'dbg'; el.className = 'dbg';
  el.innerHTML = `<button class="dbt" data-dbg="toggle" aria-expanded="false">DEBUG</button><div class="dbb" hidden>${Object.entries(DEBUG_ACTS).map(([k, [n]]) => `<button data-dbg="${k}">${n}</button>`).join('')}</div>`;
  el.addEventListener('click', e => {
    const k = e.target.closest('[data-dbg]')?.dataset.dbg; if (!k) return;
    if (k === 'toggle') { const b = el.querySelector('.dbb'); b.hidden = !b.hidden; e.target.setAttribute('aria-expanded', String(!b.hidden)); return; }
    DEBUG_ACTS[k][1](); save(); render();
  });
  document.body.appendChild(el);
}
addEventListener('hashchange', syncDebug); syncDebug();

resize(); render(); frame();
if (!S.seen) { S.seen = true; save(); openModal(HOW); }
