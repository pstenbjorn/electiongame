#!/bin/bash
# SessionStart hook — install the dev-only test tooling so the headless tests
# run with no manual setup in Claude Code on the web.
#
#   node test/smoke.mjs         (needs jsdom)
#   node test/screenshots.mjs   (needs playwright; Chromium is pre-provisioned)
#
# These packages are intentionally NOT committed (see .gitignore); this hook
# restores them per session. Synchronous so they're ready before the agent runs.
set -euo pipefail

# Only needed in the remote (web) environment; local dev installs on demand.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Idempotent: skip if both are already present (container state is cached
# after the hook completes, so later sessions are fast).
if [ -d node_modules/jsdom ] && [ -d node_modules/playwright ]; then
  echo "Test tooling already present."
  exit 0
fi

# --no-save keeps package.json/lock out of the repo; Chromium is NOT downloaded
# (blocked here) — Playwright uses the binary at /opt/pw-browsers.
npm install jsdom playwright --no-save --no-audit --no-fund

echo "Test tooling ready: run 'node test/smoke.mjs'."
