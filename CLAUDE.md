# เซียนพระ จำลอง (Sian Phra Simulator)

เกมเว็บจำลองการเป็นเซียนพระ: รับเช่าพระจากลูกค้า ส่องพระ 3D หมุนได้ 360° แยกแท้/เก๊ ไต่เลเวล ประกวดพระ และจัดสร้างพระกับวัด
เล่นได้ทั้งคอมและมือถือ (UI ภาษาไทย)

## Tech
- HTML/CSS/JS ล้วน ไม่มี build step — `index.html` + `game.js` (ES module) + `three.module.min.js` (three.js r170, local copy)
- Deploy: GitHub Pages ผ่าน `.github/workflows/pages.yml` (push เข้า `main` แล้ว deploy อัตโนมัติ) — ถ้าเพิ่มไฟล์ที่เกมต้องโหลด ต้องเพิ่มในขั้น `cp` ของ workflow ด้วย
- รันด้วย static server ใดก็ได้ เช่น `npx serve .` หรือ `python3 -m http.server 8000` (เปิดไฟล์ตรง ๆ ด้วย file:// ไม่ได้ เพราะ ES module)
- เซฟเกมใน `localStorage` key `sianphra_v1` (ครอบ try/catch ไว้); โหมดส่องพระประจำวันเซฟแยกที่ `sianphra_daily_v1`

## โครงสร้าง game.js (ตามหัวข้อคอมเมนต์ `/* ===== ... ===== */`)
1. **utils** — `rng(seed)` (mulberry32), `hash`, `fmt` (฿), `wpick` (weighted pick)
2. **game data** — `MATS` (เนื้อพระ), `TELLS` (จุดสังเกตแท้/เก๊; `hidden: true` = จุดแฝง resin/weight ใช้ค่า `def` ไม่อยู่ใน spec องค์ครู), `TOOLS` (ร้านอุปกรณ์), `MODELS` (พระแต่ละรุ่น + `spec` ขององค์ครู + `weight` กรัม), `LEVELS`, `UNLOCK`, `TEMPLES`, `PIMS`, ชื่อ/บทพูดลูกค้า
3. **procedural amulet 2D** — วาด heightmap ลง canvas (`drawFront`, `drawBack`, `drawFigure`) แล้ว `makeFace()` แปลงเป็น color / normal / displacement / alpha map พร้อมรอยสึก รูพรุน ลายงา ตามสภาพ (`cond`)
4. **procedural amulet 3D** — `buildAmulet(model, spec, cond, seed, res)` = ExtrudeGeometry (ตัวองค์ + ขอบ cut/round + ความหนา) + plane หน้า/หลังที่ใช้ displacement + หูเหรียญ (เชื่อม/ตัน)
5. **main view** — renderer หลัก, หมุนแบบ trackball (quaternion), pinch/wheel zoom, pan, พลิก, ส่อง (loupe), ไฟ UV (`applyUV`), แตะ (< 6px) → `onTap` → `pickPart` (raycast, mesh มี `userData.part` = front/back/body/loop) → `frontZone` (เทียบ FIG) และไฮไลต์จุด `highlight(key)`
6. **thumbnails** — renderer ตัวที่สอง (preserveDrawingBuffer) ทำภาพ หน้า/หลัง/ข้าง สำหรับสมุดและตู้พระ แบบคิวทีละงาน
6.5 **sound** — เสียงสังเคราะห์ด้วย Web Audio (ไม่ใช้ไฟล์) `sfx('buy' | 'flip' | 'level')`; ปิดเสียงได้ในเมนู (`S.mute`)
7. **state** — `S` (เงิน, xp, ชื่อเสียง, วัน, inv, queue, batches, custom models, tools), `makeCustomer` (รวม "เก๊เทพ" Lv.3+ ผิดแค่ resin/weight), `mutate` (สร้างของเก๊โดยเปลี่ยน tell ที่มองเห็น 1–3 จุด), `wrongKeys`, `gramsOf`
8. **rendering** — `render()` วาด HUD / การ์ดลูกค้า / ปุ่ม / แท็บ; โหมด `shop` (หน้าร้าน) กับ `own` (ส่ององค์ในตู้)
9. **actions** — ต่อราคา, รับเช่า, ไม่เอา → โหมดชี้จุดเก๊ (`spot`, `commitSpot`, ชี้ได้ครั้งเดียวต่อองค์ผ่าน `c.pointed`), ส่งตรวจ, ปล่อยเช่า, `endDay()` (ผลตรวจ, เฉลยองค์ที่ปฏิเสธ, ยอดบูชารุ่นที่จัดสร้าง, ค่าแผง)
9.5 **daily** — ส่องพระประจำวัน: `dailySet(date)` seed จาก `hash('daily:'+วันที่เวลาไทย)`, โหมด `daily` บน stage เดิม, จับเวลา, streak, คัดลอกผลแชร์
10. **modals** — ร้านอุปกรณ์, สมุดองค์ครู, ตู้พระ, ประกวด (`runContest`), จัดสร้าง (`makeBatch`), เมนู, วิธีเล่น

## หลักการสำคัญ
- องค์ครูของแต่ละรุ่นต้องหน้าตาเหมือนกันทุกครั้ง: ลวดลายที่ "เป็นของรุ่น" ใช้ seed จาก `hash(model.id)` ส่วนรอยเฉพาะองค์ (ลายนิ้วมือ บิ่น) ใช้ seed ของแต่ละชิ้น
- จุดสังเกตใหม่ต้องเพิ่มทั้งใน `TELLS` (label, ตัวเลือก, ข้อความ) และในโค้ดวาด/สร้าง 3D ให้ "มองเห็นได้จริง" บนองค์พระ (หรือผ่านเครื่องมือ เช่น UV/ตาชั่ง) และถ้าแตะชี้ได้ ให้เพิ่มโซนใน `frontZone` / `keyPos` ด้วย
- แถวปุ่ม `#act` = แถวเครื่องมือ (`toolBtns`) + แถวตัดสินใจ ไม่เกิน 4 ปุ่มต่อแถว
- พระ วัด ราคา และจุดสังเกตทั้งหมดเป็นเรื่องสมมติ ห้ามใช้ชื่อพระเครื่อง/วัด/เกจิจริง
- ข้อความในเกมเป็นภาษาไทย ฟอนต์ Kanit (หัวข้อ/ปุ่ม) + Sarabun (เนื้อหา) จาก Google Fonts
- ต้องเล่นได้บนมือถือ: ปุ่มสูง ≥ 44px, ทดสอบที่ความกว้าง 360–430px, เลย์เอาต์จอกว้าง ≥ 900px แยกคอลัมน์ขวา
