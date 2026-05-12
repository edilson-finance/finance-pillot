"use client"

import { useState } from "react"
import { Plus, Search, Edit2, ChevronLeft, X } from "lucide-react"
import Link from "next/link"

const R = (v:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:0}).format(v)

const suppliers = [
  { id:"1",nome:"Aço Nordeste Ltda",cnpj:"11.222.333/0001-44",tipo:"Produto",categoria:"Materiais",totalPago:284600,pendente:12400,status:"ativo",pix:"aconordeste@pix.com.br",prazo:30 },
  { id:"2",nome:"Cimento Forte Distribuidora",cnpj:"22.333.444/0001-55",tipo:"Produto",categoria:"Materiais",totalPago:142800,pendente:6800,status:"ativo",pix:"cimentoforte@pix.com.br",prazo:15 },
  { id:"3",nome:"Subempreiteiros Gerais",cnpj:"33.444.555/0001-66",tipo:"Serviço",categoria:"Subempreiteiros",totalPago:198400,pendente:0,status:"critico",pix:"",prazo:7 },
  { id:"4",nome:"Aluguel Imóvel SP Ltda",cnpj:"44.555.666/0001-77",tipo:"Serviço",categoria:"Aluguel",totalPago:100800,pendente:8400,status:"ativo",pix:"imovelsp@pix.com.br",prazo:5 },
  { id:"5",nome:"Vivo Telecom S.A.",cnpj:"02.449.992/0001-17",tipo:"Serviço",categoria:"Telecom",totalPago:10680,pendente:0,status:"ativo",pix:"",prazo:15 },
]

const stCfg: Record<string,any> = {
  ativo:  { label:"Ativo",  c:"var(--success)",bg:"var(--success-soft)" },
  critico:{ label:"Crítico",c:"var(--danger)", bg:"var(--danger-soft)" },
  inativo:{ label:"Inativo",c:"var(--text-muted)",bg:"var(--bg-tertiary)" },
}

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

function Label({ children }: { children:string }) {
  return <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

export default function SuppliersPage() {
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const filtered = suppliers.filter(s=>s.nome.toLowerCase().includes(q.toLowerCase()))

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Fornecedores</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Cadastro, dados bancários e histórico de pagamentos</p>
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Novo fornecedor
        </button>
      </div>

      {showForm && (
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Novo Fornecedor</span>
            <button onClick={()=>setShowForm(false)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><Label>Razão Social / Nome *</Label><input type="text" placeholder="Fornecedor Exemplo Ltda" style={inp}/></div>
            <div><Label>CPF / CNPJ *</Label><input type="text" placeholder="00.000.000/0001-00" style={inp}/></div>
            <div><Label>Tipo *</Label>
              <select style={inp}><option>Produto</option><option>Serviço</option><option>Ambos</option></select>
            </div>
            <div><Label>Categoria padrão</Label>
              <select style={inp}><option>Materiais</option><option>Subempreiteiros</option><option>Folha</option><option>Aluguel</option><option>Telecom</option></select>
            </div>
            <div><Label>Telefone</Label><input type="text" placeholder="(11) 99999-9999" style={inp}/></div>
            <div><Label>E-mail</Label><input type="email" placeholder="financeiro@fornecedor.com.br" style={inp}/></div>
            <div><Label>Prazo de pagamento (dias)</Label><input type="number" placeholder="30" style={inp}/></div>
            <div style={{ gridColumn:"span 3",borderTop:"1px solid var(--border)",paddingTop:"12px" }}>
              <div style={{ fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"10px" }}>Dados Bancários</div>
            </div>
            <div><Label>Banco</Label><input type="text" placeholder="Ex: Bradesco, Itaú" style={inp}/></div>
            <div><Label>Agência</Label><input type="text" placeholder="0000-0" style={inp}/></div>
            <div><Label>Conta</Label><input type="text" placeholder="00000-0" style={inp}/></div>
            <div><Label>Chave PIX</Label><input type="text" placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" style={inp}/></div>
            <div><Label>Tipo de conta</Label>
              <select style={inp}><option>Corrente</option><option>Poupança</option><option>Digital</option></select>
            </div>
            <div><Label>Status</Label>
              <select style={inp}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="critico">Crítico</option></select>
            </div>
            <div style={{ gridColumn:"1 / -1" }}><Label>Observações</Label><input type="text" placeholder="Condições comerciais, contatos adicionais..." style={inp}/></div>
          </div>
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Salvar fornecedor</button>
            <button onClick={()=>setShowForm(false)} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ position:"relative",marginBottom:"14px",maxWidth:"360px" }}>
        <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar fornecedor..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"8px",paddingBottom:"8px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
      </div>

      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Fornecedor","CNPJ","Tipo","Categoria","Total Pago","A Pagar","PIX","Status",""].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:["Total Pago","A Pagar"].includes(h)?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s,i)=>{
              const st = stCfg[s.status]
              return (
                <tr key={s.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"12px 14px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{s.nome}</td>
                  <td style={{ padding:"12px 14px",fontSize:"11px",color:"var(--text-secondary)" }}>{s.cnpj}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ fontSize:"11px",color:s.tipo==="Produto"?"var(--accent)":"var(--purple)",background:s.tipo==="Produto"?"var(--accent-soft)":"var(--purple-soft)",padding:"2px 8px",borderRadius:"20px",fontWeight:600 }}>{s.tipo}</span>
                  </td>
                  <td style={{ padding:"12px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>{s.categoria}</td>
                  <td style={{ padding:"12px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--danger)" }}>{R(s.totalPago)}</td>
                  <td style={{ padding:"12px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:s.pendente>0?"var(--warning)":"var(--text-muted)" }}>{s.pendente>0?R(s.pendente):"—"}</td>
                  <td style={{ padding:"12px 14px",fontSize:"11px",color:"var(--text-muted)",maxWidth:"130px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.pix||"—"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:st.c,background:st.bg,padding:"3px 9px",borderRadius:"20px" }}>{st.label}</span>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
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
