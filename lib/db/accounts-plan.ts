import { createClient } from "@/lib/supabase/server"

export type AccountPlan = {
  id: string
  code: string
  name: string
  parent_id: string | null
  kind: string | null
  created_at: string
}

export async function listAccountsPlan(): Promise<AccountPlan[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("accounts_plan").select("*").order("code")
  return (data ?? []) as AccountPlan[]
}
