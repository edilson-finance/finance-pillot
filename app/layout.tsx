import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "FinancePilot — Gestão Financeira Inteligente",
  description: "Copiloto financeiro para PMEs brasileiras",
}

// Aplica o tema salvo (localStorage "fp-theme") de forma síncrona, antes da
// primeira pintura, evitando o flash/oscilação entre claro e escuro no login
// e nas páginas internas. Default: escuro.
const themeScript = `(function(){try{var t=localStorage.getItem("fp-theme");if(t==="light"){document.documentElement.classList.add("light")}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ margin: 0, padding: 0, height: "100%", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        {children}
      </body>
    </html>
  )
}
