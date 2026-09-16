// Renders one post card (1080x1350, the 4:5 size both LinkedIn and Instagram show uncropped).
// A card spec is plain JSON the agent writes; the look is fixed here so every post stays on brand.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = fileURLToPath(new URL('..', import.meta.url));
const fontFiles = readdirSync(root + 'fonts').map((f) => root + 'fonts/' + f);
const logo = 'data:image/png;base64,' + readFileSync(root + 'assets/logo.png').toString('base64');

export const W = 1080;
export const H = 1350;

// Site palette (trace-website index.html :root), all solid colors.
const C = {
  bg: '#0A0806',
  card: '#18130D',
  warm: '#141008',
  copper: '#C0894F',
  copperDeep: '#9C6B43',
  patina: '#3D7068',
  ink: '#F2ECE2',
  muted: '#C2B8A6',
  line: '#2A231B',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Average advance per character as a fraction of font size. Deliberately a little wide so
// lines wrap early rather than run off the card.
const ADV = { light: 0.53, regular: 0.54, semibold: 0.57, mono: 0.62 };

function greedy(words, perLine) {
  const lines = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? cur + ' ' + word : word;
    if (next.length > perLine && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Greedy wrap, then narrow the measure as far as the line count allows so lines come out
// even and no single word is left stranded on the last line.
export function wrap(text, size, maxWidth, face = 'light') {
  const words = String(text).split(/\s+/).filter(Boolean);
  const perLine = Math.max(1, Math.floor(maxWidth / (size * ADV[face])));
  let best = greedy(words, perLine);
  for (let n = perLine - 1; n > 0; n--) {
    const trial = greedy(words, n);
    if (trial.length > best.length) break;
    best = trial;
  }
  return best;
}

// Shrinks the size until the text fits the line budget.
function fit(text, { max, min, width, lines, face }) {
  for (let size = max; size >= min; size -= 4) {
    const out = wrap(text, size, width, face);
    if (out.length <= lines) return { size, out };
  }
  return { size: min, out: wrap(text, min, width, face) };
}

function textBlock(lines, { x, y, size, leading, family, weight, fill, anchor = 'middle', spacing = 0 }) {
  return lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${y + i * size * leading}" font-family="${family}" font-weight="${weight}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}">${esc(l)}</text>`,
    )
    .join('');
}

const INTER = 'Inter';
const MONO = 'JetBrains Mono';

function mono(text, x, y, size, fill, anchor = 'middle', spacing = 4) {
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-weight="700" font-size="${size}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}">${esc(String(text).toUpperCase())}</text>`;
}

// A: Broadsheet. Centered, the site's hero recipe: mono eyebrow, light headline, copper punchline.
function broadsheet(s) {
  const cx = W / 2;
  const width = 860;
  const head = fit(s.headline, { max: 104, min: 64, width, lines: 3, face: 'light' });
  const acc = s.accent ? fit(s.accent, { max: head.size, min: 56, width, lines: 1, face: 'semibold' }) : null;
  const lh = 1.12;
  const bodyLines = s.body ? wrap(s.body, 36, 780, 'regular').slice(0, 4) : [];
  const blockH =
    head.out.length * head.size * lh +
    (acc ? acc.out.length * acc.size * lh : 0) +
    (bodyLines.length ? 60 + bodyLines.length * 36 * 1.4 : 0);
  let y = (H - blockH) / 2 + head.size * 0.8;
  let svg = `<rect width="${W}" height="${H}" fill="${C.bg}"/>`;
  svg += `<radialGradient id="g" cx="50%" cy="46%" r="55%"><stop offset="0" stop-color="#2A1C10"/><stop offset="1" stop-color="${C.bg}"/></radialGradient>`;
  svg += `<rect width="${W}" height="${H}" fill="url(#g)"/>`;
  svg += `<rect width="${W}" height="10" fill="${C.copperDeep}"/>`;
  svg += `<image href="${logo}" x="${cx - 60}" y="96" width="120" height="80"/>`;
  svg += mono(s.eyebrow || 'TRACE Strategies', cx, 236, 24, C.copper, 'middle', 7);
  svg += textBlock(head.out, { x: cx, y, size: head.size, leading: lh, family: INTER, weight: 300, fill: C.ink });
  y += head.out.length * head.size * lh;
  if (acc) {
    svg += textBlock(acc.out, { x: cx, y, size: acc.size, leading: lh, family: INTER, weight: 600, fill: C.copper });
    y += acc.out.length * acc.size * lh;
  }
  if (bodyLines.length) {
    y += 40;
    svg += textBlock(bodyLines, { x: cx, y, size: 36, leading: 1.4, family: INTER, weight: 400, fill: C.muted });
  }
  svg += `<line x1="${cx - 180}" y1="${H - 170}" x2="${cx + 180}" y2="${H - 170}" stroke="${C.line}" stroke-width="2"/>`;
  svg += mono('TRACE Strategies', cx, H - 110, 26, C.ink, 'middle', 5);
  return svg;
}

// B: Monogram. One oversized copper letter (or number) is the focal point, the line sits under it.
function monogram(s) {
  const cx = W / 2;
  const glyph = s.letter || (s.headline || 'T').trim()[0];
  const head = fit(s.headline, { max: 84, min: 56, width: 860, lines: 2, face: 'semibold' });
  const bodyLines = s.body || s.accent ? wrap(s.body || s.accent, 38, 800, 'regular').slice(0, 4) : [];
  let svg = `<rect width="${W}" height="${H}" fill="${C.warm}"/>`;
  svg += `<rect x="60" y="60" width="${W - 120}" height="${H - 120}" rx="16" fill="${C.card}" stroke="${C.line}" stroke-width="2"/>`;
  svg += mono(s.eyebrow || 'TRACE Strategies', cx, 170, 24, C.copper, 'middle', 7);
  svg += `<text x="${cx}" y="600" font-family="${INTER}" font-weight="600" font-size="420" fill="${C.copper}" text-anchor="middle">${esc(glyph)}</text>`;
  if (s.step) svg += mono(s.step, cx, 690, 28, C.muted, 'middle', 6);
  let y = 820;
  svg += textBlock(head.out, { x: cx, y, size: head.size, leading: 1.12, family: INTER, weight: 600, fill: C.ink });
  y += head.out.length * head.size * 1.12 + 30;
  svg += textBlock(bodyLines, { x: cx, y, size: 38, leading: 1.4, family: INTER, weight: 400, fill: C.muted });
  svg += `<image href="${logo}" x="${cx - 39}" y="${H - 200}" width="78" height="52"/>`;
  svg += mono('TRACE Strategies', cx, H - 110, 22, C.ink, 'middle', 5);
  return svg;
}

// C: Poster. A solid copper field with dark type, the loudest of the three in a feed.
function poster(s) {
  const cx = W / 2;
  const width = 880;
  const head = fit(s.headline, { max: 108, min: 64, width, lines: 3, face: 'semibold' });
  const acc = s.accent ? fit(s.accent, { max: 60, min: 44, width, lines: 2, face: 'regular' }) : null;
  const bodyLines = s.body ? wrap(s.body, 36, 800, 'regular').slice(0, 3) : [];
  const blockH =
    head.out.length * head.size * 1.08 +
    (acc ? 30 + acc.out.length * acc.size * 1.2 : 0) +
    (bodyLines.length ? 60 + bodyLines.length * 36 * 1.4 : 0);
  let y = (H - blockH) / 2 + head.size * 0.8;
  let svg = `<rect width="${W}" height="${H}" fill="${C.copper}"/>`;
  svg += `<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${C.bg}" stroke-width="3"/>`;
  svg += mono(s.eyebrow || 'TRACE Strategies', cx, 150, 24, C.bg, 'middle', 7);
  if (s.step) svg += mono(s.step, cx, 196, 22, C.bg, 'middle', 6);
  svg += textBlock(head.out, { x: cx, y, size: head.size, leading: 1.08, family: INTER, weight: 600, fill: C.bg, spacing: -2 });
  y += head.out.length * head.size * 1.08;
  if (acc) {
    y += 30;
    svg += textBlock(acc.out, { x: cx, y, size: acc.size, leading: 1.2, family: INTER, weight: 400, fill: C.bg });
    y += acc.out.length * acc.size * 1.2;
  }
  if (bodyLines.length) {
    y += 60;
    svg += `<line x1="${cx - 60}" y1="${y - 50}" x2="${cx + 60}" y2="${y - 50}" stroke="${C.bg}" stroke-width="3"/>`;
    svg += textBlock(bodyLines, { x: cx, y, size: 36, leading: 1.4, family: INTER, weight: 400, fill: '#2A1A0C' });
  }
  svg += `<rect x="${cx - 70}" y="${H - 250}" width="140" height="100" rx="12" fill="${C.bg}"/>`;
  svg += `<image href="${logo}" x="${cx - 48}" y="${H - 232}" width="96" height="64"/>`;
  svg += mono('TRACE Strategies', cx, H - 90, 26, C.bg, 'middle', 5);
  return svg;
}

export const LOOKS = { broadsheet, monogram, poster };
export const DEFAULT_LOOK = 'broadsheet';

export function svgFor(spec, look = spec.look || DEFAULT_LOOK) {
  const draw = LOOKS[look];
  if (!draw) throw new Error(`Unknown look "${look}". Use one of: ${Object.keys(LOOKS).join(', ')}`);
  if (!spec.headline) throw new Error('Card spec needs a headline');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${draw(spec)}</svg>`;
}

export function renderPng(spec, look) {
  const resvg = new Resvg(svgFor(spec, look), {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: INTER },
    fitTo: { mode: 'width', value: W },
  });
  return resvg.render().asPng();
}
