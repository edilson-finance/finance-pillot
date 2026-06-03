import { createClient } from "@/lib/supabase/server"

export type Customer = {
  id: string
  name: string
  document: string | null
  email: string | null
  phone: string | null
  status: string
  created_at: string
}

export async function listCustomers(): Promise<Customer[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("customers").select("*").order("name")
  return (data ?? []) as Customer[]
}
