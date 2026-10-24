'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const audit=require('../keyword-signal-audit.js');
const film=(id,...labels)=>({key:'film-'+id,facets:{keywordNames:labels}});
test('a shared generic or sample-ubiquitous label is not interpreted as specific evidence',()=>{
 const result=audit.inspect({
  positive:[film('loved','love','hospital','solitude')],
  candidates:[
   film(1,'love'),film(2,'hospital'),film(3,'hospital'),
   film(4,'hospital'),film(5,'solitude'),film(6,'train station')],
  negative:[film('disliked','train station')]
 });
 assert.equal(result.candidates,6);
 assert.equal(result.candidatesWithRawPositiveOverlap,5);
 assert.equal(result.candidatesWithSpecificOverlap,1);
 assert.equal(result.candidatesOnlyGenericOrCommon,4);
 assert.equal(result.negativeControlAvailable,true);
 assert.equal(result.candidatesWithSpecificNegativeOverlap,0);
});
test('stronger multi-label overlaps are still community hints, not independent film evidence',()=>{
 const result=audit.inspect({
  positive:[film('a','unreliable narrator','remote island')],
  candidates:[film('b','unreliable narrator','remote island'),film('c','unreliable narrator'),film('d','boring')]});
 assert.equal(result.candidatesWithSpecificOverlap,2);
 assert.equal(result.candidatesWithTwoOrMoreSpecificLabels,1);
 assert.equal(result.meanSpecificLabelsAmongMatches,1.5);
});
test('negative-anchor collisions are separately flagged, never automatically excluded',()=>{
 const result=audit.inspect({
  positive:[film('a','train station','family')],
  negative:[film('x','train station')],
  candidates:[film('b','train station'),film('c','family'),film('d','train station','family')]});
 assert.equal(result.candidatesWithSpecificOverlap,2);
 assert.equal(result.candidatesWithSpecificNegativeOverlap,2);
 assert.equal(result.candidatesWithRawPositiveOverlap,3);
});
test('absent keyword lists are unknown, not evidence against movies or people',()=>{
 const result=audit.inspect({positive:[{facets:{}}],candidates:[film('a'),film('b','drama')]});
 assert.equal(result.candidatesWithProviderKeywords,1);
 assert.equal(result.candidatesWithRawPositiveOverlap,0);
 assert.equal(result.negativeControlAvailable,false);
 assert.equal(result.meanSpecificLabelsAmongMatches,0);
});
test('reports publish no community keywords or film titles',()=>{
 const r=audit.inspect({positive:[film('PRIVATE_SOURCE','secret lighthouse')],candidates:[film('PRIVATE_TARGET','secret lighthouse')]});
 const s=JSON.stringify(r);
 assert.equal(r.candidatesWithSpecificOverlap,1);
 assert.equal(s.includes('PRIVATE_SOURCE'),false);
 assert.equal(s.includes('PRIVATE_TARGET'),false);
 assert.equal(s.includes('secret lighthouse'),false);
});
test('generic tag check is conservative and transparent',()=>{
 assert.equal(audit.isGeneric('love'),true);
 assert.equal(audit.isGeneric('drama'),true);
 assert.equal(audit.isGeneric('aftercreditsstinger'),true);
 assert.equal(audit.isGeneric('train station'),false);
 assert.equal(audit.isGeneric('unreliable narrator'),false);
 assert.throws(()=>audit.inspect({positive:{}}),/Expected arrays/);
});
