import { authorizedIngestion, finalizeRecoveredSession, jsonError } from "../../../../../lib/voice-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorizedIngestion(request)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const recovered = await finalizeRecoveredSession(id);
  if (!recovered) return jsonError("Session not found", 404);
  if (!recovered.finalized) return jsonError("No uploaded audio to recover", 409);
  return Response.json({
    id,
    status: recovered.session?.status,
    finishedAt: recovered.session?.finished_at,
    durationMs: recovered.session?.duration_ms,
    totalChunks: recovered.chunks.length,
    totalBytes: recovered.chunks.reduce((sum, chunk) => sum + chunk.bytes, 0),
    recovered: true,
  });
}
