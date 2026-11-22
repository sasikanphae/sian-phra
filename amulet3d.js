// แยกจาก game.js (เฟส 2) — ดูโครงสร้างใน CLAUDE.md
import * as THREE from './three.module.min.js';
import { $, clamp, lerp, rng, hash, fmt, pick, esc, round100, wpick, inPoly, mk } from './util.js';
import { isCoin, FRAMES, MATS, THW, TELLS, tellTxt, MODELS, LEVELS, UNLOCK, TEMPLES, PIMS, DW, mWeight, TOOLS, INGR, RECIPES, EVENTS, PAGES, LIVE_T, LIVE_Q, VIEWERS, LUCKY, NAME_A, NAME_B, ingrList, ingrKey, ingrTxt, mutIngr, UNIT, NAMES, HONEST, SLICK } from './data.js';
import { TW, TH, g, qb, OUT, outlinePts, inset, pathPts, dome, limb, slab, glyph, unalom, FIG, drawPidta, drawFigure, drawFront, drawBack, drawCode, boxBlur, noise, chan, makeFace } from './amulet2d.js';

/* ================= procedural amulet: 3D ================= */
const SIDE = {};
function sideTex(matId) {
  if (SIDE[matId]) return SIDE[matId];
  const mat = MATS[matId], c = mk(128, 128), x = c.getContext('2d'), r = rng(hash(matId));
  x.fillStyle = `rgb(${mat.base.map(v => v * .82 | 0)})`; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { const k = .55 + r() * .7; x.fillStyle = `rgba(${mat.base.map(v => clamp(v * k, 0, 255) | 0)},.5)`; x.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1 + r() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
  return SIDE[matId] = t;
}

// แคช geometry ที่ใช้ซ้ำ (plane หน้า/หลัง, ตัวองค์ตามรูปทรง, ชิ้นส่วนเครื่องราง) — disposeGroup จะไม่ทิ้งของที่แชร์
const GEO = new Map();
// มือถือ (จอสัมผัส) ใช้ mesh หน้า/หลังละเอียดน้อยลงเล็กน้อยให้ลื่นขึ้น
const LOW_SEG = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
function geo(key, make) { let g0 = GEO.get(key); if (!g0) { g0 = make(); g0.userData.shared = true; GEO.set(key, g0); } return g0; }
const V3 = (a, b, c) => new THREE.Vector3(a, b, c);
function canvasTex(w, h, draw, srgb = true) { const c = mk(w, h), x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
const rgb = a => `rgb(${a.map(v => clamp(Math.round(v), 0, 255)).join(',')})`;
function buildAmulet(m, spec, cond, seed, res = 1, opts = {}) {
  if (m.kind === 'kring') return buildKring(m, spec, seed);
  if (m.kind === 'takrut') return buildTakrut(m, spec, seed);
  if (m.kind === 'bia') return buildBia(m, spec, seed);
  const grp = new THREE.Group(), mat = MATS[m.mat], coin = isCoin(m.shape);
  const thick = coin ? .055 : THW[spec.thick || 'mid'], edge = coin ? 'coin' : (spec.edge || 'cut');
  const shape = new THREE.Shape(outlinePts(m.shape).map(([x, y]) => new THREE.Vector2(x - .5, (.5 - y) * 1.25)));
  const bev = edge === 'cut' ? { s: .012, t: thick * .1, n: 1 } : edge === 'round' ? { s: .05, t: thick * .5, n: 8 } : { s: .012, t: thick * .3, n: 3 };
  const depth = Math.max(.002, thick - 2 * bev.t);
  const bg = geo(`body:${m.shape}:${thick}:${edge}`, () => { const g0 = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bev.s, bevelThickness: bev.t, bevelSegments: bev.n, curveSegments: 24 }); g0.translate(0, 0, -depth / 2); return g0; });
  const bodyMat = new THREE.MeshStandardMaterial({ map: sideTex(m.mat), roughness: mat.rough, metalness: mat.metal });
  const body = new THREE.Mesh(bg, bodyMat); body.userData.part = 'body'; grp.add(body);
  const topY = (.5 - Math.min(...outlinePts(m.shape).map(p => p[1]))) * 1.25, mid = outlinePts(m.shape).filter(([, y]) => Math.abs(y - .55) < .08);
  grp.userData = { shape: m.shape, pose: m.pose, kind: 'flat', thick, D: coin ? .03 : .045, topY, edgeX: Math.max(...mid.map(([x]) => x)) - .5 + bev.s * .6, resin: spec.resin === 'yes' };
  const D = coin ? .03 : .045, seg = Math.round((LOW_SEG ? 150 : 190) * res);
  const tex = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  for (const side of ['front', 'back']) {
    const f = makeFace(m, spec, cond, seed, res, side, D);
    const mm = new THREE.MeshStandardMaterial({ map: tex(f.color, 1), normalMap: tex(f.normal), displacementMap: tex(f.disp), displacementScale: D, alphaMap: tex(f.alpha), alphaTest: .5, roughness: mat.rough, metalness: mat.metal });
    const pm = new THREE.Mesh(geo('plane:' + seg, () => new THREE.PlaneGeometry(1, 1.25, seg, Math.round(seg * 1.25))), mm);
    pm.position.z = (side === 'front' ? 1 : -1) * (thick / 2 + .0008);
    if (side === 'back') pm.rotation.y = Math.PI;
    pm.userData.part = side; grp.add(pm);
  }
  if (coin) {
    const lm = new THREE.MeshStandardMaterial({ map: sideTex(m.mat), metalness: mat.metal, roughness: mat.rough + .08 });
    if (spec.loop === 'weld') {
      const t = new THREE.Mesh(geo('loopT', () => new THREE.TorusGeometry(.065, .016, 14, 40)), lm); t.position.y = topY + .075; t.userData.part = 'loop'; grp.add(t);
      const w = new THREE.Mesh(geo('loopW', () => new THREE.SphereGeometry(.03, 16, 12)), lm); w.scale.set(1.4, .8, .9); w.position.y = topY + .006; w.userData.part = 'loop'; grp.add(w);
    } else {
      const s = new THREE.Shape(); s.absarc(0, 0, .085, 0, Math.PI * 2); const hp = new THREE.Path(); hp.absarc(0, 0, .042, 0, Math.PI * 2, true); s.holes.push(hp);
      const lg = geo('loopC:' + thick, () => { const g0 = new THREE.ExtrudeGeometry(s, { depth: thick * .8, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 1, curveSegments: 24 }); g0.translate(0, 0, -thick * .4); return g0; }); const lmsh = new THREE.Mesh(lg, lm); lmsh.position.y = topY + .055; lmsh.userData.part = 'loop'; grp.add(lmsh);
    }
  }
  if (opts.frame && FRAMES[opts.frame]) addFrame(grp, m, opts.frame, thick);
  return grp;
}
// กรอบพระ: วงกรอบโลหะบังขอบและความหนา / อะคริลิกใสหุ้มทั้งองค์ (แตะผ่านได้แต่บังขอบ)
function addFrame(grp, m, fk, thick) {
  const F = FRAMES[fk], P = outlinePts(m.shape).map(([x, y]) => [x - .5, (.5 - y) * 1.25]), oy = -.0375;
  const sc = k => P.map(([x, y]) => new THREE.Vector2(x * k, (y - oy) * k + oy));
  const depth = thick + (F.glass ? .07 : .04);
  const gm = geo(`frame:${m.shape}:${F.glass ? 'g' : 'm'}:${thick}`, () => {
    const sh = new THREE.Shape(sc(F.glass ? 1.06 : 1.075)); if (!F.glass) sh.holes.push(new THREE.Path(sc(.955)));
    const g0 = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 2, curveSegments: 24 }); g0.translate(0, 0, -depth / 2); return g0;
  });
  const mt = F.glass ? new THREE.MeshStandardMaterial({ color: new THREE.Color(...F.col.map(v => v / 255)), transparent: true, opacity: .2, roughness: .05, metalness: 0, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(...F.col.map(v => v / 255)), metalness: F.metal, roughness: F.rough });
  const fm = new THREE.Mesh(gm, mt); fm.userData.part = 'frame'; if (F.glass) { fm.userData.see = true; fm.renderOrder = 5; } grp.add(fm); grp.userData.framed = fk;
}
/* ----- เครื่องรางทรง 3D: พระกริ่ง ตะกรุด เบี้ยแก้ (mesh มี userData.tells = จุดสังเกตที่แตะชี้ได้, grp.userData.kp = ตำแหน่งไฮไลต์) ----- */
const SPH = () => geo('sph', () => new THREE.SphereGeometry(1, 32, 20));
function kit(grp, mat) {
  return (g0, part, tells, pos, scl, rot, m2) => { const o = new THREE.Mesh(g0, m2 || mat); if (pos) o.position.copy(pos); if (scl) o.scale.set(...scl); if (rot) o.rotation.set(...rot); o.userData.part = part; if (tells) o.userData.tells = tells; grp.add(o); return o; };
}
function codeDisc(m, spec, seed, mat) {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = rgb(mat.base.map(v => v * .72)); x.fillRect(0, 0, w, h);
    const r = rng(seed + 31); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(0,0,0,${r() * .25})`; x.fillRect(r() * w, r() * h, 2, 2); }
    if (spec.kcode === 'stamp' || spec.kcode === 'wrong') {
      const wr = spec.kcode === 'wrong', rc = wr ? rng(seed) : rng(hash(m.id + ':kcode')), cx = w / 2 + (wr ? 34 : 0), cy = h / 2 + (wr ? -26 : 0);
      x.strokeStyle = rgb(mat.hi); x.lineWidth = 7; x.strokeRect(cx - 70, cy - 30, 140, 60);
      x.lineWidth = 6; x.lineCap = 'round'; for (let i = 0; i < 4; i++) { const gx = cx - 48 + i * 32; x.beginPath(); x.moveTo(gx - 8 + rc() * 6, cy - 16); x.quadraticCurveTo(gx + (rc() - .5) * 24, cy, gx + (rc() - .5) * 14, cy + 16); x.stroke(); }
    }
  });
}
function buildKring(m, spec, seed) {
  const grp = new THREE.Group(), mat = MATS[m.mat];
  const M = new THREE.MeshStandardMaterial({ map: sideTex(m.mat), roughness: mat.rough, metalness: mat.metal }), add = kit(grp, M);
  const prof = [[0, -.6], [.34, -.6], [.37, -.56], [.31, -.5], [.35, -.43], [.27, -.37], [0, -.37]].map(([a, b]) => new THREE.Vector2(a, b));
  add(geo('kr:base', () => new THREE.LatheGeometry(prof, 48)), 'kbase', ['kcode']);
  add(SPH(), 'kbody', null, V3(0, -.3, 0), [.32, .1, .23]);
  for (const k of [-1, 1]) add(SPH(), 'kbody', null, V3(k * .2, -.28, .06), [.09, .06, .09]);
  add(SPH(), 'kbody', null, V3(0, -.05, 0), [.18, .26, .14]);
  for (const k of [-1, 1]) add(geo('kr:arm', () => new THREE.CapsuleGeometry(.055, .2, 6, 12)), 'kbody', null, V3(k * .16, -.1, .06), null, [.3, 0, -k * .28]);
  add(geo('kr:lotus', () => new THREE.TorusGeometry(.33, .04, 10, 40)), 'kbase', ['kcode'], V3(0, -.38, 0), null, [Math.PI / 2, 0, 0]);
  add(SPH(), 'kbody', null, V3(0, -.22, .14), [.09, .05, .05]);
  add(SPH(), 'khead', ['flame'], V3(0, .3, 0), [.12, .135, .12]);
  add(SPH(), 'khead', ['flame'], V3(0, .43, 0), [.07, .05, .07]);
  const tall = spec.flame === 'tall', fh = tall ? .2 : .09;
  add(geo('kr:flame' + fh, () => new THREE.ConeGeometry(.032, fh, 16)), 'khead', ['flame'], V3(0, .47 + fh / 2, 0));
  const sw = spec.seam === 'thick' ? .022 : .005, SM = new THREE.MeshStandardMaterial({ map: sideTex(m.mat), roughness: mat.rough * .7, metalness: mat.metal, color: 0xfff2d8 });
  for (const k of [-1, 1]) { add(geo('kr:seam' + sw, () => new THREE.BoxGeometry(sw, .42, .03)), 'seam', ['seam'], V3(k * .182, -.03, 0), null, null, SM); add(geo('kr:seamh' + sw, () => new THREE.BoxGeometry(sw, .26, .03)), 'seam', ['seam'], V3(k * .12, .3, 0), null, null, SM); }
  const cd = new THREE.MeshStandardMaterial({ map: codeDisc(m, spec, seed, mat), roughness: mat.rough, metalness: mat.metal * .8 });
  add(geo('kr:disc', () => new THREE.CircleGeometry(.335, 48)), 'kbase', ['kcode'], V3(0, -.602, 0), null, [Math.PI / 2, 0, 0], cd);
  grp.userData = { kind: 'kring', resin: spec.resin === 'yes', kp: { kcode: [V3(0, -.62, 0), 0, Math.PI / 2], seam: [V3(.2, .05, 0), Math.PI / 2, 0], flame: [V3(0, .52, .08), 0, 0], rattle: [V3(0, 0, .2), 0, 0] } };
  return grp;
}
const CORD = { red: 0xb02020, black: 0x1c1a1a, white: 0xefece4, yellow: 0xe0b030 };
function buildTakrut(m, spec, seed) {
  const grp = new THREE.Group(), mat = MATS[m.mat];
  const body = canvasTex(512, 128, (x, w, h) => {
    x.fillStyle = rgb(mat.base); x.fillRect(0, 0, w, h); const r = rng(hash(m.id + ':yant'));
    x.strokeStyle = rgb(mat.dark); x.lineWidth = 3; x.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const gx = 24 + i * 34; x.beginPath(); x.arc(gx, 40, 6, 0, 7); x.moveTo(gx + 6, 40); x.quadraticCurveTo(gx + (r() - .5) * 30, 70, gx + (r() - .5) * 20, 100); x.stroke(); }
    const rp = rng(seed); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(0,0,0,${rp() * .2})`; x.fillRect(rp() * w, rp() * h, 3, 2); }
  });
  const M = new THREE.MeshStandardMaterial({ map: body, roughness: mat.rough, metalness: mat.metal, side: THREE.DoubleSide }), add = kit(grp, M);
  add(geo('tk:body', () => new THREE.CylinderGeometry(.11, .11, 1, 40, 1, true)), 'tbody', null, V3(0, 0, 0), null, [0, 0, Math.PI / 2]);
  const n = spec.turns || 5, end = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w) => {
    x.fillStyle = '#1a120c'; x.fillRect(0, 0, w, w); x.strokeStyle = rgb(mat.hi); x.lineWidth = Math.max(3, 60 / n); x.beginPath();
    for (let t = 0; t <= n * Math.PI * 2; t += .05) { const rr = 10 + t / (n * Math.PI * 2) * 112, px = w / 2 + Math.cos(t) * rr, py = w / 2 + Math.sin(t) * rr; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
  }), roughness: mat.rough, metalness: mat.metal * .6 });
  for (const k of [-1, 1]) add(geo('tk:end', () => new THREE.CircleGeometry(.11, 40)), 'tend', ['turns'], V3(k * .5, 0, 0), null, [0, k * Math.PI / 2, 0], end);
  const cm = new THREE.MeshStandardMaterial({ color: CORD[spec.cord] || CORD.red, roughness: .85 });
  for (let i = 0; i < 9; i++) add(geo('tk:ring', () => new THREE.TorusGeometry(.118, .017, 8, 36)), 'tcord', ['cord', 'braid'], V3(-.18 + i * .045, 0, 0), null, [0, Math.PI / 2, spec.braid === 'fish' ? (i % 2 ? .38 : -.38) : .38], cm);
  add(geo('tk:loop', () => new THREE.TorusGeometry(.1, .013, 8, 32)), 'tcord', ['cord', 'braid'], V3(0, .21, 0), null, null, cm);
  grp.userData = { kind: 'takrut', resin: spec.resin === 'yes', kp: { turns: [V3(.52, 0, 0), Math.PI / 2, 0], cord: [V3(0, 0, .14), 0, 0], braid: [V3(0, 0, .14), 0, 0] } };
  return grp;
}
const CHAN = { black: 0x1b1510, brown: 0x6a4020, red: 0x7a1810 };
function buildBia(m, spec, seed) {
  const grp = new THREE.Group(), mat = MATS[m.mat];
  const shell = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = rgb(mat.base); x.fillRect(0, 0, w, h); const r = rng(hash(m.id + ':spots')), rp = rng(seed);
    for (let i = 0; i < 70; i++) { const rr = i < 60 ? r : rp; x.fillStyle = `rgba(${120 + rr() * 50},${80 + rr() * 30},${40},${.35 + rr() * .4})`; x.beginPath(); x.arc(rr() * w, rr() * h, 3 + rr() * 9, 0, 7); x.fill(); }
  });
  const M = new THREE.MeshStandardMaterial({ map: shell, roughness: mat.rough, metalness: 0 }), add = kit(grp, M);
  add(SPH(), 'bshell', null, V3(0, 0, 0), [.3, .46, .2]);
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: .8 });
  add(geo('bi:slit', () => new THREE.BoxGeometry(.05, .7, .02)), 'bbottom', ['chan'], V3(0, 0, -.19), null, null, dark);
  for (let i = 0; i < 12; i++) for (const k of [-1, 1]) add(geo('bi:tooth', () => new THREE.BoxGeometry(.03, .018, .025)), 'bbottom', ['chan'], V3(k * .045, -.3 + i * .055, -.188), null, null, M);
  add(SPH(), 'bbottom', ['chan'], V3(0, 0, -.18), [.035, .3, .03], null, new THREE.MeshStandardMaterial({ color: CHAN[spec.chan] || CHAN.black, roughness: .35 }));
  const wm = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: .9 }), ell = y => Math.sqrt(Math.max(0, 1 - (y / .46) ** 2));
  const tube = (key, pts) => geo(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, key.endsWith('c')), 120, .011, 6, key.endsWith('c')));
  if (spec.wrap === 'spiral') add(tube('bi:sp', Array.from({ length: 160 }, (_, i) => { const y = -.42 + i / 159 * .84, a = i / 159 * Math.PI * 12, e = ell(y); return V3(Math.cos(a) * .305 * e, y, Math.sin(a) * .205 * e); })), 'bwrap', ['wrap']);
  else {
    for (let j = 0; j < 7; j++) { const y = -.36 + j * .12, e = ell(y); add(tube('bi:r' + j + 'c', Array.from({ length: 32 }, (_, i) => { const a = i / 32 * Math.PI * 2; return V3(Math.cos(a) * .305 * e, y, Math.sin(a) * .205 * e); })), 'bwrap', ['wrap']); }
    for (let j = 0; j < 6; j++) { const a0 = j / 6 * Math.PI * 2; add(tube('bi:m' + j, Array.from({ length: 40 }, (_, i) => { const y = -.44 + i / 39 * .88, e = ell(y); return V3(Math.cos(a0) * .305 * e, y, Math.sin(a0) * .205 * e); })), 'bwrap', ['wrap']); }
  }
  add(geo('bi:loop', () => new THREE.TorusGeometry(.07, .014, 8, 28)), 'bwrap', ['wrap'], V3(0, .5, 0), null, null, wm);
  grp.children.filter(o => o.userData.part === 'bwrap').forEach(o => { o.material = wm; });
  grp.userData = { kind: 'bia', resin: false, kp: { chan: [V3(0, 0, -.24), Math.PI, 0], wrap: [V3(0, .12, .22), 0, 0], mercury: [V3(0, 0, .24), 0, 0] } };
  return grp;
}
function disposeGroup(grp) {
  grp.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); if (o.material) { for (const k of ['map', 'normalMap', 'displacementMap', 'alphaMap']) { const t = o.material[k]; if (t && !Object.values(SIDE).includes(t)) t.dispose(); } o.material.dispose(); } });
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

export { GEO, geo, addFrame, buildKring, buildTakrut, buildBia, SIDE, sideTex, buildAmulet, disposeGroup, makeEnv, setupScene, makeRenderer };
