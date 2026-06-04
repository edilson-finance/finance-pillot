"use client"

import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import {
  Search, ChevronRight, TrendingUp, TrendingDown, ArrowRight,
  Receipt, Users, Building2, Tag, BarChart2, DollarSign,
} from "lucide-react"
import { useState } from "react"
import { useTopClients, useTopExpenses, useRevenueSeries } from "@/lib/analytics-client"
import { useDateRange } from "@/lib/date-context"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const CHART_COLORS = ["var(--accent)", "var(--success)", "var(--purple)", "var(--warning)", "var(--info)", "var(--text-muted)"]

export default function ExplorarPage() {
  const { range } = useDateRange()
  const { rows: topClients } = useTopClients()
  const { rows: topExpenses } = useTopExpenses()
  const { series: revenueExpenseData } = useRevenueSeries(range)

  const [dimensaoKey, setDimensaoKey] = useState("despesas")

  const dimensoes = [
    {
      key: "despesas", label: "Despesas", icon: Receipt, color: "var(--danger)",
      resumo: "Total R$ 288.000 — crescimento de 13,4% em 12 meses",
      dados: topExpenses.length > 0 ? topExpenses.map(e => ({ nome: e.nome, valor: e.valor, percent: e.percent, tendencia: "" })) : [
        { nome: "Folha de Pagamento", valor: 98400, percent: 34.2, tendencia: "+19%" },
        { nome: "Materiais e Insumos", valor: 72800, percent: 25.3, tendencia: "+5%" },
        { nome: "Subempreiteiros", valor: 48600, percent: 16.9, tendencia: "+3%" },
        { nome: "Aluguel e Locações", valor: 28400, percent: 9.9, tendencia: "0%" },
        { nome: "Impostos e Taxas", valor: 18900, percent: 6.6, tendencia: "+8%" },
        { nome: "Outros", valor: 20900, percent: 7.1, tendencia: "+2%" },
      ],
      serie: revenueExpenseData.map(d => ({ mes: d.mes, valor: d.despesa })),
    },
    {
      key: "receita", label: "Receita", icon: DollarSign, color: "var(--accent)",
      resumo: "Total R$ 312.000 — crescimento de 18,2% em 12 meses",
      dados: topClients.length > 0 ? topClients.map(c => ({ nome: c.nome, valor: c.valor, percent: c.percent, tendencia: "" })) : [
        { nome: "Construtora Beta", valor: 150000, percent: 48.1, tendencia: "+2%" },
        { nome: "J. Silva Empreendimentos", valor: 98000, percent: 31.4, tendencia: "+15%" },
        { nome: "Grupo Horizonte", valor: 42000, percent: 13.5, tendencia: "+10%" },
        { nome: "RJ Incorporadora", valor: 14000, percent: 4.5, tendencia: "Novo" },
        { nome: "Outros", valor: 8000, percent: 2.5, tendencia: "-20%" },
      ],
      serie: revenueExpenseData.map(d => ({ mes: d.mes, valor: d.receita })),
    },
    {
      key: "folha", label: "Folha", icon: Users, color: "var(--purple)",
      resumo: "Crescimento de 19,5% — acima da meta de 8%",
      dados: [
        { nome: "Engenheiros", valor: 38000, percent: 38.6, tendencia: "+12%" },
        { nome: "Técnicos", valor: 24000, percent: 24.4, tendencia: "+22%" },
        { nome: "Administrativo", valor: 18000, percent: 18.3, tendencia: "+8%" },
        { nome: "Encargos", valor: 12000, percent: 12.2, tendencia: "+20%" },
        { nome: "Outros", valor: 6400, percent: 6.5, tendencia: "+5%" },
      ],
      serie: [
        { mes: "Jun", valor: 82000 }, { mes: "Jul", valor: 84000 }, { mes: "Ago", valor: 86000 },
        { mes: "Set", valor: 88000 }, { mes: "Out", valor: 90000 }, { mes: "Nov", valor: 92000 },
        { mes: "Dez", valor: 91000 }, { mes: "Jan", valor: 93000 }, { mes: "Fev", valor: 94000 },
        { mes: "Mar", valor: 96000 }, { mes: "Abr", valor: 97000 }, { mes: "Mai", valor: 98400 },
      ],
    },
    {
      key: "clientes", label: "Clientes", icon: Building2, color: "var(--info)",
      resumo: "5 clientes ativos — concentração alta no top 2",
      dados: topClients.length > 0 ? topClients.map(c => ({ nome: c.nome, valor: c.valor, percent: c.percent, tendencia: "Ativo" })) : [
        { nome: "Construtora Beta", valor: 150000, percent: 48.1, tendencia: "Ativo" },
        { nome: "J. Silva Empreendimentos", valor: 98000, percent: 31.4, tendencia: "Ativo" },
        { nome: "Grupo Horizonte", valor: 42000, percent: 13.5, tendencia: "Ativo" },
        { nome: "RJ Incorporadora", valor: 14000, percent: 4.5, tendencia: "Inadimplente" },
        { nome: "Outros", valor: 8000, percent: 2.5, tendencia: "Variável" },
      ],
      serie: revenueExpenseData.map(d => ({ mes: d.mes, valor: d.receita })),
    },
    {
      key: "categorias", label: "Categorias", icon: Tag, color: "var(--warning)",
      resumo: "94% dos lançamentos categorizados corretamente",
      dados: [
        { nome: "Obras e Projetos", valor: 176800, percent: 45.2, tendencia: "+8%" },
        { nome: "Folha e Encargos", valor: 98400, percent: 25.1, tendencia: "+19%" },
        { nome: "Fornecedores", valor: 72800, percent: 18.6, tendencia: "+5%" },
        { nome: "Administrativo", valor: 28400, percent: 7.3, tendencia: "0%" },
        { nome: "Financeiro", valor: 15600, percent: 4.0, tendencia: "+3%" },
      ],
      serie: revenueExpenseData.map(d => ({ mes: d.mes, valor: d.receita - d.despesa })),
    },
    {
      key: "margem", label: "Margem", icon: BarChart2, color: "var(--success)",
      resumo: "Margem de 5,9% — em compressão nos últimos meses",
      dados: [
        { nome: "Margem Bruta", valor: 135200, percent: 43.3, tendencia: "43%" },
        { nome: "Margem de Contribuição", valor: 117104, percent: 37.5, tendencia: "37%" },
        { nome: "Margem Operacional", valor: 61404, percent: 19.7, tendencia: "20%" },
        { nome: "Margem Líquida", valor: 18400, percent: 5.9, tendencia: "6%" },
      ],
      serie: revenueExpenseData.map(d => ({ mes: d.mes, valor: d.receita > 0 ? Math.round((d.receita - d.despesa) / d.receita * 100) : 0 })),
    },
  ]

  const dimensao = dimensoes.find(d => d.key === dimensaoKey) ?? dimensoes[0]
  const [detalhe, setDetalhe] = useState<typeof dimensoes[0]["dados"][0] | null>(null)

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Explorar</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Investigação profunda de qualquer dimensão financeira</p>
      </div>

      {/* Seletor de dimensão */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
        {dimensoes.map(d => (
          <button key={d.key} onClick={() => { setDimensaoKey(d.key); setDetalhe(null) }}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "8px 16px", borderRadius: "20px",
              background: dimensao.key === d.key ? d.color + "20" : "var(--bg-secondary)",
              border: `1px solid ${dimensao.key === d.key ? d.color + "60" : "var(--border)"}`,
              color: dimensao.key === d.key ? d.color : "var(--text-secondary)",
              fontSize: "12.5px", fontWeight: dimensao.key === d.key ? 700 : 500,
              cursor: "pointer", transition: "all 0.15s",
            }}>
            <d.icon size={13} />
            {d.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Gráfico de barras */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              Composição — {dimensao.label}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{dimensao.resumo}</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dimensao.dados} layout="vertical" margin={{ top: 4, right: 40, left: 80, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
                tickFormatter={v => dimensao.key === "margem" ? `${v}%` : `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={78} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v: any) => [dimensao.key === "margem" ? `${v}%` : R(v), dimensao.label]} />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => setDetalhe(d)}
                fill={dimensao.color}>
                {dimensao.dados.map((_, idx) => (
                  <Cell key={idx} fill={dimensao.color} opacity={detalhe?.nome === dimensao.dados[idx].nome ? 1 : 0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pizza */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
            Distribuição — {dimensao.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={dimensao.dados} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}>
                  {dimensao.dados.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} opacity={detalhe?.nome === dimensao.dados[idx].nome ? 1 : 0.8} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: any) => [R(v), ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {dimensao.dados.map((item, idx) => (
                <div key={item.nome} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", cursor: "pointer" }}
                  onClick={() => setDetalhe(detalhe?.nome === item.nome ? null : item)}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: CHART_COLORS[idx % CHART_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nome}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>

        {/* Evolução 12 meses */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
            Evolução 12 meses — {dimensao.label}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={dimensao.serie} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="gExpl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={dimensao.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={dimensao.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
                tickFormatter={v => dimensao.key === "margem" ? `${v}%` : `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v: any) => [dimensao.key === "margem" ? `${v}%` : R(v), dimensao.label]} />
              <Area type="monotone" dataKey="valor" stroke={dimensao.color} strokeWidth={2.5} fill="url(#gExpl)" dot={{ r: 3, fill: dimensao.color }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Detalhe do item selecionado */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          {detalhe ? (
            <>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>Detalhamento</div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>{detalhe.nome}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: dimensao.color, letterSpacing: "-0.5px", marginBottom: "16px" }}>{R(detalhe.valor)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "Participação", value: `${detalhe.percent}%` },
                  { label: "Tendência", value: detalhe.tendencia },
                  { label: "Impacto na margem", value: `-${(detalhe.percent * 0.059).toFixed(1)}pp` },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-tertiary)", borderRadius: "7px", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{item.label}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", textAlign: "center", gap: "10px" }}>
              <Search size={28} style={{ opacity: 0.4 }} />
              <div style={{ fontSize: "13px", fontWeight: 600 }}>Clique em uma barra</div>
              <div style={{ fontSize: "11px" }}>para ver o detalhamento do item</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
