"use client"

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from "recharts"
import { Target, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const metas = [
  {
    id: "1", categoria: "Receita", nome: "Faturamento mensal", meta: 350000, realizado: 312000,
    prazo: "Dez 2026", status: "em_andamento", prioridade: "alta",
    historico: [280000, 290000, 295000, 298000, 305000, 312000],
  },
  {
    id: "2", categoria: "Lucro", nome: "Margem líquida ≥ 10%", meta: 10, realizado: 5.9,
    prazo: "Set 2026", status: "em_risco", prioridade: "critica",
    historico: [4.1, 5.2, 4.8, 5.5, 5.7, 5.9],
  },
  {
    id: "3", categoria: "Caixa", nome: "Reserva de 90 dias", meta: 864000, realizado: 284750,
    prazo: "Dez 2026", status: "em_andamento", prioridade: "alta",
    historico: [120000, 150000, 180000, 210000, 248000, 284750],
  },
  {
    id: "4", categoria: "Inadimplência", nome: "Inadimplência ≤ 5%", meta: 5, realizado: 19.9,
    prazo: "Jul 2026", status: "em_risco", prioridade: "critica",
    historico: [18, 18.5, 17, 17.5, 18.8, 19.9],
  },
  {
    id: "5", categoria: "Crescimento", nome: "Crescimento de receita 20%/ano", meta: 20, realizado: 18.2,
    prazo: "Mai 2027", status: "em_andamento", prioridade: "media",
    historico: [8, 12, 14, 15, 17, 18.2],
  },
  {
    id: "6", categoria: "Eficiência", nome: "Folha ≤ 28% do faturamento", meta: 28, realizado: 31.5,
    prazo: "Set 2026", status: "em_risco", prioridade: "alta",
    historico: [27, 27.5, 28.4, 29.2, 30.5, 31.5],
  },
  {
    id: "7", categoria: "Clientes", nome: "5 clientes novos no semestre", meta: 5, realizado: 2,
    prazo: "Nov 2026", status: "em_andamento", prioridade: "media",
    historico: [0, 0, 1, 1, 1, 2],
  },
  {
    id: "8", categoria: "Recorrência", nome: "Receita recorrente ≥ 60%", meta: 60, realizado: 35,
    prazo: "Dez 2026", status: "em_andamento", prioridade: "media",
    historico: [30, 31, 32, 33, 34, 35],
  },
]

function ProgressBar({ realizado, meta, isReverse = false }: { realizado: number; meta: number; isReverse?: boolean }) {
  const pct = Math.min((realizado / meta) * 100, 100)
  const isGood = isReverse ? realizado <= meta : realizado >= meta
  const isClose = isReverse ? realizado <= meta * 1.2 : realizado >= meta * 0.8
  const color = isGood ? "var(--success)" : isClose ? "var(--warning)" : "var(--danger)"
  return (
    <div style={{ height: "6px", background: "var(--bg-elevated)", borderRadius: "3px", overflow: "hidden" }}>
      <div style={{ width: `${isReverse ? Math.min((meta / realizado) * 100, 100) : pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.5s ease" }} />
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: typeof Target }> = {
    em_andamento: { label: "Em andamento", color: "var(--accent)", icon: Clock },
    em_risco: { label: "Em risco", color: "var(--danger)", icon: AlertTriangle },
    concluida: { label: "Concluída", color: "var(--success)", icon: CheckCircle },
  }
  const s = map[status]
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "12px", background: s.color + "20", color: s.color, fontSize: "10px", fontWeight: 700, border: `1px solid ${s.color}40` }}>
      <s.icon size={10} />
      {s.label}
    </span>
  )
}

const totalMetas = metas.length
const emRisco = metas.filter(m => m.status === "em_risco").length
const emAndamento = metas.filter(m => m.status === "em_andamento").length

export default function MetasPage() {
  const progressoGeral = metas.reduce((sum, m) => {
    const pct = Math.min((m.realizado / m.meta) * 100, 100)
    return sum + pct
  }, 0) / metas.length

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Metas</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Acompanhamento das metas financeiras e estratégicas</p>
      </div>

      {/* Resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "10px", marginBottom: "18px" }}>
        <div style={{ padding: "16px 20px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Progresso geral</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent)", letterSpacing: "-1px" }}>{progressoGeral.toFixed(0)}%</div>
            <div style={{ flex: 1 }}>
              <div style={{ height: "8px", background: "var(--bg-elevated)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${progressoGeral}%`, height: "100%", background: "var(--accent)", borderRadius: "4px" }} />
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{totalMetas} metas ativas</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px", background: "var(--bg-secondary)", border: "1px solid var(--accent)28", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Em andamento</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent)" }}>{emAndamento}</div>
        </div>
        <div style={{ padding: "16px", background: "var(--bg-secondary)", border: "1px solid var(--danger)28", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Em risco</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--danger)" }}>{emRisco}</div>
        </div>
        <div style={{ padding: "16px", background: "var(--bg-secondary)", border: "1px solid var(--success)28", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Críticas em risco</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--danger)" }}>
            {metas.filter(m => m.status === "em_risco" && m.prioridade === "critica").length}
          </div>
        </div>
      </div>

      {/* Gráfico de progresso */}
      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "14px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>Progresso das Metas (%)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metas.map(m => ({ nome: m.nome.slice(0, 22), pct: Math.min((m.realizado / m.meta) * 100, 100).toFixed(0), status: m.status }))} layout="vertical" margin={{ top: 4, right: 40, left: 160, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="nome" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={158} />
            <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [`${v}%`, "Progresso"]} />
            <ReferenceLine x={100} stroke="var(--success)" strokeDasharray="4 4" />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
              {metas.map((m) => (
                <Cell key={m.id} fill={m.status === "em_risco" ? "var(--danger)" : "var(--accent)"} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lista detalhada */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {metas.map(meta => {
          const pct = Math.min((meta.realizado / meta.meta) * 100, 100)
          const color = meta.status === "em_risco" ? "var(--danger)" : meta.status === "concluida" ? "var(--success)" : "var(--accent)"
          return (
            <div key={meta.id} style={{ padding: "16px 18px", background: "var(--bg-secondary)", border: `1px solid ${color}22`, borderRadius: "var(--radius)", borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>{meta.categoria}</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{meta.nome}</div>
                </div>
                <StatusChip status={meta.status} />
              </div>
              <div style={{ display: "flex", gap: "14px", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>Realizado</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color }}>
                    {typeof meta.realizado === "number" && meta.realizado > 1000 ? R(meta.realizado) : `${meta.realizado}${["Lucro", "Inadimplência", "Crescimento", "Eficiência", "Recorrência"].includes(meta.categoria) ? "%" : ""}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>Meta</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-secondary)" }}>
                    {typeof meta.meta === "number" && meta.meta > 1000 ? R(meta.meta) : `${meta.meta}${["Lucro", "Inadimplência", "Crescimento", "Eficiência", "Recorrência"].includes(meta.categoria) ? "%" : ""}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>Progresso</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color }}>{pct.toFixed(0)}%</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>Prazo</div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>{meta.prazo}</div>
                </div>
              </div>
              <ProgressBar realizado={meta.realizado} meta={meta.meta} isReverse={["Inadimplência", "Eficiência"].includes(meta.categoria)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
