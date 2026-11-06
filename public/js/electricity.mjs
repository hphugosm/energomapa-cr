import {selectionMetadata, datasetCSV} from './databank/metadata.mjs';
/** Signed power/energy values: positive = import to CZ, negative = export from CZ. */
export const BORDERS = Object.freeze({DE:'Německo',PL:'Polsko',SK:'Slovensko',AT:'Rakousko'});
export const isNumber = value => typeof value === 'number' && Number.isFinite(value);
export function flowTotals(record, borders = Object.keys(BORDERS)) {
  const available = borders.filter(key => isNumber(record?.[key]));
  const complete = borders.length > 0 && available.length === borders.length;
  if (!complete) return {imports:null,exports:null,net:null,available:available.length,expected:borders.length};
  const imports = borders.reduce((sum,key) => sum + Math.max(0,record[key]),0);
  const exports = borders.reduce((sum,key) => sum + Math.max(0,-record[key]),0);
  return {imports,exports,net:exports-imports,available:available.length,expected:borders.length};
}
export function filterRecords(records, start = '', end = '', frequency = '') {
  const annual = frequency === 'year' || (!frequency && records.every(row => /^\d{4}$/.test(String(row.time))));
  if (annual) {
    const from = start ? Number(String(start).slice(0, 4)) : -Infinity;
    const to = end ? Number(String(end).slice(0, 4)) : Infinity;
    return records.filter(row => Number(row.time) >= from && Number(row.time) <= to);
  }
  return records.filter(record => (!start || String(record.time).slice(0,10) >= start) && (!end || String(record.time).slice(0,10) <= end));
}
export function exportSelection(dataset, records, keys) {
  const columns = (dataset.columns || []).filter(column => keys.includes(column.key));
  const selected = records.map(record => Object.fromEntries(['time', ...columns.map(col => col.key)].map(key => [key, record[key] ?? null])));
  return {...dataset, columns, records: selected, ...selectionMetadata(dataset, selected, columns),
    selection: {start: selected[0]?.time ?? null, end: selected.at(-1)?.time ?? null, columns: columns.map(col => col.key)}};
}
export function selectionCSV(dataset, records, keys) {
  return '\uFEFF' + datasetCSV(exportSelection(dataset, records, keys));
}
