/* test/screenshots.mjs — render key screens to PNGs with a headless browser.
 *
 *   npm install playwright --no-save
 *   node test/screenshots.mjs            # writes test/shots/*.png
 *
 * Uses the pre-provisioned Chromium when present (PLAYWRIGHT_BROWSERS_PATH);
 * falls back to Playwright's managed browser otherwise. Serves the app over a
 * tiny local HTTP server so the live jurisdiction.config.json is used.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = join(ROOT, "test", "shots");
mkdirSync(SHOTS, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".mjs": "text/javascript" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  try {
    const body = readFileSync(join(ROOT, p));
    res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

// Prefer the pre-provisioned chromium binary (download is network-blocked here).
const candidates = [
  process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, "chromium-1194/chrome-linux/chrome"),
  "/opt/pw-browsers/chromium/chromium",
].filter(Boolean);
const execPath = candidates.find((p) => existsSync(p));

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  ...(execPath ? { executablePath: execPath } : {}),
});
const page = await browser.newPage({ viewport: { width: 940, height: 1180 }, deviceScaleFactor: 2 });
const shot = async (name) => { await page.screenshot({ path: join(SHOTS, name + ".png"), fullPage: true }); console.log("  saved", name + ".png"); };
const goHub = () => page.evaluate(() => window.EG.hub());

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForSelector(".dept-card");
await shot("01-hub");

// A practice desk: intro (with Desk briefing), then a ruling with the legal-basis block.
await page.evaluate(() => window.EG.launch("provisional"));
await page.waitForSelector(".primer");
await shot("02-desk-briefing");
await page.click("#startBtn");
await page.waitForSelector("#decisions .btn");
await page.click("#decisions .btn");
await page.waitForSelector(".legal-basis");
await shot("03-ruling-legal-basis");

// Career: intro, inbox, a ticket with the code consulted, a stamped ruling, finale.
await goHub();
await page.waitForSelector("#careerStartBtn");
await page.click("#careerStartBtn");
await page.waitForSelector("#goBtn");
await shot("04-career-intro");
await page.click("#goBtn");
await page.waitForSelector(".inbox .ticket");
await shot("05-career-inbox");
await page.click(".inbox .ticket");
await page.waitForSelector("#consultBtn");
await page.click("#consultBtn");
await page.waitForSelector(".consult-result .legal-basis");
await shot("06-career-ticket-consult");
await page.click("#decisions .btn");
await page.waitForSelector(".stamp");
await shot("07-career-stamp");

// Fast-forward the rest of the cycle in-page, then capture the finale.
await page.evaluate(async () => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const click = (el) => el && el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  let guard = 0;
  while (guard++ < 800) {
    if ($(".certificate")) return;
    if ($("#backBtn")) { click($("#backBtn")); continue; }
    if ($("#decisions") && !$("#ticketFeedback .feedback")) { click($$("#decisions .btn")[0]); continue; }
    if ($("#endDayBtn")) { click($("#endDayBtn")); continue; }
    if ($("#nextBtn")) { click($("#nextBtn")); continue; }
    const pending = $$(".ticket:not(.done)").filter((b) => !b.disabled);
    if (pending.length) { click(pending[0]); continue; }
    return;
  }
});
await page.waitForSelector(".certificate");
await shot("08-certification-finale");

await browser.close();
server.close();
console.log("\nScreenshots written to test/shots/");
