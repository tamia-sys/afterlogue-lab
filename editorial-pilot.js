/* AFTERLOGUE LAB / SMALL CINEMATIC REVIEW PILOT
 * No API calls, authentication, localStorage, hidden auto-generated film style,
 * persistent corpus, or recommendation scoring.
 * This module accepts original firsthand-reviewed observations only.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueEditorialPilot=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const slate=Object.freeze([
  {key:"pilot-perfect-days-2023",title:"Perfect Days (2023)"},
  {key:"pilot-moonlight-2016",title:"Moonlight (2016)"},
  {key:"pilot-city-of-god-2002",title:"City of God (2002)"},
  {key:"pilot-frances-ha-2012",title:"Frances Ha (2012)"},
  {key:"pilot-the-farewell-2019",title:"The Farewell (2019)"},
  {key:"pilot-before-sunrise-1995",title:"Before Sunrise (1995)"},
  {key:"pilot-parasite-2019",title:"Parasite (2019)"},
  {key:"pilot-spirited-away-2001",title:"Spirited Away (2001)"},
  {key:"pilot-mad-max-fury-road-2015",title:"Mad Max: Fury Road (2015)"},
  {key:"pilot-the-social-network-2010",title:"The Social Network (2010)"},
  {key:"pilot-the-florida-project-2017",title:"The Florida Project (2017)"},
  {key:"pilot-the-grand-budapest-hotel-2014",title:"The Grand Budapest Hotel (2014)"}
 ]);
 const allowed=new Set(slate.map(x=>x.key));
 const dimensions=[
  "pacing","narrativeStructure","visualApproach",
  "performanceMode","dialogueDensity","emotionalRegister"
 ];
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const plain=o=>o!==null&&typeof o==="object"&&!Array.isArray(o);
 function makePacket({reviewerCode,records=[],editorialEvidence}={}){
  if(!editorialEvidence?.parse||!Array.isArray(records)||records.length>20)
   throw Error("Invalid reviewer records or validation dependency");
  if(typeof reviewerCode!=="string"||!/^[a-zA-Z0-9._-]{3,80}$/.test(reviewerCode))
   throw Error("Use a short pseudonymous reviewer code, not a name or email");
  const existing=new Set(),valid=[];
  for(const original of records){
   if(original?.provenance?.reviewerCode!==reviewerCode)
    throw Error("All records must use the current reviewer's code");
   if(!allowed.has(original?.filmKey))
    throw Error("Film is outside the small optional pilot slate");
   if(existing.has(original.filmKey))throw Error("Duplicate film observations by reviewer");
   const parsed=editorialEvidence.parse(original);
   if(!parsed.accepted)throw Error("Unreviewed or invalid film observation: "+parsed.reason);
   existing.add(original.filmKey);
   valid.push(original);
  }
  return {format:"afterlogue-firsthand-editorial-pilot-v1",reviewerCode,
   scope:"local-export-only",records:valid};
 }
 function compare({packets=[],editorialEvidence}={}){
  if(!editorialEvidence?.parse||!Array.isArray(packets)||packets.length>6)
   throw Error("Expected up to six locally imported review packets");
  const reviewers=new Set(),seen=new Map(),quarantined=new Set();
  let packetErrors=0,recordErrors=0;
  for(const packet of packets){
   if(!plain(packet)||packet.format!=="afterlogue-firsthand-editorial-pilot-v1"||
    packet.scope!=="local-export-only"||
    typeof packet.reviewerCode!=="string"||
    !/^[a-zA-Z0-9._-]{3,80}$/.test(packet.reviewerCode)||
    !Array.isArray(packet.records)||packet.records.length>20){
    packetErrors++;continue;
   }
   // Repeated reviewer exports cannot be counted as two independent people.
   if(reviewers.has(packet.reviewerCode)){packetErrors++;continue}
   reviewers.add(packet.reviewerCode);
   for(const record of packet.records){
    if(!allowed.has(record?.filmKey)||
     record?.provenance?.reviewerCode!==packet.reviewerCode){
     recordErrors++;continue;
    }
    const parsed=editorialEvidence.parse(record);
    if(!parsed.accepted){recordErrors++;continue}
    const pair=record.filmKey+"::"+packet.reviewerCode;
    if(quarantined.has(pair)){recordErrors++;continue}
    if(seen.has(pair)){seen.delete(pair);quarantined.add(pair);recordErrors++;continue}
    seen.set(pair,{filmKey:record.filmKey,reviewerCode:packet.reviewerCode,
      values:parsed.values});
   }
  }
  const perFilm=new Map();
  for(const item of seen.values()){
   if(!perFilm.has(item.filmKey))perFilm.set(item.filmKey,[]);
   perFilm.get(item.filmKey).push(item);
  }
  const metrics=Object.fromEntries(dimensions.map(d=>[d,{
   compared:0,agreed:0,disagreed:0,missing:0
  }]));
  let doubleReviewed=0,pairedDimensions=0,matches=0,disagreements=0;
  let filmsWithConflict=0,oneReviewer=0;
  for(const film of slate){
   const records=perFilm.get(film.key)||[];
   if(records.length===1){oneReviewer++;continue}
   if(records.length<2)continue;
   doubleReviewed++;
   let conflict=false;
   for(const dim of dimensions){
    const values=records.map(r=>r.values[dim]).filter(Boolean);
    if(values.length<2){metrics[dim].missing++;continue}
    // Pairwise counts make multi-reviewer comparisons explicit; do not
    // force consensus or choose a majority label in this prototype.
    for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++){
     metrics[dim].compared++;pairedDimensions++;
     if(values[i]===values[j]){metrics[dim].agreed++;matches++}
     else{metrics[dim].disagreed++;disagreements++;conflict=true}
    }
   }
   if(conflict)filmsWithConflict++;
  }
  // Cohen's kappa is only meaningful here for exactly TWO reviewers.
  // Keep all reviewer codes, film labels and source notes out of the result.
  // A six-overlap gate is a minimal computability guard, NOT a claim of
  // statistical precision or that the observed descriptions are true.
  const reliability={};
  for(const dim of dimensions){
   const paired=[];
   if(reviewers.size===2){
    for(const records of perFilm.values()){
     if(records.length!==2)continue;
     const ordered=[...records].sort((a,b)=>a.reviewerCode.localeCompare(b.reviewerCode));
     const left=ordered[0].values[dim],right=ordered[1].values[dim];
     if(left&&right)paired.push([left,right]);
    }
   }
   const count=paired.length;
   const distinctLeft=new Set(paired.map(p=>p[0])).size,
         distinctRight=new Set(paired.map(p=>p[1])).size;
   let status=reviewers.size!==2?"two-reviewers-required":
    count<6?"insufficient-overlap":
    distinctLeft<2||distinctRight<2?"no-category-variation":"exploratory";
   let chanceExpected=null,kappa=null;
   if(status==="exploratory"){
    const categories=new Set(paired.flat());
    const expected=[...categories].reduce((total,label)=>
      total+paired.filter(p=>p[0]===label).length/count*
            (paired.filter(p=>p[1]===label).length/count),0);
    if(expected>=1-1e-12)status="expected-agreement-saturated";
    else{
     const observed=paired.filter(p=>p[0]===p[1]).length/count;
     chanceExpected=expected;
     kappa=(observed-expected)/(1-expected);
    }
   }
   reliability[dim]={status,overlappingFilms:count,
    labelsUsedByFirstReviewer:distinctLeft,
    labelsUsedBySecondReviewer:distinctRight,
    expectedChanceAgreement:chanceExpected,cohensKappa:kappa};
  }
  const estimatedDimensions=Object.values(reliability).filter(x=>x.status==="exploratory").length;
  const reliabilityStatus=reviewers.size!==2?"two-reviewers-required":
    estimatedDimensions?"exploratory-only":"insufficient-overlap-or-variation";
  return {
   format:"afterlogue-editorial-pilot-aggregate-v1",
   reviewedFilmCount:perFilm.size,slateCount:slate.length,
   reviewerCount:reviewers.size,packetErrors,recordErrors,
   filmsWithOneReview:oneReviewer,filmsWithTwoOrMoreReviews:doubleReviewed,
   filmsWithDisagreements:filmsWithConflict,
   comparedDimensionPairs:pairedDimensions,
   agreementPairs:matches,disagreementPairs:disagreements,
   observedPairAgreement:pairedDimensions?matches/pairedDimensions:null,
   dimensions:metrics,reliability,reliabilityStatus,
   kappaEstimatedDimensions:estimatedDimensions,
   note:"Agreement on originally authored observations is not truth or film preference. Chance-adjusted kappa is EXPLORATORY ONLY for exactly two independent reviewers, at least six overlapping films with variable labels in each dimension. Small samples remain uncertain. Unknown stays unknown; no data was uploaded."
  };
 }
 return Object.freeze({slate,makePacket,compare});
});
