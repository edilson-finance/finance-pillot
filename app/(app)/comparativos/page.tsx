"use client"

import {
  BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useState } from "react"
import { useRevenueSeries } from "@/lib/analytics-client"
import { useDateRange } from "@/lib/date-context"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const periodos = [
  { key: "mensal", label: "Mês a Mês" },
  { key: "trimestral", label: "Trimestral" },
  { key: "anual", label: "Anual" },
]

const dimensoes = ["Receita", "Despesa", "Lucro", "Margem %"]

const comparativoTrimestral = [
  { periodo: "T2 2025", receita: 776000, despesa: 704000, lucro: 72000, margem: 9.3 },
  { periodo: "T3 2025", receita: 841000, despesa: 764000, lucro: 77000, margem: 9.2 },
  { periodo: "T4 2025", receita: 924000, despesa: 861000, lucro: 63000, margem: 6.8 },
  { periodo: "T1 2026", receita: 851000, despesa: 781000, lucro: 70000, margem: 8.2 },
  { periodo: "T2 2026*", receita: 312000, despesa: 288000, lucro: 24000, margem: 7.7 },
]

const categorias = [
  { nome: "Folha", atual: 98400, anterior: 92000, meta: 88000 },
  { nome: "Materiais", atual: 72800, anterior: 71000, meta: 70000 },
  { nome: "Subcontratados", atual: 48600, anterior: 47000, meta: 45000 },
  { nome: "Aluguel", atual: 28400, anterior: 28400, meta: 28000 },
  { nome: "Impostos", atual: 18900, anterior: 17500, meta: 18000 },
]

function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const color = value > 0 ? "var(--danger)" : value < 0 ? "var(--success)" : "var(--text-muted)"
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color, fontSize: "11px", fontWeight: 700 }}>
      <Icon size={11} />
      {value > 0 ? "+" : ""}{value}{suffix}
    </span>
  )
}

export default function ComparativosPage() {
  const { range } = useDateRange()
  const { series: revenueExpenseData } = useRevenueSeries(range)
  const [periodo, setPeriodo] = useState("mensal")
  const [dimensao, setDimensao] = useState("Receita")

  const comparativoMensal = revenueExpenseData.slice(-6).map((d, i) => {
    const fallback = revenueExpenseData[0] ?? { receita: 0, despesa: 0 }
    const ant = revenueExpenseData[revenueExpenseData.length - 6 - 6 + i] ?? fallback
    return {
      mes: d.mes,
      atual_receita: d.receita,
      anterior_receita: ant.receita,
      atual_despesa: d.despesa,
      anterior_despesa: ant.despesa,
      atual_lucro: d.receita - d.despesa,
      anterior_lucro: ant.receita - ant.despesa,
      variacao_receita: ant.receita === 0 ? 0 : parseFloat(((d.receita - ant.receita) / ant.receita * 100).toFixed(1)),
    }
  })

  const keyAtual = `atual_${dimensao.toLowerCase().replace(" %", "").replace("é", "e")}` as keyof typeof comparativoMensal[0]
  const keyAnterior = `anterior_${dimensao.toLowerCase().replace(" %", "").replace("é", "e")}` as keyof typeof comparativoMensal[0]

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Comparativos</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Compare períodos, categorias e indicadores lado a lado</p>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px", padding: "4px", background: "var(--bg-tertiary)", borderRadius: "10px", border: "1px solid var(--border)" }}>
          {periodos.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              style={{
                padding: "5px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                background: periodo === p.key ? "var(--accent)" : "transparent",
                border: "none",
                color: periodo === p.key ? "#fff" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "4px", padding: "4px", background: "var(--bg-tertiary)", borderRadius: "10px", border: "1px solid var(--border)" }}>
          {dimensoes.map(d => (
            <button key={d} onClick={() => setDimensao(d)}
              style={{
                padding: "5px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                background: dimensao === d ? "var(--bg-secondary)" : "transparent",
                border: dimensao === d ? "1px solid var(--border-strong)" : "none",
                color: dimensao === d ? "var(--text-primary)" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Gráfico comparativo */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
            {dimensao} — {periodo === "mensal" ? "Mês a Mês (atual vs 6 meses atrás)" : "Comparativo Trimestral"}
          </div>
          {periodo === "mensal" ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={comparativoMensal} margin={{ top: 4, right: 4, left: 4, bottom: 4 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [R(v), ""]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="atual_receita" name="Período atual" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.9} />
                <Bar dataKey="anterior_receita" name="Período anterior" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.35} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={comparativoTrimestral} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: any) => R(Number(v))} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar yAxisId="left" dataKey="receita" name="Receita" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.8} />
                <Bar yAxisId="left" dataKey="despesa" name="Despesa" fill="var(--danger)" radius={[3, 3, 0, 0]} opacity={0.7} />
                <Line yAxisId="right" type="monotone" dataKey="margem" name="Margem %" stroke="var(--success)" strokeWidth={2} dot={{ r: 4, fill: "var(--success)" }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Variações */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>Variações do período</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {comparativoMensal.slice(-3).map(item => (
              <div key={item.mes} style={{ padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{item.mes}</span>
                  <Delta value={item.variacao_receita} />
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{R(item.atual_receita)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparativo por categoria */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
          Despesas: Atual vs Anterior vs Meta
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={categorias} margin={{ top: 4, right: 4, left: 4, bottom: 4 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [R(v), ""]} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="atual" name="Atual" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.9} />
            <Bar dataKey="anterior" name="Mês anterior" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.4} />
            <Bar dataKey="meta" name="Meta" fill="var(--success)" radius={[3, 3, 0, 0]} opacity={0.6} />
          </BarChart>
        </ResponsiveContainer>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginTop: "14px" }}>
          {categorias.map(cat => {
            const varAtAnt = ((cat.atual - cat.anterior) / cat.anterior * 100)
            const varAtMeta = ((cat.atual - cat.meta) / cat.meta * 100)
            return (
              <div key={cat.nome} style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>{cat.nome}</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>{R(cat.atual)}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>vs anterior</span>
                    <Delta value={parseFloat(varAtAnt.toFixed(1))} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>vs meta</span>
                    <Delta value={parseFloat(varAtMeta.toFixed(1))} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
