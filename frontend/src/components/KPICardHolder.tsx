import KPICard from "./KPICard"
import type { KPIResponse } from "../interfaces"

interface KPICardHolderProps {
  kpis: KPIResponse | null
  selectedDays: number
}

export default function KPICardHolder({
  kpis,
  selectedDays,
}: KPICardHolderProps) {
  function getValue(metric: {
    last7Days: number | null
    last28Days: number | null
    last84Days: number | null
  }) {
    if (selectedDays === 7) return metric.last7Days
    if (selectedDays === 28) return metric.last28Days
    return metric.last84Days
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <KPICard
        title="Median PR Merge Time"
        value={kpis ? getValue(kpis.medianPrMergeTime) : null}
        suffix=" hrs"
      />
      <KPICard
        title="Median Time to First Review"
        value={kpis ? getValue(kpis.medianTimeToFirstReview) : null}
        suffix=" hrs"
      />
      <KPICard
        title="% Reviewed Within 24h"
        value={kpis ? getValue(kpis.percentReviewedWithin24Hours) : null}
        suffix="%"
      />
      <KPICard
        title="PRs Waiting For First Review"
        value={kpis ? getValue(kpis.prsWaitingForFirstReview) : null}
      />
      <KPICard
        title="Stale PR Rate"
        value={kpis ? getValue(kpis.stalePrRate) : null}
        suffix="%"
      />
    </div>
  )
}