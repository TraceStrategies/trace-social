// Post files live in posts/<id>.json with the image beside them at posts/<id>.png.
// The JSON is the whole record: copy, card, provenance, schedule, and Buffer ids once queued.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const POSTS = ROOT + 'posts/';
export const REPO = 'TraceStrategies/trace-social';

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');

export function loadPosts() {
  if (!existsSync(POSTS)) return [];
  return readdirSync(POSTS)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: POSTS + f, ...readJson(POSTS + f) }));
}

export function savePost(post) {
  const { file, ...data } = post;
  writeJson(file, data);
}

export const imageUrl = (id) => `https://raw.githubusercontent.com/${REPO}/main/posts/${id}.png`;

const PILLARS = ['mission', 'method', 'offer', 'product', 'faq'];

// Phrases the company page must never publish. The client names are the website's unverified
// testimonials; the personal names keep this a company voice.
const BANNED = [
  /Linda V\b/i, /Marcus B\b/i, /Yuki T\b/i, /Priya R\b/i, /Hassan/i, /Aisha/i, /Moura/i, /David P/i,
  /\bour clients\b/i, /\bclient results?\b/i, /\bcase stud(y|ies)\b/i,
  /\bAndrew\b/i, /\bDrew\b/i, /\bHardman\b/i,
  /powered by AI/i, /\bguarantee/i, /game[- ]changer/i, /let'?s be (real|straight)/i,
  /\bunlock\b/i, /\bsupercharge/i, /\brevolutioni[sz]e/i,
];

const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

// Returns a list of problems; empty means the post may ship.
export function problems(post, { forQueue = false } = {}) {
  const out = [];
  const need = ['id', 'dueAt', 'pillar', 'source', 'alt', 'linkedin', 'instagram'];
  for (const k of need) if (!post[k]) out.push(`missing ${k}`);
  if (!post.card?.headline) out.push('missing card.headline');
  if (post.pillar && !PILLARS.includes(post.pillar)) out.push(`pillar must be one of ${PILLARS.join(', ')}`);
  if (post.file && !post.file.endsWith(`/${post.id}.json`)) out.push('file name must equal id');
  if (words(post.card?.headline) > 10) out.push('headline over 10 words');
  if (words(post.card?.accent) > 6) out.push('accent over 6 words');
  if (words(post.card?.body) > 22) out.push('card body over 22 words');
  if ((post.linkedin || '').length > 2800) out.push('linkedin text over 2800 chars');
  if ((post.instagram || '').length > 2100) out.push('instagram text over 2100 chars');
  if (((post.instagram || '').match(/#\w+/g) || []).length > 5) out.push('more than 5 hashtags');
  if (post.dueAt && Number.isNaN(Date.parse(post.dueAt))) out.push('dueAt is not a date');
  if (forQueue && Date.parse(post.dueAt) < Date.now() + 15 * 60 * 1000) out.push('dueAt is in the past or under 15 minutes out');

  const knowledge = new Map(readJson(ROOT + 'knowledge.json').map((k) => [k.id, k.status]));
  const cited = Array.isArray(post.source) ? post.source : [];
  if (!cited.length) out.push('source must be a non-empty list of knowledge ids');
  for (const id of cited) if (knowledge.get(id) !== 'public') out.push(`source ${id} is not a public knowledge fact`);

  const all = JSON.stringify({ card: post.card, alt: post.alt, linkedin: post.linkedin, instagram: post.instagram });
  if (/[\u2014\u2013]/.test(all)) out.push('contains an em or en dash');
  for (const re of BANNED) if (re.test(all)) out.push(`banned phrase ${re}`);
  return out;
}
