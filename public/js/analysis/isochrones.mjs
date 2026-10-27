/** Static road-network polygons. No automatic calls to public routing services. */
import {haversineDistance} from './nearest.mjs';

function location({lat,lon}={}) {
  if (!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180) throw RangeError('Neplatné souřadnice počátku isochrony.');
  return {lat,lon};
}
function durations(minutes) {
  if (!Array.isArray(minutes)||!minutes.length||minutes.length>4||minutes.some(t=>!Number.isFinite(t)||t<=0||t>120)) throw RangeError('Neplatné časy isochron.');
  return [...new Set(minutes)].sort((a,b)=>a-b);
}
export function validateIsochrones(data,minutes) {
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Neplatná odpověď routing serveru.');
  const found=new Set();
  for(const feature of data.features){
    const properties=feature?.properties,contour=properties?.contour??properties?.minutes;
    if(feature.type!=='Feature'||!['Polygon','MultiPolygon'].includes(feature.geometry?.type)||!Array.isArray(feature.geometry.coordinates)||!feature.geometry.coordinates.length||properties?.metric!=='time'||!minutes.includes(contour)||found.has(contour))throw Error('Neplatný polygon nebo čas isochrony.');
    const check=coords=>{
      if(Array.isArray(coords)&&coords.length>=2&&typeof coords[0]==='number'){
        if(!Number.isFinite(coords[0])||!Number.isFinite(coords[1])||Math.abs(coords[0])>180||Math.abs(coords[1])>90)throw Error('Neplatné souřadnice polygonu.');
      }else if(Array.isArray(coords)&&coords.length)coords.forEach(check);else throw Error('Prázdný polygon.');
    };check(feature.geometry.coordinates);found.add(contour);
  }
  if(minutes.some(t=>!found.has(t)))throw Error('Odpověď neobsahuje všechny požadované časy.');
  return data;
}
export function createIsochroneLoader({baseUrl='data/isochrones/',fetcher=globalThis.fetch}={}) {
  const cache=new Map();
  const json=path=>{
    if(!cache.has(path))cache.set(path,Promise.resolve().then(()=>fetcher(baseUrl.replace(/\/?$/,'/')+path,{cache:'no-cache'})).then(response=>{
      if(!response.ok)throw Error(`Isochrony nejsou dostupné (${response.status}).`);return response.json();
    }).catch(error=>{cache.delete(path);throw error;}));
    return cache.get(path);
  };
  async function manifest(){
    const value=await json('manifest.json');
    if(value?.schemaVersion!==1||!Array.isArray(value.origins)||!value.origins.length)throw Error('Neplatný index isochron.');
    return value;
  }
  async function nearest(point){
    const at=location(point),index=await manifest();
    return index.origins.map(origin=>({...origin,distanceKm:haversineDistance(at,origin)})).sort((a,b)=>a.distanceKm-b.distanceKm||a.id.localeCompare(b.id))[0];
  }
  async function load({originId,minutes}={}) {
    const index=await manifest(),origin=index.origins.find(o=>o.id===originId);
    if(!origin)throw Error('Zvolte dostupný předpočítaný počátek.');
    const requested=durations(minutes??origin.minutes);
    if(requested.some(t=>!origin.minutes.includes(t)))throw Error('Čas není předpočítaný. 120 min vyžaduje vlastní routing server.');
    if(!/^[\w.-]+\.geojson$/.test(origin.path))throw Error('Neplatná cesta isochrony.');
    const data=validateIsochrones(await json(origin.path),origin.minutes);
    return {geojson:{...data,features:data.features.filter(f=>requested.includes(f.properties.contour??f.properties.minutes))},origin,approximateOrigin:false,source:data.source??index.source,limitations:index.limitations};
  }
  return {manifest,nearest,load};
}
/** Explicit opt-in only; endpoint must be supplied by user/app configuration.
 * Self-hosted Valhalla supports120min after increasing its service limits.
 */
export async function requestExternalIsochrones({endpoint,lat,lon,minutes=[15,30,60,120],fetcher=globalThis.fetch}={}) {
  const origin=location({lat,lon}),times=durations(minutes);
  if(typeof endpoint!=='string'||!endpoint)throw Error('Vlastní routing endpoint není nastaven.');
  const url=new URL(endpoint,globalThis.location?.href??'http://localhost/');
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Neplatný routing endpoint.');
  const parameters={locations:[origin],costing:'auto',contours:times.map(time=>({time})),polygons:true,denoise:1,generalize:100,show_locations:false};
  url.searchParams.set('json',JSON.stringify(parameters));
  const response=await fetcher(url.href,{headers:{'X-Client-Id':'energomapa-configured-routing'}});
  if(!response.ok)throw Error(`Routing server odmítl výpočet (${response.status}); základní statické isochrony zůstávají dostupné.`);
  const geojson=validateIsochrones(await response.json(),times);
  return {geojson,origin,approximateOrigin:false,source:{name:'Výslovně nastavený Valhalla endpoint',url:url.origin,attribution:'© OpenStreetMap contributors'},limitations:'Výpočet po silniční síti ze zadaného bodu; odhad jízdy bez záruky aktuální dopravy.'};
}
