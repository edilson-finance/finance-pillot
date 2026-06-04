"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }
type CreateUserResult = Result & { userId?: string }
type CreateCompanyResult = Result & { companyId?: string }

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
    if (fnErr) return { error: `Empresa criada, mas falhou ao criar admin: ${fnErr.message}`, companyId: String(companyId) }
    if (data && data.created === false) {
      return { error: `Empresa criada, mas falhou ao criar admin: ${data.error}`, companyId: String(companyId) }
    }
  }

  revalidatePath("/admin")
  return { error: null, companyId: String(companyId) }
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
  if (error) return { error: error.message }
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
