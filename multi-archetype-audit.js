/* AFTERLOGUE LAB — multi-archetype, Log-only recommendation QA.
 * Designed to expose echo chambers and overcorrection, not to decide what
 * viewers should like. All histories and film traits supplied by test.
 * This reads the EXISTING ranking, policy and balancing unchanged.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueArchetypeAudit=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const positive=new Set(["Loved","Liked"]);
 const ratings=new Set(["Loved","Liked","Okay","Not for me"]);
 const asRatings=input=>input instanceof Map?
    [...input].map(([k,v])=>[k,typeof v==="string"?v:v?.rating]):
    Array.isArray(input)?input.map(r=>[r?.key||r?.title_key,r?.rating]):
    Object.entries(input||{}).map(([k,v])=>[k,typeof v==="string"?v:v?.rating]);
 const keyOf=x=>typeof x==="string"?x:x?.title_key||x?.key;
 function analyze({engine,policy,entries=[],profiles=[],size=5}={}){
  if(!engine?.rank||!engine?.balanceShelves||!engine?.storyLane||
   !policy?.eligible||!Array.isArray(entries)||!Array.isArray(profiles)||
   entries.length>600||profiles.length>12||!Number.isInteger(size)||size<1||size>10)
   throw Error("Invalid bounded multi-archetype audit inputs");
  const byKey=new Map(entries.map(x=>[x.key,x]));
  if(byKey.size!==entries.length||entries.some(x=>typeof x?.key!=="string"||!x.key||
    !["movies","tv"].includes(x.category)))
   throw Error("Expected unique category-labelled test film keys");
  const output=[];
  for(const profile of profiles){
   if(!profile||typeof profile.name!=="string"||!profile.name||
      !["movies","tv"].includes(profile.category)||!Array.isArray(profile.seen||[])||
      !Array.isArray(profile.favorites||[])||!Array.isArray(profile.watchlist||[]))
    throw Error("Invalid fictional viewer scenario");
   const rated=asRatings(profile.impressions);
   if(rated.length>120||rated.some(([key,rate])=>!byKey.has(key)||!ratings.has(rate)))
    throw Error("Unknown film or rating in fictional scenario");
   const pos=rated.filter(([,r])=>positive.has(r));
   const likedLanes=new Set(pos.map(([key])=>engine.storyLane(byKey.get(key))).filter(Boolean));
   // A film's catalog facets are given by the fictional fixture.
   // Community/editorial tags cannot enter through this API.
   const raw=engine.rank({entries,category:profile.category,
    impressions:Object.fromEntries(rated),
    favorites:profile.favorites,watchlist:profile.watchlist,seen:profile.seen,
    timestamps:profile.timestamps||{}});
   const eligible=policy.eligible(raw,{ratedKeys:rated.map(([k])=>k),
    shownKeys:(profile.shown||[]),decidedKeys:(profile.decided||[])});
   const balanced=engine.balanceShelves({entries:eligible,profileEntries:entries,
    impressions:Object.fromEntries(rated),favorites:profile.favorites,
    category:profile.category,size});
   const first=balanced.slice(0,size);
   const lanes=first.map(x=>engine.storyLane(x)||"unknown");
   const counts=new Map();
   for(const lane of lanes)counts.set(lane,(counts.get(lane)||0)+1);
   const eligibleLanes=new Set(eligible.map(x=>engine.storyLane(x)).filter(Boolean));
   const possible=[...likedLanes].filter(x=>eligibleLanes.has(x));
   const represented=possible.filter(x=>lanes.includes(x));
   const positiveScores=first.filter(x=>Number(x.score)>0);
   const unlike=new Set(rated.filter(([,r])=>r==="Not for me").map(([key])=>key));
   const exposed=new Set([...rated.map(([key])=>key),...(profile.shown||[]),
    ...(profile.decided||[]),...(profile.seen||[]).map(keyOf),
    ...(profile.watchlist||[]).map(keyOf)]);
   output.push({
    profile:profile.name,historyRated:rated.length,historyPositive:pos.length,
    historyNegative:unlike.size,supportedTasteLanes:likedLanes.size,
    candidatePool:raw.length,qualifiedPool:eligible.length,shelfSize:first.length,
    uniqueShelfLanes:counts.size,
    topShelfDominance:first.length?Math.max(...counts.values())/first.length:null,
    eligibleSupportedLanes:possible.length,representedSupportedLanes:represented.length,
    representedRate:possible.length?represented.length/possible.length:null,
    positiveScoreCount:positiveScores.length,
    sourceOverlapViolations:first.filter(x=>exposed.has(x.key)).length,
    duplicateShelfViolations:first.length-new Set(first.map(x=>x.key)).size,
    shelfGenreCounts:Object.fromEntries([...counts].sort(([a],[b])=>a.localeCompare(b))),
    caveat:"Synthetic candidate supply and invented Logs. Coverage and shelf diversity do not measure human enjoyment or externally verified film style."
   });
  }
  const names=new Set(output.map(x=>x.profile));
  if(names.size!==output.length)throw Error("Fictional scenario names must be distinct");
  return Object.freeze({
   scenarioCount:output.length,profiles:output,
   casesWithEmptyShelf:output.filter(x=>x.shelfSize===0).length,
   casesWithHighConcentration:output.filter(x=>x.shelfSize>=size&&x.topShelfDominance>=.8).length,
   casesWithRepeatLeaks:output.filter(x=>x.sourceOverlapViolations||x.duplicateShelfViolations).length,
   note:"Structural stress test of unchanged recommendation-engine and eligibility policy. No community tag, editorial observations, user Log or actual accuracy data is read."
  });
 }
 return Object.freeze({analyze});
});
