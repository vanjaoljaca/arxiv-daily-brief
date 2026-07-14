import { redirect } from "next/navigation";
import { newestHnEdition } from "../../generated/hn-editions";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function HnHome() {
  await requireChatGPTUser("/hn");
  redirect(`/hn/edition/${newestHnEdition.date}/${newestHnEdition.version}`);
}
