/* test/screenshots.mjs — render key screens (and key motion moments) to PNGs.
 *
 *   npm install playwright --no-save
 *   node test/screenshots.mjs            # writes test/shots/*.png (gitignored)
 *
 * Clean shots wait for entrance animations to settle; "motion" shots are taken
 * mid-animation on purpose (shake, floating trust delta, stamp thud, toast,
 * confetti). Career is played perfectly so the finale earns its celebration.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, serveApp, launch, answer, careerStep, scrollTo } from "./lib/drive.mjs";

const SHOTS = join(ROOT, "test", "shots");
mkdirSync(SHOTS, { recursive: true });

const app = await serveApp();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 980, height: 1100 }, deviceScaleFactor: 2 });
const wait = (ms) => page.waitForTimeout(ms);
const settle = () => wait(1200);
const shot = async (name, opts) => {
  await page.screenshot({ path: join(SHOTS, name + ".png"), fullPage: !(opts && opts.viewport) });
  console.log("  saved", name + ".png");
};
const clickSel = (s) => page.evaluate((s) => document.querySelector(s).click(), s);

await page.goto(app.base, { waitUntil: "networkidle" });
await page.waitForSelector(".dept-card");
await settle(); await shot("01-hub");

// Practice: briefing → a good call → a bad call caught mid-shake.
await page.evaluate(() => window.EG.launch("provisional"));
await settle(); await shot("02-desk-briefing");
await clickSel("#startBtn"); await wait(300);
await answer(page); await settle(); await shot("03-ruling-correct");
await clickSel("#nextBtn"); await wait(400);
await answer(page, { wrong: true }); await wait(170);
await shot("04-ruling-wrong-motion", { viewport: true });

// A perfect practice batch → CERTIFIABLE stamp + confetti.
await page.evaluate(() => window.EG.launch("results"));
await clickSel("#startBtn");
for (let i = 0; i < 40; i++) {
  if (await page.$(".aar-score")) break;
  if (await page.$("#decisions .btn:not([disabled])")) { await answer(page); continue; }
  await clickSel("#nextBtn");
}
await wait(1600); await shot("05-aar-certifiable", { viewport: true });

// Career: intro, the in-tray with its journey rail, a consulted ticket, a stamped ruling.
await page.evaluate(() => window.EG.hub());
await wait(200); await clickSel("#careerStartBtn");
await settle(); await shot("06-career-intro");
await clickSel("#goBtn"); await settle(); await shot("07-career-inbox");
await clickSel(".inbox .ticket"); await wait(300);
await clickSel("#consultBtn"); await settle(); await shot("08-ticket-consult");
await answer(page); await scrollTo(page, ".ticket-fb"); await wait(450);
await shot("09-stamp-thud", { viewport: true });

// Play the rest perfectly, catching the streak toast, the praise event, and the finale.
let decisions = 1, toastShot = false, praiseShot = false;
for (let guard = 0; guard < 400; guard++) {
  if (!praiseShot && (await page.$(".escalation.good"))) { await settle(); await shot("11-praise-escalation"); praiseShot = true; }
  const did = await careerStep(page);
  if (did === "decide") {
    decisions++;
    if (decisions === 5 && !toastShot) { await wait(450); await shot("10-streak-toast", { viewport: true }); toastShot = true; }
  }
  if (did === "finale" || did === "stuck") break;
}
await page.waitForSelector(".certificate");
await wait(1500); await shot("12-finale-distinguished", { viewport: true });

await browser.close();
app.close();
console.log("\nScreenshots written to test/shots/");
