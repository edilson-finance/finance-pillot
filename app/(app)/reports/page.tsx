"use client"

import { useMemo, useState } from "react"
import { Download, FileText, BarChart2, TrendingUp, TrendingDown, AlertTriangle, Users, Truck, Filter, Eye } from "lucide-react"
import { useDateRange } from "@/lib/date-context"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useDre, useCashflow, usePayables, useReceivables, useTopClients, useTopExpenses } from "@/lib/analytics-client"
import { exportCsv, exportPdf, type ExportColumn } from "@/lib/export"

const R = formatCurrency

const REPORT_TYPES = [
  { id:"dre",          label:"DRE Gerencial",           icon:FileText,    desc:"Demonstrativo de resultado com análise vertical" },
  { id:"cashflow",     label:"Fluxo de Caixa",          icon:TrendingUp,  desc:"Entradas, saídas e saldo por período" },
  { id:"payables",     label:"Contas a Pagar",          icon:TrendingDown,desc:"Obrigações e pagamentos em aberto" },
  { id:"receivables",  label:"Contas a Receber",        icon:TrendingUp,  desc:"Receitas e recebimentos em aberto" },
  { id:"inadimplencia",label:"Inadimplência",           icon:AlertTriangle,desc:"Títulos a receber em atraso (aging)" },
  { id:"byClient",     label:"Receita por Cliente",     icon:Users,       desc:"Faturamento agrupado por cliente" },
  { id:"byExpense",    label:"Despesas por Categoria",  icon:BarChart2,   desc:"Custos agrupados por categoria" },
  { id:"bySupplier",   label:"Por Fornecedor",          icon:Truck,       desc:"Concentração de pagamentos por fornecedor" },
] as const

type ReportId = (typeof REPORT_TYPES)[number]["id"]

type BuiltReport = { columns: ExportColumn<any>[]; rows: any[] }

export default function ReportsPage() {
  const { range } = useDateRange()
  const [selected, setSelected] = useState<ReportId>("dre")
  const [showPreview, setShowPreview] = useState(false)

  const { dre } = useDre(range)
  const { rows: cfRows } = useCashflow(range)
  const { rows: payables } = usePayables()
  const { rows: receivables } = useReceivables()
  const { rows: topClients } = useTopClients()
  const { rows: topExpenses } = useTopExpenses()

  const sel = REPORT_TYPES.find(r=>r.id===selected)!

  const dreRows = useMemo(() => {
    const out: { conta:string; valor:number; pct:number }[] = []
    for (const n of dre) {
      out.push({ conta:n.label, valor:n.valor, pct:Number(n.percent ?? 0) })
      for (const f of n.filhos ?? []) out.push({ conta:`    ${f.label}`, valor:f.valor, pct:Number((f as any).percent ?? 0) })
    }
    return out
  }, [dre])

  const bySupplier = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of payables) m.set(p.nome, (m.get(p.nome) ?? 0) + p.valor)
    const total = [...m.values()].reduce((s, v) => s + v, 0)
    return [...m.entries()]
      .map(([nome, valor]) => ({ nome, valor, percent: total > 0 ? (valor / total) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor)
  }, [payables])

  const inadimplentes = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return receivables
      .filter(r => r.status === "em_atraso")
      .map(r => ({ ...r, dias: Math.max(0, Math.round((today.getTime() - new Date(r.vencimento).getTime()) / 86400000)) }))
      .sort((a, b) => b.dias - a.dias)
  }, [receivables])

  const report: BuiltReport = useMemo(() => {
    switch (selected) {
      case "dre":
        return {
          columns: [
            { header:"Conta / Descrição", value:(r)=>r.conta },
            { header:"Valor",             value:(r)=>R(r.valor), align:"right" },
            { header:"% Receita",         value:(r)=>r.pct!==0?`${r.pct.toFixed(1)}%`:"—", align:"right" },
          ],
          rows: dreRows,
        }
      case "cashflow":
        return {
          columns: [
            { header:"Data",      value:(r)=>formatDate(r.data) },
            { header:"Descrição", value:(r)=>r.descricao },
            { header:"Categoria", value:(r)=>r.categoria },
            { header:"Entrada",   value:(r)=>R(r.entrada), align:"right" },
            { header:"Saída",     value:(r)=>R(r.saida), align:"right" },
            { header:"Saldo",     value:(r)=>R(r.saldo), align:"right" },
          ],
          rows: cfRows,
        }
      case "payables":
        return {
          columns: [
            { header:"Fornecedor", value:(r)=>r.nome },
            { header:"Categoria",  value:(r)=>r.categoria },
            { header:"Vencimento", value:(r)=>formatDate(r.vencimento) },
            { header:"Valor",      value:(r)=>R(r.valor), align:"right" },
            { header:"Status",     value:(r)=>r.status==="em_atraso"?"Em atraso":"Previsto" },
          ],
          rows: payables,
        }
      case "receivables":
        return {
          columns: [
            { header:"Cliente",    value:(r)=>r.nome },
            { header:"Categoria",  value:(r)=>r.categoria },
            { header:"Vencimento", value:(r)=>formatDate(r.vencimento) },
            { header:"Valor",      value:(r)=>R(r.valor), align:"right" },
            { header:"Status",     value:(r)=>r.status==="em_atraso"?"Em atraso":"Previsto" },
          ],
          rows: receivables,
        }
      case "inadimplencia":
        return {
          columns: [
            { header:"Cliente",        value:(r)=>r.nome },
            { header:"Vencimento",     value:(r)=>formatDate(r.vencimento) },
            { header:"Dias em atraso", value:(r)=>r.dias, align:"right" },
            { header:"Valor",          value:(r)=>R(r.valor), align:"right" },
          ],
          rows: inadimplentes,
        }
      case "byClient":
        return {
          columns: [
            { header:"Cliente", value:(r)=>r.nome },
            { header:"Valor",   value:(r)=>R(r.valor), align:"right" },
            { header:"%",       value:(r)=>`${Number(r.percent).toFixed(1)}%`, align:"right" },
          ],
          rows: topClients,
        }
      case "byExpense":
        return {
          columns: [
            { header:"Categoria", value:(r)=>r.nome },
            { header:"Valor",     value:(r)=>R(r.valor), align:"right" },
            { header:"%",         value:(r)=>`${Number(r.percent).toFixed(1)}%`, align:"right" },
          ],
          rows: topExpenses,
        }
      case "bySupplier":
        return {
          columns: [
            { header:"Fornecedor", value:(r)=>r.nome },
            { header:"Valor",      value:(r)=>R(r.valor), align:"right" },
            { header:"%",          value:(r)=>`${r.percent.toFixed(1)}%`, align:"right" },
          ],
          rows: bySupplier,
        }
    }
  }, [selected, dreRows, cfRows, payables, receivables, inadimplentes, topClients, topExpenses, bySupplier])

  const hasRows = report.rows.length > 0
  const subtitle = `${range.label} · ${sel.label}`
  const fileBase = sel.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  function doPdf() { if (hasRows) exportPdf(sel.label, subtitle, report.columns, report.rows) }
  function doExcel() { if (hasRows) exportCsv(fileBase, report.columns, report.rows) }

  const expBtn: React.CSSProperties = {
    display:"flex",alignItems:"center",gap:"6px",padding:"9px 16px",
    background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",
    fontSize:"12px",color:"var(--text-secondary)",fontFamily:"inherit",
    cursor: hasRows?"pointer":"not-allowed", opacity: hasRows?1:0.5,
  }

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ marginBottom:"18px" }}>
        <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Relatórios</h1>
        <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Gere, visualize e exporte relatórios financeiros em PDF ou Excel</p>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"260px 1fr",gap:"20px" }}>
        {/* Sidebar */}
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"12px" }}>
          <div style={{ fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.7px",padding:"4px 8px 8px" }}>
            Tipo de Relatório
          </div>
          {REPORT_TYPES.map(r=>{
            const Icon = r.icon
            return (
              <button key={r.id} onClick={()=>{setSelected(r.id);setShowPreview(false)}} style={{
                display:"flex",alignItems:"center",gap:"9px",
                width:"100%",padding:"9px 10px",borderRadius:"7px",
                border:`1px solid ${selected===r.id?"var(--accent)40":"transparent"}`,
                background:selected===r.id?"var(--accent-soft)":"transparent",
                color:selected===r.id?"var(--accent)":"var(--text-secondary)",
                fontSize:"12.5px",fontWeight:selected===r.id?700:400,
                cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                marginBottom:"1px",
              }}>
                <Icon size={13} style={{ flexShrink:0,opacity:selected===r.id?1:0.7 }}/>
                <div>
                  <div>{r.label}</div>
                  {selected===r.id && <div style={{ fontSize:"10px",color:"var(--accent)",opacity:0.8,marginTop:"1px" }}>{r.desc}</div>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ display:"flex",flexDirection:"column",gap:"14px" }}>
          {/* Filters panel */}
          <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px" }}>
              <Filter size={14} style={{ color:"var(--text-secondary)" }}/>
              <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{sel.label}</span>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",alignItems:"end" }}>
              <div>
                <div style={{ fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>Período</div>
                <DateRangePicker/>
              </div>
              <div style={{ fontSize:"11px",color:"var(--text-muted)" }}>
                {hasRows ? `${report.rows.length} registro(s) no período` : "Sem dados no período selecionado"}
              </div>
            </div>

            <div style={{ display:"flex",gap:"8px",marginTop:"16px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
              <button onClick={()=>setShowPreview(true)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                <Eye size={13}/> Visualizar Relatório
              </button>
              <button onClick={doPdf} disabled={!hasRows} style={expBtn}>
                <Download size={13}/> Exportar PDF
              </button>
              <button onClick={doExcel} disabled={!hasRows} style={expBtn}>
                <Download size={13}/> Exportar Excel
              </button>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
              <div style={{ padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>{sel.label}</div>
                  <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"1px" }}>{range.label}</div>
                </div>
                <div style={{ display:"flex",gap:"6px" }}>
                  <button onClick={doPdf} disabled={!hasRows} style={{ padding:"6px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"11px",color:"var(--text-secondary)",cursor:hasRows?"pointer":"not-allowed",opacity:hasRows?1:0.5,fontFamily:"inherit",display:"flex",alignItems:"center",gap:"4px" }}>
                    <Download size={12}/> PDF
                  </button>
                  <button onClick={doExcel} disabled={!hasRows} style={{ padding:"6px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"11px",color:"var(--text-secondary)",cursor:hasRows?"pointer":"not-allowed",opacity:hasRows?1:0.5,fontFamily:"inherit",display:"flex",alignItems:"center",gap:"4px" }}>
                    <Download size={12}/> Excel
                  </button>
                </div>
              </div>

              {hasRows ? (
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
                      {report.columns.map(c=>(
                        <th key={c.header} style={{ padding:"10px 18px",textAlign:c.align==="right"?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px" }}>{c.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row,i)=>(
                      <tr key={i} style={{ borderBottom:"1px solid var(--border)" }}
                        onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        {report.columns.map(c=>(
                          <td key={c.header} style={{ padding:"9px 18px",textAlign:c.align==="right"?"right":"left",fontSize:"12.5px",fontWeight:c.align==="right"?600:400,color:"var(--text-primary)",whiteSpace:c.align==="right"?"nowrap":"normal" }}>
                            {c.value(row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding:"32px",textAlign:"center",color:"var(--text-muted)" }}>
                  <BarChart2 size={32} style={{ marginBottom:"8px",opacity:0.4 }}/>
                  <div style={{ fontSize:"13px" }}>Sem dados para "{sel.label}" no período selecionado</div>
                  <div style={{ fontSize:"11px",marginTop:"4px" }}>Ajuste o período ou cadastre lançamentos</div>
                </div>
              )}
            </div>
          )}

          {!showPreview && (
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"32px",textAlign:"center",color:"var(--text-muted)" }}>
              <Eye size={28} style={{ marginBottom:"8px",opacity:0.4 }}/>
              <div style={{ fontSize:"13px",fontWeight:500,color:"var(--text-secondary)" }}>Selecione o período e clique em "Visualizar Relatório"</div>
              <div style={{ fontSize:"11px",marginTop:"4px" }}>Relatório selecionado: <strong style={{ color:"var(--accent)" }}>{sel.label}</strong></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
