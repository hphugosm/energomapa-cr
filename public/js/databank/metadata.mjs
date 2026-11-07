import {toCSV} from '../analysis/export.mjs';

const numeric = value => typeof value === 'number' && Number.isFinite(value);
/** Selection metadata describes serialized cells, never the parent snapshot. */
export function selectionMetadata(dataset, records, columns) {
  const keys = columns.filter(col => col.key !== 'time' && col.type !== 'string').map(col => col.key);
  const expected = records.length * keys.length;
  const available = records.reduce((sum, row) => sum + keys.filter(key => numeric(row[key])).length, 0);
  const times = new Set(records.map(row => String(row.time)));
  const selected = new Set(columns.map(col => col.key));
  const qualityFlags = (dataset.qualityFlags || []).filter(flag =>
    times.has(String(flag.time)) && (!('geo' in flag || 'column' in flag || 'key' in flag) || selected.has(flag.geo ?? flag.column ?? flag.key)));
  return {
    originalPeriod: dataset.originalPeriod ?? dataset.period,
    originalCoverage: dataset.originalCoverage ?? dataset.coverage,
    period: {start: records[0]?.time ?? null, end: records.at(-1)?.time ?? null},
    coverage: {rows: records.length, numericCells: expected, missingCells: expected - available,
      expectedValues: expected, availableValues: available,
      available: records.filter(row => keys.length && keys.every(key => numeric(row[key]))).length,
      expected: records.length, ...(dataset.coverage?.missingPolicy ? {missingPolicy: dataset.coverage.missingPolicy} : {})},
    qualityFlags, rowCount: records.length,
  };
}
export function datasetCSV(dataset) {
  const {records, ...metadata} = dataset;
  const source = {...metadata.source};
  source.license ??= 'Oprávnění / konkrétní licence dalšího užití nebyly doloženy; viz podmínky zdroje.';
  source.attribution ??= source.publisher || 'Neuvedeno';
  const preamble = '# metadata: ' + JSON.stringify({...metadata, source, qualityFlags: dataset.qualityFlags || [], csvMetadataVersion: 1});
  return preamble + '\r\n' + toCSV(records, ['time', ...dataset.columns.map(col => col.key).filter(key => key !== 'time')]);
}
