"use client"

import { useState } from "react"
import { ChevronRight, Edit2, Plus, X, Check, ChevronLeft } from "lucide-react"
import Link from "next/link"

/* ── Paleta completa de 24 cores ── */
const COLOR_PALETTE = [
  "#10B981","#059669","#34D399","#6EE7B7",
  "#3B82F6","#2563EB","#60A5FA","#93C5FD",
  "#8B5CF6","#7C3AED","#A78BFA","#C4B5FD",
  "#F59E0B","#D97706","#FCD34D","#FDE68A",
  "#EF4444","#DC2626","#F87171","#FCA5A5",
  "#06B6D4","#0891B2","#EC4899","#6B7280",
]

/* ── Grupos contábeis padrão (Plano de Contas NBC TG / CFC) ── */
const GRUPOS = [
  { key:"receita_bruta",       label:"Receita Bruta",             tipo:"receita",   cor:"#10B981", afetaDRE:true,  afetaCaixa:true,  desc:"Faturamento de obras, contratos e serviços" },
  { key:"deducoes",            label:"Deduções da Receita",       tipo:"deducao",   cor:"#F59E0B", afetaDRE:true,  afetaCaixa:false, desc:"Impostos sobre vendas, devoluções, descontos concedidos" },
  { key:"custo_variavel",      label:"Custo das Mercadorias/Serv.",tipo:"custo",     cor:"#EF4444", afetaDRE:true,  afetaCaixa:true,  desc:"Materiais, subempreiteiros, mão de obra direta" },
  { key:"despesa_comercial",   label:"Despesas Comerciais",       tipo:"despesa",   cor:"#F87171", afetaDRE:true,  afetaCaixa:true,  desc:"Comissões, marketing, representação comercial" },
  { key:"despesa_adm",         label:"Despesas Administrativas",  tipo:"despesa",   cor:"#8B5CF6", afetaDRE:true,  afetaCaixa:true,  desc:"Aluguel, folha adm, telecom, material escritório" },
  { key:"despesa_financeira",  label:"Despesas Financeiras",      tipo:"despesa",   cor:"#7C3AED", afetaDRE:true,  afetaCaixa:true,  desc:"Juros, IOF, tarifas bancárias, multas" },
  { key:"outras_receitas",     label:"Outras Receitas Operac.",   tipo:"receita",   cor:"#34D399", afetaDRE:true,  afetaCaixa:true,  desc:"Aluguéis recebidos, juros ativos, recuperações" },
  { key:"investimento",        label:"Investimentos/Imobilizado",  tipo:"neutro",   cor:"#60A5FA", afetaDRE:false, afetaCaixa:true,  desc:"Compra de equipamentos, veículos, reformas" },
  { key:"emprestimo",          label:"Empréstimos e Financiam.",  tipo:"neutro",    cor:"#FCD34D", afetaDRE:false, afetaCaixa:true,  desc:"Captação e amortização de empréstimos (principal)" },
  { key:"socio",               label:"Movimentação de Sócios",    tipo:"neutro",    cor:"#EC4899", afetaDRE:false, afetaCaixa:true,  desc:"Aporte e retirada de capital dos sócios" },
  { key:"transferencia",       label:"Transferências Internas",   tipo:"neutro",    cor:"#6B7280", afetaDRE:false, afetaCaixa:false, desc:"Movimentação entre contas da empresa" },
]

const TIPO_LABELS: Record<string,{ l:string; c:string }> = {
  receita:{ l:"Receita",  c:"var(--success)" },
  deducao:{ l:"Dedução",  c:"var(--warning)" },
  custo:  { l:"Custo",    c:"var(--danger)"  },
  despesa:{ l:"Despesa",  c:"#F87171"        },
  neutro: { l:"Neutro",   c:"var(--text-muted)" },
}

const catsMock = [
  { id:"c1",grupo:"receita_bruta",   nome:"Receita de Obras",          cor:"#10B981", filhos:[
    { id:"c1a",grupo:"receita_bruta",nome:"Medições mensais",          cor:"#34D399", filhos:[] },
    { id:"c1b",grupo:"receita_bruta",nome:"Obra 07 — Construtora Beta",cor:"#10B981", filhos:[] },
  ]},
  { id:"c2",grupo:"receita_bruta",   nome:"Contratos Mensais",         cor:"#06B6D4", filhos:[] },
  { id:"c3",grupo:"custo_variavel",  nome:"Materiais e Insumos",       cor:"#EF4444", filhos:[
    { id:"c3a",grupo:"custo_variavel",nome:"Aço e Ferragens",           cor:"#F87171", filhos:[] },
    { id:"c3b",grupo:"custo_variavel",nome:"Cimento e Concreto",        cor:"#EF4444", filhos:[] },
  ]},
  { id:"c4",grupo:"custo_variavel",  nome:"Subempreiteiros",           cor:"#F59E0B", filhos:[] },
  { id:"c5",grupo:"despesa_adm",     nome:"Folha de Pagamento",        cor:"#8B5CF6", filhos:[] },
  { id:"c6",grupo:"despesa_adm",     nome:"Aluguel e Locações",        cor:"#8B5CF6", filhos:[] },
  { id:"c7",grupo:"despesa_financeira",nome:"Juros e IOF",             cor:"#7C3AED", filhos:[] },
  { id:"c8",grupo:"socio",           nome:"Retirada de Sócios",        cor:"#EC4899", filhos:[] },
]

type CatMock = typeof catsMock[0]

const inp: React.CSSProperties = {
  width:"100%", padding:"8px 11px",
  background:"var(--bg-tertiary)", border:"1px solid var(--border)",
  borderRadius:"6px", fontSize:"12.5px", color:"var(--text-primary)",
  outline:"none", fontFamily:"inherit",
}

function ColorPicker({ selected, onChange }: { selected:string; onChange:(c:string)=>void }) {
  return (
    <div style={{ display:"flex",flexWrap:"wrap",gap:"5px" }}>
      {COLOR_PALETTE.map(c=>(
        <button key={c} onClick={()=>onChange(c)} style={{
          width:"24px",height:"24px",borderRadius:"5px",background:c,cursor:"pointer",
          border:selected===c?"2px solid var(--text-primary)":"2px solid transparent",
          outline:selected===c?"2px solid var(--accent)":"none",outlineOffset:"1px",
          flexShrink:0,
        }}/>
      ))}
    </div>
  )
}

function CatRow({ cat, depth=0 }: { cat:CatMock; depth?:number }) {
  const [open, setOpen] = useState(depth===0)
  const grupo = GRUPOS.find(g=>g.key===cat.grupo)
  const tipo = grupo ? TIPO_LABELS[grupo.tipo] : TIPO_LABELS.neutro

  return (
    <>
      <tr
        onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
        style={{ borderBottom:"1px solid var(--border)" }}>
        <td style={{ padding:"10px 16px",paddingLeft:`${16+depth*24}px` }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
            {cat.filhos.length>0 ? (
              <button onClick={()=>setOpen(o=>!o)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)",padding:0,display:"flex" }}>
                <ChevronRight size={13} style={{ transform:open?"rotate(90deg)":"none",transition:"transform 0.15s" }}/>
              </button>
            ) : <div style={{ width:"13px" }}/>}
            <div style={{ width:"11px",height:"11px",borderRadius:"3px",background:cat.cor,flexShrink:0 }}/>
            <span style={{ fontSize:"12.5px",color:"var(--text-primary)",fontWeight:depth===0?600:400 }}>{cat.nome}</span>
          </div>
        </td>
        <td style={{ padding:"10px 14px",fontSize:"11px",color:"var(--text-muted)" }}>
          {grupo?.label ?? "—"}
        </td>
        <td style={{ padding:"10px 14px" }}>
          <span style={{ fontSize:"11px",fontWeight:700,color:tipo.c,background:`${tipo.c}18`,padding:"2px 8px",borderRadius:"20px" }}>
            {tipo.l}
          </span>
        </td>
        <td style={{ padding:"10px 14px",textAlign:"center" }}>
          <span style={{ fontSize:"11px",color:grupo?.afetaDRE?"var(--success)":"var(--text-muted)" }}>{grupo?.afetaDRE?"Sim":"Não"}</span>
        </td>
        <td style={{ padding:"10px 14px",textAlign:"center" }}>
          <span style={{ fontSize:"11px",color:grupo?.afetaCaixa?"var(--success)":"var(--text-muted)" }}>{grupo?.afetaCaixa?"Sim":"Não"}</span>
        </td>
        <td style={{ padding:"10px 14px" }}>
          <span style={{ fontSize:"11px",fontWeight:600,color:"var(--success)",background:"var(--success-soft)",padding:"2px 8px",borderRadius:"20px" }}>Ativa</span>
        </td>
        <td style={{ padding:"10px 14px" }}>
          <button style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
            <Edit2 size={12}/>
          </button>
        </td>
      </tr>
      {open && cat.filhos.map(f=><CatRow key={f.id} cat={f as any} depth={depth+1}/>)}
    </>
  )
}

export default function CategoriesPage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedCor, setSelectedCor] = useState("#10B981")
  const [selectedGrupo, setSelectedGrupo] = useState(GRUPOS[0].key)
  const [filterGrupo, setFilterGrupo] = useState("todos")

  const filtered = filterGrupo==="todos" ? catsMock : catsMock.filter(c=>c.grupo===filterGrupo||c.grupo.startsWith(filterGrupo))

  return (
    <div style={{ padding:"22px" }}>
      {/* Header com voltar */}
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Categorias</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Plano de contas gerencial — baseado nas normas NBC TG e CFC</p>
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Nova categoria
        </button>
      </div>

      {/* Grupos de referência */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"16px" }}>
        {GRUPOS.slice(0,8).map(g=>(
          <button key={g.key} onClick={()=>setFilterGrupo(filterGrupo===g.key?"todos":g.key)} style={{
            padding:"10px 12px",borderRadius:"var(--radius-sm)",
            border:`1px solid ${filterGrupo===g.key?g.cor:"var(--border)"}`,
            background:filterGrupo===g.key?`${g.cor}18`:"var(--bg-secondary)",
            cursor:"pointer",textAlign:"left",fontFamily:"inherit",
          }}>
            <div style={{ display:"flex",alignItems:"center",gap:"6px",marginBottom:"3px" }}>
              <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:g.cor,flexShrink:0 }}/>
              <span style={{ fontSize:"11px",fontWeight:700,color:filterGrupo===g.key?g.cor:"var(--text-primary)" }}>{g.label}</span>
            </div>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",lineHeight:1.4 }}>{g.desc}</div>
          </button>
        ))}
      </div>

      {/* Formulário nova categoria */}
      {showForm && (
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Nova Categoria</span>
            <button onClick={()=>setShowForm(false)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px" }}>
            <div>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Nome *</label>
              <input type="text" placeholder="Ex: Materiais de construção" style={inp}/>
            </div>
            <div>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Grupo Contábil *</label>
              <select style={inp} value={selectedGrupo} onChange={e=>setSelectedGrupo(e.target.value)}>
                {GRUPOS.map(g=><option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Subcategoria de</label>
              <select style={inp}>
                <option value="">Nenhuma (categoria raiz)</option>
                {catsMock.filter(c=>c.grupo===selectedGrupo).map(c=><option key={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Descrição</label>
              <input type="text" placeholder="Opcional — aparece em relatórios" style={inp}/>
            </div>
            <div style={{ gridColumn:"1 / -1" }}>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"7px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Cor de identificação</label>
              <ColorPicker selected={selectedCor} onChange={setSelectedCor}/>
              <div style={{ display:"flex",alignItems:"center",gap:"8px",marginTop:"8px" }}>
                <div style={{ width:"16px",height:"16px",borderRadius:"4px",background:selectedCor }}/>
                <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>Cor selecionada: {selectedCor}</span>
              </div>
            </div>
            <div style={{ gridColumn:"1 / -1",display:"flex",gap:"8px",alignItems:"center" }}>
              <label style={{ display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
                <input type="checkbox" defaultChecked style={{ width:"14px",height:"14px" }}/> Impacta DRE
              </label>
              <label style={{ display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
                <input type="checkbox" defaultChecked style={{ width:"14px",height:"14px" }}/> Impacta Fluxo de Caixa
              </label>
            </div>
          </div>
          <div style={{ display:"flex",gap:"8px",marginTop:"16px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Salvar categoria</button>
            <button onClick={()=>setShowForm(false)} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Legenda de grupos */}
      <div style={{ display:"flex",gap:"12px",flexWrap:"wrap",marginBottom:"12px",padding:"10px 14px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)" }}>
        <span style={{ fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginRight:"4px" }}>Impacto:</span>
        <span style={{ fontSize:"11px",color:"var(--success)" }}>DRE + Caixa</span>
        <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>·</span>
        <span style={{ fontSize:"11px",color:"var(--warning)" }}>Só DRE</span>
        <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>·</span>
        <span style={{ fontSize:"11px",color:"var(--accent)" }}>Só Caixa</span>
        <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>·</span>
        <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>Neutro</span>
      </div>

      {/* Tabela */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Categoria","Grupo Contábil","Tipo","Impacta DRE","Impacta Caixa","Status",""].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:["Impacta DRE","Impacta Caixa","Status"].includes(h)?"center":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=><CatRow key={c.id} cat={c}/>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
