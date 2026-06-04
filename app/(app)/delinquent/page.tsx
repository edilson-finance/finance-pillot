import { listDelinquent } from "@/lib/db/receivables"
import DelinquentClient from "./delinquent-client"

export default async function DelinquentPage() {
  const items = await listDelinquent()
  return <DelinquentClient items={items} />
}
