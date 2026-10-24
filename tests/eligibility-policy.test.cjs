"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const {eligible,shelf}=require("../eligibility-policy.js");
const film=(key,extra={})=>({key,score:27,personalized:true,matched:["perfect days"],cinematicSignalCount:1,...extra});
test("rated fictional Log films are excluded before balancing",()=>{
 const films=[film("rated"),film("unrated")];
 assert.deepEqual(eligible(films,{ratedKeys:["rated"]}).map(x=>x.key),["unrated"]);
});
test("a shelf override cannot reintroduce rated or previously shown films",()=>{
 const films=[film("rated"),film("shown"),film("new")];
 assert.deepEqual(shelf(films,{ratedKeys:["rated"],shownKeys:["shown"]}).map(x=>x.key),["new"]);
});
test("repeated retrieval cannot repeat a film inside one shelf",()=>{
 assert.deepEqual(shelf([film("a"),film("a"),film("b")]).map(x=>x.key),["a","b"]);
});
test("unverified genre-only guesses do not count as qualified cinematic matches",()=>{
 assert.deepEqual(eligible([film("genre-only",{cinematicSignalCount:0}),film("verified")]).map(x=>x.key),["verified"]);
});
test("missing personalization, anchor, or positive score are excluded",()=>{
 const films=[film("unpersonalized",{personalized:false}),film("unmatched",{matched:[]}),film("zero",{score:0}),film("good")];
 assert.deepEqual(eligible(films).map(x=>x.key),["good"]);
});
test("allowed retrieval keys never override Log exclusion",()=>{
 const films=[film("rated"),film("new"),film("outside")];
 assert.deepEqual(eligible(films,{ratedKeys:["rated"],allowedKeys:["rated","new"]}).map(x=>x.key),["new"]);
});
test("decided titles cannot return and scarce shelves are not padded",()=>{
 const films=[film("passed"),film("valid")];
 assert.deepEqual(shelf(films,{decidedKeys:["passed"],size:5}).map(x=>x.key),["valid"]);
});
test("all rated candidates yield empty shelf, not recycled recommendations",()=>{
 assert.equal(shelf([film("a"),film("b")],{ratedKeys:["a","b"]}).length,0);
});
