'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const stress=require('./stress-personas.cjs');
test('fictional catalog is deterministic, synthetic and has no repeated keys',()=>{
 const a=stress.catalog({perLane:12,missingRate:.4,seed:14});
 const b=stress.catalog({perLane:12,missingRate:.4,seed:14});
 assert.deepEqual(a,b);
 assert.equal(a.length,8*12);
 assert.equal(new Set(a.map(x=>x.key)).size,a.length);
 assert.ok(a.every(x=>x.category==='movies'&&Array.isArray(x.facets.genres)));
 assert.ok(a.some(x=>!x.facets.themes.length));
});
test('synthetic personas have both liked and negative ratings, without duplicates',()=>{
 const catalog=stress.catalog({perLane:12});
 for(let i=0;i<25;i++){
  const p=stress.makePersona(i,catalog);
  const values=[...p.log.values()];
  assert.ok(values.some(x=>x==='Loved'||x==='Liked'));
  assert.ok(values.includes('Not for me'));
  assert.ok(p.log.size<catalog.length);
  assert.ok(p.width>=1&&p.width<=4);
 }
});
test('actual rankers: multiple fictional viewer histories are safe and reproducible',()=>{
 const config={personas:16,perLane:12,missingRate:.25,seed:14};
 const a=stress.run(config),b=stress.run(config);
 assert.deepEqual(a,b);
 assert.equal(a.syntheticOnly,true);
 assert.equal(a.summary.personas,16);
 assert.equal(a.summary.duplicateViolations,0);
 assert.equal(a.summary.previouslyRatedViolations,0);
 assert.equal(a.summary.unsupportedEligibilityViolations,0);
 assert.ok(a.summary.firstShelfCoverage>=0&&a.summary.firstShelfCoverage<=1);
 assert.ok(a.summary.meanGenresAt5>=0);
});
test('measure balanced versus unbalanced diversity using the same candidate pool',()=>{
 const report=stress.run({personas:20,perLane:12,missingRate:.25,seed:15});
 assert.equal(report.summary.personas,20);
 assert.ok(report.summary.meanGenresAt5>=report.summary.meanUnbalancedGenresAt5);
 assert.ok(report.summary.meanDistinctSourceAnchorsAt5>=0);
 assert.equal(Object.keys(report.byTasteBreadth).length,4);
});
test('missing metadata remains missing, even when eligibility is reduced',()=>{
 const data=stress.catalog({perLane:12,missingRate:.9,seed:14});
 assert.ok(data.some(x=>x.facets.tones.length===0&&x.facets.themes.length===0));
 const result=stress.run({personas:12,perLane:12,missingRate:.9,seed:14});
 assert.equal(result.config.missingRate,.9);
 assert.equal(result.summary.previouslyRatedViolations,0);
});
