"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const token = String(formData.get("token") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: { data: { name } },
  })
  if (error) return { error: error.message }
  if (token) redirect(`/accept-invite?token=${encodeURIComponent(token)}`)
  redirect("/onboarding")
}
