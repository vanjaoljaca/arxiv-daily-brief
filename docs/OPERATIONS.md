# Reader operations and recovery

## Security boundary

The site is private at three layers: owner-only Sites access, SIWC identity on every reading and voice route, and a separate bearer secret on laptop-ingestion routes. Audio lives in R2; D1 contains session, edition, chunk, byte-count, and status metadata. Do not put owner identity, private URLs, secrets, audio, transcripts, preferences, or private editions in a public repository.

## One authoritative recorder

`reader/app/components/RecorderProvider.tsx` mounts in the root layout above route content. All internal links use client-side routing. The provider owns the only `MediaRecorder`, stream, session id, chunk index, upload queue, timer, and visible phase. Route transitions therefore cannot unmount the recorder UI or create the false state where the page says idle while a detached recorder continues capturing.

Each `dataavailable` blob is first written to IndexedDB, then uploaded. Finish awaits outstanding blob-persistence tasks, drains the queue, and only then finalizes D1. Unexpected recorder stop changes the same global state to interrupted and stops media tracks.

## Leaving the web app

While active, `beforeunload` requests a browser warning, `visibilitychange` shows an explicit in-app warning, and external/full-document links require confirmation. iPad Safari may suppress native dialogs, so those warnings are advisory. Continuous chunk upload is the safety net.

On `pagehide`, the client requests a last chunk and sends a recovery beacon. The protected server recovery endpoint can also finalize a stale `recording` row from its existing chunks. It never fabricates missing audio.

## Queue states

- `recording` — the client has created a session and may still upload chunks.
- `waiting` — client Finish or recovery finalization has frozen chunk totals for laptop ingestion.
- `ingested` — a verified local package exists and the laptop explicitly acknowledged it.

The ingestion queue returns `apiRevision: voice-recovery-v2`. Recovery tooling should reject an unexpected revision rather than trust an empty response during deployment propagation.

## Separate feedback task

The site/recovery process ends after it writes verified raw audio, `session.json`, `recovery-verification.json`, and `handoff.json`. A separate daily feedback task owns concatenation in numeric order, free local transcription, interpretation, private state updates, and a dated Feedback task. The following publisher consumes that processed state before ranking and opens with the exact heading **Follow-up from yesterday**.
