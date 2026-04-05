import { prisma } from "../../../prismaClient.js"
import { Octokit } from "octokit"
import {
  fetchPullRequestReviews,
  type RestPullRequestReview,
} from "./fetchPullRequestReviewsRest.js"
import {
  fetchPullRequestReviewComments,
  type RestPullRequestReviewComment,
} from "./fetchPullRequestReviewCommentsRest.js"
import {
  fetchPullRequestIssueComments,
  type RestIssueComment,
} from "./fetchPullRequestIssueCommentsRest.js"

interface HydratePullRequestActivityInput {
  octokit: Octokit
  dbPullRequestId: string
}

type SupportedReviewState =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENTED"
  | "DISMISSED"

interface NormalizedActor {
  githubId: bigint
  login: string
}

function isSupportedReviewState(state: string): state is SupportedReviewState {
  return (
    state === "APPROVED" ||
    state === "CHANGES_REQUESTED" ||
    state === "COMMENTED" ||
    state === "DISMISSED"
  )
}

function getLatestDate(dates: Array<Date | null | undefined>): Date | null {
  const validDates = dates.filter((date): date is Date => Boolean(date))

  if (validDates.length === 0) {
    return null
  }

  return validDates.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest
  )
}

function extractActor(actor?: {
  login?: string | null
  id?: number | null
} | null): NormalizedActor | null {
  if (!actor?.login || !actor?.id) {
    return null
  }

  return {
    githubId: BigInt(actor.id),
    login: actor.login,
  }
}

function buildUniqueActors({
  reviews,
  reviewComments,
  issueComments,
}: {
  reviews: RestPullRequestReview[]
  reviewComments: RestPullRequestReviewComment[]
  issueComments: RestIssueComment[]
}): NormalizedActor[] {
  const actorMap = new Map<string, NormalizedActor>()

  for (const review of reviews) {
    const actor = extractActor(review.user)
    if (!actor) continue
    actorMap.set(actor.githubId.toString(), actor)
  }

  for (const comment of reviewComments) {
    const actor = extractActor(comment.user)
    if (!actor) continue
    actorMap.set(actor.githubId.toString(), actor)
  }

  for (const comment of issueComments) {
    const actor = extractActor(comment.user)
    if (!actor) continue
    actorMap.set(actor.githubId.toString(), actor)
  }

  return Array.from(actorMap.values())
}

export async function hydratePullRequestActivity({
  octokit,
  dbPullRequestId,
}: HydratePullRequestActivityInput): Promise<void> {
  console.log("hydratePullRequestActivity - entered")
  console.log("hydratePullRequestActivity - dbPullRequestId:", dbPullRequestId)

  const dbPullRequest = await prisma.pullRequest.findUnique({
    where: {
      id: dbPullRequestId,
    },
    select: {
      id: true,
      number: true,
      lastActivityAt: true,
      repo: {
        select: {
          fullName: true,
        },
      },
    },
  })

  if (!dbPullRequest) {
    throw new Error(
      `hydratePullRequestActivity - pull request not found: ${dbPullRequestId}`
    )
  }

  const fullName = dbPullRequest.repo.fullName

  if (!fullName.includes("/")) {
    throw new Error(
      `hydratePullRequestActivity - invalid repo fullName: ${fullName}`
    )
  }

  const [owner, repo] = fullName.split("/")

  console.log("hydratePullRequestActivity - owner:", owner)
  console.log("hydratePullRequestActivity - repo:", repo)
  console.log("hydratePullRequestActivity - pull number:", dbPullRequest.number)

  const [reviews, reviewComments, issueComments] = await Promise.all([
    fetchPullRequestReviews({
      octokit,
      owner,
      repo,
      pullNumber: dbPullRequest.number,
    }),
    fetchPullRequestReviewComments({
      octokit,
      owner,
      repo,
      pullNumber: dbPullRequest.number,
    }),
    fetchPullRequestIssueComments({
      octokit,
      owner,
      repo,
      pullNumber: dbPullRequest.number,
    }),
  ])

  console.log("hydratePullRequestActivity - fetched reviews:", reviews.length)
  console.log(
    "hydratePullRequestActivity - fetched review comments:",
    reviewComments.length
  )
  console.log(
    "hydratePullRequestActivity - fetched issue comments:",
    issueComments.length
  )

  const uniqueActors = buildUniqueActors({
    reviews,
    reviewComments,
    issueComments,
  })

  console.log("hydratePullRequestActivity - unique actors:", uniqueActors.length)

  if (uniqueActors.length > 0) {
    await prisma.user.createMany({
      data: uniqueActors.map((actor) => ({
        githubId: actor.githubId,
        login: actor.login,
      })),
      skipDuplicates: true,
    })
  }

  const dbUsers = uniqueActors.length
    ? await prisma.user.findMany({
        where: {
          githubId: {
            in: uniqueActors.map((actor) => actor.githubId),
          },
        },
        select: {
          id: true,
          githubId: true,
          login: true,
        },
      })
    : []

  const githubUserIdToDbUserId = new Map<string, string>()

  for (const dbUser of dbUsers) {
    githubUserIdToDbUserId.set(dbUser.githubId.toString(), dbUser.id)
  }

  const validReviews: Array<
    RestPullRequestReview & { state: SupportedReviewState }
    > = reviews.filter(
    (review): review is RestPullRequestReview & { state: SupportedReviewState } => {
        const actor = extractActor(review.user)

        return actor !== null && isSupportedReviewState(review.state)
    }
    )

  if (validReviews.length > 0) {
    await prisma.pullRequestReview.createMany({
      data: validReviews.map((review) => {
        const actor = extractActor(review.user)

        if (!actor) {
          throw new Error("Unexpected missing review actor after filtering")
        }

        const reviewerId = githubUserIdToDbUserId.get(actor.githubId.toString())

        if (!reviewerId) {
          throw new Error(
            `Missing DB user for review actor githubId ${actor.githubId.toString()}`
          )
        }

        return {
          githubReviewId: BigInt(review.id),
          prId: dbPullRequest.id,
          reviewerId,
          reviewerLogin: actor.login,
          state: review.state,
          submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
        }
      }),
      skipDuplicates: true,
    })
  }

  const dbReviews = validReviews.length
    ? await prisma.pullRequestReview.findMany({
        where: {
          githubReviewId: {
            in: validReviews.map((review) => BigInt(review.id)),
          },
        },
        select: {
          id: true,
          githubReviewId: true,
        },
      })
    : []

  const githubReviewIdToDbReviewId = new Map<string, string>()

  for (const dbReview of dbReviews) {
    githubReviewIdToDbReviewId.set(dbReview.githubReviewId.toString(), dbReview.id)
  }

  const validReviewComments = reviewComments.filter((comment) => {
    const actor = extractActor(comment.user)

    if (!actor) return false
    if (!comment.pull_request_review_id) return false

    return githubReviewIdToDbReviewId.has(comment.pull_request_review_id.toString())
  })

  if (validReviewComments.length > 0) {
    await prisma.pullRequestReviewComment.createMany({
      data: validReviewComments.map((comment) => {
        const actor = extractActor(comment.user)

        if (!actor) {
          throw new Error("Unexpected missing review comment actor after filtering")
        }

        const commenterId = githubUserIdToDbUserId.get(actor.githubId.toString())
        const reviewId = githubReviewIdToDbReviewId.get(
          comment.pull_request_review_id!.toString()
        )

        if (!commenterId) {
          throw new Error(
            `Missing DB user for review comment actor githubId ${actor.githubId.toString()}`
          )
        }

        if (!reviewId) {
          throw new Error(
            `Missing DB review for github review id ${comment.pull_request_review_id}`
          )
        }

        return {
          githubCommentId: BigInt(comment.id),
          prId: dbPullRequest.id,
          reviewId,
          commenterLogin: actor.login,
          createdAt: new Date(comment.created_at),
          commenterId,
        }
      }),
      skipDuplicates: true,
    })
  }

  const validIssueComments = issueComments.filter((comment) => {
    return extractActor(comment.user) !== null
  })

  if (validIssueComments.length > 0) {
    await prisma.issueComment.createMany({
      data: validIssueComments.map((comment) => {
        const actor = extractActor(comment.user)

        if (!actor) {
          throw new Error("Unexpected missing issue comment actor after filtering")
        }

        const commenterId = githubUserIdToDbUserId.get(actor.githubId.toString())

        if (!commenterId) {
          throw new Error(
            `Missing DB user for issue comment actor githubId ${actor.githubId.toString()}`
          )
        }

        return {
          githubCommentId: BigInt(comment.id),
          prId: dbPullRequest.id,
          commenterId,
          commenterLogin: actor.login,
          createdAt: new Date(comment.created_at),
        }
      }),
      skipDuplicates: true,
    })
  }

  const latestReviewActivity = getLatestDate(
    validReviews.map((review) =>
      review.submitted_at ? new Date(review.submitted_at) : null
    )
  )

  const latestReviewCommentActivity = getLatestDate(
    validReviewComments.map((comment) => new Date(comment.created_at))
  )

  const latestIssueCommentActivity = getLatestDate(
    validIssueComments.map((comment) => new Date(comment.created_at))
  )

  const latestActivity = getLatestDate([
    dbPullRequest.lastActivityAt,
    latestReviewActivity,
    latestReviewCommentActivity,
    latestIssueCommentActivity,
  ])

  const commentCount = validReviewComments.length + validIssueComments.length

  await prisma.pullRequest.update({
    where: {
      id: dbPullRequest.id,
    },
    data: {
      commentCount,
      lastActivityAt: latestActivity ?? dbPullRequest.lastActivityAt,
    },
  })

  console.log("hydratePullRequestActivity - completed")
  console.log("hydratePullRequestActivity - saved review count:", validReviews.length)
  console.log(
    "hydratePullRequestActivity - saved review comment count:",
    validReviewComments.length
  )
  console.log(
    "hydratePullRequestActivity - saved issue comment count:",
    validIssueComments.length
  )
  console.log("hydratePullRequestActivity - final commentCount:", commentCount)
}