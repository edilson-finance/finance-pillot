import type { ExportColumn } from "@/lib/export"
import type { ReportsData, OpenRow, TxnRow } from "@/lib/reports-data"
import { formatCurrency, formatDate } from "@/lib/utils"

const R = formatCurrency

export type ReportId =
  | "dre" | "cashflow" | "payables" | "receivables" | "inadimplencia"
  | "byCategory" | "byExpense" | "byCostCenter" | "byClient" | "bySupplier"
  | "conciliacao" | "balancete" | "repasses"

export type GroupBy = "detalhado" | "dia" | "semana" | "mes" | "trimestre" | "ano"

export interface Filters {
  categoria: string
  centroCusto: string
  party: string
  status: string
  grupo: GroupBy
}

export interface FilterSpec {
  categoria?: boolean
  centroCusto?: boolean
  party?: "cliente" | "fornecedor"
  status?: "receivable" | "payable"
  grupo?: boolean
}

export interface ReportMeta {
  id: ReportId
  label: string
  desc: string
  icon: string
  filters: FilterSpec
}

export interface BuiltReport {
  columns: ExportColumn<any>[]
  rows: any[]
}

export const REPORT_METAS: ReportMeta[] = [
  { id: "dre",          label: "DRE Gerencial",          desc: "Demonstrativo de resultado por competência",      icon: "FileText",      filters: { categoria: true, centroCusto: true } },
  { id: "cashflow",     label: "Fluxo de Caixa",         desc: "Entradas, saídas e saldo realizado",              icon: "TrendingUp",    filters: { categoria: true, centroCusto: true, party: "cliente", grupo: true } },
  { id: "payables",     label: "Contas a Pagar",         desc: "Obrigações e pagamentos do período",              icon: "TrendingDown",  filters: { categoria: true, centroCusto: true, party: "fornecedor", status: "payable" } },
  { id: "receivables",  label: "Contas a Receber",       desc: "Receitas e recebimentos do período",              icon: "TrendingUp",    filters: { categoria: true, centroCusto: true, party: "cliente", status: "receivable" } },
  { id: "inadimplencia",label: "Inadimplência",          desc: "Aging report e análise de atrasos",               icon: "AlertTriangle", filters: { categoria: true, centroCusto: true, party: "cliente" } },
  { id: "byCategory",   label: "Receitas por Categoria", desc: "Faturamento agrupado por categoria",              icon: "BarChart2",     filters: { centroCusto: true, party: "cliente", status: "receivable" } },
  { id: "byExpense",    label: "Despesas por Categoria", desc: "Custos agrupados por categoria",                  icon: "BarChart2",     filters: { centroCusto: true, party: "fornecedor", status: "payable" } },
  { id: "byCostCenter", label: "Por Centro de Custo",    desc: "Resultado por obra, departamento ou projeto",     icon: "BarChart2",     filters: { categoria: true } },
  { id: "byClient",     label: "Por Cliente",            desc: "Receita e inadimplência por cliente",             icon: "Users",         filters: { categoria: true, centroCusto: true, status: "receivable" } },
  { id: "bySupplier",   label: "Por Fornecedor",         desc: "Pagamentos e concentração de fornecedores",       icon: "Truck",         filters: { categoria: true, centroCusto: true, status: "payable" } },
  { id: "conciliacao",  label: "Conciliação Bancária",   desc: "Movimento por conta no período",                  icon: "RefreshCw",     filters: { categoria: true } },
  { id: "balancete",    label: "Balancete Financeiro",   desc: "Saldo inicial, movimento e saldo final por conta", icon: "FileText",     filters: {} },
  { id: "repasses",     label: "Repasses por Parceiro",  desc: "Quanto é repasse e quanto é comissão, por recebedor", icon: "Users",     filters: { categoria: true, centroCusto: true, status: "receivable" } },
]

export const STATUS_OPTIONS: Record<"receivable" | "payable", { value: string; label: string }[]> = {
  receivable: [
    { value: "a_receber", label: "A receber" },
    { value: "em_atraso", label: "Em atraso" },
    { value: "recebido_parcial", label: "Recebido parcial" },
    { value: "recebido", label: "Recebido" },
  ],
  payable: [
    { value: "a_pagar", label: "A pagar" },
    { value: "em_atraso", label: "Em atraso" },
    { value: "pago_parcial", label: "Pago parcial" },
    { value: "pago", label: "Pago" },
  ],
}

const STATUS_LABEL: Record<string, string> = {
  a_receber: "A receber", a_pagar: "A pagar", em_atraso: "Em atraso",
  recebido: "Recebido", pago: "Pago",
  recebido_parcial: "Recebido parcial", pago_parcial: "Pago parcial",
}

// ---------- helpers ----------

const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0)
const pct = (v: number, total: number) => (total !== 0 ? (v / total) * 100 : 0)
const fmtPct = (v: number) => `${v >= 0 ? "" : "-"}${Math.abs(v).toFixed(1)}%`

function daysLate(dueDate: string): number {
  const [y, m, d] = dueDate.split("-").map(Number)
  const due = new Date(y, m - 1, d).getTime()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((today.getTime() - due) / 86400000))
}

function agingBucket(dias: number): string {
  if (dias <= 30) return "1–30 dias"
  if (dias <= 60) return "31–60 dias"
  if (dias <= 90) return "61–90 dias"
  return "90+ dias"
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

function periodKey(dateStr: string, grupo: GroupBy): { key: string; label: string; sort: string } {
  const [y, m, d] = dateStr.split("-").map(Number)
  switch (grupo) {
    case "dia":
      return { key: dateStr, label: formatDate(dateStr), sort: dateStr }
    case "semana": {
      const dt = new Date(y, m - 1, d)
      const dow = (dt.getDay() + 6) % 7 // segunda = 0
      const monday = new Date(dt); monday.setDate(dt.getDate() - dow)
      const k = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`
      return { key: k, label: `Semana de ${formatDate(k)}`, sort: k }
    }
    case "trimestre": {
      const q = Math.ceil(m / 3)
      return { key: `${y}-T${q}`, label: `${q}º trim. ${y}`, sort: `${y}-${q}` }
    }
    case "ano":
      return { key: `${y}`, label: `${y}`, sort: `${y}` }
    case "mes":
    default:
      return { key: `${y}-${m}`, label: `${MONTHS[m - 1]}/${y}`, sort: `${y}-${String(m).padStart(2, "0")}` }
  }
}

function filterOpen(rows: OpenRow[], f: Filters, spec: FilterSpec): OpenRow[] {
  return rows.filter((r) => {
    if (spec.categoria && f.categoria && r.categoryId !== f.categoria) return false
    if (spec.centroCusto && f.centroCusto && r.costCenterId !== f.centroCusto) return false
    if (spec.party && f.party && r.partyId !== f.party) return false
    if (spec.status && f.status && r.status !== f.status) return false
    return true
  })
}

function filterTxn(rows: TxnRow[], f: Filters, spec: FilterSpec): TxnRow[] {
  return rows.filter((t) => {
    if (spec.categoria && f.categoria && t.categoryId !== f.categoria) return false
    if (spec.centroCusto && f.centroCusto && t.costCenterId !== f.centroCusto) return false
    if (spec.party && f.party && t.customerId !== f.party && t.supplierId !== f.party) return false
    return true
  })
}

// agrega por chave -> { nome, valor, qtd }
function groupBy<T>(rows: T[], keyFn: (r: T) => string, valFn: (r: T) => number) {
  const m = new Map<string, { nome: string; valor: number; qtd: number }>()
  for (const r of rows) {
    const nome = keyFn(r)
    const cur = m.get(nome) ?? { nome, valor: 0, qtd: 0 }
    cur.valor += valFn(r)
    cur.qtd += 1
    m.set(nome, cur)
  }
  return [...m.values()].sort((a, b) => b.valor - a.valor)
}

// ---------- builders ----------

function buildDre(data: ReportsData, f: Filters): BuiltReport {
  const spec: FilterSpec = REPORT_METAS[0].filters
  const rec = filterOpen(data.receivables, f, spec)
  const pay = filterOpen(data.payables, f, spec)
  const receita = sum(rec.map((r) => r.amount))
  const despesa = sum(pay.map((r) => r.amount))
  const recCat = groupBy(rec, (r) => r.categoryName, (r) => r.amount)
  const payCat = groupBy(pay, (r) => r.categoryName, (r) => r.amount)

  type Row = { conta: string; valor: number; pct: number | null; bold?: boolean }
  const rows: Row[] = []
  rows.push({ conta: "Receita Bruta", valor: receita, pct: 100, bold: true })
  for (const c of recCat) rows.push({ conta: `    ${c.nome}`, valor: c.valor, pct: pct(c.valor, receita) })
  rows.push({ conta: "(–) Custos e Despesas", valor: -despesa, pct: receita ? pct(-despesa, receita) : null, bold: true })
  for (const c of payCat) rows.push({ conta: `    ${c.nome}`, valor: -c.valor, pct: receita ? pct(-c.valor, receita) : null })
  rows.push({ conta: "= Lucro Líquido", valor: receita - despesa, pct: receita ? pct(receita - despesa, receita) : null, bold: true })

  return {
    columns: [
      { header: "Conta / Descrição", value: (r) => r.conta },
      { header: "Valor", value: (r) => R(r.valor), align: "right" },
      { header: "% Receita", value: (r) => (r.pct == null ? "—" : fmtPct(r.pct)), align: "right" },
    ],
    rows,
  }
}

function buildCashflow(data: ReportsData, f: Filters): BuiltReport {
  const spec: FilterSpec = REPORT_METAS[1].filters
  const txns = filterTxn(data.transactions, f, spec).filter((t) => t.type === "entrada" || t.type === "saida")
  const base = sum(data.accounts.map((a) => a.openingBalance))

  if (f.grupo === "detalhado") {
    const sorted = [...txns].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    let saldo = base
    const rows = sorted.map((t) => {
      const entrada = t.type === "entrada" ? t.amount : 0
      const saida = t.type === "saida" ? t.amount : 0
      saldo += entrada - saida
      return { data: t.date, descricao: t.description || "—", categoria: t.categoryName, entrada, saida, saldo }
    }).reverse()
    return {
      columns: [
        { header: "Data", value: (r) => formatDate(r.data) },
        { header: "Descrição", value: (r) => r.descricao },
        { header: "Categoria", value: (r) => r.categoria },
        { header: "Entrada", value: (r) => (r.entrada ? R(r.entrada) : "—"), align: "right" },
        { header: "Saída", value: (r) => (r.saida ? R(r.saida) : "—"), align: "right" },
        { header: "Saldo", value: (r) => R(r.saldo), align: "right" },
      ],
      rows,
    }
  }

  // agrupado por período
  const m = new Map<string, { label: string; sort: string; entrada: number; saida: number }>()
  for (const t of txns) {
    const { key, label, sort } = periodKey(t.date, f.grupo)
    const cur = m.get(key) ?? { label, sort, entrada: 0, saida: 0 }
    if (t.type === "entrada") cur.entrada += t.amount
    else cur.saida += t.amount
    m.set(key, cur)
  }
  const ordered = [...m.values()].sort((a, b) => (a.sort < b.sort ? -1 : 1))
  let saldo = base
  const rows = ordered.map((p) => {
    saldo += p.entrada - p.saida
    return { periodo: p.label, entrada: p.entrada, saida: p.saida, resultado: p.entrada - p.saida, saldo }
  })
  return {
    columns: [
      { header: "Período", value: (r) => r.periodo },
      { header: "Entradas", value: (r) => R(r.entrada), align: "right" },
      { header: "Saídas", value: (r) => R(r.saida), align: "right" },
      { header: "Resultado", value: (r) => R(r.resultado), align: "right" },
      { header: "Saldo acum.", value: (r) => R(r.saldo), align: "right" },
    ],
    rows,
  }
}

function openItemReport(rows: OpenRow[], partyHeader: string): BuiltReport {
  return {
    columns: [
      { header: partyHeader, value: (r) => r.partyName },
      { header: "Categoria", value: (r) => r.categoryName },
      { header: "Centro de Custo", value: (r) => r.costCenterName },
      { header: "Vencimento", value: (r) => formatDate(r.dueDate) },
      { header: "Valor", value: (r) => R(r.amount), align: "right" },
      { header: "Status", value: (r) => STATUS_LABEL[r.status] ?? r.status },
    ],
    rows: [...rows].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
  }
}

function buildInadimplencia(data: ReportsData, f: Filters): BuiltReport {
  const spec: FilterSpec = REPORT_METAS[4].filters
  const rows = filterOpen(data.receivables, f, spec)
    .filter((r) => r.status === "em_atraso")
    .map((r) => ({ ...r, dias: daysLate(r.dueDate) }))
    .sort((a, b) => b.dias - a.dias)
  return {
    columns: [
      { header: "Cliente", value: (r) => r.partyName },
      { header: "Categoria", value: (r) => r.categoryName },
      { header: "Vencimento", value: (r) => formatDate(r.dueDate) },
      { header: "Dias em atraso", value: (r) => r.dias, align: "right" },
      { header: "Faixa", value: (r) => agingBucket(r.dias) },
      { header: "Valor", value: (r) => R(r.amount), align: "right" },
    ],
    rows,
  }
}

function buildByCategory(data: ReportsData, f: Filters, kind: "rec" | "pay"): BuiltReport {
  const meta = REPORT_METAS[kind === "rec" ? 5 : 6]
  const src = kind === "rec" ? data.receivables : data.payables
  const filtered = filterOpen(src, f, meta.filters)
  const grouped = groupBy(filtered, (r) => r.categoryName, (r) => r.amount)
  const total = sum(grouped.map((g) => g.valor))
  return {
    columns: [
      { header: "Categoria", value: (r) => r.nome },
      { header: "Qtd", value: (r) => r.qtd, align: "right" },
      { header: "Valor", value: (r) => R(r.valor), align: "right" },
      { header: "% do total", value: (r) => fmtPct(pct(r.valor, total)), align: "right" },
    ],
    rows: grouped,
  }
}

function buildByCostCenter(data: ReportsData, f: Filters): BuiltReport {
  const spec: FilterSpec = REPORT_METAS[7].filters
  const rec = filterOpen(data.receivables, f, spec)
  const pay = filterOpen(data.payables, f, spec)
  const m = new Map<string, { nome: string; receita: number; despesa: number }>()
  for (const r of rec) {
    const cur = m.get(r.costCenterName) ?? { nome: r.costCenterName, receita: 0, despesa: 0 }
    cur.receita += r.amount; m.set(r.costCenterName, cur)
  }
  for (const p of pay) {
    const cur = m.get(p.costCenterName) ?? { nome: p.costCenterName, receita: 0, despesa: 0 }
    cur.despesa += p.amount; m.set(p.costCenterName, cur)
  }
  const rows = [...m.values()]
    .map((c) => ({ ...c, resultado: c.receita - c.despesa }))
    .sort((a, b) => b.resultado - a.resultado)
  return {
    columns: [
      { header: "Centro de Custo", value: (r) => r.nome },
      { header: "Receita", value: (r) => R(r.receita), align: "right" },
      { header: "Despesa", value: (r) => R(r.despesa), align: "right" },
      { header: "Resultado", value: (r) => R(r.resultado), align: "right" },
    ],
    rows,
  }
}

function buildByParty(data: ReportsData, f: Filters, kind: "rec" | "pay"): BuiltReport {
  const meta = REPORT_METAS[kind === "rec" ? 8 : 9]
  const src = kind === "rec" ? data.receivables : data.payables
  const filtered = filterOpen(src, f, meta.filters)
  const settled = kind === "rec" ? "recebido" : "pago"
  const m = new Map<string, { nome: string; qtd: number; total: number; aberto: number; atraso: number }>()
  for (const r of filtered) {
    const cur = m.get(r.partyName) ?? { nome: r.partyName, qtd: 0, total: 0, aberto: 0, atraso: 0 }
    cur.qtd += 1
    cur.total += r.amount
    if (r.status !== settled) cur.aberto += r.amount
    if (r.status === "em_atraso") cur.atraso += r.amount
    m.set(r.partyName, cur)
  }
  const rows = [...m.values()].sort((a, b) => b.total - a.total)
  return {
    columns: [
      { header: kind === "rec" ? "Cliente" : "Fornecedor", value: (r) => r.nome },
      { header: "Títulos", value: (r) => r.qtd, align: "right" },
      { header: "Total", value: (r) => R(r.total), align: "right" },
      { header: "Em aberto", value: (r) => R(r.aberto), align: "right" },
      { header: "Em atraso", value: (r) => R(r.atraso), align: "right" },
    ],
    rows,
  }
}

function accountMovement(data: ReportsData, f: Filters) {
  const spec: FilterSpec = { categoria: true }
  const txns = filterTxn(data.transactions, f, spec).filter((t) => t.type === "entrada" || t.type === "saida")
  const m = new Map<string, { id: string | null; entrada: number; saida: number; qtd: number }>()
  for (const t of txns) {
    const key = t.accountId ?? "—"
    const cur = m.get(key) ?? { id: t.accountId, entrada: 0, saida: 0, qtd: 0 }
    if (t.type === "entrada") cur.entrada += t.amount
    else cur.saida += t.amount
    cur.qtd += 1
    m.set(key, cur)
  }
  return m
}

function buildConciliacao(data: ReportsData, f: Filters): BuiltReport {
  const mov = accountMovement(data, f)
  const byId = new Map(data.accounts.map((a) => [a.id, a]))
  const rows = [...mov.entries()].map(([key, v]) => {
    const acc = v.id ? byId.get(v.id) : undefined
    return {
      conta: acc?.name ?? "Sem conta",
      banco: acc?.bank ?? "—",
      qtd: v.qtd,
      entrada: v.entrada,
      saida: v.saida,
      resultado: v.entrada - v.saida,
    }
  }).sort((a, b) => b.resultado - a.resultado)
  return {
    columns: [
      { header: "Conta", value: (r) => r.conta },
      { header: "Banco", value: (r) => r.banco },
      { header: "Nº lançamentos", value: (r) => r.qtd, align: "right" },
      { header: "Entradas", value: (r) => R(r.entrada), align: "right" },
      { header: "Saídas", value: (r) => R(r.saida), align: "right" },
      { header: "Resultado", value: (r) => R(r.resultado), align: "right" },
    ],
    rows,
  }
}

function buildBalancete(data: ReportsData, f: Filters): BuiltReport {
  const mov = accountMovement(data, f)
  const rows = data.accounts.map((a) => {
    const v = mov.get(a.id) ?? { entrada: 0, saida: 0, qtd: 0, id: a.id }
    const saldoFinal = a.openingBalance + v.entrada - v.saida
    return {
      conta: a.name, banco: a.bank || "—",
      inicial: a.openingBalance, entrada: v.entrada, saida: v.saida, final: saldoFinal,
    }
  }).sort((a, b) => b.final - a.final)
  return {
    columns: [
      { header: "Conta", value: (r) => r.conta },
      { header: "Banco", value: (r) => r.banco },
      { header: "Saldo Inicial", value: (r) => R(r.inicial), align: "right" },
      { header: "Entradas", value: (r) => R(r.entrada), align: "right" },
      { header: "Saídas", value: (r) => R(r.saida), align: "right" },
      { header: "Saldo Final", value: (r) => R(r.final), align: "right" },
    ],
    rows,
  }
}

export function buildReport(id: ReportId, data: ReportsData, f: Filters): BuiltReport {
  switch (id) {
    case "dre": return buildDre(data, f)
    case "cashflow": return buildCashflow(data, f)
    case "payables": return openItemReport(filterOpen(data.payables, f, REPORT_METAS[2].filters), "Fornecedor")
    case "receivables": return openItemReport(filterOpen(data.receivables, f, REPORT_METAS[3].filters), "Cliente")
    case "inadimplencia": return buildInadimplencia(data, f)
    case "byCategory": return buildByCategory(data, f, "rec")
    case "byExpense": return buildByCategory(data, f, "pay")
    case "byCostCenter": return buildByCostCenter(data, f)
    case "byClient": return buildByParty(data, f, "rec")
    case "bySupplier": return buildByParty(data, f, "pay")
    case "conciliacao": return buildConciliacao(data, f)
    case "balancete": return buildBalancete(data, f)
    case "repasses": return buildRepasses(data, f)
  }
}

/* ── Repasses por Parceiro ──
   Para quem administra valores de terceiros (ex.: imobiliária): quanto foi
   cobrado no período por recebedor, quanto é comissão da empresa e quanto tem
   de ser repassado. A chave PIX vem junto para facilitar o pagamento. */
type RepasseRow = {
  parceiro: string; pix: string; titulos: number
  bruto: number; comissao: number; repasse: number
  recebido: number; aReceber: number
}

function buildRepasses(data: ReportsData, f: Filters): BuiltReport {
  const rows = data.receivables
    .filter((r) => r.partnerId)
    .filter((r) => (f.categoria === "todos" ? true : r.categoryId === f.categoria))
    .filter((r) => (f.centroCusto === "todos" ? true : r.costCenterId === f.centroCusto))
    .filter((r) => (f.status === "todos" ? true : r.status === f.status))

  const m = new Map<string, RepasseRow>()
  for (const r of rows) {
    const key = r.partnerId as string
    const cur = m.get(key) ?? {
      parceiro: r.partnerName || "—", pix: r.partnerPix || "—",
      titulos: 0, bruto: 0, comissao: 0, repasse: 0, recebido: 0, aReceber: 0,
    }
    const comissao = r.commission
    const repasse = Math.max(0, r.amount - comissao)
    cur.titulos += 1
    cur.bruto += r.amount
    cur.comissao += comissao
    cur.repasse += repasse
    if (r.status === "recebido") cur.recebido += repasse
    else cur.aReceber += repasse
    m.set(key, cur)
  }

  const out = [...m.values()].sort((a, b) => b.repasse - a.repasse)

  return {
    columns: [
      { header: "Recebedor",       value: (r: RepasseRow) => r.parceiro },
      { header: "Chave PIX",       value: (r: RepasseRow) => r.pix },
      { header: "Títulos",         value: (r: RepasseRow) => String(r.titulos), align: "right" },
      { header: "Valor bruto",     value: (r: RepasseRow) => R(r.bruto),    align: "right" },
      { header: "Comissão",        value: (r: RepasseRow) => R(r.comissao), align: "right" },
      { header: "Repasse total",   value: (r: RepasseRow) => R(r.repasse),  align: "right" },
      { header: "Já recebido",     value: (r: RepasseRow) => R(r.recebido), align: "right" },
      { header: "A receber",       value: (r: RepasseRow) => R(r.aReceber), align: "right" },
    ],
    rows: out,
  }
}
