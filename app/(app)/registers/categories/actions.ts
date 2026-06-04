"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? "despesa"),
  }
}

export async function createCategory(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("categories").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/registers/categories")
  return { error: null }
}

export async function updateCategory(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("categories").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/categories")
  return { error: null }
}

export async function deleteCategory(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/categories")
  return { error: null }
}
