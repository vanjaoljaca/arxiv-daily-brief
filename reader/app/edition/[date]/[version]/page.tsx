import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { editions } from "../../../../generated/editions";
import { requireChatGPTUser } from "../../../chatgpt-auth";
import { SiteHeader } from "../../../components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function EditionPage({ params }: { params: Promise<{ date: string; version: string }> }) {
  const { date, version } = await params;
  await requireChatGPTUser(`/edition/${date}/${version}`);
  const edition = editions.find((item) => item.date === date && item.version === version);
  if (!edition) notFound();
  const dayVersions = editions.filter((item) => item.date === date);

  return <>
    <SiteHeader />
    <main className="reader-shell">
      <div className="reader-meta">
        <div>
          <p className="eyebrow">{edition.current ? "Current edition" : "Saved edition"}</p>
          <h1 className="date-title">{new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</h1>
        </div>
        <nav className="version-links" aria-label="Edition versions">
          {dayVersions.map((item) => <Link className={item.version === version ? "version-link active" : "version-link"} href={`/edition/${date}/${item.version}`} key={item.version}>{item.version}</Link>)}
        </nav>
      </div>
      <article className="article">
        <ReactMarkdown components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a> }}>{edition.markdown}</ReactMarkdown>
      </article>
    </main>
  </>;
}
