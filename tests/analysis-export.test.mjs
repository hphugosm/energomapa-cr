import test from 'node:test';
import assert from 'node:assert/strict';
import {toCSV,buildSummary} from '../public/js/analysis/export.mjs';
test('CSV preserves zero and missing values, quotes commas, quotes and line breaks',()=>{
 assert.equal(toCSV([{a:0,b:null,c:'a,"b"\nc'}]),'a,b,c\r\n0,,"a,""b""\nc"\r\n');
});
test('CSV neutralizes spreadsheet expressions including whitespace while retaining numeric negatives',()=>{
 const csv=toCSV([{a:'=SUM(1)',b:' \t+1',c:'@x',d:'-2',e:-2}]);
 assert.equal(csv,"a,b,c,d,e\r\n'=SUM(1),' \t+1,'@x,'-2,-2\r\n");
});
test('CSV explicit columns retain schema for empty results and safe headers',()=>{
 assert.equal(toCSV([],[{key:'x',label:'=risk'}]),"'=risk\r\n");
});
test('summary limits top entries and retains source years and coverage interpretation',()=>{
 const text=buildSummary({title:'Test',lines:['Zdroj: ČSÚ, 2021'],total:12,rows:Array.from({length:12},(_,i)=>({id:String(i),score:90,coverage:50})),notes:['Úplnost není statistická jistota.']});
 assert.match(text,/2021/);assert.match(text,/50.0 %/);assert.doesNotMatch(text,/11\. 10/);assert.match(text,/není statistická/);
});
