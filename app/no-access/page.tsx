import Link from "next/link"

export default function NoAccessPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: "420px", textAlign: "center", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "32px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>Sem módulos liberados</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Sua conta ainda não tem acesso a nenhum módulo. Peça ao administrador da empresa para liberar as permissões necessárias.
        </p>
        <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, fontSize: "13px" }}>Voltar ao login</Link>
      </div>
    </div>
  )
}
