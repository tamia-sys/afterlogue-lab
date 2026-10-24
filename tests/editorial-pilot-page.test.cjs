'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','editorial-pilot.html'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('editorial pilot is separate from discover and does not load catalog or telemetry services',()=>{
 assert.match(index,/href="editorial-pilot\.html"/);
 assert.match(html,/editorial-evidence\.js\?v=editorial-2/);
 assert.match(html,/editorial-pilot\.js\?v=pilot-1/);
 assert.doesNotMatch(html,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\s*\(/);
 assert.doesNotMatch(html,/\blocalStorage\s*\.|\bsessionStorage\s*\.|\bindexedDB\s*\./);
 assert.doesNotMatch(html,/afterlogue-catalog|sb_publishable_|\/rest\/v1\//);
 assert.match(html,/No changes to recommendations/);
});
test('pilot form gates firsthand observation and local export behavior',()=>{
 for(const id of ['reviewer','film','review-date','attest','dimensions','save',
  'export','reset','author-status','saved','files','compare','export-summary','summary']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'unique control: '+id);
 }
 assert.match(html,/if\(!\$\("attest"\)\.checked\)/);
 assert.match(html,/evidence\.parse\(record\)/);
 assert.match(html,/pilot\.makePacket\(/);
 assert.match(html,/pilot\.compare\(/);
 assert.match(html,/new Blob\(/);
 assert.match(html,/URL\.createObjectURL\(/);
 assert.match(html,/Math\.round\(summary\.observedPairAgreement\*100\)/);
});
test('browser script is valid and never pre-populates presumed cinematic observations',()=>{
 const code=[...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
 assert.equal(code.length,1);
 assert.doesNotThrow(()=>new vm.Script(code[0][1]));
 assert.match(html,/Unknown \/ not observed/);
 assert.doesNotMatch(html,/value="measured"/);
});
test('pilot is research-only and available without involuntary upload',()=>{
 assert.match(html,/Offline by design/);
 assert.match(html,/not saved automatically/);
 assert.match(html,/2–6 separate reviewer exports/);
 assert.match(html,/not a technically enforced blind study/);
});
