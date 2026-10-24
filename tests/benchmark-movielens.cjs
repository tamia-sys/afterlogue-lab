#!/usr/bin/env node
/* Afterlogue Lab: offline MovieLens preference ranking, NOT discovery-interest prediction.
   Does not download, transmit, log, or bundle user ratings. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
function csvRows(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}
  else if(c==='"')quoted=true;
  else if(c===','){row.push(field);field=''}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);field='';if(row.some(x=>x.length))rows.push(row);row=[]}
  else field+=c;
 }
 if(quoted)throw Error('Malformed CSV: unterminated quote');
 if(field.length||row.length){row.push(field);if(row.some(x=>x.length))rows.push(row)}
 return rows;
}
function readCsv(file,required=[]){
 const rows=csvRows(fs.readFileSync(file,'utf8'));if(!rows.length)throw Error('Empty CSV: '+file);
 const header=rows.shift();
 for(const key of required)if(!header.includes(key))throw Error(file+' missing column '+key);
 return rows.map(cells=>Object.fromEntries(header.map((key,i)=>[key,cells[i]||''])));
}
function opts(argv){
 const o={dataset:null,features:null,output:null,maxUsers:610,k:5,minRatings:20,holdout:.25,seed:42};
 if(argv.includes('--help')||argv.includes('-h'))return {...o,help:true};
 const flags={'--dataset':'dataset','--features':'features','--output':'output','--max-users':'maxUsers','--k':'k','--min-ratings':'minRatings','--holdout':'holdout','--seed':'seed'};
 for(let i=0;i<argv.length;i+=2){
  if(!flags[argv[i]]||argv[i+1]==null)throw Error('Unknown or unpaired flag '+argv[i]+'. Use --help.');
  o[flags[argv[i]]]=argv[i+1];
 }
 for(const key of ['maxUsers','k','minRatings','holdout','seed'])o[key]=Number(o[key]);
 if(!o.dataset||!fs.existsSync(o.dataset))throw Error('Use --dataset PATH for an extracted MovieLens directory.');
 if(!Number.isInteger(o.maxUsers)||o.maxUsers<1||!Number.isInteger(o.k)||o.k<1||o.k>20||
  !Number.isInteger(o.minRatings)||o.minRatings<6||!Number.isInteger(o.seed)||
  !Number.isFinite(o.holdout)||o.holdout<=0||o.holdout>=.5)throw Error('Invalid numeric arguments');
 return o;
}
function hash(value,seed=42){
 let h=(2166136261^seed)>>>0;
 for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
 return h>>>0;
}
const movieKey=id=>'ml-'+id;
const label=r=>r>=4.5?'Loved':r>=4?'Liked':r>=3?'Okay':'Not for me';
function loadFeatures(file){
 if(!file)return new Map();
 const raw=JSON.parse(fs.readFileSync(file,'utf8')),map=new Map();
 const items=Array.isArray(raw)?raw:Array.isArray(raw.items)?raw.items:null;
 if(items){
  for(const item of items){
   if(!item||!item.facets)continue;
   if(item.key)map.set(String(item.key),item.facets);
   if(item.tmdbId)map.set('tmdb-movie-'+item.tmdbId,item.facets);
   if(item.movieId)map.set(movieKey(item.movieId),item.facets);
  }
 }else if(raw.byTmdbId&&typeof raw.byTmdbId==='object'){
  for(const [id,facets] of Object.entries(raw.byTmdbId))map.set('tmdb-movie-'+id,facets);
 }else throw Error('Features must have items[] or byTmdbId.');
 return map;
}
function loadDataset(dir,featuresFile){
 const movies=readCsv(path.join(dir,'movies.csv'),['movieId','title','genres']);
 const ratings=readCsv(path.join(dir,'ratings.csv'),['userId','movieId','rating','timestamp']);
 const linkfile=path.join(dir,'links.csv');
 const links=new Map(fs.existsSync(linkfile)?readCsv(linkfile,['movieId','tmdbId']).map(x=>[x.movieId,x.tmdbId]):[]);
 const features=loadFeatures(featuresFile),catalog=new Map(),users=new Map();
 let richCount=0,linkedCount=0,validRatings=0;
 for(const m of movies){
  const tmdbId=links.get(m.movieId);if(tmdbId)linkedCount++;
  const extra=features.get(movieKey(m.movieId))||(tmdbId?features.get('tmdb-movie-'+tmdbId):null)||{};
  const facets={genres:m.genres==='(no genres listed)'?[]:m.genres.split('|').map(x=>x.toLowerCase()),
   themes:[],tones:[],directors:[],writers:[],narrativeThemes:[],pace:null};
  // No cinematic labels are inferred from genre or rating.
  for(const key of ['themes','tones','directors','writers','narrativeThemes'])
   if(Array.isArray(extra[key]))facets[key]=[...new Set(extra[key].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim().toLowerCase()))];
  if(typeof extra.pace==='string'&&extra.pace)facets.pace=extra.pace.toLowerCase();
  const rich=Boolean(facets.themes.length||facets.tones.length||facets.directors.length||
   facets.writers.length||facets.narrativeThemes.length||facets.pace);
  if(rich)richCount++;
  catalog.set(m.movieId,{key:movieKey(m.movieId),title:m.title,
   year:m.title.match(/\((\d{4})\)$/)?.[1]||null,category:'movies',position:0,directMatches:[],facets,rich});
 }
 for(const r of ratings){
  const rating=Number(r.rating),timestamp=Number(r.timestamp);
  if(!catalog.has(r.movieId)||!Number.isFinite(rating)||rating<.5||rating>5||!Number.isFinite(timestamp))continue;
  if(!users.has(r.userId))users.set(r.userId,[]);
  users.get(r.userId).push({movieId:r.movieId,rating,timestamp});validRatings++;
 }
 return {catalog,users,meta:{movies:catalog.size,ratings:validRatings,users:users.size,
  tmdbLinked:linkedCount,richMovies:richCount,
  richCoverage:catalog.size?richCount/catalog.size:0,featuresProvided:Boolean(featuresFile)}};
}
function splitUser(rows,fraction){
 const sorted=[...rows].sort((a,b)=>a.timestamp-b.timestamp||Number(a.movieId)-Number(b.movieId));
 const unique=new Map();for(const r of sorted)unique.set(r.movieId,r);
 const dated=[...unique.values()].sort((a,b)=>a.timestamp-b.timestamp||Number(a.movieId)-Number(b.movieId));
 const n=Math.max(5,Math.min(dated.length-5,Math.ceil(dated.length*fraction)));
 return {train:dated.slice(0,-n),test:dated.slice(-n)};
}
function normalizedDcg(ids,relevance,k){
 const actual=ids.slice(0,k).reduce((s,id,i)=>s+(relevance.get(id)?1/Math.log2(i+2):0),0);
 const count=Math.min(k,[...relevance.values()].filter(Boolean).length);
 const ideal=Array.from({length:count},(_,i)=>1/Math.log2(i+2)).reduce((a,b)=>a+b,0);
 return ideal?actual/ideal:0;
}
function evaluate(ids,relevance,k){
 const shown=ids.slice(0,k),hits=shown.filter(x=>relevance.get(x)).length;
 return {ndcg:normalizedDcg(ids,relevance,k),precision:hits/k,
  recall:hits/[...relevance.values()].filter(Boolean).length,slots:shown.length};
}
const average=(rows,key)=>rows.length?rows.reduce((s,r)=>s+r[key],0)/rows.length:0;
function runBench(data,{maxUsers=610,k=5,minRatings=20,holdout=.25,seed=42}={},deps={}){
 const engine=deps.engine||globalThis.AfterlogueRecommendationEngine;
 if(!engine?.rank)throw Error('Load the Afterlogue recommendation engine before benchmarking');
 const v2=deps.v2||require('../taste-model-v2.js');
 const eligibility=deps.eligibility||require('../eligibility-policy.js');
 const ordered=[...data.users].filter(([,r])=>r.length>=minRatings)
  .sort((a,b)=>hash(a[0],seed)-hash(b[0],seed)||a[0].localeCompare(b[0]));
 const splits=new Map(),globalTrain=new Map(),excluded={tooFew:0,noTestLikes:0,noTestDislikes:0};
 // Partition every user's history first; global popularity never sees heldout ratings.
 for(const [user,rows] of data.users){
  if(rows.length<minRatings){excluded.tooFew++;continue}
  const part=splitUser(rows,holdout);
  if(part.test.length<5||part.train.length<5){excluded.tooFew++;continue}
  splits.set(user,part);
  for(const r of part.train){
   const x=globalTrain.get(r.movieId)||{positive:0,total:0};
   x.total++;if(r.rating>=4)x.positive++;globalTrain.set(r.movieId,x);
  }
 }
 const scores={popularity:[],legacy:[],cinematic:[]},tiers={short:[],medium:[],long:[]};
 let qualifiedTotal=0,candidatesTotal=0,richCandidates=0,richSources=0,sourcesTotal=0,richUsers=0;
 for(const [user] of ordered.filter(([u])=>splits.has(u)).slice(0,maxUsers)){
  const {train,test:held}=splits.get(user);
  const truth=new Map(held.map(r=>[movieKey(r.movieId),r.rating>=4]));
  if(![...truth.values()].some(Boolean)){excluded.noTestLikes++;continue}
  if(![...truth.values()].some(x=>!x)){excluded.noTestDislikes++;continue}
  const sources=train.map((r,i)=>({...data.catalog.get(r.movieId),position:i}));
  const candidates=held.map((r,i)=>({...data.catalog.get(r.movieId),position:sources.length+i}));
  const impressions=Object.fromEntries(train.map(r=>[movieKey(r.movieId),label(r.rating)]));
  candidatesTotal+=candidates.length;sourcesTotal+=sources.length;
  richCandidates+=candidates.filter(x=>x.rich).length;richSources+=sources.filter(x=>x.rich).length;
  if(sources.some(x=>x.rich)&&candidates.some(x=>x.rich))richUsers++;
  function popularity(r){
   const x=globalTrain.get(r.movieId)||{positive:0,total:0};
   return (x.positive+3)/(x.total+6)+.015*Math.log1p(x.total);
  }
  const baseline=[...held].sort((a,b)=>popularity(b)-popularity(a)||
   hash(a.movieId,seed)-hash(b.movieId,seed)).map(x=>movieKey(x.movieId));
  const ranked=engine.rank({entries:[...sources,...candidates],category:'movies',impressions});
  const legacy=ranked.filter(x=>truth.has(x.key));
  const cinematic=data.meta.featuresProvided?eligibility.eligible(
   v2.rank(legacy,[...sources,...candidates],impressions),
   {ratedKeys:Object.keys(impressions)}).filter(x=>truth.has(x.key)):[];
  qualifiedTotal+=cinematic.length;
  scores.popularity.push(evaluate(baseline,truth,k));
  scores.legacy.push(evaluate(legacy.map(x=>x.key),truth,k));
  if(data.meta.featuresProvided)scores.cinematic.push(evaluate(cinematic.map(x=>x.key),truth,k));
  const group=train.length<50?'short':train.length<200?'medium':'long';
  tiers[group].push({popularity:scores.popularity.at(-1),legacy:scores.legacy.at(-1),
   cinematic:data.meta.featuresProvided?scores.cinematic.at(-1):null});
 }
 const summary=rows=>({users:rows.length,ndcgAtK:average(rows,'ndcg'),
  precisionAtK:average(rows,'precision'),recallAtK:average(rows,'recall'),meanSlots:average(rows,'slots')});
 const names=['popularity','legacy','cinematic'],enabled=Boolean(data.meta.featuresProvided);
 return {format:'afterlogue-movielens-benchmark-v1',
  protocol:'chronological held-out rated-item preference ranking; all test candidates are historically rated',
  groundTruth:'historical ratings >=4 stars, NOT discovery interest or why somebody likes film',
  config:{maxUsers,k,minRatings,holdout,seed},dataset:data.meta,
  evaluatedUsers:scores.popularity.length,excluded,
  comparison:{popularity:summary(scores.popularity),legacy:summary(scores.legacy),
   cinematic:enabled?summary(scores.cinematic):null},
  cinematicAssessment:enabled?'experimental_requires_coverage_review':'unavailable_no_rich_metadata',
  coverage:{providedRichCandidateFraction:candidatesTotal?richCandidates/candidatesTotal:0,
   providedRichSourceFraction:sourcesTotal?richSources/sourcesTotal:0,
   usersWithRichEvidence:richUsers,cinematicEligibleFraction:candidatesTotal?qualifiedTotal/candidatesTotal:0,
   cinematicEligibleCandidates:qualifiedTotal,heldoutRatedCandidates:candidatesTotal},
  slices:Object.fromEntries(Object.entries(tiers).map(([group,rows])=>
   [group,{users:rows.length,comparison:Object.fromEntries(names.map(name=>
    [name,name==='cinematic'&&!enabled?null:summary(rows.map(x=>x[name]))]))}])),
  caveats:['Retrospective ratings suffer selection bias and do not measure new-film attraction.',
   'This test ranks rated holdout titles; it is NOT a real discovery-retrieval evaluation.',
   'Genres alone are not independently verified cinematic metadata.',
   'Provided features are not independently verified by the runner.',
   'Sparse cinematic eligibility is a coverage failure, not proof of poor film taste prediction.',
   'Missing recommendation slots count as misses; actual watch-interest requires human testing.']};
}
function main(){
 const options=opts(process.argv.slice(2));
 if(options.help){console.log('Usage: node tests/benchmark-movielens.cjs --dataset PATH [--features file.json] [--max-users 610] [--k 5] [--min-ratings 20] [--holdout 0.25] [--seed 42] [--output file.json]');return}
 require('../recommendation-engine.js');
 const result=runBench(loadDataset(options.dataset,options.features),options);
 if(options.output){
  fs.mkdirSync(path.dirname(path.resolve(options.output)),{recursive:true});
  fs.writeFileSync(options.output,JSON.stringify(result,null,2)+'\n');
 }
 console.log(JSON.stringify(result,null,2));
}
if(require.main===module){try{main()}catch(e){console.error('Benchmark error: '+e.message);process.exitCode=1}}
module.exports={csvRows,readCsv,opts,hash,label,loadFeatures,loadDataset,splitUser,normalizedDcg,evaluate,runBench};
