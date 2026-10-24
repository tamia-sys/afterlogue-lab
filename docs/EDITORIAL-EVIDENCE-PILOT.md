# Afterlogue Lab — Independently Authored Cinematic Evidence
### Research checkpoint, October 24, 2026

## Why we built it

The previous real-catalog study found 23 specific community-keyword connections across 48 candidate films, but only **one** also shared an independently sourced same-Log-anchor filmmaker or explicit synopsis link. This does not mean the 22 remaining film pairs are unrelated: **the catalog lacks the information required to know**.

The new experimental module is a structured **original-film-observation protocol**, not an AI model, an automated film critic, or a scraped editorial database. It does not invent pacing, camera language or storytelling structure from keyword and plot text.

## Delivered code

- [editorial-evidence.js](../editorial-evidence.js): parses reviewer-declared observations, validates controlled labels and requires a separate, original explanation of each observation; marks unknown fields absent. Rejects tags pretending to originate from TMDB, unreviewed drafts, unrecognized dimensions and external editorials without a declared permission reference.
- [editorial-evaluation.js](../editorial-evaluation.js): compares *only* accepted independently authored observations for two films. Separately counts matching, differing, contradictory and unknown dimensions. Rejects duplicate film annotations rather than choosing an arbitrary review.
- [tests/editorial-evidence.test.cjs](../tests/editorial-evidence.test.cjs) and [tests/editorial-evaluation.test.cjs](../tests/editorial-evaluation.test.cjs): test contrasts between **invented films with invented screening-style notes** and deliberate omissions. These tests establish structural behavior, **not real human agreement or actual film style accuracy**.
- [catalog-batch-audit.js](../catalog-batch-audit.js): an optional shadow-analysis path accepts a set of *separately provided* reviewed annotations. Their comparisons are evaluated **after** the existing ranking, policy and shelf-balance operations. They cannot change recommendations, impressions, retrieval seeds, dislike filters or watchlists.
- [tests/catalog-batch-audit.test.cjs](../tests/catalog-batch-audit.test.cjs): regression ensures the input of three fictional editorial examples changes coverage counters but leaves recommendation qualification, shelf completion and repeat protections unchanged.

### Controlled vocabulary

| Dimension | Example values |
|---|---|
| Pacing | measured, moderate, brisk, variable |
| Narrative structure | chronological, nonlinear, episodic, fragmented, circular |
| Visual approach | observational, formal-composed, handheld-immediate, expressive-stylized, mixed |
| Performance mode | naturalistic, heightened, minimalist, mixed |
| Dialogue density | sparse, moderate, dialogue-driven |
| Emotional register | intimate, wistful, tense, playful, meditative, confrontational, expansive |

These are **editorial interpretations**, not objective metadata facts. An annotation's review status is **declared**, not externally verified. A declared license-reference field is not independent proof of commercial reuse rights. Before accepting external material, rights and authorship must be verified by a real review process.

## First actual catalog result

The bounded experiment evaluated **48 public film candidates** across two fictional viewers on October 24, 2026. Its independent-editorial coverage report was:

- **0 / 48** films had explicitly reviewed original stylistic annotations.
- **48 / 48** were correctly marked **unknown** for independent stylistic evidence.
- **0** new stylistic corroborations were produced.
- The existing taste model still structurally qualified **3 + 1** films for the two fictional profiles.

This is an accurate *missing evidence* report, not a recommender regression.

See: [Sanitized latest Lab report](real-catalog-latest.json).

## What is next, without requiring the founder to rate hundreds of films

1. **Create a small, balanced, rights-cleared pilot**: roughly 12–20 films spanning measured/fast, observational/stylized, episodic/nonlinear, mainstream/indie/international, with notes based on first-hand screenings or directly licensed editorial analysis. Do **not** use unsourced film-style guesses or source-derived TMDB keyword remappings as original observations.
2. Have a second person independently review a *small overlapping subset*. Record disagreements and uncertainty without coercing consensus. The current schema supports one review per film; multi-review arbitration is a separate next feature.
3. Test unfamiliar-film pairs **blind**, and separately collect volunteer interest signals. Multi-dimensional film similarity is not itself a reliable probability of wanting to watch.
4. Only if the reviews prove useful should a future scorer consider original cinematic evidence; until then the observations remain opt-in, experimental and disconnected from production.

The user has not purchased the proposed commercial provider upgrade. Do not begin commercial-scale use of restricted third-party content, license-dependent ingestion, ML model training, or any production rollout without a separate rights review and user approval.

## Practical command

Run locally or in GitHub Actions:

    node --test tests/editorial-evidence.test.cjs tests/editorial-evaluation.test.cjs tests/catalog-batch-audit.test.cjs

No private Afterlogue Logs are consulted; no personal information or copyrighted source review text is committed into the aggregate GitHub reports.
