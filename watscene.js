// เฟส 9: ฉากวัดในอุปถัมภ์แบบ 3D มุมเฉียง (isometric) — ใช้ WebGLRenderer ตัวหลักของ game.js (สลับ scene/camera) ไม่สร้าง context ใหม่
// อาคาร ต้นไม้ คน สร้างด้วยโค้ดทั้งหมด (low-poly) สไตล์ของเกมนี้เอง ไม่ใช้ภาพหรือ asset จากที่อื่น
import * as THREE from './three.module.min.js';
import { clamp, rng } from './util.js';

/* ===== วัสดุ/geometry ที่ใช้ซ้ำ (dispose ตอนออกจากฉาก) ===== */
let MAT = null, GEO = null;
const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
function initRes() {
  MAT = {
    grass: lam(0x6fae4f), grass2: lam(0x5f9c44), path: lam(0xd8cfbf), river: lam(0x3f8fb8, { transparent: true, opacity: .92 }), bank: lam(0xb59a6a),
    roof: lam(0xd2512c), roof2: lam(0xb83f22), trim: lam(0x2e8a5a), gold: lam(0xe3b23c, { emissive: 0x3a2400 }), white: lam(0xf4efe6), cream: lam(0xe7dcc6),
    wall: lam(0xf6f1e8), wood: lam(0x8a5a32), wood2: lam(0x6b4325), dark: lam(0x2a211b), win: new THREE.MeshBasicMaterial({ color: 0x3a2a20 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0x6b5a40 }), trunk: lam(0x7a5a3c), leaf: lam(0x3f8a3a), leaf2: lam(0x2f7a34), palm: lam(0x5a9a3a),
    flower: lam(0xfff1e0), flower2: lam(0xf6b7c8), bamboo: lam(0xc9a55a), boat: lam(0x7a4a26), red: lam(0xc8322a), blue: lam(0x3b6fc4), stripe: lam(0xf2d24a),
    water: lam(0x8fd3ff, { transparent: true, opacity: .7 }), fire: new THREE.MeshBasicMaterial({ color: 0xffc35a }),
  };
  GEO = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(.5, .5, 1, 8), cone: new THREE.ConeGeometry(.5, 1, 6), ico: new THREE.IcosahedronGeometry(.5, 0), sph: new THREE.SphereGeometry(.5, 8, 6) };
}
const mesh = (g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; };
const box = (m, x, y, z, sx, sy, sz) => mesh(GEO.box, m, x, y + sy / 2, z, sx, sy, sz);
const cyl = (m, x, y, z, r, h) => mesh(GEO.cyl, m, x, y + h / 2, z, r * 2, h, r * 2);

/* ===== หลังคาทรงไทย: จั่วซ้อนชั้นสีส้มแดงขอบเขียว ช่อฟ้า ใบระกา หน้าบันสีทอง ===== */
function gable(w, h, d, m) {
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return new THREE.Mesh(g, m);
}
function thaiRoof(w, d, y, tiers = 2, big = true) {
  const g = new THREE.Group();
  for (let k = tiers - 1; k >= 0; k--) {
    const tw = w * (1 + .22 * k), td = d * (1 - .14 * k), th = (w * .55) * (1 - .1 * k), ty = y - k * .55;
    const edge = gable(tw + .4, th, td + .3, MAT.trim); edge.position.y = ty - .16; g.add(edge);
    const rf = gable(tw, th, td, k % 2 ? MAT.roof2 : MAT.roof); rf.position.y = ty; g.add(rf);
    if (k === 0) {
      for (const s of [1, -1]) {
        const tri = new THREE.Shape(); tri.moveTo(-tw * .36, 0); tri.lineTo(tw * .36, 0); tri.lineTo(0, th * .72); tri.closePath();
        const nb = new THREE.Mesh(new THREE.ShapeGeometry(tri), MAT.gold); nb.position.set(0, ty + .05, s * (td / 2 + .02)); if (s < 0) nb.rotation.y = Math.PI; g.add(nb);
        if (big) {
          const cf = mesh(GEO.cone, MAT.gold, 0, ty + th + .35, s * (td / 2 + .1), .22, .9, .22); cf.rotation.x = s * -.6; g.add(cf); // ช่อฟ้า
          for (const sx of [1, -1]) { // ใบระกาเรียงตามแนวจั่ว
            const len = Math.hypot(tw / 2, th), br = box(MAT.gold, 0, 0, 0, .14, .14, len); br.geometry = GEO.box; br.position.set(sx * tw / 4, ty + th / 2 + .1, s * (td / 2 + .08));
            br.rotation.set(0, Math.PI / 2, 0); br.rotateOnAxis(new THREE.Vector3(1, 0, 0), sx * s * Math.atan2(th, tw / 2)); br.scale.set(.14, .3, len); g.add(br);
          }
        }
      }
    }
  }
  return g;
}
// อาคารทรงไทย: ฐานบัว + เสาขาว + ผนัง + หน้าต่าง (เรืองแสงเทียนตอนเย็น/กลางคืน) + หลังคาซ้อนชั้น
function thaiHall(w, d, h, tiers, opt = {}) {
  const g = new THREE.Group(), base = opt.base ?? .6;
  g.add(box(MAT.cream, 0, 0, 0, w + .8, base * .5, d + .8)); g.add(box(MAT.white, 0, base * .5, 0, w + .4, base * .5, d + .4));
  g.add(box(opt.wall || MAT.wall, 0, base, 0, w, h, d));
  const cols = Math.max(2, Math.round(d / 2.2));
  for (let i = 0; i < cols; i++) for (const s of [1, -1]) g.add(cyl(MAT.white, s * (w / 2 + .15), base, -d / 2 + (i + .5) * d / cols, .13, h));
  const wins = [];
  for (let i = 0; i < cols; i++) for (const s of [1, -1]) { const wn = box(MAT.win, s * (w / 2 + .01), base + h * .3, -d / 2 + (i + .5) * d / cols, .05, h * .4, .5); wn.material = MAT.win; wins.push(wn); g.add(wn); }
  g.add(box(MAT.wood2, 0, base, d / 2 + .01, w * .28, h * .7, .06));
  const rf = thaiRoof(w * .92, d + .6, base + h, tiers, opt.big !== false); g.add(rf);
  g.userData.wins = wins; return g;
}
function chedi(r) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) g.add(box(MAT.white, 0, i * .45, 0, r * 2 * (1 - i * .15), .45, r * 2 * (1 - i * .15)));
  const bell = mesh(GEO.sph, MAT.white, 0, 1.35 + r * .55, 0, r * 1.5, r * 1.3, r * 1.5); g.add(bell);
  g.add(cyl(MAT.white, 0, 1.35 + r * 1.1, 0, r * .28, .5)); const sp = mesh(GEO.cone, MAT.gold, 0, 1.35 + r * 1.1 + .5 + r * .9, 0, r * .45, r * 1.8, r * .45); g.add(sp);
  return g;
}
function kuti() { const g = new THREE.Group(); for (const [x, z] of [[-1, -1.3], [1, -1.3], [-1, 1.3], [1, 1.3]]) g.add(cyl(MAT.wood2, x, 0, z, .1, .8)); g.add(box(MAT.wood, 0, .8, 0, 2.6, 1.4, 3.2)); const rf = gable(3.2, 1.2, 3.8, MAT.roof2); rf.position.y = 2.2; g.add(rf); g.add(box(MAT.win, 1.31, 1.2, 0, .04, .5, .6)); return g; }
function bellTower() { const g = new THREE.Group(); for (const [x, z] of [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]]) g.add(cyl(MAT.white, x, 0, z, .12, 3)); g.add(box(MAT.cream, 0, 0, 0, 2.2, .3, 2.2)); const rf = thaiRoof(1.9, 2.1, 3, 1, true); g.add(rf); const b = mesh(GEO.sph, MAT.gold, 0, 2.4, 0, .7, .8, .7); g.add(b); g.userData.bell = b; return g; }
function pier() { const g = new THREE.Group(); g.add(box(MAT.wood, 0, .1, 1.5, 3, .2, 4)); for (const [x, z] of [[-1.2, 0], [1.2, 0], [-1.2, 3], [1.2, 3]]) g.add(cyl(MAT.wood2, x, -1, z, .1, 3.3)); const rf = gable(3.2, 1, 2.4, MAT.roof); rf.position.set(0, 2.3, 2.2); g.add(rf); return g; }
function fair() {
  const g = new THREE.Group(), wh = new THREE.Group(); wh.position.set(5, 5, -1);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6, .12, 4, 18), MAT.red); wh.add(ring);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, sp = box(MAT.white, 0, 0, 0, .08, 3.6, .08); sp.position.set(Math.cos(a) * 1.8, Math.sin(a) * 1.8 - 1.8, 0); sp.rotation.z = a - Math.PI / 2; sp.position.y += 1.8; wh.add(sp); wh.add(box(i % 2 ? MAT.blue : MAT.stripe, Math.cos(a) * 3.6, Math.sin(a) * 3.6 - .3, 0, .6, .6, .6)); }
  g.add(wh); for (const s of [1, -1]) { const lg = box(MAT.white, 5 + s * 1.3, 0, -1, .15, 5.4, .15); lg.rotation.z = s * .25; g.add(lg); }
  for (let i = 0; i < 3; i++) { g.add(box(MAT.wood, -4 + i * 2.4, 0, 1, 2, 1.1, 1.4)); g.add(box(i % 2 ? MAT.red : MAT.stripe, -4 + i * 2.4, 1.6, 1, 2.2, .25, 1.6)); for (const [x, z] of [[-.9, .6], [.9, .6]]) g.add(cyl(MAT.wood2, -4 + i * 2.4 + x, 1.1, 1 + z, .05, .5)); }
  g.add(box(MAT.red, -2, 0, -4, 4, .9, 2.5)); g.add(box(MAT.gold, -2, .9, -5.1, 4, 2, .2));
  g.userData.wheel = wh; return g;
}
function scaffold(w, d, h) { const g = new THREE.Group(); for (let i = 0; i <= 3; i++) for (const s of [1, -1]) { g.add(cyl(MAT.bamboo, s * w / 2, 0, -d / 2 + i * d / 3, .06, h)); g.add(cyl(MAT.bamboo, -w / 2 + i * w / 3, 0, s * d / 2, .06, h)); } for (let k = 1; k <= 3; k++) { g.add(box(MAT.bamboo, 0, k * h / 4, d / 2, w, .07, .07)); g.add(box(MAT.bamboo, 0, k * h / 4, -d / 2, w, .07, .07)); g.add(box(MAT.bamboo, w / 2, k * h / 4, 0, .07, .07, d)); g.add(box(MAT.bamboo, -w / 2, k * h / 4, 0, .07, .07, d)); } g.add(box(MAT.cream, 0, 0, 0, w * .9, .6, d * .9)); return g; }

/* ===== ต้นไม้: ลีลาวดี มะพร้าว โพธิ์ (ใบไหวเล็กน้อย) ===== */
function tree(kind, r) {
  const g = new THREE.Group(), crown = new THREE.Group(); g.add(crown);
  if (kind === 'palm') { const t = cyl(MAT.trunk, 0, 0, 0, .14, 5); t.rotation.z = .08; g.add(t); crown.position.set(.3, 5, 0); for (let i = 0; i < 6; i++) { const f = mesh(GEO.cone, MAT.palm, 0, 0, 0, .35, 2.4, .12); f.rotation.set(0, i / 6 * Math.PI * 2, 1.9); f.translateY(1.1); crown.add(f); } }
  else if (kind === 'bodhi') { g.add(cyl(MAT.trunk, 0, 0, 0, .4, 2.4)); crown.position.y = 3.6; for (let i = 0; i < 6; i++) crown.add(mesh(GEO.ico, i % 2 ? MAT.leaf : MAT.leaf2, (r() - .5) * 3, (r() - .2) * 1.6, (r() - .5) * 3, 2.6, 2.2, 2.6)); }
  else { g.add(cyl(MAT.trunk, 0, 0, 0, .16, 1.6)); crown.position.y = 2; for (let i = 0; i < 4; i++) crown.add(mesh(GEO.ico, MAT.leaf2, (r() - .5) * 1.4, r() * .5, (r() - .5) * 1.4, 1.2, .9, 1.2)); for (let i = 0; i < 7; i++) crown.add(mesh(GEO.sph, i % 2 ? MAT.flower2 : MAT.flower, (r() - .5) * 1.6, .3 + r() * .5, (r() - .5) * 1.6, .25, .25, .25)); }
  g.userData.crown = crown; g.userData.ph = r() * 6; return g;
}

/* ===== ผังวัด: ตำแหน่งอาคารกำหนดไว้ (ฉากสวยเสมอ) ===== */
const SLOT = {
  ubosot: [0, -3, 0, 8, 12], salaS: [-9, -11, 0, 4, 5], sala: [9, -9, 0, 7, 9], kuti1: [-14, -7, 0, 3, 4], kuti2: [-14, -1.5, 0, 3, 4], kuti3: [-14, 4, 0, 3, 4],
  chedi: [8, 3, 0, 5, 5], hall: [-8, 6, 0, 5, 6], bell: [4, 8.5, 0, 2.5, 2.5], pier: [8, 15.2, 0, 3, 4], fair: [-2, -18, 0, 12, 6], school: [15, 0, Math.PI / 2, 4, 9],
};
const GROUND = 46, RIVER_Z = 16.5;
// เส้นทางเดิน (กลุ่มจุดบนพื้น) — ใช้ทั้งวาดทางเดินและให้คนเดินตาม
const PATHS = [[[0, 14], [0, 5.5]], [[-6.5, 5.5], [6.5, 5.5]], [[-6.5, 5.5], [-6.5, -11]], [[6.5, 5.5], [6.5, -11]], [[-6.5, -11], [6.5, -11]], [[-6.5, 0], [-12, 0]], [[-12, -7], [-12, 4]], [[6.5, -4], [13, -4]], [[6.5, 10.5], [8, 10.5]], [[8, 10.5], [8, 14]], [[0, -11], [0, -14]], [[-6.5, 9.5], [-3, 9.5]]];
const RING = [[0, 5.5], [6.5, 5.5], [6.5, -11], [-6.5, -11], [-6.5, 5.5]];

function buildGround(sc) {
  const g = new THREE.Group();
  g.add(box(MAT.grass, 0, -1, -4, GROUND, 1, GROUND - 8));
  for (let i = 0; i < 18; i++) { const r = rng(900 + i); g.add(box(MAT.grass2, (r() - .5) * 40, -.02, -20 + r() * 34, 2 + r() * 3, .03, 2 + r() * 3)); }
  for (const [[x1, z1], [x2, z2]] of PATHS) { const L = Math.hypot(x2 - x1, z2 - z1), p = box(MAT.path, (x1 + x2) / 2, -.0, (z1 + z2) / 2, 1.6, .06, L + 1.6); p.rotation.y = Math.atan2(x2 - x1, z2 - z1); g.add(p); }
  g.add(box(MAT.bank, 0, -1.4, RIVER_Z + 2, GROUND, 1, 6)); const rv = box(MAT.river, 0, -.55, RIVER_Z + 3, GROUND, .3, 6.5); g.add(rv);
  // กำแพงแก้ว + ซุ้มประตู
  for (const [x, z, sx, sz] of [[-11.5, 13, 21, .4], [11.5, 13, 21, .4]]) g.add(box(MAT.white, x, 0, z, sx, .9, sz));
  for (const s of [1, -1]) { g.add(box(MAT.white, s * 1.6, 0, 13, .7, 3, .7)); g.add(mesh(GEO.cone, MAT.gold, s * 1.6, 3.4, 13, .5, .9, .5)); }
  const gr = thaiRoof(3.2, 1.2, 3, 1, false); gr.position.z = 13; g.add(gr);
  // ซุ้มเช่าบูชาพระหน้าวัด
  g.add(box(MAT.wood, -4, 0, 10.8, 2.4, 1, 1.2)); g.add(box(MAT.red, -4, 1.8, 10.8, 2.8, .2, 1.6)); for (const s of [1, -1]) g.add(cyl(MAT.wood2, -4 + s * 1.2, 1, 11.4, .05, .8));
  // โคมไฟริมทาง
  const lamps = []; for (const [x, z] of [[1.3, 12], [-1.3, 12], [1.3, 8.5], [-1.3, 8.5], [7.5, 5.5], [-7.5, 5.5], [7.5, -11], [-7.5, -11]]) { g.add(cyl(MAT.dark, x, 0, z, .06, 1.6)); const l = mesh(GEO.sph, MAT.lamp, x, 1.75, z, .35, .4, .35); lamps.push(l); g.add(l); }
  sc.add(g); return { river: rv, lamps };
}
function buildTrees(sc, few) {
  const r = rng(4242), out = [];
  const spots = [['bodhi', -3, -16], ['bodhi', 16, 9], ['palm', -18, 12], ['palm', -16, 9.5], ['palm', 18, 12], ['palm', 13, 11.5], ['plum', -3, 7.5], ['plum', 3, 7.5], ['plum', -10, -3], ['plum', 11, -14], ['palm', -19, -14], ['plum', 3.5, -14], ['palm', 19, -6], ['plum', -18, -18]];
  for (const [k, x, z] of few ? spots.filter((_, i) => i % 2 === 0) : spots) { const t = tree(k, r); t.position.set(x, 0, z); sc.add(t); out.push(t); }
  return out;
}

/* ===== คน: InstancedMesh ตัว + หัว (ไม่เกิน 40) ===== */
const PT = { monk: [0xe8902a, 1], villager: [0x4f7ad8, 1], kid: [0xe85a7a, .7], elder: [0xf4f1ea, .95], tourist: [0x3fc0b0, 1], sian: [0x2f3550, 1], worker: [0xd9a23a, 1] };
const SKIN = new THREE.Color(0xc99a72), HEADM = new THREE.Color(0x9a7458);
function makePeople(sc, n) {
  const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22, .32, 1, 6), new THREE.MeshLambertMaterial({ flatShading: true }), n);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(.2, 6, 5), new THREE.MeshLambertMaterial({ flatShading: true }), n);
  body.instanceMatrix.setUsage(THREE.DynamicDrawUsage); head.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < n; i++) { body.setColorAt(i, new THREE.Color(0x888888)); head.setColorAt(i, SKIN); }
  body.userData.people = true; sc.add(body); sc.add(head); return { body, head };
}

/* ===== ฉาก ===== */
let W = null;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
function watEnter(R, opts) {
  watExit();
  initRes();
  const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 300);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x5a7a3a, 1.4), sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(20, 30, 12); sc.add(hemi, sun, sun.target);
  const fewer = !!opts.slow;
  const gnd = buildGround(sc), trees = buildTrees(sc, fewer), ppl = makePeople(sc, opts.maxPeople || 40);
  W = { R, sc, cam, hemi, sun, gnd, trees, ppl, opts, az: Math.PI / 4, azT: Math.PI / 4, zoom: opts.zoom || 1, zT: opts.zoom || 1, tgt: new THREE.Vector3(0, 0, -2), t: opts.t0 ?? .1, sig: '', bld: {}, people: [], extra: [], wins: [], fest: null, lastPhase: '' };
  W.boat = new THREE.Group(); W.boat.add(box(MAT.boat, 0, 0, 0, 3.2, .45, 1.1)); W.boat.add(box(MAT.wood, .6, .45, 0, 1.2, .6, .9)); W.boat.position.set(-12, -.45, RIVER_Z + 3); sc.add(W.boat);
  watSync(opts.state);
  return W;
}
function disposeAll(o) { o.traverse(x => { if (x.geometry && !Object.values(GEO || {}).includes(x.geometry)) x.geometry.dispose(); }); }
function watExit() {
  if (!W) return; disposeAll(W.sc); for (const m of Object.values(MAT)) m.dispose(); for (const g of Object.values(GEO)) g.dispose();
  W.ppl.body.material.dispose(); W.ppl.head.material.dispose(); W = null; MAT = GEO = null;
}
// วางอาคารตาม state: { built: {id: level}, building: {id, left}, fest, crowd, monks }
function watSync(st) {
  if (!W || !st) return; W.st = st; const sig = JSON.stringify([st.built, st.building && st.building.id, st.fest]);
  if (sig === W.sig) { spawnPeople(); return; } W.sig = sig;
  for (const g of Object.values(W.bld)) { W.sc.remove(g); disposeAll(g); } W.bld = {}; W.wins = []; W.bellM = null; W.wheel = null;
  const place = (id, g) => { const [x, z, ry] = SLOT[id]; g.position.set(x, 0, z); g.rotation.y = ry; W.sc.add(g); W.bld[id] = g; if (g.userData.wins) W.wins.push(...g.userData.wins); };
  const b = st.built;
  if (b.salaS) { const g = thaiHall(3.4, 4.2, 1.6, 1, { big: false, base: .4 }); place('salaS', g); }
  for (let k = 1; k <= 3; k++) if ((b.kuti || 0) >= k) place('kuti' + k, kuti());
  if (b.ubosot) place('ubosot', thaiHall(6.4, 10.5, 3.2, 3, { base: 1.1 }));
  if (b.sala) place('sala', thaiHall(6, 8, 2.4, 2, { base: .7 }));
  if (b.chedi) place('chedi', chedi(2.2));
  if (b.hall) place('hall', thaiHall(4.2, 5, 2.2, 2, { base: .6 }));
  if (b.bell) { const g = bellTower(); place('bell', g); W.bellM = g.userData.bell; }
  if (b.pier) place('pier', pier());
  if (b.fair) { const g = fair(); place('fair', g); W.wheel = g.userData.wheel; }
  if (b.school) place('school', thaiHall(3.4, 8.5, 1.8, 1, { big: false, base: .5 }));
  if (st.building) { const id = st.building.id === 'kuti' ? 'kuti' + Math.min(3, (b.kuti || 0) + 1) : st.building.id, [, , , sw, sd] = SLOT[id]; const sg = scaffold(sw, sd, 4); place(id, sg); }
  // ของประกอบเทศกาล
  for (const e of W.extra) { W.sc.remove(e); disposeAll(e); } W.extra = [];
  if (st.fest === 'loy') for (let i = 0; i < 12; i++) { const k = new THREE.Group(); k.add(mesh(GEO.cyl, MAT.leaf, 0, 0, 0, .7, .2, .7)); k.add(mesh(GEO.sph, MAT.fire, 0, .25, 0, .18, .25, .18)); k.position.set(-22 + i * 3.7, -.35, RIVER_Z + 1.5 + (i % 3) * 1.6); k.userData.drift = .5 + (i % 4) * .15; W.sc.add(k); W.extra.push(k); }
  if (st.fest === 'songkran' || st.fest === 'ordain') { const c = new THREE.Group(); c.add(box(MAT.gold, 0, 0, 0, 1, .5, 1.4)); c.add(st.fest === 'songkran' ? mesh(GEO.sph, MAT.gold, 0, .9, 0, .5, .8, .5) : mesh(GEO.cone, MAT.white, 0, .9, 0, .6, .9, .6)); c.userData.carry = 0; W.sc.add(c); W.extra.push(c); W.cart = c; } else W.cart = null;
  spawnPeople();
}

/* ===== กิจวัตรตามช่วงเวลา ===== */
const phaseOf = t => t < .22 ? 'morning' : t < .48 ? 'day' : t < .68 ? 'afternoon' : t < .84 ? 'evening' : 'night';
const PHASE_TH = { morning: 'เช้า', day: 'สาย', afternoon: 'บ่าย', evening: 'เย็น', night: 'กลางคืน' };
const off = (pts, r, j = .6) => pts.map(([x, z]) => [x + (r() - .5) * j, z + (r() - .5) * j]);
function routeFor(type, ph, r, i) {
  const st = W.st, b = st.built, extra = [];
  if (b.hall) extra.push([-6.5, 6], [-8, 9.2], [-6.5, 6]); if (b.chedi) extra.push([6.5, 3], [8, 6], [6.5, 3]); if (b.bell) extra.push([4, 5.5]);
  if (type === 'monk') {
    if (ph === 'morning') return { pts: [[-12, -7 + i * 1.2], [-12, 0], [-6.5, 0], [-6.5, 5.5], [0, 5.5], [0, 14], [0, 17.5], [8, 17.5], [8, 14], [8, 10.5], [6.5, 5.5], [6.5, -4], [13, -4]].map(([x, z]) => [x, z]), lag: i * 1.1, loop: false };
    if (ph === 'evening' && b.ubosot) return { pts: [[-12, -2 + i], [-6.5, 0], [-6.5, 5.5], [0, 5.5], [0, 3.6]], inside: true, lag: i * .8 };
    return { pts: off([[-12, -7], [-12, 4], [-6.5, 0], [-12, -2]], r, 1.5), loop: true, lag: i * 2 };
  }
  if (type === 'kid') return ph === 'afternoon' || ph === 'day' ? { pts: off([[-3, 8], [3, 9], [0, 10], [-2, 7.5], [2, 7]], r, 2), loop: true, run: true } : { pts: off([[0, 14], [0, 9], [-3, 9.5], [0, 14]], r), loop: true };
  if (type === 'worker') { const id = st.building && (st.building.id === 'kuti' ? 'kuti' + Math.min(3, (b.kuti || 0) + 1) : st.building.id), [x, z] = SLOT[id] || [0, 0]; return { pts: [[x - 2.5, z + 2.5], [x + 2.5, z + 2.5], [x + 2.5, z - 2.5]], loop: true }; }
  const v = [[0, 14], [0, 11], [-3.4, 10.3], [-3, 9.5], [0, 9], [0, 5.5], ...RING.slice(1), [0, 5.5], ...extra, [0, 12], [0, 14]];
  if (b.pier && r() < .4) v.unshift([8, 14.5], [8, 10.5], [6.5, 5.5]);
  return { pts: off(v, r), loop: true, lag: i * 1.7 };
}
function spawnPeople() {
  const st = W.st, ph = phaseOf(W.t), max = W.ppl.body.count, r = rng(Math.floor(W.t * 1000) + 7), list = [];
  const monks = Math.min(st.monks || 2, 12), crowd = ph === 'night' ? Math.ceil((st.crowd || 4) * .2) : st.crowd || 4;
  for (let i = 0; i < monks; i++) list.push(['monk', i]);
  if (st.building) for (let i = 0; i < 2; i++) list.push(['worker', i]);
  for (let i = 0; i < crowd && list.length < max; i++) list.push([wpickType(r, ph, st), i]);
  W.people = list.slice(0, max).map(([type, i]) => { const ro = routeFor(type, ph, r, i); return { type, ...ro, i: 0, x: ro.pts[0][0], z: ro.pts[0][1], wait: ro.lag || 0, sp: (ro.run ? 2.4 : 1.1) * (.85 + r() * .3), hide: false, ph: r() * 6 }; });
  W.lastPhase = ph; colorPeople();
}
function wpickType(r, ph, st) {
  const x = r(); if (ph === 'afternoon' && x < .35) return 'kid';
  if (x < .12) return 'kid'; if (x < .32) return 'elder'; if (x < .45) return st.sian ? 'sian' : 'villager'; if (x < .6) return 'tourist'; return 'villager';
}
function colorPeople() {
  const { body, head } = W.ppl, c = new THREE.Color();
  for (let i = 0; i < body.count; i++) { const p = W.people[i]; if (!p) continue; const [col] = PT[p.type]; c.setHex(col); if (p.type === 'villager') c.offsetHSL((i * .13) % 1, 0, 0); body.setColorAt(i, c); head.setColorAt(i, p.type === 'monk' ? HEADM : SKIN); }
  body.instanceColor.needsUpdate = head.instanceColor.needsUpdate = true;
}
function movePeople(dt) {
  const { body, head } = W.ppl, now = performance.now() / 1000;
  for (let i = 0; i < body.count; i++) {
    const p = W.people[i];
    if (!p || p.hide) { M4.makeScale(0, 0, 0); body.setMatrixAt(i, M4); head.setMatrixAt(i, M4); continue; }
    if (p.wait > 0) p.wait -= dt;
    else {
      const tg = p.pts[p.i]; if (tg) { const dx = tg[0] - p.x, dz = tg[1] - p.z, d = Math.hypot(dx, dz), stp = p.sp * dt; if (d <= stp) { p.x = tg[0]; p.z = tg[1]; p.i++; if (p.i >= p.pts.length) { if (p.loop) { p.i = 0; p.wait = 1 + Math.random() * 3; } else if (p.inside) p.hide = true; else p.i = p.pts.length; } } else { p.x += dx / d * stp; p.z += dz / d * stp; p.dir = Math.atan2(dx, dz); } }
      else if (p.inside) p.hide = true;
    }
    const [, sc] = PT[p.type], bob = p.wait > 0 ? 0 : Math.abs(Math.sin(now * 8 + p.ph)) * .06;
    Q.setFromAxisAngle(V3.set(0, 1, 0), p.dir || 0); S3.set(sc, sc * (p.type === 'monk' ? 1.05 : 1), sc);
    M4.compose(V3.set(p.x, .5 * sc + bob, p.z), Q, S3); body.setMatrixAt(i, M4);
    M4.compose(V3.set(p.x, 1.15 * sc + bob, p.z), Q, S3.set(sc, sc, sc)); head.setMatrixAt(i, M4);
  }
  body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
  if (W.cart) { const L = 4 * 6.5 + 2 * 16.5, s = (now * 1.2) % L; let x, z; if (s < 13) { x = -6.5 + s; z = 5.5; } else if (s < 29.5) { x = 6.5; z = 5.5 - (s - 13); } else if (s < 42.5) { x = 6.5 - (s - 29.5); z = -11; } else { x = -6.5; z = -11 + (s - 42.5); } W.cart.position.set(x, 0, z); }
}

/* ===== แสงตามเวลา: เช้า กลางวัน เย็น กลางคืน (โคมไฟติด, หน้าต่างโบสถ์มีแสงเทียน) ===== */
const SKY = [[0, 0xf6c89a, .9, 0xffd2a0], [.22, 0xa8d8f0, 1.5, 0xffffff], [.6, 0xb8dcef, 1.4, 0xfff4dc], [.75, 0xe88a5a, .9, 0xff9a5a], [.86, 0x1a2140, .35, 0x7088c0], [1, 0x1a2140, .35, 0x7088c0]];
const ca = new THREE.Color(), cb = new THREE.Color();
function light() {
  const t = W.t; let i = 0; while (i < SKY.length - 2 && t > SKY[i + 1][0]) i++; const [t0, s0, k0, l0] = SKY[i], [t1, s1, k1, l1] = SKY[i + 1], f = clamp((t - t0) / (t1 - t0 || 1), 0, 1);
  W.sc.background = ca.setHex(s0).lerp(cb.setHex(s1), f).clone(); W.sun.intensity = k0 + (k1 - k0) * f; W.sun.color.setHex(l0).lerp(cb.setHex(l1), f); W.hemi.intensity = .5 + W.sun.intensity * .6;
  const a = t * Math.PI * 2; W.sun.position.set(Math.cos(a) * 25, 18 + Math.sin(a) * 10, 14);
  const night = t > .8 || t < .04, eve = t > .7;
  MAT.lamp.color.setHex(night ? 0xffd27a : 0x6b5a40); MAT.win.color.setHex(eve ? 0xffb347 : 0x3a2a20);
}

/* ===== กล้อง Ortho มุมเฉียง ~35° ลากเลื่อน ซูม หมุนทีละ 90° ===== */
const EL = THREE.MathUtils.degToRad(35);
function camUpdate(w, h) {
  const asp = w / (h || 1), fh = 30 / W.zoom; W.cam.left = -fh * asp / 2; W.cam.right = fh * asp / 2; W.cam.top = fh / 2; W.cam.bottom = -fh / 2; W.cam.updateProjectionMatrix();
  W.cam.position.set(W.tgt.x + Math.sin(W.az) * Math.cos(EL) * 80, Math.sin(EL) * 80, W.tgt.z + Math.cos(W.az) * Math.cos(EL) * 80); W.cam.lookAt(W.tgt);
}
function watPan(dx, dy, h) { if (!W) return; const k = 30 / W.zoom / (h || 1), c = Math.cos(W.az), s = Math.sin(W.az); W.tgt.x = clamp(W.tgt.x - (dx * c - dy / Math.sin(EL) * s) * k, -18, 18); W.tgt.z = clamp(W.tgt.z - (-dx * s - dy / Math.sin(EL) * c) * k, -20, 18); }
function watZoom(f) { if (W) W.zT = clamp(W.zT * f, .6, 3.2); }
function watRotate(d) { if (W) W.azT += d * Math.PI / 2; }
function watTime(t) { if (W) { W.t = t; spawnPeople(); } }
function watFrame(dt, w, h, onPhase) {
  if (!W) return; dt = Math.min(dt, .1);
  W.t = (W.t + dt / (W.opts.cycle || 240)) % 1; const ph = phaseOf(W.t);
  if (ph !== W.lastPhase) { const prev = W.lastPhase; spawnPeople(); if (onPhase && prev) onPhase(ph); }
  W.az += (W.azT - W.az) * .15; W.zoom += (W.zT - W.zoom) * .2;
  const now = performance.now() / 1000;
  for (const t of W.trees) t.userData.crown.rotation.z = Math.sin(now * 1.3 + t.userData.ph) * .035;
  W.boat.rotation.z = Math.sin(now * 1.7) * .05; W.boat.rotation.x = Math.sin(now * 1.1) * .03;
  if (W.st && W.st.built.pier) { W.boat.position.x = -20 + ((now * 1.3) % 50); if (Math.abs(W.boat.position.x - 8) < 1.5) W.boat.position.x = 8 + Math.sin(now) * .2; }
  if (W.wheel) W.wheel.rotation.z = now * .25;
  if (W.bellM) W.bellM.rotation.z = Math.sin(now * 2) * (W.ring > now ? .3 : .02);
  for (const k of W.extra) if (k.userData.drift) { k.position.x += k.userData.drift * dt; if (k.position.x > 23) k.position.x = -23; k.position.y = -.35 + Math.sin(now * 2 + k.position.x) * .05; }
  W.gnd.river.material.color.setHSL(.55, .5, .45 + Math.sin(now * .8) * .02);
  movePeople(dt); light(); camUpdate(w, h);
  W.R.render(W.sc, W.cam);
}
// แตะคน → คืนชนิดคนและตำแหน่งบนจอ (สำหรับกล่องคำพูด)
const RC = new THREE.Raycaster(), NDC = new THREE.Vector2();
function watPick(x, y, w, h) {
  if (!W) return null; NDC.set(x / w * 2 - 1, -(y / h) * 2 + 1); RC.setFromCamera(NDC, W.cam);
  const hit = RC.intersectObject(W.ppl.body, false)[0]; if (!hit || hit.instanceId == null) return null; const p = W.people[hit.instanceId]; if (!p || p.hide) return null;
  const v = new THREE.Vector3(p.x, 1.6, p.z).project(W.cam); return { type: p.type, sx: (v.x + 1) / 2 * w, sy: (1 - v.y) / 2 * h };
}
const watRing = () => { if (W) W.ring = performance.now() / 1000 + 3; };
const watPhase = () => W ? phaseOf(W.t) : 'day';

export { watEnter, watExit, watSync, watFrame, watPan, watZoom, watRotate, watTime, watPick, watRing, watPhase, PHASE_TH };
