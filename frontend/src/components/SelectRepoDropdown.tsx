import type { AccessibleRepo } from "../interfaces"

interface Props {
  repos: AccessibleRepo[]
  selectedRepoId: string
  onSelect?: (repoId: string) => void
}

export default function SelectRepoDropdown({repos, selectedRepoId, onSelect}: Props) {
    
    //tell user no repos available if none available
    if (repos.length === 0) {
      return (
        <div className="mb-4">
          <select
            disabled
            className="h-12 min-w-[230px] rounded-lg border border-white/10 bg-white/[0.04] px-5 pr-10 text-base text-gray-400 cursor-not-allowed"
          >
            <option>No repositories available</option>
          </select>
        </div>
      )
    }

  return (
    <div className="mb-4">
      <select
        value={selectedRepoId}
        onChange={(e) => onSelect?.(e.target.value)}
        className="h-12 min-w-[230px] rounded-lg border border-white/15 bg-white/5 px-5 pr-10 text-base text-white outline-none transition hover:bg-white/[0.07] focus:border-violet-400/70 focus:bg-white/[0.07]"
      >
        <option className="bg-[#0b0b12] text-white" key="default" value="" disabled>
          Select a repository
        </option>

        {repos.map((repo) => (
          <option className="bg-[#0b0b12] text-white" key={repo.id} value={repo.id}>
            {repo.fullName}
          </option>
        ))}
      </select>
    </div>
  )
}