import {MetricEngine, format} from '../js/engine.mjs';
import {economics, validateDeck, safeLocalURL} from './math.mjs';

const $ = id => document.getElementById(id);
function element(tag, text, cls) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; }
async function json(url) { const r = await fetch(url); if (!r.ok) throw Error(`Nelze načíst ${url} (${r.status}).`); return r.json(); }
let deck, current = -1, enginePromise, elapsed = 0, started = null;
const frames = new Map(), chartJobs = new Map(), slideNodes = [];
const dataURL = new URL('../data/', import.meta.url).href;
function engine() {
  if (!enginePromise) enginePromise = Promise.all([json(dataURL + 'manifest.json'),json(dataURL + 'territories.json')]).then(([manifest,territories]) => new MetricEngine(manifest,territories,{baseURL:dataURL})).catch(e => {enginePromise = null; throw e;});
  return enginePromise;
}
function fail(message) { $('error').hidden = false; $('error').textContent = message; }
function svg(tag, attributes = {}, text) { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k,v] of Object.entries(attributes)) n.setAttribute(k,String(v)); if (text !== undefined) n.textContent = text; return n; }
function plot(series, unit) {
  const root = svg('svg',{viewBox:'0 0 1050 350',role:'img',class:'chart'});
  root.append(svg('title',{},`Hodnoty: ${unit}. Hodnoty jsou také v tabulce pod grafem.`));
  const finite = series.filter(x => Number.isFinite(x.value));
  if (!finite.length) {root.append(svg('text',{x:70,y:180},'Pro tento výběr nejsou data.')); return root;}
  const lo = Math.min(0,...finite.map(x=>x.value)), hi = Math.max(0,...finite.map(x=>x.value));
  const min = lo, max = hi === lo ? hi + 1 : hi;
  const x = i => 120 + i / Math.max(1,series.length - 1) * 865;
  const y = v => 286 - (v - min) / (max - min) * 242;
  for (let i=0;i<=4;i++) {
    const v=min+(max-min)*i/4;
    root.append(svg('line',{x1:120,x2:1005,y1:y(v),y2:y(v),stroke:'#DFE5EE'}));
    root.append(svg('text',{x:108,y:y(v)+5,'text-anchor':'end'},format(v,0)));
  }
  const step = Math.max(1,Math.ceil(series.length/10));
  series.forEach((p,i)=>{
    if (i%step===0 || i===series.length-1) root.append(svg('text',{x:x(i),y:322,'text-anchor':'middle'},p.year));
    if (!Number.isFinite(p.value)) return;
    const dot=svg('circle',{cx:x(i),cy:y(p.value),r:6,fill:'#173DA5',tabindex:0});
    dot.append(svg('title',{},`${p.year}: ${format(p.value)} ${unit}`)); root.append(dot);
  });
  return root;
}
async function hydrateChart(slide, node) {
  if (chartJobs.has(slide.id)) return chartJobs.get(slide.id);
  const work = (async()=>{
    const box=node.querySelector('.chart-panel'); box.replaceChildren(element('p','Načítání skutečných dat…','muted'));
    try {
      const e=await engine(), m=e.metric(slide.metric), norm=slide.normalization || 'absolute';
      if (!e.territories.has(slide.territory)) throw Error(`Neznámé území ${slide.territory}`);
      if (!m.normalizations.includes(norm)) throw Error('Metrika nepodporuje tuto normalizaci.');
      await e.prepare(slide.metric,norm);
      const series=e.series(slide.metric,slide.territory,norm), last=series.filter(p=>Number.isFinite(p.value)).at(-1), unit=e.unit(slide.metric,norm);
      box.replaceChildren();
      const top=element('div',undefined,'chart-top'); top.append(element('h2',`${e.territories.get(slide.territory).name} · ${m.name}`));
      top.append(element('span',last ? `${format(last.value)} ${unit}` : 'Bez dat','metric-value'));
      const shownSeries=m.timeType==='static'?series.map(p=>({...p,year:m.source?.referencePeriod||'Model'})):series;
      box.append(top,plot(shownSeries,unit));
      const source=element('p',undefined,'source-note');
      const provider=element('a',m.source?.name || m.source?.provider || 'Zdroj');
      const url=m.sourceUrl || m.source?.url;
      if (url && /^https?:\/\//i.test(url)) {provider.href=url;provider.target='_blank';provider.rel='noopener noreferrer';}
      const sourcePeriod=m.timeType==='static' ? `model ${m.source?.referencePeriod || 'referenční období neuvedeno'}` : `${m.years[0]}${m.years.length>1?'–'+m.years.at(-1):''}`;
      source.append(provider,document.createTextNode(` · ${sourcePeriod} · ${{timeseries:'časová řada',snapshot:'snímek',static:'model'}[m.timeType]||m.timeType}`));
      if (last?.partial) source.append(document.createTextNode(` · dílčí pokrytí ${last.coverage}/${last.expected}`));
      if (norm!=='absolute') source.append(document.createTextNode(` · normalizace: ${norm}, referenční jmenovatel viz manifest`));
      box.append(source);
      const limits=element('details',undefined,'chart-details');limits.append(element('summary','Omezení a přesné hodnoty'));
      limits.append(element('p',(m.limitations || m.source?.limitations || []).join(' ')));
      const table=element('table');const header=element('tr');for(const label of [m.timeType==='static'?'Referenční období':'Rok','Hodnota','Pokrytí obcí']) header.append(element('th',label));table.append(header);
      for(const p of series) {const row=element('tr');row.append(element('td',m.timeType==='static'?(m.source?.referencePeriod||'Model'):String(p.year)),element('td',`${format(p.value)} ${unit}`),element('td',p.coverage===null?'Přímý údaj':`${p.coverage}/${p.expected}`));table.append(row);}limits.append(table);box.append(limits);
    } catch(error) {box.replaceChildren(element('p',error.message,'warning'));const retry=element('button','Zkusit znovu');retry.onclick=()=>{chartJobs.delete(slide.id);hydrateChart(slide,node);};box.append(retry);}
  })();chartJobs.set(slide.id,work);return work;
}
function economicsForm(node) {
  const grid=element('div',undefined,'econ-layout'), form=element('form',undefined,'econ-form'), result=element('div',undefined,'econ-results');result.setAttribute('aria-live','polite');
  const fields=[['capex','Investice [Kč]','0','any'],['annualBenefit','Roční hrubý přínos [Kč/rok]','0','any'],['annualOpex','Roční provozní náklady [Kč/rok]','0','any'],['years','Horizont [roky]','1','1'],['discountRate','Diskont [%/rok]','0','any']];
  for(const [name,label,min,step] of fields) {const l=element('label',label), input=element('input');input.type='number';input.name=name;input.required=true;input.min=min;input.step=step;input.placeholder='Doložený předpoklad';if(name==='years') input.max='100';l.append(input);form.append(l);}
  const run=element('button','Spočítat variantu','primary');run.type='submit';form.append(run);result.append(element('p','Vyplňte vlastní vstupy. Žádné ceny ani úspory nejsou předpokládané.'));
  form.onsubmit=event=>{event.preventDefault();try {const data=Object.fromEntries(new FormData(form));for(const k of Object.keys(data)) data[k]=Number(data[k]);data.discountRate/=100;const r=economics(data);result.replaceChildren();for(const [label,v] of [['Čistý roční přínos',`${format(r.netAnnual,0)} Kč/rok`],['Čistá současná hodnota (NPV)',`${format(r.npv,0)} Kč`],['Prostá návratnost',r.simplePaybackYears===null?'Nevrací se':`${format(r.simplePaybackYears,1)} let`]]) {const p=element('p',label);p.append(element('strong',v));result.append(p);}if(!r.returnedWithinHorizon) result.append(element('p','Investice se ve zvoleném horizontu prostě nevrátí.','warning'));}catch(error){result.replaceChildren(element('p',error.message,'warning'));}};
  grid.append(form,result);node.append(grid,element('p','Zjednodušený model se stálým ročním cashflow. Nezahrnuje automaticky daně, financování, degradaci, náhrady zařízení ani dotace. Přínos není totéž co cena veškeré vyrobené energie. Všechny vstupy doložte v projektové evidenci.','footnote'));
}
function createSlide(slide) {
  const node=element('article',undefined,`slide ${slide.type==='title'?'title-slide':''}`);node.id=`slide-${slide.id}`;node.hidden=true;node.setAttribute('aria-label',slide.title.replaceAll('\n',' '));
  if(slide.type==='map') {node.append(element('h1',slide.title));node.append(element('p','Živá mapa není součástí statického tisku. Pro odevzdání vložte ověřený snímek mapy se zdrojem, jednotkou, rokem a legendou.','print-map-note'));return node;}
  if(slide.type==='title') node.append(element('div',undefined,'hero-rule'));
  node.append(element('h1',slide.title));if(slide.lead) node.append(element('p',slide.lead,'lead'));
  if(slide.type==='chart') node.append(element('div',undefined,'chart-panel'));
  if(slide.items) {const cards=element('div',undefined,'cards');slide.items.forEach((item,i)=>{const card=element('section',undefined,'card');if(slide.type==='steps') card.append(element('span',String(i+1).padStart(2,'0'),'card-number'));card.append(element('h2',item.title),element('p',item.text));cards.append(card);});node.append(cards);}
  if(slide.type==='economics') economicsForm(node);
  return node;
}
function pauseFrame(frame) {try {const doc=frame.contentDocument;if(!doc)return;for(const m of doc.querySelectorAll('video,audio')) m.pause();for(const b of doc.querySelectorAll('button')) if(/pozastavit/i.test((b.getAttribute('aria-label')||'')+' '+b.textContent)) b.click();frame.contentWindow.dispatchEvent(new CustomEvent('workspacechange',{detail:'presentation-paused'}));}catch{/* Cross-origin contents are not supported. */}}
function mountFrame(id) {
  if(frames.has(id))return frames.get(id);
  const config=deck.frames?.[id];if(!config)throw Error(`Chybí frame ${id}`);
  const wrapper=element('div',undefined,'frame-wrap');wrapper.hidden=true;
  const status=element('p','Načítání živé mapy…','frame-status');const iframe=element('iframe');iframe.title=config.title||'Živá mapa';iframe.src=safeLocalURL(config.url,location.href);iframe.allow='fullscreen';
  const error=element('p',undefined,'frame-error');error.hidden=true;error.append(document.createTextNode('Mapa se ještě nenačetla. Ověřte místní server nebo otevřete samostatnou mapu. '));const link=element('a','Otevřít mapu');link.href=iframe.src;link.target='_blank';link.rel='noopener';error.append(link);
  const timeout=setTimeout(()=>{error.hidden=false;},15000);
  iframe.addEventListener('load',()=>{clearTimeout(timeout);status.hidden=true;error.hidden=true;try{const doc=iframe.contentDocument;if(!doc?.getElementById('map')){error.hidden=false;error.firstChild.textContent='Vložená stránka není očekávaná mapa. ';return;}doc.addEventListener('keydown',handleKey,true);if(wrapper.hidden)pauseFrame(iframe);}catch{error.hidden=false;}});
  iframe.addEventListener('error',()=>{clearTimeout(timeout);status.hidden=true;error.hidden=false;});wrapper.append(status,error,iframe);$('frame-host').append(wrapper);const obj={wrapper,iframe};frames.set(id,obj);return obj;
}
function stopTimer(){if(started!==null){elapsed+=performance.now()-started;started=null;}renderTimer();}
function renderTimer(){const ms=elapsed+(started===null?0:performance.now()-started), sec=Math.floor(ms/1000), target=deck?.targetSeconds||300;const f=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;$('timer').textContent=`${started===null?'▶':'Ⅱ'} ${f(sec)} / ${f(target)}`;$('timer').classList.toggle('over',sec>target);}
function go(index) {if(!deck)return;if(index<0||index>=deck.slides.length)return;location.hash=`prezentace/${index+1}`;route();}
function route() {
  if(!deck)return;const match=location.hash.match(/^#prezentace\/(\d+)$/);const index=match?Math.max(0,Math.min(deck.slides.length-1,Number(match[1])-1)):-1;
  const inData=location.hash==='#prohlidka';$('home').hidden=index>=0||inData;$('data-browser').hidden=!inData;$('presentation').hidden=index<0;
  if(index===current&&index>=0)return;
  for(const {wrapper,iframe} of frames.values()) {if(!wrapper.hidden) pauseFrame(iframe);wrapper.hidden=true;}
  slideNodes.forEach((n,i)=>{n.hidden=i!==index;});current=index;$('frame-host').hidden=true;$('deck-brand').hidden=false;
  if(index<0){stopTimer();return;}
  const slide=deck.slides[index];$('stage').scrollTop=0;
  if(slide.type==='map') {try {const frame=mountFrame(slide.frame);frame.wrapper.hidden=false;$('frame-host').hidden=false;$('deck-brand').hidden=true;frame.iframe.contentWindow?.dispatchEvent(new Event('resize'));}catch(e){fail(e.message);}}
  if(slide.type==='chart') hydrateChart(slide,slideNodes[index]);
  const next=deck.slides[index+1];if(next?.type==='map')try{mountFrame(next.frame);}catch(e){fail(e.message);}
  $('counter').textContent=`${index+1} / ${deck.slides.length}`;$('previous').disabled=index===0;$('next').disabled=index===deck.slides.length-1;$('progress').style.width=`${(index+1)/deck.slides.length*100}%`;
}
function handleKey(event) {
  const doc=event.target?.ownerDocument||document;
  if(event.defaultPrevented||event.repeat||event.altKey||event.ctrlKey||event.metaKey||doc.querySelector('dialog[open]')||event.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="slider"],[role="textbox"]'))return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();location.hash='';route();return;}
  if(current<0)return;
  if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End','f','F'].includes(event.key)){event.preventDefault();event.stopPropagation();}else return;
  if(['ArrowRight','PageDown'].includes(event.key))go(current+1);
  if(['ArrowLeft','PageUp'].includes(event.key))go(current-1);
  if(event.key==='Home')go(0);if(event.key==='End')go(deck.slides.length-1);
  if(event.key.toLowerCase()==='f')fullscreen();
}
async function fullscreen(){try {if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{fail('Prohlížeč odmítl fullscreen. Použijte jeho režim celé obrazovky.');}}
$('start').onclick=()=>go(0);$('browse').onclick=()=>{location.hash='prohlidka';route();};$('back-home').onclick=()=>{location.hash='';route();};$('previous').onclick=()=>go(current-1);$('next').onclick=()=>go(current+1);$('fullscreen').onclick=fullscreen;
$('timer').onclick=()=>{if(started===null)started=performance.now();else stopTimer();renderTimer();};$('reset-timer').onclick=()=>{elapsed=0;started=null;renderTimer();};
$('download-notes').onclick=()=>{if(!deck)return;const text=deck.slides.map((s,i)=>`## ${i+1}. ${s.title.replaceAll('\n',' ')} (${s.seconds} s)\n\n${s.notes||''}\n`).join('\n');const a=element('a');a.href=URL.createObjectURL(new Blob([`# ${deck.title}\n\n${text}`],{type:'text/markdown;charset=utf-8'}));a.download='pitch-poznamky.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
window.addEventListener('hashchange',route);document.addEventListener('keydown',handleKey);document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTimer();for(const f of frames.values())pauseFrame(f.iframe);}});setInterval(renderTimer,250);
try {deck=validateDeck(await json('./deck.json'));document.title=`${deck.title} · ${deck.team}`;$('deck-brand').replaceChildren(element('span',deck.team),element('br'),element('span',deck.projectLabel||deck.title));document.querySelector('.wordmark').textContent=deck.team;$('template-notice').hidden=!deck.template;for(const [i,s] of deck.slides.entries()){const n=createSlide(s);slideNodes.push(n);$('slides').append(n);const b=element('button',`${i+1}. ${s.title.replaceAll('\n',' ')}`);b.onclick=()=>go(i);$('outline').append(b);}route();renderTimer();}catch(error){fail(error.message);$('start').disabled=true;}
