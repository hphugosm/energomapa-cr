import {compatibleUnits, numeric, filterSeries, summarizeSeries, exportSeriesCSV, downloadArtifact} from '../databank/series.mjs';

const number = value => numeric(value) ? new Intl.NumberFormat('cs-CZ', {maximumFractionDigits: 3}).format(value) : '—';
const element = (tag, text, attrs = {}) => {
  const node = document.createElement(tag); if (text != null) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};
const colors = ['#173da5', '#bd6013', '#278260', '#863ca4', '#bc354d', '#366f86', '#716500', '#5b626d'];
const NS = 'http://www.w3.org/2000/svg';
function chart(svg, data) {
  svg.replaceChildren(); svg.setAttribute('viewBox', '0 0 900 300');
  const add = (tag, attrs, text) => {const node = document.createElementNS(NS, tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value); if (text != null) node.textContent = text; svg.append(node); return node;};
  add('title', {}, `${data.title}. ${data.unit}. Chybějící hodnoty tvoří mezery. Přesná data jsou v tabulce.`);
  const validColumns = data.columns.filter(col => data.records.some(row => numeric(row[col.key])));
  const values = data.records.flatMap(row => validColumns.map(col => row[col.key]).filter(numeric));
  if (!values.length) {add('text', {x: 450, y: 150, 'text-anchor': 'middle', fill: '#65738a'}, 'Ve výběru nejsou číselná data.'); return;}
  let low = values.reduce((a, b) => Math.min(a, b), Infinity), high = values.reduce((a, b) => Math.max(a, b), -Infinity); if (low === high) {low -= Math.abs(low) * .05 || 1; high += Math.abs(high) * .05 || 1;}
  const x = i => 82 + i / Math.max(1, data.records.length - 1) * 795, y = value => 252 - (value - low) / (high - low) * 220;
  for (let i = 0; i < 5; i++) {
    const value = low + (high - low) * i / 4;
    add('line', {x1: 82, x2: 877, y1: y(value), y2: y(value), stroke: '#dfe5ee'});
    add('text', {x: 73, y: y(value) + 4, 'text-anchor': 'end', fill: '#65738a', 'font-size': 11}, new Intl.NumberFormat('cs-CZ', {notation: 'compact', maximumFractionDigits: 1}).format(value));
  }
  validColumns.forEach((col, c) => {
    let d = '', gap = true;
    data.records.forEach((row, i) => {
      if (!numeric(row[col.key])) {gap = true; return;}
      d += `${gap ? 'M' : 'L'}${x(i)},${y(row[col.key])} `; gap = false;
      if (data.records.length <= 64) {
        const dot = add('circle', {cx: x(i), cy: y(row[col.key]), r: 3, fill: colors[c % colors.length]});
        const title = document.createElementNS(NS, 'title'); title.textContent = `${row.time} · ${col.label}: ${number(row[col.key])} ${col.unit || data.unit}`; dot.append(title);
      }
    });
    add('path', {d, fill: 'none', stroke: colors[c % colors.length], 'stroke-width': 2});
  });
  const indexes = new Set([0, Math.floor((data.records.length - 1) / 2), data.records.length - 1]);
  for (const i of indexes) if (data.records[i]) add('text', {x: x(i), y: 280, 'text-anchor': 'middle', fill: '#65738a', 'font-size': 11}, data.records[i].time);
  add('text', {x: 82, y: 18, fill: '#65738a', 'font-size': 12}, data.unit);
}

export async function initializeDatabankPanel({root, loadJSON}) {
  root.classList.add('databank-panel');
  const heading = element('div', null, {class: 'bank-heading'});
  const headingText = element('div'); headingText.append(element('p', 'SOUTĚŽNÍ DATABANKA', {class: 'workspace-eyebrow'}), element('h1', 'Energie v datech'), element('p', 'Historické řady, srovnání států a dohledatelné podklady. Každý export zachovává původ a jednotky.'));
  const archive = element('a', '↓ Offline archiv CSV + JSON', {href: './data/databank/offline.zip', download: 'energomapa-databanka.zip', class: 'bank-download'});
  heading.append(headingText, archive); root.append(heading);
  const status = element('p', 'Načítání katalogu…', {role: 'status'}); root.append(status);
  const index = await loadJSON('./data/databank/index.json');
  const filters = element('div', null, {class: 'bank-catalog-filters'});
  const search = element('input', null, {type: 'search', placeholder: 'Hledat zdroj, metriku nebo jednotku…', 'aria-label': 'Hledat v databance'});
  const provider = element('select', null, {'aria-label': 'Poskytovatel dat'}); provider.append(new Option('Všechny zdroje', ''));
  for (const value of [...new Set(index.datasets.map(item => item.source?.publisher).filter(Boolean))].sort()) provider.append(new Option(value, value));
  filters.append(search, provider); root.append(filters);
  const grid = element('div', null, {class: 'bank-grid'}), list = element('div', null, {class: 'bank-catalog', 'aria-label': 'Datové sady'}), detail = element('section', null, {class: 'bank-detail', 'aria-label': 'Vybraná datová sada'}); grid.append(list, detail); root.append(grid);
  let request = 0, active, selectedButton;
  function catalog() {
    list.replaceChildren(); const query = search.value.toLocaleLowerCase('cs');
    const matches = index.datasets.filter(item => (!provider.value || item.source?.publisher === provider.value) && `${item.title} ${item.description || ''} ${item.source?.publisher} ${item.unit} ${item.kind}`.toLocaleLowerCase('cs').includes(query));
    for (const item of matches) {
      const button = element('button', null, {class: 'bank-dataset', 'aria-pressed': String(active?.id === item.id)});
      button.append(element('strong', item.title), element('span', `${item.source?.publisher || 'Zdroj'} · ${item.unit} · ${item.rowCount} záznamů`), element('small', `${item.period?.start ?? '—'} → ${item.period?.end ?? '—'} · uložený snapshot`));
      button.addEventListener('click', () => open(item, button)); list.append(button);
    }
    if (!matches.length) list.append(element('p', 'Výběru neodpovídá žádná datová sada.'));
    status.textContent = `${matches.length} datových sad z ${index.datasets.length}. Uložené snapshoty se neobnovují při otevření webu.`;
  }
  async function open(item, button) {
    const token = ++request; active = item; selectedButton?.setAttribute('aria-pressed', 'false'); selectedButton = button; button?.setAttribute('aria-pressed', 'true'); detail.replaceChildren(element('p', 'Načítání dat…', {role: 'status'}));
    try {
      const data = await loadJSON(`./data/databank/${item.path}`); if (token !== request) return;
      renderDataset(data);
    } catch (error) {
      if (token !== request) return;
      const retry = element('button', 'Zkusit znovu'); retry.addEventListener('click', () => open(item, button)); detail.replaceChildren(element('p', error.message, {role: 'alert'}), retry);
    }
  }
  function renderDataset(data) {
    detail.replaceChildren(element('h2', data.title), element('p', data.description || ''));
    const metadata = element('details', null, {class: 'bank-provenance'}); metadata.append(element('summary', 'Zdroj, období a metodika'));
    const dl = element('dl');
    for (const [label, value] of [['Poskytovatel', data.source?.publisher], ['Období', `${data.period?.start} — ${data.period?.end}`], ['Časové pásmo', data.timezone || 'Není relevantní'], ['Staženo', data.source?.retrievedAt], ['Časová granularita', data.frequency], ['Metodika', data.source?.methodology], ['Omezení', (data.source?.limitations || data.limitations || []).join?.(' ') || data.source?.limitations]]) {
      if (value) dl.append(element('dt', label), element('dd', value));
    }
    metadata.append(dl);
    if (/^https?:\/\//.test(data.source?.url)) metadata.append(element('a', 'Otevřít původní zdroj ↗', {href: data.source.url, target: '_blank', rel: 'noopener'}));
    detail.append(metadata);
    const controls = element('div', null, {class: 'bank-range'});
    const start = element('select'), end = element('select'), units = element('select');
    const times = [...new Set(data.records.map(row => String(row.time)))].sort();
    for (const time of times) {start.append(new Option(time, time)); end.append(new Option(time, time));}
    start.value = times[0] || ''; end.value = times.at(-1) || '';
    for (const unit of compatibleUnits(data.unit)) units.append(new Option(unit, unit)); units.value = data.unit;
    for (const [label, control] of [['Od', start], ['Do', end], ['Jednotka', units]]) {const wrapper = element('label', label); wrapper.append(control); controls.append(wrapper);}
    detail.append(controls);
    const columnFilters = element('fieldset', null, {class: 'bank-columns'}); columnFilters.append(element('legend', 'Srovnání řad / území'));
    const checks = data.columns.filter(col => col.key !== 'time').map((col, i) => {
      const label = element('label'), input = element('input', null, {type: 'checkbox', value: col.key}); input.checked = i < 6;
      label.style.setProperty('--series-color', colors[i % colors.length]); label.append(input, document.createTextNode(col.label || col.key)); columnFilters.append(label); return input;
    }); detail.append(columnFilters);
    const note = element('p', null, {class: 'bank-selection-note', role: 'status'}), svg = document.createElementNS(NS, 'svg'); svg.setAttribute('role', 'img'); svg.classList.add('bank-chart');
    const legend = element('div', null, {class: 'bank-chart-legend'}), stats = element('div', null, {class: 'bank-stats'}), actions = element('div', null, {class: 'bank-actions'});
    const csv = element('button', '↓ Výběr CSV'), json = element('button', '↓ Výběr JSON'); actions.append(csv, json);
    actions.append(element('a', 'Původní CSV', {href: `./data/databank/${active.csv}`, download: ''}), element('a', 'Původní JSON', {href: `./data/databank/${active.path}`, download: ''}));
    const tableDetails = element('details', null, {class: 'bank-table'}); tableDetails.append(element('summary', 'Přesné hodnoty v tabulce'));
    const tableWrapper = element('div'), table = element('table'); tableWrapper.append(table); tableDetails.append(tableWrapper);
    detail.append(note, svg, legend, stats, element('p', 'Průměr je prostý aritmetický průměr dostupných hodnot; nejde o součet energie ani časově vážený průměr. Rozdílné jednotky nejsou v grafu společně.'), actions, tableDetails);
    let filtered;
    function update() {
      const selected = checks.filter(input => input.checked).map(input => input.value);
      filtered = filterSeries(data, {start: start.value, end: end.value, columns: selected, unit: units.value});
      const chartData = {...filtered, columns: filtered.columns.filter(col => (col.unit || filtered.unit) === filtered.unit)};
      note.textContent = start.value > end.value ? 'Začátek období musí předcházet konci. Výběr je prázdný.' : `${filtered.records.length} záznamů · ${selected.length} řad · ${units.value}. Chybějící hodnota = —.`;
      csv.disabled = json.disabled = !filtered.records.length || !selected.length;
      chart(svg, chartData); legend.replaceChildren();
      chartData.columns.forEach((col, i) => {const item = element('span', col.label || col.key); item.style.color = colors[i % colors.length]; legend.append(item);});
      stats.replaceChildren();
      for (const item of summarizeSeries(filtered)) {
        const card = element('div'); card.append(element('strong', item.label), element('span', `Min ${number(item.min)} · max ${number(item.max)} ${item.unit}`), element('small', `Průměr ${number(item.mean)} · pokrytí ${item.available}/${item.expected}`)); stats.append(card);
      }
      table.replaceChildren(); const head = element('thead'), header = element('tr'); header.append(element('th', 'Období', {scope: 'col'}));
      for (const col of filtered.columns) header.append(element('th', `${col.label || col.key} (${col.unit || filtered.unit})`, {scope: 'col'})); head.append(header); table.append(head);
      const body = element('tbody');
      for (const row of filtered.records.slice(0, 500)) {const tr = element('tr'); tr.append(element('th', row.time, {scope: 'row'})); for (const col of filtered.columns) tr.append(element('td', numeric(row[col.key]) ? number(row[col.key]) : row[col.key] ?? '—')); body.append(tr);}
      table.append(body); tableDetails.querySelector('summary').textContent = `Přesné hodnoty v tabulce${filtered.records.length > 500 ? ' · prvních 500; export obsahuje vše' : ''}`;
    }
    for (const control of [start, end, units, ...checks]) control.addEventListener('change', update);
    csv.addEventListener('click', () => downloadArtifact('\ufeff' + exportSeriesCSV(filtered), `${data.id}-vyber.csv`, 'text/csv;charset=utf-8'));
    json.addEventListener('click', () => downloadArtifact(JSON.stringify(filtered, null, 2), `${data.id}-vyber.json`, 'application/json'));
    update();
  }
  search.addEventListener('input', catalog); provider.addEventListener('change', catalog); catalog();
  if (index.datasets.length) await open(index.datasets[0], list.querySelector('button'));
}
