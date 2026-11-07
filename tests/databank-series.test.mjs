import test from 'node:test';
import assert from 'node:assert/strict';
import {compatibleUnits,convert,filterSeries,exportSeriesCSV} from '../public/js/databank/series.mjs';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<Math.max(1,Math.abs(expected))*1e-12,`${actual} != ${expected}`);
const fixture=()=>({
  schemaVersion:1,id:'balance',title:'Energetická bilance',unit:'TJ',frequency:'year',timezone:'UTC',
  period:{start:'2020',end:'2022'},
  source:{publisher:'ČSÚ',url:'https://example.org/statistics',retrievedAt:'2026-11-06T10:00:00Z',methodology:'Saldo, nikoli hrubý tok. Chybějící hodnoty nejsou nula.'},
  columns:[{key:'energy',label:'Energetické saldo',unit:'TJ'},{key:'share',label:'Podíl',unit:'%'},{key:'count',label:'Počet zařízení',unit:'count'}],
  records:[{time:'2020',energy:-3.6,share:10,count:2},{time:'2021',energy:0,share:null,count:0},{time:'2022',energy:null,share:25,count:1}],
});

test('energy conversions respect joules, watt hours and SI prefixes in both directions',()=>{
  near(convert(3.6,'TJ','GWh'),1);
  near(convert(1,'TJ','GWh'),1/3.6);
  near(convert(1,'PJ','GWh'),1000/3.6);
  near(convert(1,'GWh','TJ'),3.6);
  near(convert(1,'TWh','PJ'),3.6);
  near(convert(-7.2,'TJ','MWh'),-2000);
  near(convert(1,'ktoe','GWh'),11.63);
});

test('power cannot be converted into energy without a known interval',()=>{
  assert.throws(()=>convert(5,'MW','MWh'),/Výkon a energie/);
  assert.throws(()=>convert(5,'GWh','GW'),/Výkon a energie/);
  assert.ok(!compatibleUnits('MW').includes('MWh'));
  assert.ok(compatibleUnits('TJ').includes('GWh'));
  near(convert(1000,'MW','GW'),1);
});

test('conversion preserves zero and unknown values while rejecting nonfinite numeric data',()=>{
  assert.equal(convert(0,'TJ','GWh'),0);
  assert.equal(convert(null,'TJ','GWh'),null);
  assert.equal(convert(undefined,'TJ','GWh'),null);
  assert.throws(()=>convert(NaN,'TJ','GWh'));
  assert.throws(()=>convert(Infinity,'TJ','GWh'));
  assert.throws(()=>convert('3.6','TJ','GWh'));
});

test('filtering converts only compatible source-unit columns and retains negative, zero and null data',()=>{
  const data=fixture(),result=filterSeries(data,{unit:'GWh'});
  near(result.records[0].energy,-1);
  assert.deepEqual(result.records.slice(1),[{time:'2021',energy:0,share:null,count:0},{time:'2022',energy:null,share:25,count:1}]);
  assert.equal(result.records[0].share,10);
  assert.equal(result.records[0].count,2);
  assert.deepEqual(result.columns.map(column=>column.unit),['GWh','%','count']);
  assert.equal(data.records[0].energy,-3.6);
  assert.equal(data.columns[0].unit,'TJ');
});

test('filtered JSON preserves full source provenance and the original observation period',()=>{
  const data=fixture(),filtered=filterSeries(data,{start:'2021',end:'2022',columns:['energy'],unit:'GWh'});
  const json=JSON.parse(JSON.stringify(filtered));
  assert.deepEqual(json.source,data.source);
  assert.deepEqual(json.originalPeriod,{start:'2020',end:'2022'});
  assert.deepEqual(json.period,{start:'2021',end:'2022'});
  assert.deepEqual(json.records,[{time:'2021',energy:0},{time:'2022',energy:null}]);
  assert.deepEqual(json.columns,[{key:'energy',label:'Energetické saldo',unit:'GWh'}]);
  assert.equal(json.rowCount,2);
  assert.equal(json.selection.originalUnit,'TJ');
  assert.equal(json.selection.outputUnit,'GWh');
});

test('empty and reversed date selections contain no synthetic observations',()=>{
  const result=filterSeries(fixture(),{start:'2022',end:'2020',columns:['energy']});
  assert.deepEqual(result.records,[]);
  assert.deepEqual(result.period,{start:null,end:null});
  assert.equal(result.rowCount,0);
  assert.match(exportSeriesCSV(result),/\r\ntime,energy\r\n/);
  assert.match(exportSeriesCSV(result),/^# metadata: /);
});

test('CSV retains source, retrieval, methodology and mixed column units with honest missing cells',()=>{
  const result=filterSeries(fixture(),{start:'2021',unit:'GWh'}),csv=exportSeriesCSV(result);
  assert.match(csv,/2021,0,,0/);
  assert.match(csv,/2022,,25,1/);
  assert.match(csv,/https:\/\/example\.org\/statistics/);
  assert.match(csv,/2026-11-06T10:00:00Z/);
  assert.match(csv,/Saldo, nikoli hrubý tok\. Chybějící hodnoty nejsou nula\./);
  assert.match(csv,/"unit":"GWh"/);
  assert.match(csv,/"unit":"%"/);
  assert.match(csv,/"unit":"count"/);
});

test('CSV metadata is non-executable JSON and numeric cells keep their signs',()=>{
  const data=fixture();data.id='=HYPERLINK("bad")';data.source.publisher=' \t@unsafe';
  const csv=exportSeriesCSV(data);
  const [first] = csv.split('\r\n');
  assert.equal(JSON.parse(first.slice('# metadata: '.length)).id, data.id);
  assert.match(csv,/2020,-3\.6,10,2/);
});

test('A07 MPO single year and seven columns recomputes coverage after conversion',async()=>{
  const {readFile}=await import('node:fs/promises');
  const data=JSON.parse(await readFile(new URL('../public/data/databank/mpo-czech-energy-balance.json',import.meta.url)));
  const columns=data.columns.slice(0,7).map(col=>col.key);
  const result=filterSeries(data,{start:'2024',end:'2024',columns,unit:'GWh'});
  assert.equal(result.records.length,1);assert.equal(result.columns.length,7);
  assert.deepEqual(result.period,{start:'2024',end:'2024'});
  assert.equal(result.coverage.rows,1);assert.equal(result.coverage.numericCells,7);
  assert.deepEqual(result.originalCoverage,data.coverage);assert.deepEqual(result.originalPeriod,data.period);
  assert.equal(result.originalCoverage.rows,15);
});

test('A05 CSV keeps flags for selected Eurostat cells and all provenance in empty export',()=>{
  const data=fixture();data.columns=[{key:'CZ',unit:'TJ'},{key:'DE',unit:'TJ'}];
  data.records=[{time:'2020',CZ:1,DE:null},{time:'2021',CZ:null,DE:0}];
  data.qualityFlags=[{time:'2020',geo:'CZ',flag:'p'},{time:'2020',geo:'DE',flag:'e'},{time:'2021',geo:'CZ',flag:'b'}];
  data.source.license='Example terms';data.source.attribution='Example credit';
  const result=filterSeries(data,{start:'2020',end:'2020',columns:['CZ']});
  assert.deepEqual(result.qualityFlags,[{time:'2020',geo:'CZ',flag:'p'}]);
  const metadata=JSON.parse(exportSeriesCSV(result).split('\r\n')[0].slice('# metadata: '.length));
  assert.deepEqual(metadata.qualityFlags,result.qualityFlags);
  assert.equal(metadata.source.license,'Example terms');assert.equal(metadata.source.attribution,'Example credit');
  const empty=filterSeries(data,{start:'2050'});
  const emptyMetadata=JSON.parse(exportSeriesCSV(empty).split('\r\n')[0].slice('# metadata: '.length));
  assert.equal(emptyMetadata.source.retrievedAt,data.source.retrievedAt);
  assert.equal(emptyMetadata.coverage.rows,0);assert.equal(emptyMetadata.unit,'TJ');
});

test('R03 real 2010 CZ electricity import conversion and flagged selection retain Eurostat notices',async()=>{
  const {readFile}=await import('node:fs/promises');
  const data=JSON.parse(await readFile(new URL('../public/data/databank/eurostat-electricity-imp.json',import.meta.url)));
  const converted=filterSeries(data,{start:'2010',end:'2010',columns:['CZ'],unit:'MWh'});
  assert.deepEqual(converted.records,[{time:'2010',CZ:6642000}]);
  assert.equal(converted.selection.originalUnit,'GWh');assert.match(converted.source.disclaimer,/Eurostat is not responsible/);
  const flagsData=JSON.parse(await readFile(new URL('../public/data/databank/eurostat-renewable-heat.json',import.meta.url)));
  const flagged=flagsData.qualityFlags.find(flag=>flag.geo==='EU27_2020');assert.ok(flagged);
  const selection=filterSeries(flagsData,{start:flagged.time,end:flagged.time,columns:[flagged.geo]});
  assert.deepEqual(selection.qualityFlags,[flagged]);
  for(const [value,original] of [[converted,data],[selection,flagsData],[filterSeries(data,{start:'2050'}),data]]){
    const csv=JSON.parse(exportSeriesCSV(value).split('\r\n')[0].slice('# metadata: '.length));
    const json=JSON.parse(JSON.stringify(value));
    for(const result of [csv,json]){assert.equal(result.source.disclaimer,original.source.disclaimer);assert.equal(result.source.modifications,original.source.modifications);assert.equal(result.source.attribution,original.source.attribution);assert.deepEqual(result.qualityFlags,value.qualityFlags);}
  }
});
