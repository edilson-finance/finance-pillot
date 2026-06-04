import { createClient } from "@/lib/supabase/server"

export type CostCenter = {
  id: string
  name: string
  code: string | null
  created_at: string
}

export async function listCostCenters(): Promise<CostCenter[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("cost_centers").select("*").order("name")
  return (data ?? []) as CostCenter[]
}
