"use client"

import { useMemo, useState } from "react"
import {
  Download, FileText, BarChart2, TrendingUp, TrendingDown,
  AlertTriangle, Users, Truck, RefreshCw, Filter, Eye,
} from "lucide-react"
import { useDateRange } from "@/lib/date-context"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useReportsData } from "@/lib/reports-data"
import {
  REPORT_METAS, STATUS_OPTIONS, buildReport,
  type ReportId, type Filters, type GroupBy,
} from "@/lib/reports-build"
import { exportCsv, exportPdf } from "@/lib/export"

const ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  FileText, TrendingUp, TrendingDown, AlertTriangle, BarChart2, Users, Truck, RefreshCw,
}

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "detalhado", label: "Lançamento (detalhado)" },
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
]

const DEFAULT_FILTERS: Filters = { categoria: "", centroCusto: "", party: "", status: "", grupo: "mes" }

const labelStyle: React.CSSProperties = {
  fontSize: "10.5px", fontWeight: 700, color: "var(--text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px",
}
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "9px 10px", background: "var(--bg-tertiary)",
  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
  fontSize: "12.5px", color: "var(--text-primary)", fontFamily: "inherit", cursor: "pointer",
}

export default function ReportsPage() {
  const { range } = useDateRange()
  const [selected, setSelected] = useState<ReportId>("dre")
  const [showPreview, setShowPreview] = useState(false)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const data = useReportsData(range)
  const meta = REPORT_METAS.find((m) => m.id === selected)!
  const spec = meta.filters

  function pickReport(id: ReportId) {
    setSelected(id)
    setShowPreview(false)
    setFilters(DEFAULT_FILTERS)
  }
  const setF = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))

  const report = useMemo(() => buildReport(selected, data, filters), [selected, data, filters])
  const hasRows = report.rows.length > 0
  const subtitle = `${range.label} · ${meta.label}`
  const fileBase = meta.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  function doPdf() { if (hasRows) exportPdf(meta.label, subtitle, report.columns, report.rows) }
  function doExcel() { if (hasRows) exportCsv(fileBase, report.columns, report.rows) }

  const partyOptions = spec.party === "cliente" ? data.customers : spec.party === "fornecedor" ? data.suppliers : []
  const statusOptions = spec.status ? STATUS_OPTIONS[spec.status] : []
  const Icon = ICONS[meta.icon] ?? FileText

  const expBtn: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px",
    background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    fontSize: "12px", color: "var(--text-secondary)", fontFamily: "inherit",
    cursor: hasRows ? "pointer" : "not-allowed", opacity: hasRows ? 1 : 0.5,
  }

  return (
    <div style={{ padding: "22px" }}>
      <div style={{ marginBottom: "18px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.4px" }}>Relatórios</h1>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Gere, visualize e exporte relatórios financeiros com filtros completos</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "20px" }}>
        {/* Sidebar */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px", alignSelf: "start" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", padding: "4px 8px 8px" }}>
            Tipo de Relatório
          </div>
          {REPORT_METAS.map((m) => {
            const RIcon = ICONS[m.icon] ?? FileText
            const active = selected === m.id
            return (
              <button key={m.id} onClick={() => pickReport(m.id)} style={{
                display: "flex", alignItems: "center", gap: "9px",
                width: "100%", padding: "9px 10px", borderRadius: "7px",
                border: `1px solid ${active ? "var(--accent)" : "transparent"}`,
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
                fontSize: "12.5px", fontWeight: active ? 700 : 400,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: "1px",
              }}>
                <RIcon size={13} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
                <div>
                  <div>{m.label}</div>
                  {active && <div style={{ fontSize: "10px", color: "var(--accent)", opacity: 0.8, marginTop: "1px" }}>{m.desc}</div>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Filters panel */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Filter size={14} style={{ color: "var(--text-secondary)" }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Filtros — {meta.label}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {/* Período */}
              <div>
                <div style={labelStyle}>Período</div>
                <DateRangePicker />
              </div>

              {/* Agrupar por */}
              {spec.grupo && (
                <div>
                  <div style={labelStyle}>Agrupar por</div>
                  <select style={selectStyle} value={filters.grupo} onChange={(e) => setF({ grupo: e.target.value as GroupBy })}>
                    {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}

              {/* Categoria */}
              {spec.categoria && (
                <div>
                  <div style={labelStyle}>Categoria</div>
                  <select style={selectStyle} value={filters.categoria} onChange={(e) => setF({ categoria: e.target.value })}>
                    <option value="">Todas as categorias</option>
                    {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* Centro de Custo */}
              {spec.centroCusto && (
                <div>
                  <div style={labelStyle}>Centro de Custo</div>
                  <select style={selectStyle} value={filters.centroCusto} onChange={(e) => setF({ centroCusto: e.target.value })}>
                    <option value="">Todos</option>
                    {data.costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* Cliente / Fornecedor */}
              {spec.party && (
                <div>
                  <div style={labelStyle}>{spec.party === "cliente" ? "Cliente" : "Fornecedor"}</div>
                  <select style={selectStyle} value={filters.party} onChange={(e) => setF({ party: e.target.value })}>
                    <option value="">{spec.party === "cliente" ? "Todos os clientes" : "Todos os fornecedores"}</option>
                    {partyOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Status */}
              {spec.status && (
                <div>
                  <div style={labelStyle}>Status</div>
                  <select style={selectStyle} value={filters.status} onChange={(e) => setF({ status: e.target.value })}>
                    <option value="">Todos</option>
                    {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)", alignItems: "center" }}>
              <button onClick={() => setShowPreview(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 20px", background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Eye size={13} /> Visualizar Relatório
              </button>
              <button onClick={doPdf} disabled={!hasRows} style={expBtn}>
                <Download size={13} /> Exportar PDF
              </button>
              <button onClick={doExcel} disabled={!hasRows} style={expBtn}>
                <Download size={13} /> Exportar Excel
              </button>
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
                {data.loading ? "Carregando…" : hasRows ? `${report.rows.length} registro(s)` : "Sem dados no período"}
              </span>
            </div>
          </div>

          {/* Preview */}
          {showPreview ? (
            <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{meta.label}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>{range.label}{spec.grupo ? ` · Agrupado por ${GROUP_OPTIONS.find((g) => g.value === filters.grupo)?.label.toLowerCase()}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={doPdf} disabled={!hasRows} style={{ padding: "6px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px", color: "var(--text-secondary)", cursor: hasRows ? "pointer" : "not-allowed", opacity: hasRows ? 1 : 0.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Download size={12} /> PDF
                  </button>
                  <button onClick={doExcel} disabled={!hasRows} style={{ padding: "6px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px", color: "var(--text-secondary)", cursor: hasRows ? "pointer" : "not-allowed", opacity: hasRows ? 1 : 0.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Download size={12} /> Excel
                  </button>
                </div>
              </div>

              {hasRows ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border)" }}>
                        {report.columns.map((c) => (
                          <th key={c.header} style={{ padding: "10px 18px", textAlign: c.align === "right" ? "right" : "left", fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>{c.header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: row.bold ? "var(--bg-tertiary)" : "transparent" }}>
                          {report.columns.map((c) => (
                            <td key={c.header} style={{ padding: "9px 18px", textAlign: c.align === "right" ? "right" : "left", fontSize: "12.5px", fontWeight: row.bold ? 700 : c.align === "right" ? 600 : 400, color: "var(--text-primary)", whiteSpace: c.align === "right" ? "nowrap" : "normal" }}>
                              {c.value(row)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                  <BarChart2 size={32} style={{ marginBottom: "8px", opacity: 0.4 }} />
                  <div style={{ fontSize: "13px" }}>Sem dados para "{meta.label}" com os filtros atuais</div>
                  <div style={{ fontSize: "11px", marginTop: "4px" }}>Ajuste o período, os filtros ou cadastre lançamentos</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
              <Icon size={28} style={{ marginBottom: "8px", opacity: 0.4 }} />
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)" }}>Ajuste os filtros e clique em "Visualizar Relatório"</div>
              <div style={{ fontSize: "11px", marginTop: "4px" }}>Relatório selecionado: <strong style={{ color: "var(--accent)" }}>{meta.label}</strong></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
