import type { reviewTimeBreakdownData } from "../../interfaces"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type ReviewTimeBreakdownChartProps = {
  reviewTimeBreakdownDataArr: reviewTimeBreakdownData[]
}

type ChartPoint = {
  date: string
  under8Hours: number
  under24Hours: number
  under3Days: number
  over3Days: number
  timestamp: number
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildFullDateSeries(
  data: reviewTimeBreakdownData[],
  days: number
): ChartPoint[] {
  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - (days - 1))

  const valueByDate = new Map<string, reviewTimeBreakdownData>()

  for (const item of data) {
    const parsed = new Date(item.dateTime)

    const localDate = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate()
    )

    const dateKey = formatDateKey(localDate)
    valueByDate.set(dateKey, item)
  }

  const result: ChartPoint[] = []

  for (
    const current = new Date(startDate);
    current <= endDate;
    current.setDate(current.getDate() + 1)
  ) {
    const day = new Date(current)
    const dateKey = formatDateKey(day)
    const existing = valueByDate.get(dateKey)

    result.push({
      date: dateKey,
      under8Hours: existing?.under8Hours ?? 0,
      under24Hours: existing?.under24Hours ?? 0,
      under3Days: existing?.under3Days ?? 0,
      over3Days: existing?.over3Days ?? 0,
      timestamp: day.getTime(),
    })
  }

  return result
}

function formatDateLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  })
}

export default function ReviewTimeBreakdownChart({
  reviewTimeBreakdownDataArr,
}: ReviewTimeBreakdownChartProps) {
  const chartData = buildFullDateSeries(
    reviewTimeBreakdownDataArr,
    7 
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
        stackOffset="expand"
      >
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={formatDateLabel}
          ticks={chartData.map((item) => item.timestamp)}
        />

        <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} />

        <Tooltip
          labelFormatter={(value) => formatDateLabel(Number(value))}
          formatter={(value, name) => {
            const labelMap: Record<string, string> = {
              under8Hours: "8hrs",
              under24Hours: "24hrs",
              under3Days: "3 days",
              over3Days: "+3 days",
            }

            if (typeof value !== "number") {
              return [String(value), labelMap[String(name)] ?? String(name)]
            }

            return [value, labelMap[String(name)] ?? String(name)]
          }}
        />

        <Bar dataKey="under8Hours" stackId="a" fill="#3b82f6" />
        <Bar dataKey="under24Hours" stackId="a" fill="#22c55e" />
        <Bar dataKey="under3Days" stackId="a" fill="#facc15" />
        <Bar dataKey="over3Days" stackId="a" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  )
}