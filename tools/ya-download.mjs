// Скачивает фото галереи Яндекс.Карт в raw/ya/. Имя: g<номер в галерее>_<теги>.jpg; фото из отзывов — r###.jpg
//   node tools/ya-download.mjs
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const g = JSON.parse(fs.readFileSync('tools/.cache/gallery.json', 'utf8'));
const short = { 'Внутри': 'in', 'Услуги': 'sv', 'Оборудование': 'eq', 'Доступность': 'ac', 'Товары': 'gd', 'Снаружи': 'out', 'Вход': 'ent' };
const tagOf = g.ids.map(() => []);
for (const [k, arr] of Object.entries(g.tags)) for (const i of arr) if (i >= 0) tagOf[i].push(short[k]);
const jobs = g.ids.map((id, i) => ({ id, dest: `raw/ya/g${String(i).padStart(3, '0')}${tagOf[i].length ? '_' + tagOf[i].join('-') : ''}.jpg` }));
// фото из отзывов и карточки, которых нет в галерее
const extra = fs.readFileSync('tools/.cache/ya-ids.txt', 'utf8').split('\n').filter(Boolean).filter((x) => !g.ids.includes(x));
extra.forEach((id, i) => jobs.push({ id, dest: `raw/ya/r${String(i).padStart(3, '0')}.jpg` }));
const map = [];
let idx = 0, ok = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (idx < jobs.length) {
    const j = jobs[idx++];
    if (fs.existsSync(j.dest)) { map.push(j); ok++; continue; }
    for (const s of ['XXXL', 'XXL', 'orig']) {
      try {
        const r = await fetch(`https://avatars.mds.yandex.net/get-altay/${j.id}/${s}`, { headers: { 'User-Agent': UA, Referer: 'https://yandex.ru/maps/' } });
        if (!r.ok) continue;
        const b = Buffer.from(await r.arrayBuffer());
        if (b.length < 4000) continue;
        fs.writeFileSync(j.dest, b); ok++; map.push(j); break;
      } catch {}
    }
  }
}));
fs.writeFileSync('tools/.cache/ya-photos.json', JSON.stringify(map.sort((a, b) => a.dest.localeCompare(b.dest)), null, 1));
console.log(ok, 'of', jobs.length, 'extra', extra.length);
