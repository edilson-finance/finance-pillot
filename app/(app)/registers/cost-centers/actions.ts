"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    code: (String(formData.get("code") ?? "").trim() || null),
  }
}

export async function createCostCenter(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("cost_centers").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/registers/cost-centers")
  return { error: null }
}

export async function updateCostCenter(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("cost_centers").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/cost-centers")
  return { error: null }
}

export async function deleteCostCenter(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("cost_centers").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/cost-centers")
  return { error: null }
}
