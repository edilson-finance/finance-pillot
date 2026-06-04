import { getSessionContext } from "@/lib/auth"
import { redirect } from "next/navigation"
import NewCompanyClient from "./new-company-client"

export default async function NewCompanyPage() {
  const session = await getSessionContext()
  if (session.role !== "super_admin") redirect("/dashboard")
  return <NewCompanyClient />
}
