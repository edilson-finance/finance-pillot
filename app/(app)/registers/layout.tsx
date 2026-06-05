"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"

// Layout dos Cadastros: nas sub-páginas (Categorias, Clientes, etc.) mostra um
// botão para voltar ao hub de Cadastros. No próprio hub (/registers) não aparece.
export default function RegistersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHub = pathname === "/registers"

  return (
    <>
      {!isHub && (
        <div style={{ padding: "18px 22px 0" }}>
          <Link
            href="/registers"
            style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "7px 13px", background: "var(--bg-secondary)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)",
              textDecoration: "none", maxWidth: "100%",
            }}
          >
            <ArrowLeft size={15} style={{ flexShrink: 0 }} />
            Voltar para Cadastros
          </Link>
        </div>
      )}
      {children}
    </>
  )
}
