'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const editorial=require('../editorial-evidence.js'),pilot=require('../editorial-pilot.js');
const consensus=require('../editorial-consensus.js'),holdout=require('../editorial-interest-holdout.js');
const keys=pilot.slate.map(f=>f.key);
const names=['pacing','narrativeStructure','visualApproach','dialogueDensity'];
function note(key,reviewer,values){
 return {filmKey:key,reviewStatus:'reviewed',
  provenance:{sourceType:'firsthand-screening-notes',reviewerCode:reviewer,reviewedOn:'2026-10-24'},
  observations:Object.fromEntries(Object.entries(values).map(([k,v])=>
   [k,{value:v,originalRationale:'This is an entirely invented observation for a synthetic testing fixture.'}]))};
}
const styleA={pacing:'measured',visualApproach:'observational',dialogueDensity:'sparse',narrativeStructure:'episodic'};
const styleB={pacing:'brisk',visualApproach:'expressive-stylized',dialogueDensity:'dialogue-driven',narrativeStructure:'chronological'};
const styleMixed={pacing:'measured',visualApproach:'observational',dialogueDensity:'dialogue-driven',narrativeStructure:'chronological'};
function packet(code,films){
 return pilot.makePacket({reviewerCode:code,editorialEvidence:editorial,
  records:films.map(([key,v])=>note(key,code,v))});
}
const reviewed=(v1,v2=v1)=>{
 const l=packet('first-reviewer',v1),r=packet('second-reviewer',v2);
 return consensus.compare({packets:[l,r],editorialEvidence:editorial,pilot});
};
test('independent reviewer agreement creates a usable two-label profile',()=>{
 const x=reviewed([[keys[0],styleA],[keys[1],styleB],[keys[2],styleA]]);
 assert.equal(x.ready,true);
 assert.equal(x.summary.jointlyReviewedFilms,3);
 assert.equal(x.summary.filmsWithTwoOrMoreAgreedDimensions,3);
 assert.equal(x.summary.filmsWithoutOverlappingReviews,9);
 assert.equal(x.films[0].agreed.pacing,'measured');
 assert.equal(x.films[0].agreedDimensionCount,4);
 assert.equal(JSON.stringify(x).includes('entirely invented observation'),false);
 assert.equal(JSON.stringify(x).includes('first-reviewer'),false);
});
test('missing dimensions and disagreement never become consensual attributes',()=>{
 const result=reviewed(
  [[keys[0],styleA],[keys[1],styleB]],
  [[keys[0],{pacing:'brisk',visualApproach:'observational'}],[keys[1],styleB]]);
 const first=result.films.find(f=>f.key===keys[0]);
 assert.equal(first.usable,false);
 assert.equal(first.agreedDimensionCount,1);
 assert.equal(first.conflicted.includes('pacing'),true);
 assert.equal(first.unobserved.includes('dialogueDensity'),true);
 assert.equal(result.summary.observedDimensionsConflicted,1);
});
test('same pseudonymous reviewer and copied exports do not count as independent',()=>{
 const p=packet('reviewer-x',[[keys[0],styleA]]);
 assert.equal(consensus.compare({packets:[p,p],editorialEvidence:editorial,pilot}).reason,
  'same-reviewer-export');
 assert.equal(consensus.compare({packets:[p],editorialEvidence:editorial,pilot}).ready,false);
});
test('external reviews and duplicate source records cannot enter the consensus corpus',()=>{
 const rec=note(keys[0],'reviewer-a',styleA);
 const p={format:'afterlogue-firsthand-editorial-pilot-v1',reviewerCode:'reviewer-a',
   scope:'local-export-only',records:[rec,rec]};
 const q=packet('reviewer-b',[[keys[0],styleA]]);
 assert.equal(consensus.compare({packets:[p,q],editorialEvidence:editorial,pilot}).ready,false);
 const licensed={...rec,provenance:{...rec.provenance,
  sourceType:'rights-cleared-editorial',permissionRef:'permission-0001'}};
 const x={...p,records:[licensed]};
 assert.equal(consensus.compare({packets:[x,q],editorialEvidence:editorial,pilot}).ready,false);
});
test('identical film keys cannot be both known anchors and heldout targets',()=>{
 const consensusData=reviewed([[keys[0],styleA],[keys[1],styleB],[keys[2],styleA]]);
 const inputs={consensus:consensusData,anchors:[
  {key:keys[0],impression:'Loved'},{key:keys[1],impression:'Not for me'}]};
 assert.equal(holdout.evaluate({...inputs,targets:[{key:keys[0],interest:'Interested'}]}).reason,
  'target-leakage-or-invalid-vote');
 assert.equal(holdout.evaluate({...inputs,targets:[{key:keys[2],interest:'Loved'}]}).reason,
  'target-leakage-or-invalid-vote');
 assert.equal(holdout.evaluate({...inputs,targets:[
  {key:keys[2],interest:'Interested'},{key:keys[2],interest:'Not drawn to it'}]}).ready,false);
});
test('invented heldout interest hypotheses are computed without inspecting target votes',()=>{
 const agreement=reviewed([
  [keys[0],styleA],[keys[1],styleB],[keys[2],styleA],[keys[3],styleMixed]
 ]);
 const inputs={consensus:agreement,anchors:[
  {key:keys[0],impression:'Loved'},{key:keys[1],impression:'Not for me'}
 ]};
 const yes=holdout.evaluate({...inputs,targets:[{key:keys[2],interest:'Interested'}]});
 const no=holdout.evaluate({...inputs,targets:[{key:keys[2],interest:'Not drawn to it'}]});
 assert.equal(yes.ready,true);assert.equal(yes.hypothesesMade,1);
 assert.equal(no.hypothesesMade,1);
 assert.equal(yes.abstentions,no.abstentions);
 assert.equal(yes.hypotheticalInterestVotes,1);
 assert.equal(no.hypotheticalNotDrawnVotes,1);
 assert.equal(yes.evaluationStatus,'exploratory-not-validated');
 assert.equal('accuracy' in yes,false);
 assert.equal('precision' in yes,false);
});
test('mixed positive and negative attributes trigger abstention rather than pretending precision',()=>{
 const agreement=reviewed([
  [keys[0],styleA],[keys[1],styleB],[keys[2],styleB],[keys[3],styleMixed]
 ]);
 const report=holdout.evaluate({consensus:agreement,
  anchors:[{key:keys[0],impression:'Liked'},{key:keys[1],impression:'Not for me'}],
  targets:[{key:keys[2],interest:'Interested'},{key:keys[3],interest:'Unsure'}]});
 assert.equal(report.ready,true);
 assert.equal(report.hypothesesMade,0);
 assert.equal(report.abstentions,2);
 assert.equal(report.hypotheticalInterestVotes,0);
 assert.equal(report.abstentionsByReason['mixed-or-negative-evidence'],2);
});
test('insufficient consensual evidence is UNKNOWN and not counted as a predicted dislike',()=>{
 const agreement=reviewed([[keys[0],styleA],[keys[1],styleB],[keys[2],{pacing:'measured'}]]);
 const result=holdout.evaluate({consensus:agreement,
  anchors:[{key:keys[0],impression:'Loved'},{key:keys[1],impression:'Not for me'}],
  targets:[{key:keys[2],interest:'Not drawn to it'}]});
 assert.equal(result.hypothesesMade,0);
 assert.equal(result.abstentionsByReason['insufficient-target-observations'],1);
 assert.equal(result.hypotheticalNotDrawnVotes,0);
});
test('no independent reviews or no genuine disliked anchor means cannot infer fit',()=>{
 assert.equal(holdout.evaluate({consensus:{ready:false},anchors:[],targets:[]}).ready,false);
 const agreement=reviewed([[keys[0],styleA],[keys[1],styleB],[keys[2],styleA]]);
 assert.equal(holdout.evaluate({consensus:agreement,
  anchors:[{key:keys[0],impression:'Loved'},{key:keys[1],impression:'Liked'}],
  targets:[{key:keys[2],interest:'Interested'}]}).reason,'requires-positive-and-negative-anchors');
});
test('published holdout report contains no source film, reviewer, notes or per-film response',()=>{
 const agreement=reviewed([[keys[0],styleA],[keys[1],styleB],[keys[2],styleA]]);
 const result=holdout.evaluate({consensus:agreement,
  anchors:[{key:keys[0],impression:'Loved'},{key:keys[1],impression:'Not for me'}],
  targets:[{key:keys[2],interest:'Interested'}]});
 const s=JSON.stringify(result);
 for(const phrase of [...keys.slice(0,3),'first-reviewer','second-reviewer',
  'invented observation'])assert.equal(s.includes(phrase),false);
});

test('two agreeing facets with another reviewer conflict are quarantined from interest hypotheses',()=>{
 const all=reviewed(
  [[keys[0],styleA],[keys[1],styleB],[keys[2],styleA]],
  [[keys[0],styleA],[keys[1],styleB],
   [keys[2],{...styleA,dialogueDensity:'dialogue-driven'}]]
 );
 const disputed=all.films.find(x=>x.key===keys[2]);
 assert.equal(disputed.agreedDimensionCount,3);
 assert.equal(disputed.usable,false);
 assert.equal(disputed.conflicted.includes('dialogueDensity'),true);
 const result=holdout.evaluate({consensus:all,
  anchors:[{key:keys[0],impression:'Loved'},{key:keys[1],impression:'Not for me'}],
  targets:[{key:keys[2],interest:'Interested'}]});
 assert.equal(result.hypothesesMade,0);
 assert.equal(result.abstentionsByReason['insufficient-target-observations'],1);
});
