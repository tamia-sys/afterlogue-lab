"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const {balance}=require("../evidence-balance.js");
const item=(key,anchor,score)=>({key,cinematicAnchor:anchor,score,cinematicSignalCount:1});
test("comparable alternate anchors can replace third same-anchor selection",()=>{
 const input=[item("a1","A",30),item("a2","A",29),item("a3","A",28),
  item("b1","B",27),item("c1","C",26)];
 const result=balance(input,5);
 assert.deepEqual(result.map(x=>x.key),["a1","a2","b1","c1","a3"]);
 assert.deepEqual(input.map(x=>x.key),["a1","a2","a3","b1","c1"]);
});
test("anchor variety never replaces a clearly stronger candidate",()=>{
 const input=[item("a1","A",30),item("a2","A",29),item("a3","A",28),
  item("b1","B",10),item("c1","C",9)];
 assert.equal(balance(input,5)[2].key,"a3");
});
test("the balancer neither duplicates nor removes any film",()=>{
 const input=[item("a1","A",30),item("a2","A",29),item("a3","A",28),
  item("b1","B",27),item("c1","C",26)];
 assert.deepEqual(new Set(balance(input).map(x=>x.key)),new Set(input.map(x=>x.key)));
});
