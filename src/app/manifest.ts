import type { MetadataRoute } from "next"

/** PWA: permite instalar na tela inicial e receber notificações push (inclusive iPhone 16.4+). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agenda",
    short_name: "Agenda",
    start_url: "/",
    display: "standalone",
    background_color: "#141518",
    theme_color: "#141518",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  }
}
