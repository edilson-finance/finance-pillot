"use client"

import {
  AlertTriangle, AlertCircle, TrendingUp, TrendingDown,
  Shield, Target, Zap, ArrowRight, BarChart2,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useCompany } from "@/lib/company-context"

const allInsights = [
  {
    id: "1", categoria: "risco", prioridade: "critica",
    titulo: "Concentração crítica de receita",
    descricao: "Construtora Beta representa 48,1% do faturamento total. A perda deste cliente implicaria queda imediata de R$ 150.000/mês na receita, tornando o fluxo de caixa insustentável em menos de 60 dias.",
    impacto: "Alto", impactoValor: "R$ 150.000/mês",
    acao: "Diversificar carteira de clientes", href: "/registers/customers",
    icon: Shield, color: "var(--danger)",
  },
  {
    id: "2", categoria: "risco", prioridade: "critica",
    titulo: "Inadimplência muito acima do saudável",
    descricao: "Taxa de 19,9% contra referência saudável de até 5%. Os R$ 28.700 parados representam 9,2% do seu caixa atual e pressionam o fluxo de junho. 3 clientes concentram 68% do valor total inadimplente.",
    impacto: "Alto", impactoValor: "R$ 28.700 travados",
    acao: "Acionar cobranças", href: "/delinquent",
    icon: AlertCircle, color: "var(--danger)",
  },
  {
    id: "3", categoria: "atencao", prioridade: "alta",
    titulo: "Margem líquida abaixo do ideal",
    descricao: "Margem de 5,9% está abaixo da referência de 10% para o setor. O crescimento de despesas fixas (+12% nos últimos 3 meses) comprime a margem mesmo com crescimento de receita.",
    impacto: "Médio", impactoValor: "Margem -4,1pp",
    acao: "Analisar despesas fixas", href: "/dre",
    icon: TrendingDown, color: "var(--warning)",
  },
  {
    id: "4", categoria: "atencao", prioridade: "alta",
    titulo: "Caixa negativo projetado em junho",
    descricao: "Com base nos lançamentos em aberto e padrão histórico, o saldo tende a ficar abaixo de R$ 50.000 na semana de 24/06. O vencimento de R$ 98.400 em folha sem o recebimento projetado da Construtora Beta é o principal fator.",
    impacto: "Alto", impactoValor: "Risco em 24 jun",
    acao: "Ver projeção de caixa", href: "/projecoes",
    icon: AlertTriangle, color: "var(--warning)",
  },
  {
    id: "5", categoria: "oportunidade", prioridade: "alta",
    titulo: "Recuperação de inadimplentes eleva margem para 15%",
    descricao: "Se os R$ 28.700 inadimplentes forem recuperados, a margem líquida passaria de 5,9% para 15,1% neste mês. A Construtora Beta sozinha deve R$ 178.700 — prioridade máxima de cobrança.",
    impacto: "Alto", impactoValor: "+R$ 28.700 no caixa",
    acao: "Cobrar inadimplentes", href: "/delinquent",
    icon: Target, color: "var(--success)",
  },
  {
    id: "6", categoria: "tendencia", prioridade: "media",
    titulo: "Crescimento consistente nos últimos 3 meses",
    descricao: "Faturamento cresceu de R$ 264.000 (Fevereiro) para R$ 312.000 (Maio), alta de 18,2% em 3 meses. O crescimento está ocorrendo com margem de contribuição estável em 37%, o que é positivo.",
    impacto: "Positivo", impactoValor: "+18,2% em 3 meses",
    acao: "Ver tendências", href: "/tendencias",
    icon: TrendingUp, color: "var(--accent)",
  },
  {
    id: "7", categoria: "tendencia", prioridade: "media",
    titulo: "Despesas crescem 12% acima da meta",
    descricao: "Nos últimos 3 meses, as despesas fixas cresceram 12% enquanto a meta era 5%. O principal driver é folha (+19% acima da meta). Se mantida a tendência, a margem operacional cairá para 14% em 3 meses.",
    impacto: "Médio", impactoValor: "Margem -5pp em 3m",
    acao: "Analisar tendências", href: "/tendencias",
    icon: TrendingDown, color: "var(--warning)",
  },
  {
    id: "8", categoria: "oportunidade", prioridade: "media",
    titulo: "Ticket médio 30% abaixo do potencial",
    descricao: "Comparando com empresas similares do setor, seu ticket médio de R$ 24.600 está 30% abaixo da referência de R$ 32.000. Revisão de precificação poderia gerar R$ 74.000 adicionais sem novos clientes.",
    impacto: "Alto", impactoValor: "+R$ 74.000 potencial",
    acao: "Comparar com mercado", href: "/comparativos",
    icon: Zap, color: "var(--accent)",
  },
  {
    id: "9", categoria: "atencao", prioridade: "baixa",
    titulo: "Receita recorrente muito baixa",
    descricao: "Apenas 35% da receita é recorrente (contratos fixos). A referência saudável é 60%. Alta dependência de projetos pontuais cria volatilidade e dificulta a previsibilidade do fluxo de caixa.",
    impacto: "Médio", impactoValor: "Previsibilidade baixa",
    acao: "Ver diagnóstico", href: "/diagnostic",
    icon: BarChart2, color: "var(--info)",
  },
]

const categorias = [
  { key: "todos", label: "Todos", count: allInsights.length },
  { key: "risco", label: "Riscos", count: allInsights.filter(i => i.categoria === "risco").length },
  { key: "atencao", label: "Atenção", count: allInsights.filter(i => i.categoria === "atencao").length },
  { key: "oportunidade", label: "Oportunidades", count: allInsights.filter(i => i.categoria === "oportunidade").length },
  { key: "tendencia", label: "Tendências", count: allInsights.filter(i => i.categoria === "tendencia").length },
]

const prioridadeOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 }

export default function InsightsPage() {
  const [filtro, setFiltro] = useState("todos")
  const { companyProfile } = useCompany()

  const insights = allInsights
    .filter(i => filtro === "todos" || i.categoria === filtro)
    .sort((a, b) => prioridadeOrder[a.prioridade] - prioridadeOrder[b.prioridade])

  function profileDescription(insight: (typeof allInsights)[number]) {
    if (insight.id === "3") {
      return `Margem de 5,9% está abaixo da referência de ${companyProfile.benchmarks.netMargin} para ${companyProfile.benchmarks.defaultReference}. O crescimento de despesas fixas (+12% nos últimos 3 meses) comprime a margem mesmo com crescimento de ${companyProfile.language.revenue}.`
    }
    if (insight.id === "6") {
      return `${companyProfile.language.revenue} cresceu de R$ 264.000 (Fevereiro) para R$ 312.000 (Maio), alta de 18,2% em 3 meses. O crescimento está ocorrendo com margem de contribuição estável, ponto positivo para ${companyProfile.language.operation}.`
    }
    if (insight.id === "8") {
      return `Comparando com ${companyProfile.benchmarks.defaultReference}, o ticket médio de R$ 24.600 está abaixo do potencial. Revisão de precificação alinhada a ${companyProfile.reportFocus} poderia gerar R$ 74.000 adicionais sem novos clientes.`
    }
    if (insight.id === "9") {
      return `A previsibilidade da receita merece atenção para o perfil ${companyProfile.label}. Em ${companyProfile.language.operation}, acompanhar recorrência, concentração e prazo médio de recebimento ajuda a reduzir volatilidade do fluxo de caixa.`
    }
    return insight.descricao
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Insights</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>
          Análise automática dos seus dados financeiros — {allInsights.length} insights identificados · Perfil {companyProfile.label}
        </p>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"13px 16px", background:"var(--accent-soft)", border:"1px solid rgba(79,70,229,0.22)", borderRadius:"var(--radius)", marginBottom:"16px" }}>
        <div style={{ width:"34px", height:"34px", borderRadius:"12px", background:"var(--bg-secondary)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>{companyProfile.icon}</div>
        <div>
          <div style={{ fontSize:"12px", fontWeight:800, color:"var(--accent)" }}>Leitura adaptada para {companyProfile.label}</div>
          <div style={{ fontSize:"11.5px", color:"var(--text-secondary)", marginTop:"2px" }}>
            Priorizando {companyProfile.reportFocus}. Indicadores-chave: {companyProfile.indicators.slice(0, 4).join(", ")}.
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
        {[
          { label: "Riscos críticos", count: allInsights.filter(i => i.categoria === "risco").length, color: "var(--danger)", icon: AlertCircle },
          { label: "Pontos de atenção", count: allInsights.filter(i => i.categoria === "atencao").length, color: "var(--warning)", icon: AlertTriangle },
          { label: "Oportunidades", count: allInsights.filter(i => i.categoria === "oportunidade").length, color: "var(--success)", icon: Target },
          { label: "Tendências", count: allInsights.filter(i => i.categoria === "tendencia").length, color: "var(--accent)", icon: TrendingUp },
        ].map(s => (
          <button key={s.label} onClick={() => setFiltro(s.label === "Riscos críticos" ? "risco" : s.label === "Pontos de atenção" ? "atencao" : s.label === "Oportunidades" ? "oportunidade" : "tendencia")}
            style={{ padding: "14px 16px", background: "var(--bg-secondary)", border: `1px solid ${s.color}28`, borderRadius: "var(--radius)", textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = s.color}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = s.color + "28"}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <s.icon size={14} style={{ color: s.color }} />
              <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: s.color }}>{s.count}</div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {categorias.map(cat => (
          <button key={cat.key} onClick={() => setFiltro(cat.key)}
            style={{
              padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              background: filtro === cat.key ? "var(--accent)" : "var(--bg-secondary)",
              border: filtro === cat.key ? "1px solid var(--accent)" : "1px solid var(--border)",
              color: filtro === cat.key ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}>
            {cat.label}
            <span style={{ marginLeft: "6px", padding: "0 6px", borderRadius: "10px", background: filtro === cat.key ? "rgba(255,255,255,0.2)" : "var(--bg-tertiary)", fontSize: "10px" }}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista de insights */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {insights.map(insight => (
          <div key={insight.id} style={{
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
            borderLeft: `4px solid ${insight.color}`,
            borderRadius: "var(--radius)", padding: "16px 20px",
            transition: "border-color 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = insight.color}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}>
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: insight.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <insight.icon size={16} style={{ color: insight.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{insight.titulo}</span>
                  {insight.prioridade === "critica" && (
                    <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "9.5px", fontWeight: 700, background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid rgba(244,63,94,0.3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Crítico</span>
                  )}
                  {insight.prioridade === "alta" && (
                    <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "9.5px", fontWeight: 700, background: "var(--warning-soft)", color: "var(--warning)", border: "1px solid rgba(245,158,11,0.3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Alta prioridade</span>
                  )}
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 10px" }}>{profileDescription(insight)}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "var(--bg-tertiary)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Impacto:</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>{insight.impactoValor}</span>
                  </div>
                  <Link href={insight.href} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, color: insight.color, cursor: "pointer" }}>
                      {insight.acao} <ArrowRight size={11} />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
