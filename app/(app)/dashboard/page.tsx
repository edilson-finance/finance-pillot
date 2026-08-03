"use client"

import {
  BarChart, Bar, AreaChart, Area, ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts"
import { TrendingUp, TrendingDown, AlertCircle, AlertTriangle, Info, Minus } from "lucide-react"
import Link from "next/link"
import { useDateRange } from "@/lib/date-context"
import { daysBetween } from "@/lib/date-utils"
import { useKpis, useRevenueSeries, useTopClients, useTopExpenses, useHealthDimensions, useCashflow } from "@/lib/analytics-client"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-strong)", borderRadius:"9px", padding:"10px 14px", fontSize:"12px", boxShadow:"var(--shadow-lg)" }}>
      <div style={{ color:"var(--text-secondary)", marginBottom:"6px", fontWeight:700 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:"16px", marginBottom:"3px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
            <div style={{ width:"7px",height:"7px",borderRadius:"2px",background:p.color,flexShrink:0 }}/>
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

function KpiCard({ label, value, sub, trend, color, href }: any) {
  const TrendIcon = trend==="up" ? TrendingUp : trend==="down" ? TrendingDown : Minus
  const tColor = trend==="up" ? "var(--success)" : trend==="down" ? "var(--danger)" : "var(--text-muted)"
  const card = (
    <div style={{
      background:"var(--bg-secondary)", border:`1px solid ${color ? color+"28":"var(--border)"}`,
      borderRadius:"var(--radius)", padding:"16px", position:"relative", overflow:"hidden",
      cursor:href?"pointer":"default", transition:"border-color 0.15s",
    }}
    onMouseEnter={e => href && ((e.currentTarget as HTMLElement).style.borderColor = color||"var(--border-strong)")}
    onMouseLeave={e => href && ((e.currentTarget as HTMLElement).style.borderColor = color ? color+"28":"var(--border)")}>
      {color && <div style={{ position:"absolute",top:0,left:0,width:"3px",height:"100%",background:color }}/>}
      <div style={{ fontSize:"10.5px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:"10px",paddingLeft:color?"8px":0 }}>{label}</div>
      <div style={{ fontSize:"21px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.5px",lineHeight:1,paddingLeft:color?"8px":0 }}>{value}</div>
      {sub && (
        <div style={{ fontSize:"11px",marginTop:"7px",color:tColor,display:"flex",alignItems:"center",gap:"3px",paddingLeft:color?"8px":0 }}>
          <TrendIcon size={11}/>{sub}
        </div>
      )}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration:"none" }}>{card}</Link> : card
}

type DashAlert = { id: string; severity: "critical" | "warning" | "info"; title: string; message: string }

function deriveAlerts(kpis: {
  inadimplencia: number; aReceberVencido: number; aPagarVencido: number; saldoProjetado: number; faturamentoVar: number
}): DashAlert[] {
  const out: DashAlert[] = []
  if (kpis.saldoProjetado < 0)
    out.push({ id: "cx", severity: "critical", title: "Caixa negativo projetado", message: `O saldo projetado para os próximos 30 dias está negativo em ${R(Math.abs(kpis.saldoProjetado))}. Reveja recebimentos e despesas.` })
  if (kpis.inadimplencia > 5)
    out.push({ id: "inad", severity: "warning", title: "Inadimplência acima do limite", message: `Taxa de ${kpis.inadimplencia}% (${R(kpis.aReceberVencido)} em atraso). O limite saudável é 5%.` })
  if (kpis.aPagarVencido > 0)
    out.push({ id: "pag", severity: "warning", title: "Contas a pagar vencidas", message: `Há ${R(kpis.aPagarVencido)} em contas a pagar já vencidas. Verifique o caixa disponível.` })
  if (kpis.faturamentoVar < 0)
    out.push({ id: "fat", severity: "info", title: "Faturamento em queda", message: `Faturamento ${kpis.faturamentoVar}% vs período anterior. Acompanhe a recuperação de receita.` })
  if (out.length === 0)
    out.push({ id: "ok", severity: "info", title: "Sem alertas críticos", message: "Os indicadores estão dentro dos limites saudáveis para o período." })
  return out
}

function AlertChip({ item }: { item: DashAlert }) {
  const map = {
    critical:{ bg:"var(--danger-soft)",  border:"var(--danger)",  icon:AlertCircle,  c:"var(--danger)" },
    warning: { bg:"var(--warning-soft)", border:"var(--warning)", icon:AlertTriangle, c:"var(--warning)" },
    info:    { bg:"var(--accent-soft)",  border:"var(--accent)",  icon:Info,         c:"var(--accent)" },
  }
  const s = map[item.severity as keyof typeof map]
  const Icon = s.icon
  return (
    <Link href="/alerts" style={{ textDecoration:"none" }}>
      <div style={{ background:s.bg,borderLeft:`3px solid ${s.border}`,borderRadius:"8px",padding:"9px 12px",display:"flex",gap:"8px",cursor:"pointer",marginBottom:"6px" }}>
        <Icon size={13} style={{ color:s.c,flexShrink:0,marginTop:"1px" }}/>
        <div>
          <div style={{ fontSize:"12px",fontWeight:700,color:"var(--text-primary)",marginBottom:"2px" }}>{item.title}</div>
          <div style={{ fontSize:"11px",color:"var(--text-secondary)",lineHeight:1.4 }}>{item.message}</div>
        </div>
      </div>
    </Link>
  )
}

const PIE_COLORS = ["var(--accent)","var(--success)","var(--purple)","var(--warning)","var(--text-muted)"]
const IN_COLORS = ["var(--accent)","var(--success)","var(--purple)"]
const OUT_COLORS = ["var(--danger)","var(--warning)","var(--purple)"]

function compactCurrency(value: number) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`
  return R(value)
}

export default function DashboardPage() {
  const { range } = useDateRange()
  const { kpis, loading } = useKpis(range)
  const { series } = useRevenueSeries(range)
  const { rows: topClients } = useTopClients(range)
  const { rows: topExpenses } = useTopExpenses(range)
  const { rows: cashRows } = useCashflow(range)
  const { dims: healthDimensions } = useHealthDimensions()

  // Enquanto os KPIs carregam, mostra um spinner em vez de piscar R$ 0 (antes a
  // tela renderizava zerada e "saltava" para os valores reais).
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "60vh" }}>
        <div className="fp-spin" style={{ width: "28px", height: "28px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
      </div>
    )
  }

  const days   = daysBetween(range.start, range.end)
  const healthScore = healthDimensions.length ? parseFloat((healthDimensions.reduce((s,d)=>s+d.nota,0)/healthDimensions.length).toFixed(1)) : 0
  const liquidoSeries = series.map(d => ({ ...d, liquido: d.receita - d.despesa }))

  const cashInDrivers = topClients.slice(0, 3).map((c, i) => ({ nome: c.nome, valor: c.valor, percent: c.percent, detalhe: "Entrada por cliente", cor: IN_COLORS[i] }))
  const cashOutDrivers = topExpenses.slice(0, 3).map((c, i) => ({ nome: c.nome, valor: c.valor, percent: c.percent, detalhe: "Saída por categoria", cor: OUT_COLORS[i] }))
  const topClient = topClients[0]
  const topExpense = topExpenses[0]
  const top3Concent = topClients.slice(0, 3).reduce((s, c) => s + c.percent, 0)
  const alerts = deriveAlerts(kpis)

  const cashProj: { semana: string; realizado: number | null; projetado: number }[] =
    cashRows.slice(-8).map((r) => ({
      semana: new Date(r.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      realizado: r.saldo,
      projetado: r.saldo,
    }))
  if (cashProj.length) cashProj.push({ semana: "Proj. 30d", realizado: null, projetado: kpis.saldoProjetado })

  return (
    <div style={{ padding:"22px", maxWidth:"1600px" }}>

      {/* Status bar */}
      <div className="dash-status" style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.08),rgba(244,63,94,0.06))", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"var(--radius)", padding:"11px 18px", display:"flex", alignItems:"center", gap:"14px", marginBottom:"18px", flexWrap:"wrap" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"6px",padding:"3px 10px",background:"var(--warning-soft)",border:"1px solid var(--warning)",borderRadius:"20px",fontSize:"11px",fontWeight:700,color:"var(--warning)",flexShrink:0 }}>
          <span style={{ width:"6px",height:"6px",background:"var(--warning)",borderRadius:"50%",display:"inline-block" }}/>
          Atenção — {healthScore}/10
        </div>
        <span style={{ fontSize:"12px",color:"var(--text-secondary)",flex:"1 1 220px",minWidth:0 }}>
          Inadimplência em {kpis.inadimplencia}%{topClient ? `, concentração de receita (${topClient.nome} = ${topClient.percent.toFixed(0)}%)` : ""} e atenção ao caixa projetado.
        </span>
        <div className="dash-status-actions" style={{ display:"flex",alignItems:"center",gap:"14px",flexShrink:0,marginLeft:"auto" }}>
          <Link href="/diagnostic" style={{ fontSize:"12px",color:"var(--warning)",textDecoration:"none",fontWeight:600,whiteSpace:"nowrap" }}>Ver diagnóstico →</Link>
          <span style={{ fontSize:"11px",color:"var(--text-muted)",borderLeft:"1px solid var(--border)",paddingLeft:"14px",whiteSpace:"nowrap" }}>{range.label}</span>
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="kpi-grid" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"12px" }}>
        <KpiCard label="Saldo Atual"          value={R(kpis.saldoAtual)}     sub="Todas as contas"                color="var(--accent)"  href="/cashflow" />
        <KpiCard label="Faturamento"          value={R(kpis.faturamento)}    sub={`+${kpis.faturamentoVar}% vs anterior`} trend="up" color="var(--success)" href="/bi" />
        <KpiCard label="Lucro Líquido"        value={R(kpis.lucroLiquido)}   sub={`Margem ${kpis.lucroMargin}%`} trend="down" color="var(--warning)" href="/dre" />
        <KpiCard label="Margem Contribuição"  value={`${kpis.margemContribuicao}%`} sub="Ideal: acima de 35%" color="var(--success)" href="/dre" />
      </div>

      {/* KPI Row 2 */}
      <div className="kpi-grid" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"18px" }}>
        <KpiCard label="A Receber"     value={R(kpis.aReceber)}     sub={`${R(kpis.aReceberVencido)} em atraso`} trend="down" color="var(--warning)" href="/receivables" />
        <KpiCard label="A Pagar"       value={R(kpis.aPagar)}       sub={`${R(kpis.aPagarVencido)} vencido`}    trend="down" color="var(--danger)"  href="/payables" />
        <KpiCard label="Inadimplência" value={`${kpis.inadimplencia}%`} sub="Limite saudável: 5%"               trend="down" color="var(--danger)"  href="/delinquent" />
        <KpiCard label="Despesa"       value={R(kpis.despesaTotal)} sub={`${((kpis.despesaTotal/Math.max(kpis.faturamento,1))*100).toFixed(1)}% da receita`} trend="down" color="var(--danger)" href="/dre" />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:"14px",marginBottom:"14px" }}>
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px" }}>
            <div>
              <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Receitas vs Despesas</div>
              <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"1px" }}>{range.label} · {series.length} períodos</div>
            </div>
            <Link href="/bi" style={{ fontSize:"11px",color:"var(--accent)",textDecoration:"none" }}>BI completo →</Link>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={series} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<Tip/>}/>
              <Bar dataKey="receita" name="Receita" fill="var(--success)" radius={[3,3,0,0]}/>
              <Bar dataKey="despesa" name="Despesa" fill="var(--danger)"  radius={[3,3,0,0]} opacity={0.75}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Valor Líquido</div>
            <Link href="/bi" style={{ fontSize:"11px",color:"var(--accent)",textDecoration:"none" }}>BI →</Link>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={liquidoSeries}>
              <defs>
                <linearGradient id="liqG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<Tip/>}/>
              <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="4 4"/>
              <Area type="monotone" dataKey="liquido" name="Valor Líquido" stroke="var(--accent)" fill="url(#liqG)" strokeWidth={2.5} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"14px",marginBottom:"14px" }}>
        {/* Projeção de caixa */}
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Projeção de Caixa</div>
            <Link href="/cashflow" style={{ fontSize:"11px",color:"var(--accent)",textDecoration:"none" }}>Ver →</Link>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={cashProj}>
              <defs>
                <linearGradient id="cfMini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="semana" tick={{fill:"var(--text-muted)",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<Tip/>}/>
              <Area type="monotone" dataKey="realizado" name="Realizado" stroke="var(--success)" fill="none" strokeWidth={2}/>
              <Area type="monotone" dataKey="projetado" name="Projetado" stroke="var(--accent)" fill="url(#cfMini)" strokeWidth={2} strokeDasharray="5 4"/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display:"flex",justifyContent:"space-between",marginTop:"8px" }}>
            <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>Saldo projetado 30d</span>
            <span style={{ fontSize:"12px",fontWeight:700,color:"var(--accent)" }}>{R(kpis.saldoProjetado)}</span>
          </div>
        </div>

        {/* Motores do Caixa */}
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
            <div>
              <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Motores do Caixa</div>
              <div style={{ fontSize:"10.5px",color:"var(--text-muted)",marginTop:"1px" }}>Origem das entradas e destino das saídas</div>
            </div>
            <Link href="/bi" style={{ fontSize:"11px",color:"var(--accent)",textDecoration:"none" }}>Ver →</Link>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px" }}>
            <div style={{ background:"var(--success-soft)",border:"1px solid rgba(16,185,129,0.18)",borderRadius:"8px",padding:"9px" }}>
              <div style={{ fontSize:"9.5px",color:"var(--success)",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.4px" }}>Melhor entrada</div>
              <div style={{ fontSize:"13px",fontWeight:800,color:"var(--text-primary)",marginTop:"3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{topClient?.nome ?? "—"}</div>
              <div style={{ fontSize:"11px",fontWeight:700,color:"var(--success)" }}>{R(topClient?.valor ?? 0)}</div>
            </div>
            <div style={{ background:"var(--danger-soft)",border:"1px solid rgba(244,63,94,0.18)",borderRadius:"8px",padding:"9px" }}>
              <div style={{ fontSize:"9.5px",color:"var(--danger)",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.4px" }}>Maior saída</div>
              <div style={{ fontSize:"13px",fontWeight:800,color:"var(--text-primary)",marginTop:"3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{topExpense?.nome ?? "—"}</div>
              <div style={{ fontSize:"11px",fontWeight:700,color:"var(--danger)" }}>{R(topExpense?.valor ?? 0)}</div>
            </div>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
            <div>
              <div style={{ fontSize:"10px",fontWeight:800,color:"var(--success)",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:"7px" }}>Entradas</div>
              {cashInDrivers.map(c=>(
                <div key={c.nome} style={{ marginBottom:"9px" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",gap:"8px",marginBottom:"3px",alignItems:"flex-start" }}>
                    <span style={{ fontSize:"11px",color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.nome}</span>
                    <span style={{ fontSize:"10.5px",color:"var(--text-secondary)",flexShrink:0,textAlign:"right",lineHeight:1.25 }}>
                      {c.percent.toFixed(1)}%<br/>
                      <strong style={{ color:"var(--text-primary)" }}>{compactCurrency(c.valor)}</strong>
                    </span>
                  </div>
                  <div style={{ background:"var(--bg-tertiary)",borderRadius:"999px",height:"5px",overflow:"hidden" }}>
                    <div style={{ height:"100%",borderRadius:"999px",background:c.cor,width:`${c.percent}%` }}/>
                  </div>
                  <div style={{ fontSize:"9.5px",color:"var(--text-muted)",marginTop:"3px" }}>{c.detalhe}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:"10px",fontWeight:800,color:"var(--danger)",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:"7px" }}>Saídas</div>
              {cashOutDrivers.map(c=>(
                <div key={c.nome} style={{ marginBottom:"9px" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",gap:"8px",marginBottom:"3px",alignItems:"flex-start" }}>
                    <span style={{ fontSize:"11px",color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.nome}</span>
                    <span style={{ fontSize:"10.5px",color:"var(--text-secondary)",flexShrink:0,textAlign:"right",lineHeight:1.25 }}>
                      {c.percent.toFixed(1)}%<br/>
                      <strong style={{ color:"var(--text-primary)" }}>{compactCurrency(c.valor)}</strong>
                    </span>
                  </div>
                  <div style={{ background:"var(--bg-tertiary)",borderRadius:"999px",height:"5px",overflow:"hidden" }}>
                    <div style={{ height:"100%",borderRadius:"999px",background:c.cor,width:`${c.percent}%` }}/>
                  </div>
                  <div style={{ fontSize:"9.5px",color:"var(--text-muted)",marginTop:"3px" }}>{c.detalhe}</div>
                </div>
              ))}
            </div>
          </div>

          <Link href="/bi" style={{ display:"block",marginTop:"8px",padding:"7px 9px",background:"var(--accent-soft)",borderRadius:"8px",textDecoration:"none" }}>
            <span style={{ fontSize:"10.5px",color:"var(--accent)",fontWeight:700 }}>Ver análise por categoria, produto, serviço e cliente →</span>
          </Link>
        </div>

        {/* Alertas */}
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Alertas Ativos</div>
            <Link href="/alerts" style={{ fontSize:"11px",color:"var(--accent)",textDecoration:"none" }}>Ver todos →</Link>
          </div>
          {alerts.map(a => <AlertChip key={a.id} item={a}/>)}
        </div>
      </div>

      {/* Revenue concentration */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px" }}>
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
            <div>
              <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Concentração por Cliente</div>
              <div style={{ fontSize:"10.5px",color:"var(--text-muted)",marginTop:"1px" }}>Risco de dependência da carteira</div>
            </div>
            <Link href="/delinquent" style={{ fontSize:"11px",color:"var(--accent)",textDecoration:"none" }}>Ver →</Link>
          </div>
          {topClients.slice(0,5).map((c,i)=>(
            <div key={c.nome} style={{ marginBottom:"10px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"3px" }}>
                <span style={{ fontSize:"11.5px",color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"260px" }}>{c.nome}</span>
                <span style={{ fontSize:"11.5px",color:"var(--text-secondary)",flexShrink:0 }}>{c.percent.toFixed(1)}%</span>
              </div>
              <div style={{ background:"var(--bg-tertiary)",borderRadius:"999px",height:"5px",overflow:"hidden" }}>
                <div style={{ height:"100%",borderRadius:"999px",background:PIE_COLORS[i%PIE_COLORS.length],width:`${c.percent}%` }}/>
              </div>
            </div>
          ))}
          <Link href="/delinquent" style={{ display:"block",marginTop:"8px",padding:"6px 8px",background:"var(--danger-soft)",borderRadius:"6px",textDecoration:"none" }}>
            <span style={{ fontSize:"10px",color:"var(--danger)",fontWeight:700 }}>Top 3 = {top3Concent.toFixed(0)}% — ver inadimplentes →</span>
          </Link>
        </div>

        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px",display:"flex",flexDirection:"column" }}>
          <div style={{ marginBottom:"14px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Leitura Estratégica</div>
            <div style={{ fontSize:"10.5px",color:"var(--text-muted)",marginTop:"1px" }}>Análise gerada a partir dos seus dados</div>
          </div>
          <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",gap:"14px",padding:"16px 8px" }}>
            <div style={{ fontSize:"12px",color:"var(--text-secondary)",lineHeight:1.55,maxWidth:"34ch" }}>
              O CFO AI analisa seus lançamentos, DRE e fluxo de caixa e aponta riscos, gargalos e prioridades — com base nos números reais da sua empresa.
            </div>
            <Link href="/diagnostic" style={{ fontSize:"12px",fontWeight:600,color:"#fff",background:"var(--accent)",padding:"9px 18px",borderRadius:"8px",textDecoration:"none" }}>
              Abrir diagnóstico →
            </Link>
          </div>
        </div>
      </div>

      {/* KPI extras */}
      <div className="kpi-grid" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px" }}>
        <KpiCard label="Capital de Giro"     value={R(kpis.capitalGiro)}    sub="Disponível"         color="var(--accent)" />
        <KpiCard label="Saldo Projetado 30d" value={R(kpis.saldoProjetado)} sub="Projeção 30 dias" color="var(--success)" href="/cashflow" />
        <KpiCard label="Ticket Médio"        value={R(kpis.ticketMedio)}    sub="Por lançamento" />
        <Link href="/health" style={{ textDecoration:"none" }}>
          <div style={{ background:"var(--bg-secondary)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:"var(--radius)",padding:"16px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",height:"100%" }}>
            <div style={{ fontSize:"30px",fontWeight:900,color:"var(--warning)",lineHeight:1 }}>{healthScore}</div>
            <div style={{ fontSize:"10px",color:"var(--warning)",marginTop:"2px" }}>Atenção</div>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"5px" }}>Nota de Saúde</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
