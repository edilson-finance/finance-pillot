"use client"

// Error boundary das telas do app (antes inexistente — um erro em Server
// Component caía no overlay padrão do Next, sem marca nem retry).
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "60vh", padding: "24px" }}>
      <div style={{ textAlign: "center", maxWidth: "420px" }}>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          Algo deu errado
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
          Não foi possível carregar esta tela. Tente novamente — se o problema continuar, recarregue a página.
        </p>
        <button
          onClick={reset}
          style={{ padding: "9px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
