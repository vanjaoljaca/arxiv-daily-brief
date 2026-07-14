"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const hn = pathname.startsWith("/hn");
  return <header className="site-header">
    <Link href={hn ? "/hn" : "/"} className="brand">Daily Brief</Link>
    <nav className="feed-tabs" aria-label="Daily feeds">
      <Link href="/" className={`feed-tab ${hn ? "" : "active"}`} aria-current={hn ? undefined : "page"}>arXiv</Link>
      <Link href="/hn" className={`feed-tab ${hn ? "active" : ""}`} aria-current={hn ? "page" : undefined}>HN</Link>
    </nav>
    <nav className="header-nav" aria-label={`${hn ? "HN" : "arXiv"} navigation`}>
      <Link href={hn ? "/hn/archive" : "/archive"} className="nav-link">Archive</Link>
    </nav>
  </header>;
}
