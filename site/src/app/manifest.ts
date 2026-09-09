import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IBQ — I Build Quality Websites",
    short_name: "IBQ Websites",
    description: "Quality websites you own.",
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: "#07070a",
    theme_color: "#07070a",
    icons: [
      { src: "/icons/ibq-home-v2-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/ibq-home-v2-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
