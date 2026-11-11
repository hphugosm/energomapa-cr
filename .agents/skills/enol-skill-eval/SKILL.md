---
name: enol-skill-eval
description: "Use only when explicitly asked to evaluate or improve ENOL Codex instructions before a competition. Compare old/new instructions on matched tasks; never start a meta-evaluation during ordinary project work."
---

# ENOL · porovnání instrukcí

Read `AGENTS.md` and `competition/SKILLS.md`. Original local guidance informed by the credited Skill Creator source and OpenAI skill-evaluation guidance. Runs use only Codex, not another client or paid API harness. Respect approval and at most three concurrent native subagents when supported.

Select one observed failure. Use `competition/skills-evals.json` and `competition/value-evals.json`; include tasks that must NOT trigger optional skills. Before running define observable outcome, prohibited behavior and available evidence, not expected slogans.

Compare old/new instructions on the same task, data, model, reasoning setting, tools, approval responses and time/token budget. Use fresh independent sessions or worktrees, disjoint output directories and no access to each other's answers. Record actual model/config, source commits, loaded skill paths, tool traces when available, timing and output artifacts. Do not infer invocation from a written promise. Do not expose private reasoning or secrets in traces.

Repeat matched cases when useful; retain failures, unavailable tools and run-to-run variation. Keep at least one unseen check. A single different hackathon theme cannot isolate prompt quality. Judge practical outcome, evidence correctness, usability/pitch, compliance and cost separately; blind human review of artifacts is preferable to the author congratulating itself.

Structural CI is not a behavioral test. Missing runs remain NOT RUN; never fill results from expected-output fields. Initial scenarios do not constitute completed evaluations. No recursive evaluators, automated billing, global config changes or invented metrics.

Return a compact paired comparison with PASS / FAIL / NOT RUN and evidence, plus one proposed change. Adoption remains a user decision. Detailed references: `competition/skills-registry.json` and `competition/resources.json`.
