/* Afterlogue Lab v2 — pure cinematic taste scorer.
 * No network, account state, browser globals, or generative AI. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueTasteV2=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const broad=new Set(["identity","family","control","belonging","survival","love","friendship","loss","growing-up","drama","relationships","coming-of-age"]);
 // Treat weakly sourced catalog traits as hints, not definitive taste evidence.
 const hasEvidence=(x)=>Array.isArray(x)&&x.length>0;
 const overlap=(a,b)=>(a||[]).filter(v=>(b||[]).includes(v));
 function compare(candidate,source,rating="Loved"){
  const f=candidate.facets||{},g=source.facets||{};
  const tones=overlap(f.tones,g.tones);
  const themes=overlap(f.themes,g.themes).filter(x=>!broad.has(String(x).toLowerCase()));
  const directors=overlap(f.directors,g.directors);
  const writers=overlap(f.writers,g.writers);
  const pace=Boolean(f.pace&&g.pace&&f.pace===g.pace);
  const types=Number(hasEvidence(tones))+Number(hasEvidence(themes))+Number(directors.length+writers.length>0)+Number(pace);
  const score=Math.min(2,tones.length)*1.8+Math.min(2,themes.length)*1.5+
   Math.min(1,directors.length)*2+Math.min(1,writers.length)*1.2+(pace?1:0)+(types>=2?1.1:0);
  const details=[...directors.slice(0,1).map(x=>({type:"director",value:x})),
   ...writers.slice(0,1).map(x=>({type:"writer",value:x})),
   ...tones.slice(0,2).map(x=>({type:"tone",value:x})),
   ...themes.slice(0,2).map(x=>({type:"specific_theme",value:x})),
   ...(pace?[{type:"pacing",value:f.pace}]:[])];
  return {source:source.title,score,types,details,weight:rating==="Loved"?1:.78};
 }
 function rank(entries,profileEntries,ratingSignals){
  const positives=profileEntries.filter(x=>["Loved","Liked"].includes(ratingSignals[x.key]));
  const negatives=profileEntries.filter(x=>ratingSignals[x.key]==="Not for me");
  return entries.map(item=>{
   const matches=positives.map(x=>compare(item,x,ratingSignals[x.key])).filter(x=>x.types>0)
    .sort((a,b)=>b.score*b.weight-a.score*a.weight);
   const dislikes=negatives.map(x=>compare(item,x,"Loved")).filter(x=>x.types>0)
    .sort((a,b)=>b.score-a.score);
   const best=matches[0]||{score:0,types:0,details:[],weight:1};
   const evidenceTypes=new Set(matches.flatMap(m=>m.details.map(d=>d.type)));
   const evidence=matches.slice(0,4).reduce((total,m,i)=>
    total+Math.min(6,m.score)*m.weight*[.75,.24,.12,.06][i],0);
   const negativePenalty=dislikes.slice(0,2).reduce((total,m,i)=>
    total+Math.min(6,m.score)*[.58,.18][i],0);
   const adjustment=!matches.length
    ?-Math.max(12,item.score*.75)-Math.min(4,negativePenalty)
    :Math.max(-9,Math.min(7,evidence-negativePenalty+Math.min(1.4,(matches.length-1)*.45)));
   const explanation=matches.length?
    "Catalog evidence from your Log: "+matches.slice(0,2).map(m=>m.source+" ("+
     m.details.slice(0,2).map(d=>d.type.replace(/_/g," ")+" — "+d.value).join("; ")+")").join("; ")+
     (matches.length>2?"; plus "+(matches.length-2)+" other positive Log matches":"")+"."
    :"No verified cinematic connection found in the catalog.";
   return {...item,score:item.score+adjustment,cinematicEvidence:evidence,
    cinematicMetadata:evidenceTypes.size>=2?"specific":"partial",
    cinematicSignalCount:best.types,cinematicExplanation:explanation,
    cinematicEvidenceDetails:best.details,cinematicAnchor:best.types?best.source:null,
    cinematicAnchorCount:matches.length,cinematicEvidenceTypes:[...evidenceTypes],
    cinematicNegativePenalty:negativePenalty};
  }).sort((a,b)=>b.score-a.score);
 }
 function feedbackSimilarity(a={},b={}){
  return overlap(a.themes,b.themes)*1.4+overlap(a.tones,b.tones)*1.4+
   overlap(a.genres,b.genres)*.3+overlap(a.directors,b.directors)*1.5;
 }
 return Object.freeze({rank,compare,feedbackSimilarity});
});
