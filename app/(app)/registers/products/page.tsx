import { listProducts } from "@/lib/db/products"
import ProductsClient from "./products-client"

export const metadata = { title: "Produtos e Serviços" }


export default async function ProductsPage() {
  const products = await listProducts()
  return <ProductsClient products={products} />
}
