# Install your own arXiv Daily Brief

You need Node.js 22.13 or newer, a Sites-capable Codex environment, and an agent that can fetch the official arXiv daily batch and write versioned Markdown editions.

## 1. Establish the editorial state

Ask only what is needed to establish initial interests, current knowledge, preferred explanation level, and delivery deadline. Persist editable Markdown/JSON state outside the public reader source:

```text
context/reader-profile.md
feedback/YYYY-MM-DD.md
state/feedback-cursor.json
state/daily-tasks.json
state/knowledge-map.md
state/hn-cursor.json
state/hn-publication.json
runs/YYYY-MM-DD/reading-brief.md
runs/hn/YYYY-MM-DD/edition-v1.json
```

Large reproducible feed downloads should stay ignored. Keep the compact run summary and completed versioned editions.

## 2. Configure the reader

`reader/.openai/hosting.json` declares logical D1 and R2 bindings without a private project ID:

```json
{ "d1": "DB", "r2": "AUDIO" }
```

Create a long random ingestion secret, for example with `openssl rand -hex 32`. Store it as `SITES_INGESTION_SECRET` in hosted runtime configuration. Put the same value and the deployed private URL in an ignored local file based on `reader/.env.example`. Never commit the generated secret or a Sites bypass token.

Set the Sites access policy to one explicitly allowed owner and no groups. SIWC protects browser routes, while every voice and ingestion route also performs server-side authorization.

From `reader/`:

```bash
npm install
npm test
npm run lint
npx tsc --noEmit
```

Deploy only after the build succeeds and owner-only access is verified.

## 3. Publish editions without overwriting history

The sample `reader/generated/editions.ts` shows the runtime catalogue contract. Your daily publisher should transform completed Markdown from `runs/` into entries shaped like:

```ts
{ date: "2026-07-14", version: "v1", current: true, title: "Today’s useful questions", markdown: "# …" }
```

When a correction is produced, retain `v1`, add `v2`, and mark only the canonical saved edition current. Home redirects to the newest current edition; Archive exposes every version.

## 4. Add the optional HN edition

Fetch and prepare a reproducible candidate set from the official HN API:

```bash
node scripts/hn/fetch-hn-daily.mjs 2026-07-14
node scripts/hn/prepare-hn-edition.mjs 2026-07-14
```

Review the candidate comments, write `runs/hn/2026-07-14/editorial-v1.json`, then assemble and publish it:

```bash
node scripts/hn/assemble-hn-edition.mjs 2026-07-14 v1
node scripts/publish-hn-content.mjs
```

Every selected headline needs a terse summary and 3–4 distinct paraphrased comment perspectives. Keep source and HN discussion URLs, item id, points, comments, timestamp, and version history. See [docs/HN.md](docs/HN.md).

## 5. Connect the laptop audio inbox

Copy `reader/.env.example` to `reader/.env.ingestion.local`, fill it locally, then run:

```bash
node scripts/download-voice-inbox.mjs --include-incomplete
```

The script lists protected queue sessions, skips deployment-verifier memos, downloads chunks in numeric order, checks every byte count and SHA-256 hash, and writes an immutable package. arXiv retains `feedback/audio-inbox/<date>/<version>/<session-id>/`; HN uses `feedback/audio-inbox/hn/<date>/<version>/<session-id>/`. It does not acknowledge ingestion unless `--ack` is supplied after the local package verifies.

Run transcription and interpretation in a separate local task. Preserve raw chunks and provenance. See [docs/OPERATIONS.md](docs/OPERATIONS.md).

## 6. Verify the real product flow

On an iPad or Safari-compatible test device:

1. Start a memo on today's edition.
2. Navigate to Archive and another edition using in-app links.
3. Switch between arXiv and HN and confirm the same top recording bar and timer remain visible.
4. Return and Finish.
5. Confirm one session appears in the protected queue and round-trips byte-for-byte.
6. Start a second test, close the page after at least one uploaded chunk, and confirm the stale session can be server-finalized and downloaded as interrupted.

Add the private URL to the iPad Home Screen from Safari for standalone presentation.
