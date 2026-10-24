/* AFTERLOGUE LAB — two-independent-reviewer cinematic consensus, research only.
 * Source notes remain in memory. Never replace reviewer disagreements by a guess.
 * The shared outcome is a screening-research observation, not ground truth.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueEditorialConsensus=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 function compare({packets=[],editorialEvidence,pilot}={}){
  if(!Array.isArray(packets)||packets.length!==2||!editorialEvidence?.parse||
     !pilot?.slate||!editorialEvidence?.dimensions)
   return {ready:false,reason:"exactly-two-reviewer-exports-required"};
  const slate=new Set(pilot.slate.map(x=>x.key));
  const codes=new Set(),reviews=[];
  for(const packet of packets){
   if(!packet||packet.format!=="afterlogue-firsthand-editorial-pilot-v1"||
      packet.scope!=="local-export-only"||!Array.isArray(packet.records)||
      packet.records.length>12||
      typeof packet.reviewerCode!=="string"||
      !/^[a-zA-Z0-9._-]{3,80}$/.test(packet.reviewerCode))
    return {ready:false,reason:"invalid-review-export"};
   if(codes.has(packet.reviewerCode))return {ready:false,reason:"same-reviewer-export"};
   codes.add(packet.reviewerCode);
   const seen=new Set(),map=new Map();
   for(const record of packet.records){
    if(!slate.has(record?.filmKey)||seen.has(record.filmKey)||
      record?.provenance?.reviewerCode!==packet.reviewerCode||
      record?.provenance?.sourceType!=="firsthand-screening-notes")
     return {ready:false,reason:"unreviewed-or-duplicate-film"};
    seen.add(record.filmKey);
    const parsed=editorialEvidence.parse(record);
    if(!parsed.accepted)return {ready:false,reason:"unreviewed-or-duplicate-film"};
    map.set(record.filmKey,parsed.values);
   }
   reviews.push(map);
  }
  const fields=Object.keys(editorialEvidence.dimensions),films=[];
  let jointlyReviewed=0,withTwoAgreed=0,fullyUnknown=0,dimensionsAgreed=0,dimensionsDisagreed=0;
  for(const entry of pilot.slate){
   const left=reviews[0].get(entry.key),right=reviews[1].get(entry.key);
   if(!left||!right){
    fullyUnknown++;
    // Keep the film in the evaluation slate. A missing review is not a
    // reason to silently exclude an unfamiliar title from denominator.
    films.push({key:entry.key,agreed:{},conflicted:[],unobserved:[...fields],
     usable:false,agreedDimensionCount:0});
    continue;
   }
   jointlyReviewed++;
   const agreed={},conflicted=[],unobserved=[];
   for(const field of fields){
    const l=left[field],r=right[field];
    if(l&&r&&l===r){agreed[field]=l;dimensionsAgreed++}
    else if(l&&r){conflicted.push(field);dimensionsDisagreed++}
    else unobserved.push(field);
   }
   // Unresolved firsthand-review disagreement is not a trusted taste feature.
   const usable=Object.keys(agreed).length>=2&&conflicted.length===0;
   if(usable)withTwoAgreed++;
   films.push({key:entry.key,agreed,conflicted,unobserved,
    usable,agreedDimensionCount:Object.keys(agreed).length});
  }
  return {ready:true,films,summary:{
   totalSlateFilms:pilot.slate.length, jointlyReviewedFilms:jointlyReviewed,
   filmsWithTwoOrMoreAgreedDimensions:withTwoAgreed,
   filmsWithoutOverlappingReviews:fullyUnknown,
   observedDimensionsAgreed:dimensionsAgreed,
   observedDimensionsConflicted:dimensionsDisagreed,
   caveat:"Only labels explicitly agreed by TWO distinct self-declared firsthand reviewers survive. This does not establish truth or usefulness for interest prediction."
  }};
 }
 return Object.freeze({compare});
});
