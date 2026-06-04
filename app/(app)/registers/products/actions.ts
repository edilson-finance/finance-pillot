"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? "produto"),
    price: Number(formData.get("price") ?? 0),
    unit: (String(formData.get("unit") ?? "").trim() || null),
  }
}

export async function createProduct(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("products").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/registers/products")
  return { error: null }
}

export async function updateProduct(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("products").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/products")
  return { error: null }
}

export async function deleteProduct(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/products")
  return { error: null }
}
