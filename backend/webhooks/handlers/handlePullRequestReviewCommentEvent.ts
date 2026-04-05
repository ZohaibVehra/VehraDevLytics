import { prisma } from "../../prismaClient.js"
import { isRepoReady } from "./helper/isRepoReady.js"
import { checkAndQueueMetricRefresh } from "./helper/checkAndQueueMetricRefresh.js"

console.log("handlePullRequestReviewCommentEvent module loaded")

interface HandlePullRequestReviewCommentEventInput {
  deliveryId: string
  payload: unknown
}

interface PullRequestReviewCommentWebhookPayload {
  action?: string
  repository?: {
    id?: number
  }
  pull_request?: {
    id?: number
  }
  comment?: {
    id?: number
    pull_request_review_id?: number
    created_at?: string
    user?: {
      id?: number
      login?: string
      type?: string
    }
  }
}

export async function handlePullRequestReviewCommentEvent({
  deliveryId,
  payload,
}: HandlePullRequestReviewCommentEventInput): Promise<void> {
  console.log("pull_request_review_comment handler - delivery id:", deliveryId)

  const commentPayload = payload as PullRequestReviewCommentWebhookPayload
  const action = commentPayload.action

  if (!action) {
    console.log("pull_request_review_comment handler - missing action")
    return
  }

  const githubRepoId = commentPayload.repository?.id

  const repoReady = await isRepoReady({
    githubRepoId,
    event: "pull_request_review_comment",
    deliveryId,
    payload,
    delayMs: 15000,
  })

  if (!repoReady) {
    console.log("pull_request_review_comment handler - repo not ready, job requeued")
    return
  }

  switch (action) {
    case "created":
      await handlePullRequestReviewCommentCreated(commentPayload)
      break

    default:
      console.log("pull_request_review_comment handler - unhandled action:", action)
  }
}

async function incrementRepoWeightedEventCount(githubRepoId?: number): Promise<void> {
  if (!githubRepoId) {
    console.log("pull_request_review_comment handler - missing repository id for weighted event update")
    return
  }

  await prisma.repo.update({
    where: {
      githubRepoId: BigInt(githubRepoId),
    },
    data: {
      weightedEvents: {
        increment: 1,
      },
    },
  })

  await checkAndQueueMetricRefresh({ githubRepoId })
}

async function handlePullRequestReviewCommentCreated(
  payload: PullRequestReviewCommentWebhookPayload
): Promise<void> {
  const comment = payload.comment
  const pr = payload.pull_request
  const repo = payload.repository

  if (
    !comment?.id ||
    !comment.pull_request_review_id ||
    !comment.created_at ||
    !comment.user?.id ||
    !comment.user.login ||
    !comment.user.type ||
    !pr?.id ||
    !repo?.id
  ) {
    console.log("pull_request_review_comment created - missing required fields")
    return
  }

  if (comment.user.type.toLowerCase() === "bot"){
    console.log("pull_request_review_comment created - skipping bot comment:", comment.id)
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
    console.log("pull_request_review_comment created - PR not found:", pr.id)
    return
  }

  const dbReview = await prisma.pullRequestReview.findUnique({
    where: {
      githubReviewId: BigInt(comment.pull_request_review_id),
    },
    select: {
      id: true,
    },
  })

  if (!dbReview) {
    throw new Error(
      `pull_request_review_comment created - parent review not found: ${comment.pull_request_review_id}, throwing to initiate retry in case pull request review still processing`
    )
  }

  const dbUser = await prisma.user.upsert({
    where: {
        githubId: BigInt(comment.user.id),
    },
    update: {
        login: comment.user.login,
    },
    create: {
        githubId: BigInt(comment.user.id),
        login: comment.user.login,
    },
    select: {
        id: true,
    },
})

  const existingComment = await prisma.pullRequestReviewComment.findUnique({
    where: {
      githubCommentId: BigInt(comment.id),
    },
    select: {
      id: true,
    },
  })

  if (existingComment) {
    await prisma.pullRequest.update({
      where: {
        id: dbPr.id,
      },
      data: {
        lastActivityAt: new Date(comment.created_at),
      },
    })

    console.log("pull_request_review_comment created - comment already exists:", comment.id)
    return
  }
  
  console.log({
    prId: dbPr.id,
    reviewId: dbReview.id,
    commenterId: dbUser.id,
    commenterLogin: comment.user.login,
    })

  await prisma.$transaction([
  prisma.pullRequestReviewComment.create({
    data: {
      githubCommentId: BigInt(comment.id),
      prId: dbPr.id,
      reviewId: dbReview.id,
      commenterId: dbUser.id,
      commenterLogin: comment.user.login,
      createdAt: new Date(comment.created_at),
    },
  }),

    prisma.pullRequest.update({
      where: {
        id: dbPr.id,
      },
      data: {
        lastActivityAt: new Date(comment.created_at),
        commentCount: {
          increment: 1,
        },
      },
    }),
  ])

  await incrementRepoWeightedEventCount(repo.id)
  console.log("pull_request_review_comment created - stored comment:", comment.id)
}