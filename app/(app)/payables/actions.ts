"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  return {
    supplier_id: (String(formData.get("supplier_id") ?? "").trim() || null),
    description: (String(formData.get("description") ?? "").trim() || null),
    category_id: (String(formData.get("category_id") ?? "").trim() || null),
    due_date: String(formData.get("due_date") ?? "").trim(),
    installment: (String(formData.get("installment") ?? "").trim() || null),
    amount: Number(formData.get("amount") ?? 0),
    status: String(formData.get("status") ?? "a_pagar"),
    account_id: (String(formData.get("account_id") ?? "").trim() || null),
  }
}

export async function createPayable(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.due_date) return { error: "Vencimento é obrigatório" }
  const { error } = await supabase.from("payables").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/payables")
  return { error: null }
}

export async function updatePayable(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.due_date) return { error: "Vencimento é obrigatório" }
  const { error } = await supabase.from("payables").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/payables")
  return { error: null }
}

export async function deletePayable(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("payables").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/payables")
  return { error: null }
}

export async function markPaid(id: string): Promise<Result> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  // Gera o espelho no caixa (transactions) ao dar baixa — antes só trocava o
  // status, deixando o fluxo de caixa/saldo divergente de quando a despesa era
  // lançada já como paga no formulário.
  const { data: pay, error: loadErr } = await supabase
    .from("payables")
    .select("id, status, amount, description, category_id, account_id, cost_center_id, supplier_id, payment_method, document_number, due_date")
    .eq("id", id)
    .maybeSingle()
  if (loadErr) return { error: loadErr.message }
  if (!pay) return { error: "Título não encontrado." }

  // Idempotência: já pago → nada a fazer.
  if (pay.status === "pago") { revalidatePath("/payables"); return { error: null } }

  // Só gera o movimento se ainda não há transação para este título.
  const { data: existing } = await supabase
    .from("transactions").select("id").eq("payable_id", id).limit(1)
  if (!existing || existing.length === 0) {
    const { error: txErr } = await supabase.from("transactions").insert({
      type: "saida", date: pay.due_date ?? today, amount: pay.amount, description: pay.description,
      category_id: pay.category_id, account_id: pay.account_id, cost_center_id: pay.cost_center_id,
      supplier_id: pay.supplier_id, payable_id: pay.id,
      payment_method: pay.payment_method, document_number: pay.document_number,
    })
    if (txErr) return { error: txErr.message }
  }

  const { error } = await supabase
    .from("payables").update({ status: "pago", paid_at: today }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/transactions")
  revalidatePath("/payables")
  return { error: null }
}
