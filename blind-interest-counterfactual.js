/* AFTERLOGUE LAB — blind simulated-interest audit, shadow-only.
 * The frozen ranking/rotation plan MUST be constructed without votes.
 * Only then compare separately authored hypothetical interest outcomes.
 * Not evidence of actual enjoyment, training or production acceptance.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueBlindInterestAudit=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VALID=new Set(["Interested","Not drawn to it","Unsure"]);
 function readVotes(votes){
  const entries=votes instanceof Map?[...votes]:Array.isArray(votes)?
   votes.map(x=>[x?.key,x?.interest]):Object.entries(votes||{});
  if(entries.length>200)throw Error("Too many hypothetical target votes");
  const m=new Map();
  for(const [key,interest] of entries){
   if(typeof key!=="string"||!key||m.has(key)||!VALID.has(interest))
    throw Error("Duplicate, unknown or invalid heldout interest vote");
   m.set(key,interest);
  }
  return m;
 }
 function compare({plan,votes={},size=5,minObserved=8}={}){
  if(!plan||!Array.isArray(plan.baseline)||!Array.isArray(plan.shadow)||
   !Number.isInteger(size)||size<1||size>10||!Number.isInteger(minObserved)||
   minObserved<1||minObserved>50)throw Error("Invalid frozen shelf plan");
  const original=plan.baseline,shadow=plan.shadow,observed=readVotes(votes);
  if(original.length!==shadow.length||original.length>50)throw Error("Noncomparable shelf sizes");
  const keys=items=>items.map(x=>x?.key);
  const oldKeys=keys(original),newKeys=keys(shadow);
  if([...oldKeys,...newKeys].some(x=>typeof x!=="string"||!x))throw Error("Missing film identifiers");
  if(new Set(oldKeys).size!==oldKeys.length||new Set(newKeys).size!==newKeys.length)
   throw Error("Duplicated titles in a shelf plan");
  const firstSize=Math.min(size,original.length);
  if(original.slice(0,firstSize).some((x,i)=>x.key!==shadow[i].key))
   throw Error("First shelf must stay unchanged");
  const count=items=>{
   let interested=0,notDrawn=0,unsure=0,missing=0;
   for(const item of items){
    const vote=observed.get(item.key);
    if(vote==="Interested")interested++;
    else if(vote==="Not drawn to it")notDrawn++;
    else if(vote==="Unsure")unsure++;
    else missing++;
   }
   const labeled=interested+notDrawn, net=interested-notDrawn;
   return {shown:items.length,interested,notDrawn,unsure,unobserved:missing,
    decisiveVotes:labeled,netPreference:net,
    // An undecided voter is NOT an implicit negative. Full worst/best
    // bounds are intentionally wide when the test coverage is sparse.
    minPossibleNet:net-missing-unsure,maxPossibleNet:net+missing+unsure};
  };
  const leftSet=new Set(oldKeys),rightSet=new Set(newKeys);
  const added=shadow.filter(x=>!leftSet.has(x.key));
  const displaced=original.filter(x=>!rightSet.has(x.key));
  if(added.length!==displaced.length)throw Error("Counterfactual swap sizes differ");
  const baseline=count(original),rotated=count(shadow);
  const addedResults=count(added),displacedResults=count(displaced);
  const labeledSwaps=addedResults.decisiveVotes===added.length&&
   displacedResults.decisiveVotes===displaced.length;
  const delta=addedResults.netPreference-displacedResults.netPreference;
  const minimumSwapNet=addedResults.minPossibleNet-displacedResults.maxPossibleNet;
  const maximumSwapNet=addedResults.maxPossibleNet-displacedResults.minPossibleNet;
  // Pairwise preference difference is exactly determined only if every
  // replacement and displaced item had a decisive fictional vote.
  const verdict=added.length===0?"identical":
   !labeledSwaps||baseline.decisiveVotes<minObserved||rotated.decisiveVotes<minObserved?
   "insufficient-heldout-evidence":
   delta>0?"simulated-benefit":delta<0?"simulated-harm":"simulated-tie";
  const roundSummaries=Array.from({length:Math.ceil(original.length/size)},(_,i)=>({
   round:i+1,baseline:count(original.slice(i*size,(i+1)*size)),
   rotated:count(shadow.slice(i*size,(i+1)*size))
  }));
  return Object.freeze({
   format:"afterlogue-synthetic-interest-counterfactual-v1",
   shelfSize:size,shownTitles:original.length,addedTitles:added.length,
   displacedTitles:displaced.length,
   baseline,rotated,addedResults,displacedResults,roundSummaries,
   swapNetDifference:labeledSwaps?delta:null,
   swapNetPossibleRange:{minimum:minimumSwapNet,maximum:maximumSwapNet},
   verdict,minimumDecisiveVotes:minObserved,
   releaseReadiness:"NOT_VALIDATED_FOR_PRODUCTION",
   note:"Fictional prospective-interest votes ONLY, authored separately from film ranker. Missing/Unsure is never a dislike. It is not accuracy, human preference, watched enjoyment, or evidence for production score changes. Aggregate only; no per-film outcomes are returned."
  });
 }
 return Object.freeze({compare});
});
