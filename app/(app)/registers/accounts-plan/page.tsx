import { redirect } from "next/navigation"

export const metadata = { title: "Plano de Contas" }


export default function AccountsPlanPage() {
  redirect("/registers/categories")
}
