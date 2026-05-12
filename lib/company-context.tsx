"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type CompanyType =
  | "industria"
  | "comercio"
  | "servicos"
  | "construcao"
  | "agro"
  | "tecnologia"
  | "saude_educacao"
  | "misto"

export interface CompanyProfile {
  key: CompanyType
  label: string
  shortLabel: string
  icon: string
  desc: string
  language: {
    revenue: string
    cost: string
    customer: string
    operation: string
  }
  indicators: string[]
  benchmarks: {
    netMargin: string
    contributionMargin: string
    defaultReference: string
  }
  reportFocus: string
}

export const COMPANY_PROFILES: Record<CompanyType, CompanyProfile> = {
  industria: {
    key: "industria",
    label: "Indústria",
    shortLabel: "Indústria",
    icon: "🏭",
    desc: "Produz bens físicos, transforma matéria-prima e depende de margem bruta, estoque, capacidade produtiva e capital de giro.",
    language: { revenue: "vendas industriais", cost: "CPV e custos de produção", customer: "clientes e canais", operation: "produção" },
    indicators: ["Margem bruta", "CPV", "Giro de estoque", "Capacidade produtiva", "Capital de giro"],
    benchmarks: { netMargin: "6–14%", contributionMargin: "25–40%", defaultReference: "indústrias brasileiras de pequeno e médio porte" },
    reportFocus: "produção, estoque, margem bruta e necessidade de capital de giro",
  },
  comercio: {
    key: "comercio",
    label: "Comércio",
    shortLabel: "Comércio",
    icon: "🛒",
    desc: "Compra e revende mercadorias no varejo, atacado ou distribuição, com foco em CMV, giro, ticket médio e margem por canal.",
    language: { revenue: "vendas", cost: "CMV", customer: "clientes", operation: "operação comercial" },
    indicators: ["CMV", "Margem bruta", "Ticket médio", "Giro de estoque", "Inadimplência"],
    benchmarks: { netMargin: "4–12%", contributionMargin: "22–38%", defaultReference: "empresas comerciais brasileiras" },
    reportFocus: "margem por produto, giro de estoque, ticket médio e saúde do caixa operacional",
  },
  servicos: {
    key: "servicos",
    label: "Serviços",
    shortLabel: "Serviços",
    icon: "🧰",
    desc: "Vende trabalho, conhecimento, tempo ou contratos recorrentes, com foco em produtividade, margem por contrato e inadimplência.",
    language: { revenue: "faturamento de serviços", cost: "CSP e custos de entrega", customer: "clientes", operation: "prestação de serviços" },
    indicators: ["CSP", "Margem de contribuição", "Rentabilidade por cliente", "Prazo médio de recebimento", "Inadimplência"],
    benchmarks: { netMargin: "10–18%", contributionMargin: "30–45%", defaultReference: "empresas brasileiras de serviços" },
    reportFocus: "rentabilidade por cliente, contratos, produtividade e recebimentos",
  },
  construcao: {
    key: "construcao",
    label: "Construção / Obras",
    shortLabel: "Construção",
    icon: "🏗",
    desc: "Opera por obras, medições, fornecedores e centros de custo, exigindo controle forte de caixa, contratos e margem por projeto.",
    language: { revenue: "medições e contratos", cost: "custos de obra e CSP", customer: "contratantes", operation: "obras e projetos" },
    indicators: ["Margem por obra", "CSP", "Medições a receber", "Concentração de clientes", "Capital de giro"],
    benchmarks: { netMargin: "10–18%", contributionMargin: "28–42%", defaultReference: "construção civil e serviços técnicos no Brasil" },
    reportFocus: "obras, medições, fornecedores, concentração de receita e caixa por projeto",
  },
  agro: {
    key: "agro",
    label: "Agro",
    shortLabel: "Agro",
    icon: "🌱",
    desc: "Negócios rurais, insumos, safra, produção ou comercialização agro, com sazonalidade forte e ciclos longos de caixa.",
    language: { revenue: "receita de safra e vendas", cost: "insumos e custos produtivos", customer: "compradores", operation: "ciclo agro" },
    indicators: ["Margem por safra", "Custo por hectare", "Sazonalidade", "Capital de giro", "Endividamento"],
    benchmarks: { netMargin: "8–20%", contributionMargin: "25–45%", defaultReference: "operações agro brasileiras" },
    reportFocus: "sazonalidade, safra, custos produtivos, endividamento e fluxo de caixa por ciclo",
  },
  tecnologia: {
    key: "tecnologia",
    label: "Tecnologia",
    shortLabel: "Tecnologia",
    icon: "💻",
    desc: "Software, SaaS, TI ou produtos digitais, com foco em receita recorrente, margem, churn, CAC e caixa para crescimento.",
    language: { revenue: "receita recorrente e projetos", cost: "custos de entrega e infraestrutura", customer: "clientes", operation: "operação digital" },
    indicators: ["Receita recorrente", "Margem bruta", "Churn", "CAC", "Runway de caixa"],
    benchmarks: { netMargin: "8–20%", contributionMargin: "40–70%", defaultReference: "empresas de tecnologia e SaaS" },
    reportFocus: "recorrência, margem bruta, crescimento, churn e runway",
  },
  saude_educacao: {
    key: "saude_educacao",
    label: "Saúde / Educação / Profissionais",
    shortLabel: "Saúde e Educação",
    icon: "🎓",
    desc: "Clínicas, escolas, cursos, escritórios e profissionais especializados, com foco em agenda, recorrência, ticket e inadimplência.",
    language: { revenue: "mensalidades, consultas e honorários", cost: "custos de atendimento", customer: "pacientes, alunos ou clientes", operation: "atendimento profissional" },
    indicators: ["Receita recorrente", "Ocupação", "Ticket médio", "Inadimplência", "Margem operacional"],
    benchmarks: { netMargin: "12–25%", contributionMargin: "35–55%", defaultReference: "serviços profissionais, saúde e educação no Brasil" },
    reportFocus: "ocupação, recorrência, inadimplência, ticket médio e eficiência do atendimento",
  },
  misto: {
    key: "misto",
    label: "Misto / Multissetorial",
    shortLabel: "Misto",
    icon: "⚙",
    desc: "Combina produtos, serviços ou unidades diferentes, exigindo relatórios por linha de negócio e leitura financeira flexível.",
    language: { revenue: "faturamento", cost: "custos operacionais", customer: "clientes", operation: "operação multissetorial" },
    indicators: ["Mix de receita", "Margem por linha", "Capital de giro", "Inadimplência", "Ponto de equilíbrio"],
    benchmarks: { netMargin: "8–18%", contributionMargin: "28–45%", defaultReference: "PMEs brasileiras multissetoriais" },
    reportFocus: "mix de receita, margem por linha de negócio e equilíbrio entre caixa e competência",
  },
}

const LEGACY_COMPANY_TYPES: Record<string, CompanyType> = {
  produto: "comercio",
  servico: "servicos",
  ambos: "misto",
}

export function normalizeCompanyType(value: string | null): CompanyType {
  if (!value) return "construcao"
  if (value in COMPANY_PROFILES) return value as CompanyType
  return LEGACY_COMPANY_TYPES[value] ?? "construcao"
}

interface CompanyCtx {
  companyType: CompanyType
  setCompanyType: (t: CompanyType) => void
  companyProfile: CompanyProfile
  logoUrl: string | null
  setLogoUrl: (url: string | null) => void
  companyName: string
  setCompanyName: (n: string) => void
}

const Ctx = createContext<CompanyCtx | null>(null)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyType, setCompanyTypeState] = useState<CompanyType>("construcao")
  const [logoUrl, setLogoUrlState] = useState<string | null>(null)
  const [companyName, setCompanyNameState] = useState("Minha Empresa")

  useEffect(() => {
    const t = normalizeCompanyType(window.localStorage.getItem("fp-company-type"))
    const l = window.localStorage.getItem("fp-logo-url")
    const n = window.localStorage.getItem("fp-company-name")
    window.localStorage.setItem("fp-company-type", t)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompanyTypeState(t)
    if (l) setLogoUrlState(l)
    if (n) setCompanyNameState(n)
  }, [])

  function setCompanyType(t: CompanyType) {
    setCompanyTypeState(t)
    localStorage.setItem("fp-company-type", t)
  }
  function setLogoUrl(url: string | null) {
    setLogoUrlState(url)
    if (url) localStorage.setItem("fp-logo-url", url)
    else localStorage.removeItem("fp-logo-url")
  }
  function setCompanyName(n: string) {
    setCompanyNameState(n)
    localStorage.setItem("fp-company-name", n)
  }

  return (
    <Ctx.Provider value={{ companyType, setCompanyType, companyProfile: COMPANY_PROFILES[companyType], logoUrl, setLogoUrl, companyName, setCompanyName }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCompany() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useCompany must be inside CompanyProvider")
  return ctx
}
