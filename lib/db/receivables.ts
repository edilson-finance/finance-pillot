import { createClient } from "@/lib/supabase/server"

export type Receivable = {
  id: string
  description: string | null
  due_date: string
  installment: string | null
  amount: number
  interest: number
  status: "a_receber" | "em_atraso" | "recebido"
  received_at: string | null
  customer_id: string | null
  category_id: string | null
  account_id: string | null
  partner_id: string | null
  commission_amount: number
  customer: { name: string } | null
  category: { name: string } | null
  partner: { name: string } | null
}

async function query() {
  const supabase = await createClient()
  return supabase
    .from("receivables")
    .select("*, customer:customers(name), category:categories(name), partner:partners(name)")
    .order("due_date")
}

export async function listReceivables(): Promise<Receivable[]> {
  const { data } = await query()
  return (data ?? []) as unknown as Receivable[]
}

export async function listDelinquent(): Promise<Receivable[]> {
  // overdue = not received and past due. Compute days overdue in the UI.
  const all = await listReceivables()
  const today = new Date().toISOString().slice(0, 10)
  return all.filter(
    r => r.status !== "recebido" && (r.status === "em_atraso" || r.due_date < today)
  )
}
