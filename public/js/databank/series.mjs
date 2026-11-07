import {selectionMetadata, datasetCSV} from './metadata.mjs';

const scales = [
  {W: 1, kW: 1e3, MW: 1e6, GW: 1e9},
  {Wh: 1, kWh: 1e3, MWh: 1e6, GWh: 1e9, TWh: 1e12, TJ: 1e12 / 3600, PJ: 1e15 / 3600, ktoe: 11.63e9},
  {kg: 1, t: 1e3, kt: 1e6, Mt: 1e9},
];
export const numeric = value => typeof value === 'number' && Number.isFinite(value);
export function compatibleUnits(unit) {
  return Object.keys(scales.find(scale => Object.hasOwn(scale, unit)) || {[unit]: 1});
}
export function convert(value, from, to) {
  if (value == null) return null;
  if (!numeric(value)) throw Error('Přepočet vyžaduje konečné číslo.');
  if (from === to) return value;
  const scale = scales.find(group => Object.hasOwn(group, from) && Object.hasOwn(group, to));
  if (!scale) throw Error(`Nelze převést ${from} na ${to}. Výkon a energie jsou různé veličiny.`);
  return value * scale[from] / scale[to];
}
export function filterSeries(dataset, {start = '', end = '', columns, unit = dataset.unit} = {}) {
  const selected = dataset.columns.filter(column => (!columns || columns.includes(column.key)) && column.key !== 'time');
  const records = dataset.records.filter(row => (!start || String(row.time) >= start) && (!end || String(row.time) <= end)).map(row => {
    const result = {time: row.time};
    for (const col of selected) result[col.key] = (col.unit || dataset.unit) === dataset.unit && numeric(row[col.key]) ? convert(row[col.key], dataset.unit, unit) : row[col.key] ?? null;
    return result;
  });
  const outputColumns = selected.map(col => ({...col, unit: (col.unit || dataset.unit) === dataset.unit ? unit : col.unit}));
  return {...dataset, unit, columns: outputColumns, records, ...selectionMetadata(dataset, records, outputColumns),
    selection: {start, end, columns: selected.map(col => col.key), originalUnit: dataset.unit, outputUnit: unit}};
}
export function summarizeSeries(dataset) {
  return dataset.columns.map(col => {
    const values = dataset.records.map(row => row[col.key]).filter(numeric);
    return {key: col.key, label: col.label, unit: col.unit || dataset.unit, available: values.length, expected: dataset.records.length,
      min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null,
      mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null};
  });
}
export function exportSeriesCSV(dataset) {
  return datasetCSV(dataset);
}
export function downloadArtifact(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
