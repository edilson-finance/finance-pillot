"use client"

import { useState } from "react"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts"
import { useKpis, useHealthDimensions } from "@/lib/analytics-client"
import { ScreenLoader } from "@/components/ui/screen-loader"
import { useDateRange } from "@/lib/date-context"
import { Edit2, Check, X, RotateCcw, Info } from "lucide-react"

/* Benchmarks padrão de mercado (Construção Civil / PMEs Brasil) */
const MARKET_DEFAULTS: Record<string,{ bom: number; atencao: number; risco: number; unit: string; desc: string }> = {
  "Caixa":          { bom:1.5,  atencao:0.5,  risco:0.2,  unit:"x despesas", desc:"Saldo vs despesas mensais" },
  "Lucro":          { bom:10,   atencao:5,    risco:2,    unit:"%",           desc:"Margem líquida" },
  "Margem":         { bom:35,   atencao:20,   risco:10,   unit:"%",           desc:"Margem de contribuição" },
  "Inadimplência":  { bom:5,    atencao:15,   risco:20,   unit:"%",           desc:"% títulos em atraso" },
  "Despesas":       { bom:5,    atencao:10,   risco:15,   unit:"%",           desc:"Crescimento máximo seguro" },
  "Crescimento":    { bom:5,    atencao:0,    risco:-5,   unit:"%",           desc:"Crescimento mínimo esperado" },
  "Endividamento":  { bom:2,    atencao:4,    risco:6,    unit:"x receita",   desc:"Dívidas vs receita mensal" },
  "Concentração":   { bom:30,   atencao:50,   risco:60,   unit:"%",           desc:"% máximo top 3 clientes" },
  "Previsibilidade":{ bom:50,   atencao:25,   risco:10,   unit:"%",           desc:"Receita recorrente" },
  "Disciplina":     { bom:90,   atencao:70,   risco:50,   unit:"%",           desc:"Lançamentos categorizados" },
}

const statusConfig = {
  saudavel: { label:"Saudável", color:"var(--success)", bg:"var(--success-soft)" },
  atencao:  { label:"Atenção",  color:"var(--warning)", bg:"var(--warning-soft)" },
  risco:    { label:"Risco",    color:"#F97316",        bg:"rgba(249,115,22,0.12)" },
  critico:  { label:"Crítico",  color:"var(--danger)",  bg:"var(--danger-soft)" },
}

function ScoreCircle({ score, config }: { score: number; config: any }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const pct = score / 10
  return (
    <div style={{ position:"relative",width:"108px",height:"108px" }}>
      <svg width="108" height="108" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="54" cy="54" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="7"/>
        <circle cx="54" cy="54" r={r} fill="none" stroke={config.color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
        <span style={{ fontSize:"26px",fontWeight:900,color:config.color,lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:"10px",color:config.color,marginTop:"1px" }}>/10</span>
      </div>
    </div>
  )
}

export default function HealthPage() {
  const { range } = useDateRange()
  const { kpis, loading } = useKpis(range)
  const { dims: healthDimensions } = useHealthDimensions()
  const [editMode, setEditMode] = useState(false)
  const [metas, setMetas] = useState<Record<string,{bom:number;atencao:number;risco:number}>>(() =>
    Object.fromEntries(Object.entries(MARKET_DEFAULTS).map(([k,v])=>[k,{bom:v.bom,atencao:v.atencao,risco:v.risco}]))
  )
  const [useMarket, setUseMarket] = useState(true)

  if (loading) return <ScreenLoader />

  function resetToMarket() {
    setMetas(Object.fromEntries(Object.entries(MARKET_DEFAULTS).map(([k,v])=>[k,{bom:v.bom,atencao:v.atencao,risco:v.risco}])))
    setUseMarket(true)
  }

  const healthScore = healthDimensions.length ? parseFloat((healthDimensions.reduce((s,d)=>s+d.nota,0)/healthDimensions.length).toFixed(1)) : 0

  let scoreConf = statusConfig.saudavel
  if (healthScore < 4) scoreConf = statusConfig.critico
  else if (healthScore < 6) scoreConf = statusConfig.risco
  else if (healthScore < 8) scoreConf = statusConfig.atencao

  const radarData = healthDimensions.map(d=>({ dimensao:d.nome,nota:d.nota,fullMark:10 }))

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"18px" }}>
        <div>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Saúde Financeira</h1>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{range.label}</div>
        </div>
        <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
          {editMode ? (
            <>
              <button onClick={resetToMarket} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"11px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
                <RotateCcw size={12}/> Padrão de mercado
              </button>
              <button onClick={()=>setEditMode(false)} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 14px",background:"var(--success)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"11px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                <Check size={12}/> Salvar metas
              </button>
            </>
          ) : (
            <button onClick={()=>setEditMode(true)} style={{ display:"flex",alignItems:"center",gap:"5px",padding:"7px 14px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"11px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
              <Edit2 size={12}/> Editar metas
            </button>
          )}
        </div>
      </div>

      {/* Meta source banner */}
      <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:useMarket?"var(--accent-soft)":"var(--purple-soft)",border:`1px solid ${useMarket?"var(--accent-border)":"var(--purple-border)"}`,borderRadius:"var(--radius)",marginBottom:"16px" }}>
        <Info size={13} style={{ color:useMarket?"var(--accent)":"var(--purple)",flexShrink:0 }}/>
        <span style={{ fontSize:"12px",color:useMarket?"var(--accent)":"var(--purple)" }}>
          {useMarket ? "Usando benchmarks padrão de mercado (Construção Civil / PMEs Brasil). Clique em 'Editar metas' para personalizar." : "Usando metas personalizadas. Clique em 'Padrão de mercado' para restaurar."}
        </span>
      </div>

      {/* Score principal */}
      <div className="health-hero" style={{ background:"var(--bg-secondary)",border:`1px solid ${scoreConf.color}30`,borderRadius:"var(--radius)",padding:"22px",marginBottom:"18px",display:"flex",alignItems:"center",gap:"24px" }}>
        <ScoreCircle score={healthScore} config={scoreConf}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"16px",fontWeight:800,color:"var(--text-primary)",marginBottom:"6px" }}>
            Empresa em estado de <span style={{ color:scoreConf.color }}>{scoreConf.label}</span>
          </div>
          <p style={{ fontSize:"12.5px",color:"var(--text-secondary)",lineHeight:1.65 }}>
            Com base nos dados de {range.label}, foram avaliadas 10 dimensões financeiras. A inadimplência está em {kpis.inadimplencia}% e a margem líquida em {kpis.lucroMargin}% (meta: acima de 10%). Veja abaixo as dimensões que merecem mais atenção.
          </p>
        </div>
        <div className="kpi-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",minWidth:"180px" }}>
          {Object.entries(statusConfig).map(([k,s])=>(
            <div key={k} style={{ background:"var(--bg-tertiary)",borderRadius:"8px",padding:"10px",textAlign:"center" }}>
              <div style={{ fontSize:"22px",fontWeight:800,color:s.color }}>{healthDimensions.filter(d=>d.status===k).length}</div>
              <div style={{ fontSize:"10px",color:s.color }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px" }}>
        {/* Radar */}
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"12px" }}>Mapa de Saúde — Radar</div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)"/>
              <PolarAngleAxis dataKey="dimensao" tick={{ fill:"var(--text-secondary)",fontSize:11 }}/>
              <Radar name="Nota" dataKey="nota" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.18} strokeWidth={2}/>
              <Tooltip formatter={(v)=>`${v}/10`}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dimensões com metas editáveis */}
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px",overflowY:"auto",maxHeight:"400px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>
            Dimensões {editMode && <span style={{ fontSize:"11px",color:"var(--warning)",fontWeight:400,marginLeft:"8px" }}>— editando metas</span>}
          </div>
          {healthDimensions.map(dim=>{
            const sc = statusConfig[dim.status as keyof typeof statusConfig]
            const md = MARKET_DEFAULTS[dim.nome]
            const m  = metas[dim.nome]
            return (
              <div key={dim.nome} style={{ padding:"10px 12px",background:"var(--bg-tertiary)",borderRadius:"8px",borderLeft:`3px solid ${sc.color}`,marginBottom:"8px" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom: editMode?"8px":"4px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                    <span style={{ fontSize:"12.5px",fontWeight:700,color:"var(--text-primary)" }}>{dim.nome}</span>
                    <span style={{ fontSize:"10px",fontWeight:700,color:sc.color,background:sc.bg,padding:"1px 7px",borderRadius:"20px" }}>{sc.label}</span>
                  </div>
                  <div style={{ fontSize:"18px",fontWeight:800,color:sc.color }}>{dim.nota}</div>
                </div>
                <div style={{ fontSize:"11px",color:"var(--text-secondary)",marginBottom: editMode?"8px":"0" }}>{dim.descricao}</div>
                {editMode && md && (
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px",marginTop:"6px" }}>
                    {[["Bom (>)", m.bom,"var(--success)"],["Atenção","","var(--warning)"],["Risco (<)",m.risco,"var(--danger)"]].map(([l,v,c],i)=>(
                      <div key={l as string}>
                        <div style={{ fontSize:"9px",color:c as string,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:"2px" }}>{l}</div>
                        <input
                          type="number"
                          value={i===0?m.bom:i===1?m.atencao:m.risco}
                          onChange={e=>{
                            const v = parseFloat(e.target.value)
                            setMetas(prev=>({...prev,[dim.nome]:{...prev[dim.nome],[i===0?"bom":i===1?"atencao":"risco"]:v}}))
                            setUseMarket(false)
                          }}
                          style={{ width:"100%",padding:"4px 7px",background:"var(--bg-secondary)",border:`1px solid ${c as string}40`,borderRadius:"4px",fontSize:"11px",color:c as string,fontWeight:700,outline:"none",fontFamily:"inherit" }}
                        />
                        <div style={{ fontSize:"9px",color:"var(--text-muted)",marginTop:"1px" }}>{md.unit}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
