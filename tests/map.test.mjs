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
  addEventListener() {} removeEventListener() {} remove() {}
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
