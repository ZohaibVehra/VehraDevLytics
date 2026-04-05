import { createPrMergeTimeChart } from "../../metrics/PrMergeTimeChart.js"
import { createReviewSpeedChart } from "../../metrics/ReviewSpeedChart.js"
import { createReviewTimeBreakdownChart } from "../../metrics/ReviewTimeBreakdownChart.js"
import { createRepoKPI } from "../../metrics/KPI.js"

interface HandleMetricCreationEventInput {
  deliveryId: string
  payload: unknown
}

interface MetricCreationPayload {
  repoId?: string
}

export async function handleMetricCreationEvent({
  deliveryId,
  payload,
}: HandleMetricCreationEventInput): Promise<void> {
  console.log("metric creation handler - delivery id:", deliveryId)

  const metricPayload = payload as MetricCreationPayload
  const { repoId } = metricPayload

  if (!repoId) {
    console.log("metric creation handler - missing repoId")
    return
  }

  await Promise.all([
    createPrMergeTimeChart(repoId),
    createReviewSpeedChart(repoId),
    createReviewTimeBreakdownChart(repoId),
    createRepoKPI(repoId),
  ])

  console.log(
    "metric creation handler - finished metric creation for repoId:",
    repoId
  )
}