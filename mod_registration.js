/* mod_registration.js — Voter Registration Notifications & List Maintenance. */
(function () {
  "use strict";

  // situation drives the correct action. Categories:
  //   keep:   injur_move | new_valid | nonvoter_only | rights_restored | confirmed_same
  //   notice: ncoa_out_unconfirmed | undeliverable
  //   cancel: deceased_verified | voter_request | confirmed_move_out
  const cases = [
    { id: "VR-01", voter: "Carmen L. Delacroix", trigger: "USPS move flag — moved across town",
      situation: "injur_move", source: "National Change of Address: new address is within {county}.",
      note: "Voter moved within the jurisdiction and remains eligible here." },
    { id: "VR-02", voter: "Andre P. Mwangi", trigger: "New registration application",
      situation: "new_valid", source: "Complete, signed, timely application; identity and eligibility verified.",
      note: "A clean new registration ready to be added to the rolls." },
    { id: "VR-03", voter: "Helena Brunner-Sato", trigger: "USPS move flag — moved out of state",
      situation: "ncoa_out_unconfirmed", source: "NCOA indicates a move to another state — unconfirmed by the voter.",
      note: "A third-party move flag is a lead, not proof. The voter has not confirmed anything." },
    { id: "VR-04", voter: "Otis R. Vandenberg", trigger: "Election mail returned undeliverable",
      situation: "undeliverable", source: "Sample ballot returned by USPS marked undeliverable, no forwarding.",
      note: "Mail bounced, but you don't actually know the voter has moved." },
    { id: "VR-05", voter: "Frances W. Okeke", trigger: "Has not voted in several elections",
      situation: "nonvoter_only", source: "No vote history for three cycles. No move flag, no returned mail, no other indicator.",
      note: "The only fact here is that this person hasn't voted lately." },
    { id: "VR-06", voter: "Walter J. Hammersmith", trigger: "Matched to a death record",
      situation: "deceased_verified", source: "State vital-records death certificate matched on name, DOB, and address.",
      note: "An official, verified death record — not a rumor or a same-name guess." },
    { id: "VR-07", voter: "Lucia M. Fontaine", trigger: "Signed cancellation request",
      situation: "voter_request", source: "Voter submitted a signed request to cancel — relocating and will register in a new state.",
      note: "The voter themselves asked to be removed, in writing." },
    { id: "VR-08", voter: "Desmond A. Achterberg", trigger: "Confirmation process completed — move confirmed",
      situation: "confirmed_move_out", source: "Voter returned the confirmation card stating a new address outside the jurisdiction.",
      note: "The address-confirmation process has run its course and confirms the move out." },
    { id: "VR-09", voter: "Priya S. Ramaswamy", trigger: "Eligibility restored",
      situation: "rights_restored", source: "Documentation confirms voting eligibility has been restored under state law.",
      note: "Previously inactive; eligibility is now confirmed and current." },
    { id: "VR-10", voter: "Gloria T. Eastwood", trigger: "Confirmation card returned — still at same address",
      situation: "confirmed_same", source: "Voter returned the confirmation notice indicating they still live at the registered address.",
      note: "The confirmation came back: same address, still here." },
  ];

  function correctAction(c) {
    switch (c.situation) {
      case "deceased_verified":
      case "voter_request":
      case "confirmed_move_out":
        return "cancel";
      case "ncoa_out_unconfirmed":
      case "undeliverable":
        return "notice";
      default:
        return "keep"; // injur_move, new_valid, nonvoter_only, rights_restored, confirmed_same
    }
  }

  const cfg = {
    cases: cases,
    law: "reg_list_maintenance",
    id: "registration",
    label: "Voter Registration Notifications",
    icon: "&#9998;", // pencil
    title: "Voter Registration & List Maintenance",
    summary: "Process registration events and notices within legal windows — accurate rolls without wrongful purges.",
    headline: "Maintaining the Rolls",
    batchNoun: "records",
    caseKicker: "Record",
    beginLabel: "Open the records",
    intro: [
      "Accurate rolls are a balancing act. You want them current — but list maintenance is tightly rule-bound, because removing an eligible voter is among the most serious errors an office can make.",
      "Two principles to internalize. You cannot remove a voter for not voting. And a third-party signal — a move flag, a piece of returned mail — is a reason to send a confirmation notice and wait, not a reason to cancel. Removal requires real proof or the voter's own request.",
    ],
    rulesTitle: "How a record is handled",
    rules: [
      { h: "Process / keep active", t: "Update an in-jurisdiction move, add a valid new registration, reactivate restored eligibility, or simply take no adverse action. Non-voting alone is never grounds to remove." },
      { h: "Send a confirmation notice", t: "A move flag or undeliverable mail starts the address-confirmation process: send a forwardable notice, mark inactive, and wait out the statutory period. Do not cancel yet." },
      { h: "Cancel registration", t: "Only on real proof — a verified death record, the voter's signed request, or a confirmed move-out after the confirmation process. Never on a flag alone." },
      { h: "When in doubt, notice — don't purge", t: "The cost of a wrongful removal (a voter turned away) far outweighs the cost of an extra name on the rolls. Err toward the notice." },
    ],
    decisions: [
      { act: "keep", tone: "good", label: "Process / keep active", sub: "Update or no adverse action" },
      { act: "notice", tone: "warn", label: "Send confirmation notice", sub: "Flag &amp; start the waiting period" },
      { act: "cancel", tone: "bad", label: "Cancel registration", sub: "Only on real proof" },
    ],
    actLabel: { keep: "process / keep active", notice: "send confirmation notice", cancel: "cancel registration" },
    penalties: { correct: 4, "keep->cancel": -16, "notice->cancel": -16, "keep->notice": -6, "notice->keep": -8,
                 "cancel->keep": -10, "cancel->notice": -8, default: -10 },

    caseHead: (c) => ({ title: c.voter, id: c.id, sub: "Trigger: " + c.trigger }),

    caseBody: function (c) {
      return `
        <div class="envelope casefile">
          <div class="filenote"><span class="filenote-k">Source of information</span><p>${c.source}</p></div>
          <p class="muted" style="margin:.6rem 0 0;font-size:.9rem">${c.note}</p>
        </div>`;
    },

    correctAction: correctAction,

    isCritical: (ctx) => ctx.correct !== "cancel" && ctx.chosen === "cancel",

    feedback: function (c, ctx) {
      let verdict, detail, cite;
      const correct = correctAction(c);
      if (correct === "cancel") {
        const why = c.situation === "deceased_verified"
          ? "a verified death record matched to this voter"
          : c.situation === "voter_request"
            ? "the voter's own signed cancellation request"
            : "a completed confirmation process confirming a move out of the jurisdiction";
        detail = `Removal is justified here because there is real proof: ${why}. This is exactly the narrow set of grounds on which you may cancel. Cancel the registration and document the basis.`;
        cite = { tag: "Lawful removal", body: "Cancellation is permitted on verified death, the voter's request, or a confirmed move — and only then.", law: "reg_removal" };
      } else if (correct === "notice") {
        const why = c.situation === "undeliverable" ? "a returned piece of mail" : "a third-party move flag";
        detail = `You have ${why} — a lead, not proof. The voter may have moved, or the mail may simply have bounced. Send a forwardable address-confirmation notice, mark the record inactive, and start the statutory waiting period. Cancelling now risks purging someone who never moved.`;
        cite = { tag: "Confirmation process", body: "A move flag or undeliverable mail triggers a confirmation notice and waiting period — not removal." };
      } else {
        const why = {
          injur_move: "The voter moved within the jurisdiction and is still eligible here — just update the address.",
          new_valid: "This is a complete, verified, timely application — add the voter to the rolls.",
          nonvoter_only: "The only fact is that this voter hasn't voted recently, and non-voting is never grounds for removal or even a notice on its own. Take no adverse action.",
          rights_restored: "Eligibility has been restored and confirmed — reactivate the registration.",
          confirmed_same: "The confirmation came back saying the voter still lives at the registered address — keep them active.",
        }[c.situation];
        detail = why + " No adverse action is warranted.";
        cite = { tag: "Keep active", body: "Updates and confirmed-eligible voters stay on the rolls; non-voting alone triggers nothing." };
      }
      if (ctx.ok) verdict = "Defensible handling.";
      else if (ctx.correct !== "cancel" && ctx.chosen === "cancel") verdict = "You purged a voter without legal grounds.";
      else if (ctx.correct === "cancel" && ctx.chosen !== "cancel") verdict = "You left a record that should have been removed.";
      else if (ctx.correct === "keep" && ctx.chosen === "notice") verdict = "You flagged a voter inactive who needed no notice at all.";
      else if (ctx.correct === "notice" && ctx.chosen === "keep") verdict = "You skipped the confirmation process this flag requires.";
      else verdict = "Not the defensible handling.";
      return { verdict, detail, cite };
    },

    tallies: function (results) {
      const purged = results.filter((r) => r.correct !== "cancel" && r.chosen === "cancel").length;
      const stale = results.filter((r) => r.correct === "cancel" && r.chosen !== "cancel").length;
      return [
        { num: purged, lbl: "Wrongful purges", cls: purged ? "bad" : "" },
        { num: stale, lbl: "Stale records kept", cls: stale ? "" : "" },
      ];
    },

    lessons: [
      "<strong>Non-voting is never grounds for removal.</strong> You cannot purge — or even flag — a voter solely for sitting out elections.",
      "<strong>A flag is a lead, not proof.</strong> Move flags and returned mail trigger a confirmation notice and a waiting period, not a cancellation.",
      "<strong>Removal needs real grounds:</strong> a verified death record, the voter's signed request, or a confirmed move-out.",
      "<strong>When in doubt, send the notice.</strong> A wrongful purge turns an eligible voter away; an extra name is a far smaller cost.",
    ],
  };

  EG.register(EG.makeAdjudication(cfg));
})();
