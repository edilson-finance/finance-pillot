import { getSessionContext } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listCompaniesOverview } from "@/lib/db/admin"
import OverviewClient from "./overview-client"

export const metadata = { title: "Central Admin" }


export default async function AdminPage() {
  const session = await getSessionContext()
  if (session.role !== "super_admin") redirect("/dashboard")

  const companies = await listCompaniesOverview()
  return <OverviewClient companies={companies} />
}
