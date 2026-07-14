import { env } from "cloudflare:workers";

export type VoiceStatus = "recording" | "waiting" | "ingested";
export type SessionRow = {
  id: string; owner_email: string; content_type: "arxiv" | "hn"; delivery_date: string; edition_version: string; mime_type: string;
  started_at: string; finished_at: string | null; duration_ms: number; total_chunks: number;
  total_bytes: number; status: VoiceStatus; ingested_at: string | null;
};
type ChunkRow = { chunk_index: number; r2_key: string; bytes: number; created_at: string };

type SiteEnv = { DB: D1Database; AUDIO: R2Bucket; SITES_INGESTION_SECRET?: string };
export function bindings(): SiteEnv { return env as unknown as SiteEnv; }

let schemaReady: Promise<void> | null = null;
export function ensureVoiceSchema() {
  if (!schemaReady) schemaReady = createSchema();
  return schemaReady;
}

async function createSchema() {
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS voice_sessions (
      id TEXT PRIMARY KEY NOT NULL, owner_email TEXT NOT NULL, content_type TEXT NOT NULL DEFAULT 'arxiv', delivery_date TEXT NOT NULL,
      edition_version TEXT NOT NULL, mime_type TEXT NOT NULL, started_at TEXT NOT NULL,
      finished_at TEXT, duration_ms INTEGER NOT NULL DEFAULT 0, total_chunks INTEGER NOT NULL DEFAULT 0,
      total_bytes INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'recording', ingested_at TEXT
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS voice_chunks (
      session_id TEXT NOT NULL, chunk_index INTEGER NOT NULL, r2_key TEXT NOT NULL,
      bytes INTEGER NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY(session_id, chunk_index), FOREIGN KEY(session_id) REFERENCES voice_sessions(id) ON DELETE CASCADE
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS voice_sessions_queue_idx ON voice_sessions(status, finished_at)"),
  ]);
  const columns = await DB.prepare("PRAGMA table_info(voice_sessions)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "content_type")) await DB.prepare("ALTER TABLE voice_sessions ADD COLUMN content_type TEXT NOT NULL DEFAULT 'arxiv'").run();
  await DB.prepare("CREATE INDEX IF NOT EXISTS voice_sessions_content_edition_idx ON voice_sessions(owner_email, content_type, delivery_date, edition_version, started_at)").run();
}

export async function getSession(id: string) {
  await ensureVoiceSchema();
  return bindings().DB.prepare("SELECT * FROM voice_sessions WHERE id = ?").bind(id).first<SessionRow>();
}

export async function getChunks(id: string) {
  await ensureVoiceSchema();
  const result = await bindings().DB.prepare("SELECT chunk_index, r2_key, bytes, created_at FROM voice_chunks WHERE session_id = ? ORDER BY chunk_index").bind(id).all<ChunkRow>();
  return result.results;
}

export async function finalizeRecoveredSession(id: string) {
  const session = await getSession(id);
  if (!session) return null;
  const chunks = await getChunks(id);
  if (!chunks.length) return { session, chunks, finalized: false as const };
  if (session.status === "recording") {
    const finishedAt = chunks.at(-1)?.created_at ?? new Date().toISOString();
    const estimatedDurationMs = Math.max(0, Date.parse(finishedAt) - Date.parse(session.started_at));
    const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
    await bindings().DB.prepare(`UPDATE voice_sessions SET status = 'waiting', finished_at = ?, duration_ms = ?, total_chunks = ?, total_bytes = ? WHERE id = ? AND status = 'recording'`)
      .bind(finishedAt, estimatedDurationMs, chunks.length, totalBytes, id).run();
  }
  return { session: await getSession(id), chunks, finalized: true as const };
}

export function authorizedIngestion(request: Request) {
  const expected = bindings().SITES_INGESTION_SECRET;
  const supplied = request.headers.get("authorization");
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
