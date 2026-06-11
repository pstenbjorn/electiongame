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

## Two ways to play

The hub opens with two entry points:

- **Career mode** — run one full election cycle, candidate filing through
  Certification Day, across all eight desks on a calendar. **Public Trust carries
  the whole way** (start 85). Each day is an **in-tray of tickets** worked under a
  limited **staff-hours** budget — *"Consult the code"* spends an hour to reveal
  the governing law *before* you rule, so you triage which calls you're unsure of.
  Slip and you draw **escalations** (a lawsuit that costs you staff hours, an
  emergency board review); string defensible rulings together for a **streak** and
  a CERTIFIED stamp. The cycle ends on **Certification Day** with a credential —
  *Distinguished → Certified → Provisional → Decertified* — and badges. Best
  result is saved.
- **Practice by department** — drill any single desk as a full batch with its own
  after-action review (trust resets each time). Good for focused study.

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
| `engine.js` | Shared framework: hub, navigation, scoring, after-action, config/citations, `makeAdjudication` |
| `signature.js` | Deterministic seeded SVG signature generator |
| `jurisdiction.config.json` | **Jurisdiction config** — branding, parameters, and the legal-citations library (edit this) |
| `config.js` | Generated `file://` fallback copy of the config (`node build-config.js`) |
| `build-config.js` | Regenerates `config.js` from the JSON |
| `app.js` | Bootstrap — loads config, applies branding, opens the hub |
| `mod_*.js` | One file per department (data + rules), self-registering |

## Customizing for a jurisdiction

Everything jurisdiction-specific lives in **`jurisdiction.config.json`** — which
ships configured for the **Commonwealth of Virginia** (Arlington County) with
real Code of Virginia (Title 24.2) citations. A blank, any-state starting
template is in **`examples/jurisdiction.generic.json`**.

- **`jurisdiction`** — county/state names, office and director titles, the seal glyph. These flow into the header, hub, intros, and feedback via `{county}`, `{state}`, `{director}`, etc. tokens.
- **`parameters`** — the numbers and dates the modules display: mail-ballot receipt & cure deadlines; the campaign-finance penalty model (`model: "perDay"` with `perDay`/`cap`, or `model: "flat"` with `firstOffense`/`repeatOffense` — Virginia uses flat, § 24.2-953.2); the registration confirmation-wait text.
- **`citations`** — the legal-authorities library keyed by topic (see below).

Two ways the config is loaded:

1. **Served over HTTP** (`python3 -m http.server`): the JSON is fetched live, so edits take effect on refresh — no rebuild.
2. **Opened as a file (`file://`)**: browsers block `fetch()` of local JSON, so the app falls back to the embedded copy in `config.js`. After editing the JSON, regenerate it:

   ```bash
   node build-config.js
   ```

To retarget to another state: start from `examples/jurisdiction.generic.json`, edit the `jurisdiction` block, set `parameters` (incl. the finance penalty model), and fill in the state `citations`. Note that making citations *valid* can mean tuning a module's mechanics to match the law (e.g., Virginia's flat fine vs. a per-day schedule, or its 125-signature local petition threshold).

## Legal references

Every decision's feedback ends with a **Legal basis** block drawn from the
`citations` library. Each topic lists its governing **authorities**, tagged
`Federal` or `State`:

- **Federal authorities are pre-filled and linked** to Cornell's Legal
  Information Institute — e.g. NVRA list-maintenance (52 U.S.C. § 20507), HAVA
  provisional ballots (52 U.S.C. § 21082), ADA Title II (42 U.S.C. § 12132), the
  Voting Accessibility for the Elderly and Handicapped Act (52 U.S.C. § 20102),
  VRA § 203 language access (52 U.S.C. § 10503), UOCAVA (52 U.S.C. § 20302), and
  records retention (52 U.S.C. § 20701).
- **State authorities** are filled in for Virginia in the default config (Title
  24.2, with official `law.lis.virginia.gov` links). In the generic template they
  are `configurable` placeholders — signature-cure windows, wrong-precinct
  counting, petition thresholds, the fine schedule, canvass deadlines, etc. vary
  by state, so each is a fill-in-the-blank pointing you to the right citation.

The resource for finding those state provisions is the **[Election Law
Navigator](https://electionlawnavigator.org/)** (the Election Law Program —
National Center for State Courts & William & Mary Law School): 30,000+ statutes,
regulations, and advisory opinions across all 50 states, organized by 100+ topic
tags. Each Legal-basis block links to it with the relevant topic, so filling in a
state citation is: open the Navigator → pick your state and the named topic →
copy the section into the config.

> Note: the federal citations are accurate authorities, but this is a **training
> simulation, not legal advice**. Confirm specifics against current law for your
> jurisdiction before relying on them operationally.

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
  background: "Optional 1–2 sentences of scenario context (shown above the facts).",
  stakes: "Optional 'At stake' line (falls back to the module-level cfg.stakes).",
}
```

Each module also carries an intro **`cfg.primer`** ({ what, matters, terms }) — the
"Desk briefing" — and a standing **`cfg.question`** prompt shown on every case, so
new cases inherit consistent framing without extra per-case text.

The correct action is **derived from the facts** by each module's `correctAction`,
so authored cases stay consistent with the stated rules. No engine changes needed.

### Adding a whole module

Copy any `mod_*.js`, change the `cfg` (id, label, intro, rules, decisions,
`correctAction`, `caseBody`, `feedback`, `penalties`, `lessons`), and add a
`<script>` tag in `index.html`. It appears on the hub automatically. Set
`cfg.law` to a citation key from the config (or add `law` to an individual
`cite` to override per-decision) so the Legal-basis block resolves.

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
