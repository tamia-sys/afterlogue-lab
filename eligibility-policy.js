/* Afterlogue Recommendation Lab — pure, testable shelf eligibility policy.
 * No network calls, storage, user accounts, or production dependencies. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueEligibility=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 function eligible(items,opts={}){
  const rated=new Set(opts.ratedKeys||[]);
  const shown=new Set(opts.shownKeys||[]);
  const decided=new Set(opts.decidedKeys||[]);
  const allowed=opts.allowedKeys==null?null:new Set(opts.allowedKeys);
  const unique=new Set();
  const result=[];
  for(const item of items||[]){
   if(!item||typeof item.key!=="string"||!item.key||unique.has(item.key))continue;
   unique.add(item.key);
   if(rated.has(item.key)||shown.has(item.key)||decided.has(item.key))continue;
   if(allowed&&!allowed.has(item.key))continue;
   if(!(Number(item.score)>0)||item.personalized!==true||!Array.isArray(item.matched)||!item.matched.length)continue;
   if(!(Number(item.cinematicSignalCount)>=1))continue;
   result.push(item);
  }
  return result;
 }
 function shelf(items,opts={}){
  const n=Number.isFinite(opts.size)?Math.max(0,Math.min(10,Math.floor(opts.size))):5;
  return eligible(items,opts).slice(0,n);
 }
 return Object.freeze({eligible,shelf});
});
