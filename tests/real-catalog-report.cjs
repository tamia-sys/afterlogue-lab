#!/usr/bin/env node
/* Build a human-readable GitHub Actions summary from aggregate-only audit JSON. */
'use strict';
const fs=require('node:fs');
const file=process.argv[2]||'reports/real-catalog-smoke.json';
if(!fs.existsSync(file)){
 console.log('### Public catalog audit\n\nNo completed report was produced. Inspect the preceding test step for a provider or workflow error.\n');
 process.exit(0);
}
const report=JSON.parse(fs.readFileSync(file,'utf8'));
if(report.kind!=='afterlogue-public-catalog-smoke-v1')throw Error('Unrecognized audit report');
const s=report.summary||{},profiles=report.profiles||[];
const percentage=x=>Number.isFinite(x)?Math.round(x*100)+'%':'n/a';
const safeNumber=x=>Number.isFinite(x)?String(x):'—';
const lines=[
 '### Afterlogue — public film-catalog smoke audit',
 '',
 '**Fictional profiles only.** This is metadata and structural coverage, not a measure of human interest.',
 '',
 '| Measurement | Result |',
 '|---|---:|',
 '| Profiles completed | '+safeNumber(s.profilesCompleted)+'/'+safeNumber(s.profilesAttempted)+' |',
 '| Five-film shelf completion | '+percentage(s.firstShelfCompletionRate)+' |',
 '| Qualified candidates per profile (mean) | '+safeNumber(s.meanQualifiedCandidates)+' |',
 '| Theme coverage of enriched candidates | '+percentage(s.candidateThemeCoverage)+' |',
 '| Tone coverage of enriched candidates | '+percentage(s.candidateToneCoverage)+' |',
 '| Additional literal plot clues (shadow only) | '+percentage(s.fingerprintExtraPlotClueCoverage)+' |',
 '| Explicit storytelling-device clues (shadow only) | '+percentage(s.fingerprintExplicitDeviceCoverage)+' |',
 '| Qualifying candidates with multi-signal strongest match | '+percentage(s.multiSignalEligibleShare)+' |',
 '| Duplicate violations | '+safeNumber(s.duplicateViolations)+' |',
 '| Already-rated-title violations | '+safeNumber(s.ratedTitleViolations)+' |',
 '',
 '| Fictional viewer | Status | Evaluated | Qualified | Extra clue titles |',
 '|---|---|---:|---:|---:|'
];
for(const row of profiles){
 const name=String(row.profile||'Fictional viewer').replace(/[|<>\r\n]/g,'').slice(0,40);
 lines.push('| '+name+' | '+(row.status==='completed'?'completed':'failed')+' | '+
  safeNumber(row.evaluated)+' | '+safeNumber(row.qualified)+' | '+
  safeNumber(row.extraPlotClueTitles)+' |');
}
lines.push('','This is a **bounded public-catalog sample**. Fingerprint clues are kept out of ranking and production. The report never contains movie titles or individual account data.','');
console.log(lines.join('\n'));
