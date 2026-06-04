"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

type Result = { error: string | null }
type InviteResult = Result & { link?: string; added?: boolean; addedName?: string }

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

export async function createInvite(formData: FormData): Promise<InviteResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const role = String(formData.get("role") ?? "member")
  const modules = formData.getAll("modules").map(String)
  if (!email) return { error: "E-mail é obrigatório" }
  if (role !== "admin" && role !== "member") return { error: "Perfil inválido" }

  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).single()
  if (!profile?.company_id) return { error: "Empresa não encontrada" }

  // Convite inteligente: se o e-mail já tem conta no sistema, vincula a pessoa
  // direto à empresa ativa (sem tentar criar conta nova, o que daria
  // "usuário já existe"). Só cai no convite por link quando não há conta.
  const { data: addRes, error: addErr } = await supabase.rpc("fn_company_add_existing_user", {
    p_email: email,
    p_role: role,
    p_modules: role === "member" ? modules : [],
  })
  if (addErr) return { error: addErr.message }
  const status = (addRes as { status?: string } | null)?.status
  const addedName = (addRes as { name?: string } | null)?.name
  if (status === "added") {
    revalidatePath("/users")
    return { error: null, added: true, addedName: addedName || email }
  }
  if (status === "already_member") {
    return { error: "Este usuário já faz parte da sua empresa." }
  }
  // status "not_found" ou "no_profile" → segue com o convite por link abaixo.

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      company_id: profile.company_id,
      email,
      role,
      modules: role === "member" ? modules : [],
    })
    .select("token")
    .single()
  if (error) return { error: error.message }

  const link = `${await siteOrigin()}/signup?token=${invite.token}`

  // Best-effort email delivery; the link works regardless of email provider.
  try {
    const { data: company } = await supabase
      .from("companies").select("name").eq("id", profile.company_id).single()
    await supabase.functions.invoke("invite-user", {
      body: { email, link, companyName: company?.name ?? "", role },
    })
  } catch {
    /* email is optional — the admin can share the link manually */
  }

  revalidatePath("/users")
  return { error: null, link }
}

export async function revokeInvite(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("invites").update({ status: "revoked" }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/users")
  return { error: null }
}

export async function updateUserRole(userId: string, role: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role })
  if (error) return { error: error.message }
  revalidatePath("/users")
  return { error: null }
}

export async function setMemberPermissions(userId: string, modules: string[]): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("set_member_permissions", {
    p_user_id: userId,
    p_modules: modules,
  })
  if (error) return { error: error.message }
  revalidatePath("/users")
  return { error: null }
}

export async function removeUser(userId: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("remove_company_user", { p_user_id: userId })
  if (error) return { error: error.message }
  revalidatePath("/users")
  return { error: null }
}

export async function updateUserName(userId: string, name: string): Promise<Result> {
  const trimmed = name.trim()
  if (!trimmed) return { error: "O nome não pode ficar vazio." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("set_user_name", { p_user_id: userId, p_name: trimmed })
  if (error) return { error: error.message }
  revalidatePath("/users")
  return { error: null }
}

export async function setUserActive(userId: string, active: boolean): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("set_user_active", { p_user_id: userId, p_active: active })
  if (error) return { error: error.message }
  revalidatePath("/users")
  return { error: null }
}
