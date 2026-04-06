import PrMergeTimeTrendChart from "../components/charts/prMergeTimeTrend"
import type { reviewTimeBreakdownData, prMergeTimeData } from "../interfaces"
import ReviewTimeBreakdownChart from "../components/charts/ReviewTimeBreakdownTrend"

function generatePrMergeMockData(days: number): prMergeTimeData[] {
  const data: prMergeTimeData[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)

    // random but realistic range (6h → 20h)
    const avg = +(6 + Math.random() * 14).toFixed(1)

    data.push({
      dateTime: d.toISOString(),
      avgMergeHours: avg,
    })
  }

  return data
}

function generateReviewBreakdownMockData(days: number): reviewTimeBreakdownData[] {
  const data: reviewTimeBreakdownData[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)

    // simulate 6–12 PRs/day
    const total = Math.floor(6 + Math.random() * 6)

    let remaining = total

    const under8 = Math.floor(remaining * (0.2 + Math.random() * 0.3))
    remaining -= under8

    const under24 = Math.floor(remaining * (0.3 + Math.random() * 0.3))
    remaining -= under24

    const under3 = Math.floor(remaining * (0.3 + Math.random() * 0.3))
    remaining -= under3

    const over3 = remaining

    data.push({
      dateTime: d.toISOString(),
      under8Hours: under8,
      under24Hours: under24,
      under3Days: under3,
      over3Days: over3,
    })
  }

  return data
}

export default function LoginPage() {
  const samplePrMergeData = generatePrMergeMockData(14)
  const sampleReviewBreakdownData = generateReviewBreakdownMockData(7)

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.14),transparent_25%),radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.10),transparent_25%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

      <div className="absolute left-[-120px] top-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-[120px]" />
      <div className="absolute right-[-100px] top-10 h-80 w-80 rounded-full bg-violet-500/20 blur-[140px]" />
      <div className="absolute bottom-[-120px] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[160px]" />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/70" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 pt-12 pb-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-base md:text-lg uppercase tracking-[0.35em] text-violet-300/90 font-medium">
              VehraDevLytics
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl mb-8">
              GitHub analytics for PR flow, reviews, and team bottlenecks
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-400 md:text-base">
              Understand how your team ships with clear visibility into merge
              speed, review activity, and workflow health.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() => {
                  window.open(
                    "http://localhost:3000/auth/github/install",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }}
                className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-7 py-3.5 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20 hover:border-violet-400"
              >
                Install GitHub App
              </button>

              <button
                onClick={() => {
                  window.location.href = "http://localhost:3000/auth/github"
                }}
                className="rounded-lg bg-violet-600 px-7 py-3.5 text-sm font-medium transition hover:bg-violet-500"
              >
                Login with GitHub
              </button>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-8">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 md:p-7">
                <p className="text-sm text-gray-400">Step 1</p>
                <h3 className="mt-2 font-medium">Install GitHub App</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Connect your repositories so VehraDevLytics can start pulling
                  the data it needs.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6 md:p-7">
                <p className="text-sm text-gray-400">Step 2</p>
                <h3 className="mt-2 font-medium">Login with GitHub</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Sign in securely and load the repos your account can actually
                  access.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6 md:p-7">
                <p className="text-sm text-gray-400">Step 3</p>
                <h3 className="mt-2 font-medium">View Insights</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Explore PR flow, review speed, and the places your team gets
                  stuck.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-7 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Preview
                  </p>
                  <h2 className="mt-1 text-lg font-medium text-white">
                    Sample Charts
                  </h2>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 mb-2">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="mb-3 text-xs text-gray-500">
                    PR Merge Time Trend
                  </p>
                  <div className="h-64 md:h-72 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    <PrMergeTimeTrendChart
                      prMergeDataArr={samplePrMergeData}
                      selectedDays={14}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="mb-3 text-xs text-gray-500">
                    Review Time Breakdown
                  </p>
                  <div className="h-64 md:h-72 rounded-lg border border-dashed border-white/10 bg-white/[0.03]" >
                      <ReviewTimeBreakdownChart
                        reviewTimeBreakdownDataArr={sampleReviewBreakdownData}
                      />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}