"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

// Campo numérico opcional: string vazia vira null (e não 0/NaN).
function optNum(fd: FormData, k: string): number | null {
  const v = String(fd.get(k) ?? "").trim()
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parsePayload(formData: FormData) {
  const base = {
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? "produto"),
    price: Number(formData.get("price") ?? 0),
    unit: (String(formData.get("unit") ?? "").trim() || null),
  }
  // Campos de locação só entram quando o formulário os enviou (função ligada) —
  // assim editar com a locação desligada não apaga o que já estava preenchido.
  if (!formData.has("partner_id")) return base
  const pct = optNum(formData, "commission_percent") ?? 0
  return {
    ...base,
    partner_id: (String(formData.get("partner_id") ?? "").trim() || null),
    tenant_id: (String(formData.get("tenant_id") ?? "").trim() || null),
    commission_percent: Math.min(100, Math.max(0, pct)),
    rental_status: String(formData.get("rental_status") ?? "vago") === "alugado" ? "alugado" : "vago",
    rent_amount: optNum(formData, "rent_amount") ?? 0,
    billing_day: optNum(formData, "billing_day"),
    transfer_day: optNum(formData, "transfer_day"),
    contract_end: (String(formData.get("contract_end") ?? "").trim() || null),
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
