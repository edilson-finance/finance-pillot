import Link from "next/link"

export default function ContaDesativadaPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: "420px", textAlign: "center", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "32px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>Conta desativada</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Seu acesso a esta empresa foi desativado por um administrador. Caso acredite que isso é um engano, entre em contato com o administrador da empresa para reativar sua conta.
        </p>
        <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, fontSize: "13px" }}>Voltar ao login</Link>
      </div>
    </div>
  )
}
