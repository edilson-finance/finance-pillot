import { createClient } from "@/lib/supabase/server"

export type Product = {
  id: string
  name: string
  kind: string
  price: number
  unit: string | null
  created_at: string
  // ── Locação (só usados quando a empresa administra imóveis de terceiros) ──
  partner_id: string | null          // proprietário (recebedor do repasse)
  tenant_id: string | null           // inquilino
  commission_percent: number         // % que fica com a imobiliária
  rental_status: string              // 'alugado' | 'vago'
  rent_amount: number                // valor do aluguel
  billing_day: number | null         // dia do boleto
  transfer_day: number | null        // dia do repasse ao proprietário
  contract_end: string | null        // término do contrato
  partner?: { name: string; pix_key: string | null } | null
  tenant?: { name: string } | null
}

export async function listProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select("*, partner:partners(name, pix_key), tenant:customers(name)")
    .order("name")
  return (data ?? []) as Product[]
}
