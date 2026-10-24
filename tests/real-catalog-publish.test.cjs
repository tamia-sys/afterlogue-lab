'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sanitize}=require('./real-catalog-publish.cjs');
test('published digest contains only allowed numeric fields and fixed fictional profile labels',()=>{
 const raw={kind:'afterlogue-public-catalog-smoke-v1',checkedAt:'2026-10-24T07:00:00.000Z',
  provider:{requests:12,failed:1,privateToken:'NEVER_PUBLISH'},
  summary:{profilesAttempted:2,profilesCompleted:1,
   fingerprintRawKeywordCoverage:0,candidateQualificationRate:.47,
   leakedFilm:'PRIVATE_FILM_TITLE',consumerName:'DO_NOT_LEAK'},
  profiles:[{profile:'Private real human',status:'completed',found:35,
   evaluated:24,qualified:8,withOriginalKeywords:0,
   diagnosticHint:'single-signal-evidence',movieTitle:'PRIVATE_FILM_TITLE',
   personalEmail:'private@example.com',secret:'NEVER_PUBLISH'}]};
 const publicDigest=sanitize(raw),s=JSON.stringify(publicDigest);
 assert.equal(publicDigest.summary.profilesCompleted,1);
 assert.equal(publicDigest.summary.candidateQualificationRate,.47);
 assert.equal(publicDigest.profiles[0].profile,'Fictional Cinephile');
 assert.equal(publicDigest.profiles[0].withOriginalKeywords,0);
 assert.equal(publicDigest.requests,12);
 assert.equal(publicDigest.status,'partially_or_fully_completed');
 for(const secret of ['PRIVATE_FILM_TITLE','DO_NOT_LEAK','NEVER_PUBLISH','private@example.com',
  'Private real human'])assert.equal(s.includes(secret),false);
});
test('does not publish arbitrary strings or nonnumeric benchmark fields',()=>{
 const raw={kind:'afterlogue-public-catalog-smoke-v1',provider:{requests:'100'},
  summary:{profilesCompleted:'42',meanQualifiedCandidates:Infinity},
  profiles:[{status:'error',message:'token=123',diagnosticHint:'custom diagnostic',found:'123'}]};
 const x=sanitize(raw);
 assert.equal(x.summary.profilesCompleted,null);
 assert.equal(x.summary.meanQualifiedCandidates,null);
 assert.equal(x.requests,null);
 assert.equal(x.profiles[0].status,'failed');
 assert.equal(x.profiles[0].diagnosticHint,null);
 assert.equal(JSON.stringify(x).includes('token=123'),false);
});
test('reject unrecognized input shapes',()=>{
 assert.throws(()=>sanitize(null),/Invalid report format/);
 assert.throws(()=>sanitize({kind:'unknown'}),/Invalid report format/);
});
