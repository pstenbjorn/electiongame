/* career.js — Career / Election-Cycle mode.
 *
 * Wraps the eight adjudication desks into a single election on a calendar:
 *   - persistent Public Trust that carries across the whole cycle
 *   - an INBOX of tickets per stage, worked under a limited STAFF-HOURS budget
 *     ("Consult the code" spends an hour to reveal the legal basis before ruling)
 *   - ESCALATION events when trust slips (a lawsuit, a board review)
 *   - PROGRESSION: streaks, a CERTIFIED/CONTESTED stamp on every ruling, badges
 *   - a Certification Day FINALE that awards a credential.
 *
 * It reuses each module's cfg (cases, correctAction, feedback, caseBody,
 * decisions, penalties) via EG.moduleById(id).cfg — the practice mode is
 * untouched.
 */
(function () {
  "use strict";

  // Stage = one calendar beat mapped to a desk. n = tickets drawn that day.
  const TIMELINE = [
    { module: "petition",     day: "T‑120", date: "Jul 8",  hours: 2, n: 3,
      title: "Candidate Filing Deadline",
      brief: "The filing window has closed. Validate the petitions that came in — there's no ballot until you know who qualifies." },
    { module: "finance",      day: "T‑95",  date: "Aug 2",  hours: 2, n: 3,
      title: "Campaign Finance Audit",
      brief: "Disclosure reports are in. Audit them and apply the schedule evenly — friend and foe alike." },
    { module: "siting",       day: "T‑75",  date: "Aug 22", hours: 2, n: 3,
      title: "Polling Place Recruitment",
      brief: "Lock in voting locations. Accessibility and capacity are not negotiable." },
    { module: "ballot",       day: "T‑45",  date: "Sep 21", hours: 2, n: 3,
      title: "Ballot Proofing & L&A Testing",
      brief: "Proof the ballots and certify the scanners before a single one is printed or deployed." },
    { module: "registration", day: "T‑30",  date: "Oct 6",  hours: 2, n: 3,
      title: "Final List Maintenance",
      brief: "Process updates and notices on the rolls — and resist the urge to purge on a flag alone." },
    { module: "vbm",          day: "T‑7",   date: "Oct 29", hours: 3, n: 4,
      title: "Mail Ballot Processing",
      brief: "Returned mail ballots are flooding in. Verify, cure, or reject — every one defensibly." },
    { module: "provisional",  day: "E‑Day", date: "Nov 5",  hours: 2, n: 4,
      title: "Election Day — Provisional Queue",
      brief: "Polls are open. The provisional queue needs adjudication as the ballots come in." },
    { module: "results",      day: "Canvass", date: "Nov 6", hours: 2, n: 4,
      title: "Certification Day — The Canvass",
      brief: "Reconcile every precinct. Certify only what balances. This is where the promise is kept." },
  ];

  const START_TRUST = 85;
  let S = null; // run state

  // ---- small helpers ----
  function cfgFor(id) { const m = EG.moduleById(id); return m && m.cfg; }
  function sample(arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a.slice(0, Math.min(n, a.length));
  }
  function clampTrust(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function setTrust(v) { S.trust = clampTrust(v); EG.trust.set(S.trust); }
  function scoreDelta(cfg, correct, chosen, ok) {
    const P = cfg.penalties || {};
    if (ok) return P.correct != null ? P.correct : 4;
    if (P[correct + "->" + chosen] != null) return P[correct + "->" + chosen];
    return P.default != null ? P.default : -10;
  }
  function decisionsHTML(cfg) {
    return cfg.decisions.map(function (d) {
      const cls = (EG.toneClass && EG.toneClass[d.tone]) || "btn-primary";
      return `<button class="btn ${cls}" data-act="${d.act}">${d.label}${d.sub ? `<span class="btn-sub">${d.sub}</span>` : ""}</button>`;
    }).join("");
  }
  function ticketFactsHTML(cfg, c) {
    const head = cfg.caseHead ? cfg.caseHead(c) : { title: c.id, sub: "", id: c.id };
    const stakes = c.stakes || cfg.stakes;
    return `
      <div class="case-head"><h2 class="voter-name">${EG.tmpl(head.title)}</h2><span class="voter-id">${head.id || ""}</span></div>
      ${head.sub ? `<p class="muted" style="margin:.2rem 0 0">${EG.tmpl(head.sub)}</p>` : ""}
      ${c.background ? `<div class="case-context">${EG.tmpl(c.background)}</div>` : ""}
      <div class="case-body">${EG.tmpl(cfg.caseBody(c))}</div>
      ${(cfg.question || stakes) ? `<div class="case-ask">
        ${cfg.question ? `<div class="ask-q"><span class="ask-label">Your determination</span>${EG.tmpl(cfg.question)}</div>` : ""}
        ${stakes ? `<div class="ask-stakes"><span class="ask-label">At stake</span>${EG.tmpl(stakes)}</div>` : ""}
      </div>` : ""}`;
  }

  // ---- run lifecycle ----
  function newRun() {
    return {
      trust: START_TRUST,
      streak: 0, bestStreak: 0, consults: 0,
      stageIdx: 0,
      stages: TIMELINE.map(function (st) {
        const cfg = cfgFor(st.module);
        return {
          meta: st,
          hours: st.hours,
          tickets: sample(cfg.cases, st.n).map(function (c) {
            return { c: c, status: "open", investigated: false, chosen: null, correct: null, ok: false, critical: false };
          }),
        };
      }),
      log: [],
      events: { lawsuit: false, review: false, praise: false },
    };
  }

  function start() { intro(); }

  function intro() {
    EG.setModuleTag("Career — Election Cycle");
    EG.setProgress(0, TIMELINE.length);
    const stops = TIMELINE.map(function (st, i) {
      const m = EG.moduleById(st.module);
      return `<li class="tl-item"><span class="tl-day">${st.day}</span>
        <span class="tl-dot">${m ? m.icon : "&#9733;"}</span>
        <span class="tl-title">${st.title}</span><span class="tl-date">${st.date}</span></li>`;
    }).join("");
    const view = EG.el(`
      <section class="card">
        <div class="kicker">Career Mode &middot; ${EG.tmpl("{county}")}</div>
        <h1>One election, start to finish</h1>
        <p class="lead">You are the ${EG.tmpl("{director}")}. Over the next four months you'll carry a single
        election from candidate filing to Certification Day — eight desks, on the calendar, with limited staff.</p>
        <div class="primer">
          <div class="primer-head">How career mode works</div>
          <p><strong>Public Trust carries.</strong> You start at ${START_TRUST}. Every defensible call protects it;
          every error erodes it — and a low score invites lawsuits and board reviews.</p>
          <p><strong>Staff hours are scarce.</strong> Each day you can “Consult the code” on only a few tickets to
          see the governing law <em>before</em> you rule. Spend them on the calls you're unsure of.</p>
          <p><strong>Build a streak, earn your credential.</strong> Consecutive defensible rulings stack up; the
          cycle ends with a credential from Distinguished down to Decertified.</p>
        </div>
        <h2>The cycle calendar</h2>
        <ul class="timeline">${stops}</ul>
        <div class="start-actions">
          <button class="btn btn-primary" id="goBtn">Report for duty &rarr;</button>
          <button class="btn btn-ghost" id="hubBtn">&larr; Office overview</button>
        </div>
      </section>`);
    EG.mount(view);
    document.getElementById("goBtn").addEventListener("click", function () { S = newRun(); setTrust(S.trust); runStage(0); });
    document.getElementById("hubBtn").addEventListener("click", function () { EG.hub(); });
  }

  // ---- a stage: the inbox ----
  function runStage(i) {
    S.stageIdx = i;
    const stage = S.stages[i];
    const st = stage.meta;
    EG.setModuleTag("Career — " + st.title);
    EG.setProgress(i, TIMELINE.length);
    renderInbox();
  }

  function renderInbox() {
    const stage = S.stages[S.stageIdx];
    const st = stage.meta;
    const done = stage.tickets.filter((t) => t.status === "done").length;
    const allDone = done === stage.tickets.length;
    const hoursDots = dots(stage.hours, st.hours);

    const rows = stage.tickets.map(function (t, idx) {
      const cfg = cfgFor(st.module);
      const head = cfg.caseHead ? cfg.caseHead(t.c) : { title: t.c.id, id: t.c.id };
      const stamp = t.status === "done"
        ? `<span class="ticket-stamp ${t.ok ? "ok" : "bad"}">${t.ok ? "CERTIFIED" : "CONTESTED"}</span>`
        : `<span class="ticket-pending">Pending</span>`;
      return `<button class="ticket ${t.status}" data-idx="${idx}" ${t.status === "done" ? "disabled" : ""}>
          <span class="ticket-no">#${String(idx + 1).padStart(2, "0")}</span>
          <span class="ticket-main"><span class="ticket-title">${EG.tmpl(head.title)}</span>
            <span class="ticket-sub">${EG.tmpl(head.id || "")}</span></span>
          ${stamp}${t.investigated ? `<span class="ticket-flag">consulted</span>` : ""}
        </button>`;
    }).join("");

    const view = EG.el(`
      <section class="card">
        <div class="day-head">
          <div><span class="day-chip">${st.day} &middot; ${st.date}</span>
            <h1>${st.title}</h1></div>
          <div class="day-meters">
            <div class="dm"><span class="dm-k">Public Trust</span><span class="dm-v">${S.trust}</span></div>
            <div class="dm"><span class="dm-k">Streak</span><span class="dm-v">${S.streak}🔥</span></div>
            <div class="dm"><span class="dm-k">Staff hours</span><span class="dm-v">${hoursDots}</span></div>
          </div>
        </div>
        <p class="lead">${EG.tmpl(st.brief)}</p>
        <div class="inbox-head"><span>In-tray</span><span class="muted">${done}/${stage.tickets.length} cleared</span></div>
        <div class="inbox">${rows}</div>
        <div class="start-actions">
          ${allDone
            ? `<button class="btn btn-primary" id="endDayBtn">Close out the day &rarr;</button>`
            : `<span class="muted">Work each ticket in the tray to close out the day.</span>`}
          <button class="btn btn-ghost" id="quitBtn">Exit to office</button>
        </div>
      </section>`);
    EG.mount(view);
    view.querySelectorAll(".ticket").forEach(function (b) {
      if (b.disabled) return;
      b.addEventListener("click", function () { openTicket(parseInt(b.dataset.idx, 10)); });
    });
    const endBtn = document.getElementById("endDayBtn");
    if (endBtn) endBtn.addEventListener("click", function () { stageWrap(); });
    document.getElementById("quitBtn").addEventListener("click", function () { EG.hub(); });
  }

  function dots(remaining, total) {
    let s = "";
    for (let k = 0; k < total; k++) s += k < remaining ? "●" : "○";
    return `<span class="hours-dots">${s || "—"}</span>`;
  }

  // ---- a single ticket ----
  function openTicket(idx) {
    const stage = S.stages[S.stageIdx];
    const st = stage.meta;
    const t = stage.tickets[idx];
    const cfg = cfgFor(st.module);
    renderTicket(idx, cfg, t, stage, st, false);
  }

  function renderTicket(idx, cfg, t, stage, st, answered) {
    const canConsult = stage.hours > 0 && !t.investigated;
    const consultBlock = t.investigated
      ? `<div class="consult-result">${EG.renderLegalBasis(consultLaw(cfg, t.c))}</div>`
      : "";
    const view = EG.el(`
      <section class="card">
        <div class="kicker">${st.day} &middot; ${st.title} &middot; Ticket #${String(idx + 1).padStart(2, "0")}</div>
        ${ticketFactsHTML(cfg, t.c)}
        <div class="consult-row">
          <button class="btn btn-ghost" id="consultBtn" ${canConsult ? "" : "disabled"}>
            ${t.investigated ? "Code consulted" : "Consult the code (1 staff hr)"}
          </button>
          <span class="muted">${stage.hours} staff hour${stage.hours === 1 ? "" : "s"} left today</span>
        </div>
        ${consultBlock}
        <div class="decisions" id="decisions">${decisionsHTML(cfg)}</div>
        <div id="ticketFeedback"></div>
      </section>`);
    EG.mount(view);

    const consultBtn = document.getElementById("consultBtn");
    if (consultBtn && canConsult) {
      consultBtn.addEventListener("click", function () {
        if (stage.hours <= 0 || t.investigated) return;
        stage.hours -= 1; t.investigated = true; S.consults += 1;
        renderTicket(idx, cfg, t, stage, st, false);
      });
    }
    let locked = false;
    view.querySelectorAll("#decisions .btn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (locked) return; locked = true;
        decide(idx, cfg, t, stage, st, b.dataset.act);
      });
    });
  }

  // The legal topic to reveal when consulting (module-level default).
  function consultLaw(cfg, c) { return cfg.law || "vbm_cure"; }

  function decide(idx, cfg, t, stage, st, chosen) {
    const correct = cfg.correctAction(t.c);
    const ok = chosen === correct;
    const ctx = { chosen: chosen, correct: correct, ok: ok };
    const delta = scoreDelta(cfg, correct, chosen, ok);
    const critical = cfg.isCritical ? cfg.isCritical(ctx, t.c) : false;

    // streak + milestone bonus
    let bonus = 0;
    if (ok) { S.streak += 1; if (S.streak > S.bestStreak) S.bestStreak = S.streak; if (S.streak % 5 === 0) bonus = 3; }
    else { S.streak = 0; }
    setTrust(S.trust + delta + bonus);

    t.status = "done"; t.chosen = chosen; t.correct = correct; t.ok = ok; t.critical = critical;
    S.log.push({ module: st.module, id: t.c.id, chosen: chosen, correct: correct, ok: ok, critical: critical });

    const fb = cfg.feedback(t.c, ctx);
    const lawKey = (fb.cite && (fb.cite.law || cfg.law)) || cfg.law;
    const legal = lawKey ? EG.renderLegalBasis(lawKey) : "";
    const deltaStr = (delta >= 0 ? "+" : "") + delta + (bonus ? ` (+${bonus} streak)` : "") + " trust";

    document.querySelectorAll("#decisions .btn").forEach((b) => (b.disabled = true));
    const stage_ = stage;
    const remaining = stage_.tickets.filter((x) => x.status !== "done").length;
    const node = EG.el(`
      <div class="feedback ${ok ? "correct" : "wrong"} ticket-fb">
        <div class="stamp ${ok ? "certified" : "contested"}">${ok ? "CERTIFIED" : "CONTESTED"}</div>
        <h3>${EG.tmpl(fb.verdict)} <span class="muted" style="font-weight:400;float:right">${deltaStr}</span></h3>
        <p style="margin:.3rem 0">${EG.tmpl(fb.detail)}</p>
        ${fb.cite ? `<div class="cite"><span class="cite-tag">${EG.tmpl(fb.cite.tag)}:</span> ${EG.tmpl(fb.cite.body)}</div>` : ""}
        ${legal}
        <div class="next-row">
          <button class="btn btn-primary" id="backBtn">${remaining ? "Back to the in-tray &rarr;" : "Close out the day &rarr;"}</button>
        </div>
      </div>`);
    document.getElementById("ticketFeedback").appendChild(node);
    document.getElementById("backBtn").addEventListener("click", function () {
      if (remaining) renderInbox(); else stageWrap();
    });
  }

  // ---- end of day: summary + escalation ----
  function stageWrap() {
    const stage = S.stages[S.stageIdx];
    const st = stage.meta;
    const okN = stage.tickets.filter((t) => t.ok).length;
    const n = stage.tickets.length;
    stage.allOk = okN === n;
    const last = S.stageIdx === TIMELINE.length - 1;

    const event = pickEvent();
    const eventHTML = event ? `<div class="escalation ${event.kind}">
        <div class="esc-head">${event.icon} ${event.head}</div>
        <p>${EG.tmpl(event.body)}</p>${event.effect ? `<div class="esc-effect">${event.effect}</div>` : ""}
      </div>` : "";

    const view = EG.el(`
      <section class="card">
        <div class="kicker">End of day &middot; ${st.day}</div>
        <h1>${st.title} — closed out</h1>
        <div class="tally">
          <div class="tally-item"><div class="tally-num ${okN === n ? "good" : ""}">${okN}/${n}</div><div class="tally-lbl">Defensible today</div></div>
          <div class="tally-item"><div class="tally-num">${S.trust}</div><div class="tally-lbl">Public Trust</div></div>
          <div class="tally-item"><div class="tally-num">${S.streak}🔥</div><div class="tally-lbl">Current streak</div></div>
        </div>
        ${eventHTML}
        <div class="start-actions">
          <button class="btn btn-primary" id="nextBtn">${last ? "Proceed to certification &rarr;" : "Advance to " + S.stages[S.stageIdx + 1].meta.title + " &rarr;"}</button>
          <button class="btn btn-ghost" id="quitBtn">Exit to office</button>
        </div>
      </section>`);
    EG.mount(view);
    document.getElementById("nextBtn").addEventListener("click", function () {
      if (last) finale(); else runStage(S.stageIdx + 1);
    });
    document.getElementById("quitBtn").addEventListener("click", function () { EG.hub(); });
  }

  // At most one escalation per day, by priority, fired once each.
  function pickEvent() {
    if (S.streak >= 8 && !S.events.praise) {
      S.events.praise = true; setTrust(S.trust + 4);
      return { kind: "good", icon: "&#9733;", head: "Public confidence is climbing",
        body: "Your steady, documented rulings are getting noticed — observers from both sides call the process fair.",
        effect: "Public Trust +4." };
    }
    if (S.trust < 55 && !S.events.review) {
      S.events.review = true;
      return { kind: "bad", icon: "&#9888;", head: "The electoral board convenes an emergency review",
        body: "With trust this low, the board wants every recent decision re-examined and the press is asking questions. Your paper trail is the only thing standing between you and a contested election.",
        effect: "Warning — keep every remaining ruling clean and documented." };
    }
    if (S.trust < 70 && !S.events.lawsuit) {
      S.events.lawsuit = true;
      const next = S.stages[S.stageIdx + 1];
      if (next && next.hours > 1) next.hours -= 1;
      return { kind: "bad", icon: "&#9878;", head: "A losing party files suit",
        body: "A decision you made is being challenged in court. Counsel needs your files, pulling staff off the next day's work.",
        effect: next ? "Staff hours reduced by 1 tomorrow." : "Counsel is reviewing your documentation." };
    }
    return null;
  }

  // ---- Certification Day finale ----
  function finale() {
    EG.setModuleTag("Career — Certification Day");
    EG.setProgress(TIMELINE.length, TIMELINE.length);
    const total = S.log.length;
    const okN = S.log.filter((r) => r.ok).length;
    const critical = S.log.filter((r) => !r.ok && r.critical).length;
    const acc = Math.round((okN / total) * 100);

    let credential, note;
    if (S.trust >= 85 && critical === 0) { credential = "Distinguished Election Administrator"; note = "An exemplary cycle. Every contest rests on a clean, defensible record."; }
    else if (S.trust >= 70) { credential = "Certified Election Administrator"; note = "A sound cycle. A few calls would draw questions, but the election holds up."; }
    else if (S.trust >= 50) { credential = "Provisional Certification"; note = "The election survives, but the margin for challenge is uncomfortable. Tighten the record."; }
    else { credential = "Decertified — Re-run the Cycle"; note = "Too many contestable rulings. This election would not withstand scrutiny."; }

    const badges = earnedBadges(acc, critical);
    const badgeHTML = badges.length
      ? badges.map((b) => `<span class="badge" title="${b.desc}">${b.icon} ${b.name}</span>`).join("")
      : `<span class="muted">No badges this cycle — run it again for a cleaner record.</span>`;

    EG.saveCareer({ credential: credential, trust: S.trust, accuracy: acc, bestStreak: S.bestStreak });

    const view = EG.el(`
      <section class="card certificate">
        <div class="cert-seal">${EG.tmpl("{seal}")}</div>
        <div class="kicker">Certification Day &middot; ${EG.tmpl("{county}, {stateAbbr}")}</div>
        <h1 class="cert-title">${credential}</h1>
        <p class="cert-note">${note}</p>
        <div class="tally">
          <div class="tally-item"><div class="tally-num">${S.trust}</div><div class="tally-lbl">Final Public Trust</div></div>
          <div class="tally-item"><div class="tally-num ${acc >= 80 ? "good" : ""}">${acc}%</div><div class="tally-lbl">Defensible rulings</div></div>
          <div class="tally-item"><div class="tally-num ${critical ? "bad" : "good"}">${critical}</div><div class="tally-lbl">Critical errors</div></div>
          <div class="tally-item"><div class="tally-num">${S.bestStreak}🔥</div><div class="tally-lbl">Best streak</div></div>
        </div>
        <h2>Commendations</h2>
        <div class="badges">${badgeHTML}</div>
        <p class="muted cert-caveat">Training simulation — not legal advice. Cases model common U.S. and ${EG.tmpl("{state}")} principles.</p>
        <div class="start-actions">
          <button class="btn btn-primary" id="againBtn">Run another cycle</button>
          <button class="btn btn-ghost" id="hubBtn">&larr; Office overview</button>
        </div>
      </section>`);
    EG.mount(view);
    document.getElementById("againBtn").addEventListener("click", function () { S = newRun(); setTrust(S.trust); runStage(0); });
    document.getElementById("hubBtn").addEventListener("click", function () { EG.hub(); });
  }

  function earnedBadges(acc, critical) {
    const out = [];
    if (acc === 100) out.push({ icon: "&#9733;", name: "Perfect Cycle", desc: "Every ruling defensible." });
    if (critical === 0) out.push({ icon: "&#128737;", name: "No Voter Left Behind", desc: "Zero critical errors — no one disenfranchised, nothing invalid advanced." });
    if (S.consults >= 6) out.push({ icon: "&#128214;", name: "By the Book", desc: "Consulted the code on six or more rulings." });
    if (S.bestStreak >= 8) out.push({ icon: "&#128293;", name: "Iron Streak", desc: "Eight defensible rulings in a row." });
    const canvass = S.stages[S.stages.length - 1];
    if (canvass && canvass.allOk) out.push({ icon: "&#9989;", name: "Clean Canvass", desc: "Reconciled and certified every precinct correctly." });
    if (S.trust >= 90) out.push({ icon: "&#127942;", name: "Public's Trust", desc: "Finished above 90 on the trust meter." });
    return out;
  }

  EG.career = { start: start };
})();
