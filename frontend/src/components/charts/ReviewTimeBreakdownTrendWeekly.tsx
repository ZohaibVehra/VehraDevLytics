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

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  })
}

function buildChartData(data: reviewTimeBreakdownData[]) {
  return data.map((item) => {
    const start = new Date(item.dateTime)
    const localStart = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    )

    const localEnd = new Date(localStart)
    localEnd.setDate(localEnd.getDate() + 6)

    return {
      label: `${formatShortDate(localStart)} - ${formatShortDate(localEnd)}`,
      under8Hours: item.under8Hours,
      under24Hours: item.under24Hours,
      under3Days: item.under3Days,
      over3Days: item.over3Days,
    }
  })
}

export default function ReviewTimeBreakdownTrendWeekly({
  reviewTimeBreakdownDataArr,
  selectedDays,
}: {
  reviewTimeBreakdownDataArr: reviewTimeBreakdownData[]
  selectedDays: number
}){
  const chartData = buildChartData(reviewTimeBreakdownDataArr)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
        stackOffset="expand"
      >
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          dataKey="label"
          interval={0}
          angle={selectedDays === 84 ? -25 : 0}
          textAnchor={selectedDays === 84 ? "end" : "middle"}
          height={selectedDays === 84 ? 60 : 30}
          tick={({ x, y, payload, index }) => {
            if (selectedDays === 84 && index % 2 !== 0) return null

            return (
              <text
                x={x}
                y={y}
                dy={16}
                textAnchor={selectedDays === 84 ? "end" : "middle"}
                fill="#666"
                transform={
                  selectedDays === 84 ? `rotate(-25, ${x}, ${y})` : undefined
                }
              >
                {payload.value}
              </text>
            )
          }}
        />

        <YAxis tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />

        <Tooltip
          formatter={(value, name) => {
            let label = String(name)

            if (name === "under8Hours") label = "8hrs"
            if (name === "under24Hours") label = "24hrs"
            if (name === "under3Days") label = "3 days"
            if (name === "over3Days") label = "+3 days"

            return [String(value), label]
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