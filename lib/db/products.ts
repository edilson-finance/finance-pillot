import { createClient } from "@/lib/supabase/server"

export type Product = {
  id: string
  name: string
  kind: string
  price: number
  unit: string | null
  created_at: string
}

export async function listProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("products").select("*").order("name")
  return (data ?? []) as Product[]
}
