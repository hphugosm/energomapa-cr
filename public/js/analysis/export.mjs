/** Spreadsheet-safe UTF-8 CSV exports. Null remains empty, never numeric zero. */
const cell = value => {
  let text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Formula injection includes leading whitespace and control characters.
  if (typeof value !== 'number' && /^[\s\u0000-\u001f]*[=+@-]/u.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
};
export function toCSV(rows, columns) {
  if (!Array.isArray(rows)) throw Error('Export vyžaduje pole řádků.');
  const fields = columns || [...new Set(rows.flatMap(row => Object.keys(row)))];
  const keys = fields.map(field => typeof field === 'string' ? {key:field,label:field} : field);
  return [keys.map(field => cell(field.label ?? field.key)).join(','), ...rows.map(row => keys.map(field => cell(row[field.key])).join(','))].join('\r\n') + '\r\n';
}
export function downloadCSV(rows, columns, filename = 'energomapa-analyza.csv') {
  const url = URL.createObjectURL(new Blob(['\ufeff',toCSV(rows,columns)],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href=url; link.download=filename; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function buildSummary({title='EnergoMapa – analýza',lines=[],rows=[],total,notes=[]}={}) {
  return [title,...lines,total === undefined ? null : `Počet výsledků: ${total}`,
    ...rows.slice(0,10).map((row,index)=>`${index+1}. ${row.name ?? row.id ?? ''}${row.score === undefined ? '' : ` – skóre ${Number(row.score).toFixed(1)}, úplnost ${Number(row.coverage).toFixed(1)} %`}`),
    ...notes].filter(line=>line !== null && line !== '').join('\n');
}
export async function copySummary(value) {
  const text = typeof value === 'string' ? value : buildSummary(value);
  if (!globalThis.navigator?.clipboard?.writeText) throw Error('Schránka není dostupná. Použijte export CSV.');
  await navigator.clipboard.writeText(text); return text;
}
