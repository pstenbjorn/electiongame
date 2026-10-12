/* fx.js — "game feel" layer: motion, feedback juice, and celebration.
 *
 * Loaded right after engine.js. It wraps two engine primitives so every screen
 * benefits without touching module code:
 *   - EG.mount      → screens animate in; cards, tickets, tallies, badges stagger
 *   - EG.trust.set  → the trust meter counts, flashes, and floats a +/− delta
 * and exposes helpers the engine/career call at key moments:
 *   EG.fx.verdict(ok, feedbackEl, {stamp})  glow on a good call, shake on a bad one
 *   EG.fx.toast(html, kind)                 brief banner (streaks, escalations)
 *   EG.fx.celebrate(viewEl, {confetti})     count-up stats (+ confetti if earned)
 *   EG.fx.confetti()                        civic navy/gold confetti burst
 *
 * Honors prefers-reduced-motion (no count-ups, shakes, or confetti) and stays
 * inert in non-browser test environments (jsdom).
 */
(function (global) {
  "use strict";
  const EG = global.EG;
  if (!EG) return;

  const isTestEnv = /jsdom/i.test((global.navigator && global.navigator.userAgent) || "");
  const reduced = (function () {
    try { return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch (e) { return false; }
  })();
  const motion = !reduced && !isTestEnv;
  const raf = global.requestAnimationFrame ? global.requestAnimationFrame.bind(global) : (f) => setTimeout(f, 16);

  const fx = { reduced: reduced };

  // Re-trigger a CSS animation class on an element.
  function pulseClass(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // reflow so the animation restarts
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms || 700);
  }

  // ---- count-up for numbers (keeps any suffix like "%" or "🔥") ----
  const tokens = new WeakMap();
  fx.countUp = function (el, from, to, opts) {
    if (!el) return;
    opts = opts || {};
    const suffix = opts.suffix || "";
    if (!motion || from === to) { el.textContent = to + suffix; return; }
    const dur = opts.duration || 650;
    const token = {};
    tokens.set(el, token);
    const t0 = performance.now();
    (function step(now) {
      if (tokens.get(el) !== token) return; // superseded by a newer count
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * eased) + suffix;
      if (p < 1) raf(step);
    })(t0);
  };

  // ---- 1. Screen transitions: wrap EG.mount ----
  const STAGGER = [".dept-card", ".ticket", ".tally-item", ".badge", ".tl-item", ".cycle-pip", ".auth"];
  const origMount = EG.mount;
  EG.mount = function (node) {
    origMount(node);
    if (!node || !node.classList) return;
    node.classList.add("fx-enter");
    STAGGER.forEach(function (sel) {
      node.querySelectorAll(sel).forEach(function (el, i) { el.style.setProperty("--i", i); });
    });
  };

  // ---- 2. Trust meter juice: wrap EG.trust.set ----
  let quiet = false;
  const origSet = EG.trust.set;
  EG.trust.set = function (v) {
    const prev = this.value;
    origSet.call(this, v);
    const now = this.value;
    if (quiet || now === prev) return;
    const valEl = document.getElementById("trustValue");
    fx.countUp(valEl, prev, now);
    const meter = valEl && valEl.closest(".meter");
    pulseClass(meter, now > prev ? "fx-meter-up" : "fx-meter-down", 800);
    floatDelta(meter, now - prev);
  };
  EG.trust.setQuiet = function (v) { quiet = true; try { this.set(v); } finally { quiet = false; } };
  EG.trust.reset = function () { this.setQuiet(100); };

  function floatDelta(anchor, d) {
    if (!motion || !anchor || !document.body) return;
    const r = anchor.getBoundingClientRect();
    const b = document.createElement("div");
    b.className = "fx-delta " + (d > 0 ? "up" : "down");
    b.textContent = (d > 0 ? "+" : "−") + Math.abs(d);
    b.style.left = (r.right - 28) + "px";
    b.style.top = (r.bottom + 4) + "px";
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1300);
  }

  // ---- 3. Verdict feedback on a ruling ----
  fx.verdict = function (ok, feedbackEl, opts) {
    opts = opts || {};
    const card = feedbackEl && feedbackEl.closest(".card");
    const delay = opts.stamp ? 260 : 0; // let a stamp "land" first
    setTimeout(function () {
      if (ok) pulseClass(card, "fx-glow", 900);
      else if (motion) pulseClass(card, "fx-shake", 520);
    }, delay);
  };

  // ---- 4. Toasts ----
  fx.toast = function (html, kind) {
    if (!document.body) return;
    let host = document.getElementById("fx-toasts");
    if (!host) { host = document.createElement("div"); host.id = "fx-toasts"; document.body.appendChild(host); }
    const t = document.createElement("div");
    t.className = "fx-toast " + (kind || "info");
    t.innerHTML = html;
    host.appendChild(t);
    // Never let toasts pile up: keep at most two on screen.
    const live = Array.from(host.querySelectorAll(".fx-toast:not(.out)"));
    while (live.length > 2) dismiss(live.shift());
    setTimeout(() => dismiss(t), 2600);
  };
  function dismiss(t) { if (!t || t.classList.contains("out")) return; t.classList.add("out"); setTimeout(() => t.remove(), 400); }
  fx.clearToasts = function () {
    const host = document.getElementById("fx-toasts");
    if (host) host.querySelectorAll(".fx-toast").forEach(dismiss);
  };

  // ---- 5. Celebration: count up stats, optionally confetti ----
  fx.celebrate = function (view, opts) {
    opts = opts || {};
    if (!view) return;
    fx.clearToasts(); // a results screen owns the stage
    view.querySelectorAll(".tally-num, .aar-score").forEach(function (el, i) {
      const m = (el.textContent || "").match(/^(-?\d+)(.*)$/s);
      if (!m) return;
      const to = parseInt(m[1], 10), suffix = m[2];
      el.textContent = (motion ? 0 : to) + suffix;
      setTimeout(() => fx.countUp(el, 0, to, { suffix: suffix, duration: 900 }), 150 + i * 90);
    });
    if (opts.confetti) setTimeout(fx.confetti, 350);
  };

  // ---- 6. Confetti (canvas; navy / gold / white — civic, not carnival) ----
  fx.confetti = function () {
    if (!motion || !document.body) return;
    const c = document.createElement("canvas");
    const ctx = c.getContext && c.getContext("2d");
    if (!ctx) return;
    c.className = "fx-confetti";
    const W = (c.width = global.innerWidth), H = (c.height = global.innerHeight);
    document.body.appendChild(c);
    const colors = ["#1d3a5f", "#b38f43", "#d8bd80", "#ffffff", "#2f7d4e"];
    const parts = [];
    for (let i = 0; i < 140; i++) {
      parts.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.25,
        vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 11 - 3,
        w: 6 + Math.random() * 6, h: 3 + Math.random() * 4,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
      });
    }
    const t0 = performance.now();
    (function frame(now) {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 2800);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (t < 2800) raf(frame); else c.remove();
    })(t0);
  };

  EG.fx = fx;
})(window);
