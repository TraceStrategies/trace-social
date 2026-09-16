// Validates every post that has not been queued yet. Exits non-zero on any problem.
import { loadPosts, problems } from '../src/posts.mjs';

let bad = 0;
const pending = loadPosts().filter((p) => p.status !== 'queued' && p.status !== 'sent');
for (const p of pending) {
  const list = problems(p);
  if (list.length) {
    bad++;
    console.log(`FAIL ${p.id || p.file}\n  - ${list.join('\n  - ')}`);
  } else console.log(`ok   ${p.id}`);
}
console.log(`${pending.length} pending, ${bad} failing`);
process.exit(bad ? 1 : 0);
