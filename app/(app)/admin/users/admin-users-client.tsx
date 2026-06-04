"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { AdminUser } from "@/lib/db/admin"
import { createUser, setUserCompany } from "../actions"

type CompanyOption = { id: string; name: string }

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: "12.5px",
  border: "1px solid var(--border)", borderRadius: "8px",
  background: "var(--bg-primary)", color: "var(--text-primary)",
}

export default function AdminUsersClient({ users, companies }: { users: AdminUser[]; companies: CompanyOption[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [showCreate, setShowCreate] = useState(false)

  const card: React.CSSProperties = {
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "16px",
  }
  const th: React.CSSProperties = {
    textAlign: "left", padding: "8px 10px", fontSize: "10px", fontWeight: 700,
    color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px",
    borderBottom: "1px solid var(--border)",
  }
  const td: React.CSSProperties = {
    padding: "9px 10px", fontSize: "12.5px", color: "var(--text-primary)",
    borderBottom: "1px solid var(--border)",
  }

  function onCreateUser(formData: FormData) {
    setError(null); setMsg(null)
    start(async () => {
      const res = await createUser(formData)
      if (res.error) { setError(res.error); return }
      setMsg("Usuário criado."); setShowCreate(false); router.refresh()
    })
  }

  function onChangeCompany(userId: string, companyId: string) {
    if (!companyId) return
    setError(null); setMsg(null)
    start(async () => {
      const res = await setUserCompany(userId, companyId, "member")
      if (res.error) { setError(res.error); return }
      setMsg("Empresa atualizada."); router.refresh()
    })
  }

  return (
    <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <button onClick={() => router.push("/admin")} style={{
            background: "transparent", border: "none", color: "var(--accent)",
            cursor: "pointer", fontSize: "12px", padding: 0, marginBottom: "8px",
          }}>← Voltar</button>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>Usuários</h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Todos os usuários da plataforma ({users.length}).
          </p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} style={{
          background: "var(--accent)", color: "#fff", border: "none",
          padding: "9px 14px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
        }}>+ Criar usuário</button>
      </div>

      {error && <div style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</div>}
      {msg && <div style={{ color: "var(--success)", fontSize: "12px" }}>{msg}</div>}

      {showCreate && (
        <form action={onCreateUser} style={{ ...card, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          <input name="name" placeholder="Nome" style={inputStyle} />
          <select name="role" defaultValue="member" style={inputStyle}>
            <option value="member">Membro</option>
            <option value="admin">Administrador</option>
            <option value="super_admin">Super admin</option>
          </select>
          <input name="email" type="email" placeholder="E-mail" required style={inputStyle} />
          <input name="password" type="text" placeholder="Senha" required style={inputStyle} />
          <select name="company_id" defaultValue="" style={{ ...inputStyle, gridColumn: "1 / -1" }}>
            <option value="">Sem empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="submit" disabled={pending} style={{
            gridColumn: "1 / -1", background: "var(--accent)", color: "#fff", border: "none",
            padding: "8px", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
            cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
          }}>{pending ? "Criando..." : "Criar"}</button>
        </form>
      )}

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Usuário</th>
              <th style={th}>Papel</th>
              <th style={th}>Empresa</th>
              <th style={th}>Último acesso</th>
              <th style={th}>Trocar empresa</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{u.email}</div>
                </td>
                <td style={td}>{u.role}</td>
                <td style={td}>{u.company_name ?? "—"}</td>
                <td style={td}>{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("pt-BR") : "nunca"}</td>
                <td style={td}>
                  <select
                    defaultValue={u.company_id ?? ""}
                    disabled={pending}
                    onChange={(e) => onChangeCompany(u.id, e.target.value)}
                    style={{ ...inputStyle, maxWidth: "220px" }}>
                    <option value="">Selecionar…</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
