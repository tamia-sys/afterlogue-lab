# Afterlogue Lab — multiple tastes without community feedback

**Study date:** October 24, 2026  
**Scope:** Six entirely fictional viewer histories; 77 synthetically authored movie records, invented metadata facets and ratings; **no real viewer data, community tags, paid license, production ranking changes or external catalog calls**.

## Why this exists

Afterlogue should learn from the person's *entire Log* even if they never add a community film tag. A member who loves quiet cinema, comedies and animation should not be forced into just one profile. Conversely, viewers who sincerely prefer animation should not be pushed into live-action just to satisfy a diversity quota.

The earlier single-history QA isolated the "recent suggestions become a feedback loop" problem. This new audit runs the **existing two-stage Lab ranker** (general ranking plus cinematic evidence scoring), the **existing eligibility policy** and the **existing five-card shelf balancing function**, without modifying any of them. It then compares resulting genre lanes and original interest coverage across six fictional scenarios.

## Six profiles and first five films

| Completely fictional viewer | First-five genre lanes | Supported taste lanes in fictional history | Supported lanes represented in first five |
|---|---|---:|---:|
| Eclectic | 2 drama, 2 documentary, 1 animation | 6 | 3 |
| Quiet-focused | 3 drama, 2 documentary | 2 | 2 |
| Original varied taste (before new exposure) | 2 drama, 2 suspense, 1 comedy | 3 | 3 |
| Original varied taste **plus 10 recently Loved animations from one collection** | 2 drama, 1 suspense, 2 animation | 4 | 3 |
| Genuine animation fan | 5 animation | 2 | 1 |
| Sparse starter (only one positively rated film) | 3 drama, 2 documentary | 1 | 1; **history insufficient for a supported taste understanding** |

All six generated five eligible, positively scored suggestions from the same **fictional 77-item catalog**. The synthetic output had zero shown/rated source reuse and zero duplicate recommendations. The fact that a title qualifies under this synthetic scoring setup does **not** establish relevance, perceived quality, discovery success, or anything about real member satisfaction.

The eclectic test is informative: the engine honored three distinct lanes but did not represent three other positively logged lanes in the first five. Some missing lanes did have other eligible candidates elsewhere in the pool. This is an opportunity to study multi-taste *rotation* in successive recommendation sets, not a reason to inject off-taste wild cards.

The exposure-loop test is also limited: ten explicit fictional **Loved** ratings from one collection were added to an older varied history. The shelf retained quiet-film and suspense entries while adding two animation picks. We have not proven an ability to tell whether the member *truly* liked those recent animations or was merely influenced by the platform—explicit ratings are legitimate choices and should not automatically be discounted.

The genuine animation fan received five animated films. That is acceptable in this controlled scenario because **the fictional Log expresses a strong animation preference**. Arbitrary category quotas would have overridden the user's stated tastes.

## What this study does—and does not—measure

- **Does test:** sensitivity to multiple taste lanes, severe recent concentration, coherent focused interest, exposure-loop repetition, legitimate single-lane dominance, sparse-history caution, known/rated/shown exclusion, and zero-community invariance.
- **Does not test:** actual viewing enjoyment, real user behavioral change, metadata quality in the open catalog, qualitative film similarities beyond this synthetic fixture, or recommendation accuracy with humans.
- **Does not change:** Afterlogue's original ranker, cinematic scorer, policy, production model, website, Supabase, or new community tagging workflow.
- **Data privacy:** the published report contains numeric totals and six explicitly fictional scenario labels only—never real film IDs, viewer records, source profiles, individual scores, or private opinions.

The new test **inserts fictitious community metadata into the fixture** and confirms the output is exactly unchanged. The recommendation pipeline therefore does not depend on community contributions at all.

## Next engineering experiment

Build a **shadow, consecutive-shelf interest-rotation audit** before tuning scores. Afterlogue should keep each five-film shelf relevant while gradually surfacing different authentic tastes across later Discover Again requests. Test exclusion of already-shown suggestions, whether previously underrepresented supported lanes get meaningful opportunities in shelf two/three, and the stability of genuine focused interests.

Do **not** enforce "one of every genre," forcibly introduce an out-of-taste wild card, or assume the current catalog has enough good candidates for every taste. Apply any future scoring or balancing change only after stronger held-out tests on varied fictional profiles and appropriate real-world voluntary feedback.

## Code and reproducibility

- [multi-archetype-audit.js](../multi-archetype-audit.js): pure bounded, numeric-only structural report.
- [tests/multi-archetype-fixture.cjs](../tests/multi-archetype-fixture.cjs): six clearly fictional cases and synthetic film properties.
- [tests/multi-archetype-audit.test.cjs](../tests/multi-archetype-audit.test.cjs): ten assertions covering interest breadth, focus, loop, genuine animation preference, full exclusions and no-community invariance.
- [sanitized numerical benchmark](synthetic-archetype-baseline-2026-10-24.json)
- [Individual Taste Stability QA](../.github/workflows/solo-taste-qa.yml): runs this together with the earlier Log-only holdout and stability regressions.

Local test command:

    node --test tests/solo-taste-validation.test.cjs tests/multi-archetype-audit.test.cjs
