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
  const { error } = await supabase
    .from("payables")
    .update({ status: "pago", paid_at: new Date().toISOString().slice(0, 10) })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/payables")
  return { error: null }
}
