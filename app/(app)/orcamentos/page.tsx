"use client"

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend, ComposedChart, Line,
} from "recharts"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useState } from "react"

const R = formatCurrency

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai"]

const orcamentoCategoria = [
  {
    categoria: "Receita Total",
    tipo: "receita",
    orcado: [310000, 315000, 320000, 325000, 330000],
    realizado: [279000, 264000, 308000, 289000, 312000],
  },
  {
    categoria: "Folha de Pagamento",
    tipo: "despesa",
    orcado: [88000, 88000, 88000, 90000, 90000],
    realizado: [93000, 94000, 96000, 97000, 98400],
  },
  {
    categoria: "Materiais e Insumos",
    tipo: "despesa",
    orcado: [70000, 70000, 71000, 71000, 72000],
    realizado: [68000, 70000, 71000, 72000, 72800],
  },
  {
    categoria: "Subempreiteiros",
    tipo: "despesa",
    orcado: [46000, 46000, 47000, 47000, 48000],
    realizado: [45000, 46000, 47000, 47500, 48600],
  },
  {
    categoria: "Aluguel e Locações",
    tipo: "despesa",
    orcado: [28400, 28400, 28400, 28400, 28400],
    realizado: [28400, 28400, 28400, 28400, 28400],
  },
  {
    categoria: "Impostos e Taxas",
    tipo: "despesa",
    orcado: [18000, 18000, 18500, 18500, 18500],
    realizado: [17500, 17800, 18200, 18600, 18900],
  },
]

const mesAtivo = 4 // Mai

const resumoMes = {
  orcadoReceita: orcamentoCategoria.filter(c => c.tipo === "receita").reduce((s, c) => s + c.orcado[mesAtivo], 0),
  realizadoReceita: orcamentoCategoria.filter(c => c.tipo === "receita").reduce((s, c) => s + c.realizado[mesAtivo], 0),
  orcadoDespesa: orcamentoCategoria.filter(c => c.tipo === "despesa").reduce((s, c) => s + c.orcado[mesAtivo], 0),
  realizadoDespesa: orcamentoCategoria.filter(c => c.tipo === "despesa").reduce((s, c) => s + c.realizado[mesAtivo], 0),
}

const evolucaoOrcamento = meses.map((mes, i) => ({
  mes,
  orcadoReceita: orcamentoCategoria.filter(c => c.tipo === "receita").reduce((s, c) => s + c.orcado[i], 0),
  realizadoReceita: orcamentoCategoria.filter(c => c.tipo === "receita").reduce((s, c) => s + c.realizado[i], 0),
  orcadoDespesa: orcamentoCategoria.filter(c => c.tipo === "despesa").reduce((s, c) => s + c.orcado[i], 0),
  realizadoDespesa: orcamentoCategoria.filter(c => c.tipo === "despesa").reduce((s, c) => s + c.realizado[i], 0),
  variacaoReceita: parseFloat((((orcamentoCategoria.filter(c => c.tipo === "receita").reduce((s, c) => s + c.realizado[i], 0) - orcamentoCategoria.filter(c => c.tipo === "receita").reduce((s, c) => s + c.orcado[i], 0)) / orcamentoCategoria.filter(c => c.tipo === "receita").reduce((s, c) => s + c.orcado[i], 0)) * 100).toFixed(1)),
}))

function Variacao({ orcado, realizado, isExpense = false }: { orcado: number; realizado: number; isExpense?: boolean }) {
  const diff = realizado - orcado
  const pct = ((diff / orcado) * 100).toFixed(1)
  const isBad = isExpense ? diff > 0 : diff < 0
  const color = diff === 0 ? "var(--text-muted)" : isBad ? "var(--danger)" : "var(--success)"
  const Icon = diff === 0 ? Minus : diff > 0 ? TrendingUp : TrendingDown
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", fontWeight: 700, color }}>
      <Icon size={11} />
      {diff >= 0 ? "+" : ""}{pct}%
    </span>
  )
}

export default function OrcamentosPage() {
  const [mesSel, setMesSel] = useState(mesAtivo)
  const varReceita = ((resumoMes.realizadoReceita - resumoMes.orcadoReceita) / resumoMes.orcadoReceita * 100).toFixed(1)
  const varDespesa = ((resumoMes.realizadoDespesa - resumoMes.orcadoDespesa) / resumoMes.orcadoDespesa * 100).toFixed(1)

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Orçamentos</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Orçado vs Realizado — controle de desvios e aderência ao planejamento</p>
      </div>

      {/* Resumo do mês */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "14px" }}>
        {[
          { label: "Receita orçada", value: R(resumoMes.orcadoReceita), color: "var(--accent)" },
          { label: "Receita realizada", value: R(resumoMes.realizadoReceita), sub: `${varReceita}% vs orçado`, color: parseFloat(varReceita) >= 0 ? "var(--success)" : "var(--danger)" },
          { label: "Despesa orçada", value: R(resumoMes.orcadoDespesa), color: "var(--text-secondary)" },
          { label: "Despesa realizada", value: R(resumoMes.realizadoDespesa), sub: `${varDespesa}% vs orçado`, color: parseFloat(varDespesa) > 0 ? "var(--danger)" : "var(--success)" },
        ].map(item => (
          <div key={item.label} style={{ padding: "14px 16px", background: "var(--bg-secondary)", border: `1px solid ${item.color}28`, borderRadius: "var(--radius)", borderTop: `3px solid ${item.color}` }}>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>{item.label}</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: item.color, letterSpacing: "-0.3px" }}>{item.value}</div>
            {item.sub && <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{item.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Gráfico evolução */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>Orçado vs Realizado — Receita (Jan a Mai)</div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={evolucaoOrcamento} margin={{ top: 4, right: 4, left: 4, bottom: 4 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [R(v), ""]} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="orcadoReceita" name="Orçado" fill="var(--accent)" opacity={0.3} radius={[3, 3, 0, 0]} />
              <Bar dataKey="realizadoReceita" name="Realizado" fill="var(--accent)" opacity={0.9} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="variacaoReceita" name="Variação %" stroke="var(--warning)" strokeWidth={2} dot={{ r: 3, fill: "var(--warning)" }} yAxisId={0} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Aderência ao orçamento */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>Aderência ao orçamento</div>
          {evolucaoOrcamento.map(item => {
            const aderencia = Math.min((item.realizadoReceita / item.orcadoReceita) * 100, 120)
            const color = aderencia >= 95 ? "var(--success)" : aderencia >= 85 ? "var(--warning)" : "var(--danger)"
            return (
              <div key={item.mes} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{item.mes}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color }}>{aderencia.toFixed(0)}%</span>
                </div>
                <div style={{ height: "5px", background: "var(--bg-elevated)", borderRadius: "3px" }}>
                  <div style={{ width: `${Math.min(aderencia, 100)}%`, height: "100%", background: color, borderRadius: "3px" }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabela por categoria */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)", display: "flex", gap: "20px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Desvio por Categoria — Maio 2026</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              {["Categoria", "Tipo", "Orçado", "Realizado", "Desvio R$", "Desvio %", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orcamentoCategoria.map((cat, i) => {
              const orcado = cat.orcado[mesAtivo]
              const real = cat.realizado[mesAtivo]
              const desvio = real - orcado
              const isExpense = cat.tipo === "despesa"
              const isBad = isExpense ? desvio > 0 : desvio < 0
              const statusColor = Math.abs(desvio / orcado) < 0.02 ? "var(--success)" : isBad ? "var(--danger)" : "var(--success)"
              return (
                <tr key={cat.categoria} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-tertiary)" }}>
                  <td style={{ padding: "11px 14px", fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>{cat.categoria}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 600, background: cat.tipo === "receita" ? "var(--accent-soft)" : "var(--danger-soft)", color: cat.tipo === "receita" ? "var(--accent-light)" : "var(--danger)" }}>
                      {cat.tipo === "receita" ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>{R(orcado)}</td>
                  <td style={{ padding: "11px 14px", fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{R(real)}</td>
                  <td style={{ padding: "11px 14px", fontSize: "12px", fontWeight: 700, color: statusColor }}>
                    {desvio >= 0 ? "+" : ""}{R(desvio)}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <Variacao orcado={orcado} realizado={real} isExpense={isExpense} />
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {Math.abs(desvio / orcado) < 0.02 ? (
                      <CheckCircle size={14} style={{ color: "var(--success)" }} />
                    ) : isBad ? (
                      <AlertTriangle size={14} style={{ color: "var(--danger)" }} />
                    ) : (
                      <CheckCircle size={14} style={{ color: "var(--success)" }} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
