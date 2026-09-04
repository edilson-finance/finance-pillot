"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDialog } from "@/lib/dialog"
import { Plus, Search, Edit2, ChevronLeft, X, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Product } from "@/lib/db/products"
import { createProduct, updateProduct, deleteProduct } from "./actions"
import { EmptyState } from "@/components/ui/empty-state"

const R = (v:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v)

const inp: React.CSSProperties = { width:"100%",padding:"8px 11px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12.5px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }
function Label({ children, htmlFor }: { children:string; htmlFor?:string }) {
  return <label htmlFor={htmlFor} style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{children}</label>
}

type Opt = { id: string; name: string }

export default function ProductsClient({ products, partners = [], customers = [], rentalEnabled = false }: {
  products: Product[]
  partners?: Opt[]
  customers?: Opt[]
  rentalEnabled?: boolean
}) {
  const router = useRouter()
  const { confirm, alert } = useDialog()
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))

  function openNew() {
    setEditing(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = editing
      ? await updateProduct(editing.id, fd)
      : await createProduct(fd)
    setSaving(false)
    if (res.error === null) {
      closeForm()
      router.refresh()
    } else {
      setError(res.error)
    }
  }

  async function handleDelete(p: Product) {
    if (!(await confirm(`Excluir o item "${p.name}"?`, { danger: true, confirmText: "Excluir" }))) return
    const res = await deleteProduct(p.id)
    if (res.error === null) router.refresh()
    else void alert(res.error, { title: "Erro" })
  }

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
        <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",background:"var(--accent)",border:"none",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          <Plus size={13}/> Novo item
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"16px" }}>
        {[
          { l:"Total de Itens", v:String(products.length), c:"var(--accent)" },
          { l:"Preço Médio",    v:"—", c:"var(--success)" },
          { l:"Margem Média",   v:"—", c:"var(--warning)" },
          { l:"Mais Vendido",   v:"—", c:"var(--purple)" },
        ].map(k=>(
          <div key={k.l} style={{ background:"var(--bg-secondary)",border:`1px solid ${k.c}28`,borderLeft:`3px solid ${k.c}`,borderRadius:"var(--radius)",padding:"12px 14px" }}>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
            <div style={{ fontSize:"19px",fontWeight:800,color:k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"var(--bg-secondary)",border:"1px solid var(--accent-border)",borderRadius:"var(--radius)",padding:"20px",marginBottom:"16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{editing ? "Editar Produto / Serviço" : "Novo Produto / Serviço"}</span>
            <button type="button" onClick={closeForm} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
            <div style={{ gridColumn:"span 2" }}><Label htmlFor="name">Nome *</Label><input name="name" id="name" type="text" required defaultValue={editing?.name ?? ""} placeholder="Ex: Consultoria técnica por hora" style={inp}/></div>
            <div><Label htmlFor="kind">Tipo</Label>
              <select name="kind" id="kind" defaultValue={editing?.kind ?? "produto"} style={inp}>
                <option value="produto">Produto</option>
                <option value="servico">Serviço</option>
              </select>
            </div>
            <div><Label htmlFor="price">Preço (R$)</Label><input name="price" id="price" type="number" step="0.01" min="0" defaultValue={editing?.price ?? 0} placeholder="0,00" style={inp}/></div>
            <div><Label htmlFor="unit">Unidade</Label><input name="unit" id="unit" type="text" defaultValue={editing?.unit ?? ""} placeholder="Un, Kg, Hora, m²..." style={inp}/></div>
          </div>

          {/* ── Locação: só aparece quando a empresa administra imóveis de terceiros ── */}
          {rentalEnabled && (
            <div style={{ marginTop:"16px",paddingTop:"16px",borderTop:"1px solid var(--border)" }}>
              <div style={{ fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:"10px" }}>
                Locação (imóvel administrado)
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px" }}>
                <div>
                  <Label htmlFor="partner_id">Proprietário (recebe o repasse)</Label>
                  <select name="partner_id" id="partner_id" defaultValue={editing?.partner_id ?? ""} style={inp}>
                    <option value="">— sem proprietário (imóvel próprio) —</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="commission_percent">Nossa comissão (%)</Label>
                  <input name="commission_percent" id="commission_percent" type="number" step="0.01" min="0" max="100"
                    defaultValue={editing?.commission_percent ?? 10} placeholder="10" style={inp}/>
                </div>
                <div>
                  <Label htmlFor="rent_amount">Valor do aluguel (R$)</Label>
                  <input name="rent_amount" id="rent_amount" type="number" step="0.01" min="0"
                    defaultValue={editing?.rent_amount ?? 0} placeholder="0,00" style={inp}/>
                </div>
                <div>
                  <Label htmlFor="rental_status">Situação</Label>
                  <select name="rental_status" id="rental_status" defaultValue={editing?.rental_status ?? "vago"} style={inp}>
                    <option value="vago">Vago</option>
                    <option value="alugado">Alugado</option>
                  </select>
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <Label htmlFor="tenant_id">Inquilino</Label>
                  <select name="tenant_id" id="tenant_id" defaultValue={editing?.tenant_id ?? ""} style={inp}>
                    <option value="">— sem inquilino —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="billing_day">Dia do boleto</Label>
                  <input name="billing_day" id="billing_day" type="number" min="1" max="31"
                    defaultValue={editing?.billing_day ?? ""} placeholder="Ex: 10" style={inp}/>
                </div>
                <div>
                  <Label htmlFor="transfer_day">Dia do repasse</Label>
                  <input name="transfer_day" id="transfer_day" type="number" min="1" max="31"
                    defaultValue={editing?.transfer_day ?? ""} placeholder="Ex: 15" style={inp}/>
                </div>
                <div>
                  <Label htmlFor="contract_end">Término do contrato</Label>
                  <input name="contract_end" id="contract_end" type="date"
                    defaultValue={editing?.contract_end ?? ""} style={inp}/>
                </div>
              </div>
              <p style={{ fontSize:"11.5px",color:"var(--text-muted)",marginTop:"10px",lineHeight:1.5 }}>
                Com proprietário e comissão definidos, ao lançar a cobrança deste imóvel o sistema calcula
                sozinho quanto fica com a empresa e quanto é repasse — e gera a conta a pagar do repasse na baixa.
              </p>
            </div>
          )}

          {error && <div style={{ marginTop:"12px",fontSize:"12px",color:"var(--danger)",fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex",gap:"8px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)" }}>
            <button type="submit" disabled={saving} style={{ padding:"9px 20px",background:"var(--accent)",border:"none",borderRadius:"6px",fontSize:"12px",color:"#fff",fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?0.7:1,fontFamily:"inherit" }}>{saving ? "Salvando..." : "Salvar item"}</button>
            <button type="button" onClick={closeForm} style={{ padding:"9px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div style={{ position:"relative",marginBottom:"14px",maxWidth:"360px" }}>
        <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar produto ou serviço..." style={{ width:"100%",paddingLeft:"30px",paddingRight:"12px",paddingTop:"8px",paddingBottom:"8px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"12px",color:"var(--text-primary)",outline:"none",fontFamily:"inherit" }}/>
      </div>

      {/* Table */}
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"var(--bg-tertiary)",borderBottom:"2px solid var(--border)" }}>
              {["Nome","Tipo","Unidade","Preço","Margem","Status","Ações"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:["Preço","Margem"].includes(h)?"right":"left",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p,i)=>{
              const isServico = p.kind === "servico"
              return (
                <tr key={p.id} style={{ borderBottom:i<filtered.length-1?"1px solid var(--border)":"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"11px 14px",fontSize:"13px",fontWeight:600,color:"var(--text-primary)" }}>{p.name}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:700,color:isServico?"var(--purple)":"var(--accent)",background:isServico?"var(--purple-soft)":"var(--accent-soft)",padding:"2px 8px",borderRadius:"20px" }}>
                      {isServico?"Serviço":"Produto"}
                    </span>
                  </td>
                  <td style={{ padding:"11px 14px",fontSize:"11.5px",color:"var(--text-secondary)" }}>{p.unit ?? "—"}</td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--success)" }}>{p.price>0?R(p.price):"—"}</td>
                  <td style={{ padding:"11px 14px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--text-muted)" }}>—</td>
                  <td style={{ padding:"11px 14px" }}>
                    <span style={{ fontSize:"11px",fontWeight:600,color:"var(--success)",background:"var(--success-soft)",padding:"2px 8px",borderRadius:"20px" }}>Ativo</span>
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex",gap:"5px" }}>
                      <button type="button" title="Editar" onClick={()=>openEdit(p)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}><Edit2 size={12}/></button>
                      <button type="button" title="Excluir" onClick={()=>handleDelete(p)} style={{ width:"26px",height:"26px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-elevated)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--danger)" }}><Trash2 size={12}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 0 }}>
                <EmptyState
                  title={q ? "Nenhum item encontrado" : "Nenhum produto ou serviço cadastrado"}
                  description={q ? "Tente ajustar a busca." : "Cadastre produtos e serviços para detalhar seus lançamentos."}
                  action={q ? undefined : (
                    <button type="button" onClick={openNew} style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"8px 16px", background:"var(--accent)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", fontSize:"12px", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}><Plus size={13}/> Novo item</button>
                  )}
                />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
