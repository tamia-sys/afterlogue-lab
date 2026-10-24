#!/usr/bin/env node
/**
 * Convert a bounded real-catalog QA report to a safe source-controlled digest.
 * Contains ONLY numeric aggregate metrics + fixed fictional-profile labels.
 * No film data, no TMDB IDs, no user events or identifiers, no API responses.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const input=process.argv[2]||'reports/real-catalog-smoke.json';
const output=process.argv[3]||'docs/real-catalog-latest.json';
const metrics=[
 'profilesAttempted','profilesCompleted','profilesFailed',
 'meanUniqueRetrieved','meanEvaluatedCandidates','meanQualifiedCandidates',
 'firstShelfCompletionRate','secondShelfCompletionRate','candidateQualificationRate',
 'metadataReturnRate','candidateThemeCoverage','candidateToneCoverage','candidatePlotCoverage',
 'fingerprintSynopsisCoverage','fingerprintCreatorCoverage','fingerprintKeywordCoverage',
 'fingerprintRawKeywordCoverage','fingerprintAnyPlotClueCoverage',
 'fingerprintExtraPlotClueCoverage','fingerprintExplicitDeviceCoverage',
 'meanPotentialFingerprintLinks','meanPotentialNewPlotLinks','multiSignalEligibleShare',
 'linkedOnlyYield','browseOnlyYield','sharedRouteYield',
 'meanMissingEvidenceRejections','meanLowScoreRejections','meanUnanchoredRejections',
 'noBestEvidenceTypeCount','oneBestEvidenceTypeCount','multipleBestEvidenceTypeCount',
 'duplicateViolations','ratedTitleViolations','titleRecommendationFailures',
 'independentBrowseFailures','metadataFailures'
];
const fields=[
 'found','evaluated','metadataReturned','metadataRequested','qualified',
 'firstShelfComplete','secondShelfComplete','noEvidence','lowScore',
 'extraPlotClueTitles','potentialNewPlotLinks','separateStoryDeviceTitles',
 'withSynopsis','withCreatorCredit','withMappedKeywords','withOriginalKeywords',
 'withPlotClues','qualifiedTitleLinkedOnly','evaluatedTitleLinkedOnly',
 'qualifiedBrowseOnly','evaluatedBrowseOnly','bestEvidenceSingle','bestEvidenceMultiple'
];
function safeNumber(value){return typeof value==='number'&&Number.isFinite(value)?value:null;}
function sanitize(raw){
 if(!raw||raw.kind!=='afterlogue-public-catalog-smoke-v1')throw Error('Invalid report format');
 const summary=Object.fromEntries(metrics.map(key=>[key,safeNumber(raw.summary?.[key])]));
 const profiles=(raw.profiles||[]).slice(0,2).map((p,i)=>{
  const expected=['Fictional Cinephile','Fictional Eclectic'][i];
  return {profile:expected,
   status:p?.status==='completed'?'completed':'failed',
   ...Object.fromEntries(fields.map(key=>[key,safeNumber(p?.[key])])),
   countReconciled:p?.countReconciled===true,
   // These are known static diagnostic enum values; never copy error messages.
   diagnosticHint:['candidate-supply','metadata-request-coverage','eligibility-coverage',
    'single-signal-evidence','no-obvious-structural-blocker'].includes(p?.diagnosticHint)?p.diagnosticHint:null};
 });
 return {format:'afterlogue-aggregate-public-catalog-v1',
  checkedAt:/^\d{4}-\d\d-\d\dT/.test(String(raw.checkedAt))?raw.checkedAt:null,
  status:summary.profilesCompleted>0?'partially_or_fully_completed':'no_completed_profiles',
  fictionalOnly:true,shadowFingerprintOnly:true,
  requests:safeNumber(raw.provider?.requests),failedRequests:safeNumber(raw.provider?.failed),
  summary,profiles,
  disclaimer:'Aggregate structural evidence on a bounded public-catalog sample. Not human recommendation accuracy, not production results.'};
}
let report;
try{
 report=sanitize(JSON.parse(fs.readFileSync(input,'utf8')));
}catch(error){
 report={format:'afterlogue-aggregate-public-catalog-v1',
  status:'report_not_available',checkedAt:new Date().toISOString(),
  fictionalOnly:true,shadowFingerprintOnly:true,requests:null,
  failedRequests:null,summary:{},profiles:[],
  disclaimer:'No verified real-catalog report; consult GitHub Actions workflow logs.'};
}
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o644});
console.log('Wrote aggregate-only QA digest: '+report.status);
module.exports={sanitize};
