// Проверочный лист: кандидаты hero + разрез пар до/после. node tools/check-sheet.mjs
import sharp from 'sharp';
const hero = ['g031', 'g157', 'g137', 'g044'];
const pairs = ['g007', 'g008', 'g002', 'g004', 'g006', 'g011', 'g012', 'g013', 'g133', 'g141', 'g131', 'g001', 'g005', 'g143', 'g161'];
const tiles = [];
const TW = 220, TH = 330;
let i = 0;
for (const k of hero) {
  const b = await sharp(`raw/orig/${k}.jpg`).rotate().resize(TW, TH, { fit: 'cover', position: 'top' }).toBuffer();
  tiles.push({ input: b, left: (i % 8) * (TW + 6), top: Math.floor(i / 8) * (TH + 6) }); i++;
}
i = 8;
for (const k of pairs) {
  const src = sharp(`raw/orig/${k}.jpg`).rotate();
  const m = await src.metadata();
  const hw = Math.floor(m.width / 2), inset = Math.round(hw * 0.02);
  const w = hw - inset * 2, h = Math.min(m.height - Math.round(m.height * 0.06), Math.round(w * 1.5));
  for (const side of [0, 1]) {
    const b = await sharp(`raw/orig/${k}.jpg`).rotate().extract({ left: side * hw + inset, top: Math.round(m.height * 0.05), width: w, height: h }).resize(TW / 2, TH / 2).toBuffer();
    tiles.push({ input: b, left: ((i % 8) * (TW + 6)) + side * (TW / 2), top: Math.floor(i / 8) * (TH + 6) + (i >= 16 ? -TH / 2 : 0) });
  }
  i++;
}
await sharp({ create: { width: 8 * (TW + 6), height: TH + 6 + 2 * (TH / 2 + 6) + 10, channels: 3, background: '#333' } }).composite(tiles).jpeg({ quality: 84 }).toFile('raw/check.jpg');
console.log('ok');
