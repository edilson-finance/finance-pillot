import { getCompanySettings } from "@/lib/db/company"
import SettingsClient from "./settings-client"

export const metadata = { title: "Configurações" }


export default async function SettingsPage() {
  const company = await getCompanySettings()
  return <SettingsClient company={company} />
}
