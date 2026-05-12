"use client"

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { TrendingUp, TrendingDown, Minus, Info, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react"
import { kpiData, revenueExpenseData } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const indicadores = [
  {
    grupo: "Rentabilidade",
    items: [
      { nome: "Margem Líquida", valor: "5,9%", referencia: "≥ 10%", status: "risco", descricao: "Lucro/Receita Bruta", historico: [4.1, 5.2, 4.8, 5.9, 5.5, 5.9] },
      { nome: "Margem Operacional", valor: "19,7%", referencia: "≥ 18%", status: "saudavel", descricao: "EBITDA/Receita Líquida", historico: [18.2, 19.1, 18.8, 20.1, 19.4, 19.7] },
      { nome: "Margem de Contribuição", valor: "37,5%", referencia: "≥ 35%", status: "saudavel", descricao: "(Rec - Custos Var.) / Rec", historico: [36.1, 37.2, 36.8, 38.1, 37.4, 37.5] },
      { nome: "ROE (Retorno s/ Capital)", valor: "12,4%", referencia: "≥ 15%", status: "atencao", descricao: "Lucro/Capital Próprio", historico: [10.1, 11.2, 11.8, 13.1, 12.4, 12.4] },
    ],
  },
  {
    grupo: "Liquidez e Caixa",
    items: [
      { nome: "Autonomia Financeira", valor: "83 dias", referencia: "≥ 90 dias", status: "atencao", descricao: "Saldo / (Despesa Mensal / 30)", historico: [95, 88, 79, 91, 85, 83] },
      { nome: "Burn Rate", valor: R(9600) + "/dia", referencia: "Controlado", status: "atencao", descricao: "Despesa média diária", historico: [8200, 8800, 8400, 9100, 9400, 9600] },
      { nome: "Capital de Giro", valor: R(181550), referencia: "Positivo", status: "saudavel", descricao: "Ativo Circulante - Passivo Circ.", historico: [165000, 172000, 168000, 178000, 180000, 181550] },
      { nome: "Ciclo Financeiro", valor: "42 dias", referencia: "≤ 30 dias", status: "risco", descricao: "Prazo médio recebimento - pagamento", historico: [35, 37, 38, 40, 41, 42] },
    ],
  },
  {
    grupo: "Eficiência Operacional",
    items: [
      { nome: "Folha / Faturamento", valor: "31,5%", referencia: "≤ 28%", status: "risco", descricao: "Custo de pessoal sobre receita", historico: [27.1, 28.4, 29.2, 30.1, 31.0, 31.5] },
      { nome: "Impostos / Receita", valor: "6,1%", referencia: "≤ 8%", status: "saudavel", descricao: "Carga tributária efetiva", historico: [5.8, 5.9, 6.0, 6.1, 6.0, 6.1] },
      { nome: "Inadimplência", valor: "19,9%", referencia: "≤ 5%", status: "critico", descricao: "Valor em atraso / Total a Receber", historico: [12, 13, 15, 16, 18, 19.9] },
      { nome: "Ticket Médio", valor: R(24600), referencia: "≥ R$ 32.000", status: "atencao", descricao: "Receita / Número de clientes", historico: [22000, 22800, 23400, 24000, 24200, 24600] },
    ],
  },
  {
    grupo: "Crescimento",
    items: [
      { nome: "Crescimento de Receita", valor: "+8,4%", referencia: "≥ 5%/mês", status: "saudavel", descricao: "Variação vs mês anterior", historico: [3.2, 5.8, -4.4, 10.8, -7.4, 8.4] },
      { nome: "Crescimento de Despesas", valor: "+7,9%", referencia: "≤ crescimento rec.", status: "atencao", descricao: "Variação das despesas", historico: [2.1, 7.7, 2.5, 6.8, 7.1, 7.9] },
      { nome: "Receita Recorrente", valor: "35%", referencia: "≥ 60%", status: "risco", descricao: "% de receita de contratos fixos", historico: [30, 32, 33, 34, 35, 35] },
      { nome: "Ponto de Equilíbrio", valor: R(267000), referencia: "< Faturamento", status: "saudavel", descricao: "Receita para cobrir todos os custos", historico: [258000, 260000, 263000, 264000, 265000, 267000] },
    ],
  },
]

function StatusIcon({ status }: { status: string }) {
  if (status === "saudavel") return <CheckCircle size={14} style={{ color: "var(--success)" }} />
  if (status === "atencao") return <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
  if (status === "risco" || status === "critico") return <AlertCircle size={14} style={{ color: "var(--danger)" }} />
  return <Minus size={14} style={{ color: "var(--text-muted)" }} />
}

function SparkLine({ data, color }: { data: number[]; color: string }) {
  const d = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width={60} height={30}>
      <AreaChart data={d} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`gs${color.replace(/[^a-z]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#gs${color.replace(/[^a-z]/g, "")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const statusColor = (s: string) => s === "saudavel" ? "var(--success)" : s === "atencao" ? "var(--warning)" : "var(--danger)"

export default function IndicadoresPage() {
  const totalIndicadores = indicadores.reduce((s, g) => s + g.items.length, 0)
  const saudaveis = indicadores.flatMap(g => g.items).filter(i => i.status === "saudavel").length
  const atencao = indicadores.flatMap(g => g.items).filter(i => i.status === "atencao").length
  const risco = indicadores.flatMap(g => g.items).filter(i => i.status === "risco" || i.status === "critico").length

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Indicadores</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>{totalIndicadores} KPIs monitorados — atualizado em tempo real</p>
      </div>

      {/* Resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "18px" }}>
        {[
          { label: "Saudáveis", count: saudaveis, color: "var(--success)", icon: CheckCircle },
          { label: "Atenção", count: atencao, color: "var(--warning)", icon: AlertTriangle },
          { label: "Risco / Crítico", count: risco, color: "var(--danger)", icon: AlertCircle },
        ].map(s => (
          <div key={s.label} style={{ padding: "16px 20px", background: "var(--bg-secondary)", border: `1px solid ${s.color}28`, borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: s.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grupos de indicadores */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {indicadores.map(grupo => (
          <div key={grupo.grupo} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>{grupo.grupo}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
              {grupo.items.map((item, idx) => {
                const color = statusColor(item.status)
                const isLast = idx === grupo.items.length - 1
                return (
                  <div key={item.nome} style={{
                    padding: "16px 18px",
                    borderRight: idx < 3 ? "1px solid var(--border)" : "none",
                    borderTop: "none",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginBottom: "6px" }}>{item.nome}</div>
                        <div style={{ fontSize: "18px", fontWeight: 800, color, letterSpacing: "-0.3px" }}>{item.valor}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                        <StatusIcon status={item.status} />
                        <SparkLine data={item.historico} color={color} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Ref: {item.referencia}</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", fontStyle: "italic" }}>{item.descricao}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
