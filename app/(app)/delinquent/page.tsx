"use client"

import { useState } from "react"
import { MessageSquare, Phone, ChevronDown, ChevronUp, Check, RefreshCw, Search, Filter, ChevronLeft } from "lucide-react"
import { inadimplentes } from "@/lib/filtered-mock"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

const R = formatCurrency

const cobrancaConfig: Record<string,{ label:string; c:string; bg:string }> = {
  aguardando:       { label:"Aguardando",      c:"var(--text-muted)",  bg:"var(--bg-tertiary)" },
  prometeu_pagar:   { label:"Prometeu Pagar",  c:"var(--warning)",     bg:"var(--warning-soft)" },
  negociando:       { label:"Negociando",       c:"var(--accent)",      bg:"var(--accent-soft)" },
  sem_resposta:     { label:"Sem Resposta",     c:"var(--danger)",      bg:"var(--danger-soft)" },
  juridico:         { label:"Em Cobrança Jurídica",c:"var(--purple)",   bg:"var(--purple-soft)" },
  pago:             { label:"Pago",             c:"var(--success)",     bg:"var(--success-soft)" },
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

function now() {
  return new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })
}

function Row({ item, onMarkReceived }: { item: typeof inadimplentes[0]; onMarkReceived: (id:string)=>void }) {
  const [open,        setOpen]        = useState(false)
  const [status,      setStatus]      = useState(item.statusCobranca)
  const [nota,        setNota]        = useState("")
  const [tentativas,  setTentativas]  = useState(item.tentativas)
  const [ultimoCont,  setUltimoCont]  = useState(item.ultimoContato)
  const [saved,       setSaved]       = useState(false)
  const [waSent,      setWaSent]      = useState(false)
  const [received,    setReceived]    = useState(false)
  const [histLog,     setHistLog]     = useState<string[]>([])

  const cfg = cobrancaConfig[status] ?? cobrancaConfig.aguardando

  /* Atualiza último contato ao mudar status */
  function handleStatusChange(newStatus: string) {
    setStatus(newStatus)
    const ts = now()
    setUltimoCont(ts)
    setHistLog(prev => [`${ts} — Status alterado para: ${cobrancaConfig[newStatus]?.label ?? newStatus}`, ...prev])
  }

  /* Atualiza último contato quando começa a digitar nota */
  function handleNotaChange(val: string) {
    setNota(val)
  }

  function handleSalvar() {
    if (!nota.trim()) return
    const ts = now()
    setUltimoCont(ts)
    setTentativas(t => t + 1)
    setHistLog(prev => [`${ts} — Registro: "${nota.trim()}"`, ...prev])
    setNota("")
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleWhatsApp(e: React.MouseEvent) {
    e.stopPropagation()
    const msg = encodeURIComponent(
      `Olá ${item.cliente.split(" ")[0]}, tudo bem? Passando para lembrar do título em aberto no valor de ${R(item.valor)} com vencimento em ${formatDate(item.vencimento)}. Poderia nos informar quando haverá a quitação? Obrigado!`
    )
    window.open(`https://wa.me/55${item.whatsapp}?text=${msg}`, "_blank")
    const ts = now()
    setUltimoCont(ts)
    setTentativas(t => t + 1)
    setHistLog(prev => [`${ts} — Cobrança enviada via WhatsApp`, ...prev])
    setWaSent(true)
    setTimeout(() => setWaSent(false), 3000)
  }

  function handleReceived() {
    setStatus("pago")
    setReceived(true)
    const ts = now()
    setUltimoCont(ts)
    setHistLog(prev => [`${ts} — Marcado como Recebido`, ...prev])
    onMarkReceived(item.id)
  }

  return (
    <>
      <tr
        onClick={() => setOpen(o=>!o)}
        style={{ borderBottom:"1px solid var(--border)", cursor:"pointer", background:open?"var(--bg-elevated)":"transparent", opacity: received ? 0.55 : 1 }}
        onMouseEnter={e => !open && (e.currentTarget.style.background="var(--bg-tertiary)")}
        onMouseLeave={e => !open && (e.currentTarget.style.background="transparent")}
      >
        <td style={{ padding:"12px 14px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{item.cliente}</div>
          <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"1px" }}>{item.cnpj}</div>
        </td>
        <td style={{ padding:"12px 14px",fontSize:"12px",color:"var(--text-secondary)",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
          {item.descricao}
        </td>
        <td style={{ padding:"12px 14px" }}>
          <DiasTag dias={item.dias}/>
        </td>
        <td style={{ padding:"12px 14px",textAlign:"right",fontSize:"14px",fontWeight:800,color:received?"var(--success)":"var(--danger)" }}>
          {R(item.valor)}
        </td>
        <td style={{ padding:"12px 14px" }}>
          <span style={{ fontSize:"11px",fontWeight:600,color:cfg.c,background:cfg.bg,padding:"3px 9px",borderRadius:"20px" }}>{cfg.label}</span>
        </td>
        <td style={{ padding:"12px 14px",fontSize:"11px",color:"var(--text-muted)" }}>{ultimoCont}</td>
        <td style={{ padding:"12px 14px",textAlign:"center" }}>
          {/* Tentativas editáveis inline */}
          <input
            type="number"
            value={tentativas}
            min={0}
            onClick={e => e.stopPropagation()}
            onChange={e => setTentativas(Math.max(0,parseInt(e.target.value)||0))}
            style={{ width:"48px",padding:"4px 6px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"5px",fontSize:"12px",color:"var(--text-primary)",textAlign:"center",outline:"none",fontFamily:"inherit" }}
          />
          <div style={{ fontSize:"9px",color:"var(--text-muted)",marginTop:"1px" }}>contatos</div>
        </td>
        <td style={{ padding:"12px 14px" }}>
          <div style={{ display:"flex",gap:"5px",alignItems:"center" }}>
            <button onClick={handleWhatsApp} title="Enviar cobrança WhatsApp"
              style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:waSent?"var(--success-soft)":"var(--warning-soft)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:waSent?"var(--success)":"var(--warning)" }}>
              <MessageSquare size={12}/>
            </button>
            <button onClick={e=>{e.stopPropagation();alert(`Ligar para: ${item.telefone}`)}} title="Registrar ligação"
              style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
              <Phone size={12}/>
            </button>
            <div style={{ color:"var(--text-muted)",marginLeft:"2px" }}>
              {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </div>
          </div>
        </td>
      </tr>

      {/* Painel expandido */}
      {open && (
        <tr style={{ borderBottom:"2px solid var(--border)", background:"var(--bg-tertiary)" }}>
          <td colSpan={8} style={{ padding:"0" }}>
            <div style={{ padding:"18px 20px", display:"grid", gridTemplateColumns:"240px 1fr 1fr", gap:"20px" }}>

              {/* Dados de contato */}
              <div>
                <div style={{ fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:"10px" }}>Dados de Contato</div>
                {[
                  ["Telefone",       item.telefone],
                  ["WhatsApp",       `+55 ${item.whatsapp}`],
                  ["Vencimento",     formatDate(item.vencimento)],
                  ["Dias em atraso", `${item.dias} dias`],
                  ["Tentativas",     `${tentativas} contatos`],
                  ["Último contato", ultimoCont],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--border)" }}>
                    <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>{k}</span>
                    <span style={{ fontSize:"11px",fontWeight:600,color:"var(--text-primary)" }}>{v}</span>
                  </div>
                ))}

                {/* Histórico */}
                {histLog.length > 0 && (
                  <div style={{ marginTop:"12px" }}>
                    <div style={{ fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:"6px" }}>Histórico</div>
                    {histLog.map((l,i) => (
                      <div key={i} style={{ fontSize:"10px",color:"var(--text-secondary)",padding:"4px 0",borderBottom:"1px solid var(--border)",lineHeight:1.5 }}>{l}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status de cobrança */}
              <div>
                <div style={{ fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:"10px" }}>Status de Cobrança</div>
                <div style={{ display:"flex",flexDirection:"column",gap:"5px" }}>
                  {Object.entries(cobrancaConfig).map(([k,c])=>(
                    <button key={k}
                      onClick={() => handleStatusChange(k)}
                      style={{
                        display:"flex",alignItems:"center",gap:"8px",
                        padding:"9px 12px",borderRadius:"7px",
                        border:`1px solid ${status===k ? c.c : "var(--border)"}`,
                        background: status===k ? c.bg : "transparent",
                        cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                        transition:"all 0.12s",
                      }}>
                      <div style={{ width:"16px",height:"16px",borderRadius:"50%",border:`1.5px solid ${status===k?c.c:"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        {status===k && <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:c.c }}/>}
                      </div>
                      <span style={{ fontSize:"12px",fontWeight:status===k?700:400,color:status===k?c.c:"var(--text-secondary)" }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Registrar contato */}
              <div>
                <div style={{ fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:"10px" }}>Registrar Contato</div>
                <textarea
                  value={nota}
                  onChange={e => handleNotaChange(e.target.value)}
                  placeholder="Descreva o resultado do contato: prometeu pagar em X, número incorreto, negou dívida, etc."
                  style={{ width:"100%",padding:"10px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"12px",color:"var(--text-primary)",resize:"vertical",minHeight:"90px",outline:"none",fontFamily:"inherit",marginBottom:"10px",boxSizing:"border-box" }}
                />

                {saved && (
                  <div style={{ padding:"7px 10px",background:"var(--success-soft)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:"6px",fontSize:"11px",color:"var(--success)",marginBottom:"8px",display:"flex",alignItems:"center",gap:"5px" }}>
                    <Check size={12}/> Registro salvo · Tentativas: {tentativas} · {ultimoCont}
                  </div>
                )}
                {waSent && (
                  <div style={{ padding:"7px 10px",background:"var(--warning-soft)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"6px",fontSize:"11px",color:"var(--warning)",marginBottom:"8px",display:"flex",alignItems:"center",gap:"5px" }}>
                    <MessageSquare size={12}/> Mensagem enviada pelo WhatsApp
                  </div>
                )}
                {received && (
                  <div style={{ padding:"7px 10px",background:"var(--success-soft)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:"6px",fontSize:"11px",color:"var(--success)",marginBottom:"8px",display:"flex",alignItems:"center",gap:"5px" }}>
                    <Check size={12}/> Marcado como recebido · {ultimoCont}
                  </div>
                )}

                <div style={{ display:"flex",gap:"7px",marginBottom:"8px" }}>
                  <button onClick={handleSalvar} disabled={!nota.trim()} style={{
                    flex:1,padding:"9px",background:nota.trim()?"var(--accent)":"var(--border)",
                    border:"none",borderRadius:"7px",fontSize:"12px",color:nota.trim()?"#fff":"var(--text-muted)",
                    fontWeight:700,cursor:nota.trim()?"pointer":"not-allowed",fontFamily:"inherit",
                  }}>
                    Salvar registro
                  </button>
                  <button onClick={handleWhatsApp} style={{ flex:1,padding:"9px",background:"var(--warning-soft)",border:"1px solid rgba(245,158,11,0.35)",borderRadius:"7px",fontSize:"12px",color:"var(--warning)",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                    Enviar WA
                  </button>
                </div>
                <button onClick={handleReceived} disabled={received} style={{
                  width:"100%",padding:"9px",
                  background: received ? "var(--bg-tertiary)" : "var(--success-soft)",
                  border:`1px solid ${received?"var(--border)":"rgba(16,185,129,0.35)"}`,
                  borderRadius:"7px",fontSize:"12px",color:received?"var(--text-muted)":"var(--success)",
                  fontWeight:700,cursor:received?"default":"pointer",fontFamily:"inherit",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",
                }}>
                  <Check size={13}/> {received ? "Já marcado como recebido" : "Marcar como Recebido"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function DelinquentPage() {
  const [q, setQ] = useState("")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [sortBy, setSortBy] = useState<"dias"|"valor">("dias")
  const [receivedIds, setReceivedIds] = useState<Set<string>>(new Set())

  function handleMarkReceived(id: string) {
    setReceivedIds(prev => new Set([...prev, id]))
  }

  const total = inadimplentes.reduce((s,i)=>s+i.valor,0)
  const avgDias = Math.round(inadimplentes.reduce((s,i)=>s+i.dias,0)/inadimplentes.length)

  let data = [...inadimplentes]
  if (q) data = data.filter(i=>i.cliente.toLowerCase().includes(q.toLowerCase())||i.descricao.toLowerCase().includes(q.toLowerCase()))
  if (filterStatus!=="todos") data = data.filter(i=>i.statusCobranca===filterStatus)
  data.sort((a,b)=> sortBy==="dias" ? b.dias-a.dias : b.valor-a.valor)

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
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px" }}>
        {[
          { l:"Total em Atraso",     v:R(total),          c:"var(--danger)" },
          { l:"Clientes Afetados",   v:`${inadimplentes.length}`,   c:"var(--warning)" },
          { l:"Prazo Médio Atraso",  v:`${avgDias} dias`, c:"var(--warning)" },
          { l:"Taxa Inadimplência",  v:"19,9%",           c:"var(--danger)" },
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

        <div style={{ display:"flex",gap:"4px",flexWrap:"wrap" }}>
          {[["todos","Todos"],["aguardando","Aguardando"],["prometeu_pagar","Prometeu Pagar"],["negociando","Negociando"],["sem_resposta","Sem Resposta"],["juridico","Jurídico"]].map(([k,l])=>(
            <button key={k} onClick={()=>setFilterStatus(k)} style={{ padding:"5px 11px",borderRadius:"20px",border:"1px solid",borderColor:filterStatus===k?"var(--accent)":"var(--border)",background:filterStatus===k?"var(--accent-soft)":"transparent",color:filterStatus===k?"var(--accent)":"var(--text-secondary)",fontSize:"11px",fontWeight:filterStatus===k?700:400,cursor:"pointer",fontFamily:"inherit" }}>{l}</button>
          ))}
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
              {["Cliente","Descrição","Atraso","Valor","Status Cobrança","Último Contato","Tentativas","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:h==="Valor"?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:"40px",textAlign:"center",color:"var(--text-muted)",fontSize:"13px" }}>Nenhum inadimplente encontrado</td></tr>
            ) : data.map(item => <Row key={item.id} item={item} onMarkReceived={handleMarkReceived}/>)}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"12px",padding:"10px 14px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)" }}>
          <span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>{data.length} registro{data.length>1?"s":""} encontrado{data.length>1?"s":""}</span>
          <div style={{ display:"flex",gap:"8px" }}>
            <span style={{ fontSize:"12px",color:"var(--text-muted)" }}>Total em atraso:</span>
            <span style={{ fontSize:"13px",fontWeight:800,color:"var(--danger)" }}>{R(data.reduce((s,i)=>s+i.valor,0))}</span>
          </div>
        </div>
      )}
    </div>
  )
}
