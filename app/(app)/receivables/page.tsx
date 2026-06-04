import { listReceivables } from "@/lib/db/receivables"
import { listCustomers } from "@/lib/db/customers"
import { listCategories } from "@/lib/db/categories"
import { listAccounts } from "@/lib/db/accounts"
import ReceivablesClient from "./receivables-client"

export default async function ReceivablesPage() {
  const [receivables, customers, categories, accounts] = await Promise.all([
    listReceivables(),
    listCustomers(),
    listCategories(),
    listAccounts(),
  ])
  return (
    <ReceivablesClient
      receivables={receivables}
      customers={customers.map(c => ({ id: c.id, name: c.name }))}
      categories={categories.map(c => ({ id: c.id, name: c.name }))}
      accounts={accounts.map(a => ({ id: a.id, name: a.name }))}
    />
  )
}
