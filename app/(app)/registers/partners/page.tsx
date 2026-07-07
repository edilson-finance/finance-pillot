import { listPartners } from "@/lib/db/partners"
import PartnersClient from "./partners-client"

export default async function PartnersPage() {
  const partners = await listPartners()
  return <PartnersClient partners={partners} />
}
