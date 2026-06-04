"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Edit2, X, Trash2, ChevronLeft } from "lucide-react"
import Link from "next/link"
import type { Category } from "@/lib/db/categories"
import { createCategory, updateCategory, deleteCategory } from "./actions"

const kindCfg: Record<string, { label: string; c: string }> = {
  receita: { label: "Receita", c: "var(--success)" },
  despesa: { label: "Despesa", c: "var(--danger)" },
}

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 11px",
  background: "var(--bg-tertiary)", border: "1px solid var(--border)",
  borderRadius: "6px", fontSize: "12.5px", color: "var(--text-primary)",
  outline: "none", fontFamily: "inherit",
}

function Label({ children }: { children: string }) {
  return <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{children}</label>
}

export default function CategoriesClient({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase())
  )

  function openNew() {
    setEditing(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(c: Category) {
    setEditing(c)
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing
      ? await updateCategory(editing.id, fd)
      : await createCategory(fd)
    setSaving(false)
    if (res.error === null) {
      closeForm()
      router.refresh()
    } else {
      setError(res.error)
    }
  }

  async function handleDelete(c: Category) {
    if (!window.confirm(`Excluir a categoria "${c.name}"?`)) return
    const res = await deleteCategory(c.id)
    if (res.error === null) router.refresh()
    else window.alert(res.error)
  }

  return (
    <div style={{ padding: "22px" }}>
      {/* Header com voltar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
        <Link href="/registers" style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", textDecoration: "none" }}>
          <ChevronLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.4px" }}>Categorias</h1>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Plano de contas gerencial — baseado nas normas NBC TG e CFC</p>
        </div>
        <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Plus size={13} /> Nova categoria
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginBottom: "16px" }}>
        {[
          { l: "Total Categorias", v: String(categories.length), c: "var(--accent)" },
          { l: "Receitas", v: "—", c: "var(--success)" },
          { l: "Despesas", v: "—", c: "var(--danger)" },
          { l: "Inativas", v: "—", c: "var(--text-muted)" },
        ].map(k => (
          <div key={k.l} style={{ background: "var(--bg-secondary)", border: `1px solid ${k.c}28`, borderLeft: `3px solid ${k.c}`, borderRadius: "var(--radius)", padding: "12px 14px" }}>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "5px" }}>{k.l}</div>
            <div style={{ fontSize: "19px", fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "var(--bg-secondary)", border: "1px solid var(--accent)40", borderRadius: "var(--radius)", padding: "20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{editing ? "Editar Categoria" : "Nova Categoria"}</span>
            <button type="button" onClick={closeForm} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <Label>Nome *</Label>
              <input name="name" id="name" type="text" required defaultValue={editing?.name ?? ""} placeholder="Ex: Materiais de construção" style={inp} />
            </div>
            <div>
              <Label>Tipo *</Label>
              <select name="kind" id="kind" defaultValue={editing?.kind ?? "despesa"} style={inp}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
          </div>
          {error && <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--danger)", fontWeight: 600 }}>{error}</div>}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
            <button type="submit" disabled={saving} style={{ padding: "9px 20px", background: "var(--accent)", border: "none", borderRadius: "6px", fontSize: "12px", color: "#fff", fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}>{saving ? "Salvando..." : "Salvar categoria"}</button>
            <button type="button" onClick={closeForm} style={{ padding: "9px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Busca */}
      <div style={{ position: "relative", marginBottom: "14px", maxWidth: "360px" }}>
        <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome..." style={{ width: "100%", paddingLeft: "30px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }} />
      </div>

      {/* Tabela */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border)" }}>
              {["Categoria", "Grupo Contábil", "Tipo", "Impacta DRE", "Impacta Caixa", "Status", "Ações"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: ["Impacta DRE", "Impacta Caixa", "Status"].includes(h) ? "center" : "left", fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const kc = kindCfg[c.kind] ?? { label: c.kind, c: "var(--text-muted)" }
              return (
                <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</td>
                  <td style={{ padding: "12px 14px", fontSize: "11px", color: "var(--text-muted)" }}>—</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: kc.c, background: `${kc.c}18`, padding: "2px 8px", borderRadius: "20px" }}>{kc.label}</span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontSize: "11px", color: "var(--text-muted)" }}>—</td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontSize: "11px", color: "var(--text-muted)" }}>—</td>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontSize: "11px", color: "var(--text-muted)" }}>—</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button type="button" title="Editar" onClick={() => openEdit(c)} style={{ width: "26px", height: "26px", borderRadius: "5px", border: "1px solid var(--border)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}><Edit2 size={12} /></button>
                      <button type="button" title="Excluir" onClick={() => handleDelete(c)} style={{ width: "26px", height: "26px", borderRadius: "5px", border: "1px solid var(--border)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--danger)" }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
