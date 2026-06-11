/* test/smoke.mjs — one-command headless smoke test for the trainer.
 *
 *   npm install jsdom --no-save      # one-time per session (dev only; never committed)
 *   node test/smoke.mjs              # exits 0 on success, non-zero on any failure
 *
 * Loads the real index.html + all scripts into a headless DOM and:
 *   - runs a logic harness over every module (correctAction, caseBody, feedback)
 *   - drives a full practice playthrough of each desk to its after-action review
 *   - drives a full Career cycle to the Certification Day finale
 *   - checks branding + the legal-basis citation block render
 * No browser, no IDE, no manual clicking.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let JSDOM;
try { ({ JSDOM } = await import("jsdom")); }
catch {
  console.error("\n  This harness needs jsdom (dev only). Install it first:\n\n    npm install jsdom --no-save\n");
  process.exit(2);
}

// Script load order mirrors index.html.
const SCRIPTS = [
  "config.js", "signature.js", "engine.js",
  "mod_petition.js", "mod_finance.js", "mod_siting.js", "mod_ballot.js",
  "mod_registration.js", "mod_vbm.js", "mod_provisional.js", "mod_results.js",
  "career.js", "app.js",
];

let failures = 0;
const fail = (msg) => { failures++; console.log("  ✗ " + msg); };
const pass = (msg) => console.log("  ✓ " + msg);
const ok = (cond, msg) => (cond ? pass(msg) : fail(msg));

const dom = new JSDOM(readFileSync(join(ROOT, "index.html"), "utf8"), {
  runScripts: "outside-only", pretendToBeVisual: true,
});
const { window } = dom;
const { document } = window;
window.scrollTo = () => {};
for (const s of SCRIPTS) window.eval(readFileSync(join(ROOT, s), "utf8"));

const EG = window.EG;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const click = (el) => el && el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const tick = () => new Promise((r) => setTimeout(r, 0));

await tick(); // let app.js loadConfig().then(...) resolve

// ---------------------------------------------------------------- logic harness
console.log("\nLogic harness (cases × decisions):");
let totalCases = 0;
for (const mod of EG.modules) {
  const cfg = mod.cfg;
  const ids = new Set();
  let problems = 0;
  for (const c of cfg.cases) {
    totalCases++;
    if (ids.has(c.id)) { problems++; } ids.add(c.id);
    let act;
    try { act = cfg.correctAction(c); } catch { problems++; continue; }
    if (!cfg.decisions.some((d) => d.act === act)) problems++;
    try { cfg.caseBody(c); cfg.caseHead(c); } catch { problems++; }
    for (const d of cfg.decisions) {
      const ctx = { chosen: d.act, correct: act, ok: d.act === act };
      try { const fb = cfg.feedback(c, ctx); if (!fb.verdict || !fb.detail) problems++; }
      catch { problems++; }
    }
  }
  ok(problems === 0, `${mod.id.padEnd(13)} ${cfg.cases.length} cases, no dup IDs / throws`);
}

// ------------------------------------------------------------- practice mode
console.log("\nPractice mode (every desk → after-action review):");
for (const mod of EG.modules.slice()) {
  EG.launch(mod.id);
  if (!$("#startBtn")) { fail(`${mod.id}: no intro`); continue; }
  click($("#startBtn"));
  let guard = 0, advanced = true;
  while (advanced && guard++ < 80) {
    if ($("#decisions") && !$(".feedback")) { click($$("#decisions .btn")[0]); continue; }
    const next = $("#nextBtn");
    if (!next) { advanced = false; break; }
    const finish = /After-action/i.test(next.textContent);
    click(next);
    if (finish) break;
  }
  ok(!!$(".aar-score"), `${mod.id.padEnd(13)} reached after-action review`);
}

// ----------------------------------------------------------------- career mode
console.log("\nCareer mode (full election cycle → Certification Day):");
EG.hub();
ok(!!$("#careerStartBtn"), "hub shows the Career banner");
ok($$(".dept-card").length === 8, "hub shows 8 practice desks");
click($("#careerStartBtn"));
click($("#goBtn"));
let decisions = 0, stageWraps = 0, stamps = 0, escalations = 0, legalSeen = 0, guard = 0;
let lastStage = "", consultedThisStage = false;
while (guard++ < 800) {
  if ($(".certificate")) break;
  if ($("#backBtn")) { if ($(".stamp")) stamps++; if ($(".legal-basis")) legalSeen++; click($("#backBtn")); continue; }
  if ($("#decisions") && !$("#ticketFeedback .feedback")) {
    const sk = ($(".kicker") || {}).textContent || "";
    if (sk !== lastStage) { lastStage = sk; consultedThisStage = false; }
    const cb = $("#consultBtn");
    if (cb && !cb.disabled && !consultedThisStage) { click(cb); consultedThisStage = true; continue; }
    click($$("#decisions .btn")[0]); decisions++; continue;
  }
  if ($("#endDayBtn")) { click($("#endDayBtn")); continue; }
  if ($("#nextBtn")) { stageWraps++; if ($(".escalation")) escalations++; click($("#nextBtn")); continue; }
  const pending = $$(".ticket:not(.done)").filter((b) => !b.disabled);
  if (pending.length) { click(pending[0]); continue; }
  break;
}
ok(!!$(".cert-title"), "reached the Certification Day finale (credential awarded)");
ok(decisions === 27, `worked all 27 tickets (got ${decisions})`);
ok(stageWraps === 8, `closed out all 8 stages (got ${stageWraps})`);
ok(stamps > 0, `CERTIFIED/CONTESTED stamp rendered (${stamps}×)`);
ok(legalSeen > 0, `legal-basis block rendered on rulings (${legalSeen}×)`);
ok(!!$(".badges"), "finale shows the badges panel");

// ------------------------------------------------------------- config / citations
console.log("\nConfig & citations:");
EG.hub();
ok(!!(document.getElementById("brandTitle")?.textContent || "").trim(), "branding injected from jurisdiction config");
const m0 = EG.moduleById("vbm");
let citeHit = false;
EG.launch("vbm"); click($("#startBtn"));
if ($("#decisions")) { click($$("#decisions .btn")[0]); citeHit = !!$(".legal-basis"); }
ok(citeHit, "Legal-basis block renders under a ruling");

console.log(`\n${failures ? "✗ " + failures + " failure(s)" : "✓ ALL CHECKS PASSED"}  (${EG.modules.length} desks, ${totalCases} cases)\n`);
process.exit(failures ? 1 : 0);
