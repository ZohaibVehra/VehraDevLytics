import { Octokit } from "octokit"
import { sleep } from "./sleep.js"

interface FetchPullRequestReviewsInput {
  octokit: Octokit
  owner: string
  repo: string
  pullNumber: number
}

export interface RestActor {
  login?: string | null
  id?: number | null
  type?: string | null
}

export interface RestPullRequestReview {
  id: number
  state: string
  submitted_at?: string | null
  user?: RestActor | null
}

function normalizeReviewState(state?: string | null): string | null {
  if (!state) return null

  const normalized = state.toUpperCase()

  if (
    normalized !== "APPROVED" &&
    normalized !== "CHANGES_REQUESTED" &&
    normalized !== "COMMENTED" &&
    normalized !== "DISMISSED"
  ) {
    return null
  }

  return normalized
}

async function waitForRateLimitIfNeeded(octokit: Octokit): Promise<void> {
  const rateLimit = await octokit.rest.rateLimit.get()

  const remaining = rateLimit.data.resources.core.remaining
  const resetEpochSeconds = rateLimit.data.resources.core.reset
  const waitMs = Math.max(resetEpochSeconds * 1000 - Date.now(), 0)

  console.log("fetchPullRequestReviews - core remaining:", remaining)

  if (remaining < 100 && waitMs > 0) {
    console.log("fetchPullRequestReviews - rate limit low, sleeping for ms:", waitMs)
    await sleep(waitMs)
  }
}

export async function fetchPullRequestReviews({
  octokit,
  owner,
  repo,
  pullNumber,
}: FetchPullRequestReviewsInput): Promise<RestPullRequestReview[]> {
  console.log("fetchPullRequestReviews - entered")
  console.log("fetchPullRequestReviews - owner/repo/pr:", `${owner}/${repo}#${pullNumber}`)

  const allReviews: RestPullRequestReview[] = []
  let page = 1
  let shouldContinue = true

  while (shouldContinue) {
    const response = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    })

    console.log("fetchPullRequestReviews - fetched page:", page)
    console.log("fetchPullRequestReviews - page size:", response.data.length)

    if (response.data.length === 0) {
      break
    }

    for (const review of response.data) {
      const normalizedState = normalizeReviewState(review.state)

      if (!normalizedState) {
        console.log(
          "fetchPullRequestReviews - skipping unsupported review state:",
          review.state,
          "review id:",
          review.id
        )
        continue
      }

      allReviews.push({
        id: review.id,
        state: normalizedState,
        submitted_at: review.submitted_at,
        user: {
          login: review.user?.login ?? null,
          id: review.user?.id ?? null,
          type: review.user?.type ?? null,
        },
      })
    }

    if (response.data.length < 100) {
      shouldContinue = false
    } else {
      page += 1
      await waitForRateLimitIfNeeded(octokit)
    }
  }

  console.log("fetchPullRequestReviews - total reviews fetched:", allReviews.length)

  return allReviews
}