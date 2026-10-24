# Cinematic evidence corroboration — verified two-profile result

**Experiment:** October 24, 2026. This is a bounded structural study of public film metadata using **fictional** taste histories. No member Logs, paid licensing, model training, production code or active recommendation scores were changed.

## What we evaluated

We retrieved real public film-catalog candidates through the separate Afterlogue Lab endpoint, evaluated 24 candidates per fictional profile, and compared each with a fictional liked-film history and separate shadow-only disliked-film controls.

Two films sharing a specific TMDB community tag does **not** mean they are similar enough to recommend. Our new source-provenance evaluator therefore requires a concrete connection to **the same liked Log film that shares the tag**:

- **Direct filmmaking credit:** Verified TMDB person ID for a shared director or writer.
- **Story clue:** A specific plot subject or explicitly stated storytelling device occurring in both film synopses, clearly labeled as an *unverified textual clue* rather than verified style.
- A shared broad genre, emotional tone, or theme already derived from the same TMDB keywords is **not counted as independently sourced corroboration**.

This is a deliberately conservative QA definition, **not a validated taste model**. Two films can absolutely have meaningful cinematic similarities our data cannot describe yet.

## Observed result (48 real candidate records)

| Metric | Films |
|---|---:|
| Specific positive-film community keyword connection | **23** |
| Positive keyword connection *only*, without same-anchor creator/story support | **22** |
| Positive keyword connection with same-anchor additional cinematic information | **1** |
| Of the corroborated titles: shared verified filmmaker credit | **1** |
| Of the corroborated titles: matching extracted plot topic or storytelling device | **0** |
| Keyword-linked titles sharing some specific tags with fictional dislikes | **9** |
| Keyword-linked titles with the **exact same specific keyword** also connected to a fictional dislike | **5** |

These two dislike-conflict categories overlap: the five exact collisions are included within the nine with mixed disliked-film evidence. This distinction was corrected after detecting a misleading diagnostic label in an earlier report.

The unchanged existing model qualified **three** candidates for the fictional Cinephile and **one** for the fictional Eclectic viewer. Among qualified candidates, **one** keyword link had same-anchor added evidence, **two** had only keyword support, and one qualified title had no usable specific keyword connection. This does **not** mean the qualified films are good/bad recommendations; qualifications are structural scores, not watched-and-liked validation.

## Important inference

The major blocker is no longer the *number of keyword labels available*. We have more than enough raw community tags to generate superficial matches. The blocker is **independent, meaningful cinematic information**.

Only 1/23 keyword-linked candidates had matching filmmaker or explicit plot evidence under our deliberately strict rule. Raising a recommendation score on the basis of the other 22 would reward unverified community-tag coincidence. It could make Afterlogue appear busier while worsening its taste intelligence.

This is also a **small, bounded selection** of candidates and fictional impressions. The available corpus of synopses is often sparse. Absence of corroboration is missing evidence, **not proof that films are dissimilar**.

## Code and QA boundaries

- [evidence-corroboration.js](../evidence-corroboration.js): pure same-anchor comparison, no network requests, no writes.
- [tests/evidence-corroboration.test.cjs](../tests/evidence-corroboration.test.cjs): checks credit-ID and synopsis support, shared-dictionary circular evidence, negative contradictions, different-Log-anchor false corroboration, and report privacy.
- [catalog-batch-audit.js](../catalog-batch-audit.js): computes counters *after* baseline ranking, eligibility and shelf construction.
- [tests/real-catalog-smoke.cjs](../tests/real-catalog-smoke.cjs): bounded live-provider structural audit of fictional histories.
- [docs/corroboration-baseline-corrected-2026-10-24.json](corroboration-baseline-corrected-2026-10-24.json): reproducible sanitized results, with correct exact-versus-mixed dislike metrics.

All published reports are allowlisted numeric aggregates with static fictional profile names, not raw TMDB records.

## Recommended next technical investigation

Prioritize **richer, auditable narrative/style information**—ideally directly licensed or independently annotated—rather than widening keyword searches or relaxing the evidence eligibility gate. Assess what TMDB actually offers before any additional use or paid plan. A promising next research artifact is a hand-checked, small evaluation set: expert-confirmed connections and misses for unfamiliar films, allowing us to measure false positives of each metadata evidence category. Voluntary user interest responses should be evaluated separately.

Do not change live recommendation scores or make new commercial data commitments based on this tiny QA sample.
