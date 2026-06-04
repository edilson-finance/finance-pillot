"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"

type Result = { ok: boolean; error?: string }

const COMPANY_TYPES = [
  "industria", "comercio", "servicos", "construcao",
  "agro", "tecnologia", "saude_educacao", "misto",
] as const

function revalidate() {
  revalidatePath("/settings")
  revalidatePath("/", "layout")
}

// Resolve o company_id reutilizando o MESMO client da operação. Usar um client
// por request evita a corrida de refresh de token do @supabase/ssr (duas
// instâncias tentando rotacionar o refresh token), que fazia o upload de logo
// chegar ao Storage como anônimo e violar a RLS.
async function companyId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("company_id").single()
  return data?.company_id ?? null
}

export interface CompanyInput {
  name?: string
  type?: string
  razao_social?: string | null
  cnpj?: string | null
  inscricao_estadual?: string | null
  segmento?: string | null
  regime_tributario?: string | null
  regime_financeiro?: string | null
  telefone?: string | null
  whatsapp?: string | null
  email?: string | null
  site?: string | null
  cep?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
}

const TEXT_FIELDS: (keyof CompanyInput)[] = [
  "razao_social", "cnpj", "inscricao_estadual", "segmento", "regime_tributario",
  "regime_financeiro", "telefone", "whatsapp", "email", "site", "cep",
  "endereco", "cidade", "estado",
]

export async function updateCompany(input: CompanyInput): Promise<Result> {
  const supabase = await createClient()
  // Hidrata/rotaciona a sessão uma única vez antes de qualquer query.
  await supabase.auth.getUser()
  const id = await companyId(supabase)
  if (!id) return { ok: false, error: "Empresa não identificada." }

  const patch: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const n = input.name.trim()
    if (!n) return { ok: false, error: "O nome da empresa não pode ficar vazio." }
    patch.name = n
  }
  if (input.type !== undefined) {
    if (!COMPANY_TYPES.includes(input.type as (typeof COMPANY_TYPES)[number])) {
      return { ok: false, error: "Perfil econômico inválido." }
    }
    patch.type = input.type
  }
  for (const f of TEXT_FIELDS) {
    if (input[f] !== undefined) {
      const v = input[f]
      patch[f] = typeof v === "string" ? v.trim() || null : v
    }
  }

  if (Object.keys(patch).length === 0) return { ok: true }

  const { error } = await supabase.from("companies").update(patch).eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}

export async function uploadCompanyLogo(
  formData: FormData,
): Promise<Result & { url?: string }> {
  const supabase = await createClient()
  await supabase.auth.getUser()
  const id = await companyId(supabase)
  if (!id) return { ok: false, error: "Empresa não identificada." }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo de imagem." }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "Arquivo muito grande. Máximo 2MB." }
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Envie um arquivo de imagem (PNG, JPG ou SVG)." }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png"
  const path = `${id}/logo-${Date.now()}.${ext}`

  // O upload roda com a chave service role: a RLS do Storage rejeita o token do
  // usuário mesmo com policy permissiva (ver lib/supabase/admin.ts). O caminho é
  // fixado em `${id}/...`, a pasta da empresa do usuário autenticado, então não
  // há como gravar fora do escopo dele.
  const admin = createAdminClient()
  const { error: upErr } = await admin.storage
    .from("company-logos")
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) return { ok: false, error: upErr.message }

  const { data: pub } = admin.storage.from("company-logos").getPublicUrl(path)
  const url = pub.publicUrl

  const { error } = await supabase.from("companies").update({ logo_url: url }).eq("id", id)
  if (error) return { ok: false, error: error.message }

  revalidate()
  return { ok: true, url }
}

export async function removeCompanyLogo(): Promise<Result> {
  const supabase = await createClient()
  await supabase.auth.getUser()
  const id = await companyId(supabase)
  if (!id) return { ok: false, error: "Empresa não identificada." }

  // Remove os arquivos da pasta da empresa (best-effort) com a chave service
  // role — a RLS do Storage rejeita o token do usuário (ver admin.ts).
  const admin = createAdminClient()
  const { data: files } = await admin.storage.from("company-logos").list(id)
  if (files?.length) {
    await admin.storage.from("company-logos").remove(files.map((f) => `${id}/${f.name}`))
  }

  const { error } = await supabase.from("companies").update({ logo_url: null }).eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}
