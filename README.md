# Clearwater County — Election Administrator Trainer

A browser-based management simulation that trains **new election administrators**
on the procedural craft of running an election. You play the **Election Director**
of a mid-sized fictional jurisdiction and make defensible, well-documented
decisions under a statutory deadline calendar.

**Nonpartisan by design.** Candidates and parties are abstract; the game is about
*administering the process*, never about who wins.

## What's here now — the vertical slice

The first playable module is **Vote-by-Mail Processing → Signature Verification &
the Cure Process.** You work through a batch of returned affidavit envelopes and
decide, for each one, whether to:

- **Accept & count** — signature verified, ballot timely;
- **Send a cure notice** — a *curable* defect (missing or mismatched signature);
- **Reject** — a defect with no available remedy (a genuinely late ballot).

Signatures are rendered as comparable SVG strokes, so matching "on file" against
"on envelope" is a real (if light) skill test. After the batch you get an
**after-action review** scored on *defensibility* — not on outcomes — plus the
rule and a plain-language citation behind every decision.

### The core idea it teaches

> A defect is not a rejection. Missing or mismatched signatures trigger **notice
> and a cure window** — never a quiet rejection. Lateness is the one defect you
> cannot cure. Every decision rests on a stated rule and a logged date.

## Run it

No build step, no dependencies. Either:

```bash
# Option A: just open the file
open index.html            # macOS  (use xdg-open on Linux)

# Option B: serve it (recommended)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project layout

| File | Role |
|------|------|
| `index.html` | App shell, top bar (Public Trust meter), footer |
| `styles.css` | Civic "paper + navy" visual theme |
| `scenarios.js` | **Data-driven cases** — author new envelopes here, no code changes |
| `signature.js` | Deterministic SVG signature generator (seeded) |
| `app.js` | Game engine: rules logic, scoring, views |

### Adding a case

Append an object to `window.SCENARIO.cases` in `scenarios.js`:

```js
{
  id: "VBM-1052",
  voterName: "Jordan A. Example",
  sigSeed: "jordan-example-1234",   // signature on file
  envelopeSeed: "different-2222",   // omit for a matching signature
  signatureStatus: "mismatch",      // "match" | "mismatch" | "missing"
  received: "Nov 4",
  postmark: "Nov 2",
  timely: true,                     // false => genuinely late (no cure)
  blurb: "Short framing shown to the player.",
}
```

The correct action is **derived from the facts** by the rules engine in
`app.js` (`correctAction`), so authored cases stay consistent with the rules.

## Roadmap — the full election cycle

Each module lays on a shared **deadline calendar** and a cross-cutting
**chain-of-custody / reconciliation** spine. Planned modules:

1. ✅ **Vote-by-mail processing** — signature verification & cure *(this slice)*
2. **Provisional ballot adjudication** — case queue, reason codes, count / partial / reject
3. **Candidate qualification & petition validation** — signatures, fees, eligibility, cure periods
4. **Ballot design & L&A testing** — layout rules + logic-and-accuracy test that catches a seeded miscount
5. **Polling place & early-vote siting** — ADA access, capacity, equitable distribution
6. **Campaign finance** — audit filings, statutory fines with due process
7. **Voter registration notices** — list maintenance within legal windows
8. **Election Day incident command** — real-time triage with limited staff *(capstone)*
9. **Results reporting, canvass & RLA audit** — reconcile, post unofficial, certify

Cross-cutting systems to weave through all of the above: poll-worker recruitment
& training, public-records requests, cyber/physical security, and budget/grant
management.

## Design principles

- **The deadline calendar is the engine.** Missing or mis-ordering tasks is the
  primary failure mode — just like the real job.
- **Score defensibility, never outcomes.** The question behind every action is
  "could you document why you did this?"
- **Seeded curveballs.** Each playthrough plants a few problems to catch.
- **Nonpartisan throughout.** The focus is neutral administration of process.
