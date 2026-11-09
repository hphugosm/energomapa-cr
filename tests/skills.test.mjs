import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir, lstat} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = p => readFile(resolve(root, p), 'utf8');
const registry = JSON.parse(await read('competition/skills-registry.json'));
const ids = registry.skills.map(s => s.id);
const roles = new Set(['lead', 'core', 'research', 'presentation', 'verifier']);
const expected = ['enol-frontend-slides','enol-design-review','enol-browser-check','enol-evidence-review','enol-debugging','enol-optimization','enol-geospatial','enol-pitch-video','enol-skill-eval'];
function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert.ok(match, 'missing YAML frontmatter');
  const name = match[1].match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
  const description = match[1].match(/^description:\s*"([^\n]+)"\s*$/m)?.[1];
  assert.ok(name && description && description.length < 1024, 'invalid metadata');
  return {name, description, header: match[1]};
}

test('ENOL has nine namespaced, self-contained skills with explicit roles', async () => {
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.integration, 'authored-enol-adaptations');
  assert.equal(registry.upstreamPackagesInstalled, false);
  assert.deepEqual([...ids].sort(), [...expected].sort());
  for (const s of registry.skills) {
    assert.match(s.id, /^enol-[a-z0-9-]+$/);
    assert.ok(s.roles.length && s.roles.every(r => roles.has(r)));
    const path = `.agents/skills/${s.id}/SKILL.md`;
    assert.equal((await lstat(resolve(root, path))).isSymbolicLink(), false);
    const content = await read(path);
    assert.equal(frontmatter(content).name, s.id);
    assert.match(content, /AGENTS\.md/);
    assert.match(content, /competition\/SKILLS\.md/);
    assert.ok(content.split('\n').length < 160, 'load only compact guidance');
  }
});

test('Claude entries point to the same existing canonical instructions', async () => {
  for (const s of registry.skills) {
    const path = `.claude/skills/${s.id}/SKILL.md`;
    const text = await read(path);
    const meta = frontmatter(text);
    assert.equal(meta.name, s.id);
    const target = text.match(/\[canonical ENOL skill\]\(([^)]+)\)/)?.[1];
    assert.ok(target);
    assert.equal(resolve(dirname(resolve(root,path)),target), resolve(root,`.agents/skills/${s.id}/SKILL.md`));
    assert.ok((await lstat(resolve(root,path))).isFile());
  }
});

test('optional skills cannot implicitly invoke themselves in either client', async () => {
  const optional = registry.skills.filter(s=>s.invocation==='explicit');
  assert.equal(optional.length,4);
  for (const s of registry.skills) {
    assert.ok(['explicit','contextual'].includes(s.invocation));
    const yaml = await read(`.agents/skills/${s.id}/agents/openai.yaml`);
    const implicit = yaml.match(/allow_implicit_invocation:\s*(true|false)/)?.[1];
    assert.equal(implicit, s.invocation==='explicit'?'false':'true');
    const claude = frontmatter(await read(`.claude/skills/${s.id}/SKILL.md`));
    assert.match(claude.header, new RegExp(`disable-model-invocation: ${s.invocation==='explicit'?'true':'false'}`));
    assert.doesNotMatch(yaml, /(?:^|\n)\s*(hooks|command|dependencies):/);
  }
});

test('reviewed upstream files have auditable content identities, not invented installs', () => {
  for (const {source} of registry.skills) {
    assert.match(source.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    assert.ok(source.path && !source.path.startsWith('/') && !source.path.split('/').includes('..'));
    assert.match(source.blobSha,/^[0-9a-f]{40}$/);
  }
});

test('only guidance and invocation metadata are shipped as skill files', async () => {
  for (const id of ids) {
    const base = `.agents/skills/${id}`;
    assert.deepEqual((await readdir(resolve(root,base))).sort(), ['SKILL.md','agents']);
    assert.deepEqual(await readdir(resolve(root,base,'agents')), ['openai.yaml']);
    assert.deepEqual(await readdir(resolve(root,'.claude','skills',id)), ['SKILL.md']);
  }
});

test('entry instructions route roles without replacing the collaboration approval gate', async () => {
  const agents = await read('AGENTS.md');
  const claude = await read('CLAUDE.md');
  const guide = await read('competition/SKILLS.md');
  assert.match(agents,/competition\/SKILLS\.md/);
  assert.match(agents,/Nezačínej měnit soubory.*výslovně/i);
  assert.match(claude,/AGENTS\.md/);
  for (const id of ids) assert.ok(guide.includes(id));
  assert.match(guide,/nejvýše třem současně/);
  assert.match(guide,/Neprokazuje chování modelu/);
});

test('behavioral eval specifications are explicitly unexecuted and include negative triggers', async () => {
  const evals = JSON.parse(await read('competition/skills-evals.json'));
  assert.equal(evals.executionStatus,'not_run');
  assert.equal(new Set(evals.cases.map(c=>c.id)).size,evals.cases.length);
  assert.ok(evals.cases.some(c=>c.skills.length===0));
  for (const c of evals.cases) {
    assert.ok(c.prompt && c.expected.length && c.reject.length);
    assert.ok(c.skills.every(id=>ids.includes(id)));
    assert.equal(Object.hasOwn(c,'result'),false);
  }
});
