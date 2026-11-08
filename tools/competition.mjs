#!/usr/bin/env node
/** Small local utilities, not an agent/workflow. Run from anywhere in the repo. */
import {readFile,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {MetricEngine} from '../public/js/engine.mjs';
import {annualPV,validateDeck,safeLocalURL} from '../public/prezentace/math.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const load=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const manifest=await load('public/data/manifest.json');
const territories=await load('public/data/territories.json');
const deck=validateDeck(await load('public/prezentace/deck.json'));
const cell=v=>String(v??'—').replaceAll('|','/').replaceAll('\n',' ');
const e=new MetricEngine(manifest,territories,{baseURL:'public/data/',fetchJSON:load});
async function check(){
  for(const s of deck.slides){
    if(s.type==='chart'){
      const m=e.metric(s.metric);if(!e.territories.has(s.territory))throw Error(`Neznámé území ${s.territory}`);
      if(!m.normalizations.includes(s.normalization||'absolute'))throw Error('Nepodporovaný přepočet grafu.');
      if(m.status==='unavailable')throw Error(`Graf používá nedostupnou metriku ${m.id}`);
      await e.prepare(m.id,s.normalization||'absolute');
    }
    if(s.type==='map'){
      const frame=deck.frames?.[s.frame];if(!frame)throw Error(`Neznámý frame ${s.frame}`);
      const u=new URL(safeLocalURL(frame.url,'https://local.test/energomapa-cr/prezentace/'));
      const relative=u.pathname.replace(/^\/energomapa-cr\//,'');
      if(!u.pathname.startsWith('/energomapa-cr/'))throw Error('Frame nesmí opustit projektovou podcestu.');
      await access(resolve(root,'public',relative,relative.endsWith('/')||!relative?'index.html':''));
      const metric=u.searchParams.get('metric');if(metric)e.metric(metric);
    }
  }
  const seconds=deck.slides.reduce((sum,s)=>sum+s.seconds,0);
  if(seconds>deck.targetSeconds)throw Error(`Rozpočet ${seconds} s překračuje ${deck.targetSeconds} s.`);
  for(const file of ['AGENTS.md','competition/README.md','competition/DESIGN_SYSTEM.md','competition/PRESENTATION_GUIDE.md','competition/DATA_PLAYBOOK.md','competition/METHODS.md','competition/templates/project.md','public/prezentace/index.html']) await access(resolve(root,file));
  console.log(`OK: ${deck.slides.length} snímků, ${seconds}/${deck.targetSeconds} sekund, ${manifest.metrics.filter(m=>m.status==='verified').length} ověřených metrik. Původ a omezení jsou v manifestech.`);
}
async function catalog(){
  const db=await load('public/data/databank/index.json');
  const lines=['# Datový katalog pro soutěž','',`Generováno z veřejných manifestů verze ${manifest.version}; obnovit: \`node tools/competition.mjs catalog --write\`. Nikoli živá data. Zdrojové registry a metodiky mají přednost.`, '', '## Mapové metriky','', '| ID | Název | Jednotka | Období / typ | Stav | Zdroj |','|---|---|---|---|---|---|'];
  for(const m of manifest.metrics){const ys=m.years||[];lines.push(`| ${m.id} | ${cell(m.name)} | ${cell(m.unit)} | ${cell(m.source?.referencePeriod || (ys.length?`${ys[0]}${ys.length>1?'–'+ys.at(-1):''}`:'—'))} / ${m.timeType} | ${m.status} | ${cell(m.source?.provider||m.source?.name)} |`);}
  lines.push('', 'Územní rozlišení, agregace, normalizace, licence a omezení jsou pro každou metriku v `public/data/manifest.json` a `public/data/sources.json`. Hodnoty: `public/data/<metric.path>`. Bodové vrstvy: `manifest.points`. Neupravovat generovaná data ručně.', '', '## Časové řady databanky','', '| ID | Název | Jednotka | Období | Poskytovatel |','|---|---|---|---|---|');
  for(const d of db.datasets||[]) lines.push(`| ${cell(d.id)} | ${cell(d.title)} | ${cell(d.unit)} | ${cell(d.period?.start)} → ${cell(d.period?.end)} | ${cell(d.source?.publisher)} |`);
  lines.push('', 'Podrobné frekvence, datové cesty a licence: `public/data/databank/index.json`. Vyloučené zdroje zůstávají v jeho `excludedSources`; katalog je nepřidává ani nepovoluje jejich publikaci. OTE není automaticky součástí této sady.','', '## Rychlé odkazy v místní aplikaci','', '- `/prezentace/`: soutěžní šablona','- `/`: mapa obcí','- `/#electricity`: přeshraniční toky','- `/#databank`: databanka a exporty','', 'Na GitHub Pages zachovat prefix `/energomapa-cr/`; používat relativní odkazy.','');
  const text=lines.join('\n');if(process.argv.includes('--write')){await writeFile(resolve(root,'competition/DATA_CATALOG.md'),text);console.log('Zapsáno competition/DATA_CATALOG.md');}else console.log(text);
}
async function exercise(){
  const town=[...e.territories.values()].find(t=>t.level==='municipality'&&t.name==='Roudnice nad Labem');
  if(!town)throw Error('Roudnice není v územním katalogu.');
  const metric=e.metric('solar_potential_kwh_kwp_year');await e.load(metric.id);
  const result=e.value(metric.id,town.id,metric.years.at(-1));if(!Number.isFinite(result.value))throw Error('Chybí PVGIS výnos.');
  console.log(JSON.stringify({exercise:'Trénink, nikoli doporučení investice',territory:town.name,code:town.id,source:metric.source,assumption:{capacityKwp:100},specificYield:result.value,modelledAnnualKwh:annualPV({capacityKwp:100,specificYield:result.value}),limits:'Bez hodinové spotřeby, střechy, připojení a cen nelze tvrdit soběstačnost ani návratnost.'},null,2));
}
try{const command=process.argv[2]||'check';if(command==='check')await check();else if(command==='catalog')await catalog();else if(command==='exercise')await exercise();else throw Error('Použití: node tools/competition.mjs check|catalog [--write]|exercise');}catch(error){console.error(error.message);process.exitCode=1;}
