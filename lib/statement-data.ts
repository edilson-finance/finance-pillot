"use client"

// Acesso a dados do Extrato de Movimentação. Carrega, no escopo da empresa
// logada (RLS) e do período selecionado: contas bancárias, o saldo realizado
// acumulado ANTES do período (por conta, via RPC fn_account_prior_balance),
// as transações de caixa do período e os títulos em aberto (recebíveis e
// pagáveis por vencimento). O builder puro (lib/statement-build) consome isto.

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { DateRange } from "@/lib/date-context"

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const N = (v: unknown) => Number(v ?? 0)
const S = (v: unknown) => (v == null ? "" : String(v))

export interface AccountRow {
  id: string
  name: string
  bank: string
  openingBalance: number
}

export interface TxnRow {
  id: string
  type: "entrada" | "saida" | "transferencia"
  date: string
  amount: number
  description: string
  accountId: string | null
}

export interface OpenRow {
  id: string
  kind: "receivable" | "payable"
  dueDate: string
  amount: number
  status: string
  description: string
  partyName: string
  accountId: string | null
}

export interface StatementData {
  accounts: AccountRow[]
  priorByAccount: Record<string, number>
  transactions: TxnRow[]
  receivables: OpenRow[]
  payables: OpenRow[]
  loading: boolean
}

const EMPTY: StatementData = {
  accounts: [],
  priorByAccount: {},
  transactions: [],
  receivables: [],
  payables: [],
  loading: true,
}

const SEM_CONTA = "__sem_conta__"

function mapOpen(raw: unknown[], kind: "receivable" | "payable"): OpenRow[] {
  return ((raw as Record<string, unknown>[]) ?? []).map((r) => ({
    id: String(r.id),
    kind,
    dueDate: S(r.due_date),
    amount: N(r.amount),
    status: S(r.status),
    description: S(r.description),
    partyName: (r.party as { name?: string } | null)?.name ?? "",
    accountId: (r.account_id as string | null) ?? null,
  }))
}

export function useStatementData(range: DateRange): StatementData {
  const [data, setData] = useState<StatementData>(EMPTY)
  const start = isoDate(range.start)
  const end = isoDate(range.end)

  useEffect(() => {
    let active = true
    setData((d) => ({ ...d, loading: true }))
    const supabase = createClient()

    Promise.all([
      supabase.from("accounts").select("id, name, bank, opening_balance").order("name"),
      supabase.rpc("fn_account_prior_balance", { p_before: start }),
      supabase
        .from("transactions")
        .select("id, type, date, amount, description, account_id")
        .gte("date", start)
        .lte("date", end)
        .order("date"),
      supabase
        .from("receivables")
        .select("id, due_date, amount, status, description, account_id, party:customers(name)")
        .gte("due_date", start)
        .lte("due_date", end)
        .order("due_date"),
      supabase
        .from("payables")
        .select("id, due_date, amount, status, description, account_id, party:suppliers(name)")
        .gte("due_date", start)
        .lte("due_date", end)
        .order("due_date"),
    ]).then(([acc, prior, txn, rec, pay]) => {
      if (!active) return

      const accounts: AccountRow[] = ((acc.data as Record<string, unknown>[]) ?? []).map((a) => ({
        id: String(a.id),
        name: S(a.name),
        bank: S(a.bank),
        openingBalance: N(a.opening_balance),
      }))

      const priorByAccount: Record<string, number> = {}
      for (const row of (prior.data as { account_id: string | null; net: unknown }[]) ?? []) {
        priorByAccount[row.account_id ?? SEM_CONTA] = N(row.net)
      }

      const transactions: TxnRow[] = ((txn.data as Record<string, unknown>[]) ?? []).map((t) => ({
        id: String(t.id),
        type: t.type as TxnRow["type"],
        date: S(t.date),
        amount: N(t.amount),
        description: S(t.description),
        accountId: (t.account_id as string | null) ?? null,
      }))

      setData({
        accounts,
        priorByAccount,
        transactions,
        receivables: mapOpen(rec.data as unknown[], "receivable"),
        payables: mapOpen(pay.data as unknown[], "payable"),
        loading: false,
      })
    })

    return () => {
      active = false
    }
  }, [start, end])

  return data
}
