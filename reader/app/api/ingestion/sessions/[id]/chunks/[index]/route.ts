import { authorizedIngestion, bindings, getChunks, getSession, jsonError } from "../../../../../../lib/voice-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  if (!authorizedIngestion(request)) return jsonError("Unauthorized", 401);
  const { id, index: indexText } = await params;
  const session = await getSession(id);
  if (!session) return jsonError("Session not found", 404);
  const index = Number(indexText);
  const chunk = (await getChunks(id)).find((item) => item.chunk_index === index);
  if (!chunk) return jsonError("Chunk not found", 404);
  const object = await bindings().AUDIO.get(chunk.r2_key);
  if (!object) return jsonError("Audio unavailable", 404);
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("cache-control", "private, no-store");
  return new Response(object.body, { headers });
}
