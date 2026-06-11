/* mod_finance.js — Campaign Finance Reporting & Fines. */
(function () {
  "use strict";

  // Sourced from the jurisdiction config at render time. Two penalty models are
  // supported: "perDay" (per-day accrual to a cap) and "flat" (a fixed civil
  // penalty, e.g. Virginia's $500 / $1,000-repeat under Va. Code § 24.2-953.2).
  const CUR = () => EG.jx("parameters.finance.currency", "$");
  const MODEL = () => EG.jx("parameters.finance.model", "perDay");
  const PER_DAY = () => EG.jx("parameters.finance.perDay", 50);
  const FINE_CAP = () => EG.jx("parameters.finance.cap", 1000);
  const FIRST = () => EG.jx("parameters.finance.firstOffense", 500);
  const REPEAT = () => EG.jx("parameters.finance.repeatOffense", 1000);
  const money = (n) => CUR() + n.toLocaleString();
  function fineFor(c) {
    return MODEL() === "flat" ? FIRST() : Math.min(c.daysLate * PER_DAY(), FINE_CAP());
  }
  function scheduleText() {
    return MODEL() === "flat"
      ? `a civil penalty of ${money(FIRST())} (first violation), ${money(REPEAT())} for a repeat in the cycle`
      : `${money(PER_DAY())}/day, capped at ${money(FINE_CAP())}`;
  }

  // daysLate: 0 if timely. issue: 'math' | 'disclosure' | 'overlimit' | 'prohibited' | null
  const cases = [
    { id: "CF-501", committee: "Friends of the Riverside Library Levy", report: "Pre-election report",
      daysLate: 0, complete: true, issue: null,
      note: "Filed two days early. Totals foot, schedules reconcile, all donors itemized as required." },
    { id: "CF-502", committee: "Clearwater Forward PAC", report: "Pre-election report",
      daysLate: 6, complete: true, issue: null,
      note: "A complete, accurate report — but submitted six days after the filing deadline." },
    { id: "CF-503", committee: "Committee to Elect Candidate B", report: "Quarterly report",
      daysLate: 0, complete: false, issue: "math",
      note: "Filed on time, but the summary totals do not match the sum of the itemized schedules." },
    { id: "CF-504", committee: "Neighbors for Open Space", report: "Quarterly report",
      daysLate: 0, complete: false, issue: "disclosure",
      note: "Timely, but several itemized contributions over the threshold are missing the donor's required employer/occupation." },
    { id: "CF-505", committee: "Clearwater Forward PAC", report: "48-hour contribution notice",
      daysLate: 0, complete: true, issue: "overlimit",
      note: "Timely and complete, but one contributor's total exceeds the per-election contribution limit." },
    { id: "CF-506", committee: "Committee to Elect Candidate A", report: "Pre-election report",
      daysLate: 25, complete: true, issue: null,
      note: "Filed 25 days late — well past the point where the per-day penalty reaches its statutory cap." },
    { id: "CF-507", committee: "Sunrise Coalition", report: "Quarterly report",
      daysLate: 0, complete: true, issue: null,
      note: "On time, complete, internally consistent, no prohibited or excess contributions." },
    { id: "CF-508", committee: "Main Street Small Business Fund", report: "Pre-election report",
      daysLate: 1, complete: true, issue: null,
      note: "Filed one day late. The treasurer apologizes and notes a family emergency. The report itself is flawless." },
    { id: "CF-509", committee: "Committee to Elect Candidate C", report: "Quarterly report",
      daysLate: 0, complete: true, issue: "prohibited",
      note: "Timely and complete, but it discloses a contribution from a prohibited source under the jurisdiction's rules." },
    { id: "CF-510", committee: "Highlands Action Network", report: "Pre-election report",
      daysLate: 9, complete: false, issue: "math",
      note: "Filed nine days late AND the totals don't reconcile. Which problem do you act on first?" },
  ];

  function correctAction(c) {
    if (c.daysLate > 0) return "fine";              // late filing = statutory penalty
    if (!c.complete || c.issue) return "amend";     // timely but flawed → amendment first
    return "accept";
  }

  const issueLabel = {
    math: "Totals do not reconcile",
    disclosure: "Missing required donor disclosures",
    overlimit: "Contribution exceeds the limit",
    prohibited: "Contribution from a prohibited source",
  };

  const cfg = {
    cases: cases,
    id: "finance",
    label: "Campaign Finance",
    icon: "&#9878;",
    title: "Campaign Finance Reporting",
    summary: "Audit committee filings; request amendments for substantive errors and levy statutory late fines.",
    headline: "Auditing the Disclosure Reports",
    batchNoun: "filings",
    caseKicker: "Filing",
    beginLabel: "Open the filings",
    keyDates: () => `<strong>Statutory penalty schedule.</strong> Late filing: ${scheduleText()}. Fines are set by statute — not discretionary.`,
    intro: [
      "Disclosure is the heart of campaign finance: the public's remedy for money in politics is sunlight, and your job is to keep the reports timely, accurate, and complete.",
      "Two instincts to build here. First, fines are formulaic — you apply the schedule, you don't negotiate it, and you don't waive it for a sympathetic story. Second, due process: a substantive error earns a chance to amend before any penalty.",
    ],
    primer: {
      what: "Audits committee campaign-finance reports for timeliness, completeness, and prohibited or excess contributions — accepting clean filings, requiring amendments for substantive errors, and assessing the statutory penalty for late ones.",
      matters: "Disclosure is the public's remedy for money in politics. Even-handed, by-the-book enforcement is the whole point — no favors for a friend, no extra scrutiny for an opponent.",
      terms: [
        ["Amendment", "A notice giving the committee a chance to correct a substantive error before any penalty (due process)."],
        ["Statutory penalty", "A fine fixed by law for late filing — applied uniformly, never negotiated or waived for a good story."],
        ["Prohibited / excess contribution", "A contribution from a barred source or over the limit; remedied by refund or redesignation."],
      ],
    },
    question: "Accept this filing, request an amendment, or assess the statutory fine?",
    stakes: "Let a violation slide and enforcement looks selective; over-penalize a clean filer and you abuse the office.",
    rulesTitle: "How a filing is handled",
    rules: [
      { h: "Accept", t: "Timely, complete, internally consistent, no prohibited or excess contributions → accept the filing." },
      { h: "Request an amendment", t: "A timely report with a math, disclosure, over-limit, or prohibited-source problem gets a notice to amend. Fix the record before any penalty." },
      { h: "Assess the statutory fine", t: "A late filing triggers the statutory penalty schedule (see key dates below). Apply it evenly to everyone; the amount is set by law, not by you." },
      { h: "No selective enforcement", t: "Same rule for every committee. A good excuse does not waive a statutory fine, and a committee you dislike does not earn an extra one." },
    ],
    decisions: [
      { act: "accept", tone: "good", label: "Accept filing", sub: "Timely &amp; complete" },
      { act: "amend", tone: "warn", label: "Request amendment", sub: "Substantive error — fix first" },
      { act: "fine", tone: "bad", label: "Assess statutory fine", sub: "Late filing" },
    ],
    actLabel: { accept: "accept filing", amend: "request amendment", fine: "assess statutory fine" },
    penalties: { correct: 4, "fine->accept": -14, "amend->accept": -10, "accept->fine": -12, "accept->amend": -6,
                 "amend->fine": -10, "fine->amend": -8, default: -10 },

    caseHead: (c) => ({ title: c.committee, id: c.id, sub: c.report }),

    caseBody: function (c) {
      const lateClass = c.daysLate > 0 ? "bad" : "ok";
      const lateText = c.daysLate > 0 ? `${c.daysLate} day${c.daysLate === 1 ? "" : "s"} late` : "On time";
      const issue = c.issue || !c.complete
        ? `<span class="flag bad">${issueLabel[c.issue] || "Incomplete"}</span>`
        : `<span class="flag ok">None found</span>`;
      const fineCalc = MODEL() === "flat"
        ? `Late filing → a flat statutory civil penalty of <strong>${money(FIRST())}</strong> (first violation; ${money(REPEAT())} if a repeat in the cycle). Set by statute; issue with notice.`
        : `${c.daysLate} &times; ${money(PER_DAY())}/day = ${money(c.daysLate * PER_DAY())}${c.daysLate * PER_DAY() > FINE_CAP() ? `, capped at <strong>${money(FINE_CAP())}</strong>` : ` → <strong>${money(fineFor(c))}</strong>`}. Formulaic; issue with notice.`;
      const fineRow = c.daysLate > 0
        ? `<div class="filenote"><span class="filenote-k">Statutory fine calculation</span><p>${fineCalc}</p></div>`
        : "";
      return `
        <div class="envelope casefile">
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-k">Timeliness</span><span class="meta-v flag ${lateClass}">${lateText}</span></div>
            <div class="meta-item"><span class="meta-k">Completeness</span><span class="meta-v flag ${c.complete ? "ok" : "bad"}">${c.complete ? "Complete" : "Incomplete"}</span></div>
            <div class="meta-item"><span class="meta-k">Audit findings</span><span class="meta-v">${issue}</span></div>
          </div>
          ${fineRow}
          <p class="muted" style="margin:.6rem 0 0;font-size:.9rem">${c.note}</p>
        </div>`;
    },

    correctAction: correctAction,

    isCritical: function (ctx) {
      // Misapplied enforcement either way is the integrity failure.
      return (ctx.correct === "fine" && ctx.chosen !== "fine") ||
             (ctx.chosen === "fine" && ctx.correct !== "fine") ||
             (ctx.correct === "amend" && ctx.chosen === "accept" && true);
    },

    feedback: function (c, ctx) {
      let verdict, detail, cite;
      if (c.daysLate > 0) {
        detail = `The report is late by ${c.daysLate} day${c.daysLate === 1 ? "" : "s"}. The penalty is set by statute — ${scheduleText()} — so the fine here is <strong>${money(fineFor(c))}</strong>. ` +
          (c.complete ? "" : "The report is also incomplete, but the lateness is the action item; you'll still flag the substantive defect. ") +
          (c.daysLate === 1 ? "A sympathetic reason does not change a statutory, non-discretionary penalty — waiving it would be selective enforcement. " : "") +
          "Assess the fine with proper notice, applied the same way you'd apply it to anyone.";
        cite = { tag: "Late-filing penalty", body: `${scheduleText()}. Statutory and non-discretionary; notice before collection.`, law: "campaign_finance" };
      } else if (!c.complete || c.issue) {
        const what = issueLabel[c.issue] || "an incomplete report";
        detail = `Filed on time, but with a substantive problem: ${what.toLowerCase()}. The right first step is a notice to amend, not a penalty — give the committee the chance to correct the record (refund or redesignate an excess/prohibited contribution, supply missing disclosures, or fix the math). Penalties for substance come only if they fail to cure.`;
        cite = { tag: "Amend before penalty", body: "Substantive defects in a timely report get a cure opportunity; due process precedes any penalty.", law: "campaign_finance" };
      } else {
        detail = "Timely, complete, internally consistent, and free of prohibited or excess contributions. Accept the filing as disclosed.";
        cite = { tag: "Accepted", body: "A clean, timely filing is simply accepted.", law: "campaign_finance" };
      }
      if (ctx.ok) verdict = "Defensible handling.";
      else if (ctx.correct === "fine" && ctx.chosen === "accept") verdict = "You let a late filer off — that's selective enforcement.";
      else if (ctx.correct === "accept" && ctx.chosen === "fine") verdict = "You fined a committee that did nothing wrong.";
      else if (ctx.correct === "amend" && ctx.chosen === "accept") verdict = "You accepted a report with a substantive defect.";
      else if (ctx.correct === "amend" && ctx.chosen === "fine") verdict = "You jumped to a penalty without the required chance to amend.";
      else if (ctx.correct === "fine" && ctx.chosen === "amend") verdict = "You skipped a statutory fine the schedule requires.";
      else verdict = "Not the defensible handling.";
      return { verdict, detail, cite };
    },

    tallies: function (results) {
      const selective = results.filter((r) =>
        (r.correct === "fine" && r.chosen !== "fine") || (r.chosen === "fine" && r.correct !== "fine")).length;
      const accepted = results.filter((r) => r.correct === "amend" && r.chosen === "accept").length;
      return [
        { num: selective, lbl: "Enforcement misapplied", cls: selective ? "bad" : "" },
        { num: accepted, lbl: "Flawed reports accepted", cls: accepted ? "bad" : "" },
      ];
    },

    lessons: [
      "<strong>Fines are formulaic, not discretionary.</strong> Apply the schedule evenly; a good story does not waive a statutory penalty.",
      "<strong>Due process before penalty.</strong> Substantive errors earn a notice to amend first — penalties come only if uncured.",
      "<strong>Lateness is the action item.</strong> When a report is both late and flawed, the fine is driven by the deadline; still flag the substance.",
      "<strong>No selective enforcement.</strong> The same rule for the committee you like and the one you don't — that even hand is the whole point.",
    ],
  };

  EG.register(EG.makeAdjudication(cfg));
})();
