"use client"

import { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell, ReferenceLine, ScatterChart, Scatter,
} from "recharts"
import { Download, TrendingUp, TrendingDown, Info, Plus, X, Check } from "lucide-react"
import { useTopClients, useTopExpenses } from "@/lib/analytics-client"
import { formatCurrency } from "@/lib/utils"
import { useDateRange } from "@/lib/date-context"
import {
  useRevenueSeries, useKpis, useCategoryBreakdown, useDrilldown,
  usePeriodComparison, useInadimplencia, useCashflowProjection,
} from "@/lib/analytics-client"
import { daysBetween } from "@/lib/date-utils"

const R = formatCurrency

/* ── Custom tooltip Power BI-style ── */
function Tip({ active, payload, label, extra }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:"var(--bg-elevated)", border:"1px solid var(--border-strong)",
      borderRadius:"10px", padding:"12px 16px", fontSize:"12px",
      boxShadow:"var(--shadow-lg)", minWidth:"180px",
    }}>
      <div style={{ color:"var(--text-secondary)", marginBottom:"8px", fontWeight:700, fontSize:"11px", textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display:"flex", justifyContent:"space-between", gap:"20px", marginBottom:"4px", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:p.color||"var(--accent)",flexShrink:0 }}/>
            <span style={{ color:"var(--text-secondary)" }}>{p.name}</span>
          </div>
          <span style={{ color:"var(--text-primary)", fontWeight:700 }}>
            {typeof p.value==="number" && Math.abs(p.value)>100 ? R(p.value) : typeof p.value==="number" ? `${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
      {extra && <div style={{ borderTop:"1px solid var(--border)", marginTop:"6px", paddingTop:"6px", fontSize:"11px", color:"var(--text-muted)" }}>{extra}</div>}
    </div>
  )
}

/* ── Interactive Table Row with hover detail ── */
function TableRow({ cols, hover, detail }: { cols: (string|number)[]; hover?: string; detail?: Record<string,string> }) {
  const [show, setShow] = useState(false)
  return (
    <>
      <tr
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ borderBottom:"1px solid var(--border)", background: show ? "var(--bg-tertiary)" : "transparent", cursor:"default", position:"relative", transition:"background 0.1s" }}>
        {cols.map((c,i) => (
          <td key={i} style={{ padding:"10px 14px", fontSize:"12.5px", color: i===0 ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: i===0 ? 500 : 400, textAlign: i>0 ? "right" : "left", whiteSpace:"nowrap" }}>
            {typeof c==="number" && Math.abs(c)>100 ? R(c) : c}
          </td>
        ))}
        {/* Hover detail tooltip */}
        {show && detail && (
          <td style={{ padding:0 }}>
            <div style={{
              position:"absolute", right:"50px", top:"50%", transform:"translateY(-50%)",
              background:"var(--bg-elevated)", border:"1px solid var(--border-strong)",
              borderRadius:"8px", padding:"10px 14px", zIndex:20,
              boxShadow:"var(--shadow-lg)", minWidth:"200px", pointerEvents:"none",
            }}>
              {Object.entries(detail).map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:"16px", marginBottom:"4px", fontSize:"11px" }}>
                  <span style={{ color:"var(--text-muted)" }}>{k}</span>
                  <span style={{ color:"var(--text-primary)", fontWeight:700 }}>{v}</span>
                </div>
              ))}
            </div>
          </td>
        )}
      </tr>
    </>
  )
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"40px 18px",textAlign:"center",fontSize:"12.5px",color:"var(--text-muted)" }}>
      {texto}
    </div>
  )
}

const TABS = [
  { id:"visao",          label:"Visão Geral" },
  { id:"liquido",        label:"Valor Líquido" },
  { id:"receitas",       label:"Receitas" },
  { id:"cat_receitas",   label:"Categorias de Entradas" },
  { id:"despesas",       label:"Despesas" },
  { id:"cat_despesas",   label:"Gastos por Categoria" },
  { id:"comparativo",    label:"Comparativo Mensal" },
  { id:"analise",        label:"Análise de Períodos" },
  { id:"drilldown",      label:"Drill-down" },
  { id:"inad",           label:"Inadimplência" },
  { id:"projecao",       label:"Projeção de Caixa" },
]

const PIE_COLORS = ["var(--accent)","var(--success)","var(--purple)","var(--warning)","var(--danger)","var(--info)"]

/* ─── Gastos por Categoria de Despesa ─── */
function CatDespesas({ range, kpis }: { range: any; kpis: any }) {
  const [sortBy, setSortBy] = useState<"valor"|"pct">("valor")
  const [detalhe, setDetalhe] = useState<string|null>(null)
  const { rows } = useCategoryBreakdown(range, "saida")
  const totalDesp = rows.reduce((s,c)=>s+c.valor,0)
  const sorted = [...rows].sort((a,b)=>sortBy==="valor"?b.valor-a.valor:b.pct-a.pct)
  const fmtVar = (v:number|null) => v===null ? "—" : (v>=0?"+":"")+v.toFixed(1).replace(".",",")+"%"

  if (rows.length === 0) return <EmptyState texto="Sem despesas lançadas no período." />

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:"14px" }}>
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"14px 18px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Onde o Dinheiro Sai</div>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"1px" }}>{range.label} · Total saído: {R(totalDesp)}</div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",gap:"6px" }}>
          {[["valor","Maior valor"],["pct","Maior %"]].map(([k,l])=>(
            <button key={k} onClick={()=>setSortBy(k as any)} style={{ padding:"5px 12px",borderRadius:"20px",border:"1px solid",borderColor:sortBy===k?"var(--danger)":"var(--border)",background:sortBy===k?"var(--danger-soft)":"transparent",color:sortBy===k?"var(--danger)":"var(--text-secondary)",fontSize:"11.5px",fontWeight:sortBy===k?700:400,cursor:"pointer",fontFamily:"inherit" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px" }}>
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"16px" }}>Distribuição por Categoria</div>
          {sorted.map((c)=>(
            <div key={c.id} style={{ marginBottom:"14px",cursor:"pointer" }} onClick={()=>setDetalhe(detalhe===c.id?null:c.id)}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                  <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:c.cor,flexShrink:0 }}/>
                  <span style={{ fontSize:"12.5px",color:"var(--text-primary)",fontWeight:detalhe===c.id?700:400 }}>{c.categoria}</span>
                </div>
                <div style={{ display:"flex",gap:"12px",alignItems:"center" }}>
                  <span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>{R(c.valor)}</span>
                  <span style={{ fontSize:"12px",fontWeight:700,color:c.cor,minWidth:"40px",textAlign:"right" }}>{c.pct.toFixed(1)}%</span>
                </div>
              </div>
              <div style={{ background:"var(--bg-tertiary)",borderRadius:"4px",height:"7px" }}>
                <div style={{ height:"100%",borderRadius:"4px",background:c.cor,width:`${c.pct}%`,transition:"width 0.3s" }}/>
              </div>
              {detalhe===c.id && c.filhos.length>0 && (
                <div style={{ marginTop:"8px",paddingLeft:"17px",borderLeft:`2px solid ${c.cor}` }}>
                  {c.filhos.map(s=>(
                    <div key={s.nome} style={{ display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:"11.5px" }}>
                      <span style={{ color:"var(--text-secondary)" }}>{s.nome}</span>
                      <span style={{ fontWeight:600,color:"var(--text-primary)" }}>{R(s.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"6px" }}>Relatório de Gastos</div>
          <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"14px" }}>Clique numa categoria no gráfico para ver subcategorias</div>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"2px solid var(--border)" }}>
                {["Categoria","Valor","% Total","% Receita","Vs. Anterior"].map(h=>(
                  <th key={h} style={{ padding:"7px 10px",textAlign:h==="Categoria"?"left":"right",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(c=>(
                <TableRow key={c.id}
                  cols={[c.categoria, c.valor, `${c.pct.toFixed(1)}%`, `${((c.valor/Math.max(kpis.faturamento,1))*100).toFixed(1)}%`, fmtVar(c.varPct)]}
                  detail={{ "Valor no período": R(c.valor), "% do total despesas": `${c.pct.toFixed(1)}%`, "% da receita": `${((c.valor/Math.max(kpis.faturamento,1))*100).toFixed(1)}%`, "Variação": fmtVar(c.varPct) }}
                />
              ))}
              <tr style={{ borderTop:"2px solid var(--border)",background:"var(--bg-tertiary)" }}>
                <td style={{ padding:"9px 10px",fontSize:"13px",fontWeight:800,color:"var(--text-primary)" }}>TOTAL</td>
                <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"13px",fontWeight:800,color:"var(--danger)" }}>{R(totalDesp)}</td>
                <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>100%</td>
                <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{((totalDesp/Math.max(kpis.faturamento,1))*100).toFixed(1)}%</td>
                <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12px",color:"var(--text-muted)" }}>—</td>
              </tr>
            </tbody>
          </table>
          {sorted[0] && (
            <div style={{ marginTop:"14px",padding:"12px",background:"var(--danger-soft)",borderRadius:"8px" }}>
              <div style={{ fontSize:"12px",fontWeight:700,color:"var(--danger)",marginBottom:"4px" }}>Onde está o maior custo</div>
              <div style={{ fontSize:"11.5px",color:"var(--text-secondary)",lineHeight:1.6 }}>
                <strong>{sorted[0].categoria}</strong> representa {sorted[0].pct.toFixed(0)}% de todos os gastos ({R(sorted[0].valor)}) no período.
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
        <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Proporção Visual dos Gastos</div>
        <div style={{ display:"flex",height:"80px",borderRadius:"8px",overflow:"hidden",gap:"2px" }}>
          {sorted.map(c=>(
            <div key={c.id} title={`${c.categoria}: ${R(c.valor)} (${c.pct.toFixed(1)}%)`} style={{ flex:`${c.pct}`,background:c.cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:700,color:"#fff",overflow:"hidden",cursor:"pointer",transition:"flex 0.3s" }}>
              {c.pct > 8 && c.pct.toFixed(0)+"%"}
            </div>
          ))}
        </div>
        <div style={{ display:"flex",gap:"14px",marginTop:"10px",flexWrap:"wrap" }}>
          {sorted.map(c=>(
            <div key={c.id} style={{ display:"flex",alignItems:"center",gap:"5px" }}>
              <div style={{ width:"10px",height:"10px",borderRadius:"2px",background:c.cor,flexShrink:0 }}/>
              <span style={{ fontSize:"11px",color:"var(--text-secondary)" }}>{c.categoria.split(" ")[0]} ({c.pct.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Categorias de Entradas (Receitas) ─── */
function CatReceitas({ range }: { range: any }) {
  const { rows } = useCategoryBreakdown(range, "entrada")
  const totalRec = rows.reduce((s,c)=>s+c.valor,0)
  const fmtVar = (v:number|null) => v===null ? "—" : (v>=0?"+":"")+v.toFixed(1).replace(".",",")+"%"
  const top = rows[0]

  if (rows.length === 0) return <EmptyState texto="Sem receitas lançadas no período." />

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:"14px" }}>
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"14px 18px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>De Onde Vem o Dinheiro</div>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"1px" }}>{range.label} · Total recebido: {R(totalRec)}</div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px" }}>
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"16px" }}>Receita por Categoria</div>
          {rows.map((c)=>(
            <div key={c.id} style={{ marginBottom:"16px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                  <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:c.cor,flexShrink:0 }}/>
                  <span style={{ fontSize:"12.5px",fontWeight:600,color:"var(--text-primary)" }}>{c.categoria}</span>
                </div>
                <div style={{ display:"flex",gap:"10px" }}>
                  <span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>{R(c.valor)}</span>
                  <span style={{ fontSize:"12px",fontWeight:700,color:c.cor }}>{c.pct.toFixed(1)}%</span>
                </div>
              </div>
              <div style={{ background:"var(--bg-tertiary)",borderRadius:"4px",height:"7px" }}>
                <div style={{ height:"100%",borderRadius:"4px",background:c.cor,width:`${c.pct}%` }}/>
              </div>
              {c.filhos.length>0 && (
                <div style={{ marginTop:"6px",paddingLeft:"17px",borderLeft:`2px solid ${c.cor}40` }}>
                  {c.filhos.map(s=>(
                    <div key={s.nome} style={{ display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:"11px" }}>
                      <span style={{ color:"var(--text-muted)" }}>{s.nome}</span>
                      <span style={{ color:"var(--text-secondary)",fontWeight:600 }}>{R(s.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
          <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"12px" }}>Tabela de Receitas por Categoria</div>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--border)" }}>
                  {["Categoria","Valor","% Total","Variação"].map(h=>(
                    <th key={h} style={{ padding:"7px 10px",textAlign:h==="Categoria"?"left":"right",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c)=>(
                  <tr key={c.id} style={{ borderBottom:"1px solid var(--border)" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <td style={{ padding:"9px 10px",fontSize:"12.5px",fontWeight:500,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:"7px" }}>
                      <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:c.cor,flexShrink:0 }}/>
                      {c.categoria}
                    </td>
                    <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12.5px",fontWeight:700,color:"var(--success)" }}>{R(c.valor)}</td>
                    <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12px",color:"var(--text-secondary)" }}>{c.pct.toFixed(1)}%</td>
                    <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"11px",color:c.varPct===null?"var(--text-muted)":c.varPct>=0?"var(--success)":"var(--danger)",fontWeight:600 }}>{fmtVar(c.varPct)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop:"2px solid var(--border)",background:"var(--bg-tertiary)" }}>
                  <td style={{ padding:"9px 10px",fontSize:"13px",fontWeight:800,color:"var(--text-primary)" }}>TOTAL</td>
                  <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"13px",fontWeight:800,color:"var(--success)" }}>{R(totalRec)}</td>
                  <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--text-primary)" }}>100%</td>
                  <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12px",color:"var(--text-muted)" }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {top && (
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"16px" }}>
              <div style={{ fontSize:"12px",fontWeight:700,color:"var(--text-primary)",marginBottom:"10px" }}>Análise Automática</div>
              <div style={{ padding:"10px 12px",background:"var(--bg-tertiary)",borderRadius:"7px",borderLeft:`3px solid var(--warning)` }}>
                <div style={{ fontSize:"11.5px",fontWeight:700,color:"var(--warning)",marginBottom:"3px" }}>Concentração de receita</div>
                <div style={{ fontSize:"11px",color:"var(--text-secondary)",lineHeight:1.6 }}>
                  {top.pct.toFixed(1)}% da receita vem de <strong>{top.categoria}</strong>. Diversificar reduz risco e melhora a previsibilidade de caixa.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BiPage() {
  const [tab, setTab] = useState("visao")
  const { range } = useDateRange()

  /* ── Dados filtrados pelo período selecionado ── */
  const { series } = useRevenueSeries(range)
  const { kpis }   = useKpis(range)
  const { rows: topClients }  = useTopClients()
  const { rows: topExpenses } = useTopExpenses()
  const days     = daysBetween(range.start, range.end)

  const totalReceita  = series.reduce((s,d) => s + d.receita, 0)
  const totalDespesa  = series.reduce((s,d) => s + d.despesa, 0)
  const totalLiquido  = totalReceita - totalDespesa

  const liquidoSeries = series.map(d => ({ ...d, liquido: d.receita - d.despesa }))

  const drillCategories = ["Receitas","Despesas","Resultado"].map(t => ({
    tipo: t,
    periodos: series.map(d => ({
      label: d.label,
      valor: t==="Receitas" ? d.receita : t==="Despesas" ? -d.despesa : d.receita - d.despesa,
      pct:   t==="Receitas" ? 100 : t==="Despesas"
        ? -((d.despesa / (d.receita||1)) * 100)
        : ((d.receita - d.despesa) / (d.receita||1)) * 100,
    }))
  }))

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"18px" }}>
        <div>
          <h1 style={{ fontSize:"20px", fontWeight:800, color:"var(--text-primary)", letterSpacing:"-0.4px" }}>BI Financeiro</h1>
          <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>{range.label}</div>
        </div>
        <div style={{ display:"flex", gap:"6px" }}>
          <button style={{ display:"flex", alignItems:"center", gap:"5px", padding:"6px 12px", background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"7px", fontSize:"11px", color:"var(--text-secondary)", cursor:"pointer" }}>
            <Download size={12}/> PDF
          </button>
          <button style={{ display:"flex", alignItems:"center", gap:"5px", padding:"6px 12px", background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"7px", fontSize:"11px", color:"var(--text-secondary)", cursor:"pointer" }}>
            <Download size={12}/> Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:"2px", borderBottom:"1px solid var(--border)", marginBottom:"20px", overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"9px 14px", border:"none", background:"transparent",
            fontSize:"12.5px", fontWeight: tab===t.id ? 700 : 400,
            color: tab===t.id ? "var(--accent)" : "var(--text-secondary)",
            cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
            borderBottom: tab===t.id ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom:"-1px", transition:"color 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ─── VISÃO GERAL ─── */}
      {tab==="visao" && <>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"16px" }}>
          {[
            { l:"Receita Total",    v:R(totalReceita), d:`${series.length} períodos`,    c:"var(--success)" },
            { l:"Despesa Total",    v:R(totalDespesa), d:`${series.length} períodos`,    c:"var(--danger)" },
            { l:"EBITDA",           v:R(kpis.ebitda),  d:`${((kpis.ebitda/Math.max(totalReceita,1))*100).toFixed(1)}% da receita`, c:"var(--accent)" },
            { l:"Resultado Líquido",v:R(totalLiquido), d:`${((totalLiquido/Math.max(totalReceita,1))*100).toFixed(1)}% de margem`, c: totalLiquido >= 0 ? "var(--success)" : "var(--danger)" },
          ].map(c => (
            <div key={c.l} style={{ background:"var(--bg-secondary)", border:`1px solid ${c.c}28`, borderLeft:`3px solid ${c.c}`, borderRadius:"var(--radius)", padding:"14px 16px" }}>
              <div style={{ fontSize:"10.5px", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"8px" }}>{c.l}</div>
              <div style={{ fontSize:"20px", fontWeight:800, color:c.c }}>{c.v}</div>
              <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"4px" }}>{c.d}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"14px" }}>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)", marginBottom:"6px" }}>
              Receitas vs Despesas — {range.label}
            </div>
            <div style={{ fontSize:"11px", color:"var(--text-muted)", marginBottom:"14px" }}>
              {series.length} {days<=1?"horas":days<=14?"dias":days<=90?"semanas":"meses"} · Passe o mouse para detalhes
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={series} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="label" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<Tip/>}/>
                <Legend wrapperStyle={{fontSize:"11px",color:"var(--text-secondary)"}}/>
                <Bar dataKey="receita" name="Receita" fill="var(--success)" radius={[4,4,0,0]}/>
                <Bar dataKey="despesa" name="Despesa" fill="var(--danger)"  radius={[4,4,0,0]} opacity={0.8}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)", marginBottom:"14px" }}>Concentração de Receita</div>
            <PieChart width={160} height={160} style={{margin:"0 auto"}}>
              <Pie data={topClients} cx={75} cy={75} innerRadius={42} outerRadius={72} paddingAngle={3} dataKey="valor">
                {topClients.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v)=>R(Number(v))}/>
            </PieChart>
            {topClients.map((c,i)=>(
              <div key={c.nome} style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"5px" }}>
                <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0 }}/>
                <span style={{ fontSize:"11px",color:"var(--text-secondary)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.nome}</span>
                <span style={{ fontSize:"11px",fontWeight:700,color:"var(--text-primary)" }}>{c.percent.toFixed(1)}%</span>
              </div>
            ))}
            <div style={{ marginTop:"8px", padding:"6px 8px", background:"var(--danger-soft)", borderRadius:"6px" }}>
              <span style={{ fontSize:"10px", color:"var(--danger)", fontWeight:600 }}>Top 3 clientes = 93% — risco alto</span>
            </div>
          </div>
        </div>
      </>}

      {/* ─── VALOR LÍQUIDO / EBITDA ─── */}
      {tab==="liquido" && <>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"16px" }}>
          {[
            { l:"Resultado Operacional", v:R(kpis.ebitda),   pct:`${((kpis.ebitda/Math.max(totalReceita,1))*100).toFixed(1)}%`, c:"var(--accent)" },
            { l:"EBITDA",               v:R(kpis.ebitda),    pct:`${((kpis.ebitda/Math.max(totalReceita,1))*100).toFixed(1)}%`, c:"var(--purple)" },
            { l:"Valor Líquido",        v:R(totalLiquido),   pct:`${((totalLiquido/Math.max(totalReceita,1))*100).toFixed(1)}%`, c:totalLiquido>=0?"var(--success)":"var(--danger)" },
          ].map(k=>(
            <div key={k.l} style={{ background:"var(--bg-secondary)", border:`1px solid ${k.c}28`, borderLeft:`3px solid ${k.c}`, borderRadius:"var(--radius)", padding:"14px 16px" }}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>{k.l}</div>
              <div style={{ fontSize:"20px",fontWeight:800,color:k.c }}>{k.v}</div>
              <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"3px" }}>{k.pct} da receita · {range.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>
            Evolução — Valor Líquido e EBITDA · {range.label}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={liquidoSeries.map(d=>({ ...d, ebitda:Math.round(d.liquido*1.38) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<Tip/>}/>
              <Legend wrapperStyle={{fontSize:"11px"}}/>
              <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="liquido" name="Valor Líquido" stroke="var(--accent)"  strokeWidth={2.5} dot={{r:4,fill:"var(--accent)"}}/>
              <Line type="monotone" dataKey="ebitda"  name="EBITDA"        stroke="var(--success)" strokeWidth={2.5} dot={{r:4,fill:"var(--success)"}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px", marginTop:"14px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Variação do Resultado — Período a Período</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={liquidoSeries.map((d,i,arr)=>({ label:d.label, variacao: i===0 ? 0 : d.liquido - arr[i-1].liquido }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<Tip/>}/>
              <ReferenceLine y={0} stroke="var(--border-strong)"/>
              <Bar dataKey="variacao" name="Variação" fill="var(--accent)" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>}

      {/* ─── RECEITAS ─── */}
      {tab==="receitas" && <>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px", marginBottom:"16px" }}>
          {[
            { l:"Total Receita",   v:R(totalReceita) },
            { l:"Média/Período",   v:R(Math.round(totalReceita/Math.max(series.length,1))) },
            { l:"Clientes Ativos", v:"12" },
            { l:"Ticket Médio",    v:R(kpis.ticketMedio) },
            { l:"Recorrência",     v:"35%" },
          ].map(k=>(
            <div key={k.l} style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"12px 14px" }}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
              <div style={{ fontSize:"17px",fontWeight:800,color:"var(--success)" }}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"6px" }}>Receita — {range.label}</div>
            <div style={{ fontSize:"11px",color:"var(--text-muted)",marginBottom:"12px" }}>{series.length} períodos</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="label" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<Tip/>}/>
                <Area type="monotone" dataKey="receita" name="Receita" stroke="var(--success)" fill="url(#recGrad)" strokeWidth={2.5} dot={{r:3,fill:"var(--success)"}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"6px" }}>Top Clientes por Receita</div>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"12px" }}>Passe o mouse para detalhes</div>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid var(--border)" }}>
                  {["Cliente","Receita","% Total","Variação"].map(h=>(
                    <th key={h} style={{ padding:"7px 10px",textAlign:h==="Cliente"?"left":"right",fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topClients.map((c,i)=>(
                  <TableRow key={c.nome}
                    cols={[c.nome, c.valor, `${c.percent.toFixed(1)}%`, i===0?"+12,3%":i===1?"+5,2%":"-3,1%"]}
                    detail={{ "Variação vs mês ant.": i===0?"+R$16.400":"+R$4.900", "Média 3 meses": R(Math.round(c.valor*0.92)), "Inadimplência": i===0?"19,9%":i===3?"24,1%":"0%", "Ticket médio": R(Math.round(c.valor/3)) }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* ─── DESPESAS ─── */}
      {tab==="despesas" && <>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"10px", marginBottom:"16px" }}>
          {[
            { l:"Total Despesa",    v:R(totalDespesa) },
            { l:"Média/Período",    v:R(Math.round(totalDespesa/Math.max(series.length,1))) },
            { l:"Fornecedores Ativos", v:"31" },
            { l:"Média por Despesa",v:R(Math.round(totalDespesa/Math.max(series.length*4,1))) },
            { l:"Fixas vs Variáveis",v:"34% / 66%" },
          ].map(k=>(
            <div key={k.l} style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"12px 14px" }}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
              <div style={{ fontSize:"17px",fontWeight:800,color:"var(--danger)" }}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"6px" }}>Despesas — {range.label}</div>
            <div style={{ fontSize:"11px",color:"var(--text-muted)",marginBottom:"12px" }}>{series.length} períodos</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="despGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="label" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<Tip/>}/>
                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="var(--danger)" fill="url(#despGrad)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"6px" }}>Despesas por Categoria</div>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"12px" }}>Passe o mouse para detalhes</div>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid var(--border)" }}>
                  {["Categoria","Valor","% Total","Tipo"].map(h=>(
                    <th key={h} style={{ padding:"7px 10px",textAlign:h==="Categoria"?"left":"right",fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topExpenses.map((e,i)=>(
                  <TableRow key={e.nome}
                    cols={[e.nome, e.valor, `${e.percent.toFixed(1)}%`, i<2?"Variável":"Fixa"]}
                    detail={{ "Variação vs mês ant.": i===0?"+R$2.400":"-R$800", "Média 3 meses": R(Math.round(e.valor*0.94)), "% da Receita": `${((e.valor/312000)*100).toFixed(1)}%` }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* ─── CATEGORIAS DE ENTRADAS ─── */}
      {tab==="cat_receitas" && <CatReceitas range={range}/>}

      {/* ─── GASTOS POR CATEGORIA ─── */}
      {tab==="cat_despesas" && <CatDespesas range={range} kpis={kpis}/>}

      {/* ─── COMPARATIVO MENSAL ─── */}
      {tab==="comparativo" && <>
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px", marginBottom:"14px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"4px" }}>
            Comparativo — Análise Vertical · {range.label}
          </div>
          <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"14px" }}>
            {series.length} períodos · Passe o mouse para detalhes
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",minWidth:"600px" }}>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--border)" }}>
                  <th style={{ padding:"9px 12px",textAlign:"left",fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:700,background:"var(--bg-tertiary)" }}>Tipo</th>
                  {series.map(m=>(
                    <th key={m.label} style={{ padding:"9px 10px",textAlign:"right",fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:700,background:"var(--bg-tertiary)",whiteSpace:"nowrap" }}>{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drillCategories.map(cat=>(
                  <tr key={cat.tipo}
                    onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                    style={{ borderBottom:"1px solid var(--border)", cursor:"default" }}>
                    <td style={{ padding:"10px 12px",fontSize:"12px",fontWeight:600,color:cat.tipo==="Receitas"?"var(--success)":cat.tipo==="Despesas"?"var(--danger)":"var(--accent)" }}>{cat.tipo}</td>
                    {cat.periodos.map(p=>(
                      <td key={p.label} style={{ padding:"10px 10px",textAlign:"right",fontSize:"12px",color:p.valor<0?"var(--danger)":"var(--text-primary)",fontWeight:500 }}>
                        {R(Math.abs(p.valor))}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr style={{ borderBottom:"1px solid var(--border)", background:"var(--bg-tertiary)" }}>
                  <td style={{ padding:"10px 12px",fontSize:"12px",fontWeight:700,color:"var(--purple)" }}>Margem %</td>
                  {series.map(m=>(
                    <td key={m.label} style={{ padding:"10px 10px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--purple)" }}>
                      {m.receita>0 ? (((m.receita-m.despesa)/m.receita)*100).toFixed(1)+"%" : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* ─── ANÁLISE DE PERÍODOS ─── */}
      {tab==="analise" && <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"14px" }}>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"4px" }}>Período 1 vs Período 2</div>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"14px" }}>Abr 2026 vs Mai 2026</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"16px" }}>
              {[
                { l:"Receita",  p1:R(289000), p2:R(312000), diff:"+R$23k",   c:"var(--success)" },
                { l:"Despesa",  p1:R(267000), p2:R(288000), diff:"+R$21k",   c:"var(--danger)" },
                { l:"Resultado",p1:R(22000),  p2:R(24000),  diff:"+R$2k",    c:"var(--accent)" },
              ].map(k=>(
                <div key={k.l} style={{ background:"var(--bg-tertiary)",borderRadius:"8px",padding:"10px 12px" }}>
                  <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"4px" }}>{k.l}</div>
                  <div style={{ fontSize:"11px",color:"var(--text-secondary)",marginBottom:"2px" }}>Abr: {k.p1}</div>
                  <div style={{ fontSize:"11px",color:"var(--text-secondary)",marginBottom:"4px" }}>Mai: {k.p2}</div>
                  <div style={{ fontSize:"13px",fontWeight:800,color:k.c }}>{k.diff}</div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { p:"Abr 2026", receita:289000, despesa:267000 },
                { p:"Mai 2026", receita:312000, despesa:288000 },
              ]} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="p" tick={{fill:"var(--text-muted)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="receita" name="Receita" fill="var(--success)" radius={[4,4,0,0]}/>
                <Bar dataKey="despesa" name="Despesa" fill="var(--danger)"  radius={[4,4,0,0]} opacity={0.8}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Análise Automática de Variação</div>
            {[
              { titulo:"Receita cresceu 8,4%", desc:"Crescimento acima da inflação do período (0,4%). Principal driver: Construtora Beta +12,3%.", c:"var(--success)" },
              { titulo:"Despesas subiram 7,9%", desc:"Crescimento próximo da receita. Folha de pagamento foi o maior componente (+5,2%).", c:"var(--warning)" },
              { titulo:"Margem melhorou 0,5pp", desc:"Margem líquida passou de 7,6% para 5,9% — piora em relação ao mês anterior por conta das despesas financeiras.", c:"var(--danger)" },
            ].map((obs,i)=>(
              <div key={i} style={{ padding:"12px", background:"var(--bg-tertiary)", borderRadius:"8px", borderLeft:`3px solid ${obs.c}`, marginBottom:"10px" }}>
                <div style={{ fontSize:"12px",fontWeight:700,color:"var(--text-primary)",marginBottom:"4px" }}>{obs.titulo}</div>
                <div style={{ fontSize:"11px",color:"var(--text-secondary)",lineHeight:1.6 }}>{obs.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </>}

      {/* ─── DRILL-DOWN ─── */}
      {tab==="drilldown" && <>
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Drill-down por Dimensão</div>
            <div style={{ display:"flex", gap:"6px", marginLeft:"auto" }}>
              {["Categoria","Centro de Custo","Cliente","Fornecedor"].map(d=>(
                <button key={d} style={{ padding:"5px 12px", border:"1px solid var(--border)", borderRadius:"6px", background:"var(--bg-tertiary)", fontSize:"11px", color:"var(--text-secondary)", cursor:"pointer", fontFamily:"inherit" }}>{d}</button>
              ))}
            </div>
          </div>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"2px solid var(--border)" }}>
                {["Categoria","Receita","Despesa","Resultado","% Receita","Variação"].map(h=>(
                  <th key={h} style={{ padding:"9px 14px",textAlign:h==="Categoria"?"left":"right",fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:700,background:"var(--bg-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { cat:"Obras",        rec:248000, desp:142000, var:"+8,1%" },
                { cat:"Contratos",    rec:64000,  desp:18000,  var:"+2,4%" },
                { cat:"Serviços",     rec:0,      desp:28000,  var:"-1,2%" },
                { cat:"Administrativo",rec:0,     desp:42000,  var:"+3,8%" },
                { cat:"Financeiro",   rec:0,      desp:17200,  var:"+12,4%" },
              ].map(r=>(
                <TableRow key={r.cat}
                  cols={[r.cat, r.rec>0?r.rec:"—", r.desp, r.rec-r.desp, r.rec>0?`${((r.rec/312000)*100).toFixed(1)}%`:"—", r.var]}
                  detail={{ "Margem bruta": r.rec>0?`${(((r.rec-r.desp)/r.rec)*100).toFixed(1)}%`:"—", "Variação": r.var, "Participação": r.rec>0?`${((r.rec/312000)*100).toFixed(1)}%`:"—" }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </>}

      {/* ─── INADIMPLÊNCIA ─── */}
      {tab==="inad" && <>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"16px" }}>
          {[
            { l:"Taxa de Inadimplência", v:"19,9%",  c:"var(--danger)" },
            { l:"Valor Total em Atraso",  v:R(51800), c:"var(--danger)" },
            { l:"Clientes Inadimplentes", v:"5",      c:"var(--warning)" },
            { l:"Prazo Médio de Atraso",  v:"28 dias",c:"var(--warning)" },
          ].map(k=>(
            <div key={k.l} style={{ background:"var(--bg-secondary)", border:`1px solid ${k.c}28`, borderLeft:`3px solid ${k.c}`, borderRadius:"var(--radius)", padding:"12px 14px" }}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
              <div style={{ fontSize:"19px",fontWeight:800,color:k.c }}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Evolução da Taxa de Inadimplência</div>
            <div style={{ marginBottom:"8px", padding:"8px 10px", background:"var(--danger-soft)", borderRadius:"7px" }}>
              <span style={{ fontSize:"11px",color:"var(--danger)" }}>Taxa cresceu 11,7pp em 7 meses. Limite saudável: 5%.</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={inadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="mes" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="taxa" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                <YAxis yAxisId="valor" orientation="right" hide/>
                <Tooltip content={<Tip/>}/>
                <ReferenceLine yAxisId="taxa" y={5} stroke="var(--success)" strokeDasharray="5 3" label={{value:"Limite 5%",fill:"var(--success)",fontSize:10}}/>
                <Bar  yAxisId="valor" dataKey="valor" name="Valor (R$)" fill="var(--danger)" opacity={0.3} radius={[3,3,0,0]}/>
                <Line yAxisId="taxa" type="monotone" dataKey="taxa" name="Taxa %" stroke="var(--danger)" strokeWidth={2.5} dot={{r:5,fill:"var(--danger)"}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Aging Report — Tempo em Atraso</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={agingData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                <XAxis type="number" hide/>
                <YAxis type="category" dataKey="faixa" tick={{fill:"var(--text-muted)",fontSize:11}} axisLine={false} tickLine={false} width={90}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="valor" name="Valor em Atraso" fill="var(--danger)" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop:"12px" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid var(--border)" }}>
                    {["Faixa","Valor","Qtd"].map(h=>(
                      <th key={h} style={{ padding:"6px 10px",textAlign:h==="Faixa"?"left":"right",fontSize:"10px",color:"var(--text-muted)",fontWeight:700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agingData.map(a=>(
                    <TableRow key={a.faixa}
                      cols={[a.faixa, a.valor, `${a.qtd} cobranças`]}
                      detail={{ "Risco de perda": a.faixa==="+90 dias"?"Alto":"Médio", "Provisão estimada": R(Math.round(a.valor*0.5)) }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>}

      {/* ─── PROJEÇÃO DE CAIXA ─── */}
      {tab==="projecao" && <>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"16px" }}>
          {[
            { l:"Saldo Atual",          v:R(284750), c:"var(--accent)" },
            { l:"Menor Saldo Projetado",v:R(162400), d:"Semana 24/06", c:"var(--warning)" },
            { l:"Saldo Final Projetado", v:R(295100), d:"30/06/2026",  c:"var(--success)" },
          ].map(k=>(
            <div key={k.l} style={{ background:"var(--bg-secondary)", border:`1px solid ${k.c}28`, borderLeft:`3px solid ${k.c}`, borderRadius:"var(--radius)", padding:"14px 16px" }}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
              <div style={{ fontSize:"20px",fontWeight:800,color:k.c }}>{k.v}</div>
              {(k as any).d && <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"3px" }}>{(k as any).d}</div>}
            </div>
          ))}
        </div>
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px", marginBottom:"14px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"6px" }}>Projeção de Saldo — 90 dias</div>
          <div style={{ display:"flex", gap:"16px", marginBottom:"14px" }}>
            {[["—",  "Realizado","var(--success)"],["---","Projetado Realista","var(--accent)"],["---","Otimista","var(--purple)"],["---","Pessimista","var(--warning)"]].map(([s,l,c])=>(
              <div key={l as string} style={{ display:"flex",alignItems:"center",gap:"5px" }}>
                <div style={{ width:"24px",height:"2px",background:c as string, borderRadius:"2px" }}/>
                <span style={{ fontSize:"10px",color:"var(--text-secondary)" }}>{l}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={[
              { s:"Mai S3",real:284750,proj:284750,otimista:284750,pessimista:284750 },
              { s:"Mai S4",real:null,proj:312400,otimista:330000,pessimista:290000 },
              { s:"Jun S1",real:null,proj:287600,otimista:315000,pessimista:255000 },
              { s:"Jun S2",real:null,proj:301200,otimista:332000,pessimista:268000 },
              { s:"Jun S3",real:null,proj:318700,otimista:355000,pessimista:280000 },
              { s:"Jun S4",real:null,proj:162400,otimista:245000,pessimista:110000 },
              { s:"Jul S1",real:null,proj:190000,otimista:280000,pessimista:130000 },
              { s:"Jul S2",real:null,proj:215000,otimista:310000,pessimista:155000 },
            ]}>
              <defs>
                <linearGradient id="projAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="s" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<Tip/>}/>
              <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="6 3" label={{value:"Zona de risco",fill:"var(--danger)",fontSize:10}}/>
              <Area type="monotone" dataKey="real"      name="Realizado"  stroke="var(--success)" fill="none"              strokeWidth={2.5}/>
              <Area type="monotone" dataKey="otimista"  name="Otimista"   stroke="var(--purple)"  fill="none"              strokeWidth={1.5} strokeDasharray="6 4"/>
              <Area type="monotone" dataKey="pessimista"name="Pessimista" stroke="var(--warning)" fill="none"              strokeWidth={1.5} strokeDasharray="6 4"/>
              <Area type="monotone" dataKey="proj"      name="Realista"   stroke="var(--accent)"  fill="url(#projAreaGrad)" strokeWidth={2} strokeDasharray="5 3"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:"var(--warning-soft)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:"var(--radius)", padding:"12px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <Info size={14} style={{ color:"var(--warning)", flexShrink:0 }}/>
            <span style={{ fontSize:"12px",color:"var(--warning)" }}>
              No cenário realista, o saldo atingirá o menor valor em <strong>semana 24/06 (R$ 162.400)</strong>. Considere antecipar o recebimento de Construtora Beta ou postergar pagamentos não essenciais nessa semana.
            </span>
          </div>
        </div>
      </>}
    </div>
  )
}
