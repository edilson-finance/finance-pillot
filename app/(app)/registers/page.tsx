import { createClient } from "@/lib/supabase/server"
import { getCompanySettings } from "@/lib/db/company"
import RegistersClient from "./registers-client"

const TABLES: Record<string, string> = {
  "/registers/categories":   "categories",
  "/registers/cost-centers": "cost_centers",
  "/registers/customers":    "customers",
  "/registers/suppliers":    "suppliers",
  "/registers/accounts":     "accounts",
  "/registers/products":     "products",
  "/registers/partners":     "partners",
}

export default async function RegistersPage() {
  const supabase = await createClient()
  const [entries, company] = await Promise.all([
    Promise.all(
      Object.entries(TABLES).map(async ([href, table]) => {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true })
        return [href, count ?? 0] as const
      })
    ),
    getCompanySettings(),
  ])
  const counts = Object.fromEntries(entries)
  return <RegistersClient counts={counts} partnersEnabled={company?.partner_receivers_enabled ?? false} />
}
