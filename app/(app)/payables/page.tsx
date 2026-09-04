import { listPayables } from "@/lib/db/payables"
import { listSuppliers } from "@/lib/db/suppliers"
import { listCategories } from "@/lib/db/categories"
import { listAccounts } from "@/lib/db/accounts"
import { listCostCenters } from "@/lib/db/cost-centers"
import { listProducts } from "@/lib/db/products"
import PayablesClient from "./payables-client"

export const metadata = { title: "Contas a Pagar" }


export default async function PayablesPage() {
  const [payables, suppliers, categories, accounts, costCenters, products] = await Promise.all([
    listPayables(),
    listSuppliers(),
    listCategories(),
    listAccounts(),
    listCostCenters(),
    listProducts(),
  ])
  return (
    <PayablesClient
      payables={payables}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name, balance: a.opening_balance }))}
      costCenters={costCenters.map((c) => ({ id: c.id, name: c.name }))}
      products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, unit: p.unit }))}
    />
  )
}
