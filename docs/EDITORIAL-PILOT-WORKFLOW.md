# Afterlogue: 12-film cinematic observation pilot

## What is ready

The Lab now includes an **offline, opt-in original viewing-note pilot** at [editorial-pilot.html](../editorial-pilot.html). It is not connected to TMDB, Supabase, account information, film metadata pipelines or the recommendation engine.

The pilot has three parts:

1. **Author a few genuinely firsthand film observations** using a small fixed slate of 12 public film titles, including several languages, periods and filmmaking approaches. The slate is a set of film names only: it assigns **no** presumptive cinematic labels, genres, or tastes.
2. **Export** reviewed notes to local JSON. The user chooses a pseudonymous reviewer code. Only reviewed, explained observations are accepted; unknown fields can stay blank. No autosave, analytics, or web upload.
3. **Compare** two or more separately completed review exports in the browser. Report overlapping dimensions, label agreement and unresolved conflicts. The aggregate-only report contains counts, not titles or free-text review notes. A second reviewer should finish independently before importing the first reviewer's notes. The page does not technically enforce blinding.

The pilot is deliberately **not** a film-recommendation test yet. It measures whether independent people can reliably describe aspects of films before we ask if those descriptions help people discover what to watch.

## Starter slate (titles only)

- Perfect Days (2023)
- Moonlight (2016)
- City of God (2002)
- Frances Ha (2012)
- The Farewell (2019)
- Before Sunrise (1995)
- Parasite (2019)
- Spirited Away (2001)
- Mad Max: Fury Road (2015)
- The Social Network (2010)
- The Florida Project (2017)
- The Grand Budapest Hotel (2014)

These are **suggested films, not a required viewing assignment**. The fixed list gives independent reviewers a common reference for comparison; everyone can begin with a few films they have already watched. No actual style observations are pre-filled.

## Definitions and limits

Each firsthand observation may note *some* of:
- Pacing (measured / moderate / brisk / variable)
- Narrative structure (chronological / nonlinear / episodic / fragmented / circular)
- Visual approach (observational / formal-composed / handheld-immediate / expressive-stylized / mixed)
- Performance mode (naturalistic / heightened / minimalist / mixed)
- Dialogue density (sparse / moderate / dialogue-driven)
- Emotional register (intimate / wistful / tense / playful / meditative / confrontational / expansive)

All are subjective interpretations; labels are not objective truths. Each selected value requires **the reviewer's own 12–280 character observation**. Blank fields stay *unknown*. A stated firsthand viewing check is required; it cannot be independently verified by the software. Data from TMDB keywords, synopsis blurbs, or copyrighted external editorial reviews does **not** count as firsthand observation.

Independent reviewers should use **different pseudonymous codes**. For trustworthy agreement measurement, aim to get two independent reviews for at least a few films. The code quarantines repeated reviews for the same film from the same reviewer. Repeated exports from a single reviewer don't increase agreement counts.

The simple agreement ratio is **label coincidence on mutually observed dimension pairs**, not evidence that labels are correct, statistically reliable, or useful to predict film interest. There is no majority-vote auto-arbitration and no automated promotion of notes into the cinematic scorer.

## New: cautious chance-adjusted agreement

A raw agreement percentage can look convincing when everyone repeatedly selects the same label (for example, describing every film as *moderate*). The pilot now computes **exploratory, chance-corrected Cohen's kappa per dimension**, but ONLY when exactly two independent reviewer codes submit observations for **at least six of the same films** in that dimension, and each reviewer used more than one category.

- With too few overlapping films, it displays **not estimated: insufficient overlap**.
- If one reviewer never varies a label, it displays **not estimated: no category variation** even if raw agreement appears to be 100%.
- With three or more reviewers it shows descriptive agreement only. A specialized multi-rater statistic would be a separate study; pairwise comparisons from 3+ reviewers are not independent.
- Even when reported, kappa is **exploratory**, not a validated reliability threshold, prediction of enjoyment, or evidence that either review is correct. Six observations do not yield a precise statistical estimate.
- Agreement and chance-adjustment stats are calculated in browser memory and may be exported only as aggregate counts and numeric indicators; film names and free-text original notes do not enter the aggregate.

The practical goal is to discover where the review vocabulary is ambiguous **before** using reviewer-supplied attributes as signals for film discovery. No score adjustments, eligibility changes, database writes, provider calls, or automated content ingestion are authorized by this experiment.

## Data handling

- There are **no** network requests, authentication or persistent browser storage made by [editorial-pilot.html](../editorial-pilot.html).
- All in-progress notes exist only in the page's memory. **Export before closing, reloading, or navigating away**. The draft form is not a persistent editor.
- Saved local JSON files contain the author's observations and pseudonymous code, so treat them as *private local files*; share only with reviewers you trust. Nothing is automatically uploaded.
- The separate **aggregate export** contains numeric counts only, no film names, reviewers' codes, original text or TMDB IDs.
- The starter slate is public and fixed. A future pilot may offer a permissioned, carefully documented replacement slate; this version intentionally avoids automatic ingestion of third-party film opinions.

## Engineering verification

The source contract is [editorial-evidence.js](../editorial-evidence.js); the offline data layer is [editorial-pilot.js](../editorial-pilot.js). Tests:
- [tests/editorial-pilot.test.cjs](../tests/editorial-pilot.test.cjs)
- [tests/editorial-pilot-page.test.cjs](../tests/editorial-pilot-page.test.cjs)
- [tests/editorial-evidence.test.cjs](../tests/editorial-evidence.test.cjs)
- [tests/editorial-evaluation.test.cjs](../tests/editorial-evaluation.test.cjs)

To run offline checks:

    node --test tests/editorial-evidence.test.cjs tests/editorial-evaluation.test.cjs tests/editorial-pilot.test.cjs tests/editorial-pilot-page.test.cjs

An isolated GitHub Actions workflow, [Editorial Pilot QA](../.github/workflows/editorial-pilot-qa.yml), exercises them without calling TMDB or Supabase.

## Next gate

**No reviewed real-film notes have been contributed yet.** The previous real-catalog benchmark (48 titles, fictional users) remains at 0 independently reviewed style profiles and 3 + 1 structurally qualified recommendations.

Once real, genuinely firsthand observations are available, test (1) reviewer consistency and disagreements, and only then (2) whether reviewer-agreed film attributes *predict voluntary interest in unfamiliar films*, with appropriate user consent and licensing. Do not assume bigger metadata coverage equals accuracy.

The $149 commercial-provider upgrade is not purchased or required for this offline pilot. Do not change production ranking or train models on restricted metadata without a separate rights review and explicit approval.
