"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { UserCompanyLink } from "@/lib/db/admin"

type Result = { error: string | null }
type CreateUserResult = Result & { userId?: string }
type CreateCompanyResult = Result & { companyId?: string }

// O functions.invoke do supabase-js transforma qualquer resposta non-2xx num
// erro genérico ("Edge Function returned a non-2xx status code") e guarda a
// resposta original em `context`. Aqui extraímos o motivo real do corpo JSON
// (ex.: "A user with this email address has already been registered") para
// que o super admin veja a causa em vez da mensagem genérica.
async function edgeFnError(err: unknown, fallback: string): Promise<string> {
  const ctx = (err as { context?: { json?: () => Promise<unknown> } } | null)?.context
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as { error?: unknown } | null
      if (body?.error) return String(body.error)
    } catch {
      // corpo não-JSON: cai no fallback abaixo
    }
  }
  const msg = (err as { message?: string } | null)?.message
  return msg || fallback
}

async function assertSuperAdmin(): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Não autenticado" }
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "super_admin") return { ok: false, error: "Acesso restrito" }
  return { ok: true, error: null }
}

export async function createCompany(formData: FormData): Promise<CreateCompanyResult> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { error: guard.error }

  const name = String(formData.get("name") ?? "").trim()
  const type = String(formData.get("type") ?? "").trim()
  if (!name) return { error: "Nome da empresa é obrigatório" }

  const supabase = await createClient()
  const { data: companyId, error } = await supabase.rpc("fn_admin_create_company", {
    p_name: name, p_type: type,
  })
  if (error) return { error: error.message }

  // Admin opcional no mesmo formulário.
  const withAdmin = String(formData.get("with_admin") ?? "") === "on"
  if (withAdmin) {
    const adminEmail = String(formData.get("admin_email") ?? "").trim().toLowerCase()
    const adminPassword = String(formData.get("admin_password") ?? "")
    const adminName = String(formData.get("admin_name") ?? "").trim()
    if (!adminEmail || !adminPassword) {
      revalidatePath("/admin")
      return { error: "Empresa criada, mas e-mail/senha do admin faltaram", companyId: String(companyId) }
    }
    const { data, error: fnErr } = await supabase.functions.invoke("admin-create-user", {
      body: { email: adminEmail, password: adminPassword, name: adminName, company_id: companyId, role: "admin" },
    })
    if (fnErr) {
      const reason = await edgeFnError(fnErr, "falha ao criar usuário")
      return { error: `Empresa criada, mas falhou ao criar admin: ${reason}`, companyId: String(companyId) }
    }
    if (data && data.created === false) {
      return { error: `Empresa criada, mas falhou ao criar admin: ${data.error}`, companyId: String(companyId) }
    }
  }

  revalidatePath("/admin")
  return { error: null, companyId: String(companyId) }
}

export async function updateCompanyName(companyId: string, name: string): Promise<Result> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { error: guard.error }

  const trimmed = name.trim()
  if (!trimmed) return { error: "O nome da empresa não pode ficar vazio." }

  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_admin_update_company", {
    p_company_id: companyId, p_name: trimmed,
  })
  if (error) return { error: error.message }

  revalidatePath("/admin")
  revalidatePath(`/admin/companies/${companyId}`)
  return { error: null }
}

export async function createUser(formData: FormData): Promise<CreateUserResult> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { error: guard.error }

  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const companyId = String(formData.get("company_id") ?? "").trim() || null
  const role = String(formData.get("role") ?? "member")
  if (!email || !password) return { error: "E-mail e senha são obrigatórios" }

  const supabase = await createClient()
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { email, password, name, company_id: companyId, role },
  })
  if (error) return { error: await edgeFnError(error, "Falha ao criar usuário") }
  if (data && data.created === false) return { error: data.error ?? "Falha ao criar usuário" }

  revalidatePath("/admin")
  revalidatePath("/admin/users")
  return { error: null, userId: data?.user_id }
}

export async function setUserCompany(
  userId: string, companyId: string, role: string,
): Promise<Result> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_admin_set_user_company", {
    p_user_id: userId, p_company_id: companyId, p_role: role,
  })
  if (error) return { error: error.message }
  revalidatePath("/admin")
  revalidatePath("/admin/users")
  return { error: null }
}

// Desvincula o usuário de uma empresa (remove a participação em company_members).
export async function unlinkUserCompany(userId: string, companyId: string): Promise<Result> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_admin_unlink_user_company", {
    p_user_id: userId, p_company_id: companyId,
  })
  if (error) return { error: error.message }
  revalidatePath("/admin")
  revalidatePath("/admin/users")
  return { error: null }
}

// Lista TODAS as empresas vinculadas a um usuário, com papel e qual é a ativa.
export async function getUserCompanies(
  userId: string,
): Promise<{ data: UserCompanyLink[]; error: string | null }> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { data: [], error: guard.error }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_admin_user_companies", { p_user_id: userId })
  if (error) return { data: [], error: error.message }
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    company_id: String(r.company_id),
    company_name: String(r.company_name ?? ""),
    role: String(r.role ?? ""),
    is_active: Boolean(r.is_active),
  }))
  return { data: rows, error: null }
}

// Atualiza nome, e-mail e/ou senha de um usuário (via edge function service_role).
export async function updateUser(
  userId: string,
  fields: { name?: string; email?: string; password?: string },
): Promise<Result> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { error: guard.error }

  const body: Record<string, unknown> = { user_id: userId }
  if (typeof fields.name === "string") body.name = fields.name.trim()
  const email = fields.email?.trim().toLowerCase()
  if (email) body.email = email
  if (fields.password) body.password = fields.password

  const supabase = await createClient()
  const { data, error } = await supabase.functions.invoke("admin-update-user", { body })
  if (error) return { error: await edgeFnError(error, "Falha ao atualizar usuário") }
  if (data && data.updated === false) return { error: data.error ?? "Falha ao atualizar usuário" }

  revalidatePath("/admin")
  revalidatePath("/admin/users")
  return { error: null }
}
