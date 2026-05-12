"use client"

import { useState } from "react"
import { ChevronRight, ChevronLeft, Plus, Edit2, Check, X, Search, Info } from "lucide-react"
import Link from "next/link"
import { planoDeConta, GRUPOS_DRE, type Conta, type ContaGrupo } from "@/lib/accounts-plan"

const NATUREZA_LABEL: Record<string,{ l:string; c:string }> = {
  receita: { l:"Receita",  c:"var(--success)" },
  custo:   { l:"Custo",    c:"var(--danger)"  },
  despesa: { l:"Despesa",  c:"#F87171"        },
  neutro:  { l:"Neutro",   c:"var(--text-muted)" },
}

const DRE_LABEL: Record<string,string> = {
  receita_bruta:       "Receita Bruta",
  deducoes:            "Deduções",
  lucro_bruto:         "Lucro Bruto",
  desp_operacional:    "Desp. Operacionais",
  ebitda:              "EBITDA (D&A)",
  resultado_financeiro:"Resultado Financeiro",
  lair:                "LAIR (IR/CSLL)",
  lucro_liquido:       "Lucro Líquido",
  nao_afeta:           "Não afeta DRE",
}

function ContaRow({ conta, depth=0, onEdit }: { conta: Conta; depth?: number; onEdit: (c:Conta)=>void }) {
  const [open, setOpen] = useState(depth===0)
  const n = NATUREZA_LABEL[conta.natureza]
  const hasChildren = (conta.filhos?.length ?? 0) > 0

  return (
    <>
      <tr
        onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
        style={{ borderBottom:"1px solid var(--border)" }}>
        <td style={{ padding:"9px 14px", paddingLeft:`${14+depth*24}px` }}>
          <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
            {hasChildren ? (
              <button onClick={()=>setOpen(o=>!o)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)",padding:0,display:"flex",flexShrink:0 }}>
                <ChevronRight size={13} style={{ transform:open?"rotate(90deg)":"none", transition:"transform 0.15s" }}/>
              </button>
            ) : <div style={{ width:"13px" }}/>}
            <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:conta.cor,flexShrink:0 }}/>
            <span style={{ fontSize:"12.5px",color:"var(--text-primary)",fontWeight:depth===0?700:400 }}>{conta.nome}</span>
            {conta.descricao && depth===0 && (
              <span title={conta.descricao} style={{ cursor:"help" }}><Info size={11} style={{ color:"var(--text-muted)" }}/></span>
            )}
          </div>
        </td>
        <td style={{ padding:"9px 10px", fontSize:"11px", color:"var(--text-muted)", fontFamily:"monospace", fontWeight:600 }}>
          {conta.codigo}
        </td>
        <td style={{ padding:"9px 10px" }}>
          <span style={{ fontSize:"11px",fontWeight:600,color:GRUPOS_DRE[conta.grupo]?.cor||"var(--text-muted)",background:`${GRUPOS_DRE[conta.grupo]?.cor||"#888"}18`,padding:"2px 8px",borderRadius:"20px" }}>
            {GRUPOS_DRE[conta.grupo]?.label || conta.grupo}
          </span>
        </td>
        <td style={{ padding:"9px 10px" }}>
          <span style={{ fontSize:"11px",fontWeight:600,color:n.c,background:`${n.c}18`,padding:"2px 8px",borderRadius:"20px" }}>{n.l}</span>
        </td>
        <td style={{ padding:"9px 10px", fontSize:"11px", color:"var(--text-secondary)" }}>
          {DRE_LABEL[conta.posicaoDRE]}
        </td>
        <td style={{ padding:"9px 10px", textAlign:"center" }}>
          <span style={{ fontSize:"11px",color:conta.afetaDRE?"var(--success)":"var(--text-muted)" }}>{conta.afetaDRE?"Sim":"Não"}</span>
        </td>
        <td style={{ padding:"9px 10px", textAlign:"center" }}>
          <span style={{ fontSize:"11px",color:conta.afetaCaixa?"var(--success)":"var(--text-muted)" }}>{conta.afetaCaixa?"Sim":"Não"}</span>
        </td>
        <td style={{ padding:"9px 10px", textAlign:"center" }}>
          <span style={{ fontSize:"11px",fontWeight:600,color:conta.ativa?"var(--success)":"var(--text-muted)",background:conta.ativa?"var(--success-soft)":"var(--bg-tertiary)",padding:"2px 8px",borderRadius:"20px" }}>
            {conta.ativa?"Ativa":"Inativa"}
          </span>
        </td>
        <td style={{ padding:"9px 10px" }}>
          <button onClick={()=>onEdit(conta)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
            <Edit2 size={11}/>
          </button>
        </td>
      </tr>
      {open && conta.filhos?.map(f=><ContaRow key={f.codigo} conta={f} depth={depth+1} onEdit={onEdit}/>)}
    </>
  )
}

function EditModal({ conta, onClose }: { conta:Conta; onClose:()=>void }) {
  const inp: React.CSSProperties = { width:"100%",padding:"9px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }} onClick={onClose}>
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"24px",width:"100%",maxWidth:"500px",boxShadow:"var(--shadow-lg)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px" }}>
          <div>
            <div style={{ fontSize:"14px",fontWeight:800,color:"var(--text-primary)" }}>Editar Conta</div>
            <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{conta.codigo} — {conta.nome}</div>
          </div>
          <button onClick={onClose} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={18}/></button>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
          <div style={{ gridColumn:"span 2" }}>
            <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Nome da Conta *</label>
            <input defaultValue={conta.nome} style={inp}/>
          </div>
          <div>
            <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Grupo</label>
            <select defaultValue={conta.grupo} style={inp}>
              {Object.entries(GRUPOS_DRE).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Posição no DRE</label>
            <select defaultValue={conta.posicaoDRE} style={inp}>
              {Object.entries(DRE_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Cor</label>
            <div style={{ display:"flex",flexWrap:"wrap",gap:"5px" }}>
              {["#10B981","#EF4444","#8B5CF6","#F59E0B","#3B82F6","#EC4899","#6B7280","#4F46E5","#34D399","#F87171"].map(c=>(
                <div key={c} onClick={()=>{}} style={{ width:"24px",height:"24px",borderRadius:"5px",background:c,cursor:"pointer",border:c===conta.cor?"2px solid var(--text-primary)":"2px solid transparent" }}/>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Status</label>
            <select defaultValue={conta.ativa?"ativa":"inativa"} style={inp}>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
            </select>
          </div>
          <div style={{ gridColumn:"span 2" }}>
            <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Descrição</label>
            <input defaultValue={conta.descricao||""} placeholder="Opcional — aparece como dica nos lançamentos" style={inp}/>
          </div>
          <div style={{ gridColumn:"span 2",display:"flex",gap:"16px" }}>
            <label style={{ display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
              <input type="checkbox" defaultChecked={conta.afetaDRE} style={{ width:"14px",height:"14px" }}/> Afeta DRE
            </label>
            <label style={{ display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
              <input type="checkbox" defaultChecked={conta.afetaCaixa} style={{ width:"14px",height:"14px" }}/> Afeta Fluxo de Caixa
            </label>
          </div>
        </div>

        <div style={{ display:"flex",gap:"8px",marginTop:"18px",paddingTop:"16px",borderTop:"1px solid var(--border)" }}>
          <button onClick={onClose} style={{ flex:1,padding:"10px",background:"var(--accent)",border:"none",borderRadius:"7px",fontSize:"13px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px" }}>
            <Check size={14}/> Salvar alteração
          </button>
          <button onClick={onClose} style={{ padding:"10px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"7px",fontSize:"13px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AccountsPlanPage() {
  const [q, setQ] = useState("")
  const [filterGrupo, setFilterGrupo] = useState("todos")
  const [editConta, setEditConta] = useState<Conta|null>(null)
  const [showForm, setShowForm] = useState(false)

  const filtered = planoDeConta.filter(c => {
    if (filterGrupo !== "todos" && c.grupo !== filterGrupo) return false
    if (q && !c.nome.toLowerCase().includes(q.toLowerCase()) && !c.codigo.includes(q)) return false
    return true
  })

  const totalContas = planoDeConta.reduce((s,c) => s + 1 + (c.filhos?.length||0), 0)

  return (
    <div style={{ padding:"22px" }}>
      {editConta && <EditModal conta={editConta} onClose={()=>setEditConta(null)}/>}

      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Plano de Contas</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>
            Padrão NBC TG / CPC para PMEs brasileiras · {totalContas} contas · Editável
          </p>
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Nova conta
        </button>
      </div>

      {/* Info banner */}
      <div style={{ padding:"12px 16px",background:"var(--accent-soft)",border:"1px solid rgba(79,70,229,0.25)",borderRadius:"var(--radius)",marginBottom:"16px",display:"flex",alignItems:"flex-start",gap:"10px" }}>
        <Info size={14} style={{ color:"var(--accent)",flexShrink:0,marginTop:"1px" }}/>
        <div style={{ fontSize:"12px",color:"var(--accent)",lineHeight:1.6 }}>
          <strong>Plano de Contas padrão</strong> seguindo as normas NBC TG, CPC e Resolução CFC 1.055/05.
          As contas marcadas como <strong>"Afeta DRE"</strong> aparecem automaticamente no Demonstrativo de Resultado.
          Contas <strong>"Não afeta DRE"</strong> (investimentos, empréstimos, transferências) só impactam o fluxo de caixa.
        </div>
      </div>

      {/* Formulário nova conta */}
      {showForm && (
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"14px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Nova Conta</span>
            <button onClick={()=>setShowForm(false)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            {[
              { l:"Código *", ph:"Ex: 5.2.11" },
              { l:"Nome da Conta *", ph:"Ex: Despesas com Combustível" },
            ].map(f=>(
              <div key={f.l} style={{ gridColumn:f.l.includes("Nome")?"span 2":"span 1" }}>
                <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{f.l}</label>
                <input type="text" placeholder={f.ph} style={{ width:"100%",padding:"9px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
              </div>
            ))}
            <div>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Grupo *</label>
              <select style={{ width:"100%",padding:"9px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}>
                {Object.entries(GRUPOS_DRE).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Conta Pai</label>
              <select style={{ width:"100%",padding:"9px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}>
                <option value="">Nenhuma (conta raiz)</option>
                {planoDeConta.map(c=><option key={c.codigo}>{c.codigo} — {c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Posição DRE</label>
              <select style={{ width:"100%",padding:"9px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}>
                {Object.entries(DRE_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"flex",gap:"8px",marginTop:"14px" }}>
            <button style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Salvar conta</button>
            <button onClick={()=>setShowForm(false)} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"12px 14px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap" }}>
        <div style={{ position:"relative",flex:1,maxWidth:"280px" }}>
          <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por código ou nome..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"7px",paddingBottom:"7px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
        </div>
        <div style={{ display:"flex",gap:"4px",flexWrap:"wrap" }}>
          <button onClick={()=>setFilterGrupo("todos")} style={{ padding:"5px 12px",borderRadius:"6px",border:"1px solid",borderColor:filterGrupo==="todos"?"var(--accent)":"var(--border)",background:filterGrupo==="todos"?"var(--accent-soft)":"transparent",color:filterGrupo==="todos"?"var(--accent)":"var(--text-secondary)",fontSize:"11.5px",fontWeight:filterGrupo==="todos"?700:400,cursor:"pointer",fontFamily:"inherit" }}>
            Todas
          </button>
          {["receita_bruta","cst_servicos","desp_pessoal","desp_administrativa","desp_comercial","desp_financeira"].map(g=>(
            <button key={g} onClick={()=>setFilterGrupo(filterGrupo===g?"todos":g)} style={{ padding:"5px 12px",borderRadius:"6px",border:"1px solid",borderColor:filterGrupo===g?GRUPOS_DRE[g as ContaGrupo].cor:"var(--border)",background:filterGrupo===g?`${GRUPOS_DRE[g as ContaGrupo].cor}18`:"transparent",color:filterGrupo===g?GRUPOS_DRE[g as ContaGrupo].cor:"var(--text-secondary)",fontSize:"11.5px",fontWeight:filterGrupo===g?700:400,cursor:"pointer",fontFamily:"inherit" }}>
              {GRUPOS_DRE[g as ContaGrupo].label.split(" ")[0]}...
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Conta / Subconta","Código","Grupo","Natureza","Posição DRE","Afeta DRE","Afeta Caixa","Status",""].map(h=>(
                <th key={h} style={{ padding:"10px 10px",textAlign:["Afeta DRE","Afeta Caixa","Status"].includes(h)?"center":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=><ContaRow key={c.codigo} conta={c} onEdit={setEditConta}/>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
