"use client"

import { useState } from "react"
import { Plus, Edit2, ChevronLeft, X } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

const centers = [
  { id:"1", nome:"Obra 07 — Construtora Beta", tipo:"obra",       resp:"Carlos Souza", inicio:"2025-08-01", fim:"2026-09-30", orcamento:820000, realizado:384600, status:"ativo" },
  { id:"2", nome:"Obra 09 — J. Silva Empreen.",tipo:"obra",       resp:"Carlos Souza", inicio:"2025-10-01", fim:"2026-12-31", orcamento:580000, realizado:198000, status:"ativo" },
  { id:"3", nome:"Administrativo",             tipo:"departamento",resp:"Edils S.",    inicio:"2026-01-01", fim:null,          orcamento:55000,  realizado:48400,  status:"ativo" },
  { id:"4", nome:"Comercial",                  tipo:"departamento",resp:"Ana Lima",    inicio:"2026-01-01", fim:null,          orcamento:18000,  realizado:14200,  status:"ativo" },
  { id:"5", nome:"Obra 05 — Concluída",        tipo:"obra",       resp:"Carlos Souza", inicio:"2024-03-01", fim:"2025-11-30",  orcamento:420000, realizado:418200, status:"concluido" },
]

const tipoColors: Record<string,string> = { obra:"var(--accent)",departamento:"var(--purple)",projeto:"var(--success)",filial:"var(--warning)",equipe:"var(--info)" }
const tipoLabels: Record<string,string> = { obra:"Obra",departamento:"Departamento",projeto:"Projeto",filial:"Filial",equipe:"Equipe" }
const stCfg: Record<string,any> = {
  ativo:     { l:"Ativo",    c:"var(--success)", bg:"var(--success-soft)" },
  concluido: { l:"Concluído",c:"var(--text-muted)",bg:"var(--bg-tertiary)" },
  pausado:   { l:"Pausado",  c:"var(--warning)", bg:"var(--warning-soft)" },
}

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }

export default function CostCentersPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <Link href="/registers" style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-secondary)",textDecoration:"none" }}>
          <ChevronLeft size={16}/>
        </Link>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Centros de Custo</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Obras, projetos, departamentos e filiais</p>
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Novo centro
        </button>
      </div>

      {showForm && (
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"14px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Novo Centro de Custo</span>
            <button onClick={()=>setShowForm(false)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Nome *</label><input type="text" placeholder="Ex: Obra 10 — Incorporadora Sul" style={inp}/></div>
            <div><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Tipo *</label><select style={inp}>{Object.entries(tipoLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
            <div><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Responsável</label><input type="text" placeholder="Nome do responsável" style={inp}/></div>
            <div><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Data de Início *</label><input type="date" style={inp}/></div>
            <div><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Data de Conclusão</label><input type="date" style={inp}/></div>
            <div style={{ gridColumn:"span 2" }}><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Orçamento Total (R$)</label><input type="number" placeholder="0,00" style={inp}/></div>
            <div><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Status</label><select style={inp}><option value="ativo">Ativo</option><option value="pausado">Pausado</option></select></div>
            <div style={{ gridColumn:"1 / -1" }}><label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Observações</label><input type="text" placeholder="Descrição do projeto ou obra" style={inp}/></div>
          </div>
          <div style={{ display:"flex",gap:"8px",marginTop:"14px" }}>
            <button style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Salvar</button>
            <button onClick={()=>setShowForm(false)} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
        {centers.map(c=>{
          const pct = Math.round((c.realizado/c.orcamento)*100)
          const st  = stCfg[c.status]
          const tc  = tipoColors[c.tipo]
          return (
            <div key={c.id} style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"16px 18px",display:"grid",gridTemplateColumns:"1fr 140px 140px 200px 90px 50px",gap:"16px",alignItems:"center" }}>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px" }}>
                  <span style={{ fontSize:"10px",fontWeight:700,color:tc,background:`${tc}20`,padding:"2px 7px",borderRadius:"20px" }}>{tipoLabels[c.tipo]}</span>
                  <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{c.nome}</span>
                </div>
                <div style={{ fontSize:"11px",color:"var(--text-muted)" }}>
                  {c.resp} · {new Date(c.inicio).toLocaleDateString("pt-BR")}{c.fim?` → ${new Date(c.fim).toLocaleDateString("pt-BR")}`:" · Em andamento"}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"2px" }}>Orçamento</div>
                <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{R(c.orcamento)}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"2px" }}>Realizado</div>
                <div style={{ fontSize:"13px",fontWeight:700,color:pct>100?"var(--danger)":"var(--text-primary)" }}>{R(c.realizado)}</div>
              </div>
              <div>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
                  <span style={{ fontSize:"10px",color:"var(--text-muted)" }}>Utilização</span>
                  <span style={{ fontSize:"10px",fontWeight:700,color:pct>90?"var(--danger)":pct>70?"var(--warning)":"var(--success)" }}>{pct}%</span>
                </div>
                <div style={{ background:"var(--bg-tertiary)",borderRadius:"4px",height:"6px" }}>
                  <div style={{ height:"100%",borderRadius:"4px",background:pct>90?"var(--danger)":pct>70?"var(--warning)":"var(--success)",width:`${Math.min(pct,100)}%` }}/>
                </div>
              </div>
              <div><span style={{ fontSize:"10px",fontWeight:700,color:st.c,background:st.bg,padding:"3px 9px",borderRadius:"20px" }}>{st.l}</span></div>
              <button style={{ width:"28px",height:"28px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
                <Edit2 size={12}/>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
