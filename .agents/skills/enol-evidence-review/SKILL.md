---
name: enol-evidence-review
description: "Challenge an ENOL project's claimed benefit, experiment, benchmark or economics. Use before costly implementation, at the first working demo and before pitch approval; review independently rather than adding features."
---

# ENOL · důkaz přínosu, ne důkaz složitosti

Authored ENOL adaptation informed by Scientific Critical Thinking. Read `AGENTS.md`, `competition/SKILLS.md` and the approved brief. This is a bounded engineering review, not a clinical GRADE assessment or an invitation to build a new research platform. Review is read-only except for assigned review artifacts and independent tests.

## Before building the expensive part

Write the primary claim, intended user/action, strongest fair simple comparator, success measure and a result that would falsify the claim. Agree these before inspecting final test outcomes. Identify the cost of failure, measurement and implementation. In the first third of the available time, test the riskiest assumption; if the benefit is absent, report it to the lead and propose a change of method or claim. Do not silently change the benchmark.

## Review

- Trace the headline result to actual data, source period, units, denominator and reproducible command. Separate measured, simulated, assumed, proposed and unavailable evidence.
- Compare methods on the same cases, information access, constraints and resource budget. Include unresolved/abstained and excluded cases with reasons. Avoid test leakage, cherry-picked subgroups and tuning on the held-out sample.
- Check whether added complexity actually improves the result. If a simple fixed procedure performs equally well, say so. An ablation can locate the useful part; it must not redefine success after seeing results.
- Ask who can perform every recommended action, with which equipment, permissions, time and cost. A credit is not a minute or a koruna. Require documented conversion or keep it as a limitation.
- Check energy balance and economic boundaries. A count of homes is not demand; nameplate MW are not produced MWh; correlation or a model fit is not a causal effect.
- Distinguish lack of reporting from proof that something was not done. Reject invented savings, fabricated physical validation and claims that exceed the actual end-to-end test.

## Timebox and deliverable

Return the three most consequential issues: claim → evidence/location → why it matters → cheapest discriminating check/fix. End with a recommendation: continue, narrow the claim, change method, or ask the user to choose a pivot. The lead decides with the user. Do not write the developer's winning benchmark for them, rewrite production code without ownership, spawn auditors recursively or consume the whole deadline with verification machinery.

Keep detailed evidence in the project directory and the chat update short. Provenance: `competition/skills-registry.json`. No OpenRouter, paid schematic generator or external submission is part of this adaptation.
