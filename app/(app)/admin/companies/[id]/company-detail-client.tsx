"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { CompanyDetail, AdminUser } from "@/lib/db/admin"
import { createUser, setUserCompany } from "../../actions"

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: "12.5px",
  border: "1px solid var(--border)", borderRadius: "8px",
  background: "var(--bg-primary)", color: "var(--text-primary)",
}

export default function CompanyDetailClient({ detail, allUsers }: { detail: CompanyDetail; allUsers: AdminUser[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [linkUserId, setLinkUserId] = useState("")

  const card: React.CSSProperties = {
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "16px",
  }
  const td: React.CSSProperties = {
    padding: "9px 10px", fontSize: "12.5px", color: "var(--text-primary)",
    borderBottom: "1px solid var(--border)",
  }

  function onCreateUser(formData: FormData) {
    setError(null); setMsg(null)
    formData.set("company_id", detail.id)
    start(async () => {
      const res = await createUser(formData)
      if (res.error) { setError(res.error); return }
      setMsg("Usuário criado."); setShowCreate(false); router.refresh()
    })
  }

  function onLink() {
    if (!linkUserId) return
    setError(null); setMsg(null)
    start(async () => {
      const res = await setUserCompany(linkUserId, detail.id, "member")
      if (res.error) { setError(res.error); return }
      setMsg("Usuário vinculado."); setLinkUserId(""); router.refresh()
    })
  }

  const linkable = allUsers.filter((u) => u.company_id !== detail.id)

  return (
    <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <button onClick={() => router.push("/admin")} style={{
          background: "transparent", border: "none", color: "var(--accent)",
          cursor: "pointer", fontSize: "12px", padding: 0, marginBottom: "8px",
        }}>← Voltar</button>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>{detail.name}</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{detail.type}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { l: "Saldo", v: brl(detail.saldo) },
          { l: "A receber", v: brl(detail.a_receber) },
          { l: "A pagar", v: brl(detail.a_pagar) },
          { l: "Lançamentos", v: String(detail.transaction_count) },
        ].map((k) => (
          <div key={k.l} style={card}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{k.l}</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>{k.v}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</div>}
      {msg && <div style={{ color: "var(--success)", fontSize: "12px" }}>{msg}</div>}

      <div style={{ ...card, padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>Usuários ({detail.users.length})</strong>
          <button onClick={() => setShowCreate((v) => !v)} style={{
            background: "var(--accent)", color: "#fff", border: "none",
            padding: "7px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
          }}>+ Criar usuário</button>
        </div>

        {showCreate && (
          <form action={onCreateUser} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <input name="name" placeholder="Nome" style={inputStyle} />
            <select name="role" defaultValue="member" style={inputStyle}>
              <option value="member">Membro</option>
              <option value="admin">Administrador</option>
            </select>
            <input name="email" type="email" placeholder="E-mail" required style={inputStyle} />
            <input name="password" type="text" placeholder="Senha" required style={inputStyle} />
            <button type="submit" disabled={pending} style={{
              gridColumn: "1 / -1", background: "var(--accent)", color: "#fff", border: "none",
              padding: "8px", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
              cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
            }}>{pending ? "Criando..." : "Criar"}</button>
          </form>
        )}

        <div style={{ display: "flex", gap: "8px", padding: "12px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
          <select value={linkUserId} onChange={(e) => setLinkUserId(e.target.value)} style={{ ...inputStyle, maxWidth: "320px" }}>
            <option value="">Vincular usuário existente…</option>
            {linkable.map((u) => (
              <option key={u.id} value={u.id}>{u.email} {u.company_name ? `(${u.company_name})` : "(sem empresa)"}</option>
            ))}
          </select>
          <button onClick={onLink} disabled={!linkUserId || pending} style={{
            background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)",
            padding: "8px 12px", borderRadius: "7px", fontSize: "12px", cursor: linkUserId ? "pointer" : "default",
          }}>Vincular</button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {detail.users.map((u) => (
              <tr key={u.id}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{u.email}</div>
                </td>
                <td style={td}>{u.role}</td>
                <td style={td}>{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("pt-BR") : "nunca"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
