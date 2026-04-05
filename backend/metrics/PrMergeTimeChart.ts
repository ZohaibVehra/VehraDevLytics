import { prisma } from "../prismaClient.js"

type prMergeData = {
    dateTime: string,
    prMergeTime: number
}

const getMergedPrs = async (repoId: string): Promise<prMergeData[]> => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 85)

  const mergedPullRequests = await prisma.pullRequest.findMany({
    where: {
      repoId,
      isMerged: true,
      mergedAt: {
        not: null,
        gte: cutoffDate,
      },
      mergeTimeSeconds: {
        not: null,
      },
    },
    select: {
      mergedAt: true,
      mergeTimeSeconds: true,
    },
    orderBy: {
      mergedAt: "asc",
    },
  })

  const groupedByDay = new Map<string, { totalSeconds: number; count: number }>()

  for (const pr of mergedPullRequests) {
    if (!pr.mergedAt || pr.mergeTimeSeconds == null) continue

    const year = pr.mergedAt.getUTCFullYear()
    const month = String(pr.mergedAt.getUTCMonth() + 1).padStart(2, "0")
    const day = String(pr.mergedAt.getUTCDate()).padStart(2, "0")
    const dateKey = `${year}-${month}-${day}T00:00:00.000Z`

    const existing = groupedByDay.get(dateKey)

    if (existing) {
      existing.totalSeconds += pr.mergeTimeSeconds
      existing.count += 1
    } else {
      groupedByDay.set(dateKey, {
        totalSeconds: pr.mergeTimeSeconds,
        count: 1,
      })
    }
  }

  const prMergeDataArr: prMergeData[] = []

  for (const [dateTime, value] of groupedByDay) {
    prMergeDataArr.push({
      dateTime,
      prMergeTime: Math.round((value.totalSeconds / value.count / 3600) * 100) / 100,
    })
  }

  prMergeDataArr.sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  )

  return prMergeDataArr
}

export async function createPrMergeTimeChart(repoId: string) {
  const prMergeDataArr = await getMergedPrs(repoId)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 85)

  await prisma.$transaction([
    prisma.prMergeTimePoint.deleteMany({
      where: {
        repoId,
        dateTime: {
          gte: cutoffDate,
        },
      },
    }),
    prisma.prMergeTimePoint.createMany({
      data: prMergeDataArr.map((item) => ({
        repoId,
        dateTime: new Date(item.dateTime),
        avgMergeHours: item.prMergeTime,
      })),
    }),
  ])
}