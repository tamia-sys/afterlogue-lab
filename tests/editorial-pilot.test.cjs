'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pilot=require('../editorial-pilot.js');
const evidence=require('../editorial-evidence.js');
function record(filmKey,reviewerCode,dimensions){
 return {filmKey,reviewStatus:'reviewed',provenance:{
  sourceType:'firsthand-screening-notes',reviewerCode,reviewedOn:'2026-10-24'},
  observations:Object.fromEntries(Object.entries(dimensions).map(([dimension,value])=>[
   dimension,{value,originalRationale:'Original note written by the reviewer after actually viewing the film.'}
  ]))};
}
const a=pilot.slate[0].key,b=pilot.slate[1].key,c=pilot.slate[2].key;
const packet=(reviewerCode,records)=>pilot.makePacket({reviewerCode,records,editorialEvidence:evidence});
const compare=packets=>pilot.compare({packets,editorialEvidence:evidence});
test('pilot slate has exactly twelve stable and unique public title labels with no style guesses',()=>{
 assert.equal(pilot.slate.length,12);
 assert.equal(new Set(pilot.slate.map(x=>x.key)).size,12);
 assert.equal(pilot.slate.every(x=>typeof x.title==='string'&&/ \(\d{4}\)$/.test(x.title)),true);
 assert.equal(pilot.slate.some(x=>('pacing' in x)||('tone' in x)),false);
});
test('validated local packet never accepts unscreened or unattributed style statements',()=>{
 const p=packet('reviewer-01',[record(a,'reviewer-01',{pacing:'measured'})]);
 assert.equal(p.records.length,1);
 assert.equal(p.scope,'local-export-only');
 assert.throws(()=>packet('r@domain.com',[]),/pseudonymous reviewer/);
 assert.throws(()=>packet('reviewer-01',[record(a,'reviewer-02',{pacing:'measured'})]),/reviewer's code/);
 assert.throws(()=>packet('reviewer-01',[record(a,'reviewer-01',{pacing:'measured'}),
  record(a,'reviewer-01',{pacing:'brisk'})]),/Duplicate film/);
 assert.throws(()=>packet('reviewer-01',[{...record(a,'reviewer-01',{pacing:'measured'}),
  reviewStatus:'draft'}]),/not-reviewed/);
 assert.throws(()=>packet('reviewer-01',[record('pilot-not-in-slate','reviewer-01',{pacing:'measured'})]),/outside/);
});
test('different reviewers can agree about dimensions without revealing their source notes',()=>{
 const x=packet('reviewer-01',[
  record(a,'reviewer-01',{pacing:'measured',visualApproach:'observational'}),
  record(b,'reviewer-01',{pacing:'brisk'})]);
 const y=packet('reviewer-02',[record(a,'reviewer-02',{
  pacing:'measured',visualApproach:'observational',
  dialogueDensity:'sparse'})]);
 const r=compare([x,y]);
 assert.equal(r.reviewedFilmCount,2);
 assert.equal(r.filmsWithOneReview,1);
 assert.equal(r.filmsWithTwoOrMoreReviews,1);
 assert.equal(r.comparedDimensionPairs,2);
 assert.equal(r.agreementPairs,2);
 assert.equal(r.disagreementPairs,0);
 assert.equal(r.observedPairAgreement,1);
 assert.equal(r.dimensions.dialogueDensity.missing,1);
 const published=JSON.stringify(r);
 for(const forbidden of ['reviewer-01','reviewer-02','Original note','Perfect Days','pilot-perfect'])
  assert.equal(published.includes(forbidden),false);
});
test('contradictory observations stay visible and do not produce a forced consensus',()=>{
 const x=packet('reviewer-01',[record(a,'reviewer-01',{
  pacing:'brisk',narrativeStructure:'episodic'})]);
 const y=packet('reviewer-02',[record(a,'reviewer-02',{
  pacing:'measured',narrativeStructure:'episodic'})]);
 const r=compare([x,y]);
 assert.equal(r.filmsWithDisagreements,1);
 assert.equal(r.comparedDimensionPairs,2);
 assert.equal(r.agreementPairs,1);
 assert.equal(r.disagreementPairs,1);
 assert.equal(r.observedPairAgreement,.5);
 assert.equal(r.dimensions.pacing.disagreed,1);
 assert.equal(r.dimensions.narrativeStructure.agreed,1);
});
test('same reviewer cannot inflate agreement with multiple exports',()=>{
 const x=packet('reviewer-01',[record(a,'reviewer-01',{pacing:'measured'})]);
 const r=compare([x,x]);
 assert.equal(r.reviewerCount,1);
 assert.equal(r.packetErrors,1);
 assert.equal(r.filmsWithTwoOrMoreReviews,0);
 assert.equal(r.comparedDimensionPairs,0);
 assert.equal(r.observedPairAgreement,null);
});
test('duplicates within a packet are quarantined rather than chosen by arrival order',()=>{
 const rec=record(a,'reviewer-01',{pacing:'measured'});
 const corrupt={format:'afterlogue-firsthand-editorial-pilot-v1',reviewerCode:'reviewer-01',
  scope:'local-export-only',records:[rec,{...rec,observations:{
   pacing:{value:'brisk',originalRationale:'An equally long but contradictory original note.'}}}]};
 const p=compare([corrupt]);
 assert.equal(p.reviewedFilmCount,0);
 assert.equal(p.recordErrors,1);
 assert.equal(p.filmsWithOneReview,0);
});
test('unreviewed films stay unknown and missing source permissions are rejected',()=>{
 const unlicensed=record(a,'reviewer-01',{pacing:'measured'});
 unlicensed.provenance={...unlicensed.provenance,sourceType:'rights-cleared-editorial'};
 const raw={format:'afterlogue-firsthand-editorial-pilot-v1',reviewerCode:'reviewer-01',
  scope:'local-export-only',records:[unlicensed]};
 const r=compare([raw]);
 assert.equal(r.reviewedFilmCount,0);
 assert.equal(r.recordErrors,1);
 assert.equal(r.filmsWithTwoOrMoreReviews,0);
 assert.equal(r.slateCount,12);
});
test('bad and out-of-slate records never escape into the aggregate report',()=>{
 const x={format:'afterlogue-firsthand-editorial-pilot-v1',reviewerCode:'reviewer-01',
  scope:'local-export-only',records:[record('secret-film','reviewer-01',{pacing:'brisk'})]};
 const malformed={format:'irrelevant',records:[{email:'secret@example.com'}]};
 const r=compare([x,malformed]);
 assert.equal(r.recordErrors,1);
 assert.equal(r.packetErrors,1);
 assert.equal(r.reviewedFilmCount,0);
 assert.equal(JSON.stringify(r).includes('secret-film'),false);
 assert.equal(JSON.stringify(r).includes('secret@example.com'),false);
});
