"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Pencil, Trash2, ChevronRight, X, Settings, Sparkles } from "lucide-react"
import type { CategoryNode, CategoryTree, CategoryAba } from "@/lib/db/categories"
import { createCategory, updateCategory, deleteCategory, seedDefaults } from "./actions"

/* ── Configuração das abas ── */
const ABAS: { key: CategoryAba; tab: string; title: string; subtitle: string; cor: string; novo: string }[] = [
  {
    key: "receita",
    tab: "Categorias de receita",
    title: "Categorias de receita",
    subtitle: "Entradas, deduções e receitas financeiras posicionadas na DRE.",
    cor: "var(--success)",
    novo: "Nova categoria de receita",
  },
  {
    key: "despesa",
    tab: "Categorias de despesa",
    title: "Categorias de despesa",
    subtitle: "Custos, despesas operacionais, impostos e resultado financeiro.",
    cor: "var(--danger)",
    novo: "Nova categoria de despesa",
  },
  {
    key: "neutra",
    tab: "Categorias que não afetam DRE",
    title: "Categorias que não afetam a DRE",
    subtitle: "Investimentos, empréstimos, sócios e transferências internas.",
    cor: "var(--purple)",
    novo: "Nova categoria neutra",
  },
]

const GRUPOS_POR_ABA: Record<CategoryAba, { grupo: string; label: string }[]> = {
  receita: [
    { grupo: "receita_bruta", label: "Receita Bruta" },
    { grupo: "deducoes", label: "Deduções da Receita" },
    { grupo: "outras_receitas", label: "Outras Receitas Operacionais" },
    { grupo: "rec_financeira", label: "Receitas Financeiras" },
  ],
  despesa: [
    { grupo: "cst_servicos", label: "CSP — Custo dos Serviços" },
    { grupo: "cst_mercadorias", label: "CMV — Custo das Mercadorias" },
    { grupo: "desp_pessoal", label: "Despesas com Pessoal" },
    { grupo: "desp_administrativa", label: "Despesas Administrativas" },
    { grupo: "desp_comercial", label: "Despesas Comerciais / Marketing" },
    { grupo: "desp_impostos", label: "Impostos e Taxas sobre Resultado" },
    { grupo: "depreciacao", label: "Depreciação e Amortização" },
    { grupo: "desp_financeira", label: "Despesas Financeiras" },
    { grupo: "ir_csll", label: "IR e CSLL" },
  ],
  neutra: [
    { grupo: "investimento", label: "Investimentos / Imobilizado" },
    { grupo: "emprestimo", label: "Empréstimos e Financiamentos" },
    { grupo: "socio", label: "Movimentações de Sócios" },
    { grupo: "transferencia", label: "Transferências Internas" },
  ],
}

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 11px", background: "var(--bg-tertiary)",
  border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12.5px",
  color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
}

function Label({ children, htmlFor }: { children:string; htmlFor?:string }) {
  return <label htmlFor={htmlFor} style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{children}</label>
}

/* ── Helpers de árvore ── */
function flatten(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = []
  const walk = (ns: CategoryNode[]) => ns.forEach((n) => { out.push(n); walk(n.children) })
  walk(nodes)
  return out
}

function matches(node: CategoryNode, q: string): boolean {
  const hit = node.name.toLowerCase().includes(q) || (node.code ?? "").toLowerCase().includes(q)
  return hit || node.children.some((c) => matches(c, q))
}

type FormState =
  | { mode: "create-root"; aba: CategoryAba }
  | { mode: "create-child"; parent: CategoryNode }
  | { mode: "edit"; node: CategoryNode }
  | null

export default function CategoriesClient({ tree }: { tree: CategoryTree }) {
  const router = useRouter()
  const [activeAba, setActiveAba] = useState<CategoryAba>("receita")
  const [q, setQ] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [form, setForm] = useState<FormState>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const query = q.trim().toLowerCase()
  const cfg = ABAS.find((a) => a.key === activeAba)!
  const roots = tree[activeAba]

  const visibleRoots = useMemo(() => {
    if (!query) return roots
    return roots.filter((r) => matches(r, query))
  }, [roots, query])

  // ids que devem aparecer expandidos quando há busca
  const forceOpen = useMemo(() => {
    if (!query) return null
    const ids = new Set<string>()
    const walk = (ns: CategoryNode[]) => ns.forEach((n) => { if (matches(n, query)) ids.add(n.id); walk(n.children) })
    walk(roots)
    return ids
  }, [roots, query])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function isOpen(id: string) {
    return forceOpen ? forceOpen.has(id) : expanded.has(id)
  }

  function handleSeed() {
    setError(null)
    startTransition(async () => {
      const res = await seedDefaults()
      if (res.ok) router.refresh()
      else setError(res.error ?? "Falha ao configurar categorias padrão.")
    })
  }

  function handleDelete(node: CategoryNode) {
    if (!window.confirm(`Excluir "${node.name}"?`)) return
    startTransition(async () => {
      const res = await deleteCategory(node.id)
      if (res.ok) router.refresh()
      else window.alert(res.error)
    })
  }

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form) return
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "")
    const grupo = String(fd.get("grupo") ?? "")
    setError(null)
    startTransition(async () => {
      let res
      if (form.mode === "create-root") {
        res = await createCategory({ name, grupo, parent_id: null, is_synthetic: true })
      } else if (form.mode === "create-child") {
        res = await createCategory({ name, grupo: form.parent.grupo ?? grupo, parent_id: form.parent.id, is_synthetic: false })
      } else {
        res = await updateCategory({ id: form.node.id, name, grupo: form.node.is_synthetic ? grupo : undefined })
      }
      if (res.ok) {
        setForm(null)
        router.refresh()
      } else {
        setError(res.error ?? "Não foi possível salvar.")
      }
    })
  }

  const totalLeaves = flatten(roots).filter((n) => !n.is_synthetic).length

  return (
    <div style={{ padding: "22px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.4px" }}>Categorias financeiras</h1>
          <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "3px" }}>
            Estrutura inspirada no Conta Azul, conectada ao plano de contas e à DRE gerencial.
          </p>
        </div>
        <button onClick={() => { setError(null); setForm({ mode: "create-root", aba: activeAba }) }} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
          <Plus size={14} /> Novo registro
        </button>
      </div>

      {/* Barra de ações */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button onClick={handleSeed} disabled={pending} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, cursor: pending ? "default" : "pointer", fontFamily: "inherit", opacity: pending ? 0.7 : 1 }}>
          <Settings size={13} /> Configurar categorias padrão
        </button>
        <div style={{ position: "relative", flex: 1, maxWidth: "340px" }}>
          <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar categoria ou código..." style={{ width: "100%", paddingLeft: "30px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-primary)", outline: "none", fontFamily: "inherit" }} />
        </div>
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>{totalLeaves} categorias analíticas</span>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid var(--border)" }}>
        {ABAS.map((a) => {
          const active = a.key === activeAba
          return (
            <button key={a.key} onClick={() => setActiveAba(a.key)} style={{
              padding: "9px 16px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
              fontSize: "12.5px", fontWeight: active ? 700 : 500,
              color: active ? a.cor : "var(--text-secondary)",
              borderBottom: active ? `2px solid ${a.cor}` : "2px solid transparent", marginBottom: "-1px",
            }}>
              {a.tab}
            </button>
          )
        })}
      </div>

      {/* Formulário inline */}
      {form && (
        <form onSubmit={submitForm} style={{ background: "var(--bg-secondary)", border: `1px solid ${cfg.cor}55`, borderRadius: "var(--radius)", padding: "18px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
              {form.mode === "edit" ? "Editar categoria" : form.mode === "create-child" ? `Nova subcategoria de "${form.parent.name}"` : cfg.novo}
            </span>
            <button type="button" onClick={() => setForm(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: form.mode === "create-child" ? "1fr" : "1fr 1fr", gap: "14px" }}>
            <div>
              <Label htmlFor="cat_name">Nome *</Label>
              <input name="name" id="cat_name" type="text" required autoFocus defaultValue={form.mode === "edit" ? form.node.name : ""} placeholder="Ex: Materiais de construção" style={inp} />
            </div>
            {form.mode !== "create-child" && (
              <div>
                <Label htmlFor="cat_grupo">Grupo na DRE *</Label>
                <select name="grupo" id="cat_grupo" required defaultValue={form.mode === "edit" ? form.node.grupo ?? "" : ""} style={inp}>
                  <option value="" disabled>Selecione...</option>
                  {GRUPOS_POR_ABA[activeAba].map((g) => (
                    <option key={g.grupo} value={g.grupo}>{g.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {error && <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--danger)", fontWeight: 600 }}>{error}</div>}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
            <button type="submit" disabled={pending} style={{ padding: "9px 20px", background: cfg.cor, border: "none", borderRadius: "6px", fontSize: "12px", color: "#fff", fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, fontFamily: "inherit" }}>{pending ? "Salvando..." : "Salvar"}</button>
            <button type="button" onClick={() => setForm(null)} style={{ padding: "9px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Card da aba */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>{cfg.title}</h2>
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>{cfg.subtitle}</p>
          </div>
          <button onClick={() => { setError(null); setForm({ mode: "create-root", aba: activeAba }) }} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: cfg.cor, border: "none", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            <Plus size={13} /> {cfg.novo}
          </button>
        </div>

        {/* Cabeçalho de colunas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 110px", padding: "10px 18px", background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border)" }}>
          {["CATEGORIA", "DRE", "AÇÕES"].map((h, i) => (
            <div key={h} style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.4px", textAlign: i === 2 ? "right" : "left" }}>{h}</div>
          ))}
        </div>

        {/* Linhas */}
        <div>
          {visibleRoots.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "12.5px" }}>
              {query ? "Nenhuma categoria encontrada." : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Sparkles size={14} /> Nenhuma categoria nesta aba. Use “Configurar categorias padrão” para semear o plano.
                </span>
              )}
            </div>
          ) : (
            visibleRoots.map((node) => (
              <Row key={node.id} node={node} depth={0} isOpen={isOpen} toggle={toggle}
                onAddChild={(p) => { setError(null); setForm({ mode: "create-child", parent: p }) }}
                onEdit={(n) => { setError(null); setForm({ mode: "edit", node: n }) }}
                onDelete={handleDelete} query={query} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Linha recursiva ── */
function Row({
  node, depth, isOpen, toggle, onAddChild, onEdit, onDelete, query,
}: {
  node: CategoryNode
  depth: number
  isOpen: (id: string) => boolean
  toggle: (id: string) => void
  onAddChild: (n: CategoryNode) => void
  onEdit: (n: CategoryNode) => void
  onDelete: (n: CategoryNode) => void
  query: string
}) {
  if (query && !matches(node, query)) return null
  const open = isOpen(node.id)
  const hasChildren = node.children.length > 0
  const cor = node.dre_cor ?? "var(--text-muted)"
  const dotSize = node.is_synthetic ? 11 : 8

  const iconBtn: React.CSSProperties = {
    width: "26px", height: "26px", borderRadius: "5px", border: "1px solid var(--border)",
    background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "var(--text-secondary)",
  }

  return (
    <>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 200px 110px", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid var(--border)", background: node.is_synthetic ? "var(--bg-secondary)" : "transparent" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = node.is_synthetic ? "var(--bg-secondary)" : "transparent")}
      >
        {/* Categoria */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: `${depth * 22}px`, minWidth: 0 }}>
          {hasChildren ? (
            <button onClick={() => toggle(node.id)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-muted)" }}>
              <ChevronRight size={14} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
            </button>
          ) : (
            <span style={{ width: "14px", flexShrink: 0 }} />
          )}
          <span style={{ width: `${dotSize}px`, height: `${dotSize}px`, borderRadius: "50%", background: cor, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "7px" }}>
              {node.code && <span style={{ fontSize: "11px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{node.code}</span>}
              <span style={{ fontSize: node.is_synthetic ? "13px" : "12.5px", fontWeight: node.is_synthetic ? 700 : 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
            </div>
            {node.is_synthetic && (
              <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "1px" }}>{node.description ?? node.dre_label ?? ""}</div>
            )}
          </div>
        </div>

        {/* DRE */}
        <div>
          {node.dre_label && (
            <span style={{ display: "inline-block", fontSize: "10.5px", fontWeight: 700, color: cor, background: `${cor}22`, padding: "3px 10px", borderRadius: "20px", whiteSpace: "nowrap" }}>
              {node.dre_label}
            </span>
          )}
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}>
          <button type="button" title="Adicionar subcategoria" onClick={() => onAddChild(node)} style={iconBtn}><Plus size={12} /></button>
          <button type="button" title="Editar" onClick={() => onEdit(node)} style={iconBtn}><Pencil size={12} /></button>
          <button type="button" title="Excluir" onClick={() => onDelete(node)} style={{ ...iconBtn, color: "var(--danger)" }}><Trash2 size={12} /></button>
        </div>
      </div>

      {open && node.children.map((child) => (
        <Row key={child.id} node={child} depth={depth + 1} isOpen={isOpen} toggle={toggle}
          onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} query={query} />
      ))}
    </>
  )
}
