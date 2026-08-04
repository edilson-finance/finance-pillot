import { listPartners } from "@/lib/db/partners"
import PartnersClient from "./partners-client"

export const metadata = { title: "Recebedores" }


export default async function PartnersPage() {
  const partners = await listPartners()
  return <PartnersClient partners={partners} />
}
