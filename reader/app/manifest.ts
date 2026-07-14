import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daily Brief",
    short_name: "Daily Brief",
    description: "Private daily arXiv and Hacker News reading with voice feedback.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0e7",
    theme_color: "#f4f0e7",
    orientation: "any",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
