# Fictional dislike contrast — verified real-catalog checkpoint

Date: October 24, 2026 (UTC run 09:04)

## Research question

When a candidate shares community keyword tags with a hypothetical viewer's liked movies, does it also share tags with movies that fictional viewer dislikes? A shared keyword is not reliable evidence of viewing interest.

## Method

Two fictional profiles, using the same positive film histories as the previous baseline, each received two separate **shadow-only invented dislikes**:
- Fictional Cinephile: The Notebook; The Hangover.
- Fictional Eclectic: Transformers: Revenge of the Fallen; The Emoji Movie.

These dislikes do **not** enter the recommender's preferences, score, retrieval anchors, disallow list, or personal Log. They are only additional public catalog lookups for a diagnostic. The script uses the existing lab catalog endpoint and never persists movie/keyword source data in the output. All four controls resolved in the observed run.

The report's 48 evaluated films are a bounded rotating public-catalog sample; they are not an unbiased sample of all films. Pool-frequency keyword filtering is an evaluation heuristic, not an empirically calibrated semantic filter.

## Verified results

From the aggregate report at docs/real-catalog-latest.json:

| Keyword connection category | Films of 48 |
|---|---:|
| Specific positive-only (fictional liked examples, not disliked ones) | 14 |
| Specific links to both positive and negative examples | 9 |
| Negative-only specific links | 1 |
| Of the 9 mixed films: exact **same keyword** link to both liked and disliked | 5 |
| Mixed films linked through different positive/negative keywords | 4 |
| Positive-only + mixed = positive-side specific overlap | 23 |

**Four films** still qualified under the unchanged existing ranker (3 + 1). Among those four: **one** also had mixed positive/disliked keyword evidence; **zero** shared the *identical specific keyword* with both a liked and disliked anchor.

This is not human precision/recall, recommendation accuracy, or a validated false-positive rate. The negative histories are invented for research, and community tags can be unreliable. Even negative-only tags do not prove a user would dislike a candidate.

## What changed

- keyword-signal-audit.js now tracks specific negative-only, positive-only and mixed evidence separately, including exact same-keyword collisions and ambiguous different-keyword overlap.
- catalog-batch-audit.js resolves up to two optional fictional negative control titles/profile and enriches their public metadata solely for shadow comparisons. The negatives are **not** added to ranking or eligibility.
- tests/real-catalog-smoke.cjs uses 2 shadow controls per fictional profile.
- Raw source film metadata and individual keyword labels are not stored in the committed GitHub summary; numeric aggregate-only reporting is enforced by tests.
- Tests guard score/shelf invariance when shadow negatives are supplied.

## Engineering decision

**Do not give more weight to raw keyword overlaps yet.** We now know why: 9 of 23 films with specific positive connections also had specific links to fabricated dislikes in this bounded sample, and one of four already-qualified films had mixed evidence. This is a warning about ambiguity, not proof of wrong picks.

Next, we should measure how often independent, higher-quality evidence (verified filmmaker credits, plot substance, and actual voluntary viewing interest) corroborates these links, preferably on a much larger and rights-cleared sample before production.

No paid upgrade was purchased. No private viewing Logs or production recommendations were changed.
