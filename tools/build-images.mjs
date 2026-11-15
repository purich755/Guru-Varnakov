// Сборка изображений сайта из raw/orig → assets/img. node tools/build-images.mjs
// Все кадры — из галереи Яндекс.Карт заведения. Цветокоррекция общая и мягкая: чуть теплее, чуть ниже контраст.
import sharp from 'sharp';
import fs from 'node:fs';
const OUT = 'assets/img';
for (const d of ['hero', 'hall', 'wall', 'tech', 'works', 'masters', 'misc', 'bg']) fs.mkdirSync(`${OUT}/${d}`, { recursive: true });
const WARM = [[1.03, 0.015, 0], [0, 1.0, 0], [0, 0.02, 0.955]];
const grade = (s) => s.recomb(WARM).modulate({ saturation: 0.95 }).linear(0.96, 5);
const src = (k) => sharp(`raw/orig/${k}.jpg`).rotate();
const report = [];
async function out(pipe, file, q = 80) {
  const info = await grade(pipe).webp({ quality: q, effort: 5 }).toFile(`${OUT}/${file}`);
  report.push(`${file} ${info.width}x${info.height} ${Math.round(info.size / 1024)}K`);
  return info;
}
const cover = (k, w, h, position = 'attention') => src(k).resize(w, h, { fit: 'cover', position: position === 'attention' ? sharp.strategy.attention : position });

// --- hero
await out(cover('g157', 1000, 1500, 'top'), 'hero/hero-mirror.webp', 80);
await out(cover('g157', 600, 900, 'top'), 'hero/hero-mirror-600.webp', 78);
// --- залы
await out(cover('g000', 1800, 1013, 'centre'), 'hall/hall-wide.webp', 76);
await out(cover('g000', 900, 1200, 'centre'), 'hall/hall-wide-m.webp', 76);
await out(cover('g268', 1800, 1200, 'centre'), 'hall/final-hall.webp', 76);
await out(cover('g268', 800, 1200, 'centre'), 'hall/final-hall-m.webp', 76);

// --- развеска: [ключ, ширина, высота, позиция]
const WALL = [
  ['g284', 900, 600, 'centre'], ['g103', 690, 920, 'centre'], ['g258', 900, 600, 'centre'], ['g167', 690, 920, 'south'],
  ['g176', 720, 900, 'centre'], ['g168', 640, 960, 'centre'], ['g282', 900, 600, 'centre'], ['g017', 800, 800, 'attention'],
  ['g272', 900, 675, 'centre'], ['g114', 690, 920, 'centre'], ['g126', 800, 800, 'attention'], ['g170', 640, 960, 'centre'],
  ['g287', 900, 720, 'centre'], ['g270', 900, 675, 'centre'],
];
let n = 0;
for (const [k, w, h, pos] of WALL) { n++; await out(cover(k, w, h, pos), `wall/wall-${String(n).padStart(2, '0')}.webp`, 78); }

// --- техники и V-cut
const TECH = { grade: ['g185', 'top'], vcut: ['g164', 'centre'], image: ['g024', 'top'], nature: ['g087', 'top'], black: ['g136', 'centre'], blonde: ['g237', 'centre'] };
for (const [name, [k, pos]] of Object.entries(TECH)) await out(cover(k, 720, 960, pos), `tech/tech-${name}.webp`, 78);
let v = 0;
for (const k of ['g200', 'g199', 'g206']) { v++; await out(cover(k, 640, 960, 'centre'), `tech/vcut-0${v}.webp`, 78); }

// --- пары до/после: исходник — две половины в одном кадре; режем одинаково, плашек на исходниках нет
const PAIRS = ['g007', 'g008', 'g002', 'g004', 'g006', 'g011', 'g012', 'g013', 'g133', 'g141', 'g161', 'g001'];
let p = 0;
for (const k of PAIRS) {
  p++;
  const m = await src(k).metadata();
  const hw = Math.floor(m.width / 2), inset = Math.round(hw * 0.02);
  const w = hw - inset * 2, h = Math.min(m.height - Math.round(m.height * 0.06), Math.round(w * 1.5));
  const top = Math.round(m.height * 0.05);
  const id = String(p).padStart(2, '0');
  for (const [side, name] of [[0, 'before'], [1, 'after']]) {
    const buf = await sharp(`raw/orig/${k}.jpg`).rotate().extract({ left: side * hw + inset, top, width: w, height: h }).toBuffer();
    await out(sharp(buf).resize(700, 1050, { fit: 'cover' }), `works/work-${id}-${name}.webp`, 78);
  }
}

// --- разное
await out(cover('g048', 900, 1125, 'centre'), 'misc/curator.webp', 80);
const CAT = { cuts: ['g083', 'centre'], color: ['g089', 'centre'], care: ['g045', 'centre'], styling: ['g247', 'centre'], consult: ['g264', 'centre'] };
for (const [name, [k, pos]] of Object.entries(CAT)) await out(cover(k, 720, 960, pos), `misc/cat-${name}.webp`, 76);
// og:image — кадр зеркала на гипсе
const mirror = await grade(cover('g157', 360, 540, 'top')).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#F2EEE6' } })
  .composite([{ input: Buffer.from('<svg width="368" height="548"><rect width="368" height="548" fill="#15120F"/></svg>'), left: 700, top: 41 }, { input: mirror, left: 704, top: 45 }])
  .jpeg({ quality: 84 }).toFile(`${OUT}/misc/og-base.jpg`);
console.log(report.join('\n'));
const total = report.reduce((s, r) => s + Number(r.match(/(\d+)K$/)[1]), 0);
console.log('total', total, 'K');
