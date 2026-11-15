// Докачивает оригиналы (orig) для выбранных кадров в raw/orig/. node tools/ya-orig.mjs g000 g184 ...
import fs from 'node:fs';
import sharp from 'sharp';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const map = JSON.parse(fs.readFileSync('tools/.cache/ya-photos.json', 'utf8'));
fs.mkdirSync('raw/orig', { recursive: true });
for (const key of process.argv.slice(2)) {
  const j = map.find((m) => m.dest.includes('/' + key));
  if (!j) { console.log('no', key); continue; }
  const dest = `raw/orig/${key}.jpg`;
  if (!fs.existsSync(dest)) {
    const r = await fetch(`https://avatars.mds.yandex.net/get-altay/${j.id}/orig`, { headers: { 'User-Agent': UA, Referer: 'https://yandex.ru/maps/' } });
    if (!r.ok) { console.log(key, 'HTTP', r.status); continue; }
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  }
  const m = await sharp(dest).metadata();
  console.log(key, m.width + 'x' + m.height, Math.round(fs.statSync(dest).size / 1024) + 'K');
}
