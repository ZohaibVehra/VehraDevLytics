interface Props {
  selectedRange: number
  onSelect: (range: number) => void
}

export default function SelectWindowDropdown({
  selectedRange,
  onSelect,
}: Props) {
  const options = [
    { label: "Last 7 days", value: 7 },
    { label: "Last 28 days", value: 28 },
    { label: "Last 84 days", value: 84 },
  ]

  return (
    <div className="mb-4">
      <select
        value={selectedRange}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="h-12 min-w-[180px] rounded-lg border border-white/15 bg-white/5 px-5 pr-10 text-base text-white outline-none transition hover:bg-white/[0.07] focus:border-violet-400/70 focus:bg-white/[0.07]"
      >
        {options.map((opt) => (
          <option className="bg-[#0b0b12] text-white" key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}