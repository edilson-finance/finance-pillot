import type { MetadataRoute } from "next"

// Web App Manifest — habilita "Adicionar à Dock" (Safari/macOS) e "Adicionar à
// tela de início" (iOS/Android) como app standalone, com ícone navy da marca.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "wiqfy — Gestão Financeira Inteligente",
    short_name: "wiqfy",
    description: "Copiloto financeiro para PMEs brasileiras",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0A0E24",
    theme_color: "#0A0E24",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
