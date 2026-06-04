"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { DateRange } from "@/lib/date-context"

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Linha unificada de conta a receber / a pagar (regime de competência).
export interface OpenRow {
  id: string
  kind: "receivable" | "payable"
  dueDate: string
  competenceDate: string | null
  amount: number
  status: string
  description: string
  partyId: string | null
  partyName: string
  categoryId: string | null
  categoryName: string
  costCenterId: string | null
  costCenterName: string
  accountId: string | null
  accountName: string
}

// Linha de movimento realizado (transação de caixa).
export interface TxnRow {
  id: string
  type: "entrada" | "saida" | "transferencia"
  date: string
  amount: number
  description: string
  categoryId: string | null
  categoryName: string
  costCenterId: string | null
  costCenterName: string
  customerId: string | null
  customerName: string
  supplierId: string | null
  supplierName: string
  accountId: string | null
  accountName: string
}

export interface AccountRow {
  id: string
  name: string
  bank: string
  openingBalance: number
}

export interface FilterOption {
  id: string
  name: string
}

export interface ReportsData {
  receivables: OpenRow[]
  payables: OpenRow[]
  transactions: TxnRow[]
  accounts: AccountRow[]
  categories: FilterOption[]
  costCenters: FilterOption[]
  customers: FilterOption[]
  suppliers: FilterOption[]
  loading: boolean
}

const EMPTY: ReportsData = {
  receivables: [], payables: [], transactions: [], accounts: [],
  categories: [], costCenters: [], customers: [], suppliers: [], loading: true,
}

const N = (v: unknown) => Number(v ?? 0)
const S = (v: unknown) => (v == null ? "" : String(v))

function mapOpen(raw: any[], kind: "receivable" | "payable"): OpenRow[] {
  return (raw ?? []).map((r) => ({
    id: r.id,
    kind,
    dueDate: r.due_date,
    competenceDate: r.competence_date ?? null,
    amount: N(r.amount),
    status: r.status,
    description: S(r.description),
    partyId: kind === "receivable" ? r.customer_id ?? null : r.supplier_id ?? null,
    partyName: r.party?.name ?? S(r.description) ?? "—",
    categoryId: r.category_id ?? null,
    categoryName: r.category?.name ?? "Sem categoria",
    costCenterId: r.cost_center_id ?? null,
    costCenterName: r.cost_center?.name ?? "Sem centro de custo",
    accountId: r.account_id ?? null,
    accountName: r.account?.name ?? "—",
  }))
}

function uniqueOptions(...lists: { id: string | null; name: string }[][]): FilterOption[] {
  const m = new Map<string, string>()
  for (const list of lists)
    for (const it of list)
      if (it.id) m.set(it.id, it.name)
  return [...m.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

/**
 * Carrega, no escopo da empresa logada (RLS) e do período selecionado,
 * todos os dados brutos necessários para montar qualquer relatório
 * client-side: recebíveis e pagáveis por competência (due_date), transações
 * realizadas por data, contas bancárias e as listas de filtro derivadas.
 */
export function useReportsData(range: DateRange): ReportsData {
  const [data, setData] = useState<ReportsData>(EMPTY)
  const start = isoDate(range.start)
  const end = isoDate(range.end)

  useEffect(() => {
    let active = true
    setData((d) => ({ ...d, loading: true }))
    const supabase = createClient()

    Promise.all([
      supabase
        .from("receivables")
        .select("*, party:customers(name), category:categories(name), cost_center:cost_centers(name), account:accounts(name)")
        .gte("due_date", start)
        .lte("due_date", end)
        .order("due_date"),
      supabase
        .from("payables")
        .select("*, party:suppliers(name), category:categories(name), cost_center:cost_centers(name), account:accounts(name)")
        .gte("due_date", start)
        .lte("due_date", end)
        .order("due_date"),
      supabase
        .from("transactions")
        .select("*, category:categories(name), cost_center:cost_centers(name), customer:customers(name), supplier:suppliers(name), account:accounts(name)")
        .gte("date", start)
        .lte("date", end)
        .order("date"),
      supabase.from("accounts").select("id, name, bank, opening_balance"),
    ]).then(([rec, pay, txn, acc]) => {
      if (!active) return
      const receivables = mapOpen(rec.data as any[], "receivable")
      const payables = mapOpen(pay.data as any[], "payable")
      const transactions: TxnRow[] = ((txn.data as any[]) ?? []).map((t) => ({
        id: t.id,
        type: t.type,
        date: t.date,
        amount: N(t.amount),
        description: S(t.description),
        categoryId: t.category_id ?? null,
        categoryName: t.category?.name ?? "Sem categoria",
        costCenterId: t.cost_center_id ?? null,
        costCenterName: t.cost_center?.name ?? "Sem centro de custo",
        customerId: t.customer_id ?? null,
        customerName: t.customer?.name ?? "",
        supplierId: t.supplier_id ?? null,
        supplierName: t.supplier?.name ?? "",
        accountId: t.account_id ?? null,
        accountName: t.account?.name ?? "—",
      }))
      const accounts: AccountRow[] = ((acc.data as any[]) ?? []).map((a) => ({
        id: a.id, name: a.name, bank: S(a.bank), openingBalance: N(a.opening_balance),
      }))

      const categories = uniqueOptions(
        receivables.map((r) => ({ id: r.categoryId, name: r.categoryName })),
        payables.map((r) => ({ id: r.categoryId, name: r.categoryName })),
        transactions.map((t) => ({ id: t.categoryId, name: t.categoryName })),
      )
      const costCenters = uniqueOptions(
        receivables.map((r) => ({ id: r.costCenterId, name: r.costCenterName })),
        payables.map((r) => ({ id: r.costCenterId, name: r.costCenterName })),
        transactions.map((t) => ({ id: t.costCenterId, name: t.costCenterName })),
      )
      const customers = uniqueOptions(
        receivables.map((r) => ({ id: r.partyId, name: r.partyName })),
        transactions.map((t) => ({ id: t.customerId, name: t.customerName })),
      )
      const suppliers = uniqueOptions(
        payables.map((r) => ({ id: r.partyId, name: r.partyName })),
        transactions.map((t) => ({ id: t.supplierId, name: t.supplierName })),
      )

      setData({
        receivables, payables, transactions, accounts,
        categories, costCenters, customers, suppliers, loading: false,
      })
    })

    return () => { active = false }
  }, [start, end])

  return data
}
