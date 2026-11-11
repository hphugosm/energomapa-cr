---
name: enol-frontend-slides
description: "Build or revise an approved ENOL pitch with a strong argument, explanatory animations, speaker handoffs, demo fallback, arrow navigation and timer. Use for presentation work, not for inventing the project before user approval."
---

# ENOL · přesvědčivá webová prezentace

Repo-local adaptation informed by Frontend Slides, pitch-timebox and Devpost, not installed upstream packages. Read `AGENTS.md`, `competition/SKILLS.md` and the approved brief. Before approval discuss only; do not create preview files.

1. Extract the actual user, problem, mechanism, comparator, strongest supported benefit and limitations. Read the project's value-test card; do not turn a failed energy hypothesis into untested time savings.
2. Propose two visual directions using the same truthful content. After approval build one representative animated scene; do not spend the deadline on alternate decks.
3. Tell problem → mechanism → live evidence → practical consequence. Number, order and renderers are free. `public/prezentace/` is reusable, not mandatory. No forced six-slide structure, map or 3D.
4. Fill `competition/templates/pitch-runbook.md`: confirmed limit, speaker blocks, exact demo actions, handoffs, same-release fallback and hard Q&A. Use existing team information, ask only unresolved decisions. Official rubric weights come from the actual rules, never invented. Adapt timing to measured rehearsal, not an assumed universal speaking rate.
5. Preserve visible and keyboard arrows plus start/pause/reset timer. Inputs, sliders and dialogs retain keys. Rapid navigation and return must not duplicate handlers or show stale results.
6. For each important animation define initial state → trigger → explanation → final state → backward/reset. Animate a mechanism or comparison, not just an entrance. Never manipulate axes or add fictional data for effect.
7. Separate operating UI from projection. The slide shows one supported claim; a large form belongs in the demo. Keep source, units, period and evidence type readable.
8. Run `enol-browser-check` sequentially in ordinary motion, then reduced motion separately. Rehearse with both speakers within the actual limit, including demo and handoffs. Check 1280×720 and actual display; do not hide controls to pass overflow checks.

Return presentation path, main argument, proof links, timed runbook and strongest demo path. Record actual rehearsal times or NOT RUN. Provide static fallback with final chart states; video/export/web use the same source revision. Show one changed input causing a new computation when a functional demo is promised. Label recorded footage as recorded.

No mandatory online fonts, font files, Vercel deployment, single-file architecture, fixed canvas, inline editor or paid narration. No new questionnaires about known facts. Source identities and scope: `competition/skills-registry.json`, `competition/resources.json`.
