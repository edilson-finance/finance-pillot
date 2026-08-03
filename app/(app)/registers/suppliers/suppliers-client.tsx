"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDialog } from "@/lib/dialog"
import { Plus, Search, Edit2, ChevronLeft, X, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Supplier } from "@/lib/db/suppliers"
import { createSupplier, updateSupplier, deleteSupplier } from "./actions"

const stCfg: Record<string, { label: string; c: string; bg: string }> = {
  ativo:   { label:"Ativo",   c:"var(--success)",   bg:"var(--success-soft)" },
  critico: { label:"Crítico", c:"var(--danger)",    bg:"var(--danger-soft)" },
  inativo: { label:"Inativo", c:"var(--text-muted)",bg:"var(--bg-tertiary)" },
}

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

function Label({ children, htmlFor }: { children:string; htmlFor?:string }) {
  return <label htmlFor={htmlFor} style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

export default function SuppliersClient({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter()
  const { confirm, alert } = useDialog()
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) ||
    (s.document ?? "").toLowerCase().includes(q.toLowerCase())
  )

  function openNew() {
    setEditing(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
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
      ? await updateSupplier(editing.id, fd)
      : await createSupplier(fd)
    setSaving(false)
    if (res.error === null) {
      closeForm()
      router.refresh()
    } else {
      setError(res.error)
    }
  }

  async function handleDelete(s: Supplier) {
    if (!(await confirm(`Excluir o fornecedor "${s.name}"?`, { danger: true, confirmText: "Excluir" }))) return
    const res = await deleteSupplier(s.id)
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
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Fornecedores</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Cadastro, dados bancários e histórico de pagamentos</p>
        </div>
        <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Novo fornecedor
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"16px" }}>
        {[
          { l:"Total Fornecedores", v:String(suppliers.length), c:"var(--accent)" },
          { l:"Total Pago",         v:"—", c:"var(--danger)" },
          { l:"A Pagar",            v:"—", c:"var(--warning)" },
          { l:"Prazo Médio",        v:"—", c:"var(--purple)" },
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
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</span>
            <button type="button" onClick={closeForm} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><Label htmlFor="name">Razão Social / Nome *</Label><input name="name" id="name" type="text" required defaultValue={editing?.name ?? ""} placeholder="Fornecedor Exemplo Ltda" style={inp}/></div>
            <div><Label htmlFor="document">CPF / CNPJ</Label><input name="document" id="document" type="text" defaultValue={editing?.document ?? ""} placeholder="00.000.000/0001-00" style={inp}/></div>
            <div><Label htmlFor="email">E-mail</Label><input name="email" id="email" type="email" defaultValue={editing?.email ?? ""} placeholder="financeiro@fornecedor.com.br" style={inp}/></div>
            <div><Label htmlFor="phone">Telefone</Label><input name="phone" id="phone" type="text" defaultValue={editing?.phone ?? ""} placeholder="(11) 99999-9999" style={inp}/></div>
            <div><Label htmlFor="status">Status</Label>
              <select name="status" id="status" defaultValue={editing?.status ?? "ativo"} style={inp}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="critico">Crítico</option>
              </select>
            </div>
          </div>
          {error && <div style={{ marginTop:"12px",fontSize:"12px",color:"var(--danger)",fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?0.7:1,fontFamily:"inherit" }}>{saving ? "Salvando..." : "Salvar fornecedor"}</button>
            <button type="button" onClick={closeForm} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div style={{ position:"relative",marginBottom:"14px",maxWidth:"360px" }}>
        <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar fornecedor..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"8px",paddingBottom:"8px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
      </div>

      {/* Table */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Fornecedor","CNPJ","Tipo","Categoria","Total Pago","A Pagar","Contato","Status","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:["Total Pago","A Pagar"].includes(h)?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s,i)=>{
              const sc = stCfg[s.status] ?? { label:s.status, c:"var(--text-muted)", bg:"var(--bg-tertiary)" }
              return (
                <tr key={s.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"12px 14px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{s.name}</td>
                  <td style={{ padding:"12px 14px",fontSize:"11px",color:"var(--text-secondary)" }}>{s.document ?? "—"}</td>
                  <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>—</td>
                  <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>—</td>
                  <td style={{ padding:"12px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--text-muted)" }}>—</td>
                  <td style={{ padding:"12px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--text-muted)" }}>—</td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:"11px",color:"var(--text-secondary)" }}>{s.email ?? "—"}</div>
                    <div style={{ fontSize:"10px",color:"var(--text-muted)" }}>{s.phone ?? "—"}</div>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:sc.c,background:sc.bg,padding:"3px 9px",borderRadius:"20px" }}>{sc.label}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex",gap:"5px" }}>
                      <button type="button" title="Editar" onClick={()=>openEdit(s)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}><Edit2 size={12}/></button>
                      <button type="button" title="Excluir" onClick={()=>handleDelete(s)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--danger)" }}><Trash2 size={12}/></button>
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
