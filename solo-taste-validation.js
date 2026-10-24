/* AFTERLOGUE LAB — self-sufficient, one-person taste validation.
 * Derives hypotheses ONLY from that fictional viewer's own rated Log,
 * favorites and existing provider film facets. No community contributions.
 * No network, accounts, persistence, training or production score mutation.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueSoloTasteQA=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const positive=new Set(["Loved","Liked"]);
 const labeled=new Set(["Loved","Liked","Not for me"]);
 function ratingMap(input){
  if(Array.isArray(input))return new Map(input.map(x=>[
   x?.title_key||x?.key,x?.rating]));
  if(input instanceof Map)return new Map(input);
  if(input&&typeof input==="object")return new Map(Object.entries(input).map(
   ([key,x])=>[key,typeof x==="string"?x:x?.rating]));
  return new Map();
 }
 function keyOf(x){return typeof x==="string"?x:x?.title_key||x?.key}
 function deleteKey(source,key){return source.filter(x=>keyOf(x)!==key)}
 function evaluate({engine,entries=[],impressions={},favorites=[],watchlist=[],
  timestamps={},minPositiveAnchors=2,maxRatings=120}={}){
  if(!engine?.buildTasteProfile||!engine?.tasteMatch||
     !Array.isArray(entries)||!Array.isArray(favorites)||!Array.isArray(watchlist)||
     entries.length>700||!(minPositiveAnchors>=2&&minPositiveAnchors<=10))
    throw Error("Invalid individual-only taste evaluation inputs");
  const ratings=ratingMap(impressions),byKey=new Map(entries.map(x=>[x.key,x]));
  const rows=[],reasons={};let missingEntries=0;
  const usable=[...ratings].filter(([key,rate])=>labeled.has(rate));
  if(usable.length>maxRatings)throw Error("Fictional evaluation sample exceeds safe limit");
  const categoryOf=x=>x?.category||"movies";
  for(const [key,rate] of usable){
   const item=byKey.get(key);
   if(!item){missingEntries++;continue}
   const remaining=new Map(ratings);remaining.delete(key);
   // Crucial holdout: remove *all* potential label proxies for the
   // target. Watchlist/favorite flags cannot leak the held-out answer.
   const positiveAnchors=[...remaining].filter(([k,r])=>
    positive.has(r)&&byKey.has(k)&&categoryOf(byKey.get(k))===categoryOf(item));
   const profile=engine.buildTasteProfile({
    entries,impressions:remaining,favorites:deleteKey(favorites,key),
    watchlist:deleteKey(watchlist,key),timestamps});
   const match=engine.tasteMatch(profile,item.facets||{});
   const reason=positiveAnchors.length<minPositiveAnchors?"insufficient-history":
    !match.evidence?.length?"no-supported-facet":"supported";
   if(reason!=="supported")reasons[reason]=(reasons[reason]||0)+1;
   rows.push({category:categoryOf(item),rating:rate,score:match.score,
    scorable:reason==="supported",reason});
  }
  let comparable=0,positiveAboveNegative=0,negativeAbovePositive=0,ties=0;
  const scored=rows.filter(x=>x.scorable);
  for(const good of scored.filter(x=>positive.has(x.rating))){
   for(const bad of scored.filter(x=>x.rating==="Not for me")){
    if(good.category!==bad.category)continue;
    comparable++;
    if(good.score>bad.score+1e-9)positiveAboveNegative++;
    else if(bad.score>good.score+1e-9)negativeAbovePositive++;
    else ties++;
   }
  }
  return Object.freeze({
   historyRated:usable.length,
   filmsWithCatalogRecords:rows.length,missingCatalogRecords:missingEntries,
   testedPositive:rows.filter(x=>positive.has(x.rating)).length,
   testedNegative:rows.filter(x=>x.rating==="Not for me").length,
   scorableHoldouts:scored.length,abstainedHoldouts:rows.length-scored.length,
   abstentionsByReason:reasons,
   comparableHeldoutPairs:comparable,
   positiveHigherThanNegative:positiveAboveNegative,
   negativeHigherThanPositive:negativeAbovePositive,
   sameScorePairs:ties,
   coverageRatio:rows.length?scored.length/rows.length:null,
   scoreOrderingRatio:comparable?positiveAboveNegative/comparable:null,
   caveat:"Retrospective leave-one-rating-out structural diagnostic; not chronological, not human recommendation accuracy. Only the viewer's other explicitly rated films supply taste labels. A small history or missing metadata yields abstention."
  });
 }
 function stability({engine,entries=[],baseline={},additional={},
  favorites=[],watchlist=[],probes=[]}={}){
  if(!engine?.buildTasteProfile||!engine?.tasteMatch||
    !Array.isArray(entries)||!Array.isArray(probes)||probes.length>30)
   throw Error("Invalid individual-only stability inputs");
  const first=ratingMap(baseline),second=ratingMap(additional);
  const merged=new Map(first);
  for(const [key,rating] of second)merged.set(key,rating);
  const base=engine.buildTasteProfile({entries,impressions:first,favorites,watchlist}),
   expanded=engine.buildTasteProfile({entries,impressions:merged,favorites,watchlist});
  const byKey=new Map(entries.map(x=>[x.key,x]));
  const scores=[];
  for(const probe of probes){
   const item=byKey.get(probe);
   if(!item)continue;
   // Only score unlogged candidates so the probe doesn't leak its rating.
   if(merged.has(probe)||first.has(probe))continue;
   const before=engine.tasteMatch(base,item.facets||{});
   const after=engine.tasteMatch(expanded,item.facets||{});
   scores.push({before:before.score,after:after.score,delta:after.score-before.score,
    beforeEvidence:before.evidence.length,afterEvidence:after.evidence.length});
  }
  return Object.freeze({
   originalRated:first.size,additionalRated:second.size,
   afterRated:merged.size,unratedProbeCount:scores.length,
   probesWithPreviousEvidence:scores.filter(x=>x.beforeEvidence>0).length,
   previouslySupportedProbesStillSupported:scores.filter(x=>
    x.beforeEvidence>0&&x.afterEvidence>0).length,
   previouslySupportedProbesWithNondecreasingScore:scores.filter(x=>
    x.beforeEvidence>0&&x.after>=x.before-1e-9).length,
   previouslySupportedProbesWithDecreasingScore:scores.filter(x=>
    x.beforeEvidence>0&&x.after<x.before-1e-9).length,
   maxExistingProbeScoreDecrease:scores.filter(x=>x.beforeEvidence>0)
    .reduce((max,x)=>Math.max(max,x.before-x.after),0),
   caveat:"Simulated explicit Log updates measure score stability, not recommendation quality or an actual member's viewing behavior. No community, editorials or tag contributions are used."
  });
 }
 return Object.freeze({evaluate,stability});
});
