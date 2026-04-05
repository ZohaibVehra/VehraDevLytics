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
      <div className="text-gray-500 text-sm">
        No repos available
      </div>
    )
  }

  return (
    <div className="mb-4">
      <select
        value={selectedRepoId}
        onChange={(e) => onSelect?.(e.target.value)}
        className="w-full max-w-md p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
      >
        <option key="default" value="" disabled>
          Select a repository
        </option>

        {repos.map((repo) => (
          <option key={repo.id} value={repo.id}>
            {repo.fullName}
          </option>
        ))}
      </select>
    </div>
  )
}