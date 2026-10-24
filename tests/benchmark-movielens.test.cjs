'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const bench=require('./benchmark-movielens.cjs');
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'afterlogue-benchmark-'));
 const movieRows=['movieId,title,genres'];
 for(let i=1;i<=60;i++)movieRows.push(i+',"Example, Film '+i+' (20'+String(i%20).padStart(2,'0')+')",'+(i%3===0?'Comedy|Drama':'Drama'));
 const ratingRows=['userId,movieId,rating,timestamp'];
 for(let u=1;u<=8;u++)for(let i=1;i<=40;i++)ratingRows.push([u,i+(u%3)*5,(i+u)%5>=2?'4.5':'2.5',1700000000+i].join(','));
 fs.writeFileSync(path.join(dir,'movies.csv'),movieRows.join('\n'));
 fs.writeFileSync(path.join(dir,'ratings.csv'),ratingRows.join('\n'));
 fs.writeFileSync(path.join(dir,'links.csv'),'movieId,imdbId,tmdbId\n'+Array.from({length:60},(_,i)=>(i+1)+',id'+(i+1)+','+(i+1)).join('\n'));
 return dir;
}
const mockEngine={rank({entries,impressions}){
 const known=new Set(Object.keys(impressions));
 return entries.filter(x=>!known.has(x.key)).map(x=>({...x,score:x.key.endsWith('1')?2:1,personalized:true,matched:[{source:'demo'}]}));
}};
const mockV2={rank(entries){return entries.map(x=>({...x,cinematicSignalCount:x.rich?2:0,cinematicIndependent:x.rich,cinematicAnchorCount:x.rich?1:0}))}};
const mockEligibility={eligible(entries){return entries.filter(x=>x.cinematicSignalCount>=1)}};
test('CSV parser preserves commas, escaped quotes and CRLF',()=>{
 assert.deepEqual(bench.csvRows('a,b\r\n1,"the ""film"", 2026"\r\n'),[['a','b'],['1','the "film", 2026']]);
});
test('Log impressions do not conflate positive, neutral and negative ratings',()=>{
 assert.equal(bench.label(4.5),'Loved');assert.equal(bench.label(4),'Liked');
 assert.equal(bench.label(3.5),'Okay');assert.equal(bench.label(2),'Not for me');
});
test('chronological holdout prevents duplicate movie exposure in train and test',()=>{
 const rows=Array.from({length:20},(_,i)=>({movieId:String(i+1),rating:4,timestamp:i}));
 rows.push({movieId:'1',rating:2,timestamp:100});
 const {train,test:held}=bench.splitUser(rows,.25);
 assert.equal(train.length+held.length,20);
 assert.equal(held.at(-1).movieId,'1');
 assert.equal(train.some(x=>x.movieId==='1'),false);
});
test('large offline runner is reproducible and reports missing metadata honestly',()=>{
 const dir=fixture();
 try{
  const data=bench.loadDataset(dir,null),settings={maxUsers:8,k:5,minRatings:20,seed:4};
  const deps={engine:mockEngine,v2:mockV2,eligibility:mockEligibility};
  const first=bench.runBench(data,settings,deps),second=bench.runBench(data,settings,deps);
  assert.deepEqual(first,second);
  assert.ok(first.evaluatedUsers>0);
  assert.equal(first.comparison.cinematic,null);
  assert.equal(first.cinematicAssessment,'unavailable_no_rich_metadata');
  assert.equal(first.dataset.richCoverage,0);
  assert.ok(first.comparison.legacy.ndcgAtK>=0&&first.comparison.legacy.ndcgAtK<=1);
  assert.equal(first.comparison.popularity.users,first.evaluatedUsers);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('joins legal feature input via MovieLens-to-TMDB IDs and measures coverage',()=>{
 const dir=fixture();
 try{
  const file=path.join(dir,'features.json');
  fs.writeFileSync(file,JSON.stringify({byTmdbId:Object.fromEntries(
   Array.from({length:60},(_,i)=>[String(i+1),{themes:['ordinary-life'],tones:['warm']}]))}));
  const data=bench.loadDataset(dir,file);
  const result=bench.runBench(data,{maxUsers:8,k:5,minRatings:20},
   {engine:mockEngine,v2:mockV2,eligibility:mockEligibility});
  assert.equal(data.meta.richMovies,60);
  assert.ok(result.comparison.cinematic);
  assert.ok(result.coverage.cinematicEligibleCandidates>0);
  assert.ok(result.coverage.providedRichCandidateFraction>0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
