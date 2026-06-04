"use client"

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Users, Package,
  Calendar, Zap, ChevronRight, ArrowRight,
} from "lucide-react"
import { useRevenueSeries } from "@/lib/analytics-client"
import { useDateRange } from "@/lib/date-context"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const eventos = [
  {
    data: "2025-06", mes: "Jun/25", tipo: "crescimento", cor: "var(--success)",
    titulo: "Início da Obra 07 — Construtora Beta",
    descricao: "Assinatura do maior contrato da história: R$ 150.000/mês. Receita cresce 18%.",
    valor: "+R$ 150.000/mês",
    icon: TrendingUp,
  },
  {
    data: "2025-08", mes: "Ago/25", tipo: "atencao", cor: "var(--warning)",
    titulo: "Queda de faturamento sazonal",
    descricao: "Mês fraco por férias. Receita recua de R$ 271k para R$ 259k. Esperado.",
    valor: "-R$ 12.000",
    icon: TrendingDown,
  },
  {
    data: "2025-10", mes: "Out/25", tipo: "crescimento", cor: "var(--success)",
    titulo: "Novos contratos de consultoria",
    descricao: "Grupo Horizonte e RJ Incorporadora iniciam contratos. Diversificação da carteira.",
    valor: "+R$ 56.000/mês",
    icon: DollarSign,
  },
  {
    data: "2025-12", mes: "Dez/25", tipo: "crescimento", cor: "var(--accent)",
    titulo: "Melhor mês do ano",
    descricao: "Faturamento recorde de R$ 328.000. Fechamento de projetos anuais e bônus de performance.",
    valor: "R$ 328.000",
    icon: Zap,
  },
  {
    data: "2026-01", mes: "Jan/26", tipo: "atencao", cor: "var(--warning)",
    titulo: "Contratação de 3 novos técnicos",
    descricao: "Expansão da equipe para suportar crescimento. Folha sobe 9% no mês.",
    valor: "+R$ 8.400/mês",
    icon: Users,
  },
  {
    data: "2026-02", mes: "Fev/26", tipo: "risco", cor: "var(--danger)",
    titulo: "Início da inadimplência crescente",
    descricao: "Construtora Beta começa a atrasar pagamentos. Inadimplência sobe de 13% para 15%.",
    valor: "+R$ 18.700 em atraso",
    icon: AlertTriangle,
  },
  {
    data: "2026-04", mes: "Abr/26", tipo: "risco", cor: "var(--danger)",
    titulo: "Inadimplência atinge 18%",
    descricao: "RJ Incorporadora também atrasa. R$ 28.700 parados no mês. Pressão crescente no caixa.",
    valor: "R$ 28.700 em atraso",
    icon: AlertTriangle,
  },
  {
    data: "2026-05", mes: "Mai/26", tipo: "crescimento", cor: "var(--success)",
    titulo: "Faturamento retoma crescimento",
    descricao: "Mês atual: R$ 312.000 (+8,4%). Novo ciclo de crescimento. Inadimplência ainda alta.",
    valor: "+8,4%",
    icon: TrendingUp,
  },
]

export default function TimelinePage() {
  const { range } = useDateRange()
  const { series: revenueExpenseData } = useRevenueSeries(range)

  const timelineChart = revenueExpenseData.map((d) => ({
    mes: d.mes,
    receita: d.receita,
    despesa: d.despesa,
    lucro: d.receita - d.despesa,
    evento: eventos.find(e => {
      const idx = ["Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai"].indexOf(d.mes)
      return idx !== -1 && e.data === ["2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"][idx]
    }),
  }))

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Timeline Financeira</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Linha do tempo dos grandes eventos e marcos financeiros da empresa</p>
      </div>

      {/* Gráfico com eventos */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Evolução Financeira — Jun/25 a Mai/26</div>
        <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "14px" }}>Área verde = lucro acumulado · Linha azul = receita · Linha vermelha = despesa</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={timelineChart} margin={{ top: 10, right: 10, left: 10, bottom: 4 }}>
            <defs>
              <linearGradient id="gLucroTl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [R(v), ""]} />
            {eventos.filter(e => ["2025-06", "2025-12", "2026-02", "2026-05"].includes(e.data)).map(e => {
              const idx = ["2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"].indexOf(e.data)
              const mes = ["Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai"][idx]
              return <ReferenceLine key={e.data} x={mes} stroke={e.cor} strokeDasharray="4 4" label={{ value: "▲", fontSize: 12, fill: e.cor, position: "top" }} />
            })}
            <Area type="monotone" dataKey="receita" stroke="var(--accent)" strokeWidth={2} fill="none" dot={false} />
            <Area type="monotone" dataKey="despesa" stroke="var(--danger)" strokeWidth={1.5} fill="none" dot={false} />
            <Area type="monotone" dataKey="lucro" stroke="var(--success)" strokeWidth={0} fill="url(#gLucroTl)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Timeline de eventos */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "24px", top: 0, bottom: 0, width: "2px", background: "var(--border)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {eventos.map((evento, i) => (
            <div key={evento.data} style={{ display: "flex", gap: "20px", alignItems: "flex-start", paddingBottom: "20px", paddingLeft: "50px", position: "relative" }}>
              {/* Ícone no eixo */}
              <div style={{
                position: "absolute", left: "10px", top: "4px",
                width: "28px", height: "28px",
                borderRadius: "50%",
                background: evento.cor + "20",
                border: `2px solid ${evento.cor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1,
              }}>
                <evento.icon size={12} style={{ color: evento.cor }} />
              </div>

              <div style={{
                flex: 1, padding: "14px 16px",
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                borderLeft: `3px solid ${evento.cor}`,
                borderRadius: "var(--radius)",
                transition: "border-color 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = evento.cor}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "3px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Calendar size={10} />
                      {evento.mes}
                    </div>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)" }}>{evento.titulo}</div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: "20px", background: evento.cor + "18", border: `1px solid ${evento.cor}40`, fontSize: "11px", fontWeight: 700, color: evento.cor, whiteSpace: "nowrap" }}>
                    {evento.valor}
                  </span>
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{evento.descricao}</p>
              </div>
            </div>
          ))}

          {/* Futuro */}
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", paddingLeft: "50px", position: "relative" }}>
            <div style={{
              position: "absolute", left: "10px", top: "4px",
              width: "28px", height: "28px", borderRadius: "50%",
              background: "var(--accent)20", border: `2px dashed var(--accent)`,
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1,
            }}>
              <ChevronRight size={12} style={{ color: "var(--accent)" }} />
            </div>
            <div style={{ flex: 1, padding: "14px 16px", background: "var(--accent-soft)", border: "1px dashed var(--accent-medium)", borderRadius: "var(--radius)" }}>
              <div style={{ fontSize: "10px", color: "var(--accent-light)", marginBottom: "4px" }}>PRÓXIMOS EVENTOS PROJETADOS</div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {[
                  { mes: "Jun/26", evento: "Vencimento folha + recebimento Construtora Beta" },
                  { mes: "Jul/26", evento: "Meta: reduzir inadimplência para 12%" },
                  { mes: "Set/26", evento: "Revisão de preços e contratos" },
                ].map(p => (
                  <div key={p.mes} style={{ padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: "7px", border: "1px solid var(--accent-medium)" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-light)", marginBottom: "2px" }}>{p.mes}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{p.evento}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
