"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDialog } from "@/lib/dialog"
import { ChevronLeft, Plus, Edit2, X, Search, Info, Trash2 } from "lucide-react"
import Link from "next/link"
import type { AccountPlan } from "@/lib/db/accounts-plan"
import { createAccountPlan, updateAccountPlan, deleteAccountPlan } from "./actions"

const KIND_LABEL: Record<string, { l: string; c: string }> = {
  receita:  { l: "Receita",  c: "var(--success)" },
  despesa:  { l: "Despesa",  c: "var(--danger)" },
  ativo:    { l: "Ativo",    c: "var(--accent)" },
  passivo:  { l: "Passivo",  c: "var(--purple)" },
}

const inp: React.CSSProperties = { width:"100%",padding:"9px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

function Label({ children, htmlFor }: { children:string; htmlFor?:string }) {
  return <label htmlFor={htmlFor} style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

export default function AccountsPlanClient({ items }: { items: AccountPlan[] }) {
  const router = useRouter()
  const { confirm, alert } = useDialog()
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AccountPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = items.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.code.toLowerCase().includes(q.toLowerCase())
  )

  function parentOf(id: string | null) {
    if (!id) return null
    return items.find(c => c.id === id) ?? null
  }

  function openNew() {
    setEditing(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(c: AccountPlan) {
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
      ? await updateAccountPlan(editing.id, fd)
      : await createAccountPlan(fd)
    setSaving(false)
    if (res.error === null) {
      closeForm()
      router.refresh()
    } else {
      setError(res.error)
    }
  }

  async function handleDelete(c: AccountPlan) {
    if (!(await confirm(`Excluir a conta "${c.code} — ${c.name}"?`, { danger: true, confirmText: "Excluir" }))) return
    const res = await deleteAccountPlan(c.id)
    if (res.error === null) router.refresh()
    else void alert(res.error, { title: "Erro" })
  }

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Plano de Contas</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>
            Padrão NBC TG / CPC para PMEs brasileiras · {items.length} contas · Editável
          </p>
        </div>
        <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Nova conta
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"16px" }}>
        {[
          { l:"Total Contas",  v:String(items.length), c:"var(--accent)" },
          { l:"Receitas",      v:"—", c:"var(--success)" },
          { l:"Despesas",      v:"—", c:"var(--danger)" },
          { l:"Afeta DRE",     v:"—", c:"var(--purple)" },
        ].map(k=>(
          <div key={k.l} style={{ background:"var(--bg-secondary)",border:`1px solid ${k.c}28`,borderLeft:`3px solid ${k.c}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ padding:"12px 16px",background:"var(--accent-soft)",border:"1px solid rgba(79,70,229,0.25)",borderRadius:"var(--radius)",marginBottom:"16px",display:"flex",alignItems:"flex-start",gap:"10px" }}>
        <Info size={14} style={{ color:"var(--accent)",flexShrink:0,marginTop:"1px" }}/>
        <div style={{ fontSize:"12px",color:"var(--accent)",lineHeight:1.6 }}>
          <strong>Plano de Contas padrão</strong> seguindo as normas NBC TG, CPC e Resolução CFC 1.055/05.
          Organize as contas em hierarquia usando o campo <strong>Conta Pai</strong> e classifique cada uma
          por <strong>Tipo</strong> (receita, despesa, ativo ou passivo).
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent-border)",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"14px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{editing ? "Editar Conta" : "Nova Conta"}</span>
            <button type="button" onClick={closeForm} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div>
              <Label htmlFor="code">Código *</Label>
              <input name="code" id="code" type="text" required defaultValue={editing?.code ?? ""} placeholder="Ex: 5.2.11" style={inp}/>
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <Label htmlFor="name">Nome da Conta *</Label>
              <input name="name" id="name" type="text" required defaultValue={editing?.name ?? ""} placeholder="Ex: Despesas com Combustível" style={inp}/>
            </div>
            <div>
              <Label htmlFor="kind">Tipo</Label>
              <select name="kind" id="kind" defaultValue={editing?.kind ?? ""} style={inp}>
                <option value="">(nenhum)</option>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
                <option value="ativo">Ativo</option>
                <option value="passivo">Passivo</option>
              </select>
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <Label htmlFor="parent_id">Conta Pai</Label>
              <select name="parent_id" id="parent_id" defaultValue={editing?.parent_id ?? ""} style={inp}>
                <option value="">(nenhuma)</option>
                {items.filter(c => c.id !== editing?.id).map(c=>(
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <div style={{ marginTop:"12px",fontSize:"12px",color:"var(--danger)",fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?0.7:1,fontFamily:"inherit" }}>{saving ? "Salvando..." : "Salvar conta"}</button>
            <button type="button" onClick={closeForm} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtros / Busca */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"12px 14px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
        <div style={{ position:"relative",flex:1,maxWidth:"280px" }}>
          <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por código ou nome..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"7px",paddingBottom:"7px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Código","Conta","Tipo","Conta Pai","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c,i)=>{
              const k = c.kind ? KIND_LABEL[c.kind] : null
              const parent = parentOf(c.parent_id)
              return (
                <tr key={c.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"12px 14px",fontSize:"11px",color:"var(--text-muted)",fontFamily:"monospace",fontWeight:600 }}>{c.code}</td>
                  <td style={{ padding:"12px 14px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{c.name}</td>
                  <td style={{ padding:"12px 14px" }}>
                    {k
                      ? <span style={{ fontSize:"11px",fontWeight:600,color:k.c,background:`${k.c}18`,padding:"2px 8px",borderRadius:"20px" }}>{k.l}</span>
                      : <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>
                    {parent ? `${parent.code} — ${parent.name}` : "—"}
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex",gap:"5px" }}>
                      <button type="button" title="Editar" onClick={()=>openEdit(c)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}><Edit2 size={12}/></button>
                      <button type="button" title="Excluir" onClick={()=>handleDelete(c)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--danger)" }}><Trash2 size={12}/></button>
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
