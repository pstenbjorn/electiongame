/* scenarios.js
 * Data-driven cases for the Vote-by-Mail Processing module.
 *
 * Each case is intentionally authored so the CORRECT action is derivable from
 * the rules (see app.js -> correctAction). Trainers can add cases here without
 * touching code.
 *
 *   signatureStatus: "match" | "mismatch" | "missing"
 *     - match    -> envelope signature reasonably corresponds to the one on file
 *     - mismatch -> a real discrepancy a reasonable reviewer would flag
 *     - missing  -> voter never signed the affidavit envelope
 *   timely: true if the ballot was received within the legal deadline
 *           (postmark grace already taken into account in this field)
 *
 * Nonpartisan by design: no candidate or party appears anywhere.
 */
window.SCENARIO = {
  module: "Vote-by-Mail Processing",
  title: "Signature Verification & the Cure Process",
  electionDay: "Tue, Nov 5",
  ballotDeadline: "8:00 PM, Election Day (Nov 5)",
  cureDeadline: "5:00 PM, Nov 12 (7 days after Election Day)",

  intro: [
    "You are the Election Director of Clearwater County. Your team is processing the affidavit envelopes of returned mail ballots before they can be opened and counted.",
    "For each envelope you compare the signature against the voter's signature on file, confirm the ballot arrived on time, and decide how to handle it. Your goal is not speed — it is a defensible decision on every envelope.",
  ],

  rules: [
    { h: "Accept", t: "If the envelope is signed, the signature reasonably matches the one on file, and the ballot arrived by the deadline, accept it for counting." },
    { h: "Notice & Cure — not rejection", t: "A missing or mismatched signature does NOT mean reject. The voter has a right to be notified and given a chance to cure through the cure deadline. Send a cure notice." },
    { h: "Reject only when there is no remedy", t: "Reject when the ballot is genuinely untimely — received after the deadline with no qualifying postmark. There is no cure for lateness." },
    { h: "Document everything", t: "Every decision must rest on the stated rule and be logged. “Because it looked off” is not a record; “signature discrepancy, cure notice sent [date]” is." },
  ],

  // The teaching weights: disenfranchising a curable voter is the worst error;
  // counting an invalid ballot is a serious integrity error.
  cases: [
    {
      id: "VBM-1042",
      voterName: "Dana R. Whitfield",
      sigSeed: "dana-whitfield-7781",
      signatureStatus: "match",
      received: "Nov 3",
      postmark: "Oct 30",
      timely: true,
      blurb: "Returned by mail, arrived two days early.",
    },
    {
      id: "VBM-1043",
      voterName: "Marcus T. Adeyemi",
      sigSeed: "marcus-adeyemi-2210",
      signatureStatus: "missing",
      received: "Nov 4",
      postmark: "Nov 1",
      timely: true,
      blurb: "Affidavit signature line is blank — voter sealed and returned without signing.",
    },
    {
      id: "VBM-1044",
      voterName: "Helen Okonkwo-Price",
      sigSeed: "helen-okonkwo-9034",
      envelopeSeed: "imposter-stroke-5521",
      signatureStatus: "mismatch",
      received: "Nov 2",
      postmark: "Oct 29",
      timely: true,
      blurb: "Envelope signature differs noticeably in form from the signature on file.",
    },
    {
      id: "VBM-1045",
      voterName: "Theodore J. Bramwell",
      sigSeed: "theodore-bramwell-444",
      signatureStatus: "match",
      received: "Nov 8",
      postmark: "Nov 7",
      timely: false,
      blurb: "Dropped in the mail after Election Day; postmarked and received late.",
    },
    {
      id: "VBM-1046",
      voterName: "Priya N. Chandrasekaran",
      sigSeed: "priya-chandra-6612",
      signatureStatus: "match",
      received: "Nov 5",
      postmark: "Nov 4",
      timely: true,
      blurb: "Arrived at the office at 4:50 PM on Election Day.",
    },
    {
      id: "VBM-1047",
      voterName: "Walter Q. Henderson",
      sigSeed: "walter-henderson-318",
      envelopeSeed: "walter-henderson-318",
      signatureStatus: "match",
      received: "Nov 6",
      postmark: "Nov 4",
      timely: true,
      timelyNote: "Postmarked the day before Election Day and received within the postmark grace window.",
      blurb: "Received after Election Day, but postmarked on time — mind the postmark rule.",
    },
    {
      id: "VBM-1048",
      voterName: "Sofia L. Marchetti",
      sigSeed: "sofia-marchetti-7720",
      envelopeSeed: "different-hand-1190",
      signatureStatus: "mismatch",
      received: "Nov 7",
      postmark: "Nov 6",
      timely: false,
      blurb: "Both a signature discrepancy AND received after the deadline. Which defect controls?",
    },
    {
      id: "VBM-1049",
      voterName: "James E. Fairweather",
      sigSeed: "james-fairweather-505",
      signatureStatus: "missing",
      received: "Nov 11",
      postmark: "Nov 10",
      timely: false,
      blurb: "Unsigned affidavit, and it arrived well after the deadline.",
    },
    {
      id: "VBM-1050",
      voterName: "Aaliyah B. Thornton",
      sigSeed: "aaliyah-thornton-882",
      envelopeSeed: "aaliyah-thornton-882",
      signatureStatus: "match",
      received: "Nov 1",
      postmark: "Oct 28",
      timely: true,
      blurb: "Signature shows ordinary day-to-day variation, but the same hand.",
    },
    {
      id: "VBM-1051",
      voterName: "Gregory P. Vasquez",
      sigSeed: "gregory-vasquez-1357",
      envelopeSeed: "forged-vasquez-9988",
      signatureStatus: "mismatch",
      received: "Nov 4",
      postmark: "Nov 2",
      timely: true,
      blurb: "Signature on file and on the envelope are formed quite differently.",
    },
  ],
};
