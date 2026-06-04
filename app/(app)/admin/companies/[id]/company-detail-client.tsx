"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Check, X } from "lucide-react"
import type { CompanyDetail, AdminUser } from "@/lib/db/admin"
import { createUser, setUserCompany, updateCompanyName } from "../../actions"

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
  const [linkRole, setLinkRole] = useState("member")
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(detail.name)

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

  function onSaveName() {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === detail.name) { setEditingName(false); return }
    setError(null); setMsg(null)
    start(async () => {
      const res = await updateCompanyName(detail.id, trimmed)
      if (res.error) { setError(res.error); return }
      setMsg("Nome da empresa atualizado."); setEditingName(false); router.refresh()
    })
  }

  function onLink() {
    if (!linkUserId) return
    setError(null); setMsg(null)
    start(async () => {
      const res = await setUserCompany(linkUserId, detail.id, linkRole)
      if (res.error) { setError(res.error); return }
      setMsg("Participação adicionada à empresa."); setLinkUserId(""); setLinkRole("member"); router.refresh()
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
        {editingName ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              autoFocus value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveName()
                else if (e.key === "Escape") { setNameDraft(detail.name); setEditingName(false) }
              }}
              style={{ ...inputStyle, width: "auto", minWidth: "260px", fontSize: "18px", fontWeight: 800, padding: "6px 10px" }}
            />
            <button onClick={onSaveName} disabled={pending} title="Salvar" style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px",
              background: "var(--success)", color: "#fff", border: "none", borderRadius: "8px",
              cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
            }}><Check size={15} /></button>
            <button onClick={() => { setNameDraft(detail.name); setEditingName(false) }} title="Cancelar" style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px",
              background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)",
              borderRadius: "8px", cursor: "pointer",
            }}><X size={15} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>{detail.name}</h1>
            <button onClick={() => { setNameDraft(detail.name); setEditingName(true) }} title="Editar nome" style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px",
              background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)",
              borderRadius: "8px", cursor: "pointer",
            }}><Pencil size={14} /></button>
          </div>
        )}
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

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
          <select value={linkUserId} onChange={(e) => setLinkUserId(e.target.value)} style={{ ...inputStyle, maxWidth: "320px" }}>
            <option value="">Adicionar usuário existente a esta empresa…</option>
            {linkable.map((u) => (
              <option key={u.id} value={u.id}>{u.email} {u.company_name ? `(${u.company_name})` : "(sem empresa)"}</option>
            ))}
          </select>
          <select value={linkRole} onChange={(e) => setLinkRole(e.target.value)} style={{ ...inputStyle, maxWidth: "160px" }}>
            <option value="member">Membro</option>
            <option value="admin">Administrador</option>
          </select>
          <button onClick={onLink} disabled={!linkUserId || pending} style={{
            background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)",
            padding: "8px 12px", borderRadius: "7px", fontSize: "12px", cursor: linkUserId ? "pointer" : "default",
          }}>Adicionar participação</button>
          <span style={{ fontSize: "10.5px", color: "var(--text-muted)", flexBasis: "100%" }}>
            O usuário pode participar de várias empresas. Isto adiciona a participação sem remover as demais.
          </span>
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
