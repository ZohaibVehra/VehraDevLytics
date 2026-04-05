import { prisma } from "../../../prismaClient.js"
import { myQueue } from "../../../queue.js"

interface CheckAndQueueMetricRefreshInput {
  githubRepoId?: number
}

export async function checkAndQueueMetricRefresh({
  githubRepoId,
}: CheckAndQueueMetricRefreshInput): Promise<void> {
  if (!githubRepoId) {
    console.log("checkAndQueueMetricRefresh - missing githubRepoId")
    return
  }

  const repo = await prisma.repo.findUnique({
    where: {
      githubRepoId: BigInt(githubRepoId),
    },
    select: {
      id: true,
      weightedEvents: true,
    },
  })

  if (!repo) {
    console.log("checkAndQueueMetricRefresh - repo not found:", githubRepoId)
    return
  }

  console.log(
    "checkAndQueueMetricRefresh - repoId:",
    repo.id,
    "weightedEvents:",
    repo.weightedEvents
  )

  if (repo.weightedEvents < 20) {
    return
  }

  await myQueue.add("createMetrics", {
    event: "createMetrics",
    deliveryId: `metrics-${repo.id}-${Date.now()}`,
    payload: {
      repoId: repo.id,
    },
  })

  await prisma.repo.update({
    where: {
      id: repo.id,
    },
    data: {
      weightedEvents: 0,
    },
  })

  console.log(
    "checkAndQueueMetricRefresh - queued createMetrics and reset weightedEvents for repoId:",
    repo.id
  )
}