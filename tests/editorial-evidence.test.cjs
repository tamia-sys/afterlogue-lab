'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const evidence=require('../editorial-evidence.js');
const annotation=(filmKey,observations,provenance={})=>({
 filmKey,reviewStatus:'reviewed',
 provenance:{sourceType:'firsthand-screening-notes',reviewerCode:'lab-reviewer-1',
 reviewedOn:'2026-10-24',...provenance},
 observations:Object.fromEntries(Object.entries(observations).map(([k,v])=>
  [k,{value:v,originalRationale:'An original observation based on actually screening this fictional film.'}]))
});
test('distinct independently authored attributes support multidimensional comparisons',()=>{
 const a=annotation('fictional-film-a',{pacing:'measured',visualApproach:'observational',
  narrativeStructure:'episodic',dialogueDensity:'sparse'});
 const b=annotation('fictional-film-b',{pacing:'measured',visualApproach:'observational',
  narrativeStructure:'episodic',dialogueDensity:'sparse'});
 const r=evidence.contrast(a,b);
 assert.equal(r.comparable,true);
 assert.equal(r.matched,4);
 assert.equal(r.multiDimensionMatch,true);
 assert.equal(r.different,0);
});
test('same genre is irrelevant; contradictory style is flagged, not automatically disqualified',()=>{
 const a=annotation('fictional-film-a',{pacing:'measured',visualApproach:'observational'});
 const b=annotation('fictional-film-b',{pacing:'brisk',visualApproach:'expressive-stylized'});
 const r=evidence.contrast(a,b);
 assert.equal(r.matched,0);
 assert.equal(r.different,2);
 assert.equal(r.multiDimensionMatch,false);
 assert.equal(r.unknownDimensions,4);
});
test('mixed independent evidence preserves ambiguity',()=>{
 const a=annotation('fictional-film-a',{pacing:'measured',visualApproach:'observational',
  narrativeStructure:'nonlinear'});
 const b=annotation('fictional-film-b',{pacing:'measured',visualApproach:'expressive-stylized',
  narrativeStructure:'nonlinear'});
 const r=evidence.contrast(a,b);
 assert.equal(r.matched,2);
 assert.equal(r.different,1);
 assert.equal(r.ambiguous,true);
});
test('never pretend missing pacing or unreviewed opinions are facts',()=>{
 const a=annotation('fictional-film-a',{narrativeStructure:'episodic'});
 const b=annotation('fictional-film-b',{visualApproach:'observational'});
 const r=evidence.contrast(a,b);
 assert.equal(r.comparable,true);
 assert.equal(r.comparableDimensions,0);
 assert.equal(r.unknownDimensions,6);
 const pending={...a,reviewStatus:'draft'};
 assert.equal(evidence.parse(pending).reason,'not-reviewed');
 assert.equal(evidence.contrast(pending,b).comparable,false);
});
test('reject movie metadata and synopses passed off as firsthand analysis',()=>{
 const a=annotation('fictional-film-a',{pacing:'measured'});
 const wrong={...a,provenance:{...a.provenance,sourceType:'tmdb-keywords'}};
 assert.equal(evidence.parse(wrong).reason,'unlicensed-or-unidentified-source');
 assert.equal(evidence.parse({...a,observations:{
  pacing:{value:'measured',originalRationale:'From TMDB'}}}).reason,'unsubstantiated-observation');
 assert.equal(evidence.parse({...a,observations:{
  pacing:{value:'slow',originalRationale:'The editing seemed to create a steady sense of time.'}}}).reason,'invalid-dimension-value');
});
test('licensed editorial observations require a separate permission reference',()=>{
 const a=annotation('fictional-film-a',{pacing:'brisk'},{sourceType:'rights-cleared-editorial'});
 assert.equal(evidence.parse(a).reason,'missing-usage-permission');
 const b={...a,provenance:{...a.provenance,permissionRef:'license/internal-document-01'}};
 const output=evidence.parse(b);
 assert.equal(output.accepted,true);
 assert.equal(output.provenance.hasPermission,true);
 assert.equal('permissionRef' in output.provenance,false);
});
test('review identity and provenance dates are deliberately validated',()=>{
 const a=annotation('fictional-film-a',{pacing:'measured'});
 assert.equal(evidence.parse({...a,provenance:{...a.provenance,reviewerCode:'email@domain.com'}}).accepted,false);
 assert.equal(evidence.parse({...a,provenance:{...a.provenance,reviewedOn:'2026-02-30'}}).accepted,false);
 assert.equal(evidence.parse({...a,filmKey:'<secret>'}).accepted,false);
});
test('annotation metrics expose only counts, never source rationales or author codes',()=>{
 const a=annotation('fictional-film-a',{pacing:'measured'});
 const b=annotation('fictional-film-b',{visualApproach:'observational'});
 const c={...b,reviewStatus:'draft'};
 const res=evidence.audit([a,b,c]);
 assert.equal(res.accepted,2);
 assert.equal(res.rejected,1);
 assert.equal(res.dimensionsCovered.pacing,1);
 assert.equal(res.dimensionsCovered.visualApproach,1);
 assert.equal(res.rejectedReasons['not-reviewed'],1);
 const s=JSON.stringify(res)+JSON.stringify(evidence.parse(a));
 assert.equal(s.includes('fictional-film-a'),true); // parsed result retains only the film key to facilitate local joins
 assert.equal(s.includes('An original observation'),false);
 assert.equal(s.includes('lab-reviewer-1'),false);
});
test('unsupported fields and empty dimensions are not silently treated as confirmed',()=>{
 const a=annotation('fictional-film-a',{pacing:'measured'});
 const bad={...a,observations:{...a.observations,secretNewFacet:{value:'whatever'}}};
 assert.equal(evidence.parse(bad).reason,'unknown-editorial-dimension');
 assert.equal(evidence.parse({...a,observations:{}}).reason,'no-observed-dimensions');
 assert.throws(()=>evidence.audit({}),/Expected annotation array/);
});
