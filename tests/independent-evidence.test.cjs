"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const model=require("../taste-model-v2.js");
const policy=require("../eligibility-policy.js");
const film=(key,topics)=>({key,title:key,score:30,personalized:false,matched:[],facets:{narrativeThemes:topics}});
test("corroborated plot evidence is eligible",()=>{
 const sources=[film("one",["solitude"]),film("two",["solitude"])];
 const item=model.rank([film("new",["solitude"])],sources,{one:"Loved",two:"Loved"})[0];
 assert.equal(item.cinematicIndependent,true);
 assert.deepEqual(policy.eligible([item]).map(x=>x.key),["new"]);
 assert.deepEqual(policy.eligible([item],{shownKeys:["new"]}),[]);
});
test("one shared plot clue is insufficient",()=>{
 const item=model.rank([film("new",["solitude"])],[film("one",["solitude"])],{one:"Loved"})[0];
 assert.equal(item.cinematicIndependent,false);
 assert.deepEqual(policy.eligible([item]),[]);
});
