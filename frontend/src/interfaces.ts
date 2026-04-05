//interface for accessible repos list
export interface AccessibleRepo {
  id: string
  fullName: string
}

//for pr merge time vs time chart
export interface prMergeTimeData {
    dateTime: string,
    avgMergeHours: number
} 

//for pr review speed time vs time chart
export interface reviewSpeedData {
    dateTime: string,
    avgFirstReviewHours: number
}

//for review time breakdown chart (stacked bar)
export interface reviewTimeBreakdownData {
  dateTime: string
  under8Hours: number
  under24Hours: number
  under3Days: number
  over3Days: number
}

// shared KPI value shape
export interface KPIValue {
  last7Days: number | null
  last28Days: number | null
  last84Days: number | null
}

export interface KPIResponse {
  medianPrMergeTime: KPIValue
  medianTimeToFirstReview: KPIValue
  percentReviewedWithin24Hours: KPIValue
  prsWaitingForFirstReview: KPIValue
  stalePrRate: KPIValue
}