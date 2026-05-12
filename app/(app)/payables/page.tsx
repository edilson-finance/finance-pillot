"use client"

import { useState, useRef } from "react"
import { Plus, Search, Download, Check, Edit2, X, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { payables as initialPayables } from "@/lib/mock-data"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useDateRange } from "@/lib/date-context"

const R = formatCurrency

type PayableItem = typeof initialPayables[0] & { paidAt?: string; paidMethod?: string; paidValue?: number }

/* ── Cor por prazo de vencimento ── */
function getDueStatus(vencimento: string, status: string): { label: string; rowBg: string; dateColor: string; icon: React.ElementType | null; badge: { bg: string; c: string } } {
  if (status === "pago")      return { label:"Pago",     rowBg:"transparent", dateColor:"var(--text-muted)",    icon:null,         badge:{bg:"var(--success-soft)",c:"var(--success)"} }
  if (status === "cancelado") return { label:"Cancelado",rowBg:"transparent", dateColor:"var(--text-muted)",    icon:null,         badge:{bg:"var(--bg-tertiary)",  c:"var(--text-muted)"} }

  const today = new Date(); today.setHours(0,0,0,0)
  const due   = new Date(vencimento)
  const days  = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (days < 0)   return { label:"Em Atraso",    rowBg:"rgba(244,63,94,0.04)",   dateColor:"var(--danger)",  icon:AlertCircle, badge:{bg:"var(--danger-soft)",  c:"var(--danger)"} }
  if (days === 0) return { label:"Vence Hoje",   rowBg:"rgba(249,115,22,0.05)",  dateColor:"#F97316",        icon:Clock,       badge:{bg:"rgba(249,115,22,0.15)",c:"#F97316"} }
  if (days <= 3)  return { label:`${days}d`,     rowBg:"rgba(245,158,11,0.04)",  dateColor:"var(--warning)", icon:Clock,       badge:{bg:"var(--warning-soft)", c:"var(--warning)"} }
  if (days <= 7)  return { label:`${days}d`,     rowBg:"transparent",            dateColor:"var(--warning)", icon:null,        badge:{bg:"var(--warning-soft)", c:"var(--warning)"} }
  return                  { label:`${days}d`,    rowBg:"transparent",            dateColor:"var(--success)", icon:null,        badge:{bg:"var(--success-soft)", c:"var(--success)"} }
}

/* ── Modal de pagamento rápido ── */
function PayModal({ item, onConfirm, onClose }: {
  item: PayableItem
  onConfirm: (id: string, method: string, date: string, value: number) => void
  onClose: () => void
}) {
  const [payMethod, setPayMethod] = useState("PIX")
  const [payDate,   setPayDate]   = useState(new Date().toISOString().slice(0,10))
  const [juros,     setJuros]     = useState("0")
  const [desconto,  setDesconto]  = useState("0")
  const [comprov,   setComprov]   = useState("")
  const [conta,     setConta]     = useState("Bradesco Conta Corrente")
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  const valorFinal = item.valor + parseFloat(juros||"0") - parseFloat(desconto||"0")

  const inp: React.CSSProperties = {
    width:"100%", padding:"9px 12px",
    background:"var(--bg-tertiary)", border:"1px solid var(--border)",
    borderRadius:"7px", fontSize:"12.5px", color:"var(--text-primary)",
    outline:"none", fontFamily:"inherit",
  }
  const methods = ["PIX","Boleto","TED/DOC","Débito","Dinheiro","Cheque","Cartão Crédito","Outro"]

  function handleConfirm() {
    setLoading(true)
    // Simula pequena latência para dar feedback visual
    setTimeout(() => {
      setLoading(false)
      setDone(true)
      onConfirm(item.id, payMethod, payDate, valorFinal)
      // Fecha o modal após 1.2s mostrando o sucesso
      setTimeout(() => onClose(), 1200)
    }, 600)
  }

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }} onClick={done || loading ? undefined : onClose}>
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"24px",width:"100%",maxWidth:"500px",boxShadow:"var(--shadow-lg)" }} onClick={e=>e.stopPropagation()}>

        {/* Success state */}
        {done ? (
          <div style={{ textAlign:"center",padding:"24px 0" }}>
            <div style={{ width:"60px",height:"60px",borderRadius:"50%",background:"var(--success-soft)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
              <CheckCircle2 size={28} style={{ color:"var(--success)" }}/>
            </div>
            <div style={{ fontSize:"16px",fontWeight:800,color:"var(--text-primary)",marginBottom:"6px" }}>Pagamento registrado!</div>
            <div style={{ fontSize:"12px",color:"var(--text-muted)" }}>
              {item.fornecedor} · {R(valorFinal)} · {payMethod} · {new Date(payDate).toLocaleDateString("pt-BR")}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px" }}>
              <div>
                <div style={{ fontSize:"15px",fontWeight:800,color:"var(--text-primary)" }}>Registrar Pagamento</div>
                <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{item.fornecedor} · {item.descricao}</div>
              </div>
              <button onClick={onClose} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)",padding:"4px" }}>
                <X size={18}/>
              </button>
            </div>

            {/* Valor original */}
            <div style={{ padding:"12px 14px",background:"var(--bg-tertiary)",borderRadius:"8px",marginBottom:"16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>Valor original</span>
              <span style={{ fontSize:"17px",fontWeight:800,color:"var(--text-primary)" }}>{R(item.valor)}</span>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px" }}>
              <div>
                <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Data do Pagamento *</label>
                <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Conta Debitada *</label>
                <select value={conta} onChange={e=>setConta(e.target.value)} style={inp}>
                  <option>Bradesco Conta Corrente</option>
                  <option>Itaú Conta Corrente</option>
                  <option>Nubank PJ</option>
                  <option>Caixa Físico</option>
                </select>
              </div>
              <div>
                <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Juros / Multa (R$)</label>
                <input type="number" value={juros} min="0" onChange={e=>setJuros(e.target.value)} placeholder="0,00" style={inp}/>
              </div>
              <div>
                <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Desconto Obtido (R$)</label>
                <input type="number" value={desconto} min="0" onChange={e=>setDesconto(e.target.value)} placeholder="0,00" style={inp}/>
              </div>
            </div>

            {/* Forma de pagamento */}
            <div style={{ marginBottom:"14px" }}>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"7px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Forma de Pagamento *</label>
              <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
                {methods.map(m=>(
                  <button key={m} onClick={()=>setPayMethod(m)} style={{
                    padding:"6px 14px", borderRadius:"20px", border:"1px solid",
                    borderColor: payMethod===m ? "var(--accent)" : "var(--border)",
                    background:  payMethod===m ? "var(--accent-soft)" : "transparent",
                    color:       payMethod===m ? "var(--accent)" : "var(--text-secondary)",
                    fontSize:"12px", fontWeight: payMethod===m ? 700 : 400,
                    cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s",
                  }}>{m}</button>
                ))}
              </div>
            </div>

            {/* Comprovante */}
            <div style={{ marginBottom:"16px" }}>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Nº Comprovante / EndToEnd (opcional)</label>
              <input type="text" value={comprov} onChange={e=>setComprov(e.target.value)} placeholder="Código de autenticação, EndToEnd PIX..." style={inp}/>
            </div>

            {/* Total final */}
            <div style={{
              padding:"12px 16px",
              background: valorFinal>item.valor ? "var(--danger-soft)" : valorFinal<item.valor ? "var(--success-soft)" : "var(--bg-tertiary)",
              borderRadius:"8px", marginBottom:"18px",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              border:`1px solid ${valorFinal>item.valor?"rgba(244,63,94,0.2)":valorFinal<item.valor?"rgba(16,185,129,0.2)":"var(--border)"}`,
            }}>
              <div>
                <div style={{ fontSize:"11px",color:"var(--text-secondary)",marginBottom:"1px" }}>Total a pagar</div>
                {(parseFloat(juros)||parseFloat(desconto)) ? (
                  <div style={{ fontSize:"10px",color:"var(--text-muted)" }}>
                    {R(item.valor)} {parseFloat(juros)>0?`+ ${R(parseFloat(juros))} juros`:""} {parseFloat(desconto)>0?`– ${R(parseFloat(desconto))} desconto`:""}
                  </div>
                ) : null}
              </div>
              <span style={{
                fontSize:"20px", fontWeight:900,
                color: valorFinal>item.valor ? "var(--danger)" : valorFinal<item.valor ? "var(--success)" : "var(--text-primary)",
              }}>{R(valorFinal)}</span>
            </div>

            <div style={{ display:"flex",gap:"8px" }}>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  flex:1, padding:"12px",
                  background: loading ? "var(--border)" : "var(--success)",
                  border:"none", borderRadius:"8px",
                  fontSize:"13px", color: loading ? "var(--text-muted)" : "#fff",
                  fontWeight:800, cursor: loading ? "not-allowed" : "pointer",
                  fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px",
                  transition:"all 0.15s",
                }}>
                {loading ? (
                  <><div style={{ width:"14px",height:"14px",border:"2px solid var(--text-muted)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.6s linear infinite" }}/> Processando...</>
                ) : (
                  <><Check size={15}/> Confirmar Pagamento</>
                )}
              </button>
              <button onClick={onClose} disabled={loading} style={{ padding:"12px 18px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"8px",fontSize:"13px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function PayablesPage() {
  const [filter,     setFilter]     = useState("todos")
  const [q,          setQ]          = useState("")
  const [payingItem, setPayingItem] = useState<PayableItem | null>(null)
  const [items,      setItems]      = useState<PayableItem[]>(initialPayables)
  const [toast,      setToast]      = useState<string | null>(null)
  const { range } = useDateRange()

  function handleConfirmPayment(id: string, method: string, date: string, value: number) {
    setItems(prev => prev.map(p =>
      p.id === id
        ? { ...p, status: "pago", paidAt: date, paidMethod: method, paidValue: value }
        : p
    ))
    const paid = items.find(p => p.id === id)
    setToast(`${paid?.fornecedor} — ${R(value)} marcado como pago via ${method}`)
    setTimeout(() => setToast(null), 4000)
  }

  const filtered = items
    .filter(p => filter === "todos" || p.status === filter)
    .filter(p => !q || p.fornecedor.toLowerCase().includes(q.toLowerCase()) || p.descricao.toLowerCase().includes(q.toLowerCase()))

  const totals = {
    aPagar:  items.filter(p=>p.status==="a_pagar"||p.status==="em_atraso").reduce((s,p)=>s+p.valor,0),
    vencidos:items.filter(p=>p.status==="em_atraso").reduce((s,p)=>s+p.valor,0),
    pagos:   items.filter(p=>p.status==="pago").reduce((s,p)=>s+p.valor,0),
  }

  const vence7 = items.filter(p=>{
    if (p.status==="pago"||p.status==="cancelado") return false
    const days = Math.round((new Date(p.vencimento).getTime() - new Date().setHours(0,0,0,0)) / 86400000)
    return days >= 0 && days <= 7
  }).reduce((s,p)=>s+p.valor,0)

  return (
    <div style={{ padding:"22px" }}>
      {payingItem && (
        <PayModal
          item={payingItem}
          onConfirm={handleConfirmPayment}
          onClose={()=>setPayingItem(null)}
        />
      )}

      {/* Toast de sucesso */}
      {toast && (
        <div style={{
          position:"fixed", bottom:"24px", right:"24px", zIndex:2000,
          background:"var(--success)", color:"#fff",
          padding:"13px 18px", borderRadius:"var(--radius)",
          fontSize:"13px", fontWeight:600,
          display:"flex", alignItems:"center", gap:"9px",
          boxShadow:"var(--shadow-lg)", maxWidth:"400px",
          animation:"slideIn 0.2s ease",
        }}>
          <CheckCircle2 size={17}/>
          {toast}
        </div>
      )}
      <style>{`@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

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
          <Link href="/transactions" style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 14px",background:"var(--accent)",border:"none",borderRadius:"7px",fontSize:"12px",color:"#fff",fontWeight:700,textDecoration:"none" }}>
            <Plus size={13}/> Nova conta
          </Link>
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
          { label:"A Pagar",        value:R(totals.aPagar),  color:"var(--accent)" },
          { label:"Vencidos",       value:R(totals.vencidos),color:"var(--danger)" },
          { label:"Vencem em 7d",   value:R(vence7),         color:"var(--warning)" },
          { label:"Pagos no Período",value:R(totals.pagos),  color:"var(--success)" },
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
              const ds = getDueStatus(item.vencimento, item.status)
              const Icon = ds.icon
              return (
                <tr key={item.id}
                  style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none", background:ds.rowBg, transition:"background 0.1s" }}
                  onMouseEnter={e=>(e.currentTarget.style.opacity="0.9")}
                  onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                  <td style={{ padding:"11px 14px",fontSize:"13px",color:"var(--text-primary)",fontWeight:600 }}>{item.fornecedor}</td>
                  <td style={{ padding:"11px 14px",fontSize:"12px",color:"var(--text-secondary)",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.descricao}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",background:"var(--bg-tertiary)",color:"var(--text-secondary)",padding:"2px 8px",borderRadius:"4px",border:"1px solid var(--border)" }}>{item.categoria}</span>
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"5px" }}>
                      {Icon && <Icon size={13} style={{ color:ds.dateColor,flexShrink:0 }}/>}
                      <span style={{ fontSize:"12.5px",fontWeight:600,color:ds.dateColor }}>{formatDate(item.vencimento)}</span>
                    </div>
                    {item.status!=="pago" && item.status!=="cancelado" && (
                      <span style={{ fontSize:"10px",color:ds.badge.c,background:ds.badge.bg,padding:"1px 6px",borderRadius:"10px",marginTop:"2px",display:"inline-block" }}>{ds.label}</span>
                    )}
                  </td>
                  <td style={{ padding:"11px 14px",fontSize:"12px",color:"var(--text-muted)" }}>{(item as any).parcela||"—"}</td>
                  <td style={{ padding:"11px 14px",textAlign:"right" }}>
                    <div style={{ fontSize:"13px",fontWeight:800,color:"var(--text-primary)" }}>{R(item.valor)}</div>
                    {(item as PayableItem).paidValue && (item as PayableItem).paidValue !== item.valor && (
                      <div style={{ fontSize:"10px",color:"var(--success)",marginTop:"1px" }}>Pago: {R((item as PayableItem).paidValue!)}</div>
                    )}
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:ds.badge.c,background:ds.badge.bg,padding:"3px 9px",borderRadius:"20px" }}>
                      {item.status==="a_pagar"?"A Pagar":item.status==="em_atraso"?"Em Atraso":item.status==="pago"?"Pago":"—"}
                    </span>
                    {item.status==="pago" && (item as PayableItem).paidAt && (
                      <div style={{ fontSize:"9px",color:"var(--text-muted)",marginTop:"2px" }}>
                        {new Date((item as PayableItem).paidAt!).toLocaleDateString("pt-BR")} · {(item as PayableItem).paidMethod}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:"11px 14px",fontSize:"12px",color:"var(--text-secondary)" }}>{(item as any).conta||"—"}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex",gap:"5px" }}>
                      {item.status!=="pago" && (
                        <button
                          onClick={()=>setPayingItem(item as PayableItem)}
                          title="Registrar pagamento"
                          style={{ display:"flex",alignItems:"center",gap:"4px",padding:"5px 10px",borderRadius:"6px",border:"none",background:"var(--success)",fontSize:"11px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>
                          <Check size={11}/> Pagar
                        </button>
                      )}
                      {item.status==="pago" && (
                        <div style={{ display:"flex",alignItems:"center",gap:"4px",padding:"5px 10px",borderRadius:"6px",background:"var(--success-soft)",fontSize:"11px",color:"var(--success)",fontWeight:700 }}>
                          <CheckCircle2 size={11}/> Pago
                        </div>
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
