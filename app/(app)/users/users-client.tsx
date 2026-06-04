"use client"

import { useState, useTransition } from "react"
import { Plus, X, Shield, Check, Copy, Trash2, Settings2, Mail, User, ChevronDown, ChevronUp, Pencil, Ban, RotateCcw } from "lucide-react"
import { MEMBER_MODULES } from "@/lib/modules"
import { createInvite, revokeInvite, updateUserRole, setMemberPermissions, removeUser, updateUserName, setUserActive } from "./actions"

export interface CompanyUser {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  modules: string[]
}
export interface PendingInvite {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: "Super Admin", color: "var(--purple)", bg: "var(--purple-soft)" },
  admin: { label: "Administrador", color: "var(--accent)", bg: "var(--accent-soft)" },
  member: { label: "Membro", color: "var(--success)", bg: "var(--success-soft)" },
}

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  background: "var(--bg-tertiary)", border: "1px solid var(--border)",
  borderRadius: "6px", fontSize: "12.5px", color: "var(--text-primary)",
  outline: "none", fontFamily: "inherit",
}
const btnPrimary: React.CSSProperties = {
  padding: "9px 18px", background: "var(--accent)", border: "none", borderRadius: "6px",
  fontSize: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
}
const btnGhost: React.CSSProperties = {
  padding: "8px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)",
  borderRadius: "6px", fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit",
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR")
}

export default function UsersClient({
  currentUserId, currentRole, users, invites,
}: {
  currentUserId: string
  currentRole: string
  users: CompanyUser[]
  invites: PendingInvite[]
}) {
  const [tab, setTab] = useState<"users" | "invites">("users")
  const [showLegend, setShowLegend] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState<CompanyUser | null>(null)
  const [editingName, setEditingName] = useState<CompanyUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Invite form state
  const [invRole, setInvRole] = useState<"admin" | "member">("member")
  const [invModules, setInvModules] = useState<Record<string, boolean>>({})

  function submitInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setInviteLink(null)
    const fd = new FormData(e.currentTarget)
    fd.set("role", invRole)
    fd.delete("modules")
    if (invRole === "member") {
      Object.entries(invModules).forEach(([k, v]) => { if (v) fd.append("modules", k) })
    }
    startTransition(async () => {
      const res = await createInvite(fd)
      if (res.error) { setError(res.error); return }
      setInviteLink(res.link ?? null)
      ;(e.target as HTMLFormElement).reset?.()
      setInvModules({})
    })
  }

  function changeRole(u: CompanyUser, role: string) {
    setError(null)
    startTransition(async () => {
      const res = await updateUserRole(u.id, role)
      if (res.error) setError(res.error)
    })
  }

  function doRemove(u: CompanyUser) {
    if (!confirm(`Remover ${u.name || u.email} da empresa? Esta ação exclui o cadastro e não pode ser desfeita.`)) return
    setError(null)
    startTransition(async () => {
      const res = await removeUser(u.id)
      if (res.error) setError(res.error)
    })
  }

  function toggleActive(u: CompanyUser) {
    const next = !u.active
    const verb = next ? "Reativar" : "Desativar"
    if (!confirm(`${verb} o acesso de ${u.name || u.email}?${next ? "" : " O usuário não conseguirá entrar no sistema até ser reativado."}`)) return
    setError(null)
    startTransition(async () => {
      const res = await setUserActive(u.id, next)
      if (res.error) setError(res.error)
    })
  }

  function saveName(u: CompanyUser, name: string) {
    setError(null)
    startTransition(async () => {
      const res = await updateUserName(u.id, name)
      if (res.error) setError(res.error)
      else setEditingName(null)
    })
  }

  function copyLink() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ padding: "22px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.4px" }}>Usuários e Permissões</h1>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Gerencie quem acessa o sistema e o que cada membro pode ver</p>
        </div>
        <button onClick={() => { setShowInvite(v => !v); setInviteLink(null); setError(null) }} style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus size={13} /> Convidar usuário
        </button>
      </div>

      <RoleLegend open={showLegend} onToggle={() => setShowLegend(v => !v)} />

      {error && (
        <div style={{ marginBottom: "14px", padding: "10px 14px", background: "var(--danger-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "8px", fontSize: "12px", color: "var(--danger)" }}>{error}</div>
      )}

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={submitInvite} style={{ background: "var(--bg-secondary)", border: "1px solid var(--accent-medium)", borderRadius: "var(--radius)", padding: "20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Convidar Novo Usuário</span>
            <button type="button" onClick={() => setShowInvite(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
            <div>
              <label style={lbl}>E-mail *</label>
              <input name="email" type="email" required placeholder="usuario@empresa.com.br" style={inp} />
            </div>
            <div>
              <label style={lbl}>Perfil *</label>
              <select value={invRole} onChange={e => setInvRole(e.target.value as "admin" | "member")} style={inp}>
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          {invRole === "member" && (
            <div style={{ marginTop: "16px" }}>
              <label style={lbl}>Módulos liberados</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                {MEMBER_MODULES.map(m => {
                  const on = !!invModules[m.key]
                  return (
                    <button key={m.key} type="button" onClick={() => setInvModules(p => ({ ...p, [m.key]: !p[m.key] }))} style={chip(on)}>
                      {on && <Check size={10} />}{m.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button type="submit" disabled={isPending} style={{ ...btnPrimary, opacity: isPending ? 0.6 : 1 }}>
              {isPending ? "Gerando..." : "Gerar convite"}
            </button>
            <button type="button" onClick={() => setShowInvite(false)} style={btnGhost}>Cancelar</button>
          </div>

          {inviteLink && (
            <div style={{ marginTop: "16px", padding: "12px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "var(--success)", marginBottom: "6px" }}>
                <Mail size={12} /> Convite criado — compartilhe o link de cadastro
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input readOnly value={inviteLink} style={{ ...inp, fontSize: "11.5px" }} onFocus={e => e.currentTarget.select()} />
                <button type="button" onClick={copyLink} style={{ ...btnGhost, display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                  <Copy size={12} />{copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "3px", marginBottom: "16px", width: "fit-content" }}>
        {([["users", `Usuários (${users.length})`], ["invites", `Convites pendentes (${invites.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: "7px 16px", borderRadius: "8px", border: "none",
            background: tab === k ? "var(--bg-tertiary)" : "transparent",
            color: tab === k ? "var(--text-primary)" : "var(--text-secondary)",
            fontSize: "12px", fontWeight: tab === k ? 700 : 400, cursor: "pointer", fontFamily: "inherit",
          }}>{l}</button>
        ))}
      </div>

      {/* USERS */}
      {tab === "users" && (
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border)" }}>
                {["Usuário", "Perfil", "Módulos", "Ações"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const rc = ROLE_META[u.role] ?? ROLE_META.member
                const isSelf = u.id === currentUserId
                const initials = (u.name || u.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none", opacity: u.active ? 1 : 0.55 }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: rc.color, flexShrink: 0 }}>{initials}</div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                            {u.name || "—"}
                            {isSelf && <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 400 }}>(você)</span>}
                            {!u.active && <span style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--danger)", background: "var(--danger-soft)", padding: "1px 7px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.3px" }}>Desativado</span>}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {u.role === "super_admin" || isSelf ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", background: rc.bg }}>
                          <Shield size={10} style={{ color: rc.color }} />
                          <span style={{ fontSize: "11px", fontWeight: 700, color: rc.color }}>{rc.label}</span>
                        </div>
                      ) : (
                        <select value={u.role} onChange={e => changeRole(u, e.target.value)} disabled={isPending} style={{ ...inp, width: "auto", padding: "5px 10px", fontSize: "11.5px" }}>
                          <option value="member">Membro</option>
                          <option value="admin">Administrador</option>
                          {currentRole === "super_admin" && <option value="super_admin">Super Admin</option>}
                        </select>
                      )}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "11.5px", color: "var(--text-secondary)" }}>
                      {u.role === "member"
                        ? (u.modules.length ? `${u.modules.length} módulo${u.modules.length > 1 ? "s" : ""}` : "Nenhum")
                        : "Acesso total"}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button onClick={() => setEditingName(u)} disabled={isPending} style={{ ...btnGhost, padding: "5px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Pencil size={12} /> Editar
                        </button>
                        {u.role === "member" && (
                          <button onClick={() => setEditing(u)} style={{ ...btnGhost, padding: "5px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Settings2 size={12} /> Permissões
                          </button>
                        )}
                        {!isSelf && (
                          <button onClick={() => toggleActive(u)} disabled={isPending} style={{ padding: "5px 10px", background: u.active ? "var(--warning-soft)" : "var(--success-soft)", border: `1px solid ${u.active ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: "6px", fontSize: "11px", color: u.active ? "var(--warning)" : "var(--success)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px" }}>
                            {u.active ? <><Ban size={12} /> Desativar</> : <><RotateCcw size={12} /> Reativar</>}
                          </button>
                        )}
                        {!isSelf && (
                          <button onClick={() => doRemove(u)} disabled={isPending} style={{ padding: "5px 10px", background: "var(--danger-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "6px", fontSize: "11px", color: "var(--danger)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Trash2 size={12} /> Remover
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* INVITES */}
      {tab === "invites" && (
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          {invites.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>Nenhum convite pendente.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border)" }}>
                  {["E-mail", "Perfil", "Criado", "Expira", "Ações"].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {invites.map((inv, i) => {
                  const rc = ROLE_META[inv.role] ?? ROLE_META.member
                  return (
                    <tr key={inv.id} style={{ borderBottom: i < invites.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "13px 16px", fontSize: "12.5px", color: "var(--text-primary)", fontWeight: 600 }}>{inv.email}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: rc.color, background: rc.bg, padding: "2px 9px", borderRadius: "20px" }}>{rc.label}</span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--text-secondary)" }}>{fmtDate(inv.createdAt)}</td>
                      <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--text-secondary)" }}>{fmtDate(inv.expiresAt)}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <button onClick={() => startTransition(async () => { const r = await revokeInvite(inv.id); if (r.error) setError(r.error) })} disabled={isPending} style={{ padding: "5px 10px", background: "var(--danger-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "6px", fontSize: "11px", color: "var(--danger)", cursor: "pointer", fontFamily: "inherit" }}>Revogar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editing && (
        <PermissionEditor
          user={editing}
          onClose={() => setEditing(null)}
          onSave={(mods) => {
            setError(null)
            startTransition(async () => {
              const res = await setMemberPermissions(editing.id, mods)
              if (res.error) setError(res.error)
              else setEditing(null)
            })
          }}
          saving={isPending}
        />
      )}

      {editingName && (
        <EditNameModal
          user={editingName}
          onClose={() => setEditingName(null)}
          onSave={(name) => saveName(editingName, name)}
          saving={isPending}
        />
      )}
    </div>
  )
}

function EditNameModal({ user, onClose, onSave, saving }: {
  user: CompanyUser
  onClose: () => void
  onSave: (name: string) => void
  saving: boolean
}) {
  const [name, setName] = useState(user.name)
  const trimmed = name.trim()
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "24px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "22px", width: "100%", maxWidth: "440px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>Editar usuário</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>{user.email}</p>
        <label style={lbl}>Nome</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && trimmed && !saving) onSave(trimmed) }}
          placeholder="Nome do usuário"
          style={inp}
        />
        <div style={{ display: "flex", gap: "8px", marginTop: "18px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={() => onSave(trimmed)} disabled={saving || !trimmed} style={{ ...btnPrimary, opacity: saving || !trimmed ? 0.6 : 1, cursor: saving || !trimmed ? "not-allowed" : "pointer" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function RoleLegend({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const cards = [
    {
      icon: <Shield size={14} style={{ color: "var(--accent)" }} />,
      label: "Administrador",
      color: "var(--accent)",
      bg: "var(--accent-soft)",
      desc: "Controle total da empresa.",
      can: [
        "Acessa todos os módulos do sistema, sem restrição",
        "Convida, troca o perfil e remove usuários",
        "Define quais módulos cada membro pode acessar",
        "Entra nas áreas restritas: Usuários e Configurações",
        "Cria, edita e exclui lançamentos, cadastros e categorias",
      ],
    },
    {
      icon: <User size={14} style={{ color: "var(--success)" }} />,
      label: "Membro",
      color: "var(--success)",
      bg: "var(--success-soft)",
      desc: "Acesso limitado ao que o administrador liberar.",
      can: [
        "Vê apenas os módulos marcados como liberados no convite",
        "Dentro de um módulo liberado, usa as mesmas ações do admin",
        "Não enxerga as áreas de Usuários e Configurações",
        "Não gerencia outros usuários nem permissões",
        "Tem as permissões ajustadas a qualquer momento em “Permissões”",
      ],
    },
  ]
  return (
    <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginBottom: "16px", overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", fontWeight: 700, color: "var(--text-primary)" }}>
          <Shield size={13} style={{ color: "var(--accent)" }} /> O que cada perfil pode fazer
        </span>
        {open ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
      </button>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "12px", padding: "0 16px 16px" }}>
          {cards.map(c => (
            <div key={c.label} style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", borderRadius: "7px", background: c.bg }}>{c.icon}</span>
                <span style={{ fontSize: "13px", fontWeight: 800, color: c.color }}>{c.label}</span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>{c.desc}</p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "7px" }}>
                {c.can.map((t, idx) => (
                  <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    <Check size={12} style={{ color: c.color, flexShrink: 0, marginTop: "2px" }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PermissionEditor({ user, onClose, onSave, saving }: {
  user: CompanyUser
  onClose: () => void
  onSave: (modules: string[]) => void
  saving: boolean
}) {
  const [sel, setSel] = useState<Record<string, boolean>>(
    Object.fromEntries(user.modules.map(m => [m, true])),
  )
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "24px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "22px", width: "100%", maxWidth: "520px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>Permissões de {user.name || user.email}</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>Selecione os módulos que este membro pode acessar.</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {MEMBER_MODULES.map(m => {
            const on = !!sel[m.key]
            return (
              <button key={m.key} type="button" onClick={() => setSel(p => ({ ...p, [m.key]: !p[m.key] }))} style={chip(on)}>
                {on && <Check size={10} />}{m.label}
              </button>
            )
          })}
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "18px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={() => onSave(Object.keys(sel).filter(k => sel[k]))} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvando..." : "Salvar permissões"}
          </button>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)",
  marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px",
}
const th: React.CSSProperties = {
  padding: "10px 16px", textAlign: "left", fontSize: "10px", color: "var(--text-muted)",
  fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px",
}
function chip(on: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: "5px", padding: "5px 11px",
    borderRadius: "20px", border: "1px solid",
    borderColor: on ? "var(--accent)" : "var(--border)",
    background: on ? "var(--accent-soft)" : "transparent",
    color: on ? "var(--accent)" : "var(--text-secondary)",
    fontSize: "11px", fontWeight: on ? 700 : 400, cursor: "pointer", fontFamily: "inherit",
  }
}
