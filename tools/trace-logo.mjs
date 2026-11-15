// Монограмма G из аватара (raw/ya/r000.jpg) → векторный контур. node tools/trace-logo.mjs
import sharp from 'sharp';
import potrace from 'potrace';
import fs from 'node:fs';
const S = 1800;
// светлая монограмма на оливковом: увеличить, сгладить, инвертировать, обрезать круг
// sharp выполняет операции в своём порядке, поэтому шаги материализуем по одному
const step1 = await sharp('raw/ya/r000.jpg').resize(S, S, { kernel: 'lanczos3' }).grayscale().blur(5).png().toBuffer();
const step2 = await sharp(step1).threshold(168).png().toBuffer();
const buf = await sharp(step2).negate().png().toBuffer();
// за пределами круга аватар белый → после negate чёрный; маскируем кругом
const mask = Buffer.from(`<svg width="${S}" height="${S}"><rect width="100%" height="100%" fill="#fff"/><circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.47}" fill="#000"/></svg>`);
const masked = await sharp(buf).composite([{ input: mask, blend: 'lighten' }]).png().toBuffer();
fs.writeFileSync('raw/logo-bitmap.png', masked);
potrace.trace(masked, { turdSize: 200, optTolerance: 0.6, alphaMax: 1.1, threshold: 128 }, async (err, svg) => {
  if (err) throw err;
  const d = svg.match(/ d="([^"]+)"/)[1];
  // границы контура
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (let i = 0; i + 1 < nums.length; i += 2) { minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]); minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]); }
  const pad = 20;
  const vb = [Math.floor(minX - pad), Math.floor(minY - pad), Math.ceil(maxX - minX + pad * 2), Math.ceil(maxY - minY + pad * 2)];
  // нормируем в viewBox 0 0 100 H
  const k = 100 / vb[2];
  let idx = 0;
  const dn = d.replace(/-?\d+(\.\d+)?/g, (m) => { const v = Number(m); const r = idx % 2 === 0 ? (v - vb[0]) * k : (v - vb[1]) * k; idx++; return String(Math.round(r * 100) / 100); });
  const H = Math.round(vb[3] * k * 100) / 100;
  fs.writeFileSync('tools/.cache/logo-path.json', JSON.stringify({ viewBox: `0 0 100 ${H}`, d: dn }));
  const file = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${H}"><path fill="#15120F" fill-rule="evenodd" d="${dn}"/></svg>`;
  fs.writeFileSync('assets/svg/logo-g.svg', file);
  await sharp(Buffer.from(file)).resize(400).flatten({ background: '#E7DFD2' }).png().toFile('raw/logo-preview.png');
  console.log('viewBox', `0 0 100 ${H}`, 'path length', dn.length);
});
