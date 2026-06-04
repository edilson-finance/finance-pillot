import { listTransactions } from "@/lib/db/transactions"
import { listCategories } from "@/lib/db/categories"
import { listAccounts } from "@/lib/db/accounts"
import { listCostCenters } from "@/lib/db/cost-centers"
import { listCustomers } from "@/lib/db/customers"
import { listSuppliers } from "@/lib/db/suppliers"
import TransactionsClient from "./transactions-client"

export default async function TransactionsPage() {
  const [transactions, categories, accounts, costCenters, customers, suppliers] = await Promise.all([
    listTransactions(),
    listCategories(),
    listAccounts(),
    listCostCenters(),
    listCustomers(),
    listSuppliers(),
  ])

  return (
    <TransactionsClient
      transactions={transactions}
      categories={categories.map(c => ({ id: c.id, name: c.name }))}
      accounts={accounts.map(a => ({ id: a.id, name: a.name }))}
      costCenters={costCenters.map(c => ({ id: c.id, name: c.name }))}
      customers={customers.map(c => ({ id: c.id, name: c.name }))}
      suppliers={suppliers.map(s => ({ id: s.id, name: s.name }))}
    />
  )
}
