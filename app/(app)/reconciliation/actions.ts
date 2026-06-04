"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

async function ctx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let companyId: string | null = null
  if (user) {
    const { data: prof } = await supabase
      .from("profiles").select("company_id").eq("id", user.id).single()
    companyId = (prof as any)?.company_id ?? null
  }
  return { supabase, companyId }
}

// Confirma a conciliação de uma transação existente contra uma linha do extrato.
export async function confirmReconciliation(transactionId: string, fitid: string): Promise<Result> {
  if (!transactionId) return { error: "Transação inválida" }
  const supabase = await createClient()
  const { error } = await supabase
    .from("transactions")
    .update({
      reconciled: true,
      reconciled_at: new Date().toISOString(),
      ofx_fitid: fitid || null,
    })
    .eq("id", transactionId)
  if (error) return { error: error.message }
  revalidatePath("/reconciliation")
  revalidatePath("/transactions")
  return { error: null }
}

// Desfaz a conciliação (caso o usuário tenha confirmado por engano).
export async function undoReconciliation(transactionId: string): Promise<Result> {
  if (!transactionId) return { error: "Transação inválida" }
  const supabase = await createClient()
  const { error } = await supabase
    .from("transactions")
    .update({ reconciled: false, reconciled_at: null, ofx_fitid: null })
    .eq("id", transactionId)
  if (error) return { error: error.message }
  revalidatePath("/reconciliation")
  revalidatePath("/transactions")
  return { error: null }
}

export interface NewStatementTxn {
  accountId: string
  date: string          // YYYY-MM-DD
  amount: number        // assinado: positivo = entrada, negativo = saída
  description: string
  fitid: string
}

// Cria um lançamento de caixa a partir de uma linha do extrato que não tinha
// correspondência no sistema. Já entra conciliado.
export async function createFromStatement(input: NewStatementTxn): Promise<Result> {
  const { supabase, companyId } = await ctx()
  if (!companyId) return { error: "Empresa não identificada" }
  if (!input.accountId) return { error: "Selecione a conta bancária do extrato" }
  if (!input.date) return { error: "Data inválida" }
  if (!Number.isFinite(input.amount) || input.amount === 0) return { error: "Valor inválido" }

  const type = input.amount >= 0 ? "entrada" : "saida"
  const { error } = await supabase.from("transactions").insert({
    company_id: companyId,
    type,
    date: input.date,
    amount: Math.abs(input.amount),
    description: input.description || "Importado do extrato OFX",
    account_id: input.accountId,
    reconciled: true,
    reconciled_at: new Date().toISOString(),
    ofx_fitid: input.fitid || null,
  })
  if (error) return { error: error.message }
  revalidatePath("/reconciliation")
  revalidatePath("/transactions")
  return { error: null }
}
