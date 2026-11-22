// แยกจาก game.js (เฟส 2) — ดูโครงสร้างใน CLAUDE.md
/* ================= utils ================= */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const fmt = n => (n < 0 ? '−฿' : '฿') + Math.abs(Math.round(n)).toLocaleString('en-US');
const pick = (r, a) => a[Math.floor(r() * a.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const round100 = n => Math.max(100, Math.round(n / 100) * 100);
function wpick(r, pairs) { let t = pairs.reduce((s, p) => s + p[1], 0) * r(); for (const p of pairs) { if ((t -= p[1]) <= 0) return p[0]; } return pairs[pairs.length - 1][0]; }

function inPoly(x, y, P) { let o = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) o = !o; } return o; }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export { $, clamp, lerp, rng, hash, fmt, pick, esc, round100, wpick, inPoly, mk };
