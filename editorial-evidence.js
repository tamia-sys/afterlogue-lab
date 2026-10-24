/* AFTERLOGUE LAB — original editorial observations (research-only, no network).
 * This is an annotation contract, NOT an automated interpretation of TMDB.
 * Accept only independently authored/reviewed observations, never inferred
 * from metadata keywords, posters, genre, synopsis or a user's preferences.
 * "reviewed" is a declaration from an editorial process, not fact checking. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.AfterlogueEditorialEvidence=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const dimensions=Object.freeze({
  pacing:['measured','moderate','brisk','variable'],
  narrativeStructure:['chronological','nonlinear','episodic','fragmented','circular'],
  visualApproach:['observational','formal-composed','handheld-immediate','expressive-stylized','mixed'],
  performanceMode:['naturalistic','heightened','minimalist','mixed'],
  dialogueDensity:['sparse','moderate','dialogue-driven'],
  emotionalRegister:['intimate','wistful','tense','playful','meditative','confrontational','expansive']
 });
 const fields=Object.keys(dimensions);
 const sourceTypes=['firsthand-screening-notes','rights-cleared-editorial'];
 const isDate=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 const empty=()=>Object.fromEntries(fields.map(field=>[field,null]));
 function parse(record){
  if(!record||typeof record!=='object'||Array.isArray(record))
   return {accepted:false,reason:'invalid-record'};
  if(typeof record.filmKey!=='string'||!/^[a-z0-9][a-z0-9-_]{2,90}$/.test(record.filmKey))
   return {accepted:false,reason:'invalid-film-key'};
  if(!sourceTypes.includes(record.provenance?.sourceType))
   return {accepted:false,reason:'unlicensed-or-unidentified-source'};
  if(record.provenance.sourceType==='rights-cleared-editorial'&&
    (!/^[a-zA-Z0-9._:/-]{5,120}$/.test(String(record.provenance.permissionRef||''))))
   return {accepted:false,reason:'missing-usage-permission'};
  if(!/^[a-zA-Z0-9._-]{3,80}$/.test(String(record.provenance.reviewerCode||'')) ||
      !isDate(record.provenance.reviewedOn))
   return {accepted:false,reason:'invalid-review-provenance'};
  if(record.reviewStatus!=='reviewed')
   return {accepted:false,reason:'not-reviewed'};
  const values=empty(),notes=record.observations;
  if(!notes||typeof notes!=='object'||Array.isArray(notes))
   return {accepted:false,reason:'no-observations'};
  for(const k of Object.keys(notes))
   if(!fields.includes(k))return {accepted:false,reason:'unknown-editorial-dimension'};
  let observed=0;
  for(const field of fields){
   const detail=notes[field];
   if(detail==null)continue;
   if(!detail||typeof detail!=='object'||Array.isArray(detail)||
      !dimensions[field].includes(detail.value))
    return {accepted:false,reason:'invalid-dimension-value'};
   if(typeof detail.originalRationale!=='string' ||
      detail.originalRationale.trim().length<12 ||
      detail.originalRationale.length>280)
    return {accepted:false,reason:'unsubstantiated-observation'};
   values[field]=detail.value;observed++;
  }
  if(!observed)return {accepted:false,reason:'no-observed-dimensions'};
  return {accepted:true,filmKey:record.filmKey,values,observed,missing:fields.length-observed,
   provenance:{sourceType:record.provenance.sourceType,
    // No source excerpts, original notes, author names or license URLs in exports.
    hasPermission:record.provenance.sourceType==='rights-cleared-editorial'&&
      !!record.provenance.permissionRef,reviewDeclared:true}};
 }
 function contrast(a,b){
  const left=a?.accepted?a:parse(a),right=b?.accepted?b:parse(b);
  if(!left.accepted||!right.accepted)return {comparable:false,reason:'missing-reviewed-observation',
   matched:0,different:0,comparableDimensions:0,unknownDimensions:fields.length};
  const matches=[],differences=[];
  for(const f of fields){
   if(!left.values[f]||!right.values[f])continue;
   (left.values[f]===right.values[f]?matches:differences).push(f);
  }
  return {comparable:true,matched:matches.length,different:differences.length,
   comparableDimensions:matches.length+differences.length,
   unknownDimensions:fields.length-matches.length-differences.length,
   matchedDimensions:matches,differentDimensions:differences,
   multiDimensionMatch:matches.length>=2,
   ambiguous:matches.length>0&&differences.length>0,
   caution:'Editorial observations are subjective and only as reliable as the actual review and rights process. Similarity is not a prediction of enjoyment.'};
 }
 function audit(records=[]){
  if(!Array.isArray(records))throw Error('Expected annotation array');
  const parsed=records.map(parse),accepted=parsed.filter(x=>x.accepted),
   fieldsCovered=Object.fromEntries(fields.map(f=>[f,accepted.filter(x=>x.values[f]!==null).length]));
  return {submitted:records.length,accepted:accepted.length,rejected:parsed.length-accepted.length,
   dimensionsCovered:fieldsCovered,
   rejectedReasons:Object.fromEntries([...new Set(parsed.filter(x=>!x.accepted).map(x=>x.reason))]
    .map(reason=>[reason,parsed.filter(x=>x.reason===reason).length])),
   caveat:'Reviewed is self-declared, not externally verified. Unobserved facets are unknown rather than negative taste labels.'};
 }
 return Object.freeze({dimensions,parse,contrast,audit});
});
