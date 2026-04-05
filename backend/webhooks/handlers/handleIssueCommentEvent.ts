import { prisma } from "../../prismaClient.js"
import { isRepoReady } from "./helper/isRepoReady.js"
import { checkAndQueueMetricRefresh } from "./helper/checkAndQueueMetricRefresh.js"

console.log("handleIssueCommentEvent module loaded")

interface HandleIssueCommentEventInput {
  deliveryId: string
  payload: unknown
}

interface IssueCommentWebhookPayload {
  action?: string
  repository?: {
    id?: number
  }
  issue?: {
    number?: number
    pull_request?: {
      url?: string
    }
  }
  comment?: {
    id?: number
    created_at?: string
    user?: {
      id?: number
      login?: string
      type?: string
    }
  }
}

export async function handleIssueCommentEvent({
  deliveryId,
  payload,
}: HandleIssueCommentEventInput): Promise<void> {
  console.log("issue_comment handler - delivery id:", deliveryId)

  const issueCommentPayload = payload as IssueCommentWebhookPayload
  const action = issueCommentPayload.action

  if (!action) {
    console.log("issue_comment handler - missing action")
    return
  }

    const githubRepoId = issueCommentPayload.repository?.id
  
    const repoReady = await isRepoReady({
      githubRepoId,
      event: "issue_comment",
      deliveryId,
      payload,
      delayMs: 15000,
    })
  
    if (!repoReady) {
      console.log("issue_comment handler - repo not ready, job requeued")
      return
    }

  switch (action) {
    case "created":
      await handleIssueCommentCreated(issueCommentPayload)
      break

    default:
      console.log("issue_comment handler - unhandled action:", action)
  }
}

async function incrementRepoWeightedEventCount(githubRepoId?: number): Promise<void> {
  if (!githubRepoId) {
    console.log("issue_comment handler - missing repository id for weighted event update")
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

async function handleIssueCommentCreated(
  payload: IssueCommentWebhookPayload
): Promise<void> {
  const issue = payload.issue
  const comment = payload.comment
  const repo = payload.repository

  if (
    !issue?.number ||
    !issue.pull_request ||
    !comment?.id ||
    !comment.created_at ||
    !comment.user?.id ||
    !comment.user.login ||
    !comment.user.type ||
    !repo?.id
  ) {
    console.log("issue_comment created - missing required fields")
    return
  }

  if (comment.user.type.toLowerCase() === "bot") {
    console.log("issue_comment created - skipping bot comment:", comment.id)
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
    console.log("issue_comment created - repo not found:", repo.id)
    return
  }

  const dbPr = await prisma.pullRequest.findFirst({
    where: {
      repoId: dbRepo.id,
      number: issue.number,
    },
    select: {
      id: true,
    },
  })

  if (!dbPr) {
    console.log("issue_comment created - PR not found for repo/number:", repo.id, issue.number)
    return
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

  const existingComment = await prisma.issueComment.findUnique({
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

    console.log("issue_comment created - comment already exists:", comment.id)
    return
  }

  await prisma.$transaction([
    prisma.issueComment.create({
      data: {
        githubCommentId: BigInt(comment.id),
        prId: dbPr.id,
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
  console.log("issue_comment created - stored comment:", comment.id)
}