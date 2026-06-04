// Acesso a dados client-side para a Conciliação Bancária.
// Carrega as contas da empresa e as transações de uma conta num período,
// já no formato que o motor de conciliação (lib/reconcile) espera.

import { createClient } from "@/lib/supabase/client"
import type { SystemTxn } from "@/lib/reconcile"

export interface BankAccount {
  id: string
  name: string
  bank: string
}

export async function fetchAccounts(): Promise<BankAccount[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("accounts")
    .select("id, name, bank")
    .order("name")
  return ((data as any[]) ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    bank: a.bank ?? "",
  }))
}

export interface SystemContext {
  txns: SystemTxn[]                 // transações da conta no período (com flag reconciled)
  reconciledFitids: Set<string>     // FITIDs de linhas já conciliadas antes (idempotência)
}

/**
 * Carrega o contexto de conciliação de uma conta num período: as transações
 * de caixa (entrada/saída) com valor já assinado (entrada > 0, saída < 0) e
 * o conjunto de FITIDs do extrato já conciliados anteriormente. Transferências
 * são ignoradas porque não representam entrada/saída conciliável contra extrato.
 */
export async function fetchSystemContext(
  accountId: string, start: string, end: string,
): Promise<SystemContext> {
  const supabase = createClient()
  const { data } = await supabase
    .from("transactions")
    .select("id, type, date, amount, description, reconciled, ofx_fitid, category:categories(name)")
    .eq("account_id", accountId)
    .gte("date", start)
    .lte("date", end)
    .order("date")

  const rows = ((data as any[]) ?? []).filter((t) => t.type === "entrada" || t.type === "saida")
  const reconciledFitids = new Set<string>()
  for (const t of rows) if (t.reconciled && t.ofx_fitid) reconciledFitids.add(String(t.ofx_fitid))

  const txns: SystemTxn[] = rows.map((t) => ({
    id: t.id,
    date: t.date,
    amount: t.type === "entrada" ? Number(t.amount ?? 0) : -Number(t.amount ?? 0),
    description: t.description ?? "",
    categoryName: t.category?.name ?? "Sem categoria",
    reconciled: !!t.reconciled,
  }))

  return { txns, reconciledFitids }
}
