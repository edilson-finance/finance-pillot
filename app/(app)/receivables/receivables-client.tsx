"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Check, Edit2, X, AlertCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Receivable } from "@/lib/db/receivables"
import { formatCurrency, formatDate } from "@/lib/utils"
import { createReceivable, updateReceivable, deleteReceivable, markReceived } from "./actions"

const R = formatCurrency

type Opt = { id: string; name: string }

const stCfg: Record<string, { label: string; c: string; bg: string }> = {
  a_receber: { label: "A Receber",  c: "var(--warning)", bg: "var(--warning-soft)" },
  em_atraso: { label: "Em Atraso",  c: "var(--danger)",  bg: "var(--danger-soft)" },
  recebido:  { label: "Recebido",   c: "var(--success)", bg: "var(--success-soft)" },
}

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

function Label({ children }: { children: string }) {
  return <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

function daysOverdue(due: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(due)
  return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000))
}

export default function ReceivablesClient({ receivables, customers, categories, accounts }: {
  receivables: Receivable[]
  customers: Opt[]
  categories: Opt[]
  accounts: Opt[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState("todos")
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Receivable | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = receivables
    .filter(r => filter === "todos" || r.status === filter)
    .filter(r => !q || (r.customer?.name ?? "").toLowerCase().includes(q.toLowerCase()))

  const totals = {
    aReceber: receivables.filter(r => r.status === "a_receber").reduce((s, r) => s + r.amount, 0),
    atraso:   receivables.filter(r => r.status === "em_atraso").reduce((s, r) => s + r.amount, 0),
    recebido: receivables.filter(r => r.status === "recebido").reduce((s, r) => s + r.amount, 0),
  }
  const emAtrasoCount = receivables.filter(r => r.status === "em_atraso").length

  function openNew() { setEditing(null); setError(null); setShowForm(true) }
  function openEdit(r: Receivable) { setEditing(r); setError(null); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null); setError(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing ? await updateReceivable(editing.id, fd) : await createReceivable(fd)
    setSaving(false)
    if (res.error === null) { closeForm(); router.refresh() }
    else setError(res.error)
  }

  async function handleDelete(r: Receivable) {
    if (!window.confirm(`Excluir a cobrança "${r.description ?? r.id}"?`)) return
    const res = await deleteReceivable(r.id)
    if (res.error === null) router.refresh()
    else window.alert(res.error)
  }

  async function handleReceive(r: Receivable) {
    const res = await markReceived(r.id)
    if (res.error === null) router.refresh()
    else window.alert(res.error)
  }

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px" }}>
        <div>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Contas a Receber</h1>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Cobranças, recebimentos e inadimplência</div>
        </div>
        <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 14px",background:"var(--accent)",border:"none",borderRadius:"7px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Nova cobrança
        </button>
      </div>

      {/* Alert inadimplência */}
      {totals.atraso > 0 && (
        <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 16px",background:"var(--danger-soft)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:"var(--radius)",marginBottom:"14px" }}>
          <AlertCircle size={15} style={{ color:"var(--danger)",flexShrink:0 }}/>
          <span style={{ fontSize:"12px",color:"var(--danger)" }}>
            <strong>{R(totals.atraso)} em atraso</strong> — {emAtrasoCount} clientes com pagamentos vencidos
          </span>
          <Link href="/delinquent" style={{ marginLeft:"auto",fontSize:"11px",color:"var(--danger)",fontWeight:700,textDecoration:"none",flexShrink:0 }}>Ver inadimplentes →</Link>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px" }}>
        {[
          { label:"A Receber",  value:R(totals.aReceber), color:"var(--accent)" },
          { label:"Em Atraso",  value:R(totals.atraso),   color:"var(--danger)" },
          { label:"Total",      value:R(totals.aReceber + totals.atraso + totals.recebido), color:"var(--text-primary)" },
          { label:"Recebido",   value:R(totals.recebido), color:"var(--success)" },
        ].map(c=>(
          <div key={c.label} style={{ background:"var(--bg-secondary)",border:`1px solid ${c.color}28`,borderLeft:`3px solid ${c.color}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>{c.label}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{editing ? "Editar Cobrança" : "Nova Cobrança"}</span>
            <button type="button" onClick={closeForm} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div><Label>Cliente</Label>
              <select name="customer_id" defaultValue={editing?.customer_id ?? ""} style={inp}>
                <option value="">— Sem cliente —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"span 2" }}><Label>Descrição</Label><input name="description" type="text" defaultValue={editing?.description ?? ""} placeholder="Ex: Medição 03 - Obra Centro" style={inp}/></div>
            <div><Label>Categoria</Label>
              <select name="category_id" defaultValue={editing?.category_id ?? ""} style={inp}>
                <option value="">— Sem categoria —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Vencimento *</Label><input name="due_date" type="date" required defaultValue={editing?.due_date ?? ""} style={inp}/></div>
            <div><Label>Parcela</Label><input name="installment" type="text" defaultValue={editing?.installment ?? ""} placeholder="1/3" style={inp}/></div>
            <div><Label>Valor *</Label><input name="amount" type="number" step="0.01" required defaultValue={editing?.amount ?? ""} placeholder="0,00" style={inp}/></div>
            <div><Label>Conta</Label>
              <select name="account_id" defaultValue={editing?.account_id ?? ""} style={inp}>
                <option value="">— Sem conta —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><Label>Status</Label>
              <select name="status" defaultValue={editing?.status ?? "a_receber"} style={inp}>
                <option value="a_receber">A Receber</option>
                <option value="em_atraso">Em Atraso</option>
                <option value="recebido">Recebido</option>
              </select>
            </div>
          </div>
          {error && <div style={{ marginTop:"12px",fontSize:"12px",color:"var(--danger)",fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?0.7:1,fontFamily:"inherit" }}>{saving ? "Salvando..." : "Salvar cobrança"}</button>
            <button type="button" onClick={closeForm} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"12px 14px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
        <div style={{ position:"relative",flex:1,maxWidth:"280px" }}>
          <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar cliente..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"7px",paddingBottom:"7px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
        </div>
        {[["todos","Todos"],["a_receber","A Receber"],["em_atraso","Em Atraso"],["recebido","Recebidos"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{ padding:"5px 12px",borderRadius:"6px",border:"1px solid",borderColor:filter===k?"var(--accent)":"var(--border)",background:filter===k?"var(--accent-soft)":"transparent",color:filter===k?"var(--accent)":"var(--text-secondary)",fontSize:"12px",fontWeight:filter===k?700:400,cursor:"pointer",fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Cliente","Descrição","Categoria","Vencimento","Atraso","Valor","Status","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:h==="Valor"?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:"40px",textAlign:"center",color:"var(--text-muted)",fontSize:"13px" }}>Nenhuma cobrança encontrada</td></tr>
            ) : filtered.map((item,i)=>{
              const sc = stCfg[item.status] ?? { label:item.status, c:"var(--text-muted)", bg:"var(--bg-tertiary)" }
              const dias = item.status === "recebido" ? 0 : daysOverdue(item.due_date)
              return (
                <tr key={item.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"11px 14px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{item.customer?.name ?? "—"}</td>
                  <td style={{ padding:"11px 14px",fontSize:"12px",color:"var(--text-secondary)",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.description ?? "—"}</td>
                  <td style={{ padding:"11px 14px" }}>
                    {item.category?.name
                      ? <span style={{ fontSize:"11px",background:"var(--bg-tertiary)",color:"var(--text-secondary)",padding:"2px 8px",borderRadius:"4px",border:"1px solid var(--border)" }}>{item.category.name}</span>
                      : <span style={{ color:"var(--text-muted)",fontSize:"12px" }}>—</span>}
                  </td>
                  <td style={{ padding:"11px 14px",fontSize:"12.5px",fontWeight:600,color:dias>0?"var(--danger)":"var(--text-secondary)" }}>{formatDate(item.due_date)}</td>
                  <td style={{ padding:"11px 14px" }}>
                    {dias>0 ? <span style={{ fontSize:"12px",fontWeight:800,color:"var(--danger)",background:"var(--danger-soft)",padding:"3px 9px",borderRadius:"20px" }}>{dias}d</span> : <span style={{ color:"var(--text-muted)",fontSize:"12px" }}>—</span>}
                  </td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"13px",fontWeight:800,color:"var(--text-primary)" }}>{R(item.amount)}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:sc.c,background:sc.bg,padding:"3px 9px",borderRadius:"20px" }}>{sc.label}</span>
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex",gap:"5px" }}>
                      {item.status!=="recebido" && (
                        <button onClick={()=>handleReceive(item)} title="Marcar como recebido" style={{ display:"flex",alignItems:"center",gap:"4px",padding:"5px 10px",borderRadius:"6px",border:"none",background:"var(--success)",fontSize:"11px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>
                          <Check size={11}/> Marcar como recebido
                        </button>
                      )}
                      <button title="Editar" onClick={()=>openEdit(item)} style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
                        <Edit2 size={12}/>
                      </button>
                      <button title="Excluir" onClick={()=>handleDelete(item)} style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--danger)" }}>
                        <Trash2 size={12}/>
                      </button>
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
