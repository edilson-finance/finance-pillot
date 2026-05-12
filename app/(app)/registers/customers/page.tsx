"use client"

import { useState } from "react"
import { Plus, Search, Edit2, Eye, MessageSquare, ChevronLeft, X } from "lucide-react"
import Link from "next/link"

const R = (v:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:0}).format(v)

const customers = [
  { id:"1",nome:"Construtora Beta Ltda",cnpj:"12.345.678/0001-90",segmento:"Construção Civil",telefone:"(11) 98765-4321",email:"financeiro@construtora-beta.com.br",totalFaturado:580000,totalAtraso:178700,status:"inadimplente",prazo:30,ticket:96666 },
  { id:"2",nome:"J. Silva Empreendimentos",cnpj:"98.765.432/0001-10",segmento:"Incorporação",telefone:"(11) 91234-5678",email:"jose@jsilva.com.br",totalFaturado:294000,totalAtraso:0,status:"ativo",prazo:15,ticket:42000 },
  { id:"3",nome:"Grupo Horizonte S.A.",cnpj:"34.567.890/0001-12",segmento:"Real Estate",telefone:"(11) 94567-8901",email:"compras@grupohorizonte.com.br",totalFaturado:168000,totalAtraso:0,status:"estrategico",prazo:30,ticket:42000 },
  { id:"4",nome:"RJ Incorporadora Ltda",cnpj:"56.789.012/0001-34",segmento:"Incorporação",telefone:"(21) 93456-7890",email:"financeiro@rjinc.com.br",totalFaturado:42000,totalAtraso:14000,status:"inadimplente",prazo:45,ticket:14000 },
]

const stCfg: Record<string,any> = {
  ativo:       { label:"Ativo",       c:"var(--success)", bg:"var(--success-soft)" },
  inadimplente:{ label:"Inadimplente",c:"var(--danger)",  bg:"var(--danger-soft)" },
  estrategico: { label:"Estratégico", c:"var(--purple)",  bg:"var(--purple-soft)" },
  inativo:     { label:"Inativo",     c:"var(--text-muted)",bg:"var(--bg-tertiary)" },
}

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

function Label({ children }: { children:string }) {
  return <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

export default function CustomersPage() {
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const filtered = customers.filter(c=>c.nome.toLowerCase().includes(q.toLowerCase())||c.cnpj.includes(q))

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Clientes</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Cadastro, histórico e indicadores por cliente</p>
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Novo cliente
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"16px" }}>
        {[
          { l:"Total Clientes",    v:"12",      c:"var(--accent)" },
          { l:"Total Faturado",    v:R(1084000),c:"var(--success)" },
          { l:"Em Atraso",         v:R(192700), c:"var(--danger)" },
          { l:"Taxa Inadimplência",v:"17,8%",   c:"var(--danger)" },
        ].map(k=>(
          <div key={k.l} style={{ background:"var(--bg-secondary)",border:`1px solid ${k.c}28`,borderLeft:`3px solid ${k.c}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Novo Cliente</span>
            <button onClick={()=>setShowForm(false)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><Label>Razão Social / Nome *</Label><input type="text" placeholder="Construtora Exemplo Ltda" style={inp}/></div>
            <div><Label>CPF / CNPJ *</Label><input type="text" placeholder="00.000.000/0001-00" style={inp}/></div>
            <div><Label>Nome Fantasia</Label><input type="text" placeholder="Exemplo Construtora" style={inp}/></div>
            <div><Label>Segmento</Label><input type="text" placeholder="Construção Civil, Incorporação..." style={inp}/></div>
            <div><Label>Telefone</Label><input type="text" placeholder="(11) 99999-9999" style={inp}/></div>
            <div><Label>WhatsApp</Label><input type="text" placeholder="(11) 99999-9999" style={inp}/></div>
            <div><Label>E-mail</Label><input type="email" placeholder="financeiro@empresa.com.br" style={inp}/></div>
            <div><Label>CEP</Label><input type="text" placeholder="00000-000" style={inp}/></div>
            <div style={{ gridColumn:"span 2" }}><Label>Endereço completo</Label><input type="text" placeholder="Rua, número, complemento, bairro" style={inp}/></div>
            <div><Label>Cidade / UF</Label><input type="text" placeholder="São Paulo / SP" style={inp}/></div>
            <div><Label>Prazo de pagamento (dias)</Label><input type="number" placeholder="30" style={inp}/></div>
            <div><Label>Limite de crédito (R$)</Label><input type="number" placeholder="0" style={inp}/></div>
            <div><Label>Status</Label>
              <select style={inp}>
                <option value="ativo">Ativo</option>
                <option value="estrategico">Estratégico</option>
                <option value="inativo">Inativo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </div>
            <div style={{ gridColumn:"1 / -1" }}><Label>Observações</Label><input type="text" placeholder="Condições especiais, histórico..." style={inp}/></div>
          </div>
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Salvar cliente</button>
            <button onClick={()=>setShowForm(false)} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position:"relative",marginBottom:"14px",maxWidth:"360px" }}>
        <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nome ou CNPJ..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"8px",paddingBottom:"8px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
      </div>

      {/* Table */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Cliente","CNPJ","Segmento","Contato","Total Faturado","Em Atraso","Prazo","Status","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:["Total Faturado","Em Atraso"].includes(h)?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c,i)=>{
              const sc = stCfg[c.status]
              return (
                <tr key={c.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"12px 14px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{c.nome}</td>
                  <td style={{ padding:"12px 14px",fontSize:"11px",color:"var(--text-secondary)" }}>{c.cnpj}</td>
                  <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>{c.segmento}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:"11px",color:"var(--text-secondary)" }}>{c.email}</div>
                    <div style={{ fontSize:"10px",color:"var(--text-muted)" }}>{c.telefone}</div>
                  </td>
                  <td style={{ padding:"12px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--success)" }}>{R(c.totalFaturado)}</td>
                  <td style={{ padding:"12px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:c.totalAtraso>0?"var(--danger)":"var(--text-muted)" }}>
                    {c.totalAtraso>0?R(c.totalAtraso):"—"}
                  </td>
                  <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-secondary)",textAlign:"center" }}>{c.prazo}d</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:sc.c,background:sc.bg,padding:"3px 9px",borderRadius:"20px" }}>{sc.label}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex",gap:"5px" }}>
                      <button title="Histórico" style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}><Eye size={12}/></button>
                      {c.totalAtraso>0 && <button title="Cobrar" style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--warning-soft)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--warning)" }}><MessageSquare size={12}/></button>}
                      <button title="Editar" style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}><Edit2 size={12}/></button>
                    </div>
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
