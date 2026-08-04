"use client"

import { useState, useMemo } from "react"
import { ChevronRight, Download, Settings2, Eye, EyeOff, TrendingUp, TrendingDown, BookOpen, BarChart2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useDateRange } from "@/lib/date-context"
import { useDre } from "@/lib/analytics-client"
import { ScreenLoader } from "@/components/ui/screen-loader"
import { exportCsv, exportPdf, type ExportColumn } from "@/lib/export"
import Link from "next/link"

const R = formatCurrency

// Linhas que compõem cada seção — para filtros
const SECOES = [
  { key:"receitas",     label:"Receitas",              ids:["receita_bruta","deducoes","rec_liquida"] },
  { key:"custos",       label:"Custos (CMV/CSP)",       ids:["csp","lucro_bruto"] },
  { key:"desp_pessoal", label:"Desp. Pessoal",          ids:["desp_pessoal"] },
  { key:"desp_op",      label:"Desp. Operacionais",     ids:["desp_adm","desp_comerc"] },
  { key:"ebitda",       label:"EBITDA",                 ids:["ebitda","depreciacao","ebit"] },
  { key:"financeiro",   label:"Resultado Financeiro",   ids:["rec_fin","desp_fin","lair"] },
  { key:"ir",           label:"IR / CSLL",              ids:["ir_csll"] },
  { key:"lucro",        label:"Lucro Líquido",          ids:["lucro_liq"] },
]

type DreRow = { id:string; label:string; tipo?:string; valor:number; pct:number; filhos?: DreRow[] }

function DreRowComp({ row, depth=0, visible }: { row:DreRow; depth?:number; visible:Set<string> }) {
  const [open, setOpen] = useState(depth===0)
  if (!visible.has(row.id)) return null

  const hasChildren = (row.filhos?.length ?? 0) > 0
  const tipo = row.tipo ?? ""
  const isBold = ["total","resultado","destaque","lucro","positivo"].includes(tipo)

  const bgMap: Record<string,string> = {
    total:    "var(--bg-tertiary)",
    resultado:"rgba(79,70,229,0.07)",
    destaque: "rgba(16,185,129,0.09)",
    lucro:    "rgba(16,185,129,0.16)",
    positivo: "transparent",
    negativo: "transparent",
  }
  const colorMap: Record<string,string> = {
    total:    "var(--text-primary)",
    resultado:"var(--accent)",
    destaque: "var(--success)",
    lucro:    "var(--success)",
    positivo: "var(--success)",
    negativo: row.valor < 0 ? "var(--danger)" : "var(--text-primary)",
  }

  return (
    <>
      <tr
        onClick={()=>hasChildren&&setOpen(o=>!o)}
        style={{ background:bgMap[tipo]||"transparent", borderBottom:"1px solid var(--border)", cursor:hasChildren?"pointer":"default" }}
        onMouseEnter={e=>{ if(!["total","resultado","destaque","lucro"].includes(tipo)) (e.currentTarget as HTMLElement).style.background="var(--bg-tertiary)" }}
        onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=bgMap[tipo]||"transparent" }}>
        <td style={{ padding:"11px 16px", paddingLeft:`${16+depth*22}px`, display:"flex", alignItems:"center", gap:"6px" }}>
          {hasChildren && (
            <ChevronRight size={13} style={{ color:"var(--text-muted)", transform:open?"rotate(90deg)":"none", transition:"transform 0.15s", flexShrink:0 }}/>
          )}
          {!hasChildren && depth>0 && <div style={{ width:"13px" }}/>}
          <span style={{ fontSize:depth===0?13:12.5, fontWeight:isBold?700:400, color:colorMap[tipo] }}>{row.label}</span>
        </td>
        <td style={{ padding:"11px 14px", textAlign:"right", fontSize:isBold?13.5:12.5, fontWeight:isBold?800:500, color:colorMap[tipo], whiteSpace:"nowrap" }}>
          {row.valor!==0 ? R(row.valor) : "—"}
        </td>
        <td style={{ padding:"11px 14px", textAlign:"right", fontSize:"12px", color:row.pct<0?"var(--danger)":row.pct>20?"var(--success)":"var(--text-secondary)" }}>
          {row.pct!==0 ? `${row.pct>0?"+":""}${row.pct.toFixed(1)}%` : "—"}
        </td>
        <td style={{ padding:"11px 14px", textAlign:"right", fontSize:"12px", color:"var(--text-muted)" }}>
          —
        </td>
        <td style={{ padding:"11px 14px", textAlign:"right", fontSize:"12px", color:"var(--text-muted)" }}>
          —
        </td>
      </tr>
      {open && row.filhos?.map(f=><DreRowComp key={f.id} row={f} depth={depth+1} visible={visible}/>)}
    </>
  )
}

export default function DrePage() {
  const { range } = useDateRange()
  const [secaoFilter, setSecaoFilter] = useState<Set<string>>(new Set(SECOES.map(s=>s.key)))
  const [comparePeriod, setComparePeriod] = useState(false)
  const [showSubtotals, setShowSubtotals] = useState(true)
  const [showOnlyResults, setShowOnlyResults] = useState(false)
  const [centerFilter, setCenterFilter] = useState("todos")

  function toggleSecao(key: string) {
    setSecaoFilter(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const { dre, loading } = useDre(range)

  const dreNodes: DreRow[] = useMemo(() => dre.map((n, i) => ({
    id: n.id ?? `n${i}`,
    label: n.label,
    tipo: n.tipo,
    valor: Number(n.valor ?? 0),
    pct: Number(n.percent ?? 0),
    filhos: (n.filhos ?? []).map((f, j) => ({
      id: `${n.id ?? i}-${j}`,
      label: f.label,
      valor: Number(f.valor ?? 0),
      pct: Number((f as any).percent ?? 0),
    })),
  })), [dre])

  const visibleIds = useMemo(() => {
    const ids = new Set<string>()
    dreNodes.forEach(r => { ids.add(r.id); r.filhos?.forEach(f => ids.add(f.id)) })
    return ids
  }, [dreNodes])

  const data = useMemo(() => {
    if (showOnlyResults) return dreNodes.filter(r => ["resultado","destaque","lucro"].includes(r.tipo ?? ""))
    return dreNodes
  }, [showOnlyResults, dreNodes])

  const byId = useMemo(() => Object.fromEntries(dreNodes.map(n => [n.id, n])), [dreNodes])
  const sumV = (...ids: string[]) => ids.reduce((s, id) => s + (byId[id]?.valor ?? 0), 0)
  const rbV = byId["receita_bruta"]?.valor ?? 0
  const rlV = byId["receita_liquida"]?.valor ?? 0
  // Custos e despesas = soma de todas as posições que reduzem o resultado (já armazenadas com sinal negativo)
  const cdV = sumV("custos", "despesas_operacionais", "depreciacao", "resultado_financeiro", "ir_csll")
  const llV = byId["lucro_liquido"]?.valor ?? 0
  const pctOf = (v: number) => (rbV > 0 ? `${((v / rbV) * 100).toFixed(1)}%` : "—")
  const keyKpis = [
    { l:"Receita Bruta",     v:R(rbV), pct:pctOf(rbV), c:"var(--success)" },
    { l:"Receita Líquida",   v:R(rlV), pct:pctOf(rlV), c:"var(--success)" },
    { l:"Custos e Despesas", v:R(cdV), pct:pctOf(cdV), c:"var(--danger)" },
    { l:"Lucro Líquido",     v:R(llV), pct:pctOf(llV), c: llV>=0?"var(--success)":"var(--warning)" },
  ]

  type DreExportRow = { conta: string; valor: number; pct: number }
  const exportRows = useMemo<DreExportRow[]>(() => {
    const out: DreExportRow[] = []
    for (const n of dreNodes) {
      out.push({ conta: n.label, valor: n.valor, pct: n.pct })
      for (const f of n.filhos ?? []) out.push({ conta: `    ${f.label}`, valor: f.valor, pct: f.pct })
    }
    return out
  }, [dreNodes])
  const exportColumns: ExportColumn<DreExportRow>[] = [
    { header:"Conta / Descrição", value:(r)=>r.conta },
    { header:"Valor",             value:(r)=>R(r.valor), align:"right" },
    { header:"% Receita",         value:(r)=>r.pct!==0?`${r.pct.toFixed(1)}%`:"—", align:"right" },
  ]

  // Gate DEPOIS de todos os hooks (inclusive os useMemo) para não quebrar a ordem
  // de hooks do React. Evita piscar zeros enquanto a DRE carrega.
  if (loading) return <ScreenLoader />

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px" }}>
        <div>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>DRE Gerencial</h1>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{range.label} · Padrão NBC TG / CPC</div>
        </div>
        <div style={{ display:"flex",gap:"7px" }}>
          <Link href="/registers/categories" style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 13px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"12px",color:"var(--text-secondary)",textDecoration:"none" }}>
            <BookOpen size={12}/> Categorias
          </Link>
          <button onClick={()=>exportPdf("DRE Gerencial", `${range.label} · Padrão NBC TG / CPC`, exportColumns, exportRows)} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 13px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
            <Download size={12}/> PDF
          </button>
          <button onClick={()=>exportCsv("dre-gerencial", exportColumns, exportRows)} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 13px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
            <Download size={12}/> Excel
          </button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"14px" }}>
        {keyKpis.map(k=>(
          <div key={k.l} style={{ background:"var(--bg-secondary)",border:`1px solid ${k.c}28`,borderLeft:`3px solid ${k.c}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"5px" }}>{k.l}</div>
            <div style={{ fontSize:"18px",fontWeight:800,color:k.c }}>{k.v}</div>
            <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{k.pct} da receita</div>
          </div>
        ))}
      </div>

      {/* Filtros por seção */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"12px 14px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",flexShrink:0 }}>
          <Settings2 size={12}/> Filtrar seções:
        </div>
        {SECOES.map(s=>(
          <button key={s.key} onClick={()=>toggleSecao(s.key)} style={{
            display:"flex",alignItems:"center",gap:"4px",
            padding:"5px 12px",borderRadius:"20px",border:"1px solid",
            borderColor:secaoFilter.has(s.key)?"var(--accent)":"var(--border)",
            background:secaoFilter.has(s.key)?"var(--accent-soft)":"transparent",
            color:secaoFilter.has(s.key)?"var(--accent)":"var(--text-secondary)",
            fontSize:"11.5px",fontWeight:secaoFilter.has(s.key)?700:400,
            cursor:"pointer",fontFamily:"inherit",transition:"all 0.12s",
          }}>
            {secaoFilter.has(s.key) ? <Eye size={11}/> : <EyeOff size={11}/>}
            {s.label}
          </button>
        ))}
        <div style={{ marginLeft:"auto",display:"flex",gap:"6px" }}>
          <button onClick={()=>setShowOnlyResults(o=>!o)} style={{
            padding:"5px 12px",borderRadius:"20px",border:"1px solid",
            borderColor:showOnlyResults?"var(--purple)":"var(--border)",
            background:showOnlyResults?"var(--purple-soft)":"transparent",
            color:showOnlyResults?"var(--purple)":"var(--text-secondary)",
            fontSize:"11.5px",fontWeight:showOnlyResults?700:400,
            cursor:"pointer",fontFamily:"inherit",
          }}>
            {showOnlyResults?"Ver tudo":"Só resultados"}
          </button>
          <select value={centerFilter} onChange={e=>setCenterFilter(e.target.value)} style={{
            padding:"5px 10px",borderRadius:"6px",border:"1px solid var(--border)",
            background:"var(--bg-tertiary)",fontSize:"11.5px",color:"var(--text-secondary)",
            outline:"none",fontFamily:"inherit",cursor:"pointer",
          }}>
            <option value="todos">Todos os centros</option>
            <option value="obra07">Obra 07</option>
            <option value="obra09">Obra 09</option>
            <option value="admin">Administrativo</option>
          </select>
        </div>
      </div>

      {/* Tabela DRE */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Conta / Descrição","Valor",`% Receita`,`${range.label.slice(0,7)} Anterior`,"Variação"].map((h,i)=>(
                <th key={h} style={{ padding:"11px 14px",textAlign:i===0?"left":"right",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",background:"var(--bg-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row=>(
              <DreRowComp key={row.id} row={row} visible={visibleIds}/>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
