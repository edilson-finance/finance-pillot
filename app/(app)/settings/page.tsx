"use client"

import { useState, useRef } from "react"
import { Building2, Palette, Bell, Link2, Shield, Upload, Layers, Check, X } from "lucide-react"
import { useCompany, COMPANY_PROFILES } from "@/lib/company-context"

const settingsTabs = [
  { label: "Perfil Econômico",   icon: Layers   },
  { label: "Dados da Empresa",   icon: Building2 },
  { label: "Aparência",          icon: Palette  },
  { label: "Notificações",       icon: Bell     },
  { label: "Integrações",        icon: Link2    },
  { label: "Segurança",          icon: Shield   },
]

const inp: React.CSSProperties = {
  width:"100%", padding:"9px 12px",
  background:"var(--bg-tertiary)", border:"1px solid var(--border)",
  borderRadius:"7px", fontSize:"12.5px", color:"var(--text-primary)",
  outline:"none", fontFamily:"inherit",
}

function Label({ children, required }: { children: string; required?: boolean }) {
  return (
    <label style={{ display:"block", fontSize:"11px", fontWeight:700, color:"var(--text-secondary)", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.4px" }}>
      {children}{required && <span style={{ color:"var(--danger)" }}> *</span>}
    </label>
  )
}

function Field({ label, required, half, children }: { label:string; required?:boolean; half?:boolean; children:React.ReactNode }) {
  return (
    <div style={{ gridColumn: half ? "span 1" : "span 2", marginBottom:"14px" }}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  )
}

function Toggle({ label, hint, defaultChecked }: { label:string; hint?:string; defaultChecked?:boolean }) {
  const [on, setOn] = useState(defaultChecked ?? false)
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize:"13px", color:"var(--text-primary)", fontWeight:500 }}>{label}</div>
        {hint && <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>{hint}</div>}
      </div>
      <button onClick={()=>setOn(o=>!o)} style={{
        width:"40px", height:"22px", borderRadius:"11px", border:"none",
        background: on ? "var(--accent)" : "var(--border)", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0,
      }}>
        <span style={{ position:"absolute", top:"3px", left: on?"21px":"3px", width:"16px", height:"16px", borderRadius:"50%", background:"#fff", transition:"left 0.2s" }}/>
      </button>
    </div>
  )
}

const companyProfiles = Object.values(COMPANY_PROFILES)

export default function SettingsPage() {
  const [tab, setTab] = useState(0)
  const { companyType, setCompanyType, companyProfile, logoUrl, setLogoUrl, companyName, setCompanyName } = useCompany()
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [localName, setLocalName] = useState(companyName)

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert("Arquivo muito grande. Máximo 2MB."); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      setLogoUrl(url)
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    setLogoUrl(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function saveCompany() {
    setCompanyName(localName)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ padding:"22px" }}>
      <div style={{ marginBottom:"20px" }}>
        <h1 style={{ fontSize:"20px", fontWeight:800, color:"var(--text-primary)", letterSpacing:"-0.4px" }}>Configurações</h1>
        <p style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>Defina o perfil da empresa e personalize o sistema</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:"20px" }}>
        {/* Sidebar */}
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"8px", height:"fit-content" }}>
          {settingsTabs.map((t,i) => {
            const Icon = t.icon
            return (
              <button key={t.label} onClick={()=>setTab(i)} style={{
                display:"flex", alignItems:"center", gap:"8px", width:"100%",
                padding:"9px 12px", borderRadius:"7px", border:"none",
                background: tab===i ? "var(--accent-soft)" : "transparent",
                color: tab===i ? "var(--accent)" : "var(--text-secondary)",
                fontSize:"12.5px", fontWeight: tab===i ? 700 : 400,
                cursor:"pointer", fontFamily:"inherit", textAlign:"left", marginBottom:"2px",
              }}>
                <Icon size={14}/>{t.label}
                {i===0 && <span style={{ marginLeft:"auto", fontSize:"10px", fontWeight:700, color:"var(--warning)", background:"var(--warning-soft)", padding:"1px 6px", borderRadius:"10px" }}>Config.</span>}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"24px" }}>

          {/* ── PERFIL ECONÔMICO ── */}
          {tab===0 && (
            <>
              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontSize:"14px", fontWeight:800, color:"var(--text-primary)", marginBottom:"4px" }}>Perfil Econômico da Empresa</div>
                <div style={{ fontSize:"12px", color:"var(--text-muted)" }}>
                  Essa configuração ajuda o FinancePilot a enxergar a realidade econômica da empresa e adaptar comunicação, relatórios, diagnósticos e referências financeiras aos princípios usados no Brasil e no mundo.
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))", gap:"14px", marginBottom:"24px" }}>
                {companyProfiles.map(ct => (
                  <div key={ct.key} onClick={()=>setCompanyType(ct.key)} style={{
                    border: `2px solid ${companyType===ct.key ? "var(--accent)" : "var(--border)"}`,
                    borderRadius:"14px",
                    padding:"18px",
                    cursor:"pointer",
                    background: companyType===ct.key ? "var(--accent-soft)" : "var(--bg-tertiary)",
                    transition:"all 0.15s",
                    position:"relative",
                  }}>
                    {companyType===ct.key && (
                      <div style={{ position:"absolute", top:"12px", right:"12px", width:"20px", height:"20px", borderRadius:"50%", background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Check size={11} color="#fff"/>
                      </div>
                    )}
                    <div style={{ fontSize:"24px", marginBottom:"8px" }}>{ct.icon}</div>
                    <div style={{ fontSize:"13px", fontWeight:800, color: companyType===ct.key ? "var(--accent)" : "var(--text-primary)", marginBottom:"6px" }}>{ct.label}</div>
                    <div style={{ fontSize:"11.5px", color:"var(--text-secondary)", lineHeight:1.6, marginBottom:"12px" }}>{ct.desc}</div>
                    <div style={{ fontSize:"11px", color:"var(--text-muted)", borderTop:"1px solid var(--border)", paddingTop:"10px" }}>
                      {ct.indicators.slice(0, 5).map(f => (
                        <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:"5px", marginBottom:"5px" }}>
                          <Check size={10} style={{ color: companyType===ct.key ? "var(--accent)" : "var(--text-muted)", marginTop:"2px", flexShrink:0 }}/>
                          {f}
                        </div>
                      ))}
                      <div style={{ marginTop:"8px", fontSize:"10.5px", color:"var(--text-secondary)", lineHeight:1.5 }}>
                        Linguagem: {ct.language.revenue}, {ct.language.cost}.
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding:"14px 16px", background:"var(--success-soft)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:"var(--radius)", display:"flex", alignItems:"center", gap:"10px" }}>
                <Check size={14} style={{ color:"var(--success)", flexShrink:0 }}/>
                <span style={{ fontSize:"12px", color:"var(--success)" }}>
                  <strong>Perfil atual: {companyProfile.label}</strong> — relatórios e diagnósticos priorizam {companyProfile.reportFocus}.
                </span>
              </div>
            </>
          )}

          {/* ── DADOS DA EMPRESA ── */}
          {tab===1 && (
            <>
              {/* Logo */}
              <div style={{ marginBottom:"24px" }}>
                <Label>Logo da Empresa</Label>
                <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
                  <div style={{
                    width:"80px", height:"80px",
                    background: logoUrl ? "transparent" : "var(--accent-soft)",
                    borderRadius:"12px",
                    border:"2px dashed var(--border)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    overflow:"hidden", flexShrink:0, cursor:"pointer",
                  }} onClick={()=>fileRef.current?.click()}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                    ) : (
                      <div style={{ textAlign:"center" }}>
                        <Upload size={20} style={{ color:"var(--accent)", marginBottom:"4px" }}/>
                        <div style={{ fontSize:"9px", color:"var(--accent)", fontWeight:700 }}>LOGO</div>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogoChange}/>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    <button onClick={()=>fileRef.current?.click()} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 16px", background:"var(--accent)", border:"none", borderRadius:"7px", fontSize:"12px", color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      <Upload size={13}/> {logoUrl ? "Trocar logo" : "Fazer upload"}
                    </button>
                    {logoUrl && (
                      <button onClick={removeLogo} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"7px 14px", background:"var(--danger-soft)", border:"1px solid rgba(244,63,94,0.3)", borderRadius:"7px", fontSize:"12px", color:"var(--danger)", cursor:"pointer", fontFamily:"inherit" }}>
                        <X size={12}/> Remover logo
                      </button>
                    )}
                    <div style={{ fontSize:"10px", color:"var(--text-muted)" }}>PNG, JPG ou SVG · Máx. 2MB · Recomendado: 200×200px</div>
                  </div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
                <Field label="Nome da empresa" required half>
                  <input type="text" value={localName} onChange={e=>setLocalName(e.target.value)} style={inp}/>
                </Field>
                <Field label="Razão Social" half>
                  <input type="text" defaultValue="Minha Construtora Comércio e Serviços Ltda" style={inp}/>
                </Field>
                <Field label="CNPJ" required half>
                  <input type="text" defaultValue="12.345.678/0001-90" style={inp}/>
                </Field>
                <Field label="Inscrição Estadual" half>
                  <input type="text" placeholder="Opcional" style={inp}/>
                </Field>
                <Field label="Segmento" required>
                  <select style={inp}>
                    <option>Construção Civil</option>
                    <option>Comércio</option>
                    <option>Serviços Técnicos</option>
                    <option>Consultoria</option>
                    <option>Saúde</option>
                    <option>Educação</option>
                    <option>Tecnologia</option>
                    <option>Outro</option>
                  </select>
                </Field>
                <Field label="Regime Tributário" required half>
                  <select style={inp}>
                    <option>Simples Nacional</option>
                    <option>Lucro Presumido</option>
                    <option>Lucro Real</option>
                    <option>MEI</option>
                  </select>
                </Field>
                <Field label="Regime Financeiro Padrão" half>
                  <select style={inp}>
                    <option>Caixa</option>
                    <option>Competência</option>
                  </select>
                </Field>
                <Field label="Telefone" half>
                  <input type="text" defaultValue="(11) 91234-5678" style={inp}/>
                </Field>
                <Field label="WhatsApp" half>
                  <input type="text" defaultValue="(11) 91234-5678" style={inp}/>
                </Field>
                <Field label="E-mail" half>
                  <input type="email" defaultValue="financeiro@empresa.com.br" style={inp}/>
                </Field>
                <Field label="Site" half>
                  <input type="text" defaultValue="www.empresa.com.br" style={inp}/>
                </Field>
                <Field label="CEP" half>
                  <input type="text" defaultValue="01310-100" style={inp}/>
                </Field>
                <Field label="Endereço" half>
                  <input type="text" defaultValue="Av. Paulista, 1000" style={inp}/>
                </Field>
                <Field label="Cidade" half>
                  <input type="text" defaultValue="São Paulo" style={inp}/>
                </Field>
                <Field label="Estado" half>
                  <input type="text" defaultValue="SP" style={inp}/>
                </Field>
              </div>

              {saved && (
                <div style={{ padding:"10px 14px", background:"var(--success-soft)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:"7px", marginBottom:"12px", fontSize:"12px", color:"var(--success)", display:"flex", alignItems:"center", gap:"7px" }}>
                  <Check size={13}/> Dados salvos com sucesso!
                </div>
              )}

              <button onClick={saveCompany} style={{ padding:"10px 24px", background:"var(--accent)", border:"none", borderRadius:"7px", fontSize:"13px", color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Salvar alterações
              </button>
            </>
          )}

          {/* ── APARÊNCIA ── */}
          {tab===2 && (
            <>
              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontSize:"14px", fontWeight:700, color:"var(--text-primary)", marginBottom:"14px" }}>Tema</div>
                <Toggle label="Modo escuro" hint="Recomendado para uso prolongado" defaultChecked/>
                <Toggle label="Compactar sidebar" hint="Exibe apenas ícones no menu lateral"/>
              </div>
              <div>
                <div style={{ fontSize:"14px", fontWeight:700, color:"var(--text-primary)", marginBottom:"10px" }}>Cor de destaque</div>
                <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
                  {["#4F46E5","#2563EB","#0891B2","#059669","#D97706","#DC2626","#7C3AED","#DB2777"].map(c=>(
                    <button key={c} style={{ width:"36px", height:"36px", borderRadius:"8px", background:c, border:"3px solid transparent", cursor:"pointer", outline: c==="#4F46E5"?"2px solid var(--text-primary)":"none", outlineOffset:"2px" }}/>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── NOTIFICAÇÕES ── */}
          {tab===3 && (
            <>
              <div style={{ fontSize:"14px", fontWeight:700, color:"var(--text-primary)", marginBottom:"14px" }}>Alertas automáticos</div>
              <Toggle label="Caixa negativo projetado" hint="Notifica quando o saldo projetado for negativo" defaultChecked/>
              <Toggle label="Contas vencendo em 3 dias" defaultChecked/>
              <Toggle label="Inadimplência acima de 5%" defaultChecked/>
              <Toggle label="Relatório mensal automático" hint="Enviado no 1º de cada mês" defaultChecked/>
              <Toggle label="Concentração de receita acima de 40%"/>
            </>
          )}

          {/* ── INTEGRAÇÕES ── */}
          {tab===4 && (
            <>
              <div style={{ fontSize:"14px", fontWeight:700, color:"var(--text-primary)", marginBottom:"16px" }}>Integrações disponíveis</div>
              {[
                { nome:"OFX / Extrato bancário", desc:"Upload manual de extratos no formato OFX", status:"ativo" },
                { nome:"Omie ERP", desc:"Sincronizar lançamentos com o Omie", status:"disponivel" },
                { nome:"Conta Azul", desc:"Importar dados do Conta Azul", status:"disponivel" },
                { nome:"Nibo", desc:"Sincronização contábil com o Nibo", status:"disponivel" },
                { nome:"Open Finance (Pluggy)", desc:"Conexão direta com bancos via API", status:"breve" },
              ].map(i=>(
                <div key={i.nome} style={{ display:"flex", alignItems:"center", gap:"16px", padding:"14px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", fontWeight:600, color:"var(--text-primary)" }}>{i.nome}</div>
                    <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>{i.desc}</div>
                  </div>
                  {i.status==="ativo" && <span style={{ fontSize:"11px", color:"var(--success)", background:"var(--success-soft)", padding:"3px 10px", borderRadius:"20px", fontWeight:600 }}>Ativo</span>}
                  {i.status==="disponivel" && <button style={{ fontSize:"12px", color:"var(--accent)", background:"var(--accent-soft)", padding:"5px 14px", borderRadius:"7px", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Conectar</button>}
                  {i.status==="breve" && <span style={{ fontSize:"11px", color:"var(--text-muted)", background:"var(--bg-tertiary)", padding:"3px 10px", borderRadius:"20px" }}>Em breve</span>}
                </div>
              ))}
            </>
          )}

          {/* ── SEGURANÇA ── */}
          {tab===5 && (
            <>
              <div style={{ fontSize:"14px", fontWeight:700, color:"var(--text-primary)", marginBottom:"16px" }}>Segurança da conta</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"20px" }}>
                {[
                  { l:"Senha atual",        t:"password" },
                  { l:"Nova senha",         t:"password" },
                  { l:"Confirmar nova senha",t:"password", full:true },
                ].map(f=>(
                  <div key={f.l} style={{ gridColumn: f.full ? "span 2" : "span 1" }}>
                    <Label>{f.l}</Label>
                    <input type={f.t} style={inp}/>
                  </div>
                ))}
              </div>
              <button style={{ padding:"9px 20px", background:"var(--accent)", border:"none", borderRadius:"7px", fontSize:"12px", color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:"24px" }}>
                Alterar senha
              </button>
              <div style={{ borderTop:"1px solid var(--border)", paddingTop:"20px" }}>
                <div style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)", marginBottom:"12px" }}>Sessões ativas</div>
                {[
                  { device:"MacBook Pro — Chrome", ip:"189.40.xxx.xx", last:"Agora" },
                  { device:"iPhone 15 — Safari",  ip:"189.40.xxx.xx", last:"Ontem, 18:42" },
                ].map(s=>(
                  <div key={s.device} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize:"13px", color:"var(--text-primary)" }}>{s.device}</div>
                      <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>{s.ip} · {s.last}</div>
                    </div>
                    <button style={{ fontSize:"11px", color:"var(--danger)", background:"var(--danger-soft)", padding:"3px 10px", borderRadius:"6px", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Encerrar</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
