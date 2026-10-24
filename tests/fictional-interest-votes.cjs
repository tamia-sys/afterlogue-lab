'use strict';
/* Entirely invented, film-ID-specific interest choices.
 * Deliberately SEPARATE from the catalog metadata, ranker and rotation.
 * These are NOT real audiences, labels inferred from genre or user surveys.
 * No engine reads these votes until the candidate list is frozen.
 */
const {catalog}=require('./multi-archetype-fixture.cjs');
const choices={
 'Fictional Eclectic':{
  quiet:[2,3,4,6,8,9],documentary:[2,4,6],
  animation:[1,2,4,12,16,17],comedy:[2,3,4,5,7],
  romance:[2,4,5,7],suspense:[3,4,6,8],
  action:[],horror:[]
 },
 // Identical logged tastes, but different future-film reactions:
 // no guarantee a later genre rotation improves this person's interest.
 'Fictional Eclectic Selective':{
  quiet:[2,3,4,5,6,7,8,9],documentary:[2,3,4,5,6,7],
  animation:[1,2,3,4,12,16,17],comedy:[5,7],
  romance:[6,8],suspense:[7],
  action:[],horror:[]
 },
 'Fictional Quiet Focus':{
  quiet:[2,4,6,7,8,10],documentary:[2,3,5],
  animation:[],comedy:[3],romance:[4],suspense:[],action:[],horror:[]
 },
 'Fictional Exposure Baseline':{
  quiet:[4,5,6,7,9],documentary:[2,4],suspense:[3,4,5,7],
  comedy:[2,4,6],animation:[11],romance:[3],action:[],horror:[]
 },
 'Fictional Exposure Loop':{
  quiet:[4,5,6,7,9],documentary:[2,4],suspense:[3,4,5,7],
  comedy:[2,4,6],animation:[11,12,16,18],romance:[3],action:[],horror:[]
 },
 'Fictional Genuine Animation Fan':{
  animation:[6,7,8,10,14,15,18,19,20],
  comedy:[2,3,5],quiet:[4],documentary:[],suspense:[],romance:[],
  action:[],horror:[]
 },
 'Fictional Sparse Starter':{
  quiet:[2,4,6],documentary:[2,3],
  comedy:[],romance:[],animation:[],suspense:[],action:[],horror:[]
 }
};
const unsure={
 'Fictional Eclectic':['fictional-comedy-6','fictional-animation-3'],
 'Fictional Eclectic Selective':['fictional-romance-4','fictional-comedy-4']
};
function makeVoteFixture(name){
 if(!Object.prototype.hasOwnProperty.call(choices,name))throw Error('Unknown fictional vote scenario');
 const rule=choices[name],unsureKeys=new Set(unsure[name]||[]);
 const votes={};
 for(const film of catalog){
  const match=/^fictional-([a-z]+)-(\d+)$/.exec(film.key);
  const group=match[1],index=Number(match[2]);
  votes[film.key]=unsureKeys.has(film.key)?'Unsure':
   (rule[group]||[]).includes(index)?'Interested':'Not drawn to it';
 }
 return Object.freeze(votes);
}
module.exports=Object.freeze({makeVoteFixture,scenarioNames:Object.freeze(Object.keys(choices))});
