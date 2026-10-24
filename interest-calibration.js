/* Afterlogue Lab — session-only interest calibration.
 * Film attraction is NOT a watched rating, and AUC here is descriptive QA only.
 * No external service, private account, or persistent profile access. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.AfterlogueInterestCalibration=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const asMap=x=>x instanceof Map?x:new Map(Array.isArray(x)?x:Object.entries(x||{}));
 function summarize({scores=new Map(),attraction=new Map(),newDiscovery=new Map(),familiarity=new Map(),watchIntent=new Map()}={}){
  const scored=asMap(scores),reactions=asMap(attraction),
   novel=asMap(newDiscovery),known=asMap(familiarity),watch=asMap(watchIntent);
  const positive=[],negative=[];
  let unavailableScore=0;
  for(const [key,choice] of reactions){
   if(choice!=='interested'&&choice!=='pass')continue;
   const value=Number(scored.get(key));
   if(!scored.has(key)||!Number.isFinite(value)){unavailableScore++;continue}
   (choice==='interested'?positive:negative).push({key,score:value});
  }
  const mean=values=>values.length?values.reduce((total,x)=>total+x.score,0)/values.length:null;
  let auc=null;
  if(positive.length&&negative.length){
   let total=0;
   for(const a of positive)for(const b of negative)
    total+=a.score>b.score?1:a.score===b.score?.5:0;
   auc=total/(positive.length*negative.length);
  }
  const interestedNew=positive.filter(x=>novel.get(x.key)===true&&known.get(x.key)!==true).length;
  const interestedWouldWatch=positive.filter(x=>watch.get(x.key)===true).length;
  return {
   interested:positive.length,passed:negative.length,labeled:positive.length+negative.length,
   scoreUnavailable:unavailableScore,meanInterested:mean(positive),meanPassed:mean(negative),
   pairwiseAuc:auc,knownOfLabeled:[...positive,...negative].filter(x=>known.get(x.key)===true).length,
   confirmedNewInterested:interestedNew,interestedWouldWatch,
   interpretation:auc===null?'not_enough_comparable_reactions':
    positive.length+negative.length<12?'small_sample':
    auc<=.5?'scores_not_discriminating':'directional_only',
   caution:'Only voluntary lab attraction responses. Pairwise AUC is descriptive, not statistically validated; no causation, movie enjoyment, or unknown-title conversion is inferred.'
  };
 }
 return Object.freeze({summarize});
});
