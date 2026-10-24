# Real-film information bottleneck — October 24, 2026

## Verified finding — not a proven ranking improvement

Two bounded real-provider audits used fictional cinema histories and the public TMDB-backed source. Both audits examined 24 candidate films per fictional profile.

| Measurement | Original lab output | Lab-only original keyword labels enabled |
|---|---:|---:|
| Fictional profiles | 2 | 2 |
| Distinct films retrieved per profile (mean) | 143 | 143.5 |
| Films fully enriched/evaluated per profile | 24 | 24 |
| TMDB community keyword names exposed | 0% | 89.6% |
| Films with our narrow mapped theme/tone hints | 25% | 25% |
| Qualified recommendations — Cinephile / Eclectic | 3 / 1 | 3 / 1 |
| Five-title shelf completion | 0 of 2 | 0 of 2 |

These two retrieval samples are not identical, so these numbers are observational rather than a randomized comparison. The mapped theme/tone labels were unchanged. All titles had synopsis text and reported verified filmmaker credit coverage; strong overlaps between specific evidence and the fictional Logs remained scarce.

The original source threw away most original keyword labels after mapping a limited vocabulary. Exposing the labels reveals that many more community annotations are available **but has not improved recommendation rankings**.

## Source and reproducibility

- Frozen original reference: docs/real-catalog-baseline-v1.json
- Sanitized latest auto-run: docs/real-catalog-latest.json
- One-off runner: tests/real-catalog-smoke.cjs
- Lab source evaluator: catalog-batch-audit.js
- Film evidence layer: cinematic-fingerprint.js

The source labels are **unverified community annotations**. They may include broad categories or misleading descriptions and are not factual proof of emotional tone, visual style, film quality or user interest.

## Changes and guardrails

The existing separate Lab-only Supabase Edge Function afterlogue-catalog-lab now returns up to 24 original community keyword labels in the already requested taste-features metadata response, with **no additional provider request**. It does not write or cache a new film dataset. The live afterlogue-catalog function was not modified.

The Lab UI and headless test runner preserve these labels in the Cinematic Fingerprint shadow analysis, **never in the active scorer or eligibility policy**.

Additional diagnostics can count shared original keyword labels, raw-only Log connections and raw-linked films failing the current evidence gate. These are hypothetical associations, **not validated recommendation opportunities**.

GitHub Actions commits only **allowlisted numeric summaries** to the separate lab repo. Film names, original keyword lists, account data and individual viewing histories are excluded from those reports.

## Decision gate

Do not increase scores merely because two films share a community tag. Next, examine common false-positive tags and distinguish generic overlap from specific narrative evidence. A blind human interest test on unfamiliar films is still required before production use.

TMDB currently requires separate authorization for commercial projects and restricts ML/AI applications under its API terms. This small research-only experiment does not authorize commercial-scale derivatives, persistence or ML model training. See the official TMDB FAQ and API Terms of Use.

No production code, private member data, or live recommendation ranking was changed.
