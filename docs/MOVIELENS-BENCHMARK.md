# Afterlogue Lab — large-scale offline benchmark

This is a **preference-ranking benchmark**, not a trained model, and it never changes the live Afterlogue site. It uses the existing deterministic ranking engines to compare versions with historical ratings rather than manually reviewing five posters over and over.

## Download rights and setup

Obtain MovieLens **latest-small** from the [official GroupLens page](https://grouplens.org/datasets/movielens/latest/) and extract the ml-latest-small folder yourself.

The dataset has approximately 100,836 ratings by 610 anonymized users on 9,742 movies. Review its [README and license](https://files.grouplens.org/datasets/movielens/ml-latest-small-README.html): research use has conditions and **commercial or revenue-bearing use requires GroupLens permission**. Afterlogue's business plans make this especially important. No endorsement is implied. Do not commit or redistribute the dataset or its histories. This benchmark never accesses the network.

Needs Node.js 20+; no npm dependencies.

## One-command offline baseline

Run from the afterlogue-lab repository root:

    node tests/benchmark-movielens.cjs --dataset /path/to/ml-latest-small --max-users 610 --k 5 --seed 42 --output reports/baseline.json

This compares **smoothed popularity** against the current **legacy Afterlogue ranker** using identical held-out test candidates. Its v2.1/cinematic score is **null** when no rich metadata is provided: genres alone do not constitute verified storytelling, tone or filmmaker evidence.

To enable experimental **v2.1** when detailed, lawfully sourced film features are available:

    node tests/benchmark-movielens.cjs --dataset /path/to/ml-latest-small --features /path/to/film-features.json --output reports/with-features.json

The optional JSON format is either:

    {"byTmdbId":{"123":{"themes":["solitude"],"tones":["reflective"],"directors":["42"]}}}

or:

    {"items":[{"key":"tmdb-movie-123","facets":{"themes":["solitude"],"tones":["reflective"]}}]}

The lab's **Export diagnostic snapshot** also includes compatible items, but only for its narrow snapshot candidate set. It does not enrich all MovieLens films. MovieLens IDs are NOT TMDB IDs; the runner joins them through links.csv. Respect the metadata provider's terms. The runner does not independently verify supplied feature accuracy.

## What the report means

For each qualifying user, the oldest 75% of ratings forms the training Log, while the newest 25% (at least five movies) is a fixed **held-out historically rated candidate set** for all models. A rating of 4 stars or above is a positive preference label.

The benchmark reports NDCG@5, Precision@5, Recall@5, number of recommendations returned, v2 qualification rates, metadata coverage and short/medium/long history slices. Users whose holdout lacks either positive or nonpositive titles are excluded and counted. The popularity baseline trains only on training portions, never heldout ratings. If an engine returns fewer than five, missing slots count as misses.

**This measures ranking of historically rated titles, not discovery of new titles or reasons someone loves a film.** Rating selection bias exists. Unrated titles are unknown, not dislikes. An offline ranking improvement does not establish that new viewers want to watch the films.

A low v2 eligible fraction with thin metadata is a **coverage failure**, not proof that the scoring logic misunderstands taste. Improve lawful metadata coverage before scoring changes.

## Validation

    node --test tests/benchmark-movielens.test.cjs
    node --test tests/*.test.cjs

The first suite creates fictional ratings in a temporary directory and uses mock scorers to test parsing, chronological splitting, metadata joins, repeat prevention, determinism, and reporting. It is not a real-dataset integration test; existing engine and policy tests remain necessary. No real MovieLens dataset or private Afterlogue member Log is included.

**Still needed for release:** test how actual catalog retrieval finds candidates, verify shelf diversity and zero repetition, and collect blind human watch-interest responses for genuinely unfamiliar films. Do not deploy v2 based only on this offline benchmark.
