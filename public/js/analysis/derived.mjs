/** Declarative ratios. The restricted grammar never executes formula text. */
import {finite} from '../engine.mjs';

export const DEFAULT_DERIVED_METRICS = [
  {id: 'solar_capacity_per_1000', name: 'Výkon FVE na 1 000 obyvatel', formula: 'solar_capacity / population * 1000', unit: 'MW / 1 000 obyv.'},
  {id: 'generation_capacity_per_km2', name: 'Výkon výroben na km²', formula: 'generation_capacity / areaKm2', unit: 'MW/km²'},
  {id: 'ev_charging_points_per_1000', name: 'Nabíjecí body na 1 000 obyvatel', formula: 'ev_charging_points / population * 1000', unit: 'bodů / 1 000 obyv.'},
  {id: 'industrial_co2_per_capita', name: 'Vykázané průmyslové CO₂ na obyvatele', formula: 'industrial_co2_tonnes / population', unit: 't CO₂/obyv./rok'},
];

export function parseDerivedFormula(formula) {
  if (typeof formula !== 'string') throw Error('Odvozená metrika musí obsahovat vzorec.');
  const match = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\/\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\*\s*(\d+(?:\.\d+)?))?\s*$/.exec(formula);
  if (!match) throw Error('Povolen je pouze vzorec metrika / metrika_nebo_areaKm2 * kladný_faktor.');
  const factor = match[3] === undefined ? 1 : Number(match[3]);
  if (!finite(factor) || factor <= 0) throw Error('Faktor odvozené metriky musí být kladný a konečný.');
  return {numerator: match[1], denominator: match[2], factor, denominatorField: match[2] === 'areaKm2'};
}

const latestAt = (years, year) => years.filter(y => y <= year).sort((a,b) => b-a)[0];
const sameIds = (a,b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const ids = new Set(b);
  return a.every(code => ids.has(code));
};
const installations = new WeakMap();

/** Install before rendering selectors. Base engine contracts and dataset cache are retained. */
export function installDerivedMetrics(engine, declarations = DEFAULT_DERIVED_METRICS) {
  if (installations.has(engine)) return engine;
  const prepared = declarations.map(declaration => {
    const expression = parseDerivedFormula(declaration.formula);
    if (!declaration.id || engine.metrics.has(declaration.id)) throw Error(`Duplicitní odvozená metrika: ${declaration.id}`);
    const numerator = engine.metric(expression.numerator);
    const denominator = expression.denominatorField ? null : engine.metric(expression.denominator);
    if (numerator.derived || denominator?.derived) throw Error('Vnořené odvozené metriky nejsou podporovány.');
    const years = numerator.years.filter(year => expression.denominatorField || latestAt(denominator.years,year) !== undefined);
    return {declaration, expression, numerator, denominator, years};
  });
  if (new Set(prepared.map(x => x.declaration.id)).size !== prepared.length) throw Error('Duplicitní ID odvozené metriky.');
  const rules = new Map(), baseLoad = engine.load.bind(engine), baseAggregate = engine.aggregate.bind(engine);
  const pending = new Map(), loaded = new Map();
  for (const {declaration,expression,numerator,denominator,years} of prepared) {
    const available = numerator.status !== 'unavailable' && (!denominator || denominator.status !== 'unavailable') && years.length;
    const components = [numerator,denominator].filter(Boolean);
    const metric = {...declaration, derived: true, expression, category: 'derived', years,
      status: available ? 'verified' : 'unavailable', timeType: numerator.timeType || (years.length > 1 ? 'timeseries' : 'snapshot'),
      normalizations: ['absolute'], geography: numerator.geography.filter(level => !denominator || denominator.geography.includes(level)),
      colorScale: numerator.colorScale, aggregation: 'sum', path: `derived:${declaration.id}`,
      aggregationNote: 'Podíl agregovaných veličin; lokální podíly se nesčítají.',
      source: {name: `Odvozeno: ${components.map(m => m.source?.name || m.name).join(' / ')}`,
        url: numerator.source?.url, temporalGranularity: numerator.timeType || 'snapshot',
        scopeNote: 'Odvozený podíl. Každá složka má vlastní zdrojový rok; jmenovatel používá poslední dostupný rok nejvýše roven roku čitatele.',
        methodology: declaration.formula, components: components.map(m => ({metricId: m.id, source: m.source, years: m.years})),
        limitations: ['Jmenovatel a čitatel mohou pocházet z odlišných období.', 'Územní pokrytí složek musí být totožné. Chybějící data nejsou nuly.']}};
    engine.manifest.metrics.push(metric); engine.metrics.set(metric.id,metric); rules.set(metric.id,metric);
  }
  engine.load = async id => {
    if (!rules.has(id)) return baseLoad(id);
    if (loaded.has(id)) return loaded.get(id);
    if (pending.has(id)) return pending.get(id);
    const metric = rules.get(id), {expression} = metric;
    if (metric.status === 'unavailable') return null;
    const dependencies = [expression.numerator,...(expression.denominatorField ? [] : [expression.denominator])];
    const promise = Promise.all(dependencies.map(baseLoad)).then(() => {
      const result = {schemaVersion: 1, metricId: id, derived: true, dependencies};
      loaded.set(id,result); engine.domainCache.clear(); return result;
    }).finally(() => pending.delete(id));
    pending.set(id,promise); return promise;
  };
  engine.aggregate = (id,territoryId,year) => {
    if (!rules.has(id)) return baseAggregate(id,territoryId,year);
    const metric = rules.get(id), expression = metric.expression;
    const numerator = baseAggregate(expression.numerator,territoryId,year);
    const denominatorYear = expression.denominatorField ? null : latestAt(engine.metric(expression.denominator).years,Number(year));
    const componentYears = {[expression.numerator]: Number(year), ...(expression.denominatorField ? {} : {[expression.denominator]:denominatorYear ?? null})};
    const result = {...numerator,value:null,rawValue:null,derived:true,formula:metric.formula,componentYears,denominatorYear,
      mixedPeriods: denominatorYear !== null && denominatorYear !== Number(year), valueStatus:numerator.valueStatus === 'available' ? 'missing' : numerator.valueStatus};
    if (!loaded.has(id) || !metric.years.includes(Number(year)) || !finite(numerator.value)) return result;
    let denominator;
    if (expression.denominatorField) {
      const ids = numerator.coveredIds;
      if (!ids?.length || ids.some(code => !finite(engine.territories.get(code)?.areaKm2) || engine.territories.get(code).areaKm2 <= 0)) return {...result,denominatorMissing:true};
      denominator = ids.reduce((sum,code) => sum + engine.territories.get(code).areaKm2,0);
    } else {
      const other = baseAggregate(expression.denominator,territoryId,denominatorYear);
      if (!finite(other.value) || !sameIds(numerator.coveredIds,other.coveredIds)) return {...result,denominatorMissing:true,coverageMismatch:finite(other.value)};
      denominator = other.value;
    }
    if (!(denominator > 0)) return {...result,denominator,denominatorMissing:true};
    const value = numerator.value / denominator * expression.factor;
    return {...result,value:finite(value) ? value : null,rawValue:finite(value) ? value : null,denominator,valueStatus:finite(value) ? 'available' : 'missing'};
  };
  installations.set(engine,rules);
  return engine;
}
