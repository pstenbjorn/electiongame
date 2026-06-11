/* mod_vbm.js — Vote-by-Mail Processing: signature verification & cure. */
(function () {
  "use strict";

  // Sourced from the jurisdiction config at render time (after config loads).
  const BALLOT_DEADLINE = () => EG.jx("parameters.vbm.ballotDeadline", "8:00 PM, Election Day");
  const CURE_DEADLINE = () => EG.jx("parameters.vbm.cureDeadline", "the cure deadline");

  const cases = [
    { id: "VBM-1042", voterName: "Dana R. Whitfield", sigSeed: "dana-whitfield-7781",
      signatureStatus: "match", received: "Nov 3", postmark: "Oct 30", timely: true,
      blurb: "Returned by mail, arrived two days early." },
    { id: "VBM-1043", voterName: "Marcus T. Adeyemi", sigSeed: "marcus-adeyemi-2210",
      signatureStatus: "missing", received: "Nov 4", postmark: "Nov 1", timely: true,
      blurb: "Affidavit signature line is blank — voter sealed and returned without signing." },
    { id: "VBM-1044", voterName: "Helen Okonkwo-Price", sigSeed: "helen-okonkwo-9034",
      envelopeSeed: "imposter-stroke-5521", signatureStatus: "mismatch", received: "Nov 2",
      postmark: "Oct 29", timely: true, blurb: "Envelope signature differs noticeably in form from the signature on file." },
    { id: "VBM-1045", voterName: "Theodore J. Bramwell", sigSeed: "theodore-bramwell-444",
      signatureStatus: "match", received: "Nov 8", postmark: "Nov 7", timely: false,
      blurb: "Dropped in the mail after Election Day; postmarked and received late." },
    { id: "VBM-1046", voterName: "Priya N. Chandrasekaran", sigSeed: "priya-chandra-6612",
      signatureStatus: "match", received: "Nov 5", postmark: "Nov 4", timely: true,
      blurb: "Arrived at the office at 4:50 PM on Election Day." },
    { id: "VBM-1047", voterName: "Walter Q. Henderson", sigSeed: "walter-henderson-318",
      envelopeSeed: "walter-henderson-318", signatureStatus: "match", received: "Nov 6",
      postmark: "Nov 4", timely: true,
      timelyNote: "Postmarked the day before Election Day and received within the postmark grace window.",
      blurb: "Received after Election Day, but postmarked on time — mind the postmark rule." },
    { id: "VBM-1048", voterName: "Sofia L. Marchetti", sigSeed: "sofia-marchetti-7720",
      envelopeSeed: "different-hand-1190", signatureStatus: "mismatch", received: "Nov 7",
      postmark: "Nov 6", timely: false,
      blurb: "Both a signature discrepancy AND received after the deadline. Which defect controls?" },
    { id: "VBM-1049", voterName: "James E. Fairweather", sigSeed: "james-fairweather-505",
      signatureStatus: "missing", received: "Nov 11", postmark: "Nov 10", timely: false,
      blurb: "Unsigned affidavit, and it arrived well after the deadline." },
    { id: "VBM-1050", voterName: "Aaliyah B. Thornton", sigSeed: "aaliyah-thornton-882",
      envelopeSeed: "aaliyah-thornton-882", signatureStatus: "match", received: "Nov 1",
      postmark: "Oct 28", timely: true, blurb: "Signature shows ordinary day-to-day variation, but the same hand." },
    { id: "VBM-1051", voterName: "Gregory P. Vasquez", sigSeed: "gregory-vasquez-1357",
      envelopeSeed: "forged-vasquez-9988", signatureStatus: "mismatch", received: "Nov 4",
      postmark: "Nov 2", timely: true, blurb: "Signature on file and on the envelope are formed quite differently." },
  ];

  function sigBox(label, seed, opts) {
    if (seed === null) {
      return `<div class="sig-box"><div class="sig-label"><span>${label}</span></div>
        <div class="sig-missing">— NO SIGNATURE —</div></div>`;
    }
    return `<div class="sig-box"><div class="sig-label"><span>${label}</span></div>
      ${window.SignatureArt.svg(seed, opts)}</div>`;
  }

  const cfg = {
    cases: cases,
    law: "vbm_cure",
    id: "vbm",
    label: "Vote-by-Mail Processing",
    icon: "&#9993;", // envelope
    title: "Vote-by-Mail Processing",
    summary: "Verify affidavit signatures and run the notice-and-cure process on returned mail ballots.",
    headline: "Signature Verification & the Cure Process",
    batchNoun: "envelopes",
    caseKicker: "Envelope",
    beginLabel: "Begin processing",
    aarTitle: "Batch processed",
    keyDates: () => `<strong>Key dates.</strong> Receipt deadline: ${BALLOT_DEADLINE()}. Cure deadline: ${CURE_DEADLINE()}.`,
    intro: [
      "Your team is processing the affidavit envelopes of returned mail ballots before they can be opened and counted.",
      "For each envelope, compare the signature against the one on file, confirm the ballot arrived on time, and decide how to handle it. The goal is not speed — it is a defensible decision on every envelope.",
    ],
    primer: {
      what: "Processes the affidavit (return) envelopes of mail ballots before they are opened — verifying the voter's identity by signature, confirming the ballot arrived in time, and running the notice-and-cure process for fixable defects.",
      matters: "Each call decides whether a real person's vote counts. Reject a curable defect and you disenfranchise an eligible voter; accept an invalid one and you weaken the integrity of the count.",
      terms: [
        ["Affidavit envelope", "The outer return envelope the voter signs; the signature is compared to the one on file."],
        ["Cure", "The voter's right to fix a missing or mismatched signature within a set deadline before the ballot is rejected."],
        ["Postmark rule", "Whether a ballot postmarked by Election Day but arriving afterward still counts ({stateAbbr} rule per § 24.2-709)."],
      ],
    },
    question: "Does this ballot count as-is, need a cure notice, or get rejected?",
    stakes: "Wrongly rejecting disenfranchises an eligible voter; wrongly accepting advances an unverified or late ballot.",
    rulesTitle: "The four rules of the affidavit envelope",
    rules: [
      { h: "Accept", t: "Signed, signature reasonably matches the one on file, and received by the deadline → accept for counting." },
      { h: "Notice & cure — not rejection", t: "A missing or mismatched signature is curable. The voter must be notified and given until the cure deadline. Send a cure notice." },
      { h: "Reject only when there is no remedy", t: "Reject a genuinely untimely ballot — received after the deadline with no qualifying postmark. There is no cure for lateness." },
      { h: "Document everything", t: "“It looked off” is not a record; “signature discrepancy, cure notice sent [date]” is." },
    ],
    decisions: [
      { act: "accept", tone: "good", label: "Accept &amp; count", sub: "Signature verified, timely" },
      { act: "cure", tone: "warn", label: "Send cure notice", sub: "Curable defect — notify voter" },
      { act: "reject", tone: "bad", label: "Reject", sub: "No available remedy" },
    ],
    actLabel: { accept: "accept & count", cure: "send cure notice", reject: "reject" },
    penalties: { correct: 4, "cure->reject": -16, "accept->reject": -16, "reject->accept": -14, "accept->cure": -6, default: -10 },

    caseHead: (c) => ({ title: c.voterName, id: "Ballot " + c.id, sub: c.blurb }),

    caseBody: function (c) {
      const envSeed = c.signatureStatus === "missing" ? null : (c.envelopeSeed || c.sigSeed);
      const envOpts = { jitter: c.signatureStatus === "match" ? 1 : 0.4 };
      const timelyClass = c.timely ? "ok" : "bad";
      const timelyText = c.timely ? "Within deadline" : "AFTER deadline";
      return `
        <div class="envelope">
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-k">Received</span><span class="meta-v">${c.received}</span></div>
            <div class="meta-item"><span class="meta-k">Postmark</span><span class="meta-v">${c.postmark}</span></div>
            <div class="meta-item"><span class="meta-k">Receipt deadline</span><span class="meta-v">${BALLOT_DEADLINE()}</span></div>
            <div class="meta-item"><span class="meta-k">Timeliness</span><span class="meta-v flag ${timelyClass}">${timelyText}</span></div>
          </div>
          ${c.timelyNote ? `<p class="muted" style="margin:-.4rem 0 .6rem;font-size:.85rem">${c.timelyNote}</p>` : ""}
          <div class="sig-compare">
            ${sigBox("Signature on file", c.sigSeed, { jitter: 0 })}
            ${sigBox("Signature on envelope", envSeed, envOpts)}
          </div>
        </div>`;
    },

    correctAction: function (c) {
      if (!c.timely) return "reject";
      if (c.signatureStatus === "missing") return "cure";
      if (c.signatureStatus === "mismatch") return "cure";
      return "accept";
    },

    isCritical: function (ctx) {
      // Disenfranchising a valid/curable voter, or advancing an invalid ballot.
      return ((ctx.correct === "cure" || ctx.correct === "accept") && ctx.chosen === "reject") ||
             (ctx.correct === "reject" && ctx.chosen === "accept");
    },

    feedback: function (c, ctx) {
      let verdict, detail, cite;
      if (!c.timely) {
        if (c.signatureStatus !== "match") {
          detail = "This envelope had a signature defect, but it also arrived after the deadline. Timeliness controls: there is no cure for a late ballot, so it cannot be counted. Reject and log the receipt date — do not waste a cure notice on a ballot that can never count.";
        } else {
          detail = "The signature was fine, but the ballot arrived after the deadline with no qualifying postmark. There is no cure for lateness. Reject and record the receipt date and postmark.";
        }
        cite = { tag: "Receipt deadline", body: "Mail ballots must be received by " + BALLOT_DEADLINE() + ". Late ballots are not curable.", law: "vbm_deadline" };
      } else if (c.signatureStatus === "missing") {
        detail = "The affidavit envelope is unsigned. A missing signature is curable — notify the voter and give them until the cure deadline to sign. Send a cure notice; do not reject and do not open the ballot yet.";
        cite = { tag: "Notice & cure", body: "Voter may cure a missing signature through " + CURE_DEADLINE() + ".", law: "vbm_cure" };
      } else if (c.signatureStatus === "mismatch") {
        detail = "The envelope signature shows a genuine discrepancy. You are not a forensic examiner, and the remedy is not rejection — it is notice. Send a cure notice so the voter can verify identity by the cure deadline.";
        cite = { tag: "Notice & cure", body: "A signature discrepancy is curable through " + CURE_DEADLINE() + ". Reject only if uncured.", law: "vbm_cure" };
      } else {
        detail = "Signed, signature reasonably corresponds to the one on file, received on time. Ordinary variation is expected — you confirm the same hand, not a perfect copy. Accept for counting.";
        cite = { tag: "Verified", body: "Signature corresponds; received by " + BALLOT_DEADLINE() + ".", law: "vbm_cure" };
      }
      if (ctx.ok) verdict = "Defensible decision.";
      else if ((ctx.correct === "cure" || ctx.correct === "accept") && ctx.chosen === "reject") verdict = "You disenfranchised a voter who had a remedy.";
      else if (ctx.correct === "reject" && ctx.chosen === "accept") verdict = "You moved an invalid ballot toward counting.";
      else if (ctx.correct === "accept" && ctx.chosen === "cure") verdict = "Unnecessary cure notice — this ballot was already valid.";
      else verdict = "Not the defensible action here.";
      return { verdict, detail, cite };
    },

    tallies: function (results) {
      const dis = results.filter((r) => (r.correct === "cure" || r.correct === "accept") && r.chosen === "reject").length;
      const inv = results.filter((r) => r.correct === "reject" && r.chosen === "accept").length;
      return [
        { num: dis, lbl: "Voters disenfranchised", cls: dis ? "bad" : "" },
        { num: inv, lbl: "Invalid ballots advanced", cls: inv ? "bad" : "" },
      ];
    },

    lessons: [
      "<strong>A defect is not a rejection.</strong> Missing or mismatched signatures trigger notice and a cure window — never a quiet rejection.",
      "<strong>Lateness is the one thing you cannot cure.</strong> When timeliness fails, that defect controls.",
      "<strong>You confirm the same hand, not a perfect copy.</strong> Ordinary variation is normal; treat every voter's signature the same way.",
      "<strong>The record is the job.</strong> Each decision rests on a stated rule and a logged date.",
    ],
  };

  EG.register(EG.makeAdjudication(cfg));
})();
