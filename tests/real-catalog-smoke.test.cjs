'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {makeAdapter,options,execute,PROFILES}=require('./real-catalog-smoke.cjs');
test('CLI enforces small read-only request budget',()=>{
 assert.equal(options(['--profiles','1','--candidates','12','--plans','1']).profileLimit,1);
 assert.throws(()=>options(['--profiles','10']),/limits exceeded/);
 assert.throws(()=>options(['--candidates','200']),/limits exceeded/);
 assert.throws(()=>options(['--unknown','1']),/Invalid argument/);
});
test('public adapter uses only credential-free POST and reports bounded metadata',async()=>{
 const inputs=[],films=Array.from({length:40},(_,i)=>({
  id:100+i,title:'Catalog Test '+i,year:2020,
  poster:'https://example.invalid/poster.jpg',genres:['Drama'],
  synopsis:i%3===0?'A painter returns to her hometown after exile.':'The musician struggles to reconnect.',
  matched:['Perfect Days','Moonlight']
 }));
 const named=new Map(PROFILES.flatMap(p=>[...p.history.map(([title])=>title),...p.negativeControls]
  .map((title,i)=>[
   title,{id:500+i+title.length,title,poster:'https://example.invalid/poster.jpg',
    genres:['Drama'],synopsis:'A lonely filmmaker returns to their hometown.'}
 ])));
 const fetchImpl=async (url,request)=>{
  assert.match(url,/afterlogue-catalog-lab$/);
  assert.equal(request.method,'POST');
  assert.equal(request.headers['Content-Type'],'application/json');
  assert.equal(request.headers.Authorization,undefined);
  const payload=JSON.parse(request.body);inputs.push(payload);
  let response;
  switch(payload.mode){
   case 'search':response={items:named.has(payload.query)?[named.get(payload.query)]:[]};break;
   case 'recommend':response={items:films.slice(0,32)};break;
   case 'lab-browse':response={items:films.slice(12,35)};break;
   case 'taste-features':response={items:payload.keys.map(key=>({
    key,genres:['drama'],themes:['solitude','memory'],tones:['reflective'],
    directors:['tmdb-person-999'],writers:[],keywordNames:['train station','longing']}))};break;
   default:throw Error('Unexpected method '+payload.mode);
  }
  return {ok:true,text:async()=>JSON.stringify(response)};
 };
 const transport=makeAdapter({fetchImpl,timeoutMs:1000});
 const value=await transport.resolveTitle(PROFILES[0].history[0][0]);
 assert.ok(value?.id);
 const e=transport.toEntry(value,0);
 assert.ok(e.synopsis);
 assert.ok(e.facets.narrativeThemes.includes('solitude'));
 const enriched=transport.enrich([e],new Map([[e.key,{genres:['drama'],themes:['solitude'],
  tones:['reflective'],directors:['tmdb-person-999'],writers:[],keywordNames:['train station']}]]));
 assert.deepEqual(enriched[0].facets.directors,['tmdb-person-999']);
 assert.deepEqual(enriched[0].facets.keywordNames,['train station']);
 const result=await execute({profileLimit:1,candidates:18,plans:1},{fetchImpl,timeoutMs:2000});
 assert.equal(result.kind,'afterlogue-public-catalog-smoke-v1');
 assert.equal(result.summary.profilesCompleted,1);
 assert.equal(result.profiles[0].status,'completed');
 assert.equal(result.profiles[0].countReconciled,true);
 assert.ok(result.provider.requests>=4);
 assert.ok(inputs.some(x=>x.mode==='taste-features'));
 assert.ok(result.summary.fingerprintRawKeywordCoverage>0);
 assert.ok(result.summary.keywordRawLinkRate>0);
 assert.ok(result.summary.keywordSpecificLinkRate<=result.summary.keywordRawLinkRate);
 assert.equal(result.summary.keywordNegativeControlProfiles,1);
 assert.equal(result.profiles[0].negativeKeywordAnchors,2);
 assert.equal(result.profiles[0].unresolvedNegativeControls,0);
 assert.ok(result.provider.requests>=6);
 for(const title of PROFILES[0].negativeControls)
  assert.ok(inputs.some(x=>x.mode==='search'&&x.query===title));
 assert.ok(!inputs.some(x=>x.mode==='recommend'&&x.titles.some(t=>
  PROFILES[0].negativeControls.includes(t))));

 assert.ok(result.profiles[0].withOriginalKeywords>0);
 assert.ok(inputs.every(x=>!('user_id' in x)&&!('rating' in x)&&!('email' in x)));
 assert.equal(JSON.stringify(result).includes('Catalog Test'),false);
});
test('failures are counted, but no confidential details are logged',async()=>{
 const adapter=makeAdapter({fetchImpl:async()=>({ok:false,status:502,text:async()=>''}),timeoutMs:1000});
 await assert.rejects(()=>adapter.api({mode:'search',media:'movie',query:'example'}),/HTTP 502/);
 assert.equal(adapter.getStats().failed,1);
});
