import { Octokit } from "octokit"
import { sleep } from "./sleep.js"

interface FetchPullRequestReviewCommentsInput {
  octokit: Octokit
  owner: string
  repo: string
  pullNumber: number
}

export interface RestPullRequestReviewComment {
  id: number
  pull_request_review_id?: number | null
  created_at: string
  user?: {
    login?: string | null
    id?: number | null
    type?: string | null
  } | null
}

async function waitForRateLimitIfNeeded(octokit: Octokit): Promise<void> {
  const rateLimit = await octokit.rest.rateLimit.get()

  const remaining = rateLimit.data.resources.core.remaining
  const resetEpochSeconds = rateLimit.data.resources.core.reset
  const waitMs = Math.max(resetEpochSeconds * 1000 - Date.now(), 0)

  console.log("fetchPullRequestReviewComments - core remaining:", remaining)

  if (remaining < 100 && waitMs > 0) {
    console.log("fetchPullRequestReviewComments - rate limit low, sleeping for ms:", waitMs)
    await sleep(waitMs)
  }
}

export async function fetchPullRequestReviewComments({
  octokit,
  owner,
  repo,
  pullNumber,
}: FetchPullRequestReviewCommentsInput): Promise<RestPullRequestReviewComment[]> {
  console.log("fetchPullRequestReviewComments - entered")
  console.log("fetchPullRequestReviewComments - owner/repo/pr:", `${owner}/${repo}#${pullNumber}`)

  const allComments: RestPullRequestReviewComment[] = []
  let page = 1
  let shouldContinue = true

  while (shouldContinue) {
    const response = await octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    })

    console.log("fetchPullRequestReviewComments - fetched page:", page)
    console.log("fetchPullRequestReviewComments - page size:", response.data.length)

    if (response.data.length === 0) {
      break
    }

    for (const comment of response.data) {
      allComments.push({
        id: comment.id,
        pull_request_review_id: comment.pull_request_review_id ?? null,
        created_at: comment.created_at,
        user: {
          login: comment.user?.login ?? null,
          id: comment.user?.id ?? null,
          type: comment.user?.type ?? null,
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

  console.log(
    "fetchPullRequestReviewComments - total review comments fetched:",
    allComments.length
  )

  return allComments
}