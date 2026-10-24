/* Lab-only synopsis topics. These are plot clues, not verified film style. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AfterlogueNarrativeSignals=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const rules={
  solitude:/\b(lonely|loneliness|isolated|solitary|living alone)\b/i,
  grief:/\b(grief|grieving|mourning|bereavement)\b/i,
  estrangement:/\b(estranged|reunion|reconnect|reunite)\b/i,
  routine:/\b(daily routine|everyday life|ordinary life|day.to.day)\b/i,
  memory:/\b(memories|memory|reminiscing|flashbacks)\b/i,
  migration:/\b(immigrant|immigration|migrant|refugee|exile)\b/i,
  ambition:/\b(ambition|ambitious|aspiring|pursuing a dream)\b/i,
  obsession:/\b(obsession|obsessed|fixation)\b/i,
  secrets:/\b(secret|secrets|hidden truth|deception)\b/i,
  adolescence:/\b(adolescence|coming.of.age|teenager|growing up)\b/i,
  illness:/\b(illness|diagnosis|cancer|dementia)\b/i,
  separation:/\b(divorce|divorced|breakup|separation)\b/i,
  music:/\b(musician|singer|composer|concert|pianist)\b/i,
  faith:/\b(prayer|church|pastor|monastery)\b/i,
  investigation:/\b(detective|investigation|murder mystery)\b/i
 };
 function extract(text){
  if(typeof text!=="string")return [];
  return Object.keys(rules).filter(k=>rules[k].test(text.slice(0,1600)));
 }
 return Object.freeze({extract});
});
