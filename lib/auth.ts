import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MODULES } from "@/lib/modules"
import type { SessionInfo } from "@/lib/session-context"

export async function getSessionProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  // IMPORTANTE: após a migração 0023, company_members e member_permissions
  // ligam profiles↔companies, criando relações extras. Por isso o embed precisa
  // apontar explicitamente a FK direta (profiles.company_id); caso contrário o
  // PostgREST falha com PGRST201 (ambiguidade) e o perfil vem nulo — jogando o
  // usuário em loop no onboarding. Usamos maybeSingle para distinguir "sem
  // perfil" (vai ao onboarding) de erro real (estoura), sem cair em loop.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*, companies!profiles_company_id_fkey(*)")
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar perfil: ${error.message}`)
  if (!profile) redirect("/onboarding")
  // Usuário desativado por um administrador: bloqueia o acesso ao app.
  if (profile.active === false) redirect("/conta-desativada")
  return { user, profile }
}

export async function getSessionContext(): Promise<SessionInfo> {
  const { user, profile } = await getSessionProfile()
  const role = profile.role as SessionInfo["role"]
  const supabase = await createClient()

  let allowedModules: string[]
  if (role === "admin" || role === "super_admin") {
    allowedModules = MODULES.map((m) => m.key)
  } else {
    // RLS já escopa member_permissions à empresa ativa do chamador.
    const { data } = await supabase
      .from("member_permissions")
      .select("module")
      .eq("user_id", user.id)
      .eq("allowed", true)
    allowedModules = (data ?? []).map((r) => r.module as string)
  }

  // Empresas das quais o usuário participa (fonte: company_members).
  const { data: memberships } = await supabase
    .from("company_members")
    .select("role, companies(id, name)")
    .eq("user_id", user.id)
  const companies = (memberships ?? [])
    .map((m) => {
      const c = m.companies as unknown as { id: string; name: string } | null
      if (!c) return null
      return { id: c.id, name: c.name, role: m.role as SessionInfo["role"] }
    })
    .filter((c): c is SessionInfo["companies"][number] => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

  return {
    userId: user.id,
    name: profile.name || (user.email ?? "").split("@")[0],
    email: user.email ?? "",
    role,
    companyId: profile.company_id ?? null,
    companyName: profile.companies?.name ?? "Minha Empresa",
    companies,
    allowedModules,
  }
}
