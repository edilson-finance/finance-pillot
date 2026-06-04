import { listProducts } from "@/lib/db/products"
import ProductsClient from "./products-client"

export default async function ProductsPage() {
  const products = await listProducts()
  return <ProductsClient products={products} />
}
