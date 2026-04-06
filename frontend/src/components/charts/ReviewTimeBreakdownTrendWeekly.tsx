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
        barSize={selectedDays === 84 ? 34 : 48}
        barCategoryGap="18%"
        data={chartData}
        margin={{top: 20, right: 28, left: 12, bottom: selectedDays === 84 ? 40 : 20,}}
        stackOffset="expand"
      >
        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3"/>

        <XAxis
          padding={{ left: 16, right: 16 }}
          dataKey="label"
          interval={0}
          angle={selectedDays === 84 ? -25 : 0}
          textAnchor={selectedDays === 84 ? "end" : "middle"}
          height={selectedDays === 84 ? 70 : 35}
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

        <YAxis
          tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255,255,255,0.25)" }}
          tickLine={{ stroke: "rgba(255,255,255,0.25)" }}
        />

        <Tooltip
          cursor={false}
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