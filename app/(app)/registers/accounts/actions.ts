"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    bank: (String(formData.get("bank") ?? "").trim() || null),
    kind: String(formData.get("kind") ?? "corrente"),
    opening_balance: Number(formData.get("opening_balance") ?? 0),
  }
}

export async function createAccount(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("accounts").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/registers/accounts")
  return { error: null }
}

export async function updateAccount(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("accounts").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/accounts")
  return { error: null }
}

export async function deleteAccount(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("accounts").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/accounts")
  return { error: null }
}
