import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnergyMap} from '../public/js/map.mjs';

// Minimal SVG surface: exercise the public camera API without a browser dependency.
class SvgNode {
  children = []; attrs = {}; style = {}; classList = {toggle() {}};
  setAttribute(key, value) { this.attrs[key] = String(value); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  querySelector(tag) { return this.children.find(node => node.tag === tag); }
  events = {};
  addEventListener(type, callback) {this.events[type] = callback;} removeEventListener() {} remove() {}
  getBoundingClientRect() { return {width: 1000, height: 600}; }
}
const box = (code, x, y, width, height) => ({type:'Feature', properties:{code}, geometry:{type:'Polygon', coordinates:[[[x,y],[x+width,y],[x+width,y+height],[x,y+height],[x,y]]]}});
const collection = features => ({type:'FeatureCollection', features});

test('municipality selection centers and zooms, retains regional outline and restores parent views', t => {
  const saved = new Map(['document', 'window', 'cancelAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  globalThis.document = {createElementNS(_ns, tag) { const node = new SvgNode(); node.tag = tag; return node; }};
  globalThis.window = new SvgNode();
  globalThis.cancelAnimationFrame = () => {};
  t.after(() => {map.destroy(); for (const [key, descriptor] of saved) {if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];}});
  const svg = new SvgNode(), map = createEnergyMap(svg);
  map.setOverview(collection([box('CZ', 12, 48, 7, 3), box('region', 13, 49, 3, 1.5)]));
  const cameraGroup = svg.children[1];
  const camera = () => {
    const [, x, y, z] = cameraGroup.attrs.transform.match(/translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/);
    return {x:Number(x), y:Number(y), z:Number(z)};
  };
  const countryCamera = camera();
  map.setMunicipalities('region', collection([box('municipality', 13.1, 49.1, .05, .05)]));
  map.setContext({regionId:'region', selectedId:'region'}, {animate:false});
  const regionalCamera = camera();
  const regionalOutline = cameraGroup.children[2].children[0].attrs.d;
  map.setContext({regionId:'region', selectedId:'municipality'}, {animate:false});
  const municipalCamera = camera();
  map.update({values:new Map([['municipality',0.000184]]),unitLabel:'MW / domácnost',colorFor:()=> '#ffffff'});
  assert.match(cameraGroup.children[1].children[0].attrs['aria-label'], /0,000184 MW \/ domácnost/);

  assert.ok(municipalCamera.z > regionalCamera.z);
  assert.ok(municipalCamera.z <= 40, 'tiny municipalities must respect the zoom cap');
  assert.equal(cameraGroup.children[2].children[0].attrs.d, regionalOutline);
  const coordinates = [...cameraGroup.children[2].children[1].attrs.d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(match => [Number(match[1]),Number(match[2])]);
  const cx = (Math.min(...coordinates.map(p => p[0])) + Math.max(...coordinates.map(p => p[0]))) / 2;
  const cy = (Math.min(...coordinates.map(p => p[1])) + Math.max(...coordinates.map(p => p[1]))) / 2;
  assert.ok(Math.abs(cx * municipalCamera.z + municipalCamera.x - 500) < .03);
  assert.ok(Math.abs(cy * municipalCamera.z + municipalCamera.y - 300) < .03);
  map.setContext({regionId:'region', selectedId:'region'}, {animate:false});
  assert.deepEqual(camera(), regionalCamera);
  map.setContext({regionId:null, selectedId:'CZ'}, {animate:false});
  assert.deepEqual(camera(), countryCamera);
});


test('analysis overlays and point layers remain separate from lazy municipality geometry', t => {
  const keys = ['document','window','cancelAnimationFrame','requestAnimationFrame'];
  const saved = new Map(keys.map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  globalThis.document = {createElementNS(_ns,tag) {const node = new SvgNode(); node.tag = tag; return node;}};
  globalThis.window = new SvgNode(); globalThis.cancelAnimationFrame = () => {}; globalThis.requestAnimationFrame = () => 1;
  const selected = [], points = [], origins = [];
  const svg = new SvgNode(), map = createEnergyMap(svg,{onSelect:id=>selected.push(id),onPointSelect:point=>points.push(point),onMapPoint:(lat,lon)=>origins.push([lat,lon])});
  t.after(() => {map.destroy(); for (const [key,descriptor] of saved) {if (descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key];}});
  map.setOverview(collection([box('CZ',12,48,7,3),box('region',13,49,3,1.5)]));
  const cameraGroup = svg.children[1], pointGroup = svg.children[2];
  map.setAnalysis({matches:new Set(['town']),topIds:new Set(['town']),regionCounts:new Map([['region',1]]),locations:[{id:'town',name:'Town',lat:49.5,lon:14,rank:1,score:73}]});
  assert.equal(pointGroup.children.length,1);
  assert.match(pointGroup.children[0].attrs['aria-label'],/Town.*73/);
  const screen = pointGroup.children[0].attrs.transform.match(/translate\(([-\d.e]+) ([-\d.e]+)\)/).slice(1).map(Number);
  pointGroup.children[0].events.click({stopPropagation(){}});
  assert.deepEqual(selected,['town']);
  assert.equal(cameraGroup.children[0].children[0].attrs.opacity,'1');
  map.setAnalysis({matches:new Set(),regionCounts:new Map()});
  assert.equal(cameraGroup.children[0].children[0].attrs.opacity,'.18');
  assert.equal(pointGroup.children.length,0);
  map.setAnalysis(null);
  assert.equal(cameraGroup.children[0].children[0].attrs.opacity,'1');
  map.setPointLayers([{id:'charging',name:'Stanice',features:[{id:'station',geometry:{type:'Point',coordinates:[14,49.5]},properties:{name:'Stanice A'}}]}]);
  assert.equal(pointGroup.children.length,1);
  svg.createSVGPoint = () => ({x:0,y:0,matrixTransform(){return this;}});
  svg.getScreenCTM = () => ({inverse(){return this;}});
  svg.events.pointerdown({button:0,pointerId:1,clientX:0,clientY:0});
  svg.events.pointermove({pointerId:1,clientX:10,clientY:0});
  svg.events.pointermove({pointerId:1,clientX:0,clientY:0});
  window.events.pointerup();
  pointGroup.children[0].events.keydown({key:'Enter',preventDefault(){},stopPropagation(){}});
  assert.equal(points[0].feature.id,'station');
  map.setPointLayers([]); assert.equal(pointGroup.children.length,0);
  map.setIsochrones(collection([box('iso',13,49,1,.5)]));
  assert.equal(cameraGroup.children[3].children.length,1);
  assert.match(cameraGroup.children[3].children[0].attrs.d,/M/);
  map.setIsochrones(null); assert.equal(cameraGroup.children[3].children.length,0);
  map.setPickPoint(true); assert.equal(svg.style.cursor,'crosshair');
  const territoryTarget = {closest(){return {getAttribute(){return 'region';}};}};
  cameraGroup.events.click({target:territoryTarget});
  cameraGroup.events.keydown({target:territoryTarget,key:'Enter',preventDefault(){}});
  assert.deepEqual(selected,['town'],'origin picking must not also navigate a territory');
  svg.createSVGPoint = () => ({x:0,y:0,matrixTransform(){return this;}});
  svg.getScreenCTM = () => ({inverse(){return this;}});
  svg.events.click({clientX:screen[0],clientY:screen[1],target:{closest(){return null;}}});
  assert.ok(Math.abs(origins[0][0]-49.5)<1e-8);
  assert.ok(Math.abs(origins[0][1]-14)<1e-8);
  map.setPickPoint(false); assert.equal(svg.style.cursor,'');
  const originalCamera = cameraGroup.attrs.transform;
  const area = collection([box('outer',13,49,1,.5),box('inner',13.2,49.1,.2,.1)]);
  map.fitGeoJSON(area,{animate:false});
  const fitted = cameraGroup.attrs.transform;
  assert.notEqual(fitted,originalCamera);
  map.setIsochrones(area);
  const [,tx,ty,z] = fitted.match(/translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/).map(Number);
  const coords = [...cameraGroup.children[3].children[0].attrs.d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(match=>[Number(match[1]),Number(match[2])]);
  for (const [x,y] of coords) {assert.ok(x*z+tx>=0 && x*z+tx<=1000); assert.ok(y*z+ty>=0 && y*z+ty<=600);}
  const cx = (Math.min(...coords.map(p=>p[0]))+Math.max(...coords.map(p=>p[0])))/2;
  const cy = (Math.min(...coords.map(p=>p[1]))+Math.max(...coords.map(p=>p[1])))/2;
  assert.ok(Math.abs(cx*z+tx-500)<.03); assert.ok(Math.abs(cy*z+ty-300)<.03);
  map.fitGeoJSON(collection([]),{animate:false}); assert.equal(cameraGroup.attrs.transform,fitted,'empty geometry leaves camera intact');
});

test('overlapping TOP locations cluster, zoom on activation and remain individually selectable at maximum zoom', t => {
  const keys=['document','window','cancelAnimationFrame','requestAnimationFrame','matchMedia'];
  const saved=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  globalThis.document={createElementNS(_ns,tag){const node=new SvgNode();node.tag=tag;return node;}};
  globalThis.window=new SvgNode();globalThis.cancelAnimationFrame=()=>{};globalThis.requestAnimationFrame=()=>1;
  globalThis.matchMedia=()=>({matches:true});
  const selected=[],svg=new SvgNode(),map=createEnergyMap(svg,{onSelect:id=>selected.push(id)});
  t.after(()=>{map.destroy();for(const [key,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  map.setOverview(collection([box('CZ',12,48,7,3),box('region',13,49,3,1.5)]));
  const camera=svg.children[1],points=svg.children[2];
  const analysis={locations:[{id:'A',name:'A',lat:49.5,lon:14,rank:1},{id:'B',name:'B',lat:49.50001,lon:14.00001,rank:2}]};
  map.setAnalysis(analysis);
  assert.equal(points.children.length,1);assert.equal(points.children[0].attrs['aria-label'],'TOP 2 lokalit – přiblížit');
  const before=camera.attrs.transform;
  points.children[0].events.keydown({key:'Enter',preventDefault(){},stopPropagation(){}});
  assert.notEqual(camera.attrs.transform,before);assert.deepEqual(selected,[],'cluster activation zooms without choosing the wrong municipality');
  map.setAnalysis(analysis);
  const buttons=points.children.filter(node=>node.attrs.role==='button');
  assert.equal(buttons.length,2,'coincident TOP markers spread at the zoom cap');
  assert.notEqual(buttons[0].attrs.transform,buttons[1].attrs.transform);
  buttons[0].events.click({stopPropagation(){}});buttons[1].events.click({stopPropagation(){}});
  assert.deepEqual(selected,['A','B']);
});
