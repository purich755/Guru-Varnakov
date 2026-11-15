// Скриншоты по залам: node tools/shots.mjs [ширина] → raw/shots/<w>-NN-<id>.jpg   ONLY=id,id  RM=1
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const W = Number(process.argv[2] || 1440);
const URL = process.env.URL || 'http://localhost:8371/';
const mobile = W < 768, H = mobile ? 812 : 900;
fs.mkdirSync('raw/shots', { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'ru-RU', reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
p.on('requestfailed', (r) => errs.push('failed: ' + r.url()));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2600);
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
// [имя, id секции, сдвиг в долях высоты экрана]
const stops = [['hero', 'top', 0], ['hero-mid', 'top', mobile ? .75 : 1.15], ['hero-end', 'top', mobile ? 1.38 : 2.15], ['curator', 'curator', 0], ['curator2', 'curator', .95], ['space', 'space', 0], ['space2', 'space', .55], ['tech', 'tech', 0], ['grade', 'grade', 0], ['vcut', 'vcut', 0], ['vcut2', 'vcut', .8], ['works', 'works', 0], ['works2', 'works', 1.6], ['talk', 'talk', 0], ['ritual', 'ritual', 0], ['masters', 'masters', 0], ['masters2', 'masters', .9], ['prices', 'prices', 0], ['guests', 'guests', 0], ['gift', 'gift', 0], ['contacts', 'contacts', 0], ['final', 'final', 0], ['footer', 'final', 1]];
const go = async (y) => { await p.evaluate((y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }, y); };
const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight }));
console.log('metrics', JSON.stringify(m));
let n = 0;
for (const [name, id, off] of stops) {
  n++;
  if (only && !only.includes(name)) continue;
  const top = await p.evaluate((id) => { const el = document.getElementById(id); const sp = el.closest('.pin-spacer') || el; return sp.getBoundingClientRect().top + scrollY; }, id);
  const cur = await p.evaluate(() => scrollY), to = top + off * H;
  for (let i = 1; i <= 8; i++) { await go(cur + ((to - cur) * i) / 8); await p.waitForTimeout(70); }
  await p.waitForTimeout(1700);
  await p.screenshot({ path: `raw/shots/${W}-${String(n).padStart(2, '0')}-${name}.jpg`, type: 'jpeg', quality: 70 });
}
const m2 = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
console.log('after', JSON.stringify(m2));
console.log(errs.length ? [...new Set(errs)].join('\n') : 'no errors');
await b.close();
