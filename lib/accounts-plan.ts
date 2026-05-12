/**
 * Plano de Contas padrão para PMEs brasileiras
 * Baseado em: NBC TG, CPC, Resolução CFC 1.055/05
 * Estrutura compatível com DRE gerencial e contábil
 */

export type ContaGrupo =
  | "receita_bruta"
  | "deducoes"
  | "cst_servicos"
  | "cst_mercadorias"
  | "desp_pessoal"
  | "desp_administrativa"
  | "desp_comercial"
  | "desp_impostos"
  | "outras_receitas"
  | "desp_financeira"
  | "rec_financeira"
  | "depreciacao"
  | "ir_csll"
  | "investimento"
  | "emprestimo"
  | "socio"
  | "transferencia"

export type ContaNatureza = "receita" | "custo" | "despesa" | "neutro"
export type ContaDRE = "receita_bruta" | "deducoes" | "lucro_bruto" | "desp_operacional" | "ebitda" | "resultado_financeiro" | "lair" | "lucro_liquido" | "nao_afeta"

export interface Conta {
  codigo: string
  nome: string
  grupo: ContaGrupo
  natureza: ContaNatureza
  posicaoDRE: ContaDRE
  afetaCaixa: boolean
  afetaDRE: boolean
  cor: string
  ativa: boolean
  descricao?: string
  filhos?: Conta[]
}

export const GRUPOS_DRE: Record<ContaGrupo, { label: string; cor: string; posicao: ContaDRE; sinal: 1 | -1 }> = {
  receita_bruta:     { label:"Receita Bruta",                     cor:"#10B981", posicao:"receita_bruta",      sinal:  1 },
  deducoes:          { label:"Deduções da Receita",               cor:"#F59E0B", posicao:"deducoes",           sinal: -1 },
  cst_mercadorias:   { label:"CMV — Custo das Mercadorias",       cor:"#EF4444", posicao:"lucro_bruto",        sinal: -1 },
  cst_servicos:      { label:"CSP — Custo dos Serviços",          cor:"#F87171", posicao:"lucro_bruto",        sinal: -1 },
  desp_pessoal:      { label:"Despesas com Pessoal",              cor:"#8B5CF6", posicao:"desp_operacional",   sinal: -1 },
  desp_administrativa:{ label:"Despesas Administrativas",         cor:"#7C3AED", posicao:"desp_operacional",   sinal: -1 },
  desp_comercial:    { label:"Despesas Comerciais / Marketing",   cor:"#EC4899", posicao:"desp_operacional",   sinal: -1 },
  desp_impostos:     { label:"Impostos e Taxas sobre Resultado",  cor:"#6B7280", posicao:"desp_operacional",   sinal: -1 },
  outras_receitas:   { label:"Outras Receitas Operacionais",      cor:"#34D399", posicao:"desp_operacional",   sinal:  1 },
  desp_financeira:   { label:"Despesas Financeiras",              cor:"#4F46E5", posicao:"resultado_financeiro",sinal: -1 },
  rec_financeira:    { label:"Receitas Financeiras",              cor:"#60A5FA", posicao:"resultado_financeiro",sinal:  1 },
  depreciacao:       { label:"Depreciação e Amortização",         cor:"#9CA3AF", posicao:"ebitda",             sinal: -1 },
  ir_csll:           { label:"IR e CSLL",                         cor:"#374151", posicao:"lair",               sinal: -1 },
  investimento:      { label:"Investimentos / Imobilizado",       cor:"#3B82F6", posicao:"nao_afeta",          sinal:  1 },
  emprestimo:        { label:"Empréstimos e Financiamentos",      cor:"#FCD34D", posicao:"nao_afeta",          sinal:  1 },
  socio:             { label:"Movimentações de Sócios",           cor:"#DB2777", posicao:"nao_afeta",          sinal:  1 },
  transferencia:     { label:"Transferências Internas",           cor:"#6B7280", posicao:"nao_afeta",          sinal:  1 },
}

export const planoDeConta: Conta[] = [
  /* ─── 1. RECEITAS ─────────────────────────────────────── */
  {
    codigo:"3.1", nome:"Receita Bruta de Vendas e Serviços", grupo:"receita_bruta", natureza:"receita",
    posicaoDRE:"receita_bruta", afetaDRE:true, afetaCaixa:true, cor:"#10B981", ativa:true,
    descricao:"Totalidade das receitas geradas pela atividade principal da empresa",
    filhos:[
      { codigo:"3.1.1", nome:"Venda de Mercadorias / Produtos", grupo:"receita_bruta", natureza:"receita", posicaoDRE:"receita_bruta", afetaDRE:true, afetaCaixa:true, cor:"#10B981", ativa:true },
      { codigo:"3.1.2", nome:"Prestação de Serviços",           grupo:"receita_bruta", natureza:"receita", posicaoDRE:"receita_bruta", afetaDRE:true, afetaCaixa:true, cor:"#10B981", ativa:true },
      { codigo:"3.1.3", nome:"Contratos e Projetos",            grupo:"receita_bruta", natureza:"receita", posicaoDRE:"receita_bruta", afetaDRE:true, afetaCaixa:true, cor:"#34D399", ativa:true },
      { codigo:"3.1.4", nome:"Receita de Locações",             grupo:"receita_bruta", natureza:"receita", posicaoDRE:"receita_bruta", afetaDRE:true, afetaCaixa:true, cor:"#6EE7B7", ativa:true },
      { codigo:"3.1.5", nome:"Contratos Mensais / Recorrentes", grupo:"receita_bruta", natureza:"receita", posicaoDRE:"receita_bruta", afetaDRE:true, afetaCaixa:true, cor:"#34D399", ativa:true },
    ]
  },
  {
    codigo:"3.2", nome:"Deduções da Receita Bruta", grupo:"deducoes", natureza:"receita",
    posicaoDRE:"deducoes", afetaDRE:true, afetaCaixa:false, cor:"#F59E0B", ativa:true,
    descricao:"Impostos incidentes sobre receita e devoluções",
    filhos:[
      { codigo:"3.2.1", nome:"ISS — Imposto sobre Serviços",              grupo:"deducoes", natureza:"receita", posicaoDRE:"deducoes", afetaDRE:true, afetaCaixa:false, cor:"#F59E0B", ativa:true },
      { codigo:"3.2.2", nome:"PIS e COFINS sobre Faturamento",            grupo:"deducoes", natureza:"receita", posicaoDRE:"deducoes", afetaDRE:true, afetaCaixa:false, cor:"#F59E0B", ativa:true },
      { codigo:"3.2.3", nome:"ICMS sobre Vendas",                         grupo:"deducoes", natureza:"receita", posicaoDRE:"deducoes", afetaDRE:true, afetaCaixa:false, cor:"#FCD34D", ativa:true },
      { codigo:"3.2.4", nome:"Devoluções e Abatimentos",                  grupo:"deducoes", natureza:"receita", posicaoDRE:"deducoes", afetaDRE:true, afetaCaixa:false, cor:"#FDE68A", ativa:true },
      { codigo:"3.2.5", nome:"Simples Nacional — Parcela s/ Receita",     grupo:"deducoes", natureza:"receita", posicaoDRE:"deducoes", afetaDRE:true, afetaCaixa:true,  cor:"#F59E0B", ativa:true },
    ]
  },

  /* ─── 2. CUSTOS ────────────────────────────────────────── */
  {
    codigo:"4.1", nome:"Custo dos Serviços Prestados (CSP)", grupo:"cst_servicos", natureza:"custo",
    posicaoDRE:"lucro_bruto", afetaDRE:true, afetaCaixa:true, cor:"#EF4444", ativa:true,
    descricao:"Custos diretamente vinculados à entrega do serviço ou projeto",
    filhos:[
      { codigo:"4.1.1", nome:"Mão de Obra Direta",                grupo:"cst_servicos", natureza:"custo", posicaoDRE:"lucro_bruto", afetaDRE:true, afetaCaixa:true, cor:"#EF4444", ativa:true },
      { codigo:"4.1.2", nome:"Subcontratados e Terceiros",         grupo:"cst_servicos", natureza:"custo", posicaoDRE:"lucro_bruto", afetaDRE:true, afetaCaixa:true, cor:"#F87171", ativa:true },
      { codigo:"4.1.3", nome:"Materiais e Insumos de Produção",    grupo:"cst_servicos", natureza:"custo", posicaoDRE:"lucro_bruto", afetaDRE:true, afetaCaixa:true, cor:"#FCA5A5", ativa:true },
      { codigo:"4.1.4", nome:"Fretes e Logística (Custo)",         grupo:"cst_servicos", natureza:"custo", posicaoDRE:"lucro_bruto", afetaDRE:true, afetaCaixa:true, cor:"#F87171", ativa:true },
    ]
  },
  {
    codigo:"4.2", nome:"Custo das Mercadorias Vendidas (CMV)", grupo:"cst_mercadorias", natureza:"custo",
    posicaoDRE:"lucro_bruto", afetaDRE:true, afetaCaixa:true, cor:"#DC2626", ativa:true,
    descricao:"Custo de aquisição das mercadorias efetivamente vendidas",
    filhos:[
      { codigo:"4.2.1", nome:"Custo de Aquisição de Mercadorias", grupo:"cst_mercadorias", natureza:"custo", posicaoDRE:"lucro_bruto", afetaDRE:true, afetaCaixa:true, cor:"#DC2626", ativa:true },
      { codigo:"4.2.2", nome:"Fretes de Compra",                  grupo:"cst_mercadorias", natureza:"custo", posicaoDRE:"lucro_bruto", afetaDRE:true, afetaCaixa:true, cor:"#EF4444", ativa:true },
      { codigo:"4.2.3", nome:"Embalagens",                        grupo:"cst_mercadorias", natureza:"custo", posicaoDRE:"lucro_bruto", afetaDRE:true, afetaCaixa:true, cor:"#F87171", ativa:true },
    ]
  },

  /* ─── 3. DESPESAS OPERACIONAIS ─────────────────────────── */
  {
    codigo:"5.1", nome:"Despesas com Pessoal", grupo:"desp_pessoal", natureza:"despesa",
    posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#8B5CF6", ativa:true,
    descricao:"Todos os custos relacionados a colaboradores (CLT, PJ, Sócios)",
    filhos:[
      { codigo:"5.1.1", nome:"Salários e Ordenados",              grupo:"desp_pessoal", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#8B5CF6", ativa:true },
      { codigo:"5.1.2", nome:"Encargos Sociais (INSS, FGTS)",     grupo:"desp_pessoal", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#7C3AED", ativa:true },
      { codigo:"5.1.3", nome:"Vale-Transporte",                   grupo:"desp_pessoal", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#A78BFA", ativa:true },
      { codigo:"5.1.4", nome:"Vale-Refeição / Alimentação",       grupo:"desp_pessoal", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#A78BFA", ativa:true },
      { codigo:"5.1.5", nome:"Plano de Saúde e Odonto",           grupo:"desp_pessoal", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#C4B5FD", ativa:true },
      { codigo:"5.1.6", nome:"Pró-labore dos Sócios",             grupo:"desp_pessoal", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#8B5CF6", ativa:true },
      { codigo:"5.1.7", nome:"Treinamentos e Capacitação",        grupo:"desp_pessoal", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#C4B5FD", ativa:true },
      { codigo:"5.1.8", nome:"Rescisões Trabalhistas",            grupo:"desp_pessoal", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#7C3AED", ativa:true },
    ]
  },
  {
    codigo:"5.2", nome:"Despesas Administrativas", grupo:"desp_administrativa", natureza:"despesa",
    posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#7C3AED", ativa:true,
    descricao:"Despesas gerais de operação e manutenção do negócio",
    filhos:[
      { codigo:"5.2.1", nome:"Aluguel e Condomínio",              grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#7C3AED", ativa:true },
      { codigo:"5.2.2", nome:"Energia Elétrica e Água",           grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#8B5CF6", ativa:true },
      { codigo:"5.2.3", nome:"Telefonia e Internet",              grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#A78BFA", ativa:true },
      { codigo:"5.2.4", nome:"Material de Escritório e Limpeza",  grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#C4B5FD", ativa:true },
      { codigo:"5.2.5", nome:"Honorários Contábeis e Jurídicos",  grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#7C3AED", ativa:true },
      { codigo:"5.2.6", nome:"Seguros",                           grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#8B5CF6", ativa:true },
      { codigo:"5.2.7", nome:"Manutenção e Conservação",          grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#A78BFA", ativa:true },
      { codigo:"5.2.8", nome:"Softwares, Sistemas e Assinaturas", grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#C4B5FD", ativa:true },
      { codigo:"5.2.9", nome:"Despesas com Viagens e Diárias",    grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#7C3AED", ativa:true },
      { codigo:"5.2.10",nome:"Serviços de Limpeza e Conservação", grupo:"desp_administrativa", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#8B5CF6", ativa:true },
    ]
  },
  {
    codigo:"5.3", nome:"Despesas Comerciais e Marketing", grupo:"desp_comercial", natureza:"despesa",
    posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#EC4899", ativa:true,
    descricao:"Despesas relacionadas a vendas, captação e relacionamento com clientes",
    filhos:[
      { codigo:"5.3.1", nome:"Comissões sobre Vendas",            grupo:"desp_comercial", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#EC4899", ativa:true },
      { codigo:"5.3.2", nome:"Marketing e Publicidade Digital",   grupo:"desp_comercial", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#DB2777", ativa:true },
      { codigo:"5.3.3", nome:"Eventos e Feiras",                  grupo:"desp_comercial", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#F472B6", ativa:true },
      { codigo:"5.3.4", nome:"Brindes e Amostras Grátis",         grupo:"desp_comercial", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#FBCFE8", ativa:true },
      { codigo:"5.3.5", nome:"Fretes de Entrega (Venda)",         grupo:"desp_comercial", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#EC4899", ativa:true },
    ]
  },
  {
    codigo:"5.4", nome:"Impostos, Taxas e Contribuições", grupo:"desp_impostos", natureza:"despesa",
    posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#6B7280", ativa:true,
    descricao:"Tributos não relacionados diretamente à receita",
    filhos:[
      { codigo:"5.4.1", nome:"Simples Nacional — Parcela Apurada",grupo:"desp_impostos", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#6B7280", ativa:true },
      { codigo:"5.4.2", nome:"IPTU",                              grupo:"desp_impostos", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#9CA3AF", ativa:true },
      { codigo:"5.4.3", nome:"IPVA",                              grupo:"desp_impostos", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#9CA3AF", ativa:true },
      { codigo:"5.4.4", nome:"Taxas Municipais e Licenças",       grupo:"desp_impostos", natureza:"despesa", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#D1D5DB", ativa:true },
    ]
  },
  {
    codigo:"5.5", nome:"Outras Receitas Operacionais", grupo:"outras_receitas", natureza:"receita",
    posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#34D399", ativa:true,
    filhos:[
      { codigo:"5.5.1", nome:"Juros e Rendimentos Ativos",        grupo:"outras_receitas", natureza:"receita", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#34D399", ativa:true },
      { codigo:"5.5.2", nome:"Recuperação de Despesas",           grupo:"outras_receitas", natureza:"receita", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#6EE7B7", ativa:true },
      { codigo:"5.5.3", nome:"Venda de Ativo Imobilizado",        grupo:"outras_receitas", natureza:"receita", posicaoDRE:"desp_operacional", afetaDRE:true, afetaCaixa:true, cor:"#A7F3D0", ativa:true },
    ]
  },
  {
    codigo:"5.6", nome:"Depreciação e Amortização", grupo:"depreciacao", natureza:"despesa",
    posicaoDRE:"ebitda", afetaDRE:true, afetaCaixa:false, cor:"#9CA3AF", ativa:true,
    descricao:"Não é desembolso financeiro — apenas reduz o lucro contábil",
    filhos:[
      { codigo:"5.6.1", nome:"Depreciação de Imobilizado",        grupo:"depreciacao", natureza:"despesa", posicaoDRE:"ebitda", afetaDRE:true, afetaCaixa:false, cor:"#9CA3AF", ativa:true },
      { codigo:"5.6.2", nome:"Amortização de Intangíveis",        grupo:"depreciacao", natureza:"despesa", posicaoDRE:"ebitda", afetaDRE:true, afetaCaixa:false, cor:"#D1D5DB", ativa:true },
    ]
  },

  /* ─── 4. RESULTADO FINANCEIRO ──────────────────────────── */
  {
    codigo:"6.1", nome:"Receitas Financeiras", grupo:"rec_financeira", natureza:"receita",
    posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#60A5FA", ativa:true,
    filhos:[
      { codigo:"6.1.1", nome:"Rendimentos de Aplicações Financeiras", grupo:"rec_financeira", natureza:"receita", posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#60A5FA", ativa:true },
      { codigo:"6.1.2", nome:"Juros Ativos Recebidos",                grupo:"rec_financeira", natureza:"receita", posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#93C5FD", ativa:true },
      { codigo:"6.1.3", nome:"Descontos Obtidos de Fornecedores",     grupo:"rec_financeira", natureza:"receita", posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#BFDBFE", ativa:true },
    ]
  },
  {
    codigo:"6.2", nome:"Despesas Financeiras", grupo:"desp_financeira", natureza:"despesa",
    posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#4F46E5", ativa:true,
    descricao:"Custos de capital e bancários",
    filhos:[
      { codigo:"6.2.1", nome:"Juros sobre Empréstimos e Financiamentos", grupo:"desp_financeira", natureza:"despesa", posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#4F46E5", ativa:true },
      { codigo:"6.2.2", nome:"IOF",                                       grupo:"desp_financeira", natureza:"despesa", posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#6366F1", ativa:true },
      { codigo:"6.2.3", nome:"Tarifas Bancárias e CET",                   grupo:"desp_financeira", natureza:"despesa", posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#818CF8", ativa:true },
      { codigo:"6.2.4", nome:"Multas e Juros de Mora",                    grupo:"desp_financeira", natureza:"despesa", posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#A5B4FC", ativa:true },
      { codigo:"6.2.5", nome:"Descontos Concedidos a Clientes",           grupo:"desp_financeira", natureza:"despesa", posicaoDRE:"resultado_financeiro", afetaDRE:true, afetaCaixa:true, cor:"#C7D2FE", ativa:true },
    ]
  },

  /* ─── 5. IR E CSLL ─────────────────────────────────────── */
  {
    codigo:"7.1", nome:"IR e CSLL", grupo:"ir_csll", natureza:"despesa",
    posicaoDRE:"lair", afetaDRE:true, afetaCaixa:true, cor:"#374151", ativa:true,
    filhos:[
      { codigo:"7.1.1", nome:"IRPJ — Imposto de Renda",           grupo:"ir_csll", natureza:"despesa", posicaoDRE:"lair", afetaDRE:true, afetaCaixa:true, cor:"#374151", ativa:true },
      { codigo:"7.1.2", nome:"CSLL — Contribuição Social",        grupo:"ir_csll", natureza:"despesa", posicaoDRE:"lair", afetaDRE:true, afetaCaixa:true, cor:"#4B5563", ativa:true },
    ]
  },

  /* ─── 6. NÃO AFETA DRE ─────────────────────────────────── */
  {
    codigo:"8.1", nome:"Investimentos e Imobilizado", grupo:"investimento", natureza:"neutro",
    posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#3B82F6", ativa:true,
    filhos:[
      { codigo:"8.1.1", nome:"Compra de Equipamentos e Máquinas", grupo:"investimento", natureza:"neutro", posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#3B82F6", ativa:true },
      { codigo:"8.1.2", nome:"Compra de Veículos",                grupo:"investimento", natureza:"neutro", posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#60A5FA", ativa:true },
      { codigo:"8.1.3", nome:"Reformas e Benfeitorias",           grupo:"investimento", natureza:"neutro", posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#93C5FD", ativa:true },
    ]
  },
  {
    codigo:"8.2", nome:"Empréstimos e Financiamentos", grupo:"emprestimo", natureza:"neutro",
    posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#FCD34D", ativa:true,
    filhos:[
      { codigo:"8.2.1", nome:"Captação de Empréstimos (entrada)", grupo:"emprestimo", natureza:"neutro", posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#FCD34D", ativa:true },
      { codigo:"8.2.2", nome:"Amortização de Principal",          grupo:"emprestimo", natureza:"neutro", posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#FDE68A", ativa:true },
    ]
  },
  {
    codigo:"8.3", nome:"Movimentações de Sócios", grupo:"socio", natureza:"neutro",
    posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#DB2777", ativa:true,
    filhos:[
      { codigo:"8.3.1", nome:"Aporte de Capital dos Sócios",      grupo:"socio", natureza:"neutro", posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#DB2777", ativa:true },
      { codigo:"8.3.2", nome:"Retirada de Lucros / Dividendos",   grupo:"socio", natureza:"neutro", posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:true, cor:"#F472B6", ativa:true },
    ]
  },
  {
    codigo:"8.4", nome:"Transferências Internas", grupo:"transferencia", natureza:"neutro",
    posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:false, cor:"#6B7280", ativa:true,
    filhos:[
      { codigo:"8.4.1", nome:"Transferência entre Contas Próprias",grupo:"transferencia", natureza:"neutro", posicaoDRE:"nao_afeta", afetaDRE:false, afetaCaixa:false, cor:"#6B7280", ativa:true },
    ]
  },
]

/** Totais mockados por categoria para relatórios */
export const gastoPorCategoria = [
  { categoria:"Despesas com Pessoal",      valor:141400, pct:49.1, var:"+5,2%", grupo:"desp_pessoal",       cor:"#8B5CF6" },
  { categoria:"Despesas Administrativas",  valor:61200,  pct:21.3, var:"+2,8%", grupo:"desp_administrativa", cor:"#7C3AED" },
  { categoria:"Custo dos Serviços (CSP)",  valor:48600,  pct:16.9, var:"-1,4%", grupo:"cst_servicos",        cor:"#EF4444" },
  { categoria:"Desp. Comerciais/Marketing",valor:18900,  pct:6.6,  var:"+12,1%",grupo:"desp_comercial",      cor:"#EC4899" },
  { categoria:"Impostos e Taxas",          valor:12400,  pct:4.3,  var:"+0,8%", grupo:"desp_impostos",       cor:"#6B7280" },
  { categoria:"Despesas Financeiras",      valor:5500,   pct:1.9,  var:"-3,2%", grupo:"desp_financeira",     cor:"#4F46E5" },
]

export const receitaPorCategoria = [
  { categoria:"Prestação de Serviços",     valor:248000, pct:79.5, var:"+8,4%", cor:"#10B981" },
  { categoria:"Contratos Mensais",         valor:64000,  pct:20.5, var:"+2,1%", cor:"#34D399" },
  { categoria:"Receita de Locações",       valor:0,      pct:0,    var:"—",     cor:"#6EE7B7" },
  { categoria:"Venda de Mercadorias",      valor:0,      pct:0,    var:"—",     cor:"#A7F3D0" },
]
