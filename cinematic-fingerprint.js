/* AFTERLOGUE LAB / CINEMATIC FINGERPRINT — observational descriptors, not film criticism.
 * Source-first and explainable. Never infer visual style, pace, emotional tone,
 * narrative structure or user taste from a genre or a vague synopsis.
 * Runs independently of the production ranker; no personal data or network access. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueCinematicFingerprint=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 // Only clearly explicit synopsis language. These describe plot/format cues,
 // NOT verified artistic style. Deliberately conservative (low recall).
 const topics=Object.freeze({
  caregiving:/\b(caregiver|caregiving|caring for (?:an?|the) (?:ailing|elderly|sick)|looks after (?:his|her|their) (?:ailing|elderly|sick))\b/i,
  mentorship:/\b(mentor|mentorship|mentors|apprentice|under the tutelage|tutors?)\b/i,
  displacement:/\b(displaced|forced to flee|evicted|homeless|loses (?:his|her|their) home)\b/i,
  homecoming:/\b(returns? to (?:his|her|their) hometown|back to (?:his|her|their) hometown|returns? home after)\b/i,
  rivalry:/\b(rival|rivalry|rivals|competing for)\b/i,
  reconciliation:/\b(reconcile|reconciliation|mend their relationship)\b/i,
  imprisonment:/\b(imprisoned|prisoner|incarcerated|behind bars)\b/i,
  addiction:/\b(addiction|recovering alcoholic|struggles with alcohol|substance abuse)\b/i,
  politicalUnrest:/\b(civil war|political unrest|political uprising)\b/i,
  imposture:/\b(impersonat(?:e|es|ion|ing)|pretends to be|assumes (?:another|a false) identity)\b/i,
  roadJourney:/\b(road trip|cross.country trip|travels? across|long journey)\b/i,
  legalConflict:/\b(courtroom|wrongful conviction|lawsuit|legal battle|criminal trial)\b/i,
  artisticPractice:/\b(novelist|filmmaker|painter|composer|screenwriter|photographer)\b/i
 });
 const devices=Object.freeze({
  timeLoop:/\b(time loop|repeats? the same day|reliv(?:es|ing) the same day)\b/i,
  timeTravel:/\b(time travell?(?:ing|er|ed?)|travels? (?:back|forward) in time)\b/i,
  flashbacks:/\b(flashbacks?|told in flashbacks)\b/i,
  multiplePerspectives:/\b(multiple perspectives|several points of view|different points of view)\b/i,
  foundFootage:/\b(found[- ]footage|recovered (?:video|footage|tapes))\b/i,
  explicitlyNonlinear:/\b(non[- ]linear narrative|told out of chronological order|out of sequence)\b/i,
  voiceover:/\b(voice[- ]over narration|narrated in voice[- ]over)\b/i,
  epistolary:/\b(told through letters|letters and diary entries)\b/i,
  realTime:/\b(real[- ]time (?:narrative|storytelling)|unfolds in real time)\b/i
 });
 const clean = a => [...new Set((Array.isArray(a)?a:[]).filter(x=>typeof x==="string"&&x.trim())
   .map(x=>x.trim().toLowerCase()))];
 const detect=(input,rules)=>{
  const text=typeof input==="string"?input.slice(0,2200):"";
  if(!text)return [];
  // The synopsis is untrusted descriptive copy. Tags are only grounded
  // lexical clues, not semantically validated film attributes.
  return Object.entries(rules).filter(([,re])=>re.test(text)).map(([key])=>key.replace(/[A-Z]/g,x=>"-"+x.toLowerCase()));
 };
 const record=(values,source,certainty)=>({values:clean(values),source,certainty});
 function build(entry={}){
  const f=entry.facets||{};
  const synopsis=typeof entry.synopsis==="string"?entry.synopsis:"";
  const knownTopics=clean(f.narrativeThemes);
  const fromText=detect(synopsis,topics);
  const plotTopics=clean([...knownTopics,...fromText]);
  const rawKeywordNames=clean(f.keywordNames||f.rawKeywords||entry.keywordNames);
  const narrativeDevices=detect(synopsis,devices);
  const result={
   key:typeof entry.key==="string"?entry.key:null,
   // TMDB details support genre IDs and person-credit IDs directly.
   verified:{
    genres:record(f.genres,"tmdb-genre","direct"),
    directors:record(f.directors,"tmdb-person-credit","direct"),
    writers:record(f.writers,"tmdb-person-credit","direct")
   },
   // Mapped keyword labels are hints; do not portray as observed film style.
   keywordHints:{
    rawKeywordNames:record(rawKeywordNames,"tmdb-community-keyword","catalog-label-not-verified-film-style"),
    themes:record(f.themes,"tmdb-keyword-map","inferred-from-keyword"),
    tones:record(f.tones,"tmdb-keyword-map","inferred-from-keyword")
   },
   synopsisClues:{
    plotTopics:record(plotTopics,"literal-synopsis-phrase","unverified-plot-clue"),
    explicitDevices:record(narrativeDevices,"literal-synopsis-phrase","unverified-plot-clue")
   },
   editorial:{
    pacing:typeof f.pace==="string"&&f.pace.trim()
     ?{value:f.pace.trim().toLowerCase(),source:"provided-editorial-facet",certainty:"unverified"}:null
   },
   // Do not invent subjectively assessed style without a licensable, auditable source.
   unknown:[
    ...(!f.pace?["pacing"]:[]),
    "visual-style","editing-rhythm","performance-style",
    ...(narrativeDevices.length?[]:["narrative-structure"])
   ],
   sourceEvidence:{
    hasSynopsis:!!synopsis.trim(),
    hasOriginalKeywordNames:rawKeywordNames.length>0, // Optional label field from separate Lab catalog response.
    hasGenres:clean(f.genres).length>0,
    hasCredits:clean([...(f.directors||[]),...(f.writers||[])]).length>0,
    hasMappedKeywords:clean([...(f.themes||[]),...(f.tones||[])]).length>0,
    hasLiteralPlotClues:plotTopics.length>0||narrativeDevices.length>0
   }
  };
  return result;
 }
 function compare(candidate,anchor){
  const a=candidate?.verified?candidate:build(candidate);
  const b=anchor?.verified?anchor:build(anchor);
  const overlap=(x,y)=>{
   const values=new Set(y.values||[]);
   return (x.values||[]).filter(value=>values.has(value));
  };
  const links=[
   ["shared-director-credit","verified",overlap(a.verified.directors,b.verified.directors)],
   ["shared-writer-credit","verified",overlap(a.verified.writers,b.verified.writers)],
   ["shared-genre","broad",overlap(a.verified.genres,b.verified.genres)],
   ["shared-mapped-theme","keyword-hint",overlap(a.keywordHints.themes,b.keywordHints.themes)],
   ["shared-mapped-tone","keyword-hint",overlap(a.keywordHints.tones,b.keywordHints.tones)],
   ["shared-original-catalog-keyword","community-catalog-label",
     overlap(a.keywordHints.rawKeywordNames,b.keywordHints.rawKeywordNames)],
   ["shared-synopsis-topic","plot-clue",overlap(a.synopsisClues.plotTopics,b.synopsisClues.plotTopics)],
   ["shared-explicit-device","plot-clue",overlap(a.synopsisClues.explicitDevices,b.synopsisClues.explicitDevices)]
  ].filter(([, ,values])=>values.length).map(([type,evidenceLevel,values])=>({type,evidenceLevel,values}));
  return {links,
   hasVerifiedCreatorConnection:links.some(x=>x.type==="shared-director-credit"||x.type==="shared-writer-credit"),
   // Do not count a broad shared genre as a convincing cinematic fingerprint.
   specificLinkKinds:links.filter(x=>x.type!=="shared-genre").length};
 }
 function summarize(entries=[]){
  const fp=(entries||[]).map(build);
  const count=pred=>fp.filter(pred).length;
  const n=fp.length;
  const percent=value=>n?value/n:0;
  const originalSynopses=count(f=>f.sourceEvidence.hasSynopsis);
  const verifiedCreator=count(f=>f.sourceEvidence.hasCredits);
  const mappedKeywords=count(f=>f.sourceEvidence.hasMappedKeywords);
  const originalKeywords=count(f=>f.sourceEvidence.hasOriginalKeywordNames);
  const plotClues=count(f=>f.sourceEvidence.hasLiteralPlotClues);
  const devices=count(f=>f.synopsisClues.explicitDevices.values.length>0);
  return {titles:n,withSynopsis:originalSynopses,withVerifiedCredits:verifiedCreator,
   withMappedKeywordHints:mappedKeywords,withOriginalKeywordNames:originalKeywords,withAnyLiteralPlotClue:plotClues,
   withExplicitNarrativeDeviceClue:devices,
   synopsisCoverage:percent(originalSynopses),verifiedCreditCoverage:percent(verifiedCreator),
   mappedKeywordHintCoverage:percent(mappedKeywords),originalKeywordNameCoverage:percent(originalKeywords),literalPlotClueCoverage:percent(plotClues),
   metadataWithoutPlotClues:count(f=>!f.sourceEvidence.hasLiteralPlotClues),
   note:"These fields describe available evidence, not truth of artistic interpretation. Unknown remains unknown."};
 }
 return Object.freeze({build,compare,summarize,detect});
});
