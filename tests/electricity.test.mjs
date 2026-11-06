import test from 'node:test';
import assert from 'node:assert/strict';
import {flowTotals,filterRecords,exportSelection,selectionCSV} from '../public/js/electricity.mjs';
test('ČEPS positive import and negative export preserve independent directions and net export',()=>{
  assert.deepEqual(flowTotals({DE:100,PL:-40,SK:0,AT:-10}),{imports:100,exports:50,net:-50,available:4,expected:4});
  assert.equal(flowTotals({DE:100,PL:-40,SK:0,AT:-10},['PL','SK']).exports,40);
});
test('missing border is never zero or a misleading complete-country total',()=>{
  assert.deepEqual(flowTotals({DE:100,PL:-40,SK:null,AT:-10}),{imports:null,exports:null,net:null,available:3,expected:4});
  assert.equal(flowTotals({DE:NaN},['DE']).imports,null);
  assert.equal(flowTotals({},[]).net,null);
  assert.equal(flowTotals({DE:0},['DE']).net,0);
});
test('date filtering preserves actual timestamps, gaps and full-resolution values',()=>{
  const records=[{time:'2025-01-01T23:00:00Z',DE:12.34567},{time:'2025-01-03T00:00:00Z',DE:null}];
  assert.deepEqual(filterRecords(records,'2025-01-02','2025-01-03'),[records[1]]);
  assert.deepEqual(filterRecords(records,'2025-01-03','2025-01-01'),[]);
});
test('selection exports units, provenance, filtered columns and original missing values',()=>{
  const dataset={id:'flows-physical',unit:'MW',frequency:'hour',timezone:'UTC',source:{publisher:'ČEPS',url:'https://example.org/',methodology:'Raw, net values',signConvention:'Positive = import'},columns:[{key:'DE',label:'Germany',unit:'MW'},{key:'AT',label:'Austria',unit:'MW'}]};
  const records=[{time:'2025-01-01T00:00:00Z',DE:-20.123456,AT:null}];
  const json=exportSelection(dataset,records,['AT']);
  assert.equal(json.source.url,dataset.source.url);assert.deepEqual(json.records,[{time:records[0].time,AT:null}]);assert.equal(json.columns.length,1);
  const csv=selectionCSV(dataset,records,['DE','AT']);assert.match(csv,/-20\.123456,,MW/);assert.match(csv,/column_units/);assert.match(csv,/https:\/\/example\.org\//);assert.match(csv,/"Raw, net values"/);assert.match(csv,/Positive = import/);
});
