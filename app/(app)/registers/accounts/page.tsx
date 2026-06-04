import { listAccounts } from "@/lib/db/accounts"
import AccountsClient from "./accounts-client"

export default async function AccountsPage() {
  const accounts = await listAccounts()
  return <AccountsClient accounts={accounts} />
}
