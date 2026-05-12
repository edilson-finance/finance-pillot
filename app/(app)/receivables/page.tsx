"use client"

import { useState } from "react"
import { Plus, Search, Check, Edit2, MessageSquare, X, AlertCircle, Clock } from "lucide-react"
import Link from "next/link"
import { receivables } from "@/lib/mock-data"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useDateRange } from "@/lib/date-context"

const R = formatCurrency

function getDueStatus(vencimento: string, status: string, dias: number) {
  if (status==="recebido") return { dateColor:"var(--text-muted)", badge:{bg:"var(--success-soft)",c:"var(--success)"}, label:"Recebido" }
  if (status==="em_atraso"||dias>0) return { dateColor:"var(--danger)", badge:{bg:"var(--danger-soft)",c:"var(--danger)"}, label:`${dias}d em atraso` }
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(vencimento)
  const d = Math.round((due.getTime()-today.getTime())/86400000)
  if (d<=3) return  { dateColor:"#F97316",        badge:{bg:"rgba(249,115,22,0.15)",c:"#F97316"},  label:`${d}d` }
  if (d<=7) return  { dateColor:"var(--warning)",  badge:{bg:"var(--warning-soft)",c:"var(--warning)"}, label:`${d}d` }
  return            { dateColor:"var(--success)",  badge:{bg:"var(--success-soft)",c:"var(--success)"}, label:`${d}d` }
}

/* ── Modal de recebimento rápido ── */
function ReceiveModal({ item, onClose }: { item: typeof receivables[0]; onClose: ()=>void }) {
  const [method, setMethod] = useState("PIX")
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [juros, setJuros] = useState("0")
  const [desconto, setDesconto] = useState("0")
  const [partial, setPartial] = useState(false)
  const [partialVal, setPartialVal] = useState("")
  const valorFinal = item.valor + parseFloat(juros||"0") - parseFloat(desconto||"0")
  const methods = ["PIX","TED/DOC","Boleto","Dinheiro","Cartão Débito","Cartão Crédito","Depósito","Cheque"]
  const inp: React.CSSProperties = { width:"100%",padding:"9px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }} onClick={onClose}>
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"24px",width:"100%",maxWidth:"500px",boxShadow:"var(--shadow-lg)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px" }}>
          <div>
            <div style={{ fontSize:"14px",fontWeight:800,color:"var(--text-primary)" }}>Registrar Recebimento</div>
            <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{item.cliente} · {item.descricao}</div>
          </div>
          <button onClick={onClose} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={18}/></button>
        </div>

        <div style={{ padding:"12px 14px",background:"var(--bg-tertiary)",borderRadius:"8px",marginBottom:"16px",display:"flex",justifyContent:"space-between" }}>
          <span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>Valor original</span>
          <span style={{ fontSize:"16px",fontWeight:800,color:"var(--success)" }}>{R(item.valor)}</span>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px" }}>
          <div><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Data do Recebimento *</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></div>
          <div><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Conta de Destino *</label><select style={inp}><option>Bradesco Conta Corrente</option><option>Itaú Conta Corrente</option><option>Nubank PJ</option></select></div>
          <div><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Juros Recebidos (R$)</label><input type="number" value={juros} onChange={e=>setJuros(e.target.value)} placeholder="0,00" style={inp}/></div>
          <div><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Desconto Concedido (R$)</label><input type="number" value={desconto} onChange={e=>setDesconto(e.target.value)} placeholder="0,00" style={inp}/></div>
        </div>

        {/* Recebimento parcial */}
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"8px" }}>
            <input type="checkbox" checked={partial} onChange={e=>setPartial(e.target.checked)} style={{ width:"14px",height:"14px" }}/> Recebimento parcial
          </label>
          {partial && (
            <div>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Valor recebido parcialmente (R$)</label>
              <input type="number" value={partialVal} onChange={e=>setPartialVal(e.target.value)} placeholder="0,00" style={inp}/>
            </div>
          )}
        </div>

        {/* Forma de recebimento */}
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"7px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Forma de Recebimento *</label>
          <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
            {methods.map(m=>(
              <button key={m} onClick={()=>setMethod(m)} style={{ padding:"5px 12px",borderRadius:"20px",border:"1px solid",borderColor:method===m?"var(--success)":"var(--border)",background:method===m?"var(--success-soft)":"transparent",color:method===m?"var(--success)":"var(--text-secondary)",fontSize:"11.5px",fontWeight:method===m?700:400,cursor:"pointer",fontFamily:"inherit" }}>{m}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:"16px" }}>
          <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Nº Comprovante / EndToEnd</label>
          <input type="text" placeholder="Código de autenticação" style={inp}/>
        </div>

        <div style={{ padding:"12px 14px",background:"var(--success-soft)",borderRadius:"8px",marginBottom:"16px",display:"flex",justifyContent:"space-between" }}>
          <span style={{ fontSize:"12px",fontWeight:600,color:"var(--success)" }}>Total a receber</span>
          <span style={{ fontSize:"18px",fontWeight:900,color:"var(--success)" }}>{R(partial && partialVal ? parseFloat(partialVal) : valorFinal)}</span>
        </div>

        <div style={{ display:"flex",gap:"8px" }}>
          <button onClick={onClose} style={{ flex:1,padding:"11px",background:"var(--success)",border:"none",borderRadius:"8px",fontSize:"13px",color:"#fff",fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px" }}>
            <Check size={14}/> Confirmar Recebimento
          </button>
          <button onClick={onClose} style={{ padding:"11px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"8px",fontSize:"13px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export default function ReceivablesPage() {
  const [filter, setFilter] = useState("todos")
  const [q, setQ] = useState("")
  const [receivingItem, setReceivingItem] = useState<typeof receivables[0] | null>(null)
  const { range } = useDateRange()

  const filtered = receivables
    .filter(r => filter==="todos" || r.status===filter)
    .filter(r => !q || r.cliente.toLowerCase().includes(q.toLowerCase()))

  const totals = {
    aReceber: receivables.filter(r=>r.status==="a_receber").reduce((s,r)=>s+r.valor,0),
    atraso:   receivables.filter(r=>r.status==="em_atraso").reduce((s,r)=>s+r.valor,0),
    recebido: receivables.filter(r=>r.status==="recebido").reduce((s,r)=>s+r.valor,0),
  }

  return (
    <div style={{ padding:"22px" }}>
      {receivingItem && <ReceiveModal item={receivingItem} onClose={()=>setReceivingItem(null)}/>}

      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px" }}>
        <div>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Contas a Receber</h1>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{range.label}</div>
        </div>
        <Link href="/transactions" style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 14px",background:"var(--accent)",border:"none",borderRadius:"7px",fontSize:"12px",color:"#fff",fontWeight:700,textDecoration:"none" }}>
          <Plus size={13}/> Nova cobrança
        </Link>
      </div>

      {/* Alert inadimplência */}
      {totals.atraso > 0 && (
        <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 16px",background:"var(--danger-soft)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:"var(--radius)",marginBottom:"14px" }}>
          <AlertCircle size={15} style={{ color:"var(--danger)",flexShrink:0 }}/>
          <span style={{ fontSize:"12px",color:"var(--danger)" }}>
            <strong>{R(totals.atraso)} em atraso</strong> — {receivables.filter(r=>r.status==="em_atraso").length} clientes com pagamentos vencidos
          </span>
          <Link href="/delinquent" style={{ marginLeft:"auto",fontSize:"11px",color:"var(--danger)",fontWeight:700,textDecoration:"none",flexShrink:0 }}>Ver inadimplentes →</Link>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px" }}>
        {[
          { label:"A Receber",        value:R(totals.aReceber), color:"var(--accent)" },
          { label:"Em Atraso",         value:R(totals.atraso),   color:"var(--danger)" },
          { label:"Taxa Inadimplência",value:"19,9%",            color:"var(--danger)" },
          { label:"Recebido",          value:R(totals.recebido), color:"var(--success)" },
        ].map(c=>(
          <div key={c.label} style={{ background:"var(--bg-secondary)",border:`1px solid ${c.color}28`,borderLeft:`3px solid ${c.color}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>{c.label}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

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
            {filtered.map((item,i)=>{
              const ds = getDueStatus(item.vencimento, item.status, item.dias_atraso)
              return (
                <tr key={item.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"11px 14px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{item.cliente}</td>
                  <td style={{ padding:"11px 14px",fontSize:"12px",color:"var(--text-secondary)",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.descricao}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",background:"var(--bg-tertiary)",color:"var(--text-secondary)",padding:"2px 8px",borderRadius:"4px",border:"1px solid var(--border)" }}>{item.categoria}</span>
                  </td>
                  <td style={{ padding:"11px 14px",fontSize:"12.5px",fontWeight:600,color:ds.dateColor }}>{formatDate(item.vencimento)}</td>
                  <td style={{ padding:"11px 14px" }}>
                    {item.dias_atraso>0 ? <span style={{ fontSize:"12px",fontWeight:800,color:"var(--danger)",background:"var(--danger-soft)",padding:"3px 9px",borderRadius:"20px" }}>{item.dias_atraso}d</span> : <span style={{ color:"var(--text-muted)",fontSize:"12px" }}>—</span>}
                  </td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"13px",fontWeight:800,color:"var(--text-primary)" }}>{R(item.valor)}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:ds.badge.c,background:ds.badge.bg,padding:"3px 9px",borderRadius:"20px" }}>{ds.label}</span>
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex",gap:"5px" }}>
                      {item.status!=="recebido" && (
                        <button onClick={()=>setReceivingItem(item)} style={{ display:"flex",alignItems:"center",gap:"4px",padding:"5px 10px",borderRadius:"6px",border:"none",background:"var(--success)",fontSize:"11px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>
                          <Check size={11}/> Receber
                        </button>
                      )}
                      {item.status==="em_atraso" && (
                        <button title="Cobrar" style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--warning-soft)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--warning)" }}>
                          <MessageSquare size={12}/>
                        </button>
                      )}
                      <button title="Editar" style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
                        <Edit2 size={12}/>
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
