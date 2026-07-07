"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    document: (String(formData.get("document") ?? "").trim() || null),
    pix_key: (String(formData.get("pix_key") ?? "").trim() || null),
    notes: (String(formData.get("notes") ?? "").trim() || null),
    status: String(formData.get("status") ?? "ativo"),
  }
}

export async function createPartner(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("partners").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/registers/partners")
  return { error: null }
}

export async function updatePartner(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.name) return { error: "Nome é obrigatório" }
  const { error } = await supabase.from("partners").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/partners")
  return { error: null }
}

export async function deletePartner(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("partners").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/registers/partners")
  return { error: null }
}
