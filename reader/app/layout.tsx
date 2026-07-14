import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { RecorderProvider } from "./components/RecorderProvider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const description = "A private, calm daily research reader with one voice memo per edition.";
  return {
    title: { default: "ArXiv Daily Brief", template: "%s · ArXiv Daily Brief" },
    description,
    applicationName: "ArXiv Daily Brief",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Daily Brief" },
    formatDetection: { telephone: false },
    icons: {
      icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    openGraph: { title: "ArXiv Daily Brief", description, type: "website", url: origin, images: [{ url: `${origin}/og.png`, width: 1730, height: 909, alt: "ArXiv Daily Brief — Read deeply. Leave one voice memo." }] },
    twitter: { card: "summary_large_image", title: "ArXiv Daily Brief", description, images: [`${origin}/og.png`] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f0e7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RecorderProvider>{children}</RecorderProvider></body></html>;
}
