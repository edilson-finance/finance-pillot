"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDialog } from "@/lib/dialog"
import { Plus, Search, Edit2, ChevronLeft, X, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Partner } from "@/lib/db/partners"
import { createPartner, updatePartner, deletePartner } from "./actions"

const stCfg: Record<string, { label: string; c: string; bg: string }> = {
  ativo:   { label:"Ativo",   c:"var(--success)",    bg:"var(--success-soft)" },
  inativo: { label:"Inativo", c:"var(--text-muted)", bg:"var(--bg-tertiary)" },
}

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

function Label({ children, htmlFor }: { children:string; htmlFor?:string }) {
  return <label htmlFor={htmlFor} style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

export default function PartnersClient({ partners }: { partners: Partner[] }) {
  const router = useRouter()
  const { confirm, alert } = useDialog()
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = partners.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.document ?? "").toLowerCase().includes(q.toLowerCase())
  )

  function openNew() { setEditing(null); setError(null); setShowForm(true) }
  function openEdit(p: Partner) { setEditing(p); setError(null); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null); setError(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing ? await updatePartner(editing.id, fd) : await createPartner(fd)
    setSaving(false)
    if (res.error === null) {
      closeForm()
      router.refresh()
    } else {
      setError(res.error)
    }
  }

  async function handleDelete(p: Partner) {
    if (!(await confirm(`Excluir o recebedor "${p.name}"?`, { danger: true, confirmText: "Excluir" }))) return
    const res = await deletePartner(p.id)
    if (res.error === null) router.refresh()
    else void alert(res.error, { title: "Erro" })
  }

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px",flexWrap:"wrap" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none",flexShrink:0 }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1,minWidth:0 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Recebedores (Parceiros)</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Terceiros que recebem o valor bruto das cobranças (ex.: dono do lote) — os juros ficam com a empresa</p>
        </div>
        <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Novo recebedor
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent-border)",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{editing ? "Editar Recebedor" : "Novo Recebedor"}</span>
            <button type="button" onClick={closeForm} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><Label htmlFor="p_name">Nome *</Label><input name="name" id="p_name" type="text" required defaultValue={editing?.name ?? ""} placeholder="Ex.: João da Silva (dono do lote 7)" style={inp}/></div>
            <div><Label htmlFor="p_document">CPF / CNPJ</Label><input name="document" id="p_document" type="text" defaultValue={editing?.document ?? ""} placeholder="000.000.000-00" style={inp}/></div>
            <div><Label htmlFor="p_pix_key">Chave PIX / dados de pagamento</Label><input name="pix_key" id="p_pix_key" type="text" defaultValue={editing?.pix_key ?? ""} placeholder="CPF, e-mail, telefone ou banco/agência/conta" style={inp}/></div>
            <div><Label htmlFor="p_status">Status</Label>
              <select name="status" id="p_status" defaultValue={editing?.status ?? "ativo"} style={inp}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div style={{ gridColumn:"span 3" }}><Label htmlFor="p_notes">Observações</Label><input name="notes" id="p_notes" type="text" defaultValue={editing?.notes ?? ""} placeholder="Ex.: repasse todo dia 10" style={inp}/></div>
          </div>
          {error && <div style={{ marginTop:"12px",fontSize:"12px",color:"var(--danger)",fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?0.7:1,fontFamily:"inherit" }}>{saving ? "Salvando..." : "Salvar recebedor"}</button>
            <button type="button" onClick={closeForm} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div style={{ position:"relative",marginBottom:"14px",maxWidth:"360px" }}>
        <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nome ou documento..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"8px",paddingBottom:"8px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
      </div>

      {/* Lista */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:"32px 18px",textAlign:"center",fontSize:"12.5px",color:"var(--text-muted)" }}>
            Nenhum recebedor cadastrado. Clique em "Novo recebedor" para adicionar o primeiro.
          </div>
        ) : (
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Recebedor","CPF / CNPJ","Chave PIX","Observações","Status","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p,i)=>{
              const sc = stCfg[p.status] ?? { label:p.status, c:"var(--text-muted)", bg:"var(--bg-tertiary)" }
              return (
                <tr key={p.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"12px 14px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{p.name}</td>
                  <td style={{ padding:"12px 14px",fontSize:"11px",color:"var(--text-secondary)" }}>{p.document ?? "—"}</td>
                  <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>{p.pix_key ?? "—"}</td>
                  <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-muted)",maxWidth:"220px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.notes ?? "—"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:sc.c,background:sc.bg,padding:"3px 9px",borderRadius:"20px" }}>{sc.label}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex",gap:"5px" }}>
                      <button type="button" title="Editar" onClick={()=>openEdit(p)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}><Edit2 size={12}/></button>
                      <button type="button" title="Excluir" onClick={()=>handleDelete(p)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--danger)" }}><Trash2 size={12}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        )}
      </div>
    </div>
  )
}
