import { createClient } from "@/lib/supabase/server"

export type Category = {
  id: string
  name: string
  kind: string
  created_at: string
}

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("categories").select("*").order("name")
  return (data ?? []) as Category[]
}
