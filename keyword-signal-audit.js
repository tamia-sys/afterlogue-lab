/* AFTERLOGUE LAB — community keyword specificity audit, SHADOW ONLY.
 * Labels describe TMDB community tagging and DO NOT verify film style or interest.
 * Local frequency is a property of THIS sampled candidate pool, not TMDB globally.
 * This module must never alter ranking, eligibility, or user data. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.AfterlogueKeywordSignalAudit=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const generic=new Set([
  'drama','comedy','romance','thriller','horror','action','adventure',
  'animation','documentary','film','movie','family','love','friendship',
  'coming of age','teenager','relationships','relationship','murder',
  'death','life','woman','man','girl','boy','female protagonist',
  'male protagonist','independent film','based on novel','based on book',
  'based on a novel','based on true story','based on a true story',
  'based on comic','based on a comic','based on a play','remake','sequel',
  'duringcreditsstinger','aftercreditsstinger','post credits scene',
  'during credits stinger','after credits stinger','violence'
 ]);
 const clean=s=>String(s||'').toLowerCase().trim().replace(/\s+/g,' ').slice(0,120);
 const keywords=entry=>{
  const raw=entry?.facets?.keywordNames||entry?.keywordNames||entry?.keywordHints?.rawKeywordNames?.values||[];
  return [...new Set((Array.isArray(raw)?raw:[]).filter(x=>typeof x==='string')
   .map(clean).filter(Boolean))];
 };
 function isGeneric(label){
  return generic.has(label)||/^(?:based on (?:the |a )?|adapted from |inspired by ).{0,8}(?:book|novel|play|comics?)$/.test(label)
   ||/(?:creditsstinger|credit sequence|post credits|after credits)/.test(label);
 }
 const intersects=(left,right)=>left.filter(x=>right.includes(x));
 function inspect({positive=[],candidates=[],negative=[]}={}){
  if(!Array.isArray(positive)||!Array.isArray(candidates)||!Array.isArray(negative))
   throw Error('Expected arrays of fictional positive, negative and candidate entries');
  const films=[...positive,...negative,...candidates],frequency=new Map();
  for(const film of films)for(const kw of keywords(film))
   frequency.set(kw,(frequency.get(kw)||0)+1);
  // IDF-like test is intentionally NOT a global rarity assertion.
  const threshold=Math.max(4,Math.ceil(films.length*.35));
  const exclusions=label=>isGeneric(label)?'generic':
    (frequency.get(label)||0)>=threshold?'pool-common':null;
  const positiveGroups=positive.map(keywords),negativeGroups=negative.map(keywords);
  const rows=candidates.map(film=>{
   const labels=keywords(film),rawLinks=positiveGroups.flatMap(k=>intersects(labels,k));
   const uniqueRaw=[...new Set(rawLinks)];
   const supported=uniqueRaw.filter(label=>!exclusions(label));
   const flaggedGeneric=uniqueRaw.filter(isGeneric);
   const flaggedFrequent=uniqueRaw.filter(x=>!isGeneric(x)&&exclusions(x)==='pool-common');
   const overlapsNegatives=[...new Set(negativeGroups.flatMap(k=>intersects(supported,k)))];
   const hasPositive=supported.length>0;
   const ambiguousNegative=hasPositive&&overlapsNegatives.length>0;
   return {rawMatched:uniqueRaw.length>0,specificMatched:hasPositive,
    specificLabels:supported,flaggedGeneric:flaggedGeneric.length,
    flaggedPoolCommon:flaggedFrequent.length,
    corroboratedSpecificLabels:supported.length>=2,
    negativeOverlap:ambiguousNegative,
    genericOrCommonOnly:uniqueRaw.length>0&&!hasPositive,
    hasProviderKeywordLabels:labels.length>0};
  });
  const sum=k=>rows.filter(x=>x[k]).length;
  const matched=rows.filter(x=>x.specificMatched);
  return {
   sampleSize:films.length,candidates:candidates.length,positiveAnchors:positive.length,
   negativeAnchors:negative.length,
   poolCommonCutoff:threshold,
   catalogKeywordsSeen:frequency.size,
   candidatesWithProviderKeywords:sum('hasProviderKeywordLabels'),
   candidatesWithRawPositiveOverlap:sum('rawMatched'),
   candidatesWithSpecificOverlap:sum('specificMatched'),
   candidatesOnlyGenericOrCommon:sum('genericOrCommonOnly'),
   candidatesWithTwoOrMoreSpecificLabels:sum('corroboratedSpecificLabels'),
   candidatesWithSpecificNegativeOverlap:sum('negativeOverlap'),
   negativeControlAvailable:negative.length>0,
   // Never export film titles or actual keyword contents in the summary.
   note:'Specific means not on a conservative generic list and not common WITHIN THIS SMALL SAMPLE. Multiple tags from the same community source are NOT independent evidence of actual film similarity.',
   meanSpecificLabelsAmongMatches:matched.length?
    matched.reduce((n,x)=>n+x.specificLabels.length,0)/matched.length:0
  };
 }
 return Object.freeze({inspect,isGeneric,keywords});
});
