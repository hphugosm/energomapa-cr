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
  assert.match(strategy,/30–100 min/);
  assert.match(strategy,/100–210 min/);
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

// These are documentation contracts. Actual agent behavior is evaluated separately
// with competition/skills-evals.json; a passing regex is not product validation.
test('Entry points route the first-third reality check before expensive implementation', async () => {
  for (const path of ['AGENTS.md', 'README_CODEX.md', 'competition/MOONSHOT_STRATEGY.md']) {
    assert.match(await read(path), /REALITY_CHECK\.md/, `${path} must route to the shared methodology`);
  }
  const methodology = await read('competition/REALITY_CHECK.md');
  assert.match(methodology, /první třetin|první třetině/i);
  assert.match(methodology, /100\.?\s*(?:min|minut)/i);
  assert.match(methodology, /siln.{0,40}baseline/i);
  assert.match(methodology, /stejn.{0,100}(?:data|případ|vstup)/i);
  assert.match(methodology, /informac/i);
  assert.match(methodology, /omezen/i);
  assert.match(methodology, /rozpoč|zdrojov.{0,20}(?:limit|podmín)/i);
});

test('Methodology challenges the most sensitive assumption and preserves adverse evidence', async () => {
  const methodology = await read('competition/REALITY_CHECK.md');
  assert.match(methodology, /nejcitlivější.{0,60}předpoklad/i);
  assert.match(methodology, /zdroj|měřen/i);
  assert.match(methodology, /(?:nízk|dolní).{0,80}(?:základ|střed).{0,80}(?:vysok|horní)/i);
  assert.match(methodology, /(?:slab|nulov|neprokázan|neprokáz).{0,160}(?:uživatel|konzult|souhlas)|(?:uživatel|konzult|souhlas).{0,160}(?:slab|nulov|neprokázan|neprokáz)/i);
  assert.match(methodology, /(?:neměň|nepřepis|neoslab|nezměn).{0,100}(?:baseline|metrik|test)/i);
});

test('Every feature maps a real user to a decision and an executable action', async () => {
  const [methodology, brief] = await Promise.all([
    read('competition/REALITY_CHECK.md'), read('competition/templates/project.md')
  ]);
  for (const text of [methodology, brief]) {
    assert.match(text, /(?:každ.{0,30}funkc|funkce.{0,30}uživatel)/i);
    assert.match(text, /uživatel|provozovatel/i);
    assert.match(text, /rozhodnut/i);
    assert.match(text, /proveditel|proveden|vykonat/i);
  }
  assert.match(methodology, /oprávněn|pravomoc/i);
  assert.match(methodology, /vybaven|zařízen/i);
  assert.match(methodology, /náklad|cena|náklady/i);
});

test('Handoff verifies the actual extracted package and can distinguish a static backup', async () => {
  const methodology = await read('competition/REALITY_CHECK.md');
  assert.match(methodology, /rozbal/i);
  assert.match(methodology, /čist.{0,50}(?:prostřed|slož|adresář)/i);
  assert.match(methodology, /(?:nov|změněn).{0,50}vstup|vstup.{0,50}(?:změn|nov)/i);
  assert.match(methodology, /přepoč|výpoč/i);
  assert.match(methodology, /cache|mezipamě/i);
  assert.match(methodology, /závislost/i);
  assert.match(methodology, /statick.{0,40}záloh/i);
  assert.match(methodology, /NOT RUN|neproveden/i);
});

test('Final exports identify the frozen release and are reopened after regeneration', async () => {
  const [methodology, checklist] = await Promise.all([
    read('competition/REALITY_CHECK.md'), read('competition/QA_CHECKLIST.md')
  ]);
  for (const text of [methodology, checklist]) {
    assert.match(text, /(?:finální|stejn.{0,20})\s*(?:verz|reviz)|finální.{0,50}(?:verz|reviz)/i);
    assert.match(text, /export/i);
  }
  assert.match(methodology, /(?:commit|reviz)/i);
  assert.match(methodology, /(?:hash|kontroln.{0,20}souč)/i);
  assert.match(methodology, /(?:PDF|video).{0,100}(?:screenshot|snímk)|(?:screenshot|snímk).{0,100}(?:PDF|video)/i);
  assert.match(methodology, /(?:otevř|přehra|prohléd)/i);
  assert.match(methodology, /(?:poslední|další).{0,50}(?:úprav|změn)|(?:úprav|změn).{0,50}(?:poslední|další)/i);
  assert.match(methodology, /(?:testovac|testovan|placeholder)/i);
});
