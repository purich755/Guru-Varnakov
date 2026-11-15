// Версии файлов в index.html: assets/css/style.css?v=<хеш>, assets/js/main.js?v=<хеш>.
// GitHub Pages кэширует css/js на 10 минут — без версий после обновления берутся старые стили.
// Запускать перед каждым коммитом: node tools/stamp.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
let html = fs.readFileSync('index.html', 'utf8');
let n = 0;
html = html.replace(/(href|src)="(assets\/(?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"/g, (m, attr, file) => {
  if (!fs.existsSync(file)) return m;
  n++;
  return `${attr}="${file}?v=${crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8)}"`;
});
fs.writeFileSync('index.html', html);
console.log('версии проставлены:', n);
