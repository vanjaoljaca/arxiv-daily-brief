import { redirect } from "next/navigation";
import { newestEdition } from "../generated/editions";
import { requireChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireChatGPTUser("/");
  redirect(`/edition/${newestEdition.date}/${newestEdition.version}`);
}
