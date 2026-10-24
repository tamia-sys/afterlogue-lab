'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../recommendation-engine.js');
const engine=globalThis.AfterlogueRecommendationEngine;
const qa=require('../solo-taste-validation.js');

function film(key,{themes=[],tones=[],genres=[],directors=[],pace=null,collectionId=null}={}){
 return {key,title:key,category:'movies',collectionId,facets:{
  themes,tones,genres,directors,pace},directMatches:[],score:20,poster:'test',position:0};
}
const quiet={themes:['solitude','ordinary-life'],tones:['reflective','tender'],
 genres:['drama'],pace:'slow'};
const quiet2={themes:['solitude','connection'],tones:['reflective','intimate'],
 genres:['drama'],pace:'slow'};
const quiet3={themes:['ordinary-life','connection'],tones:['reflective','tender'],
 genres:['drama'],pace:'slow'};
const kinetic={themes:['spectacle','competition'],tones:['frantic','noisy'],
 genres:['action','animation'],pace:'fast'};
const kinetic2={themes:['spectacle','adventure'],tones:['frantic','loud'],
 genres:['action','animation'],pace:'fast'};
const sources=[
 film('quiet-a',quiet),film('quiet-b',quiet2),film('quiet-c',quiet3),
 film('kinetic-a',kinetic),film('kinetic-b',kinetic2),
 film('quiet-unseen',{...quiet2,themes:['solitude','ordinary-life','connection']}),
 film('kinetic-unseen',kinetic),
 ...Array.from({length:12},(_,i)=>film('suggested-animation-'+i,{
  themes:['magic','quest'],tones:['playful','wondrous'],genres:['animation','fantasy'],
  pace:'fast',collectionId:444
 }))
];
const ratings={ 'quiet-a':'Loved','quiet-b':'Loved','quiet-c':'Liked',
 'kinetic-a':'Not for me','kinetic-b':'Not for me'};

test('learner can compare hidden positive and negative ratings using only the remaining personal Log',()=>{
 const out=qa.evaluate({engine,entries:sources,impressions:ratings});
 assert.equal(out.historyRated,5);
 assert.equal(out.missingCatalogRecords,0);
 assert.equal(out.testedPositive,3);
 assert.equal(out.testedNegative,2);
 assert.equal(out.scorableHoldouts,5);
 assert.equal(out.abstainedHoldouts,0);
 assert.equal(out.comparableHeldoutPairs,6);
 assert.equal(out.positiveHigherThanNegative,6);
 assert.equal(out.negativeHigherThanPositive,0);
 assert.equal(out.scoreOrderingRatio,1);
 assert.equal('accuracy' in out,false);
});
test('negative ratings remain contrasts and do not require community tags',()=>{
 const without=qa.evaluate({engine,entries:sources,impressions:{
  'quiet-a':'Loved','quiet-b':'Loved','quiet-c':'Liked'
 }});
 assert.equal(without.testedNegative,0);
 assert.equal(without.comparableHeldoutPairs,0);
 assert.equal(without.scoreOrderingRatio,null);
 // This module accepts rated Log histories, not any social or community signals.
 assert.equal(Object.keys(qa).includes('community'),false);
});
test('not enough individually rated positives means honest abstention',()=>{
 const result=qa.evaluate({engine,entries:sources,impressions:{
  'quiet-a':'Loved','kinetic-a':'Not for me'
 }});
 assert.equal(result.scorableHoldouts,0);
 assert.equal(result.abstentionsByReason['insufficient-history'],2);
 assert.equal(result.comparableHeldoutPairs,0);
});
test('unavailable catalog metadata abstains; it must not fabricate a taste signal',()=>{
 const bare=film('unknown',{});
 const out=qa.evaluate({engine,entries:[...sources,bare],impressions:{
  ...ratings,unknown:'Liked','unavailable-film':'Loved'
 }});
 assert.equal(out.missingCatalogRecords,1);
 assert.equal(out.abstentionsByReason['no-supported-facet'],1);
});
test('many suggested same-franchise ratings do not erase the older, separate quiet-cinema taste',()=>{
 const appended=Object.fromEntries(Array.from({length:10},(_,i)=>
  ['suggested-animation-'+i,'Loved']));
 const out=qa.stability({engine,entries:sources,baseline:ratings,
  additional:appended,probes:['quiet-unseen','kinetic-unseen','suggested-animation-11']});
 assert.equal(out.originalRated,5);
 assert.equal(out.afterRated,15);
 assert.equal(out.probesWithPreviousEvidence>=1,true);
 assert.equal(out.previouslySupportedProbesStillSupported,out.probesWithPreviousEvidence);
 assert.equal(out.previouslySupportedProbesWithDecreasingScore,0);
 assert.equal(out.maxExistingProbeScoreDecrease,0);
});
test('ratings override watchlist curiosity in learned long-term taste dimensions',()=>{
 const empty=engine.buildTasteProfile({entries:sources,impressions:ratings,watchlist:[]});
 const watched=engine.buildTasteProfile({entries:sources,impressions:ratings,
  watchlist:['suggested-animation-10','suggested-animation-11']});
 const probe=sources.find(x=>x.key==='quiet-unseen');
 assert.equal(engine.tasteMatch(empty,probe.facets).score,
  engine.tasteMatch(watched,probe.facets).score);
 assert.ok(watched.interestSignals>empty.interestSignals);
});
test('revealing a held-out title through Favorites or Watchlist cannot leak into its profile',()=>{
 const baseline=qa.evaluate({engine,entries:sources,impressions:ratings});
 const withDuplicates=qa.evaluate({engine,entries:sources,impressions:ratings,
  favorites:['quiet-a','quiet-b','quiet-c','kinetic-a','kinetic-b'],
  watchlist:['quiet-a','kinetic-a']});
 assert.equal(withDuplicates.comparableHeldoutPairs,baseline.comparableHeldoutPairs);
 assert.equal(withDuplicates.positiveHigherThanNegative,baseline.positiveHigherThanNegative);
});
test('individual results are aggregate-only: never return raw keys, ratings or individual scores',()=>{
 const result=qa.evaluate({engine,entries:sources,impressions:ratings});
 const stable=qa.stability({engine,entries:sources,baseline:ratings,
  additional:{'suggested-animation-1':'Loved'},probes:['quiet-unseen']});
 const s=JSON.stringify(result)+JSON.stringify(stable);
 for(const key of ['quiet-a','quiet-b','kinetic-a','quiet-unseen','suggested-animation-1'])
  assert.equal(s.includes(key),false);
 assert.equal(s.includes('Love'),false);
});
