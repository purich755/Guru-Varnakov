// Публичные страницы организации на Яндекс.Картах: сохраняем HTML и state-view, собираем id фото get-altay.
//   node tools/ya-page.mjs
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const ORG = '/maps/org/guru_galereya_krasoty_ilyi_varnakova/119967608949/';
const hosts = ['https://yandex.com', 'https://yandex.ru'];
const paths = ['', 'gallery/', 'reviews/', 'prices/', 'features/'];
const ids = new Set();
for (const h of hosts) for (const p of paths) {
  try {
    const r = await fetch(h + ORG + p, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru' }, redirect: 'follow' });
    const t = await r.text();
    const name = (h.includes('.ru') ? 'ru' : 'com') + '_' + (p.replace(/\W+/g, '') || 'main');
    fs.writeFileSync('tools/.cache/' + name + '.html', t);
    const sv = t.match(/<script[^>]*class="state-view"[^>]*>([\s\S]*?)<\/script>/);
    if (sv) fs.writeFileSync('tools/.cache/state-' + name + '.json', sv[1]);
    const m = [...t.matchAll(/get-altay\/(\d+)\/([0-9a-z]+)/gi)].map((x) => x[1] + '/' + x[2]);
    m.forEach((x) => ids.add(x));
    console.log(r.status, name, t.length, 'state', !!sv, 'altay', new Set(m).size, /captcha/i.test(r.url) ? 'CAPTCHA' : '', r.url.slice(0, 90));
  } catch (e) { console.log('ERR', h + p, e.message); }
}
fs.writeFileSync('tools/.cache/ya-ids.txt', [...ids].join('\n'));
console.log('total ids', ids.size);
