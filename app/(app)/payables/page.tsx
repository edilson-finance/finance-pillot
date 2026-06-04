import { listPayables } from "@/lib/db/payables"
import { listSuppliers } from "@/lib/db/suppliers"
import { listCategories } from "@/lib/db/categories"
import { listAccounts } from "@/lib/db/accounts"
import PayablesClient from "./payables-client"

export default async function PayablesPage() {
  const [payables, suppliers, categories, accounts] = await Promise.all([
    listPayables(),
    listSuppliers(),
    listCategories(),
    listAccounts(),
  ])
  return (
    <PayablesClient
      payables={payables}
      suppliers={suppliers}
      categories={categories}
      accounts={accounts}
    />
  )
}
