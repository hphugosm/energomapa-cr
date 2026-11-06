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
export function filterRecords(records, start = '', end = '') {
  return records.filter(record => (!start || String(record.time).slice(0,10) >= start) && (!end || String(record.time).slice(0,10) <= end));
}
export function exportSelection(dataset, records, keys) {
  return {...dataset, columns:(dataset.columns || []).filter(column=>keys.includes(column.key)),records:records.map(record=>Object.fromEntries(['time',...keys].map(key=>[key,record[key] ?? null]))),selection:{start:records[0]?.time ?? null,end:records.at(-1)?.time ?? null,columns:keys},rowCount:records.length};
}
export function selectionCSV(dataset, records, keys) {
  const cell = value => {let text = value == null ? '' : String(value);if(typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text="'"+text;return /[",\r\n]/.test(text) ? '"'+text.replaceAll('"','""')+'"' : text;};
  const source = dataset.source || {};
  const columns = ['time',...keys,'unit','column_units','source_url','publisher','frequency','timezone','methodology','sign_convention'];
  return '\uFEFF'+[columns,...records.map(row=>[row.time,...keys.map(key=>row[key]),dataset.unit,JSON.stringify(Object.fromEntries(keys.map(key=>[key,dataset.columns?.find(column=>column.key===key)?.unit||dataset.unit]))),source.url,source.publisher,dataset.frequency,dataset.timezone,source.methodology,source.signConvention])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
