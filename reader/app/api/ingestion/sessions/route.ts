import { authorizedIngestion, bindings, ensureVoiceSchema, getChunks, jsonError, type SessionRow } from "../../../lib/voice-store";

const API_REVISION = "voice-recovery-v2";

export async function GET(request: Request) {
  if (!authorizedIngestion(request)) return jsonError("Unauthorized", 401);
  await ensureVoiceSchema();
  const searchParams = new URL(request.url).searchParams;
  const includeIncomplete = searchParams.get("include_incomplete") === "1";
  const includeAll = searchParams.get("include_all") === "1";
  const query = includeAll
    ? "SELECT * FROM voice_sessions ORDER BY started_at ASC"
    : includeIncomplete
    ? "SELECT * FROM voice_sessions WHERE status IN ('waiting', 'recording') ORDER BY started_at ASC"
    : "SELECT * FROM voice_sessions WHERE status = 'waiting' ORDER BY finished_at ASC";
  const result = await bindings().DB.prepare(query).all<SessionRow>();
  const sessions = await Promise.all(result.results.map(async (session) => {
    const chunks = await getChunks(session.id);
    const uploadedBytes = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
    return {
      id: session.id, deliveryDate: session.delivery_date, editionVersion: session.edition_version,
      mimeType: session.mime_type, startedAt: session.started_at, finishedAt: session.finished_at,
      durationMs: session.duration_ms, totalChunks: session.status === "recording" ? chunks.length : session.total_chunks,
      totalBytes: session.status === "recording" ? uploadedBytes : session.total_bytes,
      status: session.status, incomplete: session.status === "recording",
      source: session.owner_email === "deployment-verifier@local" ? "deployment-verifier" : "user",
      chunks: chunks.map((chunk) => ({ index: chunk.chunk_index, bytes: chunk.bytes, createdAt: chunk.created_at })),
    };
  }));
  return Response.json({ apiRevision: API_REVISION, sessions });
}
