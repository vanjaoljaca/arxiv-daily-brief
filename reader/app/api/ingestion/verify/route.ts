import { authorizedIngestion, bindings, ensureVoiceSchema, jsonError } from "../../../lib/voice-store";

export async function POST(request: Request) {
  if (!authorizedIngestion(request)) return jsonError("Unauthorized", 401);
  const deliveryDate = request.headers.get("x-delivery-date") ?? "";
  const editionVersion = request.headers.get("x-edition-version") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) || !/^v\d+$/.test(editionVersion)) return jsonError("Invalid edition", 400);
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 1_000_000) return jsonError("Invalid verification audio", 413);

  await ensureVoiceSchema();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const key = `voice/${deliveryDate}/${editionVersion}/${id}/000000`;
  const { DB, AUDIO } = bindings();
  await AUDIO.put(key, bytes, { httpMetadata: { contentType: request.headers.get("content-type") || "audio/wav" } });
  await DB.batch([
    DB.prepare(`INSERT INTO voice_sessions (id, owner_email, delivery_date, edition_version, mime_type, started_at, finished_at, duration_ms, total_chunks, total_bytes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'waiting')`)
      .bind(id, "deployment-verifier@local", deliveryDate, editionVersion, request.headers.get("content-type") || "audio/wav", now, now, 100, bytes.byteLength),
    DB.prepare(`INSERT INTO voice_chunks (session_id, chunk_index, r2_key, bytes, created_at) VALUES (?, 0, ?, ?, ?)`)
      .bind(id, key, bytes.byteLength, now),
  ]);
  return Response.json({ id, status: "waiting" }, { status: 201 });
}
