/* Lab-only anchor diversity. Reorders comparable titles; never inserts films. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueAnchorBalance=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 function balance(entries,width=5){
  const remaining=[...(entries||[])],result=[],counts=new Map();
  if(new Set(remaining.map(x=>x.cinematicAnchor).filter(Boolean)).size<3)return remaining;
  while(remaining.length){
   const leader=remaining[0];
   let index=0;
   if(leader.cinematicAnchor&&(counts.get(leader.cinematicAnchor)||0)>=2){
    const minimum=Math.max(8,Number(leader.score||0)*.83);
    const alternative=remaining.findIndex((x,i)=>i>0&&x.cinematicAnchor&&
     (counts.get(x.cinematicAnchor)||0)<2&&Number(x.score)>=minimum&&
     Number(x.cinematicSignalCount)>=1);
    if(alternative>0)index=alternative;
   }
   const next=remaining.splice(index,1)[0];
   result.push(next);
   if(next.cinematicAnchor)counts.set(next.cinematicAnchor,(counts.get(next.cinematicAnchor)||0)+1);
   if(result.length%Math.max(1,width)===0)counts.clear();
  }
  return result;
 }
 return Object.freeze({balance});
});
