import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function getSessionProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase
    .from("profiles").select("*, companies(*)").eq("id", user.id).single()
  if (!profile) redirect("/onboarding")
  return { user, profile }
}
