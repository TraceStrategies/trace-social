// Builds stack.html: every post with its image, copy buttons, and posted checkmarks, for manual
// posting. Open the file directly in a browser. Posted state is saved in that browser only.
import { writeFileSync } from 'node:fs';
import { loadPosts, ROOT } from '../src/posts.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const day = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' });

const posts = loadPosts().filter((p) => p.status !== 'sent');

const items = posts
  .map(
    (p) => `
<details class="post" data-id="${esc(p.id)}">
  <summary><span class="pip"></span><span class="date">${day(p.dueAt)}</span><span class="title">${esc(p.card.headline)}</span><span class="pillar">${esc(p.pillar)}</span></summary>
  <div class="body">
    <a href="posts/${esc(p.id)}.png" target="_blank"><img src="posts/${esc(p.id)}.png" alt="${esc(p.alt)}"></a>
    <p class="hint">Drag the image into the post, or find it in the posts folder as ${esc(p.id)}.png</p>
    ${['linkedin', 'instagram']
      .map(
        (net) => `
    <div class="net">
      <div class="nethead"><h3>${net === 'linkedin' ? 'LinkedIn' : 'Instagram'}</h3>
        <button class="copy" data-net="${net}">Copy text</button>
        <label><input type="checkbox" data-net="${net}"> Posted</label></div>
      <pre>${esc(p[net])}</pre>
    </div>`,
      )
      .join('')}
    <p class="alt">Alt text: ${esc(p.alt)} <button class="copy small" data-net="alt">Copy</button></p>
  </div>
</details>`,
  )
  .join('');

const data = Object.fromEntries(posts.map((p) => [p.id, { linkedin: p.linkedin, instagram: p.instagram, alt: p.alt }]));

writeFileSync(
  ROOT + 'stack.html',
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TRACE Post Stack</title>
<style>
*{box-sizing:border-box}
:root{--bg:#0A0806;--card:#18130D;--line:#2A231B;--copper:#C0894F;--patina:#3D7068;--ink:#F2ECE2;--muted:#C2B8A6}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.4 Inter,system-ui,sans-serif;padding:48px 16px}
.wrap{max-width:720px;margin:0 auto}
h1{font-weight:300;font-size:34px;text-align:center;margin:0}
.count{text-align:center;color:var(--muted);font:600 13px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;margin:10px 0 36px}
.post{background:var(--card);border:1px solid var(--line);border-radius:16px;margin-bottom:12px}
summary{display:flex;align-items:center;gap:14px;padding:16px 20px;cursor:pointer;list-style:none}
summary::-webkit-details-marker{display:none}
.pip{width:9px;height:9px;border-radius:50%;border:2px solid var(--muted);flex:0 0 auto}
.post.done .pip{background:var(--patina);border-color:var(--patina)}
.post.half .pip{border-color:var(--copper)}
.date{font:600 13px ui-monospace,monospace;color:var(--muted);width:92px;flex:0 0 auto}
.title{flex:1;min-width:0}
.pillar{font:600 11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--copper)}
.post.done .title{color:var(--muted)}
.body{padding:4px 20px 22px;text-align:center}
.body img{display:block;margin:0 auto;width:100%;max-width:420px;height:auto;border-radius:12px;border:1px solid var(--line)}
.hint,.alt{color:var(--muted);font-size:14px;overflow-wrap:anywhere}
.net{text-align:left;margin-top:22px}
.nethead{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
h3{margin:0;font-size:17px;flex:1}
pre{white-space:pre-wrap;font:16px/1.5 Inter,system-ui,sans-serif;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px;margin:10px 0 0;overflow-wrap:anywhere}
button{font:700 12px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;padding:10px 16px;border-radius:10px;border:1px solid var(--copper);background:var(--copper);color:var(--bg);cursor:pointer}
button.small{padding:4px 10px}
label{font-size:15px;color:var(--ink);display:flex;gap:6px;align-items:center;cursor:pointer}
input{width:18px;height:18px;accent-color:#3D7068}
@media(max-width:480px){.pillar{display:none}summary{gap:10px;padding:14px 16px}.body{padding:4px 14px 18px}}
</style></head><body><div class="wrap">
<h1>TRACE post stack</h1>
<p class="count" id="count"></p>
${items}
</div>
<script>
var DATA = ${JSON.stringify(data)};
var KEY = 'trace-stack-v1';
var state = {};
try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function paint() {
  var left = 0, next = null;
  document.querySelectorAll('.post').forEach(function (el) {
    var s = state[el.dataset.id] || {};
    var n = (s.linkedin ? 1 : 0) + (s.instagram ? 1 : 0);
    el.classList.toggle('done', n === 2);
    el.classList.toggle('half', n === 1);
    el.querySelectorAll('input').forEach(function (i) { i.checked = !!s[i.dataset.net]; });
    if (n < 2) { left++; if (!next) next = el; }
  });
  document.getElementById('count').textContent = left + ' of ' + document.querySelectorAll('.post').length + ' still to post';
  return next;
}
document.querySelectorAll('.post').forEach(function (el) {
  var id = el.dataset.id;
  el.querySelectorAll('input').forEach(function (i) {
    i.addEventListener('change', function () {
      state[id] = state[id] || {};
      state[id][i.dataset.net] = i.checked;
      save(); paint();
    });
  });
  el.querySelectorAll('button.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = DATA[id][b.dataset.net];
      var done = function () { var t = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = t; }, 1200); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
      else { fallback(text); done(); }
    });
  });
});
function fallback(text) {
  var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t);
  t.select(); document.execCommand('copy'); t.remove();
}
var next = paint();
if (next) next.open = true;
</script></body></html>
`,
);
console.log(`stack.html: ${posts.length} posts`);
