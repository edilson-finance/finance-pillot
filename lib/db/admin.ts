import { createClient } from "@/lib/supabase/server"

export type CompanyOverview = {
  id: string
  name: string
  type: string
  created_at: string
  user_count: number
  last_sign_in: string | null
  last_transaction_at: string | null
  transaction_count: number
  faturamento: number
  despesa: number
  saldo: number
  a_receber: number
  a_pagar: number
  customers_count: number
  suppliers_count: number
  products_count: number
  transactions_count: number
}

export type CompanyUserRow = {
  id: string
  name: string
  role: string
  email: string
  last_sign_in: string | null
}

export type CompanyDetail = {
  id: string
  name: string
  type: string
  created_at: string
  user_count: number
  transaction_count: number
  last_transaction_at: string | null
  a_receber: number
  a_pagar: number
  saldo: number
  users: CompanyUserRow[]
}

export type AdminUser = {
  id: string
  email: string
  name: string
  company_id: string | null
  company_name: string | null
  role: string
  last_sign_in: string | null
}

const num = (v: unknown) => Number(v ?? 0)

export async function listCompaniesOverview(): Promise<CompanyOverview[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("fn_admin_companies_overview")
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    type: String(r.type ?? ""),
    created_at: String(r.created_at ?? ""),
    user_count: num(r.user_count),
    last_sign_in: (r.last_sign_in as string) ?? null,
    last_transaction_at: (r.last_transaction_at as string) ?? null,
    transaction_count: num(r.transaction_count),
    faturamento: num(r.faturamento),
    despesa: num(r.despesa),
    saldo: num(r.saldo),
    a_receber: num(r.a_receber),
    a_pagar: num(r.a_pagar),
    customers_count: num(r.customers_count),
    suppliers_count: num(r.suppliers_count),
    products_count: num(r.products_count),
    transactions_count: num(r.transactions_count),
  }))
}

export async function getCompanyDetail(id: string): Promise<CompanyDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("fn_admin_company_detail", { p_company_id: id })
  if (!data) return null
  const d = data as Record<string, unknown>
  return {
    id: String(d.id),
    name: String(d.name ?? ""),
    type: String(d.type ?? ""),
    created_at: String(d.created_at ?? ""),
    user_count: num(d.user_count),
    transaction_count: num(d.transaction_count),
    last_transaction_at: (d.last_transaction_at as string) ?? null,
    a_receber: num(d.a_receber),
    a_pagar: num(d.a_pagar),
    saldo: num(d.saldo),
    users: ((d.users ?? []) as Record<string, unknown>[]).map((u) => ({
      id: String(u.id),
      name: String(u.name ?? ""),
      role: String(u.role ?? ""),
      email: String(u.email ?? ""),
      last_sign_in: (u.last_sign_in as string) ?? null,
    })),
  }
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("fn_admin_list_users")
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    email: String(r.email ?? ""),
    name: String(r.name ?? ""),
    company_id: (r.company_id as string) ?? null,
    company_name: (r.company_name as string) ?? null,
    role: String(r.role ?? ""),
    last_sign_in: (r.last_sign_in as string) ?? null,
  }))
}
