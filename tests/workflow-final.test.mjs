import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const plan = JSON.parse(await read('competition/run-plan.json'));

// These checks validate repository configuration and documentation, not agent
// behavior, physical feasibility or practical value of a submitted project.
test('four- and five-hour plans are contiguous, bounded and protect handoff', () => {
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.kind, 'planning-reference-not-orchestrator');
  assert.equal(plan.maxConcurrentSubagents, 3);
  assert.equal(plan.profiles.length, 2);
  const budgets = new Map([['rehearsal-4h', 240], ['reference-5h', 300]]);
  assert.equal(new Set(plan.profiles.map(p => p.id)).size, budgets.size);
  for (const p of plan.profiles) {
    assert.equal(p.durationMinutes, budgets.get(p.id));
    assert.equal(p.evidenceDueMinute, p.durationMinutes / 3);
    assert.equal(p.researchTargetMinutes, 15);
    let cursor = 0;
    for (const phase of p.phases) {
      assert.ok(Number.isInteger(phase.start) && Number.isInteger(phase.end));
      assert.equal(phase.start, cursor);
      assert.ok(phase.end > phase.start && phase.end <= p.durationMinutes);
      cursor = phase.end;
    }
    assert.equal(cursor, p.durationMinutes);
    assert.equal(p.phases[0].id, 'research-and-approval');
    assert.ok(p.researchTargetMinutes < p.phases[0].end);
    assert.equal(p.phases[1].end, p.evidenceDueMinute);
    assert.equal(p.phases.at(-1).id, 'freeze-package-rehearse');
    assert.equal(p.phases.at(-1).start, p.freezeMinute);
    assert.ok(p.durationMinutes - p.freezeMinute >= 45);
  }
});

test('human-readable timing matches the machine-readable planning reference', async () => {
  const strategy = await read('competition/MOONSHOT_STRATEGY.md');
  const rehearsal = await read('competition/REHEARSAL_4H.md');
  for (const p of plan.profiles) for (const phase of p.phases) {
    assert.ok(strategy.includes(`${phase.start}–${phase.end} min`));
    if (p.id === 'rehearsal-4h') assert.ok(rehearsal.includes(`${phase.start}–${phase.end}`));
  }
});

test('entry points route research before architecture and preserve approval', async () => {
  const agents = await read('AGENTS.md');
  const starter = await read('README_CODEX.md');
  const collaboration = await read('competition/COLLABORATION.md');
  for (const s of [agents, starter, collaboration]) assert.match(s, /REUSE_FIRST\.md/);
  assert.match(agents, /Před volbou architektury/);
  assert.match(agents, /Nezačínej měnit soubory.*výslovně/);
  assert.match(starter, /Teď nic neupravuj ani neprogramuj/);
  assert.match(collaboration, /Výslovný pokyn k určité úpravě/);
});

test('active policies no longer require inventing the most difficult mechanism', async () => {
  const paths = ['AGENTS.md','README_CODEX.md','competition/README.md',
    'competition/MOONSHOT_STRATEGY.md','competition/COLLABORATION.md',
    'competition/PRESENTATION_GUIDE.md','competition/QA_CHECKLIST.md',
    'competition/templates/project.md'];
  for (const path of paths) {
    const text = await read(path);
    for (const obsolete of ['výrazný vlastní mechanismus','vlastní originální mechanismus',
      'Co postavíme:** jedna věta o závažném problému, výjimečném mechanismu',
      'Pracující důkaz:** Jakou technicky nejtěžší část',
      'V čem je náš vlastní technický průlom?']) {
      assert.ok(!text.includes(obsolete), `${path}: obsolete constraint ${obsolete}`);
    }
  }
  assert.match(await read('competition/REUSE_FIRST.md'), /Baseline může být naše řešení/);
});

test('reuse records distinguish read sources from executed and attributable components', async () => {
  const policy = await read('competition/REUSE_FIRST.md');
  const template = await read('competition/templates/reuse-decision.md');
  for (const text of [policy, template]) {
    assert.match(text, /licenc/i);
    assert.match(text, /verz|commit/i);
    assert.match(text, /PASS \/ FAIL \/ NOT RUN/);
  }
  assert.match(policy, /Zdroj, který jsme četli, není totéž co modul, který jsme spustili/);
  assert.match(policy, /novou kartu a nový test/);
  assert.match(policy, /izolovaném prostředí/);
});

test('review requires independent total-system limits and explicit infeasible cases', async () => {
  const skill = await read('.agents/skills/enol-evidence-review/SKILL.md');
  assert.match(skill, /independently of the optimizer's success flag and its validator helper/);
  assert.match(skill, /already overloaded base demand with zero controlled load/);
  assert.match(skill, /compute\/API boundary/);
  assert.match(skill, /A pivot needs a new test/);
  const qa = await read('competition/QA_CHECKLIST.md');
  assert.match(qa, /vstupní stav i celkový výsledek/);
  assert.match(qa, /každý časový krok/);
});

test('reuse behavioral scenarios are not passed off as executed evidence', async () => {
  const spec = JSON.parse(await read('competition/reuse-evals.json'));
  assert.equal(spec.executionStatus, 'not_run');
  assert.equal(new Set(spec.cases.map(c => c.id)).size, spec.cases.length);
  for (const id of ['references-before-architecture','baseline-wins','unknown-license',
    'overloaded-base','per-phase-violation','dependency-timebox','no-user-test',
    'frozen-deadline','attribution-and-proof','unrelated-task']) {
    assert.ok(spec.cases.some(c => c.id === id));
  }
  for (const c of spec.cases) {
    assert.ok(c.prompt && c.expected.length && c.reject.length);
    assert.equal(Object.hasOwn(c, 'result'), false);
  }
});

test('new routing targets and retained practical evidence templates exist', async () => {
  for (const path of ['competition/REUSE_FIRST.md','competition/REHEARSAL_4H.md',
    'competition/run-plan.json','competition/templates/reuse-decision.md',
    'competition/templates/value-test.md','competition/templates/mentor-interview.md',
    'competition/templates/pitch-runbook.md','competition/PRACTICAL_VALUE.md',
    'competition/REALITY_CHECK.md','competition/LIBRARY_TOOLBOX.md']) {
    await access(new URL('../' + path, import.meta.url));
  }
});
