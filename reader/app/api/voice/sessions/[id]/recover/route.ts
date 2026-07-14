import { getChatGPTUser } from "../../../../../chatgpt-auth";
import { finalizeRecoveredSession, getSession, jsonError } from "../../../../../lib/voice-store";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in required", 401);
  const { id } = await params;
  const session = await getSession(id);
  if (!session || session.owner_email !== user.email) return jsonError("Session not found", 404);
  const recovered = await finalizeRecoveredSession(id);
  if (!recovered?.finalized) return jsonError("No uploaded audio to recover", 409);
  return Response.json({ id, status: recovered.session?.status, totalChunks: recovered.chunks.length, recovered: true });
}
