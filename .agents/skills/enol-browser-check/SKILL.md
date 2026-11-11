---
name: enol-browser-check
description: "Verify an ENOL web app or presentation in an actual browser with the repository's Playwright setup. Use after UI changes or before handoff; distinguish executed checks from static inspection."
---

# ENOL · skutečná prohlížečová kontrola

ENOL adaptation informed by OpenAI's Playwright skill. Read `AGENTS.md` and `competition/SKILLS.md`. Use the existing locked `playwright-core` dependency and existing tests where appropriate; this is not an installation of upstream playwright-cli. Do not add global npm packages or fetch a latest CLI as a hidden prerequisite.

## Setup

Inspect `package.json`, the target route and test scripts before running commands. Use a loopback-only local HTTP server and the existing runtime. If the browser dependency is absent, request/record the needed setup; do not weaken browser or machine security policy. A screenshot fixture is not proof of live behavior.

## Verification sequence

1. Record the tested source revision, actual URL, viewport and browser version. Preserve existing user changes. Verify root and GitHub Pages subpath if the feature is published there.
2. Open the real entry page and traverse the whole intended journey by its controls. Do not only open isolated slide hashes. Use fresh DOM observations/locators after changes; do not guess stale element references.
3. For presentations, test keyboard and visible arrows, timer start/pause/reset, back navigation, focus inside inputs/sliders/dialogs, rapid switching, repeat visits, and state preservation in any embedded demo. Confirm hidden media/playback stops where required.
4. Run normal motion first. Capture the mechanism before, during and after meaningful reveals; test reversal and reduced motion separately. Reduced-motion screenshots alone do not verify the animated pitch. Never treat arbitrary sleep or `networkidle` alone as proof of readiness; wait for the actual UI condition.
5. Inspect overlap, clipped legends, focus visibility, missing-data states and console/request failures at 1280×720 plus the target screen. DOM overflow assertions do not replace visual inspection.
6. Test fresh local startup without external network dependency, failed data loading and an unavailable optional feature. Do not rely solely on a warmed cache.
7. Verify that web, PDF screenshots and video use the same final inputs/revision; label archived/demo/synthetic runs accurately. Re-run affected checks after the last edit.

## Output

Save a compact test matrix with PASS / FAIL / NOT RUN, reproduction steps, screenshots or trace paths and actual errors. Report blocked browser access as NOT RUN with cause, never as success. Do not publish automatically. Existing relevant commands include `node tests/browser-competition.mjs` and `npm run test:browser`; inspect and adapt them to the actual target rather than assuming they cover a new project. Provenance: `competition/skills-registry.json`.
