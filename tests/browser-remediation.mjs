/** Regression stories for A03/A06/A07/A09 and the GitHub Pages publication path. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=fileURLToPath(new URL('..',import.meta.url));
const output=path.join(root,'artifacts/remediation');await fs.mkdir(output,{recursive:true});
const publicDir=path.join(root,'dist');
const digest=data=>createHash('sha256').update(data).digest('hex');
const result={checks:[],consoleErrors:[],performance:[],contrast:[]};
const check=(name,evidence)=>{result.checks.push({name,ok:true,evidence});console.log(`PASS ${name}`);};
let revision=1,interrupted=false,corrupt=false,stageWritten;
const scopeRevisions=new Map([['/alpha/',2],['/beta/',10]]);
const bodies=(version=revision)=>({'index.html':'<title>Offline regression</title>','a.json':JSON.stringify({snapshot:version,key:'a'}),'b.json':JSON.stringify({snapshot:version,key:'b'})});
const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.html':'text/html','.svg':'image/svg+xml','.csv':'text/csv'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  res.setHeader('Cache-Control','no-store');
  const testScope=['/offline-regression/',...scopeRevisions.keys()].find(scope=>pathname.startsWith(scope));
  if(testScope){
   const name=pathname.slice(testScope.length)||'index.html';
   if(name==='sw.js'){res.setHeader('Content-Type','text/javascript');return res.end(await fs.readFile(path.join(publicDir,'sw.js')));}
   const data=bodies(scopeRevisions.get(testScope)??revision);
   if(name==='offline-files.json'){
    const files=Object.entries(data).map(([path,body])=>({path,bytes:Buffer.byteLength(body),sha256:digest(body)}));
    res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({schemaVersion:2,snapshot:digest(JSON.stringify(files)),files}));
   }
   if(name==='b.json'&&interrupted){await stageWritten;res.writeHead(503);return res.end('planned second update failure');}
   if(data[name]){res.setHeader('Content-Type',name.endsWith('.json')?'application/json':'text/html');return res.end(corrupt&&name==='b.json'?'corrupt':data[name]);}
   res.writeHead(404);return res.end();
  }
  let relative=pathname.startsWith('/energomapa-cr/')?pathname.slice('/energomapa-cr/'.length):pathname.slice(1);
  if(!relative||relative.endsWith('/'))relative+='index.html';
  const file=path.resolve(publicDir,relative);
  if(!file.startsWith(publicDir+path.sep)){res.writeHead(403);return res.end();}
  const payload=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(payload);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
async function mapReady(page){await page.waitForFunction(()=>document.querySelector('#loading')?.hidden);}
async function bankReady(page){await page.locator('.bank-detail h2').waitFor();}
async function download(page,button,name){const pending=page.waitForEvent('download');await button.click();const d=await pending;const target=path.join(output,name);await d.saveAs(target);return fs.readFile(target,'utf8');}
async function prepare(page){return page.evaluate(async()=>{
 const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
 await navigator.serviceWorker.ready;
 const channel=new MessageChannel();
 return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('offline preparation timed out')),90000);channel.port1.onmessage=({data})=>{if(data.error||data.done){clearTimeout(timeout);resolve(data);}};(registration.active||registration.waiting).postMessage({type:'PREPARE_OFFLINE'},[channel.port2]);});
});}
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Europe/Prague',acceptDownloads:true});
 const page=await context.newPage();let requests=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>result.consoleErrors.push(String(e)));
 const started=performance.now();await page.goto(origin+'/energomapa-cr/');await mapReady(page);
 assert.ok(!requests.some(url=>url.includes('/data/databank/')));assert.ok(!requests.some(url=>url.includes('/geo/municipalities/')));
 const loadMs=performance.now()-started;assert.ok(loadMs<5000,`initial map ${loadMs}ms`);
 result.performance.push({initialMapMs:loadMs,requests:requests.length});check('lazy map startup',result.performance[0]);
 await page.screenshot({path:path.join(output,'desktop-map.png')});
 await page.getByRole('button',{name:'Přeshraniční toky',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.electricity-status')?.textContent.includes('Nejde o živá data'));
 const select=page.getByLabel('Datová sada elektřiny');await select.selectOption('eurostat-electricity-imp');
 await page.waitForFunction(()=>document.querySelector('.electricity-controls input')?.type==='number');
 const years=page.locator('.electricity-controls input[type=number]');assert.equal(await years.count(),2);
 for(const input of await years.all()){await input.fill('2010');await input.dispatchEvent('change');}
 const annual=JSON.parse(await download(page,page.getByRole('button',{name:'Export výběru JSON',exact:true}),'annual-2010.json'));
 assert.equal(annual.records.length,1);assert.equal(annual.records[0].time,'2010');assert.equal(annual.coverage.rows,1);
 check('A06 annual 2010 control and actual JSON download',annual.period);
 await select.selectOption('flows-physical');await page.waitForFunction(()=>document.querySelector('.electricity-controls input')?.type==='date');
 const dates=page.locator('.electricity-controls input[type=date]');
 for(const input of await dates.all()){await input.fill('2025-07-01');await input.dispatchEvent('change');}
 await page.locator('.electricity-borders input[value=DE]').uncheck();
 const filtered=JSON.parse(await download(page,page.getByRole('button',{name:'Export výběru JSON',exact:true}),'flows-24h-3-borders.json'));
 assert.equal(filtered.records.length,24);assert.equal(filtered.coverage.expectedValues,72);assert.equal(filtered.coverage.rows,24);assert.equal(filtered.originalCoverage.rows,16176);
 assert.equal(filtered.period.start,'2025-07-01T00:00:00Z');assert.equal(filtered.columns.length,3);
 const csv=await download(page,page.getByRole('button',{name:'Export výběru CSV',exact:true}),'flows-24h-3-borders.csv');
 const metadata=JSON.parse(csv.replace(/^\uFEFF/,'').split('\r\n')[0].slice('# metadata: '.length));assert.equal(metadata.coverage.expectedValues,72);assert.ok(metadata.source.license);
 const slider=page.getByLabel('Historické období toků');assert.equal(await slider.getAttribute('max'),'23');
 await slider.fill('0');await slider.dispatchEvent('input');const stamp=await page.locator('.electricity-timeline output').textContent();
 await page.getByRole('button',{name:'▶ Přehrát',exact:true}).click();await page.waitForFunction(s=>document.querySelector('.electricity-timeline output').textContent!==s,stamp);
 await page.getByRole('button',{name:'Ⅱ Pozastavit',exact:true}).click();check('A07 actual 24h/3-border exports and playback',filtered.coverage);
 await page.screenshot({path:path.join(output,'desktop-electricity.png'),fullPage:true});
 await page.getByRole('button',{name:'Databanka',exact:true}).click();await bankReady(page);
 assert.equal(await page.locator('.bank-dataset').count(),43);assert.ok(await page.locator('.bank-availability-note').isVisible());
 assert.ok(!(await page.locator('.bank-dataset').allTextContents()).some(text=>text.startsWith('OTE —')));
 await page.locator('.bank-dataset').filter({hasText:'MPO / ČSÚ — celková'}).click();await page.getByRole('heading',{name:'MPO / ČSÚ — celková energetická bilance ČR',exact:true}).waitFor();
 await page.locator('.bank-columns input[value=FC_E]').check();const range=page.locator('.bank-range select');await range.nth(0).selectOption('2024');await range.nth(1).selectOption('2024');await range.nth(2).selectOption('GWh');
 const mpo=JSON.parse(await download(page,page.getByRole('button',{name:'↓ Výběr JSON',exact:true}),'mpo-2024.json'));
 assert.equal(mpo.coverage.rows,1);assert.equal(mpo.coverage.numericCells,7);assert.equal(mpo.originalCoverage.rows,15);assert.equal(mpo.columns.length,7);
 const original=JSON.parse(await fs.readFile(path.join(publicDir,'data/databank/mpo-czech-energy-balance.json'),'utf8'));
 assert.ok(Math.abs(mpo.records[0].FC_E-original.records.find(row=>row.time==='2024').FC_E/3.6)<1e-6);
 check('A07 MPO actual 1-year/7-column export and conversion',mpo.coverage);
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 for(const state of ['normal','hover','selected']){
  const card=page.locator('.bank-dataset').nth(state==='selected'?await page.locator('.bank-dataset').allTextContents().then(rows=>rows.findIndex(text=>text.startsWith('MPO / ČSÚ'))):1);
  if(state==='hover')await card.hover();else await page.locator('.bank-heading h1').hover();
  const contrast=await card.evaluate(node=>{
   const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
   return [...node.querySelectorAll('span,small')].map(text=>{let parent=text,bg;while(parent){bg=getComputedStyle(parent).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)')break;parent=parent.parentElement;}const fg=getComputedStyle(text).color;return {fg,bg,ratio:(Math.max(luminance(fg),luminance(bg))+.05)/(Math.min(luminance(fg),luminance(bg))+.05)};});
  });
  assert.ok(contrast.every(item=>item.ratio>=4.5));result.contrast.push({state,values:contrast});
  const violations=await page.evaluate(async()=>{const r=await axe.run('.bank-catalog',{runOnly:{type:'rule',values:['color-contrast']}});return r.violations;});assert.deepEqual(violations,[]);
 }
 check('A09 computed contrast and axe normal/hover/selected',result.contrast);
 // The actual Eurostat selection must carry the disclaimer through both downloads.
 await page.locator('.bank-dataset').filter({hasText:'Dovoz elektřiny — evropské'}).click();
 await page.getByRole('heading',{name:'Dovoz elektřiny — evropské srovnání',exact:true}).waitFor();
 assert.ok(await page.getByText('Eurostat is not responsible', {exact:false}).isVisible());
 const euroRange=page.locator('.bank-range select');await euroRange.nth(0).selectOption('2010');await euroRange.nth(1).selectOption('2010');await euroRange.nth(2).selectOption('MWh');
 for(const input of await page.locator('.bank-columns input').all())if(await input.inputValue()!=='CZ')await input.uncheck();
 const euroJSON=JSON.parse(await download(page,page.getByRole('button',{name:'↓ Výběr JSON',exact:true}),'eurostat-cz-2010-mwh.json'));
 const euroCSV=await download(page,page.getByRole('button',{name:'↓ Výběr CSV',exact:true}),'eurostat-cz-2010-mwh.csv');
 const euroMeta=JSON.parse(euroCSV.replace(/^\uFEFF/,'').split('\r\n')[0].slice('# metadata: '.length));
 assert.deepEqual(euroJSON.records,[{time:'2010',CZ:6642000}]);assert.equal(euroJSON.source.disclaimer,euroMeta.source.disclaimer);assert.match(euroMeta.source.disclaimer,/Eurostat is not responsible/);assert.ok(euroMeta.source.modifications);assert.match(euroCSV,/2010,6642000/);
 assert.deepEqual(euroMeta.qualityFlags,euroJSON.qualityFlags);check('R03 actual 2010 CZ 6642 GWh to 6642000 MWh CSV/JSON with disclaimer',euroJSON.records);
 await page.screenshot({path:path.join(output,'desktop-databank.png'),fullPage:true});
 // Every public dataset must render through the lazy catalog without JS errors.
 const cards=page.locator('.bank-dataset');
 for(let i=0;i<43;i++){
  const title=await cards.nth(i).locator('strong').textContent();await cards.nth(i).click();await page.waitForFunction(title=>document.querySelector('.bank-detail h2')?.textContent===title,title);
  // Exercise all palette entries (PVGIS has 15 series) and the visible workspace.
  for(const input of await page.locator('.bank-columns input').all())await input.check();
  const contrast=await page.locator('.bank-chart-legend > span').evaluateAll(nodes=>nodes.map(node=>{
   const linear=value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;};
   const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(linear);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
   let parent=node,bg;while(parent){bg=getComputedStyle(parent).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)')break;parent=parent.parentElement;}
   const color=getComputedStyle(node).color,foreground=luminance(color),background=luminance(bg);
   return {color,bg,ratio:(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05)};
  }));
  assert.ok(contrast.every(item=>item.ratio>=4.5),`${title}: ${JSON.stringify(contrast)}`);result.contrast.push({dataset:title,legend:contrast});
  if(title.includes('plánované')){
   for(const state of ['normal','hover','focus','filtered']){
    const target=page.locator('.bank-chart-legend > span').nth(1);
    if(state==='hover')await target.hover();
    if(state==='focus')await page.locator('.bank-columns input').first().focus();
    if(state==='filtered')await page.locator('.bank-columns input').first().uncheck();
    const violations=await page.evaluate(async()=>{const r=await axe.run('.databank-panel',{runOnly:{type:'rule',values:['color-contrast']}});return r.violations;});assert.deepEqual(violations,[],state);
   }
  }
 }
 check('all 43 public datasets render',43);
 check('R04 every legend palette color and visible planned-flow workspace contrast',result.contrast.length);
 await page.getByRole('button',{name:'Mapa obcí',exact:true}).click();await page.getByLabel('Vyhledat obec').fill('Děčín');await page.locator('#search-results button').first().click();
 await page.waitForFunction(()=>document.querySelector('#territory-title')?.textContent.includes('Děčín'));assert.ok(requests.some(url=>url.includes('/geo/municipalities/CZ042')));check('municipal search and region load','Děčín CZ042');
 const ready=await prepare(page);assert.equal(ready.done,true);check('complete application snapshot',ready);
 await context.setOffline(true);await page.goto(origin+'/energomapa-cr/?offline=1#databank');await bankReady(page);
 await page.getByRole('button',{name:'Mapa obcí',exact:true}).click();await mapReady(page);await page.getByLabel('Vyhledat obec').fill('Liberec');await page.locator('#search-results button').first().click();await page.waitForFunction(()=>document.querySelector('#territory-title')?.textContent.includes('Liberec'));
 await page.getByRole('button',{name:'Přeshraniční toky',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.electricity-status')?.textContent.includes('Nejde o živá data'));await page.getByLabel('Datová sada elektřiny').selectOption('flows-commercial');
 await page.waitForFunction(()=>document.querySelector('.electricity-source strong')?.textContent.includes('plánované'));check('Pages subpath online to offline navigation, map and new dataset','Liberec + flows-commercial');
 const offlineExport=JSON.parse(await download(page,page.getByRole('button',{name:'Export výběru JSON',exact:true}),'offline-commercial.json'));
 assert.equal(offlineExport.id,'flows-commercial');assert.ok(offlineExport.records.length>0);assert.equal(offlineExport.columns.length,4);
 await page.getByRole('button',{name:'▶ Přehrát',exact:true}).click();await page.getByRole('button',{name:'Ⅱ Pozastavit',exact:true}).click();check('offline planned-flow export and playback',offlineExport.coverage);
 await page.screenshot({path:path.join(output,'offline-subpath.png'),fullPage:true});await context.close();
 // Also prepare and cold-navigate the actual app at the domain root.
 const rootContext=await browser.newContext();const rootPage=await rootContext.newPage();await rootPage.goto(origin+'/');await mapReady(rootPage);assert.equal((await prepare(rootPage)).done,true);await rootContext.setOffline(true);await rootPage.goto(origin+'/?offline=1#databank');await bankReady(rootPage);check('domain root offline cold navigation',43);await rootContext.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,timezoneId:'Europe/Prague'});const mp=await mobile.newPage();mp.on('pageerror',e=>result.consoleErrors.push(String(e)));await mp.goto(origin+'/energomapa-cr/');await mapReady(mp);
 for(const workspace of ['map','electricity','databank']){
  await mp.locator(`[data-workspace=${workspace}]`).click();
  if(workspace==='databank')await bankReady(mp);if(workspace==='electricity')await mp.waitForFunction(()=>document.querySelector('.electricity-status')?.textContent.includes('Nejde o živá data'));
  assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mp.screenshot({path:path.join(output,`mobile-${workspace}.png`),fullPage:true});
 }
 await mp.locator('.bank-dataset').filter({has:mp.getByText('Obchodní výměna ČR · plánované toky ČEPS',{exact:true})}).click();await mp.waitForFunction(()=>document.querySelector('.bank-detail h2')?.textContent.includes('plánované'));
 await mp.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const mobileContrast=await mp.evaluate(async()=>{const r=await axe.run('.databank-panel',{runOnly:{type:'rule',values:['color-contrast']}});return r.violations;});assert.deepEqual(mobileContrast,[]);check('R04 mobile planned-flow workspace contrast',true);
 check('mobile 390x844 map/electricity/catalog, no page overflow',true);await mobile.close();
 // Independent registrations must coexist in ONE BrowserContext / CacheStorage.
 const shared=await browser.newContext();const alpha=await shared.newPage(),beta=await shared.newPage();
 await alpha.goto(origin+'/alpha/');assert.equal((await prepare(alpha)).done,true);
 await beta.goto(origin+'/beta/');assert.equal((await prepare(beta)).done,true);
 const values=page=>page.evaluate(()=>Promise.all(['a.json','b.json'].map(async name=>(await(await fetch(name)).json()).snapshot)));
 const state=page=>page.evaluate(async()=>{const scope=new URL('./',location.href).href;const prefix='energomapa-v3:'+encodeURIComponent(scope)+':';const pointer=await(await(await caches.open(prefix+'state')).match(scope+'__offline_active__')).json();return {pointer,entries:(await(await caches.open(pointer.cache)).keys()).length,caches:(await caches.keys()).filter(name=>name.startsWith(prefix))};});
 const betaBefore=await state(beta);
 await shared.setOffline(true);assert.deepEqual(await values(alpha),[2,2]);assert.deepEqual(await values(beta),[10,10]);
 await shared.setOffline(false);
 for(const version of [3,4,5]){scopeRevisions.set('/alpha/',version);assert.equal((await prepare(alpha)).done,true);}
 assert.deepEqual(await state(beta),betaBefore);assert.equal((await state(alpha)).caches.filter(name=>name.includes(':snapshot:')).length,2);
 await shared.setOffline(true);assert.deepEqual(await values(alpha),[5,5]);assert.deepEqual(await values(beta),[10,10]);
 await alpha.reload();await beta.reload();assert.deepEqual(await values(alpha),[5,5]);assert.deepEqual(await values(beta),[10,10]);
 check('R02 alpha/beta same BrowserContext offline and after three alpha cleanups',{alpha:await state(alpha),beta:await state(beta)});await shared.close();
 // Real CacheStorage and a real HTTP 503 after new a.json reaches staging.
 const failureContext=await browser.newContext();const fp=await failureContext.newPage();await fp.goto(origin+'/offline-regression/');assert.equal((await prepare(fp)).done,true);
 const pointer=()=>fp.evaluate(async()=>await(await(await caches.open('energomapa-v3:'+encodeURIComponent(new URL('./',location.href).href)+':state')).match(new URL('__offline_active__',location.href))).text());const before=await pointer();
 revision=2;interrupted=true;
 stageWritten=(async()=>{for(let attempt=0;attempt<400;attempt++){const staged=await fp.evaluate(async()=>{for(const key of await caches.keys()){if(!key.startsWith('energomapa-v3:'+encodeURIComponent(new URL('./',location.href).href)+':snapshot:'))continue;const saved=await(await caches.open(key)).match(new URL('a.json',location.href));if(saved&&(await saved.json()).snapshot===2)return true;}return false;});if(staged)return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('new a.json never staged');})();
 const failure=await prepare(fp);assert.match(failure.error,/503/);assert.equal(await pointer(),before);check('A03 actual browser interrupted second update',failure);
 await failureContext.setOffline(true);assert.deepEqual(await fp.evaluate(async()=>Promise.all(['a.json','b.json'].map(async name=>(await(await fetch(name)).json()).snapshot))),[1,1]);
 await failureContext.setOffline(false);interrupted=false;corrupt=true;assert.match((await prepare(fp)).error,/integrita/);assert.equal(await pointer(),before);
 await failureContext.setOffline(true);assert.deepEqual(await fp.evaluate(async()=>Promise.all(['a.json','b.json'].map(async name=>(await(await fetch(name)).json()).snapshot))),[1,1]);
 await failureContext.setOffline(false);corrupt=false;assert.equal((await prepare(fp)).done,true);await failureContext.setOffline(true);assert.deepEqual(await fp.evaluate(async()=>Promise.all(['a.json','b.json'].map(async name=>(await(await fetch(name)).json()).snapshot))),[2,2]);check('A03 hash rejection and successful atomic recovery',[2,2]);await failureContext.close();
 assert.deepEqual(result.consoleErrors,[]);check('browser console errors',0);
}catch(error){result.failure=String(error.stack||error);throw error;}
finally{await fs.writeFile(path.join(output,'browser-results.json'),JSON.stringify(result,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));}
