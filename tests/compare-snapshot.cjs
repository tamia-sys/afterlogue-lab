"use strict";
// Run: node tests/compare-snapshot.cjs ./afterlogue-lab-v2-1-0-0.json
// Uses identical public candidate data for both ranking variants.
const fs=require("node:fs");
const path=require("node:path");
const v2=require("../taste-model-v2.js");
const policy=require("../eligibility-policy.js");
const anchorBalance=require("../evidence-balance.js");
require("../recommendation-engine.js");
const engine=globalThis.AfterlogueRecommendationEngine;
const file=process.argv[2];
if(!file){console.error("Usage: node tests/compare-snapshot.cjs snapshot.json");process.exit(2)}
const data=JSON.parse(fs.readFileSync(path.resolve(file),"utf8"));
if(data.format!=="afterlogue-lab-diagnostic-v1"||!Array.isArray(data.items)){
 throw Error("Not a recognized fictional lab snapshot");
}
const entries=data.items.map(x=>({...x,facets:x.facets||{},directMatches:x.directMatches||[]}));
const ratings=Object.fromEntries(entries.filter(x=>x.rating).map(x=>[x.key,x.rating]));
const ratedKeys=Object.keys(ratings);
function run(withSynopsis){
 const source=withSynopsis?entries:entries.map(x=>({
  ...x,facets:{...x.facets,narrativeThemes:[]}
 }));
 const baseline=engine.rank({entries:source,category:"movies",impressions:ratings});
 const scored=v2.rank(baseline,source,ratings);
 const eligible=withSynopsis?policy.eligible(scored,{ratedKeys}):
  scored.filter(x=>!ratings[x.key]&&x.score>0&&x.personalized===true&&
   x.matched?.length&&x.cinematicSignalCount>=1);
 const balanced=engine.balanceShelves({
  entries:eligible,profileEntries:source,impressions:ratings,category:"movies",size:5
 });
 const ordered=withSynopsis?anchorBalance.balance(balanced,5):balanced;
 const top=ordered.slice(0,5);
 return {
  qualified:eligible.length,
  synopsisOnly:eligible.filter(x=>x.cinematicSynopsisOnly).length,
  multipleKinds:eligible.filter(x=>x.cinematicEvidenceKindCount>=2).length,
  uniqueTopAnchors:new Set(top.map(x=>x.cinematicAnchor).filter(Boolean)).size,
  topFive:top.map(x=>({title:x.title,year:x.year,anchor:x.cinematicAnchor,
   signalKinds:x.cinematicEvidenceKindCount,plotClueOnly:x.cinematicSynopsisOnly,
   explanation:x.cinematicExplanation}))
 };
}
const old=run(false),current=run(true);
const result={
 persona:data.persona,phase:data.phase,candidates:entries.filter(x=>!x.rating).length,
 synopsisCoverage:entries.filter(x=>x.facets.narrativeThemes?.length).length,
 catalogOnly:old,synopsisPrototype:current,
 topFiveOverlap:current.topFive.filter(x=>old.topFive.some(y=>y.title===x.title&&y.year===x.year)).length,
 note:"Structural comparison only. Human watch-interest must be assessed separately."
};
console.log(JSON.stringify(result,null,2));
