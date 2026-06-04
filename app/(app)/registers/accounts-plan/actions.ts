"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  return {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    parent_id: (String(formData.get("parent_id") ?? "").trim() || null),
    kind: (String(formData.get("kind") ?? "").trim() || null),
  }
}

export async function createAccountPlan(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.code) return { error: "Código é obrigatório" }
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("accounts_plan").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/registers/accounts-plan")
  return { error: null }
}

export async function updateAccountPlan(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.code) return { error: "Código é obrigatório" }
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("accounts_plan").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/accounts-plan")
  return { error: null }
}

export async function deleteAccountPlan(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("accounts_plan").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/accounts-plan")
  return { error: null }
}
