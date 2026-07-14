import Link from "next/link";
import { hnEditions } from "../../../generated/hn-editions";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { SiteHeader } from "../../components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function HnArchivePage() {
  await requireChatGPTUser("/hn/archive");
  const dates = [...new Set(hnEditions.map((edition) => edition.date))];
  return <><SiteHeader /><main className="archive-shell"><h1>HN archive</h1>
    {dates.map((date) => <section className="archive-day" key={date}>
      <h2>{new Intl.DateTimeFormat("en-AU", { dateStyle: "long", timeZone: "Australia/Perth" }).format(new Date(`${date}T12:00:00+08:00`))}</h2>
      {hnEditions.filter((edition) => edition.date === date).map((edition) => <Link className="edition-card" href={`/hn/edition/${date}/${edition.version}`} key={`${date}-${edition.version}`}><span className="version-pill">{edition.version}</span><span className="current-mark">{edition.current ? "Current" : "Saved"}</span></Link>)}
    </section>)}
  </main></>;
}
