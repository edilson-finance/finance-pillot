"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { ok: boolean; error?: string }

function revalidate() {
  revalidatePath("/registers/categories")
  revalidatePath("/dre")
}

type DbClient = Awaited<ReturnType<typeof createClient>>

async function kindForGroup(supabase: DbClient, grupo: string): Promise<string> {
  const { data } = await supabase.from("dre_groups").select("natureza").eq("grupo", grupo).single()
  return data?.natureza === "receita" ? "receita" : data?.natureza === "neutro" ? "neutro" : "despesa"
}

async function nextChildCode(supabase: DbClient, parentId: string): Promise<string | null> {
  const { data: parent } = await supabase.from("categories").select("code").eq("id", parentId).single()
  if (!parent?.code) return null
  const { data: sibs } = await supabase.from("categories").select("code").eq("parent_id", parentId)
  let max = 0
  for (const s of sibs ?? []) {
    const last = Number(String(s.code ?? "").split(".").pop())
    if (!Number.isNaN(last) && last > max) max = last
  }
  return `${parent.code}.${max + 1}`
}

export async function createCategory(input: {
  parent_id?: string | null
  grupo: string
  name: string
  is_synthetic?: boolean
}): Promise<Result> {
  const name = input.name?.trim()
  if (!name) return { ok: false, error: "Informe o nome da categoria." }
  if (!input.grupo) return { ok: false, error: "Selecione o grupo da DRE." }

  const supabase = await createClient()
  const kind = await kindForGroup(supabase, input.grupo)
  const code = input.parent_id ? await nextChildCode(supabase, input.parent_id) : null

  const { error } = await supabase.from("categories").insert({
    name,
    grupo: input.grupo,
    parent_id: input.parent_id ?? null,
    is_synthetic: input.is_synthetic ?? false,
    kind,
    code,
    active: true,
  })
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}

export async function updateCategory(input: {
  id: string
  name?: string
  grupo?: string
  active?: boolean
  description?: string | null
}): Promise<Result> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const n = input.name.trim()
    if (!n) return { ok: false, error: "O nome não pode ficar vazio." }
    patch.name = n
  }
  if (input.grupo !== undefined) {
    patch.grupo = input.grupo
    patch.kind = await kindForGroup(supabase, input.grupo)
  }
  if (input.active !== undefined) patch.active = input.active
  if (input.description !== undefined) patch.description = input.description

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase.from("categories").update(patch).eq("id", input.id)
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}

export async function deleteCategory(id: string): Promise<Result> {
  const supabase = await createClient()

  const { count: childCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id)
  if ((childCount ?? 0) > 0) {
    return { ok: false, error: "Remova ou mova as subcategorias antes de excluir este grupo." }
  }

  for (const tbl of ["transactions", "payables", "receivables"] as const) {
    const { count } = await supabase.from(tbl).select("id", { count: "exact", head: true }).eq("category_id", id)
    if ((count ?? 0) > 0) {
      return { ok: false, error: "Esta categoria possui lançamentos vinculados e não pode ser excluída." }
    }
  }

  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}

export async function seedDefaults(): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." }
  // .eq("id", user.id): sem ele o .single() quebra em empresas com 2+ membros
  // (a RLS deixa ver os profiles dos colegas). Ver lib/db/company.ts.
  const { data: prof } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).maybeSingle()
  if (!prof?.company_id) return { ok: false, error: "Empresa não identificada." }
  const { error } = await supabase.rpc("fn_seed_default_categories", { p_company: prof.company_id })
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}
