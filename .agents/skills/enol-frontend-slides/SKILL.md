---
name: enol-frontend-slides
description: "Build or revise an approved ENOL web pitch with a strong argument, explanatory animations, arrow navigation and timer. Use for presentation work, not for inventing the project before user approval."
---

# ENOL · přesvědčivá webová prezentace

Repo-local ENOL adaptation informed by Frontend Slides, not the upstream package. Paths below are repository-relative. Read `AGENTS.md`, `competition/SKILLS.md` and the approved project brief first; follow the discussion/approval gate. Before approval, discuss only; do not create preview files.

## Postup

1. Extract the user, problem, own mechanism, strongest verified result, comparator and limitations from the brief. Write one sentence explaining why the audience should care. Do not begin with a tour of the app.
2. Propose two genuinely different visual directions using the same truthful content, not different promises. After the direction is approved, build one representative animated scene first. Do not spend the whole budget producing alternate decks.
3. Build the argument around problem → mechanism → live evidence → consequence for the user. Choose the number and order of scenes freely. Existing `public/prezentace/` is reusable, not mandatory. Do not impose six slides, a fixed renderer, a map, 3D or a framework.
4. Preserve keyboard and visible arrows plus a visible start/pause/reset timer. Inputs, sliders and open dialogs retain their own keys. Handle rapid forward/back navigation and repeated visits without duplicated handlers or stale state.
5. Specify each important animation as: initial state → trigger → explanation/reveal → final state → backward/reset behavior. Animate causal mechanisms, energy flows, changing constraints and comparisons, not just decorative entrances. Never animate a false data point or misleading axis change.
6. Separate operating UI from projection: the pitch shows one claim and its proof; a large parameter form belongs in a demo. Keep units, period, source and model/measurement status legible. Use the design manual as a starting point, not a layout prison.
7. Verify a full sequential run with `enol-browser-check`, including normal motion and a separate reduced-motion run. Rehearse within the actual pitch limit. Check 1280×720 and the actual presentation screen; adapt layout as necessary, not by hiding controls or shrinking everything.

## Delivery

Return the presentation path, the main argument in one sentence, changed scenes, evidence links, and the replay path for the strongest demonstration. Provide a static fallback that includes final chart/reveal states. Video, static export and web must use the same source revision.

## Local differences from upstream

No mandatory online fonts, copied font files, Vercel deploy, single-file architecture, 1920×1080 stage or automatic inline editing. No repeated questionnaire about facts already in the brief: communicate briefly in Czech, one real decision at a time through the lead. This skill does not generate narration or install any packages. Provenance: `competition/skills-registry.json`.
