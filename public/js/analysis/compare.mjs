/** Compare own latest source periods, never pretend snapshots share a year. */
import {finite} from '../engine.mjs';

const periodFor = (metric,year) => metric.timeType === 'static' ? `Model · ${metric.referencePeriod || metric.source?.referencePeriod || 'referenční období dle zdroje'}` : metric.timeType === 'snapshot' && metric.source?.asOf ? metric.source.asOf : String(year);

export async function compareTerritories({engine,territoryIds,metricIds = [engine.manifest.defaultMetric]}) {
  if (!Array.isArray(territoryIds) || territoryIds.length < 2 || territoryIds.length > 3 || new Set(territoryIds).size !== territoryIds.length) throw Error('Porovnání vyžaduje 2–3 různá území.');
  const territories = territoryIds.map(id => {
    const territory = engine.territories.get(String(id));
    if (!territory) throw Error(`Neznámé území: ${id}`);
    return {id:territory.id,name:territory.name,level:territory.level};
  });
  if (!Array.isArray(metricIds) || !metricIds.length || new Set(metricIds).size !== metricIds.length) throw Error('Vyberte alespoň jednu jedinečnou metriku.');
  // Validate every reference before initiating any fetch.
  const metrics = metricIds.map(id => engine.metric(id));
  await Promise.all(metricIds.map(id => engine.load(id)));
  const rows = metrics.map(metric => {
    const year = metric.years.length ? Math.max(...metric.years) : null;
    const values = territories.map(territory => {
      const result = year === null ? {value:null,rawValue:null,coverage:0,expected:0,valueStatus:'unavailable'} : engine.value(metric.id,territory.id,year);
      const missing = !finite(result.value);
      const componentPeriods = result.componentYears ? Object.fromEntries(Object.entries(result.componentYears).map(([id,componentYear]) => {
        const component = engine.metric(id);
        return [id,{year:componentYear,period:componentYear === null ? null : periodFor(component,componentYear),source:component.source}];
      })) : undefined;
      return {...result,territoryId:territory.id,year,period:year === null ? null : periodFor(metric,year),source:metric.source,
        missing,value:missing ? null : result.value,valueStatus:missing ? (result.valueStatus === 'available' ? 'missing' : result.valueStatus || 'missing') : 'available',
        ...(componentPeriods ? {componentPeriods} : {})};
    });
    return {metricId:metric.id,name:metric.name,unit:engine.unit(metric.id),year,timeType:metric.timeType || (metric.years.length > 1 ? 'timeseries' : 'snapshot'),source:metric.source,values};
  });
  return {territories,metricIds:[...metricIds],rows,periodNote:'Každá metrika používá vlastní poslední dostupný zdrojový rok či datum. Odvozené podíly uvádějí období každé složky.'};
}
