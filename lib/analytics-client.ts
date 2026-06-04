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

function useView(view: "v_top_clients" | "v_top_expenses") {
  const [rows, setRows] = useState<RankRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.from(view).select("*").then(({ data }) => {
      if (!active) return
      setRows(((data ?? []) as any[]).map((r) => ({
        nome: r.nome, valor: Number(r.valor ?? 0), percent: Number(r.percent ?? 0),
      })))
      setLoading(false)
    })
    return () => { active = false }
  }, [view])
  return { rows, loading }
}

export const useTopClients = () => useView("v_top_clients")
export const useTopExpenses = () => useView("v_top_expenses")

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
