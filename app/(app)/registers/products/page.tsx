"use client"

import { useState } from "react"
import { Plus, Search, Edit2, ChevronLeft, X } from "lucide-react"
import Link from "next/link"

const R = (v:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:0}).format(v)
const Pct = (v:number) => `${v.toFixed(1)}%`

const products = [
  { id:"1",nome:"Consultoria Técnica",tipo:"servico",sku:"SRV-001",unidade:"hora",preco:850,custo:380,status:"ativo",categoria:"Serviços" },
  { id:"2",nome:"Projeto Estrutural",tipo:"servico",sku:"SRV-002",unidade:"projeto",preco:14000,custo:5200,status:"ativo",categoria:"Projetos" },
  { id:"3",nome:"Aço CA-50 10mm",tipo:"produto",sku:"MAT-001",unidade:"kg",preco:12.5,custo:9.8,status:"ativo",categoria:"Materiais" },
  { id:"4",nome:"Cimento CP-II 50kg",tipo:"produto",sku:"MAT-002",unidade:"saco",preco:42,custo:32,status:"ativo",categoria:"Materiais" },
  { id:"5",nome:"Laudo Técnico",tipo:"servico",sku:"SRV-003",unidade:"laudo",preco:2800,custo:800,status:"ativo",categoria:"Serviços" },
  { id:"6",nome:"Medição de Obra",tipo:"servico",sku:"SRV-004",unidade:"medição",preco:0,custo:0,status:"ativo",categoria:"Obras",obs:"Valor conforme contrato" },
]

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }
function Label({ children }: { children:string }) {
  return <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

export default function ProductsPage() {
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [tipoForm, setTipoForm] = useState<"produto"|"servico">("servico")
  const [preco, setPreco] = useState("")
  const [custo, setCusto] = useState("")

  const filtered = products.filter(p=>p.nome.toLowerCase().includes(q.toLowerCase()))
  const margem = (parseFloat(preco)||0) > 0 ? (((parseFloat(preco)||0) - (parseFloat(custo)||0))/(parseFloat(preco)||1)*100) : 0

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Produtos e Serviços</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Catálogo de itens para lançamentos rápidos</p>
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Novo item
        </button>
      </div>

      {showForm && (
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Novo Produto / Serviço</span>
            <button onClick={()=>setShowForm(false)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          {/* Tipo */}
          <div style={{ display:"flex",gap:"6px",marginBottom:"16px" }}>
            {(["servico","produto"] as const).map(t=>(
              <button key={t} onClick={()=>setTipoForm(t)} style={{
                flex:1,padding:"9px",borderRadius:"6px",border:`1px solid ${tipoForm===t?"var(--accent)":"var(--border)"}`,
                background:tipoForm===t?"var(--accent-soft)":"transparent",
                color:tipoForm===t?"var(--accent)":"var(--text-secondary)",
                fontSize:"12.5px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              }}>{t==="servico"?"Serviço":"Produto"}</button>
            ))}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><Label>Nome *</Label><input type="text" placeholder={tipoForm==="servico"?"Ex: Consultoria técnica por hora":"Ex: Aço CA-50 10mm"} style={inp}/></div>
            <div><Label>Código SKU</Label><input type="text" placeholder="SRV-001 / MAT-001" style={inp}/></div>
            {tipoForm==="produto" && <div><Label>Unidade de medida</Label>
              <select style={inp}><option>Un</option><option>Kg</option><option>m²</option><option>m³</option><option>m</option><option>Litro</option><option>Saco</option><option>Caixa</option><option>Rolo</option></select>
            </div>}
            {tipoForm==="servico" && <div><Label>Unidade</Label>
              <select style={inp}><option>Hora</option><option>Projeto</option><option>Medição</option><option>Laudo</option><option>Mês</option><option>Visita</option><option>Serviço</option></select>
            </div>}
            <div><Label>Categoria padrão</Label>
              <select style={inp}><option>Serviços</option><option>Projetos</option><option>Obras</option><option>Materiais</option><option>Contratos</option></select>
            </div>
            <div><Label>Preço de venda (R$)</Label><input type="text" value={preco} onChange={e=>setPreco(e.target.value)} placeholder="0,00" style={inp}/></div>
            <div><Label>Custo padrão (R$)</Label><input type="text" value={custo} onChange={e=>setCusto(e.target.value)} placeholder="0,00" style={inp}/></div>
            {(parseFloat(preco)||0) > 0 && (
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",background:margem>30?"var(--success-soft)":"var(--warning-soft)",borderRadius:"6px",padding:"10px 14px" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"2px" }}>Margem calculada</div>
                  <div style={{ fontSize:"18px",fontWeight:800,color:margem>30?"var(--success)":"var(--warning)" }}>{Pct(margem)}</div>
                </div>
              </div>
            )}
            <div style={{ gridColumn:"1 / -1" }}><Label>Descrição</Label><input type="text" placeholder="Detalhes que aparecem nos lançamentos" style={inp}/></div>
          </div>
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Salvar item</button>
            <button onClick={()=>setShowForm(false)} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ position:"relative",marginBottom:"14px",maxWidth:"360px" }}>
        <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar produto ou serviço..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"8px",paddingBottom:"8px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
      </div>

      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Nome","Tipo","SKU","Unidade","Preço Venda","Custo","Margem","Categoria","Status",""].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:["Preço Venda","Custo","Margem"].includes(h)?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p,i)=>{
              const mg = p.preco>0 ? ((p.preco-p.custo)/p.preco*100) : 0
              return (
                <tr key={p.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"11px 14px",fontSize:"13px",fontWeight:600,color:"var(--text-primary)" }}>
                    {p.nome}
                    {p.obs && <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"1px" }}>{p.obs}</div>}
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:p.tipo==="servico"?"var(--purple)":"var(--accent)",background:p.tipo==="servico"?"var(--purple-soft)":"var(--accent-soft)",padding:"2px 8px",borderRadius:"20px" }}>
                      {p.tipo==="servico"?"Serviço":"Produto"}
                    </span>
                  </td>
                  <td style={{ padding:"11px 14px",fontSize:"11px",color:"var(--text-muted)" }}>{p.sku}</td>
                  <td style={{ padding:"11px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>{p.unidade}</td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--success)" }}>{p.preco>0?R(p.preco):"—"}</td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"12px",color:"var(--text-secondary)" }}>{p.custo>0?R(p.custo):"—"}</td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:mg>30?"var(--success)":mg>15?"var(--warning)":"var(--danger)" }}>
                    {p.preco>0?Pct(mg):"—"}
                  </td>
                  <td style={{ padding:"11px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>{p.categoria}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:600,color:"var(--success)",background:"var(--success-soft)",padding:"2px 8px",borderRadius:"20px" }}>Ativo</span>
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <button style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}><Edit2 size={12}/></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
