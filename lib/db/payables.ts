import { createClient } from "@/lib/supabase/server"

export type Payable = {
  id: string
  description: string | null
  due_date: string
  installment: string | null
  amount: number
  status: "a_pagar" | "em_atraso" | "pago"
  paid_at: string | null
  supplier_id: string | null
  category_id: string | null
  account_id: string | null
  supplier: { name: string } | null
  category: { name: string } | null
}

export async function listPayables(): Promise<Payable[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("payables")
    .select("*, supplier:suppliers(name), category:categories(name)")
    .order("due_date")
  return (data ?? []) as unknown as Payable[]
}
