export const kpiData = {
  saldoAtual: 284750,
  saldoProjetado: 312400,
  faturamento: 312000,
  faturamentoVar: 8.4,
  lucroLiquido: 18400,
  lucroMargin: 5.9,
  aReceber: 113500,
  aReceberVencido: 28700,
  aPagar: 103200,
  aPagarVencido: 12400,
  inadimplencia: 19.9,
  pontoEquilibrio: 267000,
  ticketMedio: 24600,
  margemContribuicao: 37.4,
  ebitda: 61404,
  capitalGiro: 181550,
}

export const revenueExpenseData = [
  { mes: "Jun", receita: 248000, despesa: 221000 },
  { mes: "Jul", receita: 271000, despesa: 238000 },
  { mes: "Ago", receita: 259000, despesa: 245000 },
  { mes: "Set", receita: 287000, despesa: 251000 },
  { mes: "Out", receita: 295000, despesa: 268000 },
  { mes: "Nov", receita: 301000, despesa: 279000 },
  { mes: "Dez", receita: 328000, despesa: 291000 },
  { mes: "Jan", receita: 279000, despesa: 261000 },
  { mes: "Fev", receita: 264000, despesa: 248000 },
  { mes: "Mar", receita: 308000, despesa: 272000 },
  { mes: "Abr", receita: 289000, despesa: 267000 },
  { mes: "Mai", receita: 312000, despesa: 288000 },
]

export const cashflowProjection = [
  { semana: "S1 Mai", realizado: 284750, projetado: 284750 },
  { semana: "S2 Mai", realizado: 271200, projetado: 271200 },
  { semana: "S3 Mai", realizado: 298400, projetado: 298400 },
  { semana: "S4 Mai", realizado: null, projetado: 312400 },
  { semana: "S1 Jun", realizado: null, projetado: 287600 },
  { semana: "S2 Jun", realizado: null, projetado: 301200 },
  { semana: "S3 Jun", realizado: null, projetado: 318700 },
  { semana: "S4 Jun", realizado: null, projetado: 295100 },
]

export const topClients = [
  { nome: "Construtora Beta", valor: 150000, percent: 48.1 },
  { nome: "J. Silva Empreendimentos", valor: 98000, percent: 31.4 },
  { nome: "Grupo Horizonte", valor: 42000, percent: 13.5 },
  { nome: "RJ Incorporadora", valor: 14000, percent: 4.5 },
  { nome: "Outros", valor: 8000, percent: 2.5 },
]

export const topExpenses = [
  { nome: "Folha de Pagamento", valor: 98400, percent: 34.2 },
  { nome: "Materiais e Insumos", valor: 72800, percent: 25.3 },
  { nome: "Subempreiteiros", valor: 48600, percent: 16.9 },
  { nome: "Aluguel e Locações", valor: 28400, percent: 9.9 },
  { nome: "Impostos e Taxas", valor: 18900, percent: 6.6 },
  { nome: "Outros", valor: 20900, percent: 7.1 },
]

export const alerts = [
  {
    id: "1",
    severity: "critical",
    title: "Caixa negativo projetado",
    message: "Com base nos lançamentos em aberto, o saldo pode ficar negativo em R$ 12.400 na semana de 24/06.",
    action: "Ver fluxo de caixa",
    href: "/cashflow",
  },
  {
    id: "2",
    severity: "warning",
    title: "Inadimplência acima do limite",
    message: "Taxa de 19,9% (R$ 28.700 em atraso). O limite saudável é 5%. 3 clientes concentram 68% do total.",
    action: "Cobrar clientes",
    href: "/receivables",
  },
  {
    id: "3",
    severity: "warning",
    title: "Concentração de receita",
    message: "Construtora Beta representa 48,1% do faturamento. Alta dependência de um único cliente.",
    action: "Ver análise",
    href: "/bi",
  },
  {
    id: "4",
    severity: "info",
    title: "2 contas vencem em 3 dias",
    message: "Total de R$ 8.600 a pagar até 12/05. Verifique o saldo disponível.",
    action: "Ver contas",
    href: "/payables",
  },
]

export const healthDimensions = [
  { nome: "Caixa", nota: 8.2, status: "saudavel", descricao: "Saldo de 1,8x as despesas mensais" },
  { nome: "Lucro", nota: 4.8, status: "risco", descricao: "Margem líquida de 5,9% — abaixo dos 10% ideais" },
  { nome: "Margem", nota: 7.4, status: "saudavel", descricao: "Margem de contribuição de 37,4%" },
  { nome: "Inadimplência", nota: 2.1, status: "critico", descricao: "19,9% — muito acima do limite de 5%" },
  { nome: "Despesas", nota: 6.5, status: "atencao", descricao: "Crescimento de despesas acompanhando receita" },
  { nome: "Crescimento", nota: 7.8, status: "saudavel", descricao: "Faturamento +8,4% vs trimestre anterior" },
  { nome: "Endividamento", nota: 8.5, status: "saudavel", descricao: "Dívidas equivalem a 1,2x a receita mensal" },
  { nome: "Concentração", nota: 3.2, status: "critico", descricao: "Top 3 clientes = 93% — risco muito alto" },
  { nome: "Previsibilidade", nota: 5.9, status: "atencao", descricao: "35% de receita recorrente" },
  { nome: "Disciplina", nota: 9.1, status: "saudavel", descricao: "94% dos lançamentos categorizados" },
]

export const payables = [
  { id: "1", fornecedor: "Aço Nordeste Ltda", descricao: "Aço CA-50 — Obra 07", categoria: "Materiais", vencimento: "2026-05-10", parcela: "3/6", valor: 12400, status: "a_pagar", conta: "Bradesco CC" },
  { id: "2", fornecedor: "Sindicato dos Trabalhadores", descricao: "Contribuição sindical maio", categoria: "Encargos", vencimento: "2026-05-12", parcela: "—", valor: 4200, status: "a_pagar", conta: "Bradesco CC" },
  { id: "3", fornecedor: "Aluguel Imóvel SP", descricao: "Aluguel escritório — maio", categoria: "Aluguel", vencimento: "2026-05-05", parcela: "—", valor: 8400, status: "em_atraso", conta: "Itaú CC" },
  { id: "4", fornecedor: "Cimento Forte Distribuidora", descricao: "Cimento CP-II — 200 sacos", categoria: "Materiais", vencimento: "2026-05-15", parcela: "1/3", valor: 6800, status: "a_pagar", conta: "Bradesco CC" },
  { id: "5", fornecedor: "Folha — Maio/2026", descricao: "Salários colaboradores", categoria: "Folha", vencimento: "2026-05-31", parcela: "—", valor: 98400, status: "a_pagar", conta: "Bradesco CC" },
  { id: "6", fornecedor: "Vivo Telecom", descricao: "Internet e telefonia corporativa", categoria: "Telecom", vencimento: "2026-04-28", parcela: "—", valor: 890, status: "pago", pago_em: "2026-04-27", conta: "Nubank PJ" },
  { id: "7", fornecedor: "AWS Brasil", descricao: "Infraestrutura cloud — abril", categoria: "TI", vencimento: "2026-04-30", parcela: "—", valor: 1240, status: "pago", pago_em: "2026-04-30", conta: "Nubank PJ" },
]

export const receivables = [
  { id: "1", cliente: "Construtora Beta", descricao: "Medição 12 — Obra 07", categoria: "Obras", vencimento: "2026-04-30", dias_atraso: 9, parcela: "—", valor: 150000, status: "em_atraso", conta: "Bradesco CC" },
  { id: "2", cliente: "J. Silva Empreendimentos", descricao: "Contrato mensal — maio", categoria: "Contratos", vencimento: "2026-05-10", dias_atraso: 0, parcela: "—", valor: 98000, status: "a_receber", conta: "Bradesco CC" },
  { id: "3", cliente: "Grupo Horizonte", descricao: "Consultoria técnica", categoria: "Serviços", vencimento: "2026-05-20", dias_atraso: 0, parcela: "2/4", valor: 42000, status: "a_receber", conta: "Itaú CC" },
  { id: "4", cliente: "RJ Incorporadora", descricao: "Projeto estrutural fase 1", categoria: "Projetos", vencimento: "2026-04-15", dias_atraso: 24, parcela: "1/3", valor: 14000, status: "em_atraso", conta: "Bradesco CC" },
  { id: "5", cliente: "Construtora Beta", descricao: "Medição 11 — Obra 07", categoria: "Obras", vencimento: "2026-03-31", dias_atraso: 39, parcela: "—", valor: 28700, status: "em_atraso", conta: "Bradesco CC" },
  { id: "6", cliente: "Grupo Horizonte", descricao: "Consultoria técnica", categoria: "Serviços", vencimento: "2026-04-20", dias_atraso: 0, parcela: "1/4", valor: 42000, status: "recebido", recebido_em: "2026-04-20", conta: "Itaú CC" },
]

export const dreData = [
  {
    id: "receita_bruta",
    label: "Receita Bruta",
    valor: 312000,
    percent: 100,
    tipo: "total",
    filhos: [
      { label: "Receita de obras", valor: 248000, percent: 79.5, filhos: [
        { label: "Obra 07 — Construtora Beta", valor: 150000, percent: 48.1 },
        { label: "Obra 09 — J. Silva", valor: 98000, percent: 31.4 },
      ]},
      { label: "Contratos mensais", valor: 64000, percent: 20.5 },
    ],
  },
  { id: "deducoes", label: "(–) Deduções", valor: -18096, percent: -5.8, tipo: "negativo" },
  { id: "receita_liquida", label: "Receita Líquida", valor: 293904, percent: 94.2, tipo: "resultado" },
  {
    id: "custos_variaveis",
    label: "(–) Custos Variáveis",
    valor: -176800,
    percent: -56.7,
    tipo: "negativo",
    filhos: [
      { label: "Materiais e insumos", valor: -72800, percent: -23.3 },
      { label: "Subempreiteiros", valor: -48600, percent: -15.6 },
      { label: "Mão de obra direta", valor: -55400, percent: -17.8 },
    ],
  },
  { id: "margem_contribuicao", label: "= Margem de Contribuição", valor: 117104, percent: 37.5, tipo: "destaque" },
  {
    id: "despesas_fixas",
    label: "(–) Despesas Fixas",
    valor: -55700,
    percent: -17.9,
    tipo: "negativo",
    filhos: [
      { label: "Folha administrativa", valor: -43000, percent: -13.8 },
      { label: "Aluguel e condomínio", valor: -8400, percent: -2.7 },
      { label: "Telecom e TI", valor: -4300, percent: -1.4 },
    ],
  },
  { id: "resultado_operacional", label: "= Resultado Operacional", valor: 61404, percent: 19.7, tipo: "resultado" },
  { id: "despesas_financeiras", label: "(–) Despesas Financeiras", valor: -17200, percent: -5.5, tipo: "negativo" },
  { id: "retiradas", label: "(–) Retiradas dos Sócios", valor: -25804, percent: -8.3, tipo: "negativo" },
  { id: "lucro_liquido", label: "= LUCRO LÍQUIDO", valor: 18400, percent: 5.9, tipo: "lucro" },
]

export const cashflowTransactions = [
  { data: "2026-05-09", descricao: "Recebimento Construtora Beta", categoria: "Obras", conta: "Bradesco CC", entrada: 50000, saida: null, saldo: 334750 },
  { data: "2026-05-09", descricao: "Folha — adiantamento", categoria: "Folha", conta: "Bradesco CC", entrada: null, saida: 49200, saldo: 285550 },
  { data: "2026-05-08", descricao: "Materiais — Aço Nordeste", categoria: "Materiais", conta: "Bradesco CC", entrada: null, saida: 12400, saldo: 334750 },
  { data: "2026-05-08", descricao: "J. Silva — parcela contrato", categoria: "Contratos", conta: "Bradesco CC", entrada: 32000, saida: null, saldo: 347150 },
  { data: "2026-05-07", descricao: "Aluguel escritório SP", categoria: "Aluguel", conta: "Itaú CC", entrada: null, saida: 8400, saldo: 315150 },
  { data: "2026-05-07", descricao: "Grupo Horizonte — consultoria", categoria: "Serviços", conta: "Itaú CC", entrada: 42000, saida: null, saldo: 323550 },
  { data: "2026-05-06", descricao: "Cimento Forte — insumos", categoria: "Materiais", conta: "Bradesco CC", entrada: null, saida: 6800, saldo: 281550 },
  { data: "2026-05-05", descricao: "Taxa bancária maio", categoria: "Taxas", conta: "Bradesco CC", entrada: null, saida: 280, saldo: 288350 },
]
