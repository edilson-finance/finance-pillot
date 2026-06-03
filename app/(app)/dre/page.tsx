"use client"

import { useState, useMemo } from "react"
import { ChevronRight, Download, Settings2, Eye, EyeOff, TrendingUp, TrendingDown, BookOpen, BarChart2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useDateRange } from "@/lib/date-context"
import Link from "next/link"

const R = formatCurrency

/* ── Estrutura DRE padrão brasileiro ── */
const DRE_ESTRUTURA = [
  {
    id:"receita_bruta", label:"Receita Bruta de Vendas e Serviços",
    tipo:"total", valor:312000, pct:100,
    filhos:[
      { id:"servicos",   label:"Prestação de Serviços", valor:248000, pct:79.5 },
      { id:"contratos",  label:"Contratos Mensais",     valor:64000,  pct:20.5 },
    ]
  },
  {
    id:"deducoes", label:"(–) Deduções da Receita",
    tipo:"negativo", valor:-18096, pct:-5.8,
    filhos:[
      { id:"iss",    label:"ISS sobre Serviços",              valor:-4992,  pct:-1.6 },
      { id:"piscof", label:"PIS e COFINS",                    valor:-8352,  pct:-2.7 },
      { id:"simples",label:"Simples Nacional s/ Receita",     valor:-4752,  pct:-1.5 },
    ]
  },
  { id:"rec_liquida", label:"= Receita Líquida", tipo:"resultado", valor:293904, pct:94.2 },
  {
    id:"csp", label:"(–) Custo dos Serviços Prestados (CSP)",
    tipo:"negativo", valor:-176800, pct:-56.7,
    filhos:[
      { id:"mao_obra",    label:"Mão de Obra Direta",          valor:-72400, pct:-23.2 },
      { id:"materiais",   label:"Materiais e Insumos",          valor:-62800, pct:-20.1 },
      { id:"terceiros",   label:"Subcontratados / Terceiros",   valor:-41600, pct:-13.3 },
    ]
  },
  { id:"lucro_bruto", label:"= Lucro Bruto", tipo:"destaque", valor:117104, pct:37.5 },
  {
    id:"desp_pessoal", label:"(–) Despesas com Pessoal",
    tipo:"negativo", valor:-43000, pct:-13.8,
    filhos:[
      { id:"salarios",    label:"Salários e Ordenados",         valor:-31000, pct:-9.9 },
      { id:"encargos",    label:"Encargos Sociais (INSS, FGTS)",valor:-8400,  pct:-2.7 },
      { id:"beneficios",  label:"Benefícios (VT, VR, Saúde)",   valor:-3600,  pct:-1.2 },
    ]
  },
  {
    id:"desp_adm", label:"(–) Despesas Administrativas",
    tipo:"negativo", valor:-8400, pct:-2.7,
    filhos:[
      { id:"aluguel",     label:"Aluguel e Condomínio",         valor:-8400,  pct:-2.7 },
      { id:"telecom",     label:"Telefonia e Internet",         valor:-890,   pct:-0.3 },
      { id:"software",    label:"Softwares e Sistemas",         valor:-1240,  pct:-0.4 },
    ]
  },
  {
    id:"desp_comerc", label:"(–) Despesas Comerciais e Marketing",
    tipo:"negativo", valor:-4300, pct:-1.4,
    filhos:[
      { id:"mkt",         label:"Marketing Digital",            valor:-2800,  pct:-0.9 },
      { id:"comiss",      label:"Comissões sobre Vendas",       valor:-1500,  pct:-0.5 },
    ]
  },
  { id:"ebitda", label:"= EBITDA", tipo:"destaque", valor:61404, pct:19.7 },
  {
    id:"depreciacao", label:"(–) Depreciação e Amortização",
    tipo:"negativo", valor:-3200, pct:-1.0,
    filhos:[
      { id:"dep_imob", label:"Depreciação de Equipamentos",     valor:-2400,  pct:-0.8 },
      { id:"amort",    label:"Amortização de Intangíveis",      valor:-800,   pct:-0.3 },
    ]
  },
  { id:"ebit", label:"= EBIT — Resultado Operacional", tipo:"resultado", valor:58204, pct:18.7 },
  {
    id:"rec_fin", label:"(+) Receitas Financeiras",
    tipo:"positivo", valor:1200, pct:0.4,
    filhos:[
      { id:"rend_aplic", label:"Rendimentos de Aplicações",     valor:1200,   pct:0.4 },
    ]
  },
  {
    id:"desp_fin", label:"(–) Despesas Financeiras",
    tipo:"negativo", valor:-17200, pct:-5.5,
    filhos:[
      { id:"juros",       label:"Juros sobre Empréstimos",      valor:-14200, pct:-4.6 },
      { id:"tarifas",     label:"Tarifas Bancárias e IOF",      valor:-3000,  pct:-1.0 },
    ]
  },
  { id:"lair", label:"= LAIR — Antes do IR e CSLL", tipo:"resultado", valor:42204, pct:13.5 },
  {
    id:"ir_csll", label:"(–) IR e CSLL",
    tipo:"negativo", valor:-23804, pct:-7.6,
    filhos:[
      { id:"irpj",   label:"IRPJ — Imposto de Renda PJ",       valor:-14280, pct:-4.6 },
      { id:"csll",   label:"CSLL — Contribuição Social",        valor:-9524,  pct:-3.1 },
    ]
  },
  {
    id:"retir", label:"(–) Retiradas dos Sócios / Pró-labore",
    tipo:"negativo", valor:-0, pct:-0, // incluso em desp_pessoal
    filhos:[]
  },
  { id:"lucro_liq", label:"= LUCRO LÍQUIDO DO EXERCÍCIO", tipo:"lucro", valor:18400, pct:5.9 },
]

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
          {row.valor!==0 ? R(Math.round(row.valor*0.915)) : "—"}
        </td>
        <td style={{ padding:"11px 14px", textAlign:"right", fontSize:"12px", color:"var(--success)" }}>
          {row.valor!==0 ? "+8,5%" : "—"}
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

  const visibleIds = useMemo(() => {
    const ids = new Set<string>()
    SECOES.forEach(s => {
      if (secaoFilter.has(s.key)) s.ids.forEach(id => ids.add(id))
    })
    // Sempre adicionar todos os ids filhos de contas visíveis
    DRE_ESTRUTURA.forEach(r => {
      if (ids.has(r.id)) r.filhos?.forEach(f => ids.add(f.id))
    })
    return ids
  }, [secaoFilter])

  const data = useMemo(() => {
    if (showOnlyResults) return DRE_ESTRUTURA.filter(r => ["resultado","destaque","lucro"].includes(r.tipo))
    return DRE_ESTRUTURA
  }, [showOnlyResults])

  const keyKpis = [
    { l:"Receita Bruta",        v:R(312000), pct:"100%",  c:"var(--success)" },
    { l:"Lucro Bruto",          v:R(117104), pct:"37,5%", c:"var(--success)" },
    { l:"EBITDA",               v:R(61404),  pct:"19,7%", c:"var(--accent)" },
    { l:"Lucro Líquido",        v:R(18400),  pct:"5,9%",  c:"var(--warning)" },
  ]

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px" }}>
        <div>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>DRE Gerencial</h1>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{range.label} · Padrão NBC TG / CPC</div>
        </div>
        <div style={{ display:"flex",gap:"7px" }}>
          <Link href="/registers/accounts-plan" style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 13px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"12px",color:"var(--text-secondary)",textDecoration:"none" }}>
            <BookOpen size={12}/> Plano de Contas
          </Link>
          <button style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 13px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
            <Download size={12}/> PDF
          </button>
          <button style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 13px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
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
