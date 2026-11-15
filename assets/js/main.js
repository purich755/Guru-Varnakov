/* GURU by Varnakov — демо-сайт. Нативный JS + GSAP/ScrollTrigger (pin, scrub) + Lenis (плавный скролл). */
(() => {
'use strict';

/* ===== ОБЩЕЕ ===== */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMobile = () => innerWidth < 768;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeIO = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const WA = 'https://wa.me/79519110008';
const wa = (text) => WA + '?text=' + encodeURIComponent(text);
const IMG = 'assets/img/';
const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const MOTION = !RM && !!gsap && !!ScrollTrigger;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
let lenis = null;
// простая анимация числа 0→1
function tween(ms, step, done, ease = easeOut) {
  if (RM) { step(1); done && done(); return () => {}; }
  let raf, t0 = performance.now(), stop = false;
  const tick = (now) => { if (stop) return; const t = clamp((now - t0) / ms, 0, 1); step(ease(t)); if (t < 1) raf = requestAnimationFrame(tick); else done && done(); };
  raf = requestAnimationFrame(tick);
  return () => { stop = true; cancelAnimationFrame(raf); };
}
// блокировка прокрутки (меню, лайтбокс)
function lockScroll(on) {
  if (on) { const sb = innerWidth - document.documentElement.clientWidth; document.body.style.setProperty('padding-right', sb + 'px'); document.body.classList.add('is-locked'); lenis && lenis.stop(); }
  else { document.body.style.removeProperty('padding-right'); document.body.classList.remove('is-locked'); lenis && lenis.start(); }
}

/* ===== СТАТУС ПО МОСКОВСКОМУ ВРЕМЕНИ ===== */
const OPEN = 10, CLOSE = 22; // ежедневно
function mskNow() {
  const p = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t)?.value;
  return { h: +g('hour'), m: +g('minute'), wd: g('weekday') };
}
function status() {
  const { h } = mskNow();
  if (h >= OPEN && h < CLOSE) return { open: true, text: 'Открыто до 22:00' };
  if (h < OPEN) return { open: false, text: 'Откроемся в 10:00' };
  return { open: false, text: 'Сегодня закрыто · завтра с 10:00' };
}
function paintStatus() {
  if (document.hidden) return;
  const s = status();
  $$('[data-status]').forEach((n) => { n.classList.toggle('is-open', s.open); const t = $('[data-status-text]', n); if (t.textContent !== s.text) t.textContent = s.text; });
}
paintStatus();
setInterval(paintStatus, 60000);
document.addEventListener('visibilitychange', paintStatus);

/* ===== ССЫЛКИ В WHATSAPP С ГОТОВЫМ ТЕКСТОМ ===== */
$$('a[data-wa]').forEach((a) => { a.href = wa(a.dataset.wa); });

/* ===== ПОЯВЛЕНИЯ ===== */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    if (e.intersectionRatio >= .15 || e.intersectionRect.height >= innerHeight * .28) { e.target.classList.add('is-in'); io.unobserve(e.target); e.target.dispatchEvent(new CustomEvent('rv:in')); }
  }
}, { threshold: [0, .15, .3] });
const observe = (n) => { if (RM) { n.classList.add('is-in'); requestAnimationFrame(() => n.dispatchEvent(new CustomEvent('rv:in'))); } else io.observe(n); };
const whenIn = (n, fn) => { if (n.classList.contains('is-in')) fn(); else n.addEventListener('rv:in', fn, { once: true }); };

/* ===== ПЛАВНЫЙ СКРОЛЛ И ЯКОРЯ ===== */
if (!RM && window.Lenis) {
  lenis = new window.Lenis({ lerp: .085 });
  window.__lenis = lenis; // для самопроверки
  if (gsap && ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.addEventListener('refresh', () => lenis.resize());
  } else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
}
function goTo(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4 });
  else target.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const t = document.getElementById(a.getAttribute('href').slice(1));
  if (!t) return;
  e.preventDefault();
  if (menu.classList.contains('is-open')) toggleMenu(false);
  goTo(t);
});

/* ===== ШАПКА И МЕНЮ ===== */
const hdr = $('#hdr'), menu = $('#menu'), burger = $('.burger');
const onScrollHdr = () => hdr.classList.toggle('is-solid', (window.scrollY || 0) > 80);
addEventListener('scroll', onScrollHdr, { passive: true });
onScrollHdr();
function toggleMenu(open) {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); hdr.classList.add('is-solid'); }
  else { menu.classList.remove('is-open'); menu.hidden = true; onScrollHdr(); burger.focus({ preventScroll: true }); }
  lockScroll(open);
}
burger.addEventListener('click', () => toggleMenu(burger.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', (e) => {
  if (!menu.classList.contains('is-open')) return;
  if (e.key === 'Escape') { toggleMenu(false); return; }
  if (e.key !== 'Tab') return;
  const f = [burger, ...$$('a', menu)], i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
});
addEventListener('resize', () => { if (innerWidth > 1100 && menu.classList.contains('is-open')) toggleMenu(false); });

/* ===== ЖИВОЙ ФОН: параллакс теней листьев ===== */
(() => {
  const a = $('.ambient__shade--a'), b = $('.ambient__shade--b');
  if (!a || RM) return;
  let tile = a.offsetWidth * .7143, queued = false;
  const paint = () => {
    queued = false;
    const y = window.scrollY || 0;
    a.style.transform = `translate3d(0,${-((y * .1) % tile)}px,0)`;
    b.style.transform = `translate3d(0,${-((y * .19 + tile * .4) % tile)}px,0)`;
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', () => { tile = a.offsetWidth * .7143; ask(); });
  paint();
})();

/* ===== ЗАЛ 0. ЗЕРКАЛО ===== */
const pins = []; // пины создаются раньше остальных ScrollTrigger
(() => {
  const stage = $('.hero__stage'), portal = $('.portal'), mirror = $('.portal__mirror'), frame = $('.mirror-frame');
  const portrait = $('.portal__portrait'), glass = $('.portal__glass');
  // отражение и блик
  if (HOVER && !RM) {
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, live = false;
    const loop = () => {
      x = lerp(x, tx, .08); y = lerp(y, ty, .08);
      portrait.style.transform = `translate3d(${(-x * 10).toFixed(2)}px,${(-y * 8).toFixed(2)}px,0)`;
      glass.style.backgroundPosition = `${(30 + x * 26).toFixed(2)}% 0`;
      if (live || Math.abs(x - tx) > .002 || Math.abs(y - ty) > .002) raf = requestAnimationFrame(loop); else raf = 0;
    };
    stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1; live = true; if (!raf) raf = requestAnimationFrame(loop); });
    stage.addEventListener('pointerleave', () => { tx = ty = 0; live = false; });
  }
  if (!MOTION) return;
  const rect = () => { const s = stage.getBoundingClientRect(), m = mirror.getBoundingClientRect(); return { s, m, t: m.top - s.top, r: s.right - m.right, b: s.bottom - m.bottom, l: m.left - s.left }; };
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.hero', start: 'top top', end: () => '+=' + (isMobile() ? 140 : 220) + '%', pin: stage, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 } });
  tl.fromTo('.hl--1', { x: 0, opacity: 1 }, { x: () => -innerWidth * .12, opacity: 0, duration: .36, ease: 'power1.in', immediateRender: false }, 0)
    .fromTo('.hl--2', { x: 0, opacity: 1 }, { x: () => innerWidth * .12, opacity: 0, duration: .36, ease: 'power1.in', immediateRender: false }, 0)
    .fromTo(['.hero__copy', '.hero__label', '.hero__enter'], { opacity: 1 }, { opacity: 0, duration: .22, immediateRender: false }, 0);
  $$('.hero__leaf').forEach((leaf, i) => {
    const dir = i === 0 || i === 3 ? -1 : 1, depth = +leaf.dataset.depth || 1;
    tl.fromTo(leaf, { x: 0, scale: 1, opacity: 1 }, { x: () => dir * innerWidth * .3 * depth, scale: 1.15, opacity: 1, duration: .42, ease: 'power1.in', immediateRender: false }, 0);
  });
  tl.fromTo(portal, { clipPath: () => { const q = rect(); return `inset(${q.t}px ${q.r}px ${q.b}px ${q.l}px)`; } }, { clipPath: 'inset(0px 0px 0px 0px)', duration: .55, ease: 'power2.inOut', immediateRender: false }, .2)
    .fromTo(frame, { x: 0, y: 0, scaleX: 1, scaleY: 1 }, { x: () => -rect().l, y: () => -rect().t, scaleX: () => { const q = rect(); return q.s.width / q.m.width; }, scaleY: () => { const q = rect(); return q.s.height / q.m.height; }, transformOrigin: '0 0', duration: .55, ease: 'power2.inOut', immediateRender: false }, .2)
    .to(frame, { opacity: 0, duration: .25 }, .42)
    .to('.portal__hall', { opacity: 1, duration: .3 }, .2)
    .fromTo('.portal__hall img', { scale: 1.1 }, { scale: 1, duration: .62, ease: 'power1.out', immediateRender: false }, .22)
    .to(mirror, { opacity: 0, scale: 1.16, duration: .3 }, .4)
    .to('.hero__light', { opacity: 0, duration: .3 }, .3)
    .to('.portal__shade', { opacity: 1, duration: .18 }, .78)
    .fromTo('.hero__welcome', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .18, immediateRender: false }, .8);
  pins.push(tl);
})();

/* ===== ЛАЙТБОКС (общий) ===== */
const LB = (() => {
  const box = $('#lb'), img = $('#lb-img'), cap = $('#lb-cap'), count = $('#lb-count');
  let items = [], i = 0, back = null;
  const pad = (n) => String(n).padStart(2, '0');
  function show(k, origin) {
    i = (k + items.length) % items.length;
    const it = items[i];
    img.onload = null;
    img.src = it.src; img.alt = it.alt || '';
    cap.innerHTML = it.label;
    count.textContent = `${pad(i + 1)} / ${pad(items.length)}`;
    [items[i + 1], items[i - 1]].forEach((n) => { if (n) new Image().src = n.src; });
    if (origin && !RM) {
      const play = () => {
        const a = origin.getBoundingClientRect(), b = img.getBoundingClientRect();
        if (!b.width) return;
        img.animate([{ transform: `translate(${a.left + a.width / 2 - b.left - b.width / 2}px,${a.top + a.height / 2 - b.top - b.height / 2}px) scale(${a.width / b.width})`, opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 400, easing: 'cubic-bezier(.16,1,.3,1)' });
      };
      if (img.complete && img.naturalWidth) play(); else img.onload = () => { img.onload = null; play(); };
    }
  }
  function open(list, k, origin) {
    items = list; back = origin || document.activeElement;
    box.hidden = false; lockScroll(true);
    $$('.lb__arr', box).forEach((b) => { b.hidden = items.length < 2; });
    count.hidden = items.length < 2;
    show(k, origin);
    requestAnimationFrame(() => { box.classList.add('is-open'); $('.lb__x', box).focus({ preventScroll: true }); });
  }
  function close() {
    box.classList.remove('is-open'); box.hidden = true; lockScroll(false);
    back && back.focus && back.focus({ preventScroll: true });
  }
  box.addEventListener('click', (e) => {
    if (e.target.closest('.lb__x') || e.target === box || e.target.classList.contains('lb__fig')) close();
    else if (e.target.closest('.lb__arr--p')) show(i - 1);
    else if (e.target.closest('.lb__arr--n')) show(i + 1);
  });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && items.length > 1) show(i - 1);
    else if (e.key === 'ArrowRight' && items.length > 1) show(i + 1);
    else if (e.key === 'Tab') {
      const f = $$('button:not([hidden])', box), k = f.indexOf(document.activeElement);
      e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  let sx = null;
  box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => { if (sx === null || items.length < 2) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); }, { passive: true });
  return { open };
})();
const labelHTML = (no, title, ...meta) => `<span class="label__no">${no}</span><span class="label__title">${title}</span>${meta.filter(Boolean).map((m) => `<span class="label__meta">${m}</span>`).join('')}`;

/* ===== ЗАЛ II. ШПАЛЕРНАЯ РАЗВЕСКА ===== */
// координаты — в единицах стены 2190 × 1000; рамы почти вплотную, «линия глаз» посередине
const WALL_W = 2190, WALL_H = 1000;
const WALL = [
  { n: 12, x: 90, y: 130, w: 250, r: 2 / 3, t: 'Клетка в нише', alt: 'Картина с птицей и клетка в нише белой стены' },
  { n: 8, x: 90, y: 519, w: 250, r: 1, mat: 1, t: 'Свечи на подносе', alt: 'Две свечи на латунном подносе, стол из спила дерева' },
  { n: 7, x: 354, y: 200, w: 330, r: 3 / 2, t: 'Рабочая зона', alt: 'Рабочая зона: зеркала в чёрных рамах и кресла мастеров' },
  { n: 2, x: 354, y: 434, w: 330, r: 3 / 4, t: 'Горчичное кресло', alt: 'Горчичное кресло у окна среди растений' },
  { n: 11, x: 698, y: 300, w: 190, r: 1, mat: 1, t: 'Чашка на спиле', alt: 'Чашка на столе из спила дерева' },
  { n: 6, x: 698, y: 504, w: 190, r: 2 / 3, t: 'Зеркало с лампами', alt: 'Зеркало с лампами и ветка растения' },
  { n: 9, x: 902, y: 66, w: 293, r: 4 / 3, t: 'Вывеска GURU', alt: 'Надпись GURU на стене и картина под ней' },
  { n: 3, x: 1209, y: 91, w: 293, r: 3 / 2, mat: 1, t: 'Жители зала', alt: 'Два волнистых попугайчика — зелёный и голубой' },
  { n: 1, x: 902, y: 300, w: 600, r: 3 / 2, t: 'Зал, вид сквозь зелень', alt: 'Зал GURU: кресла, стол из спила и красный ковёр, на переднем плане — листья' },
  { n: 14, x: 902, y: 714, w: 280, r: 4 / 3, t: 'Живопись на стене', alt: 'Картина-коллаж на зелёной стене, рядом растения' },
  { n: 13, x: 1196, y: 714, w: 262, r: 5 / 4, mat: 1, t: 'Вход с улицы', alt: 'Розовый фасад и вход в GURU, шезлонги на траве' },
  { n: 5, x: 1516, y: 150, w: 300, r: 4 / 5, t: 'Стол из спила', alt: 'Стол из спила дерева с чайной посудой, красный ковёр с орнаментом' },
  { n: 4, x: 1516, y: 539, w: 300, r: 3 / 4, t: 'Пластинка', alt: 'Проигрыватель с виниловой пластинкой' },
  { n: 10, x: 1830, y: 250, w: 270, r: 3 / 4, t: 'Ковёр и лемур', alt: 'Лемур сидит на красном ковре с орнаментом' },
];
const WNOTES = [
  { text: 'здесь живут попугаи', x: 1512, y: 62, r: -5, arrow: 'l' },
  { text: 'кресло, из которого не&nbsp;хочется вставать', x: 368, y: 902, r: -3, arrow: 'u' },
  { text: 'музыка — с&nbsp;патефона', x: 1838, y: 700, r: 4, arrow: 'l' },
  { text: 'спил дерева, а&nbsp;не&nbsp;пластик', x: 1838, y: 168, r: -4, arrow: 'l' },
];
const ARROWS = { // неровные стрелки-завитки, нарисованы от руки
  l: '<svg viewBox="0 0 60 36"><path pathLength="1" d="M56 9C44 3 30 4 22 11c-7 6-5 15 3 15 7 0 8-9 1-10-8-1-16 3-22 11"/><path pathLength="1" d="M3 16l1 11 11-2"/></svg>',
  u: '<svg viewBox="0 0 60 36"><path pathLength="1" d="M54 30C42 34 27 32 21 24c-5-7 0-15 7-13 6 2 4 10-3 9C16 19 9 12 6 4"/><path pathLength="1" d="M2 14 6 4l9 5"/></svg>',
};
const wallAPI = (() => {
  const vp = $('#wall-viewport'), wall = $('#wall'), hint = $('#wall-hint'), map = $('#wall-map'), mapView = $('.wall-map__view');
  const frames = [];
  const items = WALL.map((f) => ({ src: `${IMG}wall/wall-${String(f.n).padStart(2, '0')}.webp`, alt: f.alt, label: '' }));
  const cx = WALL_W / 2, cy = WALL_H / 2;
  WALL.forEach((f, k) => {
    const h = f.w / f.r, no = String(k + 1).padStart(2, '0');
    items[k].label = labelHTML('№&nbsp;' + no, f.t, 'Пространство GURU · Пожарского, 6А');
    const dist = Math.hypot(f.x + f.w / 2 - cx, f.y + h / 2 - cy);
    const b = el(`<button type="button" class="wf${f.mat ? ' wf--mat' : ''}" data-cursor="view" aria-label="№ ${no}. ${f.t} — открыть фото"><img src="${items[k].src}" width="${Math.round(f.w * 3)}" height="${Math.round(h * 3)}" alt="${f.alt}" loading="lazy" decoding="async" draggable="false"></button>`);
    b.style.cssText = `left:${(f.x / WALL_W * 100).toFixed(3)}%;top:${(f.y / WALL_H * 100).toFixed(3)}%;width:${(f.w / WALL_W * 100).toFixed(3)}%;aspect-ratio:${f.w} / ${h.toFixed(1)};--d:${Math.round(dist * .6)}ms`;
    b.addEventListener('click', (e) => { if (dragged) { e.preventDefault(); return; } LB.open(items, k, b); });
    wall.appendChild(b); frames.push(b);
    const m = document.createElement('i');
    m.style.cssText = `left:${f.x / WALL_W * 100}%;top:${f.y / WALL_H * 100}%;width:${f.w / WALL_W * 100}%;height:${h / WALL_H * 100}%`;
    map.insertBefore(m, mapView);
  });
  const notes = WNOTES.map((n) => {
    const d = el(`<p class="wnote" aria-hidden="true">${n.arrow === 'l' ? ARROWS.l : ''}<span>${n.text}</span>${n.arrow === 'u' ? ARROWS.u : ''}</p>`);
    d.style.cssText = `left:${n.x / WALL_W * 100}%;top:${n.y / WALL_H * 100}%;--r:${n.r}deg`;
    wall.appendChild(d);
    return { d, x: n.x, y: n.y, on: false };
  });
  // насест для попугая — на раме с попугайчиками
  const pf = WALL.findIndex((f) => f.n === 3);
  const perch = el('<span class="perch perch--wall" aria-hidden="true"></span>');
  perch.style.cssText = `position:absolute;left:${((WALL[pf].x + WALL[pf].w * .56) / WALL_W * 100).toFixed(3)}%;top:${(WALL[pf].y / WALL_H * 100).toFixed(3)}%`;
  wall.appendChild(perch);

  let dragged = false;
  const masonry = RM || innerWidth < 380;
  if (masonry) { vp.classList.add('is-masonry'); vp.removeAttribute('tabindex'); vp.removeAttribute('data-cursor'); return { perch: null, frame: frames[pf] }; }

  let vw = 0, vh = 0, ww = 0, wh = 0, x = 0, y = 0, vx = 0, vy = 0, raf = 0, dragging = false, cancelAnim = null, touched = false;
  const measure = () => { vw = vp.clientWidth; vh = vp.clientHeight; ww = wall.offsetWidth; wh = wall.offsetHeight; };
  const minX = () => Math.min(0, vw - ww), minY = () => Math.min(0, vh - wh);
  const rubber = (v, lo) => (v > 0 ? v * .35 : v < lo ? lo + (v - lo) * .35 : v);
  function render() {
    wall.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    const k = map.clientWidth / ww;
    mapView.style.width = vw * k + 'px'; mapView.style.height = vh * k + 'px';
    mapView.style.transform = `translate(${(-x * k).toFixed(1)}px,${(-y * k).toFixed(1)}px)`;
    const s = ww / WALL_W;
    for (const n of notes) if (!n.on) { const px = n.x * s + x, py = n.y * s + y; if (px > -40 && px < vw - 80 && py > 0 && py < vh - 20) { n.on = true; n.d.classList.add('is-in'); } }
  }
  function inertia() {
    cancelAnimationFrame(raf);
    const step = () => {
      if (dragging) return;
      x += vx; y += vy; vx *= .93; vy *= .93;
      const lx = minX(), ly = minY();
      if (x > 0) { x = lerp(x, 0, .18); vx *= .6; } else if (x < lx) { x = lerp(x, lx, .18); vx *= .6; }
      if (y > 0) { y = lerp(y, 0, .18); vy *= .6; } else if (y < ly) { y = lerp(y, ly, .18); vy *= .6; }
      render();
      const out = x > .5 || x < lx - .5 || y > .5 || y < ly - .5;
      if (Math.abs(vx) > .08 || Math.abs(vy) > .08 || out) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function moveTo(nx, ny, ms = 700) {
    cancelAnim && cancelAnim(); cancelAnimationFrame(raf);
    const x0 = x, y0 = y; nx = clamp(nx, minX(), 0); ny = clamp(ny, minY(), 0);
    cancelAnim = tween(ms, (t) => { x = lerp(x0, nx, t); y = lerp(y0, ny, t); render(); }, null, easeIO);
  }
  const firstTouch = () => { if (!touched) { touched = true; hint.classList.add('is-off'); } cancelAnim && cancelAnim(); };
  // мышь и перо
  let px = 0, py = 0, sx = 0, sy = 0, lastT = 0;
  vp.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0 || e.target.closest('.wall-map') || e.target.closest('.parrot')) return;
    e.preventDefault(); firstTouch();
    dragging = true; dragged = false; vp.classList.add('is-drag'); cancelAnimationFrame(raf);
    px = sx = e.clientX; py = sy = e.clientY; vx = vy = 0; lastT = performance.now();
    const move = (ev) => {
      const dx = ev.clientX - px, dy = ev.clientY - py; px = ev.clientX; py = ev.clientY;
      if (Math.hypot(px - sx, py - sy) > 6) dragged = true;
      x = rubberMove(x, dx, minX()); y = rubberMove(y, dy, minY());
      vx = dx; vy = dy; lastT = performance.now(); render();
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      dragging = false; vp.classList.remove('is-drag');
      if (performance.now() - lastT > 80) vx = vy = 0;
      inertia();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  });
  function rubberMove(v, d, lo) { const out = v > 0 || v < lo; return v + (out ? d * .35 : d); }
  vp.addEventListener('dragstart', (e) => e.preventDefault());
  // касание: стена забирает жест, только если первое движение горизонтальное или палец удерживали 250 мс
  let tmode = null, t0 = 0;
  vp.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || e.target.closest('.parrot')) { tmode = null; return; }
    const t = e.touches[0]; px = sx = t.clientX; py = sy = t.clientY; t0 = performance.now(); tmode = 'wait'; dragged = false; vx = vy = 0;
    cancelAnimationFrame(raf);
  }, { passive: true });
  vp.addEventListener('touchmove', (e) => {
    if (!tmode || tmode === 'scroll') return;
    const t = e.touches[0], dx = t.clientX - px, dy = t.clientY - py;
    if (tmode === 'wait') {
      const ax = Math.abs(t.clientX - sx), ay = Math.abs(t.clientY - sy);
      if (ax < 4 && ay < 4) return;
      if (ax > ay || performance.now() - t0 > 250) { tmode = 'drag'; dragging = true; dragged = true; firstTouch(); } else { tmode = 'scroll'; return; }
    }
    if (e.cancelable) e.preventDefault();
    px = t.clientX; py = t.clientY;
    x = rubberMove(x, dx, minX()); y = rubberMove(y, dy, minY()); vx = dx; vy = dy; lastT = performance.now(); render();
  }, { passive: false });
  const tend = () => { if (tmode === 'drag') { dragging = false; if (performance.now() - lastT > 80) vx = vy = 0; inertia(); } tmode = null; };
  vp.addEventListener('touchend', tend, { passive: true });
  vp.addEventListener('touchcancel', tend, { passive: true });
  // клавиатура
  vp.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [120, 0], ArrowRight: [-120, 0], ArrowUp: [0, 120], ArrowDown: [0, -120] }[e.key];
    if (!d || e.target !== vp) return;
    e.preventDefault(); firstTouch(); moveTo(x + d[0], y + d[1], 320);
  });
  // рама в фокусе с клавиатуры — подвести её в поле зрения
  wall.addEventListener('focusin', (e) => {
    const b = e.target.closest('.wf'); if (!b || !b.matches(':focus-visible')) return;
    vp.scrollLeft = 0; vp.scrollTop = 0;
    moveTo(-(b.offsetLeft + b.offsetWidth / 2 - vw / 2), -(b.offsetTop + b.offsetHeight / 2 - vh / 2), 420);
  });
  map.addEventListener('click', (e) => {
    const r = map.getBoundingClientRect(); firstTouch();
    moveTo(-((e.clientX - r.left) / r.width * ww - vw / 2), -((e.clientY - r.top) / r.height * wh - vh / 2));
  });
  const center = () => { measure(); x = (vw - ww) / 2; y = (vh - wh) / 2; render(); };
  center();
  let rw = innerWidth;
  addEventListener('resize', () => { if (innerWidth === rw) { measure(); return; } rw = innerWidth; center(); });
  // подсказка: одно плавное смещение туда-обратно
  whenIn(vp, () => {
    measure();
    setTimeout(() => {
      if (touched) return;
      const x0 = x, y0 = y, dx = -ww * .06, dy = -wh * .05;
      cancelAnim = tween(2200, (t) => { const k = Math.sin(t * Math.PI); x = x0 + dx * k; y = y0 + dy * k; render(); }, null, (t) => t);
    }, 1500);
  });
  return { perch, frame: frames[pf], vp };
})();

/* ===== ЗАЛ VI. ВЫСТАВКА «ДО / ПОСЛЕ» (pin создаётся до остальных триггеров) ===== */
const WORKS = ['окрашивание', 'окрашивание', 'окрашивание', 'работа GURU', 'окрашивание', 'окрашивание', 'стрижка', 'окрашивание', 'работа GURU', 'окрашивание', 'окрашивание', 'окрашивание'];
const WORK_ALT = ['тёмные кудри → пепельный блонд', 'чёрный → каштановый', 'русый с чёлкой → платиновое каре', 'прямые волосы → объёмные локоны', 'ровный тёмный → слои с бликами', 'жёлтый блонд → холодный блонд', 'длинные тёмные → гладкое каре', 'русый → светлые волны', 'пушистые волосы → гладкие волны', 'светлые кудри → пепельно-русый', 'русый → холодный блонд с переходом', 'светлое каре → тёмное каре'];
(() => {
  const sec = $('.h6'), stage = $('.h6__stage'), rail = $('#works-rail'), track = $('#works-track'), floor = $('#works-floor');
  const H = [58, 50, 62, 48, 56, 64, 50, 60, 47, 58, 52, 62], Y = [-3, 5, -6, 7, -2, 0, 6, -5, 4, -7, 3, -2];
  const figs = WORKS.map((cat, k) => {
    const no = String(k + 1).padStart(2, '0');
    const f = el(`<figure class="work"><button type="button" class="work__art art art--bare" data-cursor="before" aria-pressed="false" aria-label="Работа № ${no}, ${cat}: ${WORK_ALT[k]}. Удерживайте, чтобы увидеть «до»">
      <img class="work__before" src="${IMG}works/work-${no}-before.webp" width="700" height="1050" alt="До: ${WORK_ALT[k].split(' → ')[0]}" loading="lazy" decoding="async" draggable="false">
      <img class="work__after" src="${IMG}works/work-${no}-after.webp" width="700" height="1050" alt="После: ${WORK_ALT[k].split(' → ')[1]}" loading="lazy" decoding="async" draggable="false">
      <span class="work__tag" aria-hidden="true">До</span><span class="work__eye" aria-hidden="true"><svg><use href="#i-eye"/></svg>До</span></button>
      <figcaption class="label"><span class="label__no">№&nbsp;${no}</span><span class="label__title">${cat}</span></figcaption></figure>`);
    f.style.cssText = `--h:${H[k]};--y:${Y[k]}`;
    track.appendChild(f);
    floor.appendChild(el(`<li>${no}</li>`));
    return f;
  });
  track.appendChild(el(`<div class="work work--more art"><a href="https://vk.ru/gurubyvarnakov" target="_blank" rel="noopener">Ещё больше работ — в&nbsp;альбомах ВКонтакте&nbsp;→<span>vk.ru/gurubyvarnakov</span></a></div>`)).style.cssText = '--h:52;--y:1';
  // показать «до»: наведение, удержание пальцем, пробел
  figs.forEach((f) => {
    const b = $('.work__art', f);
    const set = (on) => { b.classList.toggle('is-before', on); b.setAttribute('aria-pressed', String(on)); };
    let timer = 0, sx = 0, sy = 0;
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') set(true); });
    b.addEventListener('pointerleave', () => { clearTimeout(timer); set(false); });
    b.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; clearTimeout(timer); timer = setTimeout(() => set(true), 120); });
    b.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) { clearTimeout(timer); set(false); } });
    ['pointerup', 'pointercancel'].forEach((t) => b.addEventListener(t, (e) => { if (e.pointerType !== 'mouse') { clearTimeout(timer); set(false); } }));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); set(true); } });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') set(false); });
    b.addEventListener('blur', () => set(false));
  });
  const marks = $$('li', floor);
  let centers = [], cur = -1;
  const measure = () => { centers = figs.map((f) => f.offsetLeft + f.offsetWidth / 2); };
  function light(offset) {
    const mid = innerWidth / 2; let best = 0, bd = 1e9;
    centers.forEach((c, k) => {
      const d = Math.abs(c + offset - mid), lit = clamp(1 - d / (innerWidth * .42), 0, 1);
      figs[k].style.setProperty('--lit', lit.toFixed(3));
      if (d < bd) { bd = d; best = k; }
    });
    if (best !== cur) { cur = best; marks.forEach((m, k) => m.classList.toggle('is-cur', k === best)); }
  }
  const pinned = MOTION && innerWidth >= 768 && innerHeight >= 560;
  if (pinned) {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: stage, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1, onRefresh: () => { measure(); light(0); }, onUpdate: () => light(gsap.getProperty(track, 'x')) } });
    pins.push(tw);
    // клавиатура: рама в фокусе — прокрутить к ней
    track.addEventListener('focusin', (e) => {
      const f = e.target.closest('.work'); if (!f || !e.target.matches(':focus-visible')) return;
      rail.scrollLeft = 0;
      const st = tw.scrollTrigger, k = clamp((f.offsetLeft + f.offsetWidth / 2 - innerWidth / 2) / dist(), 0, 1);
      const yv = st.start + (st.end - st.start) * k;
      lenis ? lenis.scrollTo(yv, { duration: .8 }) : scrollTo(0, yv);
    });
  } else {
    sec.classList.add('is-rail');
  }
})();

/* ===== ЗАЛ III. АВТОРСКИЕ ТЕХНИКИ ===== */
const TECHS = [
  { id: 'grade', name: 'GRADE', gist: 'окрашивание, которое отрастает незаметно', price: 'от&nbsp;13&nbsp;000&nbsp;₽', kind: 'Авторское окрашивание', time: 'около 2&nbsp;ч', text: 'Мягкие переливы бликов и&nbsp;объём. Камуфлирует седину, отрастает невидимо, переход к&nbsp;блонду&nbsp;— без потери качества. Эффект сохраняется до&nbsp;года.', alt: 'Работа GURU: светлые пряди с мягким переходом от корней' },
  { id: 'vcut', name: 'V-cut', gist: 'стрижка, после которой почти не&nbsp;нужна укладка', price: '7&nbsp;000–12&nbsp;000&nbsp;₽', kind: 'Авторская стрижка', time: 'около 1&nbsp;ч', text: 'Форма и&nbsp;текстура создаются одновременно, весь срез&nbsp;— точечный. Объём раскрывается на&nbsp;360°. Делается раз в&nbsp;год, на&nbsp;любой длине от&nbsp;плеч.', alt: 'Работа GURU: медные волосы, стрижка слоями' },
  { id: 'image', name: 'Смена образа', gist: '«что в&nbsp;голове&nbsp;— то и&nbsp;на&nbsp;голове»', price: 'от&nbsp;15&nbsp;000&nbsp;₽', kind: 'Авторский метод', time: 'около 2&nbsp;ч', text: 'Авторский метод Ильи: сначала разговор о&nbsp;том, какой вы хотите себя видеть, потом&nbsp;— образ, который с&nbsp;этим совпадает.', alt: 'Работа GURU: тёмное гладкое каре' },
  { id: 'nature', name: 'Back to Nature', gist: 'вернуть свой цвет за&nbsp;один визит', price: 'от&nbsp;10&nbsp;000&nbsp;₽', kind: 'Возвращение натурального цвета', time: 'около 3&nbsp;ч', text: 'Вернуть свой натуральный цвет за&nbsp;один раз после экспериментов&nbsp;— и&nbsp;вместе с&nbsp;ним качество волос.', alt: 'Работа GURU: натуральный каштановый цвет, длинные волосы' },
  { id: 'black', name: 'Выход из чёрного', gist: 'то, за&nbsp;что не&nbsp;берутся другие', price: 'от&nbsp;20&nbsp;000&nbsp;₽', kind: 'Сложное окрашивание', time: 'около 5&nbsp;ч', text: 'Выход из&nbsp;многолетнего тёмного цвета за&nbsp;один раз с&nbsp;сохранением качества волос.', quote: '«Это не&nbsp;волшебство. Это не&nbsp;магия. Это профессионализм&nbsp;— брать ответственность и&nbsp;гарантировать результат»', flag: 'Сначала&nbsp;— консультация', alt: 'Работа GURU: пепельно-серебристые локоны, руки мастера' },
  { id: 'blonde', name: 'Total blonde', gist: 'идеальный&nbsp;— или никакой', price: 'от&nbsp;15&nbsp;000&nbsp;₽', kind: 'Окрашивание', time: 'около 3&nbsp;ч', text: 'Чистый, прозрачный, сияющий блонд&nbsp;— одна из&nbsp;самых сложных задач колориста.', alt: 'Работа GURU: длинные платиновые волосы' },
];
const plain = (s) => s.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '');
(() => {
  const list = $('#tech-list'), fp = $('#float-preview'), fpImg = $('img', fp);
  TECHS.forEach((t, k) => {
    const no = String(k + 1).padStart(2, '0'), src = `${IMG}tech/tech-${t.id}.webp`;
    const li = el(`<li class="tech__li reveal" style="--i:${k}">
      <button type="button" class="tech__row" aria-expanded="false" aria-controls="tech-p-${t.id}" id="tech-b-${t.id}">
        <span class="tech__no">№&nbsp;${no}</span><span class="tech__name">${t.name}</span><span class="tech__gist">${t.gist}</span><span class="tech__price">${t.price}</span><span class="tech__plus" aria-hidden="true"></span>
      </button>
      <div class="tech__panel" id="tech-p-${t.id}" role="region" aria-labelledby="tech-b-${t.id}"><div class="tech__in"><div class="tech__body">
        <button type="button" class="art tech__photo" data-cursor="view" aria-label="Открыть фото: ${t.alt}"><img src="${src}" width="720" height="960" alt="${t.alt}" loading="lazy" decoding="async"></button>
        <div class="tech__info">
          <div class="label">${labelHTML('№&nbsp;' + no, t.name, 'Автор: Илья Варнаков', `${t.kind} · ${t.time}`, t.text)}<span class="label__price">${t.price}</span></div>
          ${t.quote ? `<p class="tech__q">${t.quote}</p>` : ''}${t.flag ? `<p class="tech__flag">${t.flag}</p>` : ''}
          <a class="btn" href="${wa('Здравствуйте, Илья! Хочу узнать про ' + plain(t.name))}" target="_blank" rel="noopener"><span>Спросить, подойдёт ли мне</span><i aria-hidden="true">→</i></a>
        </div></div></div></div></li>`);
    list.appendChild(li);
    const row = $('.tech__row', li);
    row.addEventListener('click', () => {
      const open = !li.classList.contains('is-open');
      $$('.tech__li.is-open', list).forEach((o) => { o.classList.remove('is-open'); $('.tech__row', o).setAttribute('aria-expanded', 'false'); });
      li.classList.toggle('is-open', open); row.setAttribute('aria-expanded', String(open));
      fp.classList.remove('is-on');
      if (MOTION) setTimeout(() => ScrollTrigger.refresh(), 650);
    });
    $('.tech__photo', li).addEventListener('click', (e) => LB.open([{ src, alt: t.alt, label: labelHTML('№&nbsp;' + no, 'Работа GURU', 'Зал III · авторские техники') }], 0, e.currentTarget));
    if (HOVER && !RM) {
      row.addEventListener('mouseenter', () => { list.classList.add('is-hover'); li.classList.add('is-hot'); if (li.classList.contains('is-open')) return; fpImg.src = src; fp.classList.add('is-on'); });
      row.addEventListener('mouseleave', () => { list.classList.remove('is-hover'); li.classList.remove('is-hot'); fp.classList.remove('is-on'); });
    }
  });
  if (HOVER && !RM) {
    TECHS.forEach((t) => { new Image().src = `${IMG}tech/tech-${t.id}.webp`; });
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, rot = 0;
    const loop = () => {
      const px = x; x = lerp(x, tx, .12); y = lerp(y, ty, .12);
      rot = lerp(rot, clamp((x - px) * .5, -6, 6), .2);
      fp.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;
      raf = fp.classList.contains('is-on') || Math.abs(x - tx) > .5 ? requestAnimationFrame(loop) : 0;
    };
    list.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; if (!raf) { if (!fp.classList.contains('is-on')) { x = tx; y = ty; } raf = requestAnimationFrame(loop); } });
  }
})();

/* ===== ЗАЛ IV. СИМУЛЯТОР ОТРАСТАНИЯ GRADE ===== */
(() => {
  const svg = $('#strand-svg'), fig = $('#strand'), range = $('#grade-range'), cap = $('#grade-cap'), seg = $('.seg');
  const NS = 'http://www.w3.org/2000/svg';
  const N = innerWidth < 480 ? 46 : 70;
  let seed = 20251114;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  svg.innerHTML = `<defs>
    <linearGradient id="hair-g" gradientUnits="userSpaceOnUse" x1="0" y1="24" x2="0" y2="624"><stop offset="0"/><stop offset="0"/><stop offset="0"/><stop offset="1"/></linearGradient>
    <linearGradient id="hair-h" gradientUnits="userSpaceOnUse" x1="0" y1="24" x2="0" y2="624"><stop offset="0" stop-color="#D9BE8E"/><stop offset=".35" stop-color="#F3E2C2"/><stop offset="1" stop-color="#F6E9CF"/></linearGradient></defs>
    <g id="hair-all" fill="none" stroke-linecap="round"></g><g id="hair-hi" fill="none" stroke-linecap="round" stroke="url(#hair-h)"></g>`;
  const all = $('#hair-all', svg), hi = $('#hair-hi', svg);
  const mk = (x0, w, target) => {
    const sway = (rnd() - .5) * 26, x1 = 160 + (x0 - 160) * .78 + sway, a = (rnd() - .5) * 34, b = (rnd() - .5) * 30;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${x0.toFixed(1)} 24C${(x0 + a).toFixed(1)} ${(200 + rnd() * 40).toFixed(0)} ${(x1 + b).toFixed(1)} ${(400 + rnd() * 50).toFixed(0)} ${x1.toFixed(1)} ${(600 + rnd() * 24).toFixed(0)}`);
    p.setAttribute('stroke-width', w.toFixed(2));
    target.appendChild(p);
    return p;
  };
  const hairs = [];
  for (let i = 0; i < N; i++) { const p = mk(52 + (216 * i) / (N - 1) + (rnd() - .5) * 5, 1.6 + rnd() * 1.8, all); p.setAttribute('stroke', 'url(#hair-g)'); hairs.push(p); }
  const his = [72, 124, 181, 236].map((x0) => mk(x0 + (rnd() - .5) * 10, 2.6 + rnd(), hi));
  const stops = $$('#hair-g stop', svg);
  const ROOT = [107, 78, 55], BLONDE = [230, 207, 166], HI = [243, 226, 194];
  const G = [0, .08, .2, .38, .62]; // доля отросших корней: сегодня … год
  const mix = (a, b, t) => `rgb(${a.map((v, k) => Math.round(lerp(v, b[k], t))).join(',')})`;
  const regrow = (v) => { const p = clamp(v / 25, 0, 4), k = Math.min(3, Math.floor(p)); return lerp(G[k], G[k + 1], p - k); };
  let mode = 1, m = 1, val = 0, cancelMode = null, userTouched = false, cancelDemo = null;
  function paint() {
    const g = regrow(val);
    const o1 = lerp(g, g * .6, m), o2 = lerp(g + .005, g + .18, m);
    stops[0].setAttribute('stop-color', mix(BLONDE, ROOT, g > .004 || m > .01 ? 1 : 0));
    stops[1].setAttribute('offset', o1.toFixed(4)); stops[1].setAttribute('stop-color', mix(BLONDE, ROOT, g > .004 || m > .01 ? 1 : 0));
    stops[2].setAttribute('offset', Math.min(.98, o2).toFixed(4)); stops[2].setAttribute('stop-color', mix(BLONDE, HI, m));
    stops[3].setAttribute('stop-color', mix(BLONDE, BLONDE, 0));
    hi.setAttribute('opacity', (m * .9).toFixed(3));
  }
  const CAPS = [
    ['Ровный цвет. Пока всё хорошо', 'У&nbsp;корней появляется полоса', 'Чёткая граница у&nbsp;корней. Пора подкрашивать', 'Граница видна издалека', 'Два разных цвета на&nbsp;одной голове'],
    ['Мягкие переливы от&nbsp;вашего цвета к&nbsp;светлому', 'Отросшие корни растворяются в&nbsp;бликах', 'Переход по-прежнему мягкий. Никто не&nbsp;видит, где ваш цвет, а&nbsp;где&nbsp;— нет', 'Можно не&nbsp;спешить к&nbsp;мастеру', 'Эффект держится до&nbsp;года&nbsp;— так устроена техника'],
  ];
  const VT = ['сегодня', '1 месяц', '3 месяца', '6 месяцев', 'год'];
  const marks = $$('.time__marks button');
  let capKey = '', capTimer = 0;
  function caption(instant) {
    const k = Math.round(val / 25), key = mode + ':' + k;
    range.setAttribute('aria-valuetext', VT[k]);
    marks.forEach((b, i) => b.classList.toggle('is-cur', i === k));
    if (key === capKey) return; capKey = key;
    clearTimeout(capTimer);
    if (instant || RM) { cap.innerHTML = CAPS[mode][k]; return; }
    cap.classList.add('is-swap');
    capTimer = setTimeout(() => { cap.innerHTML = CAPS[mode][k]; cap.classList.remove('is-swap'); }, 250);
  }
  const touch = () => { userTouched = true; cancelDemo && cancelDemo(); };
  range.addEventListener('input', () => { touch(); val = +range.value; paint(); caption(); });
  marks.forEach((b) => b.addEventListener('click', () => {
    touch(); const from = val, to = +b.dataset.v;
    tween(500, (t) => { val = lerp(from, to, t); range.value = Math.round(val); paint(); }, () => caption(), easeIO); caption();
  }));
  const radios = $$('button', seg);
  function setMode(n) {
    mode = n; seg.dataset.mode = n;
    radios.forEach((r) => { const on = +r.dataset.mode === n; r.setAttribute('aria-checked', String(on)); r.tabIndex = on ? 0 : -1; });
    cancelMode && cancelMode(); const from = m;
    cancelMode = tween(600, (t) => { m = lerp(from, n, t); paint(); }, null, easeIO);
    caption();
  }
  radios.forEach((r) => {
    r.addEventListener('click', () => { touch(); setMode(+r.dataset.mode); });
    r.addEventListener('keydown', (e) => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); touch(); const n = mode ? 0 : 1; setMode(n); radios[n].focus(); });
  });
  seg.dataset.mode = 1; radios[0].tabIndex = -1;
  paint(); caption(true);
  // «дыхание» волосков — только пока схема видна
  let raf = 0, vis = false;
  const breathe = (now) => {
    const t = now / 1000;
    for (let i = 0; i < hairs.length; i++) hairs[i].setAttribute('transform', `translate(${(Math.sin(t * .6 + i) * 1.2).toFixed(2)} 0)`);
    for (let i = 0; i < his.length; i++) his[i].setAttribute('transform', `translate(${(Math.sin(t * .6 + i * 3.1 + 1) * 1.4).toFixed(2)} 0)`);
    raf = vis ? requestAnimationFrame(breathe) : 0;
  };
  if (!RM) new IntersectionObserver(([e]) => { vis = e.isIntersecting && !document.hidden; if (vis && !raf) raf = requestAnimationFrame(breathe); }).observe(fig);
  // демонстрация при появлении: 0 → 45 → 0
  whenIn(fig, () => {
    if (RM || userTouched) return;
    setTimeout(() => {
      if (userTouched) return;
      cancelDemo = tween(2400, (t) => { val = Math.sin(t * Math.PI) * 45; range.value = Math.round(val); paint(); caption(); }, () => { val = 0; range.value = 0; paint(); caption(); }, (t) => t);
    }, 900);
  });
  ['pointerdown', 'keydown'].forEach((t) => range.addEventListener(t, touch));
})();

/* ===== ЗАЛ V. V-CUT 360° ===== */
(() => {
  const svg = $('#ring-svg'), box = $('#ringbox'), num = $('#ring-count');
  let h = '';
  for (let k = 0; k < 72; k++) {
    const a = (k * 5 * Math.PI) / 180, long = k % 6 === 0, r0 = long ? 138 : 150, r1 = 190;
    h += `<line class="${long ? 'is-long' : ''}" style="--k:${k}" data-a="${k * 5}" x1="${(Math.cos(a) * r0).toFixed(2)}" y1="${(Math.sin(a) * r0).toFixed(2)}" x2="${(Math.cos(a) * r1).toFixed(2)}" y2="${(Math.sin(a) * r1).toFixed(2)}"/>`;
  }
  svg.innerHTML = h;
  const lines = $$('line', svg);
  if (MOTION) gsap.to(svg, { rotation: 120, ease: 'none', transformOrigin: '50% 50%', scrollTrigger: { trigger: '.h5', start: 'top bottom', end: 'bottom top', scrub: true } });
  whenIn(box, () => { if (RM) return; num.textContent = '0'; setTimeout(() => tween(1600, (t) => { num.textContent = Math.round(t * 360); }), 500); });
  // сектор кольца подсвечивается вместе со сноской: 0 — слева вверху, 1 — справа вверху, 2 — справа внизу, 3 — слева внизу
  const RANGE = { 0: [180, 270], 1: [270, 360], 2: [0, 90], 3: [90, 180] };
  $$('.notes li', box).forEach((li) => {
    const on = () => { const rot = MOTION ? +gsap.getProperty(svg, 'rotation') || 0 : 0, [a, b] = RANGE[li.dataset.sector]; lines.forEach((l) => { const ang = (((+l.dataset.a + rot) % 360) + 360) % 360; l.classList.toggle('is-hot', ang >= a && ang < b); }); };
    const off = () => lines.forEach((l) => l.classList.remove('is-hot'));
    li.addEventListener('mouseenter', on); li.addEventListener('mouseleave', off); li.addEventListener('focus', on); li.addEventListener('blur', off);
  });
})();

/* ===== ЗАЛ VII. ПОДБОР «ЧТО В ГОЛОВЕ — ТО И НА ГОЛОВЕ» ===== */
(() => {
  const quiz = $('#quiz'), sec = $('.h7'), result = $('#quiz-result'), picked = $('#quiz-picked');
  const S1 = ['Спокойно и естественно', 'Ярко — чтобы оборачивались', 'Снова собой, после экспериментов', 'Совсем по-новому', 'Легко — без укладки по утрам'];
  const S2 = ['Появляется седина', 'Тёмное окрашивание, хочу светлее', 'Блонд, но он устал', 'Длина есть, формы нет', 'Не знаю — хочу, чтобы решил мастер'];
  const SERV = {
    grade: { name: 'GRADE', price: 'от&nbsp;13&nbsp;000&nbsp;₽', time: 'около 2&nbsp;ч', img: 'grade', kind: 'Авторская техника Ильи Варнакова' },
    black: { name: 'Выход из&nbsp;чёрного', price: 'от&nbsp;20&nbsp;000&nbsp;₽', time: 'около 5&nbsp;ч · только после консультации', img: 'black', kind: 'Сложное окрашивание' },
    nature: { name: 'Back to Nature', price: 'от&nbsp;10&nbsp;000&nbsp;₽', time: 'около 3&nbsp;ч', img: 'nature', kind: 'Возвращение натурального цвета' },
    vcut: { name: 'V-cut', price: '7&nbsp;000–12&nbsp;000&nbsp;₽', time: 'около 1&nbsp;ч', img: 'vcut', kind: 'Авторская стрижка Ильи Варнакова' },
    image: { name: 'Смена образа', price: 'от&nbsp;15&nbsp;000&nbsp;₽', time: 'около 2&nbsp;ч', img: 'image', kind: 'Авторский метод Ильи' },
    blondeCare: { name: 'Total blonde + холодное восстановление', price: 'от&nbsp;15&nbsp;000&nbsp;₽ + 4&nbsp;000–5&nbsp;000&nbsp;₽', time: 'около 3&nbsp;ч и&nbsp;уход', img: 'blonde', kind: 'Окрашивание и&nbsp;уход' },
    cold: { name: 'Холодное восстановление для блондинок', price: '4&nbsp;000–5&nbsp;000&nbsp;₽', time: 'салонный спа-ритуал', img: 'blonde', kind: 'Уход' },
    complex: { name: 'Сложное окрашивание у&nbsp;Ильи', price: 'от&nbsp;15&nbsp;000&nbsp;₽', time: 'шатуш, балаяж, Airtouch', img: 'grade', kind: 'Илья Варнаков' },
    consult: { name: 'Консультация стилиста', price: '2&nbsp;000&nbsp;₽', time: '30&nbsp;минут', img: null, kind: 'Илья Варнаков' },
  };
  // первое совпадение сверху вниз
  function pick(a, b) {
    if (b === 0) return ['grade', 'Камуфлирует седину не&nbsp;намертво, а&nbsp;мягко&nbsp;— и&nbsp;отрастает незаметно'];
    if (b === 1) return ['black', 'За&nbsp;один раз и&nbsp;без потери качества. Начинаем с&nbsp;консультации'];
    if (a === 2) return ['nature', 'Вернуть свой цвет за&nbsp;один визит&nbsp;— вместе с&nbsp;качеством волос'];
    if (a === 4 || b === 3) return ['vcut', 'Форма раскрывается сама&nbsp;— укладка дома сводится к&nbsp;минимуму'];
    if (a === 3) return ['image', 'Сначала разговор о&nbsp;том, какой вы хотите себя видеть. Потом&nbsp;— образ'];
    if (a === 1 && b === 2) return ['blondeCare', 'Чистый сияющий блонд и&nbsp;уход, который держит его в&nbsp;форме'];
    if (b === 2) return ['cold', 'Салонный ритуал для цвета и&nbsp;качества блонда'];
    if (a === 1) return ['complex', 'Шатуш, балаяж, Airtouch&nbsp;— подберём технику под вас'];
    if (a === 0) return ['grade', 'Мягкие блики, естественный переход&nbsp;— тихая роскошь'];
    return ['consult', '30&nbsp;минут с&nbsp;Ильёй: образ, цвет, форма, уход&nbsp;— и&nbsp;понятный план'];
  }
  const groups = $$('.quiz__opts', quiz);
  const state = [null, null];
  const build = (g, list, gi) => list.forEach((t, k) => {
    const b = el(`<button type="button" class="qo" role="radio" aria-checked="false" tabindex="${k ? -1 : 0}">${t.replace(' — ', '&nbsp;— ')}</button>`);
    b.addEventListener('click', () => choose(gi, k, b));
    b.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const all = $$('.qo', g); all[(k + d + all.length) % all.length].focus();
    });
    g.appendChild(b);
  });
  build(groups[0], S1, 0); build(groups[1], S2, 1);
  function choose(gi, k, btn) {
    state[gi] = k;
    const g = groups[gi];
    $$('.qo', g).forEach((b, i) => { b.setAttribute('aria-checked', String(i === k)); b.tabIndex = i === k ? 0 : -1; });
    g.classList.add('has-pick'); sec.classList.add('is-warm');
    if (gi === 0) {
      picked.hidden = false; picked.innerHTML = `<small>Вы выбрали</small>${S1[k].replace(' — ', '&nbsp;— ')}`;
      // FLIP: выбранное слово «переезжает» в правую колонку
      if (!RM && quiz.dataset.step !== '3') {
        const a = btn.getBoundingClientRect(), z = picked.getBoundingClientRect();
        const ghost = btn.cloneNode(true); ghost.removeAttribute('role');
        ghost.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;margin:0;z-index:30;pointer-events:none;background:#24463A`;
        document.body.appendChild(ghost);
        picked.style.opacity = '0';
        ghost.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${z.left - a.left}px,${z.top - a.top}px) scale(${Math.min(1, z.width / a.width)})`, transformOrigin: '0 0', opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.65,0,.35,1)' }).onfinish = () => { ghost.remove(); picked.style.removeProperty('opacity'); };
      }
      if (state[1] === null) { quiz.dataset.step = '2'; return; }
    }
    if (state[0] !== null && state[1] !== null) show();
  }
  function show() {
    const [id, why] = pick(state[0], state[1]), s = SERV[id];
    const s1 = S1[state[0]], s2 = S2[state[1]];
    const msg = 'Здравствуйте, Илья! Хочу ' + plain(s.name) + '. Мне важно чувствовать себя: ' + s1.toLowerCase() + '. Сейчас: ' + s2.toLowerCase() + '.';
    quiz.dataset.step = '3';
    result.innerHTML = `<div class="qr">
      ${s.img ? `<div class="qr__img"><img src="${IMG}tech/tech-${s.img}.webp" width="720" height="960" alt="Работа мастеров GURU" loading="lazy" decoding="async"></div>` : '<div class="qr__img qr__img--mono" aria-hidden="true"><svg><use href="#g-mono"/></svg></div>'}
      <div class="label"><span class="label__no">Вам подойдёт</span><span class="label__title" tabindex="-1">${s.name}</span><span class="label__meta">${s.kind} · ${s.time}</span><p class="qr__why">${why}</p><span class="label__price">${s.price}</span></div>
      <div class="qr__btns"><a class="btn" href="${wa(msg)}" target="_blank" rel="noopener"><span>Обсудить с&nbsp;Ильёй в&nbsp;WhatsApp</span><i aria-hidden="true">→</i></a><button type="button" class="btn btn--ghost" data-again><span>Начать заново</span></button></div>
      ${id === 'consult' ? '' : `<p class="qr__alt">Или <a href="${wa('Здравствуйте, Илья! Хочу записаться на консультацию.')}" target="_blank" rel="noopener">начать с&nbsp;консультации&nbsp;— 30&nbsp;минут, 2&nbsp;000&nbsp;₽</a></p>`}</div>`;
    const card = $('.qr', result);
    requestAnimationFrame(() => { card.classList.add('is-in'); $('.label__title', card).focus({ preventScroll: true }); });
    $('[data-again]', card).addEventListener('click', reset);
    if (MOTION) setTimeout(() => ScrollTrigger.refresh(), 750);
  }
  function reset() {
    state[0] = state[1] = null; result.innerHTML = ''; picked.hidden = true; quiz.dataset.step = '1'; sec.classList.remove('is-warm');
    groups.forEach((g) => { g.classList.remove('has-pick'); $$('.qo', g).forEach((b, i) => { b.setAttribute('aria-checked', 'false'); b.tabIndex = i ? -1 : 0; }); });
    $('.qo', groups[0]).focus({ preventScroll: true });
  }
  // в шаге 3 первый шаг остаётся кликабельным — можно изменить выбор; шаг 2 вернётся кнопкой «Начать заново»
  window.__quizPick = pick; // для самопроверки всех 25 комбинаций
})();

/* ===== ЗАЛ VIII. ПОЛКА РИТУАЛА ===== */
(() => {
  const items = $('#shelf-items'), labels = $('#shelf-labels');
  // предметы нарисованы от руки: единый штрих, детали горчицей
  const OBJ = [
    { k: 'slippers', no: '01 · Вход', t: 'У&nbsp;входа&nbsp;— тапочки. Дальше&nbsp;— как дома', name: 'Тапочки',
      svg: `<g class="jump jump--2"><path class="pf" d="M56 92c-2-6 2-10 9-11l33-4c8-1 13 2 13 7s-4 8-11 9l-34 3c-6 0-9-1-10-4z"/><path class="ln" d="M77 80c0-11 6-18 16-19 9 0 15 6 16 16"/><path class="ac" d="M83 79c1-7 5-11 11-12"/></g>
            <g class="jump"><path class="pf" d="M12 110c-3-6 1-11 9-12l44-4c9 0 14 3 14 8 1 6-4 9-13 10l-44 2c-5 0-9-1-10-4z"/><path class="ln" d="M38 97c1-13 8-21 20-21 11 0 18 8 18 19"/><path class="ac" d="M45 95c1-8 6-13 14-13"/></g>` },
    { k: 'cup', no: '02 · Чай', t: 'Чай, кофе, печенье. Пока говорим о&nbsp;главном', name: 'Чашка чая',
      svg: `<path class="ln steam" pathLength="1" d="M50 54c-6-6-5-11 0-16s6-10 1-15"/><path class="ln steam steam--2" pathLength="1" d="M67 54c-5-5-4-10 1-14s4-8 1-12"/>
            <path class="pf" d="M33 64h54c1 23-9 38-26 39-18 0-28-15-28-39z"/><path class="ln" d="M87 71c10-2 17 2 17 9 0 9-9 14-21 12"/><path class="ac" d="M36 78c15 4 33 4 49 0"/><path class="ln" d="M16 108c27 7 62 7 90-1M34 114c17 3 37 3 54 0"/>` },
    { k: 'mirror', no: '03 · Разговор', t: 'Сначала мастер слушает. Иногда долго. Это часть работы', name: 'Зеркало',
      svg: `<path class="pf" d="M60 14c15 0 26 16 26 36S75 85 60 85 34 70 34 50s11-36 26-36z"/><path class="ac" d="M60 20c12 0 20 13 20 30s-9 29-20 29-21-12-21-29 9-30 21-30z"/><g class="glint"><path class="ln" d="M47 44 61 29M51 55l7-8"/></g><path class="ln" d="M60 85v17M38 116c2-9 10-14 22-14s19 5 22 14z"/>` },
    { k: 'scissors', no: '04 · Работа', t: 'Премиальные красители и&nbsp;уход Revlon Professional', name: 'Ножницы и кисть',
      svg: `<g class="blade blade--a"><path class="pf" d="M45 66 30 16c9 7 18 26 22 46z"/><path class="ln" d="M48 67l11 19"/><circle class="ln" cx="64" cy="96" r="10"/></g>
            <g class="blade blade--b"><path class="pf" d="M51 66 67 16c-9 7-18 26-23 46z"/><path class="ln" d="M48 67 38 86"/><circle class="ln" cx="33" cy="96" r="10"/></g><circle class="ac" cx="48" cy="65" r="2.2"/>
            <path class="pf" d="M93 114h8l-2-52h-5z"/><path class="ln" d="M90 62h14v-9H90z"/><path class="fl" d="M90 53c0-13 2-22 7-29 4 7 7 16 7 29z"/><path class="ac" d="M90 53c0-13 2-22 7-29 4 7 7 16 7 29"/>` },
    { k: 'gramophone', no: '05 · Музыка', t: 'Пластинка крутится, попугаи подпевают', name: 'Патефон',
      svg: `<path class="pf" d="M16 92h62v24H16z"/><path class="ln" d="M22 116v3M72 116v3M16 99h62"/><ellipse class="pf" cx="45" cy="90" rx="26" ry="5.500"/><ellipse class="ac disc" cx="45" cy="90" rx="17" ry="3.500" pathLength="12"/><circle class="ln" cx="45" cy="89.500" r="1.200"/>
            <path class="ln" d="M68 90V58c0-9 4-15 11-18"/><path class="pf" d="M76 43C70 27 79 12 97 11c13 0 20 10 17 24-3 13-15 20-27 15-5-2-9-4-11-7z"/><path class="fl" d="M84 40c-3-10 3-20 14-20 8 0 12 7 10 15-2 9-10 13-17 10-3-1-6-3-7-5z"/><path class="ln" d="M78 104h10v-9"/>` },
    { k: 'plate', no: '06 · После', t: 'Бывает, после стрижки&nbsp;— сырники. Да, правда', name: 'Сырники',
      svg: `<path class="ln steam" pathLength="1" d="M52 62c-5-5-4-9 0-13s5-8 1-12"/><path class="ln steam steam--2" pathLength="1" d="M68 60c-4-4-3-8 1-11"/>
            <g class="plate"><path class="pf" d="M10 104c0-8 22-14 50-14s50 6 50 14-22 13-50 13-50-5-50-13z"/><path class="ln" d="M24 104c0-5 16-8 36-8s36 3 36 8"/>
            <path class="pf" d="M28 97c0-6 8-9 17-9s17 3 17 9-8 9-17 9-17-3-17-9z"/><path class="pf" d="M58 97c0-6 8-9 17-9s17 3 17 9-8 9-17 9-17-3-17-9z"/><path class="pf" d="M42 85c0-6 8-9 17-9s17 3 17 9-8 9-17 9-17-3-17-9z"/><path class="fl" d="M45 83c0-4 6-6 14-6s14 2 14 6-6 5-14 5-14-1-14-5z"/><path class="ac" d="M52 81c3-1 7-2 12-1"/></g>` },
  ];
  OBJ.forEach((o, i) => {
    const b = el(`<li><button type="button" class="obj obj--${o.k}" style="--i:${i}" aria-label="${o.name}: ${plain(o.t)}"><svg viewBox="0 0 120 120" aria-hidden="true">${o.svg.replace(/(\.\d)00/g, '$1')}</svg></button></li>`);
    const lab = el(`<li class="label reveal" style="--i:${i + 3}"><span class="label__no">${o.no}</span><span class="label__meta">${o.t}</span></li>`);
    items.appendChild(b); labels.appendChild(lab);
    const btn = b.firstElementChild;
    const live = () => { btn.classList.remove('is-live'); void btn.offsetWidth; btn.classList.add('is-live', 'is-spin'); lab.classList.add('is-hot'); };
    const rest = () => { btn.classList.remove('is-spin'); lab.classList.remove('is-hot'); };
    btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') live(); });
    btn.addEventListener('pointerleave', rest);
    btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) live(); });
    btn.addEventListener('blur', rest);
    btn.addEventListener('click', () => { live(); setTimeout(() => { if (!btn.matches(':hover')) rest(); }, 2400); });
  });
})();

/* ===== ЗАЛ IX. МАСТЕРА: наклон рамы к курсору ===== */
if (HOVER && !RM) $$('[data-tilt]').forEach((art) => {
  const host = art.parentElement;
  host.addEventListener('pointermove', (e) => { const r = art.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; art.style.transform = `rotateY(${(x * 8).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`; });
  host.addEventListener('pointerleave', () => { art.style.transform = ''; });
});

/* ===== ЗАЛ X. КАТАЛОГ ЦЕН ===== */
const CATALOG = [
  { id: 'cuts', tab: 'Стрижки', rows: [
    ['Авторская стрижка V-cut', '7&nbsp;000–12&nbsp;000&nbsp;₽', 'Илья Варнаков · около 1&nbsp;ч', 1],
    ['Женская стрижка', '5&nbsp;000–8&nbsp;000&nbsp;₽', 'мастер Ольга · мытьё, сушка, лёгкая укладка'],
    ['Мужская стрижка', '5&nbsp;000&nbsp;₽', 'Илья Варнаков · «стрижка, о&nbsp;которой не&nbsp;нужно думать»'],
    ['Мужская стрижка', '2&nbsp;000&nbsp;₽', 'мастер Ольга'],
    ['Мужская стрижка, длинные волосы', '3&nbsp;000&nbsp;₽', ''],
  ] },
  { id: 'color', tab: 'Окрашивание', note: 'Для очень густых или длинных волос стоимость сложных окрашиваний может вырасти на&nbsp;30%.', rows: [
    ['GRADE', 'от&nbsp;13&nbsp;000&nbsp;₽', 'авторская техника Ильи · около 2&nbsp;ч', 1],
    ['Сложное окрашивание', 'от&nbsp;15&nbsp;000&nbsp;₽', 'Илья Варнаков · шатуш, балаяж, Airtouch'],
    ['Сложное окрашивание', '10&nbsp;000–15&nbsp;000&nbsp;₽', 'мастер Ольга · шатуш, балаяж, Airtouch, мелирование'],
    ['Total blonde', 'от&nbsp;15&nbsp;000&nbsp;₽', 'около 3&nbsp;ч'],
    ['Back to Nature', 'от&nbsp;10&nbsp;000&nbsp;₽', 'возвращение натурального цвета · около 3&nbsp;ч', 1],
    ['Выход из&nbsp;чёрного', 'от&nbsp;20&nbsp;000&nbsp;₽', 'только после консультации · около 5&nbsp;ч', 1],
    ['Смена образа', 'от&nbsp;15&nbsp;000&nbsp;₽', 'авторский метод Ильи · около 2&nbsp;ч', 1],
    ['Окрашивание корней и&nbsp;тонирование длины', '8&nbsp;000–15&nbsp;000&nbsp;₽', ''],
    ['Окрашивание в&nbsp;один тон', 'от&nbsp;8&nbsp;000&nbsp;₽', ''],
    ['Восстановление цвета Gloss Revlon Professional', '3&nbsp;000&nbsp;₽', ''],
  ] },
  { id: 'care', tab: 'Уход', rows: [
    ['Холодное восстановление для блондинок', '4&nbsp;000–5&nbsp;000&nbsp;₽', 'салонный спа-ритуал для цвета и&nbsp;качества блонда'],
    ['Молекулярный уход reSTART Revlon Professional', '4&nbsp;000–5&nbsp;000&nbsp;₽', 'двухфазная система, выдержка 5&nbsp;минут'],
  ] },
  { id: 'styling', tab: 'Укладки', rows: [
    ['Укладка «локоны»', '2&nbsp;000–8&nbsp;000&nbsp;₽', ''],
    ['Укладка «локоны» без мытья', '2&nbsp;000&nbsp;₽', ''],
    ['Причёска', '7&nbsp;000–10&nbsp;000&nbsp;₽', ''],
    ['Укладка на&nbsp;брашинг', 'по&nbsp;запросу', ''],
  ] },
  { id: 'consult', tab: 'Консультация и&nbsp;обучение', rows: [
    ['Консультация стилиста', '2&nbsp;000&nbsp;₽', 'Илья Варнаков · 30&nbsp;минут: образ, цвет, форма, уход'],
    ['Мастер-класс «Внутренний мир волос»', 'по&nbsp;запросу', 'домашний уход, выбор косметики, укладка · 1,5&nbsp;ч'],
    ['Обучение «Точечная секторальная стрижка»', '19&nbsp;900&nbsp;₽', 'авторский метод Ильи Варнакова'],
    ['Обучение «AirBalayage» + отработка', '69&nbsp;900&nbsp;₽', 'авторская техника окрашивания'],
  ] },
];
(() => {
  const tabs = $('#cat-tabs'), line = $('.tabs__line', tabs), list = $('#cat-list'), panel = $('#cat-panel'), photo = $('#cat-photo');
  const imgs = $$('img', photo);
  let cur = -1, timer = 0;
  const btns = CATALOG.map((c, k) => {
    const b = el(`<button type="button" role="tab" id="cat-t-${c.id}" aria-controls="cat-panel" aria-selected="false" tabindex="-1">${c.tab}</button>`);
    b.addEventListener('click', () => select(k));
    b.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return; e.preventDefault(); const n = (k + d + CATALOG.length) % CATALOG.length; select(n); btns[n].focus(); });
    tabs.insertBefore(b, line);
    return b;
  });
  const rowsHTML = (c) => c.rows.map((r, i) => `<li class="cat__row" style="--i:${i}"><span class="cat__name">${r[0]}${r[3] ? '<svg role="img" aria-label="авторская техника"><use href="#g-mono"/></svg>' : ''}${r[2] ? `<small>${r[2]}</small>` : ''}</span><span class="cat__dots" aria-hidden="true"></span><span class="cat__price">${r[1]}</span></li>`).join('') + (c.note ? `<li class="cat__note">${c.note}</li>` : '');
  const moveLine = () => { const b = btns[cur]; if (b) line.style.transform = `translateX(${b.offsetLeft}px) scaleX(${b.offsetWidth / 100})`; };
  function select(k, instant) {
    if (k === cur) return;
    cur = k; const c = CATALOG[k];
    btns.forEach((b, i) => { b.setAttribute('aria-selected', String(i === k)); b.tabIndex = i === k ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 'cat-t-' + c.id);
    moveLine();
    btns[k].scrollIntoView && tabs.scrollWidth > tabs.clientWidth && tabs.scrollTo({ left: btns[k].offsetLeft - 20, behavior: RM ? 'auto' : 'smooth' });
    const swap = () => {
      // FLIP: блоки под списком не прыгают при смене высоты
      const after = [...panel.parentElement.children].slice([...panel.parentElement.children].indexOf(panel) + 1);
      const before = after.map((n) => n.getBoundingClientRect().top);
      list.innerHTML = rowsHTML(c); list.classList.remove('is-out');
      if (!instant && !RM) after.forEach((n, i) => { const d = before[i] - n.getBoundingClientRect().top; if (Math.abs(d) > 1) n.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' }); });
      if (MOTION && !instant) setTimeout(() => ScrollTrigger.refresh(), 560);
    };
    clearTimeout(timer);
    if (instant || RM) swap(); else { list.classList.add('is-out'); timer = setTimeout(swap, 200); }
    // фото в раме меняется вместе с разделом
    const src = `${IMG}misc/cat-${c.id}.webp`, toB = !photo.classList.contains('is-b'), target = imgs[toB ? 1 : 0];
    if (instant) return;
    target.onload = null; target.src = src;
    const flip = () => { target.onload = null; photo.classList.toggle('is-b', toB); };
    if (target.complete && target.naturalWidth) flip(); else target.onload = flip;
  }
  select(0, true);
  addEventListener('resize', moveLine);
  document.fonts && document.fonts.ready.then(moveLine);
})();

/* ===== ЗАЛ XI. КНИГА ГОСТЕЙ ===== */
(() => {
  const book = $('#book'), prev = $('#book-prev'), next = $('#book-next'), count = $('#book-count'), nav = $('.book__nav');
  const Q = [
    ['Это не&nbsp;просто парикмахерская, это место силы', 'Татьяна'],
    ['Можно просто прийти и&nbsp;сказать: „Вот тебе моя голова&nbsp;— сделай красиво“', 'Анна'],
    ['Музыка с&nbsp;патефона, вкусняшки, попугаи летают', 'Яна'],
    ['Заходишь, надеваешь тапочки&nbsp;— и&nbsp;ты как дома', 'Алёна'],
    ['Пришла с&nbsp;сомнениями, а&nbsp;ушла с&nbsp;ведьминской стрижкой и&nbsp;чёлкой', 'Дарья'],
    ['Так, как лежат волосы после его стрижки,&nbsp;— никто и&nbsp;никогда не&nbsp;стриг', 'Дина'],
    ['Выход из&nbsp;чёрного&nbsp;— без потери качества волос', 'Марианна'],
    ['Чай с&nbsp;сырниками после стрижки! Как вам такое?!', 'Наталья'],
    ['Будто попадаешь в&nbsp;уютный зелёный уголок', 'Инна'],
    ['Это то&nbsp;место, где появляются крылья', 'Елена'],
  ];
  const CURL = ['M2 14c8-10 16-12 20-6s-6 12-10 6 6-12 18-10 14 8 22 2', 'M2 10c10 8 18 8 22 0s-8-10-8-2 12 12 22 6 8-8 14-6', 'M3 16C12 4 20 3 22 10s-9 8-7 1 14-9 22-5 9 8 15 6'];
  const page = (k, side, extra = '') => `<div class="pg pg--${side} ${extra}"><p class="pg__q">«${Q[k][0]}»</p><p class="pg__by"><svg viewBox="0 0 54 22" aria-hidden="true"><path d="${CURL[k % 3]}"/></svg>${Q[k][1]}</p><span class="pg__n" aria-hidden="true">${k + 1}</span></div>`;
  if (RM) {
    book.outerHTML = `<ul class="book-list">${Q.map((q) => `<li><q>«${q[0]}»</q><span>${q[1]}</span></li>`).join('')}</ul>`;
    nav.hidden = true; return;
  }
  let single = null, leaves = [], pos = 0, max = 0;
  function build() {
    const s = innerWidth < 768;
    if (s === single) return;
    single = s; pos = 0;
    book.classList.toggle('book--single', s);
    let h = '';
    if (s) { // одна страница на экран: лист = страница, оборот пустой
      h += page(Q.length - 1, 'r');
      for (let i = Q.length - 2; i >= 0; i--) h += `<div class="leaf-pg" data-i="${i}">${page(i, 'r', 'pg--front')}<div class="pg pg--l pg--back"></div></div>`;
      max = Q.length - 1;
    } else { // разворот: лист i — правая страница разворота i и левая страница разворота i+1
      h += page(0, 'l') + page(Q.length - 1, 'r');
      const n = Q.length / 2 - 1;
      for (let i = n - 1; i >= 0; i--) h += `<div class="leaf-pg" data-i="${i}">${page(2 * i + 1, 'r', 'pg--front')}${page(2 * i + 2, 'l', 'pg--back')}</div>`;
      max = n;
    }
    book.innerHTML = h;
    leaves = $$('.leaf-pg', book).sort((a, b) => a.dataset.i - b.dataset.i);
    order(); paint();
  }
  const order = () => leaves.forEach((l, i) => { l.style.zIndex = i < pos ? 10 + i : 10 + (leaves.length - i); });
  function paint() {
    prev.disabled = pos === 0; next.disabled = pos === max;
    count.textContent = single ? `стр. ${pos + 1} из ${Q.length}` : `стр. ${pos * 2 + 1}–${pos * 2 + 2} из ${Q.length}`;
  }
  function turn(d) {
    const to = pos + d; if (to < 0 || to > max) return;
    const leaf = leaves[d > 0 ? pos : to];
    leaf.style.zIndex = 40; leaf.classList.add('is-turning'); leaf.classList.toggle('is-flipped', d > 0);
    pos = to; paint();
    setTimeout(() => { leaf.classList.remove('is-turning'); order(); }, 820);
  }
  book.addEventListener('click', (e) => { if (e.target.closest('.parrot')) return; const r = book.getBoundingClientRect(); turn(single || e.clientX > r.left + r.width / 2 ? 1 : -1); });
  prev.addEventListener('click', () => turn(-1)); next.addEventListener('click', () => turn(1));
  let inView = false;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: .4 }).observe(book);
  document.addEventListener('keydown', (e) => {
    if (!$('#lb').hidden || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const a = document.activeElement;
    if (a === book || (inView && (a === document.body || a === prev || a === next))) { e.preventDefault(); turn(e.key === 'ArrowRight' ? 1 : -1); }
  });
  let sx = null, sy = 0;
  book.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  book.addEventListener('touchend', (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { e.preventDefault(); turn(dx < 0 ? 1 : -1); } });
  build();
  addEventListener('resize', build);
})();

/* ===== ЗАЛ XII. СЕРТИФИКАТ ===== */
(() => {
  const cert = $('#cert'); if (!cert || !HOVER || RM) return;
  const host = cert.parentElement; let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false;
  const loop = () => {
    x = lerp(x, tx, .12); y = lerp(y, ty, .12);
    cert.style.transform = `rotateY(${(x * 16).toFixed(2)}deg) rotateX(${(-y * 16).toFixed(2)}deg)`;
    cert.style.setProperty('--lx', (50 + x * 60).toFixed(1) + '%'); cert.style.setProperty('--ly', (50 + y * 60).toFixed(1) + '%');
    raf = on || Math.abs(x - tx) > .002 || Math.abs(y - ty) > .002 ? requestAnimationFrame(loop) : 0;
  };
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; on = true; if (!raf) raf = requestAnimationFrame(loop); });
  host.addEventListener('pointerleave', () => { tx = ty = 0; on = false; });
})();

/* ===== СЧЁТЧИКИ «МУЗЕЙНЫХ ЦИФР» ===== */
$$('.nums').forEach((box) => whenIn(box, () => { if (RM) return; $$('[data-count]', box).forEach((b, i) => { const n = +b.dataset.count; b.textContent = '0'; setTimeout(() => tween(1400, (t) => { b.textContent = Math.round(t * n); }), i * 120 + 250); }); }));

/* ===== ПАРАЛЛАКС ЛИСТЬЕВ И ФИНАЛ: ЗЕРКАЛО СЖИМАЕТСЯ ===== */
if (MOTION) {
  $$('[data-par]').forEach((leaf) => gsap.to(leaf, { yPercent: -100 * +leaf.dataset.par, ease: 'none', scrollTrigger: { trigger: leaf.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.final__leaf').forEach((leaf, i) => gsap.fromTo(leaf, { yPercent: i ? -16 : 22 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'top top', scrub: true } }));
  const sec = $('.final'), portal = $('#final-portal'), mirror = $('#final-mirror');
  const inset = () => {
    let x = 0, y = 0, n = mirror;
    while (n && n !== sec) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return `inset(${y}px ${sec.offsetWidth - x - mirror.offsetWidth}px ${sec.offsetHeight - y - mirror.offsetHeight}px ${x}px)`;
  };
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: .6, invalidateOnRefresh: true } })
    .set(portal, { visibility: 'visible' }, 0)
    .fromTo(portal, { clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: inset, duration: .9, ease: 'power2.inOut' }, 0)
    .to(portal, { opacity: 0, duration: .1 }, .9);
}

/* ===== ПОПУГАЙ-СМОТРИТЕЛЬ ===== */
(() => {
  const SVG = `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path class="p-ln" d="M18.800 33.600 10.600 45.400M21.200 35.200 15.800 45.800"/>
    <path class="p-breast" d="M26.400 17c-5.300 2.800-9 8.600-8.900 14.500.1 3.200 2.400 5.500 6 5.600 6.100 0 10.800-4.800 11.800-11.400.4-2.900 0-5.300-1.200-7.200z"/>
    <path class="p-ln" d="M26.400 17c-5.300 2.800-9 8.600-8.900 14.500.1 3.200 2.400 5.500 6 5.600 6.100 0 10.800-4.800 11.800-11.400.4-2.900 0-5.300-1.200-7.200"/>
    <g class="p-legs"><path class="p-ln" d="M25.200 37v3.600M28.800 36.200v4.400"/></g>
    <path class="p-ln p-wing-fold" d="M24.600 20.800c-3.100 3.900-4.800 8.900-4 13.600 4.600-.8 8.300-5.300 8.900-10.900"/>
    <path class="p-ln p-white p-wing-up" d="M24 22c-4.200-5.600-5.400-11.800-3.400-17.400 5.400 3 8.600 9 8.600 16.200z"/>
    <path class="p-ln p-white p-wing-down" d="M23.600 23c-2.200 6-1.200 12.200 3 16.600 3.200-5 4.200-11.200 2.200-16.200z"/>
    <g class="p-head"><path class="p-ln p-white" d="M25.300 11.600c.6-3.400 3.400-5.700 6.700-5.400 3.300.3 5.600 3 5.400 6.300 1.700.5 2.500 1.900 1.900 3.600-.9.500-1.900.3-2.600-.500-.9 2.100-2.900 3.400-5.300 3.400-3.700-.1-6.500-3.400-6.100-7.400z"/><circle class="p-cheek" cx="31.400" cy="15.300" r="1.700"/><circle class="p-eye" cx="32.900" cy="10.900" r="1"/><path class="p-ln" d="M37.300 12.600c-.9-.3-1.800-.2-2.500.2"/></g>
  </svg>`.replace(/(\.\d)00/g, '$1');
  const make = (extra = '') => el(`<button type="button" class="parrot ${extra}" aria-label="Попугай GURU">${SVG}<span class="parrot__say" role="status"></span></button>`);
  const SAY = ['Тапочки — у входа', 'Илья сейчас слушает. Подождите минутку', 'Сырники бывают не всегда', 'Я тут живу', 'Чирик'];
  let sayI = 0;
  const birds = [];
  function wire(p) {
    const say = $('.parrot__say', p); let timer = 0;
    p.addEventListener('click', (e) => {
      e.stopPropagation();
      p.classList.remove('is-chirp'); void p.offsetWidth; p.classList.add('is-chirp');
      say.textContent = SAY[sayI++ % SAY.length]; say.classList.add('is-on');
      clearTimeout(timer); timer = setTimeout(() => say.classList.remove('is-on'), 2400);
    });
    p.addEventListener('pointerdown', (e) => e.stopPropagation());
    // моргание раз в 6–9 секунд
    const blink = () => { if (!document.hidden) { p.classList.add('is-blink'); setTimeout(() => p.classList.remove('is-blink'), 120); } setTimeout(blink, 6000 + Math.random() * 3000); };
    if (!RM) setTimeout(blink, 2500 + Math.random() * 3000);
    birds.push({ p, head: $('.p-head', p), flip: 1 });
    return p;
  }
  const main = wire(make());
  $('#perch-hdr').appendChild(main);
  const fin = wire(make('parrot--light')); $('#perch-final').appendChild(fin);
  if (RM) return;
  // голова поворачивается к курсору
  if (HOVER) {
    let mx = 0, my = 0, q = false;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY; if (q) return; q = true;
      requestAnimationFrame(() => {
        q = false;
        for (const b of birds) {
          if (b.p.classList.contains('is-fly')) continue;
          const r = b.p.getBoundingClientRect(); if (r.bottom < -50 || r.top > innerHeight + 50) continue;
          const hx = r.left + r.width * .62, hy = r.top + r.height * .3;
          const a = Math.atan2(my - hy, Math.abs(mx - hx) + 40) * 180 / Math.PI;
          b.head.style.transform = `rotate(${clamp(a * .6, -25, 25).toFixed(1)}deg)`;
        }
      });
    }, { passive: true });
  }
  // перелёты по кривой Безье
  let flying = false;
  function fly(perch, startOff) {
    if (flying || !perch) return; flying = true;
    const r0 = main.getBoundingClientRect();
    const visible = !startOff && r0.bottom > 0 && r0.top < innerHeight && r0.width > 0;
    const P0 = visible ? [r0.left, r0.top] : [-70, innerHeight * .22];
    const say = $('.parrot__say', main); say.classList.remove('is-on');
    main.style.transform = `translate3d(${P0[0]}px,${P0[1]}px,0)`;
    document.body.appendChild(main); main.classList.add('is-fly'); main.querySelector('.p-head').style.transform = '';
    const size = main.offsetWidth;
    const t0 = performance.now(), D = 1600; let px = P0[0];
    const step = (now) => {
      const t = clamp((now - t0) / D, 0, 1), e = easeIO(t), u = 1 - e;
      const tr = perch.getBoundingClientRect(), P3 = [tr.left, tr.top - size + 3];
      const dx = P3[0] - P0[0];
      const P1 = [P0[0] + dx * .2, Math.min(P0[1], P3[1]) - 150], P2 = [P3[0] - dx * .22, P3[1] - 190];
      const x = u * u * u * P0[0] + 3 * u * u * e * P1[0] + 3 * u * e * e * P2[0] + e * e * e * P3[0];
      const y = u * u * u * P0[1] + 3 * u * u * e * P1[1] + 3 * u * e * e * P2[1] + e * e * e * P3[1];
      const dir = dx >= 0 ? 1 : -1, tilt = clamp((x - px) * 1.2, -14, 14) * (t < .92 ? 1 : 0);
      px = x;
      main.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scaleX(${dir}) rotate(${(-Math.abs(tilt)).toFixed(1)}deg)`;
      main.dataset.wing = Math.floor((now - t0) / 90) % 2 ? 'down' : 'up';
      if (t < 1) requestAnimationFrame(step);
      else { delete main.dataset.wing; main.classList.remove('is-fly'); main.style.transform = ''; perch.appendChild(main); flying = false; }
    };
    requestAnimationFrame(step);
  }
  // 1-й перелёт — на раму развески, 2-й — на книгу гостей; назад попугай не возвращается
  let stage = 0;
  if (wallAPI.perch) new IntersectionObserver((es, o) => { for (const e of es) if (e.isIntersecting && stage === 0) { stage = 1; o.disconnect(); setTimeout(() => fly(wallAPI.perch), 700); } }, { threshold: .55 }).observe(wallAPI.vp);
  const bookPerch = $('#perch-book');
  if (bookPerch && $('#book')) new IntersectionObserver((es, o) => { for (const e of es) if (e.isIntersecting && stage < 2) { stage = 2; o.disconnect(); setTimeout(() => fly(bookPerch, true), 500); } }, { threshold: .5 }).observe($('#book'));
})();

/* ===== КУРСОР ===== */
if (HOVER && !RM) (() => {
  const c = $('#cursor'), s = $('span', c);
  const TEXT = { drag: 'Тянуть', view: 'Смотреть', before: 'До' };
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, shown = false;
  const loop = () => { x = lerp(x, tx, .18); y = lerp(y, ty, .18); c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; raf = Math.abs(x - tx) > .2 || Math.abs(y - ty) > .2 ? requestAnimationFrame(loop) : 0; };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!shown) { shown = true; x = tx; y = ty; c.classList.add('is-on'); }
    const t = e.target.closest ? e.target.closest('[data-cursor], a, button, input, .parrot') : null;
    const kind = t && t.dataset.cursor && !t.closest('.is-masonry') ? t.dataset.cursor : null;
    c.classList.toggle('is-label', !!kind);
    c.classList.toggle('is-hide', !!t && !kind);
    if (kind && s.textContent !== TEXT[kind]) s.textContent = TEXT[kind];
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { c.classList.remove('is-on'); shown = false; });
})();

/* ===== ЗАПУСК ПОЯВЛЕНИЙ ===== */
$$('.rv').forEach(observe);
if (MOTION) {
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
}
})();
