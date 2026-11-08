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
