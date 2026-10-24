# Afterlogue Lab — keyword specificity validation (October 24, 2026)

## Current status

This experiment is **research-only**. The Keyword Signal Audit filters broad and unusually common TMDB community keywords **inside the Lab shadow-analysis layer**, not in the active ranker. It introduces no production changes and requires no paid API upgrade.

### Verified bounded public-catalog audit

Latest aggregate report: [docs/real-catalog-latest.json](real-catalog-latest.json)

- Two fictional cinema profiles; 24 public film candidates analyzed for each (48 total).
- 30 / 48 titles (62.5%) shared one or more original TMDB community keyword labels with a fictional positive Log entry.
- **23 / 48 (47.9%)** shared at least one label that was *not* on the conservative generic list and was not frequent within that particular pool.
- **7 / 48 (14.6%)** linked only through generic or pool-common tags.
- **9 / 48 (18.75%)** had two or more surviving shared labels; these remain annotations from the same community source, not independent verification.
- Only 3 and 1 previously qualified titles remain in the two profiles. The shadow filter does not alter eligibility, scores, or actual shelves.
- **No negative-anchor cross-check was possible on these two histories**, because both fictional histories contain positive impressions only. Negative-intersection behavior was exercised in isolated fixture tests, **not** verified against real dislikes.

This is a small-sample structural finding, **not proof of film quality or improved human discovery interest**. A locally uncommon keyword is not globally rare. A label can be specific but misleading. This filter's thresholds are evaluation heuristics and must be tested beyond two profiles.

## What was built

- [keyword-signal-audit.js](../keyword-signal-audit.js): pure function that normalizes and deduplicates community labels, separates a conservative generic tag list and high-frequency tags, counts distinct specific overlap, and detects overlaps with negative Log examples when available.
- [tests/keyword-signal-audit.test.cjs](../tests/keyword-signal-audit.test.cjs): six fixture cases, including common/generic false positives, distinct overlaps, negative examples, no tag visibility, and safety of aggregate-only output.
- [catalog-batch-audit.js](../catalog-batch-audit.js): shadow diagnostics invoke the new module *after* scoring, eligibility, and first/second shelf calculation. Score computation is never fed its outputs.
- [tests/real-catalog-smoke.cjs](../tests/real-catalog-smoke.cjs) and [real-catalog-smoke.yml](../.github/workflows/real-catalog-smoke.yml): bounded real-provider run with numeric aggregate-only GitHub summary; no private Logs, account IDs or individual movie keywords published.
- [index.html](../index.html): displays the explanatory diagnostic counts in the separate Lab only.

## Interpretation and next experiment

We now have stronger evidence that catalog keyword **availability** is not the principal remaining problem. Relevance and corroboration are the next problem.

Next validate surviving labels against intentionally chosen *unrelated* films and fictional negative anchors, with a controlled sample design. Avoid turning a shared tag into a positive score until we have measured false positives and actual voluntary viewing interest. Preserve the current no-repeat and previously-rated-title gates.

The user has not purchased commercial TMDB access yet. Any production/commercial exploitation, mass persistence, AI/ML training, or new licensing commitment remains outside this research scope.
