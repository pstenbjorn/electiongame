/* test/lib/drive.mjs — shared browser plumbing for the visual tools.
 *   serveApp()      tiny static server for the repo (so the live JSON config loads)
 *   launch()        Chromium, preferring a pre-provisioned binary
 *   answer(page)    rule on the open case — correctly (via the module's own
 *                   correctAction) or deliberately wrong
 *   careerStep()    advance Career mode by one action, ruling correctly
 *   findFfmpeg()    locate an ffmpeg that can encode WebM
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { execFileSync } from "node:child_process";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BROWSER_DIRS = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };
export async function serveApp() {
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
  return { base: `http://localhost:${server.address().port}/`, close: () => server.close() };
}

function findIn(dirs, prefix, rel) {
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    const hits = readdirSync(d).filter((n) => n.startsWith(prefix)).sort().reverse();
    for (const h of hits) { const p = join(d, h, rel); if (existsSync(p)) return p; }
  }
  return null;
}

export async function launch() {
  const exe = process.env.CHROMIUM_PATH || findIn(BROWSER_DIRS, "chromium-", "chrome-linux/chrome");
  return chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], ...(exe ? { executablePath: exe } : {}) });
}

export function findFfmpeg() {
  if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  const bundled = findIn(BROWSER_DIRS, "ffmpeg-", "ffmpeg-linux");
  if (bundled) return bundled;
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return "ffmpeg"; } catch { return null; }
}

// Rule on the case currently on screen. Looks the case up by its displayed ID
// across every module and asks that module's rules engine for the answer.
export function answer(page, { wrong = false } = {}) {
  return page.evaluate((wrong) => {
    const idText = (document.querySelector(".voter-id") || {}).textContent || "";
    let best = null;
    for (const m of window.EG.modules) for (const c of m.cfg.cases) {
      if (idText.includes(c.id) && (!best || c.id.length > best.c.id.length)) best = { m, c };
    }
    const act = best ? best.m.cfg.correctAction(best.c) : null;
    const btns = Array.from(document.querySelectorAll("#decisions .btn"));
    const pick = (wrong ? btns.find((b) => b.dataset.act !== act) : btns.find((b) => b.dataset.act === act)) || btns[0];
    pick.click();
    return { act, picked: pick.dataset.act };
  }, wrong);
}

// One Career-mode action. Returns what it did: open|decide|back|endday|next|go|finale|stuck.
export async function careerStep(page) {
  const what = await page.evaluate(() => {
    const $ = (s) => document.querySelector(s);
    if ($(".certificate")) return "finale";
    if ($("#backBtn")) { $("#backBtn").click(); return "back"; }
    if ($("#decisions") && !$("#ticketFeedback .feedback")) return "decide";
    if ($("#endDayBtn")) { $("#endDayBtn").click(); return "endday"; }
    if ($("#nextBtn")) { $("#nextBtn").click(); return "next"; }
    const p = Array.from(document.querySelectorAll(".ticket:not(.done)")).filter((b) => !b.disabled);
    if (p.length) { p[0].click(); return "open"; }
    if ($("#goBtn")) { $("#goBtn").click(); return "go"; }
    return "stuck";
  });
  if (what === "decide") await answer(page);
  return what;
}

export const scrollTo = (page, sel) =>
  page.evaluate((s) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, sel);
