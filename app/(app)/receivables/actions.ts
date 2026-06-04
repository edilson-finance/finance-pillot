"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  return {
    customer_id: (String(formData.get("customer_id") ?? "").trim() || null),
    description: (String(formData.get("description") ?? "").trim() || null),
    category_id: (String(formData.get("category_id") ?? "").trim() || null),
    due_date: String(formData.get("due_date") ?? "").trim(),
    installment: (String(formData.get("installment") ?? "").trim() || null),
    amount: Number(formData.get("amount") ?? 0),
    status: String(formData.get("status") ?? "a_receber"),
    account_id: (String(formData.get("account_id") ?? "").trim() || null),
  }
}

function revalidate() {
  revalidatePath("/receivables")
  revalidatePath("/delinquent")
}

export async function createReceivable(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.due_date) return { error: "Vencimento é obrigatório" }
  const { error } = await supabase.from("receivables").insert(payload)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}

export async function updateReceivable(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.due_date) return { error: "Vencimento é obrigatório" }
  const { error } = await supabase.from("receivables").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}

export async function deleteReceivable(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("receivables").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}

export async function markReceived(id: string): Promise<Result> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from("receivables")
    .update({ status: "recebido", received_at: today })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}
