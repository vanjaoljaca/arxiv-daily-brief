#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const includeIncomplete = process.argv.includes("--include-incomplete");
const acknowledge = process.argv.includes("--ack");

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const at = line.indexOf("=");
    return [line.slice(0, at), line.slice(at + 1)];
  }));
}

const config = parseEnv(await readFile(path.join(root, "reader", ".env.ingestion.local"), "utf8"));
const baseUrl = config.SITES_READER_URL.replace(/\/$/, "");
const headers = { authorization: `Bearer ${config.SITES_INGESTION_SECRET}` };
if (config.SITES_SIWC_BYPASS_TOKEN) headers["OAI-Sites-Authorization"] = `Bearer ${config.SITES_SIWC_BYPASS_TOKEN}`;

const response = await fetch(`${baseUrl}/api/ingestion/sessions${includeIncomplete ? "?include_incomplete=1" : ""}`, { headers });
if (!response.ok) throw new Error(`Queue request failed (${response.status})`);
const queue = await response.json();
if (queue.apiRevision !== "voice-recovery-v2") throw new Error(`Unexpected recovery API revision: ${queue.apiRevision || "none"}`);

for (const session of queue.sessions) {
  if (session.source === "deployment-verifier") continue;
  const target = path.join(root, "feedback", "audio-inbox", session.deliveryDate, session.editionVersion, session.id);
  await mkdir(target, { recursive: true });
  const verifiedChunks = [];

  for (const chunk of session.chunks) {
    const extension = session.mimeType.includes("mp4") ? "m4a" : session.mimeType.includes("ogg") ? "ogg" : session.mimeType.includes("wav") ? "wav" : "webm";
    const filename = `chunk-${String(chunk.index).padStart(4, "0")}.${extension}`;
    const destination = path.join(target, filename);
    const partial = `${destination}.part`;
    const download = await fetch(`${baseUrl}/api/ingestion/sessions/${session.id}/chunks/${chunk.index}`, { headers });
    if (!download.ok) throw new Error(`Chunk download failed for ${session.id}/${chunk.index} (${download.status})`);
    const bytes = Buffer.from(await download.arrayBuffer());
    if (bytes.length !== chunk.bytes) throw new Error(`Chunk size mismatch for ${session.id}/${chunk.index}`);
    await writeFile(partial, bytes);
    await rename(partial, destination);
    const saved = await readFile(destination);
    verifiedChunks.push({ index: chunk.index, filename, bytes: saved.length, sha256: createHash("sha256").update(saved).digest("hex"), createdAt: chunk.createdAt });
  }

  const verifiedBytes = verifiedChunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
  const packageState = { ...session, downloadedAt: new Date().toISOString(), verified: true, verifiedBytes, verifiedChunks };
  await writeFile(path.join(target, "session.json"), `${JSON.stringify(packageState, null, 2)}\n`);
  await writeFile(path.join(target, "recovery-verification.json"), `${JSON.stringify({ sessionId: session.id, chunkCount: verifiedChunks.length, verifiedBytes, chunks: verifiedChunks }, null, 2)}\n`);
  await writeFile(path.join(target, "handoff.json"), `${JSON.stringify({ sessionId: session.id, deliveryDate: session.deliveryDate, editionVersion: session.editionVersion, sourceStatus: session.status, chunkCount: verifiedChunks.length, totalBytes: verifiedBytes, recommendedOrder: verifiedChunks.map((chunk) => chunk.filename) }, null, 2)}\n`);

  if (acknowledge && session.status === "waiting") {
    const ack = await fetch(`${baseUrl}/api/ingestion/sessions/${session.id}/ack`, { method: "POST", headers });
    if (!ack.ok) throw new Error(`Acknowledgement failed for ${session.id} (${ack.status})`);
  }
  console.log(`${acknowledge ? "Downloaded and acknowledged" : "Downloaded without acknowledgement"}: ${session.deliveryDate} ${session.editionVersion} ${session.id} (${verifiedChunks.length} chunks, ${verifiedBytes} bytes)`);
}

if (!queue.sessions.length) console.log("No matching voice sessions.");
