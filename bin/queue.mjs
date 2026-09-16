// Schedules every rendered post in Buffer on both networks. Run only after the images are
// pushed to main, because Buffer fetches each image from its public GitHub URL.
// Usage: node bin/queue.mjs [--dry-run]
import { organizationId, channels, createPost } from '../src/buffer.mjs';
import { loadPosts, savePost, problems, imageUrl } from '../src/posts.mjs';

const dry = process.argv.includes('--dry-run');
const ready = loadPosts().filter((p) => p.status === 'rendered');
if (!ready.length) {
  console.log('nothing to queue');
  process.exit(0);
}

async function reachable(url) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(url, { method: 'HEAD' }).catch(() => null);
    if (res?.ok) return true;
    await new Promise((r) => setTimeout(r, 15000));
  }
  return false;
}

const org = dry ? null : await organizationId();
const ch = dry ? { linkedin: { id: 'dry' }, instagram: { id: 'dry' } } : await channels(org);
if (!ch.linkedin || !ch.instagram) {
  console.error('Missing channel. Buffer has:', JSON.stringify(ch.all));
  process.exit(1);
}

let failed = 0;
for (const post of ready) {
  const list = problems(post, { forQueue: true });
  if (list.length) {
    failed++;
    console.log(`skip ${post.id}: ${list.join('; ')}`);
    continue;
  }
  const url = imageUrl(post.id);
  if (!dry && !(await reachable(url))) {
    failed++;
    console.log(`skip ${post.id}: image not reachable at ${url} (push first)`);
    continue;
  }
  if (dry) {
    console.log(`would queue ${post.id} at ${post.dueAt} with ${url}`);
    continue;
  }
  // Each network is recorded as soon as it succeeds, so a rerun never double-posts.
  post.buffer ||= {};
  try {
    for (const net of ['linkedin', 'instagram']) {
      if (post.buffer[net]) continue;
      const res = await createPost({
        channelId: ch[net].id,
        text: post[net],
        imageUrl: url,
        altText: post.alt,
        dueAt: new Date(post.dueAt).toISOString(),
        instagram: net === 'instagram',
      });
      post.buffer[net] = res.id;
      savePost(post);
    }
    post.status = 'queued';
    savePost(post);
    console.log(`queued ${post.id} for ${post.dueAt}`);
  } catch (err) {
    failed++;
    console.log(`error ${post.id}: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
