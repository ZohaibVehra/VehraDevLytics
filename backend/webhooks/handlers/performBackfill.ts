import { prisma } from "../../prismaClient.js"
import { myQueue } from "../../queue.js"
import { getInstallationOctokit } from "./helper/getInstallationToken.js"
import { fetchRecentPullRequestsPage } from "./helper/fetchRecentPullRequests.js"
import { hydratePullRequestActivity } from "./helper/hydratePullRequestActivity.js"

console.log("performBackfill module loaded")

interface PerformBackfillInput {
  deliveryId: string
  payload: unknown
}

interface RepoSavedPayload {
  githubRepoId?: number
  name?: string
  fullName?: string
  installationId?: number
}

interface BackfillPullRequest {
  id: string
  databaseId?: number | null
  number: number
  title: string
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  mergedAt?: string | null
  merged: boolean
  author?: {
    __typename?: string
    login?: string | null
    databaseId?: number | null
  } | null
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

function getMergeTimeSeconds(
  createdAt: string,
  mergedAt?: string | null
): number | null {
  if (!mergedAt) return null

  const createdAtMs = new Date(createdAt).getTime()
  const mergedAtMs = new Date(mergedAt).getTime()

  if (Number.isNaN(createdAtMs) || Number.isNaN(mergedAtMs)) {
    return null
  }

  return Math.floor((mergedAtMs - createdAtMs) / 1000)
}

export async function performBackfill({
  deliveryId,
  payload,
}: PerformBackfillInput): Promise<void> {
  console.log("performBackfill - entered")
  console.log("performBackfill - delivery id:", deliveryId)

  const repoPayload = payload as RepoSavedPayload
  console.log("performBackfill - payload:", repoPayload)

  const githubRepoId = repoPayload.githubRepoId

  if (!githubRepoId) {
    console.log("performBackfill - missing githubRepoId")
    return
  }

  const dbRepo = await prisma.repo.findUnique({
    where: {
      githubRepoId: BigInt(githubRepoId),
    },
    select: {
      id: true,
      fullName: true,
      isReady: true,
      syncInProgress: true,
    },
  })

  if (!dbRepo) {
    console.log("performBackfill - repo not found:", githubRepoId)
    return
  }

  if (dbRepo.syncInProgress) {
    console.log("performBackfill - repo already syncing:", dbRepo.fullName)
    return
  }

  if (dbRepo.isReady) {
    console.log("performBackfill - repo already ready, skipping:", dbRepo.fullName)
    return
  }

  await prisma.repo.update({
    where: {
      id: dbRepo.id,
    },
    data: {
      syncInProgress: true,
    },
  })

  try {
    const installationId = repoPayload.installationId

    if (!installationId) {
      console.log("performBackfill - missing installationId")

      await prisma.repo.update({
        where: { id: dbRepo.id },
        data: { syncInProgress: false },
      })

      return
    }

    const fullName = repoPayload.fullName

    if (!fullName || !fullName.includes("/")) {
      console.log("performBackfill - invalid fullName")

      await prisma.repo.update({
        where: { id: dbRepo.id },
        data: { syncInProgress: false },
      })

      return
    }

    const [owner, repo] = fullName.split("/")

    console.log("performBackfill - creating octokit for installation:", installationId)
    const octokit = await getInstallationOctokit(installationId)
    console.log("performBackfill - octokit ready")

    console.log("performBackfill - owner:", owner)
    console.log("performBackfill - repo:", repo)

    const backfillCutoff = new Date()
    backfillCutoff.setDate(backfillCutoff.getDate() - 7)

    console.log("performBackfill - 7 day cutoff:", backfillCutoff.toISOString())

    const allPullRequests: BackfillPullRequest[] = []

    let prCursor: string | null = null
    let hasNextPage = true
    let shouldContinue = true
    let pageCount = 0

    while (hasNextPage && shouldContinue) {
      pageCount += 1

      console.log("performBackfill - fetching PR page:", pageCount)
      console.log("performBackfill - current cursor:", prCursor)

      const page = await fetchRecentPullRequestsPage({
        octokit,
        owner,
        repo,
        prCursor,
        prsPerPage: 50,
      })

      console.log("performBackfill - page PR count:", page.pullRequests.length)

      if (page.pullRequests.length === 0) {
        console.log("performBackfill - no PRs returned, stopping pagination")
        break
      }

      for (const pullRequest of page.pullRequests as BackfillPullRequest[]) {
        const updatedAt = new Date(pullRequest.updatedAt)

        if (updatedAt < backfillCutoff) {
          console.log(
            "performBackfill - reached PR older than cutoff, stopping. PR number:",
            pullRequest.number
          )
          console.log("performBackfill - PR updatedAt:", pullRequest.updatedAt)
          shouldContinue = false
          continue
        }

        allPullRequests.push(pullRequest)
      }

      hasNextPage = page.pageInfo.hasNextPage
      prCursor = page.pageInfo.endCursor ?? null

      console.log("performBackfill - total PRs collected so far:", allPullRequests.length)
      console.log("performBackfill - has next page:", hasNextPage)
      console.log("performBackfill - next cursor:", prCursor)
    }

    console.log("performBackfill - finished pagination")
    console.log("performBackfill - total pages fetched:", pageCount)
    console.log("performBackfill - total PRs collected:", allPullRequests.length)

    for (const pullRequest of allPullRequests) {
      if (!pullRequest.databaseId) {
        console.log(
          "performBackfill - skipping PR with missing databaseId:",
          pullRequest.number
        )
        continue
      }

      const authorLogin = pullRequest.author?.login

      if (!authorLogin) {
        console.log(
          "performBackfill - skipping PR with missing author login:",
          pullRequest.number
        )
        continue
      }

      const authorGithubId = pullRequest.author?.databaseId

      if (!authorGithubId) {
        console.log(
          "performBackfill - skipping PR with missing author github id:",
          pullRequest.number
        )
        continue
      }

      const user = await prisma.user.upsert({
        where: {
          githubId: BigInt(authorGithubId),
        },
        update: {
          login: authorLogin,
        },
        create: {
          githubId: BigInt(authorGithubId),
          login: authorLogin,
        },
        select: {
          id: true,
        },
      })

      await prisma.pullRequest.upsert({
        where: {
          githubPrId: BigInt(pullRequest.databaseId),
        },
        update: {
          title: pullRequest.title,
          repoId: dbRepo.id,
          createdAt: new Date(pullRequest.createdAt),
          mergedAt: pullRequest.mergedAt ? new Date(pullRequest.mergedAt) : null,
          closedAt: pullRequest.closedAt ? new Date(pullRequest.closedAt) : null,
          isMerged: pullRequest.merged,
          mergeTimeSeconds: getMergeTimeSeconds(
            pullRequest.createdAt,
            pullRequest.mergedAt
          ),
          number: pullRequest.number,
          authorLogin,
          userId: user.id,
          lastActivityAt: new Date(pullRequest.updatedAt),
        },
        create: {
          githubPrId: BigInt(pullRequest.databaseId),
          title: pullRequest.title,
          repoId: dbRepo.id,
          createdAt: new Date(pullRequest.createdAt),
          mergedAt: pullRequest.mergedAt ? new Date(pullRequest.mergedAt) : null,
          closedAt: pullRequest.closedAt ? new Date(pullRequest.closedAt) : null,
          isMerged: pullRequest.merged,
          mergeTimeSeconds: getMergeTimeSeconds(
            pullRequest.createdAt,
            pullRequest.mergedAt
          ),
          number: pullRequest.number,
          authorLogin,
          userId: user.id,
          lastActivityAt: new Date(pullRequest.updatedAt),
        },
      })

      console.log("performBackfill - saved PR:", {
        number: pullRequest.number,
        githubPrId: pullRequest.databaseId,
        title: pullRequest.title,
        reviewCount: pullRequest.reviews.totalCount,
        issueCommentCount: pullRequest.comments.totalCount,
        reviewThreadCount: pullRequest.reviewThreads.totalCount,
      })
    }

    const dbPullRequests = await prisma.pullRequest.findMany({
      where: { repoId: dbRepo.id },
      select: { id: true },
    })

    const CONCURRENCY = 2

    for (let i = 0; i < dbPullRequests.length; i += CONCURRENCY) {
      const chunk = dbPullRequests.slice(i, i + CONCURRENCY)

      const results = await Promise.allSettled(
        chunk.map((pr) =>
          hydratePullRequestActivity({
            octokit,
            dbPullRequestId: pr.id,
          })
        )
      )

      for (const result of results) {
        if (result.status === "rejected") {
          console.log("performBackfill - PR hydration failed")
          console.log(result.reason)
        }
      }
    }

    await prisma.repo.update({
      where: {
        id: dbRepo.id,
      },
      data: {
        isReady: true,
        syncInProgress: false,
        lastSyncedAt: new Date(),
      },
    })

    try {
      await myQueue.add(
        "github-webhook",
        {
          event: "createMetrics",
          deliveryId: `initial-metrics:${dbRepo.id}`,
          payload: {
            repoId: dbRepo.id,
            source: "initialBackfill",
          },
        },
        {
          jobId: `createMetrics:initial:${dbRepo.id}`,
        }
      )
    } catch (error) {
      console.log("performBackfill - failed to queue metrics for repo:", dbRepo.fullName)
      console.log(error)
    }

    console.log("performBackfill - completed for:", dbRepo.fullName)
  } catch (error) {
    console.log("performBackfill - failed for repo:", dbRepo.fullName)
    console.log(error)

    await prisma.repo.update({
      where: {
        id: dbRepo.id,
      },
      data: {
        syncInProgress: false,
      },
    })

    throw error
  }
}