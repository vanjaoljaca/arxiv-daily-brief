import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the reader sign-in gated", async () => {
  const [home, archive, edition] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/archive/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/edition/[date]/[version]/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of [home, archive, edition]) assert.match(source, /requireChatGPTUser/);
});

test("rejects anonymous voice writes before storage access", async () => {
  const [create, chunk, finish] = await Promise.all([
    readFile(new URL("../app/api/voice/sessions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/voice/sessions/[id]/chunks/[index]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/voice/sessions/[id]/finish/route.ts", import.meta.url), "utf8"),
  ]);
  for (const source of [create, chunk, finish]) {
    assert.match(source, /getChatGPTUser/);
    assert.match(source, /Sign in required/);
  }
});

test("protects the deployment storage verification route with the ingestion secret", async () => {
  const source = await readFile(new URL("../app/api/ingestion/verify/route.ts", import.meta.url), "utf8");
  assert.match(source, /authorizedIngestion/);
  assert.match(source, /Unauthorized/);
  assert.match(source, /deployment-verifier@local/);
});

test("allows secret-protected recovery of interrupted session chunks", async () => {
  const [queue, chunks] = await Promise.all([
    readFile(new URL("../app/api/ingestion/sessions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ingestion/sessions/[id]/chunks/[index]/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(queue, /include_incomplete/);
  assert.match(queue, /include_all/);
  assert.match(queue, /deployment-verifier/);
  assert.match(queue, /voice-recovery-v2/);
  assert.match(queue, /status IN \('waiting', 'recording'\)/);
  assert.doesNotMatch(chunks, /session\.status === "recording"/);
});

test("publishes a newest sample and preserves both prior versions", async () => {
  const source = await readFile(new URL("../generated/editions.ts", import.meta.url), "utf8");
  assert.match(source, /date: "2026-01-02"/);
  assert.match(source, /date: "2026-01-01"/);
  assert.match(source, /version: "v1"/);
  assert.match(source, /version: "v2"/);
  assert.match(source, /A public sample paper/);
  assert.match(source, /Follow-up from yesterday/);
  assert.doesNotMatch(source, /codex-preview/);
});

test("keeps recurring reader copy terse", async () => {
  const [catalogue, archive, edition, recorder] = await Promise.all([
    readFile(new URL("../generated/editions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/archive/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/edition/[date]/[version]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/RecorderProvider.tsx", import.meta.url), "utf8"),
  ]);
  const visibleSource = [catalogue, archive, edition, recorder].join("\n");
  for (const banned of [/What(?:’|')s Worth Reviewing Today/i, /The one-minute overview/i, /ELI5 idea/i, /Current edition/i, /Saved edition/i, /Every saved edition/i, /Start reading \/ record/i, /One memo for this whole edition/i, /Save recovered memo/i]) assert.doesNotMatch(visibleSource, banned);
  assert.match(edition, /h1: \(\) => null/);
  assert.match(recorder, />Record<\/button>/);
  assert.match(recorder, /aria-label="Start daily voice memo"/);
});

test("ships installable app and social assets", async () => {
  await Promise.all([
    access(new URL("../public/icon-192.png", import.meta.url)),
    access(new URL("../public/icon-512.png", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
  ]);
  const manifest = await readFile(new URL("../app/manifest.ts", import.meta.url), "utf8");
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /start_url: "\/"/);
});

test("owns one recorder above all internal routes with durable interruption recovery", async () => {
  const [layout, provider, edition, header] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/RecorderProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/edition/[date]/[version]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /<RecorderProvider>\{children\}<\/RecorderProvider>/);
  assert.doesNotMatch(edition, /VoiceRecorder/);
  assert.match(provider, /usePathname/);
  assert.match(provider, /indexedDB\.open/);
  assert.match(provider, /beforeunload/);
  assert.match(provider, /pagehide/);
  assert.match(provider, /sendBeacon/);
  assert.match(provider, /visibilitychange/);
  assert.match(provider, /window\.confirm/);
  assert.match(provider, />Save<\/button>/);
  assert.match(provider, /dataTasksRef/);
  assert.match(provider, /unexpectedStop/);
  assert.match(header, /from "next\/link"/);
});

test("exposes authenticated user and server recovery finalizers", async () => {
  const [userRecover, serverRecover] = await Promise.all([
    readFile(new URL("../app/api/voice/sessions/[id]/recover/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ingestion/sessions/[id]/recover/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(userRecover, /getChatGPTUser/);
  assert.match(serverRecover, /authorizedIngestion/);
  assert.match(userRecover, /finalizeRecoveredSession/);
  assert.match(serverRecover, /finalizeRecoveredSession/);
});
