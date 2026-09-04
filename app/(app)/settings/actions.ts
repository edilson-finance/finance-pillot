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

// Resolve o company_id do PRÓPRIO usuário. O filtro .eq("id", user.id) é
// obrigatório: após a migração 0023 a RLS de profiles deixa o usuário enxergar
// todos os colegas da mesma empresa (company_id = auth_company_id()). Sem o
// filtro, em empresas com 2+ membros o select retorna várias linhas e o
// .single() falha — fazendo company_id virar null e disparar "Empresa não
// identificada". maybeSingle() garante 0 ou 1 linha sem estourar.
async function companyId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).maybeSingle()
  return data?.company_id ?? null
}

// Empresa + papel do próprio usuário, numa query. Usado onde a escrita passa pela
// chave service_role (Storage do logo), que ignora a RLS — então o papel precisa
// ser checado na própria action, senão qualquer membro fura a policy admin-only.
async function companyAndRole(
  supabase: SupabaseClient,
): Promise<{ id: string | null; role: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { id: null, role: null }
  const { data } = await supabase
    .from("profiles").select("company_id, role").eq("id", user.id).maybeSingle()
  return { id: data?.company_id ?? null, role: (data?.role as string) ?? null }
}

function isAdmin(role: string | null): boolean {
  return role === "admin" || role === "super_admin"
}

// Allowlist de imagem para o logo. SVG fica de FORA de propósito: o bucket é
// público e um SVG pode carregar <script> (XSS na origem do Storage). A extensão
// do arquivo salvo é derivada daqui (do MIME validado), nunca do nome enviado.
const LOGO_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
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
  partner_receivers_enabled?: boolean
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
  if (input.partner_receivers_enabled !== undefined) {
    patch.partner_receivers_enabled = !!input.partner_receivers_enabled
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
  const { id, role } = await companyAndRole(supabase)
  if (!id) return { ok: false, error: "Empresa não identificada." }
  if (!isAdmin(role)) {
    return { ok: false, error: "Apenas administradores podem alterar o logo." }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo de imagem." }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "Arquivo muito grande. Máximo 2MB." }
  }
  const ext = LOGO_MIME[file.type]
  if (!ext) {
    return { ok: false, error: "Formato inválido. Use PNG, JPG ou WEBP." }
  }

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
  const { id, role } = await companyAndRole(supabase)
  if (!id) return { ok: false, error: "Empresa não identificada." }
  if (!isAdmin(role)) {
    return { ok: false, error: "Apenas administradores podem alterar o logo." }
  }

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
