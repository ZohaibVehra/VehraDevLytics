import { prisma } from "../prismaClient.js"

type reviewSpeedData = {
  dateTime: string
  firstReviewTime: number
}

const getReviewedPrs = async (repoId: string): Promise<reviewSpeedData[]> => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 85)

  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      repoId,
      reviews: {
        some: {
          submittedAt: {
            not: null,
            gte: cutoffDate,
          },
        },
      },
    },
    select: {
      createdAt: true,
      reviews: {
        where: {
          submittedAt: {
            not: null,
          },
        },
        select: {
          submittedAt: true,
        },
        orderBy: {
          submittedAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  const groupedByDay = new Map<string, { totalSeconds: number; count: number }>()

  for (const pr of pullRequests) {
    if (!pr.createdAt || pr.reviews.length === 0) continue

    const firstReview = pr.reviews[0]
    if (!firstReview?.submittedAt) continue
    if (firstReview.submittedAt < cutoffDate) continue

    const firstReviewTimeSeconds =
      (firstReview.submittedAt.getTime() - pr.createdAt.getTime()) / 1000

    if (firstReviewTimeSeconds < 0) continue

    const year = firstReview.submittedAt.getUTCFullYear()
    const month = String(firstReview.submittedAt.getUTCMonth() + 1).padStart(2, "0")
    const day = String(firstReview.submittedAt.getUTCDate()).padStart(2, "0")
    const dateKey = `${year}-${month}-${day}T00:00:00.000Z`

    const existing = groupedByDay.get(dateKey)

    if (existing) {
      existing.totalSeconds += firstReviewTimeSeconds
      existing.count += 1
    } else {
      groupedByDay.set(dateKey, {
        totalSeconds: firstReviewTimeSeconds,
        count: 1,
      })
    }
  }

  const reviewSpeedDataArr: reviewSpeedData[] = []

  for (const [dateTime, value] of groupedByDay) {
    reviewSpeedDataArr.push({
      dateTime,
      firstReviewTime: Math.round((value.totalSeconds / value.count / 3600) * 100) / 100,
    })
  }

  reviewSpeedDataArr.sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  )

  return reviewSpeedDataArr
}

export async function createReviewSpeedChart(repoId: string) {
  const reviewSpeedDataArr = await getReviewedPrs(repoId)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 85)

  await prisma.$transaction([
    prisma.firstReviewTimePoint.deleteMany({
      where: {
        repoId,
        dateTime: {
          gte: cutoffDate,
        },
      },
    }),
    prisma.firstReviewTimePoint.createMany({
      data: reviewSpeedDataArr.map((item) => ({
        repoId,
        dateTime: new Date(item.dateTime),
        avgFirstReviewHours: item.firstReviewTime,
      })),
    }),
  ])
}