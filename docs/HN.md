# Hacker News edition

HN is an optional second daily surface in the arXiv reader. It is not generic web ingestion and it does not replace the supported arXiv reading workflow.

## Data flow

1. `scripts/hn/fetch-hn-daily.mjs` reads `topstories` and item records from the [official Firebase HN API](https://github.com/HackerNews/API). Raw responses go under ignored `runs/hn/YYYY-MM-DD/raw/`.
2. `scripts/hn/prepare-hn-edition.mjs` scores durable interest signals plus discussion and momentum. Personalization mainly changes order; the broader long tail remains.
3. An editorial pass selects headlines, paraphrases 3–4 distinct top-level perspectives, and preserves the original comment ids for attribution.
4. `scripts/hn/assemble-hn-edition.mjs` joins editorial text to exact source metadata and rejects incomplete Comment pulses.
5. `scripts/publish-hn-content.mjs` publishes every completed `edition-vN.json` without overwriting older versions.

The reader preserves item id, source URL, HN discussion URL, points, comment count, timestamp, source rank, and final rank. Comment dives are reserved for unusually active or relevant discussions and separate agreement, disagreement, expert signal, and genuine project connections.

## Schedule

Run HN independently of the arXiv batch. A sensible default is 18:30 local time: late enough for discussion to develop, separate from a morning research delivery. Use dated user-facing task titles such as `HN — 2026-07-14` and separate HN cursor/publication state.

## Voice provenance

The global recorder stores `content_type` (`arxiv` or `hn`) with date and version in D1, and uses the same fields in R2 object keys and laptop handoffs. Transcription and interpretation remain a separate local feedback process.
