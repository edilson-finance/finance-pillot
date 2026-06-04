import { listCategories } from "@/lib/db/categories"
import { listAccounts } from "@/lib/db/accounts"
import { listCostCenters } from "@/lib/db/cost-centers"
import { listCustomers } from "@/lib/db/customers"
import { listSuppliers } from "@/lib/db/suppliers"
import { listProducts } from "@/lib/db/products"
import { listRecentEntries } from "@/lib/db/lancamentos"
import TransactionsClient from "./transactions-client"

export default async function TransactionsPage() {
  const [categories, accounts, costCenters, customers, suppliers, products, recent] =
    await Promise.all([
      listCategories(),
      listAccounts(),
      listCostCenters(),
      listCustomers(),
      listSuppliers(),
      listProducts(),
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
      recent={recent}
    />
  )
}
