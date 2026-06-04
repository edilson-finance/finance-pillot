"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, ChevronLeft, X, Edit2, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Transaction } from "@/lib/db/transactions"
import { createTransaction, updateTransaction, deleteTransaction } from "./actions"

type Opt = { id: string; name: string }

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

function Label({ children }: { children:string }) {
  return <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

const brl = (n:number) => n.toLocaleString("pt-BR",{ style:"currency",currency:"BRL" })

function fmtDate(d:string) {
  const [y,m,day] = d.split("-")
  return day && m && y ? `${day}/${m}/${y}` : d
}

export default function TransactionsClient({
  transactions, categories, accounts, costCenters, customers, suppliers,
}: {
  transactions: Transaction[]
  categories: Opt[]; accounts: Opt[]; costCenters: Opt[]; customers: Opt[]; suppliers: Opt[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<"all"|"entrada"|"saida">("all")

  const filtered = transactions.filter(t => filter === "all" ? true : t.type === filter)

  const totalEntradas = transactions.filter(t=>t.type==="entrada").reduce((s,t)=>s+Number(t.amount),0)
  const totalSaidas   = transactions.filter(t=>t.type==="saida").reduce((s,t)=>s+Number(t.amount),0)
  const saldo = totalEntradas - totalSaidas

  function openNew() { setEditing(null); setError(null); setShowForm(true) }
  function openEdit(t: Transaction) { setEditing(t); setError(null); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null); setError(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing ? await updateTransaction(editing.id, fd) : await createTransaction(fd)
    setSaving(false)
    if (res.error === null) { closeForm(); router.refresh() }
    else setError(res.error)
  }

  async function handleDelete(t: Transaction) {
    if (!window.confirm(`Excluir o lançamento "${t.description ?? t.id}"?`)) return
    const res = await deleteTransaction(t.id)
    if (res.error === null) router.refresh()
    else window.alert(res.error)
  }

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Lançamentos</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Registro financeiro com rastreabilidade completa</p>
        </div>
        <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Novo lançamento
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"16px" }}>
        {[
          { l:"Total Entradas", v:brl(totalEntradas), c:"var(--success)" },
          { l:"Total Saídas",   v:brl(totalSaidas),   c:"var(--danger)" },
          { l:"Saldo",          v:brl(saldo),         c:saldo>=0?"var(--success)":"var(--danger)" },
        ].map(k=>(
          <div key={k.l} style={{ background:"var(--bg-secondary)",border:`1px solid ${k.c}28`,borderLeft:`3px solid ${k.c}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{editing ? "Editar Lançamento" : "Novo Lançamento"}</span>
            <button type="button" onClick={closeForm} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div><Label>Tipo *</Label>
              <select name="type" id="type" required defaultValue={editing?.type ?? "entrada"} style={inp}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div><Label>Data *</Label><input name="date" id="date" type="date" required defaultValue={editing?.date ?? ""} style={inp}/></div>
            <div><Label>Valor *</Label><input name="amount" id="amount" type="number" step="0.01" min="0" required defaultValue={editing?.amount ?? ""} placeholder="0,00" style={inp}/></div>
            <div style={{ gridColumn:"span 3" }}><Label>Descrição</Label><input name="description" id="description" type="text" defaultValue={editing?.description ?? ""} placeholder="Ex: Medição 12 — Obra 07" style={inp}/></div>
            <div><Label>Categoria</Label>
              <select name="category_id" id="category_id" defaultValue={editing?.category_id ?? ""} style={inp}>
                <option value="">—</option>
                {categories.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div><Label>Conta</Label>
              <select name="account_id" id="account_id" defaultValue={editing?.account_id ?? ""} style={inp}>
                <option value="">—</option>
                {accounts.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div><Label>Centro de Custo</Label>
              <select name="cost_center_id" id="cost_center_id" defaultValue={editing?.cost_center_id ?? ""} style={inp}>
                <option value="">—</option>
                {costCenters.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div><Label>Cliente</Label>
              <select name="customer_id" id="customer_id" defaultValue={editing?.customer_id ?? ""} style={inp}>
                <option value="">—</option>
                {customers.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div><Label>Fornecedor</Label>
              <select name="supplier_id" id="supplier_id" defaultValue={editing?.supplier_id ?? ""} style={inp}>
                <option value="">—</option>
                {suppliers.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ marginTop:"12px",fontSize:"12px",color:"var(--danger)",fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?0.7:1,fontFamily:"inherit" }}>{saving ? "Salvando..." : "Salvar lançamento"}</button>
            <button type="button" onClick={closeForm} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div style={{ display:"flex",gap:"6px",marginBottom:"14px" }}>
        {([["all","Todos"],["entrada","Entradas"],["saida","Saídas"]] as const).map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{
            padding:"7px 16px",borderRadius:"20px",
            border:`1px solid ${filter===k?"var(--accent)":"var(--border)"}`,
            background: filter===k ? "var(--accent)18" : "var(--bg-secondary)",
            color: filter===k ? "var(--accent)" : "var(--text-secondary)",
            fontSize:"12px",fontWeight: filter===k?700:400,cursor:"pointer",fontFamily:"inherit",
          }}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Data","Descrição","Categoria","Conta","Valor","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:h==="Valor"?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t,i)=>(
              <tr key={t.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                <td style={{ padding:"12px 14px",fontSize:"12px",color:"var(--text-secondary)",whiteSpace:"nowrap" }}>{fmtDate(t.date)}</td>
                <td style={{ padding:"12px 14px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{t.description ?? "—"}</td>
                <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>{t.category?.name ?? "—"}</td>
                <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>{t.account?.name ?? "—"}</td>
                <td style={{ padding:"12px 14px",textAlign:"right",fontSize:"12.5px",fontWeight:700,color:t.type==="entrada"?"var(--success)":"var(--danger)",whiteSpace:"nowrap" }}>
                  {t.type==="entrada"?"+":"–"} {brl(Number(t.amount))}
                </td>
                <td style={{ padding:"12px 14px" }}>
                  <div style={{ display:"flex",gap:"5px" }}>
                    <button type="button" title="Editar" onClick={()=>openEdit(t)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}><Edit2 size={12}/></button>
                    <button type="button" title="Excluir" onClick={()=>handleDelete(t)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--danger)" }}><Trash2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
