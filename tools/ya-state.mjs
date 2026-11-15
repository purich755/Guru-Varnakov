// Разбор state-view: фото заведения (без рекламы соседей), теги фото, координаты, отзывы.
import fs from 'node:fs';
const ID = '119967608949';
function find(o, key, out = [], d = 0) { if (!o || typeof o !== 'object' || d > 16) return out; for (const k in o) { if (k === key) out.push(o[k]); find(o[k], key, out, d + 1); } return out; }
const own = new Map();
const blocked = new Set();
let it = {};
for (const page of ['main', 'gallery', 'reviews', 'prices', 'features']) {
  const f = `tools/.cache/state-com_${page}.json`;
  if (!fs.existsSync(f)) continue;
  const st = JSON.parse(fs.readFileSync(f, 'utf8'));
  const items = find(st, 'items').flat().filter((x) => x && x.id === ID);
  const cur = items.sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0] || {};
  if (Object.keys(cur).length > Object.keys(it).length) it = cur;
  for (const k of ['relatedAdverts', 'relatedPlaces', 'similarPlaces', 'advert']) {
    const j = JSON.stringify(cur[k] || {}); for (const m of j.matchAll(/get-altay\/(\d+\/[0-9a-z]+)/gi)) blocked.add(m[1]);
  }
  for (const p of cur.photos?.items || []) { const m = (p.urlTemplate || '').match(/get-altay\/(\d+\/[0-9a-z]+)/); if (m) own.set(m[1], { tags: p.tags, w: p.width, h: p.height }); }
  if (page === 'gallery') {
    console.log('gallery keys with photo:', [...new Set(find(st, 'photos').map((x) => Object.keys(x || {}).join(',')))].slice(0, 6));
    const tags = find(st, 'tags').flat().filter((t) => t && t.name);
    console.log('tags:', [...new Map(tags.map((t) => [t.id || t.name, t.name + ':' + (t.count ?? '')])).values()].join(' | '));
  }
  if (page === 'reviews') {
    const rv = find(st, 'reviews').flat().filter((x) => x && x.text);
    const uniq = [...new Map(rv.map((x) => [x.reviewId || x.text.slice(0, 40), x])).values()];
    fs.writeFileSync('tools/.cache/reviews.json', JSON.stringify(uniq.map((x) => ({ author: x.author?.name, date: x.updatedTime, text: x.text, photos: (x.photos || []).map((p) => p.urlTemplate || p) })), null, 1));
    console.log('reviews', uniq.length);
    for (const r of uniq) for (const p of r.photos || []) { const m = (p.urlTemplate || '').match(/get-altay\/(\d+\/[0-9a-z]+)/); if (m && !own.has(m[1])) own.set(m[1], { tags: ['review'] }); }
  }
}
console.log('title', it.title, '|', it.address, '|', JSON.stringify(it.coordinates), '|', it.workingTimeText);
console.log('photos count', it.photos?.count, 'own', own.size, 'blocked', blocked.size);
console.log('features', (it.features || []).map((f) => f.name + ':' + JSON.stringify(f.value)).join(' | ').slice(0, 1500));
console.log('logo', JSON.stringify(it.businessImages || {}).slice(0, 400));
console.log('keys', Object.keys(it).join(','));
const all = fs.readFileSync('tools/.cache/ya-ids.txt', 'utf8').split('\n').filter(Boolean);
const rest = all.filter((x) => !blocked.has(x) && !own.has(x));
console.log('unknown ids (not own, not blocked):', rest.length);
fs.writeFileSync('tools/.cache/ya-own.json', JSON.stringify({ own: [...own].map(([id, v]) => ({ id, ...v })), rest, blocked: [...blocked] }, null, 1));
