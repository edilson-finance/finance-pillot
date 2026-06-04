"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { CompanyOverview } from "@/lib/db/admin"

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function fmtDate(s: string | null): string {
  if (!s) return "—"
  const d = new Date(s)
  return d.toLocaleDateString("pt-BR")
}

function isActive30d(lastSignIn: string | null): boolean {
  if (!lastSignIn) return false
  return Date.now() - new Date(lastSignIn).getTime() < 30 * 24 * 3600 * 1000
}

export default function OverviewClient({ companies }: { companies: CompanyOverview[] }) {
  const router = useRouter()
  const totalUsers = companies.reduce((s, c) => s + c.user_count, 0)
  const active30 = companies.filter((c) => isActive30d(c.last_sign_in)).length

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "16px",
  }
  const th: React.CSSProperties = {
    textAlign: "left", padding: "8px 10px", fontSize: "10px", fontWeight: 700,
    color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px",
    borderBottom: "1px solid var(--border)",
  }
  const td: React.CSSProperties = {
    padding: "10px", fontSize: "12.5px", color: "var(--text-primary)",
    borderBottom: "1px solid var(--border)",
  }

  return (
    <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>Central Admin</h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Visão geral de todas as empresas clientes.
          </p>
        </div>
        <Link href="/admin/companies/new" style={{
          background: "var(--accent)", color: "#fff", textDecoration: "none",
          padding: "9px 14px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600,
        }}>+ Nova empresa</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Empresas</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>{companies.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Usuários</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>{totalUsers}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Ativas (30d)</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--success)", marginTop: "4px" }}>{active30}</div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        {companies.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            Nenhuma empresa ainda. Clique em “+ Nova empresa” para começar.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Empresa</th>
                <th style={th}>Usuários</th>
                <th style={th}>Último acesso</th>
                <th style={th}>Lançamentos</th>
                <th style={th}>Faturamento (mês)</th>
                <th style={th}>Saldo</th>
                <th style={th}>Criada em</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}
                  onClick={() => router.push(`/admin/companies/${c.id}`)}
                  style={{ cursor: "pointer" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{c.type}</div>
                  </td>
                  <td style={td}>{c.user_count}</td>
                  <td style={td}>{fmtDate(c.last_sign_in)}</td>
                  <td style={td}>{c.transaction_count}</td>
                  <td style={td}>{brl(c.faturamento)}</td>
                  <td style={td}>{brl(c.saldo)}</td>
                  <td style={td}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
