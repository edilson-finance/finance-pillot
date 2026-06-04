import { listCategories } from "@/lib/db/categories"
import CategoriesClient from "./categories-client"

export default async function CategoriesPage() {
  const categories = await listCategories()
  return <CategoriesClient categories={categories} />
}
