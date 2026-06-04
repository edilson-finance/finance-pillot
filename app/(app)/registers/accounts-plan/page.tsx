import { listAccountsPlan } from "@/lib/db/accounts-plan"
import AccountsPlanClient from "./accounts-plan-client"

export default async function AccountsPlanPage() {
  const items = await listAccountsPlan()
  return <AccountsPlanClient items={items} />
}
