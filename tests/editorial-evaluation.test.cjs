'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const editorial=require('../editorial-evidence.js'),qa=require('../editorial-evaluation.js');
function note(filmKey,attrs,opts={}){
 return {filmKey,reviewStatus:opts.status||'reviewed',
  provenance:{sourceType:'firsthand-screening-notes',reviewerCode:'example-only',
   reviewedOn:'2026-10-24'},
  observations:Object.fromEntries(Object.entries(attrs).map(([k,value])=>[
    k,{value,originalRationale:'Fictional author-created viewing notes for a test scenario.'}]))};
}
const measure=(a={})=>qa.inspect({editorialEvidence:editorial,...a});
test('source-separated style evidence distinguishes slow observational from kinetic without genres',()=>{
 const observations=[
  note('story-a',{pacing:'measured',narrativeStructure:'episodic',visualApproach:'observational',dialogueDensity:'sparse'}),
  note('story-b',{pacing:'measured',narrativeStructure:'chronological',visualApproach:'observational',dialogueDensity:'sparse'}),
  note('story-c',{pacing:'brisk',narrativeStructure:'chronological',visualApproach:'handheld-immediate',dialogueDensity:'dialogue-driven'})
 ];
 const report=measure({observations,positiveKeys:['story-a'],candidateKeys:['story-b','story-c'],
  qualifiedKeys:['story-b','story-c']});
 assert.equal(report.reviewedPositiveAnchors,1);
 assert.equal(report.reviewedCandidates,2);
 assert.equal(report.comparablePairs,2);
 assert.equal(report.candidatesWithMultiDimensionEditorialMatch,1);
 assert.equal(report.qualifiedCandidatesWithMultiDimensionEditorialMatch,1);
 assert.equal(report.candidatesWithAnyMatchingEditorialDimension,1);
});
test('similar stylistic traits and contradictory traits may coexist',()=>{
 const observations=[note('story-a',{pacing:'measured',visualApproach:'observational',
  narrativeStructure:'nonlinear'}),note('story-b',{pacing:'measured',visualApproach:'expressive-stylized',
  narrativeStructure:'nonlinear'})];
 const r=measure({observations,positiveKeys:['story-a'],candidateKeys:['story-b']});
 assert.equal(r.multiDimensionPairs,1);
 assert.equal(r.ambiguousPairs,1);
 assert.equal(r.candidatesWithAmbiguousEditorialEvidence,1);
});
test('unreviewed items are unknown and do not become failed-recommendation labels',()=>{
 const r=measure({observations:[note('story-a',{pacing:'measured'})],
  positiveKeys:['story-a'],candidateKeys:['story-b','story-c'],qualifiedKeys:['story-b']});
 assert.equal(r.reviewedCandidates,0);
 assert.equal(r.fullyUnknownCandidates,2);
 assert.equal(r.multiDimensionPairs,0);
 assert.equal(r.qualifiedCandidatesWithMultiDimensionEditorialMatch,0);
});
test('duplicates cannot silently override original review status',()=>{
 const a=note('story-a',{pacing:'measured'}),b=note('story-b',{pacing:'brisk'});
 const result=measure({observations:[a,a,a,b],positiveKeys:['story-a'],
  candidateKeys:['story-a','story-b']});
 assert.equal(result.duplicateRecords,2);
 assert.equal(result.acceptedUniqueRecords,1);
 assert.equal(result.reviewedPositiveAnchors,0);
 assert.equal(result.reviewedCandidates,1);
});
test('source text and reviewer details stay out of aggregate diagnostics',()=>{
 const observations=[note('secret-film-a',{pacing:'measured'}),
 note('secret-film-b',{pacing:'measured'})];
 const r=measure({observations,positiveKeys:['secret-film-a'],candidateKeys:['secret-film-b']});
 assert.equal(r.comparablePairs,1);
 const s=JSON.stringify(r);
 for(const token of ['secret-film-a','secret-film-b','example-only','Fictional author-created'])
  assert.equal(s.includes(token),false);
});
test('a missing editor is not quietly replaced by provider synopsis inference',()=>{
 assert.throws(()=>qa.inspect({observations:[],positiveKeys:[],candidateKeys:[]}),/Missing independently authored/);
 const r=measure({observations:[],positiveKeys:['story-a'],candidateKeys:['story-b']});
 assert.equal(r.authoredRecords,0);
 assert.equal(r.fullyUnknownCandidates,1);
 assert.equal(r.acceptedUniqueRecords,0);
});
