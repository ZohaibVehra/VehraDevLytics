import { prisma } from "../prismaClient.js"

type reviewTimeBreakdownData = {
  dateTime: string
  under8Hours: number
  under24Hours: number
  under3Days: number
  over3Days: number
}

const getReviewedPrsForBreakdown = async (
  repoId: string
): Promise<reviewTimeBreakdownData[]> => {
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

  const groupedByDay = new Map<string, reviewTimeBreakdownData>()

  for (const pr of pullRequests) {
    if (!pr.createdAt || pr.reviews.length === 0) continue

    const firstReview = pr.reviews[0]
    if (!firstReview?.submittedAt) continue
    if (firstReview.submittedAt < cutoffDate) continue

    const firstReviewTimeSeconds = (firstReview.submittedAt.getTime() - pr.createdAt.getTime()) / 1000

    if (firstReviewTimeSeconds < 0) continue

    const year = firstReview.submittedAt.getUTCFullYear()
    const month = String(firstReview.submittedAt.getUTCMonth() + 1).padStart(2, "0")
    const day = String(firstReview.submittedAt.getUTCDate()).padStart(2, "0")
    const dateKey = `${year}-${month}-${day}T00:00:00.000Z`

    const existing = groupedByDay.get(dateKey) ?? {
      dateTime: dateKey,
      under8Hours: 0,
      under24Hours: 0,
      under3Days: 0,
      over3Days: 0,
    }

    const hours = firstReviewTimeSeconds / 3600

    if (hours < 8) {
      existing.under8Hours += 1
    } else if (hours < 24) {
      existing.under24Hours += 1
    } else if (hours < 72) {
      existing.under3Days += 1
    } else {
      existing.over3Days += 1
    }

    groupedByDay.set(dateKey, existing)
  }

  const reviewTimeBreakdownDataArr = Array.from(groupedByDay.values())

  reviewTimeBreakdownDataArr.sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  )

  return reviewTimeBreakdownDataArr
}

export async function createReviewTimeBreakdownChart(repoId: string) {
  const reviewTimeBreakdownDataArr = await getReviewedPrsForBreakdown(repoId)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 85)

  await prisma.$transaction([
    prisma.reviewTimeBreakdownPoint.deleteMany({
      where: {
        repoId,
        dateTime: {
          gte: cutoffDate,
        },
      },
    }),
    prisma.reviewTimeBreakdownPoint.createMany({
      data: reviewTimeBreakdownDataArr.map((item) => ({
        repoId,
        dateTime: new Date(item.dateTime),
        under8Hours: item.under8Hours,
        under24Hours: item.under24Hours,
        under3Days: item.under3Days,
        over3Days: item.over3Days,
      })),
    }),
  ])
}