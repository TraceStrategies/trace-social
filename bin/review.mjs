// Builds review.html, the claude.ai artifact where the owner approves or denies each post.
// Decisions live in the artifact's db (collection "reviews", one doc per post id), which Claude
// reads back with read_db. Publish with files: posts/<id>.png for every post listed.
import { writeFileSync } from 'node:fs';
import { loadPosts, ROOT } from '../src/posts.mjs';

const posts = loadPosts()
  .filter((p) => p.status !== 'sent')
  .map((p) => ({
    id: p.id,
    date: p.dueAt,
    pillar: p.pillar,
    headline: p.card.headline,
    alt: p.alt,
    linkedin: p.linkedin,
    instagram: p.instagram,
  }));

const html = `<title>TRACE Post Review</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
:root{
  --ground:#0A0806; --panel:#16110C; --panel-2:#1E1812; --rule:#2E261D;
  --ink:#F2ECE2; --muted:#BDB2A0; --copper:#C0894F; --copper-ink:#140D06;
  --patina:#4E8A80; --brick:#C8614F;
  --sans:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"JetBrains Mono",ui-monospace,"Cascadia Mono",Consolas,monospace;
  color-scheme:dark;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
body{margin:0;background:var(--ground);color:var(--ink);font:16px/1.5 var(--sans);padding-inline:16px;padding-block:28px 64px}
.shell{max-width:1040px;margin:0 auto;display:flex;flex-direction:column;gap:24px}
.label{font:700 11px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
h1{margin:0;font-weight:300;font-size:30px;letter-spacing:-.01em}
.tabs{display:flex;gap:4px;background:var(--panel);border:1px solid var(--rule);border-radius:12px;padding:4px}
.tabs button{font:700 12px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;border:0;border-radius:9px;padding:10px 14px;background:transparent;color:var(--muted);cursor:pointer}
.tabs button[aria-selected="true"]{background:var(--panel-2);color:var(--ink)}
.tabs .n{font-variant-numeric:tabular-nums;color:var(--copper);margin-left:6px}
.status{font:500 13px/1.4 var(--mono);color:var(--muted);min-height:18px}
.status.warn{color:var(--brick)}

/* review view */
.stage{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:28px;align-items:start}
.stage img{width:100%;height:auto;display:block;border-radius:10px;border:1px solid var(--rule)}
.copy-col{display:flex;flex-direction:column;gap:16px;min-width:0}
.meta{display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}
.meta .pillar{color:var(--copper)}
h2{margin:0;font-weight:600;font-size:26px;line-height:1.2;text-wrap:balance}
.text{white-space:pre-wrap;overflow-wrap:anywhere;max-width:62ch;margin:0;color:var(--ink)}
details.ig{border-top:1px solid var(--rule);padding-top:12px}
details.ig summary{cursor:pointer;list-style:none}
details.ig summary::-webkit-details-marker{display:none}
details.ig summary::after{content:" +";color:var(--copper)}
details.ig[open] summary::after{content:" \\2212"}
details.ig .text{margin-top:10px;color:var(--muted)}
.decide{position:sticky;bottom:0;display:flex;gap:10px;padding-block:14px calc(14px + env(safe-area-inset-bottom,0px));background:var(--ground);border-top:1px solid var(--rule)}
.btn{font:700 13px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;border-radius:11px;padding:16px 22px;cursor:pointer;border:1px solid transparent}
.btn:disabled{cursor:not-allowed;background:var(--panel-2);color:var(--muted);border-color:var(--rule)}
.approve{flex:2;background:var(--copper);color:var(--copper-ink)}
.deny{flex:1;background:transparent;color:var(--ink);border-color:var(--rule)}
.deny[aria-expanded="true"]{border-color:var(--brick);color:var(--brick)}
.btn:focus-visible,.chip:focus-visible,.tabs button:focus-visible,summary:focus-visible,textarea:focus-visible{outline:2px solid var(--copper);outline-offset:2px}
.kbd{font:500 11px var(--mono);color:var(--muted);margin-left:8px}
.approve .kbd{color:var(--copper-ink)}
.btn:disabled .kbd{color:var(--muted)}
.reasons{display:flex;flex-direction:column;gap:12px;background:var(--panel);border:1px solid var(--rule);border-radius:12px;padding:16px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{font:500 14px/1 var(--sans);padding:10px 14px;border-radius:999px;border:1px solid var(--rule);background:var(--panel-2);color:var(--ink);cursor:pointer}
.chip[aria-pressed="true"]{background:var(--brick);border-color:var(--brick);color:var(--ground)}
textarea{width:100%;min-height:64px;resize:vertical;background:var(--ground);color:var(--ink);border:1px solid var(--rule);border-radius:10px;padding:10px 12px;font:15px/1.4 var(--sans)}
.confirm{align-self:flex-start;background:var(--brick);color:var(--ground)}
.done{background:var(--panel);border:1px solid var(--rule);border-radius:14px;padding:40px 24px;text-align:center;display:flex;flex-direction:column;gap:8px;align-items:center}
.done strong{font-size:22px;font-weight:600}

/* ready + denied lists */
.list{display:flex;flex-direction:column;gap:8px}
.row{background:var(--panel);border:1px solid var(--rule);border-radius:12px}
.row>summary{display:grid;grid-template-columns:auto 96px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 16px;cursor:pointer;list-style:none}
.row>summary::-webkit-details-marker{display:none}
.pip{width:9px;height:9px;border-radius:50%;border:2px solid var(--muted)}
.pip.half{border-color:var(--copper)}
.pip.full{background:var(--patina);border-color:var(--patina)}
.row .when{font:500 13px var(--mono);color:var(--muted);font-variant-numeric:tabular-nums}
.row .head{overflow-wrap:anywhere}
.row .tag{font:700 11px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.row-body{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:24px;padding:4px 16px 20px}
.row-body img{width:100%;height:auto;border-radius:8px;border:1px solid var(--rule)}
.net{display:flex;flex-direction:column;gap:8px}
.net+.net{border-top:1px solid var(--rule);padding-top:14px;margin-top:14px}
.net-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.net-head h3{margin:0;font-size:16px;flex:1}
.small{padding:9px 12px;font-size:11px;background:var(--panel-2);color:var(--ink);border-color:var(--rule)}
label.check{display:flex;gap:6px;align-items:center;font-size:14px;cursor:pointer}
label.check input{width:18px;height:18px;accent-color:#4E8A80}
.reason-line{color:var(--brick);font-size:14px}
.empty{color:var(--muted);padding:24px 4px}
.toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--panel-2);border:1px solid var(--rule);border-radius:12px;padding:12px 14px;display:flex;gap:14px;align-items:center;font-size:14px}
.toast button{font:700 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;background:none;border:0;color:var(--copper);cursor:pointer}
@media (max-width:760px){
  .stage,.row-body{grid-template-columns:minmax(0,1fr)}
  .stage img{max-width:420px;margin:0 auto}
  .row>summary{grid-template-columns:auto 72px minmax(0,1fr)}
  .row .tag{display:none}
  h1{font-size:24px}
}
@media (prefers-reduced-motion:no-preference){.btn,.chip{transition:background-color .15s,border-color .15s}}
</style>

<div class="shell">
  <header>
    <div>
      <div class="label">TRACE Strategies · LinkedIn + Instagram</div>
      <h1>Post review</h1>
    </div>
    <div class="tabs" role="tablist">
      <button role="tab" id="tab-review" aria-selected="true" data-view="review">To review<span class="n" id="n-review"></span></button>
      <button role="tab" id="tab-ready" aria-selected="false" data-view="ready">Ready to post<span class="n" id="n-ready"></span></button>
      <button role="tab" id="tab-denied" aria-selected="false" data-view="denied">Denied<span class="n" id="n-denied"></span></button>
    </div>
  </header>
  <div class="status" id="status">Connecting to saved decisions…</div>
  <main id="view"></main>
</div>
<div class="toast" id="toast" hidden><span id="toast-text"></span><button id="toast-undo" type="button">Undo</button></div>

<script>
var POSTS = ${JSON.stringify(posts)};
var REASONS = ["Too generic", "Wrong idea", "Weak headline", "Image looks off", "Too long", "Off-brand voice", "Not how we work"];
var reviews = {};
var db = null, downloads = null;
var view = "review", denyOpen = false, picked = [], lastUndo = null, toastTimer = null;

function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function day(iso){return new Date(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/New_York"});}
function img(p){return "posts/" + p.id + ".png";}
function decision(p){var r = reviews[p.id]; return r && r.decision;}
function pending(){return POSTS.filter(function(p){return !decision(p);});}
function byDecision(d){return POSTS.filter(function(p){return decision(p) === d;});}

function setStatus(text, warn){var el = document.getElementById("status"); el.textContent = text; el.classList.toggle("warn", !!warn);}

function render(){
  document.getElementById("n-review").textContent = pending().length;
  document.getElementById("n-ready").textContent = byDecision("approved").length;
  document.getElementById("n-denied").textContent = byDecision("denied").length;
  document.querySelectorAll(".tabs button").forEach(function(b){b.setAttribute("aria-selected", String(b.dataset.view === view));});
  var main = document.getElementById("view");
  if (view === "review") main.innerHTML = reviewView();
  else main.innerHTML = listView(view === "ready" ? "approved" : "denied");
}

function reviewView(){
  var list = pending();
  if (!list.length) return '<div class="done"><strong>All caught up</strong><span class="label">Nothing left to review</span></div>';
  var p = list[0];
  var locked = !db;
  var chips = REASONS.map(function(r){return '<button type="button" class="chip" data-reason="' + esc(r) + '" aria-pressed="' + (picked.indexOf(r) >= 0) + '">' + esc(r) + '</button>';}).join("");
  return '<section class="stage">' +
    '<img src="' + img(p) + '" alt="' + esc(p.alt) + '" width="1080" height="1350">' +
    '<div class="copy-col">' +
      '<div class="meta"><span class="label">' + esc(day(p.date)) + '</span><span class="label pillar">' + esc(p.pillar) + '</span><span class="label">' + (POSTS.length - list.length + 1) + ' of ' + POSTS.length + '</span></div>' +
      '<h2>' + esc(p.headline) + '</h2>' +
      '<p class="label">LinkedIn</p><p class="text">' + esc(p.linkedin) + '</p>' +
      '<details class="ig"><summary class="label">Instagram caption</summary><p class="text">' + esc(p.instagram) + '</p></details>' +
      (denyOpen ? '<div class="reasons"><span class="label">Why? Tap any that apply</span><div class="chips">' + chips + '</div>' +
        '<textarea id="deny-note" placeholder="Anything else (optional)"></textarea>' +
        '<button type="button" class="btn confirm" id="confirm-deny"' + (locked ? " disabled" : "") + '>Deny post</button></div>' : '') +
      '<div class="decide">' +
        '<button type="button" class="btn approve" id="approve" data-id="' + esc(p.id) + '"' + (locked ? " disabled" : "") + '>Approve<span class="kbd">A</span></button>' +
        '<button type="button" class="btn deny" id="deny" aria-expanded="' + denyOpen + '"' + (locked ? " disabled" : "") + '>Deny<span class="kbd">D</span></button>' +
      '</div>' +
    '</div></section>';
}

function listView(d){
  var list = byDecision(d);
  if (!list.length) return '<p class="empty">' + (d === "approved" ? "Approved posts show up here, ready to copy and post." : "Nothing denied.") + '</p>';
  return '<div class="list">' + list.map(function(p){
    var r = reviews[p.id] || {};
    var n = (r.linkedinPosted ? 1 : 0) + (r.instagramPosted ? 1 : 0);
    var pip = d === "approved" ? '<span class="pip ' + (n === 2 ? "full" : n === 1 ? "half" : "") + '"></span>' : '<span class="pip"></span>';
    var body = d === "approved"
      ? ["linkedin","instagram"].map(function(net){
          return '<div class="net"><div class="net-head"><h3>' + (net === "linkedin" ? "LinkedIn" : "Instagram") + '</h3>' +
            '<button type="button" class="btn small" data-copy="' + net + '" data-id="' + esc(p.id) + '">Copy text</button>' +
            '<label class="check"><input type="checkbox" id="posted-' + esc(p.id) + '-' + net + '" data-posted="' + net + '" data-id="' + esc(p.id) + '"' + (r[net + "Posted"] ? " checked" : "") + '> Posted</label></div>' +
            '<p class="text">' + esc(p[net]) + '</p></div>';
        }).join("") +
        '<div class="net"><div class="net-head"><h3>Image</h3>' +
          (downloads ? '<button type="button" class="btn small" data-save="' + esc(p.id) + '">Save image</button>' : '') +
          '<button type="button" class="btn small" data-copy="alt" data-id="' + esc(p.id) + '">Copy alt text</button>' +
          '<button type="button" class="btn small" data-reopen="' + esc(p.id) + '">Back to review</button></div></div>'
      : '<div class="net"><p class="reason-line">' + esc((r.reasons || []).join(" · ") || "No reason given") + '</p>' +
          (r.note ? '<p class="text">' + esc(r.note) + '</p>' : '') +
          '<div class="net-head"><button type="button" class="btn small" data-reopen="' + esc(p.id) + '">Back to review</button></div></div>';
    return '<details class="row"><summary>' + pip + '<span class="when">' + esc(day(p.date)) + '</span><span class="head">' + esc(p.headline) + '</span><span class="tag">' + esc(p.pillar) + '</span></summary>' +
      '<div class="row-body"><img src="' + img(p) + '" alt="' + esc(p.alt) + '" loading="lazy" width="1080" height="1350"><div>' + body + '</div></div></details>';
  }).join("") + '</div>';
}

function write(id, data){
  if (!db) return Promise.reject({code:"unavailable"});
  return db.doc("reviews/" + id).set(data).catch(function(e){
    setStatus(e && e.code === "invalid_argument" ? "This account can only view decisions." : "Could not save. Check your connection and try again.", true);
    throw e;
  });
}
function merge(id, patch){
  var cur = reviews[id] || {};
  var next = {}; for (var k in cur) next[k] = cur[k]; for (var j in patch) next[j] = patch[j];
  return write(id, next);
}
function base(p){return {postId:p.id, headline:p.headline, pillar:p.pillar};}
function find(id){return POSTS.filter(function(p){return p.id === id;})[0];}

function decide(p, data, label){
  var prev = reviews[p.id] || null;
  var body = base(p); for (var k in data) body[k] = data[k]; body.decidedAt = new Date().toISOString();
  reviews[p.id] = body; denyOpen = false; picked = []; render();
  write(p.id, body).then(function(){ showToast(label, function(){ if (prev) write(p.id, prev); else db.doc("reviews/" + p.id).delete(); }); })
    .catch(function(){ if (prev) reviews[p.id] = prev; else delete reviews[p.id]; render(); });
}

function showToast(text, undo){
  lastUndo = undo;
  document.getElementById("toast-text").textContent = text;
  document.getElementById("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ document.getElementById("toast").hidden = true; lastUndo = null; }, 6000);
}

function copy(text, btn){
  var ok = function(){ var t = btn.textContent; btn.textContent = "Copied"; setTimeout(function(){ btn.textContent = t; }, 1200); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, function(){ fallbackCopy(text); ok(); });
  else { fallbackCopy(text); ok(); }
}
function fallbackCopy(text){var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e) {} t.remove();}

document.addEventListener("click", function(e){
  var t = e.target.closest("button"); if (!t) return;
  if (t.dataset.view){ view = t.dataset.view; denyOpen = false; render(); return; }
  var p = pending()[0];
  if (t.id === "approve" && p){ decide(p, {decision:"approved", reasons:[], note:""}, "Approved"); return; }
  if (t.id === "deny"){ denyOpen = !denyOpen; picked = []; render(); return; }
  if (t.dataset.reason){ var r = t.dataset.reason, i = picked.indexOf(r); if (i >= 0) picked.splice(i, 1); else picked.push(r); t.setAttribute("aria-pressed", String(i < 0)); return; }
  if (t.id === "confirm-deny" && p){ var note = (document.getElementById("deny-note") || {}).value || ""; decide(p, {decision:"denied", reasons:picked.slice(), note:note.trim()}, "Denied"); return; }
  if (t.id === "toast-undo"){ if (lastUndo) lastUndo(); document.getElementById("toast").hidden = true; lastUndo = null; return; }
  if (t.dataset.copy){ var q = find(t.dataset.id); copy(t.dataset.copy === "alt" ? q.alt : q[t.dataset.copy], t); return; }
  if (t.dataset.reopen){ if (db) db.doc("reviews/" + t.dataset.reopen).delete(); return; }
  if (t.dataset.save && downloads){
    var id = t.dataset.save;
    fetch("posts/" + id + ".png").then(function(r){ return r.blob(); })
      .then(function(b){ return downloads.save({filename: id + ".png", data: b}); })
      .catch(function(err){ if (err && err.code && err.code !== "declined") setStatus("Could not save the image here. Long-press or right-click the image instead.", true); });
  }
});
document.addEventListener("change", function(e){
  var c = e.target; if (!c.dataset || !c.dataset.posted) return;
  var patch = {}; patch[c.dataset.posted + "Posted"] = c.checked;
  merge(c.dataset.id, patch).catch(function(){ c.checked = !c.checked; });
});
document.addEventListener("keydown", function(e){
  if (view !== "review" || e.target.closest("textarea,input") || e.metaKey || e.ctrlKey || e.altKey || !db) return;
  var p = pending()[0]; if (!p) return;
  if (e.key === "a" || e.key === "A"){ decide(p, {decision:"approved", reasons:[], note:""}, "Approved"); }
  if (e.key === "d" || e.key === "D"){ denyOpen = true; picked = []; render(); }
});

render();

(async function(){
  var dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
  downloads = dl;
  var d = window.claude && window.claude.use ? await window.claude.use("db") : null;
  if (!d){ setStatus("Decisions can only be saved when this page is opened on claude.ai.", true); render(); return; }
  db = d;
  db.collection("reviews").onSnapshot(function(snap){
    var next = {};
    snap.docs.forEach(function(doc){ next[doc.id] = doc.data(); });
    reviews = next;
    setStatus("");
    var active = document.activeElement && document.activeElement.id === "deny-note";
    if (!active) render();
  }, function(){ setStatus("Lost the connection to saved decisions. Reload the page.", true); });
})();
</script>
`;

writeFileSync(ROOT + 'review.html', html);
console.log(`review.html: ${posts.length} posts`);
