"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Download, Check, Edit2, X, AlertCircle, Clock, CheckCircle2, Trash2 } from "lucide-react"
import type { Payable } from "@/lib/db/payables"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useDateRange } from "@/lib/date-context"
import { createPayable, updatePayable, deletePayable, markPaid } from "./actions"
import { FormDespesa, type Options } from "../transactions/transactions-client"

const R = formatCurrency

type Opt = { id: string; name: string }
type Cat = Opt & { kind: string }
type Acc = Opt & { balance: number }
type Prod = Opt & { price: number; unit: string | null }

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

function Label({ children }: { children:string }) {
  return <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

/* ── Cor por prazo de vencimento ── */
function getDueStatus(vencimento: string, status: string): { label: string; rowBg: string; dateColor: string; icon: React.ElementType | null; badge: { bg: string; c: string } } {
  if (status === "pago")      return { label:"Pago",     rowBg:"transparent", dateColor:"var(--text-muted)",    icon:null,         badge:{bg:"var(--success-soft)",c:"var(--success)"} }
  if (status === "em_atraso") return { label:"Em Atraso",rowBg:"rgba(244,63,94,0.04)", dateColor:"var(--danger)", icon:AlertCircle, badge:{bg:"var(--danger-soft)", c:"var(--danger)"} }

  const today = new Date(); today.setHours(0,0,0,0)
  const due   = new Date(vencimento)
  const days  = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (days < 0)   return { label:"Em Atraso",    rowBg:"rgba(244,63,94,0.04)",   dateColor:"var(--danger)",  icon:AlertCircle, badge:{bg:"var(--danger-soft)",  c:"var(--danger)"} }
  if (days === 0) return { label:"Vence Hoje",   rowBg:"rgba(249,115,22,0.05)",  dateColor:"#F97316",        icon:Clock,       badge:{bg:"rgba(249,115,22,0.15)",c:"#F97316"} }
  if (days <= 3)  return { label:`${days}d`,     rowBg:"rgba(245,158,11,0.04)",  dateColor:"var(--warning)", icon:Clock,       badge:{bg:"var(--warning-soft)", c:"var(--warning)"} }
  if (days <= 7)  return { label:`${days}d`,     rowBg:"transparent",            dateColor:"var(--warning)", icon:null,        badge:{bg:"var(--warning-soft)", c:"var(--warning)"} }
  return                  { label:`${days}d`,    rowBg:"transparent",            dateColor:"var(--success)", icon:null,        badge:{bg:"var(--success-soft)", c:"var(--success)"} }
}

export default function PayablesClient({ payables, suppliers, categories, accounts, costCenters, products }: {
  payables: Payable[]
  suppliers: Opt[]
  categories: Cat[]
  accounts: Acc[]
  costCenters: Opt[]
  products: Prod[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState("todos")
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newKey, setNewKey] = useState(0)
  const [editing, setEditing] = useState<Payable | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { range } = useDateRange()

  const o: Options = { categories, accounts, costCenters, customers: [], suppliers, products }

  function openNew() { setShowNew(true); setNewKey((k) => k + 1) }
  function openEdit(p: Payable) { setEditing(p); setError(null); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null); setError(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing ? await updatePayable(editing.id, fd) : await createPayable(fd)
    setSaving(false)
    if (res.error === null) {
      closeForm()
      router.refresh()
    } else {
      setError(res.error)
    }
  }

  async function handleDelete(p: Payable) {
    if (!window.confirm(`Excluir a conta "${p.description ?? p.id}"?`)) return
    const res = await deletePayable(p.id)
    if (res.error === null) router.refresh()
    else window.alert(res.error)
  }

  async function handleMarkPaid(p: Payable) {
    const res = await markPaid(p.id)
    if (res.error === null) router.refresh()
    else window.alert(res.error)
  }

  const filtered = payables
    .filter(p => filter === "todos" || p.status === filter)
    .filter(p => !q || (p.supplier?.name ?? "").toLowerCase().includes(q.toLowerCase()) || (p.description ?? "").toLowerCase().includes(q.toLowerCase()))

  const totals = {
    aPagar:   payables.filter(p=>p.status!=="pago").reduce((s,p)=>s+p.amount,0),
    vencidos: payables.filter(p=>p.status==="em_atraso").reduce((s,p)=>s+p.amount,0),
    pagos:    payables.filter(p=>p.status==="pago").reduce((s,p)=>s+p.amount,0),
  }

  const vence7 = payables.filter(p=>{
    if (p.status==="pago") return false
    const days = Math.round((new Date(p.due_date).getTime() - new Date().setHours(0,0,0,0)) / 86400000)
    return days >= 0 && days <= 7
  }).reduce((s,p)=>s+p.amount,0)

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px" }}>
        <div>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Contas a Pagar</h1>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{range.label}</div>
        </div>
        <div style={{ display:"flex",gap:"8px" }}>
          <button style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 13px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
            <Download size={13}/> Exportar
          </button>
          <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 14px",background:"var(--accent)",border:"none",borderRadius:"7px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
            <Plus size={13}/> Nova conta
          </button>
        </div>
      </div>

      {/* Legenda de cores */}
      <div style={{ display:"flex",gap:"14px",marginBottom:"14px",padding:"10px 14px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"8px",flexWrap:"wrap" }}>
        <span style={{ fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px" }}>Vencimento:</span>
        {[
          { c:"var(--success)", l:"> 7 dias" },
          { c:"var(--warning)", l:"4–7 dias" },
          { c:"#F97316",        l:"1–3 dias" },
          { c:"var(--danger)",  l:"Vencido / Hoje" },
        ].map(s=>(
          <div key={s.l} style={{ display:"flex",alignItems:"center",gap:"5px" }}>
            <div style={{ width:"10px",height:"10px",borderRadius:"2px",background:s.c }}/>
            <span style={{ fontSize:"11px",color:"var(--text-secondary)" }}>{s.l}</span>
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px" }}>
        {[
          { label:"A Pagar",         value:R(totals.aPagar),  color:"var(--accent)" },
          { label:"Vencidos",        value:R(totals.vencidos),color:"var(--danger)" },
          { label:"Vencem em 7d",    value:R(vence7),         color:"var(--warning)" },
          { label:"Pagos no Período",value:R(totals.pagos),   color:"var(--success)" },
        ].map(c=>(
          <div key={c.label} style={{ background:"var(--bg-secondary)",border:`1px solid ${c.color}28`,borderLeft:`3px solid ${c.color}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>{c.label}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Formulário completo (igual a Lançamentos) — apenas para nova conta */}
      {showNew && (
        <div style={{ marginBottom:"16px" }}>
          <FormDespesa
            key={newKey}
            o={o}
            onSaved={() => router.refresh()}
            onNew={() => setNewKey((k) => k + 1)}
            onCancel={() => setShowNew(false)}
          />
        </div>
      )}

      {/* Form simples — apenas para edição de conta existente */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{editing ? "Editar Conta" : "Nova Conta"}</span>
            <button type="button" onClick={closeForm} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div><Label>Fornecedor</Label>
              <select name="supplier_id" defaultValue={editing?.supplier_id ?? ""} style={inp}>
                <option value="">—</option>
                {suppliers.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"span 2" }}><Label>Descrição</Label><input name="description" type="text" defaultValue={editing?.description ?? ""} placeholder="Pagamento de material" style={inp}/></div>
            <div><Label>Categoria</Label>
              <select name="category_id" defaultValue={editing?.category_id ?? ""} style={inp}>
                <option value="">—</option>
                {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Vencimento *</Label><input name="due_date" type="date" required defaultValue={editing?.due_date ?? ""} style={inp}/></div>
            <div><Label>Parcela</Label><input name="installment" type="text" defaultValue={editing?.installment ?? ""} placeholder="1/3" style={inp}/></div>
            <div><Label>Valor *</Label><input name="amount" type="number" step="0.01" min="0" required defaultValue={editing?.amount ?? ""} placeholder="0,00" style={inp}/></div>
            <div><Label>Conta</Label>
              <select name="account_id" defaultValue={editing?.account_id ?? ""} style={inp}>
                <option value="">—</option>
                {accounts.map(a=> <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><Label>Status</Label>
              <select name="status" defaultValue={editing?.status ?? "a_pagar"} style={inp}>
                <option value="a_pagar">A Pagar</option>
                <option value="em_atraso">Em Atraso</option>
                <option value="pago">Pago</option>
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

      {/* Filters */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"12px 14px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
        <div style={{ position:"relative",flex:1,maxWidth:"280px" }}>
          <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar fornecedor..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"7px",paddingBottom:"7px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
        </div>
        <div style={{ display:"flex",gap:"4px",flexWrap:"wrap" }}>
          {[["todos","Todos"],["a_pagar","A Pagar"],["em_atraso","Vencidos"],["pago","Pagos"]].map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)} style={{ padding:"5px 12px",borderRadius:"6px",border:"1px solid",borderColor:filter===k?"var(--accent)":"var(--border)",background:filter===k?"var(--accent-soft)":"transparent",color:filter===k?"var(--accent)":"var(--text-secondary)",fontSize:"12px",fontWeight:filter===k?700:400,cursor:"pointer",fontFamily:"inherit" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Fornecedor","Descrição","Categoria","Vencimento","Parcela","Valor","Status","Conta","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:h==="Valor"?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item,i)=>{
              const ds = getDueStatus(item.due_date, item.status)
              const Icon = ds.icon
              return (
                <tr key={item.id}
                  style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none", background:ds.rowBg, transition:"background 0.1s" }}
                  onMouseEnter={e=>(e.currentTarget.style.opacity="0.9")}
                  onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                  <td style={{ padding:"11px 14px",fontSize:"13px",color:"var(--text-primary)",fontWeight:600 }}>{item.supplier?.name ?? "—"}</td>
                  <td style={{ padding:"11px 14px",fontSize:"12px",color:"var(--text-secondary)",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.description ?? "—"}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",background:"var(--bg-tertiary)",color:"var(--text-secondary)",padding:"2px 8px",borderRadius:"4px",border:"1px solid var(--border)" }}>{item.category?.name ?? "—"}</span>
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"5px" }}>
                      {Icon && <Icon size={13} style={{ color:ds.dateColor,flexShrink:0 }}/>}
                      <span style={{ fontSize:"12.5px",fontWeight:600,color:ds.dateColor }}>{formatDate(item.due_date)}</span>
                    </div>
                    {item.status!=="pago" && (
                      <span style={{ fontSize:"10px",color:ds.badge.c,background:ds.badge.bg,padding:"1px 6px",borderRadius:"10px",marginTop:"2px",display:"inline-block" }}>{ds.label}</span>
                    )}
                  </td>
                  <td style={{ padding:"11px 14px",fontSize:"12px",color:"var(--text-muted)" }}>{item.installment || "—"}</td>
                  <td style={{ padding:"11px 14px",textAlign:"right" }}>
                    <div style={{ fontSize:"13px",fontWeight:800,color:"var(--text-primary)" }}>{R(item.amount)}</div>
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:ds.badge.c,background:ds.badge.bg,padding:"3px 9px",borderRadius:"20px" }}>
                      {item.status==="a_pagar"?"A Pagar":item.status==="em_atraso"?"Em Atraso":item.status==="pago"?"Pago":"—"}
                    </span>
                    {item.status==="pago" && item.paid_at && (
                      <div style={{ fontSize:"9px",color:"var(--text-muted)",marginTop:"2px" }}>
                        {new Date(item.paid_at).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:"11px 14px",fontSize:"12px",color:"var(--text-secondary)" }}>—</td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex",gap:"5px" }}>
                      {item.status!=="pago" && (
                        <button
                          onClick={()=>handleMarkPaid(item)}
                          title="Marcar como pago"
                          style={{ display:"flex",alignItems:"center",gap:"4px",padding:"5px 10px",borderRadius:"6px",border:"none",background:"var(--success)",fontSize:"11px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>
                          <Check size={11}/> Marcar como pago
                        </button>
                      )}
                      {item.status==="pago" && (
                        <div style={{ display:"flex",alignItems:"center",gap:"4px",padding:"5px 10px",borderRadius:"6px",background:"var(--success-soft)",fontSize:"11px",color:"var(--success)",fontWeight:700 }}>
                          <CheckCircle2 size={11}/> Pago
                        </div>
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
