'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const corroboration=require('../evidence-corroboration.js');
const fp=require('../cinematic-fingerprint.js');
const kw=require('../keyword-signal-audit.js');
const film=(key,{tags=[],directors=[],writers=[],themes=[],tones=[],synopsis='',genre=['Drama']}={})=>({
 key,facets:{keywordNames:tags,directors,writers,themes,tones,genres:genre},synopsis
});
const check=(x)=>corroboration.inspect({...x,fingerprint:fp,keywordAudit:kw});
test('same-film verified creator independently corroborates a specific community keyword',()=>{
 const output=check({positive:[film('like',{tags:['railway station'],directors:['tmdb-person-47']})],
 candidates:[film('film',{tags:['railway station'],directors:['tmdb-person-47']})],
 qualifiedKeys:new Set(['film'])});
 assert.equal(output.keywordLinked,1);
 assert.equal(output.keywordWithVerifiedCreator,1);
 assert.equal(output.keywordWithAnyIndependentFacet,1);
 assert.equal(output.qualifiedWithIndependentFacet,1);
 assert.equal(output.keywordOnly,0);
});
test('literal synopsis clue corroborates cautiously, without claiming verified film style',()=>{
 const output=check({positive:[film('like',{tags:['rural village'],synopsis:'An elderly caregiver lives alone.'})],
 candidates:[film('film',{tags:['rural village'],synopsis:'A lonely caregiver tends a neighbor.'})]});
 assert.equal(output.keywordWithSynopsisTopic,1);
 assert.equal(output.keywordWithAnyIndependentFacet,1);
 assert.equal(output.keywordWithVerifiedCreator,0);
 assert.ok(output.caveat.includes('unverified'));
});
test('broad genre and theme mapped from same keyword are not independent evidence',()=>{
 const output=check({positive:[film('like',{tags:['isolated village'],themes:['loss'],tones:['melancholic']})],
 candidates:[film('film',{tags:['isolated village'],themes:['loss'],tones:['melancholic']})]});
 assert.equal(output.keywordLinked,1);
 assert.equal(output.keywordOnly,1);
 assert.equal(output.keywordWithAnyIndependentFacet,0);
});
test('independent facet must match the SAME Log anchor as a usable tag',()=>{
 const output=check({positive:[
  film('a',{tags:['railway station'],directors:['tmdb-person-1']}),
  film('b',{tags:['remote island'],directors:['tmdb-person-2']})],
 candidates:[film('film',{tags:['railway station'],directors:['tmdb-person-2']})]});
 assert.equal(output.keywordWithDifferentAnchorFacetOnly,1);
 assert.equal(output.keywordWithAnyIndependentFacet,0);
});
test('a negative-control conflict persists even if a candidate has verified corroboration',()=>{
 const output=check({positive:[film('love',{tags:['railway station'],directors:['tmdb-person-44']})],
 negative:[film('dislike',{tags:['railway station']})],
 candidates:[film('film',{tags:['railway station'],directors:['tmdb-person-44']})],
 qualifiedKeys:['film']});
 assert.equal(output.keywordWithNegativeCollision,1);
 assert.equal(output.corroboratedWithNegativeCollision,1);
 assert.equal(output.qualifiedCorroboratedWithNegativeCollision,1);
});
test('high-frequency and generic tags do not masquerade as independently corroborated',()=>{
 const one=film('like',{tags:['love','hospital']});
 const candidates=[film('a',{tags:['love','hospital']}),film('b',{tags:['hospital']}),film('c',{tags:['hospital']}),film('d',{tags:['hospital']})];
 const output=check({positive:[one],candidates});
 assert.equal(output.keywordLinked,0);
 assert.equal(output.keywordWithAnyIndependentFacet,0);
});
test('no leaked film names, film IDs or keyword labels in numeric diagnostics',()=>{
 const output=check({positive:[film('PRIVATE_ANCHOR',{tags:['hidden harbors']})],
 candidates:[film('PRIVATE_CANDIDATE',{tags:['hidden harbors']})]});
 const json=JSON.stringify(output);
 for(const token of ['PRIVATE_ANCHOR','PRIVATE_CANDIDATE','hidden harbors'])assert.equal(json.includes(token),false);
 assert.equal(output.keywordLinked,1);
});
test('empty profiles remain zero and dependencies are required',()=>{
 const out=check({positive:[],negative:[],candidates:[]});
 assert.equal(out.candidates,0);
 assert.equal(out.keywordLinked,0);
 assert.throws(()=>corroboration.inspect({positive:[],candidates:[]}),/Missing shadow/);
});
