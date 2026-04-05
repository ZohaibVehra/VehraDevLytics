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
        className="w-full max-w-xs p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}