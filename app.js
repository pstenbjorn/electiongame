/* app.js — game engine for the Vote-by-Mail Processing module. */
(function () {
  "use strict";

  const S = window.SCENARIO;
  const appEl = document.getElementById("app");
  const trustFill = document.getElementById("trustFill");
  const trustValue = document.getElementById("trustValue");
  const caseProgress = document.getElementById("caseProgress");

  const state = {
    index: 0,
    trust: 100,
    answered: false,
    results: [], // { id, chosen, correct, ok }
  };

  // ---- Rules engine: derive the defensible action from a case's facts. ----
  function correctAction(c) {
    if (!c.timely) return "reject";          // no cure for lateness
    if (c.signatureStatus === "missing") return "cure";
    if (c.signatureStatus === "mismatch") return "cure";
    return "accept";
  }

  // Trust impact per (correct action, chosen action). Disenfranchising a
  // curable voter is the heaviest penalty; counting an invalid ballot is next.
  const PENALTY = {
    rejectedCurable: -16, // should have cured, you rejected -> voter loses rights
    countedInvalid: -14,  // accepted something untimely/unverified
    curedValid: -6,       // needless cure notice for a clean ballot (friction, delay)
    rejectedValid: -16,   // rejected a perfectly good ballot
    otherWrong: -10,
    correct: +4,
  };

  function evaluate(c, chosen) {
    const correct = correctAction(c);
    const ok = chosen === correct;
    let delta, verdict, detail, cite;

    if (ok) {
      delta = PENALTY.correct;
    } else if (correct === "cure" && chosen === "reject") {
      delta = PENALTY.rejectedCurable;
    } else if (correct === "reject" && chosen === "accept") {
      delta = PENALTY.countedInvalid;
    } else if (correct === "accept" && chosen === "cure") {
      delta = PENALTY.curedValid;
    } else if (correct === "accept" && chosen === "reject") {
      delta = PENALTY.rejectedValid;
    } else {
      delta = PENALTY.otherWrong;
    }

    // Build explanation keyed on the case facts.
    if (!c.timely) {
      if (c.signatureStatus === "missing" || c.signatureStatus === "mismatch") {
        detail =
          "This envelope had a signature defect, but it also arrived after the deadline. " +
          "Timeliness is the controlling defect: there is no cure for a late ballot, so it cannot be counted. " +
          "Reject and log the receipt date — do not waste a cure notice on a ballot that can never be counted.";
      } else {
        detail =
          "The signature was fine, but the ballot was received after the deadline with no qualifying postmark. " +
          "There is no cure for lateness. Reject and record the receipt date and postmark.";
      }
      cite = { tag: "Receipt deadline", body: "Mail ballots must be received by " + S.ballotDeadline + ". Late ballots are not curable." };
    } else if (c.signatureStatus === "missing") {
      detail =
        "The affidavit envelope is unsigned. A missing signature is a curable defect — the voter must be notified " +
        "and given until the cure deadline to sign. Send a cure notice; do not reject and do not open the ballot yet.";
      cite = { tag: "Notice & cure", body: "Voter may cure a missing signature through " + S.cureDeadline + "." };
    } else if (c.signatureStatus === "mismatch") {
      detail =
        "The envelope signature shows a genuine discrepancy from the signature on file. You are not a forensic examiner, " +
        "and the remedy is not rejection — it is notice. Send a cure notice so the voter can verify their identity by the cure deadline.";
      cite = { tag: "Notice & cure", body: "A signature discrepancy is curable through " + S.cureDeadline + ". Reject only if uncured." };
    } else {
      detail =
        "Signed, the signature reasonably corresponds to the one on file, and received on time. " +
        "Ordinary signature variation is expected — you are confirming the same hand, not a perfect copy. Accept for counting.";
      cite = { tag: "Verified", body: "Signature corresponds; received by " + S.ballotDeadline + "." };
    }

    if (ok) {
      verdict = "Defensible decision.";
    } else if (correct === "cure" && chosen === "reject") {
      verdict = "You disenfranchised a voter who had a right to cure.";
    } else if (correct === "reject" && chosen === "accept") {
      verdict = "You moved an invalid ballot toward counting.";
    } else if (correct === "accept" && chosen === "reject") {
      verdict = "You rejected a valid, timely ballot.";
    } else if (correct === "accept" && chosen === "cure") {
      verdict = "Unnecessary cure notice — this ballot was already valid.";
    } else {
      verdict = "Not the defensible action here.";
    }

    return { ok, correct, delta, verdict, detail, cite };
  }

  // ---------------- Rendering ----------------
  function setTrust(v) {
    state.trust = Math.max(0, Math.min(100, v));
    trustFill.style.width = state.trust + "%";
    trustValue.textContent = state.trust;
    const c =
      state.trust >= 70 ? "linear-gradient(90deg,#2e7d4f,#5bbf86)" :
      state.trust >= 40 ? "linear-gradient(90deg,#c9892b,#e0b25a)" :
                          "linear-gradient(90deg,#b23a3a,#d76b6b)";
    trustFill.style.background = c;
  }

  function updateProgress() {
    caseProgress.textContent = state.index + " / " + S.cases.length;
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function renderIntro() {
    updateProgress();
    const rulesHtml = S.rules
      .map((r) => `<li><strong>${r.h}.</strong> ${r.t}</li>`)
      .join("");
    const introHtml = S.intro.map((p) => `<p class="lead">${p}</p>`).join("");
    const view = el(`
      <section class="card">
        <div class="kicker">${S.module}</div>
        <h1>${S.title}</h1>
        ${introHtml}
        <h2>The four rules of the affidavit envelope</h2>
        <ul class="rules-list">${rulesHtml}</ul>
        <p class="muted"><strong>Key dates.</strong> Receipt deadline: ${S.ballotDeadline}. Cure deadline: ${S.cureDeadline}.</p>
        <div class="start-actions">
          <button class="btn btn-primary" id="startBtn">Begin processing &rarr;</button>
          <span class="muted">${S.cases.length} envelopes in this batch</span>
        </div>
      </section>
    `);
    appEl.innerHTML = "";
    appEl.appendChild(view);
    document.getElementById("startBtn").addEventListener("click", () => {
      state.index = 0;
      renderCase();
    });
  }

  function sigBox(label, seed, opts) {
    if (seed === null) {
      return `<div class="sig-box"><div class="sig-label"><span>${label}</span></div>
        <div class="sig-missing">— NO SIGNATURE —</div></div>`;
    }
    return `<div class="sig-box"><div class="sig-label"><span>${label}</span></div>
      ${window.SignatureArt.svg(seed, opts)}</div>`;
  }

  function renderCase() {
    const c = S.cases[state.index];
    state.answered = false;
    updateProgress();

    const envSeed =
      c.signatureStatus === "missing" ? null : (c.envelopeSeed || c.sigSeed);
    // A genuine re-signing always carries some jitter; the same person varies.
    const envOpts = { jitter: c.signatureStatus === "match" ? 1 : 0.4 };

    const timelyClass = c.timely ? "ok" : "bad";
    const timelyText = c.timely ? "Within deadline" : "AFTER deadline";

    const view = el(`
      <section class="card">
        <div class="kicker">Envelope ${state.index + 1} of ${S.cases.length}</div>
        <div class="envelope">
          <div class="case-head">
            <h2 class="voter-name">${c.voterName}</h2>
            <span class="voter-id">Ballot ${c.id}</span>
          </div>
          <p class="muted" style="margin:.3rem 0 0">${c.blurb}</p>

          <div class="meta-grid">
            <div class="meta-item"><span class="meta-k">Received</span><span class="meta-v">${c.received}</span></div>
            <div class="meta-item"><span class="meta-k">Postmark</span><span class="meta-v">${c.postmark}</span></div>
            <div class="meta-item"><span class="meta-k">Receipt deadline</span><span class="meta-v">${S.ballotDeadline}</span></div>
            <div class="meta-item"><span class="meta-k">Timeliness</span><span class="meta-v flag ${timelyClass}">${timelyText}</span></div>
          </div>
          ${c.timelyNote ? `<p class="muted" style="margin:-.4rem 0 .6rem;font-size:.85rem">${c.timelyNote}</p>` : ""}

          <div class="sig-compare">
            ${sigBox("Signature on file", c.sigSeed, { jitter: 0 })}
            ${sigBox("Signature on envelope", envSeed, envOpts)}
          </div>
        </div>

        <div class="decisions" id="decisions">
          <button class="btn btn-accept" data-act="accept">Accept &amp; count<span class="btn-sub">Signature verified, timely</span></button>
          <button class="btn btn-cure" data-act="cure">Send cure notice<span class="btn-sub">Curable defect — notify voter</span></button>
          <button class="btn btn-reject" data-act="reject">Reject<span class="btn-sub">No available remedy</span></button>
        </div>
        <div id="feedbackSlot"></div>
      </section>
    `);
    appEl.innerHTML = "";
    appEl.appendChild(view);

    view.querySelectorAll("#decisions .btn").forEach((b) => {
      b.addEventListener("click", () => onDecide(c, b.dataset.act));
    });
  }

  function onDecide(c, chosen) {
    if (state.answered) return;
    state.answered = true;

    const r = evaluate(c, chosen);
    setTrust(state.trust + r.delta);
    state.results.push({ id: c.id, name: c.voterName, chosen, correct: r.correct, ok: r.ok });

    document.querySelectorAll("#decisions .btn").forEach((b) => (b.disabled = true));

    const last = state.index === S.cases.length - 1;
    const deltaStr = (r.delta >= 0 ? "+" : "") + r.delta + " trust";
    const fb = el(`
      <div class="feedback ${r.ok ? "correct" : "wrong"}">
        <h3>${r.ok ? "&#10003; " : "&#10007; "}${r.verdict} <span class="muted" style="font-weight:400;float:right">${deltaStr}</span></h3>
        <p style="margin:.3rem 0">${r.detail}</p>
        <div class="cite"><span class="cite-tag">${r.cite.tag}:</span> ${r.cite.body}</div>
        <div class="next-row">
          <button class="btn btn-primary" id="nextBtn">${last ? "Finish batch &rarr; After-action review" : "Next envelope &rarr;"}</button>
        </div>
      </div>
    `);
    document.getElementById("feedbackSlot").appendChild(fb);
    document.getElementById("nextBtn").addEventListener("click", () => {
      if (last) {
        renderAfterAction();
      } else {
        state.index++;
        renderCase();
      }
    });
  }

  function renderAfterAction() {
    updateProgress();
    const total = state.results.length;
    const correct = state.results.filter((r) => r.ok).length;
    const disenfranchised = state.results.filter(
      (r) => r.correct === "cure" && r.chosen === "reject" || r.correct === "accept" && r.chosen === "reject"
    ).length;
    const countedInvalid = state.results.filter(
      (r) => r.correct === "reject" && r.chosen === "accept"
    ).length;

    const pct = Math.round((correct / total) * 100);
    let grade, gnote;
    if (state.trust >= 85 && disenfranchised === 0 && countedInvalid === 0) {
      grade = "Certifiable"; gnote = "Clean, defensible record. This canvass survives scrutiny.";
    } else if (state.trust >= 60) {
      grade = "Needs review"; gnote = "Workable, but some decisions would draw questions in an audit.";
    } else {
      grade = "Contestable"; gnote = "Too many errors — these results would not hold up to a challenge.";
    }

    const missed = state.results
      .filter((r) => !r.ok)
      .map((r) => `<li><strong>${r.name}</strong> (${r.id}): you chose <em>${r.chosen}</em>; defensible action was <em>${r.correct}</em>.</li>`)
      .join("");

    const view = el(`
      <section class="card">
        <div class="kicker">After-Action Review &mdash; ${S.module}</div>
        <h1>Batch processed</h1>
        <div style="display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap">
          <div class="aar-score">${pct}%</div>
          <div>
            <div class="aar-grade"><strong>${grade}</strong> &middot; Public Trust ${state.trust}/100</div>
            <div class="muted">${gnote}</div>
          </div>
        </div>

        <div class="tally">
          <div class="tally-item"><div class="tally-num good">${correct}</div><div class="tally-lbl">Defensible</div></div>
          <div class="tally-item"><div class="tally-num ${disenfranchised ? "bad" : ""}">${disenfranchised}</div><div class="tally-lbl">Voters disenfranchised</div></div>
          <div class="tally-item"><div class="tally-num ${countedInvalid ? "bad" : ""}">${countedInvalid}</div><div class="tally-lbl">Invalid ballots advanced</div></div>
          <div class="tally-item"><div class="tally-num">${total}</div><div class="tally-lbl">Envelopes</div></div>
        </div>

        ${missed ? `<h2>What to revisit</h2><div class="lessons"><ul>${missed}</ul></div>` : `<div class="lessons"><strong>Flawless batch.</strong> Every envelope handled on the rule, with a record to back it.</div>`}

        <h2>The reflex this trains</h2>
        <div class="lessons">
          <ul>
            <li><strong>A defect is not a rejection.</strong> Missing or mismatched signatures trigger notice and a cure window — never a quiet rejection.</li>
            <li><strong>Lateness is the one thing you cannot cure.</strong> When timeliness fails, that defect controls.</li>
            <li><strong>You confirm the same hand, not a perfect copy.</strong> Ordinary variation is normal; treat every voter's signature the same way.</li>
            <li><strong>The record is the job.</strong> Each decision rests on a stated rule and a logged date.</li>
          </ul>
        </div>

        <div class="start-actions">
          <button class="btn btn-primary" id="againBtn">Run a fresh batch</button>
          <span class="muted">Next module (coming soon): Provisional Ballot Adjudication</span>
        </div>
      </section>
    `);
    appEl.innerHTML = "";
    appEl.appendChild(view);
    document.getElementById("againBtn").addEventListener("click", () => {
      state.index = 0;
      state.trust = 100;
      state.results = [];
      setTrust(100);
      renderIntro();
    });
  }

  // ---- boot ----
  setTrust(100);
  renderIntro();
})();
