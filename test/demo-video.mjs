/* test/demo-video.mjs — record a ~45s paced demo of the game feel as WebM.
 *
 *   npm install playwright --no-save
 *   node test/demo-video.mjs            # writes test/shots/demo.webm (gitignored)
 *
 * Streams frames from Chromium's screencast and encodes them with ffmpeg at a
 * constant frame rate (Playwright's own recorder needs a version-matched ffmpeg;
 * this works with whatever ffmpeg is present — see findFfmpeg()).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, serveApp, launch, answer, careerStep, scrollTo, findFfmpeg } from "./lib/drive.mjs";

const FFMPEG = findFfmpeg();
if (!FFMPEG) { console.error("No ffmpeg found (set FFMPEG=/path/to/ffmpeg)."); process.exit(2); }
const OUT = join(ROOT, "test", "shots", "demo.webm");
mkdirSync(join(ROOT, "test", "shots"), { recursive: true });
const W = 1180, H = 780, FPS = 20;

const app = await serveApp();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const wait = (ms) => page.waitForTimeout(ms);
const clickSel = (s) => page.evaluate((s) => document.querySelector(s).click(), s);

// ---- recorder: keep the latest screencast frame, emit it at a fixed rate ----
const cdp = await page.context().newCDPSession(page);
let latest = null;
cdp.on("Page.screencastFrame", (f) => {
  latest = Buffer.from(f.data, "base64");
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
const ff = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y",
  "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "pipe:0", // minimal builds reject "-"
  "-c:v", "libvpx", "-b:v", "1800k", "-crf", "8", "-auto-alt-ref", "0",
  "-deadline", "good", "-cpu-used", "5", OUT], { stdio: ["pipe", "inherit", "inherit"] });
// Capture exit up front so an early ffmpeg failure can't leave us waiting forever.
let ffDead = false;
const ffDone = new Promise((resolve) => ff.on("close", (code) => { ffDead = true; resolve(code); }));
ff.stdin.on("error", () => {}); // EPIPE if ffmpeg dies; reported via its exit code
let ticker = null;
async function startRec() {
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, maxWidth: W, maxHeight: H });
  ticker = setInterval(() => { if (latest && !ffDead) ff.stdin.write(latest); }, 1000 / FPS);
}
async function stopRec() {
  clearInterval(ticker);
  await cdp.send("Page.stopScreencast").catch(() => {});
  if (!ffDead) ff.stdin.end();
  const code = await ffDone;
  if (code !== 0) { console.error(`ffmpeg exited with code ${code} — no video written.`); process.exitCode = 1; }
}

// ---- the demo script ----
await page.goto(app.base, { waitUntil: "networkidle" });
await startRec();
await wait(2600);                                            // hub: cards cascade, banner shine, CTA glow

// Practice: a good call, then a bad call (shake + red delta + meter flash).
await page.evaluate(() => window.EG.launch("provisional"));
await wait(2200);                                            // desk briefing
await clickSel("#startBtn"); await wait(1400);
await answer(page); await wait(700); await scrollTo(page, ".feedback"); await wait(1800);
await clickSel("#nextBtn"); await wait(1300);
await answer(page, { wrong: true }); await wait(900); await scrollTo(page, ".feedback"); await wait(1700);

// Career: intro → in-tray → consult → stamped rulings → streak → praise → finale.
await page.evaluate(() => window.EG.hub()); await wait(1200);
await clickSel("#careerStartBtn"); await wait(2400);         // timeline staggers in
await clickSel("#goBtn"); await wait(2000);                  // in-tray + journey rail
await clickSel(".inbox .ticket"); await wait(1200);
await clickSel("#consultBtn"); await wait(1000); await scrollTo(page, ".consult-result"); await wait(1400);
await answer(page); await wait(300); await scrollTo(page, ".ticket-fb"); await wait(1800);

let decisions = 1, praiseSeen = false, fastForward = false;
for (let guard = 0; guard < 400; guard++) {
  if (await page.$(".certificate")) break;
  if (!praiseSeen && (await page.$(".escalation.good"))) {   // linger on the praise event
    praiseSeen = true; await scrollTo(page, ".escalation"); await wait(2600); fastForward = true;
  }
  const did = await careerStep(page);
  if (did === "decide") {
    decisions++;
    if (!fastForward) { await scrollTo(page, ".ticket-fb"); await wait(decisions === 5 ? 2200 : 900); }
  } else if (!fastForward) {
    await wait(did === "next" || did === "endday" ? 1500 : 500);
  }
  if (did === "stuck") break;
}
await wait(4500);                                            // finale: seal, title pop, count-ups, confetti

await stopRec();
await browser.close();
app.close();
if (!process.exitCode) console.log("Demo video written to test/shots/demo.webm");
