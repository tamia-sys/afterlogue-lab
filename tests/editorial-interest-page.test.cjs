'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','editorial-interest.html'),'utf8');
const reviewerHtml=fs.readFileSync(path.join(__dirname,'..','editorial-pilot.html'),'utf8');
test('blind interest research is accessible from the separate editorial review pilot',()=>{
 assert.match(reviewerHtml,/href="editorial-interest\.html"/);
 assert.match(html,/href="editorial-pilot\.html"/);
 assert.match(html,/editorial-consensus\.js\?v=consensus-1/);
 assert.match(html,/editorial-interest-holdout\.js\?v=interest-holdout-1/);
});
test('offline study has no network, telemetry, browser storage or production endpoint',()=>{
 assert.doesNotMatch(html,/\bfetch\s*\(|XMLHttpRequest|sendBeacon\s*\(|WebSocket\s*\(/);
 assert.doesNotMatch(html,/\blocalStorage\s*\.|\bsessionStorage\s*\.|\bindexedDB\s*\./);
 assert.doesNotMatch(html,/supabase\.co|afterlogue-catalog|sb_publishable_|\/rest\/v1\//);
 assert.match(html,/Entirely offline/);
 assert.match(html,/not saved automatically/);
});
test('self-declared watched anchors and unseen target votes are required before evaluating',()=>{
 for(const id of ['review-files','load','load-status','survey','positive','negative','anchor-attest',
 'target-list','evaluate','results','results-section','export','survey-status']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(html,/if\(!consensus\|\|!\$\("anchor-attest"\)\.checked\)/);
 assert.match(html,/if\(\$\("positive"\)\.value===\$\("negative"\)\.value\)/);
 assert.match(html,/if\(!targets\.length\)/);
 assert.match(html,/interest\.evaluate\(\{consensus,anchors,targets\}\)/);
 assert.match(html,/I'm not one of the two reviewers/);
});
test('hypotheses are masked until after interest responses and results are aggregate',()=>{
 assert.match(html,/invalidate\(\);/);
 assert.match(html,/summary/); // paragraph descriptions do not reveal film predictions
 assert.doesNotMatch(html,/report\.predictions\[/);
 assert.doesNotMatch(html,/querySelector\("\.prediction"\)/);
 assert.match(html,/Individual film predictions are never revealed/);
 assert.match(html,/afterlogue-interest-holdout-aggregate\.json/);
});
test('inline browser study script parses and file import is bounded',()=>{
 const code=[...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
 assert.equal(code.length,1);
 assert.doesNotThrow(()=>new vm.Script(code[0][1]));
 assert.match(html,/files\.length!==2/);
 assert.match(html,/files\.some\(x=>x\.size>500000\)/);
});
