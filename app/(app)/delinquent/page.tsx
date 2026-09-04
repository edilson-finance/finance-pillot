import { listDelinquent } from "@/lib/db/receivables"
import DelinquentClient from "./delinquent-client"

export const metadata = { title: "Inadimplentes" }


export default async function DelinquentPage() {
  const items = await listDelinquent()
  return <DelinquentClient items={items} />
}
