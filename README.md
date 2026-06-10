# Clearwater County — Election Administrator Trainer

A browser-based management simulation that trains **new election administrators**
on the procedural craft of running an election. You play the **Election Director**
of a mid-sized fictional jurisdiction and make defensible, well-documented
decisions across the whole election cycle.

**Nonpartisan by design.** Candidates and parties are abstract; the game is about
*administering the process*, never about who wins.

## The office hub — eight departments

The app opens on an **office overview**: eight departments, each a self-contained
batch of real decisions. Work them in any order; your best grade per department is
saved locally so you can track progress over time.

| # | Department | The judgment it trains |
|---|------------|------------------------|
| 1 | **Candidate Qualification & Petition Validation** | Validate petitions (raw signatures ≠ valid signatures); place, cure, or disqualify |
| 2 | **Campaign Finance Reporting** | Audit filings; amend substantive errors, levy *formulaic* late fines with due process |
| 3 | **Polling Place & Early-Vote Siting** | Accessibility is non-negotiable; capacity is access too; remediate vs. reject |
| 4 | **Ballot Design & L&A Testing** | Proofread layouts and reconcile test decks — catch the seeded miscount *before* the election |
| 5 | **Voter Registration & List Maintenance** | Update, notice, or cancel — never purge on a flag alone, never for non-voting |
| 6 | **Vote-by-Mail Processing** | Signature verification and the notice-and-cure process |
| 7 | **Provisional Ballot Adjudication** | Apply reason codes: count in full, count eligible contests, or reject |
| 8 | **Results Reporting & Canvass** | Reconcile ballots against check-ins; certify only what balances |

Every department shares one shape: **review a case → choose a defensible action →
get scored on integrity, never on outcome.** Each decision comes back with a verdict,
a plain-language explanation, and a citation-style rule. A running **Public Trust**
meter rewards defensibility and punishes the two cardinal errors — disenfranchising
an eligible voter and advancing an invalid one — and each batch ends in an
**after-action review** with tallies and the lessons it trains.

## Run it

No build step, no dependencies. Either:

```bash
# Option A: just open the file
xdg-open index.html        # Linux  (use `open` on macOS)

# Option B: serve it (recommended — avoids file:// quirks)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project layout

| File | Role |
|------|------|
| `index.html` | App shell, top bar (Public Trust meter), footer, script order |
| `styles.css` | Civic "paper + navy" visual theme |
| `engine.js` | Shared framework: hub, navigation, scoring, after-action, `makeAdjudication` |
| `signature.js` | Deterministic seeded SVG signature generator |
| `app.js` | Bootstrap — wires the brand link and opens the hub |
| `mod_*.js` | One file per department (data + rules), self-registering |

### Architecture in one paragraph

`engine.js` exposes `EG.makeAdjudication(cfg)`, which turns a **data + rules**
config into a full playable module (intro → case loop → feedback → after-action).
Each `mod_*.js` file defines its cases, the legal `decisions`, a `correctAction(c)`
rules function, a `caseBody(c)` renderer, `feedback(c, ctx)`, a `penalties` matrix,
and the `lessons`. Modules self-register via `EG.register(...)` in the order their
`<script>` tags appear in `index.html` — that order sets the hub order.

### Adding a case

Append an object to the `cases` array in the relevant `mod_*.js`. Example
(vote-by-mail):

```js
{
  id: "VBM-1052",
  voterName: "Jordan A. Example",
  sigSeed: "jordan-example-1234",   // signature on file
  envelopeSeed: "different-2222",   // omit for a matching signature
  signatureStatus: "mismatch",      // "match" | "mismatch" | "missing"
  received: "Nov 4", postmark: "Nov 2",
  timely: true,                     // false => genuinely late (no cure)
  blurb: "Short framing shown to the player.",
}
```

The correct action is **derived from the facts** by each module's `correctAction`,
so authored cases stay consistent with the stated rules. No engine changes needed.

### Adding a whole module

Copy any `mod_*.js`, change the `cfg` (id, label, intro, rules, decisions,
`correctAction`, `caseBody`, `feedback`, `penalties`, `lessons`), and add a
`<script>` tag in `index.html`. It appears on the hub automatically.

## Design principles

- **Score defensibility, never outcomes.** The question behind every action is
  "could you document why you did this?" — never who won.
- **The two cardinal errors drive scoring.** Disenfranchising an eligible voter and
  advancing an invalid ballot/candidate carry the heaviest penalties and are tracked
  as "critical" in the after-action review.
- **Seeded curveballs.** Each batch plants the traps real offices get burned by — a
  defect-plus-lateness ballot, a fat-but-invalid petition, a one-ballot L&A miscount,
  a tempting non-voter "purge."
- **Nonpartisan throughout.** The focus is neutral administration of process.

## Possible next steps

- **Election Day incident command** — a real-time triage capstone (machine down, long
  lines, a provisional dispute) under limited staff.
- **Risk-limiting audit (RLA)** — a probability mini-game triggered by close margins.
- A shared **deadline calendar** wrapper that sequences the departments into one cycle,
  plus cross-cutting systems (poll-worker training, public-records requests,
  cyber/physical security, budget/grants).
