"use client"

import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts"
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react"
import { revenueExpenseData, dreData } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const margemData = revenueExpenseData.map(d => ({
  mes: d.mes,
  bruta: parseFloat(((d.receita - d.receita * 0.07 - d.receita * 0.57) / d.receita * 100).toFixed(1)),
  contribuicao: parseFloat(((d.receita - d.despesa * 0.65) / d.receita * 100).toFixed(1)),
  operacional: parseFloat(((d.receita - d.despesa * 0.82) / d.receita * 100).toFixed(1)),
  liquida: parseFloat(((d.receita - d.despesa) / d.receita * 100 * 0.41).toFixed(1)),
}))

const margemAtual = [
  { label: "Margem Bruta", valor: 43.3, referencia: 45, status: "atencao", descricao: "Receita após custos diretos de produção" },
  { label: "Margem de Contribuição", valor: 37.5, referencia: 40, status: "atencao", descricao: "Após custos variáveis — base para cobertura de fixos" },
  { label: "Margem Operacional (EBITDA)", valor: 19.7, referencia: 18, status: "saudavel", descricao: "Eficiência operacional antes de juros e impostos" },
  { label: "Margem Líquida", valor: 5.9, referencia: 10, status: "risco", descricao: "Lucro real sobre a receita total" },
]

const composicaoDespesas = [
  { nome: "Custos Variáveis", valor: 176800, porcentagem: 56.7 },
  { nome: "Despesas Fixas", valor: 55700, porcentagem: 17.8 },
  { nome: "Despesas Financeiras", valor: 17200, porcentagem: 5.5 },
  { nome: "Retiradas", valor: 25804, porcentagem: 8.3 },
  { nome: "Lucro Líquido", valor: 18400, porcentagem: 5.9 },
  { nome: "Outros", valor: 18096, porcentagem: 5.8 },
]

function StatusDot({ status }: { status: string }) {
  const color = status === "saudavel" ? "var(--success)" : status === "atencao" ? "var(--warning)" : "var(--danger)"
  return <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
}

export default function MargensPage() {
  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Margens</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Análise profunda das margens financeiras e estrutura de rentabilidade</p>
      </div>

      {/* Cards de margens */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
        {margemAtual.map(m => {
          const color = m.status === "saudavel" ? "var(--success)" : m.status === "atencao" ? "var(--warning)" : "var(--danger)"
          const diff = m.valor - m.referencia
          return (
            <div key={m.label} style={{ padding: "16px", background: "var(--bg-secondary)", border: `1px solid ${color}28`, borderRadius: "var(--radius)", borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>{m.label}</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color, letterSpacing: "-1px", marginBottom: "4px" }}>{m.valor}%</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                {diff >= 0 ? <TrendingUp size={11} style={{ color: "var(--success)" }} /> : <TrendingDown size={11} style={{ color: "var(--danger)" }} />}
                <span style={{ fontSize: "11px", color: diff >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {diff >= 0 ? "+" : ""}{diff.toFixed(1)}pp vs ref. ({m.referencia}%)
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>{m.descricao}</p>
            </div>
          )
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Evolução das margens */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Evolução das Margens — 12 meses</div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "14px" }}>Compressão da margem líquida ao longo do ano</div>
          <div style={{ display: "flex", gap: "14px", marginBottom: "12px", flexWrap: "wrap" }}>
            {[
              { label: "Bruta", color: "var(--accent)" },
              { label: "Contribuição", color: "var(--purple)" },
              { label: "Operacional", color: "var(--info)" },
              { label: "Líquida", color: "var(--success)" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-muted)" }}>
                <div style={{ width: "16px", height: "2px", background: l.color, borderRadius: "1px" }} />
                {l.label}
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={margemData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v: any) => [`${v}%`, ""]} />
              <ReferenceLine y={10} stroke="var(--success)" strokeDasharray="4 4" label={{ value: "Meta líquida 10%", fontSize: 9, fill: "var(--success)" }} />
              <Line type="monotone" dataKey="bruta" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="contribuicao" stroke="var(--purple)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="operacional" stroke="var(--info)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="liquida" stroke="var(--success)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--success)" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Waterfall / Cascata */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>Cascata de Margem — Mai/26</div>
          {[
            { label: "Receita Bruta", valor: 312000, tipo: "total", color: "var(--accent)" },
            { label: "(-) Deduções", valor: -18096, tipo: "reducao", color: "var(--danger)" },
            { label: "= Receita Líquida", valor: 293904, tipo: "subtotal", color: "var(--text-primary)" },
            { label: "(-) Custos Variáveis", valor: -176800, tipo: "reducao", color: "var(--danger)" },
            { label: "= Margem Contribuição", valor: 117104, tipo: "subtotal", color: "var(--purple)" },
            { label: "(-) Despesas Fixas", valor: -55700, tipo: "reducao", color: "var(--danger)" },
            { label: "= EBITDA", valor: 61404, tipo: "subtotal", color: "var(--info)" },
            { label: "(-) Financeiro + Retiradas", valor: -43004, tipo: "reducao", color: "var(--danger)" },
            { label: "= Lucro Líquido", valor: 18400, tipo: "lucro", color: "var(--success)" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "11px", color: item.tipo === "subtotal" || item.tipo === "lucro" ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: item.tipo !== "reducao" ? 600 : 400 }}>{item.label}</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: item.color }}>{item.valor >= 0 ? R(item.valor) : `-${R(Math.abs(item.valor))}`}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Composição de custos */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>Composição da Receita — Para Onde Vai Cada R$</div>
        <div style={{ display: "flex", height: "48px", borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
          {composicaoDespesas.map((item, i) => {
            const colors = ["var(--danger)", "var(--warning)", "var(--purple)", "var(--info)", "var(--success)", "var(--text-muted)"]
            return (
              <div key={item.nome} title={`${item.nome}: ${item.porcentagem}%`}
                style={{ width: `${item.porcentagem}%`, background: colors[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px" }}>
                {item.porcentagem >= 8 ? `${item.porcentagem}%` : ""}
              </div>
            )
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
          {composicaoDespesas.map((item, i) => {
            const colors = ["var(--danger)", "var(--warning)", "var(--purple)", "var(--info)", "var(--success)", "var(--text-muted)"]
            return (
              <div key={item.nome} style={{ padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)", borderTop: `3px solid ${colors[i]}` }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>{item.nome}</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>{item.porcentagem}%</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{R(item.valor)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
