import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getAccessibleRepos,
  clearAuth, refreshRepoAccess, createMetrics, getPrMergeTimeChart,
  getReviewSpeedChart, getReviewTimeBreakdownChart, getKPIs } from "../services/api"
import SelectRepoDropdown from "../components/SelectRepoDropdown"
import SelectWindowDropdown from "../components/SelectWindowDropdown"
import type { AccessibleRepo, prMergeTimeData, reviewSpeedData, reviewTimeBreakdownData, KPIResponse } from "../interfaces"
import ReviewSpeedTrendChart from "../components/charts/ReviewSpeedTrend"
import PrMergeTimeTrendChart from "../components/charts/prMergeTimeTrend"
import ReviewTimeBreakdownChart from "../components/charts/ReviewTimeBreakdownTrend"
import { groupReviewTimeBreakdownBy7Days, filterLastXDaysPRMergeData, filterLastXDaysReviewSpeedData, filterLastXDaysReviewTimeBreakdownData } from "../utilities"
import ReviewTimeBreakdownTrendWeekly from "../components/charts/ReviewTimeBreakdownTrendWeekly"
import KPICardHolder from "../components/KPICardHolder"

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

  //zzz filtered data (will need this actually but how we get the data should change? idk)
  const filteredPrMergeTimeTrendData: prMergeTimeData[] = filterLastXDaysPRMergeData(prMergeData, window)
  const filteredReviewSpeedData: reviewSpeedData[] = filterLastXDaysReviewSpeedData(reviewSpeedData, window)
  let filteredReviewBreakdownData: reviewTimeBreakdownData[] = filterLastXDaysReviewTimeBreakdownData(reviewTimeBreakdownData, window)
  if(window != 7) filteredReviewBreakdownData = groupReviewTimeBreakdownBy7Days(filteredReviewBreakdownData, window)

  //zzz onclick func for crating pr merge data, again shouldnt exist fr
  async function handleCreateMetrics() {
    if (!selectedRepoId) return
    await createMetrics(selectedRepoId)
  }

  //tells backend to check again which repos user can access, then sets them
  async function handleRefreshRepos() {
    try {
      await refreshRepoAccess()

      const repos = await getAccessibleRepos()
      setAccessibleRepos(repos.repos)

      console.log("Repo access refreshed")
    } catch (error) {
      console.error("Failed to refresh repos:", error)
    }
  }

  return (
    <div>
      <button onClick={() => {
        clearAuth()
        navigate("/")
      }}>Logout</button>
      <div>Dashboard</div>
      <button onClick={handleRefreshRepos} className="px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100">Refresh Repos</button>
      <SelectRepoDropdown repos={accessibleRepos} onSelect={(repoId) => setSelectedRepoId(repoId)} selectedRepoId={selectedRepoId}/>
      <h1 className="text-red-700">{selectedRepoId}</h1>
      <KPICardHolder kpis={kpis} selectedDays={window} />
      <SelectWindowDropdown selectedRange={window} onSelect={setWindow}/>
      <PrMergeTimeTrendChart prMergeDataArr={filteredPrMergeTimeTrendData} selectedDays={window}/>
      <ReviewSpeedTrendChart reviewSpeedDataArr={filteredReviewSpeedData} selectedDays={window} />
      { (window == 7) ?
        (<ReviewTimeBreakdownChart reviewTimeBreakdownDataArr={filteredReviewBreakdownData}/>)
      : (<ReviewTimeBreakdownTrendWeekly reviewTimeBreakdownDataArr={filteredReviewBreakdownData} selectedDays={window}/>)
      }
      <button onClick={handleCreateMetrics}>Create Repo Chart Metrics</button>
    </div>
  )
}