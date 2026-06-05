"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { DateRange } from "@/lib/date-context"
import { daysBetween, groupLabel } from "@/lib/date-utils"

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function prevRange(range: DateRange): { start: string; end: string } {
  const days = daysBetween(range.start, range.end)
  const end = new Date(range.start); end.setDate(end.getDate() - 1)
  const start = new Date(end); start.setDate(start.getDate() - (days - 1))
  return { start: isoDate(start), end: isoDate(end) }
}

export interface Kpis {
  faturamento: number
  despesaTotal: number
  lucroLiquido: number
  lucroMargin: number
  numEntradas: number
  ticketMedio: number
  aReceber: number
  aReceberVencido: number
  aPagar: number
  aPagarVencido: number
  saldoAtual: number
  saldoProjetado: number
  inadimplencia: number
  margemContribuicao: number
  ebitda: number
  capitalGiro: number
  faturamentoVar: number
  days: number
  group: ReturnType<typeof groupLabel>
}

const ZERO_KPIS: Kpis = {
  faturamento: 0, despesaTotal: 0, lucroLiquido: 0, lucroMargin: 0, numEntradas: 0,
  ticketMedio: 0, aReceber: 0, aReceberVencido: 0, aPagar: 0, aPagarVencido: 0,
  saldoAtual: 0, saldoProjetado: 0, inadimplencia: 0, margemContribuicao: 0,
  ebitda: 0, capitalGiro: 0, faturamentoVar: 0, days: 0, group: "mes",
}

const round1 = (n: number) => Math.round(n * 10) / 10

function mapKpis(raw: any, prevFaturamento: number, range: DateRange): Kpis {
  const faturamento = Number(raw?.faturamento ?? 0)
  const despesaTotal = Number(raw?.despesaTotal ?? 0)
  const lucroLiquido = Number(raw?.lucroLiquido ?? 0)
  const aReceber = Number(raw?.aReceber ?? 0)
  const aReceberVencido = Number(raw?.aReceberVencido ?? 0)
  const aPagar = Number(raw?.aPagar ?? 0)
  const saldoAtual = Number(raw?.saldoAtual ?? 0)
  const lucroMargin = faturamento > 0 ? round1((lucroLiquido / faturamento) * 100) : 0
  return {
    faturamento, despesaTotal, lucroLiquido, lucroMargin,
    numEntradas: Number(raw?.numEntradas ?? 0),
    ticketMedio: Number(raw?.ticketMedio ?? 0),
    aReceber, aReceberVencido,
    aPagar, aPagarVencido: Number(raw?.aPagarVencido ?? 0),
    saldoAtual,
    saldoProjetado: Number(raw?.saldoProjetado ?? 0),
    inadimplencia: aReceber > 0 ? round1((aReceberVencido / aReceber) * 100) : 0,
    margemContribuicao: lucroMargin,
    ebitda: lucroLiquido,
    capitalGiro: saldoAtual + aReceber - aPagar,
    faturamentoVar: prevFaturamento > 0 ? round1(((faturamento - prevFaturamento) / prevFaturamento) * 100) : 0,
    days: daysBetween(range.start, range.end),
    group: groupLabel(range),
  }
}

export function useKpis(range: DateRange) {
  const [kpis, setKpis] = useState<Kpis>(ZERO_KPIS)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    const p = prevRange(range)
    Promise.all([
      supabase.rpc("fn_kpis", { p_start: isoDate(range.start), p_end: isoDate(range.end) }),
      supabase.rpc("fn_kpis", { p_start: p.start, p_end: p.end }),
    ]).then(([cur, prev]) => {
      if (!active) return
      const prevFat = Number((prev.data as any)?.faturamento ?? 0)
      setKpis(mapKpis(cur.data, prevFat, range))
      setLoading(false)
    })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime()])
  return { kpis, loading }
}

export interface SeriePonto { label: string; mes: string; receita: number; despesa: number; liquido: number }

export function useRevenueSeries(range: DateRange) {
  const [series, setSeries] = useState<SeriePonto[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc("fn_revenue_expense", { p_start: isoDate(range.start), p_end: isoDate(range.end) })
      .then(({ data }) => {
        if (!active) return
        const rows = (data ?? []) as any[]
        setSeries(rows.map((r) => {
          const receita = Number(r.receita ?? 0)
          const despesa = Number(r.despesa ?? 0)
          return { label: r.mes, mes: r.mes, receita, despesa, liquido: receita - despesa }
        }))
        setLoading(false)
      })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime()])
  return { series, loading }
}

export interface RankRow { nome: string; valor: number; percent: number }

function useRankRpc(fn: "fn_top_clients" | "fn_top_expenses", range: DateRange) {
  const [rows, setRows] = useState<RankRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase.rpc(fn, { p_start: isoDate(range.start), p_end: isoDate(range.end) }).then(({ data }) => {
      if (!active) return
      setRows(((data ?? []) as any[]).map((r) => ({
        nome: r.nome, valor: Number(r.valor ?? 0), percent: Number(r.percent ?? 0),
      })))
      setLoading(false)
    })
    return () => { active = false }
  }, [fn, range.start.getTime(), range.end.getTime()])
  return { rows, loading }
}

export const useTopClients = (range: DateRange) => useRankRpc("fn_top_clients", range)
export const useTopExpenses = (range: DateRange) => useRankRpc("fn_top_expenses", range)

export interface HealthDim { nome: string; nota: number; status: string; descricao: string }

export function useHealthDimensions() {
  const [dims, setDims] = useState<HealthDim[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.rpc("fn_health_dimensions").then(({ data }) => {
      if (!active) return
      setDims(((data ?? []) as any[]).map((d) => ({
        nome: d.nome, nota: Number(d.nota ?? 0), status: d.status, descricao: d.descricao,
      })))
      setLoading(false)
    })
    return () => { active = false }
  }, [])
  return { dims, loading }
}

export interface DreNode {
  id?: string; label: string; valor: number; percent: number; tipo?: string
  filhos?: DreNode[]
}

export function useDre(range: DateRange) {
  const [dre, setDre] = useState<DreNode[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc("fn_dre", { p_start: isoDate(range.start), p_end: isoDate(range.end) })
      .then(({ data }) => {
        if (!active) return
        setDre((data ?? []) as DreNode[])
        setLoading(false)
      })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime()])
  return { dre, loading }
}

export interface OpenItem {
  id: string; nome: string; categoria: string; conta: string
  vencimento: string; valor: number; status: "previsto" | "em_atraso"
}

function useOpenItems(
  table: "receivables" | "payables",
  partyTable: "customers" | "suppliers",
) {
  const [rows, setRows] = useState<OpenItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase
      .from(table)
      .select(`*, party:${partyTable}(name), category:categories(name)`)
      .order("due_date")
      .then(({ data }) => {
        if (!active) return
        const settled = table === "receivables" ? "recebido" : "pago"
        setRows(((data ?? []) as any[])
          .filter((r) => r.status !== settled)
          .map((r) => ({
            id: r.id,
            nome: r.party?.name ?? r.description ?? "—",
            categoria: r.category?.name ?? "—",
            conta: "—",
            vencimento: r.due_date,
            valor: Number(r.amount ?? 0),
            status: r.status === "em_atraso" ? "em_atraso" : "previsto",
          })))
        setLoading(false)
      })
    return () => { active = false }
  }, [table, partyTable])
  return { rows, loading }
}

export const useReceivables = () => useOpenItems("receivables", "customers")
export const usePayables = () => useOpenItems("payables", "suppliers")

export interface CashflowRow {
  data: string; descricao: string; categoria: string
  entrada: number; saida: number; saldo: number
}

export function useCashflow(range: DateRange) {
  const [rows, setRows] = useState<CashflowRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc("fn_cashflow", { p_start: isoDate(range.start), p_end: isoDate(range.end) })
      .then(({ data }) => {
        if (!active) return
        setRows(((data ?? []) as any[]).map((r) => ({
          data: r.data, descricao: r.descricao, categoria: r.categoria,
          entrada: Number(r.entrada ?? 0), saida: Number(r.saida ?? 0), saldo: Number(r.saldo ?? 0),
        })))
        setLoading(false)
      })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime()])
  return { rows, loading }
}

// ── Paleta de cores do BI (atribuída por índice) ──
export const BI_PALETTE = [
  "var(--accent)", "var(--success)", "var(--purple)", "var(--warning)",
  "var(--danger)", "var(--info)",
]

export interface CategoryChild { nome: string; valor: number }
export interface CategoryRow {
  id: string; categoria: string; valor: number; pct: number
  varPct: number | null; filhos: CategoryChild[]; cor: string
}

export function useCategoryBreakdown(range: DateRange, kind: "entrada" | "saida") {
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc("fn_category_breakdown", { p_start: isoDate(range.start), p_end: isoDate(range.end), p_kind: kind })
      .then(({ data }) => {
        if (!active) return
        setRows(((data ?? []) as any[]).map((r, i) => ({
          id: r.id, categoria: r.categoria, valor: Number(r.valor ?? 0),
          pct: Number(r.pct ?? 0), varPct: r.varPct === null ? null : Number(r.varPct),
          filhos: ((r.filhos ?? []) as any[]).map((f) => ({ nome: f.nome, valor: Number(f.valor ?? 0) })),
          cor: BI_PALETTE[i % BI_PALETTE.length],
        })))
        setLoading(false)
      })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime(), kind])
  return { rows, loading }
}

export interface DrillRow { nome: string; receita: number; despesa: number; varPct: number | null }

export function useDrilldown(range: DateRange, dim: "categoria" | "centro_custo" | "cliente" | "fornecedor") {
  const [rows, setRows] = useState<DrillRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc("fn_drilldown", { p_start: isoDate(range.start), p_end: isoDate(range.end), p_dim: dim })
      .then(({ data }) => {
        if (!active) return
        setRows(((data ?? []) as any[]).map((r) => ({
          nome: r.nome, receita: Number(r.receita ?? 0), despesa: Number(r.despesa ?? 0),
          varPct: r.varPct === null ? null : Number(r.varPct),
        })))
        setLoading(false)
      })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime(), dim])
  return { rows, loading }
}

export interface PeriodSide { receita: number; despesa: number; resultado: number }
export interface PeriodComparison { atual: PeriodSide; anterior: PeriodSide; labelAtual: string; labelAnterior: string }
const ZERO_SIDE: PeriodSide = { receita: 0, despesa: 0, resultado: 0 }

export function usePeriodComparison(range: DateRange) {
  const [data, setData] = useState<PeriodComparison>({ atual: ZERO_SIDE, anterior: ZERO_SIDE, labelAtual: "", labelAnterior: "" })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc("fn_period_comparison", { p_start: isoDate(range.start), p_end: isoDate(range.end) })
      .then(({ data: d }) => {
        if (!active) return
        const r = (d ?? {}) as any
        setData({
          atual: { receita: Number(r.atual?.receita ?? 0), despesa: Number(r.atual?.despesa ?? 0), resultado: Number(r.atual?.resultado ?? 0) },
          anterior: { receita: Number(r.anterior?.receita ?? 0), despesa: Number(r.anterior?.despesa ?? 0), resultado: Number(r.anterior?.resultado ?? 0) },
          labelAtual: r.labelAtual ?? "", labelAnterior: r.labelAnterior ?? "",
        })
        setLoading(false)
      })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime()])
  return { data, loading }
}

export interface AgingRow { faixa: string; valor: number; qtd: number }
export interface InadEvoRow { mes: string; taxa: number; valor: number }
export interface InadData {
  taxa: number; valorAtraso: number; clientesInad: number; prazoMedioDias: number
  aging: AgingRow[]; evolucao: InadEvoRow[]
}
const ZERO_INAD: InadData = { taxa: 0, valorAtraso: 0, clientesInad: 0, prazoMedioDias: 0, aging: [], evolucao: [] }

export function useInadimplencia() {
  const [data, setData] = useState<InadData>(ZERO_INAD)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.rpc("fn_inadimplencia").then(({ data: d }) => {
      if (!active) return
      const r = (d ?? {}) as any
      setData({
        taxa: Number(r.taxa ?? 0), valorAtraso: Number(r.valorAtraso ?? 0),
        clientesInad: Number(r.clientesInad ?? 0), prazoMedioDias: Number(r.prazoMedioDias ?? 0),
        aging: ((r.aging ?? []) as any[]).map((a) => ({ faixa: a.faixa, valor: Number(a.valor ?? 0), qtd: Number(a.qtd ?? 0) })),
        evolucao: ((r.evolucao ?? []) as any[]).map((e) => ({ mes: e.mes, taxa: Number(e.taxa ?? 0), valor: Number(e.valor ?? 0) })),
      })
      setLoading(false)
    })
    return () => { active = false }
  }, [])
  return { data, loading }
}

export interface ProjPonto { label: string; fim: string; saldo: number }
export interface CashflowProjection {
  saldoAtual: number; pontos: ProjPonto[]; menorSaldo: number
  menorLabel: string; menorFim: string; saldoFinal: number; dataFinal: string
}
const ZERO_PROJ: CashflowProjection = { saldoAtual: 0, pontos: [], menorSaldo: 0, menorLabel: "", menorFim: "", saldoFinal: 0, dataFinal: "" }

export function useCashflowProjection(weeks = 13) {
  const [data, setData] = useState<CashflowProjection>(ZERO_PROJ)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.rpc("fn_cashflow_projection", { p_weeks: weeks }).then(({ data: d }) => {
      if (!active) return
      const r = (d ?? {}) as any
      setData({
        saldoAtual: Number(r.saldoAtual ?? 0),
        pontos: ((r.pontos ?? []) as any[]).map((pt) => ({ label: pt.label, fim: pt.fim, saldo: Number(pt.saldo ?? 0) })),
        menorSaldo: Number(r.menorSaldo ?? 0), menorLabel: r.menorLabel ?? "", menorFim: r.menorFim ?? "",
        saldoFinal: Number(r.saldoFinal ?? 0), dataFinal: r.dataFinal ?? "",
      })
      setLoading(false)
    })
    return () => { active = false }
  }, [weeks])
  return { data, loading }
}