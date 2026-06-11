/* mod_provisional.js — Provisional Ballot Adjudication. */
(function () {
  "use strict";

  // registrationStatus:
  //   this_precinct  | other_precinct_same_jx | other_jurisdiction | not_registered
  const cases = [
    { id: "PRV-201", voter: "Nadia F. Coleman", reason: "Name not found in the precinct poll book",
      registrationStatus: "this_precinct", lookup: "Active registration confirmed at this precinct — clerical omission from the printed roster.",
      idRequired: false, idCured: null, alreadyVoted: false },
    { id: "PRV-202", voter: "Hector D. Salinas", reason: "Voted at the wrong precinct (right county)",
      registrationStatus: "other_precinct_same_jx", lookup: "Registered in {county}, but assigned to Precinct 14 — voted in Precinct 9.",
      idRequired: false, idCured: null, alreadyVoted: false },
    { id: "PRV-203", voter: "Renee A. Whitlock", reason: "Moved out of the county before the election",
      registrationStatus: "other_jurisdiction", lookup: "Registration is now in a neighboring county. Not eligible to vote on {county}'s ballot.",
      idRequired: false, idCured: null, alreadyVoted: false },
    { id: "PRV-204", voter: "Samuel O. Briggs", reason: "Could not present required ID at the polls",
      registrationStatus: "this_precinct", lookup: "Registration confirmed at this precinct.",
      idRequired: true, idCured: true, idNote: "Voter returned with valid ID before the cure deadline.", alreadyVoted: false },
    { id: "PRV-205", voter: "Lillian Park-Mendez", reason: "Could not present required ID at the polls",
      registrationStatus: "this_precinct", lookup: "Registration confirmed at this precinct.",
      idRequired: true, idCured: false, idNote: "No ID provided by the cure deadline.", alreadyVoted: false },
    { id: "PRV-206", voter: "Darnell K. Foster", reason: "Records show a mail ballot already counted",
      registrationStatus: "this_precinct", lookup: "Registration confirmed — but a returned mail ballot from this voter was already accepted and counted.",
      idRequired: false, idCured: null, alreadyVoted: true },
    { id: "PRV-207", voter: "Imani R. Sutton", reason: "Registered at the DMV, not in the system",
      registrationStatus: "this_precinct", lookup: "Motor-voter application dated before the registration deadline; not yet processed. Voter resides in this precinct.",
      idRequired: false, idCured: null, alreadyVoted: false },
    { id: "PRV-208", voter: "George T. Halloran", reason: "Not registered; missed the deadline",
      registrationStatus: "not_registered", lookup: "No registration found in any jurisdiction; no timely application on record.",
      idRequired: false, idCured: null, alreadyVoted: false },
    { id: "PRV-209", voter: "Yuki Tanaka-Reyes", reason: "Moved within the county, address not updated",
      registrationStatus: "this_precinct", lookup: "Registered in {county}; voted the precinct serving the new address. Address update is permissible.",
      idRequired: false, idCured: null, alreadyVoted: false },
    { id: "PRV-210", voter: "Bernard E. Quist", reason: "Wrong precinct AND no valid registration here",
      registrationStatus: "other_jurisdiction", lookup: "Voted in Precinct 3; registration is in another county. Wrong precinct is moot — not eligible on this ballot at all.",
      idRequired: false, idCured: null, alreadyVoted: false },
  ];

  function correctAction(c) {
    if (c.alreadyVoted) return "reject";
    if (c.registrationStatus === "not_registered") return "reject";
    if (c.registrationStatus === "other_jurisdiction") return "reject";
    if (c.idRequired && c.idCured === false) return "reject";
    if (c.registrationStatus === "other_precinct_same_jx") return "partial";
    return "full";
  }

  const cfg = {
    cases: cases,
    law: "provisional",
    id: "provisional",
    label: "Provisional Ballot Adjudication",
    icon: "&#9878;", // scales of justice
    title: "Provisional Ballot Adjudication",
    summary: "Work the provisional queue: apply each reason code to count in full, count eligible contests, or reject.",
    headline: "Adjudicating the Provisional Queue",
    batchNoun: "ballots",
    caseKicker: "Provisional",
    beginLabel: "Open the queue",
    intro: [
      "Provisional ballots are the fail-safe of the system: when eligibility can't be confirmed at the polling place, the voter still casts a ballot and you decide afterward whether — and how much of it — counts.",
      "Each ballot carries a reason code. Your job is to research the facts and apply the rule, not your instinct. Every voter who is eligible gets counted; every contest a voter wasn't entitled to vote stays uncounted.",
    ],
    primer: {
      what: "Adjudicates provisional ballots — the fail-safe ballots cast when a voter's eligibility can't be confirmed at the polling place — deciding after the fact whether, and how much of, each one counts.",
      matters: "Provisional ballots exist so an eligible voter is never simply turned away over a records glitch. The default question is how much of the ballot counts, not how to reject it.",
      terms: [
        ["Provisional ballot", "A ballot cast and set aside for later eligibility review by the electoral board (§ 24.2-653.01)."],
        ["Wrong precinct", "Right jurisdiction but wrong precinct — often counts for the contests the voter was actually eligible to vote."],
        ["ID cure", "Providing required identification by a deadline so a provisional cast for lack of ID can count."],
      ],
    },
    question: "Count this provisional in full, count only the eligible contests, or reject it?",
    stakes: "Reject an eligible voter and their ballot is lost; count an ineligible one and you corrupt the result.",
    rulesTitle: "How a provisional is resolved",
    rules: [
      { h: "Count in full", t: "Eligibility confirmed and the voter was in the right place — count every contest. A clerical omission or an unprocessed-but-timely registration still counts." },
      { h: "Count eligible contests only", t: "Right jurisdiction, wrong precinct → count the contests the voter was actually entitled to vote, and only those." },
      { h: "Reject", t: "Not registered, registered in another jurisdiction, an unmet ID-cure requirement, or already voted (double voting). No eligibility, no count." },
      { h: "Research before you rule", t: "Check the rolls, the ID cure log, and prior-vote records first. The disposition follows the file, not the reason code on its face." },
    ],
    decisions: [
      { act: "full", tone: "good", label: "Count in full", sub: "Eligible — count every contest" },
      { act: "partial", tone: "warn", label: "Count eligible contests", sub: "Right jurisdiction, wrong precinct" },
      { act: "reject", tone: "bad", label: "Reject", sub: "No eligibility to count" },
    ],
    actLabel: { full: "count in full", partial: "count eligible contests", reject: "reject" },
    penalties: { correct: 4, "full->reject": -16, "partial->reject": -14, "reject->full": -14, "reject->partial": -12,
                 "full->partial": -6, "partial->full": -8, default: -10 },

    caseHead: (c) => ({ title: c.voter, id: c.id, sub: "Reason code: " + c.reason }),

    caseBody: function (c) {
      const idRow = c.idRequired
        ? `<div class="meta-item"><span class="meta-k">ID cure</span><span class="meta-v flag ${c.idCured ? "ok" : "bad"}">${c.idCured ? "Cured in time" : "Not cured"}</span></div>`
        : `<div class="meta-item"><span class="meta-k">ID cure</span><span class="meta-v">Not required</span></div>`;
      const regLabel = {
        this_precinct: "Confirmed — this precinct",
        other_precinct_same_jx: "Confirmed — other precinct, same county",
        other_jurisdiction: "Registered in another jurisdiction",
        not_registered: "No registration found",
      }[c.registrationStatus];
      const regClass = c.registrationStatus === "this_precinct" ? "ok"
        : c.registrationStatus === "other_precinct_same_jx" ? "" : "bad";
      return `
        <div class="envelope casefile">
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-k">Registration lookup</span><span class="meta-v flag ${regClass}">${regLabel}</span></div>
            ${idRow}
            <div class="meta-item"><span class="meta-k">Prior ballot on record</span><span class="meta-v flag ${c.alreadyVoted ? "bad" : "ok"}">${c.alreadyVoted ? "YES — already counted" : "None"}</span></div>
          </div>
          <div class="filenote"><span class="filenote-k">Researcher's note</span><p>${c.lookup}${c.idNote ? " " + c.idNote : ""}</p></div>
        </div>`;
    },

    correctAction: correctAction,

    isCritical: function (ctx) {
      return ((ctx.correct === "full" || ctx.correct === "partial") && ctx.chosen === "reject") ||
             (ctx.correct === "reject" && (ctx.chosen === "full" || ctx.chosen === "partial"));
    },

    feedback: function (c, ctx) {
      let verdict, detail, cite;
      if (c.alreadyVoted) {
        detail = "This voter already returned a mail ballot that was accepted and counted. Counting the provisional too would be double voting. Reject — and note the matched record.";
        cite = { tag: "One ballot per voter", body: "A provisional is void where the voter's regular ballot was already counted." };
      } else if (c.registrationStatus === "not_registered") {
        detail = "No registration exists and no timely application is on record. Eligibility is the threshold for any count. Reject.";
        cite = { tag: "Registration required", body: "No valid, timely registration → the provisional cannot be counted." };
      } else if (c.registrationStatus === "other_jurisdiction") {
        detail = "The voter is registered in another jurisdiction, so they were never eligible to vote {county}'s ballot. The wrong-precinct question is moot. Reject here (the other jurisdiction handles their eligibility).";
        cite = { tag: "Jurisdiction", body: "A voter not registered in this jurisdiction has nothing to count on this ballot." };
      } else if (c.idRequired && c.idCured === false) {
        detail = "ID was required and the voter did not satisfy the cure by the deadline. The remedy existed and went unused. Reject — and confirm the cure log shows the missed deadline.";
        cite = { tag: "ID cure", body: "An unmet ID-cure requirement is fatal to the provisional after the cure deadline." };
      } else if (c.registrationStatus === "other_precinct_same_jx") {
        detail = "Right county, wrong precinct. The voter is eligible — but only for the contests on their assigned ballot style. Count those contests and only those; do not count contests they weren't entitled to vote.";
        cite = { tag: "Partial count", body: "Wrong-precinct ballots count for the contests the voter was eligible to vote, and no others." };
      } else {
        detail = "Eligibility is confirmed and the voter was in the right place — whether it was a clerical omission, a timely-but-unprocessed registration, or a permissible in-county move. Count every contest.";
        cite = { tag: "Full count", body: "Confirmed eligibility in the correct precinct → count in full." };
      }
      if (ctx.ok) verdict = "Defensible disposition.";
      else if ((ctx.correct === "full" || ctx.correct === "partial") && ctx.chosen === "reject") verdict = "You rejected an eligible voter.";
      else if (ctx.correct === "reject" && ctx.chosen !== "reject") verdict = "You counted a ballot with no eligibility behind it.";
      else if (ctx.correct === "full" && ctx.chosen === "partial") verdict = "You under-counted — this voter was entitled to every contest.";
      else if (ctx.correct === "partial" && ctx.chosen === "full") verdict = "You counted contests this voter wasn't entitled to vote.";
      else verdict = "Not the defensible disposition.";
      return { verdict, detail, cite };
    },

    tallies: function (results) {
      const dis = results.filter((r) => (r.correct === "full" || r.correct === "partial") && r.chosen === "reject").length;
      const over = results.filter((r) => r.correct === "reject" && r.chosen !== "reject").length;
      return [
        { num: dis, lbl: "Eligible voters rejected", cls: dis ? "bad" : "" },
        { num: over, lbl: "Ineligible ballots counted", cls: over ? "bad" : "" },
      ];
    },

    lessons: [
      "<strong>Provisional ballots are a fail-safe, not a trap.</strong> The default question is “how much of this counts,” not “how do I reject it.”",
      "<strong>Research drives the disposition.</strong> A scary reason code (“not in the poll book”) often resolves to a full count once you check the rolls.",
      "<strong>Wrong precinct ≠ reject.</strong> In the right jurisdiction, count the contests the voter was eligible to vote.",
      "<strong>Reject is for true ineligibility:</strong> not registered, wrong jurisdiction, unmet ID cure, or a ballot already counted.",
    ],
  };

  EG.register(EG.makeAdjudication(cfg));
})();
