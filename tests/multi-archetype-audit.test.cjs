'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../recommendation-engine.js');
const engine=globalThis.AfterlogueRecommendationEngine;
const cinematic=require('../taste-model-v2.js');
const policy=require('../eligibility-policy.js');
const audit=require('../multi-archetype-audit.js');
const fixture=require('./multi-archetype-fixture.cjs');
const run=(profiles=fixture.profiles,opts={})=>audit.analyze({
 engine,cinematic,policy,entries:fixture.catalog,profiles,...opts
});
const profile=(report,name)=>report.profiles.find(p=>p.profile===name);
test('six independent fictional taste profiles produce full five-card eligible shelves',()=>{
 const report=run();
 assert.equal(report.scenarioCount,6);
 assert.equal(report.casesWithEmptyShelf,0);
 assert.equal(report.casesWithRepeatLeaks,0);
 assert.equal(report.profiles.every(p=>p.shelfSize===5&&p.qualifiedPool>=5),true);
 assert.equal(report.profiles.every(p=>p.positiveScoreCount===5),true);
 assert.equal(report.profiles.every(p=>p.sourceOverlapViolations===0),true);
 assert.equal(report.profiles.every(p=>p.duplicateShelfViolations===0),true);
});
test('eclectic taste stays eclectic across independent genres even though each lane has fewer ratings',()=>{
 const r=profile(run(),'Fictional Eclectic');
 assert.equal(r.historyPositive,6);
 assert.equal(r.supportedTasteLanes,6);
 assert.ok(r.eligibleSupportedLanes>=5);
 assert.ok(r.uniqueShelfLanes>=3);
 assert.ok(r.topShelfDominance<=.6);
 assert.ok(r.representedSupportedLanes>=3);
});
test('focused reflective taste is NOT forced to include animation just for variety',()=>{
 const r=profile(run(),'Fictional Quiet Focus');
 assert.equal(r.historyNegative,3);
 assert.ok(r.shelfGenreCounts.drama>=2);
 assert.ok(r.shelfGenreCounts.documentary>=1);
 assert.equal(r.shelfGenreCounts.animation||0,0);
 assert.ok(r.representedRate>=.5);
});
test('old live-action preferences are not erased by ten recent same-collection liked cartoons',()=>{
 const result=run();
 const before=profile(result,'Fictional Exposure Baseline');
 const after=profile(result,'Fictional Exposure Loop');
 assert.equal(before.historyPositive,7);
 assert.equal(after.historyPositive,17);
 assert.ok(after.shelfGenreCounts.drama>=1);
 assert.ok(after.shelfGenreCounts.suspense>=1);
 assert.ok((after.shelfGenreCounts.animation||0)<=2);
 assert.ok(after.uniqueShelfLanes>=3);
 assert.ok(after.qualifiedPool>0);
});
test('real repeated animation likes can legitimately yield an all-animation shelf',()=>{
 const r=profile(run(),'Fictional Genuine Animation Fan');
 assert.ok(r.historyPositive>=10);
 assert.equal(r.shelfGenreCounts.animation,5);
 assert.equal(r.uniqueShelfLanes,1);
 assert.equal(r.topShelfDominance,1);
 assert.ok(r.qualifiedPool>=5);
});
test('short Logs remain explicitly unvalidated rather than claiming strong taste intelligence',()=>{
 const report=run(),r=profile(report,'Fictional Sparse Starter');
 assert.equal(r.historyPositive,1);
 assert.equal(r.profileEvidenceStatus,'insufficient-positive-history');
 assert.equal(report.casesWithSparsePersonalHistory,1);
 assert.ok(r.shelfSize>0); // candidates may exist; confidence is still unknown.
});
test('removing community metadata has exactly zero effect on recommendations',()=>{
 const baseline=run();
 const fakeTagged=fixture.catalog.map((x,i)=>({...x,
   communityTags:i%2===0?['observational-filmmaking','measured-pacing']:[],
   communityContributors:100+i,
   facets:{...x.facets,communityObservationMetadata:{'user-count':1000}}}));
 const alternate=audit.analyze({engine,cinematic,policy,profiles:fixture.profiles,entries:fakeTagged});
 assert.deepEqual(alternate,baseline);
});
test('history and already-shown candidates never leak into either shelf',()=>{
 const one={...fixture.profiles[0],name:'Fictional Anti-repeat',
  shown:[fixture.key('quiet',2),fixture.key('comedy',2),fixture.key('animation',12)],
  decided:[fixture.key('documentary',2)],seen:[fixture.key('suspense',2)],
  watchlist:[fixture.key('romance',2)]};
 const r=run([one]);
 assert.equal(r.profiles[0].duplicateShelfViolations,0);
 assert.equal(r.profiles[0].sourceOverlapViolations,0);
 assert.equal(r.profiles[0].shelfSize,5);
});
test('bad profile and duplicated input never masquerade as valid model results',()=>{
 assert.throws(()=>run([{name:'Invalid',category:'movies',
  impressions:{'unknown-film':'Loved'}}]),/Unknown film/);
 assert.throws(()=>run([fixture.profiles[0],fixture.profiles[0]]),/distinct/);
 assert.throws(()=>audit.analyze({engine,policy,entries:fixture.catalog,
  profiles:fixture.profiles}),/Invalid bounded/);
});
test('only synthetic aggregate lane counts are returned; no film keys, preferences, or individual scores',()=>{
 const result=run();
 const flat=JSON.stringify(result);
 for(const word of [fixture.key('quiet',1),fixture.key('animation',14),
  'Loved','Not for me','tmdb-movie','private_note','keywordNames'])
   assert.equal(flat.includes(word),false);
 assert.equal(result.profiles.every(p=>Array.isArray(p.recommendations)===false),true);
});
