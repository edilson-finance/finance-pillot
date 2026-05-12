"use client"

import { useState } from "react"
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronUp, Bell } from "lucide-react"
import Link from "next/link"

const initialAlerts = [
  {
    id:"1", severity:"critical", title:"Caixa negativo projetado em junho",
    message:"Com base nos lançamentos em aberto, o saldo pode ficar negativo em R$ 12.400 na semana de 24/06.",
    action:"Ver fluxo de caixa", href:"/cashflow",
    detalhe:"O problema principal é o recebimento pendente da Construtora Beta (R$ 150.000) que está em atraso há 9 dias. Paralelamente, há pagamento de folha de R$ 98.400 previsto para 31/05. Recomenda-se acionar cobrança imediatamente ou negociar prazo com fornecedores para a semana de 24/06.",
    quando:"Hoje, 08:14",
    lido:false,
  },
  {
    id:"2", severity:"critical", title:"Inadimplência em 19,9% — muito acima do limite",
    message:"R$ 28.700 em atraso. O limite saudável é 5%. 3 clientes concentram 68% do total.",
    action:"Ver inadimplentes", href:"/delinquent",
    detalhe:"Os três maiores inadimplentes são: (1) Construtora Beta — R$ 178.700 em dois títulos; (2) RJ Incorporadora — R$ 14.000 com 24 dias de atraso; (3) Incorporadora Sul — R$ 8.200. Recomenda-se priorizar a cobrança da Construtora Beta por representar 48% do faturamento.",
    quando:"Hoje, 08:14",
    lido:false,
  },
  {
    id:"3", severity:"warning", title:"Concentração de receita acima do limite",
    message:"Construtora Beta representa 48,1% do faturamento. Alta dependência de um único cliente.",
    action:"Ver análise", href:"/bi",
    detalhe:"Concentração acima de 30% em um único cliente representa risco estratégico. Se a Construtora Beta atrasar, cancelar ou reduzir contratos, o impacto imediato no caixa seria de R$ 150.000/mês. Recomenda-se iniciar prospecção de novos clientes.",
    quando:"Ontem, 00:01",
    lido:false,
  },
  {
    id:"4", severity:"warning", title:"2 contas vencem em 3 dias",
    message:"Total de R$ 8.600 a pagar até 12/05. Verifique o saldo disponível.",
    action:"Ver contas", href:"/payables",
    detalhe:"Vencimentos próximos: (1) Aço Nordeste — R$ 4.200 em 10/05; (2) Condomínio escritório — R$ 4.400 em 12/05. Saldo atual disponível: R$ 284.750. Nenhuma ação urgente necessária.",
    quando:"Ontem, 00:01",
    lido:true,
  },
  {
    id:"5", severity:"info", title:"Conciliação bancária pendente",
    message:"Há 4 lançamentos no extrato bancário sem correspondência no sistema.",
    action:"Conciliar agora", href:"/reconciliation",
    detalhe:"Foram importados 12 itens do extrato OFX (Bradesco CC — mai/2026). 8 foram conciliados automaticamente. 4 precisam de revisão manual: 3 por diferença de centavos e 1 sem correspondência.",
    quando:"05/05/2026",
    lido:true,
  },
]

const severityMap = {
  critical:{ icon:AlertCircle,  c:"var(--danger)",  bg:"var(--danger-soft)",  border:"var(--danger)",  label:"Crítico" },
  warning: { icon:AlertTriangle,c:"var(--warning)", bg:"var(--warning-soft)", border:"var(--warning)", label:"Atenção" },
  info:    { icon:Info,          c:"var(--accent)",  bg:"var(--accent-soft)",  border:"var(--accent)",  label:"Info" },
}

function AlertCard({ alert, onRead }: { alert: typeof initialAlerts[0]; onRead:(id:string)=>void }) {
  const [open, setOpen] = useState(false)
  const s = severityMap[alert.severity as keyof typeof severityMap]
  const Icon = s.icon

  return (
    <div style={{
      background:"var(--bg-secondary)",
      border:`1px solid ${alert.lido?"var(--border)":s.border+"40"}`,
      borderLeft:`4px solid ${alert.lido?"var(--border)":s.border}`,
      borderRadius:"var(--radius)",
      overflow:"hidden",
      opacity:alert.lido?0.65:1,
      transition:"all 0.15s",
    }}>
      {/* Header */}
      <div
        onClick={()=>setOpen(o=>!o)}
        style={{ padding:"14px 16px",display:"flex",alignItems:"flex-start",gap:"12px",cursor:"pointer" }}>
        <div style={{ width:"34px",height:"34px",borderRadius:"8px",background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          <Icon size={16} style={{ color:s.c }}/>
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px",flexWrap:"wrap" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{alert.title}</span>
            <span style={{ fontSize:"10px",fontWeight:700,color:s.c,background:s.bg,padding:"2px 7px",borderRadius:"20px" }}>{s.label}</span>
            {alert.lido && <span style={{ fontSize:"10px",color:"var(--text-muted)" }}>Lido</span>}
          </div>
          <div style={{ fontSize:"12px",color:"var(--text-secondary)",lineHeight:1.5 }}>{alert.message}</div>
          <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"4px" }}>{alert.quando}</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"6px",flexShrink:0 }}>
          {!alert.lido && (
            <button
              onClick={e=>{e.stopPropagation();onRead(alert.id)}}
              title="Marcar como lido"
              style={{ padding:"5px 10px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"11px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"4px" }}>
              <CheckCircle2 size={11}/> Marcar lido
            </button>
          )}
          {open ? <ChevronUp size={15} style={{ color:"var(--text-muted)" }}/> : <ChevronDown size={15} style={{ color:"var(--text-muted)" }}/>}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding:"0 16px 16px 62px", borderTop:"1px solid var(--border)", paddingTop:"14px" }}>
          <p style={{ fontSize:"12.5px",color:"var(--text-secondary)",lineHeight:1.75,marginBottom:"12px" }}>
            {alert.detalhe}
          </p>
          <Link href={alert.href} style={{
            display:"inline-flex",alignItems:"center",gap:"6px",
            padding:"7px 16px",
            background:s.bg,border:`1px solid ${s.border}40`,
            borderRadius:"7px",fontSize:"12px",fontWeight:700,color:s.c,
            textDecoration:"none",
          }}>
            {alert.action} →
          </Link>
        </div>
      )}
    </div>
  )
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [filter, setFilter] = useState("todos")

  function markRead(id: string) {
    setAlerts(prev => prev.map(a => a.id===id ? {...a,lido:true} : a))
  }
  function markAllRead() {
    setAlerts(prev => prev.map(a => ({...a,lido:true})))
  }

  const filtered = filter==="todos" ? alerts : filter==="nao_lidos" ? alerts.filter(a=>!a.lido) : alerts.filter(a=>a.severity===filter)
  const unread = alerts.filter(a=>!a.lido).length

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px" }}>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
            <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Alertas</h1>
            {unread > 0 && (
              <span style={{ fontSize:"11px",fontWeight:700,background:"var(--danger)",color:"#fff",padding:"2px 8px",borderRadius:"20px" }}>{unread} não lido{unread>1?"s":""}</span>
            )}
          </div>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Clique em um alerta para ver detalhes e ações</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
            <CheckCircle2 size={13}/> Marcar todos como lido
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display:"flex",gap:"5px",marginBottom:"16px",flexWrap:"wrap" }}>
        {[["todos","Todos"],["nao_lidos","Não lidos"],["critical","Críticos"],["warning","Atenção"],["info","Informações"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{
            padding:"6px 14px",borderRadius:"20px",border:"1px solid",
            borderColor:filter===k?"var(--accent)":"var(--border)",
            background:filter===k?"var(--accent-soft)":"transparent",
            color:filter===k?"var(--accent)":"var(--text-secondary)",
            fontSize:"12px",fontWeight:filter===k?700:400,
            cursor:"pointer",fontFamily:"inherit",
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:"48px",textAlign:"center",color:"var(--text-muted)",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)" }}>
            <Bell size={28} style={{ marginBottom:"8px",opacity:0.4 }}/>
            <div style={{ fontSize:"14px" }}>Nenhum alerta nesta categoria</div>
          </div>
        ) : filtered.map(a => <AlertCard key={a.id} alert={a} onRead={markRead}/>)}
      </div>
    </div>
  )
}
