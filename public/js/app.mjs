import {MetricEngine, calendarYears, finite, format} from './engine.mjs?v=0.4.0';
import {createEnergyMap} from './map.mjs?v=0.4.0';
import {renderTimeChart} from './chart.mjs?v=0.4.0';
import {EnergyProfile} from './profile.mjs?v=0.4.0';
import {PointLayerStore} from './points.mjs?v=0.4.0';

const $ = id => document.getElementById(id);
const escapeHTML = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const fold = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const statusNames = {verified: 'Zdrojová data', demo: 'DEMO · ilustrační data', unavailable: 'Data zatím nejsou připojena'};
const categoryNames = {demography: 'Obyvatelstvo a domácnosti', context: 'Obyvatelstvo a domácnosti', electricity: 'Elektřina', renewables: 'Obnovitelné zdroje', solar: 'Solární energie', storage: 'Akumulace', heating: 'Teplo', heat: 'Teplo', mobility: 'Elektromobilita', transport: 'Elektromobilita', industry: 'Průmysl', emissions: 'Emise', potential: 'Potenciál', network: 'Síť'};
const cache = new Map(), pending = new Map();
let manifest, engine, map, energyProfile, pointLayers, selectedGeometry = null, timer = null, metricRequest = 0, territoryRequest = 0, normalizationRequest = 0;
let state = {metric: null, normalization: 'absolute', mode: 'value', year: null, selectedId: 'CZ', regionId: null, playing: false, speed: 1};

async function json(path) {
  if (cache.has(path)) return cache.get(path);
  if (pending.has(path)) return pending.get(path);
  const promise = fetch(path).then(async response => {
    if (!response.ok) throw Error(`Soubor ${path} nelze načíst (${response.status}).`);
    const data = await response.json(); cache.set(path, data); return data;
  }).finally(() => pending.delete(path));
  pending.set(path, promise); return promise;
}

function notice(message = '', retry) {
  $('notice').replaceChildren(); $('notice').hidden = !message;
  if (!message) return;
  $('notice').append(document.createTextNode(message));
  if (retry) {const button = document.createElement('button'); button.textContent = 'Zkusit znovu'; button.addEventListener('click', retry); $('notice').append(' ', button);}
}
const metric = () => engine.metric(state.metric);
const territory = () => engine.territories.get(state.selectedId);
const color = () => {
  const colors = manifest.colorScales[metric().colorScale];
  return colors?.at(-1) || '#173da5';
};
const isTimeSeries = () => (metric().timeType || (metric().years.length > 1 ? 'timeseries' : 'snapshot')) === 'timeseries';
const availableYears = () => isTimeSeries() ? calendarYears(metric().years) : metric().years;
const sourceOf = m => m.source || {};
function dateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('cs-CZ', {timeZone: 'UTC'}).format(date);
}
function periodLabel() {
  const m = metric(), source = sourceOf(m);
  if (!m.years.length) return 'Časová řada není dostupná';
  if (m.timeType === 'static') return `Model · ${m.referencePeriod || source.referencePeriod || 'referenční období'}`;
  if (m.years.length === 1 && (m.asOf || source.asOf)) return `Stav k ${dateLabel(m.asOf || source.asOf)}`;
  return `${m.years.length === 1 ? 'Stav za rok' : 'Rok'} ${state.year}`;
}

function updateURL() {
  const params = new URLSearchParams({metric: state.metric, territory: state.selectedId, normalization: state.normalization});
  if (state.year != null) params.set('year', state.year);
  if (state.mode !== 'value') params.set('mode', state.mode);
  history.replaceState(null, '', `${location.pathname}?${params}`);
}
function play(playing) {
  clearTimeout(timer); timer = null;
  state.playing = Boolean(playing && isTimeSeries() && metric().years.length > 1);
  $('play').textContent = state.playing ? 'Ⅱ Pozastavit' : '▶ Přehrát';
  $('play').setAttribute('aria-label', state.playing ? 'Pozastavit časovou osu' : 'Přehrát časovou osu');
  if (state.playing) {
    const years = availableYears();
    if (state.year === years.at(-1)) {state.year = years[0]; render();}
    schedule();
  }
}
function schedule() {
  clearTimeout(timer);
  if (!state.playing) return;
  timer = setTimeout(() => {
    const years = availableYears();
    const next = years.indexOf(state.year) + 1;
    state.year = years[next >= years.length ? 0 : next];
    render(); schedule();
  }, 1000 / state.speed);
}
function setYear(year) {
  const years = availableYears();
  if (!years.includes(Number(year))) return;
  play(false); state.year = Number(year); render();
}

function metricOptions() {
  const groups = new Map();
  for (const m of manifest.metrics) {
    const category = m.category || 'other';
    if (!groups.has(category)) {
      const group = document.createElement('optgroup');
      group.label = categoryNames[category] || category;
      groups.set(category, group); $('metric').append(group);
    }
    const suffix = m.status === 'demo' ? ' · DEMO' : m.status === 'unavailable' ? ' · bez dat' : '';
    groups.get(category).append(new Option(m.name + suffix, m.id));
  }
}
function syncControls() {
  const m = metric(), years = availableYears();
  $('metric').value = state.metric;
  $('normalization').replaceChildren(...m.normalizations.map(id => new Option(manifest.normalizations[id].label, id)));
  $('normalization').value = state.normalization;
  $('mode').value = state.mode;
  $('mode').querySelector('[value="yoy"]').disabled = (!isTimeSeries() || m.years.length < 2);
  const single = !isTimeSeries() || years.length < 2;
  $('year').min = years[0] ?? 0; $('year').max = years.at(-1) ?? 0;
  $('year').value = state.year ?? 0; $('year').disabled = single;
  $('play').disabled = single; $('speed').disabled = single;
  $('previous').disabled = single || state.year === years[0];
  $('next').disabled = single || state.year === years.at(-1);
  $('year-label').textContent = state.year ?? '—';
  $('year').setAttribute('aria-valuetext', `${state.year ?? 'Bez dat'}${m.years.includes(state.year) ? '' : ' · chybějící rok'}`);
  const ticks = years.filter((year, index) => index === 0 || index === years.length - 1 || index % Math.max(1, Math.ceil(years.length / 6)) === 0);
  $('year-ticks').replaceChildren(...ticks.map(year => {
    const tick = document.createElement('button'); tick.type = 'button'; tick.textContent = year;
    tick.title = m.years.includes(year) ? `Zobrazit rok ${year}` : `${year} · chybějící data`;
    tick.classList.toggle('gap', !m.years.includes(year)); tick.addEventListener('click', () => setYear(year)); return tick;
  }));
}

async function selectMetric(id) {
  const request = ++metricRequest, previous = {...state};
  normalizationRequest++;
  play(false); notice();
  const m = engine.metric(id);
  const normalization = m.normalizations.includes(state.normalization) ? state.normalization : m.normalizations.includes('absolute') ? 'absolute' : m.normalizations[0];
  $('loading').hidden = false; $('loading').textContent = `Načítání: ${m.name}…`;
  $('normalization').disabled = true; $('mode').disabled = true;
  try {
    await engine.prepare(id, normalization);
    if (request !== metricRequest) return;
    state.metric = id; state.normalization = normalization;
    if ((!isTimeSeries() || m.years.length < 2)) state.mode = 'value';
    const years = calendarYears(m.years);
    state.year = years.includes(previous.year) ? previous.year : years.at(-1) ?? null;
    render();
  } catch (error) {
    if (request !== metricRequest) return;
    $('metric').value = previous.metric;
    notice(error.message, () => selectMetric(id));
  } finally {
    if (request === metricRequest) {
      $('loading').hidden = true; $('normalization').disabled = false; $('mode').disabled = false;
    }
  }
}

async function selectNormalization(next) {
  const request = ++normalizationRequest, id = state.metric;
  play(false);
  try {
    await engine.prepare(id, next);
    if (request !== normalizationRequest || state.metric !== id) return;
    state.normalization = next; render();
  } catch (error) {
    if (request !== normalizationRequest || state.metric !== id) return;
    notice(error.message, () => selectNormalization(next)); $('normalization').value = state.normalization;
  }
}

async function selectTerritory(id, {writeURL = true} = {}) {
  const t = engine.territories.get(id);
  if (!t) return;
  const request = ++territoryRequest;
  const regionId = t.level === 'country' ? null : t.level === 'region' ? t.id : t.regionId || t.parentId;
  play(false); notice();
  const path = regionId ? `./data/${manifest.geography.municipalities.replace('{regionId}', regionId)}` : null;
  const existing = path ? cache.get(path) : null;
  selectedGeometry = existing || null;
  if (existing) map.setMunicipalities(regionId, existing);
  state.selectedId = id; state.regionId = regionId;
  map.setContext({regionId, selectedId: id});
  $('town-search').value = t.level === 'municipality' ? t.name : '';
  $('search-results').hidden = true; $('town-search').setAttribute('aria-expanded', 'false');
  render({writeURL});
  try {
    if (path && !existing) {
      const geometry = await json(path);
      if (request !== territoryRequest) return;
      map.setMunicipalities(regionId, geometry);
      selectedGeometry = geometry;
      // A region starts moving immediately; only a searched municipality needs a second fit.
      map.setContext({regionId, selectedId: id}, {fit:t.level === 'municipality'});
      render({writeURL});
    }
  } catch (error) {
    if (request !== territoryRequest) return;
    notice(`Hranice území nelze načíst. ${error.message}`, () => selectTerritory(id));
  }
}

function selectFromMap(id) {
  if (id === state.selectedId && engine.territories.get(id)?.level === 'municipality') {
    selectTerritory('CZ');
  } else selectTerritory(id);
}

function breadcrumbs() {
  const chain = []; let t = territory();
  while (t) {chain.unshift(t); t = engine.territories.get(t.parentId);}
  $('breadcrumb').replaceChildren();
  chain.forEach((item, index) => {
    if (index) $('breadcrumb').append(' / ');
    const node = document.createElement(index === chain.length - 1 ? 'span' : 'button');
    node.textContent = item.level === 'country' ? 'ČR' : item.name;
    if (node.tagName === 'BUTTON') node.addEventListener('click', () => selectTerritory(item.id));
    else node.setAttribute('aria-current', 'location');
    $('breadcrumb').append(node);
  });
  const parent = engine.territories.get(territory().parentId);
  $('back-level').disabled = !parent;
  $('back-level').textContent = `↶ ${parent?.level === 'region' ? 'Zpět na kraj' : 'Zpět na ČR'}`;
}

function renderLegend(domain) {
  const unit = engine.unit(state.metric, state.normalization, state.mode);
  $('color-legend').replaceChildren();
  const label = document.createElement('div'); label.className = 'legend-unit';
  label.textContent = `${unit} · rozsah pevný v čase`;
  const scale = document.createElement('div'); scale.className = 'legend-scale';
  const gradient = document.createElement('div'); gradient.className = 'legend-gradient';
  gradient.style.background = `linear-gradient(to right,${Array.from({length: 21}, (_, i) => `${engine.color(state.metric, domain.min + (domain.max - domain.min) * i / 20, domain)} ${i * 5}%`).join(',')})`;
  const labels = document.createElement('div'); labels.className = 'legend-labels';
  for (const value of [domain.min, (domain.max + domain.min) / 2, domain.max]) {const span = document.createElement('span'); span.textContent = format(value); labels.append(span);}
  scale.append(gradient, labels);
  const missing = document.createElement('span'); missing.className = 'missing-key';
  missing.innerHTML = '<i aria-hidden="true"></i> Bez dat';
  $('color-legend').append(label);
  if (!domain.empty) $('color-legend').append(scale);
  $('color-legend').append(missing);
}

function renderProfile(result) {
  const t = territory(), m = metric(), profile = $('profile'); profile.replaceChildren();
  const item = (label, value, note) => {
    const div = document.createElement('div'); div.className = 'profile-item';
    const title = document.createElement('span'), strong = document.createElement('strong');
    title.textContent = label; strong.textContent = value; div.append(title, strong);
    if (note) {const small = document.createElement('small'); small.textContent = note; div.append(small);}
    profile.append(div); return div;
  };
  item('Obyvatelstvo · referenční základ', finite(t.population) ? `${format(t.population, 0)} obyv.` : 'Bez dat', t.populationYear ? `Stav ${t.populationYear}` : '');
  item('Domácnosti · referenční základ', finite(t.households) ? `${format(t.households, 0)} domácností` : 'Bez dat', t.householdsYear ? `Sčítání ${t.householdsYear}` : '');
  item('Rozloha území', finite(t.areaKm2) ? `${format(t.areaKm2)} km²` : 'Bez dat', 'Z nezjednodušených hranic');
  for (const normalization of m.normalizations.filter(id => id !== 'absolute')) {
    const config = manifest.normalizations[normalization];
    if (config.denominatorMetric && !engine.cache.has(config.denominatorMetric)) {
      const div = item(config.label, 'Přepočet vyžaduje další dataset');
      const button = document.createElement('button'); button.textContent = 'Načíst přepočet';
      button.addEventListener('click', () => selectNormalization(normalization)); div.append(button); continue;
    }
    const value = engine.value(state.metric, state.selectedId, state.year, normalization, state.mode);
    item(config.label, `${format(value.value)} ${engine.unit(state.metric, normalization)}`, value.partial ? 'Jen obce s dostupnou hodnotou' : '');
  }
  renderEnergyProfile();
}

function renderEnergyProfile() {
  const rows = energyProfile.rows(state.selectedId);
  $('energy-profile-count').textContent = `${rows.length} ověřených vrstev`;
  const grid = $('energy-profile-values'); grid.replaceChildren();
  if (!energyProfile.requested) return;
  let category = null;
  for (const row of rows) {
    const nextCategory = engine.metric(row.id).category;
    if (nextCategory !== category) {
      const heading = document.createElement('h3'); heading.className = 'profile-category'; heading.textContent = categoryNames[nextCategory] || nextCategory; grid.append(heading); category = nextCategory;
    }
    const card = document.createElement('div'); card.className = 'profile-item energy-profile-value';
    const label = document.createElement('span'), value = document.createElement('strong'), note = document.createElement('small');
    label.textContent = row.name;
    value.textContent = row.status === 'ready' ? `${format(row.result.value)} ${row.unit}` : row.status === 'error' ? 'Načtení se nezdařilo' : 'Načítání…';
    const date = row.timeType === 'static' ? `Model · ${row.source.referencePeriod || engine.metric(row.id).referencePeriod || row.year}` : row.asOf ? `Stav k ${dateLabel(row.asOf)}` : `Rok ${row.year}`;
    const coverage = row.result?.partial ? ` · neúplný součet (${format(row.result.coverage, 0)}/${format(row.result.expected, 0)} obcí)`
      : row.status === 'ready' && !finite(row.result.value) ? ' · bez dat pro toto území' : '';
    note.textContent = `${row.source.provider || row.source.name || 'Zdroj neuveden'} · ${date}${coverage}`;
    card.classList.toggle('warning', Boolean(row.result?.partial || row.status === 'error'));
    if (row.source.scopeNote) card.title = row.source.scopeNote;
    card.append(label, value, note);
    const limitations = row.source.limitations || [];
    if (row.source.scopeNote || limitations.length) {
      const details = document.createElement('details'), summary = document.createElement('summary'), text = document.createElement('p');
      summary.textContent = 'Rozsah a omezení'; text.textContent = [row.source.scopeNote, ...limitations].filter(Boolean).join(' '); details.className = 'profile-limitations'; details.append(summary, text); card.append(details);
    }
    const action = document.createElement('button');
    if (row.status === 'error') {
      action.textContent = 'Zkusit znovu'; action.title = row.error;
      action.addEventListener('click', loadEnergyProfile);
    } else {
      action.textContent = 'Zobrazit na mapě'; action.disabled = row.status !== 'ready';
      action.setAttribute('aria-label', `Zobrazit na mapě: ${row.name}`);
      action.addEventListener('click', () => selectMetric(row.id));
    }
    card.append(action); grid.append(card);
  }
}

async function loadEnergyProfile() {
  const pending = energyProfile.load();
  renderEnergyProfile();
  await pending;
  renderEnergyProfile();
}

function renderSeries() {
  const m = metric(), series = engine.series(state.metric, state.selectedId, state.normalization, state.mode);
  const unit = engine.unit(state.metric, state.normalization, state.mode);
  renderTimeChart($('time-chart'), {series, year: state.year, color: color(), unit, label: `${m.name} · ${territory().name}`, onYear: setYear});
  $('chart-territory').textContent = territory().name;
  $('chart-note').textContent = m.timeType === 'static' ? `${periodLabel()}. Předpočítaný model, nikoli měřená časová řada. Agregace je průměr vážený rozlohou obcí.` : m.years.length === 1 ? `${periodLabel()}. Jediný stav; přehrávání je vypnuté.`
    : m.status === 'unavailable' ? 'Časová řada zatím není připojena.'
    : 'Každý bod je roční hodnota. Křížek znamená chybějící údaj; prázdný bod neúplné pokrytí. Kliknutím zvolíte rok. Osa Y má místní rozsah.';
  const details = $('series-table'); const open = details.open;
  details.innerHTML = '<summary>Hodnoty v tabulce</summary>'; details.open = open;
  if (series.length) {
    const table = document.createElement('table');
    table.innerHTML = `<caption class="sr-only">${escapeHTML(m.name)} · ${escapeHTML(territory().name)}</caption><thead><tr><th scope="col">Rok</th><th scope="col">${escapeHTML(unit)}</th><th scope="col">Pokrytí obcí</th></tr></thead><tbody>${series.map(row => `<tr><th scope="row">${row.year}</th><td>${format(row.value)}</td><td>${row.coverage ?? '—'} / ${row.expected ?? '—'}</td></tr>`).join('')}</tbody>`;
    details.append(table);
  }
}

function render({writeURL = true} = {}) {
  if (!engine || !state.metric) return;
  const t = territory(), m = metric();
  const result = engine.value(state.metric, state.selectedId, state.year, state.normalization, state.mode);
  const ids = state.regionId ? [...engine.territories.values()].filter(t => t.level === 'municipality').map(t => t.id)
    : [...engine.territories.values()].filter(t => t.level === 'region').map(t => t.id);
  const domain = engine.domain(state.metric, ids, state.normalization, state.mode);
  const visibleIds = [...engine.territories.values()].filter(t => t.level === 'region').map(t => t.id);
  if (selectedGeometry) visibleIds.push(...selectedGeometry.features.map(f => String(f.properties?.code ?? f.id)));
  const coverage = new Map(visibleIds.map(id => [id, engine.value(state.metric, id, state.year, state.normalization, state.mode)]));
  const values = new Map([...coverage].map(([id, result]) => [id, result.value]));
  const names = new Map([...engine.territories.values()].map(t => [t.id, t.name]));
  map.update({values, coverage, colorFor: value => engine.color(state.metric, value, domain), year: state.year ?? '', unitLabel: engine.unit(state.metric, state.normalization, state.mode), names});
  $('map-territory').textContent = t.name; $('map-year').textContent = m.timeType === 'static' ? m.referencePeriod || sourceOf(m).referencePeriod : state.year ?? 'Bez dat';
  $('territory-title').textContent = t.name; $('detail-label').textContent = periodLabel();
  $('metric-label').textContent = `${state.mode === 'yoy' ? 'Meziroční změna · ' : ''}${m.name}`;
  $('metric-value').textContent = format(result.value);
  $('metric-unit').textContent = engine.unit(state.metric, state.normalization);
  $('metric-status').textContent = result.valueStatus === 'not_applicable' ? 'Nevztahuje se na toto území' : result.valueStatus === 'unavailable' ? 'Údaj není dostupný' : statusNames[m.status] || m.status;
  let scopeNote = $('metric-scope');
  if (!scopeNote) {
    scopeNote = document.createElement('p');
    scopeNote.id = 'metric-scope'; scopeNote.className = 'metric-scope';
    $('metric-status').after(scopeNote);
  }
  scopeNote.textContent = sourceOf(m).scopeNote || m.scopeNote || '';
  scopeNote.hidden = !scopeNote.textContent;
  $('demo-banner').hidden = m.status !== 'demo';
  $('coverage-note').textContent = result.denominatorMissing ? 'Chybí odpovídající jmenovatel pro přepočet.'
    : !finite(result.value) ? state.mode === 'yoy' ? 'Pro změnu chybí srovnatelný předchozí rok.' : 'Pro toto území a rok nejsou dostupná měření.'
    : result.partial ? `NEÚPLNÝ SOUČET · ${format(result.coverage, 0)} z ${format(result.expected, 0)} obcí. Nejde o celkovou hodnotu území.`
    : result.coverage != null ? `Pokrytí: ${format(result.coverage, 0)} / ${format(result.expected, 0)} obcí.` : 'Přímá hodnota zdrojového území.';
  $('coverage-note').classList.toggle('warning', result.partial || result.denominatorMissing);
  const baseline = manifest.normalizations[state.normalization]?.denominator === 'population' ? ` Přepočet používá referenční populaci ${t.populationYear || 'uvedenou v územních datech'}.` : '';
  $('map-status').textContent = `${state.regionId ? 'Obce · jednotný rozsah pro celou ČR' : 'Kraje · kliknutím zobrazíte obce'} · ${m.status === 'demo' ? 'DEMO · ' : ''}${m.name}.${baseline}`;
  $('map-caption').textContent = state.regionId ? 'Hranice obcí · ČÚZK / RÚIAN' : 'ČESKÁ REPUBLIKA · Vyberte kraj a poté obec';
  document.documentElement.style.setProperty('--metric-color', color());
  document.querySelector('.metric-card').style.borderColor = color();
  $('metric-value').style.color = color();
  const source = sourceOf(m);
  $('source-summary').textContent = `${source.name || 'Zdroj dosud nepřipojen'}${source.updatedAt ? ` · aktualizace ${dateLabel(source.updatedAt)}` : source.retrievedAt ? ` · staženo ${dateLabel(source.retrievedAt)}` : ''}${m.status === 'demo' ? ' · ILUSTRAČNÍ DATA' : ''}`;
  breadcrumbs(); syncControls(); renderLegend(domain); renderProfile(result); renderSeries();
  if (writeURL) updateURL();
}

function search() {
  const query = fold($('town-search').value), results = $('search-results');
  results.replaceChildren();
  if (query.length < 2) {results.hidden = true; $('town-search').setAttribute('aria-expanded', 'false'); return;}
  const towns = [...engine.territories.values()].filter(t => t.level === 'municipality');
  const matches = towns.filter(t => fold(t.name).includes(query) || t.id.startsWith(query))
    .sort((a, b) => Number(fold(b.name).startsWith(query)) - Number(fold(a.name).startsWith(query)) || a.name.localeCompare(b.name, 'cs')).slice(0, 18);
  if (!matches.length) results.textContent = 'Žádná obec neodpovídá hledání.';
  for (const t of matches) {
    const button = document.createElement('button'), name = document.createElement('span'), detail = document.createElement('small');
    name.textContent = t.name; detail.textContent = `${engine.territories.get(t.regionId || t.parentId)?.name || ''} · ${t.id}`;
    button.append(name, detail); button.addEventListener('click', () => selectTerritory(t.id)); results.append(button);
  }
  results.hidden = false; $('town-search').setAttribute('aria-expanded', 'true');
}

function safeLink(label, url) {
  if (!url || !/^https?:\/\//i.test(url)) return escapeHTML(label);
  return `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(label)} ↗</a>`;
}
function showData() {
  const m = metric(), source = sourceOf(m), geography = manifest.geography;
  const metadata = [
    ['Zdroj', safeLink(source.name || 'Dosud nepřipojen', source.url)],
    ['Aktualizace', escapeHTML(dateLabel(source.updatedAt) || 'Není uvedena')],
    ['Staženo / exportováno', escapeHTML(dateLabel(source.retrievedAt) || 'Není uvedeno')],
    ['Geografická granularita', escapeHTML(source.geographicGranularity || m.geography.join(', '))],
    ['Časová granularita', escapeHTML(source.temporalGranularity || (m.years.length > 1 ? 'Roční' : 'Jednorázový stav'))],
    ['Dostupné roky', escapeHTML(m.years.join(', ') || 'Zatím žádné')],
    ['Metodika', escapeHTML(source.methodology || m.methodology || 'Zatím není připojen ověřený dataset.')],
    ...((source.scopeNote || m.scopeNote) ? [['Rozsah dat', escapeHTML(source.scopeNote || m.scopeNote)]] : []),
    ...(source.methodologyUrl ? [['Podrobná metodika', safeLink('Metodika a kontrola dat', source.methodologyUrl)]] : []),
    ...(source.auditUrl ? [['Audit dat', safeLink('Výsledky kontroly dat', source.auditUrl)]] : [])
  ];
  const limitations = [...new Set([...(Array.isArray(source.limitations) ? source.limitations : []), ...(Array.isArray(m.limitations) ? m.limitations : [])])];
  $('data-content').innerHTML = `<h3>${escapeHTML(m.name)}</h3><p><strong>${escapeHTML(statusNames[m.status] || m.status)}</strong>${m.status === 'demo' ? ' — hodnoty byly záměrně vytvořeny pro demonstraci UI, nikoliv jako měření skutečných zařízení.' : ''}</p><dl>${metadata.map(([key, value]) => `<dt><strong>${key}</strong></dt><dd>${value}</dd>`).join('')}</dl>${limitations.length ? `<h3>Omezení dat</h3><ul>${limitations.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>` : ''}
  <h3>Výpočty a chybějící data</h3><p>Chybějící údaj není nula. Součty obcí se agregují na kraj a ČR jen u sčitatelných metrik. Neúplný součet je označen počtem dostupných obcí. Normalizace používá jmenovatel pouze stejných obcí jako čitatel; chybějící či nulový celkový jmenovatel vrací nedostupný údaj. Meziroční změna vyžaduje stejné obce a předchozí kalendářní rok.</p>
  <p>Rozsah mapových barev je pevný přes všechny roky dané metriky, normalizace a úrovně. Obecní pohled používá společný rozsah pro všechny obce ČR. Meziroční změna má symetrickou škálu kolem nuly. Šrafování značí chybějící údaj; nulová hodnota používá nejsvětlejší barvu.</p>
  <p>Přepočet na 1 000 obyvatel používá referenční populační základ v territories.json (rok uveden v profilu). Není automaticky historickou mírou na populaci každého roku. Rozloha je odvozena z nezjednodušených hranic. Pro další poměry může manifest definovat zvláštní dataset jmenovatele.</p>
  <h3>Územní podklad</h3><p>${escapeHTML(geography.methodology || geography.source?.methodology || 'Skutečné hranice ČÚZK / RÚIAN, zjednodušené pro zobrazení na webu.')}</p><p>Současné územní vymezení se používá i pro historická data; nejde o rekonstrukci tehdejších hranic.</p><p>${safeLink(geography.source?.name || 'ČÚZK INSPIRE AU WFS', geography.source?.url || 'https://services.cuzk.gov.cz/wfs/inspire-au-wfs.asp')}</p>
  <h3>Stav všech metrik</h3><table><thead><tr><th scope="col">Metrika</th><th scope="col">Stav</th></tr></thead><tbody>${manifest.metrics.map(item => `<tr><td>${escapeHTML(item.name)}</td><td>${escapeHTML(statusNames[item.status] || item.status)}</td></tr>`).join('')}</tbody></table><p>Aplikace je čistý statický web. Další dataset se načte až po výběru metriky a uchovává se v paměti prohlížeče. Bodové vrstvy mají samostatný manifest a načítají se odděleně.</p>`;
  if (manifest.points?.length) {
    const heading = document.createElement('h3'); heading.textContent = 'Bodové vrstvy'; $('data-content').append(heading);
    for (const layer of manifest.points) {
      const row = document.createElement('p'), button = document.createElement('button'), status = document.createElement('span');
      button.textContent = `Načíst: ${layer.name || layer.id}`;
      button.addEventListener('click', async () => {
        button.disabled = true; status.textContent = ' Načítání…';
        try {const data = await pointLayers.load(layer.id); status.textContent = ` ${format(data.points?.length ?? data.features.length, 0)} záznamů · ${layer.source.name}`;}
        catch (error) {status.textContent = ` ${error.message}`; button.disabled = false;}
      });
      row.append(button, status); $('data-content').append(row);
    }
  }
  $('data-dialog').showModal();
}

function installEvents() {
  $('energy-profile-details').addEventListener('toggle', () => {
    if ($('energy-profile-details').open && !energyProfile.requested) loadEnergyProfile();
  });
  $('metric').addEventListener('change', event => selectMetric(event.target.value));
  $('normalization').addEventListener('change', event => selectNormalization(event.target.value));
  $('mode').addEventListener('change', event => {play(false); state.mode = event.target.value; render();});
  $('year').addEventListener('input', event => setYear(event.target.value));
  $('previous').addEventListener('click', () => setYear(state.year - 1));
  $('next').addEventListener('click', () => setYear(state.year + 1));
  $('play').addEventListener('click', () => play(!state.playing));
  $('speed').addEventListener('change', event => {state.speed = Number(event.target.value); if (state.playing) schedule();});
  $('back-level').addEventListener('click', () => selectTerritory(territory().parentId));
  $('zoom-in').addEventListener('click', () => map.zoomBy(1.3));
  $('zoom-out').addEventListener('click', () => map.zoomBy(1 / 1.3));
  $('town-search').setAttribute('aria-expanded', 'false');
  $('town-search').addEventListener('input', search);
  $('town-search').addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {$('search-results').querySelector('button')?.focus(); event.preventDefault();}
    if (event.key === 'Escape') {$('search-results').hidden = true; $('town-search').setAttribute('aria-expanded', 'false');}
    if (event.key === 'Enter') {$('search-results').querySelector('button')?.click(); event.preventDefault();}
  });
  $('search-results').addEventListener('keydown', event => {
    const buttons = [...$('search-results').querySelectorAll('button')], i = buttons.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') {buttons[Math.min(i + 1, buttons.length - 1)]?.focus(); event.preventDefault();}
    if (event.key === 'ArrowUp') {if (i <= 0) $('town-search').focus(); else buttons[i - 1].focus(); event.preventDefault();}
    if (event.key === 'Escape') {$('search-results').hidden = true; $('town-search').setAttribute('aria-expanded', 'false'); $('town-search').focus();}
  });
  document.addEventListener('click', event => {if (!event.target.closest('.map-search')) {$('search-results').hidden = true; $('town-search').setAttribute('aria-expanded', 'false');}});
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    selectTerritory('CZ');
  });
  $('data-open').addEventListener('click', showData);
  $('close-data').addEventListener('click', () => $('data-dialog').close());
  document.addEventListener('visibilitychange', () => {if (document.hidden) play(false);});
}

async function init() {
  try {
    manifest = await json('./data/manifest.json');
    const [territories, overview] = await Promise.all([json(`./data/${manifest.territories}`), json(`./data/${manifest.geography.overview}`)]);
    engine = new MetricEngine(manifest, territories, {fetchJSON: json, baseURL: './data/'});
    energyProfile = new EnergyProfile(engine);
    pointLayers = new PointLayerStore(manifest, territories, {fetchJSON: json, baseURL: './data/'});
    const query = new URLSearchParams(location.search);
    const requestedMetric = manifest.metricAliases?.[query.get('metric')] || query.get('metric');
    state.metric = engine.metrics.has(requestedMetric) ? requestedMetric : manifest.defaultMetric;
    state.normalization = metric().normalizations.includes(query.get('normalization')) ? query.get('normalization') : metric().normalizations.includes('absolute') ? 'absolute' : metric().normalizations[0];
    state.mode = query.get('mode') === 'yoy' && isTimeSeries() && metric().years.length > 1 ? 'yoy' : 'value';
    const years = availableYears(), year = Number(query.get('year'));
    state.year = years.includes(year) ? year : years.at(-1) ?? null;
    map = createEnergyMap($('map'), {onSelect: selectFromMap});
    map.setOverview(overview); metricOptions();
    await engine.prepare(state.metric, state.normalization);
    installEvents();
    const id = engine.territories.has(query.get('territory')) ? query.get('territory') : 'CZ';
    await selectTerritory(id);
    $('loading').hidden = true;
  } catch (error) {
    $('loading').hidden = true;
    notice(`Aplikaci nelze spustit: ${error.message} Spusťte web přes HTTP server, například npm run serve.`, () => location.reload());
  }
}
init();
