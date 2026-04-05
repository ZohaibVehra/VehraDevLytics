interface KPICardProps {
  title: string
  value: number | null
  suffix?: string
}

export default function KPICard({
  title,
  value,
  suffix = "",
}: KPICardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-w-[220px]">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">
        {value === null ? "N/A" : `${value}${suffix}`}
      </div>
    </div>
  )
}