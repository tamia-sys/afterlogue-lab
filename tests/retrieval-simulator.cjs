/* Synthetic retrieval simulator: compares narrow vs multi-anchor candidate sourcing.
 * NEVER used by the live website. Provider behavior is deliberately simplified;
 * results cannot establish TMDB catalog relevance or human viewing interest. */
'use strict';
function intersection(a,b){const s=new Set(b||[]);return (a||[]).filter(x=>s.has(x)).length}
function affinity(a,b){
 const x=a.facets||{},y=b.facets||{};
 return 1.2*intersection(x.genres,y.genres)+2*intersection(x.themes,y.themes)+
  1.1*intersection(x.tones,y.tones)+1.5*intersection(x.directors,y.directors)+
  (x.pace&&x.pace===y.pace?.3:0);
}
function hash(value){let h=2166136261;for(const c of String(value)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0}return h>>>0}
function selectAnchors(log,items,{strategy='balanced',maxAnchors=8}={}){
 const byKey=new Map(items.map(x=>[x.key,x]));
 const positive=[...log].filter(([,v])=>v==='Loved'||v==='Liked')
  .map(([key,rating],i)=>({item:byKey.get(key),rating,order:i})).filter(x=>x.item);
 if(strategy==='two-seed')return positive.slice(0,2).map(x=>x.item);
 if(strategy!=='balanced')throw Error('Unknown synthetic retrieval strategy');
 // Choose new anchors that differ from already represented visual/storytelling
 // characteristics instead of always repeating a person's earliest two Likes.
 const selected=[],remaining=[...positive];
 while(selected.length<Math.min(maxAnchors,positive.length)&&remaining.length){
  const scored=remaining.map((p,i)=>{
   const nearest=selected.length?Math.max(...selected.map(x=>affinity(x,p.item))):0;
   const genreNovelty=selected.some(x=>intersection(x.facets.genres,p.item.facets.genres)>0)?0:1;
   return {i,score:(p.rating==='Loved'?.2:0)+genreNovelty*3-nearest};
  }).sort((a,b)=>b.score-a.score||a.i-b.i);
  const chosen=remaining.splice(scored[0].i,1)[0].item;selected.push(chosen);
 }
 return selected;
}
function retrieve(items,log,{strategy='balanced',maxAnchors=8,perAnchor=18,limit=120}={}){
 const rated=new Set(log.keys());
 const candidates=items.filter(x=>!rated.has(x.key));
 const anchors=selectAnchors(log,items,{strategy,maxAnchors});
 const queues=anchors.map(source=>candidates.map(item=>({item,score:affinity(item,source)}))
  .filter(x=>x.score>0)
  .sort((a,b)=>b.score-a.score||hash(a.item.key)-hash(b.item.key))
  .slice(0,perAnchor));
 const result=[],seen=new Set();
 let round=0;
 while(result.length<limit&&round<perAnchor){
  let added=false;
  for(const queue of queues){
   if(round>=queue.length)continue;
   const {item}=queue[round];
   if(seen.has(item.key))continue;
   seen.add(item.key);result.push(item);added=true;
   if(result.length>=limit)break;
  }
  round++;
  if(!added&&round>=perAnchor)break;
 }
 return {items:result,anchors:anchors.map(x=>x.key),requested:anchors.length*perAnchor,
  returned:result.length,duplicatesPrevented:queues.reduce((s,x)=>s+x.length,0)-result.length,
  strategy,limitation:'synthetic candidate-provider approximation, not TMDB'};
}
module.exports={affinity,selectAnchors,retrieve};
