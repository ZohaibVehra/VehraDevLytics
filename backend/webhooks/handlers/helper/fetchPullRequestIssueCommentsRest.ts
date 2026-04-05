import { Octokit } from "octokit"
import { sleep } from "./sleep.js"

interface FetchPullRequestIssueCommentsInput {
  octokit: Octokit
  owner: string
  repo: string
  pullNumber: number
}

export interface RestIssueComment {
  id: number
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

  console.log("fetchPullRequestIssueComments - core remaining:", remaining)

  if (remaining < 100 && waitMs > 0) {
    console.log("fetchPullRequestIssueComments - rate limit low, sleeping for ms:", waitMs)
    await sleep(waitMs)
  }
}

export async function fetchPullRequestIssueComments({
  octokit,
  owner,
  repo,
  pullNumber,
}: FetchPullRequestIssueCommentsInput): Promise<RestIssueComment[]> {
  console.log("fetchPullRequestIssueComments - entered")
  console.log("fetchPullRequestIssueComments - owner/repo/pr:", `${owner}/${repo}#${pullNumber}`)

  const allComments: RestIssueComment[] = []
  let page = 1
  let shouldContinue = true

  while (shouldContinue) {
    const response = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pullNumber,
      per_page: 100,
      page,
    })

    console.log("fetchPullRequestIssueComments - fetched page:", page)
    console.log("fetchPullRequestIssueComments - page size:", response.data.length)

    if (response.data.length === 0) {
      break
    }

    for (const comment of response.data) {
      allComments.push({
        id: comment.id,
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
    "fetchPullRequestIssueComments - total issue comments fetched:",
    allComments.length
  )

  return allComments
}