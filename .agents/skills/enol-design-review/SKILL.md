---
name: enol-design-review
description: "Critique, simplify, animate or polish an existing ENOL demo or pitch. Use for a targeted visual second pass after there is a renderable result; do not redesign unrelated atlas pages."
---

# ENOL · cílená vizuální revize

Authored ENOL adaptation informed by Impeccable. Read `AGENTS.md`, `competition/SKILLS.md` and the approved brief. Review is read-only unless changes to this surface are authorized. This is not the Impeccable CLI/plugin and provides no upstream slash commands, hooks or binary.

## Modes

- **critique:** inspect an actual rendered surface and identify the three most important failures of comprehension or use.
- **distill:** remove duplicate claims, ornamental panels and tiny technical paragraphs; preserve source context and material uncertainty.
- **animate:** add purposeful motion that explains the mechanism or contrast. Define its trigger, end state and reverse/reset behavior.
- **polish:** refine hierarchy, spacing, typography, focus, transitions and edge cases only after the argument works.

Determine whether the surface is for operating a tool or persuading a projected audience. A dense working dashboard may be appropriate in the former and poor in the latter. Do not mechanically replace the team's approved blue, fonts or visual identity because an upstream rule dislikes a popular style.

Inspect real screenshots at presentation size and one complete interactive traversal. Rank each finding as blocking, important or cosmetic; include the exact scene/selector, observable problem, impact and smallest useful fix. Do not mistake a PDF's lack of motion for a missing animation in the source.

When editing is approved, fix the highest-impact problems as a coherent batch, then inspect again. A slide should deliver its main point at a glance, with a meaningful visual rather than nested cards and competing numbers. Do not turn missing evidence into a design problem or hide an adverse result to improve the story.

## Boundaries and output

Do not run the upstream installer, design hooks, live-apply fallback or commands that bypass approvals/sandboxing. Do not alter global agent configuration. This local skill works from repository code and existing browser tools.

Deliver at most three priority findings to the lead, before/after screenshots when possible, and a list of remaining limitations. Store details with the project, not in user-facing long reports. Then use `enol-browser-check` for behavior and motion verification. Provenance: `competition/skills-registry.json`.
