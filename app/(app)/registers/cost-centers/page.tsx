import { listCostCenters } from "@/lib/db/cost-centers"
import CostCentersClient from "./cost-centers-client"

export default async function CostCentersPage() {
  const costCenters = await listCostCenters()
  return <CostCentersClient costCenters={costCenters} />
}
