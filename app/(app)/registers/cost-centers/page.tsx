import { listCostCenters } from "@/lib/db/cost-centers"
import CostCentersClient from "./cost-centers-client"

export const metadata = { title: "Centros de Custo" }


export default async function CostCentersPage() {
  const costCenters = await listCostCenters()
  return <CostCentersClient costCenters={costCenters} />
}
