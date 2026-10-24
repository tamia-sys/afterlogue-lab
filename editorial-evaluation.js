/* AFTERLOGUE LAB — annotation-coverage and film-pair evaluation.
 * This never downloads film data, guesses missing dimensions, trains a model,
 * or modifies recommendation scores. Film keys are only local lookup handles.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.AfterlogueEditorialEvaluation=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 function inspect({observations=[],positiveKeys=[],candidateKeys=[],qualifiedKeys=[],editorialEvidence}={}){
  if(!editorialEvidence?.parse||!editorialEvidence?.contrast||
   ![observations,positiveKeys,candidateKeys,qualifiedKeys].every(Array.isArray))
   throw Error('Missing independently authored editorial evaluation inputs');
  const accepted=new Map();let rejected=0,duplicate=0;
  for(const source of observations){
   const parsed=editorialEvidence.parse(source);
   if(!parsed.accepted){rejected++;continue}
   if(accepted.has(parsed.filmKey)){duplicate++;accepted.delete(parsed.filmKey);continue}
   accepted.set(parsed.filmKey,parsed);
  }
  const positive=new Set(positiveKeys),qualified=new Set(qualifiedKeys);
  const positives=[...positive].map(key=>accepted.get(key)).filter(Boolean);
  const candidates=[...new Set(candidateKeys)];
  let reviewedCandidates=0,fullyUnknownCandidates=0,comparablePairs=0,
   multiDimensionPairs=0,ambiguousPairs=0,qualifiedMultiDimension=0,
   withAnyMatch=0,withMultidimension=0,withContradiction=0;
  for(const key of candidates){
   const item=accepted.get(key);
   if(!item){fullyUnknownCandidates++;continue}
   reviewedCandidates++;
   let any=false,multi=false,contradiction=false;
   for(const anchor of positives){
    if(key===anchor.filmKey)continue;
    const result=editorialEvidence.contrast(item,anchor);
    if(!result.comparable||!result.comparableDimensions)continue;
    comparablePairs++;
    if(result.matched)any=true;
    if(result.multiDimensionMatch){multi=true;multiDimensionPairs++}
    if(result.ambiguous){contradiction=true;ambiguousPairs++}
   }
   if(any)withAnyMatch++;
   if(multi)withMultidimension++;
   if(contradiction)withContradiction++;
   if(multi&&qualified.has(key))qualifiedMultiDimension++;
  }
  return Object.freeze({
   authoredRecords:observations.length,acceptedUniqueRecords:accepted.size,
   invalidRecords:rejected,duplicateRecords:duplicate,
   positiveAnchorsRequested:positive.size,reviewedPositiveAnchors:positives.length,
   candidates:candidates.length,reviewedCandidates,fullyUnknownCandidates,
   comparablePairs,multiDimensionPairs,ambiguousPairs,
   candidatesWithAnyMatchingEditorialDimension:withAnyMatch,
   candidatesWithMultiDimensionEditorialMatch:withMultidimension,
   candidatesWithAmbiguousEditorialEvidence:withContradiction,
   qualifiedCandidatesWithMultiDimensionEditorialMatch:qualifiedMultiDimension,
   note:'No reviewed annotation means UNKNOWN, not a negative taste signal. Two matching reviewer observations are not independent human agreement or validation of interest.'
  });
 }
 return Object.freeze({inspect});
});
