"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDialog } from "@/lib/dialog"
import { Plus, Search, Edit2, ChevronLeft, X, Trash2 } from "lucide-react"
import Link from "next/link"
import type { CostCenter } from "@/lib/db/cost-centers"
import { createCostCenter, updateCostCenter, deleteCostCenter } from "./actions"

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

function Label({ children, htmlFor }: { children:string; htmlFor?:string }) {
  return <label htmlFor={htmlFor} style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

export default function CostCentersClient({ costCenters }: { costCenters: CostCenter[] }) {
  const router = useRouter()
  const { confirm, alert } = useDialog()
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CostCenter | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = costCenters.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.code ?? "").toLowerCase().includes(q.toLowerCase())
  )

  function openNew() {
    setEditing(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(c: CostCenter) {
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
      ? await updateCostCenter(editing.id, fd)
      : await createCostCenter(fd)
    setSaving(false)
    if (res.error === null) {
      closeForm()
      router.refresh()
    } else {
      setError(res.error)
    }
  }

  async function handleDelete(c: CostCenter) {
    if (!(await confirm(`Excluir o centro de custo "${c.name}"?`, { danger: true, confirmText: "Excluir" }))) return
    const res = await deleteCostCenter(c.id)
    if (res.error === null) router.refresh()
    else void alert(res.error, { title: "Erro" })
  }

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Centros de Custo</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Obras, projetos, departamentos e filiais</p>
        </div>
        <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Novo centro
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"16px" }}>
        {[
          { l:"Total Centros",  v:String(costCenters.length), c:"var(--accent)" },
          { l:"Orçamento Total",v:"—", c:"var(--success)" },
          { l:"Realizado",      v:"—", c:"var(--warning)" },
          { l:"Utilização",     v:"—", c:"var(--danger)" },
        ].map(k=>(
          <div key={k.l} style={{ background:"var(--bg-secondary)",border:`1px solid ${k.c}28`,borderLeft:`3px solid ${k.c}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent-border)",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{editing ? "Editar Centro de Custo" : "Novo Centro de Custo"}</span>
            <button type="button" onClick={closeForm} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><Label htmlFor="name">Nome *</Label><input name="name" id="name" type="text" required defaultValue={editing?.name ?? ""} placeholder="Ex: Obra 10 — Incorporadora Sul" style={inp}/></div>
            <div><Label htmlFor="code">Código</Label><input name="code" id="code" type="text" defaultValue={editing?.code ?? ""} placeholder="Ex: CC-010" style={inp}/></div>
          </div>
          {error && <div style={{ marginTop:"12px",fontSize:"12px",color:"var(--danger)",fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?0.7:1,fontFamily:"inherit" }}>{saving ? "Salvando..." : "Salvar"}</button>
            <button type="button" onClick={closeForm} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div style={{ position:"relative",marginBottom:"14px",maxWidth:"360px" }}>
        <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nome ou código..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"8px",paddingBottom:"8px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
      </div>

      {/* List */}
      <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
        {filtered.map(c=>(
          <div key={c.id} style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"16px 18px",display:"grid",gridTemplateColumns:"1fr 140px 140px 200px 90px 80px",gap:"16px",alignItems:"center" }}>
            <div>
              <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px" }}>
                {c.code && <span style={{ fontSize:"10px",fontWeight:700,color:"var(--accent)",background:"var(--accent-soft)",padding:"2px 7px",borderRadius:"20px" }}>{c.code}</span>}
                <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{c.name}</span>
              </div>
              <div style={{ fontSize:"11px",color:"var(--text-muted)" }}>—</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"2px" }}>Orçamento</div>
              <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-muted)" }}>—</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"2px" }}>Realizado</div>
              <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-muted)" }}>—</div>
            </div>
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
                <span style={{ fontSize:"10px",color:"var(--text-muted)" }}>Utilização</span>
                <span style={{ fontSize:"10px",fontWeight:700,color:"var(--text-muted)" }}>—</span>
              </div>
              <div style={{ background:"var(--bg-tertiary)",borderRadius:"4px",height:"6px" }}>
                <div style={{ height:"100%",borderRadius:"4px",background:"var(--bg-tertiary)",width:"0%" }}/>
              </div>
            </div>
            <div><span style={{ fontSize:"10px",fontWeight:700,color:"var(--text-muted)",background:"var(--bg-tertiary)",padding:"3px 9px",borderRadius:"20px" }}>—</span></div>
            <div style={{ display:"flex",gap:"5px",justifyContent:"flex-end" }}>
              <button type="button" title="Editar" onClick={()=>openEdit(c)} style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
                <Edit2 size={12}/>
              </button>
              <button type="button" title="Excluir" onClick={()=>handleDelete(c)} style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--danger)" }}>
                <Trash2 size={12}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
