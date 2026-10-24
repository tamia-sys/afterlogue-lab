# Afterlogue Lab — automated retrieval and structural stress testing

**Status: Experimental, isolated from production.** No user Log, TMDB requests, Supabase identity, third-party film metadata, or MovieLens data are required for this suite.

## Run it

From the root of the afterlogue-lab GitHub repository using Node.js 22:

    node --test tests/*.test.cjs

Run the 240-persona baseline structural audit:

    node tests/stress-personas.cjs --personas 240 --per-lane 24 --missing-rate 0.25 --strategy balanced

Compare with a two-seed retrieval simulation using the **same corpus and maximum nominal retrieved candidate count**:

    node tests/stress-personas.cjs --personas 240 --per-lane 24 --missing-rate 0.25 --strategy two-seed

Additional options: --seed 23, --budget 120, --shelf-size 5. No npm packages.

CI runs the regression tests and a faster 120-persona simulation for each retrieval mode on each commit.

## Exactly what happens

1. A seeded generator creates 8 fictional storytelling styles and fictional films with themes, genres, tones, directors, and some intentionally missing metadata.
2. It constructs fictional Logs covering 1–4 preferences, plus a few negative impressions.
3. An offline **provider approximation** returns bounded candidates. It compares a two-title seed against diversified anchors chosen using observed feature overlap (not the synthetic hidden style label).
4. Actual Afterlogue legacy ranking, v2.1 cinematic re-ranking, eligibility, the existing genre/style shelf balancing and the separate cinematic-anchor balancer all process the resulting candidate sets.
5. The report groups results by taste breadth and counts candidate coverage, first/second five-title shelf completion, duplicate and rated-title violations, source-anchor diversity, facet coverage, and breadth of synthetic positive styles represented.

The retrieval simulation is **not the actual TMDB algorithm**. The synthetic labels are not human-interest ratings. The model scores are rule-based. Nothing in the stress audit proves genuine taste understanding, predictive accuracy, or live catalog quality.

Do not present 100% synthetic style retrieval coverage as real personalization accuracy.

## Interpretation

Measure **coverage and relevance separately**. A system can retrieve from every style a viewer likes and still show poor films. It can also return five attractive choices without representing every interest on one page.

A two-seed baseline may return **more candidates** when given deeper pages from just two seeds, whereas diversified queries may find **broader candidate types** while fewer pass the eligibility policy. Compare both axes. Keep the same nominal source-result budget, but recognize that 2 and 8 provider queries have different request costs and may have different performance.

Never force out-of-taste titles into the main five to make a diversity metric look better. With a narrow taste profile, a consistent shelf is not itself a failure.

### Release gates

- Zero previously rated or previously shown titles.
- Zero fabricated matches from absent metadata.
- Five qualified recommendations only when the catalog truly supports five; never add filler.
- Meaningful *blind human* unfamiliar-title watch-interest improvement on the same test histories.
- Better breadth for varied preferences without quality regressions among focused viewers.
- Actual provider request latency and candidate retrieval coverage measured on representative real catalog searches.
- Provider/license permissions reviewed before working with real external ratings or metadata.

## What remains

1. Feed the Lab's **Export diagnostic snapshot** JSON into a real-candidate audit, preserving source evidence without exposing private member information.
2. Benchmark human ratings once rights allow and complete metadata coverage is available; see [MOVIELENS-BENCHMARK.md](MOVIELENS-BENCHMARK.md).
3. Run a blinded small volunteer watch-interest study before deploying a recommendation model change.

Do not deploy new scores or candidate retrieval rules to production based on these tests alone.


## Recorded synthetic benchmark checkpoint — 2026-10-23

Command settings: 240 synthetic viewers, 8 storytelling lanes x 24 films (192 fictional items), 25% missing cinematic metadata, seed 23, nominal 120-candidate result budget, K=5. Actual legacy ranker, v2.1 cinematic reranker, eligibility, and both existing lab balancing stages were used.

| Structural metric | Diversified anchors | Two-seed |
|---|---:|---:|
| Full first shelf (five) | 100% | 100% |
| Full second shelf (five more) | 90.8% | 94.2% |
| Positive synthetic taste lanes retrieved | 99.5% | 74.7% |
| Genres represented in first shelf, mean | 2.83 | 2.55 |
| Distinct contributing Log anchors in first shelf, mean | 3.45 | 3.01 |
| Eligible candidates per viewer, mean | 31.59 | 29.37 |
| Previously rated titles shown | 0 | 0 |
| Duplicate titles shown | 0 | 0 |

These are **not results from real viewers, real TMDB calls, or MovieLens ratings**. The synthetic two-seed and eight-anchor strategies consume different numbers of retrieval queries and return different actual numbers of candidates despite the same nominal result budget. The tradeoff is important: the diversified strategy provides broader synthetic taste coverage, while the deeper two-seed search completes slightly more second shelves.

**Engineering priority:** broaden candidate sourcing without sacrificing second-shelf coverage, request cost, or actual viewer relevance. These measures are exploratory diagnostics, not production release thresholds.
