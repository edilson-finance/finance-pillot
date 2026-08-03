// Estado de carregamento das telas analíticas — evita o "flash de R$ 0" enquanto
// os dados (RPCs) chegam do banco. Usado onde o hook expõe `loading`.
export function ScreenLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "60vh" }}>
      <div
        className="fp-spin"
        style={{ width: "28px", height: "28px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
      />
    </div>
  )
}
