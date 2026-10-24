/* Afterlogue Lab — opt-in five-profile public catalog audit.
 * Runs only when invoked; no private member data, model training or analytics writes.
 * This is a bounded QA sample, NOT proof of watch interest or production quality. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.AfterlogueCatalogBatchAudit=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const unique=values=>[...new Set(values)];
 const ratio=(n,d)=>d?n/d:0;
 const facetsOf=item=>item?.facets||{};
 const has=(f,key)=>Array.isArray(f?.[key])&&f[key].length>0;
 function chooseAnchors(found,cap=4){
  const positive=found.filter(x=>x.rating==='Loved'||x.rating==='Liked');
  const chosen=[],usedGenres=new Set();
  while(chosen.length<cap&&positive.length){
   let best=0,score=-Infinity;
   for(let i=0;i<positive.length;i++){
    const genres=positive[i].item.genres||[];
    const fresh=genres.filter(g=>!usedGenres.has(String(g).toLowerCase())).length;
    const value=fresh*3+(positive[i].rating==='Loved'?1:0)-i*.001;
    if(value>score){score=value;best=i}
   }
   const next=positive.splice(best,1)[0];
   chosen.push(next);
   for(const genre of next.item.genres||[])usedGenres.add(String(genre).toLowerCase());
  }
  return chosen;
 }
 function summarize(rows){
  const successes=rows.filter(x=>!x.error),sum=(key)=>successes.reduce((s,x)=>s+(Number(x[key])||0),0);
  const mean=key=>ratio(sum(key),successes.length);
  return {profilesAttempted:rows.length,profilesCompleted:successes.length,profilesFailed:rows.length-successes.length,
   meanUniqueRetrieved:mean('uniqueRetrieved'),meanEvaluatedCandidates:mean('evaluatedCandidates'),
   meanQualifiedCandidates:mean('qualified'),firstShelfCompletionRate:ratio(sum('firstShelfComplete'),successes.length),
   candidateQualificationRate:ratio(sum('qualified'),sum('evaluatedCandidates')),
   meanLowScoreRejections:mean('lowScoreRejections'),
   meanMissingEvidenceRejections:mean('missingEvidenceRejections'),
   meanUnanchoredRejections:mean('unanchoredRejections'),
   meanOtherRejections:mean('otherRejections'),
   linkedOnlyYield:ratio(sum('qualifiedLinkedOnly'),sum('evaluatedLinkedOnly')),
   browseOnlyYield:ratio(sum('qualifiedBrowseOnly'),sum('evaluatedBrowseOnly')),
   sharedRouteYield:ratio(sum('qualifiedBoth'),sum('evaluatedBoth')),
   noBestEvidenceTypeCount:sum('bestEvidenceNone'),
   oneBestEvidenceTypeCount:sum('bestEvidenceSingle'),
   multipleBestEvidenceTypeCount:sum('bestEvidenceMultiple'),
   secondShelfCompletionRate:ratio(sum('secondShelfComplete'),successes.length),
   metadataReturnRate:ratio(sum('metadataReturned'),sum('metadataRequested')),
   candidateThemeCoverage:ratio(sum('candidateThemes'),sum('evaluatedCandidates')),
   candidateToneCoverage:ratio(sum('candidateTones'),sum('evaluatedCandidates')),
   candidatePlotCoverage:ratio(sum('candidatePlot'),sum('evaluatedCandidates')),
   fingerprintExtraPlotClueCoverage:ratio(sum('fingerprintExtraPlotTitles'),sum('evaluatedCandidates')),
   fingerprintExplicitDeviceCoverage:ratio(sum('fingerprintExplicitDeviceTitles'),sum('evaluatedCandidates')),
   meanPotentialFingerprintLinks:mean('fingerprintLinkedTitles'),
   meanPotentialNewPlotLinks:mean('fingerprintNewPlotLinks'),
   fingerprintSynopsisCoverage:ratio(sum('fingerprintWithSynopsis'),sum('evaluatedCandidates')),
   fingerprintCreatorCoverage:ratio(sum('fingerprintWithCreatorCredit'),sum('evaluatedCandidates')),
   fingerprintKeywordCoverage:ratio(sum('fingerprintWithMappedKeywords'),sum('evaluatedCandidates')),
   fingerprintRawKeywordCoverage:ratio(sum('fingerprintWithOriginalKeywords'),sum('evaluatedCandidates')),
   fingerprintAnyPlotClueCoverage:ratio(sum('fingerprintWithPlotClues'),sum('evaluatedCandidates')),
   fingerprintRawKeywordLinkCoverage:ratio(sum('fingerprintRawKeywordLinkedTitles'),sum('evaluatedCandidates')),
   fingerprintRawOnlyLinkCoverage:ratio(sum('fingerprintRawKeywordOnlyTitles'),sum('evaluatedCandidates')),
   fingerprintRawUnqualifiedCoverage:ratio(sum('fingerprintRawKeywordUnqualifiedTitles'),sum('evaluatedCandidates')),
   keywordRawLinkRate:ratio(sum('keywordRawLinks'),sum('evaluatedCandidates')),
   keywordSpecificLinkRate:ratio(sum('keywordSpecificLinks'),sum('evaluatedCandidates')),
   keywordGenericOnlyRate:ratio(sum('keywordGenericOnly'),sum('evaluatedCandidates')),
   keywordMultiLabelRate:ratio(sum('keywordMultiLabel'),sum('evaluatedCandidates')),
   keywordNegativeOverlapRate:ratio(sum('keywordNegativeOverlap'),sum('evaluatedCandidates')),
   keywordNegativeSpecificRate:ratio(sum('keywordNegativeSpecific'),sum('evaluatedCandidates')),
   keywordNegativeOnlyRate:ratio(sum('keywordNegativeOnly'),sum('evaluatedCandidates')),
   keywordPositiveOnlyRate:ratio(sum('keywordPositiveOnly'),sum('evaluatedCandidates')),
   keywordMixedEvidenceRate:ratio(sum('keywordMixedPositiveNegative'),sum('evaluatedCandidates')),
   keywordNegativeControlProfiles:successes.filter(x=>x.keywordNegativeAnchors>0).length,
   keywordShadowNegativesUnresolved:sum('keywordShadowNegativesUnresolved'),
   keywordQualifiedWithMixedEvidence:sum('keywordQualifiedWithMixedEvidence'),
   keywordQualifiedWithExactConflict:sum('keywordQualifiedWithExactConflict'),
   keywordQualifiedWithNegativeOnly:sum('keywordQualifiedWithNegativeOnly'),
   corroborationKeywordLinked:sum('corroborationKeywordLinked'),
   corroborationKeywordOnly:sum('corroborationKeywordOnly'),
   corroborationWithVerifiedCreator:sum('corroborationWithVerifiedCreator'),
   corroborationWithSynopsisClue:sum('corroborationWithSynopsisClue'),
   corroborationWithStoryDevice:sum('corroborationWithStoryDevice'),
   corroborationWithIndependentFacet:sum('corroborationWithIndependentFacet'),
   corroborationWithMultipleIndependentKinds:sum('corroborationWithMultipleIndependentKinds'),
   corroborationCrossAnchorOnly:sum('corroborationCrossAnchorOnly'),
   corroborationQualifiedWithIndependentFacet:sum('corroborationQualifiedWithIndependentFacet'),
   corroborationQualifiedKeywordOnly:sum('corroborationQualifiedKeywordOnly'),
   corroborationWithNegativeCollision:sum('corroborationWithNegativeCollision'),
   corroborationWithNegativeCollisionAndIndependentFacet:sum('corroborationWithNegativeCollisionAndIndependentFacet'),
   corroborationWithMixedNegativeEvidence:sum('corroborationWithMixedNegativeEvidence'),
   corroborationWithMixedNegativeEvidenceAndIndependentFacet:sum('corroborationWithMixedNegativeEvidenceAndIndependentFacet'),
   editorialReviewedPositive:sum('editorialReviewedPositive'),
   editorialReviewedCandidates:sum('editorialReviewedCandidates'),
   editorialMultiDimensionCandidates:sum('editorialMultiDimensionCandidates'),
   editorialQualifiedMultiDimensionCandidates:sum('editorialQualifiedMultiDimensionCandidates'),
   editorialUnknownCandidates:sum('editorialUnknownCandidates'),
   editorialConflictedCandidates:sum('editorialConflictedCandidates'),
   keywordDifferentLabelConflictRate:ratio(sum('keywordDifferentLabelConflict'),sum('evaluatedCandidates')),
   multiSignalEligibleShare:ratio(sum('multiSignalEligible'),sum('qualified')),
   meanDistinctGenresFirstFive:mean('topGenres'),
   meanDistinctPositiveLogAnchorsFirstFive:mean('topAnchors'),
   duplicateViolations:sum('duplicateViolations'),ratedTitleViolations:sum('ratedTitleViolations'),
   titleRecommendationFailures:sum('recommendationFailures'),
   independentBrowseFailures:sum('browseFailures'),metadataFailures:sum('metadataFailures')};
 }
 async function run({profiles,api,resolveTitle,toEntry,features,enrich,engine,cinematic,policy,
   anchorBalance,fingerprint=null,keywordAudit=null,corroboration=null,
   editorialEvidence=null,editorialEvaluation=null,editorialObservations=[],
   onProgress=()=>{},shouldCancel=()=>false,maxPlans=4,maxCandidates=60}={}){
  if(!Array.isArray(profiles)||!profiles.length||profiles.length>20)throw Error('Choose 1–20 fictional viewer histories');
  if(![api,resolveTitle,toEntry,features,enrich].every(x=>typeof x==='function')||
     !engine?.rank||!cinematic?.rank||!policy?.eligible||!anchorBalance?.balance)
    throw Error('Lab catalog dependencies unavailable');
  if(!Number.isInteger(maxPlans)||maxPlans<1||maxPlans>8||
     !Number.isInteger(maxCandidates)||maxCandidates<5||maxCandidates>120)
    throw Error('Invalid catalog QA request budget');
  const reports=[];
  for(let i=0;i<profiles.length;i++){
   if(shouldCancel())break;
   const profile=profiles[i],history=profile.history||[];
   onProgress({current:i+1,total:profiles.length,name:profile.name,stage:'Resolving film history'});
   try{
    const results=await Promise.allSettled(history.map(([title])=>resolveTitle(title)));
    if(shouldCancel())break;
    const found=results.map((res,n)=>res.status==='fulfilled'&&res.value?
     {item:res.value,rating:history[n][1]}:null).filter(Boolean);
    if(found.length<2)throw Error('Fewer than two historical films could be resolved');
    const sources=found.map(({item},index)=>toEntry(item,index));
    // Additional fictional dislikes are resolved solely for shadow analysis.
    // They must not enter impressions, ranked entries, rated-title exclusions,
    // candidate retrieval seeds, or persistent member Logs.
    const controlNames=Array.isArray(profile.negativeControls)?
      [...new Set(profile.negativeControls.filter(x=>typeof x==='string'&&x.trim().length>=2))]
       .slice(0,2):[];
    const controls=await Promise.allSettled(controlNames.map(title=>resolveTitle(title)));
    if(shouldCancel())break;
    const negativeControls=controls.filter(x=>x.status==='fulfilled'&&x.value)
      .map((x,n)=>toEntry(x.value,900+n))
      .filter(x=>!sources.some(source=>source.key===x.key));
    const keywordShadowNegativesUnresolved=controlNames.length-negativeControls.length;
    const ratings=Object.fromEntries(found.map(({item,rating})=>['tmdb-movie-'+item.id,rating]));
    const selected=chooseAnchors(found,maxPlans);
    if(!selected.length)throw Error('No positive film anchors');
    const plans=selected.map(x=>[x.item.title]);
    const anchorInput=selected.map(x=>({title:x.item.title,genres:x.item.genres||[]}));
    onProgress({current:i+1,total:profiles.length,name:profile.name,stage:'Retrieving public film candidates'});
    const responses=await Promise.allSettled(plans.map(titles=>api({mode:'recommend',media:'movie',titles})));
    if(shouldCancel())break;
    const map=new Map(),origins=new Map();
    let recommendationFailures=0,invalid=0,duplicated=0;
    function record(item,origin){
     if(!item?.id||!item.poster||!Array.isArray(item.matched)||!item.matched.length){invalid++;return}
     const key='tmdb-movie-'+item.id;
     if(map.has(key))duplicated++;else map.set(key,item);
     if(!origins.has(key))origins.set(key,new Set());
     origins.get(key).add(origin);
    }
    responses.forEach(res=>{
     if(res.status==='rejected'){recommendationFailures++;return}
     for(const item of res.value.items||[])record(item,'title-linked');
    });
    let browseFailures=0;
    try{
     const browse=await api({mode:'lab-browse',media:'movie',round:1,anchors:anchorInput});
     for(const item of browse.items||[])record(item,'independent-browse');
    }catch(error){browseFailures++}
    if(shouldCancel())break;
    const rated=new Set(sources.map(x=>x.key));
    for(const key of rated)map.delete(key);
    const all=[...map.values()];
    // Preserve representation of both retrieval routes under a fixed metadata cap.
    const link=[],browse=[];
    for(const item of all){
     const key='tmdb-movie-'+item.id,from=origins.get(key)||new Set();
     if(from.has('independent-browse')&&!from.has('title-linked'))browse.push(item);
     else link.push(item);
    }
    const mixed=[];
    for(let n=0;mixed.length<maxCandidates&&(n<link.length||n<browse.length);n++){
     if(n<link.length)mixed.push(link[n]);
     if(n<browse.length&&mixed.length<maxCandidates)mixed.push(browse[n]);
    }
    const candidates=mixed.map((item,index)=>toEntry(item,400+index));
    onProgress({current:i+1,total:profiles.length,name:profile.name,stage:'Enriching film metadata'});
    const keys=unique([...sources,...candidates,...negativeControls].map(x=>x.key)),metadataRequested=keys.length;
    let metadata=new Map(),metadataFailures=0;
    try{metadata=await features(keys)}catch(err){metadataFailures++}
    if(shouldCancel())break;
    const complete=[...enrich(sources,metadata),...enrich(candidates,metadata)];
    const shadowNegativeEnriched=enrich(negativeControls,metadata);
    const legacyRanked=engine.rank({entries:complete,category:'movies',impressions:ratings});
    const scored=cinematic.rank(legacyRanked,complete,ratings);
    const eligible=policy.eligible(scored,{ratedKeys:[...rated]});
    const eligibleKeys=new Set(eligible.map(x=>x.key));
    const funnel={lowScoreRejections:0,missingEvidenceRejections:0,
     unanchoredRejections:0,otherRejections:0};
    for(const item of scored){
     if(rated.has(item.key)||eligibleKeys.has(item.key))continue;
     if(!(Number(item.score)>0))funnel.lowScoreRejections++;
     else if(!(Number(item.cinematicSignalCount)>=1))funnel.missingEvidenceRejections++;
     else if(!(item.personalized===true&&Array.isArray(item.matched)&&item.matched.length>0) &&
      !(item.cinematicIndependent===true&&Number(item.cinematicAnchorCount)>=1))
      funnel.unanchoredRejections++;
     else funnel.otherRejections++;
    }
    const routes={evaluatedLinkedOnly:0,evaluatedBrowseOnly:0,evaluatedBoth:0,
     qualifiedLinkedOnly:0,qualifiedBrowseOnly:0,qualifiedBoth:0};
    for(const item of candidates){
     const from=origins.get(item.key)||new Set();
     const suffix=from.has('title-linked')&&from.has('independent-browse')?'Both':
      from.has('independent-browse')?'BrowseOnly':'LinkedOnly';
     routes['evaluated'+suffix]++;
     if(eligibleKeys.has(item.key))routes['qualified'+suffix]++;
    }
    const bestEvidenceNone=eligible.filter(x=>!(x.cinematicSignalCount>=1)).length;
    const bestEvidenceSingle=eligible.filter(x=>x.cinematicSignalCount===1).length;
    const bestEvidenceMultiple=eligible.filter(x=>x.cinematicSignalCount>=2).length;
    const arranged=anchorBalance.balance(engine.balanceShelves({
      entries:eligible,profileEntries:complete,impressions:ratings,category:'movies',size:5
    }),5);
    const top=arranged.slice(0,5),next=arranged.slice(5,10);
    const selectedKeys=[...top,...next].map(x=>x.key);
    const candidateFeatures=complete.filter(x=>!rated.has(x.key));
    // SHADOW DIAGNOSTICS ONLY: do not add these tags to scored entries.
    // A shared literal synopsis phrase is not a verified stylistic fit.
    const fpSummary={fingerprintExtraPlotTitles:0,fingerprintExplicitDeviceTitles:0,
     fingerprintLinkedTitles:0,fingerprintNewPlotLinks:0,
     fingerprintWithSynopsis:0,fingerprintWithCreatorCredit:0,
     fingerprintWithMappedKeywords:0,fingerprintWithOriginalKeywords:0,
     fingerprintWithPlotClues:0,
     fingerprintRawKeywordLinkedTitles:0,fingerprintRawKeywordOnlyTitles:0,
     fingerprintRawKeywordUnqualifiedTitles:0};
    if(fingerprint?.build&&fingerprint?.compare){
     const sourceItems=complete.filter(x=>["Loved","Liked"].includes(ratings[x.key]));
     const sourceFp=sourceItems.map(x=>({entry:x,fp:fingerprint.build(x)}));
     for(const candidate of candidateFeatures){
      const current=fingerprint.build(candidate);
      if(current.sourceEvidence.hasSynopsis)fpSummary.fingerprintWithSynopsis++;
      if(current.sourceEvidence.hasCredits)fpSummary.fingerprintWithCreatorCredit++;
      if(current.sourceEvidence.hasMappedKeywords)fpSummary.fingerprintWithMappedKeywords++;
      if(current.sourceEvidence.hasOriginalKeywordNames)fpSummary.fingerprintWithOriginalKeywords++;
      if(current.sourceEvidence.hasLiteralPlotClues)fpSummary.fingerprintWithPlotClues++;
      const baseKnown=new Set((candidate.facets?.narrativeThemes||[]).map(x=>String(x).toLowerCase()));
      const extra=current.synopsisClues.plotTopics.values.filter(x=>!baseKnown.has(x));
      if(extra.length)fpSummary.fingerprintExtraPlotTitles++;
      if(current.synopsisClues.explicitDevices.values.length)fpSummary.fingerprintExplicitDeviceTitles++;
      const comparisons=sourceFp.map(x=>fingerprint.compare(current,x.fp));
      if(comparisons.some(x=>x.specificLinkKinds>0))
       fpSummary.fingerprintLinkedTitles++;
      // Community-tag coincidence is a candidate for investigation, not a
      // verified recommendation reason. The live ranker ignores these labels.
      const rawLabelConnections=comparisons.flatMap(x=>x.links
       .filter(link=>link.type==="shared-original-catalog-keyword"));
      const existingSpecific=comparisons.some(x=>x.links.some(link=>
       link.type!=="shared-genre"&&link.type!=="shared-original-catalog-keyword"));
      if(rawLabelConnections.length){
       fpSummary.fingerprintRawKeywordLinkedTitles++;
       if(!existingSpecific)fpSummary.fingerprintRawKeywordOnlyTitles++;
       if(!eligibleKeys.has(candidate.key))fpSummary.fingerprintRawKeywordUnqualifiedTitles++;
      }
      if(sourceFp.some(x=>{
       const otherKnown=new Set((x.entry.facets?.narrativeThemes||[]).map(v=>String(v).toLowerCase()));
       const otherExtra=x.fp.synopsisClues.plotTopics.values.filter(v=>!otherKnown.has(v));
       return otherExtra.some(v=>extra.includes(v));
      }))fpSummary.fingerprintNewPlotLinks++;
     }
    }
    // Independent SHADOW pass. Both negatives and positives are fictional.
    const keywordStats=(keywordAudit?.inspect)?keywordAudit.inspect({
      positive:complete.filter(x=>["Loved","Liked"].includes(ratings[x.key])),
      negative:[...complete.filter(x=>ratings[x.key]==="Not for me"),...shadowNegativeEnriched],
      candidates:candidateFeatures,qualifiedKeys:eligibleKeys
    }):null;
    const keywordCounts={
      keywordRawLinks:keywordStats?.candidatesWithRawPositiveOverlap||0,
      keywordSpecificLinks:keywordStats?.candidatesWithSpecificOverlap||0,
      keywordGenericOnly:keywordStats?.candidatesOnlyGenericOrCommon||0,
      keywordMultiLabel:keywordStats?.candidatesWithTwoOrMoreSpecificLabels||0,
      keywordNegativeOverlap:keywordStats?.candidatesWithSpecificNegativeOverlap||0,
      keywordNegativeSpecific:keywordStats?.candidatesWithAnyNegativeSpecificOverlap||0,
      keywordNegativeOnly:keywordStats?.candidatesWithNegativeOnly||0,
      keywordPositiveOnly:keywordStats?.candidatesWithPositiveOnly||0,
      keywordMixedPositiveNegative:keywordStats?.candidatesWithMixedPositiveNegative||0,
      keywordDifferentLabelConflict:keywordStats?.candidatesWithDifferentLabelConflict||0,
      keywordQualifiedWithMixedEvidence:keywordStats?.qualifiedWithMixedEvidence||0,
      keywordQualifiedWithExactConflict:keywordStats?.qualifiedWithExactKeywordConflict||0,
      keywordQualifiedWithNegativeOnly:keywordStats?.qualifiedWithNegativeOnly||0,
      keywordNegativeAnchors:keywordStats?.negativeAnchors||0,
      keywordShadowNegativesUnresolved,
      keywordCatalogLabels:keywordStats?.catalogKeywordsSeen||0,
      keywordPoolCommonCutoff:keywordStats?.poolCommonCutoff||0
    };
    // Corroboration requires distinct factual modalities tied to the SAME
    // positive Log title as the keyword; same-source mapped tags do not count.
    // Purely diagnostic: never passed into the existing ranker/policy.
    const corroborationStats=corroboration?.inspect&&fingerprint&&keywordAudit
     ?corroboration.inspect({
       positive:complete.filter(x=>["Loved","Liked"].includes(ratings[x.key])),
       negative:[...complete.filter(x=>ratings[x.key]==="Not for me"),...shadowNegativeEnriched],
       candidates:candidateFeatures,qualifiedKeys:eligibleKeys,fingerprint,keywordAudit
      }):null;
    const corroborationCounts={
      corroborationKeywordLinked:corroborationStats?.keywordLinked||0,
      corroborationKeywordOnly:corroborationStats?.keywordOnly||0,
      corroborationWithVerifiedCreator:corroborationStats?.keywordWithVerifiedCreator||0,
      corroborationWithSynopsisClue:corroborationStats?.keywordWithSynopsisTopic||0,
      corroborationWithStoryDevice:corroborationStats?.keywordWithExplicitStoryDevice||0,
      corroborationWithIndependentFacet:corroborationStats?.keywordWithAnyIndependentFacet||0,
      corroborationWithMultipleIndependentKinds:corroborationStats?.keywordWithTwoIndependentKinds||0,
      corroborationCrossAnchorOnly:corroborationStats?.keywordWithDifferentAnchorFacetOnly||0,
      corroborationQualifiedWithIndependentFacet:corroborationStats?.qualifiedWithIndependentFacet||0,
      corroborationQualifiedKeywordOnly:corroborationStats?.qualifiedKeywordOnly||0,
      corroborationWithNegativeCollision:corroborationStats?.keywordWithNegativeCollision||0,
      corroborationWithNegativeCollisionAndIndependentFacet:corroborationStats?.corroboratedWithNegativeCollision||0,
      corroborationWithMixedNegativeEvidence:corroborationStats?.keywordWithMixedNegativeEvidence||0,
      corroborationWithMixedNegativeEvidenceAndIndependentFacet:corroborationStats?.corroboratedWithMixedNegativeEvidence||0
    };
    // Opt-in original or rights-cleared human review, never inferred from TMDB.
    // No annotations in the ordinary real-catalog run means UNKNOWN coverage.
    const observationSummary=editorialEvaluation?.inspect&&editorialEvidence?.parse
      ?editorialEvaluation.inspect({
        observations:Array.isArray(editorialObservations)?editorialObservations.slice(0,80):[],
        positiveKeys:complete.filter(x=>["Loved","Liked"].includes(ratings[x.key])).map(x=>x.key),
        candidateKeys:candidateFeatures.map(x=>x.key),
        qualifiedKeys:[...eligibleKeys],editorialEvidence
       }):null;
    const editorialCounts={
      editorialReviewedPositive:observationSummary?.reviewedPositiveAnchors||0,
      editorialReviewedCandidates:observationSummary?.reviewedCandidates||0,
      editorialMultiDimensionCandidates:observationSummary?.candidatesWithMultiDimensionEditorialMatch||0,
      editorialQualifiedMultiDimensionCandidates:observationSummary?.qualifiedCandidatesWithMultiDimensionEditorialMatch||0,
      editorialUnknownCandidates:observationSummary?.fullyUnknownCandidates||candidates.length,
      editorialConflictedCandidates:observationSummary?.candidatesWithAmbiguousEditorialEvidence||0
    };
    const row={profile:profile.name,historyTitles:found.length,positiveAnchors:selected.length,
     titleRequests:plans.length,recommendationFailures,browseFailures,metadataFailures,
     invalidProviderItems:invalid,providerDuplicates:duplicated,uniqueRetrieved:all.length,
     evaluatedCandidates:candidates.length,deferredCandidates:Math.max(0,all.length-candidates.length),
     metadataRequested,metadataReturned:metadata.size,
     candidateThemes:candidateFeatures.filter(x=>has(facetsOf(x),'themes')).length,
     candidateTones:candidateFeatures.filter(x=>has(facetsOf(x),'tones')).length,
     candidatePlot:candidateFeatures.filter(x=>has(facetsOf(x),'narrativeThemes')).length,
     candidateDirector:candidateFeatures.filter(x=>has(facetsOf(x),'directors')).length,
     qualified:eligible.length,multiSignalEligible:bestEvidenceMultiple,
     synopsisOnlyEligible:eligible.filter(x=>x.cinematicSynopsisOnly).length,
     legacyPositive:legacyRanked.filter(x=>x.score>0).length,
     bestEvidenceNone,bestEvidenceSingle,bestEvidenceMultiple,...funnel,...routes,...fpSummary,...keywordCounts,...corroborationCounts,...editorialCounts,
     firstShelfComplete:Number(top.length===5),secondShelfComplete:Number(next.length===5),
     topGenres:unique(top.flatMap(x=>facetsOf(x).genres||[])).length,
     topAnchors:unique(top.map(x=>x.cinematicAnchor).filter(Boolean)).length,
     duplicateViolations:selectedKeys.length-unique(selectedKeys).length,
     ratedTitleViolations:selectedKeys.filter(key=>rated.has(key)).length,
     candidateAccounting:eligible.length+Object.values(funnel).reduce((a,b)=>a+b,0)===candidates.length?'reconciled':'mismatch',
     diagnosticHint:candidates.length<5?'candidate-supply':metadata.size<keys.length/2?
      'metadata-request-coverage':eligible.length<5?'eligibility-coverage':
      bestEvidenceMultiple===0?'single-signal-evidence':'no-obvious-structural-blocker',
     note:'Structural public catalog result only; no empirical viewer-interest label'};
    reports.push(row);
   }catch(err){reports.push({profile:profile.name,error:String(err?.message||err).slice(0,180)})}
   onProgress({current:i+1,total:profiles.length,name:profile.name,stage:'Finished'});
  }
  return {format:'afterlogue-real-catalog-batch-audit-v1',build:'taste-v2.1',createdAt:new Date().toISOString(),
   publicCatalog:true,fictionalLogs:true,completed:reports.length,cancelled:reports.length<profiles.length,
   requestBudget:{maxProfiles:profiles.length,maxPlansPerProfile:maxPlans,maxEvaluatedCandidatesPerProfile:maxCandidates},
   summary:summarize(reports),profiles:reports,
   limitations:['These are real provider records but fictional viewing histories and a bounded catalog sample.',
    'This bounded QA retrieval differs from the full interactive Lab retrieval plan.',
    'Coverage, diversity and eligibility do not establish movie appeal or individual psychological preference.',
    'Missing film metadata is unknown rather than negative taste evidence.',
   'Candidate rejection categories are exclusive but diagnostic, not a causal explanation for taste.',
   'Source-specific yields are based on this bounded sample, not global TMDB search relevance.',
   'Cinematic Fingerprint tags are experimental, based on literal synopsis phrasing, and are excluded from recommendation scoring.',
   'Keyword specificity is a within-sample heuristic. Multiple community tags are not independent proof of film similarity and do not affect scoring.',
   'Fictional shadow dislikes never change retrieval, ranking or eligibility; unresolved shadow controls reduce confidence in negative comparisons.',
   'Corroboration counts cross-metadata evidence for the SAME positive Log film. TMDB synopsis clues are not verified film style or empirical human preference.',
   'Original editorial observations are absent by default and unknown; only explicitly reviewed rights-cleared annotations can support subjective cinematic attributes.',
    'No private Log, real member ID, or user interest responses were accessed.']};
 }
 return Object.freeze({run,summarize,chooseAnchors});
});
