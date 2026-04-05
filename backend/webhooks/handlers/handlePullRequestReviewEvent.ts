import { prisma } from "../../prismaClient.js"
import { isRepoReady } from "./helper/isRepoReady.js"
import { checkAndQueueMetricRefresh } from "./helper/checkAndQueueMetricRefresh.js"

console.log("handlePullRequestReviewEvent module loaded")

interface HandlePullRequestReviewEventInput {
  deliveryId: string
  payload: unknown
}

interface PullRequestReviewWebhookPayload {
  action?: string
  repository?: {
    id?: number
  }
  pull_request?: {
    id?: number
    updated_at?: string
  }
  review?: {
    id?: number
    state?: string
    submitted_at?: string | null
    user?: {
      id?: number
      login?: string
    }
  }
}

export async function handlePullRequestReviewEvent({
  deliveryId,
  payload,
}: HandlePullRequestReviewEventInput): Promise<void> {
  console.log("pull_request_review handler - delivery id:", deliveryId)

  const reviewPayload = payload as PullRequestReviewWebhookPayload
  const action = reviewPayload.action

  if (!action) {
    console.log("pull_request_review handler - missing action")
    return
  }

  const githubRepoId = reviewPayload.repository?.id

  const repoReady = await isRepoReady({
    githubRepoId,
    event: "pull_request_review",
    deliveryId,
    payload,
    delayMs: 15000,
  })

  if (!repoReady) {
    console.log("pull_request_review handler - repo not ready, job requeued")
    return
  }

  switch (action) {
    case "submitted":
      await handlePullRequestReviewSubmitted(reviewPayload)
      break

    default:
      console.log("pull_request_review handler - unhandled action:", action)
  }
}

async function incrementRepoWeightedEventCount(githubRepoId?: number): Promise<void> {
  if (!githubRepoId) {
    console.log("pull_request_review handler - missing repository id for weighted event update")
    return
  }

  await prisma.repo.update({
    where: {
      githubRepoId: BigInt(githubRepoId),
    },
    data: {
      weightedEvents: {
        increment: 3,
      },
    },
  })

  await checkAndQueueMetricRefresh({ githubRepoId })
}

function mapReviewState(state?: string) {
  switch (state) {
    case "approved":
      return "APPROVED"
    case "changes_requested":
      return "CHANGES_REQUESTED"
    case "commented":
      return "COMMENTED"
    case "dismissed":
      return "DISMISSED"
    default:
      return null
  }
}

async function handlePullRequestReviewSubmitted(
  payload: PullRequestReviewWebhookPayload
): Promise<void> {
  const review = payload.review
  const pr = payload.pull_request
  const repo = payload.repository

  if (
    !review?.id ||
    !review.user?.id ||
    !review.user.login ||
    !review.state ||
    !review.submitted_at ||
    !pr?.id ||
    !repo?.id
  ) {
    console.log("pull_request_review submitted - missing required fields")
    return
  }

  const mappedState = mapReviewState(review.state)

  if (!mappedState) {
    console.log("pull_request_review submitted - unsupported review state:", review.state)
    return
  }

  const dbPr = await prisma.pullRequest.findUnique({
    where: {
      githubPrId: BigInt(pr.id),
    },
    select: {
      id: true,
    },
  })

  if (!dbPr) {
    console.log("pull_request_review submitted - PR not found:", pr.id)
    return
  }

  const dbUser = await prisma.user.upsert({
    where: {
      githubId: BigInt(review.user.id),
    },
    update: {
      login: review.user.login,
    },
    create: {
      githubId: BigInt(review.user.id),
      login: review.user.login,
    },
    select: {
      id: true,
    },
  })

  await prisma.pullRequestReview.upsert({
    where: {
      githubReviewId: BigInt(review.id),
    },
    update: {
      prId: dbPr.id,
      reviewerId: dbUser.id,
      reviewerLogin: review.user.login,
      state: mappedState,
      submittedAt: new Date(review.submitted_at),
      createdAt: new Date(review.submitted_at),
    },
    create: {
      githubReviewId: BigInt(review.id),
      prId: dbPr.id,
      reviewerId: dbUser.id,
      reviewerLogin: review.user.login,
      state: mappedState,
      submittedAt: new Date(review.submitted_at),
      createdAt: new Date(review.submitted_at),
    },
  })

  await prisma.pullRequest.update({
    where: {
      id: dbPr.id,
    },
    data: {
      lastActivityAt: new Date(review.submitted_at),
    },
  })

  await incrementRepoWeightedEventCount(repo.id)
  console.log("pull_request_review submitted - stored review:", review.id)
}