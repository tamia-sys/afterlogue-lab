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

## Candidate rejection and retrieval-source diagnostics (updated October 23)

The one-click audit now reports a reconciled **candidate funnel** for each fictional profile:

- Eligible candidates, and mutually exclusive rejections attributed to non-positive final score, missing cinematic evidence, missing positive-Log support, or other eligibility reasons.
- Evaluated/qualified counts for **title-linked-only**, **independent-browse-only**, and **both-route** candidates. These show which source adds qualified candidates, not whether TMDB as a whole is accurate.
- How many qualified picks have one versus multiple cinematic signal types for their strongest positive title match.
- An explicitly labeled possible bottleneck: candidate scarcity, sparse metadata response, eligibility shortfall, shallow strongest evidence, or no obvious structural blocker.

Each report includes a candidate-accounting check: eligible + rejected must equal the evaluated candidate count. Any mismatch appears in the UI.

Earlier read-only lab evidence indicated 10 of 20 strongest links used a shared tone, 8 used a specific theme, 1 a director credit, and 1 a synopsis topic. All were **single-type best-film links**; this does not rule out more varied weaker evidence elsewhere in the Log or establish a psychological explanation for a viewer's taste.

These expanded diagnostics are implemented and passed mocked-provider tests, but **not yet run against the real catalog in a complete five-profile batch**. This distinction should be preserved in reporting.

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

## Score calibration from voluntary Lab reactions

A separate, experimental **score-calibration** line now appears below the recommendation shelf after an attraction decision. It freezes each film's match score **at display time**, then compares two different subsequent responses:

- Interested
- Not drawn to it

The line shows mean scores for each reaction and a descriptive pairwise AUC (the fraction of interested-vs-passed film pairs where the interested film received a higher score, counting ties as half). AUC is unavailable until both groups have at least one response. It also identifies explicitly marked new-and-interesting films without assuming an unmarked film is unfamiliar.

The result is **not** a calibrated viewing probability, statistical significance claim, measurement of enjoyment after watching, or evidence of unseen films being uninteresting. This is a small voluntary session sample and an internal diagnostic only.

Read-only review of prior lab events from the latest v2.1 experiment (run 2) found **5 Interested responses averaging score 29.58** versus **3 Not drawn to it responses averaging 30.87**; 12 other displayed films had no attraction decision. These 8 decisions are insufficient to prove a general performance deficit, but they directly motivate measuring score-interest alignment rather than maximizing similarity scores.

No database schema, Supabase Edge Functions, user history, or live Afterlogue recommendation behavior was modified. The score calibration and five-persona public catalog audit are entirely within the separate Lab frontend.

Test the new feature with:

    node --test tests/interest-calibration.test.cjs tests/catalog-batch-page.test.cjs

## Test

    node --test tests/catalog-batch-audit.test.cjs tests/catalog-batch-page.test.cjs
    node --test tests/*.test.cjs

The tests use mocked public-catalog responses and the real Lab ranker and eligibility functions. Passing does not prove the live provider's real results. A five-profile real provider run has not been executed from this new batch feature yet.

Next: inspect its first exported aggregate report, investigate shallow evidence coverage, and expand candidate discovery without compromising relevance. Real blind watch-interest feedback is still required before any production deployment.
