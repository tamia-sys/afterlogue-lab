# Recommendation Engine v2 — validation protocol

This experimental lab must not be promoted to production based solely on successful unit tests.

## Automated regression suite

Run `node --test tests/*.test.cjs` from the repository root. Tests cover
candidate eligibility, negative evidence, older Log preferences, multi-anchor
matching, feedback similarity and deterministic ranking.

## Comparison protocol

1. Freeze an identical candidate set and verified metadata for v1 and v2.
2. Evaluate all five fictional profiles at onboarding, after new impressions,
   and after longer-term logging.
3. For each 5-film shelf record: repeat/rated-title violations, genre/franchise
   concentration, positive vs negative Log evidence, number of distinct Log
   anchors, and candidate metadata coverage.
4. Blind-review the top five for actual watch interest. Diversity alone is
   not evidence of relevance.
5. Report results separately for cinephile, casual, animation enthusiast,
   eclectic viewer, and longtime member. Do not average away a failing profile.
6. Require zero repeat/rated violations and meaningful improvement in watch
   interest without regressing any profile before considering production.

## Known limitations

TMDB keywords and credits are sparse proxies for pacing, tone and emotional
texture. A match on one shared mood keyword is not proof of user preference.
A passing unit test is not proof of recommendation appeal.
No live user data is needed for the synthetic comparison.
