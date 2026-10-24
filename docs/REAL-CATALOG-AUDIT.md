# Afterlogue Lab — real film-catalog batch audit

The Lab includes **Audit five fictional viewers**, a one-click **opt-in** audit of the five hardcoded fictional histories at the chosen viewing phase (0, 1, or 2).

Only the experimental afterlogue-lab website was modified. The production Afterlogue website and recommendation engine were not changed.

## How to use

1. Open the separate Lab page after GitHub Pages has deployed these changes.
2. Select a viewing-session phase, which determines how much fictional history each profile has.
3. Click **Audit five fictional viewers**. Five bounded public-catalog retrieval/ranking passes run sequentially. **Stop audit** prevents additional profiles after the current request.
4. Review the per-profile table and click **Export batch report** to save the structural summary.

The batch uses the existing Lab public-catalog endpoint: limited title-linked recommendations, independent browse, feature lookup, v2.1 cinematic reranking, eligibility and shelf balancing. No generative AI, authenticated account data or private member Log is accessed. The export contains counters only — no emails, private notes, user IDs or per-film interest responses.

Request caps: four title-recommendation requests and one independent-browse request per fictional profile, plus title-resolution and 12-ID feature requests. At most 60 candidate films per profile are evaluated. This is a **smaller provider sampling strategy** than the normal interactive Lab, so do not compare raw counts as if the request budgets were identical. Requests can be rate-limited.

## Measures

- Retrieved candidates, deduplicated provider results, rated titles removed, evaluated and deferred counts.
- Metadata returned, plus theme, tone, director and plot-topic coverage.
- Qualified candidates, multi-signal matches, plot-only matches and five/ten-title shelf coverage.
- Distinct genres and distinct positive Log anchors in the first shelf.
- Repeat and previously-rated-title safety violations.

**Not measured:** real viewer watch interest, enjoyment, film quality, inferred psychological motivations, true TMDB catalog recall, live latency benchmarks or machine learning. Missing cinematic metadata remains unknown.

## Actual recorded catalog checkpoint — October 23, 2026 (local)

Read-only analysis of existing lab telemetry, filtering to build taste-v2-1-plot-anchor-1 and Lab run 2, found:

- Four five-film shelves: 20 film recommendations and **20 distinct IDs**. There were no within-run repeats.
- Four distinct strongest Log anchors occurred among those choices.
- All 20 choices showed **one cinematic evidence signal type for their best-matching Log film**, and zero had two or more. This suggests an evidence-depth or metadata coverage limitation, not necessarily low viewer interest.
- This was one fictional cinephile history across consecutive shelves, **not** five different real viewers or a validated discovery success rate.

A browser test code can persist across restarted runs. Do not miscount between-run repeats as within-run repeats.

## Telemetry compatibility repair

The prior Lab client tried to save an event named pipeline_audit, but the Supabase lab events table only accepts session_start, batch_shown, feedback and batch_error. The Lab now includes compact pipeline diagnostics in the allowed batch_shown event payload as pipeline_audit instead. This preserves the audit without changing the database schema, existing event type constraints or production code.

A fresh browser run is still required to verify the revised telemetry writes end to end. The new opt-in catalog batch audit makes no telemetry writes: it displays and exports its result locally.

## Test

    node --test tests/catalog-batch-audit.test.cjs tests/catalog-batch-page.test.cjs
    node --test tests/*.test.cjs

The tests use mocked public-catalog responses and the real Lab ranker and eligibility functions. Passing does not prove the live provider's real results. A five-profile real provider run has not been executed from this new batch feature yet.

Next: inspect its first exported aggregate report, investigate shallow evidence coverage, and expand candidate discovery without compromising relevance. Real blind watch-interest feedback is still required before any production deployment.
