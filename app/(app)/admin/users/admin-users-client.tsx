"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { AdminUser, UserCompanyLink } from "@/lib/db/admin"
import { createUser, setUserCompany, unlinkUserCompany, getUserCompanies, updateUser } from "../actions"

type CompanyOption = { id: string; name: string }

const ROLE_LABEL: Record<string, string> = {
  member: "Membro", admin: "Administrador", super_admin: "Super admin",
}

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
  const [editUser, setEditUser] = useState<AdminUser | null>(null)

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
              <th style={th}>Empresa ativa</th>
              <th style={th}>Último acesso</th>
              <th style={{ ...th, textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{u.email}</div>
                </td>
                <td style={td}>{ROLE_LABEL[u.role] ?? u.role}</td>
                <td style={td}>{u.company_name ?? "—"}</td>
                <td style={td}>{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("pt-BR") : "nunca"}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button onClick={() => { setError(null); setMsg(null); setEditUser(u) }} style={{
                    background: "transparent", border: "1px solid var(--border)",
                    color: "var(--accent)", padding: "5px 12px", borderRadius: "7px",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  }}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editUser && (
        <EditUserModal
          user={editUser}
          companies={companies}
          onClose={() => setEditUser(null)}
          onSaved={(text) => { setMsg(text); setEditUser(null); router.refresh() }}
          onError={setError}
        />
      )}
    </div>
  )
}

function EditUserModal({
  user, companies, onClose, onSaved, onError,
}: {
  user: AdminUser
  companies: CompanyOption[]
  onClose: () => void
  onSaved: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState(user.name ?? "")
  const [email, setEmail] = useState(user.email ?? "")
  const [password, setPassword] = useState("")
  const [links, setLinks] = useState<UserCompanyLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [addCompany, setAddCompany] = useState("")
  const [addRole, setAddRole] = useState("member")
  const [localErr, setLocalErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function reloadLinks() {
    const res = await getUserCompanies(user.id)
    if (res.error) { setLocalErr(res.error); setLoadingLinks(false); return }
    setLinks(res.data); setLoadingLinks(false)
  }

  useEffect(() => {
    setLoadingLinks(true)
    reloadLinks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const available = companies.filter((c) => !links.some((l) => l.company_id === c.id))

  function saveCredentials() {
    setLocalErr(null)
    start(async () => {
      const res = await updateUser(user.id, { name, email, password: password || undefined })
      if (res.error) { setLocalErr(res.error); return }
      onSaved("Usuário atualizado.")
    })
  }

  function changeLinkRole(companyId: string, role: string) {
    setLocalErr(null)
    start(async () => {
      const res = await setUserCompany(user.id, companyId, role)
      if (res.error) { setLocalErr(res.error); return }
      await reloadLinks()
    })
  }

  function addLink() {
    if (!addCompany) return
    setLocalErr(null)
    start(async () => {
      const res = await setUserCompany(user.id, addCompany, addRole)
      if (res.error) { setLocalErr(res.error); return }
      setAddCompany(""); setAddRole("member")
      await reloadLinks()
    })
  }

  function removeLink(companyId: string) {
    setLocalErr(null)
    start(async () => {
      const res = await unlinkUserCompany(user.id, companyId)
      if (res.error) { setLocalErr(res.error); return }
      await reloadLinks()
    })
  }

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px",
  }
  const modal: React.CSSProperties = {
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "20px", width: "100%", maxWidth: "520px",
    maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px",
  }
  const label: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block",
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.5px",
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Editar usuário</h2>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "var(--text-muted)",
            cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: 0,
          }}>×</button>
        </div>

        {localErr && <div style={{ color: "var(--danger)", fontSize: "12px" }}>{localErr}</div>}

        {/* Dados de acesso */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={sectionTitle}>Dados de acesso</div>
          <div>
            <label style={label}>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={label}>E-mail</label>
            <input value={email} type="email" onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={label}>Nova senha <span style={{ color: "var(--text-muted)" }}>(deixe em branco para manter)</span></label>
            <input value={password} type="text" placeholder="••••••" onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={saveCredentials} disabled={pending} style={{
            background: "var(--accent)", color: "#fff", border: "none",
            padding: "9px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600,
            cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
          }}>{pending ? "Salvando..." : "Salvar dados de acesso"}</button>
        </div>

        <div style={{ height: "1px", background: "var(--border)" }} />

        {/* Empresas vinculadas */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={sectionTitle}>Empresas vinculadas</div>
          {loadingLinks ? (
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Carregando…</div>
          ) : links.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Nenhuma empresa vinculada.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {links.map((l) => (
                <div key={l.company_id} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {l.company_name}
                      {l.is_active && (
                        <span style={{
                          marginLeft: "6px", fontSize: "9px", fontWeight: 700, color: "var(--success)",
                          border: "1px solid var(--success)", borderRadius: "5px", padding: "1px 5px",
                          textTransform: "uppercase", letterSpacing: "0.5px",
                        }}>ativa</span>
                      )}
                    </div>
                  </div>
                  <select
                    value={l.role}
                    disabled={pending}
                    onChange={(e) => changeLinkRole(l.company_id, e.target.value)}
                    style={{ ...inputStyle, width: "auto", padding: "5px 8px" }}>
                    <option value="member">Membro</option>
                    <option value="admin">Administrador</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                  <button onClick={() => removeLink(l.company_id)} disabled={pending} style={{
                    background: "transparent", border: "1px solid var(--border)",
                    color: "var(--danger)", padding: "5px 10px", borderRadius: "7px",
                    fontSize: "11px", fontWeight: 600, cursor: pending ? "default" : "pointer",
                  }}>Remover</button>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar empresa */}
          {available.length > 0 && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
              <select value={addCompany} onChange={(e) => setAddCompany(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}>
                <option value="">+ Vincular empresa…</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select value={addRole} onChange={(e) => setAddRole(e.target.value)}
                style={{ ...inputStyle, width: "auto" }}>
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
                <option value="super_admin">Super admin</option>
              </select>
              <button onClick={addLink} disabled={pending || !addCompany} style={{
                background: "var(--accent)", color: "#fff", border: "none",
                padding: "8px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                cursor: pending || !addCompany ? "default" : "pointer", opacity: pending || !addCompany ? 0.6 : 1,
              }}>Vincular</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
