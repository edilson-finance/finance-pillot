import { listReceivables } from "@/lib/db/receivables"
import { listCustomers } from "@/lib/db/customers"
import { listCategories } from "@/lib/db/categories"
import { listAccounts } from "@/lib/db/accounts"
import { listCostCenters } from "@/lib/db/cost-centers"
import { listSuppliers } from "@/lib/db/suppliers"
import { listProducts } from "@/lib/db/products"
import { listPartners } from "@/lib/db/partners"
import { getCompanySettings } from "@/lib/db/company"
import ReceivablesClient from "./receivables-client"

export const metadata = { title: "Contas a Receber" }


export default async function ReceivablesPage() {
  const [receivables, customers, categories, accounts, costCenters, suppliers, products, partners, company] = await Promise.all([
    listReceivables(),
    listCustomers(),
    listCategories(),
    listAccounts(),
    listCostCenters(),
    listSuppliers(),
    listProducts(),
    listPartners(),
    getCompanySettings(),
  ])
  return (
    <ReceivablesClient
      receivables={receivables}
      customers={customers.map(c => ({ id: c.id, name: c.name }))}
      categories={categories.map(c => ({ id: c.id, name: c.name, kind: c.kind }))}
      accounts={accounts.map(a => ({ id: a.id, name: a.name, balance: a.opening_balance }))}
      costCenters={costCenters.map(c => ({ id: c.id, name: c.name }))}
      suppliers={suppliers.map(s => ({ id: s.id, name: s.name }))}
      products={products.map(p => ({ id: p.id, name: p.name, price: p.price, unit: p.unit, partner_id: p.partner_id, tenant_id: p.tenant_id, commission_percent: p.commission_percent, rent_amount: p.rent_amount }))}
      partners={partners.filter(p => p.status === "ativo").map(p => ({ id: p.id, name: p.name }))}
      partnerReceiversEnabled={company?.partner_receivers_enabled ?? false}
    />
  )
}
