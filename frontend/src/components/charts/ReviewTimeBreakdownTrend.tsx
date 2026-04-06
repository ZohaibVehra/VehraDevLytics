import type { reviewTimeBreakdownData } from "../../interfaces"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
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
        barSize={48}
        barCategoryGap="18%"
        data={chartData}
        margin={{ top: 20, right: 28, left: 12, bottom: 10 }}
        stackOffset="expand"
      >
        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3"/>

        <XAxis
          padding={{ left: 16, right: 16 }}
          dataKey="date"
          tickFormatter={(value) => formatDateLabel(new Date(value).getTime())}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255,255,255,0.25)" }}
          tickLine={{ stroke: "rgba(255,255,255,0.25)" }}
        />

        <YAxis
          tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255,255,255,0.25)" }}
          tickLine={{ stroke: "rgba(255,255,255,0.25)" }}
        />

        <Tooltip
          cursor={false}
          labelFormatter={(value) =>
            formatDateLabel(new Date(String(value)).getTime())
          }
          formatter={(value, name, item) => {
            const labelMap: Record<string, string> = {
              under8Hours: "Under 8h",
              under24Hours: "Under 24h",
              under3Days: "Under 3d",
              over3Days: "Over 3d",
            }

            const payload = item.payload
            const total =
              payload.under8Hours +
              payload.under24Hours +
              payload.under3Days +
              payload.over3Days

            const numericValue = typeof value === "number" ? value : Number(value)

            if (!total || Number.isNaN(numericValue)) {
              return ["0%", labelMap[String(name)] ?? String(name)]
            }

            const percent = (numericValue / total) * 100

            return [
              `${Math.round(percent)}%`,
              labelMap[String(name)] ?? String(name),
            ]
          }}
          contentStyle={{
            backgroundColor: "#0b0b12",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#aaa" }}
          itemStyle={{ color: "#fff" }}
        />

        <Legend
          verticalAlign="bottom"
          height={50}
          iconSize={12}
          wrapperStyle={{
            color: "rgba(255,255,255,0.85)",
            fontSize: "13px",
            paddingTop: "10px",
          }}
          formatter={(value) => {
            const labelMap: Record<string, string> = {
              under8Hours: "Under 8h",
              under24Hours: "Under 24h",
              under3Days: "Under 3d",
              over3Days: "Over 3d",
            }

            return labelMap[value] ?? value
          }}
        />

        <Bar dataKey="under8Hours" stackId="a" fill="#8b5cf6" />
        <Bar dataKey="under24Hours" stackId="a" fill="#a78bfa" />
        <Bar dataKey="under3Days" stackId="a" fill="#c4b5fd" />
        <Bar dataKey="over3Days" stackId="a" fill="#fca5a5" />
      </BarChart>
    </ResponsiveContainer>
  )
}