import { prisma } from "../prismaClient.js"

type MedianPRMergeTimeKPI = {
  last7Days: number | null
  last28Days: number | null
  last84Days: number | null
}

function getMedian(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middleIndex = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2
  }

  return sorted[middleIndex]
}

function roundToTwoDecimals(value: number | null): number | null {
  if (value === null) {
    return null
  }

  return Number(value.toFixed(2))
}

export async function createMedianPRMergeTime(
  repoId: string
): Promise<MedianPRMergeTimeKPI> {
  console.log("createMedianPRMergeTime - start, repoId:", repoId)

  const now = new Date()

  const cutoff84Days = new Date(now)
  cutoff84Days.setDate(cutoff84Days.getDate() - 84)

  const cutoff28Days = new Date(now)
  cutoff28Days.setDate(cutoff28Days.getDate() - 28)

  const cutoff7Days = new Date(now)
  cutoff7Days.setDate(cutoff7Days.getDate() - 7)

  const cutoff85Days = new Date(now)
  cutoff85Days.setDate(cutoff85Days.getDate() - 85)

  console.log("createMedianPRMergeTime - now:", now.toISOString())
  console.log("createMedianPRMergeTime - cutoff7Days:", cutoff7Days.toISOString())
  console.log("createMedianPRMergeTime - cutoff28Days:", cutoff28Days.toISOString())
  console.log("createMedianPRMergeTime - cutoff84Days:", cutoff84Days.toISOString())
  console.log("createMedianPRMergeTime - cutoff85Days:", cutoff85Days.toISOString())

  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      repoId,
      isMerged: true,
      mergedAt: {
        not: null,
        gte: cutoff85Days,
      },
      mergeTimeSeconds: {
        not: null,
      },
    },
    select: {
      id: true,
      number: true,
      createdAt: true,
      mergedAt: true,
      mergeTimeSeconds: true,
    },
  })

  console.log(
    "createMedianPRMergeTime - merged PR count returned from db:",
    pullRequests.length
  )

  pullRequests.forEach((pr) => {
    console.log("createMedianPRMergeTime - PR:", {
      id: pr.id,
      number: pr.number,
      createdAt: pr.createdAt.toISOString(),
      mergedAt: pr.mergedAt?.toISOString(),
      mergeTimeSeconds: pr.mergeTimeSeconds,
      mergeTimeHours:
        pr.mergeTimeSeconds !== null ? pr.mergeTimeSeconds / 3600 : null,
    })
  })

  const last7DaysHours = pullRequests
    .filter(
      (pr) =>
        pr.mergedAt !== null &&
        pr.mergeTimeSeconds !== null &&
        pr.mergedAt >= cutoff7Days
    )
    .map((pr) => pr.mergeTimeSeconds! / 3600)

  const last28DaysHours = pullRequests
    .filter(
      (pr) =>
        pr.mergedAt !== null &&
        pr.mergeTimeSeconds !== null &&
        pr.mergedAt >= cutoff28Days
    )
    .map((pr) => pr.mergeTimeSeconds! / 3600)

  const last84DaysHours = pullRequests
    .filter(
      (pr) =>
        pr.mergedAt !== null &&
        pr.mergeTimeSeconds !== null &&
        pr.mergedAt >= cutoff84Days
    )
    .map((pr) => pr.mergeTimeSeconds! / 3600)

  console.log("createMedianPRMergeTime - last7DaysHours:", last7DaysHours)
  console.log("createMedianPRMergeTime - last28DaysHours:", last28DaysHours)
  console.log("createMedianPRMergeTime - last84DaysHours:", last84DaysHours)

  const result = {
    last7Days: roundToTwoDecimals(getMedian(last7DaysHours)),
    last28Days: roundToTwoDecimals(getMedian(last28DaysHours)),
    last84Days: roundToTwoDecimals(getMedian(last84DaysHours)),
  }

  console.log("createMedianPRMergeTime - result:", result)

  return result
}
type MedianTimeToFirstReviewKPI = {
  last7Days: number | null
  last28Days: number | null
  last84Days: number | null
}

export async function createMedianTimeToFirstReview(
  repoId: string
): Promise<MedianTimeToFirstReviewKPI> {
  const now = new Date()

  const cutoff84Days = new Date(now)
  cutoff84Days.setDate(cutoff84Days.getDate() - 84)

  const cutoff28Days = new Date(now)
  cutoff28Days.setDate(cutoff28Days.getDate() - 28)

  const cutoff7Days = new Date(now)
  cutoff7Days.setDate(cutoff7Days.getDate() - 7)

  const cutoff85Days = new Date(now)
  cutoff85Days.setDate(cutoff85Days.getDate() - 85)

  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      repoId,
      createdAt: {
        gte: cutoff85Days,
      },
      reviews: {
        some: {
          submittedAt: {
            not: null,
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
      },
    },
  })

  const prFirstReviewTimes = pullRequests.map((pr) => {
    const validReviews = pr.reviews
      .map((r) => r.submittedAt!)
      .sort((a, b) => a.getTime() - b.getTime())

    const firstReview = validReviews[0]

    if (!firstReview) return null

    const diffSeconds =
      (firstReview.getTime() - pr.createdAt.getTime()) / 1000

    return diffSeconds / 3600 // hours
  })

  const last7DaysHours = pullRequests
    .map((pr, i) => ({
      createdAt: pr.createdAt,
      value: prFirstReviewTimes[i],
    }))
    .filter(
      (x) =>
        x.value !== null &&
        x.createdAt >= cutoff7Days
    )
    .map((x) => x.value as number)

  const last28DaysHours = pullRequests
    .map((pr, i) => ({
      createdAt: pr.createdAt,
      value: prFirstReviewTimes[i],
    }))
    .filter(
      (x) =>
        x.value !== null &&
        x.createdAt >= cutoff28Days
    )
    .map((x) => x.value as number)

  const last84DaysHours = pullRequests
    .map((pr, i) => ({
      createdAt: pr.createdAt,
      value: prFirstReviewTimes[i],
    }))
    .filter(
      (x) =>
        x.value !== null &&
        x.createdAt >= cutoff84Days
    )
    .map((x) => x.value as number)

  return {
    last7Days: roundToTwoDecimals(getMedian(last7DaysHours)),
    last28Days: roundToTwoDecimals(getMedian(last28DaysHours)),
    last84Days: roundToTwoDecimals(getMedian(last84DaysHours)),
  }
}

type PercentReviewedWithin24HoursKPI = {
  last7Days: number | null
  last28Days: number | null
  last84Days: number | null
}

function getPercentage(total: number, matching: number): number | null {
  if (total === 0) {
    return null
  }

  return Number(((matching / total) * 100).toFixed(2))
}

export async function createPercentReviewedWithin24Hours(
  repoId: string
): Promise<PercentReviewedWithin24HoursKPI> {
  const now = new Date()

  const cutoff84Days = new Date(now)
  cutoff84Days.setDate(cutoff84Days.getDate() - 84)

  const cutoff28Days = new Date(now)
  cutoff28Days.setDate(cutoff28Days.getDate() - 28)

  const cutoff7Days = new Date(now)
  cutoff7Days.setDate(cutoff7Days.getDate() - 7)

  const cutoff85Days = new Date(now)
  cutoff85Days.setDate(cutoff85Days.getDate() - 85)

  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      repoId,
      createdAt: {
        gte: cutoff85Days,
      },
      reviews: {
        some: {
          submittedAt: {
            not: null,
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
      },
    },
  })

    const prReviewStatus = pullRequests
    .map((pr) => {
        const firstReview = pr.reviews
        .map((review) => review.submittedAt!)
        .sort((a, b) => a.getTime() - b.getTime())[0]

        if (!firstReview) {
        return null
        }

        const hoursToFirstReview =
        (firstReview.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60)

        return {
        createdAt: pr.createdAt,
        reviewedWithin24Hours: hoursToFirstReview <= 24,
        }
    })
    .filter(
        (
        pr
        ): pr is {
        createdAt: Date
        reviewedWithin24Hours: boolean
        } => pr !== null
    )

  const last7DaysPRs = prReviewStatus.filter(
    (pr) => pr.createdAt >= cutoff7Days
  )

  const last28DaysPRs = prReviewStatus.filter(
    (pr) => pr.createdAt >= cutoff28Days
  )

  const last84DaysPRs = prReviewStatus.filter(
    (pr) => pr.createdAt >= cutoff84Days
  )

  return {
    last7Days: getPercentage(
      last7DaysPRs.length,
      last7DaysPRs.filter((pr) => pr.reviewedWithin24Hours).length
    ),
    last28Days: getPercentage(
      last28DaysPRs.length,
      last28DaysPRs.filter((pr) => pr.reviewedWithin24Hours).length
    ),
    last84Days: getPercentage(
      last84DaysPRs.length,
      last84DaysPRs.filter((pr) => pr.reviewedWithin24Hours).length
    ),
  }
}

type PRsCurrentlyWaitingForFirstReviewKPI = {
  last7Days: number | null
  last28Days: number | null
  last84Days: number | null
}

export async function createPRsCurrentlyWaitingForFirstReview(
  repoId: string
): Promise<PRsCurrentlyWaitingForFirstReviewKPI> {
  const now = new Date()

  const cutoff84Days = new Date(now)
  cutoff84Days.setDate(cutoff84Days.getDate() - 84)

  const cutoff28Days = new Date(now)
  cutoff28Days.setDate(cutoff28Days.getDate() - 28)

  const cutoff7Days = new Date(now)
  cutoff7Days.setDate(cutoff7Days.getDate() - 7)

  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      repoId,
      createdAt: {
        gte: cutoff84Days,
      },
      isMerged: false,
      closedAt: null,
      reviews: {
        none: {
          submittedAt: {
            not: null,
          },
        },
      },
    },
    select: {
      createdAt: true,
    },
  })

  return {
    last7Days: pullRequests.filter((pr) => pr.createdAt >= cutoff7Days).length,
    last28Days: pullRequests.filter((pr) => pr.createdAt >= cutoff28Days).length,
    last84Days: pullRequests.filter((pr) => pr.createdAt >= cutoff84Days).length,
  }
}

type StalePRRateKPI = {
  last7Days: number | null
  last28Days: number | null
  last84Days: number | null
}

export async function createStalePRRate(
  repoId: string
): Promise<StalePRRateKPI> {
  const now = new Date()

  const cutoff84Days = new Date(now)
  cutoff84Days.setDate(cutoff84Days.getDate() - 84)

  const cutoff28Days = new Date(now)
  cutoff28Days.setDate(cutoff28Days.getDate() - 28)

  const cutoff7Days = new Date(now)
  cutoff7Days.setDate(cutoff7Days.getDate() - 7)

  const staleCutoff = new Date(now)
  staleCutoff.setDate(staleCutoff.getDate() - 3)

  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      repoId,
      createdAt: {
        gte: cutoff84Days,
      },
      isMerged: false,
      closedAt: null,
    },
    select: {
      createdAt: true,
      lastActivityAt: true,
    },
  })

  const last7DaysPRs = pullRequests.filter((pr) => pr.createdAt >= cutoff7Days)
  const last28DaysPRs = pullRequests.filter((pr) => pr.createdAt >= cutoff28Days)
  const last84DaysPRs = pullRequests.filter((pr) => pr.createdAt >= cutoff84Days)

  return {
    last7Days: getPercentage(
      last7DaysPRs.length,
      last7DaysPRs.filter((pr) => pr.lastActivityAt < staleCutoff).length
    ),
    last28Days: getPercentage(
      last28DaysPRs.length,
      last28DaysPRs.filter((pr) => pr.lastActivityAt < staleCutoff).length
    ),
    last84Days: getPercentage(
      last84DaysPRs.length,
      last84DaysPRs.filter((pr) => pr.lastActivityAt < staleCutoff).length
    ),
  }
}

export async function createRepoKPI(repoId: string): Promise<void> {
  const [
    medianPrMergeTime,
    medianTimeToFirstReview,
    percentReviewedWithin24Hours,
    prsCurrentlyWaitingForFirstReview,
    stalePrRate,
  ] = await Promise.all([
    createMedianPRMergeTime(repoId),
    createMedianTimeToFirstReview(repoId),
    createPercentReviewedWithin24Hours(repoId),
    createPRsCurrentlyWaitingForFirstReview(repoId),
    createStalePRRate(repoId),
  ])

  await prisma.repoKPI.upsert({
    where: {
      repoId,
    },
    update: {
      medianPrMergeTime7d: medianPrMergeTime.last7Days,
      medianPrMergeTime28d: medianPrMergeTime.last28Days,
      medianPrMergeTime84d: medianPrMergeTime.last84Days,

      medianTimeToFirstReview7d: medianTimeToFirstReview.last7Days,
      medianTimeToFirstReview28d: medianTimeToFirstReview.last28Days,
      medianTimeToFirstReview84d: medianTimeToFirstReview.last84Days,

      percentReviewedWithin24Hours7d: percentReviewedWithin24Hours.last7Days,
      percentReviewedWithin24Hours28d: percentReviewedWithin24Hours.last28Days,
      percentReviewedWithin24Hours84d: percentReviewedWithin24Hours.last84Days,

      prsWaitingForFirstReview7d: prsCurrentlyWaitingForFirstReview.last7Days ?? 0,
      prsWaitingForFirstReview28d: prsCurrentlyWaitingForFirstReview.last28Days ?? 0,
      prsWaitingForFirstReview84d: prsCurrentlyWaitingForFirstReview.last84Days ?? 0,

      stalePrRate7d: stalePrRate.last7Days,
      stalePrRate28d: stalePrRate.last28Days,
      stalePrRate84d: stalePrRate.last84Days,
    },
    create: {
      repoId,

      medianPrMergeTime7d: medianPrMergeTime.last7Days,
      medianPrMergeTime28d: medianPrMergeTime.last28Days,
      medianPrMergeTime84d: medianPrMergeTime.last84Days,

      medianTimeToFirstReview7d: medianTimeToFirstReview.last7Days,
      medianTimeToFirstReview28d: medianTimeToFirstReview.last28Days,
      medianTimeToFirstReview84d: medianTimeToFirstReview.last84Days,

      percentReviewedWithin24Hours7d: percentReviewedWithin24Hours.last7Days,
      percentReviewedWithin24Hours28d: percentReviewedWithin24Hours.last28Days,
      percentReviewedWithin24Hours84d: percentReviewedWithin24Hours.last84Days,

      prsWaitingForFirstReview7d: prsCurrentlyWaitingForFirstReview.last7Days ?? 0,
      prsWaitingForFirstReview28d: prsCurrentlyWaitingForFirstReview.last28Days ?? 0,
      prsWaitingForFirstReview84d: prsCurrentlyWaitingForFirstReview.last84Days ?? 0,

      stalePrRate7d: stalePrRate.last7Days,
      stalePrRate28d: stalePrRate.last28Days,
      stalePrRate84d: stalePrRate.last84Days,
    },
  })
}