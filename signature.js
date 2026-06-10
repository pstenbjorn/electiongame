/* signature.js
 * Renders a deterministic, cursive-ish signature as an SVG path from a seed.
 * Same seed -> same stroke, so an envelope signature can either MATCH the
 * one on file (same seed + tiny human jitter) or clearly differ (new seed).
 * No dependencies; works from file://.
 */
(function (global) {
  "use strict";

  // Small seeded PRNG (mulberry32) from a string seed.
  function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Build a wavy cursive baseline path across the box.
  function buildPath(seed, jitter) {
    const rnd = mulberry32(hashString(seed));
    const W = 240, H = 90;
    const baseline = H * 0.62;
    const segments = 5 + Math.floor(rnd() * 4); // 5-8 humps
    const amp = 14 + rnd() * 16;
    const slant = (rnd() - 0.5) * 10;
    const startX = 14, endX = W - 14;
    const step = (endX - startX) / segments;

    let d = "";
    let x = startX;
    let y = baseline + (rnd() - 0.5) * 6;
    d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;

    for (let i = 0; i < segments; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      const cx1 = x + step * 0.3;
      const cy1 = baseline + dir * amp * (0.6 + rnd() * 0.7) + jitter * (rnd() - 0.5) * 14;
      const cx2 = x + step * 0.7;
      const cy2 = baseline - dir * amp * (0.3 + rnd() * 0.5) + jitter * (rnd() - 0.5) * 14;
      x += step;
      y = baseline + slant * (i / segments) + jitter * (rnd() - 0.5) * 10;
      d += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    // A trailing flourish.
    const fx = x + 18 + rnd() * 22;
    const fy = baseline - 22 - rnd() * 14;
    d += ` Q ${(x + 10).toFixed(1)} ${(baseline + 18).toFixed(1)}, ${fx.toFixed(1)} ${fy.toFixed(1)}`;

    // A couple of dots/crosses for character.
    const marks = [];
    const nMarks = Math.floor(rnd() * 3);
    for (let m = 0; m < nMarks; m++) {
      marks.push({
        x: startX + rnd() * (endX - startX),
        y: baseline - amp - 6 - rnd() * 10,
      });
    }
    return { d, marks };
  }

  // Render an <svg> string for the given seed.
  // opts.jitter: 0 for crisp reference; ~1 for a natural re-signing.
  function svg(seed, opts) {
    opts = opts || {};
    const jitter = opts.jitter == null ? 0 : opts.jitter;
    const ink = opts.ink || "#1c2f4a";
    const { d, marks } = buildPath(seed, jitter);
    const markEls = marks
      .map((m) => `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="1.6" fill="${ink}"/>`)
      .join("");
    return (
      `<svg viewBox="0 0 240 90" preserveAspectRatio="xMidYMid meet" role="img" aria-label="signature sample">` +
      `<path d="${d}" fill="none" stroke="${ink}" stroke-width="2.1" ` +
      `stroke-linecap="round" stroke-linejoin="round"/>${markEls}</svg>`
    );
  }

  global.SignatureArt = { svg };
})(window);
