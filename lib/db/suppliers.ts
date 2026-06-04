import { createClient } from "@/lib/supabase/server"

export type Supplier = {
  id: string
  name: string
  document: string | null
  email: string | null
  phone: string | null
  status: string
  created_at: string
}

export async function listSuppliers(): Promise<Supplier[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("suppliers").select("*").order("name")
  return (data ?? []) as Supplier[]
}
