"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("create_company_and_profile", {
    p_name: String(formData.get("company_name")),
    p_type: String(formData.get("company_type")),
    p_user_name: String(formData.get("user_name")),
  })
  if (error) return { error: error.message }
  redirect("/dashboard")
}
