"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const v2=require("../taste-model-v2.js");
const {eligible,shelf}=require("../eligibility-policy.js");
const film=(key,facets={},score=30)=>({key,title:key,score,personalized:true,matched:["seed"],
 facets:{genres:[],themes:[],tones:[],directors:[],writers:[],pace:null,...facets}});
const loved=(key,facets)=>film(key,facets);
test("a candidate matching several loved films earns more evidence than one",()=>{
 const log=[loved("one",{themes:["solitude"]}),loved("two",{themes:["solitude"]}),loved("three",{themes:["solitude"]})];
 const target=film("candidate",{themes:["solitude"]});
 const one=v2.rank([target],log.slice(0,1),{one:"Loved"})[0];
 const many=v2.rank([target],log,{one:"Loved",two:"Loved",three:"Loved"})[0];
 assert.ok(many.cinematicEvidence>one.cinematicEvidence);
 assert.equal(many.cinematicAnchorCount,3);
});
test("disliked cinematic traits reduce a positively matched candidate's score",()=>{
 const good=loved("good",{tones:["melancholic"]});
 const bad=loved("bad",{themes:["isolation"]});
 const target=film("candidate",{tones:["melancholic"],themes:["isolation"]});
 const neutral=v2.rank([target],[good,bad],{good:"Loved"})[0];
 const negative=v2.rank([target],[good,bad],{good:"Loved",bad:"Not for me"})[0];
 assert.ok(negative.score<neutral.score);
 assert.ok(negative.cinematicNegativePenalty>0);
});
test("negative-only matching is punished even with no positive matches",()=>{
 const liked=loved("liked",{tones:["playful"]});
 const disliked=loved("disliked",{tones:["bleak"]});
 const target=film("candidate",{tones:["bleak"]});
 const neutral=v2.rank([target],[liked],{liked:"Loved"})[0];
 const negative=v2.rank([target],[liked,disliked],{liked:"Loved",disliked:"Not for me"})[0];
 assert.ok(negative.score<neutral.score);
 assert.equal(negative.cinematicSignalCount,0);
 assert.equal(eligible([negative]).length,0);
});
test("broad generic themes alone do not certify a cinematic match",()=>{
 const log=[loved("one",{themes:["family"]})];
 const target=film("candidate",{themes:["family"]});
 const ranked=v2.rank([target],log,{one:"Loved"})[0];
 assert.equal(ranked.cinematicSignalCount,0);
 assert.deepEqual(shelf([ranked]),[]);
});
test("older Log impressions matter after later genre-heavy impressions",()=>{
 const earlier=loved("early",{themes:["solitude"]});
 const later=[loved("new1",{genres:["animation"],themes:["magic"]}),loved("new2",{genres:["animation"],themes:["magic"]})];
 const candidate=film("quiet",{themes:["solitude"]});
 const ranked=v2.rank([candidate],[earlier,...later],{early:"Loved",new1:"Loved",new2:"Loved"})[0];
 assert.equal(ranked.cinematicAnchor,"early");
 assert.ok(ranked.cinematicSignalCount>=1);
});
test("genre-only reaction similarity is much weaker than theme overlap",()=>{
 const genre=v2.feedbackSimilarity({genres:["animation"]},{genres:["animation"]});
 const theme=v2.feedbackSimilarity({themes:["solitude"]},{themes:["solitude"]});
 assert.ok(theme>genre*4);
});
test("already rated and previously shown films cannot re-enter a shelf",()=>{
 const log=[loved("rated",{tones:["intimate"]})];
 const ranked=v2.rank([film("rated",{tones:["intimate"]}),film("shown",{tones:["intimate"]}),film("new",{tones:["intimate"]})],log,{rated:"Loved"});
 assert.deepEqual(shelf(ranked,{ratedKeys:["rated"],shownKeys:["shown"]}).map(x=>x.key),["new"]);
});
test("v2 rank is deterministic for identical input",()=>{
 const log=[loved("one",{tones:["intimate"]})];
 const candidates=[film("a",{tones:["intimate"]}),film("b",{tones:["playful"]})];
 assert.deepEqual(v2.rank(candidates,log,{one:"Loved"}),v2.rank(candidates,log,{one:"Loved"}));
});
