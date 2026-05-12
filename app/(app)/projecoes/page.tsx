"use client"

import {
  AreaChart, Area, ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, Target, ChevronRight } from "lucide-react"
import { useState } from "react"
import { revenueExpenseData, cashflowProjection } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const horizontes = [
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
  { key: "180", label: "6 meses" },
  { key: "365", label: "12 meses" },
]

const projecao12Meses = [
  ...revenueExpenseData.slice(-3).map(d => ({ mes: d.mes, realizado: d.receita, projetado: null, projetadoDesp: null, realizadoDesp: d.despesa, tipo: "realizado" })),
  { mes: "Jun", realizado: null, projetado: 320000, projetadoDesp: 294000, realizadoDesp: null, tipo: "projetado" },
  { mes: "Jul", realizado: null, projetado: 335000, projetadoDesp: 302000, realizadoDesp: null, tipo: "projetado" },
  { mes: "Ago", realizado: null, projetado: 318000, projetadoDesp: 297000, realizadoDesp: null, tipo: "projetado" },
  { mes: "Set", realizado: null, projetado: 348000, projetadoDesp: 312000, realizadoDesp: null, tipo: "projetado" },
  { mes: "Out", realizado: null, projetado: 362000, projetadoDesp: 324000, realizadoDesp: null, tipo: "projetado" },
  { mes: "Nov", realizado: null, projetado: 378000, projetadoDesp: 338000, realizadoDesp: null, tipo: "projetado" },
  { mes: "Dez", realizado: null, projetado: 395000, projetadoDesp: 351000, realizadoDesp: null, tipo: "projetado" },
  { mes: "Jan", realizado: null, projetado: 342000, projetadoDesp: 318000, realizadoDesp: null, tipo: "projetado" },
  { mes: "Fev", realizado: null, projetado: 328000, projetadoDesp: 304000, realizadoDesp: null, tipo: "projetado" },
]

const projecaoCaixa = [
  ...cashflowProjection,
  { semana: "S1 Jul", realizado: null, projetado: 306400 },
  { semana: "S2 Jul", realizado: null, projetado: 328100 },
  { semana: "S3 Jul", realizado: null, projetado: 341800 },
  { semana: "S4 Jul", realizado: null, projetado: 312600 },
]

const cenarioResumo = [
  { cenario: "Pessimista", receita: 278000, despesa: 294000, lucro: -16000, caixa: 168000, cor: "var(--danger)" },
  { cenario: "Conservador", receita: 298000, despesa: 289000, lucro: 9000, caixa: 198000, cor: "var(--warning)" },
  { cenario: "Realista", receita: 320000, despesa: 294000, lucro: 26000, caixa: 231000, cor: "var(--accent)" },
  { cenario: "Otimista", receita: 348000, despesa: 298000, lucro: 50000, caixa: 274000, cor: "var(--success)" },
]

export default function ProjecoesPage() {
  const [horizonte, setHorizonte] = useState("90")

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Projeções</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Projeções financeiras baseadas em histórico, sazonalidade e tendências</p>
      </div>

      {/* Horizonte */}
      <div style={{ display: "flex", gap: "4px", padding: "4px", background: "var(--bg-tertiary)", borderRadius: "10px", border: "1px solid var(--border)", width: "fit-content", marginBottom: "16px" }}>
        {horizontes.map(h => (
          <button key={h.key} onClick={() => setHorizonte(h.key)}
            style={{
              padding: "5px 16px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              background: horizonte === h.key ? "var(--accent)" : "transparent",
              border: "none",
              color: horizonte === h.key ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}>
            {h.label}
          </button>
        ))}
      </div>

      {/* Resumo projetado */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "14px" }}>
        {[
          { label: "Receita projetada (Jun)", value: R(320000), var: "+2,6%", icon: TrendingUp, color: "var(--accent)" },
          { label: "Despesa projetada (Jun)", value: R(294000), var: "+2,1%", icon: TrendingDown, color: "var(--danger)" },
          { label: "Lucro projetado (Jun)", value: R(26000), var: "+41%", icon: Target, color: "var(--success)" },
          { label: "Menor saldo (24 jun)", value: R(187400), var: "Data crítica", icon: AlertTriangle, color: "var(--warning)" },
        ].map(item => (
          <div key={item.label} style={{ padding: "15px 16px", background: "var(--bg-secondary)", border: `1px solid ${item.color}28`, borderRadius: "var(--radius)", borderLeft: `3px solid ${item.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</span>
              <item.icon size={13} style={{ color: item.color, opacity: 0.7 }} />
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: item.color, letterSpacing: "-0.3px" }}>{item.value}</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{item.var} vs atual</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Projeção Receita vs Despesa */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Projeção — Receita vs Despesa</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>Realizado (sólido) + Projetado (tracejado)</div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              {[
                { label: "Receita", color: "var(--accent)" },
                { label: "Despesa", color: "var(--danger)" },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-muted)" }}>
                  <div style={{ width: "20px", height: "2px", background: l.color, borderRadius: "1px" }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={projecao12Meses} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="gProjRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => v ? [R(v), ""] : ["-", ""]} />
              <ReferenceLine x="Jun" stroke="var(--border-strong)" strokeDasharray="4 4" label={{ value: "Hoje", fontSize: 10, fill: "var(--text-muted)" }} />
              <Bar dataKey="realizado" fill="var(--accent)" opacity={0.7} radius={[2, 2, 0, 0]} />
              <Bar dataKey="projetado" fill="var(--accent)" opacity={0.3} radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="realizadoDesp" stroke="var(--danger)" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="projetadoDesp" stroke="var(--danger)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Cenários resumo */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>Cenários para junho</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {cenarioResumo.map(c => (
              <div key={c.cenario} style={{ padding: "11px 12px", background: "var(--bg-tertiary)", borderRadius: "8px", border: `1px solid ${c.cor}28`, borderLeft: `3px solid ${c.cor}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: c.cor }}>{c.cenario}</span>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: c.lucro >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {c.lucro >= 0 ? "+" : ""}{R(c.lucro)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Rec: {R(c.receita)}</span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Caixa: {R(c.caixa)}</span>
                </div>
              </div>
            ))}
          </div>
          <a href="/cenarios" style={{ textDecoration: "none" }}>
            <div style={{ textAlign: "center", fontSize: "11px", color: "var(--accent-light)", marginTop: "10px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              Ver cenários completos <ChevronRight size={10} />
            </div>
          </a>
        </div>
      </div>

      {/* Projeção de caixa */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Projeção de Saldo — Próximas 8 semanas</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>Verde: realizado · Azul tracejado: projetado</div>
          </div>
          <div style={{ padding: "4px 12px", borderRadius: "6px", background: "var(--danger-soft)", border: "1px solid rgba(244,63,94,0.3)", fontSize: "11px", color: "var(--danger)", fontWeight: 600 }}>
            <AlertTriangle size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Mínimo em 24/jun
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={projecaoCaixa} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="gCxP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semana" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => v ? [R(v), ""] : ["-", ""]} />
            <ReferenceLine y={200000} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: "Mínimo seguro", fontSize: 9, fill: "var(--warning)" }} />
            <Area type="monotone" dataKey="projetado" stroke="var(--accent)" strokeWidth={1.5} fill="url(#gCxP)" dot={false} strokeDasharray="5 3" connectNulls />
            <Area type="monotone" dataKey="realizado" stroke="var(--success)" strokeWidth={2} fill="none" dot={{ r: 3, fill: "var(--success)" }} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
