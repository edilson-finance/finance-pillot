import { listCustomers } from "@/lib/db/customers"
import CustomersClient from "./customers-client"

export const metadata = { title: "Clientes" }


export default async function CustomersPage() {
  const customers = await listCustomers()
  return <CustomersClient customers={customers} />
}
