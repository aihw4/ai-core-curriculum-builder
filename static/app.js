const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : "#");
let NEWS = [];
let LAST = null;

// ---------- tabs ----------
function showTab(id) {
  $$(".tab").forEach((t) => t.classList.toggle("active", t.id === id));
  $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  history.replaceState(null, "", "#" + id);
  window.scrollTo(0, 0);
  if (id === "costs") loadUsage();
}
$$("#tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
$$("[data-goto]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); showTab(a.dataset.goto); }));
const start = location.hash.slice(1);
if (start && document.getElementById(start)) showTab(start);

// ---------- turn "L07" into links to the reading ----------
function linkModuleOf(id) {
  const el = document.getElementById("read-" + id);
  return el ? el.closest(".tab").id : "library";
}
$$(".linkify").forEach((p) => {
  p.innerHTML = p.innerHTML.replace(/\bL(\d\d)\b/g, (m) => `<a class="cite" href="#" data-cite="${m}">${m}</a>`);
});
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-cite]");
  if (!c) return;
  e.preventDefault();
  const id = c.dataset.cite;
  showTab(linkModuleOf(id));
  const el = document.getElementById("read-" + id);
  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.outline = "2px solid #286dc0"; setTimeout(() => (el.style.outline = ""), 1800); }
});

// ---------- news ----------
function newsCard(n) {
  const mod = n.module ? `<span class="pill m${n.module}">Module ${n.module}</span>` : "";
  return `<div class="news"><div class="src">${mod}<span>${esc(n.source)}</span><span>· ${n.ts ? new Date(n.ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : esc(n.published || "")}</span><span class="muted">${n.id}</span></div>
    <a href="${esc(safeUrl(n.url))}" target="_blank" rel="noopener">${esc(n.title)}</a>
    ${n.teaching_hook ? `<p class="hook">${esc(n.teaching_hook)}</p>` : ""}</div>`;
}
function renderNews() {
  const mod = $("#news-module").value, grp = $("#news-group").value, q = $("#news-search").value.toLowerCase();
  const list = NEWS.filter((n) => (mod === "all" || String(n.module) === mod) && (grp === "all" || n.group === grp) && (!q || (n.title + n.source).toLowerCase().includes(q)));
  $("#news-list").innerHTML = list.length ? list.map(newsCard).join("") : `<p class="muted">No stories match.</p>`;
  $$(".module-news").forEach((box) => {
    const items = NEWS.filter((n) => String(n.module) === box.dataset.module).slice(0, 8);
    box.innerHTML = items.length ? items.map(newsCard).join("") : `<p class="muted">No tagged stories yet. ${NEWS.length ? "Module tags need a PORTKEY_API_KEY." : ""}</p>`;
  });
}
async function loadNews(refresh = false) {
  $("#news-meta").textContent = refresh ? "Refreshing feeds…" : "Loading…";
  try {
    const r = await fetch("/api/news" + (refresh ? "?refresh=1" : ""));
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    NEWS = d.items || [];
    const when = d.fetched_at ? new Date(d.fetched_at * 1000).toLocaleString() : "";
    $("#news-meta").textContent = `${NEWS.length} stories · updated ${when}${d.tagged ? "" : " · untagged (no API key)"}${d.offline ? " · offline sample" : ""}`;
    $("#feed-status").innerHTML = (d.status || []).map((s) => `<span>${s.ok ? "✅" : "⚠️"} ${esc(s.source)} (${s.count})</span>`).join("");
    renderNews();
  } catch (e) {
    $("#news-list").innerHTML = `<div class="notice bad">Could not load news: ${esc(e.message)}</div>`;
  }
}
["#news-module", "#news-group"].forEach((s) => $(s).addEventListener("change", renderNews));
$("#news-search").addEventListener("input", renderNews);
$("#news-refresh").addEventListener("click", () => loadNews(true));
loadNews();

// ---------- library search ----------
$("#lib-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  $$(".lib tbody tr").forEach((tr) => (tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none"));
});

// ---------- builder ----------
const form = $("#build-form");
function updateWeights() {
  let sum = 0;
  $$("fieldset input[type=range]", form).forEach((r) => { r.nextElementSibling.textContent = r.value + "%"; sum += +r.value; });
  $("#wsum").textContent = sum === 100 ? "(total 100%)" : `(total ${sum}%, will be rescaled)`;
}
$$("fieldset input[type=range]", form).forEach((r) => r.addEventListener("input", updateWeights));
updateWeights();

const STEPS = ["News Curator: fetching and tagging live news", "Curriculum Designer: drafting sessions", "Citation Checker: verifying every reading", "Balance Reviewer: checking for one-sided framing"];
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const total = (+data.w1 + +data.w2 + +data.w3) || 1;
  ["w1", "w2", "w3"].forEach((k) => (data[k] = Math.round((+data[k] / total) * 100)));
  $("#build-btn").disabled = true;
  let i = 0;
  const draw = () => ($("#build-out").innerHTML = `<div class="card"><h4>Agents at work…</h4><div class="progress">${STEPS.map((s, j) => `<div class="p">${j < i ? "✅" : j === i ? '<div class="spin"></div>' : "○"} ${s}</div>`).join("")}</div></div>`);
  draw();
  const timer = setInterval(() => { if (i < STEPS.length - 1) { i++; draw(); } }, 15000);
  try {
    const r = await fetch("/api/build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Request failed");
    LAST = d;
    renderPlan(d);
    renderTrace(d);
  } catch (err) {
    $("#build-out").innerHTML = `<div class="notice bad"><strong>Something went wrong.</strong> ${esc(err.message)}</div>`;
  } finally {
    clearInterval(timer);
    $("#build-btn").disabled = false;
  }
});

function readingLink(x) {
  const tag = x.kind === "news" ? "News" : "Library";
  return `<li><span class="verified">✓ ${tag} ${esc(x.id)}</span> <a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(x.title)}</a> <span class="meta">— ${esc(x.source)}</span></li>`;
}
function renderPlan(d) {
  const p = d.plan, rv = d.review || {};
  const warn = (d.warnings || []).map((w) => `<div class="notice warn">${esc(w)}</div>`).join("");
  const removed = d.removed && d.removed.length
    ? `<div class="notice warn"><strong>Citation Checker removed ${d.removed.length} unverifiable reference(s):</strong> ${d.removed.map((r) => `${esc(r.id)} (session ${esc(r.session)})`).join(", ")}</div>`
    : `<div class="notice ok">Citation Checker: all readings verified against the library and live news feed.</div>`;
  const sessions = (p.sessions || []).map((s) => `
    <div class="session mod${esc(s.module)}">
      <span class="pill m${esc(s.module)}">Module ${esc(s.module)}</span>
      <h4>Session ${esc(s.number)}: ${esc(s.title)}</h4>
      <div class="lbl">Objectives</div><ul>${(s.objectives || []).map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
      <div class="lbl">In class</div><p>${esc(s.in_class)}</p>
      <div class="lbl">Readings</div><ul>${(s.readings || []).map(readingLink).join("") || "<li class='muted'>None</li>"}</ul>
      <div class="lbl">Discussion questions</div><ul>${(s.discussion_questions || []).map((q) => `<li>${esc(q)}</li>`).join("")}</ul>
    </div>`).join("");
  const issues = (rv.issues || []).map((x) => `<li><strong>Session ${esc(x.session)}:</strong> ${esc(x.issue)} <em>Suggestion:</em> ${esc(x.suggestion)}</li>`).join("");
  $("#build-out").innerHTML = `
    ${warn}
    <div class="card"><div class="plan-head"><div><h3>${esc(p.course_title)}</h3><p class="muted">${esc(p.overview)}</p></div>
      <div><button class="btn ghost small" id="dl-md">Download (Markdown)</button> <button class="btn ghost small" onclick="window.print()">Print</button></div></div>
      <div class="lbl muted small">LEARNING GOALS</div><ul>${(p.learning_goals || []).map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
      <div class="tokens"><div>Run ${esc(d.run_id)}</div><div>${d.totals.prompt_tokens.toLocaleString()} input tokens</div><div>${d.totals.completion_tokens.toLocaleString()} output tokens</div><div>≈ $${d.totals.cost_usd.toFixed(4)}</div></div>
    </div>
    ${removed}
    <div class="card review"><h4>Balance Reviewer${rv.score ? ` · score ${esc(rv.score)}/5` : ""}</h4><p>${esc(rv.overall)}</p>${issues ? `<ul>${issues}</ul>` : ""}</div>
    <h2>Sessions</h2>${sessions}
    ${(p.assessment || []).length ? `<div class="card"><h4>Assessment</h4><ul>${p.assessment.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>` : ""}`;
  $("#dl-md").addEventListener("click", () => downloadMd(d));
}
function downloadMd(d) {
  const p = d.plan;
  let md = `# ${p.course_title}\n\n${p.overview}\n\n## Learning goals\n${(p.learning_goals || []).map((g) => `- ${g}`).join("\n")}\n`;
  (p.sessions || []).forEach((s) => {
    md += `\n## Session ${s.number} (Module ${s.module}): ${s.title}\n**Objectives**\n${(s.objectives || []).map((o) => `- ${o}`).join("\n")}\n\n**In class:** ${s.in_class}\n\n**Readings**\n${(s.readings || []).map((r) => `- [${r.title}](${r.url}), ${r.source}`).join("\n")}\n\n**Discussion questions**\n${(s.discussion_questions || []).map((q) => `- ${q}`).join("\n")}\n`;
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
  a.download = "ai-core-syllabus-draft.md";
  a.click();
}

// ---------- costs & trace ----------
function renderTrace(d) {
  $("#last-trace").innerHTML = d.trace.map((t) => `<div class="trace-step"><strong>${esc(t.step)}</strong><span class="kind ${esc(t.kind)}">${esc(t.kind)}</span>
    <span>${t.kind === "llm" ? `${t.prompt_tokens.toLocaleString()} in / ${t.completion_tokens.toLocaleString()} out tokens · $${t.cost_usd.toFixed(4)} · ${t.seconds}s` : esc(t.note || "")}${t.seconds && t.kind !== "llm" ? ` · ${t.seconds}s` : ""}</span></div>`).join("");
}
async function loadUsage() {
  const u = await (await fetch("/api/usage")).json();
  const perRun = u.runs ? u.total_cost / u.runs : 0;
  const rows = Object.entries(u.by_agent).map(([a, v]) => `<tr><td>${esc(a)}</td><td>${v.calls}</td><td>${Math.round(v.prompt_tokens / v.calls).toLocaleString()}</td><td>${Math.round(v.completion_tokens / v.calls).toLocaleString()}</td><td>$${(v.cost_usd / v.calls).toFixed(4)}</td></tr>`).join("");
  $("#usage").innerHTML = `
    <div class="stat-row">
      <div class="stat"><div class="v">${u.runs}</div><div class="k">Curriculum runs</div></div>
      <div class="stat"><div class="v">${u.calls}</div><div class="k">Model calls (${esc(u.model)})</div></div>
      <div class="stat"><div class="v">$${u.total_cost.toFixed(4)}</div><div class="k">Total estimated cost</div></div>
      <div class="stat"><div class="v">$${perRun.toFixed(4)}</div><div class="k">Average cost per run</div></div>
    </div>
    ${rows ? `<table><thead><tr><th>Agent</th><th>Calls</th><th>Avg input tokens</th><th>Avg output tokens</th><th>Avg cost / call</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="muted">No model calls logged yet.</p>`}
    <p class="muted small">Prices used: $${u.price_in}/1M input, $${u.price_out}/1M output tokens.</p>`;
}
