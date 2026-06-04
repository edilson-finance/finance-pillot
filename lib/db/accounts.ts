import { createClient } from "@/lib/supabase/server"

export type Account = {
  id: string
  name: string
  bank: string | null
  kind: string
  opening_balance: number
  created_at: string
}

export async function listAccounts(): Promise<Account[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("accounts").select("*").order("name")
  return (data ?? []) as Account[]
}
