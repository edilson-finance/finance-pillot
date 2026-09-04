// Estado de carregamento padrão para as telas do app (antes inexistente — a
// navegação server-rendered não mostrava nada até a tela montar).
export default function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "60vh" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div
          className="fp-spin"
          style={{ width: "28px", height: "28px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
        />
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Carregando...</div>
      </div>
    </div>
  )
}
