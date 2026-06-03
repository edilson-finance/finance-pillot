"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    document: (String(formData.get("document") ?? "").trim() || null),
    email: (String(formData.get("email") ?? "").trim() || null),
    phone: (String(formData.get("phone") ?? "").trim() || null),
    status: String(formData.get("status") ?? "ativo"),
  }
}

export async function createCustomer(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("customers").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/registers/customers")
  return { error: null }
}

export async function updateCustomer(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("customers").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/customers")
  return { error: null }
}

export async function deleteCustomer(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("customers").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/customers")
  return { error: null }
}
