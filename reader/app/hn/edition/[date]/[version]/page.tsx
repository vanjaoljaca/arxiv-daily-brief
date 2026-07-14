import Link from "next/link";
import { notFound } from "next/navigation";
import { hnEditions } from "../../../../../generated/hn-editions";
import { requireChatGPTUser } from "../../../../chatgpt-auth";
import { SiteHeader } from "../../../../components/SiteHeader";

export const dynamic = "force-dynamic";

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Perth" }).format(new Date(timestamp));
}

export default async function HnEditionPage({ params }: { params: Promise<{ date: string; version: string }> }) {
  const { date, version } = await params;
  await requireChatGPTUser(`/hn/edition/${date}/${version}`);
  const edition = hnEditions.find((item) => item.date === date && item.version === version);
  if (!edition) notFound();
  const dayVersions = hnEditions.filter((item) => item.date === date);
  return <><SiteHeader /><main className="hn-shell">
    <div className="reader-meta hn-meta"><div><p className="eyebrow">HN</p><h1 className="date-title">{new Intl.DateTimeFormat("en-AU", { dateStyle: "long", timeZone: "Australia/Perth" }).format(new Date(`${date}T12:00:00+08:00`))}</h1></div><nav className="version-links" aria-label="HN edition versions">{dayVersions.map((item) => <Link className={item.version === version ? "version-link active" : "version-link"} href={`/hn/edition/${date}/${item.version}`} key={item.version}>{item.version}</Link>)}</nav></div>
    <section aria-labelledby="headlines-title"><div className="section-heading"><h2 id="headlines-title">Headlines</h2><span>{edition.stories.length}</span></div><ol className="hn-list">
      {edition.stories.map((story) => <li className="hn-story" key={story.id} value={story.rank}><article>
        <div className="story-title-row"><h3><a href={story.url} target="_blank" rel="noreferrer">{story.title}</a></h3><span className="story-source">{story.source}</span></div>
        <div className="story-meta"><a href={story.discussionUrl} target="_blank" rel="noreferrer">{story.points}p · {story.comments}c</a><span>{formatTime(story.timestamp)}</span>{story.badges.map((badge) => <span className="hn-badge" key={badge}>{badge}</span>)}</div>
        <p className="story-summary">{story.summary}</p><h4>Comment pulse</h4><ul className="comment-pulse">{story.pulse.map((pulse, index) => <li key={`${story.id}-${index}`}>{pulse.url ? <a href={pulse.url} target="_blank" rel="noreferrer" aria-label={`Comment by ${pulse.by}`}>{pulse.text}</a> : pulse.text}{pulse.by ? <span> @{pulse.by}</span> : null}</li>)}</ul>
      </article></li>)}
    </ol></section>
    <section className="dives" aria-labelledby="dives-title"><div className="section-heading"><h2 id="dives-title">Comment dives</h2><span>{edition.dives.length}</span></div>
      {edition.dives.map((dive) => <article className="dive" key={dive.storyId}><h3><a href={`https://news.ycombinator.com/item?id=${dive.storyId}`} target="_blank" rel="noreferrer">{dive.title}</a></h3><dl><div><dt>Commotion</dt><dd>{dive.why}</dd></div><div><dt>Agreement</dt><dd>{dive.agreement}</dd></div><div><dt>Disagreement</dt><dd>{dive.disagreement}</dd></div><div><dt>Signal</dt><dd>{dive.signal}</dd></div></dl>{dive.comments.length ? <ul className="choice-comments">{dive.comments.map((comment, index) => <li key={index}>{comment.url ? <a href={comment.url} target="_blank" rel="noreferrer">{comment.text}</a> : comment.text}</li>)}</ul> : null}{dive.projectLinks?.length ? <div className="project-links"><strong>Project links</strong><ul>{dive.projectLinks.map((link) => <li key={link}>{link}</li>)}</ul></div> : null}</article>)}
    </section>
  </main></>;
}
