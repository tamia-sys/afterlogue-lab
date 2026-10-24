/* AFTERLOGUE LAB — shadow-only multi-session taste rotation.
 * Reorders EXISTING eligible, already-ranked films. Does not score, filter,
 * read community tags, infer unknown genres or modify any production files.
 * First five stay byte-for-byte the same recommendation objects and order.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueShelfRotation=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const positive=new Set(["Loved","Liked"]);
 const ratingMap=x=>x instanceof Map?new Map([...x].map(([k,r])=>[k,typeof r==="string"?r:r?.rating])):
  new Map(Object.entries(x||{}).map(([k,r])=>[k,typeof r==="string"?r:r?.rating]));
 const keyOf=x=>typeof x==="string"?x:x?.title_key||x?.key;
 function plan({engine,eligible=[],profileEntries=[],impressions={},category="movies",
  favorites=[],shown=[],decided=[],watchlist=[],seen=[],rounds=3,size=5,
  minScoreRatio=.8,maxLookAhead=40}={}){
  if(!engine?.balanceShelves||!engine?.storyLane||!Array.isArray(eligible)||
     !Array.isArray(profileEntries)||!Array.isArray(favorites)||
     ![shown,decided,watchlist,seen].every(Array.isArray)||
     !Number.isInteger(rounds)||rounds<1||rounds>5||
     !Number.isInteger(size)||size<1||size>10||
     !(minScoreRatio>=.75&&minScoreRatio<=1)||
     !Number.isInteger(maxLookAhead)||maxLookAhead<5||maxLookAhead>100)
   throw Error("Invalid bounded shelf-rotation inputs");
  const ratings=ratingMap(impressions);
  const sources=new Map(profileEntries.filter(x=>x&&x.key).map(x=>[x.key,x]));
  const excluded=new Set([...ratings.keys(),...shown.map(keyOf),...decided.map(keyOf),
   ...watchlist.map(keyOf),...seen.map(keyOf)]);
  const clean=eligible.filter(x=>x&&typeof x.key==="string"&&x.category===category&&
   !excluded.has(x.key)&&Number(x.score)>0);
  const cleanUnique=[...new Map(clean.map(x=>[x.key,x])).values()];
  const ordered=engine.balanceShelves({entries:cleanUnique,profileEntries,
   impressions,favorites,category,size});
  const total=Math.min(ordered.length,rounds*size);
  const positiveLanes=new Set([...ratings].filter(([,r])=>positive.has(r))
   .map(([key])=>sources.get(key)).filter(x=>x?.category===category)
   .map(x=>engine.storyLane(x)).filter(Boolean));
  const supportedLanes=new Set(ordered.map(x=>engine.storyLane(x))
   .filter(x=>x&&positiveLanes.has(x)));
  const rotate=supportedLanes.size>=3;
  const selected=[],remaining=[...ordered],counts=new Map(),promotions=[];
  const matchesOwnLane=item=>{
   const lane=engine.storyLane(item);
   return !!lane&&supportedLanes.has(lane)&&
    (item.matched||[]).some(m=>{
     const sourceKey=m?.source?.key;
     return positive.has(ratings.get(sourceKey))&&
      engine.storyLane(sources.get(sourceKey))===lane&&
      Number(m?.strength)>0;
    });
  };
  while(selected.length<total&&remaining.length){
   const slot=selected.length,round=Math.floor(slot/size),within=slot%size;
   const base=remaining[0];
   let pick=base;
   if(rotate&&round>=1){
    const tally=Object.fromEntries([...supportedLanes].map(l=>[l,counts.get(l)||0]));
    const leaderLane=engine.storyLane(base);
    const maxCount=Math.max(...Object.values(tally));
    const candidates=remaining.slice(1,maxLookAhead+1).filter(candidate=>{
     const lane=engine.storyLane(candidate);
     if(!lane||!supportedLanes.has(lane)||!matchesOwnLane(candidate))return false;
     if((tally[lane]||0)>=maxCount)return false;
     if(Number(candidate.score)<Number(base.score)*minScoreRatio)return false;
     // Never leapfrog an ineligible / materially weaker film for appearance.
     // A candidate with the same lane as the leader has no coverage value.
     return lane!==leaderLane;
    });
    if(candidates.length){
     candidates.sort((a,b)=>{
      const deficit=(x)=>maxCount-(tally[engine.storyLane(x)]||0);
      return deficit(b)-deficit(a)||Number(b.score)-Number(a.score)||
       remaining.indexOf(a)-remaining.indexOf(b);
     });
     // At most two "coverage" promotions in each later five-card shelf.
     const used=promotions.filter(p=>p.round===round).length;
     if(used<2){
      pick=candidates[0];
      promotions.push({round,position:within,
       scoreFloor:Math.max(0,Number(base.score))*minScoreRatio,
       chosenScore:Number(pick.score),eligibleAt:remaining.indexOf(pick)});
     }
    }
   }
   remaining.splice(remaining.indexOf(pick),1);
   selected.push(pick);
   const lane=engine.storyLane(pick);
   if(lane)counts.set(lane,(counts.get(lane)||0)+1);
  }
  const baseline=ordered.slice(0,total);
  const calculate=items=>{
   const lanes=new Set(items.map(x=>engine.storyLane(x))
    .filter(x=>supportedLanes.has(x)));
   return {titles:items.length,recognizedTasteLanes:lanes.size,
    withPositiveScore:items.filter(x=>Number(x.score)>0).length};
  };
  const shelves=Array.from({length:Math.ceil(total/size)},(_,i)=>{
   const base=baseline.slice(i*size,(i+1)*size),
    shadow=selected.slice(i*size,(i+1)*size);
   const laneCount=xs=>Object.fromEntries([...new Map(
    [...supportedLanes].map(l=>[l,xs.filter(x=>engine.storyLane(x)===l).length])
   )].filter(([,n])=>n>0).sort(([a],[b])=>a.localeCompare(b)));
   return {
    round:i+1,baseline:laneCount(base),shadow:laneCount(shadow),
    baselineMeanScore:base.length?base.reduce((n,x)=>n+Number(x.score),0)/base.length:null,
    shadowMeanScore:shadow.length?shadow.reduce((n,x)=>n+Number(x.score),0)/shadow.length:null,
    promotions:promotions.filter(p=>p.round===i).length
   };
  });
  return {
   // Candidate arrays are for in-memory test assertions only. Do not publish.
   baseline,shadow:selected,
   aggregate:{
    rounds:shelves.length,size,eligiblePool:ordered.length,
    availableSupportedLanes:supportedLanes.size,
    rotationEnabled:rotate,
    currentFirstShelfIdentical:baseline.slice(0,size).every((item,i)=>item===selected[i]),
    baselineCoverage:calculate(baseline),
    shadowCoverage:calculate(selected),
    promotions:promotions.length,
    noRepeatKeys:selected.length===new Set(selected.map(x=>x.key)).size,
    scoreFloorPreserved:promotions.every(p=>
     Number.isFinite(p.scoreFloor)&&p.chosenScore+1e-9>=p.scoreFloor),
    shelves,
    caveat:"Research-only rearrangement within an existing qualified catalog. No new scores or verified audience response; 'genre lanes' are broad proxy groupings, not objective cinematic identity."
   }
  };
 }
 return Object.freeze({plan});
});
