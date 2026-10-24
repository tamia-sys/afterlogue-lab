# Afterlogue Lab — Cinematic Fingerprint (research-only, shadow mode)

**Status:** Implemented as a lab-only pure JavaScript analyzer and integrated into the five-profile catalog audit and initial film-metadata coverage display. **It does not affect recommendations, eligibility, ranking, production data, or private Logs.**

## The source problem we actually identified

The existing lab public-catalog function requests per-title TMDB details plus keywords and credits in one request. It currently maps only a narrow set of literal keyword phrases to theme and tone labels and returns those mapped labels plus verified filmmaker IDs. The **original keyword labels are discarded** in the response, and there is no validated visual-style, editing-rhythm, or pacing metadata. Increasing retrieval page counts cannot automatically solve missing evidence.

## What the Fingerprint currently does

Builds a structured observation for an already fetched public catalog entry:

- Direct/factual metadata: genres, verified TMDB-person director IDs, and writer IDs.
- Community-keyword-derived hints: currently mapped themes and tones. These are **not verified emotional characteristics**.
- Conservative literal synopsis clues: previously available plot topics plus 13 extra **explicit story-subject phrases**, and nine explicit storytelling devices (such as "time loop", "found footage", "told through letters"). These describe language in synopsis copy; they do not establish the movie's actual artistic form.
- Optional original keyword names, **only when supplied** by an upstream service. The current lab catalog service does not provide them; its visibility is measured as zero rather than invented.
- Unknown attributes: visual style, editing rhythm, performance style, and pacing unless separately provided. Genre or synopsis text alone does not justify them.

An independent candidate-versus-Log evidence inspector categorizes shared creator credits, broad genres, mapped keywords, and literal plot clues by source. It has **no write access** and does not change the v2.1 taste scorer.

## How to check it

When the lab website generates a fictional viewer's initial shelf, the Metadata and retrieval audit section now shows a short Cinematic Fingerprint line: factual credit coverage, keyword-label coverage, new literal synopsis clues and explicit storytelling-device clues. The five-profile batch audit adds aggregate experimental plot-clue coverage, potential connections, and per-profile counts.

**"Potential connection" is not a qualified recommendation.** Two synopses might share an explicit plot phrase while the films would not appeal to the same person.

### Testing

From the afterlogue-lab repo root:

    node --test tests/cinematic-fingerprint.test.cjs tests/catalog-batch-audit.test.cjs tests/catalog-batch-page.test.cjs
    node --test tests/*.test.cjs

The focused tests cover provenance, unknown fields, cautious extraction, visible coverage, opt-in raw keyword labels, the candidate-funnel interface, and regression protection that the shadow analyzer does **not** alter rankings.

## Next steps (gated)

1. Run the five fictional profiles against the **actual public catalog** and inspect the Fingerprint coverage report.
2. Evaluate errors in literal synopsis detection; record precision, missed cues, ambiguous labels, and language sensitivity before expanding the dictionary further.
3. Before any backend changes that expose/persist more original TMDB data, assess TMDB's contractual terms and the user's intended commercial use. Current [TMDB FAQ](https://developer.themoviedb.org/docs/faq) says commercial use requires a license, and the [API terms](https://www.themoviedb.org/api-terms-of-use) restrict derivatives, commercial use and AI/ML. Do not assume the research proof-of-concept authorizes an eventual for-profit service.
4. If the user authorizes a safe path and the relevant rights are clear, enhance a **separate Lab-only metadata source** to provide additional sourced, public film attributes with strict cache limits and coverage diagnostics. Do not secretly update the live catalog service or build an unlicensed mass TMDB-derived training dataset.
5. Once sourced data has improved, validate any candidate-rank changes against actual unseen-film interest, not just counts.

**No TMDB API token is stored in this repo. No new requests to TMDB were made by the Fingerprint.**
