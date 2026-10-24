# Afterlogue Lab — Discover Again across three sessions

**October 24, 2026.** A bounded, offline *shadow* comparison on fictional movie Logs and invented catalog facts. No production recommendations, Supabase data, community film tags, paid metadata purchases, or actual user's Log were modified or consulted.

## Research question

Can Afterlogue honor several sincere interests **across successive sets of five**, rather than compressing every part of a person's taste into the first five or repeating the same two catalog categories forever?

A good answer is not "enforce genres." It requires that (a) candidates already qualify through the independent Log-based ranking and cinematic evidence tests; (b) a member's first five remain stable; (c) later shelves may introduce a previously underrepresented **positively logged** category only when a comparably ranked eligible film exists; and (d) members with a truly focused taste are not pushed into irrelevant categories.

## Implemented, research-only

- [shelf-rotation-shadow.js](../shelf-rotation-shadow.js): a pure, offline *reordering* of 5-card shelves from the **unchanged** ranked, cinematic-scored and qualified candidate pool. No score increases, new films, genres, keyword substitution, community observations, AI training or external calls.
- [tests/shelf-rotation-shadow.test.cjs](../tests/shelf-rotation-shadow.test.cjs): twelve unit tests for unchanged first shelf, no repeats, previously shown/decided exclusion, no fabricated titles, existing score preservation, real vs forced genre focus, low evidence, no community dependency and genre/candidate scarcity.
- [frozen synthetic numeric benchmark](multi-session-rotation-baseline-2026-10-24.json): aggregate scenario counts and broad genre-lane distributions, no identifiers for people or candidate films.
- [Individual Taste Stability QA](../.github/workflows/solo-taste-qa.yml) includes the rotation tests alongside earlier individual Log and multi-archetype tests.

**Algorithm (deliberately provisional):** The original first five are unchanged. For the next two five-film shelves, the shadow process can bring forward no more than two candidates per shelf, only if all of these conditions hold: an already eligible movie is within the next forty candidates of the baseline order; its genre lane is represented by a *positive rating in that person's own Log*; that film also has a positive matched anchor from the **same** lane; its score is at least **80%** of the title it temporarily leapfrogs; and the lane is underrepresented so far. It enables this only when at least three supported taste lanes are eligible, thus leaving focused histories alone. The 80% ratio and any lane limits are unvalidated experimental knobs, not a justified production threshold. "Genre lanes" are rough metadata proxies, not a verified film-style fingerprint.

## Results on six deliberately fictional viewers

Each scenario used the **same 77 synthetically fabricated film records** and the same existing Lab ranker:

| Fictional taste profile | Distinct supported lanes in existing 15 | Distinct supported lanes in shadow 15 | Promotions | First five changed? |
|---|---:|---:|---:|---|
| Eclectic, six liked lanes | 3 | **5** | 4 | No |
| Quiet-focused | 2 | 2 | 0 | No |
| Varied baseline before new animation tastes | 3 | 3 | 4 | No |
| Varied baseline plus ten recently Loved films from one animated collection | 3 | **4** | 4 | No |
| Genuine animation fan | 2 | 2 | 0 | No |
| Sparse first-time viewer | 1 | 1 | 0 | No |

Every promotion in this fixture met the temporary score floor, no selected film was duplicated over the three shelves, and the first five remained identical for each profile. An unusual and important observation: promoting genre diversity in the shadow shelves can **lower the existing scorer's mean score** even when it stays within the accepted 80%-of-leader bound. For the exposure-loop fictional profile, the baseline third-shelf average was about **79.06** while shadow third-shelf average was **67.52**. We **do not know** whether the viewer would consider that tradeoff good or bad. This is exactly why it is a shadow experiment rather than a production launch.

A focused animation viewer was deliberately not forced into unrelated picks. Where genre coverage cannot improve under the score floor, the process does not invent or promote a weaker film. The broader user experience still depends on actual legal and reliable catalog supply, which this tiny designed synthetic catalog cannot represent.

## Important distinction: exposure vs preference

An explicit "Loved" impression is a genuine action, whether the platform recommended the movie or not. An **exposure loop** means that the platform disproportionately shows one type of film, so the user's rated Log becomes biased toward that subset of what they were offered. We must avoid confusing this with evidence that the user *only* enjoys that genre. The 10-animation scenario tests stability, but does not identify true causal preference.

A future research question is whether a rotation across many relevant positive anchors actually improves **voluntary interest in unfamiliar titles** under an exposure-balanced, consent-based human study. Do not use mere genre coverage or synthetic ranker score as substitute for real relevance.

## Guardrails and next gate

1. Hold onto the **five main personalized picks**: no off-taste wild cards and no secret forced genre quotas.
2. Preserve re-entry state, shown-film exclusion, decisions and shelf continuity once a future live experience implements this idea. The shadow module itself **does not** change the live site's Discover Again behavior or fix mobile navigation persistence.
3. Test against sparse and mixed metadata, genuine user interest, and several realistically different histories. If reliable relevance is worse, reject the rotation even if it improves lane diversity.
4. Community-contributed tags are **independent, optional** enrichment. The ranker and this shadow rotation work unchanged when all community metadata is absent.
5. Never move this experiment to production without a separate behavior check and explicit sign-off.

No claims of empirically validated recommendation accuracy, psychological insight or better viewer enjoyment are warranted yet.

### Local command

    node --test tests/solo-taste-validation.test.cjs tests/multi-archetype-audit.test.cjs tests/shelf-rotation-shadow.test.cjs
