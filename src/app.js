(function () {
  "use strict";

  // ------------------------------------------------------------------ data
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const TOPICS = $$("section.topic", $("#data-topics").content).map((el, i) => {
    const part = (k) => { const p = el.querySelector(`[data-part="${k}"]`); return p ? p.innerHTML : ""; };
    const checkEl = el.querySelector('[data-part="check"]');
    return {
      id: el.dataset.id, n: i + 1, title: el.dataset.title, src: el.dataset.src, blurb: el.dataset.blurb,
      idea: part("idea"), know: part("know"), steps: part("steps"), example: part("example"),
      traps: part("traps"), pset: part("pset"),
      checks: checkEl ? $$("li", checkEl).map((li) => li.innerHTML) : [],
    };
  });
  const TOPIC = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

  const PROBS = [];
  ["#data-problems-a", "#data-problems-b"].forEach((sel) => {
    const tpl = $(sel);
    if (!tpl) return;
    $$("article.prob", tpl.content).forEach((el) => {
      PROBS.push({
        id: el.dataset.id, topic: el.dataset.topic, src: el.dataset.src, diff: +el.dataset.diff || 2,
        title: el.dataset.title, q: el.querySelector(".q").innerHTML,
        hints: $$(".h", el).map((h) => h.innerHTML), sol: el.querySelector(".s").innerHTML,
      });
    });
  });
  const PROB = Object.fromEntries(PROBS.map((p) => [p.id, p]));
  const probsFor = (tid) => PROBS.filter((p) => p.topic === tid);

  const QUIZ = new Date(2026, 9, 14); // Wed Oct 14, 2026 (evening)

  const PLAN = [
    { d: new Date(2026, 9, 9), focus: "Foundations: logic, proof techniques, induction", tasks: [
      { id: "d1a", text: "Read the notes for Logic & Quantifiers and Proof Techniques", link: "#t-logic" },
      { id: "d1b", text: "Solve 3 logic/proof problems: Wason cards, translations, √2", link: "#t-proofs" },
      { id: "d1c", text: "Read the Induction notes, then write the template from memory on the board", link: "#t-induction" },
      { id: "d1d", text: "Solve 3 induction problems, including one bug-hunt (horses or 2ⁿ = O(1))", link: "#t-induction" },
    ] },
    { d: new Date(2026, 9, 10), focus: "Strong induction + state machines", tasks: [
      { id: "d2a", text: "Strong Induction notes, then postage + chocolate bar", link: "#t-strong" },
      { id: "d2b", text: "State Machines notes, then WALL-E (all parts) and the 8-puzzle", link: "#t-sm" },
      { id: "d2c", text: "Coins (derived variables) and the multiplication algorithm", link: "#t-sm" },
      { id: "d2d", text: "Re-read PS 3 #2 (beaver fever) and explain the perimeter argument out loud", link: "#p-sm06" },
    ] },
    { d: new Date(2026, 9, 11), focus: "Sums + asymptotics", tasks: [
      { id: "d3a", text: "Memorize the core sum formulas from the formula sheet; rewrite them from memory", link: "#sheet" },
      { id: "d3b", text: "Perturbation (Σ kxᵏ), telescoping (Σ k³) and the integral method (Hₙ)", link: "#t-sums" },
      { id: "d3c", text: "Asymptotics notes, then the symbol tables (Rec 6 #1, PS 4 #3)", link: "#t-asym" },
      { id: "d3d", text: "One witness-constant problem (c, n₀) written fully formally", link: "#p-asy03" },
    ] },
    { d: new Date(2026, 9, 12), focus: "Recurrences + divisibility/GCD", tasks: [
      { id: "d4a", text: "Recurrences notes, then the Master Theorem drill and one plug & chug", link: "#t-rec" },
      { id: "d4b", text: "One characteristic-root problem (PS 4 #2 or the Original one)", link: "#p-rec07" },
      { id: "d4c", text: "Divisibility & GCD notes, then two Pulverizer runs by hand", link: "#t-gcd" },
      { id: "d4d", text: "Start PSET 5 on your own: it's direct practice for the last two topics", link: "" },
    ] },
    { d: new Date(2026, 9, 13), focus: "Modular arithmetic + full mock quiz", tasks: [
      { id: "d5a", text: "Modular Arithmetic notes, then Rec 9 #1 and repeated squaring", link: "#t-mod" },
      { id: "d5b", text: "Inverses two ways (13 mod 29) and FLT exponent reduction", link: "#p-mod07" },
      { id: "d5c", text: "Take a 2-hour mock quiz under exam conditions (no hints)", link: "#mock" },
      { id: "d5d", text: "Finish and submit PSET 5 (due 11:59 PM)", link: "" },
      { id: "d5e", text: "Ice-cream study session tonight (the night before the quiz)", link: "" },
    ] },
    { d: new Date(2026, 9, 14), focus: "Quiz day: light review only", tasks: [
      { id: "d6a", text: "Redo every problem on your redo list (marked 'Needed hints' or 'Couldn't solve')", link: "#plan" },
      { id: "d6b", text: "Read every topic's 'Common traps' section once", link: "#notes" },
      { id: "d6c", text: "Skim the formula sheet and proof skeletons; write the induction template once", link: "#sheet" },
      { id: "d6d", text: "Eat, sleep, arrive early. Write the proof structure even when stuck: partial credit.", link: "" },
    ] },
  ];

  // ------------------------------------------------------------------ storage
  const KEY = "q1prep.v1";
  const blank = () => ({ checks: {}, plan: {}, p: {}, lockMin: 6, theme: "", mock: null });
  let S = blank();
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) {}
  let saveTimer = null;
  function save(now) {
    clearTimeout(saveTimer);
    const run = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
    if (now) run(); else saveTimer = setTimeout(run, 400);
  }
  const ps = (id) => (S.p[id] = S.p[id] || { t: 0, h: 0, hT: 0, rev: false, rate: null, note: "", marks: 0 });

  function status(id) {
    const p = S.p[id];
    if (!p) return "new";
    if (p.rate) return p.rate;
    if (p.t > 5 || p.marks || p.h) return "prog";
    return "new";
  }
  const STATUS_LABEL = { new: "New", prog: "In progress", solved: "Solved", hints: "Needed hints", missed: "Couldn't solve" };
  const pill = (id) => { const s = status(id); return `<span class="pill ${s}">${STATUS_LABEL[s]}</span>`; };
  const diffDots = (d) => `<span class="diff" title="Difficulty ${d} of 3" aria-label="Difficulty ${d} of 3">${[1, 2, 3].map((i) => `<i class="${i <= d ? "on" : ""}"></i>`).join("")}</span>`;
  const topicChecks = (t) => t.checks.filter((_, i) => S.checks[`${t.id}:${i}`]).length;

  // ------------------------------------------------------------------ theme + countdown
  function applyTheme() {
    const r = document.documentElement;
    if (S.theme) r.setAttribute("data-theme", S.theme); else r.removeAttribute("data-theme");
    $("#theme-btn").textContent = S.theme === "dark" ? "Dark" : S.theme === "light" ? "Light" : "Auto";
  }
  $("#theme-btn").addEventListener("click", () => {
    S.theme = S.theme === "" ? "light" : S.theme === "light" ? "dark" : "";
    applyTheme(); save();
  });
  applyTheme();

  function daysLeft() {
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((QUIZ - a) / 86400000);
  }
  function countdownText() {
    const d = daysLeft();
    if (d > 1) return `Quiz 1 in ${d} days`;
    if (d === 1) return "Quiz 1 is tomorrow";
    if (d === 0) return "Quiz 1 is tonight";
    return "Quiz 1 done";
  }
  $("#countdown").textContent = countdownText();

  // ------------------------------------------------------------------ math
  function typeset(el) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      try { window.MathJax.typesetClear && window.MathJax.typesetClear([el]); } catch (e) {}
      window.MathJax.typesetPromise([el]).catch(() => {});
    }
  }
  window.__q1typeset = () => typeset($("#app"));

  // ------------------------------------------------------------------ router
  const app = $("#app");
  let current = { name: "", id: "" };
  let fromHash = null; // where a problem was opened from
  let board = null;

  function route() {
    const h = (location.hash || "#home").slice(1);
    let name = h, id = "";
    if (h.startsWith("t-")) { name = "topic"; id = h.slice(2); }
    else if (h.startsWith("p-")) { name = "problem"; id = h.slice(2); }
    if (board) { board.destroy(); board = null; }
    current = { name, id };
    $$(".nav a").forEach((a) => {
      const n = a.dataset.nav;
      const on = n === name || (n === "notes" && name === "topic") || (n === "practice" && (name === "problem" || name === "mock"));
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const views = { home: viewHome, notes: viewNotes, topic: viewTopic, practice: viewPractice, problem: viewProblem, plan: viewPlan, sheet: viewSheet, mock: viewMock };
    (views[name] || viewHome)(id);
    typeset(app);
    window.scrollTo(0, 0);
  }

  // Track where problems are opened from, so "Back" returns there.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#p-']");
    if (a && !(location.hash || "").startsWith("#p-")) fromHash = location.hash || "#home";
  });
  window.addEventListener("hashchange", route);

  // ------------------------------------------------------------------ views
  function viewHome() {
    const attempted = PROBS.filter((p) => status(p.id) !== "new").length;
    const solved = PROBS.filter((p) => status(p.id) === "solved").length;
    const totalChecks = TOPICS.reduce((a, t) => a + t.checks.length, 0);
    const doneChecks = TOPICS.reduce((a, t) => a + topicChecks(t), 0);
    const today = todayPlan();
    const next = nextProblem();
    app.innerHTML = `
    <div class="view">
      <section class="hero">
        <div class="hero-text panel">
          <span class="eyebrow">6.1200J / 18.062J · Fall 2026</span>
          <h1>Quiz 1, Wednesday Oct 14</h1>
          <p class="lede">Ten topics from Lectures 1–9: notes, a step-by-step method for each problem type, and ${PROBS.length} practice problems with a chalkboard. Solutions stay locked until you've genuinely tried.</p>
          <div class="stats">
            <div class="stat"><b>${attempted}/${PROBS.length}</b><span>problems attempted</span></div>
            <div class="stat"><b>${solved}</b><span>solved cleanly</span></div>
            <div class="stat"><b>${totalChecks ? Math.round((100 * doneChecks) / totalChecks) : 0}%</b><span>of "I can…" checklist</span></div>
          </div>
          <div class="row" style="margin-top:18px">
            ${next ? `<a class="btn" href="#p-${next.id}">Next problem: ${esc(next.title)}</a>` : ""}
            <a class="btn ghost" href="#notes">Review notes</a>
            <a class="btn ghost" href="#mock">Mock quiz</a>
          </div>
        </div>
        <div class="panel today">
          <span class="eyebrow">${today ? (today.isToday ? "Today's plan" : "Next on the plan") : "Study plan"}</span>
          ${today ? `<h3 style="margin-top:6px">${fmtDay(today.d)}: ${esc(today.focus)}</h3>
          <ul class="checklist">${today.tasks.map(planTaskHTML).join("")}</ul>
          <a href="#plan">Full plan →</a>` : `<p>The plan dates have passed. Use the practice set and the redo list.</p>`}
        </div>
      </section>

      <section>
        <div class="section-head"><h2>Topics</h2><a href="#notes">All notes →</a></div>
        ${topicGridHTML()}
      </section>

      <section class="panel">
        <h2 style="margin-bottom:10px">What the quiz looks like</h2>
        <ul class="facts">
          <li>2-hour evening quiz on Wed Oct 14, worth 20% of your grade. Check Canvas for the room, the time and the exact coverage (probably Lectures 1–9).</li>
          <li>From Lecture 1: test problems are "similar to the easier homework &amp; recitation problems" and "shouldn't require knowing a trick."</li>
          <li>From Lecture 2: "there will probably be at least one induction problem on every test."</li>
          <li>Grading rewards structure: name your method, define $P(n)$, label base case and inductive step, and conclude.</li>
          <li>Curved only upward: if the median is under 70%, it is normalized to 70%.</li>
          <li>10% of your worst exam score is dropped, which helps if one test goes badly.</li>
        </ul>
      </section>
    </div>`;
    bindPlanChecks();
  }

  function topicGridHTML() {
    return `<div class="topic-grid">${TOPICS.map((t) => {
      const ps_ = probsFor(t.id);
      const done = ps_.filter((p) => status(p.id) !== "new").length;
      const pct = t.checks.length ? Math.round((100 * topicChecks(t)) / t.checks.length) : 0;
      return `<a class="topic-card" href="#t-${t.id}">
        <span class="idx">${String(t.n).padStart(2, "0")} · ${esc(t.src.split(" · ")[0])}</span>
        <h3>${esc(t.title)}</h3>
        <p>${esc(t.blurb)}</p>
        <div class="meta">
          <div class="row"><span>${done}/${ps_.length} problems tried</span><span>${pct}% checklist</span></div>
          <div class="bar"><span style="width:${pct}%"></span></div>
        </div>
      </a>`;
    }).join("")}</div>`;
  }

  function viewNotes() {
    app.innerHTML = `
    <div class="view">
      <div>
        <span class="eyebrow">Overview of notes</span>
        <h1 style="margin:6px 0 10px">Topics</h1>
        <p class="muted" style="max-width:68ch">Each topic has the same sections: the big idea, what you must know, a step-by-step procedure, a worked example, common traps, the practice problems that use it, and an "I can…" checklist. Topics follow lecture order.</p>
      </div>
      ${topicGridHTML()}
    </div>`;
  }

  function viewTopic(id) {
    const t = TOPIC[id];
    if (!t) return viewNotes();
    const idx = TOPICS.indexOf(t);
    const prev = TOPICS[idx - 1], next = TOPICS[idx + 1];
    const plist = probsFor(id);
    app.innerHTML = `
    <div class="view">
      <div class="crumbs"><a class="back" href="#notes">← All topics</a></div>
      <div class="topic-layout">
        <nav class="toc" aria-label="On this page">
          <a href="#t-${id}" data-jump="idea">Big idea</a>
          <a href="#t-${id}" data-jump="know">Must know</a>
          <a href="#t-${id}" data-jump="steps">Procedure</a>
          <a href="#t-${id}" data-jump="example">Worked example</a>
          <a href="#t-${id}" data-jump="traps">Common traps</a>
          <a href="#t-${id}" data-jump="practice">Practice (${plist.length})</a>
          <a href="#t-${id}" data-jump="check">Checklist</a>
        </nav>
        <article class="topic-body">
          <header class="topic-head">
            <span class="eyebrow">Topic ${t.n} of ${TOPICS.length} · ${esc(t.src)}</span>
            <h1>${esc(t.title)}</h1>
          </header>
          <section class="tsec idea" id="s-idea"><h2><span class="tag">01</span>The big idea</h2>${t.idea}</section>
          <section class="tsec" id="s-know"><h2><span class="tag">02</span>What you must know</h2>${t.know}</section>
          <section class="tsec steps" id="s-steps"><h2><span class="tag">03</span>How to solve these problems</h2>${t.steps}</section>
          <section class="tsec" id="s-example"><h2><span class="tag">04</span>Worked example</h2><div class="example-box">${t.example}</div></section>
          <section class="tsec traps-box" id="s-traps"><h2><span class="tag">05</span>Common traps</h2>${t.traps}</section>
          <section class="tsec" id="s-practice"><h2><span class="tag">06</span>Practice problems for this topic</h2>
            ${t.pset ? `<div class="pset-note" style="margin-bottom:12px">${t.pset}</div>` : ""}
            <p class="muted" style="font-size:.92rem">Each opens on its own page with a chalkboard. Hints unlock over time; the solution unlocks after a real attempt.</p>
            <div class="plist">${plist.map(probRowHTML).join("")}</div>
          </section>
          <section class="tsec" id="s-check"><h2><span class="tag">07</span>Checklist: I can…</h2>
            <ul class="checklist">${t.checks.map((c, i) => `<li><label><input type="checkbox" data-check="${id}:${i}" ${S.checks[`${id}:${i}`] ? "checked" : ""}><span>${c}</span></label></li>`).join("")}</ul>
          </section>
          <nav class="topic-nav">
            ${prev ? `<a class="back" href="#t-${prev.id}">← ${esc(prev.title)}</a>` : "<span></span>"}
            ${next ? `<a class="back" href="#t-${next.id}">${esc(next.title)} →</a>` : `<a class="back" href="#practice">Go to practice →</a>`}
          </nav>
        </article>
      </div>
    </div>`;
    $$("[data-jump]", app).forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = $("#s-" + a.dataset.jump, app);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    $$("[data-check]", app).forEach((cb) => cb.addEventListener("change", () => {
      S.checks[cb.dataset.check] = cb.checked; save();
    }));
  }

  function probRowHTML(p) {
    return `<a class="prow" href="#p-${p.id}">
      <span class="t">${esc(p.title)}</span>
      ${pill(p.id)}
      <span class="m"><span class="src">${esc(p.src)}</span>${diffDots(p.diff)}<span class="muted">${esc(TOPIC[p.topic].title)}</span></span>
    </a>`;
  }

  let filt = { topic: "all", status: "all" };
  function viewPractice() {
    const counts = { all: PROBS.length };
    PROBS.forEach((p) => { const s = status(p.id); counts[s] = (counts[s] || 0) + 1; });
    const list = PROBS.filter((p) =>
      (filt.topic === "all" || p.topic === filt.topic) &&
      (filt.status === "all" || status(p.id) === filt.status || (filt.status === "redo" && ["hints", "missed"].includes(status(p.id)))));
    const groups = TOPICS.map((t) => ({ t, items: list.filter((p) => p.topic === t.id) })).filter((g) => g.items.length);
    app.innerHTML = `
    <div class="view">
      <div class="section-head">
        <div><span class="eyebrow">Practice problems</span><h1 style="margin-top:6px">Problem set</h1></div>
        <div class="row">
          <button class="btn" id="rand">Random unsolved problem</button>
          <a class="btn ghost" href="#mock">Mock quiz</a>
        </div>
      </div>
      <div class="panel filters">
        <div><span class="eyebrow">Topic</span>
          <div class="chips" style="margin-top:6px">
            <button class="chip" data-ft="all" aria-pressed="${filt.topic === "all"}">All</button>
            ${TOPICS.map((t) => `<button class="chip" data-ft="${t.id}" aria-pressed="${filt.topic === t.id}">${esc(t.title)}</button>`).join("")}
          </div></div>
        <div><span class="eyebrow">Status</span>
          <div class="chips" style="margin-top:6px">
            ${[["all", "All"], ["new", "New"], ["prog", "In progress"], ["redo", "Redo list"], ["solved", "Solved"]].map(([k, l]) =>
              `<button class="chip" data-fs="${k}" aria-pressed="${filt.status === k}">${l}${k === "redo" ? ` (${(counts.hints || 0) + (counts.missed || 0)})` : counts[k] != null ? ` (${counts[k]})` : " (0)"}</button>`).join("")}
          </div></div>
        <div class="row" style="justify-content:space-between">
          <span class="muted" style="font-size:.88rem">Solution lock time (scaled by difficulty):</span>
          <select id="lockmin" aria-label="Solution lock time" style="padding:4px 8px;border-radius:6px;border:1px solid var(--rule);background:var(--paper)">
            ${[3, 6, 10, 15].map((m) => `<option value="${m}" ${S.lockMin === m ? "selected" : ""}>${m} min (medium problem)</option>`).join("")}
          </select>
        </div>
      </div>
      <div>
        ${groups.length ? groups.map((g) => `
          <h3 class="group-title">${esc(g.t.title)} <a href="#t-${g.t.id}">notes →</a></h3>
          <div class="plist">${g.items.map(probRowHTML).join("")}</div>`).join("") : `<p class="muted">No problems match these filters.</p>`}
      </div>
    </div>`;
    $$("[data-ft]", app).forEach((b) => b.addEventListener("click", () => { filt.topic = b.dataset.ft; viewPractice(); typeset(app); }));
    $$("[data-fs]", app).forEach((b) => b.addEventListener("click", () => { filt.status = b.dataset.fs; viewPractice(); typeset(app); }));
    $("#lockmin", app).addEventListener("change", (e) => { S.lockMin = +e.target.value; save(); });
    $("#rand", app).addEventListener("click", () => {
      const pool = PROBS.filter((p) => !["solved"].includes(status(p.id)) && (filt.topic === "all" || p.topic === filt.topic));
      const pick = (pool.length ? pool : PROBS)[Math.floor(Math.random() * (pool.length || PROBS.length))];
      fromHash = "#practice";
      location.hash = "#p-" + pick.id;
    });
  }

  function nextProblem() {
    for (const t of TOPICS) for (const p of probsFor(t.id)) if (status(p.id) === "new" || status(p.id) === "prog") return p;
    return null;
  }

  // ------------------------------------------------------------------ problem page
  const lockSecs = (p) => Math.round(S.lockMin * 60 * (p.diff === 1 ? 0.6 : p.diff === 3 ? 1.5 : 1));
  const HINT_FIRST = 45, HINT_GAP = 90;
  const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  function viewProblem(id) {
    const p = PROB[id];
    if (!p) return viewPractice();
    const t = TOPIC[p.topic];
    const st = ps(id);
    const list = probsFor(p.topic);
    const i = list.indexOf(p);
    const backHref = fromHash && fromHash !== "#p-" + id ? fromHash : "#t-" + p.topic;
    const backLabel = backHref.startsWith("#t-") ? `${TOPIC[backHref.slice(3)] ? TOPIC[backHref.slice(3)].title : "topic"} notes` :
      backHref === "#practice" ? "problem list" : backHref === "#mock" ? "mock quiz" : backHref === "#plan" ? "study plan" : "overview";
    const mockOn = S.mock && S.mock.ids.includes(id) && mockRemaining() > 0;
    app.innerHTML = `
    <div class="view" style="gap:18px">
      <div class="crumbs">
        <a class="back" href="${backHref}">← Back to ${esc(backLabel)}</a>
        ${backHref !== "#t-" + p.topic ? `<a class="back" href="#t-${p.topic}">${esc(t.title)} notes</a>` : `<a class="back" href="#practice">All problems</a>`}
        <span class="muted" style="margin-left:auto;font-size:.85rem">${i + 1} of ${list.length} in this topic</span>
      </div>
      ${mockOn ? `<div class="mock-banner"><span><b>Mock quiz running</b>: <span class="mono" id="mock-left">${fmtLong(mockRemaining())}</span> left. Try it without hints.</span><a href="#mock">Back to mock quiz →</a></div>` : ""}
      <div class="prob-layout">
        <aside class="prob-side">
          <div class="panel">
            <div class="prob-head">
              <span class="eyebrow">${esc(t.title)} · <span class="src">${esc(p.src)}</span></span>
              <h1>${esc(p.title)}</h1>
              <div class="row" style="gap:12px">${diffDots(p.diff)} ${pill(id)} <span class="timer-chip" id="time-on">Time on problem: ${fmt(st.t)}</span></div>
            </div>
            <div class="statement" style="margin-top:14px">${p.q}</div>
          </div>

          <div class="panel" id="hints-panel">
            <div class="row" style="justify-content:space-between">
              <h3>Hints</h3><span class="muted" style="font-size:.85rem">${p.hints.length} available</span>
            </div>
            <div class="hint-list" id="hint-list"></div>
            <div class="row" style="margin-top:10px">
              <button class="btn ghost" id="hint-btn" type="button"></button>
              <span class="muted" id="hint-wait" style="font-size:.85rem"></span>
            </div>
          </div>

          <div class="panel lock" id="lock-panel"></div>

          <div class="row" style="justify-content:space-between">
            ${list[i - 1] ? `<a class="back" href="#p-${list[i - 1].id}">← Previous</a>` : "<span></span>"}
            ${list[i + 1] ? `<a class="back" href="#p-${list[i + 1].id}">Next problem →</a>` : `<a class="back" href="#t-${p.topic}">Done with topic →</a>`}
          </div>
        </aside>

        <section class="board-wrap" aria-label="Chalkboard">
          <div id="board-host"></div>
        </section>
      </div>
    </div>`;


    renderHints(p);
    $("#hint-btn", app).addEventListener("click", () => {
      if (!hintReady(p)) return;
      st.h++; st.hT = st.t; save();
      renderHints(p); typeset($("#hint-list", app));
    });
    renderLock(p);
    board = new Board($("#board-host", app), id, () => { st.marks = board.count(); save(); refreshLock(p); });
  }

  function hintReady(p) {
    const st = ps(p.id);
    if (st.h >= p.hints.length) return false;
    const need = st.h === 0 ? HINT_FIRST : st.hT + HINT_GAP;
    return st.t >= need;
  }
  function renderHints(p) {
    const st = ps(p.id);
    $("#hint-list", app).innerHTML = p.hints.slice(0, st.h).map((h, i) => `<div class="hint"><span class="n">Hint ${i + 1}</span>${h}</div>`).join("") ||
      `<p class="muted" style="margin:0;font-size:.92rem">Start on the board first. The first hint unlocks after ${HINT_FIRST} seconds on this problem, and each later hint ${HINT_GAP} seconds after the one before.</p>`;
    refreshHintBtn(p);
  }
  function refreshHintBtn(p) {
    const st = ps(p.id);
    const btn = $("#hint-btn", app), wait = $("#hint-wait", app);
    if (!btn) return;
    if (st.h >= p.hints.length) { btn.disabled = true; btn.textContent = "No more hints"; wait.textContent = ""; return; }
    const need = st.h === 0 ? HINT_FIRST : st.hT + HINT_GAP;
    const ready = st.t >= need;
    btn.disabled = !ready;
    btn.textContent = `Show hint ${st.h + 1}`;
    wait.textContent = ready ? "" : `available in ${fmt(need - st.t)}`;
  }

  const LOCK_ICON = (open) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" fill="none"></rect>${open ? '<path d="M8 10.5V7a4 4 0 0 1 7.6-1.7"></path>' : '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"></path>'}</svg>`;

  function renderLock(p) {
    const st = ps(p.id);
    const panel = $("#lock-panel", app);
    if (st.rev) {
      panel.innerHTML = `
        <div class="lock-title" style="color:var(--accent)">${LOCK_ICON(true)}<h3>Solution</h3>
          <button class="btn ghost" id="hide-sol" type="button" style="margin-left:auto;padding:4px 10px;font-size:.85rem">Hide</button></div>
        <div class="solution" id="sol-body">${p.sol}</div>
        <div class="rate">
          <span class="eyebrow">How did it go?</span>
          <div class="row">
            <button class="btn good" data-rate="solved" aria-pressed="${st.rate === "solved"}">Solved it</button>
            <button class="btn hintc" data-rate="hints" aria-pressed="${st.rate === "hints"}">Needed hints</button>
            <button class="btn bad" data-rate="missed" aria-pressed="${st.rate === "missed"}">Couldn't solve</button>
          </div>
          <span class="muted" style="font-size:.82rem">"Needed hints" and "Couldn't solve" add it to your redo list.</span>
        </div>
        <div><label class="note-label" for="note">Where I got stuck / what to remember</label>
          <textarea class="note" id="note" placeholder="e.g. forgot the base case needs n = 8, 9, 10">${esc(st.note || "")}</textarea></div>`;
      $("#hide-sol", panel).addEventListener("click", () => { st.rev = false; save(); renderLock(p); });
      $$("[data-rate]", panel).forEach((b) => b.addEventListener("click", () => {
        st.rate = b.dataset.rate; save(true);
        $$("[data-rate]", panel).forEach((x) => x.setAttribute("aria-pressed", x === b));
        const pl = $(".prob-head .pill", app); if (pl) pl.outerHTML = pill(p.id);
      }));
      bindNote(p);
      typeset(panel);
      return;
    }
    panel.innerHTML = `
      <div class="lock-title">${LOCK_ICON(false)}<h3>Solution (locked)</h3></div>
      <p style="margin:0;font: 600 1.25rem var(--font-hand);color:var(--hi)">Struggle first: that's where the learning happens.</p>
      <ul class="req" id="req"></ul>
      <div><label class="note-label" for="note">Your attempt or where you're stuck (counts as an attempt)</label>
        <textarea class="note" id="note" placeholder="Write the method you're trying, or the exact step where you're stuck.">${esc(st.note || "")}</textarea></div>
      <button class="hold" id="hold" type="button" disabled><span class="fill"></span><span id="hold-label">Press and hold to reveal</span></button>`;
    bindNote(p);
    bindHold(p);
    refreshLock(p);
  }

  function bindNote(p) {
    const st = ps(p.id);
    const ta = $("#note", app);
    if (ta) ta.addEventListener("input", () => { st.note = ta.value; save(); refreshLock(p); });
  }

  function lockState(p) {
    const st = ps(p.id);
    const need = lockSecs(p);
    const timeOk = st.t >= need;
    const tryOk = (st.marks || 0) >= 3 || (st.note || "").trim().length >= 15;
    return { need, timeOk, tryOk, ok: timeOk && tryOk };
  }
  function refreshLock(p) {
    const st = ps(p.id);
    if (st.rev) return;
    const req = $("#req", app), hold = $("#hold", app);
    if (!req) return;
    const L = lockState(p);
    req.innerHTML = `
      <li class="${L.timeOk ? "ok" : ""}"><span class="dot">${L.timeOk ? "✓" : ""}</span><span>Spend ${fmt(L.need)} on this problem${L.timeOk ? "" : `: <b class="mono">${fmt(L.need - st.t)}</b> to go (only counts while this page is open)`}</span></li>
      <li class="${L.tryOk ? "ok" : ""}"><span class="dot">${L.tryOk ? "✓" : ""}</span><span>Show an attempt: write on the chalkboard (3+ strokes) or describe your approach below</span></li>`;
    hold.disabled = !L.ok;
  }

  function bindHold(p) {
    const btn = $("#hold", app);
    const fill = $(".fill", btn), label = $("#hold-label", btn);
    let t0 = 0, raf = 0;
    const DUR = 1800;
    const stop = () => { cancelAnimationFrame(raf); fill.style.width = "0"; label.textContent = "Press and hold to reveal"; };
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / DUR);
      fill.style.width = (k * 100) + "%";
      if (k >= 1) { ps(p.id).rev = true; save(true); renderLock(p); return; }
      raf = requestAnimationFrame(tick);
    };
    btn.addEventListener("pointerdown", (e) => {
      if (btn.disabled) return;
      e.preventDefault(); t0 = performance.now(); label.textContent = "Keep holding…"; raf = requestAnimationFrame(tick);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, stop));
    btn.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && !btn.disabled && !e.repeat) { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); } });
    btn.addEventListener("keyup", stop);
  }

  // one shared clock: counts active seconds on the open problem
  let ticks = 0;
  setInterval(() => {
    if (current.name === "mock") { const el = $("#mock-clock"); if (el) el.textContent = fmtLong(mockRemaining()); }
    if (current.name !== "problem" || document.hidden) return;
    const p = PROB[current.id]; if (!p) return;
    const st = ps(p.id);
    st.t++; ticks++;
    if (ticks % 5 === 0) save();
    const tEl = $("#time-on", app); if (tEl) tEl.textContent = `Time on problem: ${fmt(st.t)}`;
    const m = $("#mock-left", app); if (m) m.textContent = fmtLong(mockRemaining());
    refreshHintBtn(p);
    refreshLock(p);
  }, 1000);

  // ------------------------------------------------------------------ chalkboard
  const COLORS = [["Chalk", "#f3f0e6"], ["Yellow", "#f2d36b"], ["Pink", "#f2a3b8"], ["Blue", "#93d2f2"]];
  const SIZES = [["S", 2.2], ["M", 3.6], ["L", 6]];

  function Board(host, id, onChange) {
    const KEYB = "q1prep.board." + id;
    let data = { h: window.innerWidth < 600 ? 560 : 760, s: [] };
    try { const raw = localStorage.getItem(KEYB); if (raw) data = Object.assign(data, JSON.parse(raw)); } catch (e) {}
    let tool = "pen", color = COLORS[0][1], size = SIZES[1][1], cur = null, redo = [];
    host.innerHTML = `
      <div class="tray" role="toolbar" aria-label="Chalkboard tools">
        ${COLORS.map(([n, c], i) => `<button class="swatch" data-color="${c}" aria-label="${n} chalk" aria-pressed="${i === 0}"><i style="background:${c}"></i></button>`).join("")}
        <span class="sep"></span>
        ${SIZES.map(([n, w], i) => `<button data-size="${w}" aria-pressed="${i === 1}" aria-label="Line size ${n}">${n}</button>`).join("")}
        <span class="sep"></span>
        <button data-tool="erase" aria-pressed="false">Eraser</button>
        <button data-tool="pan" aria-pressed="false" title="Scroll the page with your finger instead of drawing">Scroll</button>
        <span class="sep"></span>
        <button data-act="undo">Undo</button>
        <button data-act="redo">Redo</button>
        <button data-act="more">More room</button>
        <button data-act="clear">Clear</button>
        <span class="status" aria-live="polite"></span>
      </div>
      <div class="board-frame">
        <div class="board-surface">
          <canvas aria-label="Chalkboard drawing area"></canvas>
          <span class="board-hint"${data.s.length ? " hidden" : ""}>Work it out here…</span>
        </div>
      </div>`;
    const surface = $(".board-surface", host), canvas = $("canvas", host), ctx = canvas.getContext("2d");
    const hintEl = $(".board-hint", host), statusEl = $(".status", host);
    let W = 0, dpr = 1;

    function size_() {
      dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      W = surface.clientWidth;
      canvas.style.height = data.h + "px";
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(data.h * dpr);
      draw();
    }
    function strokePath(s) {
      const p = s.p;
      ctx.globalCompositeOperation = s.e ? "destination-out" : "source-over";
      ctx.strokeStyle = s.e ? "rgba(0,0,0,1)" : s.c;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = s.w; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalAlpha = s.e ? 1 : 0.92;
      if (p.length === 2) { ctx.beginPath(); ctx.arc(p[0], p[1], s.w / 2, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.beginPath(); ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length - 2; i += 2) {
        const mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2;
        ctx.quadraticCurveTo(p[i], p[i + 1], mx, my);
      }
      ctx.lineTo(p[p.length - 2], p[p.length - 1]);
      ctx.stroke();
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, data.h);
      data.s.forEach(strokePath);
      if (cur) strokePath(cur);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }
    function persist() {
      try { localStorage.setItem(KEYB, JSON.stringify(data)); statusEl.textContent = "Saved"; }
      catch (e) { statusEl.textContent = "Board too big to save"; }
      hintEl.hidden = data.s.length > 0;
      onChange && onChange();
    }
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10]; };

    canvas.addEventListener("pointerdown", (e) => {
      if (tool === "pan" && e.pointerType !== "pen") return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      cur = { c: color, w: tool === "erase" ? 26 : size, e: tool === "erase" ? 1 : 0, p: [x, y] };
      draw();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!cur) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      evs.forEach((ev) => { const [x, y] = pos(ev); const n = cur.p.length; if (Math.abs(x - cur.p[n - 2]) + Math.abs(y - cur.p[n - 1]) > 0.8) cur.p.push(x, y); });
      draw();
    });
    const end = () => { if (!cur) return; data.s.push(cur); cur = null; redo = []; draw(); persist(); };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);

    const tray = $(".tray", host);
    const press = (sel, btn) => $$(sel, tray).forEach((b) => b.setAttribute("aria-pressed", b === btn));
    const setTool = (t) => {
      tool = t;
      $$("[data-tool]", tray).forEach((b) => b.setAttribute("aria-pressed", b.dataset.tool === t));
      surface.classList.toggle("pan", t === "pan");
      surface.classList.toggle("erase", t === "erase");
    };
    tray.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.color) { color = b.dataset.color; press("[data-color]", b); setTool("pen"); }
      else if (b.dataset.size) { size = +b.dataset.size; press("[data-size]", b); if (tool !== "pen") setTool("pen"); }
      else if (b.dataset.tool) { setTool(tool === b.dataset.tool ? "pen" : b.dataset.tool); }
      else if (b.dataset.act === "undo") { if (data.s.length) { redo.push(data.s.pop()); draw(); persist(); } }
      else if (b.dataset.act === "redo") { if (redo.length) { data.s.push(redo.pop()); draw(); persist(); } }
      else if (b.dataset.act === "more") { data.h += 400; size_(); persist(); }
      else if (b.dataset.act === "clear") {
        if (b.dataset.armed) { data.s = []; redo = []; delete b.dataset.armed; b.textContent = "Clear"; draw(); persist(); }
        else { b.dataset.armed = "1"; b.textContent = "Tap again to clear"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Clear"; } }, 3000); }
      }
    });

    const ro = new ResizeObserver(() => { if (surface.clientWidth !== W) size_(); });
    ro.observe(surface);
    size_();
    this.count = () => data.s.filter((s) => !s.e).length;
    this.destroy = () => { ro.disconnect(); };
  }

  // ------------------------------------------------------------------ plan
  const fmtDay = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  function todayPlan() {
    const now = new Date(); const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const exact = PLAN.find((d) => d.d.getTime() === a.getTime());
    if (exact) return Object.assign({ isToday: true }, exact);
    const upcoming = PLAN.find((d) => d.d > a);
    return upcoming ? Object.assign({ isToday: false }, upcoming) : null;
  }
  function planTaskHTML(t) {
    return `<li><label><input type="checkbox" data-plan="${t.id}" ${S.plan[t.id] ? "checked" : ""}><span>${esc(t.text)}${t.link ? ` <a href="${t.link}">open</a>` : ""}</span></label></li>`;
  }
  function bindPlanChecks() {
    $$("[data-plan]", app).forEach((cb) => cb.addEventListener("change", () => { S.plan[cb.dataset.plan] = cb.checked; save(); }));
  }
  function viewPlan() {
    const now = new Date(); const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const redo = PROBS.filter((p) => ["hints", "missed"].includes(status(p.id)));
    const allTasks = PLAN.flatMap((d) => d.tasks); const done = allTasks.filter((t) => S.plan[t.id]).length;
    app.innerHTML = `
    <div class="view">
      <div class="section-head">
        <div><span class="eyebrow">Fri Oct 9 → Wed Oct 14</span><h1 style="margin-top:6px">Study plan</h1></div>
        <div style="min-width:220px"><div class="row" style="justify-content:space-between;font-size:.85rem"><span class="muted">Plan progress</span><span class="mono">${done}/${allTasks.length}</span></div>
          <div class="bar" style="margin-top:6px"><span style="width:${(100 * done) / allTasks.length}%"></span></div></div>
      </div>
      <p class="muted" style="max-width:70ch;margin:0">About 2–3 focused hours a day. Each day: read the notes, solve problems on the chalkboard <i>before</i> unlocking anything, rate yourself honestly, and tick the topic checklist. Missed a day? Fold its tasks into the next one. Everything here is a suggestion.</p>
      <div class="days">
        ${PLAN.map((d) => `
          <div class="panel day ${d.d.getTime() === a.getTime() ? "is-today" : ""}">
            <div class="date"><span>${d.d.toLocaleDateString("en-US", { weekday: "long" })}</span><b>${d.d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</b>${d.d.getTime() === a.getTime() ? ' <span class="badge-today">TODAY</span>' : ""}</div>
            <div><div class="focus">${esc(d.focus)}</div><ul class="checklist">${d.tasks.map(planTaskHTML).join("")}</ul></div>
          </div>`).join("")}
      </div>
      <section class="panel">
        <div class="section-head"><h2>Redo list</h2><span class="muted" style="font-size:.88rem">Problems you rated "Needed hints" or "Couldn't solve"</span></div>
        ${redo.length ? `<div class="plist">${redo.map(probRowHTML).join("")}</div>` : `<p class="muted" style="margin:0">Empty. Rate problems after you unlock a solution and the ones to revisit will collect here.</p>`}
      </section>
      <section class="panel">
        <h2 style="margin-bottom:10px">During the quiz</h2>
        <ul>
          <li>Read every problem first and start with the one whose method you recognize fastest.</li>
          <li>Before any algebra, write the skeleton: method, $P(n)$, base case, inductive step. Structure earns partial credit even when the algebra stalls.</li>
          <li>For "prove unreachable", say <i>invariant</i>, check the start state, check every move type, then conclude with the Invariant Principle.</li>
          <li>For number crunching (Pulverizer, mod powers), check your final answer by multiplying back. It takes 20 seconds and catches slips.</li>
          <li>If stuck, try small cases ($n=0,1,2,3$). That is how you find the pattern or the right hypothesis.</li>
        </ul>
      </section>
    </div>`;
    bindPlanChecks();
  }

  function viewSheet() {
    app.innerHTML = `
    <div class="view">
      <div><span class="eyebrow">One-page review</span><h1 style="margin:6px 0 8px">Formula sheet</h1>
      <p class="muted" style="margin:0;max-width:68ch">Everything worth memorizing, plus fill-in-the-blank proof skeletons. Try writing each box from memory before reading it.</p></div>
      ${$("#data-sheet").innerHTML}
    </div>`;
  }

  // ------------------------------------------------------------------ mock quiz
  const MOCK_MIN = 120;
  function mockRemaining() { return S.mock ? S.mock.start + MOCK_MIN * 60000 - Date.now() : 0; }
  function fmtLong(ms) { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
  function makeMock() {
    const shuffled = TOPICS.slice().sort(() => Math.random() - 0.5);
    // always include induction, as the lecture promised one on every test
    const chosen = [TOPIC.induction, ...shuffled.filter((t) => t.id !== "induction")].slice(0, 6);
    const ids = chosen.map((t) => {
      const pool = probsFor(t.id).filter((p) => p.diff >= 2);
      const fresh = pool.filter((p) => status(p.id) === "new");
      const src = fresh.length ? fresh : pool.length ? pool : probsFor(t.id);
      return src[Math.floor(Math.random() * src.length)].id;
    });
    const order = TOPICS.map((t) => t.id);
    ids.sort((a, b) => order.indexOf(PROB[a].topic) - order.indexOf(PROB[b].topic));
    S.mock = { ids, start: Date.now() }; save(true);
  }
  function viewMock() {
    const running = S.mock && mockRemaining() > 0;
    app.innerHTML = `
    <div class="view">
      <div class="section-head">
        <div><span class="eyebrow">Exam simulation</span><h1 style="margin-top:6px">Mock quiz</h1></div>
        ${S.mock ? `<div class="countdown" style="font-size:1rem;padding:6px 12px" id="mock-clock">${fmtLong(mockRemaining())}</div>` : ""}
      </div>
      <div class="panel">
        <p style="max-width:70ch">Six problems from six different topics (always including induction), weighted toward quiz-level difficulty and toward problems you haven't seen yet. The real quiz is 2 hours, so the timer is too. Work on paper or the chalkboard, skip the hints, and rate each problem honestly when you unlock its solution.</p>
        <div class="row">
          <button class="btn" id="mock-new">${S.mock ? "Start a new mock quiz" : "Start mock quiz (2:00:00)"}</button>
          ${S.mock ? `<button class="btn ghost" id="mock-end">${running ? "End early" : "Clear"}</button>` : ""}
        </div>
      </div>
      ${S.mock ? `<section>
        <h2 style="margin-bottom:10px">${running ? "Your problems" : "Time's up. Review your problems"}</h2>
        <div class="plist">${S.mock.ids.map((id, i) => {
          const p = PROB[id];
          return `<a class="prow" href="#p-${id}"><span class="t">${i + 1}. ${esc(p.title)}</span>${pill(id)}<span class="m"><span class="muted">${esc(TOPIC[p.topic].title)}</span><span class="src">${esc(p.src)}</span>${diffDots(p.diff)}</span></a>`;
        }).join("")}</div>
      </section>` : ""}
    </div>`;
    $("#mock-new", app).addEventListener("click", () => { makeMock(); viewMock(); });
    const endBtn = $("#mock-end", app);
    if (endBtn) endBtn.addEventListener("click", () => {
      if (running) { S.mock.start = Date.now() - MOCK_MIN * 60000; } else { S.mock = null; }
      save(true); viewMock();
    });
  }

  route();
})();
