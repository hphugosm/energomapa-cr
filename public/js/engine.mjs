/** Generic metric engine. No energy metric IDs or geography-specific calculations. */
export const finite = value => typeof value === 'number' && Number.isFinite(value);
export function format(value, digits = 2) {
  if (!finite(value)) return '—';
  const options = digits > 0 && value !== 0 && Math.abs(value) < 10 ** -digits
    ? {maximumSignificantDigits: 3} : {maximumFractionDigits: digits};
  return new Intl.NumberFormat('cs-CZ', options).format(value);
}

export function calendarYears(years = []) {
  if (!years.length) return [];
  const sorted = [...new Set(years.map(Number))].sort((a, b) => a - b);
  return Array.from({length: sorted.at(-1) - sorted[0] + 1}, (_, i) => sorted[0] + i);
}

export function validateManifest(manifest) {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.metrics)) throw Error('Nepodporovaný manifest dat.');
  const ids = new Set();
  for (const metric of manifest.metrics) {
    if (!metric.id || ids.has(metric.id)) throw Error('Manifest obsahuje neplatné nebo duplicitní ID metriky.');
    ids.add(metric.id);
    if (metric.timeType !== undefined && !['timeseries', 'snapshot', 'static'].includes(metric.timeType)) throw Error(`Neplatný typ času: ${metric.id}`);
    if (metric.aggregation !== undefined && !['sum', 'area_weighted_mean'].includes(metric.aggregation)) throw Error(`Neplatná agregace: ${metric.id}`);
    if (!Array.isArray(metric.years) || !Array.isArray(metric.normalizations) || !metric.normalizations.length || !Array.isArray(metric.geography)) throw Error(`Neúplná metadata: ${metric.id}`);
    if (metric.status !== 'unavailable' && !metric.path) throw Error(`Chybí cesta k datům: ${metric.id}`);
    if (metric.years.some(y => !Number.isInteger(y)) || new Set(metric.years).size !== metric.years.length) throw Error(`Neplatné roky: ${metric.id}`);
    for (const key of metric.normalizations) if (!manifest.normalizations?.[key]) throw Error(`Neznámá normalizace: ${key}`);
  }
  if (!ids.has(manifest.defaultMetric)) throw Error('Neplatná výchozí metrika.');
  return manifest;
}

export class MetricEngine {
  constructor(manifest, territories, {fetchJSON = async path => {
    const response = await fetch(path);
    if (!response.ok) throw Error(`Data nelze načíst (${response.status}).`);
    return response.json();
  }, baseURL = './data/'} = {}) {
    this.manifest = validateManifest(manifest);
    const rows = Array.isArray(territories) ? territories : territories.territories;
    this.territories = new Map(rows.map(t => [String(t.id), t]));
    this.metrics = new Map(manifest.metrics.map(m => [m.id, m]));
    this.children = new Map();
    this.leaves = new Map();
    this.cache = new Map();
    this.pending = new Map();
    this.domainCache = new Map();
    this.fetchJSON = fetchJSON;
    this.baseURL = baseURL;
    for (const territory of rows) {
      if (!this.children.has(territory.parentId)) this.children.set(territory.parentId, []);
      this.children.get(territory.parentId).push(territory.id);
    }
    for (const t of rows) if (t.level === 'municipality') {
      let current = t;
      const seen = new Set();
      while (current) {
        if (seen.has(current.id)) throw Error('Cyklická územní hierarchie.');
        seen.add(current.id);
        if (!this.leaves.has(current.id)) this.leaves.set(current.id, []);
        this.leaves.get(current.id).push(t.id);
        current = this.territories.get(current.parentId);
      }
    }
  }

  metric(id) {
    const metric = this.metrics.get(id);
    if (!metric) throw Error(`Neznámá metrika: ${id}`);
    return metric;
  }

  async load(id) {
    const metric = this.metric(id);
    if (this.cache.has(id)) return this.cache.get(id);
    if (this.pending.has(id)) return this.pending.get(id);
    if (metric.status === 'unavailable') return null;
    const promise = this.fetchJSON(this.baseURL + metric.path).then(data => {
      if (data.schemaVersion !== 1 || data.metricId !== id || !data.values) throw Error(`Neplatný datový kontrakt: ${id}`);
      for (const [year, values] of Object.entries(data.values)) {
        if (!metric.years.includes(Number(year))) throw Error(`Rok ${year} není v manifestu: ${id}`);
        for (const [code, value] of Object.entries(values)) {
          if (!this.territories.has(code)) throw Error(`Neznámý kód území ${code}.`);
          if (value !== null && !finite(value)) throw Error(`Neplatná hodnota ${id}/${code}/${year}.`);
        }
      }
      for (const [year, statuses] of Object.entries(data.statuses || {})) {
        if (!metric.years.includes(Number(year))) throw Error(`Neplatný rok stavu: ${id}/${year}`);
        for (const [code, status] of Object.entries(statuses)) {
          if (!this.territories.has(code) || !['missing', 'not_applicable', 'unavailable'].includes(status) || finite(data.values[year]?.[code])) throw Error(`Neplatný stav hodnoty: ${id}/${code}/${year}`);
        }
      }
      this.cache.set(id, data);
      this.domainCache.clear();
      return data;
    }).finally(() => this.pending.delete(id));
    this.pending.set(id, promise);
    return promise;
  }

  async prepare(id, normalization = 'absolute') {
    await this.load(id);
    const config = this.manifest.normalizations[normalization];
    // New ratio normalizations may reference another dataset, fetched only when needed.
    if (config?.denominatorMetric) await this.load(config.denominatorMetric);
  }

  aggregate(id, territoryId, year) {
    const metric = this.metric(id), data = this.cache.get(id);
    const territory = this.territories.get(territoryId);
    const expectedIds = this.leaves.get(territoryId) || [];
    const expected = territory?.level === 'municipality' ? 1 : expectedIds.length;
    const unavailable = {value: null, rawValue: null, coverage: 0, expected, partial: false, coveredIds: [], valueStatus: data?.statuses?.[String(year)]?.[territoryId] || (metric.status === 'unavailable' ? 'unavailable' : 'missing')};
    if (!data || !territory || !metric.geography.includes(territory.level)) return unavailable;
    const values = data.values[String(year)] || {};
    const explicitStatus = data.statuses?.[String(year)]?.[territoryId];
    if (explicitStatus) return {...unavailable, valueStatus: explicitStatus};
    const direct = values[territoryId];
    if (finite(direct)) return {value: direct, rawValue: direct,
      coverage: territory.level === 'municipality' ? 1 : null, expected, partial: false,
      coveredIds: territory.level === 'municipality' ? [territoryId] : null, direct: true, valueStatus: 'available'};
    if (territory.level === 'municipality') return unavailable;
    // Only additive metrics are summed. Ratios/potentials must declare an aggregation rule.
    const rule = metric.aggregation || 'sum';
    const coveredIds = expectedIds.filter(code => finite(values[code]) && (rule !== 'area_weighted_mean' || (finite(this.territories.get(code)?.areaKm2) && this.territories.get(code).areaKm2 > 0)));
    if (!coveredIds.length) {
      const statuses = expectedIds.map(code => data.statuses?.[String(year)]?.[code] || 'missing');
      return {...unavailable, valueStatus: statuses.length && statuses.every(status => status === statuses[0]) ? statuses[0] : 'missing'};
    }
    const weight = rule === 'area_weighted_mean' ? coveredIds.reduce((sum, code) => sum + this.territories.get(code).areaKm2, 0) : 1;
    const value = coveredIds.reduce((sum, code) => sum + values[code] * (rule === 'area_weighted_mean' ? this.territories.get(code).areaKm2 : 1), 0) / weight;
    return {value, rawValue: value, coverage: coveredIds.length, expected,
      partial: coveredIds.length < expected, coveredIds, valueStatus: 'available'};
  }

  value(id, territoryId, year, normalization = 'absolute', mode = 'value') {
    const metric = this.metric(id);
    if (!metric.normalizations.includes(normalization)) return {value: null, coverage: 0, expected: 0};
    const result = this.normalized(id, territoryId, year, normalization);
    if (mode !== 'yoy') return result;
    const before = this.normalized(id, territoryId, year - 1, normalization);
    // A change is meaningful only for the exact same set of municipalities.
    const sameCoverage = Array.isArray(result.coveredIds) && Array.isArray(before.coveredIds) && result.coveredIds.length === before.coveredIds.length &&
      result.coveredIds?.every((code, i) => code === before.coveredIds[i]);
    return {...result, value: finite(result.value) && finite(before.value) && sameCoverage
      ? result.value - before.value : null, before: before.value};
  }

  normalized(id, territoryId, year, normalization) {
    const result = this.aggregate(id, territoryId, year);
    const config = this.manifest.normalizations[normalization];
    if (!config || normalization === 'absolute' || !finite(result.value)) return result;
    let denominator;
    if (config.denominatorMetric) {
      // Reject mismatched numerator/denominator coverage instead of silently inventing a ratio.
      const data = this.cache.get(config.denominatorMetric)?.values?.[String(config.denominatorYear ?? year)] || {};
      const ids = result.coveredIds;
      if (!ids?.length || ids.some(code => !finite(data[code]) || data[code] < 0)) return {...result, value: null, denominatorMissing: true};
      denominator = ids.reduce((sum, code) => sum + data[code], 0);
    } else {
      const ids = result.coveredIds;
      if (!ids?.length || ids.some(code => !finite(this.territories.get(code)?.[config.denominator]) || this.territories.get(code)[config.denominator] < 0)) {
        return {...result, value: null, denominatorMissing: true};
      }
      denominator = ids.reduce((sum, code) => sum + this.territories.get(code)[config.denominator], 0);
    }
    // Known zero components are valid in a ratio of sums; the total must be positive.
    if (!(denominator > 0)) return {...result, denominator, value: null, denominatorMissing: true};
    return {...result, denominator, value: result.value * (config.factor ?? 1) / denominator};
  }

  series(id, territoryId, normalization = 'absolute', mode = 'value') {
    return calendarYears(this.metric(id).years).map(year => ({year, ...this.value(id, territoryId, year, normalization, mode)}));
  }

  domain(id, ids, normalization = 'absolute', mode = 'value') {
    const key = `${id}|${normalization}|${mode}|${ids.join(',')}`;
    if (this.domainCache.has(key)) return this.domainCache.get(key);
    const intensity = this.metric(id).aggregation === 'area_weighted_mean' && mode !== 'yoy';
    let min = intensity ? Infinity : 0, max = intensity ? -Infinity : 0, count = 0;
    for (const year of this.metric(id).years) for (const code of ids) {
      const value = this.value(id, code, year, normalization, mode).value;
      if (!finite(value)) continue;
      min = Math.min(min, value); max = Math.max(max, value); count++;
    }
    if (!count) { min = 0; max = 1; }
    const signed = mode === 'yoy' || min < 0;
    if (signed) {max = Math.max(Math.abs(min), Math.abs(max), 1e-9); min = -max;}
    else if (!max) max = 1;
    const domain = {min, max, signed, empty: count === 0};
    this.domainCache.set(key, domain);
    return domain;
  }

  unit(id, normalization = 'absolute', mode = 'value') {
    const metric = this.metric(id), config = this.manifest.normalizations[normalization];
    const unit = config?.unitOverride || [metric.unit, config?.unitSuffix].filter(Boolean).join(' ');
    return mode === 'yoy' ? `${unit} · změna za rok` : unit;
  }

  color(id, value, domain) {
    if (!finite(value)) return null;
    const scale = this.manifest.colorScales[this.metric(id).colorScale] || ['#eef3fc', '#173da5'];
    if (domain.signed) {
      const signed = this.manifest.colorScales.diverging || ['#bd423b', '#f6f7fa', '#173da5'];
      const t = (value - domain.min) / (domain.max - domain.min || 1);
      return interpolateColors(signed, t);
    }
    return interpolateColors(scale, (value - domain.min) / (domain.max - domain.min || 1));
  }
}

export function interpolateColors(colors, position) {
  const t = Math.max(0, Math.min(1, position)) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(t));
  const a = colors[index], b = colors[index + 1], fraction = t - index;
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) throw Error('Barevná škála musí používat šestimístné HEX barvy.');
  const channels = [1, 3, 5].map(offset => Math.round(parseInt(a.slice(offset, offset + 2), 16) * (1 - fraction) + parseInt(b.slice(offset, offset + 2), 16) * fraction));
  return `rgb(${channels.join(', ')})`;
}
