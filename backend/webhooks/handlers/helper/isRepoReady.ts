import { prisma } from "../../../prismaClient.js"
import { myQueue } from "../../../queue.js"

interface EnsureRepoReadyOrRequeueInput {
  githubRepoId?: number
  event: string
  deliveryId: string
  payload: unknown
  delayMs?: number
}

export async function isRepoReady({
  githubRepoId,
  event,
  deliveryId,
  payload,
  delayMs = 10000,
}: EnsureRepoReadyOrRequeueInput): Promise<boolean> {
  if (!githubRepoId) {
    console.log("ensureRepoReadyOrRequeue - missing githubRepoId")
    return false
  }

  const dbRepo = await prisma.repo.findUnique({
    where: {
      githubRepoId: BigInt(githubRepoId),
    },
    select: {
      id: true,
      fullName: true,
      isReady: true,
      syncInProgress: true,
    },
  })

  if (!dbRepo) {
    console.log("ensureRepoReadyOrRequeue - repo not found:", githubRepoId)
    return false
  }

  if (dbRepo.isReady) {
    return true
  }

  console.log(
    "ensureRepoReadyOrRequeue - repo not ready, requeueing job for:",
    dbRepo.fullName
  )
  console.log(
    "ensureRepoReadyOrRequeue - syncInProgress:",
    dbRepo.syncInProgress
  )
  console.log(
    "ensureRepoReadyOrRequeue - delayMs:",
    delayMs
  )

  await myQueue.add(
    event,
    {
      event,
      deliveryId,
      payload,
    },
    {
      delay: delayMs,
      removeOnComplete: true,
      removeOnFail: false,
    }
  )

  return false
}