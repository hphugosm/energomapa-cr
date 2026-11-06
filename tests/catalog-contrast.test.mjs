import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const luminance = hex => {
  const rgb=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
};
test('A09 catalog metadata exceeds 4.5:1 on normal, hover and selected backgrounds',async()=>{
  const css=await readFile(new URL('../public/workspace.css',import.meta.url),'utf8');
  const foreground=css.match(/\.bank-dataset span,\.bank-dataset small\{[^}]*color:(#[0-9a-f]{6})/)[1];
  const selected=css.match(/\.bank-dataset\[aria-pressed=true\]\{background:(#[0-9a-f]{6})/)[1];
  const base=await readFile(new URL('../public/styles.css',import.meta.url),'utf8');
  const hover=base.match(/button:hover\{[^}]*background:(#[0-9a-f]{6})/)?.[1]||'#eef3fc';
  for(const background of ['#ffffff',selected,hover]){
    const ratio=(Math.max(luminance(background),luminance(foreground))+0.05)/(Math.min(luminance(background),luminance(foreground))+0.05);
    assert.ok(ratio>=4.5,`${foreground} on ${background}: ${ratio}`);
  }
});
