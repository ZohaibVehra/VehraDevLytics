import { prisma } from "../../prismaClient.js"
import { myQueue } from "../../queue.js"

console.log("handleInstallationEvent module loaded")

interface HandleInstallationEventInput {
  deliveryId: string
  payload: unknown
}

interface InstallationWebhookPayload {
  action?: string
  installation?: {
    id?: number
  }
  repositories?: Array<{
    id?: number
    name?: string
    full_name?: string
  }>
}


export async function handleInstallationEvent({
  deliveryId,
  payload,
}: HandleInstallationEventInput): Promise<void> {
  console.log("installation handler - entered")
  console.log("installation handler - delivery id:", deliveryId)

  const installationPayload = payload as InstallationWebhookPayload
  console.log("installation handler - payload cast done")

  const action = installationPayload.action
  console.log("installation handler - action:", action)

  if (!action) {
    console.log("installation handler - missing action")
    return
  }

  switch (action) {
    case "created":
      console.log("installation handler - about to call handleInstallationCreated")
      await handleInstallationCreated({ deliveryId, payload: installationPayload })
      console.log("installation handler - handleInstallationCreated finished")
      break

    default:
      console.log("installation handler - unhandled action:", action)
  }
}

async function handleInstallationCreated({
  deliveryId,
  payload,
}: {
  deliveryId: string
  payload: InstallationWebhookPayload
}): Promise<void> {
  console.log("installation created - entered")

  const installation = payload.installation
  const repositories = payload.repositories ?? []

  console.log("installation created - installation:", installation)
  console.log("installation created - repositories count:", repositories.length)

  if (!installation?.id) {
    console.log("installation created - missing installation id")
    return
  }

  if (repositories.length === 0) {
    console.log("installation created - no repositories in payload")
    return
  }

  const installationId = String(installation.id)
  console.log("installation created - installationId:", installationId)

  const validRepos = repositories.filter(
    (repo) => repo.id && repo.name && repo.full_name
  )

  if (validRepos.length === 0) {
    console.log("installation created - no valid repos found")
    return
  }

  console.log("installation created - about to upsert installation and repos")

  await prisma.$transaction(async (tx) => {
    await tx.installation.upsert({
      where: {
        id: installationId,
      },
      update: {},
      create: {
        id: installationId,
      },
    })

    for (const repo of validRepos) {
      await tx.repo.upsert({
        where: {
          githubRepoId: BigInt(repo.id!),
        },
        update: {
          name: repo.name!,
          fullName: repo.full_name!,
          installationId,
          isReady: false,
          syncInProgress: false,
        },
        create: {
          githubRepoId: BigInt(repo.id!),
          name: repo.name!,
          fullName: repo.full_name!,
          installationId,
          isReady: false,
          weightedEvents: 0,
          syncInProgress: false,
        },
      })
    }
  })

  console.log("installation created - installation and repo upserts complete")

  for (const repo of validRepos) {
    console.log("installation created - about to queue repoSaved:", repo.full_name)

    await myQueue.add(
      "github-webhook",
      {
        event: "repoSaved",
        deliveryId,
        payload: {
          githubRepoId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          installationId: installation.id,
        },
      },
      {
        jobId: `repoSaved:${installation.id}:${repo.id}`,
      }
    )

    console.log("installation created - repoSaved queued:", repo.full_name)
  }

  console.log("installation created - finished all repos")
}