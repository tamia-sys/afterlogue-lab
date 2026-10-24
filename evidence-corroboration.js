/* Afterlogue Lab — evidence corroboration shadow evaluator.
 * Stronger evidence must come from a DIFFERENT kind of catalog fact and
 * connect candidate to the SAME positive Log film as a specific keyword.
 * Filmmaker ID is verified; synopsis topics are literal, unverified clues.
 * Neither source proves actual audience interest. No ranking changes. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueCorroborationAudit=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const unique=a=>[...new Set(a)];
 function inspect({positive=[],negative=[],candidates=[],qualifiedKeys=[],
    fingerprint,keywordAudit}={}){
  if(![positive,negative,candidates].every(Array.isArray) ||
     !fingerprint?.build||!fingerprint?.compare||
     !keywordAudit?.keywords||!keywordAudit?.isGeneric)
   throw Error("Missing shadow corroboration evidence dependencies");
  const qualified=qualifiedKeys instanceof Set?qualifiedKeys:
    new Set(Array.isArray(qualifiedKeys)?qualifiedKeys:[]);
  const all=[...positive,...negative,...candidates];
  const frequency=new Map();
  for(const film of all)for(const label of keywordAudit.keywords(film))
   frequency.set(label,(frequency.get(label)||0)+1);
  const threshold=Math.max(4,Math.ceil(all.length*.35));
  // The same local keyword-frequency heuristic used by keyword-signal-audit.
  const usable=label=>!keywordAudit.isGeneric(label)&&(frequency.get(label)||0)<threshold;
  const anchors=positive.map(entry=>({fp:fingerprint.build(entry),labels:keywordAudit.keywords(entry)}));
  const negativeLabels=unique(negative.flatMap(keywordAudit.keywords).filter(usable));
  const outcome={
   candidates:candidates.length,positiveAnchors:positive.length,negativeAnchors:negative.length,
   qualifiedCandidates:0,keywordLinked:0,
   keywordWithVerifiedCreator:0,keywordWithSynopsisTopic:0,
   keywordWithExplicitStoryDevice:0,keywordWithAnyIndependentFacet:0,
   keywordWithTwoIndependentKinds:0,keywordOnly:0,
   keywordWithDifferentAnchorFacetOnly:0,
   keywordWithNegativeCollision:0,corroboratedWithNegativeCollision:0,
   keywordWithMixedNegativeEvidence:0,corroboratedWithMixedNegativeEvidence:0,
   qualifiedKeywordLinked:0,qualifiedWithIndependentFacet:0,
   qualifiedKeywordOnly:0,qualifiedCorroboratedWithNegativeCollision:0,
   qualifiedWithMixedNegativeEvidence:0,
   caveat:"Same-anchor corroboration is source-diverse catalog evidence, NOT verified film taste. Themes/tones mapped from community keywords are excluded as non-independent. Plot/device signals from synopses are unverified."
  };
  for(const item of candidates){
   const isQualified=qualified.has(item?.key);
   if(isQualified)outcome.qualifiedCandidates++;
   const labelSet=new Set(keywordAudit.keywords(item).filter(usable));
   const candFp=fingerprint.build(item);
   const comparisons=anchors.map(anchor=>{
    const tags=anchor.labels.filter(tag=>usable(tag)&&labelSet.has(tag));
    const links=fingerprint.compare(candFp,anchor.fp).links;
    // Count only independent types, and require SAME Log anchor.
    const creator=links.some(l=>l.type==="shared-director-credit"||l.type==="shared-writer-credit");
    const synopsis=links.some(l=>l.type==="shared-synopsis-topic");
    const storyDevice=links.some(l=>l.type==="shared-explicit-device");
    const evidenceKinds=Number(creator)+Number(synopsis)+Number(storyDevice);
    return {hasTag:tags.length>0,tags,creator,synopsis,storyDevice,evidenceKinds};
   });
   const positiveTagLink=comparisons.some(x=>x.hasTag);
   if(!positiveTagLink)continue;
   outcome.keywordLinked++;
   if(isQualified)outcome.qualifiedKeywordLinked++;
   const sameAnchor=comparisons.filter(x=>x.hasTag);
   const creator=sameAnchor.some(x=>x.creator),
    synopsis=sameAnchor.some(x=>x.synopsis),
    storyDevice=sameAnchor.some(x=>x.storyDevice),
    diverseSameAnchor=sameAnchor.some(x=>x.evidenceKinds>=2);
   const supported=creator||synopsis||storyDevice;
   if(creator)outcome.keywordWithVerifiedCreator++;
   if(synopsis)outcome.keywordWithSynopsisTopic++;
   if(storyDevice)outcome.keywordWithExplicitStoryDevice++;
   if(diverseSameAnchor)outcome.keywordWithTwoIndependentKinds++;
   if(supported){
    outcome.keywordWithAnyIndependentFacet++;
    if(isQualified)outcome.qualifiedWithIndependentFacet++;
   }else{
    outcome.keywordOnly++;
    if(isQualified)outcome.qualifiedKeywordOnly++;
    if(comparisons.some(x=>!x.hasTag&&(x.creator||x.synopsis||x.storyDevice)))
     outcome.keywordWithDifferentAnchorFacetOnly++;
   }
   // Mixed: candidate has a different specific tag linked to a disliked film.
   // Exact collision: the very SAME specific tag ties candidate to BOTH
   // a liked and disliked title. Report these categories separately.
   const positiveTagValues=new Set(sameAnchor.flatMap(x=>x.tags));
   const mixedNegative=[...labelSet].some(t=>negativeLabels.includes(t));
   const exactCollision=[...positiveTagValues].some(t=>negativeLabels.includes(t));
   if(mixedNegative){
    outcome.keywordWithMixedNegativeEvidence++;
    if(isQualified)outcome.qualifiedWithMixedNegativeEvidence++;
    if(supported)outcome.corroboratedWithMixedNegativeEvidence++;
   }
   if(exactCollision){
    outcome.keywordWithNegativeCollision++;
    if(supported){
     outcome.corroboratedWithNegativeCollision++;
     if(isQualified)outcome.qualifiedCorroboratedWithNegativeCollision++;
    }
   }
  }
  return Object.freeze(outcome);
 }
 return Object.freeze({inspect});
});
