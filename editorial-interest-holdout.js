/* AFTERLOGUE LAB — blind, holdout interest-hypothesis audit (offline only).
 * No training, scoring changes, TMDB features, inferred film style or PII.
 * Predict evidence-based "might interest" hypotheses BEFORE inspecting votes.
 * Never equate "not drawn to it" with actual disliked viewing experience.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueInterestHoldout=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const validAnchors=new Set(["Loved","Liked","Not for me"]);
 const validVotes=new Set(["Interested","Not drawn to it","Unsure"]);
 const error=reason=>({ready:false,reason});
 function evaluate({consensus,anchors=[],targets=[]}={}){
  if(!consensus?.ready||!Array.isArray(consensus.films))
   return error("independent-film-observations-unavailable");
  if(!Array.isArray(anchors)||!Array.isArray(targets)||
     anchors.length>12||targets.length>12||anchors.length<2)
   return error("invalid-heldout-design");
  const filmMap=new Map(consensus.films.map(x=>[x.key,x]));
  const seen=new Set(),good=[],bad=[];
  for(const anchor of anchors){
   if(!anchor||typeof anchor.key!=="string"||
      !validAnchors.has(anchor.impression)||seen.has(anchor.key)||
      !filmMap.has(anchor.key))return error("unknown-or-duplicate-anchor");
   seen.add(anchor.key);
   const f=filmMap.get(anchor.key);
   (anchor.impression==="Not for me"?bad:good).push(f);
  }
  if(!good.length||!bad.length)return error("requires-positive-and-negative-anchors");
  const heldout=new Set(),sample=[];
  for(const target of targets){
   if(!target||typeof target.key!=="string"||!validVotes.has(target.interest)||
      seen.has(target.key)||heldout.has(target.key)||!filmMap.has(target.key))
    return error("target-leakage-or-invalid-vote");
   heldout.add(target.key);
   sample.push(target.key);
  }
  // The actual viewer's vote is deliberately NOT read during prediction.
  // Each comparison requires at least two reviewer-agreed common dimensions.
  const similarity=(target,anchor)=>{
   const fields=Object.keys(target.agreed||{}).filter(f=>anchor.agreed?.[f]);
   if(fields.length<2)return null;
   const matched=fields.filter(f=>target.agreed[f]===anchor.agreed[f]).length;
   return {matched,common:fields.length,ratio:matched/fields.length};
  };
  const best=(target,group)=>{
   const scores=group.map(x=>similarity(target,x)).filter(Boolean)
    .sort((a,b)=>b.ratio-a.ratio||b.matched-a.matched||b.common-a.common);
   return scores[0]||null;
  };
  const predictions=sample.map(key=>{
   const target=filmMap.get(key);
   if(!target.usable)return {hypothesis:false,why:"insufficient-target-observations"};
   const pos=best(target,good),neg=best(target,bad);
   if(!pos||!neg)return {hypothesis:false,why:"insufficient-comparable-anchors"};
   if(pos.ratio<=neg.ratio+.1)return {hypothesis:false,why:"mixed-or-negative-evidence"};
   if(pos.matched<2||pos.ratio<.75)
    return {hypothesis:false,why:"weak-positive-evidence"};
   return {hypothesis:true,why:"supported-hypothesis"};
  });
  let made=0,matchedInterest=0,notDrawn=0,unknownVotes=0;
  const abstainedByReason={};
  predictions.forEach((p,index)=>{
   if(!p.hypothesis){abstainedByReason[p.why]=(abstainedByReason[p.why]||0)+1;return}
   made++;
   // Response inspected only AFTER the hypothesis is fixed.
   const vote=targets[index].interest;
   if(vote==="Interested")matchedInterest++;
   else if(vote==="Not drawn to it")notDrawn++;
   else unknownVotes++;
  });
  return {ready:true,holdoutTargets:sample.length,
   positiveAnchors:good.length,negativeAnchors:bad.length,
   hypothesesMade:made,abstentions:sample.length-made,
   hypotheticalInterestVotes:matchedInterest,
   hypotheticalNotDrawnVotes:notDrawn,unscoredUnsureVotes:unknownVotes,
   abstentionsByReason:abstainedByReason,
   evaluationStatus:"exploratory-not-validated",
   caveat:"One hypothetical interest decision is not actual viewing enjoyment. No accuracy statistic: this is a tiny, selected study with editorial ratings and self-reported votes. No catalog film labels, reviewer identities, or votes per film are published."
  };
 }
 return Object.freeze({evaluate});
});
