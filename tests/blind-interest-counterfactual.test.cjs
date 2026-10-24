'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../recommendation-engine.js');
const engine=globalThis.AfterlogueRecommendationEngine;
const cinematic=require('../taste-model-v2.js');
const policy=require('../eligibility-policy.js');
const rotation=require('../shelf-rotation-shadow.js');
const interests=require('../blind-interest-counterfactual.js');
const fixture=require('./multi-archetype-fixture.cjs');
const votesFixture=require('./fictional-interest-votes.cjs');
function frozen(name,minScoreRatio=.8){
 const profile=fixture.profiles.find(x=>x.name===name);
 if(!profile)throw Error('Unknown synthetic viewer');
 const scores=engine.rank({entries:fixture.catalog,category:profile.category,
  impressions:profile.impressions,timestamps:profile.timestamps||{}});
 const eligible=policy.eligible(
  cinematic.rank(scores,fixture.catalog,profile.impressions),
  {ratedKeys:Object.keys(profile.impressions)});
 // Note that NO interest votes appear in this call.
 return rotation.plan({engine,eligible,profileEntries:fixture.catalog,
  impressions:profile.impressions,category:profile.category,
  minScoreRatio});
}
const compare=(plan,name,votes=votesFixture.makeVoteFixture(name))=>
 interests.compare({plan,votes,size:5,minObserved:8});
test('the exact same eclectic Log can lead to very different held-out reactions',()=>{
 const plan=frozen('Fictional Eclectic');
 const open=compare(plan,'Fictional Eclectic');
 const selective=compare(plan,'Fictional Eclectic Selective');
 assert.equal(open.baseline.shown,15);
 assert.equal(open.rotated.shown,15);
 assert.equal(open.verdict,'insufficient-heldout-evidence');
 assert.ok(open.swapNetPossibleRange.minimum>0);
 assert.equal(open.releaseReadiness,'NOT_VALIDATED_FOR_PRODUCTION');
 assert.equal(selective.verdict,'simulated-harm');
 assert.ok(selective.swapNetDifference<0);
 assert.equal(plan.aggregate.shadowCoverage.recognizedTasteLanes,5);
 // A larger variety count must never appear as proof of satisfaction.
 assert.equal('accuracy' in selective,false);
});
test('recent animation exposure: taste-lane coverage improves while synthetic interest gets worse',()=>{
 const plan=frozen('Fictional Exposure Loop');
 const observed=compare(plan,'Fictional Exposure Loop');
 assert.equal(plan.aggregate.baselineCoverage.recognizedTasteLanes,3);
 assert.equal(plan.aggregate.shadowCoverage.recognizedTasteLanes,4);
 assert.equal(observed.verdict,'simulated-harm');
 assert.equal(observed.rotated.interested<observed.baseline.interested,true);
 assert.equal(observed.swapNetDifference,-2);
});
test('known unchanged shelves are true controls, not artificial success stories',()=>{
 for(const name of ['Fictional Quiet Focus','Fictional Genuine Animation Fan','Fictional Sparse Starter']){
  const plan=frozen(name),out=compare(plan,name);
  assert.equal(out.verdict,'identical');
  assert.equal(out.addedTitles,0);
  assert.deepEqual(out.baseline,out.rotated);
  assert.equal(out.swapNetDifference,0);
 }
});
test('one self-reported unsure opinion is not silently promoted into a negative decision',()=>{
 const plan=frozen('Fictional Eclectic'),out=compare(plan,'Fictional Eclectic');
 assert.ok(out.baseline.unsure>=1);
 assert.equal(out.baseline.notDrawn+out.baseline.interested+out.baseline.unsure+
  out.baseline.unobserved,out.baseline.shown);
 assert.equal(out.swapNetDifference,null);
 assert.equal(out.verdict,'insufficient-heldout-evidence');
});
test('absence of target reactions never produces false evidence of improvement',()=>{
 const plan=frozen('Fictional Eclectic');
 const out=compare(plan,'Fictional Eclectic',{});
 assert.equal(out.verdict,'insufficient-heldout-evidence');
 assert.equal(out.baseline.unobserved,15);
 assert.equal(out.rotated.unobserved,15);
 assert.equal(out.swapNetDifference,null);
 assert.equal(out.baseline.minPossibleNet,-15);
 assert.equal(out.baseline.maxPossibleNet,15);
 assert.equal(out.swapNetPossibleRange.minimum,-30);
 assert.equal(out.swapNetPossibleRange.maximum,30);
 assert.equal(out.rotated.interested,0);
});
test('small complete interest samples can be judged only as simulated comparisons, never accuracy',()=>{
 const plan=frozen('Fictional Exposure Baseline'),out=compare(plan,'Fictional Exposure Baseline');
 assert.equal(out.verdict,'simulated-tie');
 assert.equal(out.addedTitles,2);
 assert.equal(out.rotated.decisiveVotes,15);
 assert.equal(out.baseline.decisiveVotes,15);
 assert.equal(out.swapNetDifference,0);
 assert.equal('precision' in out,false);
});
test('bad experimental inputs and unblinded mismatched controls are rejected',()=>{
 const plan=frozen('Fictional Eclectic');
 assert.throws(()=>interests.compare({plan:{
  baseline:plan.baseline,shadow:[...plan.shadow].reverse()
 }}),/First shelf/);
 assert.throws(()=>interests.compare({plan:{
  baseline:plan.baseline,shadow:[...plan.shadow,plan.shadow[0]]
 }}),/Noncomparable/);
 assert.throws(()=>interests.compare({plan,votes:[
  {key:'fictional-quiet-2',interest:'Interested'},
  {key:'fictional-quiet-2',interest:'Not drawn to it'}
 ]}),/Duplicate/);
 assert.throws(()=>interests.compare({plan,votes:{
  'fictional-quiet-2':'Loved'
 }}),/invalid/);
 assert.throws(()=>interests.compare({plan,size:0}),/Invalid frozen/);
});
test('aggregate-only counterfactual does not return keys, personalized narratives or vote histories',()=>{
 const plan=frozen('Fictional Eclectic');
 const result=compare(plan,'Fictional Eclectic Selective');
 const raw=JSON.stringify(result);
 for(const forbidden of ['fictional-quiet-2','fictional-romance-2',
  'Fictional Eclectic','Love','user_id','personally_enjoyed','community']){
   assert.equal(raw.includes(forbidden),false);
 }
 assert.equal(Array.isArray(result.candidates),false);
 assert.equal(Array.isArray(result.predictions),false);
});
test('non-response prevents claiming benefit even if every received opinion is positive',()=>{
 const plan=frozen('Fictional Eclectic');
 const known={};
 for(const item of plan.shadow.slice(0,5))known[item.key]='Interested';
 const report=compare(plan,'Fictional Eclectic',known);
 assert.equal(report.verdict,'insufficient-heldout-evidence');
 assert.equal(report.baseline.decisiveVotes,5);
 assert.equal(report.rotated.decisiveVotes,5);
});
test('our 80%, 85%, 90% score gates are diagnostics, not automatically chosen based on simulated votes',()=>{
 const profile='Fictional Eclectic';
 const runs=[.8,.85,.9].map(threshold=>{
  const plan=frozen(profile,threshold);
  const report=compare(plan,'Fictional Eclectic Selective');
  return {threshold,coverage:plan.aggregate.shadowCoverage.recognizedTasteLanes,
   verdict:report.verdict,promotions:plan.aggregate.promotions};
 });
 assert.deepEqual(runs.map(x=>x.threshold),[.8,.85,.9]);
 assert.ok(runs[2].coverage<=runs[0].coverage);
 assert.equal(runs.some(x=>x.verdict==='simulated-harm'),true);
 // This is a safety assessment, not a function that picks the winner.
 assert.equal('selectedThreshold' in runs[0],false);
});
