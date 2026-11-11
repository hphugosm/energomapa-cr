---
name: enol-evidence-review
description: "Review existing solutions, practical value and full-system feasibility for ENOL. Use before architecture selection, by the first-third evidence gate, after a pivot and before handoff. Do not equate algorithm novelty or passing unit tests with user benefit."
---

# ENOL · evidence before complexity

Read `AGENTS.md`, `competition/SKILLS.md` and the approved brief. Before approval, research and discuss only. Afterwards write only assigned evidence and independent tests; do not rewrite production code or the success criterion. Use bounded review, not a new audit platform.

## Research and reuse

Follow `competition/REUSE_FIRST.md` before architecture selection. Open relevant primary work, reference implementations and existing alternatives, including a potential stronger comparator. A source you read is not a module you ran. After approval, require a small reproduced example, compatible units/interfaces, version/license records and clear attribution. A standard solver can become our product's core; do not demand a new algorithm when it already works best.

## Test the right promise

Use `competition/PRACTICAL_VALUE.md` and `competition/templates/value-test.md`. Choose one primary claim: energy/cost savings, better decisions/lower risk, or saved human work. Define a useful threshold and falsifying result before final outcomes. Strong fair baseline, same cases/information/constraints/resources, setup and execution costs, unresolved and failed cases all count. Separate tuning from evaluation. Test benefit and the most sensitive assumption by T/3, at 80 minutes in a 240-minute run.

**A pivot needs a new test.** Preserve the old outcome. Reusing the winning baseline does not prove a new claim about saved human time. A real task test needs observed completion, time/errors and practice/order controls; a teammate pilot is not independent professional validation. No invented interviews or external contact without permission. Missing people/data mean unverified scope, not simulated human evidence.

## Independently verify the whole system

Recompute constraints from public inputs and returned outputs, independently of the optimizer's success flag and its validator helper. Check initial base state plus controlled increment, aggregate and per-channel/time-step limits, conservation, units, losses, missing values and relevant end reserves. Validation must hold at the compute/API boundary, not only a UI slider.

For a capacity case, an already overloaded base demand with zero controlled load cannot be labelled feasible unless an explicit permitted load-shedding mechanism resolves it. Add exact-boundary, phase-only violation, null and malformed-input cases. An optimal status does not compensate for a violated physical constraint; a timeout is not proof of optimality.

## Interpretation and return

Tie headlines to source, period, units, denominator and a reproduction command. Separate field evidence, simulation, assumptions and plans. Name the actor, equipment, permissions, time and costs for each recommendation. A credit is not a minute or koruna.

Use `competition/LIBRARY_TOOLBOX.md` only as needed. Sensitivity does not validate input distributions; neither code tests nor a deployed interface proves user value. Return at most three consequential findings: claim → evidence → consequence → cheapest discriminating check. Recommend continue, adopt the better method, narrow scope or discuss a pivot; lead and user decide. No recursive auditors. Provenance: `competition/skills-registry.json` and `competition/resources.json`.
