import { createClient } from "@/lib/supabase/server"

export type Partner = {
  id: string
  name: string
  document: string | null
  pix_key: string | null
  notes: string | null
  status: string
  created_at: string
}

export async function listPartners(): Promise<Partner[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("partners").select("*").order("name")
  return (data ?? []) as Partner[]
}
