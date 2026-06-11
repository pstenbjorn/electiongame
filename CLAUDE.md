# CLAUDE.md — Election Administrator Trainer

Project memory for future sessions. Read this first to recall what exists, how
it's built, and what was decided.

## What this is

A browser-based, **no-build** management simulation that trains **new election
administrators** on the procedural craft of running an election. The player is
the **Election Director** of a configurable jurisdiction (default "Clearwater
County") and makes defensible, documented decisions. Scored on **integrity of
the process — never on who wins**. Nonpartisan by design (candidates/parties are
abstract).

Origin: started as a "lark" brainstorm, then built a vote-by-mail vertical slice,
then expanded to eight departments, then added legal citations + a jurisdiction
config.

## Run it

No dependencies, no build step.
```bash
python3 -m http.server 8000   # then http://localhost:8000  (config read live from JSON)
# or open index.html directly  (uses generated config.js fallback; file:// blocks JSON fetch)
```

## Architecture (one paragraph)

`engine.js` exposes `EG.makeAdjudication(cfg)`, which turns a **data + rules**
config into a full playable module: intro → case loop → per-decision feedback
with a "Legal basis" citation block → after-action review scored on a Public
Trust meter. Each `mod_*.js` defines its cases, the legal `decisions`, a
`correctAction(c)` rules function, `caseBody(c)` renderer, `feedback(c, ctx)`,
a `penalties` matrix, `tallies`, `lessons`, and a `cfg.law` citation key.
Modules **self-register** via `EG.register(...)` in the order their `<script>`
tags appear in `index.html` — that order is the hub order. `app.js` boots:
`EG.loadConfig()` → `EG.applyBranding()` → `EG.hub()`.

Every module shares one shape: **review a case → choose a defensible action →
get scored**. The two cardinal errors (disenfranchising an eligible voter;
advancing an invalid ballot/candidate) carry the heaviest penalties and are
tracked as `critical` in the after-action review.

## Files

| File | Role |
|------|------|
| `index.html` | Shell, top bar (Public Trust meter), footer, **script order = hub order** |
| `styles.css` | "paper + navy" civic theme; hub cards, case file, legal-basis, tables |
| `engine.js` | Framework: hub, nav, scoring, after-action, config/`tmpl`/citations, `makeAdjudication` |
| `signature.js` | Deterministic seeded SVG signature generator (`SignatureArt.svg(seed, opts)`) |
| `jurisdiction.config.json` | **Canonical config** — branding, parameters, citations library (edit this) |
| `config.js` | GENERATED `file://` fallback of the config (`node build-config.js`) |
| `build-config.js` | Regenerates `config.js` from the JSON |
| `app.js` | Bootstrap |
| `mod_petition.js` | 1. Candidate Qualification & Petition Validation (place / cure / disqualify) |
| `mod_finance.js` | 2. Campaign Finance (accept / amend / fine — formulaic fines) |
| `mod_siting.js` | 3. Polling Place & Early-Vote Siting (approve / accommodations / reject) |
| `mod_ballot.js` | 4. Ballot Design & L&A Testing (approve / return — seeded miscount) |
| `mod_registration.js` | 5. Voter Registration & List Maintenance (keep / notice / cancel) |
| `mod_vbm.js` | 6. Vote-by-Mail Processing (accept / cure / reject) |
| `mod_provisional.js` | 7. Provisional Ballot Adjudication (full / partial / reject) |
| `mod_results.js` | 8. Results Reporting & Canvass (certify / investigate — reconciliation) |

## Jurisdiction config & legal citations

`jurisdiction.config.json` is the single source of customization:
- **`jurisdiction`** — county/state/office/director/seal → flow into chrome, intros,
  feedback via `{county}`, `{state}`, `{stateAbbr}`, `{office}`, `{director}`,
  `{seal}`, `{navigatorName}`, `{navigatorUrl}`, `{regWait}` tokens. The engine's
  `EG.tmpl(str)` substitutes these into **all rendered strings** (incl. case data),
  so county names in cases are tokenized (`{county}`) and retarget cleanly.
- **`parameters`** — `vbm.ballotDeadline`/`cureDeadline`, `finance.perDay`/`cap`/
  `currency`, `registration.confirmationWaitText`. Modules read these via
  `EG.jx("path", default)` at render time (NOT at module load — config loads async).
- **`citations`** — keyed library (12 keys). Each has `authorities[]` (level
  Federal/State, cite, note, url, optional `configurable: true`) and a
  `navigatorTopic`. Engine renders a **Legal basis** block under feedback.
  - Federal authorities are **real and linked to Cornell LII**: NVRA 52 U.S.C.
    § 20507; HAVA §§ 21081/21082/21083; ADA Title II 42 U.S.C. § 12132; VAEHA
    52 U.S.C. § 20102; VRA §§ 203/208 (10503/10508); UOCAVA 52 U.S.C. § 20302;
    records retention 52 U.S.C. § 20701; FECA 52 U.S.C. § 30104.
  - State authorities are **`configurable` placeholders** linking to the
    **Election Law Navigator** (https://electionlawnavigator.org/ — Election Law
    Program, NCSC & William & Mary; 30k+ docs, 100+ topics) by topic.

Module → citation key map (`cfg.law`, overridable per `cite` with `law:`):
petition→`ballot_access` (eligibility cite→`candidate_eligibility`),
finance→`campaign_finance`, siting→`siting_access`, ballot→`ballot_la`,
registration→`reg_list_maintenance` (cancel cite→`reg_removal`),
vbm→per-cite `vbm_cure`/`vbm_deadline`, provisional→`provisional`,
results→`canvass`. (`language_access` exists in the library, not yet wired.)

**After editing the JSON:** served over HTTP it's live; for `file://` run
`node build-config.js` to regenerate `config.js`. `build-config.js` guarantees
parity (config.js = `window.JURISDICTION_DEFAULT = <the JSON>`).

## Key design decisions

- **Score defensibility, never outcomes.** Every action implicitly asks "could
  you document why?" Grades: Certifiable / Needs review / Contestable.
- **One engine, many modules.** All 8 fit the "adjudicate a case" shape; this
  keeps quality consistent and authoring cheap (data + rules only).
- **Federal cites pre-filled, state cites left blank.** Federal law is uniform;
  state law is what each office localizes. Could flip to all-blank if desired.
- **Cases model common U.S. principles**, not any one state's statutes — localize
  via config. Training sim, NOT legal advice (caveat in README + PR).
- **Persistence:** best grade per module in `localStorage` key
  `clearwater_progress_v1`.

## Testing approach

- Logic harness (stub DOM, no deps): loads all modules, runs `correctAction`,
  `caseBody`, `feedback` for every case × decision; checks distributions, dup IDs.
- Integration: `npm install jsdom --no-save` (NOT committed), drive real clicks
  through every module to the after-action screen; assert legal-basis renders,
  federal links present, branding applies, retarget has no `{token}` leakage.
- Always remove `node_modules`/`package*.json` before committing.

## Git / workflow state

- Dev branch: `claude/gracious-newton-s3sizd`. `main` was created at the initial
  commit (`8b7ec9a`) so a PR had a base.
- **PR #1** opened: feature → main (eight departments + citations + config).
- Push is via the git proxy (the GitHub MCP `push_files`/contents API returns 403
  for this repo; `git push -u origin <branch>` works).
- Model identity must NOT appear in commits/PRs/code (chat only).

## Possible next functionality (user will brainstorm)

- **Election Day incident command** — real-time triage capstone (machine down,
  long lines, provisional dispute) under limited staff.
- **Risk-limiting audit (RLA)** — probability mini-game triggered by close margins.
- **Deadline-calendar wrapper** sequencing the 8 departments into one cycle.
- Cross-cutting systems: poll-worker recruitment/training, public-records (FOIA)
  requests, cyber/physical security, budget/grants.
- Wire `language_access` (VRA §203) into the ballot module's bilingual check.
- A worked example config for a specific state (fill in the state citations).
- Difficulty tuning / more gray-area judgment cases (pending user smoke tests).
