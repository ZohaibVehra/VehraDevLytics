import { prisma } from "../prismaClient.js"

interface AccessibleRepo {
  repoId: string
  repoName: string
}

export async function getAccessibleReposForUser(
  userId: string
): Promise<AccessibleRepo[]> {
  const userRepoAccessRows = await prisma.userRepoAccess.findMany({
    where: {
      userId,
    },
    select: {
      repo: {
        select: {
          id: true,
          name: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      repo: {
        fullName: "asc",
      },
    },
  })

  return userRepoAccessRows.map((row) => ({
    repoId: row.repo.id,
    repoName: row.repo.name,
    fullName: row.repo.fullName,
  }))
}