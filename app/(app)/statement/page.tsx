"use client"

import { useMemo, useState } from "react"
import { Landmark, Search, TrendingUp, TrendingDown, Wallet, Building2 } from "lucide-react"
import { useDateRange } from "@/lib/date-context"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useStatementData } from "@/lib/statement-data"
import { buildStatement, type StatementFilters } from "@/lib/statement-build"
import { formatCurrency, formatDate } from "@/lib/utils"

const R = formatCurrency

const labelStyle: React.CSSProperties = {
  fontSize: "10.5px", fontWeight: 700, color: "var(--text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px",
}
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "9px 10px", background: "var(--bg-tertiary)",
  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
  fontSize: "12.5px", color: "var(--text-primary)", fontFamily: "inherit", cursor: "pointer",
}

// Cor para valores: positivo verde, negativo vermelho, zero neutro.
function valueColor(v: number): string {
  if (v > 0) return "var(--success)"
  if (v < 0) return "var(--danger)"
  return "var(--text-primary)"
}

interface KpiDef {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  color: string
  signed?: boolean // mostra sinal explícito (Total do período)
}

export default function StatementPage() {
  const { range } = useDateRange()
  const data = useStatementData(range)
  const [filters, setFilters] = useState<StatementFilters>({ accountId: "", search: "" })

  const built = useMemo(() => buildStatement(data, filters), [data, filters])
  const setF = (patch: Partial<StatementFilters>) => setFilters((f) => ({ ...f, ...patch }))

  const k = built.kpis
  const kpis: KpiDef[] = [
    { label: "Receitas em aberto", value: k.receitasEmAberto, icon: TrendingUp, color: "var(--success)" },
    { label: "Receitas realizadas", value: k.receitasRealizadas, icon: TrendingUp, color: "var(--success)" },
    { label: "Despesas em aberto", value: k.despesasEmAberto, icon: TrendingDown, color: "var(--danger)" },
    { label: "Despesas realizadas", value: k.despesasRealizadas, icon: TrendingDown, color: "var(--danger)" },
    { label: "Total do período", value: k.totalPeriodo, icon: Wallet, color: valueColor(k.totalPeriodo), signed: true },
  ]

  const hasGroups = built.groups.length > 0

  return (
    <div style={{ padding: "22px" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <Landmark size={22} style={{ color: "var(--accent)" }} />
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.4px" }}>Extrato de Movimentação</h1>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Saldos e movimentações por conta bancária — realizado e previsto</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(180px, 240px) 1fr", gap: "12px", marginBottom: "18px", alignItems: "end" }}>
        <div>
          <div style={labelStyle}>Período</div>
          <DateRangePicker />
        </div>
        <div>
          <div style={labelStyle}>Conta</div>
          <select style={selectStyle} value={filters.accountId} onChange={(e) => setF({ accountId: e.target.value })}>
            <option value="">Todas as contas</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.bank ? ` · ${a.bank}` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Buscar</div>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={filters.search}
              onChange={(e) => setF({ search: e.target.value })}
              placeholder="Filtrar por descrição…"
              style={{ ...selectStyle, paddingLeft: "30px", cursor: "text" }}
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          const display = kpi.signed
            ? `${kpi.value >= 0 ? "" : "-"}${R(Math.abs(kpi.value))}`
            : R(kpi.value)
          return (
            <div key={kpi.label} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <Icon size={14} style={{ color: kpi.color }} />
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{kpi.label}</span>
              </div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: kpi.color, letterSpacing: "-0.3px" }}>{display}</div>
            </div>
          )
        })}
      </div>

      {/* Grupos por conta */}
      {data.loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>Carregando…</div>
      ) : !hasGroups ? (
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          <Landmark size={30} style={{ marginBottom: "8px", opacity: 0.4 }} />
          <div style={{ fontSize: "13px" }}>Sem movimentação para os filtros atuais</div>
          <div style={{ fontSize: "11px", marginTop: "4px" }}>Ajuste o período ou a conta selecionada</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {built.groups.map((g) => (
            <div key={g.accountId ?? "sem-conta"} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              {/* Cabeçalho da conta */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                  <Building2 size={16} style={{ color: "var(--text-secondary)" }} />
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)" }}>{g.accountName}</div>
                    {g.bank && <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>{g.bank}</div>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Saldo anterior</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: valueColor(g.saldoAnterior) }}>{R(g.saldoAnterior)}</div>
                </div>
              </div>

              {/* Tabela de movimentos */}
              {g.lines.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>Sem movimentação no período</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border)" }}>
                        <th style={{ padding: "9px 18px", textAlign: "left", fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Data</th>
                        <th style={{ padding: "9px 18px", textAlign: "left", fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>Descrição</th>
                        <th style={{ padding: "9px 18px", textAlign: "left", fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Situação</th>
                        <th style={{ padding: "9px 18px", textAlign: "right", fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Valor</th>
                        <th style={{ padding: "9px 18px", textAlign: "right", fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Saldo realizado</th>
                        <th style={{ padding: "9px 18px", textAlign: "right", fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Saldo previsto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.lines.map((l) => {
                        const open = l.kind === "open"
                        return (
                          <tr key={l.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "9px 18px", fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{formatDate(l.date)}</td>
                            <td style={{ padding: "9px 18px", fontSize: "12.5px", color: "var(--text-primary)" }}>{l.description}</td>
                            <td style={{ padding: "9px 18px", whiteSpace: "nowrap" }}>
                              <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "2px 8px", borderRadius: "5px", color: open ? "var(--warning)" : "var(--success)", background: open ? "var(--warning-soft)" : "var(--success-soft)" }}>
                                {l.situacao}
                              </span>
                            </td>
                            <td style={{ padding: "9px 18px", textAlign: "right", fontSize: "12.5px", fontWeight: 600, color: valueColor(l.signed), whiteSpace: "nowrap" }}>
                              {l.signed >= 0 ? "" : "-"}{R(Math.abs(l.signed))}
                            </td>
                            <td style={{ padding: "9px 18px", textAlign: "right", fontSize: "12.5px", fontWeight: 600, color: l.saldoRealizado == null ? "var(--text-muted)" : valueColor(l.saldoRealizado), whiteSpace: "nowrap" }}>
                              {l.saldoRealizado == null ? "—" : R(l.saldoRealizado)}
                            </td>
                            <td style={{ padding: "9px 18px", textAlign: "right", fontSize: "12.5px", fontWeight: 600, color: valueColor(l.saldoPrevisto), whiteSpace: "nowrap" }}>
                              {R(l.saldoPrevisto)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "var(--bg-tertiary)", borderTop: "2px solid var(--border)" }}>
                        <td colSpan={4} style={{ padding: "10px 18px", fontSize: "11.5px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Subtotal da conta</td>
                        <td style={{ padding: "10px 18px", textAlign: "right", fontSize: "13px", fontWeight: 800, color: valueColor(g.saldoRealizadoFinal), whiteSpace: "nowrap" }}>{R(g.saldoRealizadoFinal)}</td>
                        <td style={{ padding: "10px 18px", textAlign: "right", fontSize: "13px", fontWeight: 800, color: valueColor(g.saldoPrevistoFinal), whiteSpace: "nowrap" }}>{R(g.saldoPrevistoFinal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
