import Link from "next/link";
import { editions } from "../../generated/editions";
import { requireChatGPTUser } from "../chatgpt-auth";
import { SiteHeader } from "../components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  await requireChatGPTUser("/archive");
  const dates = [...new Set(editions.map((edition) => edition.date))];
  return <>
    <SiteHeader />
    <main className="archive-shell">
      <p className="eyebrow">Every saved edition</p>
      <h1>Archive</h1>
      <p className="archive-intro">Each revision stays available. Voice memos remain attached to the exact version you read.</p>
      {dates.map((date) => <section className="archive-day" key={date}>
        <h2>{new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</h2>
        {editions.filter((edition) => edition.date === date).map((edition) => <Link className="edition-card" href={`/edition/${date}/${edition.version}`} key={`${date}-${edition.version}`}>
          <span className="version-pill">{edition.version}</span>
          <span className="edition-title">{edition.title}</span>
          <span className="current-mark">{edition.current ? "Current" : "Saved history"}</span>
        </Link>)}
      </section>)}
    </main>
  </>;
}
