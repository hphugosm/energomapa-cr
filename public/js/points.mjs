/** Lazy facility-layer contract. No layer is fetched until explicitly requested. */
export const POINT_KINDS = Object.freeze(['power_plant', 'battery', 'charger', 'industry', 'heating']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
function validateSource(source) {
  if (!object(source) || !text(source.name) || !text(source.url)) throw Error('Bodová vrstva vyžaduje zdroj name a url.');
}
export function validatePointLayer(data, layer, territories) {
  if (object(data) && Array.isArray(data.points)) {
    if (data.schemaVersion !== 1 || data.layerId !== layer.id) throw Error('Neplatný kontrakt bodové vrstvy.');
    validateSource(data.source || layer.source);
    const ids = new Set();
    for (const point of data.points) {
      if (!object(point) || !text(point.id) || ids.has(point.id)) throw Error('Chybějící nebo duplicitní pointid.');
      ids.add(point.id);
      if (!text(point.type) || point.type !== (layer.type || layer.kind) || !text(point.name) || !object(point.properties)) throw Error(`Neplatné vlastnosti bodu ${point.id}.`);
      if (![point.lat, point.lon].every(value => typeof value === 'number' && Number.isFinite(value)) || Math.abs(point.lon) > 180 || Math.abs(point.lat) > 90) throw Error(`Neplatné souřadnice bodu ${point.id}.`);
      if (point.properties.source !== undefined) validateSource(point.properties.source);
      const municipality = territories.get(point.municipalityCode);
      if (municipality?.level !== 'municipality' || territories.get(point.regionCode)?.level !== 'region' || municipality.parentId !== point.regionCode) throw Error(`Neplatná obec nebo kraj bodu ${point.id}.`);
    }
    return {...data, type: 'FeatureCollection', features: data.points.map(point => ({type: 'Feature', id: point.id, geometry: {type: 'Point', coordinates: [point.lon, point.lat]}, properties: {...point.properties, ...(point.year !== undefined ? {year: point.year} : {}), name: point.name, kind: point.type, municipalityId: point.municipalityCode, regionId: point.regionCode, source: point.properties.source || data.source || layer.source}}))};
  }
  if (!object(data) || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw Error('Bodová vrstva musí být GeoJSON FeatureCollection.');
  const ids = new Set();
  for (const feature of data.features) {
    if (!object(feature) || feature.type !== 'Feature' || !text(feature.id) || ids.has(feature.id)) throw Error('Chybějící nebo duplicitní pointid (Feature.id).');
    ids.add(feature.id);
    const coordinates = feature.geometry?.coordinates;
    if (feature.geometry?.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length !== 2 || coordinates.some(value => typeof value !== 'number' || !Number.isFinite(value)) || Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) throw Error(`Neplatné souřadnice bodu ${feature.id}.`);
    const properties = feature.properties;
    if (!object(properties) || !text(properties.name) || !text(properties.kind) || properties.kind !== (layer.type || layer.kind)) throw Error(`Neplatné vlastnosti bodu ${feature.id}.`);
    if (!text(properties.municipalityId) || territories.get(properties.municipalityId)?.level !== 'municipality') throw Error(`Neznámá obec bodu ${feature.id}.`);
    if (!object(properties.metrics)) throw Error(`Chybí metriky bodu ${feature.id}.`);
    for (const [metricId, series] of Object.entries(properties.metrics)) {
      if (!text(metricId) || !object(series)) throw Error(`Neplatná metrika bodu ${feature.id}.`);
      for (const [year, value] of Object.entries(series)) {
        if (!/^\d{4}$/.test(year) || (value !== null && (typeof value !== 'number' || !Number.isFinite(value)))) throw Error(`Neplatné pozorování ${feature.id}/${metricId}/${year}.`);
      }
    }
    if (properties.source !== undefined) validateSource(properties.source);
  }
  return data;
}
export class PointLayerStore {
  constructor(manifest, territories, {fetchJSON = async path => {
    const response = await fetch(path);
    if (!response.ok) throw Error(`Bodovou vrstvu nelze načíst (${response.status}).`);
    return response.json();
  }, baseURL = './data/'} = {}) {
    const rows = Array.isArray(territories) ? territories : territories.territories;
    this.territories = new Map(rows.map(row => [String(row.id), row]));
    this.layers = new Map(); this.cache = new Map(); this.pending = new Map();
    this.fetchJSON = fetchJSON; this.baseURL = baseURL;
    if (manifest.points !== undefined && !Array.isArray(manifest.points)) throw Error('Manifest points musí být pole.');
    for (const layer of manifest.points || []) {
      if (!object(layer) || !text(layer.id) || this.layers.has(layer.id) || !text(layer.name) || !text(layer.path) || !text(layer.type || layer.kind)) throw Error('Neplatná nebo duplicitní bodová vrstva.');
      validateSource(layer.source);
      this.layers.set(layer.id, layer);
    }
  }
  layer(id) {
    const layer = this.layers.get(id);
    if (!layer) throw Error(`Neznámá bodová vrstva: ${id}`);
    return layer;
  }
  async load(id) {
    const layer = this.layer(id);
    if (this.cache.has(id)) return this.cache.get(id);
    if (this.pending.has(id)) return this.pending.get(id);
    const path = /^(?:[a-z][a-z\d+.-]*:|\/)/i.test(layer.path) ? layer.path : this.baseURL.replace(/\/?$/, '/') + layer.path;
    const promise = Promise.resolve().then(() => this.fetchJSON(path)).then(data => {
      const validated = validatePointLayer(data, layer, this.territories);
      this.cache.set(id, validated);
      return validated;
    }).finally(() => this.pending.delete(id));
    this.pending.set(id, promise);
    return promise;
  }
}
