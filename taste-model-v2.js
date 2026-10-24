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
  // Plot-description clues are weaker than verified catalog facets.
  // Cross-source matching is allowed, but never label it a verified style.
  const candidateTopics=[...new Set([...(f.themes||[]),...(f.narrativeThemes||[])])];
  const sourceTopics=[...new Set([...(g.themes||[]),...(g.narrativeThemes||[])])];
  const synopsisTopics=overlap(candidateTopics,sourceTopics)
   .filter(x=>!broad.has(String(x).toLowerCase())&&!themes.includes(x))
   .filter(x=>(f.narrativeThemes||[]).includes(x)||(g.narrativeThemes||[]).includes(x));
  const directors=overlap(f.directors,g.directors);
  const writers=overlap(f.writers,g.writers);
  const pace=Boolean(f.pace&&g.pace&&f.pace===g.pace);
  const types=Number(hasEvidence(tones))+Number(hasEvidence(themes)||hasEvidence(synopsisTopics))+Number(directors.length+writers.length>0)+Number(pace);
  const score=Math.min(2,tones.length)*1.8+Math.min(2,themes.length)*1.5+
   Math.min(1,directors.length)*2+Math.min(1,writers.length)*1.2+
   Math.min(2,synopsisTopics.length)*.95+(pace?1:0)+(types>=2?1.1:0);
  const details=[...directors.slice(0,1).map(x=>({type:"director",value:x})),
   ...writers.slice(0,1).map(x=>({type:"writer",value:x})),
   ...tones.slice(0,2).map(x=>({type:"tone",value:x})),
   ...themes.slice(0,2).map(x=>({type:"specific_theme",value:x})),
   ...synopsisTopics.slice(0,2).map(x=>({type:"synopsis_topic",value:x})),
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
   // Audit whether a match has more than one independent kind of evidence.
   // A shared director alone is useful, but is not the same as a verified
   // combination of filmmaker, tone and theme.
   const evidenceKinds=new Set(matches.flatMap(m=>m.details.map(d=>
    d.type==="director"||d.type==="writer"?"filmmaker":
    d.type==="specific_theme"||d.type==="synopsis_topic"?"theme":d.type)));
   const multiEvidence=evidenceKinds.size>=2;
   const evidence=matches.slice(0,4).reduce((total,m,i)=>
    total+Math.min(6,m.score)*m.weight*[.75,.24,.12,.06][i],0);
   const negativePenalty=dislikes.slice(0,2).reduce((total,m,i)=>
    total+Math.min(6,m.score)*[.58,.18][i],0);
   const adjustment=!matches.length
    ?-Math.max(12,item.score*.75)-Math.min(4,negativePenalty)
    :Math.max(-9,Math.min(7,evidence-negativePenalty+Math.min(1.4,(matches.length-1)*.45)));
   const synopsisOnly=matches.length>0&&matches.every(m=>
    m.details.every(d=>d.type==="synopsis_topic"));
   const distinctSynopsisTopics=new Set(matches.flatMap(m=>m.details
    .filter(d=>d.type==="synopsis_topic").map(d=>d.value)));
   // Do not promote a solitary synopsis keyword to independent evidence.
   // Require either verified cinematic evidence, two Log anchors, or
   // two distinct concrete synopsis topics supporting the same anchor.
   const independentEvidence=matches.length>0&&(!synopsisOnly||
    matches.length>=2||distinctSynopsisTopics.size>=2);
   const formatDetail=d=>d.type==="director"||d.type==="writer"?
    "shared "+d.type+" credit (verified TMDB ID)":
    d.type==="synopsis_topic"?"shared plot topic — "+d.value+" (synopsis clue)":
    d.type==="specific_theme"?"shared theme — "+d.value:
    d.type==="tone"?"shared tone — "+d.value:
    d.type==="pacing"?"shared pacing — "+d.value:d.type.replace(/_/g," ")+" — "+d.value;
   const baseScore=item.score+adjustment;
   // The older ranker applies a shallow-evidence penalty because it cannot
   // read plot clues. Recover a small score ONLY when independent synopsis
   // evidence is corroborated and is not contradicted by negative impressions.
   const plotSupport=evidence*2.4+Math.min(2,Math.max(0,matches.length-1)*.8)-
    negativePenalty*2.2;
   const recovered=synopsisOnly&&independentEvidence&&baseScore<=0&&plotSupport>=2.5;
   const finalScore=recovered?Math.min(8,plotSupport):baseScore;
   const explanation=matches.length?
    (synopsisOnly?"Possible fit from plot descriptions, not a verified style match: ":
      "Shared catalog and plot evidence from your Log: ")+
    matches.slice(0,2).map(m=>m.source+" ("+
     m.details.slice(0,2).map(formatDetail).join("; ")+")").join("; ")+
     (matches.length>2?"; plus "+(matches.length-2)+" other positive Log matches":"")+"."
    :"No supported connection found in available catalog or synopsis evidence.";
   return {...item,score:finalScore,cinematicEvidence:evidence,
    cinematicSynopsisRecovered:recovered,
    cinematicMetadata:multiEvidence?"specific":"partial",
    cinematicSynopsisOnly:synopsisOnly,
    cinematicIndependent:independentEvidence,
    cinematicSynopsisTopicCount:distinctSynopsisTopics.size,
    cinematicEvidenceKindCount:evidenceKinds.size,
    cinematicSignalCount:best.types,cinematicExplanation:explanation,
    cinematicEvidenceDetails:best.details,cinematicAnchor:best.types?best.source:null,
    cinematicAnchorCount:matches.length,cinematicEvidenceTypes:[...evidenceTypes],
    cinematicNegativePenalty:negativePenalty};
  }).sort((a,b)=>b.score-a.score);
 }
 function feedbackSimilarity(a={},b={}){
  return overlap(a.themes,b.themes).length*1.4+overlap(a.tones,b.tones).length*1.4+
   overlap(a.genres,b.genres).length*.3+overlap(a.directors,b.directors).length*1.5+
   overlap(a.narrativeThemes,b.narrativeThemes).length*.45;
 }
 return Object.freeze({rank,compare,feedbackSimilarity});
});
