/* mod_siting.js — Polling Place & Early-Vote Location Siting. */
(function () {
  "use strict";

  // ada: "yes" (compliant) | "remediable" (fixable with temporary accommodations) | "no" (fundamentally inaccessible)
  // capacityAdequate: can the site handle the precinct's expected volume?
  const cases = [
    { id: "PP-01", site: "Riverside Community Center", kind: "Election Day polling place",
      ada: "yes", capacityAdequate: true, voters: 2200, capacityNote: "Large multipurpose hall; 14 booths fit comfortably.",
      note: "Step-free entrance, accessible parking and restrooms, room to spare for the precinct's volume." },
    { id: "PP-02", site: "Old St. Mark's Church (basement hall)", kind: "Election Day polling place",
      ada: "no", capacityAdequate: true, voters: 1800, capacityNote: "Hall is roomy enough.",
      note: "Voting hall is down a flight of stairs with no elevator and no feasible space for a ramp. A back accessible entrance does not exist." },
    { id: "PP-03", site: "Lincoln Elementary Gymnasium", kind: "Election Day polling place",
      ada: "remediable", capacityAdequate: true, voters: 2400, capacityNote: "Gym easily holds the booths.",
      note: "Main entrance has a single 4-inch lip and the accessible path needs signage; a portable ramp and temporary signs resolve it." },
    { id: "PP-04", site: "Maple Street Storefront", kind: "Election Day polling place",
      ada: "yes", capacityAdequate: false, voters: 2600, capacityNote: "Floor fits only 3 booths; lines would run hours for a 2,600-voter precinct.",
      note: "Fully accessible, but far too small for the precinct — undersized capacity means long lines, which is its own barrier to voting." },
    { id: "PP-05", site: "Eastgate Public Library", kind: "Early-vote location",
      ada: "yes", capacityAdequate: true, voters: 0, capacityNote: "Dedicated meeting room, accessible throughout; central and transit-served.",
      note: "Accessible, adequately sized, well located for early voting. Clean approval." },
    { id: "PP-06", site: "Station 9 Fire House", kind: "Election Day polling place",
      ada: "remediable", capacityAdequate: true, voters: 1500, capacityNote: "Apparatus bay clears the volume once vehicles are moved.",
      note: "One step at the entrance; the department has a portable ramp on site and will deploy it for the day." },
    { id: "PP-07", site: "Westside Senior Center", kind: "Election Day polling place",
      ada: "yes", capacityAdequate: true, voters: 1900, capacityNote: "Purpose-built accessible facility; ample booths.",
      note: "Accessible by design, adequate capacity, near a bus line. Straightforward." },
    { id: "PP-08", site: "Hilltop Private Office Suite", kind: "Early-vote location",
      ada: "no", capacityAdequate: true, voters: 0, capacityNote: "Square footage is fine.",
      note: "No accessible entrance or restroom, and the landlord will not permit modifications. Cannot be made compliant." },
    { id: "PP-09", site: "Greenfield Recreation Center", kind: "Election Day polling place",
      ada: "yes", capacityAdequate: false, voters: 3100, capacityNote: "Room holds 5 booths; a 3,100-voter precinct needs far more throughput.",
      note: "Beautifully accessible — but materially undersized for one of the county's busiest precincts." },
    { id: "PP-10", site: "Northpoint Mall Community Room", kind: "Early-vote location",
      ada: "remediable", capacityAdequate: true, voters: 0, capacityNote: "Spacious; accessible interior.",
      note: "Interior is accessible, but the nearest accessible parking lacks signage and a marked route to the entrance — temporary signage fixes it." },
  ];

  function correctAction(c) {
    if (!c.capacityAdequate) return "reject";       // too small = de facto barrier
    if (c.ada === "no") return "reject";            // inaccessible, not fixable
    if (c.ada === "remediable") return "accom";     // approve with temporary accommodations
    return "approve";
  }

  const cfg = {
    cases: cases,
    id: "siting",
    label: "Polling Place Siting",
    icon: "&#9873;", // flag / location
    title: "Polling Place & Early-Vote Siting",
    summary: "Evaluate proposed voting locations for accessibility and capacity; approve, remediate, or reject.",
    headline: "Recruiting & Approving Voting Locations",
    batchNoun: "sites",
    caseKicker: "Site",
    beginLabel: "Review locations",
    intro: [
      "Where people vote determines whether they can vote. Two non-negotiables drive every siting decision: the location must be accessible to voters with disabilities, and it must be big enough to serve its precinct without punishing lines.",
      "For each proposed site, weigh accessibility and capacity. A site that's inaccessible but fixable gets temporary accommodations; one that can't be made accessible — or is simply too small — gets rejected, and you keep recruiting.",
    ],
    rulesTitle: "How a site is judged",
    rules: [
      { h: "Approve", t: "Accessible as-is and large enough for the precinct's volume → approve the location." },
      { h: "Approve with accommodations", t: "Accessibility gap that a temporary fix resolves (portable ramp, accessible-parking signage, a marked route) → approve conditioned on those accommodations." },
      { h: "Reject", t: "Fundamentally inaccessible with no feasible remedy, OR too small to serve the precinct. Lines that run for hours are their own barrier to voting." },
      { h: "Accessibility is not optional", t: "You cannot trade it away for convenience or cost. If it can't be made accessible, it isn't a polling place." },
    ],
    decisions: [
      { act: "approve", tone: "good", label: "Approve as-is", sub: "Accessible &amp; adequate" },
      { act: "accom", tone: "warn", label: "Approve w/ accommodations", sub: "Fixable accessibility gap" },
      { act: "reject", tone: "bad", label: "Reject site", sub: "Unsuitable — keep recruiting" },
    ],
    actLabel: { approve: "approve as-is", accom: "approve with accommodations", reject: "reject site" },
    penalties: { correct: 4, "reject->approve": -16, "reject->accom": -14, "accom->approve": -14,
                 "approve->reject": -12, "accom->reject": -10, "approve->accom": -4, "reject->reject": 0, default: -10 },

    caseHead: (c) => ({ title: c.site, id: c.id, sub: c.kind }),

    caseBody: function (c) {
      const adaText = { yes: "Accessible as-is", remediable: "Fixable with accommodations", no: "Not accessible — no remedy" }[c.ada];
      const adaClass = c.ada === "yes" ? "ok" : c.ada === "remediable" ? "" : "bad";
      const capText = c.capacityAdequate ? "Adequate for the precinct" : "TOO SMALL for the volume";
      const capClass = c.capacityAdequate ? "ok" : "bad";
      return `
        <div class="envelope casefile">
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-k">Accessibility (ADA)</span><span class="meta-v flag ${adaClass}">${adaText}</span></div>
            <div class="meta-item"><span class="meta-k">Capacity</span><span class="meta-v flag ${capClass}">${capText}</span></div>
            ${c.voters ? `<div class="meta-item"><span class="meta-k">Precinct voters</span><span class="meta-v">${c.voters.toLocaleString()}</span></div>` : `<div class="meta-item"><span class="meta-k">Use</span><span class="meta-v">Early voting</span></div>`}
          </div>
          <div class="filenote"><span class="filenote-k">Capacity note</span><p>${c.capacityNote}</p></div>
          <p class="muted" style="margin:.6rem 0 0;font-size:.9rem">${c.note}</p>
        </div>`;
    },

    correctAction: correctAction,

    isCritical: (ctx) => (ctx.correct === "reject" && ctx.chosen !== "reject") || (ctx.correct === "accom" && ctx.chosen === "approve"),

    feedback: function (c, ctx) {
      let verdict, detail, cite;
      if (!c.capacityAdequate) {
        detail = "Accessible or not, this site is too small for the precinct it would serve. Undersized capacity means hours-long lines, and a line that long is itself a barrier that turns voters away. Reject it and keep recruiting a larger location.";
        cite = { tag: "Capacity", body: "A site must handle the precinct's volume; chronic lines are a de facto barrier to voting." };
      } else if (c.ada === "no") {
        detail = "There is no feasible way to make this location accessible to voters with disabilities, and accessibility is non-negotiable — you cannot trade it for cost or convenience. Reject the site.";
        cite = { tag: "Accessibility (ADA)", body: "A location that cannot be made accessible cannot serve as a voting site." };
      } else if (c.ada === "remediable") {
        detail = "The site works once a fixable accessibility gap is addressed — a portable ramp, accessible-parking signage, a marked accessible route. Approve it conditioned on those accommodations being in place on day one, and document the plan. Approving as-is would leave voters unable to enter; rejecting throws away a usable site.";
        cite = { tag: "Reasonable accommodations", body: "A remediable accessibility gap is resolved with temporary accommodations, documented and verified." };
      } else {
        detail = "Accessible as-is and large enough for the precinct's volume. Approve the location and lock it in.";
        cite = { tag: "Approved", body: "Accessible and adequately sized → approve." };
      }
      if (ctx.ok) verdict = "Defensible siting decision.";
      else if (ctx.correct === "reject" && ctx.chosen !== "reject") verdict = "You opened a site that can't properly serve voters.";
      else if (ctx.correct === "accom" && ctx.chosen === "approve") verdict = "You approved without the accommodations — voters would be left unable to enter.";
      else if (ctx.correct === "accom" && ctx.chosen === "reject") verdict = "You discarded a usable site that just needed a temporary fix.";
      else if (ctx.correct === "approve" && ctx.chosen === "reject") verdict = "You rejected a fully suitable location.";
      else verdict = "Not the strongest call here.";
      return { verdict, detail, cite };
    },

    tallies: function (results) {
      const bad = results.filter((r) => (r.correct === "reject" && r.chosen !== "reject") || (r.correct === "accom" && r.chosen === "approve")).length;
      const lost = results.filter((r) => (r.correct === "approve" || r.correct === "accom") && r.chosen === "reject").length;
      return [
        { num: bad, lbl: "Access/capacity failures", cls: bad ? "bad" : "" },
        { num: lost, lbl: "Usable sites discarded", cls: lost ? "" : "" },
      ];
    },

    lessons: [
      "<strong>Accessibility is non-negotiable.</strong> If a site can't be made accessible, it isn't a polling place — no cost or convenience outweighs it.",
      "<strong>Capacity is access, too.</strong> A site too small for its precinct produces lines that turn voters away.",
      "<strong>Remediable ≠ reject.</strong> A fixable gap earns a conditional approval with documented accommodations — don't throw away usable sites.",
      "<strong>Approve-with-accommodations means verify.</strong> The ramp and signage must actually be in place on Election Day, not just promised.",
    ],
  };

  EG.register(EG.makeAdjudication(cfg));
})();
