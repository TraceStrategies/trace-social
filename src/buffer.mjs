// Minimal Buffer GraphQL client (https://developers.buffer.com).
// IDs are inlined with JSON.stringify (a valid GraphQL string literal) so no scalar type names are guessed.
// In the cloud routine the key is attached by Anthropic's agent proxy for api.buffer.com, so
// no key exists in this process. Locally, BUFFER_API_KEY is used if it is set.
const ENDPOINT = 'https://api.buffer.com';

export async function gql(query, variables = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.BUFFER_API_KEY) headers.Authorization = `Bearer ${process.env.BUFFER_API_KEY}`;
  const res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    throw new Error(`Buffer ${res.status}: ${JSON.stringify(body.errors || body).slice(0, 500)}`);
  }
  return body.data;
}

export async function organizationId() {
  const data = await gql(`query { account { organizations { id name } } }`);
  const orgs = data.account.organizations;
  if (!orgs.length) throw new Error('Buffer account has no organization');
  return orgs[0].id;
}

// Returns { linkedin, instagram } channel objects. When a network has more than one channel,
// the one whose name mentions TRACE wins, so a personal profile is never picked by accident.
export async function channels(orgId) {
  const data = await gql(
    `query { channels(input: { organizationId: ${JSON.stringify(orgId)} }) { id name service } }`,
  );
  const pick = (service) => {
    const list = data.channels.filter((c) => String(c.service).toLowerCase() === service);
    if (list.length <= 1) return list[0] || null;
    return list.find((c) => /trace/i.test(c.name)) || null;
  };
  return { linkedin: pick('linkedin'), instagram: pick('instagram'), all: data.channels };
}

export async function createPost({ channelId, text, imageUrl, altText, dueAt, instagram }) {
  const input = {
    text,
    channelId,
    schedulingType: 'automatic',
    mode: 'customScheduled',
    dueAt,
    assets: [{ image: { url: imageUrl, metadata: { altText } } }],
  };
  if (instagram) input.metadata = { instagram: { type: 'post', shouldShareToFeed: true } };
  const data = await gql(
    `mutation($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id dueAt } }
        ... on MutationError { message }
      }
    }`,
    { input },
  );
  const r = data.createPost;
  if (!r.post) throw new Error(`Buffer refused the post: ${r.message}`);
  return r.post;
}

export async function sentPostsWithMetrics(orgId, channelIds) {
  const out = [];
  let after = null;
  do {
    const data = await gql(
      `query($after: String) {
        posts(first: 50, after: $after, input: { organizationId: ${JSON.stringify(orgId)}, filter: { status: [sent], channelIds: ${JSON.stringify(channelIds)} } }) {
          edges { node { id channelId dueAt metrics { name value unit } metricsUpdatedAt } }
          pageInfo { endCursor hasNextPage }
        }
      }`,
      { after },
    );
    out.push(...data.posts.edges.map((e) => e.node));
    after = data.posts.pageInfo.hasNextPage ? data.posts.pageInfo.endCursor : null;
  } while (after);
  return out;
}
