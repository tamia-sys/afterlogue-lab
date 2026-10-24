'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const f=require('../cinematic-fingerprint.js');
const movie=(key,facets={},synopsis='')=>({key,title:key,facets,synopsis});
test('verified credits and genres stay distinct from keyword hints and synopsis clues',()=>{
 const x=f.build(movie('one',{
  genres:['Drama'],themes:['solitude'],tones:['melancholic'],
  directors:['tmdb-person-23'],writers:['tmdb-person-11'],
  narrativeThemes:['memory']},
  'An estranged painter returns to her hometown to reconcile with a former mentor.'));
 assert.deepEqual(x.verified.genres.values,['drama']);
 assert.equal(x.verified.directors.source,'tmdb-person-credit');
 assert.equal(x.keywordHints.tones.certainty,'inferred-from-keyword');
 assert.equal(x.synopsisClues.plotTopics.certainty,'unverified-plot-clue');
 assert.ok(x.synopsisClues.plotTopics.values.includes('homecoming'));
 assert.ok(x.synopsisClues.plotTopics.values.includes('reconciliation'));
 assert.ok(x.synopsisClues.plotTopics.values.includes('mentorship'));
 assert.ok(x.synopsisClues.plotTopics.values.includes('memory'));
 assert.ok(x.unknown.includes('visual-style'));
 assert.equal(x.editorial.pacing,null);
 assert.equal(x.sourceEvidence.hasOriginalKeywordNames,false);
});
test('explicit narrative structure phrases give cautious clues but not imagined visual style',()=>{
 const a=f.build(movie('one',{},'Told through letters and diary entries, the story unfolds in real time.'));
 assert.deepEqual(a.synopsisClues.explicitDevices.values,['epistolary','real-time']);
 assert.ok(a.unknown.includes('visual-style'));
 assert.ok(a.unknown.includes('pacing'));
 const b=f.build(movie('two',{},'A filmmaker creates a beautiful, stylish and slow-moving drama.'));
 assert.ok(b.synopsisClues.plotTopics.values.includes('artistic-practice'));
 assert.ok(!b.synopsisClues.explicitDevices.values.length);
 assert.equal(b.editorial.pacing,null);
});
test('no synopsis evidence means absence, not a negative user preference',()=>{
 const x=f.build(movie('none',{genres:['Comedy']}));
 assert.equal(x.sourceEvidence.hasSynopsis,false);
 assert.equal(x.synopsisClues.plotTopics.values.length,0);
 assert.equal(x.unknown.includes('pacing'),true);
 assert.equal(x.sourceEvidence.hasMappedKeywords,false);
});
test('independent film credits, synopsis clues and broad genres are not conflated',()=>{
 const source=movie('source',{genres:['Drama'],directors:['tmdb-person-123'],themes:['memory']},
  'A musician is forced to flee her homeland.');
 const same=movie('candidate',{genres:['Drama'],directors:['tmdb-person-123'],themes:['memory']},
  'An exiled singer becomes a refugee.');
 const r=f.compare(same,source);
 assert.ok(r.hasVerifiedCreatorConnection);
 assert.ok(r.links.some(x=>x.type==='shared-director-credit'&&x.evidenceLevel==='verified'));
 assert.ok(r.links.some(x=>x.type==='shared-mapped-theme'&&x.evidenceLevel==='keyword-hint'));
 assert.equal(r.links.some(x=>x.type==='shared-synopsis-topic'),false);
 const broadOnly=f.compare(movie('other',{genres:['Drama']}),source);
 assert.equal(broadOnly.specificLinkKinds,0);
});
test('coverage report measures known and unknown fields, not recommendation appeal',()=>{
 const report=f.summarize([
  movie('one',{genres:['Drama'],themes:['family'],directors:['tmdb-person-12']},'A filmmaker begins a road trip.'),
  movie('two',{genres:['Comedy']}),
  movie('three',{genres:['Thriller'],tones:['suspenseful']},'A detective investigates a murder mystery.')
 ]);
 assert.equal(report.titles,3);
 assert.equal(report.withSynopsis,2);
 assert.equal(report.withVerifiedCredits,1);
 assert.equal(report.withMappedKeywordHints,2);
 assert.equal(report.withAnyLiteralPlotClue,1);
 assert.equal(report.metadataWithoutPlotClues,2);
 assert.ok(report.note.includes('Unknown'));
});
test('never invent director IDs, pacing or emotional style from bare plot text',()=>{
 const x=f.build(movie('one',{},'An artist works at a painting studio in a lonely seaside city.'));
 assert.deepEqual(x.verified.directors.values,[]);
 assert.equal(x.editorial.pacing,null);
 assert.deepEqual(x.keywordHints.tones.values,[]);
 assert.ok(x.unknown.includes('editing-rhythm'));
});

test('optional raw provider keyword names are marked as community labels, not verified cinematic style',()=>{
 const a=f.build(movie('film-a',{genres:['Drama'],keywordNames:['Train station','visual poetry','Train station']},''));
 const b=f.build(movie('film-b',{genres:['Drama'],keywordNames:['train station','melancholy']},''));
 assert.equal(a.sourceEvidence.hasOriginalKeywordNames,true);
 assert.deepEqual(a.keywordHints.rawKeywordNames.values,['train station','visual poetry']);
 assert.equal(a.keywordHints.rawKeywordNames.certainty,'catalog-label-not-verified-film-style');
 assert.equal(a.editorial.pacing,null);
 assert.deepEqual(a.keywordHints.tones.values,[]);
 const shared=f.compare(a,b);
 assert.ok(shared.links.some(x=>x.type==='shared-original-catalog-keyword'&&
  x.evidenceLevel==='community-catalog-label'&&x.values.includes('train station')));
 assert.equal(f.summarize([movie('film-a',{keywordNames:['train station']}),
  movie('film-b',{genres:['Drama']})]).withOriginalKeywordNames,1);
});
