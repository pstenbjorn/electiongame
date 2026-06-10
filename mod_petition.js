/* mod_petition.js — Candidate Qualification & Petition Validation. */
(function () {
  "use strict";

  // facialDefect (curable within window): missing_fee | unsigned_declaration | notary_missing | null
  const cases = [
    { id: "CQ-30", name: "Robin A. Castellano", office: "County Commissioner, Dist. 2",
      eligible: true, onTime: true, requiredSigs: 1000, submittedSigs: 1340, validSigs: 1187,
      facialDefect: null, cureOpen: true,
      note: "Clean filing: timely, fee paid, eligibility met, petition comfortably over the threshold." },
    { id: "CQ-31", name: "Desmond P. Whitaker", office: "City Council, At-Large",
      eligible: true, onTime: true, requiredSigs: 1000, submittedSigs: 1620, validSigs: 921,
      facialDefect: null, cureOpen: true,
      note: "Submitted well over the requirement, but a high duplicate/non-registered rate left valid signatures short." },
    { id: "CQ-32", name: "Aisha N. Bello", office: "School Board, Seat 4",
      eligible: true, onTime: true, requiredSigs: 500, submittedSigs: 740, validSigs: 612,
      facialDefect: "missing_fee", cureOpen: true,
      note: "Petition is valid and timely, but the filing fee was not included with the packet." },
    { id: "CQ-33", name: "Lars E. Henningsen", office: "County Commissioner, Dist. 5",
      eligible: true, onTime: true, requiredSigs: 1000, submittedSigs: 1410, validSigs: 1205,
      facialDefect: "unsigned_declaration", cureOpen: true,
      note: "Everything qualifies except the candidate's declaration of candidacy is unsigned." },
    { id: "CQ-34", name: "Priscilla O. Vance", office: "Mayor",
      eligible: false, onTime: true, requiredSigs: 2000, submittedSigs: 2900, validSigs: 2455,
      facialDefect: null, cureOpen: true, ineligibleReason: "Does not meet the durational residency requirement for the office.",
      note: "Petition and paperwork are flawless — but the candidate does not meet a constitutional eligibility requirement." },
    { id: "CQ-35", name: "Marcus T. Delgado", office: "City Council, Dist. 1",
      eligible: true, onTime: false, requiredSigs: 750, submittedSigs: 1100, validSigs: 940,
      facialDefect: null, cureOpen: true,
      note: "A strong petition — but the packet was filed after the candidate filing deadline closed." },
    { id: "CQ-36", name: "Yelena R. Sokolova", office: "School Board, Seat 1",
      eligible: true, onTime: true, requiredSigs: 500, submittedSigs: 690, validSigs: 588,
      facialDefect: "notary_missing", cureOpen: false,
      note: "Valid petition, but the required notarization is missing and the cure window has now closed." },
    { id: "CQ-37", name: "Theo B. Nakamura", office: "County Commissioner, Dist. 2",
      eligible: true, onTime: true, requiredSigs: 1000, submittedSigs: 1075, validSigs: 1014,
      facialDefect: null, cureOpen: true,
      note: "Razor-thin margin: valid signatures clear the requirement by 14. Count carefully — it still clears." },
    { id: "CQ-38", name: "Gwendolyn S. Ackerman", office: "Mayor",
      eligible: false, onTime: true, requiredSigs: 2000, submittedSigs: 2600, validSigs: 2210,
      facialDefect: null, cureOpen: true, ineligibleReason: "Has already served the maximum number of terms allowed for the office.",
      note: "Popular candidate with an ample petition, but term-limited out of eligibility for this office." },
    { id: "CQ-39", name: "Hassan I. Farouk", office: "City Council, At-Large",
      eligible: true, onTime: true, requiredSigs: 1000, submittedSigs: 1180, validSigs: 1098,
      facialDefect: "missing_fee", cureOpen: true,
      note: "Qualifying petition, timely — fee envelope was empty. The cure window is still open." },
  ];

  function correctAction(c) {
    if (!c.eligible) return "disqualify";          // constitutional — uncurable
    if (!c.onTime) return "disqualify";            // missed filing deadline — uncurable
    if (c.validSigs < c.requiredSigs) return "disqualify"; // signature shortfall — uncurable post-deadline
    if (c.facialDefect) return c.cureOpen ? "cure_notice" : "disqualify";
    return "qualify";
  }

  const defectLabel = {
    missing_fee: "Filing fee not paid",
    unsigned_declaration: "Declaration of candidacy unsigned",
    notary_missing: "Required notarization missing",
  };

  const cfg = {
    cases: cases,
    id: "petition",
    label: "Candidate Qualification",
    icon: "&#9999;", // pencil / petition
    title: "Candidate Qualification & Petition Validation",
    summary: "Validate nominating petitions and filings; place qualified candidates, cure facial defects, disqualify the ineligible.",
    headline: "Qualifying Candidates for the Ballot",
    batchNoun: "filings",
    caseKicker: "Filing",
    beginLabel: "Review filings",
    intro: [
      "Ballot access is a high-stakes, deadline-driven gate. Keep a qualified candidate off the ballot and you have disenfranchised their supporters; let an ineligible one on and you risk voiding the contest.",
      "For each filing, validate the petition (raw signatures are not valid signatures), check eligibility and timeliness, and apply the rule. Treat every candidate identically.",
    ],
    rulesTitle: "How a filing qualifies",
    rules: [
      { h: "Place on the ballot", t: "Eligible, filed on time, fee paid, declaration complete, and valid signatures meet the threshold → qualify." },
      { h: "Issue a cure notice", t: "A facial defect (missing fee, unsigned declaration, missing notarization) is curable while the cure window is open. Notify the candidate." },
      { h: "Disqualify", t: "Constitutional ineligibility, a missed filing deadline, a signature shortfall, or an uncured facial defect after the window closes. These cannot be fixed." },
      { h: "Validate, don't tally", t: "Strike duplicates, non-registered, and out-of-district signers first. A fat packet can still fall short on valid signatures." },
    ],
    decisions: [
      { act: "qualify", tone: "good", label: "Place on ballot", sub: "Fully qualified" },
      { act: "cure_notice", tone: "warn", label: "Issue cure notice", sub: "Curable facial defect" },
      { act: "disqualify", tone: "bad", label: "Disqualify", sub: "Cannot be cured" },
    ],
    actLabel: { qualify: "place on ballot", cure_notice: "issue cure notice", disqualify: "disqualify" },
    penalties: { correct: 4, "qualify->disqualify": -16, "cure_notice->disqualify": -14, "disqualify->qualify": -16,
                 "disqualify->cure_notice": -12, "qualify->cure_notice": -6, "cure_notice->qualify": -10, default: -10 },

    caseHead: (c) => ({ title: c.name, id: c.id, sub: c.office }),

    caseBody: function (c) {
      const pct = Math.min(140, Math.round((c.validSigs / c.requiredSigs) * 100));
      const sigClass = c.validSigs >= c.requiredSigs ? "ok" : "bad";
      const eligClass = c.eligible ? "ok" : "bad";
      const timeClass = c.onTime ? "ok" : "bad";
      const defect = c.facialDefect
        ? `<span class="flag">${defectLabel[c.facialDefect]} &middot; cure window ${c.cureOpen ? "OPEN" : "CLOSED"}</span>`
        : `<span class="flag ok">None</span>`;
      return `
        <div class="envelope casefile">
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-k">Eligibility</span><span class="meta-v flag ${eligClass}">${c.eligible ? "Requirements met" : "NOT met"}</span></div>
            <div class="meta-item"><span class="meta-k">Filing deadline</span><span class="meta-v flag ${timeClass}">${c.onTime ? "Filed on time" : "FILED LATE"}</span></div>
            <div class="meta-item"><span class="meta-k">Facial defects</span><span class="meta-v">${defect}</span></div>
          </div>
          ${!c.eligible ? `<div class="filenote"><span class="filenote-k">Eligibility note</span><p>${c.ineligibleReason}</p></div>` : ""}
          <div class="petition-meter">
            <div class="pm-head">
              <span>Petition signatures</span>
              <span class="flag ${sigClass}">${c.validSigs.toLocaleString()} valid / ${c.requiredSigs.toLocaleString()} required</span>
            </div>
            <div class="pm-track">
              <div class="pm-fill ${sigClass === "ok" ? "pm-ok" : "pm-bad"}" style="width:${Math.min(100, (pct / 140) * 100)}%"></div>
              <div class="pm-threshold" style="left:${(100 / 140) * 100}%" title="Required threshold"></div>
            </div>
            <div class="pm-sub">${c.submittedSigs.toLocaleString()} submitted &rarr; ${(c.submittedSigs - c.validSigs).toLocaleString()} struck (duplicate / non-registered / out-of-district) &rarr; ${c.validSigs.toLocaleString()} valid</div>
          </div>
          <p class="muted" style="margin:.6rem 0 0;font-size:.9rem">${c.note}</p>
        </div>`;
    },

    correctAction: correctAction,

    isCritical: function (ctx) {
      return ((ctx.correct === "qualify" || ctx.correct === "cure_notice") && ctx.chosen === "disqualify") ||
             (ctx.correct === "disqualify" && ctx.chosen !== "disqualify");
    },

    feedback: function (c, ctx) {
      let verdict, detail, cite;
      if (!c.eligible) {
        detail = "Eligibility is the threshold question and it is not curable — no petition, fee, or paperwork can fix a constitutional disqualification. However strong the filing looks, the candidate cannot appear on the ballot. Disqualify with the specific eligibility ground stated.";
        cite = { tag: "Eligibility", body: "A candidate who fails a constitutional eligibility requirement cannot be placed on the ballot." };
      } else if (!c.onTime) {
        detail = "The packet was filed after the candidate filing deadline. Like a late ballot, a late filing has no cure. Disqualify and record the filing timestamp.";
        cite = { tag: "Filing deadline", body: "Filings received after the deadline are not curable." };
      } else if (c.validSigs < c.requiredSigs) {
        detail = "Once invalid signatures are struck, the petition falls short of the threshold. A signature shortfall cannot be cured after the filing deadline — the candidate cannot gather more. Disqualify on insufficient valid signatures, not on the raw count.";
        cite = { tag: "Signature sufficiency", body: "Valid signatures must meet the statutory minimum; the raw submitted count is irrelevant." };
      } else if (c.facialDefect) {
        if (c.cureOpen) {
          detail = `The petition and eligibility are fine; the only problem is a facial defect (${defectLabel[c.facialDefect].toLowerCase()}). That is curable while the window is open — issue a cure notice and give the candidate the chance to fix it. Do not disqualify and do not place until cured.`;
          cite = { tag: "Notice & cure", body: "A facial defect is curable within the cure window; notify the candidate." };
        } else {
          detail = `The defect (${defectLabel[c.facialDefect].toLowerCase()}) is curable in principle — but the cure window has closed and it was never fixed. With no remedy left, the filing fails. Disqualify.`;
          cite = { tag: "Cure window closed", body: "An uncured facial defect after the window closes is fatal to the filing." };
        }
      } else {
        detail = "Eligible, timely, complete, and valid signatures clear the threshold (even if only barely — a margin of one is still a margin). Place the candidate on the ballot.";
        cite = { tag: "Qualified", body: "All requirements met → the candidate is entitled to ballot placement." };
      }
      if (ctx.ok) verdict = "Defensible determination.";
      else if ((ctx.correct === "qualify" || ctx.correct === "cure_notice") && ctx.chosen === "disqualify") verdict = "You denied ballot access to a candidate who was entitled to it.";
      else if (ctx.correct === "disqualify" && ctx.chosen !== "disqualify") verdict = "You advanced a candidate who cannot lawfully be on the ballot.";
      else if (ctx.correct === "qualify" && ctx.chosen === "cure_notice") verdict = "Needless cure notice — this filing already qualified.";
      else if (ctx.correct === "cure_notice" && ctx.chosen === "qualify") verdict = "You placed a candidate before curing a required defect.";
      else verdict = "Not the defensible determination.";
      return { verdict, detail, cite };
    },

    tallies: function (results) {
      const denied = results.filter((r) => (r.correct === "qualify" || r.correct === "cure_notice") && r.chosen === "disqualify").length;
      const wrongly = results.filter((r) => r.correct === "disqualify" && r.chosen !== "disqualify").length;
      return [
        { num: denied, lbl: "Wrongly kept off ballot", cls: denied ? "bad" : "" },
        { num: wrongly, lbl: "Ineligible advanced", cls: wrongly ? "bad" : "" },
      ];
    },

    lessons: [
      "<strong>Raw signatures are not valid signatures.</strong> Strike duplicates and ineligible signers before comparing to the threshold.",
      "<strong>Sort defects into curable vs. fatal.</strong> Missing fee or signature → cure notice; ineligibility, lateness, or a shortfall → disqualify.",
      "<strong>Eligibility and deadlines have no cure.</strong> No amount of paperwork fixes a constitutional bar or a late filing.",
      "<strong>Treat every candidate identically.</strong> The same rule, the same scrutiny, the same documentation — regardless of who they are.",
    ],
  };

  EG.register(EG.makeAdjudication(cfg));
})();
