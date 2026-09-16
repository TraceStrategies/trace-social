// Pulls results for sent posts into metrics.json (keyed by post id) and marks them sent.
// This is what the agent reads to learn which kinds of post earn attention.
import { existsSync } from 'node:fs';
import { organizationId, channels, sentPostsWithMetrics } from '../src/buffer.mjs';
import { loadPosts, savePost, readJson, writeJson, ROOT } from '../src/posts.mjs';

const org = await organizationId();
const ch = await channels(org);
const ids = [ch.linkedin?.id, ch.instagram?.id].filter(Boolean);
const sent = await sentPostsWithMetrics(org, ids);
const byBufferId = new Map(sent.map((s) => [s.id, s]));

const file = ROOT + 'metrics.json';
const metrics = existsSync(file) ? readJson(file) : {};
let n = 0;
for (const post of loadPosts()) {
  const nets = {};
  for (const [net, bid] of Object.entries(post.buffer || {})) {
    const s = byBufferId.get(bid);
    if (s) nets[net] = { sentAt: s.dueAt, updatedAt: s.metricsUpdatedAt, values: Object.fromEntries((s.metrics || []).map((m) => [m.name, m.value])) };
  }
  if (!Object.keys(nets).length) continue;
  metrics[post.id] = { pillar: post.pillar, look: post.card.look || null, headline: post.card.headline, ...nets };
  if (post.status !== 'sent') {
    post.status = 'sent';
    savePost(post);
  }
  n++;
}
writeJson(file, metrics);
console.log(`metrics updated for ${n} posts`);
