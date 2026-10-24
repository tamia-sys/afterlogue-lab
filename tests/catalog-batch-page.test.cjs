'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('live Lab-only page loads optional public-catalog batch auditor and has operational controls',()=>{
 assert.match(html,/<script src="catalog-batch-audit\.js\?v=real-catalog-4"><\/script>/);
 for(const id of ['run-batch','cancel-batch','export-batch','batch-status','batch-output'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 assert.match(html,/AfterlogueCatalogBatchAudit\.run\(/);
 assert.match(html,/meanMissingEvidenceRejections/);
 assert.match(html,/qualifiedBrowseOnly/);
 assert.match(html,/candidateAccounting/);
 assert.match(html,/renderBatchAudit\(report\)/);
 assert.match(html,/shouldCancel:\(\)=>batchCancelled/);
});
test('source-labeled cinematic fingerprint is shown only in shadow diagnostics',()=>{
 assert.match(html,/cinematic-fingerprint\.js\?v=fingerprint-1/);
 assert.match(html,/id="fingerprint-audit"/);
 assert.match(html,/AfterlogueCinematicFingerprint\.summarize\(choices\)/);
 assert.match(html,/fingerprint:window\.AfterlogueCinematicFingerprint/);
 assert.match(html,/fpCandidates\.withExplicitNarrativeDeviceClue/);
 assert.match(html,/fingerprintExtraPlotClueCoverage/);
 assert.match(html,/fingerprintRawKeywordLinkedTitles/);
});
test('feedback calibration uses the score frozen at first display',()=>{
 assert.match(html,/<script src="interest-calibration\.js\?v=calibration-1"><\/script>/);
 assert.match(html,/displayedScores\.set\(item\.key,Number\(item\.score\)\)/);
 assert.match(html,/AfterlogueInterestCalibration\.summarize\(/);
 assert.match(html,/displayedScores\.clear\(\)/);
 assert.match(html,/id="score-calibration"/);
});
test('inline browser script parses; audit does not change the production website',()=>{
 const inline=[...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
 assert.equal(inline.length,1);
 assert.doesNotThrow(()=>new vm.Script(inline[0][1]));
 assert.match(html,/Development preview only/);
});
test('all lab telemetry event types are database-accepted; pipeline audit piggybacks on batch_shown',()=>{
 const emitted=[...html.matchAll(/track\("([^"]+)"/g)].map(x=>x[1]);
 const allowed=new Set(['session_start','batch_shown','feedback','batch_error']);
 assert.ok(emitted.every(x=>allowed.has(x)),JSON.stringify(emitted.filter(x=>!allowed.has(x))));
 assert.doesNotMatch(html,/track\("pipeline_audit"/);
 assert.match(html,/pipeline_audit:pendingPipelineAudit/);
 assert.match(html,/pendingPipelineAudit=null/);
});
