# CLAUDE.md — Election Administrator Trainer

Project memory for future sessions. Read this first to recall what exists, how
it's built, and what was decided.

## What this is

A browser-based, **no-build** management simulation that trains **new election
administrators** on the procedural craft of running an election. The player is
the **Election Director / General Registrar** of a configurable jurisdiction and
makes defensible, documented decisions. Scored on **integrity of the process —
never on who wins**. Nonpartisan by design (candidates/parties are abstract).

**Default config is the Commonwealth of Virginia** (Arlington County) with real
Code of Virginia (Title 24.2) citations. A blank, any-state template (federal
cites filled, state cites left as `configurable` placeholders) lives at
`examples/jurisdiction.generic.json`.

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

**Two play modes.** The hub offers (1) **Career mode** (`career.js`) and (2)
**Practice by department** (the original per-module batches). Career wraps the
eight desks into one election on a `TIMELINE`: persistent Public Trust (starts
85), an **inbox** of tickets per stage worked under a **staff-hours** budget
("Consult the code" spends an hour to reveal the legal basis before ruling),
**escalation** events when trust dips (lawsuit cuts next-day hours; board review;
streak praise), a CERTIFIED/CONTESTED **stamp** + streak juice per ruling, and a
**Certification Day finale** awarding a credential (Distinguished → Certified →
Provisional → Decertified) plus badges. Career reuses each module's primitives
via `EG.moduleById(id).cfg`; practice mode is untouched. Best result saved to
`localStorage` under `__career__`.

**Per-module content scaffold** (added for clarity): `cfg.primer` ({what,
matters, terms[]}) renders a "Desk briefing" on the intro; `cfg.question` is the
standing determination prompt shown each case; `cfg.stakes` (or per-case
`c.stakes`) renders an "At stake" line; per-case `c.background` adds scenario
context above the facts. The engine renders these around each `caseBody`.

## Files

| File | Role |
|------|------|
| `index.html` | Shell, top bar (Public Trust meter), footer, **script order = hub order** |
| `styles.css` | "paper + navy" civic theme; hub cards, case file, legal-basis, tables |
| `engine.js` | Framework: hub, nav, scoring, after-action, config/`tmpl`/citations, `makeAdjudication` |
| `signature.js` | Deterministic seeded SVG signature generator (`SignatureArt.svg(seed, opts)`) |
| `jurisdiction.config.json` | **Canonical config** — Virginia by default; branding, parameters, citations library (edit this) |
| `examples/jurisdiction.generic.json` | Blank any-state template (federal cites filled, state cites placeholders) |
| `config.js` | GENERATED `file://` fallback of the config (`node build-config.js`) |
| `build-config.js` | Regenerates `config.js` from the JSON |
| `career.js` | **Career / Election-Cycle mode** — timeline, inbox+staff-hours, escalation, finale |
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
- **`parameters`** — `vbm.ballotDeadline`/`cureDeadline`; `finance` penalty model
  (`model: "perDay"` with `perDay`/`cap`, OR `model: "flat"` with `firstOffense`/
  `repeatOffense` — Virginia uses flat, § 24.2-953.2); `registration.confirmationWaitText`.
  Modules read these via `EG.jx("path", default)` at render time (NOT at module
  load — config loads async). Petition signature thresholds in `mod_petition.js`
  are set to VA values (125 local, 250 state senate; § 24.2-506).
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
- **Default config = Virginia (Title 24.2), with real state cites filled.** The
  generic any-state template (`examples/jurisdiction.generic.json`) keeps state
  cites as blank `configurable` placeholders; federal cites are always pre-filled.
- **Valid citations can require tuning mechanics.** Virginia's flat campaign-finance
  penalty (not per-day) drove the `finance.model` config option; localizing cites
  may mean adjusting a module's numbers (e.g., petition thresholds).
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

## Feedback log & agreed direction (2026 review)

User feedback after smoke-testing, and what was done / planned:
1. **VA citations** — DONE: default config retargeted to Virginia (Title 24.2),
   real state cites + law.lis links; `finance.model` flat penalty added.
2. **More structure** — DONE: `primer`/`question`/`stakes`/`background` scaffold
   across modules; results cases given per-case backgrounds.
3. **Look & feel** — DONE (baseline): "Visual refresh v2" layer in `styles.css`
   (letterhead seal, refined palette/typography, cards, buttons, primer/ask UI).
   User may iterate via **Claude Design**; integrate its output on top of v2.
4. **More game, less quiz** — DONE (career.js), all three chosen directions:
   - **Cycle / career mode** — `TIMELINE` of 8 stages → Certification Day finale,
     persistent trust (starts 85).
   - **Inbox + resource triage** — per-stage in-tray; staff-hours budget; "Consult
     the code" spends an hour to reveal the law before ruling.
   - **Escalation + progression** — trust<70 lawsuit (−1 hr next day), trust<55
     board review, streak≥8 praise (+4); streaks, CERTIFIED/CONTESTED stamp,
     finale credential + badges. (Consequence engine deliberately NOT built.)
   Possible polish next: per-ticket deadlines/timers; consequence engine (earlier
   calls resurfacing); difficulty tiers; sound. Visual still baseline v2 — Claude
   Design pass welcome.

Other backlog: Election Day incident-command capstone; RLA mini-game; wire
`language_access` (VRA §203) into ballot bilingual check; more gray-area cases;
worked configs for other states.
