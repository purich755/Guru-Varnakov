// Вставляет в index.html спрайт (монограмма, листья, иконки) между маркерами, пишет favicon и og.jpg.
//   node tools/inject.mjs
import fs from 'node:fs';
import sharp from 'sharp';
const logo = JSON.parse(fs.readFileSync('tools/.cache/logo-path.json', 'utf8'));
const leaves = JSON.parse(fs.readFileSync('tools/.cache/leaves.json', 'utf8'));
const icons = fs.readFileSync('tools/icons.svg.txt', 'utf8').trim().replace(/(\d)00(?=[^\d.])/g, '$1').replace(/\n/g, '');
const R = (v) => Math.round(v * 10) / 10;
const leafSym = Object.entries(leaves).map(([id, l]) => `<symbol id="leaf-${id}" viewBox="${l.box.map(R).join(' ')}"><path class="leaf-body" fill-rule="evenodd" d="${l.d}"/><path class="leaf-rib" d="${l.rib}${l.vein}"/></symbol>`).join('');
const sprite = `<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs><linearGradient id="leaf-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2B5540"/><stop offset="1" stop-color="#16301F"/></linearGradient></defs><symbol id="g-mono" viewBox="${logo.viewBox}"><path fill="currentColor" fill-rule="evenodd" d="${logo.d}"/></symbol>${leafSym}${icons}</svg>`;
let html = fs.readFileSync('index.html', 'utf8');
const a = html.indexOf('<!--@sprite-->'), b = html.indexOf('<!--/@sprite-->');
if (a < 0 || b < 0) throw new Error('нет маркеров спрайта');
html = html.slice(0, a) + '<!--@sprite-->\n' + sprite + '\n' + html.slice(b);
fs.writeFileSync('index.html', html);
console.log('sprite', Math.round(sprite.length / 1024) + 'K', 'html', Math.round(html.length / 1024) + 'K');

// favicon: монограмма на тёмном круге
fs.writeFileSync('assets/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#15120F"/><svg x="14" y="14.500" width="36" height="35" viewBox="${logo.viewBox}"><path fill="#B39762" fill-rule="evenodd" d="${logo.d}"/></svg></svg>`.replace('14.500', '14.5'));
fs.writeFileSync('assets/svg/logo-g.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}"><path fill="#15120F" fill-rule="evenodd" d="${logo.d}"/></svg>`);

// og:image — зеркало на гипсе + монограмма и название
const over = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><svg x="96" y="150" width="92" height="90" viewBox="${logo.viewBox}"><path fill="#15120F" fill-rule="evenodd" d="${logo.d}"/></svg><text x="96" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="64" fill="#15120F">От внутреннего —</text><text x="96" y="408" font-family="Georgia, 'Times New Roman', serif" font-size="64" font-style="italic" fill="#15120F">к внешнему</text><rect x="96" y="452" width="48" height="1.500" fill="#B39762"/><text x="96" y="492" font-family="Arial, sans-serif" font-size="20" letter-spacing="4" fill="#6F665C">GURU BY VARNAKOV · НИЖНИЙ НОВГОРОД</text></svg>`.replace('1.500', '1.5');
if (fs.existsSync('assets/img/misc/og-base.jpg')) { // основу кладёт build-images.mjs
  await sharp('assets/img/misc/og-base.jpg').composite([{ input: Buffer.from(over) }]).jpeg({ quality: 84 }).toFile('assets/img/misc/og.jpg');
  fs.rmSync('assets/img/misc/og-base.jpg');
}
console.log('favicon, og ok');
