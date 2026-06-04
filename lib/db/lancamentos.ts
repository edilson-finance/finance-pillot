import { createClient } from "@/lib/supabase/server"

export type RecentEntry = {
  id: string
  kind: "receita" | "despesa"
  date: string
  description: string
  party: string | null
  amount: number
  status: string
}

// Feed unificado para a coluna "Últimos lançamentos".
export async function listRecentEntries(limit = 8): Promise<RecentEntry[]> {
  const supabase = await createClient()
  const [{ data: recv }, { data: pay }] = await Promise.all([
    supabase
      .from("receivables")
      .select("id, description, due_date, amount, status, customer:customers(name)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("payables")
      .select("id, description, due_date, amount, status, supplier:suppliers(name)")
      .order("created_at", { ascending: false })
      .limit(limit),
  ])

  const receitas: RecentEntry[] = ((recv ?? []) as any[]).map((r) => ({
    id: r.id,
    kind: "receita",
    date: r.due_date,
    description: r.description ?? "—",
    party: r.customer?.name ?? null,
    amount: Number(r.amount ?? 0),
    status: r.status,
  }))
  const despesas: RecentEntry[] = ((pay ?? []) as any[]).map((p) => ({
    id: p.id,
    kind: "despesa",
    date: p.due_date,
    description: p.description ?? "—",
    party: p.supplier?.name ?? null,
    amount: Number(p.amount ?? 0),
    status: p.status,
  }))

  return [...receitas, ...despesas]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
}
