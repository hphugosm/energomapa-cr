import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Codex must discuss and get explicit go-ahead before touching files', async () => {
  const [agents, quick, policy] = await Promise.all([
    read('AGENTS.md'), read('README_CODEX.md'), read('competition/COLLABORATION.md')
  ]);
  assert.match(agents,/competition\/COLLABORATION\.md/);
  assert.match(agents,/Nezačínej měnit soubory.*výslovně/i);
  assert.match(quick,/Teď nic neupravuj ani neprogramuj/i);
  assert.match(policy,/Souhlasíš s tímto směrem a mám začít implementovat\?/);
  assert.match(policy,/Před odpovědí ano nedělej změny v souborech/i);
});

test('Collaboration guidance requires short messages and material questions during implementation', async () => {
  const [policy, repoGuide, template] = await Promise.all([
    read('competition/COLLABORATION.md'), read('competition/README.md'),
    read('competition/templates/project.md')
  ]);
  assert.match(policy,/2–5 vět/);
  assert.match(policy,/Ptej se často/i);
  assert.match(policy,/Neopakuj již zodpovězené otázky/i);
  assert.match(repoGuide,/Nejprve se mnou stručně prober řešení/);
  assert.match(template,/Potvrzení uživatele k zahájení implementace/);
});

test('Moonshot brief mandates technical depth, timeboxing and rework instead of premature submission', async () => {
  const [strategy,agents,starter,brief]=await Promise.all([
    read('competition/MOONSHOT_STRATEGY.md'),read('AGENTS.md'),read('README_CODEX.md'),read('competition/templates/project.md')
  ]);
  assert.match(strategy,/velká vize → funkční jádro → řízené škrtání/i);
  assert.match(strategy,/0–30 min/);
  assert.match(strategy,/30–210 min/);
  assert.match(strategy,/210–255 min/);
  assert.match(strategy,/255–300 min/);
  assert.match(strategy,/první verze hotová výrazně před koncem/i);
  assert.match(agents,/Neoptimalizuj na nejrychlejší dokončení/i);
  assert.match(starter,/První funkční verze není konec/i);
  assert.match(brief,/kritika po první funkční verzi/i);
});

test('Presentation is free to innovate but keeps keyboard arrows and timer', async () => {
  const [guide,parity,design,check]=await Promise.all([
    read('competition/PRESENTATION_GUIDE.md'),read('competition/DECIN_PARITY.md'),read('competition/DESIGN_SYSTEM.md'),read('competition/QA_CHECKLIST.md')
  ]);
  for(const v of [guide,parity,design,check])assert.match(v,/šipky.*časovač|šipky.*stopky/i);
  assert.match(guide,/Všechno ostatní je volné/i);
  assert.match(guide,/více smysluplných vizuálních odhalení/i);
  assert.match(check,/první verze prošla/i);
});
