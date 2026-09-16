// Renders the image for every draft that passes checks, and marks it rendered.
// Usage: node bin/render.mjs [--look broadsheet|monogram|poster]
import { writeFileSync } from 'node:fs';
import { renderPng } from '../src/card.mjs';
import { loadPosts, savePost, problems, POSTS, ROOT, readJson } from '../src/posts.mjs';

const flag = process.argv.indexOf('--look');
const look = flag > 0 ? process.argv[flag + 1] : readJson(ROOT + 'state.json').look;

let failed = 0;
for (const post of loadPosts().filter((p) => p.status === 'draft')) {
  const list = problems(post);
  if (list.length) {
    failed++;
    console.log(`skip ${post.id}: ${list.join('; ')}`);
    continue;
  }
  writeFileSync(POSTS + post.id + '.png', renderPng(post.card, post.card.look || look));
  post.status = 'rendered';
  savePost(post);
  console.log(`rendered ${post.id}`);
}
process.exit(failed ? 1 : 0);
