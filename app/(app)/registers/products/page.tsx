import { listProducts } from "@/lib/db/products"
import { listPartners } from "@/lib/db/partners"
import { listCustomers } from "@/lib/db/customers"
import { getCompanySettings } from "@/lib/db/company"
import ProductsClient from "./products-client"

export const metadata = { title: "Produtos e Serviços" }

export default async function ProductsPage() {
  const [products, partners, customers, company] = await Promise.all([
    listProducts(),
    listPartners(),
    listCustomers(),
    getCompanySettings(),
  ])
  return (
    <ProductsClient
      products={products}
      partners={partners.filter(p => p.status === "ativo").map(p => ({ id: p.id, name: p.name }))}
      customers={customers.map(c => ({ id: c.id, name: c.name }))}
      rentalEnabled={company?.partner_receivers_enabled ?? false}
    />
  )
}
