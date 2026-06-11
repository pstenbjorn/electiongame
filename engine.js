/* engine.js — shared framework for the Clearwater County trainer.
 *
 * Provides:
 *   EG.el(html)                -> build a DOM node from an HTML string
 *   EG.trust.set / reset       -> the Public Trust meter
 *   EG.register(module)        -> add a module to the office hub
 *   EG.launch(id) / EG.hub()   -> navigation
 *   EG.makeAdjudication(cfg)   -> build a "review a case, pick a defensible
 *                                 action, get scored" module from data.
 *
 * Every module in this trainer shares one shape: you are handed a queue of
 * cases, and for each you choose among a few actions. You are scored on
 * DEFENSIBILITY — whether the decision rests on a stated rule — never on
 * outcomes. The engine handles the intro, the case loop, per-decision
 * feedback with a citation, trust scoring, and the after-action review.
 */
(function (global) {
  "use strict";

  const EG = {};
  const appEl = () => document.getElementById("app");
  const trustFill = () => document.getElementById("trustFill");
  const trustValue = () => document.getElementById("trustValue");
  const caseProgress = () => document.getElementById("caseProgress");
  const moduleTag = () => document.getElementById("moduleTag");

  // ---- DOM helper ----
  EG.el = function (html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  EG.clear = function () { appEl().innerHTML = ""; };
  EG.mount = function (node) { EG.clear(); appEl().appendChild(node); try { window.scrollTo(0, 0); } catch (e) {} };

  // ---- Trust meter ----
  EG.trust = {
    value: 100,
    set(v) {
      this.value = Math.max(0, Math.min(100, Math.round(v)));
      trustFill().style.width = this.value + "%";
      trustValue().textContent = this.value;
      trustFill().style.background =
        this.value >= 70 ? "linear-gradient(90deg,#2e7d4f,#5bbf86)" :
        this.value >= 40 ? "linear-gradient(90deg,#c9892b,#e0b25a)" :
                           "linear-gradient(90deg,#b23a3a,#d76b6b)";
    },
    reset() { this.set(100); },
  };

  EG.setProgress = function (i, n) { caseProgress().textContent = i + " / " + n; };
  EG.setModuleTag = function (label) { if (moduleTag()) moduleTag().textContent = "Module: " + EG.tmpl(label); };

  // ---- Jurisdiction config (branding, parameters, legal citations) ----
  EG.config = {};

  // Read a dotted path out of the config, with a fallback.
  EG.jx = function (path, dflt) {
    const parts = path.split(".");
    let v = EG.config;
    for (const p of parts) { if (v == null) return dflt; v = v[p]; }
    return v == null ? dflt : v;
  };

  // Substitute {tokens} from the jurisdiction config into any rendered string.
  EG.tmpl = function (str) {
    if (typeof str !== "string" || str.indexOf("{") === -1) return str;
    const j = EG.config.jurisdiction || {};
    const r = EG.config.resources || {};
    const map = {
      county: j.county, state: j.state, stateAbbr: j.stateAbbr,
      office: j.office, director: j.directorTitle, seal: j.seal,
      navigatorName: r.navigatorName, navigatorUrl: r.navigatorUrl,
      regWait: EG.jx("parameters.registration.confirmationWaitText", "the statutory waiting period"),
    };
    return str.replace(/\{(\w+)\}/g, (m, k) => (map[k] != null ? map[k] : m));
  };

  // Load jurisdiction.config.json when served over HTTP; fall back to the
  // embedded window.JURISDICTION_DEFAULT (config.js) on file:// or any error.
  EG.loadConfig = function () {
    const fallback = global.JURISDICTION_DEFAULT || {};
    if (typeof fetch !== "function") { EG.config = fallback; return Promise.resolve(EG.config); }
    return fetch("jurisdiction.config.json")
      .then((res) => (res && res.ok ? res.json() : Promise.reject(new Error("bad response"))))
      .then((json) => { EG.config = json; return EG.config; })
      .catch(() => { EG.config = fallback; return EG.config; });
  };

  // Push branding from the config into the page chrome.
  EG.applyBranding = function () {
    const j = EG.config.jurisdiction || {};
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.textContent = val; };
    set("brandTitle", j.county);
    set("brandSub", j.office);
    set("brandSeal", j.seal);
    if (j.county) { try { document.title = j.county + " — Election Administrator Trainer"; } catch (e) {} }
  };

  // ---- Legal-basis rendering (from the citations library in the config) ----
  EG.cite = function (key) { return (EG.config.citations || {})[key] || null; };

  function renderLegalBasis(law) {
    const entry = EG.cite(law);
    if (!entry) return "";
    const navUrl = EG.jx("resources.navigatorUrl", "https://electionlawnavigator.org/");
    const navName = EG.jx("resources.navigatorName", "Election Law Navigator");
    const rows = (entry.authorities || []).map(function (a) {
      const label = EG.tmpl(a.cite || "");
      const note = EG.tmpl(a.note || "");
      const href = a.url || navUrl;
      const lvl = a.level || "";
      const cls = lvl === "Federal" ? "lvl-fed" : "lvl-state";
      const star = a.configurable ? ' <span class="cfg-flag" title="Configure this citation for your jurisdiction">configure</span>' : "";
      return `<li class="auth"><span class="auth-lvl ${cls}">${lvl}</span>
        <a class="auth-cite" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>${star}
        ${note ? `<div class="auth-note">${note}</div>` : ""}</li>`;
    }).join("");
    const topic = entry.navigatorTopic ? EG.tmpl(entry.navigatorTopic) : "";
    return `<div class="legal-basis">
        <div class="lb-head">Legal basis</div>
        <ul class="auth-list">${rows}</ul>
        <a class="lb-nav" href="${navUrl}" target="_blank" rel="noopener noreferrer">
          ↪ Research in the ${navName}${topic ? `: <em>${topic}</em>` : ""}</a>
      </div>`;
  }

  // ---- Persistence (so progress survives a check-in tomorrow) ----
  const STORE_KEY = "clearwater_progress_v1";
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) {}
  }
  EG.recordResult = function (id, pct, grade) {
    const p = loadProgress();
    const prev = p[id];
    // Keep the best score seen.
    if (!prev || pct >= prev.pct) p[id] = { pct, grade };
    saveProgress(p);
  };
  EG.getProgress = loadProgress;
  EG.saveCareer = function (result) {
    const p = loadProgress();
    const prev = p.__career__;
    if (!prev || result.trust >= prev.trust) p.__career__ = result;
    saveProgress(p);
  };

  // ---- Module registry & hub ----
  const modules = [];
  EG.register = function (mod) { modules.push(mod); };
  EG.modules = modules;

  const toneClass = { good: "btn-accept", warn: "btn-cure", bad: "btn-reject", neutral: "btn-primary" };

  EG.hub = function () {
    EG.trust.reset();
    EG.setModuleTag("Office Overview");
    EG.setProgress(0, 0);
    const progress = loadProgress();

    const cards = modules.map(function (m, i) {
      const rec = progress[m.id];
      const ready = m.status !== "soon";
      const badge = !ready
        ? `<span class="dept-status soon">Coming soon</span>`
        : rec
          ? `<span class="dept-status done">Best: ${rec.pct}% &middot; ${rec.grade}</span>`
          : `<span class="dept-status ready">Ready</span>`;
      return `
        <button class="dept-card ${ready ? "" : "is-soon"}" data-id="${m.id}" ${ready ? "" : "disabled"}>
          <div class="dept-top">
            <span class="dept-icon" aria-hidden="true">${m.icon || "&#9733;"}</span>
            <span class="dept-num">${String(i + 1).padStart(2, "0")}</span>
          </div>
          <div class="dept-title">${EG.tmpl(m.title)}</div>
          <div class="dept-summary">${EG.tmpl(m.summary)}</div>
          ${badge}
        </button>`;
    }).join("");

    const readyCount = modules.filter((m) => m.status !== "soon").length;
    const view = EG.el(`
      <section>
        <div class="card hub-hero">
          <div class="kicker">${EG.tmpl("{county} &middot; {office}")}</div>
          <h1>The election cycle, one desk at a time</h1>
          <p class="lead">Each department hands you a queue of real decisions. Choose the action you could defend
          to a court or an auditor — and document why. You are scored on the integrity of the process, never on who wins.</p>
          <p class="muted">${readyCount} of ${modules.length} departments open.</p>
        </div>
        ${EG.career ? careerBannerHTML() : ""}
        <div class="practice-head"><h2>Practice by department</h2>
          <span class="muted">Drill any single desk — full batch, trust resets each time.</span></div>
        <div class="dept-grid">${cards}</div>
      </section>
    `);
    EG.mount(view);
    const careerBtn = view.querySelector("#careerStartBtn");
    if (careerBtn) careerBtn.addEventListener("click", () => EG.career.start());
    view.querySelectorAll(".dept-card").forEach(function (b) {
      if (b.disabled) return;
      b.addEventListener("click", () => EG.launch(b.dataset.id));
    });
  };

  function careerBannerHTML() {
    const p = loadProgress();
    const best = p.__career__;
    const bestLine = best
      ? `<span class="career-best">Best: ${best.credential} &middot; Trust ${best.trust}</span>`
      : `<span class="career-best">Not yet attempted</span>`;
    return `
      <div class="card career-banner">
        <div class="career-banner-body">
          <div class="kicker">Career Mode</div>
          <h2>Run a full election cycle</h2>
          <p>Take one election from candidate filing to Certification Day across all eight desks — on the
          calendar, against the clock, with limited staff and a Public Trust score that carries the whole way.
          Earn your credential.</p>
          ${bestLine}
        </div>
        <div class="career-banner-cta">
          <button class="btn btn-primary" id="careerStartBtn">Begin the cycle &rarr;</button>
        </div>
      </div>`;
  }

  EG.launch = function (id) {
    const mod = modules.find((m) => m.id === id);
    if (mod && typeof mod.start === "function") mod.start();
  };

  // Brand returns to hub.
  EG.wireBrand = function () {
    const brand = document.querySelector(".brand");
    if (brand) {
      brand.style.cursor = "pointer";
      brand.title = "Return to the office overview";
      brand.addEventListener("click", () => EG.hub());
    }
  };

  // Desk briefing shown on a module's intro screen.
  function renderPrimer(p) {
    if (!p) return "";
    const terms = (p.terms && p.terms.length)
      ? `<dl class="terms">${p.terms.map(([t, d]) => `<dt>${EG.tmpl(t)}</dt><dd>${EG.tmpl(d)}</dd>`).join("")}</dl>`
      : "";
    return `<div class="primer">
        <div class="primer-head">Desk briefing</div>
        ${p.what ? `<p><strong>What this office does.</strong> ${EG.tmpl(p.what)}</p>` : ""}
        ${p.matters ? `<p><strong>Why it matters.</strong> ${EG.tmpl(p.matters)}</p>` : ""}
        ${terms}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // makeAdjudication: build a full module from a config object.
  // ---------------------------------------------------------------------------
  EG.makeAdjudication = function (cfg) {
    const mod = {
      id: cfg.id,
      title: cfg.title,
      summary: cfg.summary,
      icon: cfg.icon,
      status: cfg.status || "ready",
      cfg: cfg, // exposed so the Career layer can reuse a module's cases/rules
      start: function () { runIntro(cfg); },
    };
    return mod;
  };

  // Exposed for the Career layer (career.js) to reuse the per-case primitives.
  EG.renderLegalBasis = renderLegalBasis;
  EG.toneClass = toneClass;
  EG.moduleById = function (id) { return modules.find((m) => m.id === id); };

  function runIntro(cfg) {
    EG.trust.reset();
    EG.setModuleTag(cfg.label);
    EG.setProgress(0, cfg.cases.length);

    const rulesHtml = cfg.rules.map((r) => `<li><strong>${EG.tmpl(r.h)}.</strong> ${EG.tmpl(r.t)}</li>`).join("");
    const introHtml = cfg.intro.map((p) => `<p class="lead">${EG.tmpl(p)}</p>`).join("");
    const keyDates = typeof cfg.keyDates === "function" ? cfg.keyDates() : cfg.keyDates;
    const view = EG.el(`
      <section class="card">
        <div class="kicker">${EG.tmpl(cfg.label)}</div>
        <h1>${EG.tmpl(cfg.headline || cfg.title)}</h1>
        ${introHtml}
        ${renderPrimer(cfg.primer)}
        <h2>${EG.tmpl(cfg.rulesTitle || "The rules of the desk")}</h2>
        <ul class="rules-list">${rulesHtml}</ul>
        ${keyDates ? `<p class="muted">${EG.tmpl(keyDates)}</p>` : ""}
        <div class="start-actions">
          <button class="btn btn-primary" id="startBtn">${cfg.beginLabel || "Begin"} &rarr;</button>
          <button class="btn btn-ghost" id="hubBtn">&larr; Office overview</button>
          <span class="muted">${cfg.cases.length} ${cfg.batchNoun || "cases"} in this batch</span>
        </div>
      </section>
    `);
    EG.mount(view);
    document.getElementById("startBtn").addEventListener("click", () => runCase(cfg, freshRun()));
    document.getElementById("hubBtn").addEventListener("click", () => EG.hub());
  }

  function freshRun() { return { index: 0, results: [] }; }

  function runCase(cfg, run) {
    const c = cfg.cases[run.index];
    EG.setProgress(run.index, cfg.cases.length);
    const head = cfg.caseHead ? cfg.caseHead(c) : { title: c.id, sub: "", id: c.id };
    const stakes = c.stakes || cfg.stakes;

    const decisions = cfg.decisions.map(function (d) {
      const cls = toneClass[d.tone] || "btn-primary";
      return `<button class="btn ${cls}" data-act="${d.act}">${d.label}${d.sub ? `<span class="btn-sub">${d.sub}</span>` : ""}</button>`;
    }).join("");

    const view = EG.el(`
      <section class="card">
        <div class="kicker">${cfg.caseKicker || "Case"} ${run.index + 1} of ${cfg.cases.length}</div>
        <div class="case-head">
          <h2 class="voter-name">${EG.tmpl(head.title)}</h2>
          <span class="voter-id">${head.id || ""}</span>
        </div>
        ${head.sub ? `<p class="muted" style="margin:.2rem 0 0">${EG.tmpl(head.sub)}</p>` : ""}
        ${c.background ? `<div class="case-context">${EG.tmpl(c.background)}</div>` : ""}
        <div class="case-body">${EG.tmpl(cfg.caseBody(c))}</div>
        ${(cfg.question || stakes) ? `<div class="case-ask">
          ${cfg.question ? `<div class="ask-q"><span class="ask-label">Your determination</span>${EG.tmpl(cfg.question)}</div>` : ""}
          ${stakes ? `<div class="ask-stakes"><span class="ask-label">At stake</span>${EG.tmpl(stakes)}</div>` : ""}
        </div>` : ""}
        <div class="decisions" id="decisions">${decisions}</div>
        <div id="feedbackSlot"></div>
      </section>
    `);
    EG.mount(view);

    let answered = false;
    view.querySelectorAll("#decisions .btn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        decide(cfg, run, c, b.dataset.act);
      });
    });
  }

  function decide(cfg, run, c, chosen) {
    const correct = cfg.correctAction(c);
    const ok = chosen === correct;
    const ctx = { chosen, correct, ok };

    // Scoring: per-module penalty matrix keyed "correct->chosen", else default.
    const P = cfg.penalties || {};
    let delta;
    if (ok) delta = P.correct != null ? P.correct : 4;
    else if (P[correct + "->" + chosen] != null) delta = P[correct + "->" + chosen];
    else delta = P.default != null ? P.default : -10;
    EG.trust.set(EG.trust.value + delta);

    const fb = cfg.feedback(c, ctx);
    const critical = cfg.isCritical ? cfg.isCritical(ctx, c) : false;
    run.results.push({ id: c.id, name: (cfg.caseHead ? cfg.caseHead(c).title : c.id), chosen, correct, ok, critical });

    document.querySelectorAll("#decisions .btn").forEach((b) => (b.disabled = true));
    const last = run.index === cfg.cases.length - 1;
    const deltaStr = (delta >= 0 ? "+" : "") + delta + " trust";

    const lawKey = fb.cite && (fb.cite.law || cfg.law);
    const legal = lawKey ? renderLegalBasis(lawKey) : "";
    const node = EG.el(`
      <div class="feedback ${ok ? "correct" : "wrong"}">
        <h3>${ok ? "&#10003; " : "&#10007; "}${EG.tmpl(fb.verdict)}
          <span class="muted" style="font-weight:400;float:right">${deltaStr}</span></h3>
        <p style="margin:.3rem 0">${EG.tmpl(fb.detail)}</p>
        ${fb.cite ? `<div class="cite"><span class="cite-tag">${EG.tmpl(fb.cite.tag)}:</span> ${EG.tmpl(fb.cite.body)}</div>` : ""}
        ${legal}
        <div class="next-row">
          <button class="btn btn-primary" id="nextBtn">${last ? "Finish &rarr; After-action review" : "Next &rarr;"}</button>
        </div>
      </div>
    `);
    document.getElementById("feedbackSlot").appendChild(node);
    document.getElementById("nextBtn").addEventListener("click", function () {
      if (last) runAAR(cfg, run);
      else { run.index++; runCase(cfg, run); }
    });
  }

  function runAAR(cfg, run) {
    EG.setProgress(cfg.cases.length, cfg.cases.length);
    const total = run.results.length;
    const correct = run.results.filter((r) => r.ok).length;
    const criticalErrors = run.results.filter((r) => !r.ok && r.critical).length;
    const pct = Math.round((correct / total) * 100);

    let grade, gnote;
    if (EG.trust.value >= 85 && criticalErrors === 0) {
      grade = "Certifiable"; gnote = "Clean, defensible record. This work survives scrutiny.";
    } else if (EG.trust.value >= 60) {
      grade = "Needs review"; gnote = "Workable, but some calls would draw questions in an audit.";
    } else {
      grade = "Contestable"; gnote = "Too many errors — this would not hold up to a challenge.";
    }
    EG.recordResult(cfg.id, pct, grade);

    const customTallies = cfg.tallies ? cfg.tallies(run.results) : [];
    const tallyHtml = ([
      { num: correct, lbl: "Defensible", cls: "good" },
    ].concat(customTallies).concat([
      { num: total, lbl: cfg.batchNoun || "Cases", cls: "" },
    ])).map((t) => `
      <div class="tally-item"><div class="tally-num ${t.cls || ""}">${t.num}</div>
      <div class="tally-lbl">${t.lbl}</div></div>`).join("");

    const missed = run.results.filter((r) => !r.ok).map(function (r) {
      const lbl = cfg.actLabel || {};
      const ch = lbl[r.chosen] || r.chosen;
      const co = lbl[r.correct] || r.correct;
      return `<li><strong>${EG.tmpl(r.name)}</strong> (${r.id}): you chose <em>${ch}</em>; defensible action was <em>${co}</em>.</li>`;
    }).join("");

    const lessons = (cfg.lessons || []).map((l) => `<li>${EG.tmpl(l)}</li>`).join("");
    const nextMod = nextReadyAfter(cfg.id);

    const view = EG.el(`
      <section class="card">
        <div class="kicker">After-Action Review &mdash; ${EG.tmpl(cfg.label)}</div>
        <h1>${cfg.aarTitle || "Batch processed"}</h1>
        <div style="display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap">
          <div class="aar-score">${pct}%</div>
          <div>
            <div class="aar-grade"><strong>${grade}</strong> &middot; Public Trust ${EG.trust.value}/100</div>
            <div class="muted">${gnote}</div>
          </div>
        </div>
        <div class="tally">${tallyHtml}</div>
        ${missed ? `<h2>What to revisit</h2><div class="lessons"><ul>${missed}</ul></div>`
                 : `<div class="lessons"><strong>Flawless batch.</strong> Every case handled on the rule, with a record to back it.</div>`}
        ${lessons ? `<h2>The reflex this trains</h2><div class="lessons"><ul>${lessons}</ul></div>` : ""}
        <div class="start-actions">
          <button class="btn btn-primary" id="againBtn">Run a fresh batch</button>
          <button class="btn btn-ghost" id="hubBtn">&larr; Office overview</button>
          ${nextMod ? `<button class="btn btn-ghost" id="nextModBtn">Next: ${EG.tmpl(nextMod.title)} &rarr;</button>` : ""}
        </div>
      </section>
    `);
    EG.mount(view);
    document.getElementById("againBtn").addEventListener("click", () => { EG.trust.reset(); runCase(cfg, freshRun()); });
    document.getElementById("hubBtn").addEventListener("click", () => EG.hub());
    if (nextMod) document.getElementById("nextModBtn").addEventListener("click", () => EG.launch(nextMod.id));
  }

  function nextReadyAfter(id) {
    const i = modules.findIndex((m) => m.id === id);
    for (let j = i + 1; j < modules.length; j++) {
      if (modules[j].status !== "soon") return modules[j];
    }
    return null;
  }

  global.EG = EG;
})(window);
