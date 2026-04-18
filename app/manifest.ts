import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rute → GPX",
    short_name: "Rute",
    description: "Tegn en cykelrute og download som GPX-fil",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0e0e",
    theme_color: "#0e0e0e",
    lang: "da",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
