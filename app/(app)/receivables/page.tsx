import { listReceivables } from "@/lib/db/receivables"
import { listCustomers } from "@/lib/db/customers"
import { listCategories } from "@/lib/db/categories"
import { listAccounts } from "@/lib/db/accounts"
import { listCostCenters } from "@/lib/db/cost-centers"
import { listSuppliers } from "@/lib/db/suppliers"
import { listProducts } from "@/lib/db/products"
import ReceivablesClient from "./receivables-client"

export default async function ReceivablesPage() {
  const [receivables, customers, categories, accounts, costCenters, suppliers, products] = await Promise.all([
    listReceivables(),
    listCustomers(),
    listCategories(),
    listAccounts(),
    listCostCenters(),
    listSuppliers(),
    listProducts(),
  ])
  return (
    <ReceivablesClient
      receivables={receivables}
      customers={customers.map(c => ({ id: c.id, name: c.name }))}
      categories={categories.map(c => ({ id: c.id, name: c.name, kind: c.kind }))}
      accounts={accounts.map(a => ({ id: a.id, name: a.name, balance: a.opening_balance }))}
      costCenters={costCenters.map(c => ({ id: c.id, name: c.name }))}
      suppliers={suppliers.map(s => ({ id: s.id, name: s.name }))}
      products={products.map(p => ({ id: p.id, name: p.name, price: p.price, unit: p.unit }))}
    />
  )
}
