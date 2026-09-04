import { listCategoryTree } from "@/lib/db/categories"
import CategoriesClient from "./categories-client"

export const metadata = { title: "Categorias" }


export default async function CategoriesPage() {
  const tree = await listCategoryTree()
  return <CategoriesClient tree={tree} />
}
