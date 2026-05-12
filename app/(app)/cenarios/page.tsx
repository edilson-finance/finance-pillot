"use client"

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Minus, ChevronRight } from "lucide-react"
import { useState } from "react"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const cenarios = [
  {
    key: "pessimista",
    label: "Pessimista",
    color: "var(--danger)",
    icon: TrendingDown,
    descricao: "Inadimplência aumenta, perda de contrato, despesas crescem.",
    pressupostos: [
      "Construtora Beta atrasa pagamento por 60 dias",
      "Inadimplência sobe para 25%",
      "Folha cresce mais 5%",
      "Nenhum novo contrato no período",
    ],
    projecao: [
      { mes: "Jun", receita: 278000, despesa: 296000, caixa: 168400 },
      { mes: "Jul", receita: 261000, despesa: 301000, caixa: 128400 },
      { mes: "Ago", receita: 255000, despesa: 305000, caixa: 78400 },
    ],
    kpis: { receita: 278000, despesa: 296000, lucro: -18000, margem: -6.5, caixa: 168400, autonomia: 17 },
  },
  {
    key: "conservador",
    label: "Conservador",
    color: "var(--warning)",
    icon: Minus,
    descricao: "Crescimento moderado, inadimplência controlada, despesas estáveis.",
    pressupostos: [
      "Recebimentos no prazo com 5% de atraso",
      "Inadimplência cai para 15%",
      "Despesas crescem conforme histórico",
      "1 novo contrato de R$ 20.000",
    ],
    projecao: [
      { mes: "Jun", receita: 298000, despesa: 289000, caixa: 198400 },
      { mes: "Jul", receita: 305000, despesa: 292000, caixa: 211400 },
      { mes: "Ago", receita: 312000, despesa: 295000, caixa: 228400 },
    ],
    kpis: { receita: 298000, despesa: 289000, lucro: 9000, margem: 3.0, caixa: 198400, autonomia: 20 },
  },
  {
    key: "realista",
    label: "Realista",
    color: "var(--accent)",
    icon: TrendingUp,
    descricao: "Cenário base com crescimento histórico e cobranças ativas.",
    pressupostos: [
      "Recuperação de 50% da inadimplência",
      "Inadimplência cai para 12%",
      "Despesas crescem 2% ao mês",
      "Crescimento de receita de 3% ao mês",
    ],
    projecao: [
      { mes: "Jun", receita: 320000, despesa: 294000, caixa: 231400 },
      { mes: "Jul", receita: 335000, despesa: 300000, caixa: 266400 },
      { mes: "Ago", receita: 349000, despesa: 306000, caixa: 309400 },
    ],
    kpis: { receita: 320000, despesa: 294000, lucro: 26000, margem: 8.1, caixa: 231400, autonomia: 24 },
  },
  {
    key: "otimista",
    label: "Otimista",
    color: "var(--success)",
    icon: TrendingUp,
    descricao: "Crescimento acelerado, recuperação total, novos contratos.",
    pressupostos: [
      "Recuperação total da inadimplência",
      "Inadimplência zera",
      "2 novos contratos de R$ 50.000",
      "Despesas controladas abaixo da inflação",
    ],
    projecao: [
      { mes: "Jun", receita: 348000, despesa: 291000, caixa: 291400 },
      { mes: "Jul", receita: 378000, despesa: 295000, caixa: 374400 },
      { mes: "Ago", receita: 398000, despesa: 300000, caixa: 472400 },
    ],
    kpis: { receita: 348000, despesa: 291000, lucro: 57000, margem: 16.4, caixa: 291400, autonomia: 30 },
  },
]

const comparativo = ["Jun", "Jul", "Ago"].map((mes, i) => ({
  mes,
  pessimista: cenarios[0].projecao[i].caixa,
  conservador: cenarios[1].projecao[i].caixa,
  realista: cenarios[2].projecao[i].caixa,
  otimista: cenarios[3].projecao[i].caixa,
}))

export default function CenariosPage() {
  const [ativo, setAtivo] = useState("realista")
  const cenario = cenarios.find(c => c.key === ativo)!

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Cenários</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Simule diferentes futuros financeiros com base em premissas ajustáveis</p>
      </div>

      {/* Seletor de cenário */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "18px" }}>
        {cenarios.map(c => (
          <button key={c.key} onClick={() => setAtivo(c.key)}
            style={{
              padding: "14px 16px", textAlign: "left", cursor: "pointer",
              background: ativo === c.key ? c.color + "15" : "var(--bg-secondary)",
              border: `2px solid ${ativo === c.key ? c.color : "var(--border)"}`,
              borderRadius: "var(--radius)", transition: "all 0.15s",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: c.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <c.icon size={14} style={{ color: c.color }} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: ativo === c.key ? c.color : "var(--text-primary)" }}>{c.label}</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{c.descricao}</div>
            <div style={{ marginTop: "8px", fontSize: "13px", fontWeight: 800, color: c.kpis.lucro >= 0 ? "var(--success)" : "var(--danger)" }}>
              {c.kpis.lucro >= 0 ? "+" : ""}{R(c.kpis.lucro)} / mês
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Projeção do cenário selecionado */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Cenário {cenario.label} — Projeção 3 meses</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>Saldo projetado com base nas premissas definidas</div>
            </div>
            <span style={{ padding: "4px 12px", borderRadius: "20px", background: cenario.color + "20", border: `1px solid ${cenario.color}50`, fontSize: "11px", fontWeight: 700, color: cenario.color }}>
              {cenario.label}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cenario.projecao} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="gCen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cenario.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cenario.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [R(v), ""]} />
              <Area type="monotone" dataKey="caixa" name="Saldo projetado" stroke={cenario.color} strokeWidth={2.5} fill="url(#gCen)" dot={{ r: 4, fill: cenario.color }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* KPIs do cenário */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>Indicadores do cenário</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { label: "Receita projetada", value: R(cenario.kpis.receita) },
              { label: "Despesa projetada", value: R(cenario.kpis.despesa) },
              { label: "Lucro estimado", value: R(cenario.kpis.lucro), color: cenario.kpis.lucro >= 0 ? "var(--success)" : "var(--danger)" },
              { label: "Margem", value: `${cenario.kpis.margem}%`, color: cenario.kpis.margem >= 8 ? "var(--success)" : cenario.kpis.margem >= 0 ? "var(--warning)" : "var(--danger)" },
              { label: "Saldo projetado", value: R(cenario.kpis.caixa) },
              { label: "Autonomia financeira", value: `${cenario.kpis.autonomia} dias` },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-tertiary)", borderRadius: "7px", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{item.label}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: item.color || "var(--text-primary)" }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "8px" }}>Premissas</div>
            {cenario.pressupostos.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: "7px", alignItems: "flex-start", marginBottom: "5px" }}>
                <CheckCircle size={12} style={{ color: cenario.color, flexShrink: 0, marginTop: "2px" }} />
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparativo entre cenários */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
          Comparativo de Saldo — Todos os Cenários
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={comparativo} margin={{ top: 4, right: 4, left: 4, bottom: 4 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [R(v), ""]} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="pessimista" name="Pessimista" fill="var(--danger)" radius={[3, 3, 0, 0]} opacity={0.7} />
            <Bar dataKey="conservador" name="Conservador" fill="var(--warning)" radius={[3, 3, 0, 0]} opacity={0.7} />
            <Bar dataKey="realista" name="Realista" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.8} />
            <Bar dataKey="otimista" name="Otimista" fill="var(--success)" radius={[3, 3, 0, 0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
