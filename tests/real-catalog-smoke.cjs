#!/usr/bin/env node
/**
 * Bounded public-catalog smoke audit. Fictional Logs ONLY.
 * Never persists TMDB title data, sends user impressions, calls lab telemetry,
 * or modifies Afterlogue's production website.
 *
 * Example:
 * node tests/real-catalog-smoke.cjs --profiles 2 --candidates 30 --plans 2
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {run}=require('../catalog-batch-audit.js');
require('../recommendation-engine.js');
const engine=globalThis.AfterlogueRecommendationEngine;
const cinematic=require('../taste-model-v2.js');
const policy=require('../eligibility-policy.js');
const anchorBalance=require('../evidence-balance.js');
const fingerprint=require('../cinematic-fingerprint.js');
const keywordAudit=require('../keyword-signal-audit.js');
const narrative=require('../narrative-signals.js');

// Exact existing LAB-only public endpoint. No keys, cookies or credentials.
const ENDPOINT='https://lerrhzrabrqgogfnlsbd.supabase.co/functions/v1/afterlogue-catalog-lab';
const PROFILES=[
 {name:'Fictional Cinephile',history:[
  ['Perfect Days','Loved'],['Moonlight','Loved'],['Paris, Texas','Loved'],
  ['Aftersun','Loved'],['Manchester by the Sea','Liked']],
  negativeControls:['The Notebook','The Hangover']},
 {name:'Fictional Eclectic',history:[
  ['City of God','Loved'],['The Favourite','Loved'],['Shrek','Loved'],
  ['Aftersun','Loved'],['The Farewell','Loved']],
  negativeControls:['Transformers: Revenge of the Fallen','The Emoji Movie']}
];
const normalize=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function makeAdapter({fetchImpl=globalThis.fetch,timeoutMs=18000}={}){
 if(typeof fetchImpl!=='function')throw Error('Fetch unavailable: Node 22+ required');
 let requests=0,failed=0;
 const cache=new Map();
 async function api(payload){
  requests++;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(ENDPOINT,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal:controller.signal
   });
   if(!response.ok)throw Error('Lab public catalog returned HTTP '+response.status);
   const text=await response.text();
   if(text.length>2_000_000)throw Error('Unexpectedly large catalog response');
   const json=JSON.parse(text);
   if(json.error)throw Error('Catalog rejected request ('+String(json.error).slice(0,50)+')');
   return json;
  }catch(err){failed++;throw Error('Catalog request failed: '+String(err.message||err).slice(0,120))}
  finally{clearTimeout(timer)}
 }
 async function resolveTitle(title){
  if(cache.has(title))return cache.get(title);
  const data=await api({mode:'search',media:'movie',query:title,page:1});
  const target=normalize(title);
  const item=(data.items||[]).find(x=>normalize(x.title)===target)||null;
  if(item)cache.set(title,item);
  return item;
 }
 function toEntry(item,position){
  const id=Number(item.id);
  return {key:'tmdb-movie-'+id,title:item.title,year:item.year,category:'movies',
   position,synopsis:item.synopsis||'',tmdb:{id,media:'movie'},
   directMatches:(item.matched||[]).map(normalize),collectionId:item.collectionId||null,
   facets:{genres:(item.genres||[]).map(x=>String(x).toLowerCase()),
    themes:[],tones:[],pace:null,directors:[],writers:[],
    narrativeThemes:narrative.extract(item.synopsis||'')}};
 }
 async function features(keys){
  const valid=[...new Set(keys.filter(x=>/^tmdb-movie-[1-9]\d*$/.test(x)))];
  const map=new Map();
  for(let i=0;i<valid.length;i+=12){
   const batch=await api({mode:'taste-features',keys:valid.slice(i,i+12)});
   for(const item of batch.items||[])if(item?.key)map.set(item.key,item);
  }
  return map;
 }
 function enrich(entries,lookup){
  return entries.map(entry=>{
   const f=lookup.get(entry.key);if(!f)return entry;
   return {...entry,collectionId:f.collectionId||entry.collectionId,
    facets:{genres:f.genres||entry.facets.genres,themes:f.themes||[],tones:f.tones||[],
     directors:f.directors||[],writers:f.writers||[],keywordNames:f.keywordNames||[],pace:null,
     narrativeThemes:entry.facets.narrativeThemes||[]}};
  });
 }
 return {api,resolveTitle,toEntry,features,enrich,
  getStats:()=>({requests,failed})};
}
function options(args){
 const opts={profileLimit:2,candidates:30,plans:2,output:null};
 const defs={'--profiles':'profileLimit','--candidates':'candidates','--plans':'plans','--output':'output'};
 if(args.includes('--help'))return {...opts,help:true};
 for(let i=0;i<args.length;i+=2){
  if(!(args[i] in defs)||args[i+1]===undefined)throw Error('Invalid argument '+args[i]);
  opts[defs[args[i]]]=args[i+1];
 }
 for(const key of ['profileLimit','candidates','plans'])opts[key]=Number(opts[key]);
 if(!Number.isInteger(opts.profileLimit)||opts.profileLimit<1||opts.profileLimit>2||
    !Number.isInteger(opts.candidates)||opts.candidates<5||opts.candidates>40||
    !Number.isInteger(opts.plans)||opts.plans<1||opts.plans>2)
  throw Error('Audit limits exceeded (profiles 1–2, candidates 5–40, plans 1–2)');
 return opts;
}
async function execute(config={},settings={}){
 const adapter=makeAdapter(settings);
 const report=await run({...adapter,engine,cinematic,policy,anchorBalance,fingerprint,keywordAudit,
  profiles:PROFILES.slice(0,config.profileLimit||2),
  maxPlans:config.plans||2,maxCandidates:config.candidates||30});
 const result={
  kind:'afterlogue-public-catalog-smoke-v1',researchOnly:true,
  checkedAt:new Date().toISOString(),provider:adapter.getStats(),
  summary:report.summary,
  profiles:report.profiles.map(p=>p.error?
   {profile:p.profile,status:'error',message:p.error}:
   {profile:p.profile,status:'completed',found:p.uniqueRetrieved,
    evaluated:p.evaluatedCandidates,metadataReturned:p.metadataReturned,
    metadataRequested:p.metadataRequested,qualified:p.qualified,
    firstShelfComplete:p.firstShelfComplete,secondShelfComplete:p.secondShelfComplete,
    noEvidence:p.missingEvidenceRejections,lowScore:p.lowScoreRejections,
    extraPlotClueTitles:p.fingerprintExtraPlotTitles,
    potentialNewPlotLinks:p.fingerprintNewPlotLinks,
    rawKeywordLinkedTitles:p.fingerprintRawKeywordLinkedTitles,
    rawKeywordOnlyTitles:p.fingerprintRawKeywordOnlyTitles,
    rawKeywordUnqualifiedTitles:p.fingerprintRawKeywordUnqualifiedTitles,
    specificKeywordLinkedTitles:p.keywordSpecificLinks,
    genericKeywordOnlyTitles:p.keywordGenericOnly,
    multiKeywordLinkedTitles:p.keywordMultiLabel,
    negativeKeywordCollisions:p.keywordNegativeOverlap,
    negativeKeywordAnchors:p.keywordNegativeAnchors,
    unresolvedNegativeControls:p.keywordShadowNegativesUnresolved,
    negativeKeywordLinkedTitles:p.keywordNegativeSpecific,
    negativeOnlyKeywordLinkedTitles:p.keywordNegativeOnly,
    positiveOnlyKeywordLinkedTitles:p.keywordPositiveOnly,
    mixedKeywordEvidenceTitles:p.keywordMixedPositiveNegative,
    differentLabelConflictTitles:p.keywordDifferentLabelConflict,
    qualifiedMixedEvidence:p.keywordQualifiedWithMixedEvidence,
    qualifiedExactConflict:p.keywordQualifiedWithExactConflict,
    qualifiedNegativeOnly:p.keywordQualifiedWithNegativeOnly,
    separateStoryDeviceTitles:p.fingerprintExplicitDeviceTitles,
    withSynopsis:p.fingerprintWithSynopsis,withCreatorCredit:p.fingerprintWithCreatorCredit,
    withMappedKeywords:p.fingerprintWithMappedKeywords,
    withOriginalKeywords:p.fingerprintWithOriginalKeywords,
    withPlotClues:p.fingerprintWithPlotClues,
    qualifiedTitleLinkedOnly:p.qualifiedLinkedOnly,
    evaluatedTitleLinkedOnly:p.evaluatedLinkedOnly,
    qualifiedBrowseOnly:p.qualifiedBrowseOnly,
    evaluatedBrowseOnly:p.evaluatedBrowseOnly,
    bestEvidenceSingle:p.bestEvidenceSingle,
    bestEvidenceMultiple:p.bestEvidenceMultiple,
    metadataCoverage:p.candidateThemes+' themes / '+p.candidateTones+' tones',
    countReconciled:p.candidateAccounting==='reconciled',
    diagnosticHint:p.diagnosticHint
   }),
  caveat:'No human preference labels or real discovery accuracy; only bounded public catalog results and fictional viewing histories.'
 };
 return result;
}
async function main(){
 const args=options(process.argv.slice(2));
 if(args.help){process.stdout.write('Usage: node tests/real-catalog-smoke.cjs [--profiles 2] [--candidates 30] [--plans 2] [--output reports/real-catalog-smoke.json]\n');return}
 const result=await execute(args);
 const serialized=JSON.stringify(result,null,2)+'\n';
 if(args.output){
  const dest=path.resolve(args.output);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,serialized,{mode:0o600});
 }
 process.stdout.write(serialized);
 if(!result.summary.profilesCompleted||
    result.profiles.some(p=>p.status==='completed'&&!p.countReconciled))
  process.exitCode=1;
}
if(require.main===module){main().catch(e=>{console.error('Audit error: '+e.message);process.exitCode=1})}
module.exports={makeAdapter,options,execute,PROFILES};
