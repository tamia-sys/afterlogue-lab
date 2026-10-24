'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const audit=require('../catalog-batch-audit.js');
require('../recommendation-engine.js');
const engine=globalThis.AfterlogueRecommendationEngine;
const cinematic=require('../taste-model-v2.js'),policy=require('../eligibility-policy.js');
const anchorBalance=require('../evidence-balance.js');
const fingerprint=require('../cinematic-fingerprint.js');
const keywordAudit=require('../keyword-signal-audit.js');
const corroboration=require('../evidence-corroboration.js');
function fixtures(){
 const films=Array.from({length:38},(_,i)=>({id:i+1,title:'Test Film '+(i+1),
  poster:'https://example.invalid/poster/'+(i+1),media:'movie',
  genres:i%3===0?['Drama','Romance']:['Drama'],matched:['Test Film 1','Test Film 2'],
  synopsis:i%4===0?'A lonely artist goes on a road trip and recalls memories.':'An ordinary story of relationships.'}));
 const byTitle=new Map(films.map(x=>[x.title,x]));
 const profiles=[{name:'Fictional A',history:[['Test Film 1','Loved'],['Test Film 2','Loved'],['Test Film 3','Not for me']]},
  {name:'Fictional B',history:[['Test Film 1','Liked'],['Test Film 4','Loved'],['Test Film 2','Okay']]}];
 const calls=[];
 const api=async data=>{
  calls.push(data);
  if(data.mode==='recommend')return {items:[...films.slice(4,25),films[4],films[0]]};
  if(data.mode==='lab-browse')return {items:[...films.slice(15),films[4]]};
  throw Error('Unexpected test API operation '+data.mode);
 };
 const toEntry=(item,position)=>({key:'tmdb-movie-'+item.id,title:item.title,category:'movies',
  position,tmdb:{id:item.id,media:'movie'},synopsis:item.synopsis,directMatches:(item.matched||[]).map(x=>x.toLowerCase().replaceAll(' ','-')),
  facets:{genres:item.genres.map(x=>x.toLowerCase()),themes:[],tones:[],directors:[],
   writers:[],narrativeThemes:item.id%4===0?['solitude']:[],pace:null}});
 const features=async keys=>new Map(keys.map(key=>{
  const id=Number(key.replace('tmdb-movie-',''));
  return [key,{genres:id%3===0?['drama','romance']:['drama'],
   themes:id%2===0?['solitude','memory']:['connection','memory'],
   tones:id%3===0?['reflective']:['tender'],directors:['verified-id-1'],writers:[],
   keywordNames:['train station','displacement']}];
 }));
 const enrich=(items,meta)=>items.map(x=>({...x,facets:{...x.facets,...meta.get(x.key),
  narrativeThemes:x.facets.narrativeThemes}}));
 return {profiles,api,calls,resolveTitle:async name=>byTitle.get(name)||null,toEntry,features,enrich,
  engine,cinematic,policy,anchorBalance};
}
test('real-catalog batch processor measures two fake provider snapshots without user data',async()=>{
 const options=fixtures(),result=await audit.run({...options,maxPlans:2,maxCandidates:24});
 assert.equal(result.format,'afterlogue-real-catalog-batch-audit-v1');
 assert.equal(result.summary.profilesCompleted,2);
 assert.equal(result.profiles.length,2);
 assert.equal(result.summary.ratedTitleViolations,0);
 assert.equal(result.summary.duplicateViolations,0);
 assert.ok(result.summary.meanUniqueRetrieved>=24);
 assert.ok(result.profiles.every(x=>x.qualified>0));
 assert.ok(result.profiles.every(x=>x.candidateAccounting==='reconciled'));
 assert.ok(result.profiles.every(x=>x.lowScoreRejections+x.missingEvidenceRejections+
  x.unanchoredRejections+x.otherRejections+x.qualified===x.evaluatedCandidates));
 assert.ok(result.profiles.every(x=>x.evaluatedLinkedOnly+x.evaluatedBrowseOnly+
  x.evaluatedBoth===x.evaluatedCandidates));
 assert.ok(result.profiles.every(x=>x.qualifiedLinkedOnly+x.qualifiedBrowseOnly+
  x.qualifiedBoth===x.qualified));
 assert.equal(result.summary.candidateQualificationRate>0,true);
 assert.ok(result.summary.oneBestEvidenceTypeCount+result.summary.multipleBestEvidenceTypeCount>=0);
 assert.ok(result.summary.candidateThemeCoverage>0);
 assert.ok(options.calls.every(x=>['recommend','lab-browse'].includes(x.mode)));
 assert.equal(options.calls.filter(x=>x.mode==='lab-browse').length,2);
 assert.ok(!JSON.stringify(result).includes('Test Film 1'));
});
test('records individual provider failures without inventing coverage',async()=>{
 const options=fixtures(),orig=options.api;
 options.api=async x=>{if(x.mode==='lab-browse')throw Error('provider temporarily unavailable');return orig(x)};
 options.features=async()=>{throw Error('Feature service failed')};
 const result=await audit.run({...options,profiles:options.profiles.slice(0,1),maxPlans:1,maxCandidates:15});
 assert.equal(result.summary.independentBrowseFailures,1);
 assert.equal(result.summary.metadataFailures,1);
 assert.equal(result.summary.metadataReturnRate,0);
 assert.equal(result.profiles[0].candidateThemes,0);
 assert.ok(['metadata-request-coverage','eligibility-coverage','single-signal-evidence',
  'candidate-supply','no-obvious-structural-blocker'].includes(result.profiles[0].diagnosticHint));
});
test('cancellation stops before starting another fictional viewer',async()=>{
 const options=fixtures();let stop=false;
 const result=await audit.run({...options,onProgress:({stage})=>{if(stage==='Finished')stop=true},
  shouldCancel:()=>stop,maxPlans:1,maxCandidates:20});
 assert.equal(result.completed,1);
 assert.equal(result.cancelled,true);
});
test('disallows unbounded provider requests and excessive profiles',async()=>{
 const options=fixtures();
 await assert.rejects(()=>audit.run({...options,maxPlans:25}),/Invalid catalog QA request budget/);
 await assert.rejects(()=>audit.run({...options,maxCandidates:1000}),/Invalid catalog QA request budget/);
 assert.equal(audit.chooseAnchors([{item:{title:'A',genres:['Drama']},rating:'Loved'},
 {item:{title:'B',genres:['Comedy']},rating:'Liked'}],1).length,1);
});

test('fingerprint enriches structural audit in shadow mode without altering ranking',async()=>{
 const options=fixtures();
 const baseline=await audit.run({...options,profiles:options.profiles.slice(0,1),maxPlans:2,maxCandidates:24});
 const extended=await audit.run({...options,profiles:options.profiles.slice(0,1),
  maxPlans:2,maxCandidates:24,fingerprint,keywordAudit,corroboration});
 const old=baseline.profiles[0],updated=extended.profiles[0];
 assert.equal(old.qualified,updated.qualified);
 assert.equal(old.firstShelfComplete,updated.firstShelfComplete);
 assert.equal(old.secondShelfComplete,updated.secondShelfComplete);
 assert.equal(old.fingerprintExtraPlotTitles,0);
 assert.ok(updated.fingerprintExtraPlotTitles>0);
 assert.ok(updated.fingerprintNewPlotLinks>0);
 assert.ok(updated.fingerprintLinkedTitles>=updated.fingerprintNewPlotLinks);
 assert.ok(extended.summary.fingerprintExtraPlotClueCoverage>0);
 assert.ok(updated.fingerprintRawKeywordLinkedTitles>0);
 assert.ok(extended.summary.fingerprintRawKeywordLinkCoverage>0);
 assert.equal(extended.profiles[0].corroborationKeywordOnly,0);
 assert.ok(extended.summary.corroborationWithIndependentFacet>=0);
 assert.equal(extended.profiles[0].keywordRawLinks>0,true);
 assert.equal(extended.profiles[0].keywordSpecificLinks,0);
 assert.ok(extended.profiles[0].keywordGenericOnly>0);
 assert.equal(extended.profiles[0].keywordNegativeAnchors,1);
 assert.equal(old.qualified,updated.qualified);
 assert.equal(old.qualified,updated.qualified);
 assert.equal(updated.fingerprintRawKeywordUnqualifiedTitles>=0,true);
 assert.equal(updated.candidateAccounting,'reconciled');
});

test('optional disliked-film shadow controls cannot change ranking or eligibility',async()=>{
 const opts=fixtures(),profile={...opts.profiles[0],
  negativeControls:['Test Film 38','A deliberately unresolvable film title']};
 const base=await audit.run({...opts,profiles:[opts.profiles[0]],maxPlans:1,maxCandidates:15,
  keywordAudit,fingerprint,corroboration});
 const contrast=await audit.run({...opts,profiles:[profile],maxPlans:1,maxCandidates:15,
  keywordAudit,fingerprint,corroboration});
 const a=base.profiles[0],b=contrast.profiles[0];
 assert.equal(a.qualified,b.qualified);
 assert.equal(a.firstShelfComplete,b.firstShelfComplete);
 assert.equal(a.secondShelfComplete,b.secondShelfComplete);
 assert.equal(a.topGenres,b.topGenres);
 assert.equal(a.topAnchors,b.topAnchors);
 assert.equal(a.evaluatedCandidates,b.evaluatedCandidates);
 assert.equal(a.duplicateViolations,b.duplicateViolations);
 assert.equal(a.ratedTitleViolations,b.ratedTitleViolations);
 assert.equal(b.keywordNegativeAnchors,2); // one original fictional dislike + one shadow control
 assert.equal(b.keywordShadowNegativesUnresolved,1);
 assert.ok(b.metadataRequested>=a.metadataRequested);
 assert.equal(contrast.summary.keywordNegativeControlProfiles,1);
 assert.equal(contrast.summary.keywordShadowNegativesUnresolved,1);
 assert.ok(contrast.summary.keywordQualifiedWithMixedEvidence>=0);
 assert.equal(base.profiles[0].corroborationKeywordOnly,contrast.profiles[0].corroborationKeywordOnly);
 assert.ok(contrast.summary.keywordQualifiedWithExactConflict>=0);
 assert.ok(!JSON.stringify(contrast).includes('Test Film 38'));
});
