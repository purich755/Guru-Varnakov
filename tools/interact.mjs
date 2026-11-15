// Самопроверка поведения реальными событиями: node tools/interact.mjs [ширина]   URL=… для другого адреса
import { chromium } from 'playwright-core';
const W = Number(process.argv[2] || 1440), mobile = W < 768, H = mobile ? 812 : 900;
const URL = process.env.URL || 'http://localhost:8371/';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const res = [];
const ok = (n, c, x = '') => { res.push(!!c); console.log((c ? 'ok  ' : 'FAIL') + ' ' + n + (x !== '' ? '  [' + x + ']' : '')); };
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: mobile, hasTouch: mobile, locale: 'ru-RU' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('requestfailed', (r) => { if (!/fonts\.g/.test(r.url())) errs.push('failed ' + r.url()); });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2200);
const go = async (sel, off = 0) => { await p.evaluate(([s, o]) => { const el = document.querySelector(s); const sp = el.closest('.pin-spacer') || el; const y = sp.getBoundingClientRect().top + scrollY + o; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); }, [sel, off]); await p.waitForTimeout(900); };
const center = async (sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);

// --- статика
const st = await p.evaluate(() => ({
  h1: document.querySelectorAll('h1').length,
  emptyHref: document.querySelectorAll('a[href="#"], a:not([href])').length,
  imgs: [...document.querySelectorAll('img')].filter((i) => !i.closest('.lb') && !i.closest('.float-preview') && !i.closest('#cat-photo')).filter((i) => !i.hasAttribute('alt') || (!i.getAttribute('alt') && !i.closest('[aria-hidden="true"]')) || !i.getAttribute('width') || !i.getAttribute('height')).map((i) => i.src.split('/').pop()),
  yclients: /yclients|taplink/i.test(document.body.innerHTML),
  forms: document.querySelectorAll('form').length,
  demo: /Демонстрационная версия сайта/.test(document.body.textContent),
  bad: (document.body.textContent.match(/премиальный сервис|индивидуальный подход|мастера своего дела|окунитесь|широкий спектр|высокое качество|изысканн|безупречн|салон вашей мечты|бьюти|лучший салон/gi) || []),
  rating: /рейтинг|★|оцен[ок]{2}/i.test(document.body.textContent),
  storage: false,
  status: document.querySelector('[data-status-text]').textContent,
}));
ok('один h1', st.h1 === 1, st.h1);
ok('нет пустых ссылок', st.emptyHref === 0, st.emptyHref);
ok('у картинок alt/width/height', st.imgs.length === 0, st.imgs.join(','));
ok('нет YCLIENTS/Taplink, форм', !st.yclients && st.forms === 0);
ok('пометка «Демонстрационная версия»', st.demo);
ok('нет запрещённой лексики', st.bad.length === 0, st.bad.join(','));
ok('нет рейтингов', !st.rating);
ok('статус по Москве', /Открыто до 22:00|Откроемся в 10:00|Сегодня закрыто/.test(st.status), st.status);
ok('нет горизонтальной прокрутки', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

// --- цены совпадают с прайсом
const PRICES = ['7 000–12 000 ₽', '5 000–8 000 ₽', '5 000 ₽', '2 000 ₽', '3 000 ₽', 'от 13 000 ₽', 'от 15 000 ₽', '10 000–15 000 ₽', 'от 10 000 ₽', 'от 20 000 ₽', '8 000–15 000 ₽', 'от 8 000 ₽', '3 000 ₽', '4 000–5 000 ₽', '4 000–5 000 ₽', '2 000–8 000 ₽', '2 000 ₽', '7 000–10 000 ₽', 'по запросу', '2 000 ₽', 'по запросу', '19 900 ₽', '69 900 ₽'];
await go('#prices');
const got = [];
for (let k = 0; k < 5; k++) {
  await p.evaluate((k) => document.querySelectorAll('#cat-tabs [role=tab]')[k].click(), k);
  await p.waitForTimeout(500);
  got.push(...(await p.$$eval('.cat__price', (a) => a.map((x) => x.textContent.replace(/ /g, ' ')))));
}
const priceMiss = got.filter((x) => !PRICES.includes(x));
ok('каталог: 25 позиций, все цены из прайса', got.length === 25 && priceMiss.length === 0, got.length + ' ' + priceMiss.join('|'));

// --- зеркало: при прокрутке раскрывается в зал
await p.evaluate(() => window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0)); await p.waitForTimeout(500);
await p.evaluate((h) => window.__lenis ? window.__lenis.scrollTo(h * (innerWidth < 768 ? 1.35 : 2.1), { immediate: true }) : scrollTo(0, h * 2), H); await p.waitForTimeout(1500);
ok('зеркало раскрылось в зал', await p.evaluate(() => +getComputedStyle(document.querySelector('.portal__hall')).opacity > .9 && +getComputedStyle(document.querySelector('.hero__welcome')).opacity > .6));

// --- развеска
await go('#wall-viewport', -60);
const masonry = await p.evaluate(() => document.querySelector('#wall-viewport').classList.contains('is-masonry'));
if (!masonry) {
  const t0 = await p.evaluate(() => document.querySelector('#wall').style.transform);
  const [cx, cy] = await center('#wall-viewport');
  if (mobile) {
    const cdp = await ctx.newCDPSession(p);
    const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await tp('touchStart', cx, cy); for (let i = 1; i <= 8; i++) { await tp('touchMove', cx - i * 22, cy + i * 2); await p.waitForTimeout(16); } await tp('touchEnd');
  } else {
    await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(cx - i * 25, cy - i * 12); await p.waitForTimeout(16); } await p.mouse.up();
  }
  await p.waitForTimeout(700);
  const t1 = await p.evaluate(() => document.querySelector('#wall').style.transform);
  ok('развеска тянется', t0 !== t1, t1);
  await p.focus('#wall-viewport'); const k0 = t1; await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  ok('развеска двигается стрелками', k0 !== (await p.evaluate(() => document.querySelector('#wall').style.transform)));
}
// клик по видимой раме → лайтбокс
const frameXY = await p.evaluate(() => { for (const f of document.querySelectorAll('.wf')) { const r = f.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x > 10 && x < innerWidth - 10 && y > 80 && y < innerHeight - 10 && document.elementFromPoint(x, y)?.closest('.wf') === f) return [x, y]; } return null; });
if (frameXY) {
  await p.mouse.click(frameXY[0], frameXY[1]); await p.waitForTimeout(600);
  ok('рама открывает лайтбокс', await p.evaluate(() => !document.querySelector('#lb').hidden && document.querySelector('#lb-img').src.includes('wall-')));
  const c0 = await p.textContent('#lb-count'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
  ok('лайтбокс листается', c0 !== (await p.textContent('#lb-count')), c0);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  ok('лайтбокс закрывается Esc', await p.evaluate(() => document.querySelector('#lb').hidden));
} else ok('видна рама развески', false);

// --- техники
await go('#tech-list', -120);
await p.click('#tech-b-grade'); await p.waitForTimeout(800);
ok('техника раскрывается в этикетку', await p.evaluate(() => document.querySelector('#tech-b-grade').getAttribute('aria-expanded') === 'true' && document.querySelector('#tech-p-grade').getBoundingClientRect().height > 200));
ok('ссылка WhatsApp с названием техники', await p.evaluate(() => decodeURIComponent(document.querySelector('#tech-p-grade a.btn').href).includes('Хочу узнать про GRADE')));
await p.click('#tech-b-black'); await p.waitForTimeout(800);
ok('открыта одна строка, у «Выхода из чёрного» — цитата', await p.evaluate(() => document.querySelectorAll('.tech__li.is-open').length === 1 && !!document.querySelector('.tech__li.is-open .tech__q')));

// --- GRADE
await go('#grade', 0); await p.waitForTimeout(3600);
const capA = await p.textContent('#grade-cap');
await p.click('.seg [data-mode="0"]'); await p.waitForTimeout(450);
await p.evaluate(() => { const r = document.querySelector('#grade-range'); r.value = 50; r.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(900);
const capB = (await p.textContent('#grade-cap')).replace(/ /g, ' ');
ok('GRADE: режим и ползунок меняют подпись', capB.includes('Чёткая граница') && capA !== capB, capB);
const offs = await p.evaluate(() => [...document.querySelectorAll('#hair-g stop')].map((s) => +s.getAttribute('offset')));
ok('обычное: граница резкая', offs[2] - offs[1] < .01, offs.map((x) => x.toFixed(3)).join(','));
await p.click('.seg [data-mode="1"]'); await p.waitForTimeout(900);
const offs2 = await p.evaluate(() => [...document.querySelectorAll('#hair-g stop')].map((s) => +s.getAttribute('offset')));
ok('GRADE: переход мягкий', offs2[2] - offs2[1] > .2, offs2.map((x) => x.toFixed(3)).join(','));

// --- V-cut: кольцо вращается со скроллом
await go('#vcut', -H * .6); const r0 = await p.evaluate(() => getComputedStyle(document.querySelector('#ring-svg')).transform);
await go('#vcut', H * .3); const r1 = await p.evaluate(() => getComputedStyle(document.querySelector('#ring-svg')).transform);
ok('кольцо V-cut вращается', r0 !== r1);

// --- выставка
await go('#works', mobile ? 0 : H * 1.2);
if (mobile) { await p.evaluate(() => { const r = document.querySelector('#works-rail'), f = document.querySelector('.work'); r.scrollLeft = f.offsetLeft - (innerWidth - f.offsetWidth) / 2; }); await p.waitForTimeout(900); }
const art = await p.evaluate(() => { for (const a of document.querySelectorAll('.work__art')) { const r = a.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x > 0 && x < innerWidth && y > 70 && y < innerHeight && document.elementFromPoint(x, y)?.closest('.work__art') === a) return [x, y]; } return null; });
if (art) {
  if (mobile) {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: art[0], y: art[1] }] }); await p.waitForTimeout(400);
    ok('«до» по удержанию пальцем', await p.evaluate(() => !!document.querySelector('.work__art.is-before')));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300);
  } else {
    await p.mouse.move(art[0], art[1]); await p.waitForTimeout(400);
    ok('«до» по наведению', await p.evaluate(() => !!document.querySelector('.work__art.is-before')));
    await p.mouse.move(5, 300); await p.waitForTimeout(300);
  }
  ok('«после» возвращается', await p.evaluate(() => !document.querySelector('.work__art.is-before')));
} else ok('видна работа', false);
if (!mobile) {
  const x0 = await p.evaluate(() => getComputedStyle(document.querySelector('#works-track')).transform);
  await go('#works', H * 2.6); const x1 = await p.evaluate(() => getComputedStyle(document.querySelector('#works-track')).transform);
  ok('выставка едет горизонтально', x0 !== x1);
}

// --- подбор: все 25 комбинаций
const combos = await p.evaluate(() => { const out = []; for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) out.push(window.__quizPick(a, b)[0]); return out; });
ok('подбор: 25 комбинаций дают услугу', combos.length === 25 && combos.every(Boolean), [...new Set(combos)].join(','));
await go('#quiz', -100);
await p.click('.quiz__opts[data-group="1"] .qo:nth-child(5)'); await p.waitForTimeout(700);
await p.click('.quiz__opts[data-group="2"] .qo:nth-child(1)'); await p.waitForTimeout(900);
const wa = await p.evaluate(() => decodeURIComponent(document.querySelector('.qr .btn')?.href || ''));
ok('результат подбора и текст WhatsApp', wa.includes('Хочу GRADE') && wa.includes('легко — без укладки по утрам') && wa.includes('появляется седина'), wa.slice(0, 160));
await p.click('[data-again]'); await p.waitForTimeout(400);
ok('«Начать заново»', await p.evaluate(() => document.querySelector('#quiz').dataset.step === '1' && !document.querySelector('.qr')));

// --- полка
await go('#shelf', -200);
const obj = await center('.obj--cup');
if (mobile) await p.tap('.obj--cup'); else await p.mouse.move(obj[0], obj[1]);
await p.waitForTimeout(300);
ok('предмет на полке оживает', await p.evaluate(() => document.querySelector('.obj--cup').classList.contains('is-live')));

// --- книга
await go('#book', -120);
const c0 = await p.textContent('#book-count');
await p.click('#book-next'); await p.waitForTimeout(900);
const c1 = await p.textContent('#book-count');
await p.focus('#book'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900);
const c2 = await p.textContent('#book-count');
await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(900);
ok('книга листается кнопкой и стрелками', c0 !== c1 && c1 !== c2 && (await p.textContent('#book-count')) === c1, [c0, c1, c2].join(' / '));

// --- попугай
await p.evaluate(() => window.__lenis ? window.__lenis.scrollTo(document.body.scrollHeight, { immediate: true }) : scrollTo(0, 1e6)); await p.waitForTimeout(1500);
const birds = await p.evaluate(() => [...document.querySelectorAll('.parrot')].map((x) => x.parentElement.id || x.parentElement.className));
ok('попугай перелетел на книгу, второй сидит в финале', birds.includes('perch-book') && birds.includes('perch-final'), birds.join(','));
ok('подвал виден', await p.evaluate(() => { const r = document.querySelector('.ftr').getBoundingClientRect(); return r.top < innerHeight && getComputedStyle(document.querySelector('.ftr')).opacity === '1'; }));
await p.click('#perch-final .parrot'); await p.waitForTimeout(300);
ok('попугай отвечает на клик', await p.evaluate(() => document.querySelector('#perch-final .parrot__say').classList.contains('is-on')));

// --- мобильное меню
if (W <= 1100) {
  await p.click('.burger'); await p.waitForTimeout(400);
  ok('меню открывается', await p.evaluate(() => !document.querySelector('#menu').hidden));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('меню закрывается Esc', await p.evaluate(() => document.querySelector('#menu').hidden));
}
// --- якорь
await p.evaluate(() => window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0)); await p.waitForTimeout(400);
if (W > 1100) { await p.click('.nav a[href="#prices"]'); await p.waitForTimeout(2200); ok('якорь «Цены» доезжает', await p.evaluate(() => Math.abs(document.querySelector('#prices').getBoundingClientRect().top) < 120)); }

ok('консоль чистая', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(`\n${res.filter(Boolean).length}/${res.length}`);
await b.close();
