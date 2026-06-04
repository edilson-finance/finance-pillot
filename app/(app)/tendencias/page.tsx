"use client"

import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts"
import { TrendingUp, TrendingDown, Minus, ChevronRight, ArrowRight } from "lucide-react"
import { useRevenueSeries } from "@/lib/analytics-client"
import { useDateRange } from "@/lib/date-context"
import { formatCurrency } from "@/lib/utils"
import { useState } from "react"

const R = formatCurrency

function TendenciaIcon({ t }: { t: string }) {
  if (t === "crescimento") return <TrendingUp size={14} style={{ color: "var(--success)" }} />
  if (t === "crescimento_preocupante" || t === "queda_necessaria") return <TrendingUp size={14} style={{ color: "var(--danger)" }} />
  return <Minus size={14} style={{ color: "var(--warning)" }} />
}

export default function TendenciasPage() {
  const { range } = useDateRange()
  const { series: revenueExpenseData } = useRevenueSeries(range)

  const categoriasTendencia = [
    {
      nome: "Faturamento",
      tendencia: "crescimento",
      variacao: "+18,2%",
      valor: 312000,
      dados: revenueExpenseData.map(d => ({ mes: d.mes, valor: d.receita })),
      cor: "var(--accent)",
      descricao: "Crescimento consistente nos últimos 3 meses, impulsionado pelo contrato da Obra 07.",
    },
    {
      nome: "Despesas Totais",
      tendencia: "crescimento",
      variacao: "+13,4%",
      valor: 288000,
      dados: revenueExpenseData.map(d => ({ mes: d.mes, valor: d.despesa })),
      cor: "var(--danger)",
      descricao: "Despesas crescendo mais rápido que o ideal. Folha de pagamento é o principal driver.",
    },
    {
      nome: "Lucro",
      tendencia: "estavel",
      variacao: "+1,2%",
      valor: 18400,
      dados: revenueExpenseData.map(d => ({ mes: d.mes, valor: d.receita - d.despesa })),
      cor: "var(--success)",
      descricao: "Lucro estável, mas margem em compressão devido ao crescimento assimétrico de despesas.",
    },
    {
      nome: "Folha de Pagamento",
      tendencia: "crescimento_preocupante",
      variacao: "+19% acima meta",
      valor: 98400,
      dados: [
        { mes: "Jun", valor: 82000 }, { mes: "Jul", valor: 84000 }, { mes: "Ago", valor: 86000 },
        { mes: "Set", valor: 88000 }, { mes: "Out", valor: 90000 }, { mes: "Nov", valor: 92000 },
        { mes: "Dez", valor: 91000 }, { mes: "Jan", valor: 93000 }, { mes: "Fev", valor: 94000 },
        { mes: "Mar", valor: 96000 }, { mes: "Abr", valor: 97000 }, { mes: "Mai", valor: 98400 },
      ],
      cor: "var(--warning)",
      descricao: "Crescimento de 19,5% em 12 meses. Meta era de até 8%. Principal compressor de margem.",
    },
    {
      nome: "Materiais e Insumos",
      tendencia: "estavel",
      variacao: "+5,1%",
      valor: 72800,
      dados: [
        { mes: "Jun", valor: 64000 }, { mes: "Jul", valor: 66000 }, { mes: "Ago", valor: 68000 },
        { mes: "Set", valor: 67000 }, { mes: "Out", valor: 70000 }, { mes: "Nov", valor: 71000 },
        { mes: "Dez", valor: 69000 }, { mes: "Jan", valor: 68000 }, { mes: "Fev", valor: 70000 },
        { mes: "Mar", valor: 71000 }, { mes: "Abr", valor: 72000 }, { mes: "Mai", valor: 72800 },
      ],
      cor: "var(--info)",
      descricao: "Crescimento proporcional ao volume de obras. Tendência saudável e controlada.",
    },
    {
      nome: "Inadimplência",
      tendencia: "queda_necessaria",
      variacao: "+4,2pp em 3 meses",
      valor: 19.9,
      valorLabel: "19,9%",
      dados: [
        { mes: "Jun", valor: 12 }, { mes: "Jul", valor: 13 }, { mes: "Ago", valor: 11 },
        { mes: "Set", valor: 10 }, { mes: "Out", valor: 13 }, { mes: "Nov", valor: 14 },
        { mes: "Dez", valor: 11 }, { mes: "Jan", valor: 13 }, { mes: "Fev", valor: 15 },
        { mes: "Mar", valor: 16 }, { mes: "Abr", valor: 18 }, { mes: "Mai", valor: 19.9 },
      ],
      cor: "var(--danger)",
      descricao: "Piora consistente nos últimos 3 meses. Exige ação imediata. Referência saudável: até 5%.",
    },
  ]

  const sazonalidadeData = revenueExpenseData.map((d, i) => ({
    mes: d.mes,
    receita: d.receita,
    mesesAnteriores: i >= 12 ? revenueExpenseData[i - 12]?.receita : undefined,
    variacao: i > 0 ? ((d.receita - (revenueExpenseData[i - 1]?.receita ?? d.receita)) / (revenueExpenseData[i - 1]?.receita || 1) * 100).toFixed(1) : "0",
  }))

  const receitaMedia = revenueExpenseData.length > 0
    ? revenueExpenseData.reduce((s, d) => s + d.receita, 0) / revenueExpenseData.length
    : 0

  const [selecionado, setSelecionado] = useState(categoriasTendencia[0])

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Tendências</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Comportamento e evolução dos principais indicadores financeiros</p>
      </div>

      {/* Cards de categorias */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "16px" }}>
        {categoriasTendencia.map(cat => (
          <button key={cat.nome} onClick={() => setSelecionado(cat)}
            style={{
              padding: "13px 14px",
              background: selecionado.nome === cat.nome ? cat.cor + "15" : "var(--bg-secondary)",
              border: `1px solid ${selecionado.nome === cat.nome ? cat.cor + "50" : "var(--border)"}`,
              borderTop: `3px solid ${cat.cor}`,
              borderRadius: "var(--radius)", textAlign: "left", cursor: "pointer",
              transition: "all 0.15s",
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>{cat.nome}</span>
              <TendenciaIcon t={cat.tendencia} />
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: cat.cor }}>{cat.variacao}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Gráfico principal */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{selecionado.nome} — 12 meses</div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>{selecionado.descricao}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: selecionado.cor, letterSpacing: "-0.5px" }}>{selecionado.variacao}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>variação 12m</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={selecionado.dados} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="gTend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selecionado.cor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={selecionado.cor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
                tickFormatter={v => selecionado.nome === "Inadimplência" ? `${v}%` : `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v: any) => [selecionado.nome === "Inadimplência" ? `${v}%` : R(v), selecionado.nome]} />
              <Area type="monotone" dataKey="valor" stroke={selecionado.cor} strokeWidth={2.5} fill="url(#gTend)" dot={{ r: 3, fill: selecionado.cor }} />
              <Line type="monotone" dataKey="valor" stroke={selecionado.cor} strokeWidth={0} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Resumo e análise */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>Análise da tendência</div>
            <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Valor atual", value: selecionado.valorLabel || R(selecionado.valor) },
                { label: "Variação 12m", value: selecionado.variacao },
                { label: "Tendência", value: selecionado.tendencia === "crescimento" ? "Positiva" : selecionado.tendencia === "estavel" ? "Estável" : "Preocupante" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-tertiary)", borderRadius: "7px", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{item.label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px", flex: 1 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "10px" }}>Todas as tendências</div>
            {categoriasTendencia.map(cat => (
              <div key={cat.nome} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <TendenciaIcon t={cat.tendencia} />
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{cat.nome}</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: cat.cor }}>{cat.variacao}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sazonalidade */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Sazonalidade — Variação Mensal de Receita</div>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 14px" }}>Identifica padrões mensais e períodos historicamente fracos ou fortes</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={sazonalidadeData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [R(v), "Receita"]} />
            {receitaMedia > 0 && (
              <ReferenceLine y={receitaMedia} stroke="var(--accent)" strokeDasharray="4 4" label={{ value: "Média", fontSize: 10, fill: "var(--accent)" }} />
            )}
            <Bar dataKey="receita" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
