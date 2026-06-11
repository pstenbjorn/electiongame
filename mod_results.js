/* mod_results.js — Results Reporting, Reconciliation & Canvass. */
(function () {
  "use strict";

  // Reconciliation identity: every poll-book check-in results in exactly one of:
  //   a counted ballot, a documented spoiled/surrendered ballot, or a voter who
  //   left without voting ("fled"). So: checkIns == counted + spoiled + fled.
  const cases = [
    { id: "RC-01", precinct: "Precinct 4 — Riverside", checkIns: 1450, counted: 1450, spoiled: 0, fled: 0,
      note: "Clean precinct: no spoiled ballots reported, no surrendered ballots." },
    { id: "RC-02", precinct: "Precinct 9 — Eastgate", checkIns: 1620, counted: 1602, spoiled: 12, fled: 6,
      note: "12 ballots spoiled and reissued; 6 voters checked in but left without casting (all logged)." },
    { id: "RC-03", precinct: "Precinct 2 — Hillcrest", checkIns: 980, counted: 995, spoiled: 0, fled: 0,
      note: "More ballots counted than voters checked in. No spoils or surrenders logged." },
    { id: "RC-04", precinct: "Precinct 11 — Northpoint", checkIns: 2100, counted: 2080, spoiled: 5, fled: 3,
      note: "5 spoiled, 3 left without voting — both logged at the precinct." },
    { id: "RC-05", precinct: "Precinct 6 — Maple Grove", checkIns: 1330, counted: 1316, spoiled: 14, fled: 0,
      note: "14 ballots spoiled and reissued during the day; no surrenders." },
    { id: "RC-06", precinct: "Precinct 1 — Old Town", checkIns: 760, counted: 742, spoiled: 0, fled: 0,
      note: "No spoils or surrenders reported by the precinct board." },
    { id: "RC-07", precinct: "Precinct 14 — Westside", checkIns: 1875, counted: 1860, spoiled: 9, fled: 6,
      note: "9 spoiled, 6 voters left without casting — all entered in the log." },
    { id: "RC-08", precinct: "Precinct 8 — Lakeshore", checkIns: 540, counted: 540, spoiled: 0, fled: 0,
      note: "Small precinct, no exceptions reported." },
    { id: "RC-09", precinct: "Precinct 5 — Greenfield", checkIns: 1200, counted: 1207, spoiled: 0, fled: 0,
      note: "Counted total runs ahead of check-ins; nothing logged to explain it." },
    { id: "RC-10", precinct: "Precinct 12 — Sunrise", checkIns: 1990, counted: 1972, spoiled: 11, fled: 7,
      note: "11 spoiled and 7 surrendered/left, all documented." },
  ];

  function reconciles(c) { return c.checkIns === c.counted + c.spoiled + c.fled; }

  const cfg = {
    cases: cases,
    law: "canvass",
    id: "results",
    label: "Results, Reconciliation & Canvass",
    icon: "&#9989;", // check
    title: "Results Reporting & Canvass",
    summary: "Reconcile each precinct's ballots against poll-book check-ins; certify only what balances.",
    headline: "Reconciling the Canvass",
    batchNoun: "precincts",
    caseKicker: "Precinct",
    beginLabel: "Begin the canvass",
    keyDates: "<strong>Reconciliation identity.</strong> Check-ins = ballots counted + spoiled/surrendered + voters who left without casting. It must balance before you certify.",
    intro: [
      "Certification is a promise: that the number of ballots counted matches the number of people who voted, and that every difference is accounted for. The canvass is where you keep that promise, precinct by precinct.",
      "For each precinct, reconcile the ballots counted against the poll-book check-ins, accounting for documented spoiled and surrendered ballots. If it balances, certify. If there's an unexplained gap — in either direction — you hold and investigate before anything is certified.",
    ],
    rulesTitle: "Certify only what reconciles",
    rules: [
      { h: "Certify", t: "The numbers balance — check-ins equal ballots counted plus documented spoils/surrenders and voters who left. Certify the precinct." },
      { h: "Hold & investigate", t: "Any unexplained discrepancy. Too many ballots, too few, or a gap the log doesn't account for → stop and reconcile before certifying." },
      { h: "More ballots than voters is a red flag", t: "You can never certify more ballots counted than voters checked in. Find the error first — there is no rounding in an election." },
      { h: "Documented differences are fine", t: "A spoiled-and-reissued ballot or a voter who left isn't a discrepancy if it's logged and the totals still foot." },
    ],
    decisions: [
      { act: "certify", tone: "good", label: "Certify precinct", sub: "Reconciles &mdash; numbers balance" },
      { act: "investigate", tone: "bad", label: "Hold &amp; investigate", sub: "Unexplained discrepancy" },
    ],
    actLabel: { certify: "certify", investigate: "hold & investigate" },
    penalties: { correct: 4, "investigate->certify": -16, "certify->investigate": -6, default: -10 },

    caseHead: (c) => ({ title: c.precinct, id: c.id, sub: "Canvass reconciliation" }),

    caseBody: function (c) {
      return `
        <div class="envelope casefile">
          <table class="la-table ledger">
            <tbody>
              <tr><td>Poll-book check-ins</td><td class="num strong">${c.checkIns.toLocaleString()}</td></tr>
              <tr><td>Ballots counted</td><td class="num">${c.counted.toLocaleString()}</td></tr>
              <tr><td>Spoiled / surrendered (logged)</td><td class="num">${c.spoiled.toLocaleString()}</td></tr>
              <tr><td>Checked in, left without casting (logged)</td><td class="num">${c.fled.toLocaleString()}</td></tr>
            </tbody>
          </table>
          <div class="reconcile-prompt">Counted + spoiled + left = <strong>${(c.counted + c.spoiled + c.fled).toLocaleString()}</strong>
            &nbsp;vs.&nbsp; check-ins <strong>${c.checkIns.toLocaleString()}</strong>. Does it reconcile?</div>
          <p class="muted" style="margin:.6rem 0 0;font-size:.9rem">${c.note}</p>
        </div>`;
    },

    correctAction: (c) => (reconciles(c) ? "certify" : "investigate"),

    isCritical: (ctx) => ctx.correct === "investigate" && ctx.chosen === "certify",

    feedback: function (c, ctx) {
      let verdict, detail, cite;
      const accounted = c.counted + c.spoiled + c.fled;
      const gap = accounted - c.checkIns;
      if (reconciles(c)) {
        detail = `The numbers foot: ${c.counted.toLocaleString()} counted + ${c.spoiled.toLocaleString()} spoiled + ${c.fled.toLocaleString()} left = ${c.checkIns.toLocaleString()} check-ins. ` +
          (c.spoiled + c.fled > 0 ? "The difference between ballots counted and voters is fully explained by logged exceptions. " : "") +
          "Reconciled — certify the precinct and record the figures.";
        cite = { tag: "Reconciled", body: "Check-ins balance against ballots counted plus documented exceptions → certify." };
      } else {
        if (c.counted > c.checkIns) {
          detail = `Stop: ${c.counted.toLocaleString()} ballots were counted but only ${c.checkIns.toLocaleString()} voters checked in — ${(c.counted - c.checkIns).toLocaleString()} more ballots than voters, with nothing logged to explain it. You can never certify more ballots than voters. Hold the precinct, pull the materials, and reconcile (a misfed batch, a double-scan, a tally error) before certifying anything.`;
        } else {
          detail = `The totals don't foot: counted + spoiled + left = ${accounted.toLocaleString()}, but ${c.checkIns.toLocaleString()} voters checked in — an unexplained gap of ${Math.abs(gap).toLocaleString()}. Missing ballots are as serious as extra ones. Hold and investigate (uncounted batch, mis-logged spoils, check-in error) before certifying.`;
        }
        cite = { tag: "Unreconciled", body: "Any unexplained discrepancy must be resolved before certification — never certify around it." };
      }
      if (ctx.ok) verdict = "Defensible canvass decision.";
      else if (ctx.correct === "investigate" && ctx.chosen === "certify") verdict = "You certified a precinct that doesn't balance.";
      else verdict = "You held a precinct that actually reconciles — safe, but it delays the canvass. Re-check the math.";
      return { verdict, detail, cite };
    },

    tallies: function (results) {
      const certifiedBad = results.filter((r) => r.correct === "investigate" && r.chosen === "certify").length;
      const heldGood = results.filter((r) => r.correct === "certify" && r.chosen === "investigate").length;
      return [
        { num: certifiedBad, lbl: "Unbalanced precincts certified", cls: certifiedBad ? "bad" : "" },
        { num: heldGood, lbl: "Balanced precincts held", cls: heldGood ? "" : "" },
      ];
    },

    lessons: [
      "<strong>Certification means it balances.</strong> Reconcile every precinct before you certify — the canvass is where the promise is kept.",
      "<strong>More ballots than voters is never “close enough.”</strong> An over-count is a stop-everything red flag, not a rounding issue.",
      "<strong>Missing ballots matter as much as extra ones.</strong> A gap in either direction gets investigated.",
      "<strong>Documented exceptions aren't discrepancies.</strong> Logged spoils and surrenders explain a difference; the totals still have to foot.",
    ],
  };

  EG.register(EG.makeAdjudication(cfg));
})();
