"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDialog } from "@/lib/dialog"
import { Check, Search, ChevronLeft } from "lucide-react"
import Link from "next/link"
import type { Receivable } from "@/lib/db/receivables"
import { formatCurrency, formatDate } from "@/lib/utils"
import { markReceived } from "@/app/(app)/receivables/actions"

const R = formatCurrency

function daysOverdue(due: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due)
  return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000))
}

function DiasTag({ dias }: { dias: number }) {
  const c = dias > 30 ? "var(--danger)" : dias > 15 ? "var(--warning)" : "var(--accent)"
  const bg = dias > 30 ? "var(--danger-soft)" : dias > 15 ? "var(--warning-soft)" : "var(--accent-soft)"
  return (
    <span style={{ fontSize:"11px",fontWeight:800,color:c,background:bg,padding:"3px 9px",borderRadius:"20px" }}>
      {dias}d em atraso
    </span>
  )
}

export default function DelinquentClient({ items }: { items: Receivable[] }) {
  const router = useRouter()
  const { confirm, alert } = useDialog()
  const [q, setQ] = useState("")
  const [sortBy, setSortBy] = useState<"dias" | "valor">("dias")
  const [busy, setBusy] = useState<string | null>(null)

  async function handleReceived(id: string) {
    setBusy(id)
    const res = await markReceived(id)
    setBusy(null)
    if (res.error === null) router.refresh()
    else void alert(res.error, { title: "Erro" })
  }

  let data = items.map(i => ({ ...i, dias: daysOverdue(i.due_date) }))
  if (q) data = data.filter(i =>
    (i.customer?.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (i.description ?? "").toLowerCase().includes(q.toLowerCase())
  )
  data.sort((a, b) => sortBy === "dias" ? b.dias - a.dias : b.amount - a.amount)

  const total = data.reduce((s, i) => s + i.amount, 0)
  const avgDias = data.length ? Math.round(data.reduce((s, i) => s + i.dias, 0) / data.length) : 0

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/receivables" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Inadimplentes</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Contas em atraso com acompanhamento de cobrança</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"16px" }}>
        {[
          { l:"Total em Atraso",    v:R(total),            c:"var(--danger)" },
          { l:"Clientes Afetados",  v:`${data.length}`,    c:"var(--warning)" },
          { l:"Prazo Médio Atraso", v:`${avgDias} dias`,   c:"var(--warning)" },
        ].map(k=>(
          <div key={k.l} style={{ background:"var(--bg-secondary)",border:`1px solid ${k.c}28`,borderLeft:`3px solid ${k.c}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"12px 14px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap" }}>
        <div style={{ position:"relative",flex:1,minWidth:"200px",maxWidth:"300px" }}>
          <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar cliente..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"7px",paddingBottom:"7px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"6px",marginLeft:"auto" }}>
          <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>Ordenar:</span>
          <button onClick={()=>setSortBy("dias")} style={{ padding:"5px 10px",borderRadius:"6px",border:"1px solid",borderColor:sortBy==="dias"?"var(--accent)":"var(--border)",background:sortBy==="dias"?"var(--accent-soft)":"transparent",color:sortBy==="dias"?"var(--accent)":"var(--text-secondary)",fontSize:"11px",fontWeight:sortBy==="dias"?700:400,cursor:"pointer",fontFamily:"inherit" }}>Mais antigos</button>
          <button onClick={()=>setSortBy("valor")} style={{ padding:"5px 10px",borderRadius:"6px",border:"1px solid",borderColor:sortBy==="valor"?"var(--accent)":"var(--border)",background:sortBy==="valor"?"var(--accent-soft)":"transparent",color:sortBy==="valor"?"var(--accent)":"var(--text-secondary)",fontSize:"11px",fontWeight:sortBy==="valor"?700:400,cursor:"pointer",fontFamily:"inherit" }}>Maior valor</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Cliente","Descrição","Vencimento","Atraso","Valor","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:h==="Valor"?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:"40px",textAlign:"center",color:"var(--text-muted)",fontSize:"13px" }}>Nenhum inadimplente encontrado</td></tr>
            ) : data.map((item,i) => (
              <tr key={item.id} style={{ borderBottom:i<data.length-1?"1px solid var(--border)":"none" }}
                onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                <td style={{ padding:"12px 14px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{item.customer?.name ?? "—"}</td>
                <td style={{ padding:"12px 14px",fontSize:"12px",color:"var(--text-secondary)",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.description ?? "—"}</td>
                <td style={{ padding:"12px 14px",fontSize:"12.5px",fontWeight:600,color:"var(--danger)" }}>{formatDate(item.due_date)}</td>
                <td style={{ padding:"12px 14px" }}><DiasTag dias={item.dias}/></td>
                <td style={{ padding:"12px 14px",textAlign:"right",fontSize:"14px",fontWeight:800,color:"var(--danger)" }}>{R(item.amount)}</td>
                <td style={{ padding:"12px 14px" }}>
                  <button onClick={()=>handleReceived(item.id)} disabled={busy===item.id} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 12px",background:"var(--success-soft)",border:"1px solid rgba(16,185,129,0.35)",borderRadius:"7px",fontSize:"12px",color:"var(--success)",fontWeight:700,cursor:busy===item.id?"default":"pointer",opacity:busy===item.id?0.6:1,fontFamily:"inherit",whiteSpace:"nowrap" }}>
                    <Check size={13}/> Marcar como recebido
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"12px",padding:"10px 14px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)" }}>
          <span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>{data.length} registro{data.length>1?"s":""} encontrado{data.length>1?"s":""}</span>
          <div style={{ display:"flex",gap:"8px" }}>
            <span style={{ fontSize:"12px",color:"var(--text-muted)" }}>Total em atraso:</span>
            <span style={{ fontSize:"13px",fontWeight:800,color:"var(--danger)" }}>{R(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
