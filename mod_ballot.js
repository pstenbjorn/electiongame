/* mod_ballot.js — Ballot Design & Logic-and-Accuracy (L&A) Testing. */
(function () {
  "use strict";

  // Two kinds of cases:
  //   type "proof": a ballot layout to proofread. checks[] each pass/fail.
  //   type "la":    a test deck. rows[] of {option, expected, reported}.
  const cases = [
    { id: "BD-01", type: "proof", subject: "Precinct 7 ballot style — proof v3",
      checks: [
        { label: "Header shows the correct election name and date", pass: true },
        { label: "Each contest states the “Vote for One / Vote for N” instruction", pass: true },
        { label: "Candidate rotation applied across ballot styles where required", pass: true },
        { label: "Every candidate has a corresponding target (oval) printed", pass: true },
        { label: "Bilingual instructions present (VRA §203 coverage)", pass: true },
        { label: "No contest or option overflows the printable area", pass: true },
      ],
      note: "A careful proof. Walk every check before you sign off." },
    { id: "BD-02", type: "proof", subject: "Precinct 12 ballot style — proof v1",
      checks: [
        { label: "Header shows the correct election name and date", pass: true },
        { label: "Each contest states the “Vote for One / Vote for N” instruction", pass: false },
        { label: "Candidate rotation applied across ballot styles where required", pass: true },
        { label: "Every candidate has a corresponding target (oval) printed", pass: true },
        { label: "Bilingual instructions present (VRA §203 coverage)", pass: true },
        { label: "No contest or option overflows the printable area", pass: true },
      ],
      note: "One contest is missing its “Vote for One” instruction — voters could over- or under-vote." },
    { id: "BD-03", type: "la", subject: "L&A test deck — Optical Scanner #4",
      rows: [
        { option: "Response A", expected: 120, reported: 120 },
        { option: "Response B", expected: 80, reported: 80 },
        { option: "Write-in", expected: 15, reported: 15 },
        { option: "Undervote", expected: 10, reported: 10 },
      ],
      note: "Pre-marked test deck. The reported tally must match the known deck exactly — to the ballot." },
    { id: "BD-04", type: "la", subject: "L&A test deck — Optical Scanner #9",
      rows: [
        { option: "Response A", expected: 150, reported: 150 },
        { option: "Response B", expected: 90, reported: 87 },
        { option: "Write-in", expected: 20, reported: 20 },
        { option: "Undervote", expected: 5, reported: 5 },
      ],
      note: "Pre-marked test deck. Compare every line against the known deck totals." },
    { id: "BD-05", type: "proof", subject: "Precinct 3 ballot style — proof v2",
      checks: [
        { label: "Header shows the correct election name and date", pass: false },
        { label: "Each contest states the “Vote for One / Vote for N” instruction", pass: true },
        { label: "Candidate rotation applied across ballot styles where required", pass: true },
        { label: "Every candidate has a corresponding target (oval) printed", pass: true },
        { label: "Bilingual instructions present (VRA §203 coverage)", pass: true },
        { label: "No contest or option overflows the printable area", pass: true },
      ],
      note: "The header carries last cycle's election date. Small text, big problem." },
    { id: "BD-06", type: "la", subject: "L&A test deck — Optical Scanner #2",
      rows: [
        { option: "Response A", expected: 100, reported: 100 },
        { option: "Response B", expected: 100, reported: 100 },
        { option: "Write-in", expected: 12, reported: 0 },
        { option: "Undervote", expected: 8, reported: 8 },
      ],
      note: "Reads zero write-ins from a deck that contains them — is the target being detected at all?" },
    { id: "BD-07", type: "proof", subject: "Precinct 18 ballot style — proof v1",
      checks: [
        { label: "Header shows the correct election name and date", pass: true },
        { label: "Each contest states the “Vote for One / Vote for N” instruction", pass: true },
        { label: "Candidate rotation applied across ballot styles where required", pass: true },
        { label: "Every candidate has a corresponding target (oval) printed", pass: false },
        { label: "Bilingual instructions present (VRA §203 coverage)", pass: true },
        { label: "No contest or option overflows the printable area", pass: true },
      ],
      note: "One candidate is listed but has no oval to fill — those votes could not be cast." },
    { id: "BD-08", type: "la", subject: "L&A test deck — Optical Scanner #6",
      rows: [
        { option: "Response A", expected: 140, reported: 140 },
        { option: "Response B", expected: 70, reported: 70 },
        { option: "Write-in", expected: 18, reported: 18 },
        { option: "Undervote", expected: 9, reported: 9 },
      ],
      note: "Pre-marked test deck — reconcile every line before certifying the scanner." },
  ];

  function hasDefect(c) {
    if (c.type === "proof") return c.checks.some((k) => !k.pass);
    return c.rows.some((r) => r.reported !== r.expected);
  }

  const cfg = {
    cases: cases,
    law: "ballot_la",
    id: "ballot",
    label: "Ballot Design & L&A Testing",
    icon: "&#9745;", // ballot box with check
    title: "Ballot Design & L&A Testing",
    summary: "Proofread ballot layouts and reconcile logic-and-accuracy test decks before equipment goes live.",
    headline: "Proofing Ballots & Certifying Equipment",
    batchNoun: "items",
    caseKicker: "Item",
    beginLabel: "Start proofing",
    intro: [
      "Everything downstream depends on this: if a ballot is mislaid out or a scanner miscounts, no amount of careful processing later can fix it. You test BEFORE the election, not after.",
      "You'll alternate between proofreading ballot styles and reconciling L&A test decks — pre-marked decks with a known answer. Approve only what is provably correct; a single defect or a one-ballot miscount sends it back.",
    ],
    rulesTitle: "Approve only what's provably right",
    rules: [
      { h: "Proof every check", t: "A ballot style passes only if every layout check passes — instructions, rotation, targets, bilingual text, no overflow. One failure returns it." },
      { h: "Reconcile to the ballot", t: "An L&A deck has a known total. The machine's report must match it exactly, line by line. Off by even one → the equipment fails and gets investigated." },
      { h: "There is no “close enough.”", t: "A near-match is a failure. You are certifying that the equipment counts correctly, and a small error is still an error." },
      { h: "Document the test", t: "Record the deck, the result, and the disposition. The L&A record is part of the chain that makes results defensible." },
    ],
    decisions: [
      { act: "approve", tone: "good", label: "Approve / certify", sub: "Provably correct" },
      { act: "reject", tone: "bad", label: "Return / fail", sub: "Defect or miscount found" },
    ],
    actLabel: { approve: "approve", reject: "return / fail" },
    penalties: { correct: 4, "reject->approve": -16, "approve->reject": -8, default: -10 },

    caseHead: (c) => ({ title: c.subject, id: c.id, sub: c.type === "proof" ? "Ballot proof" : "Logic & accuracy test deck" }),

    caseBody: function (c) {
      let body;
      if (c.type === "proof") {
        const items = c.checks.map((k) =>
          `<li class="check ${k.pass ? "ok" : "bad"}"><span class="check-mark">${k.pass ? "&#10003;" : "&#10007;"}</span> ${k.label}</li>`
        ).join("");
        body = `<ul class="checklist">${items}</ul>`;
      } else {
        const rows = c.rows.map(function (r) {
          const match = r.reported === r.expected;
          return `<tr class="${match ? "" : "row-bad"}">
            <td>${r.option}</td><td class="num">${r.expected}</td>
            <td class="num">${r.reported}</td>
            <td class="num flag ${match ? "ok" : "bad"}">${match ? "&#10003;" : (r.reported - r.expected > 0 ? "+" : "") + (r.reported - r.expected)}</td></tr>`;
        }).join("");
        body = `<table class="la-table">
          <thead><tr><th>Option</th><th class="num">Deck (expected)</th><th class="num">Machine reported</th><th class="num">Δ</th></tr></thead>
          <tbody>${rows}</tbody></table>`;
      }
      return `<div class="envelope casefile">${body}
        <p class="muted" style="margin:.7rem 0 0;font-size:.9rem">${c.note}</p></div>`;
    },

    correctAction: (c) => (hasDefect(c) ? "reject" : "approve"),

    isCritical: (ctx) => ctx.correct === "reject" && ctx.chosen === "approve",

    feedback: function (c, ctx) {
      let verdict, detail, cite;
      const defect = hasDefect(c);
      if (c.type === "proof") {
        if (defect) {
          const bad = c.checks.filter((k) => !k.pass).map((k) => k.label.toLowerCase());
          detail = `This proof fails a required check: ${bad.join("; ")}. A ballot defect that reaches print can disenfranchise every voter who uses that style — there is no fixing it on Election Day. Return it for correction and re-proof the next version.`;
          cite = { tag: "Ballot proofing", body: "A ballot style passes only when every layout check passes." };
        } else {
          detail = "Every layout check passes: correct header, voting instructions present, rotation applied, every candidate has a target, bilingual instructions included, nothing overflows. Approve this style for printing.";
          cite = { tag: "Proof approved", body: "All checks pass → the ballot style is cleared for print." };
        }
      } else {
        if (defect) {
          const off = c.rows.filter((r) => r.reported !== r.expected)
            .map((r) => `${r.option} (deck ${r.expected}, machine ${r.reported})`);
          detail = `The machine's report does not match the known deck: ${off.join("; ")}. A test deck has one correct answer, and this isn't it. Do not certify — fail the equipment, pull it from service, and investigate (calibration, target detection, configuration) before any re-test.`;
          cite = { tag: "L&A reconciliation", body: "Reported tallies must match the pre-marked deck exactly; any discrepancy fails the test." };
        } else {
          detail = "Every line reconciles to the pre-marked deck exactly. The scanner counted the known ballots correctly. Certify the equipment and log the L&A result.";
          cite = { tag: "L&A passed", body: "Exact match to the deck → equipment is certified for use." };
        }
      }
      if (ctx.ok) verdict = "Defensible call.";
      else if (ctx.correct === "reject" && ctx.chosen === "approve") verdict = defect && c.type === "la" ? "You certified equipment that miscounts." : "You approved a defective ballot for print.";
      else verdict = "You sent back a clean item — safe, but it costs time and money. Re-check your reasoning.";
      return { verdict, detail, cite };
    },

    tallies: function (results) {
      const missed = results.filter((r) => r.correct === "reject" && r.chosen === "approve").length;
      const overcautious = results.filter((r) => r.correct === "approve" && r.chosen === "reject").length;
      return [
        { num: missed, lbl: "Defects let through", cls: missed ? "bad" : "" },
        { num: overcautious, lbl: "Clean items sent back", cls: overcautious ? "" : "" },
      ];
    },

    lessons: [
      "<strong>Test before, not after.</strong> A ballot or scanner error caught now is a non-event; caught after Election Day it can void a contest.",
      "<strong>“Close” is a failure.</strong> An L&A deck has one right answer — a one-ballot discrepancy fails the equipment.",
      "<strong>Every check, every time.</strong> Proof the whole ballot; the missing instruction or absent oval is the one that bites.",
      "<strong>The L&A record is evidence.</strong> Logging the test and its result is part of what makes the count defensible.",
    ],
  };

  EG.register(EG.makeAdjudication(cfg));
})();
