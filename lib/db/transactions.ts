import { createClient } from "@/lib/supabase/server"

export type Transaction = {
  id: string; type: "entrada" | "saida"; date: string; amount: number; description: string | null
  category_id: string | null; account_id: string | null; cost_center_id: string | null
  customer_id: string | null; supplier_id: string | null
  category: { name: string } | null; account: { name: string } | null
  customer: { name: string } | null; supplier: { name: string } | null
}

export async function listTransactions(): Promise<Transaction[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("transactions")
    .select("*, category:categories(name), account:accounts(name), customer:customers(name), supplier:suppliers(name)")
    .order("date", { ascending: false })
  return (data ?? []) as unknown as Transaction[]
}
