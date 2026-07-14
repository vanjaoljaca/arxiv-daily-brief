import Link from "next/link";

export function SiteHeader() {
  return <header className="site-header">
    <Link href="/" className="brand">ArXiv Daily Brief</Link>
    <nav className="header-nav" aria-label="Primary navigation">
      <Link href="/" className="nav-link">Today</Link>
      <Link href="/archive" className="nav-link">Archive</Link>
    </nav>
  </header>;
}
