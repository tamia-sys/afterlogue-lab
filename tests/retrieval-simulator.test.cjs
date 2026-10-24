'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const provider=require('./retrieval-simulator.cjs');
const stress=require('./stress-personas.cjs');
test('multi-anchor retrieval covers more distinct taste seeds than first two films',()=>{
 const items=stress.catalog({perLane:12,missingRate:0,seed:22});
 const log=new Map([
  [items[0].key,'Loved'],[items[1].key,'Loved'],
  [items[12].key,'Loved'],[items[24].key,'Liked'],[items[36].key,'Loved']
 ]);
 const narrow=provider.selectAnchors(log,items,{strategy:'two-seed'});
 const balanced=provider.selectAnchors(log,items,{strategy:'balanced',maxAnchors:5});
 assert.equal(narrow.length,2);
 assert.equal(balanced.length,5);
 assert.ok(new Set(balanced.map(x=>x.syntheticLane)).size>new Set(narrow.map(x=>x.syntheticLane)).size);
});
test('synthetic candidate retrieval is repeatable and excludes rated titles',()=>{
 const items=stress.catalog({perLane:12,seed:8}),persona=stress.makePersona(7,items);
 const options={strategy:'balanced',perAnchor:15,maxAnchors:8,limit:55};
 const a=provider.retrieve(items,persona.log,options);
 const b=provider.retrieve(items,persona.log,options);
 assert.deepEqual(a,b);
 assert.ok(a.items.length<=55);
 assert.equal(new Set(a.items.map(x=>x.key)).size,a.items.length);
 assert.ok(a.items.every(x=>!persona.log.has(x.key)));
});
test('query-limit simulator does not treat unrelated films as positive candidates',()=>{
 const a={facets:{genres:['comedy'],themes:['friendship'],tones:['warm']}};
 const b={facets:{genres:['horror'],themes:['revenge'],tones:['bleak']}};
 assert.equal(provider.affinity(a,b),0);
});
