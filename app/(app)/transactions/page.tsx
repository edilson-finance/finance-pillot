import { listCategories } from "@/lib/db/categories"
import { listAccounts } from "@/lib/db/accounts"
import { listCostCenters } from "@/lib/db/cost-centers"
import { listCustomers } from "@/lib/db/customers"
import { listSuppliers } from "@/lib/db/suppliers"
import { listProducts } from "@/lib/db/products"
import { listPartners } from "@/lib/db/partners"
import { getCompanySettings } from "@/lib/db/company"
import { listRecentEntries } from "@/lib/db/lancamentos"
import TransactionsClient from "./transactions-client"

export const metadata = { title: "Lançamentos" }


export default async function TransactionsPage() {
  const [categories, accounts, costCenters, customers, suppliers, products, partners, company, recent] =
    await Promise.all([
      listCategories(),
      listAccounts(),
      listCostCenters(),
      listCustomers(),
      listSuppliers(),
      listProducts(),
      listPartners(),
      getCompanySettings(),
      listRecentEntries(8),
    ])

  return (
    <TransactionsClient
      categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name, balance: a.opening_balance }))}
      costCenters={costCenters.map((c) => ({ id: c.id, name: c.name }))}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, unit: p.unit }))}
      partners={partners.filter((p) => p.status === "ativo").map((p) => ({ id: p.id, name: p.name }))}
      partnerReceiversEnabled={company?.partner_receivers_enabled ?? false}
      recent={recent}
    />
  )
}
