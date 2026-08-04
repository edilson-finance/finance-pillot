import { listSuppliers } from "@/lib/db/suppliers"
import SuppliersClient from "./suppliers-client"

export const metadata = { title: "Fornecedores" }


export default async function SuppliersPage() {
  const suppliers = await listSuppliers()
  return <SuppliersClient suppliers={suppliers} />
}
