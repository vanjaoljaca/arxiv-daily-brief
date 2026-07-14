import { getChatGPTUser } from "../../../../../chatgpt-auth";
import { bindings, getChunks, getSession, jsonError } from "../../../../../lib/voice-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in required", 401);
  const { id } = await params;
  const session = await getSession(id);
  if (!session || session.owner_email !== user.email) return jsonError("Session not found", 404);
  const chunks = await getChunks(id);
  if (!chunks.length) return jsonError("No audio uploaded", 409);
  const body = await request.json().catch(() => ({})) as { durationMs?: number };
  const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
  await bindings().DB.prepare(`UPDATE voice_sessions SET status = 'waiting', finished_at = ?, duration_ms = ?, total_chunks = ?, total_bytes = ? WHERE id = ?`)
    .bind(new Date().toISOString(), Math.max(0, Number(body.durationMs) || 0), chunks.length, totalBytes, id).run();
  return Response.json({ id, status: "waiting", totalChunks: chunks.length, totalBytes });
}
