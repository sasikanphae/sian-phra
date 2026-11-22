# เซียนพระ จำลอง (Sian Phra Simulator)

เกมเว็บจำลองการเป็นเซียนพระ: รับเช่าพระจากลูกค้า ส่องพระ 3D หมุนได้ 360° แยกแท้/เก๊ ไต่เลเวล ประกวดพระ และจัดสร้างพระกับวัด
เล่นได้ทั้งคอมและมือถือ (UI ภาษาไทย)

## Tech
- HTML/CSS/JS ล้วน ไม่มี build step — `index.html` + ES module หลายไฟล์ + `three.module.min.js` (three.js r170, local copy)
- โมดูล: `util.js` (ฟังก์ชันพื้นฐาน) → `data.js` (ข้อมูลเกมทั้งหมด) → `amulet2d.js` (วาด heightmap/texture) → `amulet3d.js` (สร้าง mesh, เครื่องราง 3D, กรอบ) → `game.js` (state, UI, ระบบเกม) — import แบบระบุชื่อ, ห้าม import ย้อนทาง (โมดูลล่างไม่รู้จัก `S`)
- Deploy: GitHub Pages ผ่าน `.github/workflows/pages.yml` (push เข้า `main` แล้ว deploy อัตโนมัติ) — workflow คัดลอก `index.html` และ `*.js` ทั้งหมด ถ้าเพิ่มไฟล์ชนิดอื่น (รูป เสียง) ต้องเพิ่มในขั้น `cp`
- รันด้วย static server ใดก็ได้ เช่น `npx serve .` หรือ `python3 -m http.server 8000` (เปิดไฟล์ตรง ๆ ด้วย file:// ไม่ได้ เพราะ ES module)
- เซฟเกมใน `localStorage` key `sianphra_v1` (ครอบ try/catch ไว้); โหมดส่องพระประจำวันเซฟแยกที่ `sianphra_daily_v1`

## โครงสร้างโค้ด (ตามหัวข้อคอมเมนต์ `/* ===== ... ===== */`)
1. **utils** (`util.js`) — `rng(seed)` (mulberry32), `hash`, `fmt` (฿), `wpick` (weighted pick)
2. **game data** (`data.js`) — `MODELS` แบบ data-driven: รุ่น = `shape` (rect tri arch oval pidta round bodhi lotus jackfruit smallrect coindrop sema) + `pose` (seated pidta stand walk naga monk) + `kind` (flat kring takrut bia) + `mat` + `spec` (รวม `finish` งานผิว) + `rar` + `region` + `subs` (ชุดพิมพ์ย่อย `SUBP`, ตำหนิ `mark` วาดบนองค์ ไม่ใช่ของเก๊) — ค่าเริ่มต้นใน `P_`; `isCoin`, `catOf`/`CATS` (หมวดสมุด), `RAR`, `REGIONS`, `FRAMES` (กรอบ), `UNLOCK` สร้างจาก MODELS อัตโนมัติ; `MATS` (เนื้อพระ, `fx` งานพิเศษของเนื้อ), `TELLS` (จุดสังเกตแท้/เก๊; `hidden: true` = จุดแฝง resin/weight ใช้ค่า `def` ไม่อยู่ใน spec องค์ครู), `TOOLS` (ร้านอุปกรณ์), `MODELS` (พระแต่ละรุ่น + `spec` ขององค์ครู + `weight` กรัม), `LEVELS`, `UNLOCK`, `TEMPLES`, `PIMS`, ชื่อ/บทพูดลูกค้า
3. **procedural amulet 2D** (`amulet2d.js`) — `outlinePts` (รูปทรง), `FIG` + `poseFig` (ตำแหน่งองค์ตามรูปทรง/ปาง), วาด heightmap ลง canvas (`drawFront`, `drawBack`, `drawFigure`/`drawStanding`/`drawNaga`/`drawMonk`/`drawPidta`, `drawSubMark`) แล้ว `makeFace()` แปลงเป็น color / normal / displacement / alpha map พร้อมรอยสึก รูพรุน ลายงา งานผิว (finish) และ fx ของเนื้อ ตามสภาพ (`cond`)
4. **procedural amulet 3D** (`amulet3d.js`) — `buildAmulet(model, spec, cond, seed, res, {frame})` = ExtrudeGeometry (ตัวองค์ + ขอบ + ความหนา) + plane หน้า/หลังที่ใช้ displacement + หูเหรียญ + กรอบ (`addFrame`); เครื่องรางทรง 3D `buildKring` / `buildTakrut` / `buildBia` (mesh มี `userData.tells` = จุดสังเกตที่แตะชี้ได้, `grp.userData.kp` = ตำแหน่งไฮไลต์ `[pos, ry, rx]`); geometry ที่ใช้ซ้ำแคชผ่าน `geo(key, make)` (`userData.shared` ห้าม dispose)
5. **main view** (ส่วนที่เหลืออยู่ใน `game.js`) — renderer หลัก, หมุนแบบ trackball (quaternion), pinch/wheel zoom, pan, พลิก, ส่อง (loupe), ไฟ UV (`applyUV`), โหมดเทียบองค์ครู (`V.cmp`: องค์ครู `ref` อยู่ใน `holder` เดียวกัน วาด 2 viewport ด้วย scissor บน renderer เดียว `cmpRects`; มือถือแนวตั้งแบ่งบน-ล่าง), แตะ (< 6px) → `onTap` → `pickPart` (raycast, mesh มี `userData.part` = front/back/body/loop) → `frontZone(model, px, py)` (เทียบ `poseFig` ตามปาง) หรือ `userData.tells` ของเครื่องราง, กรอบบังขอบ (`part: 'frame'`) และไฮไลต์จุด `highlight(key)`
6. **thumbnails** — renderer ตัวที่สอง (preserveDrawingBuffer) ทำภาพ หน้า/หลัง/ข้าง สำหรับสมุดและตู้พระ แบบคิวทีละงาน
6.5 **sound** — เสียงสังเคราะห์ด้วย Web Audio (ไม่ใช้ไฟล์) `sfx('buy' | 'flip' | 'level')`; ปิดเสียงได้ในเมนู (`S.mute`)
7. **state** — `S` (เงิน, xp, ชื่อเสียง, วัน, inv, queue, batches, custom models, tools), `makeCustomer` (รวม "เก๊เทพ" Lv.3+ ผิดแค่ resin/weight; ระบบซ่อน: 75% เลือกรุ่นที่ราคา ≤ 1.2 เท่าของเงินผู้เล่น — ห้ามให้ ask บทพูด หรือ UI อ้างถึงเงินผู้เล่น และไม่อธิบายในวิธีเล่น), `mutate(spec, n, r, tier)` (สร้างของเก๊; tier `'easy'` Lv.1–2 ผ่าน `easyFake` = ต่างชัดและต้องมีจุดผิดด้านหน้า, ปกติ Lv.3–4, `'fine'` Lv.5+ ต่างละเอียด), `wrongKeys`, `gramsOf`
8. **rendering** — `render()` วาด HUD / การ์ดลูกค้า / ปุ่ม / แท็บ; โหมด `shop` (หน้าร้าน) กับ `own` (ส่ององค์ในตู้)
9. **actions** — ต่อราคา, รับเช่า (เงินไม่พอ → `shortHTML`: ฝากขาย `it.consign`, เทิร์น `doTurn`, ลงหุ้น `it.share`, ยืม `S.loan`; ส่วนแบ่งตอนขาย `myCut`), ไม่เอา → โหมดชี้จุดเก๊ (`spot`, `commitSpot`, ชี้ได้ครั้งเดียวต่อองค์ผ่าน `c.pointed`), ส่งตรวจ, ปล่อยเช่า, `endDay()` (ผลตรวจ, เฉลยองค์ที่ปฏิเสธ, ยอดบูชารุ่นที่จัดสร้าง, ค่าแผง)
9.3 **guide** — ชิปบน stage: ถอด/ใส่กรอบ (`toggleFrame`), เขย่า (`shakePiece` → เสียง `ring`/`dull`/`merc`/`dry`),  `curPiece()`, เช็กลิสต์ `CL` (ล้างใน `loadStage`, ✗ ≤ 2 ข้อแล้วกดไม่เอา = `commitSpot`), ถามอาจารย์ `askTeacher` (`S.ask`, คำตอบเก็บใน `piece.teach`), เฉลยพร้อมภาพ `revealCard` (thumb kind `x` ผ่าน `XA`), บทเรียน `tutCustomers` / `TUT` / `checkTut` (`S.tut`, ลูกค้า `c.tut` 1–3)
9.5 **daily** — ส่องพระประจำวัน: `dailySet(date)` seed จาก `hash('daily:'+วันที่เวลาไทย)`, โหมด `daily` บน stage เดิม, จับเวลา, streak, คัดลอกผลแชร์
9.7 **จัดสร้างพระ** (อยู่ในส่วน modals) — `TF` = สถานะหน้าออกแบบ 5 ขั้น (`wizHTML`, ตัวอย่าง 3D ผ่าน `PVA` + thumbnail renderer), `makeBatch`, หน้ารุ่น `batchCard` (หลอด hype/heat, `priceSVG`, `bAct` สายขาว/สายเทา, `LIVE` ไลฟ์สด), `dayBatch` (ตอน endDay), `sellStock`; ข้อมูล `INGR`, `RECIPES` (ลับ), `LUCKY` (ลับ), `EVENTS`, `PAGES`; batch มี `hype heat mp base hist keep stock coded seqOK`; `S.trust` / `S.templeBan` / `S.recipes` / `S.kaka` / `S.tlog` เติมค่าเซฟเก่าใน `normTemple()`
10.5 **debug** — แผงทดสอบ (`DEBUG_ACTS`) แสดงเฉพาะเมื่อ URL มี `#debug` (เปิดเกมด้วย `index.html#debug`)
10. **modals** — ร้านอุปกรณ์, สมุดองค์ครู (`BK`: หมวด/ค้นหา/ตัวกรองภาค ความหายาก เลเวล, `S.owned` = สมุดสะสม), เลี่ยมกรอบ (`frameSvcHTML`), ตู้พระ, ประกวด (`runContest`), จัดสร้าง (`makeBatch`), เมนู, วิธีเล่น

## หลักการสำคัญ
- องค์ครูของแต่ละรุ่นต้องหน้าตาเหมือนกันทุกครั้ง: ลวดลายที่ "เป็นของรุ่น" ใช้ seed จาก `hash(model.id)` ส่วนรอยเฉพาะองค์ (ลายนิ้วมือ บิ่น) ใช้ seed ของแต่ละชิ้น
- จุดสังเกตใหม่ต้องเพิ่มทั้งใน `TELLS` (label, ตัวเลือก, ข้อความ) และในโค้ดวาด/สร้าง 3D ให้ "มองเห็นได้จริง" บนองค์พระ (หรือผ่านเครื่องมือ เช่น UV/ตาชั่ง) และถ้าแตะชี้ได้ ให้เพิ่มโซนใน `frontZone` / `keyPos` ด้วย
- field ใหม่ใน `S` ต้องมีค่าเริ่มต้นทั้งใน `newGame()` และบรรทัดเติมค่าให้เซฟเก่า (ต่อจาก `S.stats.spotted = ...`)
- ห้ามเฉลยโบนัสชื่อมงคลและสูตรตำรับลับใน UI/วิธีเล่น (ค่า "กระแสเริ่มต้น" ที่โชว์ตอนออกแบบไม่รวมโบนัสลับ)
- แถวปุ่ม `#act` = แถวเครื่องมือ (`toolBtns`: พลิก ส่อง เทียบ UV) + แถวตัดสินใจ ไม่เกิน 4 ปุ่มต่อแถว; สมุดเปิดจากแท็บล่าง, เช็กลิสต์/ถามอาจารย์เป็นชิปบน stage (`#chips`)
- พระ วัด ราคา และจุดสังเกตทั้งหมดเป็นเรื่องสมมติ ห้ามใช้ชื่อพระเครื่อง/วัด/เกจิจริง
- ข้อความในเกมเป็นภาษาไทย ฟอนต์ Kanit (หัวข้อ/ปุ่ม) + Sarabun (เนื้อหา) จาก Google Fonts
- ต้องเล่นได้บนมือถือ: ปุ่มสูง ≥ 44px, ทดสอบที่ความกว้าง 360–430px, เลย์เอาต์จอกว้าง ≥ 900px แยกคอลัมน์ขวา
