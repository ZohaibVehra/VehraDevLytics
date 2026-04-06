import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getAccessibleRepos,
  clearAuth, refreshRepoAccess, createMetrics, getPrMergeTimeChart,
  getReviewSpeedChart, getReviewTimeBreakdownChart, getKPIs } from "../services/api"
import type { AccessibleRepo, prMergeTimeData, reviewSpeedData, reviewTimeBreakdownData, KPIResponse } from "../interfaces"
import ReviewSpeedTrendChart from "../components/charts/ReviewSpeedTrend"
import ReviewTimeBreakdownChart from "../components/charts/ReviewTimeBreakdownTrend"
import { groupReviewTimeBreakdownBy7Days, filterLastXDaysPRMergeData, filterLastXDaysReviewSpeedData, filterLastXDaysReviewTimeBreakdownData } from "../utilities"
import ReviewTimeBreakdownTrendWeekly from "../components/charts/ReviewTimeBreakdownTrendWeekly"
import KPICardHolder from "../components/KPICardHolder"
import DashboardTopBar from "../components/DashboardTopBar"
import PrMergeTimeTrendChart from "../components/charts/prMergeTimeTrend"

export default function DashboardPage() {
  const navigate = useNavigate()

  //list of accessible repos
  const [accessibleRepos, setAccessibleRepos] = useState<AccessibleRepo[]>([])
  //currently selected repo by id
  const [selectedRepoId, setSelectedRepoId] = useState<string>("")
  //time window
  const [window, setWindow] = useState<number>(7)

  //kpi data
  const [kpis, setKpis] = useState<KPIResponse | null>(null)

  //pr merge time vs time chart data
  const [prMergeData, setPrMergeData] = useState<prMergeTimeData[]>([])
  //pr review speed time vs time chart data
  const [reviewSpeedData, setReviewSpeedData] = useState<reviewSpeedData[]>([])
  //pr review time buckets vs time chart data
  const [reviewTimeBreakdownData, setReviewTimeBreakdownData] = useState<reviewTimeBreakdownData[]>([])

  useEffect(() => {
    const token = localStorage.getItem("token")

    //if not logged return to home page
    if (!token) {
        navigate("/")
        return
    }

    //get repos user has access to
    async function fetchRepos() {
      try {
        const fetchedRepos = await getAccessibleRepos()
        setAccessibleRepos(fetchedRepos.repos)

        if (fetchedRepos.repos.length > 0) {
            setSelectedRepoId(fetchedRepos.repos[0].id)
        }

      } catch (error) {
        console.error("Failed to fetch repos:", error)
      }
    }

    fetchRepos()
  }, [navigate])

  useEffect(() => {
    if (!selectedRepoId) return

    async function fetchPrMergeData() {
      try {
        const data = await getPrMergeTimeChart(selectedRepoId)
        setPrMergeData(data)
      } catch (error) {
        console.error("Failed to fetch PR merge data:", error)
      }
    }

    async function fetchReviewSpeedData() {
      try {
        const data = await getReviewSpeedChart(selectedRepoId)
        setReviewSpeedData(data)
      } catch (error) {
        console.log("Failed to fetch review speed data: ", error)
      }
    }

    async function fetchReviewTimeBreakdownData() {
      try {
        const data = await getReviewTimeBreakdownChart(selectedRepoId)
        setReviewTimeBreakdownData(data)
      } catch (error) {
        console.log("Failed to fetch review speed data: ", error)
      }
    }

    async function fetchKpis() {
      try {
        const data = await getKPIs(selectedRepoId)
        setKpis(data)
      } catch (error) {
        console.error("Failed to fetch KPI data:", error)
      }
    }

    fetchPrMergeData()
    fetchReviewSpeedData()
    fetchReviewTimeBreakdownData()
    fetchKpis()
  }, [selectedRepoId])

  //filtering data by window and formatting (eg by day vs by week)
  const filteredPrMergeTimeTrendData: prMergeTimeData[] = filterLastXDaysPRMergeData(prMergeData, window)
  const filteredReviewSpeedData: reviewSpeedData[] = filterLastXDaysReviewSpeedData(reviewSpeedData, window)
  let filteredReviewBreakdownData: reviewTimeBreakdownData[] = filterLastXDaysReviewTimeBreakdownData(reviewTimeBreakdownData, window)
  if(window != 7) filteredReviewBreakdownData = groupReviewTimeBreakdownBy7Days(filteredReviewBreakdownData, window)

  //errors for lacking data per graph
  let lackingPRMergeData = false
  let lackingReviewData = false

  if(window == 7 && filteredPrMergeTimeTrendData.length < 4) lackingPRMergeData = true
  if(window == 28 && filteredPrMergeTimeTrendData.length < 10) lackingPRMergeData = true
  if(window == 7 && filteredPrMergeTimeTrendData.length < 30) lackingPRMergeData = true
  if(window == 7 && filteredReviewSpeedData.length < 4) lackingReviewData = true
  if(window == 28 && filteredReviewSpeedData.length < 10) lackingReviewData = true
  if(window == 7 && filteredReviewSpeedData.length < 30) lackingReviewData = true

  

  //for local/demo purposes, upon deployment will be handled via chron job and weightedEvent count in backend
  async function handleCreateMetrics() {
    if (!selectedRepoId) return
    await createMetrics(selectedRepoId)
    navigate(0)
  }

  
  //tells backend to check again which repos user can access, then sets them
  async function handleRefreshRepos() {
    try {
      await refreshRepoAccess()

      const repos = await getAccessibleRepos()
      setAccessibleRepos(repos.repos)

      console.log("Repo access refreshed")

      navigate(0)
    } catch (error) {
      console.error("Failed to refresh repos:", error)
    }
  }

  

  return (
     <div className="relative min-h-screen overflow-hidden bg-black text-white">
      
      {/*Background Start*/}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.14),transparent_25%),radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.10),transparent_25%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

      <div className="absolute left-[-120px] top-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-[120px]" />
      <div className="absolute right-[-100px] top-10 h-80 w-80 rounded-full bg-violet-500/20 blur-[140px]" />
      <div className="absolute bottom-[-120px] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[160px]" />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/70" />
      {/*Background End*/}

      
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10 flex flex-col gap-6">
        <DashboardTopBar
          repos={accessibleRepos}
          selectedRepoId={selectedRepoId}
          onSelectRepo={setSelectedRepoId}
          selectedWindow={window}
          onSelectWindow={setWindow}
          onRefreshRepos={handleRefreshRepos}
          onLogout={() => {
            clearAuth()
            navigate("/")
          }}
        />
        
        {/*KPIs */}
        <KPICardHolder kpis={kpis} selectedDays={window} />

        
        {/*PR Merge Time Trend Chart */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-6 backdrop-blur-sm">
          <div className="flex justify-between">
            <div className="mb-4 ml-4">
              <p className="text-sm text-gray-400">PR Merge Time Trend</p>
              <h3 className="text-lg font-medium text-white">
                Average hours from PR open → merged
              </h3>
            </div>
            {lackingPRMergeData &&
            <h2 className="text-md font-medium text-red-300 mt-5 mr-4">Warning insufficient Pull Request Merges</h2>}
          </div>
          <PrMergeTimeTrendChart prMergeDataArr={filteredPrMergeTimeTrendData} selectedDays={window}/>
        </div>

        {/*First Review Time Trend Chart */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-6 backdrop-blur-sm">
          <div className="flex justify-between">
            <div className="mb-4 ml-4">
              <p className="text-sm text-gray-400">First Review Time Trend</p>
              <h3 className="text-lg font-medium text-white">
                Average hours from PR open → first review
              </h3>
            </div>
            {lackingReviewData &&
            <h2 className="text-md font-medium text-red-300 mt-5 mr-4">Warning insufficient Pull Request Reviews</h2>}
          </div>
          <ReviewSpeedTrendChart reviewSpeedDataArr={filteredReviewSpeedData} selectedDays={window} />
        </div>

        {/*Review Time Stacked Bar Chart */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-6 backdrop-blur-sm">
          <div className="flex justify-between">
            <div className="mb-4 ml-4">
              <p className="text-sm text-gray-400">First Review Time Stacked Bar Chart</p>
              <h3 className="text-lg font-medium text-white">
                Brekdown of first review speed on PRs
              </h3>
            </div>
            {lackingReviewData &&
            <h2 className="text-md font-medium text-red-300 mt-5 mr-4">Warning insufficient Pull Request Reviews</h2>}
          </div>
          { (window == 7) ?
            (<ReviewTimeBreakdownChart reviewTimeBreakdownDataArr={filteredReviewBreakdownData}/>)
          : (<ReviewTimeBreakdownTrendWeekly reviewTimeBreakdownDataArr={filteredReviewBreakdownData} selectedDays={window}/>)
          }        
        </div>

        
        <div className="mt-2 flex justify-center">
          <button
            onClick={handleCreateMetrics}
            className="w-fit rounded-lg border border-violet-500/30 bg-violet-500/10 px-5 py-2.5 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20"
          >
            Create Repo Metrics
          </button>
        </div>
      </main>
    </div>
  )
}