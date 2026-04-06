import SelectRepoDropdown from "./SelectRepoDropdown"
import SelectWindowDropdown from "./SelectWindowDropdown"
import type { AccessibleRepo } from "../interfaces"

interface DashboardTopBarProps {
  repos: AccessibleRepo[]
  selectedRepoId: string
  onSelectRepo: (repoId: string) => void
  selectedWindow: number
  onSelectWindow: (days: number) => void
  onLogout: () => void
  onRefreshRepos: () => void
}

export default function DashboardTopBar({
  repos,
  selectedRepoId,
  onSelectRepo,
  selectedWindow,
  onSelectWindow,
  onLogout,
  onRefreshRepos
}: DashboardTopBarProps) {
    return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
            <div className="shrink-0">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300/80">
                VehraDevLytics
            </p>
            <h1 className="mt-1 text-[1.9rem] font-semibold tracking-tight text-white">
                Dashboard
            </h1>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center mt-4">
            <SelectRepoDropdown
                repos={repos}
                onSelect={onSelectRepo}
                selectedRepoId={selectedRepoId}
            />

            <SelectWindowDropdown
                selectedRange={selectedWindow}
                onSelect={onSelectWindow}
            />
            </div>
        </div>

        <div className="flex items-center gap-4 self-start lg:self-center">
            <button
            onClick={onRefreshRepos}
            className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-base text-white transition hover:bg-white/10"
            >
            Refresh Repo Access
            </button>

            <button
            onClick={onLogout}
            className="rounded-lg border border-red-400/30 bg-red-500/10 px-5 py-3 text-base font-medium text-red-200 transition hover:bg-red-500/20"
            >
            Logout
            </button>
        </div>
        </div>
    </div>
    )
}