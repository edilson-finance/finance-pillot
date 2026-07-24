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
  // Open redirect guard: `startsWith("/")` sozinho deixa passar URLs
  // protocolo-relativas (`//evil.com`) e a variante `/\evil.com`, que o browser
  // resolve como origem externa. Exige caminho interno de verdade.
  const next = String(formData.get("next") ?? "").trim()
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
      ? next
      : "/dashboard"
  redirect(safeNext)
}
