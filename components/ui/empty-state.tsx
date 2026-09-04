import type { ReactNode } from "react"

// Estado vazio amigável para listas/tabelas sem dados (antes as tabelas ficavam
// só com o cabeçalho). Opcionalmente com um CTA para criar o primeiro item.
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px", gap: "6px" }}>
      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
      {description && (
        <div style={{ fontSize: "12.5px", color: "var(--text-muted)", maxWidth: "40ch", lineHeight: 1.5 }}>{description}</div>
      )}
      {action && <div style={{ marginTop: "10px" }}>{action}</div>}
    </div>
  )
}
