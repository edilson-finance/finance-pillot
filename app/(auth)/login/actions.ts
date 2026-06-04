"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  })
  if (error) return { error: error.message }
  const next = String(formData.get("next") ?? "").trim()
  redirect(next && next.startsWith("/") ? next : "/dashboard")
}
