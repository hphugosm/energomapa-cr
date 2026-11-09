---
name: enol-skill-eval
description: "Use only when explicitly asked to evaluate or improve ENOL agent instructions or skills before a competition. Compare the existing and proposed instructions on matched tasks; do not launch a meta-evaluation during ordinary project work."
---

# ENOL · ověřování instrukcí před soutěží

Authored ENOL adaptation informed by Anthropic Skill Creator. Read `AGENTS.md` and `competition/SKILLS.md`. This skill does not install upstream scripts or start background agents automatically. Respect approval, budget and the maximum of three simultaneous subagents when supported.

Identify a concrete observed failure rather than adding another broad prohibition. Examples: code before concept approval, a complex method without demonstrated gain, a presentation forced into an old template, or exports from different revisions.

Use `competition/skills-evals.json` as an initial set of manual behavioral cases. Add negative-trigger cases: an unrelated task must not load every optional skill. Before running, define expected observable behavior and available evidence, not exact wording in the model answer.

Compare old and proposed instructions on matched prompt/data/time/model settings with separate scratch output directories. Do not let one run inspect the other's result or change production files. Label any unavailable capability instead of simulating a successful tool call. Use paired/repeated runs where budget permits; a single example is not a performance guarantee.

Grade outcome and user utility, evidence correctness, presentation clarity, workflow compliance and actual cost/time separately. Structural tests that confirm a phrase exists in Markdown do not establish behavioral compliance. Record real tool evidence and user judgment; never fill a run result from an expected-output field.

Make one targeted instruction change, rerun the affected cases plus a small unseen case, then ask the lead/user whether to adopt it. Do not optimize only for the training examples, self-modify repository policies during the contest, or recursively create more evaluators.

Deliver a compact comparison with PASS / FAIL / NOT RUN, evidence, time/token records only when available, and a proposed patch. Initial cases are NOT RUN until actually exercised in Codex/Claude. Provenance: `competition/skills-registry.json`.
