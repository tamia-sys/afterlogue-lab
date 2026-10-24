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
   secondShelfCompletionRate:ratio(sum('secondShelfComplete'),successes.length),
   metadataReturnRate:ratio(sum('metadataReturned'),sum('metadataRequested')),
   candidateThemeCoverage:ratio(sum('candidateThemes'),sum('evaluatedCandidates')),
   candidateToneCoverage:ratio(sum('candidateTones'),sum('evaluatedCandidates')),
   candidatePlotCoverage:ratio(sum('candidatePlot'),sum('evaluatedCandidates')),
   multiSignalEligibleShare:ratio(sum('multiSignalEligible'),sum('qualified')),
   meanDistinctGenresFirstFive:mean('topGenres'),
   meanDistinctPositiveLogAnchorsFirstFive:mean('topAnchors'),
   duplicateViolations:sum('duplicateViolations'),ratedTitleViolations:sum('ratedTitleViolations'),
   titleRecommendationFailures:sum('recommendationFailures'),
   independentBrowseFailures:sum('browseFailures'),metadataFailures:sum('metadataFailures')};
 }
 async function run({profiles,api,resolveTitle,toEntry,features,enrich,engine,cinematic,policy,
   anchorBalance,onProgress=()=>{},shouldCancel=()=>false,maxPlans=4,maxCandidates=60}={}){
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
    const keys=unique([...sources,...candidates].map(x=>x.key)),metadataRequested=keys.length;
    let metadata=new Map(),metadataFailures=0;
    try{metadata=await features(keys)}catch(err){metadataFailures++}
    if(shouldCancel())break;
    const complete=[...enrich(sources,metadata),...enrich(candidates,metadata)];
    const scored=cinematic.rank(engine.rank({entries:complete,category:'movies',impressions:ratings}),complete,ratings);
    const eligible=policy.eligible(scored,{ratedKeys:[...rated]});
    const arranged=anchorBalance.balance(engine.balanceShelves({
      entries:eligible,profileEntries:complete,impressions:ratings,category:'movies',size:5
    }),5);
    const top=arranged.slice(0,5),next=arranged.slice(5,10);
    const selectedKeys=[...top,...next].map(x=>x.key);
    const candidateFeatures=complete.filter(x=>!rated.has(x.key));
    const row={profile:profile.name,historyTitles:found.length,positiveAnchors:selected.length,
     titleRequests:plans.length,recommendationFailures,browseFailures,metadataFailures,
     invalidProviderItems:invalid,providerDuplicates:duplicated,uniqueRetrieved:all.length,
     evaluatedCandidates:candidates.length,deferredCandidates:Math.max(0,all.length-candidates.length),
     metadataRequested,metadataReturned:metadata.size,
     candidateThemes:candidateFeatures.filter(x=>has(facetsOf(x),'themes')).length,
     candidateTones:candidateFeatures.filter(x=>has(facetsOf(x),'tones')).length,
     candidatePlot:candidateFeatures.filter(x=>has(facetsOf(x),'narrativeThemes')).length,
     candidateDirector:candidateFeatures.filter(x=>has(facetsOf(x),'directors')).length,
     qualified:eligible.length,multiSignalEligible:eligible.filter(x=>x.cinematicSignalCount>=2).length,
     synopsisOnlyEligible:eligible.filter(x=>x.cinematicSynopsisOnly).length,
     firstShelfComplete:Number(top.length===5),secondShelfComplete:Number(next.length===5),
     topGenres:unique(top.flatMap(x=>facetsOf(x).genres||[])).length,
     topAnchors:unique(top.map(x=>x.cinematicAnchor).filter(Boolean)).length,
     duplicateViolations:selectedKeys.length-unique(selectedKeys).length,
     ratedTitleViolations:selectedKeys.filter(key=>rated.has(key)).length,
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
    'No private Log, real member ID, or user interest responses were accessed.']};
 }
 return Object.freeze({run,summarize,chooseAnchors});
});
