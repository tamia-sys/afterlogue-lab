'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {summarize}=require('../interest-calibration.js');
test('higher shown-time scores should rank interested films above passes',()=>{
 const result=summarize({
  scores:new Map([['a',38],['b',33],['c',19],['d',21]]),
  attraction:new Map([['a','interested'],['b','interested'],['c','pass'],['d','pass']])
 });
 assert.equal(result.interested,2);
 assert.equal(result.passed,2);
 assert.equal(result.pairwiseAuc,1);
 assert.equal(result.meanInterested,35.5);
 assert.equal(result.meanPassed,20);
 assert.equal(result.interpretation,'small_sample');
});
test('inverted score ordering is reported rather than disguised',()=>{
 const result=summarize({
  scores:new Map([['a',18],['b',21],['c',34],['d',37]]),
  attraction:new Map([['a','interested'],['b','interested'],['c','pass'],['d','pass']])
 });
 assert.equal(result.pairwiseAuc,0);
 assert.ok(result.meanPassed>result.meanInterested);
});
test('ties count as half; unrated films and provisional familiarity are not treated as negatives',()=>{
 const result=summarize({
  scores:new Map([['a',25],['b',25],['c',11],['d',5]]),
  attraction:new Map([['a','interested'],['b','pass'],['c','new'],['d','known']]),
  newDiscovery:new Map([['a',true]]),
  watchIntent:new Map([['a',true]]),
  familiarity:new Map([['b',true]])
 });
 assert.equal(result.pairwiseAuc,.5);
 assert.equal(result.labeled,2);
 assert.equal(result.confirmedNewInterested,1);
 assert.equal(result.interestedWouldWatch,1);
 assert.equal(result.knownOfLabeled,1);
});
test('missing score is not mistaken for zero, absent class yields no AUC',()=>{
 const result=summarize({
  scores:{a:31},attraction:{a:'interested',b:'pass',c:'okay'}
 });
 assert.equal(result.scoreUnavailable,1);
 assert.equal(result.labeled,1);
 assert.equal(result.meanPassed,null);
 assert.equal(result.pairwiseAuc,null);
 assert.equal(result.interpretation,'not_enough_comparable_reactions');
});
