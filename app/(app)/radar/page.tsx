"use client"

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts"
import { Activity, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react"
import Link from "next/link"
import { healthDimensions, revenueExpenseData } from "@/lib/mock-data"

const radarData = healthDimensions.map(d => ({
  subject: d.nome,
  atual: d.nota,
  referencia: 8,
  fullMark: 10,
}))

const evolucaoRadar = [
  { mes: "Fev", score: 5.8 },
  { mes: "Mar", score: 6.1 },
  { mes: "Abr", score: 5.9 },
  { mes: "Mai", score: 6.3 },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    saudavel: { label: "Saudável", color: "var(--success)" },
    atencao: { label: "Atenção", color: "var(--warning)" },
    risco: { label: "Risco", color: "var(--danger)" },
    critico: { label: "Crítico", color: "var(--danger)" },
  }
  const s = map[status] || { label: status, color: "var(--text-muted)" }
  return (
    <span style={{
      padding: "2px 8px", borderRadius: "12px",
      fontSize: "10px", fontWeight: 700,
      background: s.color + "20", color: s.color,
      border: `1px solid ${s.color}40`,
    }}>{s.label}</span>
  )
}

function getIcon(nota: number) {
  if (nota >= 7) return <TrendingUp size={12} style={{ color: "var(--success)" }} />
  if (nota >= 5) return <Minus size={12} style={{ color: "var(--warning)" }} />
  return <TrendingDown size={12} style={{ color: "var(--danger)" }} />
}

const healthScore = parseFloat((healthDimensions.reduce((s, d) => s + d.nota, 0) / healthDimensions.length).toFixed(1))

export default function RadarPage() {
  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Radar Financeiro</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Visão 360° da saúde financeira — 10 dimensões avaliadas</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Radar chart */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Mapa de Saúde Financeira</div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--text-muted)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--accent)", opacity: 0.7 }} /> Atual
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--text-muted)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--success)", opacity: 0.4 }} /> Referência
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--warning)", letterSpacing: "-1px" }}>{healthScore}</div>
            <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>/10</div>
            <div style={{ padding: "3px 10px", borderRadius: "20px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", fontSize: "10.5px", fontWeight: 700, color: "var(--warning)" }}>Atenção Necessária</div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
              <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9, fill: "var(--text-muted)" }} />
              <Radar name="Referência" dataKey="referencia" stroke="var(--success)" fill="var(--success)" fillOpacity={0.08} strokeDasharray="3 3" strokeWidth={1} />
              <Radar name="Atual" dataKey="atual" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dimensões detalhe + evolução */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Evolução do score */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>Evolução da Nota Geral</div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={evolucaoRadar} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--warning)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} />
                <Area type="monotone" dataKey="score" stroke="var(--warning)" strokeWidth={2} fill="url(#gScore)" dot={{ r: 4, fill: "var(--warning)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Lista dimensões */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px", flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>Dimensões em Detalhe</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[...healthDimensions].sort((a, b) => a.nota - b.nota).map((dim) => (
                <div key={dim.nome} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  {getIcon(dim.nota)}
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", minWidth: "100px" }}>{dim.nome}</span>
                  <div style={{ flex: 1, height: "4px", background: "var(--bg-elevated)", borderRadius: "2px" }}>
                    <div style={{ width: `${dim.nota * 10}%`, height: "100%", borderRadius: "2px", background: dim.nota >= 7 ? "var(--success)" : dim.nota >= 5 ? "var(--warning)" : "var(--danger)", transition: "width 0.5s ease" }} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", minWidth: "28px", textAlign: "right" }}>{dim.nota}</span>
                  <StatusBadge status={dim.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Descrições */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
        {healthDimensions.map((dim) => (
          <div key={dim.nome} style={{
            padding: "13px 14px",
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", borderTop: `3px solid ${dim.nota >= 7 ? "var(--success)" : dim.nota >= 5 ? "var(--warning)" : "var(--danger)"}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{dim.nome}</span>
              <span style={{ fontSize: "15px", fontWeight: 800, color: dim.nota >= 7 ? "var(--success)" : dim.nota >= 5 ? "var(--warning)" : "var(--danger)" }}>{dim.nota}</span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>{dim.descricao}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
