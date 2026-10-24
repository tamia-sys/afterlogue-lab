# Afterlogue Lab — Learning individual taste with zero community data

Research checkpoint: October 24, 2026.

## Product rule

Community-contributed film qualities are **optional enrichment**, never a precondition for personalized discovery. A first-time member with only their own Loved, Liked, Okay, and Not for me impressions must still be able to receive carefully grounded picks from a licensed catalog. A member who never adds a tag must not be penalized.

The Lab already models a person's Log, favorites, watchlist and known catalog features independently. The new **solo-taste-validation.js** provides two diagnostics to test how well that personal model can maintain multiple tastes:

1. **Leave-one-rating-out:** hide one fictional user rating, rebuild their taste profile from *all the other ratings*, then ask if the hidden item has more evidence of similarity to the learned likes or dislikes. This explicitly removes the hidden item's favorite/watchlist indicators to prevent leaking its own outcome. Report coverage, pairs with positive affinity above negative, inverse orderings and abstentions. This is a *retrospective structural test*, not a valid estimate of actual human recommendation accuracy.
2. **Exposure-loop stress:** add ten or more fictionally liked, same-franchise animation titles to a varied existing Log and compare what happened to the previously supported quiet/live-action film probes. The report records whether previous individual taste evidence remains present and whether its score changed. A changing score can be investigated without rewarding mere suggestion exposure. This is a model stability safeguard, **not a claim of better future recommendations**.

Additional invariants explicitly checked:
- Disliking an individual title does not imply the entire genre is prohibited.
- "Watchlist" signifies interest, never proof of enjoyment. Separate curiosity features must not quietly become Loved ratings.
- The test rejects sparse information through clear abstentions rather than inventing film style, ratings or a stronger catalog.
- The output contains only aggregate counters, never the fictional film names, original ratings, individual taste patterns, or private records.
- The module has no dependency on community tags, user-submitted reviewer observations, account information, third-party social activity, remote services or generative models.

## Synthetic-only results

The targeted fixtures use three fictional positive quiet-film ratings, two fictional negative kinetic-film ratings, several fictional unseen comparison films, and a later stress injection of ten fictional animation-franchise impressions.

The goal of the unit tests is not to collect real user preference validation. No actual Afterlogue user Logs are pulled into Lab, and no results should be described as human viewing satisfaction or precision. Perfect pair ordering in a designed fixture is expected, **not a meaningful empirical performance score**.

## Engineering

- New pure validation module: [solo-taste-validation.js](../solo-taste-validation.js)
- Synthetic, repeatable stress tests: [tests/solo-taste-validation.test.cjs](../tests/solo-taste-validation.test.cjs)
- Isolated zero-network test workflow: [Individual Taste Stability QA](../.github/workflows/solo-taste-qa.yml)

Node check:

    node --test tests/solo-taste-validation.test.cjs

These additions make **no change to the actual recommendation scoring formula**, existing production rankings, the Afterlogue Supabase production project, live film-detail pages, or community quality contribution feature. We can consider calibrated changes only after a broader holdout with multiple realistic fictional user archetypes, suitable ground-truth interest signals, and clear metadata rights.

## Next evidence checkpoint

Build a multi-archetype historical test: an eclectic viewer with varied films, one with focused tastes, another who has recently rated many provider-suggested animations, and one with genuine strong animation preference. Compare *relative ordering, shelf diversity and unknown-evidence abstention* using exactly the same catalog and controlled rated Logs, then tune the Lab ranker only if the held-out outcomes support it. Avoid automatically treating recommendations shown as organically developed preference.
