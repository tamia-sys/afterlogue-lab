'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../recommendation-engine.js');
const engine=globalThis.AfterlogueRecommendationEngine;
const cinematic=require('../taste-model-v2.js');
const policy=require('../eligibility-policy.js');
const rotation=require('../shelf-rotation-shadow.js');
const fixture=require('./multi-archetype-fixture.cjs');
function example(persona,{rounds=3,size=5,minScoreRatio=.8,shown=[],decided=[]}={}){
 const rated=Object.keys(persona.impressions);
 const initial=engine.rank({entries:fixture.catalog,category:persona.category,
   impressions:persona.impressions,timestamps:persona.timestamps||{}});
 const eligible=policy.eligible(cinematic.rank(initial,fixture.catalog,persona.impressions),
   {ratedKeys:rated,shownKeys:[...shown,...(persona.shown||[])],
    decidedKeys:[...decided,...(persona.decided||[])]});
 return rotation.plan({engine,eligible,profileEntries:fixture.catalog,
   impressions:persona.impressions,category:persona.category,
   favorites:persona.favorites||[],watchlist:persona.watchlist||[],
   seen:persona.seen||[],shown:[...shown,...(persona.shown||[])],
   decided:[...decided,...(persona.decided||[])],rounds,size,minScoreRatio});
}
const who=name=>fixture.profiles.find(x=>x.name===name);
const laneCount=items=>Object.fromEntries([...new Set(items.map(x=>engine.storyLane(x)))]
 .map(lane=>[lane,items.filter(x=>engine.storyLane(x)===lane).length]));
const collisionCount=(items,size=5)=>Array.from({length:Math.ceil(items.length/size)},(_,i)=>{
 const shelf=items.slice(i*size,(i+1)*size);
 return shelf.length-new Set(shelf.map(x=>engine.franchiseKey(x))).size;
});
test('three sessions keep first 5 identical, never reuse an already chosen film, and preserve eligible scores',()=>{
 for(const profile of fixture.profiles){
  const result=example(profile);
  assert.equal(result.aggregate.currentFirstShelfIdentical,true);
  assert.deepEqual(result.shadow.slice(0,5),result.baseline.slice(0,5));
  assert.equal(result.aggregate.noRepeatKeys,true);
  assert.equal(new Set(result.shadow.map(x=>x.key)).size,result.shadow.length);
  assert.equal(result.shadow.length,result.baseline.length);
  // A promoted title may sit outside the original first 15, so compare
  // every chosen score to its ORIGINAL eligible-pool score, not a shortlist.
  const ranked=engine.rank({entries:fixture.catalog,category:profile.category,
    impressions:profile.impressions,timestamps:profile.timestamps||{}});
  const eligible=policy.eligible(cinematic.rank(ranked,fixture.catalog,profile.impressions),
    {ratedKeys:Object.keys(profile.impressions)});
  const scores=new Map(eligible.map(x=>[x.key,x.score]));
  assert.ok(result.shadow.every(x=>scores.get(x.key)===x.score));
  assert.equal(result.aggregate.scoreFloorPreserved,true);
  const bc=collisionCount(result.baseline),sc=collisionCount(result.shadow);
  assert.ok(sc.every((n,i)=>n<=bc[i]));
 }
});
test('eclectic viewer discovers previously missing authentic interests on later shelves, not first shelf',()=>{
 const result=example(who('Fictional Eclectic'));
 assert.equal(result.aggregate.availableSupportedLanes,6);
 assert.equal(result.aggregate.baselineCoverage.recognizedTasteLanes,3);
 assert.equal(result.aggregate.shadowCoverage.recognizedTasteLanes,5);
 assert.equal(result.aggregate.promotions,4);
 assert.equal(laneCount(result.shadow.slice(0,5)).documentary,2);
 assert.ok(result.shadow.slice(5).some(x=>engine.storyLane(x)==='comedy'));
 assert.ok(result.shadow.slice(5).some(x=>engine.storyLane(x)==='romance'));
 assert.ok(result.aggregate.shelves.every(s=>s.promotions<=2));
});
test('previous suggestion loop retains quiet and suspense while making room for a previously overlooked liked comedy lane',()=>{
 const result=example(who('Fictional Exposure Loop'));
 assert.equal(result.aggregate.baselineCoverage.recognizedTasteLanes,3);
 assert.equal(result.aggregate.shadowCoverage.recognizedTasteLanes,4);
 assert.ok(result.shadow.slice(5).some(x=>engine.storyLane(x)==='comedy'));
 assert.ok(result.shadow.some(x=>engine.storyLane(x)==='drama'));
 assert.ok(result.shadow.some(x=>engine.storyLane(x)==='suspense'));
 assert.ok(result.shadow.some(x=>engine.storyLane(x)==='animation'));
});
test('genuine animation fan stays focused; rotation does not impose an artificial quota',()=>{
 const result=example(who('Fictional Genuine Animation Fan'));
 assert.equal(result.aggregate.rotationEnabled,false);
 assert.equal(result.aggregate.promotions,0);
 assert.deepEqual(result.shadow,result.baseline);
 assert.ok(result.shadow.slice(0,5).every(x=>engine.storyLane(x)==='animation'));
});
test('short or quiet-focused viewing histories are not penalized for having fewer kinds of interest',()=>{
 for(const p of ['Fictional Sparse Starter','Fictional Quiet Focus']){
  const result=example(who(p));
  assert.equal(result.aggregate.rotationEnabled,false);
  assert.equal(result.aggregate.promotions,0);
  assert.deepEqual(result.shadow,result.baseline);
 }
});
test('already seen, dismissed, watchlisted and shown titles do not resurface when replaying a new session',()=>{
 const person=who('Fictional Eclectic'),first=example(person);
 const prior=first.shadow.slice(0,5).map(x=>x.key);
 const exclusions=[...prior,fixture.key('romance',2)];
 const next=example(person,{shown:exclusions,decided:[fixture.key('comedy',2)]});
 assert.ok(next.shadow.every(x=>!exclusions.includes(x.key)));
 assert.ok(next.shadow.every(x=>x.key!==fixture.key('comedy',2)));
 const watched=example({...person,seen:[fixture.key('quiet',3)],watchlist:[fixture.key('romance',3)]});
 assert.ok(watched.shadow.every(x=>!['fictional-quiet-3','fictional-romance-3'].includes(x.key)));
});
test('reordering never expands a depleted evidence-backed candidate pool to fill a shelf',()=>{
 const person=who('Fictional Quiet Focus');
 const first=example(person);
 const depleted=example(person,{shown:first.baseline.slice(0,9).map(x=>x.key)});
 assert.ok(depleted.shadow.length<first.shadow.length);
 assert.ok(depleted.shadow.every(x=>x.score>0));
 assert.equal(depleted.aggregate.noRepeatKeys,true);
});
test('narrower quality threshold cannot create more new interest lanes by forcing weaker films',()=>{
 const person=who('Fictional Eclectic');
 const original=example(person,{minScoreRatio:.8});
 const strict=example(person,{minScoreRatio:.9});
 assert.ok(strict.aggregate.shadowCoverage.recognizedTasteLanes<=
  original.aggregate.shadowCoverage.recognizedTasteLanes);
 assert.ok(strict.aggregate.shelves.every(s=>s.promotions<=2));
 assert.equal(strict.aggregate.scoreFloorPreserved,true);
});
test('community metadata has exactly zero effect on successive-shelf plans',()=>{
 const person=who('Fictional Eclectic'),baseline=example(person);
 const tagged=fixture.catalog.map(x=>({...x,communityTags:['reflective-atmosphere'],
  facets:{...x.facets,communityObservationCount:500}}));
 const ranked=engine.rank({entries:tagged,category:'movies',impressions:person.impressions});
 const eligible=policy.eligible(cinematic.rank(ranked,tagged,person.impressions),
  {ratedKeys:Object.keys(person.impressions)});
 const other=rotation.plan({engine,eligible,profileEntries:tagged,
  impressions:person.impressions,category:'movies'});
 assert.deepEqual(other.aggregate,baseline.aggregate);
 assert.deepEqual(other.shadow.map(x=>x.key),baseline.shadow.map(x=>x.key));
});
test('strong-looking unsupported movie cannot be promoted solely to satisfy a genre quota',()=>{
 const person=who('Fictional Eclectic');
 const initial=example(person);
 const synthetic={...fixture.catalog.find(x=>x.key===fixture.key('horror',2)),
  key:'fictional-horror-wildcard',score:99,matched:[],cinematicSignalCount:1,
  personalized:true};
 const raw=engine.rank({entries:fixture.catalog,category:'movies',impressions:person.impressions});
 const realEligible=policy.eligible(cinematic.rank(raw,fixture.catalog,person.impressions),
  {ratedKeys:Object.keys(person.impressions)});
 const result=rotation.plan({engine,eligible:[...realEligible,synthetic],
  profileEntries:fixture.catalog,impressions:person.impressions,category:'movies'});
 assert.equal(result.aggregate.rotationEnabled,true);
 assert.equal(result.aggregate.availableSupportedLanes,6);
 assert.equal(result.aggregate.scoreFloorPreserved,true);
 // The baseline is unchanged except for inputting an unverified high score.
 // We never claim the extra unsupported lane as a learned taste.
 assert.ok(!Object.keys(result.aggregate.shelves[1].shadow).includes('horror'));
});
test('empty or very small candidate pools report scarcity instead of inventing titles',()=>{
 const e=engine;
 const none=rotation.plan({engine:e,eligible:[],profileEntries:fixture.catalog,
  impressions:who('Fictional Eclectic').impressions});
 assert.equal(none.aggregate.rounds,0);
 assert.equal(none.shadow.length,0);
 assert.equal(none.aggregate.promotions,0);
});
test('multi-session report contains only aggregate genre labels, not individual film identifiers',()=>{
 const result=example(who('Fictional Eclectic'));
 const flat=JSON.stringify(result.aggregate);
 for(const forbidden of [fixture.key('quiet',2),fixture.key('animation',11),
  'Loved','Not for me','tmdb-movie','user_id']){
  assert.equal(flat.includes(forbidden),false);
 }
 assert.equal('titles' in result.aggregate.shelves[0],false);
});
