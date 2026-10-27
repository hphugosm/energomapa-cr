/** Relative, user-weighted scores, not an objective recommendation.
 * Coverage is available weight / total weight, expressed as percent.
 */
import {finite} from '../engine.mjs';
import {candidateIds,criterionConfig,observations,compareIds} from './filters.mjs';
export async function scoreLocations({engine,criteria,territoryIds,missingPolicy='available'}={}) {
  if (!['available','exclude'].includes(missingPolicy) || !Array.isArray(criteria) || !criteria.length) throw Error('Neplatná pravidla skórování.');
  const configs=criteria.map(c=>{
    const result=criterionConfig(engine,c);
    if (!finite(c.weight)||c.weight<0||!['higher','lower','target'].includes(c.direction)) throw Error('Neplatná váha nebo směr skórování.');
    if (c.direction==='target'&&(!finite(c.min)||!finite(c.max)||c.min>c.max)) throw Error('Neplatný cílový interval.');
    return result;
  }).filter(c=>c.weight>0);
  const totalWeight=configs.reduce((sum,c)=>sum+c.weight,0);
  if (!(totalWeight>0)) throw Error('Součet vah musí být kladný.');
  const ids=candidateIds(engine,territoryIds),all=await observations(engine,configs,ids);
  const bounds=configs.map((_,i)=>{
    const values=all.map(r=>r.values[i].value).filter(finite);
    return {min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null};
  });
  let excludedMissing=0;
  const rows=[];
  for (const row of all) {
    const factors=configs.map((c,i)=>{
      const result=row.values[i],value=result.value,available=finite(value), b=bounds[i];
      let score=null;
      if (available) {
        if (c.direction==='target') score=value>=c.min&&value<=c.max?100:value<c.min?100*(1-(c.min-value)/(c.min-b.min||1)):100*(1-(value-c.max)/(b.max-c.max||1));
        else score=b.max===b.min?50:100*(c.direction==='higher'?(value-b.min)/(b.max-b.min):(b.max-value)/(b.max-b.min));
        score=Math.max(0,Math.min(100,score));
      }
      return {...result,weight:c.weight,direction:c.direction,min:c.min,max:c.max,domain:b,score,available,partial:!!result.partial};
    });
    const weighted=factors.filter(f=>f.weight>0),available=weighted.filter(f=>f.available);
    const availableWeight=available.reduce((sum,f)=>sum+f.weight,0);
    if (!availableWeight || (missingPolicy==='exclude'&&available.length<weighted.length)) {excludedMissing++;continue;}
    for (const factor of factors) factor.contribution = factor.available ? factor.score * factor.weight / availableWeight : null;
    rows.push({id:row.id,score:available.reduce((sum,f)=>sum+f.score*f.weight,0)/availableWeight,
      coverage:100*availableWeight/totalWeight,availableCriteria:available.length,totalCriteria:weighted.length,
      partial:factors.some(f=>f.partial),factors});
  }
  rows.sort((a,b)=>b.score-a.score||compareIds(a.id,b.id));
  return {rows,total:ids.length,excludedMissing,criteria:configs,missingPolicy,domains:bounds};
}
