/** Generic, lazy analytical observations. Years default to each metric's own latest. */
import {finite} from '../engine.mjs';
export const compareIds = (a,b) => a < b ? -1 : a > b ? 1 : 0;
export function candidateIds(engine, territoryIds) {
  const ids = territoryIds ?? [...engine.territories.values()].filter(t=>t.level==='municipality').map(t=>t.id);
  if (!Array.isArray(ids) || ids.some(id=>typeof id!=='string' || !engine.territories.has(id))) throw Error('Neplatná území analýzy.');
  return [...new Set(ids)].sort(compareIds);
}
export function criterionConfig(engine, criterion) {
  if (!criterion || typeof criterion !== 'object') throw Error('Neplatné kritérium.');
  const metric = engine.metric(criterion.metric);
  const year = criterion.year ?? Math.max(...metric.years);
  const normalization = criterion.normalization ?? 'absolute';
  if (!metric.years.includes(year) || !metric.normalizations.includes(normalization)) throw Error(`Nedostupný rok nebo normalizace: ${metric.id}`);
  return {...criterion, year, normalization};
}
export async function observations(engine, criteria, ids) {
  // MetricEngine owns concurrent request deduplication and persistent dataset caches.
  await Promise.all(criteria.map(c=>engine.prepare(c.metric,c.normalization)));
  return ids.map(id=>({id, values:Object.fromEntries(criteria.map((c,index)=>[String(index), {
    ...engine.value(c.metric,id,c.year,c.normalization),metric:c.metric,year:c.year,
    normalization:c.normalization,unit:engine.unit(c.metric,c.normalization)
  }]))}));
}
/** AND conditions; unknown observations are excluded, never replaced with zero.
 * top/bottom are exact ceil(percent*N) finite observations, ties by territory ID.
 */
export async function filterTerritories({engine,conditions,territoryIds}={}) {
  if (!Array.isArray(conditions) || !conditions.length) throw Error('Zadejte alespoň jednu podmínku.');
  const configs=conditions.map(c=>{
    const result=criterionConfig(engine,c);
    if (!['>','>=','<','<=','between','top','bottom'].includes(c.operator) || !finite(c.value)) throw Error('Neplatný operátor nebo hodnota filtru.');
    if (c.operator==='between' && (!finite(c.max)||c.max<c.value)) throw Error('Neplatný interval.');
    if (['top','bottom'].includes(c.operator) && !(c.value>0&&c.value<=100)) throw Error('Percentil musí být v rozsahu (0, 100].');
    return result;
  });
  const ids=candidateIds(engine,territoryIds), all=await observations(engine,configs,ids);
  const ranks=configs.map((c,i)=>{
    if (!['top','bottom'].includes(c.operator)) return null;
    const valid=all.filter(r=>finite(r.values[i].value)).sort((a,b)=>(c.operator==='top'?-1:1)*(a.values[i].value-b.values[i].value)||compareIds(a.id,b.id));
    return new Set(valid.slice(0,Math.ceil(valid.length*c.value/100)).map(r=>r.id));
  });
  let excludedMissing=0;
  const rows=all.filter(row=>{
    if (configs.some((_,i)=>!finite(row.values[i].value))) {excludedMissing++;return false;}
    return configs.every((c,i)=>{
      const value=row.values[i].value;
      return c.operator==='>'?value>c.value:c.operator==='>='?value>=c.value:c.operator==='<'?value<c.value:c.operator==='<='?value<=c.value:c.operator==='between'?value>=c.value&&value<=c.max:ranks[i].has(row.id);
    });
  }).map(row=>({...row,partial:Object.values(row.values).some(v=>v.partial)}));
  return {rows,total:ids.length,matched:rows.length,excludedMissing,conditions:configs};
}
