import { getChatGPTUser } from "../../../../../../chatgpt-auth";
import { bindings, ensureVoiceSchema, getSession, jsonError } from "../../../../../../lib/voice-store";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in required", 401);
  const { id, index: indexText } = await params;
  const index = Number(indexText);
  if (!Number.isInteger(index) || index < 0) return jsonError("Invalid chunk", 400);
  const session = await getSession(id);
  if (!session || session.owner_email !== user.email) return jsonError("Session not found", 404);
  if (session.status !== "recording") return jsonError("Session already finished", 409);
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 8_000_000) return jsonError("Invalid chunk size", 413);
  const key = `voice/${session.content_type}/${session.delivery_date}/${session.edition_version}/${id}/${String(index).padStart(6, "0")}`;
  const { DB, AUDIO } = bindings();
  await AUDIO.put(key, bytes, { httpMetadata: { contentType: request.headers.get("content-type") || session.mime_type } });
  await ensureVoiceSchema();
  await DB.prepare(`INSERT INTO voice_chunks (session_id, chunk_index, r2_key, bytes, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(session_id, chunk_index) DO UPDATE SET r2_key = excluded.r2_key, bytes = excluded.bytes`)
    .bind(id, index, key, bytes.byteLength, new Date().toISOString()).run();
  return Response.json({ uploaded: true, index, bytes: bytes.byteLength });
}
