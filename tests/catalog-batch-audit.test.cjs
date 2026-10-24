'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const audit=require('../catalog-batch-audit.js');
require('../recommendation-engine.js');
const engine=globalThis.AfterlogueRecommendationEngine;
const cinematic=require('../taste-model-v2.js'),policy=require('../eligibility-policy.js');
const anchorBalance=require('../evidence-balance.js');
function fixtures(){
 const films=Array.from({length:38},(_,i)=>({id:i+1,title:'Test Film '+(i+1),
  poster:'https://example.invalid/poster/'+(i+1),media:'movie',
  genres:i%3===0?['Drama','Romance']:['Drama'],matched:['Test Film 1','Test Film 2'],
  synopsis:i%4===0?'A lonely artist recalls memories and leaves home.':'An ordinary story of relationships.'}));
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
  position,tmdb:{id:item.id,media:'movie'},directMatches:(item.matched||[]).map(x=>x.toLowerCase().replaceAll(' ','-')),
  facets:{genres:item.genres.map(x=>x.toLowerCase()),themes:[],tones:[],directors:[],
   writers:[],narrativeThemes:item.id%4===0?['solitude']:[],pace:null}});
 const features=async keys=>new Map(keys.map(key=>{
  const id=Number(key.replace('tmdb-movie-',''));
  return [key,{genres:id%3===0?['drama','romance']:['drama'],
   themes:id%2===0?['solitude','memory']:['connection','memory'],
   tones:id%3===0?['reflective']:['tender'],directors:['verified-id-1'],writers:[]}];
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
