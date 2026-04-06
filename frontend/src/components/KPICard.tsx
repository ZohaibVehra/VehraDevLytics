interface KPICardProps {
  title: string
  value: number | null
  suffix?: string
}

export default function KPICard({
  title,
  value,
}: KPICardProps) {
  const formattedValue =
  value === null
    ? "N/A"
    : value < 1
    ? `${Math.round(value * 60)} min`
    : `${Number.isInteger(value) ? value : value.toFixed(2)} h`

  return (
    <div className="rounded-2xl border border-white/10 from-white/[0.08] to-white/[0.04] p-5 backdrop-blur-sm min-w-[220px]">
      <div className="text-sm text-gray-400">{title}</div>
      <div className="mt-3 text-5xl font-semibold tracking-tight text-white">
        {formattedValue}
      </div>
    </div>
  )
}