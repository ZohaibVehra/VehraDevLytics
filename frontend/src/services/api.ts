const API_BASE_URL = "http://localhost:3000"

function getAuthHeaders() {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("No auth token found")
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

//return list of accessable repos with ID and name
export async function getAccessibleRepos() {
  const res = await fetch(`${API_BASE_URL}/repos/accessible`, {
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch repos: ${res.status}`)
  }

  return res.json()
}

//return { hasAccess: boolean } based on if user can access repo
export async function checkRepoAccess(repoId: string) {
  const res = await fetch(
    `${API_BASE_URL}/repo-access/${repoId}`,
    {
      headers: getAuthHeaders(),
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to check repo access: ${res.status}`)
  }

  return res.json() // { hasAccess: boolean }
}

//returns prMergeTimeChart
export async function getPrMergeTimeChart(repoId: string) {
  const res = await fetch(
    `${API_BASE_URL}/metrics/pr-merge-time?repoId=${repoId}`,
    {
      headers: getAuthHeaders(),
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch page 1: ${res.status}`)
  }

  return res.json()
}

//returns reviewSpeedChart
export async function getReviewSpeedChart(repoId: string) {
  const res = await fetch(
    `${API_BASE_URL}/metrics/first-review-time?repoId=${repoId}`,
    {
      headers: getAuthHeaders(),
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch page 1: ${res.status}`)
  }

  return res.json()
}

//returns reviewTimeBreakdownChart
export async function getReviewTimeBreakdownChart(repoId: string) {
  const res = await fetch(
    `${API_BASE_URL}/metrics/review-time-breakdown?repoId=${repoId}`,
    {
      headers: getAuthHeaders(),
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch page 1: ${res.status}`)
  }

  return res.json()
}

export async function getKPIs(repoId: string) {
  const res = await fetch(
    `${API_BASE_URL}/metrics/kpis?repoId=${repoId}`,
    {
      headers: getAuthHeaders(),
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch KPIs: ${res.status}`)
  }

  return res.json()
}

//for logout
export function clearAuth() {
  localStorage.removeItem("token")
  localStorage.removeItem("githubAccessToken")
}

//refresh repo access
export async function refreshRepoAccess() {
  const token = localStorage.getItem("token")
  const githubAccessToken = localStorage.getItem("githubAccessToken")

  if (!token) {
    throw new Error("No auth token found")
  }

  if (!githubAccessToken) {
    throw new Error("No GitHub access token found")
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh-repo-access`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      githubAccessToken,
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to refresh repo access: ${res.status}`)
  }

  return res.json()
}

//zzz temp, should be autoamtic, trigger backend job to create chart metrics
export async function createMetrics(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/metrics/create-metrics`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ repoId }),
  })

  if (!res.ok) {
    throw new Error(`Failed to trigger pr merge time metric creation: ${res.status}`)
  }

  return res.json().catch(() => null)
}