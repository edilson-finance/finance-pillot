"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Edit2, RefreshCw, ChevronLeft, X, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Account } from "@/lib/db/accounts"
import { createAccount, updateAccount, deleteAccount } from "./actions"

const R = (v:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:0}).format(v)

const kindLabels: Record<string,string> = { corrente:"Conta Corrente",poupanca:"Poupança",caixa:"Caixa Físico",investimento:"Investimento" }
const kindColors: Record<string,string> = { corrente:"var(--accent)",poupanca:"var(--info)",caixa:"var(--warning)",investimento:"var(--success)" }

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }
function Label({ children }: { children:string }) {
  return <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

export default function AccountsClient({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const total = accounts.reduce((s,a)=>s+(a.opening_balance ?? 0),0)
  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(q.toLowerCase()) ||
    (a.bank ?? "").toLowerCase().includes(q.toLowerCase())
  )

  function openNew() {
    setEditing(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(a: Account) {
    setEditing(a)
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
      ? await updateAccount(editing.id, fd)
      : await createAccount(fd)
    setSaving(false)
    if (res.error === null) {
      closeForm()
      router.refresh()
    } else {
      setError(res.error)
    }
  }

  async function handleDelete(a: Account) {
    if (!window.confirm(`Excluir a conta "${a.name}"?`)) return
    const res = await deleteAccount(a.id)
    if (res.error === null) router.refresh()
    else window.alert(res.error)
  }

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Contas Bancárias</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Contas correntes, digitais, poupança, cartões e caixas</p>
        </div>
        <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Nova conta
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"16px" }}>
        {[
          { l:"Total de Contas",      v:String(accounts.length), c:"var(--accent)" },
          { l:"Saldo Inicial Total",  v:R(total),                c:"var(--success)" },
          { l:"Saldo Consolidado",    v:"—",                     c:"var(--info)" },
          { l:"Movimentação Mês",     v:"—",                     c:"var(--warning)" },
        ].map(k=>(
          <div key={k.l} style={{ background:"var(--bg-secondary)",border:`1px solid ${k.c}28`,borderLeft:`3px solid ${k.c}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Saldo consolidado */}
      <div style={{ background:"linear-gradient(135deg,rgba(79,70,229,0.14),rgba(139,92,246,0.09))",border:"1px solid rgba(79,70,229,0.3)",borderRadius:"var(--radius)",padding:"20px 24px",marginBottom:"16px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:"6px" }}>Saldo Inicial Total — Todas as Contas</div>
          <div style={{ fontSize:"30px",fontWeight:900,color:"var(--text-primary)",letterSpacing:"-1px" }}>{R(total)}</div>
        </div>
        <button onClick={()=>router.refresh()} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"11px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
          <RefreshCw size={12}/> Atualizar saldos
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{editing ? "Editar Conta Bancária" : "Nova Conta Bancária"}</span>
            <button type="button" onClick={closeForm} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><Label>Nome interno *</Label><input name="name" id="name" type="text" required defaultValue={editing?.name ?? ""} placeholder='Ex: "Bradesco Principal", "Caixa Escritório"' style={inp}/></div>
            <div><Label>Tipo de Conta *</Label>
              <select name="kind" id="kind" defaultValue={editing?.kind ?? "corrente"} style={inp}>
                {Object.entries(kindLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><Label>Banco / Instituição</Label><input name="bank" id="bank" type="text" defaultValue={editing?.bank ?? ""} placeholder="Bradesco, Itaú, Nubank..." style={inp}/></div>
            <div><Label>Saldo inicial (R$)</Label><input name="opening_balance" id="opening_balance" type="number" step="0.01" defaultValue={editing?.opening_balance ?? 0} placeholder="0,00" style={inp}/></div>
          </div>
          {error && <div style={{ marginTop:"12px",fontSize:"12px",color:"var(--danger)",fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?0.7:1,fontFamily:"inherit" }}>{saving ? "Salvando..." : "Salvar conta"}</button>
            <button type="button" onClick={closeForm} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div style={{ position:"relative",marginBottom:"14px",maxWidth:"360px" }}>
        <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nome ou banco..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"8px",paddingBottom:"8px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
      </div>

      {/* Cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"12px" }}>
        {filtered.map(a=>{
          const kc = kindColors[a.kind] ?? "var(--text-muted)"
          const kl = kindLabels[a.kind] ?? a.kind
          return (
            <div key={a.id} style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"14px" }}>
                <div>
                  <div style={{ fontSize:"14px",fontWeight:800,color:"var(--text-primary)" }}>{a.name}</div>
                  <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{a.bank ?? "—"}</div>
                </div>
                <span style={{ fontSize:"10px",fontWeight:700,color:kc,background:`${kc}20`,padding:"3px 9px",borderRadius:"20px" }}>
                  {kl}
                </span>
              </div>
              <div style={{ fontSize:"24px",fontWeight:900,color:"var(--text-primary)",marginBottom:"8px" }}>{R(a.opening_balance ?? 0)}</div>
              <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                <div style={{ fontSize:"10px",color:"var(--text-muted)" }}>Saldo inicial</div>
                <div style={{ marginLeft:"auto",display:"flex",gap:"5px" }}>
                  <button type="button" title="Editar" onClick={()=>openEdit(a)} style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
                    <Edit2 size={12}/>
                  </button>
                  <button type="button" title="Excluir" onClick={()=>handleDelete(a)} style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--danger)" }}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
