# Afterlogue Lab — blind film-interest holdout (research-only)

**Status:** Prototype implemented and verified against fictional film notes and hypothetical viewer votes; **no actual volunteer observations or interest responses collected**.

### Why this experiment follows our cinematic review pilot

Two independent reviewers might agree on a film's pacing and visual approach without those characteristics predicting whether a third person wants to watch it. This experiment deliberately separates the two questions:

1. **Reviewer agreement:** can two different people, working independently from firsthand viewing, describe cinematic qualities consistently?
2. **Viewer interest:** if they agree, can those descriptions produce cautious interest hypotheses for **unwatched titles** that align with a person's *own* first impressions?

The second is not evidence of later enjoyment. The pilot is not using TMDB keywords, posters, synopses, account Logs, scraped criticism, or an AI model.

### What is built

- [editorial-consensus.js](../editorial-consensus.js) accepts **exactly two different pseudonymous review files** created by the [review pilot](../editorial-pilot.html). It validates each input against the original source contract and requires firsthand notes. If two reviewers agree on two or more explicitly observed dimensions **and have no conflicting paired dimensions**, those agreed descriptors are available for a strictly local research hypothesis. A disagreement makes that film unsuitable for predicting interest. Unknown and unreviewed films remain in the full 12-title slate rather than being silently excluded.
- [editorial-interest-holdout.js](../editorial-interest-holdout.js) accepts one positive and one negative *watched-film* anchor, and withheld reactions for unseen candidate titles. It tests whether a candidate is closer on independently agreed descriptors to positive than negative observations. Any insufficient overlap, ambiguous contrast, missing notes or contradictory evidence produces **abstention**, never an inferred dislike. The rule is a **fixed heuristic for stress-testing**—not production taste-scoring or a trained predictor.
- [editorial-interest.html](../editorial-interest.html) presents a research survey separate from the annotation form. The person answering it should **not** be either film reviewer. The survey requires self-attested watched anchor films, asks whether target films are unwatched, and records interest or uncertainty **before showing aggregate research findings**. It never shows a per-film predicted interest label. The design suggests blinding but cannot technically prevent participants from finding other people's files.
- [tests/editorial-interest-holdout.test.cjs](../tests/editorial-interest-holdout.test.cjs) and [tests/editorial-interest-page.test.cjs](../tests/editorial-interest-page.test.cjs) cover held-out target leakage, misleading agreement, conflict abstention, missing-review denominators, fictional interest outcomes, and the offline/aggregate-only interface.

An isolated offline GitHub Actions workflow references these tests alongside the original reviewer-consensus checks.

### Source, privacy, and licensing boundaries

All content is processed in browser memory. No API calls, remote writes, telemetry, registration or production recommendation requests are made by either research form. Neither reviewer notes nor personally identifying accounts are sent to the server; the optional aggregate-only report contains counts, not film names, reviewer handles, original observation text, or title-level reactions. Private JSON reviewer files may contain free-text original observations and should only be shared deliberately among trusted participants. There is no persistent resume/autosave; do not close the forms before exporting.

The reviewer's firsthand-attestation is self-declared and cannot be technologically verified. Likewise, the viewer's statement that a film has not been watched is self-reported. The interface is **not** a randomized controlled experiment or a scientifically validated psychology instrument. Participants may have heard of movies elsewhere. A repeated run by the same person is not an independent sample.

**No TMDB commercial license has been purchased.** This prototype uses hardcoded publicly named film titles and private original note files rather than commercial-scale provider enrichment, training or unauthorized source-derivative editorial descriptions.

### What the numbers mean

| Output | Meaning | Does not imply |
|---|---|---|
| Cautious interest hypothesis | Film has enough agreed dimensions to resemble a liked film more strongly than a disliked one under a fixed heuristic | That the viewer will watch or enjoy it |
| Abstention | Evidence is missing, disputed, or ambiguous | Viewer dislikes the title |
| Interest response | The viewer self-reports feeling drawn to watching an unwatched film | They have actually watched and liked it |
| Interested / not-drawn counts among hypotheses | Observed choices from the subset receiving positive-interest hypotheses | Precision, accuracy, validity, or population generalizability |
| Unreviewed title in denominator | The model abstains rather than omits unavailable cinematic descriptions | A negative cinematic judgment |

The report deliberately does **not** calculate accuracy, precision, confidence intervals, or model-training scores. Even one good-looking coincidence or six apparent successes would be far too little evidence.

### Sequence for a real pilot

1. Two independent reviewers annotate a few **films they already watched** using [editorial-pilot.html](../editorial-pilot.html), with their own original reasons. The study cannot run until **two** films each have at least two conflict-free shared observations, so we can choose positive and negative watched anchors.
2. Each exports their original film-note JSON and intentionally gives copies to the person administering the study. The volunteer does **not** need to know their labels or rationales.
3. A third, different person opens [editorial-interest.html](../editorial-interest.html), selects the two private review files, and identifies one movie they actually liked and one they actually disliked. They then mark any slate films they genuinely have **not** seen and whether they might want to watch them. **No assumptions about any participant's taste are supplied by the Lab.**
4. They generate a local aggregate-only report. Reviewers can learn whether their descriptors were stable, while interest investigators learn whether the fixed heuristic had any *coverage* and whether the self-reported interest votes were encouraging, uninformative, or mixed. These are **pilot diagnostics only**.
5. Do not introduce consensus metadata into live Home discovery or benchmark model accuracy until we have more independent review pairs, a clear rights plan, repeatable samples and voluntary interest outcomes.

### Current outcome

The modules and offline UI are implemented and targeted synthetic tests pass. The existing real-catalog Lab benchmark remains unchanged: **0 / 48** candidate films had independently authored reviewed cinematic profiles, and four films qualified under the unchanged old ranker (3 + 1 across fictional profiles). **No real human film-interest alignment has yet been measured.**

This is a test harness and research protocol, not yet demonstrated recommender intelligence.
