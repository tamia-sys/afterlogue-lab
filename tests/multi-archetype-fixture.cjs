'use strict';
// Synthetic films/ratings only; NEVER use real member Logs or social tags.
// Film groups deliberately span multiple modalities and distinct collections.
const make=(type,i,facets,opts={})=>({
 key:'fictional-'+type+'-'+i,
 title:'Fictional '+type+' '+i,
 category:'movies',position:i,poster:null,score:20,
 facets:{themes:[],tones:[],genres:[],directors:[],writers:[],pace:null,...facets},
 directMatches:[],...(opts.collectionId?{collectionId:opts.collectionId}:{})
});
const catalog=[];
const groups=[
 ["quiet",10,{genres:['drama'],themes:['solitude','ordinary-life','routine'],
   tones:['reflective','tender'],pace:'slow'}],
 ["suspense",9,{genres:['thriller'],themes:['secrets','truth','betrayal'],
   tones:['tense','unsettling'],pace:'fast'}],
 ["comedy",8,{genres:['comedy'],themes:['friendship','community','ambition'],
   tones:['funny','playful'],pace:'medium'}],
 ["romance",8,{genres:['romance'],themes:['connection','memory','yearning'],
   tones:['intimate','wistful'],pace:'slow'}],
 ["documentary",7,{genres:['documentary'],themes:['labor','society','ordinary-life'],
   tones:['reflective','meditative'],pace:'medium'}],
 ["action",8,{genres:['action'],themes:['mission','survival','competition'],
   tones:['intense','energetic'],pace:'fast'}],
 ["horror",7,{genres:['horror'],themes:['secrets','isolation','dread'],
   tones:['eerie','unsettling'],pace:'slow'}],
 ["animation",20,{genres:['animation','fantasy'],themes:['magic','courage','quest'],
   tones:['wondrous','playful'],pace:'fast'}]
];
for(const [type,count,facets] of groups){
 for(let i=1;i<=count;i++){
  // Explicit collection IDs ensure ten franchise installments do not
  // count as ten independent forms of cinematic interest.
  const opts=type==='animation'?
   (i<=10?{collectionId:801}:(i<=15?{collectionId:802}:{})):{};
  catalog.push(make(type,i,facets,opts));
 }
}
const key=(type,n)=>'fictional-'+type+'-'+n;
const loved=(type,nums)=>Object.fromEntries(nums.map(i=>[key(type,i),'Loved']));
const liked=(type,nums)=>Object.fromEntries(nums.map(i=>[key(type,i),'Liked']));
const disliked=(type,nums)=>Object.fromEntries(nums.map(i=>[key(type,i),'Not for me']));
const foundation={
 ...loved('quiet',[1,2,3]),
 ...loved('suspense',[1,2]),
 ...liked('comedy',[1,2]),
 ...disliked('action',[1]),...disliked('horror',[1])
};
const loopRatings={...foundation,...loved('animation',[1,2,3,4,5,6,7,8,9,10])};
const profiles=[
 {name:'Fictional Eclectic',category:'movies',
  impressions:{...loved('quiet',[1]),...loved('suspense',[1]),...loved('comedy',[1]),
   ...loved('documentary',[1]),...loved('romance',[1]),...loved('animation',[11]),
   ...disliked('action',[1]),...disliked('horror',[1])}},
 {name:'Fictional Quiet Focus',category:'movies',
  impressions:{...loved('quiet',[1,2,3,4,5]),...liked('documentary',[1]),
   ...disliked('action',[1,2]),...disliked('animation',[1])}},
 {name:'Fictional Exposure Baseline',category:'movies',impressions:foundation},
 {name:'Fictional Exposure Loop',category:'movies',impressions:loopRatings,
  timestamps:Object.fromEntries([
   ...Object.keys(foundation).map(k=>[k,'2022-03-01T00:00:00Z']),
   ...Array.from({length:10},(_,i)=>[key('animation',i+1),'2026-10-23T00:00:00Z'])
  ])},
 {name:'Fictional Genuine Animation Fan',category:'movies',
  impressions:{...loved('animation',[1,2,3,4,5,11,12,13,16,17]),
   ...liked('comedy',[1]),...disliked('horror',[2]),...disliked('action',[3])}},
 {name:'Fictional Sparse Starter',category:'movies',
  impressions:{...loved('quiet',[1]),...disliked('action',[1])}}
];
module.exports=Object.freeze({catalog,profiles,key,groups});
