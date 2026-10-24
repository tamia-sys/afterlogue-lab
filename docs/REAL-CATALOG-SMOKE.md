# Afterlogue Lab — bounded real-catalog smoke audit

## Status

A credential-free, read-only Node runner is committed. It is configured to run via a GitHub Actions workflow when its runner or workflow changes, or via a manual workflow dispatch. Do not claim a real provider run succeeded until the job or aggregate report can be checked.

- Workflow: [.github/workflows/real-catalog-smoke.yml](../.github/workflows/real-catalog-smoke.yml)
- Runner: [tests/real-catalog-smoke.cjs](../tests/real-catalog-smoke.cjs)
- Mock tests: [tests/real-catalog-smoke.test.cjs](../tests/real-catalog-smoke.test.cjs)
- Previous shadow analysis: [CINEMATIC-FINGERPRINT.md](CINEMATIC-FINGERPRINT.md)

## Research scope and safeguards

This script uses the already-existing, separate public Afterlogue Lab Supabase Edge Function. There are **no API keys, logins, or other credentials in the runner**. It never reads members' actual viewing histories, watchlists, or user accounts, never sends telemetry, and never changes the live recommendation engine.

The synthetic profiles use publicly known film titles with invented Loved/Liked reactions. The script invokes the existing lab scoring, eligibility and balancing, while the extra Cinematic Fingerprint remains **shadow-only**, excluded from ranking.

Boundaries per run:
- At most two fictional profiles.
- At most two title-source query plans and one independent lab-browse call per profile.
- At most 40 evaluated candidates per profile, with metadata fetched in groups of 12.
- A per-request timeout and response-size limit.

The CI job uses two profiles, one plan per profile and 24 candidates each.

The exported JSON report contains only aggregate counters, a static fictional profile label, and errors; **no movie data, movie titles, credit IDs, emails, user identifiers, or actual viewing histories**.

## Run it

On a computer with Node 22+, from the separate Lab repository:

    node --test tests/real-catalog-smoke.test.cjs
    node tests/real-catalog-smoke.cjs --profiles 2 --plans 1 --candidates 24 --output reports/real-catalog-smoke.json

The reports folder is ignored by git.

GitHub-hosted execution:

https://github.com/tamia-sys/afterlogue-lab/actions/workflows/real-catalog-smoke.yml

Select a completed run, inspect the **Summary** tab or short-lived aggregate artifact. The workflow also supports manual dispatch if an explicit re-run is desired.

## What to inspect

1. Are there enough real public catalog films to fill five eligible recommendations?
2. What share of films have useful themes, tones, creators and synopsis descriptions?
3. How many have extra literal plot clues or explicit storytelling-device wording that the original rule-based model did not identify?
4. How many additional hypothetical story connections emerge from those clues?
5. Are all candidate counts accounted for without duplicates or known Log titles?

These are **structural diagnostics**, not prediction accuracy or proof that viewers like the films. A successful mocked test does not substitute for a completed real-provider run.

If the new synopsis-clue coverage is negligible, prioritize **rights-cleared, independently sourced metadata quality**, not indefinitely expanding a limited phrase dictionary. Never infer cinematography or artistic pacing just from a synopsis.

TMDB's license and usage rules require review before commercial-scale derived catalog persistence or model training. This runner creates no persistent film dataset and does not train a model.
