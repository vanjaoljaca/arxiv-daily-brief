import { getChatGPTUser } from "../../../chatgpt-auth";
import { bindings, ensureVoiceSchema, getChunks, jsonError, type SessionRow } from "../../../lib/voice-store";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in required", 401);
  const body = await request.json() as { deliveryDate?: string; editionVersion?: string; mimeType?: string };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.deliveryDate ?? "") || !/^v\d+$/.test(body.editionVersion ?? "")) return jsonError("Invalid edition", 400);
  await ensureVoiceSchema();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await bindings().DB.prepare(`INSERT INTO voice_sessions (id, owner_email, delivery_date, edition_version, mime_type, started_at, status) VALUES (?, ?, ?, ?, ?, ?, 'recording')`)
    .bind(id, user.email, body.deliveryDate, body.editionVersion, body.mimeType || "audio/webm", now).run();
  return Response.json({ id, status: "recording" }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in required", 401);
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session");
  const date = url.searchParams.get("date");
  const version = url.searchParams.get("version");
  await ensureVoiceSchema();
  const latest = sessionId
    ? await bindings().DB.prepare("SELECT * FROM voice_sessions WHERE id = ? AND owner_email = ?").bind(sessionId, user.email).first<SessionRow>()
    : await bindings().DB.prepare("SELECT * FROM voice_sessions WHERE owner_email = ? AND delivery_date = ? AND edition_version = ? ORDER BY started_at DESC LIMIT 1").bind(user.email, date, version).first<SessionRow>();
  if (!latest) return Response.json({ status: null });
  const chunks = await getChunks(latest.id);
  const lastChunkAt = chunks.at(-1)?.created_at ?? latest.started_at;
  return Response.json({
    id: latest.id, status: latest.status, deliveryDate: latest.delivery_date, editionVersion: latest.edition_version,
    mimeType: latest.mime_type, startedAt: latest.started_at, finishedAt: latest.finished_at,
    totalChunks: chunks.length, totalBytes: chunks.reduce((sum, chunk) => sum + chunk.bytes, 0), lastChunkAt,
    stale: latest.status === "recording" && Date.now() - Date.parse(lastChunkAt) > 120_000,
  });
}
