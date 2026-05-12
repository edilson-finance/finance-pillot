"use client"

import { useState } from "react"
import { Plus, Edit2, RefreshCw, ChevronLeft, X } from "lucide-react"
import Link from "next/link"

const R = (v:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:0}).format(v)

const accounts = [
  { id:"1",nome:"Bradesco Conta Corrente",tipo:"corrente",banco:"Bradesco",agencia:"1234-5",conta:"98765-0",saldo:198400,pix:"12345678901",ativo:true },
  { id:"2",nome:"Itaú Conta Corrente",tipo:"corrente",banco:"Itaú",agencia:"5678-9",conta:"12345-1",saldo:62800,pix:"98765432109",ativo:true },
  { id:"3",nome:"Nubank PJ",tipo:"digital",banco:"Nubank",agencia:"0001",conta:"87654-3",saldo:23550,pix:"nubank@empresa.com.br",ativo:true },
  { id:"4",nome:"Caixa Físico",tipo:"caixa",banco:"—",agencia:"—",conta:"—",saldo:4200,pix:"—",ativo:true },
]

const tipoLabels: Record<string,string> = { corrente:"Conta Corrente",digital:"Conta Digital",caixa:"Caixa Físico",poupanca:"Poupança",cartao_credito:"Cartão de Crédito",investimento:"Investimento",maquininha:"Maquininha" }
const tipoColors: Record<string,string> = { corrente:"var(--accent)",digital:"var(--success)",caixa:"var(--warning)",poupanca:"var(--info)",cartao_credito:"var(--purple)",investimento:"var(--success)",maquininha:"var(--warning)" }
const total = accounts.reduce((s,a)=>s+a.saldo,0)

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }
function Label({ children }: { children:string }) {
  return <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

export default function AccountsPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Contas Bancárias</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Contas correntes, digitais, poupança, cartões e caixas</p>
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Nova conta
        </button>
      </div>

      {/* Saldo consolidado */}
      <div style={{ background:"linear-gradient(135deg,rgba(79,70,229,0.14),rgba(139,92,246,0.09))",border:"1px solid rgba(79,70,229,0.3)",borderRadius:"var(--radius)",padding:"20px 24px",marginBottom:"16px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:"6px" }}>Saldo Consolidado — Todas as Contas</div>
          <div style={{ fontSize:"30px",fontWeight:900,color:"var(--text-primary)",letterSpacing:"-1px" }}>{R(total)}</div>
        </div>
        <button style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"11px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
          <RefreshCw size={12}/> Atualizar saldos
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Nova Conta Bancária</span>
            <button onClick={()=>setShowForm(false)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><Label>Nome interno *</Label><input type="text" placeholder='Ex: "Bradesco Principal", "Caixa Escritório"' style={inp}/></div>
            <div><Label>Tipo de Conta *</Label>
              <select style={inp}>{Object.entries(tipoLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
            </div>
            <div><Label>Banco / Instituição</Label><input type="text" placeholder="Bradesco, Itaú, Nubank..." style={inp}/></div>
            <div><Label>Agência</Label><input type="text" placeholder="0000-0" style={inp}/></div>
            <div><Label>Conta</Label><input type="text" placeholder="00000-0" style={inp}/></div>
            <div><Label>Chave PIX</Label><input type="text" placeholder="CPF, CNPJ, e-mail, aleatória" style={inp}/></div>
            <div><Label>Saldo inicial (R$) *</Label><input type="number" placeholder="0,00" style={inp}/></div>
            <div><Label>Data do saldo inicial *</Label><input type="date" defaultValue="2026-05-01" style={inp}/></div>
            <div style={{ gridColumn:"span 3",padding:"12px",background:"var(--bg-tertiary)",borderRadius:"6px",display:"flex",gap:"20px" }}>
              <label style={{ display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
                <input type="checkbox" defaultChecked style={{ width:"14px",height:"14px" }}/> Conta ativa
              </label>
              <label style={{ display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
                <input type="checkbox" style={{ width:"14px",height:"14px" }}/> É cartão de crédito
              </label>
            </div>
            <div><Label>Responsável</Label><input type="text" placeholder="Nome do responsável" style={inp}/></div>
            <div style={{ gridColumn:"span 2" }}><Label>Observações</Label><input type="text" placeholder="Informações adicionais" style={inp}/></div>
          </div>
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Salvar conta</button>
            <button onClick={()=>setShowForm(false)} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"12px" }}>
        {accounts.map(a=>(
          <div key={a.id} style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
            <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"14px" }}>
              <div>
                <div style={{ fontSize:"14px",fontWeight:800,color:"var(--text-primary)" }}>{a.nome}</div>
                <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>{a.banco} · Ag {a.agencia} · Conta {a.conta}</div>
              </div>
              <span style={{ fontSize:"10px",fontWeight:700,color:tipoColors[a.tipo],background:`${tipoColors[a.tipo]}20`,padding:"3px 9px",borderRadius:"20px" }}>
                {tipoLabels[a.tipo]}
              </span>
            </div>
            <div style={{ fontSize:"24px",fontWeight:900,color:"var(--text-primary)",marginBottom:"8px" }}>{R(a.saldo)}</div>
            <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
              {a.pix!=="—" && <div style={{ fontSize:"10px",color:"var(--text-muted)" }}>PIX: <span style={{ color:"var(--text-secondary)" }}>{a.pix}</span></div>}
              <button style={{ marginLeft:"auto",width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
                <Edit2 size={12}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
