"use client"

import { useState } from "react"
import { Download, FileText, BarChart2, TrendingUp, TrendingDown, RefreshCw, Filter, Eye } from "lucide-react"
import { useDateRange } from "@/lib/date-context"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const REPORT_TYPES = [
  { id:"dre",          label:"DRE Gerencial",           icon:FileText,    desc:"Demonstrativo de resultado com análise vertical" },
  { id:"cashflow",     label:"Fluxo de Caixa",          icon:TrendingUp,  desc:"Entradas, saídas e saldo por período" },
  { id:"payables",     label:"Contas a Pagar",          icon:TrendingDown,desc:"Obrigações e pagamentos do período" },
  { id:"receivables",  label:"Contas a Receber",        icon:TrendingUp,  desc:"Receitas e recebimentos do período" },
  { id:"inadimplencia",label:"Inadimplência",           icon:RefreshCw,   desc:"Aging report e análise de atrasos" },
  { id:"byCategory",   label:"Receitas por Categoria",  icon:BarChart2,   desc:"Faturamento agrupado por categoria" },
  { id:"byExpense",    label:"Despesas por Categoria",  icon:BarChart2,   desc:"Custos agrupados por categoria" },
  { id:"byCostCenter", label:"Por Centro de Custo",     icon:BarChart2,   desc:"Resultado por obra, departamento ou projeto" },
  { id:"byClient",     label:"Por Cliente",             icon:BarChart2,   desc:"Receita e inadimplência por cliente" },
  { id:"bySupplier",   label:"Por Fornecedor",          icon:BarChart2,   desc:"Pagamentos e concentração de fornecedores" },
  { id:"conciliacao",  label:"Conciliação Bancária",    icon:RefreshCw,   desc:"Itens conciliados e pendentes por conta" },
  { id:"balancete",    label:"Balancete Financeiro",    icon:FileText,    desc:"Posição consolidada de todas as contas" },
]

const previewData = {
  dre: [
    { label:"Receita Bruta",              valor:312000,  pct:100,   tipo:"total" },
    { label:"(–) Deduções",              valor:-18096,  pct:-5.8,  tipo:"negativo" },
    { label:"= Receita Líquida",         valor:293904,  pct:94.2,  tipo:"resultado" },
    { label:"(–) Custos Variáveis",      valor:-176800, pct:-56.7, tipo:"negativo" },
    { label:"= Margem de Contribuição",  valor:117104,  pct:37.5,  tipo:"destaque" },
    { label:"(–) Despesas Fixas",        valor:-55700,  pct:-17.9, tipo:"negativo" },
    { label:"= Resultado Operacional",   valor:61404,   pct:19.7,  tipo:"resultado" },
    { label:"(–) Despesas Financeiras",  valor:-17200,  pct:-5.5,  tipo:"negativo" },
    { label:"(–) Retiradas dos Sócios",  valor:-25804,  pct:-8.3,  tipo:"negativo" },
    { label:"= LUCRO LÍQUIDO",           valor:18400,   pct:5.9,   tipo:"lucro" },
  ],
  cashflow: [
    { label:"Saldo Inicial",             valor:295400,  pct:null,  tipo:"total" },
    { label:"+ Entradas Realizadas",     valor:124000,  pct:null,  tipo:"resultado" },
    { label:"– Saídas Realizadas",       valor:-134850, pct:null,  tipo:"negativo" },
    { label:"= Saldo do Período",        valor:284750,  pct:null,  tipo:"lucro" },
    { label:"(+) A Receber",             valor:113500,  pct:null,  tipo:"destaque" },
    { label:"(–) A Pagar",              valor:-103200, pct:null,  tipo:"negativo" },
    { label:"= Saldo Projetado",         valor:295050,  pct:null,  tipo:"resultado" },
  ],
}

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return { width:"100%",padding:"8px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit",...extra }
}

export default function ReportsPage() {
  const { range } = useDateRange()
  const [selected, setSelected] = useState("dre")
  const [groupBy, setGroupBy] = useState("mes")
  const [category, setCategory] = useState("todas")
  const [costCenter, setCostCenter] = useState("todos")
  const [showPreview, setShowPreview] = useState(false)

  const sel = REPORT_TYPES.find(r=>r.id===selected)!
  const preview = (previewData as any)[selected]

  const typeColors: Record<string,string> = {
    total:"var(--text-primary)", resultado:"var(--accent)",
    destaque:"var(--success)", negativo:"var(--danger)", lucro:"var(--success)",
  }
  const typeBg: Record<string,string> = {
    total:"var(--bg-tertiary)", resultado:"rgba(79,70,229,0.06)",
    destaque:"rgba(16,185,129,0.08)", negativo:"transparent", lucro:"rgba(16,185,129,0.14)",
  }

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ marginBottom:"18px" }}>
        <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Relatórios</h1>
        <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Gere, visualize e exporte relatórios financeiros com filtros completos</p>
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
              <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Filtros — {sel.label}</span>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
              {/* Period */}
              <div>
                <div style={{ fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>Período</div>
                <DateRangePicker/>
              </div>

              {/* Grouping */}
              <div>
                <div style={{ fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>Agrupar por</div>
                <select style={inp()} value={groupBy} onChange={e=>setGroupBy(e.target.value)}>
                  <option value="dia">Dia</option>
                  <option value="semana">Semana</option>
                  <option value="mes">Mês</option>
                  <option value="trimestre">Trimestre</option>
                  <option value="ano">Ano</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <div style={{ fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>Categoria</div>
                <select style={inp()} value={category} onChange={e=>setCategory(e.target.value)}>
                  <option value="todas">Todas as categorias</option>
                  <option value="receita_obras">Receita de Obras</option>
                  <option value="contratos">Contratos Mensais</option>
                  <option value="materiais">Materiais e Insumos</option>
                  <option value="folha">Folha de Pagamento</option>
                  <option value="subempreit">Subempreiteiros</option>
                </select>
              </div>

              {/* Cost Center */}
              <div>
                <div style={{ fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>Centro de Custo</div>
                <select style={inp()} value={costCenter} onChange={e=>setCostCenter(e.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="obra07">Obra 07 — Construtora Beta</option>
                  <option value="obra09">Obra 09 — J. Silva</option>
                  <option value="admin">Administrativo</option>
                  <option value="comercial">Comercial</option>
                </select>
              </div>

              {/* Client */}
              <div>
                <div style={{ fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>Cliente</div>
                <select style={inp()}>
                  <option>Todos os clientes</option>
                  <option>Construtora Beta</option>
                  <option>J. Silva Empreendimentos</option>
                  <option>Grupo Horizonte</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <div style={{ fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px" }}>Status</div>
                <select style={inp()}>
                  <option>Todos</option>
                  <option>A pagar / A receber</option>
                  <option>Pagos / Recebidos</option>
                  <option>Em atraso</option>
                  <option>Cancelados</option>
                </select>
              </div>
            </div>

            <div style={{ display:"flex",gap:"8px",marginTop:"16px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
              <button onClick={()=>setShowPreview(true)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                <Eye size={13}/> Visualizar Relatório
              </button>
              <button style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
                <Download size={13}/> Exportar PDF
              </button>
              <button style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
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
                  <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"1px" }}>{range.label} · Agrupado por {groupBy}</div>
                </div>
                <div style={{ display:"flex",gap:"6px" }}>
                  <button style={{ padding:"6px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"11px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"4px" }}>
                    <Download size={12}/> PDF
                  </button>
                  <button style={{ padding:"6px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"11px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"4px" }}>
                    <Download size={12}/> Excel
                  </button>
                </div>
              </div>

              {preview ? (
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
                      {["Conta / Descrição","Valor",selected==="dre"?"% Receita":null].filter(Boolean).map(h=>(
                        <th key={h!} style={{ padding:"10px 18px",textAlign:h!=="Conta / Descrição"?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row: any,i: number)=>(
                      <tr key={i} style={{ borderBottom:"1px solid var(--border)",background:typeBg[row.tipo]||"transparent" }}
                        onMouseEnter={e=>(e.currentTarget.style.opacity="0.85")}
                        onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                        <td style={{ padding:"10px 18px",fontSize:["lucro","resultado","destaque"].includes(row.tipo)?"13px":"12.5px",fontWeight:["lucro","resultado","destaque","total"].includes(row.tipo)?700:400,color:typeColors[row.tipo]||"var(--text-secondary)" }}>{row.label}</td>
                        <td style={{ padding:"10px 18px",textAlign:"right",fontSize:"13px",fontWeight:700,color:row.valor<0?"var(--danger)":typeColors[row.tipo]||"var(--text-primary)" }}>
                          {row.valor>0?"+":""}{R(row.valor)}
                        </td>
                        {selected==="dre" && (
                          <td style={{ padding:"10px 18px",textAlign:"right",fontSize:"12px",color:(row.pct||0)<0?"var(--danger)":(row.pct||0)>20?"var(--success)":"var(--text-secondary)" }}>
                            {row.pct!==null?`${(row.pct as number)>0?"+":""}${(row.pct as number).toFixed(1)}%`:"—"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding:"32px",textAlign:"center",color:"var(--text-muted)" }}>
                  <BarChart2 size={32} style={{ marginBottom:"8px",opacity:0.4 }}/>
                  <div style={{ fontSize:"13px" }}>Visualização para "{sel.label}" em desenvolvimento</div>
                  <div style={{ fontSize:"11px",marginTop:"4px" }}>Use exportar para baixar o relatório completo</div>
                </div>
              )}
            </div>
          )}

          {!showPreview && (
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"32px",textAlign:"center",color:"var(--text-muted)" }}>
              <Eye size={28} style={{ marginBottom:"8px",opacity:0.4 }}/>
              <div style={{ fontSize:"13px",fontWeight:500,color:"var(--text-secondary)" }}>Configure os filtros e clique em "Visualizar Relatório"</div>
              <div style={{ fontSize:"11px",marginTop:"4px" }}>Relatório selecionado: <strong style={{ color:"var(--accent)" }}>{sel.label}</strong></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
