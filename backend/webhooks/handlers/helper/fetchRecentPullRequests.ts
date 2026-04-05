import { Octokit } from "octokit"

interface FetchRecentPullRequestsPageInput {
  octokit: Octokit
  owner: string
  repo: string
  prCursor?: string | null
  prsPerPage?: number
}

interface GraphQLActor {
  __typename?: string
  login?: string | null
  databaseId?: number | null
}

interface GraphQLPullRequestNode {
  id: string
  databaseId?: number | null
  number: number
  title: string
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  mergedAt?: string | null
  merged: boolean
  author?: GraphQLActor | null

  reviews: {
    totalCount: number
  }

  comments: {
    totalCount: number
  }

  reviewThreads: {
    totalCount: number
  }
}

interface FetchRecentPullRequestsPageResult {
  pullRequests: GraphQLPullRequestNode[]
  pageInfo: {
    hasNextPage: boolean
    endCursor?: string | null
  }
  rateLimit: {
    cost: number
    remaining: number
    resetAt: string
  }
}

interface FetchRecentPullRequestsPageGraphQLResponse {
  repository: {
    pullRequests: {
      nodes: GraphQLPullRequestNode[]
      pageInfo: {
        hasNextPage: boolean
        endCursor?: string | null
      }
    }
  } | null
  rateLimit: {
    cost: number
    remaining: number
    resetAt: string
  }
}

const FETCH_RECENT_PULL_REQUESTS_PAGE_QUERY = `
  query FetchRecentPullRequestsPage(
    $owner: String!
    $repo: String!
    $prCursor: String
    $prsPerPage: Int!
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequests(
        first: $prsPerPage
        after: $prCursor
        states: [OPEN, CLOSED, MERGED]
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          id
          databaseId
          number
          title
          createdAt
          updatedAt
          closedAt
          mergedAt
          merged

          author {
            __typename
            login
            ... on User {
              databaseId
            }
          }

          reviews {
            totalCount
          }

          comments {
            totalCount
          }

          reviewThreads {
            totalCount
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }

    rateLimit {
      cost
      remaining
      resetAt
    }
  }
`

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchRecentPullRequestsPage({
  octokit,
  owner,
  repo,
  prCursor = null,
  prsPerPage = 50,
}: FetchRecentPullRequestsPageInput): Promise<FetchRecentPullRequestsPageResult> {
  console.log("fetchRecentPullRequestsPage - entered")
  console.log("fetchRecentPullRequestsPage - owner/repo:", `${owner}/${repo}`)
  console.log("fetchRecentPullRequestsPage - prCursor:", prCursor)

  const response = await octokit.graphql<FetchRecentPullRequestsPageGraphQLResponse>(
    FETCH_RECENT_PULL_REQUESTS_PAGE_QUERY,
    {
      owner,
      repo,
      prCursor,
      prsPerPage,
    }
  )

  if (!response.repository) {
    throw new Error(`fetchRecentPullRequestsPage - repository not found: ${owner}/${repo}`)
  }

  console.log("fetchRecentPullRequestsPage - query cost:", response.rateLimit.cost)
  console.log("fetchRecentPullRequestsPage - rate limit remaining:", response.rateLimit.remaining)
  console.log("fetchRecentPullRequestsPage - rate limit resetAt:", response.rateLimit.resetAt)

  if (response.rateLimit.remaining < 100) {
    const resetTimeMs = new Date(response.rateLimit.resetAt).getTime()
    const nowMs = Date.now()
    const waitMs = Math.max(resetTimeMs - nowMs, 0)

    if (waitMs > 0) {
      console.log("fetchRecentPullRequestsPage - rate limit low, sleeping for ms:", waitMs)
      await sleep(waitMs)
    }
  }

  const result: FetchRecentPullRequestsPageResult = {
    pullRequests: response.repository.pullRequests.nodes,
    pageInfo: response.repository.pullRequests.pageInfo,
    rateLimit: response.rateLimit,
  }

  console.log("fetchRecentPullRequestsPage - fetched prs:", result.pullRequests.length)
  console.log("fetchRecentPullRequestsPage - hasNextPage:", result.pageInfo.hasNextPage)
  console.log("fetchRecentPullRequestsPage - endCursor:", result.pageInfo.endCursor)

  return result
}