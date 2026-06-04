"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  const id = (s: string) => (String(formData.get(s) ?? "").trim() || null)
  return {
    type: String(formData.get("type") ?? "entrada") as "entrada" | "saida",
    date: String(formData.get("date") ?? "").trim(),
    amount: Number(formData.get("amount") ?? 0),
    description: (String(formData.get("description") ?? "").trim() || null),
    category_id: id("category_id"),
    account_id: id("account_id"),
    cost_center_id: id("cost_center_id"),
    customer_id: id("customer_id"),
    supplier_id: id("supplier_id"),
  }
}

function validate(p: ReturnType<typeof parsePayload>): string | null {
  if (p.type !== "entrada" && p.type !== "saida") return "Tipo é obrigatório"
  if (!p.date) return "Data é obrigatória"
  if (!Number.isFinite(p.amount) || p.amount <= 0) return "Valor é obrigatório"
  return null
}

export async function createTransaction(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  const err = validate(payload)
  if (err) return { error: err }
  const { error } = await supabase.from("transactions").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/transactions")
  return { error: null }
}

export async function updateTransaction(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  const err = validate(payload)
  if (err) return { error: err }
  const { error } = await supabase.from("transactions").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/transactions")
  return { error: null }
}

export async function deleteTransaction(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("transactions").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/transactions")
  return { error: null }
}
