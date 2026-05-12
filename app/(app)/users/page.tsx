"use client"

import { useState } from "react"
import { Plus, Edit2, X, Check, ChevronDown, Shield, Eye, EyeOff } from "lucide-react"

/* ── Perfis padrão e suas permissões ── */
const ROLES = {
  dono: {
    label: "Dono",
    desc: "Acesso total ao sistema. Pode gerenciar usuários, configurações e ver todos os dados financeiros.",
    color: "var(--purple)",
    bg: "var(--purple-soft)",
  },
  administrador: {
    label: "Administrador",
    desc: "Acesso completo exceto configurações sensíveis. Pode gerenciar usuários.",
    color: "var(--accent)",
    bg: "var(--accent-soft)",
  },
  financeiro: {
    label: "Financeiro",
    desc: "Acesso a lançamentos, relatórios, DRE e BI. Pode ver saldo e lucro.",
    color: "var(--success)",
    bg: "var(--success-soft)",
  },
  operador: {
    label: "Operador",
    desc: "Pode criar lançamentos e visualizar contas a pagar/receber. Não vê saldo, lucro ou DRE.",
    color: "var(--warning)",
    bg: "var(--warning-soft)",
  },
  consultor: {
    label: "Consultor",
    desc: "Acesso somente leitura a DRE, BI e diagnóstico. Não vê saldo bancário.",
    color: "var(--info)",
    bg: "var(--info-soft)",
  },
  contador: {
    label: "Contador",
    desc: "Acesso a DRE, relatórios e exportações. Não cria nem edita lançamentos.",
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.12)",
  },
} as const

type Role = keyof typeof ROLES

/* Matriz de permissões */
const PERMS: { label: string; key: string; roles: Role[] }[] = [
  { label:"Ver saldo bancário",          key:"saldo",          roles:["dono","administrador","financeiro"] },
  { label:"Ver DRE completo",            key:"dre",            roles:["dono","administrador","financeiro","consultor","contador"] },
  { label:"Ver lucro líquido",           key:"lucro",          roles:["dono","administrador","financeiro","consultor","contador"] },
  { label:"Ver BI Financeiro",           key:"bi",             roles:["dono","administrador","financeiro","consultor"] },
  { label:"Criar lançamentos",           key:"criar",          roles:["dono","administrador","financeiro","operador"] },
  { label:"Editar lançamentos",          key:"editar",         roles:["dono","administrador","financeiro"] },
  { label:"Cancelar lançamentos",        key:"cancelar",       roles:["dono","administrador","financeiro"] },
  { label:"Conciliar extrato bancário",  key:"conciliar",      roles:["dono","administrador","financeiro"] },
  { label:"Exportar relatórios",         key:"exportar",       roles:["dono","administrador","financeiro","consultor","contador"] },
  { label:"Ver diagnóstico",             key:"diagnostico",    roles:["dono","administrador","financeiro","consultor","contador"] },
  { label:"Gerenciar usuários",          key:"usuarios",       roles:["dono","administrador"] },
  { label:"Alterar plano de contas",     key:"categorias",     roles:["dono","administrador"] },
  { label:"Configurações da empresa",    key:"settings",       roles:["dono","administrador"] },
  { label:"Ver configurações sensíveis", key:"sensivel",       roles:["dono"] },
]

const ROLE_ORDER: Role[] = ["dono","administrador","financeiro","operador","consultor","contador"]

const users = [
  { id:"1", name:"Edils S.",       email:"2lves16@gmail.com",                  role:"dono"          as Role, lastAccess:"Agora",           status:"active" },
  { id:"2", name:"Ana Lima",       email:"ana@minhaconstrutora.com.br",         role:"financeiro"    as Role, lastAccess:"Hoje, 09:14",      status:"active" },
  { id:"3", name:"Carlos Souza",   email:"carlos@minhaconstrutora.com.br",      role:"operador"      as Role, lastAccess:"Ontem",            status:"active" },
  { id:"4", name:"Fernanda C.",    email:"fernanda@escritoriocontabil.com.br",   role:"contador"      as Role, lastAccess:"05/05/2026",       status:"active" },
]

const inp: React.CSSProperties = {
  width:"100%", padding:"9px 12px",
  background:"var(--bg-tertiary)", border:"1px solid var(--border)",
  borderRadius:"6px", fontSize:"12.5px", color:"var(--text-primary)",
  outline:"none", fontFamily:"inherit",
}

export default function UsersPage() {
  const [tab, setTab] = useState<"users"|"profiles"|"invite">("users")
  const [showInvite, setShowInvite] = useState(false)
  const [editPerms, setEditPerms] = useState<Role|null>(null)
  const [customPerms, setCustomPerms] = useState<Record<string,boolean>>({})

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"18px" }}>
        <div>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Usuários e Permissões</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Gerencie quem acessa o sistema e o que cada perfil pode fazer</p>
        </div>
        <button onClick={()=>setShowInvite(true)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Convidar usuário
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:"2px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"3px",marginBottom:"16px",width:"fit-content" }}>
        {[["users","Usuários"],["profiles","Perfis e Permissões"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k as any)} style={{
            padding:"7px 16px",borderRadius:"8px",border:"none",
            background:tab===k?"var(--bg-tertiary)":"transparent",
            color:tab===k?"var(--text-primary)":"var(--text-secondary)",
            fontSize:"12px",fontWeight:tab===k?700:400,cursor:"pointer",fontFamily:"inherit",
          }}>{l}</button>
        ))}
      </div>

      {/* ── LISTA DE USUÁRIOS ── */}
      {tab==="users" && (
        <>
          {/* Invite form */}
          {showInvite && (
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent)40",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
                <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Convidar Novo Usuário</span>
                <button onClick={()=>setShowInvite(false)} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"14px" }}>
                <div>
                  <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Nome *</label>
                  <input type="text" placeholder="Nome completo" style={inp}/>
                </div>
                <div>
                  <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>E-mail *</label>
                  <input type="email" placeholder="usuario@empresa.com.br" style={inp}/>
                </div>
                <div>
                  <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>Perfil *</label>
                  <select style={inp}>
                    {ROLE_ORDER.map(r=><option key={r} value={r}>{ROLES[r].label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex",gap:"8px",marginTop:"14px" }}>
                <button style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                  Enviar convite
                </button>
                <button onClick={()=>setShowInvite(false)} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
                  {["Usuário","Perfil","Último acesso","Status","Ações"].map(h=>(
                    <th key={h} style={{ padding:"10px 16px",textAlign:"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u,i)=>{
                  const rc = ROLES[u.role]
                  return (
                    <tr key={u.id} style={{ borderBottom:i<users.length-1?"1px solid var(--border)":"none" }}
                      onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <td style={{ padding:"13px 16px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                          <div style={{ width:"34px",height:"34px",borderRadius:"50%",background:rc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:800,color:rc.color,flexShrink:0 }}>
                            {u.name.split(" ").map(w=>w[0]).slice(0,2).join("")}
                          </div>
                          <div>
                            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{u.name}</div>
                            <div style={{ fontSize:"11px",color:"var(--text-muted)" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"13px 16px" }}>
                        <div style={{ display:"inline-flex",alignItems:"center",gap:"5px",padding:"3px 10px",borderRadius:"20px",background:rc.bg }}>
                          <Shield size={10} style={{ color:rc.color }}/>
                          <span style={{ fontSize:"11px",fontWeight:700,color:rc.color }}>{rc.label}</span>
                        </div>
                      </td>
                      <td style={{ padding:"13px 16px",fontSize:"12px",color:"var(--text-secondary)" }}>{u.lastAccess}</td>
                      <td style={{ padding:"13px 16px" }}>
                        <span style={{ fontSize:"11px",fontWeight:700,color:"var(--success)",background:"var(--success-soft)",padding:"2px 9px",borderRadius:"20px" }}>Ativo</span>
                      </td>
                      <td style={{ padding:"13px 16px" }}>
                        <div style={{ display:"flex",gap:"6px" }}>
                          <button style={{ padding:"5px 10px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"11px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Editar</button>
                          {u.role!=="dono" && <button style={{ padding:"5px 10px",background:"var(--danger-soft)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:"6px",fontSize:"11px",color:"var(--danger)",cursor:"pointer",fontFamily:"inherit" }}>Remover</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── PERFIS E PERMISSÕES ── */}
      {tab==="profiles" && (
        <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
          {/* Perfis overview */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"6px" }}>
            {ROLE_ORDER.map(r=>{
              const rc = ROLES[r]
              return (
                <div key={r} style={{ background:"var(--bg-secondary)",border:`1px solid ${rc.color}28`,borderLeft:`3px solid ${rc.color}`,borderRadius:"var(--radius)",padding:"14px 16px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px" }}>
                    <Shield size={13} style={{ color:rc.color }}/>
                    <span style={{ fontSize:"13px",fontWeight:700,color:rc.color }}>{rc.label}</span>
                  </div>
                  <div style={{ fontSize:"11px",color:"var(--text-secondary)",lineHeight:1.6 }}>{rc.desc}</div>
                </div>
              )
            })}
          </div>

          {/* Matriz de permissões */}
          <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
            <div style={{ padding:"14px 16px",borderBottom:"1px solid var(--border)",background:"var(--bg-tertiary)" }}>
              <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Matriz de Permissões</div>
              <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Visão geral do que cada perfil pode acessar</div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse",minWidth:"700px" }}>
                <thead>
                  <tr style={{ borderBottom:"2px solid var(--border)" }}>
                    <th style={{ padding:"10px 16px",textAlign:"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",background:"var(--bg-tertiary)",minWidth:"220px" }}>Permissão</th>
                    {ROLE_ORDER.map(r=>{
                      const rc = ROLES[r]
                      return (
                        <th key={r} style={{ padding:"10px 12px",textAlign:"center",fontSize:"10px",color:rc.color,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",background:"var(--bg-tertiary)" }}>
                          {rc.label}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {PERMS.map((p,i)=>(
                    <tr key={p.key} style={{ borderBottom:"1px solid var(--border)" }}
                      onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <td style={{ padding:"10px 16px",fontSize:"12.5px",color:"var(--text-primary)",fontWeight:500 }}>{p.label}</td>
                      {ROLE_ORDER.map(r=>{
                        const has = p.roles.includes(r)
                        return (
                          <td key={r} style={{ padding:"10px 12px",textAlign:"center" }}>
                            {has ? (
                              <div style={{ width:"20px",height:"20px",borderRadius:"50%",background:"var(--success-soft)",border:"1.5px solid var(--success)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto" }}>
                                <Check size={11} style={{ color:"var(--success)" }}/>
                              </div>
                            ) : (
                              <div style={{ width:"20px",height:"20px",borderRadius:"50%",background:"var(--bg-tertiary)",border:"1.5px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto" }}>
                                <X size={10} style={{ color:"var(--text-muted)" }}/>
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custom profile */}
          <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"16px 18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"4px" }}>Perfil Personalizado</div>
            <div style={{ fontSize:"11px",color:"var(--text-muted)",marginBottom:"12px" }}>Crie um perfil com permissões específicas para um usuário</div>
            <div style={{ display:"flex",gap:"8px",flexWrap:"wrap" }}>
              {PERMS.map(p=>(
                <button key={p.key} onClick={()=>setCustomPerms(prev=>({...prev,[p.key]:!prev[p.key]}))} style={{
                  display:"flex",alignItems:"center",gap:"5px",padding:"5px 11px",
                  borderRadius:"20px",border:"1px solid",
                  borderColor:customPerms[p.key]?"var(--accent)":"var(--border)",
                  background:customPerms[p.key]?"var(--accent-soft)":"transparent",
                  color:customPerms[p.key]?"var(--accent)":"var(--text-secondary)",
                  fontSize:"11px",fontWeight:customPerms[p.key]?700:400,
                  cursor:"pointer",fontFamily:"inherit",
                }}>
                  {customPerms[p.key] ? <Check size={10}/> : null}
                  {p.label}
                </button>
              ))}
            </div>
            {Object.values(customPerms).some(Boolean) && (
              <button style={{ marginTop:"12px",padding:"8px 18px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                Aplicar perfil personalizado
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
