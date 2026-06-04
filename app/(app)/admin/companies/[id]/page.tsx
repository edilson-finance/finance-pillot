import { getSessionContext } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getCompanyDetail, listAllUsers } from "@/lib/db/admin"
import CompanyDetailClient from "./company-detail-client"

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext()
  if (session.role !== "super_admin") redirect("/dashboard")

  const { id } = await params
  const [detail, allUsers] = await Promise.all([getCompanyDetail(id), listAllUsers()])
  if (!detail) notFound()

  return <CompanyDetailClient detail={detail} allUsers={allUsers} />
}
