"use client"

import { useState, useMemo } from "react"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Line, ReferenceLine } from "recharts"
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, ChevronLeft, AlertTriangle, Plus, Download, Eye, EyeOff, RefreshCw, CalendarDays } from "lucide-react"
import { cashflowTransactions, cashflowProjection, revenueExpenseData, payables, receivables } from "@/lib/mock-data"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useDateRange } from "@/lib/date-context"
import Link from "next/link"

const R = formatCurrency

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-strong)", borderRadius:"9px", padding:"11px 15px", fontSize:"12px", boxShadow:"var(--shadow-lg)" }}>
      <div style={{ color:"var(--text-secondary)", marginBottom:"7px", fontWeight:700 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:"18px", marginBottom:"3px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:p.color,flexShrink:0 }}/>
            <span style={{ color:"var(--text-secondary)" }}>{p.name}</span>
          </div>
          <span style={{ color:"var(--text-primary)", fontWeight:700 }}>
            {typeof p.value==="number" ? R(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const TABS = ["Demonstrativo", "Projetado", "Projeção Diária", "Calendário", "Lançar Projeção", "Caixa vs Competência", "Gráfico"]

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]
const TODAY_ISO = "2026-05-12"

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addMonths(d: Date, count: number) {
  return new Date(d.getFullYear(), d.getMonth() + count, 1)
}

function compactMoney(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (abs >= 1000000) return `${sign}R$ ${(abs / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
  if (abs >= 1000) return `${sign}R$ ${(abs / 1000).toLocaleString("pt-BR", { maximumFractionDigits: abs >= 10000 ? 0 : 1 })} mil`
  return `${sign}${R(abs)}`
}

function buildMoneyCalendar(monthDate: Date, openingBalance: number) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())

  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const gridEnd = new Date(monthEnd)
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()))

  const actualEvents = cashflowTransactions.map(t => ({
    date: t.data,
    title: t.descricao,
    account: t.conta,
    type: t.entrada ? "in" : "out",
    amount: t.entrada ?? t.saida ?? 0,
    status: "Realizado",
  }))

  const payableEvents = payables
    .filter(p => p.status !== "pago")
    .map(p => ({
      date: p.vencimento,
      title: p.fornecedor,
      account: p.conta,
      type: "out",
      amount: p.valor,
      status: p.status === "em_atraso" ? "Em atraso" : "Previsto",
    }))

  const receivableEvents = receivables
    .filter(r => r.status !== "recebido")
    .map(r => ({
      date: r.vencimento,
      title: r.cliente,
      account: r.conta,
      type: "in",
      amount: r.valor,
      status: r.status === "em_atraso" ? "Em atraso" : "Previsto",
    }))

  const events = [...actualEvents, ...payableEvents, ...receivableEvents]
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date))
  let runningBalance = openingBalance

  const balanceByDate: Record<string, number> = {}
  for (const event of sortedEvents) {
    runningBalance += event.type === "in" ? event.amount : -event.amount
    balanceByDate[event.date] = runningBalance
  }

  const days = []
  const cursor = new Date(gridStart)
  let lastBalance = openingBalance

  while (cursor <= gridEnd) {
    const date = isoDate(cursor)
    const dayEvents = events.filter(e => e.date === date)
    const entradas = dayEvents.filter(e => e.type === "in").reduce((s, e) => s + e.amount, 0)
    const saidas = dayEvents.filter(e => e.type === "out").reduce((s, e) => s + e.amount, 0)
    if (balanceByDate[date] !== undefined) lastBalance = balanceByDate[date]

    days.push({
      date,
      day: cursor.getDate(),
      inMonth: cursor.getMonth() === monthDate.getMonth(),
      isToday: date === TODAY_ISO,
      entradas,
      saidas,
      saldo: lastBalance,
      events: dayEvents.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

/* Group transactions by date */
const grouped = cashflowTransactions.reduce((acc, t) => {
  if (!acc[t.data]) acc[t.data] = []
  acc[t.data].push(t)
  return acc
}, {} as Record<string, typeof cashflowTransactions>)

function DayGroup({ date, rows }: { date: string; rows: typeof cashflowTransactions }) {
  const [open, setOpen] = useState(true)
  const totalEntrada = rows.reduce((s,r) => s+(r.entrada||0), 0)
  const totalSaida = rows.reduce((s,r) => s+(r.saida||0), 0)
  const saldoDia = rows[rows.length-1].saldo

  return (
    <div>
      {/* Day header */}
      <div
        onClick={() => setOpen(o=>!o)}
        style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 16px", background:"var(--bg-tertiary)", cursor:"pointer", borderBottom:"1px solid var(--border)", userSelect:"none" }}>
        <div style={{ color:"var(--text-muted)", width:"14px" }}>
          {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        </div>
        <span style={{ fontSize:"12px", fontWeight:700, color:"var(--text-primary)", minWidth:"100px" }}>{formatDate(date)}</span>
        <span style={{ fontSize:"11px", color:"var(--text-muted)", marginLeft:"4px" }}>{rows.length} lançamento{rows.length>1?"s":""}</span>
        <div style={{ flex:1 }}/>
        {totalEntrada>0 && <span style={{ fontSize:"12px", color:"var(--success)", fontWeight:700 }}>+ {R(totalEntrada)}</span>}
        {totalSaida>0  && <span style={{ fontSize:"12px", color:"var(--danger)",  fontWeight:700, marginLeft:"12px" }}>– {R(totalSaida)}</span>}
        <span style={{ fontSize:"12px", fontWeight:800, color:"var(--text-primary)", marginLeft:"20px", borderLeft:"1px solid var(--border)", paddingLeft:"16px" }}>
          Saldo: {R(saldoDia)}
        </span>
      </div>

      {/* Transactions */}
      {open && rows.map((t,i) => (
        <div key={i} style={{
          display:"grid", gridTemplateColumns:"1fr 130px 130px 120px 120px 130px",
          padding:"10px 16px 10px 40px",
          borderBottom:"1px solid var(--border)",
          alignItems:"center",
          background:"var(--bg-secondary)",
          transition:"background 0.1s",
        }}
        onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
        onMouseLeave={e=>(e.currentTarget.style.background="var(--bg-secondary)")}>
          <div>
            <div style={{ fontSize:"12.5px", color:"var(--text-primary)", fontWeight:500 }}>{t.descricao}</div>
            <div style={{ fontSize:"10px", color:"var(--text-muted)", marginTop:"1px" }}>{t.conta}</div>
          </div>
          <div>
            <span style={{ fontSize:"11px", background:"var(--bg-elevated)", color:"var(--text-secondary)", padding:"2px 8px", borderRadius:"4px", border:"1px solid var(--border)" }}>{t.categoria}</span>
          </div>
          <div style={{ textAlign:"right", fontSize:"12.5px", fontWeight:700, color:"var(--success)" }}>
            {t.entrada ? `+ ${R(t.entrada)}` : <span style={{ color:"var(--text-muted)" }}>—</span>}
          </div>
          <div style={{ textAlign:"right", fontSize:"12.5px", fontWeight:700, color:"var(--danger)" }}>
            {t.saida ? `– ${R(t.saida)}` : <span style={{ color:"var(--text-muted)" }}>—</span>}
          </div>
          <div style={{ textAlign:"right", fontSize:"12px", color:"var(--text-muted)" }}>
            {t.conta}
          </div>
          <div style={{ textAlign:"right", fontSize:"12.5px", fontWeight:800, color:"var(--text-primary)" }}>
            {R(t.saldo)}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Projeção Diária ─── */
const PERIOD_OPTIONS = [
  { label: "7 dias",  days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
]

// Gera dados diários de projeção com base nos lançamentos em aberto
function buildDailyProjection(days: number, saldoInicial: number) {
  const today = new Date(); today.setHours(0,0,0,0)
  const data: { data: string; label: string; saldo: number; entradas: number; saidas: number; realizado: boolean }[] = []

  // Lançamentos futuros a receber
  const futureReceivables = [
    { data: "2026-05-10", valor: 98000, desc: "J. Silva — contrato" },
    { data: "2026-05-15", valor: 42000, desc: "Grupo Horizonte" },
    { data: "2026-05-20", valor: 14000, desc: "RJ Incorporadora" },
    { data: "2026-05-31", valor: 150000, desc: "Construtora Beta" },
    { data: "2026-06-10", valor: 98000, desc: "J. Silva — contrato jun" },
    { data: "2026-06-15", valor: 42000, desc: "Grupo Horizonte jun" },
    { data: "2026-06-30", valor: 150000, desc: "Construtora Beta jun" },
    { data: "2026-07-10", valor: 98000, desc: "J. Silva — contrato jul" },
  ]

  // Lançamentos futuros a pagar
  const futurePayables = [
    { data: "2026-05-10", valor: 12400, desc: "Aço Nordeste" },
    { data: "2026-05-12", valor: 4200,  desc: "Encargos sindicato" },
    { data: "2026-05-15", valor: 6800,  desc: "Cimento Forte" },
    { data: "2026-05-31", valor: 98400, desc: "Folha de pagamento" },
    { data: "2026-06-05", valor: 8400,  desc: "Aluguel" },
    { data: "2026-06-10", valor: 12400, desc: "Aço Nordeste jun" },
    { data: "2026-06-15", valor: 6800,  desc: "Materiais jun" },
    { data: "2026-06-24", valor: 103200,desc: "Folha junho" },
    { data: "2026-07-05", valor: 8400,  desc: "Aluguel jul" },
    { data: "2026-07-10", valor: 12400, desc: "Fornecedores jul" },
    { data: "2026-07-31", valor: 98400, desc: "Folha julho" },
  ]

  let saldo = saldoInicial

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = d.toISOString().slice(0,10)
    const label = d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" })
    const realizado = i < 3  // últimos 3 dias já realizados

    const entradas = futureReceivables.filter(r => r.data === iso).reduce((s,r) => s+r.valor, 0)
    const saidas   = futurePayables.filter(r => r.data === iso).reduce((s,r) => s+r.valor, 0)

    saldo = saldo + entradas - saidas

    data.push({ data: iso, label, saldo, entradas, saidas, realizado })
  }

  return data
}

function ProjecaoDiaria() {
  const [period,     setPeriod]     = useState(30)
  const [showRec,    setShowRec]    = useState(true)
  const [showPag,    setShowPag]    = useState(true)
  const [showSaldo,  setShowSaldo]  = useState(true)
  const saldoAtual = 284750

  const dados = useMemo(() => buildDailyProjection(period, saldoAtual), [period])

  const minSaldo = Math.min(...dados.map(d => d.saldo))
  const maxSaldo = Math.max(...dados.map(d => d.saldo))
  const minDay   = dados.find(d => d.saldo === minSaldo)
  const totalRec = dados.reduce((s,d) => s+d.entradas, 0)
  const totalPag = dados.reduce((s,d) => s+d.saidas, 0)
  const saldoFinal = dados[dados.length-1]?.saldo ?? saldoAtual

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
      {/* Controles */}
      <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"14px 18px", display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"11px", fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"6px" }}>Período</div>
          <div style={{ display:"flex", gap:"5px" }}>
            {PERIOD_OPTIONS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)} style={{
                padding:"5px 13px", borderRadius:"20px", border:"1px solid",
                borderColor: period===p.days ? "var(--accent)" : "var(--border)",
                background:  period===p.days ? "var(--accent-soft)" : "transparent",
                color:       period===p.days ? "var(--accent)" : "var(--text-secondary)",
                fontSize:"12px", fontWeight: period===p.days ? 700 : 400,
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s",
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        <div style={{ width:"1px", height:"36px", background:"var(--border)" }}/>

        <div>
          <div style={{ fontSize:"11px", fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"6px" }}>Exibir</div>
          <div style={{ display:"flex", gap:"6px" }}>
            {[
              { label:"Saldo",    active:showSaldo, fn:()=>setShowSaldo(o=>!o), c:"var(--accent)" },
              { label:"Entradas", active:showRec,   fn:()=>setShowRec(o=>!o),   c:"var(--success)" },
              { label:"Saídas",   active:showPag,   fn:()=>setShowPag(o=>!o),   c:"var(--danger)" },
            ].map(s => (
              <button key={s.label} onClick={s.fn} style={{
                display:"flex", alignItems:"center", gap:"5px",
                padding:"5px 12px", borderRadius:"20px", border:"1px solid",
                borderColor: s.active ? s.c : "var(--border)",
                background:  s.active ? `${s.c}18` : "transparent",
                color:       s.active ? s.c : "var(--text-muted)",
                fontSize:"12px", fontWeight: s.active ? 600 : 400,
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s",
              }}>
                {s.active ? <Eye size={12}/> : <EyeOff size={12}/>}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginLeft:"auto", fontSize:"11px", color:"var(--text-muted)", display:"flex", alignItems:"center", gap:"5px" }}>
          <RefreshCw size={11}/>
          Atualizado agora
        </div>
      </div>

      {/* KPIs do período */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px" }}>
        {[
          { l:"Saldo Inicial",          v:R(saldoAtual),  c:"var(--text-primary)" },
          { l:"Entradas Previstas",     v:R(totalRec),    c:"var(--success)" },
          { l:"Saídas Previstas",       v:R(totalPag),    c:"var(--danger)" },
          { l:`Saldo Final (${period}d)`,v:R(saldoFinal), c:saldoFinal < 150000 ? "var(--danger)" : saldoFinal < 250000 ? "var(--warning)" : "var(--success)" },
        ].map(k => (
          <div key={k.l} style={{ background:"var(--bg-secondary)", border:`1px solid ${k.c}28`, borderLeft:`3px solid ${k.c}`, borderRadius:"var(--radius)", padding:"12px 14px" }}>
            <div style={{ fontSize:"10px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"5px" }}>{k.l}</div>
            <div style={{ fontSize:"18px", fontWeight:800, color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Alerta saldo mínimo */}
      {minSaldo < 200000 && (
        <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 16px", background:"var(--warning-soft)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:"var(--radius)" }}>
          <AlertTriangle size={15} style={{ color:"var(--warning)", flexShrink:0 }}/>
          <span style={{ fontSize:"12px", color:"var(--warning)" }}>
            Saldo mínimo projetado: <strong>{R(minSaldo)}</strong> em <strong>{minDay?.label}</strong> — abaixo do nível seguro de {R(200000)}.
            Considere antecipar recebimentos ou postergar pagamentos não urgentes nesse período.
          </span>
        </div>
      )}

      {/* Gráfico principal */}
      <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"20px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"6px" }}>
          <div>
            <div style={{ fontSize:"14px", fontWeight:700, color:"var(--text-primary)" }}>
              Projeção de Saldo — Próximos {period} dias
            </div>
            <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>
              Saldo diário com base nos lançamentos em aberto. Passe o mouse para ver entradas e saídas do dia.
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={dados} margin={{ top:10, right:16, left:0, bottom:0 }}>
            <defs>
              <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.18}/>
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
            <XAxis
              dataKey="label"
              tick={{ fill:"var(--text-muted)", fontSize:10 }}
              axisLine={false} tickLine={false}
              interval={period <= 15 ? 0 : period <= 30 ? 2 : period <= 60 ? 4 : 6}
            />
            <YAxis
              tick={{ fill:"var(--text-muted)", fontSize:10 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `R$${(v/1000).toFixed(0)}k`}
              width={64}
            />
            <Tooltip
              contentStyle={{ background:"var(--bg-elevated)", border:"1px solid var(--border-strong)", borderRadius:"10px", fontSize:"12px", boxShadow:"var(--shadow-lg)" }}
              labelStyle={{ color:"var(--text-secondary)", fontWeight:700, marginBottom:"6px" }}
              formatter={(value: any, name: any) => {
                const labels: Record<string,string> = { saldo:"Saldo do Dia", entradas:"Entradas", saidas:"Saídas" }
                return [R(Number(value)), labels[String(name)] ?? String(name)]
              }}
            />
            <ReferenceLine
              y={200000}
              stroke="var(--warning)"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value:"Mínimo seguro", fill:"var(--warning)", fontSize:10, position:"insideTopRight" }}
            />
            <ReferenceLine y={0} stroke="var(--danger)" strokeWidth={1}/>

            {showRec && (
              <Bar dataKey="entradas" name="entradas" fill="var(--success)" opacity={0.35} radius={[2,2,0,0]} barSize={period <= 15 ? 14 : period <= 30 ? 8 : 5}/>
            )}
            {showPag && (
              <Bar dataKey="saidas" name="saidas" fill="var(--danger)" opacity={0.35} radius={[2,2,0,0]} barSize={period <= 15 ? 14 : period <= 30 ? 8 : 5}/>
            )}
            {showSaldo && (
              <Area
                type="monotone"
                dataKey="saldo"
                name="saldo"
                stroke="var(--accent)"
                strokeWidth={2.5}
                fill="url(#saldoGrad)"
                dot={period <= 15 ? { r:4, fill:"var(--accent)", strokeWidth:0 } : false}
                activeDot={{ r:6, fill:"var(--accent)", strokeWidth:2, stroke:"var(--bg-secondary)" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legenda */}
        <div style={{ display:"flex", gap:"18px", justifyContent:"center", marginTop:"10px" }}>
          {[
            { c:"var(--accent)",  l:"Saldo projetado", active:showSaldo, type:"line" },
            { c:"var(--success)", l:"Entradas",         active:showRec,   type:"bar" },
            { c:"var(--danger)",  l:"Saídas",           active:showPag,   type:"bar" },
            { c:"var(--warning)", l:"Mínimo seguro",    active:true,      type:"dash" },
          ].map(item => (
            <div key={item.l} style={{ display:"flex", alignItems:"center", gap:"6px", opacity: item.active ? 1 : 0.35 }}>
              {item.type === "line" && <div style={{ width:"20px", height:"3px", background:item.c, borderRadius:"2px" }}/>}
              {item.type === "bar"  && <div style={{ width:"12px", height:"12px", background:item.c, borderRadius:"2px", opacity:0.6 }}/>}
              {item.type === "dash" && <div style={{ width:"20px", height:"0", borderTop:`2px dashed ${item.c}` }}/>}
              <span style={{ fontSize:"11px", color:"var(--text-secondary)" }}>{item.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de eventos */}
      <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", background:"var(--bg-tertiary)" }}>
          <div style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)" }}>Eventos no Período</div>
          <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"1px" }}>Datas com movimentação prevista</div>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid var(--border)" }}>
              {["Data","Entradas","Saídas","Saldo após"].map(h => (
                <th key={h} style={{ padding:"9px 16px", textAlign:h==="Data"?"left":"right", fontSize:"10px", color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.4px", background:"var(--bg-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.filter(d => d.entradas > 0 || d.saidas > 0).map((d, i, arr) => (
              <tr key={d.data}
                style={{ borderBottom: i<arr.length-1 ? "1px solid var(--border)" : "none", background: d.saldo < 200000 ? "rgba(245,158,11,0.04)" : "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                onMouseLeave={e => (e.currentTarget.style.background = d.saldo < 200000 ? "rgba(245,158,11,0.04)" : "transparent")}>
                <td style={{ padding:"10px 16px", fontSize:"12.5px", fontWeight:600, color:"var(--text-primary)" }}>
                  {new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"2-digit" })}
                  {d.saldo < 200000 && <span style={{ marginLeft:"8px", fontSize:"10px", color:"var(--warning)", background:"var(--warning-soft)", padding:"1px 6px", borderRadius:"10px" }}>Atenção</span>}
                </td>
                <td style={{ padding:"10px 16px", textAlign:"right", fontSize:"12.5px", fontWeight:600, color: d.entradas > 0 ? "var(--success)" : "var(--text-muted)" }}>
                  {d.entradas > 0 ? `+ ${R(d.entradas)}` : "—"}
                </td>
                <td style={{ padding:"10px 16px", textAlign:"right", fontSize:"12.5px", fontWeight:600, color: d.saidas > 0 ? "var(--danger)" : "var(--text-muted)" }}>
                  {d.saidas > 0 ? `– ${R(d.saidas)}` : "—"}
                </td>
                <td style={{ padding:"10px 16px", textAlign:"right", fontSize:"13px", fontWeight:800, color: d.saldo < 0 ? "var(--danger)" : d.saldo < 200000 ? "var(--warning)" : "var(--text-primary)" }}>
                  {R(d.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Calendário do Dinheiro ─── */
function MoneyCalendar() {
  const [month, setMonth] = useState(new Date(2026, 4, 1))
  const [selectedDate, setSelectedDate] = useState(TODAY_ISO)
  const saldoBase = 284750
  const safeBalance = 200000
  const days = useMemo(() => buildMoneyCalendar(month, saldoBase), [month])
  const selected = days.find(d => d.date === selectedDate) ?? days.find(d => d.inMonth && d.events.length > 0) ?? days.find(d => d.inMonth) ?? days[0]
  const monthDays = days.filter(d => d.inMonth)
  const totalIn = monthDays.reduce((s, d) => s + d.entradas, 0)
  const totalOut = monthDays.reduce((s, d) => s + d.saidas, 0)
  const finalBalance = monthDays[monthDays.length - 1]?.saldo ?? saldoBase
  const minDay = monthDays.reduce((min, d) => d.saldo < min.saldo ? d : min, monthDays[0])
  const formatDay = (date: string) => new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" })

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
      <div style={{ minWidth:0 }}>
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"16px", overflow:"hidden", boxShadow:"var(--shadow-sm)" }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"9px" }}>
              <CalendarDays size={16} style={{ color:"var(--accent)" }}/>
              <div>
                <div style={{ fontSize:"14px", fontWeight:800, color:"var(--text-primary)" }}>Calendário do dinheiro</div>
                <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"1px" }}>Entradas, saídas e saldo previsto por dia</div>
              </div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px" }}>
              <button onClick={() => setSelectedDate(TODAY_ISO)} style={{ padding:"6px 12px", border:"1px solid var(--border)", borderRadius:"999px", background:"var(--bg-tertiary)", color:"var(--text-secondary)", fontSize:"11px", fontWeight:700, cursor:"pointer" }}>
                Hoje
              </button>
              <button aria-label="Mês anterior" onClick={() => setMonth(m => addMonths(m, -1))} style={{ width:"30px", height:"30px", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid var(--border)", borderRadius:"999px", background:"var(--bg-tertiary)", color:"var(--text-secondary)", cursor:"pointer" }}>
                <ChevronLeft size={15}/>
              </button>
              <div style={{ minWidth:"132px", textAlign:"center", fontSize:"13px", fontWeight:800, color:"var(--text-primary)" }}>
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </div>
              <button aria-label="Próximo mês" onClick={() => setMonth(m => addMonths(m, 1))} style={{ width:"30px", height:"30px", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid var(--border)", borderRadius:"999px", background:"var(--bg-tertiary)", color:"var(--text-secondary)", cursor:"pointer" }}>
                <ChevronRight size={15}/>
              </button>
            </div>
          </div>

          <div style={{ display:"flex", flexWrap:"wrap", gap:"1px", background:"var(--border)", borderBottom:"1px solid var(--border)" }}>
            {[
              { l:"Saldo inicial", v:R(saldoBase), c:"var(--accent)" },
              { l:"Entradas no mês", v:`+ ${R(totalIn)}`, c:"var(--success)" },
              { l:"Saídas no mês", v:`– ${R(totalOut)}`, c:"var(--danger)" },
              { l:"Saldo final", v:R(finalBalance), c: finalBalance < safeBalance ? "var(--warning)" : "var(--text-primary)" },
            ].map(k => (
              <div key={k.l} style={{ background:"var(--bg-secondary)", padding:"12px 14px", flex:"1 1 150px", minWidth:0 }}>
                <div style={{ fontSize:"10px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.45px", marginBottom:"4px" }}>{k.l}</div>
                <div style={{ fontSize:"16px", fontWeight:800, color:k.c }}>{k.v}</div>
              </div>
            ))}
          </div>

          {minDay && minDay.saldo < safeBalance && (
            <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 14px", background:"var(--warning-soft)", borderBottom:"1px solid rgba(245,158,11,0.25)", color:"var(--warning)", fontSize:"12px" }}>
              <AlertTriangle size={14} style={{ flexShrink:0 }}/>
              Menor saldo do mês: <strong>{R(minDay.saldo)}</strong> em <strong>{String(minDay.day).padStart(2, "0")}/{String(month.getMonth() + 1).padStart(2, "0")}</strong>.
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(0,1fr))", borderBottom:"1px solid var(--border)" }}>
            {WEEKDAYS.map(day => (
              <div key={day} style={{ padding:"8px 10px", background:"var(--bg-tertiary)", borderRight:"1px solid var(--border)", fontSize:"10px", color:"var(--text-muted)", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.45px" }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(0,1fr))" }}>
            {days.map((day) => {
              const active = selected?.date === day.date
              const lowBalance = day.inMonth && day.saldo < safeBalance
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  style={{
                    minHeight:"112px",
                    padding:"7px",
                    border:"none",
                    borderRight:"1px solid var(--border)",
                    borderBottom:"1px solid var(--border)",
                    background: active ? "linear-gradient(180deg, rgba(79,70,229,0.16), rgba(79,70,229,0.08))" : day.inMonth ? "var(--bg-secondary)" : "var(--bg-tertiary)",
                    boxShadow: active ? "inset 0 0 0 2px var(--accent), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
                    color:"var(--text-primary)",
                    cursor:"pointer",
                    textAlign:"left",
                    opacity: day.inMonth ? 1 : 0.45,
                    display:"flex",
                    flexDirection:"column",
                    gap:"6px",
                  }}
                >
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"6px" }}>
                    <span style={{ width:"23px", height:"23px", borderRadius:"999px", display:"inline-flex", alignItems:"center", justifyContent:"center", background:day.isToday ? "var(--accent)" : "transparent", color:day.isToday ? "#fff" : "var(--text-primary)", fontSize:"12px", fontWeight:800 }}>
                      {day.day}
                    </span>
                    {lowBalance && <AlertTriangle size={13} style={{ color:"var(--warning)", flexShrink:0 }}/>}
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:"4px", marginTop:"auto" }}>
                    {day.entradas > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", gap:"4px", padding:"4px 7px", borderRadius:"999px", background:"var(--success-soft)", border:"1px solid rgba(16,185,129,0.16)", color:"var(--success)", fontSize:"10px", fontWeight:700, lineHeight:1.15 }}>
                        <span>Entra</span><span>{compactMoney(day.entradas)}</span>
                      </div>
                    )}
                    {day.saidas > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", gap:"4px", padding:"4px 7px", borderRadius:"999px", background:"var(--danger-soft)", border:"1px solid rgba(244,63,94,0.16)", color:"var(--danger)", fontSize:"10px", fontWeight:700, lineHeight:1.15 }}>
                        <span>Sai</span><span>{compactMoney(day.saidas)}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", gap:"4px", padding:"4px 7px", borderRadius:"999px", background: lowBalance ? "var(--warning-soft)" : "var(--bg-tertiary)", border:`1px solid ${lowBalance ? "rgba(245,158,11,0.16)" : "var(--border)"}`, color: lowBalance ? "var(--warning)" : "var(--text-secondary)", fontSize:"10px", fontWeight:700, lineHeight:1.15 }}>
                      <span>Saldo</span><span>{compactMoney(day.saldo)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <aside style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"16px", overflow:"hidden", boxShadow:"var(--shadow-sm)" }}>
        <div style={{ padding:"15px 16px", background:"var(--bg-tertiary)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"16px", flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:"12px", color:"var(--text-muted)", textTransform:"capitalize" }}>{selected ? formatDay(selected.date) : ""}</div>
            <div style={{ fontSize:"20px", fontWeight:900, color:selected && selected.saldo < safeBalance ? "var(--warning)" : "var(--text-primary)", marginTop:"2px" }}>
              {selected ? R(selected.saldo) : R(saldoBase)}
            </div>
            <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>Saldo previsto ao fim do dia</div>
          </div>
          {selected && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", minWidth:"260px" }}>
              <div style={{ padding:"10px", background:"var(--success-soft)", border:"1px solid rgba(16,185,129,0.18)", borderRadius:"8px" }}>
                <div style={{ fontSize:"10px", color:"var(--success)", textTransform:"uppercase", fontWeight:800 }}>Entradas</div>
                <div style={{ fontSize:"15px", color:"var(--success)", fontWeight:900 }}>{R(selected.entradas)}</div>
              </div>
              <div style={{ padding:"10px", background:"var(--danger-soft)", border:"1px solid rgba(244,63,94,0.18)", borderRadius:"8px" }}>
                <div style={{ fontSize:"10px", color:"var(--danger)", textTransform:"uppercase", fontWeight:800 }}>Saídas</div>
                <div style={{ fontSize:"15px", color:"var(--danger)", fontWeight:900 }}>{R(selected.saidas)}</div>
              </div>
            </div>
          )}
        </div>
        {selected && (
          <div style={{ padding:"14px 16px", display:"grid", gap:"10px" }}>
            <div>
              <div style={{ fontSize:"11px", color:"var(--text-muted)", textTransform:"uppercase", fontWeight:800, letterSpacing:"0.45px", marginBottom:"8px" }}>Movimentos do dia</div>
              {selected.events.length === 0 ? (
                <div style={{ padding:"16px", border:"1px dashed var(--border)", borderRadius:"8px", color:"var(--text-muted)", fontSize:"12px", textAlign:"center" }}>
                  Nenhum movimento previsto.
                </div>
              ) : selected.events.map((event, i) => (
                <div key={`${event.title}-${i}`} style={{ padding:"10px 0", borderBottom:i < selected.events.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:"10px", alignItems:"flex-start" }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:"12px", fontWeight:700, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{event.title}</div>
                      <div style={{ fontSize:"10.5px", color:"var(--text-muted)", marginTop:"1px" }}>{event.account} · {event.status}</div>
                    </div>
                    <div style={{ fontSize:"12px", fontWeight:900, color:event.type === "in" ? "var(--success)" : "var(--danger)", whiteSpace:"nowrap" }}>
                      {event.type === "in" ? "+" : "–"} {R(event.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

/* ─── Formulário de Lançar Projeção ─── */
const initialProj = [
  { id:"1", semana:"Mai S4 (26/05–31/05)", entradas:48000, saidas:22000, obs:"Recebimento J. Silva",      tipo:"previsto" },
  { id:"2", semana:"Jun S1 (02/06–07/06)", entradas:12000, saidas:98400, obs:"Folha de pagamento junho",  tipo:"fixo" },
  { id:"3", semana:"Jun S2 (09/06–14/06)", entradas:0,     saidas:8400,  obs:"Aluguel",                   tipo:"fixo" },
  { id:"4", semana:"Jun S3 (16/06–21/06)", entradas:50000, saidas:6800,  obs:"Parcial Const. Beta",        tipo:"previsto" },
  { id:"5", semana:"Jun S4 (23/06–28/06)", entradas:0,     saidas:12400, obs:"Aço Nordeste parcela 4",    tipo:"fixo" },
]

function ProjecaoForm() {
  const [rows, setRows] = useState(initialProj)
  const [saved, setSaved] = useState(false)

  function update(id: string, field: string, val: any) {
    setRows(prev => prev.map(r => r.id===id ? {...r,[field]:val} : r))
    setSaved(false)
  }

  function addRow() {
    const newId = String(Date.now())
    setRows(prev => [...prev, { id:newId, semana:"", entradas:0, saidas:0, obs:"", tipo:"previsto" }])
  }

  const saldoInicial = 284750
  let saldoAcum = saldoInicial

  const inp: React.CSSProperties = {
    width:"100%", padding:"6px 9px",
    background:"var(--bg-tertiary)", border:"1px solid var(--border)",
    borderRadius:"5px", fontSize:"12px", color:"var(--text-primary)",
    outline:"none", fontFamily:"inherit",
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
      {/* Info banner */}
      <div style={{ padding:"12px 16px", background:"var(--accent-soft)", border:"1px solid rgba(79,70,229,0.25)", borderRadius:"var(--radius)", fontSize:"12px", color:"var(--accent)" }}>
        <strong>Projeção manual de caixa</strong> — preencha as entradas e saídas previstas por semana. Após salvar, o gráfico de projeção será atualizado com os dados informados, permitindo comparação com o realizado.
      </div>

      <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden" }}>
        {/* Cabeçalho */}
        <div style={{ padding:"12px 16px", background:"var(--bg-tertiary)", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)" }}>Lançar Projeção de Caixa</span>
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={addRow} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"6px 12px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"11.5px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
              <Plus size={12}/> Adicionar semana
            </button>
            <button onClick={()=>setSaved(true)} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"6px 14px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"11.5px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              Salvar projeção
            </button>
          </div>
        </div>

        {saved && (
          <div style={{ padding:"10px 16px", background:"var(--success-soft)", borderBottom:"1px solid rgba(16,185,129,0.2)", fontSize:"12px", color:"var(--success)", fontWeight:600 }}>
            Projeção salva com sucesso — gráfico atualizado.
          </div>
        )}

        {/* Tabela de entrada */}
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)", borderBottom:"2px solid var(--border)" }}>
              {["Período / Semana","Tipo","Entradas (R$)","Saídas (R$)","Saldo Projetado","Observações",""].map(h=>(
                <th key={h} style={{ padding:"9px 14px",textAlign:"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              saldoAcum = saldoAcum + row.entradas - row.saidas
              const saldo = saldoAcum
              const saldoColor = saldo < 0 ? "var(--danger)" : saldo < 150000 ? "var(--warning)" : "var(--success)"
              return (
                <tr key={row.id} style={{ borderBottom:"1px solid var(--border)" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"8px 14px" }}>
                    <input value={row.semana} onChange={e=>update(row.id,"semana",e.target.value)} style={{ ...inp, width:"190px" }} placeholder="Ex: Jun S1 (02/06–07/06)"/>
                  </td>
                  <td style={{ padding:"8px 14px" }}>
                    <select value={row.tipo} onChange={e=>update(row.id,"tipo",e.target.value)} style={{ ...inp, width:"110px" }}>
                      <option value="previsto">Previsto</option>
                      <option value="fixo">Fixo</option>
                      <option value="variavel">Variável</option>
                      <option value="eventual">Eventual</option>
                    </select>
                  </td>
                  <td style={{ padding:"8px 14px" }}>
                    <input type="number" value={row.entradas} onChange={e=>update(row.id,"entradas",+e.target.value)} style={{ ...inp, width:"120px", color:"var(--success)" }}/>
                  </td>
                  <td style={{ padding:"8px 14px" }}>
                    <input type="number" value={row.saidas} onChange={e=>update(row.id,"saidas",+e.target.value)} style={{ ...inp, width:"120px", color:"var(--danger)" }}/>
                  </td>
                  <td style={{ padding:"8px 14px" }}>
                    <span style={{ fontSize:"13px",fontWeight:800,color:saldoColor }}>
                      {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:0}).format(saldo)}
                    </span>
                    {saldo < 150000 && <div style={{ fontSize:"9px",color:"var(--warning)",marginTop:"1px" }}>Abaixo do mínimo seguro</div>}
                  </td>
                  <td style={{ padding:"8px 14px" }}>
                    <input value={row.obs} onChange={e=>update(row.id,"obs",e.target.value)} style={{ ...inp, width:"180px" }} placeholder="Referência / motivo"/>
                  </td>
                  <td style={{ padding:"8px 14px" }}>
                    <button onClick={()=>setRows(prev=>prev.filter(r=>r.id!==row.id))} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--danger-soft)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--danger)" }}>
                      <TrendingDown size={11}/>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Resumo */}
        <div style={{ padding:"12px 16px",borderTop:"2px solid var(--border)",background:"var(--bg-tertiary)",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px" }}>
          {[
            { l:"Saldo inicial",      v:saldoInicial, c:"var(--accent)" },
            { l:"Total entradas prev.",v:rows.reduce((s,r)=>s+r.entradas,0), c:"var(--success)" },
            { l:"Total saídas prev.", v:rows.reduce((s,r)=>s+r.saidas,0),   c:"var(--danger)" },
            { l:"Saldo final projetado",v:saldoAcum,  c:saldoAcum<0?"var(--danger)":"var(--accent)" },
          ].map(k=>(
            <div key={k.l}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"2px" }}>{k.l}</div>
              <div style={{ fontSize:"15px",fontWeight:800,color:k.c }}>
                {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:0}).format(k.v)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CashflowPage() {
  const [tab, setTab] = useState(0)
  const { range } = useDateRange()

  const totalEntradas = cashflowTransactions.filter(t=>t.entrada).reduce((s,t)=>s+(t.entrada||0),0)
  const totalSaidas   = cashflowTransactions.filter(t=>t.saida).reduce((s,t)=>s+(t.saida||0),0)
  const saldoInicial  = 295400
  const saldoFinal    = saldoInicial + totalEntradas - totalSaidas
  const menorSaldo    = 162400

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"18px" }}>
        <div>
          <h1 style={{ fontSize:"20px", fontWeight:800, color:"var(--text-primary)", letterSpacing:"-0.4px" }}>Fluxo de Caixa</h1>
          <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>{range.label}</div>
        </div>
        <div style={{ display:"flex", gap:"6px" }}>
          <button style={{ display:"flex", alignItems:"center", gap:"5px", padding:"7px 13px", background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"7px", fontSize:"12px", color:"var(--text-secondary)", cursor:"pointer" }}>
            <Download size={13}/> Exportar
          </button>
          <Link href="/transactions" style={{
            display:"flex", alignItems:"center", gap:"5px", padding:"7px 14px",
            background:"var(--accent)", border:"none", borderRadius:"7px",
            fontSize:"12px", color:"#fff", fontWeight:700, textDecoration:"none",
          }}>
            <Plus size={13}/> Novo lançamento
          </Link>
        </div>
      </div>

      {/* Warning */}
      {menorSaldo < 200000 && (
        <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 16px", background:"var(--warning-soft)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:"var(--radius)", marginBottom:"16px" }}>
          <AlertTriangle size={15} style={{ color:"var(--warning)", flexShrink:0 }}/>
          <span style={{ fontSize:"12px", color:"var(--warning)" }}>
            Saldo mínimo projetado de <strong>{R(menorSaldo)}</strong> na semana de 24/06. Considere antecipar recebimentos.
          </span>
          <Link href="/bi?tab=projecao" style={{ marginLeft:"auto", fontSize:"11px", color:"var(--warning)", fontWeight:700, textDecoration:"none", flexShrink:0 }}>Ver projeção →</Link>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px", marginBottom:"16px" }}>
        {[
          { l:"Saldo Inicial",    v:R(saldoInicial), sub:"01/05/2026",        c:"var(--text-primary)" },
          { l:"Total Entradas",   v:R(totalEntradas), sub:`${cashflowTransactions.filter(t=>t.entrada).length} lançamentos`, c:"var(--success)" },
          { l:"Total Saídas",     v:R(totalSaidas),   sub:`${cashflowTransactions.filter(t=>t.saida).length} lançamentos`,  c:"var(--danger)" },
          { l:"Saldo Final",      v:R(saldoFinal),    sub:"Até hoje",          c:"var(--accent)" },
          { l:"Menor Projetado",  v:R(menorSaldo),    sub:"Semana 24/06",      c:"var(--warning)" },
        ].map(c=>(
          <div key={c.l} style={{ background:"var(--bg-secondary)", border:`1px solid ${c.c}28`, borderLeft:`3px solid ${c.c}`, borderRadius:"var(--radius)", padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>{c.l}</div>
            <div style={{ fontSize:"18px",fontWeight:800,color:c.c }}>{c.v}</div>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"3px" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"1px", background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"3px", marginBottom:"14px" }}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)} style={{
            flex:"1 1 118px", padding:"8px 12px", borderRadius:"8px", border:"none",
            background: tab===i ? "var(--bg-tertiary)" : "transparent",
            color: tab===i ? "var(--text-primary)" : "var(--text-secondary)",
            fontSize:"12px", fontWeight: tab===i ? 700 : 400,
            cursor:"pointer", fontFamily:"inherit",
            boxShadow: tab===i ? "var(--shadow-sm)" : "none",
          }}>{t}</button>
        ))}
      </div>

      {/* ─── Demonstrativo ─── */}
      {tab===0 && (
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden" }}>
          {/* Table header */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 130px 130px 120px 120px 130px",
            padding:"10px 16px 10px 40px",
            background:"var(--bg-tertiary)",
            borderBottom:"2px solid var(--border)",
          }}>
            {["Descrição","Categoria","Entrada","Saída","Conta","Saldo"].map(h=>(
              <div key={h} style={{ fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",textAlign:["Entrada","Saída","Saldo"].includes(h)?"right":"left" }}>{h}</div>
            ))}
          </div>
          {Object.entries(grouped).sort(([a],[b])=>b.localeCompare(a)).map(([date,rows])=>(
            <DayGroup key={date} date={date} rows={rows}/>
          ))}
          {/* Totals footer */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 130px 130px 120px 120px 130px", padding:"12px 16px 12px 40px", background:"var(--bg-elevated)", borderTop:"2px solid var(--border)" }}>
            <div style={{ fontSize:"12px",fontWeight:700,color:"var(--text-primary)" }}>Total do Período</div>
            <div/>
            <div style={{ textAlign:"right",fontSize:"13px",fontWeight:800,color:"var(--success)" }}>+ {R(totalEntradas)}</div>
            <div style={{ textAlign:"right",fontSize:"13px",fontWeight:800,color:"var(--danger)"  }}>– {R(totalSaidas)}</div>
            <div/>
            <div style={{ textAlign:"right",fontSize:"13px",fontWeight:800,color:"var(--accent)" }}>{R(saldoFinal)}</div>
          </div>
        </div>
      )}

      {/* ─── Projetado ─── */}
      {tab===1 && (
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden" }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:"10px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Projeção — Próximas semanas</span>
            <span style={{ fontSize:"11px",color:"var(--text-muted)",marginLeft:"auto" }}>Inclui lançamentos futuros em aberto</span>
          </div>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"var(--bg-tertiary)", borderBottom:"2px solid var(--border)" }}>
                {["Período","Entradas","Saídas","Saldo Realizado","Saldo Projetado","Status"].map(h=>(
                  <th key={h} style={{ padding:"10px 14px",textAlign:h==="Período"||h==="Status"?"left":"right",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cashflowProjection.map((r,i)=>(
                <tr key={r.semana} style={{ borderBottom:"1px solid var(--border)" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"11px 14px",fontSize:"12px",color:"var(--text-primary)",fontWeight:500 }}>{r.semana}</td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"12px",color:"var(--success)",fontWeight:600 }}>
                    {r.realizado ? `+ ${R(Math.round(r.projetado*0.12))}` : `+ ${R(Math.round((r.projetado||0)*0.14))}`}
                  </td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"12px",color:"var(--danger)",fontWeight:600 }}>
                    {`– ${R(Math.round((r.projetado||280000)*0.1))}`}
                  </td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color: r.realizado ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {r.realizado ? R(r.realizado) : "—"}
                  </td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:(r.projetado||0)<200000?"var(--warning)":"var(--text-primary)" }}>
                    {R(r.projetado||0)}
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    {r.realizado ? (
                      <span style={{ fontSize:"10px",fontWeight:700,color:"var(--success)",background:"var(--success-soft)",padding:"2px 8px",borderRadius:"20px" }}>Realizado</span>
                    ) : (
                      <span style={{ fontSize:"10px",fontWeight:700,color:"var(--accent)",background:"var(--accent-soft)",padding:"2px 8px",borderRadius:"20px" }}>Projetado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Projeção Diária ─── */}
      {tab===2 && <ProjecaoDiaria/>}

      {/* ─── Calendário ─── */}
      {tab===3 && <MoneyCalendar/>}

      {/* ─── Lançar Projeção ─── */}
      {tab===4 && <ProjecaoForm/>}

      {/* ─── Caixa vs Competência ─── */}
      {tab===5 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
          {[
            { titulo:"Regime de Caixa",       sub:"Data de pagamento/recebimento",
              rows:[
                { l:"Entradas realizadas", v:totalEntradas, c:"var(--success)" },
                { l:"Saídas realizadas",   v:-totalSaidas,  c:"var(--danger)" },
                { l:"Saldo do período",    v:saldoFinal-saldoInicial, c:"var(--accent)", bold:true },
                { l:"A Receber",           v:113500, c:"var(--warning)" },
                { l:"A Pagar",             v:-103200, c:"var(--warning)" },
                { l:"Saldo projetado",     v:312400, c:"var(--accent)", bold:true },
              ]},
            { titulo:"Regime de Competência", sub:"Data de geração do fato econômico",
              rows:[
                { l:"Receita bruta",       v:312000, c:"var(--success)" },
                { l:"(–) Deduções",        v:-18096, c:"var(--danger)" },
                { l:"Receita líquida",     v:293904, c:"var(--text-primary)" },
                { l:"(–) Custos variáveis",v:-176800, c:"var(--danger)" },
                { l:"Margem contribuição", v:117104, c:"var(--accent)", bold:true },
                { l:"(–) Despesas fixas",  v:-55700, c:"var(--danger)" },
                { l:"Resultado operacional",v:61404, c:"var(--accent)", bold:true },
                { l:"(–) Desp. financeiras",v:-17200, c:"var(--danger)" },
                { l:"(–) Retiradas sócios", v:-25804, c:"var(--warning)" },
                { l:"LUCRO LÍQUIDO",        v:18400, c:"var(--success)", bold:true },
              ]},
          ].map(p=>(
            <div key={p.titulo} style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden" }}>
              <div style={{ padding:"16px 18px", borderBottom:"1px solid var(--border)", background:"var(--bg-tertiary)" }}>
                <div style={{ fontSize:"14px",fontWeight:800,color:"var(--text-primary)" }}>{p.titulo}</div>
                <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{p.sub}</div>
              </div>
              <div style={{ padding:"0" }}>
                {p.rows.map((r,i)=>(
                  <div key={i} style={{
                    display:"flex", justifyContent:"space-between",
                    padding:"11px 18px",
                    borderBottom: i<p.rows.length-1 ? "1px solid var(--border)" : "none",
                    background: (r as any).bold ? "var(--bg-tertiary)" : "transparent",
                  }}>
                    <span style={{ fontSize:"12.5px",color:(r as any).bold?"var(--text-primary)":"var(--text-secondary)",fontWeight:(r as any).bold?700:400 }}>{r.l}</span>
                    <span style={{ fontSize:"13px",fontWeight:(r as any).bold?800:600,color:r.v>=0?r.c:"var(--danger)" }}>
                      {r.v>=0?"+":""}{R(r.v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Gráfico ─── */}
      {tab===6 && (
        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Saldo Realizado + Projetado</div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={cashflowProjection}>
                <defs>
                  <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="semana" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<Tip/>}/>
                <ReferenceLine y={200000} stroke="var(--warning)" strokeDasharray="4 3" label={{value:"Mínimo seguro",fill:"var(--warning)",fontSize:10}}/>
                <Area type="monotone" dataKey="projetado" name="Projetado" stroke="var(--accent)"  fill="url(#cfGrad)" strokeWidth={2} strokeDasharray="6 4"/>
                <Line type="monotone" dataKey="realizado" name="Realizado" stroke="var(--success)" strokeWidth={2.5} dot={{r:5,fill:"var(--success)"}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Entradas vs Saídas — Mês a Mês</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueExpenseData.slice(-6)} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="mes" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="receita" name="Entradas" fill="var(--success)" radius={[4,4,0,0]}/>
                <Bar dataKey="despesa" name="Saídas"   fill="var(--danger)"  radius={[4,4,0,0]} opacity={0.75}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
