import { authorizedIngestion, bindings, getSession, jsonError } from "../../../../../lib/voice-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorizedIngestion(request)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const session = await getSession(id);
  if (!session || session.status === "recording") return jsonError("Session not found", 404);
  const now = new Date().toISOString();
  await bindings().DB.prepare("UPDATE voice_sessions SET status = 'ingested', ingested_at = ? WHERE id = ?").bind(now, id).run();
  return Response.json({ id, status: "ingested", ingestedAt: now });
}
