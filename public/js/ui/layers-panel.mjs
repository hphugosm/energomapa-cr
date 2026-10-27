import {format} from '../engine.mjs';

/** Show one observation per facility, never all historical locations together. */
export function latestPointFeatures(data, layer) {
  const yearsById = new Map((data.points || []).map(point => [point.id, point.year]));
  const features = (data.features || []).map(feature => yearsById.has(feature.id) ? {...feature,properties:{...feature.properties,year:yearsById.get(feature.id)}} : feature);
  const year = layer.source?.latestAvailableYear;
  if (!year) return features;
  return features.filter(feature => {
    const properties = feature.properties || {};
    if (properties.year != null || properties.reportingYear != null) return Number(properties.year ?? properties.reportingYear) === Number(year);
    const series = Object.values(properties.metrics || {});
    return !series.length || series.some(values => typeof values[String(year)] === 'number');
  });
}

export class LayersPanel {
  constructor({container, store, map}) {
    this.container = container; this.store = store; this.map = map;
    this.enabled = new Set(); this.loaded = new Map(); this.rows = new Map();
    const heading = document.createElement('h2'); heading.textContent = 'Bodové vrstvy'; container.append(heading);
    const explanation = document.createElement('p'); explanation.textContent = 'Body se při oddálení seskupují. Kliknutím na skupinu přiblížíte mapu; jednotlivý bod otevře detail.'; container.append(explanation);
    for (const layer of store.layers.values()) this.add(layer);
    this.detail = document.createElement('div'); this.detail.setAttribute('aria-live', 'polite'); container.append(this.detail);
  }
  add(layer) {
    const row = document.createElement('div'), label = document.createElement('label'), checkbox = document.createElement('input'), status = document.createElement('small');
    checkbox.type = 'checkbox'; label.append(checkbox, document.createTextNode(` ${layer.name}`));
    row.append(label, status); this.container.append(row); this.rows.set(layer.id,{checkbox,status});
    checkbox.addEventListener('change', () => this.toggle(layer.id,checkbox.checked));
  }
  async toggle(id, enabled) {
    const {checkbox,status} = this.rows.get(id), layer = this.store.layer(id);
    checkbox.checked = enabled;
    if (!enabled) {this.enabled.delete(id); status.textContent = ''; this.sync(); return;}
    this.enabled.add(id); status.textContent = ' Načítání…';
    try {
      const data = await this.store.load(id), features = latestPointFeatures(data,layer);
      this.loaded.set(id,{id,name:layer.name,color:layer.color || (layer.type === 'charging' ? '#3268a8' : '#a54b38'),features});
      if (this.enabled.has(id)) status.textContent = ` ${format(features.length,0)} bodů · ${layer.source.latestAvailableYear || layer.source.asOf || ''}`;
      this.sync();
    } catch (error) {
      if (!this.enabled.has(id)) return;
      this.enabled.delete(id); checkbox.checked = false; status.textContent = ` ${error.message} Zaškrtnutím opakujete načtení.`; this.sync();
    }
  }
  sync() {this.map.setPointLayers([...this.enabled].map(id => this.loaded.get(id)).filter(Boolean));}
  showPoint({layerId,feature,features}) {
    const layer = this.store.layer(layerId), properties = feature.properties || {};
    this.detail.replaceChildren();
    const title = document.createElement('h3'); title.textContent = properties.name || feature.id; this.detail.append(title);
    const description = document.createElement('p'); description.textContent = `${layer.name} · ${layer.source.latestAvailableYear || layer.source.asOf || ''}${features?.length > 1 ? ` · ${features.length} záznamů ve stejném místě` : ''}`; this.detail.append(description);
    if (features?.length > 1) {
      const choices = document.createElement('div');
      for (const item of features) {const button = document.createElement('button'); button.type = 'button'; button.textContent = item.properties?.name || item.id; button.addEventListener('click', () => this.showPoint({layerId,feature:item})); choices.append(button);}
      this.detail.append(choices);
    }
    const list = document.createElement('dl');
    const labels = {sector:'Odvětví',co2Tonnes:'Ohlášené CO₂ včetně biomasy (t/rok)',municipalityName:'Obec',operator:'Provozovatel',address:'Adresa',points:'Dobíjecí body',powerKw:'Nominální výkon stanice (kW)',year:'Rok hlášení',ambiguousIdentity:'Nejednoznačná identita v evidenci'};
    for (const [key,value] of Object.entries(properties)) {
      if (!labels[key] || value == null || typeof value === 'object') continue;
      const term = document.createElement('dt'), detail = document.createElement('dd'); term.textContent = labels[key]; detail.textContent = typeof value === 'boolean' ? value ? 'Ano' : 'Ne' : typeof value === 'number' ? format(value) : String(value); list.append(term,detail);
    }
    for (const [name,series] of Object.entries(properties.metrics || {})) {
      const years = Object.keys(series).filter(year => typeof series[year] === 'number').sort();
      if (!years.length) continue;
      const year = layer.source.latestAvailableYear || years.at(-1);
      const term = document.createElement('dt'), detail = document.createElement('dd'); term.textContent = `${name} (${year})`; detail.textContent = format(series[year]); list.append(term,detail);
    }
    this.detail.append(list);
    const scope = document.createElement('p'); scope.textContent = layer.source.scopeNote || ''; this.detail.append(scope);
    const source = document.createElement('a'); source.textContent = layer.source.name; source.href = layer.source.url; source.target = '_blank'; source.rel = 'noopener noreferrer'; this.detail.append(source);
  }
}
