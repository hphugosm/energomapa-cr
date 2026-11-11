---
name: enol-optimization
description: "Use only when explicitly selected for a genuine ENOL resource-allocation or multiobjective optimization problem. Formulate objectives and physical constraints, compare a simple baseline, and validate feasibility; do not add optimization merely for complexity."
---

# ENOL · optimalizace s doloženými omezeními

Authored ENOL adaptation informed by the pymoo skill. Read `AGENTS.md`, `competition/SKILLS.md` and the approved brief. This is optional guidance, not an installed pymoo runtime. Check the project's installed versions and official API before using the library. Do not change root dependencies or start an installation without the agreed scope; isolate approved optional dependencies.

Define the decision variables, domains, units, objective directions, hard constraints, uncertainty and actual operating action. Establish a strong inexpensive baseline (enumeration for a small case, fixed procedure, greedy policy or an appropriate deterministic solver). Use a multiobjective evolutionary approach only when it matches the problem.

Optimize the user outcome and full path to a feasible decision, not an attractive intermediate proxy. For example a measurement plan must reserve resources for the final required verification; a high immediate information gain is not automatically a completed diagnosis.

When using pymoo, verify the installed result/constraint contracts. Express inequality feasibility explicitly, handle no feasible solution and independently recompute physical constraints on returned candidates. A returned point or a nondominated set is not a certificate of global optimality.

Use fixed seeds and comparable evaluation budgets for methods; retain bad, failed and unresolved runs. Show the cost/benefit trade-off and sensitivity to the most material assumptions. Do not tune against the final held-out set. Export a compact static result and a reproduction command; the browser should not need to run the Python optimizer.

Deliver a feasible candidate set, comparison with the baseline, remaining constraints, and the decision the user can make from it. Escalate absent benefit rather than adding another algorithm. Provenance: `competition/skills-registry.json`.
