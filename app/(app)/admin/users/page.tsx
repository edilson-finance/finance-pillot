import { getSessionContext } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listAllUsers, listCompaniesOverview } from "@/lib/db/admin"
import AdminUsersClient from "./admin-users-client"

export default async function AdminUsersPage() {
  const session = await getSessionContext()
  if (session.role !== "super_admin") redirect("/dashboard")

  const [users, companies] = await Promise.all([listAllUsers(), listCompaniesOverview()])
  const companyOptions = companies.map((c) => ({ id: c.id, name: c.name }))

  return <AdminUsersClient users={users} companies={companyOptions} />
}
