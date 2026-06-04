import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MODULES } from "@/lib/modules"
import type { SessionInfo } from "@/lib/session-context"

export async function getSessionProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase
    .from("profiles").select("*, companies(*)").eq("id", user.id).single()
  if (!profile) redirect("/onboarding")
  return { user, profile }
}

export async function getSessionContext(): Promise<SessionInfo> {
  const { user, profile } = await getSessionProfile()
  const role = profile.role as SessionInfo["role"]

  let allowedModules: string[]
  if (role === "admin" || role === "super_admin") {
    allowedModules = MODULES.map((m) => m.key)
  } else {
    const supabase = await createClient()
    const { data } = await supabase
      .from("member_permissions")
      .select("module")
      .eq("user_id", user.id)
      .eq("allowed", true)
    allowedModules = (data ?? []).map((r) => r.module as string)
  }

  return {
    userId: user.id,
    name: profile.name || (user.email ?? "").split("@")[0],
    email: user.email ?? "",
    role,
    companyName: profile.companies?.name ?? "Minha Empresa",
    allowedModules,
  }
}
