import { listSuppliers } from "@/lib/db/suppliers"
import SuppliersClient from "./suppliers-client"

export default async function SuppliersPage() {
  const suppliers = await listSuppliers()
  return <SuppliersClient suppliers={suppliers} />
}
