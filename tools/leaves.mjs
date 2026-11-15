// Листья монстеры и пальмовые вайи: собственные SVG-силуэты + текстуры теней для живого фона.
//   node tools/leaves.mjs  → tools/.cache/leaves.json, assets/svg/leaves.svg, assets/img/bg/shadow-*.webp, raw/leaves-preview.png
import sharp from 'sharp';
import fs from 'node:fs';
const rnd = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const R = (v) => Math.round(v * 10) / 10;
// контур «сердца»: угол от кончика (0°) к основанию (180°) → радиус
const PROFILE = [[0, 1.0], [22, 0.95], [50, 0.86], [85, 0.79], [115, 0.74], [145, 0.66], [165, 0.5], [176, 0.3], [180, 0.1]];
function radius(a) {
  for (let i = 1; i < PROFILE.length; i++) {
    const [a0, r0] = PROFILE[i - 1], [a1, r1] = PROFILE[i];
    if (a <= a1) { const t = (a - a0) / (a1 - a0); const s = t * t * (3 - 2 * t); return r0 + (r1 - r0) * s; }
  }
  return 0.1;
}
// точка листа: центр — место, где черешок входит в пластину (0,0); кончик смотрит вниз
const pt = (a, r, side, L) => [R(side * Math.sin(a * Math.PI / 180) * r * L * 0.92), R(Math.cos(a * Math.PI / 180) * r * L + L * 0.18)];
function monstera(seed, L = 300) {
  // Перистое строение: разрезы идут от края к средней жилке вдоль боковых жилок (у кончика — под острым углом,
  // у основания — почти назад), а не веером из одной точки.
  const rand = rnd(seed);
  const sides = [], holes = [], veins = [];
  const quad = (p0, c, p1, n = 7) => Array.from({ length: n }, (_, i) => { const t = (i + 1) / n, u = 1 - t; return [R(u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0]), R(u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1])]; });
  for (const side of [1, -1]) {
    const slits = [];
    let a = 30 + rand() * 9;
    while (a < 146) { slits.push({ a, w: 4.2 + rand() * 2.6 }); a += 20 + rand() * 10; }
    if (rand() < 0.45) slits.splice(1 + Math.floor(rand() * (slits.length - 2)), 1); // асимметрия: один разрез не прорезался
    const pts = [];
    let cur = 0, prevInner = null;
    for (const s of [...slits, null]) {
      const end = s ? s.a - s.w / 2 : 180;
      for (let ang = cur; ang <= end; ang += 2.5) pts.push(pt(ang, radius(ang) * (1 + Math.sin(ang * 0.21 + seed) * 0.014), side, L));
      if (!s) break;
      const m1 = pt(s.a - s.w / 2, radius(s.a - s.w / 2), side, L), m2 = pt(s.a + s.w / 2, radius(s.a + s.w / 2), side, L);
      const phi = (40 + (s.a - 30) * 0.6) * Math.PI / 180; // угол боковой жилки к средней
      const xi = side * L * (0.085 + rand() * 0.06);
      const mx = (m1[0] + m2[0]) / 2, my = (m1[1] + m2[1]) / 2;
      let yi = my - (Math.abs(mx) - Math.abs(xi)) / Math.tan(phi);
      yi = Math.max(-L * 0.12, Math.min(L * 0.95, yi));
      const e1 = [xi, yi - L * 0.011], e2 = [xi, yi + L * 0.011], tipC = [xi - side * L * 0.022, yi];
      const bow = L * 0.045;
      pts.push(...quad(m1, [(m1[0] + e1[0]) / 2, (m1[1] + e1[1]) / 2 + bow], e1), ...quad(e1, tipC, e2, 4), ...quad(e2, [(m2[0] + e2[0]) / 2, (m2[1] + e2[1]) / 2 + bow * 1.15], m2));
      // жилка к середине лопасти и отверстие у средней жилки между соседними разрезами
      if (prevInner) {
        const vy = (prevInner[1] + yi) / 2, lobeA = s.a - s.w / 2 - 9;
        const tipP = pt(lobeA, radius(lobeA) * 0.88, side, L);
        veins.push([[0, vy - L * 0.03], tipP]);
        if (rand() < 0.62) {
          const hx = side * L * (0.1 + rand() * 0.07), t = Math.abs(hx) / Math.max(1, Math.abs(tipP[0]));
          const hy = (vy - L * 0.03) + (tipP[1] - (vy - L * 0.03)) * t;
          const dir = Math.atan2(tipP[1] - vy, tipP[0]);
          holes.push({ c: [R(hx), R(hy)], rl: L * (0.035 + rand() * 0.03), rs: L * (0.013 + rand() * 0.009), dir });
        }
      }
      prevInner = [xi, yi];
      cur = s.a + s.w / 2 + 2.5;
    }
    sides.push(pts);
  }
  const all = [...sides[0], ...sides[1].reverse()];
  let d = all.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('') + 'Z';
  for (const h of holes) {
    const deg = R(h.dir * 180 / Math.PI), dx = Math.cos(h.dir) * h.rl, dy = Math.sin(h.dir) * h.rl;
    const a = [R(h.c[0] - dx), R(h.c[1] - dy)], b = [R(h.c[0] + dx), R(h.c[1] + dy)];
    d += `M${a[0]} ${a[1]}A${R(h.rl)} ${R(h.rs)} ${deg} 1 0 ${b[0]} ${b[1]}A${R(h.rl)} ${R(h.rs)} ${deg} 1 0 ${a[0]} ${a[1]}Z`;
  }
  const rib = `M${R(L * 0.02)} ${R(-L * 0.5)}Q${R(-L * 0.03)} ${R(-L * 0.1)} 0 ${R(L * 0.09)}L0 ${R(L * 1.15)}`;
  const vein = veins.map(([p, q]) => `M${R(p[0])} ${R(p[1])}Q${R((p[0] + q[0]) / 2)} ${R((p[1] + q[1]) / 2 + L * 0.03)} ${q[0]} ${q[1]}`).join('');
  return { d, rib, vein, box: [-L, -L * 0.52, L * 2, L * 1.78] };
}
// пальмовая вайя: веер длинных узких листочков вдоль изогнутого стебля
function frond(seed, L = 420) {
  const rand = rnd(seed);
  let d = '';
  const n = 15;
  const stem = (t) => [R(t * L * 0.22 * Math.sin(t * 1.4)), R(-t * L)];
  for (let i = 2; i < n; i++) {
    const t = i / n, [x, y] = stem(t);
    for (const side of [1, -1]) {
      const len = L * (0.36 + 0.3 * Math.sin(t * Math.PI)) * (0.85 + rand() * 0.3);
      const ang = (side * (62 - t * 34) + (rand() - 0.5) * 10) * Math.PI / 180;
      const ex = R(x + Math.sin(ang) * len), ey = R(y - Math.cos(ang) * len + len * 0.22);
      const w = len * 0.055;
      const nx = Math.cos(ang) * w, ny = Math.sin(ang) * w;
      d += `M${x} ${y}Q${R((x + ex) / 2 + nx)} ${R((y + ey) / 2 + ny - len * 0.08)} ${ex} ${ey}Q${R((x + ex) / 2 - nx)} ${R((y + ey) / 2 - ny + len * 0.02)} ${x} ${y}Z`;
    }
  }
  const [tx, ty] = stem(1);
  const stemD = `M0 ${R(L * 0.25)}Q${R(L * 0.02)} ${R(-L * 0.4)} ${tx} ${ty}`;
  return { d, rib: stemD, vein: '', box: [-L * 0.75, -L * 1.1, L * 1.5, L * 1.45] };
}
const leaves = { m1: monstera(7), m2: monstera(23), m3: monstera(41), m4: monstera(58), f1: frond(5), f2: frond(19) };
fs.writeFileSync('tools/.cache/leaves.json', JSON.stringify(leaves));
// спрайт для вёрстки
const sprite = `<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(leaves).map(([id, l]) => `<symbol id="leaf-${id}" viewBox="${l.box.map(R).join(' ')}"><path class="leaf-body" fill-rule="evenodd" d="${l.d}"/><path class="leaf-rib" fill="none" d="${l.rib}${l.vein}"/></symbol>`).join('')}</svg>`;
fs.writeFileSync('assets/svg/leaves.svg', sprite);
console.log('sprite', Math.round(sprite.length / 1024) + 'K', Object.entries(leaves).map(([k, l]) => k + ':' + l.d.length).join(' '));

// предпросмотр
const tile = (l, fill, x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path fill="${fill}" fill-rule="evenodd" d="${l.d}"/><path d="${l.rib}${l.vein}" fill="none" stroke="#5A7556" stroke-width="2"/></g>`;
const prev = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="700"><rect width="100%" height="100%" fill="#F2EEE6"/>${tile(leaves.m1, '#1D3A2A', 220, 180, 0.8, 0)}${tile(leaves.m2, '#1D3A2A', 640, 180, 0.8, 0)}${tile(leaves.m3, '#1D3A2A', 1060, 180, 0.8, 0)}${tile(leaves.m4, '#1D3A2A', 1480, 180, 0.8, 0)}</svg>`;
await sharp(Buffer.from(prev)).png().toFile('raw/leaves-preview.png');

// текстуры теней: чёрные силуэты, сильно размытые, с альфой
async function shadow(file, W, H, items, sigma, q = 46) {
  const body = items.flatMap((it) => [-H, 0, H].map((dy) => [it[0], it[1], it[2] + dy, it[3], it[4]])).map(([key, x, y, s, rot]) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path fill="#000" fill-rule="evenodd" d="${leaves[key].d}"/><path d="${leaves[key].rib}" fill="none" stroke="#000" stroke-width="7"/></g>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H * 3}" viewBox="0 ${-H} ${W} ${H * 3}">${body}</svg>`;
  const mid = async (sg) => sharp(await sharp(Buffer.from(svg)).blur(sg).png().toBuffer()).extract({ left: 0, top: H, width: W, height: H }).png().toBuffer();
  const sharpPart = await mid(sigma * 0.45);
  const softPart = await mid(sigma * 1.7);
  // ближняя резкая тень слабее, дальняя размытая — основная: получается «свет сквозь листья»
  const mix = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: softPart, blend: 'over' }, { input: await sharp(sharpPart).ensureAlpha(0.5).png().toBuffer(), blend: 'over' }]).png().toBuffer();
  const info = await sharp(mix).webp({ quality: q, alphaQuality: 55, effort: 6 }).toFile(`assets/img/bg/${file}`);
  console.log(file, info.width + 'x' + info.height, Math.round(info.size / 1024) + 'K');
}
await shadow('shadow-a.webp', 1400, 1000, [['m1', 260, 300, 1.25, -28], ['m3', 1180, 190, 1.05, 152], ['f1', 760, 1080, 1.3, 14], ['m2', 1330, 800, 0.9, -110]], 9);
await shadow('shadow-b.webp', 1400, 1000, [['f2', 180, 1040, 1.5, 24], ['m4', 980, 420, 1.15, 38], ['f1', 1420, 560, 1.2, -62], ['m2', 420, 60, 0.8, 175]], 13);
