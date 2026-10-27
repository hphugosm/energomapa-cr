/** Nearest reported facilities by great-circle distance; never a road-route estimate. */
const EARTH_RADIUS_KM = 6371.0088;
const number = value => typeof value === 'number' && Number.isFinite(value);
const validCoordinates = (lat, lon) => number(lat) && number(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const textCompare = (a, b) => String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
const validYear = value => Number.isInteger(value) && value >= 1 && value <= 9999;

/** Mean-Earth-radius haversine distance in kilometres, accepting numbers or two {lat,lon} objects. */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 && typeof lat1 === 'object' && lon1 && typeof lon1 === 'object') {
    const a = lat1, b = lon1;
    ({lat: lat1, lon: lon1} = a); ({lat: lat2, lon: lon2} = b);
  }
  if (!validCoordinates(lat1, lon1) || !validCoordinates(lat2, lon2)) throw RangeError('Vzdálenost vyžaduje platné číselné souřadnice WGS84.');
  const radians = degrees => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1), deltaLon = radians(lon2 - lon1);
  const hav = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.max(0, Math.min(1, hav))));
}

function snapshotYear(source) {
  const asOf = source?.asOf;
  return typeof asOf === 'string' && /^\d{4}(?:-|$)/.test(asOf) ? Number(asOf.slice(0, 4)) : null;
}
function observationYear(point, fallbackYear) {
  const year = point.year ?? point.properties?.year;
  return validYear(year) ? year : fallbackYear;
}
function flatPoints(data) {
  if (Array.isArray(data.points)) return data.points;
  return (data.features || []).filter(feature => feature.geometry?.type === 'Point').map(feature => ({
    id: feature.id, type: feature.properties?.kind, name: feature.properties?.name,
    lat: feature.geometry.coordinates?.[1], lon: feature.geometry.coordinates?.[0],
    municipalityCode: feature.properties?.municipalityId, regionCode: feature.properties?.regionId,
    year: feature.properties?.year, properties: feature.properties || {}, source: feature.properties?.source
  }));
}

export class NearestEngine {
  constructor(pointLayerStore) {
    if (!pointLayerStore || typeof pointLayerStore.load !== 'function' || typeof pointLayerStore.layer !== 'function') throw TypeError('NearestEngine vyžaduje generic PointLayerStore.');
    this.store = pointLayerStore;
  }

  /** Load only the requested registry layer. The store supplies shared cache and in-flight deduplication. */
  async findNearest({lat, lon, layer, limit = 5, year} = {}) {
    if (!validCoordinates(lat, lon)) throw RangeError('Zadejte platné číselné souřadnice WGS84.');
    if (!Number.isInteger(limit) || limit < 1) throw RangeError('Počet výsledků musí být kladné celé číslo.');
    if (year !== undefined && !validYear(year)) throw RangeError('Rok musí být celé číslo.');
    if (typeof layer !== 'string' || !layer.trim()) throw TypeError('Vyberte bodovou vrstvu z registru.');
    const metadata = this.store.layer(layer);
    const data = await this.store.load(layer);
    const source = data.source || metadata.source;
    const fallbackYear = snapshotYear(source);
    const raw = flatPoints(data);
    const datedYears = [...new Set(raw.map(point => observationYear(point, fallbackYear)).filter(validYear))].sort((a, b) => a - b);
    const selectedYear = year ?? datedYears.at(-1) ?? null;
    const eligible = raw.filter(point => selectedYear === null || observationYear(point, fallbackYear) === selectedYear);
    let invalidCoordinates = 0;
    const candidates = eligible.filter(point => {
      if (validCoordinates(point.lat, point.lon)) return true;
      invalidCoordinates++; return false;
    }).sort((a, b) => textCompare(a.id, b.id) || a.lat - b.lat || a.lon - b.lon || textCompare(a.name, b.name));
    // Stable source identity only; equal addresses/coordinates do not imply identical facilities.
    const seen = new Set(), unique = [];
    for (const point of candidates) {
      const identity = point.properties?.facilityId ?? point.id;
      if (identity === undefined || identity === null || identity === '') continue;
      const key = String(identity);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({...point, distanceKm: haversineDistance(lat, lon, point.lat, point.lon), source: point.source || point.properties?.source || source});
    }
    unique.sort((a, b) => a.distanceKm - b.distanceKm || textCompare(a.id, b.id));
    return {
      layerId: layer, layerName: metadata.name || layer, source,
      selectedYear, availableYears: datedYears, totalCandidates: unique.length,
      invalidCoordinates, duplicatesExcluded: candidates.length - unique.length,
      distanceMethod: 'straight-line', results: unique.slice(0, limit)
    };
  }
}

export const createNearestEngine = pointLayerStore => new NearestEngine(pointLayerStore);
