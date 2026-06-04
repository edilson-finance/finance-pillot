"use client"

import Link from "next/link"
import { Tag, Layers, Users, Truck, CreditCard, Package, ChevronRight } from "lucide-react"

const registros = [
  { href:"/registers/categories",  label:"Categorias",           desc:"Plano de contas — grupos contábeis NBC TG / CFC", icon:Tag,        color:"var(--success)" },
  { href:"/registers/cost-centers",label:"Centros de Custo",     desc:"Obras, projetos, departamentos e filiais",         icon:Layers,     color:"var(--accent)" },
  { href:"/registers/customers",   label:"Clientes",             desc:"Cadastro, histórico e indicadores por cliente",    icon:Users,      color:"var(--purple)" },
  { href:"/registers/suppliers",   label:"Fornecedores",         desc:"Cadastro, dados bancários e pagamentos",           icon:Truck,      color:"var(--warning)" },
  { href:"/registers/accounts",    label:"Contas Bancárias",     desc:"Corrente, digital, caixa, cartão e investimento",  icon:CreditCard, color:"var(--info)" },
  { href:"/registers/products",    label:"Produtos e Serviços",  desc:"Catálogo de itens para lançamentos rápidos",       icon:Package,    color:"var(--danger)" },
]

export default function RegistersClient({ counts }: { counts: Record<string, number> }) {
  return (
    <div style={{ padding:"22px" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Cadastros</h1>
        <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Gerencie os dados de suporte do sistema financeiro</p>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px" }}>
        {registros.map(r=>{
          const Icon = r.icon
          const count = counts[r.href] ?? 0
          return (
            <Link key={r.href} href={r.href} style={{ textDecoration:"none" }}>
              <div style={{
                background:"var(--bg-secondary)",
                border:"1px solid var(--border)",
                borderRadius:"var(--radius)",
                padding:"18px 20px",
                cursor:"pointer",
                transition:"border-color 0.15s, box-shadow 0.15s",
                display:"flex",
                flexDirection:"column",
                gap:"10px",
              }}
              onMouseEnter={e=>{
                (e.currentTarget as HTMLElement).style.borderColor=r.color
                ;(e.currentTarget as HTMLElement).style.boxShadow=`0 0 0 1px ${r.color}30`
              }}
              onMouseLeave={e=>{
                (e.currentTarget as HTMLElement).style.borderColor="var(--border)"
                ;(e.currentTarget as HTMLElement).style.boxShadow="none"
              }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div style={{ width:"38px",height:"38px",background:`${r.color}18`,borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Icon size={17} style={{ color:r.color }}/>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:"5px" }}>
                    <span style={{ fontSize:"10px",color:"var(--text-muted)" }}>{count} registros</span>
                    <ChevronRight size={13} style={{ color:"var(--text-muted)" }}/>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:"14px",fontWeight:700,color:"var(--text-primary)",marginBottom:"3px" }}>{r.label}</div>
                  <div style={{ fontSize:"11.5px",color:"var(--text-muted)",lineHeight:1.5 }}>{r.desc}</div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
