import { prisma } from "../../prismaClient.js"
import { isRepoReady } from "./helper/isRepoReady.js"
import { checkAndQueueMetricRefresh } from "./helper/checkAndQueueMetricRefresh.js"

console.log("handlePullRequestEvent module loaded")
interface HandlePullRequestEventInput {
  deliveryId: string
  payload: unknown
}

interface PullRequestWebhookPayload {
  action?: string
  repository?: {
    id?: number
  }
  pull_request?: {
    id?: number
    number?: number
    title?: string
    created_at?: string
    closed_at?: string | null
    merged_at?: string | null
    merged?: boolean
    user?: {
      id?: number
      login?: string
    }
  }
}

export async function handlePullRequestEvent({
  deliveryId,
  payload,
}: HandlePullRequestEventInput): Promise<void> {
  console.log("pull_request handler - delivery id:", deliveryId)

  const prPayload = payload as PullRequestWebhookPayload
  const action = prPayload.action

  if (!action) {
    console.log("pull_request handler - missing action")
    return
  }

  const githubRepoId = prPayload.repository?.id

  const repoReady = await isRepoReady({
    githubRepoId,
    event: "pull_request",
    deliveryId,
    payload,
    delayMs: 15000,
  })

  if (!repoReady) {
    console.log("pull_request handler - repo not ready, job requeued")
    return
  }

  switch (action) {
    case "opened":
      await handlePullRequestOpened(prPayload)
      break

    case "closed":
      await handlePullRequestClosed(prPayload)
      break

    default:
      console.log("pull_request handler - unhandled action:", action)
  }
}

// add 5 to weightedEvent for repo for each PR open and close
async function incrementRepoWeightedEventCount(githubRepoId?: number): Promise<void> {
  if (!githubRepoId) {
    console.log("pull_request handler - missing repository id for weighted event update")
    return
  }

  await prisma.repo.update({
    where: {
      githubRepoId: BigInt(githubRepoId),
    },
    data: {
      weightedEvents: {
        increment: 5,
      },
    },
  })

  await checkAndQueueMetricRefresh({ githubRepoId })
}

async function handlePullRequestOpened(
  payload: PullRequestWebhookPayload
): Promise<void> {
  const pr = payload.pull_request
  const repo = payload.repository

  if (
    !pr?.id ||
    !pr.number ||
    !pr.title ||
    !pr.created_at ||
    !pr.user?.id ||
    !pr.user.login ||
    !repo?.id
  ) {
    console.log("pull_request opened - missing required fields")
    return
  }

  const dbRepo = await prisma.repo.findUnique({
    where: {
      githubRepoId: BigInt(repo.id),
    },
    select: {
      id: true,
    },
  })

  if (!dbRepo) {
    console.log("pull_request opened - repo not found:", repo.id)
    return
  }

  const dbUser = await prisma.user.upsert({
  where: {
    githubId: BigInt(pr.user.id),
  },
  update: {
    login: pr.user.login,
  },
  create: {
    githubId: BigInt(pr.user.id),
    login: pr.user.login,
  },
  select: {
    id: true,
  },
})

  await prisma.pullRequest.upsert({
    where: {
      githubPrId: BigInt(pr.id),
    },
    update: {
      number: pr.number,
      title: pr.title,
      createdAt: new Date(pr.created_at),
      authorLogin: pr.user.login,
      repoId: dbRepo.id,
      userId: dbUser.id,
    },
    create: {
      githubPrId: BigInt(pr.id),
      number: pr.number,
      title: pr.title,
      createdAt: new Date(pr.created_at),
      authorLogin: pr.user.login,
      repoId: dbRepo.id,
      userId: dbUser.id,
      isMerged: false,
    },
  })

  await incrementRepoWeightedEventCount(payload.repository?.id)
  console.log("pull_request opened - stored PR:", pr.id)
}

async function handlePullRequestClosed(
  payload: PullRequestWebhookPayload
): Promise<void> {
  const pr = payload.pull_request

  if (!pr?.id || pr.merged === undefined) {
    console.log("pull_request closed - missing required fields")
    return
  }

  const existingPr = await prisma.pullRequest.findUnique({
    where: {
      githubPrId: BigInt(pr.id),
    },
    select: {
      createdAt: true,
    },
  })

  if (!existingPr) {
    console.log("pull_request closed - PR not found:", pr.id)
    return
  }

  let mergeTimeSeconds: number | null = null

  if (pr.merged && pr.merged_at) {
    mergeTimeSeconds = Math.floor(
      (new Date(pr.merged_at).getTime() - existingPr.createdAt.getTime()) / 1000
    )
  }

  await prisma.pullRequest.update({
    where: {
      githubPrId: BigInt(pr.id),
    },
    data: {
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      isMerged: pr.merged,
      mergeTimeSeconds,
    },
  })

  await incrementRepoWeightedEventCount(payload.repository?.id)
  console.log("pull_request closed - updated PR:", pr.id)
}