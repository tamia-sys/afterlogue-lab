#!/usr/bin/env node
/* Large-scale deterministic STRUCTURAL stress test of Afterlogue Lab.
   Fictional movies and synthetic impressions only. Does not validate real
   human preference accuracy or call TMDB, Supabase, or private Logs. */
'use strict';
const assert=require('node:assert/strict');
require('../recommendation-engine.js');
const engine=globalThis.AfterlogueRecommendationEngine;
const taste=require('../taste-model-v2.js');
const policy=require('../eligibility-policy.js');
const anchorBalance=require('../evidence-balance.js');
const retrieval=require('./retrieval-simulator.cjs');

const LANES=[
 {name:'intimate-realism',genres:['drama'],themes:['ordinary-life','connection','solitude'],tones:['intimate','reflective'],pace:'slow'},
 {name:'social-satire',genres:['comedy','drama'],themes:['class','ambition','social-status'],tones:['satirical','unsettling'],pace:'medium'},
 {name:'psychological-mystery',genres:['thriller'],themes:['secrets','truth','obsession'],tones:['suspenseful','unsettling'],pace:'fast'},
 {name:'romantic-yearning',genres:['romance','drama'],themes:['longing','memory','separation'],tones:['tender','melancholic'],pace:'slow'},
 {name:'family-comedy',genres:['comedy','family'],themes:['family','friendship','belonging'],tones:['warm','funny'],pace:'fast'},
 {name:'speculative-philosophy',genres:['science fiction'],themes:['identity','freedom','control'],tones:['reflective','wondrous'],pace:'medium'},
 {name:'adventure',genres:['adventure'],themes:['survival','courage','loyalty'],tones:['thrilling','wondrous'],pace:'fast'},
 {name:'animated-story',genres:['animation'],themes:['growing-up','belonging','memory'],tones:['tender','playful'],pace:'medium'}
];
function rand(seed){let x=(seed>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
function choose(array,r){return array[Math.floor(r()*array.length)]}
function catalog({perLane=24,missingRate=.25,seed=1}={}){
 const rng=rand(seed),out=[];
 LANES.forEach((lane,n)=>{
  for(let j=0;j<perLane;j++){
   const rich=rng()>=missingRate,extra=LANES[(n+1+j%3)%LANES.length];
   out.push({key:'fictional-film-'+n+'-'+j,title:'Fictional '+lane.name+' '+j,
    category:'movies',position:out.length,
    directMatches:[],syntheticLane:lane.name,
    facets:{genres:[...lane.genres],
      themes:rich?[...lane.themes.slice(0,2),...(j%5===0?[extra.themes[2]]:[])]:[],
      tones:rich?[...lane.tones]:[],
      directors:rich?['fictional-director-'+n+'-'+Math.floor(j/6)]:[],
      writers:[],narrativeThemes:[],pace:rich?lane.pace:null}});
  }
 });
 return out;
}
function makePersona(index,items,{seed=1}={}){
 const rng=rand(seed+index*7919),width=1+index%4;
 const primary=(index*3+Math.floor(index/8))%LANES.length;
 const lanes=[primary];
 for(let i=1;i<width;i++){const next=(primary+i*3+Math.floor(index/13))%LANES.length;if(!lanes.includes(next))lanes.push(next)}
 const log=new Map();
 for(const id of lanes){
  const matches=items.filter(x=>x.syntheticLane===LANES[id].name);
  const order=[...matches];
  for(let j=order.length-1;j>0;j--){const k=Math.floor(rng()*(j+1));[order[j],order[k]]=[order[k],order[j]]}
  const count=Math.max(3,Math.floor(12/lanes.length));
  for(const item of order.slice(0,count))log.set(item.key,rng()<.62?'Loved':'Liked');
 }
 const others=items.filter(x=>!lanes.includes(LANES.findIndex(l=>l.name===x.syntheticLane)));
 for(const item of others.slice(index%7,index%7+3))log.set(item.key,'Not for me');
 return {id:index,width:lanes.length,log};
}
function avg(rows,key){return rows.length?rows.reduce((sum,row)=>sum+row[key],0)/rows.length:0}
function run({personas=240,perLane=24,missingRate=.25,seed=23,shelfSize=5,
 retrievalStrategy='balanced',candidateBudget=120}={},dependencies={}){
 assert.ok(Number.isInteger(personas)&&personas>0&&personas<=5000);
 assert.ok(Number.isInteger(perLane)&&perLane>=12&&perLane<=100);
 assert.ok(missingRate>=0&&missingRate<=.95&&shelfSize>=1&&shelfSize<=10);
 assert.ok(Number.isInteger(candidateBudget)&&candidateBudget>=10&&candidateBudget<=500);
 const source=catalog({perLane,missingRate,seed});
 const ranker=dependencies.engine||engine,cinematic=dependencies.taste||taste,
  eligibility=dependencies.policy||policy,balancer=dependencies.anchorBalance||anchorBalance;
 const observations=[];
 for(let i=0;i<personas;i++){
  const p=makePersona(i,source,{seed});
  const keys=new Set(p.log.keys()),scores=Object.fromEntries(p.log);
  const retrieved=retrieval.retrieve(source,p.log,{strategy:retrievalStrategy,
    maxAnchors:8,perAnchor:18,limit:candidateBudget});
  const testPool=[...source.filter(x=>keys.has(x.key)),...retrieved.items];
  const ranked=ranker.rank({entries:testPool,category:'movies',impressions:scores});
  const adjusted=cinematic.rank(ranked,testPool,scores);
  const valid=eligibility.eligible(adjusted,{ratedKeys:[...keys]});
  const rawShelf=valid.slice(0,shelfSize);
  // Match the Lab's real post-eligibility two-stage shelf balancing.
  const ordered=balancer.balance(ranker.balanceShelves({entries:valid,profileEntries:testPool,
   impressions:scores,category:'movies',size:shelfSize}),shelfSize);
  const shelf1=ordered.slice(0,shelfSize),shelf2=ordered.slice(shelfSize,shelfSize*2);
  const shown=[...shelf1,...shelf2];
  const duplicateCount=shown.length-new Set(shown.map(x=>x.key)).size;
  const loggedCount=shown.filter(x=>keys.has(x.key)).length;
  const unsupported=shown.filter(x=>!(x.cinematicSignalCount>=1)||!(x.score>0)).length;
  const rawGenres=new Set(rawShelf.flatMap(x=>x.facets?.genres||[]));
  const rawLanes=new Set(rawShelf.map(x=>x.syntheticLane));
  const rawAnchors=new Set(rawShelf.map(x=>x.cinematicAnchor).filter(Boolean));
  const firstGenres=new Set(shelf1.flatMap(x=>x.facets?.genres||[]));
  const firstLanes=new Set(shelf1.map(x=>x.syntheticLane));
  const firstAnchors=new Set(shelf1.map(x=>x.cinematicAnchor).filter(Boolean));
  const maxAnchor=[...firstAnchors].reduce((m,a)=>Math.max(m,shelf1.filter(x=>x.cinematicAnchor===a).length),0);
  const likedLanes=new Set(source.filter(x=>['Loved','Liked'].includes(p.log.get(x.key))).map(x=>x.syntheticLane));
  const retrievedLanes=new Set(retrieved.items.map(x=>x.syntheticLane));
  const recoveredLikedLanes=[...likedLanes].filter(x=>retrievedLanes.has(x)).length;
  observations.push({width:p.width,allCandidates:source.length-keys.size,qualified:valid.length,
   retrieved:retrieved.items.length,retrievedLanes:retrievedLanes.size,
   positiveLaneCoverage:likedLanes.size?recoveredLikedLanes/likedLanes.size:0,
   completeFirst:Number(shelf1.length>=shelfSize),completeSecond:Number(shelf2.length>=shelfSize),
   duplicates:duplicateCount,loggedViolations:loggedCount,unsupported,
   genres:firstGenres.size,lanes:firstLanes.size,anchors:firstAnchors.size,
   rawGenres:rawGenres.size,rawLanes:rawLanes.size,rawAnchors:rawAnchors.size,
   anchorDominance:shelf1.length?maxAnchor/shelf1.length:0,
   strongSignals:shelf1.filter(x=>x.cinematicSignalCount>=2).length});
 }
 function summarize(rows){
  return {personas:rows.length,firstShelfCoverage:avg(rows,'completeFirst'),
   twoShelfCoverage:avg(rows,'completeSecond'),meanEligibleCandidates:avg(rows,'qualified'),
   meanRetrievedCandidates:avg(rows,'retrieved'),meanRetrievedLanes:avg(rows,'retrievedLanes'),
   meanPositiveTasteLaneRetrievalCoverage:avg(rows,'positiveLaneCoverage'),
   meanGenresAt5:avg(rows,'genres'),meanSyntheticLanesAt5:avg(rows,'lanes'),
   meanUnbalancedGenresAt5:avg(rows,'rawGenres'),meanUnbalancedLanesAt5:avg(rows,'rawLanes'),
   meanUnbalancedAnchorsAt5:avg(rows,'rawAnchors'),
   meanDistinctSourceAnchorsAt5:avg(rows,'anchors'),
   meanDominantAnchorFraction:avg(rows,'anchorDominance'),
   meanMultiSignalAt5:avg(rows,'strongSignals'),
   duplicateViolations:rows.reduce((s,x)=>s+x.duplicates,0),
   previouslyRatedViolations:rows.reduce((s,x)=>s+x.loggedViolations,0),
   unsupportedEligibilityViolations:rows.reduce((s,x)=>s+x.unsupported,0)};
 }
 return {format:'afterlogue-structural-stress-v1',syntheticOnly:true,
  warning:'All films and people are fictional. Retrieval emulates a provider; these numbers DO NOT measure real TMDB retrieval, human preferences, or true recommendation precision.',
  config:{personas,perLane,missingRate,seed,shelfSize,retrievalStrategy,candidateBudget},filmCount:source.length,
  summary:summarize(observations),byTasteBreadth:Object.fromEntries([1,2,3,4].map(n=>
   [String(n),summarize(observations.filter(x=>x.width===n))])),
  metadataNote:'Every missing facet was intentionally removed; no themes or tones were invented for missing records.'};
}
function main(){
 const values=process.argv.slice(2),config={};
 const flags={'--personas':'personas','--per-lane':'perLane','--missing-rate':'missingRate',
  '--seed':'seed','--shelf-size':'shelfSize','--strategy':'retrievalStrategy',
  '--budget':'candidateBudget'};
 if(values.includes('--help')){console.log('Usage: node tests/stress-personas.cjs [--personas 240] [--per-lane 24] [--missing-rate 0.25] [--seed 23]');return}
 for(let i=0;i<values.length;i+=2){
  if(!flags[values[i]]||values[i+1]==null)throw Error('Unknown or incomplete CLI flag '+values[i]);
  config[flags[values[i]]]=values[i]==='--strategy'?values[i+1]:Number(values[i+1]);
 }
 const report=run(config);console.log(JSON.stringify(report,null,2));
 if(report.summary.duplicateViolations||report.summary.previouslyRatedViolations||report.summary.unsupportedEligibilityViolations)process.exitCode=1;
}
if(require.main===module){try{main()}catch(error){console.error(error.stack);process.exitCode=1}}
module.exports={LANES,rand,catalog,makePersona,run};
