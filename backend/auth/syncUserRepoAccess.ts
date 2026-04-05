import axios from "axios"
import { prisma } from "../prismaClient.js"

interface SyncUserRepoAccessInput {
  userId: string
  githubAccessToken: string
}

interface GitHubRepo {
  id: number
}

export async function syncUserRepoAccess({
  userId,
  githubAccessToken,
}: SyncUserRepoAccessInput): Promise<void> {
  const githubRepoIds = await fetchAccessibleGithubRepoIds(githubAccessToken)
  const githubRepoIdsAsBigInt = githubRepoIds.map((id) => BigInt(id))

  const reposInOurDb = await prisma.repo.findMany({
    where: {
      githubRepoId: {
        in: githubRepoIdsAsBigInt,
      },
    },
    select: {
      id: true,
    },
  })

  await prisma.userRepoAccess.deleteMany({
    where: { userId },
  })

  if (reposInOurDb.length > 0) {
    await prisma.userRepoAccess.createMany({
      data: reposInOurDb.map((repo) => ({
        userId,
        repoId: repo.id,
      })),
      skipDuplicates: true,
    })
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastRepoAccessSyncAt: new Date(),
    },
  })
}

async function fetchAccessibleGithubRepoIds(
  githubAccessToken: string
): Promise<number[]> {
  const repoIds: number[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await axios.get<GitHubRepo[]>(
      "https://api.github.com/user/repos",
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/json",
        },
        params: {
          per_page: 100,
          page,
        },
      }
    )

    const repos = response.data
    repoIds.push(...repos.map((repo) => repo.id))

    hasMore = repos.length === 100
    page += 1
  }

  return repoIds
}