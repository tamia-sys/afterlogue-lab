"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const signals=require("../narrative-signals.js");
const taste=require("../taste-model-v2.js");
const policy=require("../eligibility-policy.js");
const film=(key,facets={},score=30)=>({
 key,title:key,score,personalized:true,matched:["seed"],
 facets:{genres:[],themes:[],tones:[],directors:[],writers:[],
  narrativeThemes:[],pace:null,...facets}
});
test("conservative synopsis topics are grounded in literal descriptions",()=>{
 const topics=signals.extract("An estranged father returns home and reunites with his daughter.");
 assert.ok(topics.includes("estrangement"));
 assert.ok(!topics.includes("grief"));
});
test("generic family or love words do not invent a synopsis signal",()=>{
 assert.deepEqual(signals.extract("A family finds love and meaning in life."),[]);
});
test("synopsis clues can connect a sparsely tagged film to a positive Log",()=>{
 const source=film("loved",{narrativeThemes:signals.extract("A lonely worker follows an ordinary life.")});
 const candidate=film("new",{narrativeThemes:signals.extract("A solitary woman moves to a new city.")});
 const ranked=taste.rank([candidate],[source],{loved:"Loved"})[0];
 assert.ok(ranked.cinematicSignalCount>=1);
 assert.equal(ranked.cinematicSynopsisOnly,true);
 assert.ok(ranked.cinematicExplanation.includes("not a verified style match"));
 assert.deepEqual(policy.eligible([ranked]).map(x=>x.key),["new"]);
});
test("synopsis-only evidence cannot masquerade as multiple independent signal types",()=>{
 const source=film("loved",{narrativeThemes:["solitude","memory"]});
 const candidate=film("new",{narrativeThemes:["solitude","memory"]});
 const ranked=taste.rank([candidate],[source],{loved:"Loved"})[0];
 assert.equal(ranked.cinematicEvidenceKindCount,1);
 assert.equal(ranked.cinematicMetadata,"partial");
});
test("negative synopsis evidence reduces a candidate's compatibility",()=>{
 const source=film("loved",{narrativeThemes:["solitude"]});
 const disliked=film("disliked",{narrativeThemes:["grief"]});
 const candidate=film("new",{narrativeThemes:["solitude","grief"]});
 const positive=taste.rank([candidate],[source,disliked],{loved:"Loved"})[0];
 const withDislike=taste.rank([candidate],[source,disliked],{loved:"Loved",disliked:"Not for me"})[0];
 assert.ok(withDislike.score<positive.score);
});
test("verified crew identifiers are never printed raw in explanations",()=>{
 const source=film("loved",{directors:["tmdb-person-2303"]});
 const candidate=film("new",{directors:["tmdb-person-2303"]});
 const ranked=taste.rank([candidate],[source],{loved:"Loved"})[0];
 assert.ok(ranked.cinematicExplanation.includes("shared director credit"));
 assert.ok(!ranked.cinematicExplanation.includes("tmdb-person-"));
});
test("no unsupported genre-only connection becomes qualified",()=>{
 const source=film("loved",{genres:["drama"]});
 const candidate=film("new",{genres:["drama"]});
 const ranked=taste.rank([candidate],[source],{loved:"Loved"})[0];
 assert.deepEqual(policy.eligible([ranked]),[]);
});
