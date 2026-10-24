# Afterlogue Lab — Does varied discovery predict individual interest?

**Research checkpoint:** October 24, 2026  
**Status:** OFFLINE, SYNTHETIC ONLY. The proposed Discover Again shelf rotation is **NOT validated for production** and is **NOT approved for production**.

## Why this check was necessary

The [three-shelf rotation prototype](DISCOVER-AGAIN-ROTATION-EXPERIMENT.md) increased the number of broad, previously underrepresented positively logged genre lanes surfaced to our eclectic fictional viewer, from 3 to 5 across fifteen suggestions. But genre coverage and the ranker's own score **are not independent evidence of what a person would actually want to watch**. The strong intuition that more genuine interests represented = better picks can fail.

The new [blind-interest-counterfactual.js](../blind-interest-counterfactual.js) compares an **unchanged eligible-ranking baseline** with the research-only reorder using separately supplied hypothetical first-impression interest judgments for specific invented film keys. The scoring/rotation modules never receive those judgments. The outcome module accepts the already-frozen candidate lists *after* generation. This prevents code-level leakage, **not** the type of genuinely blinded, independently recruited human evaluation needed for scientific validity.

The manually authored [fictional-interest-votes fixture](../tests/fictional-interest-votes.cjs) assigns interests to individual invented titles, including varying feelings about titles in otherwise liked genres. It is intentionally not a real survey, a calibrated human-behavior model, or an external ground-truth corpus. The fixture is part of testing that our evaluation can detect tradeoffs and failure—not an estimate of recommendation performance.

## Results: 3 sets of 5, simulated audiences only

| Entirely invented viewer / future reactions | Existing distinct liked lanes | Shadow distinct liked lanes | Interested in first 15, existing | Interested in first 15, shadow | Cautious conclusion |
|---|---:|---:|---:|---:|---|
| Eclectic / open-curious | 3 | 5 | 9 | 11 | Insufficient decisive votes for exact comparison; one response is Unsure |
| **Same eclectic Log** / selective-curious | 3 | 5 | **15** | **12** | Fictional negative result (rotation made interest worse) |
| Quiet-focused | 2 | 2 | 7 | 7 | No rotation performed |
| Varied taste baseline | 3 | 3 | 10 | 10 | Fictional tie |
| Varied taste + recent animation exposure | 3 | 4 | **12** | **11** | Fictional negative result despite expanded interest coverage |
| Genuine animation fan | 2 | 2 | 12 | 12 | No rotation performed |
| Sparse Log | 1 | 1 | 5 | 5 | No rotation performed; personal-history evidence remains weak |

The missing/unsure response in the open-curious eclectic scenario is treated as **unknown, not a dislike**. The exact swap difference is withheld unless every swapped and displaced item has a decisive fictional response; a possible range is provided separately. This is more honest than claiming a confident improvement based on partial information.

Crucially, **the same historical ratings and metadata can coexist with different feelings about unfamiliar individual films**. No deterministic genre-rotation rule can know which fictional future reaction is the right one. We intentionally included one alternative set of future reactions for the *same* eclectic Log to test this.

For example, the exposure-loop synthetic first fifteen increased from 3 to 4 represented interest lanes, yet declined from 12 to 11 positive-interest reactions; its test-harness net-positive difference was -2 because a promoted disliked title displaced a liked title. This is a **warning**, not a measured human outcome.

## What we implemented

- [blind-interest-counterfactual.js](../blind-interest-counterfactual.js): accepts a *frozen*, pre-existing baseline and shadow recommendation list plus a separate hypothetical "Interested", "Not drawn to it", or "Unsure" vote map. Reports interested, negative and unknown counts; how many items were promoted or displaced; minimum/maximum possible difference if responses are missing; and a conservative diagnostic status. Never auto-selects a scoring threshold.
- [tests/blind-interest-counterfactual.test.cjs](../tests/blind-interest-counterfactual.test.cjs): checks that more genre variety can **harm interest**; that two fictional viewers with the same known Log can disagree about future specific film titles; that unknown responses and tiny sample counts don't masquerade as validation; that the first five stay unchanged; that there are no duplicate entries or fake ratings; and that changing a relevance threshold doesn't automatically pick a "winning" configuration.
- [tests/fictional-interest-votes.cjs](../tests/fictional-interest-votes.cjs): clearly fictional, separately defined individual title responses for stress-testing the comparison code. These votes do **not** enter the ranker, eligibility evaluator or rotation policy.
- [sanitized synthetic counterfactual benchmark](synthetic-interest-counterfactual-2026-10-24.json): only numerical output and explicitly fictional scenario names. Individual invented title identifiers and per-title votes are omitted.

The existing Log-only ranking system, cinematic evidence pipeline, Supabase, production website and community tag flow are unchanged. No paid provider was contacted or upgraded.

## What these numbers are NOT

- Not actual users or scientific estimates of precision, accuracy, watch likelihood or post-viewing satisfaction.
- Not independent reviewers or genuinely blind human participants. The **implementation** withholds votes from scoring; the manually constructed source fixtures do not constitute a real blinded trial.
- Not proof that rotation improves, worsens or should be abandoned for all real audiences.
- Not evidence that a film's **genre** encapsulates their taste. Genres in these fixtures are simplistic stand-ins. Film traits remain partially unknown in the real catalog.
- Not a license to secretly use community tag contributions as taste inputs. The feature remains **independent of community feedback**, even with zero community participation.

## Decision

**Keep Discover Again rotation in Lab. Do not promote it to the live five-film experience yet.** The negative synthetic cases demonstrate that genre spread cannot serve as its own validation metric, and even a decent model-score threshold cannot guarantee interest in an individual unfamiliar film.

Next worthwhile experiment: compare hidden voluntary first-impression interest decisions with film-level candidate hypotheses, recording *what quality appealed* without revealing other people's answers first. Include prospective candidate exposure sampling, missing/unfamiliar responses, and whether participants actually watch and enjoy a title *later*, separately. Any test with real member data needs consent and a careful data minimization plan. Also preserve returning user's previously loaded recommendation session so rerendering Discover doesn't show unwanted repeats.

### Reproduce

    node --test tests/solo-taste-validation.test.cjs tests/multi-archetype-audit.test.cjs tests/shelf-rotation-shadow.test.cjs tests/blind-interest-counterfactual.test.cjs

All tests are intentionally offline, synthetic and production-independent. The workflow [Individual Taste Stability QA](../.github/workflows/solo-taste-qa.yml) is configured to run this set on relevant commits.
