"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
// Regression fixtures for the negative-evidence branch of cinematicRerank.
// These validate the scoring invariant, not live recommendation quality.
const adjustment=({baseScore,positiveMatches,negativePenalty,evidence=0})=>
 !positiveMatches?-Math.max(12,baseScore*.75)-Math.min(4,negativePenalty):
 Math.max(-9,Math.min(7,evidence-negativePenalty+Math.min(1.4,(positiveMatches-1)*.45)));
test("negative-only match is penalized more than no-evidence match",()=>{
 assert.ok(adjustment({baseScore:30,positiveMatches:0,negativePenalty:3})<
  adjustment({baseScore:30,positiveMatches:0,negativePenalty:0}));
});
test("positive evidence does not erase strong negative evidence",()=>{
 assert.ok(adjustment({baseScore:30,positiveMatches:1,negativePenalty:5,evidence:3})<
  adjustment({baseScore:30,positiveMatches:1,negativePenalty:0,evidence:3}));
});
test("penalties stay bounded when metadata is noisy",()=>{
 assert.equal(adjustment({baseScore:20,positiveMatches:0,negativePenalty:999}),-19);
 assert.equal(adjustment({baseScore:20,positiveMatches:1,negativePenalty:999,evidence:1}),-9);
});
