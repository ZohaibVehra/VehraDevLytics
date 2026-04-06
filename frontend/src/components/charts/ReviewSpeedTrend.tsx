import type { reviewSpeedData } from "../../interfaces"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type ReviewSpeedTrendChartProps = {
  reviewSpeedDataArr: reviewSpeedData[]
  selectedDays: number
}

type ChartPoint = {
  date: string
  avgFirstReviewHours: number | null
  timestamp: number
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildFullDateSeries(
  data: reviewSpeedData[],
  days: number
): ChartPoint[] {
  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - (days - 1))

  const valueByDate = new Map<string, number>()

  for (const item of data) {
    const parsed = new Date(item.dateTime)

    const localDate = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate()
    )

    const dateKey = formatDateKey(localDate)
    valueByDate.set(dateKey, item.avgFirstReviewHours)
  }

  const result: ChartPoint[] = []

  for (
    const current = new Date(startDate);
    current <= endDate;
    current.setDate(current.getDate() + 1)
  ) {
    const day = new Date(current)
    const dateKey = formatDateKey(day)

    result.push({
      date: dateKey,
      avgFirstReviewHours: valueByDate.get(dateKey) ?? null,
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

export default function ReviewSpeedTrendChart({
  reviewSpeedDataArr,
  selectedDays,
}: ReviewSpeedTrendChartProps) {
  const chartData = buildFullDateSeries(reviewSpeedDataArr, selectedDays)

  console.log('fin chart data', chartData);
  

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
      >
        <CartesianGrid
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />

        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={formatDateLabel}
          ticks={chartData.map((item) => item.timestamp)}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
        />

        <YAxis
          dataKey="avgFirstReviewHours"
          domain={[0, "auto"]}
          tickFormatter={(value) => `${value}h`}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
        />

        <Tooltip
          labelFormatter={(value) => formatDateLabel(Number(value))}
          formatter={(value) => {
            if (value == null) {
              return ["No data", "Avg First Review Time"]
            }

            if (typeof value !== "number") {
              return [String(value), "Avg First Review Time"]
            }

            if (value < 1) {
              const minutes = value * 60
              return [`${Math.round(minutes)}m`, "Avg First Review Time"]
            }

            return [`${value.toFixed(2)}h`, "Avg First Review Time"]
          }}
          contentStyle={{
            backgroundColor: "#0b0b12",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#aaa" }}
          itemStyle={{ color: "#fff" }}
          cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
        />

        <Line
          type="linear"
          dataKey="avgFirstReviewHours"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 2, strokeWidth: 0, fill: "#8b5cf6" }}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}